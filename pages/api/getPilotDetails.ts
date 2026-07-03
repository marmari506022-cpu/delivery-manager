import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const pilotId = (req.query.pilotId || req.body?.pilotId) as string;
  const { data: pilots } = await supabase.from('pilots').select('*').eq('id', pilotId).limit(1);
  const pilot = pilots?.[0];
  if (!pilot) return res.json({ success: false, message: 'الطيار غير موجود' });

  const [advR, dedR, bonR, uniR] = await Promise.all([
    supabase.from('advances').select('*').eq('pilot_id', pilotId),
    supabase.from('deductions').select('*').eq('pilot_id', pilotId).eq('deleted', false),
    supabase.from('bonuses').select('*').eq('pilot_id', pilotId).eq('deleted', false),
    supabase.from('uniforms').select('*').eq('pilot_id', pilotId),
  ]);

  // استخدام حالة settled مباشرة من الجداول (يتم تحديثها عند التقفيل)
  const advances   = (advR.data || []);
  const deductions = (dedR.data || []);
  const bonuses    = (bonR.data || []);
  const uniforms   = (uniR.data || []);

  const totalAdvances   = advances.filter((a: any) => !a.settled && !a.deleted).reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);
  const totalDeductions = deductions.filter((d: any) => !d.settled).reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
  const totalBonuses    = bonuses.filter((b: any) => !b.settled).reduce((s: number, b: any) => s + (Number(b.amount) || 0), 0);
  const uniformCost     = uniforms.filter((u: any) => !u.settled).reduce((s: number, u: any) => s + ((Number(u.qty) || 0) * (Number(u.price) || 0)), 0);
  const baseSalary = Number(pilot.base_salary) || 0;
  const netSalary = baseSalary - totalAdvances - totalDeductions + totalBonuses - uniformCost;

  return res.json({
    success: true, pilot, advances, deductions, bonuses, uniforms,
    summary: { baseSalary, totalAdvances, totalDeductions, totalBonuses, uniformCost, netSalary, closed: !!pilot.salary_closed }
  });
}
