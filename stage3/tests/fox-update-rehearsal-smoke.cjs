#!/usr/bin/env node
'use strict';
/**
 * Disposable filesystem-only FOX switch/rollback laboratory. Never invoke on
 * a live site: accepts only a READ-ONLY candidate ZIP, constructs a fictional
 * installed runtime with an opaque fixture pointer, then destroys the lab.
 * No network, SQL, real private config, hPanel or public_html operations.
 *
 * Usage: node stage3/tests/fox-update-rehearsal-smoke.cjs [ABS_FOX_INNER_ZIP]
 */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const repo=path.resolve(__dirname,'../..');
const packer=path.join(repo,'stage3/bin/cms-release.cjs');
const preflight=path.join(repo,'stage3/bin/fox-update-preflight.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fox-update-rehearsal-'));
const allowed=['studio/access.js','studio/bundle.js','studio/hosted.css',
  'studio/hosted.js','studio/index.html','studio/studio.css'];
const runtimeRoots=['components','media-motion','server','studio'];
const pointer='server/private-config-path.json';
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');

function command(bin,args,cwd=repo){
  const result=spawnSync(bin,args,{cwd,encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});
  if(result.error||result.status!==0)
    throw Error('FOX isolated rehearsal command failed: '+bin+' '+(result.error?.message||result.stderr||result.status));
  return result.stdout;
}
function walk(directory,relative=''){
  const found=[];
  for(const node of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const name=relative?relative+'/'+node.name:node.name,full=path.join(directory,node.name);
    if(node.isSymbolicLink()||(!node.isFile()&&!node.isDirectory()))throw Error('unsafe lab fixture');
    if(node.isDirectory())found.push(...walk(full,name));
    else found.push({name,size:fs.statSync(full).size,mode:fs.statSync(full).mode&0o777,
      hash:sha(fs.readFileSync(full))});
  }
  return found;
}
function ensurePublishedCode(tree,manifest){
  for(const entry of manifest.files){
    const file=path.join(tree,entry.path.slice('stage3/'.length));
    assert.ok(fs.statSync(file).isFile());
    assert.equal(sha(fs.readFileSync(file)),entry.sha256,'candidate file mismatch: '+entry.path);
  }
  assert.equal(fs.statSync(path.join(tree,pointer)).mode&0o777,0o600,
    'preserved pointer remains private');
}
function normalize(folder){
  fs.chmodSync(folder,0o755);
  for(const node of fs.readdirSync(folder,{withFileTypes:true})){
    const full=path.join(folder,node.name);
    if(node.isDirectory())normalize(full);
    else if(node.isFile())fs.chmodSync(full,0o644);
    else throw Error('unexpected source fixture');
  }
}
function zipTree(dir,out){command('zip',['-q','-r',out,...runtimeRoots],dir);}

try{
  if(process.argv.length>3)throw Error('usage: fox-update-rehearsal-smoke.cjs [ABS_FOX_INNER_ZIP]');
  let candidate=process.argv[2];
  if(candidate){
    if(!path.isAbsolute(candidate)||!fs.lstatSync(candidate).isFile()
      ||fs.lstatSync(candidate).isSymbolicLink())throw Error('expected a regular absolute candidate ZIP');
  }else{
    // Self-contained local run; CI passes its actual final artifact instead.
    const source=path.join(tmp,'built-source');
    command(process.execPath,[packer,'pack-php-host',repo,source]);
    const wrap=path.join(tmp,'fox-update-'+('a'.repeat(40)));
    fs.renameSync(source,wrap);
    normalize(wrap);
    candidate=path.join(tmp,'generated-fox-code-only.zip');
    command('zip',['-q','-r',candidate,path.basename(wrap)],tmp);
  }

  // Audit ZIP filenames and entry modes *before* extracting to the laboratory.
  const entries=command('unzip',['-Z1',candidate]).trim().split('\n');
  const rootNames=entries.filter(name=>/^fox-update-[a-f0-9]{40}\/$/.test(name));
  assert.equal(rootNames.length,1,'exactly one commit-named ZIP root is required');
  const wrapper=rootNames[0];
  assert.ok(entries.every(name=>name.startsWith(wrapper)&&
    /^[a-zA-Z0-9_.\/-]+$/.test(name)&&
    !name.split('/').some(bit=>bit==='.'||bit==='..')),'no unsafe ZIP entry paths');
  const archiveModes=command('zipinfo',['-l',candidate]).split('\n');
  for(const line of archiveModes){
    const mode=line.slice(0,10),name=line.trim().split(/\s+/).at(-1);
    if(!entries.includes(name))continue;
    assert.equal(mode,name.endsWith('/')?'drwxr-xr-x':'-rw-r--r--',
      'archive may not contain symlinks or private/inaccessible runtime modes');
  }
  const extracted=path.join(tmp,'unpacked');
  fs.mkdirSync(extracted);
  command('unzip',['-q',candidate,'-d',extracted]);
  const releaseRoot=path.join(extracted,wrapper);
  command(process.execPath,[packer,'verify-fox-code-only',releaseRoot]);
  assert.deepEqual(fs.readdirSync(releaseRoot).sort(),['cms-release.json','stage3']);
  const manifest=JSON.parse(fs.readFileSync(path.join(releaseRoot,'cms-release.json'),'utf8'));
  const code=path.join(releaseRoot,'stage3');
  const oldActive=path.join(tmp,'active-stage3');
  fs.cpSync(code,oldActive,{recursive:true});
  const fixturePointer=path.join(oldActive,pointer);
  fs.writeFileSync(fixturePointer,'{"opaqueFixtureOnly":true}\n',{mode:0o600});
  fs.chmodSync(fixturePointer,0o600);
  fs.writeFileSync(path.join(oldActive,'server/bin/finish-stage3-install.php'),
    '<?php // inert lab-only legacy file; never executed\n');
  for(const name of allowed)fs.appendFileSync(path.join(oldActive,name),'\n/* synthetic older code */\n');
  const originalInventory=walk(oldActive);
  const backup=path.join(tmp,'synthetic-installed-backup.zip');
  zipTree(oldActive,backup);

  const commit=wrapper.slice('fox-update-'.length,-1);
  const report=JSON.parse(command(process.execPath,[preflight,backup,candidate,
    `--expect-commit=${commit}`,`--expect-fingerprint=${manifest.fingerprint}`,
    `--expect-zip-sha256=${sha(fs.readFileSync(candidate))}`]));
  assert.deepEqual(report.delta.modified,allowed);
  assert.deepEqual(report.delta.installedOnly,['server/bin/finish-stage3-install.php',pointer]);
  assert.equal(report.delta.added.length,0);
  assert.equal(report.delta.unchanged,manifest.files.length-allowed.length);

  // A missing local-only pointer is a hard pre-switch stop; old runtime stays
  // byte-identical and no rename occurs in this failure branch.
  const incomplete=path.join(tmp,'missing-config-staging');
  fs.cpSync(code,incomplete,{recursive:true});
  assert.equal(fs.existsSync(path.join(incomplete,pointer)),false);
  const switchAllowed=tree=>fs.existsSync(path.join(tree,pointer))&&
    (fs.statSync(path.join(tree,pointer)).mode&0o777)===0o600;
  assert.equal(switchAllowed(incomplete),false);
  assert.deepEqual(walk(oldActive),originalInventory,'pre-switch refusal cannot mutate active code');

  // Only synthetic fixture state is copied here; NEVER point this rehearsal
  // at a real installed folder or a real private JSON/configuration pointer.
  const staging=path.join(tmp,'complete-staging');
  fs.cpSync(code,staging,{recursive:true});
  fs.copyFileSync(fixturePointer,path.join(staging,pointer));
  fs.chmodSync(path.join(staging,pointer),0o600);
  assert.equal(switchAllowed(staging),true);
  ensurePublishedCode(staging,manifest);
  const installedRetained=path.join(tmp,'unmodified-installed-rollback');
  fs.renameSync(oldActive,installedRetained);
  fs.renameSync(staging,oldActive);
  ensurePublishedCode(oldActive,manifest);
  assert.equal(fs.existsSync(path.join(oldActive,'server/bin/finish-stage3-install.php')),false,
    'legacy installer must not be transferred into current runtime');
  assert.deepEqual(walk(installedRetained),originalInventory,
    'original installed runtime remains byte-for-byte available during candidate test');

  // Exact reverse rename rehearses *code only*. No database backup/restore or
  // owner-approved Hostinger cutover is implied by this local exercise.
  const retainedCandidate=path.join(tmp,'retained-failed-candidate');
  fs.renameSync(oldActive,retainedCandidate);
  fs.renameSync(installedRetained,oldActive);
  assert.deepEqual(walk(oldActive),originalInventory,'rollback restores every old file and its mode');
  ensurePublishedCode(retainedCandidate,manifest);
  process.stdout.write(JSON.stringify({action:'fox-update-rehearsal-smoke',valid:true,
    candidateRuntimeFiles:manifest.files.length,reviewedStudioChanges:report.delta.modified.length,
    originalInstalledFiles:originalInventory.length,legacyInstallerNotTransferred:true,
    localPointerModePreserved:true,pinnedCandidateChecked:true,
    missingPointerRefusesSwitch:true,originalCodeRestoredExactly:true,
    liveSiteTouched:false,databaseTouched:false,hostDeployment:false})+'\n');
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
