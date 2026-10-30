import Link from 'next/link';
import type { Story } from '@/features/discovery/api';
import { StoryCover } from '@/components/story-cover';

export function StoryCard({ story, index = 0 }: { story: Story; index?: number }) {
  const author = story.author?.display_name || story.author?.username || 'ReadAgora creator';
  return <article className="story-card" style={{ animationDelay: `${index * 45}ms` }}><Link href={`/story/${encodeURIComponent(story.id)}`} prefetch={false} aria-label={`Read ${story.title} by ${author}`}><div className="card-art"><StoryCover src={story.cover_url} title={story.title} />{story.content_type === 'comic' && <span className="card-type">COMIC</span>}</div><div className="card-copy"><span className="card-genre">{story.genre || 'Original'}</span><h3>{story.title}</h3><p>by {author}</p></div></Link></article>;
}

export function FeaturedStoryCard({ story }: { story: Story }) {
  const author = story.author?.display_name || story.author?.username || 'ReadAgora creator';
  return <section className="discover-feature" aria-label="Featured story"><Link className="discover-feature-cover" href={`/story/${encodeURIComponent(story.id)}`} prefetch={false} aria-label={`Read ${story.title} by ${author}`}><StoryCover src={story.cover_url} title={story.title} featured /></Link><div className="discover-feature-copy"><span className="eyebrow">{story.content_type === 'comic' ? 'FEATURED VISUAL STORY' : 'A STORY TO DISCOVER'}</span><h2>{story.title}</h2><p className="discover-feature-author">by {author}</p>{story.description && <p className="discover-feature-description">{story.description}</p>}<div className="discover-feature-meta"><span>{story.genre || 'Original'}</span>{story.content_type === 'comic' && <span>Comic</span>}</div><Link className="discover-feature-action" href={`/story/${encodeURIComponent(story.id)}`} prefetch={false}>Open story <span aria-hidden="true">→</span></Link></div></section>;
}
