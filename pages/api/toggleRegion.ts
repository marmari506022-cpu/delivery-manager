import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { regionId, active } = req.body;
  const { data: region } = await supabase.from('regions').select('admin_id').eq('id', regionId).single();
  if (!region || region.admin_id !== getAdminId(session)) return res.json({ success: false, message: 'غير مصرح' });
  await supabase.from('regions').update({ active }).eq('id', regionId);
  return res.json({ success: true });
}
