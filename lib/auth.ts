import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';

const SECRET = process.env.JWT_SECRET || 'badaya_secret';

export interface Session {
  id: string;
  role: 'manager' | 'supervisor' | 'pilot' | 'developer';
  name: string;
  region: string;
  phone: string;
  supervisorId: string;
  baseSalary: number;
  adminId: string; // ID الأدمن المالك — للمدير = نفس id, للمشرف/الطيار = id الأدمن
}

export function signToken(session: Session): string {
  return jwt.sign(session, SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): Session | null {
  try {
    return jwt.verify(token, SECRET) as Session;
  } catch {
    return null;
  }
}

export function getSession(req: NextApiRequest): Session | null {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim() ||
                (req.body && req.body.token) ||
                (req.query && req.query.token as string) || '';
  if (!token) return null;
  return verifyToken(token);
}

/** يرجع admin_id الصحيح بغض النظر عن دور المستخدم */
export function getAdminId(session: Session): string {
  return session.role === 'manager' ? session.id : (session.adminId || '');
}
