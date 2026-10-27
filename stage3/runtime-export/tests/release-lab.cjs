#!/usr/bin/env node
'use strict';
// D3 one disposable end-to-end: immutable slots, authentic D2 handoff,
// confirm-only local cutover, redirect/media visitor, rollback and tamper refusal.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),
  crypto=require('node:crypto'),net=require('node:net'),assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-d3-lab-'));
const registry=path.join(temp,'local-registry');
const manager='stage3/runtime-export/bin/release-manager.cjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let php=null;
const cmd=(action,extra=[],success=true)=>{
  const x=spawnSync(process.execPath,[manager,action,registry,...extra],{
    cwd:root,encoding:'utf8',timeout:120000});
  if(success)assert.equal(x.status,0,'CLI '+action+': '+x.stderr+'\n'+x.stdout);
  else assert.notEqual(x.status,0,'CLI '+action+' must refuse unsafe operation');
  return success?JSON.parse(x.stdout):x.stderr;
};
const write=(folder,relative,bytes)=>{
  const abs=path.join(folder,relative);fs.mkdirSync(path.dirname(abs),{recursive:true});
  fs.writeFileSync(abs,bytes);return {file:relative,sha256:hash(bytes)};
};
function snapshot(version){
  const folder=path.join(temp,'site-v'+version);
  fs.mkdirSync(folder);
  const text=(route)=>'<!doctype html><html lang="en"><head><meta charset="utf-8">'
    +'<title>Site '+version+'</title><meta name="description" content="Site version '+version+'">'
    +'<link rel="canonical" href="https://example.test/'+route+'">'
    +'<style>body{font-family:system-ui}</style></head><body><h1>Version '+version+'</h1>'
    +'<form action="https://forms.example.test/forms/site-cutover-demo/section-foo" method="post">'
    +'<input name="name"></form><a href="/about/">About</a></body></html>';
  const home=write(folder,'index.html',text(''));
  const pages=[{path:'/',...home}],redirects=[];
  if(version===2){
    pages.push({path:'/about/',...write(folder,'about/index.html',text('about/'))});
    const old=write(folder,'old/index.html',
      '<!doctype html><html lang="en"><head><meta name="robots" content="noindex"></head><body>Moved</body></html>');
    redirects.push({from:'/old/',to:'/about/',...old});
  }
  const asset=write(folder,'assets/image-abc.png',
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y6Pe3UAAAAASUVORK5CYII=','base64'));
  const manifest={format:'manufact-ai-static-site-v1',
    siteId:'site-cutover-demo',publishedVersion:version,sourceRevision:version+2,
    pages,assets:[{id:'image-abc',parentId:'image-abc',mime:'image/png',...asset}],
    redirects,publicOrigin:'https://example.test',formCollector:null};
  write(folder,'release-manifest.json',JSON.stringify(manifest,null,2)+'\n');
  return folder;
}
function capsule(folder){
  const files=[];
  function list(d,relative=''){
    for(const name of fs.readdirSync(d)){
      const r=relative?relative+'/'+name:name;
      const full=path.join(d,name);
      if(fs.statSync(full).isDirectory())list(full,r);
      else{
        const b=fs.readFileSync(full);
        files.push({path:r,sha256:hash(b),base64:b.toString('base64')});
      }
    }
  }
  list(folder);files.sort((a,b)=>a.path.localeCompare(b.path));
  const manifest=fs.readFileSync(path.join(folder,'release-manifest.json'));
  return {format:'manufact-runtime-handoff-v1',siteId:'site-cutover-demo',version:2,
    sourceRevision:4,manifestSha256:hash(manifest),rawBytes:files.reduce((n,f)=>n+Buffer.from(f.base64,'base64').length,0),
    files};
}
async function freePort(){
  const server=net.createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));return port;
}
async function startVisitor(){
  const port=await freePort();
  const origin='http://127.0.0.1:'+port;
  php=spawn('php',['-S','127.0.0.1:'+port,'-t',path.join(registry,'public'),
    path.join(registry,'public/router.php')],{cwd:root,stdio:['ignore','ignore','pipe']});
  let errors='';php.stderr.on('data',x=>errors+=String(x));
  for(let i=0;i<60;i++){
    if(php.exitCode!==null)throw Error('PHP preview exited: '+errors);
    try{if((await fetch(origin+'/__lab/status')).ok)return origin;}catch{}
    await new Promise(resolve=>setTimeout(resolve,90));
  }
  throw Error('PHP local preview unavailable: '+errors);
}
async function main(){
  const v1=snapshot(1),v2=snapshot(2);
  const handoffPath=path.join(temp,'published-v2.json');
  fs.writeFileSync(handoffPath,JSON.stringify(capsule(v2)));
  cmd('init');
  cmd('stage',['release-one',v1]);
  cmd('stage',['release-two',handoffPath,'php']);
  assert.equal(cmd('verify').integrity,'verified');
  assert.equal(cmd('status').siteId,'site-cutover-demo');
  assert.match(cmd('stage',['release-one',v2],false),/slot already exists/i);
  const malicious=path.join(temp,'evil-site');
  fs.cpSync(v1,malicious,{recursive:true});
  const badManifest=JSON.parse(fs.readFileSync(path.join(malicious,'release-manifest.json'),'utf8'));
  badManifest.siteId='site-other-user';
  fs.writeFileSync(path.join(malicious,'release-manifest.json'),JSON.stringify(badManifest));
  assert.match(cmd('stage',['wrong-site',malicious],false),/cannot mix different sites/i);
  assert.equal(cmd('status').releases.length,2,'Failed stage cannot leak into registry');
  const first=cmd('plan',['release-one']);
  assert.equal(first.from,null);
  assert.deepEqual(first.changes.addedRoutes,['/']);
  assert.match(cmd('activate',['not-a-token'],false),/token/i);
  cmd('activate',[first.confirmationToken]);
  assert.equal(cmd('status').active,'release-one');
  assert.match(cmd('activate',[first.confirmationToken],false),/confirmation/i);
  const origin=await startVisitor();
  const one=await fetch(origin+'/');
  assert.equal(one.status,200);
  assert.match(await one.text(),/Version 1/);
  assert.equal(one.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');
  assert.match(one.headers.get('content-security-policy'),/form-action 'none'/);
  assert.equal((await fetch(origin+'/about/')).status,404);
  const offline=await fetch(origin+'/__lab/status');
  assert.deepEqual((await offline.json()).active,'release-one');
  assert.equal((await fetch(origin+'/router.php')).status,404,'Router not exposed as HTML');
  assert.equal((await fetch(origin+'/',{method:'POST'})).status,405,'Offline preview cannot accept leads');
  const stale=cmd('plan',['release-two']);
  // Next static adapter can be staged and inspected through exact published HTML
  // even though this local preview is NOT an actual Next build or SSR runtime.
  const nextDir=path.join(temp,'next-scaffold');
  const built=spawnSync(process.execPath,['stage3/runtime-export/bin/build.cjs',v2,
    'next-static',nextDir],{cwd:root,encoding:'utf8'});
  assert.equal(built.status,0,built.stderr);
  cmd('stage',['next-scaffold',nextDir]);
  assert.match(cmd('activate',[stale.confirmationToken],false),/stale|expired|missing/i,
    'A new staged slot invalidates the prior generation plan');
  const second=cmd('plan',['release-two']);
  assert.deepEqual(second.changes.addedRoutes,['/about/']);
  assert.equal(second.changes.redirectChange,true);
  assert.equal(second.technology,'php');
  cmd('activate',[second.confirmationToken]);
  const two=await fetch(origin+'/');
  assert.match(await two.text(),/Version 2/);
  assert.equal((await fetch(origin+'/about/')).status,200);
  const redirect=await fetch(origin+'/old/',{redirect:'manual'});
  assert.equal(redirect.status,301);
  assert.equal(redirect.headers.get('location'),'/about/');
  const media=await fetch(origin+'/assets/image-abc.png');
  assert.equal(media.status,200);
  assert.deepEqual(Buffer.from(await media.arrayBuffer()),
    fs.readFileSync(path.join(v2,'assets/image-abc.png')));
  assert.equal((await fetch(origin+'/sitemap.xml')).status,404);
  assert.match(await (await fetch(origin+'/robots.txt')).text(),/Disallow: \//);
  const rollbackPlan=cmd('plan-rollback');
  assert.equal(rollbackPlan.to,'release-one');
  assert.equal(rollbackPlan.plan,'rollback');
  assert.match(cmd('rollback',['abc'],false),/token/i);
  cmd('rollback',[rollbackPlan.confirmationToken]);
  assert.equal(cmd('status').active,'release-one');
  assert.equal(cmd('status').previous,'release-two');
  assert.match(await (await fetch(origin+'/')).text(),/Version 1/);
  assert.equal((await fetch(origin+'/about/')).status,404);
  assert.match(cmd('rollback',[rollbackPlan.confirmationToken],false),/confirmation/i);
  assert.equal(cmd('status').history.length,3);
  fs.appendFileSync(path.join(registry,'slots/release-two/site/data/index.html'),'tampered');
  assert.match(cmd('verify',[],false),/content checksum|modified/i);
  assert.match(cmd('plan',['release-two'],false),/content checksum|modified/i);
  assert.equal(cmd('status').active,'release-one','Tampered inactive slot never becomes active');
  console.log('D3 LOCAL RELEASE CUTOVER PASS: D2 import, immutable slots, CAS plan, loopback HTTP, redirects, rollback, tamper isolation');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  if(php&&php.exitCode===null){
    const done=new Promise(r=>php.once('exit',r));
    php.kill('SIGTERM');
    await Promise.race([done,new Promise(r=>setTimeout(r,1200))]);
  }
  fs.rmSync(temp,{recursive:true,force:true});
});
