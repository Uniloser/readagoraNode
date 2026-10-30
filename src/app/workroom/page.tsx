import { LegacySiteRuntime } from '@/components/legacy-site-runtime';

export const metadata = { title: 'Creator Workroom', description: 'Create stories, manage chapters, and review your ReadAgora readership.', robots: { index: false, follow: false } };

export default function WorkroomPage() {
  return <LegacySiteRuntime title="Your creator workroom" description="Manage your stories, drafts, chapters, and creator earnings." />;
}
