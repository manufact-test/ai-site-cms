#!/usr/bin/env node
// Fully disposable negative and positive fixtures for NOTICE preservation gate.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
const thisDir=path.dirname(fileURLToPath(import.meta.url));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-cms-notice-'));
const targets=['opis/json-schema','opis/string'];
const text=['Opis Json Schema\nCopyright 2018-2021 Zindex Software\nOriginal Author Attribution',
 'Opis String\nCopyright 2018-2021 Zindex Software\nOriginal Author Attribution'];
const destination=path.join(tmp,'.build/internal-stage2-package/private/compliance/THIRD_PARTY_NOTICES.txt');
function assert(ok,name){if(!ok)throw Error('FAIL '+name);console.log('PASS '+name);}
function check(){return cp.spawnSync(process.execPath,[path.join(tmp,'research/parallel-security/notice-gate.mjs')],{encoding:'utf8',timeout:15000});}
function write(value){fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,value);}
try{
 fs.mkdirSync(path.join(tmp,'research/parallel-security'),{recursive:true});
 fs.copyFileSync(path.join(thisDir,'notice-gate.mjs'),path.join(tmp,'research/parallel-security/notice-gate.mjs'));
 for(let i=0;i<targets.length;i++){
  const source=path.join(tmp,'cms/vendor',targets[i],'NOTICE');fs.mkdirSync(path.dirname(source),{recursive:true});fs.writeFileSync(source,text[i]+'\n');
 }
 let r=check();assert(r.status===2&&/MISSING/.test(r.stderr),'missing compiled notices blocks verification');
 write('THIRD PARTY\nOnly LICENSE copied\n');r=check();assert(r.status===1&&/MISSING UPSTREAM NOTICE/.test(r.stderr),'LICENSE-only content rejected');
 write(text[0]+'\n');r=check();assert(r.status===1&&r.stderr.includes(targets[1]),'partial NOTICE coverage rejected');
 write(text.join('\n\n')+'\n');r=check();assert(r.status===0,'complete verbatim NOTICE coverage accepted');
 write(text[0]+'\n'+text[1].slice(0,-12)+'\n');r=check();assert(r.status===1,'truncated source attribution rejected');
 console.log(JSON.stringify({suite:'notice-preservation-regression',checks:5,passed:true,realVendorNotInspected:true}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
