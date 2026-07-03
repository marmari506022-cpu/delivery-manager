import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const supervisorId = req.query.supervisorId as string || req.body?.supervisorId || '';

  let query = supabase.from('pilots').select('*').eq('active', true);

  if (supervisorId) {
    // المدير بيطلب طيارين مشرف معين → فلتر بالاتنين
    query = query.eq('supervisor_id', supervisorId).eq('admin_id', getAdminId(session));
  } else if (session.role === 'supervisor') {
    // المشرف → فلتر بـ supervisor_id بس (بدون admin_id عشان يضمن يلاقي بياناته)
    query = query.eq('supervisor_id', session.id);
  } else {
    // المدير → فلتر بـ admin_id بس
    query = query.eq('admin_id', getAdminId(session));
  }

  const { data } = await query;
  return res.json({ success: true, data: data || [] });
}
