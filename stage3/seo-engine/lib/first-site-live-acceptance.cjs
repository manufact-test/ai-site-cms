'use strict';
/* Public first-site human acceptance matrix pinned to a verified lead relay.
 * Human observations are operator assertions, NEVER publication authorization.
 */
const FORMAT='manufact-seo-first-site-live-acceptance-v1';
const RESULT='manufact-seo-first-site-live-acceptance-review-v1';
const CONTRACT='manufact-seo-first-site-lead-relay-v1';
const POST='manufact-seo-post-deploy-release-verification-v1';
const SHA=/^[a-f0-9]{64}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const HOST_CHECKS=[
 ['live-host-provenance','Lead independently checked HTTPS/TLS/DNS and live deployment provenance'],
 ['client-approved-visual','Client-approved design compared with rendered browser pages at all viewport sizes'],
 ['accessibility-and-interaction','Keyboard navigation, accessible controls, JS console and interactive flows checked'],
 ['privacy-and-consent','Privacy, cookies/consent, external dependencies and public content approved'],
 ['real-form-inventory','All deployed lead-form instances enumerated and real POST/delivery checked or none confirmed'],
 ['client-final-approval','Client explicitly accepted the exact published version and site journey'],
 ['rollback-and-owner','Owner confirmed rollback strategy, form persistence and publication responsibility']
];
function fail(reason){throw Error('Live first-site acceptance: '+reason)}
function requireThat(t,msg){if(!t)fail(msg)}
function date(s){if(typeof s!=='string'||!DATE.test(s))return false;
 const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
const pathForFile=file=>file==='index.html'?'/':
 file.endsWith('/index.html')?'/'+file.slice(0,-'index.html'.length):null;
function pagesFromUpload(upload){
 requireThat(upload&&upload.format==='manufact-seo-static-upload-bundle-v1'&&
  Array.isArray(upload.files),'verified public upload inventory is required');
 const pages=upload.files.filter(x=>x.kind==='html').map(x=>pathForFile(x.file));
 requireThat(pages.length>0&&pages.length<=60&&pages.every(x=>x!==null)&&
  new Set(pages).size===pages.length,'invalid or duplicated public page routes');
 return pages.sort();
}
function inputs(contract,upload,post,summary,hashes){
 requireThat(contract?.format===CONTRACT&&contract.readOnly===true&&
  contract.deploymentAuthorized===false&&
  contract.identity&&SHA.test(contract.identity.publicZipSha256||''),
  'source-bound lead integration contract is missing');
 requireThat(post?.format===POST&&post.siteId===contract.siteId&&
  post.publishedVersion===contract.identity.publishedVersion&&
  post.officialStaticManifestSha256===contract.identity.officialStaticManifestSha256&&
  post.candidatePublicZipSha256===contract.identity.publicZipSha256&&
  post.finalReleaseAuthorized===false,
  'post-deploy verification differs from lead contract or incorrectly authorizes release');
 requireThat(summary?.format==='manufact-seo-first-site-check-v1'&&
  summary.siteId===contract.siteId&&
  summary.publishedVersion===post.publishedVersion&&
  summary.sourceSiteSha256===contract.identity.sealedSiteSha256&&
  summary.ownerPublishedSourceRevisionClaim===contract.identity.claimedOwnerSourceRevision,
  'original localhost PHP summary does not match owner-published release identity');
 requireThat(upload.siteId===contract.siteId&&
  upload.publishedVersion===post.publishedVersion&&
  upload.officialStaticManifestSha256===contract.identity.officialStaticManifestSha256,
  'static public page map belongs to a different official release');
 requireThat(hashes&&['contract','candidate','summary','upload','post'].every(k=>SHA.test(hashes[k]||'')),
  'exact private input hashes are required');
 requireThat(contract.inputSha256?.candidate===hashes.candidate&&
  contract.inputSha256?.summary===hashes.summary&&
  contract.inputSha256?.upload===hashes.upload&&
  contract.inputSha256?.post===hashes.post,
  'source input bytes differ from the original lead relay; rebuild it');
 requireThat(Number.isSafeInteger(summary.release?.blockingGates)&&
  summary.release.blockingGates>=0&&summary.release.blockingGates<=contract.evidence.originalLocalBlockers&&
  contract.evidence.originalLocalBlockers===post.originalCandidateBlockingGates,
  'original technical blockers changed');
 requireThat(Number.isSafeInteger(summary.forms?.markupObserved)&&summary.forms.markupObserved>=0,
  'exact actual PHP form markup count is missing; cannot build all-form acceptance');
 const pages=pagesFromUpload(upload);
 return {pages,formOccurrences:summary.forms.markupObserved};
}
function task(id,kind,page,viewport,label){
 return {id,kind,page,viewport,label,state:'unreviewed',
  observedAt:null,checkedBy:'',evidenceRef:'',notes:''};
}
function template(contract,upload,post,summary,hashes){
 const {pages,formOccurrences}=inputs(contract,upload,post,summary,hashes);
 const tasks=[];
 for(const page of pages)for(const viewport of ['desktop','tablet','mobile'])
  tasks.push(task('page:'+page+':'+viewport,'browser',page,viewport,
   'Inspect published '+page+' at '+viewport+': design, interactions and accessibility'));
 for(const [id,label] of HOST_CHECKS)
  tasks.push(task('manual:'+id,'manual',null,null,label));
 return Object.freeze({format:FORMAT,version:1,siteId:contract.siteId,
  pinned:{contractSha256:hashes.contract,sourceSummarySha256:hashes.summary,
   publicUploadSha256:hashes.upload,postDeploySha256:hashes.post,
   publishedVersion:contract.identity.publishedVersion,
   sourceRevisionClaim:contract.identity.claimedOwnerSourceRevision,
   officialStaticManifestSha256:contract.identity.officialStaticManifestSha256,
   publicZipSha256:contract.identity.publicZipSha256},
  required:{pages,viewports:['desktop','tablet','mobile'],
   browserChecks:pages.length*3,manualChecks:HOST_CHECKS.length,
   observedPhpFormOccurrences:formOccurrences},
  tasks,formTests:[],
  limitations:[
   'These are human claims tied to an offline release, not authenticated browser recordings.',
   'All form instances need an actual authorized POST and notification/persistence receipt; never store POST bodies or tokens.',
   'Complete checkmarks alone NEVER authorize deployment, declare real client approval or override technical blockers.',
   'Store this private template and all evidence outside GitHub.']
 });
}
function reviewedTask(actual,reference){
 requireThat(actual&&actual.id===reference.id&&actual.kind===reference.kind&&
  actual.page===reference.page&&actual.viewport===reference.viewport&&
  actual.label===reference.label,'operator altered, added or reordered a required task');
 requireThat(['unreviewed','passed','failed'].includes(actual.state),'invalid manual task state');
 for(const key of ['checkedBy','evidenceRef','notes'])
  requireThat(typeof actual[key]==='string'&&actual[key].length<=
   (key==='notes'?500:key==='checkedBy'?120:240)&&!(/[\x00-\x1f]/.test(actual[key])),
   'invalid human note or evidence reference');
 if(actual.state!=='unreviewed'){
  requireThat(date(actual.observedAt)&&!!actual.checkedBy.trim()&&
   !!actual.evidenceRef.trim(),'human observation requires date, operator and private evidence reference');
  if(actual.state==='failed')requireThat(!!actual.notes.trim(),'failed human check needs explanation');
 }else{
  requireThat(actual.observedAt===null&&!actual.checkedBy&&!actual.evidenceRef&&!actual.notes,
   'unreviewed tasks must not contain fake observations');
 }
}
function review(original,filled,post){
 requireThat(original?.format===FORMAT&&filled?.format===FORMAT&&
  original.version===1&&filled.version===1&&
  JSON.stringify(original.pinned)===JSON.stringify(filled.pinned)&&
  JSON.stringify(original.required)===JSON.stringify(filled.required)&&
  filled.siteId===original.siteId,
  'edited human acceptance is stale or not tied to this exact public release');
 requireThat(Array.isArray(filled.tasks)&&filled.tasks.length===original.tasks.length,
  'per-page browser/manual check count differs from the source template');
 const expected=new Map(original.tasks.map(x=>[x.id,x])),seen=new Set();
 let passed=0,failed=0,pending=0;
 for(const t of filled.tasks){
  const x=expected.get(t?.id);
  requireThat(x&&!seen.has(t.id),'duplicate or unknown human check');
  seen.add(t.id);reviewedTask(t,x);
  if(t.state==='passed')passed++;
  else if(t.state==='failed')failed++;
  else pending++;
 }
 requireThat(Array.isArray(filled.formTests)&&filled.formTests.length<=300,
  'form POST receipt list must be a bounded operator input');
 const forms=new Set();let formPassed=0,formFailed=0;
 for(const f of filled.formTests){
  requireThat(f&&original.required.pages.includes(f.page)&&
   typeof f.formRef==='string'&&/^[a-z0-9][a-z0-9_-]{1,79}$/.test(f.formRef)&&
   ['passed','failed'].includes(f.state)&&date(f.observedAt)&&
   typeof f.checkedBy==='string'&&!!f.checkedBy.trim()&&f.checkedBy.length<=120&&
   typeof f.evidenceRef==='string'&&!!f.evidenceRef.trim()&&f.evidenceRef.length<=240&&
   typeof f.notes==='string'&&f.notes.length<=500&&
   !/[\x00-\x1f]/.test(f.evidenceRef+f.notes+f.checkedBy),
   'unsafe, incomplete or ungrounded real form POST observation');
  const id=f.page+'#'+f.formRef;
  requireThat(!forms.has(id),'duplicate form checks cannot count twice');
  forms.add(id);
  if(f.state==='passed')formPassed++;else formFailed++;
 }
 // PHP occurrences are an upper-bound work queue, not an authenticated unique
 // form-inventory. A manual inventory approval remains mandatory even when
 // checked count is large enough.
 const required=original.required.observedPhpFormOccurrences;
 const enoughForms=formPassed>=required&&!formFailed;
 const technicalMatched=post?.format===POST&&
  post.disposition==='TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED'&&
  !post.postDeployBlockingReasons?.length&&
  post.originalCandidateBlockingGates===0&&
  post.siteId===original.siteId&&
  post.officialStaticManifestSha256===original.pinned.officialStaticManifestSha256;
 const state=!technicalMatched?'TECHNICAL-EVIDENCE-BLOCKED':
  failed||formFailed?'HUMAN-OBSERVATIONS-FAILED':
  pending||!enoughForms?'HUMAN-EVIDENCE-INCOMPLETE':
  'OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION';
 return Object.freeze({format:RESULT,readOnly:true,siteId:original.siteId,
  sourceContractSha256:original.pinned.contractSha256,
  ownerSourceRevisionClaim:original.pinned.sourceRevisionClaim,
  publishedVersion:original.pinned.publishedVersion,
  officialStaticManifestSha256:original.pinned.officialStaticManifestSha256,
  status:state,
  checks:{required:original.tasks.length,passed,failed,pending,
   realFormOccurrencesExpected:required,operatorFormPostReceipts:filled.formTests.length,
   passedFormReceipts:formPassed,failedFormReceipts:formFailed,
   operatorFormInventorySigned:filled.tasks.some(x=>x.id==='manual:real-form-inventory'&&x.state==='passed')},
  originalTechnicalEvidenceMatched:technicalMatched,
  manualOnly:true,clientApprovalAuthenticated:false,actualNetworkCalls:0,
  cmsWrites:0,releaseAuthorized:false,
  warnings:['Live operator evidence is an assertion, not independent browser/TLS/POST authentication.',
   'Owner must verify each private receipt independently, then manually authorize or reject the exact release.',
   'Changing the owner-published revision, ZIP or public host requires new source-bound evidence.']});
}
function markdown(r){
 requireThat(r?.format===RESULT,'review summary format is invalid');
 return ['# First-site real-world human acceptance review','',
 'Site: '+r.siteId,'Published version: '+r.publishedVersion,
 'Disposition: **'+r.status+'**','',
 'Browser/manual checks: '+r.checks.passed+' passed, '+r.checks.failed+' failed, '+
  r.checks.pending+' awaiting evidence.',
 'Real form POST receipts: '+r.checks.passedFormReceipts+' passed / '+
  r.checks.realFormOccurrencesExpected+' actual PHP occurrences expected.',
 'Independent live technical evidence matched: '+r.originalTechnicalEvidenceMatched,
 'Owner manual final authorization: NOT PROVIDED BY THIS TOOL.','',
 '## Reminders','',
 ...r.warnings.map(x=>'- '+x),'',
 'Never copy private URLs, test submissions, recipient addresses or HMAC values into the repository.',''
 ].join('\n');
}
module.exports=Object.freeze({FORMAT,RESULT,HOST_CHECKS,pagesFromUpload,template,review,markdown});
