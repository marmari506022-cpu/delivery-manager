import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const supervisorId = (req.query.supervisorId || req.body?.supervisorId || session.id) as string;
  const dateFrom = req.query.dateFrom as string || '';
  const dateTo   = req.query.dateTo as string || '';

  let query = supabase.from('funding').select('*').eq('supervisor_id', supervisorId);
  if (dateFrom) query = query.gte('date', dateFrom);
  if (dateTo)   query = query.lte('date', dateTo + 'T23:59:59');

  const { data } = await query;
  return res.json({ success: true, data: data || [] });
}
