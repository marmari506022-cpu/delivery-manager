import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllTypes } from '../../lib/equipmentTypes';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);

  const { data: inv } = await supabase.from('inventory').select('*').eq('admin_id', adminId);
  const types = await getAllTypes(adminId);
  const summary: Record<string, any> = {};

  types.forEach(t => {
    const inItems = (inv || []).filter(i => i.type === t && i.direction === 'manager_in');
    const inQty   = inItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const outQty  = (inv || []).filter(i => i.type === t && i.direction === 'manager_out_to_sup').reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const returnQ = (inv || []).filter(i => i.type === t && i.direction === 'return_to_manager').reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const lastBatch = inItems.slice(-1)[0];
    summary[t] = {
      total: inQty, sent: outQty, returned: returnQ,
      remaining: inQty - outQty + returnQ,
      lastPrice: lastBatch ? lastBatch.price : 0,
      batches: inItems.map(i => ({ batchId: i.batch_id, qty: i.qty, price: i.price, date: i.date, profitMargin: i.profit_margin, profitType: i.profit_type }))
    };
  });
  return res.json({ success: true, data: summary });
}
