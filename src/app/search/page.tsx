import { ApplicationFrame } from '@/components/application/frame';
import { SearchPage as SearchScreen } from '@/components/application/discovery';

export const metadata = { title: 'Search stories', description: 'Search ReadAgora stories, genres, and creators.', robots: { index: false, follow: false } };

export default function SearchPage() {
  return <ApplicationFrame><SearchScreen /></ApplicationFrame>;
}
