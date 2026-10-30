import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notificationLink } from '../src/features/profile/notification-link.js';
import { createAccountAndWorkroomActions } from '../src/features/pages/actions.js';
const story = '695713af-9c07-4782-8081-311d8711e514';
const chapter = 'ee4e0e36-b8cd-4e93-a76c-c58bab4971b0';
test('chapter and comment notifications have direct reader links including data payloads', () => {
  assert.equal(notificationLink({ notification_type: 'comment', story_id: story, chapter_id: chapter }), `/read/${story}/${chapter}`);
  assert.equal(notificationLink({ notification_type: 'chapter_published', data: { story_id: story, chapter_id: chapter } }), `/read/${story}/${chapter}`);
});

test('notification completion cannot navigate after leaving the inbox', async () => {
  let release;
  const state = { page: 'profile-inbox', pageData: { notifications: [] } };
  const navigated = [];
  const actions = createAccountAndWorkroomActions({ state,
    api: () => new Promise(resolve => { release = resolve; }),
    navigate: path => navigated.push(path), render() {},
  });
  const pending = actions.handleAction('open-notification', { dataset: { id: 'notification' }, getAttribute: () => `/read/${story}/${chapter}` }, { preventDefault() {} });
  state.page = 'profile'; state.pageData = {};
  release({}); await pending;
  assert.deepEqual(navigated, []);
});
test('story and follower notifications retain their destinations and malformed IDs are rejected', () => {
  assert.equal(notificationLink({ notification_type: 'story_published', story_id: story }), `/story/${story}`);
  assert.equal(notificationLink({ notification_type: 'comment', story_id: story, chapter_id: 'bad' }), `/story/${story}`);
  assert.equal(notificationLink({ notification_type: 'new_follower', actor: { username: 'a b' } }), '/creator/a%20b');
  assert.equal(notificationLink({ story_id: 'invalid' }), '');
});
