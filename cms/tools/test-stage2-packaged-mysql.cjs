'use strict';

/**
 * First fully connected distributed Stage2 CMS package => independent
 * MySQL 8.4 databases / least-shared identities => explicit install =>
 * separate PHP visitor sites and read-only public route, all disposable CI.
 *
 * NOT real shared hosting, TLS, FPM, binding of MySQL to the public health
 * endpoint, authenticated admin, real page data or production permissions.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const net=require('node:net');
const {spawnSync,spawn}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');

if(process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true'
  ||process.env.CMS_ALLOW_DESTRUCTIVE_MYSQL_CI!=='1'
  ||process.env.CMS_TEST_MYSQL_ROOT_PASSWORD!=='ephemeral_root_ci_only'
  ||process.env.CMS_TEST_MYSQL_DSN!==
    'mysql:host=127.0.0.1;port=3306;dbname=ai_site_cms_ci;charset=utf8mb4'
  ||process.env.CMS_TEST_MYSQL_USER!=='cms_ci'){
  throw Error('Refusing packaged MySQL scenario outside dedicated disposable GitHub Actions');
}
const pairs=[
 {db:'ai_stage2_pkg_a_ci',user:'stage2pkg_a_ci',password:'disposable_stage2_a_ci',siteId:'stage2-packaged-a',family:'html'},
 {db:'ai_stage2_pkg_b_ci',user:'stage2pkg_b_ci',password:'disposable_stage2_b_ci',siteId:'stage2-packaged-b',family:'php'}
];
let checks=0;
function ok(value,label){assert.ok(value,label);++checks;}
const run=(cmd,args,env={})=>spawnSync(cmd,args,{encoding:'utf8',timeout:45000,
  maxBuffer:1024*1024,env:{...process.env,...env}});
const script=path.join(__dirname,'../tests/fixtures/stage2-packaged-mysql-operator.php');
const manage=action=>run('php',[script,action]);
function mysqlEnv(x,overrides={}){
 return {CMS_DB_DSN:'mysql:host=127.0.0.1;port=3306;dbname='+x.db+';charset=utf8mb4',
  CMS_DB_USER:x.user,CMS_DB_PASSWORD:x.password,CMS_SITE_ID:x.siteId,...overrides};
}
function invoke(x,name,flags,env){return run('php',[path.join(x.cms,'bin',name+'.php'),...flags],env);}
function nonsecret(resp,label){
 ok(!String(resp.stdout).includes('disposable_stage2_')
    &&!String(resp.stderr).includes('disposable_stage2_')
    &&!String(resp.stdout).includes('ai_stage2_pkg_')
    &&!String(resp.stderr).includes('ai_stage2_pkg_'),
    label+' must not disclose connection details');
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function port(){
 const s=net.createServer();
 await new Promise((resolve,reject)=>s.once('error',reject).listen(0,'127.0.0.1',resolve));
 const p=s.address().port;
 await new Promise(resolve=>s.close(resolve));return p;
}
async function start(publicDir,router,environment={}){
 const p=await port(),url='http://127.0.0.1:'+p;
 const args=['-S','127.0.0.1:'+p,'-t',publicDir];
 if(router) args.push(router);
 const child=spawn('php',args,{stdio:'ignore',
   env:{...process.env,...environment}});
 for(let i=0;i<70;i++){
  if(child.exitCode!==null)throw Error('Disposable visitor/CMS HTTP process exited');
  try{
   const response=await fetch(url+'/',{signal:AbortSignal.timeout(400)});
   await response.arrayBuffer();
   return {url,child};
  }catch{await pause(50);}
 }
 child.kill();throw Error('Disposable PHP HTTP process did not start');
}
async function close(instance){
 if(!instance || instance.child.exitCode!==null||instance.child.signalCode!==null)return;
 const finished=new Promise(resolve=>instance.child.once('exit',resolve));
 instance.child.kill('SIGTERM');await finished;
}
async function status(url,init={}){
 const response=await fetch(url,{...init,signal:AbortSignal.timeout(2400)});
 return {code:response.status,body:await response.text()};
}
async function main(){
 verify();
 const dataRoot=fs.mkdtempSync(path.join(os.tmpdir(),'ai-cms-pkg-mysql-'));
 const processes=[];
 let provisioned=false;
 try{
  const setup=manage('--provision');
  if(setup.status!==0)throw Error('Ephemeral MySQL operator refused at stage: '+setup.stderr.trim());
  ok(setup.stdout.trim()==='STAGE2_PACKAGED_MYSQL_PROVISIONED',
    'two new independent dedicated DB/user pairs provisioned on disposable MySQL only');
  provisioned=true;
  const instances=pairs.map((x,i)=>{
    const cms=path.join(dataRoot,'cms-'+i),site=path.join(dataRoot,'site-'+i);
    fs.cpSync(STAGE,cms,{recursive:true,force:false,errorOnExist:true});
    const root=site+'/public';
    fs.mkdirSync(root,{recursive:true,mode:0o700});
    if(x.family==='html')fs.writeFileSync(root+'/index.html','INDEPENDENT-VISITOR-A',{mode:0o600});
    else fs.writeFileSync(root+'/index.php','<?php echo "INDEPENDENT-VISITOR-B";',{mode:0o600});
    return {...x,cms,site};
  });
  for(const x of instances) {
    const env=mysqlEnv(x);
    const manifest=invoke(x,'package-preflight',['--check','--package-root='+x.cms],env);
    ok(manifest.status===0 && JSON.parse(manifest.stdout).filesVerified>400,
      'actual distributed standalone PHP package verifies without build tools');
    const before=invoke(x,'schema-preflight',['--inspect'],env);
    ok(before.status===3 && JSON.parse(before.stdout).state==='uninitialized',
      'read-only preflight recognizes independently empty MySQL DB');
    const attempt=invoke(x,'install',[],env);
    ok(attempt.status===2,'explicit manual install is mandatory');
    const installed=invoke(x,'install',['--apply'],env);
    ok(installed.status===0 && installed.stderr==='',
      'packaged executable initializes dedicated MySQL metadata and site identity');
    nonsecret(installed,'packaged installer');
    const ready=invoke(x,'schema-preflight',['--inspect'],env);
    ok(ready.status===0 && JSON.parse(ready.stdout).state==='ready'
      && JSON.parse(ready.stdout).version===2,
      'fresh process finds site identity + current migration after packaged install');
    nonsecret(ready,'schema preflight');
    const again=invoke(x,'install',['--apply'],env);
    ok(again.status===0,'idempotent installer does not duplicate site metadata');
    const alien=invoke(x,'schema-preflight',['--inspect'],mysqlEnv(x,{CMS_SITE_ID:'foreign-site'}));
    ok(alien.status===4 && JSON.parse(alien.stdout).state==='blocked',
      'unexpected installation identity cannot pass read-only readiness');
    const reject=invoke(x,'install',['--apply'],mysqlEnv(x,{CMS_SITE_ID:'foreign-site'}));
    ok(reject.status===1,'cross-site reinstall attempt is rejected');
    nonsecret(reject,'denied installer');
  }
  for(let i=0;i<instances.length;i++){
    const x=instances[i],other=instances[1-i];
    const denied=invoke(x,'schema-preflight',['--inspect'],
      mysqlEnv(x,{CMS_DB_DSN:mysqlEnv(other).CMS_DB_DSN}));
    ok(denied.status===2 && denied.stdout==='',
      "MySQL account cannot access the other site's physical database");
    nonsecret(denied,'DB cross-access refusal');
  }
  for(const x of instances){
    const cms=await start(x.cms+'/public',x.cms+'/public/index.php');
    processes.push(cms);
    const visitor=await start(x.site+'/public',null);
    processes.push(visitor);
    const health=await status(cms.url+'/api/health');
    ok(health.code===200 && health.body==='{"status":"ok"}',
      'packaged public health serves only static non-sensitive response');
    const privateUrl=await status(cms.url+'/private/compliance/npm-package-lock.json');
    ok(privateUrl.code===404,'private SBOM/lock files not publicly routable');
    const writeUrl=await status(cms.url+'/api/publish',{method:'POST'});
    ok(writeUrl.code===404,'no write API exposed in empty packaged CMS');
    const siteHome=await status(visitor.url+'/');
    ok(siteHome.code===200
      &&siteHome.body.includes(x.family==='html'?'INDEPENDENT-VISITOR-A':'INDEPENDENT-VISITOR-B'),
      'site is served through a separate site process');
    await close(cms);
    ok((await status(visitor.url+'/')).code===200,
      'visitor remains available when its CMS HTTP process is down');
    await close(visitor);
    // In Stage2, enabling the SQLite-only binding gate must refuse a MySQL
    // health check, not falsely certify a MySQL-backed request.
    const guarded=await start(x.cms+'/public',x.cms+'/public/index.php',{
      CMS_ENV:'test',CMS_STAGE2_RUNTIME_GATE:'ci-bound',
      CMS_ALLOW_SQLITE_TEST_ONLY:'1',...mysqlEnv(x)
    });
    processes.push(guarded);
    const blocked=await status(guarded.url+'/api/health');
    ok(blocked.code===503,'Stage2 SQLite-only HTTP binding gate refuses MySQL');
    await close(guarded);
  }
  console.log('Stage2 verified INTERNAL PHP package + two isolated MySQL 8.4 credentials/DBs,'
    +' CLI install/restart/read-only API, foreign schema refusal and independent visitor PASS: '
    +checks+' checks. Still NO MySQL-to-HTTP binding or real shared-host/TLS approval.');
 }finally{
  for(const child of processes.reverse())await close(child);
  fs.rmSync(dataRoot,{recursive:true,force:true});
  // Cleanup is authorized only by the same gated ephemeral MySQL fixture.
  if(provisioned){
    const cleanup=manage('--cleanup');
    if(cleanup.status!==0)throw Error('Disposable MySQL cleanup failed');
  }
 }
}
main().catch(e=>{console.error('Stage2 packaged MySQL integration FAILED:',e.stack||e.message);
 process.exitCode=1;});
