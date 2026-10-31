'use strict';
/* Source-derived first client SEO lead readiness, never a GO decision.
 * Evaluates existing WORKSPACE renderings, never the private raw page/GSC body.
 * Missing evidence stays missing; "no observed blocker" never authenticates release.
 */
const crypto=require('node:crypto');
const FORMAT='manufact-seo-first-site-lead-readiness-v1';
const SHA=/^[a-f0-9]{64}$/;
const VALID=['BLOCKED','NEEDS-EVIDENCE','LEAD-REVIEW-REQUIRED','POST-LAUNCH-DEFERRED'];
const ORDER={P0:0,P1:1,P2:2};
const fail=s=>{throw Error('First-site SEO lead readiness: '+s);};
const insist=(x,s)=>{if(!x)fail(s)};
const safe=x=>String(x??'').replace(/[\x00-\x1f\x7f<>|]/g,' ').trim().slice(0,250);
const id=s=>'lead-check:'+crypto.createHash('sha256').update(s).digest('hex').slice(0,24);
function build({siteId,first=null,launch=null,search=null,visibility=null,
 indexing=null,indexed=null,indexingSourceSha256=null,crawl=null,human=null,manual=null,queue=null}={}){
 insist(typeof siteId==='string'&&/^[a-z][a-z0-9-]{2,79}$/.test(siteId),
  'canonical customer siteId required');
 insist((!first||first.summary?.siteId===siteId)&&
  (!search||search.history?.siteId===siteId)&&
  (!indexing||indexing.siteId===siteId)&&
  (!crawl||crawl.siteId===siteId)&&
  (!human||human.report?.siteId===siteId),'cross-site or malformed evidence');
 insist((!first||launch?.siteId===siteId)&&
  (!search||visibility?.summary?.siteId===siteId)&&
  (!indexing||indexed?.summary?.siteId===siteId)&&
  (!crawl||crawl.overview?.releaseAuthorized===false)&&
  (!human||manual?.siteId===siteId),'missing or inconsistent prior source review');
 const sources={
  firstSiteSummary:first?.summarySha||null,
  firstSitePostDeploy:first?.postDeploySha||null,
  searchHistory:search?.historySha||null,
  originalBlueprint:crawl?.sourceIdentity?.originalBlueprintFileSha256||null,
  originalSiteV1:crawl?.sourceIdentity?.siteSnapshotSha256||null,
  crawlerPolicy:crawl?.sourceIdentity?.files?.policy||null,
  currentPublicHttp:crawl?.sourceIdentity?.files?.publicCapture||null,
  renderedDOM:crawl?.sourceIdentity?.files?.renderedCapture||null,
  ownerHumanLeadContract:human?.contractSha||null,
  indexingReport:indexingSourceSha256||crawl?.sourceIdentity?.files?.indexingReport||null
 };
 for(const [name,x] of Object.entries(sources))
  insist(x===null||SHA.test(x),'invalid SHA256 for '+name);
 const rows=[];
 const push=(key,phase,priority,status,team,label,detail,nextEvidence,dependencies=[],sourceSha=null,extra={})=>{
  insist(!rows.some(x=>x.key===key)&&VALID.includes(status)&&['P0','P1','P2'].includes(priority)&&
   ['PRE_LAUNCH','POST_LAUNCH'].includes(phase)&&
   ['CMS_LEAD','SEO_OPERATOR','PUBLISHER_LEAD','OWNER_CLIENT'].includes(team)&&
   Array.isArray(nextEvidence)&&nextEvidence.length>=1&&nextEvidence.length<=8,
   'invalid, duplicate or unbounded lead gate '+key);
  rows.push({id:id(siteId+'|'+key),key,phase,priority,status,ownerTeam:team,
   title:label,why:detail,nextEvidence,dependencies,sourceSha256:sourceSha,
   ownerApprovalRequired:true,automatic:false,releaseAuthorized:false,...extra});
 };
 const local=first?.summary?.release||null;
 const blockers=local?.blockingGates;
 const hasFirst=!!first;
 insist(!hasFirst||Number.isSafeInteger(blockers)&&blockers>=0&&
  Array.isArray(local.blockerIds)&&local.blockerIds.length===blockers,
  'inconsistent first-site original blocker counts');
 push('approved-local-source','PRE_LAUNCH','P0',
  hasFirst?'LEAD-REVIEW-REQUIRED':'NEEDS-EVIDENCE','CMS_LEAD',
  'Owner-selected site and approved source provenance',
  hasFirst?'Local first-site source report exists, but does not authenticate current owner-published revision.':
   'No original local first-site technical summary supplied.',
  ['Authenticate exact current owner CMS sourceRevision and publishedVersion against approved project source',
   'Retain private original first-site report and explicit owner/lead decision'],
  [],sources.firstSiteSummary);
 push('local-technical-gates','PRE_LAUNCH','P0',
  !hasFirst?'NEEDS-EVIDENCE':blockers>0?'BLOCKED':'LEAD-REVIEW-REQUIRED',
  'CMS_LEAD','Local PHP / static technical release gates',
  !hasFirst?'Local technical blockers unobserved; not evidence of a clean release.':
  blockers>0?'Original local source reports '+blockers+' technical blocker(s).':
   'No blocker recorded in original local review; lead must authenticate source and run real tests.',
  ['Resolve and re-run exact local SEO/PHP/static gates','Document lead rollback and current publisher source'],
  ['approved-local-source'],sources.firstSiteSummary,{originalBlockingGates:blockers??null,
   originalBlockerIds:local?.blockerIds?.slice(0,100)||[]});
 const post=first?.postDeploy||null;
 const postBad=post&&(post.disposition!=='TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED');
 push('public-release-evidence','PRE_LAUNCH','P0',
  !post?'NEEDS-EVIDENCE':postBad?'BLOCKED':'LEAD-REVIEW-REQUIRED',
  'PUBLISHER_LEAD','Actual published HTTPS and media integrity',
  !post?'No original post-deploy verification was supplied.':
   postBad?'Original public technical report did not declare technical match.':
    'Post-deploy technical report claims a match; real host/source provenance is still not authenticated.',
  ['Independently authenticate real HTTPS/TLS host and current owner-published revision',
   'Review public page, canonical, robots, sitemap and media SHA256 evidence',
   'Obtain real rollback/provenance record before any client release decision'],
  ['approved-local-source','local-technical-gates'],sources.firstSitePostDeploy,
  {postDeployDisposition:post?.disposition||null});
 const checks=human?.report?.checks||null;
 if(checks)insist(['passed','pending','failed'].every(s=>Number.isSafeInteger(checks[s])&&checks[s]>=0)&&
  checks.passed+checks.pending+checks.failed===checks.required,'inconsistent human checks');
 const humanFailed=!!checks?.failed;
 const humanIncomplete=!checks||checks.pending>0;
 push('manual-browser-and-client-acceptance','PRE_LAUNCH','P0',
  !human?'NEEDS-EVIDENCE':humanFailed?'BLOCKED':humanIncomplete?'NEEDS-EVIDENCE':
   'LEAD-REVIEW-REQUIRED','OWNER_CLIENT',
  'Browser/device, actual form delivery and owner signoff',
  !human?'No source-pinned operator live acceptance review.':
   humanFailed?'Operator reports failed real-world checks.':
    humanIncomplete?'Operator source reports pending browser/form or manual acceptance checks.':
    'Operator checkmarks are complete, but NOT independently authenticated owner/client approval.',
  ['Inspect real desktop/tablet/mobile browser and interactive journeys',
   'Verify authorized form POST + actual delivery receipts or document no forms',
   'Collect separately authenticated final client approval and rollback owner'],
  ['public-release-evidence'],human?.contractSha||null,
  {humanReportedPassed:checks?.passed??null,humanReportedFailed:checks?.failed??null,
   humanReportedPending:checks?.pending??null,operatorReviewStatus:human?.report?.status||null});
 const searchCount=visibility?.summary?.tasks??null;
 push('search-performance-followup','POST_LAUNCH','P2',
  !visibility?'POST-LAUNCH-DEFERRED':searchCount>0?'LEAD-REVIEW-REQUIRED':
   'LEAD-REVIEW-REQUIRED','SEO_OPERATOR',
  'Search Console performance and editorial tasks',
  visibility?'Private reported Search History has '+searchCount+' human SEO task(s).':
   'Search History absent: expected before accumulating real Google data, not a launch clearance.',
  ['Import authenticated Search Console property evidence only after the site is serving',
   'Review URL/query mapping and editorial decisions without assuming rankings or causation'],
  ['public-release-evidence'],sources.searchHistory,{operatorSearchTasks:searchCount});
 const indexCount=indexed?.summary?.actions??null;
 push('gsc-indexing-followup','POST_LAUNCH','P1',
  !indexed?'POST-LAUNCH-DEFERRED':'LEAD-REVIEW-REQUIRED','SEO_OPERATOR',
  'Search Console URL Indexing and real URL Inspection',
  indexed?'Operator-supplied indexing report lists '+indexCount+' manual action(s).':
   'Indexing source not provided; absence must not be interpreted as Google indexing success.',
  ['Inspect actual Google URL Inspection results for important approved URLs',
   'Investigate reported excluded/indexed status only after independent source checks'],
  ['public-release-evidence'],sources.indexingReport,
  {reportedIndexingActions:indexCount});
 const crawlP0=crawl?.counts.P0??null,crawlP1=crawl?.counts.P1??null;
 push('crawler-policy-and-sitemap','PRE_LAUNCH','P0',
  !crawl?'NEEDS-EVIDENCE':crawlP0>0?'BLOCKED':'LEAD-REVIEW-REQUIRED',
  'SEO_OPERATOR','Robots, sitemap and crawler regression investigations',
  crawl?'Original crawl evidence reports '+crawlP0+' P0 and '+crawlP1+' P1 operator findings.':
   'No original crawler policy evidence; cannot establish indexing access or sitemap correctness.',
  ['Check actual served robots.txt for Googlebot/Bingbot precedence, correct sitemap URL and canonical scope',
   'Resolve all real P0; owner and publisher lead approve publisher change separately'],
  ['approved-local-source'],sources.crawlerPolicy,{crawlerP0:crawlP0,crawlerP1:crawlP1});
 const cms=crawl?.cmsReview||null,nCms=cms?.summary.totalManualActions??null;
 push('crawl-cms-editor-worklist','PRE_LAUNCH','P1',
  !cms?'NEEDS-EVIDENCE':nCms>0?'LEAD-REVIEW-REQUIRED':'LEAD-REVIEW-REQUIRED',
  'CMS_LEAD','Approved Blueprint → current CMS SEO field worklist',
  cms?'Private CMS/hosting map contains '+nCms+' manual implementation action(s).':
   'No approved Blueprint + owner-selected Site v1 comparison was supplied.',
  ['Compare selected CMS Site v1 with owner-published authenticated revision',
   'Review redirects, canonical, page robots/title/description and owner overrides',
   'No CMS Save or publish without lead and owner approval'],
  ['approved-local-source','crawler-policy-and-sitemap'],
  sources.originalSiteV1,{cmsManualActions:nCms});
 const delta=crawl?.cmsRecheck||null;
 push('crawl-cms-repeat-observations','POST_LAUNCH','P1',
  !delta?'POST-LAUNCH-DEFERRED':delta.summary.completedReportedStillObserved>0||
   delta.summary.newCriticalP0>0||delta.summary.changedCriticalP0>0?'BLOCKED':'LEAD-REVIEW-REQUIRED',
  'SEO_OPERATOR','Repeat crawl/CMS task lifecycle evidence',
  !delta?'Earlier and later original crawl/CMS worklists not supplied; cannot infer any resolved task.':
   'Observed new P0 '+delta.summary.newCriticalP0+'; reported complete still seen '+
    delta.summary.completedReportedStillObserved+'; missing tasks never auto-close.',
  ['Repeat crawl analysis after manual edits','Independently verify any issue disappearance against real public host'],
  ['crawler-policy-and-sitemap','crawl-cms-editor-worklist'],
  delta?.sourceAfterRawSha256||null,
  {persisting:delta?.summary.persistent??null,newP0:delta?.summary.newCriticalP0??null,
   completedStillObserved:delta?.summary.completedReportedStillObserved??null});
 const http=crawl?.publicFollowup||null;
 push('published-crawl-cms-evidence','PRE_LAUNCH','P0',
  !http?'NEEDS-EVIDENCE':http.summary.conflict>0||
   http.summary.independentDeliveryBlockers>0?'BLOCKED':
   http.summary.unknown>0?'NEEDS-EVIDENCE':'LEAD-REVIEW-REQUIRED',
  'PUBLISHER_LEAD','Public HTTP evidence for crawler, canonical and metadata fixes',
  !http?'No private source-pinned public HTTPS transcript was correlated with current crawl tasks.':
   'Supplied public bytes: '+http.summary.conflict+' conflicting, '+
    http.summary.unknown+' unknown, '+http.summary.alignedNotVerified+
    ' aligned but NOT verified; independent delivery errors '+
    http.summary.independentDeliveryBlockers+'.',
  ['Review exact operator-supplied HTTPS transcript, robots/sitemap and HTML signal',
   'Confirm independently current owner CMS version, host TLS and source revision',
   'No automatic task closure, launch GO or Google indexing claim'],
  ['public-release-evidence','crawler-policy-and-sitemap'],
  http?.suppliedPublicCaptureRawSha256||null,
  {publicConflicts:http?.summary.conflict??null,
   publicUnknown:http?.summary.unknown??null,
   publicRootRecheckStable:http?.htmlCoverage?.rootRecheckStable??null,
   independentDeliveryBlockers:http?.summary.independentDeliveryBlockers??null,
   alignedNotVerified:http?.summary.alignedNotVerified??null});
 const schema=crawl?.structuredData||null;
 push('structured-data-owner-claims','PRE_LAUNCH','P1',
  !schema?'NEEDS-EVIDENCE':schema.summary.P0>0?'BLOCKED':
   schema.summary.uninspectedPages>0?'NEEDS-EVIDENCE':'LEAD-REVIEW-REQUIRED',
  'SEO_OPERATOR','Schema.org JSON-LD semantics and owner-backed claims',
  !schema?'No original per-site public JSON-LD semantic review was supplied.':
   'Actual supplied HTML: '+schema.summary.P0+' P0, '+schema.summary.P1+
    ' P1, '+schema.summary.uninspectedPages+' uninspected approved pages. Owner factual claims and Google rich-result status are NOT verified.',
  ['Inspect JSON-LD syntax and approved-schema candidates, canonical URLs and BreadcrumbList references',
   'Validate business facts, reviews, prices, addresses and offers directly with the owner',
   'Do not auto-insert structured data or claim Google rich-result eligibility'],
  ['approved-local-source','published-crawl-cms-evidence'],
  schema?.inputSHA256?.publicHttp||null,
  {schemaP0:schema?.summary.P0??null,schemaP1:schema?.summary.P1??null,
   uninspected:schema?.summary.uninspectedPages??null});
 const rendered=crawl?.renderedContent||null;
 push('rendered-seo-content-parity','PRE_LAUNCH','P0',
  !rendered?'NEEDS-EVIDENCE':rendered.summary.P0>0?'BLOCKED':
   rendered.summary.missingRenderPages>0?'NEEDS-EVIDENCE':'LEAD-REVIEW-REQUIRED',
  'SEO_OPERATOR','Published HTML vs desktop/tablet/mobile DOM SEO signal reconciliation',
  !rendered?'No current release-paired rendered DOM source was supplied.':
   'Original source pairs report '+rendered.summary.P0+' P0, '+rendered.summary.P1+
   ' P1 and '+rendered.summary.missingRenderPages+' incompletely compared page(s). '+
   'Responsive pairs unknown: '+(rendered.summary.responsiveUnknownPairs??'not-collected')+
   '; browser main-text pairs unknown: '+(rendered.summary.textUnknownPairs??'not-collected')+
   '; fragment links with missing target IDs: '+(rendered.summary.fragmentMissingTotal??'not-collected')+
   '. Browser, source revision and Google rendering are NOT authenticated.',
  ['Correlate captured DOM and HTTPS source with the exact same published version',
   'Inspect per-viewport H1, substantive main content, CTA/fragment routes, canonical/noindex and JSON-LD mutations',
   'Investigate responsive overflow, interaction targets, image loading and isolated timing observations without treating them as field Core Web Vitals',
   'Get independent browser and client accessibility signoff; never equate DOM parity with Google indexing'],
  ['public-release-evidence','manual-browser-and-client-acceptance'],
  sources.renderedDOM,{renderedP0:rendered?.summary.P0??null,
   renderedP1:rendered?.summary.P1??null,
   missingRenderedPages:rendered?.summary.missingRenderPages??null});
 const queueStatus=queue?.summary;
 if(queueStatus)insist(Number.isSafeInteger(queueStatus.urgent)&&
  Number.isSafeInteger(queueStatus.pending),'invalid human action queue totals');
 push('lead-urgent-and-pending','PRE_LAUNCH','P0',
  !queue?'NEEDS-EVIDENCE':queueStatus.urgent>0?'BLOCKED':
   queueStatus.pending>0?'NEEDS-EVIDENCE':'LEAD-REVIEW-REQUIRED',
  'CMS_LEAD','Manual acceptance work queue and customer lead assignment',
  !queue?'No source-bound lead browser/form action queue was supplied.':
   'Existing first-site human action queue has '+queueStatus.urgent+
    ' urgent and '+queueStatus.pending+' pending.',
  ['Resolve urgent real browser/form failures or document missing evidence',
   'Assign final acceptance and rollback responsibility to lead and client'],
  ['manual-browser-and-client-acceptance'],human?.contractSha||null,
  {urgent:queueStatus?.urgent??null,pending:queueStatus?.pending??null});
 // Absence of optional POST-LAUNCH Google observations must not block first public launch.
 // Real client release authorization is ALWAYS external, even with zero local blockers.
 const counts={
  preLaunchBlocked:rows.filter(x=>x.phase==='PRE_LAUNCH'&&x.status==='BLOCKED').length,
  preLaunchMissing:rows.filter(x=>x.phase==='PRE_LAUNCH'&&x.status==='NEEDS-EVIDENCE').length,
  preLaunchLeadReview:rows.filter(x=>x.phase==='PRE_LAUNCH'&&x.status==='LEAD-REVIEW-REQUIRED').length,
  postLaunchDeferred:rows.filter(x=>x.phase==='POST_LAUNCH'&&x.status==='POST-LAUNCH-DEFERRED').length,
  postLaunchObserved:rows.filter(x=>x.phase==='POST_LAUNCH'&&x.status!=='POST-LAUNCH-DEFERRED').length
 };
 const reviewOrder=rows.slice().sort((a,b)=>ORDER[a.priority]-ORDER[b.priority]||
  (a.status==='BLOCKED'?0:a.status==='NEEDS-EVIDENCE'?1:2)-
  (b.status==='BLOCKED'?0:b.status==='NEEDS-EVIDENCE'?1:2)||
  a.key.localeCompare(b.key));
 return {format:FORMAT,version:1,siteId,readOnly:true,
  purpose:'PRIVATE LEAD TRIAGE; NOT A CMS RELEASE, CLIENT SIGNOFF OR GOOGLE VERIFICATION',
  sourceRawSha256:sources,stages:['PRE_LAUNCH','POST_LAUNCH'],
  summary:{...counts,totalGates:rows.length,urgency:counts.preLaunchBlocked?'FIX-OR-REVIEW-BLOCKERS':
   counts.preLaunchMissing?'COLLECT-MISSING-EVIDENCE':'INDEPENDENT-LEAD-REVIEW',
   neverAutomaticGO:true,ownerApprovalAuthenticated:false,publicHostAuthenticated:false},
  gates:reviewOrder,mandatoryLeadInstructions:[
   'Integrate ONLY approved SEO worker subtree. Run focused Node smokes in a trusted checkout and inspect actual original owner CMS sourceRevision.',
   'Investigate all PRE_LAUNCH BLOCKED and NEEDS-EVIDENCE gates; the absence of report data is NOT success.',
   'Independent first client acceptance covers real public HTTPS/TLS, rendered browser, accessible interactions, real authorized forms and delivery, privacy and rollout rollback.',
   'Never upload owner-only worklists or original Google exports; no Google property ownership or indexation is asserted here.',
   'Owner/client signoff must be separately authenticated and lead-only release or rollback performed outside this artifact.'
  ],
  releaseAuthorized:false,automaticAction:false,publicHostAuthenticated:false,
  clientApprovalAuthenticated:false,googlePropertyAuthenticated:false};
}
function markdown(r){
 insist(r?.format===FORMAT&&r.readOnly&&r.releaseAuthorized===false,
  'read-only lead readiness required');
 const out=['# MANUFACT — First client SEO lead readiness','',
  'PRIVATE OPERATOR WORKING RECORD · NEVER AUTOMATIC GO','',
  'Site: '+safe(r.siteId),
  'Prelaunch blocked '+r.summary.preLaunchBlocked+' · missing '+r.summary.preLaunchMissing+
   ' · manual lead review '+r.summary.preLaunchLeadReview,
  'Postlaunch deferred '+r.summary.postLaunchDeferred,'',
  '| Phase | Priority | State | Owner team | Gate | Next evidence |',
  '|---|---|---|---|---|---|'];
 for(const g of r.gates)out.push('| '+g.phase+' | '+g.priority+' | '+g.status+
  ' | '+g.ownerTeam+' | '+safe(g.title)+' | '+g.nextEvidence.map(safe).join('; ')+' |');
 out.push('','## Source-pinned original report SHA256','');
 for(const [key,value] of Object.entries(r.sourceRawSha256))
  out.push('- '+key+': '+(value===null?'NOT SUPPLIED':safe(value)));
 out.push('','## Required lead handling','');
 for(const s of r.mandatoryLeadInstructions)out.push('- '+safe(s));
 return out.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,build,markdown});
