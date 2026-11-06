import { notFound } from 'next/navigation';
import { ApplicationFrame } from '@/components/application/frame';
import { ReaderPage as ReaderScreen } from '@/components/application/stories';
import { isUuid } from '@/lib/routing/identifiers.js';

export const metadata = { title: 'Read a chapter', description: 'Continue reading a story chapter on ReadAgora.' };

export default async function ReaderPage({ params }: { params: Promise<{ storyId: string; chapterId: string }> }) {
  const { storyId, chapterId } = await params;
  if (!isUuid(storyId) || !isUuid(chapterId)) notFound();
  return <ApplicationFrame><ReaderScreen storyId={storyId} chapterId={chapterId} /></ApplicationFrame>;
}
