import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

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

  const { tables } = req.body as { tables: Record<string, any[]> };
  if (!tables || typeof tables !== 'object') return res.json({ success: false, message: 'بيانات غير صحيحة' });

  const restored: string[] = [];
  const errors: string[] = [];

  for (const [tableName, rows] of Object.entries(tables)) {
    if (!RESTORABLE_TABLES.includes(tableName)) continue;
    if (!Array.isArray(rows) || rows.length === 0) continue;

    try {
      // upsert — يضيف الجديد ويحدّث الموجود بدون حذف
      const { error } = await (supabase.from(tableName as any) as any).upsert(rows, { onConflict: 'id' });
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
