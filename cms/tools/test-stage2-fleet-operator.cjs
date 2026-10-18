'use strict';
// Whole CI-only packaged fleet path: immutable declaration -> read-only
// global PLAN -> explicit APPLY -> partial DB recovery -> independent HTTP.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const {spawnSync,spawn}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
let n=0;const ok=(v,m)=>{assert.ok(v,m);n++;};
const put=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true,mode:0o700});fs.writeFileSync(p,s,{mode:0o600});};
const run=(f,cmd,token='none')=>spawnSync('php',[path.join(STAGE,'bin/lab-fleet-operator.php'),cmd,'--config='+f,'--approval='+token],{encoding:'utf8',timeout:90000});
const deny=(r,m)=>ok(r.status===3 && r.stdout==='' && r.stderr.trim()==='FLEET_OPERATOR_REFUSED',m);
const flags={php81:true,pdo:true,https:true,privateStorage:true,isolatedRoots:true,rewriteRoutes:true,sitePhp:false,nodeRuntime:false,reverseProxy:false};
const fmt='ai-site-cms-stage2-install-fleet-v1';
const env=(x)=>({...process.env,CMS_ENV:'test',CMS_STAGE2_RUNTIME_GATE:'ci-bound',CMS_ALLOW_SQLITE_TEST_ONLY:'1',CMS_SITE_ID:x.siteId,CMS_DB_DSN:'sqlite:'+x.dbFile,CMS_STAGE2_BINDING_FILE:x.bindingFile});
function fixture(dir,name,family){
 const cms=path.join(dir,'cms-'+name),site=path.join(dir,'site-'+name),priv=path.join(dir,'private');
 fs.cpSync(STAGE,cms,{recursive:true,force:false,errorOnExist:true});
 if(family==='php')put(path.join(site,'public/index.php'),'<?php echo "SITE-INDEPENDENT";');
 else if(family==='next-ssr'){
   put(path.join(site,'public/icon.ico'),'x');put(path.join(site,'.next/BUILD_ID'),'declaration-only');
   put(path.join(site,'package.json'),'{}');
 }else{
   put(path.join(site,'public/index.html'),'INDEPENDENT-'+name);
   if(family==='next-static')put(path.join(site,'public/_next/static/test.js'),'// test');
 }
 return {siteId:'fleet-'+name,cmsRoot:cms,siteRoot:site,family,
   capabilities:{...flags,sitePhp:family==='php',nodeRuntime:family==='next-ssr',reverseProxy:family==='next-ssr'},
   dbFile:path.join(priv,name+'.sqlite'),bindingFile:path.join(priv,name+'.binding.json')};
}
async function main(){
 verify(); const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-cms-fleet-e2e-'));
 try {
  const xs=['html','php','react-spa','next-static','next-ssr'].map((f,i)=>fixture(dir,'site'+i,f));
  const config=path.join(dir,'private/fleet.json'),doc={format:fmt,instances:[...xs].reverse()};
  put(config,JSON.stringify(doc));
  const plan=()=>{let r=run(config,'--plan');ok(r.status===0&&r.stderr==='', 'fleet PLAN successful');return JSON.parse(r.stdout);};
  const original=plan();ok(original.readOnly===true&&!original.allReady&&original.instances.length===5&&!original.atomicAcrossSites,'complete read-only multi-site plan');
  ok(original.instances.every(x=>x.state==='install_required'),'all five site families need install');
  for(const x of xs)ok(!fs.existsSync(x.dbFile)&&!fs.existsSync(x.bindingFile),'plan does not write DB or binding');
  ok(plan().token===original.token,'stable deterministic token with reordered IDs');
  deny(run(config,'--apply','a'.repeat(64)),'fabricated approval refused');
  for(const x of xs)ok(!fs.existsSync(x.dbFile),'bad approval made no changes');
  const bad=(update,label)=>{
    const clone=JSON.parse(JSON.stringify(doc));update(clone);
    const f=path.join(dir,'private/bad-'+label+'.json');put(f,JSON.stringify(clone));
    deny(run(f,'--plan'),'global read-only refusal '+label);
    deny(run(f,'--apply',original.token),'global apply refusal '+label);
  };
  bad(c=>c.instances[1].siteId=c.instances[0].siteId,'duplicate-id');
  bad(c=>c.instances[1].dbFile=c.instances[0].dbFile,'shared-db');
  bad(c=>c.instances[1].bindingFile=c.instances[0].bindingFile,'shared-binding');
  bad(c=>c.instances[1].cmsRoot=c.instances[0].cmsRoot,'shared-cms-root');
  bad(c=>c.instances[1].siteRoot=c.instances[0].siteRoot,'shared-site-root');
  bad(c=>c.instances[1].dbFile=c.instances[0].cmsRoot+'/public/unsafe.sqlite','foreign-public-db');
  bad(c=>c.instances[1].capabilities.https=false,'no-https');
  bad(c=>c.instances[1].capabilities.nodeRuntime='true','unknown-ABI');
  bad(c=>c.instances[1].extra='x','unknown-config-field');
  bad(c=>c.instances=[],'empty-fleet');
  bad(c=>c.format='future-invalid','version-skew');
  const symlink=path.join(dir,'private/link.json');fs.symlinkSync(config,symlink);
  deny(run(symlink,'--plan'),'config symlink refused');
  const hashes=xs.map(x=>fs.readFileSync(x.cmsRoot+'/private/package-manifest.json','utf8'));
  ok(hashes.every(x=>x===hashes[0]),'five relocated copies preserve root-independent complete package manifest');
  // Interrupted process boundary: DB initialized but binding was not created.
  const partial=xs[0],create=spawnSync('php',[partial.cmsRoot+'/bin/install.php','--apply'],{encoding:'utf8',env:env(partial)});
  ok(create.status===0&&fs.existsSync(partial.dbFile)&&!fs.existsSync(partial.bindingFile),'simulated interrupted DB->binding stage');
  deny(run(config,'--apply',original.token),'pre-interruption fleet approval revoked');
  const recovery=plan();ok(recovery.token!==original.token&&recovery.instances.find(x=>x.siteId===partial.siteId).state==='binding_required','fresh operator recovery plan distinguishes partial site');
  const result=run(config,'--apply',recovery.token);
  ok(result.status===0&&result.stderr==='', 'all five real isolated CMS installs succeed together');
  const applied=JSON.parse(result.stdout);ok(applied.state==='ready'&&applied.instances===5&&applied.changed===5&&!applied.atomicAcrossSites,'apply reports completed non-atomic group');
  for(const x of xs){
    ok(fs.existsSync(x.dbFile)&&fs.existsSync(x.bindingFile),'private database and binding present');
    ok((fs.statSync(x.dbFile).mode&0o077)===0&&(fs.statSync(x.bindingFile).mode&0o077)===0,'private mode correct');
  }
  const ready=plan();ok(ready.allReady&&ready.instances.every(x=>x.state==='ready'),'all installations verified ready');
  deny(run(config,'--apply',recovery.token),'previous grant cannot be replayed after ready');
  const repeat=run(config,'--apply',ready.token);
  ok(repeat.status===0&&JSON.parse(repeat.stdout).changed===0,'ready fleet approval is safe no-op');
  // Two real HTTP servers with independent gates; no administrative routes.
  async function port(){
    const srv=net.createServer();
    await new Promise((yes,no)=>srv.once('error',no).listen(0,'127.0.0.1',yes));
    const found=srv.address().port;
    await new Promise(done=>srv.close(done));
    return found;
  }
  async function httpSite(x){
    const number=await port();
    const host='http://127.0.0.1:'+number;
    const child=spawn('php',['-S','127.0.0.1:'+number,
      '-t',x.cmsRoot+'/public',x.cmsRoot+'/public/index.php'],{stdio:'ignore',env:env(x)});
    try {
      for(let i=0;i<75;i++){
        if(child.exitCode!==null)throw Error('unexpected PHP process exit');
        try {
          const response=await fetch(host+'/api/health',{signal:AbortSignal.timeout(400)});
          if(response.status===200)return {child,host};
        }catch {}
        await new Promise(done=>setTimeout(done,60));
      }
      throw Error('PHP health timed out');
    }catch(err){child.kill();throw err;}
  }
  const live=[await httpSite(xs[0]),await httpSite(xs[2])];
  try{
    for(const h of live){
      const health=await fetch(h.host+'/api/health');
      ok(health.status===200 && await health.text()==='{"status":"ok"}','gated local HTTP 200 per site');
      for(const route of ['/vendor/autoload.php','/bin/lab-fleet-operator.php','/private/package-manifest.json']){
        ok((await fetch(h.host+route)).status===404,'private artifact HTTP 404 '+route);
      }
      ok((await fetch(h.host+'/api/publish',{method:'POST'})).status===404,'no write API');
    }
    const damaged=xs[0].cmsRoot+'/private/package-manifest.json',saved=fs.readFileSync(damaged);
    fs.appendFileSync(damaged,' ');
    ok((await fetch(live[0].host+'/api/health')).status===503,'drifted first CMS fails closed');
    ok((await fetch(live[1].host+'/api/health')).status===200,'other site remains available');
    fs.writeFileSync(damaged,saved);
    ok((await fetch(live[0].host+'/api/health')).status===200,'restored fixture permits startup');
  }finally{
    for(const h of live){
      h.child.kill('SIGTERM');
      await new Promise(done=>h.child.exitCode!==null?done():h.child.once('exit',done));
    }
  }
  // Binding must follow installed code/site root; no stealth move/rebind.
  const moved=xs[1],old=moved.cmsRoot;fs.renameSync(old,old+'-moved');
  deny(run(config,'--plan'),'moved bound runtime requires explicit future migration');
  fs.renameSync(old+'-moved',old);ok(plan().allReady,'old binding after reverted move remains valid');
  // Refuse drift in one inventory while preserving all other independent DBs.
  const manifest=partial.cmsRoot+'/private/package-manifest.json',backup=fs.readFileSync(manifest);
  fs.appendFileSync(manifest,' ');deny(run(config,'--plan'),'any tampered fleet code fails closed');
  fs.writeFileSync(manifest,backup);ok(plan().allReady,'after fixture reset fleet returns ready');
  console.log('Stage2 packaged five-family declarative fleet PLAN/APPLY/recovery/portability/cross-site isolation PASS: '+n+' checks. CI-only, no Next SSR execution or production acceptance.');
 }finally {fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error('Fleet operator integration FAILED:',e.stack||e.message);process.exitCode=1;});
