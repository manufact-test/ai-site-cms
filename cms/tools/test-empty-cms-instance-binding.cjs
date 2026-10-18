'use strict';
// Complete Stage2 offline CI-only instance-binding operator/HTTP rehearsal.
// Deliberately no remote network access, production MySQL, client sites, or keys.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
let checks=0;
function ok(c,why){assert.ok(c,why);checks++;}
function runPhp(script,args=[],env={}){
  return spawnSync('php',[script,...args],{
    env:{...process.env,...env},encoding:'utf8',timeout:30000,maxBuffer:1024*1024
  });
}
function write(file,bytes,mode=0o600){
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  fs.writeFileSync(file,bytes,{mode});
}
const caps={
  php81:true,pdo:true,https:true,privateStorage:true,isolatedRoots:true,
  rewriteRoutes:true,sitePhp:false,nodeRuntime:false,reverseProxy:false
};
function envFor(name,db,config){
  return {
    CMS_STAGE2_RUNTIME_GATE:'ci-bound',CMS_ENV:'test',
    CMS_ALLOW_SQLITE_TEST_ONLY:'1',CMS_SITE_ID:'fixture-'+name,
    CMS_DB_DSN:'sqlite:'+db,CMS_STAGE2_BINDING_FILE:config
  };
}
function cli(cms,opts,env){
  return runPhp(path.join(cms,'bin/bind-empty-instance.php'),
    ['--create','--cms-root='+cms,'--site-root='+opts.site,
      '--family='+opts.family,'--capabilities-file='+opts.caps,
      '--binding-file='+opts.binding],env);
}
function inspect(cms,env){
  return runPhp(path.join(cms,'bin/startup-readiness.php'),['--check'],env);
}
async function freePort(){
  const server=net.createServer();
  await new Promise((ok,bad)=>server.once('error',bad).listen(0,'127.0.0.1',ok));
  const port=server.address().port;
  await new Promise(ok=>server.close(ok));return port;
}
async function start(cms,env){
  const port=await freePort(),base='http://127.0.0.1:'+port;
  const child=spawn('php',['-S','127.0.0.1:'+port,'-t',
    path.join(cms,'public'),path.join(cms,'public/index.php')],{
      env:{...process.env,...env},stdio:'ignore'
    });
  for(let i=0;i<90;i++){
    if(child.exitCode!==null)throw Error('Local PHP server exited');
    try{
      const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(500)});
      await r.text();
      return {child,base};
    }catch{await new Promise(done=>setTimeout(done,60));}
  }
  child.kill();throw Error('Loopback startup timeout');
}
async function stop(s){
  if(!s || s.child.exitCode!==null)return;
  s.child.kill('SIGTERM');
  await new Promise(done=>s.child.exitCode!==null?done():s.child.once('exit',done));
}
async function req(s,route='/api/health',method='GET'){
  const r=await fetch(s.base+route,{method,signal:AbortSignal.timeout(4000)});
  return {status:r.status,body:await r.text(),
    cache:r.headers.get('cache-control'),nosniff:r.headers.get('x-content-type-options')};
}
function expectRefused(cmd,reason){
  ok(cmd.status===3 && cmd.stdout==='' &&
    cmd.stderr.trim()==='INSTANCE_BINDING_REFUSED',reason);
}
function expectGate(cms,env,ready,reason){
  const cmd=inspect(cms,env);
  ok(cmd.status===(ready?0:4) && cmd.stderr==='',reason+' CLI exit');
  const report=JSON.parse(cmd.stdout);
  ok(report.ready===ready && !report.productionReady && report.readOnly && report.ciOnly,
    reason+' bounded report');
  ok(!cmd.stdout.includes(env.CMS_DB_DSN) &&
    !cmd.stdout.includes(env.CMS_SITE_ID),'no site ID or DB DSN disclosed');
  return report;
}
async function http(cms,env,good,reason){
  const s=await start(cms,env);
  try{
    const response=await req(s);
    ok(response.status===(good?200:503) &&
      response.body===(good?'{"status":"ok"}':'{"error":"service_unavailable"}'),
      reason+' real PHP HTTP returns expected no-secret status');
    ok(response.cache==='no-store' && response.nosniff==='nosniff',
      reason+' non-cacheable response');
    return s;
  }finally{await stop(s);}
}
async function main(){
  verify();
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-instance-binding-'));
  const base=fs.realpathSync(tmp);
  try{
    const instances=[];
    for(const name of ['alpha','beta']){
      const cms=path.join(base,'cms-'+name);
      fs.cpSync(STAGE,cms,{recursive:true,force:false,errorOnExist:true});
      const site=path.join(base,'site-'+name);
      write(path.join(site,'public/index.html'),'<title>Independent site '+name+'</title>');
      const db=path.join(base,'private',name+'.sqlite');
      const binding=path.join(base,'private',name+'.binding.json');
      const capsFile=path.join(base,'private',name+'.caps.json');
      write(capsFile,JSON.stringify(caps));
      const env=envFor(name,db,binding);
      const opts={site,family:'html',caps:capsFile,binding};
      const before=inspect(cms,env);
      ok(before.status===4,'no binding or schema yields fail-closed CLI');
      ok(!fs.existsSync(binding),'verification must not create binding');
      const missing=cli(cms,opts,env);
      expectRefused(missing,'operator refuses binding before DB installation');
      ok(!fs.existsSync(binding),'failed early operation did not create binding');
      const install=runPhp(path.join(cms,'bin/install.php'),['--apply'],env);
      ok(install.status===0,'dedicated empty CMS SQLite schema initialized');
      expectGate(cms,env,false,'no binding after schema install');
      const created=cli(cms,opts,env);
      ok(created.status===0 && created.stderr==='' &&
        JSON.parse(created.stdout).bound &&
        JSON.parse(created.stdout).signatureVerified===false,
        'explicit operator writes unsigned CI-only sealed identity');
      ok(fs.statSync(binding).mode & 0o077 ? false:true,
        'private binding is mode 0600');
      expectGate(cms,env,true,'site CMS DB package identity '+name);
      expectRefused(cli(cms,opts,env),'binding cannot be overwritten even by same identity');
      instances.push({cms,site,db,binding,capsFile,env,opts});
    }
    const [a,b]=instances;
    await http(a.cms,a.env,true,'instance A');
    await http(b.cms,b.env,true,'instance B');
    const aGood=await start(a.cms,a.env);
    try{
      ok((await req(aGood,'/api/publish','POST')).status===404,
        'publish still forbidden in bound CMS');
      ok((await req(aGood,'/bin/bind-empty-instance.php')).status===404,
        'operator CLI not exposed in public document root');
      ok((await req(aGood,'/private/alpha.binding.json')).status===404,
        'instance binding cannot leak from HTTP');
    }finally{await stop(aGood);}

    // Identity and site crossing: DB / CMS / binding combinations must not mix.
    expectGate(a.cms,{...a.env,CMS_SITE_ID:b.env.CMS_SITE_ID},false,'foreign site ID');
    expectGate(a.cms,{...a.env,CMS_DB_DSN:b.env.CMS_DB_DSN},false,'foreign DB path');
    expectGate(a.cms,{...a.env,CMS_STAGE2_BINDING_FILE:b.binding},false,'foreign binding');
    expectGate(b.cms,{...b.env,CMS_STAGE2_BINDING_FILE:a.binding},false,'cross CMS package');
    await http(a.cms,{...a.env,CMS_STAGE2_BINDING_FILE:b.binding},false,
      'cross-instance binding rejection');
    expectGate(a.cms,{...a.env,CMS_ENV:'production'},false,'production environment refused');
    expectGate(a.cms,{...a.env,CMS_STAGE2_RUNTIME_GATE:'wrong'},false,'invalid gate refused');
    expectGate(a.cms,{...a.env,CMS_ALLOW_SQLITE_TEST_ONLY:'0'},false,'SQLite test flag refused');
    const badRoot={...a.opts,site:b.site};
    expectRefused(cli(a.cms,badRoot,a.env),'cannot overwrite existing bound site');
    const configOld=fs.readFileSync(a.binding);
    fs.chmodSync(a.binding,0o644);
    expectGate(a.cms,a.env,false,'world-readable binding refused');
    fs.chmodSync(a.binding,0o600);
    expectGate(a.cms,a.env,true,'binding permissions restored');

    const altered=JSON.parse(configOld);
    altered.siteRoot=b.site;
    fs.writeFileSync(a.binding,JSON.stringify(altered),{mode:0o600});
    expectGate(a.cms,a.env,false,'bound website root substitution rejected');
    fs.writeFileSync(a.binding,configOld);
    altered.siteRoot=a.site;
    altered.manifestSha256='0'.repeat(64);
    fs.writeFileSync(a.binding,JSON.stringify(altered),{mode:0o600});
    expectGate(a.cms,a.env,false,'wrong package manifest digest rejected');
    fs.writeFileSync(a.binding,configOld);
    expectGate(a.cms,a.env,true,'restored immutable operator content accepted');

    const link=path.join(base,'private','alias.binding.json');
    fs.symlinkSync(a.binding,link);
    expectGate(a.cms,{...a.env,CMS_STAGE2_BINDING_FILE:link},false,
      'symlink binding refused');
    fs.unlinkSync(link);
    const hard=path.join(base,'private','hard.binding.json');
    fs.linkSync(a.binding,hard);
    expectGate(a.cms,a.env,false,'hardlink binding refused');
    fs.unlinkSync(hard);
    expectGate(a.cms,a.env,true,'original binding after link removal');

    const realManifest=path.join(a.cms,'private/package-manifest.json');
    const oldManifest=fs.readFileSync(realManifest);
    fs.appendFileSync(realManifest,'\n');
    expectGate(a.cms,a.env,false,'package manifest modified after binding');
    await http(a.cms,a.env,false,'tampered manifest blocked on web');
    fs.writeFileSync(realManifest,oldManifest);
    expectGate(a.cms,a.env,true,'manifest restored');
    await http(a.cms,a.env,true,'recovered package');

    const oldCaps=JSON.parse(fs.readFileSync(b.capsFile,'utf8'));
    fs.writeFileSync(b.capsFile,JSON.stringify({...oldCaps,https:false}));
    const newPath=path.join(base,'private','refused.binding.json');
    expectRefused(cli(b.cms,{...b.opts,binding:newPath},b.env),
      'declared non-HTTPS hosting fails closed before binding creation');
    ok(!fs.existsSync(newPath),'no file written after compatibility refusal');
    fs.writeFileSync(b.capsFile,JSON.stringify(caps));
    const badAlias=path.join(base,'private','symlinked.binding.json');
    fs.symlinkSync(b.binding,badAlias);
    expectRefused(cli(b.cms,{...b.opts,binding:badAlias},b.env),
      'binding issuer refuses existing symlink output');
    fs.unlinkSync(badAlias);
    ok(!fs.existsSync(newPath),'failed runs made no unintended files');
    expectGate(b.cms,b.env,true,'second instance still ready');
    console.log('Stage2 two isolated bound CMS installations, guarded operator CLI, private identity, artifact fingerprint, real PHP HTTP and corruption/cross-site adversaries PASS: '+
      checks+' assertions; unsigned CI-only, not host or production.');
  }finally{
    fs.rmSync(base,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error('CI-only instance-binding FAILED:',e.message);process.exitCode=1;});
