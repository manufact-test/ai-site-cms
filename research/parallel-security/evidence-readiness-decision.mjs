#!/usr/bin/env node
// Independent research evidence binding and unequivocal release HOLD.
// Consumes results from one actual security suite run; never manufactures
// external proof, never changes application/locks/workflow or grants acceptance.
import crypto from 'node:crypto';

const hex=/^[a-f0-9]{64}$/;
const proofs=Object.freeze({
 'actual-lock:frozen-source-baseline':
   /Frozen exact 43-pin source\+dist lock baseline PASS 3 independent SHA-256 and Git-blob identities;/,
 'upstream:real-signed-sodium-tag-git-tree':
   /REAL upstream signed-tag anchored Git provenance PASS 211 recursive entries and 78 exportable source blobs;/,
 'upstream:actual-github-composer-zip':
   /REAL Composer ZIP bytes verified against signed-tag Git source PASS 78 files; archive SHA256 ([a-f0-9]{64});/,
 'online:OSV-actual43-observation':
   /REAL OSV HTTPS querybatch PASS 43 exact pins; ([0-9]+) advisory references across ([0-9]+) packages; exact source lock SHA256 matched; reportSHA256=([a-f0-9]{64});/,
 'native:pinned-fixed-main-dispatch-parity':
   /Chain Ed25519 backend signed-chain regression PASS 120 assertions; mode=pinned-main-dispatch;/,
 'upstream:archived-main-genuine-sodium-free':
   /Archived real main GitHub CI sodium-free evidence PASS 33 chain \+ 55 rotation checks; ARCHIVE ONLY/
});
export const EXPECTED_INDEPENDENT_BLOCKERS=Object.freeze([
 'source:common-ed25519-backend','native:forced-class-signed-chain',
 'no-sodium:cryptography','compat:cryptography'
]);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const demand=(v,reason)=>{if(!v)throw Error('SECURITY_RELEASE_DECISION_INVALID: '+reason)};
function kind(name,results){
 const found=results.filter(x=>x?.name===name);
 demand(found.length<=1,'duplicate evidence row: '+name);
 return found[0]||null;
}
function inspect(name,results){
 const item=kind(name,results),pattern=proofs[name];
 if(!item||item.status!=='passed'||item.exitCode!==0||
   item.spawnError||item.signal||typeof item.stdout!=='string')
   return {status:item?.status||'missing',verified:false,reason:'Missing executed passing exact-head evidence'};
 const match=item.stdout.match(pattern);
 if(!match)
   return {status:'invalid',verified:false,reason:'Missing exact completed proof marker; process exit zero is insufficient'};
 return {status:'passed',verified:true,...(name==='upstream:actual-github-composer-zip'
    ?{archiveSha256:match[1]}:{}),...(name==='online:OSV-actual43-observation'
    ?{advisoryReferences:Number(match[1]),packagesWithAdvisories:Number(match[2]),
      fullOsvReportSha256:match[3]}:{})};
}
export function evaluateResearchDecision(results){
 demand(Array.isArray(results)&&results.length>=4&&results.length<=220,
   'security suite results absent or out of bounded limits');
 demand(results.every(x=>x&&typeof x.name==='string'&&x.name.length<=150&&
   ['passed','blocked','failed'].includes(x.status)),
   'bad per-test status');
 const names=results.map(x=>x.name);
 demand(new Set(names).size===names.length,'duplicate suite test names');
 const statusCounts={passed:0,failed:0,blocked:0};
 for(const r of results)statusCounts[r.status]++;
 const details=Object.fromEntries(Object.keys(proofs).map(n=>[n,inspect(n,results)]));
 const blockers=EXPECTED_INDEPENDENT_BLOCKERS.map(name=>{
   const r=kind(name,results);
   return {name,status:r?.status||'missing'};
 });
 const failures=results.filter(x=>x.status==='failed').map(x=>x.name);
 const required=Object.entries(details).filter(([,x])=>!x.verified).map(([name])=>name);
 const zip=details['upstream:actual-github-composer-zip'];
 const osv=details['online:OSV-actual43-observation'];
 if(zip.verified)demand(hex.test(zip.archiveSha256),'ZIP digest unavailable');
 if(osv.verified){
   demand(hex.test(osv.fullOsvReportSha256),'OSV report digest unavailable');
   demand(Number.isSafeInteger(osv.advisoryReferences)&&
     Number.isSafeInteger(osv.packagesWithAdvisories)&&
     osv.advisoryReferences>=osv.packagesWithAdvisories&&
     osv.packagesWithAdvisories<=43,'OSV advisory counts impossible');
 }
 const advisories=osv.verified?osv.advisoryReferences:null;
 const externalObserved=zip.verified&&osv.verified;
 const allResearchTestsActuallyPass=failures.length===0;
 const currentResearchEvidenceComplete=externalObserved&&required.length===0&&
   allResearchTestsActuallyPass&&advisories===0;
 const review=[
  ...(failures.length?['Some performed security tests FAILED — stop acceptance.']:[]),
  ...(required.length?['Missing or unverified mandatory exact run evidence: '+required.join(', ')]:[]),
  ...(advisories===null?['Actual OSV advisory count NOT VERIFIED.']:advisories>0
    ?['OSV returned '+advisories+' advisory references; qualified remediation triage required.']:[]),
  ...(blockers.filter(b=>b.status!=='passed').length
    ?['Independent original-current-main and real source-attested Sodium-free research gates unfinished.']:[]),
  'Formal publisher PGP key custody, source-code cryptographic review and ISC/NOTICE distribution signoff not provided.',
  'Actual target Hostinger PHP web SAPI, performance/concurrency and release/rollback approval not provided.'
 ];
 const selected=Object.entries(details).map(([name,v])=>({name,status:v.status,
   verified:v.verified,...(v.archiveSha256?{sha256:v.archiveSha256}:{}),
   ...(v.fullOsvReportSha256?{reportSha256:v.fullOsvReportSha256}:{}),
   ...(v.advisoryReferences!==undefined?{advisories:v.advisoryReferences}:{} )}));
 const evidenceFingerprint=sha(JSON.stringify({selected,blockers,statusCounts}));
 return {
  schema:'ai-site-cms-security-evidence-readiness-v1',
  scope:'Independent Security Research PR evidence; NOT whole CMS or current target host',
  results:statusCounts,
  evidence:{realGithubZipAndOSVObservedInThisRun:externalObserved,
    exactRealSourceArchiveSha256:zip.archiveSha256||null,
    exactOsvReportSha256:osv.fullOsvReportSha256||null,
    exactOsvAdvisoryReferences:advisories,
    mandatoryRowsVerified:details,verifiedMandatoryCount:selected.filter(x=>x.verified).length,
    evidenceFingerprintSha256:evidenceFingerprint,
    observedStrongResearchEvidence:currentResearchEvidenceComplete},
  independentBlockers:blockers,
  releaseDecision:'NO_GO',productionApproved:false,stage2Accepted:false,
  licenseApproved:false,publisherPgpKeyIndependentlyVerified:false,
  targetHostApproved:false,qualifiedSecurityReviewApproved:false,
  userConsentToDeploy:false,
  outstandingReview:review
 };
}
