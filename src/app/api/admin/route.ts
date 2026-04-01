import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';

// Simple in-memory rate limiting
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const ADMIN_PASSWORD = 'alicia123';

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
          { error: `Demasiados intentos. Intenta de nuevo en ${remaining} minutos.` },
          { status: 429 }
        );
      }
      loginAttempts.delete(clientIp);
    }

    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: 'La contraseña es requerida' }, { status: 400 });
    }

    // Direct comparison
    if (password !== ADMIN_PASSWORD) {
      const current = loginAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
      loginAttempts.set(clientIp, { count: current.count + 1, lastAttempt: Date.now() });

      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    // Success - clear attempts
    loginAttempts.delete(clientIp);

    const token = generateToken({ role: 'admin', id: 'main' });
    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('Error autenticando:', error);
    return NextResponse.json({ error: 'Autenticación fallida' }, { status: 500 });
  }
}
