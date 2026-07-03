import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { pilotId, excludeIds } = req.body;
  const adminId = getAdminId(session);
  const timestamp = nowIso();
  const excludeSet = new Set<string>(Array.isArray(excludeIds) ? excludeIds : []);

  // تقفيل طيار واحد محدد فقط
  if (!pilotId) return res.json({ success: false, message: 'pilotId مطلوب' });

  const [advR, dedR, bonR, uniR] = await Promise.all([
    supabase.from('advances').select('*').eq('pilot_id', pilotId).eq('settled', false).eq('deleted', false),
    supabase.from('deductions').select('*').eq('pilot_id', pilotId).eq('settled', false).eq('deleted', false),
    supabase.from('bonuses').select('*').eq('pilot_id', pilotId).eq('settled', false).eq('deleted', false),
    supabase.from('uniforms').select('*').eq('pilot_id', pilotId).eq('settled', false),
  ]);

  const settledRows: any[] = [];

  for (const a of (advR.data || [])) {
    if (excludeSet.has(a.id)) continue;
    await supabase.from('advances').update({ settled: true, settled_at: timestamp }).eq('id', a.id);
    settledRows.push({ id: generateId(), pilot_id: pilotId, supervisor_id: session.id, type: 'advance', ref_id: a.id, amount: a.amount, date: timestamp, item_date: a.date, details: a.reason, admin_id: adminId });
  }
  for (const d of (dedR.data || [])) {
    if (excludeSet.has(d.id)) continue;
    await supabase.from('deductions').update({ settled: true, settled_at: timestamp }).eq('id', d.id);
    settledRows.push({ id: generateId(), pilot_id: pilotId, supervisor_id: session.id, type: 'deduction', ref_id: d.id, amount: d.amount, date: timestamp, item_date: d.date, details: d.reason, admin_id: adminId });
  }
  for (const b of (bonR.data || [])) {
    if (excludeSet.has(b.id)) continue;
    await supabase.from('bonuses').update({ settled: true, settled_at: timestamp }).eq('id', b.id);
    settledRows.push({ id: generateId(), pilot_id: pilotId, supervisor_id: session.id, type: 'bonus', ref_id: b.id, amount: b.amount, date: timestamp, item_date: b.date, details: b.reason, admin_id: adminId });
  }
  for (const u of (uniR.data || [])) {
    if (excludeSet.has(u.id)) continue;
    await supabase.from('uniforms').update({ settled: true, settled_at: timestamp }).eq('id', u.id);
    settledRows.push({ id: generateId(), pilot_id: pilotId, supervisor_id: session.id, type: 'uniform', ref_id: u.id, amount: Number(u.qty) * Number(u.price), date: timestamp, item_date: u.date, details: u.type, admin_id: adminId });
  }

  if (settledRows.length) await supabase.from('settled').insert(settledRows);

  await supabase.from('pilots').update({ salary_closed: true }).eq('id', pilotId);

  return res.json({ success: true, timestamp });
}
