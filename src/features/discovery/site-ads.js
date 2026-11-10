import { createSiteAdSvg, normalizeSiteAdCreative, resolveSiteAdHeight } from '../../lib/shared/site-ad-svg.js';

function safeCtaUrl(value) {
  const rawUrl = String(value || '').trim();
  if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) return { href: rawUrl, external: false };

  try {
    const url = new URL(rawUrl, location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.origin === location.origin) {
      return { href: `${url.pathname}${url.search}${url.hash}`, external: false };
    }
    return { href: url.href, external: true };
  } catch {
    return null;
  }
}

function safeImageUrl(value) {
  const rawUrl = String(value || '').trim();
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl, location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

let disposeSiteAdSvgs = () => {};
export function mountSiteAdsSvg(root) {
  disposeSiteAdSvgs();
  const cleanups = [];
  for (const container of root.querySelectorAll('[data-site-announcement-svg]')) {
    let creative;
    try {
      creative = JSON.parse(container.dataset.banner || '{}');
    } catch (error) {
      console.error('Could not parse Discovery banner SVG data.', error);
      continue;
    }
    function render() {
      const rect = container.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (!width || !height) return;
      container.innerHTML = createSiteAdSvg(creative, width, height);
    }
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => void render());
      observer.observe(container);
      cleanups.push(() => observer.disconnect());
    } else {
      window.addEventListener('resize', render);
      cleanups.push(() => window.removeEventListener('resize', render));
    }
    void render();
  }
  disposeSiteAdSvgs = () => cleanups.forEach(cleanup => cleanup());
}

export function createSiteAdsView({ state, esc }) {
  return {
    siteAdsView() {
      let dismissed = [];
      try {
        dismissed = JSON.parse(localStorage.getItem('readagora-dismissed-site-ads') || '[]');
      } catch {
        // Ignore malformed browser storage.
      }

      const ads = (state.siteAds || []).filter(ad => ad?.id && !dismissed.includes(String(ad.id)));
      if (!ads.length) return '';

      return `<section class="site-announcements" data-ad-rotation aria-label="ReadAgora announcements">${ads.map((ad, index) => {
        const cta = safeCtaUrl(ad.cta_url);
        const creative = ad.presentation || {};
        const layout = creative.siteLayout === 'announcement' ? 'announcement' : 'hero';
        const bannerData = normalizeSiteAdCreative({
          ...creative,
          backgroundImage: safeImageUrl(creative.backgroundImage),
          artwork: (Array.isArray(creative.artwork) ? creative.artwork : []).map(item => ({
            ...item,
            url: safeImageUrl(item?.url),
          })),
        }, {
          title: ad.title,
          message: ad.message,
          boldText: ad.bold_text,
          ctaText: creative.ctaText || ad.cta_text || 'Learn more',
          includeCta: Boolean(cta),
        });
        const style = `--announcement-height:${resolveSiteAdHeight(creative, false)}px;--announcement-mobile-height:${resolveSiteAdHeight(creative, true)}px`;
        const artworkDescriptions = bannerData.artwork.map(item => item.alt).filter(Boolean);
        const accessibleLabel = [bannerData.headline, bannerData.tagline, bannerData.boldText, ...bannerData.textFields.map(field => field.text), ...artworkDescriptions, bannerData.ctaText].filter(Boolean).join('. ');
        const svg = `<div class="site-announcement-svg" data-site-announcement-svg data-banner="${esc(JSON.stringify(bannerData))}" ${cta ? 'aria-hidden="true"' : `role="img" aria-label="${esc(accessibleLabel || 'ReadAgora announcement')}"`}></div>`;

        return `<article class="site-announcement site-announcement--${layout} site-announcement--${bannerData.fontStyle}" data-ad-slide ${index ? 'hidden' : ''} style="${style}"><div class="site-announcement-visual-wrap">${cta ? `<a class="site-announcement-link" href="${esc(cta.href)}" aria-label="${esc(accessibleLabel)}" ${cta.external ? 'target="_blank" rel="noopener noreferrer sponsored"' : 'data-link'}></a>` : ''}${svg}</div><button class="site-announcement-dismiss" type="button" data-action="dismiss-site-ad" data-id="${esc(String(ad.id))}" aria-label="Dismiss ${esc(ad.title || 'announcement')}">&times;</button></article>`;
      }).join('')}</section>`;
    },
  };
}
