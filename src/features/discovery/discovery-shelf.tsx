import Link from 'next/link';
import type { Shelf, Story } from '@/features/discovery/api';
import { StoryCard } from '@/components/story-card';

export function DiscoveryShelf({ shelf, featuredStoryId }: { shelf: Shelf; featuredStoryId?: string }) {
  const stories = shelf.stories.filter((story) => story.id !== featuredStoryId).slice(0, 12);
  if (stories.length === 0) return null;
  return <section className={`shelf shelf-${shelf.type}`}>
    <div className="shelf-heading">
      <div><span className="eyebrow">{shelf.type === 'trending' ? 'POPULAR WITH READERS' : 'READAGORA PICKS'}</span><h2>{shelf.title}</h2></div>
      <Link className="text-link" href={`/search?q=${encodeURIComponent(shelf.title)}`}>Explore <span aria-hidden="true">→</span></Link>
    </div>
    <div className="story-rail" role="region" aria-label={`${shelf.title} stories`}>
      {stories.map((story: Story, index) => <StoryCard key={story.id} story={story} index={index} />)}
    </div>
  </section>;
}
