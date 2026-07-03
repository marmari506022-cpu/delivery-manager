import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { signToken } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  if (!username || !password)
    return res.json({ success: false, message: 'أدخل اسم المستخدم وكلمة المرور' });

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('active', true)
    .limit(1);

  const user = users?.[0];

  if (!user) {
    // لو مش موجود في جدول المستخدمين العاديين، جرّب جدول المطورين
    const { data: devs } = await supabase
      .from('developers')
      .select('*')
      .eq('username', username)
      .limit(1);
    const dev = devs?.[0];
    if (!dev || String(dev.password) !== String(password))
      return res.json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });

    const token = signToken({
      id: dev.id,
      role: 'developer',
      name: dev.name,
      region: '',
      phone: '',
      supervisorId: '',
      baseSalary: 0,
      adminId: '',
    });
    return res.json({ success: true, token, role: 'developer', name: dev.name, pilotId: '' });
  }

  if (String(user.password) !== String(password))
    return res.json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });

  let pilotId = '';
  if (user.role === 'pilot') {
    const { data: pilots } = await supabase
      .from('pilots')
      .select('id')
      .eq('active', true)
      .eq('admin_id', user.admin_id || '')
      .or(`phone.eq.${user.phone},name.eq.${user.name}`)
      .limit(1);
    pilotId = pilots?.[0]?.id || '';
  }

  // adminId: للمدير = id نفسه, للمشرف/الطيار = admin_id المحفوظ في users
  const adminId = user.role === 'manager' ? user.id : (user.admin_id || '');

  const session = {
    id: user.id,
    role: user.role,
    name: user.name,
    region: user.region || '',
    phone: String(user.phone || ''),
    supervisorId: user.supervisor_id || '',
    baseSalary: Number(user.base_salary) || 0,
    adminId,
  };

  const token = signToken(session);
  return res.json({ success: true, token, role: user.role, name: user.name, pilotId });
}
