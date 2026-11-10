import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const website=fileURLToPath(new URL('..',import.meta.url));
function start({file=true,hostUrl}={}){
 const tempRoot=fs.realpathSync(os.tmpdir()),directory=fs.mkdtempSync(path.join(tempRoot,'readagora-startup-'));
 try{
  fs.copyFileSync(path.join(website,'server.js'),path.join(directory,'server.js'));
  if(file)fs.writeFileSync(path.join(directory,'.env.local'),'READAGORA_API_URL=https://file-api.example\n');
  const output=path.join(directory,'.next','standalone');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'server.js'),`process.chdir(__dirname);console.log(JSON.stringify({api:process.env.READAGORA_API_URL,mode:process.env.NODE_ENV,port:process.env.PORT}));`);
  const env={...process.env,NODE_PATH:path.join(website,'node_modules'),PORT:'4567'};
  for(const key of ['READAGORA_API_URL','NEXT_DIST_DIR','__NEXT_PROCESSED_ENV','NODE_ENV'])delete env[key];
  if(hostUrl)env.READAGORA_API_URL=hostUrl;
  const result=spawnSync(process.execPath,[path.join(directory,'server.js')],{encoding:'utf8',env});
  assert.equal(result.status,0,result.stderr);
  return JSON.parse(result.stdout.trim());
 }finally{
  const relative=path.relative(tempRoot,directory);
  assert.ok(!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(directory).startsWith('readagora-startup-'));
  fs.rmSync(directory,{recursive:true,force:true});
 }
}
test('launcher loads root .env.local before the standalone server changes directory',()=>{
 assert.deepEqual(start(),{api:'https://file-api.example',mode:'production',port:'4567'});
});
test('hosting environment variables take precedence over .env.local',()=>{
 assert.equal(start({hostUrl:'https://hosting-api.example'}).api,'https://hosting-api.example');
});
test('hosting variables also work without any env file',()=>{
 assert.equal(start({file:false,hostUrl:'https://hosting-api.example'}).api,'https://hosting-api.example');
});
