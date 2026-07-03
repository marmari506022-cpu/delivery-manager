import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { regionId, newName } = req.body;
  const { data: region } = await supabase.from('regions').select('name').eq('id', regionId).single();
  if (!region) return res.json({ success: false, message: 'المنطقة غير موجودة' });

  const oldName = region.name;
  await supabase.from('regions').update({ name: newName }).eq('id', regionId);

  // تحديث المستخدمين والطيارين
  const { data: usersToUpdate } = await supabase.from('users').select('id,region');
  for (const u of (usersToUpdate || [])) {
    const parts = (u.region || '').split(',').map((r: string) => r.trim());
    if (parts.includes(oldName)) {
      await supabase.from('users')
        .update({ region: parts.map((r: string) => r === oldName ? newName : r).join(',') })
        .eq('id', u.id);
    }
  }
  const { data: pilotsToUpdate } = await supabase.from('pilots').select('id,region');
  for (const p of (pilotsToUpdate || [])) {
    const parts = (p.region || '').split(',').map((r: string) => r.trim());
    if (parts.includes(oldName)) {
      await supabase.from('pilots')
        .update({ region: parts.map((r: string) => r === oldName ? newName : r).join(',') })
        .eq('id', p.id);
    }
  }
  return res.json({ success: true });
}
