import type { Metadata } from 'next';
import { DownloadPage } from '@/app/components/download/download-page';

export const metadata: Metadata = {
  title: 'Download ReadAgora for Android',
  description: 'Get ReadAgora for Android and find your next story, share your writing, and meet a community of readers.',
  alternates: { canonical: '/download' },
};

function safeHttpsUrl(value: string | undefined) {
  if (!value) return '';
  try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : ''; }
  catch { return ''; }
}

export default function Page() {
  return <DownloadPage
    apkUrl={safeHttpsUrl(process.env.NEXT_PUBLIC_ANDROID_APK_URL)}
    playStoreUrl={safeHttpsUrl(process.env.NEXT_PUBLIC_PLAY_STORE_URL)}
    uptodownUrl={safeHttpsUrl(process.env.NEXT_PUBLIC_UPTODOWN_URL)}
  />;
}
