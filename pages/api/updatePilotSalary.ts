import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const { pilotId, newSalary } = req.body;
  const { data: pilots } = await supabase.from('pilots').select('*').eq('id', pilotId).limit(1);
  const pilot = pilots?.[0];
  if (!pilot) return res.json({ success: false, message: 'الطيار غير موجود' });
  if (session.role === 'supervisor' && pilot.supervisor_id !== session.id)
    return res.json({ success: false, message: 'غير مصرح' });

  await supabase.from('pilots').update({ base_salary: newSalary }).eq('id', pilotId);
  return res.json({ success: true });
}
