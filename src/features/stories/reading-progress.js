export function createReadingProgressTracker({ state, api, app }) {
  let timer = null;
  const syncStates = new Map();

  function snapshot() {
    if (!state.story || !state.chapter) return null;
    const prose = app.querySelector('.reader-article .prose');
    if (!prose) return null;
    const top = window.scrollY + prose.getBoundingClientRect().top;
    const percentage = Math.max(0, Math.min(1, (window.scrollY - top) / Math.max(1, prose.scrollHeight - window.innerHeight)));
    const panels = [...prose.querySelectorAll('.comic-panel')].filter(panel => panel.getClientRects().length > 0);
    const activePanel = panels.findIndex(panel => panel.getBoundingClientRect().bottom > 96);
    return {
      storyId: state.story.id,
      chapterId: state.chapter.id,
      percentage,
      panelIndex: panels.length ? Math.max(0, activePanel < 0 ? panels.length - 1 : activePanel) : null,
    };
  }

  async function sync(force = false) {
    if (!state.session || state.isOffline) return;
    const progress = snapshot();
    if (!progress) return;
    const key = `${progress.storyId}:${progress.chapterId}`;
    const status = syncStates.get(key) || { syncedAt: 0, completionAttemptAt: 0, completionPending: false, completionSynced: false };
    syncStates.set(key, status);
    const now = Date.now();

    if (progress.percentage >= 0.95) {
      if (status.completionSynced || status.completionPending || now - status.completionAttemptAt < 5000) return;
      status.completionPending = true;
      status.completionAttemptAt = now;
      status.syncedAt = now;
      try {
        await api(`/stories/${encodeURIComponent(progress.storyId)}/progress`, {
          method: 'PUT',
          body: { last_chapter_id: progress.chapterId, last_panel_index: progress.panelIndex, completed_chapter_id: progress.chapterId },
        });
        status.completionSynced = true;
      } catch {
        // The local reading position remains available if the backend is offline.
      } finally {
        status.completionPending = false;
      }
      return;
    }

    if (!force && now - status.syncedAt < 5000) return;
    status.syncedAt = now;
    try {
      await api(`/stories/${encodeURIComponent(progress.storyId)}/progress`, {
        method: 'PUT',
        body: { last_chapter_id: progress.chapterId, last_panel_index: progress.panelIndex },
      });
    } catch {
      // The local reading position remains available if the backend is offline.
    }
  }

  function schedule() {
    if (!state.session || state.isOffline || !location.pathname.startsWith('/read/')) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      void sync();
    }, 1000);
  }

  function cancelScheduled() {
    clearTimeout(timer);
    timer = null;
  }

  function markSynced(storyId, chapterId) {
    const key = `${storyId}:${chapterId}`;
    const status = syncStates.get(key) || { completionAttemptAt: 0, completionPending: false, completionSynced: false };
    status.syncedAt = Date.now();
    syncStates.set(key, status);
  }

  return { sync, schedule, cancelScheduled, markSynced };
}
