import { setDocumentTitle } from '../lib/ui/page-title.js';
import { enhancePageLandmarks } from '../lib/ui/page-landmarks.js';

export function createPageRenderer(deps) {
  const { state, app, currentPathname, bind, initSponsorFlagAnimation, initSponsorAdRotation, loadHome, header, footer, mobileTabs, readerPage, storyPage, chapterEditorView, manuscriptImportView, pageFrame, authPage, authLandingPage, searchPage, libraryView, communityView, eventsView, renderChampionReveal, renderCreatorGuide, workroomView, authorCenterView, creatorCenterView, authorAnalyticsView, promotionsView, reportView, moderationView, coinsWalletView, profileSettingsView, profileBalanceView, rewardsView, supportView, alphaPerksView, profileTopUpView, profileSubscriptionView, profileInboxView, profileBlockedView, accountDeletionPage, policyPage, termsPage, publicProfileView, communityPostView, home, discoveryStories, storyCard, esc } = deps;

  function render() {
    const path = currentPathname();
    setDocumentTitle(path, state);
    if (path.startsWith('/read/')) app.innerHTML = readerPage();
    else if (path.startsWith('/story/')) app.innerHTML = storyPage();
    else if (/^\/workroom\/story\/[^/]+\/chapter\/[^/]+$/.test(path)) app.innerHTML = pageFrame('Chapter editor', 'WORKROOM', chapterEditorView());
    else if (/^\/workroom\/story\/[^/]+\/import$/.test(path)) app.innerHTML = pageFrame('Import manuscript', 'WORKROOM', manuscriptImportView());
    else if (path === '/auth/callback') app.innerHTML = '<main class="auth-page"><section class="auth-callback-card" aria-live="polite"><span class="eyebrow">SECURE SIGN-IN</span><h1>Completing sign-in</h1><p>Connecting your ReadAgora account. This will only take a moment.</p><span class="route-loading-indicator" aria-hidden="true"></span></section></main>';
    else if (path === '/auth/intent') app.innerHTML = authLandingPage();
    else if (path === '/login' || path === '/signup' || path === '/forgot-password' || path === '/reset-password') app.innerHTML = authPage(path.slice(1));
    else if (path === '/search') app.innerHTML = searchPage();
    else if (path === '/discovery' || path.startsWith('/discovery/')) app.innerHTML = discoverySectionPage();
    else if (path === '/library') app.innerHTML = pageFrame('Your library', 'LIBRARY', `<div class="wide-page-layout library-page-layout"><div class="wide-page-main">${libraryView()}</div></div>`);
    else if (path === '/community') app.innerHTML = pageFrame('', '', communityView());
    else if (path === '/events') app.innerHTML = `${header()}<main class="workspace events-workspace">${eventsView()}</main>${state.championRevealOpen ? renderChampionReveal(state.pageData?.champion) : ''}${footer()}${mobileTabs()}`;
    else if (path === '/creator') app.innerHTML = `${header()}${renderCreatorGuide(state, esc)}${footer()}${mobileTabs()}`;
    else if (path === '/workroom') app.innerHTML = pageFrame('Workroom', 'YOUR CREATOR SPACE', workroomView());
    else if (path.startsWith('/workroom/story/')) app.innerHTML = pageFrame('Manage story', 'WORKROOM', deps.manageStoryView());
    else if (path === '/profile') app.innerHTML = pageFrame('Profile', 'ACCOUNT', `<div class="wide-page-layout profile-layout"><div class="wide-page-main">${deps.profileDashboardView()}</div></div>`);
    else if (path === '/profile/author-center') app.innerHTML = pageFrame('Author Center', 'GROW & UNDERSTAND', authorCenterView());
    else if (path === '/profile/author-analytics' || path === '/profile/analytics') app.innerHTML = pageFrame('Author Analytics', 'CREATOR INSIGHTS', authorAnalyticsView());
    else if (path === '/profile/creator-center') app.innerHTML = pageFrame('Creator Center', 'YOUR CREATOR SPACE', creatorCenterView(state, esc));
    else if (path === '/profile/promotions') app.innerHTML = pageFrame('Promotions', 'CREATOR TOOLS', promotionsView());
    else if (path === '/profile/report') app.innerHTML = pageFrame('Report a problem', 'SUPPORT & SAFETY', reportView());
    else if (path === '/profile/moderation') app.innerHTML = pageFrame('Moderation queue', 'TRUST & SAFETY', moderationView());
    else if (path === '/profile/agora-coins') app.innerHTML = pageFrame('Agora Coins', 'YOUR WALLET', coinsWalletView());
    else if (path === '/profile/subscription') app.innerHTML = pageFrame('ReadAgora Premium', 'ACCOUNT & SUPPORT', profileSubscriptionView());
    else if (path === '/profile/top-up') app.innerHTML = pageFrame('Gem wallet', 'ACCOUNT & SUPPORT', profileTopUpView());
    else if (path === '/profile/settings') app.innerHTML = pageFrame('Settings', 'PROFILE & ACCOUNT', profileSettingsView());
    else if (path === '/profile/balance') app.innerHTML = pageFrame('Gems & achievements', 'YOUR BALANCE', profileBalanceView());
    else if (path === '/profile/rewards') app.innerHTML = pageFrame('Earn rewards', 'READ, CREATE & GROW', rewardsView());
    else if (path === '/profile/alpha-perks') app.innerHTML = pageFrame('Alpha member rewards', 'FOUNDING MEMBER', alphaPerksView());
    else if (path === '/profile/exchange') app.innerHTML = pageFrame('Gem rewards', 'READ, CREATE & GROW', rewardsView());
    else if (path === '/profile/service') app.innerHTML = pageFrame('Help & support', 'ACCOUNT & SUPPORT', supportView());
    else if (path === '/profile/inbox') app.innerHTML = pageFrame('Inbox', 'YOUR UPDATES', profileInboxView());
    else if (path === '/profile/blocked') app.innerHTML = pageFrame('Blocked users', 'SUPPORT & SAFETY', profileBlockedView());
    else if (path === '/account-deletion' || path === '/delete-account') app.innerHTML = accountDeletionPage();
    else if (path.startsWith('/profile/')) app.innerHTML = `${header()}<main class="workspace empty-state"><span class="eyebrow">ACCOUNT / PAGE NOT FOUND</span><h1>We could not find that account page</h1><p>Choose an option from your profile to continue.</p><a class="primary-button" href="/profile" data-link>Return to Profile</a></main>${footer()}${mobileTabs()}`;
    else if (path === '/privacy') app.innerHTML = policyPage('privacy');
    else if (path === '/terms') app.innerHTML = termsPage();
    else if (path.startsWith('/creator/')) app.innerHTML = pageFrame('Creator profile', 'CREATOR', publicProfileView());
    else if (path.startsWith('/community/post/')) app.innerHTML = pageFrame('Community post', 'COMMUNITY', communityPostView());
    else if (path === '/') app.innerHTML = home();
    else app.innerHTML = `${header()}<main class="workspace empty-state"><span class="eyebrow">READAGORA / PAGE NOT FOUND</span><h1>We couldn’t find that page</h1><p>The link may be out of date. Browse stories or return to your profile.</p><a class="primary-button" href="/" data-link>Explore stories</a></main>${footer()}${mobileTabs()}`;
    enhancePageLandmarks(app, document.title.split(/\s[|·]\s/)[0]);
    bind();
    if (path.startsWith('/workroom/story/') && new URLSearchParams(location.search).get('newChapter') === '1') {
      const titleInput = app.querySelector('[data-form="new-chapter"] input[name="title"]');
      if (titleInput) {
        const url = new URL(location.href);
        url.searchParams.delete('newChapter');
        history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        titleInput.focus({ preventScroll: true });
        titleInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
    if (path === '/profile/inbox') {
      const notificationId = new URLSearchParams(location.search).get('notificationId');
      const notification = notificationId && [...app.querySelectorAll('[data-notification-id]')].find(item => item.dataset.notificationId === notificationId);
      notification?.scrollIntoView({ block: 'center' });
    }
    initSponsorFlagAnimation();
    initSponsorAdRotation();
    if (path === '/' && !state.homeLoaded && !state.loading && !state.error) loadHome();
  }

  function discoverySectionPage() {
    const section = state.discoverySection || 'all';
    const labels = { all: ['All stories', 'Every world available to read on ReadAgora.'], for_you: ['For you', 'Stories selected for your reading journey.'], trending: ['Trending now', 'Stories readers are enjoying right now.'], rising: ['New & rising', 'Fresh stories gaining readers.'], recently_updated: ['Recently updated', 'The latest chapters from ReadAgora creators.'], because_you_read: ['Because you read', 'More stories to explore.'], hidden_gems: ['Hidden gems', 'Stories worth discovering.'], genre: ['Browse by genre', 'Explore stories across genres.'], ai_generated: ['AI stories', 'Fully AI-generated stories, clearly labeled.'] };
    const [title, description] = labels[section] || labels.all;
    if (state.loading) return `${header()}<main class="workspace"><div class="page-loading" role="status">Finding stories…</div></main>${footer()}${mobileTabs()}`;
    if (state.error) return `${header()}<main class="workspace"><section class="empty-panel" role="alert"><h2>Stories could not be loaded</h2><p>${esc(state.error)}</p><button class="outline-button" data-retry>Try again</button></section></main>${footer()}${mobileTabs()}`;
    let stories = [];
    if (section === 'all') stories = [...new Map(state.shelves.flatMap(shelf => shelf.stories || []).map(story => [story.id, story])).values()];
    else if (['genre', 'hidden_gems', 'because_you_read'].includes(section)) stories = state.shelves.find(shelf => shelf.type === section)?.stories || [];
    else if (section === 'trending') stories = state.rankingLists.hot || [];
    else if (section === 'rising') stories = state.rankingLists.rising || [];
    else if (section === 'recently_updated') stories = state.shelves.find(shelf => shelf.type === 'recently_updated')?.stories || [];
    else if (section === 'for_you') stories = state.shelves.find(shelf => shelf.type === 'for_you')?.stories || [];
    else if (section === 'ai_generated') stories = state.shelves.find(shelf => shelf.type === 'ai_generated')?.stories || [];
    const term = new URLSearchParams(location.search).get('genre')?.toLocaleLowerCase();
    if (term) stories = stories.filter(story => story.genre?.toLocaleLowerCase() === term);
    return `${header()}<main class="workspace discovery-section-page"><a class="back-link" href="/" data-link>← Back to discovery</a><section class="screen-heading"><span class="eyebrow">READAGORA / DISCOVERY</span><h1>${esc(term ? `${term.charAt(0).toUpperCase()}${term.slice(1)} stories` : title)}</h1><p>${esc(description)}</p></section>${stories.length ? `<div class="library-grid">${stories.map(story => storyCard(story)).join('')}</div>` : '<section class="empty-panel"><h2>No stories in this section yet</h2><p>Try another discovery shelf or come back later.</p><a class="outline-button" href="/discovery/all" data-link>Browse all stories</a></section>'}</main>${footer()}${mobileTabs()}`;
  }

  return { render };
}
