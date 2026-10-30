import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { fetchAuthUpstream } from '@/lib/api/auth-proxy';

export async function POST(request: Request) {
  const base = (process.env.READAGORA_API_URL || '').replace(/\/$/, '');
  if (!base) return NextResponse.json({ error: 'Sign-in is not configured.' }, { status: 503 });
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  let upstream: Response;
  try {
    upstream = await fetchAuthUpstream(`${base}/auth/signin`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : undefined;
    const causeCode = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : undefined;
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    let backendHost = 'invalid-url';
    try { backendHost = new URL(base).host; } catch { /* Keep the diagnostic host safe when configuration is malformed. */ }
    console.error('[ReadAgora auth proxy] Sign-in backend request failed after retry.', { upstream: 'auth/signin', backendHost, errorName, ...(causeCode ? { causeCode } : {}) });
    return NextResponse.json({ error: 'Could not connect to ReadAgora’s backend. Check that the Render service is running, then try again.' }, { status: 502 });
  }
  const payload: unknown = await upstream.json().catch(() => null);
  const result = payload && typeof payload === 'object' && 'data' in payload ? (payload as { data?: unknown }).data : payload;
  const session = result && typeof result === 'object' && 'session' in result ? (result as { session?: unknown }).session : result;
  if (!upstream.ok || !session || typeof session !== 'object' || !('access_token' in session)) {
    const error = payload && typeof payload === 'object' && 'error' in payload ? (payload as { error?: unknown }).error : null;
    const message = typeof error === 'string' ? error : error && typeof error === 'object' && 'message' in error ? String(error.message) : upstream.ok ? 'The ReadAgora server did not return a sign-in session.' : 'Unable to sign in.';
    return NextResponse.json({ error: message }, { status: upstream.ok ? 502 : upstream.status });
  }
  const response = NextResponse.json({ ok: true, session });
  response.cookies.set(SESSION_COOKIE, JSON.stringify(session), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return response;
}
