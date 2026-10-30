import { LegacySiteRuntime } from '@/components/legacy-site-runtime';

export const metadata = { title: 'Search stories', description: 'Search ReadAgora stories, genres, and creators.', robots: { index: false, follow: false } };

export default function SearchPage() {
  return <LegacySiteRuntime title="Search ReadAgora" description="Find a story by title, creator, or genre." />;
}
