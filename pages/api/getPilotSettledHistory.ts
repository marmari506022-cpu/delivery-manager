import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const pilotId = req.query.pilotId as string;
  if (!pilotId) return res.json({ success: false, message: 'pilotId مطلوب' });

  const { data: pilotRows } = await supabase.from('pilots').select('id,supervisor_id,admin_id').eq('id', pilotId).limit(1);
  const pilotRow = pilotRows?.[0];
  if (!pilotRow) return res.json({ success: false, message: 'الطيار غير موجود' });
  if (session.role === 'supervisor' && pilotRow.supervisor_id !== session.id)
    return res.json({ success: false, message: 'غير مصرح' });
  if (session.role === 'manager' && pilotRow.admin_id !== getAdminId(session))
    return res.json({ success: false, message: 'غير مصرح' });

  const { data } = await supabase
    .from('settled')
    .select('*')
    .eq('pilot_id', pilotId)
    .order('date', { ascending: false });

  // group by date rounded to second to form settlement sessions
  const rows = data || [];
  const sessions: Record<string, any[]> = {};
  rows.forEach((r: any) => {
    const key = r.date.substring(0, 19); // YYYY-MM-DDTHH:MM:SS
    if (!sessions[key]) sessions[key] = [];
    sessions[key].push(r);
  });

  const result = Object.entries(sessions).map(([dateKey, items]) => ({
    date: items[0].date,
    dateKey,
    items,
    total: items.reduce((s, i) => {
      if (i.type === 'advance' || i.type === 'uniform') return s - Number(i.amount);
      if (i.type === 'bonus') return s + Number(i.amount);
      if (i.type === 'deduction') return s - Number(i.amount);
      return s;
    }, 0),
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return res.json({ success: true, data: result });
}
