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
const rawHttp=require('node:http');
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
 {db:'ai_stage2_pkg_a_ci',user:'stage2pkg_a_ci',password:'disposable_stage2_a_ci',readUser:'stage2pkg_ro_a_ci',readPassword:'disposable_stage2_ro_a_ci',siteId:'stage2-packaged-a',family:'html'},
 {db:'ai_stage2_pkg_b_ci',user:'stage2pkg_b_ci',password:'disposable_stage2_b_ci',readUser:'stage2pkg_ro_b_ci',readPassword:'disposable_stage2_ro_b_ci',siteId:'stage2-packaged-b',family:'php'}
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
function readEnv(x,overrides={}) {
 return {...mysqlEnv(x),CMS_DB_USER:x.readUser,CMS_DB_PASSWORD:x.readPassword,
  CMS_ENV:'test',CMS_STAGE2_RUNTIME_GATE:'mysql-ci-bound',
  CMS_ALLOW_STAGE2_MYSQL_HTTP_CI:'1',
  CI:'true',GITHUB_ACTIONS:'true',...overrides};
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
// A second, independent deployment path: actual Nginx -> separate PHP 8.3
// FPM masters -> two dedicated MySQL 8.4 read-only identities. This is a
// disposable test, NOT a reusable production Nginx/FPM configuration.
function privateFile(file,content){
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 fs.writeFileSync(file,content,{mode:0o600});
}
function fpmConfig(home,label,upstream){
 const out=path.join(home,'nginx-config','fpm-'+label+'.conf');
 privateFile(out,[
  '[global]','pid = '+path.join(home,'fpm-'+label+'.pid'),
  'error_log = '+path.join(home,'fpm-'+label+'.log'),
  'daemonize = no','[ci_'+label+']','listen = 127.0.0.1:'+upstream,
  'listen.backlog = 16','pm = static','pm.max_children = 1',
  'clear_env = yes','security.limit_extensions = .php',
  'php_admin_flag[display_errors] = off',
  'php_admin_flag[log_errors] = off',''
 ].join('\n'));
 return out;
}
function nginxConfig(home,instances,listener,upstreams){
 const conf=path.join(home,'nginx-config','nginx.conf');
 const servers=[
  'server {','listen 127.0.0.1:'+listener+' default_server;',
  'server_name _;','return 404;','}'
 ];
 function cmsServer(x,index,wrongDocumentRoot=false){
  const root=wrongDocumentRoot?x.site+'/public':x.cms+'/public';
  const host=wrongDocumentRoot?'cms-mismapped.ci.test':'cms-'+index+'.ci.test';
  const pair=upstreams[index];
  const parts=[
   'server {','listen 127.0.0.1:'+listener+';',
   'server_name '+host+';','root '+root+';',
   'autoindex off;','disable_symlinks on;',
   'location ~ /\\. { return 404; }',
   'location / { try_files $uri /index.php$is_args$args; }',
   'location ~ \\.php(?:/|$) { return 404; }',
   'location = /index.php {','internal;',
   'include /etc/nginx/fastcgi_params;',
   'fastcgi_param SCRIPT_FILENAME '+x.cms+'/public/index.php;',
   'fastcgi_param SCRIPT_NAME /index.php;',
   'fastcgi_param CMS_STAGE2_REQUIRE_FPM_MAPPING 1;',
   'fastcgi_param CMS_ENV test;',
   'fastcgi_param CMS_STAGE2_RUNTIME_GATE mysql-ci-bound;',
   'fastcgi_param CMS_ALLOW_STAGE2_MYSQL_HTTP_CI 1;',
   'fastcgi_param CI true;','fastcgi_param GITHUB_ACTIONS true;',
   'fastcgi_param CMS_SITE_ID '+x.siteId+';',
   'fastcgi_param CMS_DB_DSN "'+mysqlEnv(x).CMS_DB_DSN+'";',
   'fastcgi_param CMS_DB_USER '+x.readUser+';',
   'fastcgi_param CMS_DB_PASSWORD '+x.readPassword+';',
   'fastcgi_param CMS_STAGE2_MYSQL_BINDING_FILE '+x.binding+';',
   'fastcgi_pass 127.0.0.1:'+pair.cms+';',
   'fastcgi_read_timeout 4s;',
   '}','}'
  ];
  return parts.join('\n');
 }
 function visitorServer(x,index){
  const p=upstreams[index];
  const output=[
   'server {','listen 127.0.0.1:'+listener+';',
   'server_name visitor-'+index+'.ci.test;',
   'root '+x.site+'/public;',
   'autoindex off;','disable_symlinks on;',
   'location ~ /\\. { return 404; }',
   'location ~ \\.(?:phtml|phar|sqlite|db|sql|env)$ { return 404; }'
  ];
  if(x.family==='php'){
   output.push('location / { try_files $uri /index.php$is_args$args; }',
    'location ~ \\.php(?:/|$) { return 404; }',
    'location = /index.php {','internal;',
    'include /etc/nginx/fastcgi_params;',
    'fastcgi_param SCRIPT_FILENAME '+x.site+'/public/index.php;',
    'fastcgi_param SCRIPT_NAME /index.php;',
    'fastcgi_pass 127.0.0.1:'+p.visitor+';',
    'fastcgi_read_timeout 4s;','}');
  }else{
   output.push('location ~ \\.(?:php|key|pem)$ { return 404; }',
    'location / { try_files $uri $uri/ =404; }');
  }
  output.push('}');
  return output.join('\n');
 }
 for(let i=0;i<instances.length;i++){
  servers.push(cmsServer(instances[i],i));
  servers.push(visitorServer(instances[i],i));
 }
 servers.push(cmsServer(instances[0],0,true));
 privateFile(conf,[
  'worker_processes 1;',
  'pid '+path.join(home,'nginx.pid')+';',
  'error_log '+path.join(home,'nginx-error.log')+' warn;',
  'events { worker_connections 256; }',
  'http {','access_log off;',
  'include /etc/nginx/mime.types;',
  'default_type application/octet-stream;',
  'sendfile off;',...servers,'}'
 ].join('\n'));
 return conf;
}
function virtualHttp(listener,host,uri='/',options={}){
 return new Promise((resolve,reject)=>{
  const req=rawHttp.request({
    hostname:'127.0.0.1',port:listener,path:uri,
    method:options.method||'GET',timeout:3000,
    headers:{...(options.headers||{}),Host:host}
  },response=>{
    const bytes=[];let size=0;
    response.on('data',chunk=>{
      size+=chunk.length;
      if(size>65536){req.destroy(Error('response_too_large'));return;}
      bytes.push(chunk);
    });
    response.once('end',()=>resolve({code:response.statusCode,
      body:Buffer.concat(bytes).toString('utf8'),headers:response.headers}));
    response.once('error',reject);
  });
  req.once('timeout',()=>req.destroy(Error('timeout')));
  req.once('error',reject);req.end();
 });
}
async function expectHttp(listener,host,uri,code){
 let lastStatus='transport_unavailable';
 for(let i=0;i<80;i++){
  try{
   const result=await virtualHttp(listener,host,uri);
   if(result.code===code)return result;
   lastStatus='HTTP_'+result.code;
  }catch{lastStatus='transport_unavailable';}
  await pause(100);
 }
 // Never emit HTTP bodies, database credentials, private paths or FPM logs.
 throw Error('Nginx/FPM expected '+code+' at '+host+uri+'; last='+lastStatus);
}
async function realFpmMysql(instances,home){
 const v=run('nginx',['-v']);
 ok(v.status===0,'real Nginx binary installed for MySQL-backed FPM test');
 ok(run('php-fpm8.3',['-v']).status===0,
   'real PHP 8.3 FPM installed for MySQL-backed FPM test');
 const modules=run('php8.3',['-r',
   'exit(in_array("mysql", PDO::getAvailableDrivers(), true)?0:3);']);
 ok(modules.status===0,'actual FPM ABI has PHP8.3 PDO MySQL extension');
 const listener=await port(),children=[];
 const upstreams=[];
 for(let i=0;i<instances.length;i++){
  upstreams.push({cms:await port(),visitor:await port()});
 }
 try{
  for(let i=0;i<instances.length;i++){
   const config=fpmConfig(home,'cms'+i,upstreams[i].cms);
   children.push(spawn('php-fpm8.3',['-F','-y',config],{stdio:'ignore'}));
  }
  const visitorConfig=fpmConfig(home,'visitor1',upstreams[1].visitor);
  children.push(spawn('php-fpm8.3',['-F','-y',visitorConfig],{stdio:'ignore'}));
  const config=nginxConfig(home,instances,listener,upstreams);
  ok((fs.statSync(config).mode&0o077)===0,
    'MySQL FastCGI fixture credentials never stored in world-readable config');
  const syntax=run('nginx',['-t','-c',config,'-p',home+'/']);
  ok(syntax.status===0,'actual Nginx accepts two CMS and independent visitors (safe vhost config parse)');
  children.push(spawn('nginx',['-c',config,'-p',home+'/','-g','daemon off;'],
    {stdio:'ignore'}));
  const a='cms-0.ci.test',b='cms-1.ci.test';
  const va='visitor-0.ci.test',vb='visitor-1.ci.test';
  for(const host of [a,b])await expectHttp(listener,host,'/api/health',200);
  for(const host of [va,vb])await expectHttp(listener,host,'/',200);
  for(const host of [a,b]){
   const r=await virtualHttp(listener,host,'/api/health');
   ok(r.code===200&&r.body==='{"status":"ok"}',
     'real Nginx FastCGI -> dedicated FPM -> independent MySQL read-only 200');
   ok(r.headers['cache-control']==='no-store'
      &&r.headers['x-content-type-options']==='nosniff',
      'MySQL FPM HTTP health retains no-store and nosniff');
   for(const forbidden of ['/index.php','/vendor/autoload.php',
      '/private/package-manifest.json','/bin/install.php',
      '/private/editor/editor.js']){
    ok((await virtualHttp(listener,host,forbidden)).code===404,
      'Nginx/FPM public boundary blocks private executable '+forbidden);
   }
   ok((await virtualHttp(listener,host,'/api/publish',{method:'POST'})).code===404,
     'MySQL FPM does not enable authentication-free write route');
  }
  ok((await virtualHttp(listener,'unknown.ci.test','/api/health')).code===404,
    'default Nginx virtual host is deny-all even if FastCGI is healthy');
  ok((await virtualHttp(listener,'cms-mismapped.ci.test','/api/health')).code===503,
    'real FPM request denies a CMS front controller routed from WRONG document root');
  ok((await virtualHttp(listener,a,'/api/health',{headers:{
    CMS_SITE_ID:instances[1].siteId,
    CMS_DB_DSN:mysqlEnv(instances[1]).CMS_DB_DSN
  }})).code===200,'untrusted HTTP headers cannot override FastCGI identity');
  ok((await virtualHttp(listener,va,'/')).body.includes('INDEPENDENT-VISITOR-A')
    &&(await virtualHttp(listener,vb,'/')).body.includes('INDEPENDENT-VISITOR-B'),
    'static and PHP visitor routes are independent of CMS MySQL identities');

  const original=fs.readFileSync(instances[0].binding);
  fs.appendFileSync(instances[0].binding,'broken');
  ok((await virtualHttp(listener,a,'/api/health')).code===503,
    'real FPM refuses CMS operator-binding corruption');
  ok((await virtualHttp(listener,b,'/api/health')).code===200
    &&(await virtualHttp(listener,va,'/')).code===200
    &&(await virtualHttp(listener,vb,'/')).code===200,
    'sibling CMS and both visitors survive real FPM binding outage');
  fs.writeFileSync(instances[0].binding,original);
  ok((await virtualHttp(listener,a,'/api/health')).code===200,
    'FPM startup recovers after explicit good binding restored');
  const writer=mysqlEnv(instances[0]);
  const changes=run('php',['-r',`
    $pdo=new PDO(getenv("CMS_DB_DSN"),getenv("CMS_DB_USER"),
      getenv("CMS_DB_PASSWORD"),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    if ($argv[1]==="get") {echo $pdo->query(
      "SELECT checksum FROM cms_schema_migrations WHERE version=1")->fetchColumn();exit;}
    $stmt=$pdo->prepare("UPDATE cms_schema_migrations SET checksum=? WHERE version=1");
    $stmt->execute([$argv[2]]);`,
    'get'],writer);
  ok(changes.status===0&&/^[a-f0-9]{64}$/.test(changes.stdout.trim()),
    'dedicated installer MySQL user can read original disposable schema checksum');
  const originalChecksum=changes.stdout.trim();
  const corrupt=run('php',['-r',`
    $pdo=new PDO(getenv("CMS_DB_DSN"),getenv("CMS_DB_USER"),
      getenv("CMS_DB_PASSWORD"),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $stmt=$pdo->prepare("UPDATE cms_schema_migrations SET checksum=? WHERE version=1");
    $stmt->execute([$argv[1]]);`,'0'.repeat(64)],writer);
  ok(corrupt.status===0,'fault injected into first dedicated disposable MySQL schema');
  ok((await virtualHttp(listener,a,'/api/health')).code===503,
    'actual PHP-FPM fails closed when bound MySQL migration checksum is corrupted');
  ok((await virtualHttp(listener,b,'/api/health')).code===200
      &&(await virtualHttp(listener,va,'/')).code===200,
      'unaffected PHP-FPM and visitor continue during MySQL schema outage');
  const restore=run('php',['-r',`
    $pdo=new PDO(getenv("CMS_DB_DSN"),getenv("CMS_DB_USER"),
      getenv("CMS_DB_PASSWORD"),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $stmt=$pdo->prepare("UPDATE cms_schema_migrations SET checksum=? WHERE version=1");
    $stmt->execute([$argv[1]]);`,originalChecksum],writer);
  ok(restore.status===0
    &&(await virtualHttp(listener,a,'/api/health')).code===200,
    'FPM/MySQL returns to 200 after authorized disposable metadata recovery');
  await close({child:children[0]});
  await expectHttp(listener,a,'/api/health',502);
  ok((await virtualHttp(listener,a,'/api/health')).code===502
    &&(await virtualHttp(listener,b,'/api/health')).code===200,
    'killing one FPM master produces only corresponding CMS upstream 502');
  ok((await virtualHttp(listener,va,'/')).code===200
    &&(await virtualHttp(listener,vb,'/')).code===200,
    'two independent visitor sites remain online after CMS PHP-FPM crash');
  const restarted=spawn('php-fpm8.3',['-F','-y',fpmConfig(home,'cms0',upstreams[0].cms)],
    {stdio:'ignore'});
  children.push(restarted);
  await expectHttp(listener,a,'/api/health',200);
  ok((await virtualHttp(listener,a,'/api/health')).code===200,
    'MySQL-bound PHP-FPM reboot reuses exact binding and DB without reinstall');
  await close({child:children[2]});
  await expectHttp(listener,vb,'/',502);
  ok((await virtualHttp(listener,vb,'/')).code===502
     &&(await virtualHttp(listener,a,'/api/health')).code===200
     &&(await virtualHttp(listener,va,'/')).code===200,
     'PHP visitor FPM failure cannot bring down either CMS or static visitor');
  const visitorRestart=spawn('php-fpm8.3',['-F','-y',
    fpmConfig(home,'visitor1',upstreams[1].visitor)],{stdio:'ignore'});
  children.push(visitorRestart);
  await expectHttp(listener,vb,'/',200);
  ok((await virtualHttp(listener,vb,'/')).code===200,
    'isolated PHP visitor recovers without touching either CMS process');
  console.log('Stage2 real Nginx + 3 independent PHP-FPM pools + two MySQL 8.4 '
    +'read-only CMS + HTML/PHP visitors, DB drift, FPM crashes and recovery PASS.');
 } finally {
  for(const child of children.reverse())await close({child});
 }
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
  // Real MySQL-backed, public-HTTP readiness: explicit external package/site/DB
  // binding, an installer-only writer and a SELECT-only HTTP user. This is not
  // available outside disposable GitHub Actions with exact fixture DB names.
  const external=path.join(dataRoot,'operator-bindings');
  fs.mkdirSync(external,{mode:0o700});
  for(const x of instances){
    x.binding=path.join(external,x.siteId+'.json');
    const env=readEnv(x,{CMS_STAGE2_MYSQL_BINDING_FILE:x.binding});
    const premature=invoke(x,'startup-readiness',['--check'],env);
    ok(premature.status===4&&JSON.parse(premature.stdout).state==='binding_missing_or_invalid',
      'actual MySQL HTTP/CLI readiness is 503/not-ready until explicit operator binding');
    const noArgs=invoke(x,'stage2-mysql-ci-binding',[],env);
    ok(noArgs.status===3&&noArgs.stdout==='','MySQL binding cannot run implicitly');
    const roProbe=run('php',['-r',`
      try {
        $pdo=new PDO(getenv('CMS_DB_DSN'),getenv('CMS_DB_USER'),
          getenv('CMS_DB_PASSWORD'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
        if ($pdo->query('SELECT site_id FROM cms_installation')->fetchColumn()!==
            getenv('CMS_SITE_ID'))exit(2);
        $pdo->beginTransaction();
        try {
          $pdo->exec('UPDATE cms_installation SET storage_generation = storage_generation WHERE singleton_id = 1');
          $pdo->rollBack();exit(3);
        } catch(PDOException $e) {$pdo->rollBack();exit(0);}
      } catch(Throwable $e) {exit(4);}
    `],env);
    ok(roProbe.status===0,'separate per-site MySQL HTTP user can SELECT but cannot UPDATE even inside a transaction');
    const prepared=invoke(x,'stage2-mysql-ci-binding',[
      '--bind','--cms-root='+x.cms,'--site-root='+x.site,'--output='+x.binding
    ],env);
    ok(prepared.status===0&&JSON.parse(prepared.stdout).bound===true,
      'explicit packaged binding command validates real MySQL SELECT-only credentials + visitor');
    nonsecret(prepared,'read-only HTTP binding operator');
    const ready=invoke(x,'startup-readiness',['--check'],env);
    ok(ready.status===0&&JSON.parse(ready.stdout).ready===true,
      'packaged CLI refuses false MySQL identity and reports true bound startup');
    const duplicate=invoke(x,'stage2-mysql-ci-binding',[
      '--bind','--cms-root='+x.cms,'--site-root='+x.site,'--output='+x.binding
    ],env);
    ok(duplicate.status===3,'binding cannot be overwritten or silently reset');
    ok(fs.statSync(x.binding).mode%512===0o600,'binding is private mode 0600');
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
  // Two real independently served CMS + visitor sites, simultaneously bound to
  // two distinct real MySQL 8.4 DB identities, with application-read-only accounts.
  const live=[];
  for(const x of instances){
    const env=readEnv(x,{CMS_STAGE2_MYSQL_BINDING_FILE:x.binding});
    const cms=await start(x.cms+'/public',x.cms+'/public/index.php',env);
    const visitor=await start(x.site+'/public',null);
    processes.push(cms,visitor);
    live.push({x,env,cms,visitor});
    const h=await status(cms.url+'/api/health');
    ok(h.code===200&&h.body==='{"status":"ok"}',
      'real packaged CMS HTTP gate proves correct MySQL schema/site/binding');
    const priv=await status(cms.url+'/vendor/autoload.php');
    ok(priv.code===404,'bound CMS never exposes composer private runtime');
    const publish=await status(cms.url+'/api/publish',{method:'POST'});
    ok(publish.code===404,'read-only HTTP schema binding never enables publish');
  }
  for(let i=0;i<live.length;i++){
    const {x,cms,visitor,env}=live[i],other=live[1-i];
    ok((await status(other.cms.url+'/api/health')).code===200,
      'second CMS remains healthy while another is checked');
    const wrongCred=await start(x.cms+'/public',x.cms+'/public/index.php',
      {...env,CMS_DB_PASSWORD:'incorrect-disposable-ci-password'});
    processes.push(wrongCred);
    ok((await status(wrongCred.url+'/api/health')).code===503,
      'stale or wrong MySQL HTTP credential fails closed');
    await close(wrongCred);
    const wrongSite=await start(x.cms+'/public',x.cms+'/public/index.php',
      {...env,CMS_SITE_ID:other.x.siteId});
    processes.push(wrongSite);
    ok((await status(wrongSite.url+'/api/health')).code===503,
      'wrong independent site ID cannot activate MySQL-bound CMS');
    await close(wrongSite);
    const foreignDb=await start(x.cms+'/public',x.cms+'/public/index.php',
      {...env,CMS_DB_DSN:other.env.CMS_DB_DSN});
    processes.push(foreignDb);
    ok((await status(foreignDb.url+'/api/health')).code===503,
      'MySQL gate cannot be directed toward the other CMS database');
    await close(foreignDb);
    const original=fs.readFileSync(x.binding);
    fs.writeFileSync(x.binding,Buffer.concat([original,Buffer.from('tamper')]));
    ok((await status(cms.url+'/api/health')).code===503,
      'operator binding content tamper returns 503 on actual HTTP process');
    fs.writeFileSync(x.binding,original);
    ok((await status(cms.url+'/api/health')).code===200,
      'operator restores intact binding and CMS recovers without DB writes');
    const manifest=x.cms+'/private/package-manifest.json';
    const originalManifest=fs.readFileSync(manifest);
    fs.appendFileSync(manifest,' ');
    ok((await status(cms.url+'/api/health')).code===503,
      'unexpected CMS build/package manifest change fails closed');
    fs.writeFileSync(manifest,originalManifest);
    ok((await status(cms.url+'/api/health')).code===200,
      'restoring exact deployed package manifest recovers HTTP readiness');
    const index=x.site+'/public/'+(x.family==='html'?'index.html':'index.php');
    const originalSite=fs.readFileSync(index);
    fs.appendFileSync(index,' ');
    ok((await status(cms.url+'/api/health')).code===503,
      'changed independent visitor files invalidate CMS/site binding');
    ok((await status(visitor.url+'/')).code===200,
      'visitor remains available despite CMS readiness revocation');
    fs.writeFileSync(index,originalSite);
    ok((await status(cms.url+'/api/health')).code===200,
      'restored visitor fingerprint permits CMS startup again');
    await close(cms);
    ok((await status(visitor.url+'/')).code===200
       &&(await status(other.cms.url+'/api/health')).code===200,
      'independent public website and other CMS survive one CMS HTTP outage');
    const restarted=await start(x.cms+'/public',x.cms+'/public/index.php',env);
    processes.push(restarted);
    ok((await status(restarted.url+'/api/health')).code===200,
      'fresh CMS HTTP process reconnects to its own installed MySQL after outage');
    // keep it live for cross-site isolation check on following pair
    live[i].cms=restarted;
  }
  await realFpmMysql(instances,dataRoot);
  console.log('Stage2 CI MySQL instance-bound startup: two true read-only MySQL '
    +'HTTP identities, explicit operator binding, failure isolation and recovery PASS.');
  console.log('Stage2 verified INTERNAL PHP package + two isolated MySQL 8.4 credentials/DBs,'
    +' CLI install/restart/read-only API, foreign schema refusal and independent visitor PASS: '
    +checks+' checks. MySQL-to-HTTP binding is disposable CI ONLY; no real shared-host/TLS or production approval.');
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
