import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';
import { getManagerAvailable, insertMovements, buildAuditEntry } from '../../lib/inventoryEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const { requestId, status, amount, qty, selectedPrice, selectedCompanyId } = req.body;

  if (!requestId) return res.json({ success: false, message: 'معرف الطلب مطلوب' });
  if (!['approved', 'rejected'].includes(status)) return res.json({ success: false, message: 'الحالة غير صحيحة' });

  const { data } = await supabase.from('requests').select('*').eq('id', requestId).limit(1);
  const item = data?.[0];
  if (!item) return res.json({ success: false, message: 'الطلب غير موجود' });
  if (item.admin_id && item.admin_id !== adminId) return res.json({ success: false, message: 'غير مصرح' });
  if (item.status !== 'pending') return res.json({ success: false, message: 'الطلب تمت معالجته مسبقاً' });

  const originalAmount = Number(item.amount) || 0;
  const finalAmount    = amount !== undefined ? Number(amount) : originalAmount;
  const finalQty       = qty !== undefined ? Number(qty) : Number(item.qty);

  if (status !== 'approved') {
    await supabase.from('requests').update({ amount: finalAmount, qty: finalQty, status }).eq('id', requestId);
    return res.json({ success: true });
  }

  // Approved: execute inventory movement
  if (item.type === 'funding') {
    const { data: balData } = await supabase.from('balance').select('*').eq('admin_id', adminId);
    const inT  = (balData || []).filter((b: any) => b.direction === 'in').reduce((s: number, b: any) => s + (Number(b.amount) || 0), 0);
    const outT = (balData || []).filter((b: any) => b.direction === 'out').reduce((s: number, b: any) => s + (Number(b.amount) || 0), 0);
    if (inT - outT < finalAmount)
      return res.json({ success: false, message: `الرصيد غير كافٍ` });

    await supabase.from('funding').insert({
      id: generateId(), supervisor_id: item.supervisor_id, amount: finalAmount, date: nowIso(),
      sent_by: session.name, note: 'طلب مشرف مُعتمد', is_request: true,
      request_id: requestId, original_amount: originalAmount, admin_id: adminId,
    });
    await supabase.from('balance').insert({
      id: generateId(), amount: finalAmount, date: nowIso(), note: 'تمويل مشرف',
      direction: 'out', created_by: session.name, admin_id: adminId,
    });

    await supabase.from('requests').update({ amount: finalAmount, qty: finalQty, status }).eq('id', requestId);

  } else {
    // Equipment request: use company_id from the original request — NEVER inherit from latest batch
    const requestCompanyId = (item.company_id && item.company_id.trim() !== '') ? item.company_id.trim() : '';

    let invQuery = supabase.from('inventory').select('*').eq('admin_id', adminId).eq('type', item.type);
    if (requestCompanyId) invQuery = invQuery.eq('company_id', requestCompanyId);
    const { data: managerInv } = await invQuery;

    let price = 0;
    let companyId = requestCompanyId;
    let pm = 0;
    let pt = 'percent';
    let itemCondition = 'new';

    if (selectedPrice !== undefined) {
      price = Number(selectedPrice);
      companyId = requestCompanyId || selectedCompanyId || '';
      const inItems = (managerInv || []).filter((i: any) => i.direction === 'manager_in');
      const matchBatches = inItems.filter((i: any) =>
        Number(i.price) === price && i.company_id === companyId
      );
      const batchIds = matchBatches.map((i: any) => i.batch_id);
      const inQ  = matchBatches.reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const outQ = (managerInv || []).filter((i: any) => i.direction === 'manager_out_to_sup' && batchIds.includes(i.batch_id)).reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const retQ = (managerInv || []).filter((i: any) => i.direction === 'return_to_manager' && batchIds.includes(i.batch_id)).reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const compRetQ = (managerInv || []).filter((i: any) => i.direction === 'company_return' && batchIds.includes(i.batch_id)).reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      if (finalQty > inQ - outQ + retQ - compRetQ)
        return res.json({ success: false, message: 'المخزون غير كافٍ بالسعر المحدد' });
      const mb = matchBatches[0];
      pm = mb ? Number(mb.profit_margin) : 0;
      pt = mb ? mb.profit_type : 'percent';
      itemCondition = mb ? (mb.condition || 'new') : 'new';
    } else {
      const inItems = (managerInv || []).filter((i: any) => i.direction === 'manager_in');
      const inQty  = inItems.reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const outQty = (managerInv || []).filter((i: any) => i.direction === 'manager_out_to_sup').reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const retQ   = (managerInv || []).filter((i: any) => i.direction === 'return_to_manager').reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      const compRetQ2 = (managerInv || []).filter((i: any) => i.direction === 'company_return').reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);
      if (finalQty > inQty - outQty + retQ - compRetQ2)
        return res.json({ success: false, message: 'المخزون غير كافٍ' });

      const lastBatch = inItems.slice(-1)[0];
      if (!companyId && lastBatch) companyId = lastBatch.company_id || '';
      price = lastBatch ? Number(lastBatch.price) : 0;
      pm = lastBatch ? Number(lastBatch.profit_margin) : 0;
      pt = lastBatch ? lastBatch.profit_type : 'percent';
      itemCondition = lastBatch ? (lastBatch.condition || 'new') : 'new';
      price = pt === 'percent' ? price + (price * pm / 100) : price + pm;
    }

    const { data: supData } = await supabase.from('users').select('name').eq('id', item.supervisor_id).limit(1);
    const supervisorName = supData?.[0]?.name || item.supervisor_id;

    let companyName = '';
    if (companyId) {
      const { data: cData } = await supabase.from('companies').select('name').eq('id', companyId).limit(1);
      companyName = cData?.[0]?.name || '';
    }

    const batchId = generateId();

    const movResult = await insertMovements([
      {
        admin_id: adminId, supervisor_id: 'manager', pilot_id: '', company_id: companyId,
        type: item.type, direction: 'manager_out_to_sup', qty: finalQty, price,
        condition: itemCondition, ref_id: requestId, batch_id: batchId,
        note: `قبول طلب مخزون من المشرف ${supervisorName}`,
        reversed_by: '', reversal_of: '', created_by: session.name,
      },
      {
        admin_id: adminId, supervisor_id: item.supervisor_id, pilot_id: '', company_id: companyId,
        type: item.type, direction: 'sup_in_from_manager', qty: finalQty, price,
        condition: itemCondition, ref_id: requestId, batch_id: batchId,
        note: `استلام مخزون بعد قبول طلب`,
        reversed_by: '', reversal_of: '', created_by: session.name,
      },
    ], [
      buildAuditEntry({
        admin_id: adminId, action: 'approve_request', entity_type: 'equipment_request', entity_id: requestId,
        batch_id: batchId, type: item.type, qty: finalQty, price,
        company_id: companyId, company_name: companyName,
        supervisor_id: item.supervisor_id, supervisor_name: supervisorName,
        performed_by: session.name, note: `قبول طلب مخزون`,
      }),
    ]);

    if (!movResult.success) return res.json(movResult);

    await supabase.from('inventory').insert([
      {
        id: generateId(), admin_id: adminId, supervisor_id: item.supervisor_id, amount: 0, date: nowIso(),
        type: item.type, qty: finalQty, price, profit_margin: pm, profit_type: pt,
        direction: 'manager_out_to_sup', batch_id: batchId, company_id: companyId,
      },
      {
        id: generateId(), admin_id: adminId, supervisor_id: item.supervisor_id, amount: 0, date: nowIso(),
        type: item.type, qty: finalQty, price, profit_margin: pm, profit_type: pt,
        direction: 'sup_in', batch_id: batchId, company_id: companyId,
      },
    ]).then(({ error }) => { if (error) console.error('legacy inv respond:', error.message); });

    await supabase.from('inventory_log').insert({
      id: generateId(), action: 'accept_request', company_id: companyId, company_name: companyName,
      type: item.type, qty: finalQty, price, supervisor_id: item.supervisor_id,
      supervisor_name: supervisorName, batch_id: batchId, performed_by: session.name,
      note: `قبول طلب مخزون من المشرف ${supervisorName}`, date: nowIso(),
    }).then(({ error }) => { if (error) console.error('legacy log respond:', error.message); });

    await supabase.from('requests').update({ amount: finalAmount, qty: finalQty, status }).eq('id', requestId);
  }

  return res.json({ success: true });
}