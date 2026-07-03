import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  // المدير يرى كل المناطق (نشطة وموقوفة)، غيره يرى النشطة فقط
  let query = supabase.from('regions').select('*').eq('admin_id', getAdminId(session));
  if (session.role !== 'manager') query = query.eq('active', true);
  const { data } = await query.order('created_at', { ascending: true });
  return res.json({ success: true, data: data || [] });
}
