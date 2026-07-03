import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

// مرتجع الطيار للمشرف: المشرف نفسه هو من ينفّذ العملية من صفحة الطيار،
// فلا حاجة لانتظار موافقة من أي طرف آخر — تُنفَّذ العملية فوراً:
// 1) إنقاص/حذف كارت المعدة من الطيار
// 2) إضافة المعدة لمخزن المشرف بنفس الشركة والسعر والحالة والنوع والكمية
// 3) تسجيل العملية في سجل المرتجعات بحالة "معتمدة" فوراً (للأرشفة فقط)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const { pilotId, selectedItems } = req.body;
  // selectedItems: Array<{ uniform_id: string, type: string, qty: number, price: number, condition: string, company_id: string, company_name: string }>

  if (!pilotId) return res.json({ success: false, message: 'لم يتم تحديد الطيار' });
  if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0)
    return res.json({ success: false, message: 'لم يتم اختيار أي معدات' });

  // جلب بيانات الطيار
  const { data: pilots } = await supabase.from('pilots').select('name').eq('id', pilotId).limit(1);
  const pilotName = pilots?.[0]?.name || '';

  // التحقق من أن المعدات غير مجمدة وكمياتها كافية، وجلب بياناتها الحالية كاملة
  const uniSnapshots: Record<string, { qty: number }> = {};
  for (const item of selectedItems) {
    const { data: uniRows } = await supabase
      .from('uniforms')
      .select('id, qty, frozen, settled')
      .eq('id', item.uniform_id)
      .eq('pilot_id', pilotId)
      .limit(1);
    const uni = uniRows?.[0];
    if (!uni) return res.json({ success: false, message: `المعدة غير موجودة: ${item.uniform_id}` });
    if (uni.frozen) return res.json({ success: false, message: `المعدة مجمدة بالفعل في طلب معلق` });
    if (uni.settled) return res.json({ success: false, message: `المعدة مسواة بالفعل` });
    if (Number(item.qty) > Number(uni.qty)) return res.json({ success: false, message: `الكمية المطلوبة أكبر من المتاحة` });
    uniSnapshots[item.uniform_id] = { qty: Number(uni.qty) };
  }

  const itemsPayload = selectedItems.map((item: any) => ({
    uniform_id: item.uniform_id,
    type: item.type,
    qty: Number(item.qty),
    price: Number(item.price) || 0,
    condition: item.condition || 'good',
    company_id: item.company_id || '',
    company_name: item.company_name || '',
    total_value: Number(item.qty) * (Number(item.price) || 0),
  }));

  // 1) تنفيذ فوري: إنقاص/حذف كارت كل معدة عند الطيار
  for (const item of selectedItems) {
    const currentQty = uniSnapshots[item.uniform_id].qty;
    const remaining = currentQty - Number(item.qty);
    if (remaining <= 0) {
      await supabase.from('uniforms').delete().eq('id', item.uniform_id);
    } else {
      await supabase.from('uniforms').update({ qty: remaining }).eq('id', item.uniform_id);
    }
  }

  // 2) تسجيل العملية في سجل المرتجعات بحالة "معتمدة" فوراً
  // uniforms هو المصدر الرئيسي للتوزيع، وتحديثه في الخطوة السابقة كافٍ — لا حاجة لإضافة return_to_sup
  const returnId = generateId();
  const { error } = await supabase.from('returns').insert({
    id: returnId,
    supervisor_id: session.id,
    pilot_id: pilotId,
    pilot_name: pilotName,
    supervisor_name: session.name,
    type: selectedItems.map((i: any) => i.type).join(','),
    qty: selectedItems.reduce((s: number, i: any) => s + Number(i.qty), 0),
    condition: selectedItems[0]?.condition || 'good',
    date: nowIso(),
    status: 'approved',
    note: '',
    items: itemsPayload,
    admin_id: adminId,
    approved_at: nowIso(),
    approved_by: session.name,
  });

  if (error) return res.json({ success: false, message: 'خطأ في قاعدة البيانات: ' + error.message });
  return res.json({ success: true, id: returnId });
}
