import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { supervisorId, amount, note, isRequest, requestId, originalAmount } = req.body;

  // فحص الرصيد
  const { data: balData } = await supabase.from('balance').select('*');
  const inTotal  = (balData || []).filter(b => b.direction === 'in').reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const outTotal = (balData || []).filter(b => b.direction === 'out').reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const balance  = inTotal - outTotal;

  if (balance < amount) return res.json({ success: false, message: `الرصيد غير كافٍ - الرصيد الحالي: ${balance}` });

  const origAmt = originalAmount !== undefined ? originalAmount : amount;
  const adminId = getAdminId(session);
  await supabase.from('funding').insert({
    id: generateId(), supervisor_id: supervisorId, amount, date: nowIso(),
    sent_by: session.name, note: note || '', is_request: isRequest || false,
    request_id: requestId || '', original_amount: origAmt, admin_id: adminId
  });
  await supabase.from('balance').insert({
    id: generateId(), amount, date: nowIso(), note: 'تمويل مشرف', direction: 'out', created_by: session.name, admin_id: adminId
  });
  return res.json({ success: true });
}
