import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const {transformSync}=require('next/dist/build/swc');
const file='../src/components/application/stories.tsx';
const code=transformSync(readFileSync(new URL(file,import.meta.url),'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs',noInterop:true}}).code;
function render({format='text',text=true,comic=true}={}){
 const data={offline:true,story:{id:'s',title:'Story'},chapter:{id:'c',has_text:text,content:text?'<p>TEXT_VERSION_CONTENT</p>':''},chapters:[{id:'c'}],panels:comic?[{id:'p',image_url:'/COMIC_VERSION.png'}]:[]};
 const pass=({children})=>children;
 const overrides={react:{...React,useState:initial=>React.useState(initial==='text'?format:initial)},'next/link':{default:({children,href,...props})=>React.createElement('a',{href,...props},children)},'next/navigation':{useRouter:()=>({push(){}}),useSearchParams:()=>new URLSearchParams()},'./provider':{useApplication:()=>({session:null}),useResource:()=>({data,loading:false})},'./ui':{LoadState:pass,Action:pass,Empty:pass,RichText:({html})=>React.createElement('div',{dangerouslySetInnerHTML:{__html:html}}),enc:encodeURIComponent,list:value=>Array.isArray(value)?value:[]},'./discovery':{},'@/lib/offline-library.js':{},'@/features/stories/browser-speech.js':{},'./event-vote':{EventVote:()=>null},'@/components/theme-toggle':{ThemeToggle:()=>null}};
 const exports={};vm.runInNewContext(code,{exports,require:name=>name in overrides?overrides[name]:require(name)});
 return renderToStaticMarkup(React.createElement(exports.ReaderPage,{storyId:'s',chapterId:'c'}));
}
test('dual-format text view offers a header switch and excludes comic panels',()=>{const html=render();assert.match(html,/TEXT_VERSION_CONTENT/);assert.doesNotMatch(html,/src="\/COMIC_VERSION/);assert.match(html,/<header[\s\S]*aria-label="Story version"[\s\S]*<\/header>/);});
test('dual-format comic view excludes the text version',()=>{const html=render({format:'comic'});assert.match(html,/src="\/COMIC_VERSION.png"/);assert.doesNotMatch(html,/TEXT_VERSION_CONTENT/);});
test('single-format chapters fall back to their available version',()=>{const comic=render({text:false});assert.match(comic,/src="\/COMIC_VERSION.png"/);assert.doesNotMatch(comic,/aria-label="Story version"/);const text=render({comic:false,format:'comic'});assert.match(text,/TEXT_VERSION_CONTENT/);assert.doesNotMatch(text,/aria-label="Story version"/);});
