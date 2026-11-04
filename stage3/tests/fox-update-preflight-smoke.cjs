#!/usr/bin/env node
'use strict';
// Disposable ZIP fixtures. Never reads installed host credentials or touches a DB.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');

const repo=path.resolve(__dirname,'../..');
const builder=path.join(repo,'stage3/bin/cms-release.cjs');
const preflight=path.join(repo,'stage3/bin/fox-update-preflight.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fox-update-preflight-'));
const wrapper='fox-update-'+('a'.repeat(40));
const pointer='server/private-config-path.json';

function run(binary,args,cwd=repo,expected=0){
  const result=spawnSync(binary,args,{cwd,encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});
  if(result.error||result.status!==expected)throw Error('Unexpected command exit: '+binary+' '+args.join(' ')+
    '\n'+(result.error?.message||result.stderr||result.stdout));
  return result;
}
function zipTree(root,file,names){run('zip',['-q','-r',file,...names],root);}
function normalize(folder){
  fs.chmodSync(folder,0o755);
  for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
    const full=path.join(folder,entry.name);
    if(entry.isDirectory())normalize(full);
    else if(entry.isFile())fs.chmodSync(full,0o644);
    else throw Error('unexpected fixture file type');
  }
}
function check(backup,candidate,expected=0){
  return run(process.execPath,[preflight,backup,candidate],repo,expected);
}
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');

try{
  const source=path.join(tmp,'release');
  run(process.execPath,[builder,'pack-php-host',repo,source]);
  const candidateRoot=path.join(tmp,wrapper);
  fs.renameSync(source,candidateRoot);
  normalize(candidateRoot);
  const candidate=path.join(tmp,'code-only.zip');
  zipTree(tmp,candidate,[wrapper]);

  const installed=path.join(tmp,'installed');
  fs.cpSync(path.join(candidateRoot,'stage3'),installed,{recursive:true});
  const pointerPath=path.join(installed,pointer);
  fs.writeFileSync(pointerPath,'{"fixture":"opaque and never read"}\n',{mode:0o600});
  fs.chmodSync(pointerPath,0o600);
  fs.writeFileSync(path.join(installed,'server/bin/finish-stage3-install.php'),
    '<?php /* installed-only fixture, never executed */\n');
  const oldNames=['components','media-motion','server','studio'];
  const backup=path.join(tmp,'installed-backup.zip');
  zipTree(installed,backup,oldNames);

  const result=JSON.parse(check(backup,candidate).stdout);
  assert.equal(result.action,'fox-code-update-preflight');
  assert.equal(result.valid,true);
  assert.equal(result.deployed,false);
  assert.equal(result.installedBackup.pointerMode,'-rw-------');
  assert.equal(result.candidate.zipMode,'directories-0755/files-0644');
  assert.deepEqual(result.delta.added,[]);
  assert.deepEqual(result.delta.modified,[]);
  assert.equal(result.delta.unchanged,result.candidate.runtimeFiles);
  assert.deepEqual(result.delta.installedOnly,['server/bin/finish-stage3-install.php',pointer]);
  assert.equal(result.installationLocalPointerMustBePreserved,true);
  assert.equal(result.independentDatabaseBackupAndOwnerSwitchApprovalStillRequired,true);

  // A pinned invocation prevents a different green-looking ZIP/commit from
  // silently being substituted during a manual update review.
  const fingerprint=result.candidate.fingerprint;
  const pins=[`--expect-commit=${'a'.repeat(40)}`,
    `--expect-fingerprint=${fingerprint}`,`--expect-zip-sha256=${sha(fs.readFileSync(candidate))}`];
  const pinned=JSON.parse(run(process.execPath,[preflight,backup,candidate,...pins]).stdout);
  assert.equal(pinned.candidate.pinnedCommitMatched,true);
  assert.equal(pinned.candidate.pinnedFingerprintMatched,true);
  assert.equal(pinned.candidate.pinnedZipSha256Matched,true);
  assert.match(run(process.execPath,[preflight,backup,candidate,
    `--expect-commit=${'b'.repeat(40)}`],repo,1).stderr,/pinned commit/);
  assert.match(run(process.execPath,[preflight,backup,candidate,
    `--expect-fingerprint=${'b'.repeat(64)}`],repo,1).stderr,/pinned release/);
  assert.match(run(process.execPath,[preflight,backup,candidate,
    `--expect-zip-sha256=${'b'.repeat(64)}`],repo,1).stderr,/pinned SHA-256/);
  assert.match(run(process.execPath,[preflight,backup,candidate,pins[0],pins[0]],repo,1).stderr,
    /repeated release expectation/);

  // Reproduce the real FOX change set on a disposable installed tree: six
  // older Studio assets, with every server/component/media file unchanged.
  const six=['studio/access.js','studio/bundle.js','studio/hosted.css',
    'studio/hosted.js','studio/index.html','studio/studio.css'];
  for(const name of six)fs.appendFileSync(path.join(installed,name),'\n/* synthetic older Studio */\n');
  const sixBackup=path.join(tmp,'six-ui-file-delta.zip');
  zipTree(installed,sixBackup,oldNames);
  assert.deepEqual(JSON.parse(check(sixBackup,candidate).stdout).delta.modified,six);

  // Only this reviewed UI delta is permitted; even a hash-consistent release
  // must not silently touch a different component or an existing PHP file.
  const component=path.join(installed,'components/faq-accordion.json');
  fs.appendFileSync(component,'\n');
  const badComponent=path.join(tmp,'unreviewed-component.zip');
  zipTree(installed,badComponent,oldNames);
  assert.match(check(badComponent,candidate,1).stderr,/outside the reviewed six-file Studio delta/);
  fs.copyFileSync(path.join(candidateRoot,'stage3/components/faq-accordion.json'),component);
  const serverPhp=path.join(installed,'server/RuntimeConfig.php');
  fs.appendFileSync(serverPhp,'\n/* synthetic backend drift */\n');
  const changedServer=path.join(tmp,'unreviewed-backend.zip');
  zipTree(installed,changedServer,oldNames);
  assert.match(check(changedServer,candidate,1).stderr,/outside the reviewed six-file Studio delta/);
  fs.copyFileSync(path.join(candidateRoot,'stage3/server/RuntimeConfig.php'),serverPhp);

  // Installed runtime ZIP is not trusted to be safe merely because the
  // candidate has good 0755/0644 permissions.
  fs.chmodSync(pointerPath,0o644);
  const loosePointer=path.join(tmp,'loose-pointer.zip');
  zipTree(installed,loosePointer,oldNames);
  assert.match(check(loosePointer,candidate,1).stderr,/unsafe file type or mode/);
  fs.chmodSync(pointerPath,0o600);
  fs.chmodSync(path.join(installed,'server'),0o700);
  const blockedServer=path.join(tmp,'blocked-old-server.zip');
  zipTree(installed,blockedServer,oldNames);
  assert.match(check(blockedServer,candidate,1).stderr,/unsafe file type or mode/);
  fs.chmodSync(path.join(installed,'server'),0o755);

  // Reject a ZIP that File Manager cannot normally traverse.
  fs.chmodSync(candidateRoot,0o700);
  const badMode=path.join(tmp,'bad-mode.zip');
  zipTree(tmp,badMode,[wrapper]);
  assert.match(check(backup,badMode,1).stderr,/mode/);
  fs.chmodSync(candidateRoot,0o755);

  // Reject stale/tampered runtime bytes even when the manifest is unchanged.
  const sourcePhp=path.join(candidateRoot,'stage3/server/RuntimeConfig.php');
  fs.appendFileSync(sourcePhp,'\n/* tampered package */\n');
  const badRuntime=path.join(tmp,'bad-runtime.zip');
  zipTree(tmp,badRuntime,[wrapper]);
  assert.match(check(backup,badRuntime,1).stderr,/hash mismatch/);

  // Reject a purported installed snapshot lacking the installation pointer.
  fs.unlinkSync(pointerPath);
  const noPointer=path.join(tmp,'missing-pointer.zip');
  zipTree(installed,noPointer,oldNames);
  assert.match(check(noPointer,candidate,1).stderr,/missing its private config pointer/);

  // Reject silent loss of any other installed runtime file.
  fs.writeFileSync(pointerPath,'{"fixture":"opaque and never read"}\n',{mode:0o600});
  fs.chmodSync(pointerPath,0o600);
  fs.writeFileSync(path.join(installed,'server/unknown-install-state.php'),'<?php // fixture\n');
  const unknown=path.join(tmp,'unknown-old-state.zip');
  zipTree(installed,unknown,oldNames);
  assert.match(check(unknown,candidate,1).stderr,/unreviewed installed runtime files/);

  process.stdout.write(JSON.stringify({action:'fox-update-preflight-smoke',valid:true,
    installedPointerPreserved:true,hostPermissionsChecked:true,
    badModeRejected:true,tamperedRuntimeRejected:true,missingPointerRejected:true,
    extraInstalledStateRejected:true,releasePinsVerified:true,sixStudioDeltaChecked:true,
    unreviewedComponentAndPhpDeltaRejected:true,unsafeInstalledModesRejected:true,
    hostMutation:false})+'\n');
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
