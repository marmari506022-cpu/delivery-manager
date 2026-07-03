import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { returnId } = req.body;

  const { data: retRows } = await supabase.from('returns').select('*').eq('id', returnId).limit(1);
  const ret = retRows?.[0];
  if (!ret) return res.json({ success: false, message: 'المرتجع غير موجود' });
  if (ret.status !== 'pending') return res.json({ success: false, message: 'الطلب ليس في حالة انتظار' });

  const items: any[] = Array.isArray(ret.items) ? ret.items : [];

  // لكل معدة: تقليل الكمية أو حذف السجل + فك التجميد + إضافة للمخزن
  for (const item of items) {
    const { data: uniRows } = await supabase
      .from('uniforms')
      .select('id, qty')
      .eq('id', item.uniform_id)
      .limit(1);
    const uni = uniRows?.[0];
    if (!uni) continue;

    const remaining = Number(uni.qty) - Number(item.qty);
    if (remaining <= 0) {
      // حذف السجل كاملاً
      await supabase.from('uniforms').delete().eq('id', item.uniform_id);
    } else {
      // تقليل الكمية وفك التجميد
      await supabase.from('uniforms').update({ qty: remaining, frozen: false }).eq('id', item.uniform_id);
    }

    // إضافة المعدة لمخزن المدير
    await supabase.from('inventory').insert({
      id: generateId(),
      supervisor_id: '',
      amount: 0,
      date: nowIso(),
      type: item.type,
      qty: Number(item.qty),
      price: Number(item.price) || 0,
      profit_margin: 0,
      profit_type: 'fixed',
      direction: 'return_from_pilot',
      batch_id: returnId,
      company_id: item.company_id || '',
      condition: item.condition || 'good',
    });
  }

  // تحديث حالة الطلب
  await supabase.from('returns').update({
    status: 'approved',
    approved_at: nowIso(),
    approved_by: session.name,
  }).eq('id', returnId);

  return res.json({ success: true });
}
