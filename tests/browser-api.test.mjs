import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/lib/api/browser-client.js', import.meta.url), 'utf8');
const { createBrowserApi, readStoredSession } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const oldSession = () => ({ access_token: 'expired-fixture', refresh_token: 'refresh-fixture' });
const renewed = { access_token: 'renewed-fixture', refresh_token: 'rotated-fixture' };
const reply = (status, body) => new Response(JSON.stringify(body), { status });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function storage(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)}});
  t.after(() => previous ? Object.defineProperty(globalThis, 'localStorage', previous) : delete globalThis.localStorage);
  return values;
}
function client(state) {
  return createBrowserApi({ apiUrl: 'https://api.example.test', supabaseUrl: 'https://auth.example.test', supabaseKey: 'public-fixture', state });
}

test('parallel expired requests share one refresh and both retry with the renewed session', async t => {
  const state = { session: oldSession() };
  const gate = deferred();
  let refreshes = 0;
  let expiredRequests = 0;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.startsWith('https://auth.')) {
      refreshes++;
      await gate.promise;
      return reply(200, renewed);
    }
    if (init.headers.Authorization === 'Bearer expired-fixture') {
      if (++expiredRequests === 2) gate.resolve();
      return reply(401, { message: 'Expired' });
    }
    assert.equal(init.headers.Authorization, 'Bearer renewed-fixture');
    return reply(200, { data: { loaded: true } });
  });
  const api = client(state).api;
  assert.deepEqual(await Promise.all([api('/story'), api('/chapters')]), [{ loaded: true }, { loaded: true }]);
  assert.equal(refreshes, 1);
  assert.equal(state.session.access_token, renewed.access_token);
});

test('a delayed 401 uses an already renewed token without refreshing again', async t => {
  const state = { session: oldSession() };
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.ok(url.startsWith('https://api.'));
    if (++calls === 1) { state.session = renewed; return reply(401, {}); }
    assert.equal(init.headers.Authorization, 'Bearer renewed-fixture');
    return reply(200, { data: 'loaded' });
  });
  assert.equal(await client(state).api('/story'), 'loaded');
  assert.equal(calls, 2);
});

test('sign-out during refresh is preserved when the response arrives', async t => {
  const state = { session: oldSession() };
  const gate = deferred();
  t.mock.method(globalThis, 'fetch', async () => { await gate.promise; return reply(200, renewed); });
  const api = client(state);
  const pending = api.refreshSession();
  api.saveSession(null);
  gate.resolve();
  assert.equal(await pending, null);
  assert.equal(state.session, null);
});

test('a newer login is preserved when an older refresh fails', async t => {
  const state = { session: oldSession(), user: { id: 'new-user' } };
  const gate = deferred();
  t.mock.method(globalThis, 'fetch', async () => { await gate.promise; return reply(400, {}); });
  const api = client(state);
  const pending = api.refreshSession();
  api.saveSession(renewed);
  gate.resolve();
  assert.equal(await pending, renewed);
  assert.equal(state.session, renewed);
  assert.equal(state.user.id, 'new-user');
});

test('temporary auth outage keeps the session; rejected refresh clears it', async t => {
  const original = oldSession();
  const state = { session: original, user: { id: 'fixture' } };
  let status = 503;
  t.mock.method(globalThis, 'fetch', async () => reply(status, {}));
  const api = client(state);
  assert.equal(await api.refreshSession(), null);
  assert.equal(state.session, original);
  status = 400;
  assert.equal(await api.refreshSession(), null);
  assert.equal(state.session, null);
  assert.equal(state.user, null);
});

test('an old account request is never replayed after switching users', async t => {
  const state = { session: { ...oldSession(), user: { id: 'first-account' } } };
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    state.session = { ...renewed, user: { id: 'second-account' } };
    return reply(401, { message: 'Expired session' });
  });
  await assert.rejects(client(state).api('/drafts', { method: 'POST', body: { title: 'Fixture' } }), /Expired session/);
  assert.equal(calls, 1);
  assert.equal(state.session.user.id, 'second-account');
});

test('a refresh network failure preserves login and allows a later retry', async t => {
  const original = oldSession();
  const state = { session: original };
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    if (++calls === 1) throw new TypeError('Network unavailable');
    return reply(200, renewed);
  });
  const api = client(state);
  await assert.rejects(api.refreshSession(), /sign-in service could not be reached/);
  assert.equal(state.session, original);
  assert.deepEqual(await api.refreshSession(), renewed);
  assert.equal(calls, 2);
});

test('a rejected access token without a refresh token clears the stale session', async t => {
  const state = { session: {access_token: 'expired'}, user: {id: 'reader'} };
  const stored = storage(t);
  stored.set('readagora-session', JSON.stringify(state.session));
  let expired = 0, requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {requests++; return reply(401, {error: 'Authentication is required'});});
  const api = createBrowserApi({apiUrl: 'https://api.example.test', supabaseUrl: 'https://auth.example.test', supabaseKey: 'public', state, onSessionExpired: () => expired++});
  await assert.rejects(api.api('/users/me'), error => error.status === 401 && error.code === 'SESSION_EXPIRED');
  assert.equal(state.session, null);
  assert.equal(state.user, null);
  assert.equal(expired, 1);
  assert.equal(requests, 1);
  assert.equal(stored.has('readagora-session'), false);
});

test('a 401 after successful refresh signs out instead of looping on retry', async t => {
  const state = {session: oldSession()};
  let requests = 0, refreshes = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.startsWith('https://auth.')) {refreshes++; return reply(200, renewed);}
    requests++;
    return reply(401, {error: 'Invalid or expired access token'});
  });
  await assert.rejects(client(state).api('/users/me'), error => error.code === 'SESSION_EXPIRED');
  assert.equal(requests, 2);
  assert.equal(refreshes, 1);
  assert.equal(state.session, null);
});

test('refresh outages are retryable errors and do not expire the session', async t => {
  const original = oldSession(), state = {session: original};
  t.mock.method(globalThis, 'fetch', async url => url.startsWith('https://auth.') ? reply(503, {}) : reply(401, {}));
  await assert.rejects(client(state).api('/users/me'), error => error.status === 503 && error.code === 'AUTH_UNAVAILABLE');
  assert.equal(state.session, original);
});

test('a delayed rejected retry cannot sign out a newer login', async t => {
  const state = {session: oldSession()};
  let requests = 0;
  const newerLogin = {...renewed, access_token: 'another-new-token', user: {id: 'new-reader'}};
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.startsWith('https://auth.')) return reply(200, renewed);
    if (++requests === 2) state.session = newerLogin;
    return reply(401, {error: 'Invalid or expired access token'});
  });
  await assert.rejects(client(state).api('/users/me'), /Invalid or expired/);
  assert.equal(state.session, newerLogin);
});

test('missing refresh configuration keeps login and exposes a retryable error', async t => {
  const original = oldSession(), state = {session: original};
  t.mock.method(globalThis, 'fetch', async () => reply(401, {}));
  const api = createBrowserApi({apiUrl: 'https://api.example.test', supabaseUrl: '', supabaseKey: '', state});
  await assert.rejects(api.api('/users/me'), error => error.status === 503 && error.code === 'AUTH_UNAVAILABLE');
  assert.equal(state.session, original);
});

test('a stored session without an access token is discarded on startup', t => {
  const stored = storage(t);
  stored.set('readagora-session', JSON.stringify({user: {id: 'reader'}}));
  assert.equal(readStoredSession(), null);
  assert.equal(stored.has('readagora-session'), false);
});

test('incorrect login credentials do not expire an existing session', async t => {
  const original = oldSession(), state = {session: original};
  t.mock.method(globalThis, 'fetch', async () => reply(401, {message: 'Invalid credentials'}));
  await assert.rejects(client(state).api('/auth/signin', {method: 'POST', skipAuth: true, body: {email: 'reader@example.test'}}), /Invalid credentials/);
  assert.equal(state.session, original);
});
