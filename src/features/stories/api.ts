import { apiRequest } from '@/lib/api/client';
import type { Story } from '@/features/discovery/api';

export type Chapter = { id: string; story_id: string; title: string; status: string; chapter_order: number; published_at?: string | null };
export type StoryDetail = Story & { view_count?: number; tags?: string[] };
export type ReaderChapter = Chapter & { content?: string | null; panels?: Array<{ id?: string; image_url: string; alt_text?: string | null }> };

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export async function getStory(id: string): Promise<StoryDetail> {
  const value = await apiRequest<unknown>(`/stories/${encodeURIComponent(id)}`);
  if (!record(value) || typeof value.id !== 'string' || typeof value.title !== 'string') throw new Error('The story API returned an unexpected response.');
  const author = record(value.author) ? value.author : null;
  return { id: value.id, title: value.title, description: typeof value.description === 'string' ? value.description : null, genre: typeof value.genre === 'string' ? value.genre : null, content_type: typeof value.content_type === 'string' ? value.content_type : null, cover_url: typeof value.cover_url === 'string' ? value.cover_url : null, author: author ? { username: typeof author.username === 'string' ? author.username : null, display_name: typeof author.display_name === 'string' ? author.display_name : null } : null, view_count: typeof value.view_count === 'number' ? value.view_count : 0, tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [] };
}
export async function getChapters(id: string): Promise<Chapter[]> {
  const value = await apiRequest<unknown>(`/stories/${encodeURIComponent(id)}/chapters`);
  if (!Array.isArray(value)) throw new Error('The chapter list API returned an unexpected response.');
  return value.flatMap((item): Chapter[] => record(item) && typeof item.id === 'string' && typeof item.story_id === 'string' && typeof item.title === 'string' && typeof item.status === 'string' && typeof item.chapter_order === 'number' ? [{ id: item.id, story_id: item.story_id, title: item.title, status: item.status, chapter_order: item.chapter_order, published_at: typeof item.published_at === 'string' ? item.published_at : null }] : []).filter((chapter) => chapter.status === 'published').sort((a, b) => a.chapter_order - b.chapter_order);
}
export async function getChapter(id: string): Promise<ReaderChapter> {
  const value = await apiRequest<unknown>(`/chapters/${encodeURIComponent(id)}`);
  if (!record(value) || typeof value.id !== 'string' || typeof value.story_id !== 'string' || typeof value.title !== 'string' || typeof value.chapter_order !== 'number') throw new Error('The chapter API returned an unexpected response.');
  return { id: value.id, story_id: value.story_id, title: value.title, chapter_order: value.chapter_order, status: typeof value.status === 'string' ? value.status : '', content: typeof value.content === 'string' ? value.content : '', panels: Array.isArray(value.panels) ? value.panels.flatMap((panel) => record(panel) && typeof panel.image_url === 'string' ? [{ image_url: panel.image_url, alt_text: typeof panel.alt_text === 'string' ? panel.alt_text : null }] : []) : [] };
}
