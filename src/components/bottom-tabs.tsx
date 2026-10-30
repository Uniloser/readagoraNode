'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const tabs = [
  { href: '/', label: 'Discover', icon: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/></> },
  { href: '/library', label: 'Library', icon: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 6h8M8 9h8"/></> },
  { href: '/workroom', label: 'Workroom', icon: <><path d="m15 5 4 4M4 20l4.2-.8L19 8.4a2.8 2.8 0 0 0-4-4L4.2 15.2 4 20Z"/><path d="M12 20h8"/></> },
  { href: '/community', label: 'Community', icon: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5a3 3 0 0 1 0 6M18 14a5.5 5.5 0 0 1 3.5 5"/></> },
  { href: '/events', label: 'Events', icon: <><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/></> },
  { href: '/profile', label: 'Profile', icon: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></> },
];
export function BottomTabs() { const pathname = usePathname(); if (pathname.startsWith('/read/') || pathname.startsWith('/story/') || pathname === '/search' || pathname === '/login' || pathname === '/signup') return null; return <nav className="mobile-tabs" aria-label="Main navigation">{tabs.map((tab) => { const selected = tab.href === '/' ? pathname === '/' || pathname === '/discover' || pathname === '/feed' || pathname === '/discovery' || pathname.startsWith('/discovery/') : pathname === tab.href || pathname.startsWith(`${tab.href}/`); return <Link key={tab.label} href={tab.href} className={selected ? 'active' : ''} aria-current={selected ? 'page' : undefined} aria-label={tab.label}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{tab.icon}</svg><span>{tab.label}</span></Link>; })}</nav>; }
