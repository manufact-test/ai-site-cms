'use strict';
// Diff two bounded, operator-provided public HTTPS observations without ever
// storing HTML, cookies, HMAC form values or SEO page source in the report.
// This is drift detection, not an authenticated production monitoring agent.
const crypto=require('node:crypto'),DELIVERY=require('./delivery-evidence.cjs');
const FORMAT='manufact-seo-public-cdn-drift-v1';
const digest=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
function mediaIndex(e,marker,siteId,origin){
 if(!e||e.format!=='manufact-seo-public-static-media-bytes-v1'||
    e.siteId!==siteId||e.origin!==origin||!marker?.valid||
    e.officialStaticManifestSha256!==marker.officialManifestSha256||
    e.publishedVersion!==marker.publishedVersion||
    !Array.isArray(e.resources)||e.resources.length>1200||
    !Number.isSafeInteger(e.totalReceivedBytes)||e.totalReceivedBytes<0||
    e.totalReceivedBytes>180000000||e.bytesStoredInEvidence!==false||
    e.postsPerformed!==false||e.redirectsFollowed!==false)
  throw Error('Public media digest transcript is not tied to the observed official release');
 const map=new Map();let total=0;
 for(const a of e.resources){
  if(!a||typeof a.assetId!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(a.assetId)||
     map.has(a.assetId)||!/^\/assets\/[a-z][a-z0-9-]{2,79}\.(?:png|jpg|webp|mp4)$/.test(a.path)||
     a.url!==origin.slice(0,-1)+a.path||!/^[a-f0-9]{64}$/.test(a.sha256||'')||
     !/^[a-f0-9]{64}$/.test(a.expectedSha256||'')||
     !Number.isInteger(a.status)||a.status<100||a.status>599||
     !Number.isSafeInteger(a.bytes)||a.bytes<0||a.bytes>12000000||
     typeof a.mime!=='string'||a.mime.length>150||
     a.hashMatched!==(a.status===200&&a.sha256===a.expectedSha256)||
     typeof a.lengthMatched!=='boolean'||typeof a.mimeMatched!=='boolean')
   throw Error('Unsafe, duplicate or inconsistent observed media digest entry');
  total+=a.bytes;map.set(a.assetId,a);
 }
 if(total!==e.totalReceivedBytes)
  throw Error('Observed media digest receipt has an inconsistent byte count');
 return map;
}
function compare(previous,current,previousMedia=null,currentMedia=null){
 DELIVERY.assertEvidence(previous);DELIVERY.assertEvidence(current);
 if(previous.siteId!==current.siteId||previous.origin!==current.origin)
  throw Error('CDN drift comparison requires the same exact HTTPS origin/mount and CMS siteId');
 const a=previous.publicReleaseMarker,b=current.publicReleaseMarker;
 const comparable=Boolean(a?.valid&&b?.valid&&
  a.officialManifestSha256===b.officialManifestSha256&&
  a.publishedVersion===b.publishedVersion);
 if(Boolean(previousMedia)!==Boolean(currentMedia))
  throw Error('CDN media comparison requires BOTH previous and current public SHA256 GET receipts');
 const oldMedia=previousMedia?mediaIndex(previousMedia,a,previous.siteId,previous.origin):null;
 const newMedia=currentMedia?mediaIndex(currentMedia,b,current.siteId,current.origin):null;
 const issues=[],review=[],add=(list,code,route,message)=>list.push(Object.freeze({
  code:'public-cdn:'+code,path:route,message,
  source:'operator-supplied-public-https-transcripts',
  authenticatedPublicHost:false,automatic:false}));
 if(!a?.valid||!b?.valid)add(review,'release-marker-incomplete',null,
  'One HTTPS capture lacks a valid public static release fingerprint; source identity cannot be compared across snapshots.');
 else if(!comparable)add(review,'release-changed',null,
  'Public site advertises a different official release SHA256 or published version; use the new release acceptance workflow before treating differences as defects.');
 const left=new Map(previous.pages.map(p=>[p.path,p])),
  right=new Map(current.pages.map(p=>[p.path,p]));
 if(comparable){
  for(const [route,p] of left){
   const q=right.get(route);
   if(!q){
    add(issues,'previous-page-not-captured',route,
     'A previously captured published page was omitted by the newer public HTTPS acquisition.');
    continue;
   }
   if(p.status!==q.status)add(issues,'page-status-drift',route,
    'The HTTP status of a published page changed under an unchanged official release fingerprint.');
   if(digest(p.html)!==digest(q.html))add(issues,'page-html-sha256-drift',route,
    'The actual HTML content SHA256 changed while the public release marker remained identical.');
   const oldEtag=p.headers?.etag??null,newEtag=q.headers?.etag??null;
   if(oldEtag&&newEtag&&oldEtag===newEtag&&digest(p.html)!==digest(q.html))
    add(issues,'same-etag-different-html',route,
     'The CDN returned different HTML bytes behind an unchanged ETag; check edge/cache invalidation.');
  }
  for(const [route] of right)if(!left.has(route))
   add(issues,'unexpected-new-page',route,
    'New public page appeared under an unchanged official manifest fingerprint.');
  const beforeRedirects=new Map((previous.redirects||[]).map(r=>[r.from,r]));
  const afterRedirects=new Map((current.redirects||[]).map(r=>[r.from,r]));
  for(const [route,old] of beforeRedirects){
   const next=afterRedirects.get(route);
   if(!next||next.status!==old.status||next.location!==old.location)
    add(issues,'historic-301-drift',route,
     'Previously observed historic 301 status or Location changed without a new official release.');
  }
  for(const [route] of afterRedirects)if(!beforeRedirects.has(route))
   add(issues,'unexpected-new-301',route,
    'Public redirect appeared without a corresponding new official release.');
  if(oldMedia&&newMedia){
   for(const [assetId,p] of oldMedia){
    const q=newMedia.get(assetId);
    if(!q)add(issues,'media-variant-no-longer-captured',p.path,
      'A previously verified public media asset/variant disappeared from new HTTPS digest evidence.');
    else if(p.sha256!==q.sha256||p.status!==q.status||
      p.bytes!==q.bytes||p.mime!==q.mime||q.expectedSha256!==p.expectedSha256)
     add(issues,'media-bytes-or-cache-drift',p.path,
      'Public media SHA256/status/MIME/length changed despite an unchanged official release fingerprint.');
   }
   for(const [assetId,q]of newMedia)if(!oldMedia.has(assetId))
    add(issues,'unexpected-new-media-variant',q.path,
      'An unrecognized public media variant appeared without an official release change.');
  }
  for(const key of ['robots','sitemap']){
   const old=previous[key],next=current[key];
   if(!old||!next||old.status!==next.status||digest(old.body)!==digest(next.body))
    add(issues,key+'-drift','/'+(key==='robots'?'robots.txt':'sitemap.xml'),
     'Crawl metadata body/status changed despite unchanged official published static fingerprint.');
  }
 }
 if(!current.rootRecheck?.matched)add(issues,'public-root-window-not-stable','/',
  'Current HTTPS evidence lacks a successful first/last homepage SHA256 stability check.');
 if(![404,410].includes(current.negativeProbe?.status))
  add(issues,'public-soft-404','/cms-seo-nonexistent-'+current.siteId+'/',
   'Current public host does not return HTTP 404/410 for a nonexistent route.');
 if(!Array.isArray(current.securityProbes)||current.securityProbes.length!==4)
  add(issues,'private-operator-probes-incomplete',null,
   'Current transcript did not inspect all four fixed internal operator-file URLs.');
 else for(const p of current.securityProbes){
  if(p.status>=200&&p.status<300)
   add(issues,'private-operator-file-exposed',p.path,
    'An operator-only file URL returned a 2xx response on the public site.');
 }
 if(!b?.valid)add(issues,'public-marker-missing-or-invalid','/ai-site-release.json',
  'Current public release fingerprint is not a valid source-bound digest and version marker.');
 if(current.capturedAt&&previous.capturedAt&&
    Date.parse(current.capturedAt)<=Date.parse(previous.capturedAt))
  add(review,'capture-order-not-monotonic',null,
   'Newer capture timestamp did not advance; do not interpret unchanged output as a fresh production observation.');
 return Object.freeze({format:FORMAT,siteId:current.siteId,origin:current.origin,
  previousCapturedAt:previous.capturedAt??null,currentCapturedAt:current.capturedAt??null,
  previousManifestSha256:a?.valid?a.officialManifestSha256:null,
  currentManifestSha256:b?.valid?b.officialManifestSha256:null,
  previousPublishedVersion:a?.valid?a.publishedVersion:null,
  currentPublishedVersion:b?.valid?b.publishedVersion:null,
  sameOfficialReleaseComparable:comparable,
  publiclyObservedPagesPrevious:previous.pages.length,
  publiclyObservedPagesCurrent:current.pages.length,
  publicMediaDigestSnapshotsCompared:Boolean(oldMedia&&newMedia)&&comparable,
  oldPublicMediaResources:oldMedia?.size??null,
  newPublicMediaResources:newMedia?.size??null,
  newProblems:Object.freeze(issues),manualReviews:Object.freeze(review),
  criticalDriftCount:issues.length,reviewCount:review.length,
  verdict:issues.length?'INVESTIGATE-DRIFT':
   comparable?'NO-DRIFT-DETECTED-MANUAL-VERIFICATION':
    'INCOMPARABLE-PUBLIC-RELEASES',
  rawHtmlReturned:false,formHmacReturned:false,privateOwnerDataReturned:false,
  liveHostIdentityAuthenticated:false,networkRequestsMadeByThisComparison:0,
  clientApprovalVerified:false,automaticReleaseDecision:false,
  limitations:'Only compares saved operator-provided HTTP captures. A saved transcript cannot independently prove live production state, TLS identity, active CMS source revision or user consent.'});
}
module.exports=Object.freeze({FORMAT,mediaIndex,compare});
