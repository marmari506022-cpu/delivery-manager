import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { data: users } = await supabase
    .from('users')
    .select('id,name,username,phone,region,base_salary')
    .eq('id', session.id)
    .limit(1);
  const user = users?.[0];
  if (!user) return res.json({ success: false, message: 'غير موجود' });

  return res.json({ success: true, name: user.name, username: user.username, phone: user.phone || '', region: user.region || '', baseSalary: user.base_salary || 0 });
}
