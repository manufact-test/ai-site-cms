'use strict';
// Architecture / pre-publication research gate. No crawls, rankings, links inserted,
// assertions about traffic, or fabricated rich-result eligibility.
const {checkBlueprint}=require('./blueprint.cjs');
const FORMAT='manufact-seo-architecture-v1';
const norm=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const generic=/^(?:click here|here|read more|learn more|more|подробнее|сюда|здесь|читать далее|узнать больше|więcej|mehr erfahren)$/i;
function report(blueprint){
 const b=checkBlueprint(blueprint),byId=new Map(b.pages.map(p=>[p.id,p])),byPath=new Map(b.pages.map(p=>[p.path,p]));
 const edges=new Map(),reverse=new Map(b.pages.map(p=>[p.id,[]]));
 const findings=[],pages=[],candidates=[];
 const add=(code,severity,pageId,message,fields={})=>findings.push({code,severity,pageId,path:byId.get(pageId)?.path||null,message,...fields});
 for(const p of b.pages){
  const edgesHere=[];
  const incomingMap=new Map();
  for(const l of p.links)edgesHere.push({toPageId:l.toPageId,kind:'contextual-link',anchor:l.anchor,sectionId:null});
  for(const s of p.sections)if(s.cta)edgesHere.push({toPageId:s.cta.toPageId,kind:'cta',anchor:s.cta.label,sectionId:s.id});
  for(const edge of edgesHere)reverse.get(edge.toPageId).push({fromPageId:p.id,...edge});
  edges.set(p.id,edgesHere);
  if(p.sections[0].level!==1)add('architecture:primary-heading-position','recommendation',p.id,'The first planned section is not H1; verify the visual/semantic entry order.',{sectionId:p.sections[0].id});
  for(let i=1;i<p.sections.length;i++)if(p.sections[i].level>p.sections[i-1].level+1)
   add('architecture:heading-jump','warning',p.id,'Planned headings jump levels without a structural parent.',{sectionId:p.sections[i].id,previousLevel:p.sections[i-1].level,level:p.sections[i].level});
  if(p.seo.robots==='noindex'&&p.path==='/')add('architecture:home-noindex','warning',p.id,'Home is planned noindex: confirm this is deliberate.');
  if(p.seo.canonicalPath!==p.path){
   const target=byPath.get(p.seo.canonicalPath);
   if(target.seo.robots==='noindex')add('architecture:canonical-noindex-target','warning',p.id,'Canonical target is planned noindex; these directives may conflict.',{targetPageId:target.id});
   if(target.seo.canonicalPath!==target.path)add('architecture:canonical-chain','recommendation',p.id,'Canonical target itself points elsewhere; prefer an intentional direct canonical target.',{targetPageId:target.id,finalTargetPath:target.seo.canonicalPath});
   if(target.id===p.id)add('architecture:unexpected-canonical','recommendation',p.id,'Canonical path differs from page route but resolves to same page ID.');
  }
  if(p.path!=="/"){
   const segments=p.path.split('/').filter(Boolean);
   if(segments.length>1){
    const parentPath='/'+segments.slice(0,-1).join('/')+'/';
    if(!byPath.has(parentPath))add('architecture:hierarchy-parent-absent','recommendation',p.id,
     'URL has no matching parent route in the proposed map; this is optional, check breadcrumb/navigation intent.',{parentPath});
   }
  }
  for(const l of p.links){
   if(generic.test(l.anchor))add('architecture:generic-anchor','recommendation',p.id,'Contextual anchor is generic; a descriptive label may help navigation.',{targetPageId:l.toPageId,anchor:l.anchor});
   if(l.toPageId===p.id)add('architecture:self-link','recommendation',p.id,'Contextual page link points back to this page; verify it serves a purpose.',{anchor:l.anchor});
   const count=incomingMap.get(l.toPageId)||0;incomingMap.set(l.toPageId,count+1);
   if(count===1)add('architecture:repeated-target','recommendation',p.id,'The page plan repeats contextual links to the same destination; verify placements rather than removing them automatically.',{targetPageId:l.toPageId});
  }
  for(const s of p.sections)if(s.media&&s.media.purpose==='informative'&&generic.test(s.media.alt))
   add('architecture:generic-image-alt','recommendation',p.id,'Planned informative image has generic alt intent; describe its purpose rather than adding keywords.',{sectionId:s.id});
 }
 const titleMap=new Map(),descriptionMap=new Map();
 for(const p of b.pages){
  if(p.seo.robots!=='index')continue;
  for(const [key,map] of [['title',titleMap],['description',descriptionMap]]){
   const value=norm(p.seo[key]);
   const previous=map.get(value);
   if(previous)add('architecture:duplicate-'+key,'warning',p.id,'Indexed pages have identical proposed SEO '+key+'; verify page-specific value.',{otherPageId:previous});
   else map.set(value,p.id);
  }
 }
 const home=byPath.get('/');
 const distances=new Map([[home.id,0]]),predecessors=new Map(),queue=[home.id];
 for(let cursor=0;cursor<queue.length;cursor++){
  const id=queue[cursor];
  for(const edge of edges.get(id)||[]){
   if(distances.has(edge.toPageId))continue;
   distances.set(edge.toPageId,distances.get(id)+1);
   predecessors.set(edge.toPageId,{fromPageId:id,edgeKind:edge.kind});
   queue.push(edge.toPageId);
  }
 }
 const destinations=new Set(b.pages.flatMap(p=>p.sections.filter(s=>s.cta).map(s=>s.cta.toPageId)));
 for(const p of b.pages){
  const path=[];
  if(distances.has(p.id)){
   let node=p.id;
   while(node){path.unshift(node);node=predecessors.get(node)?.fromPageId;}
  }
  const inbound=reverse.get(p.id)||[];
  if(p.seo.robots==='index'&&p.id!==home.id&&!distances.has(p.id))
   add('architecture:unreachable-from-home','warning',p.id,'Indexed page is not reachable through explicit planned contextual links/CTAs; navigation has not been supplied.',{inboundCount:inbound.length});
  if(p.seo.robots==='index'&&p.id!==home.id&&!inbound.some(x=>byId.get(x.fromPageId)?.seo.robots==='index'))
   add('architecture:no-indexed-inbound','recommendation',p.id,'No planned direct contextual link from an indexed page; check discovery routes and primary navigation.',{inboundCount:inbound.length});
  if(destinations.size>0&&['commercial','transactional'].includes(p.intent.type)){
   const seen=new Set([p.id]),q=[p.id];
   let nearest=null;
   for(let idx=0;idx<q.length;idx++){
    const id=q[idx];
    if(destinations.has(id)){nearest=id;break;}
    for(const link of edges.get(id)||[])if(!seen.has(link.toPageId)){seen.add(link.toPageId);q.push(link.toPageId);}
   }
   if(!nearest)add('architecture:no-action-route','recommendation',p.id,
    'Commercial/transactional page has no planned route through contextual links to any explicitly declared CTA destination; inspect the visitor journey.',
    {declaredDestinations:[...destinations]});
  }
  pages.push({pageId:p.id,path:p.path,robots:p.seo.robots,primaryIntent:p.intent.type,
   primaryTopic:p.intent.topics[0],inboundCount:inbound.length,
   directIndexedInbound:inbound.filter(x=>byId.get(x.fromPageId)?.seo.robots==='index').length,
   outgoingCount:(edges.get(p.id)||[]).length,
   reachableFromHome:distances.has(p.id),shortestExplicitPathFromHome:path,
   shortestExplicitHopsFromHome:distances.get(p.id)??null,
   canonicalTargetId:byPath.get(p.seo.canonicalPath)?.id||null,
   isExplicitCtaDestination:destinations.has(p.id)});
 }
 const facts=new Map(b.facts.map(f=>[f.id,f]));
 for(const p of b.pages)for(const s of p.schemaCandidates){
  const dependencies=s.factIds.map(id=>({factId:id,status:facts.get(id).status,origin:facts.get(id).origin,source:facts.get(id).source||null}));
  const unverified=dependencies.filter(f=>f.status!=='confirmed').map(f=>f.factId);
  // Confirmed facts are only one precondition. Eligibility for Google's rich
  // results additionally requires content, markup type & policy verification.
  candidates.push({pageId:p.id,path:p.path,type:s.type,why:s.why,dependencies,
   status:unverified.length?'blocked-unverified-facts':'candidate-needs-markup-review',
   unverifiedFactIds:unverified,publicationApproved:false});
  if(unverified.length)add('architecture:schema-unverified-facts','warning',p.id,
   'Structured-data candidate relies on unverified facts and must not be published as verified markup.',{schemaType:s.type,factIds:unverified});
 }
 return {format:FORMAT,version:1,siteId:b.siteId,
  pages,links:b.pages.flatMap(p=>(edges.get(p.id)||[]).map(l=>({fromPageId:p.id,...l}))),
  schemaCandidates:candidates,findings,
  boundaries:'Blueprint-only route graph excludes header/footer navigation and deployed pages. No traffic, indexing, SERP, mobile-render, schema rich-result eligibility or performance claims. Findings are editorial review prompts, not automatic changes.'};
}
module.exports=Object.freeze({FORMAT,report});
