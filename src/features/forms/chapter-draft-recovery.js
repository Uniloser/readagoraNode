export function createChapterDraftRecovery({ state }) {
  function key(chapterId) { return `readagora-chapter-draft:${String(chapterId)}`; }

  function saveLocalSnapshot() {
    const chapter = state.pageData?.chapter;
    if (!chapter?.id || typeof localStorage === 'undefined') return;
    const title = document.querySelector('[data-chapter-title]')?.value.trim() || chapter.title || '';
    const content = document.querySelector('[data-chapter-content]')?.innerHTML ?? chapter.content ?? '';
    const snapshot = {
      chapterId: String(chapter.id),
      title,
      content,
      comicTextEnabled: Boolean(state.comicTextEnabled),
      updatedAt: Date.now(),
    };
    try { localStorage.setItem(key(chapter.id), JSON.stringify(snapshot)); } catch { /* Keep editing even when browser storage is full or disabled. */ }
  }

  function markDirty() {
    state.chapterDraftRevision = (state.chapterDraftRevision || 0) + 1;
    state.chapterDraftDirty = true;
    saveLocalSnapshot();
  }

  function restore(chapter) {
    if (!chapter?.id || typeof localStorage === 'undefined') return false;
    try {
      const raw = localStorage.getItem(key(chapter.id));
      if (!raw) return false;
      const snapshot = JSON.parse(raw);
      if (String(snapshot.chapterId) !== String(chapter.id)) return false;
      const changed = String(snapshot.title ?? '') !== String(chapter.title ?? '') || String(snapshot.content ?? '') !== String(chapter.content ?? '') || Boolean(chapter.content_type === 'comic' || chapter.has_comic) && Boolean(snapshot.comicTextEnabled) !== Boolean(chapter.has_text);
      if (!changed) {
        localStorage.removeItem(key(chapter.id));
        return false;
      }
      chapter.title = String(snapshot.title ?? chapter.title ?? '');
      chapter.content = String(snapshot.content ?? chapter.content ?? '');
      if (chapter.content_type === 'comic' || chapter.has_comic) chapter.has_text = Boolean(snapshot.comicTextEnabled);
      state.comicTextEnabled = Boolean(snapshot.comicTextEnabled);
      state.chapterDraftDirty = true;
      state.chapterDraftRecovered = true;
      state.chapterDraftRevision = Math.max(1, Number(state.chapterDraftRevision || 0) + 1);
      return true;
    } catch {
      return false;
    }
  }

  function markSaved({ chapterId, title, content, comicTextEnabled, revision }) {
    let sameSnapshot = false;
    try {
      const snapshot = JSON.parse(localStorage.getItem(key(chapterId)) || 'null');
      sameSnapshot = Boolean(snapshot && snapshot.title === title && snapshot.content === content && Boolean(snapshot.comicTextEnabled) === Boolean(comicTextEnabled) && Number(snapshot.revision || revision) === revision);
      if (sameSnapshot) localStorage.removeItem(key(chapterId));
    } catch { /* Server save still succeeds when local storage is unavailable. */ }
    if (String(state.pageData?.chapter?.id) !== String(chapterId)) return;
    if ((state.chapterDraftRevision || 0) === revision) {
      state.chapterDraftDirty = false;
      state.chapterDraftRecovered = false;
    } else if (!sameSnapshot) {
      state.chapterDraftDirty = true;
    }
  }

  function bindLeaveWarning() {
    window.addEventListener('beforeunload', event => {
      if (!state.chapterDraftDirty) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  return { markDirty, restore, markSaved, bindLeaveWarning };
}
