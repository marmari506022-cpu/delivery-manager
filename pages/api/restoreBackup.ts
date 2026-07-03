import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

// الجداول المسموح باستعادتها فقط (نفس المحمية في reset)
const RESTORABLE_TABLES = [
  'advances', 'deductions', 'bonuses', 'uniforms', 'funding',
  'requests', 'settled', 'inventory', 'inventory_log', 'balance',
  'returns', 'notifications', 'manager_salary', 'reset_codes',
  'companies', 'regions', 'equipment_types', 'pilots',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const { tables } = req.body as { tables: Record<string, any[]> };
  if (!tables || typeof tables !== 'object') return res.json({ success: false, message: 'بيانات غير صحيحة' });

  const restored: string[] = [];
  const errors: string[] = [];

  for (const [tableName, rows] of Object.entries(tables)) {
    if (!RESTORABLE_TABLES.includes(tableName)) continue;
    if (!Array.isArray(rows) || rows.length === 0) continue;

    try {
      // فرض admin_id الصحيح على كل صف — منع أي محاولة لانتحال أدمن تاني عن طريق ملف الباك أب
      const ids = rows.map((r: any) => r.id).filter(Boolean);
      const { data: existingRows } = ids.length
        ? await supabase.from(tableName as any).select('id,admin_id').in('id', ids)
        : { data: [] as any[] };
      const foreignIds = new Set((existingRows || []).filter((r: any) => r.admin_id && r.admin_id !== adminId).map((r: any) => r.id));

      const safeRows = rows
        .filter((r: any) => !foreignIds.has(r.id))
        .map((r: any) => ({ ...r, admin_id: adminId }));

      if (!safeRows.length) continue;

      // upsert — يضيف الجديد ويحدّث الموجود بدون حذف
      const { error } = await (supabase.from(tableName as any) as any).upsert(safeRows, { onConflict: 'id' });
      if (error) errors.push(tableName);
      else restored.push(tableName);
    } catch {
      errors.push(tableName);
    }
  }

  if (errors.length > 0) {
    return res.json({ success: false, message: `فشل استعادة: ${errors.join('، ')}`, restored });
  }

  return res.json({ success: true, message: `تم استعادة ${restored.length} جدول بنجاح`, restored });
}
