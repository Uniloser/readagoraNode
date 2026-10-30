export function createDiscoveryInteractions({ state, app, openSearch, scheduleSearch, cancelScheduledSearch, searchStories, render }) {
  function bind() {
    app.querySelector('[data-scroll]')?.addEventListener('click', () => document.querySelector('#discover')?.scrollIntoView({ behavior: 'smooth' }));
    app.querySelectorAll('.search-toggle,.inline-search,.banner-button,[data-open-search]').forEach(button => button.addEventListener('click', () => openSearch()));
    app.querySelector('[data-page-search]')?.addEventListener('input', event => {
      state.query = event.currentTarget.value;
      if (state.query && state.searchGenre) {
        state.searchGenre = '';
        app.querySelector('[data-search-genre-filter]')?.remove();
        const description = app.querySelector('[data-search-description]');
        if (description) description.textContent = 'Search stories by title, genre, or creator.';
      }
      scheduleSearch(state.query);
    });
    app.querySelector('[data-search-form]')?.addEventListener('submit', event => {
      event.preventDefault();
      const input = app.querySelector('[data-page-search]');
      state.query = input?.value || '';
      state.searchGenre = '';
      cancelScheduledSearch();
      history.replaceState({}, '', state.query ? `/search?q=${encodeURIComponent(state.query)}` : '/search');
      void searchStories(state.query);
    });
    app.querySelectorAll('[data-discover-tab]').forEach(button => button.addEventListener('click', () => {
      state.genreFilter = button.dataset.genre || 'all';
      state.formatFilter = button.dataset.format || 'all';
      render();
    }));
    app.querySelectorAll('[data-shelf-scroll]').forEach(button => button.addEventListener('click', () => {
      const rail = button.closest('.shelf')?.querySelector('.story-rail');
      if (rail) rail.scrollBy({ left: Number(button.dataset.shelfScroll) * Math.max(240, rail.clientWidth * 0.82), behavior: 'smooth' });
    }));
    app.querySelectorAll('.story-rail').forEach(rail => rail.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      rail.scrollBy({ left: event.key === 'ArrowRight' ? 240 : -240, behavior: 'smooth' });
    }));
    app.querySelector('[data-ranking-sort]')?.addEventListener('change', event => {
      state.rankingSort = event.target.value;
      render();
    });
    app.querySelector('[data-ranking-expand]')?.addEventListener('click', () => {
      const more = app.querySelector('.ranking-more');
      if (!more) return;
      more.open = true;
      more.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  return { bind };
}
