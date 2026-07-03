import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'developer') return res.json({ success: false, message: 'غير مصرح' });

  const { icon, title, subtitle, bgImage } = req.body;

  const updates: any = { updated_at: new Date().toISOString() };
  if (icon !== undefined) updates.icon = icon;
  if (title !== undefined) updates.title = title;
  if (subtitle !== undefined) updates.subtitle = subtitle;
  if (bgImage !== undefined) updates.bg_image = bgImage;

  const { error } = await supabase
    .from('login_settings')
    .upsert({ id: 'default', ...updates }, { onConflict: 'id' });

  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true });
}
