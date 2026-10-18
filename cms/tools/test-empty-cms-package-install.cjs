'use strict';
// Stage2 reproducible EMPTY CMS install rehearsal on disposable local code/data.
// Never contact a remote host and never treat the resulting package as signed/production.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const {spawn, spawnSync} = require('node:child_process');
const {STAGE, verify} = require('./build-internal-package.cjs');

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}
function php(file, args=[], env={}) {
  return spawnSync('php',[file,...args], {
    encoding:'utf8',timeout:30000,maxBuffer:1024*1024,
    env:{...process.env,...env}
  });
}
function success(result,what) {
  check(result.status===0 && result.stderr==='', what+': '+(result.stderr||'unexpected exit'));
  return JSON.parse(result.stdout);
}
async function port() {
  const s=net.createServer();
  await new Promise((resolve,reject)=>s.once('error',reject).listen(0,'127.0.0.1',resolve));
  const number=s.address().port;
  await new Promise(resolve=>s.close(resolve));
  return number;
}
async function server(root,router) {
  const p=await port();
  const args=['-S','127.0.0.1:'+p,'-t',root];
  if(router)args.push(router);
  const child=spawn('php',args,{stdio:'ignore'});
  const url='http://127.0.0.1:'+p;
  for(let i=0;i<90;i++){
    if(child.exitCode!==null)throw Error('Local PHP test server exited early');
    try { await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)});return {child,url}; }
    catch { await new Promise(resolve=>setTimeout(resolve,60)); }
  }
  child.kill();
  throw Error('Local PHP server did not start');
}
async function get(url,options={}) {
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(2500)});
  return {status:response.status,body:await response.text(),headers:response.headers};
}
async function stop(handle) {
  if(!handle)return;
  if(handle.child.exitCode===null)handle.child.kill('SIGTERM');
  await new Promise(resolve=>{
    if(handle.child.exitCode!==null)return resolve();
    handle.child.once('exit',resolve);
  });
}
function write(file,data) {
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  fs.writeFileSync(file,data,{mode:0o600});
}
function inspect(cms) {
  return php(path.join(cms,'bin/package-preflight.php'),
    ['--check','--package-root='+cms]);
}
function install(cms,db,siteId,mode='apply') {
  return php(path.join(cms,'bin/install.php'),['--'+mode],{
    CMS_DB_DSN:'sqlite:'+db,CMS_SITE_ID:siteId,CMS_ENV:'test',
    CMS_ALLOW_SQLITE_TEST_ONLY:'1'
  });
}
function schema(cms,db,siteId) {
  return php(path.join(cms,'bin/schema-preflight.php'),['--inspect'],{
    CMS_DB_DSN:'sqlite:'+db,CMS_SITE_ID:siteId,CMS_ENV:'test',
    CMS_ALLOW_SQLITE_TEST_ONLY:'1'
  });
}
function topology(cms,site,caps) {
  return php(path.join(cms,'bin/site-runtime-topology.php'),[
    '--check','--cms-root='+cms,'--site-root='+site,
    '--family=html','--capabilities-file='+caps
  ]);
}
async function main(){
  verify(); // builder inventory pass is a prerequisite, not authenticity evidence
  const capabilities={
    php81:true,pdo:true,https:true,privateStorage:true,
    isolatedRoots:true,rewriteRoutes:true,sitePhp:false,
    nodeRuntime:false,reverseProxy:false
  };
  // Native PDO SQLite is enabled in CI. Do not use a real MySQL DSN.
  check(php('-r',['exit(in_array("sqlite", PDO::getAvailableDrivers(), true)?0:1);']).status===0,
    'disposable PDO SQLite test driver available');
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-empty-install-'));
  let cmsHttp=null,siteHttp=null;
  try{
    for(const name of ['one','two']) {
      const cms=path.join(base,'cms-'+name);
      fs.cpSync(STAGE,cms,{recursive:true,force:false,errorOnExist:true});
      const website=path.join(base,'site-'+name);
      write(path.join(website,'public/index.html'),
        '<!doctype html><title>Independent static fixture '+name+'</title>');
      write(path.join(website,'private/site-secret.txt'),'NEVER_PUBLIC_SITE_SECRET');
      const data=path.join(base,'private','db-'+name+'.sqlite');
      const caps=path.join(base,'private','caps-'+name+'.json');
      write(caps,JSON.stringify(capabilities));
      const manifest=success(inspect(cms),'shipped standalone PHP inventory validates '+name);
      check(manifest.filesVerified>400 && !manifest.signatureVerified
        && !manifest.productionReady && manifest.readOnly,
        'explicitly unsigned package validated without production claim '+name);
      check(!fs.existsSync(data),'no database created by read-only package preflight '+name);
      const topo=success(topology(cms,website,caps),'shipped PHP topology CLI runs '+name);
      check(topo.declarationCompatible && !topo.actualHostTested && !topo.productionReady
        && topo.cmsPublicFiles===1 && topo.sitePublicFiles===1,
        'independent CMS and site roots, self-declared host capabilities '+name);
      check(success(schema(cms,data,'sandbox-'+name),'pre-install schema inspection '+name).state==='uninitialized',
        'empty schema safely detected '+name);
      // SQLite connection may create a zero-byte file during read-only inspection,
      // so only the subsequent explicit installer is allowed to create CMS tables.
      check(install(cms,data,'sandbox-'+name).status===0,'explicit shipped CLI initializes empty CMS '+name);
      const ready=success(schema(cms,data,'sandbox-'+name),'schema inspected after install '+name);
      check(ready.state==='ready','separately journaled empty CMS schema ready '+name);
      check(install(cms,data,'sandbox-'+name).status===0,'same site repeat bootstrap idempotent '+name);
      check(install(cms,data,'sandbox-other').status!==0,'cross-site schema identity refused '+name);
      check(schema(cms,data,'sandbox-other').status!==0,'wrong site schema preflight refused '+name);
      const forbidden=php(path.join(cms,'bin/install.php'),['--apply'],{
        CMS_DB_DSN:'sqlite:'+data,CMS_SITE_ID:'sandbox-'+name,
        CMS_ENV:'production',CMS_ALLOW_SQLITE_TEST_ONLY:'0'
      });
      check(forbidden.status!==0,'test-only SQLite cannot be enabled as production '+name);
      check(!fs.existsSync(path.join(cms,'public','editor.js'))
        && fs.existsSync(path.join(cms,'private/editor/editor.js')),
        'compiled editor is not publicly exposed '+name);
    }

    const cms=path.join(base,'cms-one'), site=path.join(base,'site-one');
    const otherCms=path.join(base,'cms-two'), otherSite=path.join(base,'site-two');
    // Running actual PHP servers at independent loopback ports, not a fake Slim mock.
    cmsHttp=await server(path.join(cms,'public'),path.join(cms,'public/index.php'));
    siteHttp=await server(path.join(site,'public'));
    let response=await get(cmsHttp.url+'/api/health');
    check(response.status===200 && response.body==='{"status":"ok"}',
      'isolated packaged PHP Slim kernel serves real health HTTP');
    check(response.headers.get('cache-control')==='no-store'
      && response.headers.get('x-content-type-options')==='nosniff',
      'shipped HTTP response protects minimal health payload');
    for(const [method,url] of [
      ['POST','/api/publish'],['GET','/admin'],['PUT','/api/draft'],
      ['GET','/vendor/autoload.php'],['GET','/private/editor/editor.js'],
      ['GET','/bin/install.php'],['GET','/private/package-manifest.json']
    ]){
      response=await get(cmsHttp.url+url,{method});
      check(response.status===404,'actual HTTP refuses private/write route '+method+' '+url);
    }
    response=await get(siteHttp.url+'/');
    check(response.status===200 && response.body.includes('Independent static fixture one'),
      'unrelated static website serves its own public document root');
    response=await get(siteHttp.url+'/api/health');
    check(response.status===404,'site is not silently routed through CMS health endpoint');

    // Independent site remains online if entire CMS process is taken offline.
    await stop(cmsHttp);
    cmsHttp=null;
    response=await get(siteHttp.url+'/');
    check(response.status===200 && response.body.includes('Independent static fixture one'),
      'website remains readable while CMS HTTP process is completely stopped');
    check(success(inspect(otherCms),'other CMS integrity after first CMS offline').filesVerified>400,
      'second independent installation remains intact');

    // Corruption, extraneous public content and symlink attacks must fail-closed
    // with no secrets or absolute paths echoed from PHP standalone preflight.
    const victim=path.join(otherCms,'private/editor/meta.json');
    const original=fs.readFileSync(victim);
    fs.appendFileSync(victim,'CORRUPTED');
    let failed=inspect(otherCms);
    check(failed.status===3 && failed.stdout==='' && failed.stderr.trim()==='PACKAGE_PREFLIGHT_REFUSED',
      'package preflight catches digest tamper without sensitive error output');
    fs.writeFileSync(victim,original);
    check(inspect(otherCms).status===0,'restored bytes verify again');
    const injected=path.join(otherCms,'public','extra.js');
    write(injected,'console.log("unexpected");');
    check(inspect(otherCms).status===3,'unlisted public file rejected');
    fs.unlinkSync(injected);
    const link=path.join(otherCms,'public','shortcut');
    fs.symlinkSync(victim,link);
    check(inspect(otherCms).status===3,'symlink to private editor metadata rejected');
    fs.unlinkSync(link);
    const manifestFile=path.join(otherCms,'private/package-manifest.json');
    const manifestOriginal=fs.readFileSync(manifestFile);
    const forged=JSON.parse(manifestOriginal.toString());
    forged.files.push({...forged.files[0]});
    fs.writeFileSync(manifestFile,JSON.stringify(forged));
    check(inspect(otherCms).status===3,'duplicate manifest record rejected');
    fs.writeFileSync(manifestFile,manifestOriginal);
    check(inspect(otherCms).status===0,'integrity verified after all reversible hostile fixtures');

    const sharedCaps=path.join(base,'private','caps-one.json');
    const wrongSite=topology(cms,otherSite,sharedCaps);
    check(wrongSite.status===0,'read-only cross-pair topology is not identity/auth proof');
    const untrustedCaps=path.join(base,'private','caps-false.json');
    write(untrustedCaps,JSON.stringify({...capabilities,https:false}));
    const insufficient=topology(cms,site,untrustedCaps);
    check(insufficient.status===4
      && JSON.parse(insufficient.stdout).missingDeclaredCapabilities.includes('https'),
      'missing HTTPS assertion fails self-declared hosting compatibility');
    check(!insufficient.stdout.includes(base),'operator local paths never appear in topology output');

    console.log('Stage2 reproducible isolated EMPTY CMS package, CLI, two databases, real PHP HTTP and adversarial boundary PASS: '+
      checks+' checks. Loopback/disposable only; unsigned, NOT production/host validation.');
  } finally {
    await stop(cmsHttp);
    await stop(siteHttp);
    fs.rmSync(base,{recursive:true,force:true});
  }
}
main().catch(err=>{ console.error('Empty CMS lab install FAILED:',err.message);process.exitCode=1;});
