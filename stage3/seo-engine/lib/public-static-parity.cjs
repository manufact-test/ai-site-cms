'use strict';
// Review explicitly supplied PUBLIC HTTP evidence against an official,
// SHA-checked static publisher release. Do not call network or authenticate
// the HTTP transcript. This answers "what is served?" only if operator
// corroborates the original network collection.
const STATIC=require('./php-local-static-export.cjs');
const BYTES=require('./public-media-byte-verification.cjs');
const crypto=require('node:crypto');
const HEAD=require('./public-static-head.cjs');
const CSP=require('./public-static-csp.cjs');
const SENSITIVE=require('./public-static-sensitive-markup.cjs');
const DELIVERY=require('./delivery-evidence.cjs');
const MEDIA=require('./media-delivery.cjs');
const {inspect}=require('./html-evidence.cjs');
const FORMAT='manufact-seo-public-static-deployment-parity-v1';
const accepted=new WeakSet();
const norm=x=>String(x??'').replace(/\s+/g,' ').trim().normalize('NFKC');
const SHA=/^[a-f0-9]{64}$/;
const HTTPS=u=>u.protocol==='https:'&&!u.username&&!u.password&&!u.hash;
function compare(site,release,http,media=null,byteReport=null){
 if(!site||!Array.isArray(site.pages)||!release||
    release.siteId!==site.siteId||!release.sha256VerifiedAtRead||
    !http||http.siteId!==site.siteId||!Array.isArray(http.pages)||
    media&&media.siteId!==site.siteId||
    byteReport&&(!BYTES.isVerified(byteReport)||byteReport.siteId!==site.siteId||
     byteReport.officialStaticManifestSha256!==release.manifestSha256||
     byteReport.publishedVersion!==release.publishedVersion))
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
  const unscoped=Object.freeze({format:FORMAT,siteId:site.siteId,
   claimedPublicOrigin:http.origin,officialPublicOrigin:claim||null,
   comparisonScope:reason,comparable:false,checkedPages:0,checkedMedia:0,
   checkedSearchFiles:0,checkedRedirects:0,pages:[],assets:[],auxiliary:[],findings,
   allComparedSurfacesMatched:false,httpTranscriptAuthenticated:false,
   actualHostRequestsByThisReview:0,publicSiteApproval:false});
  accepted.add(unscoped);return unscoped;
 }
 const publicMarker=http.publicReleaseMarker||null;
 const markerMatched=Boolean(publicMarker?.valid&&
  publicMarker.officialManifestSha256===release.manifestSha256&&
  publicMarker.publishedVersion===release.publishedVersion);
 if(!publicMarker||publicMarker.status===404)
  add('public-release-marker-missing','warning',null,
   'Public host does not expose the non-secret CMS release fingerprint; deployment version remains uncorrelated.');
 else if(!markerMatched)
  add('public-release-marker-mismatch','error',null,
   'Public host fingerprint is missing, malformed or differs from owner-approved official static manifest SHA256/version.');
 const rootWindow=http.rootRecheck;
 if(!rootWindow)add('public-root-not-rechecked','warning',null,
  'No final root HTML/status SHA256 recheck was supplied after public page/media capture; deployment consistency is unverified.');
 else if(!rootWindow.matched)add('public-root-window-drift','error',null,
  'Public static homepage changed during page/media evidence collection; discard this mixed release evidence.');
 const operatorArtifacts=http.securityProbes||null;
 if(!operatorArtifacts)add('operator-file-probes-not-captured','warning',null,
  'No public HTTP observations were supplied for private release-manifest/operator files; exposure is unverified.');
 else for(const item of operatorArtifacts){
  if(item.status===200)add('operator-file-publicly-served','error',null,
   'Static hosting is publicly serving a file intended only for owner/operator use; exclude release manifests and private reports.',
   {field:'internalPublicFile.status',href:item.path});
  if(item.status>=300&&item.status<400)
   add('operator-file-redirect','warning',null,
    'A private operator file path unexpectedly redirects; confirm no sensitive files are served.',
    {href:item.path});
 }
 const negative=http.negativeProbe;
 if(!negative)add('negative-route-not-captured','warning',null,
  'Public HTTPS transcript does not include the safe nonexistent-route probe; soft-404 behavior is unverified.');
 else if(![404,410].includes(negative.status))
  add('soft-404-public-host','error',null,
   'Public root static host must return HTTP 404 or 410 for unknown page paths; a 200/301 home fallback creates a soft-404 SEO defect.',
   {field:'negativeRoute.status',observedStatus:negative.status});
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
   const headers=supplied.headers||{};
   const type=String(headers['content-type']||'').split(';')[0].trim().toLowerCase();
   if(supplied.status===200&&type!=='text/html')
    mismatch('public-html-content-type','Public static page is not served as text/html.','headers.content-type');
   const xRobots=String(headers['x-robots-tag']||'').toLowerCase();
   if((page.seo?.robots||'index')==='index'&&/(^|[\s,])noindex([\s,]|$)/.test(xRobots))
    mismatch('public-x-robots-noindex','Host headers block indexation of an indexable static page.','headers.x-robots-tag');
   if(supplied.requestUrl!==expectedUrl||supplied.responseUrl!==expectedUrl)
    mismatch('page-response-url','Public page URL differs from root-mounted official static route.','url');
   if(typeof supplied.html!=='string'||!supplied.html.trim())
    mismatch('page-html-missing','Public page HTTP transcript lacks a complete HTML body.','html');
   else{
    const live=supplied.html,staticHtml=official.html;
    const sensitive=SENSITIVE.review(staticHtml,live);
    for(const kind of sensitive.changedCategories)
     mismatch('page-sensitive-markup-drift',
      'Publicly deployed HTML altered a form submission action, release token marker, external resource loader, link security policy or image loading behavior.',
      'security.'+kind);
    const csp=CSP.review(site.siteId,page,live,headers,expectedOrigin);
    findings.push(...csp.findings);
    if(csp.findings.some(x=>x.severity==='error'))issues.push('headers.content-security-policy');
    try{
     const deep=HEAD.review(staticHtml,live);
     for(const field of deep.changedHeadFields)
      mismatch('page-deep-head-drift',
       'Public static SEO head data differs in values or structure (OG, Twitter, alternate, canonical or JSON-LD).',
       'head.'+field);
    }catch{
     mismatch('page-head-unparseable',
      'Public or official static HTML head cannot be safely parsed.','head.parse');
    }
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
   publicHtmlSha256:typeof supplied?.html==='string'?
    crypto.createHash('sha256').update(supplied.html,'utf8').digest('hex'):null,
   publicEtag:supplied?.headers?.etag??null,
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
   // Verified static export and public capture both contain strict UTF-8
   // search metadata. Do not normalize whitespace: robots and sitemap are
   // protocol files, and silent rewrites can change crawl meaning.
   match=response.status===200&&response.url===target&&
    response.body===body;
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
 const binaryById=new Map((byteReport?.resources||[]).map(x=>[x.assetId,x]));
 for(const a of site.assets||[]){
  const releaseAsset=release.assets.get(a.id),actual=assetById.get(a.id);
  const observedGet=binaryById.get(a.id);
  const getMatched=Boolean(observedGet&&observedGet.status===200&&
   observedGet.sha256Matched&&observedGet.bytesMatched&&observedGet.mimeMatched);
  if(!releaseAsset)throw Error('Verified static release media inventory incomplete');
  if(!media){
   assets.push({assetId:a.id,checked:getMatched,matched:getMatched,
    method:getMatched?'public-get-sha256':'no-public-media-evidence'});
   continue;
  }
  if(!actual){
   if(!getMatched)add('public-media-missing','warning',null,
    'Public media HEAD was not captured and no verified SHA256 GET covers the original asset.',
    {assetId:a.id});
   assets.push({assetId:a.id,checked:getMatched,matched:getMatched,
    method:getMatched?'public-get-sha256':'missing-public-head'});continue;
  }
  const expectedUrl=expectedOrigin+a.src,contentType=actual.contentType.split(';')[0].trim().toLowerCase();
  const matched=actual.status===200&&actual.url===expectedUrl&&contentType===a.mime.toLowerCase();
  if(!matched)add('public-media-head-drift',getMatched?'warning':'error',null,
   'Public static asset URL/status/MIME differs from the official published asset.',{assetId:a.id});
  if(actual.contentLength!==undefined&&actual.contentLength!==releaseAsset.bytes)
   add('public-media-length-drift',getMatched?'warning':'error',null,
    'Public static asset Content-Length differs from the official hashed file size.',{assetId:a.id});
  assets.push({assetId:a.id,checked:true,status:actual.status,matched:matched||getMatched,
   method:getMatched?'public-get-sha256':'public-head',
   contentLengthMatches:actual.contentLength===undefined?null:actual.contentLength===releaseAsset.bytes});
 }
 if(!media&&assets.some(x=>!x.checked))
  add('public-media-coverage-incomplete','warning',null,
   'Public static asset delivery is not completely observed: provide media HEAD or complete original/variant SHA256 GET receipts.');
 const responsiveVariants=(site.assets||[]).reduce((n,a)=>n+(a.variants||[]).length,0);
 const checkedResponsiveVariants=(site.assets||[]).flatMap(a=>a.variants||[])
  .filter(v=>{const x=binaryById.get(v.id);return x&&x.status===200&&
   x.sha256Matched&&x.bytesMatched&&x.mimeMatched}).length;
 if(responsiveVariants>0&&checkedResponsiveVariants<responsiveVariants)
  add('responsive-variant-byte-coverage-incomplete','warning',null,
   'Public responsive image variants are not all covered by real SHA256 GET; original-image HEAD is insufficient to prove srcset assets.');
 const blockers=findings.filter(x=>x.severity==='error').length;
 const out=Object.freeze({format:FORMAT,siteId:site.siteId,
  claimedPublicOrigin:http.origin,officialPublicOrigin:claim,comparisonScope:'root-static-https',
  comparable:true,verifiedStaticManifestSha256:release.manifestSha256||null,
  verifiedStaticPublishedVersion:release.publishedVersion,
  checkedPages:pages.length,checkedMedia:assets.filter(x=>x.checked).length,
  declaredResponsiveVariants:responsiveVariants,
  sha256VerifiedResponsiveVariants:checkedResponsiveVariants,
  checkedSearchFiles:auxiliary.filter(x=>x.checked).length,
  checkedRedirects:Math.min(redirects.length,release.redirects.size),
  negativeRouteStatus:negative?.status??null,negativeRouteProbed:Boolean(negative),
  publicRootWindowRechecked:Boolean(rootWindow),
  publicRootWindowStable:rootWindow?.matched??null,
  publicReleaseMarkerObserved:Boolean(publicMarker),
  publicReleaseMarkerMatched:markerMatched,
  internalArtifactProbes:operatorArtifacts?.length??0,
  internalArtifactPublicHttp200:operatorArtifacts?.filter(x=>x.status===200).length??null,
  pages:Object.freeze(pages),assets:Object.freeze(assets),
  auxiliary:Object.freeze(auxiliary),findings:Object.freeze(findings),
  allComparedSurfacesMatched:blockers===0&&markerMatched&&Boolean(operatorArtifacts)&&
   operatorArtifacts.every(x=>x.status!==200)&&rootWindow?.matched===true&&Boolean(negative)&&
   [404,410].includes(negative.status)&&
   assets.length===(site.assets||[]).length&&assets.every(x=>x.checked&&x.matched)&&
   checkedResponsiveVariants===responsiveVariants,
  httpTranscriptAuthenticated:false,actualHostRequestsByThisReview:0,
  publicSiteApproval:false,
  limitations:'Public HTTP evidence is locally supplied and unauthenticated. Agreement does not prove production identity, DNS/TLS, user approval, actual browser design, POST or mail delivery; HEAD does not verify media bytes.'});
 accepted.add(out);return out;
}
function review(site,release,http,media=null,byteReport=null){
 if(!STATIC.isVerified?.(release))throw Error('Only directly verified official static export can be compared to public HTTP');
 return compare(site,release,http,media,byteReport);
}
function isVerified(o){return accepted.has(o);}
module.exports=Object.freeze({FORMAT,review,compare,isVerified});
