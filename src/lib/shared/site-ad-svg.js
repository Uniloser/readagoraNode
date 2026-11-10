const bannerSizePresets = {
  compact: { desktop: 320, mobile: 380 },
  standard: { desktop: 420, mobile: 480 },
  tall: { desktop: 520, mobile: 600 },
};

const textLayers = ['brand', 'headline', 'tagline', 'boldText', 'cta'];
let nextClipId = 0;

function bounded(value, minimum, maximum, fallback) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : fallback;
}

function text(value, maximum = 500) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, maximum)
    : '';
}

function color(value, fallback) {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

function imageUrl(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function position(value) {
  if (!value || typeof value !== 'object') return undefined;
  const { x, y } = value;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return { x: bounded(x, 0, 100, 50), y: bounded(y, 0, 100, 50) };
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]);
}

function wrapText(value, width, fontSize, maximumLines) {
  const characterLimit = Math.max(1, Math.floor(width / (fontSize * 0.56)));
  const lines = [];
  for (const paragraph of value.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && candidate.length > characterLimit) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines.slice(0, maximumLines);
}

function fontFamily(style) {
  if (style === 'serif') return 'Georgia,serif';
  if (style === 'handwritten') return 'Comic Sans MS,cursive';
  return 'Arial,sans-serif';
}

function positionOf(creative, key, fallback) {
  return creative.positions[key] || fallback;
}

function textMarkup(lines, { x, y, fontSize, lineHeight, weight, fill, anchor, family }) {
  if (!lines.length) return '';
  return `<text x="${x}" y="${y + fontSize}" fill="${fill}" font-family="${family}" font-size="${fontSize}" font-weight="${weight}" text-anchor="${anchor}">${lines.map((line, index) => `<tspan x="${x}" y="${y + fontSize + index * lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}

export function resolveSiteAdHeight(creative, mobile) {
  const size = ['compact', 'standard', 'tall', 'custom'].includes(creative?.bannerSize)
    ? creative.bannerSize
    : 'standard';
  const preset = bannerSizePresets[size] || bannerSizePresets.standard;
  const customHeight = mobile ? creative?.mobileHeight : creative?.desktopHeight;
  const minimum = mobile ? 100 : 250;
  return size === 'custom' && Number.isInteger(customHeight)
    ? Math.max(minimum, Math.min(900, customHeight))
    : mobile ? preset.mobile : preset.desktop;
}

export function normalizeSiteAdCreative(input, fallback = {}) {
  const raw = input && typeof input === 'object' ? input : {};
  const backgroundImage = imageUrl(raw.backgroundImage);
  const artwork = Array.isArray(raw.artwork) ? raw.artwork.slice(0, 8).map(item => {
    if (!item || typeof item !== 'object') return null;
    const url = imageUrl(item.url);
    if (!url) return null;
    const size = item.size && Number.isFinite(item.size.width) && Number.isFinite(item.size.height)
      ? { width: bounded(item.size.width, 5, 100, 34), height: bounded(item.size.height, 5, 100, 56) }
      : undefined;
    return {
      url,
      alt: text(item.alt, 180),
      side: item.side === 'left' ? 'left' : 'right',
      rotation: bounded(item.rotation, -180, 180, 0),
      shape: ['square', 'rounded', 'circle'].includes(item.shape) ? item.shape : 'square',
      size,
      position: position(item.position),
    };
  }).filter(Boolean) : [];
  const hasCustomTextFields = Array.isArray(raw.textFields);
  const textFields = hasCustomTextFields ? raw.textFields.slice(0, 8).map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^text-[a-zA-Z0-9_-]{1,60}$/.test(item.id)) return null;
    const value = text(item.text, 240);
    if (!value) return null;
    return {
      id: item.id,
      label: text(item.label, 40),
      text: value,
      style: ['heading', 'body', 'small'].includes(item.style) ? item.style : 'body',
    };
  }).filter(Boolean) : [];
  const positions = {};
  for (const key of [...textLayers, ...textFields.map(field => field.id)]) {
    const value = position(raw.positions?.[key]);
    if (value) positions[key] = value;
  }
  const textScale = {};
  for (const key of ['brand', 'headline', 'tagline', 'boldText', ...textFields.map(field => field.id)]) {
    textScale[key] = bounded(raw.textScale?.[key], 0.25, 3, 1);
  }
  const hasBackground = Boolean(backgroundImage);
  return {
    backgroundColor: color(raw.backgroundColor || raw.secondaryColor, '#111111'),
    accentColor: color(raw.accentColor, '#ef476f'),
    textColor: color(raw.textColor, '#ffffff'),
    overlayColor: color(raw.overlayColor, '#111111'),
    textAlign: raw.textAlign === 'left' ? 'left' : 'center',
    fontStyle: ['serif', 'handwritten'].includes(raw.fontStyle) ? raw.fontStyle : 'sans',
    decorationStyle: ['orbit', 'rays', 'confetti', 'corners', 'none'].includes(raw.decorationStyle) ? raw.decorationStyle : 'orbit',
    showBrand: raw.showBrand !== false,
    headline: text(raw.headline, 240) || (hasCustomTextFields || hasBackground ? '' : text(fallback.title, 240) || 'ReadAgora update'),
    tagline: text(raw.tagline, 360) || (hasCustomTextFields || hasBackground ? '' : text(fallback.message, 360)),
    boldText: hasCustomTextFields ? '' : text(fallback.boldText || raw.boldText, 240),
    textFields,
    ctaText: fallback.includeCta === false ? '' : text(raw.ctaText || fallback.ctaText || 'Learn more', 100),
    backgroundImage,
    artwork,
    positions,
    textScale,
    buttonStyle: {
      width: bounded(raw.buttonStyle?.width, 50, 200, 100),
      height: bounded(raw.buttonStyle?.height, 50, 200, 100),
      radius: bounded(raw.buttonStyle?.radius, 0, 30, 5),
    },
  };
}

export function createSiteAdSvg(input, width, height) {
  const creative = normalizeSiteAdCreative(input);
  const w = Math.max(1, Number.isFinite(width) ? width : 1);
  const h = Math.max(1, Number.isFinite(height) ? height : 1);
  const mobile = w <= 700;
  const align = mobile ? 'center' : creative.textAlign;
  const anchor = align === 'left' ? 'start' : 'middle';
  const textX = key => w * positionOf(creative, key, { x: align === 'left' ? 10 : 50, y: 50 }).x / 100;
  const font = fontFamily(creative.fontStyle);
  const artMarkup = [];
  const clipPrefix = `readagora-site-ad-${++nextClipId}`;
  if (creative.backgroundImage) {
    artMarkup.push(`<image href="${escapeXml(creative.backgroundImage)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`);
    artMarkup.push(`<rect width="${w}" height="${h}" fill="${creative.overlayColor}" opacity="0.48"/>`);
  }
  if (creative.decorationStyle === 'orbit') {
    artMarkup.push(`<ellipse cx="${w * 0.72}" cy="${h * 1.12}" rx="${w * 0.28}" ry="${h * 0.65}" transform="rotate(-11.46 ${w * 0.72} ${h * 1.12})" fill="none" stroke="${creative.accentColor}" stroke-width="20" opacity="0.8"/>`);
  } else if (creative.decorationStyle === 'rays') {
    const centerX = w * 0.82, centerY = h * 0.46;
    const radius = Math.max(w, h) * 0.9;
    for (let angle = -Math.PI * 0.78; angle <= Math.PI * 0.78; angle += Math.PI / 12) {
      const start = angle - 0.035, end = angle + 0.035;
      artMarkup.push(`<path d="M${centerX} ${centerY} L${centerX + Math.cos(start) * radius} ${centerY + Math.sin(start) * radius} L${centerX + Math.cos(end) * radius} ${centerY + Math.sin(end) * radius}Z" fill="${creative.accentColor}" opacity="0.18"/>`);
    }
  } else if (creative.decorationStyle === 'corners') {
    artMarkup.push(`<path d="M${w} 0H${w * 0.68}L${w} ${h * 0.38}Z M0 ${h}H${w * 0.3}L0 ${h * 0.66}Z" fill="${creative.accentColor}" opacity="0.2"/>`);
    artMarkup.push(`<path d="M${w * 0.82} 0L${w} ${h * 0.22}" fill="none" stroke="${creative.accentColor}" stroke-width="${Math.max(2, w * 0.004)}" opacity="0.48"/>`);
  } else if (creative.decorationStyle === 'confetti') {
    const pieces = [
      [0.08, 0.18, 5, 0], [0.17, 0.76, 4, 1], [0.27, 0.24, 3, 2], [0.38, 0.84, 5, 1],
      [0.57, 0.13, 4, 2], [0.68, 0.83, 3, 0], [0.8, 0.19, 5, 1], [0.92, 0.72, 4, 2],
      [0.94, 0.34, 3, 0], [0.07, 0.56, 4, 2], [0.49, 0.32, 3, 1], [0.75, 0.58, 4, 0],
    ];
    for (const [x, y, size, shape] of pieces) {
      const cx = w * x, cy = h * y;
      if (shape === 0) artMarkup.push(`<circle cx="${cx}" cy="${cy}" r="${size}" fill="${creative.accentColor}" opacity="0.72"/>`);
      else artMarkup.push(`<rect x="${cx - size / 2}" y="${cy - size * 1.5}" width="${size}" height="${size * 3}" fill="${creative.accentColor}" opacity="0.72" transform="rotate(${(x + y) * 180} ${cx} ${cy})"/>`);
    }
  }

  creative.artwork.forEach((item, index) => {
    const defaultWidth = w * (mobile ? 0.42 : 0.18);
    const defaultHeight = h * (mobile ? 0.52 : 0.92);
    const artWidth = item.size ? w * item.size.width / 100 : defaultWidth;
    const artHeight = item.size ? h * item.size.height / 100 : defaultHeight;
    const offset = index * (mobile ? 0.055 : 0.08) * w;
    const defaultX = item.side === 'left'
      ? (mobile ? 13 : 7) + offset / w * 100
      : (mobile ? 87 : 93) - offset / w * 100;
    const position = item.position || { x: defaultX, y: mobile ? 22 : 50 };
    const x = w * position.x / 100;
    const y = h * position.y / 100;
    const clipId = `${clipPrefix}-${index}`;
    const radius = item.shape === 'circle' ? Math.min(artWidth, artHeight) / 2 : item.shape === 'rounded' ? Math.min(24, artWidth * 0.12, artHeight * 0.12) : 0;
    artMarkup.push(`<defs><clipPath id="${clipId}">${item.shape === 'circle'
      ? `<ellipse cx="${x}" cy="${y}" rx="${radius}" ry="${radius}"/>`
      : `<rect x="${x - artWidth / 2}" y="${y - artHeight / 2}" width="${artWidth}" height="${artHeight}" rx="${radius}"/>`}</clipPath></defs>`);
    artMarkup.push(`<image href="${escapeXml(item.url)}" x="${x - artWidth / 2}" y="${y - artHeight / 2}" width="${artWidth}" height="${artHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" transform="rotate(${item.rotation} ${x} ${y})"/>`);
  });

  const maxTextWidth = w * (mobile ? 0.82 : 0.52);
  const scale = key => creative.textScale[key];
  const brandSize = 16 * scale('brand');
  const headlineSize = (mobile ? 36 : Math.max(25, Math.min(w * 0.04, 55))) * scale('headline');
  const taglineSize = Math.max(13, Math.min(w * 0.016, mobile ? 18 : 22)) * scale('tagline');
  const boldSize = Math.max(13, Math.min(w * 0.016, mobile ? 18 : 22)) * scale('boldText');
  const headlineLines = wrapText(creative.headline, maxTextWidth, headlineSize, 3);
  const taglineLines = wrapText(creative.tagline, maxTextWidth, taglineSize, 3);
  const boldLines = wrapText(creative.boldText, maxTextWidth, boldSize, 2);
  const headlineLineHeight = headlineSize * 0.98;
  const taglineLineHeight = taglineSize * 1.5;
  const boldLineHeight = boldSize * 1.5;
  const customTextLayers = creative.textFields.map(field => {
    const fontSize = (field.style === 'heading'
      ? mobile ? 36 : Math.max(25, Math.min(w * 0.04, 55))
      : field.style === 'small' ? Math.max(11, taglineSize * 0.8) : taglineSize) * scale(field.id);
    return {
      ...field,
      fontSize,
      weight: field.style === 'heading' ? 800 : field.style === 'small' ? 600 : 400,
      lineHeight: fontSize * (field.style === 'heading' ? 0.98 : 1.5),
      lines: wrapText(field.text, maxTextWidth, fontSize, 3),
    };
  }).filter(field => field.lines.length);
  const legacyTextHeight = headlineLines.length * headlineLineHeight
    + ((taglineLines.length || boldLines.length) ? 14 + taglineLines.length * taglineLineHeight + boldLines.length * boldLineHeight : 0);
  const hasTextBeforeCustom = creative.showBrand || legacyTextHeight > 0;
  const customTextHeight = customTextLayers.reduce((height, field, index) =>
    height + field.lines.length * field.lineHeight + (index > 0 || hasTextBeforeCustom ? 14 : 0), 0);
  const contentHeight = (creative.showBrand ? 29 * scale('brand') : 0)
    + legacyTextHeight + customTextHeight + (creative.ctaText ? 55 : 0);
  let flowY = mobile ? h - 32 - contentHeight : (h - contentHeight) / 2;
  const copy = [];
  const addText = (key, lines, fontSize, lineHeight, fallbackY, weight) => {
    if (!lines.length) return;
    const saved = creative.positions[key];
    const y = saved ? h * saved.y / 100 - lines.length * lineHeight / 2 : fallbackY;
    const x = saved ? w * saved.x / 100 : textX(key);
    copy.push(textMarkup(lines, { x, y, fontSize, lineHeight, weight, fill: creative.textColor, anchor, family: font }));
  };
  if (creative.showBrand) {
    addText('brand', ['RA  /  READAGORA'], brandSize, 29 * scale('brand'), flowY, 800);
    flowY += 29 * scale('brand');
  }
  addText('headline', headlineLines, headlineSize, headlineLineHeight, flowY, 800);
  flowY += headlineLines.length * headlineLineHeight;
  if (taglineLines.length || boldLines.length) flowY += 14;
  addText('tagline', taglineLines, taglineSize, taglineLineHeight, flowY, 400);
  flowY += taglineLines.length * taglineLineHeight;
  addText('boldText', boldLines, boldSize, boldLineHeight, flowY, 700);
  flowY += boldLines.length * boldLineHeight;
  customTextLayers.forEach((field, index) => {
    if (index > 0 || hasTextBeforeCustom) flowY += 14;
    addText(field.id, field.lines, field.fontSize, field.lineHeight, flowY, field.weight);
    flowY += field.lines.length * field.lineHeight;
  });

  if (creative.ctaText) {
    const buttonHeight = 42 * creative.buttonStyle.height / 100;
    const buttonWidth = Math.min(maxTextWidth, (creative.ctaText.length * 8 + 50)) * creative.buttonStyle.width / 100;
    const defaultX = align === 'left' ? (w * 0.1 + buttonWidth / 2) / w * 100 : 50;
    const buttonPosition = positionOf(creative, 'cta', {
      x: defaultX,
      y: (flowY + 5 + buttonHeight / 2) / h * 100,
    });
    const x = w * buttonPosition.x / 100;
    const y = h * buttonPosition.y / 100;
    artMarkup.push(`<rect x="${x - buttonWidth / 2}" y="${y - buttonHeight / 2}" width="${buttonWidth}" height="${buttonHeight}" rx="${creative.buttonStyle.radius}" fill="${creative.accentColor}"/>`);
    copy.push(`<text x="${x}" y="${y}" fill="#111111" font-family="${font}" font-size="14" font-weight="800" text-anchor="middle" alignment-baseline="central">${escapeXml(`${creative.ctaText}  →`)}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><rect width="${w}" height="${h}" fill="${creative.backgroundColor}"/>${artMarkup.join('')}${copy.join('')}</svg>`;
}
