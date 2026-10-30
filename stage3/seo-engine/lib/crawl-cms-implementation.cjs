'use strict';
/* Search delivery -> actual Site v1 manual implementation map.
 * Only source-attested editorial inspection; NEVER publishes or patches the CMS.
 */
const crypto=require('node:crypto');
const BP=require('./blueprint.cjs');
const {fingerprint}=require('./acceptance.cjs');
const FORMAT='manufact-seo-crawl-cms-implementation-v1';
const HASH=/^[0-9a-f]{64}$/;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const valid=(v,why)=>{if(!v)throw Error('Crawl/CMS source mismatch: '+why)};
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const PRIORITY={P0:0,P1:1,P2:2};
const safe=x=>String(x??'').replace(/[\x00-\x1f\x7f|<>]/g,' ').trim().slice(0,260);
function build(source){
 const {blueprint,blueprintRawSha256,site,siteRawSha256,policy,
  regression=null,correlation=null,repair=null,repairManifest=null}=source||{};
 const bp=BP.checkBlueprint(blueprint);
 valid(HASH.test(blueprintRawSha256||'')&&HASH.test(siteRawSha256||''),
  'original Blueprint and Site v1 byte SHA256 required');
 valid(policy?.format==='manufact-seo-crawl-policy-v1'&&policy.readOnly===true&&
  policy.publicationAuthorized===false&&policy.siteId===bp.siteId&&
  policy.publicHostAuthenticated===false&&
  policy.blueprintSha256===sha(JSON.stringify(bp)),
  'canonical approved Blueprint must match crawl policy');
 valid(typeof policy.base==='string'&&policy.base.startsWith('https://')&&
  policy.base.endsWith('/')&&Array.isArray(policy.pages)&&
  Array.isArray(policy.findings),
  'invalid current crawl policy');
 valid(site?.format==='manufact-ai-site-v1'&&site.schemaVersion===1&&
  site.siteId===bp.siteId&&Array.isArray(site.pages)&&site.pages.length<=80,
  'owner-supplied current Site v1 format/identity');
 valid(!source.indexing||source.indexing.siteId===bp.siteId&&
  source.indexing.blueprintSha256===blueprintRawSha256&&
  source.indexing.publicOrigin===policy.base,
  'indexing observation must use the exact original Blueprint bytes and public mount');
 if(correlation)valid(correlation.originalBlueprintSourceSha256===blueprintRawSha256,
  'GSC crawl correlation refers to a different original Blueprint file');
 if(repair){
  valid(repair.releaseAuthorized===false&&repair.artifactsDraftOnly===true&&
   repairManifest?.sourceRawSha256?.site===siteRawSha256&&
   repairManifest.sourceRawSha256.blueprint===blueprintRawSha256&&
   repairManifest.sourceRawSha256.robots===policy.robotsSha256&&
   repairManifest.sourceRawSha256.sitemap===policy.sitemapSha256,
   'repair plan was prepared against a different owner-supplied Site v1 / Blueprint / crawl source');
 }
 const known=new Map(bp.pages.map(p=>[p.id,p])),actual=new Map(),routes=new Set();
 for(const p of site.pages){
  valid(p&&typeof p.id==='string'&&ROUTE.test(p.path)&&
   !actual.has(p.id)&&!routes.has(p.path),
   'duplicate/malformed Site v1 page identity');
  actual.set(p.id,p);routes.add(p.path);
 }
 const watched=new Map();
 for(const page of policy.pages){
  valid(known.has(page.pageId)&&!watched.has(page.pageId)&&
   page.path===known.get(page.pageId).path&&
   page.plannedRobots===known.get(page.pageId).seo.robots&&
   page.canonicalTarget===known.get(page.pageId).seo.canonicalPath,
   'crawl policy page ID/route differs from approved plan');
  watched.set(page.pageId,page);
 }
 valid(watched.size===known.size,'crawl policy page inventory incomplete');
 const indexable=p=>p.seo.robots==='index'&&p.seo.canonicalPath===p.path;
 const packets=[],missing=[],extra=[],conflicts=[],blockers=[],manual=[];
 const push=(priority,category,pageId,path,origin,detail,action)=>{
  valid(Object.hasOwn(PRIORITY,priority),'invalid P0/P1/P2 priority');
  manual.push({priority,category,pageId:pageId||null,path:path||null,
   source:origin,detail,leadAction:action,automatic:false});
 };
 for(const p of bp.pages){
  const current=actual.get(p.id),crawler=watched.get(p.id);
  const live=current?{
    pageId:current.id,path:current.path,
    robots:current.seo?.robots??'index',
    canonicalPath:current.seo?.canonicalPath??current.path,
    title:current.seo?.title??null,
    description:current.seo?.description??null,
    ogTitle:current.seo?.ogTitle??null,
    ogDescription:current.seo?.ogDescription??null
  }:null;
  const drift={
   pageMissing:!live,route:!!live&&live.path!==p.path,
   robots:!!live&&live.robots!==p.seo.robots,
   canonical:!!live&&live.canonicalPath!==p.seo.canonicalPath,
   title:!!live&&live.title!==p.seo.title,
   description:!!live&&live.description!==p.seo.description,
   ogTitle:!!live&&live.ogTitle!==p.seo.ogTitle,
   ogDescription:!!live&&live.ogDescription!==p.seo.ogDescription
  };
  const blocked=Object.entries(drift).filter(([,v])=>v).map(([k])=>k);
  const perPage={pageId:p.id,path:p.path,canonicalPath:p.seo.canonicalPath,
   indexableCanonical:indexable(p),approvedSeo:p.seo,
   currentSite:live,editorState:blocked.length?'SOURCE DRIFT — REVIEW':'MATCHES SELECTED SOURCE',
   driftFields:blocked,readOnly:true,ownerSiteVersionAuthenticated:false};
  packets.push(perPage);
  if(!live){
   missing.push({pageId:p.id,approvedPath:p.path,manualOnly:true});
   push('P0','cms-page-missing',p.id,p.path,'site-v1-drift',
    'Approved page ID absent from owner-supplied Site v1.',
    'Lead must authenticate current CMS snapshot and reconcile missing page before any crawler policy changes.');
  }else{
   if(drift.route){
    push('P0','cms-route',p.id,p.path,'site-v1-drift',
     'Page ID is present at a different route: '+live.path,
     'Lead must compare published route, redirects and approved Blueprint; do not move automatically.');
   }
   if(drift.robots){
    push('P1','cms-seo-robots',p.id,p.path,'site-v1-drift',
     'Current Site v1 seo.robots='+live.robots+' differs from approved '+p.seo.robots+'.',
     'Inspect existing page SEO robots control in CMS and approved owner overrides. Do not Save/Publish automatically.');
   }
   if(drift.canonical){
    push('P1','cms-canonical-manual',p.id,p.path,'site-v1-drift',
     'Current Site v1 canonical target '+live.canonicalPath+' differs from approved '+p.seo.canonicalPath+'.',
     'Canonical customization is not universally supported by Site v1; lead must inspect PublicRenderer/owner revision.');
   }
   for(const field of ['title','description','ogTitle','ogDescription']){
    if(!drift[field])continue;
    push('P2','cms-metadata',p.id,p.path,'site-v1-drift',
     'Current seo.'+field+' differs from approved Blueprint.',
     'Inspect the existing CMS page SEO field and any manual override; do not apply a crawler fix to editorial metadata.');
   }
  }
  const agents=crawler.crawlerDecisions||[];
  for(const agent of agents){
   if(!indexable(p)||agent.allowed!==false)continue;
   push(agent.agent?.toLowerCase()==='googlebot'?'P0':'P1',
    'publisher-robots-policy',p.id,p.path,'original-crawl-policy',
    'Supplied robots.txt excludes approved canonical indexable URL for '+agent.agent+'.',
    'Lead must verify actually served robots.txt and matched agent group, then authorize a separate robots publisher correction.');
  }
  if(indexable(p)&&crawler.sitemap==='not-observed'&&
   policy.scope==='complete'&&policy.sitemapMeta?.kind==='urlset'){
   push('P1','publisher-sitemap',p.id,p.path,'original-crawl-policy',
    'Approved canonical URL missing from operator-declared COMPLETE XML urlset.',
    'Lead must check actual public XML sitemap and mount before any publisher change.');
  }
 }
 for(const p of site.pages)if(!known.has(p.id)){
  extra.push({pageId:p.id,currentPath:p.path,manualOnly:true});
  push('P1','cms-unapproved-page',p.id,p.path,'site-v1-drift',
   'Current Site v1 has an extra page ID that is not in approved Blueprint.',
   'Lead must reconcile whether published route is required, indexable or private; draft sitemap must not be treated as exhaustive.');
 }
 if(site.redirects!==undefined){
  valid(Array.isArray(site.redirects)&&site.redirects.length<=100,
   'Site v1 redirect inventory invalid');
  const canon=new Set(bp.pages.filter(indexable).map(x=>x.path));
  for(const redir of site.redirects){
   valid(redir&&typeof redir.from==='string'&&typeof redir.to==='string',
    'malformed published redirect');
   if(!canon.has(redir.from))continue;
   conflicts.push({from:redir.from,to:redir.to,manualOnly:true});
   push('P0','publisher-redirect-collision',null,redir.from,'site-v1-redirects',
    'Approved canonical indexed route is shadowed by redirect to '+redir.to+'.',
    'Lead must authenticate and correct the actual redirect map before any robots/sitemap action.');
  }
 }
 const pageByPath=new Map(bp.pages.map(p=>[p.path,p]));
 const correlateAction=(item,origin,category,leadAction)=>{
  if(!item||!Object.hasOwn(PRIORITY,item.priority))return;
  const p=known.get(item.pageId)||pageByPath.get(item.path);
  push(item.priority,category,p?.id||item.pageId||null,p?.path||item.path||null,origin,
   safe(item.reason||item.message||item.type||item.id),
   safe(item.manualNext||item.instruction||leadAction));
 };
 for(const f of policy.findings)if(f.pageId===null||!known.has(f.pageId))
  correlateAction(f,'original-crawl-policy','manual-crawl-investigation',
   'Confirm original robots/sitemap and public-host source with owner.');
 if(regression)for(const item of regression.changes)
  correlateAction(item,'crawl-regression',item.kind==='new-robots-block'?
   'publisher-robots-regression':'publisher-policy-regression',
   'Compare original before/after policy and verified public host; no policy auto-change.');
 if(correlation)for(const item of correlation.actions)
  correlateAction(item,'gsc-crawl-co-observation','search-console-inspection',
   'Investigate actual Google URL Inspection; correlation is not causation.');
 if(repair)for(const hold of repair.manualHolds)
  push('P1','candidate-manual-hold',hold.pageId||null,hold.path||null,
   'private-crawl-repair',safe(hold.reason)+' — '+safe(hold.detail),
   'Keep candidate private; resolve group ambiguity and privacy intent with owner/lead.');
 const order=(a,b)=>PRIORITY[a.priority]-PRIORITY[b.priority]||
  (a.path||'').localeCompare(b.path||'')||a.category.localeCompare(b.category);
 manual.sort(order);
 const dedupe=new Map();
 for(const item of manual){
  const key=[item.priority,item.category,item.pageId||'',item.path||'',item.detail].join('|');
  if(!dedupe.has(key))dedupe.set(key,item);
 }
 const actions=[...dedupe.values()],counts={
  P0:actions.filter(a=>a.priority==='P0').length,
  P1:actions.filter(a=>a.priority==='P1').length,
  P2:actions.filter(a=>a.priority==='P2').length};
 return {format:FORMAT,version:1,readOnly:true,siteId:bp.siteId,base:policy.base,
  approvedBlueprintCanonicalSha256:policy.blueprintSha256,
  originalBlueprintRawSha256:blueprintRawSha256,originalSiteRawSha256:siteRawSha256,
  selectedSiteFingerprint:fingerprint(site),
  sourcePolicyRobotsSha256:policy.robotsSha256,
  sourcePolicySitemapSha256:policy.sitemapSha256,
  originalSiteAuthenticated:false,publicHostAuthenticated:false,
  currentCmsRevisionAuthenticated:false,ownerApprovalAuthenticated:false,
  pages:packets,missingPages:missing,extraPages:extra,redirectCollisions:conflicts,
  actions,summary:{approvedPages:bp.pages.length,sourcePages:site.pages.length,
   driftPages:packets.filter(p=>p.driftFields.length).length,unapprovedExtraPages:extra.length,
   redirectCollisions:conflicts.length,totalManualActions:actions.length,priorities:counts},
  releaseAuthorized:false,automaticApplication:false,
  limitations:[
   'All source inputs are owner/operator selected; matching hashes do not authenticate the currently published CMS revision.',
   'A CMS page SEO robots field is not an Allow/Disallow rule in robots.txt.',
   'Canonical support differs by CMS/renderer; this document does not claim a writable canonical field.',
   'GSC rows do not authenticate Google indexation, and robots-policy co-observation is NOT causation.',
   'No generated task carries automatic permission to mutate a CMS field, robots, sitemap or redirects.'
  ]};
}
function markdown(r){
 valid(r?.format===FORMAT&&r.releaseAuthorized===false,'read-only implementation report required');
 const out=['# MANUFACT SEO — crawl findings → existing CMS / publisher worklist','',
  'PRIVATE · SOURCE-BOUND · NOT A RELEASE · NEVER AUTOPATCH','',
  'Site '+safe(r.siteId)+' / '+safe(r.base),
  'Blueprint canonical SHA256 '+r.approvedBlueprintCanonicalSha256,
  'Blueprint original byte SHA256 '+r.originalBlueprintRawSha256,
  'Operator Site v1 original byte SHA256 '+r.originalSiteRawSha256,
  'Site v1 fingerprint '+r.selectedSiteFingerprint,
  'P0 '+r.summary.priorities.P0+' / P1 '+r.summary.priorities.P1+
   ' / P2 '+r.summary.priorities.P2,'',
  '## Prioritized MANUAL implementation tasks',''];
 for(const a of r.actions)out.push('- **'+a.priority+'** ['+safe(a.category)+'] '+
  safe(a.path||'site')+' / '+safe(a.pageId||'—')+' — '+safe(a.detail)+
  ' | Lead: '+safe(a.leadAction));
 if(!r.actions.length)out.push('- No triggered manual tasks in these inputs. Real host and client approval remain REQUIRED.');
 out.push('','## Exact approved/current Site v1 route and field comparison','',
  '| Approved page ID | Approved route | Selected Site v1 route | SEO drift |', '|---|---|---|---|');
 for(const p of r.pages)out.push('| '+safe(p.pageId)+' | '+safe(p.path)+' | '+
  safe(p.currentSite?.path||'(MISSING)')+' | '+safe(p.driftFields.join(', ')||'None in supplied sources')+' |');
 out.push('','## Boundaries','');
 for(const note of r.limitations)out.push('- '+safe(note));
 return out.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,build,markdown});
