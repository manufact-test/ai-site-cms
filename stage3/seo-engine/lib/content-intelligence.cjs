'use strict';
// A content-evidence and information-architecture layer; deterministic and read-only.
// NOT an NLP model, search-volume service, ranking score or a content generator.
const {checkBlueprint}=require('./blueprint.cjs');
const GRAPH=require('./graph-authored.cjs');
const FORMAT='manufact-seo-content-review-v1';
const normalize=x=>String(x||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
const clip=(s,n=220)=>String(s||'').trim().slice(0,n);
const relative=href=>{
 if(typeof href!=='string'||!href.startsWith('/')||href.startsWith('//'))return null;
 return href.split(/[?#]/,1)[0]||'/';
};
const visibleText=value=>{
 if(typeof value==='string')return value.trim();
 // A responsive field may have separate values; it is still authored content,
 // not a prediction of the final screen or visible mobile state.
 if(value&&typeof value==='object'&&!Array.isArray(value))
  return ['desktop','tablet','mobile'].map(k=>value[k]).filter(x=>typeof x==='string'&&x.trim()).join(' ');
 return '';
};
function extractSection(section,assets){
 const pieces=[],links=[],images=[];
 const add=(text,role,locator)=>{
  const value=visibleText(text);if(value)pieces.push({text:clip(value,3000),role,locator});
 };
 const parseValues=(item,locator)=>{
  const values=item.values||{};
  const href=values['behavior.href'],raw=relative(href);
  let label='';
  for(const [key,value] of Object.entries(values)){
   if(!key.startsWith('content.')||key==='content.media'||key==='content.video')continue;
   const role=key==='content.text'&&href?'link':
    item.slot==='heading'||key==='content.heading'?'heading':key==='content.title'?'heading':'body';
   add(value,role,{...locator,fieldPath:key});
   if(role==='link')label=visibleText(value);
  }
  if(raw!==null)links.push({toPath:raw,label:clip(label,120),locator:{...locator,fieldPath:'behavior.href'}});
  const media=values['content.media'];
  if(typeof media==='string'&&assets.has(media))
   images.push({assetId:media,alt:assets.get(media).alt,locator:{...locator,fieldPath:'content.media'}});
 };
 // The public PHP renderer substitutes Design Graph markup for legacy slots.
 // Do not count hidden old CTA labels, link targets, media or text as rendered SEO content.
 if(!section.designGraph){
  for(const el of section.elements||[])parseValues(el,{sectionId:section.id,elementId:el.id});
  for(const item of section.items||[])parseValues(item,{sectionId:section.id,elementId:item.id});
 }
 function walk(nodes){
  for(const n of nodes||[]){
   const locator={sectionId:section.id,nodeId:n.id};
   if(['heading','text','button','link','list-item','disclosure','tab'].includes(n.type))
    add(n.text,['button','link'].includes(n.type)?'link':n.type==='heading'?'heading':'body',locator);
   if(n.type==='image')images.push({assetId:n.assetId,alt:n.alt??'',locator});
   if(n.children)walk(n.children);
  }
 }
 if(section.designGraph){
  walk(section.designGraph.nodes);
  for(const link of GRAPH.links(section)){
   const raw=relative(link.href);
   if(raw!==null)links.push({toPath:raw,label:clip(link.label,120),
    locator:{sectionId:section.id,nodeId:link.nodeId,fieldPath:link.fieldPath}});
  }
 }
 return {id:section.id,component:section.component,pieces,links,images};
}
function extract(site){
 const assets=new Map((site.assets||[]).map(x=>[x.id,x]));
 return (site.pages||[]).map(p=>({
  id:p.id,path:p.path,robots:p.seo?.robots||'index',
  title:p.seo?.title||p.title,
  description:p.seo?.description||'',
  sections:p.sections.map(s=>extractSection(s,assets))
 }));
}
function finding(code,level,pageId,message,extra={}){
 return {code,severity:level,pageId,message,...extra};
}
function reviewBlueprint(blueprint){
 const b=checkBlueprint(blueprint),issues=[],pageMap=new Map(b.pages.map(p=>[p.id,p]));
 const routes=new Map(b.pages.map(p=>[p.path,p.id]));
 const home=routes.get('/');
 const reachable=new Set([home]),frontier=[home];
 const edges=new Map(b.pages.map(p=>[p.id,new Set([
  ...p.links.map(l=>l.toPageId),
  ...p.sections.filter(s=>s.cta).map(s=>s.cta.toPageId)
 ])]));
 while(frontier.length){
  const id=frontier.shift();
  for(const next of edges.get(id)||[])if(!reachable.has(next)){reachable.add(next);frontier.push(next);}
 }
 for(const p of b.pages){
  if(p.id!==home&&p.seo.robots==='index'&&!reachable.has(p.id))
   issues.push(finding('blueprint:unreachable-page','recommendation',p.id,
    'No path from home through planned contextual links or CTAs; check planned navigation.',{path:p.path}));
  if(p.seo.robots==='noindex'&&p.sections.some(s=>s.cta&&pageMap.get(s.cta.toPageId)?.seo.robots==='index'))
   issues.push(finding('blueprint:noindex-entry','recommendation',p.id,
    'This noindex page is planned as a route to indexed content; verify navigation and crawl access.',{path:p.path}));
 }
 const primary=new Map();
 for(const p of b.pages){
  if(p.seo.robots!=='index')continue;
  const topic=normalize(p.intent.topics[0]);
  const key=p.intent.type+'|'+topic;
  if(primary.has(key)){
   const other=primary.get(key);
   issues.push(finding('blueprint:primary-intent-overlap','recommendation',p.id,
    'Two indexed pages have the same declared primary topic and intent. Confirm they answer distinct user needs; this is not proof of keyword cannibalization.',
    {path:p.path,otherPageId:other.id,topic:p.intent.topics[0]}));
  }else primary.set(key,p);
 }
 return {format:'manufact-seo-blueprint-review-v1',version:1,siteId:b.siteId,issues,
  scope:'Declared page intents, primary topics and contextual route plan only; no query volumes or published navigation verified.'};
}
function collectReview(site,blueprint){
 const b=checkBlueprint(blueprint);
 if(site.siteId!==b.siteId)throw Error('SEO content review: siteId mismatch');
 const pageDocs=extract(site), byId=new Map(pageDocs.map(p=>[p.id,p])),routes=new Map(pageDocs.map(p=>[p.path,p.id]));
 const findings=[],actions=[],pages=[];
 const imageUses=new Map();
 for(const pg of pageDocs)for(const sec of pg.sections)for(const img of sec.images){
  if(img.assetId)imageUses.set(img.assetId,(imageUses.get(img.assetId)||0)+1);
 }
 const append=(issue,action)=>{
  findings.push(issue);
  if(action)actions.push({kind:action.kind,priority:issue.severity,pageId:issue.pageId,
   ...(issue.sectionId?{sectionId:issue.sectionId}:{}),
   ...(issue.targetPageId?{targetPageId:issue.targetPageId}:{}),
   fieldPath:action.fieldPath||null,elementId:action.elementId||null,nodeId:action.nodeId||null,
   observed:action.observed??null,requested:action.requested??null,
   instruction:action.instruction,
   automatic:false,requiresHumanReview:true});
 };
 for(const pp of b.pages){
  const doc=byId.get(pp.id);
  if(!doc){pages.push({pageId:pp.id,path:pp.path,status:'not-implemented',topics:[],sections:[]});continue;}
  const allPieces=doc.sections.flatMap(s=>s.pieces.map(v=>({...v,sectionId:s.id})));
  const body=allPieces.filter(x=>x.role!=='link'),meta=normalize(doc.title+' '+doc.description);
  const topics=[];
  for(const topic of pp.intent.topics){
   const norm=normalize(topic);
   const matches=body.filter(piece=>normalize(piece.text).includes(norm));
   const coverage=matches.length?'text-match':meta.includes(norm)?'metadata-only':'not-located';
   topics.push({topic,coverage,evidence:matches.slice(0,2).map(m=>({sectionId:m.sectionId,
    ...m.locator,excerpt:clip(m.text,150)}))});
   if(coverage!=='text-match'){
    append(finding('content:'+(coverage==='metadata-only'?'topic-metadata-only':'topic-not-located'),
     'recommendation',pp.id,'Planned topic phrase was not found in visible authored text by exact normalized matching. Review wording and actual user-intent coverage; inflection and synonyms may explain this.',
     {path:doc.path,topic,evidence:coverage}),
    {kind:'editorial-topic-review',instruction:'Read actual page text and confirm that it answers the visitor need; do not stuff the exact phrase mechanically.',
     observed:coverage,requested:topic});
   }
  }
  const sections=[];
  for(const planned of pp.sections){
   const actual=doc.sections.find(s=>s.id===planned.id);
   if(!actual){sections.push({sectionId:planned.id,status:'not-mapped',observed:[],editorialChecks:planned.points.map((point,index)=>({pointIndex:index,request:point,status:'human-review-required'}))});continue;}
   const prose=actual.pieces.filter(x=>x.role==='body'),links=actual.links;
   const observed=prose.slice(0,5).map(v=>({excerpt:clip(v.text,180),...v.locator}));
   const sectionInfo={sectionId:planned.id,status:'mapped',
    observed,editorialChecks:planned.points.map((point,index)=>({pointIndex:index,request:point,
     status:'human-review-required',reason:'Editorial instruction is not an exact phrase required in page copy.'}))};
   if(planned.media){
    const images=actual.images;
    sectionInfo.media={purpose:planned.media.purpose,plannedAlt:planned.media.alt,
     observed:images.map(i=>({assetId:i.assetId,alt:i.alt,locator:i.locator,
      sharedInProject:Boolean(i.assetId&&imageUses.get(i.assetId)>1)}))};
    if(!images.length){
     append(finding('content:planned-media-unmapped','recommendation',pp.id,
      'Planned image intent cannot be mapped to this section; a background or design-only media layer may exist.',
      {path:doc.path,sectionId:planned.id}),
     {kind:'media-mapping-review',instruction:'Map approved image purpose to actual media/rendered design without inventing image evidence.',
      observed:null,requested:planned.media.purpose});
    }
    for(const im of images){
     if(planned.media.purpose==='informative'&&!String(im.alt||'').trim()){
      append(finding('content:informative-image-alt-review','warning',pp.id,
       'Planned informative image has empty authoring alt; confirm visible meaning and choose accurate context-specific alt text.',
       {path:doc.path,sectionId:planned.id,assetId:im.assetId||null,elementId:im.locator.elementId||null,nodeId:im.locator.nodeId||null}),
      {kind:'image-alt-review',instruction:'Write appropriate alt based on image and context. An asset may be shared; never change global alt silently.',
       observed:im.alt,requested:planned.media.alt});
     }else if(planned.media.purpose==='decorative'&&String(im.alt||'').trim()){
      append(finding('content:decorative-image-alt-review','recommendation',pp.id,
       'Planned decorative image has descriptive alt; confirm whether it conveys meaning in implementation.',
       {path:doc.path,sectionId:planned.id,assetId:im.assetId||null}),
      {kind:'image-purpose-review',instruction:'Verify decorative versus informative role in real rendered context before changing alt.',
       observed:im.alt,requested:''});
     }
    }
   }
   if(prose.map(x=>x.text).join(' ').trim().length<35&&planned.points.length){
    append(finding('content:section-prose-review','recommendation',pp.id,
     'Planned section has limited explanatory copy; verify that text elsewhere adequately serves its user purpose.',
     {path:doc.path,sectionId:planned.id}),
    {kind:'section-copy-review',instruction:'Compare actual section copy against planned editorial checks. Add verified, useful information only where needed.',
     observed:observed.map(x=>x.excerpt).join(' ').slice(0,220),
     requested:planned.points.join(' | ').slice(0,500)});
   }
   if(planned.cta){
    const destination=pageDocs.find(p=>p.id===planned.cta.toPageId)?.path||b.pages.find(p=>p.id===planned.cta.toPageId).path;
    const match=links.find(l=>l.toPath===destination);
    const sameLabel=match&&normalize(match.label)===normalize(planned.cta.label);
    sectionInfo.cta={destination,expectedLabel:planned.cta.label,
     observedLinks:links.map(l=>({toPath:l.toPath,label:l.label,locator:l.locator})),
     status:!match?'not-located':sameLabel?'matching':'label-differs'};
    if(!match){
     append(finding('content:planned-cta-missing','warning',pp.id,
       'Planned conversion/action destination is missing from its designated section; confirm where visitors can complete the action.',
       {path:doc.path,sectionId:planned.id,targetPageId:planned.cta.toPageId,expectedTarget:destination}),
     {kind:'cta-route-review',instruction:'Implement or map the approved CTA in the correct section; use existing editable behavior.href field where available.',
      observed:links.map(l=>l.toPath),requested:{label:planned.cta.label,toPath:destination}});
    }else if(!sameLabel){
     append(finding('content:cta-label-diff','recommendation',pp.id,
       'CTA leads to the planned destination but has different wording; check whether current label remains clear.',
       {path:doc.path,sectionId:planned.id,targetPageId:planned.cta.toPageId,elementId:match.locator.elementId??null,nodeId:match.locator.nodeId??null}),
     {kind:'cta-label-review',instruction:'Keep a descriptive, accessible CTA label appropriate to this destination.',
      fieldPath:match.locator.elementId?'content.text':null,elementId:match.locator.elementId,nodeId:match.locator.nodeId,
      observed:match.label,requested:planned.cta.label});
    }
   }
   sections.push(sectionInfo);
  }
  const authoredLinks=doc.sections.flatMap(s=>s.links.map(l=>({...l,sectionId:s.id})));
  for(const plannedLink of pp.links){
   const targetPath=pageDocs.find(p=>p.id===plannedLink.toPageId)?.path||
    b.pages.find(p=>p.id===plannedLink.toPageId).path;
   const matched=authoredLinks.filter(l=>l.toPath===targetPath);
   if(!matched.length){
    append(finding('content:planned-contextual-link-not-located','recommendation',pp.id,
     'Planned contextual relationship is not in authored section links; header/footer navigation is not inspected.',
     {path:doc.path,targetPageId:plannedLink.toPageId,proposedAnchor:plannedLink.anchor}),
    {kind:'contextual-link-review',instruction:'Confirm whether useful page copy, card or button should link to this destination. Do not add links mechanically.',
     observed:[],requested:{toPath:targetPath,anchor:plannedLink.anchor}});
   }else if(matched.every(l=>/^(?:read more|click here|here|подробнее|здесь|сюда|weiter|więcej)$/i.test(l.label.trim()))){
    append(finding('content:generic-contextual-anchor','recommendation',pp.id,
     'A planned contextual link has only generic authored labels; verify clarity of destination.',
     {path:doc.path,targetPageId:plannedLink.toPageId,proposedAnchor:plannedLink.anchor}),
    {kind:'anchor-clarity-review',instruction:'Use an accessible label that truthfully describes the target.',
     observed:matched.map(l=>l.label),requested:plannedLink.anchor});
   }
  }
  pages.push({pageId:pp.id,path:doc.path,status:'reviewed',topics,sections});
 }
 // Confirmed substantial duplication only: do not label different pages with the
 // same keyword as keyword cannibalization, and do not compare short snippets.
 const bMap=new Map();
 for(const d of pageDocs){
  const text=d.sections.flatMap(s=>s.pieces.filter(x=>x.role==='body').map(x=>x.text)).join(' ');
  const normalized=normalize(text);
  if(normalized.length>=180){
   const arr=bMap.get(normalized)||[];arr.push(d);bMap.set(normalized,arr);
  }
 }
 for(const group of bMap.values())if(group.length>1)
  for(let i=1;i<group.length;i++)append(finding('content:duplicate-body','warning',group[i].id,
    'Substantial authored body copy matches another page exactly; review whether both provide distinctive value.',
    {path:group[i].path,otherPageId:group[0].id}),
   {kind:'duplicate-content-review',instruction:'Review the two pages and write distinct, verified answers where their intents differ. Do not rewrite automatically.',
    observed:group[0].path,requested:group[i].path});
 return {format:FORMAT,version:1,siteId:site.siteId,pages,
  blueprintReview:reviewBlueprint(b),findings,editorialActions:actions,
  capability:'Exact normalized phrase observations, section text, CTA routes and significant exact body duplication; human editorial judgment required.',
  boundaries:'No SERP data, user-need comprehension, morphology-aware NLP, mobile-render checks, invented corrections or automatic CMS writes.'};
}
module.exports=Object.freeze({FORMAT,extract,reviewBlueprint,collectReview});
