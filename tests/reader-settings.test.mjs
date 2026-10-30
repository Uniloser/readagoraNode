import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindReaderSettings } from '../src/features/stories/reader-settings.js';

function disclosure() {
  const events = {};
  let focused = false;
  return { open: false, events, focused: () => focused,
    addEventListener(type, handler) { events[type] = handler; },
    querySelector() { return { focus() { focused = true; } }; },
  };
}
function setup() {
  const preferences = disclosure(), narration = disclosure();
  const app = { querySelector: () => null, querySelectorAll: selector =>
    selector === '.reader-settings' || selector === '.story-more-actions, .reader-settings' ? [preferences, narration] : [] };
  bindReaderSettings({ state: {}, app });
  return { preferences, narration };
}
test('reader panels close on Escape and return focus to their summary', () => {
  const { preferences } = setup();
  let prevented = false, stopped = false;
  preferences.open = true;
  preferences.events.keydown({ key: 'Escape', preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
  assert.equal(preferences.open, false);
  assert.equal(preferences.focused(), true);
  assert.equal(prevented && stopped, true);
});
test('opening narration closes preferences without moving focus', () => {
  const { preferences, narration } = setup();
  preferences.open = true; narration.open = true;
  narration.events.toggle();
  assert.equal(preferences.open, false);
  assert.equal(narration.open, true);
  assert.equal(narration.focused(), false);
  preferences.events.toggle();
  assert.equal(narration.open, true);
});
