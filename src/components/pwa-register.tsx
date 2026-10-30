'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // Development chunk URLs are reused by Next. An offline cache can serve
      // yesterday's runtime under those URLs and hide fixes after a refresh.
      if ('serviceWorker' in navigator) {
        void (async () => {
          const isReadAgoraWorker = (url: string) => {
            try {
              const worker = new URL(url);
              return worker.origin === location.origin && worker.pathname === '/readagora-sw.js';
            } catch { return false; }
          };
          const controlled = isReadAgoraWorker(navigator.serviceWorker.controller?.scriptURL || '');
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.filter(registration =>
            [registration.active, registration.waiting, registration.installing]
              .some(worker => worker && isReadAgoraWorker(worker.scriptURL))
          ).map(registration => registration.unregister()));
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.filter(key => key.startsWith('readagora-shell-')).map(key => caches.delete(key)));
          }
          if (controlled) location.reload();
        })().catch(error => console.warn('ReadAgora development cache cleanup failed.', error));
      }
      return;
    }
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      void navigator.serviceWorker.register('/readagora-sw.js').catch(error => console.warn('ReadAgora offline shell could not be installed.', error));
    }
  }, []);
  return null;
}
