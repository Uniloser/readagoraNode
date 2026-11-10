import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const {transformSync}=require('next/dist/build/swc');
const file='../src/components/application/stories.tsx';
const source=readFileSync(new URL(file,import.meta.url),'utf8');
const componentSource="import {useEffect,useRef,useState,type RefObject} from 'react';\nexport function SelectionActions("+source.split('export function SelectionActions(')[1];
const code=transformSync(componentSource,{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs',noInterop:true}}).code;
function setup({outside=false,text='A selected passage.'}={}){
 const listeners={},states=[],refs=[];let stateIndex=0,refIndex=0,effect,initialized=false,timer,quoted,copied,cleared=false;
 const start={},end={},range={startContainer:start,endContainer:end,getBoundingClientRect:()=>({left:300,top:200,bottom:230,width:180})};
 const selection={isCollapsed:false,rangeCount:1,toString:()=>text,getRangeAt:()=>range,removeAllRanges:()=>{cleared=true;}};
 const document={activeElement:null,addEventListener:(name,handler)=>{listeners[name]=handler;},removeEventListener(){}};
 const react={useState:initial=>{const i=stateIndex++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=value;}];},useRef:initial=>{const i=refIndex++;return refs[i]??(refs[i]={current:initial});},useEffect:callback=>{if(!initialized)effect=callback;}};
 const exports={};
 vm.runInNewContext(code,{exports,require:name=>name==='react'?react:require(name),document,window:{getSelection:()=>selection,addEventListener(){},removeEventListener(){}},innerWidth:800,innerHeight:600,location:{href:'https://readagora.test/read/story/chapter'},navigator:{clipboard:{writeText:async value=>{copied=value;}}},setTimeout:callback=>{timer=callback;return 1;},clearTimeout:()=>{timer=undefined;}});
 const props={contentRef:{current:{contains:node=>!outside&&(node===start||node===end)}},title:'The story',canQuote:true,onQuote:text=>{quoted=text;}};
 const render=()=>{stateIndex=0;refIndex=0;return exports.SelectionActions(props);};
 render();effect();initialized=true;
 return {render,highlight:()=>{listeners.selectionchange();timer?.();},escape:()=>listeners.keydown({key:'Escape'}),get quoted(){return quoted;},get copied(){return copied;},get cleared(){return cleared;}};
}
test('highlights outside story content never open passage actions',()=>{const h=setup({outside:true});h.highlight();assert.equal(h.render(),null);});
test('quote uses the captured highlight and clears selection',()=>{const h=setup();h.highlight();const popup=h.render();assert.equal(popup.props.role,'dialog');popup.props.children[1].props.children[1].props.onClick();assert.equal(h.quoted,'A selected passage.');assert.equal(h.cleared,true);assert.equal(h.render(),null);});
test('share copies the selected passage and chapter link when native share is absent',async()=>{const h=setup();h.highlight();await h.render().props.children[1].props.children[0].props.onClick();assert.match(h.copied,/A selected passage/);assert.match(h.copied,/https:\/\/readagora.test\/read\/story\/chapter/);});
test('Escape dismisses selection actions and long quotes respect the comment limit',()=>{const h=setup({text:'x'.repeat(1400)});h.highlight();h.render().props.children[1].props.children[1].props.onClick();assert.equal(h.quoted.length,1000);h.highlight();h.escape();assert.equal(h.render(),null);});
