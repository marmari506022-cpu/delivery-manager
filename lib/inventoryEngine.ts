/**
 * Inventory Engine — Single Source of Truth
 *
 * All inventory balances are DERIVED from inventory_movements.
 * No totals are stored anywhere else.
 * Every mutating operation goes through this engine.
 */

import { supabase, generateId, nowIso } from './supabase';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type InventoryDirection =
  | 'manager_in'
  | 'manager_out_to_sup'
  | 'manager_in_from_sup'
  | 'manager_out_company_ret'
  | 'sup_in_from_manager'
  | 'sup_out_to_pilot'
  | 'sup_in_from_pilot'
  | 'sup_out_to_manager'
  | 'reservation'
  | 'reservation_release';

export interface MovementRow {
  id: string;
  admin_id: string;
  supervisor_id: string;
  pilot_id: string;
  company_id: string;
  type: string;
  direction: InventoryDirection;
  qty: number;
  price: number;
  condition: string;
  ref_id: string;
  batch_id: string;
  note: string;
  reversed_by: string;
  reversal_of: string;
  created_at: string;
  created_by: string;
}

export interface TypeBalance {
  type: string;
  totalIn: number;
  totalOut: number;
  reserved: number;
  available: number;
  totalValue: number;
  priceBatches: PriceBatch[];
  conditionBreakdown: Record<string, number>;
}

export interface PriceBatch {
  price: number;
  condition: string;
  company_id: string;
  company_name: string;
  totalIn: number;
  available: number;
}

export interface ManagerBalance {
  type: string;
  totalIn: number;
  totalSent: number;
  totalReturnedFromSup: number;
  totalReturnedToCompany: number;
  available: number;
  priceBatches: ManagerPriceBatch[];
}

export interface ManagerPriceBatch {
  price: number;
  condition: string;
  company_id: string;
  company_name: string;
  profitMargin: number;
  profitType: string;
  totalIn: number;
  available: number;
  batchId: string;
}

// ─────────────────────────────────────────────
// Raw movement fetchers
// ─────────────────────────────────────────────

export async function fetchMovements(filters: {
  admin_id?: string;
  supervisor_id?: string;
  pilot_id?: string;
  type?: string;
  direction?: InventoryDirection | InventoryDirection[];
}): Promise<MovementRow[]> {
  let q = supabase
    .from('inventory_movements')
    .select('*')
    .order('created_at', { ascending: true });

  if (filters.admin_id)      q = q.eq('admin_id', filters.admin_id);
  if (filters.supervisor_id) q = q.eq('supervisor_id', filters.supervisor_id);
  if (filters.pilot_id)      q = q.eq('pilot_id', filters.pilot_id);
  if (filters.type)          q = q.eq('type', filters.type);
  if (filters.direction) {
    if (Array.isArray(filters.direction)) {
      q = q.in('direction', filters.direction);
    } else {
      q = q.eq('direction', filters.direction);
    }
  }

  const { data, error } = await q;
  if (error) throw new Error('fetchMovements: ' + error.message);
  return (data || []) as MovementRow[];
}

// ─────────────────────────────────────────────
// Balance calculators
// ─────────────────────────────────────────────

export function calcSupervisorBalance(
  movements: MovementRow[],
  types: string[],
  companies: { id: string; name: string }[]
): Record<string, TypeBalance> {
  const companyMap: Record<string, string> = {};
  companies.forEach(c => { companyMap[c.id] = c.name; });

  const result: Record<string, TypeBalance> = {};

  types.forEach(type => {
    const rows = movements.filter(m => m.type === type && m.reversal_of === '');

    const inDirs: InventoryDirection[] = ['sup_in_from_manager', 'sup_in_from_pilot'];
    const outDirs: InventoryDirection[] = ['sup_out_to_pilot', 'sup_out_to_manager'];
    const resDirs: InventoryDirection[] = ['reservation'];
    const resRelDirs: InventoryDirection[] = ['reservation_release'];

    const totalIn  = rows.filter(m => inDirs.includes(m.direction)).reduce((s, m) => s + m.qty, 0);
    const totalOut = rows.filter(m => outDirs.includes(m.direction)).reduce((s, m) => s + m.qty, 0);
    const reserved = rows.filter(m => resDirs.includes(m.direction)).reduce((s, m) => s + m.qty, 0)
                   - rows.filter(m => resRelDirs.includes(m.direction)).reduce((s, m) => s + m.qty, 0);

    const available = Math.max(0, totalIn - totalOut - Math.max(0, reserved));

    const totalValue = rows
      .filter(m => m.direction === 'sup_in_from_manager')
      .reduce((s, m) => s + m.qty * m.price, 0);

    const inRows = rows.filter(m => m.direction === 'sup_in_from_manager');
    const priceBatchMap: Record<string, PriceBatch> = {};
    inRows.forEach(m => {
      const key = `${m.price}__${m.condition}__${m.company_id}`;
      if (!priceBatchMap[key]) {
        priceBatchMap[key] = {
          price: m.price,
          condition: m.condition,
          company_id: m.company_id,
          company_name: companyMap[m.company_id] || '',
          totalIn: 0,
          available: 0,
        };
      }
      priceBatchMap[key].totalIn += m.qty;
      priceBatchMap[key].available += m.qty;
    });

    let netOut = totalOut;
    const sortedKeys = Object.keys(priceBatchMap).sort(
      (a, b) => priceBatchMap[a].price - priceBatchMap[b].price
    );
    for (const key of sortedKeys) {
      if (netOut <= 0) break;
      const take = Math.min(netOut, priceBatchMap[key].available);
      priceBatchMap[key].available -= take;
      netOut -= take;
    }

    let netRes = Math.max(0, reserved);
    for (const key of sortedKeys) {
      if (netRes <= 0) break;
      const take = Math.min(netRes, priceBatchMap[key].available);
      priceBatchMap[key].available -= take;
      netRes -= take;
    }

    const conditionBreakdown: Record<string, number> = { new: 0, good: 0, damaged: 0 };
    const allInQty = totalIn;
    if (allInQty > 0 && available > 0) {
      const condTotals: Record<string, number> = { new: 0, good: 0, damaged: 0 };
      inRows.forEach(m => {
        const c = m.condition in condTotals ? m.condition : 'new';
        condTotals[c] += m.qty;
      });
      rows.filter(m => m.direction === 'sup_in_from_pilot').forEach(m => {
        const c = m.condition in condTotals ? m.condition : 'good';
        condTotals[c] += m.qty;
      });
      const tot = condTotals.new + condTotals.good + condTotals.damaged;
      if (tot > 0) {
        conditionBreakdown.new     = Math.round((condTotals.new     / tot) * available);
        conditionBreakdown.good    = Math.round((condTotals.good    / tot) * available);
        conditionBreakdown.damaged = Math.round((condTotals.damaged / tot) * available);
        const diff = available - conditionBreakdown.new - conditionBreakdown.good - conditionBreakdown.damaged;
        conditionBreakdown.new += diff;
      }
    }

    result[type] = {
      type,
      totalIn,
      totalOut,
      reserved: Math.max(0, reserved),
      available,
      totalValue,
      priceBatches: Object.values(priceBatchMap).filter(b => b.totalIn > 0),
      conditionBreakdown,
    };
  });

  return result;
}

export function calcManagerBalance(
  movements: MovementRow[],
  types: string[],
  companies: { id: string; name: string }[]
): Record<string, ManagerBalance> {
  const companyMap: Record<string, string> = {};
  companies.forEach(c => { companyMap[c.id] = c.name; });

  const result: Record<string, ManagerBalance> = {};

  types.forEach(type => {
    const rows = movements.filter(m => m.type === type && m.reversal_of === '');

    const totalIn                  = rows.filter(m => m.direction === 'manager_in').reduce((s, m) => s + m.qty, 0);
    const totalSent                = rows.filter(m => m.direction === 'manager_out_to_sup').reduce((s, m) => s + m.qty, 0);
    const totalReturnedFromSup     = rows.filter(m => m.direction === 'manager_in_from_sup').reduce((s, m) => s + m.qty, 0);
    const totalReturnedToCompany   = rows.filter(m => m.direction === 'manager_out_company_ret').reduce((s, m) => s + m.qty, 0);
    const available = Math.max(0, totalIn + totalReturnedFromSup - totalSent - totalReturnedToCompany);

    const inRows = rows.filter(m => m.direction === 'manager_in');
    const batchMap: Record<string, ManagerPriceBatch> = {};

    inRows.forEach(m => {
      const key = `${m.batch_id}__${m.price}__${m.condition}`;
      if (!batchMap[key]) {
        batchMap[key] = {
          price: m.price,
          condition: m.condition,
          company_id: m.company_id,
          company_name: companyMap[m.company_id] || '',
          profitMargin: 0,
          profitType: 'percent',
          totalIn: 0,
          available: 0,
          batchId: m.batch_id,
        };
      }
      batchMap[key].totalIn += m.qty;
      batchMap[key].available += m.qty;
    });

    let netOut = totalSent + totalReturnedToCompany - totalReturnedFromSup;
    if (netOut > 0) {
      const sorted = Object.keys(batchMap).sort((a, b) => batchMap[a].price - batchMap[b].price);
      for (const key of sorted) {
        if (netOut <= 0) break;
        const take = Math.min(netOut, batchMap[key].available);
        batchMap[key].available -= take;
        netOut -= take;
      }
    }

    result[type] = {
      type,
      totalIn,
      totalSent,
      totalReturnedFromSup,
      totalReturnedToCompany,
      available,
      priceBatches: Object.values(batchMap).filter(b => b.totalIn > 0),
    };
  });

  return result;
}

// ─────────────────────────────────────────────
// Transactional operations
// ─────────────────────────────────────────────

export interface EngineResult {
  success: boolean;
  message?: string;
  batchId?: string;
  ids?: string[];
}

export async function insertMovements(
  rows: Omit<MovementRow, 'id' | 'created_at'>[],
  auditRows?: AuditEntry[]
): Promise<EngineResult> {
  const withIds = rows.map(r => ({
    ...r,
    id: generateId(),
    created_at: nowIso(),
  }));

  const { error } = await supabase.from('inventory_movements').insert(withIds);
  if (error) {
    return { success: false, message: 'خطأ في تسجيل حركة المخزون: ' + error.message };
  }

  if (auditRows && auditRows.length > 0) {
    const auditWithIds = auditRows.map(r => ({
      ...r,
      id: generateId(),
      created_at: nowIso(),
    }));
    const { error: auditErr } = await supabase.from('inventory_audit_log').insert(auditWithIds);
    if (auditErr) {
      console.error('audit log insert failed:', auditErr.message);
    }
  }

  return {
    success: true,
    batchId: rows[0]?.batch_id,
    ids: withIds.map(r => r.id),
  };
}

export async function reverseMovements(
  originalIds: string[],
  reason: string,
  performedBy: string
): Promise<EngineResult> {
  if (originalIds.length === 0) return { success: true };

  const { data: originals, error: fetchErr } = await supabase
    .from('inventory_movements')
    .select('*')
    .in('id', originalIds);

  if (fetchErr) return { success: false, message: 'خطأ في قراءة الحركات الأصلية: ' + fetchErr.message };

  const toReverse = (originals || []).filter(m => m.reversed_by === '');
  if (toReverse.length === 0) return { success: true, message: 'لا توجد حركات تحتاج عكس' };

  const reverseBatchId = generateId();
  const reversalRows: any[] = toReverse.map(m => {
    const flippedDir = flipDirection(m.direction as InventoryDirection);
    return {
      id: generateId(),
      admin_id: m.admin_id,
      supervisor_id: m.supervisor_id,
      pilot_id: m.pilot_id,
      company_id: m.company_id,
      type: m.type,
      direction: flippedDir,
      qty: m.qty,
      price: m.price,
      condition: m.condition,
      ref_id: m.ref_id,
      batch_id: reverseBatchId,
      note: `عكس: ${reason}`,
      reversed_by: '',
      reversal_of: m.id,
      created_at: nowIso(),
      created_by: performedBy,
    };
  });

  const { error: revErr } = await supabase.from('inventory_movements').insert(reversalRows);
  if (revErr) return { success: false, message: 'خطأ في عكس الحركات: ' + revErr.message };

  const reversalMap: Record<string, string> = {};
  toReverse.forEach((m, i) => { reversalMap[m.id] = reversalRows[i].id; });

  const updates = toReverse.map(m =>
    supabase.from('inventory_movements').update({ reversed_by: reversalMap[m.id] }).eq('id', m.id)
  );
  await Promise.all(updates);

  return { success: true, batchId: reverseBatchId, ids: reversalRows.map(r => r.id) };
}

function flipDirection(dir: InventoryDirection): InventoryDirection {
  const flips: Record<InventoryDirection, InventoryDirection> = {
    manager_in:             'manager_out_company_ret',
    manager_out_to_sup:     'manager_in_from_sup',
    manager_in_from_sup:    'manager_out_to_sup',
    manager_out_company_ret:'manager_in',
    sup_in_from_manager:    'sup_out_to_manager',
    sup_out_to_pilot:       'sup_in_from_pilot',
    sup_in_from_pilot:      'sup_out_to_pilot',
    sup_out_to_manager:     'sup_in_from_manager',
    reservation:            'reservation_release',
    reservation_release:    'reservation',
  };
  return flips[dir] || dir;
}

// ─────────────────────────────────────────────
// Availability checker
// ─────────────────────────────────────────────

export async function getSupervisorAvailable(
  supId: string,
  adminId: string,
  type: string
): Promise<{ available: number; reserved: number; totalIn: number; totalOut: number }> {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('direction, qty')
    .eq('supervisor_id', supId)
    .eq('admin_id', adminId)
    .eq('type', type)
    .eq('reversal_of', '');

  if (error) throw new Error('getSupervisorAvailable: ' + error.message);

  const rows = data || [];
  const totalIn  = rows.filter(m => ['sup_in_from_manager','sup_in_from_pilot'].includes(m.direction)).reduce((s, m) => s + m.qty, 0);
  const totalOut = rows.filter(m => ['sup_out_to_pilot','sup_out_to_manager'].includes(m.direction)).reduce((s, m) => s + m.qty, 0);
  const reserved = rows.filter(m => m.direction === 'reservation').reduce((s, m) => s + m.qty, 0)
                 - rows.filter(m => m.direction === 'reservation_release').reduce((s, m) => s + m.qty, 0);

  return {
    totalIn,
    totalOut,
    reserved: Math.max(0, reserved),
    available: Math.max(0, totalIn - totalOut - Math.max(0, reserved)),
  };
}

export async function getManagerAvailable(
  adminId: string,
  type: string,
  companyId?: string
): Promise<number> {
  let q = supabase
    .from('inventory_movements')
    .select('direction, qty')
    .eq('admin_id', adminId)
    .eq('supervisor_id', 'manager')
    .eq('type', type)
    .eq('reversal_of', '');

  if (companyId) q = q.eq('company_id', companyId);

  const { data, error } = await q;
  if (error) throw new Error('getManagerAvailable: ' + error.message);

  const rows = data || [];
  const totalIn  = rows.filter(m => ['manager_in','manager_in_from_sup'].includes(m.direction)).reduce((s, m) => s + m.qty, 0);
  const totalOut = rows.filter(m => ['manager_out_to_sup','manager_out_company_ret'].includes(m.direction)).reduce((s, m) => s + m.qty, 0);
  return Math.max(0, totalIn - totalOut);
}

// ─────────────────────────────────────────────
// Audit log helper
// ─────────────────────────────────────────────

export interface AuditEntry {
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  batch_id: string;
  type: string;
  qty: number;
  price: number;
  company_id: string;
  company_name: string;
  supervisor_id: string;
  supervisor_name: string;
  pilot_id: string;
  pilot_name: string;
  performed_by: string;
  note: string;
}

export function buildAuditEntry(partial: Partial<AuditEntry> & Pick<AuditEntry, 'admin_id' | 'action' | 'entity_type' | 'entity_id' | 'performed_by'>): AuditEntry {
  return {
    batch_id: '',
    type: '',
    qty: 0,
    price: 0,
    company_id: '',
    company_name: '',
    supervisor_id: '',
    supervisor_name: '',
    pilot_id: '',
    pilot_name: '',
    note: '',
    ...partial,
  };
}