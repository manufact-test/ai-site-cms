'use strict';
// Real concurrent PHP CLI HTTP servers on 127.0.0.1, verified PHP generation
// routing, graceful request drains and SIGKILL during switch journal transitions.
// CI ONLY. No PHP-FPM, public listener, database or production deployment.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto'),net=require('node:net'),http=require('node:http');
const assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const FIX=path.join(ROOT,'tests/fixtures');
const OP=path.join(FIX,'generation-http-operator.php');
const ROUTER=path.join(FIX,'http-generation-router.php');
if(process.env.CI!=='true'||process.env.CMS_ALLOW_PHP_INSTALL_LAB!=='1')
  throw Error('Only explicitly authorized ephemeral PHP CI lab');
const V1='0.2.0-stage2.1',V2='0.2.0-stage2.2';
const base=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-php-http-tests-'));
const sync=path.join(os.tmpdir(),'ai-site-cms-php-http-sync-'+crypto.randomBytes(12).toString('hex'));
fs.mkdirSync(sync,{mode:0o700});
let lab=null,checks=0;
const servers=new Set(),workers=new Set();
const ok=(value,name)=>{assert.ok(value,name);checks++};
const deny=(run,name)=>{const result=run();ok(result.status!==0,name)};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const exists=p=>{try{fs.lstatSync(p);return true}catch(e){if(e.code==='ENOENT')return false;throw e}};
async function until(fn,label,tries=160){
  for(let i=0;i<tries;i++){if(await fn())return;await pause(40)}
  throw Error('Timed out: '+label);
}
function cli(args,timeout=30000){
  const r=spawnSync('php',[OP,...args],{env:process.env,encoding:'utf8',
    timeout,maxBuffer:65536});
  if(r.error)throw r.error;
  return r;
}
function mustCli(args,label){
  const r=cli(args);
  if(r.status!==0)throw Error(label+' failed (exit '+r.status+') '+r.stderr.slice(0,120));
  return JSON.parse(r.stdout);
}
function writeSynthetic(folder,version){
  const files={
    'public/index.php':'<?php echo "lab";',
    'vendor/autoload.php':'<?php // simulated isolated Composer',
    'private/editor/editor.js':'window.lab='+JSON.stringify(version)+';',
    'composer.json':'{"require":{}}'
  };
  const items=[];
  for(const [name,content] of Object.entries(files)){
    const file=path.join(folder,name);
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    fs.writeFileSync(file,content);
    items.push({path:name,bytes:Buffer.byteLength(content),
      sha256:crypto.createHash('sha256').update(content).digest('hex')});
  }
  const manifest={format:'ai-site-cms-internal-stage2-v2',stage:2,
    releaseVersion:version,productionReady:false,documentRoot:'public',
    isSigned:false,writeEndpointsAvailable:false,files:items};
  fs.mkdirSync(path.join(folder,'private'),{recursive:true});
  fs.writeFileSync(path.join(folder,'private/package-manifest.json'),
    JSON.stringify(manifest,null,2)+'\n');
}
function sourceFor(version){
  const folder=path.join(base,version);
  const stage=path.join(ROOT,'.build/internal-stage2-package');
  if(fs.existsSync(path.join(stage,'private/package-manifest.json'))){
    fs.cpSync(stage,folder,{recursive:true});
    const mf=path.join(folder,'private/package-manifest.json');
    const manifest=JSON.parse(fs.readFileSync(mf,'utf8'));
    const sf=path.join(folder,'private/compliance/sbom.cdx.json');
    const sbom=JSON.parse(fs.readFileSync(sf,'utf8'));
    manifest.releaseVersion=version;sbom.metadata.component.version=version;
    fs.writeFileSync(sf,JSON.stringify(sbom,null,2)+'\n');
    const item=manifest.files.find(x=>x.path==='private/compliance/sbom.cdx.json');
    if(!item)throw Error('SBOM missing from compiled package');
    const bytes=fs.readFileSync(sf);
    item.bytes=bytes.length;
    item.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
    fs.writeFileSync(mf,JSON.stringify(manifest,null,2)+'\n');
  }else{
    fs.mkdirSync(folder);
    writeSynthetic(folder,version);
  }
  const hash=crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(folder,'private/package-manifest.json'))).digest('hex');
  return {folder,hash,real:fs.existsSync(path.join(ROOT,'.build/internal-stage2-package/private/package-manifest.json'))};
}
async function unusedPort(){
  const server=net.createServer();
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}
function request(port,uri='/api/health',method='GET',timeout=12000){
  return new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port,path:uri,method,timeout,
      headers:{connection:'close'}},res=>{
      let raw='';
      res.on('data',b=>raw+=b.toString());
      res.on('end',()=>{
        let payload=null;try{payload=JSON.parse(raw)}catch{}
        resolve({status:res.statusCode,body:payload,headers:res.headers});
      });
    });
    req.on('error',reject);
    req.on('timeout',()=>req.destroy(Error('HTTP request timed out')));
    req.end();
  });
}
async function startServer(root){
  const port=await unusedPort();
  const proc=spawn('php',['-S','127.0.0.1:'+port,'-t',FIX,ROUTER],{
    env:{...process.env,CI:'true',CMS_ALLOW_PHP_INSTALL_LAB:'1',
      CMS_PHP_LAB_HTTP_ONLY:'1',CMS_PHP_HTTP_SYNC_DIR:sync,
      CMS_PHP_HTTP_SWITCH_ROOT:root,CMS_PHP_HTTP_FLOOR:V1},
    stdio:'ignore'
  });
  servers.add(proc);
  await until(async()=>{
    if(proc.exitCode!==null)throw Error('PHP HTTP process stopped unexpectedly');
    try{return (await request(port,'/api/health','GET',800)).status===200}
    catch{return false}
  },'start loopback PHP HTTP worker');
  return {proc,port};
}
function hold(port){
  const token=crypto.randomBytes(6).toString('hex');
  const pending=request(port,'/api/hold?token='+token,'GET',14500);
  return {token,pending,ready:path.join(sync,'ready-'+token),
    release:path.join(sync,'release-'+token)};
}
function endHold(p){fs.writeFileSync(p.release,'release\n')}
function verifyResponse(r,version,seq,label){
  ok(r.status===200&&r.body?.version===version&&r.body?.generation===seq,label);
  ok(r.headers['cache-control']==='no-store'
    &&r.headers['x-content-type-options']==='nosniff',label+' no-store/nosniff');
}
async function crashSwitch(args,pendingPredicate,label){
  const proc=spawn('php',[OP,'--switch',...args],{env:process.env,stdio:'ignore'});
  workers.add(proc);
  await until(async()=>pendingPredicate(),label);
  ok(proc.exitCode===null,label+' real process alive at observed transition');
  proc.kill('SIGKILL');
  const code=await new Promise(resolve=>proc.once('close',(c,s)=>resolve({c,s})));
  workers.delete(proc);
  ok(code.s==='SIGKILL',label+' real PHP process terminated with SIGKILL');
}
async function main(){
  const s1=sourceFor(V1),s2=sourceFor(V2);
  const b=mustCli(['--bootstrap',s1.folder,s1.hash,s2.folder,s2.hash],'bootstrap');
  lab=b;
  ok(b.current===V1&&b.sequence===1,'independent lab code generation initialized');
  ok(b.releases.length===2&&b.releases[0].version===V1&&b.releases[1].version===V2,
    'both immutable lab code generations installed and registered');
  if(s1.real)ok(fs.readdirSync(path.join(s1.folder,'vendor')).length>10,
    'actual compiled Composer distribution exercised, not stub');
  const a=await startServer(b.switchRoot);
  const c=await startServer(b.switchRoot);
  const d=await startServer(b.switchRoot);
  verifyResponse(await request(a.port),V1,1,'HTTP worker A initially serves verified version');
  verifyResponse(await request(c.port),V1,1,'HTTP worker B initially serves verified version');
  let r=await request(d.port,'/api/publish','POST');
  ok(r.status===503 || r.status===404,'no HTTP write endpoint');
  r=await request(d.port,'/private/package-manifest.json');
  ok(r.status===404,'private package manifest never exposed through fixture');
  r=await request(d.port,'/vendor/autoload.php');
  ok(r.status===404,'private Composer entrypoint never exposed');
  r=await request(d.port,'/api/hold?token=../../etc');
  ok(r.status===404,'HTTP unsafe hold token refused');

  const one=hold(a.port);
  const two=hold(c.port);
  await until(()=>exists(one.ready)&&exists(two.ready),'two real simultaneous PHP HTTP leases');
  ok(fs.readFileSync(one.ready,'utf8').trim()===V1
      &&fs.readFileSync(two.ready,'utf8').trim()===V1,
    'parallel HTTP requests pin same old generation');
  deny(()=>cli(['--switch',b.switchRoot,V2,V1,'1',V1,'none']),
    'activation refused until all active HTTP requests finish');
  ok(mustCli(['--inspect',b.switchRoot,V1],'inspect while held').current===V1,
    'blocked switch did not alter pointer or journal');
  endHold(one);
  verifyResponse(await one.pending,V1,1,'first completed HTTP response remains old generation');
  deny(()=>cli(['--switch',b.switchRoot,V2,V1,'1',V1,'none']),
    'second active long HTTP request still prevents activation');

  // SIGKILL a real PHP server while it owns the shared flock lease. Kernel
  // must release its lock even when its HTTP response is abruptly cancelled.
  const killed=hold(d.port);
  await until(()=>exists(killed.ready),'third HTTP request acquired lease before SIGKILL');
  d.proc.kill('SIGKILL');
  servers.delete(d.proc);
  await new Promise(resolve=>d.proc.once('close',resolve));
  try {await killed.pending; throw Error('Terminated PHP request unexpectedly succeeded')}
  catch(error){ok(error.message!=='Terminated PHP request unexpectedly succeeded',
    'abrupt HTTP worker termination cancels in-flight response');}
  deny(()=>cli(['--switch',b.switchRoot,V2,V1,'1',V1,'none']),
    'surviving HTTP request still owns shared lease after peer SIGKILL');
  endHold(two);
  verifyResponse(await two.pending,V1,1,'survivor finishes on original generation');
  ok(mustCli(['--switch',b.switchRoot,V2,V1,'1',V1,'none'],'switch after drain').current===V2,
    'activation succeeds after graceful drain and SIGKILL lease release');
  verifyResponse(await request(a.port),V2,2,'HTTP worker A observes new generation without restart');
  verifyResponse(await request(c.port),V2,2,'HTTP worker B observes new generation without restart');

  const pointer=path.join(b.switchRoot,'active.json');
  const journal=path.join(b.switchRoot,'switch-intent.json');
  const stale=path.join(b.switchRoot,'switch-exclusive.lock');
  await crashSwitch([b.switchRoot,V1,V2,'2',V1,'pause-after-intent'],
    ()=>exists(journal)&&exists(stale)&&JSON.parse(fs.readFileSync(pointer,'utf8')).sequence===2,
    'operator crash before pointer');
  ok(exists(stale),'actual SIGKILL leaves stale durable mkdir operator lock');
  ok((await request(a.port)).status===503,'HTTP fails closed while stale operator lock remains');
  deny(()=>cli(['--unlock',b.switchRoot,V2,'99','pending-before-switch',V1]),
    'stale-lock recovery requires correct expected sequence');
  ok(mustCli(['--unlock',b.switchRoot,V2,'2','pending-before-switch',V1],
    'manual pre-pointer lock review').status==='pending-before-switch',
    'manual safe lock review leaves journal unresolved');
  ok((await request(a.port)).status===503,'HTTP still blocked after lock recovery until operator abort');
  ok(mustCli(['--recover',b.switchRoot,'abort',V1],'manual abort').current===V2,
    'pre-pointer crash abort retains v2');
  verifyResponse(await request(a.port),V2,2,'HTTP resumes on original version after abort');

  await crashSwitch([b.switchRoot,V1,V2,'2',V1,'pause-after-pointer'],
    ()=>exists(journal)&&exists(stale)&&JSON.parse(fs.readFileSync(pointer,'utf8')).sequence===3,
    'operator crash after pointer');
  ok((await request(c.port)).status===503,'HTTP fails closed on half-committed generation');
  deny(()=>cli(['--unlock',b.switchRoot,V1,'3','pending-before-switch',V1]),
    'wrong journal status cannot unlock after committed pointer');
  ok(mustCli(['--unlock',b.switchRoot,V1,'3','pending-after-switch',V1],
    'manual post-pointer lock review').status==='pending-after-switch',
    'operator detects real post-pointer crash');
  deny(()=>cli(['--recover',b.switchRoot,'abort',V1]),
    'cannot abort committed generation after SIGKILL');
  ok(mustCli(['--recover',b.switchRoot,'finalize',V1],
    'explicit committed recovery').current===V1,'manual finalize restores service to v1');
  verifyResponse(await request(c.port),V1,3,'HTTP observes finalized rollback generation');
  verifyResponse(await request(a.port),V1,3,'all PHP HTTP workers converge after recovery');

  // A healthy but incomplete journal is never allowed to race reader traffic.
  const holdAgain=hold(a.port);
  await until(()=>exists(holdAgain.ready),'post-crash long HTTP lease');
  deny(()=>cli(['--switch',b.switchRoot,V2,V1,'3',V1,'none']),
    'upgrade cannot run during recovered HTTP request');
  endHold(holdAgain);
  verifyResponse(await holdAgain.pending,V1,3,'last verified in-flight response consistent');
  ok(mustCli(['--switch',b.switchRoot,V2,V1,'3',V1,'none'],
    'final clean forward activation').sequence===4,'generation sequence keeps increasing after crash recovery');
  verifyResponse(await request(a.port),V2,4,'post-recovery upgraded HTTP generation is current');
  ok(checks>=38,'race, process crashes, HTTP and fail-closed coverage executed');
  console.log('Stage2 REAL PHP loopback parallel HTTP + SIGKILL operator recovery PASS: '+
    checks+' assertions; '+(s1.real?'real compiled internal release':'synthetic isolated PHP fixture')+
    '; never real PHP-FPM/OPcache or production deploy');
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1})
.finally(async()=>{
  for(const p of workers){try{p.kill('SIGKILL')}catch{}}
  for(const p of servers){try{p.kill('SIGKILL')}catch{}}
  await pause(120);
  if(lab){
    const names=[lab.switchRoot,...lab.releases.map(x=>x.root)];
    for(const dir of names){
      if(path.dirname(dir)===fs.realpathSync(os.tmpdir()) &&
          /^ai-site-cms-php-(?:switch|install)-lab-[a-f0-9]{32}$/.test(path.basename(dir)))
        fs.rmSync(dir,{recursive:true,force:true});
    }
  }
  if(path.dirname(sync)===fs.realpathSync(os.tmpdir()) &&
      /^ai-site-cms-php-http-sync-[a-f0-9]{24}$/.test(path.basename(sync)))
    fs.rmSync(sync,{recursive:true,force:true});
  if(path.dirname(base)===fs.realpathSync(os.tmpdir())&&
      path.basename(base).startsWith('ai-site-cms-php-http-tests-'))
    fs.rmSync(base,{recursive:true,force:true});
});
