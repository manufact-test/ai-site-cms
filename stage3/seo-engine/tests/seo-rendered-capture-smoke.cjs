'use strict';
/* Real Node, synthetic original site, completely mocked browser/no network. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const CAP=require('../lib/seo-rendered-capture.cjs');
const QA=require('../lib/seo-rendered-content-audit.cjs');
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
function adapter(drift=false,flood=false){
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
      let target;
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
      },url:()=>target,content:async()=>html(blueprint.pages.find(p=>absolute(p.path)===target)),
      waitForTimeout:async()=>{}};
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
 assert.equal(review.summary.fullyComparedPages,blueprint.pages.length);
 assert(review.findings.some(f=>f.code==='rendered:blocked-browser-requests'));
 assert.equal(review.originalHttpBytePinnedInRenderedCapture,true);
 const stale=await CAP.capture(input,adapter(true));
 const staleReview=QA.analyze({blueprint,blueprintRawSha256:hash(json(blueprint)),
  site,siteRawSha256:hash(json(site)),capture:http,captureRawSha256:sha,
  viewports:stale,viewportsRawSha256:hash(json(stale)),expectedBase:origin});
 assert.equal(staleReview.summary.fullyComparedPages,0);
 assert(staleReview.findings.some(f=>f.code==='rendered:browser-http-body-drift'));
 assert.equal(staleReview.summary.browserResponseMatchedPairs,0);
 assert.equal(staleReview.summary.browserResponseDriftPairs,blueprint.pages.length*3);
 const saturated=await CAP.capture(input,adapter(false,true));
 assert(saturated.pages.every(p=>Object.values(p.captures).every(
  v=>v.blockedRequests>=14&&v.blockedReasons.requestBudget>=11)));
 assert.equal(saturated.pages.length,blueprint.pages.length);
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
  const result=await CLI.main(['--blueprint',bpPath,'--site',sitePath,
   '--public-http',httpPath,'--origin',origin,'--out',out],adapter());
  assert.equal(result.pages,blueprint.pages.length);
  const raw=fs.readFileSync(path.join(out,'rendered-viewport-evidence-v2.json'),'utf8');
  assert.equal(CAP.assertV2(JSON.parse(raw),hash(json(http))).pages.length,blueprint.pages.length);
  const receipt=JSON.parse(fs.readFileSync(path.join(out,'RENDERED-CAPTURE-RECEIPT.json')));
  assert.equal(receipt.renderedCaptureSha256,hash(raw));
  assert.equal(receipt.releaseAuthorized,false);
  await assert.rejects(()=>CLI.main(['--blueprint',bpPath,'--site',sitePath,
   '--public-http',httpPath,'--origin',origin,'--out',out],adapter()),/already exists/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 process.stdout.write('Real Node mocked Chromium rendered SEO source capture smoke PASS.\n');
})().catch(e=>{console.error(e);process.exitCode=1});
