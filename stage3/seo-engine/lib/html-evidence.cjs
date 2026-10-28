'use strict';
// Offline evidence from a bounded, trusted HTML export. NOT a browser, crawler or WCAG certificate.
const {checkBlueprint}=require('./blueprint.cjs');
const FORMAT='manufact-seo-html-evidence-v1', MAX=500000;
const plain=x=>String(x??'').replace(/<[^>]*>/g,' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gi,s=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '}[s.toLowerCase()]||s)).replace(/\s+/g,' ').trim();
const norm=x=>plain(x).normalize('NFKC').toLocaleLowerCase();
function attributes(s){
 const out={};
 const rex=/([^\s=\/<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;let match;
 while((match=rex.exec(s))!==null)out[match[1].toLowerCase()]=match[2]??match[3]??match[4]??'';
 return out;
}
function inspect(html){
 if(typeof html!=='string'||html.length>MAX)throw Error('HTML exceeds bounded evidence limit');
 // Preserve script JSON-LD separately, then discard script/style/comments/textarea/svg from element scanning.
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  .filter(x=>(attributes(x[1]).type||'').toLowerCase().trim()==='application/ld+json')
  .map(x=>x[2].trim());
 const body=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|textarea|template|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 const elements=[],tag=/<\s*(\/?)\s*([a-z][a-z0-9:-]*)([^<>]*?)>/gi;let m;
 while((m=tag.exec(body))!==null)if(!m[1])elements.push({tag:m[2].toLowerCase(),attrs:attributes(m[3]),offset:m.index});
 const list=name=>elements.filter(x=>x.tag===name);
 const headings=[...body.matchAll(/<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1\s*>/gi)]
  .map(m=>({level:Number(m[1]),text:plain(m[2]),offset:m.index}));
 const ids=new Map(),duplicates=new Set();
 for(const el of elements)if(el.attrs.id){const id=el.attrs.id;if(ids.has(id))duplicates.add(id);else ids.set(id,el);}
 const anchors=[...body.matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a\s*>/gi)]
  .map(x=>({attrs:attributes(x[1]),text:plain(x[2])}));
 const labels=list('label').map(x=>x.attrs.for).filter(Boolean);
 const forms=list('form').length;
 const controls=list('input').concat(list('textarea'),list('select')).filter(x=>!['hidden','submit','reset','button','image'].includes((x.attrs.type||'').toLowerCase()));
 // A label wrapping a control is a valid accessible label without a for/id pair.
 const wrappingLabels=[...body.matchAll(/<label\b[^>]*>[\s\S]*?<\/label\s*>/gi)]
  .map(m=>[m.index,m.index+m[0].length]);
 const unlabelled=controls.filter(x=>!x.attrs['aria-label']&&!x.attrs['aria-labelledby']&&
  !(x.attrs.id&&labels.includes(x.attrs.id))&&!(x.attrs.title)&&
  !wrappingLabels.some(([start,end])=>x.offset>start&&x.offset<end));
 const metas=list('meta'),links=list('link');
 const pickMeta=(key,value)=>metas.filter(x=>(x.attrs[key]||'').toLowerCase()===value);
 const canonical=links.filter(x=>(x.attrs.rel||'').toLowerCase().split(/\s+/).includes('canonical'));
 const robots=pickMeta('name','robots');
 const htmlLang=list('html')[0]?.attrs.lang||null;
 const vp=pickMeta('name','viewport');
 const mobileSettings=vp.map(x=>x.attrs.content||'');
 const schema=[],rootTypes=[],parseErrors=[];
 let visitedSchemaNodes=0;
 function gather(x,depth=0){
  if(depth>12||++visitedSchemaNodes>2000||x==null||typeof x!=='object')return;
  if(Array.isArray(x)){for(const a of x.slice(0,80))gather(a,depth+1);return;}
  if(x['@type'])for(const t of [x['@type']].flat().slice(0,30))
   if(typeof t==='string')schema.push(t.split('/').pop());
  // Nested schema may live under offers, publisher, author, itemReviewed, etc.
  // A traversal budget prevents deeply nested or broad JSON exports exhausting the audit.
  for(const [k,v] of Object.entries(x).slice(0,100))if(k!=='@context'&&k!=='@type')gather(v,depth+1);
 }
 function topLevelTypes(node){
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){for(const child of node.slice(0,80))topLevelTypes(child);return;}
  // A top-level @graph is an independently authored collection of roots.
  if(node['@type'])for(const type of [node['@type']].flat().slice(0,30))
   if(typeof type==='string')rootTypes.push(type.split('/').pop());
  if(Array.isArray(node['@graph']))for(const root of node['@graph'].slice(0,80))topLevelTypes(root);
 }
 for(const [index,raw] of scripts.entries()){
  if(raw.length>100000){parseErrors.push({scriptIndex:index,reason:'too-large'});continue;}
  try{const json=JSON.parse(raw);gather(json);topLevelTypes(json);}
  catch{parseErrors.push({scriptIndex:index,reason:'invalid-json'});}
 }
 const main=list('main');
 return {headings,ids:[...ids.keys()],duplicateIds:[...duplicates],anchors,images:list('img').map(x=>x.attrs),
  links,robots:robots.map(x=>x.attrs.content||''),canonicals:canonical.map(x=>x.attrs.href||''),
  htmlLang,baseHref:list('base')[0]?.attrs.href||null,viewport:mobileSettings,mainCount:main.length,forms,controlCount:controls.length,
  unlabelledControls:unlabelled.map(x=>({tag:x.tag,id:x.attrs.id||null,name:x.attrs.name||null})),
  ogTitleCount:pickMeta('property','og:title').length,ogDescriptionCount:pickMeta('property','og:description').length,
  structuredDataTypes:[...new Set(schema)],rootStructuredDataTypes:[...new Set(rootTypes)],
  structuredDataErrors:parseErrors,
  bodyHeadingText:headings.map(x=>x.text),allElements:elements.length};
}
function review(snapshot,blueprint=null){
 if(!snapshot||snapshot.format!=='manufact-seo-html-snapshot-v1'||!Array.isArray(snapshot.pages)||snapshot.pages.length>80)throw Error('Invalid HTML evidence snapshot');
 const plan=blueprint?checkBlueprint(blueprint):null;
 if(plan&&snapshot.siteId&&plan.siteId!==snapshot.siteId)throw Error('Snapshot and blueprint site IDs differ');
 if(snapshot.completeness!==undefined&&!['partial','complete'].includes(snapshot.completeness))
  throw Error('Unknown HTML snapshot completeness');
 const paths=new Map(),data=new Map(),findings=[],pages=[];
 const add=(code,severity,p,message,details={})=>findings.push({code,severity,pageId:p.id,path:p.path,message,...details});
 for(const p of snapshot.pages){
  if(!p||typeof p.id!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(p.id)||
   typeof p.path!=='string'||!/^\/(?:[a-z0-9-]+\/)*$/.test(p.path)||
   typeof p.html!=='string'||p.html.length>MAX||data.has(p.id)||paths.has(p.path))throw Error('Bad/duplicate snapshot page');
  data.set(p.id,inspect(p.html));paths.set(p.path,p);
 }
 const planPages=new Map((plan?.pages||[]).map(p=>[p.id,p]));
 for(const p of snapshot.pages){
  const d=data.get(p.id),spec=planPages.get(p.id);
  const ids=new Set(d.ids);
  let linkBase='https://snapshot.invalid'+p.path;
  try{if(d.baseHref)linkBase=new URL(d.baseHref,linkBase).href;}catch{
   add('evidence:invalid-base-href','recommendation',p,'Supplied HTML base href could not be resolved; relative links need browser review.');
  }
  for(const id of d.duplicateIds)add('evidence:duplicate-dom-id','warning',p,'Duplicate HTML id may break fragment navigation and labels.',{fragment:id});
  if(d.mainCount===0)add('evidence:missing-main-landmark','recommendation',p,'No main landmark in supplied static HTML; verify actual page landmark structure.');
  if(d.mainCount>1)add('evidence:multiple-main-landmarks','recommendation',p,'Multiple main landmarks; verify that only intended primary content is exposed.');
  if(!d.htmlLang)add('evidence:missing-html-lang','recommendation',p,'The HTML root has no declared language.');
  if(!d.viewport.length)add('evidence:missing-viewport','recommendation',p,'No viewport meta in captured HTML; inspect mobile layout configuration.');
  if(d.canonicals.length>1)add('evidence:multiple-canonicals','warning',p,'More than one canonical link declaration found.');
  if(d.robots.length>1&&new Set(d.robots.map(norm)).size>1)add('evidence:conflicting-robots','warning',p,'Conflicting meta robots directives are present.');
  if(d.unlabelledControls.length)add('evidence:unlabelled-form-controls','recommendation',p,'Some form controls have no explicit external accessible label identified by static inspection; JS and full accessible-name computation are not detected.',{controls:d.unlabelledControls.slice(0,12)});
  for(const error of d.structuredDataErrors)add('evidence:invalid-json-ld','warning',p,'JSON-LD script could not be parsed as bounded JSON.',error);
  if(d.rootStructuredDataTypes.length){
   // Nested Person/Offer/Organization nodes are evidence, not independent page-level claims.
   for(const type of d.rootStructuredDataTypes){
    const allowed=spec?.schemaCandidates?.filter(c=>c.type===type)||[];
    if(allowed.some(c=>!c.eligible))add('evidence:unverified-schema-published','warning',p,'JSON-LD type occurs although blueprint facts for this type are unverified; review published claims.',{schemaType:type});
    if(spec&&!allowed.length)add('evidence:unplanned-schema-type','recommendation',p,'JSON-LD type is not an approved blueprint candidate; verify applicability and visible supporting facts.',{schemaType:type});
   }
  }
  for(const a of d.anchors){
   const href=a.attrs.href||'';
   if(!href||href==='#')continue;
   // Resolve relative URLs from the CAPTURED page path, not the root origin.
   // This accepts ./, ../, ?query and #fragment without inventing external targets.
   let resolved;
   try{resolved=new URL(href,linkBase);}catch{continue;}
   if(resolved.origin!=='https://snapshot.invalid')continue;
   const route=resolved.pathname,hash=resolved.hash.slice(1);
   const target=paths.get(route);
   if(!target){
    add('evidence:link-target-outside-snapshot','recommendation',p,
     'Internal-looking link points outside the supplied static page set; verify against full deployment before declaring broken.',{href:href.slice(0,200)});
   }else if(hash){
    let fragment=hash;
    try{fragment=decodeURIComponent(hash);}catch{}
    if(!data.get(target.id).ids.includes(fragment)&&fragment!=='top')
     add('evidence:broken-fragment','warning',p,'Link fragment not found among IDs in the supplied target HTML.',{href:href.slice(0,200),targetPageId:target.id,fragment});
   }
  }
  const details={pageId:p.id,path:p.path,headings:d.headings.map(x=>({level:x.level,text:x.text})),
   mainCount:d.mainCount,htmlLang:d.htmlLang,viewportDefined:Boolean(d.viewport.length),
   structuredDataTypes:d.structuredDataTypes,rootStructuredDataTypes:d.rootStructuredDataTypes,
   forms:d.forms,formControls:d.controlCount,
   anchors:d.anchors.length};
  pages.push(details);
 }
 if(snapshot.robotsTxt&&/^\s*User-agent:\s*\*\s*[\r\n]+\s*Disallow:\s*\/\s*$/im.test(snapshot.robotsTxt))
  findings.push({code:'evidence:robots-disallow-all',severity:'warning',pageId:null,path:null,
   message:'Supplied robots.txt appears to disallow all paths for the wildcard agent; validate the entire deployed robots policy.'});
 return {format:FORMAT,version:1,siteId:snapshot.siteId||plan?.siteId||null,pages,findings,
  source:'supplied-trusted-html-only',
  limitations:'Static heuristics, not DOM/rendered visual analysis, WCAG certification, live link check, Search Console data, crawler, or schema validation. Partial page exports can produce apparent missing targets.'};
}
module.exports=Object.freeze({FORMAT,inspect,review});
