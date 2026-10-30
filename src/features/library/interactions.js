export function bindLibraryInteractions({ state, app }) {
  app.querySelector('#library-search')?.addEventListener('input', event => {
    state.libraryQuery = event.target.value;
    const query = state.libraryQuery.trim().toLocaleLowerCase();
    const cards = [...app.querySelectorAll('[data-library-entry]')];
    let visible = 0;
    cards.forEach(card => { card.hidden = !card.dataset.search.includes(query); if (!card.hidden) visible++; });
    const noResults = app.querySelector('.library-no-results');
    if (noResults) noResults.hidden = visible > 0;
    const count = app.querySelector('.library-count');
    if (count) count.textContent = `${visible} ${visible === 1 ? 'story' : 'stories'}`;
  });
  app.querySelector('#library-sort')?.addEventListener('change', event => {
    state.librarySort = event.target.value;
    const grid = app.querySelector('.library-grid');
    if (!grid) return;
    const cards = [...grid.querySelectorAll('[data-library-entry]')];
    cards.sort((a, b) => event.target.value === 'title'
      ? a.dataset.title.localeCompare(b.dataset.title)
      : new Date(b.dataset.updated || 0) - new Date(a.dataset.updated || 0));
    cards.forEach(card => grid.append(card));
  });
}
