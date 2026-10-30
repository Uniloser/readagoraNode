export function createDiscoveryTracking({ state, api, app, windowObject = window }) {
  let observer = null;

  function send(events) {
    if (!state.discoverySessionId || !events.length) return;
    void api('/discovery/events', { method: 'POST', body: { sessionId: state.discoverySessionId, events } }).catch(() => undefined);
  }

  function bind() {
    observer?.disconnect();
    observer = null;
    const Observer = windowObject.IntersectionObserver;
    if (!state.discoverySessionId || !Observer) return;

    state.discoveryTrackedShelves ||= new Set();
    state.discoveryTrackedStories ||= new Set();
    const targets = app.querySelectorAll('[data-discovery-shelf-view], [data-discovery-story]');
    if (!targets.length) return;

    observer = new Observer(entries => {
      const events = [];
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const shelfView = entry.target.dataset.discoveryShelfView;
        if (shelfView && !state.discoveryTrackedShelves.has(shelfView)) {
          state.discoveryTrackedShelves.add(shelfView);
          events.push({ event: 'discovery_shelf_view', shelf: shelfView });
        }

        const storyId = entry.target.dataset.discoveryStory;
        const shelf = entry.target.dataset.discoveryShelf;
        const position = Number(entry.target.dataset.discoveryPosition);
        const impressionKey = `${shelf}:${storyId}`;
        if (storyId && shelf && Number.isInteger(position) && !state.discoveryTrackedStories.has(impressionKey)) {
          state.discoveryTrackedStories.add(impressionKey);
          events.push({ event: 'story_impression', shelf, storyId, position });
        }
        observer?.unobserve(entry.target);
      }
      send(events);
    }, { threshold: 0.5 });

    targets.forEach(target => observer.observe(target));
    app.querySelectorAll('[data-discovery-story]').forEach(link => link.addEventListener('click', () => {
      const { discoveryStory: storyId, discoveryShelf: shelf, discoveryPosition } = link.dataset;
      const position = Number(discoveryPosition);
      if (!storyId || !shelf || !Number.isInteger(position)) return;
      send([
        { event: 'story_click', shelf, storyId, position },
        { event: 'story_open', shelf, storyId, position },
      ]);
    }));
  }

  return { bind };
}
