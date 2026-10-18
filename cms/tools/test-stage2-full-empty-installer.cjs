'use strict';
// Stage2 LARGE-BLOCK E2E: read-only plan, explicit approve/apply,
// resumable DB-before-binding install, multi-site runtime families,
// process concurrency, fail-closed inputs, real HTTP and no hosted writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
let checks=0;
function check(b,s){assert.ok(b,s);checks++;}
function file(name,contents){
  fs.mkdirSync(path.dirname(name),{recursive:true,mode:0o700});
  fs.writeFileSync(name,contents,{mode:0o600});
}
function php(script,args=[],env={}){
  return spawnSync('php',[script,...args],{encoding:'utf8',timeout:45000,
    env:{...process.env,...env},maxBuffer:1024*1024});
}
function argv(x,mode,approval){
  return [mode,'--cms-root='+x.cms,'--site-root='+x.site,
    '--family='+x.family,'--capabilities-file='+x.capFile,
    '--binding-file='+x.binding,'--approval='+(approval||'none')];
}
function execute(x,mode,approval,env=x.env){
  return php(path.join(x.cms,'bin/lab-empty-installer.php'),
    argv(x,mode,approval),env);
}
function safeRefusal(result,reason){
  check(result.status===3 && result.stdout==='' &&
    result.stderr.trim()==='EMPTY_INSTALL_OPERATOR_REFUSED',reason);
}
function plan(x,expected,env=x.env){
  const result=execute(x,'--plan',undefined,env);
  check(result.status===0 && result.stderr==='',expected+' plan successful');
  const j=JSON.parse(result.stdout);
  check(j.state===expected && j.readOnly && j.productionReady===false
    && j.signatureVerified===false && /^[a-f0-9]{64}$/.test(j.token)
    && !result.stdout.includes(x.cms) && !result.stdout.includes(x.db),
    expected+' plan has state and opaque token without disclosing private paths');
  return j;
}
function apply(x,approval,env=x.env){
  return execute(x,'--apply',approval,env);
}
function envFor(x){
  return {
    CMS_STAGE2_RUNTIME_GATE:'ci-bound',CMS_ENV:'test',
    CMS_ALLOW_SQLITE_TEST_ONLY:'1',
    CMS_DB_DSN:'sqlite:'+x.db,CMS_SITE_ID:'stage2-'+x.name,
    CMS_STAGE2_BINDING_FILE:x.binding
  };
}
const capabilityBase={php81:true,pdo:true,https:true,
  privateStorage:true,isolatedRoots:true,rewriteRoutes:true,
  sitePhp:false,nodeRuntime:false,reverseProxy:false};
function createSite(site,family){
  if(family==='php') file(path.join(site,'public/index.php'),'<?php echo "PHP-SITE-INDEPENDENT";');
  else if(family==='next-ssr'){
    file(path.join(site,'public/favicon.ico'),'test');
    file(path.join(site,'.next/BUILD_ID'),'CI-BUILD-NOT-EXECUTED');
    file(path.join(site,'package.json'),'{"name":"ci-only","dependencies":{"next":"15.0.0"}}');
  }else{
    file(path.join(site,'public/index.html'),'<title>INDEPENDENT-'+family+'</title>');
    if(family==='next-static')file(path.join(site,'public/_next/static/app.js'),'window.nextStatic=1');
  }
}
async function freePort(){
  const server=net.createServer();
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));return port;
}
async function start(cms,env){
  const port=await freePort(),base='http://127.0.0.1:'+port;
  const process=spawn('php',['-S','127.0.0.1:'+port,
    '-t',path.join(cms,'public'),path.join(cms,'public/index.php')],{
      env:{...globalThis.process.env,...env},stdio:'ignore'
    });
  for(let t=0;t<80;t++){
    if(process.exitCode!==null) throw Error('isolated HTTP child exited');
    try {
      const res=await fetch(base+'/api/health',{signal:AbortSignal.timeout(600)});
      await res.text();
      return {process,base};
    }catch {await new Promise(ok=>setTimeout(ok,60));}
  }
  process.kill();throw Error('PHP loopback startup failed');
}
async function stop(s){
  if(!s || s.process.exitCode!==null)return;
  s.process.kill('SIGTERM');
  await new Promise(done=>s.process.exitCode!==null?done():s.process.once('exit',done));
}
async function req(s,route='/api/health',method='GET'){
  const response=await fetch(s.base+route,{method,signal:AbortSignal.timeout(4000)});
  return {status:response.status,body:await response.text(),
    cache:response.headers.get('cache-control')};
}
async function main(){
  verify();
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-full-empty-installer-'));
  try {
    const families=['html','php','react-spa','next-static','next-ssr'];
    const xs=families.map((family,i)=>{
      const name='site'+(i+1),cms=path.join(base,'cms-'+name);
      fs.cpSync(STAGE,cms,{recursive:true,force:false,errorOnExist:true});
      const site=path.join(base,'site-'+name);
      createSite(site,family);
      const db=path.join(base,'private',name+'.sqlite');
      const binding=path.join(base,'private',name+'.binding.json');
      const capFile=path.join(base,'private',name+'.caps.json');
      const flags={...capabilityBase,
        sitePhp:family==='php',
        nodeRuntime:family==='next-ssr',reverseProxy:family==='next-ssr'};
      file(capFile,JSON.stringify(flags));
      const instance={name,site,cms,db,binding,capFile,family};
      instance.env=envFor(instance);
      return instance;
    });
    // A: No implicit IO in planning; each runtime family stays isolated.
    for(const x of xs){
      const first=plan(x,'install_required');
      const second=plan(x,'install_required');
      check(first.token===second.token,'stable read-only plan digest '+x.family);
      check(!fs.existsSync(x.db) && !fs.existsSync(x.binding),
        'planning never opens or creates SQLite/secret files '+x.family);
      const noApproval=apply(x,'f'.repeat(64));
      safeRefusal(noApproval,'refuse made-up approval without DB writes '+x.family);
      check(!fs.existsSync(x.db),'bad token did not start DB install '+x.family);
    }
    // B: Fresh install 3 types in a single operator transaction; PHP,
    // static React and SSR topology are policy declarations, not executed builds.
    for(const x of [xs[0],xs[1],xs[2],xs[4]]){
      const p=plan(x,'install_required');
      const applied=apply(x,p.token);
      check(applied.status===0 && JSON.parse(applied.stdout).state==='ready'
        && JSON.parse(applied.stdout).changed===true,
        'explicit plan/application completes '+x.family);
      check(fs.existsSync(x.db) && fs.existsSync(x.binding),
        'installation created only dedicated DB and private binding '+x.family);
      const after=plan(x,'ready');
      const noOp=apply(x,after.token);
      check(noOp.status===0 && !JSON.parse(noOp.stdout).changed,
        'safe idempotent verified repeat of complete '+x.family);
      const stale=apply(x,p.token);
      safeRefusal(stale,'stale before-state token cannot approve a second change '+x.family);
      const mode=fs.statSync(x.binding).mode;
      check((mode&0o077)===0,'binding is private '+x.family);
    }

    // C: Crash/recovery boundary. Simulate the post-schema/pre-binding
    // operator interruption. Re-plan, explicitly approve *new* bind-only token.
    const recovery=xs[3];
    const original=plan(recovery,'install_required');
    const installed=php(path.join(recovery.cms,'bin/install.php'),['--apply'],recovery.env);
    check(installed.status===0,'database phase independently succeeded before interrupted binding');
    check(fs.existsSync(recovery.db) && !fs.existsSync(recovery.binding),
      'interrupted operation left DB but no fabricated binding');
    safeRefusal(apply(recovery,original.token),
      'stale first-phase token cannot auto-complete interrupted install');
    const resumed=plan(recovery,'binding_required');
    check(resumed.token!==original.token,'recovery requires new explicit approval');
    const resumedApply=apply(recovery,resumed.token);
    check(resumedApply.status===0 && JSON.parse(resumedApply.stdout).changed,
      'operator explicitly resumes with only missing private binding');
    check(plan(recovery,'ready').state==='ready','resumed install ready');

    // D: All five families, real PHP HTTP health, no administration or writes.
    // Website availability under CMS outage is checked for static and PHP.
    for(const x of xs){
      const cli=php(path.join(x.cms,'bin/startup-readiness.php'),['--check'],x.env);
      check(cli.status===0 && JSON.parse(cli.stdout).ready,
        'every bound family passes isolated readiness '+x.family);
      const http=await start(x.cms,x.env);
      try{
        let response=await req(http);
        check(response.status===200 && response.body==='{"status":"ok"}',
          'packaged gated PHP serves correct health '+x.family);
        for(const [method,url] of [['POST','/api/publish'],
          ['PUT','/api/draft'],['GET','/bin/lab-empty-installer.php'],
          ['GET','/vendor/autoload.php'],['GET','/private/package-manifest.json']]){
          response=await req(http,url,method);
          check(response.status===404,'admin/secret stays inaccessible '+x.family+' '+method+' '+url);
        }
      }finally{await stop(http);}
    }
    for(const x of xs.slice(0,4)){
      // The visitor site is served from its own physical webroot without CMS.
      const port=await freePort();
      const server=spawn('php',['-S','127.0.0.1:'+port,'-t',path.join(x.site,'public')],{stdio:'ignore'});
      try{
        let received='';
        for(let i=0;i<50;i++){
          try{
            received=await (await fetch('http://127.0.0.1:'+port+'/',{signal:AbortSignal.timeout(500)})).text();
            if(received)break;
          }catch{await new Promise(done=>setTimeout(done,70));}
        }
        check(received.includes(x.family==='php'?'PHP-SITE-INDEPENDENT':'INDEPENDENT-'+x.family),
          'visitor site runs without CMS process '+x.family);
      }finally{
        server.kill('SIGTERM');
        await new Promise(done=>server.exitCode!==null?done():server.once('exit',done));
      }
    }
    // E: Foreign site, database and binding/host declaration mismatches.
    const [a,b]=xs;
    const wrongIdentity={...a,env:{...a.env,CMS_SITE_ID:b.env.CMS_SITE_ID}};
    safeRefusal(execute(wrongIdentity,'--plan'),'foreign site identity blocked at read-only planning');
    const wrongDb={...a,env:{...a.env,CMS_DB_DSN:b.env.CMS_DB_DSN}};
    safeRefusal(execute(wrongDb,'--plan'),'foreign DB identity blocked at planning');
    const wrongSite={...a,site:b.site};
    safeRefusal(execute(wrongSite,'--plan'),'binding to a different site root must not pass');
    const wrongFamily={...a,family:'react-spa'};
    safeRefusal(execute(wrongFamily,'--plan'),'existing binding cannot silently change site renderer family');
    const notHttps=path.join(base,'private','no-https.json');
    file(notHttps,JSON.stringify({...capabilityBase,https:false}));
    safeRefusal(execute({...a,capFile:notHttps},'--plan'),'explicit missing HTTPS refused');
    safeRefusal(execute({...a,env:{...a.env,CMS_ENV:'production'}},'--plan'),
      'no production-mode install path');
    safeRefusal(execute({...a,env:{...a.env,CMS_DB_DSN:'mysql:host=example.invalid'}},'--plan'),
      'no production/MySQL network action');
    const badPath={...a,binding:path.join(a.cms,'public','binding.json')};
    safeRefusal(execute(badPath,'--plan'),'public or nested binding output refused');

    // F: Extra DB tables and tamper must refuse plan without auto-repair.
    const corrupt=xs[4],staged=fs.readFileSync(corrupt.db);
    const pdo=php('-r',[
      '$db=new PDO($argv[1]);$db->exec("CREATE TABLE foreign_content (id INTEGER)");',
      'sqlite:'+corrupt.db
    ]);
    check(pdo.status===0,'hostile foreign table fixture created');
    safeRefusal(execute(corrupt,'--plan'),'refuse schema drift rather than repair');
    check(!fs.readFileSync(corrupt.db).equals(staged),
      'failed plan did not delete or restore corrupted DB automatically');
    // Avoid writing over a live externally used DB: controlled disposable fixture only.
    fs.writeFileSync(corrupt.db,staged);
    check(plan(corrupt,'ready').state==='ready','explicit restoration of disposable DB recovers');

    // G: Real concurrent operators receive same initially approved token.
    // One process must win under flock; the other should fail once state changes.
    const concurrentName='concurrent',clone=path.join(base,'cms-'+concurrentName);
    fs.cpSync(STAGE,clone,{recursive:true,force:false,errorOnExist:true});
    const site=path.join(base,'site-'+concurrentName);
    createSite(site,'html');
    const cx={name:concurrentName,cms:clone,site,family:'html',
      db:path.join(base,'private','concurrent.sqlite'),
      binding:path.join(base,'private','concurrent.binding.json'),
      capFile:path.join(base,'private','concurrent.caps.json')};
    file(cx.capFile,JSON.stringify(capabilityBase));cx.env=envFor(cx);
    const token=plan(cx,'install_required').token;
    const runChild=()=>new Promise((done,reject)=>{
      const child=spawn('php',[path.join(cx.cms,'bin/lab-empty-installer.php'),
        ...argv(cx,'--apply',token)],{env:{...process.env,...cx.env}});
      let stdout='',stderr='';
      child.stdout.on('data',buf=>stdout+=buf);
      child.stderr.on('data',buf=>stderr+=buf);
      child.once('error',reject);
      child.once('close',code=>done({code,stdout,stderr}));
    });
    const combined=await Promise.all([runChild(),runChild()]);
    check(combined.filter(z=>z.code===0).length===1 &&
      combined.filter(z=>z.code===3).length===1,
      'only one of concurrent same-plan operators can install');
    check(plan(cx,'ready').state==='ready' && fs.existsSync(cx.binding),
      'concurrent race results in exactly one verified ready instance');
    const reapproval=apply(cx,plan(cx,'ready').token);
    check(reapproval.status===0 && JSON.parse(reapproval.stdout).changed===false,
      'repeat after concurrency remains no-op');

    console.log('Stage2 integrated five-site FAMILY EMPTY installer plan/apply/recovery/DB+binding/real HTTP/concurrency/hostile fixtures PASS: '+
      checks+' checks; isolated local-only; NO production, no real Next SSR execution.');
  }finally{fs.rmSync(base,{recursive:true,force:true});}
}
main().catch(e=>{console.error('Integrated empty CMS install CI FAILED:',e.message);process.exitCode=1;});
