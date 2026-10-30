import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPageLoader } from '../src/features/pages/loader.js';

function setup({ chapter = { id: 'chapter', story_id: 'story', content_type: 'comic' }, chapters = [{ id: 'chapter' }], panels = async () => [] } = {}) {
  const state = {}, requested = [];
  let restores = 0;
  const loader = createPageLoader({ state, render() {}, restoreChapterDraft() { restores++; },
    api: async path => {
      requested.push(path);
      if (path === '/stories/story') return { id: 'story', content_type: 'text' };
      if (path === '/stories/story/chapters') return chapters;
      if (path === '/chapters/chapter') return chapter;
      if (path.endsWith('/panels')) return panels();
      throw new Error(`Unexpected request ${path}`);
    },
  });
  return { state, requested, restores: () => restores, ...loader };
}
const route = { storyId: 'story', chapterId: 'chapter' };

test('failed comic page loading exposes a retryable editor error instead of an empty comic', async () => {
  const h = setup({ panels: async () => { throw new Error('Comic pages unavailable'); } });
  await h.loadPage('chapter-editor', route);
  assert.equal(h.state.pageData, null);
  assert.equal(h.state.pageError, 'Comic pages unavailable');
  assert.equal(h.state.pageLoadError, true);
  assert.equal(h.state.pageLoading, false);
  assert.equal(h.restores(), 0);
});

test('editor rejects mismatched or unlisted chapters before loading panels or restoring drafts', async () => {
  for (const fixture of [{ chapter: { id: 'chapter', story_id: 'other', content_type: 'comic' } }, { chapters: [] }, { chapter: { id: 'different', story_id: 'story', content_type: 'comic' }, chapters: [{ id: 'different' }] }]) {
    const h = setup(fixture);
    await h.loadPage('chapter-editor', route);
    assert.match(h.state.pageError, /does not belong/);
    assert.equal(h.requested.some(path => path.endsWith('/panels')), false);
    assert.equal(h.restores(), 0);
  }
});

test('empty comic pages are accepted only after a successful response', async () => {
  const h = setup();
  await h.loadPage('chapter-editor', route);
  assert.deepEqual(h.state.pageData.panels, []);
  assert.equal(h.state.pageError, '');
  assert.equal(h.restores(), 1);
});

test('stale chapter loading cannot request panels or restore an old draft', async () => {
  const h = setup();
  const pending = h.loadPage('chapter-editor', route);
  h.invalidate();
  await pending;
  assert.equal(h.requested.some(path => path.endsWith('/panels')), false);
  assert.equal(h.restores(), 0);
});
