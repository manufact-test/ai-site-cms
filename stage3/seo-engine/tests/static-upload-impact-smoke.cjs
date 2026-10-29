'use strict';
// Real temporary HTML content, no production traffic or CMS writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os');
const {compare}=require('../lib/static-upload-impact.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo-static-impact-'));
try{
 const prev=path.join(root,'old'),next=path.join(root,'next');
 fs.mkdirSync(prev);fs.mkdirSync(next);
 const html=(body,robots='index',canonical=true)=>'<html><head><title>A</title>'+
  (robots==='noindex'?'<meta name="robots" content="noindex,follow">':'')+
  (canonical?'<link rel="canonical" href="https://site.example/">':'')+
  '</head><body><main>'+body+'</main></body></html>';
 const put=(folder,file,content)=>{const f=path.join(folder,file);
  fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,content);};
 put(prev,'index.html',html('Old'));put(prev,'about/index.html',html('About'));
 put(next,'index.html',html('New','noindex',false));
 const entries=(records)=>new Map(records.map(([file,kind,sha256])=>[file,{file,kind,sha256}]));
 const before={root:prev,inventory:{siteId:'site',publishedVersion:1,
  origin:'https://site.example',provider:'netlify',officialStaticManifestSha256:'a'.repeat(64),
  files:[]},files:entries([
   ['index.html','html','1'],['about/index.html','html','2'],
   ['assets/logo.webp','media','3'],['robots.txt','search','4']]),
  redirects:new Map([['/old/','/about/']])};
 const after={root:next,inventory:{siteId:'site',publishedVersion:2,
  origin:'https://site.example',provider:'netlify',officialStaticManifestSha256:'b'.repeat(64),
  files:[]},files:entries([
   ['index.html','html','5'],['assets/logo.webp','media','6'],
   ['robots.txt','search','7']]),redirects:new Map()};
 const report=compare(before,after);
 assert.equal(report.pages.removed[0],'/about/');
 assert.ok(report.risks.some(x=>x.type==='page-became-noindex'));
 assert.ok(report.risks.some(x=>x.type==='canonical-disappeared'));
 assert.ok(report.risks.some(x=>x.type==='indexable-page-removed-without-301'));
 assert.ok(report.risks.some(x=>x.type==='historical-301-removed'));
 assert.ok(report.risks.some(x=>x.type==='media-cache-key-unchanged'));
 assert.ok(report.risks.some(x=>x.type==='robots-policy-changed'));
 assert.equal(report.remoteDeploymentCompared,false);
 const vMismatch=compare(before,{...after,inventory:{...after.inventory,publishedVersion:1}});
 assert.ok(vMismatch.risks.some(x=>x.type==='immutable-published-version-drift'));
 const recovered=compare(before,{...after,redirects:new Map([['/about/','/']])});
 assert.ok(!recovered.risks.some(x=>x.type==='indexable-page-removed-without-301'));
 console.log('Static upload migration indexability, removed page/301, CDN same-URL and source version guard PASS');
}finally{fs.rmSync(root,{recursive:true,force:true});}
