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
const stage3Root=path.join(root,'stage3');
const fixture=path.join(root,'stage3/fixtures/industrial-site.json');
const host=process.env.STAGE3_INSTALL_MYSQL_HOST||'127.0.0.1';
const port=process.env.STAGE3_INSTALL_MYSQL_PORT||'3306';
const user=process.env.STAGE3_INSTALL_MYSQL_USER||'root';
const password=process.env.STAGE3_INSTALL_MYSQL_PASSWORD||'';
const adminDsn='mysql:host='+host+';port='+port+';charset=utf8mb4';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-mysql-install-'));
const suffix=crypto.randomBytes(5).toString('hex');
const names=['a','b','locked','nonempty','runner'].map(x=>'stage3_install_'+suffix+'_'+x);
const created=[];

function run(command,args,env={},expected=0,cwd=root){
  const result=spawnSync(command,args,{cwd,env:{...process.env,...env},encoding:'utf8',timeout:90000,maxBuffer:2_000_000});
  if(result.error)throw result.error;
  if(result.status!==expected){
    throw new Error(command+' [arguments redacted] exit '+result.status+' expected '+expected+'\n'+(result.stderr||'')+'\n'+(result.stdout||''));
  }
  return result;
}
function php(code,args=[],env={},expected=0,cwd=root){
  return run('php',['-r',code,...args],env,expected,cwd);
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
function createCodeRoot(name){
  const dir=path.join(tmp,name);fs.mkdirSync(dir,{recursive:true,mode:0o700});
  for(const folder of ['server','components','studio']){
    fs.cpSync(path.join(stage3Root,folder),path.join(dir,folder),{recursive:true});
  }
  return fs.realpathSync(dir);
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
function plan(env,expected=0,codeRoot=root){
  const r=run('php',[path.join(codeRoot,'server/bin/install.php'),'--plan'],env,expected,codeRoot);
  return JSON.parse(r.stdout);
}
function apply(env,token,expected=0,codeRoot=root){
  const r=run('php',[path.join(codeRoot,'server/bin/install.php'),'--apply='+token],env,expected,codeRoot);
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
function createFirstAndRejectSecond(env,codeRoot){
  const code="require 'server/bootstrap.php';$repo=stage3_repository();"+
    "$site=json_decode(file_get_contents($argv[1]),true);$site['siteId']=$argv[2];$repo->createSite($site);"+
    "$second=$site;$second['siteId']=$argv[3];try{$repo->createSite($second);fwrite(STDERR,'second site unexpectedly accepted');exit(3);}"+
    "catch(Throwable $e){if(!str_contains($e->getMessage(),'already bound to another site')){fwrite(STDERR,$e->getMessage());exit(4);}echo 'SINGLE_SITE_BOUND';}";
  assert.equal(run('php',['-r',code,fixture,'site-mysql-first','site-mysql-second'],env,0,codeRoot).stdout,'SINGLE_SITE_BOUND');
}
function createSite(env,siteId,codeRoot){
  const code="require 'server/bootstrap.php';$repo=stage3_repository();"+
    "$site=json_decode(file_get_contents($argv[1]),true);$site['siteId']=$argv[2];$repo->createSite($site);echo 'SITE_CREATED';";
  assert.equal(run('php',['-r',code,fixture,siteId],env,0,codeRoot).stdout,'SITE_CREATED');
}

try{
  const modules=run('php',['-m']);
  assert.match(modules.stdout,/pdo_mysql/i,'CI requires PDO MySQL extension');

  const [dbA,dbB,dbLocked,dbNonempty]=names;
  for(const name of names)createDatabase(name);

  const codeRootA=createCodeRoot('cms-a');
  const envA=envFor(dbA,privateDir('private-a'),fs.realpathSync(path.join(codeRootA,'server/public')),'a');
  const before=plan(envA,0,codeRootA);
  assert.equal(before.state,'install_required');
  assert.equal(before.applyAllowed,true);
  assert.match(before.token,/^[a-f0-9]{64}$/);
  const planJson=JSON.stringify(before);
  assert.equal(planJson.includes(password),false);
  assert.equal(planJson.includes(envA.STAGE3_OWNER_PASSWORD),false);
  assert.equal(planJson.includes(envA.STAGE3_FORM_SECRET),false);
  assert.equal(planJson.includes(envA.STAGE3_DSN),false);
  assert.equal(tableCount(dbA),0);

  const installed=apply(envA,before.token,0,codeRootA);
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
  const configPath=path.join(envA.STAGE3_PRIVATE_DIR,'config.json');
  const pointerPath=path.join(codeRootA,'server','private-config-path.json');
  assert.equal(fs.existsSync(configPath),true);
  assert.equal(fs.existsSync(pointerPath),true);
  assert.equal(fs.statSync(configPath).mode&0o777,0o600);
  assert.equal(fs.statSync(pointerPath).mode&0o777,0o600);
  const privateConfig=JSON.parse(fs.readFileSync(configPath,'utf8'));
  assert.equal(privateConfig.values.STAGE3_DSN,envA.STAGE3_DSN);
  assert.equal(privateConfig.values.STAGE3_DB_PASSWORD,password);
  assert.equal(receipt.configPath,configPath);
  assert.equal(receipt.configSha256,crypto.createHash('sha256').update(fs.readFileSync(configPath)).digest('hex'));
  const emptyRuntimeEnv={
    STAGE3_DSN:'',STAGE3_DB_USER:'',STAGE3_DB_PASSWORD:'',
    STAGE3_FORM_SECRET:'',STAGE3_FORM_ORIGINS:'',STAGE3_FORM_ENDPOINT:'',
    STAGE3_PRIVATE_DIR:'',STAGE3_PUBLIC_ROOT:''
  };
  const runtimeCode="require 'server/bootstrap.php';stage3_repository();echo json_encode(["+
    "'dsnHash'=>hash('sha256',(string)getenv('STAGE3_DSN')),"+
    "'passwordHash'=>hash('sha256',(string)getenv('STAGE3_DB_PASSWORD')),"+
    "'formHash'=>hash('sha256',(string)getenv('STAGE3_FORM_SECRET')),"+
    "'privateDir'=>getenv('STAGE3_PRIVATE_DIR'),"+
    "'publicRoot'=>getenv('STAGE3_PUBLIC_ROOT')]);";
  const runtime=JSON.parse(run('php',['-r',runtimeCode],emptyRuntimeEnv,0,codeRootA).stdout);
  assert.equal(runtime.dsnHash,crypto.createHash('sha256').update(envA.STAGE3_DSN).digest('hex'));
  assert.equal(runtime.passwordHash,crypto.createHash('sha256').update(password).digest('hex'));
  assert.equal(runtime.formHash,crypto.createHash('sha256').update(envA.STAGE3_FORM_SECRET).digest('hex'));
  assert.equal(runtime.privateDir,envA.STAGE3_PRIVATE_DIR);
  assert.equal(runtime.publicRoot,envA.STAGE3_PUBLIC_ROOT);
  const persistedPlan=JSON.parse(run('php',[path.join(codeRootA,'server/bin/install.php'),'--plan'],emptyRuntimeEnv,0,codeRootA).stdout);
  assert.equal(persistedPlan.state,'already_installed');
  assert.equal(persistedPlan.checks.databaseServerVersion.ok,true);
  assert.match(persistedPlan.checks.databaseServerVersion.version,/^8\./);
  assert.equal(persistedPlan.checks.schemaIntegrity.ok,true);
  assert.equal(persistedPlan.checks.schemaIntegrity.requiredTableCount,25);
  assert.deepEqual(persistedPlan.checks.schemaIntegrity.missingTables,[]);
  const identity=query(dbA,'SELECT instance_id, mode, site_id FROM stage3_instance WHERE singleton_id=1');
  assert.equal(identity[0].instance_id,installed.instanceId);
  assert.equal(identity[0].mode,'single-site');
  assert.equal(plan(envA,0,codeRootA).state,'already_installed');
  apply(envA,before.token,1,codeRootA);
  createFirstAndRejectSecond(envA,codeRootA);

  const codeRootB=createCodeRoot('cms-b');
  const envB=envFor(dbB,privateDir('private-b'),fs.realpathSync(path.join(codeRootB,'server/public')),'b');
  const planB=plan(envB,0,codeRootB);
  const installedB=apply(envB,planB.token,0,codeRootB);
  assert.notEqual(installedB.instanceId,installed.instanceId);
  createSite(envB,'site-mysql-first',codeRootB);
  assert.equal(Number(query(dbA,'SELECT COUNT(*) AS n FROM stage3_drafts')[0].n),1);
  assert.equal(Number(query(dbB,'SELECT COUNT(*) AS n FROM stage3_drafts')[0].n),1);

  const codeRootLocked=createCodeRoot('cms-locked');
  const envLocked=envFor(dbLocked,privateDir('private-locked'),fs.realpathSync(path.join(codeRootLocked,'server/public')),'locked');
  const lockedPlan=plan(envLocked,0,codeRootLocked);
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
    ...envLocked,STAGE3_LOCK_NAME:lockName,STAGE3_INSTALLER_PATH:path.join(codeRootLocked,'server/bin/install.php'),STAGE3_INSTALL_TOKEN:lockedPlan.token
  },0,codeRootLocked);
  const heldResult=JSON.parse(held.stdout);
  assert.notEqual(heldResult.status,0);
  assert.match(heldResult.stderr,/Another installer is already operating on this MySQL database/);
  assert.equal(tableCount(dbLocked),0);
  assert.equal(fs.existsSync(path.join(envLocked.STAGE3_PRIVATE_DIR,'installation.json')),false);
  const retryPlan=plan(envLocked,0,codeRootLocked);
  assert.equal(apply(envLocked,retryPlan.token,0,codeRootLocked).state,'installed');

  const codeRootNonempty=createCodeRoot('cms-nonempty');
  const envNonempty=envFor(dbNonempty,privateDir('private-nonempty'),fs.realpathSync(path.join(codeRootNonempty,'server/public')),'nonempty');
  php("$pdo=new PDO($argv[1],$argv[2],$argv[3]);$pdo->exec('CREATE TABLE foreign_data(id INT PRIMARY KEY)');",
    ['mysql:host='+host+';port='+port+';dbname='+dbNonempty+';charset=utf8mb4',user,password]);
  const blocked=plan(envNonempty,1,codeRootNonempty);
  assert.equal(blocked.state,'blocked');
  assert.equal(blocked.applyAllowed,false);
  assert.ok(blocked.errors.some(x=>x.includes('not empty')));
  assert.equal(fs.existsSync(path.join(envNonempty.STAGE3_PRIVATE_DIR,'installation.json')),false);
  php("$pdo=new PDO($argv[1],$argv[2],$argv[3]);$pdo->exec('DROP TABLE stage3_visual_findings');",
    ['mysql:host='+host+';port='+port+';dbname='+dbA+';charset=utf8mb4',user,password]);
  const incomplete=plan(envA,1,codeRootA);
  assert.equal(incomplete.state,'blocked');
  assert.equal(incomplete.checks.schemaIntegrity.ok,false);
  assert.ok(incomplete.checks.schemaIntegrity.missingTables.includes('stage3_visual_findings'));

  // Private two-step runner intended for a manually reviewed hPanel Cron Job.
  const dbRunner=names[4];
  createDatabase(dbRunner);
  const codeRootRunner=createCodeRoot('cms-runner');
  const privateRunner=privateDir('private-runner');
  const publicRunner=fs.realpathSync(path.join(codeRootRunner,'server/public'));
  const envRunner=envFor(dbRunner,privateRunner,publicRunner,'runner');
  const runnerConfigPath=path.join(privateRunner,'hosted-install-runner.json');
  const runnerConfig={
    format:'manufact-stage3-hosted-install-runner-config-v1',
    values:{
      STAGE3_DSN:envRunner.STAGE3_DSN,
      STAGE3_DB_USER:envRunner.STAGE3_DB_USER,
      STAGE3_DB_PASSWORD:envRunner.STAGE3_DB_PASSWORD,
      STAGE3_OWNER_USER:envRunner.STAGE3_OWNER_USER,
      STAGE3_OWNER_PASSWORD:envRunner.STAGE3_OWNER_PASSWORD,
      STAGE3_FORM_SECRET:envRunner.STAGE3_FORM_SECRET,
      STAGE3_FORM_ORIGINS:envRunner.STAGE3_FORM_ORIGINS,
      STAGE3_FORM_ENDPOINT:envRunner.STAGE3_FORM_ENDPOINT,
      STAGE3_PRIVATE_DIR:envRunner.STAGE3_PRIVATE_DIR,
      STAGE3_PUBLIC_ROOT:envRunner.STAGE3_PUBLIC_ROOT
    }
  };
  function writeRunnerConfig(document){
    fs.writeFileSync(runnerConfigPath,JSON.stringify(document,null,4)+'\n',{mode:0o600});
    fs.chmodSync(runnerConfigPath,0o600);
  }
  function runRunner(action,expected=0){
    return run('php',[path.join(codeRootRunner,'server/bin/hosted-install-runner.php'),
      '--config='+runnerConfigPath,action],{},expected,codeRootRunner);
  }
  writeRunnerConfig(runnerConfig);
  const runnerPlanResponse=runRunner('--plan');
  const runnerPlan=JSON.parse(runnerPlanResponse.stdout);
  assert.equal(runnerPlan.state,'install_required');
  assert.equal(runnerPlan.applyAllowed,true);
  assert.equal('token' in runnerPlan,false,'private plan token must never be printed');
  assert.match(runnerPlan.approvalFingerprint,/^[a-f0-9]{64}$/);
  for(const secret of [envRunner.STAGE3_DSN,envRunner.STAGE3_DB_PASSWORD,
    envRunner.STAGE3_OWNER_PASSWORD,envRunner.STAGE3_FORM_SECRET]){
    assert.equal(runnerPlanResponse.stdout.includes(secret),false,'plan output must not expose credentials');
  }
  const runnerReviewPath=path.join(privateRunner,'hosted-install-plan-review.json');
  const runnerStatePath=path.join(privateRunner,'hosted-install-plan-state.json');
  const runnerApplyingPath=path.join(privateRunner,'hosted-install-runner-applying.json');
  const runnerConsumedPath=path.join(privateRunner,'hosted-install-runner-consumed.json');
  assert.equal(fs.statSync(runnerConfigPath).mode&0o777,0o600);
  assert.equal(fs.statSync(runnerReviewPath).mode&0o777,0o600);
  assert.equal(fs.statSync(runnerStatePath).mode&0o777,0o600);
  const runnerState=JSON.parse(fs.readFileSync(runnerStatePath,'utf8'));
  assert.match(runnerState.token,/^[a-f0-9]{64}$/);
  assert.equal(tableCount(dbRunner),0,'plan must remain read-only');

  runRunner('--apply='+'0'.repeat(64),1);
  assert.equal(tableCount(dbRunner),0,'wrong approval fingerprint must not mutate MySQL');
  assert.equal(fs.existsSync(runnerApplyingPath),false);

  const changedRunnerConfig=JSON.parse(JSON.stringify(runnerConfig));
  changedRunnerConfig.values.STAGE3_OWNER_PASSWORD='Changed-after-plan-password-2026';
  writeRunnerConfig(changedRunnerConfig);
  runRunner('--apply='+runnerPlan.approvalFingerprint,1);
  assert.equal(tableCount(dbRunner),0,'stale credentials must block apply before schema creation');
  assert.equal(fs.existsSync(runnerApplyingPath),false);
  writeRunnerConfig(runnerConfig);

  const runnerApplied=JSON.parse(runRunner('--apply='+runnerPlan.approvalFingerprint).stdout);
  assert.equal(runnerApplied.state,'installed');
  assert.equal(runnerApplied.deploymentPerformed,false);
  assert.equal(runnerApplied.runnerConfigRemoved,true);
  assert.deepEqual(runnerApplied.cleanupWarnings,[]);
  assert.equal(fs.existsSync(runnerStatePath),false);
  assert.equal(fs.existsSync(runnerApplyingPath),false);
  assert.equal(fs.existsSync(runnerConsumedPath),true);
  assert.equal(fs.statSync(runnerConsumedPath).mode&0o777,0o600);
  assert.equal(fs.existsSync(runnerReviewPath),true,'redacted review plan is retained privately for audit');
  assert.equal(fs.existsSync(runnerConfigPath),false,'credential-bearing runner config is removed after success');
  assert.equal(tableCount(dbRunner),25,'approved runner installs the complete schema once');
  const consumedText=fs.readFileSync(runnerConsumedPath,'utf8');
  for(const secret of [envRunner.STAGE3_DSN,envRunner.STAGE3_DB_PASSWORD,
    envRunner.STAGE3_OWNER_PASSWORD,envRunner.STAGE3_FORM_SECRET]){
    assert.equal(consumedText.includes(secret),false,'consumed marker must not expose credentials');
  }
  runRunner('--plan',1);
  assert.equal(tableCount(dbRunner),25,'consumed runner must not execute again');

  process.stdout.write(JSON.stringify({
    ok:true,
    checks:[
      'real MySQL 8 dedicated database install',
      'read-only plan and no credentials/DSN in plan or receipt',
      'private owner receipt and matching database identity',
      'private runtime configuration persisted outside docroot and reloaded without environment secrets',
      'MySQL 8.0+ server version and full installed schema inventory',
      'incomplete installed schema is reported as blocked, never healthy',
      'single-site binding rejects a second site',
      'independent MySQL database accepts the same site ID',
      'database-scoped GET_LOCK rejects a concurrent installer',
      'lock release permits a fresh approved retry',
      'non-empty MySQL database refused without mutation',
      'private hPanel runner keeps credentials and plan token outside web root and out of plan output',
      'wrong approval and changed credentials are refused before any database write',
      'separate fingerprint approval installs once, removes runner credentials and writes a consumed marker'
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
