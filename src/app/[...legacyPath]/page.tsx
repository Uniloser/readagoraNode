import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LegacySiteRuntime } from '@/components/legacy-site-runtime';
import { isUuid } from '@/lib/routing/identifiers.js';

const profileTitles: Record<string, string> = {
  settings: 'Profile settings', balance: 'Gem balance', gems: 'Gem balance', rewards: 'Rewards',
  'alpha-perks': 'Alpha rewards', exchange: 'Gem rewards', service: 'Help and support',
  'top-up': 'Gem wallet', subscription: 'ReadAgora Premium', inbox: 'Inbox', blocked: 'Blocked users',
  'author-center': 'Author Center', 'author-analytics': 'Creator analytics', analytics: 'Creator analytics',
  'creator-center': 'Creator Center', promotions: 'Promotions', moderation: 'Moderation queue',
  'agora-coins': 'Agora Coins', report: 'Report a problem', 'delete-account': 'Delete your account',
  deleteaccount: 'Delete your account', 'community-terms': 'Community terms', communityconsent: 'Community terms',
};

export async function generateMetadata({ params }: { params: Promise<{ legacyPath: string[] }> }): Promise<Metadata> {
  const { legacyPath } = await params;
  const path = `/${legacyPath.join('/')}`;
  const requiresNoIndex = ['profile', 'workroom', 'auth', 'reader'].includes(legacyPath[0])
    || ['library', 'login', 'signup', 'search', 'forgot-password', 'reset-password', 'write'].includes(legacyPath[0])
    || legacyPath[0] === 'create'
    || (legacyPath[0] === 'story' && ['manage', 'edit-chapter', 'edit-comic-chapter'].includes(legacyPath[2] || ''));
  const lastPart = legacyPath.at(-1)?.replaceAll('-', ' ') || 'ReadAgora';
  const prettyLastPart = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
  let title = prettyLastPart;
  let description = 'Explore stories, creator tools, and community features on ReadAgora.';

  if (path === '/discover' || path === '/feed') { title = 'Discover stories'; description = 'Find your next world in stories and comics from ReadAgora creators.'; }
  else if (path === '/write') { title = 'Creator Workroom'; description = 'Create stories, edit chapters, and manage your ReadAgora catalogue.'; }
  else if (path === '/privacy' || path === '/legal/privacy') { title = 'Privacy policy'; description = 'Learn how ReadAgora handles account information, stories, and reading activity.'; }
  else if (path === '/terms' || path === '/legal/terms' || path.endsWith('/community-terms') || path.endsWith('/communityconsent')) { title = 'Community terms'; description = 'Read the rules for creating, sharing, and discussing content on ReadAgora.'; }
  else if (path === '/forgot-password') { title = 'Reset your password'; description = 'Request a secure link to reset your ReadAgora password.'; }
  else if (path === '/auth/intent') { title = 'Sign in to ReadAgora'; description = 'Sign in to continue with a ReadAgora action, then return to the page you were viewing.'; }
  else if (path === '/reset-password' || path === '/auth/reset-password') { title = 'Choose a new password'; description = 'Set a new password for your ReadAgora account.'; }
  else if (path === '/account-deletion' || path === '/delete-account' || path.endsWith('/delete-account') || path.endsWith('/deleteaccount')) { title = 'Delete your ReadAgora account'; description = 'Review your options for permanently deleting your ReadAgora account.'; }
  else if (legacyPath[0] === 'profile') { title = profileTitles[legacyPath[1]?.toLowerCase()] || 'Your profile'; description = `${title} and account tools for ReadAgora.`; }
  else if (legacyPath[0] === 'discovery') { title = `${prettyLastPart} stories`; description = `Discover ${prettyLastPart.toLowerCase()} stories from ReadAgora readers and creators.`; }
  else if (legacyPath[0] === 'community') { title = legacyPath[1] === 'post' || legacyPath.length === 2 ? 'Community post' : 'Community'; description = 'Join readers and creators in the ReadAgora community.'; }
  else if (legacyPath[0] === 'workroom') { title = legacyPath.length > 2 ? 'Manage your story' : 'Creator Workroom'; description = 'Create stories, edit chapters, and manage your ReadAgora catalogue.'; }
  else if (legacyPath[0] === 'creator' || legacyPath[0] === 'user') { title = legacyPath.length > 1 ? `${legacyPath[1]} on ReadAgora` : 'Creator guide'; description = 'Meet ReadAgora creators and explore their stories.'; }

  return {
    title,
    description,
    openGraph: { title, description },
    ...(requiresNoIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function LegacyRoutePage({ params }: { params: Promise<{ legacyPath: string[] }> }) {
  const { legacyPath } = await params;
  if (legacyPath.length === 1 && legacyPath[0] === 'discover') {
    return <LegacySiteRuntime title="Discover stories" description="Find your next world in stories and comics from ReadAgora creators." />;
  }
  if (!isSupportedLegacyRoute(legacyPath)) notFound();
  const lastPart = legacyPath.at(-1)?.replaceAll('-', ' ') || 'ReadAgora';
  const title = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
  return <LegacySiteRuntime title={title} description={loadingDescription(legacyPath)} />;
}

function loadingDescription(parts: string[]) {
  const path = `/${parts.join('/')}`;
  if (path === '/feed') return 'Find your next world in stories and comics from ReadAgora creators.';
  if (path === '/write') return 'Create stories, edit chapters, and manage your ReadAgora catalogue.';
  if (path === '/privacy' || path === '/legal/privacy') return 'Review how ReadAgora handles account details, stories, and reading activity.';
  if (path === '/terms' || path === '/legal/terms') return 'Review the terms for creating, sharing, and discussing content on ReadAgora.';
  if (path === '/forgot-password') return 'Request a secure link to reset your ReadAgora password.';
  if (path === '/reset-password' || path === '/auth/reset-password') return 'Choose a new password for your ReadAgora account.';
  if (parts[0] === 'discovery') return `Explore ${parts[1]?.replaceAll('_', ' ') || 'all'} stories from ReadAgora creators.`;
  if (parts[0] === 'community') return parts[1] === 'post' || parts.length > 1
    ? 'Open this community conversation and join the discussion.'
    : 'Join readers and creators for conversations, recommendations, and updates.';
  if (parts[0] === 'workroom') return parts.length > 2
    ? 'Edit story details, chapters, and publication settings in your creator workroom.'
    : 'Create stories, manage chapters, and review how readers respond.';
  if (parts[0] === 'profile') return `${profileTitles[parts[1]?.toLowerCase()] || 'Profile'} and account tools for ReadAgora.`;
  if (parts[0] === 'creator' || parts[0] === 'user') return 'Meet ReadAgora creators and explore their stories.';
  if (parts[0] === 'reader') return 'Continue to a ReadAgora story or chapter.';
  if (parts[0] === 'auth') return 'Continue securely with your ReadAgora account.';
  return 'Explore stories, creator tools, and community features on ReadAgora.';
}


const discoverySections = new Set(['all', 'for_you', 'trending', 'rising', 'recently_updated', 'because_you_read', 'hidden_gems', 'genre', 'ai_generated']);
const profileSections = new Set(['settings', 'balance', 'gems', 'rewards', 'alpha-perks', 'exchange', 'service', 'top-up', 'subscription', 'inbox', 'blocked', 'author-center', 'author-analytics', 'analytics', 'creator-center', 'promotions', 'moderation', 'agora-coins', 'report', 'deleteaccount', 'delete-account', 'communityconsent', 'community-terms']);

function isSupportedLegacyRoute(parts: string[]) {
  // Shared client-rendered legal pages must also be allowed through the
  // server route gate so direct links and hard refreshes do not 404.
  if (parts.length === 1 && ['terms', 'privacy'].includes(parts[0])) return true;
  if (parts.length === 1 && ['feed', 'write'].includes(parts[0])) return true;
  if (parts.length === 1 && ['login', 'signup', 'search'].includes(parts[0])) return true;
  if (parts.length === 2 && parts[0] === 'create' && parts[1] === 'story') return true;
  if (parts.length === 2 && parts[0] === 'auth' && parts[1] === 'callback') return true;
  if (parts.length === 1 && ['forgot-password', 'reset-password', 'account-deletion', 'delete-account'].includes(parts[0])) return true;
  if (parts.length === 2 && parts[0] === 'auth' && parts[1] === 'reset-password') return true;
  if (parts.length === 2 && parts[0] === 'auth' && parts[1] === 'intent') return true;
  if (parts[0] === 'discovery' && parts.length === 1) return true;
  if (parts[0] === 'discovery' && parts.length === 2) return discoverySections.has(parts[1].toLowerCase());
  if (parts[0] === 'creator' && parts.length === 1) return true;
  if (parts[0] === 'creator' && parts.length === 2) return Boolean(parts[1].trim());
  if (parts[0] === 'user' && parts.length === 2) return true;
  if (parts[0] === 'reader' && parts.length === 2) return isUuid(parts[1]);
  if (parts[0] === 'legal' && parts.length === 2 && ['privacy', 'terms'].includes(parts[1])) return true;
  if (parts[0] === 'profile' && parts.length === 2) return profileSections.has(parts[1].toLowerCase());
  if (parts[0] === 'community' && parts.length === 1) return true;
  if (parts[0] === 'community' && parts.length === 2) return isUuid(parts[1]);
  if (parts[0] === 'community' && parts.length === 3 && parts[1] === 'post') return isUuid(parts[2]);
  if (parts[0] === 'workroom' && parts.length === 3 && parts[1] === 'story') return isUuid(parts[2]);
  if (parts[0] === 'workroom' && parts.length === 4 && parts[1] === 'story') return isUuid(parts[2]) && parts[3] === 'import';
  if (parts[0] === 'workroom' && parts.length === 5 && parts[1] === 'story') return isUuid(parts[2]) && parts[3] === 'chapter' && isUuid(parts[4]);
  if (parts[0] === 'story' && parts.length === 3 && ['manage', 'edit-chapter', 'edit-comic-chapter'].includes(parts[2])) return isUuid(parts[1]);
  if (parts[0] === 'story' && parts.length === 2) return isUuid(parts[1]);
  if (parts[0] === 'read' && parts.length === 3) return isUuid(parts[1]) && isUuid(parts[2]);
  if (parts[0] === 'events' && parts.length === 1) return true;
  if (parts[0] === 'library' && parts.length === 1) return true;
  if (parts[0] === 'workroom' && parts.length === 1) return true;
  if (parts[0] === 'profile' && parts.length === 1) return true;
  return false;
}
