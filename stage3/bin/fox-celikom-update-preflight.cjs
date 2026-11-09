#!/usr/bin/env node
'use strict';
/*
 * READ-ONLY review of one exact CELIKOM first-party PHP/Studio expansion.
 * Not a deployment command. Does not extract ZIPs, read the private pointer
 * contents, contact Hostinger or a DB, or grant an SQL backup waiver.
 *
 * Required:
 *   node stage3/bin/fox-celikom-update-preflight.cjs ABS_CURRENT_FOX_CODE_ZIP ABS_CANDIDATE_ZIP \
 *     --expect-commit=40hex --expect-fingerprint=64hex \
 *     --expect-zip-sha256=64hex --expect-installed-zip-sha256=64hex
 *
 * Only the existing six-file Studio gate is used for that legacy release.
 * This separate gate requires EXACTLY the reviewed 4 modifications + 3
 * additions and the 83-file 5c863f4 host baseline, not a broad allowlist.
 */
const fs=require('node:fs');
const path=require('node:path');
const {
  sha,refuse,pointer,guardZip,inventory,modes,readEntry,validateCandidate
}=require('./fox-update-preflight.cjs');
const BASELINE_COMMIT='5c863f476cc538112ff3252f18a4cdedb336e4b6';
const BASELINE_FINGERPRINT='ae6bfee2f7a0b1d01105475e86800b9713604576e7565b26598bb78726919662';
const MODIFIED=[
  'server/Api.php','server/EngineReleaseVerifier.php','server/bootstrap.php',
  'studio/index.html'
].sort();
const ADDED=[
  'server/CelikomSource.php','studio/celikom-original-studio.css',
  'studio/celikom-original-studio.js'
].sort();
const ALLOWED_INSTALLED_ONLY=new Set([pointer,'server/bin/finish-stage3-install.php']);

function parsePins(flags){
  const pins={};
  for(const flag of flags){
    const match=/^--expect-(commit|fingerprint|zip-sha256|installed-zip-sha256)=([a-f0-9]+)$/.exec(flag);
    if(!match||pins[match[1]])refuse('invalid or repeated required release pin');
    const length=match[1]==='commit'?40:64;
    if(match[2].length!==length)refuse('invalid required release pin length');
    pins[match[1]]=match[2];
  }
  for(const required of ['commit','fingerprint','zip-sha256','installed-zip-sha256']){
    if(!pins[required])refuse('missing mandatory '+required+' pin');
  }
  return pins;
}
function identical(actual,expected,label){
  if(JSON.stringify(actual)!==JSON.stringify(expected))
    refuse(label+' mismatches approved exact 7-file CELIKOM delta: '+
      'actual='+JSON.stringify(actual)+' expected='+JSON.stringify(expected));
}
function auditInstalled(file,pinnedZip){
  if(sha(fs.readFileSync(file))!==pinnedZip)
    refuse('installed ZIP SHA-256 differs from independently pinned private snapshot');
  const entries=inventory(file);
  const perms=modes(file,entries);
  if(!entries.includes(pointer)||perms.get(pointer)!=='-rw-------')
    refuse('private configuration pointer missing or not 0600');
  for(const [name,mode] of perms){
    if(mode!==(name.endsWith('/')?'drwxr-xr-x':
      name===pointer?'-rw-------':'-rw-r--r--'))
      refuse('unsafe existing FOX file/directory permissions: '+name);
  }
  const files=entries.filter(name=>!name.endsWith('/'));
  const runtime=files.filter(name=>!ALLOWED_INSTALLED_ONLY.has(name));
  if(runtime.length!==83)refuse('expected exactly 83 currently installed runtime files');
  for(const name of runtime){
    if(!/^(?:components|media-motion|server|studio)\/[A-Za-z0-9._/-]+$/.test(name))
      refuse('unrecognized installed runtime path: '+name);
  }
  const oldOnly=files.filter(name=>ALLOWED_INSTALLED_ONLY.has(name)).sort();
  if(!oldOnly.includes(pointer)||oldOnly.some(name=>!ALLOWED_INSTALLED_ONLY.has(name)))
    refuse('unexpected installed-only file');
  // No old pointer contents are ever read: only runtime bytes are inventoried.
  const full=runtime.map(name=>{
    const bytes=readEntry(file,name);
    return {path:'stage3/'+name,size:bytes.length,sha256:sha(bytes)};
  }).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const fingerprint=sha(Buffer.from(JSON.stringify(full)));
  if(fingerprint!==BASELINE_FINGERPRINT)
    refuse('installed FOX is not the pinned 5c863f4 83-file runtime');
  return {full,oldOnly,pointerMode:perms.get(pointer),fingerprint};
}
function main(){
  if(process.argv.length!==8)refuse('expected two absolute ZIPs and four mandatory --expect-* pins');
  const pins=parsePins(process.argv.slice(4));
  const backup=guardZip(process.argv[2]);
  const candidateFile=guardZip(process.argv[3]);
  const candidate=validateCandidate(candidateFile,{
    commit:pins.commit,fingerprint:pins.fingerprint,'zip-sha256':pins['zip-sha256']
  });
  if(candidate.manifest.files.length!==86)
    refuse('expected exactly 86 new candidate runtime files');
  const installed=auditInstalled(backup,pins['installed-zip-sha256']);
  const old=new Map(installed.full.map(x=>[x.path,x.sha256]));
  const next=new Set(candidate.manifest.files.map(x=>x.path));
  const removed=[...old.keys()].filter(name=>!next.has(name));
  identical(removed,[],'removed runtime paths');
  const modified=[],added=[];
  for(const f of candidate.manifest.files){
    const relative=f.path.slice('stage3/'.length);
    if(!old.has(f.path))added.push(relative);
    else if(old.get(f.path)!==f.sha256)modified.push(relative);
  }
  modified.sort();added.sort();
  identical(modified,MODIFIED,'modified paths');
  identical(added,ADDED,'added paths');
  const unchanged=candidate.manifest.files.length-modified.length-added.length;
  if(unchanged!==79)refuse('expected exactly 79 identical runtime files');
  console.log(JSON.stringify({
    action:'fox-celikom-seven-file-read-only-preflight',
    valid:true,readyForHostSwitch:false,deployed:false,
    installed:{baselineCommit:BASELINE_COMMIT,runtimeFiles:83,
      fingerprint:installed.fingerprint,zipSha256Matched:true,
      pointerPresent:true,pointerMode:installed.pointerMode,
      installedOnly:installed.oldOnly},
    candidate:{commit:pins.commit,files:86,fingerprint:candidate.manifest.fingerprint,
      zipSha256Matched:true,manifestVerified:true},
    delta:{modified,added,removed,unchanged},
    exactSevenFileReview:true,oldSixFileGateUnchanged:true,
    independentDatabaseRestoreOrNewExplicitOwnerDecisionRequired:true,
    exactRollbackRehearsalRequired:true,hostPermissionPreflightRequired:true,
    separateOwnerSwitchApprovalRequired:true
  },null,2));
}
try{main();}catch(error){console.error(error.message);process.exitCode=1;}
