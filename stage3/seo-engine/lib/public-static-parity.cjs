'use strict';
// Review explicitly supplied PUBLIC HTTP evidence against an official,
// SHA-checked static publisher release. Do not call network or authenticate
// the HTTP transcript. This answers "what is served?" only if operator
// corroborates the original network collection.
const STATIC=require('./php-local-static-export.cjs');
const DELIVERY=require('./delivery-evidence.cjs');
const MEDIA=require('./media-delivery.cjs');
const {inspect}=require('./html-evidence.cjs');
const FORMAT='manufact-seo-public-static-deployment-parity-v1';
const accepted=new WeakSet();
const norm=x=>String(x??'').replace(/\s+/g,' ').trim().normalize('NFKC');
const SHA=/^[a-f0-9]{64}$/;
const HTTPS=u=>u.protocol==='https:'&&!u.username&&!u.password&&!u.hash;
function compare(site,release,http,media=null){
 if(!site||!Array.isArray(site.pages)||!release||
    release.siteId!==site.siteId||!release.sha256VerifiedAtRead||
    !http||http.siteId!==site.siteId||!Array.isArray(http.pages)||
    media&&media.siteId!==site.siteId)
  throw Error('Static public comparison needs matching published Site v1, official export and captured HTTP evidence');
 DELIVERY.assertEvidence(http);
 if(media)MEDIA.assertEvidence(media);
 let base;
 try{base=new URL(http.origin);}catch{throw Error('Invalid HTTPS captured host');}
 if(!HTTPS(base))throw Error('Public comparison only accepts explicit HTTPS evidence');
 const findings=[],pages=[],assets=[],auxiliary=[];
 const add=(code,severity,page,message,extra={})=>findings.push(Object.freeze({
  code:'public-static:'+code,severity,pageId:page?.id??null,path:page?.path??null,
  message,evidence:'operator-supplied-public-http-vs-sha256-official-static-export',
  automatic:false,...extra}));
 const claim=release.origin;
 let expectedOrigin=null;
 if(claim){
  try{
   const u=new URL(claim);
   if(!HTTPS(u)||u.pathname!=='/'||u.search)throw Error('noncanonical');
   expectedOrigin=u.origin;
  }catch{add('static-export-public-origin-invalid','error',null,
   'Official static release has an invalid or non-HTTPS public production origin.');}
 }
 const comparable=Boolean(expectedOrigin&&base.origin===expectedOrigin&&base.pathname==='/'&&!base.search);
 const reason=!expectedOrigin?'static-export-has-no-verified-https-origin':
  base.origin!==expectedOrigin?'different-public-host':
  base.pathname!=='/'?'public-transcript-is-not-static-root':'ready';
 if(!comparable){
  add('release-host-scope-not-comparable','warning',null,
   'Official root-mounted static export cannot be compared to this public host/mount; collect HTTPS at its declared static origin.');
  return Object.freeze({format:FORMAT,siteId:site.siteId,
   claimedPublicOrigin:http.origin,officialPublicOrigin:claim||null,
   comparisonScope:reason,comparable:false,checkedPages:0,checkedMedia:0,
   checkedSearchFiles:0,checkedRedirects:0,pages:[],assets:[],auxiliary:[],findings,
   allComparedSurfacesMatched:false,httpTranscriptAuthenticated:false,
   actualHostRequestsByThisReview:0,publicSiteApproval:false});
 }
 const paths=new Map(site.pages.map(p=>[p.path,p]));
 const got=new Map();
 for(const p of http.pages){
  const intended=paths.get(p.path);
  if(!intended||got.has(p.path)||p.id!==intended.id)
   throw Error('Public HTTP transcript route list contains ambiguous or foreign pages');
  got.set(p.path,p);
 }
 for(const page of site.pages){
  const supplied=got.get(page.path),official=release.pages.get(page.path);
  if(!official)throw Error('Verified static release omits an expected Site v1 page');
  const issues=[];
  const mismatch=(code,message,field)=>{
   issues.push(field||code);
   add(code,'error',page,message,{...(field?{field}:{})});
  };
  if(!supplied){
   mismatch('page-evidence-missing','No public HTTP response was supplied for an expected static page.');
  }else{
   const expectedUrl=expectedOrigin+page.path;
   if(supplied.status!==200)mismatch('page-response-status',
    'Public static page was not served with HTTP 200.','status');
   if(supplied.requestUrl!==expectedUrl||supplied.responseUrl!==expectedUrl)
    mismatch('page-response-url','Public page URL differs from root-mounted official static route.','url');
   if(typeof supplied.html!=='string'||!supplied.html.trim())
    mismatch('page-html-missing','Public page HTTP transcript lacks a complete HTML body.','html');
   else{
    const live=supplied.html,staticHtml=official.html;
    const parts=[
      ['mainText',STATIC.mainText(staticHtml),STATIC.mainText(live)],
      ['title',STATIC.pageTitle(staticHtml),STATIC.pageTitle(live)],
      ['description',STATIC.pageDescription(staticHtml),STATIC.pageDescription(live)],
      ['headingHierarchy',
       inspect(staticHtml).headings.map(x=>x.level+':'+norm(x.text)),
       inspect(live).headings.map(x=>x.level+':'+norm(x.text))]
    ];
    for(const [field,a,b] of parts)
     if(JSON.stringify(typeof a==='string'?norm(a):a)!==
        JSON.stringify(typeof b==='string'?norm(b):b))
      mismatch('page-content-drift','Publicly observed static content differs from the approved static export.',field);
    const stat=STATIC.structure(staticHtml,site.siteId);
    const seen=STATIC.structure(live,site.siteId);
    for(const key of Object.keys(stat)){
     // Values such as _token HMAC and form submissions are never reported.
     if(JSON.stringify(stat[key])!==JSON.stringify(seen[key]))
      mismatch('page-structure-drift',
       'Public static page structure or CSS/JS differs from the official static release.','structure.'+key);
    }
    const staticHead=inspect(staticHtml),publicHead=inspect(live);
    const headFields=['canonicals','robots','htmlLang','rootStructuredDataTypes'];
    for(const field of headFields)
     if(JSON.stringify(staticHead[field])!==JSON.stringify(publicHead[field]))
      mismatch('page-head-drift','Public static head differs from the official exported SEO metadata.','head.'+field);
    if(staticHead.structuredDataErrors.length===0&&publicHead.structuredDataErrors.length)
     mismatch('public-json-ld-invalid','Public static document contains malformed structured data.','jsonLd');
   }
  }
  pages.push(Object.freeze({pageId:page.id,path:page.path,sourceExportSha256:official.sha256,
   capturedHttpStatus:supplied?.status??null,compared:Boolean(supplied?.html),
   fieldsWithDifferences:Object.freeze(issues)}));
 }
 const expectedAux=release.searchFiles||{};
 for(const [type,key,limit] of [['robots','robots.txt',250000],['sitemap','sitemap.xml',750000]]){
  const declared=expectedAux[key],body=typeof declared==='string'?declared:declared?.body;
  const response=http[type]||null;
  const target=expectedOrigin+'/'+key;
  let match=false;
  if(!declared){
   add('official-search-file-missing','error',null,
    'Production static release lacks official search file '+key+'.',{field:key});
  }else if(typeof body!=='string'){
   add('official-search-body-unavailable','error',null,
    'SHA-verified official static search file body is unavailable for comparison.',{field:key});
  }else if(!response){
   add('public-search-capture-missing','error',null,
    'Public HTTPS capture omitted '+key+'.',{field:key});
  }else{
   // Exact bytes cannot be reconstructed from a text transcript if transport
   // rewrites encoding; compare Unicode-normalized text, not fake byte SHA.
   match=response.status===200&&response.url===target&&
    norm(response.body)===norm(body);
   if(!match)add('public-search-file-drift','error',null,
    'Public HTTPS '+key+' differs from the SHA-verified official static file.',{field:key});
  }
  auxiliary.push(Object.freeze({file:key,checked:Boolean(response),matched:match}));
 }
 const redirects=http.redirects||[];
 const redirectBy=new Map(redirects.map(r=>[r.from,r]));
 for(const [from,to] of release.redirects||new Map()){
  const response=redirectBy.get(from);
  if(!response){add('redirect-capture-missing','error',null,
   'A declared historic redirect has no public HTTP response.',{href:from});continue;}
  const wanted=expectedOrigin+to,request=expectedOrigin+from;
  let actual=null;
  try{actual=new URL(response.location,request).href;}catch{}
  if(response.requestUrl!==request||response.status!==301||actual!==wanted)
   add('redirect-not-http-301','error',null,
    'Public static deployment must provide real HTTP 301 for declared legacy routes; HTML meta-refresh is not a substitute.',
    {href:from,expectedUrl:wanted});
 }
 const assetById=new Map((media?.resources||[]).map(x=>[x.assetId,x]));
 for(const a of site.assets||[]){
  const releaseAsset=release.assets.get(a.id),actual=assetById.get(a.id);
  if(!releaseAsset)throw Error('Verified static release media inventory incomplete');
  if(!media){assets.push({assetId:a.id,checked:false,reason:'no-public-media-transcript'});continue;}
  if(!actual){
   add('public-media-missing','warning',null,
    'Public media HEAD was not captured for an original published asset.',
    {assetId:a.id});
   assets.push({assetId:a.id,checked:false,reason:'missing-public-head'});continue;
  }
  const expectedUrl=expectedOrigin+a.src,contentType=actual.contentType.split(';')[0].trim().toLowerCase();
  const matched=actual.status===200&&actual.url===expectedUrl&&contentType===a.mime.toLowerCase();
  if(!matched)add('public-media-head-drift','error',null,
   'Public static asset URL/status/MIME differs from the official published asset.',{assetId:a.id});
  if(actual.contentLength!==undefined&&actual.contentLength!==releaseAsset.bytes)
   add('public-media-length-drift','error',null,
    'Public static asset Content-Length differs from the official hashed file size.',{assetId:a.id});
  assets.push({assetId:a.id,checked:true,status:actual.status,matched,
   contentLengthMatches:actual.contentLength===undefined?null:actual.contentLength===releaseAsset.bytes});
 }
 const blockers=findings.filter(x=>x.severity==='error').length;
 const out=Object.freeze({format:FORMAT,siteId:site.siteId,
  claimedPublicOrigin:http.origin,officialPublicOrigin:claim,comparisonScope:'root-static-https',
  comparable:true,verifiedStaticManifestSha256:release.manifestSha256||null,
  verifiedStaticPublishedVersion:release.publishedVersion,
  checkedPages:pages.length,checkedMedia:assets.filter(x=>x.checked).length,
  checkedSearchFiles:auxiliary.filter(x=>x.checked).length,
  checkedRedirects:Math.min(redirects.length,release.redirects.size),
  pages:Object.freeze(pages),assets:Object.freeze(assets),
  auxiliary:Object.freeze(auxiliary),findings:Object.freeze(findings),
  allComparedSurfacesMatched:blockers===0&&Boolean(media)&&
   assets.length===(site.assets||[]).length&&assets.every(x=>x.checked&&x.matched),
  httpTranscriptAuthenticated:false,actualHostRequestsByThisReview:0,
  publicSiteApproval:false,
  limitations:'Public HTTP evidence is locally supplied and unauthenticated. Agreement does not prove production identity, DNS/TLS, user approval, actual browser design, POST or mail delivery; HEAD does not verify media bytes.'});
 accepted.add(out);return out;
}
function review(site,release,http,media=null){
 if(!STATIC.isVerified?.(release))throw Error('Only directly verified official static export can be compared to public HTTP');
 return compare(site,release,http,media);
}
function isVerified(o){return accepted.has(o);}
module.exports=Object.freeze({FORMAT,review,compare,isVerified});
