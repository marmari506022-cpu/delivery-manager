import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  if (!adminId) return res.json({ success: true, data: [] });

  const [pilotsR, supervisorsR, advR, dedR, bonR, uniR, companiesR] = await Promise.all([
    supabase.from('pilots').select('*').eq('active', true).eq('admin_id', adminId),
    supabase.from('users').select('*').eq('role', 'supervisor').eq('admin_id', adminId),
    supabase.from('advances').select('*').eq('admin_id', adminId),
    supabase.from('deductions').select('*').eq('admin_id', adminId),
    supabase.from('bonuses').select('*').eq('admin_id', adminId),
    supabase.from('uniforms').select('*').eq('admin_id', adminId),
    supabase.from('companies').select('*').eq('admin_id', adminId),
  ]);

  const pilots      = pilotsR.data || [];
  const supervisors = supervisorsR.data || [];
  const advances    = advR.data || [];
  const deductions  = dedR.data || [];
  const bonuses     = bonR.data || [];
  const uniforms    = uniR.data || [];
  const companies   = companiesR.data || [];

  const data = pilots.map(p => {
    const adv = advances.filter(a => a.pilot_id === p.id && !a.settled).reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const ded = deductions.filter(d => d.pilot_id === p.id && !d.deleted && !d.settled).reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const bon = bonuses.filter(b => b.pilot_id === p.id && !b.deleted && !b.settled).reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const uni = uniforms.filter(u => u.pilot_id === p.id && !u.settled).reduce((s, u) => s + ((Number(u.qty) || 0) * (Number(u.price) || 0)), 0);
    const sup = supervisors.find(s => s.id === p.supervisor_id);
    const pilotCompany = companies.find(c => c.id === p.company_id);

    // Parse multi-value fields (stored as comma-separated)
    const supRegions   = sup ? (sup.region || '').split(',').map((r: string) => r.trim()).filter(Boolean) : [];
    const supCompanyIds = sup ? (sup.company_id || '').split(',').map((c: string) => c.trim()).filter(Boolean) : [];
    const supCompanyNames = supCompanyIds.map((cid: string) => companies.find(c => c.id === cid)?.name).filter(Boolean);

    return {
      ...p,
      netSalary:        (Number(p.base_salary) || 0) - adv - ded + bon - uni,
      supervisorName:   sup ? sup.name : '',
      supervisorPhone:  sup ? sup.phone : '',
      supervisorRegions: supRegions,
      supervisorRegion:  supRegions.join(', '),
      supervisorCompanyIds: supCompanyIds,
      supervisorCompany:    supCompanyNames.join(', '),
      pilotCompanyName: pilotCompany ? pilotCompany.name : '',
    };
  });

  return res.json({ success: true, data });
}
