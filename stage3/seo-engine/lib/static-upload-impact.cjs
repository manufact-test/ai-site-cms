'use strict';
// Compare TWO fully SHA256-verified operator upload packages, never guess
// production state. Unexpected page removals, redirects, indexability loss and
// same-URL media byte changes are first-class launch decision items.
const PREVIEW=require('./static-host-preview.cjs');
const FORMAT='manufact-seo-static-upload-impact-v1';
function routeFromFile(file){
 if(file==='index.html')return '/';
 if(/^(?:[a-z0-9-]+\/)+index\.html$/.test(file))return '/'+file.slice(0,-'index.html'.length);
 return null;
}
function inspectHtml(snapshot,file){
 const html=require('node:fs').readFileSync(require('node:path').join(snapshot.root,file),'utf8');
 const head=/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html)?.[1]||'';
 const robots=[...head.matchAll(/<meta\b[^>]*name=["']robots["'][^>]*>/gi)]
  .map(m=>m[0]).join(' ').toLowerCase();
 return Object.freeze({noindex:/content=["'][^"']*noindex/.test(robots),
  hasCanonical:/<link\b[^>]*rel=["']canonical["']/i.test(head)});
}
function compare(before,after){
 if(!before?.inventory||!after?.inventory||before.inventory.siteId!==after.inventory.siteId)
  throw Error('Static impact review requires two individually verified uploads of the same CMS site');
 const a=before.inventory,b=after.inventory;
 if(!Number.isSafeInteger(a.publishedVersion)||!Number.isSafeInteger(b.publishedVersion))
  throw Error('Published CMS release versions must be known');
 const risks=[],changes=[],note=(type,severity,path,message)=>risks.push(Object.freeze({
  type,severity,path,message,automaticRelease:false}));
 if(b.publishedVersion<a.publishedVersion)
  note('release-version-rollback','error',null,'New candidate publishedVersion is older than the prior upload.');
 if(b.publishedVersion===a.publishedVersion&&
    a.officialStaticManifestSha256!==b.officialStaticManifestSha256)
  note('immutable-published-version-drift','error',null,
   'Two different official static manifests claim the same published CMS version; require immutable release/version identity.');
 if(a.origin!==b.origin)
  note('public-origin-migration','error',null,'Canonical public HTTPS origin changed; require explicit domain migration review.');
 if(a.provider!==b.provider)
  note('hosting-provider-change','warning',null,'New candidate uses a different hosting provider and rewrite rules.');
 const oldFiles=new Map(a.files.map(f=>[f.file,f])),newFiles=new Map(b.files.map(f=>[f.file,f]));
 const oldPages=new Map([...oldFiles.values()].filter(f=>f.kind==='html').map(f=>[routeFromFile(f.file),f]));
 const newPages=new Map([...newFiles.values()].filter(f=>f.kind==='html').map(f=>[routeFromFile(f.file),f]));
 const oldRedirects=before.redirects,newRedirects=after.redirects;
 const removedPages=[],addedPages=[],changedPages=[],modifiedMedia=[];
 for(const [route,f] of oldPages){
  const next=newPages.get(route);
  if(!next){
   removedPages.push(route);
   if(!newRedirects.has(route))
    note('indexable-page-removed-without-301','error',route,
     'A previously published page disappeared without a declared 301 to a current page.');
   else if(!newPages.has(newRedirects.get(route)))
    note('page-redirect-target-removed','error',route,'Page redirect does not resolve to a current published page.');
   continue;
  }
  if(next.sha256!==f.sha256){
   changedPages.push(route);
   const prev=inspectHtml(before,f.file),now=inspectHtml(after,next.file);
   if(!prev.noindex&&now.noindex)
    note('page-became-noindex','error',route,'Page previously indexable is now marked noindex; confirm explicit owner instruction.');
   if(prev.hasCanonical&&!now.hasCanonical)
    note('canonical-disappeared','error',route,'Canonical link disappeared from an existing published page.');
  }
 }
 for(const route of newPages.keys())if(!oldPages.has(route))addedPages.push(route);
 for(const [file,f] of oldFiles){
  const next=newFiles.get(file);
  if(!next){changes.push({file,kind:f.kind,change:'removed'});continue;}
  if(next.sha256!==f.sha256){
   changes.push({file,kind:f.kind,change:'modified'});
   if(f.kind==='media'&&next.kind==='media'){
    modifiedMedia.push(file);
    note('media-cache-key-unchanged','warning','/'+file,
     'Published media content changed at the same URL; check CDN edge cache invalidation.');
   }
  }
 }
 for(const [file,f] of newFiles)if(!oldFiles.has(file))
  changes.push({file,kind:f.kind,change:'added'});
 const changedRedirects=[];
 for(const [from,to] of oldRedirects){
  if(!newRedirects.has(from)){
   note('historical-301-removed','error',from,'Previously published historic 301 disappeared; preserve old route or explicitly approve retirement.');
   changedRedirects.push({from,change:'removed'});continue;
  }
  if(newRedirects.get(from)!==to){
   note('historical-301-retargeted','warning',from,'Historic redirect changed destination; review canonical target and link history.');
   changedRedirects.push({from,change:'retargeted'});
  }
 }
 for(const [from] of newRedirects)if(!oldRedirects.has(from))
  changedRedirects.push({from,change:'added'});
 if(oldFiles.get('robots.txt')?.sha256!==newFiles.get('robots.txt')?.sha256)
  note('robots-policy-changed','warning','/robots.txt','Robots crawl policy changed between publication candidates.');
 if(oldFiles.get('sitemap.xml')?.sha256!==newFiles.get('sitemap.xml')?.sha256)
  note('sitemap-changed','warning','/sitemap.xml','Sitemap contents changed; verify indexed page set and origin.');
 const blockers=risks.filter(x=>x.severity==='error');
 const report=Object.freeze({
  format:FORMAT,siteId:a.siteId,oldVersion:a.publishedVersion,newVersion:b.publishedVersion,
  oldManifestSha256:a.officialStaticManifestSha256,newManifestSha256:b.officialStaticManifestSha256,
  samePublishedOrigin:a.origin===b.origin,
  sameProvider:a.provider===b.provider,
  pages:{before:oldPages.size,after:newPages.size,added:addedPages,removed:removedPages,changed:changedPages},
  changedMediaSameUrl:modifiedMedia,
  changedRedirects,filesChanged:changes,risks,blockerCount:blockers.length,
  technicalApproval:false,clientApproved:false,remoteDeploymentCompared:false,
  nextStep:'Owner must manually review changed live routes, redirects, noindex, source revision and media caching before replacing a site.'});
 return report;
}
function loadAndCompare(beforeDir,afterDir){return compare(PREVIEW.load(beforeDir),PREVIEW.load(afterDir));}
module.exports=Object.freeze({FORMAT,routeFromFile,inspectHtml,compare,loadAndCompare});
