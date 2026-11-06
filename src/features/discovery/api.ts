import { apiRequest } from '@/lib/api/client';

export type Story = {
  id: string; title: string; description?: string | null; genre?: string | null;
  content_type?: string | null; cover_url?: string | null;
  is_ai_generated?: boolean; view_count?: number; views_count?: number; tags?: string[];
  author?: { id?: string; display_name?: string | null; username?: string | null; avatar_url?: string | null } | null;
};
export type Shelf = { id: string; type: string; title: string; stories: Story[]; nextCursor?: string | null; sourceStory?: { id: string; title: string } | null; positions?: Record<string, number> };

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function storyFrom(value: unknown): Story | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string') return null;
  const author = isRecord(value.author) ? value.author : null;
  return { id: value.id, title: value.title, description: typeof value.description === 'string' ? value.description : null, genre: typeof value.genre === 'string' ? value.genre : null, content_type: typeof value.content_type === 'string' ? value.content_type : null, cover_url: typeof value.cover_url === 'string' ? value.cover_url : null, is_ai_generated: value.is_ai_generated === true, view_count: typeof value.view_count === 'number' ? value.view_count : typeof value.views_count === 'number' ? value.views_count : 0, views_count: typeof value.views_count === 'number' ? value.views_count : undefined, tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [], author: author ? { id: typeof author.id === 'string' ? author.id : undefined, display_name: typeof author.display_name === 'string' ? author.display_name : null, username: typeof author.username === 'string' ? author.username : null, avatar_url: typeof author.avatar_url === 'string' ? author.avatar_url : null } : null };
}

export async function getDiscovery(): Promise<Shelf[]> {
  const result = await apiRequest<unknown>('/discovery');
  const payload = isRecord(result) && 'data' in result ? result.data : result;
  if (!isRecord(payload) || !Array.isArray(payload.shelves)) throw new Error('The discovery API returned an unexpected response.');
  return payload.shelves.flatMap((item): Shelf[] => isRecord(item) && typeof item.title === 'string' && Array.isArray(item.stories) ? [{ id: typeof item.id === 'string' ? item.id : item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), type: typeof item.type === 'string' ? item.type : 'genre', title: item.title, stories: item.stories.flatMap((story) => { const parsed = storyFrom(story); return parsed ? [parsed] : []; }), nextCursor: typeof item.nextCursor === 'string' ? item.nextCursor : null, sourceStory: isRecord(item.sourceStory) && typeof item.sourceStory.id === 'string' && typeof item.sourceStory.title === 'string' ? { id: item.sourceStory.id, title: item.sourceStory.title } : null, positions: isRecord(item.positions) ? Object.fromEntries(Object.entries(item.positions).filter((entry): entry is [string, number] => typeof entry[1] === 'number')) : undefined }] : []);
}

export async function searchStories(query: string): Promise<Story[]> {
  const result = await apiRequest<unknown>(`/search?q=${encodeURIComponent(query)}`);
  if (!Array.isArray(result)) return [];
  return result.flatMap((item) => { const parsed = storyFrom(item); return parsed ? [parsed] : []; });
}
