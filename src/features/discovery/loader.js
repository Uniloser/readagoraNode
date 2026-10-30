export function createDiscoveryLoader({ state, api, render, loadStoryAd }) {
  let requestId = 0;
  let siteAdsRequestId = 0;

  function invalidate() {
    requestId++;
  }

  async function loadSiteAds() {
    if (state.siteAdsLoaded || state.siteAdsLoading) return;
    const currentRequest = ++siteAdsRequestId;
    state.siteAdsLoading = true;
    try {
      let ads;
      try {
        ads = await api('/ads/site/all');
      } catch {
        const ad = await api('/ads/site');
        ads = ad ? [ad] : [];
      }
      if (currentRequest === siteAdsRequestId) state.siteAds = Array.isArray(ads) ? ads : [];
    } catch {
      if (currentRequest === siteAdsRequestId) state.siteAds = [];
    } finally {
      if (currentRequest === siteAdsRequestId) {
        state.siteAdsLoading = false;
        state.siteAdsLoaded = true;
        render();
      }
    }
  }

  async function loadHome() {
    const currentRequest = ++requestId;
    state.loading = true;
    state.error = '';
    render();

    try {
      const optional = path => api(path)
        .then(value => ({ value, error: '' }))
        .catch(error => ({ value: null, error: error.message || 'Could not load followed content.' }));
      const [result, trending, newest, followed, followedCreatorsResult, creatorPostsResult, bookmarks] = await Promise.all([
        api('/discovery'),
        api('/discover/trending?limit=18').catch(() => []),
        api('/discover?limit=18').catch(() => []),
        state.session ? api('/discover/following?limit=18').catch(() => []) : Promise.resolve([]),
        state.session ? optional('/users/me/following?limit=18') : Promise.resolve({ value: [], error: '' }),
        state.session ? optional('/community?tab=following&offset=0') : Promise.resolve({ value: { items: [] }, error: '' }),
        state.session ? api('/bookmarks').catch(() => []) : Promise.resolve([]),
      ]);
      if (currentRequest !== requestId) return;

      const discoverySessionId = result.recommendationSessionId || '';
      if (discoverySessionId !== state.discoverySessionId) {
        state.discoveryTrackedShelves = new Set();
        state.discoveryTrackedStories = new Set();
      }
      state.discoverySessionId = discoverySessionId;
      const shelves = result.shelves || [];
      state.discoverySessionShelfIds = new Set(shelves.map(shelf => String(shelf.id)).filter(Boolean));
      const recentlyUpdatedIds = new Set(shelves
        .filter(shelf => shelf.type === 'recently_updated')
        .flatMap(shelf => shelf.stories || [])
        .map(story => story.id));
      const newReleases = newest.filter(story => !recentlyUpdatedIds.has(story.id));
      const normalizedShelves = shelves.map(shelf => shelf.type === 'new'
        ? { ...shelf, stories: (shelf.stories || []).filter(story => !recentlyUpdatedIds.has(story.id)) }
        : shelf);
      const types = new Set(shelves.map(shelf => shelf.type));

      state.rankingLists = {
        hot: trending.length ? trending : (shelves.find(shelf => shelf.type === 'trending')?.stories || []),
        rising: shelves.find(shelf => shelf.type === 'rising')?.stories || [],
        new: newReleases,
      };
      state.comicStories = [...new Map(shelves
        .filter(shelf => shelf.type !== 'ai_generated')
        .flatMap(shelf => shelf.stories || [])
        .filter(story => story.content_type === 'comic')
        .map(story => [story.id, story])).values()];
      state.followedStories = followed || [];
      state.followedCreators = followedCreatorsResult.value || [];
      state.creatorFeedPosts = creatorPostsResult.value?.items || [];
      state.bookmarkedStoryIds = new Set((bookmarks || []).map(bookmark => String(bookmark.story_id)).filter(Boolean));
      state.followedContentErrors = {
        following: followedCreatorsResult.error,
        creatorPosts: creatorPostsResult.error,
      };

      if (!types.has('trending') && trending.length) normalizedShelves.push({ id: 'trending-fallback', type: 'trending', title: 'Trending Now (Ranked)', stories: trending });
      if (!types.has('new') && newReleases.length) normalizedShelves.push({ id: 'new-releases', type: 'new', title: 'New Releases', stories: newReleases });
      state.shelves = normalizedShelves;
    } catch (error) {
      if (currentRequest === requestId) {
        state.error = error?.message || 'The ReadAgora server could not load stories. Please try again.';
        state.followedCreators = [];
        state.creatorFeedPosts = [];
      }
    } finally {
      if (currentRequest === requestId) {
        state.loading = false;
        state.homeLoaded = true;
        render();
        void loadSiteAds();
        void loadStoryAd?.();
      }
    }
  }

  return { loadHome, invalidate, loadSiteAds };
}
