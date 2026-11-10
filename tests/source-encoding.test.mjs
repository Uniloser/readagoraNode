import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
const decoder=new TextDecoder('utf-8',{fatal:true});
async function check(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const url=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
  if(entry.isDirectory()){await check(url);continue;}
  if(!/\.(?:tsx?|js|css)$/.test(entry.name))continue;
  const text=decoder.decode(await readFile(url));
  assert.doesNotMatch(text,/[\u0080-\u009f\ufffd]|\u00e2[\u20ac\u2122\u2020\u2039\u2013\u2014]|\u00c2\u00b7|\u00ef\u00bc/,`Broken UTF-8 display text in ${url.pathname}`);
 }
}
test('website source contains valid UTF-8 without broken display symbols',async()=>{await check(new URL('../src/',import.meta.url));});
