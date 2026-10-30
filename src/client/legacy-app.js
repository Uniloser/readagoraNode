import { sanitizeStoryHtml } from '../lib/story-html.js';
import { loadPreviousChampion, renderEventsPage } from '../features/events/page.js';
import { createBrowserApi, readStoredSession } from '../lib/api/browser-client.js';
import { author, esc, icon, image, installImageFallbacks } from '../lib/ui/markup.js';
import { enhancePageLandmarks } from '../lib/ui/page-landmarks.js';
import { createDiscoveryViews } from '../features/discovery/views.js';
import { createSiteAdsView } from '../features/discovery/site-ads.js';
import { createSearchController } from '../features/discovery/search-controller.js';
import { createSearchView } from '../features/discovery/search-view.js';
import { createDiscoveryLoader } from '../features/discovery/loader.js';
import { createStoryAdFeature } from '../features/discovery/story-ad.js';
import { createDiscoveryInteractions } from '../features/discovery/interactions.js';
import { createDiscoveryTracking } from '../features/discovery/tracking.js';
import { createCommunityViews } from '../features/community/views.js';
import { createCommunityActions } from '../features/community/actions.js';
import { createRouteController } from './route-controller.js';
import { createWorkroomViews } from '../features/workroom/views.js';
import { createComicEditorActions } from '../features/workroom/comic-editor.js';
import { createProfileViews } from '../features/profile/views.js';
import { createAuthorCenterView } from '../features/profile/author-center.js';
import { createCreatorsViews } from '../features/creators/views.js';
import { createReaderViews } from '../features/stories/reader-view.js';
import { bindReaderSettings } from '../features/stories/reader-settings.js';
import { createBrowserSpeechPlayer, segmentSpeechText } from '../features/stories/browser-speech.js';
import { beginGoogleOAuth, completeGoogleOAuth } from '../features/auth/browser-oauth.js';
import { createNavigationViews } from '../features/navigation/views.js';
import { createAuthViews } from '../features/auth/views.js';
import { safeInternalPath, takeSignupReturnPath } from '../features/auth/redirects.js';
import { createStoryDetailViews } from '../features/stories/detail-view.js';
import { createReadingProgressTracker } from '../features/stories/reading-progress.js';
import { createStoryLoader } from '../features/stories/loader.js';
import { createLibraryViews } from '../features/library/views.js';
import { bindLibraryInteractions } from '../features/library/interactions.js';
import { createStoryActions } from '../features/stories/actions.js';
import { createPageRenderer } from './page-renderer.js';
import { bindChampionReveal, renderChampionReveal } from '../features/events/champion-reveal.js';
import { createAccountAndWorkroomActions } from '../features/pages/actions.js';
import { createFormController } from '../features/forms/controller.js';
import { createChapterDraftRecovery } from '../features/forms/chapter-draft-recovery.js';
import { createPageLoader } from '../features/pages/loader.js';
import { createLegalPages } from '../features/pages/legal.js';
import { creatorCenterView } from '../features/creators/center.js';
import { renderCreatorGuide } from '../features/creators/guide.js';
import { clearOfflineLibrary, getOfflineChapter, getOfflineChapters, getOfflineStory, listOfflineStories, removeOfflineStory, saveStoryOffline } from '../lib/offline-library.js';

const API_URL = (window.READAGORA_API_URL || '').replace(/\/$/, '');
const SUPABASE_URL = (window.READAGORA_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = window.READAGORA_SUPABASE_ANON_KEY || '';
const app = document.querySelector('#app');
let sponsorFlagAnimation = null;
let sponsorAdTimer = null;
function readReaderSettings() {
  const defaults = { size: 18, lineHeight: 1.75, width: 680, font: 'sans', theme: 'night', autoPlayNext: false };
  try {
    const saved = JSON.parse(localStorage.getItem('readagora-reader-settings') || '{}');
    const savedWidth = Number(saved.width);
    return {
      size: Math.max(16, Math.min(24, Number(saved.size) || defaults.size)),
      lineHeight: Math.max(1.55, Math.min(1.95, Number(saved.lineHeight) || defaults.lineHeight)),
      width: [560, 680, 720, 800].includes(savedWidth) ? savedWidth : defaults.width,
      font: ['sans', 'serif'].includes(saved.font) ? saved.font : defaults.font,
      theme: ['night', 'warm', 'paper'].includes(saved.theme) ? saved.theme : defaults.theme,
      autoPlayNext: saved.autoPlayNext === true,
    };
  } catch {
    return defaults;
  }
}
const state = { shelves: [], siteAds: [], siteAdsLoaded: false, siteAdsLoading: false, rankingSort: 'hot', rankingLists: {}, comicStories: [], followedStories: [], followedCreators: [], creatorFeedPosts: [], followedContentErrors: {}, genreFilter: 'all', formatFilter: 'all', homeLoaded: false, story: null, chapters: [], chapter: null, comments: [], storyFollowing: false, storyRecommendations: [], supportBalance: null, supportGift: 10, supportOpen: false, supportSending: false, supportError: '', speechActive: false, speechPaused: false, speechRate: 1, speechVoice: '', speechVoices: [], speechIndex: 0, speechTotal: 0, speechError: '', page: null, pageData: null, pageLoading: false, pageError: '', pageLoadError: false, pageArgument: '', query: '', searchGenre: '', loading: true, error: '', readerSettings: readReaderSettings(), readerSidebarCollapsed: false, readerScrollTimer: null, readerLastScrollY: 0, session: readStoredSession(), user: null, workroomStatus: 'all', workroomQuery: '', chapterSaveTimer: null, workroomImport: null, isOffline: navigator.onLine === false, offlineSaved: false, offlineSaving: false, offlineDownloads: [], premiumGate: false, chapterAccess: null, premiumBusy: false };
const chapterDraftRecovery = createChapterDraftRecovery({ state });
chapterDraftRecovery.bindLeaveWarning();
let invalidateHomeLoads = () => {};
// Loaders receive this stable callback before the page renderer can be built.
// The real renderer is assigned below, after its view dependencies exist.
let pageRender = () => {};
const render = (...args) => pageRender(...args);
let pageLoad = () => {};
const loadPage = (...args) => pageLoad(...args);
function resetPersonalizedHome() {
  invalidateHomeLoads();
  state.homeLoaded = false;
  state.storyAdLoaded = false;
  state.followedStories = [];
  state.followedCreators = [];
  state.creatorFeedPosts = [];
  state.bookmarkedStoryIds = new Set();
  state.followedContentErrors = {};
}
state.readerResumePanelIndex = null;
const { api, saveSession, refreshSession } = createBrowserApi({
  apiUrl: API_URL, supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY, state,
});
const storyAdFeature = createStoryAdFeature({ state, api, app, render, navigate, esc, image });
const discoveryLoader = createDiscoveryLoader({ state, api, render, loadStoryAd: storyAdFeature.load });
const discoveryInteractions = createDiscoveryInteractions({ state, app, openSearch: () => openSearch(), scheduleSearch: (...args) => scheduleSearch(...args), cancelScheduledSearch: () => cancelScheduledSearch(), searchStories: (...args) => searchStories(...args), render });
const discoveryTracking = createDiscoveryTracking({ state, api, app });
const { loadHome } = discoveryLoader;
invalidateHomeLoads = discoveryLoader.invalidate;
const readingProgress = createReadingProgressTracker({ state, api, app });
const { openSearch, searchStories, searchGenreStories, scheduleSearch, cancelScheduledSearch } = createSearchController({ api, esc, image, author, navigate });
const speechPlayer = createBrowserSpeechPlayer(updateNarrationState, () => {
  if (!state.readerSettings.autoPlayNext || !state.story || !state.chapter || !location.pathname.startsWith('/read/')) return;
  const currentIndex = state.chapters.findIndex(chapter => chapter.id === state.chapter.id);
  const nextChapter = state.chapters[currentIndex + 1];
  if (!nextChapter || nextChapter.accessible === false || nextChapter.is_locked) return;
  state.autoPlayNextChapterId = nextChapter.id;
  navigate(`/read/${encodeURIComponent(state.story.id)}/${encodeURIComponent(nextChapter.id)}`);
});
state.speechRate = speechPlayer.rate;
state.speechVoice = speechPlayer.voiceURI;
state.speechVoices = speechPlayer.getVoices();
installImageFallbacks();

function updateNarrationState(snapshot) {
  state.speechActive = snapshot.active;
  state.speechPaused = snapshot.paused;
  state.speechRate = snapshot.rate;
  state.speechVoice = snapshot.voiceURI;
  state.speechIndex = snapshot.index;
  state.speechTotal = snapshot.total;
  state.speechError = snapshot.error;
  const button = app?.querySelector('[data-action="reader-speech-toggle"]');
  if (button) {
    button.textContent = snapshot.active && !snapshot.paused ? 'Pause' : snapshot.paused ? 'Resume' : 'Play';
    button.setAttribute('aria-label', `${snapshot.active && !snapshot.paused ? 'Pause' : snapshot.paused ? 'Resume' : 'Play'} chapter narration`);
  }
  const status = app?.querySelector('[data-speech-status]');
  if (status) status.textContent = snapshot.error || (snapshot.total ? `Paragraph ${Math.min(snapshot.index + 1, snapshot.total)} of ${snapshot.total}` : 'Select Play to listen to this chapter.');
  const rateSelect = app?.querySelector('[data-speech-rate]');
  if (rateSelect && rateSelect.value !== String(snapshot.rate)) rateSelect.value = String(snapshot.rate);
}

function refreshSpeechVoiceOptions() {
  if (!speechPlayer) return;
  state.speechVoices = speechPlayer.getVoices();
  const select = app?.querySelector('[data-speech-voice]');
  if (!select) return;
  const current = state.speechVoice;
  select.replaceChildren(new Option('System default', ''), ...state.speechVoices.map(voice => new Option(`${voice.name} · ${voice.lang}`, voice.voiceURI)));
  select.value = state.speechVoices.some(voice => voice.voiceURI === current) ? current : '';
}

if ('speechSynthesis' in window) window.speechSynthesis.addEventListener?.('voiceschanged', refreshSpeechVoiceOptions);

const { header, footer, mobileTabs } = createNavigationViews({ state, esc, icon });
const { searchPage } = createSearchView({ state, esc, icon, header, footer, mobileTabs });
const { siteAdsView } = createSiteAdsView({ state, esc });
const { storyPage, supportGiftDialog } = createStoryDetailViews({ state, esc, icon, image, author, storyCard, header, footer, mobileTabs });
const { authPage, authLandingPage, signedOutPage } = createAuthViews({ state, esc, header, footer, mobileTabs });

const COMMUNITY_TERMS_VERSION = '2026-09-14';
const termsAccepted = () => {
  if (state.session?.user?.app_metadata?.community_terms_version === COMMUNITY_TERMS_VERSION) return true;
  try { return localStorage.getItem('readagora-community-terms') === COMMUNITY_TERMS_VERSION; } catch { return false; }
};
const termsField = () => termsAccepted() ? '' : `<label class="terms-accept"><input type="checkbox" name="accept_terms" required/> I agree to the <a href="/terms" data-link>Community Terms</a>.</label>`;
async function ensureTerms(form) {
  if (termsAccepted()) return;
  if (new FormData(form).get('accept_terms') !== 'on') throw new Error('Please accept the Community Terms before contributing.');
  await api('/users/me/community-terms', { method: 'POST', body: { version: COMMUNITY_TERMS_VERSION, accepted: true } });
  try { localStorage.setItem('readagora-community-terms', COMMUNITY_TERMS_VERSION); } catch { /* The server remains the source of truth when browser storage is unavailable. */ }
  // The API updates Supabase app metadata; refresh so the next content write
  // carries a token with the accepted terms claim.
  await refreshSession();
}

function storyCard(story, index = 0, ranked = false, discoveryTracking = null) {
  const genre = story.genre || (story.content_type === 'comic' ? 'Comic' : 'Original');
  const saved = state.bookmarkedStoryIds?.has(String(story.id)) || false;
  const discoveryAttributes = discoveryTracking && discoveryTracking.shelfId && Number.isInteger(Number(discoveryTracking.position))
    ? `data-discovery-story="${esc(String(story.id))}" data-discovery-shelf="${esc(String(discoveryTracking.shelfId))}" data-discovery-position="${Number(discoveryTracking.position)}"`
    : '';
  const views = Number(story.view_count || 0);
  return `<article class="story-card" style="--card-index:${index}">
    <a class="story-card-link" href="/story/${encodeURIComponent(story.id)}" data-link ${discoveryAttributes} aria-label="Open ${esc(story.title)} by ${esc(author(story))}"><div class="card-art">${image(story.cover_url, story.title)}${ranked ? `<span class="ranking-badge" aria-label="Rank ${index + 1}">${String(index + 1).padStart(2, '0')}</span>` : ''}</div><div class="card-copy"><h3>${esc(story.title)}</h3><p>by ${esc(author(story))}</p><div class="card-meta-row"><span class="card-genre">${esc(genre)}</span>${views > 0 ? `<span class="card-read-count" aria-label="${views.toLocaleString()} reads">${icon('eye', 'card-read-icon')}<span>${views.toLocaleString()}</span></span>` : ''}</div></div></a>
    <button class="save-button" type="button" aria-label="${saved ? 'Remove' : 'Add'} ${esc(story.title)} ${saved ? 'from' : 'to'} your library" aria-pressed="${saved}" data-title="${esc(story.title)}" data-saved="${saved}" data-save="${esc(story.id)}">${saved ? '&#10003;' : '+'}</button>
  </article>`;
}

function sponsorRail() {
  return '';
}

function initSponsorFlagAnimation() {
  sponsorFlagAnimation?.destroy();
  sponsorFlagAnimation = null;
  const container = document.querySelector('[data-lottie-flag]');
  if (!container || !window.lottie) return;
  sponsorFlagAnimation = window.lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: false,
    autoplay: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    path: '/assets/waving-flag.json',
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
  });
  let direction = 1;
  sponsorFlagAnimation.addEventListener('complete', () => {
    direction *= -1;
    sponsorFlagAnimation?.setDirection(direction);
    sponsorFlagAnimation?.play();
  });
}
window.addEventListener('readagora:lottie-ready', initSponsorFlagAnimation);

function initSponsorAdRotation() {
  if (sponsorAdTimer) window.clearInterval(sponsorAdTimer);
  sponsorAdTimer = null;
  const rotation = document.querySelector('[data-ad-rotation]');
  if (!rotation) return;
  const slides = [...rotation.querySelectorAll('[data-ad-slide]')];
  if (slides.length < 2) return;
  let active = Math.max(0, slides.findIndex(slide => !slide.hidden));
  sponsorAdTimer = window.setInterval(() => {
    active = (active + 1) % slides.length;
    slides.forEach((slide, index) => { slide.hidden = index !== active; });
  }, 8000);
}

function home() {
  const noFilterResults = !state.loading && !state.error && (state.genreFilter !== 'all' || state.formatFilter !== 'all') && filterStories(discoveryStories()).length === 0;
  return `${header()}<main class="home-shell">${state.pageError ? `<div class="notice error-notice action-error" role="alert">${esc(state.pageError)} <button type="button" data-action="clear-page-error">Dismiss</button></div>` : ''}<div class="wide-page-layout discovery-layout"><div class="wide-page-main"><section class="screen-heading discover-heading"><div><span class="eyebrow">READAGORA / DISCOVER</span><h1>Find something you can't put down.</h1><p>Stories, comics, and new voices for wherever your imagination wants to go.</p></div></section>${siteAdsView()}${discoveryControls()}${state.loading ? `<section class="loading-shelf"><h2>Finding stories...</h2><div class="skeleton-row"><i></i><i></i><i></i><i></i></div></section>` : state.error ? `<section class="empty-state"><h2>We couldn't load these stories. Try again.</h2><p>${esc(state.error)}</p><button class="primary-button" data-retry>Try again</button></section>` : `${featuredDiscovery()}${noFilterResults ? `<section class="discover-empty"><h2>No stories match these filters</h2><p>Try another genre or format.</p></section>` : `${state.shelves.map(shelfMarkup).join('')}${discoveryExtraSections()}`}`}</div></div></main>${footer()}${mobileTabs()}${storyAdFeature.dialogView()}`;
}

const safeText = sanitizeStoryHtml;

function saveReaderPosition() {
  const key = readerPositionKey();
  if (!key || location.pathname !== `/read/${encodeURIComponent(state.story.id)}/${encodeURIComponent(state.chapter.id)}`) return;
  try {
    localStorage.setItem(key, String(Math.max(0, Math.round(window.scrollY))));
  } catch {
    state.pageError = 'Reading progress could not be saved on this device.';
  }
}

const { libraryView, libraryLoadingView } = createLibraryViews({ state, esc, image, icon });

function pageFrame(title, subtitle, content) {
  const pageContent = state.pageLoading
    ? (location.pathname === '/library' ? libraryLoadingView() : '<div class="page-loading" role="status">Loading</div>')
    : state.pageLoadError
      ? `<section class="empty-panel page-load-error" role="alert"><h2>This page could not load</h2><p>${esc(state.pageError || 'The ReadAgora server could not be reached. Please try again.')}</p><button type="button" class="outline-button" data-action="page-retry">Try again</button></section>`
      : content;
  const notice = state.pageError && !state.pageLoadError && location.pathname !== '/library'
    ? `<div class="notice error-notice">${esc(state.pageError)}</div>`
    : '';
  return `${header()}<main class="workspace">${notice}${pageContent}</main>${footer()}${mobileTabs()}`;
}

const { accountDeletionPage, termsPage, policyPage } = createLegalPages({ esc, header, footer, mobileTabs });

const { discoveryStories, filterStories, featuredDiscoveryStory, discoveryControls, featuredDiscovery, rankingBoard, discoveryExtraSections, shelfMarkup } = createDiscoveryViews({ state, esc, icon, image, author, storyCard });
const { communityView, communityPostCard, communityComposerModal, communityPostView } = createCommunityViews({ state, esc, icon, image, author, termsField });
const { handleAction: handleCommunityAction } = createCommunityActions({ state, api, app, loadPage, render, navigate, communityComposerModal, bind: () => bind() });
const { workroomView, newStoryModal, manageStoryView, chapterEditorView, manuscriptImportView } = createWorkroomViews({ state, esc, icon, image, termsField, safeText });
const pageLoader = createPageLoader({ state, api, render, app, bind: () => bind(), newStoryModal, loadPreviousChampion, listOfflineStories, restoreChapterDraft: chapterDraftRecovery.restore });
pageLoad = pageLoader.loadPage;
const invalidatePageLoads = pageLoader.invalidate;
const { handleAction: handleComicEditorAction, handleForm: handleComicEditorForm, bindUploads: bindComicUploads } = createComicEditorActions({ state, api, app, loadPage, render });
const { profileView, profileDashboardView, profileSettingsView, profileBalanceView, rewardsView, supportView, profileTopUpView, profileSubscriptionView, alphaPerksView, profileInboxView, profileBlockedView, authorAnalyticsView, reportView, moderationView, coinsWalletView } = createProfileViews({ state, esc, icon, termsField });
const authorCenterView = createAuthorCenterView({ state, esc });
const { publicProfileView, promotionsView } = createCreatorsViews({ state, esc, icon, image, author, communityPostCard });
const { readerPage, chapterCommentsView, applyReaderSettings, saveReaderSettings, readerPositionKey } = createReaderViews({ state, esc, icon, author, header, footer, mobileTabs, app, safeText });
const storyLoader = createStoryLoader({ state, api, app, render, readingProgress, speechPlayer, getOfflineStory, getOfflineChapters, getOfflineChapter, readerPositionKey });
const { loadStory } = storyLoader;
let invalidateStoryLoads = storyLoader.invalidate;
const storyActions = createStoryActions({ state, api, app, navigate, render, loadStory, speechPlayer, segmentSpeechText, removeOfflineStory, saveStoryOffline, icon });
function eventsView() { return renderEventsPage({ tab: state.eventsTab || 'Live', champion: state.pageData?.champion || null, loading: state.pageLoading, error: state.pageError }); }

pageRender = createPageRenderer({ state, app, currentPathname, bind: () => bind(), initSponsorFlagAnimation, initSponsorAdRotation, loadHome, header, footer, mobileTabs, readerPage, storyPage, chapterEditorView, manuscriptImportView, pageFrame, authPage, authLandingPage, searchPage, libraryView, communityView, eventsView, renderChampionReveal, renderCreatorGuide, workroomView, manageStoryView, profileDashboardView, authorCenterView, creatorCenterView, authorAnalyticsView, promotionsView, reportView, moderationView, coinsWalletView, profileSettingsView, profileBalanceView, rewardsView, supportView, alphaPerksView, profileTopUpView, profileSubscriptionView, profileInboxView, profileBlockedView, accountDeletionPage, policyPage, termsPage, publicProfileView, communityPostView, home, discoveryStories, storyCard, esc }).render;
const formController = createFormController({ state, app, api, SUPABASE_URL, SUPABASE_KEY, saveSession, resetPersonalizedHome, navigate, loadPage, loadStory, render, safeInternalPath, clearOfflineLibrary, ensureTerms, handleComicEditorForm, chapterDraftRecovery });
const { handleFormSubmit, saveChapterDraft } = formController;
const accountAndWorkroomActions = createAccountAndWorkroomActions({ state, app, api, render, navigate, loadHome, loadPage, loadStory, currentPathname, saveSession, resetPersonalizedHome, removeOfflineStory, bind: () => bind(), newStoryModal, saveChapterDraft });

function protectPage(path) {
  if (state.session) return true;
  app.innerHTML = signedOutPage(path);
  enhancePageLandmarks(app, 'Sign in to continue');
  bind();
  return false;
}

function processAuthHash() {
  if (!location.hash.includes('access_token=')) return;
  const params = new URLSearchParams(location.hash.slice(1));
  const accessToken = params.get('access_token');
  if (accessToken) {
    saveSession({ access_token: accessToken, refresh_token: params.get('refresh_token'), expires_in: Number(params.get('expires_in') || 3600), token_type: params.get('token_type') || 'bearer' });
    resetPersonalizedHome();
    history.replaceState({}, '', params.get('type') === 'recovery' ? '/reset-password' : takeSignupReturnPath());
  }
}

function processOAuthCallback() {
  if (location.pathname !== '/auth/callback') return false;
  render();
  void (async () => {
    try {
      const result = await completeGoogleOAuth({ supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY });
      if (!result) return;
      const { session, returnTo } = result;
      saveSession(session);
      resetPersonalizedHome();
      state.user = session.user || null;
      navigate(returnTo);
    } catch (error) {
      history.replaceState({}, '', '/login');
      state.authNotice = error instanceof Error ? error.message : 'Google sign-in could not be completed. Please try again.';
      render();
    }
  })();
  return true;
}

function navigate(path) {
  if (path.startsWith('/signup')) {
    state.authConfirmationEmail = '';
    state.authConfirmationSent = false;
    state.authNotice = '';
  }
  history.pushState({}, '', path); route(); window.scrollTo(0, 0);
}

function currentPathname() {
  try { return decodeURI(location.pathname); }
  catch { return location.pathname; }
}

const { route } = createRouteController({ state, processAuthHash, processOAuthCallback, currentPathname, searchStories, searchGenreStories, render, protectPage, loadPage, navigate, loadHome, loadStory, invalidatePageRequests: () => { invalidatePageLoads(); invalidateStoryLoads(); invalidateHomeLoads(); } });

function setOfflineMode(offline) {
  const changed = state.isOffline !== offline;
  state.isOffline = offline;
  if (!changed || currentPathname() !== '/library') return;
  if (offline) state.libraryTab = 'offline';
  void loadPage('library');
}
window.addEventListener('offline', () => setOfflineMode(true));
window.addEventListener('online', () => setOfflineMode(false));

function bind() {
  const contributionForms = new Set(['post', 'new-story', 'story-settings', 'new-chapter', 'edit-chapter', 'post-comment', 'chapter-comment', 'manuscript-import']);
  if (location.pathname.startsWith('/read/')) {
    speechPlayer.setSegments(segmentSpeechText(app.querySelector('.reader-article .prose')?.innerText || ''));
    if (state.autoPlayNextChapterId && !state.loading) {
      const nextChapterContent = app.querySelector('.reader-article .prose');
      const shouldPlayNext = state.chapter?.id === state.autoPlayNextChapterId && nextChapterContent;
      state.autoPlayNextChapterId = null;
      if (shouldPlayNext) speechPlayer.play(segmentSpeechText(nextChapterContent.innerText || ''));
    }
  }
  refreshSpeechVoiceOptions();
  discoveryTracking.bind();
  if (location.pathname.startsWith('/read/') && !app.querySelector('[data-action="reader-speech-toggle"]')) {
    app.querySelector('.reader-controls')?.insertAdjacentHTML('afterbegin', '<button type="button" class="icon-button" data-action="reader-speech-toggle" aria-label="Listen to chapter">Listen</button><button type="button" class="icon-button" data-action="reader-speech-stop" aria-label="Stop narration">Stop</button><span class="sr-only" data-speech-status aria-live="polite"></span>');
  }
  const prose = app.querySelector('.reader-article .prose');
  const selectionToolbar = app.querySelector('.reader-selection-toolbar');
  if (prose && selectionToolbar) {
    const updateSelectionToolbar = () => {
      const selection = window.getSelection();
      const quote = selection?.toString().trim() || '';
      const anchor = selection?.anchorNode;
      if (!quote || quote.length > 10000 || !anchor || !prose.contains(anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement)) {
        selectionToolbar.hidden = true;
        return;
      }
      const quoteButton = selectionToolbar.querySelector('[data-action="comment-quote-selection"]');
      const shareButton = selectionToolbar.querySelector('[data-action="reader-share-selection"]');
      if (quoteButton) quoteButton.dataset.quote = quote;
      if (shareButton) shareButton.dataset.quote = quote;
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      selectionToolbar.hidden = false;
      const toolbarWidth = selectionToolbar.offsetWidth || 112;
      selectionToolbar.style.left = `${Math.max(8, Math.min(window.innerWidth - toolbarWidth - 8, rect.left + rect.width / 2 - toolbarWidth / 2))}px`;
      selectionToolbar.style.top = `${Math.max(8, rect.top - selectionToolbar.offsetHeight - 8)}px`;
    };
    prose.addEventListener('pointerup', updateSelectionToolbar);
    prose.addEventListener('keyup', updateSelectionToolbar);
    selectionToolbar.addEventListener('mousedown', event => event.preventDefault());
  }
  app.querySelectorAll('form[data-form]').forEach(form => {
    if (contributionForms.has(form.dataset.form) && !termsAccepted() && !form.querySelector('[name="accept_terms"]')) form.insertAdjacentHTML('beforeend', termsField());
  });
  app.querySelectorAll('form[data-form="chapter-comment"] textarea[name="text"]').forEach(textarea => {
    const form = textarea.form;
    const submit = form?.querySelector('[type="submit"]');
    if (!form || !submit) return;
    const updateAvailability = () => { submit.disabled = !textarea.value.trim(); };
    textarea.addEventListener('input', updateAvailability);
    updateAvailability();
  });
  app.querySelectorAll('[data-events-tab]').forEach(button => button.addEventListener('click', () => { state.eventsTab = button.dataset.eventsTab || 'Live'; render(); }));
  app.querySelectorAll('[data-action="dismiss-site-ad"]').forEach(button => button.addEventListener('click', () => {
    const id = String(button.dataset.id || '');
    let dismissed = [];
    try { dismissed = JSON.parse(localStorage.getItem('readagora-dismissed-site-ads') || '[]'); } catch { /* Ignore malformed browser storage. */ }
    if (id && !dismissed.includes(id)) dismissed.push(id);
    try { localStorage.setItem('readagora-dismissed-site-ads', JSON.stringify(dismissed)); } catch { /* Dismiss for this render even when storage is unavailable. */ }
    state.siteAds = (state.siteAds || []).filter(ad => String(ad.id) !== id);
    render();
  }));
  app.querySelectorAll('[data-creator-tab]').forEach(button => button.addEventListener('click', () => { state.creatorGuideTab = button.dataset.creatorTab; render(); }));
  app.querySelectorAll('[data-profile-tab]').forEach(button => button.addEventListener('click', () => { state.creatorProfileTab = button.dataset.profileTab || 'stories'; render(); }));
  app.querySelectorAll('[data-creator-center-tab]').forEach(button => button.addEventListener('click', () => { state.creatorCenterTab = button.dataset.creatorCenterTab || 'Overview'; render(); }));
  app.querySelector('[data-promotion-duration]')?.addEventListener('change', event => {
    const option = event.target.selectedOptions?.[0];
    const cost = app.querySelector('[data-promotion-cost]');
    if (cost && option) cost.textContent = `${option.dataset.cost} Gems`;
  });
  app.querySelectorAll('[data-story-access]').forEach(select => select.addEventListener('change', () => {
    const preview = select.closest('form')?.querySelector('[data-free-chapter-count]');
    const countInput = preview?.querySelector('[name="free_chapter_count"]');
    const enabled = select.value === 'PREMIUM';
    if (preview) preview.hidden = !enabled;
    if (countInput) { countInput.disabled = !enabled || state.pageData?.monetization?.status !== 'APPROVED'; countInput.required = enabled; }
  }));
  const coverInput = app.querySelector('form[data-form="story-settings"] input[name="cover"]');
  if (coverInput) {
    const preview = document.createElement('div');
    const story = state.pageData?.story;
    preview.className = 'story-cover-preview';
    preview.setAttribute('aria-label', 'Story cover preview');
    const renderCoverPreview = (url = '') => {
      preview.innerHTML = image(url, story?.title || 'Story cover', 'story-cover-preview-image');
      const coverImage = preview.querySelector('img');
      if (coverImage) coverImage.loading = 'eager';
      const summaryArt = app.querySelector('.story-cover-summary-art');
      if (summaryArt) {
        summaryArt.innerHTML = image(url, story?.title || 'Story cover', 'story-cover-summary-image');
        const summaryImage = summaryArt.querySelector('img');
        if (summaryImage) summaryImage.loading = 'eager';
      }
    };
    renderCoverPreview(story?.cover_url || '');
    coverInput.before(preview);
    coverInput.addEventListener('change', () => {
      const file = coverInput.files?.[0];
      if (!file) {
        renderCoverPreview(story?.cover_url || '');
        return;
      }
      const url = URL.createObjectURL(file);
      renderCoverPreview(url);
      const images = [preview.querySelector('img'), app.querySelector('.story-cover-summary-art img')].filter(Boolean);
      if (!images.length) {
        URL.revokeObjectURL(url);
        return;
      }
      let pendingImages = images.filter(coverImage => !coverImage.complete);
      if (!pendingImages.length) {
        URL.revokeObjectURL(url);
        return;
      }
      const releasePreviewUrl = () => {
        pendingImages = pendingImages.filter(coverImage => !coverImage.complete);
        if (!pendingImages.length) URL.revokeObjectURL(url);
      };
      for (const coverImage of pendingImages) {
        coverImage.addEventListener('load', releasePreviewUrl, { once: true });
        coverImage.addEventListener('error', releasePreviewUrl, { once: true });
      }
    });
  }
  app.querySelector('[data-events-retry]')?.addEventListener('click', () => { void loadPage('events'); });
  app.querySelector('[data-champion-replay]')?.addEventListener('click', () => { state.championRevealOpen = true; render(); });
  bindChampionReveal(app, () => { state.championRevealOpen = false; render(); });
  app.querySelectorAll('[data-link]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute('href');
    event.preventDefault();
    if (location.pathname.startsWith('/read/')) { saveReaderPosition(); if (href !== location.pathname) speechPlayer.stop(); }
    if (/^\/workroom\/story\/[^/]+\/chapter\/[^/]+$/.test(currentPathname()) && href !== location.pathname) {
      void saveChapterDraft().then(saved => { if (saved) navigate(href); });
      return;
    }
    if (href.startsWith('/#')) {
      navigate('/');
      requestAnimationFrame(() => document.querySelector(href.slice(1))?.scrollIntoView({ behavior: 'smooth' }));
    } else navigate(href);
  }));
  app.querySelectorAll('[data-save]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation(); void storyActions.saveStory(button.dataset.save, button);
  }));
  app.querySelector('[data-retry]')?.addEventListener('click', loadHome);
  discoveryInteractions.bind();
  app.querySelectorAll('[data-workroom-status]').forEach(button => button.addEventListener('click', () => { state.workroomStatus = button.dataset.workroomStatus; render(); }));
  app.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
    const editor = app.querySelector('[data-chapter-content]'); if (!editor) return; editor.focus();
    document.execCommand(button.dataset.format, false, button.dataset.value || null); editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }));
  bindReaderSettings({ state, app, speechPlayer, applyReaderSettings, saveReaderSettings });
  const chapterBody = app.querySelector('[data-chapter-content]');
  if (state.chapterDraftRecovered) { clearTimeout(state.chapterSaveTimer); state.chapterSaveTimer = setTimeout(() => void saveChapterDraft(false), 500); }
  app.querySelector('[data-comic-text-toggle]')?.addEventListener('change', event => {
    if (chapterBody && state.pageData?.chapter) state.pageData.chapter.content = chapterBody.innerHTML;
    state.comicTextEnabled = event.currentTarget.checked;
    chapterDraftRecovery.markDirty();
    render();
    requestAnimationFrame(() => void saveChapterDraft());
  });
  chapterBody?.addEventListener('input', () => {
    const text = chapterBody.innerText.trim(); const words = text ? text.split(/\s+/).length : 0;
    const counter = app.querySelector('[data-word-count]'); if (counter) counter.textContent = `${words} words · ${Math.max(1, Math.ceil(words / 200))} min read`;
    const status = app.querySelector('[data-save-status]'); if (status) status.textContent = 'Unsaved changes';
    chapterDraftRecovery.markDirty();
    clearTimeout(state.chapterSaveTimer); state.chapterSaveTimer = setTimeout(() => void saveChapterDraft(false), 2400);
  });
  app.querySelector('[data-chapter-title]')?.addEventListener('input', () => { const status = app.querySelector('[data-save-status]'); if (status) status.textContent = 'Unsaved changes'; chapterDraftRecovery.markDirty(); clearTimeout(state.chapterSaveTimer); state.chapterSaveTimer = setTimeout(() => void saveChapterDraft(false), 2400); });
  if (chapterBody || app.querySelector('[data-chapter-title]')) window.onkeydown = event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && currentPathname().includes('/workroom/story/') && currentPathname().includes('/chapter/')) { event.preventDefault(); void saveChapterDraft(); } };
  bindComicUploads();
  bindLibraryInteractions({ state, app });
  app.querySelector('[data-action="profile"]')?.addEventListener('click', () => navigate('/profile'));
  app.querySelector('#story-search')?.addEventListener('keydown', event => { if (event.key === 'Enter') { openSearch(); searchStories(event.target.value); } });
  app.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', handleAction));
  app.querySelectorAll('[role="dialog"][aria-modal="true"]').forEach(dialog => {
    const focusable = () => [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(element => !element.closest('[hidden]'));
    if (!dialog.contains(document.activeElement)) (dialog.querySelector('[autofocus]') || focusable()[0])?.focus();
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        const closeButton = dialog.querySelector('[data-action="close-modal"],[data-action$="-close"]');
        if (closeButton) { event.preventDefault(); closeButton.click(); }
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  });
  app.querySelectorAll('form[data-form]').forEach(form => form.addEventListener('submit', handleFormSubmit));
  app.querySelector('.community-composer-modal select[name="post_type"]')?.addEventListener('change', event => {
    const fields = app.querySelector('.community-poll-fields');
    if (fields) fields.hidden = event.target.value !== 'poll';
  });
  app.querySelector('.community-composer-modal select[name="story_id"]')?.addEventListener('change', async event => {
    const chapterSelect = app.querySelector('.community-composer-modal select[name="chapter_id"]');
    if (!chapterSelect) return;
    chapterSelect.innerHTML = '<option value="">No chapter attached</option>';
    chapterSelect.disabled = !event.target.value;
    if (!event.target.value) return;
    try {
      const chapters = await api(`/stories/${encodeURIComponent(event.target.value)}/chapters`);
      (chapters || []).filter(chapter => chapter.status === 'published').forEach(chapter => chapterSelect.insertAdjacentHTML('beforeend', `<option value="${esc(chapter.id)}">${esc(chapter.title || `Chapter ${chapter.chapter_order || ''}`)}</option>`));
    } catch { chapterSelect.insertAdjacentHTML('beforeend', '<option value="">Could not load chapters</option>'); }
  });
}

async function handleAction(event) {
  const button = event.currentTarget;
  const action = button.dataset.action;
  try {
    if (await handleComicEditorAction(action, button)) return;
    if (await handleCommunityAction(action, button)) return;
    if (await storyAdFeature.handleAction(action, button)) return;
    if (await storyActions.handleAction(action, button)) return;
    if (action === 'home-followed-retry') { await loadHome(); return; }
    if (action === 'toggle-password') {
      const input = button.closest('.auth-password-field')?.querySelector('input');
      if (!input) return;
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.textContent = visible ? 'Hide' : 'Show';
      button.setAttribute('aria-pressed', String(visible));
      return;
    }
    if (action === 'google-signin') { await startGoogleSignIn(button); return; }
    if (await accountAndWorkroomActions.handleAction(action, button, event) !== false) return;
  } catch (error) { state.pageError = error.message; render(); }
}
async function startGoogleSignIn(button) {
  if (!SUPABASE_URL || !SUPABASE_KEY) { state.authNotice = 'Google sign-in is not configured for this website.'; render(); return; }
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.querySelector('span:last-child').textContent = 'Opening Google…';
  try {
    const next = button.dataset.next || new URLSearchParams(location.search).get('next') || new URLSearchParams(location.search).get('returnTo') || '/';
    await beginGoogleOAuth({ supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY, returnTo: next });
  } catch (error) {
    sessionStorage.removeItem('readagora-pkce-verifier');
    state.authNotice = error instanceof Error ? error.message : 'Google sign-in could not be started. Please try again.';
    render();
  }
}

window.addEventListener('scroll', () => {
  const currentY = Math.max(0, window.scrollY);
  const header = app.querySelector('.reader-topbar');
  if (!location.pathname.startsWith('/read/')) {
    header?.classList.remove('is-hidden');
    state.readerLastScrollY = currentY;
    return;
  }
  const delta = currentY - state.readerLastScrollY;
  if (currentY < 80 || delta < -3) header?.classList.remove('is-hidden');
  else if (delta > 3) {
    header?.classList.add('is-hidden');
    header?.querySelectorAll('details[open]').forEach(details => { details.open = false; });
  }
  state.readerLastScrollY = currentY;
  clearTimeout(state.readerScrollTimer);
  state.readerScrollTimer = window.setTimeout(saveReaderPosition, 300);
  readingProgress.schedule();
}, { passive: true });

window.addEventListener('pagehide', () => { saveReaderPosition(); void readingProgress.sync(true); });
window.addEventListener('keydown', event => {
  if (!location.pathname.startsWith('/read/') || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const target = event.target;
  if (target instanceof Element && target.closest('a,button,input,select,textarea,summary,[contenteditable="true"],[role="dialog"]')) return;
  const index = state.chapters.findIndex(chapter => chapter.id === state.chapter?.id);
  const chapter = state.chapters[index + (event.key === 'ArrowRight' ? 1 : -1)];
  if (!chapter || !state.story) return;
  event.preventDefault();
  saveReaderPosition();
  navigate(`/read/${encodeURIComponent(state.story.id)}/${encodeURIComponent(chapter.id)}`);
});

window.addEventListener('popstate', route);
route();
