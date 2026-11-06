import { voteState } from './competition.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function renderEventVoting(state) {
 const boards=state.eventVotingBoards || [];
 const selected=boards.find(event=>event.id===state.eventVotingId) || boards.find(event=>event.votingOpen) || boards[0];
 const status=selected?.votingOpen ? 'Voting is open' : ['closed','announced'].includes(selected?.stage) || selected?.status==='completed' || Date.parse(selected?.ends_at)<=Date.now() ? 'Voting has ended' : 'Voting is not open';
 const rows=(selected?.entries || []).map((story,index)=>{
  const voted=selected.myVote===story.id;
  const choice=voteState(selected,story,state.session?.user?.id);
  const href='/story/'+encodeURIComponent(story.id)+'?event='+encodeURIComponent(selected.slug||selected.id);
  return `<tr><td class="event-vote-rank">${selected.show_rankings===false?'&ndash;':String(story.rank||index+1).padStart(2,'0')}</td><td><a class="event-vote-story" href="${href}" data-link>${/^https?:\/\//i.test(story.cover_url || '') ? `<img src="${esc(story.cover_url)}" alt="" loading="lazy"/>` : '<span class="event-vote-placeholder" aria-hidden="true">A</span>'}<span><b>${esc(story.title)}</b><small>${esc(story.genre || 'Original story')}</small></span></a></td><td class="event-vote-count">${story.votes===null?'Hidden':Number(story.votes || 0).toLocaleString()}<small>votes</small></td><td class="event-vote-action"><button type="button" data-event-vote="${esc(story.id)}" data-vote-event="${esc(selected.id)}" aria-pressed="${voted}" ${choice.disabled || state.eventVoteBusy ? 'disabled' : ''}>${choice.label}</button></td></tr>`;
 }).join('');
 return `<section class="ranking-board event-voting-board" id="discover-top-stories"><div class="ranking-heading-row"><div><span class="eyebrow">COMMUNITY CHOICE</span><h2 class="ranking-title">Vote for an event story</h2></div><a class="text-link" href="/events/${encodeURIComponent(selected?.slug||'')}" data-link>Event details &#8594;</a></div>${state.eventVotingError ? `<p role="alert">${esc(state.eventVotingError)} <button type="button" data-event-voting-retry>Try again</button></p>` : ''}${selected ? `<div class="event-vote-toolbar"><label>Event<select data-event-voting-select>${boards.map(event=>`<option value="${esc(event.id)}" ${event.id===selected.id?'selected':''}>${esc(event.title)}</option>`).join('')}</select></label><p>${status}</p></div><p class="event-vote-help">One verified vote per reader in each event. ${selected.allow_vote_changes?'You can change your choice while voting is open.':'Votes are final after confirmation. No self-voting.'}${!state.session ? ' Sign in to vote.' : ''}</p>${rows ? `<table class="event-vote-table"><thead><tr><th scope="col">Rank</th><th scope="col">Story</th><th scope="col">Votes</th><th scope="col">Your vote</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="ranking-empty">No stories have been entered in this event yet.</p>'}` : `<p class="ranking-empty">${state.eventVotingLoading ? 'Loading event stories?' : 'Event stories will appear here when a challenge is published.'}</p>`}<p class="event-vote-message" role="status" aria-live="polite">${esc(state.eventVoteMessage || '')}</p></section>`;
}
export function bindEventVoting({app,state,api,render,navigate,reload}) {
 app.querySelector('[data-event-voting-select]')?.addEventListener('change',event=>{state.eventVotingId=event.target.value;state.eventVoteMessage='';render();});
 app.querySelector('[data-event-voting-retry]')?.addEventListener('click',reload);
 app.querySelectorAll('[data-event-vote]').forEach(button=>button.addEventListener('click',async()=>{
  if(state.eventVoteBusy) return;
  const board=state.eventVotingBoards?.find(item=>item.id===button.dataset.voteEvent);
  if(!state.session) { navigate('/login?next='+encodeURIComponent('/events/'+(board?.slug||button.dataset.voteEvent))); return; }
  if(!globalThis.confirm('Confirm your vote? '+(board?.allow_vote_changes?'You may change it until voting closes.':'Your vote is final.')))return;
  const session=state.session, eventId=button.dataset.voteEvent;
  state.eventVoteBusy=true; state.eventVoteMessage='Saving your vote?'; render();
  try {
   await api('/events/'+encodeURIComponent(eventId)+'/vote',{method:'POST',body:{storyId:button.dataset.eventVote}});
   const boards=await api('/events/voting');
   if(state.session!==session) return;
   state.eventVotingBoards=boards; state.eventVotingError='';state.eventVoteMessage="Your vote is in! You've helped shape the ReadAgora competition.";
  } catch(error) { if(state.session===session) state.eventVoteMessage=error.message || 'Could not save your vote.'; }
  finally {state.eventVoteBusy=false;render();}
 }));
}
