import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const { returnId } = req.body;
  if (!returnId) return res.json({ success: false, message: 'معرف الطلب مطلوب' });

  // جلب الطلب مع التحقق من supervisor_id
  const { data: retRows } = await supabase
    .from('return_requests')
    .select('*')
    .eq('id', returnId)
    .eq('supervisor_id', session.id)
    .limit(1);

  const ret = retRows?.[0];
  if (!ret) return res.json({ success: false, message: 'الطلب غير موجود' });
  if (ret.admin_id && ret.admin_id !== adminId) return res.json({ success: false, message: 'غير مصرح بهذا الطلب' });
  if (ret.status !== 'pending') return res.json({ success: false, message: 'لا يمكن إلغاء طلب غير معلق' });

  const items: any[] = Array.isArray(ret.items) ? ret.items : [];

  // جلب مخزون المشرف (sup_in فقط)
  const { data: inv } = await supabase
    .from('inventory')
    .select('*')
    .eq('supervisor_id', session.id)
    .eq('direction', 'sup_in');

  const allBatches = inv || [];

  // فك تجميد الكميات لكل معدة (نفس منطق rejectSupervisorReturn)
  for (const item of items) {
    let toUnfreeze = Number(item.qty) || 0;
    if (toUnfreeze <= 0) continue;

    const candidates = allBatches
      .filter((b: any) => b.type === item.type && (Number(b.frozen_qty) || 0) > 0)
      .sort((a: any, b: any) => {
        const aMatch = (a.price == item.price && (a.condition || 'new') === (item.condition || 'new') && a.company_id === item.company_id) ? 0 : 1;
        const bMatch = (b.price == item.price && (b.condition || 'new') === (item.condition || 'new') && b.company_id === item.company_id) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return new Date(a.date).getTime() - new Date(b.date).getTime(); // FIFO
      });

    for (const batch of candidates) {
      if (toUnfreeze <= 0) break;
      const batchFrozen = Number(batch.frozen_qty) || 0;
      const release = Math.min(toUnfreeze, batchFrozen);
      if (release <= 0) continue;
      await supabase
        .from('inventory')
        .update({ frozen_qty: batchFrozen - release })
        .eq('id', batch.id);
      batch.frozen_qty = batchFrozen - release;
      toUnfreeze -= release;
    }
  }

  // حذف طلب المرتجع
  const { error } = await supabase.from('return_requests').delete().eq('id', returnId);
  if (error) return res.json({ success: false, message: 'خطأ في قاعدة البيانات: ' + error.message });

  return res.json({ success: true });
}
