'use strict';

/**
 * Stage 2 offline five-family hosting MATRIX, never a deployment template.
 * Actual Nginx HTTP host dispatch + isolated PHP-FPM masters for EVERY bound
 * CMS, independent PHP visitor worker, real static HTML/React/Next-export
 * assets, and separate Node reverse-proxy fixture for SSR topology.
 * Deliberately NOT a Next.js framework build, real TLS/DNS or target hosting.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const net=require('node:net');
const rawHttp=require('node:http');
const {spawn,spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');

const grant={CMS_ENV:'test',CMS_STAGE2_RUNTIME_GATE:'ci-bound',CMS_ALLOW_SQLITE_TEST_ONLY:'1'};
const defaultCaps={php81:true,pdo:true,https:true,privateStorage:true,
 isolatedRoots:true,rewriteRoutes:true,sitePhp:false,nodeRuntime:false,
 reverseProxy:false};
const deliveries={
 html:'static-files',php:'independent-php',
 'react-spa':'static-spa-assets','next-static':'exported-static-files',
 'next-ssr':'independent-node-behind-proxy'
};
let count=0;
const ok=(condition,message)=>{assert.ok(condition,message);count++;};
function write(file,content){
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 fs.writeFileSync(file,content,{mode:0o600});
}
function execute(binary,args=[],env={}){
 return spawnSync(binary,args,{encoding:'utf8',timeout:90000,
  env:{...process.env,...grant,...env}});
}
const env=x=>({...grant,CMS_SITE_ID:x.siteId,CMS_DB_DSN:'sqlite:'+x.dbFile,
 CMS_STAGE2_BINDING_FILE:x.bindingFile});
const key=x=>x.siteId.replaceAll('-','');
const cmsHost=x=>'cms-'+key(x)+'.lab.test';
const siteHost=x=>'site-'+key(x)+'.lab.test';
function fixture(home,family,index){
 const siteId='matrix-'+family.replaceAll('-','')+'-'+index;
 const cmsRoot=path.join(home,'cms-'+index);
 const siteRoot=path.join(home,'site-'+index);
 fs.cpSync(STAGE,cmsRoot,{recursive:true,errorOnExist:true,force:false});
 if(family==='php'){
  write(siteRoot+'/public/index.php','<?php header("Content-Type: text/plain"); echo "PHP-VISITOR-'+index+'";');
 }else if(family==='next-ssr'){
  write(siteRoot+'/public/favicon.ico','public-next-icon');
  write(siteRoot+'/.next/BUILD_ID','synthetic-ci-structure-only');
  write(siteRoot+'/package.json','{"name":"synthetic-ssr-structure","private":true}');
 }else{
  write(siteRoot+'/public/index.html','VISITOR-'+family+'-'+index);
  if(family==='next-static')write(siteRoot+'/public/_next/static/ci.js','window.CI_EXPORT=true;');
  if(family==='react-spa')write(siteRoot+'/public/assets/main.js','window.CI_REACT_ASSET=true;');
 }
 const capabilities={...defaultCaps,
  sitePhp:family==='php',
  nodeRuntime:family==='next-ssr',reverseProxy:family==='next-ssr'};
 return {siteId,cmsRoot,siteRoot,family,capabilities,
  dbFile:home+'/private/db-'+index+'.sqlite',
  bindingFile:home+'/private/binding-'+index+'.json'};
}
const bpEntry=x=>({
 siteId:x.siteId,cmsOrigin:'https://'+cmsHost(x),
 siteOrigin:'https://'+siteHost(x),cmsDocroot:x.cmsRoot+'/public',
 siteDocroot:x.siteRoot+'/public',cmsMount:'/',siteMount:'/',
 phpTarget:'8.3',phpSapi:'fpm-fcgi',siteRuntime:deliveries[x.family]
});
async function freePort(){
 const s=net.createServer();
 await new Promise((yes,no)=>s.once('error',no).listen(0,'127.0.0.1',yes));
 const port=s.address().port;await new Promise(done=>s.close(done));return port;
}
function fpmConfig(home,id,port){
 const filename=home+'/config/php-'+id+'.conf';
 write(filename,[
 '[global]','pid = '+home+'/php-'+id+'.pid',
 'error_log = '+home+'/php-'+id+'.log','daemonize = no',
 '[worker_'+id+']','listen = 127.0.0.1:'+port,
 'pm = static','pm.max_children = 1',
 'clear_env = yes','security.limit_extensions = .php',
 'php_admin_flag[display_errors] = off',
 'php_admin_flag[log_errors] = off',''
 ].join('\n'));
 return filename;
}
function serverBlock(listen,hostname,root,rules){
 return [
 'server {','listen 127.0.0.1:'+listen+';',
 'server_name '+hostname+';','root '+root+';',
 'autoindex off;','disable_symlinks on;',
 ...rules,'}'
 ].join('\n');
}
function cmsRules(x,upstream){
 return [
 'location / { try_files $uri /index.php$is_args$args; }',
 'location ~ \\.php(?:/|$) { return 404; }',
 'location = /index.php {','internal;',
 'include /etc/nginx/fastcgi_params;',
 'fastcgi_param SCRIPT_FILENAME '+x.cmsRoot+'/public/index.php;',
 'fastcgi_param SCRIPT_NAME /index.php;',
 'fastcgi_param CMS_ENV test;',
 'fastcgi_param CMS_STAGE2_RUNTIME_GATE ci-bound;',
 'fastcgi_param CMS_ALLOW_SQLITE_TEST_ONLY 1;',
 'fastcgi_param CMS_SITE_ID '+x.siteId+';',
 'fastcgi_param CMS_DB_DSN sqlite:'+x.dbFile+';',
 'fastcgi_param CMS_STAGE2_BINDING_FILE '+x.bindingFile+';',
 'fastcgi_pass 127.0.0.1:'+upstream+';','fastcgi_read_timeout 4s;',
 '}'
 ];
}
function phpVisitorRules(x,upstream){
 return [
 'location / { try_files $uri /index.php$is_args$args; }',
 'location ~ \\.php(?:/|$) { return 404; }',
 'location = /index.php {','internal;',
 'include /etc/nginx/fastcgi_params;',
 'fastcgi_param SCRIPT_FILENAME '+x.siteRoot+'/public/index.php;',
 'fastcgi_param SCRIPT_NAME /index.php;',
 'fastcgi_pass 127.0.0.1:'+upstream+';',
 '}'
 ];
}
function staticRules(x){
 return [
 'location ~ \\.(?:php|phtml|phar|sqlite|db|sql|bak|map)$ { return 404; }',
 // Missing file extensions never get successful SPA HTML fallback.
 'location ~ \\.[a-zA-Z0-9]+$ { try_files $uri =404; }',
 x.family==='react-spa'
   ? 'location / { try_files $uri $uri/ /index.html; }'
   : 'location / { try_files $uri $uri/ =404; }'
 ];
}
function nodeProxyRules(upstream){
 return [
 'location ~ /(?:private|vendor|src|bin)(?:/|$) { return 404; }',
 'location ~ \\.(?:php|phtml|phar|env|sqlite|db|sql|bak|json|pem|key)$ { return 404; }',
 'location / {','proxy_http_version 1.1;',
 'proxy_set_header Host $host;',
 'proxy_set_header X-Real-IP 127.0.0.1;',
 'proxy_set_header X-Forwarded-Proto http;',
 'proxy_pass http://127.0.0.1:'+upstream+';',
 'proxy_read_timeout 3s;','}'
 ];
}
function config(home,port,sites,upstreams,phpSiteUpstream,nodeUpstream){
 const list=[
 'worker_processes 1;','pid '+home+'/nginx.pid;',
 'error_log '+home+'/nginx-error.log warn;',
 'events { worker_connections 256; }','http {',
 'access_log off;','include /etc/nginx/mime.types;',
 'default_type application/octet-stream;',
 'sendfile off;',
 serverBlock(port,'_',sites[0].cmsRoot+'/public',['return 404;'])
  .replace('listen 127.0.0.1:'+port+';','listen 127.0.0.1:'+port+' default_server;')
 ];
 for(const x of sites){
  list.push(serverBlock(port,cmsHost(x),x.cmsRoot+'/public',
   cmsRules(x,upstreams[x.siteId])));
  let rules;
  if(x.family==='php')rules=phpVisitorRules(x,phpSiteUpstream);
  else if(x.family==='next-ssr')rules=nodeProxyRules(nodeUpstream);
  else rules=staticRules(x);
  list.push(serverBlock(port,siteHost(x),x.siteRoot+'/public',rules));
 }
 list.push('}');
 const file=home+'/config/nginx.conf';write(file,list.join('\n'));
 return file;
}
const pause=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
// undici/fetch may silently discard a synthetic Host header; explicit
// http.request is essential for a meaningful virtual-host routing test.
function http(port,host,uri='/',options={}){
 return new Promise((resolve,reject)=>{
  const headers={...(options.headers||{}),Host:host};
  const req=rawHttp.request({
   hostname:'127.0.0.1',port,path:uri,method:options.method||'GET',
   headers,timeout:3000
  },response=>{
   const chunks=[];
   response.on('data',chunk=>chunks.push(chunk));
   response.once('end',()=>resolve({
    status:response.statusCode,
    body:Buffer.concat(chunks).toString('utf8'),
    headers:{get:name=>response.headers[name.toLowerCase()]||null}
   }));
   response.once('error',reject);
  });
  req.once('timeout',()=>req.destroy(Error('HTTP timeout')));
  req.once('error',reject);
  req.end();
 });
}
async function expectStatus(port,host,uri,code){
 let last='connection_unavailable';
 for(let i=0;i<100;i++){
  try {
   const value=await http(port,host,uri);
   if(value.status===code)return value;
   last=String(value.status)+' '+value.body.slice(0,180);
  }catch(e){last=String(e.message||e);}
  await pause(80);
 }
 throw Error('Expected '+code+' on '+host+uri+'; last='+last);
}
async function terminate(child){
 if(!child || child.exitCode!==null || child.signalCode!==null)return;
 const ended=new Promise(resolve=>child.once('exit',resolve));
 child.kill('SIGTERM');await ended;
}
function assertRefused(p,expected,label){
 ok(p.status===3&&p.stdout===''&&p.stderr.trim()===expected,label);
}
async function main(){
 verify();
 ok(execute('nginx',['-v']).status===0,'actual installed Nginx');
 ok(execute('php-fpm8.3',['-v']).status===0,'actual isolated PHP8.3-FPM');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'cms-five-family-nginx-'));
 fs.mkdirSync(home+'/private',{recursive:true,mode:0o700});
 fs.mkdirSync(home+'/config',{recursive:true,mode:0o700});
 const children=[];
 try {
  const names=['html','php','react-spa','next-static','next-ssr'];
  const sites=names.map((family,i)=>fixture(home,family,i+1));
  const file=home+'/private/fleet.json',blueprint=home+'/private/blueprint.json';
  write(file,JSON.stringify({
    format:'ai-site-cms-stage2-install-fleet-v1',instances:sites
  }));
  write(blueprint,JSON.stringify({
    format:'ai-site-cms-stage2-offline-deployment-blueprint-v1',
    fleetConfig:file,endpoints:sites.map(bpEntry)
  }));
  const cli=(op,token='none')=>execute('php',[
    STAGE+'/bin/lab-fleet-operator.php',op,
    '--config='+file,'--approval='+token
  ]);
  const plan=cli('--plan');
  ok(plan.status===0&&plan.stderr==='','read-only five-family operator plan');
  const before=JSON.parse(plan.stdout);
  ok(before.instances.length===5&&before.instances.every(x=>x.state==='install_required'),
   'five real runtime families all require independent installations');
  const initialBlueprint=execute('php',[
    STAGE+'/bin/lab-deployment-blueprint.php','--check','--config='+blueprint
  ]);
  ok(initialBlueprint.status===0,'separate origins and framework ABI blueprint verified');
  const declared=JSON.parse(initialBlueprint.stdout);
  ok(declared.sites===5&&declared.fleetState==='not_yet_ready'
    &&declared.items.find(x=>x.family==='next-ssr').requiresNodeProxy,
    'actual five-family declaration checks Node proxy requirement');
  for(const x of sites)ok(!fs.existsSync(x.dbFile),'plan and blueprint did not create DB');
  ok(cli('--apply',before.token).status===0,'five independent DB+binding installations complete');
  const after=cli('--plan');
  ok(after.status===0&&JSON.parse(after.stdout).allReady,
   'all five CMS installations ready with verified package and private DB');
  const readyBlueprint=execute('php',[
    STAGE+'/bin/lab-deployment-blueprint.php','--check','--config='+blueprint
  ]);
  ok(readyBlueprint.status===0&&JSON.parse(readyBlueprint.stdout).fleetState==='ready',
   'read-only blueprint reflects installed five-site fleet without target-host claims');
  const port=await freePort();
  const upstreams={};
  const byCms={};
  for(let i=0;i<sites.length;i++){
   const x=sites[i],p=await freePort();upstreams[x.siteId]=p;
   const c=fpmConfig(home,'cms'+(i+1),p);
   const proc=spawn('php-fpm8.3',['-F','-y',c],{stdio:'ignore'});
   children.push(proc);byCms[x.siteId]=proc;
  }
  const phpVisitor=sites.find(x=>x.family==='php');
  const visitorPort=await freePort();
  const phpWorker=spawn('php-fpm8.3',['-F','-y',
    fpmConfig(home,'phpvisitor',visitorPort)],{stdio:'ignore'});
  children.push(phpWorker);
  const ssr=sites.find(x=>x.family==='next-ssr');
  const nodePort=await freePort();
  const script=String.raw`
const http=require('node:http');
const name=process.env.CI_TEST_SITE;
http.createServer((request,response)=>{
 response.setHeader('Content-Type','text/plain; charset=utf-8');
 response.setHeader('Cache-Control','no-store');
 response.end('SYNTHETIC-NODE-SSR-PROXY:'+name+':'+request.url);
}).listen(Number(process.env.CI_PORT),'127.0.0.1');
`;
  const spawnNode=()=>spawn('node',['-e',script],{
    stdio:'ignore',env:{...process.env,CI_PORT:String(nodePort),
      CI_TEST_SITE:ssr.siteId}});
  let node=spawnNode();children.push(node);
  const nginxConf=config(home,port,sites,upstreams,visitorPort,nodePort);
  const configTest=execute('nginx',['-t','-c',nginxConf,'-p',home+'/']);
  ok(configTest.status===0,'real shared listener config passes Nginx syntax');
  const ng=spawn('nginx',['-c',nginxConf,'-p',home+'/','-g','daemon off;'],
    {stdio:'ignore'});
  children.push(ng);

  try{
    for(const x of sites)await expectStatus(port,cmsHost(x),'/api/health',200);
  }catch(e){
    const shortLog=name=>{
      const file=home+'/'+name;
      return fs.existsSync(file)?fs.readFileSync(file,'utf8').slice(-1500):'absent';
    };
    console.error('CI-only shared-listener diagnostic:',e.message,
      'nginxExit=',ng.exitCode,'nginxSignal=',ng.signalCode,
      'nginxLog=',shortLog('nginx-error.log'),
      'cmsFpmExit=',sites.map(x=>[x.siteId,byCms[x.siteId].exitCode,
       byCms[x.siteId].signalCode]),
      'fpm1Log=',shortLog('php-cms1.log'));
    throw e;
  }
  for(const x of sites){
   const h=cmsHost(x),sh=siteHost(x);
   const health=await http(port,h,'/api/health');
   ok(health.status===200&&health.body==='{"status":"ok"}',
    'independently bound CMS PHP-FPM on one shared Nginx listener '+x.family);
   ok(health.headers.get('cache-control')==='no-store'&&
     health.headers.get('x-content-type-options')==='nosniff',
    'private CMS health is uncached and nosniff '+x.family);
   for(const p of ['/index.php','/vendor/autoload.php',
     '/private/package-manifest.json','/bin/lab-fleet-operator.php',
     '/src/HttpKernel.php']){
    ok((await http(port,h,p)).status===404,
     'CMS direct executable/private path 404 '+x.family+' '+p);
   }
   ok((await http(port,h,'/api/publish',{method:'POST'})).status===404,
    'no write or publish API on '+x.family);
   ok((await http(port,h,'/api/health',{headers:{
      CMS_SITE_ID:'foreign-id',CMS_DB_DSN:'sqlite:/tmp/foreign.sqlite'
    }})).status===200,'untrusted request headers do not choose CMS DB '+x.family);
   const visitor=await http(port,sh,'/');
   if(x.family==='php'){
    ok(visitor.status===200&&visitor.body==='PHP-VISITOR-2',
     'visitor PHP executed in an independent FPM pool');
   }else if(x.family==='next-ssr'){
    ok(visitor.status===200&&visitor.body.includes('SYNTHETIC-NODE-SSR-PROXY:'+x.siteId),
     'Nginx forwards SSR-shaped visitor request to independent Node upstream');
   }else{
    ok(visitor.status===200&&visitor.body==='VISITOR-'+x.family+'-'+(names.indexOf(x.family)+1),
     'actual hosted public asset served '+x.family);
   }
  }
  // Synthetic proxy allows only the limited Stage2 URL surface. Real Next
  // framework data routes require an independently reviewed adapter later.
  ok((await http(port,siteHost(ssr),'/random-private.json')).status===404,
   'Node proxy cannot turn a nonexistent sensitive JSON file into HTTP 200');
  ok((await http(port,siteHost(ssr),'/private/package-manifest.json')).status===404,
   'synthetic SSR reverse proxy refuses CMS private paths at Nginx layer');
  const react=sites.find(x=>x.family==='react-spa');
  const nextStatic=sites.find(x=>x.family==='next-static');
  const html=sites.find(x=>x.family==='html');
  ok((await http(port,siteHost(react),'/dashboard/deep')).status===200,
   'React SPA nested route returns history fallback');
  ok((await http(port,siteHost(html),'/dashboard/deep')).status===404,
   'plain HTML missing deep link correctly gives 404');
  ok((await http(port,siteHost(nextStatic),'/_next/static/ci.js')).body==='window.CI_EXPORT=true;',
   'actual Next static export assets served without Node worker');
  ok((await http(port,siteHost(react),'/assets/main.js')).body==='window.CI_REACT_ASSET=true;',
   'actual React compiled-shaped static assets served without Node worker');
  ok((await http(port,siteHost(react),'/not-here.json')).status===404,
   'missing SPA file never returns 200 HTML fallback');
  ok((await http(port,'cms-unknown.lab.test','/api/health')).status===404,
   'unrecognized CMS origin is not routed to arbitrary instance');
  ok((await http(port,siteHost(html),'/api/health')).status===404,
   'visitor vhost cannot reach CMS health route');
  // Real Nginx symlink refusal for both visitor and CMS hostnames.
  for(const x of [html,nextStatic,ssr]){
   const link=x.siteRoot+'/public/hostile.json';
   fs.symlinkSync(x.cmsRoot+'/private/package-manifest.json',link);
   try{
    const result=await http(port,siteHost(x),'/hostile.json');
    ok(result.status!==200&&!result.body.includes('ai-site-cms-internal-stage2'),
     'visitor public symlink cannot disclose CMS package '+x.family);
   }finally{fs.unlinkSync(link);}
  }

  // Kill NODE SSR, static Next and all CMS health remain available.
  await terminate(node);
  await expectStatus(port,siteHost(ssr),'/',502);
  ok((await http(port,siteHost(ssr),'/')).status===502,
   'SSR Node upstream outage surfaces an explicit 502, never CMS fallback');
  for(const x of sites)ok((await http(port,cmsHost(x),'/api/health')).status===200,
   'CMS stays available when Node visitor app is unavailable '+x.family);
  ok((await http(port,siteHost(nextStatic),'/')).status===200,
   'Next export stays online when SSR Node upstream is stopped');
  node=spawnNode();children.push(node);
  await expectStatus(port,siteHost(ssr),'/',200);

  // Kill independent visitor PHP-FPM, no CMS or unrelated site downtime.
  await terminate(phpWorker);
  await expectStatus(port,siteHost(phpVisitor),'/',502);
  ok((await http(port,siteHost(phpVisitor),'/')).status===502,
   'PHP site worker outage does not become CMS PHP');
  ok((await http(port,cmsHost(phpVisitor),'/api/health')).status===200,
   'separate CMS still responds when its visitor PHP worker dies');
  const resumedPhp=spawn('php-fpm8.3',['-F','-y',
    fpmConfig(home,'phpvisitor',visitorPort)],{stdio:'ignore'});
  children.push(resumedPhp);
  await expectStatus(port,siteHost(phpVisitor),'/',200);

  // Corrupt one metadata DB; its CMS returns 503, all other CMS and visitor
  // apps continue. This is not product data backup or restore.
  const first=sites[0],original=fs.readFileSync(first.dbFile);
  const corruption=execute('php8.3',['-r',
   '$db=new PDO("sqlite:".$argv[1]);'+
   '$db->exec("UPDATE cms_schema_migrations SET checksum = \'bad-matrix-fixture\' WHERE version = 1");',
   first.dbFile]);
  ok(corruption.status===0,'controlled private SQLite corruption injected');
  const blocked=await http(port,cmsHost(first),'/api/health');
  ok(blocked.status===503&&blocked.body==='{"error":"service_unavailable"}',
   'real PHP-FPM rejects damaged installation without exposing details');
  for(const x of sites.slice(1)){
   ok((await http(port,cmsHost(x),'/api/health')).status===200,
    'unrelated CMS DB/runtime isolated from corrupted first site '+x.family);
   ok((await http(port,siteHost(x),'/')).status===200,
    'visitor app remains available on unrelated site '+x.family);
  }
  ok((await http(port,siteHost(first),'/')).status===200,
   'own visitor static site available despite failed CMS metadata');
  fs.writeFileSync(first.dbFile,original,{mode:0o600});
  ok((await http(port,cmsHost(first),'/api/health')).status===200,
   'explicit disposable SQLite fixture reset restores CMS readiness');

  // Kill one CMS FPM pool; other CMS remain healthy, same site's visitor
  // stays available. Restart service without reinstall or rebinding.
  await terminate(byCms[first.siteId]);
  await expectStatus(port,cmsHost(first),'/api/health',502);
  ok((await http(port,cmsHost(first),'/api/health')).status===502,
   'one CMS FPM outage gives 502, not a foreign instance response');
  ok((await http(port,siteHost(first),'/')).status===200,
   'visitor independent of CMS worker availability');
  for(const x of sites.slice(1))ok(
    (await http(port,cmsHost(x),'/api/health')).status===200,
    'other CMS independently answers while first FPM is stopped');
  const restarted=spawn('php-fpm8.3',['-F','-y',
    fpmConfig(home,'cms1',upstreams[first.siteId])],{stdio:'ignore'});
  children.push(restarted);
  await expectStatus(port,cmsHost(first),'/api/health',200);
  ok(JSON.parse(cli('--plan').stdout).allReady,
   'operator state remains READY across host process restarts');
  ok(JSON.parse(execute('php',[
    STAGE+'/bin/lab-deployment-blueprint.php','--check','--config='+blueprint
  ]).stdout).productionReady===false,
   'offline declaration never claims actual host/TLS/Next verification');
  console.log('Stage2 FIVE FAMILY REAL NGINX/FPM/static/PHP/Node-proxy HOST-ROUTING MATRIX PASS: '+
    count+' checks; Next SSR fixture is NOT Next.js framework execution; no real TLS/Apache/target Hostinger.');
 }finally{
  for(const child of [...children].reverse())await terminate(child);
  fs.rmSync(home,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error('Stage2 five-family hosting matrix FAILED',e.stack||e.message);process.exitCode=1;});
