'use strict';
/* Operator-supplied Search Console export + planned crawlers.
 * Correlation and manual investigation ONLY, never Google-authenticated cause.
 */
const crypto=require('node:crypto');
const BP=require('./blueprint.cjs');
const CRAWL=require('./crawl-policy.cjs');
const {FORMAT:INDEX}=require('./search-indexing.cjs');
const FORMAT='manufact-seo-crawl-indexing-correlation-v1',HASH=/^[0-9a-f]{64}$/;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const clean=x=>String(x??'').replace(/[\x00-\x1f|<>]/g,' ').trim().slice(0,250);
function analyze({blueprint,blueprintRawSha256,policy,indexing,indexingRawSha256}){
 const bp=BP.checkBlueprint(blueprint);
 if(!HASH.test(blueprintRawSha256||'')||!HASH.test(indexingRawSha256||'')||
  policy?.format!==CRAWL.FORMAT||policy.readOnly!==true||
  policy.publicationAuthorized!==false||policy.publicHostAuthenticated!==false||
  policy.blueprintSha256!==sha(JSON.stringify(bp))||
  indexing?.format!==INDEX||indexing.readOnly!==true||
  indexing.blueprintSha256!==blueprintRawSha256||
  indexing.siteId!==bp.siteId||policy.siteId!==bp.siteId||
  indexing.publicOrigin!==policy.base||
  !Array.isArray(indexing.pages)||!Array.isArray(policy.pages)||
  !policy.agents?.some(agent=>agent.toLowerCase()==='googlebot')||
  !['complete','sample'].includes(policy.scope))
  throw Error('Crawl/indexing correlation requires original same-Blueprint, GSC property and exact public base evidence');
 const approved=new Map(bp.pages.map(p=>[p.id,p]));
 const observed=new Map(),crawled=new Map();
 for(const item of indexing.pages){
  if(!item||!approved.has(item.pageId)||observed.has(item.pageId)||
   approved.get(item.pageId).path!==item.path)
   throw Error('GSC indexing page inventory does not match current approved Blueprint');
  observed.set(item.pageId,item);
 }
 for(const item of policy.pages){
  if(!item||!approved.has(item.pageId)||crawled.has(item.pageId)||
   approved.get(item.pageId).path!==item.path||item.canonicalTarget!==approved.get(item.pageId).seo.canonicalPath)
   throw Error('Crawl policy page inventory does not match current approved Blueprint');
  crawled.set(item.pageId,item);
 }
 if(observed.size!==approved.size||crawled.size!==approved.size)
  throw Error('Crawl/indexing reports are incomplete for the canonical Blueprint page inventory');
 const pages=[],actions=[],counts={needsUrgentInspection:0,needsEditorialInspection:0,
  noObservedIndexingRow:0,reportedIndexed:0,reportedNotIndexed:0,policyGooglebotBlocked:0};
 const add=(priority,type,pageId,path,reason,manualNext)=>{
  actions.push({id:type+':'+pageId,priority,type,pageId,path,reason,manualNext,
   ownerRecordedOnly:true,causeAuthenticated:false,requiresHumanReview:true,automatic:false});
  if(priority==='P1')counts.needsUrgentInspection++;
  else counts.needsEditorialInspection++;
 };
 for(const p of bp.pages){
  const idx=observed.get(p.id),policyPage=crawled.get(p.id);
  const google=policyPage.crawlerDecisions.find(x=>x.agent.toLowerCase()==='googlebot');
  if(!google||typeof google.allowed!=='boolean'||typeof idx.observationStatus!=='string')
   throw Error('Incomplete GSC/Googlebot per-page observation');
  const status=idx.observationStatus,eligible=p.seo.robots==='index'&&
   p.seo.canonicalPath===p.path,observedRow=idx.indexingEvidenceProvided===true;
  if(!['indexed','not-indexed','unknown','unobserved'].includes(status)||
   status==='unobserved'&&observedRow||status!=='unobserved'&&!observedRow)
   throw Error('Contradictory GSC row presence and operator-declared status');
  if(status==='unobserved')counts.noObservedIndexingRow++;
  if(status==='indexed')counts.reportedIndexed++;
  if(status==='not-indexed')counts.reportedNotIndexed++;
  if(!google.allowed)counts.policyGooglebotBlocked++;
  const sitemap=policyPage.sitemap;
  const evidenceInterpretation=!observedRow?'no-indexing-url-row':
   'operator-declared-indexing-status-not-live-url-inspection';
  let reviewStatus='no-combined-escalation';
  if(eligible&&!google.allowed&&status==='not-indexed'){
   reviewStatus='robots-and-nonindexed-coobserved';
   add('P1','review-robots-plus-unindexed',p.id,p.path,
    'Approved canonical indexable page is blocked by supplied Googlebot rules while GSC export reports not indexed.',
    'Inspect actual served robots response, current URL Inspection, crawl history and canonical before proposing any robots changes.');
  }else if(eligible&&!google.allowed){
   reviewStatus=status==='indexed'?'robots-block-with-historical-indexed-report':
    'robots-block-with-incomplete-indexing-evidence';
   add('P1','review-indexable-googlebot-block',p.id,p.path,
    'Supplied Googlebot rule blocks an approved canonical indexable page; indexing observation is '+status+'.',
    'Confirm whether the Googlebot block exists on the current published host and inspect actual crawl/index history.');
  }else if(eligible&&status==='not-indexed'){
   reviewStatus='notindexed-googlebot-allowed';
   add('P2','review-unindexed-despite-crawl-allow',p.id,p.path,
    'GSC export reports not indexed but supplied robots policy permits Googlebot; this does not establish a technical cause.',
    'Review live canonical/robots/X-Robots-Tag, content, sitemap and actual URL Inspection; do not infer ranking outcomes.');
  }else if(p.seo.robots==='noindex'&&status==='indexed'){
   reviewStatus='declared-noindex-reported-indexed';
   add('P1','review-noindex-reported-indexed',p.id,p.path,
    'Owner plan specifies noindex, but operator-declared GSC export reports indexed.',
    'Inspect actual served noindex, canonical, URL Inspection and whether the GSC row is stale.');
  }else if(eligible&&sitemap==='not-observed'&&
   policy.scope==='complete'&&policy.sitemapMeta.kind==='urlset'){
   reviewStatus='approved-url-missing-in-complete-sitemap';
   add('P2','review-indexable-missing-sitemap',p.id,p.path,
    'An approved canonical indexable URL is absent from the explicitly complete supplied XML sitemap.',
    'Confirm the full public sitemap inventory and independently inspect published canonical and robots.');
  }
  pages.push({pageId:p.id,path:p.path,plannedRobots:p.seo.robots,
   canonicalPath:p.seo.canonicalPath,indexingObservedAt:indexing.observedAt,
   gscReportedStatus:status,gscReportedReason:idx.observationReason||null,
   gscRowPresent:observedRow,googlebotAllowedInSuppliedRobots:google.allowed,
   googlebotMatchedRule:google.matchedRule||null,suppliedSitemapStatus:sitemap,
   reviewStatus,evidenceInterpretation,
   reportedGscAuthenticated:false,realGooglebotHttpVerified:false,
   causalExplanationEstablished:false});
 }
 const order={P1:0,P2:1,P3:2};
 actions.sort((a,b)=>order[a.priority]-order[b.priority]||a.path.localeCompare(b.path));
 return {format:FORMAT,version:1,siteId:bp.siteId,readOnly:true,
  base:policy.base,approvedBlueprintSha256:policy.blueprintSha256,
  originalBlueprintSourceSha256:blueprintRawSha256,
  originalIndexingReportSha256:indexingRawSha256,
  suppliedRobotsSha256:policy.robotsSha256,suppliedSitemapSha256:policy.sitemapSha256,
  declaredIndexingObservedAt:indexing.observedAt,
  exportScope:indexing.exportScope,sitemapScope:policy.scope,
  summary:{approvedPages:bp.pages.length,operatorTasks:actions.length,
   ...counts,authenticatedLiveSearchEngineStatus:0,networkRequests:0},
  pages,actions,clientSignoffAuthenticated:false,
  publicationAuthorized:false,causalExplanationEstablished:false,
  limitations:[
   'GSC export rows are operator-normalized observations, not authenticated Google URL Inspection.',
   'Supplied robots/sitemap bytes and chosen public base are not independently verified against live host.',
   'Search index records can lag behind current served crawl policy; disagreement is not evidence of causal mechanism.',
   'Unobserved URL rows never mean excluded, not-indexed, or an indexing failure.',
   'Only approved same-site Blueprint page IDs and routes are correlated; no CMS edits, POSTs, indexing requests or GO.',
   'Investigations require owner approval and exact real HTTPS host / published revision verification.'
  ]};
}
function markdown(r){
 if(r?.format!==FORMAT||r.publicationAuthorized!==false)
  throw Error('Invalid SEO crawl/indexing correlation');
 const out=['# MANUFACT SEO — Crawl rules vs Search Index observations','',
  'PRIVATE HUMAN INVESTIGATION. Correlation does NOT prove causation or current Google indexing.','',
  'Site '+clean(r.siteId)+' / '+clean(r.base),
  'GSC observed (operator declared) '+clean(r.declaredIndexingObservedAt),
  'P1 human investigations '+r.summary.needsUrgentInspection+' | P2 '+r.summary.needsEditorialInspection,'',
  '| Approved route | Googlebot policy | Reported GSC | Sitemap observation | Investigation |',
  '|---|---|---|---|---|'];
 for(const p of r.pages)out.push('| '+clean(p.path)+' | '+
  (p.googlebotAllowedInSuppliedRobots?'Allow':'Block')+' | '+clean(p.gscReportedStatus)+
  ' | '+clean(p.suppliedSitemapStatus)+' | '+clean(p.reviewStatus)+' |');
 out.push('','## Manual follow-up','');
 for(const a of r.actions)out.push('- '+a.priority+' '+clean(a.path)+': '+clean(a.manualNext));
 if(!r.actions.length)out.push('- No combined signal triggered. This does not prove current site indexability.');
 out.push('','## Evidence limits','');for(const s of r.limitations)out.push('- '+clean(s));
 return out.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,analyze,markdown});
