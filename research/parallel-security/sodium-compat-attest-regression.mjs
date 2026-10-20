#!/usr/bin/env node
// Offline synthetic attestation failures only; NEVER asserts true 2.5.2 provenance
// or actual extension-free PHP. Uses fake source and independently computed hash.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {attest} from './sodium-compat-attest.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sodium-source-attest-'));
const root=path.join(dir,'package'),lock=path.join(dir,'composer.lock');
const ref='3246b36803c177847e677862fedeb7f937869adb';
const source='https://github.com/paragonie/sodium_compat.git';
const digestFile=s=>crypto.createHash('sha256').update(s).digest('hex');
let count=0;
function yes(v,label){assert.ok(v,label);count++;console.log('PASS ATTEST '+label);}
function deny(label,action){assert.throws(action,/SODIUM_COMPAT_UNATTESTED|ENOENT/);count++;console.log('PASS ATTEST '+label+' rejected');}
function treeDigest(){
  const files=[];
  function walk(folder,rel=''){
    for(const n of fs.readdirSync(folder)){
      const full=path.join(folder,n),r=rel?rel+'/'+n:n;
      if(fs.lstatSync(full).isDirectory())walk(full,r);else files.push(r);
    }
  }
  walk(root);
  const h=crypto.createHash('sha256');
  h.update('AI-SITE-CMS-SODIUM-COMPAT-SOURCE-TREE-V1\n');
  files.sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b)));
  for(const file of files){const bytes=fs.readFileSync(path.join(root,file));
    h.update(file+'\0'+bytes.length+'\0'+digestFile(bytes)+'\n');}
  return h.digest('hex');
}
const meta={name:'paragonie/sodium_compat',license:'ISC',autoload:{files:['autoload.php']},require:{php:'^8.1','php-64bit':'*'}};
const pkg={name:'paragonie/sodium_compat',version:'v2.5.2',source:{type:'git',url:source,reference:ref},dist:{reference:ref}};
function writeLock(p=pkg){fs.writeFileSync(lock,JSON.stringify({packages:[p],'packages-dev':[]}));}
function mutate(file,change,fn){const prior=fs.readFileSync(file);try{fs.writeFileSync(file,change);fn();}finally{fs.writeFileSync(file,prior);}}
try{
  fs.mkdirSync(root);fs.mkdirSync(path.join(root,'src'));
  fs.writeFileSync(path.join(root,'autoload.php'),'<?php // synthetic only\n');
  fs.writeFileSync(path.join(root,'composer.json'),JSON.stringify(meta));
  fs.writeFileSync(path.join(root,'LICENSE'),'ISC license synthetic fixture\n');
  fs.writeFileSync(path.join(root,'src/Compat.php'),'<?php // synthetic Ed25519 placeholder\n');
  writeLock();
  const digest=treeDigest();
  const output=attest(root,lock,digest);
  yes(output.sourceVerifiedAgainstExternalHash===true&&output.sourceCommit===ref&&output.fileCount===4&&output.productionApproved===false,
    'matching independently supplied source SHA yields non-production evidence');
  deny('unsupplied external hash',()=>attest(root,lock,undefined));
  deny('malformed external hash',()=>attest(root,lock,'Z'.repeat(64)));
  deny('wrong reviewed hash',()=>attest(root,lock,'a'.repeat(64)));
  mutate(path.join(root,'src/Compat.php'),'<?php echo "evil";\n',()=>deny('modified crypto implementation',()=>attest(root,lock,digest)));
  fs.writeFileSync(path.join(root,'src/foreign.php'),'<?php echo "rogue";');
  try{deny('added unreviewed executable file',()=>attest(root,lock,digest));}finally{fs.unlinkSync(path.join(root,'src/foreign.php'));}
  mutate(path.join(root,'composer.json'),JSON.stringify({...meta,license:'MIT'}),()=>deny('unreviewed license swap',()=>attest(root,lock,digest)));
  mutate(path.join(root,'composer.json'),JSON.stringify({...meta,autoload:{files:['none.php']}}),()=>deny('unexpected autoload metadata',()=>attest(root,lock,digest)));
  for(const [label,p] of [
    ['older vulnerable version',{...pkg,version:'v2.5.0'}],
    ['substituted upstream',{...pkg,source:{...pkg.source,url:'https://example.test/crypto.git'}}],
    ['wrong source commit',{...pkg,source:{...pkg.source,reference:'b'.repeat(40)}}],
    ['wrong distribution commit',{...pkg,dist:{reference:'b'.repeat(40)}}]]){
    writeLock(p);deny(label,()=>attest(root,lock,digest));
  }writeLock();
  writeLock({...pkg});
  fs.writeFileSync(lock,JSON.stringify({packages:[pkg,pkg]}));
  deny('duplicate exact package locks',()=>attest(root,lock,digest));writeLock();
  const link=path.join(dir,'outside.php');fs.writeFileSync(link,'<?php');
  const symlink=path.join(root,'src/extra.php');fs.symlinkSync(link,symlink);
  try{deny('linked source file',()=>attest(root,lock,digest));}finally{fs.unlinkSync(symlink);}
  const hardlink=path.join(root,'src/extra.php');fs.linkSync(path.join(root,'src/Compat.php'),hardlink);
  try{deny('hardlinked source file',()=>attest(root,lock,digest));}finally{fs.unlinkSync(hardlink);}
  const nested=path.join(root,'src/node_modules');fs.mkdirSync(nested);
  try{deny('unreviewed nested vendor tree',()=>attest(root,lock,digest));}finally{fs.rmdirSync(nested);}
  const rootLink=path.join(dir,'alias');fs.symlinkSync(root,rootLink);
  try{deny('symlinked root path',()=>attest(rootLink,lock,digest));}finally{fs.unlinkSync(rootLink);}
  const good=cp.spawnSync(process.execPath,[path.join(here,'sodium-compat-attest.mjs')],{
    env:{...process.env,SODIUM_COMPAT_AUTOLOAD:path.join(root,'autoload.php'),
      SODIUM_COMPAT_LOCK:lock,SODIUM_COMPAT_TREE_SHA256:digest},encoding:'utf8'});
  yes(good.status===0&&JSON.parse(good.stdout).treeSha256===digest,'standalone CLI accepts operator-provided reviewed digest');
  const bad=cp.spawnSync(process.execPath,[path.join(here,'sodium-compat-attest.mjs')],{
    env:{...process.env,SODIUM_COMPAT_AUTOLOAD:path.join(root,'autoload.php'),
      SODIUM_COMPAT_LOCK:lock,SODIUM_COMPAT_TREE_SHA256:'a'.repeat(64)},encoding:'utf8'});
  yes(bad.status===3&&bad.stderr.includes('SODIUM_COMPAT_ATTESTATION_BLOCKED'),'standalone CLI blocked on wrong evidence');
  yes(attest(root,lock,digest).fileCount===4,'original synthetic package restored after hostile cases');
  console.log('Sodium compat independent source attestation offline regression PASS '+count+' assertions; synthetic files, NOT actual upstream approval');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
