'use strict';
// Actual pure comparison in Node; no network or CMS writes.
const assert=require('node:assert/strict');
const {compare,FORMAT}=require('../lib/public-static-parity.cjs');
const site={siteId:'pilot-site',language:'ru',pages:[
 {id:'page-home',path:'/',seo:{robots:'index'},sections:[]},
 {id:'page-about',path:'/about/',seo:{robots:'index'},sections:[]}],
 assets:[{id:'asset-main',src:'/assets/asset-main.png',mime:'image/png',variants:[]}],
 redirects:[{from:'/old/',to:'/about/'}]};
const html=(text,canonical)=>'<!doctype html><html lang="ru"><head><title>Demo</title>'+
 '<meta name="description" content="Sample summary"><link rel="canonical" href="'+canonical+'">'+
 '<meta property="og:url" content="'+canonical+'"></head><body>'+
 '<main><section id="s1"><h1>Demo</h1><p>'+text+'</p>'+
 '<a href="/about/">About</a><img src="/assets/asset-main.png" alt="Sample"></section></main></body></html>';
const home=html('Welcome','https://site.example/');
const about=html('About us','https://site.example/about/');
const release={siteId:'pilot-site',publishedVersion:3,sha256VerifiedAtRead:true,
 manifestSha256:'a'.repeat(64),origin:'https://site.example',
 pages:new Map([
  ['/',{id:'page-home',path:'/',html:home,sha256:'b'.repeat(64)}],
  ['/about/',{id:'page-about',path:'/about/',html:about,sha256:'c'.repeat(64)}]]),
 redirects:new Map([['/old/','/about/']]),
 assets:new Map([['asset-main',{id:'asset-main',src:'/assets/asset-main.png',sha256:'d'.repeat(64),bytes:2048}]]),
 searchFiles:{'robots.txt':'User-agent: *\nAllow: /\nSitemap: https://site.example/sitemap.xml\n',
  'sitemap.xml':'<urlset><url><loc>https://site.example/</loc></url></urlset>'}};
const origin='https://site.example/';
const http={
 format:'manufact-seo-delivery-evidence-v1',siteId:site.siteId,origin,capturedAt:'2026-10-28T20:00:00Z',
 pages:[{id:'page-home',path:'/',requestUrl:origin,responseUrl:origin,status:200,
   headers:{'content-type':'text/html'},html:home},
  {id:'page-about',path:'/about/',requestUrl:origin+'about/',responseUrl:origin+'about/',status:200,
   headers:{'content-type':'text/html'},html:about}],
 robots:{status:200,url:origin+'robots.txt',contentType:'text/plain',
   body:release.searchFiles['robots.txt']},
 sitemap:{status:200,url:origin+'sitemap.xml',contentType:'application/xml',
   body:release.searchFiles['sitemap.xml']},
 redirects:[{from:'/old/',requestUrl:origin+'old/',status:301,location:'/about/'}],
 negativeProbe:{path:'/cms-seo-nonexistent-pilot-site/',requestUrl:origin+'cms-seo-nonexistent-pilot-site/',
  status:404,contentType:'text/html',bodySha256:'e'.repeat(64)}};
const media={format:'manufact-seo-media-evidence-v1',siteId:site.siteId,origin,
 completeness:'complete',resources:[
  {assetId:'asset-main',url:origin+'assets/asset-main.png',status:200,
   contentType:'image/png',contentLength:2048}]};
const good=compare(site,release,http,media);
assert.equal(good.format,FORMAT);
assert.equal(good.comparable,true);
assert.equal(good.findings.length,0);
assert.equal(good.allComparedSurfacesMatched,true);
assert.equal(good.checkedPages,2);
assert.equal(good.checkedSearchFiles,2);
assert.equal(good.checkedRedirects,1);
assert.equal(good.httpTranscriptAuthenticated,false);
const soft404=compare(site,release,{...http,negativeProbe:{...http.negativeProbe,status:200}},media);
assert.ok(soft404.findings.some(x=>x.code==='public-static:soft-404-public-host'));
const wrongHead=compare(site,release,{...http,pages:http.pages.map((p,i)=>
 i===0?{...p,html:home.replace('<meta property="og:url"',
 '<meta property="og:image" content="https://other.example/image.jpg"><meta property="og:url"')}:p)},media);
assert.ok(wrongHead.findings.some(x=>x.code==='public-static:page-deep-head-drift'));
const wrong=compare(site,release,{...http,pages:http.pages.map((p,i)=>
 i===0?{...p,html:home.replace('Welcome','Altered').replace('href="/about/"','href="/broken/"')}:p)},media);
assert.ok(wrong.findings.some(x=>x.code==='public-static:page-content-drift'&&x.field==='mainText'));
assert.ok(wrong.findings.some(x=>x.code==='public-static:page-structure-drift'&&x.field==='structure.links'));
const redirect=compare(site,release,{...http,redirects:[{...http.redirects[0],status:200}]},media);
assert.ok(redirect.findings.some(x=>x.code==='public-static:redirect-not-http-301'));
const brokenMedia=compare(site,release,http,{...media,resources:[{...media.resources[0],
 contentLength:24}]});
assert.ok(brokenMedia.findings.some(x=>x.code==='public-static:public-media-length-drift'));
const missingSearch=compare(site,release,{...http,sitemap:undefined},media);
assert.ok(missingSearch.findings.some(x=>x.code==='public-static:public-search-capture-missing'));
const other=compare(site,release,{...http,origin:'https://elsewhere.example/'},null);
assert.equal(other.comparable,false);
assert.equal(other.checkedPages,0);
assert.ok(other.findings.some(x=>x.code==='public-static:release-host-scope-not-comparable'));
assert.equal(other.allComparedSurfacesMatched,false);
assert.ok(!JSON.stringify(good).includes(home)); // no full page content or form tokens
console.log('Public HTTPS vs verified static deployment parity smoke PASS');
