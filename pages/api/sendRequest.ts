import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });
  if (session.role !== 'supervisor') return res.json({ success: false, message: 'هذه العملية للمشرفين فقط' });

  const adminId = getAdminId(session);
  if (!adminId) return res.json({ success: false, message: 'لا يوجد مدير مرتبط بهذا الحساب' });

  const { type, qty, note, companyId } = req.body;
  if (!type) return res.json({ success: false, message: 'يجب تحديد نوع المعدة' });
  if (!qty || Number(qty) <= 0) return res.json({ success: false, message: 'يجب إدخال كمية صحيحة' });

  let amount = Number(qty) || 0;
  if (type === 'funding' && note) {
    const match = note.match(/(\d+(?:\.\d+)?)/);
    if (match) amount = parseFloat(match[1]);
  }

  const record: Record<string, any> = {
    id: generateId(),
    supervisor_id: session.id,
    admin_id: adminId,
    type,
    qty: Number(qty) || 0,
    amount,
    status: 'pending',
    date: nowIso(),
    note: note || '',
    discount: 0,
    discount_type: 'fixed',
    company_id: (companyId && companyId.trim() !== '') ? companyId.trim() : '',
  };

  const { error } = await supabase.from('requests').insert(record);
  if (error) return res.json({ success: false, message: 'فشل إرسال الطلب: ' + error.message });
  return res.json({ success: true });
}
