import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const supervisorId = req.query.supervisorId as string || req.body?.supervisorId || '';
  const adminId = getAdminId(session);
  if (!adminId) return res.json({ success: true, data: [] });

  let query = supabase.from('pilots').select('*').eq('active', true);

  if (supervisorId) {
    // المدير بيطلب طيارين مشرف معين → فلتر بالاتنين
    query = query.eq('supervisor_id', supervisorId).eq('admin_id', adminId);
  } else if (session.role === 'supervisor') {
    // المشرف → فلتر بـ supervisor_id و admin_id مع بعض
    query = query.eq('supervisor_id', session.id).eq('admin_id', adminId);
  } else {
    // المدير → فلتر بـ admin_id بس
    query = query.eq('admin_id', adminId);
  }

  const { data } = await query;
  return res.json({ success: true, data: data || [] });
}
