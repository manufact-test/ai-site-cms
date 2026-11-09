#!/usr/bin/env node
'use strict';
/*
 * Read-only preflight for a previously installed FOX runtime and a separately
 * verified code-only candidate ZIP. It never touches a host, SQL database,
 * private configuration contents, or any installed file.
 *
 * Usage: node stage3/bin/fox-update-preflight.cjs INSTALLED_STAGE3_ZIP FOX_INNER_ZIP
 *   [--expect-commit=40_HEX] [--expect-fingerprint=64_HEX]
 *   [--expect-zip-sha256=64_HEX]
 */
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const refuse=reason=>{throw Error('FOX update preflight refused: '+reason);};
const pointer='server/private-config-path.json';
const installedOnlyAllowed=new Set([pointer,'server/bin/finish-stage3-install.php']);
// This is the *current* FOX Studio-only update contract. Future releases that
// legitimately change components, media helpers or the server need their own
// reviewed allowlist and gate; they must not silently inherit this approval.
const allowedStudioChanges=new Set([
  'studio/access.js','studio/bundle.js','studio/hosted.css',
  'studio/hosted.js','studio/index.html','studio/studio.css'
]);

function expectations(args){
  const expected={};
  for(const arg of args){
    const match=/^--expect-(commit|fingerprint|zip-sha256)=([a-f0-9]+)$/.exec(arg);
    if(!match||expected[match[1]]!==undefined
      ||!new RegExp('^[a-f0-9]{'+(match[1]==='commit'?40:64)+'}$').test(match[2]))
      refuse('invalid or repeated release expectation');
    expected[match[1]]=match[2];
  }
  return expected;
}

function command(program,args,maxBuffer=16*1024*1024){
  const result=spawnSync(program,args,{encoding:null,timeout:30000,maxBuffer});
  if(result.error||result.status!==0)refuse(program+' failed: '+(result.error?.message||result.stderr?.toString('utf8').trim()||result.status));
  return result.stdout;
}
function guardZip(file){
  const absolute=path.resolve(file||'');
  if(!path.isAbsolute(file||'')||!fs.existsSync(absolute)||fs.lstatSync(absolute).isSymbolicLink()
    ||!fs.lstatSync(absolute).isFile()||fs.statSync(absolute).size>64*1024*1024)
    refuse('expected existing local regular ZIP of at most 64 MiB');
  return absolute;
}
function inventory(file){
  const entries=command('unzip',['-Z1',file]).toString('utf8').trim().split('\n');
  const names=new Set();
  for(const name of entries){
    if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(segment=>segment==='.'||segment==='..')
      ||!/^[A-Za-z0-9_.\/-]+$/.test(name)||names.has(name))refuse('unsafe or duplicated ZIP entry');
    names.add(name);
  }
  return entries;
}
function modes(file,entries){
  const lines=command('zipinfo',['-l',file]).toString('utf8').split('\n');
  const found=new Map();
  const allowed=new Set(entries);
  for(const line of lines){
    const perm=line.slice(0,10),name=line.trim().split(/\s+/).at(-1);
    if(!allowed.has(name))continue;
    if(!/^[-dl][rwx-]{9}$/.test(perm)||found.has(name))refuse('unsafe ZIP entry mode');
    found.set(name,perm);
  }
  if(found.size!==entries.length)refuse('missing ZIP permission metadata');
  return found;
}
function readEntry(file,name){return command('unzip',['-p',file,name]);}
function validateCandidate(file,expected){
  const entries=inventory(file);
  const top=entries.find(name=>/^fox-update-[a-f0-9]{40}\/$/.test(name));
  if(!top||entries.filter(name=>/^fox-update-[a-f0-9]{40}\/$/.test(name)).length!==1)
    refuse('expected one commit-addressed FOX update wrapper');
  if(expected.commit&&top!==`fox-update-${expected.commit}/`)
    refuse('candidate ZIP wrapper does not match pinned commit');
  if(expected['zip-sha256']&&sha(fs.readFileSync(file))!==expected['zip-sha256'])
    refuse('candidate ZIP bytes do not match pinned SHA-256');
  if(entries.some(name=>!name.startsWith(top)))refuse('ZIP contains entries outside the FOX wrapper');
  const manifestName=top+'cms-release.json';
  if(!entries.includes(manifestName))refuse('missing candidate manifest');
  const manifestRaw=readEntry(file,manifestName);
  if(manifestRaw.length>400000)refuse('oversized release manifest');
  let manifest;
  try{manifest=JSON.parse(manifestRaw.toString('utf8'));}catch{refuse('invalid release manifest JSON');}
  if(manifest.format!=='manufact-cms-engine-release-v1'||manifest.profile!=='php-host'
    ||manifest.ownerApprovalRequired!==true||manifest.deployed!==false||manifest.dbMigrated!==false
    ||manifest.sourceTrusted!==false||!Array.isArray(manifest.files)||manifest.files.length>2000
    ||!Number.isSafeInteger(manifest.bytes)||!/^[a-f0-9]{64}$/.test(manifest.fingerprint))
    refuse('invalid release manifest contract');
  if(sha(Buffer.from(JSON.stringify(manifest.files)))!==manifest.fingerprint)
    refuse('candidate manifest fingerprint mismatch');
  if(expected.fingerprint&&manifest.fingerprint!==expected.fingerprint)
    refuse('candidate runtime fingerprint differs from pinned release');

  const expectedFiles=new Set([manifestName]);
  let total=0;
  for(const fileEntry of manifest.files){
    if(!fileEntry||typeof fileEntry.path!=='string'||!/^stage3\/(?:components|media-motion|server|studio)\//.test(fileEntry.path)
      ||!Number.isSafeInteger(fileEntry.size)||fileEntry.size<0
      ||!/^[a-f0-9]{64}$/.test(fileEntry.sha256)||expectedFiles.has(top+fileEntry.path))
      refuse('invalid runtime file inventory');
    const name=top+fileEntry.path;
    const bytes=readEntry(file,name);
    if(bytes.length!==fileEntry.size||sha(bytes)!==fileEntry.sha256)
      refuse('candidate file hash mismatch: '+fileEntry.path);
    expectedFiles.add(name);
    total+=bytes.length;
  }
  if(total!==manifest.bytes)refuse('candidate total size mismatch');
  const actualFiles=entries.filter(name=>!name.endsWith('/'));
  if(actualFiles.length!==expectedFiles.size||actualFiles.some(name=>!expectedFiles.has(name)))
    refuse('unexpected file in candidate ZIP');
  const permissions=modes(file,entries);
  for(const [name,mode] of permissions){
    if(mode!==(name.endsWith('/')?'drwxr-xr-x':'-rw-r--r--'))
      refuse('manual Hostinger ZIP has non-traversable/unreadable mode: '+name);
  }
  if(entries.some(name=>name.includes('/public_html/')||name.endsWith('/public_html/')
    ||name.includes('/.stage3-private/')||name.endsWith('/'+pointer)))
    refuse('candidate includes installed/private or public-root state');
  return {manifest,top,entries};
}
function compareInstalled(backup,candidate){
  const entries=inventory(backup),permissions=modes(backup,entries);
  if(!entries.includes(pointer))refuse('installed backup is missing its private config pointer');
  for(const [name,mode] of permissions){
    const safe=name.endsWith('/')?'drwxr-xr-x':
      name===pointer?'-rw-------':'-rw-r--r--';
    if(mode!==safe)refuse('installed backup contains an unsafe file type or mode: '+name);
  }
  const pointerMode=permissions.get(pointer);
  const oldFiles=entries.filter(name=>!name.endsWith('/'));
  const current=new Set(oldFiles),next=new Set(candidate.manifest.files.map(file=>file.path.slice('stage3/'.length)));
  const oldOnly=oldFiles.filter(name=>!next.has(name)).sort();
  if(oldOnly.some(name=>!installedOnlyAllowed.has(name)))
    refuse('candidate would remove unreviewed installed runtime files');
  const added=[...next].filter(name=>!current.has(name)).sort();
  const modified=[],unchanged=[];
  for(const name of [...next].filter(name=>current.has(name))){
    // Do not read pointer content: it is absent from the distributable candidate.
    const oldHash=sha(readEntry(backup,name));
    const nextFile=candidate.manifest.files.find(file=>file.path==='stage3/'+name);
    (oldHash===nextFile.sha256?unchanged:modified).push(name);
  }
  modified.sort();unchanged.sort();
  const unreviewed=[...modified,...added].filter(name=>!allowedStudioChanges.has(name));
  if(unreviewed.length)
    refuse('candidate changes files outside the reviewed six-file Studio delta: '+unreviewed.join(', '));
  return {oldFiles:oldFiles.length,added,modified,unchanged:unchanged.length,installedOnly:oldOnly,
    pointerMode,requiresPointerTransfer:true,requiresDatabaseBackupGate:true};
}

// Export strict read-only validators to the separately reviewed CELIKOM release gate.
// The legacy six-file command remains unchanged when invoked directly.
module.exports={sha,refuse,pointer,installedOnlyAllowed,guardZip,inventory,modes,readEntry,validateCandidate};

if(require.main===module)try{
  if(process.argv.length<4)refuse('usage: fox-update-preflight.cjs INSTALLED_STAGE3_ZIP FOX_INNER_ZIP [--expect-commit=SHA] [--expect-fingerprint=SHA] [--expect-zip-sha256=SHA]');
  const expected=expectations(process.argv.slice(4));
  const backup=guardZip(process.argv[2]),candidateZip=guardZip(process.argv[3]);
  const candidate=validateCandidate(candidateZip,expected);
  const comparison=compareInstalled(backup,candidate);
  console.log(JSON.stringify({
    action:'fox-code-update-preflight',valid:true,deployed:false,
    installedBackup:{file:path.basename(backup),files:comparison.oldFiles,pointerPresent:true,
      pointerMode:comparison.pointerMode},
    candidate:{file:path.basename(candidateZip),runtimeFiles:candidate.manifest.files.length,
      fingerprint:candidate.manifest.fingerprint,zipMode:'directories-0755/files-0644',
      pinnedCommitMatched:!!expected.commit,pinnedFingerprintMatched:!!expected.fingerprint,
      pinnedZipSha256Matched:!!expected['zip-sha256']},
    delta:{added:comparison.added,modified:comparison.modified,
      unchanged:comparison.unchanged,installedOnly:comparison.installedOnly},
    installationLocalPointerMustBePreserved:true,
    independentDatabaseBackupAndOwnerSwitchApprovalStillRequired:true
  },null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
