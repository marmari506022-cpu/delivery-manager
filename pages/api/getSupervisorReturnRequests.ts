import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { status } = req.query;

  let query = supabase
    .from('return_requests')
    .select('*')
    .eq('supervisor_id', session.id)
    .order('created_at', { ascending: false });

  if (status && typeof status === 'string') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true, data: data || [] });
}
