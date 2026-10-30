export function createProfileRewardsViews(deps) {
  const { state, esc, icon, termsField } = deps;

  function profileBalanceView() {
    const { wallet, achievements = [], transactions = [], profileBalanceErrors = {} } = state.pageData || {};
    if (state.pageLoading) return '<div class="page-loading" role="status">Loading your wallet...</div>';
    if (!state.pageData && state.pageError) return `<div class="empty-panel" role="alert"><h2>Your wallet could not load</h2><p>${esc(state.pageError)}</p><button class="outline-button" data-action="profile-balance-retry">Try again</button></div>`;
    const retry = '<button type="button" class="subtle-button" data-action="profile-balance-retry">Try again</button>';
    const errors = Object.entries(profileBalanceErrors).filter(([, message]) => message).map(([section, message]) => `${section}: ${message}`);
    const notice = errors.length ? `<div class="notice error-notice" role="alert">Some wallet information could not load: ${esc(errors.join('; '))} ${retry}</div>` : '';
    const achievementsContent = profileBalanceErrors.achievements
      ? '<p class="muted-copy">Achievement data could not load.</p>'
      : achievements.length
        ? `<div class="profile-achievements">${achievements.map(item => `<article class="achievement-row"><span class="achievement-mark">${item.unlocked_at ? '&#10022;' : '&#9675;'}</span><span><b>${esc(item.title || item.name || 'Achievement')}</b><small>${esc(item.description || '')}</small></span><span class="achievement-status">${item.unlocked_at ? 'Unlocked' : 'In progress'}</span></article>`).join('')}</div>`
        : '<p class="muted-copy">No achievements to show yet. Keep reading to make progress.</p>';
    const activityContent = profileBalanceErrors.transactions
      ? '<p class="muted-copy">Gem history could not load.</p>'
      : transactions.length
        ? `<div class="profile-transaction-list">${transactions.map(item => `<article><span><b>${esc(item.reason || 'Gem activity')}</b><small>${item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</small></span><strong class="${Number(item.amount) >= 0 ? 'positive-amount' : 'negative-amount'}">${Number(item.amount) > 0 ? '+' : ''}${Number(item.amount || 0).toLocaleString()}</strong></article>`).join('')}</div>`
        : '<p class="muted-copy">No wallet activity yet.</p>';
    return `${notice}<a class="back-link" href="/profile" data-link>&#8592; Back to profile</a><section class="profile-balance-card balance-page-card"><div><span class="eyebrow">READAGORA WALLET</span><h2>${profileBalanceErrors.wallet ? '&#8212;' : Number(wallet?.balance || 0).toLocaleString()} <small>Gems</small></h2><p>Use Gems for supported in-app features.</p></div></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">YOUR PROGRESS</span><h2>Achievements</h2></div><span>${profileBalanceErrors.achievements ? '&#8212;' : achievements.filter(item => item.unlocked_at).length} unlocked</span></div>${achievementsContent}</section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">RECENT ACTIVITY</span><h2>Gem history</h2></div></div>${activityContent}</section>`;
  }

  function rewardsView() {
    const { wallet, achievements = [], challenges = [], profileRewardErrors = {} } = state.pageData || {};
    if (state.pageLoading) return '<div class="page-loading" role="status">Loading your rewards...</div>';
    if (!state.pageData && state.pageError) return `<section class="empty-panel" role="alert"><h2>Rewards are unavailable</h2><p>${esc(state.pageError)}</p><button class="outline-button" data-action="rewards-retry">Try again</button></section>`;
    const errors = Object.entries(profileRewardErrors).filter(([, message]) => message).map(([section, message]) => `${section}: ${message}`);
    const retry = '<button type="button" class="subtle-button" data-action="rewards-retry">Try again</button>';
    const notice = errors.length ? `<div class="notice error-notice" role="alert">Some reward information could not load: ${esc(errors.join('; '))} ${retry}</div>` : '';
    const unlocked = achievements.filter(item => item.unlocked_at).length;
    const achievementContent = profileRewardErrors.achievements
      ? '<p class="muted-copy">Achievement data could not load.</p>'
      : achievements.length
        ? `<div class="profile-achievements">${achievements.map(item => `<article class="achievement-row"><span class="achievement-mark">${item.unlocked_at ? '&#10022;' : '&#9675;'}</span><span><b>${esc(item.title || item.name || 'Achievement')}</b><small>${esc(item.description || '')}${item.gem_prize ? ` ? ${Number(item.gem_prize)} Gems` : ''}</small></span><span class="achievement-status">${item.unlocked_at ? 'Unlocked' : 'In progress'}</span></article>`).join('')}</div>`
        : '<p class="muted-copy">Your milestones will appear here as you read, write, and take part.</p>';
    const challengeContent = profileRewardErrors.challenges
      ? '<p class="muted-copy">Challenge data could not load.</p>'
      : challenges.length
        ? `<div class="profile-achievements">${challenges.map(item => { const progress = Math.max(0, Number(item.progress) || 0); const goal = Math.max(1, Number(item.goal_amount) || 1); const percent = Math.min(100, Math.round(progress / goal * 100)); return `<article class="achievement-row"><span class="achievement-mark">&#9678;</span><span><b>${esc(item.title || 'Challenge')}</b><small>${esc(item.description || '')} · ${progress}/${goal} · ${Number(item.gem_prize || 0)} Gems</small><span class="author-retention-track"><i style="width:${percent}%"></i></span></span><span class="achievement-status">${percent}%</span></article>`; }).join('')}</div>`
        : '<p class="muted-copy">There are no active challenges right now. Check back as new activities become available.</p>';
    return `${notice}<a class="back-link" href="/profile" data-link>&#8592; Back to profile</a><section class="profile-balance-card balance-page-card"><div><span class="eyebrow">YOUR REWARDS</span><h2>${profileRewardErrors.wallet ? '&#8212;' : Number(wallet?.balance || 0).toLocaleString()} <small>Gems</small></h2><p>${profileRewardErrors.achievements ? '&#8212;' : `${unlocked} of ${achievements.length} achievements unlocked`}</p></div><a href="/profile/balance" data-link>Wallet details &#8594;</a></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">MILESTONES</span><h2>Achievements</h2></div></div>${achievementContent}</section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">CURRENT ACTIVITIES</span><h2>Challenges</h2></div></div>${challengeContent}</section><section class="panel"><span class="eyebrow">HOW REWARDS WORK</span><h2>Gems are in-app rewards</h2><p>Achievements and challenges add Gems directly to your wallet. Gems are not cash and cannot be withdrawn or exchanged for money.</p></section>`;
  }

  function profileTopUpView() {
    if (state.pageLoading) return '<div class="page-loading" role="status">Checking your Gem balance...</div>';
    const { wallet, walletError } = state.pageData || {};
    const retry = '<button type="button" class="subtle-button" data-action="profile-top-up-retry">Try again</button>';
    const balance = walletError
      ? `<div class="notice error-notice" role="alert">Your Gem balance could not load: ${esc(walletError)} ${retry}</div>`
      : `<section class="profile-balance-card balance-page-card"><div><span class="eyebrow">YOUR GEM BALANCE</span><h2>${Number(wallet?.balance || 0).toLocaleString()} <small>Gems</small></h2><p>Gems earned on your ReadAgora account.</p></div><a href="/profile/balance" data-link>View activity &#8594;</a></section>`;
    return `<a class="back-link" href="/profile" data-link>&#8592; Back to profile</a>${balance}<section class="panel"><span class="eyebrow">GEM WALLET</span><h2>Earn Gems through ReadAgora</h2><p>Gems are rewards for achievements, challenges, and creator activity. Gem purchases are not available on the web, and no payment will be taken here.</p><div class="profile-balance-actions"><a class="primary-button" href="/profile/rewards" data-link>View ways to earn Gems</a><a class="outline-button" href="/profile/balance" data-link>See Gem history</a></div></section><section class="panel"><span class="eyebrow">SUPPORT STORIES</span><h2>Agora Coins are separate</h2><p>Agora Coins can unlock premium chapters and support writers. Coin purchases use mobile app store checkout.</p><a class="outline-button" href="/profile/agora-coins" data-link>View Agora Coins</a></section>`;
  }

  function profileSubscriptionView() {
    if (state.pageLoading) return '<div class="page-loading" role="status">Checking your subscription...</div>';
    const { subscription, subscriptionError } = state.pageData || {};
    const status = subscription?.status;
    const date = subscription?.current_period_end && !Number.isNaN(Date.parse(subscription.current_period_end))
      ? new Date(subscription.current_period_end).toLocaleDateString()
      : '';
    const statusContent = subscriptionError
      ? `<div class="notice error-notice" role="alert">Subscription status could not be checked: ${esc(subscriptionError)} <button type="button" class="subtle-button" data-action="profile-subscription-retry">Try again</button></div>`
      : subscription
        ? `<div class="profile-balance-card"><div><span class="eyebrow">CURRENT PLAN</span><h2>${status === 'GRACE_PERIOD' ? 'Billing issue' : 'Premium is active'}</h2><p>${subscription.cancel_at_period_end ? `Your plan is set to end${date ? ` on ${date}` : ''}.` : date ? `Current period ends ${date}.` : 'Your account has an active Premium entitlement.'}</p><span class="status-pill">${esc(String(subscription.plan || 'Premium').replaceAll('_', ' '))}</span></div></div>`
        : '<div class="empty-panel"><h3>No active subscription recorded</h3><p>If you subscribed in the mobile app, check your store account and make sure it uses this ReadAgora login.</p></div>';
    return `<a class="back-link" href="/profile" data-link>&#8592; Back to profile</a>${statusContent}<section class="panel"><span class="eyebrow">READAGORA PREMIUM</span><h2>Manage your plan in the mobile app store</h2><p>Web purchases, restores, and billing management are not configured. Premium plans are purchased and managed through Apple App Store or Google Play on the account used to subscribe.</p><p>Agora Coins are a separate product. You can use them to unlock individual premium chapters from their story pages.</p><div class="profile-balance-actions"><a class="primary-button" href="/" data-link>Continue reading</a><a class="outline-button" href="/profile/agora-coins" data-link>View Agora Coins</a></div></section>`;
  }

  function alphaPerksView() {
    if (state.pageLoading) return '<div class="page-loading" role="status">Checking your Alpha reward...</div>';
    if (!state.pageData && state.pageError) return `<section class="empty-panel" role="alert"><h2>Your Alpha reward could not load</h2><p>${esc(state.pageError)}</p><button class="outline-button" data-action="alpha-retry">Try again</button></section>`;
    const { transactions = [] } = state.pageData || {};
    const claimed = transactions.some(item => item.reason === 'alpha_welcome_grant');
    return `<a class="back-link" href="/profile" data-link>← Back to profile</a><section class="panel"><span class="eyebrow">FOUNDING ALPHA MEMBER</span><h2>Your ReadAgora welcome reward</h2><p>Collect the 100 Gem welcome grant for your Alpha account. The server applies this reward once to your account.</p>${claimed ? '<div class="notice">Your Alpha welcome reward has already been added to your Gem history.</div>' : '<button type="button" class="primary-button" data-action="claim-alpha">Collect 100 Gems</button>'}</section><section class="panel"><h2>Gems and activity</h2><a class="text-link" href="/profile/balance" data-link>View wallet history →</a></section>`;
  }

  function coinsWalletView() {
    if (state.pageLoading) return '<div class="page-loading" role="status">Loading your Agora Coins wallet…</div>';
    if (!state.pageData && state.pageError) return `<div class="empty-panel" role="alert"><h2>Wallet unavailable</h2><p>${esc(state.pageError)}</p><button class="outline-button" data-action="coins-retry">Try again</button></div>`;
    const { wallet = {}, products = [], history = [] } = state.pageData || {};
    return `<a class="back-link" href="/profile" data-link>← Back to profile</a><section class="profile-balance-card balance-page-card"><div><span class="eyebrow">AGORA COINS</span><h2>${Number(wallet.balance || 0).toLocaleString()} <small>coins</small></h2><p>${Number(wallet.lifetime_spent || 0).toLocaleString()} spent · ${Number(wallet.lifetime_purchased || 0).toLocaleString()} purchased</p></div></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">COIN PACKS</span><h2>Support the stories you love</h2></div></div>${products.length ? `<div class="coin-pack-list">${products.map(product => `<article><span><b>${Number(product.coins || 0).toLocaleString()} coins</b><small>${esc(product.display_name || product.product_id)}</small></span><span class="status-pill">Purchase in mobile app</span></article>`).join('')}</div>` : '<p class="muted-copy">Coin packs are not available right now.</p>'}<p class="muted-copy">Coin purchases use the mobile app store checkout. Your balance and completed transactions sync through your ReadAgora account.</p></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">WALLET ACTIVITY</span><h2>Recent coin history</h2></div></div>${history.length ? `<div class="profile-transaction-list">${history.map(item => `<article><span><b>${esc(String(item.type || 'Coin activity').replaceAll('_', ' '))}</b><small>${item.created_at && !Number.isNaN(Date.parse(item.created_at)) ? new Date(item.created_at).toLocaleString() : ''}</small></span><strong class="${Number(item.amount) >= 0 ? 'positive-amount' : 'negative-amount'}">${Number(item.amount) > 0 ? '+' : ''}${Number(item.amount || 0).toLocaleString()}</strong></article>`).join('')}</div>` : '<p class="muted-copy">No Agora Coin activity yet.</p>'}</section>`;
  }

  return { profileBalanceView, rewardsView, profileTopUpView, profileSubscriptionView, alphaPerksView, coinsWalletView };
}
