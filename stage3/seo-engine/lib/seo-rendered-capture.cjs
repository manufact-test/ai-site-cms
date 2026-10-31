'use strict';
/* Explicit read-only, public HTTPS, Chromium-rendered DOM capture.
 * No browser navigation outside approved pages, no POST, cookies from caller,
 * service workers, WebSockets, downloads, publishing or Google claims.
 */
const BP=require('./blueprint.cjs');
const HTTP=require('./delivery-evidence.cjs');
const PUBLIC=require('./public-https-capture.cjs');
const VIS=require('./seo-browser-css-visibility.cjs');
const MEDIA=require('./seo-browser-image-observation.cjs');
const crypto=require('node:crypto');
const net=require('node:net');
const FORMAT='manufact-seo-viewport-evidence-v2';
const WIDTHS=Object.freeze({desktop:1280,tablet:768,mobile:390});
const HEIGHTS=Object.freeze({desktop:900,tablet:1024,mobile:844});
const SHA=/^[0-9a-f]{64}$/;
const DEVICES=Object.freeze(['desktop','tablet','mobile']);
const MAX_REQUESTS_PER_VIEW=80;
const BLOCK_REASONS=Object.freeze(['offOrigin','outsideMount','unsafeMethod',
 'unapprovedNavigation','requestBudget','other']);
const emptyBlocked=()=>Object.fromEntries(BLOCK_REASONS.map(k=>[k,0]));
const fail=m=>{throw Error('Rendered browser capture: '+m)};
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const iso=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s));
const url=(origin,route)=>new URL(route.slice(1),origin).href;
function verify({blueprint,site,http,httpRawSha256,expectedOrigin}={}){
 const bp=BP.checkBlueprint(blueprint);
 if(!site||site.format!=='manufact-ai-site-v1'||site.schemaVersion!==1||
  site.siteId!==bp.siteId||!Array.isArray(site.pages)||site.pages.length!==bp.pages.length||
  site.pages.length>60)fail('approved same-site Site v1 page inventory required');
 const wanted=new Map(bp.pages.map(p=>[p.id,p.path])),seen=new Set();
 for(const p of site.pages){
  if(!p||wanted.get(p.id)!==p.path||seen.has(p.id))fail('Site v1 page does not match Blueprint');
  seen.add(p.id);
 }
 if(!SHA.test(httpRawSha256||''))fail('original HTTP transcript SHA256 required');
 if(http?.format!==HTTP.FORMAT||http.siteId!==site.siteId)fail('original same-site HTTPS transcript required');
 HTTP.assertEvidence(http);
 const base=PUBLIC.origin(http.origin,site.siteId);
 if(expectedOrigin!==undefined&&expectedOrigin!==base.href)
  fail('explicit approved origin differs from HTTP source');
 const captured=new Map();
 for(const p of http.pages){
  if(!wanted.has(p.id)||wanted.get(p.id)!==p.path||captured.has(p.id))
   fail('HTTPS response page IDs/routes must match approved Blueprint');
  captured.set(p.id,p);
 }
 if(captured.size!==wanted.size)fail('complete approved public HTML transcript required');
 if(http.rootRecheck?.matched===false)fail('mixed public release detected by original root recheck');
 for(const [id,path] of wanted){
  const original=captured.get(id),expected=url(base,path);
  if(original.status!==200||original.requestUrl!==expected||
   original.responseUrl!==expected||typeof original.html!=='string'||
   !/<head\b/i.test(original.html))
   fail('original HTTP page is not exact 200 HTML for '+id);
 }
 return {bp,base,origin:base.href,wanted};
}
function assertV2(e,originalHttpSha=null){
 if(e?.format!==FORMAT||typeof e.siteId!=='string'||!Array.isArray(e.pages)||
  e.pages.length<1||e.pages.length>60||!SHA.test(e.publicCaptureRawSha256||'')||
  e.httpSourceAuthenticated!==false||e.browserProvenanceAuthenticated!==false||
  e.sourceRevisionAuthenticated!==false||e.googleRenderingVerified!==false||
  e.releaseAuthorized!==false||e.browser?.engine!=='chromium-playwright'||
  e.browser?.requestPolicy!=='same-origin-GET-HEAD-no-websocket'||
  e.browser?.ephemeralContext!==true||
  Object.keys(e.browser).some(k=>!['engine','requestPolicy','ephemeralContext'].includes(k)))
  fail('invalid bounded v2 browser capture envelope');
 if(originalHttpSha!==null&&e.publicCaptureRawSha256!==originalHttpSha)
  fail('rendered DOM evidence belongs to a different original HTTP file');
 const origin=PUBLIC.origin(e.origin,e.siteId);
 if(origin.href!==e.origin||!iso(e.capturedAt)||
  Object.keys(e).some(k=>!['format','siteId','origin','capturedAt',
   'publicCaptureRawSha256','browser','pages','httpSourceAuthenticated',
   'browserProvenanceAuthenticated','sourceRevisionAuthenticated',
   'googleRenderingVerified','releaseAuthorized'].includes(k)))
  fail('unsafe or unsupported rendered DOM provenance');
 const ids=new Set(),urls=new Set();
 for(const p of e.pages){
  if(!p||typeof p.id!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(p.id)||
   typeof p.path!=='string'||!/^\/(?:[a-z0-9-]+\/)*$/.test(p.path)||
   ids.has(p.id)||urls.has(p.path)||
   Object.keys(p).some(k=>!['id','path','captures'].includes(k))||
   !p.captures||typeof p.captures!=='object'||
   Object.keys(p.captures).sort().join(',')!==DEVICES.slice().sort().join(','))
   fail('duplicate, missing or invalid page capture');
  ids.add(p.id);urls.add(p.path);
  const expected=url(origin,p.path);
  for(const device of DEVICES){
   const d=p.captures[device];
   if(!d||d.method!=='rendered-dom'||typeof d.html!=='string'||!d.html.length||
    d.html.length>250000||!SHA.test(d.htmlSha256||'')||sha(d.html)!==d.htmlSha256||
    d.requestUrl!==expected||d.responseUrl!==expected||d.status!==200||
    d.viewport?.width!==WIDTHS[device]||d.viewport?.height!==HEIGHTS[device]||
    Object.keys(d.viewport).some(k=>!['width','height'].includes(k))||
    !iso(d.collectedAt)||
    !Number.isInteger(d.blockedRequests)||d.blockedRequests<0||
    !d.blockedReasons||typeof d.blockedReasons!=='object'||Array.isArray(d.blockedReasons)||
    Object.keys(d.blockedReasons).sort().join(',')!==BLOCK_REASONS.slice().sort().join(',')||
    BLOCK_REASONS.some(k=>!Number.isInteger(d.blockedReasons[k])||d.blockedReasons[k]<0)||
    BLOCK_REASONS.reduce((n,k)=>n+d.blockedReasons[k],0)!==d.blockedRequests||
    !Number.isInteger(d.pageErrors)||d.pageErrors<0||
    !SHA.test(d.serverResponseSha256||'')||typeof d.matchesOriginalHttpBody!=='boolean'||
    typeof d.stableMarkup!=='boolean'||
    Object.keys(d).some(k=>!['method','html','htmlSha256','requestUrl','responseUrl','status',
     'viewport','collectedAt','blockedRequests','blockedReasons','pageErrors','stableMarkup',
     'serverResponseSha256','matchesOriginalHttpBody','visibility','media'].includes(k)))
    fail('invalid or tampered v2 rendered DOM '+p.id+' '+device);
   if(d.visibility!==undefined)VIS.assertObservation(d.visibility,d.htmlSha256);
   if(d.media!==undefined)MEDIA.assertObservation(d.media,d.htmlSha256);
  }
 }
 return e;
}
function selectPages(verified,pageIds=null){
 if(pageIds===null)return verified.bp.pages;
 if(!Array.isArray(pageIds)||pageIds.length<1||pageIds.length>8||
  new Set(pageIds).size!==pageIds.length||
  pageIds.some(id=>typeof id!=='string'||!verified.bp.pages.some(p=>p.id===id)))
  fail('pilot page selection must contain 1-8 distinct approved Blueprint IDs');
 const selected=new Set(pageIds);
 return verified.bp.pages.filter(p=>selected.has(p.id));
}
async function capture(input,{resolve=PUBLIC.address,launch,now=()=>new Date().toISOString(),
 pageIds=null}={}){
 const verified=verify(input),pages=selectPages(verified,pageIds);
 if(typeof launch!=='function'||typeof resolve!=='function')fail('browser adapter required');
 const pin=await resolve(verified.base.hostname);
 if(!pin||net.isIP(pin.address)!==4||pin.family!==4||!PUBLIC.isPublicIp(pin.address))
  fail('only single pinned public IPv4 DNS address supported for browser capture');
 const requested=new Set(pages.map(p=>url(verified.base,p.path)));
 const originalHttpById=new Map(input.http.pages.map(p=>[p.id,p]));
 const evidence={format:FORMAT,siteId:verified.bp.siteId,origin:verified.origin,
  capturedAt:now(),publicCaptureRawSha256:input.httpRawSha256,
  browser:{engine:'chromium-playwright',requestPolicy:'same-origin-GET-HEAD-no-websocket',
   ephemeralContext:true},pages:[],
  httpSourceAuthenticated:false,browserProvenanceAuthenticated:false,
  sourceRevisionAuthenticated:false,googleRenderingVerified:false,releaseAuthorized:false};
 let browser;
 try{
  browser=await launch(verified.base,pin);
  if(!browser||typeof browser.newContext!=='function'||typeof browser.close!=='function')
   fail('Chromium adapter invalid');
  const pathById=new Map(verified.bp.pages.map(p=>[p.id,p.path]));
  for(const spec of pages){
   const target=url(verified.base,spec.path),record={id:spec.id,path:spec.path,captures:{}};
   const plannedPaths=[...new Set([...spec.links.map(l=>l.toPath),
    ...spec.sections.filter(x=>x.cta).map(x=>pathById.get(x.cta.toPageId))])].sort();
   const browserTargets=plannedPaths.map(path=>({path,href:url(verified.base,path)}));
   for(const device of DEVICES){
    let context,blockedRequests=0,pageErrors=0,allowedRequests=0;
    const blockedReasons=emptyBlocked();
    try{
     context=await browser.newContext({
      viewport:{width:WIDTHS[device],height:HEIGHTS[device]},deviceScaleFactor:1,
      javaScriptEnabled:true,serviceWorkers:'block',acceptDownloads:false,
      ignoreHTTPSErrors:false,permissions:[],
      locale:({ru:'ru-RU',en:'en-US',de:'de-DE',pl:'pl-PL',be:'be-BY',uk:'uk-UA'})[verified.bp.language]
     });
     if(typeof context.routeWebSocket!=='function'||typeof context.route!=='function'||
      typeof context.addInitScript!=='function')
      fail('Playwright must support blocking all WebSocket and routed HTTP requests');
     await context.addInitScript(()=>{
      for(const name of ['RTCPeerConnection','webkitRTCPeerConnection',
       'mozRTCPeerConnection','WebTransport']){
       try{Object.defineProperty(globalThis,name,{configurable:false,
        get(){throw Error('SEO capture: unsupported realtime connection')}})}catch{}
      }
     });
     await context.routeWebSocket('**/*',ws=>ws.close());
     await context.route('**/*',route=>{
      const req=route.request();
      let reason=null;
      try{
       const dst=new URL(req.url());
       if(dst.protocol!=='https:'||dst.username||dst.password||dst.hash)reason='other';
       else if(dst.origin!==verified.base.origin)reason='offOrigin';
       else if(!dst.pathname.startsWith(verified.base.pathname))reason='outsideMount';
       else if(!['GET','HEAD'].includes(req.method()))reason='unsafeMethod';
       else if(req.isNavigationRequest()&&!requested.has(dst.href))reason='unapprovedNavigation';
       else if(allowedRequests>=MAX_REQUESTS_PER_VIEW)reason='requestBudget';
      }catch{reason='other'}
      if(reason){blockedRequests++;blockedReasons[reason]++}
      else allowedRequests++;
      return reason?route.abort():route.continue();
     });
     const page=await context.newPage();
     page.on('pageerror',()=>{pageErrors++});
     const response=await page.goto(target,{waitUntil:'load',timeout:25000});
     if(!response||response.status()!==200||page.url()!==target)
      fail('browser navigation did not finish on exact approved 200 page '+spec.id);
     if(typeof response.text!=='function')fail('browser must expose original navigation response text');
     const originalResponse=await response.text();
     if(typeof originalResponse!=='string'||originalResponse.length>500000)
      fail('browser main HTML response invalid or too large');
     const serverResponseSha256=sha(originalResponse);
     const matchesOriginalHttpBody=serverResponseSha256===sha(originalHttpById.get(spec.id).html);
     // Late JS content may settle after load. This is heuristic, never crawler proof.
     let html=await page.content(),stable=false;
     for(let pass=0;pass<5;pass++){
      await page.waitForTimeout(350);
      const next=await page.content();
      if(next===html){stable=true;html=next;break}
      html=next;
     }
     if(html.length<10||html.length>250000||!/<html\b/i.test(html)||!/<head\b/i.test(html))
      fail('rendered DOM missing or exceeds bounded evidence for '+spec.id+' '+device);
     /* Computed CSS counts are bound to this DOM digest, not Google indexing.
      * Two samples classify animated/unstable CSS as unknown.
      */
     let observation=null,reason=null;
     try{
      if(typeof page.evaluate!=='function')throw Error('Browser evaluate unavailable');
      observation=await page.evaluate(VIS.sample,browserTargets);
      await page.waitForTimeout(250);
      const later=await page.evaluate(VIS.sample,browserTargets);
      if(JSON.stringify(observation)!==JSON.stringify(later))
       reason='css-changing-during-sampling';
     }catch{reason='sampling-error'}
     try{
      const laterHtml=await page.content();
      if(laterHtml!==html){html=laterHtml;stable=false;reason='dom-changed-during-sampling'}
     }catch{stable=false;reason='dom-changed-during-sampling'}
     if(!reason&&observation?.status==='unavailable')
      reason=VIS.REASONS.includes(observation.reason)?observation.reason:'sampling-error';
     let visibility;
     if(!reason){
      try{
       visibility={method:VIS.METHOD,status:'observed',checkedAt:now(),
        htmlSha256:sha(html),h1:observation.h1,main:observation.main,
        secondaryHeadings:observation.secondaryHeadings,routes:observation.routes};
       VIS.assertObservation(visibility,sha(html),plannedPaths);
      }catch{reason='sampling-error'}
     }
     if(reason)visibility={method:VIS.METHOD,status:'unavailable',checkedAt:now(),reason};
     /* Image state is sampled in the same approved browser context.
      * Only counts are retained; no image URL, alt text or screenshot.
      */
     let mediaObservation=null,mediaReason=null;
     const mediaViewport={width:WIDTHS[device],height:HEIGHTS[device]};
     try{
      mediaObservation=await page.evaluate(MEDIA.sample,mediaViewport);
      await page.waitForTimeout(250);
      const second=await page.evaluate(MEDIA.sample,mediaViewport);
      if(JSON.stringify(mediaObservation)!==JSON.stringify(second))
       mediaReason='image-state-changing-during-sampling';
     }catch{mediaReason='sampling-error'}
     try{
      const finalHtml=await page.content();
      if(finalHtml!==html){
       html=finalHtml;stable=false;mediaReason='dom-changed-during-sampling';
       visibility={method:VIS.METHOD,status:'unavailable',
        checkedAt:now(),reason:'dom-changed-during-sampling'};
      }
     }catch{
      stable=false;mediaReason='dom-changed-during-sampling';
      visibility={method:VIS.METHOD,status:'unavailable',
       checkedAt:now(),reason:'dom-changed-during-sampling'};
     }
     if(!mediaReason&&mediaObservation?.status==='unavailable')
      mediaReason=MEDIA.REASONS.includes(mediaObservation.reason)?
       mediaObservation.reason:'sampling-error';
     let media;
     if(!mediaReason){
      try{
       media={method:MEDIA.METHOD,status:'observed',checkedAt:now(),
        htmlSha256:sha(html),counts:mediaObservation.counts};
       MEDIA.assertObservation(media,sha(html));
      }catch{mediaReason='sampling-error'}
     }
     if(mediaReason)media={method:MEDIA.METHOD,status:'unavailable',
      checkedAt:now(),reason:mediaReason};
     record.captures[device]={method:'rendered-dom',html,htmlSha256:sha(html),
      requestUrl:target,responseUrl:page.url(),status:response.status(),
      viewport:{width:WIDTHS[device],height:HEIGHTS[device]},
      collectedAt:now(),blockedRequests,blockedReasons,pageErrors,stableMarkup:stable,
      serverResponseSha256,matchesOriginalHttpBody,visibility,media};
    }finally{if(context)await context.close();}
   }
   evidence.pages.push(record);
  }
  assertV2(evidence,input.httpRawSha256);
  return evidence;
 }finally{if(browser)await browser.close();}
}
function defaultLauncher(chromePath){
 const fs=require('node:fs');
 const options=[chromePath,process.env.STAGE3_CHROME,'/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser']
  .filter(Boolean),chrome=options.find(x=>typeof x==='string'&&fs.existsSync(x));
 if(!chrome)fail('installed Chrome/Chromium required; use STAGE3_CHROME or --chrome');
 let playwright;
 try{playwright=require('../../../cms/editor/node_modules/playwright-core')}
 catch{try{playwright=require('playwright-core')}catch{fail('playwright-core is not installed in this checkout')}}
 return async(base,pin)=>playwright.chromium.launch({executablePath:chrome,headless:true,
  chromiumSandbox:true,
  args:['--no-proxy-server','--disable-background-networking','--no-first-run',
   '--disable-default-apps','--disable-extensions','--disable-sync','--disable-quic',
   '--disable-features=UseDnsHttpsSvcb,UseDnsHttps',
   '--host-resolver-rules=MAP '+base.hostname+' '+pin.address+', EXCLUDE localhost']});
}
module.exports=Object.freeze({FORMAT,WIDTHS,HEIGHTS,DEVICES,MAX_REQUESTS_PER_VIEW,BLOCK_REASONS,verify,selectPages,assertV2,capture,defaultLauncher});
