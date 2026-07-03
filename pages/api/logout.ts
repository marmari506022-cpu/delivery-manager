import type { NextApiRequest, NextApiResponse } from 'next';

// JWT stateless - logout يتم client-side بحذف التوكن من localStorage
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.json({ success: true });
}
