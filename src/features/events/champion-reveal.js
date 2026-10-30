const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let activeCleanup = null;

export function renderChampionReveal(champion) {
  if (!champion) return '';
  const university = champion.university;
  const color = university.primary_color;
  const rgb = [1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16));
  const foreground = (rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722) > 148 ? '#111111' : '#FFFFFF';
  return `<div class="champion-reveal-overlay" data-champion-reveal role="dialog" aria-modal="true" aria-label="Previous champions reveal">
    <div class="champion-reveal-scrim" data-champion-scrim></div>
    <div class="champion-reveal-stage" data-champion-stage style="--champion-primary:${escapeHtml(university.primary_color)};--champion-secondary:${escapeHtml(university.secondary_color)};--champion-ink:${foreground}">
      <div class="champion-reveal-flag" data-champion-flag aria-hidden="true">
        <span class="champion-flag-caption">PREVIOUS CHAMPIONS</span>
        <img src="${escapeHtml(university.logo_url)}" alt=""/>
        <strong>${escapeHtml(university.name)}</strong>
        <span class="champion-flag-event">${escapeHtml(champion.event.title)}</span>
        <b>${escapeHtml(champion.result.winning_year)}</b>
      </div>
      <p class="sr-only" aria-live="polite">Previous champions: ${escapeHtml(university.name)} won ${escapeHtml(champion.event.title)} in ${escapeHtml(champion.result.winning_year)}.</p>
      <button type="button" class="champion-reveal-skip" data-champion-skip aria-label="Skip champion reveal">Skip</button>
    </div>
  </div>`;
}

export function bindChampionReveal(app, onClose) {
  activeCleanup?.();
  activeCleanup = null;
  const overlay = app.querySelector('[data-champion-reveal]');
  const button = overlay?.querySelector('[data-champion-skip]');
  if (!overlay || !button) return;
  let closing = false;
  const close = () => { if (closing) return; closing = true; overlay.classList.add('is-closing'); window.setTimeout(onClose, 240); };
  button.addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay || event.target.matches('[data-champion-scrim]')) close(); });
  const keydown = event => { if (event.key === 'Escape' && overlay.isConnected) close(); };
  document.addEventListener('keydown', keydown);
  activeCleanup = () => document.removeEventListener('keydown', keydown);
  button.focus({ preventScroll: true });
}
