import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { companyId } = req.body;
  if (!companyId) return res.json({ success: false, message: 'معرف الشركة مطلوب' });

  const { error } = await supabase
    .from('companies')
    .update({ active: false })
    .eq('id', companyId);

  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true });
}
