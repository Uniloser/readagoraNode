export function createProfileHomeViews(deps) {
  const { state, esc, icon, termsField } = deps;

function profileView() {
    const user = state.pageData?.user;
    if (!user) return '<div class="empty-panel">Profile not available.</div>';
    return `<section class="profile-panel"><div class="profile-avatar">${user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt=""/>` : esc((user.display_name || user.username || '?').slice(0,1).toUpperCase())}</div><div><span class="eyebrow">YOUR READAGORA PROFILE</span><h2>${esc(user.display_name || user.username)}</h2><p>@${esc(user.username)} · ${Number(state.pageData.followers?.count || 0).toLocaleString()} followers</p></div></section><section class="panel profile-edit"><h2>Profile details</h2><form data-form="profile"><label>Display name<input name="display_name" maxlength="60" value="${esc(user.display_name || '')}"/></label><label>Bio<textarea name="bio" maxlength="500">${esc(user.bio || '')}</textarea></label><div class="form-message" aria-live="polite"></div><button class="primary-button" type="submit">Save changes</button></form></section><section class="panel"><div class="panel-heading"><div><h2>Account</h2><p>Manage your ReadAgora account.</p></div><button class="outline-button" data-action="signout">Sign out</button></div><a class="text-link" href="/workroom" data-link>Open creator workroom →</a></section>`;
  }

  function profileDashboardView() {
    const { user, followers = { count: 0 }, stories = [], wallet, achievements = [], unread = { count: 0 } } = state.pageData || {};
    if (state.pageLoading) return '<div class="page-loading" role="status">Loading your profile...</div>';
    if (!state.pageData && state.pageError) return `<div class="empty-panel" role="alert"><h2>Your profile could not load</h2><p>${esc(state.pageError)}</p><button class="outline-button" data-action="profile-retry">Try again</button></div>`;
    if (!user) return '<div class="empty-panel">Profile not available.</div>';
    const errors = state.pageData?.profileErrors || {};
    const failedSections = Object.entries(errors).filter(([, message]) => message).map(([section, message]) => `${section}: ${message}`);
    const storyReads = errors.stories ? null : stories.reduce((sum, story) => sum + Number(story.view_count || 0), 0);
    const valueOrDash = (failed, value) => failed ? '&#8212;' : Number(value || 0).toLocaleString();
    const dataNotice = failedSections.length ? `<div class="notice error-notice" role="alert">Some account information could not load: ${esc(failedSections.join('; '))} <button type="button" class="subtle-button" data-action="profile-retry">Try again</button></div>` : '';
    const avatar = user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="Profile picture"/>` : esc((user.display_name || user.username || '?').slice(0, 1).toUpperCase());
    const items = [
      ['library', '/profile/balance', 'Gems', 'Your balance and milestones', (errors.wallet ? '&#8212;' : Number(wallet?.balance || 0).toLocaleString())],
      ['library', '/profile/agora-coins', 'Agora Coins', 'View balance, coin packs, and history', ''],
      ['library', '/profile/top-up', 'Gem wallet', 'Balance, earning options, and purchase availability', ''],
      ['library', '/profile/rewards', 'Earn Rewards', 'Track achievements and challenges', ''],
      ['library', '/profile/exchange', 'Exchange', 'Learn how rewards and Gems work', ''],
      ['profile', '/profile/service', 'Online Service', 'Contact ReadAgora support', ''],
      ['community', '/profile/inbox', 'Inbox', 'Replies and activity', errors.unread ? 'Unavailable' : unread.count ? `${unread.count} new` : ''],
      ['discover', '/library', 'Viewed stories', 'Continue reading where you left off', ''],
      ['workroom', '/profile/author-center', 'Author Center', 'Stories, analytics, and creator earnings', ''],
      ['workroom', '/profile/creator-center', 'Creator Center', 'Monetization status, earnings, analytics, and payouts', ''],
      ['workroom', '/profile/author-analytics', 'Analytics', 'Story performance and reader trends', ''],
      ['workroom', '/profile/promotions', 'Promotions', 'Reach more readers with your stories', ''],
      ['community', '/community', 'Community', 'Posts and discussions', ''],
      ['profile', '/profile/blocked', 'Blocked users', 'Manage blocked accounts', ''],
      ['profile', '/profile/report', 'Report a problem', 'Send a safety or technical report', ''],
      ['workroom', '/profile/settings', 'Settings', 'Profile, preferences, and account security', ''],
    ];
    if (user.is_alpha) items.splice(1, 0, ['profile', '/profile/alpha-perks', 'Alpha member rewards', 'Collect your founding member welcome Gems', '']);
    if (['moderator', 'admin'].includes(state.session?.user?.app_metadata?.role)) items.splice(6, 0, ['profile', '/profile/moderation', 'Moderation queue', 'Review open safety reports', '']);
    const quickPaths = new Set(['/profile/inbox', '/library', '/community']);
    const creatorPaths = new Set(['/profile/author-center', '/profile/creator-center', '/profile/author-analytics', '/profile/promotions']);
    const accountPaths = new Set(['/profile/service', '/profile/blocked', '/profile/report', '/profile/settings', '/profile/moderation']);
    const utilityRow = ([glyph, path, title, description, value]) => `<a class="profile-utility-row" href="${path}" data-link><span class="utility-icon">${icon(glyph)}</span><span class="utility-copy"><b>${title}</b><small>${description}</small></span>${value ? `<span class="utility-value">${value}</span>` : ''}${icon('chevron', 'utility-chevron')}</a>`;
    const groups = [
      ['Wallet & rewards', items.filter(item => !quickPaths.has(item[1]) && !creatorPaths.has(item[1]) && !accountPaths.has(item[1]))],
      ['Creator tools', items.filter(item => creatorPaths.has(item[1]))],
      ['Account & support', items.filter(item => accountPaths.has(item[1]))],
    ];
    const utilitiesMarkup = `<div class="profile-utility-list profile-quick-links">${items.filter(item => quickPaths.has(item[1])).map(utilityRow).join('')}</div><div class="profile-utility-groups">${groups.map(([title, links], index) => `<details class="profile-utility-group"><summary><span><b>${title}</b><small>${links.length} tools</small></span>${icon('chevron', 'utility-chevron')}</summary><div class="profile-utility-list">${links.map(utilityRow).join('')}${index === 2 ? `<button class="profile-utility-row signout-row" data-action="signout"><span class="utility-icon">${icon('profile')}</span><span class="utility-copy"><b>Sign out</b><small>Sign out from this device</small></span>${icon('chevron', 'utility-chevron')}</button>` : ''}</div></details>`).join('')}</div>`;
    return `${dataNotice}<section class="profile-dashboard-head"><div class="profile-avatar profile-avatar-large">${avatar}</div><div class="profile-dashboard-identity"><span class="eyebrow">YOUR READAGORA PROFILE</span><h2>${esc(user.display_name || user.username)}${user.is_alpha ? '<span class="alpha-chip">ALPHA</span>' : ''}</h2><p>@${esc(user.username)}</p><p class="profile-bio">${esc(user.bio || 'Add a short bio so readers can get to know you.')}</p></div><div class="profile-head-actions"><button class="outline-button" type="button" data-action="share-profile">Share profile</button><a class="outline-button" href="/creator/${encodeURIComponent(user.username)}" data-link>View profile</a><a class="primary-button" href="/profile/settings" data-link>Edit profile</a></div></section><div class="profile-metrics"><a href="/creator/${encodeURIComponent(user.username)}" data-link><b>${valueOrDash(errors.followers, followers.count)}</b><span>Followers</span></a><a href="/workroom" data-link><b>${valueOrDash(errors.stories, stories.length)}</b><span>Stories</span></a><a href="/workroom" data-link><b>${storyReads == null ? '&#8212;' : storyReads.toLocaleString()}</b><span>Total reads</span></a></div><section class="profile-balance-card"><div><span class="eyebrow">YOUR BALANCE</span><h2>${errors.wallet ? '&#8212;' : Number(wallet?.balance || 0).toLocaleString()} <small>Gems</small></h2><p>${errors.achievements ? '&#8212;' : achievements.filter(item => item.unlocked_at).length} achievements unlocked</p></div><div class="profile-balance-actions"><a class="outline-button" href="/profile/top-up" data-link>Top up</a><a href="/profile/balance" data-link>View details <span>→</span></a></div></section><section class="profile-promo-card"><div><span class="eyebrow">FOR READERS &amp; CREATORS</span><h2>Make your next chapter count</h2><p>Keep reading, share your work, and grow with ReadAgora.</p></div><a class="primary-button" href="/workroom" data-link>Explore creator tools <span>→</span></a></section><section class="profile-utilities"><div class="profile-section-heading"><div><span class="eyebrow">ACCOUNT &amp; MORE</span><h2>Your ReadAgora</h2></div><a href="/profile/settings" data-link>Settings ${icon('settings')}</a></div>${utilitiesMarkup}</section>`;
  }
  return { profileView, profileDashboardView };
}
