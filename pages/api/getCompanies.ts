import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const session = getSession(req);
  if (!session || (session.role !== 'manager' && session.role !== 'supervisor')) return res.json({ success: false, message: 'غير مصرح' });

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('admin_id', getAdminId(session))
    .order('created_at', { ascending: false });

  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true, data: data || [] });
}
