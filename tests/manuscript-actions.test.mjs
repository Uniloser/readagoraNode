import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createManuscriptActions } from '../src/features/workroom/manuscript-actions.js';

function setup(api, title = 'Chapter') {
  const job = { storyId: 'story', importId: 'import', preview: { chapters: [{ title: 'Old', html: '<p>Text</p>' }] } };
  const state = { page: 'manuscript-import', pageData: { story: { id: 'story' } }, workroomImport: job };
  const navigated = [], requests = [];
  let renders = 0;
  const actions = createManuscriptActions({ state, app: { querySelector: () => ({ value: title }) },
    api: async (...args) => { requests.push(args); return api(...args); },
    render: () => renders++, navigate: path => navigated.push(path),
  });
  return { ...actions, state, job, navigated, requests, renders: () => renders };
}
const control = dataset => ({ dataset: dataset || {} });

test('import commit uses edited titles and rejects duplicate commit/cancel while pending', async () => {
  let release;
  const h = setup(() => new Promise(resolve => { release = resolve; }));
  const pending = h.handleAction('import-commit', control());
  await h.handleAction('import-commit', control());
  await h.handleAction('import-cancel', control());
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.requests[0][1].body.chapters, [{ title: 'Chapter', html: '<p>Text</p>', order: 1 }]);
  release({}); await pending;
  assert.equal(h.state.workroomImport, null);
  assert.deepEqual(h.navigated, ['/workroom/story/story']);
});

test('late import completion cannot clear a newer import or navigate from another page', async () => {
  for (const action of ['import-commit', 'import-cancel']) {
    let release;
    const h = setup(() => new Promise(resolve => { release = resolve; }));
    const pending = h.handleAction(action, control());
    const replacement = { storyId: 'other' };
    h.state.page = 'profile'; h.state.workroomImport = replacement;
    release({}); await pending;
    assert.equal(h.state.workroomImport, replacement);
    assert.deepEqual(h.navigated, []);
    assert.equal(h.renders(), 1);
  }
});

test('failed cancellation preserves the preview and allows retry', async () => {
  let fail = true;
  const h = setup(async () => { if (fail) throw new Error('Unavailable'); });
  await h.handleAction('import-cancel', control());
  assert.equal(h.state.workroomImport, h.job);
  assert.equal(h.job.busy, false);
  assert.equal(h.state.pageError, 'Unavailable');
  assert.deepEqual(h.navigated, []);
  fail = false; await h.handleAction('import-cancel', control());
  assert.equal(h.state.workroomImport, null);
});

test('empty titles block commit and invalid moves leave chapters intact', async () => {
  const h = setup(async () => assert.fail('Must not call backend'), '');
  await h.handleAction('import-commit', control());
  assert.match(h.state.pageError, /every chapter a title/);
  assert.equal(h.job.preview.chapters[0].title, '');
  await h.handleAction('import-move', control({ index: '0', direction: '-1' }));
  assert.equal(h.job.preview.chapters.length, 1);
});
