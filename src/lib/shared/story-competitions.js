// Older deployed APIs can still resolve membership through their paginated event DTOs.
export async function loadStoryCompetitions(request, storyId) {
  try {
    const events = await request('/events/story/' + encodeURIComponent(storyId));
    if (Array.isArray(events)) return events;
  } catch { /* Fall back while the dedicated lookup is being deployed. */ }
  const events = await request('/events/voting');
  if (!Array.isArray(events)) return [];
  const matches = await Promise.all(events.filter(event => event.votingOpen).map(async event => {
    let page = event;
    const visited = new Set();
    while (page) {
      const story = page.entries?.find(entry => entry.id === storyId);
      if (story) return {...page, entries: [story]};
      const offset = page.nextOffset;
      if (offset == null || visited.has(offset)) break;
      visited.add(offset);
      page = await request('/events/' + encodeURIComponent(event.id) + '?offset=' + offset);
    }
    return null;
  }));
  return matches.filter(Boolean);
}
