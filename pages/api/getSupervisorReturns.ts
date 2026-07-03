import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { data: returns } = await supabase
    .from('returns')
    .select('*')
    .eq('supervisor_id', session.id)
    .order('date', { ascending: false });

  return res.json({ success: true, data: returns || [] });
}
