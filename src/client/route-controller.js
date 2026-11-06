import { safeInternalPath } from '../features/auth/redirects.js';
import { isUuid } from '../lib/routing/identifiers.js';

export function createRouteController(deps) {
  const { state, processAuthHash, processOAuthCallback, currentPathname, searchStories, render, protectPage, loadPage, navigate, loadHome, loadStory, invalidatePageRequests } = deps;
  function route() {
  invalidatePageRequests();
  state.pageLoadError = false; state.pageError = '';
  processAuthHash();
  if (partsForRecoveryCallback()) return;
  if (processOAuthCallback()) return;
  const parts = currentPathname().split('/').filter(Boolean);
  const malformedIdentifier = (parts[0] === 'community' && parts.length === 2 && !isUuid(parts[1]))
    || (parts[0] === 'community' && parts[1] === 'post' && parts.length === 3 && !isUuid(parts[2]))
    || (parts[0] === 'story' && parts.length >= 2 && !isUuid(parts[1]))
    || (parts[0] === 'read' && parts.length === 3 && (!isUuid(parts[1]) || !isUuid(parts[2])))
    || (parts[0] === 'reader' && parts.length === 2 && !isUuid(parts[1]))
    || (parts[0] === 'workroom' && parts[1] === 'story' && parts.length >= 3 && !isUuid(parts[2]))
    || (parts[0] === 'workroom' && parts[1] === 'story' && parts[3] === 'chapter' && parts.length === 5 && !isUuid(parts[4]));
  if (malformedIdentifier) { navigate('/not-found'); return; }
  if (parts[0] === 'auth' && parts[1] === 'reset-password' && parts.length === 2) {
    history.replaceState({}, '', `/reset-password${location.search}${location.hash}`);
    render();
    return;
  }
  if (parts[0] === 'auth' && parts[1] === 'intent' && parts.length === 2) {
    const params = new URLSearchParams(location.search);
    const returnTo = safeInternalPath(params.get('returnTo') || '/');
    if (state.session) {
      navigate(returnTo);
      return;
    }
    render();
    return;
  }
  if (parts[0] === 'account-deletion' || parts[0] === 'delete-account') {
    render();
    return;
  }
  if (parts.length === 1 && ['discover', 'feed'].includes(parts[0])) { history.replaceState({}, '', '/'); state.discoverySection = 'all'; if (!state.homeLoaded) void loadHome(); else render(); return; }
  if (parts.length === 1 && parts[0] === 'write') { history.replaceState({}, '', '/workroom'); if (!protectPage('/workroom')) return; loadPage('workroom'); return; }
  if (parts[0] === 'search' && parts.length === 1) {
    const params = new URLSearchParams(location.search);
    state.query = params.get('q') || '';
    state.searchGenre = state.query ? '' : params.get('genre')?.trim() || '';
    render();
    if (state.query) void searchStories(state.query);
    else if (state.searchGenre) void deps.searchGenreStories(state.searchGenre);
    return;
  }
  if (parts[0] === 'reader' && parts[1]) {
    const chapterId = new URLSearchParams(location.search).get('chapterId');
    const target = chapterId ? `/read/${encodeURIComponent(parts[1])}/${encodeURIComponent(chapterId)}` : `/story/${encodeURIComponent(parts[1])}`;
    history.replaceState({}, '', target); route(); return;
  }
  if (parts[0] === 'story' && parts[1] && ['manage', 'edit-chapter', 'edit-comic-chapter'].includes(parts[2])) {
    const aliasChapterId = new URLSearchParams(location.search).get('chapterId');
    const requestedPath = parts[2] === 'manage' ? `/workroom/story/${encodeURIComponent(parts[1])}` : aliasChapterId ? `/workroom/story/${encodeURIComponent(parts[1])}/chapter/${encodeURIComponent(aliasChapterId)}` : `/workroom/story/${encodeURIComponent(parts[1])}`;
    if (!protectPage(requestedPath)) return;
    if (parts[2] === 'manage') { history.replaceState({}, '', `/workroom/story/${encodeURIComponent(parts[1])}`); loadPage('manage-story', parts[1]); return; }
    const chapterId = new URLSearchParams(location.search).get('chapterId');
    if (!chapterId) { history.replaceState({}, '', `/workroom/story/${encodeURIComponent(parts[1])}?newChapter=1`); loadPage('manage-story', parts[1]); return; }
    history.replaceState({}, '', `/workroom/story/${encodeURIComponent(parts[1])}/chapter/${encodeURIComponent(chapterId)}`);
    loadPage('chapter-editor', { storyId: parts[1], chapterId }); return;
  }
  if (parts[0] === 'profile' && parts.length === 2) {
    const mobileSection = parts[1].toLocaleLowerCase();
    if (mobileSection === 'deleteaccount' || mobileSection === 'delete-account') { history.replaceState({}, '', '/account-deletion'); render(); return; }
    if (mobileSection === 'communityconsent' || mobileSection === 'community-terms') { history.replaceState({}, '', '/terms'); render(); return; }
  }
  if (parts[0] === 'user' && parts[1]) { history.replaceState({}, '', `/creator/${encodeURIComponent(parts[1])}`); loadPage('creator', parts[1]); return; }
  if (parts[0] === 'create' && parts[1] === 'story') {
    if (!protectPage('/create/story')) return;
    history.replaceState({}, '', '/workroom');
    state.openCreateStory = true; loadPage('workroom'); return;
  }
  if (parts[0] === 'legal' && parts[1] === 'privacy') { history.replaceState({}, '', '/privacy'); render(); return; }
  if (parts[0] === 'legal' && parts[1] === 'terms') { history.replaceState({}, '', '/terms'); render(); return; }
  if (parts[0] === 'discovery') {
    state.discoverySection = (parts[1] || 'all').toLowerCase();
    if (!state.homeLoaded) void loadHome(); else render();
    return;
  }
  if (parts[0] === 'story' && parts[1]) { loadStory(parts[1]); return; }
  if (parts[0] === 'read' && parts[1] && parts[2]) { loadStory(parts[1], parts[2]); return; }
  if ((parts[0] === 'auth' && parts[1] === 'intent' && parts.length === 2) || parts[0] === 'login' || parts[0] === 'signup' || parts[0] === 'forgot-password' || parts[0] === 'reset-password') { render(); return; }
  if (parts[0] === 'library' || parts[0] === 'workroom' || parts[0] === 'profile') {
    if (!protectPage(location.pathname)) return;
    if (parts[0] === 'workroom' && parts[1] === 'story' && parts[2] && parts[3] === 'chapter' && parts[4]) { loadPage('chapter-editor', { storyId: parts[2], chapterId: parts[4] }); return; }
    if (parts[0] === 'workroom' && parts[1] === 'story' && parts[2] && parts[3] === 'import') { loadPage('manuscript-import', parts[2]); return; }
    if (parts[0] === 'workroom' && parts[1] === 'story' && parts[2]) { loadPage('manage-story', parts[2]); return; }
    if (parts[0] === 'profile') {
      const mobileSection = (parts[1] || '').toLocaleLowerCase();
      if (mobileSection === 'gems') { history.replaceState({}, '', '/profile/balance'); loadPage('profile-balance'); return; }
      if (parts[1] === 'report') { state.page = 'report'; state.pageData = null; state.pageLoading = false; state.pageError = ''; render(); return; }
      const profilePages = { settings: 'profile-settings', balance: 'profile-balance', gems: 'profile-balance', rewards: 'profile-rewards', 'alpha-perks': 'profile-alpha', exchange: 'profile-rewards', service: 'profile-service', 'top-up': 'profile-top-up', subscription: 'profile-subscription', inbox: 'profile-inbox', blocked: 'profile-blocked', 'author-center': 'profile-author-center', 'author-analytics': 'profile-author-analytics', analytics: 'profile-author-analytics', 'creator-center': 'creator-center', 'payout-request': 'profile-payout-request', promotions: 'profile-promotions', moderation: 'profile-moderation', 'agora-coins': 'profile-coins' };
      if (parts[1] && !profilePages[mobileSection]) { render(); return; }
      loadPage(profilePages[mobileSection] || 'profile'); return;
    }
    loadPage(parts[0]); return;
  }
  if (parts[0] === 'community') {
    if (parts[1] === 'post' && parts[2]) { loadPage('community-post', parts[2]); return; }
    if (parts[1] && isUuid(parts[1])) { history.replaceState({}, '', `/community/post/${encodeURIComponent(parts[1])}`); loadPage('community-post', parts[1]); return; }
    loadPage('community'); return;
  }
  if(parts[0]==='events' && parts.length===2){state.competitionTab='Overview';loadPage('event-detail',parts[1]);return;}
  if (parts[0] === 'events') { state.eventsTab ||= 'Live'; state.pageLoading = true; state.pageError = ''; state.pageData = {}; render(); loadPage('events'); return; }
  if (parts[0] === 'creator' && parts[1]) { loadPage('creator', parts[1]); return; }
  if (parts.length === 0) {
    state.page = null; state.pageData = null; state.pageError = '';
    state.loading = false; state.error = ''; state.story = null; state.chapter = null;
    render(); return;
  }
  state.loading = false; state.story = null; state.chapter = null; render();
}

function partsForRecoveryCallback() {
  if (currentPathname() !== '/auth/callback') return false;
  const params = new URLSearchParams(location.search);
  if (params.get('flow') !== 'recovery') return false;
  if (location.hash.includes('access_token=')) {
    history.replaceState({}, '', `/reset-password${location.hash}`);
    render();
  } else {
    history.replaceState({}, '', '/forgot-password');
    state.authNotice = 'That password reset link could not be verified. Request a fresh link and try again.';
    render();
  }
  return true;
}
  return { route };
}
