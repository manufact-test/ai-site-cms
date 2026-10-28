'use strict';
// Simulates previously approved CMS field proposals on an isolated in-memory Site v1 clone.
// Does not export an editable site, mutate CMS, execute patches or publish anything.
const {checkBlueprint}=require('./blueprint.cjs');
const {auditSite}=require('./analyze.cjs');
const {compare}=require('./regression.cjs');
const {build:changePacket}=require('./cms-change-packet.cjs');
const {fingerprint}=require('./acceptance.cjs');
const FORMAT='manufact-seo-change-impact-v1';
function preview(site,manifests,blueprint,backlog,decisions=null){
 const plan=checkBlueprint(blueprint);
 if(!site||site.siteId!==plan.siteId||!Array.isArray(manifests)||
  !backlog||backlog.siteId!==site.siteId||!backlog.readOnly)
  throw Error('Impact preview requires matching validated Site v1, current manifests and backlog');
 // Authoritative core, not a duplicate CMS implementation.
 auditSite(site,manifests,plan);
 const packet=changePacket(site,manifests,plan,backlog,decisions);
 const candidate=structuredClone(site);
 const outcomes=[];
 for(const op of packet.operations){
  const record={taskId:op.taskId,pageId:op.pageId,field:op.field,automatic:false,
   prospectiveOnly:true,expectedBefore:op.expectedBefore,proposedAfter:op.proposedAfter,
   simulationStatus:'not-run'};
  const page=candidate.pages.find(p=>p.id===op.pageId);
  if(!page)throw Error('Impact preview cannot locate page after guarded packet');
  if(op.field.startsWith('seo.')){
   if(!page.seo)page.seo={title:'',description:'',robots:'index'};
   const property=op.field.slice(4);
   const existing=page.seo[property]??(property==='robots'?'index':'');
   if(existing!==op.expectedBefore)throw Error('Impact preview encountered changed SEO field');
   page.seo[property]=op.proposedAfter;
  }else{
   const element=page.sections?.find(s=>s.id===op.sectionId)
    ?.elements?.find(e=>e.id===op.target?.elementId);
   if(!element||element.values?.[op.field]!==op.expectedBefore)
    throw Error('Impact preview encountered changed element field');
   element.values[op.field]=op.proposedAfter;
  }
  record.simulationStatus='applied-to-temporary-clone';outcomes.push(record);
 }
 let valid=true,validationError=null,regression=null;
 try{
  auditSite(candidate,manifests,plan);
  regression=compare(site,candidate,manifests,plan);
 }catch(e){
  valid=false;validationError=String(e?.message||e).slice(0,320);
 }
 const risky=regression?.summary.criticalReviewItems??null;
 const first=fingerprint(site),hypothetical=fingerprint(candidate);
 return {format:FORMAT,version:1,siteId:site.siteId,readOnly:true,
  approvalLedgerSupplied:Boolean(decisions),currentSiteFingerprint:first,
  hypotheticalSiteFingerprint:hypothetical,
  hypotheticalSiteIncluded:false,
  status:!packet.operations.length?'no-approved-unblocked-operations':
   !valid?'invalid-hypothetical-site':
   risky?'hypothetical-regression-review-required':'validated-hypothetical-site',
  summary:{approvedFieldOperationsSimulated:outcomes.length,
   blockedProposals:packet.blocked.length,pendingDecisions:packet.pending.length,
   hypotheticalValidSiteV1:valid,hypotheticalCriticalReviewItems:risky,
   actualCmsWrites:0,deployments:0},
  operations:outcomes,blocked:packet.blocked,pending:packet.pending,
  validationError,regression,
  recommendations:!valid?['Do not attempt the proposed field set; resolve Site v1 validation errors first.']:
   risky?['Review newly introduced SEO issues before any manual CMS edit.']:
   ['Review the current saved overrides, approval ledger and actual editor history.',
    'If authorized, apply each field manually through existing CMS Save, then re-export Site v1 and re-audit.',
    'Publish only after independent browser/HTTP/manual release acceptance.'],
  readyForAutomaticApply:false,readyToPublish:false,
  note:'A validated in-memory copy is not proof that the real CMS will accept changes, persist them, render them, or publish safely. This report does not contain executable patches or a replacement Site v1 document.'};
}
module.exports=Object.freeze({FORMAT,preview});
