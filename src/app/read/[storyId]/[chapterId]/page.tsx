import { notFound } from 'next/navigation';
import { LegacySiteRuntime } from '@/components/legacy-site-runtime';
import { isUuid } from '@/lib/routing/identifiers.js';

export const metadata = { title: 'Read a chapter', description: 'Continue reading a story chapter on ReadAgora.' };

export default async function ReaderPage({ params }: { params: Promise<{ storyId: string; chapterId: string }> }) {
  const { storyId, chapterId } = await params;
  if (!isUuid(storyId) || !isUuid(chapterId)) notFound();
  return <LegacySiteRuntime title="Read your chapter" description={`Opening a chapter from ReadAgora story ${storyId}.`} />;
}
