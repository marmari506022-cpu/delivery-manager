import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const { id, key } = req.body;
  if (!key) return res.json({ success: false, message: 'key مطلوب' });

  // تحقق هل له سجلات في inventory أو uniforms أو inventory_log عند نفس الأدمن
  const { data: invRecords } = await supabase.from('inventory').select('id').eq('type', key).eq('admin_id', adminId).limit(1);
  const { data: uniRecords } = await supabase.from('uniforms').select('id').eq('type', key).eq('admin_id', adminId).limit(1);
  const { data: logRecords } = await supabase.from('inventory_log').select('id').eq('type', key).limit(1);

  const hasHistory = (invRecords && invRecords.length > 0) || (uniRecords && uniRecords.length > 0) || (logRecords && logRecords.length > 0);
  if (hasHistory) {
    return res.json({ success: false, cannotDelete: true, message: 'لا يمكن حذف هذا النوع لأنه يحتوي على سجلات تاريخية' });
  }

  // إذا لم يكن هناك id (استخدم كـ check فقط)
  if (!id || id === '__check__') return res.json({ success: false, message: 'لا يوجد سجل قابل للحذف' });

  const { error } = await supabase.from('equipment_types').delete().eq('id', id).eq('admin_id', adminId);
  if (error) return res.json({ success: false, message: error.message });

  return res.json({ success: true });
}
