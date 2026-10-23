#!/usr/bin/env node
// Adversarial policy regressions on copied evidence rows; no network or PHP.
import assert from 'node:assert/strict';
import {evaluateResearchDecision,EXPECTED_INDEPENDENT_BLOCKERS} from './evidence-readiness-decision.mjs';
let n=0;
const marker={
 'actual-lock:frozen-source-baseline':'Frozen exact 43-pin source+dist lock baseline PASS 3 independent SHA-256 and Git-blob identities;',
 'upstream:real-signed-sodium-tag-git-tree':'REAL upstream signed-tag anchored Git provenance PASS 211 recursive entries and 78 exportable source blobs;',
 'upstream:actual-github-composer-zip':'REAL Composer ZIP bytes verified against signed-tag Git source PASS 78 files; archive SHA256 '+'a'.repeat(64)+'; no production approval',
 'online:OSV-actual43-observation':'REAL OSV HTTPS querybatch PASS 43 exact pins; 0 advisory references across 0 packages; exact source lock SHA256 matched; reportSHA256='+'b'.repeat(64)+'; HUMAN TRIAGE REQUIRED',
 'native:pinned-fixed-main-dispatch-parity':'Chain Ed25519 backend signed-chain regression PASS 120 assertions; mode=pinned-main-dispatch; FROZEN source',
 'upstream:archived-main-genuine-sodium-free':'Archived real main GitHub CI sodium-free evidence PASS 33 chain + 55 rotation checks; ARCHIVE ONLY'
};
const initial=Object.entries(marker).map(([name,stdout])=>({
 name,status:'passed',exitCode:0,stdout
})).concat(EXPECTED_INDEPENDENT_BLOCKERS.map(name=>({name,status:'blocked',reason:'External integration-owner action needed'})));
const seed=JSON.stringify(initial);
const good=(cond,label)=>{assert.ok(cond,label);n++};
const baseline=evaluateResearchDecision(initial);
good(baseline.evidence.verifiedMandatoryCount===6,'all six strong research proof records verified');
good(baseline.evidence.observedStrongResearchEvidence===true,'six complete records may establish research evidence only');
good(baseline.releaseDecision==='NO_GO'&&baseline.productionApproved===false&&
  baseline.stage2Accepted===false&&!baseline.targetHostApproved,
  'NO-GO stays unconditional despite all positives');
good(baseline.independentBlockers.every(x=>x.status==='blocked'),
  'four research-local blockers remain explicitly shown');
good(baseline.evidence.exactRealSourceArchiveSha256==='a'.repeat(64)&&
  baseline.evidence.exactOsvReportSha256==='b'.repeat(64),
  'source ZIP & OSV evidence fingerprints preserved');
function mutate(label,fn,check){
 const v=JSON.parse(seed);fn(v);const r=evaluateResearchDecision(v);
 good(check(r),'adversarial evidence not rejected: '+label);
}
function denied(label,fn){
 const v=JSON.parse(seed);fn(v);
 assert.throws(()=>evaluateResearchDecision(v),/SECURITY_RELEASE_DECISION_INVALID/,
   'fail-open malformed suite: '+label);n++;
}
const row=(v,name)=>v.find(x=>x.name===name);
const osv='online:OSV-actual43-observation',zip='upstream:actual-github-composer-zip';
for(const name of Object.keys(marker)){
 mutate('missing '+name,v=>v.splice(v.findIndex(x=>x.name===name),1),
   r=>!r.evidence.observedStrongResearchEvidence&&r.releaseDecision==='NO_GO');
}
mutate('OSV test blocked',v=>{const q=row(v,osv);q.status='blocked';q.exitCode=null;},
 r=>r.evidence.exactOsvReportSha256===null&&!r.evidence.realGithubZipAndOSVObservedInThisRun);
mutate('ZIP network blocked',v=>{const q=row(v,zip);q.status='blocked';q.exitCode=null;},
 r=>r.evidence.exactRealSourceArchiveSha256===null&&!r.evidence.realGithubZipAndOSVObservedInThisRun);
mutate('pass without real ZIP proof',v=>row(v,zip).stdout='PASS',
 r=>!r.evidence.observedStrongResearchEvidence);
mutate('pass without full 43 OSV proof',v=>row(v,osv).stdout='all green',
 r=>!r.evidence.observedStrongResearchEvidence);
mutate('nonzero OSV exit status',v=>row(v,osv).exitCode=4,
 r=>!r.evidence.observedStrongResearchEvidence);
mutate('zero-exit missing ZIP process code',v=>row(v,zip).exitCode=null,
 r=>!r.evidence.observedStrongResearchEvidence);
mutate('nonzero ZIP process exit',v=>row(v,zip).exitCode=1,
 r=>!r.evidence.observedStrongResearchEvidence);
mutate('process spawn error despite zero exit',v=>row(v,zip).spawnError='ENOENT',
 r=>!r.evidence.observedStrongResearchEvidence);
mutate('process signal despite zero exit',v=>row(v,zip).signal='SIGTERM',
 r=>!r.evidence.observedStrongResearchEvidence);
mutate('a performed security test has failed',v=>v.push({name:'extra:critical',status:'failed'}),
 r=>r.results.failed===1&&!r.evidence.observedStrongResearchEvidence&&r.releaseDecision==='NO_GO');
mutate('OSV actual advisory requires human triage',v=>{
 row(v,osv).stdout=row(v,osv).stdout.replace('0 advisory references across 0 packages','2 advisory references across 1 packages');
},r=>r.evidence.exactOsvAdvisoryReferences===2&&
 !r.evidence.observedStrongResearchEvidence&&r.outstandingReview.some(x=>x.includes('2 advisory references')));
mutate('OSV tampered digest marked PASS',v=>row(v,osv).stdout=row(v,osv).stdout.replace('b'.repeat(64),'Z'.repeat(64)),
 r=>!r.evidence.observedStrongResearchEvidence&&r.evidence.exactOsvReportSha256===null);
mutate('ZIP tampered digest marked PASS',v=>row(v,zip).stdout=row(v,zip).stdout.replace('a'.repeat(64),'z'.repeat(64)),
 r=>!r.evidence.observedStrongResearchEvidence&&r.evidence.exactRealSourceArchiveSha256===null);
mutate('wrong signed tag source record',v=>row(v,'upstream:real-signed-sodium-tag-git-tree').stdout='old 211 PASS',
 r=>!r.evidence.observedStrongResearchEvidence);
mutate('fake locked inventory',v=>row(v,'actual-lock:frozen-source-baseline').stdout='43 sources pass',
 r=>!r.evidence.observedStrongResearchEvidence);
mutate('fake native signed chain marker',v=>row(v,'native:pinned-fixed-main-dispatch-parity').stdout='PASS 120',
 r=>!r.evidence.observedStrongResearchEvidence);
mutate('no real upstream archived source',v=>row(v,'upstream:archived-main-genuine-sodium-free').stdout='PASS',
 r=>!r.evidence.observedStrongResearchEvidence);
mutate('a blocked crypto gate falsely marked passed',v=>{const x=row(v,'compat:cryptography');x.status='passed';x.exitCode=0;},
 r=>r.independentBlockers.find(x=>x.name==='compat:cryptography').status==='passed'&&r.releaseDecision==='NO_GO');
mutate('all four blockers superficially green',v=>{
 for(const x of v)if(EXPECTED_INDEPENDENT_BLOCKERS.includes(x.name)){x.status='passed';x.exitCode=0;}
},r=>r.releaseDecision==='NO_GO'&&!r.targetHostApproved&&!r.licenseApproved);
denied('duplicate exact ZIP row',v=>v.push({...row(v,zip)}));
denied('duplicate original OSV row',v=>v.push({...row(v,osv)}));
denied('unrecognized result status',v=>row(v,zip).status='skip');
denied('unbounded result length',v=>{for(let i=0;i<230;i++)v.push({name:'extra'+i,status:'blocked'});});
denied('OSV advisory references less than packages',v=>{
 row(v,osv).stdout=row(v,osv).stdout.replace('0 advisory references across 0 packages','1 advisory references across 2 packages');
});
good(baseline.evidence.evidenceFingerprintSha256.length===64,
  'evidence decision carries independent reproducible fingerprint');
const again=evaluateResearchDecision(JSON.parse(seed));
good(again.evidence.evidenceFingerprintSha256===baseline.evidence.evidenceFingerprintSha256,
  'unchanged exact run produces same fingerprint');
assert.equal(n,37,'Expected exact complete adversarial readiness matrix');
console.log('Security evidence NO-GO release decision regression PASS '+n+' assertions; real source/OSV markers required, NO production approval');
