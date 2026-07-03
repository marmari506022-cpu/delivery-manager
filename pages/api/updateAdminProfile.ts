import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, signToken } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { name, username, phone, newPassword, oldPassword } = req.body;

  if (!name || !username) return res.json({ success: false, message: 'الاسم واليوزر مطلوبان' });

  // جلب بيانات المدير الحالية
  const { data: users, error: fetchErr } = await supabase.from('users').select('id,password,admin_id').eq('id', session.id).limit(1);
  if (fetchErr) return res.json({ success: false, message: fetchErr.message });
  const user = users?.[0];
  if (!user) return res.json({ success: false, message: 'المستخدم غير موجود' });

  // التحقق من كلمة المرور الحالية دائماً قبل أي تعديل
  if (!oldPassword) return res.json({ success: false, message: 'أدخل كلمة المرور الحالية' });
  if (String(user.password) !== String(oldPassword)) return res.json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });

  // التحقق من اليوزر مش مكرر (ضمن نفس نطاق الأدمن فقط)
  const { data: existing, error: existErr } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .neq('id', session.id)
    .limit(1);
  if (existErr) return res.json({ success: false, message: existErr.message });
  if (existing && existing.length > 0) return res.json({ success: false, message: 'اسم المستخدم مستخدم بالفعل' });

  const updates: any = { name, username, phone: phone || '' };

  // تغيير الباسورد لو موجود
  if (newPassword) {
    updates.password = String(newPassword);
  }

  const { data: updated, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', session.id)
    .select('id,name,username,phone,password')
    .limit(1);

  if (error) return res.json({ success: false, message: error.message });
  if (!updated || updated.length === 0) return res.json({ success: false, message: 'فشل تحديث البيانات — لم يتم العثور على المستخدم بعد التحديث' });

  const saved = updated[0];
  if (newPassword && String(saved.password) !== String(newPassword)) {
    return res.json({ success: false, message: 'فشل تحديث كلمة المرور، حاول مرة أخرى' });
  }

  // إنشاء token جديد بالبيانات المحدثة
  const newToken = signToken({
    id: session.id,
    role: 'manager',
    name: saved.name,
    region: session.region || '',
    phone: saved.phone || '',
    supervisorId: '',
    baseSalary: 0,
    adminId: session.id, // المدير = adminId نفس id
  });

  return res.json({ success: true, token: newToken, name: saved.name, username: saved.username, phone: saved.phone || '' });
}
