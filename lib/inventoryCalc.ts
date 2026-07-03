import { supabase } from './supabase';
import { PriceBucket, CompanyTypeInventory, CompanyInventoryEntry, aggregateCompanyInventory } from './inventoryAggregate';

// مصدر الحقيقة الوحيد لحساب مخزون المشرف مفصّلاً على مستوى الشركات.
// أي طرف يحتاج "المخزن الإجمالي" لمشرف لازم يحسبه بتجميع (sum) نتيجة هذه
// الدالة على كل الشركات، بدل إعادة حساب منطق مستقل من جدول inventory مباشرة.
// هذا يضمن تطابق "مخزن الشركات" و"المخزن الإجمالي" دائماً تلقائياً.

// إعادة تصدير الأنواع والدالة النقية (بدون supabase) حتى يستمر عمل أي كود
// قديم يستورد من هذا الملف، مع إمكانية استيرادها من lib/inventoryAggregate
// مباشرة في كود الواجهة (Client-side) بدون كسر التطبيق.
export type { PriceBucket, CompanyTypeInventory, CompanyInventoryEntry };
export { aggregateCompanyInventory };

export async function computeSupervisorCompanyInventory(
  supId: string,
  types: string[]
): Promise<CompanyInventoryEntry[]> {
  const [invR, uniR, compR, supUserR] = await Promise.all([
    supabase.from('inventory').select('*').eq('supervisor_id', supId),
    supabase.from('uniforms').select('pilot_id, type, qty, company_id, price, condition').eq('supervisor_id', supId),
    supabase.from('companies').select('id, name'),
    supabase.from('users').select('company_id').eq('id', supId).limit(1),
  ]);

  const inv = invR.data || [];
  const uniforms = uniR.data || [];
  const companiesList = compR.data || [];

  const companyNameMap: Record<string, string> = {};
  companiesList.forEach((c: any) => { companyNameMap[c.id] = c.name; });

  type Bucket = Record<string, {
    total: number; distributed: number; returned: number; totalValue: number;
    priceMap: Record<string, PriceBucket>;
    frozenQty: number;
    conditionRaw: Record<string, number>;
  }>;
  const byCompany: Record<string, Bucket> = {};
  const CONDITIONS = ['new', 'good', 'damaged'] as const;

  function ensure(cid: string) {
    if (!byCompany[cid]) {
      byCompany[cid] = {};
    }
    types.forEach(t => {
      if (!byCompany[cid][t]) {
        byCompany[cid][t] = { total: 0, distributed: 0, returned: 0, totalValue: 0, priceMap: {}, frozenQty: 0, conditionRaw: { new: 0, good: 0, damaged: 0 } };
      }
    });
  }

  // إجمالي المستلم لكل شركة (من دفعات "sup_in" المرتبطة بشركة)
  inv.filter((i: any) => i.direction === 'sup_in').forEach((i: any) => {
    const cid = i.company_id || '';
    ensure(cid);
    if (byCompany[cid][i.type]) {
      const qty = Number(i.qty) || 0;
      const price = Number(i.price) || 0;
      const condition = (i.condition as string) || 'new';
      byCompany[cid][i.type].total += qty;
      byCompany[cid][i.type].totalValue += qty * price;
      byCompany[cid][i.type].frozenQty += Number(i.frozen_qty) || 0;
      byCompany[cid][i.type].conditionRaw[condition in byCompany[cid][i.type].conditionRaw ? condition : 'new'] += qty;
      const key = `${price}_${condition}`;
      const priceMap = byCompany[cid][i.type].priceMap;
      if (!priceMap[key]) {
        priceMap[key] = { price, remaining: 0, total: 0, condition, company_id: cid, company_name: cid ? (companyNameMap[cid] || '') : '' };
      }
      priceMap[key].total += qty;
      priceMap[key].remaining += qty;
    }
  });

  // الموزّع على الطيارين، حسب الشركة المختارة فعلياً وقت التسليم (محفوظة في uniforms.company_id)
  // كل سجل uniforms يحمل السعر والحالة الفعليين الذين سُلّمت بهما القطعة، فنخصمه
  // من نفس دفعة السعر/الحالة بالضبط (وليس تقريباً بالأرخص أولاً) لتطابق الأرقام.
  uniforms.forEach((u: any) => {
    const cid = u.company_id || '';
    ensure(cid);
    if (byCompany[cid][u.type]) {
      const qty = Number(u.qty) || 0;
      byCompany[cid][u.type].distributed += qty;

      const price = Number(u.price) || 0;
      const condition = (u.condition as string) || 'new';
      const key = `${price}_${condition}`;
      const priceMap = byCompany[cid][u.type].priceMap;
      if (!priceMap[key]) {
        priceMap[key] = { price, remaining: 0, total: 0, condition, company_id: cid, company_name: cid ? (companyNameMap[cid] || '') : '' };
      }
      priceMap[key].remaining -= qty;
    }
  });

  // المرتجع من الطيارين (سجلات قديمة من نظام سابق — لم يعد الكود الحالي ينشئها،
  // لأن مرتجع الطيار الآن يُنفَّذ بتقليل uniforms.qty مباشرة وهذا ما يُحتسب فعلاً
  // ضمن "الموزّع" تلقائياً). نحتفظ بالقيمة فقط للعرض التاريخي دون التأثير على
  // أرقام الأسعار أو الرقم الكبير، لتجنّب احتساب مزدوج لهذه السجلات القديمة.
  inv.filter((i: any) => i.direction === 'return_to_sup').forEach((i: any) => {
    const cid = i.company_id || '';
    ensure(cid);
    if (byCompany[cid][i.type]) {
      const qty = Number(i.qty) || 0;
      byCompany[cid][i.type].returned += qty;
    }
  });

  // المرتجع للمدير (من نظام مرتجع المشرف) — يُخصم من "المستلم" مباشرة، وليس من "الموزع"
  inv.filter((i: any) => i.direction === 'sup_out_to_manager').forEach((i: any) => {
    const cid = i.company_id || '';
    ensure(cid);
    if (byCompany[cid][i.type]) {
      const qty = Number(i.qty) || 0;
      const price = Number(i.price) || 0;
      const condition = (i.condition as string) || 'new';
      byCompany[cid][i.type].total -= qty;
      byCompany[cid][i.type].totalValue -= qty * price;
      const key = `${price}_${condition}`;
      const priceMap = byCompany[cid][i.type].priceMap;
      if (priceMap[key]) {
        priceMap[key].total -= qty;
        priceMap[key].remaining -= qty;
      }
    }
  });

  // التأكد من ظهور كل الشركات المرتبطة بالمشرف حتى لو لسه مفيش حركة عليها
  const assignedCompanyIds = ((supUserR.data?.[0] as any)?.company_id || '')
    .split(',').map((s: string) => s.trim()).filter(Boolean);
  assignedCompanyIds.forEach((cid: string) => ensure(cid));

  // ملاحظة: تم إلغاء الخصم التقريبي (الأرخص أولاً) لأن الخصم الآن يتم بدقة
  // من نفس دفعة السعر/الحالة الفعلية لكل قطعة عند توزيعها (انظر أعلاه).

  // ملاحظة: لا نطرح المجمد (frozen_qty) من priceMap هنا عمداً — حتى يبقى
  // مجموع الكميات المتاحة لكل سعر مطابقاً تماماً للرقم الكبير على كارت المعدة
  // (remaining = total - distributed). المجمد يُعرض ويُستخدم بشكل منفصل (frozenQty)
  // عند فتح نافذة طلب المرتجع للمدير.

  const result: CompanyInventoryEntry[] = Object.keys(byCompany)
    .map(cid => ({
      companyId: cid,
      companyName: cid ? (companyNameMap[cid] || 'شركة محذوفة') : 'غير مرتبط بشركة',
      inventory: Object.fromEntries(types.map(t => {
        const d = byCompany[cid][t];
        const priceBatches = Object.values(d.priceMap).filter(p => p.total > 0);
        const remaining = d.total - d.distributed;
        const totalIn = d.total;

        // تحقق: مجموع الكميات المتاحة لكل سعر يجب أن يطابق الرقم الكبير (remaining) دائماً
        const priceBatchesSum = priceBatches.reduce((s, p) => s + (Number(p.remaining) || 0), 0);
        const diff = remaining - priceBatchesSum;
        let mismatchWarning: string | undefined;
        if (diff !== 0) {
          mismatchWarning =
            `⚠️ خلل في الأرقام: مجموع الكميات المتاحة للأسعار = ${priceBatchesSum} بينما الكمية المتاحة الفعلية (الرقم الكبير) = ${remaining} ` +
            `(مستلم ${d.total} - موزع ${d.distributed}). الفرق = ${diff}.`;
          console.warn(
            `[inventoryCalc][عدم تطابق] المشرف=${supId} الشركة=${cid || 'بدون شركة'} المعدة=${t} | ` +
            `مجموع الأسعار المعروضة=${priceBatchesSum} لكن الرقم الكبير(المتاح)=${remaining} ` +
            `(مستلم=${d.total} - موزع=${d.distributed}) | الفرق=${diff} | ` +
            `دفعات الأسعار الحالية: ${JSON.stringify(priceBatches.map(p => ({ price: p.price, condition: p.condition, total: p.total, remaining: p.remaining })))}`
          );
        }


        const conditionBreakdown: Record<string, number> = { new: 0, good: 0, damaged: 0 };
        if (totalIn > 0 && remaining > 0) {
          CONDITIONS.forEach(c => {
            conditionBreakdown[c] = Math.round((d.conditionRaw[c] / totalIn) * remaining);
          });
          const sumCounts = conditionBreakdown.new + conditionBreakdown.good + conditionBreakdown.damaged;
          conditionBreakdown.new += remaining - sumCounts;
        }

        // إجمالي القيمة = مجموع (السعر × الكمية المتاحة) لكل دفعة سعر معروضة على الكارت،
        // بدلاً من رقم تراكمي منفصل، حتى يتطابق دائماً مع مجموع "إجمالي القيمة" الظاهر
        // أمام كل سعر داخل الكارت.
        const totalValue = priceBatches.reduce((s, p) => s + (Number(p.remaining) || 0) * (Number(p.price) || 0), 0);

        return [t, {
          total: d.total, distributed: d.distributed, returned: d.returned, remaining,
          totalValue, priceBatches, frozenQty: d.frozenQty, conditionBreakdown,
          mismatchWarning,
        }];
      })) as Record<string, CompanyTypeInventory>,
    }))
    .sort((a, b) => (a.companyId === '' ? 1 : b.companyId === '' ? -1 : a.companyName.localeCompare(b.companyName, 'ar')));

  return result;
}

