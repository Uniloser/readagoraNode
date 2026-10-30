import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/features/stories/loader.js', import.meta.url), 'utf8');
const { createStoryLoader } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const tick = () => new Promise(resolve => setImmediate(resolve));
const story = { id: 'story', author_id: 'author' };
const chapter = { id: 'chapter', story_id: 'story', content: 'Fixture text' };
function harness(t, override = {}) {
  const frames = [];
  const before = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  t.after(() => before ? Object.defineProperty(globalThis, 'navigator', before) : delete globalThis.navigator);
  globalThis.requestAnimationFrame = fn => frames.push(fn);
  t.after(() => delete globalThis.requestAnimationFrame);
  const state = { session: null, bookmarkedStoryIds: new Set(['saved']) };
  const calls = [];
  const api = async (path, options) => {
    calls.push({ path, options });
    if (override.api) return override.api(path, options);
    if (path === '/stories/story') return story;
    if (path === '/stories/story/chapters') return [{ id: 'chapter' }];
    if (path === '/chapters/chapter') return chapter;
    if (path.endsWith('/like')) return { liked: false, count: 3 };
    if (path.includes('/comments?')) return [];
    if (options?.method === 'POST') return null;
    throw new Error(`Unexpected request: ${path}`);
  };
  const loader = createStoryLoader({
    state, api, app: { querySelector: () => null }, render: () => {},
    readingProgress: { cancelScheduled() {}, sync() {}, markSynced() {} },
    speechPlayer: { stop() {} }, readerPositionKey: () => 'fixture',
    getOfflineStory: async () => null, getOfflineChapters: async () => [], getOfflineChapter: async () => null,
    ...override, api,
  });
  return { state, calls, frames, ...loader };
}

test('reader loads its chapter without story-detail-only requests', async t => {
  const h = harness(t);
  await h.loadStory('story', 'chapter');
  assert.equal(h.state.chapter, chapter);
  assert.equal(h.state.loading, false);
  assert.equal(h.state.error, '');
  assert.deepEqual([...h.state.bookmarkedStoryIds], ['saved']);
  assert.ok(!h.calls.some(({ path }) => /recommendations|bookmarks|follow/.test(path)));
  assert.equal(h.frames.length, 1);
});

test('a chapter absent from the story list is rejected before loading or tracking it', async t => {
  const h = harness(t);
  await h.loadStory('story', 'other-chapter');
  assert.match(h.state.error, /not available in this story/);
  assert.equal(h.state.chapter, null);
  assert.ok(!h.calls.some(({ path }) => path.startsWith('/chapters/')));
  assert.ok(!h.calls.some(({ options }) => options?.method));
});

test('a mismatched chapter payload cannot create views or progress for the story', async t => {
  const h = harness(t, { api: async path => {
    if (path === '/stories/story') return story;
    if (path.endsWith('/chapters')) return [{ id: 'chapter' }];
    return { ...chapter, story_id: 'different-story' };
  } });
  await h.loadStory('story', 'chapter');
  assert.match(h.state.error, /does not belong/);
  assert.equal(h.state.chapter, null);
  assert.ok(!h.calls.some(({ options }) => options?.method));
});

test('stale completion and scroll restoration cannot overwrite a newer route', async t => {
  let resolveStory;
  const h = harness(t, { api: async path => {
    if (path === '/stories/story') return new Promise(resolve => { resolveStory = resolve; });
    if (path.endsWith('/chapters')) return [{ id: 'chapter' }];
    throw new Error('A stale request must not load the chapter');
  } });
  const pending = h.loadStory('story', 'chapter');
  await tick();
  h.invalidate();
  resolveStory(story);
  await pending;
  assert.equal(h.state.story, null);
  assert.equal(h.frames.length, 0);
});

test('offline fallback rejects a cached chapter from a different story', async t => {
  const h = harness(t, {
    api: async () => { throw new Error('Offline'); },
    getOfflineStory: async () => story,
    getOfflineChapters: async () => [{ id: 'chapter' }],
    getOfflineChapter: async () => ({ ...chapter, story_id: 'other-story' }),
  });
  await h.loadStory('story', 'chapter');
  assert.equal(h.state.error, 'Offline');
  assert.equal(h.state.chapter, null);
});

test('scroll restoration is discarded if navigation happens after the chapter renders', async t => {
  const h = harness(t);
  await h.loadStory('story', 'chapter');
  h.invalidate();
  assert.doesNotThrow(() => h.frames[0]());
});

test('a valid downloaded chapter still opens when the backend is unavailable', async t => {
  const h = harness(t, {
    api: async () => { throw new Error('Offline'); },
    getOfflineStory: async () => story,
    getOfflineChapters: async () => [chapter],
    getOfflineChapter: async () => chapter,
  });
  await h.loadStory('story', 'chapter');
  assert.equal(h.state.chapter, chapter);
  assert.equal(h.state.isOffline, true);
  assert.equal(h.state.error, '');
});

test('likes and comments start together after the chapter is validated', async t => {
  const pending = new Map();
  const h = harness(t, { api: async (path, options) => {
    if (path === '/stories/story') return story;
    if (path.endsWith('/chapters')) return [chapter];
    if (path === '/chapters/chapter') return chapter;
    if (options?.method === 'POST') return null;
    return new Promise(resolve => pending.set(path, resolve));
  } });
  const loading = h.loadStory('story', 'chapter');
  await tick();
  assert.equal(pending.size, 2);
  pending.get('/chapters/chapter/like')({ liked: true, count: 4 });
  pending.get('/chapters/chapter/comments?limit=30&offset=0')([{ id: 'comment' }]);
  await loading;
  assert.equal(h.state.chapterLike.liked, true);
  assert.equal(h.state.comments.length, 1);
});
