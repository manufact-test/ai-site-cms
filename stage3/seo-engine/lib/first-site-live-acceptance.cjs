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
function inputs(contract,upload,post,summary,hashes,bundle){
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
 requireThat(bundle?.format==='manufact-seo-review-bundle-v1'&&bundle.readOnly===true&&
  bundle.siteId===summary.siteId&&bundle.approvedSiteSource?.fileSha256===summary.sourceSiteSha256&&
  Array.isArray(bundle.release?.blockers)&&
  bundle.release.blockers.length===summary.release.blockingGates&&
  JSON.stringify(bundle.release.blockers.map(x=>x.gateId).sort())===
   JSON.stringify(summary.release.blockerIds.slice().sort())&&
  SHA.test(hashes.bundle||''),
  'original SHA256-pinned local PHP review bundle is required for per-page form coverage');
 const forms=bundle.localPhpForms;
 requireThat(forms?.format==='manufact-seo-local-php-forms-v1'&&
  Array.isArray(forms.pages)&&forms.pages.length===pages.length&&
  forms.observedForms===summary.forms.markupObserved&&
  (forms.consistentRelease===null||forms.consistentRelease===summary.publishedVersion)&&
  forms.actualPostPerformed===false&&forms.deliveriesProven===false,
  'actual PHP per-page form inventory differs from original published technical summary');
 const byPage=new Map(),refsByPage=new Map();
 for(const p of forms.pages){
  requireThat(p&&pages.includes(p.path)&&!byPage.has(p.path)&&
   Number.isSafeInteger(p.actualForms)&&p.actualForms>=0&&p.actualForms<=40&&
   Number.isSafeInteger(p.expectedForms)&&p.expectedForms>=0&&p.expectedForms<=40&&
   Number.isSafeInteger(p.checkedFormSections)&&p.checkedFormSections>=0,
   'local PHP form inventory contains an invalid or duplicated public route');
  // A count cannot authenticate WHICH of multiple forms the operator checked.
  // Require that every observed HTML form has a unique, source-bound section ID.
  requireThat(p.expectedForms===p.actualForms&&p.checkedFormSections===p.actualForms&&
   Array.isArray(p.formInstances)&&p.formInstances.length===p.actualForms&&
   p.formInstances.every(x=>x&&typeof x.sectionId==='string'&&
    /^[a-z][a-z0-9-]{2,79}$/.test(x.sectionId))&&
   new Set(p.formInstances.map(x=>x.sectionId)).size===p.actualForms,
   'PHP lead form identities are incomplete, duplicated or differ from the observed page; fix technical drift first');
  byPage.set(p.path,p.actualForms);
  refsByPage.set(p.path,p.formInstances.map(x=>x.sectionId).sort());
 }
 requireThat([...byPage.values()].reduce((a,n)=>a+n,0)===forms.observedForms,
  'actual PHP per-page form totals differ from aggregate report');
 return {pages,formOccurrences:summary.forms.markupObserved,
  formOccurrencesByPage:Object.fromEntries([...byPage].sort(([a],[b])=>a.localeCompare(b))),
  formRefsByPage:Object.fromEntries([...refsByPage].sort(([a],[b])=>a.localeCompare(b)))};
}
function task(id,kind,page,viewport,label){
 return {id,kind,page,viewport,label,state:'unreviewed',
  observedAt:null,checkedBy:'',evidenceRef:'',notes:''};
}
function template(contract,upload,post,summary,hashes,bundle){
 const {pages,formOccurrences,formOccurrencesByPage,formRefsByPage}=
  inputs(contract,upload,post,summary,hashes,bundle);
 const tasks=[];
 for(const page of pages)for(const viewport of ['desktop','tablet','mobile'])
  tasks.push(task('page:'+page+':'+viewport,'browser',page,viewport,
   'Inspect published '+page+' at '+viewport+': design, interactions and accessibility'));
 for(const [id,label] of HOST_CHECKS)
  tasks.push(task('manual:'+id,'manual',null,null,label));
 return Object.freeze({format:FORMAT,version:2,siteId:contract.siteId,
  pinned:{contractSha256:hashes.contract,sourceSummarySha256:hashes.summary,
   publicUploadSha256:hashes.upload,postDeploySha256:hashes.post,
   originalPhpReviewBundleSha256:hashes.bundle,
   publishedVersion:contract.identity.publishedVersion,
   sourceRevisionClaim:contract.identity.claimedOwnerSourceRevision,
   officialStaticManifestSha256:contract.identity.officialStaticManifestSha256,
   publicZipSha256:contract.identity.publicZipSha256,
   observedPublicHttpsHostClaim:post.publishedHost},
  required:{pages,viewports:['desktop','tablet','mobile'],
   browserChecks:pages.length*3,manualChecks:HOST_CHECKS.length,
   observedPhpFormOccurrences:formOccurrences,formOccurrencesByPage,formRefsByPage},
  tasks,formTests:[],
  limitations:[
   'These are human claims tied to an offline release, not authenticated browser recordings.',
   'Each formTests.formRef must match a real sectionId in required.formRefsByPage[page], never an arbitrary label.',
   'Every passed form requires TWO distinct PRIVATE evidence references: submitted test POST and independently confirmed delivery or persistence.',
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
  original.version===2&&filled.version===2&&
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
 const forms=new Set(),formCountByPage=new Map();let formPassed=0,formFailed=0;
 const DELIVERY=['email','telegram','persistence','webhook','other'];
 const safeRef=v=>typeof v==='string'&&v.length>=3&&v.length<=240&&
  !/[\x00-\x1f<>]/.test(v)&&!!v.trim();
 for(const f of filled.formTests){
  requireThat(f&&original.required.pages.includes(f.page)&&
   typeof f.formRef==='string'&&/^[a-z0-9][a-z0-9_-]{1,79}$/.test(f.formRef)&&
   ['passed','failed'].includes(f.state)&&date(f.observedAt)&&
   typeof f.checkedBy==='string'&&!!f.checkedBy.trim()&&f.checkedBy.length<=120&&
   typeof f.evidenceRef==='string'&&!!f.evidenceRef.trim()&&f.evidenceRef.length<=240&&
   typeof f.notes==='string'&&f.notes.length<=500&&
   !/[\x00-\x1f]/.test(f.evidenceRef+f.notes+f.checkedBy),
   'unsafe, incomplete or ungrounded real form POST observation');
  // Separately attest actual submission and destination-side delivery/persistence.
  // References must be opaque PRIVATE evidence labels; never POST bodies or tokens.
  requireThat(safeRef(f.submissionEvidenceRef),
   'real form POST requires a separate private submission receipt');
  if(f.state==='passed'){
   requireThat(safeRef(f.deliveryEvidenceRef)&&f.deliveryEvidenceRef!==f.submissionEvidenceRef&&
    DELIVERY.includes(f.deliveryChannel)&&date(f.deliveryObservedAt)&&
    f.deliveryObservedAt>=f.observedAt,
    'passed form requires independent destination-side delivery proof, channel and non-earlier date');
  }else requireThat((f.deliveryEvidenceRef===undefined||f.deliveryEvidenceRef==='')&&
   (f.deliveryChannel===undefined||f.deliveryChannel==='none')&&
   (f.deliveryObservedAt===undefined||f.deliveryObservedAt===null),
   'failed form cannot assert confirmed delivery; record failure in notes');
  const id=f.page+'#'+f.formRef;
  requireThat(!forms.has(id),'duplicate form checks cannot count twice');
  requireThat(original.required.formOccurrencesByPage[f.page]>0,
   'real POST observation does not correspond to a form on this published PHP page');
  requireThat(original.required.formRefsByPage[f.page]?.includes(f.formRef),
   'real POST formRef must identify the exact observed PHP sectionId on this page');
  forms.add(id);
  if(f.state==='passed'){
   formPassed++;
   formCountByPage.set(f.page,(formCountByPage.get(f.page)||0)+1);
  }else formFailed++;
 }
 // PHP occurrences are an upper-bound work queue, not an authenticated unique
 // form-inventory. A manual inventory approval remains mandatory even when
 // checked count is large enough.
 const required=original.required.observedPhpFormOccurrences;
 const missingFormPages=Object.entries(original.required.formOccurrencesByPage)
  .filter(([page,count])=>(formCountByPage.get(page)||0)<count)
  .map(([page,count])=>({page,expected:count,passed:formCountByPage.get(page)||0}));
 requireThat(Object.entries(original.required.formOccurrencesByPage).every(([page,count])=>
  (formCountByPage.get(page)||0)<=count),
  'real POST receipts exceed observed published PHP forms on a page');
 const enoughForms=!missingFormPages.length&&!formFailed;
 // Non-sensitive per-form map, created from original PHP audit and manual receipts.
 const outcome=new Map(filled.formTests.map(x=>[x.page+'#'+x.formRef,x.state]));
 const perFormChecks=Object.entries(original.required.formRefsByPage).flatMap(([page,refs])=>
  refs.map(sectionId=>({page,sectionId,state:outcome.get(page+'#'+sectionId)||'missing'})));
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
  observedPublicHttpsHostClaim:original.pinned.observedPublicHttpsHostClaim,
  status:state,
  checks:{required:original.tasks.length,passed,failed,pending,
   perTaskChecks:original.tasks.map(x=>{
    const value=filled.tasks.find(t=>t.id===x.id);
    return {id:x.id,kind:x.kind,page:x.page,viewport:x.viewport,state:value.state};
   }),
   realFormOccurrencesExpected:required,operatorFormPostReceipts:filled.formTests.length,
   passedFormReceipts:formPassed,failedFormReceipts:formFailed,
   submittedFormEvidenceReceipts:filled.formTests.length,
   confirmedFormDeliveryReceipts:formPassed,
   missingFormPages,perFormChecks,
   perPageFormReceipts:Object.fromEntries([...formCountByPage].sort()),
   operatorFormInventorySigned:filled.tasks.some(x=>x.id==='manual:real-form-inventory'&&x.state==='passed')},
  originalTechnicalEvidenceMatched:technicalMatched,
  manualOnly:true,clientApprovalAuthenticated:false,actualNetworkCalls:0,
  cmsWrites:0,releaseAuthorized:false,
  warnings:['Live operator evidence is an assertion, not independent browser/TLS/POST authentication.',
   'Owner must verify each private receipt independently, then manually authorize or reject the exact release.',
   'Changing the owner-published revision, ZIP or public host requires new source-bound evidence.']});
}
function formWorksheet(t){
 requireThat(t?.format===FORMAT&&t.version===2&&t.required&&
  Array.isArray(t.required.pages)&&
  t.required.formRefsByPage&&typeof t.required.formRefsByPage==='object',
  'private form worksheet requires original source-bound live template');
 const rows=t.required.pages.flatMap(page=>{
  const refs=t.required.formRefsByPage[page];
  requireThat(Array.isArray(refs)&&refs.length===t.required.formOccurrencesByPage[page]&&
   new Set(refs).size===refs.length&&refs.every(x=>/^[a-z][a-z0-9-]{2,79}$/.test(x)),
   'private worksheet cannot enumerate exact source-backed forms');
  return refs.map(sectionId=>({page,sectionId}));
 });
 requireThat(rows.length===t.required.observedPhpFormOccurrences,
  'private worksheet differs from original PHP form count');
 const lines=['# Source-bound live form POST worksheet','',
  'Site ID: '+t.siteId,
  'Original public ZIP SHA256: '+t.pinned.publicZipSha256,
  'Original PHP audit bundle SHA256: '+t.pinned.originalPhpReviewBundleSha256,
  'Total forms needing separate real POST and delivery receipts: '+rows.length,'',
  'This is an UNFILLED operator checklist, not evidence that any POST/delivery happened.',
  'Do not store customer data, form body, HMAC, email address, tokens or private recipient information here.',''];
 if(!rows.length)lines.push('No lead forms were found in the hash-checked local PHP pages. Still complete all browser/manual checks.','');
 for(const {page,sectionId} of rows){
  lines.push('## Route '+page+' | sectionId '+sectionId,'',
   '- [ ] Open exact deployed HTTPS page and identify the form by original sectionId.',
   '- [ ] Submit an explicitly authorized non-sensitive test POST with required consent.',
   '- [ ] Verify correct response, validation and user-visible success/error state.',
   '- [ ] Independently verify the expected persistence/notification/delivery receipt.',
   '- [ ] Record separate private submissionEvidenceRef for the actual POST request.',
   '- [ ] Record independent deliveryEvidenceRef, deliveryChannel and deliveryObservedAt after checking inbox/Telegram/persistence.',
   '- [ ] Record operator, observation date and private evidence reference OUTSIDE GitHub.',
   '- [ ] Add a formTests[] record using exactly page='+page+
    ' and formRef='+sectionId+' in the private filled acceptance JSON.','');
 }
 lines.push('A checked box in this worksheet does not authenticate delivery or authorize release.',
  'The lead must independently validate the actual receipts and receive client approval.','');
 return lines.join('\n');
}
function markdown(r){
 requireThat(r?.format===RESULT,'review summary format is invalid');
 return ['# First-site real-world human acceptance review','',
 'Site: '+r.siteId,'Published version: '+r.publishedVersion,
 'Operator-reported HTTPS host: '+(r.observedPublicHttpsHostClaim||'UNKNOWN'),
 'Disposition: **'+r.status+'**','',
 'Browser/manual checks: '+r.checks.passed+' passed, '+r.checks.failed+' failed, '+
  r.checks.pending+' awaiting evidence.',
 'Independently asserted destination delivery confirmations: '+r.checks.confirmedFormDeliveryReceipts+'.',
 'Actual POST submission evidence references: '+r.checks.submittedFormEvidenceReceipts+'.',
 'Real form POST receipts: '+r.checks.passedFormReceipts+' passed / '+
  r.checks.realFormOccurrencesExpected+' actual PHP occurrences expected.',
 'Pages with missing actual form receipts: '+r.checks.missingFormPages.length+
  (r.checks.missingFormPages.length?' ('+
    r.checks.missingFormPages.map(x=>x.page+' '+x.passed+'/'+x.expected).join('; ')+')':''),
 'Individual PHP forms still missing POST: '+
  r.checks.perFormChecks.filter(x=>x.state==='missing').map(x=>x.page+'#'+x.sectionId).join(', '),
 'Individual PHP forms with failed POST: '+
  r.checks.perFormChecks.filter(x=>x.state==='failed').map(x=>x.page+'#'+x.sectionId).join(', '),
 'Independent live technical evidence matched: '+r.originalTechnicalEvidenceMatched,
 'Owner manual final authorization: NOT PROVIDED BY THIS TOOL.','',
 '## Reminders','',
 ...r.warnings.map(x=>'- '+x),'',
 'Never copy private URLs, test submissions, recipient addresses or HMAC values into the repository.',''
 ].join('\n');
}
module.exports=Object.freeze({FORMAT,RESULT,HOST_CHECKS,pagesFromUpload,template,review,formWorksheet,markdown});
