import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { data: users } = await supabase.from('users').select('company_id').eq('id', session.id).limit(1);
  const ids = ((users?.[0]?.company_id as string) || '').split(',').map((s: string) => s.trim()).filter(Boolean);

  if (ids.length === 0) return res.json({ success: true, data: [] });

  const { data: companies } = await supabase.from('companies').select('id,name').in('id', ids);
  const nameMap: Record<string, string> = {};
  (companies || []).forEach((c: any) => { nameMap[c.id] = c.name; });

  const data = ids.map((id: string) => ({ companyId: id, companyName: nameMap[id] || 'شركة محذوفة' }));
  return res.json({ success: true, data });
}
