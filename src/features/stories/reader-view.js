import { authIntentHref } from '../auth/redirects.js';

export function createReaderViews(deps) {
  const { state, esc, icon, author, header, footer, mobileTabs, app, safeText } = deps;

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

  function chapterCommentsView() {
    const comments = Array.isArray(state.comments) ? state.comments : [];
    if (!comments.length) return '<p class="muted-copy">No comments yet. Start the conversation.</p>';
    const byId = new Map(comments.map(comment => [String(comment.id), comment]));
    const children = new Map();
    for (const comment of comments) {
      const parentId = String(comment.parent_comment_id || '');
      if (!parentId || !byId.has(parentId)) continue;
      if (!children.has(parentId)) children.set(parentId, []);
      children.get(parentId).push(comment);
    }
    const ordered = items => [...items].sort((a, b) => Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0));
    const expandedThreads = state.expandedCommentThreads ||= new Set();
    const expandedQuotes = state.expandedCommentQuotes ||= new Set();

    function replyComposer(comment) {
      const username = comment.user?.username || comment.user?.display_name || 'reader';
      return `<form class="comment-composer comment-reply-composer" data-form="chapter-comment"><input type="hidden" name="parent_comment_id" value="${esc(comment.id)}"/><input type="hidden" name="quote" value=""/><p class="comment-reply-context">Replying to <b>@${esc(username)}</b></p><label class="sr-only" for="reply-${esc(comment.id)}">Reply to ${esc(username)}</label><textarea id="reply-${esc(comment.id)}" name="text" rows="1" maxlength="2000" required placeholder="Write a reply…"></textarea><div class="comment-composer-actions"><button class="primary-button" type="submit" disabled>Post reply</button><button type="button" class="subtle-button" data-action="comment-cancel-reply">Cancel</button><div class="form-message" aria-live="polite"></div></div></form>`;
    }

    function renderComment(comment, depth, ancestors = new Set()) {
      const id = String(comment.id);
      if (ancestors.has(id)) return '';
      const nextAncestors = new Set(ancestors).add(id);
      const own = Boolean(state.session?.user?.id && (comment.user_id || comment.user?.id) === state.session.user.id);
      const quote = String(comment.quoted_text || comment.quote || '');
      const descendants = ordered(children.get(id) || []);
      const expanded = expandedThreads.has(id) || descendants.length <= 5;
      const visibleReplies = expanded ? descendants : descendants.slice(0, 5);
      const displayName = comment.user?.display_name || comment.user?.username || 'Reader';
      const username = comment.user?.username || displayName;
      const initials = [...String(displayName).trim()].slice(0, 1).join('').toUpperCase() || 'R';
      const avatarUrl = typeof comment.user?.avatar_url === 'string' && /^(https:\/\/|\/(?!\/))/i.test(comment.user.avatar_url)
        ? comment.user.avatar_url : '';
      const createdAt = Date.parse(comment.created_at || '');
      const ageMinutes = createdAt && !Number.isNaN(createdAt) ? (createdAt - Date.now()) / 60000 : null;
      const relativeTime = ageMinutes == null ? '' : (() => {
        const units = [[525600, 'year'], [43200, 'month'], [1440, 'day'], [60, 'hour'], [1, 'minute']];
        const [unitSize, unit] = units.find(([size]) => Math.abs(ageMinutes) >= size) || units.at(-1);
        return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(ageMinutes / unitSize), unit);
      })();
      const timestamp = relativeTime;
      const timeLabel = createdAt && !Number.isNaN(createdAt)
        ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(createdAt)
        : '';
      const quoteExpanded = expandedQuotes.has(id);
      const quoteMarkup = quote ? `<blockquote class="comment-quote ${quoteExpanded ? 'is-expanded' : ''}"><span>${esc(quote)}</span>${quote.length > 240 ? `<button type="button" data-action="comment-quote-expand" data-id="${esc(id)}" aria-expanded="${quoteExpanded}">${quoteExpanded ? 'Show less' : 'Show full passage'}</button>` : ''}</blockquote>` : '';
      const menu = state.session ? `<details class="comment-more"><summary aria-label="More options for ${esc(displayName)}’s comment" title="More options">···</summary><div class="comment-more-menu">${own ? `<button type="button" data-action="comment-edit" data-id="${esc(id)}">Edit comment</button><button type="button" data-action="comment-delete" data-id="${esc(id)}">Delete comment</button>` : `<a href="/profile/report?targetType=comment&id=${encodeURIComponent(id)}" data-link>Report comment</a>`}</div></details>` : '';
      const actions = state.session ? `<div class="comment-actions"><button type="button" data-action="comment-reply" data-id="${esc(id)}" aria-label="Reply to ${esc(displayName)}">Reply</button>${menu}</div>` : '';
      const form = state.replyToComment === id && state.session && !state.isOffline ? replyComposer(comment) : '';
      return `<div class="comment-thread" style="--comment-depth:${Math.min(depth, 3)};--comment-indent:${depth > 0 && depth <= 3 ? '1' : '0'}"><article class="comment" data-comment-id="${esc(id)}"><header class="comment-header"><span class="comment-avatar" aria-hidden="true">${avatarUrl ? `<img src="${esc(avatarUrl)}" alt="" loading="lazy"/>` : esc(initials)}</span><span class="comment-author">${esc(displayName)}</span>${comment.user?.username ? `<span class="comment-username">@${esc(username)}</span>` : ''}${timestamp ? `<time class="comment-time" datetime="${esc(new Date(createdAt).toISOString())}" title="${esc(timeLabel)}">${esc(relativeTime)}</time>` : ''}</header>${quoteMarkup}<p class="comment-text">${esc(comment.text)}</p>${actions}${form}</article>${descendants.length ? `<div class="comment-children" role="group" aria-label="Replies to ${esc(displayName)}">${visibleReplies.map(child => renderComment(child, depth + 1, nextAncestors)).join('')}${!expanded ? `<button class="comment-thread-toggle" type="button" data-action="comment-thread-toggle" data-id="${esc(id)}">View ${descendants.length - visibleReplies.length} more ${descendants.length - visibleReplies.length === 1 ? 'reply' : 'replies'}</button>` : descendants.length > 5 ? `<button class="comment-thread-toggle" type="button" data-action="comment-thread-toggle" data-id="${esc(id)}">Hide replies</button>` : ''}</div>` : ''}</div>`;
    }

    const roots = ordered(comments.filter(comment => !comment.parent_comment_id || !byId.has(String(comment.parent_comment_id))));
    return roots.map(comment => renderComment(comment, 0)).join('') || '<p class="muted-copy">No comments yet. Start the conversation.</p>';
  }

  function chapterCommentComposer() {
    if (!state.session || state.isOffline) return '';
    const quote = String(state.commentQuote || '');
    const quoteMarkup = quote ? `<blockquote class="comment-composer-quote"><span>Commenting on a passage</span><q>${esc(quote)}</q></blockquote>` : '';
    return `<form class="comment-composer" data-form="chapter-comment"><input type="hidden" name="parent_comment_id" value=""/><input type="hidden" name="quote" value="${esc(quote)}"/>${quoteMarkup}<label class="sr-only" for="chapter-comment-text">Join the discussion</label><textarea id="chapter-comment-text" name="text" rows="1" maxlength="2000" required placeholder="Join the discussion..."></textarea><div class="comment-composer-actions"><button class="primary-button" type="submit" disabled>Post comment</button>${quote ? '<button type="button" class="subtle-button" data-action="comment-cancel-reply">Cancel</button>' : ''}<div class="form-message" aria-live="polite"></div></div></form>`;
  }

  function premiumChapterGate() {
    const chapter = state.lockedChapter || {};
    const quote = state.chapterAccess;
    return `${header()}<main class="workspace premium-gate"><a class="back-link" href="/story/${encodeURIComponent(state.story?.id || '')}" data-link>← Back to story</a><section class="panel premium-gate-card"><span class="eyebrow">READAGORA PREMIUM</span><h1>Continue your story</h1>${state.pageError ? `<p class="notice error-notice">${esc(state.pageError)}</p>` : ''}<p><b>${esc(chapter.title || 'This chapter')}</b> requires Premium access. Subscribe through the mobile app, or unlock this chapter permanently with Agora Coins.</p>${!state.session ? `<a class="primary-button" href="${authIntentHref(`${location.pathname}${location.search}`)}" data-link>Sign in to check access</a>` : quote?.accessible ? `<button type="button" class="primary-button" data-action="premium-reopen">Read chapter</button>` : quote ? `<div class="premium-unlock-quote"><b>${Number(quote.coinPrice || 0)} Agora Coins</b><span>Your balance: ${Number(quote.balance || 0).toLocaleString()}</span></div>${Number(quote.balance || 0) >= Number(quote.coinPrice || 0) ? `<button type="button" class="primary-button" data-action="premium-unlock" ${state.premiumBusy ? 'disabled' : ''}>${state.premiumBusy ? 'Unlocking…' : `Unlock for ${Number(quote.coinPrice).toLocaleString()} coins`}</button>` : `<p class="notice">You need more coins to unlock this chapter.</p><a class="outline-button" href="/profile/agora-coins" data-link>View Agora Coins wallet</a>`}<button type="button" class="text-link" data-action="premium-refresh" ${state.premiumBusy ? 'disabled' : ''}>Refresh access and balance</button>` : `<p class="notice">Could not check access right now.</p><button type="button" class="outline-button" data-action="premium-refresh">Try again</button>`}<p class="muted-copy">Premium subscriptions are managed through the mobile app store. No web subscription purchase will be started here.</p></section></main>${footer()}${mobileTabs()}`;
  }

  function readerPage() {
    const chapter = state.chapter;
    const story = state.story;
    const loginHref = authIntentHref(`${location.pathname}${location.search}`, { action: 'comment' });
    if (state.loading) return `${header()}<main class="workspace"><div class="page-loading">Opening chapter…</div></main>`;
    if (state.premiumGate && story) return premiumChapterGate();
    if (state.error) return `${header()}<main class="workspace"><div class="notice error-notice" role="alert">${esc(state.error)} <button class="outline-button" type="button" data-action="reader-retry">Try again</button></div><a class="text-link" href="/" data-link>Back to discovery</a></main>${footer()}`;
    if (!chapter || !story) return `${header()}<main class="empty-state"><h1>Chapter unavailable</h1><a class="text-link" href="/" data-link>Back to discovery</a></main>${footer()}`;

    const index = state.chapters.findIndex(item => item.id === chapter.id);
    const previous = state.chapters[index - 1];
    const next = state.chapters[index + 1];
    const settings = state.readerSettings;
    const hasText = chapter.has_text ?? chapter.content_type !== 'comic';
    const textContent = normalizeStoryContent(hasText ? chapter.content || '' : '');
    const chapterPanels = chapter.panels || [];
    const hasHybridContent = hasText && chapterPanels.length > 0;
    const readerContentMode = state.readerContentMode
      || (state.readerResumePanelIndex != null ? 'comic' : 'text');
    const panels = chapterPanels.map((panel, panelIndex) => {
      const altText = String(panel.alt_text || panel.description || '').trim()
        || `Panel ${panelIndex + 1} of ${chapterPanels.length} in “${chapter.title}”`;
      return `<figure class="comic-panel-figure"><img class="comic-panel" src="${esc(panel.image_url)}" alt="${esc(altText)}" loading="lazy"/></figure>`;
    }).join('');
    const formatSwitch = hasHybridContent
      ? `<div class="reader-format-switch reader-format-switch-topbar" role="group" aria-label="Chapter format"><button type="button" data-reader-format="text" aria-controls="reader-text-content" aria-pressed="${readerContentMode !== 'comic'}">Text</button><button type="button" data-reader-format="comic" aria-controls="reader-comic-content" aria-pressed="${readerContentMode === 'comic'}">Comic</button></div>`
      : '';
    const chapterContent = hasHybridContent
      ? `<div class="reader-format-pane" id="reader-text-content" data-reader-format-pane="text"${readerContentMode === 'comic' ? ' hidden' : ''}>${textContent}</div><div class="reader-format-pane" id="reader-comic-content" data-reader-format-pane="comic"${readerContentMode !== 'comic' ? ' hidden' : ''}>${panels}</div>`
      : `${textContent}${panels}`;
    const lightTheme = document.documentElement.dataset.theme === 'light';
    const chapterLink = item => `/read/${encodeURIComponent(story.id)}/${encodeURIComponent(item.id)}`;
    return `<header class="reader-topbar">
      <a class="brand" href="/" data-link><img class="brand-image" src="/assets/mark.png" alt=""/><span>readagora</span></a>
      <a class="reader-book" href="/story/${encodeURIComponent(story.id)}" data-link><span>${esc(story.title)}</span><small>${esc(chapter.title)}</small></a>
      <div class="reader-controls">
        <button class="icon-button reader-sidebar-toggle" data-reader-sidebar aria-expanded="${!state.readerSidebarCollapsed}" aria-controls="reader-chapter-list" aria-label="${state.readerSidebarCollapsed ? 'Show' : 'Hide'} chapter list">${icon('list', 'header-icon')}</button>
        <button class="icon-button site-theme-toggle" data-action="site-theme" aria-label="Switch to ${lightTheme ? 'dark' : 'light'} site theme" title="Switch site theme">${icon(lightTheme ? 'moon' : 'sun', 'header-icon')}</button>
        <button class="icon-button" data-font="-1" aria-label="Decrease text size">A−</button><button class="icon-button" data-font="1" aria-label="Increase text size">A+</button>
        ${formatSwitch}
        <details class="reader-settings"><summary class="icon-button" aria-label="Reader preferences; current page theme: ${esc(settings.theme)}" title="Reader preferences · ${esc(settings.theme)} theme">Aa</summary><div class="reader-settings-panel"><div class="reader-settings-heading"><strong>Reading preferences</strong><button type="button" class="subtle-button reader-settings-done" data-reader-settings-close>Done</button></div>
          <label>Font<select data-reader-setting="font"><option value="sans" ${settings.font === 'sans' ? 'selected' : ''}>Sans serif</option><option value="serif" ${settings.font === 'serif' ? 'selected' : ''}>Serif</option></select></label>
          <label>Text size <output data-reader-value="size">${settings.size}px</output><input type="range" min="16" max="24" step="1" value="${settings.size}" data-reader-setting="size"/></label>
          <label>Line spacing <output data-reader-value="lineHeight">${settings.lineHeight.toFixed(2)}</output><input type="range" min="1.55" max="1.95" step="0.05" value="${settings.lineHeight}" data-reader-setting="lineHeight"/></label>
          <label>Reading width<select data-reader-setting="width"><option value="560" ${settings.width === 560 ? 'selected' : ''}>Narrow · 560px</option><option value="680" ${settings.width === 680 ? 'selected' : ''}>Comfortable · 680px</option><option value="720" ${settings.width === 720 ? 'selected' : ''}>Roomy · 720px</option><option value="800" ${settings.width === 800 ? 'selected' : ''}>Wide · 800px</option></select></label>
          <label>Page theme<select data-reader-setting="theme"><option value="night" ${settings.theme === 'night' ? 'selected' : ''}>Dark</option><option value="warm" ${settings.theme === 'warm' ? 'selected' : ''}>Sepia</option><option value="paper" ${settings.theme === 'paper' ? 'selected' : ''}>Light</option></select></label>
          <label class="reader-auto-play"><input type="checkbox" data-reader-setting="autoPlayNext" ${settings.autoPlayNext ? 'checked' : ''}/> Automatically play the next chapter</label><small data-reader-preference-status aria-live="polite"></small>
        </div></details>
        <details class="reader-settings narration-settings"><summary class="icon-button" aria-label="Chapter narration" title="Chapter narration">Listen</summary><div class="reader-settings-panel narration-panel"><strong>Listen to this chapter</strong><div class="narration-controls"><button type="button" class="outline-button" data-action="reader-speech-previous">Previous</button><button type="button" class="primary-button" data-action="reader-speech-toggle" aria-label="Play chapter narration">Play</button><button type="button" class="outline-button" data-action="reader-speech-next">Next</button><button type="button" class="subtle-button" data-action="reader-speech-stop">Stop</button></div><label>Speed<select data-speech-rate>${[0.75,1,1.25,1.5,2].map(rate => `<option value="${rate}" ${Number(state.speechRate || 1) === rate ? 'selected' : ''}>${rate}x</option>`).join('')}</select></label><label>Voice<select data-speech-voice><option value="">System default</option>${(state.speechVoices || []).map(voice => `<option value="${esc(voice.voiceURI)}" ${state.speechVoice === voice.voiceURI ? 'selected' : ''}>${esc(voice.name)} · ${esc(voice.lang)}</option>`).join('')}</select></label><small data-speech-status aria-live="polite">${state.speechTotal ? `Paragraph ${Math.min(state.speechIndex + 1, state.speechTotal)} of ${state.speechTotal}` : 'Browser narration'}</small></div></details>
      </div>
    </header>${state.pageError ? `<div class="notice error-notice reader-action-error" role="alert">${esc(state.pageError)}</div>` : ''}
    <button class="reader-sidebar-reopen" data-reader-sidebar ${state.readerSidebarCollapsed ? '' : 'hidden'} aria-expanded="${!state.readerSidebarCollapsed}" aria-controls="reader-chapter-list" aria-label="Show chapter list" title="Show chapter list">${icon('list', 'header-icon')}</button>
    <main class="reader-layout theme-${settings.theme}${state.readerSidebarCollapsed ? ' sidebar-collapsed' : ''}">
      <aside class="reader-aside" id="reader-chapter-list"><a href="/story/${encodeURIComponent(story.id)}" data-link>← Story details</a><span>READING</span><b>${esc(story.title)}</b><div class="reader-progress"><i style="width:${Math.round((index + 1) / Math.max(1, state.chapters.length) * 100)}%"></i></div><small>Chapter ${index + 1} of ${state.chapters.length}</small><div class="chapter-toc">${state.chapters.map((item, chapterIndex) => {
        const active = item.id === chapter.id;
        const chapterActions = active
          ? `<span class="chapter-toc-actions"><button type="button" data-action="chapter-like" aria-pressed="${Boolean(state.chapterLike?.liked)}" aria-label="${state.chapterLike?.liked ? 'Unlike' : 'Like'} chapter · ${Number(state.chapterLike?.count || 0)} likes" title="${state.chapterLike?.liked ? 'Unlike chapter' : 'Like chapter'}" ${state.isOffline ? 'disabled' : ''}>${state.chapterLike?.liked ? '♥' : '♡'} ${Number(state.chapterLike?.count || 0).toLocaleString()}</button><button type="button" data-action="reader-share" aria-label="Share chapter" title="Share chapter">Share</button></span>`
          : '';
        return `<div class="chapter-toc-entry${active ? ' active' : ''}"><a class="${active ? 'active' : ''}" href="${chapterLink(item)}" data-link><span>${String(chapterIndex + 1).padStart(2, '0')}</span>${esc(item.title)}</a>${chapterActions}</div>`;
      }).join('')}</div></aside>
      <article class="reader-article" style="--reader-size:${settings.size}px;--reader-line-height:${settings.lineHeight};--reader-width:${settings.width}px;--reader-font:${settings.font === 'serif' ? 'Georgia,serif' : 'Inter,Arial,sans-serif'}">
        <div class="prose">${chapterContent}</div><div class="reader-selection-toolbar" role="toolbar" aria-label="Selected passage actions" hidden><button type="button" data-action="comment-quote-selection" aria-label="Reference in a comment" title="Reference in a comment">${icon('community', 'reader-selection-icon')}</button><button type="button" data-action="reader-share-selection" aria-label="Share selected passage" title="Share selected passage">${icon('share', 'reader-selection-icon')}</button><button type="button" data-action="reader-selection-dismiss" aria-label="Dismiss selection actions" title="Dismiss">×</button></div>
        <div class="chapter-end"><span>&#10022;</span><p>Thank you for reading.</p><a href="/story/${encodeURIComponent(story.id)}" data-link>${esc(story.title)}</a></div><nav class="chapter-nav">${previous ? `<a href="${chapterLink(previous)}" data-link>← Previous chapter</a>` : '<span></span>'}${next ? `<a class="next-chapter" href="${chapterLink(next)}" data-link>Next chapter →</a>` : `<a class="next-chapter" href="/story/${encodeURIComponent(story.id)}" data-link>Back to story →</a>`}</nav>
        ${state.isOffline ? '<p class="notice">You are reading a downloaded copy. Connect to comment or react.</p>' : ''}<section class="reader-comments"><div class="reader-comments-heading"><h2>Reader comments</h2><span>${Number(state.comments?.length || 0).toLocaleString()}</span></div>${state.session && !state.isOffline ? (state.replyToComment ? '' : chapterCommentComposer()) : state.isOffline ? '<p class="notice">Connect to the internet to leave a comment.</p>' : `<p class="comment-signin"><a href="${loginHref}" data-link>Sign in</a> to join the discussion.</p>`}<div class="comment-list" aria-live="polite">${chapterCommentsView()}</div>${state.commentsError ? `<p class="comment-error" role="alert">${esc(state.commentsError)}</p>` : ''}${state.commentsHasMore ? `<button class="comment-load-more" type="button" data-action="comment-load-more" ${state.commentsLoading ? 'disabled aria-busy="true"' : ''}>${state.commentsLoading ? 'Loading comments…' : 'Load more comments'}</button>` : ''}</section>
      </article>
    </main>`;
  }

  return { readerPage, premiumChapterGate, chapterCommentsView, applyReaderSettings, saveReaderSettings, readerPositionKey };
}
