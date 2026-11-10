"use client";
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {useApplication} from './provider';
import {Form,enc,Action} from './ui';
const safe=(path:string|null)=>path?.startsWith('/')&&!path.startsWith('//')&&!path.includes('\\')?path:'/';
export function AuthPage({mode}:{mode:string}) {
 const {api,saveSession}=useApplication(),router=useRouter(),params=useSearchParams();
 const [sent,setSent]=useState(''),[passwordFocused,setPasswordFocused]=useState(false);
 const next=safe(params.get('next')||params.get('returnTo'));
 const signup=mode==='signup',forgot=mode==='forgot-password',reset=mode==='reset-password',login=mode==='login';
 const title=signup?'Create your account.':forgot?'Reset your password.':reset?'Choose a new password':'Welcome back, reader.';
 const blurb=signup?'Join readers and creators building worlds worth returning to.':forgot?'Enter your account email and we will send you a secure reset link.':reset?'Use at least 8 characters. You will sign in with it after saving.':'Return to your next chapter.';
 const switchHref=signup||forgot||reset?'/login?next='+enc(next):'/signup?next='+enc(next);
 return <main className={'react-auth-shell'+(forgot||reset?' auth-recovery':'')}>
  <section className="app-auth-content" aria-labelledby="auth-title">
   <header className="app-auth-identity">
    {(login||signup)&&<div className="app-auth-mascot"><img src={passwordFocused?'/assets/auth-password.png':'/assets/auth-reading.png'} alt="ReadAgora reading mascot" width="138" height="138"/></div>}
    <Link className="app-auth-brand" href="/">readagora</Link>
    {(login||signup)&&<p>Stories stay with you.</p>}
   </header>
   <h1 id="auth-title">{title}</h1><p className="app-auth-intro">{blurb}</p>
    {sent&&<p role="status" className="app-auth-notice">{sent}</p>}
    <Form submit={signup?'Create account':forgot?'Send reset link':reset?'Save new password':'Sign in'} onSave={async v=>{
     if(forgot){const response=await fetch((process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL||'')+'/auth/v1/recover',{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY||'','Content-Type':'application/json'},body:JSON.stringify({email:v.email,redirect_to:location.origin+'/auth/callback?flow=recovery'})});if(!response.ok)throw Error('Could not send the recovery email.');setSent('If the address is registered, a recovery email is on its way.');return;}
     if((signup||reset)&&v.password!==v.confirmPassword)throw Error('Passwords do not match.');
     if(reset){await api('/auth/password',{method:'PATCH',body:{password:v.password}});router.push('/profile/settings');return;}
     const result=await api(signup?'/auth/signup':'/auth/signin',{method:'POST',body:{email:v.email,password:v.password,...(signup?{username:v.username}:{})},skipAuth:true});const session=result.session||(result.access_token?result:null);if(session?.access_token){saveSession({...session,user:result.user||session.user});router.replace(next);}else setSent('Check your email to confirm your account, then sign in.');
    }}>
     {signup&&<label>Username<input name="username" placeholder="your_username" autoComplete="username" minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" required/><small>3–30 characters: letters, numbers, underscores</small></label>}
     {!reset&&<label>Email<input name="email" placeholder="you@example.com" type="email" autoComplete="email" required/></label>}
     {!forgot&&<AuthPassword name="password" label={reset?'New password':'Password'} placeholder={signup?'Create a password':reset?'At least 8 characters':'Your password'} autoComplete={login?'current-password':'new-password'} onFocusChange={setPasswordFocused}/>}
     {(signup||reset)&&<AuthPassword name="confirmPassword" label="Confirm password" placeholder="Repeat your password" autoComplete="new-password" onFocusChange={setPasswordFocused}/>}
     {login&&<Link className="app-auth-forgot" href={'/forgot-password?next='+enc(next)}>Forgot password?</Link>}
    </Form>
    {(login||signup)&&<><div className="app-auth-or"><span>OR</span></div><Action className="app-auth-choice" run={async()=>{sessionStorage.setItem('readagora-auth-return',next);const base=process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL;if(!base)throw Error('Authentication is not configured.');location.assign(base+'/auth/v1/authorize?provider=google&redirect_to='+enc(location.origin+'/auth/callback'));}}>Continue with Google</Action><Action className="app-auth-resend" run={async()=>{const email=window.prompt('Email address to confirm');if(!email)return;const response=await fetch((process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL||'')+'/auth/v1/resend',{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY||'','Content-Type':'application/json'},body:JSON.stringify({type:'signup',email})});if(!response.ok)throw Error('Confirmation email could not be resent.');setSent('Confirmation email sent.');}}>Resend confirmation email</Action></>}
    <nav className="app-auth-policies" aria-label="Policies"><Link href="/privacy">Privacy policy</Link><Link href="/terms">Community terms</Link></nav>
    <p className="app-auth-switch">{login?'New here?':signup?'Already have an account?':''} <Link href={switchHref}>{login?'Create an account →':forgot||reset?'← Back to sign in':'Sign in →'}</Link></p>
    {(login||signup)&&<div className="app-auth-bottom" aria-hidden="true"><span>More<br/>stories<br/>ahead.<br/>—</span><img src={signup?'/assets/auth-sleeping.png':'/assets/auth-password.png'} alt="" width="190" height="190"/></div>}
    <footer className="app-auth-footer"><span>By continuing, you agree to our</span><div><Link href="/terms">Terms</Link><span> · </span><Link href="/privacy">Privacy</Link></div></footer>
   </section>
 </main>;
}
function AuthPassword({name,label,placeholder,autoComplete,onFocusChange}:{name:string;label:string;placeholder:string;autoComplete:string;onFocusChange:(focused:boolean)=>void}){
 const [visible,setVisible]=useState(false);
 return <label>{label}<span className="app-auth-password"><input name={name} type={visible?'text':'password'} placeholder={placeholder} minLength={8} required autoComplete={autoComplete} onFocus={()=>onFocusChange(true)} onBlur={()=>onFocusChange(false)}/><button type="button" aria-label={(visible?'Hide ':'Show ')+label.toLowerCase()} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?'Hide':'Show'}</button></span></label>;
}
export function AuthCallback(){const {api,saveSession}=useApplication(),router=useRouter(),params=useSearchParams(),started=useRef(false);const [error,setError]=useState('');useEffect(()=>{if(started.current)return;started.current=true;void(async()=>{const hash=new URLSearchParams(location.hash.slice(1));if(hash.get('error_description'))throw Error(hash.get('error_description')!);let session:any;if(hash.get('access_token'))session=Object.fromEntries(hash.entries());else if(params.get('code')){const verifier=localStorage.getItem('readagora-pkce-verifier');if(!verifier)throw Error('The sign-in verifier is missing. Start sign-in again.');const r=await fetch((process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL||'')+'/auth/v1/token?grant_type=pkce',{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY||'','Content-Type':'application/json'},body:JSON.stringify({auth_code:params.get('code'),code_verifier:verifier})});session=await r.json();if(!r.ok)throw Error(session.error_description||'Sign-in failed.');}if(!session?.access_token)throw Error('No sign-in token was returned.');const userResponse=await fetch((process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL||'')+'/auth/v1/user',{headers:{apikey:process.env.NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY||'',Authorization:'Bearer '+session.access_token}});if(!userResponse.ok)throw Error('Could not verify your session.');session.user=await userResponse.json();saveSession(session);const returning=safe(sessionStorage.getItem('readagora-auth-return'));sessionStorage.removeItem('readagora-auth-return');router.replace(params.get('flow')==='recovery'||hash.get('type')==='recovery'?'/reset-password':returning);})().catch(e=>setError(e.message));},[api,params,router,saveSession]);return <div className="react-auth"><h1>Completing sign-in</h1>{error?<p role="alert">{error} <Link href="/login">Return to sign in</Link></p>:<p role="status">Verifying your session?</p>}</div>;}
