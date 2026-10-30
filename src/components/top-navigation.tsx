'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Discover' },
  { href: '/library', label: 'Library' },
  { href: '/workroom', label: 'Workroom' },
  { href: '/community', label: 'Community' },
  { href: '/events', label: 'Events' },
  { href: '/profile', label: 'Profile' },
];

export function TopNavigation() {
  const pathname = usePathname();
  if (pathname.startsWith('/read/')) return null;

  return <nav className="main-nav" aria-label="Main navigation">
    {links.map(({ href, label }) => {
      const selected = href === '/'
        ? pathname === '/' || pathname === '/discover' || pathname === '/feed' || pathname === '/discovery' || pathname.startsWith('/discovery/')
        : pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} aria-current={selected ? 'page' : undefined} className={selected ? 'selected' : undefined}>{label}</Link>;
    })}
  </nav>;
}
