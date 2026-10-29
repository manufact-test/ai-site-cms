'use strict';
/* Offline shape/guardrail check, not a real client browser/form signoff. */
const assert=require('node:assert/strict');
const FLOW=require('../lib/first-site-live-acceptance.cjs');
const FOLLOW=require('../lib/first-site-live-followup.cjs');
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
 postDeployBlockingReasons:[],disposition:'TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED',
 publishedHost:'https://example.org'};
const summary={format:'manufact-seo-first-site-check-v1',siteId:'site-1',
 publishedVersion:7,sourceSiteSha256:c,ownerPublishedSourceRevisionClaim:8,
 release:{blockingGates:0,blockerIds:[]},forms:{markupObserved:1}};
const hashes={contract:e,candidate:a,summary:b,upload:c,post:d,bundle:e};
const bundle={format:'manufact-seo-review-bundle-v1',readOnly:true,siteId:'site-1',
 approvedSiteSource:{fileSha256:c},release:{blockers:[]},
 localPhpForms:{format:'manufact-seo-local-php-forms-v1',observedForms:1,
 consistentRelease:7,actualPostPerformed:false,deliveriesProven:false,
 pages:[{path:'/',expectedForms:0,actualForms:0,checkedFormSections:0,formInstances:[]},
 {path:'/contact/',expectedForms:1,actualForms:1,checkedFormSections:1,
  formInstances:[{sectionId:'contact-lead'}]}]}};
const original=FLOW.template(contract,upload,post,summary,hashes,bundle);
assert.equal(original.version,2);
assert.deepEqual(original.required.pages,['/','/contact/']);
assert.equal(original.required.browserChecks,6);
assert.deepEqual(original.required.formOccurrencesByPage,{'/':0,'/contact/':1});
assert.deepEqual(original.required.formRefsByPage,{'/':[],'/contact/':['contact-lead']});
assert.equal(original.pinned.originalPhpReviewBundleSha256,e);
const worksheet=FLOW.formWorksheet(original);
assert(worksheet.includes('contact-lead')&&worksheet.includes('Route /contact/'));
assert(!worksheet.includes('_token')&&!worksheet.includes('fake receipt'));
assert.throws(()=>FLOW.formWorksheet({...original,required:{...original.required,
 formRefsByPage:{'/':[],'/contact/':['unknown-id','other-id']}}}),/enumerate/);
assert.equal(original.tasks.length,6+FLOW.HOST_CHECKS.length);
assert.equal(FLOW.review(original,original,post).status,'HUMAN-EVIDENCE-INCOMPLETE');
const reviewed=JSON.parse(JSON.stringify(original));
for(const t of reviewed.tasks){
 t.state='passed';t.observedAt='2026-10-29';t.checkedBy='Lead';
 t.evidenceRef='private://browser-check';t.notes='';
}
assert.equal(FLOW.review(original,reviewed,post).status,'HUMAN-EVIDENCE-INCOMPLETE');
reviewed.formTests=[{page:'/contact/',formRef:'contact-lead',state:'passed',
 observedAt:'2026-10-29',checkedBy:'Lead',evidenceRef:'private://form-receipt',
 submissionEvidenceRef:'private://submitted-1',deliveryEvidenceRef:'private://delivered-1',
 deliveryChannel:'email',deliveryObservedAt:'2026-10-29',notes:''}];
const done=FLOW.review(original,reviewed,post);
assert.equal(done.status,'OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION');
assert.deepEqual(done.checks.perFormChecks,[{page:'/contact/',sectionId:'contact-lead',state:'passed'}]);
assert.equal(done.checks.submittedFormEvidenceReceipts,1);
assert.equal(done.checks.confirmedFormDeliveryReceipts,1);
assert.equal(done.releaseAuthorized,false);
assert.equal(FOLLOW.build(done).actions.length,1); // only independent owner authorization remains
assert.equal(FOLLOW.build(done).actions[0].id,'authorization:independent-owner-signoff');
assert.equal(FOLLOW.build(FLOW.review(original,original,post)).counts.browser,6);
assert.equal(FOLLOW.build(FLOW.review(original,original,post)).counts.form,1);
assert(FOLLOW.markdown(FOLLOW.build(done)).includes('NOT AUTHENTICATED'));
assert.throws(()=>FOLLOW.build({...done,checks:{...done.checks,perTaskChecks:[]}}),/totals/);
assert.throws(()=>FLOW.review(original,{...reviewed,formTests:[
 {...reviewed.formTests[0],deliveryEvidenceRef:reviewed.formTests[0].submissionEvidenceRef}]},post),/independent destination-side/);
assert.throws(()=>FLOW.review(original,{...reviewed,formTests:[
 {...reviewed.formTests[0],deliveryObservedAt:'2026-10-28'}]},post),/independent destination-side/);
assert.throws(()=>FLOW.review(original,{...reviewed,formTests:[
 {...reviewed.formTests[0],submissionEvidenceRef:''}]},post),/separate private submission/);
assert.throws(()=>FLOW.review(original,{...reviewed,formTests:[
 {...reviewed.formTests[0],formRef:'invented-form'}]},post),/exact observed PHP sectionId/);
assert.equal(done.clientApprovalAuthenticated,false);
assert.throws(()=>FLOW.review(original,{...reviewed,tasks:reviewed.tasks.slice(1)},post),/count differs/);
assert.throws(()=>FLOW.review(original,{...reviewed,formTests:[...reviewed.formTests,...reviewed.formTests]},post),/duplicate form/);
assert.equal(FLOW.review(original,reviewed,{...post,disposition:'NOT-READY'}).status,
 'TECHNICAL-EVIDENCE-BLOCKED');
assert.throws(()=>FLOW.template(contract,upload,{...post,publishedVersion:8},summary,hashes,bundle),/differs/);
assert.throws(()=>FLOW.template(contract,upload,post,summary,hashes,{
 ...bundle,localPhpForms:{...bundle.localPhpForms,
 pages:[{path:'/',expectedForms:1,actualForms:1,checkedFormSections:1,
  formInstances:[{sectionId:'home-lead'}]},
 {path:'/contact/',expectedForms:1,actualForms:1,checkedFormSections:1,
  formInstances:[{sectionId:'contact-lead'}]}]}}),/totals/);
assert.throws(()=>FLOW.review(original,{...reviewed,formTests:[
 {...reviewed.formTests[0],page:'/'}]},post),/does not correspond/);
const differentPage={...bundle,localPhpForms:{...bundle.localPhpForms,
 pages:[{path:'/',expectedForms:1,actualForms:1,checkedFormSections:1,
  formInstances:[{sectionId:'home-lead'}]},
 {path:'/contact/',expectedForms:0,actualForms:0,checkedFormSections:0,formInstances:[]}]}};
const homeForm=FLOW.template(contract,upload,post,summary,hashes,differentPage);
const badPage=JSON.parse(JSON.stringify(homeForm));
for(const t of badPage.tasks){
 t.state='passed';t.observedAt='2026-10-29';t.checkedBy='Lead';
 t.evidenceRef='private://browser-check';
}
badPage.formTests=[reviewed.formTests[0]];
assert.throws(()=>FLOW.review(homeForm,badPage,post),/does not correspond/);
// Two real lead forms on one page cannot be replaced by arbitrary receipts.
const twoBundle={...bundle,localPhpForms:{...bundle.localPhpForms,observedForms:2,
 pages:[{path:'/',expectedForms:0,actualForms:0,checkedFormSections:0,formInstances:[]},
 {path:'/contact/',expectedForms:2,actualForms:2,checkedFormSections:2,
  formInstances:[{sectionId:'contact-primary'},{sectionId:'contact-secondary'}]}]}};
const two=FLOW.template(contract,upload,post,{...summary,forms:{markupObserved:2}},hashes,twoBundle);
const half=JSON.parse(JSON.stringify(two));
for(const t of half.tasks){t.state='passed';t.observedAt='2026-10-29';
 t.checkedBy='Lead';t.evidenceRef='private://browser';}
half.formTests=[{...reviewed.formTests[0],formRef:'contact-primary'}];
assert.equal(FLOW.review(two,half,post).status,'HUMAN-EVIDENCE-INCOMPLETE');
assert.deepEqual(FLOW.review(two,half,post).checks.perFormChecks.map(x=>x.state),['passed','missing']);
assert.throws(()=>FLOW.review(two,{...half,formTests:[
 half.formTests[0],{...half.formTests[0],formRef:'invented-form'}]},post),/exact observed PHP sectionId/);
half.formTests.push({...half.formTests[0],formRef:'contact-secondary',
 submissionEvidenceRef:'private://submitted-2',deliveryEvidenceRef:'private://delivered-2'});
assert.equal(FLOW.review(two,half,post).status,'OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION');
console.log('live first-site operator acceptance matrix smoke PASS (synthetic, no live network)');
