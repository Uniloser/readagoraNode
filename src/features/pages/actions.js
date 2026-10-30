import { createManuscriptActions } from '../workroom/manuscript-actions.js';
import { shareLink } from '../../lib/ui/share-link.js';
import { storeThemePreference } from '../../lib/ui/theme-preference.js';
import { getBrowserPushState, subscribeBrowserPush, unsubscribeBrowserPush } from '../../lib/push/browser-push.js';
import { authIntentHref } from '../auth/redirects.js';
import { createChapterPublisher } from '../workroom/chapter-publication.js';

export function createAccountAndWorkroomActions(deps) {
  const { state, app, api, render, navigate, loadPage, loadStory, currentPathname, saveSession, resetPersonalizedHome, removeOfflineStory, bind, newStoryModal, saveChapterDraft } = deps;
  const manuscriptActions = createManuscriptActions(deps);
  const publishChapter = createChapterPublisher({ state, api, saveChapterDraft, loadPage });
  async function handleAction(action, button, event) {
    try {
      if (action === 'clear-page-error') { state.pageError = ''; render(); return; }
    if (action === 'web-push-toggle') {
      state.webPushBusy = true;
      state.webPushError = '';
      render();
      try {
        if (state.pageData?.webPush?.enabled) await unsubscribeBrowserPush(api);
        else await subscribeBrowserPush(api, state.pageData?.webPushPublicKey || '');
      } catch (error) {
        state.webPushError = error instanceof Error ? error.message : 'Browser notifications could not be updated.';
      } finally {
        if (state.page === 'profile-settings' && state.pageData) state.pageData.webPush = await getBrowserPushState();
        state.webPushBusy = false;
        render();
      }
      return;
    }
    if (action === 'share-profile') {
      const user = state.pageData?.user;
      if (!user?.username) throw new Error('Your profile link is not available yet.');
      const url = new URL(`/creator/${encodeURIComponent(user.username)}`, location.origin).toString();
      const name = user.display_name || user.username;
      const result = await shareLink({ title: `${name} on ReadAgora`, text: `Read stories by ${name} on ReadAgora.`, url, promptLabel: 'Copy your ReadAgora profile link' });
      if (result === 'cancelled' || result === 'prompted') return;
      button.textContent = result === 'shared' ? 'Shared' : 'Link copied';
      window.setTimeout(() => { if (button.isConnected) button.textContent = 'Share profile'; }, 2200);
      return;
    }
    if (action === 'site-theme') {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      document.documentElement.dataset.themePreference = next;
      storeThemePreference(next);
      window.dispatchEvent(new CustomEvent('readagora-theme-change', { detail: next }));
      const themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) themeColor.content = next === 'light' ? '#f5f5f6' : '#000000';
      render(); return;
    }
    if (action === 'theme-preference' && ['system', 'light', 'dark'].includes(button.dataset.theme)) {
      const preference = button.dataset.theme;
      const resolved = preference === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : preference;
      storeThemePreference(preference);
      window.dispatchEvent(new CustomEvent('readagora-theme-change', { detail: preference }));
      document.documentElement.dataset.themePreference = preference;
      document.documentElement.dataset.theme = resolved;
      const themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) themeColor.content = resolved === 'light' ? '#f5f5f6' : '#000000';
      render(); return;
    }
    if (['post-like', 'post-save', 'follow'].includes(action) && !state.session) {
      navigate(authIntentHref(`${location.pathname}${location.search}`, { action: action === 'follow' ? 'follow' : 'default', entityId: action === 'follow' ? button.dataset.id : undefined })); return;
    }
    if (action === 'library-tab') { state.libraryTab = button.dataset.tab; state.librarySort = 'recent'; render(); return; }
    if (action === 'library-retry') { await loadPage('library'); return; }
    if (action === 'library-clear-search') { const input = app.querySelector('#library-search'); if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); } return; }
    if (action === 'new-story') { app.insertAdjacentHTML('beforeend', newStoryModal()); bind(); app.querySelector('[data-form="new-story"] [name="title"]')?.focus(); return; }
    if (action === 'close-modal') {
      const backdrop = button.closest('.modal-backdrop');
      const isCreateStoryDialog = Boolean(backdrop?.querySelector('[aria-labelledby="new-story-dialog-title"]'));
      const isCommunityDialog = Boolean(backdrop?.matches('[data-community-modal]'));
      const restoreFocus = isCreateStoryDialog
        ? app.querySelector('[data-action="new-story"]')
        : isCommunityDialog ? app.querySelector('[data-action="open-community-composer"]') : null;
      if (isCreateStoryDialog && currentPathname() === '/create/story') history.replaceState({}, '', '/workroom');
      backdrop?.remove(); restoreFocus?.focus(); return;
    }
    if (action === 'signout') {
      await Promise.allSettled([
        api('/auth/signout', { method: 'POST' }),
        fetch('/api/auth/signout', { method: 'POST' }),
      ]);
      saveSession(null); state.user = null; resetPersonalizedHome(); navigate('/'); return;
    }
    if (action === 'page-retry') { await loadPage(state.page, state.pageArgument); return; }
    if (action === 'story-retry' || action === 'reader-retry') {
      const routeParts = currentPathname().split('/').filter(Boolean);
      if (routeParts[1]) await loadStory(routeParts[1], action === 'reader-retry' ? routeParts[2] : undefined);
      return;
    }
    if (action === 'workroom-retry') { if (button.closest('.modal-backdrop')) state.openCreateStory = true; await loadPage('workroom'); return; }
    if (action === 'profile-retry') { await loadPage('profile'); return; }
    if (action === 'profile-settings-retry') { await loadPage('profile-settings'); return; }
    if (action === 'author-center-retry') { await loadPage('profile-author-center'); return; }
    if (action === 'profile-balance-retry') { await loadPage('profile-balance'); return; }
    if (action === 'profile-top-up-retry') { await loadPage('profile-top-up'); return; }
    if (action === 'profile-subscription-retry') { await loadPage('profile-subscription'); return; }
    if (action === 'manage-story-retry') { const storyId = currentPathname().split('/')[3]; if (storyId) await loadPage('manage-story', storyId); return; }
    if (action === 'chapter-editor-retry') { await loadPage('chapter-editor', { storyId: button.dataset.story, chapterId: button.dataset.chapter }); return; }
    if (action === 'manuscript-import-retry') { if (button.dataset.id) await loadPage('manuscript-import', button.dataset.id); return; }
    if (action === 'analytics-retry') { await loadPage('profile-author-analytics'); return; }
    if (action === 'inbox-retry') { await loadPage('profile-inbox'); return; }
    if (action === 'blocked-retry') { await loadPage('profile-blocked'); return; }
    if (action === 'creator-retry') { await loadPage('creator', state.pageArgument); return; }
    if (action === 'creator-posts-more') {
      const profile = state.pageData;
      if (!profile?.user?.id) return;
      state.creatorPostsLoadingMore = true; render();
      try {
        const offset = profile.postsError ? 0 : profile.postsNextOffset;
        const page = await api(`/community/users/${encodeURIComponent(profile.user.id)}/posts?offset=${encodeURIComponent(offset ?? 0)}`);
        const existing = new Set((profile.posts || []).map(post => post.id));
        profile.posts = [...(profile.posts || []), ...(page?.items || []).filter(post => !existing.has(post.id))];
        profile.postsNextOffset = page?.next_offset ?? null;
        profile.postsError = '';
      } catch (error) { profile.postsError = error.message || 'Could not load creator posts.'; }
      finally { state.creatorPostsLoadingMore = false; render(); }
      return;
    }
    if (action === 'public-profile-report') {
      const userId = state.pageData?.user?.id;
      if (!userId) return;
      const reportPath = `/profile/report?targetType=user&targetId=${encodeURIComponent(userId)}`;
      navigate(state.session ? reportPath : authIntentHref(reportPath));
      return;
    }
    if (action === 'public-profile-block') {
      const profile = state.pageData;
      if (!profile?.user?.id) return;
      if (!state.session) { navigate(authIntentHref(`${location.pathname}${location.search}`)); return; }
      const blocked = button.dataset.blocked === 'true';
      const username = profile.user.username || 'this creator';
      if (!confirm(blocked ? `Unblock @${username}?` : `Block @${username}? Their posts will be hidden from your feed.`)) return;
      await api(`/users/${encodeURIComponent(profile.user.id)}/block`, { method: blocked ? 'DELETE' : 'POST' });
      profile.isBlocked = !blocked;
      if (!blocked) profile.following = false;
      render();
      return;
    }
    if (action === 'community-post-retry') { await loadPage('community-post', state.pageArgument); return; }
    if (action === 'alpha-retry') { await loadPage('profile-alpha'); return; }
    if (action === 'creator-center-retry') { await loadPage('creator-center'); return; }
    if (action === 'creator-monetization-apply') {
      state.creatorCenterBusy = true; render();
      try { await api('/creator/apply-monetization', { method: 'POST', body: {} }); await loadPage('creator-center'); }
      catch (error) { state.pageError = error.message || 'Could not submit your application.'; }
      finally { state.creatorCenterBusy = false; render(); }
      return;
    }
    if (action === 'promotions-retry') { await loadPage('profile-promotions'); return; }
    if (action === 'moderation-retry') { await loadPage('profile-moderation'); return; }
    if (action === 'coins-retry') { await loadPage('profile-coins'); return; }
    if (action === 'rewards-retry') { await loadPage('profile-rewards'); return; }
    if (action === 'claim-alpha') { await api('/wallet/claim-alpha', { method: 'POST' }); await loadPage('profile-alpha'); return; }
    if (action === 'unsave') { await api(`/bookmarks/story/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' }); await loadPage('library'); return; }
    if (action === 'offline-remove') { if (!confirm('Remove this story from offline storage on this browser?')) return; await removeOfflineStory(button.dataset.id); await loadPage('library'); return; }
    if (action === 'open-notification') {
      event.preventDefault();
      const inbox = state.pageData;
      const destination = button.getAttribute('href');
      const readRequest = button.dataset.id ? api(`/notifications/${encodeURIComponent(button.dataset.id)}/read`, { method: 'POST' }) : Promise.resolve();
      await Promise.allSettled([readRequest]);
      if (state.page !== 'profile-inbox' || state.pageData !== inbox) return;
      if (destination) navigate(destination); else await loadPage('profile-inbox');
      return;
    }
    if (action === 'mark-read') { await api(`/notifications/${encodeURIComponent(button.dataset.id)}/read`, { method: 'POST' }); await loadPage('profile-inbox'); return; }
    if (action === 'mark-all-read') { await api('/notifications/read-all', { method: 'POST' }); await loadPage('profile-inbox'); return; }
    if (action === 'unblock-user') { await api(`/users/${encodeURIComponent(button.dataset.id)}/block`, { method: 'DELETE' }); await loadPage('profile-blocked'); return; }
    if (action === 'move-chapter') {
      const chapters = [...(state.pageData?.chapters || [])];
      const index = Number(button.dataset.index);
      const target = index + Number(button.dataset.direction);
      if (target < 0 || target >= chapters.length) return;
      [chapters[index], chapters[target]] = [chapters[target], chapters[index]];
      const storyId = state.pageData.story.id;
      await api(`/stories/${encodeURIComponent(storyId)}/chapters/reorder`, { method: 'PATCH', body: { chapters: chapters.map((chapter, order) => ({ id: chapter.id, chapter_order: order + 1 })) } });
      await loadPage('manage-story', storyId); return;
    }
    if (action === 'chapter-status') {
      const storyId = button.dataset.story || button.closest('details')?.querySelector('[name="story_id"]')?.value;
      await api(`/chapters/${encodeURIComponent(button.dataset.id)}/status`, { method: 'PATCH', body: { status: button.dataset.status } });
      await loadPage('manage-story', storyId); return;
    }
    if (action === 'delete-story') {
      const title = state.pageData?.story?.title || 'this story';
      if (!confirm(`Delete "${title}" and its chapters? This cannot be undone.`)) return;
      await api(`/stories/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' });
      navigate('/workroom'); return;
    }
    if (action === 'delete-chapter') {
      if (!confirm('Delete this chapter and its comic panels? This cannot be undone.')) return;
      await api(`/chapters/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' });
      await loadPage('manage-story', button.dataset.story); return;
    }
    if (action === 'story-status') { await api(`/stories/${encodeURIComponent(button.dataset.id)}`, { method: 'PATCH', body: { status: button.dataset.status } }); await loadPage('manage-story', button.dataset.id); return; }
    if (action === 'save-chapter') { await saveChapterDraft(); return; }
    if (action === 'publish-chapter') { await publishChapter(button.dataset.id, button.dataset.status); return; }
    if (action === 'quick-new-chapter') { if (!await saveChapterDraft()) return; const storyId = button.dataset.id; const story = state.pageData.story; const isComic = story.content_type === 'comic'; const chapter = await api(`/stories/${encodeURIComponent(storyId)}/chapters`, { method: 'POST', body: { title: `Chapter ${(state.pageData.chapters || []).length + 1}`, content: isComic ? '' : '<p></p>', content_type: story.content_type || 'text', has_text: !isComic, has_comic: isComic, status: 'draft' } }); navigate(`/workroom/story/${encodeURIComponent(storyId)}/chapter/${encodeURIComponent(chapter.id)}`); return; }
    if (await manuscriptActions.handleAction(action, button)) return true;
    if (action === 'follow') {
      const enabled = button.dataset.enabled === 'true'; await api(`/users/${encodeURIComponent(button.dataset.id)}/follow`, { method: enabled ? 'DELETE' : 'POST' });
      await loadPage('creator', state.pageData.user.username); return;
    }
    } catch (error) { state.pageError = error.message; render(); return true; }
    return false;
  }
  return { handleAction };
}
