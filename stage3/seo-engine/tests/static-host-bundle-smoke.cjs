'use strict';
// Verify real filesystem staging in a temporary directory, while replacing
// ONLY the upstream CMS static-release trust source with a controlled fixture.
// No network, deployment or CMS mutation.
const assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),crypto=require('node:crypto'),
 os=require('node:os'),vm=require('node:vm');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'cms-seo-static-stage-'));
try{
 const source=path.join(root,'official'),site={siteId:'pilot',pages:[{path:'/'},{path:'/about/'}]};
 fs.mkdirSync(source);
 const inputs={
  'index.html':'<!doctype html><html><body><main>Home</main></body></html>',
  'about/index.html':'<!doctype html><html><body><main>About</main></body></html>',
  'old/index.html':'<!doctype html><html><head><meta name="robots" content="noindex,follow"></head><body>Moved</body></html>',
  'assets/logo.webp':'RIFF-public-media-fixture',
  'robots.txt':'User-agent: *\nAllow: /\n',
  'sitemap.xml':'<urlset></urlset>'
 };
 for(const [name,body] of Object.entries(inputs)){
  const p=path.join(source,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body);
 }
 const releaseManifest={format:'manufact-ai-static-site-v1',siteId:'pilot',
  publishedVersion:4,sourceRevision:'rev-4',publicOrigin:'https://pilot.example',
  pages:[{path:'/',file:'index.html',sha256:sha(inputs['index.html'])},
   {path:'/about/',file:'about/index.html',sha256:sha(inputs['about/index.html'])}],
  redirects:[{from:'/old/',to:'/about/',file:'old/index.html',sha256:sha(inputs['old/index.html'])}],
  assets:[{id:'logo',file:'assets/logo.webp',mime:'image/webp',
   sha256:sha(inputs['assets/logo.webp'])}],
  searchFiles:{'robots.txt':sha(inputs['robots.txt']),'sitemap.xml':sha(inputs['sitemap.xml'])}
 };
 const meta=Buffer.from(JSON.stringify(releaseManifest)+'\n');
 fs.writeFileSync(path.join(source,'release-manifest.json'),meta);
 const release={siteId:'pilot',publishedVersion:4,sourceRevision:'rev-4',
  origin:'https://pilot.example',manifestSha256:sha(meta),
  recordsVerified:Object.keys(inputs).length,findings:[]};
 const redirects={apache:{content:'RewriteEngine On\nRewriteRule ^old/$ /about/ [R=301,L]\n'},
  nginx:{content:'location = /old/ { return 301 /about/; }\n'},
  netlify:{content:'/old/  /about/  301!\n'},
  cloudflarePages:{content:'/old/  /about/  301\n'}};
 const STATIC={isVerified:x=>x===release,
  read:()=>{if(sha(fs.readFileSync(path.join(source,'release-manifest.json')))!==release.manifestSha256)
   throw Error('official manifest changed');return release}};
 const src=fs.readFileSync(path.join(__dirname,'../lib/static-host-bundle.cjs'),'utf8');
 const mod={exports:{}};
 vm.runInNewContext('(function(require,module,exports,Buffer){'+src+'\n})',
  {URL,console})((name)=>name==='node:fs'?fs:name==='node:path'?path:
   name==='node:crypto'?crypto:name==='./php-local-static-export.cjs'?STATIC:
   name==='./static-host-rewrites.cjs'?{build:()=>({origin:release.origin,...redirects})}:
   (()=>{throw Error('Unexpected require '+name)})(),mod,mod.exports,Buffer);
 const B=mod.exports;
 const inv=B.inventory(site,release,source,'cloudflare-pages');
 assert.equal(inv.expectedUploadFileCount,8);
 assert.ok(!inv.records.some(r=>r.file==='release-manifest.json'));
 const output=path.join(root,'cloudflare-out'),actual=B.prepare(site,release,source,output,'cloudflare-pages');
 assert.equal(actual.files,8);
 assert.equal(actual.actualHostWrites,0);
 assert.ok(fs.existsSync(path.join(output,'public','_redirects')));
 const notFound=fs.readFileSync(path.join(output,'public','404.html'),'utf8');
 assert.ok(notFound.includes('noindex,follow'));
 assert.ok(notFound.includes('href="/"'));
 assert.ok(ledger.filesVerified!==0 || actual.files!==0);
 assert.ok(!fs.existsSync(path.join(output,'public','release-manifest.json')));
 assert.ok(!fs.existsSync(path.join(output,'public','upload-inventory.json')));
 const ledger=JSON.parse(fs.readFileSync(path.join(output,'upload-inventory.json'),'utf8'));
 assert.equal(ledger.sourceManifestIncludedInPublicRoot,false);
 assert.equal(ledger.filesVerified,8);
 assert.throws(()=>B.prepare(site,release,source,output,'cloudflare-pages'),/overwrite/);
 assert.throws(()=>B.inventory(site,release,source,'unsupported'),/supported provider/);
 const second=path.join(root,'nginx-out');
 B.prepare(site,release,source,second,'nginx');
 assert.ok(fs.existsSync(path.join(second,'nginx-redirects.conf')));
 assert.ok(!fs.existsSync(path.join(second,'public','_redirects')));
 fs.appendFileSync(path.join(source,'assets/logo.webp'),'tamper');
 assert.throws(()=>B.inventory(site,release,source,'apache'),/changed since SHA256/);
 console.log('Static upload: copy root/aliases/assets/search; host redirects; strip private manifest; SHA256 anti-tamper PASS');
}finally{fs.rmSync(root,{recursive:true,force:true});}
