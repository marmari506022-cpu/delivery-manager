import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const { bonusId } = req.body;
  const { data } = await supabase.from('bonuses').select('*').eq('id', bonusId).limit(1);
  const item = data?.[0];
  if (!item) return res.json({ success: false, message: 'المكافأة غير موجودة' });
  if (item.settled) return res.json({ success: false, message: 'لا يمكن حذف مكافأة تم تقفيلها' });
  if (item.deleted) return res.json({ success: false, message: 'المكافأة محذوفة مسبقاً' });
  if (session.role === 'supervisor' && (item.added_by_role === 'admin' || item.added_by_role === 'manager'))
    return res.json({ success: false, message: 'لا يمكنك حذف مكافأة أضافها الأدمن أو المدير' });

  await supabase.from('bonuses').delete().eq('id', bonusId);
  return res.json({ success: true });
}
