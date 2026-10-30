const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const media = (value) => value || '';
const author = (story) => story.author?.display_name || story.author?.username || 'ReadAgora creator';
const updateLabel = (story) => {
  const updated = story.last_chapter_published_at || story.updated_at;
  const value = updated || story.published_at;
  if (!value || Number.isNaN(Date.parse(value))) return '';
  return `${updated ? 'Updated' : 'Published'} ${new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};
const icon = (name, className = 'nav-icon') => {
  const paths = {
    discover: '<circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2.2 5.4-5.4 2.2 2.2-5.4 5.4-2.2Z"/>',
    library: '<path d="M6 4.5h12a1.5 1.5 0 0 1 1.5 1.5v14l-7.5-4-7.5 4V6A1.5 1.5 0 0 1 6 4.5Z"/><path d="M9 8h6"/>',
    workroom: '<path d="M4.5 19.5 5.7 15 16.5 4.2a2.1 2.1 0 0 1 3 3L8.7 18 4.5 19.5Z"/><path d="m14.8 5.9 3.3 3.3"/>',
    community: '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-2.5 1.5V11.5A7.5 7.5 0 0 1 11 4h1.5a7.5 7.5 0 0 1 7.5 7.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    events: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>',
    profile: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4L17 17.4a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    moon: '<path d="M20.8 13A8.5 8.5 0 0 1 11 3.2 8.5 8.5 0 1 0 20.8 13Z"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 17v3h14v-3"/>',
    heart: '<path d="M20.8 8.8c0 5.1-8.8 10.1-8.8 10.1S3.2 13.9 3.2 8.8A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.6Z"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.4m-7.5 6.8 7.5 4.4"/>',
    block: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0m1-8 6 6m0-6-6 6"/>',
    flag: '<path d="M5 21V4m0 1h12l-2 4 2 4H5"/>',
  };
  return `<svg class="${className}" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.discover}</svg>`;
};
const image = (url, title, className = '') => url
  ? `<img class="${className} cover-image" src="${esc(media(url))}" alt="Cover of ${esc(title)}" loading="lazy" />`
  : `<div class="cover-fallback ${className}"><span>READAGORA</span><b>${esc(title)}</b></div>`;

export { esc, media, author, updateLabel, icon, image };

export function installImageFallbacks() {
  document.addEventListener('error', event => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('cover-image')) return;
  const fallback = document.createElement('div');
  fallback.className = `cover-fallback ${[...img.classList].filter(name => name !== 'cover-image').join(' ')}`.trim();
  fallback.setAttribute('role', 'img');
  fallback.setAttribute('aria-label', img.alt || 'Story cover unavailable');
  const brand = document.createElement('span'); brand.textContent = 'READAGORA';
  const title = document.createElement('b'); title.textContent = (img.alt || 'Story cover').replace(/^Cover of\s*/i, '');
  fallback.append(brand, title);
  img.replaceWith(fallback);
  }, true);
}
