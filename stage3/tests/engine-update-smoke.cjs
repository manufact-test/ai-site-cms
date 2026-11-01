#!/usr/bin/env node
'use strict';

// Isolated signed Stage3 CMS-engine lifecycle: trust, review, apply, lease,
// rollback and complete database snapshot/restore rehearsal.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'../..');
const stage3=path.join(root,'stage3');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-engine-update-'));
const pair=crypto.generateKeyPairSync('rsa',{
  modulusLength:3072,
  publicKeyEncoding:{type:'spki',format:'pem'},
  privateKeyEncoding:{type:'pkcs8',format:'pem'}
});
const privateKeyPath=path.join(tmp,'publisher-private.pem');
const publicKeyPath=path.join(tmp,'publisher-public.pem');
fs.writeFileSync(privateKeyPath,pair.privateKey,{mode:0o600});fs.chmodSync(privateKeyPath,0o600);
fs.writeFileSync(publicKeyPath,pair.publicKey,{mode:0o600});fs.chmodSync(publicKeyPath,0o600);

function run(command,args,env={},expected=0,cwd=root,timeout=180000){
  const result=spawnSync(command,args,{cwd,env:{...process.env,...env},encoding:'utf8',timeout});
  if(result.error)throw result.error;
  if(result.status!==expected)throw new Error(command+' '+args.join(' ')+' exit '+result.status+' expected '+expected+
    '\nSTDERR:\n'+(result.stderr||'')+'\nSTDOUT:\n'+(result.stdout||''));
  return result;
}
function php(code,args=[],env={},expected=0){return run('php',['-r',code,...args],env,expected);}
function copyRuntime(destination,marker){
  fs.mkdirSync(path.join(destination,'stage3'),{recursive:true,mode:0o700});
  for(const folder of ['components','media-motion','server','studio'])
    fs.cpSync(path.join(stage3,folder),path.join(destination,'stage3',folder),{recursive:true});
  fs.writeFileSync(path.join(destination,'stage3/server/EngineBuild.php'),
    "<?php return '"+marker+"';\n",{mode:0o600});
}
function makeReleaseSource(name,marker){
  const directory=path.join(tmp,name);fs.mkdirSync(directory,{mode:0o700});copyRuntime(directory,marker);return directory;
}
function copyIncoming(source,id,privateDir){
  const incoming=path.join(privateDir,'engine','incoming',id);
  fs.cpSync(source,incoming,{recursive:true,errorOnExist:true});
}
function parseJson(result){return JSON.parse(result.stdout);}
function engine(script,command,args=[],env={},expected=0){
  return parseJson(run('php',[script,command,...args],env,expected));
}
function installRuntime(serverRoot,env){
  const code=[
    "require $argv[1].'/bootstrap.php';",
    "require $argv[1].'/bin/Stage3Installer.php';",
    "$db=new PDO(getenv('STAGE3_DSN'),getenv('STAGE3_DB_USER')?:null,getenv('STAGE3_DB_PASSWORD')?:null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);",
    "$keys=['CI','STAGE3_DSN','STAGE3_DB_USER','STAGE3_DB_PASSWORD','STAGE3_OWNER_USER','STAGE3_OWNER_PASSWORD','STAGE3_FORM_SECRET','STAGE3_FORM_ORIGINS','STAGE3_FORM_ENDPOINT','STAGE3_PRIVATE_DIR','STAGE3_PUBLIC_ROOT','STAGE3_ALLOW_SQLITE_INSTALL'];",
    "$env=[];foreach($keys as $key)$env[$key]=(string)(getenv($key)?:'');",
    "$repo=new \\Manufact\\Stage3\\SiteRepository($db,new \\Manufact\\Stage3\\ContractValidator(dirname($argv[1]).'/components'));",
    "$plan=\\Manufact\\Stage3\\Stage3Installer::plan($db,$env);",
    "if(($plan['state']??null)!=='install_required')throw new RuntimeException('Disposable engine test install plan blocked');",
    "$result=\\Manufact\\Stage3\\Stage3Installer::apply($db,$repo,$env,$plan['token']);",
    "echo json_encode($result,JSON_THROW_ON_ERROR);"
  ].join('\n');
  return parseJson(php(code,[serverRoot],env));
}
function addDatabaseFixtures(env){
  const code=[
    "$db=new PDO(getenv('STAGE3_DSN'),getenv('STAGE3_DB_USER')?:null,getenv('STAGE3_DB_PASSWORD')?:null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);",
    "$blob=\"\\0\\xff\\x10engine-snapshot-binary\";",
    "$q=$db->prepare('INSERT INTO stage3_media(site_id,asset_id,mime,sha256,bytes,created_at) VALUES(?,?,?,?,?,?)');",
    "$q->execute(['engine-test','binary-asset','application/octet-stream',hash('sha256',$blob),$blob,'2026-11-01T00:00:00Z']);",
    "$q=$db->prepare('INSERT INTO stage3_publications(site_id,version,source_revision,body,published_at) VALUES(?,?,?,?,?)');",
    "$q->execute(['engine-test',7,9,'{\"title\":\"must remain published\"}','2026-11-01T00:00:00Z']);",
    "echo 'FIXTURES';"
  ].join('\n');
  assert.equal(php(code,[],env).stdout,'FIXTURES');
}
function verifyDatabase(env,dsn=''){
  const code=[
    "$dsn=$argv[1]?:getenv('STAGE3_DSN');",
    "$db=new PDO($dsn,getenv('STAGE3_DB_USER')?:null,getenv('STAGE3_DB_PASSWORD')?:null);",
    "$row=$db->query(\"SELECT hex(bytes) AS bytes_hex,sha256 FROM stage3_media WHERE asset_id='binary-asset'\")->fetch(PDO::FETCH_ASSOC);",
    "$pub=$db->query(\"SELECT version,body FROM stage3_publications WHERE site_id='engine-test'\")->fetch(PDO::FETCH_ASSOC);",
    "$count=$db->query(\"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'\")->fetchColumn();",
    "echo json_encode(['bytesHex'=>$row['bytes_hex'],'sha256'=>$row['sha256'],'publishedVersion'=>(int)$pub['version'],'publishedBody'=>$pub['body'],'tableCount'=>(int)$count]);"
  ].join('\n');
  return parseJson(php(code,[dsn],env));
}
function phpVerify(serverRoot,release,publicKey,env,expected=0){
  const code=[
    "require $argv[1].'/EngineReleaseVerifier.php';",
    "try{\\Manufact\\Stage3\\EngineReleaseVerifier::verify($argv[2],$argv[3],true);echo 'VERIFIED';}",
    "catch(Throwable $e){fwrite(STDERR,$e->getMessage());exit(1);}"
  ].join('\n');
  return php(code,[serverRoot,release,publicKey],env,expected);
}
function removeTreeWritable(target){
  if(!fs.existsSync(target)&&!fs.isSymbolicLink(target))return;
  const stat=fs.lstatSync(target);
  if(stat.isSymbolicLink()||!stat.isDirectory()){
    if(!stat.isSymbolicLink())fs.chmodSync(target,0o600);
    fs.rmSync(target,{force:true});return;
  }
  fs.chmodSync(target,0o700);
  for(const name of fs.readdirSync(target))removeTreeWritable(path.join(target,name));
  fs.rmdirSync(target);
}
async function freePort(){
  return new Promise((resolve,reject)=>{
    const server=net.createServer();server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(error=>error?reject(error):resolve(port));});
  });
}
async function startPhpServer(publicRoot,env){
  const port=await freePort(),base='http://127.0.0.1:'+port;
  const server=spawn('php',['-S','127.0.0.1:'+port,'-t',publicRoot,path.join(publicRoot,'index.php')],
    {cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
  let stderr='';server.stderr.on('data',chunk=>{stderr+=chunk.toString();});
  for(let i=0;i<80;i++){
    if(server.exitCode!==null)throw new Error('PHP web server exited: '+stderr);
    try{const response=await fetch(base+'/api/session');if(response.status===200)return {server,base};}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  server.kill('SIGKILL');throw new Error('PHP web server did not become ready: '+stderr);
}
async function apiCall(base,path,method='GET',body=null,session=null){
  const headers={accept:'application/json'};
  if(session?.cookie)headers.cookie=session.cookie;
  if(method!=='GET'){
    headers.origin=base;headers['content-type']='application/json';
    if(session?.csrfToken)headers['x-csrf-token']=session.csrfToken;
  }
  const response=await fetch(base+path,{method,headers,body:body===null?undefined:JSON.stringify(body)});
  let data={};try{data=await response.json();}catch{}
  return {status:response.status,data,headers:response.headers};
}
function apiOk(result){
  if(result.status!==200)throw new Error('CMS engine API returned '+result.status+': '+JSON.stringify(result.data));
  return result.data;
}

async function waitForText(child,needle,timeoutMs=12000){
  return new Promise((resolve,reject)=>{
    let output='';
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Timed out waiting for PHP request lease: '+output));},timeoutMs);
    child.stdout.on('data',chunk=>{output+=chunk.toString();if(output.includes(needle)){clearTimeout(timer);resolve(output);}});
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',code=>{if(!output.includes(needle)){clearTimeout(timer);reject(new Error('PHP lease exited early '+code+': '+output));}});
  });
}

async function main(){
let activeLease=null,phpServer=null;
try{
  const builder=path.join(stage3,'bin/cms-release.cjs');
  const sourceV1=makeReleaseSource('source-v1','release-one');
  const sourceV2=makeReleaseSource('source-v2','release-two');
  const releaseV1=path.join(tmp,'release-v1'),releaseV2=path.join(tmp,'release-v2');
  run('node',[builder,'pack-signed-php-host',sourceV1,releaseV1,'1.0.0',privateKeyPath,publicKeyPath]);
  run('node',[builder,'pack-signed-php-host',sourceV2,releaseV2,'1.1.0',privateKeyPath,publicKeyPath]);
  run('node',[builder,'verify-signed-php-host',releaseV1,publicKeyPath]);
  run('node',[builder,'verify-signed-php-host',releaseV2,publicKeyPath]);

  const installed=path.join(tmp,'installed');copyRuntime(installed,'legacy-0.9.0');
  const serverRoot=path.join(installed,'stage3/server'),publicRoot=path.join(serverRoot,'public');
  const privateDir=path.join(tmp,'private');fs.mkdirSync(privateDir,{mode:0o700});fs.chmodSync(privateDir,0o700);
  const dbFile=path.join(privateDir,'engine.sqlite');
  php('$db=new PDO(\"sqlite:\".$argv[1]);',[dbFile]);fs.chmodSync(dbFile,0o600);
  const env={
    CI:'true',STAGE3_DSN:'sqlite:'+dbFile,STAGE3_DB_USER:'',STAGE3_DB_PASSWORD:'',
    STAGE3_OWNER_USER:'engineowner',STAGE3_OWNER_PASSWORD:'Engine-update-test-password-2026',
    STAGE3_FORM_SECRET:'engine-update-form-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    STAGE3_FORM_ORIGINS:'https://example.test',STAGE3_FORM_ENDPOINT:'https://forms.example.test',
    STAGE3_PRIVATE_DIR:privateDir,STAGE3_PUBLIC_ROOT:publicRoot,STAGE3_ALLOW_SQLITE_INSTALL:'1'
  };
  assert.equal(installRuntime(serverRoot,env).state,'installed');
  addDatabaseFixtures(env);

  assert.equal(phpVerify(serverRoot,releaseV1,publicKeyPath,env).stdout,'VERIFIED');
  const wrongPair=crypto.generateKeyPairSync('rsa',{modulusLength:3072,
    publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
  const wrongPublic=path.join(tmp,'wrong-public.pem');fs.writeFileSync(wrongPublic,wrongPair.publicKey,{mode:0o600});
  phpVerify(serverRoot,releaseV1,wrongPublic,env,1);
  const tampered=path.join(tmp,'tampered');fs.cpSync(releaseV1,tampered,{recursive:true});
  fs.appendFileSync(path.join(tampered,'stage3/server/bootstrap.php'),'\n// tampered');
  phpVerify(serverRoot,tampered,publicKeyPath,env,1);
  const extra=path.join(tmp,'extra');fs.cpSync(releaseV1,extra,{recursive:true});
  fs.writeFileSync(path.join(extra,'untracked.txt'),'not signed');
  phpVerify(serverRoot,extra,publicKeyPath,env,1);

  const engineScript=path.join(serverRoot,'bin/engine.php');
  engine(engineScript,'trust',[publicKeyPath],{...env,STAGE3_ALLOW_ENGINE_TRUST_SETUP:'YES'});
  copyIncoming(releaseV1,'release-one',privateDir);copyIncoming(releaseV2,'release-two',privateDir);
  const web=await startPhpServer(publicRoot,env);phpServer=web.server;
  const anonymous=await apiCall(web.base,'/api/engine');
  assert.equal(anonymous.status,401,'CMS engine API must require an authenticated session');
  const login=await apiCall(web.base,'/api/login','POST',{
    username:'engineowner',password:env.STAGE3_OWNER_PASSWORD
  });
  assert.equal(login.status,200,'owner login for CMS engine maintenance API');
  const cookieHeader=login.headers.get('set-cookie');
  assert.ok(cookieHeader,'owner login must issue a session cookie');
  const session={cookie:cookieHeader.split(';')[0],csrfToken:login.data.csrfToken};
  assert.ok(session.csrfToken);
  const csrfDenied=await apiCall(web.base,'/api/engine/rollback-plan','POST',{},{
    cookie:session.cookie,csrfToken:'invalid-csrf-token'
  });
  assert.equal(csrfDenied.status,403,'CMS engine mutation API must enforce CSRF');
  const initialStatus=apiOk(await apiCall(web.base,'/api/engine','GET',null,session));
  assert.equal(initialStatus.trustConfigured,true);
  assert.ok(initialStatus.incomingPackages.includes('release-one'));

  // Outcome 1: owner reviews a publisher-authenticated release through the real PHP API.
  const reviewedV1=apiOk(await apiCall(web.base,'/api/engine/review','POST',{packageId:'release-one'},session));
  assert.equal(reviewedV1.releaseVersion,'1.0.0');
  assert.equal(reviewedV1.currentVersion,'legacy-installed');
  assert.equal(reviewedV1.snapshotRequired,true);
  assert.match(reviewedV1.planToken,/^[a-f0-9]{64}$/);

  // Outcome 2: owner activates an immutable engine slot without touching visitor-site data.
  const appliedV1=apiOk(await apiCall(web.base,'/api/engine/apply','POST',{
    releaseId:reviewedV1.releaseId,planToken:reviewedV1.planToken
  },session));
  assert.equal(appliedV1.currentVersion,'1.0.0');
  assert.equal(appliedV1.previousVersion,'legacy-installed');
  assert.equal(appliedV1.databasePreserved,true);
  let status=engine(engineScript,'inspect',[],env);
  assert.equal(status.current.releaseVersion,'1.0.0');assert.equal(status.sequence,1);
  const bootCode="require $argv[1].'/EngineRuntime.php';echo \\Manufact\\Stage3\\EngineRuntime::boot($argv[1]);";
  const activeRoot=php(bootCode,[serverRoot],env).stdout;
  assert.equal(activeRoot,path.join(privateDir,'engine','slots',reviewedV1.releaseId,'stage3'));

  // Upgrade once more; a live request lease must block an engine switch.
  const reviewedV2=apiOk(await apiCall(web.base,'/api/engine/review','POST',{packageId:'release-two'},session));
  const appliedV2=apiOk(await apiCall(web.base,'/api/engine/apply','POST',{
    releaseId:reviewedV2.releaseId,planToken:reviewedV2.planToken
  },session));
  assert.equal(appliedV2.currentVersion,'1.1.0');assert.equal(appliedV2.previousVersion,'1.0.0');
  const rollbackPlan=apiOk(await apiCall(web.base,'/api/engine/rollback-plan','POST',{},session));
  const leaseCode="require $argv[1].'/EngineRuntime.php';\\Manufact\\Stage3\\EngineRuntime::boot($argv[1]);echo '|LEASED';usleep(8000000);";
  activeLease=spawn('php',['-r',leaseCode,serverRoot],{cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
  await waitForText(activeLease,'|LEASED');
  const blocked=await apiCall(web.base,'/api/engine/rollback','POST',{
    planId:rollbackPlan.planId,planToken:rollbackPlan.planToken
  },session);
  assert.equal(blocked.status,422,'CMS engine activation must refuse while a PHP request lease is active');
  await new Promise((resolve,reject)=>activeLease.once('exit',code=>code===0?resolve():reject(new Error('PHP lease exited '+code))));

  // Corrupt the active slot after its request lease is released. The stable
  // control plane and Studio shell must remain reachable so the owner can roll back.
  const activeState=JSON.parse(fs.readFileSync(path.join(privateDir,'engine/state.json'),'utf8'));
  const activeEngineFile=path.join(activeState.active.slotPath,'server','VideoGuard.php');
  const originalEngineFile=fs.readFileSync(activeEngineFile);
  fs.chmodSync(activeEngineFile,0o600);
  fs.writeFileSync(activeEngineFile,Buffer.concat([originalEngineFile,Buffer.from('\\n// recovery test tamper\\n')]));
  fs.chmodSync(activeEngineFile,0o400);
  const damagedStatus=apiOk(await apiCall(web.base,'/api/engine','GET',null,session));
  assert.equal(damagedStatus.status,'active_integrity_failure','owner API reports active-slot integrity failure');
  const damagedStudio=await fetch(web.base+'/studio');
  assert.equal(damagedStudio.status,200,'stable Studio recovery shell remains available when active engine files are damaged');
  const damagedHosted=await fetch(web.base+'/hosted.js');
  assert.equal(damagedHosted.status,200);
  const damagedSession=await apiCall(web.base,'/api/session','GET',null,session);
  assert.equal(damagedSession.status,200);assert.equal(damagedSession.data.authenticated,true);
  const damagedSites=await apiCall(web.base,'/api/sites','GET',null,session);
  assert.equal(damagedSites.status,200);
  const deniedDamagedWrite=await apiCall(web.base,'/api/sites','POST',{site:{}},session);
  assert.equal(deniedDamagedWrite.status,503,'site mutations remain fail-closed while active engine integrity is broken');

  // Outcome 3: explicit rollback to the previous engine; database and publication remain intact.
  const rolledBack=apiOk(await apiCall(web.base,'/api/engine/rollback','POST',{
    planId:rollbackPlan.planId,planToken:rollbackPlan.planToken
  },session));
  fs.chmodSync(activeEngineFile,0o600);
  fs.writeFileSync(activeEngineFile,originalEngineFile);
  fs.chmodSync(activeEngineFile,0o400);
  const repairedStatus=apiOk(await apiCall(web.base,'/api/engine','GET',null,session));
  assert.equal(repairedStatus.status,'ready','restoring the previous slot integrity leaves rollback state healthy');
  assert.equal(rolledBack.currentVersion,'1.0.0');assert.equal(rolledBack.previousVersion,'1.1.0');
  assert.equal(rolledBack.databasePreserved,true);
  status=engine(engineScript,'inspect',[],env);
  assert.equal(status.current.releaseVersion,'1.0.0');assert.equal(status.previous.releaseVersion,'1.1.0');
  const persisted=verifyDatabase(env);
  assert.equal(persisted.publishedVersion,7);
  assert.equal(persisted.publishedBody,'{"title":"must remain published"}');
  assert.equal(persisted.bytesHex,Buffer.from('\0\xff\x10engine-snapshot-binary','binary').toString('hex').toUpperCase());

  const verifiedSnapshot=engine(engineScript,'verify-snapshot',[rolledBack.snapshotId],env);
  assert.equal(verifiedSnapshot.tableCount,25);
  const restoreFile=path.join(tmp,'restored.sqlite');
  php('$db=new PDO(\"sqlite:\".$argv[1]);',[restoreFile]);fs.chmodSync(restoreFile,0o600);
  engine(engineScript,'restore-snapshot',[rolledBack.snapshotId,'sqlite:'+restoreFile],
    {...env,STAGE3_ALLOW_SNAPSHOT_RESTORE:'YES'});
  const restored=verifyDatabase(env,'sqlite:'+restoreFile);
  assert.equal(restored.publishedVersion,7);assert.equal(restored.publishedBody,'{"title":"must remain published"}');
  assert.equal(restored.bytesHex,persisted.bytesHex);assert.equal(restored.tableCount,25);

  // Retention keeps the current recovery point and newest verified snapshots;
  // corrupt/ambiguous snapshots remain available for forensic review.
  const snapshotsRoot=path.join(privateDir,'engine/snapshots');
  const pinnedSnapshot=path.join(snapshotsRoot,rolledBack.snapshotId);
  fs.utimesSync(pinnedSnapshot,new Date(Date.now()+2000),new Date(Date.now()+2000));
  const corruptSnapshot=path.join(snapshotsRoot,'snapshot-20261101131900-aaaaaaaaaaaaaaaa');
  fs.mkdirSync(corruptSnapshot,{mode:0o700});fs.writeFileSync(path.join(corruptSnapshot,'manifest.json'),'not-canonical',{mode:0o600});
  fs.utimesSync(corruptSnapshot,new Date(0),new Date(0));
  const pruneCode=[
    "require $argv[1].'/DatabaseSnapshot.php';",
    "$result=\\Manufact\\Stage3\\DatabaseSnapshot::prune($argv[2],[$argv[3]],2);",
    "echo json_encode($result,JSON_THROW_ON_ERROR);"
  ].join('\n');
  const pruned=parseJson(php(pruneCode,[serverRoot,privateDir,rolledBack.snapshotId]));
  assert.ok(pruned.removed>=1,'old verified snapshots are pruned after a committed transition');
  assert.ok(pruned.remaining<=3,'retention remains bounded with one pinned recovery point');
  assert.ok(fs.existsSync(corruptSnapshot),'corrupt snapshots are retained for forensic review');
  fs.rmSync(corruptSnapshot,{recursive:true,force:true});
  engine(engineScript,'verify-snapshot',[rolledBack.snapshotId],env);

  // Simulate a process crash after the active pointer is written but before
  // its activation receipt is committed. The stable control plane must remain
  // reachable and require an explicit owner-selected recovery direction.
  const recoveryIntentCode=[
    "require $argv[1].'/EngineLifecycle.php';",
    "$class=new \\ReflectionClass(\\Manufact\\Stage3\\EngineLifecycle::class);",
    "$invoke=static function(string $name,array $args)use($class){$method=$class->getMethod($name);$method->setAccessible(true);return $method->invokeArgs(null,$args);};",
    "$layout=$invoke('layout',[$argv[2]]);$old=$invoke('readState',[$layout]);",
    "$next=$old;$next['sequence']=$old['sequence']+1;$next['previous']=$old['active'];$next['active']=$old['previous'];$next['lastSnapshotId']=$argv[3];",
    "$intent=['createdAt'=>gmdate('Y-m-d\\TH:i:s\\Z'),'direction'=>'forward','format'=>'manufact-stage3-engine-intent-v1','newState'=>$next,'oldState'=>$old,'snapshotId'=>$argv[3]];",
    "$invoke('writeFresh',[$layout['intent'],$invoke('canonicalJson',[$intent]).\"\\n\"]);",
    "$invoke('writeAtomic',[$layout['state'],$invoke('canonicalJson',[$next]).\"\\n\"]);",
    "echo json_encode(['sequence'=>$next['sequence']],JSON_THROW_ON_ERROR);"
  ].join('\n');
  const pendingIntent=parseJson(php(recoveryIntentCode,[serverRoot,privateDir,rolledBack.snapshotId],env));
  assert.ok(pendingIntent.sequence>rolledBack.sequence);
  const pendingStatus=apiOk(await apiCall(web.base,'/api/engine','GET',null,session));
  assert.equal(pendingStatus.status,'recovery_required','stable control plane must remain reachable with an unresolved activation journal');
  const pendingStudio=await fetch(web.base+'/studio');
  assert.equal(pendingStudio.status,200,'stable Studio recovery shell remains available during interrupted activation');
  assert.match(await pendingStudio.text(),/data-stage3-mode="server"/);
  const pendingHosted=await fetch(web.base+'/hosted.js');
  assert.equal(pendingHosted.status,200,'stable Studio scripts remain available during interrupted activation');
  const pendingSession=await apiCall(web.base,'/api/session','GET',null,session);
  assert.equal(pendingSession.status,200);assert.equal(pendingSession.data.authenticated,true);
  const pendingSites=await apiCall(web.base,'/api/sites','GET',null,session);
  assert.equal(pendingSites.status,200,'owner can load the read-only site list for the maintenance shell');
  const deniedSiteWrite=await apiCall(web.base,'/api/sites','POST',{site:{}},session);
  assert.equal(deniedSiteWrite.status,503,'site mutations remain fail-closed while activation recovery is pending');
  const recovered=apiOk(await apiCall(web.base,'/api/engine/recover','POST',{direction:'finalize'},session));
  assert.equal(recovered.state,'finalized');
  assert.equal(recovered.currentVersion,'1.1.0');
  const recoveredStatus=apiOk(await apiCall(web.base,'/api/engine','GET',null,session));
  assert.equal(recoveredStatus.status,'ready');
  assert.equal(recoveredStatus.current.releaseVersion,'1.1.0');

  let mysqlSnapshotResult={skipped:true};
  const mysqlHost=process.env.STAGE3_INSTALL_MYSQL_HOST;
  if(mysqlHost){
    const mysqlPort=process.env.STAGE3_INSTALL_MYSQL_PORT||'3306';
    const mysqlUser=process.env.STAGE3_INSTALL_MYSQL_USER||'root';
    const mysqlPassword=process.env.STAGE3_INSTALL_MYSQL_PASSWORD||'';
    const dbName='stage3_engine_snapshot_ci';
    const restoreName='stage3_engine_snapshot_restore_ci';
    const adminCode=[
      "$admin=new PDO('mysql:host='.$argv[1].';port='.$argv[2].';charset=utf8mb4',$argv[3],$argv[4],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);",
      "$admin->exec('DROP DATABASE IF EXISTS " + dbName + "');",
      "$admin->exec('DROP DATABASE IF EXISTS " + restoreName + "');",
      "$admin->exec('CREATE DATABASE " + dbName + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');",
      "$admin->exec('CREATE DATABASE " + restoreName + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');",
      "echo 'DATABASES_READY';"
    ].join('\n');
    try{
      assert.equal(php(adminCode,[mysqlHost,mysqlPort,mysqlUser,mysqlPassword]).stdout,'DATABASES_READY');
      const mysqlInstalled=path.join(tmp,'mysql-installed');copyRuntime(mysqlInstalled,'mysql-legacy');
      const mysqlServer=path.join(mysqlInstalled,'stage3/server');
      const mysqlPrivate=path.join(tmp,'mysql-private');fs.mkdirSync(mysqlPrivate,{mode:0o700});fs.chmodSync(mysqlPrivate,0o700);
      const mysqlEnv={
        CI:'true',
        STAGE3_DSN:'mysql:host='+mysqlHost+';port='+mysqlPort+';dbname='+dbName+';charset=utf8mb4',
        STAGE3_DB_USER:mysqlUser,STAGE3_DB_PASSWORD:mysqlPassword,
        STAGE3_OWNER_USER:'engineowner',STAGE3_OWNER_PASSWORD:'Engine-update-test-password-2026',
        STAGE3_FORM_SECRET:'engine-update-form-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        STAGE3_FORM_ORIGINS:'https://example.test',STAGE3_FORM_ENDPOINT:'https://forms.example.test',
        STAGE3_PRIVATE_DIR:mysqlPrivate,STAGE3_PUBLIC_ROOT:path.join(mysqlServer,'public')
      };
      assert.equal(installRuntime(mysqlServer,mysqlEnv).state,'installed');
      addDatabaseFixtures(mysqlEnv);
      const snapshotCode=[
        "require $argv[1].'/DatabaseSnapshot.php';",
        "require $argv[1].'/bin/Stage3Installer.php';",
        "$db=new PDO(getenv('STAGE3_DSN'),getenv('STAGE3_DB_USER'),getenv('STAGE3_DB_PASSWORD'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);",
        "$receipt=json_decode(file_get_contents(getenv('STAGE3_PRIVATE_DIR').'/installation.json'),true,16,JSON_THROW_ON_ERROR);",
        "$dsn=getenv('STAGE3_DSN');$safe=preg_replace('/(password|pwd)=([^;]*)/i','$1=[redacted]',$dsn)??$dsn;",
        "$fingerprint=hash('sha256',$safe.\"\\n\".getenv('STAGE3_DB_USER'));",
        "$result=\\Manufact\\Stage3\\DatabaseSnapshot::create($db,getenv('STAGE3_PRIVATE_DIR'),$fingerprint,$receipt['instanceId'],1);",
        "echo json_encode($result,JSON_THROW_ON_ERROR);"
      ].join('\n');
      const mysqlSnapshot=parseJson(php(snapshotCode,[mysqlServer],mysqlEnv));
      assert.equal(mysqlSnapshot.tableCount,25);
      const mysqlEngineScript=path.join(mysqlServer,'bin/engine.php');
      engine(mysqlEngineScript,'verify-snapshot',[mysqlSnapshot.snapshotId],mysqlEnv);
      const targetDsn='mysql:host='+mysqlHost+';port='+mysqlPort+';dbname='+restoreName+';charset=utf8mb4';
      engine(mysqlEngineScript,'restore-snapshot',[mysqlSnapshot.snapshotId,targetDsn],{
        ...mysqlEnv,STAGE3_ALLOW_SNAPSHOT_RESTORE:'YES',
        STAGE3_SNAPSHOT_TARGET_USER:mysqlUser,STAGE3_SNAPSHOT_TARGET_PASSWORD:mysqlPassword
      });
      const verifyRestoreCode=[
        "$db=new PDO($argv[1],$argv[2],$argv[3]);",
        "$row=$db->query(\"SELECT HEX(bytes) AS bytesHex FROM stage3_media WHERE asset_id='binary-asset'\")->fetch(PDO::FETCH_ASSOC);",
        "$pub=$db->query(\"SELECT version,body FROM stage3_publications WHERE site_id='engine-test'\")->fetch(PDO::FETCH_ASSOC);",
        "$count=(int)$db->query(\"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'\")->fetchColumn();",
        "echo json_encode(['bytesHex'=>$row['bytesHex'],'version'=>(int)$pub['version'],'body'=>$pub['body'],'tables'=>$count]);"
      ].join('\n');
      const mysqlRestored=parseJson(php(verifyRestoreCode,[targetDsn,mysqlUser,mysqlPassword]));
      assert.equal(mysqlRestored.tables,25);
      assert.equal(mysqlRestored.version,7);
      assert.equal(mysqlRestored.body,'{"title":"must remain published"}');
      assert.equal(mysqlRestored.bytesHex,persisted.bytesHex);
      mysqlSnapshotResult={skipped:false,tables:mysqlSnapshot.tableCount,rows:mysqlSnapshot.rowCount,
        restoredTables:mysqlRestored.tables,binaryMediaPreserved:true};
    }finally{
      const cleanup=[
        "$admin=new PDO('mysql:host='.$argv[1].';port='.$argv[2].';charset=utf8mb4',$argv[3],$argv[4],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);",
        "$admin->exec('DROP DATABASE IF EXISTS "+dbName+"');",
        "$admin->exec('DROP DATABASE IF EXISTS "+restoreName+"');"
      ].join('\n');
      php(cleanup,[mysqlHost,mysqlPort,mysqlUser,mysqlPassword]);
    }
  }

  process.stdout.write(JSON.stringify({
    ok:true,
    checks:[
      'RSA-3072/SHA-256 signed PHP-host package and exact PHP OpenSSL verification',
      'wrong publisher key, modified runtime file and untracked package file rejected',
      'one-time owner review plan bound to signed release and installed DB identity',
      'immutable CMS engine slot activation with legacy rollback candidate',
      'second engine update and request-shared/exclusive activation lease',
      'explicit rollback to previous engine with monotonic activation sequence',
      'published visitor-site version and binary media unchanged',
      'complete 25-table private snapshot verified and restored into a separate SQLite rehearsal DB'
    ],
    versions:{afterFirst:'1.0.0',afterSecond:'1.1.0',afterRollback:'1.0.0'},
    mysqlSnapshot: mysqlSnapshotResult,
    deploymentPerformed:false
  },null,2)+'\n');
}catch(error){
  process.stderr.write((error.stack||error.message)+'\n');process.exitCode=1;
}finally{
  if(activeLease&&activeLease.exitCode===null){
    activeLease.kill('SIGKILL');
    await new Promise(resolve=>activeLease.once('exit',resolve));
  }
  if(phpServer&&phpServer.exitCode===null){
    phpServer.kill('SIGTERM');
    await new Promise(resolve=>phpServer.once('exit',resolve));
  }
  removeTreeWritable(tmp);
}
}
main().catch(error=>{process.stderr.write((error.stack||error.message)+'\n');process.exitCode=1;});
