import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { pilotId, dateKey } = req.body;
  if (!pilotId || !dateKey) return res.json({ success: false, message: 'بيانات ناقصة' });

  const { data: pilotRows } = await supabase.from('pilots').select('id,supervisor_id').eq('id', pilotId).limit(1);
  if (!pilotRows?.[0] || pilotRows[0].supervisor_id !== session.id) {
    return res.json({ success: false, message: 'غير مصرح' });
  }

  const { data } = await supabase
    .from('settled')
    .select('*')
    .eq('pilot_id', pilotId)
    .order('date', { ascending: false });

  const rows = data || [];
  if (!rows.length) return res.json({ success: false, message: 'لا يوجد سجل تقفيل لهذا الطيار' });

  // نفس التجميع المستخدم في getPilotSettledHistory لتحديد جلسات التقفيل
  const latestKey = rows[0].date.substring(0, 19);
  if (latestKey !== dateKey) {
    return res.json({ success: false, message: 'يمكن التراجع فقط عن آخر تقفيل في السجل' });
  }

  const sessionRows = rows.filter((r: any) => r.date.substring(0, 19) === dateKey);
  if (!sessionRows.length) return res.json({ success: false, message: 'التقفيل غير موجود' });

  for (const r of sessionRows) {
    const table = r.type === 'advance' ? 'advances'
      : r.type === 'deduction' ? 'deductions'
      : r.type === 'bonus' ? 'bonuses'
      : r.type === 'uniform' ? 'uniforms'
      : null;
    if (!table) continue;
    await supabase.from(table).update({ settled: false, settled_at: null }).eq('id', r.ref_id);
  }

  await supabase.from('settled').delete().in('id', sessionRows.map((r: any) => r.id));

  await supabase.from('pilots').update({ salary_closed: false }).eq('id', pilotId);

  return res.json({ success: true });
}
