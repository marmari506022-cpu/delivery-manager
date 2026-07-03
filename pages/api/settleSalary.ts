import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const { pilotId, excludeAdvances, excludeUniforms } = req.body;
  const excludeAdvIds = excludeAdvances || [];
  const excludeUniIds = excludeUniforms || [];
  const timestamp = nowIso();
  const adminId = getAdminId(session);
  const settled: any[] = [];
  const settledRows: any[] = [];

  const [advR, dedR, bonR, uniR] = await Promise.all([
    supabase.from('advances').select('*').eq('pilot_id', pilotId).eq('settled', false),
    supabase.from('deductions').select('*').eq('pilot_id', pilotId).eq('settled', false).eq('deleted', false),
    supabase.from('bonuses').select('*').eq('pilot_id', pilotId).eq('settled', false).eq('deleted', false),
    supabase.from('uniforms').select('*').eq('pilot_id', pilotId).eq('settled', false),
  ]);

  for (const a of (advR.data || []).filter(a => !excludeAdvIds.includes(a.id))) {
    await supabase.from('advances').update({ settled: true, settled_at: timestamp }).eq('id', a.id);
    settledRows.push({ id: generateId(), pilot_id: pilotId, supervisor_id: session.id, type: 'advance', ref_id: a.id, amount: a.amount, date: timestamp, item_date: a.date, details: a.reason, admin_id: adminId });
    settled.push({ type: 'advance', id: a.id });
  }
  for (const d of (dedR.data || [])) {
    await supabase.from('deductions').update({ settled: true, settled_at: timestamp }).eq('id', d.id);
    settledRows.push({ id: generateId(), pilot_id: pilotId, supervisor_id: session.id, type: 'deduction', ref_id: d.id, amount: d.amount, date: timestamp, item_date: d.date, details: d.reason, admin_id: adminId });
    settled.push({ type: 'deduction', id: d.id });
  }
  for (const b of (bonR.data || [])) {
    await supabase.from('bonuses').update({ settled: true, settled_at: timestamp }).eq('id', b.id);
    settledRows.push({ id: generateId(), pilot_id: pilotId, supervisor_id: session.id, type: 'bonus', ref_id: b.id, amount: b.amount, date: timestamp, item_date: b.date, details: b.reason, admin_id: adminId });
    settled.push({ type: 'bonus', id: b.id });
  }
  for (const u of (uniR.data || []).filter(u => !excludeUniIds.includes(u.id) && !u.frozen)) {
    await supabase.from('uniforms').update({ settled: true, settled_at: timestamp }).eq('id', u.id);
    settledRows.push({ id: generateId(), pilot_id: pilotId, supervisor_id: session.id, type: 'uniform', ref_id: u.id, amount: Number(u.qty) * Number(u.price), date: timestamp, item_date: u.date, details: u.type, admin_id: adminId });
    settled.push({ type: 'uniform', id: u.id });
  }
  if (settledRows.length) await supabase.from('settled').insert(settledRows);
  return res.json({ success: true, settled, timestamp });
}
