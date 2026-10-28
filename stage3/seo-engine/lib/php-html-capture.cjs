'use strict';
// Read-only PHP HTML observation for the FIRST SEALED Stage 3 site.
// Only explicit 127.0.0.1 HTTP mount, no redirects, no execution, no public fetch.
// The result is compatible with the existing SEO HTML snapshot reports.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const BRIDGE=require('./approved-site-bridge.cjs');
const ACCEPTANCE=require('./acceptance.cjs');
const CAPTURE_FORMAT='manufact-seo-loopback-php-html-v1';
const SNAPSHOT_FORMAT='manufact-seo-html-snapshot-v1';
const SHA=/^[a-f0-9]{64}$/;
const MAX_PAGE=450000,MAX_TOTAL=18000000,MAX_PAGES=60;
const accepted=new WeakSet();
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function fail(message){throw Error('SEO PHP HTML capture: '+message);}
function baseUrl(raw,siteId){
 let u;
 try{u=new URL(raw);}catch{fail('invalid origin URL');}
 if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port||
   u.username||u.password||u.search||u.hash||
   u.pathname!=='/published/'+siteId+'/')
  fail('only the explicit 127.0.0.1 published-site mount is supported');
 return u.href;
}
function pageUrl(base,pagePath){
 if(typeof pagePath!=='string'||!/^\/(?:[a-z0-9-]+\/)*$/.test(pagePath))
  fail('unexpected Site v1 page path');
 const address=new URL(pagePath.slice(1),base);
 if(!address.href.startsWith(base)||address.origin!==new URL(base).origin)
  fail('page URL escapes the approved loopback mount');
 return address;
}
function pageName(index){return 'page-'+String(index+1).padStart(3,'0')+'.html';}
function boundedHtml(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<25||bytes.length>MAX_PAGE)
  fail('HTML body missing or too large');
 const html=bytes.toString('utf8');
 if(Buffer.byteLength(html,'utf8')!==bytes.length||html.includes('\uFFFD')||
  !/<!doctype\s+html|<html\b/i.test(html)||!/<head\b/i.test(html)||
  !/<\/head\s*>/i.test(html))
  fail('HTML must be a complete UTF-8 document with head');
 return html;
}
function getHtml(url){
 return new Promise((resolve,reject)=>{
  const req=http.get({
    hostname:'127.0.0.1',port:Number(url.port),path:url.pathname,
    agent:false,timeout:10000,
    headers:{'Accept':'text/html','Accept-Encoding':'identity','User-Agent':'AI-Site-CMS-SEO-Local-Review/1.0'}
  },res=>{
    if(res.statusCode!==200){res.resume();reject(Error('HTTP '+res.statusCode+' at '+url.pathname));return;}
    const ct=String(res.headers['content-type']||'').toLowerCase();
    if(!/^text\/html(?:\s*;|$)/.test(ct)||/charset\s*=\s*(?:"?)(?!utf-8|utf8)/.test(ct)){
      res.resume();reject(Error('Non-UTF-8 HTML Content-Type at '+url.pathname));return;
    }
    if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){
      res.resume();reject(Error('Unexpected compressed HTML response'));return;
    }
    const chunks=[];let n=0;res.on('data',chunk=>{
      n+=chunk.length;if(n>MAX_PAGE){res.destroy(Error('HTML exceeds per-page byte limit'));return;}
      chunks.push(chunk);
    });
    res.on('error',reject);res.on('end',()=>resolve({
      bytes:Buffer.concat(chunks),contentType:ct,status:200
    }));
  });
  req.on('timeout',()=>req.destroy(Error('Loopback HTML GET timed out')));
  req.on('error',reject);
 });
}
function snapshot(site,source,entries,base,capturedAt){
 const pages=Object.freeze(entries.map(({record,bytes})=>Object.freeze({
   id:record.pageId,path:record.path,html:boundedHtml(bytes)
 })));
 return Object.freeze({format:SNAPSHOT_FORMAT,siteId:site.siteId,completeness:'complete',
  pages,source:'local-loopback-published-php-html',
  sourceRevisionAuthenticated:false,localHttpOnly:true});
}
function inspect(manifest,site,source,folder){
 if(!BRIDGE.isVerifiedSource(source)||source.siteId!==site.siteId||
    source.siteRevisionFingerprint!==ACCEPTANCE.fingerprint(site))
  fail('requires the original verified Approved Site v2 source');
 if(!manifest||manifest.format!==CAPTURE_FORMAT||
   manifest.siteId!==site.siteId||manifest.sourceSiteSha256!==source.fileSha256||
   manifest.sourceSiteFingerprint!==source.siteRevisionFingerprint||
   manifest.packageVersion!==source.packageVersion||
   !Array.isArray(manifest.pages)||manifest.pages.length!==site.pages.length||
   typeof manifest.capturedAt!=='string'||
   !/^\d{4}-\d\d-\d\dT/.test(manifest.capturedAt)||
   Number.isNaN(Date.parse(manifest.capturedAt)))
  fail('manifest is not bound to the sealed source');
 baseUrl(manifest.baseUrl,site.siteId);
 const root=fs.realpathSync(folder),seen=new Set(),entries=[];let total=0;
 const allowed=new Set(['manifest.json',...site.pages.map((_,i)=>pageName(i))]);
 const listing=fs.readdirSync(root);
 if(listing.length!==allowed.size||listing.some(name=>!allowed.has(name)))
  fail('unexpected or missing HTML evidence file');
 for(let i=0;i<site.pages.length;i++){
  const p=site.pages[i],record=manifest.pages[i],file=pageName(i);
  if(!record||record.pageId!==p.id||record.path!==p.path||
    record.file!==file||record.url!==pageUrl(manifest.baseUrl,p.path).href||
    record.status!==200||typeof record.contentType!=='string'||
    !/^text\/html(?:\s*;|$)/i.test(record.contentType)||
    !SHA.test(record.sha256)||!Number.isSafeInteger(record.bytes)||
    record.bytes<25||record.bytes>MAX_PAGE||seen.has(file))
   fail('unexpected route/response/filename at page '+p.id);
  seen.add(file);
  const dest=fs.realpathSync(path.resolve(root,file));
  if(!dest.startsWith(root+path.sep))fail('HTML file escaped evidence directory');
  const stat=fs.statSync(dest);
  if(!stat.isFile()||stat.size!==record.bytes)fail('HTML size differs at '+p.id);
  total+=stat.size;if(total>MAX_TOTAL)fail('HTML capture exceeds total budget');
  const bytes=fs.readFileSync(dest);
  if(sha(bytes)!==record.sha256)fail('HTML hash differs at '+p.id);
  boundedHtml(bytes);entries.push({record,bytes});
 }
 const result=Object.freeze({
  format:CAPTURE_FORMAT,siteId:site.siteId,packageVersion:source.packageVersion,
  sourceSiteSha256:source.fileSha256,sourceSiteFingerprint:source.siteRevisionFingerprint,
  capturedAt:manifest.capturedAt,baseUrl:manifest.baseUrl,pageCount:entries.length,
  checkedHtmlBytes:total,sha256VerifiedAtRead:true,
  loopbackHttp200Count:entries.length,sourceRevisionAuthenticated:false,
  realPublicHttpsChecked:false,formsChecked:false,visualParityChecked:false,
  snapshot:snapshot(site,source,entries,manifest.baseUrl,manifest.capturedAt),
  limitations:'Read-only local PHP HTTP 200 and byte-checked HTML. Cannot prove the served revision matches saved Site v1, operator identity, client approval, public HTTPS or successful forms.'
 });
 accepted.add(result);
 return result;
}
function read(folder,site,source){
 const root=fs.realpathSync(folder);
 const file=path.join(root,'manifest.json');
 if(fs.realpathSync(file)!==file)fail('manifest.json must be an ordinary file in evidence folder');
 const stat=fs.statSync(file);
 if(!stat.isFile()||stat.size<50||stat.size>100000)fail('invalid manifest.json');
 return inspect(JSON.parse(fs.readFileSync(file,'utf8')),site,source,root);
}
async function capture(sealedFolder,rawOrigin,output){
 const {site,source}=BRIDGE.load(sealedFolder);
 if(!Array.isArray(site.pages)||!site.pages.length||site.pages.length>MAX_PAGES)
  fail('expected 1–60 Site v1 pages');
 const base=baseUrl(rawOrigin,site.siteId);
 const root=fs.realpathSync(sealedFolder),out=path.resolve(output);
 const parent=fs.realpathSync(path.dirname(out));
 if(parent===root||parent.startsWith(root+path.sep)||
    out===root||out.startsWith(root+path.sep)||fs.existsSync(out))
  fail('capture output must be a new directory outside the immutable sealed package');
 // First acquire every response; do not leave a partial evidence directory
 // when the PHP server is missing, redirects, or a page is malformed.
 const entries=[];let total=0;
 for(let i=0;i<site.pages.length;i++){
  const p=site.pages[i],url=pageUrl(base,p.path);
  const response=await getHtml(url);
  boundedHtml(response.bytes);
  total+=response.bytes.length;if(total>MAX_TOTAL)fail('total HTML budget exceeded');
  entries.push({record:{pageId:p.id,path:p.path,file:pageName(i),
   url:url.href,status:200,contentType:response.contentType,bytes:response.bytes.length,
   sha256:sha(response.bytes)},bytes:response.bytes});
 }
 const manifest={format:CAPTURE_FORMAT,siteId:site.siteId,
  sourceSiteSha256:source.fileSha256,sourceSiteFingerprint:source.siteRevisionFingerprint,
  packageVersion:source.packageVersion,capturedAt:new Date().toISOString(),baseUrl:base,
  pages:entries.map(x=>x.record)};
 fs.mkdirSync(out);
 for(const x of entries)fs.writeFileSync(path.join(out,x.record.file),x.bytes,{flag:'wx'});
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 const imported=read(out,site,source);
 return {output:out,siteId:site.siteId,pages:imported.pageCount,
  bytes:imported.checkedHtmlBytes,localHttp200:imported.loopbackHttp200Count,
  publicHttpsChecked:false,readyToPublish:false};
}
function isVerified(x){return accepted.has(x);}
module.exports=Object.freeze({CAPTURE_FORMAT,capture,read,inspect,isVerified,baseUrl,pageUrl});
