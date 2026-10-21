'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {createDossier,stable}=require('./stage2-license-dossier.cjs');
const review=require('./stage2-human-license-review.cjs');
const {keyDigest}=require('./stage2-evidence-bundle.cjs');
let checks=0;
const ok=(x,what)=>{assert.ok(x,what);checks++;};
const refuse=(fn,what)=>{assert.throws(fn,undefined,what);checks++;};
const copy=x=>JSON.parse(JSON.stringify(x));
function complete(w){
  const day=new Date().toISOString().slice(0,10);
  for(const r of w.rows){
    r.disposition='approved';
    r.upstreamLicenseChecked=true;r.noticeObligationsChecked=true;
    r.advisoriesChecked=true;r.distributionScopeChecked=true;
    r.evidenceUrls=['https://example.org/licenses','https://example.org/security'];
    r.reviewerReference='CI-SYNTHETIC-NOT-A-REAL-REVIEW';
    r.reviewedOn=day;
    r.notes='SYNTHETIC CI fixture; does not represent human license approval.';
  }
  return w;
}
const dossier=createDossier();
const worksheet=review.buildWorksheet(dossier);
ok(worksheet.rows.length===43&&worksheet.rows.every(r=>r.disposition==='pending'),
  'all 43 actual pinned components start pending');
const original=review.inspectWorksheet(dossier,worksheet);
ok(original.pending===43&&original.approved===0
  &&!original.readyForSeparateIndependentLegalDecision
  &&!original.independentLegalApproval,'unreviewed dependency register cannot be accepted');
ok(worksheet.rows.filter(r=>r.component.startsWith('composer:')).length===14,
  'actual PHP runtime dependency rows');
ok(worksheet.rows.filter(r=>r.component.startsWith('npm:')).length===29,
  'actual npm dependency rows');
refuse(()=>review.inspectWorksheet(dossier,{...worksheet,stage2Accepted:true}),
  'review cannot self-approve Stage2');
refuse(()=>review.inspectWorksheet(dossier,{...worksheet,independentLegalApproval:true}),
  'review cannot forge legal approval');
refuse(()=>review.inspectWorksheet(dossier,{...worksheet,rows:worksheet.rows.slice(1)}),
  'missing dependency cannot be hidden');
let modified=copy(worksheet);modified.rows.reverse();
refuse(()=>review.inspectWorksheet(dossier,modified),'reordering rows disallowed');
modified=copy(worksheet);modified.rows[0].component='composer:malicious@1';
refuse(()=>review.inspectWorksheet(dossier,modified),'substituted dependency refused');
modified=copy(worksheet);modified.rows[0].lockedComponentSha256='a'.repeat(64);
refuse(()=>review.inspectWorksheet(dossier,modified),'component lock hash binding');
modified=copy(worksheet);modified.packageManifestSha256='b'.repeat(64);
refuse(()=>review.inspectWorksheet(dossier,modified),'different ZIP/package refused');
modified=copy(dossier);modified.components[0].version+='-changed';
refuse(()=>review.inspectWorksheet(modified,worksheet),'different dossier refused');
modified=copy(worksheet);modified.rows[0].disposition='approved';
refuse(()=>review.inspectWorksheet(dossier,modified),'unsubstantiated human approval refused');
modified=copy(worksheet);modified.rows[0].disposition='rejected';
modified.rows[0].reviewedOn=new Date().toISOString().slice(0,10);
modified.rows[0].reviewerReference='CI-REVIEWER';
modified.rows[0].evidenceUrls=['https://example.org/a','https://example.org/b'];
modified.rows[0].notes='A concrete license objection is outstanding.';
ok(review.inspectWorksheet(dossier,modified).rejected===1,
  'rejected item is preserved as unresolved and not silently approved');
modified=copy(modified);modified.rows[0].evidenceUrls[0]='file:///etc/passwd';
refuse(()=>review.inspectWorksheet(dossier,modified),'hostile evidence reference refused');
const completeWorksheet=complete(copy(worksheet));
const preview=review.inspectWorksheet(dossier,completeWorksheet);
ok(preview.approved===43&&preview.pending===0
  &&preview.readyForSeparateIndependentLegalDecision
  &&preview.independentLegalApproval===false&&preview.stage2Accepted===false,
  'even synthetic 43 approvals never produce legal or Stage2 acceptance');
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const priv=privateKey.export({format:'pem',type:'pkcs8'});
const pub=publicKey.export({format:'pem',type:'spki'});
const pin=keyDigest(publicKey);
const attestation=review.makeAttestation(dossier,completeWorksheet,priv);
const verified=review.verifyAttestation(dossier,completeWorksheet,attestation,pub,pin);
ok(verified.signatureValidUnderPinnedKey===true
  &&verified.independentLegalApproval===false
  &&verified.reviewerIdentityIndependentlyVerified===false
  &&verified.stage2Accepted===false,'valid Ed25519 proves exact bytes only, not human identity');
refuse(()=>review.makeAttestation(dossier,worksheet,priv),
  'incomplete 43-row review cannot be attested');
modified=copy(completeWorksheet);modified.rows[6].notes+=' manipulated';
refuse(()=>review.verifyAttestation(dossier,modified,attestation,pub,pin),
  'legally relevant notes cannot be changed after signature');
modified=copy(attestation);modified.payload.noticeSha256='f'.repeat(64);
refuse(()=>review.verifyAttestation(dossier,completeWorksheet,modified,pub,pin),
  'NOTICE digest is signed and binding');
modified=copy(attestation);modified.payload.attestedAt='2020-01-01T00:00:00.000Z';
refuse(()=>review.verifyAttestation(dossier,completeWorksheet,modified,pub,pin),
  'stale/replayed signed review refused');
modified=copy(attestation);modified.payload.attestedAt='2999-01-01T00:00:00.000Z';
refuse(()=>review.verifyAttestation(dossier,completeWorksheet,modified,pub,pin),
  'future-dated signed review refused');
modified=copy(attestation);modified.independentLegalApproval=true;
refuse(()=>review.verifyAttestation(dossier,completeWorksheet,modified,pub,pin),
  'signed envelope cannot claim legal approval');
const foreign=crypto.generateKeyPairSync('ed25519').publicKey.export({
  format:'pem',type:'spki'});
refuse(()=>review.verifyAttestation(dossier,completeWorksheet,attestation,foreign,pin),
  'valid signature under a different public key not accepted');
refuse(()=>review.verifyAttestation(dossier,completeWorksheet,attestation,pub,'0'.repeat(64)),
  'operator-supplied public key alone insufficient: independent pin necessary');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-cms-human-review-'));
try{
  const privateDir=path.join(tmp,'worksheet'),keyDir=path.join(tmp,'private-key'),
    trustDir=path.join(tmp,'trust-pin'),outDir=path.join(tmp,'signed-result');
  for(const dir of [privateDir,keyDir,trustDir,outDir])fs.mkdirSync(dir,{mode:0o700});
  const workFile=path.join(privateDir,'review.json');
  const keyFile=path.join(keyDir,'key.pem'),pubFile=path.join(trustDir,'reviewer.pem');
  const signedFile=path.join(outDir,'signed.json');
  fs.writeFileSync(keyFile,priv,{mode:0o600});
  fs.writeFileSync(pubFile,pub,{mode:0o600});
  const tool=path.join(__dirname,'stage2-human-license-review.cjs');
  const cli=(args,env={})=>spawnSync(process.execPath,[tool,...args],{
    encoding:'utf8',env:{...process.env,...env}});
  let result=cli(['--prepare','--output='+workFile]);
  ok(result.status===0&&fs.existsSync(workFile)
    &&review.readCanonical(workFile).rows.length===43,
    'offline CLI creates 43 pending rows from the real byte-verified package');
  result=cli(['--prepare','--output='+workFile]);
  ok(result.status===3,'no overwriting private review input');
  result=cli(['--sign','--worksheet='+workFile,
    '--private-key='+keyFile,'--output='+signedFile],{
    CMS_STAGE2_LEGAL_REVIEW_SIGNING:'explicit-offline-attestation'
  });
  ok(result.status===3&&!fs.existsSync(signedFile),
    'cannot sign an incomplete review');
  fs.writeFileSync(workFile,stable(completeWorksheet),{mode:0o600});
  result=cli(['--sign','--worksheet='+workFile,
    '--private-key='+keyFile,'--output='+signedFile]);
  ok(result.status===3&&!fs.existsSync(signedFile),
    'cannot sign without explicit offline human-review signing gate');
  result=cli(['--sign','--worksheet='+workFile,
    '--private-key='+keyFile,'--output='+signedFile],{
    CMS_STAGE2_LEGAL_REVIEW_SIGNING:'explicit-offline-attestation'
  });
  ok(result.status===0&&fs.existsSync(signedFile),
    'offline signing with key kept separate from worksheet and pin');
  result=cli(['--verify','--worksheet='+workFile,
    '--attestation='+signedFile,'--public-key='+pubFile,
    '--fingerprint='+pin]);
  ok(result.status===0&&JSON.parse(result.stdout).signatureValidUnderPinnedKey
    &&JSON.parse(result.stdout).stage2Accepted===false,
    'offline CLI verifies signed review against separately pinned public key');
  fs.writeFileSync(workFile,stable({...completeWorksheet,stage2Accepted:true}),{
    mode:0o600});
  result=cli(['--verify','--worksheet='+workFile,
    '--attestation='+signedFile,'--public-key='+pubFile,
    '--fingerprint='+pin]);
  ok(result.status===3,'CLI cannot verify forged Stage2 acceptance');
  fs.writeFileSync(workFile,JSON.stringify(completeWorksheet),{mode:0o600});
  result=cli(['--verify','--worksheet='+workFile,
    '--attestation='+signedFile,'--public-key='+pubFile,
    '--fingerprint='+pin]);
  ok(result.status===3,'noncanonical JSON bytes rejected');
  fs.rmSync(workFile);
  fs.symlinkSync(keyFile,workFile);
  result=cli(['--verify','--worksheet='+workFile,
    '--attestation='+signedFile,'--public-key='+pubFile,
    '--fingerprint='+pin]);
  ok(result.status===3,'symlink private reviewer file rejected');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
process.stdout.write('Stage2 independent human dependency review: '+checks+
  ' assertions PASS; no legal/Stage2 acceptance or target access.\n');
