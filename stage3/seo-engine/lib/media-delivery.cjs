'use strict';
// Site v1 media assets, supplied HTTP responses and HTML OG image references.
// Read-only, no image retrieval or browser rendering. Do not infer image accessibility
// or social sharing appearance from metadata strings alone.
const FORMAT='manufact-seo-media-evidence-v1',OUTPUT='manufact-seo-media-review-v1';
const pathPattern=/^\/assets\/[a-zA-Z0-9/_-]+\.(?:png|webp|jpe?g|svg|mp4)$/;
const MIME={'image/png':'image/png','image/jpeg':'image/jpeg','image/webp':'image/webp',
 'image/svg+xml':'image/svg+xml','video/mp4':'video/mp4'};
const clean=x=>String(x??'').replace(/&amp;/gi,'&').trim();
function publicUrl(origin,src){
 const base=new URL(origin);
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||
  !base.pathname.endsWith('/'))throw Error('Media evidence must declare HTTPS origin with trailing slash');
 return new URL(base.pathname+src.replace(/^\//,''),base.origin);
}
function safeUrl(raw){
 const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.hash)
  throw Error('Invalid HTTPS media response URL');
 return u;
}
function metaTags(html){
 const head=/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html)?.[1]||'';
 const stripped=head.replace(/<!--[\s\S]*?-->/g,'')
  .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 const attrs=raw=>{
  const out={};
  for(const m of raw.matchAll(/([a-z][a-z0-9:_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi))
   out[m[1].toLowerCase()]=clean(m[2]??m[3]??m[4]);
  return out;
 };
 const imgs=[];
 for(const match of stripped.matchAll(/<meta\b([^>]*?)\/?>/gi)){
  const a=attrs(match[1]);
  if((a.property||'').toLowerCase()==='og:image'||(a.name||'').toLowerCase()==='twitter:image')
   imgs.push({property:(a.property||a.name).toLowerCase(),url:a.content||''});
 }
 return imgs;
}
function assertEvidence(e){
 if(!e||e.format!==FORMAT||typeof e.siteId!=='string'||
  typeof e.origin!=='string'||!Array.isArray(e.resources)||e.resources.length>400||
  e.completeness!==undefined&&!['partial','complete'].includes(e.completeness)||
  Object.keys(e).some(k=>!['format','siteId','origin','completeness','resources'].includes(k)))
  throw Error('Invalid media evidence contract');
 publicUrl(e.origin,'/assets/placeholder.png');
 const ids=new Set();
 for(const x of e.resources){
  if(!x||typeof x!=='object'||Array.isArray(x)||
   Object.keys(x).some(k=>!['assetId','url','status','contentType','contentLength','width','height'].includes(k))||
   typeof x.assetId!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(x.assetId)||
   ids.has(x.assetId)||typeof x.url!=='string'||!Number.isInteger(x.status)||x.status<100||x.status>599||
   typeof x.contentType!=='string'||x.contentType.length>150||
   x.contentLength!==undefined&&(!Number.isSafeInteger(x.contentLength)||x.contentLength<0)||
   x.width!==undefined&&(!Number.isInteger(x.width)||x.width<1||x.width>100000)||
   x.height!==undefined&&(!Number.isInteger(x.height)||x.height<1||x.height>100000))
    throw Error('Invalid media HTTP resource observation');
  ids.add(x.assetId);safeUrl(x.url);
 }
 return true;
}
function review(site,evidence,htmlSnapshot=null){
 if(!site||site.siteId!==evidence?.siteId||!Array.isArray(site.assets)||!Array.isArray(site.pages))
  throw Error('Media evidence Site v1 mismatch');
 assertEvidence(evidence);
 if(htmlSnapshot&&(htmlSnapshot.format!=='manufact-seo-html-snapshot-v1'||
  htmlSnapshot.siteId&&htmlSnapshot.siteId!==site.siteId||!Array.isArray(htmlSnapshot.pages)))
  throw Error('Invalid HTML capture for media review');
 const assets=new Map(site.assets.map(a=>[a.id,a]));
 const referencedOg=new Set(site.pages.map(p=>p.seo?.ogImage).filter(Boolean));
 const reports=new Map(),issues=[];
 const add=(code,severity,pageId,path,message,extra={})=>issues.push({
  code,severity,pageId:pageId||null,path:path||null,message,...extra,
  evidence:'caller-supplied-media-and-html',automatic:false});
 for(const r of evidence.resources){
  const a=assets.get(r.assetId);
  if(!a){add('media:unknown-asset','warning',null,null,
    'Media transcript references asset not present in Site v1.',{assetId:r.assetId});continue;}
  const expected=publicUrl(evidence.origin,a.src).href,actual=safeUrl(r.url);
  if(actual.href!==expected)add('media:resource-url-drift','warning',null,a.src,
   'Captured media URL differs from the current site asset path.',{assetId:a.id,expectedUrl:expected,observedUrl:actual.href});
  if(r.status<200||r.status>=300)
   add('media:resource-status-error',r.status>=400&&referencedOg.has(a.id)?'error':'warning',null,a.src,
    'Captured media resource has a non-success status; only a failed referenced OG image is a release blocker.',
    {assetId:a.id,status:r.status});
  const observedMime=r.contentType.split(';')[0].trim().toLowerCase();
  if(r.status>=200&&r.status<300&&observedMime!==a.mime.toLowerCase())
   add('media:resource-mime-mismatch',referencedOg.has(a.id)?'error':'warning',null,a.src,
    'Captured Content-Type does not agree with Site v1 asset MIME; only a referenced OG image mismatch is a release blocker.',
    {assetId:a.id,expectedMime:a.mime,observedMime});
  if(r.status===200&&r.contentLength!==undefined&&r.contentLength>10*1024*1024)
   add('media:heavy-asset','recommendation',null,a.src,
    'Captured media exceeds 10 MB; evaluate expected use, optimization and delivery.',
    {assetId:a.id,bytes:r.contentLength});
  reports.set(r.assetId,{assetId:r.assetId,source:a.src,expectedUrl:expected,
   status:r.status,observedMime,expectedMime:a.mime,dimensionsReported:
    Number.isInteger(r.width)&&Number.isInteger(r.height),provenanceAuthenticated:false});
 }
 const complete=evidence.completeness==='complete';
 const used=new Set();
 for(const p of site.pages){
  const a=p.seo?.ogImage?assets.get(p.seo.ogImage):null;
  if(!a)continue;
  used.add(a.id);
  if(!a.mime.startsWith('image/'))add('media:og-image-not-image','error',p.id,p.path,
   'Site v1 OG media reference must point to an image asset.',{assetId:a.id});
  if(complete&&!reports.has(a.id))add('media:og-resource-not-captured','warning',p.id,p.path,
   'Referenced OG media is absent from explicitly complete media evidence.',{assetId:a.id});
  const h=htmlSnapshot?.pages?.find(x=>x.id===p.id&&x.path===p.path);
  if(h&&typeof h.html==='string'){
   const tags=metaTags(h.html),og=tags.filter(x=>x.property==='og:image');
   if(og.length===0)add('media:og-meta-missing','warning',p.id,p.path,
    'Supplied HTML lacks og:image despite a Site v1 OG image reference.',{assetId:a.id});
   if(og.length>1)add('media:multiple-og-images','recommendation',p.id,p.path,
    'Several og:image declarations appear; review intentional fallbacks.',{assetId:a.id});
   const expected=publicUrl(evidence.origin,a.src).href;
   for(const tag of og){
    try{
     const u=new URL(tag.url,publicUrl(evidence.origin,p.path));
     if(u.href!==expected)add('media:og-html-url-drift','warning',p.id,p.path,
      'OG image published URL differs from the current Site v1 media asset and origin.',
      {assetId:a.id,expectedUrl:expected,observedUrl:u.href});
     if(!/^https:\/\//i.test(tag.url))add('media:og-relative-url','recommendation',p.id,p.path,
      'Use an absolute HTTPS og:image URL for social previews where supported.',{assetId:a.id});
    }catch{add('media:invalid-og-image-url','error',p.id,p.path,
     'Supplied HTML contains an invalid OG image URL.',{assetId:a.id});}
   }
  }
 }
 const uncaptured=site.assets.filter(a=>!reports.has(a.id)).map(a=>a.id);
 return {format:OUTPUT,version:1,siteId:site.siteId,readOnly:true,
  origin:evidence.origin,completeness:complete?'declared-complete':'partial-or-unknown',
  coverage:{siteAssets:site.assets.length,capturedKnownResources:reports.size,
   referencedOgImageAssets:used.size,missingResourceIds:uncaptured,
   sampledHtmlPages:htmlSnapshot?.pages?.length??null,
   authenticatedHttpRequests:0,visuallyApprovedImages:0},
  resources:[...reports.values()],findings:issues,releaseAuthorized:false,
  limits:'Media status, URLs, MIME and dimensions are caller-supplied assertions; no fetch, binary decode, social-platform rendering, alt/context accessibility certification or actual production verification occurred.'};
}
module.exports=Object.freeze({FORMAT,OUTPUT,publicUrl,assertEvidence,metaTags,review});
