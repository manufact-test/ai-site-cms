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
const FORMAT='manufact-seo-review-bundle-v1';
function build(site,manifests,blueprint,options={}){
 const plan=checkBlueprint(blueprint);
 if(!site||site.siteId!==plan.siteId)throw Error('Review package siteId mismatch');
 if(!Array.isArray(manifests))throw Error('Review package requires current manifests');
 if(!options||typeof options!=='object'||Array.isArray(options)||
    Object.keys(options).some(k=>!['snapshot','viewports','baselineSite','decisions'].includes(k)))
  throw Error('Unsupported review-package options');
 // Validate with authoritative core first, not just the loosely typed SEO blueprint.
 const audit=auditSite(site,manifests,plan);
 const architecture=reviewArchitecture(plan);
 const evidence=options.snapshot?reviewHtml(options.snapshot,plan):null;
 const viewports=options.viewports?reviewViewports(options.viewports,plan):null;
 const regression=options.baselineSite?compareSite(options.baselineSite,site,manifests,plan):null;
 const published=options.snapshot?compareHtml(site,plan,options.snapshot):null;
 const publication=options.snapshot?reviewPublication(site,options.snapshot):null;
 const handoff=propose(site,manifests,plan);
 const {decisions:ledger,...coreOptions}=options;
 const backlog=work(site,manifests,plan,coreOptions);
 const release=assess(site,manifests,plan,coreOptions,backlog);
 const traceability=TRACE.report(site,plan,{
  ...(options.snapshot?{snapshot:options.snapshot}:{}),
  ...(options.viewports?{viewports:options.viewports}:{})},audit,backlog);
 const decisions=ledger?TRIAGE.reconcile(backlog,ledger):null;
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
  plannedPagesAbsentFromSite:expected.filter(id=>!fromSite.has(id)),
  htmlExportPageCount:options.snapshot?.pages?.length??null,
  htmlExportCompleteness:options.snapshot?.completeness||'partial-or-unknown',
  plannedPagesAbsentFromHtmlExport:options.snapshot?missingExport:null,
  viewportsPageCount:options.viewports?.pages?.length??null,
  plannedPagesAbsentFromThreeDeviceExport:options.viewports?missingDevice:null,
  actualVisualComparisonPerformed:false,liveHttpVerified:false,sitePublished:false};
 const rejected=new Set(decisions?.rejected.map(x=>x.taskId)||[]);
 const approved=new Set(decisions?.approved.map(x=>x.taskId)||[]);
 const deferred=new Set(decisions?.deferred.map(x=>x.taskId)||[]);
 const nextActions=backlog.tasks.filter(t=>!rejected.has(t.taskId)).slice(0,12).map(task=>({
  taskId:task.taskId,priority:task.priority,owner:task.owner,
  category:task.category,pageId:task.pageId,dependsOn:task.dependsOn,
  instruction:task.instruction,decision:approved.has(task.taskId)?'approved-for-manual-work':deferred.has(task.taskId)?'deferred':'unreviewed',automatic:false
 }));
 return {format:FORMAT,version:1,siteId:site.siteId,readOnly:true,
  contract:acceptedFormats,coverage,
  blueprintReview:architecture,siteAudit:audit,
  htmlEvidence:evidence,htmlParity:published,publicationIntegrity:publication,deviceEvidence:viewports,
  traceability,decisions,
  regression,handoff,backlog,release,nextActions,
  markdownHandoff:renderMarkdown(backlog,release),
  integrationOrder:['verified-owner-facts','approved-prototypes-and-blueprint',
   'existing-site-v1-development','current-manifest-and-override-review',
   'existing-cms-save-and-publish','manual-http-browser-and-three-device-acceptance'],
  caveats:['No direct database/CMS writes.','No main branch merge or deploy.',
   'Priorities indicate work order only, not ranking performance.',
   'Supplied HTML and device captures are not proof of the deployed browser state.',
   'Release never auto-approved.']};
}
module.exports=Object.freeze({FORMAT,build});
