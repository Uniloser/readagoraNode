import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ApplicationFrame } from '@/components/application/frame';
import { AccountToolsPage } from '@/components/application/account-tools';
import { AuthPage } from '@/components/application/auth';
import { CommunityPage, CreatorPage } from '@/components/application/community';
import { DiscoveryPage } from '@/components/application/discovery';
import { EventsPage } from '@/components/application/events';
import { WorkroomPage } from '@/components/application/workroom';
import { StoryPage } from '@/components/application/stories';
import { isUuid } from '@/lib/routing/identifiers.js';

const profileTitles: Record<string, string> = {
  settings: 'Profile settings', balance: 'Gem balance', gems: 'Gem balance', rewards: 'Rewards',
  'alpha-perks': 'Alpha rewards', exchange: 'Gem rewards', service: 'Help and support',
  'top-up': 'Gem wallet', subscription: 'ReadAgora Premium', inbox: 'Inbox', blocked: 'Blocked users',
  'author-center': 'Author Center', 'author-analytics': 'Creator analytics', analytics: 'Creator analytics',
  'creator-center': 'Creator Center', promotions: 'Promotions', moderation: 'Moderation queue',
  'payout-request': 'Request a payout', 'payout-history': 'Payout history',
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

export default async function LegacyRoutePage({ params, searchParams }: { params: Promise<{ legacyPath: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { legacyPath } = await params;
  if (!isSupportedLegacyRoute(legacyPath)) notFound();
  const [section, id, action, subAction, chapterId] = legacyPath;
  if (section === 'profile' && legacyPath.length === 2) {
    const creatorRoutes: Record<string, string> = { 'author-analytics':'analytics', analytics:'analytics', promotions:'promotions', 'author-center':'author-center', 'creator-center':'creator-center', 'payout-request':'payout-request', 'payout-history':'payout-history' };
    if (creatorRoutes[id.toLowerCase()]) redirect('/workroom/' + creatorRoutes[id.toLowerCase()]);
  }
  if (section === 'profile' && ['deleteaccount', 'delete-account', 'communityconsent', 'community-terms'].includes((id || '').toLowerCase())) {
    redirect((id || '').toLowerCase().startsWith('community') ? '/terms' : '/account-deletion');
  }
  if ((legacyPath.length === 1 && ['discover', 'feed', 'write'].includes(section))
    || (section === 'discovery' && legacyPath.length <= 2)) {
    return <ApplicationFrame>{section === 'write' ? <WorkroomPage /> : <DiscoveryPage section={section === 'discovery' ? id : undefined} />}</ApplicationFrame>;
  }
  if (section === 'login' || section === 'signup' || section === 'forgot-password' || section === 'reset-password'
    || (section === 'auth' && ['intent', 'reset-password'].includes(id))) {
    const mode = section === 'signup' ? 'signup' : section === 'forgot-password' ? 'forgot-password' : section === 'reset-password' || id === 'reset-password' ? 'reset-password' : 'login';
    return <ApplicationFrame><AuthPage mode={mode} /></ApplicationFrame>;
  }
  if (section === 'creator' || section === 'user') {
    return <ApplicationFrame><CreatorPage username={id} /></ApplicationFrame>;
  }
  if (section === 'community') {
    const postId = id === 'post' ? action : legacyPath.length === 2 ? id : undefined;
    return <ApplicationFrame><CommunityPage postId={postId} /></ApplicationFrame>;
  }
  if (section === 'events' && legacyPath.length <= 2) {
    return <ApplicationFrame><EventsPage slug={id} /></ApplicationFrame>;
  }
  if ((section === 'workroom' && id === 'story' && isUuid(action))
    || (section === 'story' && isUuid(id) && ['manage', 'edit-chapter', 'edit-comic-chapter'].includes(action))) {
    const storyId = section === 'workroom' ? action : id;
    const workroomChapterId = section === 'workroom' && subAction === 'chapter' ? chapterId : undefined;
    const importing = section === 'workroom' && subAction === 'import';
    const legacySearch = await searchParams;
    const chapterQuery = legacySearch.chapterId;
    const legacyChapterId = section === 'story' ? Array.isArray(chapterQuery) ? chapterQuery[0] : chapterQuery : undefined;
    if (section === 'story' && action !== 'manage' && !legacyChapterId) return <ApplicationFrame><WorkroomPage storyId={storyId} /></ApplicationFrame>;
    if (section === 'story' && legacyChapterId && !isUuid(legacyChapterId)) notFound();
    if (section === 'story' && legacyChapterId) return <ApplicationFrame><WorkroomPage storyId={storyId} chapterId={legacyChapterId} /></ApplicationFrame>;
    return <ApplicationFrame><WorkroomPage storyId={storyId} chapterId={workroomChapterId} importing={importing} /></ApplicationFrame>;
  }
  if ((section === 'workroom' && legacyPath.length === 1) || (section === 'create' && id === 'story')) {
    return <ApplicationFrame><WorkroomPage create={section === 'create'} /></ApplicationFrame>;
  }
  if (section === 'profile' && legacyPath.length === 2 && profileSections.has(id.toLowerCase())) {
    return <ApplicationFrame><AccountToolsPage path={id} /></ApplicationFrame>;
  }
  if (section === 'legal' && legacyPath.length === 2 && ['privacy', 'terms'].includes(id)) {
    return <ApplicationFrame><AccountToolsPage path={id} /></ApplicationFrame>;
  }
  if (legacyPath.length === 1 && ['terms', 'privacy', 'account-deletion', 'delete-account'].includes(section)) {
    return <ApplicationFrame><AccountToolsPage path={section} /></ApplicationFrame>;
  }
  if (section === 'reader' && legacyPath.length === 2 && isUuid(id)) {
    return <ApplicationFrame><StoryPage id={id} /></ApplicationFrame>;
  }
  notFound();
}


const discoverySections = new Set(['all', 'for_you', 'trending', 'rising', 'recently_updated', 'because_you_read', 'hidden_gems', 'genre', 'ai_generated']);
const profileSections = new Set(['settings', 'balance', 'gems', 'rewards', 'alpha-perks', 'exchange', 'service', 'top-up', 'subscription', 'inbox', 'blocked', 'author-center', 'author-analytics', 'analytics', 'creator-center', 'payout-request', 'payout-history', 'promotions', 'moderation', 'agora-coins', 'report', 'deleteaccount', 'delete-account', 'communityconsent', 'community-terms']);

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
  if (parts[0] === 'events' && parts.length <= 2) return true;
  if (parts[0] === 'library' && parts.length === 1) return true;
  if (parts[0] === 'workroom' && parts.length === 1) return true;
  if (parts[0] === 'profile' && parts.length === 1) return true;
  return false;
}
