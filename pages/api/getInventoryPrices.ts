import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllTypes } from '../../lib/equipmentTypes';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const type = req.query.type as string;
  const filterCompanyId = req.query.companyId as string || '';
  const types = await getAllTypes(adminId);

  const { data: inv } = await supabase.from('inventory').select('*').eq('admin_id', adminId);

  const buildPrices = (t: string, companyFilter?: string) => {
    let inItems = (inv || []).filter((i: any) => i.type === t && i.direction === 'manager_in');
    let retItems = (inv || []).filter((i: any) => i.type === t && i.direction === 'return_to_manager');

    if (companyFilter) {
      inItems = inItems.filter((i: any) => i.company_id === companyFilter);
      retItems = retItems.filter((i: any) => i.company_id === companyFilter);
    }

    const priceMap: Record<string, any> = {};

    inItems.forEach((i: any) => {
      const cond = i.condition || 'new';
      const key = `${i.company_id}__${i.price}__${cond}`;
      if (!priceMap[key]) {
        const matchIn = inItems.filter((x: any) => x.company_id === i.company_id && Number(x.price) === Number(i.price) && (x.condition || 'new') === cond);
        const batchIds = matchIn.map((x: any) => x.batch_id);
        const allCompanyInv = (inv || []).filter((x: any) => x.type === t && x.company_id === i.company_id);
        const inQ  = matchIn.reduce((s: number, x: any) => s + (Number(x.qty) || 0), 0);
        const outQ = allCompanyInv.filter((x: any) => x.direction === 'manager_out_to_sup' && batchIds.includes(x.batch_id)).reduce((s: number, x: any) => s + (Number(x.qty) || 0), 0);
        const retQ = retItems.filter((x: any) => x.company_id === i.company_id && Number(x.price) === Number(i.price) && (x.condition || 'new') === cond).reduce((s: number, x: any) => s + (Number(x.qty) || 0), 0);
        const compRetQ = allCompanyInv.filter((x: any) => x.direction === 'company_return' && batchIds.includes(x.batch_id)).reduce((s: number, x: any) => s + (Number(x.qty) || 0), 0);
        priceMap[key] = {
          company_id: i.company_id,
          price: Number(i.price),
          condition: cond,
          profit_margin: Number(i.profit_margin) || 0,
          profit_type: i.profit_type || 'percent',
          remaining: inQ - outQ + retQ - compRetQ,
          batchIds,
        };
      }
    });

    retItems.forEach((i: any) => {
      const cond = i.condition || 'new';
      const key = `${i.company_id}__${i.price}__${cond}`;
      if (!priceMap[key]) {
        const retQ = retItems.filter((x: any) => x.company_id === i.company_id && Number(x.price) === Number(i.price) && (x.condition || 'new') === cond).reduce((s: number, x: any) => s + (Number(x.qty) || 0), 0);
        priceMap[key] = { company_id: i.company_id, price: Number(i.price), condition: cond, profit_margin: 0, profit_type: 'percent', remaining: retQ, batchIds: [] };
      }
    });

    return Object.values(priceMap).filter((p: any) => p.remaining > 0);
  };

  if (type) {
    return res.json({ success: true, prices: buildPrices(type, filterCompanyId || undefined) });
  }

  const result: Record<string, any[]> = {};
  types.forEach(t => { result[t] = buildPrices(t, filterCompanyId || undefined); });
  return res.json({ success: true, data: result });
}
