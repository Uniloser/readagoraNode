import { ApplicationFrame } from '@/components/application/frame';
import { LibraryPage as LibraryScreen } from '@/components/application/discovery';

export const metadata = { title: 'Your library', description: 'Continue reading and revisit your saved ReadAgora stories.', robots: { index: false, follow: false } };

export default function LibraryPage() {
  return <ApplicationFrame><LibraryScreen /></ApplicationFrame>;
}
