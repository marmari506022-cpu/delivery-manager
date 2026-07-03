import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { data } = await supabase.from('balance').select('*').eq('admin_id', getAdminId(session));
  const inTotal  = (data || []).filter(b => b.direction === 'in').reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const outTotal = (data || []).filter(b => b.direction === 'out').reduce((s, b) => s + (Number(b.amount) || 0), 0);
  return res.json({ success: true, balance: inTotal - outTotal, inTotal, outTotal });
}
