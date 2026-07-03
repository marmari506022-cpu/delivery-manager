import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { name } = req.body;
  const id = generateId();
  const adminId = getAdminId(session);
  await supabase.from('regions').insert({ id, name, active: true, created_at: nowIso(), admin_id: adminId });
  return res.json({ success: true, id });
}
