import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllTypes } from '../../lib/equipmentTypes';
import { getSession, getAdminId } from '../../lib/auth';
import { computeSupervisorCompanyInventory } from '../../lib/inventoryCalc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session || session.role !== 'supervisor') return res.json({ success: false, message: 'غير مصرح' });

  const supId = session.id;
  const adminId = getAdminId(session);
  const types = await getAllTypes(adminId);

  const result = await computeSupervisorCompanyInventory(supId, types);
  return res.json({ success: true, data: result });
}
