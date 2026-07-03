import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

// يجمع بيانات "المعدات المسددة" (uniforms.settled = true) لكل طياري المشرف
// بنفس منطق كروت "المعدات المستلمة" في صفحة تفاصيل الطيار (قيمة = qty * price
// لكل سجل uniforms مباشرة)، لضمان تطابق الرقم الإجمالي مع كروت المسدد في صفحات الطيارين.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const supervisorId = session.id;

  const { data } = await supabase
    .from('uniforms')
    .select('type, qty, price')
    .eq('supervisor_id', supervisorId)
    .eq('settled', true);

  const uniforms = data || [];

  const byType: Record<string, { qty: number; value: number }> = {};
  let totalQty = 0;
  let totalValue = 0;

  uniforms.forEach((u: any) => {
    const type = u.type;
    const qty = Number(u.qty) || 0;
    const price = Number(u.price) || 0;
    const value = qty * price;

    if (!byType[type]) byType[type] = { qty: 0, value: 0 };
    byType[type].qty += qty;
    byType[type].value += value;

    totalQty += qty;
    totalValue += value;
  });

  return res.json({ success: true, data: byType, totalQty, totalValue });
}
