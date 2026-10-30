export function createStorySettingsView(deps) {
  const { state, esc, icon, image, termsField, safeText } = deps;

function manageStoryView() {
    if (state.pageLoading) return '<div class="page-loading" role="status">Loading story settings...</div>';
    const story = state.pageData?.story;
    const chapters = state.pageData?.chapters || [];
    if (!story) return state.pageError ? `<section class="empty-panel" role="alert"><h2>Story details could not load</h2><p>${esc(state.pageError)}</p><button class="outline-button" data-action="manage-story-retry">Try again</button><a class="text-link" href="/workroom" data-link>Back to Workroom</a></section>` : '<div class="empty-panel">Story not found.</div>';
    const warnings = new Set(story.content_warnings || []);
    const monetization = state.pageData?.monetization || {};
    const creatorApproved = monetization.status === 'APPROVED';
    const minimumFreeChapters = Math.max(3, Number(monetization.minimum_free_chapters || 3));
    const publishedChapterCount = chapters.filter(chapter => chapter.status === 'published').length;
    const canEnablePremium = creatorApproved && publishedChapterCount >= minimumFreeChapters;
    const cover = image(story.cover_url, story.title, 'story-cover-summary-image');
    const publishedLabel = `${publishedChapterCount} published ${publishedChapterCount === 1 ? 'chapter' : 'chapters'}`;
    const accessLabel = story.access_type === 'PREMIUM' ? 'Premium access' : 'Free access';
    const contentLabel = story.content_type === 'comic' ? 'Comic' : 'Text story';
    return `<a class="back-link" href="/workroom" data-link>← Back to workroom</a>
      <section class="panel manage-story-panel">
        <div class="manage-story-heading">
          <aside class="manage-story-aside">
            <div class="story-cover-summary-art">${cover}</div>
            <ul class="story-summary-details">
              <li><span>Status</span><strong>${esc(story.status || 'DRAFT')}</strong></li>
              <li><span>Genre</span><strong>${esc(story.genre || 'Not set')}</strong></li>
              <li><span>Format</span><strong>${contentLabel}</strong></li>
              <li><span>Access</span><strong>${accessLabel}</strong></li>
              <li><span>Chapters</span><strong>${chapters.length} total · ${publishedLabel}</strong></li>
            </ul>
          </aside>
          <div class="manage-story-intro">
            <div>
              <span class="eyebrow">${esc(story.status || 'DRAFT')} / ${esc(story.genre || 'STORY')}</span>
              <h2>${esc(story.title)}</h2>
              <p>${esc(story.description || 'Add a description to introduce your story.')}</p>
            </div>
            <div class="story-manage-actions">
              <a class="outline-button" href="/story/${encodeURIComponent(story.id)}" data-link>Preview</a>
              ${story.content_type !== 'comic' ? `<a class="outline-button" href="/workroom/story/${encodeURIComponent(story.id)}/import" data-link>Import manuscript</a>` : ''}
              <button class="outline-button" type="button" data-action="story-status" data-id="${esc(story.id)}" data-status="${story.status === 'published' ? 'draft' : 'published'}">${story.status === 'published' ? 'Unpublish story' : 'Publish story'}</button>
              <button class="danger-button" type="button" data-action="delete-story" data-id="${esc(story.id)}">Delete story</button>
            </div>
          </div>
        </div>
        <form data-form="story-settings">
          <input type="hidden" name="story_id" value="${esc(story.id)}"/>
          <label>Title<input name="title" value="${esc(story.title)}" required maxlength="200"/></label>
          <label>Description<textarea name="description" maxlength="5000">${esc(story.description || '')}</textarea></label>
          <label>Genre<input name="genre" value="${esc(story.genre || '')}" required maxlength="80"/></label>
          <fieldset class="monetization-fields">
            <legend>Monetization</legend>
            <label>Story access<select name="access_type" data-story-access><option value="FREE" ${story.access_type !== 'PREMIUM' ? 'selected' : ''}>Free for readers</option><option value="PREMIUM" ${story.access_type === 'PREMIUM' ? 'selected' : ''} ${canEnablePremium || story.access_type === 'PREMIUM' ? '' : 'disabled'}>Premium chapters</option></select></label>
            <p class="muted-copy">${creatorApproved ? 'Readers can unlock paid chapters with Agora Coins after the free preview.' : `Premium stories require an approved Creator Center account. Current status: ${esc(monetization.status || 'NOT_ELIGIBLE').replaceAll('_', ' ').toLowerCase()}.`}${!canEnablePremium && story.access_type !== 'PREMIUM' ? ` Publish at least ${minimumFreeChapters} chapters before enabling premium access.` : ''}</p>
            <div data-free-chapter-count ${story.access_type === 'PREMIUM' ? '' : 'hidden'}>
              <label>Free preview chapters<input name="free_chapter_count" type="number" min="${minimumFreeChapters}" max="${Math.max(minimumFreeChapters, publishedChapterCount)}" value="${Math.max(minimumFreeChapters, Number(story.free_chapter_count || minimumFreeChapters))}" ${story.access_type === 'PREMIUM' && creatorApproved ? '' : 'disabled'} ${story.access_type === 'PREMIUM' && creatorApproved ? 'required' : ''}/></label>
              <small class="muted-copy">At least ${minimumFreeChapters} published chapters must stay free. There are ${publishedChapterCount} published chapters.</small>
            </div>
            <a class="text-link" href="/profile/creator-center" data-link>View monetization eligibility and earnings</a>
          </fieldset>
          <label>Cover image<input name="cover" type="file" accept="image/*"/><small>Upload a cover image, or leave this empty to keep the current one.</small></label>
          <fieldset class="story-disclosure-fields">
            <legend>Reader information</legend>
            <label class="check-label"><input type="checkbox" name="is_ai_generated" ${story.is_ai_generated ? 'checked' : ''}/> This story is fully AI-generated</label>
            <label class="check-label"><input type="checkbox" name="is_ai_assisted" ${story.is_ai_assisted ? 'checked' : ''}/> I used AI tools to assist with this story</label>
            <label class="check-label"><input type="checkbox" name="is_mature" ${story.is_mature ? 'checked' : ''}/> This story contains mature themes</label>
            <span class="muted-copy">Content warnings</span>
            ${[['graphic_violence','Graphic violence'],['profanity','Profanity'],['sensitive_content','Sensitive content'],['sexual_content','Sexual content']].map(([value,label]) => `<label class="check-label"><input type="checkbox" name="content_warnings" value="${value}" ${warnings.has(value) ? 'checked' : ''}/> ${label}</label>`).join('')}
          </fieldset>
          <div class="form-message" aria-live="polite"></div>
          <button class="outline-button" type="submit">Save story details</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-heading"><div><h2>Chapters</h2><p>${chapters.length} chapters · edit text, arrange comic panels, and publish episodes.</p></div></div>
        <form class="new-chapter-form" data-form="new-chapter">
          <input type="hidden" name="story_id" value="${esc(story.id)}"/>
          <label>Chapter title<input name="title" maxlength="200" required placeholder="Chapter title"/></label>
          <div class="form-message" aria-live="polite"></div>
          <button class="primary-button" type="submit">Create chapter draft</button>
        </form>
        <div class="managed-chapter-list">${chapters.map((chapter,index) => `<article class="managed-chapter-row">
          <span class="chapter-order">${String(index+1).padStart(2,'0')}</span>
          <div class="chapter-order-actions">
            <button class="subtle-button" type="button" data-action="move-chapter" data-index="${index}" data-direction="-1" aria-label="Move ${esc(chapter.title)} up" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button class="subtle-button" type="button" data-action="move-chapter" data-index="${index}" data-direction="1" aria-label="Move ${esc(chapter.title)} down" ${index === chapters.length-1 ? 'disabled' : ''}>↓</button>
          </div>
          <div><b>${esc(chapter.title)}</b><small>${esc(chapter.status)} · ${Number(chapter.word_count || 0).toLocaleString()} words</small></div>
          <a class="outline-button" href="/workroom/story/${encodeURIComponent(story.id)}/chapter/${encodeURIComponent(chapter.id)}" data-link>Edit chapter</a>
          <button class="subtle-button" type="button" data-action="chapter-status" data-id="${esc(chapter.id)}" data-story="${esc(story.id)}" data-status="${chapter.status === 'published' ? 'draft' : 'published'}">${chapter.status === 'published' ? 'Unpublish' : 'Publish'}</button>
          <button class="subtle-button" type="button" data-action="delete-chapter" data-id="${esc(chapter.id)}" data-story="${esc(story.id)}">Delete</button>
        </article>`).join('') || '<div class="empty-panel"><h3>No chapters yet</h3><p>Create a chapter draft to open the writing editor.</p></div>'}</div>
      </section>`;
  }
  return { manageStoryView };
}
