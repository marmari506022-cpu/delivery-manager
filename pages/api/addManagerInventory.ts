import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);

  const { type, qty, price, profitMargin, profitType, companyId, condition } = req.body;

  if (!companyId) return res.json({ success: false, message: 'يجب تحديد الشركة' });
  if (!type) return res.json({ success: false, message: 'يجب تحديد نوع المعدة' });
  const qtyNum = Number(qty);
  if (!qty || isNaN(qtyNum) || qtyNum <= 0) return res.json({ success: false, message: 'الكمية يجب أن تكون أكبر من صفر' });
  const priceNum = Number(price);
  if (price === undefined || price === null || price === '' || isNaN(priceNum) || priceNum < 0) {
    return res.json({ success: false, message: 'السعر غير صحيح' });
  }

  // جلب اسم الشركة والتحقق من ملكيتها
  const { data: companyData } = await supabase.from('companies').select('name,admin_id').eq('id', companyId).limit(1);
  if (!companyData?.[0] || companyData[0].admin_id !== adminId) {
    return res.json({ success: false, message: 'الشركة غير موجودة' });
  }
  const companyName = companyData?.[0]?.name || '';

  const batchId = generateId();
  const itemCondition = condition || 'new';

  // إضافة للمخزن
  const { error: invError } = await supabase.from('inventory').insert({
    id: generateId(),
    admin_id: adminId,
    supervisor_id: 'manager',
    amount: 0,
    date: nowIso(),
    type,
    qty: qtyNum,
    price: priceNum,
    profit_margin: profitMargin || 0,
    profit_type: profitType || 'percent',
    direction: 'manager_in',
    batch_id: batchId,
    company_id: companyId,
    condition: itemCondition
  });

  if (invError) {
    console.error('addManagerInventory insert error:', invError);
    return res.json({ success: false, message: 'فشل حفظ المخزون: ' + invError.message });
  }

  // تسجيل في سجل المخزن
  const { error: logError } = await supabase.from('inventory_log').insert({
    id: generateId(),
    admin_id: adminId,
    action: 'add',
    company_id: companyId,
    company_name: companyName,
    type,
    qty: qtyNum,
    price: priceNum,
    supervisor_id: 'manager',
    supervisor_name: 'المدير',
    batch_id: batchId,
    performed_by: session.name,
    note: `إضافة مخزون جديد - ${companyName}`,
    date: nowIso()
  });

  if (logError) console.error('addManagerInventory log error:', logError);

  return res.json({ success: true, batchId });
}
