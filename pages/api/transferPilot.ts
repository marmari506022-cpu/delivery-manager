import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { pilotId, newSupervisorId } = req.body;
  const { data: pilots } = await supabase.from('pilots').select('*').eq('id', pilotId).limit(1);
  const pilot = pilots?.[0];
  if (!pilot || pilot.supervisor_id !== session.id) return res.json({ success: false, message: 'غير مصرح' });

  await supabase.from('notifications').insert({
    id: generateId(), target_id: newSupervisorId, type: 'pilot_transfer',
    ref_id: pilotId, from_id: session.id, status: 'pending', date: nowIso(), note: pilot.name
  });
  return res.json({ success: true });
}
