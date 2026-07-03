import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);

  const type     = req.query.type as string || '';
  const dateFrom = req.query.dateFrom as string || '';
  const dateTo   = req.query.dateTo as string || '';

  let query = supabase.from('inventory').select('*').eq('admin_id', adminId);
  if (type)     query = query.eq('type', type);
  if (dateFrom) query = query.gte('date', dateFrom);
  if (dateTo)   query = query.lte('date', dateTo + 'T23:59:59');

  const { data } = await query;
  const rows = data || [];

  // جلب أسماء الشركات
  const companyIds = [...new Set(rows.map((r: any) => r.company_id).filter((id: any) => id && id.trim() !== ''))] as string[];
  const nameMap: Record<string, string> = {};
  if (companyIds.length > 0) {
    const { data: companies } = await supabase.from('companies').select('id,name').in('id', companyIds);
    (companies || []).forEach((c: any) => { nameMap[c.id] = c.name; });
  }

  const result = rows.map((r: any) => ({
    ...r,
    company_name: (r.company_id && r.company_id.trim() !== '') ? (nameMap[r.company_id] || r.company_id) : null,
  }));

  return res.json({ success: true, data: result });
}
