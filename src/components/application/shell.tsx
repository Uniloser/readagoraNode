"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useApplication} from './provider';
import {ThemeToggle} from '@/components/theme-toggle';
import {SiteFooter} from '@/components/site-footer';
import {useEffect,useState,type ReactNode} from 'react';
const nav=[['/','Discover'],['/library','Library'],['/workroom','Workroom'],['/community','Community'],['/events','Events']];
export function ApplicationShell({children}:{children:ReactNode}){const {session}=useApplication(),path=usePathname();const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);const reading=path.startsWith('/read/'),authPage=['/login','/signup','/forgot-password','/reset-password'].includes(path);const workroom=path==='/workroom'||path.startsWith('/workroom/');const chrome=!reading&&!authPage&&!workroom;return <><a href="#main-content" className="skip-link">Skip to content</a>{chrome&&<header className="topbar"><Link href="/" className="brand"><img className="brand-image" src="/assets/mark.png" alt=""/><span>readagora</span></Link><nav className="main-nav" aria-label="Main navigation">{nav.map(([href,label])=><Link key={href} href={href} className={(href==='/'?path==='/':path.startsWith(href))?'active':''} aria-current={(href==='/'?path==='/':path.startsWith(href))?'page':undefined}><NavigationIcon href={href}/><span>{label}</span></Link>)}</nav><div className="header-actions"><ThemeToggle/><Link href="/search" className="icon-button search-toggle" aria-label="Search stories" title="Search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg></Link>{mounted&&session?<Link href="/profile" className="account-chip" aria-label="Your profile" title="Your profile"><AccountAvatar/></Link>:<><Link href="/login" className="sign-in">Sign in</Link><Link href="/signup" className="join-button">Get started</Link></>}</div></header>}<main id="main-content" className={reading?'react-reader-main':authPage?'workspace react-workspace react-auth-workspace':workroom?'workspace react-workspace react-workroom-workspace':'workspace react-workspace'}>{children}</main>{chrome&&<SiteFooter/>}{chrome&&<nav className="mobile-tabs" aria-label="Mobile navigation">{nav.map(([href,label])=><Link key={href} href={href} aria-current={(href==='/'?path==='/':path.startsWith(href))?'page':undefined}><NavigationIcon href={href}/><span>{label}</span></Link>)}</nav>}</>;}

function AccountAvatar(){
 const {api,session}=useApplication(),userId=session?.user?.id;
 const [profile,setProfile]=useState<{id:string;url:string}|null>(null),[failedUrl,setFailedUrl]=useState('');
 useEffect(()=>{
  if(!userId)return;
  let active=true;
  const refresh=()=>{void api('/users/me').then(user=>{if(active)setProfile({id:userId,url:user.avatar_url||''});}).catch(()=>{});};
  refresh();window.addEventListener('readagora-profile-updated',refresh);
  return()=>{active=false;window.removeEventListener('readagora-profile-updated',refresh);};
 },[api,userId]);
 const url=profile?.id===userId?profile?.url:session?.user?.user_metadata?.avatar_url||session?.user?.user_metadata?.picture||'';
 return url&&url!==failedUrl?<img className="account-avatar" src={url} alt="" width="32" height="32" onError={()=>setFailedUrl(url)}/>:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>;
}

function NavigationIcon({href}:{href:string}){return <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{href==='/'?<><circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/></>:href==='/library'?<><path d="M4 4h4v16H4ZM10 4h4v16h-4ZM16 5l4-1 3 15-4 1Z"/></>:href==='/workroom'?<><path d="m15 4 5 5M4 20l5-1L21 7a2.8 2.8 0 0 0-4-4L5 15Z"/></>:href==='/community'?<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/></>:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/></>}</svg>;}
