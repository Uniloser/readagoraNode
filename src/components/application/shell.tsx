"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useApplication} from './provider';
import {ThemeToggle} from '@/components/theme-toggle';
import {SiteFooter} from '@/components/site-footer';
import {useEffect,useState,type ReactNode} from 'react';
const nav=[['/','Discover'],['/library','Library'],['/workroom','Workroom'],['/community','Community'],['/events','Events']];
export function ApplicationShell({children}:{children:ReactNode}){const {session}=useApplication(),path=usePathname();const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);const reading=path.startsWith('/read/'),authPage=['/login','/signup','/forgot-password','/reset-password'].includes(path);const workroom=path==='/workroom'||path.startsWith('/workroom/');const chrome=!reading&&!authPage&&!workroom;return <><a href="#main-content" className="skip-link">Skip to content</a>{chrome&&<header className="topbar"><Link href="/" className="brand"><img className="brand-image" src="/assets/mark.png" alt=""/><span>readagora</span></Link><nav className="main-nav" aria-label="Main navigation">{nav.map(([href,label])=><Link key={href} href={href} className={(href==='/'?path==='/':path.startsWith(href))?'active':''} aria-current={(href==='/'?path==='/':path.startsWith(href))?'page':undefined}>{label}</Link>)}</nav><div className="header-actions"><ThemeToggle/><Link href="/search" className="icon-button search-toggle" aria-label="Search stories" title="Search">⌕</Link>{mounted&&session?<Link href="/profile" className="account-chip" aria-label="Your profile" title="Your profile"><AccountAvatar/></Link>:<><Link href="/login" className="sign-in">Sign in</Link><Link href="/signup" className="join-button">Get started</Link></>}</div></header>}<main id="main-content" className={reading?'react-reader-main':authPage?'workspace react-workspace react-auth-workspace':workroom?'workspace react-workspace react-workroom-workspace':'workspace react-workspace'}>{children}</main>{chrome&&<SiteFooter/>}{chrome&&<nav className="mobile-tabs" aria-label="Mobile navigation">{nav.map(([href,label])=><Link key={href} href={href} aria-current={path===href?'page':undefined}>{label}</Link>)}</nav>}</>;}

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
