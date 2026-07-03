import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const supId = (req.query.supervisorId || req.body?.supervisorId || session.id) as string;
  const { data } = await supabase.from('manager_salary').select('*').eq('supervisor_id', supId);
  const active     = (data || []).filter(d => !d.settled);
  const advances   = active.filter(d => d.type === 'advance').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const deductions = active.filter(d => d.type === 'deduction').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const bonuses    = active.filter(d => d.type === 'bonus').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const { data: users } = await supabase.from('users').select('base_salary').eq('id', supId).limit(1);
  const baseSalary = Number(users?.[0]?.base_salary) || 0;
  return res.json({ success: true, data, advances, deductions, bonuses, baseSalary, netSalary: baseSalary - advances - deductions + bonuses });
}
