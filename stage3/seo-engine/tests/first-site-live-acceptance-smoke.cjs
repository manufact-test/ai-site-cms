'use strict';
/* Offline shape/guardrail check, not a real client browser/form signoff. */
const assert=require('node:assert/strict');
const FLOW=require('../lib/first-site-live-acceptance.cjs');
const a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64),d='d'.repeat(64),e='e'.repeat(64);
const contract={format:'manufact-seo-first-site-lead-relay-v1',readOnly:true,
 deploymentAuthorized:false,siteId:'site-1',
 identity:{publicZipSha256:a,publishedVersion:7,officialStaticManifestSha256:b,
 claimedOwnerSourceRevision:8,sealedSiteSha256:c},
 inputSha256:{candidate:a,summary:b,upload:c,post:d},
 evidence:{originalLocalBlockers:0}};
const upload={format:'manufact-seo-static-upload-bundle-v1',siteId:'site-1',
 publishedVersion:7,officialStaticManifestSha256:b,files:[
 {file:'index.html',kind:'html'},{file:'contact/index.html',kind:'html'},
 {file:'404.html',kind:'not-found'}]};
const post={format:'manufact-seo-post-deploy-release-verification-v1',siteId:'site-1',
 publishedVersion:7,officialStaticManifestSha256:b,candidatePublicZipSha256:a,
 finalReleaseAuthorized:false,originalCandidateBlockingGates:0,
 postDeployBlockingReasons:[],disposition:'TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED'};
const summary={format:'manufact-seo-first-site-check-v1',siteId:'site-1',
 publishedVersion:7,sourceSiteSha256:c,ownerPublishedSourceRevisionClaim:8,
 release:{blockingGates:0},forms:{markupObserved:1}};
const hashes={contract:e,candidate:a,summary:b,upload:c,post:d};
const original=FLOW.template(contract,upload,post,summary,hashes);
assert.deepEqual(original.required.pages,['/','/contact/']);
assert.equal(original.required.browserChecks,6);
assert.equal(original.tasks.length,6+FLOW.HOST_CHECKS.length);
assert.equal(FLOW.review(original,original,post).status,'HUMAN-EVIDENCE-INCOMPLETE');
const reviewed=JSON.parse(JSON.stringify(original));
for(const t of reviewed.tasks){
 t.state='passed';t.observedAt='2026-10-29';t.checkedBy='Lead';
 t.evidenceRef='private://browser-check';t.notes='';
}
assert.equal(FLOW.review(original,reviewed,post).status,'HUMAN-EVIDENCE-INCOMPLETE');
reviewed.formTests=[{page:'/contact/',formRef:'lead-main',state:'passed',
 observedAt:'2026-10-29',checkedBy:'Lead',evidenceRef:'private://form-receipt',notes:''}];
const done=FLOW.review(original,reviewed,post);
assert.equal(done.status,'OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION');
assert.equal(done.releaseAuthorized,false);
assert.equal(done.clientApprovalAuthenticated,false);
assert.throws(()=>FLOW.review(original,{...reviewed,tasks:reviewed.tasks.slice(1)},post),/count differs/);
assert.throws(()=>FLOW.review(original,{...reviewed,formTests:[...reviewed.formTests,...reviewed.formTests]},post),/duplicate form/);
assert.equal(FLOW.review(original,reviewed,{...post,disposition:'NOT-READY'}).status,
 'TECHNICAL-EVIDENCE-BLOCKED');
assert.throws(()=>FLOW.template(contract,upload,{...post,publishedVersion:8},summary,hashes),/differs/);
console.log('live first-site operator acceptance matrix smoke PASS (synthetic, no live network)');
