import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);

  const companyId = req.query.companyId as string || '';
  const action    = req.query.action as string || '';
  const dateFrom  = req.query.dateFrom as string || '';
  const dateTo    = req.query.dateTo as string || '';

  let query = supabase.from('inventory_log').select('*').eq('admin_id', adminId).order('date', { ascending: false });

  if (companyId) query = query.eq('company_id', companyId);
  if (action)    query = query.eq('action', action);
  if (dateFrom)  query = query.gte('date', dateFrom);
  if (dateTo)    query = query.lte('date', dateTo + 'T23:59:59');

  const { data, error } = await query;
  if (error) return res.json({ success: false, message: error.message });

  return res.json({ success: true, data: data || [] });
}
