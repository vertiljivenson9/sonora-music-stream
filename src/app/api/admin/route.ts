import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, generateToken } from '@/lib/auth';

// Simple in-memory rate limiting
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Rate limiting check
    const attempts = loginAttempts.get(clientIp);
    if (attempts && attempts.count >= MAX_ATTEMPTS) {
      const elapsed = Date.now() - attempts.lastAttempt;
      if (elapsed < LOCKOUT_MS) {
        const remaining = Math.ceil((LOCKOUT_MS - elapsed) / 60000);
        return NextResponse.json(
          { error: `Too many attempts. Try again in ${remaining} minutes.` },
          { status: 429 }
        );
      }
      loginAttempts.delete(clientIp);
    }

    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const admin = await db.adminConfig.findUnique({ where: { id: 'main' } });
    if (!admin) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
    }

    const isValid = await comparePassword(password, admin.password);
    if (!isValid) {
      // Record failed attempt
      const current = loginAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
      loginAttempts.set(clientIp, { count: current.count + 1, lastAttempt: Date.now() });

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Success - clear attempts
    loginAttempts.delete(clientIp);

    const token = generateToken({ role: 'admin', id: 'main' });
    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('Error authenticating:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
