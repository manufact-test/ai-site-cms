#!/usr/bin/env node
'use strict';
// Read-only mutation regression with synthetic locks; never accesses live CMS, GitHub or registries.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
const DIR=path.dirname(fileURLToPath(import.meta.url));
const lab=fs.mkdtempSync(path.join(os.tmpdir(),'ai-cms-supply-policy-'));
function assertion(ok,name){if(!ok)throw Error('FAIL '+name);console.log('PASS '+name);}
function fixture(){
  const composer={packages:Array.from({length:14},(_,i)=>({name:'fixture/package-'+i,version:'1.2.3',license:[i===0?'Apache-2.0':i===1?'BSD-3-Clause':'MIT'],source:{reference:'source-'+i,url:'https://example.invalid/src'},dist:{reference:'dist-'+i}})),'packages-dev':[]};
  const packages={'':{name:'fixture',version:'1.0.0'}};
  for(let i=0;i<29;i++)packages['node_modules/'+(i===0?'jedison':'@fixture/platform-'+i)]={version:'1.0.0',license:i===28?'Apache-2.0':'MIT',resolved:'https://example.invalid/tarball',integrity:'sha512-synthetic-not-trusted',optional:i!==0};
  return {composer,npm:{lockfileVersion:3,packages}};
}
function execute(fix,args=[]){
  fs.writeFileSync(path.join(lab,'cms/composer.lock'),JSON.stringify(fix.composer));
  fs.writeFileSync(path.join(lab,'cms/editor/package-lock.json'),JSON.stringify(fix.npm));
  return cp.spawnSync(process.execPath,[path.join(lab,'research/parallel-security/inventory-audit.mjs'),...args],{encoding:'utf8',timeout:15000});
}
function mustPass(fix,name,args=[]){const r=execute(fix,args);assertion(r.status===0,name+' (exit 0): '+r.stderr);return r;}
function mustReject(fix,name,match,args=[]){const r=execute(fix,args);assertion(r.status!==0&&match.test(r.stderr),name+' (exit nonzero): '+r.stderr);}
try{
  for(const dir of ['cms/editor','research/parallel-security'])fs.mkdirSync(path.join(lab,dir),{recursive:true});
  fs.copyFileSync(path.join(DIR,'inventory-audit.mjs'),path.join(lab,'research/parallel-security/inventory-audit.mjs'));
  const f=fixture();let r=mustPass(f,'valid synthetic inventory');
  let doc=JSON.parse(r.stdout);assertion(doc.componentCount===43&&doc.composerRuntime===14&&doc.npmLocked===29,'14+29 counted');
  r=mustPass(f,'CSV synthetic inventory',['--csv']);
  assertion(r.stdout.trimEnd().split('\n').length===44,'CSV contains 43 items + header');
  const mutate=fn=>{const x=fixture();fn(x);return x;};
  mustReject(mutate(x=>x.composer.packages[0].license=['GPL-3.0-only']),'copyleft metadata rejects',/Review PHP SPDX/);
  mustReject(mutate(x=>x.npm.packages['node_modules/jedison'].license='UNLICENSED'),'unknown npm license rejects',/Review npm SPDX/);
  mustReject(mutate(x=>{delete x.npm.packages['node_modules/jedison'].integrity}),'missing npm integrity rejects',/Missing npm provenance/);
  mustReject(mutate(x=>x.composer.packages.pop()),'missing PHP package rejects',/Expected 14/);
  mustReject(mutate(x=>{delete x.npm.packages['node_modules/jedison']}),'missing npm package rejects',/Expected 29/);
  mustReject(mutate(x=>x.composer['packages-dev'].push({name:'fixture/dev'})),'unreviewed PHP dev package rejects',/Unexpected PHP dev/);
  mustReject(mutate(x=>x.composer.packages[1].name=x.composer.packages[0].name),'duplicate PHP component rejects',/Duplicate component/);
  mustReject(f,'unrecognized CLI argument rejects',/Usage/,['--incorrect']);
  console.log(JSON.stringify({suite:'synthetic-lock-policy-regression',checks:12,passed:true,realLockAudit:false}));
} finally {fs.rmSync(lab,{recursive:true,force:true});}
