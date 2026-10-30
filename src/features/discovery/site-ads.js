export function createSiteAdsView({ state, esc }) {
  function safeDestination(value) {
    const raw = String(value || '').trim();
    if (raw.startsWith('/') && !raw.startsWith('//')) return { href: raw, external: false };
    try {
      const url = new URL(raw, location.origin);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      if (url.origin === location.origin) return { href: `${url.pathname}${url.search}${url.hash}`, external: false };
      return { href: url.href, external: true };
    } catch { return null; }
  }

  function siteAdsView() {
    let dismissed = [];
    try { dismissed = JSON.parse(localStorage.getItem('readagora-dismissed-site-ads') || '[]'); } catch { /* Ignore malformed browser storage. */ }
    const ads = (state.siteAds || []).filter(ad => ad?.id && !dismissed.includes(String(ad.id)));
    if (!ads.length) return '';
    return `<section class="site-announcements" data-ad-rotation aria-label="ReadAgora announcements">${ads.map((ad, index) => {
      const destination = safeDestination(ad.cta_url);
      const creative = ad.presentation || {};
      const accent = /^#[0-9a-f]{6}$/i.test(creative.accentColor || '') ? creative.accentColor : '';
      return `<article class="site-announcement" data-ad-slide ${index ? 'hidden' : ''} ${accent ? `style="--announcement-accent:${accent}"` : ''}><div class="site-announcement-copy"><span class="eyebrow">READAGORA / UPDATE</span><h2>${esc(ad.title || 'ReadAgora update')}</h2><p>${esc(ad.message || '')}${ad.bold_text ? ` <strong>${esc(ad.bold_text)}</strong>` : ''}</p>${destination ? `<a class="site-announcement-cta" href="${esc(destination.href)}" ${destination.external ? 'target="_blank" rel="noopener noreferrer"' : 'data-link'}>${esc(ad.cta_text || 'Learn more')} <span aria-hidden="true">→</span></a>` : ''}</div><button class="site-announcement-dismiss" type="button" data-action="dismiss-site-ad" data-id="${esc(String(ad.id))}" aria-label="Dismiss ${esc(ad.title || 'announcement')}">×</button></article>`;
    }).join('')}</section>`;
  }

  return { siteAdsView };
}
