import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'developer') return res.json({ success: false, message: 'غير مصرح' });

  const { data: managers, error } = await supabase
    .from('users')
    .select('id,name,username,phone,active,created_at')
    .eq('role', 'manager')
    .order('created_at', { ascending: false });

  if (error) return res.json({ success: false, message: error.message });

  const result = [];
  for (const m of managers || []) {
    const [{ count: supCount }, { count: pilCount }] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('admin_id', m.id).eq('role', 'supervisor'),
      supabase.from('pilots').select('id', { count: 'exact', head: true }).eq('admin_id', m.id),
    ]);
    result.push({
      id: m.id,
      name: m.name,
      username: m.username,
      phone: m.phone || '',
      active: m.active,
      createdAt: m.created_at,
      supervisorsCount: supCount || 0,
      pilotsCount: pilCount || 0,
    });
  }

  return res.json({ success: true, managers: result });
}
