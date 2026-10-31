'use strict';
// Versioned, deterministic OFFLINE compilation. Editorial SEO research remains the AI developer's task.
const FORMAT='manufact-seo-brief-v1', BLUEPRINT='manufact-seo-blueprint-v1';
const idPattern=/^[a-z][a-z0-9-]{2,79}$/, routePattern=/^\/(?:[a-z0-9-]+\/)*$/;
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
function fail(path,msg){throw new Error(path+': '+msg);}
function keys(x,allowed,path){if(!plain(x)||Object.keys(x).some(k=>!allowed.includes(k)))fail(path,'unexpected keys or not an object');}
function str(x,path,max=300,empty=false){if(typeof x!=='string'||x.length>max||(!empty&&!x.trim())||/[\x00-\x1f]/.test(x)||/<\s*\/?\s*[a-z][^>]*>/i.test(x))fail(path,'invalid text');return x.trim();}
function ident(x,path){if(typeof x!=='string'||!idPattern.test(x))fail(path,'invalid stable ID');return x;}
function route(x,path){if(typeof x!=='string'||!routePattern.test(x))fail(path,'invalid site path');return x;}
function arr(x,path,min=0,max=100){if(!Array.isArray(x)||x.length<min||x.length>max)fail(path,'invalid item count');return x;}
function one(x,opts,path){if(!opts.includes(x))fail(path,'invalid option');return x;}
function checkBrief(b){
 keys(b,['format','siteId','title','language','region','audience','goal','facts','research','pages'],'brief');
 if(b.format!==FORMAT)fail('format','unsupported brief version');
 ident(b.siteId,'siteId');str(b.title,'title',130);
 one(b.language,['ru','en','de','pl','be','uk'],'language');
 str(b.region,'region',120);str(b.audience,'audience',600);str(b.goal,'goal',600);
 const knownFacts=new Map(), knownPages=new Map(),paths=new Set(),ids=new Set();
 for(const f of arr(b.facts,'facts',0,100)){
  keys(f,['id','claim','status','origin','source'],'fact');
  ident(f.id,'fact.id');if(knownFacts.has(f.id))fail(f.id,'duplicate fact');
  str(f.claim,'fact.claim',600);one(f.status,['confirmed','unverified'],'fact.status');
  one(f.origin,['owner','document','research'],'fact.origin');
  if(own(f,'source')){if(!/^https:\/\/[^@\s/?#]+[^\s]*$/i.test(str(f.source,'fact.source',1200)))fail(f.id,'source must be HTTPS, without credentials');}
  knownFacts.set(f.id,f);
 }
 for(const r of arr(b.research,'research',0,60)){
  keys(r,['url','observation','kind'],'research');
  if(!/^https:\/\/[^@\s/?#]+[^\s]*$/i.test(str(r.url,'research.url',1200)))fail('research.url','HTTPS URL required');
  str(r.observation,'research.observation',800);one(r.kind,['primary-guidance','site-reference','audience-evidence','other'],'research.kind');
 }
 for(const p of arr(b.pages,'pages',1,80)){
  keys(p,['id','path','name','intent','seo','sections','links','schemaCandidates','responsive'],'page');
  ident(p.id,'page.id');route(p.path,'page.path');str(p.name,'page.name',160);
  if(knownPages.has(p.id)||paths.has(p.path))fail(p.id,'duplicate page ID or route');
  knownPages.set(p.id,p);paths.add(p.path);
  keys(p.intent,['type','need','topics'],'page.intent');
  one(p.intent.type,['informational','commercial','transactional','navigational','support'],'intent.type');
  str(p.intent.need,'intent.need',500);arr(p.intent.topics,'topics',1,15).forEach(t=>str(t,'intent.topic',100));
  keys(p.seo,['title','description','robots','ogTitle','ogDescription','canonicalPath'],'page.seo');
  str(p.seo.title,'seo.title',160);str(p.seo.description,'seo.description',300);
  one(p.seo.robots,['index','noindex'],'seo.robots');
  if(own(p.seo,'ogTitle'))str(p.seo.ogTitle,'seo.ogTitle',160);
  if(own(p.seo,'ogDescription'))str(p.seo.ogDescription,'seo.ogDescription',300);
  if(own(p.seo,'canonicalPath'))route(p.seo.canonicalPath,'seo.canonicalPath');
  const sectionIds=new Set();let h1=0;
  for(const s of arr(p.sections,'sections',1,40)){
   keys(s,['id','heading','level','why','points','media','cta','interaction'],'section');
   ident(s.id,'section.id');if(sectionIds.has(s.id)||ids.has(s.id))fail(s.id,'duplicate section ID');sectionIds.add(s.id);ids.add(s.id);
   str(s.heading,'section.heading',180);if(!Number.isInteger(s.level)||s.level<1||s.level>6)fail(s.id,'invalid heading level');
   if(s.level===1)h1++;
   str(s.why,'section.why',500);
   arr(s.points,'section.points',1,15).forEach(pt=>str(pt,'section.point',300));
   if(own(s,'media')){
    keys(s.media,['purpose','alt','why'],'section.media');
    one(s.media.purpose,['informative','decorative'],'media.purpose');
    str(s.media.alt,'media.alt',200,true);
    if(s.media.purpose==='decorative'&&s.media.alt!=='')fail(s.id,'decorative image alt must be empty');
    if(s.media.purpose==='informative'&&!s.media.alt.trim())fail(s.id,'informative image requires alt intent');
    str(s.media.why,'media.why',300);
   }
   if(own(s,'cta')){
    keys(s.cta,['label','toPageId','purpose'],'section.cta');
    str(s.cta.label,'cta.label',100);ident(s.cta.toPageId,'cta.toPageId');str(s.cta.purpose,'cta.purpose',300);
   }
   if(own(s,'interaction'))str(s.interaction,'section.interaction',400);
  }
  if(h1!==1)fail(p.id,'plan needs exactly one main H1');
  for(const l of arr(p.links,'page.links',0,80)){
    keys(l,['toPageId','anchor','why'],'link');ident(l.toPageId,'link.toPageId');
    str(l.anchor,'link.anchor',120);str(l.why,'link.why',300);
  }
  for(const c of arr(p.schemaCandidates,'schemaCandidates',0,12)){
   keys(c,['type','factIds','why'],'schemaCandidate');
   one(c.type,['Organization','LocalBusiness','BreadcrumbList','Article','Product','Service','FAQPage'],'candidate.type');
   str(c.why,'schemaCandidate.why',300);
   arr(c.factIds,'candidate.factIds',1,20).forEach(x=>ident(x,'candidate.factId'));
  }
  keys(p.responsive,['desktop','tablet','mobile'],'responsive');
  for(const bp of ['desktop','tablet','mobile'])str(p.responsive[bp],'responsive.'+bp,700);
 }
 if(!paths.has('/'))fail('pages','home route / required');
 for(const p of b.pages){
  if(p.seo.canonicalPath&&!paths.has(p.seo.canonicalPath))fail(p.id,'canonicalPath not in local page map');
  for(const s of p.sections)if(s.cta&&!knownPages.has(s.cta.toPageId))fail(s.id,'CTA target page missing');
  for(const l of p.links)if(!knownPages.has(l.toPageId))fail(p.id,'internal link target page missing');
  for(const c of p.schemaCandidates)for(const f of c.factIds)if(!knownFacts.has(f))fail(p.id,'unknown schema candidate fact ID');
 }
 return b;
}
function compileBrief(raw){
 const b=checkBrief(raw),unresolved=[];
 const facts=Object.fromEntries(b.facts.map(f=>[f.id,f]));
 const pages=b.pages.map(p=>{
  for(const c of p.schemaCandidates)for(const id of c.factIds)if(facts[id].status!=='confirmed')
   unresolved.push({pageId:p.id,kind:'schema-evidence',factId:id,message:'Do not publish structured data relying on unverified claim'});
  return {
   id:p.id,path:p.path,name:p.name,intent:p.intent,seo:{
    title:p.seo.title,description:p.seo.description,robots:p.seo.robots,
    ogTitle:p.seo.ogTitle||p.seo.title,ogDescription:p.seo.ogDescription||p.seo.description,
    canonicalPath:p.seo.canonicalPath||p.path
   },
   sections:p.sections.map(s=>({...s})),
   links:p.links.map(l=>({...l,toPath:b.pages.find(t=>t.id===l.toPageId).path})),
   schemaCandidates:p.schemaCandidates.map(c=>({...c,eligible:c.factIds.every(id=>facts[id].status==='confirmed')})),
   responsive:p.responsive
  };
 });
 return {format:BLUEPRINT,version:1,siteId:b.siteId,title:b.title,language:b.language,region:b.region,
  audience:b.audience,goal:b.goal,facts:b.facts,research:b.research,
  pages,unresolved,notes:['Topics are editorial hypotheses; no search volumes or rankings have been measured.',
  'Canonical paths are proposals, not a promise that the current publisher can configure them.',
  'Three static prototype images and the full design specification are owned by the lead developer.']};
}
function checkBlueprint(b){
 keys(b,['format','version','siteId','title','language','region','audience','goal','facts','research','pages','unresolved','notes'],'blueprint');
 if(b.format!==BLUEPRINT||b.version!==1)fail('blueprint','unsupported version');
 const draft={format:FORMAT,siteId:b.siteId,title:b.title,language:b.language,region:b.region,audience:b.audience,
  goal:b.goal,facts:b.facts,research:b.research,
  pages:b.pages.map(p=>({
   id:p.id,path:p.path,name:p.name,intent:p.intent,seo:{...p.seo,canonicalPath:p.seo.canonicalPath},
   sections:p.sections.map(s=>{const t={...s};return t;}),
   links:p.links.map(l=>({toPageId:l.toPageId,anchor:l.anchor,why:l.why})),
   schemaCandidates:p.schemaCandidates.map(c=>({type:c.type,factIds:c.factIds,why:c.why})),
   responsive:p.responsive
  }))};
 // Only accept canonical compiler output, never executable extensions in a file called blueprint.
 const expected=compileBrief(draft);
 if(JSON.stringify(expected)!==JSON.stringify(b))fail('blueprint','modified or noncanonical compiled blueprint');
 return b;
}
module.exports=Object.freeze({FORMAT,BLUEPRINT,compileBrief,checkBrief,checkBlueprint});
