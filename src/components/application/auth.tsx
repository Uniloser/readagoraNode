"use client";
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {useApplication} from './provider';
import {Form,Field,PageTitle,enc,Action} from './ui';
const safe=(path:string|null)=>path?.startsWith('/')&&!path.startsWith('//')&&!path.includes('\\')?path:'/';
export function AuthPage({mode}:{mode:string}) {
 const {api,saveSession}=useApplication(),router=useRouter(),params=useSearchParams();
 const [sent,setSent]=useState('');
 const next=safe(params.get('next')||params.get('returnTo'));
 const signup=mode==='signup',forgot=mode==='forgot-password',reset=mode==='reset-password',login=mode==='login';
 const title=signup?'Create your account':forgot?'Reset your password':reset?'Choose a new password':'Welcome back';
 const blurb=signup?'Join a community of readers and creators. Your next favorite story is waiting.':forgot?'Enter the email address on your account. We will send you a secure reset link.':reset?'Choose a new password to get back to your ReadAgora account.':'Sign in to pick up where your reading journey left off.';
 const switchLabel=signup||forgot||reset?'Already have an account?':'New to ReadAgora?';
 const switchAction=signup||forgot||reset?'Sign in':'Create account';
 const switchHref=signup||forgot||reset?'/login?next='+enc(next):'/signup?next='+enc(next);
 return <main className="react-auth-shell">
  <Link className="react-auth-brand" href="/"><img src="/assets/mark.png" alt=""/><span>readagora</span></Link>
  <div className="react-auth-switch">{switchLabel} <Link href={switchHref}>{switchAction}</Link></div>
  <div className="react-auth-layout">
   <aside className="react-auth-showcase"><span className="eyebrow">READAGORA / YOUR NEXT CHAPTER</span>
    <div className="react-auth-art">{login?<div className="react-auth-mascot"><img src="/assets/mascot.png" alt="ReadAgora mascot reading a book"/></div>:<div className="react-auth-art-cover"><span>READAGORA ORIGINAL</span><b>Every story<br/>opens a door.</b><i>READ &#183; IMAGINE &#183; BELONG</i></div>}<i/><i/></div>
    <div className="react-auth-showcase-copy"><h2>{signup?'Stories are better together.':'Your stories are right where you left them.'}</h2><p>Discover new worlds, follow the creators you love, and keep your reading life in one place.</p></div>
    <div className="react-auth-showcase-foot"><span>01 / DISCOVER</span><span>02 / READ</span><span>03 / SHARE</span></div>
   </aside>
   <section className="react-auth-panel"><div className="react-auth-panel-inner">
    <span className="eyebrow">{signup?'START READING WITH US':forgot||reset?'ACCOUNT RECOVERY':'GOOD TO SEE YOU AGAIN'}</span><h1>{title}</h1><p className="react-auth-intro">{blurb}</p>
    {sent&&<p role="status" className="react-auth-notice">{sent}</p>}
    <Form submit={signup?'Create account':forgot?'Send reset link':reset?'Save new password':'Sign in'} onSave={async v=>{
     if(forgot){const response=await fetch((process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL||'')+'/auth/v1/recover',{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY||'','Content-Type':'application/json'},body:JSON.stringify({email:v.email,redirect_to:location.origin+'/auth/callback?flow=recovery'})});if(!response.ok)throw Error('Could not send the recovery email.');setSent('If the address is registered, a recovery email is on its way.');return;}
     if(reset){await api('/auth/password',{method:'PATCH',body:{password:v.password}});router.push('/profile/settings');return;}
     const result=await api(signup?'/auth/signup':'/auth/signin',{method:'POST',body:{email:v.email,password:v.password,...(signup?{username:v.username}:{})},skipAuth:true});const session=result.session||(result.access_token?result:null);if(session?.access_token){saveSession({...session,user:result.user||session.user});router.replace(next);}else setSent('Check your email to confirm your account, then sign in.');
    }}>
     {signup&&<Field name="username" label="Username" required/>}
     {!reset&&<Field name="email" label="Email address" type="email" required/>}
     {!forgot&&<label>{reset?'New password':'Password'}<input name="password" type="password" minLength={8} required autoComplete={login?'current-password':'new-password'}/></label>}
     {login&&<Link className="react-auth-forgot" href="/forgot-password">Forgot password?</Link>}
    </Form>
    {signup&&<p className="react-auth-legal">You will accept the Community Terms before posting or publishing. <Link href="/terms">Read the terms</Link>.</p>}
    {(login||signup)&&<><div className="react-auth-or"><span>OR</span></div><Action className="react-auth-choice" run={async()=>{sessionStorage.setItem('readagora-auth-return',next);const base=process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL;if(!base)throw Error('Authentication is not configured.');location.assign(base+'/auth/v1/authorize?provider=google&redirect_to='+enc(location.origin+'/auth/callback'));}}>Continue with Google</Action><Action className="react-auth-resend" run={async()=>{const email=window.prompt('Email address to confirm');if(!email)return;const response=await fetch((process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL||'')+'/auth/v1/resend',{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY||'','Content-Type':'application/json'},body:JSON.stringify({type:'signup',email})});if(!response.ok)throw Error('Confirmation email could not be resent.');setSent('Confirmation email sent.');}}>Resend confirmation email</Action></>}
   </div></section>
  </div>
  <footer className="react-auth-footer"><span>ReadAgora</span><Link href="/terms">Community terms</Link><Link href="/">Back to discovery</Link></footer>
 </main>;
}
export function AuthCallback(){const {api,saveSession}=useApplication(),router=useRouter(),params=useSearchParams(),started=useRef(false);const [error,setError]=useState('');useEffect(()=>{if(started.current)return;started.current=true;void(async()=>{const hash=new URLSearchParams(location.hash.slice(1));if(hash.get('error_description'))throw Error(hash.get('error_description')!);let session:any;if(hash.get('access_token'))session=Object.fromEntries(hash.entries());else if(params.get('code')){const verifier=localStorage.getItem('readagora-pkce-verifier');if(!verifier)throw Error('The sign-in verifier is missing. Start sign-in again.');const r=await fetch((process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL||'')+'/auth/v1/token?grant_type=pkce',{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY||'','Content-Type':'application/json'},body:JSON.stringify({auth_code:params.get('code'),code_verifier:verifier})});session=await r.json();if(!r.ok)throw Error(session.error_description||'Sign-in failed.');}if(!session?.access_token)throw Error('No sign-in token was returned.');const userResponse=await fetch((process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL||'')+'/auth/v1/user',{headers:{apikey:process.env.NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY||'',Authorization:'Bearer '+session.access_token}});if(!userResponse.ok)throw Error('Could not verify your session.');session.user=await userResponse.json();saveSession(session);const returning=safe(sessionStorage.getItem('readagora-auth-return'));sessionStorage.removeItem('readagora-auth-return');router.replace(params.get('flow')==='recovery'||hash.get('type')==='recovery'?'/reset-password':returning);})().catch(e=>setError(e.message));},[api,params,router,saveSession]);return <div className="react-auth"><h1>Completing sign-in</h1>{error?<p role="alert">{error} <Link href="/login">Return to sign in</Link></p>:<p role="status">Verifying your session?</p>}</div>;}
