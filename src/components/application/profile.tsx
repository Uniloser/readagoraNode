"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApplication, useResource } from './provider';
import { Action, Empty, LoadState, PageTitle } from './ui';

export function ProfilePage() {
  const { api, session, saveSession } = useApplication();
  const router = useRouter();
  const resource = useResource(async () => {
    const [user, followers, stories, wallet, achievements, unread] = await Promise.all([
      api('/users/me'),
      api('/users/me/follower-count').catch(() => ({ count: 0 })),
      api('/users/me/stories').catch(() => []),
      api('/wallet').catch(() => null),
      api('/wallet/achievements').catch(() => []),
      api('/notifications/unread-count').catch(() => ({ count: 0 })),
    ]);
    return {
      user,
      followers: Number(followers?.count || 0),
      stories: Array.isArray(stories) ? stories : [],
      wallet,
      achievements: Array.isArray(achievements) ? achievements : [],
      unread: Number(unread?.count || 0),
    };
  }, [session?.user?.id]);

  return <>
    <PageTitle title="Your profile" description="Your ReadAgora account and creator dashboard." />
    <LoadState resource={resource}>
      {resource.data ? (() => {
        const { user, followers, stories, wallet, achievements, unread } = resource.data;
        const reads = stories.reduce((total: number, story: any) => total + Number(story.view_count || 0), 0);
        const shortcuts = [
          { glyph: 'G', href: '/profile/balance', title: 'Gems & achievements', detail: 'Your balance and milestones', value: Number(wallet?.balance || 0).toLocaleString() },
          { glyph: 'I', href: '/profile/inbox', title: 'Inbox', detail: 'Replies and activity', value: unread ? `${unread} new` : '' },
          { glyph: 'R', href: '/library', title: 'Viewed stories', detail: 'Continue reading where you left off' },
          { glyph: 'W', href: '/workroom', title: 'Author Center', detail: 'Stories, analytics, and creator earnings' },
          { glyph: 'C', href: '/community', title: 'Community', detail: 'Posts and discussions' },
          { glyph: 'B', href: '/profile/blocked', title: 'Blocked users', detail: 'Manage blocked accounts' },
          { glyph: 'S', href: '/profile/settings', title: 'Settings', detail: 'Profile, preferences, and account security' },
        ];
        return <div className="profile-dashboard">
          <section className="profile-dashboard-head">
            <div className="profile-avatar profile-avatar-large">{user.avatar_url ? <img src={user.avatar_url} alt="Profile picture" /> : (user.display_name || user.username || '?').slice(0, 1).toUpperCase()}</div>
            <div className="profile-dashboard-identity">
              <span className="eyebrow">YOUR READAGORA PROFILE</span>
              <h2>{user.display_name || user.username}{user.is_alpha && <span className="alpha-chip">ALPHA</span>}</h2>
              <p>@{user.username}</p>
              <p className="profile-bio">{user.bio || 'Add a short bio so readers can get to know you.'}</p>
            </div>
            <div className="profile-head-actions">
              <Link className="outline-button" href={'/creator/' + encodeURIComponent(user.username)}>View profile</Link>
              <Link className="primary-button" href="/profile/settings">Edit profile</Link>
            </div>
          </section>

          <div className="profile-metrics">
            <Link href={'/creator/' + encodeURIComponent(user.username)}><b>{followers.toLocaleString()}</b><span>Followers</span></Link>
            <Link href="/workroom"><b>{stories.length.toLocaleString()}</b><span>Stories</span></Link>
            <Link href="/workroom"><b>{reads.toLocaleString()}</b><span>Total reads</span></Link>
          </div>

          <section className="profile-balance-card">
            <div><span className="eyebrow">YOUR BALANCE</span><h2>{Number(wallet?.balance || 0).toLocaleString()} <small>Gems</small></h2><p>{achievements.filter((item: any) => item.unlocked_at).length} achievements unlocked</p></div>
            <Link href="/profile/balance">View details <span aria-hidden="true">→</span></Link>
          </section>

          <section className="profile-promo-card">
            <div><span className="eyebrow">FOR READERS &amp; CREATORS</span><h2>Make your next chapter count</h2><p>Keep reading, share your work, and grow with ReadAgora.</p></div>
            <Link className="primary-button" href="/workroom">Explore creator tools <span aria-hidden="true">→</span></Link>
          </section>

          <section className="profile-utilities">
            <div className="profile-section-heading"><div><span className="eyebrow">ACCOUNT &amp; MORE</span><h2>Your ReadAgora</h2></div><Link href="/profile/settings">Settings</Link></div>
            <div className="profile-utility-list">
              {shortcuts.map(item => <Link className="profile-utility-row" href={item.href} key={item.href}>
                <span className="utility-icon" aria-hidden="true">{item.glyph}</span><span className="utility-copy"><b>{item.title}</b><small>{item.detail}</small></span>{item.value && <span className="utility-value">{item.value}</span>}<span className="utility-chevron" aria-hidden="true">›</span>
              </Link>)}
              <Action className="profile-utility-row signout-row" run={async () => { await api('/auth/signout', { method: 'POST' }).catch(() => null); saveSession(null); router.replace('/'); }}>
                <span className="utility-icon" aria-hidden="true">↪</span><span className="utility-copy"><b>Sign out</b><small>Sign out from this device</small></span><span className="utility-chevron" aria-hidden="true">›</span>
              </Action>
            </div>
          </section>
        </div>;
      })() : <Empty>Your profile could not be loaded.</Empty>}
    </LoadState>
  </>;
}
