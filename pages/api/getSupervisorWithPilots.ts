import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const supervisorId = (req.query.supervisorId || req.body?.supervisorId) as string;
  const [usersR, companiesR] = await Promise.all([
    supabase.from('users').select('*').eq('id', supervisorId).limit(1),
    supabase.from('companies').select('*'),
  ]);
  const sup = usersR.data?.[0];
  if (!sup) return res.json({ success: false, message: 'المشرف غير موجود' });
  const allCompanies = companiesR.data || [];
  const supRegions    = (sup.region || '').split(',').map((r: string) => r.trim()).filter(Boolean);
  const supCompanyIds = (sup.company_id || '').split(',').map((c: string) => c.trim()).filter(Boolean);
  const supCompanyNames = supCompanyIds.map((cid: string) => allCompanies.find((c: any) => c.id === cid)?.name).filter(Boolean);
  const enrichedSup = { ...sup, regions: supRegions, region: supRegions.join(', '), companyIds: supCompanyIds, company_id: supCompanyIds[0] || '', companyNames: supCompanyNames };

  const [pilotsR, advR, dedR, bonR, uniR, salR, fundR] = await Promise.all([
    supabase.from('pilots').select('*').eq('supervisor_id', supervisorId).eq('active', true),
    supabase.from('advances').select('*'),
    supabase.from('deductions').select('*'),
    supabase.from('bonuses').select('*'),
    supabase.from('uniforms').select('*'),
    supabase.from('manager_salary').select('*').eq('supervisor_id', supervisorId).eq('settled', false),
    supabase.from('funding').select('*').eq('supervisor_id', supervisorId).order('date', { ascending: false }),
  ]);

  const pilots     = pilotsR.data || [];
  const advances   = advR.data || [];
  const deductions = dedR.data || [];
  const bonuses    = bonR.data || [];
  const uniforms   = uniR.data || [];
  const funding    = fundR.data || [];

  const pilotsWithDetails = pilots.map(p => {
    const adv = advances.filter(a => a.pilot_id === p.id && !a.settled).reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const ded = deductions.filter(d => d.pilot_id === p.id && !d.deleted && !d.settled).reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const bon = bonuses.filter(b => b.pilot_id === p.id && !b.deleted && !b.settled).reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const uni = uniforms.filter(u => u.pilot_id === p.id && !u.settled).reduce((s, u) => s + ((Number(u.qty) || 0) * (Number(u.price) || 0)), 0);
    const pilotAdv = advances.filter(a => a.pilot_id === p.id && !a.settled);
    const pilotDed = deductions.filter(d => d.pilot_id === p.id && !d.deleted && !d.settled);
    const pilotBon = bonuses.filter(b => b.pilot_id === p.id && !b.deleted && !b.settled);
    return {
      ...p, netSalary: (Number(p.base_salary) || 0) - adv - ded + bon - uni,
      totalAdvances: adv, totalDeductions: ded, totalBonuses: bon, uniformCost: uni,
      advances: pilotAdv, deductions: pilotDed, bonuses: pilotBon,
    };
  });

  // Build receivables (مستحقات) per pilot
  const receivables: any[] = [];
  pilotsWithDetails.forEach(p => {
    p.advances.forEach((a: any) => receivables.push({ ...a, pilotName: p.name, pilotCode: p.pilot_code, kind: 'سلفة' }));
    p.deductions.forEach((d: any) => receivables.push({ ...d, pilotName: p.name, pilotCode: p.pilot_code, kind: 'خصم' }));
    p.bonuses.forEach((b: any) => receivables.push({ ...b, pilotName: p.name, pilotCode: p.pilot_code, kind: 'مكافأة' }));
  });
  receivables.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const salActive  = salR.data || [];
  const baseSalary = Number(sup.base_salary) || 0;
  const salAdv = salActive.filter(d => d.type === 'advance').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const salDed = salActive.filter(d => d.type === 'deduction').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const salBon = salActive.filter(d => d.type === 'bonus').reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const totalDue = pilotsWithDetails.reduce((s, p) => s + (Number(p.netSalary) || 0), 0);
  const totalFunded = funding.reduce((s, f) => s + (Number(f.amount) || 0), 0);

  return res.json({
    success: true, supervisor: enrichedSup, pilots: pilotsWithDetails,
    receivables, funding,
    totalDue, totalFunded,
    salaryDetails: { success: true, data: salActive, advances: salAdv, deductions: salDed, bonuses: salBon, baseSalary, netSalary: baseSalary - salAdv - salDed + salBon }
  });
}
