const emptyCopy = {
  Live: { title: 'A new chapter is on its way', message: 'There are no live events right now. When a challenge opens, you will find its theme, entries, and voting here.' },
  Upcoming: { title: 'Something worth writing for', message: 'No upcoming events have been announced yet. Check back for new themes and dates.' },
  Past: { title: 'The first story is still to come', message: 'Completed events, winning stories, and community favourites will appear here.' },
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function verifiedChampion(value) {
  if (!value || typeof value !== 'object') return null;
  // The current backend service returns the mobile app's public camelCase DTO.
  // Normalize it for the existing event and reveal views, while accepting the
  // older nested response shape during staggered backend deployments.
  const event = value.event || {
    id: value.eventId,
    title: value.eventName,
    ends_at: value.completedAt,
  };
  const result = value.result || {
    winning_year: value.winningYear,
    verified_at: value.verifiedAt,
  };
  const university = value.university || {
    id: value.universityId,
    name: value.universityName,
    logo_url: value.universityLogoUrl,
    primary_color: value.primaryColor,
    secondary_color: value.secondaryColor,
  };
  if (!event || !result || !university) return null;
  if (![event.id, event.title, university.id, university.name].every(item => typeof item === 'string' && item.trim() && item.length <= 200)) return null;
  if (typeof university.logo_url !== 'string' || !/^https:\/\//i.test(university.logo_url)) return null;
  if (!/^#[0-9a-f]{6}$/i.test(university.primary_color || '') || !/^#[0-9a-f]{6}$/i.test(university.secondary_color || '')) return null;
  const completedAt = Date.parse(event.ends_at);
  const verifiedAt = Date.parse(result.verified_at);
  const year = Number(result.winning_year);
  const now = Date.now();
  if (!Number.isFinite(completedAt) || !Number.isFinite(verifiedAt) || completedAt > now || verifiedAt < completedAt || verifiedAt > now) return null;
  if (!Number.isInteger(year) || year < 2000 || year > 2200) return null;
  return { event, result, university };
}

export async function loadPreviousChampion(api) {
  return verifiedChampion(await api('/events/previous-champion'));
}

export function renderEventsPage({ tab = 'Live', champion = null, events = [], loading = false, error = '' } = {}) {
  const selected = emptyCopy[tab] ? tab : 'Live';
  const tabs = ['Live', 'Upcoming', 'Past'];
  const championMarkup = champion ? `<section class="web-champion" aria-label="Previous event champion"><img src="${escapeHtml(champion.university.logo_url)}" alt="${escapeHtml(champion.university.name)} logo"/><div><span>PREVIOUS CHAMPIONS · ${escapeHtml(champion.result.winning_year)}</span><h2>${escapeHtml(champion.university.name)}</h2><p>${escapeHtml(champion.event.title)}</p></div><button type="button" data-champion-replay aria-label="Replay champion reveal">Replay reveal</button></section>` : '';
  const matching = events.filter(event => event.status === ({ Live: 'live', Upcoming: 'upcoming', Past: 'completed' })[selected]);
  const eventMarkup = matching.map(event => {
    const date = value => {
      const parsed = new Date(value);
      if (!Number.isFinite(parsed.getTime())) return 'To be announced';
      return escapeHtml(new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parsed));
    };
    const time = value => `<time datetime="${escapeHtml(value)}">${date(value)}</time>`;
    const detail = (title, value) => value ? `<section class="event-detail"><h3>${title}</h3><p>${escapeHtml(value)}</p></section>` : '';
    return `<article class="event-card">
      <header class="event-card-header">${/^https:\/\//i.test(event.banner_url||'')?`<img class="event-list-banner" src="${escapeHtml(event.banner_url)}" alt="" loading="lazy"/>`:''}<span class="event-status event-status-${escapeHtml(event.status)}"><i aria-hidden="true"></i>${escapeHtml(selected)} event</span><h2>${escapeHtml(event.title)}</h2>${event.theme ? `<p class="event-theme">${escapeHtml(event.theme)}</p>` : ''}</header>
      <div class="event-card-layout"><div class="event-card-main">${detail('About this event', event.description)}${detail('Rules & eligibility', event.rules)}${!event.description && !event.rules ? '<p class="event-details-pending">More event details will be announced soon.</p>' : ''}${event.slug ? `<a class="outline-button" href="/events/${encodeURIComponent(event.slug)}" data-link>Open competition &#8594;</a>` : ''}</div>
      <aside class="event-card-sidebar" aria-label="Event prizes and schedule">${event.prizes ? `<section class="event-prize"><span class="event-section-label">THE PRIZE</span><p>${escapeHtml(event.prizes)}</p></section>` : ''}
      <section class="event-schedule"><h3>Event schedule</h3><dl><div><dt>Starts</dt><dd>${time(event.starts_at)}</dd></div><div><dt>Ends</dt><dd>${time(event.ends_at)}</dd></div>${event.voting_starts_at ? `<div><dt>Voting opens</dt><dd>${time(event.voting_starts_at)}</dd></div><div><dt>Voting closes</dt><dd>${time(event.voting_ends_at)}</dd></div>` : ''}</dl><p class="event-timezone">Times shown in your local time zone.</p></section></aside></div>
    </article>`;
  }).join('');
  const body = loading
    ? '<section class="events-empty" aria-live="polite"><p class="events-state-label">READAGORA EVENTS</p><h2>Checking for events</h2><p>Loading the latest event information.</p></section>'
    : error
      ? `<section class="events-empty" role="alert"><p class="events-state-label">EVENTS UNAVAILABLE</p><h2>We could not load events</h2><p>${escapeHtml(error)}</p><button type="button" class="outline-button" data-events-retry>Try again</button></section>`
      : matching.length ? eventMarkup : `<section class="events-empty" aria-live="polite"><div class="events-empty-icon" aria-hidden="true">${selected === 'Past' ? '✦' : selected === 'Upcoming' ? '◷' : '✧'}</div><p class="events-state-label">${selected.toUpperCase()} EVENTS</p><h2>${emptyCopy[selected].title}</h2><p>${emptyCopy[selected].message}</p><a class="outline-button" href="/" data-link>Explore stories</a></section>`;
  return `<div class="events-page"><div class="events-page-heading"><span class="eyebrow">READAGORA / COMMUNITY</span><h1>Events</h1><p>Writing challenges bring readers and creators together around a shared story.</p></div>${championMarkup}<div class="events-tabs" role="tablist" aria-label="Event status">${tabs.map(item => `<button type="button" role="tab" aria-selected="${item === selected}" class="${item === selected ? 'selected' : ''}" data-events-tab="${item}">${item === 'Live' ? '<i aria-hidden="true"></i>' : ''}${item}</button>`).join('')}</div>${body}<section class="events-how"><span class="eyebrow">MADE FOR READERS & CREATORS</span><h2>Every event has a story</h2><ol><li><span>01</span><div><h3>Create</h3><p>Explore a theme and enter your story when submissions open.</p></div></li><li><span>02</span><div><h3>Discover</h3><p>Read the entries and find voices you have not heard before.</p></div></li><li><span>03</span><div><h3>Have your say</h3><p>Support your favourites during voting. Each event sets out its own rules and dates.</p></div></li></ol></section></div>`;
}
