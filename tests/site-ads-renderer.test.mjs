import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sharedSource = await readFile(new URL('../../shared/site-ad-svg.js', import.meta.url), 'utf8');
const siteAdsSource = await readFile(new URL('../src/features/discovery/site-ads.js', import.meta.url), 'utf8');
const source = `${sharedSource}\n${siteAdsSource.replace("import { createSiteAdSvg, normalizeSiteAdCreative, resolveSiteAdHeight } from '../../../../shared/site-ad-svg.js';", '')}`;
globalThis.location = { origin: 'https://readagora.com' };
globalThis.localStorage = { getItem: () => '[]' };
const { createSiteAdsView, createSiteAdSvg, normalizeSiteAdCreative, resolveSiteAdHeight } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const esc = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);

function renderCreative(presentation) {
  return createSiteAdsView({
    state: {
      siteAds: [{
        id: 'ad-1',
        title: 'Internal campaign name',
        message: 'Fallback message',
        bold_text: 'Important note',
        cta_text: 'Explore stories',
        cta_url: '/discover',
        presentation,
      }],
    },
    esc,
  }).siteAdsView();
}

function getCanvasData(markup) {
  const encoded = markup.match(/data-banner="([^"]+)"/)?.[1];
  assert.ok(encoded, 'Expected banner data for the shared SVG renderer');
  return JSON.parse(encoded.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
}

test('renders custom banner sizing and supplied artwork', () => {
  const markup = renderCreative({
    bannerSize: 'custom',
    desktopHeight: 610,
    mobileHeight: 720,
    headline: 'A new world',
    tagline: 'Find your next story',
    backgroundImage: 'https://cdn.example/banner.webp',
    artwork: [{ url: 'https://cdn.example/cover.webp', alt: 'Story cover', side: 'right', rotation: -8 }],
  });

  assert.match(markup, /--announcement-height:610px/);
  assert.match(markup, /--announcement-mobile-height:720px/);
  assert.match(markup, /<div class="site-announcement-svg"/);
  assert.match(markup, /class="site-announcement-link"/);
  const banner = getCanvasData(markup);
  assert.equal(banner.headline, 'A new world');
  assert.equal(banner.backgroundImage, 'https://cdn.example/banner.webp');
  assert.deepEqual(banner.artwork, [{ url: 'https://cdn.example/cover.webp', alt: 'Story cover', side: 'right', rotation: -8, shape: 'square' }]);
  assert.equal(banner.boldText, 'Important note');
  assert.match(markup, /aria-label="A new world\. Find your next story\. Important note\. Story cover\. Explore stories"/);
  assert.doesNotMatch(markup, /<h2>Internal campaign name<\/h2>/);
});

test('uses responsive presets and omits blank image URLs', () => {
  const markup = renderCreative({
    bannerSize: 'tall',
    backgroundImage: '',
    artwork: [{ url: '', alt: 'Missing artwork', side: 'left', rotation: 0 }],
  });

  assert.match(markup, /--announcement-height:520px/);
  assert.match(markup, /--announcement-mobile-height:600px/);
  assert.doesNotMatch(markup, /<img/);
  assert.deepEqual(getCanvasData(markup).artwork, []);
  assert.equal(getCanvasData(markup).backgroundImage, '');
});

test('renders a 100px custom mobile banner height', () => {
  const markup = renderCreative({
    bannerSize: 'custom',
    desktopHeight: 310,
    mobileHeight: 100,
  });

  assert.match(markup, /--announcement-height:310px/);
  assert.match(markup, /--announcement-mobile-height:100px/);
});

test('passes saved layer and artwork positions to the shared SVG renderer', () => {
  const positions = {
    brand: { x: 15, y: 20 },
    headline: { x: 50, y: 42 },
    tagline: { x: 50, y: 58 },
    boldText: { x: 50, y: 70 },
    cta: { x: 50, y: 86 },
  };
  const banner = getCanvasData(renderCreative({
    positions,
    artwork: [{ url: 'https://cdn.example/cover.webp', alt: 'Story cover', side: 'left', rotation: 0, position: { x: 12, y: 44 } }],
  }));

  assert.deepEqual(banner.positions, positions);
  assert.deepEqual(banner.artwork[0].position, { x: 12, y: 44 });
});

test('passes artwork shape, dimensions, text scaling, and button styling to the shared SVG renderer', () => {
  const banner = getCanvasData(renderCreative({
    textScale: { headline: 1.4, tagline: 0.9 },
    buttonStyle: { width: 125, height: 110, radius: 18 },
    artwork: [{
      url: 'https://cdn.example/cover.webp',
      alt: 'Story cover',
      side: 'right',
      rotation: 135,
      shape: 'circle',
      size: { width: 24, height: 62 },
    }],
  }));

  assert.equal(banner.textScale.headline, 1.4);
  assert.equal(banner.textScale.tagline, 0.9);
  assert.deepEqual(banner.buttonStyle, { width: 125, height: 110, radius: 18 });
  assert.deepEqual(banner.artwork[0], {
    url: 'https://cdn.example/cover.webp',
    alt: 'Story cover',
    side: 'right',
    rotation: 135,
    shape: 'circle',
    size: { width: 24, height: 62 },
  });
});

test('shared SVG renderer sanitizes creative content and preserves saved visual controls', () => {
  const creative = normalizeSiteAdCreative({
    secondaryColor: '#112233',
    accentColor: '#abcdef',
    textColor: '#ffffff',
    headline: '<script>alert(1)</script>',
    textAlign: 'left',
    positions: { headline: { x: 24, y: 38 }, cta: { x: 72, y: 86 } },
    artwork: [{ url: 'https://cdn.example/cover.webp', side: 'right', rotation: 12, shape: 'circle', position: { x: 82, y: 46 } }],
    buttonStyle: { width: 130, height: 110, radius: 16 },
  }, { includeCta: true, ctaText: 'Read Story' });
  const svg = createSiteAdSvg(creative, 390, 480);

  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /fill="#112233"/);
  assert.match(svg, /href="https:\/\/cdn\.example\/cover\.webp"/);
  assert.match(svg, /rotate\(12 /);
  assert.match(svg, /cx="319\.8" cy="220\.8"/);
  assert.match(svg, /Read Story  →/);
  assert.match(svg, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(svg, /<script>/);
});

test('renders custom named text fields and suppresses generic fallback copy', () => {
  const creative = normalizeSiteAdCreative({
    textFields: [
      { id: 'text-offer', label: 'Special offer', text: 'Save <25%> today', style: 'heading' },
      { id: 'text-author', label: 'Author', text: 'A new story by Maya', style: 'small' },
      { id: 'unsafe id', label: 'Ignored', text: 'Should not render', style: 'body' },
    ],
    positions: { 'text-offer': { x: 30, y: 40 } },
    textScale: { 'text-offer': 1.25 },
  }, { title: 'Internal campaign name', message: 'Fallback message' });
  const svg = createSiteAdSvg(creative, 390, 480);

  assert.equal(creative.headline, '');
  assert.equal(creative.tagline, '');
  assert.deepEqual(creative.textFields, [
    { id: 'text-offer', label: 'Special offer', text: 'Save <25%> today', style: 'heading' },
    { id: 'text-author', label: 'Author', text: 'A new story by Maya', style: 'small' },
  ]);
  assert.deepEqual(creative.positions, { 'text-offer': { x: 30, y: 40 } });
  assert.equal(creative.textScale['text-offer'], 1.25);
  assert.match(svg, /Save &lt;25%&gt;/);
  assert.match(svg, />today<\/tspan>/);
  assert.match(svg, /A new story by Maya/);
  assert.doesNotMatch(svg, /Internal campaign name|Fallback message|Should not render/);
});

test('renders selectable background decoration templates and defaults old banners to orbit', () => {
  const styles = ['orbit', 'rays', 'confetti', 'corners', 'none'];
  const markups = styles.map(decorationStyle => createSiteAdSvg({
    decorationStyle,
    accentColor: '#d8a84e',
    headline: 'Vote for your favorite',
  }, 600, 300));

  assert.match(markups[0], /<ellipse cx="432" cy="336/);
  assert.match(markups[1], /<path d="M491\.\d+ 138 L/);
  assert.match(markups[2], /<circle cx="48" cy="54" r="5"/);
  assert.match(markups[3], /M600 0H408\.\d+L600 114Z/);
  assert.doesNotMatch(markups[4], /<ellipse|<path|<circle/);
  assert.match(createSiteAdSvg({ headline: 'Old banner' }, 600, 300), /<ellipse cx="432" cy="336/);
});

test('shared responsive heights match saved banner presets and custom limits', () => {
  assert.equal(resolveSiteAdHeight({ bannerSize: 'standard' }, true), 480);
  assert.equal(resolveSiteAdHeight({ bannerSize: 'tall' }, false), 520);
  assert.equal(resolveSiteAdHeight({ bannerSize: 'custom', mobileHeight: 40 }, true), 100);
  assert.equal(resolveSiteAdHeight({ bannerSize: 'custom', desktopHeight: 940 }, false), 900);
});
