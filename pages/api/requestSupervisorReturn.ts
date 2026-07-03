import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const supId = session.id;

  // items: [{ type, qty, price, condition, company_id, company_name }]
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0)
    return res.json({ success: false, message: 'لم يتم اختيار أي معدات' });

  // جلب مخزون المشرف الكامل
  const { data: inv } = await supabase
    .from('inventory')
    .select('*')
    .eq('supervisor_id', supId);

  const allInv = inv || [];

  // التحقق من الكميات المتاحة (remaining - frozen_qty) لكل نوع
  for (const item of items) {
    const { type, qty, price, condition } = item;
    const reqQty = Number(qty) || 0;
    if (reqQty <= 0) return res.json({ success: false, message: `كمية غير صحيحة للمعدة: ${type}` });

    const inQty  = allInv.filter(i => i.type === type && i.direction === 'sup_in').reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const outQty = allInv.filter(i => i.type === type && (i.direction === 'sup_out_to_pilot' || i.direction === 'sup_out_to_manager')).reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const retQty = allInv.filter(i => i.type === type && i.direction === 'return_to_sup').reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const frozenQty = allInv
      .filter(i => i.type === type && i.direction === 'sup_in' && (Number(i.frozen_qty) || 0) > 0)
      .reduce((s, i) => s + (Number(i.frozen_qty) || 0), 0);

    const remaining = inQty - outQty + retQty;
    const available = remaining - frozenQty;

    if (reqQty > available) {
      return res.json({
        success: false,
        message: `الكمية المطلوبة (${reqQty}) أكبر من المتاحة (${available}) للمعدة: ${type}. مجمد: ${frozenQty}`
      });
    }
  }

  // تجميد الكميات: نوزع frozen_qty على دفعات sup_in بأولوية تطابق السعر/الحالة/الشركة، ثم FIFO
  for (const item of items) {
    const { type, qty, price, condition, company_id } = item;
    let toFreeze = Number(qty) || 0;

    const inBatches = allInv
      .filter(i => i.type === type && i.direction === 'sup_in')
      .sort((a, b) => {
        const aMatch = (a.price == price && (a.condition || 'new') === (condition || 'new') && (a.company_id || '') === (company_id || '')) ? 0 : 1;
        const bMatch = (b.price == price && (b.condition || 'new') === (condition || 'new') && (b.company_id || '') === (company_id || '')) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

    for (const batch of inBatches) {
      if (toFreeze <= 0) break;
      const batchTotal = Number(batch.qty) || 0;
      const batchFrozen = Number(batch.frozen_qty) || 0;
      const canFreeze = batchTotal - batchFrozen;
      if (canFreeze <= 0) continue;

      const freeze = Math.min(toFreeze, canFreeze);
      await supabase
        .from('inventory')
        .update({ frozen_qty: batchFrozen + freeze })
        .eq('id', batch.id);
      toFreeze -= freeze;
    }
  }

  // إنشاء طلب المرتجع
  const returnId = generateId();
  const itemsPayload = items.map((item: any) => ({
    type: item.type,
    qty: Number(item.qty),
    price: Number(item.price) || 0,
    condition: item.condition || 'new',
    company_id: item.company_id || '',
    company_name: item.company_name || '',
    total_value: Number(item.qty) * (Number(item.price) || 0),
  }));

  const { error } = await supabase.from('return_requests').insert({
    id: returnId,
    supervisor_id: supId,
    admin_id: adminId,
    status: 'pending',
    items: itemsPayload,
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  if (error) return res.json({ success: false, message: 'خطأ في قاعدة البيانات: ' + error.message });

  // إرسال إشعار للمدير
  const { data: adminData } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'manager')
    .eq('admin_id', adminId)
    .limit(1);

  if (adminData && adminData.length > 0) {
    await supabase.from('notifications').insert({
      id: generateId(),
      target_id: adminData[0].id,
      type: 'supervisor_return_request',
      ref_id: returnId,
      from_id: session.id,
      status: 'pending',
      date: nowIso(),
      note: `طلب مرتجع مخزون من المشرف ${session.name}`,
      admin_id: adminId,
    });
  }

  return res.json({ success: true, id: returnId });
}
