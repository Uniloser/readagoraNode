import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCommunityActions } from '../src/features/community/actions.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
const button = (dataset = {}) => ({ dataset, disabled: false, textContent: '' });

test('sharing exposes visible and accessible success only after completion', async () => {
  const originalLocation = globalThis.location;
  globalThis.location = { origin: 'https://readagora.example' };
  try {
    for (const result of ['copied', 'shared', 'cancelled', 'prompted']) {
      const label = { textContent: 'Share' };
      const attributes = {};
      const control = { dataset: { id: 'post' }, querySelector: () => label,
        setAttribute: (name, value) => { attributes[name] = value; } };
      let shared;
      const actions = createCommunityActions({ state: {}, share: async value => { shared = value; return result; } });
      await actions.handleAction('community-share', control);
      assert.equal(shared.url, 'https://readagora.example/community/post/post');
      if (result === 'copied' || result === 'shared') {
        assert.equal(control.dataset.shareStatus, result);
        assert.equal(label.textContent, result === 'copied' ? 'Copied' : 'Shared');
        assert.equal(attributes['aria-label'], result === 'copied' ? 'Post link copied' : 'Post shared');
      } else {
        assert.equal(control.dataset.shareStatus, undefined);
        assert.equal(label.textContent, 'Share');
      }
    }
  } finally {
    if (originalLocation === undefined) delete globalThis.location;
    else globalThis.location = originalLocation;
  }
});
function setup(api, page = 'community') {
  const state = { session: { user: { id: 'fixture' } }, page, communityTab: 'for-you', pageData: page === 'community' ? { items: [{ id: 'first' }], next_offset: 10 } : { post: { id: 'post' }, comments: [{ id: 'first' }], commentsNextOffset: 10 } };
  const loaded = [], navigated = [];
  let renders = 0;
  const actions = createCommunityActions({ state, api, app: {}, render: () => { renders++; },
    loadPage: async (...args) => { loaded.push(args); }, navigate: path => navigated.push(path),
    confirmAction: () => true, promptAction: () => 'Edited content',
  });
  return { state, loaded, navigated, renders: () => renders, ...actions };
}

test('feed pagination deduplicates posts and preserves existing items', async () => {
  const h = setup(async () => ({ items: [{ id: 'first' }, { id: 'next' }], next_offset: 20 }));
  await h.handleAction('community-load-more', button());
  assert.deepEqual(h.state.pageData.items.map(item => item.id), ['first', 'next']);
  assert.equal(h.state.communityLoadingMore, false);
  assert.equal(h.renders(), 1);
});

test('a delayed feed response cannot replace a different page or tab', async () => {
  let release;
  const h = setup(async () => new Promise(resolve => { release = resolve; }));
  const pending = h.handleAction('community-load-more', button());
  await tick();
  const newData = { user: { id: 'other-page' } };
  h.state.page = 'profile'; h.state.pageData = newData;
  release({ items: [{ id: 'late' }] });
  await pending;
  assert.equal(h.state.pageData, newData);
  assert.equal(h.renders(), 0);
});

test('late reply pagination cannot append comments to another post', async () => {
  let release;
  const h = setup(async () => new Promise(resolve => { release = resolve; }), 'community-post');
  const pending = h.handleAction('community-comment-load-more', button());
  await tick();
  const newData = { post: { id: 'second-post' }, comments: [] };
  h.state.pageData = newData;
  release({ items: [{ id: 'late-reply' }] });
  await pending;
  assert.equal(h.state.pageData, newData);
  assert.equal(h.renders(), 0);
});

test('voting and editing from a post detail reload that post instead of the feed', async () => {
  for (const action of ['community-vote', 'community-edit']) {
    const h = setup(async () => ({}), 'community-post');
    await h.handleAction(action, button({ id: 'post', index: '0' }));
    assert.deepEqual(h.loaded, [['community-post', 'post']]);
  }
});

test('deleting a post detail navigates to the feed after success', async () => {
  const h = setup(async () => ({}), 'community-post');
  await h.handleAction('community-delete', button({ id: 'post' }));
  assert.deepEqual(h.navigated, ['/community']);
  assert.deepEqual(h.loaded, []);
});

test('a completed reaction cannot reopen a page that the user left', async () => {
  let release;
  const h = setup(async () => new Promise(resolve => { release = resolve; }), 'community-post');
  const pending = h.handleAction('post-like', button({ id: 'post', enabled: 'false' }));
  await tick();
  h.state.page = 'library'; h.state.pageData = { library: [] };
  release({});
  await pending;
  assert.deepEqual(h.loaded, []);
  assert.deepEqual(h.navigated, []);
});
