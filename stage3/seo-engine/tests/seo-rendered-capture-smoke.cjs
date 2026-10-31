'use strict';
/* Real Node, synthetic original site, completely mocked browser/no network. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const CAP=require('../lib/seo-rendered-capture.cjs');
const QA=require('../lib/seo-rendered-content-audit.cjs');
const RESPONSIVE=require('../lib/seo-browser-responsive-observation.cjs');
const TIMING=require('../lib/seo-browser-timing-observation.cjs');
const TEXT=require('../lib/seo-browser-text-footprint.cjs');
const CLI=require('../bin/capture-rendered-public.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const json=v=>JSON.stringify(v,null,2)+'\n';
const blueprint=BP.checkBlueprint(JSON.parse(fs.readFileSync(
 path.join(__dirname,'../fixtures/industrial.blueprint.json'),'utf8')));
const site={format:'manufact-ai-site-v1',schemaVersion:1,siteId:blueprint.siteId,
 pages:blueprint.pages.map(p=>({id:p.id,path:p.path,seo:{...p.seo},sections:[]})),redirects:[]};
const origin='https://site.example.org/';
const absolute=p=>origin+p.slice(1);
function html(p){
 const links=[...p.links.map(x=>x.toPath),...p.sections.filter(x=>x.cta)
  .map(x=>blueprint.pages.find(a=>a.id===x.cta.toPageId).path)];
 return '<!doctype html><html lang="ru"><head><title>Original</title>'+
  '<meta name="description" content="Synthetic snippet"><meta name="robots" content="index">'+
  '<link rel="canonical" href="'+absolute(p.path)+'"></head><body><main>'+
  p.sections.map(s=>'<h'+s.level+'>'+s.heading+'</h'+s.level+'>').join('')+
  links.map(dest=>'<a href="'+absolute(dest)+'">Link</a>').join('')+'</main></body></html>';
}
const http={format:'manufact-seo-delivery-evidence-v1',siteId:site.siteId,origin,
 pages:blueprint.pages.map(p=>({id:p.id,path:p.path,status:200,headers:{'content-type':'text/html'},
 requestUrl:absolute(p.path),responseUrl:absolute(p.path),html:html(p)}))};
const sha=hash(json(http)),input={blueprint,site,http,httpRawSha256:sha,expectedOrigin:origin};
let blocked=0,allowed=0,websocketClosed=0,browserClosed=0;
function adapter(drift=false,flood=false,options={}){
 return {resolve:async()=>({address:'8.8.8.8',family:4}),now:()=>new Date('2026-10-30T20:00:00Z').toISOString(),
  launch:async(_base,pin)=>{
   assert.equal(pin.address,'8.8.8.8');
   return {close:async()=>{browserClosed++},newContext:async opts=>{
    assert.equal(opts.javaScriptEnabled,true);assert.equal(opts.serviceWorkers,'block');
    assert.equal(opts.acceptDownloads,false);assert.equal(opts.ignoreHTTPSErrors,false);
    let handler;
    return {addInitScript:async(fn)=>{assert.equal(typeof fn,'function')},
     routeWebSocket:async(_pattern,fn)=>{await fn({close:()=>{websocketClosed++}})},
     route:async(_pattern,fn)=>{handler=fn},
     newPage:async()=>{
      let target,contentCalls=0,textSamples=0,timingSamples=0;
      async function request(url,method,navigation){
       let permitted;
       await handler({request:()=>({url:()=>url,method:()=>method,
        isNavigationRequest:()=>navigation}),
        continue:()=>{permitted=true;allowed++},
        abort:()=>{permitted=false;blocked++}});
       return permitted;
      }
      return {on:()=>{},goto:async url=>{
       target=url;
       assert(await request(url,'GET',true));
       assert.equal(await request(url,'POST',false),false);
       assert.equal(await request('https://untrusted.example/', 'GET',false),false);
       assert.equal(await request('https://site.example.org/unapproved/','GET',true),false);
       if(flood)for(let i=0;i<90;i++)
        await request('https://site.example.org/public-resource-'+i+'.css','GET',false);
       return {status:()=>200,text:async()=>html(blueprint.pages.find(p=>absolute(p.path)===target))+
        (drift?'<!-- changed server response -->':'')};
      },url:()=>target,content:async()=>{
       contentCalls++;
       return html(blueprint.pages.find(p=>absolute(p.path)===target))+
        (options.lateDomChange&&contentCalls>=7?'<!-- changed late during text observation -->':'');
      },
      evaluate:async(fn,targets)=>{
       assert.equal(typeof fn,'function');
       if(fn===TEXT.sample){textSamples++;return {status:'observed',counts:{
        mainRegions:1,mainRawTextChars:400,mainRenderedTextChars:350,
        mainRenderedWords:50+(options.changingText?textSamples%2:0),
        textBlocks:5,visibleTextBlocks:5,hiddenTextBlocks:0}}}
       if(fn===TIMING.sample){timingSamples++;return {status:'observed',counts:{
        responseStartMs:250,responseEndMs:300,domContentLoadedMs:440,
        loadEventEndMs:620,firstContentfulPaintMs:510,
        resourceCount:12+(options.changingTiming?timingSamples%2:0),
        resourceTransferBytes:12000}}}
       if(fn===RESPONSIVE.sample){
        assert.equal(targets.width,opts.viewport.width);
        return {status:'observed',counts:{
         viewportMetaPresent:1,viewportMetaDeviceWidth:1,
         viewportMetaMultiple:0,viewportMetaFixedWidth:0,
         viewportMetaZoomRestricted:0,horizontalOverflowPx:0,
         prominentVisible:3,prominentClipped:0,
         interactiveVisible:2,interactiveUnder24:0,interactiveUnder44:0,
         interactiveMissingName:0,
         textBlocksVisible:1,textBlocksUnder12:0,largeFixedOverlayCandidates:0}};
       }
       if(!Array.isArray(targets)){
        assert.equal(targets.width,opts.viewport.width);
        return {status:'observed',counts:{
         total:2,visible:2,visibleFailed:0,visiblePending:0,
         aboveFold:1,aboveFoldLazy:1,largeAboveFold:1,
         largeAboveFoldFailed:0,largeAboveFoldLazy:1,
         visibleMissingAlt:1,visibleEmptyAlt:0,
         visibleMissingDimensions:1,visibleUpscaled:0}};
       }
       const p=blueprint.pages.find(p=>absolute(p.path)===target);
       const h1=p.sections.filter(x=>x.level===1).length;
       const secondary=p.sections.filter(x=>x.level>1).length;
       return {status:'observed',h1:{total:h1,layoutVisible:h1,visiblyExcluded:0},
        main:{total:1,layoutVisible:1,visiblyExcluded:0},
        secondaryHeadings:{total:secondary,layoutVisible:secondary,visiblyExcluded:0},
        routes:targets.map(t=>({path:t.path,anchors:1,layoutVisible:1,visiblyExcluded:0}))};
      },waitForTimeout:async()=>{}};
     },close:async()=>{}};
   }};
  }};
}
(async()=>{
 const data=await CAP.capture(input,adapter());
 assert.equal(data.format,CAP.FORMAT);
 assert.equal(data.pages.length,blueprint.pages.length);
 assert.equal(data.pages[0].captures.mobile.htmlSha256,
  hash(data.pages[0].captures.mobile.html));
 assert.equal(data.publicCaptureRawSha256,sha);
 assert(data.pages.every(p=>Object.values(p.captures).every(v=>v.matchesOriginalHttpBody)));
 assert.equal(data.sourceRevisionAuthenticated,false);
 assert(data.pages.every(p=>Object.values(p.captures).every(v=>v.stableMarkup)));
 assert(data.pages.every(p=>Object.values(p.captures).every(v=>
  v.blockedReasons.unsafeMethod===1&&v.blockedReasons.offOrigin===1&&
  v.blockedReasons.unapprovedNavigation===1&&v.blockedReasons.requestBudget===0)));
 assert.equal(blocked,blueprint.pages.length*3*3);
 assert.equal(allowed,blueprint.pages.length*3);
 assert.equal(websocketClosed,blueprint.pages.length*3);
 assert.equal(browserClosed,1);
 const review=QA.analyze({blueprint,blueprintRawSha256:hash(json(blueprint)),
  site,siteRawSha256:hash(json(site)),capture:http,captureRawSha256:sha,
  viewports:data,viewportsRawSha256:hash(json(data)),expectedBase:origin});
 assert.equal(review.summary.P0,0);
 assert.equal(review.summary.cssInspectedDevicePairs,blueprint.pages.length*3);
 assert.equal(review.summary.cssHiddenH1DevicePairs,0);
 assert.equal(review.summary.mediaObservedDevicePairs,blueprint.pages.length*3);
 assert.equal(review.summary.responsiveObservedPairs,blueprint.pages.length*3);
 assert.equal(review.summary.timingObservedPairs,blueprint.pages.length*3);
 assert.equal(review.summary.textObservedPairs,blueprint.pages.length*3);
 assert.equal(review.summary.textMobileLossPages,0);
 assert.equal(review.summary.timingSlowPaintPairs,0);
 assert.equal(review.summary.responsiveOverflowPairs,0);
 assert.equal(review.summary.mediaAboveFoldLazy,blueprint.pages.length*3);
 assert.equal(review.summary.mediaVisibleMissingAlt,blueprint.pages.length*3);
 assert.equal(review.summary.fullyComparedPages,blueprint.pages.length);
 assert(review.findings.some(f=>f.code==='rendered:blocked-browser-requests'));
 assert.equal(review.summary.publishedGraphObservedScopes,1,
  'blocked browser resources make DOM link-graph scope unknown even when source body matches');
 assert.equal(review.summary.publishedGraphStrongOrphans,0,
  'resource-blocked v2 capture cannot prove orphaned published routes');
 assert.equal(review.originalHttpBytePinnedInRenderedCapture,true);
 const changingText=await CAP.capture(input,adapter(false,false,{changingText:true}));
 assert(changingText.pages.every(p=>Object.values(p.captures).every(v=>
  v.textFootprint.status==='unavailable'&&
  v.textFootprint.reason==='text-changing-during-sampling'&&v.stableMarkup)));
 const changingTiming=await CAP.capture(input,adapter(false,false,{changingTiming:true}));
 assert(changingTiming.pages.every(p=>Object.values(p.captures).every(v=>
  v.timing.status==='unavailable'&&
  v.timing.reason==='timing-changing-during-sampling'&&v.stableMarkup)));
 const changedLate=await CAP.capture(input,adapter(false,false,{lateDomChange:true}));
 assert(changedLate.pages.every(p=>Object.values(p.captures).every(v=>
  !v.stableMarkup&&v.visibility.status==='unavailable'&&v.media.status==='unavailable'&&
  v.responsive.status==='unavailable'&&v.timing.status==='unavailable'&&
  v.textFootprint.status==='unavailable')));
 const lateReview=QA.analyze({blueprint,blueprintRawSha256:hash(json(blueprint)),
  site,siteRawSha256:hash(json(site)),capture:http,captureRawSha256:sha,
  viewports:changedLate,viewportsRawSha256:hash(json(changedLate)),expectedBase:origin});
 assert.equal(lateReview.summary.fullyComparedPages,0);
 const responsiveBroken=structuredClone(data);
 Object.assign(responsiveBroken.pages[0].captures.mobile.responsive.counts,{
  viewportMetaPresent:0,viewportMetaDeviceWidth:0,
  horizontalOverflowPx:65,prominentClipped:1,
  interactiveUnder24:1,interactiveUnder44:1,textBlocksUnder12:1,
  largeFixedOverlayCandidates:1});
 const responsiveReport=QA.analyze({blueprint,blueprintRawSha256:hash(json(blueprint)),
  site,siteRawSha256:hash(json(site)),capture:http,captureRawSha256:sha,
  viewports:responsiveBroken,viewportsRawSha256:hash(json(responsiveBroken)),expectedBase:origin});
 for(const code of ['rendered:viewport-meta-missing','rendered:page-horizontal-overflow',
  'rendered:prominent-content-clipped','rendered:tiny-interactive-targets',
  'rendered:tiny-reading-text','rendered:large-fixed-overlay-candidates'])
  assert(responsiveReport.findings.some(f=>f.code===code&&f.device==='mobile'),code);
 assert.equal(responsiveReport.summary.responsiveOverflowPairs,1);
 assert.equal(responsiveReport.summary.responsiveOverflowMaxPx,65);
 const performanceSlow=structuredClone(data);
 Object.assign(performanceSlow.pages[0].captures.mobile.timing.counts,{
  responseStartMs:1900,responseEndMs:2100,domContentLoadedMs:3200,
  loadEventEndMs:9200,firstContentfulPaintMs:3400,resourceCount:110});
 const slowReport=QA.analyze({blueprint,blueprintRawSha256:hash(json(blueprint)),
  site,siteRawSha256:hash(json(site)),capture:http,captureRawSha256:sha,
  viewports:performanceSlow,viewportsRawSha256:hash(json(performanceSlow)),expectedBase:origin});
 for(const code of ['rendered:slow-browser-response-candidate',
  'rendered:slow-browser-paint-candidate','rendered:slow-browser-load-candidate',
  'rendered:many-browser-resources'])
  assert(slowReport.findings.some(f=>f.code===code&&f.device==='mobile'),code);
 assert.equal(slowReport.summary.timingSlowPaintPairs,1);
 const emptyText=structuredClone(data);
 Object.assign(emptyText.pages[0].captures.mobile.textFootprint.counts,{
  mainRawTextChars:400,mainRenderedTextChars:0,mainRenderedWords:0,
  textBlocks:5,visibleTextBlocks:0,hiddenTextBlocks:5});
 const emptyReport=QA.analyze({blueprint,blueprintRawSha256:hash(json(blueprint)),
  site,siteRawSha256:hash(json(site)),capture:http,captureRawSha256:sha,
  viewports:emptyText,viewportsRawSha256:hash(json(emptyText)),expectedBase:origin});
 for(const code of ['rendered:visible-main-text-empty','rendered:all-body-text-blocks-hidden',
  'rendered:main-text-mobile-loss-candidate'])
  assert(emptyReport.findings.some(f=>f.code===code&&f.device==='mobile'),code);
 assert.equal(emptyReport.summary.textEmptyMainPairs,1);
 assert.equal(emptyReport.summary.textMobileLossPages,1);
 const stale=await CAP.capture(input,adapter(true));
 const staleReview=QA.analyze({blueprint,blueprintRawSha256:hash(json(blueprint)),
  site,siteRawSha256:hash(json(site)),capture:http,captureRawSha256:sha,
  viewports:stale,viewportsRawSha256:hash(json(stale)),expectedBase:origin});
 assert.equal(staleReview.summary.fullyComparedPages,0);
 assert(staleReview.findings.some(f=>f.code==='rendered:browser-http-body-drift'));
 assert.equal(staleReview.summary.browserResponseMatchedPairs,0);
 assert.equal(staleReview.summary.browserResponseDriftPairs,blueprint.pages.length*3);
 const single=await CAP.capture(input,{...adapter(),pageIds:[blueprint.pages[0].id]});
 assert.equal(single.pages.length,1);
 assert.equal(single.pages[0].id,blueprint.pages[0].id);
 const singleReport=QA.analyze({blueprint,blueprintRawSha256:hash(json(blueprint)),
  site,siteRawSha256:hash(json(site)),capture:http,captureRawSha256:sha,
  viewports:single,viewportsRawSha256:hash(json(single)),expectedBase:origin});
 assert.equal(singleReport.summary.plannedPages,blueprint.pages.length);
 assert.equal(singleReport.summary.fullyComparedPages,1);
 assert.equal(singleReport.summary.browserResponseMatchedPairs,3);
 assert.equal(singleReport.summary.browserResponseDriftPairs,0);
 assert.throws(()=>CAP.selectPages(CAP.verify(input),['not-approved-id']),/approved Blueprint/);
 assert.throws(()=>CAP.selectPages(CAP.verify(input),
  [blueprint.pages[0].id,blueprint.pages[0].id]),/distinct approved/);
 const saturated=await CAP.capture(input,adapter(false,true));
 assert(saturated.pages.every(p=>Object.values(p.captures).every(
  v=>v.blockedRequests>=14&&v.blockedReasons.requestBudget>=11)));
 assert.equal(saturated.pages.length,blueprint.pages.length);
 const imageTampered=structuredClone(data);
 imageTampered.pages[0].captures.desktop.media.htmlSha256='f'.repeat(64);
 assert.throws(()=>CAP.assertV2(imageTampered,sha),/snapshot/);
 const legacyImage=structuredClone(data);
 for(const p of legacyImage.pages)for(const v of Object.values(p.captures))delete v.media;
 assert.equal(CAP.assertV2(legacyImage,sha).pages.length,blueprint.pages.length);
 const responsiveTampered=structuredClone(data);
 responsiveTampered.pages[0].captures.desktop.responsive.htmlSha256='f'.repeat(64);
 assert.throws(()=>CAP.assertV2(responsiveTampered,sha),/rendered DOM|snapshot/);
 const legacyResponsive=structuredClone(data);
 for(const p of legacyResponsive.pages)for(const v of Object.values(p.captures))delete v.responsive;
 assert.equal(CAP.assertV2(legacyResponsive,sha).pages.length,blueprint.pages.length);
 const timingTampered=structuredClone(data);
 timingTampered.pages[0].captures.desktop.timing.counts.loadEventEndMs=10;
 assert.throws(()=>CAP.assertV2(timingTampered,sha),/timing order/);
 const legacyTiming=structuredClone(data);
 for(const p of legacyTiming.pages)for(const v of Object.values(p.captures))delete v.timing;
 assert.equal(CAP.assertV2(legacyTiming,sha).pages.length,blueprint.pages.length);
 const textTampered=structuredClone(data);
 textTampered.pages[0].captures.mobile.textFootprint.counts.visibleTextBlocks=200;
 assert.throws(()=>CAP.assertV2(textTampered,sha),/text count subsets/);
 const legacyText=structuredClone(data);
 for(const p of legacyText.pages)for(const v of Object.values(p.captures))delete v.textFootprint;
 assert.equal(CAP.assertV2(legacyText,sha).pages.length,blueprint.pages.length);
 const cssTampered=structuredClone(data);
 cssTampered.pages[0].captures.mobile.visibility.htmlSha256='f'.repeat(64);
 assert.throws(()=>CAP.assertV2(cssTampered,sha),/snapshot/);
 const legacyCss=structuredClone(data);
 for(const p of legacyCss.pages)for(const v of Object.values(p.captures))delete v.visibility;
 assert.equal(CAP.assertV2(legacyCss,sha).pages.length,blueprint.pages.length);
 const tampered=structuredClone(data);
 tampered.pages[0].captures.desktop.html+='changed';
 assert.throws(()=>CAP.assertV2(tampered,sha),/tampered|invalid/);
 assert.throws(()=>CAP.assertV2(data,'f'.repeat(64)),/different original HTTP/);
 const wrong=structuredClone(http);wrong.pages.pop();
 assert.throws(()=>CAP.verify({...input,http:wrong}),/complete approved/);
 assert.throws(()=>CAP.verify({...input,expectedOrigin:'https://another.example.org/'}),/origin differs/);
 await assert.rejects(()=>CAP.capture(input,{...adapter(),
  resolve:async()=>({address:'127.0.0.1',family:4})}),/public IPv4/);
 await assert.rejects(()=>CAP.capture(input,{resolve:adapter().resolve,
  launch:async()=>({close:async()=>{},newContext:async()=>({
   route:async()=>{},addInitScript:async()=>{},newPage:async()=>{},close:async()=>{}})})}),/WebSocket/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-chromium-render-seo-'));
 try{
  const put=(name,x)=>{const p=path.join(dir,name);fs.writeFileSync(p,json(x));return p;};
  const bpPath=put('blueprint.json',blueprint),sitePath=put('site.json',site),
   httpPath=put('http.json',http),out=path.join(dir,'captured');
  const offlineOut=path.join(dir,'offline-preflight');
  const offline=await CLI.main(['--blueprint',bpPath,'--site',sitePath,
   '--public-http',httpPath,'--origin',origin,'--out',offlineOut,
   '--page-ids',blueprint.pages[0].id,'--mode','preflight'],{
   resolve:()=>{throw Error('preflight must not resolve DNS')},
   launch:()=>{throw Error('preflight must not open browser')}
  });
  assert.equal(offline.preflight,true);
  assert.equal(offline.pages,1);
  assert.equal(fs.existsSync(offlineOut),false);
  assert.throws(()=>CLI.flags(['--blueprint',bpPath,'--site',sitePath,
   '--public-http',httpPath,'--origin',origin,'--out',offlineOut,
   '--mode','publish']),/Mode must be/);
  const result=await CLI.main(['--blueprint',bpPath,'--site',sitePath,
   '--public-http',httpPath,'--origin',origin,'--out',out],adapter());
  assert.equal(result.pages,blueprint.pages.length);
  const raw=fs.readFileSync(path.join(out,'rendered-viewport-evidence-v2.json'),'utf8');
  assert.equal(CAP.assertV2(JSON.parse(raw),hash(json(http))).pages.length,blueprint.pages.length);
  const receipt=JSON.parse(fs.readFileSync(path.join(out,'RENDERED-CAPTURE-RECEIPT.json')));
  assert.equal(receipt.renderedCaptureSha256,hash(raw));
  assert.equal(receipt.releaseAuthorized,false);
  assert.equal(receipt.partialPilotCapture,false);
  const partial=await CLI.main(['--blueprint',bpPath,'--site',sitePath,
   '--public-http',httpPath,'--origin',origin,'--out',path.join(dir,'partial'),
   '--page-ids',blueprint.pages[0].id],adapter());
  assert.equal(partial.pages,1);
  assert.equal(partial.approvedPages,blueprint.pages.length);
  const partialReceipt=JSON.parse(fs.readFileSync(path.join(dir,'partial',
   'RENDERED-CAPTURE-RECEIPT.json'),'utf8'));
  assert.equal(partialReceipt.partialPilotCapture,true);
  await assert.rejects(()=>CLI.main(['--blueprint',bpPath,'--site',sitePath,
   '--public-http',httpPath,'--origin',origin,'--out',out],adapter()),/already exists/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 process.stdout.write('Real Node mocked Chromium rendered SEO source capture smoke PASS.\n');
})().catch(e=>{console.error(e);process.exitCode=1});
