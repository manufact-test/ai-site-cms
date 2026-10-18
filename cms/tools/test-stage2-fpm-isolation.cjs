'use strict';

/**
 * Stage2 independent, ephemeral real NGINX -> PHP-FPM 8.3 execution.
 *
 * Unlike the php -S tests, two separate FPM masters execute the actual
 * packaged vendor-complete Slim application behind separate Nginx public
 * document roots. Each shares ZERO CMS secrets, DB, config or PHP processes.
 * Two separately hosted static visitor sites remain alive when the CMS is
 * stopped. This is NOT Hostinger, Apache, shared PHP-FPM or production.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');

let checks=0;
function check(predicate,why){assert.ok(predicate,why); checks++;}
function write(file,contents){
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 fs.writeFileSync(file,contents,{mode:0o600});
}
function run(command,args=[],env={}){
 const result=spawnSync(command,args,{encoding:'utf8',timeout:90000,
   env:{...process.env,...env}});
 return result;
}
const gate={CMS_ENV:'test',CMS_STAGE2_RUNTIME_GATE:'ci-bound',
  CMS_ALLOW_SQLITE_TEST_ONLY:'1'};
const flags={php81:true,pdo:true,https:true,privateStorage:true,
 isolatedRoots:true,rewriteRoutes:true,sitePhp:false,
 nodeRuntime:false,reverseProxy:false};
function environment(x){return {...gate,CMS_DB_DSN:'sqlite:'+x.db,
 CMS_SITE_ID:x.id,CMS_STAGE2_BINDING_FILE:x.binding};}
function fixture(dir,name,family){
 const cms=path.join(dir,'cms-'+name);
 const site=path.join(dir,'site-'+name);
 const priv=path.join(dir,'state');
 fs.cpSync(STAGE,cms,{recursive:true,force:false,errorOnExist:true});
 if(family==='html')write(path.join(site,'public/index.html'),'VISITOR-HTML-INDEPENDENT');
 else write(path.join(site,'public/index.html'),'VISITOR-REACT-INDEPENDENT');
 const id='fpm-'+name;
 return {id,name,site,cms,db:path.join(priv,name+'.sqlite'),
  binding:path.join(priv,name+'.binding.json'),
  family,capabilities:{...flags},
  descriptor:{siteId:id,cmsRoot:cms,siteRoot:site,
    family,capabilities:{...flags},dbFile:path.join(priv,name+'.sqlite'),
    bindingFile:path.join(priv,name+'.binding.json')}};
}
function fleet(dir,sites){
 const conf=path.join(dir,'state/fleet.json');
 write(conf,JSON.stringify({
  format:'ai-site-cms-stage2-install-fleet-v1',
  instances:sites.map(x=>x.descriptor)
 }));
 function operator(mode,approval='none'){
  return run('php',[path.join(STAGE,'bin/lab-fleet-operator.php'),
    mode,'--config='+conf,'--approval='+approval],gate);
 }
 const p=operator('--plan');
 check(p.status===0&&p.stderr==='', 'read-only whole-group install plan');
 const planning=JSON.parse(p.stdout);
 check(planning.instances.length===2 && planning.instances.every(x=>x.state==='install_required'),
  'two independent CMS code/site/database roots plan as empty');
 for(const x of sites)check(!fs.existsSync(x.db)&&!fs.existsSync(x.binding),
  'read-only plan does not open SQLite or private binding');
 const a=operator('--apply',planning.token);
 check(a.status===0&&a.stderr==='', 'single explicit group installation approved');
 check(JSON.parse(a.stdout).changed===2,'both isolated empty CMS installations created');
 const p2=operator('--plan');
 check(p2.status===0&&JSON.parse(p2.stdout).allReady,'both site installations ready');
 return {operator,conf};
}
function fpmConfiguration(dir,x,port){
 const target=path.join(dir,'config','fpm-'+x.name+'.conf');
 write(target,[
 '[global]','pid = '+path.join(dir,'fpm-'+x.name+'.pid'),
 'error_log = '+path.join(dir,'fpm-'+x.name+'.log'),
 'daemonize = no','[lab_'+x.name+']',
 'listen = 127.0.0.1:'+port,
 'listen.backlog = 16',
 'pm = static','pm.max_children = 1',
 'clear_env = yes',
 'catch_workers_output = no',
 'php_admin_flag[display_errors] = off',
 'php_admin_flag[log_errors] = off',
 'security.limit_extensions = .php',
 ''
 ].join('\n'));
 return target;
}
function ngConfig(dir,sites,ports){
 const conf=path.join(dir,'config/nginx.conf');
 const servers=[];
 for(let i=0;i<sites.length;i++){
  const x=sites[i],p=ports[i];
  // PHP front controller never becomes a static file. Direct .php paths are
  // blocked; only the internally redirected /index.php is handed to FastCGI.
  servers.push([
   'server {','listen 127.0.0.1:'+p.cms+';',
   'server_name cms-'+x.name+'.lab.test;',
   'root '+x.cms+'/public;',
   'autoindex off;','disable_symlinks on;',
   'location / { try_files $uri /index.php$is_args$args; }',
   'location ~ \\.php(?:/|$) { return 404; }',
   'location = /index.php {',
   'internal;',
   'include /etc/nginx/fastcgi_params;',
   'fastcgi_param SCRIPT_FILENAME '+x.cms+'/public/index.php;',
   'fastcgi_param SCRIPT_NAME /index.php;',
   'fastcgi_param CMS_ENV test;',
   'fastcgi_param CMS_STAGE2_RUNTIME_GATE ci-bound;',
   'fastcgi_param CMS_ALLOW_SQLITE_TEST_ONLY 1;',
   'fastcgi_param CMS_SITE_ID '+x.id+';',
   'fastcgi_param CMS_DB_DSN sqlite:'+x.db+';',
   'fastcgi_param CMS_STAGE2_BINDING_FILE '+x.binding+';',
   'fastcgi_pass 127.0.0.1:'+p.fpm+';',
   'fastcgi_read_timeout 4s;',
   '}','}'
  ].join('\n'));
  servers.push([
   'server {','listen 127.0.0.1:'+p.visitor+';',
   'server_name site-'+x.name+'.lab.test;',
   'root '+x.site+'/public;',
   'autoindex off;','disable_symlinks on;',
   'location ~ \\.(?:php|phtml|phar|env|sqlite|db|sql)$ { return 404; }',
   'location / { try_files $uri $uri/ /index.html; }','}'
  ].join('\n'));
 }
 write(conf,[
  'worker_processes 1;',
  'pid '+path.join(dir,'nginx.pid')+';',
  'error_log '+path.join(dir,'nginx-error.log')+' warn;',
  'events { worker_connections 256; }','http {',
  'access_log off;','include /etc/nginx/mime.types;',
  'default_type application/octet-stream;',
  'sendfile off;',
  ...servers,'}'
 ].join('\n'));
 return conf;
}
async function port(){
 const sock=net.createServer();
 await new Promise((resolve,reject)=>
  sock.once('error',reject).listen(0,'127.0.0.1',resolve));
 const n=sock.address().port;
 await new Promise(done=>sock.close(done));return n;
}
async function awaitStatus(url,expected,ms=13000){
 const started=Date.now();
 while(Date.now()-started<ms){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(700)});
   if(response.status===expected)return response;
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,80));
 }
 throw Error('Expected HTTP '+expected+' not observed for '+url);
}
async function request(url,opts={}){
 const response=await fetch(url,{...opts,signal:AbortSignal.timeout(3000)});
 return {status:response.status,body:await response.text(),
  headers:response.headers};
}
async function stop(proc){
 if(!proc || proc.exitCode!==null || proc.signalCode!==null)return;
 const exit=new Promise(resolve=>proc.once('exit',resolve));
 proc.kill('SIGTERM');
 await exit;
}
async function main(){
 verify();
 check(run('nginx',['-v']).status===0,'real nginx executable installed');
 const fpmVersion=run('php-fpm8.3',['-v']);
 check(fpmVersion.status===0,'real PHP8.3-FPM executable installed');
 const pdo=run('php8.3',['-r',
  'exit(in_array("sqlite", PDO::getAvailableDrivers(), true)?0:3);']);
 check(pdo.status===0,'PHP8.3 SQLite PDO extension available');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'cms-real-fpm-vhosts-'));
 fs.mkdirSync(path.join(home,'state'),{recursive:true,mode:0o700});
 fs.mkdirSync(path.join(home,'config'),{recursive:true,mode:0o700});
 const children=[];
 try{
  const sites=[fixture(home,'alpha','html'),fixture(home,'beta','react-spa')];
  fleet(home,sites);
  const ports=[];
  for(let i=0;i<2;i++)ports.push({
   fpm:await port(),cms:await port(),visitor:await port()
  });
  for(let i=0;i<2;i++){
   const config=fpmConfiguration(home,sites[i],ports[i].fpm);
   const child=spawn('php-fpm8.3',['-F','-y',config],{
     stdio:'ignore',env:{...process.env}});
   children.push(child);
  }
  const nginxConf=ngConfig(home,sites,ports);
  const preflight=run('nginx',['-t','-c',nginxConf,'-p',home+'/']);
  check(preflight.status===0,'actual nginx syntax and upstream configuration accepted');
  const proxy=spawn('nginx',['-c',nginxConf,'-p',home+'/','-g','daemon off;'],
    {stdio:'ignore',env:{...process.env}});
  children.push(proxy);
  const cmsUrls=ports.map(p=>'http://127.0.0.1:'+p.cms);
  const visitorUrls=ports.map(p=>'http://127.0.0.1:'+p.visitor);
  for(const url of cmsUrls)await awaitStatus(url+'/api/health',200);
  for(let i=0;i<sites.length;i++){
   const x=sites[i],url=cmsUrls[i],vis=visitorUrls[i];
   const health=await request(url+'/api/health');
   check(health.status===200&&health.body==='{"status":"ok"}',
    'real FPM upstream executes isolated CMS Slim health '+x.name);
   check(health.headers.get('cache-control')==='no-store'
     &&health.headers.get('x-content-type-options')==='nosniff',
     'FPM response retains safe no-cache and nosniff headers');
   for(const privatePath of [
     '/index.php','/vendor/autoload.php','/src/HttpKernel.php',
     '/private/package-manifest.json','/bin/lab-fleet-operator.php',
     '/private/editor/editor.js'
   ]){
    const p=await request(url+privatePath);
    check(p.status===404 && !p.body.includes('COMPOSER'),
      'nginx public-only boundary forbids '+privatePath);
   }
   check((await request(url+'/api/publish',{method:'POST'})).status===404,
    'no write/publish endpoint under real FPM routing');
   check((await request(url+'/api/health',{headers:{CMS_SITE_ID:sites[1-i].id,
     CMS_STAGE2_RUNTIME_GATE:'ci-only'}})).status===200,
     'client-supplied headers cannot override configured site identity or gate');
   // A compromised public upload/symlink must not bypass the document-root
   // boundary even if PHP's application is healthy.
   const cmsLeak=x.cms+'/public/hostile.json';
   fs.symlinkSync(x.cms+'/private/package-manifest.json',cmsLeak);
   try{
    const probe=await request(url+'/hostile.json');
    check(probe.status!==200&&!probe.body.includes('ai-site-cms-internal-stage2-v2'),
      'actual Nginx refuses symlink from CMS webroot into private package');
   }finally{fs.unlinkSync(cmsLeak);}
   const visitorLeak=x.site+'/public/hostile.json';
   fs.symlinkSync(x.cms+'/private/package-manifest.json',visitorLeak);
   try{
    const probe=await request(vis+'/hostile.json');
    check(probe.status!==200&&!probe.body.includes('ai-site-cms-internal-stage2-v2'),
      'actual Nginx refuses visitor-site symlink to CMS private files');
   }finally{fs.unlinkSync(visitorLeak);}
   const staticPage=await request(vis+'/');
   check(staticPage.status===200
     &&staticPage.body.includes(i===0?'VISITOR-HTML':'VISITOR-REACT'),
     'independent visitor site served by real Nginx');
   check((await request(vis+'/vendor/autoload.php')).status===404,
     'visitor webroot cannot expose the separate CMS private vendor');
  }
  // Deliberate corruption: first CMS fails closed with real FastCGI and FPM.
  // Other PHP process and both visitor sites remain usable.
  const first=sites[0],db=fs.readFileSync(first.db);
  const inj=run('php8.3',['-r',
    '$db=new PDO("sqlite:".$argv[1]);'+
    '$db->exec("UPDATE cms_schema_migrations SET checksum = \'corrupt\' WHERE version = 1");',
    first.db]);
  check(inj.status===0,'deliberate disposable migration checksum corruption');
  const after=await request(cmsUrls[0]+'/api/health');
  check(after.status===503&&after.body==='{"error":"service_unavailable"}',
    'corrupted private CMS database refused by actual PHP-FPM');
  check((await request(cmsUrls[1]+'/api/health')).status===200,
    'second independent PHP-FPM remains healthy after first DB corruption');
  for(const vis of visitorUrls){
   check((await request(vis+'/')).status===200,'visitors survive corrupted CMS DB');
  }
  // Offline fixture reset to known-good bytes is NOT a product restore API.
  fs.writeFileSync(first.db,db,{mode:0o600});
  check((await request(cmsUrls[0]+'/api/health')).status===200,
    'known-good disposable fixture bytes recover after explicit reset');
  // Crash only one FPM master; no automatic repair or cross-site outage.
  await stop(children[0]);
  await awaitStatus(cmsUrls[0]+'/api/health',502);
  check((await request(cmsUrls[0]+'/api/health')).status===502,
    'actual nginx upstream reports failed isolated CMS');
  check((await request(cmsUrls[1]+'/api/health')).status===200,
    'second CMS has independent live PHP-FPM master');
  check((await request(visitorUrls[0]+'/')).status===200,
    'visitor site survives its own CMS runtime outage');
  check((await request(visitorUrls[1]+'/')).status===200,
    'unrelated visitor remains online');
  // Start the stopped FPM with same private binding and DB; no reinstall.
  const recovered=spawn('php-fpm8.3',['-F','-y',fpmConfiguration(home,first,ports[0].fpm)],
    {stdio:'ignore',env:{...process.env}});
  children.push(recovered);
  await awaitStatus(cmsUrls[0]+'/api/health',200);
  check((await request(cmsUrls[0]+'/api/health')).status===200,
    'real FPM restart reuses approved private binding without reinstall');
  check(!fs.existsSync(path.join(first.site,'vendor')),
    'visitor code root has no CMS application dependencies');
  console.log('Stage2 real Nginx + two PHP-FPM masters + isolated CMS/visitor vhosts, fail-closed SQLite and outage recovery PASS: '+checks+' checks; disposable CI only, NOT real Hostinger/Apache/TLS.');
 } finally {
  for(const child of [...children].reverse())await stop(child);
  fs.rmSync(home,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error('Stage2 real FastCGI topology FAILED:',e.stack||e.message);process.exitCode=1;});
