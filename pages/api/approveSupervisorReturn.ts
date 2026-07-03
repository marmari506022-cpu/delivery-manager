import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const { returnRequestId } = req.body;
  if (!returnRequestId) return res.json({ success: false, message: 'الطلب غير محدد' });

  const { data: reqRows } = await supabase.from('return_requests').select('*').eq('id', returnRequestId).limit(1);
  const ret = reqRows?.[0];
  if (!ret) return res.json({ success: false, message: 'الطلب غير موجود' });
  if (ret.admin_id && ret.admin_id !== adminId) return res.json({ success: false, message: 'غير مصرح بهذا الطلب' });
  if (ret.status !== 'pending') return res.json({ success: false, message: 'الطلب ليس في حالة انتظار' });

  const items: any[] = Array.isArray(ret.items) ? ret.items : [];
  const supId = ret.supervisor_id;

  const { data: supInv } = await supabase.from('inventory').select('*').eq('supervisor_id', supId).eq('direction', 'sup_in');
  const allBatches = supInv || [];

  for (const item of items) {
    let toUnfreeze = Number(item.qty) || 0;
    if (toUnfreeze <= 0) continue;

    const candidates = allBatches
      .filter(b => b.type === item.type && (Number(b.frozen_qty) || 0) > 0)
      .sort((a: any, b: any) => {
        const aMatch = (a.price == item.price && (a.condition || 'new') === (item.condition || 'new') && a.company_id === item.company_id) ? 0 : 1;
        const bMatch = (b.price == item.price && (b.condition || 'new') === (item.condition || 'new') && b.company_id === item.company_id) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

    for (const batch of candidates) {
      if (toUnfreeze <= 0) break;
      const batchFrozen = Number(batch.frozen_qty) || 0;
      const release = Math.min(toUnfreeze, batchFrozen);
      if (release <= 0) continue;
      await supabase.from('inventory').update({ frozen_qty: batchFrozen - release }).eq('id', batch.id);
      batch.frozen_qty = batchFrozen - release;
      toUnfreeze -= release;
    }
  }

  // خصم الكميات فعليًا من مخزون المشرف وإضافتها لمخزن المدير
  const batchId = generateId();
  for (const item of items) {
    const qtyNum = Number(item.qty) || 0;
    if (qtyNum <= 0) continue;
    const priceNum = Number(item.price) || 0;
    const condition = item.condition || 'new';

    await supabase.from('inventory').insert({
      id: generateId(),
      supervisor_id: supId,
      admin_id: adminId,
      amount: 0,
      date: nowIso(),
      type: item.type,
      qty: qtyNum,
      price: priceNum,
      profit_margin: 0,
      profit_type: 'fixed',
      direction: 'sup_out_to_manager',
      batch_id: batchId,
      company_id: item.company_id || '',
      condition,
    });

    await supabase.from('inventory').insert({
      id: generateId(),
      supervisor_id: 'manager',
      admin_id: adminId,
      amount: 0,
      date: nowIso(),
      type: item.type,
      qty: qtyNum,
      price: priceNum,
      profit_margin: 0,
      profit_type: 'percent',
      direction: 'manager_in',
      batch_id: batchId,
      company_id: item.company_id || '',
      condition,
    });

    await supabase.from('inventory_log').insert({
      id: generateId(),
      admin_id: adminId,
      action: 'add',
      company_id: item.company_id || '',
      company_name: item.company_name || '',
      type: item.type,
      qty: qtyNum,
      price: priceNum,
      supervisor_id: 'manager',
      supervisor_name: 'المدير',
      batch_id: batchId,
      performed_by: session.name,
      note: `مرتجع مشرف مقبول`,
      date: nowIso(),
    });
  }

  await supabase.from('return_requests').update({
    status: 'approved',
    updated_at: nowIso(),
    approved_at: nowIso(),
    approved_by: session.name,
  }).eq('id', returnRequestId);

  // تحديث الإشعار إلى "مقبول"
  await supabase
    .from('notifications')
    .update({ status: 'accepted' })
    .eq('ref_id', returnRequestId)
    .eq('type', 'supervisor_return_request');

  return res.json({ success: true });
}
