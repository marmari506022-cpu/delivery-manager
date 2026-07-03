import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const adminId    = getAdminId(session);
  const status     = req.query.status     as string || '';
  const type       = req.query.type       as string || '';
  const supervisor = req.query.supervisor as string || '';
  const search     = req.query.search     as string || '';
  const dateFrom   = req.query.dateFrom   as string || '';
  const dateTo     = req.query.dateTo     as string || '';

  // ── 1. جلب الطلبات العادية من جدول requests ──────────────────────────────
  let query = supabase.from('requests').select('*').eq('admin_id', adminId).order('date', { ascending: false });

  if (session.role === 'supervisor') query = query.eq('supervisor_id', session.id);
  if (status)     query = query.eq('status', status);
  if (type && type !== 'supervisor_return') query = query.eq('type', type);
  if (supervisor) query = query.eq('supervisor_id', supervisor);
  if (dateFrom)   query = query.gte('date', dateFrom);
  if (dateTo)     query = query.lte('date', dateTo + 'T23:59:59');

  const { data: rawRequests } = await query;
  let result: any[] = (rawRequests || []).map((r: any) => ({ ...r, _source: 'requests' }));

  // ── 2. جلب طلبات المرتجع من جدول return_requests ──────────────────────────
  // لا نجلب المرتجعات إذا الفلتر يحدد نوعاً غير "supervisor_return"
  const skipReturnRequests = type && type !== 'supervisor_return';

  if (!skipReturnRequests && session.role !== 'supervisor') {
    let rrQuery = supabase
      .from('return_requests')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });

    if (status)     rrQuery = rrQuery.eq('status', status);
    if (supervisor) rrQuery = rrQuery.eq('supervisor_id', supervisor);
    if (dateFrom)   rrQuery = rrQuery.gte('created_at', dateFrom);
    if (dateTo)     rrQuery = rrQuery.lte('created_at', dateTo + 'T23:59:59');

    const { data: rawReturns } = await rrQuery;

    // نحوّل كل سجل return_request لشكل موحد مع requests
    const normalizedReturns: any[] = (rawReturns || []).map((r: any) => ({
      id: r.id,
      admin_id: r.admin_id,
      supervisor_id: r.supervisor_id,
      type: 'supervisor_return',
      status: r.status,
      date: r.created_at,
      note: null,
      qty: (Array.isArray(r.items) ? r.items : []).reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0),
      amount: null,
      company_id: null,
      company_name: null,
      items: r.items,
      _source: 'return_requests',
    }));

    // فلترة نصية
    let filtered = normalizedReturns;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r: any) =>
        (r.supervisor_id || '').toLowerCase().includes(q) ||
        'مرتجع'.includes(q) ||
        'supervisor_return'.includes(q)
      );
    }

    result = [...result, ...filtered];
  }

  // ── 3. بحث نصي في الطلبات العادية ──────────────────────────────────────────
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((r: any) =>
      r._source === 'return_requests' ? true : // already filtered above
      (r.note || '').toLowerCase().includes(q) ||
      (r.supervisor_id || '').toLowerCase().includes(q) ||
      (r.type || '').toLowerCase().includes(q)
    );
  }

  // ── 4. إضافة أسماء الشركات ──────────────────────────────────────────────────
  const companyIds = [...new Set(result.map((r: any) => r.company_id).filter((id: any) => id && id.trim() !== ''))];
  if (companyIds.length > 0) {
    const { data: companies } = await supabase.from('companies').select('id,name').in('id', companyIds);
    const nameMap: Record<string, string> = {};
    (companies || []).forEach((c: any) => { nameMap[c.id] = c.name; });
    result = result.map((r: any) => ({
      ...r,
      company_name: (r.company_id && r.company_id.trim() !== '') ? (nameMap[r.company_id] || null) : null,
    }));
  }

  // ── 5. ترتيب موحد بالتاريخ ──────────────────────────────────────────────────
  result.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return res.json({ success: true, data: result });
}
