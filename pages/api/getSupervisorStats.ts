import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllTypes } from '../../lib/equipmentTypes';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';
import { computeSupervisorCompanyInventory, aggregateCompanyInventory } from '../../lib/inventoryCalc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const supId = session.id;

  const [pilotsR, advR, dedR, bonR, uniR, fundR, salR, usersR] = await Promise.all([
    supabase.from('pilots').select('*').eq('supervisor_id', supId).eq('active', true),
    supabase.from('advances').select('*').eq('supervisor_id', supId).eq('settled', false),
    supabase.from('deductions').select('*').eq('supervisor_id', supId).eq('deleted', false).eq('settled', false),
    supabase.from('bonuses').select('*').eq('supervisor_id', supId).eq('deleted', false).eq('settled', false),
    supabase.from('uniforms').select('*').eq('supervisor_id', supId).eq('settled', false),
    supabase.from('funding').select('amount').eq('supervisor_id', supId),
    supabase.from('manager_salary').select('*').eq('supervisor_id', supId).eq('settled', false),
    supabase.from('users').select('base_salary').eq('id', supId).limit(1),
  ]);

  const pilots = pilotsR.data || [];
  const types  = await getAllTypes(adminId);

  // المخزن الإجمالي مشتق دائماً من تجميع مخزن الشركات — مصدر الحقيقة الوحيد
  const companyInventory = await computeSupervisorCompanyInventory(supId, types);
  const inventory = aggregateCompanyInventory(companyInventory, types);

  const totalAdvances   = (advR.data || []).reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const totalDeductions = (dedR.data || []).reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalBonuses    = (bonR.data || []).reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const totalFunding    = (fundR.data || []).reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const totalSalaries   = pilots.reduce((s, p) => s + (p.salary_closed ? 0 : (Number(p.base_salary) || 0)), 0);
  const uniformCost     = (uniR.data || []).reduce((s, u) => s + ((Number(u.qty) || 0) * (Number(u.price) || 0)), 0);
  const netSalaries     = totalSalaries - totalAdvances - totalDeductions + totalBonuses - uniformCost;

  const salActive  = (salR.data || []);
  const baseSalary = Number(usersR.data?.[0]?.base_salary) || 0;
  const salAdv = salActive.filter(d => d.type === 'advance').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const salDed = salActive.filter(d => d.type === 'deduction').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const salBon = salActive.filter(d => d.type === 'bonus').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const mySalary = baseSalary - salAdv - salDed + salBon;

  return res.json({ success: true, pilotsCount: pilots.length, inventory, totalAdvances, totalDeductions, totalBonuses, netSalaries, totalFunding, mySalary, session });
}
