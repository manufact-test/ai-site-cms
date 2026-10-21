#!/usr/bin/env node
// Offline mutation test for interpretation of an ARCHIVED real main CI record.
// No PHP binary, online query, actual upstream source verification or host run.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkArchivedMainEvidence,readPinnedArchive,ARCHIVE} from './archived-main-sodium-proof.mjs';
let n=0;
const pass=(v,label)=>{assert.ok(v,label);n++;};
const input=JSON.parse(fs.readFileSync(ARCHIVE,'utf8'));
const good=checkArchivedMainEvidence(input);
pass(good.signedChainChecks===33&&good.trustRotationChecks===55&&
  !good.reexecutedInThisSecurityJob&&!good.sourceTreeIndependentlyAttested,
  'real archived CI claims only recorded results');
const encoded=JSON.stringify(input);
function reject(label,mutation){
  const document=JSON.parse(encoded);
  mutation(document,JSON.parse(document.logExcerpt.stdout));
  assert.throws(()=>checkArchivedMainEvidence(document),
    /UPSTREAM_MAIN_CI_EVIDENCE_UNVERIFIED/,'must reject '+label);
  n++;
}
function alter(label,fn){
  reject(label,(a,p)=>{fn(p);a.logExcerpt.stdout=JSON.stringify(p);});
}
reject('PR head substituted',d=>d.origin.headSha='b'.repeat(40));
reject('run ID substituted',d=>d.origin.runId=39571456889);
reject('job ID substituted',d=>d.origin.jobId=119126388263);
reject('workflow source SHA substituted',d=>d.origin.workflowBlobSha='f'.repeat(40));
reject('runtime source SHA substituted',d=>d.origin.runnerBlobSha='f'.repeat(40));
reject('signed-chain PHP SHA substituted',d=>d.origin.signedChainBlobSha='f'.repeat(40));
reject('rotation PHP SHA substituted',d=>d.origin.rotationBlobSha='f'.repeat(40));
reject('CI job not successful',d=>d.origin.conclusion='failure');
reject('false independent Security replay claim',d=>d.classification.independentlyReexecutedBySecurityPr=true);
reject('false source-tree reviewed claim',d=>d.classification.wholeTreeIndependentExternalHashAttested=true);
reject('false target host claim',d=>d.classification.targetHostTested=true);
reject('false production approved claim',d=>d.classification.productionApproved=true);
reject('extra origin field',d=>d.origin.injected='yes');
reject('incomplete malformed raw transcript',d=>d.logExcerpt.stdout='{"evidence"');
alter('PHP 8.4 substituted',p=>p.php='8.4.0');
alter('32-bit runtime substituted',p=>p.bits=32);
alter('native extension was loaded',p=>p.extensionLoadedBeforeCandidate=true);
alter('missing physical absence result',p=>delete p.extensionLoadedBeforeCandidate);
alter('sodium_compat version drift',p=>p.version='v2.5.1');
alter('sodium_compat source drift',p=>p.sourceReference='f'.repeat(40));
alter('RFC known-answer not passed',p=>p.rfc8032='skipped');
alter('forgery envelope not exercised',p=>p.signedEnvelopeAdversarial='skipped');
alter('permit receipt settlement incomplete',p=>p.completeSignedChainParity.checks=32);
alter('signed chain bytes differ',p=>p.completeSignedChainParity.sameSignedBytes=false);
alter('signed chain head differs',p=>p.completeSignedChainParity.sameSignedHead=false);
alter('same backend twice',p=>p.completeSignedChainParity.signatureBackends=['native','native']);
alter('not original CMS PHP',p=>p.completeSignedChainParity.policy='synthetic fake verifier');
alter('rotation checks missing',p=>p.trustKeyRotationParity.checks=54);
alter('rotation retired keys allowed',p=>p.trustKeyRotationParity.retiredKeysRefused=false);
alter('rotation journal not rejected',p=>p.trustKeyRotationParity.ambiguousJournalRejected=false);
alter('rotation native/compat parity broken',p=>p.trustKeyRotationParity.backendParity=false);
alter('not externally pinned rotation floor',p=>p.trustKeyRotationParity.externalMinimumEpoch=false);
alter('inconsistent runtime PHP version',p=>p.trustKeyRotationParity.noSodiumPHP=80335);
alter('performance fake mean',p=>p.performance.meanMs=9999);
alter('performance not target-limited',p=>p.performance.performance='Hostinger production');
alter('full artifact incorrectly approved',p=>p.stage2Accepted=true);
alter('operator identity wrongly marked verified',p=>p.publisherKeyOwnershipVerified=true);
pass(readPinnedArchive().signedChainChecks===33,
  'read-only pinned archived Git blob path accepted');
const r=cp.spawnSync(process.execPath,[fileURLToPath(new URL('./archived-main-sodium-proof.mjs',import.meta.url))],{
  encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
pass(r.status===0&&r.stdout.includes('ARCHIVE ONLY, NOT independent source-tree audit'),
  'saved original excerpt CLI ran and retained caveat');
assert.equal(n,40,'all positive and adversarial archive checks must run');
console.log('Archived main CI evidence provenance and false-claim offline regression PASS '+n+' assertions; saved real upstream output, mutated in memory only');
