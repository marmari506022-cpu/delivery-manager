import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

// الجداول التي يمكن للأدمن حذفها (لا تشمل بيانات المشرفين الخاصة)
// الجداول التي يمكن للأدمن حذفها فقط
const ALLOWED_TABLES = [
  'funding',
  'requests',
  'inventory',
  'inventory_log',
  'balance',
  'notifications',
  'manager_salary',
  'reset_codes',
  'companies',
  'regions',
  'equipment_types',
];

// الجداول المحمية التي لا يستطيع الأدمن حذفها
const PROTECTED_TABLES = [
  'users',      // حسابات المشرفين
  'pilots',     // بيانات الطيارين
  'advances',   // سلف الطيارين
  'deductions', // خصومات الطيارين
  'bonuses',    // مكافآت الطيارين
  'uniforms',   // زي الطيارين
  'settled',    // مسويات الطيارين
  'returns',    // مرتجعات الطيارين
];

const TABLE_LABELS: Record<string, string> = {
  advances: 'السلف',
  deductions: 'الخصومات',
  bonuses: 'المكافآت',
  uniforms: 'الزي الرسمي',
  funding: 'التمويل',
  requests: 'الطلبات',
  settled: 'المسويات',
  inventory: 'المخزن',
  inventory_log: 'سجل المخزن',
  balance: 'الرصيد',
  returns: 'المرتجعات',
  notifications: 'الإشعارات',
  manager_salary: 'راتب المشرف',
  reset_codes: 'أكواد الإعادة',
  companies: 'الشركات',
  regions: 'المناطق',
  equipment_types: 'أنواع المعدات',
  pilots: 'الطيارون',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { tables } = req.body as { tables: string[] };

  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    return res.json({ success: false, message: 'يجب تحديد جداول للحذف' });
  }

  // التحقق أن كل الجداول المطلوبة مسموح بها
  const forbidden = tables.filter(t => !ALLOWED_TABLES.includes(t));
  if (forbidden.length > 0) {
    return res.json({
      success: false,
      message: `لا يمكن حذف: ${forbidden.map(t => TABLE_LABELS[t] || t).join('، ')} — هذه البيانات محمية`,
    });
  }

  const deleted: string[] = [];
  const errors: string[] = [];

  for (const table of tables) {
    try {
      if (table === 'equipment_types') {
        // حذف الأنواع المضافة فقط مع الإبقاء على الأنواع الأصلية
        const { error } = await supabase
          .from('equipment_types')
          .delete()
          .not('key', 'in', '("pouch","tshirt","jacket","cap","helmet")');
        // إعادة تفعيل الأنواع الأصلية لو كانت معطلة
        await supabase.from('equipment_types').update({ active: true })
          .in('key', ['pouch', 'tshirt', 'jacket', 'cap', 'helmet']);
        if (!error) deleted.push(table);
        else errors.push(table);
      } else {
        // حذف كل سجلات الجدول
        const { error } = await (supabase.from(table as any) as any)
          .delete()
          .neq('id', 'IMPOSSIBLE_MATCH_____');
        if (!error) deleted.push(table);
        else errors.push(table);
      }
    } catch {
      errors.push(table);
    }
  }

  if (errors.length > 0) {
    return res.json({
      success: false,
      message: `تعذر حذف: ${errors.map(t => TABLE_LABELS[t] || t).join('، ')}`,
      deleted: deleted.map(t => TABLE_LABELS[t] || t),
    });
  }

  return res.json({
    success: true,
    message: `تم حذف: ${deleted.map(t => TABLE_LABELS[t] || t).join('، ')} بنجاح`,
    deleted: deleted.map(t => TABLE_LABELS[t] || t),
  });
}
