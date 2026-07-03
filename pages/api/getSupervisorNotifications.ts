import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const supId = session.id;

  const [sendLogR, fundingR, approvedReqR, transferNotifsR, pilotsR] = await Promise.all([
    // إرسال مخزون من المدير
    supabase.from('inventory_log').select('*').eq('supervisor_id', supId).eq('action', 'send').order('date', { ascending: false }).limit(200),
    // تمويل مباشر من المدير (مش رد على طلب)
    supabase.from('funding').select('*').eq('supervisor_id', supId).eq('is_request', false).order('date', { ascending: false }).limit(200),
    // طلبات المشرف اللي المدير وافق عليها
    supabase.from('requests').select('*').eq('supervisor_id', supId).eq('admin_id', adminId).eq('status', 'approved').order('date', { ascending: false }).limit(200),
    // طلبات تحويل الطيارين (إشعارات قائمة بالفعل)
    supabase.from('notifications').select('*').eq('target_id', supId).eq('type', 'pilot_transfer').eq('status', 'pending').order('date', { ascending: false }),
    supabase.from('pilots').select('*'),
  ]);

  const companyIds = new Set<string>();
  (approvedReqR.data || []).forEach((r: any) => { if (r.company_id) companyIds.add(r.company_id); });
  let companyNameMap: Record<string, string> = {};
  if (companyIds.size > 0) {
    const { data: companies } = await supabase.from('companies').select('id,name').in('id', Array.from(companyIds));
    (companies || []).forEach((c: any) => { companyNameMap[c.id] = c.name; });
  }

  const pilots = pilotsR.data || [];

  const items: any[] = [];

  (sendLogR.data || []).forEach((r: any) => {
    items.push({
      id: 'inv_' + r.id,
      kind: 'inventory_send',
      date: r.date,
      type: r.type,
      qty: r.qty,
      price: r.price,
      companyName: r.company_name,
      performedBy: r.performed_by,
      note: r.note,
    });
  });

  (fundingR.data || []).forEach((r: any) => {
    items.push({
      id: 'fund_' + r.id,
      kind: 'funding_send',
      date: r.date,
      amount: r.amount,
      sentBy: r.sent_by,
      note: r.note,
    });
  });

  (approvedReqR.data || []).forEach((r: any) => {
    items.push({
      id: 'req_' + r.id,
      kind: 'request_approved',
      date: r.date,
      requestType: r.type,
      qty: r.qty,
      amount: r.amount,
      companyName: (r.company_id && companyNameMap[r.company_id]) || null,
      note: r.note,
    });
  });

  (transferNotifsR.data || []).forEach((n: any) => {
    const pilot = pilots.find((p: any) => p.id === n.ref_id) || {} as any;
    items.push({
      id: 'transfer_' + n.id,
      notifId: n.id,
      kind: 'pilot_transfer',
      date: n.date,
      pilotName: pilot.name,
      pilotRegion: pilot.region,
      pilotSalary: pilot.base_salary,
      pilotPhone: pilot.phone,
      refId: n.ref_id,
    });
  });

  items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  return res.json({ success: true, data: items });
}
