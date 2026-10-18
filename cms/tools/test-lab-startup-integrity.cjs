'use strict';
// Stage2 laboratory startup gate tests. Ephemeral signed code bundles, no DB,
// no real HTTP startup, no site/client/hosting paths and no silent file repair.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {STAGE,verify}=require('./build-internal-package.cjs');
const {LabRollout}=require('./lab-versioned-rollout.cjs');
const {LabOperatorGuard}=require('./lab-operator-guard.cjs');
const {LabStartupGate}=require('./lab-startup-integrity-gate.cjs');
const {buildSignedLabBundle,stageSignedLabBundle}=require('./lab-signed-offline-release.cjs');
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const lab=new LabRollout();
const fixtureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-startup-lab-fixtures-'));
const old='0.2.0-stage2.0',now='0.2.0-stage2.1',future='0.2.0-stage2.2';
let count=0;
const ok=(truth,label)=>{assert.ok(truth,label);count++};
const denied=(fn,re,label)=>{assert.throws(fn,re,label);count++};
function bundle(version){
  const source=path.join(fixtureRoot,'source-'+version);
  const out=path.join(fixtureRoot,'bundle-'+version);
  fs.cpSync(STAGE,source,{recursive:true});
  const manifestFile=path.join(source,'private/package-manifest.json');
  const sbomFile=path.join(source,'private/compliance/sbom.cdx.json');
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  const sbom=JSON.parse(fs.readFileSync(sbomFile,'utf8'));
  manifest.releaseVersion=version;
  sbom.metadata.component.version=version;
  fs.writeFileSync(sbomFile,JSON.stringify(sbom,null,2)+'\n');
  const data=fs.readFileSync(sbomFile);
  const entry=manifest.files.find(f=>f.path==='private/compliance/sbom.cdx.json');
  entry.bytes=data.length;entry.sha256=crypto.createHash('sha256').update(data).digest('hex');
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
  ok(verify(source).releaseVersion===version,'Synthetic release version '+version+' fully self-consistent');
  fs.mkdirSync(out);
  buildSignedLabBundle(source,out,privateKey,publicKey);
  return out;
}
function modifyFile(filename,alter,inspect){
  const original=fs.readFileSync(filename);
  try{alter(filename);inspect()}
  finally{fs.writeFileSync(filename,original)}
}
function replaceNode(filename,alter,inspect){
  const backup=filename+'.safe-fixture-copy';
  fs.renameSync(filename,backup);
  try{alter(filename,backup);inspect()}
  finally{
    const node=fs.lstatSync(filename);
    if(node.isDirectory()&&!node.isSymbolicLink())fs.rmSync(filename,{recursive:true});
    else fs.unlinkSync(filename);
    fs.renameSync(backup,filename);
  }
}
function signedStage(folder,version){
  return stageSignedLabBundle({folder,trustedPublicKey:publicKey,expectedVersion:version,lab});
}
function upgrade(guard,folder,version,failAt=null){
  const at=guard.inspect();
  return guard.execute({kind:'upgrade',version,expectedCurrent:at.current,
    expectedSequence:at.sequence,envelopeFolder:folder,failAt});
}
function rollback(guard,version){
  const at=guard.inspect();
  return guard.execute({kind:'rollback',version,expectedCurrent:at.current,
    expectedSequence:at.sequence});
}
function blocked(gate,reason,label,candidate){
  const d=gate.check();
  ok(d.status==='blocked'&&d.reason===reason,label);
  if(arguments.length===4)ok(d.rollbackCandidate===candidate,label+' rollback candidate');
  denied(()=>gate.requireReady(),/startup refused/,'Readiness throws closed: '+label);
}
try{
  const guard=new LabOperatorGuard(lab,publicKey);
  const gate=new LabStartupGate(lab,guard);
  blocked(gate,'not-activated','No active code is not ready');
  const bOld=bundle(old),bNow=bundle(now),bFuture=bundle(future);
  ok(signedStage(bOld,old)===old,'Staged trusted original code');
  ok(upgrade(guard,bOld,old).current===old,'Activated original with signed receipt');
  let ready=gate.requireReady();
  ok(ready.status==='ready'&&ready.current===old&&ready.sequence===1,'Original release boot gate passes');
  ok(ready.releaseFilesVerified===true&&ready.manifestSha256===guard.policy().receipts[old],
    'All release file inventory bound to signed manifest receipt');
  ok(signedStage(bNow,now)===now,'Staged signed newer release');
  ok(upgrade(guard,bNow,now).current===now,'Activated newer with verified previous');
  ready=gate.requireReady();
  ok(ready.current===now&&ready.sequence===2,'New release startup verified');
  const slot=lab.slot(now);
  const pointerFile=lab.pointerPath(),policyFile=guard.policyFile;
  const stablePointer=fs.readFileSync(pointerFile),stablePolicy=fs.readFileSync(policyFile);
  const unchanged=label=>{
    ok(fs.readFileSync(pointerFile).equals(stablePointer)&&
      fs.readFileSync(policyFile).equals(stablePolicy),label+' does not mutate pointer/trust policy');
  };
  // Real executable file loss; predecessor exists with its original signed receipt.
  const entrypoint=path.join(slot,'public/index.php');
  fs.renameSync(entrypoint,entrypoint+'.fixture');
  try{
    blocked(gate,'active-release-corrupt','Missing public/index.php refuses startup',old);
    unchanged('Missing entrypoint');
    ok(!fs.existsSync(entrypoint),'Startup never recreates missing executable');
  }finally{fs.renameSync(entrypoint+'.fixture',entrypoint)}
  ok(gate.requireReady().current===now,'Restored executable recovers without altered state');
  const editor=path.join(slot,'private/editor/editor.js');
  modifyFile(editor,file=>fs.appendFileSync(file,'\n// tampered'),()=>{
    blocked(gate,'active-release-corrupt','Edited private editor bundle refused',old);
    unchanged('Tampered JS asset');
  });
  const composer=path.join(slot,'composer.lock');
  modifyFile(composer,file=>fs.writeFileSync(file,'{}'),()=>{
    blocked(gate,'active-release-corrupt','Truncated dependency lockfile refused',old);
  });
  const manifestFile=path.join(slot,'private/package-manifest.json');
  modifyFile(manifestFile,file=>fs.appendFileSync(file,'\n'),()=>{
    blocked(gate,'active-release-corrupt','Tampered manifest bytes cannot bypass signed receipt',old);
  });
  const extra=path.join(slot,'public/injected.php');
  fs.writeFileSync(extra,'<?php echo "injected";');
  try{blocked(gate,'active-release-corrupt','Unlisted executable payload denied',old)}
  finally{fs.unlinkSync(extra)}
  replaceNode(entrypoint,(file,saved)=>fs.symlinkSync(saved,file),()=>{
    blocked(gate,'active-release-corrupt','Symlinked executable path denied',old);
  });
  replaceNode(slot,(file,saved)=>fs.symlinkSync(saved,file,'dir'),()=>{
    blocked(gate,'active-release-corrupt','Symlinked active slot denied',old);
  });
  fs.renameSync(slot,slot+'.gone');
  try{blocked(gate,'active-release-corrupt','Entire active slot missing',old)}
  finally{fs.renameSync(slot+'.gone',slot)}
  // Fallback is advisory and checked against the OLD signed receipt too.
  const previousFile=path.join(lab.slot(old),'private/editor/meta.json');
  modifyFile(previousFile,file=>fs.appendFileSync(file,'altered'),()=>{
    fs.renameSync(entrypoint,entrypoint+'.fixture');
    try{
      blocked(gate,'active-release-corrupt','Both active and fallback damaged',null);
      denied(()=>rollback(guard,old),/mismatch/,'Operator cannot roll back to altered predecessor');
      unchanged('Rejected corrupt rollback');
    }finally{fs.renameSync(entrypoint+'.fixture',entrypoint)}
  });
  modifyFile(policyFile,file=>{
    const p=JSON.parse(fs.readFileSync(file,'utf8'));
    p.receipts[now]='0'.repeat(64);
    fs.writeFileSync(file,JSON.stringify(p)+'\n');
  },()=>blocked(gate,'active-release-corrupt','Receipt mismatch makes active slot untrusted',old));
  replaceNode(policyFile,(file)=>fs.symlinkSync('missing-policy-target',file),()=>{
    blocked(gate,'operator-state-invalid','Dangling operator policy symlink refuses startup');
  });
  fs.renameSync(policyFile,policyFile+'.missing');
  try{
    blocked(gate,'operator-state-invalid','Missing operator policy refuses startup');
    denied(()=>new LabOperatorGuard(lab,publicKey),/Cannot bootstrap trust/,
      'Missing policy is never silently reenrolled after activation');
    ok(!fs.existsSync(policyFile),'Readiness check does not regenerate missing policy');
  }finally{fs.renameSync(policyFile+'.missing',policyFile)}
  const state=fs.readFileSync(pointerFile);
  modifyFile(pointerFile,file=>fs.writeFileSync(file,'{'),()=>{
    blocked(gate,'operator-state-invalid','Malformed active pointer cannot be trusted');
  });
  ok(fs.readFileSync(pointerFile).equals(state),'Corrupt pointer fixture restored');
  const policyTemp=policyFile+'.new';
  fs.writeFileSync(policyTemp,'incomplete');
  try{blocked(gate,'incomplete-state-write','Interrupted policy write blocks startup')}
  finally{fs.unlinkSync(policyTemp)}
  const pointerTmp=pointerFile+'.tmp';
  fs.symlinkSync('dangling',pointerTmp);
  try{blocked(gate,'incomplete-state-write','Dangling activation temp blocks startup')}
  finally{fs.unlinkSync(pointerTmp)}
  const leftover=path.join(lab.releases(),'.staging-incomplete');
  fs.mkdirSync(leftover);
  try{blocked(gate,'incomplete-release-stage','Abandoned partial staged code blocks startup')}
  finally{fs.rmdirSync(leftover)}
  fs.mkdirSync(guard.lockDir);
  try{blocked(gate,'operator-lock-present','Unresolved operator lock blocks startup')}
  finally{fs.rmdirSync(guard.lockDir)}
  fs.mkdirSync(path.join(lab.root,'active-exclusive.lock'));
  try{blocked(gate,'operator-lock-present','Unresolved activation lock blocks startup')}
  finally{fs.rmdirSync(path.join(lab.root,'active-exclusive.lock'))}
  // Use same signed third release to exercise distinct journal crash boundaries.
  ok(signedStage(bFuture,future)===future,'Signed future version staged before interruption');
  denied(()=>upgrade(guard,bFuture,future,'after-intent'),/AFTER durable operator intent/,
    'Injected pre-pointer interruption preserved explicit operator journal');
  blocked(gate,'operator-recovery-required','Pending uncommitted upgrade prohibits startup');
  ok(guard.recover({mode:'abort'}).status==='clean','Operator explicitly aborts pre-switch intent');
  ok(gate.requireReady().current===now,'Old verified active version allowed after explicit abort');
  denied(()=>upgrade(guard,bFuture,future,'after-pointer'),/AFTER activation/,
    'Injected post-pointer interruption requires finalization');
  blocked(gate,'operator-recovery-required','Switched pointer with unresolved journal blocks startup');
  const restarted=new LabOperatorGuard(lab,publicKey);
  ok(restarted.recover({mode:'finalize'}).status==='clean','Manual post-switch journal finalization validates future');
  const futureGate=new LabStartupGate(lab,restarted);
  ok(futureGate.requireReady().current===future,'Restarted gate accepts fully verified future version');
  // Verify explicit rollback is recovery, never an automatic side effect of gate.
  const newEntrypoint=path.join(lab.slot(future),'public/index.php');
  fs.renameSync(newEntrypoint,newEntrypoint+'.fixture');
  try{
    blocked(futureGate,'active-release-corrupt','Startup blocks lost active PHP entrypoint',now);
    ok(lab.state().current===future,'No automatic rollback despite valid previous');
    const operatorState=restarted.inspect();
    ok(restarted.execute({kind:'rollback',version:now,expectedCurrent:operatorState.current,
      expectedSequence:operatorState.sequence}).current===now,
      'Explicit operator rollback uses independently verified original receipt');
    ok(futureGate.requireReady().current===now,'Fresh readiness proof after operator-approved rollback');
    ok(restarted.policy().highest===future,'Rollback retains anti-replay highest-watermark');
    denied(()=>upgrade(restarted,bFuture,future),/Replay\/downgrade/,
      'Cannot reactivate already consumed future release via ordinary upgrade');
  }finally{fs.renameSync(newEntrypoint+'.fixture',newEntrypoint)}
  ok(!fs.existsSync(path.join(STAGE,'active.json')),'No writes to distribution package');
  console.log('Stage2 read-only startup integrity and partial-loss recovery PASS: '+count+
    ' assertions; code-only disposable sandbox, no live startup, sites or databases');
}finally{lab.dispose();fs.rmSync(fixtureRoot,{recursive:true,force:true})}
