import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

function estimateRowBytes(row: any): number {
  try { return new TextEncoder().encode(JSON.stringify(row)).length; }
  catch { return 200; }
}

function calcSizeMB(rows: any[]): number {
  if (!rows.length) return 0;
  const avg = rows.slice(0, 10).reduce((s, r) => s + estimateRowBytes(r), 0) / Math.min(rows.length, 10);
  const total = avg * rows.length + Math.max(8192, rows.length * 50);
  return Math.round((total / (1024 * 1024)) * 1000) / 1000;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);

  try {
    const [
      usersRes, pilotsRes, advancesRes, deductionsRes, bonusesRes,
      uniformsRes, fundingRes, requestsRes, settledRes, inventoryRes,
      managerSalaryRes, regionsRes, balanceRes, returnsRes,
      companiesRes, inventoryLogRes, equipmentTypesRes,
    ] = await Promise.all([
      // جميع الجداول تُفلتر الآن مباشرة بـ admin_id
      supabase.from('users').select('*').eq('admin_id', adminId).neq('role', 'manager'),
      supabase.from('pilots').select('*').eq('admin_id', adminId),
      supabase.from('advances').select('*').eq('admin_id', adminId),
      supabase.from('deductions').select('*').eq('admin_id', adminId),
      supabase.from('bonuses').select('*').eq('admin_id', adminId),
      supabase.from('uniforms').select('*').eq('admin_id', adminId),
      supabase.from('funding').select('*').eq('admin_id', adminId),
      supabase.from('requests').select('*').eq('admin_id', adminId),
      supabase.from('settled').select('*').eq('admin_id', adminId),
      supabase.from('inventory').select('*').eq('admin_id', adminId),
      supabase.from('manager_salary').select('*').eq('admin_id', adminId),
      supabase.from('regions').select('*').eq('admin_id', adminId),
      supabase.from('balance').select('*').eq('admin_id', adminId),
      supabase.from('returns').select('*').eq('admin_id', adminId),
      supabase.from('companies').select('*').eq('admin_id', adminId),
      supabase.from('inventory_log').select('*').eq('admin_id', adminId),
      supabase.from('equipment_types').select('*').eq('admin_id', adminId),
    ]);

    const tables = {
      users:          usersRes.data          || [],
      pilots:         pilotsRes.data         || [],
      advances:       advancesRes.data       || [],
      deductions:     deductionsRes.data     || [],
      bonuses:        bonusesRes.data        || [],
      uniforms:       uniformsRes.data       || [],
      funding:        fundingRes.data        || [],
      requests:       requestsRes.data       || [],
      settled:        settledRes.data        || [],
      inventory:      inventoryRes.data      || [],
      manager_salary: managerSalaryRes.data  || [],
      regions:        regionsRes.data        || [],
      balance:        balanceRes.data        || [],
      returns:        returnsRes.data        || [],
      companies:      companiesRes.data      || [],
      inventory_log:  inventoryLogRes.data   || [],
      equipment_types:equipmentTypesRes.data || [],
    };

    const backup = {
      exportedAt: new Date().toISOString(),
      exportedBy: session.name,
      adminId,
      version: '2.0',
      tables,
    };

    const sizes: Record<string, number>   = {};
    const sizesDB: Record<string, number> = {};
    let totalRows = 0;
    let totalDbMB = 0;

    for (const [k, v] of Object.entries(tables)) {
      const arr = v as any[];
      sizes[k]  = arr.length;
      totalRows += arr.length;
      const mb   = calcSizeMB(arr);
      sizesDB[k] = mb;
      totalDbMB += mb;
    }

    totalDbMB = Math.round(totalDbMB * 1000) / 1000;

    return res.json({ success: true, data: backup, sizes, sizesDB, totalRows, totalDbMB });
  } catch (err: any) {
    return res.json({ success: false, message: err.message || 'خطأ في جلب البيانات' });
  }
}
