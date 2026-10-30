import { saveSignupReturnPath, takeSignupReturnPath } from '../auth/redirects.js';
import { createChapterDraftSaver } from './chapter-draft.js';

export function createFormController(deps) {
  const { state, app, api, chapterDraftRecovery, SUPABASE_URL, SUPABASE_KEY, saveSession, resetPersonalizedHome, navigate, loadPage, loadStory, render, safeInternalPath, clearOfflineLibrary, ensureTerms, handleComicEditorForm } = deps;
  const submittingForms = new WeakSet();
  const { saveChapterDraft } = createChapterDraftSaver(deps);

function formMessage(form, message, error = false) {
  const target = form.querySelector('.form-message');
  if (target) { target.textContent = message; target.classList.toggle('is-error', error); }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submissionContext = { chapterId: state.chapter?.id, storyId: state.story?.id, pageData: state.pageData, path: location.pathname };
  if (submittingForms.has(form)) return;
  submittingForms.add(form);
  const submitControls = [...form.querySelectorAll('button:not([type]), button[type="submit"], input[type="submit"]')];
  const previousDisabledStates = submitControls.map(control => control.disabled);
  submitControls.forEach(control => { control.disabled = true; });
  form.setAttribute('aria-busy', 'true');
  const data = new FormData(form);
  const values = Object.fromEntries(data.entries());
  formMessage(form, 'Working…');
  try {
    const type = form.dataset.form;
    if (await handleComicEditorForm(type, form, values)) return;
    if (type === 'login' || type === 'signup') {
      if (type === 'signup') {
        if (String(values.password) !== String(values.confirm_password)) throw new Error('The passwords do not match.');
        saveSignupReturnPath(new URLSearchParams(location.search).get('next'));
        state.authConfirmationEmail = '';
        state.authConfirmationSent = false;
        state.authNotice = '';
      }
      const body = { email: String(values.email).trim(), password: String(values.password) };
      const authBody = { ...body, ...(type === 'signup' ? { username: String(values.username).trim() } : {}) };
      const authPath = `/auth/${type === 'login' ? 'signin' : 'signup'}`;
      const useLocalBrowserAuth = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      const browserAuth = async () => {
        // The mobile app calls this same backend directly. If the local Next.js
        // server cannot reach Render, the web app can use the same route in the
        // browser; the current local origin must be allowed by backend CORS.
        try {
          return await api(authPath, { method: 'POST', body: authBody, skipAuth: true });
        } catch (error) {
          if (error instanceof Error && /server could not be reached/i.test(error.message)) {
            throw new Error(`The browser could not reach the ReadAgora API. Check that Render CORS allows ${location.origin}, then try again.`);
          }
          throw error;
        }
      };
      let result;
      if (useLocalBrowserAuth) {
        // Local Next.js server-side fetches to Render can fail even when the
        // browser can reach it, so avoid adding a failed proxy round trip here.
        result = await browserAuth();
      } else {
        const response = await fetch(`/api/auth/${type === 'login' ? 'signin' : 'signup'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authBody) });
        result = await response.json().catch(() => ({}));
        const proxyCouldNotConnect = response.status === 502 && /could not connect to ReadAgora/i.test(String(result?.error || ''));
        if (proxyCouldNotConnect) result = await browserAuth();
        else if (!response.ok) throw new Error(result?.error || 'Unable to authenticate with ReadAgora.');
      }
      const session = result?.session;
      if (session?.access_token) {
        takeSignupReturnPath();
        state.authConfirmationEmail = '';
        state.authConfirmationSent = false;
        saveSession(session); resetPersonalizedHome(); state.user = result.user || session.user || null;
        const next = safeInternalPath(new URLSearchParams(location.search).get('next'));
        navigate(next); return;
      }
      if (type === 'signup') {
        state.authConfirmationEmail = String(values.email).trim();
        state.authConfirmationSent = false;
        render();
        return;
      }
      throw new Error('The ReadAgora server did not return a sign-in session.');
    }
    if (type === 'resend-confirmation') {
      if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Email confirmation is not configured for this website.');
      const email = String(values.email || state.authConfirmationEmail || '').trim();
      if (!email) throw new Error('Enter the email address used for your account.');
      const response = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'signup', email, options: { emailRedirectTo: `${location.origin}/auth/callback` } }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.msg || result?.message || result?.error_description || 'Could not resend the confirmation email. Wait a few minutes and try again.');
      }
      state.authConfirmationSent = true;
      render();
      return;
    }
    if (type === 'forgot') {
      if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Password reset is not configured.');
      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: String(values.email).trim(), redirect_to: `${location.origin}/auth/callback?flow=recovery` }) });
      if (!response.ok) throw new Error('Could not send the reset email. Try again.');
      formMessage(form, 'If an account matches that address, a reset link is on its way.'); return;
    }
    if (type === 'reset') {
      if (!state.session?.access_token || !SUPABASE_URL || !SUPABASE_KEY) throw new Error('Open the password reset link from your email first.');
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { method: 'PUT', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${state.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: values.password }) });
      if (!response.ok) throw new Error('Could not update your password. Request a new reset link.');
      formMessage(form, 'Password updated. You can now sign in.'); saveSession(null); resetPersonalizedHome();
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => undefined);
      return;
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
      const confirmed = window.confirm('Permanently delete your ReadAgora account? This removes your profile, stories, chapters, comments, uploads, bookmarks, follows, reading progress, and Gem balance. This cannot be undone. Save your work first.');
      if (!confirmed) { formMessage(form, 'Account deletion cancelled.'); return; }
      await api('/users/me/account', { method: 'DELETE', body: { confirmation: 'DELETE' } });
      saveSession(null); state.user = null; resetPersonalizedHome();
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => undefined);
      await clearOfflineLibrary().catch(() => undefined);
      for (const storageName of ['localStorage', 'sessionStorage']) {
        try { const storage = window[storageName]; for (const key of Object.keys(storage)) if (key.startsWith('readagora')) storage.removeItem(key); } catch { /* Account deletion already succeeded; browser storage cleanup is best effort. */ }
      }
      history.replaceState({}, '', '/account-deletion?deleted=1');
      state.page = null; state.pageData = null; state.pageLoading = false; state.pageError = '';
      render(); window.scrollTo(0, 0); return;
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
    if (type === 'promotion') {
      const storyId = String(values.story_id || '');
      const promotionType = String(values.promotion_type || 'boost');
      const durationDays = Number(values.duration_days);
      if (!storyId || !['boost', 'featured', 'reward'].includes(promotionType) || ![1, 3, 7, 14].includes(durationDays)) throw new Error('Choose a valid story and promotion package.');
      state.pendingPromotionKey ||= crypto.randomUUID();
      await api('/promotions', { method: 'POST', body: { story_id: storyId, promotion_type: promotionType, duration_days: durationDays, request_key: state.pendingPromotionKey } });
      state.pendingPromotionKey = null;
      await loadPage('profile-promotions'); return;
    }
    if (type === 'report') {
      const description = String(values.description || '').trim();
      if (!description) throw new Error('Add a few details so the team can investigate.');
      const body = { category: String(values.category || 'technical_issue'), description };
      for (const key of ['story_id', 'chapter_id', 'comment_id', 'reported_user_id']) if (typeof values[key] === 'string' && values[key]) body[key] = String(values[key]);
      await api('/reports', { method: 'POST', body });
      form.reset(); formMessage(form, 'Report sent. Thank you for helping us improve ReadAgora.'); return;
    }
    if (type === 'moderation-decision') {
      const action = String(values.action || 'dismiss');
      const reason = String(values.reason || '').trim();
      if (reason.length < 10) throw new Error('Add at least 10 characters explaining the decision.');
      if (action !== 'dismiss' && !window.confirm(action === 'remove_content' ? 'Remove this reported content? This cannot be undone.' : 'Restrict this reported account? This cannot be undone here.')) { formMessage(form, 'Decision cancelled.'); return; }
      await api(`/moderation/reports/${encodeURIComponent(String(values.report_id))}`, { method: 'PATCH', body: { action, reason } });
      await loadPage('profile-moderation'); return;
    }
    if (['post', 'new-story', 'story-settings', 'new-chapter', 'edit-chapter', 'post-comment', 'chapter-comment'].includes(type)) await ensureTerms(form);
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
      const story = await api('/stories', { method: 'POST', body: { title: String(values.title).trim(), genre: String(values.genre).trim(), description: String(values.description).trim(), content_type: values.content_type || 'text', is_ai_generated: values.is_ai_generated === 'on', is_ai_assisted: values.is_ai_assisted === 'on', is_mature: values.is_mature === 'on', content_warnings: data.getAll('content_warnings') } });
      if (values.cover instanceof File && values.cover.size) {
        const upload = new FormData(); upload.append('file', values.cover);
        const cover = await api('/uploads/cover', { method: 'POST', body: upload });
        await api(`/stories/${encodeURIComponent(story.id)}`, { method: 'PATCH', body: { cover_url: cover.url } });
      }
      document.querySelector('.modal-backdrop')?.remove(); navigate(`/workroom/story/${encodeURIComponent(story.id)}`); return;
    }
    if (type === 'story-settings') {
      const patch = { title: String(values.title).trim(), description: String(values.description).trim(), genre: String(values.genre).trim(), is_ai_generated: values.is_ai_generated === 'on', is_ai_assisted: values.is_ai_assisted === 'on', is_mature: values.is_mature === 'on', content_warnings: data.getAll('content_warnings') };
      const creatorStatus = state.pageData?.monetization?.status;
      const accessType = String(values.access_type || state.pageData?.story?.access_type || 'FREE');
      if (accessType === 'FREE' || creatorStatus === 'APPROVED') patch.access_type = accessType;
      if (accessType === 'PREMIUM' && creatorStatus === 'APPROVED') patch.free_chapter_count = Number(values.free_chapter_count);
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
      const job = { stage: 'processing', storyId: String(values.story_id), filename: file.name };
      state.workroomImport = job; render();
      const current = () => state.workroomImport === job && state.page === 'manuscript-import' && state.pageData?.story?.id === job.storyId;
      try {
        const result = await api('/imports', { method: 'POST', body: formData });
        job.importId = result.importId;
        const preview = await api(`/imports/${encodeURIComponent(result.importId)}/preview`);
        Object.assign(job, { stage: 'preview', preview });
        if (current()) { state.pageError = ''; render(); }
      } catch (error) {
        Object.assign(job, { stage: 'upload', error: error.message || 'Could not process the manuscript.' });
        if (current()) render();
      }
      return;
    }
    if (type === 'edit-chapter') {
      await api(`/chapters/${encodeURIComponent(values.chapter_id)}`, { method: 'PATCH', body: { title: String(values.title).trim(), content: String(values.content) } });
      formMessage(form, 'Chapter saved.'); await loadPage('manage-story', values.story_id); return;
    }
    if (type === 'post-comment') {
      const postId = String(values.post_id || '');
      const current = () => state.page === 'community-post' && state.pageData === submissionContext.pageData && state.pageData?.post?.id === postId;
      if (!current()) return;
      await api(`/community/posts/${encodeURIComponent(values.post_id)}/comments`, { method: 'POST', body: { content: String(values.content).trim(), parent_comment_id: values.parent_comment_id || undefined } });
      if (!current() || !form.isConnected) return;
      state.communityCommentReply = '';
      await loadPage('community-post', values.post_id); return;
    }
    if (type === 'chapter-comment') {
      const { chapterId, storyId } = submissionContext;
      const current = () => location.pathname === submissionContext.path && state.chapter?.id === chapterId && state.story?.id === storyId;
      if (!chapterId || !storyId || !current()) return;
      const parentCommentId = String(values.parent_comment_id || '');
      const created = await api(`/chapters/${encodeURIComponent(chapterId)}/comments`, { method: 'POST', body: { text: String(values.text).trim(), parent_comment_id: parentCommentId || undefined, quote: values.quote || undefined } });
      if (!current()) return;
      if (form.isConnected) { state.replyToComment = ''; state.commentQuote = ''; }
      if (created?.id) {
        state.comments = [...(state.comments || []), created];
        if (parentCommentId) (state.expandedCommentThreads ||= new Set()).add(parentCommentId);
        render();
      } else if (form.isConnected) await loadStory(storyId, chapterId);
      return;
    }
  } catch (error) { formMessage(form, error.message || 'Could not save that. Try again.', true); }
  finally {
    submittingForms.delete(form);
    submitControls.forEach((control, index) => { control.disabled = previousDisabledStates[index]; });
    form.removeAttribute('aria-busy');
  }
}


  return { handleFormSubmit, saveChapterDraft };
}
