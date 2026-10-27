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
  const page = (title,body) => '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    +'<title>'+title+'</title><meta name="description" content="Page '+title+'">'
    +'<meta property="og:title" content="'+title+'">'
    +'<link rel="canonical" href="https://example.test/'+(title==='Home'?'':'about/')+'">'
    +'<style>body{font-family:system-ui}.probe{color:#123456}</style></head>'
    +'<body><header><a href="/about/">About</a></header><main class="probe">'+body+'</main></body></html>';
  const home=put('index.html',page('Home','Visible CMS published home'));
  const about=put('about/index.html',page('About','Visible CMS published about'));
  const old=put('old/index.html','<!doctype html><html><head><meta name="robots" content="noindex,follow">'
    +'<title>Moved</title></head><body><a href="/about/">Moved</a></body></html>');
  const img=put('assets/image-abc.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vmkAAAAASUVORK5CYII=','base64'));
  put('release-manifest.json',JSON.stringify({
    format:'manufact-ai-static-site-v1',siteId:'site-next-proof',
    publishedVersion:2,sourceRevision:7,
    pages:[{path:'/',...home},{path:'/about/',...about}],
    assets:[{id:'image-abc',parentId:'image-abc',mime:'image/png',...img}],
    redirects:[{from:'/old/',to:'/about/',...old}],
    formCollector:null,publicOrigin:'https://example.test'
  },null,2));
  const dir=path.join(tmp,'release');
  const targets={static:path.join(tmp,'static'),ssr:path.join(tmp,'ssr')};
  cmd('node',['stage3/runtime-export/bin/build.cjs',dir,'next-static',targets.static],root);
  cmd('node',['stage3/runtime-export/bin/build.cjs',dir,'next-ssr',targets.ssr],root);
  for(const dest of Object.values(targets)) {
    cmd('npm',['install','--no-audit','--no-fund'],dest);
    cmd('npm',['run','build'],dest);
  }
  assert.match(fs.readFileSync(path.join(targets.static,'out/index.html'),'utf8'),/Visible CMS published home/);
  assert.match(fs.readFileSync(path.join(targets.static,'out/about/index.html'),'utf8'),/Visible CMS published about/);
  assert.match(fs.readFileSync(path.join(targets.static,'out/old/index.html'),'utf8'),/Moved/);
  assert.ok(fs.existsSync(path.join(targets.static,'out/assets/image-abc.png')));
  const port=await freePort();
  const child=spawn('npm',['run','start','--','-p',String(port),'-H','127.0.0.1'],
    {cwd:targets.ssr,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
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
    assert.match(await homeRes.text(),/Visible CMS published home/);
    const aboutRes=await fetch(origin+'/about/');
    assert.match(await aboutRes.text(),/Visible CMS published about/);
    const redirect=await fetch(origin+'/old/',{redirect:'manual'});
    assert.equal(redirect.status,301);
    assert.equal(new URL(redirect.headers.get('location'),origin).pathname,'/about/');
    const image=await fetch(origin+'/assets/image-abc.png');
    assert.equal(image.status,200);
    assert.deepEqual(Buffer.from(await image.arrayBuffer()),fs.readFileSync(path.join(dir,img.file)));
    assert.equal((await fetch(origin+'/does-not-exist/')).status,404);
    console.log('Next static BUILD + Next SSR HTTP PROOF PASS (disposable loopback)');
  } finally {
    if(child.exitCode===null){child.kill('SIGTERM');}
  }
}
probe().catch(error=>{console.error(error);process.exitCode=1;})
  .finally(()=>{fs.rmSync(tmp,{recursive:true,force:true});});
