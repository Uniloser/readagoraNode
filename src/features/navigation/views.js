function navigationSection(pathname) {
  const section = pathname.split('/')[1] || '';
  if (['discover', 'discovery', 'feed', 'story', 'read', 'reader', 'creator', 'user'].includes(section)) return '';
  if (['write', 'create'].includes(section)) return 'workroom';
  if (section === 'account') return 'profile';
  return section;
}

export function createNavigationViews({ state, esc, icon }) {
  function updateAccountControl() {
    const accountControl = document.querySelector('.topbar .account-chip');
    if (!accountControl || !state.session) return;
    const authUser = state.session.user || {};
    const userMetadata = authUser.user_metadata || {};
    const avatarUrl = state.user?.avatar_url || authUser.avatar_url || userMetadata.avatar_url || userMetadata.picture;
    const accountName = state.user?.display_name || state.user?.username || userMetadata.display_name || userMetadata.username || 'Account';
    accountControl.setAttribute('aria-label', `Open profile for ${accountName}`);
    accountControl.setAttribute('title', 'Open profile');
    accountControl.innerHTML = `${avatarUrl ? `<img class="account-avatar" src="${esc(avatarUrl)}" alt=""/>` : icon('profile', 'account-icon')}<span>Account</span>`;
  }

  function header() {
    const current = navigationSection(location.pathname);
    const link = (path, name, label) => {
      const active = current === path.replace(/^\//, '') || (!current && !path.slice(1));
      return `<a class="${active ? 'active' : ''}" href="${path}" data-link ${active ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span></a>`;
    };
    const lightTheme = document.documentElement.dataset.theme === 'light';
    const authUser = state.session?.user || {};
    const userMetadata = authUser.user_metadata || {};
    const avatarUrl = state.user?.avatar_url || authUser.avatar_url || userMetadata.avatar_url || userMetadata.picture;
    const accountName = state.user?.display_name || state.user?.username || userMetadata.display_name || userMetadata.username || 'Account';
    const accountControl = state.session
      ? `<button class="account-chip" data-action="profile" aria-label="Open profile for ${esc(accountName)}" title="Open profile">${avatarUrl ? `<img class="account-avatar" src="${esc(avatarUrl)}" alt=""/>` : icon('profile', 'account-icon')}<span>Account</span></button>`
      : `<a class="account-chip" href="/login" data-link aria-label="Sign in" title="Sign in">${icon('profile', 'account-icon')}<span>Sign in</span></a>`;
    const writeAction = state.session ? '<a class="header-write" href="/workroom" data-link>Write</a>' : '';
    return `<header class="topbar"><a class="brand" href="/" data-link><img class="brand-image" src="/assets/mark.png" alt=""/><span>readagora</span></a><nav class="main-nav" aria-label="Main navigation">${link('/', 'discover', 'Discover')}${link('/library', 'library', 'Library')}${link('/workroom', 'workroom', 'Workroom')}${link('/community', 'community', 'Community')}${link('/events', 'events', 'Events')}${link('/profile', 'profile', 'Profile')}</nav><div class="header-actions">${writeAction}<button class="icon-button site-theme-toggle" data-action="site-theme" aria-label="Switch to ${lightTheme ? 'dark' : 'light'} theme" title="Switch to ${lightTheme ? 'dark' : 'light'} theme">${icon(lightTheme ? 'moon' : 'sun', 'header-icon')}</button><button class="icon-button search-toggle" aria-label="Search stories" title="Search">${icon('search', 'header-icon')}</button>${accountControl}</div></header>`;
  }

  function footer() {
    return `<footer class="site-footer"><a class="brand" href="/" data-link><img class="brand-image" src="/assets/mark.png" alt=""/><span>readagora</span></a><p>Stories stay with you.</p><span>Made for readers and the people who create their next world. <a href="/download">Get the Android app</a></span></footer>`;
  }

  function mobileTabs() {
    const current = navigationSection(location.pathname);
    const items = [['/', 'discover', 'Discover'], ['/library', 'library', 'Library'], ['/workroom', 'workroom', 'Workroom'], ['/community', 'community', 'Community'], ['/events', 'events', 'Events']];
    return `<nav class="mobile-tabs" aria-label="Main navigation">${items.map(([path, name, label]) => { const active = current === path.slice(1) || (!current && path === '/'); return `<a class="${active ? 'active' : ''}" href="${path}" data-link ${active ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span></a>`; }).join('')}</nav>`;
  }

  return { header, footer, mobileTabs, updateAccountControl };
}
