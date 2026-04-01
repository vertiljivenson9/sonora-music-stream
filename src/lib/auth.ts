import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const ADMIN_TOKEN_HEADER = 'x-admin-token';
const JWT_SECRET = process.env.JWT_SECRET || 'sonora-secret-key-change-in-production';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): object | null {
  try {
    return jwt.verify(token, JWT_SECRET) as object;
  } catch {
    return null;
  }
}
