'use strict';
// Stage2 integrated continuation: independent DB-key locks, real multi-site
// SIGKILL/re-plan, explicit portable EMPTY foundation transfer and loopback HTTP.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
const grant={CMS_ENV:'test',CMS_STAGE2_RUNTIME_GATE:'ci-bound',CMS_ALLOW_SQLITE_TEST_ONLY:'1'};
const flags={php81:true,pdo:true,https:true,privateStorage:true,isolatedRoots:true,
  rewriteRoutes:true,sitePhp:false,nodeRuntime:false,reverseProxy:false};
let checks=0;
function ok(value,label){assert.ok(value,label);checks++;}
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true,mode:0o700});fs.writeFileSync(p,s,{mode:0o600});};
function fixture(home,name,siteId='ci-portable'){
  const cms=path.join(home,'cms-'+name),site=path.join(home,'site-'+name);
  fs.cpSync(STAGE,cms,{recursive:true,force:false,errorOnExist:true});
  write(path.join(site,'public/index.html'),'CI STATIC SITE '+name);
  const dir=path.join(home,'private');fs.mkdirSync(dir,{recursive:true,mode:0o700});
  return {siteId,cmsRoot:cms,siteRoot:site,family:'html',
    capabilities:{...flags},dbFile:path.join(dir,name+'.sqlite'),
    bindingFile:path.join(dir,name+'.binding.json')};
}
const env=x=>({...process.env,...grant,CMS_SITE_ID:x.siteId,CMS_DB_DSN:'sqlite:'+x.dbFile,
  CMS_STAGE2_BINDING_FILE:x.bindingFile});
const exe=(which,mode,config,approval='none',extra={})=>spawnSync('php',[
  path.join(STAGE,'bin',which),mode,'--config='+config,'--approval='+approval
],{encoding:'utf8',timeout:90000,env:{...process.env,...grant,...extra}});
function refused(r,code,msg){
  ok(r.status===3&&r.stdout===''&&r.stderr.trim()===code,msg);
}
function operator(x,mode,token='none'){
  return spawnSync('php',[x.cmsRoot+'/bin/lab-empty-installer.php',mode,
    '--cms-root='+x.cmsRoot,'--site-root='+x.siteRoot,'--family=html',
    '--capabilities-file='+x.capFile,'--binding-file='+x.bindingFile,
    '--approval='+token],{encoding:'utf8',timeout:60000,env:env(x)});
}
function fresh(x){
  x.capFile=path.join(path.dirname(x.dbFile),path.basename(x.dbFile)+'.caps.json');
  write(x.capFile,JSON.stringify(flags));
  const p=operator(x,'--plan');
  ok(p.status===0&&JSON.parse(p.stdout).state==='install_required','new instance read-only plan '+x.cmsRoot);
  const a=operator(x,'--apply',JSON.parse(p.stdout).token);
  ok(a.status===0&&JSON.parse(a.stdout).state==='ready','source empty CMS installed');
}
const php=(script,args=[],environment=grant)=>spawnSync('php',['-r',script,...args],{
  encoding:'utf8',timeout:30000,env:{...process.env,...environment}});
const clean=x=>({
  siteId:x.siteId,cmsRoot:x.cmsRoot,siteRoot:x.siteRoot,family:x.family,
  capabilities:x.capabilities,dbFile:x.dbFile,bindingFile:x.bindingFile
});
const transferDoc=(source,target)=>({format:'ai-site-cms-stage2-foundation-transfer-v1',
  source:clean(source),target:clean(target)});
async function freePort(){
  const s=net.createServer();
  await new Promise((yes,no)=>s.once('error',no).listen(0,'127.0.0.1',yes));
  const port=s.address().port;
  await new Promise(resolve=>s.close(resolve));return port;
}
async function http(x){
  const p=await freePort(),url='http://127.0.0.1:'+p;
  const child=spawn('php',['-S','127.0.0.1:'+p,'-t',x.cmsRoot+'/public',
    x.cmsRoot+'/public/index.php'],{stdio:'ignore',env:env(x)});
  try{
    for(let i=0;i<70;i++){
      if(child.exitCode!==null)throw Error('PHP exited');
      try{
        const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(400)});
        if(r.status===200)return {child,url};
      }catch{}
      await new Promise(done=>setTimeout(done,60));
    }
    throw Error('HTTP readiness timeout');
  }catch(e){child.kill();throw e;}
}
async function waitChild(child,expectSignal){
  const result=await new Promise((resolve,reject)=>{
    child.once('error',reject);
    child.once('close',(code,signal)=>resolve({code,signal}));
  });
  ok(expectSignal?result.signal==='SIGKILL':result.code===0,
    'child terminated expected mode');
}
async function main(){
  verify();const home=fs.mkdtempSync(path.join(os.tmpdir(),'cms-stage2-transfer-'));
  try{
    // A. Portable EMPTY foundation snapshot, keeping source intact and
    // binding a separate target with different absolute CMS/site paths.
    const src=fixture(home,'source');fresh(src);
    const generation=php('$db=new PDO("sqlite:".$argv[1]);$db->exec("UPDATE cms_installation SET storage_generation=13");',[src.dbFile]);
    ok(generation.status===0,'generation updated in source private metadata');
    const srcBefore=fs.readFileSync(src.dbFile);
    const target=fixture(home,'target');
    const f=path.join(home,'private','transfer.json');
    write(f,JSON.stringify(transferDoc(src,target)));
    const command=(mode,token='none',file=f,extra={})=>
      exe('lab-foundation-transfer.php',mode,file,token,extra);
    const first=command('--plan');
    ok(first.status===0,'portable read-only plan');
    const p=JSON.parse(first.stdout);
    ok(p.state==='install_required'&&p.sourceUnchanged===true&&!p.dataOrMediaTransferred
      && /^[a-f0-9]{64}$/.test(p.token),'portable token+nonproduct explicit limits');
    ok(!fs.existsSync(target.dbFile)&&!fs.existsSync(target.bindingFile),
      'portable PLAN does not create DB or binding');
    refused(command('--apply','0'.repeat(64)),'FOUNDATION_TRANSFER_REFUSED','fabricated transfer approval rejected');
    refused(command('--plan','none',f,{CMS_ENV:'production'}),'FOUNDATION_TRANSFER_REFUSED','production transfer refused');
    const done=command('--apply',p.token);
    ok(done.status===0&&JSON.parse(done.stdout).state==='ready','portable source->target applied');
    ok(fs.readFileSync(src.dbFile).equals(srcBefore),'source SQLite remained unchanged');
    ok(fs.existsSync(target.dbFile)&&fs.existsSync(target.bindingFile),'target has new private state');
    const mirror=php('foreach(array_slice($argv,1) as $path){$db=new PDO("sqlite:".$path);echo $db->query("SELECT site_id || CHAR(58) || storage_generation FROM cms_installation")->fetchColumn()."\\n";}',[src.dbFile,target.dbFile]);
    ok(mirror.status===0&&mirror.stdout.trim()==='ci-portable:13\nci-portable:13',
      'foundation site ID and generation preserved across roots');
    const finished=command('--plan');ok(finished.status===0&&JSON.parse(finished.stdout).state==='ready',
      'independent target can be re-inspected');
    refused(command('--apply',p.token),'FOUNDATION_TRANSFER_REFUSED','old transfer token stale');
    const noop=command('--apply',JSON.parse(finished.stdout).token);
    ok(noop.status===0&&JSON.parse(noop.stdout).changed===false,'idempotent verified transfer');
    // Both independent local HTTP roots remain healthy; private assets inaccessible.
    const live=[await http(src),await http(target)];
    try{
      for(const h of live){
        const resp=await fetch(h.url+'/api/health');
        ok(resp.status===200&&await resp.text()==='{"status":"ok"}','gated independent HTTP');
        ok((await fetch(h.url+'/bin/lab-foundation-transfer.php')).status===404,'private transfer CLI not public');
        ok((await fetch(h.url+'/api/publish',{method:'POST'})).status===404,'no product write route');
      }
    } finally {
      for(const h of live){
        h.child.kill('SIGTERM');
        await new Promise(done=>h.child.exitCode!==null?done():h.child.once('exit',done));
      }
    }
    // B. Explicit fresh approval after interrupted target DB restoration.
    const resumed=fixture(home,'resumed');
    const rf=path.join(home,'private','resume-transfer.json');
    write(rf,JSON.stringify(transferDoc(src,resumed)));
    const prior=command('--plan','none',rf);
    ok(prior.status===0&&JSON.parse(prior.stdout).state==='install_required','resume fixture starts empty');
    const restore=php(
      'require $argv[1];$s=new PDO("sqlite:".$argv[2]);$s->exec("PRAGMA query_only=ON");'+
      '$txt=(new AiSiteCms\\Storage\\FoundationSnapshot($s,true))->export($argv[4]);'+
      'umask(0077);$t=new PDO("sqlite:".$argv[3]);'+
      '(new AiSiteCms\\Storage\\FoundationSnapshot($t,true))->restoreToFreshCiDatabase($txt,$argv[4]);',
      [resumed.cmsRoot+'/vendor/autoload.php',src.dbFile,resumed.dbFile,src.siteId],grant);
    ok(restore.status===0&&fs.existsSync(resumed.dbFile)&&!fs.existsSync(resumed.bindingFile),
      'interruption after restore before binding leaves recoverable private DB');
    refused(command('--apply',JSON.parse(prior.stdout).token,rf),
      'FOUNDATION_TRANSFER_REFUSED','pre-crash approval cannot auto-resume');
    const recover=command('--plan','none',rf);
    ok(recover.status===0&&JSON.parse(recover.stdout).state==='binding_required',
      'fresh plan validates restored metadata without mutating');
    const resumedResult=command('--apply',JSON.parse(recover.stdout).token,rf);
    ok(resumedResult.status===0&&fs.existsSync(resumed.bindingFile),'operator explicitly resumes binding only');
    ok(JSON.parse(command('--plan','none',rf).stdout).state==='ready','recovered transfer ready');
    // C. Unsafe/foreign/changed targets refused before write.
    const invalid=(edit,name)=>{
      const d=transferDoc(src,fixture(home,'invalid'+name));
      edit(d);const config=path.join(home,'private','bad-'+name+'.json');
      write(config,JSON.stringify(d));
      refused(command('--plan','none',config),'FOUNDATION_TRANSFER_REFUSED','unsafe transfer config '+name);
    };
    invalid(d=>{d.target.siteId='different-site'},'identity');
    invalid(d=>{d.target.dbFile=d.source.dbFile},'sharedDB');
    invalid(d=>{d.target.cmsRoot=d.source.cmsRoot},'sharedCode');
    invalid(d=>{d.target.family='php'},'family');
    invalid(d=>{d.target.capabilities.https=false},'https');
    const corrupted=fixture(home,'corrupted');
    const corruptConf=path.join(home,'private','corrupted-plan.json');
    write(corruptConf,JSON.stringify(transferDoc(src,corrupted)));
    fs.appendFileSync(corrupted.cmsRoot+'/private/package-manifest.json',' ');
    refused(command('--plan','none',corruptConf),'FOUNDATION_TRANSFER_REFUSED','target package digest mismatch');
    // D. True SIGKILL between fleet-installed sites: no auto rollback,
    // fresh group approval reuses completed site and finishes remaining.
    const fxs=['a','b','c'].map(n=>fixture(home,'kill'+n,'kill-site-'+n));
    const fleetFile=path.join(home,'private','kill-fleet.json');
    write(fleetFile,JSON.stringify({format:'ai-site-cms-stage2-install-fleet-v1',instances:fxs}));
    const fleet=(mode,token='none',extra={})=>exe('lab-fleet-operator.php',mode,fleetFile,token,extra);
    const fleetBefore=fleet('--plan');
    ok(fleetBefore.status===0,'fleet crash preparation plan');
    const beforeToken=JSON.parse(fleetBefore.stdout).token;
    const child=spawn('php',[STAGE+'/bin/lab-fleet-operator.php','--apply',
      '--config='+fleetFile,'--approval='+beforeToken],{
      env:{...process.env,...grant,CMS_STAGE2_INJECT_FLEET_CRASH:'1',
        CMS_STAGE2_FAULT_AFTER_SITE:fxs[0].siteId}});
    let stderr='';
    const checkpoint=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('fleet child never reached checkpoint')),20000);
      child.stderr.on('data',chunk=>{
        stderr+=chunk;
        if(stderr.includes('CI_FLEET_FAULT_HOOK')){clearTimeout(timer);resolve();}
      });
      child.once('error',e=>{clearTimeout(timer);reject(e);});
      child.once('close',()=>{clearTimeout(timer);reject(Error('child exited before fault hook'));});
    });
    try{await checkpoint;child.kill('SIGKILL');await waitChild(child,true);}
    finally{if(child.exitCode===null)child.kill('SIGKILL');}
    ok(fs.existsSync(fxs[0].bindingFile)&&!fs.existsSync(fxs[1].dbFile),
      'SIGKILL leaves first site ready and remaining sites untouched');
    refused(fleet('--apply',beforeToken),'FLEET_OPERATOR_REFUSED','old fleet token invalid after SIGKILL');
    const newPlan=fleet('--plan');
    ok(newPlan.status===0&&JSON.parse(newPlan.stdout).token!==beforeToken,'new fleet token after real kill');
    ok(JSON.parse(newPlan.stdout).instances[0].state==='ready','completed site not forgotten');
    const completed=fleet('--apply',JSON.parse(newPlan.stdout).token);
    ok(completed.status===0&&JSON.parse(completed.stdout).changed===2,
      'explicit postkill replan installs remaining two sites only');
    ok(JSON.parse(fleet('--plan').stdout).allReady,'fleet stable after recovery');
    // E. Competing site operators with distinct CMS/site identities but ONE
    // DB path: shared DB key ensures lock regardless of declared site ID.
    const xa=fixture(home,'contend-a','contender-a'),xb=fixture(home,'contend-b','contender-b');
    xb.dbFile=xa.dbFile;
    for(const x of [xa,xb]){
      x.capFile=path.join(home,'private',path.basename(x.cmsRoot)+'.cap.json');
      write(x.capFile,JSON.stringify(flags));
    }
    const a=operator(xa,'--plan'),b=operator(xb,'--plan');
    ok(a.status===0&&b.status===0,'both competing pre-write plans observe empty DB');
    const concurrent=x=>new Promise((resolve,reject)=>{
      const token=JSON.parse((x===xa?a:b).stdout).token;
      const proc=spawn('php',[x.cmsRoot+'/bin/lab-empty-installer.php','--apply',
        '--cms-root='+x.cmsRoot,'--site-root='+x.siteRoot,'--family=html',
        '--capabilities-file='+x.capFile,'--binding-file='+x.bindingFile,'--approval='+token],{
        env:env(x)});
      proc.once('error',reject);proc.once('close',code=>resolve(code));
    });
    const codes=await Promise.all([concurrent(xa),concurrent(xb)]);
    ok(codes.filter(c=>c===0).length===1&&codes.filter(c=>c===3).length===1,
      'per-database serialization rejects competing site ownership');
    ok(fs.existsSync(xa.bindingFile)!==fs.existsSync(xb.bindingFile),
      'shared DB has exactly one chosen owner');
    console.log('Stage2 PORTABLE EMPTY metadata transfer + shared-DB lease + REAL SIGKILL fleet recovery PASS: '+checks+' checks; NO production/data/media restore.');
  } finally {fs.rmSync(home,{recursive:true,force:true});}
}
main().catch(e=>{console.error('Stage2 cross-boundary integration FAILED',e.stack||e.message);process.exitCode=1;});
