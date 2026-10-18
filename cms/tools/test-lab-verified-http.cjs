'use strict';
// Stage2 disposable true PHP HTTP smoke behind per-request startup-integrity gate.
// No host, customers, DNS, credentials, install/migrations, DB or publish route.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const http=require('node:http');
const {STAGE,verify}=require('./build-internal-package.cjs');
const {LabRollout}=require('./lab-versioned-rollout.cjs');
const {LabOperatorGuard}=require('./lab-operator-guard.cjs');
const {LabVerifiedHttpRehearsal}=require('./lab-verified-http-rehearsal.cjs');
const {buildSignedLabBundle,stageSignedLabBundle}=require('./lab-signed-offline-release.cjs');
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-http-gate-ci-'));
const lab=new LabRollout(),guard=new LabOperatorGuard(lab,publicKey);
const gate=new LabVerifiedHttpRehearsal(lab,guard);
const v1='0.2.0-stage2.0',v2='0.2.0-stage2.1';
let count=0;
function ok(condition,label){assert.ok(condition,label);count++}
async function denied(promise,re,label){await assert.rejects(promise,re,label);count++}
function makeVersion(version){
  const src=path.join(temp,'src-'+version),out=path.join(temp,'signed-'+version);
  fs.cpSync(STAGE,src,{recursive:true});
  const mfile=path.join(src,'private/package-manifest.json');
  const sfile=path.join(src,'private/compliance/sbom.cdx.json');
  const m=JSON.parse(fs.readFileSync(mfile,'utf8'));
  const sbom=JSON.parse(fs.readFileSync(sfile,'utf8'));
  m.releaseVersion=version;sbom.metadata.component.version=version;
  fs.writeFileSync(sfile,JSON.stringify(sbom,null,2)+'\n');
  const buf=fs.readFileSync(sfile);
  const entry=m.files.find(x=>x.path==='private/compliance/sbom.cdx.json');
  entry.bytes=buf.length;entry.sha256=crypto.createHash('sha256').update(buf).digest('hex');
  fs.writeFileSync(mfile,JSON.stringify(m,null,2)+'\n');
  ok(verify(src).releaseVersion===version,'Synthetic version matches SBOM and manifest');
  fs.mkdirSync(out);
  buildSignedLabBundle(src,out,privateKey,publicKey);
  return out;
}
function stage(bundle,version){
  return stageSignedLabBundle({folder:bundle,trustedPublicKey:publicKey,expectedVersion:version,lab});
}
function operate(kind,version,bundle,failAt){
  const state=guard.inspect();
  return guard.execute({kind,version,envelopeFolder:kind==='upgrade'?bundle:null,
    expectedCurrent:state.current,expectedSequence:state.sequence,failAt});
}
function call(port,url='/api/health',method='GET'){
  return new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port,path:url,method,
      timeout:1500,headers:{connection:'close'}},res=>{
      let data='';
      res.on('data',c=>data+=c.toString('utf8'));
      res.on('end',()=>resolve({status:res.statusCode,
        cache:res.headers['cache-control'],nose:res.headers['x-content-type-options'],body:JSON.parse(data)}));
    });
    req.once('error',reject);req.once('timeout',()=>req.destroy(Error('Timeout')));
    req.end();
  });
}
async function blocked(port,label){
  const a=await call(port);
  ok(a.status===503&&a.body.error==='lab_release_unavailable',label);
  ok(a.cache==='no-store'&&a.nose==='nosniff','Blocked responses are not cacheable and set nosniff');
}
async function healthy(port,version,sequence){
  const a=await call(port);
  ok(a.status===200&&a.body.lab===true&&a.body.status==='ok','PHP-backed loopback health succeeds');
  ok(a.body.version===version&&a.body.generation===sequence,'Pin to the verified code generation');
  ok(a.cache==='no-store'&&a.nose==='nosniff','Health response has no-store + nosniff');
}
(async()=>{
  try{
    await denied(gate.start(),/startup refused: not-activated/,'Cannot serve an unactivated/unsigned slot');
    ok(!gate.server&&!gate.php,'Failed startup never spawns PHP');
    const b1=makeVersion(v1),b2=makeVersion(v2);
    ok(stage(b1,v1)===v1,'Signed baseline package staged');
    ok(operate('upgrade',v1,b1).current===v1,'Signed baseline activated');
    const one=await gate.start();
    ok(one.host==='127.0.0.1'&&one.version===v1&&one.sequence===1,'Loopback-only serving verified pinned baseline');
    ok(gate.php.spawnargs.includes('-S'),'Real PHP CLI server started with selected package');
    ok(!gate.php.spawnargs.includes('0.0.0.0'),'PHP is not bound to public network interfaces');
    await healthy(one.port,v1,1);
    const deniedRoutes=[
      ['/api/publish','POST'],['/admin','GET'],['/private/editor/editor.js','GET'],
      ['/vendor/autoload.php','GET'],['/private/package-manifest.json','GET'],
      ['/composer.json','GET'],['/','GET'],['/api/health?x=1','GET'],
      ['/api/health','POST'],['/api/health','PUT']
    ];
    for(const [url,method] of deniedRoutes){
      const resp=await call(one.port,url,method);
      ok(resp.status===404&&resp.body.error==='not_found',
        'Public read-only facade rejects '+method+' '+url);
    }
    const manifest=path.join(lab.slot(v1),'private/package-manifest.json');
    const originalManifest=fs.readFileSync(manifest);
    fs.appendFileSync(manifest,' ');
    try{
      await blocked(one.port,'Original manifest changed: per-request gate blocks already-running facade');
      await blocked(one.port,'Repeated corrupt health attempt still blocked');
    }finally{fs.writeFileSync(manifest,originalManifest)}
    await healthy(one.port,v1,1);
    const entrypoint=path.join(lab.slot(v1),'public/index.php');
    fs.renameSync(entrypoint,entrypoint+'.missing');
    try{await blocked(one.port,'Deleted executable blocked at each HTTP request')}
    finally{fs.renameSync(entrypoint+'.missing',entrypoint)}
    await healthy(one.port,v1,1);
    // A pending update must gate all public traffic (even the previously
    // working version); operator recovery is explicit.
    ok(stage(b2,v2)===v2,'Second signed package staged');
    await denied(Promise.resolve().then(()=>operate('upgrade',v2,b2,'after-intent')),
      /AFTER durable operator intent/,'Fault injected after durable operation intent');
    await blocked(one.port,'Interrupted pending upgrade refuses traffic');
    ok(guard.recover({mode:'abort'}).status==='clean','Operator aborts pre-switch update');
    await healthy(one.port,v1,1);
    // Normal verified activation changes the generation. The old listener must
    // NEVER hot-switch to the new PHP folder silently.
    ok(operate('upgrade',v2,b2).current===v2,'Second version activated with signed receipt');
    await blocked(one.port,'Generation change requires explicit shutdown/restart');
    ok(gate.sessionStatus().reason==='active-generation-changed-restart-required',
      'Generation pin prevents old listener from serving as if up-to-date');
    await denied(gate.start(),/Already started/,'Cannot create duplicate listener');
    await gate.stop();
    ok(!gate.server&&!gate.php&&!gate.running,'All HTTP/PHP handles closed after restart');
    const two=await gate.start();
    ok(two.version===v2&&two.sequence===2,'Restart pins new active signed generation');
    await healthy(two.port,v2,2);
    // Rollback is manual and signed-receipt verified, not triggered by HTTP.
    const activeFile=path.join(lab.slot(v2),'public/index.php');
    fs.renameSync(activeFile,activeFile+'.missing');
    try{
      await blocked(two.port,'Active version missing while older remains good');
      ok(lab.state().current===v2,'HTTP never performs rollback automatically');
      ok(operate('rollback',v1).current===v1,'Explicit operator chose verified older slot');
      await blocked(two.port,'Previously pinned PHP listener must be restarted after rollback');
    }finally{fs.renameSync(activeFile+'.missing',activeFile)}
    await gate.stop();
    const back=await gate.start();
    ok(back.version===v1&&back.sequence===3,'Manual verified rollback visible after restart');
    await healthy(back.port,v1,3);
    ok(guard.policy().highest===v2,'Rollback cannot erase anti-replay watermark');
    await gate.stop();
    // Bad lock, metadata, or physically missing package must reject before
    // spawning another PHP process. No automatic recreation is permitted.
    const guardLock=guard.lockDir;
    fs.mkdirSync(guardLock);
    try{
      await denied(gate.start(),/startup refused: operator-lock-present/,
        'Orphaned operator lock refuses HTTP startup');
      ok(!gate.php,'Orphaned lock prevented PHP process creation');
    }finally{fs.rmdirSync(guardLock)}
    const policy=guard.policyFile,policyBytes=fs.readFileSync(policy);
    fs.writeFileSync(policy,'{');
    try{await denied(gate.start(),/startup refused: operator-state-invalid/,
      'Malformed policy refuses HTTP startup')}
    finally{fs.writeFileSync(policy,policyBytes)}
    const phpFile=path.join(lab.slot(v1),'public/index.php');
    fs.renameSync(phpFile,phpFile+'.missing');
    try{
      await denied(gate.start(),/startup refused: active-release-corrupt/,
        'Missing PHP entrypoint rejects before PHP spawn');
      ok(!gate.php,'Pre-start corruption never starts PHP');
    }finally{fs.renameSync(phpFile+'.missing',phpFile)}
    ok(!fs.existsSync(path.join(STAGE,'active.json')),'Built offline package untouched');
    console.log('Stage2 gated real PHP loopback HTTP integration PASS: '+count+
      ' checks; isolated ephemeral code slots only, no public deploy/site/database');
  }finally{
    await gate.stop();lab.dispose();fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(err=>{console.error(err);process.exitCode=1});
