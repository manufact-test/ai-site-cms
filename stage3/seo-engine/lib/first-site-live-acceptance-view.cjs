'use strict';
/* Private read-only human acceptance status inside the established SEO workspace.
 * The source is a manually completed report; never authorize public release.
 */
const REPORT='manufact-seo-first-site-live-acceptance-review-v1';
const CONTRACT='manufact-seo-first-site-lead-relay-v1';
const sha=/^[a-f0-9]{64}$/;
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(review,contract,contractSha,first,firstSha,postSha){
 if(!review||review.format!==REPORT||!contract||contract.format!==CONTRACT||
  contract.readOnly!==true||contract.deploymentAuthorized!==false||
  !sha.test(contractSha||'')||!sha.test(firstSha||'')||!sha.test(postSha||'')||
  review.sourceContractSha256!==contractSha||
  review.siteId!==first?.summary?.siteId||review.siteId!==contract.siteId||
  review.publishedVersion!==first.summary.publishedVersion||
  review.officialStaticManifestSha256!==first.summary.staticExport?.staticManifestSha256||
  review.observedPublicHttpsHostClaim!==first.postDeploy?.publishedHost||
  review.officialStaticManifestSha256!==contract.identity?.officialStaticManifestSha256||
  review.ownerSourceRevisionClaim!==first.summary.ownerPublishedSourceRevisionClaim||
  contract.inputSha256?.summary!==firstSha||contract.inputSha256?.post!==postSha||
  contract.evidence?.originalLocalBlockers!==first.postDeploy?.originalCandidateBlockingGates||
  first.postDeploy?.officialStaticManifestSha256!==review.officialStaticManifestSha256||
  contract.identity?.publicZipSha256!==first.postDeploy?.candidatePublicZipSha256||
  review.releaseAuthorized!==false||review.clientApprovalAuthenticated!==false||
  !['TECHNICAL-EVIDENCE-BLOCKED','HUMAN-OBSERVATIONS-FAILED',
   'HUMAN-EVIDENCE-INCOMPLETE','OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION'].includes(review.status)||
  !review.checks||!Number.isSafeInteger(review.checks.required)||
  !Number.isSafeInteger(review.checks.passed)||!Number.isSafeInteger(review.checks.pending)||
  !Number.isSafeInteger(review.checks.failed)||
  review.checks.passed+review.checks.pending+review.checks.failed!==review.checks.required||
  !['realFormOccurrencesExpected','operatorFormPostReceipts','passedFormReceipts',
     'failedFormReceipts'].every(k=>Number.isSafeInteger(review.checks[k])&&review.checks[k]>=0)||
  review.checks.operatorFormPostReceipts!==review.checks.passedFormReceipts+
    review.checks.failedFormReceipts||
  !Array.isArray(review.checks.missingFormPages)||
  !review.checks.perPageFormReceipts||
  typeof review.checks.perPageFormReceipts!=='object'||
  review.originalTechnicalEvidenceMatched!==
   (first.postDeploy.disposition==='TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED'&&
    first.postDeploy.originalCandidateBlockingGates===0&&
    !first.postDeploy.postDeployBlockingReasons?.length)||
  review.status==='OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION'&&(
   first.postDeploy.disposition!=='TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED'||
   review.checks.pending>0||review.checks.failed>0||
   review.checks.operatorFormInventorySigned!==true||
   review.checks.failedFormReceipts>0||
   review.checks.passedFormReceipts<review.checks.realFormOccurrencesExpected))
  throw Error('Human acceptance cannot be combined with a different release, original evidence or false authorization');
 const sourceForms=first.bundle?.localPhpForms;
 if(first.bundle?.format!=='manufact-seo-review-bundle-v1'||
  first.bundle.readOnly!==true||first.bundle.siteId!==review.siteId||
  first.bundle.approvedSiteSource?.fileSha256!==first.summary.sourceSiteSha256||
  sourceForms?.format!=='manufact-seo-local-php-forms-v1'||
  !Array.isArray(sourceForms.pages)||sourceForms.observedForms!==
   review.checks.realFormOccurrencesExpected)
  throw Error('Human acceptance requires original verified PHP bundle to audit real POSTs per page');
 const formRows=[],known=new Set(),missing=[],expectedFormKeys=new Set();
 let observed=0,reported=0;
 for(const p of sourceForms.pages){
  const count=review.checks.perPageFormReceipts[p.path]||0;
  if(known.has(p.path)||!Number.isSafeInteger(p.actualForms)||p.actualForms<0||
   !Number.isSafeInteger(count)||count<0||count>p.actualForms)
   throw Error('Human acceptance per-page form numbers differ from original PHP source');
  if(!Array.isArray(p.formInstances)||p.formInstances.length!==p.actualForms)
   throw Error('Original PHP form section inventory is incomplete');
  for(const f of p.formInstances){
   const sectionId=f?.sectionId,key=p.path+'#'+sectionId;
   if(typeof sectionId!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(sectionId)||
    expectedFormKeys.has(key))throw Error('Original PHP form section identity is duplicated or invalid');
   expectedFormKeys.add(key);
  }
  known.add(p.path);observed+=p.actualForms;reported+=count;
  formRows.push({path:p.path,expected:p.actualForms,passed:count});
  if(count<p.actualForms)missing.push({page:p.path,expected:p.actualForms,passed:count});
 }
 if(observed!==review.checks.realFormOccurrencesExpected||
  reported!==review.checks.passedFormReceipts||
  Object.keys(review.checks.perPageFormReceipts).some(p=>!known.has(p))||
  JSON.stringify(missing.sort((a,b)=>a.page.localeCompare(b.page)))!==
   JSON.stringify(review.checks.missingFormPages.slice().sort((a,b)=>a.page.localeCompare(b.page))))
  throw Error('Reported missing real form tests do not match the source PHP page inventory');
 // Verify each private report item against the source-bound PHP section inventory.
 const perForm=review.checks.perFormChecks;
 if(!Array.isArray(perForm)||perForm.length!==expectedFormKeys.size)
  throw Error('Individual form receipts do not cover original PHP form sections');
 const seenForms=new Set(),passedPerPage=new Map();let failedForms=0,missingForms=0;
 for(const x of perForm){
  const key=x?.page+'#'+x?.sectionId;
  if(!expectedFormKeys.has(key)||seenForms.has(key)||
   !['passed','failed','missing'].includes(x.state))
   throw Error('Individual form receipt has unknown, duplicate or invalid source section');
  seenForms.add(key);
  if(x.state==='passed')passedPerPage.set(x.page,(passedPerPage.get(x.page)||0)+1);
  else if(x.state==='failed')failedForms++;
  else missingForms++;
 }
 if(failedForms!==review.checks.failedFormReceipts||
  missingForms+failedForms+review.checks.passedFormReceipts!==observed||
  [...known].some(page=>(passedPerPage.get(page)||0)!==(review.checks.perPageFormReceipts[page]||0)))
  throw Error('Individual form receipts conflict with aggregate operator claims');
 const technicalMatched=first.postDeploy.disposition==='TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED'&&
  first.postDeploy.originalCandidateBlockingGates===0&&
  first.postDeploy.postDeployBlockingReasons.length===0;
 const expectedStatus=!technicalMatched?'TECHNICAL-EVIDENCE-BLOCKED':
  review.checks.failed||review.checks.failedFormReceipts?'HUMAN-OBSERVATIONS-FAILED':
  review.checks.pending||missing.length?
   'HUMAN-EVIDENCE-INCOMPLETE':'OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION';
 if(review.status!==expectedStatus)
  throw Error('Human acceptance summary claims a status unsupported by the technical or operator evidence counts');
 const facts=[
  ['Observed browser/manual checks',review.checks.required],
  ['Operator-declared passed',review.checks.passed],
  ['Failed',review.checks.failed],
  ['Not reviewed',review.checks.pending],
  ['Actual PHP form occurrences (minimum)',review.checks.realFormOccurrencesExpected],
  ['Operator real POST receipts passed',review.checks.passedFormReceipts],
  ['Operator real POST receipts failed',review.checks.failedFormReceipts]
 ];
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT — Private Human Launch Acceptance</title>'+
  '<style>:root{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#173445;background:#f3f7fa}*{box-sizing:border-box}body{margin:0}main{max-width:950px;margin:auto;padding:26px}header{background:#143e4c;color:white;padding:32px;border-radius:18px}h1{line-height:1.2}header p{color:#cfe3e8}section{border:1px solid #d7e4ea;background:white;border-radius:14px;margin-top:17px;padding:22px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.fact{padding:15px;border:1px solid #e0e8ed;border-radius:10px}.fact small{display:block;color:#607480}.fact b{font-size:24px}.status{font-weight:800;color:#ffc978;overflow-wrap:anywhere}p,li{line-height:1.65}a{color:#08796d}@media(max-width:600px){main{padding:12px}header{padding:24px}}</style>'+
  '</head><body><main><header><p>MANUFACT · OWNER-ONLY REVIEW</p>'+
  '<h1>Human First-Site Acceptance</h1><p>Site '+esc(review.siteId)+
  ' · Owner-reported version '+esc(review.publishedVersion)+
  ' · Operator-reported HTTPS host '+esc(review.observedPublicHttpsHostClaim)+'</p><p class="status">'+
  esc(review.status)+'</p></header><section><h2>Operator evidence counts</h2><div class="grid">'+
  facts.map(([k,v])=>'<div class="fact"><small>'+esc(k)+'</small><b>'+esc(v)+'</b></div>').join('')+
  '</div></section><section><h2>PHP forms by published page</h2><p>Counts below are source-bound operator claims, not a proof of POST delivery.</p>'+
  '<div class="grid">'+
  formRows.filter(x=>x.expected>0).map(x=>
   '<div class="fact"><small>'+esc(x.path)+'</small><b>'+esc(x.passed)+' / '+esc(x.expected)+'</b></div>').join('')+
  (formRows.every(x=>x.expected===0)?'<p>No PHP lead forms were observed in the pinned source.</p>':'')+
  '</div></section><section><h2>Individual PHP lead forms</h2><p>These are original source sections. Outcomes remain human assertions, not delivery proof.</p><div class="grid">'+
  perForm.map(x=>'<div class="fact"><small>'+esc(x.page)+'</small><div>'+esc(x.sectionId)+'</div><b>'+esc(x.state.toUpperCase())+'</b></div>').join('')+
  (perForm.length?'':'<p>No original lead forms observed.</p>')+
  '</div></section><section><h2>What remains independent of this report</h2><ul>'+
  '<li>The owner/lead must authenticate the original client signature, browser recordings, TLS/host and real submitted form receipts.</li>'+
  '<li>Human checkmarks cannot close original PHP/HTTPS technical blockers or authorize publishing.</li>'+
  '<li>Every changed CMS revision, official ZIP or public host requires a fresh checked release and evidence.</li>'+
  '</ul><p>Source-bound report: '+esc(review.sourceContractSha256)+
  '</p><p><a href="index.html">Back to private SEO workspace</a></p></section>'+
  '</main></body></html>';
 return Object.freeze({siteId:review.siteId,status:review.status,html,
  summary:{required:review.checks.required,passed:review.checks.passed,
   pending:review.checks.pending,failed:review.checks.failed,
   realFormReceipts:review.checks.passedFormReceipts,releaseAuthorized:false}});
}
module.exports=Object.freeze({render});
