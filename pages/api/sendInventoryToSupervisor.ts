import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';
import { getActiveTypes } from '../../lib/equipmentTypes';
import { insertMovements, buildAuditEntry } from '../../lib/inventoryEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const { supervisorId, companyId, items } = req.body;

  if (!supervisorId) return res.json({ success: false, message: 'يجب تحديد المشرف' });
  if (!companyId || companyId.trim() === '') return res.json({ success: false, message: 'يجب تحديد الشركة' });
  if (!items || typeof items !== 'object') return res.json({ success: false, message: 'بيانات المعدات غير صحيحة' });

  const selectedCompanyId = companyId.trim();

  const { data: supData } = await supabase.from('users').select('name').eq('id', supervisorId).limit(1);
  const supervisorName = supData?.[0]?.name || supervisorId;

  const { data: companyData } = await supabase.from('companies').select('name').eq('id', selectedCompanyId).limit(1);
  const companyName = companyData?.[0]?.name || '';

  const types = await getActiveTypes(adminId);

  const { data: managerInv } = await supabase
    .from('inventory')
    .select('*')
    .eq('admin_id', adminId)
    .eq('company_id', selectedCompanyId);

  const allManagerInv = managerInv || [];

  for (const t of types) {
    const itemData = items[t];
    if (!itemData) continue;
    const qty = Number(itemData.qty) || 0;
    if (qty <= 0) continue;

    const inItems = allManagerInv.filter((i: any) => i.type === t && i.direction === 'manager_in');

    if (itemData.selectedPrice !== undefined) {
      const selectedPrice = Number(itemData.selectedPrice);
      const selectedCondition = itemData.selectedCondition || '';

      const matchBatches = inItems.filter((i: any) =>
        Number(i.price) === selectedPrice &&
        (!selectedCondition || (i.condition || 'new') === selectedCondition)
      );
      const batchIds = matchBatches.map((i: any) => i.batch_id);
      const inQ  = matchBatches.reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const outQ = allManagerInv.filter((i: any) =>
        i.type === t && i.direction === 'manager_out_to_sup' && batchIds.includes(i.batch_id)
      ).reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const retQ = allManagerInv.filter((i: any) =>
        i.type === t && i.direction === 'return_to_manager' && batchIds.includes(i.batch_id)
      ).reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const compRetQ = allManagerInv.filter((i: any) =>
        i.type === t && i.direction === 'company_return' && batchIds.includes(i.batch_id)
      ).reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);

      if (qty > inQ - outQ + retQ - compRetQ)
        return res.json({ success: false, message: `لا يوجد مخزون كافٍ من ${t} بالسعر المحدد للشركة المحددة` });
    } else {
      const inQty  = inItems.reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const outQty = allManagerInv.filter((i: any) => i.type === t && i.direction === 'manager_out_to_sup')
        .reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const retQ   = allManagerInv.filter((i: any) => i.type === t && i.direction === 'return_to_manager')
        .reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const compRetQ2 = allManagerInv.filter((i: any) => i.type === t && i.direction === 'company_return')
        .reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      if (qty > inQty - outQty + retQ - compRetQ2)
        return res.json({ success: false, message: `لا يوجد مخزون كافٍ من ${t} للشركة المحددة` });
    }
  }

  const batchId = generateId();
  const movementRows: any[] = [];
  const legacyInvRows: any[] = [];
  const legacyLogRows: any[] = [];
  const auditRows: any[] = [];

  for (const t of types) {
    const itemData = items[t];
    if (!itemData) continue;
    const qty = Number(itemData.qty) || 0;
    if (qty <= 0) continue;

    const inItems = allManagerInv.filter((i: any) => i.type === t && i.direction === 'manager_in');

    let price = 0;
    let pm = 0;
    let pt = 'percent';
    let itemCondition = 'new';

    if (itemData.selectedPrice !== undefined) {
      price = Number(itemData.selectedPrice);
      const selectedCondition = itemData.selectedCondition || '';
      const matchBatch = inItems.find((i: any) =>
        Number(i.price) === price &&
        (!selectedCondition || (i.condition || 'new') === selectedCondition)
      );
      pm = matchBatch ? Number(matchBatch.profit_margin) : 0;
      pt = matchBatch ? matchBatch.profit_type : 'percent';
      itemCondition = matchBatch ? (matchBatch.condition || 'new') : (selectedCondition || 'new');
    } else {
      const lastBatch = inItems.slice(-1)[0];
      price = lastBatch ? Number(lastBatch.price) : 0;
      pm = lastBatch ? Number(lastBatch.profit_margin) : 0;
      pt = lastBatch ? lastBatch.profit_type : 'percent';
      itemCondition = lastBatch ? (lastBatch.condition || 'new') : 'new';
      price = pt === 'percent' ? price + (price * pm / 100) : price + pm;
    }

    movementRows.push({
      admin_id: adminId,
      supervisor_id: 'manager',
      pilot_id: '',
      company_id: selectedCompanyId,
      type: t,
      direction: 'manager_out_to_sup',
      qty,
      price,
      condition: itemCondition,
      ref_id: '',
      batch_id: batchId,
      note: `إرسال مخزون للمشرف ${supervisorName}`,
      reversed_by: '',
      reversal_of: '',
      created_by: session.name,
    });
    movementRows.push({
      admin_id: adminId,
      supervisor_id: supervisorId,
      pilot_id: '',
      company_id: selectedCompanyId,
      type: t,
      direction: 'sup_in_from_manager',
      qty,
      price,
      condition: itemCondition,
      ref_id: '',
      batch_id: batchId,
      note: `استلام مخزون من المدير`,
      reversed_by: '',
      reversal_of: '',
      created_by: session.name,
    });

    legacyInvRows.push(
      { id: generateId(), admin_id: adminId, supervisor_id: supervisorId, amount: 0, date: nowIso(), type: t, qty, price, profit_margin: 0, profit_type: 'fixed', direction: 'manager_out_to_sup', batch_id: batchId, company_id: selectedCompanyId, condition: itemCondition },
      { id: generateId(), admin_id: adminId, supervisor_id: supervisorId, amount: 0, date: nowIso(), type: t, qty, price, profit_margin: 0, profit_type: 'fixed', direction: 'sup_in', batch_id: batchId, company_id: selectedCompanyId, condition: itemCondition }
    );
    legacyLogRows.push({
      id: generateId(), admin_id: adminId, action: 'send', company_id: selectedCompanyId, company_name: companyName,
      type: t, qty, price, supervisor_id: supervisorId, supervisor_name: supervisorName,
      batch_id: batchId, performed_by: session.name,
      note: `إرسال مخزون للمشرف ${supervisorName}`, date: nowIso(),
    });
    auditRows.push(buildAuditEntry({
      admin_id: adminId, action: 'send_to_supervisor', entity_type: 'manager_stock', entity_id: batchId,
      batch_id: batchId, type: t, qty, price, company_id: selectedCompanyId, company_name: companyName,
      supervisor_id: supervisorId, supervisor_name: supervisorName, performed_by: session.name,
      note: `إرسال ${qty} ${t} للمشرف ${supervisorName}`,
    }));
  }

  if (movementRows.length === 0)
    return res.json({ success: false, message: 'لم يتم تحديد أي كمية للإرسال' });

  const result = await insertMovements(movementRows, auditRows);
  if (!result.success) return res.json(result);

  if (legacyInvRows.length) {
    await supabase.from('inventory').insert(legacyInvRows)
      .then(({ error }) => { if (error) console.error('legacy inv:', error.message); });
  }
  if (legacyLogRows.length) {
    await supabase.from('inventory_log').insert(legacyLogRows)
      .then(({ error }) => { if (error) console.error('legacy log:', error.message); });
  }

  return res.json({ success: true, batchId });
}