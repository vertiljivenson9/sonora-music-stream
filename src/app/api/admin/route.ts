import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';

// No password required — open access
export async function POST() {
  const token = generateToken({ role: 'admin', id: 'main' });
  return NextResponse.json({ success: true, token });
}
