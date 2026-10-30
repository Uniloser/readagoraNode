export function isSafeContentUrl(value, imageSource = false) {
  if (imageSource && /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(value.trim())) return true;
  try {
    const protocol = new URL(value, 'https://readagora.invalid').protocol;
    return (imageSource ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(protocol);
  } catch { return false; }
}

export function sanitizeStoryHtml(content = '') {
  const template = document.createElement('template');
  template.innerHTML = content;
  template.content.querySelectorAll('script,style,iframe,object,embed').forEach(node => node.remove());
  template.content.querySelectorAll('*').forEach(node => [...node.attributes].forEach(attr => {
    if (/^on/i.test(attr.name) || (['href', 'src'].includes(attr.name) && !isSafeContentUrl(attr.value, attr.name === 'src' && node.tagName === 'IMG'))) {
      node.removeAttribute(attr.name);
    }
  }));
  return template.innerHTML;
}
