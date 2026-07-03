import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const { pilotId, name, region, phone, whatsapp, companyId } = req.body;
  if (!pilotId) return res.json({ success: false, message: 'لم يتم تحديد الطيار' });

  // التأكد أن الطيار فعلاً تابع للمشرف الحالي (أو لنفس الأدمن لو مدير)
  const { data: pilots } = await supabase.from('pilots').select('*').eq('id', pilotId).limit(1);
  const pilot = pilots?.[0];
  if (!pilot) return res.json({ success: false, message: 'الطيار غير موجود' });

  if (session.role === 'supervisor' && pilot.supervisor_id !== session.id) {
    return res.json({ success: false, message: 'غير مصرح بتعديل بيانات هذا الطيار' });
  }
  if (session.role === 'manager' && pilot.admin_id !== getAdminId(session)) {
    return res.json({ success: false, message: 'غير مصرح بتعديل بيانات هذا الطيار' });
  }

  const update: Record<string, any> = {};
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;
  if (whatsapp !== undefined) update.whatsapp = whatsapp;
  if (region !== undefined) update.region = Array.isArray(region) ? region.join(',') : (region || '');

  // التحقق من أن الشركة المختارة فعلاً ضمن شركات المشرف (أمان)
  if (companyId !== undefined) {
    if (!companyId) {
      update.company_id = '';
    } else if (session.role === 'supervisor') {
      const { data: supUser } = await supabase.from('users').select('company_id').eq('id', session.id).limit(1);
      const allowedIds = ((supUser?.[0]?.company_id as string) || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      update.company_id = allowedIds.includes(companyId) ? companyId : pilot.company_id || '';
    } else {
      update.company_id = companyId;
    }
  }

  const { error } = await supabase.from('pilots').update(update).eq('id', pilotId);
  if (error) return res.json({ success: false, message: error.message });

  return res.json({ success: true });
}
