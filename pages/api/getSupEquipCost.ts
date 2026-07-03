import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const supervisorId = req.query.supervisorId as string;
  if (!supervisorId) return res.json({ success: false, message: 'supervisorId مطلوب' });

  const { data } = await supabase
    .from('inventory')
    .select('*')
    .eq('supervisor_id', supervisorId)
    .eq('direction', 'manager_out_to_sup')
    .order('date', { ascending: false });

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
    company_name: (r.company_id && r.company_id.trim() !== '') ? (nameMap[r.company_id] || r.company_id) : '—',
  }));

  return res.json({ success: true, data: result });
}
