'use strict';
/* Deterministic human work queue over source-bound review outcomes.
 * No PII, credentials, raw HTTP replies or user-supplied evidence references.
 */
const REVIEW='manufact-seo-first-site-live-acceptance-review-v1';
const FORMAT='manufact-seo-first-site-live-followup-v1';
const CHECKS=require('./first-site-live-acceptance.cjs').HOST_CHECKS;
const MANUAL=new Set(CHECKS.map(x=>'manual:'+x[0]));
const DEVICES=['desktop','tablet','mobile'];
function fail(msg){throw Error('Live human follow-up: '+msg)}
function valid(report){
 if(report?.format!==REVIEW||report.readOnly!==true||report.releaseAuthorized!==false||
  report.clientApprovalAuthenticated!==false||!report.checks||
  !Array.isArray(report.checks.perTaskChecks)||!Array.isArray(report.checks.perFormChecks))
  fail('requires original source-bound non-authorizing live review');
 const {perTaskChecks:tasks,perFormChecks:forms}=report.checks;
 const seen=new Set(),seenForm=new Set(),counts={passed:0,failed:0,unreviewed:0};
 for(const x of tasks){
  if(!x||typeof x.id!=='string'||seen.has(x.id)||
   !['passed','failed','unreviewed'].includes(x.state))fail('unknown/duplicate task or status');
  if(x.kind==='browser'){
   if(!DEVICES.includes(x.viewport)||typeof x.page!=='string'||
    x.id!=='page:'+x.page+':'+x.viewport)fail('browser task identity mismatch');
  }else if(x.kind==='manual'){
   if(!MANUAL.has(x.id)||x.page!==null||x.viewport!==null)
    fail('manual task identity mismatch');
  }else fail('invalid operator task kind');
  seen.add(x.id);counts[x.state]++;
 }
 if(tasks.length!==report.checks.required||counts.passed!==report.checks.passed||
    counts.failed!==report.checks.failed||counts.unreviewed!==report.checks.pending)
  fail('operator task totals were manipulated');
 let formPassed=0,formFailed=0,formMissing=0;
 for(const x of forms){
  const key=x?.page+'#'+x?.sectionId;
  if(typeof x?.page!=='string'||typeof x.sectionId!=='string'||
   seenForm.has(key)||!['passed','failed','missing'].includes(x.state))fail('invalid individual form status');
  seenForm.add(key);
  if(x.state==='passed')formPassed++;
  else if(x.state==='failed')formFailed++;
  else formMissing++;
 }
 if(forms.length!==report.checks.realFormOccurrencesExpected||
  formPassed!==report.checks.passedFormReceipts||
  formFailed!==report.checks.failedFormReceipts||
  formPassed+formFailed!==report.checks.operatorFormObservations||
  report.checks.confirmedFormDeliveryReceipts!==formPassed||
  report.checks.operatorFormPostReceipts< formPassed||
  report.checks.operatorFormPostReceipts>report.checks.operatorFormObservations||
  report.checks.submittedFormEvidenceReceipts!==report.checks.operatorFormPostReceipts)
  fail('per-form receipts conflict with source-backed totals');
 return true;
}
function build(review){
 valid(review);
 const actions=[];
 function add(id,priority,owner,origin,detail,nextEvidence){
  actions.push({id,priority,owner,sourceKind:origin.kind,
   page:origin.page??null,viewport:origin.viewport??null,sectionId:origin.sectionId??null,
   observationState:origin.state,detail,nextEvidence});
 }
 if(review.status==='TECHNICAL-EVIDENCE-BLOCKED')
  add('technical:public-release','P0','CMS lead',
   {kind:'technical',state:'blocked'},
   'Resolve original PHP/static and public HTTPS technical blockers for this exact source/ZIP.',
   'New official PHP/export and public HTTPS reports source-bound to the corrected revision');
 for(const t of review.checks.perTaskChecks){
  if(t.state==='passed')continue;
  const failed=t.state==='failed';
  if(t.kind==='browser')
   add(t.id,failed?'P0':'P1','CMS lead + operator',
    {...t,kind:'browser'},
    (failed?'Fix failed':'Inspect pending')+' published '+t.page+' at '+t.viewport+
    ': design, interactions, accessibility and real rendered behavior.',
    'New private browser/viewport observation with date, operator and evidence reference');
  else{
   const key=t.id.slice('manual:'.length);
   const label=CHECKS.find(x=>x[0]===key)?.[1]||'Manual site acceptance';
   add(t.id,failed?'P0':'P1',
    ['client-final-approval'].includes(key)?'CMS lead + client':'CMS lead + operator',
    {...t,kind:'manual'},(failed?'Resolve failed':'Complete pending')+' manual check: '+label+'.',
    'Independent operator evidence plus the real owner/client authorization where applicable');
  }
 }
 for(const f of review.checks.perFormChecks){
  if(f.state==='passed')continue;
  add('form:'+f.page+'#'+f.sectionId,f.state==='failed'?'P0':'P1',
   'CMS lead + form operator',{...f,kind:'form'},
   (f.state==='failed'?'Fix failing':'Test unverified')+' real form at '+f.page+
    ' section '+f.sectionId+'.',
   'Authorized POST submission receipt AND independent destination-side delivery/persistence receipt');
 }
 // Human evidence, even fully complete, never equals authenticated authorization.
 add('authorization:independent-owner-signoff','P1','CMS lead + client',
  {kind:'authorization',state:'required'},
  'Independently verify actual live receipts and obtain owner/client authorization for exact release.',
  'Lead-verified private signature / authorization and rollback ownership outside this SEO tool');
 actions.sort((a,b)=>(a.priority==='P0'?0:1)-(b.priority==='P0'?0:1)||
  a.id.localeCompare(b.id));
 return Object.freeze({format:FORMAT,readOnly:true,siteId:review.siteId,
  publishedVersion:review.publishedVersion,ownerSourceRevisionClaim:review.ownerSourceRevisionClaim,
  officialStaticManifestSha256:review.officialStaticManifestSha256,
  sourceContractSha256:review.sourceContractSha256,
  reviewStatus:review.status,actions,counts:{
   urgent:actions.filter(x=>x.priority==='P0').length,
   pending:actions.filter(x=>x.priority==='P1').length,
   browser:actions.filter(x=>x.sourceKind==='browser').length,
   manual:actions.filter(x=>x.sourceKind==='manual').length,
   form:actions.filter(x=>x.sourceKind==='form').length},
  actualNetworkCalls:0,clientApprovalAuthenticated:false,releaseAuthorized:false,
  warning:'Private actionable planning only: NEVER proof of completed browser/POST/delivery or release permission.'});
}
function markdown(plan){
 if(plan?.format!==FORMAT||plan.releaseAuthorized!==false)fail('invalid plan');
 const safe=x=>String(x??'').replace(/[\r\n|<>]/g,' ').slice(0,300);
 const lines=['# MANUFACT — private first-client human acceptance follow-up','',
  'Site '+safe(plan.siteId)+' / owner version '+safe(plan.publishedVersion),
  'Disposition: '+safe(plan.reviewStatus),
  'Urgent: '+plan.counts.urgent+' / pending: '+plan.counts.pending,
  'Owner/client final authorization: NOT AUTHENTICATED BY THIS REPORT.',''];
 for(const a of plan.actions){
  lines.push('## '+safe(a.priority)+' · '+safe(a.id),'',
   '- Owner: '+safe(a.owner),
   '- Source: '+safe(a.sourceKind)+' / '+safe(a.observationState),
   '- Action: '+safe(a.detail),
   '- Required evidence: '+safe(a.nextEvidence),'');
 }
 lines.push('This plan contains no POST payloads, delivery addresses, HMAC or private receipt URLs.',
  'Lead independently confirms real evidence and client approval. No automatic GO/merge/deploy.','');
 return lines.join('\n');
}
module.exports=Object.freeze({FORMAT,valid,build,markdown});