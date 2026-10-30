import { sanitizeStoryHtml, isSafeContentUrl } from './story-html.js';

export async function cacheChapterIllustrations(content, cacheImage) {
  const template = document.createElement('template');
  template.innerHTML = sanitizeStoryHtml(content || '');
  // The reader supports Markdown illustrations as well as imported HTML images.
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    const matches = [...node.textContent.matchAll(/!\[(.*?)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)(?:\s+"([^"]*)")?\)/gi)];
    if (!matches.length) continue;
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const match of matches) {
      fragment.append(document.createTextNode(node.textContent.slice(offset, match.index)));
      const image = document.createElement('img');
      image.setAttribute('src', match[2]);
      image.setAttribute('alt', match[1] || match[3] || 'Story illustration');
      fragment.append(image);
      offset = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(node.textContent.slice(offset)));
    node.replaceWith(fragment);
  }
  for (const image of template.content.querySelectorAll('img')) {
    const src = image.getAttribute('src');
    if (!src) continue;
    const cached = await cacheImage(src);
    if (!cached.startsWith('data:') || !isSafeContentUrl(cached, true)) {
      throw new Error('An illustration uses an unsupported offline image format. Use PNG, JPEG, GIF, WebP or AVIF.');
    }
    image.setAttribute('src', cached);
    // A network srcset would otherwise override the cached source when offline.
    image.removeAttribute('srcset');
  }
  template.content.querySelectorAll('picture source').forEach(source => source.remove());
  return template.innerHTML;
}
