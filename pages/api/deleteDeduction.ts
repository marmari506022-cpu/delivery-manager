import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const { deductionId } = req.body;
  const { data } = await supabase.from('deductions').select('*').eq('id', deductionId).limit(1);
  const item = data?.[0];
  if (!item) return res.json({ success: false, message: 'الخصم غير موجود' });
  if (item.settled) return res.json({ success: false, message: 'لا يمكن حذف خصم تم تقفيله' });
  if (item.deleted) return res.json({ success: false, message: 'الخصم محذوف مسبقاً' });
  if (session.role === 'supervisor' && (item.added_by_role === 'admin' || item.added_by_role === 'manager'))
    return res.json({ success: false, message: 'لا يمكنك حذف خصم أضافه الأدمن أو المدير' });

  await supabase.from('deductions').delete().eq('id', deductionId);
  return res.json({ success: true });
}
