import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeContentUrl } from '../src/lib/story-html.js';

test('story images allow cached raster data and reject active URL schemes', () => {
  for (const url of ['data:image/png;base64,aGVsbG8=', 'https://example.org/image.png', '/cover.png']) {
    assert.equal(isSafeContentUrl(url, true), true);
  }
  for (const url of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PGgxPg==', 'javascript:alert(1)', 'java\nscript:alert(1)', 'vbscript:msgbox(1)', 'file:///tmp/x', 'mailto:a@example.org']) {
    assert.equal(isSafeContentUrl(url, true), false, url);
  }
  assert.equal(isSafeContentUrl('data:image/png;base64,aGVsbG8='), false);
  assert.equal(isSafeContentUrl('mailto:a@example.org'), true);
});
