import { notFound } from 'next/navigation';
import { LegacySiteRuntime } from '@/components/legacy-site-runtime';
import { isUuid } from '@/lib/routing/identifiers.js';

export const metadata = { title: 'Read a story', description: 'Explore the chapters, characters, and worlds in this ReadAgora story.' };

export default async function StoryPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  if (!isUuid(storyId)) notFound();
  return <LegacySiteRuntime title="Read a ReadAgora story" description={`Opening story ${storyId} and its published chapters.`} />;
}
