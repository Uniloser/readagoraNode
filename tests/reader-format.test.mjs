import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let source = await readFile(new URL('../src/features/stories/reader-view.js', import.meta.url), 'utf8');
source = source.replace(
  "import { authIntentHref } from '../auth/redirects.js';",
  'const authIntentHref = returnTo => returnTo;',
);
const { createReaderViews } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function renderReader(chapter, extraState = {}) {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
  globalThis.document = { documentElement: { dataset: { theme: 'light' } } };
  globalThis.location = { pathname: `/read/story/${chapter.id}`, search: '' };
  try {
    const state = {
      chapter,
      story: { id: 'story', title: 'Story', genre: 'Fantasy' },
      chapters: [chapter],
      readerSettings: { theme: 'paper', size: 18, lineHeight: 1.75, width: 680, font: 'serif', autoPlayNext: false },
      comments: [],
      ...extraState,
    };
    const views = createReaderViews({
      state,
      esc: value => String(value ?? ''),
      icon: () => '',
      author: () => 'Author',
      header: () => '',
      footer: () => '',
      mobileTabs: () => '',
      app: { querySelector: () => null },
      safeText: value => value,
    });
    return views.readerPage();
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else delete globalThis.document;
    if (previousLocation) Object.defineProperty(globalThis, 'location', previousLocation);
    else delete globalThis.location;
  }
}

test('hybrid chapters let readers switch between text and comic, defaulting to text', () => {
  const html = renderReader({
    id: 'chapter',
    title: 'Chapter',
    has_text: true,
    content: '<p>Story prose</p>',
    panels: [{ image_url: '/comic-page.jpg' }],
  });

  assert.match(html, /data-reader-format="text"[^>]*aria-pressed="true"/);
  assert.match(html, /data-reader-format="comic"[^>]*aria-pressed="false"/);
  assert.match(html, /<header class="reader-topbar">[\s\S]*class="reader-format-switch reader-format-switch-topbar"/);
  assert.doesNotMatch(html, /<\/header>[\s\S]*class="reader-format-switch/);
  assert.match(html, /data-reader-format-pane="text">?<p>Story prose<\/p>/);
  assert.match(html, /data-reader-format-pane="comic" hidden><figure/);
});

test('comic reading progress opens hybrid chapters in comic mode', () => {
  const html = renderReader({
    id: 'chapter',
    title: 'Chapter',
    has_text: true,
    content: '<p>Story prose</p>',
    panels: [{ image_url: '/comic-page.jpg' }],
  }, { readerResumePanelIndex: 0 });

  assert.match(html, /data-reader-format="text"[^>]*aria-pressed="false"/);
  assert.match(html, /data-reader-format="comic"[^>]*aria-pressed="true"/);
  assert.match(html, /data-reader-format-pane="text" hidden>/);
  assert.match(html, /data-reader-format-pane="comic"><figure/);
});

test('single-format chapters keep their existing reader content without a format switch', () => {
  const html = renderReader({
    id: 'chapter',
    title: 'Chapter',
    content: '<p>Story prose</p>',
    panels: [],
  });

  assert.doesNotMatch(html, /reader-format-switch/);
  assert.match(html, /class="prose"><p>Story prose<\/p><\/div>/);
});

test('reader content omits the redundant chapter title and author header', () => {
  const html = renderReader({
    id: 'chapter',
    title: 'Chapter 1',
    content: '<p>Story prose</p>',
    panels: [],
  });

  assert.match(html, /<a class="reader-book"[^>]*><span>Story<\/span><small>Chapter 1<\/small><\/a>/);
  assert.doesNotMatch(html, /class="chapter-kicker"|class="chapter-byline"|<h1>Chapter 1<\/h1>/);
  assert.doesNotMatch(html, /Fantasy · CHAPTER 01|by Author/);
});

test('chapter like and share actions appear beside the active chapter in the list', () => {
  const html = renderReader({
    id: 'chapter',
    title: 'Chapter 1',
    content: '<p>Story prose</p>',
    panels: [],
  }, {
    chapters: [{ id: 'chapter', title: 'Chapter 1' }, { id: 'next', title: 'Chapter 2' }],
    chapterLike: { liked: false, count: 4 },
  });

  assert.match(html, /chapter-toc-entry active"><a class="active"[^>]*>[\s\S]*Chapter 1[\s\S]*chapter-toc-actions/);
  assert.match(html, /data-action="chapter-like"[^>]*aria-label="Like chapter · 4 likes"/);
  assert.match(html, /data-action="reader-share" aria-label="Share chapter"/);
  assert.doesNotMatch(html, /class="chapter-reader-actions"/);
  assert.doesNotMatch(html, /chapter-toc-entry"><a class=""[^>]*>[\s\S]*Chapter 2[\s\S]*chapter-toc-actions/);
});
