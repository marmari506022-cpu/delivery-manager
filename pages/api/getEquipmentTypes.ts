import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);

  const { data } = await supabase
    .from('equipment_types')
    .select('*')
    .eq('admin_id', adminId)
    .order('sort_order', { ascending: true });

  return res.json({ success: true, data: data || [] });
}
