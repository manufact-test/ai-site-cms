'use strict';
/* Deterministic owner-review-only diff of TWO authentic, compiled Blueprint v1 inputs.
 * This is NOT a Site v1 migration engine, an HTTP crawler or permission to publish.
 */
const crypto=require('node:crypto');
const {checkBlueprint}=require('./blueprint.cjs');
const ARCH=require('./architecture.cjs');
const FORMAT='manufact-seo-blueprint-change-review-v1';
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const flat=x=>JSON.stringify(x);
const one=(a,b)=>flat(a)===flat(b);
const pageLinks=p=>[
 ...p.links.map(l=>({kind:'contextual',targetId:l.toPageId,anchor:l.anchor,sectionId:null,why:l.why})),
 ...p.sections.filter(s=>s.cta).map(s=>({kind:'cta',targetId:s.cta.toPageId,
  anchor:s.cta.label,sectionId:s.id,why:s.cta.purpose}))
];
const edgeKey=e=>[e.kind,e.targetId,e.sectionId||'',e.anchor,e.why].join(':');
const edgeInventory=edges=>{
 const seen=new Map();return new Map(edges.map(e=>{
  const key=edgeKey(e),count=seen.get(key)||0;seen.set(key,count+1);
  return [key+'#'+count,e];
 }));
};
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const short=x=>String(x??'').replace(/[\x00-\x1f|<>]/g,' ').slice(0,240);
function compare(beforeRaw,afterRaw){
 const before=checkBlueprint(beforeRaw),after=checkBlueprint(afterRaw);
 if(before.siteId!==after.siteId)throw Error('Blueprint change review: source and target site IDs differ');
 const oldPages=new Map(before.pages.map(p=>[p.id,p]));
 const newPages=new Map(after.pages.map(p=>[p.id,p]));
 const oldPaths=new Map(before.pages.map(p=>[p.path,p.id]));
 const newPaths=new Map(after.pages.map(p=>[p.path,p.id]));
 const oldFacts=new Map(before.facts.map(f=>[f.id,f]));
 const newFacts=new Map(after.facts.map(f=>[f.id,f]));
 const changes=[],actions=[],probes=[],changedPages=new Set(),affected=new Set();
 const priorities={P0:0,P1:1,P2:2};
 const actionKeys=new Set();
 const put=(kind,priority,pageId,from,to,message,more={})=>{
  const c={kind,priority,pageId:pageId||null,oldPath:from||null,newPath:to||null,
   message,automatic:false,ownerReviewRequired:true,...more};
  changes.push(c);
  if(pageId)changedPages.add(pageId);
  return c;
 };
 const task=(id,priority,owner,pageId,reason,instruction,evidence)=>{
  if(actionKeys.has(id))return;
  actionKeys.add(id);
  actions.push({id,priority,owner,pageId:pageId||null,reason,instruction,
   evidenceNeeded:evidence,completion:'not-observed',autoApprove:false});
 };
 const probe=(id,kind,pageId,requestPath,expectedStatus,expectedLocationPath=null)=>{
  if(probes.some(p=>p.id===id))return;
  probes.push({id,kind,pageId:pageId||null,requestPath,expectedStatus,
   expectedLocationPath,realHttpVerified:false,leadApproved:false});
 };
 if(before.language!==after.language||before.region!==after.region||
  before.title!==after.title||before.audience!==after.audience||before.goal!==after.goal){
  put('site-positioning-changed','P1',null,null,null,
   'Primary site language, region, name, audience or goal changed; verify business scope, locale and owner instructions.',
   {fields:['language','region','title','audience','goal'].filter(k=>!one(before[k],after[k]))});
  task('site:positioning','P1','SEO editor + owner',null,
   'Site-wide positioning or locale changed',
   'Review whether all approved pages still match the intended audience and language.',
   'Owner-confirmed positioning and language review');
 }
 if(!one(before.research,after.research)){
  put('research-references-changed','P2',null,null,null,
   'Source research references changed; citations do not independently authenticate claims.');
  task('site:research','P2','SEO editor',null,'Research references revised',
   'Review provenance and relevance of added/removed sources before editorial approval.',
   'Documented source review and owner/editor acceptance');
 }
 const allIds=[...new Set([...oldPages.keys(),...newPages.keys()])].sort();
 for(const id of allIds){
  const prev=oldPages.get(id),next=newPages.get(id);
  if(!prev){
   put('page-added','P1',id,null,next.path,'New planned page; public existence, header navigation and indexing are not verified.');
   task('page:'+id+':added','P1','SEO editor + CMS lead',id,
    'New Blueprint page is not proven published',
    'Review original content, canonical, mobile/desktop navigation and explicit owner plan before CMS implementation.',
    'Owner-approved new page and genuine PHP/public page evidence');
   probe('page:'+id+':new','planned-page',id,next.path,200);
   continue;
  }
  if(!next){
   const severity=prev.seo.robots==='index'?'P0':'P1';
   put('page-removed',severity,id,prev.path,null,
    'A page disappeared from the new Blueprint; no redirect destination can be inferred.',
    {wasIndexable:prev.seo.robots==='index'});
   task('page:'+id+':removed',severity,'CMS lead + owner',id,
    'Previously planned '+prev.seo.robots+' page removed from new approved architecture',
    'Decide whether to retain, consolidate, retire or explicitly redirect this route; never silently 301 to home.',
    'Owner migration decision, old URL checks, backlinks/referrer analysis where available');
   probe('page:'+id+':retired','retired-route-review',id,prev.path,null);
   continue;
  }
  if(prev.path!==next.path){
   put('route-moved','P0',id,prev.path,next.path,
    'Same stable page ID moved to another URL; Site v1 301 alias is NOT established by Blueprint.');
   task('page:'+id+':route','P0','CMS lead + owner',id,
    'Planned public page URL changed',
    'Approve old→new mapping, then separately implement and verify true 301 and final destination canonical in Site v1.',
    'Owner-approved migration, Site v1 redirect alias and real HTTP status/Location evidence');
   probe('page:'+id+':old','old-route-301',id,prev.path,301,next.path);
   probe('page:'+id+':new','moved-destination',id,next.path,200);
  }
  if(prev.seo.robots!==next.seo.robots){
   const severity=prev.seo.robots==='index'?'P0':'P1';
   put('robots-changed',severity,id,prev.path,next.path,
    'Index/noindex plan changed; independent search-indexing impact review required.',
    {before:prev.seo.robots,after:next.seo.robots});
   task('page:'+id+':robots',severity,'SEO lead + owner',id,'Planned indexation directive changed',
    'Approve directive against intended public value, then verify real robots/meta and canonical on deployed site.',
    'Approved indexing decision and actual published meta/HTTP evidence');
   probe('page:'+id+':robots','canonical-robots-review',id,next.path,200);
  }
  if(prev.seo.canonicalPath!==next.seo.canonicalPath){
   put('canonical-changed','P0',id,prev.path,next.path,
    'Canonical target changed; verify direct target, indexing policy and no accidental consolidation.',
    {before:prev.seo.canonicalPath,after:next.seo.canonicalPath});
   task('page:'+id+':canonical','P0','SEO lead + CMS lead',id,
    'Canonical declaration changed',
    'Inspect approved direct canonical, target indexability, uniqueness and real rendered head before release.',
    'Owner canonical approval and published page-head observation');
   probe('page:'+id+':canonical','canonical-review',id,next.path,200);
  }
  const metaFields=['title','description','ogTitle','ogDescription'];
  const metaDiff=metaFields.filter(k=>prev.seo[k]!==next.seo[k]);
  if(metaDiff.length){
   put('metadata-changed','P1',id,prev.path,next.path,
    'Planned search/social metadata changed; no ranking or CTR outcome is predicted.',{fields:metaDiff});
   task('page:'+id+':metadata','P1','SEO editor + owner',id,'SEO metadata proposal changed',
    'Confirm factual, language and page-intent consistency; inspect actual HTML after CMS implementation.',
    'Owner-approved SEO metadata and rendered title/description/OG check');
  }
  if(prev.name!==next.name){
   put('page-label-changed','P1',id,prev.path,next.path,
    'Planned page display name changed; inspect visible labels, breadcrumbs and header navigation.');
   task('page:'+id+':label','P1','Content editor + CMS lead',id,
    'Owner-approved page display name differs','Check visible menu labels and breadcrumbs in actual site.',
    'Approved naming and verified navigation UI');
  }
  if(!one(prev.intent,next.intent)){
   put('intent-changed','P1',id,prev.path,next.path,
    'Planned visitor intent or primary topics changed; confirm distinct audience need.',
    {before:prev.intent,after:next.intent});
   task('page:'+id+':intent','P1','SEO editor + owner',id,'Intent or planned topics revised',
    'Compare to factual page purpose and neighboring search intent; no fabricated keyword volumes.',
    'Owner-confirmed intent and editorial plan');
  }
  const oldSecs=new Map(prev.sections.map(s=>[s.id,s]));
  const newSecs=new Map(next.sections.map(s=>[s.id,s]));
  const sectionsAdded=[...newSecs.keys()].filter(x=>!oldSecs.has(x));
  const sectionsRemoved=[...oldSecs.keys()].filter(x=>!newSecs.has(x));
  const sectionsChanged=[...newSecs.keys()].filter(x=>oldSecs.has(x)&&!one(oldSecs.get(x),newSecs.get(x)));
  if(sectionsAdded.length||sectionsRemoved.length||sectionsChanged.length){
   put('sections-changed','P2',id,prev.path,next.path,
    'Approved headings, content outline, CTAs or media intent changed; compare real page after CMS build.',
    {sectionsAdded,sectionsRemoved,sectionsChanged});
   task('page:'+id+':sections','P2','Content editor + designer',id,'Section plan changed',
    'Review H1/heading hierarchy, useful factual copy, visual components and responsive instructions before implementation.',
    'Owner-reviewed section diff and actual desktop/tablet/mobile page comparison');
  }
  if(!one(prev.responsive,next.responsive)){
   put('responsive-plan-changed','P2',id,prev.path,next.path,
    'Editorial desktop/tablet/mobile behavior proposal changed, not a measured viewport result.');
   task('page:'+id+':responsive','P2','Designer + CMS lead',id,'Responsive behavior plan revised',
    'Confirm actual interactive behavior on desktop, tablet and mobile before signoff.',
    'Real viewport review notes for published page');
  }
  const oldEdges=edgeInventory(pageLinks(prev));
  const newEdges=edgeInventory(pageLinks(next));
  const edgeAdded=[...newEdges.keys()].filter(k=>!oldEdges.has(k));
  const edgeRemoved=[...oldEdges.keys()].filter(k=>!newEdges.has(k));
  const edgeUpdated=[]; // Different label/purpose is a removed and newly approved edge.
  // A Blueprint recompilation changes target toPath automatically when the destination moves.
  const inheritedMoved=[...newEdges].filter(([key,e])=>
   oldEdges.has(key)&&oldPages.get(e.targetId)?.path!==newPages.get(e.targetId)?.path)
   .map(([,edge])=>edge);
  if(edgeAdded.length||edgeRemoved.length||edgeUpdated.length||inheritedMoved.length){
   put('contextual-edges-changed','P1',id,prev.path,next.path,
    'Approved contextual routes/CTA targets or their resolved destination URLs changed; actual Site v1 links are UNKNOWN.',
    {added:edgeAdded.map(k=>newEdges.get(k)),removed:edgeRemoved.map(k=>oldEdges.get(k)),
     updated:edgeUpdated.map(k=>({before:oldEdges.get(k),after:newEdges.get(k)})),
     inheritedRouteChanges:inheritedMoved.map(e=>({targetId:e.targetId,
      previousTargetPath:oldPages.get(e.targetId).path,currentTargetPath:newPages.get(e.targetId).path,
      kind:e.kind,sectionId:e.sectionId}))});
   task('page:'+id+':links','P1','SEO editor + CMS lead',id,
    'Planned link/CTA routes or effective destination paths changed',
    'Review real HTML links, design graph and navigation; never assume Blueprint edits altered CMS links.',
    'Verified same-site authored and rendered links from the actual current CMS revision');
  }
  const oldSc=prev.schemaCandidates.map(x=>({type:x.type,factIds:x.factIds,why:x.why,eligible:x.eligible}));
  const newSc=next.schemaCandidates.map(x=>({type:x.type,factIds:x.factIds,why:x.why,eligible:x.eligible}));
  if(!one(oldSc,newSc)){
   const lostEligible=oldSc.some(x=>x.eligible&&!newSc.some(y=>y.type===x.type&&
    y.eligible&&one(y.factIds,x.factIds)));
   const priority=lostEligible?'P0':'P1';
   put('schema-candidates-changed',priority,id,prev.path,next.path,
    'Structured-data candidate or fact support changed; compiler eligibility is not rich-result eligibility.',
    {before:oldSc,after:newSc});
   task('page:'+id+':schema',priority,'SEO editor + owner',id,
    'Candidate schema type or evidence dependencies changed',
    'Check factual basis, actual page content, schema syntax/policy and owner approval before any structured markup.',
    'Confirmed source facts and independently reviewed published structured data');
  }
 }
 // Canonical paths are references to URLs, not stable page IDs. A migrated destination
 // can leave an existing canonical pointing at a now-deleted route.
 for(const p of after.pages){
  const target=oldPaths.get(p.seo.canonicalPath),old=target&&oldPages.get(target);
  if(old&&newPages.has(old.id)&&newPages.get(old.id).path!==old.path&&
    p.seo.canonicalPath===old.path&&!newPaths.has(old.path)){
   put('stale-canonical-after-move','P0',p.id,p.path,p.path,
    'Approved canonical still targets an old URL after another page moved.',
    {staleTarget:old.path,movedPageId:old.id,expectedDirectTarget:newPages.get(old.id).path});
   task('page:'+p.id+':stale-canonical','P0','SEO lead + CMS lead',p.id,
    'Canonical points to a former route of a moved page',
    'Confirm intended canonical target against current URLs; require owner approval for any change.',
    'Approved canonical map and verified rendered head on target host');
  }
 }
 // Fact support affects every referencing schema candidate, even if the candidate
 // declarations were not edited themselves.
 for(const id of [...new Set([...oldFacts.keys(),...newFacts.keys()])].sort()){
  const a=oldFacts.get(id),b=newFacts.get(id);
  if(one(a,b))continue;
  const loss=!!a&&a.status==='confirmed'&&(!b||b.status!=='confirmed');
  const refs=after.pages.flatMap(p=>p.schemaCandidates.filter(c=>c.factIds.includes(id))
   .map(c=>({pageId:p.id,path:p.path,type:c.type})));
  put('fact-evidence-changed',loss&&refs.length?'P0':'P1',null,null,null,
   'Declared fact evidence changed; assertions must be independently verified by the owner.',
   {factId:id,oldStatus:a?.status||'absent',newStatus:b?.status||'absent',
    affectedSchemaCandidates:refs});
  if(loss&&refs.length)for(const x of refs){
   affected.add(x.pageId);
   task('page:'+x.pageId+':fact:'+id,'P0','Owner + SEO editor',x.pageId,
    'Previously confirmed fact lost reliable support for '+x.type,
    'Stop publishing dependent schema claims until separately verified; do not invent replacement values.',
    'Owner-confirmed facts and content/schema review for this release');
  }
 }
 const archBefore=ARCH.report(before),archAfter=ARCH.report(after);
 const sig=x=>[x.code,x.pageId||'',x.targetPageId||'',x.sectionId||'',x.anchor||''].join('|');
 const oldFindings=new Set(archBefore.findings.map(sig));
 const introduced=archAfter.findings.filter(f=>!oldFindings.has(sig(f)));
 for(const f of introduced)if(['warning','error'].includes(f.severity)||
  f.code==='architecture:canonical-chain'){
  task('architecture:'+f.code+':'+(f.pageId||'site'),
   f.code.includes('canonical')?'P0':'P1','SEO architect + CMS lead',f.pageId,
   f.message,'Review new planned information-architecture finding; header/footer and public site are not inspected.',
   'Approved Blueprint architecture review plus real page/navigation proof');
 }
 // A changed inbound destination also affects the pages that must be inspected.
 for(const p of after.pages){
  const links=pageLinks(p);
  if(links.some(e=>changedPages.has(e.targetId)))affected.add(p.id);
 }
 for(const id of changedPages)if(newPages.has(id))affected.add(id);
 actions.sort((a,b)=>priorities[a.priority]-priorities[b.priority]||
  a.id.localeCompare(b.id));
 changes.sort((a,b)=>priorities[a.priority]-priorities[b.priority]||
  String(a.pageId||'').localeCompare(String(b.pageId||''))||a.kind.localeCompare(b.kind));
 probes.sort((a,b)=>a.requestPath.localeCompare(b.requestPath)||a.id.localeCompare(b.id));
 const counts={P0:actions.filter(x=>x.priority==='P0').length,
  P1:actions.filter(x=>x.priority==='P1').length,
  P2:actions.filter(x=>x.priority==='P2').length};
 const result={format:FORMAT,version:1,siteId:before.siteId,readOnly:true,
  beforeBlueprintSha256:digest(before),afterBlueprintSha256:digest(after),
  modified:!one(before,after),
  summary:{beforePages:before.pages.length,afterPages:after.pages.length,
   addedPages:changes.filter(c=>c.kind==='page-added').length,
   removedPages:changes.filter(c=>c.kind==='page-removed').length,
   movedRoutes:changes.filter(c=>c.kind==='route-moved').length,
   changedPageIds:[...changedPages].sort(),affectedPageIds:[...affected].sort(),
   operatorActions:actions.length,priorityActions:counts,
   newArchitectureFindings:introduced.length,plannedHttpProbes:probes.length,
   actualHttpRequests:0},
  sitePositioningBefore:{title:before.title,language:before.language,region:before.region},
  sitePositioningAfter:{title:after.title,language:after.language,region:after.region},
  changes,actions,probePlan:probes,introducedArchitectureFindings:introduced,
  publicationAuthorized:false,clientSignoffAuthenticated:false,redirectsCreated:0,
  notes:[
   'Inputs are two operator-supplied canonical Blueprint v1 files. They are NOT Site v1 revisions.',
   'A Blueprint URL move does NOT create a 301 or prove the public host has changed.',
   'No automatic CMS implementation, owner approval, SEO ranking prediction or public HTTP request.',
   'Retired pages cannot be assigned a redirect destination without explicit owner decision.',
   'Planned contextual links exclude live header/footer and JavaScript-rendered navigation.',
   'P0/P1/P2 mark review urgency, not proof that a live production defect exists.']};
 return Object.freeze(result);
}
function markdown(r){
 if(r?.format!==FORMAT||r.publicationAuthorized!==false)throw Error('Original non-authorizing Blueprint change review required');
 const lines=['# MANUFACT SEO — Blueprint Change Impact','',
  'Private / evidence-based **PLANNED** changes only. Never approval to publish.','',
  'Site: '+short(r.siteId),
  'Before SHA256: '+r.beforeBlueprintSha256,'After SHA256: '+r.afterBlueprintSha256,'',
  'Pages: '+r.summary.beforePages+' → '+r.summary.afterPages+
   ' | Added '+r.summary.addedPages+' | Removed '+r.summary.removedPages+
   ' | Moved '+r.summary.movedRoutes,
  'Review work: P0 '+r.summary.priorityActions.P0+
   ', P1 '+r.summary.priorityActions.P1+', P2 '+r.summary.priorityActions.P2,'',
  '## Planned changes','',
  '| Priority | Change | Page ID | Old route | New route | Why it matters |',
  '|---|---|---|---|---|---|'];
 for(const c of r.changes)lines.push('| '+c.priority+' | '+short(c.kind)+' | '+
  short(c.pageId||'—')+' | '+short(c.oldPath||'—')+' | '+short(c.newPath||'—')+
  ' | '+short(c.message)+' |');
 if(!r.changes.length)lines.push('| — | None | — | — | — | Canonical Blueprint bytes unchanged |');
 lines.push('','## Owner/CMS review actions','');
 for(const a of r.actions)lines.push('- **'+a.priority+' '+short(a.id)+'** ('+short(a.owner)+
  '): '+short(a.reason)+'\n  - Next: '+short(a.instruction)+
  '\n  - Evidence: '+short(a.evidenceNeeded));
 if(!r.actions.length)lines.push('- No observed plan differences requiring operator work.');
 lines.push('','## Live post-implementation checks — NOT executed','');
 for(const p of r.probePlan)lines.push('- '+short(p.requestPath)+
  ' → '+(p.expectedStatus===null?'owner choice required':p.expectedStatus)+
  (p.expectedLocationPath?' Location '+short(p.expectedLocationPath):'')+
  ' ('+short(p.kind)+')');
 if(!r.probePlan.length)lines.push('- No new route-specific probes. Routine host QA remains the lead responsibility.');
 lines.push('','## Evidence and authority boundaries','');
 r.notes.forEach(n=>lines.push('- '+short(n)));
 return lines.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,compare,markdown});
