export function createLibraryViews({ state, esc, image, icon }) {
function libraryView() {
  const data = state.pageData || {};
  const savedTab = state.libraryTab === 'saved';
  const offlineTab = state.libraryTab === 'offline';
  const offlineDownloads = data.offlineDownloads || [];
  const entries = savedTab ? data.bookmarks || [] : data.library || [];
  const query = String(state.libraryQuery || '').trim().toLocaleLowerCase();
  const sort = state.librarySort || 'recent';
  const storyFor = entry => entry.story || entry;
  const matchingEntries = entries.filter(entry => {
    const story = storyFor(entry);
    const authorName = story.author?.display_name || story.author?.username || '';
    return `${story.title || ''} ${authorName}`.toLocaleLowerCase().includes(query);
  });
  if (sort === 'title') matchingEntries.sort((a, b) => String(storyFor(a).title || '').localeCompare(String(storyFor(b).title || '')));
  else matchingEntries.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

  const cards = matchingEntries.map(entry => {
    const story = storyFor(entry);
    const storyId = story.id || entry.story_id;
    const chapterId = entry.last_chapter_id || entry.chapter_id;
    const destination = chapterId ? `/read/${encodeURIComponent(storyId)}/${encodeURIComponent(chapterId)}` : `/story/${encodeURIComponent(storyId)}`;
    const actionLabel = chapterId && !savedTab ? 'Continue reading' : chapterId ? 'Open saved chapter' : 'Start reading';
    const authorName = story.author?.display_name || story.author?.username || '';
    const timestamp = entry.updated_at || entry.created_at;
    const date = timestamp && !Number.isNaN(new Date(timestamp).getTime())
      ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp))
      : '';
    const searchText = `${story.title || ''} ${authorName}`.toLocaleLowerCase();
    return `<article class="library-card" data-library-entry data-search="${esc(searchText)}" data-updated="${esc(timestamp || '')}" data-title="${esc(story.title || '')}"><a class="library-cover-link" href="/story/${encodeURIComponent(storyId)}" data-link aria-label="Open ${esc(story.title || 'story')}">${image(story.cover_url, story.title || 'Story cover')}${chapterId && !savedTab ? '<span class="library-status">Reading</span>' : ''}</a><div class="library-card-content"><h2><a href="/story/${encodeURIComponent(storyId)}" data-link>${esc(story.title || 'Untitled story')}</a></h2>${authorName ? `<p class="library-author">by ${esc(authorName)}</p>` : ''}${date ? `<p class="library-date">${savedTab ? 'Saved' : 'Last read'} ${esc(date)}</p>` : ''}<a class="continue-link" href="${destination}" data-link>${actionLabel} <span aria-hidden="true">→</span></a>${savedTab ? `<button class="subtle-button" type="button" data-action="unsave" data-id="${esc(storyId)}">Remove from saved</button>` : ''}</div></article>`;
  }).join('');
  const tabs = `<div class="segmented library-tabs" role="group" aria-label="Library stories"><button type="button" aria-pressed="${!savedTab && !offlineTab}" class="${!savedTab && !offlineTab ? 'selected' : ''}" data-action="library-tab" data-tab="continue">Continue reading</button><button type="button" aria-pressed="${savedTab}" class="${savedTab ? 'selected' : ''}" data-action="library-tab" data-tab="saved">Saved stories</button><button type="button" aria-pressed="${offlineTab}" class="${offlineTab ? 'selected' : ''}" data-action="library-tab" data-tab="offline">Offline downloads (${offlineDownloads.length})</button></div>`;
  if (offlineTab) return `<div class="library-intro"><p>${state.isOffline ? 'You are offline. Your downloaded stories are ready to read. Connect to the internet to browse and sync your library.' : 'Downloaded stories stay on this browser for offline reading.'}</p></div>${tabs}${offlineDownloads.length ? `<div class="library-grid">${offlineDownloads.map(story => { const chapters = story.offline_chapters || []; const first = chapters[0]; return `<article class="library-card"><a class="library-cover-link" href="/story/${encodeURIComponent(story.id)}" data-link>${image(story.cover_url, story.title)}</a><div class="library-card-content"><h2>${esc(story.title)}</h2><p class="library-date">${chapters.length} downloaded chapters</p>${first ? `<a class="continue-link" href="/read/${encodeURIComponent(story.id)}/${encodeURIComponent(first.id)}" data-link>Read offline</a>` : ''}<button class="subtle-button" type="button" data-action="offline-remove" data-id="${esc(story.id)}">Remove download</button></div></article>`; }).join('')}</div>` : '<section class="empty-panel"><h2>No offline downloads yet</h2><p>Open a story while connected and choose Save for offline reading.</p><a class="primary-button" href="/" data-link>Discover stories</a></section>'}`;
  if (state.pageError) return `<div class="library-intro"><p>Your stories, all in one place. Pick up where you left off.</p></div>${tabs}<section class="empty-panel library-error" role="alert"><h2>We couldn't load your library</h2><p>${esc(state.pageError)}</p><button class="outline-button" type="button" data-action="library-retry">Try again</button></section>`;
  if (!entries.length) return `<div class="library-intro"><p>Your stories, all in one place. Pick up where you left off.</p></div>${tabs}<section class="empty-panel library-empty"><h2>${savedTab ? 'Your shelf is looking a little quiet.' : 'Your reading journey starts here.'}</h2><p>${savedTab ? 'Save a story while exploring, and it will be waiting for you here.' : 'When you start reading, your stories will be ready for you here.'}</p><a class="primary-button" href="/" data-link>Discover stories <span aria-hidden="true">→</span></a></section>`;
  return `<div class="library-intro"><p>Your stories, all in one place. Pick up where you left off.</p></div>${tabs}<div class="library-toolbar"><label class="library-search"><span class="sr-only">Search your library</span>${icon('search', 'library-search-icon')}<input id="library-search" type="search" value="${esc(state.libraryQuery || '')}" placeholder="Search your library" autocomplete="off"/></label><label class="library-sort"><span>Sort by</span><select id="library-sort" aria-label="Sort stories">${savedTab ? '<option value="recent">Recently saved</option>' : '<option value="recent">Recently read</option>'}<option value="title" ${sort === 'title' ? 'selected' : ''}>Title A–Z</option></select></label><span class="library-count" aria-live="polite">${matchingEntries.length} ${matchingEntries.length === 1 ? 'story' : 'stories'}</span></div><div class="library-grid">${cards}</div><div class="library-no-results" ${matchingEntries.length ? 'hidden' : ''} role="status"><h2>No stories match that search</h2><p>Try another title or creator name.</p><button class="outline-button" type="button" data-action="library-clear-search">Clear search</button></div>`;
}

function libraryLoadingView() {
  return `<div class="library-intro"><p>Your stories, all in one place. Pick up where you left off.</p></div><div class="segmented library-tabs" aria-hidden="true"><span>Continue reading</span><span>Saved stories</span></div><div class="library-grid library-loading-grid" role="status" aria-label="Loading your library">${Array.from({ length: 6 }, () => '<div class="library-skeleton"><i></i><span></span><span></span><b></b></div>').join('')}</div>`;
}


  return { libraryView, libraryLoadingView };
}
