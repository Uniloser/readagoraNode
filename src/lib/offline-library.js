import { cacheChapterIllustrations } from './offline-illustrations.js';

const DATABASE = 'readagora-web-offline-v1';
const VERSION = 1;
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;

function openDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('Offline storage is not supported by this browser.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('stories')) db.createObjectStore('stories', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('chapters')) db.createObjectStore('chapters', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open offline storage.'));
  });
}

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Offline storage request failed.'));
  });
}

async function read(storeName, key) {
  const db = await openDatabase();
  try { return await requestValue(db.transaction(storeName, 'readonly').objectStore(storeName).get(key)); }
  finally { db.close(); }
}

async function readAll(storeName) {
  const db = await openDatabase();
  try { return await requestValue(db.transaction(storeName, 'readonly').objectStore(storeName).getAll()); }
  finally { db.close(); }
}

async function writeEntries(story, chapters) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['stories', 'chapters'], 'readwrite');
    transaction.objectStore('stories').put({ ...story, offline_updated_at: new Date().toISOString() });
    const chapterStore = transaction.objectStore('chapters');
    chapters.forEach(chapter => chapterStore.put(chapter));
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Could not save the offline story.')); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('Offline save was cancelled.')); };
  });
}

async function deleteEntries(storyId) {
  const chapters = await readAll('chapters');
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['stories', 'chapters'], 'readwrite');
    transaction.objectStore('stories').delete(storyId);
    const chapterStore = transaction.objectStore('chapters');
    chapters.filter(chapter => chapter.story_id === storyId).forEach(chapter => chapterStore.delete(chapter.id));
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Could not remove the offline story.')); };
  });
}

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not prepare an image for offline reading.'));
    reader.readAsDataURL(blob);
  });
}

async function cacheImage(url, tracker) {
  if (!url || url.startsWith('data:')) return url;
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!response.ok || response.type === 'opaque') throw new Error('An image could not be prepared for offline reading. Check that it is publicly accessible.');
  const blob = await response.blob();
  tracker.bytes += blob.size;
  if (tracker.bytes > MAX_DOWNLOAD_BYTES) throw new Error('This download is larger than the 50 MB browser limit.');
  return toDataUrl(blob);
}

export async function listOfflineStories() {
  const [stories, chapters] = await Promise.all([readAll('stories'), readAll('chapters')]);
  return stories.sort((a, b) => String(b.offline_updated_at || '').localeCompare(String(a.offline_updated_at || '')))
    .map(story => ({ ...story, offline_chapters: chapters.filter(chapter => chapter.story_id === story.id).sort((a, b) => a.chapter_order - b.chapter_order) }));
}

export async function getOfflineStory(storyId) { return read('stories', storyId); }
export async function getOfflineChapter(chapterId) { return read('chapters', chapterId); }
export async function getOfflineChapters(storyId) { return (await readAll('chapters')).filter(chapter => chapter.story_id === storyId).sort((a, b) => a.chapter_order - b.chapter_order); }

export function validateOfflineChapter(chapter, storyId, chapterId) {
  if (!chapter || chapter.id !== chapterId || chapter.story_id !== storyId) {
    throw new Error('A downloaded chapter did not match this story. Try the download again.');
  }
  if (chapter.status !== 'published' || chapter.access_type !== 'FREE' || chapter.accessible === false) {
    throw new Error('A chapter is no longer available for a free offline download. Refresh the story and try again.');
  }
}

export async function saveStoryOffline(story, summaries, api, onProgress = () => {}) {
  if (await getOfflineStory(story.id)) throw new Error('This story is already saved offline. Remove its download before downloading it again.');
  const eligible = [...summaries].filter(chapter => chapter.status === 'published' && chapter.access_type === 'FREE' && chapter.accessible !== false).sort((a, b) => a.chapter_order - b.chapter_order);
  if (!eligible.length) throw new Error('There are no published free chapters available to download.');
  if (navigator.storage?.estimate) {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota && quota - (usage || 0) < 8 * 1024 * 1024) throw new Error('There is not enough browser storage available to download this story.');
  }
  const tracker = { bytes: 0 };
  const offlineStory = { ...story };
  if (offlineStory.cover_url) {
    try { offlineStory.cover_url = await cacheImage(offlineStory.cover_url, tracker); }
    catch { offlineStory.cover_url = ''; }
  }
  const chapters = [];
  for (const [index, summary] of eligible.entries()) {
    const chapter = await api(`/chapters/${encodeURIComponent(summary.id)}`);
    validateOfflineChapter(chapter, story.id, summary.id);
    chapter.content = await cacheChapterIllustrations(chapter.content, url => cacheImage(url, tracker));
    chapter.panels = await Promise.all((chapter.panels || []).map(async panel => ({ ...panel, image_url: await cacheImage(panel.image_url, tracker) })));
    chapters.push({ ...chapter, story_id: story.id, status: 'published', access_type: 'FREE', accessible: true });
    onProgress({ completed: index + 1, total: eligible.length });
  }
  await writeEntries(offlineStory, chapters);
  return { story: offlineStory, chapters };
}

export async function removeOfflineStory(storyId) { await deleteEntries(storyId); }

export async function clearOfflineLibrary() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['stories', 'chapters'], 'readwrite');
    transaction.objectStore('stories').clear();
    transaction.objectStore('chapters').clear();
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Could not clear offline downloads.')); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('Could not clear offline downloads.')); };
  });
}
