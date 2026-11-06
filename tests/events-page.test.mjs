import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEventsPage} from '../src/features/events/page.js';
const event={title:'<script>alert(1)</script>',status:'live',starts_at:'2030-01-01T00:00:00Z',ends_at:'2030-01-31T00:00:00Z',rules:'Original stories only',prizes:'Books'};
test('published event details appear only in their status tab and escape user text',()=>{
 const html=renderEventsPage({events:[event]});
 assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>')); assert.ok(html.includes('Original stories only')); assert.ok(html.includes('Books'));
 assert.ok(!renderEventsPage({tab:'Upcoming',events:[event]}).includes('Original stories only'));
 assert.ok(renderEventsPage({tab:'Past',events:[{...event,status:'completed'}]}).includes('Original stories only'));
});
test('loading and error states hide stale event data',()=>{
 assert.ok(!renderEventsPage({events:[event],loading:true}).includes('Original stories only'));
 assert.ok(renderEventsPage({events:[event],error:'Unavailable'}).includes('We could not load events'));
});
