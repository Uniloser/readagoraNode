const EVENT_START = { year: 2026, month: 10, day: 1 };
const EVENT_END_EXCLUSIVE = { year: 2026, month: 11, day: 1 };
const DAY_MS = 24 * 60 * 60 * 1000;
export {};
function eventCountdown(date = new Date()) {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const start = Date.UTC(EVENT_START.year, EVENT_START.month, EVENT_START.day);
  const end = Date.UTC(EVENT_END_EXCLUSIVE.year, EVENT_END_EXCLUSIVE.month, EVENT_END_EXCLUSIVE.day);
  if (today < start) {
    const days = Math.round((start - today) / DAY_MS);
    return { label: days === 1 ? 'Starts tomorrow' : `Starts in ${days} days`, ended: false };
  }
  if (today < end) return { label: `Ends in ${Math.round((end - today) / DAY_MS)} days`, ended: false };
  return { label: 'Event ended', ended: true };
}

const API_URL = (window.READAGORA_API_URL || '').replace(/\/$/, '');
const SUPABASE_URL = (window.READAGORA_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = window.READAGORA_SUPABASE_ANON_KEY || '';
const app = document.querySelector('#app');
let sponsorFlagAnimation = null;
let sponsorAdTimer = null;
let eventCountdownTimer = null;
function readReaderSettings() {
  const defaults = { size: 20, lineHeight: 1.9, width: 720, font: 'sans', theme: 'night' };
  try {
    const saved = JSON.parse(localStorage.getItem('readagora-reader-settings') || '{}');
    const savedWidth = Number(saved.width);
    return {
      size: Math.max(16, Math.min(28, Number(saved.size) || defaults.size)),
      lineHeight: Math.max(1.5, Math.min(2.2, Number(saved.lineHeight) || defaults.lineHeight)),
      width: savedWidth === 680 ? defaults.width : [560, 720, 800].includes(savedWidth) ? savedWidth : defaults.width,
      font: ['sans', 'serif'].includes(saved.font) ? saved.font : defaults.font,
      theme: ['night', 'warm', 'paper'].includes(saved.theme) ? saved.theme : defaults.theme,
    };
  } catch {
    return defaults;
  }
}
const state = { shelves: [], rankingSort: 'hot', rankingLists: {}, comicStories: [], followedStories: [], genreFilter: 'all', formatFilter: 'all', homeLoaded: false, story: null, chapters: [], chapter: null, comments: [], page: null, pageData: null, pageLoading: false, pageError: '', query: '', loading: true, error: '', readerSettings: readReaderSettings(), readerSidebarCollapsed: false, readerScrollTimer: null, readerLastScrollY: 0, session: readSession(), user: null, workroomStatus: 'all', workroomQuery: '', chapterSaveTimer: null, workroomImport: null };

const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const media = (value) => value || '';
const author = (story) => story.author?.display_name || story.author?.username || 'ReadAgora creator';
const updateLabel = (story) => {
  const updated = story.last_chapter_published_at || story.updated_at;
  const value = updated || story.published_at;
  if (!value || Number.isNaN(Date.parse(value))) return '';
  return `${updated ? 'Updated' : 'Published'} ${new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};
const icon = (name, className = 'nav-icon') => {
  const paths = {
    discover: '<circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2.2 5.4-5.4 2.2 2.2-5.4 5.4-2.2Z"/>',
    library: '<path d="M6 4.5h12a1.5 1.5 0 0 1 1.5 1.5v14l-7.5-4-7.5 4V6A1.5 1.5 0 0 1 6 4.5Z"/><path d="M9 8h6"/>',
    workroom: '<path d="M4.5 19.5 5.7 15 16.5 4.2a2.1 2.1 0 0 1 3 3L8.7 18 4.5 19.5Z"/><path d="m14.8 5.9 3.3 3.3"/>',
    community: '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-2.5 1.5V11.5A7.5 7.5 0 0 1 11 4h1.5a7.5 7.5 0 0 1 7.5 7.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    events: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>',
    profile: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4L17 17.4a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    moon: '<path d="M20.8 13A8.5 8.5 0 0 1 11 3.2 8.5 8.5 0 1 0 20.8 13Z"/>',
  };
  return `<svg class="${className}" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.discover}</svg>`;
};
const image = (url, title, className = '') => url
  ? `<img class="${className} cover-image" src="${esc(media(url))}" alt="Cover of ${esc(title)}" loading="lazy" />`
  : `<div class="cover-fallback ${className}"><span>READAGORA</span><b>${esc(title)}</b></div>`;
document.addEventListener('error', event => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('cover-image')) return;
  const fallback = document.createElement('div');
  fallback.className = `cover-fallback ${[...img.classList].filter(name => name !== 'cover-image').join(' ')}`.trim();
  fallback.setAttribute('role', 'img');
  fallback.setAttribute('aria-label', img.alt || 'Story cover unavailable');
  const brand = document.createElement('span'); brand.textContent = 'READAGORA';
  const title = document.createElement('b'); title.textContent = (img.alt || 'Story cover').replace(/^Cover of\s*/i, '');
  fallback.append(brand, title);
  img.replaceWith(fallback);
}, true);
const COMMUNITY_TERMS_VERSION = '2026-09-14';
const termsAccepted = () => localStorage.getItem('readagora-community-terms') === COMMUNITY_TERMS_VERSION || state.session?.user?.app_metadata?.community_terms_version === COMMUNITY_TERMS_VERSION;
const termsField = () => termsAccepted() ? '' : `<label class="terms-accept"><input type="checkbox" name="accept_terms" required/> I agree to the <a href="/terms" data-link>Community Terms</a>.</label>`;
async function ensureTerms(form) {
  if (termsAccepted()) return;
  if (new FormData(form).get('accept_terms') !== 'on') throw new Error('Please accept the Community Terms before contributing.');
  await api('/users/me/community-terms', { method: 'POST', body: { version: COMMUNITY_TERMS_VERSION, accepted: true } });
  localStorage.setItem('readagora-community-terms', COMMUNITY_TERMS_VERSION);
  // The API updates Supabase app metadata; refresh so the next content write
  // carries a token with the accepted terms claim.
  await refreshSession();
}

function readSession() {
  try { return JSON.parse(localStorage.getItem('readagora-session') || 'null'); } catch { return null; }
}

function saveSession(session) {
  state.session = session || null;
  if (session) localStorage.setItem('readagora-session', JSON.stringify(session));
  else localStorage.removeItem('readagora-session');
}

async function refreshSession() {
  if (!state.session?.refresh_token || !SUPABASE_URL || !SUPABASE_KEY) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: state.session.refresh_token }),
  });
  const refreshed = await response.json().catch(() => null);
  if (!response.ok || !refreshed?.access_token) { saveSession(null); state.user = null; return null; }
  saveSession(refreshed); return refreshed;
}

async function api(path, options = {}, retried = false) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { Accept: 'application/json', ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (state.session?.access_token && !options.skipAuth) headers.Authorization = `Bearer ${state.session.access_token}`;
  const response = await fetch(`${API_URL}${path}`, { method: options.method || 'GET', headers, ...(options.body ? { body: isFormData ? options.body : JSON.stringify(options.body) } : {}) });
  if (response.status === 401 && !retried && !options.skipAuth && await refreshSession()) return api(path, options, true);
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || body?.error || body?.message || `Request failed (${response.status})`);
  return body?.data ?? body;
}

function header() {
  const current = decodeURI(location.pathname).split('/')[1] || '';
  const link = (path, name, label) => `<a class="${current === path.replace(/^\//, '') || (!current && !path.slice(1)) ? 'active' : ''}" href="${path}" data-link>${icon(name)}<span>${label}</span></a>`;
  const lightTheme = document.documentElement.dataset.theme === 'light';
  const authUser = state.session?.user || {};
  const userMetadata = authUser.user_metadata || {};
  const avatarUrl = state.user?.avatar_url || authUser.avatar_url || userMetadata.avatar_url || userMetadata.picture;
  const accountName = state.user?.display_name || state.user?.username || userMetadata.display_name || userMetadata.username || 'Account';
  const accountControl = state.session
    ? `<button class="account-chip" data-action="profile" aria-label="Open profile for ${esc(accountName)}" title="Open profile">${avatarUrl ? `<img class="account-avatar" src="${esc(avatarUrl)}" alt=""/>` : icon('profile', 'account-icon')}<span>Account</span></button>`
    : `<a class="sign-in" href="/login" data-link>Sign in</a><a class="join-button" href="/signup" data-link>Get started</a>`;
  return `<header class="topbar"><a class="brand" href="/" data-link><img class="brand-image" src="/assets/mark.png" alt=""/><span>readagora</span></a><nav class="main-nav" aria-label="Main navigation">${link('/', 'discover', 'Discover')}${link('/library', 'library', 'Library')}${link('/workroom', 'workroom', 'Workroom')}${link('/community', 'community', 'Community')}${link('/events', 'events', 'Events')}${link('/profile', 'profile', 'Profile')}</nav><div class="header-actions"><button class="icon-button site-theme-toggle" data-action="site-theme" aria-label="Switch to ${lightTheme ? 'dark' : 'light'} theme" title="Switch to ${lightTheme ? 'dark' : 'light'} theme">${icon(lightTheme ? 'moon' : 'sun', 'header-icon')}</button><button class="icon-button search-toggle" aria-label="Search stories" title="Search">${icon('search', 'header-icon')}</button>${accountControl}</div></header>`;
}

function footer() {
  return `<footer class="site-footer"><a class="brand" href="/" data-link><img class="brand-image" src="/assets/mark.png" alt=""/><span>readagora</span></a><p>Stories stay with you.</p><span>Made for readers and the people who create their next world.</span></footer>`;
}

function storyCard(story, index = 0, ranked = false) {
  const genre = story.genre || (story.content_type === 'comic' ? 'Comic' : 'Original');
  return `<a class="story-card" href="/story/${encodeURIComponent(story.id)}" data-link aria-label="Open ${esc(story.title)} by ${esc(author(story))}" style="--card-index:${index}">
    <div class="card-art">${image(story.cover_url, story.title)}${ranked ? `<span class="ranking-badge" aria-label="Rank ${index + 1}">${String(index + 1).padStart(2, '0')}</span>` : ''}<button class="save-button" type="button" aria-label="Save ${esc(story.title)}" data-save="${esc(story.id)}">＋</button></div>
    <div class="card-copy"><span class="card-genre">${esc(genre)}</span></div>
  </a>`;
}

function discoveryStories() {
  return [...new Map([
    ...state.shelves.flatMap(shelf => shelf.stories || []),
    ...Object.values(state.rankingLists).flat(),
    ...state.comicStories,
    ...state.followedStories,
  ].filter(story => story?.id).map(story => [story.id, story])).values()];
}

function filterStories(stories = []) {
  return stories.filter(story => {
    const genreMatch = state.genreFilter === 'all' || story.genre?.toLocaleLowerCase() === state.genreFilter;
    const formatMatch = state.formatFilter === 'all'
      || (state.formatFilter === 'comic' ? story.content_type === 'comic' : story.content_type !== 'comic');
    return genreMatch && formatMatch;
  });
}

function featuredDiscoveryStory() {
  const candidates = [
    ...state.shelves.filter(shelf => shelf.type === 'for_you').flatMap(shelf => shelf.stories || []),
    ...state.shelves.filter(shelf => shelf.type === 'recently_updated').flatMap(shelf => shelf.stories || []),
    ...discoveryStories(),
  ];
  return filterStories([...new Map(candidates.filter(story => story?.id).map(story => [story.id, story])).values()])[0] || null;
}

function discoveryControls() {
  const genres = [...new Set(discoveryStories().map(story => story.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const preferred = ['romance', 'fantasy', 'mystery'];
  const quickGenres = preferred.map(name => genres.find(genre => genre.toLocaleLowerCase() === name)).filter(Boolean);
  for (const genre of genres) if (quickGenres.length < 3 && !quickGenres.includes(genre)) quickGenres.push(genre);
  const moreGenres = genres.filter(genre => !quickGenres.includes(genre));
  const activeGenre = state.genreFilter !== 'all' && state.formatFilter !== 'comic' ? state.genreFilter : '';
  const tab = (label, genre, format = 'all') => `<button class="discover-tab ${state.genreFilter === genre && state.formatFilter === format ? 'active' : ''}" type="button" data-discover-tab data-genre="${esc(genre)}" data-format="${format}" aria-pressed="${state.genreFilter === genre && state.formatFilter === format}">${label}</button>`;
  return `<nav class="discover-tabs" aria-label="Explore stories">${tab('For you', 'all')} ${quickGenres.map(genre => tab(esc(genre), genre.toLocaleLowerCase())).join(' ')} ${tab('Comics', 'all', 'comic')} ${moreGenres.length ? `<details class="genre-more"><summary class="discover-tab ${moreGenres.some(genre => genre.toLocaleLowerCase() === activeGenre) ? 'active' : ''}">More genres <span aria-hidden="true">⌄</span></summary><div class="genre-menu">${moreGenres.map(genre => `<button type="button" data-discover-tab data-genre="${esc(genre.toLocaleLowerCase())}" data-format="all" aria-pressed="${genre.toLocaleLowerCase() === activeGenre}">${esc(genre)}</button>`).join('')}</div></details>` : ''}</nav>`;
}

function featuredDiscovery() {
  const story = featuredDiscoveryStory();
  if (!story) return '';
  return `<section class="discover-feature" aria-label="Featured story"><a class="discover-feature-cover" href="/story/${encodeURIComponent(story.id)}" data-link>${image(story.cover_url, story.title)}</a><div class="discover-feature-copy"><span class="eyebrow">${esc(story.content_type === 'comic' ? 'FEATURED VISUAL STORY' : 'A STORY TO DISCOVER')}</span><h2>${esc(story.title)}</h2><p class="discover-feature-author">by ${esc(author(story))}</p><p class="discover-feature-description">${esc(story.description || 'Discover a story from the ReadAgora community.')}</p><div class="discover-feature-meta"><span>${esc(story.genre || 'Original')}</span>${story.content_type === 'comic' ? '<span>Comic</span>' : ''}</div><a class="discover-feature-action" href="/story/${encodeURIComponent(story.id)}" data-link>Open story <span aria-hidden="true">&#8594;</span></a></div></section>`;
}

function rankingBoard(shelf) {
  const lists = state.rankingLists;
  const stories = filterStories(lists[state.rankingSort] || shelf.stories || []).slice(0, 10);
  const sortOptions = [
    ['hot', 'Hot', lists.hot?.length > 0],
    ['rising', 'Rising', lists.rising?.length > 0],
    ['new', 'New', lists.new?.length > 0],
  ];
  const items = stories.map((story, index) => {
    const tags = (story.tags || []).slice(0, 3);
    const remaining = Math.max(0, (story.tags || []).length - tags.length);
    const partCount = Number(story.chapters_published || 0);
    return `<a class="ranking-item" href="/story/${encodeURIComponent(story.id)}" data-link><span class="ranking-position" aria-label="Rank ${index + 1}">${String(index + 1).padStart(2, '0')}</span><div class="ranking-cover-wrap"><div class="ranking-cover">${image(story.cover_url, story.title)}</div></div><div class="ranking-copy"><h3>${esc(story.title)}</h3><p class="ranking-author">${esc(author(story))}</p><div class="ranking-stats"><span>${icon('eye', 'ranking-icon')}${Number(story.view_count || 0).toLocaleString()}</span>${partCount ? `<span>${icon('list', 'ranking-icon')}${partCount} parts</span>` : ''}</div><div class="ranking-tags">${tags.map(tag => `<span>${esc(tag)}</span>`).join('')}${remaining ? `<b>+${remaining} more</b>` : ''}</div></div></a>`;
  });
  const rankingTitle = stories.length === 10 ? 'TOP 10 on ReadAgora' : 'Top Stories on ReadAgora';
  const visibleItems = items.slice(0, 4).join('');
  const remainingItems = items.slice(4).join('');
  return `<section class="ranking-board" id="discover-top-stories"><div class="ranking-heading-row"><div><span class="eyebrow">EDITOR'S PICKS</span><h2 class="ranking-title">${rankingTitle}</h2></div>${remainingItems ? '<button class="ranking-view-all" type="button" data-ranking-expand>View all rankings <span aria-hidden="true">&#8594;</span></button>' : ''}</div><div class="ranking-toolbar"><h3>${stories.length.toLocaleString()} ${stories.length === 1 ? 'Story' : 'Stories'}</h3><label>Sort by: <select data-ranking-sort aria-label="Sort story rankings">${sortOptions.map(([value, label, available]) => `<option value="${value}" ${state.rankingSort === value ? 'selected' : ''} ${available ? '' : 'disabled'}>${label}</option>`).join('')}</select></label></div>${stories.length ? `<div class="ranking-grid">${visibleItems}</div>${remainingItems ? `<details class="ranking-more"><summary>Explore ${stories.length - 4} more ranked stories</summary><div class="ranking-grid">${remainingItems}</div></details>` : ''}` : '<p class="ranking-empty">No stories are available for this ranking yet.</p>'}</section>`;
}

function discoveryExtraSections() {
  const comics = state.comicStories.length
    ? shelfMarkup({ id: 'comics', type: 'comic', title: 'Comics & Visual Stories', stories: state.comicStories }, 'comics')
    : '';
  const followedStories = filterStories(state.followedStories);
  const followed = state.session
    ? (followedStories.length
      ? shelfMarkup({ id: 'followed', type: 'followed', title: 'From creators you follow', stories: followedStories }, 'followed')
      : '<section class="shelf"><div class="shelf-heading"><div><h2>From creators you follow</h2><p class="muted-copy">New stories from creators you follow will show up here.</p></div></div></section>')
    : '<section class="shelf"><div class="shelf-heading"><div><h2>From creators you follow</h2><p class="muted-copy">Sign in to see new stories from creators you follow.</p></div><a class="text-link" href="/login" data-link>Sign in</a></div></section>';
  return `${comics}${followed}`;
}

function shelfMarkup(shelf, index) {
  let stories = filterStories(shelf.stories || []);
  if (shelf.type === 'for_you') {
    const featured = featuredDiscoveryStory();
    if (featured) stories = stories.filter(story => story.id !== featured.id);
  }
  if (!stories.length) return '';
  if (shelf.type === 'trending') return rankingBoard(shelf);
  const featured = shelf.type === 'for_you';
  const compact = ['new', 'comic'].includes(shelf.type);
  const ranked = ['trending', 'rising', 'hidden_gems'].includes(shelf.type);
  const cards = featured
    ? stories.slice(0, 3).map((story, n) => `<a class="featured-story" href="/story/${encodeURIComponent(story.id)}" data-link>${image(story.cover_url, story.title)}<span><small>${esc(story.genre || 'STORY')}</small><b>${esc(story.title)}</b><em>${esc(story.description || 'Discover a new story.')}</em><i>by ${esc(author(story))}</i></span></a>`)
    : stories.map((story, n) => storyCard(story, n, ranked));
  const sectionId = `discover-${String(shelf.id || shelf.type || index).toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(index).replace(/[^a-z0-9]+/gi, '-')}`;
  const visibleCards = compact ? cards.slice(0, 4).join('') : cards.join('');
  const remainingCards = compact ? cards.slice(4).join('') : '';
  const shelfPurpose = {
    recently_updated: 'Fresh chapters and updates from stories readers are following.',
    new: 'Newly published stories, ready for your next read.',
    followed: 'The latest stories and chapters from creators you follow.',
  }[shelf.type] || '';
  const shelfClass = `shelf-${String(shelf.type || '').toLocaleLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
  return `<section class="shelf ${shelfClass} ${compact ? 'shelf-compact' : ''} ${featured ? 'shelf-featured' : ''} ${ranked ? 'ranked-shelf' : ''}" id="${sectionId}" data-story-count="${stories.length}"><div class="shelf-heading"><div><h2>${esc(shelf.title)}</h2>${shelfPurpose ? `<p class="shelf-purpose">${shelfPurpose}</p>` : ''}</div><div class="shelf-heading-actions"><a class="text-link" href="/#${sectionId}" data-link>View all <span aria-hidden="true">&#8594;</span></a>${!compact ? `<button class="shelf-scroll-button" type="button" data-shelf-scroll="-1" aria-label="Scroll ${esc(shelf.title)} left">&#8592;</button><button class="shelf-scroll-button" type="button" data-shelf-scroll="1" aria-label="Scroll ${esc(shelf.title)} right">&#8594;</button>` : ''}</div></div><div class="story-rail ${compact ? 'compact-rail' : ''} ${featured ? 'featured-rail' : ''}" role="region" aria-label="${esc(shelf.title)} stories" tabindex="0">${visibleCards}</div>${remainingCards ? `<details class="compact-more"><summary>View all ${stories.length} stories</summary><div class="compact-grid">${remainingCards}</div></details>` : ''}</section>`;
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

function initEventCardCountdown() {
  const refresh = () => {
    const countdown = eventCountdown();
    document.querySelectorAll('[data-event-countdown]').forEach(node => { node.textContent = countdown.label; });
    document.querySelectorAll('.event-card-cta').forEach(button => { button.disabled = countdown.ended; });
  };
  refresh();
  if (!eventCountdownTimer) eventCountdownTimer = window.setInterval(refresh, 60_000);
}

function home() {
  const noFilterResults = !state.loading && !state.error && (state.genreFilter !== 'all' || state.formatFilter !== 'all') && filterStories(discoveryStories()).length === 0;
  return `${header()}<main class="home-shell"><div class="wide-page-layout discovery-layout"><div class="wide-page-main">${discoveryControls()}${state.loading ? `<section class="loading-shelf"><h2>Finding stories...</h2><div class="skeleton-row"><i></i><i></i><i></i><i></i></div></section>` : state.error ? `<section class="empty-state"><h2>We couldn't load the stories</h2><p>${esc(state.error)}</p><button class="primary-button" data-retry>Try again</button></section>` : `${featuredDiscovery()}${noFilterResults ? `<section class="discover-empty"><h2>No stories match these filters</h2><p>Try another genre or format.</p></section>` : `${state.shelves.map(shelfMarkup).join('')}${discoveryExtraSections()}`}`}</div></div></main>${footer()}${mobileTabs()}`;
}

function mobileTabs() {
  const current = decodeURI(location.pathname).split('/')[1] || '';
  const items = [['/', 'discover', 'Discover'], ['/library', 'library', 'Library'], ['/workroom', 'workroom', 'Workroom'], ['/community', 'community', 'Community'], ['/events', 'events', 'Events'], ['/profile', 'profile', 'Profile']];
  return `<nav class="mobile-tabs" aria-label="Main navigation">${items.map(([path, name, label]) => `<a class="${current === path.slice(1) || (!current && path === '/') ? 'active' : ''}" href="${path}" data-link>${icon(name)}<span>${label}</span></a>`).join('')}</nav>`;
}

function storyPage() {
  const s = state.story;
  if (state.loading) return `${header()}<main class="workspace"><div class="page-loading">Loading story…</div></main>${mobileTabs()}`;
  if (state.error) return `${header()}<main class="workspace"><div class="notice error-notice">${esc(state.error)}</div><a class="text-link" href="/" data-link>Back to discovery</a></main>${footer()}${mobileTabs()}`;
  if (!s) return `${header()}<main class="empty-state"><h1>Story not found</h1><a class="text-link" href="/" data-link>Back to discovery</a></main>${footer()}`;
  const chapters = state.chapters.filter(ch => ch.status === 'published');
  const storyTags = [...new Set([s.genre, ...(Array.isArray(s.tags) ? s.tags : [])].filter(Boolean))].slice(0, 4);
  return `${header()}<main class="story-detail"><a class="back-link" href="/" data-link>← Back to discovery</a><section class="detail-layout"><div class="detail-cover">${image(s.cover_url, s.title)}</div><div class="detail-copy"><span class="eyebrow">${esc(s.content_type === 'comic' ? 'COMIC & VISUAL STORY' : 'READAGORA STORY')}</span><h1>${esc(s.title)}</h1><p class="byline">by <a href="/creator/${encodeURIComponent(s.author?.username || '')}" data-link>${esc(author(s))}</a></p><div class="story-tag-row">${storyTags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div><p class="story-description">${esc(s.description || 'Step into a story made to be read, shared, and remembered.')}</p><div class="detail-stats"><span><b>${Number(s.view_count || 0).toLocaleString()}</b> reads</span><span><b>${chapters.length}</b> chapters</span><span><b>${esc(s.genre || 'Original')}</b> genre</span></div><div class="detail-actions"><a class="primary-button" href="${chapters[0] ? `/read/${encodeURIComponent(s.id)}/${encodeURIComponent(chapters[0].id)}` : '#'}" data-link>${chapters.length ? 'Start reading' : 'Coming soon'} <span>→</span></a><button class="outline-button" data-save="${esc(s.id)}">＋ &nbsp; Add to library</button></div><div class="chapter-list"><div class="list-heading"><h2>Episodes</h2><span>${chapters.length} ${chapters.length === 1 ? 'episode' : 'episodes'}</span></div>${chapters.length ? chapters.map((ch, i) => `<a class="chapter-row" href="/read/${encodeURIComponent(s.id)}/${encodeURIComponent(ch.id)}" data-link><span class="chapter-number">${String(i + 1).padStart(2, '0')}</span><span><b>${esc(ch.title)}</b><small>${ch.published_at ? new Date(ch.published_at).toLocaleDateString() : 'Ready to read'}</small></span><span class="chapter-arrow">↗</span></a>`).join('') : '<p class="muted-copy">This story has no published chapters yet.</p>'}</div></div></section>${chapters[0] ? `<a class="story-mobile-cta" href="/read/${encodeURIComponent(s.id)}/${encodeURIComponent(chapters[0].id)}" data-link>Read ${esc(chapters[0].title)} <span>→</span></a>` : ''}</main>${footer()}`;
}

function safeText(content = '') {
  const template = document.createElement('template');
  template.innerHTML = content;
  template.content.querySelectorAll('script,style,iframe,object,embed').forEach(node => node.remove());
  template.content.querySelectorAll('*').forEach(node => [...node.attributes].forEach(attr => {
    if (/^on/i.test(attr.name) || ((attr.name === 'href' || attr.name === 'src') && (/^\s*javascript:/i.test(attr.value) || /^\s*data:/i.test(attr.value)))) node.removeAttribute(attr.name);
  }));
  return template.innerHTML;
}

function normalizeStoryContent(content = '') {
  const html = safeText(content || '');
  if (!html) return '';
  return html.replace(/!\[(.*?)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)(?:\s+"([^"]*)")?\)/gi, (_, altText, src, title) => {
    const imageSrc = src?.trim();
    if (!imageSrc) return '';
    const safeAlt = (altText || title || 'Story illustration').trim() || 'Story illustration';
    return `<figure class="story-figure"><img src="${esc(imageSrc)}" alt="${esc(safeAlt)}"${title ? ` title="${esc(title.trim())}"` : ''} loading="lazy"/><figcaption>${esc(safeAlt)}</figcaption></figure>`;
  });
}

function saveReaderSettings() {
  try {
    localStorage.setItem('readagora-reader-settings', JSON.stringify(state.readerSettings));
    const status = app.querySelector('[data-reader-preference-status]');
    if (status) status.textContent = '';
  } catch {
    const status = app.querySelector('[data-reader-preference-status]');
    if (status) status.textContent = 'Could not save preferences on this device.';
  }
}

function readerPositionKey(storyId = state.story?.id, chapterId = state.chapter?.id) {
  return storyId && chapterId ? `readagora-reader-position:${storyId}:${chapterId}` : '';
}

function saveReaderPosition() {
  const key = readerPositionKey();
  if (!key || location.pathname !== `/read/${encodeURIComponent(state.story.id)}/${encodeURIComponent(state.chapter.id)}`) return;
  try {
    localStorage.setItem(key, String(Math.max(0, Math.round(window.scrollY))));
  } catch {
    state.pageError = 'Reading progress could not be saved on this device.';
  }
}

function applyReaderSettings() {
  const article = app.querySelector('.reader-article');
  const layout = app.querySelector('.reader-layout');
  if (!article || !layout) return;
  const settings = state.readerSettings;
  article.style.setProperty('--reader-size', `${settings.size}px`);
  article.style.setProperty('--reader-line-height', settings.lineHeight);
  article.style.setProperty('--reader-width', `${settings.width}px`);
  article.style.setProperty('--reader-font', settings.font === 'serif' ? 'Georgia,serif' : 'Inter,Arial,sans-serif');
  layout.classList.remove('theme-night', 'theme-warm', 'theme-paper');
  layout.classList.add(`theme-${settings.theme}`);
}

function readerPage() {
  const chapter = state.chapter;
  const s = state.story;
  if (state.loading) return `${header()}<main class="workspace"><div class="page-loading">Opening chapter…</div></main>`;
  if (state.error) return `${header()}<main class="workspace"><div class="notice error-notice">${esc(state.error)}</div><a class="text-link" href="/" data-link>Back to discovery</a></main>${footer()}`;
  if (!chapter || !s) return `${header()}<main class="empty-state"><h1>Chapter unavailable</h1><a class="text-link" href="/" data-link>Back to discovery</a></main>${footer()}`;
  const index = state.chapters.findIndex(item => item.id === chapter.id);
  const prev = state.chapters[index - 1];
  const next = state.chapters[index + 1];
  const textContent = normalizeStoryContent(chapter.content || '');
  const panels = (chapter.panels || []).map(panel => `<img class="comic-panel" src="${esc(panel.image_url)}" alt="Comic panel" loading="lazy"/>`).join('');
  const content = `${textContent}${panels}`;
  const lightTheme = document.documentElement.dataset.theme === 'light';
  const settings = state.readerSettings;
  return `<header class="reader-topbar"><a class="brand" href="/" data-link><img class="brand-image" src="/assets/mark.png" alt=""/><span>readagora</span></a><a class="reader-book" href="/story/${encodeURIComponent(s.id)}" data-link><span>${esc(s.title)}</span><small>${esc(chapter.title)}</small></a><div class="reader-controls"><button class="icon-button reader-sidebar-toggle" data-reader-sidebar aria-expanded="${!state.readerSidebarCollapsed}" aria-controls="reader-chapter-list" aria-label="${state.readerSidebarCollapsed ? 'Show' : 'Hide'} chapter list">${icon('list', 'header-icon')}</button><button class="icon-button site-theme-toggle" data-action="site-theme" aria-label="Switch to ${lightTheme ? 'dark' : 'light'} site theme" title="Switch to ${lightTheme ? 'dark' : 'light'} site theme">${icon(lightTheme ? 'moon' : 'sun', 'header-icon')}</button><button class="icon-button" data-font="-1" aria-label="Decrease text size">A−</button><button class="icon-button" data-font="1" aria-label="Increase text size">A+</button><details class="reader-settings"><summary class="icon-button" aria-label="Reader preferences" title="Reader preferences">Aa</summary><div class="reader-settings-panel"><strong>Reading preferences</strong><label>Font<select data-reader-setting="font"><option value="sans" ${settings.font === 'sans' ? 'selected' : ''}>Sans serif</option><option value="serif" ${settings.font === 'serif' ? 'selected' : ''}>Serif</option></select></label><label>Text size <output data-reader-value="size">${settings.size}px</output><input type="range" min="16" max="28" step="1" value="${settings.size}" data-reader-setting="size"/></label><label>Line spacing <output data-reader-value="lineHeight">${settings.lineHeight.toFixed(1)}</output><input type="range" min="1.5" max="2.2" step="0.1" value="${settings.lineHeight}" data-reader-setting="lineHeight"/></label><label>Reading width<select data-reader-setting="width"><option value="560" ${settings.width === 560 ? 'selected' : ''}>Narrow</option><option value="720" ${settings.width === 720 ? 'selected' : ''}>Comfortable</option><option value="800" ${settings.width === 800 ? 'selected' : ''}>Wide</option></select></label><label>Page theme<select data-reader-setting="theme"><option value="night" ${settings.theme === 'night' ? 'selected' : ''}>Night</option><option value="warm" ${settings.theme === 'warm' ? 'selected' : ''}>Warm</option><option value="paper" ${settings.theme === 'paper' ? 'selected' : ''}>Paper</option></select></label><small data-reader-preference-status aria-live="polite"></small></div></details></div></header><button class="reader-sidebar-reopen" data-reader-sidebar ${state.readerSidebarCollapsed ? '' : 'hidden'} aria-expanded="${!state.readerSidebarCollapsed}" aria-controls="reader-chapter-list" aria-label="Show chapter list" title="Show chapter list">${icon('list', 'header-icon')}</button><main class="reader-layout theme-${settings.theme}${state.readerSidebarCollapsed ? ' sidebar-collapsed' : ''}"><aside class="reader-aside" id="reader-chapter-list"><a href="/story/${encodeURIComponent(s.id)}" data-link>← Story details</a><span>READING</span><b>${esc(s.title)}</b><div class="reader-progress"><i style="width:${Math.round((index + 1) / Math.max(1, state.chapters.length) * 100)}%"></i></div><small>Chapter ${index + 1} of ${state.chapters.length}</small><div class="chapter-toc">${state.chapters.map((ch, i) => `<a class="${ch.id === chapter.id ? 'active' : ''}" href="/read/${encodeURIComponent(s.id)}/${encodeURIComponent(ch.id)}" data-link><span>${String(i + 1).padStart(2, '0')}</span>${esc(ch.title)}</a>`).join('')}</div></aside><article class="reader-article" style="--reader-size:${settings.size}px;--reader-line-height:${settings.lineHeight};--reader-width:${settings.width}px;--reader-font:${settings.font === 'serif' ? 'Georgia,serif' : 'Inter,Arial,sans-serif'}"><div class="chapter-kicker">${esc(s.genre || 'READAGORA')} &nbsp; · &nbsp; CHAPTER ${String(index + 1).padStart(2, '0')}</div><h1>${esc(chapter.title)}</h1><p class="chapter-byline">by ${esc(author(s))}</p><div class="article-rule"></div><div class="prose">${content}</div><div class="chapter-end"><span>&#10022;</span><p>Thank you for reading.</p><a href="/story/${encodeURIComponent(s.id)}" data-link>${esc(s.title)}</a></div><nav class="chapter-nav">${prev ? `<a href="/read/${encodeURIComponent(s.id)}/${encodeURIComponent(prev.id)}" data-link>← &nbsp; Previous chapter</a>` : '<span></span>'}${next ? `<a class="next-chapter" href="/read/${encodeURIComponent(s.id)}/${encodeURIComponent(next.id)}" data-link>Next chapter &nbsp; →</a>` : `<a class="next-chapter" href="/story/${encodeURIComponent(s.id)}" data-link>Back to story &nbsp; →</a>`}</nav><section class="reader-comments"><h2>Reader comments</h2>${state.session ? `<form data-form="chapter-comment"><textarea name="text" rows="3" maxlength="2000" required placeholder="Leave a comment…"></textarea><button class="primary-button" type="submit">Post comment</button><div class="form-message"></div></form>` : '<p><a href="/login" data-link>Sign in</a> to leave a comment.</p>'}<div class="comment-list">${state.comments.map(comment => `<article class="comment"><b>${esc(comment.user?.display_name || comment.user?.username || 'Reader')}</b><small>${new Date(comment.created_at).toLocaleDateString()}</small><p>${esc(comment.text)}</p></article>`).join('') || '<p class="muted-copy">No comments yet.</p>'}</div></section></article></main>`;
}

function searchResults() {
  return `<div class="search-overlay"><div class="search-dialog"><button class="close-search" aria-label="Close search">×</button><span class="eyebrow">FIND YOUR NEXT WORLD</span><input id="overlay-search" autofocus type="search" placeholder="A title, genre, or creator…" /><div id="search-results" class="search-results"><p>Start typing to explore ReadAgora.</p></div></div></div>`;
}

function pageFrame(title, subtitle, content) {
  const pageContent = state.pageLoading ? (location.pathname === '/library' ? libraryLoadingView() : '<div class="page-loading">Loading…</div>') : content;
  return `${header()}<main class="workspace">${state.pageError && location.pathname !== '/library' ? `<div class="notice error-notice">${esc(state.pageError)}</div>` : ''}${pageContent}</main>${footer()}${mobileTabs()}`;
}

function eventsView() {
  return `<div class="events-page"><div class="events-picker"><label for="event-picker">CHECK OUT AN EVENT</label><select id="event-picker" aria-label="Select an event"><option value="november-writer-challenge" selected>Who Owns ReadAgora? - November 2026</option></select></div><section class="events-hero"><div class="events-hero-copy"><span class="events-status"><i></i> UPCOMING - NOVEMBER 1-30, 2026</span><h2>One month.<br/><em>One story.</em><br/>Your community decides.</h2><p>Writers have a month to create a story for ReadAgora. Readers vote for the writer they love most.</p><div class="events-actions"><a class="events-primary" href="/workroom" data-link>Start writing <span>→</span></a><a class="events-secondary" href="/community" data-link>Follow event updates</a></div></div><aside class="events-prize"><span class="eyebrow">THE WINNER RECEIVES</span><strong>$25 <i>or</i> K500</strong><div class="events-prize-rule"></div><b>A custom ReadAgora flag</b><p>Featuring the winner’s university.</p><div class="events-prize-mark" aria-hidden="true">✦</div></aside><span class="events-hero-number" aria-hidden="true">01</span></section><section class="events-overview"><div class="events-section-heading"><span class="eyebrow">HOW IT WORKS</span><h2>Made by writers. Chosen by readers.</h2><p>Take part in ReadAgora’s month-long community story challenge.</p></div><div class="events-steps"><article><span>01</span><div><h3>Writers create</h3><p>Write and publish an original story during the November challenge.</p></div></article><article><span>02</span><div><h3>Readers vote</h3><p>Read the entries and vote for your favorite writer.</p></div></article><article><span>03</span><div><h3>One writer wins</h3><p>The community’s favorite writer wins $25 USD or K500, plus a custom flag featuring their university.</p></div></article></div></section><section class="events-callout"><div><span class="eyebrow">BE PART OF THE STORY</span><h2>Your next favorite writer could be here.</h2><p>Follow ReadAgora Community for challenge announcements and event updates.</p></div><a class="events-secondary" href="/community" data-link>Go to Community <span>→</span></a></section></div>`;
}

function authPage(mode = 'login') {
  const login = mode === 'login';
  const signup = mode === 'signup';
  const forgot = mode === 'forgot-password';
  const reset = mode === 'reset-password';
  const title = signup ? 'Create your account' : forgot ? 'Reset your password' : reset ? 'Choose a new password' : 'Welcome back';
  const blurb = signup ? 'Join a community of readers and creators. Your next favorite story is waiting.' : forgot ? 'Enter the email address on your account. We’ll send you a secure reset link.' : reset ? 'Choose a new password to get back to your ReadAgora account.' : 'Sign in to pick up where your reading journey left off.';
  const formType = signup ? 'signup' : forgot ? 'forgot' : reset ? 'reset' : 'login';
  const submitLabel = signup ? 'Create account' : forgot ? 'Send reset link' : reset ? 'Save new password' : 'Sign in';
  const next = new URLSearchParams(location.search).get('next');
  const signupHref = `/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  const loginHref = `/login${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  const visualTitle = signup ? 'Stories are better together.' : 'Your stories are right where you left them.';
  const authArt = login ? '<div class="auth-mascot-spot"><img class="auth-mascot" src="/assets/mascot.png" alt="ReadAgora mascot reading a book"/></div>' : '<div class="auth-art-cover"><span>READAGORA ORIGINAL</span><b>Every story<br/>opens a door.</b><i>READ · IMAGINE · BELONG</i></div>';
  const fieldMarkup = `${signup ? '<label>Username<input name="username" autocomplete="username" autocapitalize="none" minlength="3" maxlength="24" placeholder="Choose a username" required/></label>' : ''}${!reset ? '<label>Email address<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required/></label>' : ''}${!forgot ? `<label>${reset ? 'New password' : 'Password'}<input name="password" type="password" autocomplete="${signup || reset ? 'new-password' : 'current-password'}" minlength="8" placeholder="${reset || signup ? 'At least 8 characters' : 'Enter your password'}" required/></label>` : ''}`;
  return `<main class="auth-page auth-page--${mode}"><a class="auth-brand" href="/" data-link><img src="/assets/mark.png" alt=""/><span>readagora</span></a><div class="auth-switch">${signup ? `Already have an account? <a href="${loginHref}" data-link>Sign in</a>` : !reset && !forgot ? `New to ReadAgora? <a href="${signupHref}" data-link>Create account</a>` : `<a href="/login" data-link>Back to sign in</a>`}</div><div class="auth-layout"><aside class="auth-showcase"><div class="auth-showcase-glow"></div><span class="eyebrow">READAGORA / YOUR NEXT CHAPTER</span><div class="auth-art">${authArt}<div class="auth-art-orbit auth-art-orbit-one"></div><div class="auth-art-orbit auth-art-orbit-two"></div></div><div class="auth-showcase-copy"><h2>${visualTitle}</h2><p>Discover new worlds, follow the creators you love, and keep your reading life in one place.</p></div><div class="auth-showcase-foot"><span>01 / DISCOVER</span><span>02 / READ</span><span>03 / SHARE</span></div></aside><section class="auth-panel"><div class="auth-panel-inner">${login ? '<img class="auth-panel-mascot" src="/assets/mascot.png" alt="ReadAgora mascot"/>' : ''}<span class="eyebrow">${signup ? 'START READING WITH US' : forgot || reset ? 'ACCOUNT RECOVERY' : 'GOOD TO SEE YOU AGAIN'}</span><h1>${title}</h1><p class="auth-intro">${blurb}</p><form data-form="${formType}">${fieldMarkup}${!signup && !forgot && !reset ? `<a class="auth-forgot" href="/forgot-password" data-link>Forgot password?</a>` : ''}<div class="form-message" aria-live="polite"></div><button class="primary-button auth-submit" type="submit">${submitLabel}<span aria-hidden="true">→</span></button></form>${signup ? '<p class="auth-legal">You’ll accept the Community Terms before posting or publishing. <a href="/terms" data-link>Read the terms</a>.</p>' : ''}</div></section></div><footer class="auth-footer"><span>© ReadAgora</span><a href="/terms" data-link>Community terms</a><a href="/" data-link>Back to discovery</a></footer></main>`;
}

function signedOutPage(destination) {
  return `${header()}<main class="workspace sign-in-prompt"><div class="empty-panel"><img src="/assets/mark.png" alt=""/><h1>Sign in to continue</h1><p>Use your ReadAgora account to access your library, community, and workroom.</p><a class="primary-button" href="/login?next=${encodeURIComponent(destination)}" data-link>Sign in <span>→</span></a><a class="text-link" href="/signup" data-link>Create an account</a></div></main>${footer()}${mobileTabs()}`;
}

function libraryView() {
  const data = state.pageData || {};
  const savedTab = state.libraryTab === 'saved';
  const entries = savedTab ? data.bookmarks || [] : data.library || [];
  const query = String(state.libraryQuery || '').trim().toLocaleLowerCase();
  const sort = state.librarySort || 'recent';
  const storyFor = entry => entry.story || entry;
  const matchingEntries = entries.filter(entry => {
    const story = storyFor(entry);
    const authorName = story.author?.display_name || story.author?.username || '';
    return `${story.title || ''} ${authorName}`.toLocaleLowerCase().includes(query);
  });
  if (sort === 'title') matchingEntries.sort((a, b) => String(storyFor(a).title || '').localeCompare(String(storyFor(b).title || '')));
  else matchingEntries.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

  const cards = matchingEntries.map(entry => {
    const story = storyFor(entry);
    const storyId = story.id || entry.story_id;
    const chapterId = entry.last_chapter_id || entry.chapter_id;
    const destination = chapterId ? `/read/${encodeURIComponent(storyId)}/${encodeURIComponent(chapterId)}` : `/story/${encodeURIComponent(storyId)}`;
    const actionLabel = chapterId && !savedTab ? 'Continue reading' : chapterId ? 'Open saved chapter' : 'Start reading';
    const authorName = story.author?.display_name || story.author?.username || '';
    const timestamp = entry.updated_at || entry.created_at;
    const date = timestamp && !Number.isNaN(new Date(timestamp).getTime())
      ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp))
      : '';
    const searchText = `${story.title || ''} ${authorName}`.toLocaleLowerCase();
    return `<article class="library-card" data-library-entry data-search="${esc(searchText)}" data-updated="${esc(timestamp || '')}" data-title="${esc(story.title || '')}"><a class="library-cover-link" href="/story/${encodeURIComponent(storyId)}" data-link aria-label="Open ${esc(story.title || 'story')}">${image(story.cover_url, story.title || 'Story cover')}${chapterId && !savedTab ? '<span class="library-status">Reading</span>' : ''}</a><div class="library-card-content"><h2><a href="/story/${encodeURIComponent(storyId)}" data-link>${esc(story.title || 'Untitled story')}</a></h2>${authorName ? `<p class="library-author">by ${esc(authorName)}</p>` : ''}${date ? `<p class="library-date">${savedTab ? 'Saved' : 'Last read'} ${esc(date)}</p>` : ''}<a class="continue-link" href="${destination}" data-link>${actionLabel} <span aria-hidden="true">→</span></a>${savedTab ? `<button class="subtle-button" type="button" data-action="unsave" data-id="${esc(storyId)}">Remove from saved</button>` : ''}</div></article>`;
  }).join('');
  const tabs = `<div class="segmented library-tabs" role="group" aria-label="Library stories"><button type="button" aria-pressed="${!savedTab}" class="${savedTab ? '' : 'selected'}" data-action="library-tab" data-tab="continue">Continue reading</button><button type="button" aria-pressed="${savedTab}" class="${savedTab ? 'selected' : ''}" data-action="library-tab" data-tab="saved">Saved stories</button></div>`;
  if (state.pageError) return `<div class="library-intro"><p>Your stories, all in one place. Pick up where you left off.</p></div>${tabs}<section class="empty-panel library-error" role="alert"><h2>We couldn't load your library</h2><p>${esc(state.pageError)}</p><button class="outline-button" type="button" data-action="library-retry">Try again</button></section>`;
  if (!entries.length) return `<div class="library-intro"><p>Your stories, all in one place. Pick up where you left off.</p></div>${tabs}<section class="empty-panel library-empty"><h2>${savedTab ? 'No saved stories yet' : 'Your reading journey starts here'}</h2><p>${savedTab ? 'Save a story while exploring, and it will be waiting for you here.' : 'When you start reading a story, it will appear here so you can pick up where you left off.'}</p><a class="primary-button" href="/" data-link>Discover stories <span aria-hidden="true">→</span></a></section>`;
  return `<div class="library-intro"><p>Your stories, all in one place. Pick up where you left off.</p></div>${tabs}<div class="library-toolbar"><label class="library-search"><span class="sr-only">Search your library</span>${icon('search', 'library-search-icon')}<input id="library-search" type="search" value="${esc(state.libraryQuery || '')}" placeholder="Search your library" autocomplete="off"/></label><label class="library-sort"><span>Sort by</span><select id="library-sort" aria-label="Sort stories">${savedTab ? '<option value="recent">Recently saved</option>' : '<option value="recent">Recently read</option>'}<option value="title" ${sort === 'title' ? 'selected' : ''}>Title A–Z</option></select></label><span class="library-count" aria-live="polite">${matchingEntries.length} ${matchingEntries.length === 1 ? 'story' : 'stories'}</span></div><div class="library-grid">${cards}</div><div class="library-no-results" ${matchingEntries.length ? 'hidden' : ''} role="status"><h2>No stories match that search</h2><p>Try another title or creator name.</p><button class="outline-button" type="button" data-action="library-clear-search">Clear search</button></div>`;
}

function libraryLoadingView() {
  return `<div class="library-intro"><p>Your stories, all in one place. Pick up where you left off.</p></div><div class="segmented library-tabs" aria-hidden="true"><span>Continue reading</span><span>Saved stories</span></div><div class="library-grid library-loading-grid" role="status" aria-label="Loading your library">${Array.from({ length: 6 }, () => '<div class="library-skeleton"><i></i><span></span><span></span><b></b></div>').join('')}</div>`;
}

function communityView() {
  const posts = state.pageData?.items || [];
  const tabs = [['for-you','For you'],['following','Following'],['discussions','Discussions'],['saved','Saved']];
  const sidebar = state.pageData?.sidebar || { discussions: [], writers: [] };
  const composer = state.session
    ? `<button class="community-compose-prompt" data-action="open-community-composer"><span class="avatar-fallback">${esc((state.user?.display_name || state.user?.username || '?').slice(0,1).toUpperCase())}</span><span>Share something with the community…</span><b>＋</b></button>`
    : `<div class="community-compose-prompt"><span>Join the conversation around your next read.</span><a class="primary-button" href="/login?next=%2Fcommunity" data-link>Sign in to post</a></div>`;
  const people = sidebar.writers || [];
  const discussionItems = sidebar.discussions || [];
  const feed = posts.length ? posts.map(communityPostCard).join('') : `<div class="empty-panel"><h2>No posts here yet</h2><p>Be the first to start a conversation.</p>${state.session ? '<button class="outline-button" data-action="open-community-composer">Create a post</button>' : ''}</div>`;
  return `<div class="community-layout"><section class="community-main"><div class="community-tabs" role="tablist" aria-label="Community feed">${tabs.map(([id,label]) => `<button role="tab" aria-selected="${(state.communityTab || 'for-you') === id}" class="${(state.communityTab || 'for-you') === id ? 'selected' : ''}" data-action="community-tab" data-tab="${id}">${label}</button>`).join('')}</div>${composer}<div class="post-list">${feed}</div>${state.pageData?.next_offset != null ? '<button class="community-load-more" data-action="community-load-more">Load more posts</button>' : ''}</section><aside class="community-rail"><section class="community-rail-card"><div class="community-rail-heading"><span class="eyebrow">TRENDING NOW</span><h2>Popular discussions</h2></div>${discussionItems.length ? discussionItems.slice(0,4).map(item => `<a class="community-trending" href="/community/post/${encodeURIComponent(item.id)}" data-link><b>${esc(item.content || 'Community discussion').slice(0,86)}</b><span>${Number(item.comment_count || 0).toLocaleString()} replies · @${esc(item.user?.username || 'reader')}</span></a>`).join('') : '<p class="community-rail-empty">New conversations are waiting to happen.</p>'}</section><section class="community-rail-card"><div class="community-rail-heading"><span class="eyebrow">FIND YOUR PEOPLE</span><h2>Writers to follow</h2></div>${people.length ? people.slice(0,5).map(person => `<div class="community-person"><a class="community-person-link" href="/creator/${encodeURIComponent(person.username)}" data-link>${person.avatar_url ? `<img src="${esc(person.avatar_url)}" alt=""/>` : `<span class="avatar-fallback">${esc((person.display_name || person.username || '?').slice(0,1).toUpperCase())}</span>`}<span><b>${esc(person.display_name || person.username)}</b><small>@${esc(person.username || '')}</small></span></a>${state.session && person.id !== state.user?.id ? `<button class="community-follow" data-action="community-follow" data-id="${esc(person.id)}">Follow</button>` : ''}</div>`).join('') : '<p class="community-rail-empty">Creator suggestions will show up here.</p>'}</section><section class="community-guidelines"><b>Keep it welcoming.</b><p>Share your thoughts, respect creators, and report anything that doesn’t belong.</p><a href="/terms" data-link>Community guidelines →</a></section></aside></div>`;
}

function communityPostCard(post) {
  const name = post.user?.display_name || post.user?.username || 'ReadAgora reader';
  const avatar = post.user?.avatar_url ? `<img src="${esc(post.user.avatar_url)}" alt=""/>` : `<span class="avatar-fallback">${esc(name.slice(0,1).toUpperCase())}</span>`;
  const date = post.created_at && !Number.isNaN(Date.parse(post.created_at)) ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(post.created_at)) : '';
  const pollOptions = post.poll_options || [];
  const pollCounts = post.poll_counts || [];
  const totalVotes = pollCounts.reduce((sum, count) => sum + Number(count || 0), 0);
  const hidden = post.contains_spoiler && !state.revealedPosts?.includes(post.id);
  const poll = pollOptions.length ? `<div class="community-poll">${pollOptions.map((option, index) => { const selected = Number(post.my_vote) === index; const percent = totalVotes ? Math.round(Number(pollCounts[index] || 0) / totalVotes * 100) : 0; return `<button class="community-poll-option ${selected ? 'is-selected' : ''}" data-action="community-vote" data-id="${esc(post.id)}" data-index="${index}" ${post.my_vote != null ? 'disabled' : ''}><i style="width:${post.my_vote != null ? percent : 0}%"></i><span>${esc(option)}</span>${post.my_vote != null ? `<b>${percent}%</b>` : ''}</button>`; }).join('')}<small>${post.my_vote != null ? `${totalVotes} votes` : 'Choose one'}</small></div>` : '';
  const story = post.story ? `<a class="post-story" href="/story/${encodeURIComponent(post.story.id)}" data-link>${image(post.story.cover_url, post.story.title)}<span><b>${esc(post.story.title)}</b><small>${esc(post.story.author?.display_name || post.story.author?.username || 'Story')}</small></span><span class="community-story-arrow">↗</span></a>` : '';
  const imageAttachment = post.image_url ? `<img class="community-post-image" src="${esc(post.image_url)}" alt="Post attachment" loading="lazy"/>` : '';
  const ownPost = state.session && post.user_id === state.user?.id;
  const menu = state.session ? `<details class="community-post-menu"><summary aria-label="More post actions">⋯</summary>${ownPost ? `<button data-action="community-edit" data-id="${esc(post.id)}">Edit post</button><button data-action="community-delete" data-id="${esc(post.id)}">Delete post</button>` : `<button data-action="community-report" data-id="${esc(post.id)}" data-user="${esc(post.user_id || '')}">Report post</button><button data-action="community-block" data-id="${esc(post.id)}" data-user="${esc(post.user_id || '')}" data-username="${esc(post.user?.username || 'reader')}">Block writer</button>`}</details>` : '';
  return `<article class="post-card community-post-card" data-post-id="${esc(post.id)}"><header class="community-post-header"><a class="community-post-author" href="/creator/${encodeURIComponent(post.user?.username || '')}" data-link>${avatar}<span><b>${esc(name)}</b><small>@${esc(post.user?.username || 'reader')} <i>·</i> ${esc(date)}</small></span></a><span class="post-kind">${esc((post.post_type || 'post').replaceAll('_',' '))}</span>${menu}</header>${hidden ? `<button class="community-spoiler" data-action="community-reveal" data-id="${esc(post.id)}"><b>Spoiler hidden</b><span>Tap to reveal this post</span></button>` : `<div class="community-post-body">${post.content ? `<p class="post-content">${esc(post.content)}</p>` : ''}${imageAttachment}${story}${poll}</div>`}<footer class="post-actions community-post-actions"><button data-action="post-like" data-id="${esc(post.id)}" data-enabled="${Boolean(post.liked)}">${post.liked ? '♥' : '♡'} <span>${Number(post.like_count || 0).toLocaleString()} Likes</span></button><a href="/community/post/${encodeURIComponent(post.id)}" data-link>◯ <span>${Number(post.comment_count || 0).toLocaleString()} Comments</span></a><button data-action="post-save" data-id="${esc(post.id)}" data-enabled="${Boolean(post.saved)}">${post.saved ? '▣' : '▢'} <span>${post.saved ? 'Saved' : 'Save'}</span></button><button data-action="community-share" data-id="${esc(post.id)}">↗ <span>Share</span></button></footer></article>`;
}

function communityComposerModal() {
  const stories = (state.pageData?.myStories || []).filter(item => item.status === 'published');
  return `<div class="modal-backdrop community-modal-backdrop" data-community-modal><section class="modal-card community-composer-modal" role="dialog" aria-modal="true" aria-labelledby="community-composer-title"><button class="modal-close" data-action="close-modal" aria-label="Close">×</button><span class="eyebrow">COMMUNITY</span><h2 id="community-composer-title">Create a post</h2><form data-form="post"><label>Post type<select name="post_type"><option value="post">Post</option><option value="discussion">Discussion</option><option value="announcement">Announcement</option><option value="chapter">Chapter update</option><option value="poll">Poll</option></select></label><label>What’s on your mind?<textarea name="content" maxlength="4000" placeholder="Share something with the community…"></textarea></label><label>Attach a story<select name="story_id"><option value="">No story attached</option>${stories.map(item => `<option value="${esc(item.id)}">${esc(item.title)}</option>`).join('')}</select></label><label>Attach a chapter<select name="chapter_id" disabled><option value="">Choose a story first</option></select></label><label>Attach an image<input type="file" name="image" accept="image/*"/></label><label class="check-label"><input type="checkbox" name="contains_spoiler"/> Contains spoilers</label><div class="community-poll-fields" hidden><label>Poll options <small>Add 2–6 options, one per line.</small><textarea name="poll_options" placeholder="Option one&#10;Option two"></textarea></label></div>${termsField()}<div class="form-message" aria-live="polite"></div><button class="primary-button" type="submit">Publish post</button></form></section></div>`;
}

function workroomView() {
  const allStories = state.pageData?.stories || [];
  const query = (state.workroomQuery || '').trim().toLowerCase();
  const stories = allStories.filter(story => (state.workroomStatus === 'all' || story.status === state.workroomStatus)
    && (!query || `${story.title} ${story.genre || ''} ${story.description || ''}`.toLowerCase().includes(query)));
  const analytics = state.pageData?.analytics;
  const wallet = state.pageData?.cashWallet;
  const quote = state.pageData?.cashoutQuote;
  const payouts = state.pageData?.payouts || [];
  const money = value => `$${(Number(value || 0) / 100).toFixed(2)}`;
  const payoutForm = quote?.enabled ? `<form class="payout-form" data-form="payout"><label>Amount (ZMW)<input name="amount" type="number" min="${(quote.minimumMinorUnits / 100).toFixed(2)}" step="0.01" required/></label><label>Payment method<select name="payout_method" required>${(quote.supportedMethods || []).map(method => `<option value="${esc(method)}">${esc(method.replaceAll('_', ' '))}</option>`).join('')}</select></label><label>Mobile money number<input name="destination" autocomplete="tel" minlength="8" maxlength="60" required/></label><div class="form-message" aria-live="polite"></div><button class="primary-button" type="submit">Request payout</button></form>` : `<div class="notice">Cashouts are currently unavailable. ${esc(quote?.reason || 'Payout policy is not configured.')}</div>`;
  const payoutRows = payouts.length ? `<div class="payout-list">${payouts.map(payout => `<div class="payout-row"><span><b>${(Number(payout.amount_zmw_minor_units || 0) / 100).toFixed(2)} ZMW</b><small>${esc(payout.payout_method)} · ${esc(payout.destination_hint || '')}</small></span><span class="status-pill">${esc(payout.status)}${payout.reserve_state ? ` · ${esc(payout.reserve_state)}` : ''}</span><small>${payout.created_at ? new Date(payout.created_at).toLocaleDateString() : ''}</small></div>`).join('')}</div>` : '<p class="muted-copy">No payout requests yet.</p>';
  return `<section class="workroom-welcome"><div><span class="eyebrow">YOUR CREATOR STUDIO</span><h2>Make room for your next story.</h2><p>Draft chapters, publish updates, and see how readers respond.</p></div><button class="primary-button" data-action="new-story">＋ Create a story</button></section><div class="stat-row">${[['Stories',allStories.length],['Published',allStories.filter(story => story.status === 'published').length],['Reads',analytics?.totals?.reads ?? '—'],['Likes',analytics?.totals?.likes ?? '—']].map(([label,value]) => `<div class="stat-card"><small>${label}</small><b>${Number(value) === value ? Number(value).toLocaleString() : value}</b></div>`).join('')}</div><section class="panel"><div class="panel-heading"><div><h2>Your stories</h2><p>Manage drafts and published work.</p></div><button class="primary-button" data-action="new-story">＋ New story</button></div><div class="workroom-story-tools"><input type="search" data-workroom-search value="${esc(state.workroomQuery || '')}" placeholder="Find a story" aria-label="Search your stories"/><div class="segmented workroom-status-tabs">${[['all','All'],['draft','Drafts'],['published','Published']].map(([status,label]) => `<button type="button" data-workroom-status="${status}" class="${state.workroomStatus === status ? 'selected' : ''}">${label}<span>${status === 'all' ? allStories.length : allStories.filter(story => story.status === status).length}</span></button>`).join('')}</div></div>${stories.length ? `<div class="managed-story-list">${stories.map(story => `<a class="managed-story" href="/workroom/story/${encodeURIComponent(story.id)}" data-link>${image(story.cover_url, story.title)}<span><b>${esc(story.title)}</b><small><em class="status-dot ${story.status === 'published' ? 'is-published' : ''}"></em>${esc(story.status)} · ${esc(story.genre || 'No genre')} · ${Number(story.view_count || 0).toLocaleString()} reads</small></span><i>→</i></a>`).join('')}</div>` : `<div class="empty-panel"><h3>${allStories.length ? 'No stories match these filters' : 'You have not created a story yet'}</h3><p>${allStories.length ? 'Try a different search or status.' : 'Start with an idea and build your first world.'}</p>${!allStories.length ? '<button class="outline-button" data-action="new-story">Create a story</button>' : ''}</div>`}<div class="workroom-filter-empty empty-panel" hidden><h3>No stories match your search</h3><p>Try a different title or genre.</p></div></section><section class="panel"><div class="panel-heading"><div><h2>Creator earnings</h2><p>Cash balance and manual payout requests.</p></div><span class="status-pill">${esc(quote?.currency || 'USD')} account</span></div><div class="stat-row cash-stat-row">${[['Pending',money(wallet?.pending_usd_cents)],['Available',money(wallet?.available_usd_cents)],['Reserved',money(wallet?.reserved_usd_cents)],['Paid out',money(wallet?.lifetime_paid_usd_cents)]].map(([label,value]) => `<div class="stat-card"><small>${label}</small><b>${value}</b></div>`).join('')}</div>${payoutForm}<h3 class="subsection-title">Payout history</h3>${payoutRows}</section>`;
}

function newStoryModal() {
  const genres = state.pageData?.genres || [];
  return `<div class="modal-backdrop"><section class="modal-card"><button class="modal-close" data-action="close-modal">×</button><span class="eyebrow">WORKROOM</span><h2>Create a story</h2><p>Set up your story now. You can edit its details and cover later.</p><form data-form="new-story"><label>Title<input name="title" maxlength="120" required placeholder="Give your story a title"/></label><label>Genre<select name="genre" required><option value="">Choose a genre</option>${genres.map(genre => `<option value="${esc(genre.name || genre)}">${esc(genre.name || genre)}</option>`).join('')}</select></label><label>Description<textarea name="description" maxlength="2000" placeholder="A short introduction for readers"></textarea></label><label>Cover image<input name="cover" type="file" accept="image/*"/><small>Optional · a portrait cover works best.</small></label><label>Format<select name="content_type"><option value="text">Text story</option><option value="comic">Comic / visual story</option></select></label><div class="form-message" aria-live="polite"></div><button class="primary-button" type="submit">Create draft and start writing <span>→</span></button></form></section></div>`;
}

function profileView() {
  const user = state.pageData?.user;
  if (!user) return '<div class="empty-panel">Profile not available.</div>';
  return `<section class="profile-panel"><div class="profile-avatar">${user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt=""/>` : esc((user.display_name || user.username || '?').slice(0,1).toUpperCase())}</div><div><span class="eyebrow">YOUR READAGORA PROFILE</span><h2>${esc(user.display_name || user.username)}</h2><p>@${esc(user.username)} · ${Number(state.pageData.followers?.count || 0).toLocaleString()} followers</p></div></section><section class="panel profile-edit"><h2>Profile details</h2><form data-form="profile"><label>Display name<input name="display_name" maxlength="60" value="${esc(user.display_name || '')}"/></label><label>Bio<textarea name="bio" maxlength="500">${esc(user.bio || '')}</textarea></label><div class="form-message" aria-live="polite"></div><button class="primary-button" type="submit">Save changes</button></form></section><section class="panel"><div class="panel-heading"><div><h2>Account</h2><p>Manage your ReadAgora account.</p></div><button class="outline-button" data-action="signout">Sign out</button></div><a class="text-link" href="/workroom" data-link>Open creator workroom →</a></section>`;
}

function profileDashboardView() {
  const { user, followers = { count: 0 }, stories = [], wallet, achievements = [], unread = { count: 0 } } = state.pageData || {};
  if (!user) return '<div class="empty-panel">Profile not available.</div>';
  const storyReads = stories.reduce((sum, story) => sum + Number(story.view_count || 0), 0);
  const avatar = user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="Profile picture"/>` : esc((user.display_name || user.username || '?').slice(0, 1).toUpperCase());
  const items = [
    ['library', '/profile/balance', 'Gems & achievements', 'Your balance and milestones', Number(wallet?.balance || 0).toLocaleString()],
    ['community', '/profile/inbox', 'Inbox', 'Replies and activity', unread.count ? `${unread.count} new` : ''],
    ['discover', '/library', 'Viewed stories', 'Continue reading where you left off', ''],
    ['workroom', '/workroom', 'Author Center', 'Stories, analytics, and creator earnings', ''],
    ['community', '/community', 'Community', 'Posts and discussions', ''],
    ['profile', '/profile/blocked', 'Blocked users', 'Manage blocked accounts', ''],
    ['workroom', '/profile/settings', 'Settings', 'Profile, preferences, and account security', ''],
  ];
  return `<section class="profile-dashboard-head"><div class="profile-avatar profile-avatar-large">${avatar}</div><div class="profile-dashboard-identity"><span class="eyebrow">YOUR READAGORA PROFILE</span><h2>${esc(user.display_name || user.username)}${user.is_alpha ? '<span class="alpha-chip">ALPHA</span>' : ''}</h2><p>@${esc(user.username)}</p><p class="profile-bio">${esc(user.bio || 'Add a short bio so readers can get to know you.')}</p></div><div class="profile-head-actions"><a class="outline-button" href="/creator/${encodeURIComponent(user.username)}" data-link>View profile</a><a class="primary-button" href="/profile/settings" data-link>Edit profile</a></div></section><div class="profile-metrics"><a href="/creator/${encodeURIComponent(user.username)}" data-link><b>${Number(followers.count || 0).toLocaleString()}</b><span>Followers</span></a><a href="/workroom" data-link><b>${stories.length.toLocaleString()}</b><span>Stories</span></a><a href="/workroom" data-link><b>${storyReads.toLocaleString()}</b><span>Total reads</span></a></div><section class="profile-balance-card"><div><span class="eyebrow">YOUR BALANCE</span><h2>${Number(wallet?.balance || 0).toLocaleString()} <small>Gems</small></h2><p>${achievements.filter(item => item.unlocked_at).length} achievements unlocked</p></div><a href="/profile/balance" data-link>View details <span>→</span></a></section><section class="profile-promo-card"><div><span class="eyebrow">FOR READERS &amp; CREATORS</span><h2>Make your next chapter count</h2><p>Keep reading, share your work, and grow with ReadAgora.</p></div><a class="primary-button" href="/workroom" data-link>Explore creator tools <span>→</span></a></section><section class="profile-utilities"><div class="profile-section-heading"><div><span class="eyebrow">ACCOUNT &amp; MORE</span><h2>Your ReadAgora</h2></div><a href="/profile/settings" data-link>Settings ${icon('settings')}</a></div><div class="profile-utility-list">${items.map(([glyph, path, title, description, value]) => `<a class="profile-utility-row" href="${path}" data-link><span class="utility-icon">${icon(glyph)}</span><span class="utility-copy"><b>${title}</b><small>${description}</small></span>${value ? `<span class="utility-value">${value}</span>` : ''}${icon('chevron', 'utility-chevron')}</a>`).join('')}<button class="profile-utility-row signout-row" data-action="signout"><span class="utility-icon">${icon('profile')}</span><span class="utility-copy"><b>Sign out</b><small>Sign out from this device</small></span>${icon('chevron', 'utility-chevron')}</button></div></section>`;
}

function profileSettingsView() {
  const { user, preferences = {} } = state.pageData || {};
  if (!user) return '<div class="empty-panel">Account settings are unavailable.</div>';
  const avatar = user.avatar_url ? `<img class="settings-avatar-preview" src="${esc(user.avatar_url)}" alt="Current profile picture"/>` : `<span class="settings-avatar-preview">${esc((user.display_name || user.username || '?').slice(0, 1).toUpperCase())}</span>`;
  return `<a class="back-link" href="/profile" data-link>← Back to profile</a><section class="panel"><div class="panel-heading"><div><span class="eyebrow">PROFILE &amp; ACCOUNT</span><h2>Make your profile yours</h2><p>A few thoughtful details help readers find you.</p></div></div><form data-form="profile"><div class="avatar-edit-row">${avatar}<label>Profile picture<input type="file" name="avatar" accept="image/*"/><small>Choose an image up to 15 MB.</small></label></div><label>Display name<input name="display_name" maxlength="60" value="${esc(user.display_name || '')}" placeholder="Your name"/></label><label>Bio<textarea name="bio" maxlength="500" placeholder="Tell readers a little about you">${esc(user.bio || '')}</textarea></label><div class="form-message" aria-live="polite"></div><button class="primary-button" type="submit">Save profile</button></form><div class="account-details"><b>Account details</b><span>Username: @${esc(user.username)}</span><span>Email: ${esc(state.session?.user?.email || 'Managed by your sign-in provider')}</span></div></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">PREFERENCES</span><h2>Discovery</h2><p>Choose whether fully AI-generated stories appear in Discovery.</p></div></div><form data-form="discovery-preferences"><label class="settings-check"><input type="checkbox" name="show_ai_generated" ${preferences.showAiGenerated === false ? '' : 'checked'}/> Show AI-generated stories</label><div class="form-message" aria-live="polite"></div><button class="outline-button" type="submit">Save preference</button></form></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">SECURITY</span><h2>Password</h2><p>Use at least 8 characters for your new password.</p></div></div><form data-form="change-password"><label>New password<input name="password" type="password" autocomplete="new-password" minlength="8" required/></label><label>Confirm new password<input name="confirm_password" type="password" autocomplete="new-password" minlength="8" required/></label><div class="form-message" aria-live="polite"></div><button class="outline-button" type="submit">Update password</button></form></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">SUPPORT &amp; SAFETY</span><h2>Help keep your account safe</h2></div></div><div class="settings-link-list"><a href="/privacy" data-link>Privacy policy ${icon('chevron', 'utility-chevron')}</a><a href="/terms" data-link>Community terms ${icon('chevron', 'utility-chevron')}</a><a href="/profile/blocked" data-link>Blocked users ${icon('chevron', 'utility-chevron')}</a><a href="mailto:readagora.com@gmail.com">Help &amp; support ${icon('chevron', 'utility-chevron')}</a></div></section><section class="panel danger-panel"><div><span class="eyebrow">DANGER ZONE</span><h2>Delete account</h2><p>This permanently removes your login, profile, and linked content. Save any work you want to keep first.</p></div><form data-form="delete-account"><label>Type DELETE to confirm<input name="confirmation" autocomplete="off" required/></label><div class="form-message" aria-live="polite"></div><button class="danger-button" type="submit">Delete my account</button></form></section>`;
}

function profileBalanceView() {
  const { wallet, achievements = [], transactions = [] } = state.pageData || {};
  return `<a class="back-link" href="/profile" data-link>← Back to profile</a><section class="profile-balance-card balance-page-card"><div><span class="eyebrow">READAGORA WALLET</span><h2>${Number(wallet?.balance || 0).toLocaleString()} <small>Gems</small></h2><p>Use Gems for supported in-app features.</p></div></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">YOUR PROGRESS</span><h2>Achievements</h2></div><span>${achievements.filter(item => item.unlocked_at).length} unlocked</span></div>${achievements.length ? `<div class="profile-achievements">${achievements.map(item => `<article class="achievement-row"><span class="achievement-mark">${item.unlocked_at ? '✦' : '○'}</span><span><b>${esc(item.title || item.name || 'Achievement')}</b><small>${esc(item.description || '')}</small></span><span class="achievement-status">${item.unlocked_at ? 'Unlocked' : 'In progress'}</span></article>`).join('')}</div>` : '<p class="muted-copy">No achievements to show yet. Keep reading to make progress.</p>'}</section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">RECENT ACTIVITY</span><h2>Gem history</h2></div></div>${transactions.length ? `<div class="profile-transaction-list">${transactions.map(item => `<article><span><b>${esc(item.reason || 'Gem activity')}</b><small>${new Date(item.created_at).toLocaleDateString()}</small></span><strong class="${Number(item.amount) >= 0 ? 'positive-amount' : 'negative-amount'}">${Number(item.amount) > 0 ? '+' : ''}${Number(item.amount || 0).toLocaleString()}</strong></article>`).join('')}</div>` : '<p class="muted-copy">No wallet activity yet.</p>'}</section>`;
}

function profileInboxView() {
  const items = state.pageData?.notifications || [];
  return `<a class="back-link" href="/profile" data-link>← Back to profile</a><section class="panel"><div class="panel-heading"><div><span class="eyebrow">YOUR UPDATES</span><h2>Inbox</h2><p>Follows, replies, and updates from ReadAgora.</p></div><button class="outline-button" data-action="mark-all-read">Mark all read</button></div>${items.length ? `<div class="profile-inbox-list">${items.map(item => `<article class="inbox-item ${item.read_at ? '' : 'unread'}"><span class="inbox-avatar">${esc((item.actor?.display_name || item.actor?.username || 'R').slice(0,1).toUpperCase())}</span><span class="inbox-copy"><b>${esc(item.title || item.actor?.display_name || 'ReadAgora update')}</b><small>${esc(item.body || item.notification_type || 'You have a new update.')}</small><time>${new Date(item.created_at).toLocaleString()}</time></span>${!item.read_at ? `<button class="outline-button" data-action="mark-read" data-id="${esc(item.id)}">Mark read</button>` : '<span class="read-marker">Read</span>'}</article>`).join('')}</div>` : '<div class="empty-panel"><h3>You’re all caught up</h3><p>New replies and activity will appear here.</p></div>'}</section>`;
}

function profileBlockedView() {
  const blocks = state.pageData?.blocks || [];
  return `<a class="back-link" href="/profile" data-link>← Back to profile</a><section class="panel"><div class="panel-heading"><div><span class="eyebrow">SUPPORT &amp; SAFETY</span><h2>Blocked users</h2><p>People you block cannot interact with you on ReadAgora.</p></div></div>${blocks.length ? `<div class="profile-inbox-list">${blocks.map(item => `<article class="inbox-item"><span class="inbox-avatar">${esc((item.blocked?.display_name || item.blocked?.username || '?').slice(0,1).toUpperCase())}</span><span class="inbox-copy"><b>${esc(item.blocked?.display_name || item.blocked?.username || 'ReadAgora user')}</b><small>@${esc(item.blocked?.username || '')}</small></span><button class="outline-button" data-action="unblock-user" data-id="${esc(item.blocked_id)}">Unblock</button></article>`).join('')}</div>` : '<div class="empty-panel"><h3>No blocked users</h3><p>Users you block will be listed here.</p></div>'}</section>`;
}

function manageStoryView() {
  const story = state.pageData?.story;
  const chapters = state.pageData?.chapters || [];
  if (!story) return '<div class="empty-panel">Story not found.</div>';
  return `<a class="back-link" href="/workroom" data-link>← Back to workroom</a><section class="panel manage-story-panel"><div class="panel-heading"><div><span class="eyebrow">${esc(story.status || 'DRAFT')} / ${esc(story.genre || 'STORY')}</span><h2>${esc(story.title)}</h2><p>${esc(story.description || 'Add a description to introduce your story.')}</p></div><div class="story-manage-actions"><a class="outline-button" href="/story/${encodeURIComponent(story.id)}" data-link>Preview</a>${story.content_type !== 'comic' ? `<a class="outline-button" href="/workroom/story/${encodeURIComponent(story.id)}/import" data-link>Import manuscript</a>` : ''}<button class="outline-button" type="button" data-action="story-status" data-id="${esc(story.id)}" data-status="${story.status === 'published' ? 'draft' : 'published'}">${story.status === 'published' ? 'Unpublish story' : 'Publish story'}</button></div></div><form data-form="story-settings"><input type="hidden" name="story_id" value="${esc(story.id)}"/><label>Title<input name="title" value="${esc(story.title)}" required maxlength="120"/></label><label>Description<textarea name="description" maxlength="2000">${esc(story.description || '')}</textarea></label><label>Genre<input name="genre" value="${esc(story.genre || '')}" required maxlength="40"/></label><label>Cover image<input name="cover" type="file" accept="image/*"/><small>Upload a cover image, or leave this empty to keep the current one.</small></label><div class="form-message" aria-live="polite"></div><button class="outline-button" type="submit">Save story details</button></form></section><section class="panel"><div class="panel-heading"><div><h2>Chapters</h2><p>${chapters.length} chapters · edit text, arrange comic panels, and publish episodes.</p></div></div><form class="new-chapter-form" data-form="new-chapter"><input type="hidden" name="story_id" value="${esc(story.id)}"/><label>Chapter title<input name="title" maxlength="160" required placeholder="Chapter title"/></label><div class="form-message" aria-live="polite"></div><button class="primary-button" type="submit">Create chapter draft</button></form><div class="managed-chapter-list">${chapters.map((chapter,index) => `<article class="managed-chapter-row"><span class="chapter-order">${String(index+1).padStart(2,'0')}</span><div><b>${esc(chapter.title)}</b><small>${esc(chapter.status)} · ${Number(chapter.word_count || 0).toLocaleString()} words</small></div><a class="outline-button" href="/workroom/story/${encodeURIComponent(story.id)}/chapter/${encodeURIComponent(chapter.id)}" data-link>Edit chapter</a><button class="subtle-button" type="button" data-action="chapter-status" data-id="${esc(chapter.id)}" data-story="${esc(story.id)}" data-status="${chapter.status === 'published' ? 'draft' : 'published'}">${chapter.status === 'published' ? 'Unpublish' : 'Publish'}</button></article>`).join('') || '<div class="empty-panel"><h3>No chapters yet</h3><p>Create a chapter draft to open the writing editor.</p></div>'}</div></section>`;
}

function chapterEditorView() {
  if (state.pageLoading) return `${header()}<main class="workspace"><div class="page-loading">Opening chapter editor…</div></main>${footer()}`;
  const { story, chapter, chapters = [] } = state.pageData || {};
  if (!story || !chapter) return '<div class="empty-panel">Chapter not found.</div>';
  const words = (chapter.content || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const isComic = story.content_type === 'comic' || chapter.content_type === 'comic' || chapter.has_comic;
  return `<div class="chapter-studio">${state.pageError ? `<div class="notice error-notice">${esc(state.pageError)}</div>` : ''}<div class="chapter-studio-top"><a class="back-link" href="/workroom/story/${encodeURIComponent(story.id)}" data-link>← ${esc(story.title)}</a><div class="chapter-save-status" data-save-status>Saved</div><div><button type="button" class="outline-button" data-action="save-chapter">Save</button><button type="button" class="primary-button" data-action="publish-chapter" data-id="${esc(chapter.id)}" data-status="${chapter.status === 'published' ? 'draft' : 'published'}">${chapter.status === 'published' ? 'Unpublish' : 'Publish'}</button></div></div><div class="chapter-studio-layout"><aside class="chapter-studio-nav"><span class="eyebrow">CHAPTERS</span>${chapters.map((item,index) => `<a class="${item.id === chapter.id ? 'active' : ''}" href="/workroom/story/${encodeURIComponent(story.id)}/chapter/${encodeURIComponent(item.id)}" data-link><span>${String(index+1).padStart(2,'0')}</span>${esc(item.title)}</a>`).join('')}<button class="outline-button" data-action="quick-new-chapter" data-id="${esc(story.id)}">＋ New chapter</button></aside><section class="chapter-writing"><div class="chapter-writing-meta"><span class="status-pill">${esc(chapter.status || 'draft')}</span><span data-word-count>${words} words · ${Math.max(1, Math.ceil(words / 200))} min read</span><span>${isComic ? 'Comic chapter' : 'Text chapter'}</span></div><input class="chapter-title-input" data-chapter-title value="${esc(chapter.title)}" maxlength="160" aria-label="Chapter title" placeholder="Chapter title"/><div class="writing-toolbar" role="toolbar" aria-label="Text formatting"><button type="button" data-format="bold"><b>B</b></button><button type="button" data-format="italic"><i>I</i></button><button type="button" data-format="underline"><u>U</u></button><span></span><button type="button" data-format="formatBlock" data-value="h2">Heading</button><button type="button" data-format="formatBlock" data-value="blockquote">Quote</button><button type="button" data-format="insertUnorderedList">• List</button><button type="button" data-format="insertOrderedList">1. List</button></div>${isComic ? `<div class="comic-panel-editor"><label class="comic-upload">Add comic pages<input type="file" data-comic-upload accept="image/*" multiple/><span>Choose images to upload as pages</span></label><div class="comic-panel-list" data-comic-panels>${(state.pageData.panels || []).map((panel,index) => `<article><img src="${esc(panel.image_url)}" alt="Comic page ${index+1}"/><span>Page ${index+1}</span><button type="button" data-action="delete-panel" data-id="${esc(panel.id)}" aria-label="Remove page">Remove</button></article>`).join('')}</div></div>` : `<div class="chapter-content-editor" data-chapter-content contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Start writing your chapter…">${safeText(chapter.autosave_content || chapter.content || '')}</div>`}<div class="chapter-editor-footer"><span>${isComic ? 'Arrange and add artwork pages for your readers.' : 'Your changes save automatically. Use Ctrl/⌘ + S to save now.'}</span><a href="/read/${encodeURIComponent(story.id)}/${encodeURIComponent(chapter.id)}" data-link>Reader preview ↗</a></div></section></div></div>`;
}

function manuscriptImportView() {
  if (state.pageLoading) return `${header()}<main class="workspace"><div class="page-loading">Preparing manuscript import…</div></main>${footer()}`;
  const story = state.pageData?.story;
  const job = state.workroomImport?.storyId === story?.id ? state.workroomImport : null;
  if (!story) return '<div class="empty-panel">Story not found.</div>';
  if (!job || job.stage === 'upload') return `<a class="back-link" href="/workroom/story/${encodeURIComponent(story.id)}" data-link>← Back to story</a><section class="panel manuscript-import"><span class="eyebrow">MANUSCRIPT IMPORT</span><h2>Bring your chapters into ReadAgora</h2><p>Upload a DOCX or text based PDF (up to 20 MB). We’ll find chapter breaks and let you review everything before adding drafts.</p><form data-form="manuscript-import"><input type="hidden" name="story_id" value="${esc(story.id)}"/><label class="manuscript-drop">Choose a .docx or .pdf file<input type="file" name="manuscript" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required/><small>Imported chapters are saved as drafts.</small></label><div class="form-message ${job?.error ? 'is-error' : ''}" aria-live="polite">${esc(job?.error || '')}</div><button class="primary-button" type="submit">Upload and detect chapters</button></form></section>`;
  if (job.stage === 'processing') return `<section class="panel manuscript-import"><span class="eyebrow">MANUSCRIPT IMPORT</span><h2>Reading your manuscript…</h2><p>Extracting text, looking for chapter breaks, and preparing a preview.</p><div class="import-progress"><i></i></div><span class="muted-copy">${esc(job.filename || '')}</span></section>`;
  const chapters = job.preview?.chapters || [];
  return `<a class="back-link" href="/workroom/story/${encodeURIComponent(story.id)}" data-link>← Back to story</a><section class="panel manuscript-import"><div class="panel-heading"><div><span class="eyebrow">REVIEW BEFORE IMPORT</span><h2>${esc(job.preview?.originalFilename || 'Manuscript preview')}</h2><p>${chapters.length} chapters · ${Number(job.preview?.totalWords || 0).toLocaleString()} words${job.preview?.totalImages ? ` · ${job.preview.totalImages} images` : ''}</p></div></div>${job.preview?.warnings?.length ? `<div class="notice">${job.preview.warnings.map(warning => esc(warning)).join('<br/>')}</div>` : ''}<div class="import-chapter-list">${chapters.map((chapter,index) => `<details class="import-chapter" open><summary><span>${String(index+1).padStart(2,'0')}</span><b>${esc(chapter.title)}</b><small>${Number(chapter.wordCount || 0).toLocaleString()} words</small><span class="import-chapter-actions"><button type="button" data-action="import-move" data-index="${index}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-action="import-move" data-index="${index}" data-direction="1" ${index === chapters.length-1 ? 'disabled' : ''}>↓</button><button type="button" data-action="import-remove" data-index="${index}">Remove</button></span></summary><div class="import-chapter-preview"><input value="${esc(chapter.title)}" data-import-title="${index}" aria-label="Chapter ${index+1} title"/><div>${safeText(chapter.html || '')}</div></div></details>`).join('')}</div><div class="import-footer"><button class="outline-button" data-action="import-cancel">Cancel</button><button class="primary-button" data-action="import-commit" ${chapters.length ? '' : 'disabled'}>Add ${chapters.length} chapters as drafts</button></div></section>`;
}

function publicProfileView() {
  const { user, stories = [], following = false } = state.pageData || {};
  if (!user) return '<div class="empty-panel">Creator not found.</div>';
  return `<section class="profile-panel public-profile"><div class="profile-avatar">${user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt=""/>` : esc((user.display_name || user.username || '?').slice(0,1).toUpperCase())}</div><div><span class="eyebrow">READAGORA CREATOR</span><h2>${esc(user.display_name || user.username)}</h2><p>@${esc(user.username)}</p><p>${esc(user.bio || 'Stories and worlds by this creator.')}</p></div>${state.session && user.id !== state.user?.id ? `<button class="primary-button" data-action="follow" data-id="${esc(user.id)}" data-enabled="${following}">${following ? 'Following' : 'Follow'}</button>` : ''}</section><section class="panel"><div class="panel-heading"><h2>Stories</h2><span>${stories.length}</span></div><div class="library-grid">${stories.map(story => `<article class="library-card"><a href="/story/${encodeURIComponent(story.id)}" data-link>${image(story.cover_url, story.title)}<span><b>${esc(story.title)}</b><small>${esc(story.genre || 'Original')} · ${Number(story.view_count || 0).toLocaleString()} reads</small></span></a></article>`).join('')}</div></section>`;
}

function communityPostView() {
  const post = state.pageData?.post;
  const comments = state.pageData?.comments || [];
  if (!post) return '<div class="empty-panel">Post not found.</div>';
  return `<div class="community-detail-layout"><div>${communityPostCard(post)}<section class="panel community-comments"><div class="community-rail-heading"><span class="eyebrow">KEEP THE CONVERSATION GOING</span><h2>${Number(post.comment_count || comments.length).toLocaleString()} comments</h2></div>${state.session ? `<form data-form="post-comment"><input type="hidden" name="post_id" value="${esc(post.id)}"/><textarea name="content" required maxlength="2000" placeholder="Write a thoughtful reply…"></textarea>${termsField()}<button class="primary-button" type="submit">Reply</button><div class="form-message"></div></form>` : '<p><a href="/login" data-link>Sign in</a> to join the conversation.</p>'}<div class="comment-list">${comments.map(comment => `<article class="comment"><b>${esc(comment.user?.display_name || comment.user?.username)}</b><small>${comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ''}</small><p>${esc(comment.content)}</p></article>`).join('') || '<p class="muted-copy">No comments yet. Start the conversation.</p>'}</div></section></div></div>`;
}

function termsPage() {
  const sections = [
    ['Before you contribute', 'You must accept these terms before creating, uploading, or posting on ReadAgora. Keep your account secure and provide accurate profile information. You are responsible for the content you submit.'],
    ['Create responsibly', 'Only publish text, artwork, audio, or other material you own or have permission to use. Respect copyright and collaborators. Do not impersonate another person, plagiarise their work, or publish someone else’s private information.'],
    ['Prohibited content and behaviour', 'Do not post sexual exploitation or abuse of children, pornography, threats, harassment, hateful attacks against protected groups, scams, spam, or content promoting violence or illegal activity. Do not encourage self-harm or expose another person’s private information. These rules apply to stories, comics, covers, profiles, and comments.'],
    ['Reporting and moderation', 'Use Report on a story, user profile, or comment to identify content that breaks these rules. You can also report a problem from Settings. Block users to manage unwanted interactions. ReadAgora may remove content or restrict accounts after review. Contact readagora.com@gmail.com about urgent safety issues or to appeal a moderation decision. Never send your password.'],
    ['Rewards and payments', 'Gems are in-app rewards, not cash or promised income, and cash withdrawals are not available. ReadAgora Premium subscriptions are offered only where a supported store and configured subscription products are available. Prices, renewal terms, cancellation, and refunds are provided by the store before purchase.'],
    ['Leaving ReadAgora', 'You can request permanent account deletion through Settings. Save a copy of work you want to keep first. Account deletion ends access to your account and removes its linked content as described in the privacy policy.'],
  ];
  return `${header()}<main class="workspace policy-page"><a class="back-link" href="/community" data-link>← Back to community</a><span class="eyebrow">UPDATED SEPTEMBER 14, 2026</span><h1>Community terms</h1><p>These rules apply to stories, comics, covers, profiles, posts, and comments on ReadAgora.</p>${sections.map(([title,text]) => `<section><h2>${title}</h2><p>${text}</p></section>`).join('')}</main>${footer()}${mobileTabs()}`;
}

function policyPage(kind) {
  const sections = [
    ['Information you provide', 'We use your email and authentication information to secure your account. Your username, display name, bio, avatar, stories, comic panels, and comments power the profile and publishing features. Public profiles and published work are visible to other people.'],
    ['Activity and device information', 'We store reading progress, bookmarks, follows, likes, reading events, reward activity, and promotion interactions to operate ReadAgora and show creator statistics. If you enable notifications, we store the push token and device platform.'],
    ['How information is used', 'We use information to authenticate you, display stories, save progress, deliver notifications, measure reading activity, and handle safety reports. Supabase provides authentication, database, and file storage. Hosting providers process requests to run the service.'],
    ['Photos and notifications', 'Images you select for a cover, avatar, or comic are uploaded to ReadAgora. You can decline optional permissions. Uploaded image URLs may be publicly accessible, so do not upload confidential images.'],
    ['Storage and retention', 'Account information and content are retained while needed to provide the service. Account deletion removes the login, profile, app-managed uploads, and linked content covered by the deletion process. Safety reports and de-identified records may remain where needed for safety and operations.'],
    ['Your choices', 'You can edit your profile, delete your content using creator tools, control notification permissions, and block or report users. Request access, correction, or deletion by contacting readagora.com@gmail.com.'],
    ['Contact', 'For privacy questions or requests, email readagora.com@gmail.com. We may ask you to verify account ownership before processing a request.'],
  ];
  return `${header()}<main class="workspace policy-page"><a class="back-link" href="/profile/settings" data-link>← Back to settings</a><span class="eyebrow">UPDATED SEPTEMBER 14, 2026</span><h1>Privacy policy</h1><p>How ReadAgora handles your account information and activity.</p>${sections.map(([title,text]) => `<section><h2>${title}</h2><p>${text}</p></section>`).join('')}</main>${footer()}${mobileTabs()}`;
}

function render() {
  const path = decodeURI(location.pathname);
  if (path.startsWith('/read/')) app.innerHTML = readerPage();
  else if (path.startsWith('/story/')) app.innerHTML = storyPage();
  else if (/^\/workroom\/story\/[^/]+\/chapter\/[^/]+$/.test(path)) app.innerHTML = chapterEditorView();
  else if (/^\/workroom\/story\/[^/]+\/import$/.test(path)) app.innerHTML = pageFrame('Import manuscript', 'WORKROOM', manuscriptImportView());
  else if (path === '/login' || path === '/signup' || path === '/forgot-password' || path === '/reset-password') app.innerHTML = authPage(path.slice(1));
  else if (path === '/library') app.innerHTML = pageFrame('Your library', 'LIBRARY', `<div class="wide-page-layout library-page-layout"><div class="wide-page-main">${libraryView()}</div></div>`);
  else if (path === '/community') app.innerHTML = pageFrame('', '', communityView());
  else if (path === '/events') app.innerHTML = pageFrame('Events', 'WRITING CHALLENGES', eventsView());
  else if (path === '/workroom') app.innerHTML = pageFrame('Workroom', 'YOUR CREATOR SPACE', workroomView());
  else if (path.startsWith('/workroom/story/')) app.innerHTML = pageFrame('Manage story', 'WORKROOM', manageStoryView());
  else if (path === '/profile') app.innerHTML = pageFrame('Profile', 'ACCOUNT', `<div class="wide-page-layout profile-layout"><div class="wide-page-main">${profileDashboardView()}</div></div>`);
  else if (path === '/profile/settings') app.innerHTML = pageFrame('Settings', 'PROFILE & ACCOUNT', profileSettingsView());
  else if (path === '/profile/balance') app.innerHTML = pageFrame('Gems & achievements', 'YOUR BALANCE', profileBalanceView());
  else if (path === '/profile/inbox') app.innerHTML = pageFrame('Inbox', 'YOUR UPDATES', profileInboxView());
  else if (path === '/profile/blocked') app.innerHTML = pageFrame('Blocked users', 'SUPPORT & SAFETY', profileBlockedView());
  else if (path === '/privacy') app.innerHTML = policyPage('privacy');
  else if (path === '/terms') app.innerHTML = termsPage();
  else if (path.startsWith('/creator/')) app.innerHTML = pageFrame('Creator profile', 'CREATOR', publicProfileView());
  else if (path.startsWith('/community/post/')) app.innerHTML = pageFrame('Community post', 'COMMUNITY', communityPostView());
  else app.innerHTML = home();
  bind();
  initSponsorFlagAnimation();
  initSponsorAdRotation();
  initEventCardCountdown();
  if (path === '/' && !state.homeLoaded && !state.loading && !state.error) loadHome();
}

async function loadHome() {
  state.loading = true; state.error = ''; render();
  try {
    const [result, trending, newest, followed] = await Promise.all([
      api('/discovery'),
      api('/discover/trending?limit=18').catch(() => []),
      api('/discover?limit=18').catch(() => []),
      state.session ? api('/discover/following?limit=18').catch(() => []) : Promise.resolve([]),
    ]);
    const shelves = result.shelves || [];
    const recentlyUpdatedIds = new Set(shelves
      .filter(shelf => shelf.type === 'recently_updated')
      .flatMap(shelf => shelf.stories || [])
      .map(story => story.id));
    const newReleases = newest.filter(story => !recentlyUpdatedIds.has(story.id));
    const normalizedShelves = shelves.map(shelf => shelf.type === 'new'
      ? { ...shelf, stories: (shelf.stories || []).filter(story => !recentlyUpdatedIds.has(story.id)) }
      : shelf);
    const types = new Set(shelves.map(shelf => shelf.type));
    state.rankingLists = {
      hot: trending.length ? trending : (shelves.find(shelf => shelf.type === 'trending')?.stories || []),
      rising: shelves.find(shelf => shelf.type === 'rising')?.stories || [],
      new: newReleases,
    };
    state.comicStories = [...new Map(shelves
      .filter(shelf => shelf.type !== 'ai_generated')
      .flatMap(shelf => shelf.stories || [])
      .filter(story => story.content_type === 'comic')
      .map(story => [story.id, story])).values()];
    state.followedStories = followed || [];
    if (!types.has('trending') && trending.length) normalizedShelves.push({ id: 'trending-fallback', type: 'trending', title: 'Trending Now (Ranked)', stories: trending });
    if (!types.has('new') && newReleases.length) normalizedShelves.push({ id: 'new-releases', type: 'new', title: 'New Releases', stories: newReleases });
    state.shelves = normalizedShelves;
  } catch (error) {
    state.error = `${error.message}. Check that the ReadAgora API is available.`;
  } finally { state.loading = false; state.homeLoaded = true; render(); }
}

async function loadStory(id, chapterId) {
  state.story = null; state.chapters = []; state.chapter = null; state.comments = []; state.loading = true; state.error = ''; render();
  state.readerLastScrollY = 0;
  app.querySelector('.reader-topbar')?.classList.remove('is-hidden');
  try {
    const [story, chapters] = await Promise.all([api(`/stories/${encodeURIComponent(id)}`), api(`/stories/${encodeURIComponent(id)}/chapters`)]);
    state.story = story; state.chapters = chapters || [];
    if (chapterId) {
      state.chapter = await api(`/chapters/${encodeURIComponent(chapterId)}`);
      if (state.session) void api(`/stories/${encodeURIComponent(id)}/progress`, { method: 'PUT', body: { last_chapter_id: chapterId } }).catch(() => undefined);
      void api(`/stories/${encodeURIComponent(id)}/views`, { method: 'POST', body: { chapter_id: chapterId } }).catch(() => undefined);
      state.comments = await api(`/chapters/${encodeURIComponent(chapterId)}/comments?limit=30&offset=0`).catch(() => []);
    }
  } catch (error) { state.error = error.message; }
  finally {
    state.loading = false;
    render();
    if (chapterId && state.chapter) {
      let savedPosition = 0;
      try { savedPosition = Number(localStorage.getItem(readerPositionKey(id, chapterId))) || 0; } catch {}
      requestAnimationFrame(() => {
        const previousScrollBehavior = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, savedPosition);
        document.documentElement.style.scrollBehavior = previousScrollBehavior;
        state.readerLastScrollY = window.scrollY;
      });
    }
  }
}

async function loadPage(kind, argument = '') {
  state.page = kind; state.pageData = null; state.pageLoading = true; state.pageError = '';
  render();
  try {
    if (kind === 'library') {
      const [library, bookmarks] = await Promise.all([api('/library'), api('/bookmarks')]);
      state.pageData = { library: library || [], bookmarks: bookmarks || [] };
    } else if (kind === 'community') {
      const tab = state.communityTab || 'for-you';
      const [feed, sidebar, myStories, communityUser] = await Promise.all([
        api(`/community?tab=${encodeURIComponent(tab)}&offset=0`),
        api('/community/sidebar').catch(() => ({ discussions: [], writers: [] })),
        state.session ? api('/users/me/stories').catch(() => []) : Promise.resolve([]),
        state.session ? api('/users/me').catch(() => state.session?.user || null) : Promise.resolve(null),
      ]);
      if (communityUser) state.user = communityUser;
      state.pageData = { ...(feed || {}), sidebar, myStories: myStories || [] };
    } else if (kind === 'workroom') {
      const [stories, analytics, cashWallet, cashoutQuote, payouts, genres] = await Promise.all([
        api('/users/me/stories'), api('/analytics/author').catch(() => null),
        api('/creator/cash-wallet').catch(() => null), api('/creator/cashout/quote').catch(() => null),
        api('/creator/payout-history?limit=10').catch(() => []), api('/genres').catch(() => []),
      ]);
      state.pageData = { stories: stories || [], analytics, cashWallet, cashoutQuote, payouts: payouts || [], genres: genres || [] };
    } else if (kind === 'profile') {
      const [user, followers, stories, wallet, achievements, unread] = await Promise.all([
        api('/users/me'), api('/users/me/follower-count').catch(() => ({ count: 0 })),
        api('/users/me/stories').catch(() => []), api('/wallet').catch(() => null),
        api('/wallet/achievements').catch(() => []), api('/notifications/unread-count').catch(() => ({ count: 0 })),
      ]);
      state.user = user; state.pageData = { user, followers, stories: stories || [], wallet, achievements: achievements || [], unread };
    } else if (kind === 'profile-settings') {
      const [user, preferences] = await Promise.all([api('/users/me'), api('/discovery/preferences').catch(() => ({}))]);
      state.user = user; state.pageData = { user, preferences };
    } else if (kind === 'profile-balance') {
      const [wallet, achievements, transactions] = await Promise.all([
        api('/wallet'), api('/wallet/achievements').catch(() => []), api('/wallet/transactions?limit=20').catch(() => []),
      ]);
      state.pageData = { wallet, achievements: achievements || [], transactions: transactions || [] };
    } else if (kind === 'profile-inbox') {
      const notifications = await api('/notifications?limit=50&offset=0');
      state.pageData = { notifications: notifications || [] };
    } else if (kind === 'profile-blocked') {
      const blocks = await api('/users/me/blocks');
      state.pageData = { blocks: blocks || [] };
    } else if (kind === 'manage-story') {
      const [story, chapters] = await Promise.all([api(`/stories/${encodeURIComponent(argument)}`), api(`/stories/${encodeURIComponent(argument)}/chapters`)]);
      state.pageData = { story, chapters: chapters || [] };
    } else if (kind === 'chapter-editor') {
      const [story, chapters, chapter, panels] = await Promise.all([
        api(`/stories/${encodeURIComponent(argument.storyId)}`),
        api(`/stories/${encodeURIComponent(argument.storyId)}/chapters`),
        api(`/chapters/${encodeURIComponent(argument.chapterId)}`),
        api(`/chapters/${encodeURIComponent(argument.chapterId)}/panels`).catch(() => []),
      ]);
      state.pageData = { story, chapters: chapters || [], chapter, panels: panels || [] };
    } else if (kind === 'manuscript-import') {
      const story = await api(`/stories/${encodeURIComponent(argument)}`);
      state.pageData = { story };
    } else if (kind === 'creator') {
      const user = await api(`/users/${encodeURIComponent(argument)}`);
      const [stories, follow] = await Promise.all([
        api(`/users/${encodeURIComponent(argument)}/stories`),
        state.session ? api(`/users/${encodeURIComponent(user.id)}/follow`).catch(() => ({ following: false })) : Promise.resolve({ following: false }),
      ]);
      state.pageData = { user, stories: stories || [], following: follow.following };
    } else if (kind === 'community-post') {
      const [post, comments] = await Promise.all([api(`/community/posts/${encodeURIComponent(argument)}`), api(`/community/posts/${encodeURIComponent(argument)}/comments?offset=0`)]);
      state.pageData = { post, comments: comments?.items || [] };
    }
  } catch (error) { state.pageError = error.message; }
  finally { state.pageLoading = false; render(); }
}

function protectPage(path) {
  if (state.session) return true;
  app.innerHTML = signedOutPage(path);
  bind();
  return false;
}

function processAuthHash() {
  if (!location.hash.includes('access_token=')) return;
  const params = new URLSearchParams(location.hash.slice(1));
  const accessToken = params.get('access_token');
  if (accessToken) {
    saveSession({ access_token: accessToken, refresh_token: params.get('refresh_token'), expires_in: Number(params.get('expires_in') || 3600), token_type: params.get('token_type') || 'bearer' });
    history.replaceState({}, '', params.get('type') === 'recovery' ? '/reset-password' : '/');
  }
}

function navigate(path) {
  history.pushState({}, '', path); route(); window.scrollTo(0, 0);
}

function route() {
  processAuthHash();
  const parts = decodeURI(location.pathname).split('/').filter(Boolean);
  if (parts[0] === 'story' && parts[1]) { loadStory(parts[1]); return; }
  if (parts[0] === 'read' && parts[1] && parts[2]) { loadStory(parts[1], parts[2]); return; }
  if (parts[0] === 'login' || parts[0] === 'signup' || parts[0] === 'forgot-password' || parts[0] === 'reset-password') { render(); return; }
  if (parts[0] === 'library' || parts[0] === 'workroom' || parts[0] === 'profile') {
    if (!protectPage(location.pathname)) return;
    if (parts[0] === 'workroom' && parts[1] === 'story' && parts[2] && parts[3] === 'chapter' && parts[4]) { loadPage('chapter-editor', { storyId: parts[2], chapterId: parts[4] }); return; }
    if (parts[0] === 'workroom' && parts[1] === 'story' && parts[2] && parts[3] === 'import') { loadPage('manuscript-import', parts[2]); return; }
    if (parts[0] === 'workroom' && parts[1] === 'story' && parts[2]) { loadPage('manage-story', parts[2]); return; }
    if (parts[0] === 'profile') {
      const profilePages = { settings: 'profile-settings', balance: 'profile-balance', inbox: 'profile-inbox', blocked: 'profile-blocked' };
      loadPage(profilePages[parts[1]] || 'profile'); return;
    }
    loadPage(parts[0]); return;
  }
  if (parts[0] === 'community') {
    if (parts[1] === 'post' && parts[2]) { loadPage('community-post', parts[2]); return; }
    loadPage('community'); return;
  }
  if (parts[0] === 'events') { render(); return; }
  if (parts[0] === 'creator' && parts[1]) { loadPage('creator', parts[1]); return; }
  if (parts.length === 0) {
    state.page = null; state.pageData = null; state.pageError = '';
    state.loading = false; state.error = ''; state.story = null; state.chapter = null;
    render(); return;
  }
  state.loading = false; state.story = null; state.chapter = null; render();
}

function bind() {
  const contributionForms = new Set(['profile', 'post', 'new-story', 'story-settings', 'new-chapter', 'edit-chapter', 'post-comment', 'chapter-comment', 'manuscript-import']);
  app.querySelectorAll('form[data-form]').forEach(form => {
    if (contributionForms.has(form.dataset.form) && !termsAccepted() && !form.querySelector('[name="accept_terms"]')) form.insertAdjacentHTML('beforeend', termsField());
  });
  app.querySelectorAll('[data-link]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute('href');
    event.preventDefault();
    if (location.pathname.startsWith('/read/')) saveReaderPosition();
    if (/^\/workroom\/story\/[^/]+\/chapter\/[^/]+$/.test(decodeURI(location.pathname)) && href !== location.pathname) {
      void saveChapterDraft().then(saved => { if (saved) navigate(href); });
      return;
    }
    if (href.startsWith('/#')) {
      navigate('/');
      requestAnimationFrame(() => document.querySelector(href.slice(1))?.scrollIntoView({ behavior: 'smooth' }));
    } else navigate(href);
  }));
  app.querySelectorAll('[data-save]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation(); void saveStory(button.dataset.save, button);
  }));
  app.querySelector('[data-retry]')?.addEventListener('click', loadHome);
  app.querySelector('[data-scroll]')?.addEventListener('click', () => document.querySelector('#discover')?.scrollIntoView({ behavior: 'smooth' }));
  app.querySelectorAll('.search-toggle,.inline-search,.banner-button,[data-open-search]').forEach(button => button.addEventListener('click', () => openSearch()));
  app.querySelectorAll('[data-discover-tab]').forEach(button => button.addEventListener('click', () => {
    state.genreFilter = button.dataset.genre || 'all';
    state.formatFilter = button.dataset.format || 'all';
    render();
  }));
  app.querySelectorAll('[data-shelf-scroll]').forEach(button => button.addEventListener('click', () => {
    const rail = button.closest('.shelf')?.querySelector('.story-rail');
    if (rail) rail.scrollBy({ left: Number(button.dataset.shelfScroll) * Math.max(240, rail.clientWidth * 0.82), behavior: 'smooth' });
  }));
  app.querySelectorAll('.story-rail').forEach(rail => rail.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    rail.scrollBy({ left: event.key === 'ArrowRight' ? 240 : -240, behavior: 'smooth' });
  }));
  app.querySelector('[data-ranking-sort]')?.addEventListener('change', event => { state.rankingSort = event.target.value; render(); });
  app.querySelector('[data-ranking-expand]')?.addEventListener('click', () => {
    const more = app.querySelector('.ranking-more');
    if (!more) return;
    more.open = true;
    more.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  app.querySelector('[data-workroom-search]')?.addEventListener('input', event => { state.workroomQuery = event.target.value; const list = app.querySelector('.managed-story-list'); const query = state.workroomQuery.trim().toLowerCase(); let visible = 0; list?.querySelectorAll('.managed-story').forEach(card => { const match = card.textContent.toLowerCase().includes(query); card.hidden = !match; if (match) visible++; }); const empty = app.querySelector('.workroom-filter-empty'); if (empty) empty.hidden = visible > 0 || !query || !list; });
  app.querySelectorAll('[data-workroom-status]').forEach(button => button.addEventListener('click', () => { state.workroomStatus = button.dataset.workroomStatus; render(); }));
  app.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
    const editor = app.querySelector('[data-chapter-content]'); if (!editor) return; editor.focus();
    document.execCommand(button.dataset.format, false, button.dataset.value || null); editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }));
  const chapterBody = app.querySelector('[data-chapter-content]');
  chapterBody?.addEventListener('input', () => {
    const text = chapterBody.innerText.trim(); const words = text ? text.split(/\s+/).length : 0;
    const counter = app.querySelector('[data-word-count]'); if (counter) counter.textContent = `${words} words · ${Math.max(1, Math.ceil(words / 200))} min read`;
    const status = app.querySelector('[data-save-status]'); if (status) status.textContent = 'Unsaved changes';
    clearTimeout(state.chapterSaveTimer); state.chapterSaveTimer = setTimeout(() => void saveChapterDraft(false), 2400);
  });
  app.querySelector('[data-chapter-title]')?.addEventListener('input', () => { const status = app.querySelector('[data-save-status]'); if (status) status.textContent = 'Unsaved changes'; clearTimeout(state.chapterSaveTimer); state.chapterSaveTimer = setTimeout(() => void saveChapterDraft(false), 2400); });
  if (chapterBody || app.querySelector('[data-chapter-title]')) window.onkeydown = event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && decodeURI(location.pathname).includes('/workroom/story/') && decodeURI(location.pathname).includes('/chapter/')) { event.preventDefault(); void saveChapterDraft(); } };
  app.querySelector('[data-comic-upload]')?.addEventListener('change', async event => {
    const files = [...event.target.files || []]; const chapterId = state.pageData?.chapter?.id;
    try { for (const file of files) { const data = new FormData(); data.append('file', file); const uploaded = await api('/uploads/panel', { method: 'POST', body: data }); await api(`/chapters/${encodeURIComponent(chapterId)}/panels`, { method: 'POST', body: { image_url: uploaded.url, width: uploaded.width, height: uploaded.height } }); } await loadPage('chapter-editor', { storyId: state.pageData.story.id, chapterId }); }
    catch (error) { state.pageError = error.message; render(); }
  });
  app.querySelector('#library-search')?.addEventListener('input', event => {
    state.libraryQuery = event.target.value;
    const query = state.libraryQuery.trim().toLocaleLowerCase();
    const cards = [...app.querySelectorAll('[data-library-entry]')];
    let visible = 0;
    cards.forEach(card => { card.hidden = !card.dataset.search.includes(query); if (!card.hidden) visible++; });
    const noResults = app.querySelector('.library-no-results');
    if (noResults) noResults.hidden = visible > 0;
    const count = app.querySelector('.library-count');
    if (count) count.textContent = `${visible} ${visible === 1 ? 'story' : 'stories'}`;
  });
  app.querySelector('#library-sort')?.addEventListener('change', event => {
    state.librarySort = event.target.value;
    const grid = app.querySelector('.library-grid');
    if (!grid) return;
    const cards = [...grid.querySelectorAll('[data-library-entry]')];
    cards.sort((a, b) => event.target.value === 'title'
      ? a.dataset.title.localeCompare(b.dataset.title)
      : new Date(b.dataset.updated || 0) - new Date(a.dataset.updated || 0));
    cards.forEach(card => grid.append(card));
  });
  app.querySelector('[data-action="profile"]')?.addEventListener('click', () => navigate('/profile'));
  app.querySelector('#story-search')?.addEventListener('keydown', event => { if (event.key === 'Enter') { openSearch(); searchStories(event.target.value); } });
  app.querySelectorAll('[data-font]').forEach(button => button.addEventListener('click', () => {
    state.readerSettings.size = Math.max(16, Math.min(28, state.readerSettings.size + Number(button.dataset.font) * 2));
    const sizeInput = app.querySelector('[data-reader-setting="size"]');
    if (sizeInput) sizeInput.value = String(state.readerSettings.size);
    const output = app.querySelector('[data-reader-value="size"]');
    if (output) output.textContent = `${state.readerSettings.size}px`;
    applyReaderSettings(); saveReaderSettings();
  }));
  app.querySelectorAll('[data-reader-setting]').forEach(control => control.addEventListener(control.type === 'range' ? 'input' : 'change', () => {
    const { readerSetting: setting } = control.dataset;
    if (setting === 'size' || setting === 'lineHeight' || setting === 'width') state.readerSettings[setting] = Number(control.value);
    else if (setting === 'font' && ['sans', 'serif'].includes(control.value)) state.readerSettings.font = control.value;
    else if (setting === 'theme' && ['night', 'warm', 'paper'].includes(control.value)) state.readerSettings.theme = control.value;
    const output = app.querySelector(`[data-reader-value="${setting}"]`);
    if (output) output.textContent = setting === 'size' ? `${state.readerSettings.size}px` : state.readerSettings.lineHeight.toFixed(1);
    applyReaderSettings(); saveReaderSettings();
  }));
  app.querySelector('.theme-toggle')?.addEventListener('click', () => {
    state.readerSettings.theme = state.readerSettings.theme === 'paper' ? 'night' : state.readerSettings.theme === 'night' ? 'warm' : 'paper';
    const themeSelect = app.querySelector('[data-reader-setting="theme"]');
    if (themeSelect) themeSelect.value = state.readerSettings.theme;
    applyReaderSettings(); saveReaderSettings();
  });
  app.querySelectorAll('[data-reader-sidebar]').forEach(button => button.addEventListener('click', () => {
    state.readerSidebarCollapsed = !state.readerSidebarCollapsed;
    app.querySelector('.reader-layout')?.classList.toggle('sidebar-collapsed', state.readerSidebarCollapsed);
    app.querySelectorAll('[data-reader-sidebar]').forEach(toggle => {
      toggle.setAttribute('aria-expanded', String(!state.readerSidebarCollapsed));
      toggle.setAttribute('aria-label', `${state.readerSidebarCollapsed ? 'Show' : 'Hide'} chapter list`);
      toggle.title = `${state.readerSidebarCollapsed ? 'Show' : 'Hide'} chapter list`;
    });
    const reopen = app.querySelector('.reader-sidebar-reopen');
    if (reopen) reopen.hidden = !state.readerSidebarCollapsed;
  }));
  app.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', handleAction));
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

function formMessage(form, message, error = false) {
  const target = form.querySelector('.form-message');
  if (target) { target.textContent = message; target.classList.toggle('is-error', error); }
}

async function saveChapterDraft() {
  const chapter = state.pageData?.chapter;
  if (!chapter) return;
  clearTimeout(state.chapterSaveTimer);
  const status = app.querySelector('[data-save-status]');
  if (status) status.textContent = 'Saving…';
  try {
    const title = app.querySelector('[data-chapter-title]')?.value.trim() || chapter.title;
    const content = app.querySelector('[data-chapter-content]')?.innerHTML || chapter.content || '<p></p>';
    await api(`/chapters/${encodeURIComponent(chapter.id)}`, { method: 'PATCH', body: { title, content } });
    chapter.title = title; chapter.content = content;
    if (status) status.textContent = 'All changes saved';
    return true;
  } catch (error) {
    if (status) status.textContent = 'Save failed';
    state.pageError = error.message || 'Could not save the chapter.';
    return false;
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const values = Object.fromEntries(data.entries());
  formMessage(form, 'Working…');
  try {
    const type = form.dataset.form;
    if (type === 'login' || type === 'signup') {
      const body = { email: String(values.email).trim(), password: String(values.password) };
      const result = await api(`/auth/${type === 'login' ? 'signin' : 'signup'}`, { method: 'POST', body: { ...body, ...(type === 'signup' ? { username: String(values.username).trim() } : {}) }, skipAuth: true });
      const session = result?.session || result;
      if (session?.access_token) {
        saveSession(session); state.user = result.user || session.user || null;
        const next = new URLSearchParams(location.search).get('next') || '/';
        navigate(next.startsWith('/') ? next : '/'); return;
      }
      formMessage(form, 'Account created. Check your email to confirm, then sign in.'); return;
    }
    if (type === 'forgot') {
      if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Password reset is not configured.');
      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: String(values.email).trim(), redirect_to: `${location.origin}/reset-password` }) });
      if (!response.ok) throw new Error('Could not send the reset email. Try again.');
      formMessage(form, 'If an account matches that address, a reset link is on its way.'); return;
    }
    if (type === 'reset') {
      if (!state.session?.access_token || !SUPABASE_URL || !SUPABASE_KEY) throw new Error('Open the password reset link from your email first.');
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { method: 'PUT', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${state.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: values.password }) });
      if (!response.ok) throw new Error('Could not update your password. Request a new reset link.');
      formMessage(form, 'Password updated. You can now sign in.'); saveSession(null); return;
    }
    if (type === 'change-password') {
      if (String(values.password) !== String(values.confirm_password)) throw new Error('The passwords do not match.');
      if (!SUPABASE_URL || !SUPABASE_KEY || !state.session?.access_token) throw new Error('Password changes are unavailable for this session.');
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { method: 'PUT', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${state.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: values.password }) });
      if (!response.ok) throw new Error('Could not update your password. Check the requirements and try again.');
      form.reset(); formMessage(form, 'Password updated.'); return;
    }
    if (type === 'delete-account') {
      if (String(values.confirmation).trim() !== 'DELETE') throw new Error('Type DELETE to confirm account removal.');
      await api('/users/me/account', { method: 'DELETE', body: { confirmation: 'DELETE' } });
      saveSession(null); state.user = null; navigate('/'); return;
    }
    if (type === 'payout') {
      const amountMinor = Math.round(Number(values.amount) * 100);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error('Enter a valid payout amount.');
      await api('/creator/payout-requests', { method: 'POST', body: {
        amountZmwMinorUnits: amountMinor,
        payoutMethod: String(values.payout_method),
        destinationReference: String(values.destination).trim(),
        idempotencyKey: crypto.randomUUID(),
      } });
      await loadPage('workroom'); return;
    }
    if (['profile', 'post', 'new-story', 'story-settings', 'new-chapter', 'edit-chapter', 'post-comment', 'chapter-comment'].includes(type)) await ensureTerms(form);
    if (type === 'profile') {
      const patch = { display_name: String(values.display_name).trim() || null, bio: String(values.bio).trim() || null };
      if (values.avatar instanceof File && values.avatar.size > 0) {
        const upload = new FormData(); upload.append('file', values.avatar);
        const result = await api('/uploads/avatar', { method: 'POST', body: upload });
        patch.avatar_url = result.url;
      }
      await api('/users/me', { method: 'PATCH', body: patch });
      formMessage(form, 'Profile updated.'); await loadPage('profile-settings'); return;
    }
    if (type === 'discovery-preferences') {
      await api('/discovery/preferences', { method: 'PUT', body: { showAiGenerated: values.show_ai_generated === 'on' } });
      formMessage(form, 'Discovery preference saved.'); return;
    }
    if (type === 'post') {
      const content = String(values.content || '').trim();
      const postType = String(values.post_type || 'post');
      const options = String(values.poll_options || '').split(/\r?\n/).map(option => option.trim()).filter(Boolean);
      if (!content) throw new Error(postType === 'poll' ? 'Add a question for your poll.' : 'Write something before publishing.');
      if (postType === 'poll' && (options.length < 2 || options.length > 4)) throw new Error('Add between 2 and 4 poll options.');
      let imageUrl;
      if (values.image instanceof File && values.image.size) {
        const upload = new FormData(); upload.append('file', values.image);
        const uploaded = await api('/uploads/cover', { method: 'POST', body: upload }); imageUrl = uploaded.url;
      }
      await api('/community/posts', { method: 'POST', body: { content, post_type: postType, story_id: values.story_id || undefined, chapter_id: values.chapter_id || undefined, contains_spoiler: values.contains_spoiler === 'on', image_url: imageUrl, poll_options: postType === 'poll' ? options : undefined } });
      state.communityTab = state.communityTab === 'saved' ? 'for-you' : state.communityTab; await loadPage('community'); return;
    }
    if (type === 'new-story') {
      const story = await api('/stories', { method: 'POST', body: { title: String(values.title).trim(), genre: String(values.genre).trim(), description: String(values.description).trim(), content_type: values.content_type || 'text' } });
      if (values.cover instanceof File && values.cover.size) {
        const upload = new FormData(); upload.append('file', values.cover);
        const cover = await api('/uploads/cover', { method: 'POST', body: upload });
        await api(`/stories/${encodeURIComponent(story.id)}`, { method: 'PATCH', body: { cover_url: cover.url } });
      }
      document.querySelector('.modal-backdrop')?.remove(); navigate(`/workroom/story/${encodeURIComponent(story.id)}`); return;
    }
    if (type === 'story-settings') {
      const patch = { title: String(values.title).trim(), description: String(values.description).trim(), genre: String(values.genre).trim() };
      if (values.cover instanceof File && values.cover.size) { const upload = new FormData(); upload.append('file', values.cover); const cover = await api('/uploads/cover', { method: 'POST', body: upload }); patch.cover_url = cover.url; }
      await api(`/stories/${encodeURIComponent(values.story_id)}`, { method: 'PATCH', body: patch });
      await loadPage('manage-story', values.story_id); return;
    }
    if (type === 'new-chapter') {
      const story = state.pageData?.story;
      const isComic = story?.content_type === 'comic';
      const chapter = await api(`/stories/${encodeURIComponent(values.story_id)}/chapters`, { method: 'POST', body: { title: String(values.title).trim(), content: isComic ? '' : '<p></p>', content_type: isComic ? 'comic' : 'text', has_text: !isComic, has_comic: isComic, status: 'draft' } });
      navigate(`/workroom/story/${encodeURIComponent(values.story_id)}/chapter/${encodeURIComponent(chapter.id)}`); return;
    }
    if (type === 'manuscript-import') {
      const file = values.manuscript;
      if (!(file instanceof File) || !file.size) throw new Error('Choose a DOCX or PDF manuscript first.');
      if (!/\.(docx|pdf)$/i.test(file.name)) throw new Error('Only DOCX and PDF manuscripts are supported.');
      if (file.size > 20 * 1024 * 1024) throw new Error('Manuscripts must be 20 MB or smaller.');
      const formData = new FormData(); formData.append('file', file); formData.append('storyId', String(values.story_id));
      state.workroomImport = { stage: 'processing', storyId: String(values.story_id), filename: file.name }; render();
      try { const result = await api('/imports', { method: 'POST', body: formData }); const preview = await api(`/imports/${encodeURIComponent(result.importId)}/preview`); state.workroomImport = { stage: 'preview', storyId: String(values.story_id), importId: result.importId, filename: file.name, preview }; state.pageError = ''; render(); }
      catch (error) { state.workroomImport = { stage: 'upload', storyId: String(values.story_id), filename: file.name, error: error.message || 'Could not process the manuscript.' }; render(); }
      return;
    }
    if (type === 'edit-chapter') {
      await api(`/chapters/${encodeURIComponent(values.chapter_id)}`, { method: 'PATCH', body: { title: String(values.title).trim(), content: String(values.content) } });
      formMessage(form, 'Chapter saved.'); await loadPage('manage-story', values.story_id); return;
    }
    if (type === 'post-comment') {
      await api(`/community/posts/${encodeURIComponent(values.post_id)}/comments`, { method: 'POST', body: { content: String(values.content).trim() } });
      await loadPage('community-post', values.post_id); return;
    }
    if (type === 'chapter-comment') {
      const chapterId = state.chapter?.id;
      await api(`/chapters/${encodeURIComponent(chapterId)}/comments`, { method: 'POST', body: { text: String(values.text).trim() } });
      await loadStory(state.story.id, chapterId); return;
    }
  } catch (error) { formMessage(form, error.message || 'Could not save that. Try again.', true); }
}

async function handleAction(event) {
  const button = event.currentTarget;
  const action = button.dataset.action;
  try {
    if (action === 'site-theme') {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('readagora-theme', next);
      const themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) themeColor.content = next === 'light' ? '#f5f5f6' : '#000000';
      render(); return;
    }
    if (action === 'event-card-cta') {
      const href = button.dataset.href || '/events';
      if (href.startsWith('/')) navigate(href);
      else window.location.assign(href);
      return;
    }
    if (['post-like', 'post-save', 'follow'].includes(action) && !state.session) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return;
    }
    if (action === 'library-tab') { state.libraryTab = button.dataset.tab; state.librarySort = 'recent'; render(); return; }
    if (action === 'library-retry') { await loadPage('library'); return; }
    if (action === 'library-clear-search') { const input = app.querySelector('#library-search'); if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); } return; }
    if (action === 'community-tab') { state.communityTab = button.dataset.tab; await loadPage('community'); return; }
    if (action === 'open-community-composer') { app.insertAdjacentHTML('beforeend', communityComposerModal()); bind(); app.querySelector('[data-community-modal] textarea[name="content"]')?.focus(); return; }
    if (action === 'community-reveal') { state.revealedPosts = [...new Set([...(state.revealedPosts || []), button.dataset.id])]; render(); return; }
    if (action === 'community-load-more') {
      const offset = state.pageData?.next_offset;
      if (offset == null) return;
      button.disabled = true; button.textContent = 'Loading…';
      const result = await api(`/community?tab=${encodeURIComponent(state.communityTab || 'for-you')}&offset=${encodeURIComponent(offset)}`);
      state.pageData = { ...state.pageData, ...result, items: [...(state.pageData.items || []), ...(result?.items || [])] };
      render(); return;
    }
    if (action === 'community-vote') {
      if (!state.session) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
      await api(`/community/posts/${encodeURIComponent(button.dataset.id)}/vote`, { method: 'POST', body: { option_index: Number(button.dataset.index) } });
      await loadPage('community'); return;
    }
    if (action === 'community-delete') {
      if (!confirm('Delete this post and its comments?')) return;
      await api(`/community/posts/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' });
      await loadPage('community'); return;
    }
    if (action === 'community-edit') {
      const current = state.pageData?.items?.find(item => item.id === button.dataset.id) || state.pageData?.post;
      const content = prompt('Edit your post', current?.content || '');
      if (content == null || !content.trim()) return;
      await api(`/community/posts/${encodeURIComponent(button.dataset.id)}`, { method: 'PATCH', body: { content: content.trim() } });
      await loadPage('community'); return;
    }
    if (action === 'community-report') {
      if (!confirm('Report this post to the moderation team?')) return;
      await api('/reports', { method: 'POST', body: { category: 'inappropriate_content', description: `Community post ${button.dataset.id}`, reported_user_id: button.dataset.user } });
      button.closest('details')?.removeAttribute('open'); button.textContent = 'Report submitted'; return;
    }
    if (action === 'community-block') {
      if (!confirm(`Block @${button.dataset.username}? Their posts will be hidden from your feed.`)) return;
      await api(`/users/${encodeURIComponent(button.dataset.user)}/block`, { method: 'POST' });
      await loadPage('community'); return;
    }
    if (action === 'community-share') {
      const url = `${location.origin}/community/post/${encodeURIComponent(button.dataset.id)}`;
      if (navigator.share) await navigator.share({ title: 'ReadAgora Community', url }).catch(() => undefined);
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); button.querySelector('span').textContent = 'Link copied'; }
      return;
    }
    if (action === 'community-follow') {
      if (!state.session) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
      await api(`/users/${encodeURIComponent(button.dataset.id)}/follow`, { method: 'POST' });
      button.textContent = 'Following'; button.disabled = true; return;
    }
    if (action === 'new-story') { app.insertAdjacentHTML('beforeend', newStoryModal()); bind(); return; }
    if (action === 'close-modal') { button.closest('.modal-backdrop')?.remove(); return; }
    if (action === 'signout') { await api('/auth/signout', { method: 'POST' }).catch(() => undefined); saveSession(null); state.user = null; navigate('/'); return; }
    if (action === 'unsave') { await api(`/bookmarks/story/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' }); await loadPage('library'); return; }
    if (action === 'mark-read') { await api(`/notifications/${encodeURIComponent(button.dataset.id)}/read`, { method: 'POST' }); await loadPage('profile-inbox'); return; }
    if (action === 'mark-all-read') { await api('/notifications/read-all', { method: 'POST' }); await loadPage('profile-inbox'); return; }
    if (action === 'unblock-user') { await api(`/users/${encodeURIComponent(button.dataset.id)}/block`, { method: 'DELETE' }); await loadPage('profile-blocked'); return; }
    if (action === 'post-like' || action === 'post-save') {
      const kind = action === 'post-like' ? 'like' : 'save'; const enabled = button.dataset.enabled === 'true';
      await api(`/community/posts/${encodeURIComponent(button.dataset.id)}/${kind}`, { method: enabled ? 'DELETE' : 'POST' });
      await loadPage(state.page === 'community-post' ? 'community-post' : 'community', button.dataset.id); return;
    }
    if (action === 'chapter-status') {
      const storyId = button.dataset.story || button.closest('details')?.querySelector('[name="story_id"]')?.value;
      await api(`/chapters/${encodeURIComponent(button.dataset.id)}/status`, { method: 'PATCH', body: { status: button.dataset.status } });
      await loadPage('manage-story', storyId); return;
    }
    if (action === 'story-status') { await api(`/stories/${encodeURIComponent(button.dataset.id)}`, { method: 'PATCH', body: { status: button.dataset.status } }); await loadPage('manage-story', button.dataset.id); return; }
    if (action === 'save-chapter') { await saveChapterDraft(); return; }
    if (action === 'publish-chapter') { if (!await saveChapterDraft()) return; await api(`/chapters/${encodeURIComponent(button.dataset.id)}/status`, { method: 'PATCH', body: { status: button.dataset.status } }); await loadPage('chapter-editor', { storyId: state.pageData.story.id, chapterId: button.dataset.id }); return; }
    if (action === 'quick-new-chapter') { if (!await saveChapterDraft()) return; const storyId = button.dataset.id; const story = state.pageData.story; const isComic = story.content_type === 'comic'; const chapter = await api(`/stories/${encodeURIComponent(storyId)}/chapters`, { method: 'POST', body: { title: `Chapter ${(state.pageData.chapters || []).length + 1}`, content: isComic ? '' : '<p></p>', content_type: story.content_type || 'text', has_text: !isComic, has_comic: isComic, status: 'draft' } }); navigate(`/workroom/story/${encodeURIComponent(storyId)}/chapter/${encodeURIComponent(chapter.id)}`); return; }
    if (action === 'delete-panel') { await api(`/panels/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' }); await loadPage('chapter-editor', { storyId: state.pageData.story.id, chapterId: state.pageData.chapter.id }); return; }
    if (action === 'import-remove' || action === 'import-move' || action === 'import-commit' || action === 'import-cancel') {
      const job = state.workroomImport; const storyId = state.pageData?.story?.id;
      if (!job?.preview || !job.importId || !storyId) return;
      job.preview.chapters = job.preview.chapters.map((chapter,index) => ({ ...chapter, title: app.querySelector(`[data-import-title="${index}"]`)?.value.trim() || chapter.title }));
      if (action === 'import-remove') job.preview.chapters.splice(Number(button.dataset.index), 1);
      if (action === 'import-move') { const index = Number(button.dataset.index); const target = index + Number(button.dataset.direction); [job.preview.chapters[index], job.preview.chapters[target]] = [job.preview.chapters[target], job.preview.chapters[index]]; }
      if (action === 'import-cancel') { await api(`/imports/${encodeURIComponent(job.importId)}`, { method: 'DELETE' }).catch(() => undefined); state.workroomImport = null; await loadPage('manage-story', storyId); return; }
      if (action === 'import-commit') { const chapters = job.preview.chapters.map((chapter,index) => ({ title: chapter.title.trim(), html: chapter.html || '', order: index + 1 })).filter(chapter => chapter.title); if (!chapters.length) throw new Error('Keep at least one chapter with a title.'); await api(`/imports/${encodeURIComponent(job.importId)}/commit`, { method: 'POST', body: { chapters } }); state.workroomImport = null; await loadPage('manage-story', storyId); return; }
      render(); return;
    }
    if (action === 'follow') {
      const enabled = button.dataset.enabled === 'true'; await api(`/users/${encodeURIComponent(button.dataset.id)}/follow`, { method: enabled ? 'DELETE' : 'POST' });
      await loadPage('creator', state.pageData.user.username); return;
    }
  } catch (error) { state.pageError = error.message; render(); }
}

async function saveStory(storyId, button) {
  if (!state.session) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
  try {
    await api('/bookmarks', { method: 'POST', body: { story_id: storyId } });
    if (button) { button.textContent = 'Saved'; button.disabled = true; }
    else state.pageError = 'Story saved to your library.';
  } catch (error) { state.pageError = error.message; if (!button) render(); }
}

function openSearch(message = '') {
  if (!document.querySelector('.search-overlay')) document.body.insertAdjacentHTML('beforeend', searchResults());
  const overlay = document.querySelector('.search-overlay');
  overlay.classList.add('visible');
  const results = overlay.querySelector('#search-results');
  results.innerHTML = message ? `<p>${esc(message)}</p>` : '<p>Start typing to explore ReadAgora.</p>';
  const input = overlay.querySelector('#overlay-search'); input.focus();
  input.addEventListener('input', () => searchStories(input.value));
  input.addEventListener('keydown', event => { if (event.key === 'Escape') overlay.remove(); });
  overlay.querySelector('.close-search').addEventListener('click', () => overlay.remove());
}

async function searchStories(query) {
  const results = document.querySelector('#search-results');
  if (!results || !query.trim()) { if (results) results.innerHTML = '<p>Start typing to explore ReadAgora.</p>'; return; }
  results.innerHTML = '<p>Searching…</p>';
  try {
    const stories = await api(`/search?q=${encodeURIComponent(query.trim())}`);
    results.innerHTML = stories?.length ? stories.slice(0, 8).map(story => `<a class="search-hit" href="/story/${encodeURIComponent(story.id)}" data-result-link>${image(story.cover_url, story.title)}<span><b>${esc(story.title)}</b><small>${esc(author(story))} · ${esc(story.genre || 'Original')}</small></span><i>↗</i></a>`).join('') : '<p>No stories found. Try another title or genre.</p>';
    results.querySelectorAll('[data-result-link]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); document.querySelector('.search-overlay')?.remove(); navigate(link.getAttribute('href')); }));
  } catch (error) { results.innerHTML = `<p>${esc(error.message)}</p>`; }
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
  else if (delta > 3) header?.classList.add('is-hidden');
  state.readerLastScrollY = currentY;
  clearTimeout(state.readerScrollTimer);
  state.readerScrollTimer = window.setTimeout(saveReaderPosition, 300);
}, { passive: true });

window.addEventListener('pagehide', saveReaderPosition);
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
