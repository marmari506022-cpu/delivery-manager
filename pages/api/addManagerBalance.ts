import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const { amount, note, direction } = req.body;
  const dir = direction === 'out' ? 'out' : 'in';
  await supabase.from('balance').insert({
    id: generateId(), amount, date: nowIso(),
    note: note || (dir === 'in' ? 'إيداع رصيد' : 'سحب رصيد'), direction: dir, created_by: session.name, admin_id: adminId
  });
  return res.json({ success: true });
}
