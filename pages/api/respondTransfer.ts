import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { notifId, accept, newSalary } = req.body;
  const { data: notifs } = await supabase.from('notifications').select('*').eq('id', notifId).limit(1);
  const notif = notifs?.[0];
  if (!notif) return res.json({ success: false, message: 'الإشعار غير موجود' });
  if (notif.target_id !== session.id) return res.json({ success: false, message: 'غير مصرح' });

  await supabase.from('notifications').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', notifId);
  if (accept) {
    const { data: pilotRows } = await supabase.from('pilots').select('id,admin_id').eq('id', notif.ref_id).limit(1);
    const pilot = pilotRows?.[0];
    if (!pilot || pilot.admin_id !== getAdminId(session)) {
      return res.json({ success: false, message: 'لا يمكن نقل طيار من أدمن آخر' });
    }
    await supabase.from('pilots').update({ supervisor_id: session.id }).eq('id', notif.ref_id);
    if (newSalary) await supabase.from('pilots').update({ base_salary: newSalary }).eq('id', notif.ref_id);
  }
  return res.json({ success: true });
}
