import { safeInternalPath } from './redirects.js';

function base64Url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function beginGoogleOAuth({ supabaseUrl, supabaseKey, returnTo = '/' }) {
  if (!supabaseUrl || !supabaseKey) throw new Error('Google sign-in is not configured for this website.');

  const safeReturn = safeInternalPath(returnTo);
  sessionStorage.setItem('readagora-oauth-return', safeReturn);

  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64Url(new Uint8Array(digest));
  sessionStorage.setItem('readagora-pkce-verifier', verifier);

  const authorize = new URL(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/authorize`);
  authorize.searchParams.set('provider', 'google');
  authorize.searchParams.set('redirect_to', `${location.origin}/auth/callback`);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 's256');
  location.assign(authorize.toString());
}

export async function completeGoogleOAuth({ supabaseUrl, supabaseKey }) {
  if (location.pathname !== '/auth/callback') return null;

  const params = new URLSearchParams(location.search);
  const returnTo = sessionStorage.getItem('readagora-oauth-return') || '/';
  sessionStorage.removeItem('readagora-oauth-return');
  const clearVerifier = () => sessionStorage.removeItem('readagora-pkce-verifier');

  const failure = params.get('error_description') || params.get('error');
  if (failure) { clearVerifier(); throw new Error(failure); }

  const code = params.get('code');
  if (!code || !supabaseUrl || !supabaseKey) { clearVerifier(); throw new Error('Sign-in could not be completed. Please try again.'); }

  const verifier = sessionStorage.getItem('readagora-pkce-verifier');
  if (!verifier) throw new Error('This sign-in link has expired. Please try again.');

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.access_token) {
      throw new Error(payload?.msg || payload?.message || 'Google sign-in could not be completed. Please try again.');
    }
    clearVerifier();
    return { session: payload, returnTo: safeInternalPath(returnTo) };
  } catch (error) {
    clearVerifier();
    throw error;
  }
}

