import { notFound } from 'next/navigation';
import { ApplicationFrame } from '@/components/application/frame';
import { StoryPage as Story } from '@/components/application/stories';
import { isUuid } from '@/lib/routing/identifiers.js';

export const metadata = { title: 'Read a story', description: 'Explore the chapters, characters, and worlds in this ReadAgora story.' };

export default async function StoryPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  if (!isUuid(storyId)) notFound();
  return <ApplicationFrame><Story id={storyId} /></ApplicationFrame>;
}
