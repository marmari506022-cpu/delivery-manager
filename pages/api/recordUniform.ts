import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';
import { insertMovements, buildAuditEntry } from '../../lib/inventoryEngine';
import { computeSupervisorCompanyInventory } from '../../lib/inventoryCalc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const session = getSession(req);
    if (!session) return res.json({ success: false, message: 'غير مصرح' });

    const { pilotId, type, qty, price, condition, companyId } = req.body;
    if (!pilotId) return res.json({ success: false, message: 'لم يتم تحديد الطيار' });
    if (!type)    return res.json({ success: false, message: 'اختر نوع المعدة' });
    if (!companyId || companyId.trim() === '') return res.json({ success: false, message: 'يجب تحديد الشركة' });
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) return res.json({ success: false, message: 'أدخل الكمية' });

    const adminId = getAdminId(session);
    const supId = session.id;
    const companyIdFinal = companyId.trim();

    // مصدر الحقيقة الوحيد للمتاح — نفس الحساب اللي بيعتمد عليه الفرونت إند
    // في عرض "متاح X" على كارت المخزن (كان بيتحسب هنا من جدول inventory_movements
    // بشكل منفصل ومتوازي مع الحساب ده، وده كان بيسبب تعارض بين الرقمين
    // ويرفض التسليم برسالة "متاح 0" رغم إن الرقم الحقيقي متاح فعلاً).
    const companyInv = await computeSupervisorCompanyInventory(supId, [type]);
    const entry = companyInv.find((c: any) => c.companyId === companyIdFinal);
    const effectiveAvail = Math.max(0, entry?.inventory?.[type]?.remaining || 0);

    if (qtyNum > effectiveAvail) {
      const frozenQty = entry?.inventory?.[type]?.frozenQty || 0;
      return res.json({
        success: false,
        message: `المتاح فقط ${effectiveAvail} قطعة لهذه الشركة${frozenQty > 0 ? ` (${frozenQty} مجمدة في طلب إرجاع معلق)` : ''}`,
      });
    }

    let priceFinal = price !== undefined && price !== null && price !== '' ? Number(price) : undefined;
    let conditionFinal = condition && ['new', 'good', 'damaged'].includes(condition) ? condition : undefined;

    // فحص إضافي وأهم: الرقم الإجمالي (effectiveAvail) بيجمع كل دفعات الأسعار/الحالات
    // مع بعض، فمينفعش نكتفي بيه — لازم نتأكد إن الكمية المطلوبة متاحة فعلاً في
    // نفس دفعة السعر/الحالة اللي المشرف اختارها بالظبط (وإلا هنسلّم من دفعة
    // تانية أو نخلي الرصيد يعدي بالسالب لدفعة معينة رغم إن "الرقم الكبير" سليم).
    if (priceFinal !== undefined) {
      const batches: any[] = entry?.inventory?.[type]?.priceBatches || [];
      const matching = batches.filter(b =>
        Number(b.price) === priceFinal && (conditionFinal ? b.condition === conditionFinal : true)
      );
      const batchAvail = matching.reduce((s, b) => s + (Number(b.remaining) || 0), 0);
      if (matching.length === 0) {
        return res.json({ success: false, message: 'دفعة السعر المختارة لم تعد متاحة، من فضلك أعد فتح النافذة واختر مرة أخرى' });
      }
      if (qtyNum > batchAvail) {
        return res.json({
          success: false,
          message: `المتاح فقط ${batchAvail} قطعة بسعر ${priceFinal} ج لهذه الدفعة (رغم أن إجمالي المتاح للنوع ${effectiveAvail})`,
        });
      }
      if (!conditionFinal && matching.length > 0) conditionFinal = matching[0].condition;
    }

    if (priceFinal === undefined) {
      const { data: movBatch } = await supabase
        .from('inventory_movements')
        .select('price')
        .eq('supervisor_id', supId)
        .eq('type', type)
        .eq('company_id', companyIdFinal)
        .eq('direction', 'sup_in_from_manager')
        .eq('reversal_of', '')
        .order('created_at', { ascending: false })
        .limit(1);
      if (movBatch?.[0]?.price !== undefined) {
        priceFinal = Number(movBatch[0].price) || 0;
      } else {
        const { data: invBatch } = await supabase.from('inventory')
          .select('price')
          .eq('supervisor_id', supId)
          .eq('type', type)
          .eq('company_id', companyIdFinal)
          .eq('direction', 'sup_in')
          .order('date', { ascending: false })
          .limit(1);
        priceFinal = Number(invBatch?.[0]?.price) || 0;
      }
    }

    let companyName = '';
    if (companyIdFinal) {
      const { data: comp } = await supabase.from('companies').select('name').eq('id', companyIdFinal).limit(1);
      companyName = comp?.[0]?.name || '';
    }

    const uid = generateId();
    const batchId = generateId();

    const { error: uniErr } = await supabase.from('uniforms').insert({
      id: uid,
      pilot_id: pilotId,
      type,
      qty: qtyNum,
      date: nowIso(),
      price: priceFinal || 0,
      settled: false,
      supervisor_id: supId,
      condition: conditionFinal || 'new',
      transferred_from: '',
      admin_id: adminId,
      company_id: companyIdFinal,
      company_name: companyName,
      movement_id: batchId,
    });
    if (uniErr) return res.json({ success: false, message: 'خطأ في تسجيل المعدة: ' + uniErr.message });

    const movResult = await insertMovements([{
      admin_id: adminId,
      supervisor_id: supId,
      pilot_id: pilotId,
      company_id: companyIdFinal,
      type,
      direction: 'sup_out_to_pilot',
      qty: qtyNum,
      price: priceFinal || 0,
      condition: conditionFinal || 'new',
      ref_id: uid,
      batch_id: batchId,
      note: `تسليم معدة للطيار`,
      reversed_by: '',
      reversal_of: '',
      created_by: session.name,
    }], [
      buildAuditEntry({
        admin_id: adminId, action: 'issue_to_pilot', entity_type: 'uniform_issue', entity_id: uid,
        batch_id: batchId, type, qty: qtyNum, price: priceFinal || 0,
        company_id: companyIdFinal, company_name: companyName,
        supervisor_id: supId, supervisor_name: session.name,
        pilot_id: pilotId, performed_by: session.name, note: `تسليم ${qtyNum} ${type}`,
      }),
    ]);

    if (!movResult.success) {
      await supabase.from('uniforms').delete().eq('id', uid);
      return res.json(movResult);
    }

    await supabase.from('inventory').insert({
      id: generateId(),
      supervisor_id: supId,
      amount: 0,
      date: nowIso(),
      type,
      qty: qtyNum,
      price: priceFinal || 0,
      profit_margin: 0,
      profit_type: 'fixed',
      direction: 'sup_out_to_pilot',
      batch_id: uid,
      admin_id: adminId,
      company_id: companyIdFinal,
    }).then(({ error }) => { if (error) console.error('legacy inv out:', error.message); });

    return res.json({ success: true, id: uid });
  } catch (e: any) {
    return res.json({ success: false, message: 'خطأ غير متوقع: ' + (e?.message || String(e)) });
  }
}