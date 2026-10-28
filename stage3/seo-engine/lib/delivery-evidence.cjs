'use strict';
// Offline analysis of manually supplied captured HTTP responses.
// Inputs are untrusted recordings. Never assert that requests actually reached a live host.
const {readHead}=require('./parity.cjs');
const {wildcardRootBlock}=require('./publication-integrity.cjs');
const FORMAT='manufact-seo-delivery-evidence-v1';
const OUTPUT='manufact-seo-delivery-review-v1';
const routePattern=/^\/(?:[a-z0-9-]+\/)*$/;
const headersOf=raw=>{
 if(raw===undefined)return {};
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>60)
  throw Error('Invalid response header map');
 const result={};
 for(const [name,value] of Object.entries(raw)){
  if(!/^[a-z0-9-]{1,80}$/i.test(name)||typeof value!=='string'||value.length>4000||
    /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))throw Error('Invalid HTTP response header');
  const key=name.toLowerCase();
  if(result[key]!==undefined)throw Error('Duplicate case-insensitive HTTP header');
  result[key]=value;
 }
 return result;
};
function urlFrom(raw,what){
 let url;
 try{url=new URL(raw);}catch{throw Error('Invalid '+what);}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
  url.hostname==='snapshot.invalid')throw Error('Unsafe '+what);
 return url;
}
function base(origin,path){
 const url=new URL(origin);
 const prefix=url.pathname.endsWith('/')?url.pathname:url.pathname+'/';
 return new URL(prefix+path.slice(1),url.origin);
}
function assertEvidence(e){
 if(!e||e.format!==FORMAT||typeof e.siteId!=='string'||
  !Array.isArray(e.pages)||e.pages.length>80||e.pages.length===0||
  !e.origin||typeof e.origin!=='string')throw Error('Invalid HTTP delivery evidence');
 const u=urlFrom(e.origin,'capture origin');
 if(!u.pathname.endsWith('/'))throw Error('Capture origin must end with / (including mount)');
 if(Object.keys(e).some(k=>!['format','siteId','origin','pages','robots','sitemap','capturedAt'].includes(k)))
  throw Error('Unsupported delivery evidence field');
 if(e.capturedAt!==undefined&&(typeof e.capturedAt!=='string'||
  !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(e.capturedAt)||
  !Number.isFinite(Date.parse(e.capturedAt))))throw Error('Invalid capturedAt timestamp');
 const used=new Set();
 for(const p of e.pages){
  if(!p||typeof p!=='object'||Array.isArray(p)||
   Object.keys(p).some(k=>!['id','path','requestUrl','responseUrl','status','headers','html'].includes(k))||
   typeof p.id!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(p.id)||
   typeof p.path!=='string'||!routePattern.test(p.path)||used.has(p.id)||
   typeof p.requestUrl!=='string'||typeof p.responseUrl!=='string'||
   !Number.isInteger(p.status)||p.status<100||p.status>599||
   p.html!==undefined&&(typeof p.html!=='string'||p.html.length>500000))
    throw Error('Invalid bounded HTTP page observation');
  used.add(p.id);
  urlFrom(p.requestUrl,'page request URL');urlFrom(p.responseUrl,'page response URL');
  headersOf(p.headers);
 }
 for(const [key,limit] of [['robots',250000],['sitemap',750000]]){
  const x=e[key];if(x===undefined)continue;
  if(!x||typeof x!=='object'||Array.isArray(x)||
   Object.keys(x).some(k=>!['status','url','contentType','body'].includes(k))||
   !Number.isInteger(x.status)||x.status<100||x.status>599||
   typeof x.url!=='string'||typeof x.body!=='string'||x.body.length>limit||
   x.contentType!==undefined&&(typeof x.contentType!=='string'||x.contentType.length>150))
   throw Error('Invalid '+key+' captured response');
  urlFrom(x.url,key+' URL');
 }
 return u;
}
function sitemapPaths(xml){
 // Bounded *conservative* extractor, NOT a general XML parser.
 // Never assert sitemap omissions unless all direct URL entries can be enumerated.
 if(typeof xml!=='string'||xml.length>750000)throw Error('Invalid bounded sitemap body');
 const index=/<(?:[a-z][\w.-]*:)?sitemapindex(?:\s|>)/i.test(xml);
 const kind=index?'index':/<(?:[a-z][\w.-]*:)?urlset(?:\s|>)/i.test(xml)?'urlset':'unknown';
 if(kind!=='urlset'||/<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<script\b/i.test(xml))
  return {kind,urls:[],unverified:true,reason:'unsupported-xml-document'};
 const roots=[...xml.matchAll(/<(?!\/)(?:[a-z][\w.-]*:)?urlset(?:\s[^<>]*?)?>/gi)];
 const endRoots=[...xml.matchAll(/<\/(?:[a-z][\w.-]*:)?urlset\s*>/gi)];
 if(roots.length!==1||endRoots.length!==1||endRoots[0].index<roots[0].index)
  return {kind,urls:[],unverified:true,reason:'unclosed-or-ambiguous-urlset'};
 const start=[...xml.matchAll(/<(?!\/)(?:[a-z][\w.-]*:)?url(?:\s[^<>]*?)?>/gi)];
 const ends=[...xml.matchAll(/<\/(?:[a-z][\w.-]*:)?url\s*>/gi)];
 if(start.length!==ends.length||start.length>2000)
  return {kind,urls:[],unverified:true,reason:'url-count-or-limit'};
 const urls=[],urlBlocks=[...xml.matchAll(/<(?:[a-z][\w.-]*:)?url(?:\s[^<>]*?)?>([\s\S]*?)<\/(?:[a-z][\w.-]*:)?url\s*>/gi)];
 if(urlBlocks.length!==start.length)
  return {kind,urls:[],unverified:true,reason:'unbalanced-url-blocks'};
 const allLocTags=[...xml.matchAll(/<(?!\/)(?:[a-z][\w.-]*:)?loc(?:\s[^<>]*?)?>/gi)];
 const allCloseLoc=[...xml.matchAll(/<\/(?:[a-z][\w.-]*:)?loc\s*>/gi)];
 if(allLocTags.length!==urlBlocks.length||allCloseLoc.length!==urlBlocks.length)
  return {kind,urls:[],unverified:true,reason:'ambiguous-loc-count'};
 for(const block of urlBlocks){
  const matches=[...block[1].matchAll(/<(?:[a-z][\w.-]*:)?loc(?:\s[^<>]*?)?>([^<>]{1,2048})<\/(?:[a-z][\w.-]*:)?loc\s*>/gi)];
  if(matches.length!==1)return {kind,urls:[],unverified:true,reason:'missing-or-invalid-loc'};
  const raw=matches[0][1].trim();
  if(/&(?!(?:amp);)/i.test(raw))return {kind,urls:[],unverified:true,reason:'unhandled-xml-entity'};
  urls.push(raw.replace(/&amp;/gi,'&'));
 }
 return {kind,urls,unverified:false,reason:null};
}
function review(site,evidence){
 if(!site||!Array.isArray(site.pages)||site.siteId!==evidence?.siteId)
  throw Error('Delivery review siteId mismatch');
 const origin=assertEvidence(evidence);
 const routes=new Map(site.pages.map(p=>[p.id,p]));
 const findings=[],summaries=[],seen=new Set();
 const add=(code,severity,id,path,message,extra={})=>findings.push({
  code,severity,pageId:id||null,path:path||null,message,
  evidence:'user-supplied-http-transcript',automatic:false,...extra
 });
 for(const p of evidence.pages){
  const intended=routes.get(p.id),request=urlFrom(p.requestUrl,'request');
  const response=urlFrom(p.responseUrl,'response'),expected=base(evidence.origin,p.path);
  const head=p.html?readHead(p.html):null;
  const headers=headersOf(p.headers);
  const xrobots=headers['x-robots-tag']||'';
  const noindexHeader=/(?:^|[\s,])noindex(?:$|[\s,])/i.test(xrobots);
  const noindexMeta=/(?:^|[\s,])noindex(?:$|[\s,])/i.test(head?.robots||'');
  if(!intended||intended.path!==p.path)
   add('delivery:unmatched-page','error',p.id,p.path,'Captured page ID/path does not match supplied Site v1.');
  if(request.href!==expected.href)
   add('delivery:request-url-mismatch','warning',p.id,p.path,
    'HTTP request URL differs from the origin and route declared for this page.',
    {expectedUrl:expected.href,observedUrl:request.href});
  if(response.href!==expected.href)
   add('delivery:response-url-mismatch','warning',p.id,p.path,
    'Final HTTP URL differs from the intended public page URL.',{observedUrl:response.href});
  if(p.status<200||p.status>=300)
   add('delivery:non-success-status',p.status>=400?'error':'warning',p.id,p.path,
    'Supplied page response does not have a 2xx status.',{status:p.status});
  if(p.status>=300&&p.status<400){
   const location=headers.location;
   if(!location)add('delivery:missing-redirect-location','warning',p.id,p.path,'Redirect has no Location header.');
  }
  if(p.status>=200&&p.status<300&&!/text\/html\b/i.test(headers['content-type']||''))
   add('delivery:html-content-type','warning',p.id,p.path,
    'HTTP Content-Type does not confirm HTML (or was not supplied).');
  if(p.status>=200&&p.status<300&&(!p.html||!head||head.status!=='parsed-head'))
   add('delivery:html-body-unavailable','recommendation',p.id,p.path,
    'No parseable HTML body was supplied for a successful response.');
  if(intended&&p.status>=200&&p.status<300){
   const shouldIndex=(intended.seo?.robots||'index')==='index';
   if(shouldIndex&&(noindexHeader||noindexMeta))
    add('delivery:indexability-drift','error',p.id,p.path,
     'Site v1 intends index, but captured X-Robots-Tag or HTML robots meta contains noindex.',
     {xRobotsTag:noindexHeader,metaNoindex:noindexMeta});
   if(!shouldIndex&&!noindexHeader&&!noindexMeta&&head?.status==='parsed-head')
    add('delivery:noindex-absent','warning',p.id,p.path,
     'Site v1 intends noindex but no explicit noindex signal appears in captured headers/HTML.');
   if(head?.status==='parsed-head'){
    if(!head.canonical)
     add('delivery:canonical-absent','recommendation',p.id,p.path,
      'No HTML canonical was captured; check whether this was an intentional publisher decision.');
    else{
     try{
      const canonical=new URL(head.canonical,new URL(head.baseHref||response.href,response.href));
      if(canonical.protocol!=='https:'||canonical.username||canonical.password)
       throw Error('unsafe');
      if(shouldIndex&&canonical.href!==expected.href)
       add('delivery:canonical-public-url-drift','warning',p.id,p.path,
        'Captured canonical differs from the declared public HTTPS URL; review mount, consolidation and redirects.',
        {expectedUrl:expected.href,canonicalUrl:canonical.href});
     }catch{add('delivery:canonical-invalid','error',p.id,p.path,'Captured canonical URL is invalid or unsafe.');}
    }
    if(intended.seo?.title&&head.title&&head.title!==intended.seo.title)
     add('delivery:title-drift','warning',p.id,p.path,
      'Captured title differs from current Site v1 title.');
    if(intended.seo?.description&&head.description!==intended.seo.description)
     add('delivery:description-drift','warning',p.id,p.path,
      'Captured meta description differs from current Site v1 description.');
   }
  }
  seen.add(p.id);
  summaries.push({pageId:p.id,path:p.path,status:p.status,requestUrl:p.requestUrl,
   responseUrl:p.responseUrl,headPresent:head?.status==='parsed-head',
   noindexInHeader:noindexHeader,noindexInMeta:noindexMeta,
   isExpectedPublicUrl:response.href===expected.href});
 }
 const missing=site.pages.filter(p=>!seen.has(p.id)).map(p=>({pageId:p.id,path:p.path}));
 const robots=evidence.robots;
 if(robots){
  if(robots.status!==200)add('delivery:robots-status','warning',null,'/robots.txt',
   'Captured robots.txt response is not HTTP 200.',{status:robots.status});
  if(wildcardRootBlock(robots.body))add('delivery:robots-disallow-all','warning',null,'/robots.txt',
   'Captured robots.txt may block the wildcard crawler; confirm precedence and deployment policy.');
  if(urlFrom(robots.url,'robots URL').origin!==origin.origin)
   add('delivery:robots-origin-mismatch','warning',null,'/robots.txt',
    'Robots resource is captured from a different origin.');
 }
 const sitemap=evidence.sitemap;
 let parsed=null;
 if(sitemap){
  parsed=sitemapPaths(sitemap.body);
  if(sitemap.status!==200)add('delivery:sitemap-status','warning',null,'/sitemap.xml',
   'Captured sitemap resource is not HTTP 200.',{status:sitemap.status});
  if(urlFrom(sitemap.url,'sitemap URL').origin!==origin.origin)
   add('delivery:sitemap-origin-mismatch','warning',null,'/sitemap.xml',
    'Sitemap resource is captured from a different origin.');
  if(parsed.kind!=='urlset'||parsed.unverified)
   add('delivery:sitemap-enumeration-unverified','recommendation',null,'/sitemap.xml',
    'Sitemap body is not a complete, parseable direct URL set; child sitemap indexes require separate review.',
    {kind:parsed.kind,reason:parsed.reason||null});
  else if(sitemap.status===200){
   const seenRoutes=new Set();
   for(const raw of parsed.urls){
    try{
     const url=urlFrom(raw,'sitemap loc'),path=url.href;
     if(url.origin!==origin.origin)add('delivery:sitemap-foreign-host','warning',null,null,
      'Sitemap lists an off-origin URL.',{url:raw.slice(0,300)});
     else if(seenRoutes.has(path))add('delivery:sitemap-duplicate','recommendation',null,null,
      'A public sitemap URL is repeated.',{url:raw.slice(0,300)});
     else seenRoutes.add(path);
    }catch{add('delivery:sitemap-invalid-loc','warning',null,null,'Sitemap contains an invalid or non-HTTPS loc URL.');}
   }
   for(const page of site.pages){
    const url=base(evidence.origin,page.path).href;
    if((page.seo?.robots||'index')==='index'&&!seenRoutes.has(url))
     add('delivery:sitemap-indexable-absent','error',page.id,page.path,
      'Site v1 indexable page is missing from supplied complete direct sitemap URL set.',
      {expectedUrl:url});
    if((page.seo?.robots||'index')==='noindex'&&seenRoutes.has(url))
     add('delivery:sitemap-noindex-listed','error',page.id,page.path,
      'Site v1 noindex page is listed in supplied sitemap.',{url});
   }
  }
 }
 return {format:OUTPUT,version:1,siteId:site.siteId,readOnly:true,
  origin:evidence.origin,capturedAt:evidence.capturedAt??null,
  coverage:{sitePages:site.pages.length,capturedPages:summaries.length,missingPages:missing,
   capturesHaveHtml:summaries.filter(x=>x.headPresent).length,
   robotsCaptured:Boolean(robots),sitemapCaptured:Boolean(sitemap),
   sitemapKind:parsed?.kind??null,liveRequestsPerformedByToolkit:false,
   independentlyVerifiedProvenance:false},
  pages:summaries,findings,
  releaseAuthorized:false,
  limitations:'All HTTP status, response headers, bodies, origin and capture timestamps are caller-provided. The toolkit neither fetches nor authenticates them. A successful supplied response does not prove real availability, indexation, visual quality, form delivery or release acceptance.'};
}
module.exports=Object.freeze({FORMAT,OUTPUT,review,sitemapPaths,assertEvidence});
