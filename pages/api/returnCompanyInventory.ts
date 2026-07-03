import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);

  const { companyId, type, qty, condition, reason, note } = req.body;

  if (!companyId) return res.json({ success: false, message: 'يجب تحديد الشركة' });
  if (!type)      return res.json({ success: false, message: 'يجب تحديد نوع المعدة' });
  if (!qty || Number(qty) <= 0) return res.json({ success: false, message: 'الكمية يجب أن تكون أكبر من صفر' });
  if (!condition) return res.json({ success: false, message: 'يجب تحديد حالة المعدة' });
  if (!reason)    return res.json({ success: false, message: 'يجب كتابة سبب المرتجع' });

  // جلب اسم الشركة
  const { data: companyData } = await supabase.from('companies').select('name').eq('id', companyId).limit(1);
  const companyName = companyData?.[0]?.name || '';

  // جلب مخزن الشركة لهذا النوع
  const { data: inv } = await supabase.from('inventory').select('*').eq('company_id', companyId).eq('type', type);

  const inQty  = (inv || []).filter(i => i.direction === 'manager_in').reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const outQty = (inv || []).filter(i => i.direction === 'manager_out_to_sup').reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const retQ   = (inv || []).filter(i => i.direction === 'company_return').reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const available = inQty - outQty - retQ;

  if (Number(qty) > available) {
    return res.json({ success: false, message: `الكمية المتاحة في مخزن ${companyName} هي ${available} فقط` });
  }

  // جلب سعر آخر دفعة وارد لهذا النوع من هذه الشركة
  const lastBatch = (inv || []).filter(i => i.direction === 'manager_in').slice(-1)[0];
  const price = lastBatch ? Number(lastBatch.price) : 0;

  const batchId = generateId();

  // تسجيل المرتجع في المخزن
  const { error: invError } = await supabase.from('inventory').insert({
    id: generateId(),
    admin_id: adminId,
    supervisor_id: 'manager',
    amount: 0,
    date: nowIso(),
    type,
    qty: Number(qty),
    price,
    condition: condition || 'new',
    profit_margin: 0,
    profit_type: 'fixed',
    direction: 'company_return',
    batch_id: batchId,
    company_id: companyId
  });

  if (invError) {
    console.error('returnCompanyInventory insert error:', invError);
    return res.json({ success: false, message: 'فشل تسجيل المرتجع: ' + invError.message });
  }

  // تسجيل في سجل المخزن
  const { error: logError } = await supabase.from('inventory_log').insert({
    id: generateId(),
    admin_id: adminId,
    action: 'company_return',
    company_id: companyId,
    company_name: companyName,
    type,
    qty: Number(qty),
    price,
    supervisor_id: 'manager',
    supervisor_name: 'المدير',
    batch_id: batchId,
    performed_by: session.name,
    note: `مرتجع | سبب: ${reason}${note ? ' | ملاحظة: ' + note : ''}`,
    date: nowIso()
  });

  if (logError) console.error('returnCompanyInventory log error:', logError);

  return res.json({ success: true, batchId, price });
}
