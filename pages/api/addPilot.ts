import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  if (!adminId) return res.json({ success: false, message: 'غير مصرح' });
  const { name, region, phone, whatsapp, baseSalary, supervisorId: bodySupervisorId, companyId } = req.body;
  const { count } = await supabase.from('pilots').select('*', { count: 'exact', head: true }).eq('admin_id', adminId);
  const code  = 'P' + String((count || 0) + 1).padStart(4, '0');
  const id    = generateId();
  const supId = session.role === 'supervisor' ? session.id : (bodySupervisorId || '');
  const regionStr = Array.isArray(region) ? region.join(',') : (region || '');

  // التحقق من أن الشركة المختارة فعلاً ضمن شركات المشرف (أمان)
  let finalCompanyId = '';
  if (companyId && session.role === 'supervisor') {
    const { data: supUser } = await supabase.from('users').select('company_id').eq('id', session.id).limit(1);
    const allowedIds = ((supUser?.[0]?.company_id as string) || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    if (allowedIds.includes(companyId)) finalCompanyId = companyId;
  } else if (companyId) {
    finalCompanyId = companyId;
  }

  const { error } = await supabase.from('pilots').insert({
    id, name, region: regionStr, phone, whatsapp: whatsapp || '', supervisor_id: supId,
    base_salary: baseSalary || 0, pilot_code: code, active: true,
    created_at: nowIso(), admin_id: adminId, company_id: finalCompanyId,
  });
  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true, id, code });
}
