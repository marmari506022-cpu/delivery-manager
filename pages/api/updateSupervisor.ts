import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { supervisorId, name, phone, regions, companyIds, baseSalary } = req.body;
  if (!supervisorId) return res.json({ success: false, message: 'معرف المشرف مطلوب' });

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (baseSalary !== undefined) updates.base_salary = Number(baseSalary) || 0;

  // regions: array → store as comma-separated string in 'region' column
  if (regions !== undefined) {
    const arr = Array.isArray(regions) ? regions : [];
    updates.region = arr.join(',');
  }

  // companyIds: array → store as comma-separated string in 'company_id' column
  if (companyIds !== undefined) {
    const arr = Array.isArray(companyIds) ? companyIds : [];
    updates.company_id = arr.join(',');
  }

  const { error } = await supabase.from('users').update(updates).eq('id', supervisorId);
  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true });
}
