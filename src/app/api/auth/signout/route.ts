import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: new Date(0) });
  return response;
}
