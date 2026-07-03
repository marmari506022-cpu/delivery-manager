import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { code, newPassword } = req.body;

  const { data: codes } = await supabase
    .from('reset_codes').select('*').eq('code', code).eq('used', false).limit(1);
  const entry = codes?.[0];
  if (!entry) return res.json({ success: false, message: 'الكود غير صحيح أو منتهي الصلاحية' });

  const { data: users } = await supabase
    .from('users').select('*').eq('id', entry.user_id).limit(1);
  if (!users?.[0]) return res.json({ success: false, message: 'المستخدم غير موجود' });

  await supabase.from('users').update({ password: newPassword }).eq('id', entry.user_id);
  await supabase.from('reset_codes').update({ used: true }).eq('id', entry.id);

  return res.json({ success: true });
}
