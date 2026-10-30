export function createSearchView({ state, esc, icon, header, footer, mobileTabs }) {
  function searchPage() {
    const query = String(state.query || '');
    const genre = String(state.searchGenre || '');
    return `${header()}<main class="workspace search-page"><section class="screen-heading"><span class="eyebrow">READAGORA / SEARCH</span><h1>Find your next story</h1><p data-search-description>${genre ? `Browsing stories tagged ${esc(genre)}.` : 'Search stories by title, genre, or creator.'}</p><form class="page-search-field" data-search-form role="search"><span aria-hidden="true">${icon('search')}</span><input id="page-search" data-page-search type="search" value="${esc(query)}" placeholder="Search stories and creators" aria-label="Search stories and creators" autocomplete="off"/><kbd>Enter</kbd></form></section><section class="search-page-results" aria-live="polite">${genre ? `<div class="search-genre-filter" data-search-genre-filter><span>Genre: <b>${esc(genre)}</b></span><a href="/search" data-link>Browse another</a></div>` : ''}<div id="search-results">${query ? '<p>Searching…</p>' : '<p>Enter a title, genre, or creator to start exploring.</p>'}</div></section></main>${footer()}${mobileTabs()}`;
  }

  return { searchPage };
}
