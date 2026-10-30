import { authIntentHref } from '../auth/redirects.js';

const COOLDOWN_MS = 30 * 60 * 1000;
const LAST_SHOWN_KEY = 'readagora:last-story-ad-time';
const READER_ID_KEY = 'readagora:story-ad-reader-id';

export function createStoryAdFeature({ state, api, app, render, navigate, esc, image }) {
  function readerId() {
    try {
      const saved = localStorage.getItem(READER_ID_KEY);
      if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)) return saved;
    } catch { /* Keep a session-only reader ID when browser storage is unavailable. */ }
    const id = globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, value => {
      const random = Math.floor(Math.random() * 16);
      return (value === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
    try { localStorage.setItem(READER_ID_KEY, id); } catch { /* The in-memory ID still works for this session. */ }
    return id;
  }

  async function load() {
    if (state.storyAdLoaded || state.storyAdLoading || state.isOffline) return;
    state.storyAdLoading = true;
    try {
      if (state.session) {
        let subscription;
        try { subscription = await api('/subscriptions/me'); }
        catch { return; }
        if (['ACTIVE', 'GRACE_PERIOD'].includes(String(subscription?.status || '').toUpperCase())) {
          const hadOpenAd = state.storyAdOpen;
          state.storyAdOpen = false;
          state.storyAdIsPro = true;
          if (hadOpenAd) render();
          return;
        }
        state.storyAdIsPro = false;
      }

      let lastShownAt = 0;
      try { lastShownAt = Number(localStorage.getItem(LAST_SHOWN_KEY)) || 0; } catch { /* Ignore unavailable storage. */ }
      if (lastShownAt && Date.now() - lastShownAt < COOLDOWN_MS) return;

      const sessionId = readerId();
      const ad = await api(`/ads/story?session_id=${encodeURIComponent(sessionId)}`);
      if (!ad?.id || !ad.story_id) return;
      state.storyAd = ad;
      state.storyAdReaderId = sessionId;
      state.storyAdSaved = false;
      state.storyAdError = '';
      state.storyAdOpen = true;
      try { localStorage.setItem(LAST_SHOWN_KEY, String(Date.now())); } catch { /* Show once per app session if storage is unavailable. */ }
      void api(`/ads/${encodeURIComponent(ad.id)}/impression`, { method: 'POST', body: { session_id: sessionId } }).catch(() => undefined);
      render();
    } catch {
      // Story promotions are optional and must never block discovery.
    } finally {
      state.storyAdLoading = false;
      state.storyAdLoaded = true;
    }
  }

  function close() {
    state.storyAdOpen = false;
    render();
    app.querySelector('.discover-tabs button, .story-card-link')?.focus({ preventScroll: true });
  }

  async function handleAction(action, button) {
    if (action === 'story-ad-close') { close(); return true; }
    if (action === 'story-ad-read') {
      const ad = state.storyAd;
      if (!ad?.story_id) return true;
      state.storyAdOpen = false;
      void api(`/ads/${encodeURIComponent(ad.id)}/click`, { method: 'POST', body: { session_id: state.storyAdReaderId } }).catch(() => undefined);
      navigate(`/story/${encodeURIComponent(ad.story_id)}`);
      return true;
    }
    if (action !== 'story-ad-save') return false;
    const ad = state.storyAd;
    if (!ad?.story_id) return true;
    if (!state.session) {
      navigate(authIntentHref('/', { action: 'bookmark', entityId: String(ad.story_id) }));
      return true;
    }
    if (state.storyAdSaving || state.storyAdSaved) return true;
    state.storyAdSaving = true;
    state.storyAdError = '';
    button.disabled = true;
    render();
    try {
      const bookmarks = await api('/bookmarks');
      if (!(bookmarks || []).some(item => String(item.story_id) === String(ad.story_id) && !item.chapter_id)) {
        await api('/bookmarks', { method: 'POST', body: { story_id: ad.story_id } });
      }
      state.storyAdSaved = true;
      state.bookmarkedStoryIds?.add(String(ad.story_id));
    } catch (error) {
      state.storyAdError = error?.message || 'Could not save this story. Please try again.';
    } finally {
      state.storyAdSaving = false;
      render();
      app.querySelector('[data-action="story-ad-save"]')?.focus({ preventScroll: true });
    }
    return true;
  }

  function dialogView() {
    const ad = state.storyAd;
    if (!state.storyAdOpen || !ad) return '';
    const creative = ad.presentation || {};
    const story = ad.story || {};
    const accent = /^#[0-9a-f]{6}$/i.test(creative.accentColor || '') ? creative.accentColor : '';
    const title = creative.headline || ad.title || story.title || 'A story to discover';
    const description = creative.tagline || ad.description || story.description || '';
    const cover = creative.promoImage || ad.image_url || story.cover_url;
    const genres = creative.showGenres === false ? [] : [story.genre, ...(story.tags || [])].filter(Boolean).slice(0, 3);
    const badge = creative.badgeText || 'Sponsored Story';
    const cta = creative.ctaText || ad.button_text || 'Read story';
    return `<div class="story-ad-backdrop"><section class="story-ad-dialog" role="dialog" aria-modal="true" aria-labelledby="story-ad-title" ${accent ? `style="--story-ad-accent:${accent}"` : ''}><button class="story-ad-close" type="button" data-action="story-ad-close" aria-label="Close sponsored story">&times;</button><div class="story-ad-cover">${image(cover, title)}<span class="story-ad-badge">${esc(badge)}</span></div><div class="story-ad-copy"><span class="eyebrow">A READAGORA PICK</span><h2 id="story-ad-title">${esc(title)}</h2>${story.title && story.title !== title ? `<p class="story-ad-series">${esc(story.title)}</p>` : ''}${description ? `<p>${esc(description)}</p>` : ''}${genres.length ? `<div class="story-ad-genres">${genres.map(genre => `<span>${esc(genre)}</span>`).join('')}</div>` : ''}${ad.promotion_type === 'reward' && Number(ad.reward_gems_remaining || 0) > 0 ? '<p class="story-ad-reward">Read a chapter to earn 1 Gem while campaign rewards remain.</p>' : ''}${state.storyAdError ? `<p class="form-message error" role="alert">${esc(state.storyAdError)}</p>` : ''}<div class="story-ad-actions"><button class="primary-button" type="button" data-action="story-ad-read">${esc(cta)} <span aria-hidden="true">&#8594;</span></button>${creative.showSave !== false ? `<button class="outline-button" type="button" data-action="story-ad-save" ${state.storyAdSaving || state.storyAdSaved ? 'disabled' : ''}>${state.storyAdSaving ? 'Saving...' : state.storyAdSaved ? 'Saved to library' : 'Save to library'}</button>` : ''}</div></div></section></div>`;
  }

  return { load, handleAction, dialogView };
}
