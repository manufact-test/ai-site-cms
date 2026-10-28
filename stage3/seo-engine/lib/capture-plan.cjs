'use strict';
// Evidence collection manifest for the LEAD on the first real site.
// Never fetch, invent HTTP statuses, claim visual approval, or produce a second editor.
const {checkBlueprint}=require('./blueprint.cjs');
const FORMAT='manufact-seo-capture-plan-v1';
function originUrl(origin,route){
 if(!origin)return null;
 const u=new URL(origin);
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||
  !u.pathname.endsWith('/')||u.hostname==='snapshot.invalid')
  throw Error('Capture plan requires approved HTTPS public origin ending in /');
 const url=new URL(u.pathname+route.replace(/^\//,''),u.origin);
 if(url.origin!==u.origin)throw Error('Unsafe capture route');
 return url.href;
}
function build(site,blueprint,publicOrigin=null){
 const plan=checkBlueprint(blueprint);
 if(!site||!Array.isArray(site.pages)||!Array.isArray(site.assets)||
  site.siteId!==plan.siteId)throw Error('Capture plan requires matching Site v1 and approved blueprint');
 if(publicOrigin!==null&&(typeof publicOrigin!=='string'||!publicOrigin.trim()))
  throw Error('Invalid capture origin');
 const active=site.pages.map(p=>{
  const expected=plan.pages.find(x=>x.id===p.id);
  return {pageId:p.id,route:p.path,publicUrl:originUrl(publicOrigin,p.path),
   intendedIndexation:p.seo?.robots||'index',blueprintRouteMatches:expected?p.path===expected.path:false,
   capture:{
    http:['requested-absolute-url','final-response-url','status','response-headers','complete-HTML-head','canonical','X-Robots-Tag'],
    html:['title','description','robots','open-graph','primary-headings','internal-links','landmarks','forms','json-ld'],
    devices:['desktop','tablet','mobile'],
    deviceMarkupMethod:'rendered-dom-preferred',
    screenshots:'approved static prototype side-by-side with real browser screenshots, by the lead',
    interactions:'real CTA click, form submission, keyboard/focus and mobile controls',
    pagePerformance:'real browser/lab or field measurement after deployment'
   },evidenceState:'not-collected-by-toolkit',automaticPass:false};
 });
 const known=new Set(site.assets.map(a=>a.id));
 const media=site.assets.map(a=>({assetId:a.id,source:a.src,url:originUrl(publicOrigin,a.src),
  mime:a.mime,ogReferencedBy:site.pages.filter(p=>p.seo?.ogImage===a.id).map(p=>p.id),
  expectedBytes:null,verifiedMime:null,verifiedStatus:null,
  capture:['final-response-url','http-status','content-type','content-length','intrinsic-dimensions-if-known'],
  needManualAltReview:true}));
 const missingOg=site.pages.filter(p=>p.seo?.ogImage&&!known.has(p.seo.ogImage))
  .map(p=>({pageId:p.id,ogImage:p.seo.ogImage}));
 const absent=plan.pages.filter(p=>!site.pages.some(x=>x.id===p.id))
  .map(p=>({pageId:p.id,path:p.path}));
 const host=publicOrigin?new URL(publicOrigin).origin:null;
 return {format:FORMAT,version:1,siteId:site.siteId,readOnly:true,
  publicOrigin:publicOrigin??null,originReviewedByLead:false,
  summary:{plannedPages:plan.pages.length,sitePages:site.pages.length,
   pagesToCapture:active.length,missingPlannedPages:absent.length,
   assetsToCapture:media.length,referencedOgAssets:media.filter(a=>a.ogReferencedBy.length).length,
   httpResponsesActuallyCaptured:0,visualApprovalsActuallyCompleted:0},
  pages:active,missingPlannedPages:absent,media,invalidOgReferences:missingOg,
  resources:[
   {kind:'robots',route:'/robots.txt',candidateUrl:host?host+'/robots.txt':null,
    expectedStatus:'200 only if deployed publisher exposes it',
    details:'Capture actual host-level robots resource, crawler directives, content type and sitemap references'},
   {kind:'sitemap',route:'/sitemap.xml',
    candidateUrl:originUrl(publicOrigin,'/sitemap.xml'),
    expectedStatus:'200 only if deployed publisher exposes it',
    details:'Capture complete direct URL set or all child sitemaps, not only a sitemap index'}
  ],
  finalAcceptance:['Approved original three static prototype images, revision and client signoff',
   'Actual Page v1 validation and mapping to blueprint stable page and section IDs',
   'Real public-origin HTTPS, canonical, response headers, robots and full sitemap',
   'Real desktop/tablet/mobile screenshots and manual content/interaction comparison',
   'Real form delivery, privacy/legal/security/keyboard tests and rollback',
   'Owner confirmation of claims and any published structured data',
   'CMS saved overrides, Save/Publish separation and authorized release process'],
  nextInputs:['manufact-seo-delivery-evidence-v1','manufact-seo-html-snapshot-v1',
   'manufact-seo-viewport-evidence-v1','manufact-seo-media-evidence-v1'],
  limitations:'Pure request manifest for the lead, not a crawler, screenshot generator or verified recording. All public URLs require the approved project origin; no site publishing, CMS edits or release approval.'};
}
module.exports=Object.freeze({FORMAT,build,originUrl});
