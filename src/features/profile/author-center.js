export function createAuthorCenterView({ state, esc }) {
  return function authorCenterView() {
    if (state.pageLoading) return '<div class="page-loading" role="status">Opening your Author Center...</div>';
    if (!state.pageData && state.pageError) return `<section class="empty-panel" role="alert"><h2>Author Center could not load</h2><p>${esc(state.pageError)}</p><button type="button" class="outline-button" data-action="author-center-retry">Try again</button></section>`;

    const data = state.pageData || {};
    const stories = Array.isArray(data.stories) ? data.stories : [];
    const errors = data.authorCenterErrors || {};
    const totalReads = stories.reduce((total, story) => total + (Number(story.view_count) || 0), 0);
    const published = stories.filter(story => story.status === 'published').length;
    const metric = (label, value) => `<article class="stat-card"><small>${label}</small><b>${value == null ? '—' : Number(value).toLocaleString()}</b></article>`;
    const errorNotice = Object.entries(errors).filter(([, message]) => message).map(([section, message]) => `${section}: ${message}`);
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const recentActivity = transactions.slice(0, 5).map(item => `<article class="profile-transaction-row"><span><b>${esc(String(item.reason || item.type || 'Gem activity').replaceAll('_', ' '))}</b><small>${item.created_at && !Number.isNaN(Date.parse(item.created_at)) ? new Date(item.created_at).toLocaleDateString() : ''}</small></span><strong>${Number(item.amount || 0) > 0 ? '+' : ''}${Number(item.amount || 0).toLocaleString()} Gems</strong></article>`).join('');
    const storyRows = stories.slice(0, 5).map(story => `<a class="author-center-story" href="/workroom/story/${encodeURIComponent(story.id)}" data-link><span><b>${esc(story.title || 'Untitled story')}</b><small>${esc(story.status || 'draft')} · Updated ${story.updated_at && !Number.isNaN(Date.parse(story.updated_at)) ? new Date(story.updated_at).toLocaleDateString() : 'recently'}</small></span><strong>${Number(story.view_count || 0).toLocaleString()} reads</strong><span aria-hidden="true">›</span></a>`).join('');

    return `${errorNotice.length ? `<div class="notice error-notice" role="alert">Some Author Center information could not load: ${errorNotice.map(esc).join('; ')} <button type="button" class="subtle-button" data-action="author-center-retry">Try again</button></div>` : ''}
      <section class="author-center-identity"><div><span class="eyebrow">GROW &amp; UNDERSTAND</span><h2>${esc(data.user?.display_name || data.user?.username || 'Your creator dashboard')}</h2><p>Your story performance, audience, and rewards in one place.</p></div><a class="primary-button" href="/workroom" data-link>Open Workroom</a></section>
      <div class="author-analytics-metrics">${metric('Reads', errors.stories ? null : totalReads)}${metric('Followers', errors.followers ? null : data.followers)}${metric('Published', errors.stories ? null : published)}${metric('Gems', errors.wallet ? null : data.wallet?.balance)}</div>
      <nav class="author-center-actions" aria-label="Creator tools"><a href="/profile/author-analytics" data-link><b>Analytics</b><span>Story performance and reader trends</span><i aria-hidden="true">›</i></a><a href="/profile/inbox" data-link><b>Community</b><span>Reader interactions and updates</span><i aria-hidden="true">›</i></a><a href="/profile/promotions" data-link><b>Promotions</b><span>Reach more readers with your stories</span><i aria-hidden="true">›</i></a></nav>
      <section class="panel"><div class="panel-heading"><div><span class="eyebrow">YOUR CATALOGUE</span><h2>Story performance</h2></div><a class="text-link" href="/workroom" data-link>Workroom →</a></div>${storyRows || '<div class="empty-panel"><h3>Your first story starts here</h3><p>Open the Workroom to create a story and begin building your catalogue.</p><a class="primary-button" href="/workroom" data-link>Create a story</a></div>'}</section>
      <section class="panel"><div class="panel-heading"><div><span class="eyebrow">YOUR REWARDS</span><h2>${errors.wallet ? 'Gem balance unavailable' : `${Number(data.wallet?.balance || 0).toLocaleString()} Gems available`}</h2></div><a class="text-link" href="/profile/balance" data-link>Gem details →</a></div>${recentActivity ? `<div class="profile-transaction-list">${recentActivity}</div>` : '<p class="muted-copy">Your recent Gem activity will appear here.</p>'}</section>`;
  };
}
