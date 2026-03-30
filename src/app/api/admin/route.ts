import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const admin = await db.adminConfig.findUnique({ where: { id: 'main' } });

    if (!admin || admin.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create a session token (simple for now)
    const token = Buffer.from(`admin:${Date.now()}`).toString('base64');

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('Error authenticating:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
