import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFormController } from '../src/features/forms/controller.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(t, { api, ensureTerms = async () => {}, type = 'chapter-comment', formValues }) {
  const properties = new Map(['FormData', 'location'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const values = formValues || (type === 'chapter-comment' ? { text: 'Fixture comment', parent_comment_id: '', quote: '' } : { post_id: 'post', content: 'Fixture reply' });
  Object.defineProperty(globalThis, 'FormData', { configurable: true, value: class { entries() { return Object.entries(values); } append() {} } });
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { pathname: '/read/story/chapter' } });
  t.after(() => { for (const [key, descriptor] of properties) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]; });
  const state = { chapter: { id: 'chapter' }, story: { id: 'story' }, page: 'community-post', pageData: { post: { id: 'post' } }, comments: [] };
  let renders = 0;
  const loads = [];
  const form = { dataset: { form: type }, isConnected: true, querySelector: () => null, querySelectorAll: () => [], setAttribute() {}, removeAttribute() {} };
  const { handleFormSubmit } = createFormController({ state, app: {}, api, ensureTerms, handleComicEditorForm: async () => false,
    render: () => { renders++; }, loadPage: async (...args) => loads.push(args), loadStory: async (...args) => loads.push(args),
  });
  return { state, form, renders: () => renders, loads, submit: () => handleFormSubmit({ currentTarget: form, preventDefault() {} }) };
}

test('chapter navigation during terms checking prevents posting under the new chapter', async t => {
  let release;
  const h = setup(t, { ensureTerms: async () => new Promise(resolve => { release = resolve; }), api: async () => assert.fail('Must not post') });
  const pending = h.submit();
  await tick();
  h.state.chapter = { id: 'other-chapter' };
  release();
  await pending;
  assert.equal(h.renders(), 0);
});

test('manuscript upload completion preserves a newer import after navigation', async t => {
  let release;
  const h = setup(t, { type: 'manuscript-import', formValues: { story_id: 'story', manuscript: new File(['fixture'], 'fixture.docx') },
    api: async path => path === '/imports' ? new Promise(resolve => { release = resolve; }) : { chapters: [{ title: 'Imported' }] },
  });
  h.state.page = 'manuscript-import'; h.state.pageData = { story: { id: 'story' } };
  const pending = h.submit();
  await tick();
  const oldJob = h.state.workroomImport;
  const replacement = { storyId: 'other', stage: 'upload' };
  h.state.page = 'profile'; h.state.workroomImport = replacement;
  release({ importId: 'import' });
  await pending;
  assert.equal(h.state.workroomImport, replacement);
  assert.equal(oldJob.stage, 'preview');
  assert.equal(h.renders(), 1);
});

test('a completed chapter comment cannot update another route with retained reader state', async t => {
  let release;
  const h = setup(t, { api: async () => new Promise(resolve => { release = resolve; }) });
  const pending = h.submit();
  await tick();
  location.pathname = '/profile';
  release({ id: 'created' });
  await pending;
  assert.deepEqual(h.state.comments, []);
  assert.equal(h.renders(), 0);
});

test('community reply completion cannot reopen a departed post', async t => {
  let release;
  const h = setup(t, { type: 'post-comment', api: async () => new Promise(resolve => { release = resolve; }) });
  const pending = h.submit();
  await tick();
  h.state.page = 'library'; h.state.pageData = { library: [] };
  release({ id: 'created' });
  await pending;
  assert.deepEqual(h.loads, []);
});
