'use strict';
// Explicit read-only public HTTPS GET capture. No POST, JS, cookies, form
// submission, automatic deploy or redirect following. DNS is resolved once
// and pinned to a vetted public IP; TLS remains hostname-verified.
const https=require('node:https');
const crypto=require('node:crypto');
const dns=require('node:dns').promises;
const net=require('node:net');
const DELIVERY=require('./delivery-evidence.cjs');
const LIMIT_HTML=450000,LIMIT_ROBOTS=250000,LIMIT_SITEMAP=750000,LIMIT_REDIRECT=4096;
const MAX_TOTAL=36000000;
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const HEADER_ALLOW=new Set(['content-type','content-length','content-language','cache-control',
 'etag','last-modified','location','x-robots-tag','content-security-policy',
 'x-content-type-options','referrer-policy','strict-transport-security','server']);
/* A conservative public-only allowlist. Reject every IPv4 special-use range
   relevant to SSRF, including TEST-NET, benchmarking, NAT and shared space,
   and IPv6 transition/tunnel/documentation/benchmark prefixes. For every DNS
   answer a single unsafe address fails capture, even if another is public. */
function isPublicIp(ip){
 const family=net.isIP(ip);
 if(family===4){
  const [a,b,c]=ip.split('.').map(Number);
  if(a===0||a===10||a===127||a>=224||
     a===100&&b>=64&&b<=127||a===169&&b===254||
     a===172&&b>=16&&b<=31||a===192&&b===168||
     a===192&&b===0||a===192&&b===88&&c===99||
     a===198&&b>=18&&b<=19||
     a===198&&b===51&&c===100||
     a===203&&b===0&&c===113)
   return false;
  return true;
 }
 if(family===6){
  const parts=ip.toLowerCase().split(':'),first=parseInt(parts[0]||'0',16);
  const second=parseInt(parts[1]||'0',16);
  if(first<0x2000||first>0x3fff||ip.includes('%')||
     first===0x2002|| // 6to4: embeds arbitrary IPv4 addresses.
     first===0x3fff|| // IPv6 documentation/benchmark reservation.
     first===0x2001&&(second<=0x01ff||second===0x0db8))
   return false;
  return true;
 }
 return false;
}
function origin(raw,siteId){
 if(typeof raw!=='string')throw Error('Explicit public HTTPS origin required');
 let url;
 try{url=new URL(raw);}catch{throw Error('Invalid public HTTPS origin');}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
    url.port&&url.port!=='443'||net.isIP(url.hostname)||
    !/^[a-z0-9.-]+$/i.test(url.hostname)||!url.hostname.includes('.')||
    /(?:^|\.)(?:localhost|local|internal|test|example|invalid)$/.test(url.hostname)||
    !['/','/published/'+siteId+'/'].includes(url.pathname))
  throw Error('Only explicit DNS-based HTTPS:443 public site root or matching CMS mount is permitted');
 return url;
}
async function address(host){
 const resolved=await dns.lookup(host,{all:true,verbatim:true});
 if(!resolved.length||resolved.length>50||resolved.some(r=>!isPublicIp(r.address)))
  throw Error('Public HTTPS host resolves to blocked, private or mixed public/private IPs');
 const preferred=resolved.find(r=>r.family===4)||resolved[0];
 return Object.freeze({address:preferred.address,family:preferred.family});
}
function request(target,pinned,max){
 return new Promise((resolve,reject)=>{
  const url=new URL(target);
  const req=https.request({
   hostname:url.hostname,port:443,protocol:'https:',path:url.pathname,
   method:'GET',timeout:12000,rejectUnauthorized:true,servername:url.hostname,
   agent:false,
   lookup:(_host,_options,callback)=>callback(null,pinned.address,pinned.family),
   headers:{Accept:'text/html,text/plain,application/xml','Accept-Encoding':'identity',
    'User-Agent':'AI-Site-CMS-Public-SEO-ReadOnly/1.0'}
  },res=>{
   const status=res.statusCode||0;
   if(status<100||status>599){res.resume();reject(Error('Invalid public HTTP status'));return;}
   if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){
    res.resume();reject(Error('Public compressed body unsupported for bounded evidence'));return;
   }
   const chunks=[];let count=0;
   res.on('data',x=>{count+=x.length;
    if(count>max){res.destroy(Error('Public HTTP response exceeds bounded byte limit'));return;}
    chunks.push(x);
   });
   res.on('error',reject);
   res.on('end',()=>{
    const bytes=Buffer.concat(chunks),body=bytes.toString('utf8');
    if(body.includes('\uFFFD')||Buffer.byteLength(body,'utf8')!==bytes.length){
     reject(Error('Public HTTP response is not valid UTF-8'));return;
    }
    const headers={};
    for(const [key,v] of Object.entries(res.headers)){
     if(!HEADER_ALLOW.has(key)||v===undefined)continue;
     const value=Array.isArray(v)?v.join(', '):String(v);
     if(value.length<4000&&!/[\x00-\x1f\x7f]/.test(value))headers[key]=value;
    }
    resolve(Object.freeze({status,body,headers,contentType:headers['content-type']||'',
     location:headers.location||''}));
   });
  });
  req.on('timeout',()=>req.destroy(Error('Public HTTPS GET timed out')));
  req.on('error',reject);
  req.end();
 });
}
const resource=(url,path)=>new URL(url.pathname+path.replace(/^\//,''),url.origin).href;
async function capture(site,rawOrigin,transport={address,request}){
 if(!site||!Array.isArray(site.pages)||site.pages.length<1||site.pages.length>60||
    !Array.isArray(site.redirects||[])||(site.redirects||[]).length>60||
    typeof site.siteId!=='string')
  throw Error('Public HTTPS capture requires a bounded and validated published Site v1');
 const base=origin(rawOrigin,site.siteId);
 const pinned=await transport.address(base.hostname);
 if(!pinned||!isPublicIp(pinned.address))
  throw Error('Pinned public HTTPS DNS resolution failed safety checks');
 const fetch=async(url,limit)=>{
  const u=new URL(url);
  if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname)||u.search||u.hash)
   throw Error('Read-only public HTTP capture escaped explicitly approved origin/mount');
  const response=await transport.request(url,pinned,limit);
  total+=Buffer.byteLength(response.body,'utf8');
  if(total>MAX_TOTAL)throw Error('Public HTTP evidence exceeded total byte limit');
  return response;
 };
 let total=0;const pages=[],redirects=[];
 for(const page of site.pages){
  if(!ROUTE.test(page.path))throw Error('Invalid published Site v1 route');
  const requestUrl=resource(base,page.path);
  const reply=await fetch(requestUrl,LIMIT_HTML);
  pages.push({id:page.id,path:page.path,requestUrl,responseUrl:requestUrl,
   status:reply.status,headers:reply.headers,html:reply.body});
 }
 // Negative-route probe detects soft-404s / SPA fallbacks that return 200 for
 // nonexistent paths. Never submit forms, follow redirects or store response HTML.
 const missingPath='/cms-seo-nonexistent-'+site.siteId+'/';
 if(site.pages.some(p=>p.path===missingPath)||(site.redirects||[]).some(x=>x.from===missingPath))
  throw Error('Negative-route audit path unexpectedly collides with a published Site v1 route');
 const missingUrl=resource(base,missingPath),missingReply=await fetch(missingUrl,LIMIT_HTML);
 const negativeProbe={path:missingPath,requestUrl:missingUrl,status:missingReply.status,
  contentType:missingReply.contentType,
  bodySha256:crypto.createHash('sha256').update(missingReply.body,'utf8').digest('hex')};
 const robotsUrl=resource(base,'/robots.txt'),sitemapUrl=resource(base,'/sitemap.xml');
 const robotsReply=await fetch(robotsUrl,LIMIT_ROBOTS);
 const sitemapReply=await fetch(sitemapUrl,LIMIT_SITEMAP);
 for(const alias of site.redirects||[]){
  if(!ROUTE.test(alias.from)||!ROUTE.test(alias.to))
   throw Error('Invalid published source route alias');
  const requestUrl=resource(base,alias.from);
  const reply=await fetch(requestUrl,LIMIT_REDIRECT);
  redirects.push({from:alias.from,requestUrl,status:reply.status,location:reply.location});
 }
 const evidence={format:DELIVERY.FORMAT,siteId:site.siteId,
  origin:base.href,capturedAt:new Date().toISOString(),pages,negativeProbe,
  robots:{status:robotsReply.status,url:robotsUrl,contentType:robotsReply.contentType,body:robotsReply.body},
  sitemap:{status:sitemapReply.status,url:sitemapUrl,contentType:sitemapReply.contentType,body:sitemapReply.body},
  redirects};
 DELIVERY.assertEvidence(evidence);
 return Object.freeze({evidence,bytes:total,requests:pages.length+redirects.length+3,
  captureActuallyPerformed:true,publicHttpsTransportChecked:true,
  servedRevisionAuthenticated:false,formsDelivered:false,automaticRelease:false});
}

// HEAD requests validate public media status and content headers without a
// potentially large download. A successful HEAD is NOT image-byte integrity.
function requestHead(target,pinned){
 return new Promise((resolve,reject)=>{
  const url=new URL(target);
  const req=https.request({hostname:url.hostname,port:443,protocol:'https:',
   path:url.pathname,method:'HEAD',timeout:12000,rejectUnauthorized:true,
   servername:url.hostname,agent:false,
   lookup:(_host,_options,cb)=>cb(null,pinned.address,pinned.family),
   headers:{Accept:'image/*,video/mp4','Accept-Encoding':'identity',
    'User-Agent':'AI-Site-CMS-Public-SEO-ReadOnly/1.0'}},res=>{
   const status=res.statusCode||0;
   if(status<100||status>599){res.resume();reject(Error('Invalid HTTPS media HEAD status'));return;}
   const type=String(res.headers['content-type']||'').slice(0,150);
   const rawLength=res.headers['content-length'];
   const len=rawLength!==undefined&&/^\d+$/.test(String(rawLength))?
    Number(rawLength):null;
   res.resume();res.on('end',()=>resolve({
    status,contentType:type,
    ...(len!==null&&Number.isSafeInteger(len)?{contentLength:len}:{})
   }));
   res.on('error',reject);
  });
  req.on('timeout',()=>req.destroy(Error('Public HTTPS HEAD timed out')));
  req.on('error',reject);req.end();
 });
}
async function captureMedia(site,rawOrigin,transport={address,requestHead}){
 if(!site||!Array.isArray(site.assets)||site.assets.length>300||!site.siteId)
  throw Error('Public media HEAD requires a validated and bounded published site');
 const base=origin(rawOrigin,site.siteId),pinned=await transport.address(base.hostname);
 if(!pinned||!isPublicIp(pinned.address))
  throw Error('Public media HEAD DNS resolution is not a safe public IP');
 const resources=[],unsupportedHeadAssets=[];
 // Only original Site v1 assets are part of the existing media-delivery
 // transcript. Responsive variant GET bytes are checked by local PHP capture.
 for(const asset of site.assets){
  if(typeof asset.id!=='string'||typeof asset.src!=='string'||
     !/^\/assets\/[a-z][a-z0-9-]{2,79}\.(png|jpg|webp|mp4)$/.test(asset.src))
   throw Error('Invalid current Site v1 media inventory path');
  const url=resource(base,asset.src);
  const target=new URL(url);
  if(target.origin!==base.origin||!target.pathname.startsWith(base.pathname))
   throw Error('Public asset URL escaped approved origin/mount');
  const found=await transport.requestHead(url,pinned);
  if(!Number.isInteger(found.status)||found.status<100||found.status>599||
     typeof found.contentType!=='string'||found.contentType.length>150)
   throw Error('Public media HEAD returned malformed response');
  if(found.status===405||found.status===501){
   unsupportedHeadAssets.push(asset.id);continue; // HEAD unavailable does not prove GET failed.
  }
  resources.push({assetId:asset.id,url,status:found.status,
   contentType:found.contentType,
   ...(Number.isSafeInteger(found.contentLength)&&found.contentLength>=0?
      {contentLength:found.contentLength}:{})});
 }
 const evidence={format:'manufact-seo-media-evidence-v1',
  siteId:site.siteId,origin:base.href,
  completeness:unsupportedHeadAssets.length?'partial':'complete',resources};
 return Object.freeze({evidence,requests:resources.length+unsupportedHeadAssets.length,
  unsupportedHeadAssetIds:Object.freeze(unsupportedHeadAssets),headActuallyPerformed:true,
  bodyBytesDownloaded:0,mediaShaVerified:false,publicHttpsTransportChecked:true,
  servedRevisionAuthenticated:false,automaticRelease:false});
}

/* Streaming bounded public GET. Only a content digest/metadata is retained;
   no image/video bytes are buffered, written or included in output. */
function requestDigest(target,pinned,max=12000000){
 if(!Number.isSafeInteger(max)||max<1||max>12000000)
  throw Error('Invalid public binary GET resource bound');
 return new Promise((resolve,reject)=>{
  const url=new URL(target);
  if(url.protocol!=='https:'||!isPublicIp(pinned?.address)||url.username||url.password||
     url.search||url.hash)
   return reject(Error('Invalid or unsafe public media GET target'));
  let settled=false;
  const finish=(error,value)=>{
   if(settled)return;
   settled=true;error?reject(error):resolve(value);
  };
  const req=https.request({
   hostname:url.hostname,port:443,protocol:'https:',path:url.pathname,
   method:'GET',timeout:15000,rejectUnauthorized:true,servername:url.hostname,
   agent:false,
   lookup:(_host,_options,callback)=>callback(null,pinned.address,pinned.family),
   headers:{Accept:'image/*,video/mp4','Accept-Encoding':'identity',
    'User-Agent':'AI-Site-CMS-Public-SEO-ReadOnly/1.0'}
  },res=>{
   const status=res.statusCode||0,type=String(res.headers['content-type']||'').slice(0,150);
   if(status<100||status>599){res.destroy();return finish(Error('Invalid public binary HTTP status'));}
   const encoding=String(res.headers['content-encoding']||'identity');
   if(encoding!=='identity'){res.destroy();return finish(Error('Public media content encoding unsupported for byte integrity'));}
   const digest=crypto.createHash('sha256');let bytes=0;
   const reported=res.headers['content-length'];
   if(reported!==undefined&&/^\d+$/.test(String(reported))&&Number(reported)>max){
    res.destroy();return finish(Error('Public media Content-Length exceeds per-resource limit'));
   }
   res.on('data',chunk=>{
    bytes+=chunk.length;
    if(bytes>max){res.destroy();return finish(Error('Public binary GET exceeded permitted bytes'));}
    digest.update(chunk);
   });
   res.on('error',e=>finish(e));
   res.on('end',()=>finish(null,Object.freeze({
    status,contentType:type,bodyBytes:bytes,bodySha256:digest.digest('hex'),
    // Redirects are never followed. A 301 body is not the original image.
    redirected:status>=300&&status<400
   })));
  });
  req.on('timeout',()=>req.destroy(Error('Public binary GET timed out')));
  req.on('error',e=>finish(e));req.end();
 });
}
module.exports=Object.freeze({origin,isPublicIp,address,request,requestHead,requestDigest,capture,captureMedia});
