const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>value?new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'To be announced';
let competitionTimer;
const labels={upcoming:'Coming soon',entries:'Entries open',voting:'Reader voting',closed:'Voting has ended',announced:'Winner announced'};
export function voteState(event,story,userId) {
 if(userId && story.author_id===userId) return {label:'Not eligible',disabled:true};
 if(event.myVoteValidity==='invalid') return {label:'Vote under review',disabled:true};
 if(event.myVote===story.id) return {label:'Voted',disabled:true};
 if(!event.votingOpen || (event.voting_ends_at && Date.parse(event.voting_ends_at)<=Date.now())) return {label:'Voting closed',disabled:true};
 if(event.myVote && !event.allow_vote_changes) return {label:'Vote is final',disabled:true};
 return {label:userId?'Vote for this story':'Sign in to vote',disabled:false};
}
function remaining(event) {
 const deadline=event.stage==='upcoming'?event.starts_at:event.stage==='entries'?event.entry_ends_at:event.stage==='voting'?event.voting_ends_at:null;
 if(!deadline) return '';
 const minutes=Math.max(0,Math.ceil((Date.parse(deadline)-Date.now())/60000));
 return `${Math.floor(minutes/1440)}d ${Math.floor(minutes%1440/60)}h ${minutes%60}m ${event.stage==='upcoming'?'until opening':'remaining'}`;
}
export function renderCompetition(state) {
 if(state.pageLoading) return '<section class="competition-loading" aria-busy="true"><div></div><div></div><p>Loading the competition?</p></section>';
 const e=state.pageData?.competition;
 if(!e || state.pageError) return `<section class="events-empty" role="alert"><h2>Competition unavailable</h2><p>${esc(state.pageError||'This event could not be found.')}</p><button type="button" data-competition-retry>Try again</button></section>`;
 const tab=state.competitionTab||'Overview',user=state.session?.user?.id || state.user?.id;
 const photo=url=>/^https:\/\//i.test(url||'');
 const author=story=>story.author?.display_name||story.author?.username||'ReadAgora writer';
 const storyCard=(story,index)=>{
  const vote=voteState(e,story,user);
  return `<article class="competition-story ${tab==='Leaderboard'&&index<3?'competition-podium':''}">${e.show_rankings&&story.rank?`<span class="competition-rank">#${story.rank}</span>`:''}<a href="/story/${encodeURIComponent(story.id)}?event=${encodeURIComponent(e.slug)}" data-link>${photo(story.cover_url)?`<img class="competition-cover" src="${esc(story.cover_url)}" alt="${esc(story.title)} cover" loading="lazy"/>`:'<div class="competition-cover competition-cover-empty" aria-hidden="true">A</div>'}</a><div class="competition-story-copy"><span class="eyebrow">${esc(story.genre||'Original')}</span><h3>${esc(story.title)}</h3><a href="/creator/${encodeURIComponent(story.author?.username||'')}" data-link class="competition-author">by ${esc(author(story))}</a><p>${esc(story.description||'Discover this competition entry.')}</p>${story.votes!==null?`<strong class="competition-votes">${Number(story.votes).toLocaleString()} verified ${Number(story.votes)===1?'vote':'votes'}</strong>`:''}<div class="competition-story-actions"><a class="outline-button" href="/story/${encodeURIComponent(story.id)}?event=${encodeURIComponent(e.slug)}" data-link>Read story</a><button class="competition-primary" type="button" data-competition-vote="${esc(story.id)}" ${vote.disabled||state.competitionBusy?'disabled':''}>${vote.label}</button></div></div></article>`;
 };
 const intro=`<section class="competition-overview"><div><h2>A story worth sharing. A voice worth celebrating.</h2><p>${esc(e.description||'Explore original ReadAgora stories and support the writer you want to see win.')}</p><h3>How to take part</h3><ol><li>Writers enter one eligible published story.</li><li>Readers explore the entries and confirm their choice.</li><li>ReadAgora reviews the results before announcing the winner.</li></ol></div><aside><span class="eyebrow">COMPETITION TIMELINE</span><dl>${[['Entries open',e.entry_starts_at],['Entries close',e.entry_ends_at],['Voting opens',e.voting_starts_at],['Voting closes',e.voting_ends_at]].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(date(value))}</dd></div>`).join('')}</dl><small>Times shown in your local time zone.</small></aside></section>`;
 const rules=`<section class="competition-rules"><h2>Competition rules</h2><p>${esc(e.rules||'Enter an original story and follow ReadAgora community rules.')}</p><ul><li>One story per writer. ${e.allow_existing_stories?'Existing published stories are welcome.':'Stories must be created during the entry period.'}</li><li>Confirm your email before entering or voting.</li><li>One verified vote per reader per event. No self-voting.</li><li>${e.allow_vote_changes?'You may change your vote while voting is open.':'Votes are final after confirmation.'}</li><li>Voting closes ${esc(date(e.voting_ends_at))}.</li><li>Results are reviewed before a winner is published. Ties require an administrator?s documented decision.</li></ul><h3>Prize</h3><p>${esc(e.prizes||`${e.prize_amount} ${e.prize_currency}`)}</p></section>`;
 const winner=e.result?`<section class="competition-winner"><span class="eyebrow">THE COMMUNITY HAS SPOKEN</span>${photo(e.result.story?.cover_url)?`<img class="competition-winner-cover" src="${esc(e.result.story.cover_url)}" alt="Winning story cover"/>`:''}<h2>${esc(e.result.story?.title||'Winning story')}</h2>${e.result.story?.author?.username?`<a class="competition-author" href="/creator/${encodeURIComponent(e.result.story.author.username)}" data-link>by ${esc(author(e.result.story))}</a>`:''}<p>${esc(e.result.story?author(e.result.story):'Verified winner')}${e.result.verifiedVotes!==null?` &middot; ${Number(e.result.verifiedVotes).toLocaleString()} verified ${Number(e.result.verifiedVotes)===1?'vote':'votes'}`:''}</p>${e.result.story?`<a class="competition-primary" href="/story/${encodeURIComponent(e.result.story.id)}" data-link>Read winning story</a>`:''}</section>`:'';
 const entries=state.competitionEligible||[];
 const picker=state.competitionPicker?`<section class="competition-entry-picker"><h2>Enter your story</h2><p>Choose one of your eligible published stories. Submissions are reviewed before appearing publicly.</p>${entries.length?entries.map(story=>`<button type="button" class="competition-entry-option" data-competition-enter="${esc(story.id)}">${esc(story.title)} <span>Enter story &#8594;</span></button>`).join(''):'<p>No eligible stories found. Publish a public story and return here to enter.</p>'}<button type="button" class="outline-button" data-competition-create>Create a new story</button>${state.competitionEligibleMore?'<button type="button" class="outline-button" data-competition-more-eligible>More stories</button>':''}</section>`:'';
 const confirm=state.competitionConfirm?`<dialog class="competition-confirm" open aria-modal="true" aria-labelledby="competition-confirm-title"><h2 id="competition-confirm-title">${state.competitionConfirm.mode==='vote'?'Confirm your vote':'Enter this story?'}</h2><p>${esc(state.competitionConfirm.title)}</p><p>${state.competitionConfirm.mode==='vote'?(e.allow_vote_changes?'You can change your vote until voting closes.':'Your vote is final. Please confirm your choice.'):'You can enter one story. It will be reviewed for eligibility.'}</p><div><button type="button" class="outline-button" data-competition-cancel ${state.competitionBusy?'disabled':''}>Cancel</button><button type="button" class="competition-primary" data-competition-confirm ${state.competitionBusy?'disabled':''}>${state.competitionBusy?'Saving?':state.competitionConfirm.mode==='vote'?'Confirm vote':'Confirm entry'}</button></div></dialog>`:'';
 return `<div class="competition-page"><a href="/events" data-link class="text-link">&#8592; All events</a><header class="competition-hero">${photo(e.banner_url||e.cover_url)?`<img class="competition-banner" src="${esc(e.banner_url||e.cover_url)}" alt=""/>`:''}<div><span class="event-status event-status-${e.stage==='voting'?'live':'upcoming'}"><i aria-hidden="true"></i>${esc(labels[e.stage]||e.stage)}</span><h1>${esc(e.title)}</h1><p class="competition-tagline">${esc(e.theme||'Read. Vote. Crown the winner.')}</p><p class="competition-dates">${esc(date(e.starts_at))} &ndash; ${esc(date(e.ends_at))}</p><p class="competition-remaining" data-competition-countdown>${remaining(e)}</p><div class="competition-hero-actions">${e.votingOpen?'<button class="competition-primary" type="button" data-competition-tab="Stories">Explore & vote</button>':''}${e.entriesOpen?`<button class="${e.votingOpen?'outline-button':'competition-primary'}" type="button" data-competition-picker ${state.competitionBusy||e.myEntry?'disabled':''}>${e.myEntry?'Story entered':'Enter competition'}</button>`:!e.votingOpen?`<span class="competition-stage-label">${esc(labels[e.stage]||e.stage)}</span>`:''}<button type="button" class="outline-button" data-competition-share>Share event</button></div></div><aside class="competition-hero-prize"><span>THE WINNING PRIZE</span><strong>${esc(e.prize_currency==='ZMW'?'K'+Number(e.prize_amount).toLocaleString():e.prize_amount+' '+e.prize_currency)}</strong><p>${esc(e.prizes||'Chosen by readers. Verified by ReadAgora.')}</p></aside></header>${winner}<nav class="competition-tabs" aria-label="Competition sections">${['Overview','Stories','Leaderboard','Rules'].map(item=>`<button type="button" data-competition-tab="${item}" aria-current="${tab===item?'page':'false'}">${item}</button>`).join('')}</nav><p class="competition-message" role="status" aria-live="polite">${esc(state.competitionMessage|| (e.myEntry?`Your entry is ${e.myEntry.eligibility_status}.`:''))}</p>${picker}${tab==='Overview'?intro:tab==='Rules'?rules:tab==='Leaderboard'&&!e.show_rankings?'<p class="events-empty">Rankings are hidden for this competition.</p>':`<section class="competition-stories" aria-label="${tab}">${e.entries.map(storyCard).join('')||'<p class="events-empty">No approved entries yet. Check back soon.</p>'}</section>${e.nextOffset!==null?'<button type="button" class="outline-button" data-competition-more>Load more stories</button>':''}${e.stage==='closed'?'<p class="competition-verification">Voting has ended. Results are being reviewed; no winner has been announced.</p>':''}`}${confirm}</div>`;
}
export function bindCompetition({state,app,api,render,navigate,loadPage}) {
 clearInterval(competitionTimer);
 const event=state.page==='event-detail'?state.pageData?.competition:null;
 app.querySelector('[data-competition-retry]')?.addEventListener('click',()=>loadPage('event-detail',state.pageArgument));
 if(!event)return;
 const dialog=app.querySelector('.competition-confirm');
 if(dialog && typeof dialog.showModal==='function'){dialog.removeAttribute('open');dialog.showModal();}
 const path='/events/'+encodeURIComponent(event.slug),session=state.session;
 const active=()=>state.page==='event-detail' && state.pageData?.competition?.id===event.id && state.session===session;
 const signin=()=>{navigate('/login?next='+encodeURIComponent(path));};
 competitionTimer=setInterval(async()=>{if(!active()||state.competitionBusy||state.competitionConfirm)return;try{const fresh=await api(path);if(active()){state.pageData.competition=fresh;render();}}catch{}},60000);
 app.querySelectorAll('[data-competition-tab]').forEach(button=>button.addEventListener('click',()=>{state.competitionTab=button.dataset.competitionTab;render();}));
 app.querySelector('[data-competition-share]')?.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:event.title,url:event.url});else await navigator.clipboard.writeText(event.url);if(active()){state.competitionMessage='Event link ready to share.';render();}}catch{}});
 async function eligible(offset=0){
  state.competitionBusy=true;render();
  try{const stories=await api(path+'/eligible-stories?offset='+offset);if(active()){state.competitionEligible=offset?[...state.competitionEligible,...stories]:stories;state.competitionEligibleMore=stories.length===50;state.competitionPicker=true;}}
  catch(error){if(active())state.competitionMessage=error.message;}
  finally{if(active()){state.competitionBusy=false;render();}}
 }
 app.querySelector('[data-competition-picker]')?.addEventListener('click',()=>state.session?eligible():signin());
 app.querySelector('[data-competition-more-eligible]')?.addEventListener('click',()=>eligible(state.competitionEligible.length));
 app.querySelector('[data-competition-create]')?.addEventListener('click',()=>{sessionStorage.setItem('readagora-event-return',path);navigate('/workroom');});
 for(const mode of ['vote','enter'])app.querySelectorAll(`[data-competition-${mode}]`).forEach(button=>button.addEventListener('click',()=>{
  if(!state.session){signin();return;}
  const id=button.dataset[mode==='vote'?'competitionVote':'competitionEnter'];
  const story=(mode==='vote'?event.entries:state.competitionEligible).find(item=>item.id===id);
  if(!story)return;
  state.competitionConfirm={mode:mode==='vote'?'vote':'entry',storyId:id,title:story.title};render();
  app.querySelector('.competition-confirm [data-competition-cancel]')?.focus();
 }));
 app.querySelector('[data-competition-cancel]')?.addEventListener('click',()=>{state.competitionConfirm=null;render();});
 app.querySelector('.competition-confirm')?.addEventListener('keydown',key=>{if(key.key==='Escape'&&!state.competitionBusy){state.competitionConfirm=null;render();}if(key.key==='Tab'){const buttons=[...app.querySelectorAll('.competition-confirm button:not(:disabled)')];if(key.shiftKey&&document.activeElement===buttons[0]){key.preventDefault();buttons.at(-1)?.focus();}else if(!key.shiftKey&&document.activeElement===buttons.at(-1)){key.preventDefault();buttons[0]?.focus();}}});
 app.querySelector('[data-competition-confirm]')?.addEventListener('click',async()=>{
  if(state.competitionBusy)return;
  const choice=state.competitionConfirm;state.competitionBusy=true;render();
  try{
   await api('/events/'+event.id+(choice.mode==='vote'?'/vote':'/entries'),{method:'POST',body:{storyId:choice.storyId}});
   const fresh=await api(path);
   if(active()){state.pageData.competition=fresh;state.competitionConfirm=null;state.competitionPicker=false;state.competitionMessage=choice.mode==='vote'?"Your vote is in! You've helped shape the ReadAgora competition.":'Your story has been entered and is awaiting review.';}
  }catch(error){if(active()){state.competitionConfirm=null;state.competitionMessage=error.message;}}
  finally{if(active()){state.competitionBusy=false;render();}}
 });
 app.querySelector('[data-competition-more]')?.addEventListener('click',async()=>{
  if(state.competitionBusy)return;state.competitionBusy=true;
  try{const fresh=await api(path+'?offset='+event.nextOffset);if(active())state.pageData.competition={...fresh,entries:[...event.entries,...fresh.entries]};}
  catch(error){if(active())state.competitionMessage=error.message;}
  finally{if(active()){state.competitionBusy=false;render();}}
 });
}
