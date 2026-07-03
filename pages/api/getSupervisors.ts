import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const [usersR, companiesR] = await Promise.all([
    supabase.from('users').select('*').eq('role', 'supervisor').eq('active', true).eq('admin_id', getAdminId(session)),
    supabase.from('companies').select('*'),
  ]);

  const companies = companiesR.data || [];

  const data = (usersR.data || []).map(s => {
    const regions    = (s.region || '').split(',').map((r: string) => r.trim()).filter(Boolean);
    const companyIds = (s.company_id || '').split(',').map((c: string) => c.trim()).filter(Boolean);
    const companyNames = companyIds.map((cid: string) => companies.find(c => c.id === cid)?.name).filter(Boolean);
    return {
      ...s,
      regions,
      region: regions.join(', '),        // backward compat display
      companyIds,
      company_id: companyIds[0] || '',   // backward compat (first company)
      companyNames,
    };
  });

  return res.json({ success: true, data });
}
