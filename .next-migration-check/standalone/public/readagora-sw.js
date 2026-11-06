const CACHE_NAME = 'readagora-shell-v1';
const MAX_CACHED_PAGES = 30;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.add('/')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('readagora-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('push', event => {
  let message = {};
  try { message = event.data?.json() || {}; } catch { message = { body: event.data?.text() || '' }; }
  const data = message.data && typeof message.data === 'object' ? message.data : {};
  event.waitUntil(self.registration.showNotification(message.title || 'ReadAgora update', {
    body: message.body || 'You have a new ReadAgora notification.',
    icon: '/assets/mark.png',
    badge: '/assets/mark.png',
    tag: data.notificationId || 'readagora-update',
    data: { ...data, url: typeof data.url === 'string' ? data.url : '/profile/inbox' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    let target = new URL('/profile/inbox', self.location.origin);
    try {
      const candidate = new URL(event.notification.data?.url || '/profile/inbox', self.location.origin);
      if (candidate.origin === self.location.origin) target = candidate;
    } catch { /* Use the inbox for malformed notification destinations. */ }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client && 'navigate' in client) {
        await client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
          const keys = await cache.keys();
          const pages = keys.filter(key => key.mode === 'navigate');
          while (pages.length > MAX_CACHED_PAGES) await cache.delete(pages.shift());
        }
        return response;
      } catch {
        return (await cache.match(request)) || (await cache.match('/')) || new Response('Connect to the internet once to open ReadAgora.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/vendor/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const network = fetch(request).then(response => {
        if (response.ok) void cache.put(request, response.clone());
        return response;
      }).catch(() => cached || Response.error());
      return cached || network;
    })());
  }
});
