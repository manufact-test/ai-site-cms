'use strict';
// Compact, evidence-limited human handoff for the lead and site owner.
const FORMAT='manufact-seo-lead-dossier-v1';
const safe=v=>String(v??'').replace(/[\x00-\x1f\x7f]/g,' ')
 .replace(/\\/g,'\\\\').replace(/[<>&*_[\](){}#!|]/g,x=>'\\'+x)
 .replace(/\x60/g,'\\'+String.fromCharCode(96)).slice(0,220);
function build({siteId,release,coverage,acceptanceReview=null,taskProgress=null,
 changeImpact=null,executionPlan=null,cmsChangePacket=null,traceability=null}){
 if(!release||release.format!=='manufact-seo-release-review-v1'||release.siteId!==siteId||
  !coverage||typeof coverage!=='object')
  throw Error('Lead dossier requires current reviewed Site v1 publication envelope');
 const warnings=[
  ...release.blockers.map(g=>({kind:'release-blocker',id:g.gateId,summary:g.title,relatedTasks:g.taskIds||[]})),
  ...(!coverage.suppliedPublicOriginsAgree?[{kind:'inconsistent-public-origin',id:'origin',summary:'HTTP and media origins disagree',relatedTasks:[]}]:[]),
  ...(changeImpact?.status==='hypothetical-regression-review-required'?
   [{kind:'hypothetical-change-regression',id:'cms-change-impact',
    summary:'Approved but unsaved changes would introduce SEO risks',relatedTasks:[]}]:[]),
  ...(changeImpact?.status==='invalid-hypothetical-site'?
   [{kind:'invalid-hypothetical-site',id:'cms-validation',
    summary:'In-memory proposed site fails authoritative Site v1 validation',relatedTasks:[]}]:[])
 ];
 const status=warnings.length?'needs-repair-and-review':'manual-acceptance-pending';
 const tasks=(executionPlan?.nextReviewActions||[]).slice(0,12).map(t=>({
  taskId:t.taskId,priority:t.priority,owner:t.owner,phase:t.phase,
  status:t.status,pageId:t.pageId||null,
  instruction:t.instruction,automatic:false
 }));
 const manualGateStatuses=release.manualChecks.map(x=>({id:x.gateId,
  suppliedStatus:x.suppliedAttestationStatus||'not-supplied',authenticated:false}));
 const summary={
  plannedPages:coverage.plannedPageCount??0,implementedPages:coverage.sitePageCount??0,
  releaseBlockers:release.blockers.length,manualGates:release.manualChecks.length,
  approvedPrototypeAssertion:acceptanceReview?.prototype.approvedAssertionRecorded??false,
  acceptanceLedgerStale:acceptanceReview?.stale??null,
  sourceSha256Bound:acceptanceReview?acceptanceReview.fingerprints.siteMatches:null,
  historicalResolvedCandidates:taskProgress?.summary.noLongerPresent??null,
  historicalProvenFixes:0,
  hypotheticalCmsOperations:changeImpact?.summary.approvedFieldOperationsSimulated??null,
  actualCmsWrites:0,readyToPublish:false
 };
 const leadActionSequence=[
  'Confirm approved static prototype images and source revision fingerprint (lead/client)',
  'Resolve real Site v1 authoring and implementation blockers, then re-export Site v1',
  'Reconcile current decisions and review the guarded CMS change packet',
  'Re-run actual public HTTP, media, viewport, forms and manual accessibility checks',
  'Check source hashes after every change; outdated approval needs fresh human review',
  'Have authorized site owner approve final release separately from this report'
 ];
 return {format:FORMAT,version:1,siteId,readOnly:true,
  status,summary,alerts:warnings,manualGateStatuses,
  immediateActions:tasks,leadActionSequence,
  published:false,automaticApproval:false,
  limitations:'A lead handoff only. Does not authenticate supplied approvals or evidence, prove actual repairs, run browser/host checks, write CMS data or authorize deployment.'};
}
function markdown(d){
 if(!d||d.format!==FORMAT||!d.readOnly)throw Error('Invalid lead dossier');
 const lines=['# SEO release handoff — lead overview','',
  'Project: '+safe(d.siteId)+' · '+safe(d.status)+
  ' · **no automated publishing**.','',
  'Pages in site: '+d.summary.implementedPages+'; blockers: '+d.summary.releaseBlockers+
  '; manual acceptance gates: '+d.summary.manualGates+'.','',
  'Client prototype approval recorded: '+(d.summary.approvedPrototypeAssertion?'claimed (not authenticated)':'not proven')+
   '; ledger stale: '+(d.summary.acceptanceLedgerStale===null?'not supplied':String(d.summary.acceptanceLedgerStale))+'.',
  'Resolved authoring tasks: '+(d.summary.historicalResolvedCandidates??'no comparable baseline')+
   ' candidates, **zero proven completed from this report**.',
  'Hypothetical CMS edits: '+(d.summary.hypotheticalCmsOperations??'not simulated')+
   '; actual CMS edits: 0.','',
  '## Blocking or potentially dangerous conflicts',''];
 if(!d.alerts.length)lines.push('No blocking conflicts found in supplied evidence; manual gates still apply.');
 for(const item of d.alerts.slice(0,30))lines.push('- '+safe(item.id)+': '+safe(item.summary));
 lines.push('','## Next actionable reviews','');
 for(const item of d.immediateActions)
  lines.push('- '+safe(item.priority)+' · '+safe(item.owner)+' · '+safe(item.status)+
   ' · '+safe(item.taskId)+(item.pageId?' · '+safe(item.pageId):'')+
   ': '+safe(item.instruction));
 lines.push('','## Required handoff sequence','');
 for(const step of d.leadActionSequence)lines.push('- [ ] '+safe(step));
 lines.push('','**Publication is not approved by this report.**');
 return lines.join('\n');
}
module.exports=Object.freeze({FORMAT,build,markdown});
