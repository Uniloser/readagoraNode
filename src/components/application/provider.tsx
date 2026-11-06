"use client";
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {useRouter,usePathname} from 'next/navigation';
import {createBrowserApi,readStoredSession} from '@/lib/api/browser-client.js';
export type Data=Record<string,any>;
type Api=(path:string,options?:{method?:string;body?:any;skipAuth?:boolean;headers?:Record<string,string>})=>Promise<any>;
const Context=createContext<{api:Api;session:Data|null;ready:boolean;saveSession:(s:Data|null)=>void;requireLogin:()=>boolean;ensureTerms:()=>Promise<void>}|null>(null);
export function ApplicationProvider({children}:{children:ReactNode}){
 const router=useRouter(),pathname=usePathname();
 const store=useRef<{session:Data|null;user:Data|null}>({session:null,user:null});
 const [session,setSession]=useState<Data|null>(null),[ready,setReady]=useState(false);
 const client=useRef<ReturnType<typeof createBrowserApi>|null>(null);
 if(!client.current)client.current=createBrowserApi({apiUrl:'/api/backend',supabaseUrl:process.env.NEXT_PUBLIC_READAGORA_SUPABASE_URL||'',supabaseKey:process.env.NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY||'',state:store.current});
 const saveSession=useCallback((value:Data|null)=>{client.current!.saveSession(value);setSession(value);},[]);
 useEffect(()=>{store.current.session=readStoredSession();setSession(store.current.session);setReady(true);const sync=(e:StorageEvent)=>{if(e.key==='readagora-session'){store.current.session=readStoredSession();setSession(store.current.session);}};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 const api:Api=useCallback(async(path,options)=>{try{return await client.current!.api(path,options);}finally{setSession(previous=>previous===store.current.session?previous:store.current.session);}},[]);
 const requireLogin=()=>{if(store.current.session)return true;router.push('/login?next='+encodeURIComponent(pathname+window.location.search));return false;};
 const ensureTerms=async()=>{if(!requireLogin())throw Error('Sign in to continue.');if(store.current.session?.user?.app_metadata?.community_terms_version==='2026-09-14'||localStorage.getItem('readagora-community-terms')==='2026-09-14')return;if(!window.confirm('Before contributing, please read /terms. Do you accept the ReadAgora Community Terms?'))throw Error('Accept the community terms before contributing.');await api('/users/me/community-terms',{method:'POST',body:{version:'2026-09-14',accepted:true}});await client.current!.refreshSession();localStorage.setItem('readagora-community-terms','2026-09-14');};
 return <Context.Provider value={{api,session,ready,saveSession,requireLogin,ensureTerms}}>{children}</Context.Provider>;
}
export function useApplication(){const value=useContext(Context);if(!value)throw Error('Missing ApplicationProvider');return value;}
export function useResource<T=any>(load:()=>Promise<T>,dependencies:unknown[]=[]){
 const [data,setData]=useState<T|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const sequence=useRef(0),loader=useRef(load);loader.current=load;
 useEffect(()=>{const id=++sequence.current;setLoading(true);setError('');setData(null);void loader.current().then(value=>{if(id===sequence.current)setData(value);}).catch(e=>{if(id===sequence.current)setError(e.message||'Could not load this page.');}).finally(()=>{if(id===sequence.current)setLoading(false);});return()=>{sequence.current++;};},[...dependencies,revision]);
 return {data,setData,loading,error,reload:()=>setRevision(n=>n+1)};
}
