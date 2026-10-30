import { getBrowserPushState } from '../../lib/push/browser-push.js';

export function createPageLoader({ state, api, render, app, bind, newStoryModal, loadPreviousChampion, listOfflineStories, restoreChapterDraft }) {
  let requestId = 0;
  let championRequest = 0;

  async function loadPage(kind, argument = '') {
    const currentRequest = ++requestId;
    if (kind === 'community') { state.communityLoadingMore = false; state.communityLoadError = ''; }
    if (kind === 'community-post') { state.communityCommentsLoading = false; state.communityCommentsError = ''; state.communityCommentReply = ''; }
    if (kind === 'profile-settings') state.webPushError = '';
    state.page = kind; state.pageArgument = argument; state.pageData = null; state.pageLoading = true; state.pageError = ''; state.pageLoadError = false;
    const optional = path => api(path).then(value => ({ value, error: '' })).catch(error => currentRequest === requestId ? ({ value: null, error: error.message || 'Could not load this section.' }) : Promise.reject(error));
    render();
    try {
      if (kind === 'events') {
        const championId = ++championRequest;
        const champion = await loadPreviousChampion(api);
        if (currentRequest !== requestId) return;
        if (championId === championRequest) {
          state.pageData = { champion };
          const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
          if (champion && !state.championRevealAutoShown && !reduceMotion) {
            state.championRevealAutoShown = true;
            state.championRevealOpen = true;
          }
        }
      }
      else if (kind === 'library') {
        const offlineDownloads = await listOfflineStories().catch(() => []);
        if (state.isOffline) {
          state.libraryTab = 'offline';
          state.pageData = { library: [], bookmarks: [], offlineDownloads };
          return;
        }
        try { const [library, bookmarks] = await Promise.all([api('/library'), api('/bookmarks')]); if (currentRequest !== requestId) return; state.pageData = { library: library || [], bookmarks: bookmarks || [], offlineDownloads }; }
        catch (error) { if (currentRequest !== requestId) return; if (!offlineDownloads.length) throw error; state.pageError = ''; state.pageData = { library: [], bookmarks: [], offlineDownloads }; }
      } else if (kind === 'community') {
        const tab = state.communityTab || 'for-you';
        const [feedResult, sidebarResult, myStoriesResult, communityUserResult] = await Promise.all([
          optional(`/community?tab=${encodeURIComponent(tab)}&offset=0`), optional('/community/sidebar'),
          state.session ? optional('/users/me/stories') : Promise.resolve({ value: [], error: '' }),
          state.session ? optional('/users/me') : Promise.resolve({ value: null, error: '' }),
        ]);
        if (currentRequest !== requestId) return;
        const communityUser = communityUserResult.value || state.session?.user || null;
        if (communityUser) state.user = communityUser;
        state.pageData = { ...(feedResult.value || { items: [], next_offset: null }), sidebar: sidebarResult.value || { discussions: [], writers: [] }, myStories: myStoriesResult.value || [], communityErrors: { feed: feedResult.error, sidebar: sidebarResult.error, myStories: myStoriesResult.error } };
      } else if (kind === 'workroom') {
        const [stories, analyticsResult, cashWalletResult, quoteResult, payoutsResult, genresResult] = await Promise.all([
          api('/users/me/stories'), optional('/analytics/author'), optional('/creator/cash-wallet'), optional('/creator/cashout/quote'), optional('/creator/payout-history?limit=10'), optional('/genres'),
        ]);
        if (currentRequest !== requestId) return;
        state.pageData = { stories: stories || [], analytics: analyticsResult.value, cashWallet: cashWalletResult.value, cashoutQuote: quoteResult.value, payouts: payoutsResult.value, genres: genresResult.value || [], workroomErrors: { analytics: analyticsResult.error, cashWallet: cashWalletResult.error, cashoutQuote: quoteResult.error, payouts: payoutsResult.error, genres: genresResult.error } };
      } else if (kind === 'creator-center') {
        const [monetization, wallet, cashWallet, cashoutQuote, creatorAnalytics, transactions, cashTransactions, payouts] = await Promise.all([
          api('/users/me/monetization'), api('/creator/wallet'), api('/creator/cash-wallet'), api('/creator/cashout/quote'), api('/creator/analytics'), api('/creator/transactions?limit=30'), api('/creator/cash-transactions?limit=30'), api('/creator/payout-history?limit=30'),
        ]);
        if (currentRequest !== requestId) return;
        state.pageData = { monetization, wallet, cashWallet, cashoutQuote, creatorAnalytics, transactions: transactions || [], cashTransactions: cashTransactions || [], payouts: payouts || [] };
      } else if (kind === 'profile') {
        const [user, followersResult, storiesResult, walletResult, achievementsResult, unreadResult] = await Promise.all([api('/users/me'), optional('/users/me/follower-count'), optional('/users/me/stories'), optional('/wallet'), optional('/wallet/achievements'), optional('/notifications/unread-count')]);
        if (currentRequest !== requestId) return;
        state.user = user; state.pageData = { user, followers: followersResult.value, stories: storiesResult.value || [], wallet: walletResult.value, achievements: achievementsResult.value || [], unread: unreadResult.value, profileErrors: { followers: followersResult.error, stories: storiesResult.error, wallet: walletResult.error, achievements: achievementsResult.error, unread: unreadResult.error } };
      } else if (kind === 'profile-author-center') {
        const [user, storiesResult, followersResult, walletResult, transactionsResult] = await Promise.all([
          api('/users/me'), optional('/users/me/stories'), optional('/users/me/follower-count'), optional('/wallet'), optional('/wallet/transactions?limit=5'),
        ]);
        if (currentRequest !== requestId) return;
        state.user = user;
        state.pageData = { user, stories: storiesResult.value || [], followers: followersResult.value?.count, wallet: walletResult.value, transactions: transactionsResult.value || [], authorCenterErrors: { stories: storiesResult.error, followers: followersResult.error, wallet: walletResult.error, transactions: transactionsResult.error } };
      } else if (kind === 'profile-author-analytics') {
        const analytics = await api('/analytics/author'); if (currentRequest !== requestId) return; state.pageData = { analytics };
      } else if (kind === 'profile-promotions') {
        const [promotionsResult, storiesResult, walletResult] = await Promise.all([optional('/promotions'), optional('/users/me/stories'), optional('/wallet')]);
        if (currentRequest !== requestId) return;
        state.pageData = { promotions: promotionsResult.value || [], stories: storiesResult.value || [], wallet: walletResult.value, promotionErrors: { promotions: promotionsResult.error, stories: storiesResult.error, wallet: walletResult.error } };
      } else if (kind === 'profile-moderation') {
        const reports = await api('/moderation/reports'); if (currentRequest !== requestId) return; state.pageData = { reports: reports || [] };
      } else if (kind === 'profile-coins') {
        const [wallet, products, history] = await Promise.all([api('/coins/wallet'), api('/coins/products'), api('/coins/history?limit=30')]);
        if (currentRequest !== requestId) return; state.pageData = { wallet, products: products || [], history: history || [] };
      } else if (kind === 'profile-subscription') {
        const result = await optional('/subscriptions/me');
        if (currentRequest !== requestId) return; state.pageData = { subscription: result.value, subscriptionError: result.error };
      } else if (kind === 'profile-top-up') {
        const result = await optional('/wallet');
        if (currentRequest !== requestId) return; state.pageData = { wallet: result.value, walletError: result.error };
      } else if (kind === 'profile-settings') {
        const [user, preferencesResult, pushConfigResult] = await Promise.all([api('/users/me'), optional('/discovery/preferences'), optional('/push-tokens/config')]);
        const webPush = await getBrowserPushState();
        if (currentRequest !== requestId) return; state.user = user; state.pageData = { user, preferences: preferencesResult.value || {}, preferencesError: preferencesResult.error, webPush, webPushConfigured: pushConfigResult.value?.web_push_enabled === true, webPushPublicKey: pushConfigResult.value?.web_push_public_key || '' };
      } else if (kind === 'profile-balance') {
        const [walletResult, achievementsResult, transactionsResult] = await Promise.all([optional('/wallet'), optional('/wallet/achievements'), optional('/wallet/transactions?limit=20')]);
        if (currentRequest !== requestId) return; state.pageData = { wallet: walletResult.value, achievements: achievementsResult.value || [], transactions: transactionsResult.value || [], profileBalanceErrors: { wallet: walletResult.error, achievements: achievementsResult.error, transactions: transactionsResult.error } };
      } else if (kind === 'profile-rewards') {
        const [walletResult, achievementsResult, challengesResult] = await Promise.all([optional('/wallet'), optional('/wallet/achievements'), optional('/wallet/challenges')]);
        if (currentRequest !== requestId) return; state.pageData = { wallet: walletResult.value, achievements: achievementsResult.value || [], challenges: challengesResult.value || [], profileRewardErrors: { wallet: walletResult.error, achievements: achievementsResult.error, challenges: challengesResult.error } };
      } else if (kind === 'profile-alpha') {
        const [wallet, transactions] = await Promise.all([api('/wallet'), api('/wallet/transactions?limit=50')]);
        if (currentRequest !== requestId) return; state.pageData = { wallet, transactions: transactions || [] };
      } else if (kind === 'profile-inbox') {
        const notifications = await api('/notifications?limit=50&offset=0'); if (currentRequest !== requestId) return;
        const focusedNotification = new URLSearchParams(location.search).get('notificationId');
        if (focusedNotification && (notifications || []).some(item => String(item.id) === focusedNotification)) {
          await api(`/notifications/${encodeURIComponent(focusedNotification)}/read`, { method: 'POST' }).catch(() => undefined);
          const item = notifications.find(item => String(item.id) === focusedNotification);
          if (item) item.read_at ||= new Date().toISOString();
        }
        state.pageData = { notifications: notifications || [] };
      } else if (kind === 'profile-blocked') {
        const blocks = await api('/users/me/blocks'); if (currentRequest !== requestId) return; state.pageData = { blocks: blocks || [] };
      } else if (kind === 'manage-story') {
        const [story, chapters, monetization] = await Promise.all([api(`/stories/${encodeURIComponent(argument)}`), api(`/stories/${encodeURIComponent(argument)}/chapters`), api('/users/me/monetization').catch(() => ({ status: 'NOT_ELIGIBLE', minimum_free_chapters: 3 }))]);
        if (currentRequest !== requestId) return; state.pageData = { story, chapters: chapters || [], monetization };
      } else if (kind === 'chapter-editor') {
        const [story, chapters, chapter] = await Promise.all([api(`/stories/${encodeURIComponent(argument.storyId)}`), api(`/stories/${encodeURIComponent(argument.storyId)}/chapters`), api(`/chapters/${encodeURIComponent(argument.chapterId)}`)]);
        if (currentRequest !== requestId) return;
        if (story.id !== argument.storyId || chapter.id !== argument.chapterId || chapter.story_id !== story.id || !(chapters || []).some(item => item.id === chapter.id)) {
          throw new Error('This chapter does not belong to the selected story. Open it from your Workroom.');
        }
        const hasComicPanels = story.content_type === 'comic' || chapter.content_type === 'comic' || chapter.has_comic === true;
        const panels = hasComicPanels ? await api(`/chapters/${encodeURIComponent(argument.chapterId)}/panels`) : [];
        if (currentRequest !== requestId) return; state.chapterDraftDirty = false; state.chapterDraftRecovered = false; state.chapterDraftRevision = 0; state.comicTextEnabled = chapter.has_text ?? (chapter.content_type !== 'comic' && story.content_type !== 'comic'); restoreChapterDraft?.(chapter); state.pageData = { story, chapters: chapters || [], chapter, panels: panels || [] };
      } else if (kind === 'manuscript-import') {
        const story = await api(`/stories/${encodeURIComponent(argument)}`); if (currentRequest !== requestId) return; state.pageData = { story };
      } else if (kind === 'creator') {
        const user = await api(`/users/${encodeURIComponent(argument)}`); if (currentRequest !== requestId) return;
        const postsRequest = api(`/community/users/${encodeURIComponent(user.id)}/posts?offset=0`).then(value => ({ value, error: '' })).catch(error => ({ value: null, error: error.message || 'Could not load creator posts.' }));
        const blocksRequest = state.session ? api('/users/me/blocks').catch(() => []) : Promise.resolve([]);
        const [stories, follow, postsResult, blocks] = await Promise.all([api(`/users/${encodeURIComponent(argument)}/stories`), state.session ? api(`/users/${encodeURIComponent(user.id)}/follow`).catch(() => ({ following: false })) : Promise.resolve({ following: false }), postsRequest, blocksRequest]);
        if (currentRequest !== requestId) return;
        state.creatorProfileTab = 'stories';
        state.creatorPostsLoadingMore = false;
        state.pageData = { user, stories: stories || [], following: follow.following, isBlocked: (blocks || []).some(block => block.blocked_id === user.id), posts: postsResult.value?.items || [], postsNextOffset: postsResult.value?.next_offset ?? null, postsError: postsResult.error };
      } else if (kind === 'community-post') {
        const [post, comments] = await Promise.all([api(`/community/posts/${encodeURIComponent(argument)}`), api(`/community/posts/${encodeURIComponent(argument)}/comments?offset=0`)]);
        if (currentRequest !== requestId) return; state.pageData = { post, comments: comments?.items || [], commentsNextOffset: comments?.next_offset ?? null };
      }
    } catch (error) { if (currentRequest === requestId) { state.pageError = error.message; state.pageLoadError = true; } }
    finally {
      if (currentRequest !== requestId) return;
      state.pageLoading = false; render();
      if (kind === 'workroom' && state.openCreateStory) { state.openCreateStory = false; app.insertAdjacentHTML('beforeend', newStoryModal()); bind(); app.querySelector('[data-form="new-story"] [name="title"]')?.focus(); }
    }
  }

  function invalidate() { requestId += 1; championRequest += 1; }
  return { loadPage, invalidate };
}
