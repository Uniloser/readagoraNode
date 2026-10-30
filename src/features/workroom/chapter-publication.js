export function createChapterPublisher({ state, api, saveChapterDraft, loadPage }) {
  return async function publishChapter(chapterId, status) {
    const storyId = state.pageData?.story?.id;
    const active = () => state.pageData?.story?.id === storyId && state.pageData?.chapter?.id === chapterId;
    if (!storyId || !active()) return false;
    try {
      if (!await saveChapterDraft() || !active()) return false;
      await api(`/chapters/${encodeURIComponent(chapterId)}/status`, { method: 'PATCH', body: { status } });
      if (active()) await loadPage('chapter-editor', { storyId, chapterId });
      return true;
    } catch (error) {
      if (active()) throw error;
      return false;
    }
  };
}
