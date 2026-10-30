import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/lib/api/browser-client.js', import.meta.url), 'utf8');
const { createBrowserApi } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const oldSession = () => ({ access_token: 'expired-fixture', refresh_token: 'refresh-fixture' });
const renewed = { access_token: 'renewed-fixture', refresh_token: 'rotated-fixture' };
const reply = (status, body) => new Response(JSON.stringify(body), { status });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
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
