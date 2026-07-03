import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const { pilotId, amount, reason } = req.body;
  const id = generateId();
  const adminId = getAdminId(session);
  await supabase.from('deductions').insert({
    id, pilot_id: pilotId, amount, date: nowIso(),
    reason: reason || '', deleted: false,
    supervisor_id: session.id, added_by: session.name, added_by_role: session.role,
    admin_id: adminId
  });
  return res.json({ success: true, id });
}
