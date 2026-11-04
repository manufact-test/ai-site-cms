#!/usr/bin/env node
'use strict';
/*
 * Read-only preflight for a previously installed FOX runtime and a separately
 * verified code-only candidate ZIP. It never touches a host, SQL database,
 * private configuration contents, or any installed file.
 *
 * Usage: node stage3/bin/fox-update-preflight.cjs INSTALLED_STAGE3_ZIP FOX_INNER_ZIP
 */
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const refuse=reason=>{throw Error('FOX update preflight refused: '+reason);};
const pointer='server/private-config-path.json';
const installedOnlyAllowed=new Set([pointer,'server/bin/finish-stage3-install.php']);

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
function validateCandidate(file){
  const entries=inventory(file);
  const top=entries.find(name=>/^fox-update-[a-f0-9]{40}\/$/.test(name));
  if(!top||entries.filter(name=>/^fox-update-[a-f0-9]{40}\/$/.test(name)).length!==1)
    refuse('expected one commit-addressed FOX update wrapper');
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

  const expected=new Set([manifestName]);
  let total=0;
  for(const fileEntry of manifest.files){
    if(!fileEntry||typeof fileEntry.path!=='string'||!/^stage3\/(?:components|media-motion|server|studio)\//.test(fileEntry.path)
      ||!Number.isSafeInteger(fileEntry.size)||fileEntry.size<0
      ||!/^[a-f0-9]{64}$/.test(fileEntry.sha256)||expected.has(top+fileEntry.path))
      refuse('invalid runtime file inventory');
    const name=top+fileEntry.path;
    const bytes=readEntry(file,name);
    if(bytes.length!==fileEntry.size||sha(bytes)!==fileEntry.sha256)
      refuse('candidate file hash mismatch: '+fileEntry.path);
    expected.add(name);
    total+=bytes.length;
  }
  if(total!==manifest.bytes)refuse('candidate total size mismatch');
  const actualFiles=entries.filter(name=>!name.endsWith('/'));
  if(actualFiles.length!==expected.size||actualFiles.some(name=>!expected.has(name)))
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
  const pointerMode=permissions.get(pointer);
  if(pointerMode?.slice(4).match(/[rwx]/))refuse('installed private config pointer is group/world accessible');
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
  if([...modified,...added].some(name=>name.startsWith('server/')))
    refuse('candidate modifies PHP server code; explicit separate backend review is required');
  return {oldFiles:oldFiles.length,added,modified,unchanged:unchanged.length,installedOnly:oldOnly,
    pointerMode,requiresPointerTransfer:true,requiresDatabaseBackupGate:true};
}

try{
  if(process.argv.length!==4)refuse('usage: fox-update-preflight.cjs INSTALLED_STAGE3_ZIP FOX_INNER_ZIP');
  const backup=guardZip(process.argv[2]),candidateZip=guardZip(process.argv[3]);
  const candidate=validateCandidate(candidateZip);
  const comparison=compareInstalled(backup,candidate);
  console.log(JSON.stringify({
    action:'fox-code-update-preflight',valid:true,deployed:false,
    installedBackup:{file:path.basename(backup),files:comparison.oldFiles,pointerPresent:true,
      pointerMode:comparison.pointerMode},
    candidate:{file:path.basename(candidateZip),runtimeFiles:candidate.manifest.files.length,
      fingerprint:candidate.manifest.fingerprint,zipMode:'directories-0755/files-0644'},
    delta:{added:comparison.added,modified:comparison.modified,
      unchanged:comparison.unchanged,installedOnly:comparison.installedOnly},
    installationLocalPointerMustBePreserved:true,
    independentDatabaseBackupAndOwnerSwitchApprovalStillRequired:true
  },null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
