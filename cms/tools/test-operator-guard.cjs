'use strict';
// Stage2 operator anti-replay and crash-boundary laboratory test; ephemeral keys/data only.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {STAGE,verify}=require('./build-internal-package.cjs');
const {LabRollout}=require('./lab-versioned-rollout.cjs');
const {LabOperatorGuard}=require('./lab-operator-guard.cjs');
const {buildSignedLabBundle,stageSignedLabBundle}=require('./lab-signed-offline-release.cjs');
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const foreign=crypto.generateKeyPairSync('ed25519');
let checks=0;
function ok(value,msg){assert.ok(value,msg);checks++}
function denied(fn,re,msg){assert.throws(fn,re,msg);checks++}
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-guard-fixtures-'));
const lab=new LabRollout();
const versions=['0.2.0-stage2.0','0.2.0-stage2.1','0.2.0-stage2.2'];
const bundles=new Map();
function fixture(v){
  const source=path.join(root,'src-'+v),out=path.join(root,'signed-'+v);
  fs.cpSync(STAGE,source,{recursive:true});
  const manifestFile=path.join(source,'private/package-manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  const sbomPath=path.join(source,'private/compliance/sbom.cdx.json');
  const sbom=JSON.parse(fs.readFileSync(sbomPath,'utf8'));
  manifest.releaseVersion=v;sbom.metadata.component.version=v;
  fs.writeFileSync(sbomPath,JSON.stringify(sbom,null,2)+'\n');
  const buf=fs.readFileSync(sbomPath);
  const entry=manifest.files.find(x=>x.path==='private/compliance/sbom.cdx.json');
  entry.bytes=buf.length;entry.sha256=crypto.createHash('sha256').update(buf).digest('hex');
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
  ok(verify(source).releaseVersion===v,'Consistent test-only synthetic release '+v);
  fs.mkdirSync(out);
  buildSignedLabBundle(source,out,privateKey,publicKey);
  bundles.set(v,out);
}
function stage(v){
  return stageSignedLabBundle({folder:bundles.get(v),trustedPublicKey:publicKey,expectedVersion:v,lab});
}
function action(guard,kind,version,failAt){
  const current=guard.inspect();
  return guard.execute({kind,version,expectedCurrent:current.current,
    expectedSequence:current.sequence,envelopeFolder:kind==='upgrade'?bundles.get(version):null,failAt});
}
function revive(){return new LabOperatorGuard(lab,publicKey);}
try{
  versions.forEach(fixture);
  const guard=revive();
  ok(guard.inspect().status==='clean','Fresh guard initialized with anchored public key');
  denied(()=>new LabOperatorGuard(lab,foreign.publicKey),/Trust anchor/,'Different signer cannot rebind trust');
  ok(stage(versions[0])===versions[0],'Stage signed foundation release');
  ok(action(guard,'upgrade',versions[0]).current===versions[0],'Initial signed activation commits policy');
  ok(guard.inspect().sequence===1&&guard.inspect().highest===versions[0],'High watermark established atomically after pointer');
  ok(guard.policy().receipts[versions[0]].length===64,'Trusted manifest receipt persisted');
  denied(()=>action(guard,'upgrade',versions[0]),/Replay\/downgrade/,'Cannot replay same signed release');
  denied(()=>guard.execute({kind:'upgrade',version:versions[1],expectedCurrent:versions[0],
    expectedSequence:0,envelopeFolder:bundles.get(versions[1])}),/Stale/,'ABA/old generation rejected');
  ok(stage(versions[1])===versions[1],'Second trusted package staged');
  denied(()=>action(guard,'upgrade',versions[1],'after-intent'),/AFTER durable operator intent/,
    'Crash injected after durable journal, before pointer');
  ok(guard.inspect().status==='pending-before-switch','Crash before pointer reports pending state');
  denied(()=>action(guard,'upgrade',versions[1]),/Unresolved operator intent/,'No concurrent activation while intent pending');
  denied(()=>guard.recover({mode:'finalize'}),/explicitly abort/,'Before-pointer recovery cannot falsely finalize');
  const reboot1=revive();
  ok(reboot1.inspect().status==='pending-before-switch','Fresh operator object detects journal after simulated reboot');
  ok(reboot1.recover({mode:'abort'}).status==='clean','Explicit abort preserves old active release');
  ok(reboot1.inspect().current===versions[0]&&reboot1.inspect().highest===versions[0],
    'Aborted upgrade does not burn version watermark');
  denied(()=>action(reboot1,'upgrade',versions[1],'after-pointer'),/AFTER activation/,
    'Crash injected after atomic release pointer');
  ok(reboot1.inspect().status==='pending-after-switch','Crash after pointer distinguished from before-pointer');
  denied(()=>reboot1.recover({mode:'abort'}),/explicitly finalize/,'Cannot silently discard committed pointer');
  const reboot2=revive();
  ok(reboot2.recover({mode:'finalize'}).status==='clean','Restarted guard verifies and finalizes new release');
  ok(reboot2.inspect().current===versions[1]&&reboot2.inspect().highest===versions[1],
    'Post-crash recovery advances durable watermark');
  denied(()=>action(reboot2,'upgrade',versions[0]),/Replay\/downgrade/,'Downgrade blocked even when signed');
  ok(action(reboot2,'rollback',versions[0]).current===versions[0],
    'Explicit recorded rollback to verified previously trusted package');
  ok(reboot2.inspect().highest===versions[1],'Rollback preserves highest-ever version');
  denied(()=>action(reboot2,'upgrade',versions[1]),/Replay\/downgrade/,
    'Previously installed release cannot be reapplied after rollback');
  denied(()=>action(reboot2,'rollback',versions[1]),/immediate previous/,
    'Cannot jump arbitrarily using rollback');
  ok(stage(versions[2])===versions[2],'Strictly newer release staged');
  ok(action(reboot2,'upgrade',versions[2]).current===versions[2],
    'Newer signed release accepted after rollback');
  ok(reboot2.inspect().highest===versions[2],'High watermark advanced to latest release');
  // Simulate crash after policy commit but before intent deletion: reconstruct
  // the completed intent exactly; recovery should only clean verified residue.
  const p=reboot2.policy(),intentFile=path.join(lab.root,'operator-intent.json');
  fs.writeFileSync(intentFile,JSON.stringify({format:'ai-site-cms-operator-guard-lab-v1',
    kind:'upgrade',from:versions[0],to:versions[2],fromSequence:p.sequence-1,
    newHighest:versions[2],envelopeSha256:'0'.repeat(64),receipt:p.receipts[versions[2]]})+'\n');
  ok(revive().inspect().status==='committed-needs-cleanup','Detect committed policy with leftover intent');
  ok(revive().recover({mode:'finalize'}).status==='clean','Cleanup after policy commit does not reapply update');
  const actual=p.sequence;
  ok(revive().inspect().sequence===actual,'Recovery cleanup did not increment activation sequence');
  // Damage rollback target without changing original signed receipt.
  const oldFile=path.join(lab.slot(versions[0]),'private/editor/meta.json');
  const pristine=fs.readFileSync(oldFile);fs.appendFileSync(oldFile,'tampered');
  denied(()=>action(reboot2,'rollback',versions[0]),/immediate previous|mismatch/,
    'No rollback to tampered or unrecorded release');
  fs.writeFileSync(oldFile,pristine);
  // Tamper operator policy; fail closed, don't reset trust or watermark.
  const policyFile=path.join(lab.root,'operator-policy.json'),savePolicy=fs.readFileSync(policyFile);
  fs.writeFileSync(policyFile,JSON.stringify({...p,highest:versions[0]})+'\n');
  denied(()=>revive(),/watermark\/state|Active version lacks/,'Corrupt version floor rejected');
  fs.writeFileSync(policyFile,savePolicy);
  const tmp=path.join(lab.root,'operator-policy.json.new');
  fs.writeFileSync(tmp,'unresolved');
  denied(()=>revive(),/Unresolved policy write/,'Interrupted operator state update refuses automatic continuation');
  fs.unlinkSync(tmp);
  const activeFile=lab.pointerPath(),active=fs.readFileSync(activeFile);
  fs.writeFileSync(activeFile,JSON.stringify({current:versions[0],previous:versions[2],sequence:actual+1})+'\n');
  denied(()=>revive(),/pointer mismatch/,'Out-of-band active pointer change detected');
  fs.writeFileSync(activeFile,active);
  ok(revive().inspect().status==='clean','Operator state still consistent after fixture restoration');
  ok(!fs.existsSync(path.join(STAGE,'operator-policy.json')),'All state stays in disposable temp root');
  console.log('Stage2 operator anti-replay + interrupted cutover recovery PASS: '+checks+
    ' checks; offline trusted code only, no production host/database');
}finally{lab.dispose();fs.rmSync(root,{recursive:true,force:true})}
