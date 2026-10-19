'use strict';
// Stage2 deployment blueprint integration: independent virtual-host declarations,
// actual offline PHP CLI ABI, website-vs-CMS public boundaries, site-byte-bound
// operator approval and local HTTP visitor-site independence. NO remote hosts.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const grant={CMS_STAGE2_RUNTIME_GATE:'ci-bound',CMS_ENV:'test',CMS_ALLOW_SQLITE_TEST_ONLY:'1'};
const flags={php81:true,pdo:true,https:true,privateStorage:true,isolatedRoots:true,
  rewriteRoutes:true,sitePhp:false,nodeRuntime:false,reverseProxy:false};
const deliveries={html:'static-files',php:'independent-php','react-spa':'static-spa-assets',
  'next-static':'exported-static-files','next-ssr':'independent-node-behind-proxy'};
const write=(f,content)=>{fs.mkdirSync(path.dirname(f),{recursive:true,mode:0o700});
  fs.writeFileSync(f,content,{mode:0o600});};
const invoke=(cmd,args,env={})=>spawnSync('php',[cmd,...args],{encoding:'utf8',
  timeout:90000,env:{...process.env,...grant,...env}});
const err=(response,code,label)=>ok(response.status===3&&response.stdout===''&&
  response.stderr.trim()===code,label);
function siteFixture(base,n,family){
 const siteId='bp-site-'+n,cmsRoot=path.join(base,'cms-'+n),siteRoot=path.join(base,'site-'+n);
 fs.cpSync(STAGE,cmsRoot,{recursive:true,force:false,errorOnExist:true});
 if(family==='php')write(siteRoot+'/public/index.php','<?php echo "VISITOR-PHP-SITE";');
 else if(family==='next-ssr'){
  write(siteRoot+'/public/favicon.ico','ssr');
  write(siteRoot+'/.next/BUILD_ID','DECLARED-BUILD-ONLY');
  write(siteRoot+'/package.json','{"name":"ssr-fixture"}');
 } else {
  write(siteRoot+'/public/index.html','VISITOR-'+family+'-STATIC');
  if(family==='next-static')write(siteRoot+'/public/_next/static/app.js','// exported fixture');
 }
 return {siteId,cmsRoot,siteRoot,family,capabilities:{
    ...flags,sitePhp:family==='php',nodeRuntime:family==='next-ssr',
    reverseProxy:family==='next-ssr'},
  dbFile:base+'/private/'+n+'.sqlite',
  bindingFile:base+'/private/'+n+'.binding.json'};
}
const endpoint=(item,n)=>({
  siteId:item.siteId,cmsOrigin:'https://cms-'+n+'.lab.test',
  siteOrigin:'https://website-'+n+'.lab.test',
  cmsDocroot:item.cmsRoot+'/public',siteDocroot:item.siteRoot+'/public',
  cmsMount:'/',siteMount:'/',phpTarget:'8.1',phpSapi:'fpm-fcgi',
  siteRuntime:deliveries[item.family]
});
async function port(){const s=net.createServer();
  await new Promise((r,j)=>s.once('error',j).listen(0,'127.0.0.1',r));
  const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function server(publicPath,env={},router=null){
 const p=await port(),url='http://127.0.0.1:'+p;
 const args=['-S','127.0.0.1:'+p,'-t',publicPath];
 if(router)args.push(router);
 const child=spawn('php',args,{stdio:'ignore',env:{...process.env,...env}});
 for(let i=0;i<70;i++){
  if(child.exitCode!==null)throw Error('local PHP server unexpectedly exited');
  try{const resp=await fetch(url+'/',{signal:AbortSignal.timeout(400)});await resp.text();return {child,url};}
  catch{await new Promise(r=>setTimeout(r,60));}
 }
 child.kill();throw Error('loopback PHP server not available');
}
async function close(x){
 if(x.child.exitCode!==null || x.child.signalCode!==null)return;
 const stopped=new Promise(done=>x.child.once('exit',done));
 x.child.kill('SIGTERM');
 await stopped;
}
async function main(){
 verify();
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'ai-cms-deploy-blueprint-'));
 try{
  const families=['html','php','react-spa','next-static','next-ssr'];
  const items=families.map((family,i)=>siteFixture(base,i+1,family));
  const fleetFile=base+'/private/fleet.json', blueprintFile=base+'/private/blueprint.json';
  const fleet={format:'ai-site-cms-stage2-install-fleet-v1',instances:items};
  const document={format:'ai-site-cms-stage2-offline-deployment-blueprint-v1',
    fleetConfig:fleetFile,endpoints:items.map((x,i)=>endpoint(x,i+1))};
  write(fleetFile,JSON.stringify(fleet));write(blueprintFile,JSON.stringify(document));
  const check=(f=blueprintFile,override={})=>invoke(STAGE+'/bin/lab-deployment-blueprint.php',
    ['--check','--config='+f],override);
  const exitReview=(config=blueprintFile,overrides={})=>invoke(
    STAGE+'/bin/lab-stage2-exit-review.php',
    ['--check','--config='+config],overrides);
  const reviewReport=(expectedStatus)=>{
    const r=exitReview();
    ok(r.status===expectedStatus&&r.stderr==='',
      'exit review refuses to count unready fleet as architecture-review ready');
    return JSON.parse(r.stdout);
  };
  const fleetCmd=(mode,approval='none')=>invoke(STAGE+'/bin/lab-fleet-operator.php',
    [mode,'--config='+fleetFile,'--approval='+approval]);
  const read=()=>{
    const r=check();
    ok(r.status===0&&r.stderr==='','read-only blueprint CLI returns success');
    return JSON.parse(r.stdout);
  };
  const initial=read();
  const initialReview=reviewReport(4);
  ok(initialReview.instances.length===5
    &&initialReview.fleetState==='not_yet_ready'
    &&initialReview.stage2Accepted===false
    &&initialReview.readyForOwnerArchitectureReview===false
    &&initialReview.productRequirementsAccepted===0
    &&initialReview.remainingAcceptanceGates.length===4
    &&initialReview.instances.every(x=>x.dependencyLockEvidenceCrossChecked
      &&x.thirdPartyNoticeDigestChecked&&!x.independentLegalApproval),
    'architecture report distinguishes lab installation from Stage2 acceptance');
  ok(!JSON.stringify(initialReview).includes(base)
    && initialReview.instances.every(item=>/^[a-f0-9]{64}$/.test(item.cmsPackageSha256)),
    'operator report is digest-bound and does not print private filesystem paths');
  // An unsigned package hash can be recomputed by the same party that
  // modified its lock data. Internal cross-file evidence MUST still refuse
  // when the newly hashed package is self-inconsistent.
  const tamperedRoot=items[0].cmsRoot;
  const manifestFile=tamperedRoot+'/private/package-manifest.json';
  const lockFile=tamperedRoot+'/private/compliance/npm-package-lock.json';
  const noticeFile=tamperedRoot+'/private/compliance/THIRD_PARTY_NOTICES.txt';
  const savedManifest=fs.readFileSync(manifestFile);
  const savedLock=fs.readFileSync(lockFile);
  const savedNotice=fs.readFileSync(noticeFile);
  const unsignedRehash=(relative,newBytes)=>{
    const content=Buffer.isBuffer(newBytes)?newBytes:Buffer.from(newBytes);
    const target=tamperedRoot+'/'+relative;
    fs.writeFileSync(target,content);
    const manifest=JSON.parse(savedManifest);
    const rec=manifest.files.find(x=>x.path===relative);
    assert.ok(rec,'modified compliance file must be inventoried');
    rec.sha256=crypto.createHash('sha256').update(content).digest('hex');
    rec.bytes=content.length;
    fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
    const pf=invoke(tamperedRoot+'/bin/package-preflight.php',
      ['--check','--package-root='+tamperedRoot]);
    ok(pf.status===0,'unsigned manifest alone still admits resealed compliant-format bytes');
    err(exitReview(),'STAGE2_EXIT_REVIEW_REFUSED',
      'independent exit review catches resealed but contradictory compliance evidence');
    fs.writeFileSync(target,relative.includes('npm-package-lock')?savedLock:savedNotice);
    fs.writeFileSync(manifestFile,savedManifest);
  };
  const editedLock=JSON.parse(savedLock.toString());
  assert.equal(editedLock.packages['node_modules/jedison'].license,'MIT');
  editedLock.packages['node_modules/jedison'].license='BSD-3-Clause';
  unsignedRehash('private/compliance/npm-package-lock.json',JSON.stringify(editedLock));
  unsignedRehash('private/compliance/THIRD_PARTY_NOTICES.txt',
    Buffer.concat([savedNotice,Buffer.from('\nrepacked without changing the notice index\n')]));
  ok(reviewReport(4).packageSetSha256===initialReview.packageSetSha256,
    'restoring all pinned evidence returns same review package digest');
  const profiles=new Map(initialReview.instances.map(x=>[x.family,x.requiredWebServerProfiles]));
  ok(profiles.get('php').nginx.visitor.independentPhpWorkerRequired
    &&profiles.get('next-ssr').apache.visitor.nodeServerAndReverseProxyRequired
    &&!profiles.get('next-static').nginx.visitor.nodeServerAndReverseProxyRequired
    &&profiles.get('react-spa').nginx.visitor.historyFallbackRequired,
    'five family runtime prerequisites are generated for both webservers');
  ok(initialReview.criteria.empty_cms_starts_on_target_host.status==='not_tested_permission_required'
    &&initialReview.actualTargetHostTested===false
    &&initialReview.criteria.owner_accepts_final_architecture.ownerApproved===undefined,
    'report cannot turn offline CI into target hosting verification or owner approval');
  err(exitReview(blueprintFile,{CMS_ENV:'production'}),'STAGE2_EXIT_REVIEW_REFUSED',
    'exit review refuses production environment');

  ok(initial.sites===5&&initial.fleetState==='not_yet_ready'
    && initial.localCliCompatible&&initial.placeholderOriginsOnly
    && initial.productionReady===false
    && !initial.actualVirtualHostsProven&&!initial.httpsProven,
    'five-family blueprint is lab-only: no real virtual hosts or TLS claim');
  ok(initial.items.every(x=>x.cmsDocumentRootIsPublic&&x.siteDocumentRootIsPublic
    && x.separateOrigins&&!x.cmsWriteRoutesAvailable
    && !x.targetSapiExecuted&&!x.targetTlsOrDnsVerified),
    'site-vs-CMS mount and privacy invariants for every family');
  ok(initial.items.find(x=>x.family==='next-ssr').requiresNodeProxy,
    'SSR remains a declared Node+proxy requirement, not a tested server');
  ok(initial.items.filter(x=>x.requiresNodeProxy).length===1,
    'static React/Next export never falsely require Node server');
  for(const x of items)ok(!fs.existsSync(x.dbFile)&&!fs.existsSync(x.bindingFile),
    'blueprint did not open/create private DB or binding');
  ok(read().deploymentIntentSha256===initial.deploymentIntentSha256,
    'deterministic blueprint intent, stable across read-only runs');
  err(check(blueprintFile,{CMS_ENV:'production'}),'DEPLOYMENT_BLUEPRINT_REFUSED',
    'production mode cannot inspect lab-only blueprint');
  err(check(blueprintFile,{CMS_STAGE2_RUNTIME_GATE:''}),'DEPLOYMENT_BLUEPRINT_REFUSED',
    'explicit lab grant cannot be bypassed');
  const invalid=(mutation,label)=>{
    const clone=JSON.parse(JSON.stringify(document));mutation(clone);
    const f=base+'/private/negative-'+label+'.json';
    write(f,JSON.stringify(clone));
    err(check(f),'DEPLOYMENT_BLUEPRINT_REFUSED','forbid blueprint '+label);
    for(const x of items)ok(!fs.existsSync(x.dbFile),
      'bad blueprint leaves every DB absent '+label);
  };
  invalid(d=>d.endpoints[0].siteOrigin=d.endpoints[0].cmsOrigin,'same-origin');
  invalid(d=>d.endpoints[1].cmsOrigin=d.endpoints[0].cmsOrigin,'reused-vhost');
  invalid(d=>d.endpoints[0].siteOrigin='https://example.com','real-domain');
  invalid(d=>d.endpoints[0].siteOrigin='http://website-1.lab.test','insecure');
  invalid(d=>d.endpoints[0].siteOrigin='https://website-1.lab.test:8443','port');
  invalid(d=>d.endpoints[0].siteOrigin='https://website-1.lab.test/private','webroot-path');
  invalid(d=>d.endpoints[0].cmsDocroot=d.endpoints[0].cmsDocroot+'/../src','code-root');
  invalid(d=>d.endpoints[0].siteDocroot=items[1].siteRoot+'/public','foreign-site-root');
  invalid(d=>d.endpoints[1].siteRuntime='static-files','wrong-delivery');
  invalid(d=>d.endpoints[0].phpSapi='cli-server','not-host-SAPI');
  invalid(d=>d.endpoints[0].phpSapi='apache2handler','untested-mod-php-not-fpm');
  invalid(d=>d.endpoints[0].phpTarget='8.5','unsupported-target');
  invalid(d=>d.endpoints[0].cmsMount='/cms','unsupported-mounted-path');
  invalid(d=>d.endpoints=d.endpoints.slice(0,4),'missing-vhost');
  invalid(d=>d.endpoints[0].siteId=d.endpoints[1].siteId,'duplicate-identity');
  invalid(d=>d.endpoints[0].unknown=true,'injected-settings');
  const alias=base+'/private/alias.json';fs.symlinkSync(blueprintFile,alias);
  err(check(alias),'DEPLOYMENT_BLUEPRINT_REFUSED','config symlink refused');
  // Byte-level proof: same-size HTML changes invalidate fleet approval
  // and blueprint intent while leaving public file counts unchanged.
  const fleetFirst=fleetCmd('--plan');
  ok(fleetFirst.status===0,'fleet pre-install plan approved before site edit');
  const approved=JSON.parse(fleetFirst.stdout).token;
  const file=items[0].siteRoot+'/public/index.html',before=fs.readFileSync(file);
  const changed=Buffer.from(before);changed[changed.length-1]^=1;fs.writeFileSync(file,changed);
  ok(read().deploymentIntentSha256!==initial.deploymentIntentSha256,
    'site content edit changes blueprint intent, even if file length identical');
  err(fleetCmd('--apply',approved),'FLEET_OPERATOR_REFUSED',
    'site content bytes invalidate previously approved empty-install plan');
  ok(!fs.existsSync(items[0].dbFile),'stale plan did not create any DB');
  fs.writeFileSync(file,before);
  ok(read().deploymentIntentSha256===initial.deploymentIntentSha256,
    'reverting public bytes restores reproducible intent');
  // Real install of five code families, then new boundary report must flip
  // to ready without making any public admin route available.
  const replanned=fleetCmd('--plan');
  ok(replanned.status===0,'fleet re-plan after site edit');
  const applied=fleetCmd('--apply',JSON.parse(replanned.stdout).token);
  ok(applied.status===0&&JSON.parse(applied.stdout).state==='ready',
    'five independent installations complete after reapproval');
  const ready=read();
  const approvedReview=reviewReport(0);
  ok(approvedReview.readyForOwnerArchitectureReview
    &&approvedReview.instances.every(x=>x.fleetState==='ready')
    &&approvedReview.stage2Accepted===false
    &&approvedReview.stage3Authorized===false,
    'complete local bootstrap can request architectural review, not acceptance');
  ok(approvedReview.packageSetSha256===initialReview.packageSetSha256
    &&approvedReview.deploymentIntentSha256!==initialReview.deploymentIntentSha256,
    'package identity remains stable; approved deployment intent changes on install');
  const damagedHt=items[1].cmsRoot+'/public/.htaccess';
  const originalHt=fs.readFileSync(damagedHt);
  fs.appendFileSync(damagedHt,'\n# altered test host policy\n');
  err(exitReview(),'STAGE2_EXIT_REVIEW_REFUSED',
    'exit-review rejects altered packaged Apache policy even after READY');
  fs.writeFileSync(damagedHt,originalHt);
  ok(reviewReport(0).packageSetSha256===approvedReview.packageSetSha256,
    'restoring approved Apache policy restores exact evidence fingerprint');
  const aliasReview=base+'/private/exit-alias.json';
  fs.symlinkSync(blueprintFile,aliasReview);
  err(exitReview(aliasReview),'STAGE2_EXIT_REVIEW_REFUSED',
    'exit review refuses symlinked operator declaration');

  ok(ready.fleetState==='ready'&&ready.deploymentIntentSha256!==initial.deploymentIntentSha256,
    'ABI/origin plan reflects actual ready fleet, not uninitialized state');
  for(const x of items)ok(fs.existsSync(x.dbFile)&&fs.existsSync(x.bindingFile),
    'all five installations have private state');
  // A CMS process may be stopped while public static/PHP sites remain online.
  // Loopback HTTP does not verify actual virtual hosts, real TLS or Node SSR.
  for(const x of items.slice(0,4)){
    const visitor=await server(x.siteRoot+'/public');
    const cms=await server(x.cmsRoot+'/public',{
      ...grant,CMS_DB_DSN:'sqlite:'+x.dbFile,
      CMS_SITE_ID:x.siteId,CMS_STAGE2_BINDING_FILE:x.bindingFile
    },x.cmsRoot+'/public/index.php');
    try{
      const cmsHealth=await fetch(cms.url+'/api/health',{headers:{host:'cms-fixture.lab.test'}});
      ok(cmsHealth.status===200&&await cmsHealth.text()==='{"status":"ok"}',
        'real separate CMS process health after verified private binding');
      ok((await fetch(cms.url+'/api/publish',{method:'POST'})).status===404,
        'CMS write API not exposed');
      ok((await fetch(cms.url+'/bin/lab-deployment-blueprint.php')).status===404,
        'operator blueprint CLI not public HTTP');
      await close(cms);
      const res=await fetch(visitor.url+'/');
      const body=await res.text();
      ok(res.status===200&&body.includes(x.family==='php'?'VISITOR-PHP-SITE':'VISITOR-'+x.family+'-STATIC'),
        'visitor site independent of stopped CMS');
      ok((await fetch(visitor.url+'/vendor/autoload.php')).status===404,
        'site visitor root never serves private CMS vendor');
    }finally{
      if(cms.child.exitCode===null && cms.child.signalCode===null)await close(cms);
      await close(visitor);
    }
  }
  // Modification of site content after READY changes install intent but
  // intentionally does not force a new CMS binding; content publication
  // enforcement is a separate Stage3+ contract, NOT claimed here.
  const status=read();
  ok(status.items.every(x=>!x.targetFrameworkExecuted&&!x.targetTlsOrDnsVerified),
    'no false claim that PHP-FPM, DNS, TLS or Next SSR was executed');
  console.log('Stage2 deployment blueprint + byte-bound operator plan + PHP ABI + real independent site/CMS HTTP PASS: '+
    checks+' checks; LAB-ONLY, no live DNS/TLS/FPM/SSR.');
 }finally{fs.rmSync(base,{recursive:true,force:true});}
}
main().catch(e=>{console.error('Stage2 deployment blueprint integration FAILED',e.stack||e.message);process.exitCode=1;});
