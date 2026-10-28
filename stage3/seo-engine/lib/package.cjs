'use strict';
// One read-only integration envelope for the lead developer and next chat.
// Deliberately not a CMS extension, deployed scanner, or automatic approval.
const {checkBlueprint}=require('./blueprint.cjs');
const {auditSite}=require('./analyze.cjs');
const {report:reviewArchitecture}=require('./architecture.cjs');
const {review:reviewHtml}=require('./html-evidence.cjs');
const {review:reviewViewports}=require('./viewport-evidence.cjs');
const {compare:compareSite}=require('./regression.cjs');
const {compare:compareHtml}=require('./parity.cjs');
const {review:reviewPublication}=require('./publication-integrity.cjs');
const {propose}=require('./handoff.cjs');
const {work}=require('./remediation.cjs');
const {assess}=require('./release-review.cjs');
const {write:renderMarkdown}=require('./reporter.cjs');
const TRACE=require('./traceability.cjs');
const TRIAGE=require('./triage.cjs');
const DELIVERY=require('./delivery-evidence.cjs');
const EXECUTION=require('./execution-plan.cjs');
const MEDIA=require('./media-delivery.cjs');
const CMS_PACKET=require('./cms-change-packet.cjs');
const CAPTURE=require('./capture-plan.cjs');
const CONSISTENCY=require('./evidence-consistency.cjs');
const ACCEPTANCE=require('./acceptance.cjs');
const PROGRESS=require('./task-progress.cjs');
const MIGRATION=require('./route-migration.cjs');
const IMPACT=require('./change-impact.cjs');
const DOSSIER=require('./lead-dossier.cjs');
const FORMAT='manufact-seo-review-bundle-v1';
function build(site,manifests,blueprint,options={}){
 const plan=checkBlueprint(blueprint);
 if(!site||site.siteId!==plan.siteId)throw Error('Review package siteId mismatch');
 if(!Array.isArray(manifests))throw Error('Review package requires current manifests');
 if(!options||typeof options!=='object'||Array.isArray(options)||
    Object.keys(options).some(k=>!['snapshot','viewports','baselineSite','decisions','priorDecisions','delivery','media','acceptance','approvedSource'].includes(k)))
  throw Error('Unsupported review-package options');
 // A sealed package is verified by the lead CLI before this read-only review.
 const approvedSource=options.approvedSource||null;
 if(approvedSource&&(
  approvedSource.format!=='manufact-seo-approved-site-source-v1'||
  approvedSource.siteId!==site.siteId||
  approvedSource.siteRevisionFingerprint!==ACCEPTANCE.fingerprint(site)||
  approvedSource.integrity!=='sha256-verified-at-read'))
  throw Error('Approved Site source metadata does not match the reviewed Site v1');
 // Validate with authoritative core first, not just the loosely typed SEO blueprint.
 const audit=auditSite(site,manifests,plan);
 const architecture=reviewArchitecture(plan);
 const evidence=options.snapshot?reviewHtml(options.snapshot,plan):null;
 const viewports=options.viewports?reviewViewports(options.viewports,plan):null;
 const regression=options.baselineSite?compareSite(options.baselineSite,site,manifests,plan):null;
 const published=options.snapshot?compareHtml(site,plan,options.snapshot):null;
 const publication=options.snapshot?reviewPublication(site,options.snapshot):null;
 const delivery=options.delivery?DELIVERY.review(site,options.delivery):null;
 const media=options.media?MEDIA.review(site,options.media,options.snapshot):null;
 const evidenceConsistency=CONSISTENCY.review(site,options);
 const handoff=propose(site,manifests,plan);
 const {decisions:ledger,priorDecisions:historyLedger,acceptance:acceptanceLedger,approvedSource:verifiedSource,...coreOptions}=options;
 const backlog=work(site,manifests,plan,coreOptions);
 const release=assess(site,manifests,plan,{...coreOptions,
  ...(acceptanceLedger?{acceptance:acceptanceLedger}:{})},backlog);
 const decisions=ledger?TRIAGE.reconcile(backlog,ledger):null;
 const execution=EXECUTION.compile(backlog,decisions);
 const cmsChangePacket=CMS_PACKET.build(site,manifests,plan,backlog,decisions);
 const acceptanceReview=acceptanceLedger?ACCEPTANCE.review(site,plan,acceptanceLedger):null;
 const taskProgress=options.baselineSite?PROGRESS.compare(options.baselineSite,site,manifests,plan,historyLedger||null):null;
 const routeMigration=options.baselineSite?MIGRATION.review(options.baselineSite,site,manifests,plan):null;
 const changeImpact=ledger?IMPACT.preview(site,manifests,plan,backlog,decisions):null;
 const declaredOrigins=[options.delivery?.origin,options.media?.origin].filter(Boolean);
 const originsAgree=new Set(declaredOrigins.map(x=>new URL(x).href)).size<=1;
 const capturePlan=CAPTURE.build(site,plan,originsAgree?declaredOrigins[0]||null:null,routeMigration);
 const traceability=TRACE.report(site,plan,{
  ...(options.snapshot?{snapshot:options.snapshot}:{}),
  ...(options.viewports?{viewports:options.viewports}:{}),
  ...(options.delivery?{delivery:options.delivery}:{}),
  ...(options.media?{media:options.media}:{})},audit,backlog,decisions);
 const expected=plan.pages.map(p=>p.id),fromSite=new Set(site.pages.map(p=>p.id));
 const exported=new Set((options.snapshot?.pages||[]).map(p=>p.id));
 const deviceIds=new Set((options.viewports?.pages||[]).map(p=>p.id));
 const missingExport=expected.filter(id=>!exported.has(id));
 const missingDevice=expected.filter(id=>!deviceIds.has(id));
 const acceptedFormats={
  site:'manufact-ai-site-v1',blueprint:plan.format,
  snapshot:options.snapshot?.format||null,
  viewports:options.viewports?.format||null
 };
 const coverage={plannedPageCount:expected.length,sitePageCount:site.pages.length,
  suppliedPublicOriginsAgree:originsAgree,
  migrationOldPathsNeedingHttp301:routeMigration?.summary.renamedPages??null,
  plannedPagesAbsentFromSite:expected.filter(id=>!fromSite.has(id)),
  htmlExportPageCount:options.snapshot?.pages?.length??null,
  htmlExportCompleteness:options.snapshot?.completeness||'partial-or-unknown',
  plannedPagesAbsentFromHtmlExport:options.snapshot?missingExport:null,
  viewportsPageCount:options.viewports?.pages?.length??null,
  plannedPagesAbsentFromThreeDeviceExport:options.viewports?missingDevice:null,
  actualVisualComparisonPerformed:false,liveHttpVerified:false,sitePublished:false,
  suppliedHttpPages:delivery?.coverage.capturedPages??null,
  declaredPublicOrigin:delivery?.origin??null,
  httpEvidenceProvenanceVerified:false,
  suppliedMediaResources:media?.coverage.capturedKnownResources??null,
  prototypeApprovalLedgerProvided:Boolean(acceptanceLedger),
  historicalTaskComparisonPerformed:Boolean(taskProgress),
  blueprintRevisionFingerprint:ACCEPTANCE.fingerprint(plan),
  siteRevisionFingerprint:ACCEPTANCE.fingerprint(site),
  sealedSourceVerifiedAtRead:Boolean(approvedSource),
  sealedSourceRawSiteSha256:approvedSource?.fileSha256??null,
  approvedPrototypePageReferences:approvedSource?.availablePrototypePageCount??null,
  missingApprovedInteriorPageReferences:approvedSource?.missingInteriorPrototypePageIds??null};
 const dossier=DOSSIER.build({siteId:site.siteId,release,coverage,acceptanceReview,
  taskProgress,changeImpact,executionPlan:execution,cmsChangePacket,traceability,
  capturePlan,deliveryEvidence:delivery,mediaEvidence:media,routeMigration});
 const rejected=new Set(decisions?.rejected.map(x=>x.taskId)||[]);
 const approved=new Set(decisions?.approved.map(x=>x.taskId)||[]);
 const deferred=new Set(decisions?.deferred.map(x=>x.taskId)||[]);
 const nextActions=backlog.tasks.filter(t=>!rejected.has(t.taskId)&&!deferred.has(t.taskId)).slice(0,12).map(task=>({
  taskId:task.taskId,priority:task.priority,owner:task.owner,
  category:task.category,pageId:task.pageId,dependsOn:task.dependsOn,
  instruction:task.instruction,decision:approved.has(task.taskId)?'approved-for-manual-work':deferred.has(task.taskId)?'deferred':'unreviewed',automatic:false
 }));
 return {format:FORMAT,version:1,siteId:site.siteId,readOnly:true,
  contract:acceptedFormats,coverage,approvedSiteSource:approvedSource,
  blueprintReview:architecture,siteAudit:audit,
  htmlEvidence:evidence,htmlParity:published,publicationIntegrity:publication,deviceEvidence:viewports,
  traceability,decisions,acceptanceReview,taskProgress,routeMigration,changeImpact,leadDossier:dossier,deliveryEvidence:delivery,mediaEvidence:media,evidenceConsistency,executionPlan:execution,cmsChangePacket,capturePlan,
  regression,handoff,backlog,release,nextActions,
  // Retain the original remediation Markdown first for consumers depending on its header.
  markdownHandoff:DOSSIER.markdown(dossier)+
    (approvedSource?'\n\n## Sealed Approved Site v2 source (read-only)\n\n'+
     '- Lead source preflight: SHA-256 verified at read; not a client-identity or design-approval certificate.\n'+
     '- Source version: '+approvedSource.packageVersion+'; raw site.json SHA-256: '+approvedSource.fileSha256+'\n'+
     '- SEO canonical Site v1 fingerprint: '+approvedSource.siteRevisionFingerprint+
       ' (not the raw file digest).\n'+
     '- Homepage references: three sealed images; additional page-specific reference sets: '+
       (approvedSource.availablePrototypePageCount-1)+'.\n'+
     '- Interior pages without their own approved images: '+
       (approvedSource.missingInteriorPrototypePageIds.length?
         approvedSource.missingInteriorPrototypePageIds.join(', '):'none')+
       ' (do not substitute homepage mockups).\n'+
     '- Human approval, visual fidelity and real published HTTP remain unverified.\n':'')+
    '\n\n---\n\n'+renderMarkdown(backlog,release)+'\n\n---\n\n'+TRACE.markdown(traceability)+
    '\n\n---\n\n'+EXECUTION.markdown(execution)+'\n\n---\n\n'+CMS_PACKET.markdown(cmsChangePacket),
  integrationOrder:['verified-owner-facts','approved-prototypes-and-blueprint',
   'existing-site-v1-development','current-manifest-and-override-review',
   'existing-cms-save-and-publish','manual-http-browser-and-three-device-acceptance'],
  caveats:['No direct database/CMS writes.','No main branch merge or deploy.',
   'Priorities indicate work order only, not ranking performance.',
   'Supplied HTML and device captures are not proof of the deployed browser state.',
   'Release never auto-approved.',
   'Supplied acceptance ledger is an unverified assertion, even when all gates are marked approved.',
   'Change impact is an in-memory hypothetical validated Site v1, not a CMS patch or real saved state.',
   ...(originsAgree?[]:['Conflicting supplied HTTP and media origins: capture plan has no approved URL until the lead resolves this.'])]};
}
module.exports=Object.freeze({FORMAT,build});
