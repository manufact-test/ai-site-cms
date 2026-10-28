'use strict';
// REAL loopback HTTP GET smoke for the SEO capture (no external services).
// The sole mocked dependency is the lead's sealed-v2 preflight, unavailable on
// this worker branch. This is NOT client approval, published-host verification
// or proof of a real operator's screenshot capture.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const vm=require('node:vm'),http=require('node:http'),crypto=require('node:crypto');
const ACCEPTANCE=require('../lib/acceptance.cjs');
const png=Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000','hex');
const responsive=Buffer.from(png);responsive.writeUInt32BE(2,16);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const site={siteId:'pilot-local',title:'Pilot',language:'ru',pages:[
 {id:'page-home',path:'/',title:'Home',seo:{title:'Home',description:'Тест локального PHP',robots:'index'},sections:[{id:'sec-hero',elements:[{values:{'content.media':'asset-banner'}}]}]},
 {id:'page-about',path:'/about/',title:'About',seo:{title:'About',description:'Тест локального PHP',robots:'index'},sections:[]}],
 redirects:[{from:'/old/',to:'/about/'}],
 assets:[{id:'asset-banner',src:'/assets/asset-banner.png',mime:'image/png',alt:'Actual banner',
  variants:[{id:'asset-banner-sm',src:'/assets/asset-banner-sm.png',
   width:2,height:1,sha256:sha(responsive)}]},
 {id:'asset-secondary',src:'/assets/asset-secondary.png',mime:'image/png',alt:'Page image'}]};
const source={siteId:site.siteId,packageVersion:'sealed-v2',
 fileSha256:'a'.repeat(64),siteRevisionFingerprint:ACCEPTANCE.fingerprint(site)};
const code=fs.readFileSync(path.join(__dirname,'../lib/php-html-capture.cjs'),'utf8');
const moduleShim={exports:{}};
vm.runInNewContext(code,{
 module:moduleShim,exports:moduleShim.exports,Buffer,URL,
 require:(name)=>{
  if(name==='./approved-site-bridge.cjs')
   return {load:()=>({site,source}),isVerifiedSource:s=>s===source};
  if(name==='./acceptance.cjs')return ACCEPTANCE;
  if(name.startsWith('./'))return require(path.join(__dirname,'../lib',name.slice(2)));
  return require(name);
 }
},{filename:'php-html-capture.cjs',timeout:2000});
const CAP=moduleShim.exports;
const origin=()=>mode==='dev-origin'?'http://127.0.0.1:'+server.address().port:'https://pilot.example';
const html=(title)=>{
 const route=title==='About'?'about/':'';
 return '<!doctype html><html lang="ru"><head><title>'+title+
  '</title><meta name="description" content="Тест локального PHP">'+
  '<meta property="og:title" content="'+(mode==='bad-metadata'?'Old page':title)+'">'+
  '<meta property="og:description" content="Тест локального PHP">'+
  '<link rel="canonical" href="'+(mode==='bad-canonical'?'https://other.example/':
    origin()+'/published/pilot-local/'+route)+'">'+
  '<meta property="og:url" content="'+(mode==='bad-og-page'?'https://other.example/':
    origin()+'/published/pilot-local/'+route)+'">'+
  '<meta property="og:image" content="'+origin()+'/published/pilot-local/assets/'+
  (mode==='bad-og-url'?'asset-secondary.png':'asset-banner.png')+'"></head>'+
  '<body><h1>'+title+'</h1><a href="/published/pilot-local/about/">About</a>'+
  '<a href="/published/pilot-local/old/">Old route</a>'+
  (mode.startsWith('other-consumers')?
   '<style>.hero{background-image:url("/published/pilot-local/assets/asset-secondary.png")}</style>'+
   '<picture><source media="(max-width:600px)" srcset="/published/pilot-local/assets/asset-secondary.png">'+
   '<img src="/published/pilot-local/assets/asset-banner.png" alt="Fallback"></picture>'+
   '<video poster="/published/pilot-local/assets/asset-secondary.png">'+
   '<source src="/published/pilot-local/assets/asset-secondary.png"></video>':
   mode==='untracked-media'?
   '<picture><source srcset="/published/pilot-local/assets/not-in-site.png">'+
   '<img src="/published/pilot-local/assets/asset-banner.png" alt="Fallback"></picture>':
   '<img src="/published/pilot-local/assets/asset-secondary.png" alt="Secondary">')+
  '</body></html>';
};
let mode='normal',requests=[];
const server=http.createServer((req,res)=>{
 requests.push({url:req.url,method:req.method});
 if(mode==='redirect'){res.writeHead(302,{Location:'https://example.com/'});res.end();return;}
 if(mode==='wrong-type'){res.writeHead(200,{'Content-Type':'text/plain'});res.end(html('Bad'));return;}
 if(mode==='oversize'){res.writeHead(200,{'Content-Type':'text/html'});res.end('x'.repeat(450001));return;}
 if(mode==='incomplete'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>Bad</h1>');return;}
 if(req.url==='/published/pilot-local/assets/asset-banner.png'||
    req.url==='/published/pilot-local/assets/asset-banner-sm.png'||
    req.url==='/published/pilot-local/assets/asset-secondary.png'){
  const original=req.url.endsWith('/asset-banner.png');
  const variant=req.url.endsWith('/asset-banner-sm.png');
  const bytes=variant&&mode!=='bad-variant-bytes'?responsive:png;
  if((mode==='bad-rendered-status'||mode==='other-consumers-bad')&&req.url.endsWith('/asset-secondary.png')){
   res.writeHead(404);res.end('Missing rendered image');return;
  }
  if(mode==='bad-media-status'&&original){res.writeHead(404);res.end('Not found');return;}
  const etag=mode==='bad-media-etag'&&original?'"incorrect"':'"'+sha(bytes)+'"';
  const response=mode==='bad-media-mime'&&original?'text/plain':'image/png';
  res.writeHead(200,{'Content-Type':response,'ETag':etag});
  res.end(bytes);return;
 }
 if(req.url==='/published/pilot-local/robots.txt'){
  if(mode==='no-public-origin'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"STAGE3_PUBLIC_ORIGIN missing"}');return;}
  res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});
  res.end('User-agent: *\nAllow: /\nSitemap: '+origin()+'/published/pilot-local/sitemap.xml\n');return;
 }
 if(req.url==='/published/pilot-local/sitemap.xml'){
  if(mode==='no-public-origin'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"STAGE3_PUBLIC_ORIGIN missing"}');return;}
  res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8'});
  res.end('<?xml version="1.0" encoding="UTF-8"?>'+
   '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
   '<url><loc>'+origin()+'/published/pilot-local/</loc></url>'+
   (mode==='bad-sitemap'?'':'<url><loc>'+origin()+'/published/pilot-local/about/</loc></url>')+'</urlset>');return;
 }
 if(req.url==='/published/pilot-local/old/'){
  res.writeHead(mode==='bad-301'?302:301,{Location:
   mode==='bad-301'?'/published/pilot-local/':'/published/pilot-local/about/'});
  res.end();return;
 }
 if(req.url==='/published/pilot-local/'||req.url==='/published/pilot-local/about/'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',
   'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
   ...(mode==='bad-xrobots'?{'X-Robots-Tag':'noindex,nofollow'}:{})});
  res.end(html(req.url.includes('about')?'About':'Home'));return;
 }
 res.writeHead(404);res.end();
});
async function main(){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'seo-loopback-html-test-'));
 const sealed=path.join(tmp,'sealed');fs.mkdirSync(sealed);
 try{
  await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',e=>e?reject(e):resolve()));
  const base='http://127.0.0.1:'+server.address().port+'/published/pilot-local/';
  assert.equal(CAP.baseUrl(base,site.siteId),base);
  assert.throws(()=>CAP.baseUrl('http://localhost:'+server.address().port+
   '/published/pilot-local/',site.siteId),/127.0.0.1/);
  assert.throws(()=>CAP.baseUrl('https://127.0.0.1:123/published/pilot-local/',site.siteId),/127.0.0.1/);
  assert.throws(()=>CAP.baseUrl('http://127.0.0.1:123/published/different/',site.siteId),/127.0.0.1/);
  assert.equal(CAP.pageUrl(base,'/about/').href,base+'about/');
  assert.throws(()=>CAP.pageUrl(base,'//evil.org/'),/unexpected Site v1 page path/);
  const out=path.join(tmp,'html-01');
  const captured=await CAP.capture(sealed,base,out);
  assert.equal(captured.pages,2);assert.equal(captured.localHttp200,2);
  assert.equal(captured.publicHttpsChecked,false);assert.equal(captured.readyToPublish,false);
  assert.equal(captured.robotsStatus,200);assert.equal(captured.sitemapStatus,200);
  assert.equal(captured.localRedirectsCaptured,1);assert.equal(captured.localSeoFindings,0);
  assert.equal(captured.localMediaAssets,3);assert.equal(captured.localMediaFindings,0);
  assert.equal(captured.localMediaBytes,png.length*2+responsive.length);
  assert.deepEqual(requests.map(x=>x.url),[
   '/published/pilot-local/','/published/pilot-local/about/',
   '/published/pilot-local/robots.txt','/published/pilot-local/sitemap.xml',
   '/published/pilot-local/old/',
   '/published/pilot-local/assets/asset-banner.png',
   '/published/pilot-local/assets/asset-banner-sm.png',
   '/published/pilot-local/assets/asset-secondary.png']);
  assert.ok(requests.every(x=>x.method==='GET'));
  const result=CAP.read(out,site,source);
  assert.equal(CAP.isVerified(result),true);
  assert.equal(result.snapshot.format,'manufact-seo-html-snapshot-v1');
  assert.equal(result.snapshot.completeness,'complete');
  assert.equal(result.snapshot.mountPath,'/published/pilot-local/');
  assert.equal(result.snapshot.sitemapCompleteness,'complete');
  assert.deepEqual([...result.snapshot.sitemapPaths],['/','/about/']);
  assert.equal(result.publication.findings.length,0);
  assert.equal(result.localMedia.capturedResources,3);
  assert.equal(result.localMedia.criticalCount,0);
  assert.equal(result.localHead.findings.length,0);
  assert.equal(result.localHead.pagesWithRecordedHeaders,2);
  assert.equal(result.localHead.publicOriginObservedInSitemap,'https://pilot.example');
  assert.equal(result.localMedia.resources[0].ogImageAsset,true);
  assert.equal(result.localMedia.resources[1].bodySha256,sha(responsive));
  assert.deepEqual([...result.localMedia.resources[2].renderedPageIds],['page-home','page-about']);
  assert.equal(result.localMedia.resources[2].ogImageAsset,false);
  assert.deepEqual([...result.publication.verifiedRedirectPaths],['/old/']);
  assert.deepEqual([...result.snapshot.redirectPaths],['/old/']);
  const audited=require('../lib/analyze.cjs').snapshotAudit(result.snapshot);
  assert.ok(!audited.issues.some(x=>x.code==='html:broken-link'),
   'published mount links are normalized, not mistaken for missing pages');
  assert.equal(result.snapshot.pages[1].path,'/about/');
  assert.match(result.snapshot.pages[0].html,/<title>Home<\/title>/);
  assert.equal(result.realPublicHttpsChecked,false);
  assert.equal(result.sourceRevisionAuthenticated,false);
  const first=path.join(out,'page-001.html'),bytes=fs.readFileSync(first);
  fs.appendFileSync(first,'TAMPERED');
  assert.throws(()=>CAP.read(out,site,source),/HTML size differs|HTML hash differs/);
  fs.writeFileSync(first,bytes);
  const manifest=path.join(out,'manifest.json'),original=fs.readFileSync(manifest);
  const edited=JSON.parse(original);edited.pages.reverse();
  fs.writeFileSync(manifest,JSON.stringify(edited));
  assert.throws(()=>CAP.read(out,site,source),/unexpected route/);
  fs.writeFileSync(manifest,original);
  const other=JSON.parse(original);other.sourceSiteSha256='f'.repeat(64);
  fs.writeFileSync(manifest,JSON.stringify(other));
  assert.throws(()=>CAP.read(out,site,source),/not bound/);
  fs.writeFileSync(manifest,original);
  fs.writeFileSync(path.join(out,'unexpected.txt'),'extra');
  assert.throws(()=>CAP.read(out,site,source),/unexpected or missing HTML evidence file/);
  fs.unlinkSync(path.join(out,'unexpected.txt'));
  assert.equal(CAP.read(out,site,source).pageCount,2);
  const sitemapFile=path.join(out,'sitemap.txt'),savedSitemap=fs.readFileSync(sitemapFile);
  fs.appendFileSync(sitemapFile,'bad');
  assert.throws(()=>CAP.read(out,site,source),/SEO endpoint response size mismatch|content digest mismatch/);
  fs.writeFileSync(sitemapFile,savedSitemap);
  const corruptRedirect=JSON.parse(original);
  corruptRedirect.publication.redirects[0].from='/wrong/';
  fs.writeFileSync(manifest,JSON.stringify(corruptRedirect));
  assert.throws(()=>CAP.read(out,site,source),/redirect path or Location mismatch/);
  fs.writeFileSync(manifest,original);
  mode='bad-301';
  const wrongRedirect=path.join(tmp,'bad-301');
  const badCapture=await CAP.capture(sealed,base,wrongRedirect);
  assert.equal(badCapture.localSeoFindings>0,true,'bad redirect has review findings');
  const badRead=CAP.read(wrongRedirect,site,source);
  assert.ok(badRead.publication.findings.some(x=>x.code==='php-local:redirect-status-drift'));
  assert.ok(badRead.publication.findings.some(x=>x.code==='php-local:redirect-location-drift'));
  assert.equal(badRead.snapshot.redirectPaths,undefined);
  const badAudit=require('../lib/analyze.cjs').snapshotAudit(badRead.snapshot);
  assert.ok(badAudit.issues.some(x=>x.code==='html:broken-link'),
   'unverified bad 301 cannot satisfy a complete HTML link to an old route');
  mode='normal';
  for(const [next,expected] of [['redirect',/HTTP 302/],['wrong-type',/Non-UTF-8 HTML/],
   ['oversize',/per-page byte limit|HTML exceeds/],['incomplete',/complete UTF-8 document/]]){
   mode=next;
   const destination=path.join(tmp,'failed-'+next);
   await assert.rejects(CAP.capture(sealed,base,destination),expected);
   assert.equal(fs.existsSync(destination),false,'no partial output for '+next);
  }
  mode='bad-sitemap';
  const badSitemap=path.join(tmp,'bad-sitemap');
  const sitemapRun=await CAP.capture(sealed,base,badSitemap);
  assert.ok(sitemapRun.localSeoFindings>0);
  assert.ok(CAP.read(badSitemap,site,source).publication.findings
   .some(x=>x.code==='php-local:sitemap-indexable-missing'));
  mode='no-public-origin';
  const noOrigin=path.join(tmp,'no-public-origin');
  const envRun=await CAP.capture(sealed,base,noOrigin);
  assert.equal(envRun.robotsStatus,503);assert.equal(envRun.sitemapStatus,503);
  assert.ok(CAP.read(noOrigin,site,source).publication.findings
   .some(x=>x.code==='php-local:sitemap-http-status'&&x.severity==='error'));
  assert.equal(CAP.read(noOrigin,site,source).snapshot.sitemapCompleteness,undefined,
   'HTTP 503 does not imply a complete sitemap');
  mode='dev-origin';
  const developer=path.join(tmp,'dev-origin');
  await CAP.capture(sealed,base,developer);
  const dev=CAP.read(developer,site,source);
  assert.equal(dev.localHead.developmentOnlyOrigin,true);
  assert.ok(dev.publication.findings.some(x=>x.code==='php-local:development-public-origin'));
  assert.ok(!dev.localHead.findings.some(x=>x.severity==='error'));
  assert.ok(!dev.localMedia.findings.some(x=>x.severity==='error'));
  mode='bad-canonical';
  const canonicalDrift=path.join(tmp,'canonical-drift');
  await CAP.capture(sealed,base,canonicalDrift);
  assert.ok(CAP.read(canonicalDrift,site,source).localHead.findings
   .some(x=>x.code==='php-head:canonical-origin-route-drift'&&x.severity==='error'));
  mode='bad-og-page';
  const socialPageDrift=path.join(tmp,'social-page-drift');
  await CAP.capture(sealed,base,socialPageDrift);
  assert.ok(CAP.read(socialPageDrift,site,source).localHead.findings
   .some(x=>x.code==='php-head:og-url-drift'&&x.severity==='error'));
  mode='bad-xrobots';
  const noindex=path.join(tmp,'xrobots-noindex');
  await CAP.capture(sealed,base,noindex);
  assert.ok(CAP.read(noindex,site,source).localHead.findings
   .some(x=>x.code==='php-head:x-robots-noindex-conflict'&&x.severity==='error'));
  mode='bad-og-url';
  const ogDrift=path.join(tmp,'og-url-drift');
  await CAP.capture(sealed,base,ogDrift);
  assert.ok(CAP.read(ogDrift,site,source).localMedia.findings
   .some(x=>x.code==='php-media:og-html-url-drift'&&x.severity==='error'));
  mode='bad-media-status';
  const badMediaPath=path.join(tmp,'missing-og');
  const badMediaCapture=await CAP.capture(sealed,base,badMediaPath);
  assert.ok(badMediaCapture.localMediaFindings>0);
  assert.ok(CAP.read(badMediaPath,site,source).localMedia.findings
   .some(x=>x.code==='php-media:non-200'&&x.severity==='error'));
  mode='bad-rendered-status';
  const missingRendered=path.join(tmp,'missing-rendered');
  await CAP.capture(sealed,base,missingRendered);
  assert.ok(CAP.read(missingRendered,site,source).localMedia.findings
   .some(x=>x.code==='php-media:non-200'&&x.assetId==='asset-secondary'&&x.severity==='error'));
  mode='bad-variant-bytes';
  const badVariant=path.join(tmp,'wrong-responsive-sha');
  await CAP.capture(sealed,base,badVariant);
  const wrong=CAP.read(badVariant,site,source).localMedia.findings;
  assert.ok(wrong.some(x=>x.code==='php-media:variant-sha-drift'&&x.severity==='error'));
  assert.ok(wrong.some(x=>x.code==='php-media:png-dimension-drift'&&x.severity==='error'));
  mode='bad-media-etag';
  const wrongEtag=path.join(tmp,'wrong-etag');
  await CAP.capture(sealed,base,wrongEtag);
  assert.ok(CAP.read(wrongEtag,site,source).localMedia.findings
   .some(x=>x.code==='php-media:etag-sha-drift'&&x.severity==='error'));
  mode='bad-media-mime';
  const wrongMime=path.join(tmp,'wrong-mime');
  await CAP.capture(sealed,base,wrongMime);
  assert.ok(CAP.read(wrongMime,site,source).localMedia.findings
   .some(x=>x.code==='php-media:mime-mismatch'&&x.severity==='error'));
  mode='normal';
  const mediaFile=path.join(out,'asset-0001.bin'),savedImage=fs.readFileSync(mediaFile);
  fs.appendFileSync(mediaFile,'TAMPER');
  assert.throws(()=>CAP.read(out,site,source),/media evidence byte length mismatch|media evidence byte digest mismatch/);
  fs.writeFileSync(mediaFile,savedImage);
  await assert.rejects(CAP.capture(sealed,base,out),/new directory/);
  // New PHP DesignGraph uses CSS backgrounds, <picture><source> and video poster/source.
  mode='other-consumers';
  const artDir=path.join(tmp,'art-direction');
  await CAP.capture(sealed,base,artDir);
  const art=CAP.read(artDir,site,source).localMedia;
  assert.deepEqual([...art.resources[2].renderedPageIds],['page-home','page-about']);
  mode='other-consumers-bad';
  const brokenArt=path.join(tmp,'broken-art-direction');
  await CAP.capture(sealed,base,brokenArt);
  assert.ok(CAP.read(brokenArt,site,source).localMedia.findings.some(x=>
   x.code==='php-media:non-200'&&x.assetId==='asset-secondary'&&x.severity==='error'));
  mode='untracked-media';
  const alien=path.join(tmp,'untracked-art-direction');
  await CAP.capture(sealed,base,alien);
  assert.ok(CAP.read(alien,site,source).localMedia.findings.some(x=>
   x.code==='php-media:untracked-rendered-reference'&&x.severity==='error'));
  mode='bad-metadata';
  const wrongMeta=path.join(tmp,'stale-published-metadata');
  await CAP.capture(sealed,base,wrongMeta);
  assert.ok(CAP.read(wrongMeta,site,source).localHead.findings.some(x=>
   x.code==='php-head:metadata-drift'&&x.severity==='error'));
  mode='normal';
  console.log('PHP HTML LOOPBACK CAPTURE SMOKE PASS: actual HTML, robots, sitemap, 301, OG/media, responsive picture, CSS background, video poster, untracked media, SHA/MIME/ETag and tamper; no external requests.');
 }finally{
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(tmp,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
