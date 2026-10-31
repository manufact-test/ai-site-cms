#!/usr/bin/env node
'use strict';
// Only runtime-adapter first-party smoke. Runs on disposable GitHub Actions;
// never connects to a real CMS, domain, collector or database.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {spawn, spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stage3-next-proof-'));
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const put = (file, data) => {
  const out=path.join(tmp,'release',file);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,data);
  return {file,sha256:hash(data)};
};
const cmd = (file,args,cwd,ms=240000) => {
  const result=spawnSync(file,args,{cwd,encoding:'utf8',timeout:ms,
    env:{...process.env,CI:'true',NEXT_TELEMETRY_DISABLED:'1'}});
  assert.equal(result.status,0,(result.stderr||'')+'\n'+(result.stdout||''));
};
async function freePort() {
  const s=net.createServer();
  await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
  const port=s.address().port;
  await new Promise(resolve=>s.close(resolve));
  return port;
}
async function probe() {
  /* Exercise the current D2 release shape, not only legacy inline CSS.
     The real Next build must emit and load one shared CSS for both pages. */
  const sharedCss='body{font-family:system-ui}.probe{color:#123456}';
  const sheet=put('styles/site-'+hash(sharedCss)+'.css',sharedCss);
  const page = (title,body) => '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    +'<title>'+title+'</title><meta name="description" content="Page '+title+'">'
    +(title==='404'?'<meta name="robots" content="noindex,follow">':'')
    +'<meta property="og:title" content="'+title+'">'
    +'<link rel="canonical" href="https://example.test/'+(title==='Home'?'':title==='404'?'404/':'about/')+'">'
    +(title==='Home'?'<script type="application/ld+json">'+JSON.stringify({
      '@context':'https://schema.org','@type':'WebPage',name:'Home',url:'https://example.test/'
    })+'</script>':'')
    +'<link rel="stylesheet" href="/'+sheet.file+'"></head>'
    +'<body><header><a href="/about/">About</a></header><main class="probe">'+body+'</main></body></html>';
  const home=put('index.html',page('Home','Visible CMS published home'));
  const about=put('about/index.html',page('About','Visible CMS published about'));
  const authoredError=put('404/index.html',page('404','Bespoke published 404 design'));
  const lost=put('404.html','<!doctype html><html lang="en"><head><meta charset="utf-8">'
    +'<title>Page not found</title><meta name="description" content="Choose another address">'
    +'<meta name="robots" content="noindex,follow">'
    +'<link rel="stylesheet" href="/'+sheet.file+'"></head>'
    +'<body><main class="probe">Bespoke published 404 design</main></body></html>');
  const old=put('old/index.html','<!doctype html><html><head><meta name="robots" content="noindex,follow">'
    +'<title>Moved</title></head><body><a href="/about/">Moved</a></body></html>');
  const img=put('assets/image-abc.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vmkAAAAASUVORK5CYII=','base64'));
  put('release-manifest.json',JSON.stringify({
    format:'manufact-ai-static-site-v1',siteId:'site-next-proof',
    publishedVersion:2,sourceRevision:7,
    pages:[{path:'/',...home},{path:'/about/',...about},{path:'/404/',...authoredError}],
    notFound:{path:'/404/',...lost},
    assets:[{id:'image-abc',parentId:'image-abc',mime:'image/png',...img}],
    stylesheets:[{file:sheet.file,sha256:sheet.sha256}],
    redirects:[{from:'/old/',to:'/about/',...old}],
    formCollector:null,publicOrigin:'https://example.test'
  },null,2));
  const dir=path.join(tmp,'release');
  const targets={ssr:path.join(tmp,'ssr')};
  cmd('node',['stage3/runtime-export/bin/build.cjs',dir,'next-ssr',targets.ssr],root);
  cmd('npm',['install','--no-audit','--no-fund'],targets.ssr);
  cmd('npm',['run','build'],targets.ssr);
  // D5 performs a *single command* real Next Static npm build + ZIP, rather
  // than building once for testing and then building it a second time.
  const capsuleFiles=[];
  function collect(folder,rel=''){
    for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
      const name=rel?rel+'/'+entry.name:entry.name,full=path.join(folder,entry.name);
      if(entry.isDirectory())collect(full,name);
      else { const bytes=fs.readFileSync(full);
        capsuleFiles.push({path:name,sha256:hash(bytes),base64:bytes.toString('base64')}); }
    }
  }
  collect(dir);
  const manifestBytes=fs.readFileSync(path.join(dir,'release-manifest.json'));
  const jsonCapsule=path.join(tmp,'D2-capsule.json');
  fs.writeFileSync(jsonCapsule,JSON.stringify({format:'manufact-runtime-handoff-v1',
    siteId:'site-next-proof',version:2,sourceRevision:7,manifestSha256:hash(manifestBytes),
    rawBytes:capsuleFiles.reduce((t,f)=>t+Buffer.from(f.base64,'base64').length,0),
    files:capsuleFiles}));
  const readyZip=path.join(tmp,'actual-next-static-delivery.zip');
  cmd('node',['stage3/runtime-export/bin/ship.cjs',jsonCapsule,'next-static',readyZip,
    '--allow-npm-install','--expect-origin=https://example.test','--http-rehearsal'],root,360000);
  const checked=spawnSync('node',['stage3/runtime-export/bin/verify-delivery.cjs',readyZip],
    {cwd:root,encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr);
  const delivery=JSON.parse(checked.stdout);
  assert.equal(delivery.technology,'next-static');
  assert.equal(delivery.readiness,'files-prepared');
  const report=JSON.parse(fs.readFileSync(readyZip+'.preflight.json','utf8'));
  assert.equal(report.counts.blockers,0);
  assert.equal(report.httpRehearsal.status,'local-http-pass');
  assert.equal(report.httpRehearsal.technology,'next-static');
  assert.equal(report.stats.pages,3);
  const zipTree=require('../lib/delivery-zip.cjs').readArchive(fs.readFileSync(readyZip));
  assert.ok(zipTree.has('deploy/about/index.html'));
  assert.ok(zipTree.has('deploy/404/index.html'));
  assert.ok(zipTree.has('deploy/404.html'));
  assert.match(String(zipTree.get('deploy/404.html')),/Bespoke published 404 design/);
  assert.match(String(zipTree.get('deploy/.htaccess')),/ErrorDocument 404 \/404[.]html/);
  assert.match(String(zipTree.get('handoff/nginx-redirects.example.conf')),
    /error_page 404 \/404[.]html;/);
  assert.ok(zipTree.has('deploy/old/index.html'));
  assert.ok(String(zipTree.get('deploy/.htaccess')).includes('RewriteRule ^old'));
  assert.match(String(zipTree.get('deploy/index.html')),/Visible CMS published home/);
  assert.match(String(zipTree.get('deploy/about/index.html')),/Visible CMS published about/);
  assert.match(String(zipTree.get('deploy/old/index.html')),/Moved/);
  assert.ok(zipTree.has('deploy/assets/image-abc.png'));
  assert.ok(zipTree.has('deploy/'+sheet.file),'Next Static output must ship immutable CSS');
  assert.ok(String(zipTree.get('deploy/index.html')).includes('/'+sheet.file));
  assert.equal(String(zipTree.get('deploy/'+sheet.file)),sharedCss);
  const port=await freePort();
  const child=spawn('npm',['run','start','--','-p',String(port),'-H','127.0.0.1'],
    {cwd:targets.ssr,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},detached:true,
      stdio:['ignore','pipe','pipe']});
  let output='';
  child.stdout.on('data',d=>output+=String(d));
  child.stderr.on('data',d=>output+=String(d));
  try {
    const origin='http://127.0.0.1:'+port;
    let ready=false;
    for(let i=0;i<100;i++) {
      if (child.exitCode!==null)break;
      try { const x=await fetch(origin+'/'); if(x.status===200){ready=true;break;} } catch {}
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    assert.ok(ready,'Next SSR not ready: '+output);
    const homeRes=await fetch(origin+'/');
    const homeHtml=await homeRes.text();
    assert.match(homeHtml,/Visible CMS published home/);
    assert.match(homeHtml,/<script type="application\/ld\+json">\{"@context":"https:\/\/schema.org","@type":"WebPage"/,
      'Next SSR preserves publisher-owned Schema.org JSON-LD');
    const aboutRes=await fetch(origin+'/about/');
    const aboutHtml=await aboutRes.text();
    assert.match(aboutHtml,/Visible CMS published about/);
    assert.doesNotMatch(aboutHtml,/application\/ld\+json/,'No JSON-LD must be invented for unconfigured pages');
    assert.equal((await fetch(origin+'/404/')).status,200,
      'The authored /404/ route is a genuine CMS page while unknown routes are 404');
    const redirect=await fetch(origin+'/old/',{redirect:'manual'});
    assert.equal(redirect.status,301);
    assert.equal(new URL(redirect.headers.get('location'),origin).pathname,'/about/');
    const cssResponse=await fetch(origin+'/'+sheet.file);
    assert.equal(cssResponse.status,200,'Next SSR must publish shared CSS');
    assert.equal(await cssResponse.text(),sharedCss);
    const ssrHtml=await (await fetch(origin+'/')).text();
    assert.ok(ssrHtml.includes('/'+sheet.file));
    const image=await fetch(origin+'/assets/image-abc.png');
    assert.equal(image.status,200);
    assert.deepEqual(Buffer.from(await image.arrayBuffer()),fs.readFileSync(path.join(dir,img.file)));
    const notFoundRes=await fetch(origin+'/does-not-exist/');
    assert.equal(notFoundRes.status,404);
    const notFoundHtml=await notFoundRes.text();
    assert.match(notFoundHtml,/Bespoke published 404 design/);
    assert.match(notFoundHtml,/noindex/);
    assert.doesNotMatch(notFoundHtml,/rel="canonical"|application\/ld\+json|property="og:url"/);
    console.log('Next static BUILD + Next SSR HTTP PROOF PASS (disposable loopback)');
  } finally {
    // npm starts a shell and next-server child. Kill the whole disposable
    // process group, not just npm, or inherited pipes keep CI alive forever.
    const closed=new Promise(resolve=>child.once('close',resolve));
    try { if(child.pid) process.kill(-child.pid,'SIGTERM'); }
    catch(error) { if(error.code!=='ESRCH') throw error; }
    await Promise.race([closed,new Promise(resolve=>setTimeout(resolve,2000))]);
  }
}
probe().catch(error=>{console.error(error);process.exitCode=1;})
  .finally(()=>{fs.rmSync(tmp,{recursive:true,force:true});});
