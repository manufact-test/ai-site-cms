'use strict';
// Compact, evidence-limited human handoff for the lead and site owner.
const FORMAT='manufact-seo-lead-dossier-v1';
const safe=v=>String(v??'').replace(/[\x00-\x1f\x7f]/g,' ')
 .replace(/\\/g,'\\\\').replace(/[<>&*_[\](){}#!|]/g,x=>'\\'+x)
 .replace(/\x60/g,'\\'+String.fromCharCode(96)).slice(0,220);
function build({siteId,release,coverage,acceptanceReview=null,taskProgress=null,
 changeImpact=null,executionPlan=null,cmsChangePacket=null,traceability=null,
 capturePlan=null,deliveryEvidence=null,mediaEvidence=null,routeMigration=null,phpCapture=null}){
 if(!release||release.format!=='manufact-seo-release-review-v1'||release.siteId!==siteId||
  !coverage||typeof coverage!=='object')
  throw Error('Lead dossier requires current reviewed Site v1 publication envelope');
 const warnings=[
  ...release.blockers.map(g=>({kind:'release-blocker',id:g.gateId,summary:g.title,relatedTasks:g.taskIds||[]})),
  ...(!coverage.suppliedPublicOriginsAgree?[{kind:'inconsistent-public-origin',id:'origin',summary:'HTTP and media origins disagree',relatedTasks:[]}]:[]),
  ...(phpCapture?.findings.length?[{kind:'lead-php-broken-images',id:'php-capture',
   summary:'Lead loopback PHP screenshot capture reported broken images on '+phpCapture.warningPageIds.join(', '),relatedTasks:[]}]:[]),
  ...(changeImpact?.status==='hypothetical-regression-review-required'?
   [{kind:'hypothetical-change-regression',id:'cms-change-impact',
    summary:'Approved but unsaved changes would introduce SEO risks',relatedTasks:[]}]:[]),
  ...(changeImpact?.status==='invalid-hypothetical-site'?
   [{kind:'invalid-hypothetical-site',id:'cms-validation',
    summary:'In-memory proposed site fails authoritative Site v1 validation',relatedTasks:[]}]:[])
 ];
 // Missing evidence is not "passing" evidence. These are concrete inputs for
 // the lead to gather, not an implied score or an authenticated web observation.
 const evidenceRequests=[];
 const request=(id,owner,reason,affectedPages=[])=>evidenceRequests.push({
  id,owner,reason,affectedPages,proofProvidedByToolkit:false,
  automaticallyPassed:false});
 if(!acceptanceReview||!acceptanceReview.prototype.approvedAssertionRecorded||acceptanceReview.stale)
  request('approved-three-static-prototypes','client-and-lead',
   'Supply exactly the approved desktop, tablet and mobile static images, revision ID, client approval and current source fingerprints.');
 if(acceptanceReview?.summary.unresolvedChecks)
  request('pending-manual-acceptance-checks','site-owner',
   'Resolve incomplete, pending and rejected signed manual checks before final release.');
 if(coverage.htmlExportPageCount===null)
  request('html-snapshots','lead-developer','Supply actual page HTML/DOM exports and provenance for the target build.');
 else if(coverage.plannedPagesAbsentFromHtmlExport?.length)
  request('missing-page-html','lead-developer','Complete page-level HTML evidence for this build.',coverage.plannedPagesAbsentFromHtmlExport);
 if(coverage.loopbackPhpHtmlPages!==null&&coverage.loopbackPhpHtmlPages!==undefined)
  request('php-html-build-identity-review','lead-developer',
   'Local PHP HTML files were SHA-256 checked and HTTP 200 captured, but the served PHP revision was not independently attested to match the sealed site.json. Correlate published revision, capture time and isolated site before claiming same build.');
 if(!phpCapture)request('lead-php-full-page-screenshots','lead-developer',
  'Run the existing capture-approved-site.cjs on the sealed Site v2 and import evidence.json with --php-capture (real loopback PHP).');
 if(coverage.viewportsPageCount===null)
  request('three-device-captures','lead-developer','Supply real desktop/tablet/mobile captures for every page; static HTML alone is not a visual comparison.');
 else if(coverage.plannedPagesAbsentFromThreeDeviceExport?.length)
  request('missing-device-pages','lead-developer','Complete desktop/tablet/mobile page coverage.',coverage.plannedPagesAbsentFromThreeDeviceExport);
 if(coverage.suppliedHttpPages===null)
  request('public-http-transcripts','lead-developer','Supply public HTTPS status, head, robots and sitemap captures for the approved host and mount.');
 else if(coverage.suppliedHttpPages<coverage.sitePageCount)
  request('missing-http-pages','lead-developer','Public HTTP status and head evidence is incomplete for current Site v1 pages.');
 if(capturePlan?.media?.length&&coverage.suppliedMediaResources===null)
  request('media-http-transcripts','lead-developer','Supply selected OG and rendered asset HTTP/MIME evidence for the actual public origin.');
 if(routeMigration?.summary.renamedPages&&
   (deliveryEvidence?.coverage.redirectResponsesCaptured??0)<routeMigration.summary.renamedPages)
  request('historic-redirect-http-301','lead-developer','Supply old public-route HTTP 301 Location transcripts and verify final destination canonical.',
   routeMigration.changed.map(x=>x.pageId));
 if(routeMigration?.summary.historicalAliasesRemoved)
  request('removed-historic-aliases','site-owner','Approve the retirement or reinstatement of previously published 301 aliases.');
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
  actualCmsWrites:0,missingEvidenceInputGroups:evidenceRequests.length,
  authenticatedLiveHttpTests:0,
  localPhpHtml200Pages:coverage.loopbackPhpHtmlHttp200??0,
  localPhpRobotsStatus:coverage.localPhpRobotsStatus??null,
  localPhpSitemapStatus:coverage.localPhpSitemapStatus??null,
  localPhpRedirectResponses:coverage.localPhpRedirectResponses??null,
  localPhpMediaResources:coverage.localPhpMediaResources??null,
  localPhpMediaBytesChecked:coverage.localPhpMediaBytesChecked??null,
  localPhpMediaFindings:coverage.localPhpMediaFindings??null,
  localPhpHeadFindings:coverage.localPhpHeadFindings??null,
   localPhpFormCount:coverage.localPhpFormCount??null,
   localPhpFormFindings:coverage.localPhpFormFindings??null,
    localPhpTypedComponentsChecked:coverage.localPhpTypedComponentsChecked??null,
    localPhpComponentFindings:coverage.localPhpComponentFindings??null,
    localPhpGraphNodesChecked:coverage.localPhpGraphNodesChecked??null,
    localPhpGraphFindings:coverage.localPhpGraphFindings??null,
  localPhpHeadHeaders:coverage.localPhpHeadHeaders??null,
  localPhpObservedPublicOrigin:coverage.localPhpObservedPublicOrigin??null,
  localPhpHtmlFileDigestsChecked:coverage.loopbackPhpHtmlSha256Checked??false,
  actualHtmlServedRevisionProven:false,
  leadLoopbackScreenshotFilesChecked:phpCapture?.screenshotCount??0,
  leadLoopbackScreenshotSourceRevisionProven:false,
  leadLoopbackMissingImagePageCount:phpCapture?.warningPageIds.length??null,
  readyToPublish:false
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
  status,summary,alerts:warnings,evidenceRequests,manualGateStatuses,
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
 lines.push('','## Inputs still required for the real first-site review','');
 if(!d.evidenceRequests.length)lines.push('All named input categories were supplied as assertions; real origin and approvals remain unverified.');
 for(const req of d.evidenceRequests){
  lines.push('- [ ] '+safe(req.owner)+' · '+safe(req.id)+': '+safe(req.reason)+
   (req.affectedPages?.length?' ('+safe(req.affectedPages.join(', '))+')':''));
 }
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
