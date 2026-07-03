import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllTypes } from '../../lib/equipmentTypes';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);

  const [pilotsR, supervisorsR, fundingR, invR, advR, dedR, bonR, uniR, reqR, retR, balR, supRetR] = await Promise.all([
    supabase.from('pilots').select('*').eq('active', true).eq('admin_id', adminId),
    supabase.from('users').select('*').eq('role', 'supervisor').eq('active', true).eq('admin_id', adminId),
    supabase.from('funding').select('*').eq('admin_id', adminId),
    supabase.from('inventory').select('*').eq('admin_id', adminId),
    supabase.from('advances').select('*'),
    supabase.from('deductions').select('*'),
    supabase.from('bonuses').select('*'),
    supabase.from('uniforms').select('*'),
    supabase.from('requests').select('*').eq('status', 'pending').eq('admin_id', adminId),
    supabase.from('returns').select('*').eq('status', 'pending').eq('admin_id', adminId),
    supabase.from('balance').select('*').eq('admin_id', adminId),
    supabase.from('return_requests').select('id').eq('status', 'pending').eq('admin_id', adminId),
  ]);

  const pilots      = pilotsR.data || [];
  const supervisors = supervisorsR.data || [];
  const funding     = fundingR.data || [];
  const inv         = invR.data || [];
  const advances    = advR.data || [];
  const deductions  = dedR.data || [];
  const bonuses     = bonR.data || [];
  const uniforms    = uniR.data || [];

  const types = await getAllTypes(adminId);
  const CONDITIONS = ['new', 'good', 'damaged'] as const;

  const inventory: Record<string, any> = {};
  types.forEach(t => {
    const inItems  = inv.filter(i => i.type === t && i.direction === 'manager_in');
    const outItems = inv.filter(i => i.type === t && i.direction === 'manager_out_to_sup');
    const retItems = inv.filter(i => i.type === t && i.direction === 'return_to_manager');

    const inQty  = inItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const outQty = outItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const retQ   = retItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);

    // حساب الكميات المتوفرة حسب الحالة (من الإضافات + المرتجعات - المُرسل)
    // نبني صورة per-condition: كل سجل manager_in وreturn_to_manager له حالة
    // نطرح منها outQty بشكل نسبي
    const conditionRaw: Record<string, number> = { new: 0, good: 0, damaged: 0 };
    inItems.forEach(i => {
      const c = (i.condition || 'new') as string;
      if (conditionRaw[c] !== undefined) conditionRaw[c] += Number(i.qty) || 0;
      else conditionRaw['new'] += Number(i.qty) || 0;
    });
    retItems.forEach(i => {
      const c = (i.condition || 'new') as string;
      if (conditionRaw[c] !== undefined) conditionRaw[c] += Number(i.qty) || 0;
      else conditionRaw['new'] += Number(i.qty) || 0;
    });

    // توزيع الخروج نسبياً على الحالات
    const totalIn = inQty + retQ;
    let remaining = inQty - outQty + retQ;
    const conditionCounts: Record<string, number> = { new: 0, good: 0, damaged: 0 };
    if (totalIn > 0 && remaining > 0) {
      CONDITIONS.forEach(c => {
        conditionCounts[c] = Math.round((conditionRaw[c] / totalIn) * remaining);
      });
      // تصحيح الفروق التقريبية
      const sumCounts = conditionCounts.new + conditionCounts.good + conditionCounts.damaged;
      conditionCounts.new += remaining - sumCounts;
    }

    inventory[t] = {
      total: inQty,
      sent: outQty,
      returned: retQ,
      remaining,
      conditionCounts,
    };
  });

  const supervisorDebts = supervisors.map(sup => {
    const supPilots = pilots.filter(p => p.supervisor_id === sup.id);
    let netPilotsSalary = 0;
    supPilots.forEach(p => {
      const adv = advances.filter(a => a.pilot_id === p.id && !a.settled).reduce((s, a) => s + (Number(a.amount) || 0), 0);
      const ded = deductions.filter(d => d.pilot_id === p.id && !d.deleted && !d.settled).reduce((s, d) => s + (Number(d.amount) || 0), 0);
      const bon = bonuses.filter(b => b.pilot_id === p.id && !b.deleted && !b.settled).reduce((s, b) => s + (Number(b.amount) || 0), 0);
      const uni = uniforms.filter(u => u.pilot_id === p.id && !u.settled).reduce((s, u) => s + ((Number(u.qty) || 0) * (Number(u.price) || 0)), 0);
      netPilotsSalary += (p.salary_closed ? 0 : (Number(p.base_salary) || 0)) - adv - ded + bon - uni;
    });
    const supFunding = funding.filter(f => f.supervisor_id === sup.id).reduce((s, f) => s + (Number(f.amount) || 0), 0);
    return { id: sup.id, name: sup.name, region: sup.region, phone: sup.phone, funding: supFunding, netPilotsSalary, totalDue: netPilotsSalary, pilotsCount: supPilots.length };
  });

  const totalFunded = funding.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const inTotal     = (balR.data || []).filter(b => b.direction === 'in').reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const outTotal    = (balR.data || []).filter(b => b.direction === 'out').reduce((s, b) => s + (Number(b.amount) || 0), 0);

  // إحصائيات آخر 6 أشهر: التمويل الشهري وعدد الطيارين الجدد
  const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const now = new Date();
  const monthlyLabels: string[] = [];
  const monthlyFunding: number[] = [];
  const monthlyPilots: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    monthlyLabels.push(ARABIC_MONTHS[m]);
    const fundSum = funding.reduce((s, f) => {
      const fd = f.date ? new Date(f.date) : null;
      if (fd && fd.getFullYear() === y && fd.getMonth() === m) return s + (Number(f.amount) || 0);
      return s;
    }, 0);
    monthlyFunding.push(fundSum);
    const pilotCount = pilots.reduce((s, p) => {
      const pd = p.created_at ? new Date(p.created_at) : null;
      if (pd && pd.getFullYear() === y && pd.getMonth() === m) return s + 1;
      return s;
    }, 0);
    monthlyPilots.push(pilotCount);
  }

  return res.json({
    success: true, pilotsCount: pilots.length, supervisorsCount: supervisors.length,
    inventory, totalFunded, supervisorDebts, totalDue: supervisorDebts.reduce((s, d) => s + d.totalDue, 0),
    requests: reqR.data || [], pendingReturns: (retR.data || []).length + (supRetR.data || []).length,
    balance: inTotal - outTotal, monthlyLabels, monthlyFunding, monthlyPilots, session
  });
}
