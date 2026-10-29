'use strict';
/* First-client operator work queue bound to immutable private first-site summary bytes.
 * Owner task acknowledgements are not CMS verification or release authorizations.
 */
const COCKPIT=require('./first-site-launch-cockpit.cjs');
const FORMAT='manufact-seo-first-site-operator-ledger-v1';
const REVIEW='manufact-seo-first-site-operator-review-v1';
const SHA=/^[a-f0-9]{64}$/;
const STATES=['unreviewed','assigned','investigating','fix-reported','operator-checked'];
const MANUAL=[
 ['owner-published-revision','Confirm actual saved/published CMS revision, manual edits and owner source'],
 ['three-device-browser','Inspect desktop, tablet and mobile appearance against approved design'],
 ['interactive-accessibility','Check keyboard, focus, navigation, controls and rendered interactions'],
 ['real-form-delivery','Submit actual form POST and verify persistence plus configured notifications'],
 ['public-host-security','Independently check live HTTPS, canonical/robots/sitemap, 404, images and private-file exposure'],
 ['client-approval-rollback','Obtain client approval, archive design evidence and document rollback']
];
const validDate=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)&&
 !Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
function expected(summary,bundle=null){
 COCKPIT.validate(summary,bundle);
 const gates=summary.release.blockerIds.map(id=>{
  const source=bundle?.release?.blockers.find(x=>x.gateId===id);
  return {taskId:'gate:'+id,kind:'original-technical-blocker',label:source?.message||source?.title||id,
   sourceGateId:id,technicalBlocker:true};
 });
 const checks=MANUAL.map(([id,label])=>({taskId:'manual:'+id,kind:'mandatory-human-check',label,sourceGateId:null,
  technicalBlocker:false}));
 return [...gates,...checks];
}
function template(summary,summarySha,bundle=null,previous=null){
 if(!SHA.test(summarySha||''))throw Error('Operator ledger requires SHA-256 of exact first-site summary file');
 const tasks=expected(summary,bundle);
 const prev=new Map((previous?.tasks||[]).map(x=>[x.taskId,x]));
 return {format:FORMAT,version:1,siteId:summary.siteId,sourceSummarySha256:summarySha,
  sealedSiteSha256:summary.sourceSiteSha256,publishedVersion:summary.publishedVersion,
  tasks:tasks.map(t=>({...t,state:'unreviewed',owner:'',reviewedAt:null,reason:'',evidenceRefs:[],
   ...(prev.has(t.taskId)?{previousDecisionForReferenceOnly:{
    state:prev.get(t.taskId).state,owner:prev.get(t.taskId).owner,
    warning:'New report needs fresh review; prior decision was not carried over.'}}:{})})),
  boundaries:['This is a human-editable private checklist, not a first-site gate override.',
   'Even operator-checked does not prove verified public website, form delivery or client acceptance.',
   'First-site release blockers cannot be waived by editing this file.']};
}
function review(summary,summarySha,ledger,bundle=null){
 const ex=expected(summary,bundle);
 if(!SHA.test(summarySha||'')||ledger?.format!==FORMAT||ledger.version!==1||
  ledger.siteId!==summary.siteId||ledger.sourceSummarySha256!==summarySha||
  ledger.sealedSiteSha256!==summary.sourceSiteSha256||
  ledger.publishedVersion!==summary.publishedVersion||
  !Array.isArray(ledger.tasks)||ledger.tasks.length!==ex.length)
  throw Error('Stale or incompatible first-site operator ledger; generate a fresh private template');
 const map=new Map(ex.map(x=>[x.taskId,x])),seen=new Set(),record=[];
 for(const task of ledger.tasks){
  const expectedTask=map.get(task?.taskId);
  if(!expectedTask||seen.has(task.taskId)||task.kind!==expectedTask.kind||
    task.sourceGateId!==expectedTask.sourceGateId||
    task.technicalBlocker!==expectedTask.technicalBlocker||
    task.label!==expectedTask.label||!STATES.includes(task.state))
   throw Error('Unexpected, altered or duplicated first-site checklist item');
  seen.add(task.taskId);
  if(typeof task.owner!=='string'||task.owner.length>180||
    typeof task.reason!=='string'||task.reason.length>800||
    task.reviewedAt!==null&&!validDate(task.reviewedAt)||
    !Array.isArray(task.evidenceRefs)||task.evidenceRefs.length>12||
    task.evidenceRefs.some(x=>typeof x!=='string'||x.length>250||/[\u0000-\u001f]/.test(x)))
   throw Error('Invalid operator checklist decision fields');
  if(task.state!=='unreviewed'&&(!task.owner.trim()||!task.reason.trim()||!task.reviewedAt))
   throw Error('Reviewed operator task needs owner, rationale and reviewedAt');
  if(['fix-reported','operator-checked'].includes(task.state)&&task.evidenceRefs.length===0)
   throw Error('Fix reported/checked tasks need a private evidence reference');
  if(task.state==='unreviewed'&&(task.reviewedAt!==null||task.reason||task.evidenceRefs.length))
   throw Error('Unreviewed operator task must not report a decision');
  record.push({taskId:task.taskId,kind:task.kind,sourceGateId:task.sourceGateId,
   technicalBlocker:task.technicalBlocker,label:expectedTask.label,
   state:task.state,assignedTo:task.owner||null,reason:task.reason||null,
   reviewedAt:task.reviewedAt||null,privateEvidenceReferenceCount:task.evidenceRefs.length,
   independentlyAuthenticated:false,technicalGateWaived:false,releasePermission:false});
 }
 const counts=Object.fromEntries(STATES.map(s=>[s,record.filter(t=>t.state===s).length]));
 const blockers=record.filter(t=>t.technicalBlocker);
 return {format:REVIEW,version:1,siteId:summary.siteId,readOnly:true,
  sourceSummarySha256:summarySha,sealedSiteSha256:summary.sourceSiteSha256,
  publishedVersion:summary.publishedVersion,
  disposition:'MANUAL-LAUNCH-OPERATIONS-ONLY',
  summary:{total:record.length,technicalBlockersFromOriginalReport:blockers.length,
   manualChecksFromOriginalContract:MANUAL.length,
   byState:counts,operatorCheckedAssertions:counts['operator-checked'],
   openOriginalTechnicalGates:summary.release.blockingGates,automaticTechnicalGateClosures:0,
   authenticatedClientApprovals:0,releaseAuthorized:false},
  tasks:record,releaseAuthorized:false,
  warnings:['An operator assertion is not authenticated evidence or a changed PHP/HTTPS release.',
   'An original release blocker remains until a NEW real first-site-check report shows it gone.',
   'Do not infer CMS Save/Publish, form POST success, client design acceptance or go-live from this ledger.']};
}
function markdown(r){
 if(r?.format!==REVIEW)throw Error('Unsupported operator review report');
 const esc=x=>String(x??'').replace(/[|<>\u0000-\u001f\u007f]/g,' ').slice(0,180);
 const lines=['# Private first-site operator work queue','',
  'Source: '+esc(r.siteId)+' / '+r.sourceSummarySha256,
  'Status: '+r.disposition+' — no publication authorization.',
  'Original technical blockers: '+r.summary.openOriginalTechnicalGates+
  ' | Operator-checked assertions: '+r.summary.operatorCheckedAssertions,
  '',
  '| Task | Kind | Declared state | Assigned owner | Independent verification |',
  '|---|---|---|---|---|'];
 for(const x of r.tasks)lines.push('| '+esc(x.taskId)+' | '+esc(x.kind)+' | '+x.state+
  ' | '+esc(x.assignedTo||'—')+' | NO |');
 lines.push('','## Restrictions','');
 for(const w of r.warnings)lines.push('- '+esc(w));
 return lines.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,REVIEW,STATES,MANUAL,expected,template,review,markdown});
