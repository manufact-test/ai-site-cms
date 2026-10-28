'use strict';
// Isolated HTTPS transport checks: no outbound requests, no GET, no POST.
const assert=require('node:assert/strict');
const {isPublicIp,origin,capture,captureMedia}=require('../lib/public-https-capture.cjs');
for(const ip of ['127.0.0.1','10.0.1.1','172.16.0.1','192.168.1.1','169.254.2.1',
 '100.64.0.2','198.51.100.1','203.0.113.9','::1','fc00::1'])
 assert.equal(isPublicIp(ip),false,ip);
for(const ip of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111'])
 assert.equal(isPublicIp(ip),true,ip);
for(const bad of ['http://example.org/','https://localhost/','https://127.0.0.1/',
 'https://example.org:8443/','https://user:pass@example.org/',
 'https://example.org/published/wrong/','https://example.org/?q=1'])
 assert.throws(()=>origin(bad,'pilot'),/public|Only|Invalid/);
assert.equal(origin('https://example.org/published/pilot/','pilot').pathname,'/published/pilot/');
const site={siteId:'pilot',pages:[{id:'home',path:'/'},{id:'about',path:'/about/'}],
 redirects:[{from:'/old/',to:'/about/'}]};
const called=[];
const transport={
 address:async()=>({address:'1.1.1.1',family:4}),
 request:async(url,_pinned,_max)=>{
  called.push(url);
  if(url.endsWith('/old/'))return {status:301,body:'',headers:{location:'/about/'},location:'/about/',contentType:'text/html'};
  if(url.endsWith('/sitemap.xml'))return {status:200,body:'<urlset></urlset>',headers:{'content-type':'application/xml'},contentType:'application/xml',location:''};
  if(url.endsWith('/robots.txt'))return {status:200,body:'User-agent: *\nAllow: /\n',headers:{'content-type':'text/plain'},contentType:'text/plain',location:''};
  return {status:200,body:'<!doctype html><html><head></head><body>Page</body></html>',
   headers:{'content-type':'text/html'},contentType:'text/html',location:''};
 }
};
(async()=>{
 const result=await capture(site,'https://example.org/published/pilot/',transport);
 assert.equal(result.requests,5);
 assert.equal(result.evidence.pages.length,2);
 assert.equal(result.evidence.redirects[0].status,301);
 assert.ok(called.every(x=>x.startsWith('https://example.org/published/pilot/')));
 assert.equal(result.servedRevisionAuthenticated,false);
 const mediaSource={siteId:'pilot',assets:[{id:'asset-photo',src:'/assets/asset-photo.png'}]};
 const head=await captureMedia(mediaSource,'https://example.org/published/pilot/',{
  address:transport.address,requestHead:async()=>({status:405,contentType:'text/html'})
 });
 assert.equal(head.requests,1);
 assert.equal(head.evidence.completeness,'partial');
 assert.equal(head.evidence.resources.length,0);
 assert.equal(head.unsupportedHeadAssetIds[0],'asset-photo');
 console.log('Public HTTPS pinned-host capture focused smoke PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
