import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateOfflineChapter } from '../src/lib/offline-library.js';
import { createStoryActions } from '../src/features/stories/actions.js';

test('offline downloads require matching published free chapter payloads', () => {
  const valid = { id: 'chapter', story_id: 'story', status: 'published', access_type: 'FREE', accessible: true };
  assert.doesNotThrow(() => validateOfflineChapter(valid, 'story', 'chapter'));
  for (const patch of [{ id: 'other' }, { story_id: 'other' }, { status: 'draft' }, { access_type: 'PREMIUM' }, { accessible: false }]) {
    assert.throws(() => validateOfflineChapter({ ...valid, ...patch }, 'story', 'chapter'));
  }
});

test('offline save deduplicates requests and cannot update a departed route', async t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { pathname: '/story/story' } });
  t.after(() => descriptor ? Object.defineProperty(globalThis, 'location', descriptor) : delete globalThis.location);
  let release, calls = 0, renders = 0;
  const state = { story: { id: 'story' }, chapters: [], offlineSaved: false };
  const actions = createStoryActions({ state, render: () => renders++,
    saveStoryOffline: () => { calls++; return new Promise(resolve => { release = resolve; }); },
  });
  const control = { dataset: { id: 'story' } };
  const pending = actions.handleAction('offline-save', control);
  await actions.handleAction('offline-save', control);
  assert.equal(calls, 1);
  location.pathname = '/profile';
  release({}); await pending;
  assert.equal(state.offlineSaved, false);
  assert.equal(renders, 1);
});
