#!/usr/bin/env node
// Strict offline provenance *metadata* gate; never installs/downloads dependencies.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=x=>JSON.parse(fs.readFileSync(path.join(root,x),'utf8'));
function fail(message){throw Error('PROVENANCE FAIL: '+message);}
function assert(ok,message){if(!ok)fail(message);}
function sha512(s){
 if(typeof s!=='string'||!/^sha512-[A-Za-z0-9+/]{86}==$/.test(s))return false;
 const content=s.slice(7);return Buffer.from(content,'base64').length===64&&Buffer.from(content,'base64').toString('base64')===content;
}
function check(){
 const php=read('cms/composer.lock'),npm=read('cms/editor/package-lock.json'),manifest=read('cms/editor/package.json');
 assert(Array.isArray(php.packages)&&php.packages.length===14,'PHP count changed');
 assert(Array.isArray(php['packages-dev'])&&php['packages-dev'].length===0,'new dev PHP package');
 const names=[];
 for(const item of php.packages){
  assert(/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(item.name),'bad PHP name');
  assert(/^https:\/\/github\.com\/[^/]+\/[^/]+\.git$/.test(item.source?.url||''),'unexpected PHP source origin: '+item.name);
  assert(/^[a-f0-9]{40}$/.test(item.source?.reference||''),'non-SHA PHP ref: '+item.name);
  assert(item.dist?.reference===item.source.reference,'PHP source/dist commit mismatch: '+item.name);
  assert(Array.isArray(item.license)&&item.license.length===1&&['MIT','BSD-3-Clause','Apache-2.0'].includes(item.license[0]),'unreviewed PHP metadata license: '+item.name);
  names.push(item.name);
 }
 assert(new Set(names).size===14,'duplicate PHP source');
 assert(npm.lockfileVersion===3&&typeof npm.packages==='object'&&npm.packages[''],'unexpected npm schema');
 assert(manifest.private===true,'test editor package must be private');
 const direct={...manifest.dependencies,...manifest.devDependencies};
 const lockDirect={...npm.packages[''].dependencies,...npm.packages[''].devDependencies};
 assert(Object.keys(direct).length===3&&JSON.stringify(direct)===JSON.stringify(lockDirect),'npm root pin mismatch');
 const entries=Object.entries(npm.packages).filter(([k])=>k);
 assert(entries.length===29,'unexpected npm count');
 const platforms=entries.filter(([k])=>k.startsWith('node_modules/@esbuild/'));
 assert(platforms.length===26,'optional platform binary count drift');
 const esbuild=npm.packages['node_modules/esbuild'];
 assert(esbuild.version===manifest.devDependencies.esbuild,'esbuild not pinned');
 assert(Object.keys(esbuild.optionalDependencies||{}).length===26,'esbuild optional manifest mismatch');
 for(const [k,v] of entries){
  assert(k.startsWith('node_modules/'),'unsafe dependency path: '+k);
  const name=k.slice('node_modules/'.length),short=name.split('/').at(-1);
  assert(/^[0-9]+\.[0-9]+\.[0-9]+$/.test(v.version),'npm non-stable version: '+name);
  assert(v.resolved==='https://registry.npmjs.org/'+name+'/-/'+short+'-'+v.version+'.tgz','unexpected npm source URL: '+name);
  assert(sha512(v.integrity),'invalid npm SHA512 SRI: '+name);
  assert(['MIT','Apache-2.0','BSD-3-Clause'].includes(v.license),'npm unknown SPDX: '+name);
  if(name.startsWith('@esbuild/')){
   assert(v.optional===true&&v.dev===true&&v.version===esbuild.version,'esbuild platform flags/version: '+name);
   assert(esbuild.optionalDependencies[name]===v.version,'esbuild optional list mapping: '+name);
   assert(Array.isArray(v.os)&&v.os.length>0&&Array.isArray(v.cpu)&&v.cpu.length>0,'esbuild CPU/OS filters: '+name);
  }
 }
 for(const [name,version] of Object.entries(direct))assert(npm.packages['node_modules/'+name]?.version===version,'npm direct pin changed: '+name);
 assert(esbuild.hasInstallScript===true,'esbuild postinstall behavior changed: manual review needed');
 return {php:14,npm:29,optionalPlatformBinaries:26,sha512Integrities:29,composerSourceRefs:14,directNpmPins:3,
   note:'Metadata consistency only: cannot prove source release publisher, original license files, installed bytes or lack of vulnerabilities'};
}
try{
 if(process.argv.length!==2)fail('No arguments; run node lock-provenance.mjs');
 console.log(JSON.stringify({status:'offline-metadata-pins-pass',...check()},null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
