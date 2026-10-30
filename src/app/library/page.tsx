import { LegacySiteRuntime } from '@/components/legacy-site-runtime';

export const metadata = { title: 'Your library', description: 'Continue reading and revisit your saved ReadAgora stories.', robots: { index: false, follow: false } };

export default function LibraryPage() {
  return <LegacySiteRuntime title="Your reading room" description="Pick up where you left off or find a story you saved for later." />;
}
