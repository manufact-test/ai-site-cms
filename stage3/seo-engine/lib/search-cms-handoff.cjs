'use strict';
/* Lead-facing bridge from measured SEO decisions to actual Site v1 editing locations.
 * No field is patched; no owner approval, Save or Publish is inferred.
 */
const {checkBlueprint}=require('./blueprint.cjs');
const {propose:fieldProposals}=require('./field-proposals.cjs');
const {extract:extractAuthored}=require('./content-intelligence.cjs');
const {fingerprint}=require('./acceptance.cjs');
const {FORMAT:HISTORY}=require('./search-history.cjs');
const {REVIEW:DECISIONS}=require('./search-action-ledger.cjs');
const FORMAT='manufact-seo-search-cms-handoff-v1';
const safe=x=>String(x??'').replace(/[|<>\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').slice(0,250);
const META=['title','description','robots','ogTitle','ogDescription'];
function build(site,registry,blueprint,history,decisionReview,sourceSha){
 const plan=checkBlueprint(blueprint);
 if(!site||site.siteId!==plan.siteId||!Array.isArray(site.pages)||!Array.isArray(registry)||
  history?.format!==HISTORY||history.siteId!==plan.siteId||
  decisionReview?.format!==DECISIONS||decisionReview.siteId!==plan.siteId||
  decisionReview.sourceHistorySha256!==sourceSha||
  !history.readOnly||!decisionReview.readOnly)
  throw Error('CMS handoff requires validated same-site approved Blueprint, history and decision review');
 const proposal=fieldProposals(site,registry,plan);
 const pages=new Map(site.pages.map(x=>[x.id,x]));
 const planned=new Map(plan.pages.map(x=>[x.id,x]));
 const content=new Map(extractAuthored(site).map(x=>[x.id,x]));
 const byDecision=new Map(decisionReview.actions.map(a=>[a.actionId,a]));
 const active=[],reportedComplete=[],notSelected=[],blocked=[];
 const statuses=new Set(['accepted','in-progress','completed-reported']);
 const historyTasks=new Map(history.actions.map(a=>[a.id,a]));
 const observe=(planPage,actual)=>{
  const fields=META.map(k=>({
   property:'seo.'+k,
   expectedCurrent:actual?.seo?.[k]??(k==='robots'?'index':''),
   approvedBlueprintValue:planPage.seo[k]??(k==='robots'?'index':''),
   isDifferent:(actual?.seo?.[k]??(k==='robots'?'index':''))!==(planPage.seo[k]??(k==='robots'?'index':'')),
   mayEditAutomatically:false}));
  const proposals=proposal.proposals.filter(p=>p.pageId===planPage.id);
  const unable=proposal.blocked.filter(p=>p.pageId===planPage.id);
  const authored=content.get(planPage.id);
  return {metaFields:fields,
   approvedFieldProposals:proposals.map(p=>({
    proposalId:p.proposalId,locator:p.locator,componentId:p.componentId,
    sectionManifestVersion:p.preconditions.sectionManifestVersion,
    expectedBefore:p.before,approvedAfter:p.after,
    manualOverrideCheckRequired:true,automatic:false})),
   blockedFieldMappings:unable.map(b=>({
    sectionId:b.sectionId||null,field:b.field||null,reason:b.reason})),
   sectionReview:(actual?.sections||[]).map(s=>({
    sectionId:s.id,component:s.component,manifestVersion:s.manifestVersion,
    hasDesignGraph:!!s.designGraph,actualAuthoredLinkCount:authored?.sections.find(t=>t.id===s.id)?.links.length??null,
    reviewMode:s.designGraph?'Studio DesignGraph node editor; inspect current overrides':'Current manifest-declared element slots',
    approvedSectionExists:planPage.sections.some(x=>x.id===s.id)})),
   approvedRoutes:planPage.links.map(l=>({
    targetPageId:l.toPageId,targetPath:l.toPath,approvedAnchor:l.anchor})),
   currentSitePagePresent:!!actual,actualPath:actual?.path||null};
 };
 for(const task of history.actions){
  const decision=byDecision.get(task.id);
  if(!decision)throw Error('Missing exact ledger decision for '+task.id);
  const planPage=planned.get(task.pageId),actual=pages.get(task.pageId);
  if(!planPage||!actual||planPage.path!==actual.path){
   blocked.push({actionId:task.id,pageId:task.pageId,reason:'current-site-page-or-route-differs-from-approved-blueprint',
    status:decision.status,automatic:false});continue;
  }
  const packet={
   actionId:task.id,priority:task.priority,observedSignal:task.type,
   measuredObservation:task.observation,
   approvedManualNextStep:task.nextStep,
   pageId:planPage.id,approvedPath:planPage.path,
   currentSiteRevisionFingerprint:fingerprint(site),
   ownerDecision:{status:decision.status,assignee:decision.assignee,
    rationale:decision.reason,decisionAt:decision.decisionAt,
    reportedEvidenceRefCount:decision.evidenceRefCount},
   sourceReportSha256:sourceSha,
   approvedIntent:planPage.intent,observedMetrics:task.current||null,
   existingEditorTargets:observe(planPage,actual),
   instructions:['Inspect real public page/search appearance and query intent before choosing an edit.',
    'Do not treat low CTR, drops or observed GSC position as a mandatory change to approved titles.',
    'Reconfirm approved claims, prototype, sourceRevision and any current CMS overrides.',
    'Any actual text, link, canonical or robots change must use the existing CMS editorial workflow.',
    'After manual Save and Publish, run real browser/public HTTPS verification, not just this packet.'],
   releaseAuthorized:false,automaticApplication:false};
  if(decision.status==='completed-reported')
   reportedComplete.push({...packet,verificationRequired:true,
    completionClassification:'OWNER-REPORTED-ONLY-NO-PUBLIC-VALIDATION'});
  else if(statuses.has(decision.status))active.push(packet);
  else notSelected.push({actionId:task.id,pageId:task.pageId,
   priority:task.priority,decision:decision.status,why:decision.reason||'No decision recorded'});
 }
 return {format:FORMAT,version:1,readOnly:true,siteId:site.siteId,
  approvedBlueprintFingerprint:fingerprint(plan),currentSiteFingerprint:fingerprint(site),
  sourceHistorySha256:sourceSha,
  summary:{activeWorkPackets:active.length,reportedCompleteNeedsVerification:reportedComplete.length,
   notApprovedOrUnreviewed:notSelected.length,blockedForCurrentSiteDrift:blocked.length,
   existingBlueprintFieldProposals:proposal.proposals.length},
  active,reportedComplete,notSelected,blocked,
  integrationBoundaries:['No CMS mutations or executable field patch.',
   'Blueprint and Site v1 are operator-selected. Only the lead authenticates actual owner-published revision.',
   'Ledger statuses record human assertions; accepted is not client signoff or publish permission.',
   'Existing field proposals use approved Blueprint values only; never invent text from GSC queries.',
   'Header/footer links, current overrides, browser state, POST delivery and public HTTPS remain lead verification tasks.']};
}
function markdown(report){
 if(report.format!==FORMAT)throw Error('Invalid CMS SEO bridge report');
 const lines=['# MANUFACT CMS — human SEO implementation packets','',
  'PRIVATE / READ-ONLY. No CMS patch, no authenticated client signoff and no deploy.','',
  'Site: '+safe(report.siteId)+' | Active manual tasks: '+report.summary.activeWorkPackets+
  ' | Reported-complete awaiting independent check: '+report.summary.reportedCompleteNeedsVerification+
  ' | Not selected: '+report.summary.notApprovedOrUnreviewed+' | Blocked: '+report.summary.blockedForCurrentSiteDrift,''];
 const groups=[['Current human editorial work',report.active],['Owner-reported completion, NOT verified',report.reportedComplete]];
 for(const [heading,items] of groups){
  lines.push('## '+heading,'');
  for(const t of items){
   lines.push('### '+t.priority+' '+safe(t.approvedPath)+' / '+safe(t.actionId),'',
    'Human status: '+safe(t.ownerDecision.status)+' | assignee: '+safe(t.ownerDecision.assignee||'not recorded'),
    'Observed GSC signal: '+safe(t.measuredObservation),
    'Next manual investigation: '+safe(t.approvedManualNextStep),
    'Current Site v1 fingerprint: '+report.currentSiteFingerprint,'',
    '| Existing CMS SEO field | Current authored value | Approved Blueprint value | Differs |',
    '|---|---|---|---|');
   for(const m of t.existingEditorTargets.metaFields)
    lines.push('| '+safe(m.property)+' | '+safe(m.expectedCurrent)+' | '+safe(m.approvedBlueprintValue)+
     ' | '+(m.isDifferent?'Yes, still requires manual decision':'No')+' |');
   if(t.existingEditorTargets.approvedFieldProposals.length){
    lines.push('','Supported Blueprint-derived existing element locator proposals:');
    for(const p of t.existingEditorTargets.approvedFieldProposals)
     lines.push('- '+safe(p.proposalId)+' / '+safe(JSON.stringify(p.locator))+
      ' | expectedBefore: '+safe(p.expectedBefore)+' | approvedAfter: '+safe(p.approvedAfter));
   }
   if(t.existingEditorTargets.blockedFieldMappings.length){
    lines.push('','Ambiguous/unsupported CMS element field mappings:');
    for(const m of t.existingEditorTargets.blockedFieldMappings)
     lines.push('- '+safe(m.sectionId)+' / '+safe(m.field)+' / '+safe(m.reason));
   }
   lines.push('','Required checks before ANY save or publication:');
   for(const step of t.instructions)lines.push('- '+safe(step));
   lines.push('');
  }
 }
 lines.push('## Unreviewed/deferred/rejected decisions','');
 for(const a of report.notSelected)lines.push('- '+safe(a.actionId)+' / '+safe(a.decision)+' — '+safe(a.why));
 lines.push('','## Blocked by site drift','');
 for(const a of report.blocked)lines.push('- '+safe(a.actionId)+' / '+safe(a.reason));
 lines.push('','## Integration boundaries','');
 for(const c of report.integrationBoundaries)lines.push('- '+safe(c));
 return lines.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,build,markdown});
