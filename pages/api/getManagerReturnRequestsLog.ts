import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const { status, supervisorId } = req.query;

  let query = supabase
    .from('return_requests')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });

  if (status && typeof status === 'string') query = query.eq('status', status);
  if (supervisorId && typeof supervisorId === 'string') query = query.eq('supervisor_id', supervisorId);

  const { data, error } = await query;
  if (error) return res.json({ success: false, message: error.message });

  const supIds = Array.from(new Set((data || []).map((r: any) => r.supervisor_id).filter(Boolean)));
  let names: Record<string, string> = {};
  if (supIds.length > 0) {
    const { data: usersData } = await supabase.from('users').select('id, name').in('id', supIds);
    (usersData || []).forEach((u: any) => { names[u.id] = u.name; });
  }

  const result = (data || []).map((r: any) => ({ ...r, supervisor_name: names[r.supervisor_id] || r.supervisor_id }));

  return res.json({ success: true, data: result });
}
