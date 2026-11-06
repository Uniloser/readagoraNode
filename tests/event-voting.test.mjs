import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEventVoting,bindEventVoting} from '../src/features/events/voting.js';
const board={id:'event-1',title:'Challenge',votingOpen:true,status:'live',myVote:'story-1',entries:[{id:'story-1',title:'<script>bad</script>',genre:'Fantasy',votes:3,cover_url:'javascript:bad'}]};
test('voting board renders event entries, escaped content and current choice',()=>{
 const html=renderEventVoting({eventVotingBoards:[board],session:{}});
 assert.ok(html.includes('3'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('javascript:bad'));assert.ok(html.includes('aria-pressed="true"'));assert.ok(html.includes('Voted'));
 assert.ok(renderEventVoting({eventVotingBoards:[{...board,votingOpen:false}]}).includes('disabled'));
 assert.ok(renderEventVoting({}).includes('when a challenge is published'));
});
function harness(session) {
 let click;
 const state={session,eventVotingBoards:[board]},button={dataset:{voteEvent:'event-1',eventVote:'story-2'},addEventListener(name,fn){click=fn;}};
 const calls=[];
 bindEventVoting({app:{querySelector(){return null;},querySelectorAll(){return [button];}},state,api:async(...args)=>{calls.push(args);return args[0]==='/events/voting'?[{...board,myVote:'story-2'}]:{};},render(){},navigate(path){calls.push(path);},reload(){}});
 return {state,calls,click:()=>click()};
}
test('anonymous voting opens sign in without writing',async()=>{
 const h=harness(null);await h.click();assert.deepEqual(h.calls,['/login?next=%2Fevents%2Fevent-1']);
});
test('signed-in vote posts the selected event and story then refreshes totals',async()=>{
 globalThis.confirm=()=>true;const h=harness({user:{id:'reader'}});await h.click();
 assert.deepEqual(h.calls[0],['/events/event-1/vote',{method:'POST',body:{storyId:'story-2'}}]);
 assert.equal(h.state.eventVotingBoards[0].myVote,'story-2');assert.equal(h.state.eventVoteBusy,false);
});
