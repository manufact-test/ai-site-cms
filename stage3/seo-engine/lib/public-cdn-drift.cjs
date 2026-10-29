'use strict';
// Diff two bounded, operator-provided public HTTPS observations without ever
// storing HTML, cookies, HMAC form values or SEO page source in the report.
// This is drift detection, not an authenticated production monitoring agent.
const crypto=require('node:crypto'),DELIVERY=require('./delivery-evidence.cjs');
const FORMAT='manufact-seo-public-cdn-drift-v1';
const digest=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
function compare(previous,current){
 DELIVERY.assertEvidence(previous);DELIVERY.assertEvidence(current);
 if(previous.siteId!==current.siteId||previous.origin!==current.origin)
  throw Error('CDN drift comparison requires the same exact HTTPS origin/mount and CMS siteId');
 const a=previous.publicReleaseMarker,b=current.publicReleaseMarker;
 const comparable=Boolean(a?.valid&&b?.valid&&
  a.officialManifestSha256===b.officialManifestSha256&&
  a.publishedVersion===b.publishedVersion);
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
module.exports=Object.freeze({FORMAT,compare});
