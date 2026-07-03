import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

// يجمع بيانات "المعدات الغير مسددة" (uniforms.settled = false) لكل طياري المشرف
// مقسّمة حسب النوع، وحسب السعر داخل كل نوع، مع قائمة الطيارين لكل سعر.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const supervisorId = session.id;

  const [pilotsR, uniR] = await Promise.all([
    supabase.from('pilots').select('id,name').eq('supervisor_id', supervisorId).eq('active', true),
    supabase.from('uniforms').select('*').eq('supervisor_id', supervisorId).eq('settled', false),
  ]);

  const pilots = pilotsR.data || [];
  const pilotNameMap: Record<string, string> = {};
  pilots.forEach((p: any) => { pilotNameMap[p.id] = p.name; });

  const uniforms = (uniR.data || []).filter((u: any) => !u.frozen);

  // byType: { [type]: { qty, value, byPrice: { [price]: { qty, value, pilots: { [pilotId]: { name, qty, value } } } } } }
  const byType: Record<string, any> = {};

  uniforms.forEach((u: any) => {
    const type = u.type;
    const price = Number(u.price) || 0;
    const qty = Number(u.qty) || 0;
    const value = qty * price;
    const pilotId = u.pilot_id;
    const pilotName = pilotNameMap[pilotId] || 'طيار محذوف';

    if (!byType[type]) byType[type] = { qty: 0, value: 0, byPrice: {} };
    byType[type].qty += qty;
    byType[type].value += value;

    if (!byType[type].byPrice[price]) byType[type].byPrice[price] = { price, qty: 0, value: 0, pilots: {} };
    byType[type].byPrice[price].qty += qty;
    byType[type].byPrice[price].value += value;

    if (!byType[type].byPrice[price].pilots[pilotId]) {
      byType[type].byPrice[price].pilots[pilotId] = { pilotId, name: pilotName, qty: 0, value: 0 };
    }
    byType[type].byPrice[price].pilots[pilotId].qty += qty;
    byType[type].byPrice[price].pilots[pilotId].value += value;
  });

  // تحويل الكائنات الداخلية إلى مصفوفات سهلة الاستخدام في الواجهة
  const data: Record<string, any> = {};
  Object.keys(byType).forEach(type => {
    const t = byType[type];
    data[type] = {
      qty: t.qty,
      value: t.value,
      byPrice: Object.values(t.byPrice).map((bp: any) => ({
        price: bp.price,
        qty: bp.qty,
        value: bp.value,
        pilots: Object.values(bp.pilots),
      })),
    };
  });

  return res.json({ success: true, data });
}
