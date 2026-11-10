export function readStoredSession() {
  try {
    const session = JSON.parse(localStorage.getItem('readagora-session') || 'null');
    if (session && (typeof session.access_token !== 'string' || !session.access_token.trim())) {
      localStorage.removeItem('readagora-session');
      return null;
    }
    return session;
  } catch { return null; }
}

export class BrowserApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'BrowserApiError';
    this.status = status;
    this.code = code;
  }
}

export function createBrowserApi({ apiUrl, supabaseUrl, supabaseKey, state, onSessionExpired = () => {} }) {
  let refreshFlight = null;
  function saveSession(session) {
    state.session = session || null;
    if (!session) state.user = null;
    try {
      if (session) localStorage.setItem('readagora-session', JSON.stringify(session));
      else localStorage.removeItem('readagora-session');
    } catch { /* Keep the authenticated session in memory when browser storage is unavailable. */ }
  }

  function expireSession(expected) {
    // An old request must never clear a newer login or token refresh.
    if (!expected || state.session !== expected) return;
    saveSession(null);
    onSessionExpired();
  }

  async function refreshSession() {
    const session = state.session;
    if (!session) return null;
    if (!session.refresh_token) { expireSession(session); return null; }
    if (!supabaseUrl || !supabaseKey) {
      throw new BrowserApiError('Sign-in refresh is not configured. Please try again later.', 503, 'AUTH_UNAVAILABLE');
    }
    if (refreshFlight?.session === session) return refreshFlight.promise;
    const flight = { session, promise: null };
    flight.promise = (async () => {
      let response;
      try {
        response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST', headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: session.refresh_token }),
          signal: AbortSignal.timeout(60_000),
        });
      } catch (error) {
        if (state.session !== session) return state.session;
        if (error?.name === 'TimeoutError') throw new Error('The sign-in service took too long to respond. Please try again.');
        throw new Error('The sign-in service could not be reached. Check your connection and try again.');
      }
      const refreshed = await response.json().catch(() => null);
      // Sign-out or another sign-in wins over an older in-flight refresh.
      if (state.session !== session) return state.session;
      if (!response.ok || !refreshed?.access_token) {
        // A temporary auth-service outage must not destroy the saved login.
        if ([400, 401, 403].includes(response.status)) expireSession(session);
        return null;
      }
      saveSession(refreshed);
      return refreshed;
    })();
    refreshFlight = flight;
    try { return await flight.promise; }
    finally { if (refreshFlight === flight) refreshFlight = null; }
  }

  async function api(path, options = {}, retried = false) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = { Accept: 'application/json', ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
    if (!apiUrl) throw new Error('ReadAgora API is not configured. Set the same-origin API proxy path.');
    const requestSession = state.session;
    const requestUserId = state.session?.user?.id;
    const accessToken = state.session?.access_token;
    if (accessToken && !options.skipAuth) headers.Authorization = `Bearer ${accessToken}`;
    let response;
    try {
      response = await fetch(`${apiUrl}${path}`, { method: options.method || 'GET', cache: 'no-store', headers, ...(options.body ? { body: isFormData ? options.body : JSON.stringify(options.body) } : {}), signal: AbortSignal.timeout(60_000) });
    } catch (error) {
      if (error?.name === 'TimeoutError') throw new Error('The ReadAgora server took too long to respond. Please try again.');
      throw new Error('The ReadAgora server could not be reached. Check your connection and try again.');
    }
    if (response.status === 401 && !options.skipAuth) {
      // Another request may already have refreshed while this one was pending.
      const newerSession = state.session?.access_token && state.session.access_token !== accessToken;
      const refreshed = !retried && (newerSession || await refreshSession());
      const accountChanged = requestUserId && state.session?.user?.id && requestUserId !== state.session.user.id;
      // Never replay an old account's action under a different signed-in user.
      if (refreshed && !accountChanged) return api(path, options, true);
      if (!accountChanged && retried) expireSession(requestSession);
      if (!accountChanged && !retried && state.session === requestSession && requestSession) {
        // A temporary refresh outage should remain retryable, rather than signing out.
        throw new BrowserApiError('Your session could not be renewed right now. Please try again.', 503, 'AUTH_UNAVAILABLE');
      }
      if (!state.session) {
        throw new BrowserApiError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
      }
    }
    const body = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new BrowserApiError(body?.error?.message || body?.error || body?.message || `Request failed (${response.status})`, response.status);
    return body?.data ?? body;
  }

  return { api, saveSession, refreshSession };
}
