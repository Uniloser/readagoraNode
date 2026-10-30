export function createChapterDraftSaver({ state, app, api, chapterDraftRecovery }) {
  let chapterSavePromise = null;
  let chapterSaveAgain = false;
  let savingChapterId = null;

async function saveChapterDraft() {
  const chapter = state.pageData?.chapter;
  if (!chapter) return;
  if (chapterSavePromise) {
    if (savingChapterId === chapter.id) {
      chapterSaveAgain = true;
      return chapterSavePromise;
    }
    await chapterSavePromise;
    return state.pageData?.chapter?.id === chapter.id ? saveChapterDraft() : false;
  }
  clearTimeout(state.chapterSaveTimer);
  savingChapterId = chapter.id;
  const requestedChapterId = chapter.id;
  chapterSavePromise = (async () => {
    let saved = true;
    do {
      chapterSaveAgain = false;
      const activeChapter = state.pageData?.chapter;
      if (!activeChapter || activeChapter.id !== requestedChapterId) return false;
      const chapterId = activeChapter.id;
      const revision = state.chapterDraftRevision || 0;
      const title = app.querySelector('[data-chapter-title]')?.value.trim() || activeChapter.title;
      const contentEditor = app.querySelector('[data-chapter-content]');
      const content = contentEditor ? contentEditor.innerHTML : (activeChapter.content || '');
      const story = state.pageData?.story;
      const chapterIsComic = story?.content_type === 'comic' || activeChapter.content_type === 'comic' || activeChapter.has_comic;
      const comicTextEnabled = Boolean(state.comicTextEnabled);
      const hasText = chapterIsComic ? Boolean(state.comicTextEnabled ?? activeChapter.has_text ?? false) : true;
      const status = app.querySelector('[data-save-status]');
      if (status) status.textContent = 'Saving…';
      try {
        const body = chapterIsComic
          ? { title, ...(hasText ? { content } : {}), has_text: hasText, has_comic: true }
          : { title, content: content || '<p></p>' };
        await api(`/chapters/${encodeURIComponent(chapterId)}`, { method: 'PATCH', body });
        if (state.pageData?.chapter?.id === chapterId) {
          activeChapter.title = title;
          if (contentEditor || hasText) activeChapter.content = content;
          if (chapterIsComic) { activeChapter.has_text = hasText; activeChapter.has_comic = true; }
        }
        chapterDraftRecovery?.markSaved({ chapterId, title, content, comicTextEnabled, revision });
        if (state.pageData?.chapter?.id !== chapterId) return false;
        state.pageError = '';
        // Edits made while PATCH was pending must be saved before navigation
        // or publication can use this promise as confirmation.
        if ((state.chapterDraftRevision || 0) !== revision) chapterSaveAgain = true;
        if (status?.isConnected) status.textContent = chapterSaveAgain ? 'Saving…' : 'All changes saved';
      } catch (error) {
        if (status?.isConnected) status.textContent = 'Save failed';
        if (state.pageData?.chapter?.id === chapterId) state.pageError = error.message || 'Could not save the chapter.';
        saved = false;
        break;
      }
    } while (chapterSaveAgain);
    return saved;
  })();
  const pendingSave = chapterSavePromise;
  try { return await pendingSave; }
  finally { if (chapterSavePromise === pendingSave) { chapterSavePromise = null; savingChapterId = null; } }
}

  return { saveChapterDraft };
}
