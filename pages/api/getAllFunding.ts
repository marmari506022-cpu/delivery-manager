import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const dateFrom = req.query.dateFrom as string || '';
  const dateTo   = req.query.dateTo as string || '';

  let query = supabase.from('funding').select('*').eq('admin_id', getAdminId(session));
  if (dateFrom) {
    query = query.gte('date', dateFrom);
  } else {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    query = query.gte('date', startOfMonth);
  }
  if (dateTo) query = query.lte('date', dateTo + 'T23:59:59');

  const { data } = await query;
  return res.json({ success: true, data: data || [] });
}
