// Requests and preloads never count as impressions. Only visible creatives do.
let disposeCurrent=()=>{};
export function mountPlacementAds({app,path,api}) {
 disposeCurrent();let alive=true;const cleanup=[];disposeCurrent=()=>{alive=false;cleanup.forEach(fn=>fn());};
 const main=app.querySelector('main');if(!main||path.startsWith('/read/'))return;
 const slots=[];
 function slot(key,parent,before=null){if(!parent)return;const el=document.createElement('div');el.hidden=true;el.dataset.adPlacement=key;parent.insertBefore(el,before);slots.push([key,el]);}
 if(path==='/'){
  const content=app.querySelector('.wide-page-main')||main;slot('home_banner',content,content.firstChild);
  slot('home_sections',content,content.querySelectorAll(':scope > section')[1]||null);
  const layout=app.querySelector('.discovery-layout');if(layout){const aside=document.createElement('aside');aside.hidden=true;aside.className='placement-ad-sidebar';layout.append(aside);slot('sidebar',aside);}
 }else if(path.startsWith('/discovery')||path==='/search')slot('discovery_feed',main,main.querySelector('.library-grid'));
 else if(path.startsWith('/story/'))slot('story_detail',main);
 else if(path==='/profile/agora-coins')slot('coins_shop',main);
 for(const [key,el] of slots){
  let pending=false,viewTimer,expiryTimer,observer,token,card,impressed=false;
  const clearView=()=>clearTimeout(viewTimer);
  function hide(){clearView();observer?.disconnect();clearTimeout(expiryTimer);el.replaceChildren();el.hidden=true;if(key==='sidebar')el.parentElement.hidden=true;token=null;}
  async function event(type,ad){try{await api(`/api/ads/${ad.id}/${type}`,{method:'POST',body:{delivery_token:ad.delivery_token}});}catch{/* Ad analytics cannot block navigation. */}}
  async function load(){
   if(!alive||!el.isConnected||pending)return;pending=true;
   try{
    const ad=await api(`/api/ads?placement=${key}&platform=website`);if(!alive||!el.isConnected)return;
    if(!ad?.id||Date.parse(ad.expires_at)<=Date.now()){hide();return;}if(token===ad.delivery_token)return;
    hide();token=ad.delivery_token;impressed=false;
    card=document.createElement('article');card.className=`placement-ad placement-ad--${key}`;
    const label=document.createElement('small');label.textContent='Sponsored';const link=document.createElement('a');
    const url=new URL(ad.destination_url);if(!['https:','http:'].includes(url.protocol)){hide();return;}
    link.href=url.href;link.target='_blank';link.rel='noopener noreferrer sponsored';
    const headline=document.createElement('h3');headline.textContent=ad.headline;const description=document.createElement('p');description.textContent=ad.description;
    link.append(headline,description);card.append(label,link);
    async function impression(){if(impressed||!alive||!card?.isConnected||document.visibilityState!=='visible')return;impressed=true;await event('impression',ad);}
    link.onclick=()=>{void(async()=>{await impression();await event('click',ad);})();};
    function reveal(){if(!alive||token!==ad.delivery_token||Date.parse(ad.expires_at)<=Date.now())return;
     el.replaceChildren(card);el.hidden=false;if(key==='sidebar')el.parentElement.hidden=false;
     observer=new IntersectionObserver(entries=>{clearView();if(entries[0]?.intersectionRatio>=0.5&&document.visibilityState==='visible')viewTimer=setTimeout(()=>void impression(),1000);},{threshold:[0,0.5]});observer.observe(card);
     expiryTimer=setTimeout(hide,Math.max(0,Date.parse(ad.expires_at)-Date.now()));
    }
    if(ad.creative_type==='image'){const image=document.createElement('img');image.alt=ad.headline;image.onload=reveal;image.onerror=()=>{if(token===ad.delivery_token)hide();};image.src=ad.image_url;link.prepend(image);}else reveal();
   }catch{hide();}finally{pending=false;}
  }
  const visibility=()=>{clearView();if(document.visibilityState==='visible'){observer?.disconnect();if(card?.isConnected)observer?.observe(card);void load();}};
  document.addEventListener('visibilitychange',visibility);void load();
  const interval=setInterval(()=>{if(document.visibilityState==='visible')void load();},60000);
  cleanup.push(()=>{hide();clearInterval(interval);document.removeEventListener('visibilitychange',visibility);});
 }
}
