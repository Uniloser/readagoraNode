import test from 'node:test';
import assert from 'node:assert/strict';
import {loadStoryCompetitions} from '../src/lib/shared/story-competitions.js';

test('dedicated membership lookup avoids scanning event lists', async () => {
  const calls = [], events = [{id: 'event', entries: [{id: 'story'}]}];
  const result = await loadStoryCompetitions(async path => {calls.push(path); return events;}, 'story');
  assert.deepEqual(result, events);
  assert.deepEqual(calls, ['/events/story/story']);
});
test('older APIs find a story after the first leaderboard page', async () => {
  const calls = [];
  const result = await loadStoryCompetitions(async path => {
    calls.push(path);
    if (path === '/events/story/story') throw Error('Not found');
    if (path === '/events/voting') return [{id: 'event', votingOpen: true, entries: [{id: 'other'}], nextOffset: 50}];
    return {id: 'event', votingOpen: true, entries: [{id: 'story'}], nextOffset: null};
  }, 'story');
  assert.equal(result[0].entries[0].id, 'story');
  assert.equal(calls.at(-1), '/events/event?offset=50');
});
test('closed events and nonmembers cannot produce a voting shortcut', async () => {
  const result = await loadStoryCompetitions(async path => {
    if (path.startsWith('/events/story/')) throw Error('Not found');
    return [{id: 'closed', votingOpen: false, entries: [{id: 'story'}]}, {id: 'open', votingOpen: true, entries: [], nextOffset: null}];
  }, 'story');
  assert.deepEqual(result, []);
});
