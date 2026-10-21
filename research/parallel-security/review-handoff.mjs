#!/usr/bin/env node
// Exact security suite -> independent human-review input. NEVER production GO.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const h64=/^[a-f0-9]{64}$/, h40=/^[a-f0-9]{40}$/;
const refuse=x=>{throw Error('REVIEW_HANDOFF_REFUSED: '+x)};
const REQUIREMENTS=Object.freeze([
 ['PUBLISHER_KEY_CUSTODY','Independent publisher-identity reviewer','Authentic out-of-band fingerprint and issuer/owner attestation, local signed tag verification, revocation/expiry status'],
 ['QUALIFIED_CRYPTO_REVIEW','Independent cryptography/security reviewer','Qualified exact-source v2.5.2 plus CMS Ed25519 callsite audit, malformed signature and subgroup attacks, CPU/timing, safe fallback decision'],
 ['REDISTRIBUTION_LEGAL_REVIEW','Qualified software license reviewer','Written ISC/NOTICE, exact Composer 14 and npm 29, Apache root and embedded notices, original copyrights, real built package and commercial use review'],
 ['TARGET_WEB_SAPI_PERFORMANCE','Authorized target-infrastructure reviewer','Real Hostinger PHP version/extension/FPM/LiteSpeed SAPI, original autoload, CPU/memory/latency/concurrency/timeout, error/rollback load testing'],
 ['STAGE2_RELEASE_INTEGRITY','Main CMS integration/release engineer','Approved latest main release bytes, signed permit/receipt/settlement, trust rotation, deployment and interrupted rollback safety, no secrets leak'],
 ['RELEASE_OWNER_DECISION','Authorized product owner','Explicit scope/target/date/commit-specific consent and acceptance of all independent evidence']
]);
function get(rows,name){
 const v=rows.filter(x=>x.name===name);
 if(v.length>1)refuse('duplicate row '+name);
 return v[0]||null;
}
const marker=(r,regex)=>r?.status==='passed'&&r.exitCode===0&&!r.spawnError&&!r.signal&&
 typeof r.stdout==='string'?r.stdout.match(regex)?.[1]||null:null;
export function buildReviewHandoff(suite,gitContext={}){
 if(!suite||!Array.isArray(suite.results)||suite.results.length<4||
    suite.results.length>220||!suite.evidenceDecision)refuse('suite input absent or out of bound');
 const decision=suite.evidenceDecision;
 if(decision.releaseDecision!=='NO_GO'||decision.productionApproved!==false||
    decision.stage2Accepted!==false||decision.licenseApproved!==false||
    decision.targetHostApproved!==false)refuse('forged production, license or target approval');
 const counts={passed:0,failed:0,blocked:0};
 for(const r of suite.results){
   if(!r||typeof r.name!=='string'||!Object.hasOwn(counts,r.status))
     refuse('malformed suite row');
   counts[r.status]++;
 }
 if(new Set(suite.results.map(r=>r.name)).size!==suite.results.length)
   refuse('duplicate result names');
 if(Object.keys(counts).some(k=>counts[k]!==suite.counts?.[k]||
    counts[k]!==decision.results?.[k])||
    suite.allExecutedTestsPassed!==(counts.failed===0))refuse('result count inconsistency');
 const evidence=decision.evidence;
 if(!evidence||typeof evidence!=='object')refuse('mandatory source evidence absent');
 const src=marker(get(suite.results,'source:common-ed25519-backend'),
   /EXACT current main SHA ([a-f0-9]{40}) original source Ed25519 backend PASS 5 PHP verifiers;/);
 const chain=marker(get(suite.results,'native:forced-class-signed-chain'),
   /EXACT current main SHA ([a-f0-9]{40}) forced-class native signed-chain PASS 60 assertions;/);
 const actualMain=src&&src===chain?src:null;
 const physical=get(suite.results,'no-sodium:cryptography');
 const compat=get(suite.results,'compat:cryptography');
 const x=compat?.attestedResult||null;
 const n=physical?.attestedResult||null;
 const nativeOk=!!(physical?.status==='passed'&&physical.exitCode===0&&
   n&&n===x&&n.noSodium?.status==='passed'&&
   n.noSodium.physicalPhp83WithoutSodium===true&&n.noSodium.absenceAssertions===2&&
   /^8\.3\.\d+$/.test(n.php||'')&&h64.test(n.physicalBinarySha256||''));
 const compOk=!!(nativeOk&&compat.status==='passed'&&compat.exitCode===0&&
   x.upstreamCommit==='3246b36803c177847e677862fedeb7f937869adb'&&
   x.compat?.status==='passed'&&x.compat.composerInstalled===true&&
   x.compat.installedOriginalGitBlobs===78&&
   x.compat.preAndPostSourceAttested===true&&
   x.compat.physicalCompatRfcAndEnvelopeCases===4&&
   x.compat.upstreamV252Ed25519BoundaryAssertions===14&&
   x.sourceZipSha256===evidence.exactRealSourceArchiveSha256&&
   h64.test(x.installedTreeSha256||'')&&
   h64.test(x.isolatedComposerLockSha256||''));
 const mandatory=evidence.mandatoryRowsVerified||{};
 const zipped=!!(h64.test(evidence.exactRealSourceArchiveSha256||'')&&
    mandatory['upstream:actual-github-composer-zip']?.verified===true&&
    mandatory['upstream:real-signed-sodium-tag-git-tree']?.verified===true&&
    mandatory['actual-lock:frozen-source-baseline']?.verified===true);
 const osv=!!(evidence.exactOsvAdvisoryReferences===0&&
    h64.test(evidence.exactOsvReportSha256||'')&&
    mandatory['online:OSV-actual43-observation']?.verified===true&&
    get(suite.results,'online:OSV-actual43-observation')?.status==='passed');
 const gates=['source:common-ed25519-backend','native:forced-class-signed-chain',
   'no-sodium:cryptography','compat:cryptography']
     .map(id=>({id,status:get(suite.results,id)?.status||'missing'}));
 const ready=!!(counts.failed===0&&counts.blocked===0&&actualMain&&
    zipped&&osv&&nativeOk&&compOk&&evidence.observedStrongResearchEvidence===true&&
    gates.every(g=>g.status==='passed'));
 const context={repository:'manufact-test/ai-site-cms',pr:3,
   githubEventHead:h40.test(gitContext.head||'')?gitContext.head:null,
   githubEventBase:h40.test(gitContext.base||'')?gitContext.base:null,
   note:'GitHub event fields are NOT independent signatures; inspect the exact-head scope job'};
 const packet={
   schema:'ai-site-cms-qualified-independent-review-handoff-v1',
   context,
   emittedAt:suite.timestamp||null,
   summary:{researchEvidenceReadyForExternalReview:ready,releaseDecision:'NO_GO',
      stage2Accepted:false,productionApproved:false,legalApproved:false,
      publisherOwnershipApproved:false,targetHostApproved:false,
      qualifiedSecurityReviewApproved:false,externalSignoffsCompleted:0},
   suiteCounts:counts,
   observed:{
     actualMainSha:actualMain,
     composer14PlusNpm29PinnedSourceEvidence:zipped,
     realOSV43ZeroKnownAdvisories:osv,
     actualComposerZipSha256:zipped?evidence.exactRealSourceArchiveSha256:null,
     actualOSVReportSha256:osv?evidence.exactOsvReportSha256:null,
     physicalPHP83WithoutSodium:nativeOk,
     physicalPHPBinarySha256:nativeOk?x.physicalBinarySha256:null,
     sourceAttestedRealComposer78Blobs:compOk,
     installedVendorSourceTreeSha256:compOk?x.installedTreeSha256:null,
     isolatedComposerLockSha256:compOk?x.isolatedComposerLockSha256:null,
     installedEd25519SecurityRegressionAssertions:compOk?14:null,
     evidenceSummaryFingerprintSha256:h64.test(evidence.evidenceFingerprintSha256||'')
       ?evidence.evidenceFingerprintSha256:null
   },
   technicalGates:gates,
   externalReviewRequired:REQUIREMENTS.map(([id,reviewer,deliverable])=>({
      id,reviewer,deliverable,status:'AWAITING_INDEPENDENT_EXTERNAL_SIGNOFF',
      reviewerIdentity:null,approvalDocumentSha256:null,approvalTime:null
   })),
   limitations:[
      'Research test counts are suite entries, not a security audit or a count of raw cryptographic assertions.',
      'OSV zero means no known advisories observed at scan time, not a global vulnerability guarantee.',
      'A SHA256 dossier digest is NOT an identity-authenticated signed release decision.',
      'Target Hostinger web-SAPI, license clearance, publisher key custody and product owner authorization are not proven.'
   ]
 };
 return {...packet,integrity:{unsignedCanonicalJsonSha256:hash(JSON.stringify(packet)),
    cryptographicSignature:false,authorIdentityAuthenticated:false}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3){console.error('Usage: node review-handoff.mjs /safe/complete-suite.json');process.exitCode=2}
 else try{
   const f=path.resolve(process.argv[2]),stat=fs.lstatSync(f);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.size>6*1024*1024)
     refuse('untrusted or oversized input');
   const result=buildReviewHandoff(JSON.parse(fs.readFileSync(f,'utf8')));
   console.log(JSON.stringify(result,null,2));
   console.error('RESEARCH_QUALIFIED_REVIEW_HANDOFF '+JSON.stringify({
     ready:result.summary.researchEvidenceReadyForExternalReview,
     releaseDecision:result.summary.releaseDecision,
     outstanding:result.externalReviewRequired.map(x=>x.id),
     digest:result.integrity.unsignedCanonicalJsonSha256}));
 }catch(e){console.error(String(e?.message||e));process.exitCode=1}
}
