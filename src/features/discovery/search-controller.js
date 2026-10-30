export function createSearchController({ api, esc, image, author, navigate }) {
  let debounceTimer = null;
  let requestId = 0;

  function searchResults() {
    return `<div class="search-overlay"><div class="search-dialog"><button class="close-search" aria-label="Close search">×</button><span class="eyebrow">FIND YOUR NEXT WORLD</span><input id="overlay-search" autofocus type="search" placeholder="A title, genre, or creator…" /><div id="search-results" class="search-results"><p>Start typing to explore ReadAgora.</p></div></div></div>`;
  }

  function openSearch(message = '') {
    if (!document.querySelector('.search-overlay')) document.body.insertAdjacentHTML('beforeend', searchResults());
    const overlay = document.querySelector('.search-overlay');
    overlay.classList.add('visible');
    const results = overlay.querySelector('#search-results');
    results.innerHTML = message ? `<p>${esc(message)}</p>` : '<p>Start typing to explore ReadAgora.</p>';
    const input = overlay.querySelector('#overlay-search'); input.focus();
    input.addEventListener('input', () => scheduleSearch(input.value));
    input.addEventListener('keydown', event => { if (event.key === 'Escape') overlay.remove(); });
    overlay.querySelector('.close-search').addEventListener('click', () => overlay.remove());
  }

  function renderStories(results, stories, emptyMessage) {
    results.innerHTML = stories?.length ? stories.slice(0, 40).map(story => `<a class="search-hit" href="/story/${encodeURIComponent(story.id)}" data-result-link>${image(story.cover_url, story.title)}<span><b>${esc(story.title)}</b><small>${esc(author(story))} &#183; ${esc(story.genre || 'Original')}</small></span><i>&#8599;</i></a>`).join('') : `<p>${esc(emptyMessage)}</p>`;
    results.querySelectorAll('[data-result-link]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); document.querySelector('.search-overlay')?.remove(); navigate(link.getAttribute('href')); }));
  }

  async function searchStories(query) {
    const results = document.querySelector('.search-overlay.visible #search-results') || document.querySelector('.search-page #search-results');
    const currentRequest = ++requestId;
    if (!results || !query.trim()) { if (results) results.innerHTML = '<p>Start typing to explore ReadAgora.</p>'; return; }
    results.innerHTML = '<p>Searching&#8230;</p>';
    try {
      const stories = await api(`/search?q=${encodeURIComponent(query.trim())}`);
      if (currentRequest !== requestId) return;
      renderStories(results, stories, 'No stories found. Try another title or genre.');
    } catch (error) { if (currentRequest === requestId) results.innerHTML = `<p>${esc(error.message)}</p>`; }
  }

  async function searchGenreStories(genre) {
    const results = document.querySelector('.search-overlay.visible #search-results') || document.querySelector('.search-page #search-results');
    const currentRequest = ++requestId;
    if (!results || !genre.trim()) return;
    results.innerHTML = '<p>Loading stories in this genre&#8230;</p>';
    try {
      const stories = await api(`/discover?genre=${encodeURIComponent(genre.trim())}`);
      if (currentRequest !== requestId) return;
      renderStories(results, stories, `No stories found in ${genre.trim()}. Try another genre.`);
    } catch (error) { if (currentRequest === requestId) results.innerHTML = `<p>${esc(error.message)}</p>`; }
  }

  function scheduleSearch(query) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => { void searchStories(query); }, 220);
  }

  function cancelScheduledSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
  }

  return { openSearch, searchStories, searchGenreStories, scheduleSearch, cancelScheduledSearch };
}