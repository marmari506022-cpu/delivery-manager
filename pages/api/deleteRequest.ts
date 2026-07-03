import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { requestId } = req.body;
  if (!requestId) return res.json({ success: false, message: 'معرف الطلب مطلوب' });

  const { data } = await supabase.from('requests').select('*').eq('id', requestId).limit(1);
  const item = data?.[0];
  if (!item) return res.json({ success: false, message: 'الطلب غير موجود' });
  if (item.supervisor_id !== session.id) return res.json({ success: false, message: 'غير مصرح' });
  if (item.status !== 'pending') return res.json({ success: false, message: 'لا يمكن حذف طلب تمت معالجته' });

  await supabase.from('requests').delete().eq('id', requestId);
  return res.json({ success: true });
}
