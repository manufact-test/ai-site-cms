/* Stage 1 ONLY — generated real media, upload boundary and Chromium playback.
 * Research harness, not a production uploader, transcoder, AV scan or CMS. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const http=require('node:http'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright-core');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'Chrome is required');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stage1-real-media-'));
function mediaCommand(args){const x=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8',timeout:25000});assert.equal(x.status,0,'ffmpeg media fixture failed: '+x.stderr)}
const variants={
 'image.png':{type:'image/png',magic:b=>b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))},
 'image.jpg':{type:'image/jpeg',magic:b=>b.subarray(0,3).equals(Buffer.from('ffd8ff','hex'))},
 'motion.webm':{type:'video/webm',magic:b=>b.subarray(0,4).equals(Buffer.from('1a45dfa3','hex'))}
};
const requests={media:[],upload:[],denied:0,slowAborted:0};
let server,browser;
const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
async function capture(req,cap){const chunks=[];let bytes=0;for await(const b of req){bytes+=b.length;if(bytes>cap)return {tooLarge:true,bytes};chunks.push(b)}return {bytes,buffer:Buffer.concat(chunks)}}
async function handler(req,res){
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; media-src 'self'; frame-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; object-src 'none'"});
  res.end('<!doctype html><title>Local media probe</title><input id="upload" type="file"><img id="image" src="/media/image.png"><video id="video" muted playsinline preload="auto" src="/media/motion.webm"></video><iframe id="sandbox" sandbox="allow-scripts" src="/preview"></iframe>');
  return;
 }
 if(req.method==='GET'&&url.pathname==='/preview'){
  // A sandboxed frame has an opaque origin; use a precise absolute media source, not wildcard.
  const origin='http://127.0.0.1:'+server.address().port;
  res.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':"default-src 'none'; script-src 'nonce-stage1fixture'; img-src "+origin+"; media-src "+origin+"; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors "+origin,'X-Content-Type-Options':'nosniff'});
  res.end('<!doctype html><img id="sandbox-image" src="'+origin+'/media/image.jpg"><video muted playsinline preload="auto" id="sandbox-video" src="'+origin+'/media/motion.webm"></video><script nonce="stage1fixture">document.body.dataset.script="executed";parent.postMessage({kind:"media-frame-ready"},"*")</script>');
  return;
 }
 if(req.method==='GET'&&url.pathname.startsWith('/media/')){
  const key=url.pathname.slice('/media/'.length),v=variants[key];
  if(!v){requests.denied++;reply(res,404,{error:'not-found'});return}
  requests.media.push(key);
  res.writeHead(200,{'Content-Type':v.type,'Content-Length':v.body.length,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Accept-Ranges':'none'});res.end(v.body);return;
 }
 if(req.method==='GET'&&url.pathname==='/slow'){
  const timer=setTimeout(()=>{if(!res.destroyed)reply(res,200,{late:true})},550);
  res.on('close',()=>{clearTimeout(timer);if(!res.writableEnded)requests.slowAborted++});return;
 }
 if(req.method==='POST'&&url.pathname==='/upload'){
  const ct=(req.headers['content-type']||'').toLowerCase();
  let name;try{name=decodeURIComponent(req.headers['x-file-name']||'')}catch{name=''}
  const item=variants[name],limit=ct==='video/webm'?100000:65536;
  if(!item||item.type!==ct||name.includes('/')||name.includes('\\')){requests.upload.push({name,status:415});reply(res,415,{error:'unsupported-type-name'});req.resume();return}
  const result=await capture(req,limit);
  if(result.tooLarge){requests.upload.push({name,status:413});reply(res,413,{error:'too-large'});return}
  if(!item.magic(result.buffer)){requests.upload.push({name,status:422});reply(res,422,{error:'signature-mismatch'});return}
  const hash=crypto.createHash('sha256').update(result.buffer).digest('hex');
  requests.upload.push({name,status:201,bytes:result.bytes,hash});
  // No persistence or promotion to publicly served /media; deliberate draft/publish separation.
  reply(res,201,{ok:true,name,bytes:result.bytes,sha256:hash});return;
 }
 requests.denied++;reply(res,404,{error:'not-found'});
}
async function run(){
 mediaCommand(['-f','lavfi','-i','color=c=red:s=64x48:r=1','-frames:v','1','-threads','1',path.join(dir,'image.png')]);
 mediaCommand(['-f','lavfi','-i','color=c=blue:s=64x48:r=1','-frames:v','1','-threads','1',path.join(dir,'image.jpg')]);
 mediaCommand(['-f','lavfi','-i','testsrc=size=64x48:rate=5','-t','1','-an','-c:v','libvpx','-b:v','75k','-threads','1',path.join(dir,'motion.webm')]);
 for(const [key,value] of Object.entries(variants)){value.body=fs.readFileSync(path.join(dir,key));assert.ok(value.magic(value.body));assert.ok(value.body.length<65000,key+' not small enough for probe')}
 server=http.createServer((req,res)=>{handler(req,res).catch(err=>{if(!res.headersSent)reply(res,500,{error:'internal'});console.error(err)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage();const errors=[],blocked=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',r=>blocked.push({url:r.url(),failure:r.failure()?.errorText}));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/');
 await page.waitForFunction(()=>document.querySelector('img').complete);
 assert.deepEqual(await page.locator('#image').evaluate(i=>({ok:i.naturalWidth>0,w:i.naturalWidth,h:i.naturalHeight})),{ok:true,w:64,h:48});
 await page.waitForFunction(()=>document.querySelector('#video').readyState>=1,{timeout:15000});
 const video=await page.locator('#video').evaluate(async v=>{await v.play();return {w:v.videoWidth,h:v.videoHeight,duration:v.duration,paused:v.paused}});
 assert.equal(video.w,64);assert.equal(video.h,48);assert.ok(video.duration>0);assert.equal(video.paused,false);
 await page.frameLocator('#sandbox').locator('#sandbox-image').waitFor();
 await page.waitForFunction(()=>document.querySelector('#sandbox')?.contentWindow!==null);
 await page.frameLocator('#sandbox').locator('body').evaluate(async b=>{await new Promise((resolve,reject)=>{const i=b.querySelector('img');if(i.complete)return i.naturalWidth?resolve():reject(Error('bad img'));i.onload=resolve;i.onerror=reject});});
 assert.equal(await page.frameLocator('#sandbox').locator('#sandbox-image').evaluate(x=>x.naturalWidth),64);
 await page.frameLocator('#sandbox').locator('#sandbox-video').evaluate(v=>new Promise((resolve,reject)=>{if(v.readyState>=1)return resolve();v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',reject,{once:true})}));
 assert.equal(await page.frameLocator('#sandbox').locator('#sandbox-video').evaluate(v=>v.videoWidth),64);
 assert.equal(await page.frameLocator('#sandbox').locator('body').getAttribute('data-script'),'executed');
 assert.equal(await page.frameLocator('#sandbox').locator('body').evaluate(()=>{try{return parent.document.body.tagName}catch{return 'cross-origin-blocked'}}),'cross-origin-blocked');
 const upload=async(name,type,buffer)=>{
  await page.locator('#upload').setInputFiles({name,mimeType:type,buffer});
  return page.locator('#upload').evaluate(async e=>{const f=e.files[0];const response=await fetch('/upload',{method:'POST',headers:{'Content-Type':f.type,'X-File-Name':encodeURIComponent(f.name)},body:f});return {status:response.status,data:await response.json()}});
 };
 for(const name of Object.keys(variants)){
  const v=variants[name],result=await upload(name,v.type,v.body);
  assert.equal(result.status,201,name);
  assert.equal(result.data.bytes,v.body.length);
  assert.equal(result.data.sha256,crypto.createHash('sha256').update(v.body).digest('hex'));
 }
 const wrongMagic=await upload('image.png','image/png',Buffer.from('<svg onload="alert(1)"></svg>'));assert.equal(wrongMagic.status,422);
 const wrongMime=await upload('image.png','image/jpeg',variants['image.png'].body);assert.equal(wrongMime.status,415);
 const oversized=await upload('image.png','image/png',Buffer.concat([variants['image.png'].body,Buffer.alloc(70000)]));assert.equal(oversized.status,413);
 const forbidden=await upload('payload.svg','image/svg+xml',Buffer.from('<svg><script>alert(1)</script></svg>'));assert.equal(forbidden.status,415);
 const traversal=await upload('../image.png','image/png',variants['image.png'].body);assert.equal(traversal.status,415);
 const notFound=await page.evaluate(async()=>{const r=await fetch('/media/missing.png');return r.status});assert.equal(notFound,404);
 const abort=await page.evaluate(async()=>{const c=new AbortController();setTimeout(()=>c.abort(),80);try{await fetch('/slow',{signal:c.signal});return 'resolved'}catch(e){return e.name}});
 assert.equal(abort,'AbortError');
 const maliciousNetwork=await page.evaluate(async()=>{const i=new Image();i.src='https://attacker.invalid/beacon.png';document.body.append(i);await new Promise(r=>setTimeout(r,130));return {complete:i.complete,width:i.naturalWidth}});
 assert.equal(maliciousNetwork.width,0);
 assert.ok(requests.slowAborted>=1);
 assert.ok(requests.media.includes('image.png')&&requests.media.includes('image.jpg')&&requests.media.includes('motion.webm'));
 assert.deepEqual(requests.upload.map(x=>x.status),[201,201,201,422,415,413,415,415]);
 assert.deepEqual(errors,[]);
 console.log('STAGE1_REAL_MEDIA='+JSON.stringify({pass:true,generatedOnRunner:true,types:Object.fromEntries(Object.entries(variants).map(([k,v])=>[k,v.body.length])),realVideoMetadata:video,opaqueFrameImageAndVideo:true,opaqueFrameParentBlocked:true,acceptedUploads:3,rejectedUploads:5,serverNotFound:true,clientAbort:true,slowAborted:requests.slowAborted,externalImageBlockedByCsp:maliciousNetwork.width===0,uploadedContentNotPublished:true,pageErrors:errors.length,limits:'Small synthetic real files; NOT production file-security, AV scanning, media transformations, large videos, long playback, browser matrix, storage or shared hosting'}));
 await page.close();
}
run().catch(e=>{console.error('STAGE1_REAL_MEDIA_FAIL',e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));fs.rmSync(dir,{force:true,recursive:true})});
