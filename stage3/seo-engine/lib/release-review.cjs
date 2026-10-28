'use strict';
// Conservative prepublication evidence gate for integrators.
// An automatic pass is deliberately impossible: visual, forms and live data
// require real manual checks owned by the lead.
const {work}=require('./remediation.cjs');
const {compare}=require('./parity.cjs');
const REGRESSION=require('./regression.cjs');
const FORMAT='manufact-seo-release-review-v1';
function assess(site,manifests,blueprint,options={},precomputedBacklog=null){
 const backlog=precomputedBacklog||work(site,manifests,blueprint,options);
 if(backlog.siteId!==site.siteId||backlog.format!=='manufact-seo-remediation-v1'||!backlog.readOnly)
  throw Error('Incompatible SEO remediation backlog');
 const x=backlog.tasks,parity=options.snapshot?compare(site,blueprint,options.snapshot):null;
 const blockers=[],reviews=[],manual=[];
 const add=(where,id,title,detail,related=[])=>where.push({gateId:id,title,detail,taskIds:related,automaticPass:false});
 const find=(predicate)=>x.filter(predicate).map(t=>t.taskId);
 const broken=find(t=>t.sources.some(s=>['core:broken-link','core:broken-anchor'].includes(s.code)||
  (options.snapshot?.completeness==='complete'&&s.code==='html:broken-link')));
 const missing=find(t=>t.sources.some(s=>s.reason==='page-development'||s.code==='planned-page-missing'));
 const drift=find(t=>t.sources.some(s=>['parity:indexation-drift','parity:path-mismatch'].includes(s.code)));
 const dangerousMarkup=find(t=>t.sources.some(s=>s.code==='evidence:unverified-schema-published'));
 const regression=options.baselineSite?REGRESSION.compare(options.baselineSite,site,manifests,blueprint):null;
 const fragmentProblems=find(t=>t.sources.some(s=>s.code==='evidence:broken-fragment'));
 if(regression?.summary.criticalReviewItems)add(blockers,'new-critical-regressions',
  'Review new severe SEO regressions since prior Site v1 version',
  'New errors or index-to-noindex changes require explicit approval or repair before release.',
  find(t=>t.sources.some(s=>s.kind==='site-regression')));
 if(dangerousMarkup.length)add(blockers,'published-unverified-structured-data',
  'Review published structured data based on unverified facts',
  'A JSON-LD type appears in captured HTML while its associated blueprint evidence remains unverified. Remove or verify actual claims before release.',dangerousMarkup);
 if(fragmentProblems.length)add(reviews,'broken-fragments',
  'Review unresolved fragment targets in supplied HTML',
  'The captured target page has no matching HTML id; partial capture and runtime-generated anchors require verification.',fragmentProblems);
 if(broken.length)add(blockers,'broken-navigation','Resolve confirmed broken page/anchor links',
  'Broken implemented navigation or supplied HTML links must be reviewed and corrected before public release.',broken);
 if(missing.length)add(blockers,'approved-pages-absent','Resolve missing approved pages',
  'A page in the approved blueprint has not been implemented in the supplied Site v1 project.',missing);
 if(drift.length)add(blockers,'publication-drift','Resolve route/indexation mismatch',
  'Supplied HTML or Site v1 indexation does not match approved deployment intent.',drift);
 const unsafeFacts=find(t=>t.phase==='verify-facts');
 if(unsafeFacts.length)add(reviews,'schema-evidence','Do not publish unverifiable structured-data claims',
  'Either verify facts and validate the exact markup or omit the optional candidate; unresolved markup is not publication-approved.',unsafeFacts);
 const redirects=find(t=>t.sources.some(s=>s.reason==='path-review'));
 if(redirects.length)add(reviews,'redirect-review','Review route changes and 301 policy',
  'A path change requires approved navigation, redirects and canonical policy, never an automatic rewrite.',redirects);
 const metadata=find(t=>t.category==='metadata'||t.category==='indexation');
 if(metadata.length)add(reviews,'metadata-approval','Review title, description, OG, canonical and robots changes',
  'Validate every proposed field against source and manual CMS overrides; current output is a proposal only.',metadata);
 const content=find(t=>['conversion','semantic-structure','content','site-links'].includes(t.category));
 if(content.length)add(reviews,'editorial-and-ux','Review page purpose, headings, links and CTAs',
  'Confirm text usefulness and visitor paths with actual page rendering; literal topic matching is not semantic understanding.',content);
 const boundaries=[
  ['prototype-approval','Verify three explicitly approved static desktop/tablet/mobile prototype images and their immutable revision IDs.'],
  ['visual-fidelity','Compare actual implementation with the approved prototypes on desktop/tablet/mobile, including layouts, typography and visible content.'],
  ['behavior','Verify real forms, anti-spam, delivery status, CTA destinations, keyboard/focus behavior and mobile interactions.'],
  ['published-host','Verify HTTPS public origin, redirects, canonical URL, OG image delivery, robots.txt, sitemap.xml and correct host/mount.'],
  ['structured-data','If any Schema.org markup is shipped, verify visible supporting content, allowed schema type and actual JSON-LD output.'],
  ['performance','Check measured Web Vitals/performance and accessibility on the deployed site; offline tool has no lab/field data.'],
  ['overrides-and-rollback','Confirm editor manual overrides, Save ≠ Publish, audit history and rollback on the actual installation.']
 ];
 for(const [id,detail] of boundaries)add(manual,id,'Manual acceptance: '+id,detail,[]);
 const coverage={
  validatedSiteV1:true,
  auditedAgainstBlueprint:true,
  staticHtmlSupplied:Boolean(options.snapshot),
  staticHtmlChecked:Boolean(parity),
  suppliedThreeDeviceMarkupReviewed:Boolean(options.viewports),
  deepHtmlEvidenceChecked:Boolean(options.snapshot),
  siteRegressionCompared:Boolean(options.baselineSite),
  liveHostChecked:false,
  visualPrototypesVerified:false,
  mobileRenderedVerified:false,
  formsVerified:false,
  cwvMeasured:false
 };
 const decision=blockers.length?'repair-required':options.snapshot||options.viewports?'manual-acceptance-required':'collect-publication-evidence';
 return {format:FORMAT,version:1,siteId:site.siteId,
  decision,automaticReleaseApproval:false,readyToPublish:false,
  blockers,reviews,manualChecks:manual,coverage,
  summary:{blockingGates:blockers.length,reviewGates:reviews.length,manualChecks:manual.length,
   remediationTasks:x.length},
  boundaries:'This is a conservative preparation gate, not a deployment validator or SEO ranking certificate. The lead/site owner must explicitly approve the actual release after browser, host, functional, legal and visual checks.'};
}
module.exports=Object.freeze({FORMAT,assess});
