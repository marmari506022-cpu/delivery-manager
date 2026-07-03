import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, generateId, nowIso } from '../../lib/supabase';
import { getSession } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const { uniformId, toPilotId, condition } = req.body;
  const { data } = await supabase.from('uniforms').select('*').eq('id', uniformId).limit(1);
  const uni = data?.[0];
  if (!uni) return res.json({ success: false, message: 'المعدة غير موجودة' });

  await supabase.from('uniforms').update({ settled: true, settled_at: nowIso() }).eq('id', uniformId);
  const newId = generateId();
  await supabase.from('uniforms').insert({
    id: newId, pilot_id: toPilotId, type: uni.type, qty: uni.qty, date: nowIso(),
    price: uni.price, settled: false, supervisor_id: session.id,
    condition: condition || 'used', transferred_from: uniformId
  });
  return res.json({ success: true, id: newId });
}
