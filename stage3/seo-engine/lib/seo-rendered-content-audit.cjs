'use strict';
/* Source-bound server HTML vs operator-provided rendered DOM SEO reconciliation.
 * Only diagnostic evidence: no browser, Google, accessibility or release claims.
 */
const BP=require('./blueprint.cjs');
const HTTP=require('./delivery-evidence.cjs');
const HTML=require('./html-evidence.cjs');
const PARITY=require('./parity.cjs');
const CHROME=require('./seo-rendered-capture.cjs');
const VIS=require('./seo-browser-css-visibility.cjs');
const MEDIA=require('./seo-browser-image-observation.cjs');
const RESPONSIVE=require('./seo-browser-responsive-observation.cjs');
const SCHEMA=require('./seo-structured-data-audit.cjs');
const LINKS=require('./seo-rendered-link-semantics.cjs');
const TIMING=require('./seo-browser-timing-observation.cjs');
const FRAGMENTS=require('./seo-rendered-fragment-audit.cjs');
const TEXT=require('./seo-browser-text-footprint.cjs');
const crypto=require('node:crypto');
const FORMAT='manufact-seo-rendered-content-audit-v1';
const DEVICES=['desktop','tablet','mobile'];
const HASH=/^[a-f0-9]{64}$/;
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const LEVEL={P0:0,P1:1,P2:2};
const assert=(value,message)=>{if(!value)throw Error('Rendered SEO source: '+message);};
const normalize=value=>String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const unique=x=>[...new Set(x)];
const routeUrl=(base,route)=>new URL(route.slice(1),base).href;
function canonical(raw,served){
 try{
  const u=new URL(raw,served);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return null;
  return u.href;
 }catch{return null;}
}
function head(doc,served){
 const parsed=HTML.inspect(doc);
 const canonicals=parsed.canonicals.map(x=>canonical(x,served));
 const tokens=unique(parsed.robots.flatMap(x=>x.toLowerCase().split(/[\s,]+/).filter(Boolean)));
 return {parsed,meta:PARITY.readHead(doc),canonicals,robotsNoindex:tokens.includes('noindex'),
  robotsIndex:tokens.includes('index'),robotsTokens:tokens};
}
function routes(parsed,served,base,knownPaths){
 let current=served;
 if(parsed.baseHref){
  try{
   const u=new URL(parsed.baseHref,served);
   if(u.origin===new URL(base).origin&&u.pathname.startsWith(new URL(base).pathname))
    current=u.href;
  }catch{}
 }
 const found=new Set();
 for(const anchor of parsed.anchors){
  const raw=anchor.attrs.href||'';
  if(!raw||raw.startsWith('#')||raw.startsWith('?')||raw.startsWith('//')||raw.length>2048)continue;
  let u;
  try{u=new URL(raw,current)}catch{continue}
  if(u.origin!==new URL(base).origin||u.search||!u.pathname.startsWith(new URL(base).pathname))continue;
  const path='/'+u.pathname.slice(new URL(base).pathname.length);
  if(knownPaths.has(path))found.add(path);
 }
 return found;
}
function analyze({blueprint,blueprintRawSha256,site,siteRawSha256,
 capture,captureRawSha256,viewports,viewportsRawSha256,expectedBase=null}={}){
 const plan=BP.checkBlueprint(blueprint);
 for(const [label,hash] of Object.entries({blueprintRawSha256,siteRawSha256,
  captureRawSha256,viewportsRawSha256}))assert(HASH.test(hash||''),'missing original '+label);
 assert(site?.format==='manufact-ai-site-v1'&&site.schemaVersion===1&&
  site.siteId===plan.siteId&&Array.isArray(site.pages)&&site.pages.length===plan.pages.length,
  'current Site v1 and approved Blueprint page inventory required');
 const byPage=new Map(plan.pages.map(p=>[p.id,p])),seenSite=new Set();
 for(const page of site.pages){
  assert(page&&byPage.get(page.id)?.path===page.path&&!seenSite.has(page.id),
   'current Site v1 page IDs/routes differ from approved Blueprint');
  seenSite.add(page.id);
 }
 assert(capture?.format===HTTP.FORMAT&&capture.siteId===plan.siteId,
  'current same-site public HTTP source required');
 const origin=HTTP.assertEvidence(capture).href;
 assert(capture.origin===origin,'normalized HTTPS origin/mount required');
 if(expectedBase!==null)assert(origin===expectedBase,'approved HTTPS mount differs from source');
 const version2=viewports?.format===CHROME.FORMAT;
 if(version2){
  CHROME.assertV2(viewports,captureRawSha256);
  assert(viewports.origin===origin&&viewports.siteId===plan.siteId,
   'rendered capture v2 mount or client ID differs from original HTTPS capture');
 }else assert(viewports?.format==='manufact-seo-viewport-evidence-v1'&&
  viewports.siteId===plan.siteId&&Array.isArray(viewports.pages)&&
  viewports.pages.length<=80,'same-site original viewport capture required');
 const byHttp=new Map(),byView=new Map(),allPaths=new Set(plan.pages.map(p=>p.path));
 for(const p of capture.pages){
  assert(byPage.get(p.id)?.path===p.path&&!byHttp.has(p.id),
   'public HTTP page not in approved Blueprint or duplicate');
  byHttp.set(p.id,p);
 }
 for(const p of viewports.pages){
  assert(p&&byPage.get(p.id)?.path===p.path&&!byView.has(p.id)&&
   p.captures&&typeof p.captures==='object'&&!Array.isArray(p.captures)&&
   Object.keys(p.captures).every(k=>DEVICES.includes(k)),
   'viewport page identity or capture shape invalid');
  byView.set(p.id,p);
  for(const name of DEVICES){
   const v=p.captures[name];
   assert(v&&['static-html','rendered-dom'].includes(v.method)&&
    typeof v.html==='string'&&v.html.length<=250000,
    'three bounded viewport methods and HTML required for supplied page');
  }
 }
 const findings=[],pages=[],ids=new Set();
 function issue(p,device,code,priority,detail,extra={}){
  const id=[p.id,device||'server',code,extra.sectionId||extra.toPageId||''].join(':');
  if(ids.has(id)||findings.length>=700)return;
  ids.add(id);
  findings.push({id:'rendered:'+id,code:'rendered:'+code,priority,pageId:p.id,
   path:p.path,device:device||null,detail,manualOnly:true,automaticFix:false,...extra});
 }
 for(const p of plan.pages){
  const source=byHttp.get(p.id),views=byView.get(p.id),expected=routeUrl(origin,p.path);
  const approvedCanonical=routeUrl(origin,p.seo.canonicalPath);
  const httpOk=Boolean(source&&source.status>=200&&source.status<300&&
   source.requestUrl===expected&&source.responseUrl===expected&&
   typeof source.html==='string'&&source.html.length>0&&
   /<head\b/i.test(source.html)&&capture.rootRecheck?.matched!==false);
  let server=null;
  if(httpOk){
   server=head(source.html,expected);
   if(server.meta.status!=='parsed-head')issue(p,null,'server-head-incomplete','P1',
    'HTTP source head was not completely parseable; title and description parity are unknown.');
   if(server.canonicals.length!==1)
    issue(p,null,'server-canonical-count','P1',
     'Exactly one canonical declaration is expected in the supplied HTTP HTML.');
   else if(server.canonicals[0]!==approvedCanonical)
    issue(p,null,'server-canonical-drift','P0',
     'HTTP HTML canonical does not match approved Blueprint canonical.');
   if(p.seo.robots==='index'&&server.robotsNoindex)
    issue(p,null,'server-unexpected-noindex','P0',
     'HTTP HTML noindex conflicts with approved indexable Blueprint page.');
   if(p.seo.robots==='noindex'&&!server.robotsNoindex)
    issue(p,null,'server-missing-noindex','P0',
     'Approved noindex is not present in HTTP HTML meta robots; check response header separately.');
  }else issue(p,null,'http-source-unavailable','P1',
   'Matching 2xx HTML source is absent, inconsistent or affected by mixed-capture recheck; no server/render parity conclusion.');
  const report={pageId:p.id,path:p.path,httpInspected:Boolean(server),
   devices:{},expectedCanonical:approvedCanonical,requiredRenderedMethods:DEVICES,
   evidenceState:'UNVERIFIED'};
  const ctaPaths=new Set(p.sections.filter(s=>s.cta).map(s=>byPage.get(s.cta.toPageId).path));
  const desired=new Set([...p.links.map(l=>l.toPath),...ctaPaths]);
  const expectedH1=p.sections.find(s=>s.level===1);
  for(const device of DEVICES){
   const v=views?.captures[device],rendered=v?.method==='rendered-dom';
   if(version2&&server&&v&&(!v.matchesOriginalHttpBody||
    v.serverResponseSha256!==crypto.createHash('sha256').update(source?.html||'','utf8').digest('hex'))){
    report.devices[device]={inspected:false,method:v.method,reason:'browser-http-body-drift'};
    issue(p,device,'browser-http-body-drift','P1',
     'Original navigation HTML differs from saved public HTTPS source; this DOM must not be used for source-pair conclusions.');
    continue;
   }
   if(version2&&v&&!v.stableMarkup){
    report.devices[device]={inspected:false,method:v.method,reason:'rendered-dom-unsettled'};
    issue(p,device,'dom-not-settled','P1',
     'Browser DOM kept changing during bounded capture; obtain a new same-release snapshot.');
    continue;
   }
   if(!rendered||!server){
    report.devices[device]={inspected:false,method:v?.method||null,
     reason:!server?'http-source-unavailable':v?'not-rendered-dom':'viewport-missing'};
    if(server)issue(p,device,v?'not-rendered-dom':'viewport-missing','P2',
     'Rendered DOM evidence not supplied; static HTML cannot establish post-JavaScript SEO state.');
    continue;
   }
   if(version2&&v.pageErrors>0)issue(p,device,'browser-script-errors','P1',
    'Browser reported page JavaScript errors during rendered snapshot; inspect runtime logs separately.',
    {pageErrorCount:v.pageErrors});
   if(version2&&v.blockedRequests>0)issue(p,device,'blocked-browser-requests','P1',
    'Browser denied '+v.blockedRequests+' requests ('+
     CHROME.BLOCK_REASONS.filter(k=>v.blockedReasons[k]>0).map(
      k=>k+': '+v.blockedReasons[k]).join(', ')+'); rendering may be incomplete.',
    {blockedRequestCount:v.blockedRequests,blockedReasonCounts:v.blockedReasons});
   const current=head(v.html,expected),observedRoutes=routes(current.parsed,expected,origin,allPaths);
   const serverRoutes=routes(server.parsed,expected,origin,allPaths);
   let cssVisibilityStatus='not-supplied',cssHiddenH1=false,cssHiddenMain=false,
    cssHiddenCtaRoutes=0,cssCollapsedNavRoutes=0,cssHiddenSecondaryHeadings=0;
   if(version2&&v.visibility){
    const visual=v.visibility;
    if(visual.status==='unavailable'){
     cssVisibilityStatus='unavailable';
     issue(p,device,'css-sampling-unavailable','P1',
      'Computed CSS visibility unavailable ('+visual.reason+'); verify on a real device.');
    }else{
     VIS.assertObservation(visual,v.htmlSha256,desired);
     const parsedH1=current.parsed.headings.filter(x=>x.level===1).length;
     const parsedSecondary=current.parsed.headings.filter(x=>x.level>1).length;
     if(parsedH1!==visual.h1.total||parsedSecondary!==visual.secondaryHeadings.total){
      cssVisibilityStatus='unreconciled';
      issue(p,device,'css-dom-count-mismatch','P1',
       'CSS heading count differs from serialized DOM; visibility conclusions withheld.');
     }else{
      cssVisibilityStatus='observed';
      if(visual.h1.total>0&&visual.h1.layoutVisible===0){
       cssHiddenH1=true;
       issue(p,device,'css-h1-not-visible','P1',
        'Rendered H1 exists but has no CSS layout-visible box on this device.');
      }
      if(current.parsed.mainCount>0&&visual.main.total>0&&visual.main.layoutVisible===0){
       cssHiddenMain=true;
       issue(p,device,'css-main-not-visible','P1',
        'Primary main landmark exists but has no CSS layout-visible box.');
      }
      if(visual.h1.visiblyExcluded>0)issue(p,device,'css-visible-h1-aria-excluded','P2',
       'A visible H1 is aria-hidden/inert; manually inspect accessibility.');
      if(visual.main.visiblyExcluded>0)issue(p,device,'css-visible-main-aria-excluded','P2',
       'A visible main landmark is aria-hidden/inert; manually inspect accessibility.');
      cssHiddenSecondaryHeadings=visual.secondaryHeadings.total-
       visual.secondaryHeadings.layoutVisible;
      if(cssHiddenSecondaryHeadings>0)issue(p,device,
       visual.secondaryHeadings.layoutVisible===0?'css-all-section-headings-hidden':
        'css-some-section-headings-hidden',
       visual.secondaryHeadings.layoutVisible===0?'P1':'P2',
       cssHiddenSecondaryHeadings+' of '+visual.secondaryHeadings.total+
        ' H2–H6 headings are CSS-hidden on this device.');
      if(visual.secondaryHeadings.visiblyExcluded>0)
       issue(p,device,'css-visible-section-heading-aria-excluded','P2',
        'A visible secondary heading is aria-hidden/inert; manually inspect accessibility.');
      let excludedRoutes=0;
      for(const r of visual.routes){
       if(r.anchors>0&&r.layoutVisible===0){
        if(ctaPaths.has(r.path))cssHiddenCtaRoutes++;
        else cssCollapsedNavRoutes++;
       }
       if(r.visiblyExcluded>0)excludedRoutes++;
      }
      if(cssHiddenCtaRoutes>0)issue(p,device,'css-approved-cta-hidden','P1',
       cssHiddenCtaRoutes+' approved CTA destination(s) have only hidden anchors.',
       {affectedApprovedRouteCount:cssHiddenCtaRoutes});
      if(cssCollapsedNavRoutes>0)issue(p,device,'css-planned-navigation-collapsed','P2',
       cssCollapsedNavRoutes+' navigation route(s) are CSS-hidden by default; check menu expansion.',
       {affectedApprovedRouteCount:cssCollapsedNavRoutes});
      if(excludedRoutes>0)issue(p,device,'css-visible-route-aria-excluded','P2',
       excludedRoutes+' visible internal route(s) are aria-hidden/inert.',
       {affectedApprovedRouteCount:excludedRoutes});
     }
    }
   }
   let mediaStatus='not-supplied',mediaCounts=null;
   if(version2&&v.media){
    if(v.media.status==='unavailable'){
     mediaStatus='unavailable';
     issue(p,device,'image-state-unavailable','P2',
      'Browser image loading observation unavailable ('+v.media.reason+'); check manually.');
    }else{
     MEDIA.assertObservation(v.media,v.htmlSha256);
     mediaStatus='observed';
     mediaCounts=v.media.counts;
     if(mediaCounts.visibleFailed>0)issue(p,device,'visible-images-failed','P1',
      mediaCounts.visibleFailed+' CSS-visible image(s) completed with no decoded image width; inspect response and asset URLs.');
     if(mediaCounts.largeAboveFoldFailed>0)issue(p,device,'large-above-fold-image-failed','P1',
      mediaCounts.largeAboveFoldFailed+' large above-fold image candidate(s) failed to decode.');
     if(mediaCounts.aboveFoldLazy>0)issue(p,device,'above-fold-images-lazy','P2',
      mediaCounts.aboveFoldLazy+' above-fold image(s) use loading=lazy; verify first-viewport priority manually.');
     if(mediaCounts.visibleMissingAlt>0)issue(p,device,'visible-images-missing-alt','P2',
      mediaCounts.visibleMissingAlt+' visible image(s) lack an alt attribute; check decorative/content intent.');
     if(mediaCounts.visibleMissingDimensions>0)issue(p,device,'visible-images-missing-dimensions','P2',
      mediaCounts.visibleMissingDimensions+' visible image(s) lack width/height attributes; CSS aspect ratio may compensate.');
     if(mediaCounts.visibleUpscaled>0)issue(p,device,'visible-images-upscaled','P2',
      mediaCounts.visibleUpscaled+' visible image(s) are displayed over 1.5x their intrinsic CSS width.');
     if(mediaCounts.visiblePending>0)issue(p,device,'visible-images-pending','P2',
      mediaCounts.visiblePending+' visible image(s) were still pending at the snapshot.');
    }
   }
   let responsiveStatus='not-supplied',responsiveCounts=null;
   if(version2&&v.responsive){
    if(v.responsive.status==='unavailable'){
     responsiveStatus='unavailable';
     issue(p,device,'responsive-layout-unavailable','P2',
      'Responsive layout observation unavailable ('+v.responsive.reason+
       '); manual device inspection required.');
    }else{
     RESPONSIVE.assertObservation(v.responsive,v.htmlSha256);
     responsiveStatus='observed';
     responsiveCounts=v.responsive.counts;
     if(device!=='desktop'&&!responsiveCounts.viewportMetaPresent)
      issue(p,device,'viewport-meta-missing','P1',
       'Rendered page has no mobile viewport meta; device-width rendering requires manual verification.');
     if(device!=='desktop'&&responsiveCounts.viewportMetaFixedWidth)
      issue(p,device,'viewport-fixed-width','P1',
       'Viewport meta declares a fixed numeric CSS width; review responsive behavior.');
     if(device!=='desktop'&&responsiveCounts.viewportMetaPresent&&
      !responsiveCounts.viewportMetaDeviceWidth&&!responsiveCounts.viewportMetaFixedWidth)
      issue(p,device,'viewport-device-width-unknown','P2',
       'Viewport meta exists but no device-width directive was observed; check mobile layout.');
     if(responsiveCounts.viewportMetaMultiple)
      issue(p,device,'viewport-meta-duplicate','P2',
       'Multiple viewport meta elements may conflict; inspect the published head.');
     if(responsiveCounts.viewportMetaZoomRestricted)
      issue(p,device,'viewport-zoom-restricted','P2',
       'Viewport meta appears to restrict pinch zoom; verify accessibility intent.');
     if(responsiveCounts.horizontalOverflowPx>0){
      issue(p,device,'page-horizontal-overflow',
       responsiveCounts.horizontalOverflowPx>(device==='mobile'?24:64)?'P1':'P2',
       'Rendered document is '+responsiveCounts.horizontalOverflowPx+
        ' CSS px wider than the approved viewport; check horizontal scrolling and carousels.');
     }
     if(responsiveCounts.prominentClipped>0)
      issue(p,device,'prominent-content-clipped','P2',
       responsiveCounts.prominentClipped+' visible heading/content container(s) extend beyond viewport by >8 CSS px.');
     if(responsiveCounts.interactiveUnder24>0)
      issue(p,device,'tiny-interactive-targets','P2',
       responsiveCounts.interactiveUnder24+
        ' visible anchor/button/form target(s) have a width or height <24 CSS px.');
     if(responsiveCounts.interactiveMissingName>0)
      issue(p,device,'interactive-names-missing','P2',
       responsiveCounts.interactiveMissingName+
        ' visible interactive target(s) lack a detectable label in this bounded browser heuristic.');
     if(responsiveCounts.textBlocksUnder12>0)
      issue(p,device,'tiny-reading-text','P2',
       responsiveCounts.textBlocksUnder12+
        ' visible paragraph/list text blocks use a CSS font size under 12px.');
     if(responsiveCounts.largeFixedOverlayCandidates>0)
      issue(p,device,'large-fixed-overlay-candidates','P2',
       responsiveCounts.largeFixedOverlayCandidates+
        ' fixed-position element(s) cover >=30% of viewport intersection; inspect consent/UI overlays.');
    }
   }
   let timingStatus='not-supplied',timingCounts=null;
   if(version2&&v.timing){
    if(v.timing.status==='unavailable'){
     timingStatus='unavailable';
     issue(p,device,'browser-timing-unavailable','P2',
      'Navigation/resource timing observation is unavailable ('+v.timing.reason+
       '); do not infer a fast page.');
    }else{
     TIMING.assertObservation(v.timing,v.htmlSha256);
     timingStatus='observed';
     timingCounts=v.timing.counts;
     if(timingCounts.responseStartMs>1800)
      issue(p,device,'slow-browser-response-candidate','P2',
       'Isolated Chromium navigation reached responseStart after '+
        timingCounts.responseStartMs+' ms; investigate server/network separately.');
     if(timingCounts.firstContentfulPaintMs===null)
      issue(p,device,'first-contentful-paint-unknown','P2',
       'First Contentful Paint entry is unavailable; do not interpret it as a fast paint.');
     else if(timingCounts.firstContentfulPaintMs>3000)
      issue(p,device,'slow-browser-paint-candidate','P2',
       'Isolated Chromium observed First Contentful Paint after '+
        timingCounts.firstContentfulPaintMs+' ms; confirm with actual performance tools.');
     if(timingCounts.loadEventEndMs>8000)
      issue(p,device,'slow-browser-load-candidate','P2',
       'Isolated Chromium load event ended after '+timingCounts.loadEventEndMs+
        ' ms; the bounded capture is not representative field performance.');
     if(timingCounts.resourceCount>100)
      issue(p,device,'many-browser-resources','P2',
       'Navigation has '+timingCounts.resourceCount+
        ' resource timing entries; inspect first-party requests and blocked third-party assets.');
    }
   }
   let textStatus='not-supplied',textCounts=null,textLossVsDesktop=false;
   if(version2&&v.textFootprint){
    if(v.textFootprint.status==='unavailable'){
     textStatus='unavailable';
     issue(p,device,'main-text-footprint-unavailable','P2',
      'Visible main-text footprint cannot be sampled ('+v.textFootprint.reason+
       '); confirm substantive content on this device.');
    }else{
     TEXT.assertObservation(v.textFootprint,v.htmlSha256);
     textStatus='observed';
     textCounts=v.textFootprint.counts;
     if(textCounts.mainRegions>0&&textCounts.mainRenderedTextChars===0)
      issue(p,device,'visible-main-text-empty','P1',
       'A rendered main landmark exists but browser-visible main text is empty.');
     if(textCounts.mainRawTextChars>=200&&
      textCounts.mainRenderedTextChars<textCounts.mainRawTextChars*.4)
      issue(p,device,'main-text-mostly-not-rendered','P2',
       'Less than 40% of raw main text characters are browser-visible; inspect responsive/editorial intent.');
     if(textCounts.textBlocks>0&&textCounts.visibleTextBlocks===0)
      issue(p,device,'all-body-text-blocks-hidden','P2',
       'All sampled substantive main paragraph/list blocks are layout-hidden.');
    }
   }
   if(current.meta.status!=='parsed-head')issue(p,device,'rendered-head-incomplete','P1',
    'Rendered document head was not completely parseable; metadata parity is unknown.');
   else if(server.meta.status==='parsed-head'){
    for(const field of ['title','description','ogTitle','ogDescription']){
     if(normalize(server.meta[field])!==normalize(current.meta[field]))
      issue(p,device,'head-'+field+'-mutated','P1',
       'Published metadata field '+field+' differs between HTTP source and rendered DOM.');
    }
    if(normalize(server.meta.language)!==normalize(current.meta.language))
     issue(p,device,'html-language-mutated','P1',
      'HTML lang attribute changed between HTTP source and rendered DOM.');
   }
   if(current.meta.status==='parsed-head'&&!normalize(current.meta.title))
    issue(p,device,'rendered-title-missing','P1',
     'Rendered DOM has no document title.');
   if(current.meta.status==='parsed-head'&&!normalize(current.meta.description))
    issue(p,device,'rendered-description-missing','P2',
     'Rendered DOM has no meta description; confirm editorial intent.');
   const h1=current.parsed.headings.filter(x=>x.level===1);
   const oldH1=server.parsed.headings.filter(x=>x.level===1);
   const headings=current.parsed.headings.map(x=>normalize(x.text));
   if(h1.length!==1)issue(p,device,'rendered-h1-count','P1',
    'Rendered DOM does not contain exactly one H1 heading.');
   else if(expectedH1&&normalize(h1[0].text)!==normalize(expectedH1.heading))
    issue(p,device,'approved-h1-copy-drift','P2',
     'Rendered H1 differs from the approved Blueprint heading; confirm editorial revision.',
     {sectionId:expectedH1.id});
   if(oldH1.length&&h1.length===0)
    issue(p,device,'h1-disappeared-after-render','P1',
     'An H1 present in HTTP HTML disappeared after the supplied DOM render.');
   if(!oldH1.length&&h1.length)
    issue(p,device,'h1-client-render-dependent','P2',
     'H1 exists only in supplied rendered DOM; verify search engine rendering separately.');
   for(const sec of p.sections.filter(s=>s.level>1)){
    if(!headings.includes(normalize(sec.heading)))
     issue(p,device,'planned-heading-not-observed','P2',
      'Approved section heading was not found in this rendered DOM capture.',
      {sectionId:sec.id});
   }
   if(current.parsed.mainCount!==1)issue(p,device,'rendered-main-count','P1',
    'Expected one primary main landmark in rendered DOM; static markup scan found another count.');
   if(server.parsed.mainCount>0&&current.parsed.mainCount===0)
    issue(p,device,'main-disappeared-after-render','P1',
     'The primary main landmark was present in HTTP HTML but absent after render.');
   if(current.canonicals.length!==1)issue(p,device,'rendered-canonical-count','P1',
    'Rendered DOM does not contain exactly one canonical link.');
   else if(current.canonicals[0]!==approvedCanonical)
    issue(p,device,'rendered-canonical-drift','P0',
     'Rendered canonical does not match the approved Blueprint.');
   if(JSON.stringify(current.canonicals)!==JSON.stringify(server.canonicals))
    issue(p,device,'canonical-mutated-after-render','P0',
     'Canonical link changed between original HTTP HTML and rendered DOM.');
   if(current.robotsNoindex!==server.robotsNoindex)
    issue(p,device,'robots-mutated-after-render','P0',
     'Noindex state changed between original HTTP HTML and rendered DOM.');
   if(p.seo.robots==='index'&&current.robotsNoindex)
    issue(p,device,'rendered-unexpected-noindex','P0',
     'Rendered DOM noindex conflicts with approved indexable page.');
   if(p.seo.robots==='noindex'&&!current.robotsNoindex)
    issue(p,device,'rendered-missing-noindex','P0',
     'Approved noindex is not declared in the captured rendered DOM; check HTTP headers.');
   const missing=[...desired].filter(x=>!observedRoutes.has(x));
   for(const destination of missing){
    const target=p.links.find(l=>l.toPath===destination)?.toPageId||
     p.sections.find(s=>s.cta&&byPage.get(s.cta.toPageId).path===destination)?.cta.toPageId;
    issue(p,device,'approved-internal-route-absent','P1',
     'Approved navigation or CTA destination not found in rendered DOM anchors.',
     {toPageId:target});
   }
   const vanished=[...serverRoutes].filter(x=>!observedRoutes.has(x));
   if(vanished.length)issue(p,device,'server-links-disappeared','P1',
    'One or more approved internal destinations from HTTP HTML disappeared after render.',
    {affectedApprovedRouteCount:vanished.length});
   const linkDelta=LINKS.compare({sourceParsed:server.parsed,renderedParsed:current.parsed,
    served:expected,origin,approvedPaths:[...desired]});
   const linkStatus=linkDelta.status;
   let linkRestrictedRouteCount=0,linkUnsafeSchemeGrowth=0,linkPlaceholderGrowth=0;
   if(linkStatus!=='observed'){
    issue(p,device,'link-semantics-unavailable','P1',
     'HTTP or rendered DOM internal link semantics could not be safely compared; crawlability unknown.');
   }else{
    linkRestrictedRouteCount=linkDelta.allRestrictedPaths.length;
    linkUnsafeSchemeGrowth=linkDelta.newlyUnsafeSchemes;
    linkPlaceholderGrowth=linkDelta.newlyPlaceholderAnchors;
    if(linkRestrictedRouteCount>0)
     issue(p,device,'approved-link-rel-restricted','P1',
      linkRestrictedRouteCount+' approved internal destination(s) have only rel=nofollow/ugc/sponsored anchors.',
      {affectedApprovedRouteCount:linkRestrictedRouteCount,
       newlyRestrictedApprovedRoutes:linkDelta.newlyRestrictedPaths.length});
    if(linkDelta.mixedRestrictedPaths.length)
     issue(p,device,'approved-link-mixed-rel','P2',
      linkDelta.mixedRestrictedPaths.length+
       ' approved destination(s) mix restricted and ordinary links; review editorial intent.');
    if(linkDelta.queryOnlyPaths.length)
     issue(p,device,'approved-links-query-only','P2',
      linkDelta.queryOnlyPaths.length+
       ' planned destination(s) are linked only through query-bearing URLs; verify canonical navigation.');
    if(linkUnsafeSchemeGrowth||linkPlaceholderGrowth||linkDelta.newlyInvalidLinks)
     issue(p,device,'noncrawlable-anchors-increased','P2',
      'Rendered DOM introduced '+linkUnsafeSchemeGrowth+' unsafe-scheme, '+
       linkPlaceholderGrowth+' placeholder and '+linkDelta.newlyInvalidLinks+
       ' oversized/invalid anchors; review navigation without exposing raw URLs.');
    if(linkDelta.newlyHttpLinks||linkDelta.newlyOffMountLinks)
     issue(p,device,'external-or-offmount-links-increased','P2',
      'Rendered DOM added '+linkDelta.newlyHttpLinks+' HTTP and '+
       linkDelta.newlyOffMountLinks+' same-origin/off-mount links; verify intentional targets.');
   }
   const originalTypes=server.parsed.rootStructuredDataTypes;
   const currentTypes=current.parsed.rootStructuredDataTypes;
   const removed=originalTypes.filter(x=>!currentTypes.includes(x));
   const added=currentTypes.filter(x=>!originalTypes.includes(x));
   if(removed.length)issue(p,device,'jsonld-types-removed','P1',
    'JSON-LD root type(s) present in HTTP HTML absent from rendered DOM; run semantic schema QA.');
   if(added.length)issue(p,device,'jsonld-types-injected','P2',
    'JSON-LD root type(s) added after rendering; verify semantic facts against approved owner data.');
   if(current.parsed.structuredDataErrors.length)
    issue(p,device,'rendered-jsonld-invalid','P1',
     'Rendered DOM contains malformed or oversized JSON-LD.');
   // A root @type comparison alone misses JS-mutated offers, prices, reviews,
   // breadcrumbs and factual claims inside unchanged schema entities. Reuse
   // the existing bounded semantic parser; only allowlisted field/type names
   // and numeric changes leave this per-device comparison.
   const schemaDelta=SCHEMA.compareRenderedSemantics({
    sourceHtml:source.html,renderedHtml:v.html,page:p,base:origin,knownPaths:allPaths});
   const schemaRuntimeStatus=schemaDelta.status;
   let schemaClaimChange=false,schemaUnapprovedType=false,
    schemaUnconfirmedType=false,schemaUnsafeEntity=false;
   if(schemaRuntimeStatus!=='observed'){
    issue(p,device,'jsonld-semantic-comparison-incomplete','P1',
     'HTTP or rendered JSON-LD could not be safely inspected ('+schemaDelta.reason+
      '); semantic parity is unknown.');
   }else{
    const claimFields=[...schemaDelta.addedClaimFields,...schemaDelta.changedClaimFields];
    if(claimFields.length){
     schemaClaimChange=true;
     issue(p,device,'jsonld-owner-claim-mutated','P1',
      'JavaScript added or changed owner-sensitive JSON-LD fields ('+
       claimFields.join(', ')+'); compare evidence with the owner. No values are retained.',
      {changedClaimFieldNames:claimFields});
    }
    if(schemaDelta.addedUnconfirmedTypes>0){
     schemaUnconfirmedType=true;
     issue(p,device,'jsonld-unconfirmed-candidate-injected','P0',
      'Rendered JSON-LD introduces '+schemaDelta.addedUnconfirmedTypes+
       ' entity type occurrence(s) linked to Blueprint candidates without confirmed owner facts.');
    }
    if(schemaDelta.addedUnapprovedTypes>0){
     schemaUnapprovedType=true;
     issue(p,device,'jsonld-unapproved-type-injected','P1',
      'Rendered JSON-LD introduces '+schemaDelta.addedUnapprovedTypes+
       ' material schema entity occurrence(s) absent from the approved Blueprint candidates.');
    }
    if(schemaDelta.addedUnsafeUrls||schemaDelta.addedCanonicalDrift||
     schemaDelta.addedBreadcrumbProblems||schemaDelta.addedContextProblems){
     schemaUnsafeEntity=true;
     issue(p,device,'jsonld-semantic-regression','P1',
      'Rendered JSON-LD introduces unsafe entity URLs, page-canonical mismatches, '+
       'breadcrumb errors or context issues; review the actual private DOM.');
    }
    if(schemaDelta.removedTypes.length||schemaDelta.addedTypes.length||
     schemaDelta.addedUnknownTypes||schemaDelta.removedClaimFields.length){
     issue(p,device,'jsonld-nested-entity-drift','P2',
      'Typed schema entities or owner-sensitive claim fields appeared/disappeared, '+
       'or unrecognized types increased; verify semantic intent against original HTTP HTML.',
      {removedKnownTypeNames:schemaDelta.removedTypes,
       addedKnownTypeNames:schemaDelta.addedTypes,
       removedClaimFieldNames:schemaDelta.removedClaimFields});
    }
   }
   if(current.parsed.unlabelledControls.length>server.parsed.unlabelledControls.length)
    issue(p,device,'unlabelled-controls-increased','P2',
     'Rendered DOM introduced form controls without detectable static labels; browser accessibility review needed.');
   report.devices[device]={inspected:true,method:'rendered-dom',
    mediaStatus,mediaCounts,
    responsiveStatus,responsiveCounts,
    timingStatus,timingCounts,
    textStatus,textCounts,textLossVsDesktop,
    linkStatus,linkRestrictedRouteCount,linkUnsafeSchemeGrowth,linkPlaceholderGrowth,
    schemaRuntimeStatus,schemaClaimChange,schemaUnapprovedType,
    schemaUnconfirmedType,schemaUnsafeEntity,
    cssVisibilityStatus,cssHiddenH1,cssHiddenMain,cssHiddenCtaRoutes,
    cssCollapsedNavRoutes,cssHiddenSecondaryHeadings,
    h1Count:h1.length,mainCount:current.parsed.mainCount,
    plannedRouteCount:desired.size,observedPlannedRoutes:desired.size-missing.length,
    httpH1Count:oldH1.length,sourceInternalRoutes:serverRoutes.size,
    renderedInternalRoutes:observedRoutes.size,
    originalSchemaRootTypeCount:originalTypes.length,renderedSchemaRootTypeCount:currentTypes.length,
    newUnlabelledControls:Math.max(0,current.parsed.unlabelledControls.length-
     server.parsed.unlabelledControls.length)};
  }
  report.evidenceState=DEVICES.every(d=>report.devices[d].inspected)?'SOURCE-PAIR-OBSERVED':'INCOMPLETE';
  pages.push(report);
 }
 // Resolve fragment anchors against the target page's *same-device* rendered
 // IDs only after all page source pairs have been checked. Partial captures,
 // drifted HTTP responses and unsettled target DOMs are unknown, never broken.
 const reportsById=new Map(pages.map(p=>[p.pageId,p]));
 for(const device of DEVICES){
  const targets=new Map(plan.pages.map(p=>{
   const v=byView.get(p.id)?.captures[device],state=reportsById.get(p.id)?.devices[device];
   return [p.path,state?.inspected&&v?{
    inspected:true,ids:new Set(HTML.inspect(v.html).ids)}:{inspected:false}];
  }));
  for(const p of plan.pages){
   const state=reportsById.get(p.id)?.devices[device];
   if(!state?.inspected)continue;
   const v=byView.get(p.id).captures[device];
   const checked=FRAGMENTS.review({parsed:HTML.inspect(v.html),
    served:routeUrl(origin,p.path),origin,targetByPath:targets});
   state.fragmentStatus=checked.status;
   state.fragmentChecked=checked.status==='observed'?checked.checked:0;
   state.fragmentMissing=checked.status==='observed'?checked.missing:0;
   state.fragmentUnknown=checked.status==='observed'?checked.unknown:0;
   if(checked.status!=='observed'){
    issue(p,device,'fragment-navigation-unavailable','P2',
     'Rendered fragment navigation cannot be checked safely; inspect original private DOM.');
   }else{
    if(checked.missing>0)issue(p,device,'fragment-target-missing','P2',
     checked.missing+' same-device rendered fragment link(s) have no matching target ID.',
     {affectedApprovedRouteCount:checked.affectedApprovedPaths.length});
    if(checked.unknown>0)issue(p,device,'fragment-target-unverified','P2',
     checked.unknown+' fragment link(s) target an uninspected/parameterized page or malformed fragment; no broken-link claim.');
   }
  }
 }
 // Cross-viewport substantive content loss is a manual investigation only.
 // Differences may be deliberate; the probe does not copy or compare prose.
 for(const p of plan.pages){
  const devices=reportsById.get(p.id).devices;
  const desktop=devices.desktop,mobile=devices.mobile;
  if(desktop?.textStatus==='observed'&&mobile?.textStatus==='observed'&&
   desktop.textCounts.mainRenderedTextChars>=200&&
   mobile.textCounts.mainRenderedTextChars<desktop.textCounts.mainRenderedTextChars*.4){
   mobile.textLossVsDesktop=true;
   issue(p,'mobile','main-text-mobile-loss-candidate','P2',
    'Mobile has less than 40% of desktop browser-visible main text characters; check intentional responsive copy.');
  }
 }
 findings.sort((a,b)=>LEVEL[a.priority]-LEVEL[b.priority]||
  a.pageId.localeCompare(b.pageId)||String(a.device).localeCompare(String(b.device))||
  a.code.localeCompare(b.code)||a.id.localeCompare(b.id));
 const browserBodyMatches=(p,device)=>{
  const sourceBody=byHttp.get(p.id)?.html,v=p.captures[device];
  return typeof sourceBody==='string'&&v.matchesOriginalHttpBody&&
   v.serverResponseSha256===crypto.createHash('sha256').update(sourceBody,'utf8').digest('hex');
 };
 const cssDevices=pages.flatMap(p=>DEVICES.map(d=>p.devices[d]));
 const cssObserved=cssDevices.filter(d=>d.cssVisibilityStatus==='observed');
 const mediaObserved=cssDevices.filter(d=>d.mediaStatus==='observed'&&d.mediaCounts);
 const responsiveObserved=cssDevices.filter(d=>d.responsiveStatus==='observed'&&d.responsiveCounts);
 const linkObserved=cssDevices.filter(d=>d.linkStatus==='observed');
 const timingObserved=cssDevices.filter(d=>d.timingStatus==='observed'&&d.timingCounts);
 const fragmentObserved=cssDevices.filter(d=>d.fragmentStatus==='observed');
 const textObserved=cssDevices.filter(d=>d.textStatus==='observed'&&d.textCounts);
 const semanticObserved=cssDevices.filter(d=>d.schemaRuntimeStatus==='observed');
 const summary={plannedPages:plan.pages.length,httpInspectedPages:pages.filter(p=>p.httpInspected).length,
  fullyComparedPages:pages.filter(p=>p.evidenceState==='SOURCE-PAIR-OBSERVED').length,
  missingRenderPages:pages.filter(p=>p.evidenceState!=='SOURCE-PAIR-OBSERVED').length,
  inspectedDevicePairs:pages.reduce((n,p)=>n+DEVICES.filter(d=>p.devices[d].inspected).length,0),
  browserResponseMatchedPairs:version2?viewports.pages.reduce((n,p)=>n+DEVICES.filter(d=>browserBodyMatches(p,d)).length,0):null,
  browserResponseDriftPairs:version2?viewports.pages.reduce((n,p)=>n+DEVICES.filter(d=>!browserBodyMatches(p,d)).length,0):null,
  browserBlockedPairs:version2?viewports.pages.reduce((n,p)=>n+DEVICES.filter(d=>p.captures[d].blockedRequests>0).length,0):null,
  browserBlockedReasonCounts:version2?Object.fromEntries(CHROME.BLOCK_REASONS.map(k=>
   [k,viewports.pages.reduce((n,p)=>n+DEVICES.reduce(
    (count,d)=>count+p.captures[d].blockedReasons[k],0),0)])):null,
  browserPageErrorPairs:version2?viewports.pages.reduce((n,p)=>n+DEVICES.filter(d=>p.captures[d].pageErrors>0).length,0):null,
  browserUnsettledPairs:version2?viewports.pages.reduce((n,p)=>n+DEVICES.filter(d=>!p.captures[d].stableMarkup).length,0):null,
  cssInspectedDevicePairs:version2?cssObserved.length:null,
  cssUnknownOrUnusableDevicePairs:version2?plan.pages.length*3-cssObserved.length:null,
  cssHiddenH1DevicePairs:version2?cssObserved.filter(d=>d.cssHiddenH1).length:null,
  cssHiddenMainDevicePairs:version2?cssObserved.filter(d=>d.cssHiddenMain).length:null,
  cssHiddenSecondaryHeadings:version2?cssObserved.reduce((n,d)=>n+d.cssHiddenSecondaryHeadings,0):null,
  cssHiddenCtaDestinations:version2?cssObserved.reduce((n,d)=>n+d.cssHiddenCtaRoutes,0):null,
  cssCollapsedNavDestinations:version2?cssObserved.reduce((n,d)=>n+d.cssCollapsedNavRoutes,0):null,
  mediaObservedDevicePairs:version2?mediaObserved.length:null,
  mediaUnknownDevicePairs:version2?plan.pages.length*3-mediaObserved.length:null,
  mediaVisibleFailed:version2?mediaObserved.reduce((n,d)=>n+d.mediaCounts.visibleFailed,0):null,
  mediaLargeAboveFoldFailed:version2?mediaObserved.reduce((n,d)=>n+d.mediaCounts.largeAboveFoldFailed,0):null,
  mediaAboveFoldLazy:version2?mediaObserved.reduce((n,d)=>n+d.mediaCounts.aboveFoldLazy,0):null,
  mediaVisibleMissingAlt:version2?mediaObserved.reduce((n,d)=>n+d.mediaCounts.visibleMissingAlt,0):null,
  mediaVisibleMissingDimensions:version2?mediaObserved.reduce((n,d)=>n+d.mediaCounts.visibleMissingDimensions,0):null,
  mediaVisibleUpscaled:version2?mediaObserved.reduce((n,d)=>n+d.mediaCounts.visibleUpscaled,0):null,
  responsiveObservedPairs:version2?responsiveObserved.length:null,
  responsiveUnknownPairs:version2?plan.pages.length*3-responsiveObserved.length:null,
  responsiveOverflowPairs:version2?responsiveObserved.filter(d=>d.responsiveCounts.horizontalOverflowPx>0).length:null,
  responsiveOverflowMaxPx:version2?Math.max(0,...responsiveObserved.map(d=>d.responsiveCounts.horizontalOverflowPx)):null,
  responsiveFixedViewportPairs:version2?responsiveObserved.filter(d=>d.responsiveCounts.viewportMetaFixedWidth>0).length:null,
  responsiveTinyTargetPairs:version2?responsiveObserved.filter(d=>d.responsiveCounts.interactiveUnder24>0).length:null,
  responsiveClippedProminentPairs:version2?responsiveObserved.filter(d=>d.responsiveCounts.prominentClipped>0).length:null,
  responsiveUnnamedTargetPairs:version2?responsiveObserved.filter(d=>d.responsiveCounts.interactiveMissingName>0).length:null,
  linkSemanticObservedPairs:linkObserved.length,
  linkSemanticUnknownPairs:plan.pages.length*3-linkObserved.length,
  linkRestrictedRoutePairs:linkObserved.filter(d=>d.linkRestrictedRouteCount>0).length,
  linkUnsafeSchemeGrowthPairs:linkObserved.filter(d=>d.linkUnsafeSchemeGrowth>0).length,
  linkPlaceholderGrowthPairs:linkObserved.filter(d=>d.linkPlaceholderGrowth>0).length,
  timingObservedPairs:version2?timingObserved.length:null,
  timingUnknownPairs:version2?plan.pages.length*3-timingObserved.length:null,
  timingSlowResponsePairs:version2?timingObserved.filter(d=>d.timingCounts.responseStartMs>1800).length:null,
  timingSlowPaintPairs:version2?timingObserved.filter(d=>
   d.timingCounts.firstContentfulPaintMs!==null&&d.timingCounts.firstContentfulPaintMs>3000).length:null,
  timingPaintUnknownPairs:version2?timingObserved.filter(d=>d.timingCounts.firstContentfulPaintMs===null).length:null,
  timingSlowLoadPairs:version2?timingObserved.filter(d=>d.timingCounts.loadEventEndMs>8000).length:null,
  fragmentObservedPairs:fragmentObserved.length,
  fragmentUnknownPairs:plan.pages.length*3-fragmentObserved.length,
  fragmentMissingTotal:fragmentObserved.reduce((n,d)=>n+d.fragmentMissing,0),
  fragmentUnverifiedTotal:fragmentObserved.reduce((n,d)=>n+d.fragmentUnknown,0),
  fragmentMissingPairs:fragmentObserved.filter(d=>d.fragmentMissing>0).length,
  textObservedPairs:version2?textObserved.length:null,
  textUnknownPairs:version2?plan.pages.length*3-textObserved.length:null,
  textEmptyMainPairs:version2?textObserved.filter(d=>d.textCounts.mainRegions>0&&
   d.textCounts.mainRenderedTextChars===0).length:null,
  textHiddenBlockTotal:version2?textObserved.reduce((n,d)=>n+d.textCounts.hiddenTextBlocks,0):null,
  textMobileLossPages:version2?pages.filter(p=>p.devices.mobile.textLossVsDesktop).length:null,
  schemaRuntimeObservedPairs:semanticObserved.length,
  schemaRuntimeUnknownPairs:plan.pages.length*3-semanticObserved.length,
  schemaClaimChangedPairs:semanticObserved.filter(d=>d.schemaClaimChange).length,
  schemaUnapprovedTypePairs:semanticObserved.filter(d=>d.schemaUnapprovedType).length,
  schemaUnconfirmedFactPairs:semanticObserved.filter(d=>d.schemaUnconfirmedType).length,
  schemaUnsafeEntityPairs:semanticObserved.filter(d=>d.schemaUnsafeEntity).length,
  P0:findings.filter(f=>f.priority==='P0').length,
  P1:findings.filter(f=>f.priority==='P1').length,
  P2:findings.filter(f=>f.priority==='P2').length};
 return {format:FORMAT,version:1,siteId:plan.siteId,base:origin,
  renderedCaptureFormat:viewports.format,
  originalHttpBytePinnedInRenderedCapture:version2,
  inputSHA256:{blueprint:blueprintRawSha256,site:siteRawSha256,
   publicHttp:captureRawSha256,viewports:viewportsRawSha256},
  pages,findings,summary,
  manualNext:['Confirm both captures refer to the same released revision and URL/mount.',
   'Resolve P0 canonical/robots changes before SEO signoff; inspect source and browser DOM.',
   'Verify headings, CTA routes, responsive overflow/touch targets, JSON-LD claims and accessibility on real devices.',
   'Run existing Structured Data Semantic QA on original HTTP source; this rendered delta never verifies claim truth or Google eligibility.'],
  originalCustomerMarkupIncluded:false,sourceOriginAuthenticated:false,
  browserCaptureAuthenticated:false,sameReleaseRevisionProven:false,
  googleRenderingVerified:false,visualAccessibilityVerified:false,
  ownerApprovalAuthenticated:false,readOnly:true,releaseAuthorized:false};
}
module.exports=Object.freeze({FORMAT,DEVICES,analyze});
