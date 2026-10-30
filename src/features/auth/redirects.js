const LOCAL_ORIGIN = 'https://readagora.invalid';
const SIGNUP_RETURN_KEY = 'readagora-signup-return-v1';
const SIGNUP_RETURN_MAX_AGE = 24 * 60 * 60 * 1000;

export function safeInternalPath(candidate) {
  if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return '/';
  try {
    const url = new URL(candidate, LOCAL_ORIGIN);
    if (url.origin !== LOCAL_ORIGIN) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

export function authIntentHref(returnTo = '/', { action = 'default', entityId } = {}) {
  const params = new URLSearchParams({ action, returnTo: safeInternalPath(returnTo) });
  if (typeof entityId === 'string' && entityId.length <= 128) params.set('entityId', entityId);
  return `/auth/intent?${params.toString()}`;
}

export function saveSignupReturnPath(candidate) {
  try {
    localStorage.setItem(SIGNUP_RETURN_KEY, JSON.stringify({ path: safeInternalPath(candidate), createdAt: Date.now() }));
  } catch { /* Registration remains usable when browser storage is unavailable. */ }
}

export function takeSignupReturnPath() {
  try {
    const raw = localStorage.getItem(SIGNUP_RETURN_KEY);
    localStorage.removeItem(SIGNUP_RETURN_KEY);
    if (!raw) return '/';
    const intent = JSON.parse(raw);
    if (!Number.isFinite(intent?.createdAt) || Date.now() - intent.createdAt > SIGNUP_RETURN_MAX_AGE) return '/';
    return safeInternalPath(intent.path);
  } catch {
    return '/';
  }
}
