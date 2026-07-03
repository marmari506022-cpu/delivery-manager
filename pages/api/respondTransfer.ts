import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, nowIso } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { notifId, accept, newSalary } = req.body;
  const { data: notifs } = await supabase.from('notifications').select('*').eq('id', notifId).limit(1);
  const notif = notifs?.[0];
  if (!notif) return res.json({ success: false, message: 'الإشعار غير موجود' });

  await supabase.from('notifications').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', notifId);
  if (accept) {
    await supabase.from('pilots').update({ supervisor_id: session.id }).eq('id', notif.ref_id);
    if (newSalary) await supabase.from('pilots').update({ base_salary: newSalary }).eq('id', notif.ref_id);
  }
  return res.json({ success: true });
}
