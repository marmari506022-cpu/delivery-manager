import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { batchId, newPrice, newProfitMargin, newProfitType } = req.body;
  const updates: any = { price: newPrice };
  if (newProfitMargin !== undefined && newProfitMargin !== null) updates.profit_margin = newProfitMargin;
  if (newProfitType) updates.profit_type = newProfitType;

  const { error } = await supabase.from('inventory').update(updates).eq('batch_id', batchId).eq('direction', 'manager_in');
  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true });
}
