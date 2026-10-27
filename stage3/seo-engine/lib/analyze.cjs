'use strict';
// Evidence-driven supplements to the core inspectSite. Offline; no page loads, scripts or network.
const {checkBlueprint}=require('./blueprint.cjs');
const core=require('../../sdk/contract.cjs');
const FORMAT='manufact-seo-analysis-v1';
const severity={blocker:0,error:1,warning:2,recommendation:3};
const normalize=x=>String(x||'').trim().normalize('NFKC').toLowerCase().replace(/\s+/g,' ');
const issue=(code,level,pageId,path,message,details={})=>({code,severity:level,pageId:pageId||null,path:path||null,message,...details});
function result(mode,siteId,items,capabilities){
 const unique=new Map();
 for(const i of items){const k=[i.code,i.pageId,i.sectionId,i.elementId,i.nodeId,i.path,i.message].join('|');if(!unique.has(k))unique.set(k,i);}
 return {format:FORMAT,version:1,mode,siteId,issues:[...unique.values()].sort((a,b)=>
  severity[a.severity]-severity[b.severity]||String(a.pageId).localeCompare(String(b.pageId))||a.code.localeCompare(b.code)),
  capabilities,disclaimer:'Static checks only. No keyword volume, ranking, accessibility certification or field Core Web Vitals measurements.'};
}
function auditSite(site,manifests,blueprint){
 const plan=blueprint?checkBlueprint(blueprint):null;
 const reg=core.registry(manifests);
 core.validateSite(site,reg); // existing authoritative schema and media/URL validation
 const base=core.inspectSite(site,reg);
 const items=[];
 const mapped={ 'broken-link':'error','broken-anchor':'error','missing-home':'error',
  'missing-h1':'warning','multiple-h1':'warning','heading-order':'warning','h1-position':'warning',
  'empty-heading':'warning','missing-alt':'recommendation','generic-alt':'warning',
  'duplicate-seo-title':'warning','duplicate-seo-description':'warning','seo-title':'warning',
  'seo-description':'warning','site-noindex':'warning' };
 for(const x of [...base.errors,...base.warnings]){
  // Character-count rules in the old validator are heuristics, not required SEO standards.
  const level=x.kind.includes('short')||x.kind.includes('long')?'recommendation':(mapped[x.kind]||'warning');
  items.push(issue('core:'+x.kind,level,x.pageId,x.path,x.message,
   Object.fromEntries(['sectionId','elementId','nodeId','assetId'].filter(k=>x[k]!=null).map(k=>[k,x[k]]))));
 }
 const pageMap=new Map(site.pages.map(p=>[p.id,p]));
 const byPath=new Map(site.pages.map(p=>[p.path,p]));
 const incoming=new Map(site.pages.map(p=>[p.id,0]));
 const redirectMap=new Map((site.redirects||[]).map(x=>[x.from,x.to]));
 for(const p of site.pages){
  for(const s of p.sections){
   const visit=(href,sectionId,elementId,nodeId)=>{
    if(typeof href!=='string')return;
    let dest=href.split(/[?#]/,1)[0];
    if(!dest.startsWith('/')||dest.startsWith('//'))return;
    if(dest==='')dest=p.path;
    dest=redirectMap.get(dest)||dest;
    const target=byPath.get(dest);
    if(target&&target.id!==p.id)incoming.set(target.id,incoming.get(target.id)+1);
   };
   for(const el of [...s.elements,...(s.items||[])])visit(el.values?.['behavior.href'],s.id,el.id,null);
   const walk=ns=>{for(const n of ns||[]){if(n.type==='button')visit(n.href,s.id,null,n.id);walk(n.children);}};
   if(s.designGraph)walk(s.designGraph.nodes);
  }
 }
 for(const p of site.pages){
  if(p.path!=='/'&&incoming.get(p.id)===0)
   items.push(issue('unlinked-page','warning',p.id,p.path,'No contextual incoming link found in authored sections; navigation may still link here.'));
  if(p.seo?.robots==='noindex'&&p.path==='/')
   items.push(issue('home-noindex','warning',p.id,p.path,'Home page is set to noindex; confirm intent.'));
  if(p.path.includes('--'))items.push(issue('route-readability','recommendation',p.id,p.path,'Double hyphen in URL path; check clarity.'));
 }
 if(plan){
  if(plan.siteId!==site.siteId)throw Error('Blueprint siteId mismatch');
  const plans=new Map(plan.pages.map(p=>[p.id,p]));
  for(const pp of plan.pages){
   const p=pageMap.get(pp.id);
   if(!p){items.push(issue('planned-page-missing','error',pp.id,pp.path,'Planned page not present in implemented site.'));continue;}
   if(p.path!==pp.path)items.push(issue('path-diff','warning',p.id,p.path,'Implemented route differs from approved SEO blueprint.',{expected:pp.path}));
   if(p.seo?.robots!==(pp.seo.robots))items.push(issue('indexation-diff','warning',p.id,p.path,'Indexation differs from blueprint; confirm deliberate change.',{expected:pp.seo.robots,actual:p.seo?.robots??'implicit index'}));
   for(const section of pp.sections){
    if(!p.sections.some(s=>s.id===section.id))
     items.push(issue('planned-section-missing','recommendation',p.id,p.path,'Blueprint section not identified by stable ID in Site v1; verify content coverage.',{sectionId:section.id}));
   }
   for(const l of pp.links){
    if(!pageMap.has(l.toPageId))items.push(issue('planned-link-target-missing','warning',p.id,p.path,'Planned internal-link target is missing.',{targetPageId:l.toPageId}));
   }
   for(const cand of pp.schemaCandidates)if(!cand.eligible)
    items.push(issue('schema-evidence-pending','warning',p.id,p.path,'Do not publish '+cand.type+' without verified supporting facts.'));
  }
  for(const p of site.pages)if(!plans.has(p.id))items.push(issue('unplanned-page','recommendation',p.id,p.path,'Page not documented in SEO blueprint; check intent and cross-links.'));
 }
 return result('site-v1',site.siteId,items,{siteContract:'validated by stage3/sdk/contract.cjs',
  coreInspector:'reused',htmlSnapshot:false,canonicalEditable:false,structuredDataEditable:false,
  robotsSitemap:'publisher-generated; deployment not verified',measuredPerformance:false});
}
// A deliberately bounded HTML snapshot parser: diagnostic-only, not a browser/DOM or a crawler.
// Unknown/ambiguous markup is a recommendation, never a claim about what a browser rendered.
function tokenize(html){
 const out=[],re=/<!--[\s\S]*?-->|<![^>]*>|<\/?([a-z][a-z0-9:-]*)(\s[^<>]*?)?\s*\/?>/gi;
 let m;while((m=re.exec(html))!==null){
  if(m[0].startsWith('<!--')||m[0].startsWith('<!'))continue;
  const attrs={};
  const a=m[2]||'';
  const rx=/([^\s=\/<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;let at;
  while((at=rx.exec(a))!==null)attrs[at[1].toLowerCase()]=at[2]??at[3]??at[4]??'';
  out.push({tag:m[1].toLowerCase(),closing:/^<\s*\//.test(m[0]),attrs,start:m.index,end:re.lastIndex});
 }
 return out;
}
function snapshotAudit(snapshot){
 if(!snapshot||snapshot.format!=='manufact-seo-html-snapshot-v1'||!Array.isArray(snapshot.pages)||snapshot.pages.length>80)throw Error('Invalid HTML snapshot format');
 const pages=snapshot.pages,paths=new Map(),ids=new Set(),issues=[];
 for(const p of pages){
  if(!p||typeof p.id!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(p.id)||
   typeof p.path!=='string'||!/^\/(?:[a-z0-9-]+\/)*$/.test(p.path)||
   typeof p.html!=='string'||p.html.length>500000||paths.has(p.path)||ids.has(p.id))throw Error('Invalid HTML snapshot page');
  paths.set(p.path,p);ids.add(p.id);
 }
 const titles=new Map(),incoming=new Map(pages.map(p=>[p.id,0]));
 for(const p of pages){
  const ts=tokenize(p.html),headings=[],links=[];let title='',description='',robots='',canonical='',imageCount=0;
  const clean=s=>s.replace(/<[^>]+>/g,' ').replace(/&(?:amp|lt|gt|quot|nbsp);/gi,' ').replace(/\s+/g,' ').trim();
  for(let i=0;i<ts.length;i++){
   const t=ts[i];if(t.closing)continue;
   if(/^h[1-6]$/.test(t.tag)){
    const end=ts.slice(i+1).find(n=>n.closing&&n.tag===t.tag);
    headings.push({level:Number(t.tag[1]),text:clean(end?p.html.slice(t.end,end.start):''),start:t.start});
   }
   if(t.tag==='title'){const end=ts.slice(i+1).find(n=>n.closing&&n.tag==='title');title=clean(end?p.html.slice(t.end,end.start):'');}
   if(t.tag==='meta'){
    const n=(t.attrs.name||'').toLowerCase();
    if(n==='description')description=t.attrs.content||'';
    if(n==='robots')robots=t.attrs.content||'';
   }
   if(t.tag==='link'&&(t.attrs.rel||'').toLowerCase().split(/\s+/).includes('canonical'))canonical=t.attrs.href||'';
   if(t.tag==='img'){
    imageCount++;
    if(!Object.prototype.hasOwnProperty.call(t.attrs,'alt'))issues.push(issue('html:missing-alt-attribute','error',p.id,p.path,'Image has no alt attribute (decorative images need alt="").'));
    else if(/^(image|photo|фото|картинка)\s*\d*$/i.test(t.attrs.alt.trim()))issues.push(issue('html:generic-alt','warning',p.id,p.path,'Image has generic alt text.'));
   }
   if(t.tag==='a'){
    const end=ts.slice(i+1).find(n=>n.closing&&n.tag==='a');
    const label=clean(end?p.html.slice(t.end,end.start):'')||t.attrs['aria-label']||'';
    if(!label.trim())issues.push(issue('html:unlabeled-link','warning',p.id,p.path,'Link has no discernible text; verify accessible name.'));
    else if(/^(click here|read more|here|подробнее|сюда)$/i.test(label.trim()))issues.push(issue('html:generic-anchor','recommendation',p.id,p.path,'Context-free anchor "'+label.slice(0,60)+'" may be unclear.'));
    links.push(t.attrs.href||'');
   }
  }
  if(!title)issues.push(issue('html:missing-title','error',p.id,p.path,'HTML document has no nonempty title.'));
  if(!description)issues.push(issue('html:missing-description','recommendation',p.id,p.path,'No meta description (Google may generate one).'));
  if(!headings.some(h=>h.level===1))issues.push(issue('html:missing-h1','warning',p.id,p.path,'No H1 found.'));
  if(headings.filter(h=>h.level===1).length>1)issues.push(issue('html:multiple-h1','recommendation',p.id,p.path,'Multiple H1 detected; check clear main topic.'));
  for(let i=1;i<headings.length;i++)if(headings[i].level>headings[i-1].level+1)issues.push(issue('html:heading-skip','warning',p.id,p.path,'Heading jumps from H'+headings[i-1].level+' to H'+headings[i].level+'.'));
  if(robots.toLowerCase().includes('noindex')&&snapshot.sitemapPaths?.includes(p.path))issues.push(issue('html:noindex-sitemap','warning',p.id,p.path,'Noindex page appears in supplied sitemap list.'));
  if(canonical){
   try{const u=new URL(canonical,'https://snapshot.invalid');if(!['http:','https:'].includes(u.protocol))throw Error('bad');if(u.host==='snapshot.invalid'&&!paths.has(u.pathname))issues.push(issue('html:canonical-target-missing','warning',p.id,p.path,'Local canonical points outside the supplied page set.'));}catch{issues.push(issue('html:invalid-canonical','error',p.id,p.path,'Malformed canonical URL.'));}
  }
  if(title){const k=normalize(title);if(titles.has(k))issues.push(issue('html:duplicate-title','warning',p.id,p.path,'HTML title duplicates '+titles.get(k)+'.'));else titles.set(k,p.path);}
  for(const href of links){
   if(!href||href.startsWith('#')||href.startsWith('//'))continue;
   let dest;try{const u=new URL(href,'https://snapshot.invalid');if(u.host!=='snapshot.invalid')continue;dest=u.pathname;}catch{continue;}
   if(!paths.has(dest))issues.push(issue('html:broken-link','error',p.id,p.path,'Local link target '+dest+' is absent from snapshot.'));
   else if(dest!==p.path)incoming.set(paths.get(dest).id,incoming.get(paths.get(dest).id)+1);
  }
 }
 for(const p of pages)if(p.path!=='/'&&incoming.get(p.id)===0)issues.push(issue('html:unlinked-page','recommendation',p.id,p.path,'No incoming internal anchors in supplied snapshot.'));
 if(snapshot.robotsTxt!==undefined&&typeof snapshot.robotsTxt!=='string')throw Error('robotsTxt must be text');
 if(snapshot.sitemapPaths!==undefined&&(!Array.isArray(snapshot.sitemapPaths)||snapshot.sitemapPaths.some(x=>typeof x!=='string')))throw Error('Invalid sitemapPaths');
 return result('html-snapshot',snapshot.siteId||null,issues,{siteContract:'not provided',htmlSnapshot:true,
   parser:'static heuristic (not DOM, not rendered JS)',robotsSitemap:'supplied artifacts only; HTTP rules not fetched',measuredPerformance:false});
}
module.exports=Object.freeze({FORMAT,auditSite,snapshotAudit});
