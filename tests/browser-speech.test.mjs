import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentSpeechText, createBrowserSpeechPlayer } from '../src/features/stories/browser-speech.js';

test('speech segments bound long sentences and unbroken words without losing characters', () => {
  for (const text of ['word '.repeat(1200).trim(), 'x'.repeat(6000), '😀'.repeat(2001), 'Hello. '.repeat(700)]) {
    const segments = segmentSpeechText(text);
    assert.ok(segments.length > 1);
    assert.ok(segments.every(segment => segment.length <= 1600 && segment.length > 0));
    assert.equal(segments.join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
    assert.ok(segments.every(segment => !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(segment)));
  }
});
test('speech segmentation keeps paragraphs and normalizes blank whitespace', () => {
  assert.deepEqual(segmentSpeechText(' First   paragraph.\n\n Second paragraph! '), ['First paragraph.', 'Second paragraph!']);
  assert.deepEqual(segmentSpeechText('  \n '), []);
});

function playerFixture(t) {
  const originals = new Map(['window', 'SpeechSynthesisUtterance'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const spoken = [];
  class Utterance { constructor(text) { this.text = text; } }
  const speech = { paused: false, cancel() {}, getVoices: () => [], speak: value => spoken.push(value),
    pause() { this.paused = true; }, resume() { this.paused = false; } };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { speechSynthesis: speech, SpeechSynthesisUtterance: Utterance } });
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: Utterance });
  t.after(() => { for (const [key, descriptor] of originals) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]; });
  let completed = 0;
  const player = createBrowserSpeechPlayer(() => {}, () => completed++);
  return { player, spoken, completed: () => completed };
}
test('speech errors and Stop invalidate late start/end callbacks', t => {
  const h = playerFixture(t);
  h.player.play(['First', 'Second']);
  const failed = h.spoken[0];
  failed.onerror({ error: 'network' }); failed.onstart(); failed.onend();
  assert.equal(h.player.snapshot.active, false);
  assert.equal(h.spoken.length, 1);
  assert.equal(h.completed(), 0);
  h.player.play(['Again']);
  const stopped = h.spoken[1]; h.player.stop(); stopped.onstart(); stopped.onend();
  assert.equal(h.player.snapshot.active, false);
  assert.equal(h.completed(), 0);
});
test('completion fires once and delayed start does not clear a paused state', t => {
  const h = playerFixture(t);
  h.player.play(['First']); h.player.pause(); h.spoken[0].onstart();
  assert.equal(h.player.snapshot.paused, true);
  h.player.resume(); h.spoken[0].onend(); h.spoken[0].onend();
  assert.equal(h.completed(), 1);
});
