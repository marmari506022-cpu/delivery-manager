import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const supId = (req.query.supervisorId || req.body?.supervisorId || session.id) as string;
  if (session.role === 'manager' && supId !== session.id) {
    const { data: supRows } = await supabase.from('users').select('id,admin_id').eq('id', supId).limit(1);
    if (!supRows?.[0] || supRows[0].admin_id !== getAdminId(session)) {
      return res.json({ success: false, message: 'غير مصرح' });
    }
  } else if (session.role === 'supervisor' && supId !== session.id) {
    return res.json({ success: false, message: 'غير مصرح' });
  }
  const { data } = await supabase.from('manager_salary').select('*').eq('supervisor_id', supId);
  const active     = (data || []).filter(d => !d.settled);
  const advances   = active.filter(d => d.type === 'advance').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const deductions = active.filter(d => d.type === 'deduction').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const bonuses    = active.filter(d => d.type === 'bonus').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const { data: users } = await supabase.from('users').select('base_salary').eq('id', supId).limit(1);
  const baseSalary = Number(users?.[0]?.base_salary) || 0;
  return res.json({ success: true, data, advances, deductions, bonuses, baseSalary, netSalary: baseSalary - advances - deductions + bonuses });
}
