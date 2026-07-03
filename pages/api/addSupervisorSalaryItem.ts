import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { supervisorId, type, amount, reason } = req.body;
  const adminId = getAdminId(session);
  await supabase.from('manager_salary').insert({
    id: generateId(), supervisor_id: supervisorId, type, amount, date: nowIso(),
    reason: reason || '', settled: false, admin_id: adminId
  });
  return res.json({ success: true });
}
