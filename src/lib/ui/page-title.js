const STATIC_TITLES = {
  '/': 'Discover stories',
  '/login': 'Sign in',
  '/auth/intent': 'Welcome to ReadAgora',
  '/signup': 'Create an account',
  '/forgot-password': 'Reset your password',
  '/reset-password': 'Choose a new password',
  '/search': 'Search stories',
  '/library': 'Your library',
  '/community': 'Community',
  '/events': 'Events',
  '/creator': 'Creator guide',
  '/workroom': 'Creator Workroom',
  '/profile': 'Your profile',
  '/profile/settings': 'Profile settings',
  '/profile/balance': 'Gem balance',
  '/profile/rewards': 'Rewards',
  '/profile/alpha-perks': 'Alpha rewards',
  '/profile/inbox': 'Inbox',
  '/profile/blocked': 'Blocked users',
  '/profile/author-center': 'Author Center',
  '/profile/author-analytics': 'Creator analytics',
  '/profile/analytics': 'Creator analytics',
  '/profile/creator-center': 'Creator Center',
  '/profile/promotions': 'Promotions',
  '/profile/report': 'Report a problem',
  '/profile/moderation': 'Moderation queue',
  '/profile/agora-coins': 'Agora Coins',
  '/profile/exchange': 'Gem rewards',
  '/profile/service': 'Help and support',
  '/profile/top-up': 'Gem purchases',
  '/profile/subscription': 'ReadAgora Premium',
  '/privacy': 'Privacy policy',
  '/terms': 'Community terms',
  '/account-deletion': 'Delete your account',
  '/delete-account': 'Delete your account',
};

export function setDocumentTitle(path, state) {
  let title = STATIC_TITLES[path];

  if (path.startsWith('/story/')) title = state.story?.title || 'Read a story';
  else if (path.startsWith('/read/')) {
    const story = state.story?.title;
    const chapter = state.chapter?.title;
    title = [chapter, story].filter(Boolean).join(' · ') || 'Read a chapter';
  } else if (path.startsWith('/creator/')) {
    const user = state.pageData?.user;
    title = user?.display_name || user?.username || 'Creator profile';
  } else if (path.startsWith('/community/post/')) title = 'Community post';
  else if (path.startsWith('/workroom/story/')) title = path.endsWith('/import') ? 'Import manuscript' : 'Manage story';
  else if (path.startsWith('/discovery/')) {
    const section = path.split('/')[2] || 'all';
    title = section.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
  } else if (!title && path.startsWith('/profile/')) title = 'Your ReadAgora account';
  else if (!title && path.startsWith('/auth/')) title = 'Secure sign-in';
  else if (!title) title = 'ReadAgora';

  document.title = `${title} | ReadAgora.com`;
}
