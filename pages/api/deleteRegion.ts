import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { regionId } = req.body;
  const { data: region } = await supabase.from('regions').select('name').eq('id', regionId).single();
  if (!region) return res.json({ success: false, message: 'المنطقة غير موجودة' });

  // التحقق من عدم وجود سجلات تاريخية (طيارين أو مستخدمين)
  const { data: pilots } = await supabase.from('pilots').select('id').ilike('region', `%${region.name}%`).limit(1);
  const { data: users } = await supabase.from('users').select('id').ilike('region', `%${region.name}%`).limit(1);
  if ((pilots && pilots.length > 0) || (users && users.length > 0)) {
    return res.json({ success: false, message: 'لا يمكن حذف منطقة لها سجلات مرتبطة. يمكنك إيقافها بدلاً من ذلك.' });
  }

  await supabase.from('regions').delete().eq('id', regionId);
  return res.json({ success: true });
}
