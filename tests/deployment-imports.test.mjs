import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
async function files(directory){
 const entries=await readdir(directory,{withFileTypes:true});
 return (await Promise.all(entries.map(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]))).flat();
}
test('website source imports stay inside its deployable directory',async()=>{
 for(const file of await files(path.join(root,'src'))){
  if(!/\.[cm]?[jt]sx?$/.test(file))continue;
  const source=await readFile(file,'utf8');
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*['"](\.[^'"]+)['"]/g)){
   const target=path.resolve(path.dirname(file),match[1]),relative=path.relative(root,target);
   assert.ok(relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative),`${path.relative(root,file)} imports outside the website: ${match[1]}`);
  }
 }
});
