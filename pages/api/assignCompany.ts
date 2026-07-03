import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'manager') return res.json({ success: false, message: 'غير مصرح' });

  const { targetId, targetType, companyId, action } = req.body;
  // targetType: 'supervisor' | 'pilot'
  // action (supervisor only): 'add' | 'remove' | 'set' (default: 'set' for backward compat)
  if (!targetId || !targetType) return res.json({ success: false, message: 'بيانات ناقصة' });

  if (targetType === 'supervisor') {
    if (action === 'add' || action === 'remove') {
      // Multi-company: toggle
      const { data: users } = await supabase.from('users').select('company_id').eq('id', targetId).limit(1);
      const current = (users?.[0]?.company_id || '').split(',').map((c: string) => c.trim()).filter(Boolean);
      let updated: string[];
      if (action === 'add') {
        updated = current.includes(companyId) ? current : [...current, companyId];
      } else {
        updated = current.filter((c: string) => c !== companyId);
      }
      const { error } = await supabase.from('users').update({ company_id: updated.join(',') }).eq('id', targetId);
      if (error) return res.json({ success: false, message: error.message });
    } else {
      // Legacy: set single
      const { error } = await supabase.from('users').update({ company_id: companyId || '' }).eq('id', targetId);
      if (error) return res.json({ success: false, message: error.message });
    }
  } else if (targetType === 'pilot') {
    const { error } = await supabase.from('pilots').update({ company_id: companyId || '' }).eq('id', targetId);
    if (error) return res.json({ success: false, message: error.message });
  } else {
    return res.json({ success: false, message: 'نوع غير صحيح' });
  }

  return res.json({ success: true });
}
