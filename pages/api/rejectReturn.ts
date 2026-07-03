import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, nowIso } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { returnId } = req.body;

  const { data: retRows } = await supabase.from('returns').select('*').eq('id', returnId).limit(1);
  const ret = retRows?.[0];
  if (!ret) return res.json({ success: false, message: 'المرتجع غير موجود' });
  if (ret.status !== 'pending') return res.json({ success: false, message: 'الطلب ليس في حالة انتظار' });

  const items: any[] = Array.isArray(ret.items) ? ret.items : [];

  // فك التجميد عن كل المعدات
  for (const item of items) {
    await supabase.from('uniforms').update({ frozen: false }).eq('id', item.uniform_id);
  }

  // تحديث حالة الطلب إلى مرفوض
  await supabase.from('returns').update({
    status: 'rejected',
    rejected_at: nowIso(),
    rejected_by: session.name,
  }).eq('id', returnId);

  return res.json({ success: true });
}
