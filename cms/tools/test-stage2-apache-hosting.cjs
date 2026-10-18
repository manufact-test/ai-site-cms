'use strict';
/**
 * Stage2 real Apache 2.4 + PHP 8.3-FPM integration for the DISTRIBUTED
 * public/.htaccess rules, not a production installer or client-host proof.
 * Two distinct packaged CMS installations, separately served HTML and PHP
 * visitor sites, test-only private SQLite + bindings, per-pool environment,
 * public boundary, misconfigured AllowOverride and process outage/recovery.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const net=require('node:net'),http=require('node:http');
const {spawn,spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');

let checks=0;
function ok(condition,label){assert.ok(condition,label);checks++;}
function put(file,bytes){
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 fs.writeFileSync(file,bytes,{mode:0o600});
}
const grant={CMS_ENV:'test',CMS_STAGE2_RUNTIME_GATE:'ci-bound',CMS_ALLOW_SQLITE_TEST_ONLY:'1'};
const baseCaps={php81:true,pdo:true,https:true,privateStorage:true,isolatedRoots:true,
 rewriteRoutes:true,sitePhp:false,nodeRuntime:false,reverseProxy:false};
function run(bin,args=[],more={}) {
 return spawnSync(bin,args,{encoding:'utf8',timeout:60000,
  env:{...process.env,...grant,...more}});
}
function fixture(home,id,family){
 const cms=home+'/cms-'+id,site=home+'/site-'+id;
 fs.cpSync(STAGE,cms,{recursive:true,force:false,errorOnExist:true});
 if(family==='php')put(site+'/public/index.php','<?php header("Content-Type: text/plain"); echo "VISITOR-PHP-'+id+'";');
 else put(site+'/public/index.html','VISITOR-HTML-'+id);
 return {siteId:'apache-'+id,cmsRoot:cms,siteRoot:site,family,
  capabilities:{...baseCaps,sitePhp:family==='php'},
  dbFile:home+'/private/'+id+'.sqlite',
  bindingFile:home+'/private/'+id+'.binding.json'};
}
const caps=x=>({...grant,CMS_SITE_ID:x.siteId,
 CMS_DB_DSN:'sqlite:'+x.dbFile,CMS_STAGE2_BINDING_FILE:x.bindingFile});
async function freePort(){
 const s=net.createServer();
 await new Promise((yes,no)=>s.once('error',no).listen(0,'127.0.0.1',yes));
 const n=s.address().port;
 await new Promise(yes=>s.close(yes));return n;
}
async function request(port,hostname,uri='/',method='GET'){
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,method,path:uri,
    headers:{Host:hostname},timeout:2500},res=>{
   const pieces=[];
   res.on('data',data=>pieces.push(data));
   res.once('end',()=>resolve({
    status:res.statusCode,body:Buffer.concat(pieces).toString(),
    headers:res.headers
   }));
   res.once('error',reject);
  });
  req.once('timeout',()=>req.destroy(Error('Apache HTTP timeout')));
  req.once('error',reject);req.end();
 });
}
async function poll(port,host,uri,want){
 let seen='connection refused';
 for(let i=0;i<80;i++){
  try{
   const r=await request(port,host,uri);
   if(r.status===want)return r;
   seen=r.status+' '+r.body.slice(0,100);
  }catch(e){seen=e.message;}
  await new Promise(r=>setTimeout(r,80));
 }
 throw Error('Apache expected '+want+' '+host+uri+', saw '+seen);
}
async function stop(child){
 if(!child||child.exitCode!==null||child.signalCode!==null)return;
 const done=new Promise(yes=>child.once('exit',yes));
 child.kill('SIGTERM');await done;
}
function fpmConfig(home,name,listen,x=null){
 const conf=home+'/config/fpm-'+name+'.conf';
 const envLines=x?Object.entries({...caps(x),CMS_STAGE2_REQUIRE_FPM_MAPPING:'1'})
  .map(([k,v])=>'env['+k+'] = '+v):[];
 put(conf,[
 '[global]','daemonize = no','pid = '+home+'/fpm-'+name+'.pid',
 'error_log = '+home+'/fpm-'+name+'.log',
 '[pool_'+name+']','listen = 127.0.0.1:'+listen,
 'pm = static','pm.max_children = 1','clear_env = yes',
 'security.limit_extensions = .php',
 'php_admin_flag[display_errors] = off',
 'php_admin_flag[log_errors] = off',
 ...envLines,''
 ].join('\n'));return conf;
}
function vhost(port,host,root,mode,upstream=0){
 const lines=[
 '<VirtualHost 127.0.0.1:'+port+'>',
 'ServerName '+host,'DocumentRoot "'+root+'"',
 '<Directory "'+root+'">',
 'Require all granted',
 'Options -Indexes -MultiViews -FollowSymLinks -SymLinksIfOwnerMatch',
 'AllowOverride '+(mode==='cms'?'All':'None'),
 '</Directory>',
 // In addition to the distributed .htaccess, a secure server also denies
 // dotfiles independently if the host disables overrides accidentally.
 '<FilesMatch "^\\.">','Require all denied','</FilesMatch>'
 ];
 if(mode==='php') lines.push('DirectoryIndex index.php');
 if(mode==='cms'||mode==='php'){
  lines.push('<Files "index.php">',
   'SetHandler "proxy:fcgi://127.0.0.1:'+upstream+'"',
   '</Files>');
 }
 lines.push('</VirtualHost>');
 return lines.join('\n');
}
function apacheConfig(home,port,sites,fpmPort,sitePhpPort){
 const mod='/usr/lib/apache2/modules/';
 const modules=['mpm_event','authz_core','dir','mime','proxy','proxy_fcgi'];
 const global=[
 'ServerRoot "/etc/apache2"','ServerName localhost',
 'Listen 127.0.0.1:'+port,
 'PidFile "'+home+'/apache.pid"',
 'ErrorLog "'+home+'/apache-error.log"',
 'LogLevel warn',
 ...modules.map(name=>'LoadModule '+name+'_module '+mod+'mod_'+name+'.so'),
 'TypesConfig /etc/mime.types',
 '<Directory />','Require all denied','</Directory>',
 vhost(port,'other.lab.test',sites[0].siteRoot+'/public','static')
 ];
 for(let i=0;i<sites.length;i++){
  const x=sites[i];
  global.push(vhost(port,'cms-'+x.siteId+'.lab.test',
   x.cmsRoot+'/public','cms',fpmPort[i]));
  global.push(vhost(port,'site-'+x.siteId+'.lab.test',
   x.siteRoot+'/public',x.family==='php'?'php':'static',sitePhpPort));
 }
 // Deliberate host misconfiguration. The .htaccess is present but ignored:
 // the health route must fail to route (no silent claim of compatibility).
 const bad=sites[0];
 global.push(vhost(port,'overrides-off.lab.test',bad.cmsRoot+'/public','static'));
 const output=home+'/config/apache.conf';put(output,global.join('\n')+'\n');return output;
}
async function main(){
 verify();
 ok(run('apache2',['-v']).status===0,'actual Apache 2.4 installed');
 ok(run('php-fpm8.3',['-v']).status===0,'actual PHP-FPM available');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'cms-apache-fpm-'));
 fs.mkdirSync(home+'/private',{recursive:true,mode:0o700});
 fs.mkdirSync(home+'/config',{recursive:true,mode:0o700});
 const children=[];
 try{
  const sites=[fixture(home,'alpha','html'),fixture(home,'beta','php')];
  for(const x of sites){
   ok(fs.existsSync(x.cmsRoot+'/public/.htaccess'),
    'Apache rules actually shipped inside package '+x.siteId);
   const preflight=run('php',[x.cmsRoot+'/bin/shared-host-preflight.php',
     '--check','--document-root='+x.cmsRoot+'/public']);
   ok(preflight.status===0&&JSON.parse(preflight.stdout).result==='offline_structure_pass',
    'packaged offline public/private boundary passes '+x.siteId);
   const unsafe=run('php',[x.cmsRoot+'/bin/shared-host-preflight.php',
     '--check','--document-root='+x.cmsRoot]);
   ok(unsafe.status===3&&JSON.parse(unsafe.stdout).result==='blocked',
    'whole application root rejected as Apache document root');
  }
  const fleetFile=home+'/private/fleet.json';
  put(fleetFile,JSON.stringify({
   format:'ai-site-cms-stage2-install-fleet-v1',
   instances:sites
  }));
  const fleet=(action,approval='none')=>run('php',[
   STAGE+'/bin/lab-fleet-operator.php',action,
   '--config='+fleetFile,'--approval='+approval
  ]);
  const plan=fleet('--plan');
  ok(plan.status===0,'read-only fleet plan works with shipped Apache rules');
  const token=JSON.parse(plan.stdout).token;
  for(const x of sites)ok(!fs.existsSync(x.dbFile),'PLAN creates no private DB');
  const done=fleet('--apply',token);
  ok(done.status===0&&JSON.parse(done.stdout).changed===2,
   'two unrelated real packaged empty CMS installations approved');
  ok(JSON.parse(fleet('--plan').stdout).allReady,
   'both bindings and package inventories verified ready');
  const port=await freePort();
  const upstreams=[await freePort(),await freePort()];
  const phpSitePort=await freePort();
  for(let i=0;i<sites.length;i++){
   const conf=fpmConfig(home,'cms'+i,upstreams[i],sites[i]);
   children.push(spawn('php-fpm8.3',['-F','-y',conf],{stdio:'ignore'}));
  }
  children.push(spawn('php-fpm8.3',['-F','-y',
   fpmConfig(home,'sitephp',phpSitePort)],{stdio:'ignore'}));
  const conf=apacheConfig(home,port,sites,upstreams,phpSitePort);
  const parsed=run('apache2',['-t','-f',conf]);
  ok(parsed.status===0,'actual Apache vhost/.htaccess capable configuration syntax accepted');
  const apache=spawn('apache2',['-f',conf,'-DFOREGROUND'],{stdio:'ignore'});
  children.push(apache);
  const cmsHost=x=>'cms-'+x.siteId+'.lab.test';
  const siteHost=x=>'site-'+x.siteId+'.lab.test';
  for(const x of sites)await poll(port,cmsHost(x),'/api/health',200);
  for(const x of sites){
   const h=cmsHost(x),vh=siteHost(x);
   const health=await request(port,h,'/api/health');
   ok(health.status===200&&health.body==='{"status":"ok"}',
    'real Apache FallbackResource to separately bound Slim/PHP-FPM '+x.siteId);
   ok(health.headers['cache-control']==='no-store'&&
     health.headers['x-content-type-options']==='nosniff',
    'headers preserved across Apache and FastCGI');
   for(const p of [
    '/.htaccess','/.env','/vendor/autoload.php',
    '/private/package-manifest.json','/src/HttpKernel.php',
    '/bin/lab-empty-installer.php'
   ]){
    const r=await request(port,h,p);
    ok(r.status===403||r.status===404,
     'Apache must block private or dotfiles '+x.siteId+' '+p);
    ok(!r.body.includes('ai-site-cms-internal-stage2-v2'),
     'private manifest not exposed '+x.siteId+' '+p);
   }
   const writeAttempt=await request(port,h,'/api/publish','POST');
   ok(writeAttempt.status===404,'Apache cannot surface absent publishing API');
   const victim=await request(port,h,'/api/health','GET');
   ok(victim.status===200,'health stays available to declared CMS hostname');
   const visitor=await request(port,vh,'/');
   ok(visitor.status===200&&visitor.body.includes(
     x.family==='php'?'VISITOR-PHP-beta':'VISITOR-HTML-alpha'),
    'independent visitor site stays separate from CMS '+x.family);
   ok((await request(port,vh,'/api/health')).status===404,
    'site vhost never maps to CMS API');
  }
  ok((await request(port,'overrides-off.lab.test','/api/health')).status===404,
   'misconfigured Apache AllowOverride None does not silently pass runtime health');
  ok((await request(port,'unknown.lab.test','/api/health')).status===404,
   'unknown Host never selects a working CMS');
  // Security probe cannot follow a symlink into private package, even when
  // created after installation and owned by the same CI user.
  for(const x of sites){
   const symlink=x.cmsRoot+'/public/probe.json';
   fs.symlinkSync(x.cmsRoot+'/private/package-manifest.json',symlink);
   try{
    const resp=await request(port,cmsHost(x),'/probe.json');
    ok(resp.status!==200&&!resp.body.includes('ai-site-cms-internal-stage2-v2'),
     'Apache Options -FollowSymLinks forbids public-to-private symlink');
    ok(fleet('--plan').status===3,'new symlink invalidates installation inventory');
   }finally{fs.unlinkSync(symlink);}
   ok(fleet('--plan').status===0,'operator plan recovers after unsafe link removed');
  }
  // A changed Apache rule is part of the signed-off *unsigned* package
  // fingerprint, so the operator refuses to approve a modified payload.
  const ht=sites[0].cmsRoot+'/public/.htaccess';
  const originalHt=fs.readFileSync(ht);
  fs.appendFileSync(ht,'\n# unexpected external edit\n');
  ok(fleet('--plan').status===3,
   'tampered Apache rules invalidate package-plan integrity');
  fs.writeFileSync(ht,originalHt);
  ok(fleet('--plan').status===0,'restored rules recover unchanged install approval');
  // Failure of a single CMS database doesn't take down neighbor CMS/site.
  const x=sites[0],before=fs.readFileSync(x.dbFile);
  const corrupt=run('php8.3',['-r',
   '$db=new PDO("sqlite:".$argv[1]);'+
   '$db->exec("UPDATE cms_schema_migrations SET checksum=\'bad-apache-fixture\' WHERE version=1");',
   x.dbFile]);
  ok(corrupt.status===0,'corruption fixture applied to one private DB');
  const failed=await request(port,cmsHost(x),'/api/health');
  ok(failed.status===503&&failed.body==='{"error":"service_unavailable"}',
   'actual Apache/FPM startup binding fails closed on damaged schema');
  ok((await request(port,cmsHost(sites[1]),'/api/health')).status===200,
   'separate CMS remains healthy after neighbor corruption');
  ok((await request(port,siteHost(x),'/')).status===200,
   'static visitor stays online while corresponding CMS returns 503');
  fs.writeFileSync(x.dbFile,before,{mode:0o600});
  ok((await request(port,cmsHost(x),'/api/health')).status===200,
   'explicit disposable known-good DB replacement recovers readiness');
  // Kill first FPM master. Apache should report unavailable FastCGI, not
  // route to another CMS. PHP visitor has its own independent pool.
  await stop(children[0]);
  const failedUpstream=await poll(port,cmsHost(x),'/api/health',503);
  ok(failedUpstream.status===503,'Apache reports unavailable stopped CMS FPM');
  ok((await request(port,cmsHost(sites[1]),'/api/health')).status===200,
   'other CMS independent of stopped PHP worker');
  ok((await request(port,siteHost(sites[1]),'/')).body==='VISITOR-PHP-beta',
   'separate visitor PHP pool survives CMS FPM outage');
  ok((await request(port,siteHost(x),'/')).status===200,
   'HTML visitor site survives own CMS FPM outage');
  children.push(spawn('php-fpm8.3',['-F','-y',
   fpmConfig(home,'cms0',upstreams[0],x)],{stdio:'ignore'}));
  await poll(port,cmsHost(x),'/api/health',200);
  ok(JSON.parse(fleet('--plan').stdout).allReady,
   'FPM restart requires no duplicate installation or binding changes');
  console.log('Stage2 REAL APACHE 2.4 + distributed .htaccess + two isolated FPM CMS + separate PHP/HTML visitor hosts PASS: '+
   checks+' checks; CI-only, no TLS, production host or user data.');
 }finally{
  for(const child of [...children].reverse())await stop(child);
  fs.rmSync(home,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error('Stage2 Apache real-host boundary FAILED',e.stack||e.message);process.exitCode=1;});
