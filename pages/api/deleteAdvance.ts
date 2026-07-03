import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const { advanceId } = req.body;
  const { data } = await supabase.from('advances').select('*').eq('id', advanceId).limit(1);
  const item = data?.[0];
  if (!item) return res.json({ success: false, message: 'السلفة غير موجودة' });
  if (item.settled) return res.json({ success: false, message: 'لا يمكن حذف سلفة تم تقفيلها' });
  if (item.deleted) return res.json({ success: false, message: 'السلفة محذوفة مسبقاً' });
  if (session.role === 'supervisor' && item.added_by_role === 'admin')
    return res.json({ success: false, message: 'لا يمكنك حذف سلفة أضافها الأدمن' });

  await supabase.from('advances').delete().eq('id', advanceId);
  return res.json({ success: true });
}
