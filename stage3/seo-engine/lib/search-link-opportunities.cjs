'use strict';
/* Search-aware approved internal-link investigation. No invented new routes or CMS mutations. */
const {checkBlueprint}=require('./blueprint.cjs');
const {extract}=require('./content-intelligence.cjs');
const {FORMAT:PERFORMANCE}=require('./gsc-performance.cjs');
const FORMAT='manufact-seo-search-link-opportunities-v1';
const clean=x=>String(x??'').replace(/[|<>\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,200);
function build(blueprint,performance,site=null){
 const b=checkBlueprint(blueprint);
 if(performance?.format!==PERFORMANCE||performance.siteId!==b.siteId||
  !Array.isArray(performance.pages)||!performance.readOnly)
  throw Error('Internal-link review requires a matching measured SEO report');
 if(site&&site.siteId!==b.siteId)throw Error('Site v1 mismatch for internal-link review');
 const observedPages=new Map(performance.pages.map(p=>[p.pageId,p]));
 const byId=new Map(b.pages.map(p=>[p.id,p]));
 const links=site?new Map(extract(site).map(p=>[p.id,{
  path:p.path,links:p.sections.flatMap(s=>s.links.map(l=>({...l,sectionId:s.id})))}])):null;
 const allEdges=[];
 for(const source of b.pages){
  for(const link of source.links){
   const target=byId.get(link.toPageId);
   if(!target)throw Error('Approved link destination not found');
   allEdges.push({sourcePageId:source.id,sourcePath:source.path,targetPageId:target.id,targetPath:target.path,
    kind:'contextual',anchor:link.anchor,reason:link.why});
  }
  for(const section of source.sections){
   if(!section.cta)continue;
   const target=byId.get(section.cta.toPageId);
   if(!target)throw Error('Approved CTA destination not found');
   allEdges.push({sourcePageId:source.id,sourcePath:source.path,targetPageId:target.id,targetPath:target.path,
    kind:'cta',sectionId:section.id,anchor:section.cta.label,reason:section.cta.purpose});
  }
 }
 const reviewedEdges=allEdges.map(edge=>{
  const source=links?.get(edge.sourcePageId)||null;
  const matching=source?.links.filter(l=>l.toPath===edge.targetPath)||[];
  return {...edge,authoredSectionEvidence:!site?'not-supplied':!source?'source-page-not-mapped':
   source.path!==edge.sourcePath?'source-route-drift':
   matching.length?'observed-in-authored-section':'not-observed-in-authored-section',
   observedSourceSectionIds:[...new Set(matching.map(l=>l.sectionId))].slice(0,15),
   limitations:'Authoring-only links, not header/footer or actual browser crawl; not-observed is not a broken-link claim.'};
 });
 const recommendations=[],targetReports=[];
 for(const target of b.pages){
  if(target.seo.robots!=='index')continue;
  const evidence=observedPages.get(target.id),m=evidence?.metrics;
  const inbound=reviewedEdges.filter(e=>e.targetPageId===target.id&&e.sourcePageId!==target.id&&
   byId.get(e.sourcePageId)?.seo.robots==='index');
  const good=inbound.filter(x=>x.authoredSectionEvidence==='observed-in-authored-section');
  const candidate=!!m&&m.impressions>=150&&m.averagePosition<=20;
  const status=!m?'no-measured-page-row':!candidate?'below-editorial-review-threshold':
   inbound.length===0?'no-approved-incoming-contextual-route':
   !site?'approved-links-planned-implementation-unverified':
   good.length?'some-approved-links-observed-in-authoring':'approved-links-not-observed-in-authoring';
  const signals=evidence?.topQueries?.slice(0,6).map(q=>({
   query:clean(q.query),impressions:q.impressions,clicks:q.clicks,
   observedNotPrescribed:true}))||[];
  targetReports.push({pageId:target.id,path:target.path,approvedIntent:target.intent.type,
   observedMetrics:m||null,searchQueries:signals,incomingApprovedEdges:inbound.length,
   observedAuthoredInboundEdges:good.length,reviewStatus:status});
  if(!candidate)continue;
  if(inbound.length===0){
   recommendations.push({id:'review-discoverability:'+target.id,priority:'P2',targetPageId:target.id,
    targetPath:target.path,sourcePageId:null,sourcePath:null,
    type:'review-discoverability',searchEvidence:{...m,queries:signals},
    reason:'Measured approved indexed page has no incoming contextual link or CTA in approved Blueprint.',
    instruction:'Ask the owner whether an appropriate contextual path should be added to the approved architecture; do not invent a link or alter CMS automatically.',
    requiresApprovedBlueprintChange:true,automatic:false});
   continue;
  }
  for(const e of inbound){
   if(e.authoredSectionEvidence==='observed-in-authored-section')continue;
   if(!site)continue; // no implementation evidence means no implementation gap claim
   if(!['not-observed-in-authored-section','source-page-not-mapped','source-route-drift'].includes(e.authoredSectionEvidence))continue;
   const sourceMetrics=observedPages.get(e.sourcePageId)?.metrics||null;
   recommendations.push({id:'review-planned-link:'+e.sourcePageId+':'+target.id+':'+e.kind,
    priority:m.impressions>=300?'P2':'P3',type:'review-planned-link',
    targetPageId:target.id,targetPath:target.path,sourcePageId:e.sourcePageId,sourcePath:e.sourcePath,
    linkKind:e.kind,approvedAnchor:e.anchor,approvedPurpose:e.reason,
    evidenceStatus:e.authoredSectionEvidence,
    searchEvidence:{...m,queries:signals},sourceSearchEvidence:sourceMetrics,
    reason:'Approved contextual route or CTA not located in supplied Site v1 authored section content. It may exist in rendered navigation.',
    instruction:'Inspect actual published HTML and navigation before implementing any missing approved link; preserve existing CMS owner edits.',
    requiresApprovedBlueprintChange:false,automatic:false});
  }
 }
 recommendations.sort((a,b)=>a.priority.localeCompare(b.priority)||
  b.searchEvidence.impressions-a.searchEvidence.impressions||a.id.localeCompare(b.id));
 return {format:FORMAT,version:1,siteId:b.siteId,readOnly:true,
  sourcePeriod:performance.period,siteAuthoringSupplied:!!site,
  summary:{approvedPages:b.pages.length,approvedEdges:reviewedEdges.length,
   observedAuthoredEdges:reviewedEdges.filter(e=>e.authoredSectionEvidence==='observed-in-authored-section').length,
   suggestedHumanReviews:recommendations.length},
  approvedEdges:reviewedEdges,targets:targetReports,recommendations,
  caveats:['Blueprint edges are planned context, not proof of publicly rendered links.',
   'Site v1 authored links cannot prove header/footer navigation or browser execution.',
   'GSC impressions/position are observed for supplied reporting period, not search-volume forecasts.',
   'No unapproved link is invented, no canonical/robots/CTA automatically changes, and no CMS data is written.',
   'Search Console export and Site v1 origin/revision are operator supplied; neither is authenticated by this reviewer.']};
}
function markdown(r){
 if(r.format!==FORMAT)throw Error('Invalid SEO link-review result');
 const lines=['# MANUFACT SEO — Search-aware internal linking review','',
  'Private editorial evidence. Approved links do not prove published HTML. Missing authored links do not prove broken navigation.','',
  'Approved edges: '+r.summary.approvedEdges+' | Observed in supplied authoring: '+
   r.summary.observedAuthoredEdges+' | Human-review prompts: '+r.summary.suggestedHumanReviews,'',
  '## Search opportunity pages','',
  '| Approved page | Impressions | Clicks | Incoming planned | Found in authoring | Status |',
  '|---|---:|---:|---:|---:|---|'];
 for(const p of r.targets)lines.push('| '+clean(p.path)+' | '+(p.observedMetrics?.impressions??'UNKNOWN')+
  ' | '+(p.observedMetrics?.clicks??'UNKNOWN')+' | '+p.incomingApprovedEdges+
  ' | '+p.observedAuthoredInboundEdges+' | '+clean(p.reviewStatus)+' |');
 lines.push('','## Human-only recommendations','',
  '| Priority | Source → target | Observation | Next step |','|---|---|---|---|');
 for(const x of r.recommendations)lines.push('| '+x.priority+' | '+clean(x.sourcePath||'(no approved source)')+
  ' → '+clean(x.targetPath)+' | '+clean(x.reason)+' | '+clean(x.instruction)+' |');
 if(!r.recommendations.length)lines.push('| — | — | No threshold met or source authoring absent | No automatic task |');
 lines.push('','## Restrictions','');
 for(const x of r.caveats)lines.push('- '+clean(x));
 return lines.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,build,markdown});
