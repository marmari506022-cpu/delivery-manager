import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const { oldPass, newPass } = req.body;
  const { data: users } = await supabase
    .from('users').select('*').eq('id', session.id).limit(1);
  const user = users?.[0];
  if (!user) return res.json({ success: false, message: 'المستخدم غير موجود' });
  if (String(user.password) !== String(oldPass))
    return res.json({ success: false, message: 'كلمة المرور القديمة غير صحيحة' });

  await supabase.from('users').update({ password: newPass }).eq('id', session.id);
  return res.json({ success: true });
}
