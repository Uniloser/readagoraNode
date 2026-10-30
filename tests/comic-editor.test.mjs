import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createComicEditorActions } from '../src/features/workroom/comic-editor.js';

function setup(api) {
  const state = { page: 'chapter-editor', comicImportUrlOpen: true, pageData: {
    story: { id: 'story' }, chapter: { id: 'chapter' },
    panels: [{ id: 'one', image_url: 'https://example.org/one.png' }, { id: 'two' }],
  } };
  const loads = [], requests = [];
  let renders = 0;
  const actions = createComicEditorActions({ state, app: {},
    api: async (...args) => { requests.push(args); return api(...args); },
    loadPage: async (...args) => loads.push(args), render: () => renders++,
  });
  return { state, loads, requests, renders: () => renders, ...actions };
}

test('comic reorder, duplicate, delete and URL import ignore completion after navigation', async () => {
  for (const action of ['comic-move-panel', 'comic-duplicate-panel', 'delete-panel', 'comic-url']) {
    let release;
    const h = setup(() => new Promise(resolve => { release = resolve; }));
    const pending = action === 'comic-url'
      ? h.handleForm(action, {}, { image_url: 'https://example.org/page.png' })
      : h.handleAction(action, { dataset: { id: 'one', direction: '1' } });
    const replacement = { story: { id: 'next-story' }, chapter: { id: 'next-chapter' }, panels: [] };
    h.state.pageData = replacement;
    release([{ id: 'late' }]);
    await pending;
    assert.equal(h.state.pageData, replacement);
    assert.deepEqual(replacement.panels, []);
    assert.deepEqual(h.loads, []);
    assert.equal(h.renders(), 0);
    assert.equal(h.state.comicImportUrlOpen, true);
  }
});

test('comic actions apply results in the original active editor', async () => {
  const h = setup(async () => [{ id: 'two' }, { id: 'one' }]);
  await h.handleAction('comic-move-panel', { dataset: { id: 'one', direction: '1' } });
  assert.deepEqual(h.requests[0][1].body.panels, [{ id: 'two', panel_order: 1 }, { id: 'one', panel_order: 2 }]);
  assert.deepEqual(h.state.pageData.panels.map(p => p.id), ['two', 'one']);
  assert.equal(h.renders(), 1);
  await h.handleForm('comic-url', {}, { image_url: 'https://example.org/page.png' });
  assert.equal(h.state.comicImportUrlOpen, false);
  assert.deepEqual(h.loads, [['chapter-editor', { storyId: 'story', chapterId: 'chapter' }]]);
});

test('comic errors reach the active editor but not a departed page', async () => {
  const h = setup(async () => { throw new Error('Panel failed'); });
  await assert.rejects(h.handleAction('delete-panel', { dataset: { id: 'one' } }), /Panel failed/);
  let reject;
  const delayed = setup(() => new Promise((resolve, fail) => { reject = fail; }));
  const pending = delayed.handleAction('delete-panel', { dataset: { id: 'one' } });
  delayed.state.page = 'profile';
  reject(new Error('Late failure'));
  await pending;
  assert.deepEqual(delayed.loads, []);
});
