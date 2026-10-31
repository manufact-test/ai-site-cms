'use strict';
/* One cohesive Node smoke for first-site private manual acceptance, not real HTTPS/POST. */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const FLOW=require('../lib/first-site-live-acceptance.cjs');
const NEXT=require('../lib/first-site-live-followup.cjs');
const DESK=require('../lib/first-site-live-acceptance-editor.cjs');
const VIEW=require('../lib/first-site-live-acceptance-view.cjs');
const hash=x=>x.repeat(64),site='site-demo';
const candidate=hash('a'),manifest=hash('b'),sealed=hash('c'),
 uploadSha=hash('d'),postSha=hash('e'),contractSha=hash('f'),bundleSha=hash('1');
const contract={format:'manufact-seo-first-site-lead-relay-v1',readOnly:true,
 deploymentAuthorized:false,siteId:site,
 identity:{publicZipSha256:candidate,publishedVersion:6,
  claimedOwnerSourceRevision:7,officialStaticManifestSha256:manifest,
  sealedSiteSha256:sealed},
 inputSha256:{candidate,summary:manifest,upload:uploadSha,post:postSha},
 evidence:{originalLocalBlockers:0}};
const upload={format:'manufact-seo-static-upload-bundle-v1',siteId:site,publishedVersion:6,
 officialStaticManifestSha256:manifest,files:[
 {file:'index.html',kind:'html'},{file:'contact/index.html',kind:'html'}]};
const post={format:'manufact-seo-post-deploy-release-verification-v1',siteId:site,
 publishedVersion:6,officialStaticManifestSha256:manifest,
 candidatePublicZipSha256:candidate,finalReleaseAuthorized:false,
 originalCandidateBlockingGates:0,postDeployBlockingReasons:[],
 disposition:'TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED',
 publishedHost:'https://example.org'};
const summary={format:'manufact-seo-first-site-check-v1',siteId:site,
 publishedVersion:6,sourceSiteSha256:sealed,ownerPublishedSourceRevisionClaim:7,
 staticExport:{staticManifestSha256:manifest},release:{blockingGates:0,blockerIds:[]},
 forms:{markupObserved:2}};
const hashes={contract:contractSha,candidate,summary:manifest,upload:uploadSha,
 post:postSha,bundle:bundleSha};
const bundle={format:'manufact-seo-review-bundle-v1',readOnly:true,siteId:site,
 approvedSiteSource:{fileSha256:sealed},release:{blockers:[]},
 localPhpForms:{format:'manufact-seo-local-php-forms-v1',observedForms:2,
 consistentRelease:6,actualPostPerformed:false,deliveriesProven:false,
 pages:[{path:'/',actualForms:0,expectedForms:0,checkedFormSections:0,
  formInstances:[]},
 {path:'/contact/',actualForms:2,expectedForms:2,checkedFormSections:2,
  formInstances:[{sectionId:'contact-primary'},{sectionId:'contact-secondary'}]}]}};
const t=FLOW.template(contract,upload,post,summary,hashes,bundle);
assert.equal(t.version,2);
const desk=DESK.render(t);
const script=desk.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script);
const expectedSha=crypto.createHash('sha256').update(script,'utf8').digest('base64');
assert(desk.includes("sha256-"+expectedSha));
assert(desk.includes('connect-src &#39;none&#39;'));
assert(desk.includes('contact-primary')&&desk.includes('contact-secondary'));
assert(desk.includes('Import prior private draft'));
const reviewed=JSON.parse(JSON.stringify(t));
reviewed.tasks.forEach(x=>{x.state='passed';x.observedAt='2026-10-30';
 x.checkedBy='Owner';x.evidenceRef='private://manual';});
const form=(id,i)=>({page:'/contact/',formRef:id,state:'passed',
 observedAt:'2026-10-30',checkedBy:'Owner',evidenceRef:'private://review-'+i,
 submissionEvidenceRef:'private://sent-'+i,
 deliveryEvidenceRef:'private://delivered-'+i,
 deliveryChannel:'persistence',deliveryObservedAt:'2026-10-30',notes:''});
reviewed.formTests=[form('contact-primary',1),form('contact-secondary',2)];
const good=FLOW.review(t,reviewed,post);
assert.equal(good.status,'OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION');
assert.equal(good.releaseAuthorized,false);
assert.equal(good.checks.confirmedFormDeliveryReceipts,2);
const first={summary,bundle,postDeploy:post,summarySha:manifest,postDeploySha:postSha};
const humanHtml=VIEW.render(good,contract,contractSha,first,manifest,postSha).html;
assert(humanHtml.includes('Individual PHP lead forms'));
assert(humanHtml.includes('contact-primary'));
const next=NEXT.build(good);
assert.equal(next.actions.length,1);
assert.equal(next.actions[0].id,'authorization:independent-owner-signoff');
assert.equal(next.releaseAuthorized,false);
const failed=JSON.parse(JSON.stringify(reviewed));
failed.formTests[0]={...failed.formTests[0],state:'failed',notes:'Click did not trigger POST',
 submissionEvidenceRef:'',deliveryEvidenceRef:'',deliveryChannel:'none',
 deliveryObservedAt:null};
failed.formTests.splice(1,1);
const failResult=FLOW.review(t,failed,post);
assert.equal(failResult.status,'HUMAN-OBSERVATIONS-FAILED');
assert.equal(failResult.checks.operatorFormObservations,1);
assert.equal(failResult.checks.operatorFormPostReceipts,0);
assert.equal(NEXT.build(failResult).counts.urgent,1);
assert.equal(NEXT.build(failResult).counts.form,2);
assert(VIEW.render(failResult,contract,contractSha,first,manifest,postSha)
 .html.includes('Unresolved browser and manual checks'));
assert.throws(()=>FLOW.review(t,{...reviewed,formTests:[
 {...reviewed.formTests[0],deliveryEvidenceRef:'private://sent-1'},
 reviewed.formTests[1]]},post),/independent destination-side/);
assert.throws(()=>VIEW.render({...good,checks:{...good.checks,
 perTaskChecks:good.checks.perTaskChecks.slice(1)}},contract,contractSha,first,
 manifest,postSha),/browser and manual tasks/);
console.log('first-site private acceptance E2E synthetic smoke PASS; NO client network calls');
