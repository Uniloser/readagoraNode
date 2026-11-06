const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const EVENT_START = { year: 2026, month: 10, day: 1 };
const EVENT_END_EXCLUSIVE = { year: 2026, month: 11, day: 1 };
const DAY_MS = 24 * 60 * 60 * 1000;

function localDateKey(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function eventCountdown(date = new Date()) {
  const today = localDateKey(date);
  const start = Date.UTC(EVENT_START.year, EVENT_START.month, EVENT_START.day);
  const end = Date.UTC(EVENT_END_EXCLUSIVE.year, EVENT_END_EXCLUSIVE.month, EVENT_END_EXCLUSIVE.day);
  if (today < start) {
    const days = Math.round((start - today) / DAY_MS);
    return { label: days === 1 ? 'Starts tomorrow' : `Starts in ${days} days`, ended: false };
  }
  if (today < end) return { label: `Ends in ${Math.round((end - today) / DAY_MS)} days`, ended: false };
  return { label: 'Event ended', ended: true };
}

function flagSvg(winner) {
  const winnerName = winner?.name ? escapeHtml(winner.name) : 'Your university';
  const slot = winner?.logoUrl
    ? `<image href="${escapeHtml(winner.logoUrl)}" x="126" y="34" width="40" height="38" preserveAspectRatio="xMidYMid meet" clip-path="url(#event-card-band)"/><text x="146" y="83" text-anchor="middle" font-family="DM Sans, Arial, sans-serif" font-size="10" font-weight="700" fill="#ff6a5e">${winnerName}</text>`
    : `<text x="146" y="64" text-anchor="middle" font-family="DM Sans, Arial, sans-serif" font-size="30" font-weight="700" fill="#ff6a5e">?</text><text x="146" y="80" text-anchor="middle" font-family="DM Sans, Arial, sans-serif" font-size="10" fill="#ff6a5e">Your university</text>`;
  return `<svg class="event-card-flag" viewBox="0 0 270 225" role="img" aria-label="${winner?.name ? `ReadAgora university flag for ${winnerName}` : 'ReadAgora event flag with an empty university slot'}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="event-card-band"><path d="M46 30C90 8 130 52 170 30S230 14 244 24L244 88C230 78 200 106 170 88S90 68 46 90Z"/></clipPath></defs><line x1="40" y1="14" x2="40" y2="218" stroke="#8a8780" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="12" r="6" fill="#ff6a5e"/><path d="M46 30C90 8 130 52 170 30S230 14 244 24L244 150C230 140 200 168 170 150S90 130 46 152Z" fill="#f4f2ee"/><path d="M46 30C90 8 130 52 170 30S230 14 244 24L244 88C230 78 200 106 170 88S90 68 46 90Z" fill="rgba(217,45,36,.2)" stroke="#ff6a5e" stroke-width="1.6" stroke-dasharray="5 4"/>${slot}<text x="146" y="128" text-anchor="middle" font-family="DM Sans, Arial, sans-serif" font-size="15" font-weight="700" fill="#1c1c1e">ReadAgora</text></svg>`;
}

export function EventCard({ winner, href = '/events' } = {}) {
  const countdown = eventCountdown();
  const ctaLabel = winner ? 'See the winning story' : 'Enter the contest';
  return `<section class="event-card" data-ad-slide="event" aria-labelledby="readagora-event-card-title"><div class="event-card-stage">${flagSvg(winner)}<p class="event-card-caption">Whose university will it be?</p><ul class="event-card-universities" aria-label="Participating universities"><li>UNZA</li><li>CBU</li><li>Mulungushi</li><li class="event-card-yours">Yours?</li></ul></div><div class="event-card-copy"><span class="event-card-label">ReadAgora community event</span><h2 id="readagora-event-card-title">Who owns ReadAgora?</h2><p>Write a story. Get votes. <strong>Put your university on the flag.</strong></p></div><div class="event-card-prize-dates"><div><span>Winner takes</span><strong>$25</strong></div><div><span>Runs</span><strong>Nov 1–30, 2026</strong></div></div><p class="event-card-note">Plus a custom flag with the winner’s university on top.</p><p class="event-card-eligibility">Open to university students in Zambia.</p><button class="event-card-cta" type="button" data-action="event-card-cta" data-href="${escapeHtml(href)}" ${countdown.ended ? 'disabled' : ''}>${ctaLabel}</button><p class="event-card-countdown" data-event-countdown aria-live="polite">${countdown.label}</p></section>`;
}
