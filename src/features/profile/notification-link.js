import { isUuid } from '../../lib/routing/identifiers.js';

export function notificationLink(item) {
  const storyId = item.story_id || item.data?.story_id;
  const chapterId = item.chapter_id || item.data?.chapter_id;
  if (isUuid(storyId)) {
    if (isUuid(chapterId) && ['chapter_published', 'comment'].includes(item.notification_type)) {
      return `/read/${encodeURIComponent(storyId)}/${encodeURIComponent(chapterId)}`;
    }
    return `/story/${encodeURIComponent(storyId)}`;
  }
  const username = item.actor?.username;
  return item.notification_type === 'new_follower' && username ? `/creator/${encodeURIComponent(username)}` : '';
}
