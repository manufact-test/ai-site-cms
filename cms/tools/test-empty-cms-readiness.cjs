'use strict';
// Stage2 opt-in EMPTY CMS boot gate: two isolated real loopback HTTP instances.
// All state is disposable local SQLite. Never connect to hosting or customers.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
let checks=0;
function check(ok,description){assert.ok(ok,description);checks++;}
function php(script,args=[],env={}){
  return spawnSync('php',[script,...args],{
    encoding:'utf8',timeout:30000,maxBuffer:1024*1024,
    env:{...process.env,...env}
  });
}
function envOf(siteId,db){
  return {
    CMS_STAGE2_RUNTIME_GATE:'ci-only',CMS_ENV:'test',
    CMS_ALLOW_SQLITE_TEST_ONLY:'1',CMS_SITE_ID:siteId,CMS_DB_DSN:'sqlite:'+db
  };
}
function readiness(cms,env){
  return php(path.join(cms,'bin/startup-readiness.php'),['--check'],env);
}
function report(cms,env,expectedCode){
  const r=readiness(cms,env);
  check(r.status===expectedCode && r.stderr==='' && r.stdout.trim().startsWith('{'),
    'standalone readiness CLI expected status '+expectedCode);
  const json=JSON.parse(r.stdout);
  check(json.ready===(expectedCode===0) && json.readOnly && json.ciOnly
    && json.productionReady===false && typeof json.state==='string',
    'structured bounded nonproduction readiness report');
  check(!r.stdout.includes(env.CMS_DB_DSN||'SENSITIVE_DO_NOT_LOG')
    && !r.stdout.includes(env.CMS_SITE_ID||'SENSITIVE_DO_NOT_LOG'),
    'no database path, DSN or site identity in readiness output');
  return json;
}
function install(cms,env){
  const r=php(path.join(cms,'bin/install.php'),['--apply'],env);
  check(r.status===0 && !r.stdout.includes(env.CMS_DB_DSN),
    'explicit dedicated disposable DB initialization');
}
async function freePort(){
  const srv=net.createServer();
  await new Promise((ok,fail)=>srv.once('error',fail).listen(0,'127.0.0.1',ok));
  const port=srv.address().port;
  await new Promise(ok=>srv.close(ok));
  return port;
}
async function start(cms,env){
  const port=await freePort(),base='http://127.0.0.1:'+port;
  const child=spawn('php',['-S','127.0.0.1:'+port,'-t',
    path.join(cms,'public'),path.join(cms,'public/index.php')],{
    env:{...process.env,...env},stdio:'ignore'
  });
  for(let i=0;i<80;i++){
    if(child.exitCode!==null)throw Error('Stage2 lab HTTP server terminated');
    try {
      const res=await fetch(base+'/api/health',{signal:AbortSignal.timeout(600)});
      await res.arrayBuffer();
      return {child,base};
    }catch {await new Promise(ok=>setTimeout(ok,80));}
  }
  child.kill('SIGTERM');
  throw Error('Cannot start isolated PHP loopback');
}
async function stop(s){
  if(!s)return;
  if(s.child.exitCode!==null)return;
  s.child.kill('SIGTERM');
  await new Promise(resolve=>{
    if(s.child.exitCode!==null)return resolve();
    s.child.once('exit',resolve);
  });
}
async function request(s,route='/api/health',init={}){
  const res=await fetch(s.base+route,{
    ...init,signal:AbortSignal.timeout(3000)
  });
  return {status:res.status,text:await res.text(),
    contentType:res.headers.get('content-type'),
    cacheControl:res.headers.get('cache-control'),
    nosniff:res.headers.get('x-content-type-options')};
}
function safeRefusal(r,scope){
  check(r.status===503 && r.text==='{"error":"service_unavailable"}',
    'refuses '+scope+' before empty CMS health success');
  check(r.cacheControl==='no-store' && r.nosniff==='nosniff',
    'non-sensitive security headers on '+scope);
}
async function main(){
  verify();
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-stage2-startup-'));
  const servers=[];
  try{
    const pairs=[];
    for(const name of ['alpha','beta']){
      const cms=path.join(base,'cms-'+name);
      fs.cpSync(STAGE,cms,{recursive:true,force:false,errorOnExist:true});
      const data=path.join(base,'private',name+'.sqlite');
      fs.mkdirSync(path.dirname(data),{recursive:true,mode:0o700});
      const env=envOf('fixture-'+name,data);
      pairs.push({cms,data,env});
      report(cms,env,4);
      check(!fs.existsSync(data),'readiness check never creates absent database');
      const refusal=readiness(cms,{...env,CMS_DB_DSN:'mysql:host=127.0.0.1;dbname=unsafe'});
      check(refusal.status===4 && !fs.existsSync(data),
        'lab gate rejects MySQL without making network connection');
      install(cms,env);
      const before=fs.readFileSync(data);
      const ready=report(cms,env,0);
      check(ready.state==='ready','correct isolated installation reaches startup-ready');
      check(before.equals(fs.readFileSync(data)),
        'readiness CLI performs no SQLite data mutation');
      report(cms,{...env,CMS_SITE_ID:'fixture-someone-else'},4);
      report(cms,{...env,CMS_ENV:'production'},4);
      report(cms,{...env,CMS_STAGE2_RUNTIME_GATE:'invalid'},4);
      report(cms,{...env,CMS_ALLOW_SQLITE_TEST_ONLY:'0'},4);
      report(cms,{...env,CMS_DB_DSN:'sqlite::memory:'},4);
      report(cms,{...env,CMS_DB_DSN:'sqlite:'+cms+'/public/site.sqlite'},4);
      const alias=path.join(base,'private','alias-'+name+'.sqlite');
      fs.symlinkSync(data,alias);
      report(cms,{...env,CMS_DB_DSN:'sqlite:'+alias},4);
      fs.unlinkSync(alias);
      const hardlink=path.join(base,'private','hardlink-'+name+'.sqlite');
      fs.linkSync(data,hardlink);
      report(cms,env,4);
      fs.unlinkSync(hardlink);
      report(cms,env,0);
      const badCommand=php(path.join(cms,'bin/startup-readiness.php'),['--apply'],env);
      check(badCommand.status===3 && badCommand.stderr.trim()==='STARTUP_READINESS_REFUSED',
        'startup inspection cannot be invoked as write operation');
    }
    let first=await start(pairs[0].cms,pairs[0].env);
    let second=await start(pairs[1].cms,pairs[1].env);
    servers.push(first,second);
    for(const s of [first,second]){
      const r=await request(s);
      check(r.status===200 && r.text==='{"status":"ok"}'
        && r.cacheControl==='no-store' && r.nosniff==='nosniff',
        'fully initialized lab-only CMS serves real verified PHP HTTP health');
      for(const [method,url] of [
        ['POST','/api/publish'],['GET','/admin'],
        ['GET','/bin/startup-readiness.php'],['GET','/vendor/autoload.php']
      ]){
        const privateRoute=await request(s,url,{method});
        check(privateRoute.status===404,
          'no write/private routing surfaced from gated HTTP '+method+' '+url);
      }
    }
    await stop(first);
    servers.shift();
    const wrongSite=await start(pairs[0].cms,
      {...pairs[0].env,CMS_SITE_ID:pairs[1].env.CMS_SITE_ID});
    safeRefusal(await request(wrongSite),'wrong CMS installation identity');
    await stop(wrongSite);

    // Tamper a live DB migration journal. The HTTP gate must reject on the next
    // request, without rewriting the journal or affecting another installation.
    const db1=pairs[0].data;
    const snapshot=fs.readFileSync(db1);
    const corrupt=php('-r',[
      '$p=new PDO($argv[1]);$p->exec("UPDATE cms_schema_migrations SET checksum=\'tampered\' WHERE version=1");',
      'sqlite:'+db1
    ]);
    check(corrupt.status===0,'inject deliberate migration journal mismatch');
    const failed=await start(pairs[0].cms,pairs[0].env);
    safeRefusal(await request(failed),'corrupted database journal');
    await stop(failed);
    check(!snapshot.equals(fs.readFileSync(db1)),
      'failed readiness check did not silently repair schema history');
    fs.writeFileSync(db1,snapshot);
    const recovered=await start(pairs[0].cms,pairs[0].env);
    check((await request(recovered)).status===200,
      'restored known-good empty foundation responds without reinstall');
    await stop(recovered);
    check((await request(second)).status===200,
      'second site unaffected by first site schema corruption');

    const missing=await start(pairs[0].cms,
      {...pairs[0].env,CMS_DB_DSN:'sqlite:'+path.join(base,'private','absent.sqlite')});
    safeRefusal(await request(missing),'database file absent');
    await stop(missing);
    check(!fs.existsSync(path.join(base,'private','absent.sqlite')),
      'HTTP gate never creates missing SQLite database');

    const invalid=await start(pairs[0].cms,
      {...pairs[0].env,CMS_STAGE2_RUNTIME_GATE:'unrecognized'});
    safeRefusal(await request(invalid),'unknown opt-in gate mode');
    await stop(invalid);

    // Deliberate legacy path still exists for other Stage2 labs; do not
    // confuse this opt-in laboratory gate with unconditional production safety.
    const legacy=await start(pairs[0].cms,{CMS_STAGE2_RUNTIME_GATE:''});
    check((await request(legacy)).status===200,
      'legacy lab-only health is unguarded until production bootstrap design');
    await stop(legacy);

    console.log('Stage2 opt-in read-only startup gate, two independent DBs, strict CLI, real PHP HTTP, SQL drift, host/identity abuse PASS: '+
      checks+' assertions. CI-only, no production or target host.');
  }finally{
    for(const s of servers)await stop(s);
    fs.rmSync(base,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error('Stage2 startup gate CI FAILED:',e.message);process.exitCode=1;});
