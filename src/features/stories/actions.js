import { shareLink } from '../../lib/ui/share-link.js';
import { authIntentHref } from '../auth/redirects.js';

export function createStoryActions({ state, api, app, navigate, render, loadStory, speechPlayer, segmentSpeechText, removeOfflineStory, saveStoryOffline, icon }) {
  const savingBookmarks = new Set();
  const downloadingStories = new Set();

  async function saveStory(storyId, button) {
    if (!state.session) { navigate(authIntentHref(`${location.pathname}${location.search}`, { action: 'bookmark', entityId: String(storyId) })); return; }
    const storyKey = String(storyId);
    if (savingBookmarks.has(storyKey)) return;
    savingBookmarks.add(storyKey);
    const wasDisabled = button?.disabled || false;
    if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
    const isSaved = state.bookmarkedStoryIds?.has(storyKey) || (state.story?.id === storyKey && state.storySaved);
    try {
      if (isSaved) {
        await api(`/bookmarks/story/${encodeURIComponent(storyId)}`, { method: 'DELETE' });
        state.bookmarkedStoryIds = new Set(state.bookmarkedStoryIds || []);
        state.bookmarkedStoryIds.delete(storyKey);
        if (state.story?.id === storyKey) state.storySaved = false;
        if (button) { button.dataset.saved = 'false'; button.classList.remove('is-saved'); button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-label', `Add ${button.dataset.title || 'story'} to your library`); button.title = button.getAttribute('aria-label'); if (button.classList.contains('story-save-action')) button.innerHTML = icon('library', 'story-action-icon'); else if (button.classList.contains('ranking-save-button')) button.innerHTML = icon('heart', 'ranking-save-icon'); else button.textContent = '+'; }
      } else {
        await api('/bookmarks', { method: 'POST', body: { story_id: storyId } });
        state.bookmarkedStoryIds = new Set(state.bookmarkedStoryIds || []);
        state.bookmarkedStoryIds.add(storyKey);
        if (state.story?.id === storyKey) state.storySaved = true;
        if (button) { button.dataset.saved = 'true'; button.classList.add('is-saved'); button.setAttribute('aria-pressed', 'true'); button.setAttribute('aria-label', `Remove ${button.dataset.title || 'story'} from your library`); button.title = button.getAttribute('aria-label'); if (button.classList.contains('story-save-action')) button.innerHTML = icon('library', 'story-action-icon'); else if (button.classList.contains('ranking-save-button')) button.innerHTML = icon('heart', 'ranking-save-icon'); else button.textContent = '✓'; }
      }
      state.pageError = '';
      if (!button) render();
    } catch (error) { state.pageError = error.message; render(); }
    finally {
      savingBookmarks.delete(storyKey);
      if (button) { button.disabled = wasDisabled; button.removeAttribute('aria-busy'); }
    }
  }
  async function handleAction(action, button) {
    if (action === 'comment-thread-toggle') {
      const expanded = state.expandedCommentThreads ||= new Set();
      expanded.has(button.dataset.id) ? expanded.delete(button.dataset.id) : expanded.add(button.dataset.id);
      render(); return true;
    }
    if (action === 'comment-quote-expand') {
      const expanded = state.expandedCommentQuotes ||= new Set();
      expanded.has(button.dataset.id) ? expanded.delete(button.dataset.id) : expanded.add(button.dataset.id);
      render(); return true;
    }
    if (action === 'comment-load-more') {
      if (state.commentsLoading || !state.chapter?.id) return true;
      state.commentsLoading = true; state.commentsError = ''; render();
      try {
        const offset = state.commentsOffset ?? (state.comments?.length || 0);
        const nextComments = await api(`/chapters/${encodeURIComponent(state.chapter.id)}/comments?limit=30&offset=${offset}`);
        const existing = new Set((state.comments || []).map(comment => String(comment.id)));
        const uniqueComments = (nextComments || []).filter(comment => !existing.has(String(comment.id)));
        state.comments = [...(state.comments || []), ...uniqueComments];
        state.commentsOffset = offset + (nextComments || []).length;
        state.commentsHasMore = (nextComments || []).length === 30;
      } catch (error) { state.commentsError = error.message || 'Could not load more comments.'; }
      finally { state.commentsLoading = false; render(); }
      return true;
    }
    if (action === 'comment-reply') { state.replyToComment = button.dataset.id; state.commentQuote = ''; render(); app.querySelector('[data-form="chapter-comment"] textarea')?.focus(); return true; }
    if (action === 'comment-quote-selection') { if (!state.session) { navigate(authIntentHref(`${location.pathname}${location.search}`, { action: 'comment' })); return true; } state.replyToComment = ''; state.commentQuote = button.dataset.quote || ''; app.querySelector('.reader-comments')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); render(); app.querySelector('[data-form="chapter-comment"] textarea')?.focus(); return true; }
    if (action === 'reader-selection-dismiss') { const toolbar = button.closest('.reader-selection-toolbar'); if (toolbar) toolbar.hidden = true; window.getSelection()?.removeAllRanges(); return true; }
    if (action === 'reader-share-selection') {
      const quote = String(button.dataset.quote || '').trim();
      if (!quote) return true;
      const url = `${location.origin}${location.pathname}`;
      const text = `“${quote}”\n— ${state.story?.title || 'ReadAgora'}, ${state.chapter?.title || 'chapter'}`;
      const result = await shareLink({ title: `${state.story?.title || 'ReadAgora'} · ${state.chapter?.title || ''}`, text, url, promptLabel: 'Copy selected passage and chapter link' });
      if (result === 'copied') button.setAttribute('aria-label', 'Passage and link copied');
      return true;
    }
    if (action === 'comment-cancel-reply') { state.replyToComment = ''; state.commentQuote = ''; render(); return true; }
    if (action === 'comment-edit') { const comment = state.comments.find(item => item.id === button.dataset.id); const text = prompt('Edit your comment', comment?.text || ''); if (text == null || !text.trim()) return true; await api(`/comments/${encodeURIComponent(button.dataset.id)}`, { method: 'PATCH', body: { text: text.trim() } }); await loadStory(state.story.id, state.chapter.id); return true; }
    if (action === 'comment-delete') { if (!confirm('Delete this comment and its replies?')) return true; await api(`/comments/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' }); await loadStory(state.story.id, state.chapter.id); return true; }
    if (action === 'reader-share') {
      const url = `${location.origin}${location.pathname}`;
      const result = await shareLink({ title: `${state.story?.title || 'ReadAgora'} · ${state.chapter?.title || ''}`, url, promptLabel: 'Copy the chapter link' });
      if (result === 'copied') button.textContent = 'Link copied';
      return true;
    }
    if (action === 'chapter-like') {
      if (!state.session) { navigate(authIntentHref(`${location.pathname}${location.search}`)); return true; }
      const liked = Boolean(state.chapterLike?.liked);
      state.chapterLike = await api(`/chapters/${encodeURIComponent(state.chapter.id)}/like`, { method: liked ? 'DELETE' : 'POST' }); render(); return true;
    }
    if (action === 'premium-refresh') {
      if (!state.session) { navigate(authIntentHref(`${location.pathname}${location.search}`)); return true; }
      state.premiumBusy = true; render();
      try { state.chapterAccess = await api(`/chapters/${encodeURIComponent(state.lockedChapter.id)}/access`); if (state.chapterAccess.accessible) { await loadStory(state.story.id, state.lockedChapter.id); return true; } }
      finally { state.premiumBusy = false; render(); }
      return true;
    }
    if (action === 'premium-reopen') { await loadStory(state.story.id, state.lockedChapter.id); return true; }
    if (action === 'premium-unlock') {
      const quote = state.chapterAccess; const chapterId = state.lockedChapter?.id;
      if (!quote || !chapterId || state.premiumBusy) return true;
      if (!confirm(`Unlock this chapter permanently for ${quote.coinPrice} Agora Coins?`)) return true;
      state.premiumBusy = true; render();
      try { await api(`/chapters/${encodeURIComponent(chapterId)}/unlock`, { method: 'POST', body: { expectedPrice: Number(quote.coinPrice) } }); await loadStory(state.story.id, chapterId); }
      finally { state.premiumBusy = false; }
      return true;
    }
    if (action === 'reader-speech-toggle') { speechPlayer.toggle(segmentSpeechText(app.querySelector('.reader-article .prose')?.innerText || '')); return true; }
    if (action === 'reader-speech-stop') { speechPlayer.stop(); return true; }
    if (action === 'reader-speech-previous') { speechPlayer.previous(); return true; }
    if (action === 'reader-speech-next') { speechPlayer.next(); return true; }
    if (action === 'offline-save') {
      const story = state.story;
      if (!story || story.id !== button.dataset.id || downloadingStories.has(story.id)) return true;
      const path = location.pathname;
      const current = () => state.story === story && location.pathname === path;
      const removing = state.offlineSaved;
      if (removing && !confirm('Remove this story from offline storage on this browser?')) return true;
      downloadingStories.add(story.id);
      state.offlineSaving = true; state.pageError = ''; render();
      try {
        if (removing) await removeOfflineStory(story.id);
        else await saveStoryOffline(story, state.chapters, api);
        if (current()) state.offlineSaved = !removing;
      }
      catch (error) { if (current()) state.pageError = error.message || (removing ? 'Could not remove this offline download.' : 'Could not save this story for offline reading.'); }
      finally { downloadingStories.delete(story.id); if (current()) { state.offlineSaving = false; render(); } }
      return true;
    }
    if (action === 'share-story') {
      const url = `${location.origin}/story/${encodeURIComponent(state.story?.id || '')}`;
      const result = await shareLink({ title: state.story?.title || 'ReadAgora story', url, promptLabel: 'Copy the story link' });
      if (result === 'copied') button.textContent = 'Link copied';
      return true;
    }
    if (action === 'follow-story-author') {
      if (!state.session) { navigate(authIntentHref(`${location.pathname}${location.search}`, { action: 'follow', entityId: String(button.dataset.id || '') })); return true; }
      await api(`/users/${encodeURIComponent(button.dataset.id)}/follow`, { method: state.storyFollowing ? 'DELETE' : 'POST' }); state.storyFollowing = !state.storyFollowing; render(); return true;
    }
    if (action === 'block-story-author') {
      if (!state.session) { navigate(authIntentHref(`${location.pathname}${location.search}`)); return true; }
      if (!confirm(`Block @${state.story?.author?.username || 'this creator'}? You can unblock them later from Profile.`)) return true;
      await api(`/users/${encodeURIComponent(button.dataset.id)}/block`, { method: 'POST' }); navigate('/'); return true;
    }
    if (action === 'support-creator') {
      if (!state.session?.user?.id) { navigate(authIntentHref(`${location.pathname}${location.search}`)); return true; }
      if (state.session.user.id === state.story?.author_id) { state.supportError = 'You cannot send coins to your own story.'; state.supportOpen = true; render(); return true; }
      try {
        const wallet = await api('/coins/wallet'); state.supportBalance = Number(wallet?.balance || 0);
        state.supportGift = [10, 50, 120, 300].filter(amount => amount <= state.supportBalance).at(-1) || 10; state.supportError = '';
      } catch (error) { state.supportBalance = null; state.supportError = error.message || 'Could not load your Agora Coins wallet. Try again.'; }
      state.supportOpen = true; render(); return true;
    }
    if (action === 'support-close') { state.supportOpen = false; state.supportError = ''; render(); app.querySelector('[data-action="support-creator"]')?.focus(); return true; }
    if (action === 'support-gift-choice') { state.supportGift = Number(button.dataset.coins); state.supportError = ''; render(); app.querySelector(`[data-action="support-gift-choice"][data-coins="${state.supportGift}"]`)?.focus(); return true; }
    if (action === 'support-gift-send') {
      if (!state.session?.user?.id || !state.story?.id || state.supportSending) return true;
      const coins = Number(state.supportGift);
      if (![10, 50, 120, 300].includes(coins) || coins > Number(state.supportBalance || 0)) throw new Error('Choose a gift within your available coin balance.');
      state.supportSending = true; state.supportError = ''; render();
      const storageKey = `readagora:coin-support:${state.session.user.id}:${state.story.id}`;
      let pending = {};
      try { pending = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { pending = {}; }
      state.supportPendingByAmount ||= {};
      const createRequestKey = () => globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, value => { const random = Math.floor(Math.random() * 16); return (value === 'x' ? random : (random & 0x3) | 0x8).toString(16); });
      const idempotencyKey = pending[coins] || state.supportPendingByAmount[coins] || createRequestKey();
      pending[coins] = idempotencyKey; state.supportPendingByAmount[coins] = idempotencyKey;
      try { localStorage.setItem(storageKey, JSON.stringify(pending)); } catch { /* Keep the idempotency key for this page session. */ }
      try {
        await api('/coins/support', { method: 'POST', body: { storyId: state.story.id, coins, idempotencyKey } });
        delete pending[coins]; delete state.supportPendingByAmount[coins];
        try { if (Object.keys(pending).length) localStorage.setItem(storageKey, JSON.stringify(pending)); else localStorage.removeItem(storageKey); } catch { /* Wallet change succeeded; cleanup is best effort. */ }
        state.supportBalance = Math.max(0, Number(state.supportBalance || 0) - coins); state.supportOpen = false; state.supportSending = false; render(); return true;
      } catch (error) { state.supportSending = false; state.supportError = error.message || 'The gift could not be sent. Try again.'; render(); return true; }
    }
    return false;
  }
  return { handleAction, saveStory };
}
