import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, signToken } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'developer') return res.json({ success: false, message: 'غير مصرح' });

  const { username, newPassword, oldPassword } = req.body;
  if (!username) return res.json({ success: false, message: 'اليوزر مطلوب' });

  const { data: devs, error: fetchErr } = await supabase.from('developers').select('id,password').eq('id', session.id).limit(1);
  if (fetchErr) return res.json({ success: false, message: fetchErr.message });
  const dev = devs?.[0];
  if (!dev) return res.json({ success: false, message: 'الحساب غير موجود' });

  if (!oldPassword) return res.json({ success: false, message: 'أدخل كلمة المرور الحالية' });
  if (String(dev.password) !== String(oldPassword)) return res.json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });

  // التأكد إن اليوزر الجديد مش مستخدم من مطور تاني
  const { data: existing, error: existErr } = await supabase
    .from('developers')
    .select('id')
    .eq('username', username)
    .neq('id', session.id)
    .limit(1);
  if (existErr) return res.json({ success: false, message: existErr.message });
  if (existing && existing.length > 0) return res.json({ success: false, message: 'اسم المستخدم مستخدم بالفعل' });

  const updates: any = { username };
  if (newPassword) updates.password = String(newPassword);

  const { data: updated, error } = await supabase
    .from('developers')
    .update(updates)
    .eq('id', session.id)
    .select('id,username,name,password')
    .limit(1);

  if (error) return res.json({ success: false, message: error.message });
  const saved = updated?.[0];
  if (!saved) return res.json({ success: false, message: 'فشل تحديث البيانات' });
  if (newPassword && String(saved.password) !== String(newPassword)) {
    return res.json({ success: false, message: 'فشل تحديث كلمة المرور، حاول مرة أخرى' });
  }

  const newToken = signToken({
    id: session.id, role: 'developer', name: saved.name,
    region: '', phone: '', supervisorId: '', baseSalary: 0, adminId: '',
  });

  return res.json({ success: true, token: newToken, username: saved.username, name: saved.name });
}
