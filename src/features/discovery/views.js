export function createDiscoveryViews(deps) {
  const { state, esc, icon, image, author, storyCard } = deps;

  function discoveryStoryTracking(shelf, story) {
    const position = shelf.positions?.[story.id];
    if (!shelf.id || !state.discoverySessionShelfIds?.has(String(shelf.id)) || position == null || !Number.isInteger(Number(position))) return '';
    return `data-discovery-story="${esc(String(story.id))}" data-discovery-shelf="${esc(String(shelf.id))}" data-discovery-position="${Number(position)}"`;
  }

  function discoveryStories() {
    return [...new Map([
      ...state.shelves.flatMap(shelf => shelf.stories || []),
      ...Object.values(state.rankingLists).flat(),
      ...state.comicStories,
      ...state.followedStories,
    ].filter(story => story?.id).map(story => [story.id, story])).values()];
  }
  
  function filterStories(stories = []) {
    return stories.filter(story => {
      const genreMatch = state.genreFilter === 'all' || story.genre?.toLocaleLowerCase() === state.genreFilter;
      const formatMatch = state.formatFilter === 'all'
        || (state.formatFilter === 'comic' ? story.content_type === 'comic' : story.content_type !== 'comic');
      return genreMatch && formatMatch;
    });
  }
  
  function featuredDiscoveryStory() {
    const candidates = [
      ...state.shelves.filter(shelf => shelf.type === 'for_you').flatMap(shelf => shelf.stories || []),
      ...state.shelves.filter(shelf => shelf.type === 'recently_updated').flatMap(shelf => shelf.stories || []),
      ...discoveryStories(),
    ];
    return filterStories([...new Map(candidates.filter(story => story?.id).map(story => [story.id, story])).values()])[0] || null;
  }
  
  function discoveryControls() {
    const genres = [...new Set(discoveryStories().map(story => story.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const preferred = ['romance', 'fantasy', 'mystery'];
    const quickGenres = preferred.map(name => genres.find(genre => genre.toLocaleLowerCase() === name)).filter(Boolean);
    for (const genre of genres) if (quickGenres.length < 3 && !quickGenres.includes(genre)) quickGenres.push(genre);
    const moreGenres = genres.filter(genre => !quickGenres.includes(genre));
    const activeGenre = state.genreFilter !== 'all' && state.formatFilter !== 'comic' ? state.genreFilter : '';
    const tab = (label, genre, format = 'all') => `<button class="discover-tab ${state.genreFilter === genre && state.formatFilter === format ? 'active' : ''}" type="button" data-discover-tab data-genre="${esc(genre)}" data-format="${format}" aria-pressed="${state.genreFilter === genre && state.formatFilter === format}">${label}</button>`;
    return `<nav class="discover-tabs" aria-label="Explore stories">${tab('For you', 'all')} ${quickGenres.map(genre => tab(esc(genre), genre.toLocaleLowerCase())).join(' ')} ${tab('Comics', 'all', 'comic')} ${moreGenres.length ? `<details class="genre-more"><summary class="discover-tab ${moreGenres.some(genre => genre.toLocaleLowerCase() === activeGenre) ? 'active' : ''}">More genres <span aria-hidden="true">⌄</span></summary><div class="genre-menu">${moreGenres.map(genre => `<button type="button" data-discover-tab data-genre="${esc(genre.toLocaleLowerCase())}" data-format="all" aria-pressed="${genre.toLocaleLowerCase() === activeGenre}">${esc(genre)}</button>`).join('')}</div></details>` : ''}</nav>`;
  }
  
  function featuredDiscovery() {
    const story = featuredDiscoveryStory();
    if (!story) return '';
    return `<section class="discover-feature" aria-label="Featured story"><a class="discover-feature-cover" href="/story/${encodeURIComponent(story.id)}" data-link>${image(story.cover_url, story.title)}</a><div class="discover-feature-copy"><span class="eyebrow">${esc(story.content_type === 'comic' ? 'FEATURED VISUAL STORY' : 'A STORY TO DISCOVER')}</span><h2>${esc(story.title)}</h2><p class="discover-feature-author">by ${esc(author(story))}</p>${story.description ? `<p class="discover-feature-description">${esc(story.description)}</p>` : ''}<div class="discover-feature-meta"><span>${esc(story.genre || 'Original')}</span>${story.content_type === 'comic' ? '<span>Comic</span>' : ''}</div><a class="discover-feature-action" href="/story/${encodeURIComponent(story.id)}" data-link>Explore story <span aria-hidden="true">&#8594;</span></a></div></section>`;
  }
  
﻿  function rankingBoard(shelf) {
    const lists = state.rankingLists;
    const stories = filterStories(lists[state.rankingSort] || shelf.stories || []).slice(0, 10);
    const sortOptions = [
      ['hot', 'Hot', lists.hot?.length > 0],
      ['rising', 'Rising', lists.rising?.length > 0],
      ['new', 'New', lists.new?.length > 0],
    ];
    const validTrackingShelf = shelf.id && state.discoverySessionShelfIds?.has(String(shelf.id));
    const rows = stories.map((story, index) => {
      const storyId = String(story.id);
      const title = esc(story.title);
      const genre = esc(story.genre || 'Original');
      const views = Number(story.view_count || 0).toLocaleString();
      const parts = Number(story.chapters_published || 0);
      const saved = state.bookmarkedStoryIds?.has(storyId) || false;
      const href = `/story/${encodeURIComponent(storyId)}`;
      const tracking = discoveryStoryTracking(shelf, story);
      return `<tr class="ranking-row">
        <td class="ranking-rank-cell"><span class="ranking-number" aria-label="Rank ${index + 1}">${String(index + 1).padStart(2, '0')}</span></td>
        <td class="ranking-cover-cell"><a class="ranking-cover-link" href="${href}" data-link aria-label="Open ${title}"><div class="ranking-cover">${image(story.cover_url, story.title)}</div></a></td>
        <td class="ranking-story-cell"><a class="ranking-story-link" href="${href}" data-link ${tracking}><b>${title}</b><span>by ${esc(author(story))}</span></a><div class="ranking-mobile-meta"><span class="ranking-genre-chip">${genre}</span><span>${icon('eye', 'ranking-icon')}${views}</span><span>${icon('list', 'ranking-icon')}${parts}</span></div></td>
        <td class="ranking-genre-cell"><span class="ranking-genre-chip">${genre}</span></td>
        <td class="ranking-views-cell"><span>${icon('eye', 'ranking-icon')}${views}</span></td>
        <td class="ranking-parts-cell"><span>${icon('list', 'ranking-icon')}${parts}</span></td>
        <td class="ranking-save-cell"><button class="ranking-save-button ${saved ? 'is-saved' : ''}" type="button" data-save="${esc(storyId)}" data-title="${title}" data-saved="${saved}" aria-pressed="${saved}" aria-label="${saved ? 'Remove' : 'Save'} ${title} ${saved ? 'from' : 'to'} your library">${icon('heart', 'ranking-save-icon')}</button></td>
      </tr>`;
    });
    const table = rowMarkup => `<div class="ranking-table-wrap"><table class="ranking-table"><colgroup><col class="ranking-col-rank"/><col class="ranking-col-cover"/><col class="ranking-col-story"/><col class="ranking-col-genre"/><col class="ranking-col-views"/><col class="ranking-col-parts"/><col class="ranking-col-save"/></colgroup><thead><tr><th scope="col" class="ranking-rank-cell">Rank</th><th scope="col" class="ranking-cover-cell">Cover</th><th scope="col" class="ranking-story-cell">Story</th><th scope="col" class="ranking-genre-cell">Genre</th><th scope="col" class="ranking-views-cell">Views</th><th scope="col" class="ranking-parts-cell">Parts</th><th scope="col" class="ranking-save-cell">Save</th></tr></thead><tbody>${rowMarkup}</tbody></table></div>`;
    const rankingTitle = {
      hot: 'Trending on ReadAgora',
      rising: 'Rising on ReadAgora',
      new: 'New stories on ReadAgora',
    }[state.rankingSort] || 'Trending on ReadAgora';
    const rankingLabel = {
      hot: 'TRENDING',
      rising: 'RISING STORIES',
      new: 'NEW STORIES',
    }[state.rankingSort] || 'TRENDING';
    const visibleRows = rows.slice(0, 4).join('');
    const remainingRows = rows.slice(4).join('');
    const validTracking = validTrackingShelf ? `data-discovery-shelf-view="${esc(String(shelf.id))}"` : '';
    return `<section class="ranking-board" id="discover-top-stories" ${validTracking}><div class="ranking-heading-row"><div><span class="eyebrow">${rankingLabel}</span><h2 class="ranking-title">${rankingTitle}</h2></div>${remainingRows ? '<button class="ranking-view-all" type="button" data-ranking-expand>View all rankings <span aria-hidden="true">&#8594;</span></button>' : ''}</div><div class="ranking-toolbar"><h3>${stories.length.toLocaleString()} ${stories.length === 1 ? 'Story' : 'Stories'}</h3><label>Sort by: <select data-ranking-sort aria-label="Sort story rankings">${sortOptions.map(([value, label, available]) => `<option value="${value}" ${state.rankingSort === value ? 'selected' : ''} ${available ? '' : 'disabled'}>${label}</option>`).join('')}</select></label></div>${stories.length ? `${table(visibleRows)}${remainingRows ? `<details class="ranking-more"><summary>View next ${stories.length - 4} stories</summary>${table(remainingRows)}</details>` : ''}` : '<p class="ranking-empty">No stories are available for this ranking yet.</p>'}</section>`;
  }
  
  function discoveryExtraSections() {
    const comics = state.comicStories.length
      ? shelfMarkup({ id: 'comics', type: 'comic', title: 'Comics & Visual Stories', stories: state.comicStories }, 'comics')
      : '';
    const followedStories = filterStories(state.followedStories);
    const followed = state.session
      ? (followedStories.length
        ? shelfMarkup({ id: 'followed', type: 'followed', title: 'From creators you follow', stories: followedStories }, 'followed')
        : '<section class="shelf"><div class="shelf-heading"><div><h2>From creators you follow</h2><p class="muted-copy">New stories from creators you follow will show up here.</p></div></div></section>')
      : '<section class="shelf"><div class="shelf-heading"><div><h2>From creators you follow</h2><p class="muted-copy">Sign in to see new stories from creators you follow.</p></div><a class="text-link" href="/login" data-link>Sign in</a></div></section>';
    return `${comics}${followed}${followedCreatorsSection()}${creatorPostsSection()}<section class="join-creatives"><span class="eyebrow">FOR STORYTELLERS</span><h2>Join the creatives</h2><p>Turn an idea into a story, build your chapters, and invite readers in.</p><a class="outline-button" href="/creator" data-link>Explore the Creator Guide &#8594;</a></section>`;
  }
  
  function followedCreatorsSection() {
    if (!state.session) return '';
    const error = state.followedContentErrors?.following;
    const people = (state.followedCreators || []).map(entry => entry.followed || entry.user || entry).filter(user => user?.username);
    const cards = people.map(user => {
      const name = user.display_name || user.username;
      const avatar = user.avatar_url
        ? `<img src="${esc(user.avatar_url)}" alt="" loading="lazy"/>`
        : `<span class="followed-creator-avatar" aria-hidden="true">${esc(name.slice(0, 1).toUpperCase())}</span>`;
      return `<a class="followed-creator-card" href="/creator/${encodeURIComponent(user.username)}" data-link>${avatar}<span><b>${esc(name)}</b><small>@${esc(user.username)}</small></span><span class="followed-creator-arrow" aria-hidden="true">&#8594;</span></a>`;
    }).join('');
    return `<section class="shelf followed-creators-section"><div class="shelf-heading"><div><h2>Creators you follow</h2><p class="shelf-purpose">Keep up with the writers and artists you follow.</p></div><a class="text-link" href="/community" data-link>Find creators <span aria-hidden="true">&#8594;</span></a></div>${error ? `<div class="notice error-notice" role="alert">Followed creators could not load. <button type="button" data-action="home-followed-retry">Try again</button></div>` : cards ? `<div class="followed-creators-grid">${cards}</div>` : '<p class="muted-copy">Creators you follow will appear here.</p>'}</section>`;
  }

  function creatorPostsSection() {
    if (!state.session) return '';
    const error = state.followedContentErrors?.creatorPosts;
    const posts = state.creatorFeedPosts || [];
    const cards = posts.map(post => {
      const user = post.user || {};
      const name = user.display_name || user.username || 'ReadAgora creator';
      const safePreview = post.contains_spoiler ? 'Spoiler · Open the post to view it.' : post.content || '';
      const thumbnailUrl = !post.contains_spoiler && (post.image_url || post.story?.cover_url);
      const thumbnail = thumbnailUrl ? image(thumbnailUrl, 'Post attachment') : '';
      const story = !post.contains_spoiler && post.story?.title ? `<small class="creator-post-story">${esc(post.story.title)}</small>` : '';
      return `<a class="creator-post-card" href="/community/post/${encodeURIComponent(post.id)}" data-link><span class="creator-post-author">${esc(name)} <small>@${esc(user.username || 'creator')}</small></span><span class="creator-post-preview">${esc(safePreview)}</span>${story}${thumbnail}<span class="creator-post-stats">${Number(post.like_count || 0).toLocaleString()} likes · ${Number(post.comment_count || 0).toLocaleString()} comments <b aria-hidden="true">&#8594;</b></span></a>`;
    }).join('');
    return `<section class="shelf creator-feed-section"><div class="shelf-heading"><div><h2>Creators feed</h2><p class="shelf-purpose">Recent posts from the people you follow.</p></div><a class="text-link" href="/community" data-link>See all <span aria-hidden="true">&#8594;</span></a></div>${error ? `<div class="notice error-notice" role="alert">Creator posts could not load. <button type="button" data-action="home-followed-retry">Try again</button></div>` : cards ? `<div class="creator-posts-grid">${cards}</div>` : '<p class="muted-copy">Posts from creators you follow will appear here.</p>'}</section>`;
  }

  function shelfMarkup(shelf, index) {
    let stories = filterStories(shelf.stories || []);
    if (shelf.type === 'for_you') {
      const featured = featuredDiscoveryStory();
      if (featured) stories = stories.filter(story => story.id !== featured.id);
    }
    if (!stories.length) return '';
    if (shelf.type === 'trending') return rankingBoard(shelf);
    const featured = shelf.type === 'for_you';
    const compact = ['new', 'comic'].includes(shelf.type);
    const ranked = ['trending', 'rising', 'hidden_gems'].includes(shelf.type);
    const cards = featured
      ? stories.slice(0, 3).map(story => `<a class="featured-story" href="/story/${encodeURIComponent(story.id)}" data-link ${discoveryStoryTracking(shelf, story)}>${image(story.cover_url, story.title)}<span><small>${esc(story.genre || 'STORY')}</small><b>${esc(story.title)}</b><em>${esc(story.description || 'Discover a new story.')}</em><i>by ${esc(author(story))}</i></span></a>`)
      : stories.map((story, n) => storyCard(story, n, ranked, state.discoverySessionShelfIds?.has(String(shelf.id)) && shelf.positions?.[story.id] != null ? { shelfId: shelf.id, position: shelf.positions[story.id] } : null));
    const sectionId = `discover-${String(shelf.id || shelf.type || index).toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(index).replace(/[^a-z0-9]+/gi, '-')}`;
    const visibleCards = compact ? cards.slice(0, 4).join('') : cards.join('');
    const remainingCards = compact ? cards.slice(4).join('') : '';
    const shelfPurpose = {
      recently_updated: 'Fresh chapters and updates from stories readers are following.',
      new: 'Newly published stories, ready for your next read.',
      followed: 'The latest stories and chapters from creators you follow.',
    }[shelf.type] || '';
    const shelfClass = `shelf-${String(shelf.type || '').toLocaleLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    const validTrackingShelf = shelf.id && state.discoverySessionShelfIds?.has(String(shelf.id));
    return `<section class="shelf ${shelfClass} ${compact ? 'shelf-compact' : ''} ${featured ? 'shelf-featured' : ''} ${ranked ? 'ranked-shelf' : ''}" id="${sectionId}" data-story-count="${stories.length}" ${validTrackingShelf ? `data-discovery-shelf-view="${esc(String(shelf.id))}"` : ''}><div class="shelf-heading"><div><h2>${esc(shelf.title)}</h2>${shelfPurpose ? `<p class="shelf-purpose">${shelfPurpose}</p>` : ''}</div><div class="shelf-heading-actions"><a class="text-link" href="/#${sectionId}" data-link>View all <span aria-hidden="true">&#8594;</span></a>${!compact ? `<button class="shelf-scroll-button" type="button" data-shelf-scroll="-1" aria-label="Scroll ${esc(shelf.title)} left">&#8592;</button><button class="shelf-scroll-button" type="button" data-shelf-scroll="1" aria-label="Scroll ${esc(shelf.title)} right">&#8594;</button>` : ''}</div></div><div class="story-rail ${compact ? 'compact-rail' : ''} ${featured ? 'featured-rail' : ''}" role="region" aria-label="${esc(shelf.title)} stories" tabindex="0">${visibleCards}</div>${remainingCards ? `<details class="compact-more"><summary>View all ${stories.length} stories</summary><div class="compact-grid">${remainingCards}</div></details>` : ''}</section>`;
  }

  return { discoveryStories, filterStories, featuredDiscoveryStory, discoveryControls, featuredDiscovery, rankingBoard, discoveryExtraSections, shelfMarkup };
}
