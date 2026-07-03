import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'developer') return res.json({ success: false, message: 'غير مصرح' });

  const { name, username, password, phone } = req.body;
  if (!name || !username || !password) {
    return res.json({ success: false, message: 'الاسم واليوزر وكلمة المرور مطلوبون' });
  }
  if (String(password).length < 4) {
    return res.json({ success: false, message: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' });
  }

  const { data: existing, error: existErr } = await supabase
    .from('users').select('id').eq('username', username).limit(1);
  if (existErr) return res.json({ success: false, message: existErr.message });
  if (existing && existing.length > 0) return res.json({ success: false, message: 'اسم المستخدم مستخدم بالفعل' });

  const id = generateId();
  const { error } = await supabase.from('users').insert({
    id, username, password: String(password), role: 'manager', name,
    phone: phone || '', region: '', supervisor_id: '', active: true,
    base_salary: 0, company_id: '', admin_id: id, // المدير = adminId نفسه
  });
  if (error) return res.json({ success: false, message: error.message });

  return res.json({ success: true, id, name, username });
}
