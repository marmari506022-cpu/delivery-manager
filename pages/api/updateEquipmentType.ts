import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const { id, icon, label, active, key } = req.body;
  if (!id) return res.json({ success: false, message: 'id مطلوب' });

  // إذا كان التعديل يشمل الاسم أو الأيقونة (وليس مجرد تغيير active)، تحقق من السجلات
  const isContentEdit = icon !== undefined || label !== undefined;
  if (isContentEdit && key) {
    const { data: invRecords } = await supabase.from('inventory').select('id').eq('type', key).eq('admin_id', adminId).limit(1);
    const { data: uniRecords } = await supabase.from('uniforms').select('id').eq('type', key).eq('admin_id', adminId).limit(1);
    const { data: logRecords } = await supabase.from('inventory_log').select('id').eq('type', key).limit(1);
    const hasHistory = (invRecords && invRecords.length > 0) || (uniRecords && uniRecords.length > 0) || (logRecords && logRecords.length > 0);
    if (hasHistory) {
      return res.json({ success: false, cannotEdit: true, message: 'لا يمكن تعديل هذا النوع لأنه يحتوي على سجلات تاريخية' });
    }
  }

  const update: any = {};
  if (icon !== undefined) update.icon = icon;
  if (label !== undefined) update.label = label;
  if (active !== undefined) update.active = active;

  const { error } = await supabase.from('equipment_types').update(update).eq('id', id).eq('admin_id', adminId);
  if (error) return res.json({ success: false, message: error.message });

  return res.json({ success: true });
}
