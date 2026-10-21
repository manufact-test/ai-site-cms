#!/usr/bin/env node
// Adversarial tests: no false external review approvals, no source spoof.
import assert from 'node:assert/strict';
import {buildReviewHandoff} from './review-handoff.mjs';
const H='a'.repeat(64),C='b'.repeat(64),M='c'.repeat(40);
const upstream={upstreamCommit:'3246b36803c177847e677862fedeb7f937869adb',
 php:'8.3.6',physicalBinarySha256:H,sourceZipSha256:H,
 installedTreeSha256:H,isolatedComposerLockSha256:H,
 noSodium:{status:'passed',physicalPhp83WithoutSodium:true,absenceAssertions:2},
 compat:{status:'passed',composerInstalled:true,installedOriginalGitBlobs:78,
   preAndPostSourceAttested:true,physicalCompatRfcAndEnvelopeCases:4,
   upstreamV252Ed25519BoundaryAssertions:14}};
const results=[
 {name:'source:common-ed25519-backend',status:'passed',exitCode:0,
  stdout:'EXACT current main SHA '+M+' original source Ed25519 backend PASS 5 PHP verifiers;'},
 {name:'native:forced-class-signed-chain',status:'passed',exitCode:0,
  stdout:'EXACT current main SHA '+M+' forced-class native signed-chain PASS 60 assertions;'},
 {name:'no-sodium:cryptography',status:'passed',exitCode:0,attestedResult:upstream},
 {name:'compat:cryptography',status:'passed',exitCode:0,attestedResult:upstream},
 {name:'online:OSV-actual43-observation',status:'passed',exitCode:0},
 {name:'actual-lock:frozen-source-baseline',status:'passed',exitCode:0},
 {name:'upstream:actual-github-composer-zip',status:'passed',exitCode:0},
 {name:'upstream:real-signed-sodium-tag-git-tree',status:'passed',exitCode:0}
];
const required=Object.fromEntries(['online:OSV-actual43-observation',
 'actual-lock:frozen-source-baseline','upstream:actual-github-composer-zip',
 'upstream:real-signed-sodium-tag-git-tree'].map(x=>[x,{verified:true}]));
const suite={results,counts:{passed:8,failed:0,blocked:0},
 allExecutedTestsPassed:true,timestamp:'2026-10-21T12:00:00Z',
 evidenceDecision:{releaseDecision:'NO_GO',productionApproved:false,
 stage2Accepted:false,licenseApproved:false,targetHostApproved:false,
 results:{passed:8,failed:0,blocked:0},
 evidence:{observedStrongResearchEvidence:true,exactRealSourceArchiveSha256:H,
   exactOsvReportSha256:C,exactOsvAdvisoryReferences:0,evidenceFingerprintSha256:C,
   mandatoryRowsVerified:required}}};
let tested=0;
function check(v,why){assert.ok(v,why);tested++}
function withCase(why,edit,expected){
 const x=structuredClone(suite);edit(x);
 const v=buildReviewHandoff(x);
 check(v.summary.researchEvidenceReadyForExternalReview===false&&
   !v.summary.productionApproved&&!v.summary.targetHostApproved&&
   (!expected||expected(v)),why);
}
function denied(why,edit){
 const x=structuredClone(suite);edit(x);
 assert.throws(()=>buildReviewHandoff(x),/REVIEW_HANDOFF_REFUSED/,why);tested++;
}
const yes=buildReviewHandoff(suite,{head:M,base:M});
check(yes.summary.researchEvidenceReadyForExternalReview===true,'complete synthetically valid structural research packet');
check(yes.summary.releaseDecision==='NO_GO'&&!yes.summary.productionApproved,'technical readiness never means release');
check(yes.externalReviewRequired.length===6&&
  yes.externalReviewRequired.every(x=>x.status==='AWAITING_INDEPENDENT_EXTERNAL_SIGNOFF'&&
  x.approvalDocumentSha256===null),'six qualified external approvals always absent');
check(yes.observed.actualMainSha===M&&yes.observed.installedEd25519SecurityRegressionAssertions===14,
  'current main and repair checks captured without unconditional approval');
check(yes.integrity.cryptographicSignature===false&&
  /^[a-f0-9]{64}$/.test(yes.integrity.unsignedCanonicalJsonSha256),'unsigned digest clearly labeled');
check(buildReviewHandoff(suite,{head:M,base:M}).integrity.unsignedCanonicalJsonSha256===
  yes.integrity.unsignedCanonicalJsonSha256,'same input produces deterministic packet hash');
withCase('real original main differs',x=>x.results[1].stdout=x.results[1].stdout.replace(M,'d'.repeat(40)));
withCase('real main not proven',x=>x.results[0].stdout='PASS');
withCase('Composer source not installed',x=>delete x.results[3].attestedResult);
withCase('mismatching isolated runtime object',x=>x.results[3].attestedResult=structuredClone(upstream));
withCase('fake upstream commit',x=>x.results[3].attestedResult.upstreamCommit=M);
withCase('bad pinned ZIP digest',x=>x.results[3].attestedResult.sourceZipSha256='f'.repeat(64));
withCase('unsupported PHP 8.4',x=>x.results[3].attestedResult.php='8.4.0');
withCase('native PHP forged',x=>x.results[3].attestedResult.noSodium.physicalPhp83WithoutSodium=false);
withCase('78 original Git blobs unverified',x=>x.results[3].attestedResult.compat.installedOriginalGitBlobs=77);
withCase('pre/post missing',x=>x.results[3].attestedResult.compat.preAndPostSourceAttested=false);
withCase('fewer upstream repair checks',x=>x.results[3].attestedResult.compat.upstreamV252Ed25519BoundaryAssertions=13);
withCase('missing OSV report',x=>x.evidenceDecision.evidence.exactOsvReportSha256=null);
withCase('new known advisory',x=>x.evidenceDecision.evidence.exactOsvAdvisoryReferences=2);
withCase('source Git verification missing',x=>x.evidenceDecision.evidence.mandatoryRowsVerified['upstream:real-signed-sodium-tag-git-tree'].verified=false);
withCase('false strong readiness',x=>x.evidenceDecision.evidence.observedStrongResearchEvidence=false);
withCase('blocked crypto fixture',x=>{x.results[3].status='blocked';x.counts.passed--;x.counts.blocked++;x.evidenceDecision.results.passed--;x.evidenceDecision.results.blocked++});
denied('forged release GO',x=>x.evidenceDecision.releaseDecision='GO');
denied('forged target approval',x=>x.evidenceDecision.targetHostApproved=true);
denied('forged production approval',x=>x.evidenceDecision.productionApproved=true);
denied('forged research counts',x=>x.counts.passed++);
denied('forged policy counts',x=>x.evidenceDecision.results.failed++);
denied('duplicate name',x=>{x.results.push(x.results[0]);x.counts.passed++;x.evidenceDecision.results.passed++});
denied('missing result array',x=>x.results=null);
console.log('Independent qualified-review handoff adversarial regression PASS '+tested+' assertions; all six external approvals withheld; NOT production approval');
