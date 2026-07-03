import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { name } = req.body;
  if (!name || !name.trim()) return res.json({ success: false, message: 'اسم الشركة مطلوب' });

  const id = generateId();
  const adminId = getAdminId(session);
  const { error } = await supabase.from('companies').insert({ id, name: name.trim(), active: true, admin_id: adminId });

  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true, id });
}
