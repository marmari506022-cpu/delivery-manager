import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { key, icon, label, displayOrder, companyId, skipCompanyCheck } = req.body;
  if (!key || !icon || !label) return res.json({ success: false, message: 'جميع الحقول مطلوبة' });
  if (!companyId && !skipCompanyCheck) return res.json({ success: false, message: 'يجب تحديد الشركة المخصصة لهذا النوع' });

  // Validate key: alphanumeric + underscore only
  if (!/^[a-z0-9_]+$/.test(key)) return res.json({ success: false, message: 'المعرف يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط' });

  const adminId = getAdminId(session);

  // تأكيد عدم تكرار المعرف أو الاسم عند نفس الأدمن
  const { data: dup } = await supabase
    .from('equipment_types')
    .select('id, key, label')
    .eq('admin_id', adminId);
  if (dup) {
    const dupKey = dup.find((d: any) => d.key === key.toLowerCase());
    if (dupKey) return res.json({ success: false, message: 'يوجد نوع معدات بنفس المعرف الداخلي بالفعل' });
    const dupLabel = dup.find((d: any) => d.label?.trim().toLowerCase() === label.trim().toLowerCase());
    if (dupLabel) return res.json({ success: false, message: 'يوجد نوع معدات بنفس الاسم بالفعل' });
  }

  // Get max sort_order لنفس الأدمن فقط
  const { data: existing } = await supabase
    .from('equipment_types')
    .select('sort_order')
    .eq('admin_id', adminId)
    .order('sort_order', { ascending: false })
    .limit(1);
  const autoOrder = (existing?.[0]?.sort_order || 0) + 1;
  const nextOrder = displayOrder ? Number(displayOrder) : autoOrder;

  const insertData: any = { id: generateId(), key: key.toLowerCase(), icon, label, active: true, sort_order: nextOrder, admin_id: adminId };
  if (companyId) insertData.company_id = companyId;

  const { error } = await supabase.from('equipment_types').insert(insertData);

  if (error) {
    if (error.code === '23505') return res.json({ success: false, message: 'هذا المعرف مستخدم بالفعل' });
    return res.json({ success: false, message: error.message });
  }

  return res.json({ success: true });
}
