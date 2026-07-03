import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

// كل الجداول المرتبطة بالمدير عبر admin_id
const ADMIN_SCOPED_TABLES = [
  'advances', 'deductions', 'bonuses', 'uniforms', 'settled', 'manager_salary',
  'funding', 'requests', 'returns', 'notifications', 'balance',
  'inventory', 'inventory_log', 'regions', 'companies', 'equipment_types',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'developer') return res.json({ success: false, message: 'غير مصرح' });

  const { managerId, confirmUsername } = req.body as { managerId: string; confirmUsername: string };
  if (!managerId) return res.json({ success: false, message: 'يجب تحديد المدير' });

  const { data: managers, error: mErr } = await supabase
    .from('users').select('id,username,role').eq('id', managerId).limit(1);
  if (mErr) return res.json({ success: false, message: mErr.message });
  const manager = managers?.[0];
  if (!manager || manager.role !== 'manager') return res.json({ success: false, message: 'المدير غير موجود' });

  // تأكيد إضافي: لازم يكتب يوزر المدير بالظبط
  if (!confirmUsername || confirmUsername !== manager.username) {
    return res.json({ success: false, message: 'اسم المستخدم للتأكيد غير مطابق' });
  }

  const errors: string[] = [];

  // 1) حذف كل الجداول المرتبطة بالـ admin_id
  for (const table of ADMIN_SCOPED_TABLES) {
    const { error } = await (supabase.from(table as any) as any).delete().eq('admin_id', managerId);
    if (error) errors.push(`${table}: ${error.message}`);
  }

  // 2) حذف الطيارين التابعين لهذا المدير
  {
    const { error } = await supabase.from('pilots').delete().eq('admin_id', managerId);
    if (error) errors.push(`pilots: ${error.message}`);
  }

  // 3) حذف أكواد إعادة التعيين الخاصة بالمشرفين/المدير (مفيش admin_id في الجدول ده)
  {
    const { data: subUsers } = await supabase.from('users').select('id').eq('admin_id', managerId);
    const ids = [managerId, ...(subUsers || []).map((u: any) => u.id)];
    if (ids.length > 0) {
      const { error } = await supabase.from('reset_codes').delete().in('user_id', ids);
      if (error) errors.push(`reset_codes: ${error.message}`);
    }
  }

  // 4) حذف حسابات المشرفين التابعين للمدير
  {
    const { error } = await supabase.from('users').delete().eq('admin_id', managerId).eq('role', 'supervisor');
    if (error) errors.push(`supervisors: ${error.message}`);
  }

  // 5) حذف حساب المدير نفسه
  {
    const { error } = await supabase.from('users').delete().eq('id', managerId);
    if (error) errors.push(`manager: ${error.message}`);
  }

  if (errors.length > 0) {
    return res.json({ success: false, message: 'حدثت أخطاء أثناء الحذف: ' + errors.join(' | ') });
  }

  return res.json({ success: true, message: `تم حذف المدير "${manager.username}" وكل بياناته (المشرفين والطيارين) نهائياً` });
}
