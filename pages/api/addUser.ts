import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const { username, password, role, name, regions, companyIds, phone, baseSalary } = req.body;
  const id = generateId();

  const regionStr  = Array.isArray(regions)    ? regions.join(',')    : (regions    || '');
  const companyStr = Array.isArray(companyIds) ? companyIds.join(',') : (companyIds || '');

  const { error } = await supabase.from('users').insert({
    id, username, password, role: role || 'supervisor', name,
    region: regionStr, phone, supervisor_id: '', active: true,
    base_salary: baseSalary || 0, company_id: companyStr,
    admin_id: adminId,
  });
  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true, id });
}
