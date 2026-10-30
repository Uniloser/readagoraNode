import type { Metadata } from 'next';
import { DownloadAboutPage } from '@/app/components/download/download-about-page';

export const metadata: Metadata = {
  title: 'About ReadAgora',
  description: 'Learn about ReadAgora, a home for readers and writers to discover stories, share their work, and connect.',
  alternates: { canonical: '/download/about' },
};

export default function AboutPage() {
  return <DownloadAboutPage />;
}
