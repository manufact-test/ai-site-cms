'use strict';
// Single real HTTP/SQLite/renderer test. Disposable temp DB, loopback only.
// Tests multi-page CMS drafts, credentials, CSRF, stale edits, restore,
// explicit publishing, visitor isolation, HTML escaping and process restart.
const assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const root=path.resolve(__dirname,'../..');
const dbdir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-stage3-'));
const file=path.join(dbdir,'isolated.sqlite');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'stage3/fixtures/industrial-site.json'),'utf8'));
const password='test-only-lab-password-not-a-real-secret';
const env={...process.env,STAGE3_DSN:'sqlite:'+file,STAGE3_OWNER_USER:'testowner',
  STAGE3_OWNER_PASSWORD:password};
let server, origin, cookie='', csrf='';
async function port(){
  const s=net.createServer();
  await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});
  const p=s.address().port;await new Promise(resolve=>s.close(resolve));return p;
}
async function request(method,route,data,headers={}){
  const result=await fetch(origin+route,{method,redirect:'manual',
    headers:{...(cookie?{cookie}:{}),...(method==='POST'?{'content-type':'application/json'}:{}),
      ...(csrf&&method==='POST'?{'x-csrf-token':csrf}:{}),...headers},
    ...(method==='POST'?{body:JSON.stringify(data)}:{})});
  const set=result.headers.get('set-cookie');
  if(set)cookie=set.split(';',1)[0];
  const type=result.headers.get('content-type')||'';
  const body=type.startsWith('application/json')?await result.json():await result.text();
  return {status:result.status,body,headers:result.headers};
}
async function runServer(){
  origin='http://127.0.0.1:'+(await port());
  server=spawn('php',['-S',new URL(origin).host,'-t','stage3/server/public','stage3/server/public/index.php'],{
    cwd:root,env,stdio:['ignore','ignore','pipe']});
  let logs='';
  server.stderr.on('data',d=>{logs+=d.toString().slice(0,3000);});
  for(let i=0;i<80;i++){
    if(server.exitCode!==null)throw Error('PHP server exited: '+logs);
    try{const r=await request('GET','/api/session');if(r.status===200)return;}catch(e){}
    await new Promise(resolve=>setTimeout(resolve,75));
  }
  throw Error('PHP server not ready: '+logs);
}
async function stop(){
  if(server&&server.exitCode===null){
    const old=server;old.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>old.once('exit',resolve)),
      new Promise(resolve=>setTimeout(resolve,2000))]);
  }
}
(async()=>{
  const installed=spawnSync('php',['-m'],{encoding:'utf8'});
  assert.match(installed.stdout,/pdo_sqlite/i,'CI needs PDO SQLite extension');
  const setup=spawnSync('php',['stage3/server/bin/setup.php'],{cwd:root,env,encoding:'utf8'});
  assert.equal(setup.status,0,setup.stderr);
  const again=spawnSync('php',['stage3/server/bin/setup.php'],{cwd:root,env,encoding:'utf8'});
  assert.notEqual(again.status,0,'must refuse overwriting existing schema');
  await runServer();
  assert.equal((await request('GET','/api/sites')).status,401,'private site list requires login');
  assert.equal((await request('POST','/api/login',{username:'testowner',password:'bad'})).status,401);
  const login=await request('POST','/api/login',{username:'testowner',password});
  assert.equal(login.status,200);
  csrf=login.body.csrfToken;assert.match(csrf,/^[a-f0-9]{64}$/);
  assert.equal((await request('POST','/api/sites',{site:fixture},{'x-csrf-token':'wrong'})).status,403);
  assert.equal((await request('POST','/api/sites',{site:fixture},{origin:'https://attacker.example'})).status,403);
  const created=await request('POST','/api/sites',{site:fixture});
  assert.equal(created.status,201);assert.equal(created.body.revision,1);
  const id=fixture.siteId,endpoint='/api/sites/'+id;
  assert.equal((await request('GET','/api/sites')).body.sites.length,1);
  assert.equal((await request('GET',endpoint)).body.site.pages.length,2);
  assert.equal((await request('GET','/published/'+id+'/')).status,404,'unpublished site invisible');
  const changed=structuredClone(fixture);
  changed.pages[0].sections[0].elements[0].values['content.text']='<img src=x onerror=alert(1)> Updated';
  const saved=await request('POST',endpoint+'/save',{expectedRevision:1,site:changed});
  assert.equal(saved.status,200);assert.equal(saved.body.revision,2);
  assert.equal((await request('POST',endpoint+'/save',{expectedRevision:1,site:fixture})).status,409);
  const history=(await request('GET',endpoint+'/revisions')).body.revisions;
  assert.deepEqual(history.map(h=>Number(h.revision)),[2,1]);
  const first=await request('POST',endpoint+'/publish',{expectedRevision:2});
  assert.equal(first.status,200);assert.equal(first.body.version,1);
  const pub=await request('GET','/published/'+id+'/');
  assert.equal(pub.status,200);
  assert.match(pub.body,/&lt;img src=x onerror=alert\(1\)&gt; Updated/);
  assert.doesNotMatch(pub.body,/<img src=x onerror/);
  assert.match(pub.body,/\/published\/site-industrial-demo\/contact\//);
  assert.equal((await request('GET','/published/'+id+'/contact/')).status,200);
  const invalid=structuredClone(changed);
  invalid.pages[0].sections[0].elements[0].values['style.hiddenExecutable']='alert(1)';
  assert.equal((await request('POST',endpoint+'/save',{expectedRevision:2,site:invalid})).status,422);
  const next=structuredClone(changed);
  next.pages[0].sections[0].elements[0].values['content.text']='Unpublished revision three';
  assert.equal((await request('POST',endpoint+'/save',{expectedRevision:2,site:next})).body.revision,3);
  assert.match((await request('GET','/published/'+id+'/')).body,/Updated/);
  assert.doesNotMatch((await request('GET','/published/'+id+'/')).body,/Unpublished revision three/);
  const restored=await request('POST',endpoint+'/restore',{targetRevision:1,expectedRevision:3});
  assert.equal(restored.status,200);assert.equal(restored.body.revision,4);
  assert.equal(restored.body.site.pages[0].sections[0].elements[0].values['content.text'],
    fixture.pages[0].sections[0].elements[0].values['content.text']);
  assert.equal((await request('POST',endpoint+'/publish',{expectedRevision:3})).status,409);
  assert.equal((await request('POST',endpoint+'/publish',{expectedRevision:4})).body.version,2);
  assert.doesNotMatch((await request('GET','/published/'+id+'/')).body,/Updated/);
  assert.equal((await request('POST','/api/logout',{})).status,200);
  assert.equal((await request('GET',endpoint)).status,401);
  assert.equal((await request('GET','/published/'+id+'/')).status,200,'visitor needs no CMS login');
  // Export only the published snapshot. Build static files without modifying
  // live CMS routes, then serve with Node AFTER stopping the PHP CMS completely.
  const out=path.join(dbdir,'export-v2');
  const cmd=['stage3/server/bin/export-published.php',id,out];
  const exported=spawnSync('php',cmd,{cwd:root,env,encoding:'utf8'});
  assert.equal(exported.status,0,exported.stderr);
  assert.notEqual(spawnSync('php',cmd,{cwd:root,env,encoding:'utf8'}).status,0,
    'Static releases cannot overwrite existing output');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'release-manifest.json'),'utf8'));
  assert.equal(manifest.format,'manufact-ai-static-site-v1');
  assert.equal(manifest.publishedVersion,2);
  assert.equal(manifest.sourceRevision,4);
  assert.deepEqual(manifest.pages.map(p=>p.path),['/','/contact/']);
  for(const p of manifest.pages){
    const body=fs.readFileSync(path.join(out,p.file),'utf8');
    assert.equal(require('node:crypto').createHash('sha256').update(body).digest('hex'),p.sha256);
    assert.doesNotMatch(body,/\/api\/|\/published\//,'Standalone output has no CMS links');
    assert.doesNotMatch(body,/<script|<\?php/i,'No scripts or dynamic PHP output');
  }
  assert.match(fs.readFileSync(path.join(out,'index.html'),'utf8'),/href="\/contact\/"/);
  await stop();
  const http=require('node:http');
  const staticServer=http.createServer((req,res)=>{
    const page=req.url==='/'?'index.html':req.url==='/contact/'?'contact/index.html':null;
    if(!page){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end(fs.readFileSync(path.join(out,page)));
  });
  await new Promise(resolve=>staticServer.listen(0,'127.0.0.1',resolve));
  try{
    const remote='http://127.0.0.1:'+staticServer.address().port;
    const home=await fetch(remote+'/'),contact=await fetch(remote+'/contact/');
    assert.equal(home.status,200);assert.equal(contact.status,200);
    assert.match(await home.text(),/Производим технологическое оборудование/);
    assert.match(await contact.text(),/Свяжитесь с нами/);
  }finally{
    await new Promise(resolve=>staticServer.close(resolve));
  }
  // Return to the CMS process only to verify the original DB was untouched.
  cookie='';csrf='';
  await runServer();
  assert.equal((await request('GET','/published/'+id+'/')).status,200,
    'published snapshot remains after restarting admin PHP process');
  console.log('Stage3 PHP/SQLite HTTP E2E PASS: owner, closed manifest, multi-page site, CAS save, revisions, restore, publish, visitor');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  await stop();fs.rmSync(dbdir,{recursive:true,force:true});
});
