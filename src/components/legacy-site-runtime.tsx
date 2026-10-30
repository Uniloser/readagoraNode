'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    READAGORA_API_URL?: string;
    READAGORA_SUPABASE_URL?: string;
    READAGORA_SUPABASE_ANON_KEY?: string;
  }
}

async function loadSiteRuntime() {
  try {
    await import('@/client/legacy-app.js');
    return true;
  } catch (error) {
    console.error('ReadAgora failed to start.', error);
    return false;
  }
}

function loadLottieInBackground() {
  if ((window as Window & { lottie?: unknown }).lottie) return;
  if (document.querySelector('script[data-readagora-runtime="lottie"]')) return;

  const lottie = document.createElement('script');
  lottie.src = '/vendor/lottie.min.js';
  lottie.dataset.readagoraRuntime = 'lottie';
  lottie.onload = () => window.dispatchEvent(new Event('readagora:lottie-ready'));
  document.body.appendChild(lottie);
}

export function LegacySiteRuntime({ title, description }: { title: string; description: string }) {
  const [runtimeFailed, setRuntimeFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    window.READAGORA_API_URL = process.env.NEXT_PUBLIC_READAGORA_API_URL || '';
    window.READAGORA_SUPABASE_URL = process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL || '';
    window.READAGORA_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY || '';

    void loadSiteRuntime().then((started) => {
      if (mounted) setRuntimeFailed(!started);
    });
    loadLottieInBackground();
    return () => { mounted = false; };
  }, []);

  return <div id="app" aria-live="polite" data-route-shell>
    {runtimeFailed ? <main className="workspace route-loading runtime-failure" role="alert">
      <span className="eyebrow">READAGORA / PLEASE RETRY</span>
      <h1>ReadAgora couldn’t start.</h1>
      <p>The page could not load. Check your connection, then reload to try again.</p>
      <button className="primary-button" type="button" onClick={() => window.location.reload()}>Reload ReadAgora</button>
    </main> : <main className="workspace route-loading" aria-busy="true">
      <span className="eyebrow">READAGORA / YOUR NEXT CHAPTER</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <span className="route-loading-indicator" aria-hidden="true" />
      <noscript>Enable JavaScript to use ReadAgora.</noscript>
    </main>}
  </div>;
}
