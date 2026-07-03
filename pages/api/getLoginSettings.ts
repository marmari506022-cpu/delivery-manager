import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

// إندبوينت عام (بدون تسجيل دخول) — بيتقرا من شاشة تسجيل الدخول نفسها
// عشان أي حد يفتح لينك التطبيق يشوف نفس الإعدادات اللي حفظها المطوّر.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data, error } = await supabase
    .from('login_settings')
    .select('icon,title,subtitle,bg_image')
    .eq('id', 'default')
    .limit(1);

  if (error) return res.json({ success: false, message: error.message });

  const row = data?.[0] || {};
  return res.json({
    success: true,
    icon: row.icon || '',
    title: row.title || 'تسجيل الدخول',
    subtitle: row.subtitle || 'قم بتسجيل الدخول للوصول إلى لوحة التحكم',
    bgImage: row.bg_image || '',
  });
}
