'use strict';
// Read-only checks of SUPPLIED sitemap/robots/canonical artifacts against the current Site v1.
// These are not observations of deployed HTTP resources or a search-engine crawl.
const {snapshotAudit}=require('./analyze.cjs');
const MOUNT=require('./published-mount.cjs');
const {readHead}=require('./parity.cjs');
const FORMAT='manufact-seo-publication-integrity-v1';
function wildcardRootBlock(text){
 if(!text)return false;
 const groups=[];
 let agents=[],rules=[];
 const flush=()=>{if(agents.length)groups.push({agents:[...agents],rules:[...rules]});agents=[];rules=[];};
 for(const raw of text.split(/\r?\n/)){
  const line=raw.replace(/#.*$/,'').trim();
  const m=/^(user-agent|allow|disallow)\s*:\s*(.*)$/i.exec(line);
  if(!m)continue;
  const key=m[1].toLowerCase(),value=m[2].trim();
  if(key==='user-agent'){
   if(rules.length)flush();
   agents.push(value.toLowerCase());
  }else if(agents.length)rules.push({key,value});
 }
 flush();
 return groups.some(group=>group.agents.includes('*')&&
  group.rules.some(r=>r.key==='disallow'&&r.value==='/')&&
  !group.rules.some(r=>r.key==='allow'&&r.value==='/'));
}
function review(site,snapshot){
 if(!site||typeof site.siteId!=='string'||!Array.isArray(site.pages))
  throw Error('Publication integrity requires validated Site v1');
 if(snapshot?.siteId&&snapshot.siteId!==site.siteId)
  throw Error('Publication artifacts siteId mismatch');
 // Reuse the bounded existing snapshot validator before considering any evidence.
 snapshotAudit(snapshot);
 const mount=MOUNT.fromSnapshot(snapshot);
 const findings=[],sitePaths=new Map(site.pages.map(p=>[p.path,p]));
 const sitemap=Array.isArray(snapshot.sitemapPaths)?snapshot.sitemapPaths:null;
 const exhaustive=snapshot.sitemapCompleteness==='complete';
 const add=(code,severity,pageId,path,message,details={})=>
  findings.push({code,severity,pageId:pageId||null,path:path||null,message,...details,
   automatic:false,evidence:'supplied-static-artifact'});
 if(sitemap){
  const seen=new Set();
  for(const path of sitemap){
   if(seen.has(path))add('publication:sitemap-duplicate','recommendation',null,path,
    'Sitemap path is repeated in the supplied enumeration.');
   seen.add(path);
   const page=sitePaths.get(path);
   if(!page){
    add('publication:sitemap-unknown-route','warning',null,path,
     'Sitemap includes a route absent from supplied Site v1; check redirects, mount and other site-owned routes.');
   }else if((page.seo?.robots||'index')==='noindex'){
    add('publication:sitemap-noindex','error',page.id,path,
     'Site v1 marks this page noindex but its route is explicitly listed in the supplied sitemap.');
   }
  }
  if(exhaustive)for(const page of site.pages){
   if((page.seo?.robots||'index')==='index'&&!seen.has(page.path))
    add('publication:sitemap-indexable-missing','error',page.id,page.path,
     'An indexable Site v1 page is absent from an explicitly complete sitemap enumeration.');
  }
 }
 for(const capture of snapshot.pages){
  const declared=site.pages.find(p=>p.id===capture.id);
  if(declared&&declared.path!==capture.path)continue; // parity reports this mismatch.
  const head=readHead(capture.html);
  if(head.status!=='parsed-head'||!head.canonical)continue;
  const raw=head.canonical.trim();
  let canonical;
  try{
   const base=new URL(head.baseHref||mount+capture.path.slice(1),
    'https://snapshot.invalid'+mount+capture.path.slice(1));
   canonical=new URL(raw,base);
   if(!['https:','http:'].includes(canonical.protocol)||canonical.username||canonical.password)
    throw Error('Invalid canonical scheme');
  }catch{
   add('publication:invalid-canonical','error',capture.id,capture.path,
    'A supplied canonical cannot be interpreted as a safe HTTP(S) URL.');
   continue;
  }
  if(canonical.hash||canonical.search)add('publication:canonical-parameters','warning',capture.id,capture.path,
   'Canonical contains a query or fragment; review the intended canonical document.',{canonical:raw.slice(0,240)});
  if(canonical.hostname==='snapshot.invalid'){
   if(MOUNT.route(canonical.pathname,mount)!==capture.path)
    add('publication:canonical-route-review','warning',capture.id,capture.path,
     'Relative canonical points to a different route. Review deliberate canonical consolidation.',{canonicalPath:canonical.pathname});
  }else{
   // Absolute URLs may contain an approved deployment mount; this tool does not know the host.
   if(!canonical.pathname.endsWith(capture.path)||capture.path==='/')
    add('publication:absolute-canonical-review','recommendation',capture.id,capture.path,
     'Verify absolute canonical origin and mount against the actual published host.',{canonical:raw.slice(0,240)});
  }
 }
 if(wildcardRootBlock(snapshot.robotsTxt))
  add('publication:robots-root-restricted','warning',null,null,
   'Supplied robots.txt includes a wildcard Disallow: / without an equivalent Allow: /; verify crawl access and rule precedence on the deployed host.');
 return {format:FORMAT,version:1,siteId:site.siteId,readOnly:true,
  findings,coverage:{
   source:'supplied-trusted-static-artifacts',htmlPages:snapshot.pages.length,
   sitemapSupplied:Boolean(sitemap),sitemapCompleteness:sitemap?exhaustive?'complete':'partial-or-unknown':'not-supplied',
   sitemapPathCount:sitemap?.length??null,robotsTxtSupplied:typeof snapshot.robotsTxt==='string',
   liveHttpChecked:false,deployedOriginVerified:false},
  limitations:'No HTTP fetch, robots rule evaluation for arbitrary crawlers, sitemap discovery, canonical-host verification, search-index status or automatic release. Sitemap omissions are only classified when completeness was explicitly declared.'};
}
module.exports=Object.freeze({FORMAT,review,wildcardRootBlock});
