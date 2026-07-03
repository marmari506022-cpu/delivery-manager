import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { data: notifs } = await supabase.from('notifications')
    .select('*').eq('target_id', session.id).eq('type', 'pilot_transfer').eq('status', 'pending');
  const { data: pilots } = await supabase.from('pilots').select('*');

  const data = (notifs || []).map(n => {
    const pilot = (pilots || []).find(p => p.id === n.ref_id) || {} as any;
    return { ...n, pilotName: pilot.name, pilotRegion: pilot.region, pilotSalary: pilot.base_salary, pilotPhone: pilot.phone };
  });
  return res.json({ success: true, data });
}
