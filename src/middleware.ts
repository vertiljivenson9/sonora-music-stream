import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Public routes (GET requests to read songs)
  if (method === 'GET' && (pathname === '/api/songs' || pathname.match(/^\/api\/songs\/[^/]+$/))) {
    return NextResponse.next();
  }

  // Allow login endpoint without token
  if (method === 'POST' && pathname === '/api/admin') {
    return NextResponse.next();
  }

  // Protect all other API routes (write operations)
  if (pathname.startsWith('/api/songs') || pathname.startsWith('/api/upload') || pathname.startsWith('/api/admin')) {
    const token = request.headers.get('x-admin-token');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/songs/:path*', '/api/upload/:path*', '/api/admin/:path*'],
};
