import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllTypes } from '../../lib/equipmentTypes';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

const CONDITIONS = ['new', 'good', 'damaged'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const companyId = req.query.companyId as string || '';

  const { data: companies } = await supabase.from('companies').select('*').eq('active', true).eq('admin_id', adminId);

  let invQuery = supabase.from('inventory').select('*').eq('admin_id', adminId);
  if (companyId) invQuery = invQuery.eq('company_id', companyId);
  const { data: inv } = await invQuery;

  const types = await getAllTypes(adminId);

  // نضيف أي نوع موجود في سجلات inventory فقط لو عنده كمية فعلية (وليس مجرد سجل تاريخي بصفر)
  const invTypesWithQty = [...new Set(
    (inv || [])
      .filter((i: any) => (Number(i.qty) || 0) > 0)
      .map((i: any) => i.type)
      .filter(Boolean)
  )];
  invTypesWithQty.forEach((k: string) => { if (!types.includes(k)) types.push(k); });

  const result: Record<string, any> = {};

  for (const company of (companies || [])) {
    const compInv = (inv || []).filter(i => i.company_id === company.id);
    const summary: Record<string, any> = {};

    types.forEach(t => {
      const inItems      = compInv.filter(i => i.type === t && i.direction === 'manager_in');
      const outItems     = compInv.filter(i => i.type === t && i.direction === 'manager_out_to_sup');
      const retItems     = compInv.filter(i => i.type === t && i.direction === 'return_to_manager');
      const compRetItems = compInv.filter(i => i.type === t && i.direction === 'company_return');

      const inQty    = inItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
      const outQty   = outItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
      const returnQ  = retItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
      const compRetQ = compRetItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
      const remaining = inQty - outQty + returnQ - compRetQ;
      const lastBatch = inItems.slice(-1)[0];

      // حساب الحالة من كل المعدات المتوفرة (إضافات + مرتجعات)
      const conditionRaw: Record<string, number> = { new: 0, good: 0, damaged: 0 };
      [...inItems, ...retItems].forEach(i => {
        const c = (i.condition || 'new') as string;
        if (conditionRaw[c] !== undefined) conditionRaw[c] += Number(i.qty) || 0;
        else conditionRaw['new'] += Number(i.qty) || 0;
      });
      const totalIn = inQty + returnQ;
      const conditionCounts: Record<string, number> = { new: 0, good: 0, damaged: 0 };
      if (totalIn > 0 && remaining > 0) {
        CONDITIONS.forEach(c => {
          conditionCounts[c] = Math.round((conditionRaw[c] / totalIn) * remaining);
        });
        const sumCounts = conditionCounts.new + conditionCounts.good + conditionCounts.damaged;
        conditionCounts.new += remaining - sumCounts;
      }

      // ---- حساب priceBatches بحيث يكون مجموع remaining = remaining الكلي على الكارت ----
      // الخطوة 1: تجميع الكميات الواردة لكل (price, condition)
      const priceMap: Record<string, { price: number; condition: string; inQty: number; retQty: number }> = {};

      inItems.forEach((i: any) => {
        const key = `${Number(i.price)}__${i.condition || 'new'}`;
        if (!priceMap[key]) priceMap[key] = { price: Number(i.price), condition: i.condition || 'new', inQty: 0, retQty: 0 };
        priceMap[key].inQty += Number(i.qty) || 0;
      });

      retItems.forEach((i: any) => {
        const key = `${Number(i.price)}__${i.condition || 'new'}`;
        if (!priceMap[key]) priceMap[key] = { price: Number(i.price), condition: i.condition || 'new', inQty: 0, retQty: 0 };
        priceMap[key].retQty += Number(i.qty) || 0;
      });

      // الخطوة 2: الكمية الكلية الداخلة لكل batch = inQty + retQty
      const batches = Object.values(priceMap);
      const totalSource = batches.reduce((s, b) => s + b.inQty + b.retQty, 0);

      // الخطوة 3: توزيع الـ remaining الكلي على الـ batches بالنسبة المئوية
      let priceBatches: any[] = [];
      if (totalSource > 0 && remaining > 0) {
        let distributed = 0;
        priceBatches = batches.map((b, idx) => {
          const ratio = (b.inQty + b.retQty) / totalSource;
          const isLast = idx === batches.length - 1;
          const batchRemaining = isLast ? remaining - distributed : Math.round(ratio * remaining);
          distributed += batchRemaining;
          return {
            price: b.price,
            condition: b.condition,
            remaining: batchRemaining,
            sent: outQty, // إجمالي صادر (للمرجعية)
          };
        }).filter(p => p.remaining > 0);
      } else if (remaining > 0 && batches.length > 0) {
        // إذا لم يكن هناك مصدر واضح، خصص الكل لأول batch
        const b = batches[0];
        priceBatches = [{ price: b.price, condition: b.condition, remaining, sent: outQty }];
      }

      summary[t] = {
        total: inQty,
        sent: outQty,
        returned: returnQ,
        companyReturned: compRetQ,
        remaining,
        lastPrice: lastBatch ? lastBatch.price : 0,
        priceBatches,
        conditionCounts,
      };
    });

    result[company.id] = { companyId: company.id, companyName: company.name, inventory: summary };
  }

  return res.json({ success: true, data: result });
}
