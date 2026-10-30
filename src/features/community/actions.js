import { shareLink } from '../../lib/ui/share-link.js';
import { authIntentHref } from '../auth/redirects.js';

export function createCommunityActions(deps) {
  const { state, api, app, loadPage, render, navigate } = deps;
  const confirmAction = deps.confirmAction || (message => window.confirm(message));
  const promptAction = deps.promptAction || ((message, initial) => window.prompt(message, initial));
  const share = deps.share || shareLink;
  const login = () => navigate(authIntentHref(`${location.pathname}${location.search}`));
  let feedRequest = 0;
  let repliesRequest = 0;
  const context = () => ({ page: state.page, data: state.pageData, postId: state.pageData?.post?.id });
  async function refreshContext(view, removed = false) {
    if (state.page !== view.page || state.pageData !== view.data) return;
    if (view.page === 'community-post') {
      if (removed) navigate('/community');
      else await loadPage('community-post', view.postId);
    } else if (view.page === 'community') await loadPage('community');
  }

  async function handleAction(action, button) {
    if (action === 'community-tab') { state.communityTab = button.dataset.tab; await loadPage('community'); return true; }
    if (action === 'community-retry') {
      const reopenComposer = Boolean(button.closest('[data-community-modal]'));
      await loadPage('community');
      if (reopenComposer) { app.insertAdjacentHTML('beforeend', deps.communityComposerModal()); deps.bind(); app.querySelector('[data-community-modal] textarea[name="content"]')?.focus(); }
      return true;
    }
    if (action === 'open-community-composer') {
      app.insertAdjacentHTML('beforeend', deps.communityComposerModal()); deps.bind();
      app.querySelector('[data-community-modal] textarea[name="content"]')?.focus(); return true;
    }
    if (action === 'community-reveal') { state.revealedPosts = [...new Set([...(state.revealedPosts || []), button.dataset.id])]; render(); return true; }
    if (action === 'community-load-more') {
      if (state.communityLoadingMore) return true;
      const offset = state.pageData?.next_offset;
      if (offset == null) {
        if (state.pageData?.communityErrors?.feed) { await loadPage('community'); return true; }
        return true;
      }
      state.communityLoadingMore = true; state.communityLoadError = '';
      const request = ++feedRequest;
      const data = state.pageData;
      const tab = state.communityTab || 'for-you';
      const active = () => state.page === 'community' && state.pageData === data && (state.communityTab || 'for-you') === tab;
      let updated = false;
      button.disabled = true; button.textContent = 'Loading posts';
      try {
        const result = await api(`/community?tab=${encodeURIComponent(tab)}&offset=${encodeURIComponent(offset)}`);
        if (!active()) return true;
        const existing = state.pageData.items || [];
        const seen = new Set(existing.map(post => String(post.id)));
        const nextItems = (result?.items || []).filter(post => !seen.has(String(post.id)));
        state.pageData = { ...state.pageData, ...result, items: [...existing, ...nextItems] };
        updated = true;
      } catch (error) { if (active()) { state.communityLoadError = error.message || 'Could not load more posts. Try again.'; updated = true; } }
      finally { if (request === feedRequest) state.communityLoadingMore = false; }
      if (updated) render(); return true;
    }
    if (action === 'community-comment-load-more') {
      if (state.communityCommentsLoading) return true;
      const offset = state.pageData?.commentsNextOffset;
      const postId = state.pageData?.post?.id;
      if (offset == null || !postId) return true;
      state.communityCommentsLoading = true; state.communityCommentsError = '';
      const request = ++repliesRequest;
      const data = state.pageData;
      const active = () => state.page === 'community-post' && state.pageData === data && state.pageData?.post?.id === postId;
      let updated = false;
      button.disabled = true; button.textContent = 'Loading replies';
      try {
        const result = await api(`/community/posts/${encodeURIComponent(postId)}/comments?offset=${encodeURIComponent(offset)}`);
        if (!active()) return true;
        const existing = state.pageData.comments || [];
        const seen = new Set(existing.map(comment => String(comment.id)));
        const nextItems = (result?.items || []).filter(comment => !seen.has(String(comment.id)));
        state.pageData = { ...state.pageData, comments: [...existing, ...nextItems], commentsNextOffset: result?.next_offset ?? null };
        updated = true;
      } catch (error) { if (active()) { state.communityCommentsError = error.message || 'Could not load more replies. Try again.'; updated = true; } }
      finally { if (request === repliesRequest) state.communityCommentsLoading = false; }
      if (updated) render(); return true;
    }
    if (action === 'community-vote') {
      if (!state.session) { login(); return true; }
      const view = context();
      await api(`/community/posts/${encodeURIComponent(button.dataset.id)}/vote`, { method: 'POST', body: { option_index: Number(button.dataset.index) } });
      await refreshContext(view); return true;
    }
    if (action === 'community-delete') {
      if (!confirmAction('Delete this post and its comments?')) return true;
      const view = context();
      await api(`/community/posts/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' });
      await refreshContext(view, true); return true;
    }
    if (action === 'community-edit') {
      const current = state.pageData?.items?.find(item => item.id === button.dataset.id) || state.pageData?.post;
      const content = promptAction('Edit your post', current?.content || '');
      if (content == null || !content.trim()) return true;
      const view = context();
      await api(`/community/posts/${encodeURIComponent(button.dataset.id)}`, { method: 'PATCH', body: { content: content.trim() } });
      await refreshContext(view); return true;
    }
    if (action === 'community-comment-reply') { state.communityCommentReply = button.dataset.id; render(); app.querySelector('[data-form="post-comment"] textarea')?.focus(); return true; }
    if (action === 'community-comment-cancel') { state.communityCommentReply = ''; render(); return true; }
    if (action === 'community-comment-edit') {
      const view = context();
      const comment = state.pageData?.comments?.find(item => item.id === button.dataset.id);
      const content = promptAction('Edit your comment', comment?.content || '');
      if (content == null || !content.trim()) return true;
      await api(`/community/comments/${encodeURIComponent(button.dataset.id)}`, { method: 'PATCH', body: { content: content.trim() } });
      await refreshContext(view); return true;
    }
    if (action === 'community-comment-delete') {
      if (!confirmAction('Delete this comment and its replies?')) return true;
      const view = context();
      await api(`/community/comments/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' });
      await refreshContext(view); return true;
    }
    if (action === 'community-report') {
      if (!confirmAction('Report this post to the moderation team?')) return true;
      await api('/reports', { method: 'POST', body: { category: 'inappropriate_content', description: `Community post ${button.dataset.id}`, reported_user_id: button.dataset.user } });
      button.textContent = 'Report submitted';
      button.disabled = true;
      button.setAttribute('aria-live', 'polite');
      const menu = button.closest('details');
      if (menu) menu.open = true;
      return true;
    }
    if (action === 'community-block') {
      if (!confirmAction(`Block @${button.dataset.username}? Their posts will be hidden from your feed.`)) return true;
      const view = context();
      await api(`/users/${encodeURIComponent(button.dataset.user)}/block`, { method: 'POST' });
      await refreshContext(view, true); return true;
    }
    if (action === 'community-share') {
      const url = `${location.origin}/community/post/${encodeURIComponent(button.dataset.id)}`;
      const result = await share({ title: 'ReadAgora Community', url, promptLabel: 'Copy the community post link' });
      if (result === 'copied' || result === 'shared') {
        const label = button.querySelector('.post-action-label');
        const feedback = result === 'copied' ? 'Copied' : 'Shared';
        if (label) label.textContent = feedback;
        button.dataset.shareStatus = result;
        button.setAttribute('aria-label', result === 'copied' ? 'Post link copied' : 'Post shared');
        button.setAttribute('title', result === 'copied' ? 'Post link copied' : 'Post shared');
      }
      return true;
    }
    if (action === 'community-follow') {
      if (!state.session) { login(); return true; }
      await api(`/users/${encodeURIComponent(button.dataset.id)}/follow`, { method: 'POST' });
      button.textContent = 'Following'; button.disabled = true; return true;
    }
    if (action === 'post-like' || action === 'post-save') {
      if (!state.session) { login(); return true; }
      const view = context();
      const kind = action === 'post-like' ? 'like' : 'save';
      const enabled = button.dataset.enabled === 'true';
      await api(`/community/posts/${encodeURIComponent(button.dataset.id)}/${kind}`, { method: enabled ? 'DELETE' : 'POST' });
      await refreshContext(view); return true;
    }
    return false;
  }

  return { handleAction };
}
