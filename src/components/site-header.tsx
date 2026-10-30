import Link from 'next/link';
import Image from 'next/image';
import { getSession } from '@/lib/auth/session';
import { ThemeToggle } from '@/components/theme-toggle';
import { TopNavigation } from '@/components/top-navigation';

export async function SiteHeader() {
  const session = await getSession();
  const name = session?.user?.user_metadata?.display_name || session?.user?.user_metadata?.username || session?.user?.email;
  return <header className="topbar"><Link href="/" className="brand"><Image className="brand-image" src="/assets/mark.png" alt="" width={34} height={34} priority /><span>readagora</span></Link><TopNavigation /><div className="header-actions"><Link className="icon-button search-toggle" href="/search" aria-label="Search stories" title="Search stories"><svg className="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg></Link><ThemeToggle /><Link className="account-chip" href={session ? '/profile' : '/login'} aria-label={name ? 'Profile' : 'Sign in'} title={name || 'Sign in'}><svg className="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><span>{session ? 'Account' : 'Sign in'}</span></Link></div></header>;
}
