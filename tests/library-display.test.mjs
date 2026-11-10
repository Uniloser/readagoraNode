import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const {transformSync}=require('next/dist/build/swc');
const link={default:({children,...props})=>React.createElement('a',props,children)};
function compile(file,overrides){
 const code=transformSync(readFileSync(new URL(file,import.meta.url),'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs',noInterop:true}}).code;
 const exports={};vm.runInNewContext(code,{exports,require:name=>name in overrides?overrides[name]:require(name)});return exports;
}
function library(rows){
 const pass=({children})=>children;
 return compile('../src/components/application/discovery.tsx',{'next/link':link,'next/navigation':{},'./provider':{useApplication:()=>({session:{user:{id:'reader'}}}),useResource:()=>({data:rows,loading:false,reload(){}})},'./ui':{list:value=>Array.isArray(value)?value:[],enc:encodeURIComponent,LoadState:pass,PageTitle:()=>null,Action:pass,Empty:pass},'@/components/story-card':{},'@/lib/offline-library.js':{},'@/lib/shared/site-ad-svg.js':{},'./event-vote':{}});
}
test('progress rows display the nested story cover/title and resume the correct story chapter',()=>{
 const rows=[{id:'progress-id',story_id:'story-id',last_chapter_id:'chapter-id',updated_at:'2026-09-15T12:00:00Z',story:{id:'story-id',title:'The actual story',cover_url:'/covers/actual.jpg'}}];
 const {LibraryPage}=library(rows),html=renderToStaticMarkup(React.createElement(LibraryPage));
 assert.match(html,/The actual story/);assert.match(html,/src="\/covers\/actual.jpg"/);assert.match(html,/href="\/read\/story-id\/chapter-id"/);assert.doesNotMatch(html,/Untitled story|\/story\/progress-id/);
});
test('library normalization supports bookmarks and offline stories while omitting missing stories',()=>{
 const {libraryEntries}=library([]);
 const rows=libraryEntries([{story_id:'saved',chapter_id:'part',story:{title:'Saved story'}},{id:'offline',title:'Offline story',offline_chapters:[{id:'downloaded'}]},{story_id:'deleted',story:null}]);
 assert.equal(rows.length,2);assert.equal(rows[0].story.id,'saved');assert.equal(rows[0].entry.chapter_id,'part');assert.equal(rows[1].story.title,'Offline story');
});
test('mobile navigation includes SVG icons and preserves accessible labels',()=>{
 const {ApplicationShell}=compile('../src/components/application/shell.tsx',{'next/link':link,'next/navigation':{usePathname:()=>'/library'},'./provider':{useApplication:()=>({session:null})},'@/components/theme-toggle':{ThemeToggle:()=>null},'@/components/site-footer':{SiteFooter:()=>null}});
 const html=renderToStaticMarkup(React.createElement(ApplicationShell,null,'Content')),mobile=html.slice(html.indexOf('aria-label="Mobile navigation"'));
 assert.equal((mobile.match(/class="nav-icon"/g)||[]).length,5);assert.match(mobile,/aria-current="page"/);assert.match(mobile,/<span>Library<\/span>/);
});
