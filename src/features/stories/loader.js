export function createStoryLoader({ state, api, app, render, readingProgress, speechPlayer, getOfflineStory, getOfflineChapters, getOfflineChapter, readerPositionKey }) {
  let requestId = 0;

  function invalidate() {
    requestId++;
  }

  async function loadStory(id, chapterId) {
    const currentRequest = ++requestId;
    readingProgress.cancelScheduled();
    if (state.story && state.chapter && state.session) void readingProgress.sync(true);
    state.readerResumePanelIndex = null;
    state.readerContentMode = null;
    speechPlayer.stop();
    state.supportOpen = false;
    state.supportError = '';
    state.supportBalance = null;
    state.story = null;
    state.chapters = [];
    state.chapter = null;
    state.chapterLike = null;
    state.comments = [];
    state.commentsHasMore = false;
    state.commentsOffset = 0;
    state.commentsError = '';
    state.commentsLoading = false;
    state.replyToComment = '';
    state.commentQuote = '';
    state.storySaved = false;
    state.storyFollowing = false;
    state.storyRecommendations = [];
    state.isOffline = navigator.onLine === false;
    state.offlineSaved = false;
    state.offlineSaving = false;
    state.pageError = '';
    state.premiumGate = false;
    state.chapterAccess = null;
    state.lockedChapter = null;
    state.loading = true;
    state.error = '';
    render();
    state.readerLastScrollY = 0;
    app.querySelector('.reader-topbar')?.classList.remove('is-hidden');

    try {
      const [story, chapters, recommendations, bookmarks, remoteProgress] = await Promise.all([
        api(`/stories/${encodeURIComponent(id)}`),
        api(`/stories/${encodeURIComponent(id)}/chapters`),
        !chapterId ? api(`/stories/${encodeURIComponent(id)}/recommendations?limit=8`).catch(() => []) : Promise.resolve([]),
        !chapterId && state.session ? api('/bookmarks').catch(() => []) : Promise.resolve([]),
        state.session && chapterId ? api(`/stories/${encodeURIComponent(id)}/progress`).catch(() => null) : Promise.resolve(null),
      ]);
      if (currentRequest !== requestId) return;
      state.story = story;
      state.chapters = chapters || [];
      state.storyRecommendations = recommendations || [];
      state.storySaved = (bookmarks || []).some(item => item.story_id === id);
      if (!chapterId) state.bookmarkedStoryIds = new Set((bookmarks || []).map(item => String(item.story_id)).filter(Boolean));
      if (chapterId && remoteProgress?.last_chapter_id === chapterId && Number.isInteger(remoteProgress.last_panel_index)) {
        state.readerResumePanelIndex = remoteProgress.last_panel_index;
      }
      if (!chapterId) state.offlineSaved = Boolean(await getOfflineStory(id).catch(() => null));
      if (currentRequest !== requestId) return;

      if (!chapterId && state.session && state.session.user?.id !== story.author_id) {
        const follow = await api(`/users/${encodeURIComponent(story.author_id)}/follow`).catch(() => ({ following: false }));
        if (currentRequest !== requestId) return;
        state.storyFollowing = Boolean(follow.following);
      }

      if (chapterId) {
        const summary = state.chapters.find(item => item.id === chapterId);
        if (!summary) throw new Error('This chapter is not available in this story. Return to story details to choose a chapter.');
        if (summary?.accessible === false) {
          state.lockedChapter = summary;
          state.premiumGate = true;
          state.chapterAccess = state.session ? await api(`/chapters/${encodeURIComponent(chapterId)}/access`).catch(() => null) : null;
          if (currentRequest !== requestId) return;
        } else {
          const chapter = await api(`/chapters/${encodeURIComponent(chapterId)}`);
          if (currentRequest !== requestId) return;
          if (chapter?.id !== chapterId || chapter.story_id !== id) throw new Error('This chapter does not belong to this story. Return to story details to choose a chapter.');
          state.chapter = chapter;
          const [like, discussion] = await Promise.all([
            api(`/chapters/${encodeURIComponent(chapterId)}/like`).catch(() => ({ liked: false, count: 0 })),
            api(`/chapters/${encodeURIComponent(chapterId)}/comments?limit=30&offset=0`)
              .then(comments => ({ comments, error: '' }))
              .catch(error => ({ comments: [], error: error.message || 'Could not load comments.' })),
          ]);
          if (currentRequest !== requestId) return;
          state.chapterLike = like;
          state.comments = discussion.comments;
          state.commentsError = discussion.error;
          if (state.session) {
            readingProgress.markSynced(id, chapterId);
            void api(`/stories/${encodeURIComponent(id)}/progress`, { method: 'PUT', body: { last_chapter_id: chapterId, last_panel_index: state.readerResumePanelIndex } }).catch(() => undefined);
          }
          void api(`/stories/${encodeURIComponent(id)}/views`, { method: 'POST', body: { chapter_id: chapterId } }).catch(() => undefined);
          state.commentsOffset = state.comments.length;
          state.commentsHasMore = state.comments.length === 30;
          if (currentRequest !== requestId) return;
        }
      }
    } catch (error) {
      if (currentRequest !== requestId) return;
      try {
        const [offlineStory, offlineChapters] = await Promise.all([getOfflineStory(id), getOfflineChapters(id)]);
        const offlineChapter = chapterId ? await getOfflineChapter(chapterId) : null;
        if (currentRequest !== requestId) return;
        if (!offlineStory || !offlineChapters.length || (chapterId && (!offlineChapter || offlineChapter.story_id !== id || !offlineChapters.some(item => item.id === chapterId)))) throw error;
        state.story = offlineStory;
        state.chapters = offlineChapters;
        state.chapter = offlineChapter || null;
        state.comments = [];
        state.storyRecommendations = [];
        state.storyFollowing = false;
        state.storySaved = false;
        state.offlineSaved = true;
        state.isOffline = true;
        state.error = '';
      } catch {
        if (currentRequest === requestId) state.error = error.message;
      }
    } finally {
      if (currentRequest !== requestId) return;
      state.loading = false;
      render();
      if (chapterId && state.chapter) {
        let savedPosition = 0;
        try { savedPosition = Number(localStorage.getItem(readerPositionKey(id, chapterId))) || 0; } catch {}
        requestAnimationFrame(() => {
          if (currentRequest !== requestId || state.story?.id !== id || state.chapter?.id !== chapterId) return;
          const previousScrollBehavior = document.documentElement.style.scrollBehavior;
          document.documentElement.style.scrollBehavior = 'auto';
          if (savedPosition > 0) window.scrollTo(0, savedPosition);
          else if (state.readerResumePanelIndex != null) {
            const resumePanel = app.querySelectorAll('.reader-article .comic-panel')[state.readerResumePanelIndex];
            if (resumePanel) resumePanel.scrollIntoView({ block: 'start' });
            else window.scrollTo(0, 0);
          } else window.scrollTo(0, 0);
          document.documentElement.style.scrollBehavior = previousScrollBehavior;
          state.readerLastScrollY = window.scrollY;
          state.readerResumePanelIndex = null;
        });
      }
    }
  }

  return { loadStory, invalidate };
}
