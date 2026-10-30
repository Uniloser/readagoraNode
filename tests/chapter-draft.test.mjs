import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function moduleAt(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { createChapterDraftSaver } = await moduleAt('../src/features/forms/chapter-draft.js');
const { createChapterDraftRecovery } = await moduleAt('../src/features/forms/chapter-draft-recovery.js');
const { createChapterPublisher } = await moduleAt('../src/features/workroom/chapter-publication.js');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(t, api) {
  const store = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => store.get(key) || null,
    removeItem: key => store.delete(key),
  } });
  t.after(() => previous ? Object.defineProperty(globalThis, 'localStorage', previous) : delete globalThis.localStorage);
  const state = { pageData: { story: { content_type: 'text' }, chapter: { id: 'first', title: 'Title', content: 'original' } }, chapterDraftRevision: 1, chapterDraftDirty: true };
  const title = { value: 'Title' }, editor = { innerHTML: 'first revision' }, status = { isConnected: true, textContent: '' };
  const app = { querySelector: selector => ({ '[data-chapter-title]': title, '[data-chapter-content]': editor, '[data-save-status]': status })[selector] };
  const recovery = createChapterDraftRecovery({ state });
  return { state, title, editor, status, store, recovery, ...createChapterDraftSaver({ state, app, api, chapterDraftRecovery: recovery }) };
}

test('edits made during a pending save are persisted before save resolves', async t => {
  const requests = [];
  let release;
  const h = setup(t, async (path, options) => {
    requests.push(options.body.content);
    if (requests.length === 1) await new Promise(resolve => { release = resolve; });
  });
  const saving = h.saveChapterDraft();
  await tick();
  h.editor.innerHTML = 'latest revision';
  h.state.chapterDraftRevision++;
  release();
  assert.equal(await saving, true);
  assert.deepEqual(requests, ['first revision', 'latest revision']);
  assert.equal(h.state.chapterDraftDirty, false);
  assert.equal(h.status.textContent, 'All changes saved');
});

test('a late save cannot clear dirty state or errors on a different chapter', async t => {
  let release;
  const h = setup(t, async () => new Promise(resolve => { release = resolve; }));
  const saving = h.saveChapterDraft();
  await tick();
  h.state.pageData.chapter = { id: 'second' };
  h.state.chapterDraftRevision = 1;
  h.state.pageError = 'Current chapter error';
  release();
  assert.equal(await saving, false);
  assert.equal(h.state.chapterDraftDirty, true);
  assert.equal(h.state.pageError, 'Current chapter error');
});

test('a failed save on a departed chapter does not set the current page error', async t => {
  let reject;
  const h = setup(t, async () => new Promise((resolve, fail) => { reject = fail; }));
  const saving = h.saveChapterDraft();
  await tick();
  h.state.pageData.chapter = { id: 'second' };
  reject(new Error('Old save failed'));
  assert.equal(await saving, false);
  assert.equal(h.state.pageError, undefined);
});

test('a queued save for a different chapter starts only after the old save finishes', async t => {
  const requests = [];
  let release;
  const h = setup(t, async path => {
    requests.push(path);
    if (requests.length === 1) await new Promise(resolve => { release = resolve; });
  });
  const first = h.saveChapterDraft();
  await tick();
  h.state.pageData.chapter = { id: 'second', title: 'Second', content: '' };
  const second = h.saveChapterDraft();
  release();
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.deepEqual(requests, ['/chapters/first', '/chapters/second']);
});

test('publication waits for a successful save and uses the captured story', async () => {
  const state = { pageData: { story: { id: 'story' }, chapter: { id: 'chapter' } } };
  const calls = [];
  const publish = createChapterPublisher({ state,
    saveChapterDraft: async () => { calls.push('save'); return true; },
    api: async (path, options) => { calls.push([path, options.body.status]); },
    loadPage: async (page, args) => { calls.push([page, args]); },
  });
  assert.equal(await publish('chapter', 'published'), true);
  assert.deepEqual(calls, ['save', ['/chapters/chapter/status', 'published'], ['chapter-editor', { storyId: 'story', chapterId: 'chapter' }]]);
});

test('failed saving or navigation during saving prevents publication', async () => {
  for (const changePage of [false, true]) {
    const state = { pageData: { story: { id: 'story' }, chapter: { id: 'chapter' } } };
    const publish = createChapterPublisher({ state,
      saveChapterDraft: async () => { if (changePage) state.pageData = {}; return changePage; },
      api: async () => assert.fail('Must not publish'),
      loadPage: async () => assert.fail('Must not reload'),
    });
    assert.equal(await publish('chapter', 'published'), false);
  }
});

test('publication completion does not pull the user back after navigation', async () => {
  const state = { pageData: { story: { id: 'story' }, chapter: { id: 'chapter' } } };
  const publish = createChapterPublisher({ state,
    saveChapterDraft: async () => true,
    api: async () => { state.pageData = {}; },
    loadPage: async () => assert.fail('Must not reopen the departed editor'),
  });
  assert.equal(await publish('chapter', 'published'), true);
});
