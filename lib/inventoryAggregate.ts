// ملف "نقي" بدون أي استيراد لـ supabase — مسموح باستيراده من الكود الخاص
// بالواجهة (Client-side) بدون كسر التطبيق (supabase client يحتاج مفاتيح سيرفر فقط).
// يحتوي على الأنواع المشتركة ودالة التجميع aggregateCompanyInventory التي تُستخدم
// في السيرفر (lib/inventoryCalc.ts يعيد تصديرها) وفي الواجهة (pages/supervisor.tsx)
// لحساب "المخزن الإجمالي" من "مخازن الشركات" مباشرة بدون أي طلب إضافي.

export type PriceBucket = {
  price: number;
  remaining: number;
  total: number;
  condition: string;
  company_id: string;
  company_name: string;
};

export type CompanyTypeInventory = {
  total: number;
  distributed: number;
  returned: number;
  remaining: number;
  totalValue: number;
  priceBatches: PriceBucket[];
  frozenQty: number;
  conditionBreakdown: Record<string, number>;
  mismatchWarning?: string;
};

export type CompanyInventoryEntry = {
  companyId: string;
  companyName: string;
  inventory: Record<string, CompanyTypeInventory>;
};

// تجميع نتيجة computeSupervisorCompanyInventory على كل الشركات للحصول على
// "المخزن الإجمالي" — بحيث يكون دائماً مشتقاً من مخزن الشركات ومتطابقاً معه.
export function aggregateCompanyInventory(
  companies: CompanyInventoryEntry[],
  types: string[]
): Record<string, CompanyTypeInventory> {
  const out: Record<string, CompanyTypeInventory> = {};

  types.forEach(t => {
    let total = 0, distributed = 0, returned = 0, totalValue = 0, frozenQty = 0;
    const conditionBreakdown: Record<string, number> = { new: 0, good: 0, damaged: 0 };
    const priceBatches: PriceBucket[] = [];
    const warnings: string[] = [];

    companies.forEach(c => {
      const d = c.inventory[t];
      if (!d) return;
      total += d.total;
      distributed += d.distributed;
      returned += d.returned;
      totalValue += d.totalValue;
      frozenQty += d.frozenQty;
      conditionBreakdown.new += d.conditionBreakdown.new || 0;
      conditionBreakdown.good += d.conditionBreakdown.good || 0;
      conditionBreakdown.damaged += d.conditionBreakdown.damaged || 0;
      d.priceBatches.forEach(b => priceBatches.push(b));
      if (d.mismatchWarning) warnings.push(`${c.companyName}: ${d.mismatchWarning}`);
    });

    out[t] = {
      total, distributed, returned,
      remaining: total - distributed,
      totalValue, frozenQty, conditionBreakdown,
      priceBatches,
      mismatchWarning: warnings.length > 0 ? warnings.join(' | ') : undefined,
    };
  });

  return out;
}
