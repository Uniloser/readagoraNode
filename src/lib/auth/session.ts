import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'readora_session';
export type Session = { access_token?: string; refresh_token?: string; user?: { id?: string; email?: string; user_metadata?: { username?: string; display_name?: string } } };
export async function getSession(): Promise<Session | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try { const parsed = JSON.parse(value) as Session; return parsed && typeof parsed === 'object' ? parsed : null; } catch { return null; }
}
