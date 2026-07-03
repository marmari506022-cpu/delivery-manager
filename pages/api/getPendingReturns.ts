import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);

  const { data: returns } = await supabase
    .from('returns')
    .select('*')
    .eq('status', 'pending')
    .eq('admin_id', adminId)
    .order('date', { ascending: false });

  return res.json({ success: true, data: returns || [] });
}
