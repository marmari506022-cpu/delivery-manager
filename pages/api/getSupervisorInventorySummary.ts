import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllTypes } from '../../lib/equipmentTypes';
import { supabase } from '../../lib/supabase';
import { getSession, getAdminId } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.json({ success: false, message: 'غير مصرح' });

  const adminId = getAdminId(session);
  const supId = (req.query.supervisorId || req.body?.supervisorId || session.id) as string;
  if (session.role === 'manager' && supId !== session.id) {
    const { data: supRows } = await supabase.from('users').select('id,admin_id').eq('id', supId).limit(1);
    if (!supRows?.[0] || supRows[0].admin_id !== adminId) {
      return res.json({ success: false, message: 'غير مصرح' });
    }
  } else if (session.role === 'supervisor' && supId !== session.id) {
    return res.json({ success: false, message: 'غير مصرح' });
  }
  const { data: inv } = await supabase.from('inventory').select('*').eq('supervisor_id', supId);
  const types = await getAllTypes(adminId);
  const summary: Record<string, any> = {};

  types.forEach(t => {
    const inItems = (inv || []).filter(i => i.type === t && i.direction === 'sup_in');
    const inQty   = inItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const outQty  = (inv || []).filter(i => i.type === t && (i.direction === 'sup_out_to_pilot' || i.direction === 'sup_out_to_manager')).reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const returnQ = (inv || []).filter(i => i.type === t && i.direction === 'return_to_sup').reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const prices  = inItems.map(i => Number(i.price) || 0).filter((v, i, a) => a.indexOf(v) === i);
    summary[t] = {
      total: inQty, distributed: outQty, returned: returnQ,
      remaining: inQty - outQty + returnQ, prices,
      batches: inItems.map(i => ({ price: Number(i.price) || 0, date: i.date, batchId: i.batch_id, remaining: inQty - outQty + returnQ }))
    };
  });
  return res.json({ success: true, data: summary });
}
