#!/usr/bin/env node
'use strict';

// Disposable MySQL installation contract. No external host or customer database.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'../..');
const installer=path.join(root,'stage3/server/bin/install.php');
const fixture=path.join(root,'stage3/fixtures/industrial-site.json');
const host=process.env.STAGE3_INSTALL_MYSQL_HOST||'127.0.0.1';
const port=process.env.STAGE3_INSTALL_MYSQL_PORT||'3306';
const user=process.env.STAGE3_INSTALL_MYSQL_USER||'root';
const password=process.env.STAGE3_INSTALL_MYSQL_PASSWORD||'';
const adminDsn='mysql:host='+host+';port='+port+';charset=utf8mb4';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-mysql-install-'));
const suffix=crypto.randomBytes(5).toString('hex');
const names=['a','b','locked','nonempty'].map(x=>'stage3_install_'+suffix+'_'+x);
const created=[];

function run(command,args,env={},expected=0){
  const result=spawnSync(command,args,{cwd:root,env:{...process.env,...env},encoding:'utf8',timeout:90000,maxBuffer:2_000_000});
  if(result.error)throw result.error;
  if(result.status!==expected){
    throw new Error(command+' [arguments redacted] exit '+result.status+' expected '+expected+'\n'+(result.stderr||'')+'\n'+(result.stdout||''));
  }
  return result;
}
function php(code,args=[],env={},expected=0){
  return run('php',['-r',code,...args],env,expected);
}
function createDatabase(name){
  php("$pdo=new PDO($argv[1],$argv[2],$argv[3],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$pdo->exec('CREATE DATABASE '.$argv[4].' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');",
    [adminDsn,user,password,name]);
  created.push(name);
}
function dropDatabase(name){
  php("$pdo=new PDO($argv[1],$argv[2],$argv[3],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$pdo->exec('DROP DATABASE IF EXISTS '.$argv[4]);",
    [adminDsn,user,password,name]);
}
function privateDir(name){
  const dir=path.join(tmp,name);fs.mkdirSync(dir,{mode:0o700});fs.chmodSync(dir,0o700);return fs.realpathSync(dir);
}
function publicRoot(name){
  const dir=path.join(tmp,name);fs.mkdirSync(dir,{mode:0o755});fs.chmodSync(dir,0o755);return fs.realpathSync(dir);
}
function envFor(name,priv,pub,suffix='one'){
  return {
    STAGE3_DSN:'mysql:host='+host+';port='+port+';dbname='+name+';charset=utf8mb4',
    STAGE3_DB_USER:user,STAGE3_DB_PASSWORD:password,
    STAGE3_OWNER_USER:'mysqlowner'+suffix,
    STAGE3_OWNER_PASSWORD:'MySQL-install-probe-'+suffix+'-2026',
    STAGE3_FORM_SECRET:'mysql-install-private-form-secret-'+suffix+'-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    STAGE3_FORM_ORIGINS:'https://example.test',
    STAGE3_FORM_ENDPOINT:'https://forms.example',
    STAGE3_PRIVATE_DIR:priv,STAGE3_PUBLIC_ROOT:pub
  };
}
function plan(env,expected=0){
  const r=run('php',[installer,'--plan'],env,expected);
  return JSON.parse(r.stdout);
}
function apply(env,token,expected=0){
  const r=run('php',[installer,'--apply='+token],env,expected);
  return expected===0?JSON.parse(r.stdout):r;
}
function query(name,sql){
  const code="$pdo=new PDO($argv[1],$argv[2],$argv[3],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$r=$pdo->query($argv[4]);echo json_encode($r->fetchAll(PDO::FETCH_ASSOC),JSON_THROW_ON_ERROR);";
  return JSON.parse(php(code,['mysql:host='+host+';port='+port+';dbname='+name+';charset=utf8mb4',user,password,sql]).stdout);
}
function tableCount(name){
  const code="$pdo=new PDO($argv[1],$argv[2],$argv[3],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);echo (string)count($pdo->query('SHOW FULL TABLES')->fetchAll(PDO::FETCH_NUM));";
  return Number(php(code,['mysql:host='+host+';port='+port+';dbname='+name+';charset=utf8mb4',user,password]).stdout);
}
function serverHostname(){
  return php("$pdo=new PDO($argv[1],$argv[2],$argv[3]);echo $pdo->query('SELECT @@hostname')->fetchColumn();",
    [adminDsn,user,password]).stdout.trim();
}
function createFirstAndRejectSecond(env){
  const code="require 'stage3/server/bootstrap.php';$repo=stage3_repository();"+
    "$site=json_decode(file_get_contents($argv[1]),true);$site['siteId']=$argv[2];$repo->createSite($site);"+
    "$second=$site;$second['siteId']=$argv[3];try{$repo->createSite($second);fwrite(STDERR,'second site unexpectedly accepted');exit(3);}"+
    "catch(Throwable $e){if(!str_contains($e->getMessage(),'already bound to another site')){fwrite(STDERR,$e->getMessage());exit(4);}echo 'SINGLE_SITE_BOUND';}";
  assert.equal(run('php',['-r',code,fixture,'site-mysql-first','site-mysql-second'],env).stdout,'SINGLE_SITE_BOUND');
}
function createSite(env,siteId){
  const code="require 'stage3/server/bootstrap.php';$repo=stage3_repository();"+
    "$site=json_decode(file_get_contents($argv[1]),true);$site['siteId']=$argv[2];$repo->createSite($site);echo 'SITE_CREATED';";
  assert.equal(run('php',['-r',code,fixture,siteId],env).stdout,'SITE_CREATED');
}

try{
  const modules=run('php',['-m']);
  assert.match(modules.stdout,/pdo_mysql/i,'CI requires PDO MySQL extension');

  const [dbA,dbB,dbLocked,dbNonempty]=names;
  for(const name of names)createDatabase(name);

  const envA=envFor(dbA,privateDir('private-a'),publicRoot('public-a'),'a');
  const before=plan(envA);
  assert.equal(before.state,'install_required');
  assert.equal(before.applyAllowed,true);
  assert.match(before.token,/^[a-f0-9]{64}$/);
  const planJson=JSON.stringify(before);
  assert.equal(planJson.includes(password),false);
  assert.equal(planJson.includes(envA.STAGE3_OWNER_PASSWORD),false);
  assert.equal(planJson.includes(envA.STAGE3_FORM_SECRET),false);
  assert.equal(planJson.includes(envA.STAGE3_DSN),false);
  assert.equal(tableCount(dbA),0);

  const installed=apply(envA,before.token);
  assert.equal(installed.state,'installed');
  assert.equal(installed.instanceMode,'single-site');
  assert.equal(installed.deploymentPerformed,false);
  assert.match(installed.instanceId,/^[a-f0-9]{32}$/);
  const receiptPath=path.join(envA.STAGE3_PRIVATE_DIR,'installation.json');
  const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
  assert.equal(receipt.instanceId,installed.instanceId);
  assert.equal(receipt.dbDriver,'mysql');
  assert.equal(receipt.databaseFingerprint,before.dbFingerprint);
  assert.equal(fs.statSync(receiptPath).mode&0o777,0o600);
  const identity=query(dbA,'SELECT instance_id, mode, site_id FROM stage3_instance WHERE singleton_id=1');
  assert.equal(identity[0].instance_id,installed.instanceId);
  assert.equal(identity[0].mode,'single-site');
  assert.equal(plan(envA).state,'already_installed');
  apply(envA,before.token,1);
  createFirstAndRejectSecond(envA);

  const envB=envFor(dbB,privateDir('private-b'),publicRoot('public-b'),'b');
  const planB=plan(envB);
  const installedB=apply(envB,planB.token);
  assert.notEqual(installedB.instanceId,installed.instanceId);
  createSite(envB,'site-mysql-first');
  assert.equal(Number(query(dbA,'SELECT COUNT(*) AS n FROM stage3_drafts')[0].n),1);
  assert.equal(Number(query(dbB,'SELECT COUNT(*) AS n FROM stage3_drafts')[0].n),1);

  const envLocked=envFor(dbLocked,privateDir('private-locked'),publicRoot('public-locked'),'locked');
  const lockedPlan=plan(envLocked);
  const lockName='stage3-install-'+crypto.createHash('sha256')
    .update(serverHostname()+'\n'+dbLocked).digest('hex').slice(0,48);
  const holderCode=[
    "$pdo=new PDO(getenv('STAGE3_DSN'),getenv('STAGE3_DB_USER'),getenv('STAGE3_DB_PASSWORD'));",
    "$name=getenv('STAGE3_LOCK_NAME');$q=$pdo->prepare('SELECT GET_LOCK(?,0)');$q->execute([$name]);",
    "if((int)$q->fetchColumn()!==1){fwrite(STDERR,'could not hold test advisory lock');exit(5);}",
    "$descriptors=[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']];",
    "$proc=proc_open([PHP_BINARY,getenv('STAGE3_INSTALLER_PATH'),'--apply='.getenv('STAGE3_INSTALL_TOKEN')],$descriptors,$pipes);",
    "if(!is_resource($proc)){fwrite(STDERR,'could not start installer child');exit(6);}",
    "fclose($pipes[0]);$out=stream_get_contents($pipes[1]);fclose($pipes[1]);",
    "$err=stream_get_contents($pipes[2]);fclose($pipes[2]);$status=proc_close($proc);",
    "$release=$pdo->prepare('SELECT RELEASE_LOCK(?)');$release->execute([$name]);",
    "echo json_encode(['status'=>$status,'stdout'=>$out,'stderr'=>$err]);"
  ].join(' ');
  const held=php(holderCode,[],{
    ...envLocked,STAGE3_LOCK_NAME:lockName,STAGE3_INSTALLER_PATH:installer,STAGE3_INSTALL_TOKEN:lockedPlan.token
  });
  const heldResult=JSON.parse(held.stdout);
  assert.notEqual(heldResult.status,0);
  assert.match(heldResult.stderr,/Another installer is already operating on this MySQL database/);
  assert.equal(tableCount(dbLocked),0);
  assert.equal(fs.existsSync(path.join(envLocked.STAGE3_PRIVATE_DIR,'installation.json')),false);
  const retryPlan=plan(envLocked);
  assert.equal(apply(envLocked,retryPlan.token).state,'installed');

  const envNonempty=envFor(dbNonempty,privateDir('private-nonempty'),publicRoot('public-nonempty'),'nonempty');
  php("$pdo=new PDO($argv[1],$argv[2],$argv[3]);$pdo->exec('CREATE TABLE foreign_data(id INT PRIMARY KEY)');",
    ['mysql:host='+host+';port='+port+';dbname='+dbNonempty+';charset=utf8mb4',user,password]);
  const blocked=plan(envNonempty,1);
  assert.equal(blocked.state,'blocked');
  assert.equal(blocked.applyAllowed,false);
  assert.ok(blocked.errors.some(x=>x.includes('not empty')));
  assert.equal(fs.existsSync(path.join(envNonempty.STAGE3_PRIVATE_DIR,'installation.json')),false);

  process.stdout.write(JSON.stringify({
    ok:true,
    checks:[
      'real MySQL 8 dedicated database install',
      'read-only plan and no credentials/DSN in plan or receipt',
      'private owner receipt and matching database identity',
      'single-site binding rejects a second site',
      'independent MySQL database accepts the same site ID',
      'database-scoped GET_LOCK rejects a concurrent installer',
      'lock release permits a fresh approved retry',
      'non-empty MySQL database refused without mutation'
    ],
    instanceIds:[installed.instanceId,installedB.instanceId],
    deploymentPerformed:false
  },null,2)+'\n');
}catch(error){
  process.stderr.write((error.stack||error.message)+'\n');
  process.exitCode=1;
}finally{
  for(const name of created){try{dropDatabase(name);}catch(_){}}
  fs.rmSync(tmp,{recursive:true,force:true});
}
