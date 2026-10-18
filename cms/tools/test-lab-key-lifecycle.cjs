'use strict';
// Adversarial CI-only trust-root lifecycle. The external epoch checkpoint is
// essential: a mutable local history cannot prove it was not rolled back.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {LabKeyLifecycle,signRotation,fingerprint}=require('./lab-key-lifecycle.cjs');
const {STAGE,verify}=require('./build-internal-package.cjs');
const {buildSignedLabBundle}=require('./lab-signed-offline-release.cjs');
if(process.env.CI!=='true'||process.env.CMS_ALLOW_EPHEMERAL_SIGNING_LAB!=='1')
  throw Error('Explicit ephemeral signing CI only');
const keyA=crypto.generateKeyPairSync('ed25519');
const keyB=crypto.generateKeyPairSync('ed25519');
const keyC=crypto.generateKeyPairSync('ed25519');
const evil=crypto.generateKeyPairSync('ed25519');
const fpA=fingerprint(keyA.publicKey),fpB=fingerprint(keyB.publicKey),fpC=fingerprint(keyC.publicKey);
const version='0.2.0-stage2.1',newVersion='0.2.0-stage2.2';
const phpTrust=path.join(__dirname,'../bin/verify-lab-trust.php');

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-trust-test-'));
let assertions=0,lab;
let rootPem,signerBPem,signerCPem;
function phpCheck({mode='--inspect',minimum=0,signer=null,folder=null,version=null}={}){
  const args=[phpTrust,mode,'--chain='+lab.chainFile,'--root-pem='+rootPem,
    '--root-pin='+fpA,'--min-epoch='+minimum];
  if(mode==='--verify-release')
    args.push('--signer-pem='+signer,'--folder='+folder,'--version='+version);
  const result=spawnSync('php',args,{encoding:'utf8',timeout:30000,maxBuffer:8192});
  if(result.error)throw result.error;
  return result;
}
function phpPass(input,label,expectStatus=0){
  const r=phpCheck(input);
  ok(r.status===expectStatus,label+' PHP process returned '+expectStatus);
  ok(!r.stdout.includes(tmp)&&!r.stderr.includes(tmp),label+' hides local paths');
  return r.status===0?JSON.parse(r.stdout):null;
}

const ok=(condition,label)=>{assert.ok(condition,label);assertions++};
function denied(fn,label,contains){
  let caught;
  try{fn()}catch(e){caught=e}
  if(!caught)throw Error('Expected rejection: '+label);
  if(contains)assert.match(String(caught.message),contains,label);
  assertions++;
}
function clone(x){return JSON.parse(JSON.stringify(x))}
function proposal(from,to,epoch,floor,signOld=from.privateKey,signNew=to.privateKey){
  return signRotation({rootPublic:keyA.publicKey,oldPublic:from.publicKey,newPublic:to.publicKey,
    oldPrivate:signOld,newPrivate:signNew,epoch,floorVersion:floor});
}
function resume(minEpoch=0,root=keyA.publicKey,pin=fpA){
  return new LabKeyLifecycle(lab.root,root,pin,minEpoch);
}
function versionedSource(v){
  const dest=path.join(tmp,'source-'+v);
  fs.cpSync(STAGE,dest,{recursive:true});
  const manifestFile=path.join(dest,'private/package-manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  const sbomFile=path.join(dest,'private/compliance/sbom.cdx.json');
  const sbom=JSON.parse(fs.readFileSync(sbomFile,'utf8'));
  manifest.releaseVersion=v;sbom.metadata.component.version=v;
  fs.writeFileSync(sbomFile,JSON.stringify(sbom,null,2)+'\n');
  const data=fs.readFileSync(sbomFile),entry=manifest.files.find(x=>x.path==='private/compliance/sbom.cdx.json');
  entry.bytes=data.length;entry.sha256=crypto.createHash('sha256').update(data).digest('hex');
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
  ok(verify(dest).releaseVersion===v,'signed fixture manifest and SBOM consistent');
  return dest;
}
function makeBundle(source,name,keys){
  const folder=path.join(tmp,name);fs.mkdirSync(folder);
  buildSignedLabBundle(source,folder,keys.privateKey,keys.publicKey);
  return folder;
}
try{
  lab=LabKeyLifecycle.create(keyA.publicKey,fpA);
  rootPem=path.join(tmp,'out-of-band-root.pem');
  signerBPem=path.join(tmp,'out-of-band-b.pem');
  signerCPem=path.join(tmp,'out-of-band-c.pem');
  fs.writeFileSync(rootPem,keyA.publicKey.export({type:'spki',format:'pem'}));
  fs.writeFileSync(signerBPem,keyB.publicKey.export({type:'spki',format:'pem'}));
  fs.writeFileSync(signerCPem,keyC.publicKey.export({type:'spki',format:'pem'}));
  ok(phpPass().epoch===0,'PHP independently confirms initial Node trust epoch');

  ok(lab.inspect().status==='clean'&&lab.inspect().epoch===0,'explicit out-of-band initial anchor');
  denied(()=>lab.verifyRelease(tmp,version),'no implicit release floor',/floor/);
  denied(()=>LabKeyLifecycle.create(evil.publicKey,fpA),'unapproved first key',/pin/);
  denied(()=>resume(0,evil.publicKey,fpA),'root swapped on restart',/pin/);
  const rotateAB=proposal(keyA,keyB,0,version);
  const attempt=(event,failAt=null,expectedEpoch=0,expectedActiveKey=fpA)=>
    lab.rotate({event,expectedEpoch,expectedActiveKey,failAt});
  const forgedOld=proposal(keyA,keyB,0,version,evil.privateKey,keyB.privateKey);
  denied(()=>attempt(forgedOld),'forged old authorization',/BOTH/);
  const forgedNew=proposal(keyA,keyB,0,version,keyA.privateKey,evil.privateKey);
  denied(()=>attempt(forgedNew),'forged successor consent',/BOTH/);
  const fakeRoot=clone(rotateAB);fakeRoot.proposal.root=fpB;
  denied(()=>attempt(fakeRoot),'mismatched trust root',/root/);
  const fakeFp=clone(rotateAB);fakeFp.proposal.to=fpC;
  denied(()=>attempt(fakeFp),'substituted successor fingerprint',/key/);
  const fakeEpoch=clone(rotateAB);fakeEpoch.proposal.epochFrom=8;
  denied(()=>attempt(fakeEpoch),'skipped transition epoch',/sequence/);
  const fakeFloor=clone(rotateAB);fakeFloor.proposal.floorVersion='0.2.0-stage2.0';
  denied(()=>attempt(fakeFloor),'tampered signed floor',/BOTH/);
  const reuseRoot=proposal(keyA,keyA,0,version);
  denied(()=>attempt(reuseRoot),'same key cannot re-enroll',/Re-enrolled/);
  ok(lab.inspect().epoch===0,'all invalid transitions leave epoch unchanged');

  denied(()=>attempt(rotateAB,'after-intent'),'injected interruption before trust change',/Injected/);
  ok(lab.inspect().status==='pending-before-commit','journal survives intent crash');
  ok(phpPass().status==='pending-before-commit','PHP detects uncommitted Node journal');
  denied(()=>lab.verifyRelease(tmp,version),'no release while journal pending',/pending/);
  denied(()=>lab.recover('finalize'),'no fabricated commit on abortable journal',/Cannot finalize/);
  denied(()=>attempt(rotateAB),'no transition while recovery pending',/Pending rotation/);
  ok(resume().inspect().status==='pending-before-commit','pending journal recognized after simulated restart');
  ok(lab.recover('abort').status==='clean','explicit abort preserves old key');
  ok(lab.inspect().activeKey===fpA,'no key replaced after abort');

  denied(()=>attempt(rotateAB,'after-commit'),'injected interruption after trust commit',/Injected/);
  ok(lab.inspect().status==='committed-needs-cleanup','signed new key verified after commit crash');
  ok(phpPass({minimum:1}).status==='committed-needs-cleanup','PHP sees committed transition awaiting cleanup');
  denied(()=>lab.recover('abort'),'committed key cannot be rolled back through abort',/Cannot abort/);
  ok(resume(1).inspect().status==='committed-needs-cleanup','external epoch survives restart');
  ok(lab.recover('finalize').status==='clean','explicit finalize retains new key and epoch');
  ok(lab.inspect().epoch===1&&lab.inspect().activeKey===fpB,'B active after dual consent');
  denied(()=>attempt(rotateAB),'duplicate epoch refused',/Stale/);

  const sourceB=versionedSource(version),signedA=makeBundle(sourceB,'signed-old',keyA);
  const signedB=makeBundle(sourceB,'signed-current',keyB);
  ok(lab.verifyRelease(signedB,version).signer===fpB,'real Ed25519 B ZIP verified through current trust');
  const phpB=phpPass({mode:'--verify-release',minimum:1,signer:signerBPem,folder:signedB,version},
    'PHP verifies actual signed archive using B from entire rooted trust history');
  ok(phpB.signer===fpB&&phpB.epoch===1,'PHP current B signer and epoch match Node');
  phpPass({mode:'--verify-release',minimum:1,signer:signerBPem,folder:signedA,version},
    'PHP rejects archive made by retired signer A',3);

  denied(()=>lab.verifyRelease(signedA,version),'retired A signing key denied',/signature/);
  const lower=proposal(keyB,keyC,1,'0.2.0-stage2.0');
  denied(()=>lab.rotate({event:lower,expectedEpoch:1,expectedActiveKey:fpB}),
    'rotation cannot lower floor',/floor/);
  const rotateBC=proposal(keyB,keyC,1,newVersion);
  denied(()=>lab.rotate({event:rotateBC,expectedEpoch:0,expectedActiveKey:fpB}),
    'stale CAS epoch denied',/Stale/);
  denied(()=>lab.rotate({event:rotateBC,expectedEpoch:1,expectedActiveKey:fpA}),
    'stale signer pin denied',/Stale/);

  const chainPath=lab.chainFile,chainBefore=fs.readFileSync(chainPath);
  const corrupt=JSON.parse(chainBefore.toString());
  corrupt.events[0].oldSignature='0'.repeat(128);
  fs.writeFileSync(chainPath,JSON.stringify(corrupt)+'\n');
  denied(()=>resume(),'modified signature in chain fail closed',/BOTH/);
  phpPass({minimum:1},'PHP rejects modified signed history',3);
  fs.writeFileSync(chainPath,chainBefore);
  const forgedChain=JSON.parse(chainBefore.toString());
  forgedChain.events[0].proposal.newPublicDer=keyC.publicKey.export({type:'spki',format:'der'}).toString('base64');
  fs.writeFileSync(chainPath,JSON.stringify(forgedChain)+'\n');
  denied(()=>resume(),'injected unsigned key in history denied',/key|BOTH/);
  fs.writeFileSync(chainPath,chainBefore);
  const absent=path.join(tmp,'moved-trust.json');
  fs.renameSync(chainPath,absent);
  denied(()=>resume(),'missing trust chain must not be re-enrolled');
  fs.renameSync(absent,chainPath);
  fs.writeFileSync(chainPath+'.new','partial');
  denied(()=>resume(),'incomplete atomic trust write denies startup',/Interrupted/);
  fs.unlinkSync(chainPath+'.new');

  fs.mkdirSync(lab.lockDir);
  denied(()=>resume(),'stale concurrent lock refuses operation',/locked/);
  fs.rmdirSync(lab.lockDir);

  denied(()=>lab.rotate({event:rotateBC,expectedEpoch:1,expectedActiveKey:fpB,failAt:'after-intent'}),
    'second rotation journal interruption',/Injected/);
  ok(resume(1).inspect().status==='pending-before-commit','second pending intent recognized');
  ok(lab.recover('abort').status==='clean','second pending intent manually aborted');
  ok(lab.rotate({event:rotateBC,expectedEpoch:1,expectedActiveKey:fpB}).status==='clean',
    'valid double-signed B to C transition');
  ok(phpPass({minimum:2}).active_key_fingerprint===fpC,'PHP derives newly rotated C key and epoch');
  ok(lab.inspect().epoch===2&&lab.inspect().activeKey===fpC&&
     lab.inspect().floorVersion===newVersion,'monotonic epoch, signer and minimum version advanced');
  denied(()=>resume(3),'external checkpoint prevents unearned future epoch',/replay/);

  const sourceC=versionedSource(newVersion),signedC=makeBundle(sourceC,'signed-successor',keyC);
  ok(lab.verifyRelease(signedC,newVersion).signer===fpC,'new key C verifies new release');
  const phpC=phpPass({mode:'--verify-release',minimum:2,signer:signerCPem,folder:signedC,version:newVersion},
    'PHP independently verifies C-signed real ZIP and minimum floor');
  ok(phpC.signer===fpC&&phpC.epoch===2,'PHP signer and epoch updated after verified rotation');
  phpPass({mode:'--verify-release',minimum:2,signer:signerBPem,folder:signedB,version},
    'PHP prevents retired signer and below-floor package',3);

  denied(()=>lab.verifyRelease(signedB,version),'signed older release cannot cross floor',/downgrade/);
  denied(()=>lab.verifyRelease(signedA,version),'original retired signer stays denied',/downgrade/);
  const wrongC=makeBundle(sourceC,'signed-wrong-c',evil);
  denied(()=>lab.verifyRelease(wrongC,newVersion),'untrusted new signer denied',/signature/);

  const finalChain=fs.readFileSync(chainPath);
  fs.writeFileSync(chainPath,chainBefore);
  denied(()=>resume(2),'externally retained epoch rejects whole local-chain rollback',/replay/);
  phpPass({minimum:2},'PHP independently rejects truncated history below out-of-band epoch',3);
  fs.writeFileSync(chainPath,finalChain);
  ok(resume(2).verifyRelease(signedC,newVersion).epoch===2,
    'fresh operator with external epoch and original key validates entire signed chain');

  const cleanReport=lab.inspect();
  ok(!Object.hasOwn(cleanReport,'privateKey')&&!Object.hasOwn(cleanReport,'pem'),
    'no key material returned to caller');
  ok(!fs.existsSync(path.join(STAGE,'trust-chain.json')),'package source untouched by lab');
  console.log('Stage2 dual-signature rotation/retirement/crash/rollback laboratory PASS: '+
    assertions+' assertions; authenticated chain, mutable local state, NO production key custody');
} finally {
  if(lab&&path.dirname(lab.root)===fs.realpathSync(os.tmpdir())&&
     path.basename(lab.root).startsWith('ai-site-cms-trust-lab-'))fs.rmSync(lab.root,{recursive:true,force:true});
  if(path.dirname(tmp)===fs.realpathSync(os.tmpdir())&&
     path.basename(tmp).startsWith('ai-site-cms-trust-test-'))fs.rmSync(tmp,{recursive:true,force:true});
}
