'use strict';
// Local read-only media acceptance from the actual PHP published asset endpoint.
// Immutable source remains sealed; HTTP bytes are retained and SHA-checked on import.
// Never connect to public/CDN hosts; the collector uses only 127.0.0.1.
const crypto=require('node:crypto');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const PUBLISHER=require('./publisher-media.cjs');
const HTML=require('./html-evidence.cjs');
const MEDIA=require('./media-delivery.cjs');
const FORMAT='manufact-seo-local-php-media-v1';
const SHA=/^[a-f0-9]{64}$/;
const MAX_TOTAL=100000000;
const RE=/^\/assets\/([a-z][a-z0-9-]{2,79})\.(png|jpg|webp|mp4)$/;
const mimeFor={png:'image/png',jpg:'image/jpeg',webp:'image/webp',mp4:'video/mp4'};
const sha=buf=>crypto.createHash('sha256').update(buf).digest('hex');
function imageValid(bytes,mime){
 if(mime==='image/png')
  return bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&
   bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0;
 if(mime==='image/jpeg')return bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==='image/webp')return bytes.length>=16&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(mime==='video/mp4')return bytes.length>=12&&bytes.toString('ascii',4,8)==='ftyp';
 return false;
}
function inventory(site,base){
 if(!site||!Array.isArray(site.assets)||site.assets.length>300||
    typeof base!=='string'||!base.startsWith('http://127.0.0.1:'))
  throw Error('Local media inventory requires a bounded site and explicit loopback base');
 const records=[],used=new Set();
 for(const asset of site.assets){
  const parts=[{id:asset.id,src:asset.src,mime:asset.mime,sha256:null,kind:'original',width:asset.width,height:asset.height},
   ...(asset.variants||[]).map(v=>({id:v.id,src:v.src,mime:asset.mime,sha256:v.sha256,kind:'variant',width:v.width,height:v.height}))];
  if(parts.length>4)throw Error('Too many responsive media variants');
  for(const part of parts){
   const match=RE.exec(part.src||'');
   if(!match||part.id!==match[1]||mimeFor[match[2]]!==part.mime||
      used.has(part.id)||!part.id)throw Error('Local published media path/ID/MIME contract mismatch: '+part.id);
   used.add(part.id);
   const index=records.length,file='asset-'+String(index+1).padStart(4,'0')+'.bin';
   const url=new URL(part.src.slice(1),base);
   if(url.origin!==new URL(base).origin||!url.pathname.startsWith(new URL(base).pathname))
    throw Error('Local media escaped published site mount');
   records.push({id:part.id,src:part.src,mime:part.mime,variantOf:part.kind==='variant'?asset.id:null,
    expectedSha256:part.sha256,url:url.href,file,
    width:part.width||null,height:part.height||null,
    maxBytes:part.mime==='video/mp4'?12000000:1200000});
  }
 }
 if(records.length>1200)throw Error('Too many local published media resources');
 return Object.freeze(records.map(r=>Object.freeze(r)));
}
function get(url,max){
 return new Promise((resolve,reject)=>{
  const req=http.get({hostname:'127.0.0.1',port:Number(url.port),path:url.pathname,agent:false,
   timeout:10000,headers:{Accept:'image/avif,image/webp,image/*,video/mp4',
    'Accept-Encoding':'identity','User-Agent':'AI-Site-CMS-SEO-Local-Review/1.0'}},res=>{
    const status=res.statusCode;
    if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){
     res.resume();reject(Error('Compressed PHP binary media unsupported'));return;
    }
    const chunks=[];let count=0;
    res.on('data',v=>{count+=v.length;if(count>max){res.destroy(Error('PHP media GET exceeds per-asset byte limit'));return;}chunks.push(v);});
    res.on('error',reject);
    res.on('end',()=>resolve({
     status,bytes:Buffer.concat(chunks),
     contentType:String(res.headers['content-type']||'').slice(0,150),
     etag:String(res.headers.etag||'').slice(0,150)
    }));
  });
  req.on('timeout',()=>req.destroy(Error('Local PHP media GET timed out')));
  req.on('error',reject);
 });
}
async function acquire(site,base){
 const inventoryItems=inventory(site,base),received=[];let bytes=0;
 for(const item of inventoryItems){
  const reply=await get(new URL(item.url),item.maxBytes);
  bytes+=reply.bytes.length;
  if(bytes>MAX_TOTAL)throw Error('Local PHP media GET total bytes exceed 100 MB; collect smaller validated batch');
  received.push({file:item.file,bytes:reply.bytes,record:{
   file:item.file,id:item.id,src:item.src,url:item.url,variantOf:item.variantOf,
   status:reply.status,contentType:reply.contentType,etag:reply.etag,
   length:reply.bytes.length,sha256:sha(reply.bytes)
  }});
 }
 return {manifest:{format:FORMAT,assets:received.map(x=>x.record)},files:received,totalBytes:bytes};
}
// Actual PHP media consumers include responsive picture sources, video/poster
// assets and DesignGraph CSS backgroundMedia as well as ordinary img tags.
function displayedMedia(site,base,snapshot,inventoryItems){
 const known=new Map(inventoryItems.map(x=>[x.url,x.id]));
 const referenced=new Map(),untracked=new Map();
 const mount=new URL(base).pathname;
 const srcset=value=>typeof value==='string'?value.split(',').map(p=>p.trim().split(/\s+/)[0]).filter(Boolean):[];
 const cssUrls=css=>{
  const urls=[],pattern=/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]+))\s*\)/gi;
  for(const match of css.matchAll(pattern))urls.push(match[1]??match[2]??match[3]);
  return urls;
 };
 for(const page of snapshot?.pages||[]){
  const pageUrl=new URL(page.path.slice(1),base),html=HTML.inspect(page.html),raw=[];
  for(const image of html.images){
   if(image.src)raw.push(image.src);
   raw.push(...srcset(image.srcset));
  }
  for(const source of html.sources||[]){
   if(source.src)raw.push(source.src);
   raw.push(...srcset(source.srcset));
  }
  for(const video of html.videos||[]){
   if(video.poster)raw.push(video.poster);
   if(video.src)raw.push(video.src);
  }
  const css=[...(html.inlineStyles||[])];
  for(const match of page.html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi))
   css.push(match[1]);
  for(const text of css)raw.push(...cssUrls(text));
  for(const src of raw){
   try{
    const url=new URL(src,pageUrl);
    if(url.search||url.hash)continue;
    const id=known.get(url.href);
    if(id){
     if(!referenced.has(id))referenced.set(id,new Set());
     referenced.get(id).add(page.id);
    }else if(url.pathname.startsWith(mount+'assets/')&&
             ['http:','https:'].includes(url.protocol)){
     // An actual site-scoped PHP reference without sealed inventory must not
     // pass simply because the downloader only requests declared assets.
     const key=page.id+'|'+url.href;
     if(!untracked.has(key))untracked.set(key,{
      pageId:page.id,url:url.href.slice(0,240)
     });
    }
   }catch{/* Dynamic or invalid URLs need separate browser scrutiny. */}
  }
 }
 return {referenced,untracked:[...untracked.values()]};
}
function inspect(site,base,manifest,root,snapshot=null,publicOrigin=null){
 if(!manifest||manifest.format!==FORMAT||!Array.isArray(manifest.assets))
  throw Error('Invalid local PHP media evidence manifest');
 const expected=inventory(site,base);
 if(manifest.assets.length!==expected.length)throw Error('Local media evidence coverage does not match source Site v1');
 let totalBytes=0;const issues=[],resources=[];
 const selectedOg=PUBLISHER.inventory(site);
 const ogAssets=new Set(selectedOg.map(p=>p.asset?.id).filter(Boolean));
 const observed=displayedMedia(site,base,snapshot,expected);
 const markup=observed.referenced;
 const byPage=new Map(site.pages.map(p=>[p.id,p.path]));
 const add=(code,severity,assetId,message,extra={})=>{
  const pageId=extra.pageId||[...(markup.get(assetId)||[])][0]||
   selectedOg.find(p=>p.asset?.id===assetId)?.pageId||null;
  issues.push(Object.freeze({code,severity,assetId,pageId,path:byPage.get(pageId)||null,message,
   evidence:'hash-checked-local-php-media',automatic:false,...extra}));
 };
 for(const item of observed.untracked)
  add('php-media:untracked-rendered-reference','error',null,
   'Published PHP HTML references media under its site mount absent from sealed Site v1.',
   {pageId:item.pageId,observedUrl:item.url});
 const nameSet=new Set();
 for(let i=0;i<expected.length;i++){
  const src=expected[i],item=manifest.assets[i],file=src.file;
  if(!item||typeof item!=='object'||Array.isArray(item)||
     Object.keys(item).some(k=>!['file','id','src','url','variantOf','status','contentType','etag','length','sha256'].includes(k))||
     item.file!==file||item.id!==src.id||item.src!==src.src||
     item.url!==src.url||item.variantOf!==src.variantOf||
     !Number.isInteger(item.status)||item.status<100||item.status>599||
     typeof item.contentType!=='string'||item.contentType.length>150||
     typeof item.etag!=='string'||item.etag.length>150||
     !Number.isInteger(item.length)||item.length<0||item.length>src.maxBytes||
     !SHA.test(item.sha256)||nameSet.has(file))
    throw Error('Invalid local PHP media response manifest for '+src.id);
  nameSet.add(file);
  const pathname=path.join(root,file);
  if(fs.lstatSync(pathname).isSymbolicLink())throw Error('Symlinked PHP media evidence file');
  const real=fs.realpathSync(pathname);
  if(!real.startsWith(root+path.sep))throw Error('PHP media evidence escaped output');
  const stat=fs.statSync(real);
  if(!stat.isFile()||stat.size!==item.length)throw Error('PHP media evidence byte length mismatch');
  totalBytes+=stat.size;
  if(totalBytes>MAX_TOTAL)throw Error('PHP media evidence exceeds total byte limit');
  const bytes=fs.readFileSync(real);
  if(sha(bytes)!==item.sha256)throw Error('PHP media evidence byte digest mismatch');
  const expectedMime=src.mime,actualMime=item.contentType.split(';')[0].trim().toLowerCase();
  const referencedPageIds=Object.freeze([...(markup.get(src.id)||[])]);
  const critical=ogAssets.has(src.id)||referencedPageIds.length>0;
  if(item.status!==200)add('php-media:non-200',critical?'error':'warning',src.id,
   'Published PHP media endpoint did not return HTTP 200.',{status:item.status});
  if(item.status===200&&actualMime!==expectedMime)
   add('php-media:mime-mismatch',critical?'error':'warning',src.id,
    'HTTP media Content-Type differs from Site v1 declaration.',{expected:expectedMime,observed:actualMime});
  if(item.status===200&&expectedMime==='image/png'&&imageValid(bytes,expectedMime)&&
    ((src.width!==null&&bytes.readUInt32BE(16)!==src.width)||
     (src.height!==null&&bytes.readUInt32BE(20)!==src.height)))
   add('php-media:png-dimension-drift','error',src.id,
    'Actual published PNG dimensions differ from declared Site v1 dimensions.',
    {expectedWidth:src.width,expectedHeight:src.height,
     actualWidth:bytes.readUInt32BE(16),actualHeight:bytes.readUInt32BE(20)});
  if(item.status===200&&!imageValid(bytes,expectedMime))
   add('php-media:invalid-media-bytes',critical?'error':'warning',src.id,
    'Actual PHP media bytes do not have the expected PNG/JPEG/WebP/MP4 header.');
  if(item.status===200&&src.expectedSha256&&item.sha256!==src.expectedSha256)
   add('php-media:variant-sha-drift','error',src.id,
    'Responsive variant body SHA256 differs from sealed Site v1 bytes.',{expected:src.expectedSha256,observed:item.sha256});
  if(item.status===200&&item.etag!==('"'+item.sha256+'"'))
   add('php-media:etag-sha-drift',critical?'error':'warning',src.id,
    'Immutable PHP media ETag is missing or differs from actual HTTP bytes.',{etag:item.etag});
  const r=Object.freeze({assetId:src.id,variantOf:src.variantOf,status:item.status,
   mime:actualMime,expectedMime,bodySha256:item.sha256,bodyBytes:item.length,
   etag:item.etag,ogImageAsset:ogAssets.has(src.id),renderedPageIds:referencedPageIds});
  resources.push(r);
 }
 for(const p of snapshot?.pages||[]){
  const selected=selectedOg.find(x=>x.pageId===p.id);
  if(!selected?.asset)continue;
  const imageTags=MEDIA.metaTags(p.html).filter(x=>x.property==='og:image');
  const expectedPath='/published/'+site.siteId+selected.asset.src;
  if(!imageTags.length){
   add('php-media:og-meta-absent',publicOrigin?'error':'recommendation',selected.asset.id,
    'Published PHP HTML omitted og:image for a selected image; verify public origin and publisher state.',{pageId:p.id});
  }
  for(const tag of imageTags){
   let url;
   try{url=new URL(tag.url);}catch{/* handled below */}
   const correctSchemeAndHost=Boolean(url&&(
     (publicOrigin&&url.origin===publicOrigin&&
       (url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))||
     (!publicOrigin&&url.protocol==='https:')
   ));
   if(!correctSchemeAndHost||url.username||url.password||url.search||url.hash||
      url.pathname!==expectedPath)
    add('php-media:og-html-url-drift','error',selected.asset.id,
     'Captured PHP og:image URL does not match selected published image path and HTTPS scheme.',
     {pageId:p.id,expectedPath,observedUrl:tag.url.slice(0,240)});
  }
 }
 const problems=issues.filter(x=>x.severity==='error');
 return Object.freeze({format:FORMAT,siteId:site.siteId,readOnly:true,
  capturedResources:resources.length,sourceResources:expected.length,
  fullyCaptured:resources.length===expected.length,
  savedBodyBytes:totalBytes,resources:Object.freeze(resources),
  findings:Object.freeze(issues),criticalCount:problems.length,
  verifiedLocalHttpBytes:true,publicHttpsProven:false,
  sourceBuildAuthenticated:false,visualQualityVerified:false,
  releaseAuthorized:false,
  limitations:'Exact saved bytes from loopback PHP only. Rendered media references cover img/picture/source, video poster/src and static CSS url() in HTML, not JavaScript-injected DOM or browser visibility. Does not verify externally deployed HTTPS, served Site v1 revision, responsive behavior or client approval.'});
}
module.exports=Object.freeze({FORMAT,inventory,get,acquire,inspect,imageValid});
