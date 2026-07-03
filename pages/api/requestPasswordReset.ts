import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { generateId, nowIso } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { identifier } = req.body;

  const { data: users } = await supabase
    .from('users').select('*')
    .or(`username.eq.${identifier},phone.eq.${identifier}`)
    .limit(1);
  const user = users?.[0];
  if (!user) return res.json({ success: false, message: 'المستخدم غير موجود' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await supabase.from('reset_codes').insert({
    id: generateId(), user_id: user.id, code,
    phone: user.phone, used: false, created_at: nowIso()
  });

  return res.json({ success: true, phone: user.phone, code });
}
