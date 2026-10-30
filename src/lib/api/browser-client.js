export function readStoredSession() {
  try { return JSON.parse(localStorage.getItem('readagora-session') || 'null'); } catch { return null; }
}

export function createBrowserApi({ apiUrl, supabaseUrl, supabaseKey, state }) {
  let refreshFlight = null;
  function saveSession(session) {
    state.session = session || null;
    try {
      if (session) localStorage.setItem('readagora-session', JSON.stringify(session));
      else localStorage.removeItem('readagora-session');
    } catch { /* Keep the authenticated session in memory when browser storage is unavailable. */ }
  }

  async function refreshSession() {
    const session = state.session;
    if (!session?.refresh_token || !supabaseUrl || !supabaseKey) return null;
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
        if ([400, 401, 403].includes(response.status)) { saveSession(null); state.user = null; }
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
    if (!apiUrl) throw new Error('ReadAgora API is not configured. Set NEXT_PUBLIC_READAGORA_API_URL to the mobile app backend.');
    const requestUserId = state.session?.user?.id;
    const accessToken = state.session?.access_token;
    if (accessToken && !options.skipAuth) headers.Authorization = `Bearer ${accessToken}`;
    let response;
    try {
      response = await fetch(`${apiUrl}${path}`, { method: options.method || 'GET', headers, ...(options.body ? { body: isFormData ? options.body : JSON.stringify(options.body) } : {}), signal: AbortSignal.timeout(60_000) });
    } catch (error) {
      if (error?.name === 'TimeoutError') throw new Error('The ReadAgora server took too long to respond. Please try again.');
      throw new Error('The ReadAgora server could not be reached. Check your connection and try again.');
    }
    if (response.status === 401 && !retried && !options.skipAuth) {
      // Another request may already have refreshed while this one was pending.
      const newerSession = state.session?.access_token && state.session.access_token !== accessToken;
      const refreshed = newerSession || await refreshSession();
      const accountChanged = requestUserId && state.session?.user?.id && requestUserId !== state.session.user.id;
      // Never replay an old account's action under a different signed-in user.
      if (refreshed && !accountChanged) return api(path, options, true);
    }
    const body = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message || body?.error || body?.message || `Request failed (${response.status})`);
    return body?.data ?? body;
  }

  return { api, saveSession, refreshSession };
}
