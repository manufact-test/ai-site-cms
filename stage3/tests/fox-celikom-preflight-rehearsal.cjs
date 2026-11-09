#!/usr/bin/env node
'use strict';
/*
 * NO DEPLOY: exact final FOX candidate ZIP versus the separate, pinned
 * 5c863f4 source checkout. Only inert pointer/installer fixtures are synthetic.
 * All operations stay inside an automatically destroyed CI temporary folder.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const {sha,guardZip,validateCandidate}=require('../bin/fox-update-preflight.cjs');
const repo=path.resolve(__dirname,'../..');
const gate=path.join(repo,'stage3/bin/fox-celikom-update-preflight.cjs');
const legacyGate=path.join(repo,'stage3/bin/fox-update-preflight.cjs');
const baselineSha='5c863f476cc538112ff3252f18a4cdedb336e4b6';
const fingerprint='ae6bfee2f7a0b1d01105475e86800b9713604576e7565b26598bb78726919662';
const roots=['components','media-motion','server','studio'];
const pointer='server/private-config-path.json';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fox-celikom-seven-'));
function call(bin,args,cwd=repo,expected=0){
  const r=spawnSync(bin,args,{cwd,encoding:'utf8',timeout:90000,maxBuffer:16*1024*1024});
  if(r.error||r.status!==expected)throw Error('isolated FOX lab command failed: '+bin+
    ' '+args.join(' ')+'\n'+(r.error?.message||r.stderr||r.stdout));
  return r;
}
function zipCode(dir,out){call('zip',['-q','-r',out,...roots],dir);}
function normalize(dir){
  fs.chmodSync(dir,0o755);
  for(const n of fs.readdirSync(dir,{withFileTypes:true})){
    const f=path.join(dir,n.name);
    if(n.isDirectory())normalize(f);
    else if(n.isFile()&&!n.isSymbolicLink())fs.chmodSync(f,0o644);
    else throw Error('unsafe synthetic fixture');
  }
}
function inventory(dir,base=''){
  const result=[];
  for(const n of fs.readdirSync(dir,{withFileTypes:true})){
    const rel=base?base+'/'+n.name:n.name,full=path.join(dir,n.name);
    if(n.isSymbolicLink())throw Error('unsafe lab symlink');
    if(n.isDirectory())result.push(...inventory(full,rel));
    else if(n.isFile())result.push({name:rel,mode:fs.statSync(full).mode&0o777,
      hash:sha(fs.readFileSync(full))});
    else throw Error('unexpected special file');
  }
  return result.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
}
function verifyInstalled(tree,manifest,pointerHash){
  for(const f of manifest.files){
    const p=path.join(tree,f.path.slice('stage3/'.length));
    assert.equal(sha(fs.readFileSync(p)),f.sha256);
    assert.equal(fs.statSync(p).mode&0o777,0o644);
  }
  assert.equal(fs.statSync(path.join(tree,pointer)).mode&0o777,0o600);
  assert.equal(sha(fs.readFileSync(path.join(tree,pointer))),pointerHash);
}
try{
  assert.equal(process.argv.length,4,'expected ABS_FINAL_FOX_ZIP and ABS_OLD_SOURCE');
  const candidate=guardZip(process.argv[2]),old=path.resolve(process.argv[3]);
  assert.equal(old,process.argv[3],'source checkout must be absolute');
  const oldPacker=path.join(old,'stage3/bin/cms-release.cjs');
  assert.ok(fs.existsSync(oldPacker));
  const packaged=path.join(tmp,'baseline-source');
  call(process.execPath,[oldPacker,'pack-php-host',old,packaged]);
  const oldManifest=JSON.parse(fs.readFileSync(path.join(packaged,'cms-release.json')));
  assert.equal(oldManifest.fingerprint,fingerprint,
    'old checkout must be the exact 5c863f4 baseline, not a synthetic copy of new code');
  assert.equal(oldManifest.files.length,83);
  const active=path.join(tmp,'active-fox');
  fs.cpSync(path.join(packaged,'stage3'),active,{recursive:true});
  normalize(active);
  const pointerPath=path.join(active,pointer);
  fs.writeFileSync(pointerPath,'{"syntheticPointerOnly":true}\n',{mode:0o600});
  fs.chmodSync(pointerPath,0o600);
  const pointerHash=sha(fs.readFileSync(pointerPath));
  fs.writeFileSync(path.join(active,'server/bin/finish-stage3-install.php'),
    '<?php // inert historical installer fixture\n',{mode:0o644});
  const before=inventory(active),backup=path.join(tmp,'old-fox.zip');
  zipCode(active,backup);
  const names=call('unzip',['-Z1',candidate]).stdout.trim().split('\n');
  const wrap=names.find(n=>/^fox-update-[a-f0-9]{40}\/$/.test(n));
  assert.ok(wrap);
  const commit=wrap.slice('fox-update-'.length,-1);
  const candHash=sha(fs.readFileSync(candidate)),oldHash=sha(fs.readFileSync(backup));
  const manifest=validateCandidate(candidate,{commit,'zip-sha256':candHash}).manifest;
  const pins=['--expect-commit='+commit,'--expect-fingerprint='+manifest.fingerprint,
    '--expect-zip-sha256='+candHash,'--expect-installed-zip-sha256='+oldHash];
  const report=JSON.parse(call(process.execPath,[gate,backup,candidate,...pins]).stdout);
  assert.equal(report.readyForHostSwitch,false);
  assert.equal(report.installed.fingerprint,fingerprint);
  assert.equal(report.delta.unchanged,79);
  assert.deepEqual(report.delta.modified,[
    'server/Api.php','server/EngineReleaseVerifier.php','server/bootstrap.php','studio/index.html'
  ]);
  assert.deepEqual(report.delta.added,[
    'server/CelikomSource.php','studio/celikom-original-studio.css',
    'studio/celikom-original-studio.js'
  ]);
  assert.deepEqual(report.delta.removed,[]);
  assert.deepEqual(report.installed.installedOnly,[
    'server/bin/finish-stage3-install.php',pointer
  ]);
  assert.equal(report.independentDatabaseRestoreOrNewExplicitOwnerDecisionRequired,true);
  // The old UI-only preflight must remain fail-closed for this new release.
  assert.match(call(process.execPath,[legacyGate,backup,candidate],repo,1).stderr,
    /outside the reviewed six-file Studio delta/);
  assert.match(call(process.execPath,[gate,backup,candidate],repo,1).stderr,
    /expected two absolute ZIPs and four mandatory/);
  assert.match(call(process.execPath,[gate,backup,candidate,...pins.slice(0,3),
    '--expect-installed-zip-sha256='+('a'.repeat(64))],repo,1).stderr,
    /installed ZIP SHA-256/);
  // Even if the altered installed snapshot has a newly recomputed ZIP checksum,
  // the pinned 5c863f4 runtime inventory still refuses it.
  const runtimePath=path.join(active,'server/RuntimeConfig.php');
  fs.appendFileSync(runtimePath,'\n// altered code\n');
  const drift=path.join(tmp,'old-fox-drift.zip');
  zipCode(active,drift);
  const driftPins=[...pins.slice(0,3),
    '--expect-installed-zip-sha256='+sha(fs.readFileSync(drift))];
  assert.match(call(process.execPath,[gate,drift,candidate,...driftPins],repo,1).stderr,
    /not the pinned 5c863f4/);
  fs.copyFileSync(path.join(packaged,'stage3/server/RuntimeConfig.php'),runtimePath);
  fs.chmodSync(runtimePath,0o644);
  assert.deepEqual(inventory(active),before);

  // Use the exact packaged new ZIP, not a local rebuild, in the switch lab.
  const unpack=path.join(tmp,'unpacked');
  fs.mkdirSync(unpack);
  call('unzip',['-q',candidate,'-d',unpack]);
  const staged=path.join(tmp,'new-staged');
  fs.cpSync(path.join(unpack,wrap,'stage3'),staged,{recursive:true});
  assert.equal(fs.existsSync(path.join(staged,pointer)),false,
    'candidate must not contain installation-local private pointer');
  assert.deepEqual(inventory(active),before,'missing-pointer refusal leaves live fixture untouched');
  fs.copyFileSync(pointerPath,path.join(staged,pointer));
  fs.chmodSync(path.join(staged,pointer),0o600);
  verifyInstalled(staged,manifest,pointerHash);
  const retained=path.join(tmp,'retained-old');
  fs.renameSync(active,retained);
  fs.renameSync(staged,active);
  verifyInstalled(active,manifest,pointerHash);
  assert.deepEqual(inventory(retained),before);
  assert.equal(fs.existsSync(path.join(active,'server/bin/finish-stage3-install.php')),false);
  const discarded=path.join(tmp,'retained-new');
  fs.renameSync(active,discarded);
  fs.renameSync(retained,active);
  assert.deepEqual(inventory(active),before,'rollback restores all original bytes and modes');
  verifyInstalled(discarded,manifest,pointerHash);
  process.stdout.write(JSON.stringify({
    action:'fox-celikom-exact-seven-file-rehearsal',valid:true,
    candidateCommit:commit,baselineCommit:baselineSha,
    oldRuntimeFiles:83,newRuntimeFiles:86,unchanged:79,
    oldGateRefused:true,oldSourceTamperRejected:true,
    pointerRestoredExact:true,rollbackExact:true,
    databaseTouched:false,hostTouched:false,independentSqlRestoreVerified:false,
    ownerSwitchApproved:false,deployed:false
  },null,2)+'\n');
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
