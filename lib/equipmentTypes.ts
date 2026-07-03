import { supabase } from './supabase';

const DEFAULT_TYPES = ['pouch', 'tshirt', 'jacket', 'cap', 'helmet'];

/** يجيب أنواع المعدات النشطة فقط — تُستخدم في عمليات الإضافة/الإرسال الجديدة */
export async function getActiveTypes(adminId?: string): Promise<string[]> {
  let q = supabase
    .from('equipment_types')
    .select('key')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (adminId) q = q.eq('admin_id', adminId);

  const { data } = await q;
  // دايماً ندمج DEFAULT_TYPES مع الأنواع الموجودة في الـ DB
  const dbKeys = (data || []).map((d: any) => d.key);
  const merged = [...DEFAULT_TYPES];
  dbKeys.forEach((k: string) => { if (!merged.includes(k)) merged.push(k); });
  return merged;
}

/**
 * يجيب كل أنواع المعدات (نشطة وموقوفة) — تُستخدم في حساب إحصائيات/أرصدة المخزون
 * عشان الكميات الموجودة فعلاً لنوع تم إيقافه متختفيش من الكروت والتقارير.
 */
export async function getAllTypes(adminId?: string): Promise<string[]> {
  let q = supabase
    .from('equipment_types')
    .select('key')
    .order('sort_order', { ascending: true });

  if (adminId) q = q.eq('admin_id', adminId);

  const { data } = await q;
  // دايماً ندمج DEFAULT_TYPES مع الأنواع الموجودة في الـ DB
  const dbKeys = (data || []).map((d: any) => d.key);
  const merged = [...DEFAULT_TYPES];
  dbKeys.forEach((k: string) => { if (!merged.includes(k)) merged.push(k); });
  return merged;
}
