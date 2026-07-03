import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

// الجداول المرتبطة مباشرة بـ admin_id
const ADMIN_DIRECT_TABLES = [
  { table: 'users',           label: 'المشرفون',        filter: 'admin_id', extra: { role: 'supervisor' } },
  { table: 'pilots',          label: 'الطيارون',         filter: 'admin_id' },
  { table: 'regions',         label: 'المناطق',          filter: 'admin_id' },
  { table: 'companies',       label: 'الشركات',          filter: 'admin_id' },
  { table: 'equipment_types', label: 'أنواع المعدات',    filter: 'admin_id' },
  { table: 'balance',         label: 'الرصيد',           filter: 'admin_id' },
  { table: 'inventory',       label: 'المخزن',           filter: 'admin_id' },
  { table: 'inventory_log',   label: 'سجل المخزن',       filter: 'admin_id' },
  { table: 'funding',         label: 'التمويل',          filter: 'admin_id' },
  { table: 'requests',        label: 'الطلبات',          filter: 'admin_id' },
  { table: 'returns',         label: 'المرتجعات',        filter: 'admin_id' },
  { table: 'notifications',   label: 'الإشعارات',        filter: 'admin_id' },
];

// الجداول المرتبطة بالمشرفين (supervisor_id) — نجيبها عبر قائمة المشرفين
const SUP_LINKED_TABLES = [
  { table: 'advances',      label: 'السلف' },
  { table: 'deductions',    label: 'الخصومات' },
  { table: 'bonuses',       label: 'المكافآت' },
  { table: 'uniforms',      label: 'الزي الرسمي' },
  { table: 'manager_salary',label: 'راتب المشرفين' },
  { table: 'settled',       label: 'المُسوّى' },
];

function bytesToMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 1000) / 1000;
}

function estimateRowBytes(row: any): number {
  try { return new TextEncoder().encode(JSON.stringify(row)).length; }
  catch { return 200; }
}

async function countAndEstimate(
  tableName: string,
  filterCol: string,
  filterVal: string,
  extraFilters?: Record<string, string>
): Promise<{ rows: number; sizeMB: number }> {
  let q = supabase.from(tableName).select('*', { count: 'exact' }).eq(filterCol, filterVal);
  if (extraFilters) {
    for (const [k, v] of Object.entries(extraFilters)) q = q.eq(k, v);
  }
  // جيب 5 صفوف للتقدير + العدد الكلي
  const { count, data: sample } = await (q as any).limit(5);
  const rowCount = count || 0;
  let estimated = 0;
  if (sample && sample.length > 0) {
    const avg = sample.reduce((s: number, r: any) => s + estimateRowBytes(r), 0) / sample.length;
    estimated = avg * rowCount;
  } else {
    estimated = rowCount * 200;
  }
  estimated += Math.max(8192, rowCount * 50); // overhead
  return { rows: rowCount, sizeMB: bytesToMB(estimated) };
}

async function countInList(
  tableName: string,
  filterCol: string,
  filterVals: string[]
): Promise<{ rows: number; sizeMB: number }> {
  if (!filterVals.length) return { rows: 0, sizeMB: 0 };
  const { count, data: sample } = await supabase
    .from(tableName)
    .select('*', { count: 'exact' })
    .in(filterCol, filterVals)
    .limit(5);
  const rowCount = count || 0;
  let estimated = 0;
  if (sample && sample.length > 0) {
    const avg = sample.reduce((s: number, r: any) => s + estimateRowBytes(r), 0) / sample.length;
    estimated = avg * rowCount;
  } else {
    estimated = rowCount * 200;
  }
  estimated += Math.max(8192, rowCount * 50);
  return { rows: rowCount, sizeMB: bytesToMB(estimated) };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') {
    return res.json({ success: false, message: 'غير مصرح' });
  }

  const adminId = getAdminId(session);
  if (!adminId) return res.json({ success: false, message: 'لا يوجد admin_id في الجلسة' });

  try {
    const tableSizes: { table: string; label: string; rows: number; sizeMB: number }[] = [];
    let totalSizeMB = 0;

    // --- الجداول المرتبطة مباشرة بـ admin_id ---
    for (const t of ADMIN_DIRECT_TABLES) {
      const { rows, sizeMB } = await countAndEstimate(t.table, 'admin_id', adminId, (t as any).extra);
      tableSizes.push({ table: t.table, label: t.label, rows, sizeMB });
      totalSizeMB += sizeMB;
    }

    // --- جلب قائمة supervisor_ids التابعين لهذا الأدمن ---
    const { data: supervisors } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'supervisor')
      .eq('admin_id', adminId);
    const supIds = (supervisors || []).map((s: any) => s.id);

    // --- جلب قائمة pilot_ids التابعين لهذا الأدمن ---
    const { data: pilots } = await supabase
      .from('pilots')
      .select('id')
      .eq('admin_id', adminId);
    const pilotIds = (pilots || []).map((p: any) => p.id);

    // --- الجداول المرتبطة بالمشرفين ---
    for (const t of SUP_LINKED_TABLES) {
      const linkCol = ['advances','deductions','bonuses','uniforms'].includes(t.table) ? 'pilot_id' : 'supervisor_id';
      const linkVals = linkCol === 'pilot_id' ? pilotIds : supIds;
      const { rows, sizeMB } = await countInList(t.table, linkCol, linkVals);
      tableSizes.push({ table: t.table, label: t.label, rows, sizeMB });
      totalSizeMB += sizeMB;
    }

    // --- reset_codes: مرتبطة بـ user_id (المشرفين + الأدمن) ---
    const allUserIds = [adminId, ...supIds];
    const { rows: rcRows, sizeMB: rcMB } = await countInList('reset_codes', 'user_id', allUserIds);
    tableSizes.push({ table: 'reset_codes', label: 'أكواد الاستعادة', rows: rcRows, sizeMB: rcMB });
    totalSizeMB += rcMB;

    // ترتيب من الأكبر للأصغر
    tableSizes.sort((a, b) => b.sizeMB - a.sizeMB);

    return res.json({
      success: true,
      totalSizeMB: Math.round(totalSizeMB * 1000) / 1000,
      tables: tableSizes,
      isEstimate: true, // دايماً تقديري للبيانات المخصصة لأدمن معين
      adminId,
    });

  } catch (err: any) {
    return res.json({ success: false, message: err.message || 'خطأ في جلب حجم البيانات' });
  }
}
