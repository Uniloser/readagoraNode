import { NextResponse } from 'next/server';

export async function GET() {
  const base=(process.env.READAGORA_API_URL||'').replace(/\/$/,'');
  if(!base)return NextResponse.json({error:'Site announcements are not configured.'},{status:503});
  try{
    const response=await fetch(`${base}/ads/site/all`,{headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(15000)});
    const payload=await response.json().catch(()=>null);
    if(!response.ok)return NextResponse.json({error:'Could not load site announcements.'},{status:response.status});
    const data=payload&&typeof payload==='object'&&'data'in payload?(payload as {data:unknown}).data:payload;
    return NextResponse.json(Array.isArray(data)?data:data?[data]:[],{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'Could not load site announcements.'},{status:502});}
}
