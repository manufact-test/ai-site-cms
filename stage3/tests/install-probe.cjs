#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'../..');
const stage3Root=path.join(root,'stage3');
const fixture=path.join(root,'stage3/fixtures/industrial-site.json');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-install-probe-'));

function run(command,args,env={},expected=0,cwd=root){
  const result=spawnSync(command,args,{cwd,env:{...process.env,...env},encoding:'utf8',timeout:90000});
  if(result.error)throw result.error;
  if(result.status!==expected){
    throw new Error(command+' '+args.join(' ')+' exit '+result.status+' expected '+expected+'\n'+(result.stderr||'')+'\n'+(result.stdout||''));
  }
  return result;
}
function createCodeRoot(name){
  const dir=path.join(tmp,name);
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  for(const folder of ['server','components','studio']){
    fs.cpSync(path.join(stage3Root,folder),path.join(dir,folder),{recursive:true});
  }
  return fs.realpathSync(dir);
}
function mkdirPrivate(name){
  const dir=path.join(tmp,name);
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  fs.chmodSync(dir,0o700);
  return dir;
}
function mkdirPublic(name){
  const dir=path.join(tmp,name);
  fs.mkdirSync(dir,{recursive:true,mode:0o755});
  return fs.realpathSync(dir);
}
function createDb(name){
  const file=path.join(tmp,name+'.sqlite');
  run('php',['-r','$db=new PDO("sqlite:".$argv[1]);',file],{CI:'true'});
  fs.chmodSync(file,0o600);
  return file;
}
function envFor(db,privateDir,publicRoot,suffix='one'){
  return {
    CI:'true',
    STAGE3_DSN:'sqlite:'+db,
    STAGE3_DB_USER:'',
    STAGE3_DB_PASSWORD:'',
    STAGE3_OWNER_USER:'testowner'+(suffix==='one'?'':suffix),
    STAGE3_OWNER_PASSWORD:'Install-probe-password-'+suffix+'-2026',
    STAGE3_FORM_SECRET:'install-probe-private-form-secret-'+suffix+'-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    STAGE3_FORM_ORIGINS:'https://example.test',
    STAGE3_FORM_ENDPOINT:'https://forms.example',
    STAGE3_PRIVATE_DIR:privateDir,
    STAGE3_PUBLIC_ROOT:publicRoot,
    STAGE3_ALLOW_SQLITE_INSTALL:'1'
  };
}
function command(env,action,expected=0,codeRoot=root){
  return run('php',[path.join(codeRoot,'server/bin/install.php'),action],env,expected,codeRoot);
}
function plan(env,expected=0,codeRoot=root){
  return JSON.parse(command(env,'--plan',expected,codeRoot).stdout);
}
function tables(db){
  const code="$db=new PDO('sqlite:'.$argv[1]); echo json_encode($db->query(\"SELECT name FROM sqlite_master WHERE type IN ('table','view','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY name\")->fetchAll(PDO::FETCH_COLUMN));";
  return JSON.parse(run('php',['-r',code,db],{CI:'true'}).stdout);
}
function siteCount(db){
  const code="$db=new PDO('sqlite:'.$argv[1]); echo (string)$db->query('SELECT COUNT(*) FROM stage3_drafts')->fetchColumn();";
  return Number(run('php',['-r',code,db],{CI:'true'}).stdout);
}
function createFirstAndRejectSecond(env,codeRoot){
  const code="require 'server/bootstrap.php';\n"+
    "$repo=stage3_repository();\n"+
    "$site=json_decode(file_get_contents($argv[1]),true);\n"+
    "$site['siteId']=$argv[2];\n"+
    "$repo->createSite($site);\n"+
    "$second=$site;$second['siteId']=$argv[3];\n"+
    "try{$repo->createSite($second);fwrite(STDERR,'second site unexpectedly accepted');exit(3);}\n"+
    "catch(Throwable $error){if(!str_contains($error->getMessage(),'already bound to another site')){fwrite(STDERR,$error->getMessage());exit(4);}echo 'SINGLE_SITE_BOUND';}";
  const result=run('php',['-r',code,fixture,'site-single-first','site-single-second'],env,0,codeRoot);
  assert.equal(result.stdout,'SINGLE_SITE_BOUND');
}

try{
  const db1=createDb('one');
  const codeRoot1=createCodeRoot('cms-one');
  const private1=mkdirPrivate('private-one');
  const public1=fs.realpathSync(path.join(codeRoot1,'server/public'));
  const env1=envFor(db1,private1,public1,'one');

  const beforeHash=crypto.createHash('sha256').update(fs.readFileSync(db1)).digest('hex');
  const dbLockPath=path.join(tmp,'.stage3-install-'+crypto.createHash('sha256').update(db1).digest('hex').slice(0,32)+'.lock');
  assert.equal(fs.existsSync(dbLockPath),false,'read-only plan must not create a database lock file');
  const firstPlan=plan(env1,0,codeRoot1);
  assert.equal(fs.existsSync(dbLockPath),false,'read-only plan must not create a database lock file');
  assert.equal(firstPlan.state,'install_required');
  assert.equal(firstPlan.applyAllowed,true);
  assert.match(firstPlan.token,/^[a-f0-9]{64}$/);
  assert.equal(firstPlan.instanceMode,'single-site');
  const planText=JSON.stringify(firstPlan);
  assert.equal(planText.includes(env1.STAGE3_OWNER_PASSWORD),false);
  assert.equal(planText.includes(env1.STAGE3_FORM_SECRET),false);
  assert.equal(planText.includes(env1.STAGE3_DSN),false);
  assert.equal(fs.existsSync(path.join(private1,'installation.json')),false);
  assert.equal(tables(db1).length,0);
  const afterHash=crypto.createHash('sha256').update(fs.readFileSync(db1)).digest('hex');
  assert.equal(afterHash,beforeHash,'--plan must not mutate the database');

  command(env1,'--apply='+'0'.repeat(64),1,codeRoot1);
  assert.equal(tables(db1).length,0,'invalid approval token must not initialize the database');
  assert.equal(fs.existsSync(path.join(private1,'installation.json')),false);
  assert.equal(fs.existsSync(path.join(private1,'installation.lock')),false,'invalid approval must not create an install lock');

  const applied=JSON.parse(command(env1,'--apply='+firstPlan.token,0,codeRoot1).stdout);
  assert.equal(applied.state,'installed');
  assert.equal(applied.instanceMode,'single-site');
  assert.equal(applied.deploymentPerformed,false);
  assert.equal(fs.existsSync(dbLockPath),true,'apply serializes the selected database');
  assert.equal(fs.statSync(dbLockPath).mode&0o777,0o600);
  assert.match(applied.instanceId,/^[a-f0-9]{32}$/);
  const receiptPath=path.join(private1,'installation.json');
  assert.equal(fs.existsSync(receiptPath),true);
  assert.equal(fs.statSync(receiptPath).mode&0o777,0o600);
  const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
  assert.equal(receipt.instanceId,applied.instanceId);
  assert.equal(receipt.instanceMode,'single-site');
  const receiptText=JSON.stringify(receipt);
  assert.equal(receiptText.includes(env1.STAGE3_OWNER_PASSWORD),false);
  assert.equal(receiptText.includes(env1.STAGE3_FORM_SECRET),false);
  assert.equal(receiptText.includes(env1.STAGE3_DSN),false);
  const configPath=path.join(private1,'config.json');
  const pointerPath=path.join(codeRoot1,'server','private-config-path.json');
  assert.equal(fs.existsSync(configPath),true);
  assert.equal(fs.existsSync(pointerPath),true);
  assert.equal(fs.statSync(configPath).mode&0o777,0o600);
  assert.equal(fs.statSync(pointerPath).mode&0o777,0o600);
  const privateConfig=JSON.parse(fs.readFileSync(configPath,'utf8'));
  assert.equal(privateConfig.values.STAGE3_DSN,env1.STAGE3_DSN);
  assert.equal(privateConfig.values.STAGE3_DB_PASSWORD,env1.STAGE3_DB_PASSWORD);
  assert.equal(receipt.configPath,configPath);
  assert.equal(receipt.configSha256,crypto.createHash('sha256').update(fs.readFileSync(configPath)).digest('hex'));

  const emptyRuntimeEnv={
    CI:'true',STAGE3_DSN:'',STAGE3_DB_USER:'',STAGE3_DB_PASSWORD:'',
    STAGE3_FORM_SECRET:'',STAGE3_FORM_ORIGINS:'',STAGE3_FORM_ENDPOINT:'',
    STAGE3_PRIVATE_DIR:'',STAGE3_PUBLIC_ROOT:''
  };
  const runtimeCode="require 'server/bootstrap.php';stage3_repository();echo json_encode(["+
    "'dsnHash'=>hash('sha256',(string)getenv('STAGE3_DSN')),"+
    "'passwordHash'=>hash('sha256',(string)getenv('STAGE3_DB_PASSWORD')),"+
    "'formHash'=>hash('sha256',(string)getenv('STAGE3_FORM_SECRET')),"+
    "'privateDir'=>getenv('STAGE3_PRIVATE_DIR'),"+
    "'publicRoot'=>getenv('STAGE3_PUBLIC_ROOT')]);";
  const runtime=JSON.parse(run('php',['-r',runtimeCode],emptyRuntimeEnv,0,codeRoot1).stdout);
  assert.equal(runtime.dsnHash,crypto.createHash('sha256').update(env1.STAGE3_DSN).digest('hex'));
  assert.equal(runtime.passwordHash,crypto.createHash('sha256').update(env1.STAGE3_DB_PASSWORD).digest('hex'));
  assert.equal(runtime.formHash,crypto.createHash('sha256').update(env1.STAGE3_FORM_SECRET).digest('hex'));
  assert.equal(runtime.privateDir,private1);
  assert.equal(runtime.publicRoot,public1);
  const persistedPlan=JSON.parse(run('php',[path.join(codeRoot1,'server/bin/install.php'),'--plan'],emptyRuntimeEnv,0,codeRoot1).stdout);
  assert.equal(persistedPlan.state,'already_installed');
  assert.equal(persistedPlan.checks.ownerCredentials.required,false);

  const installedPlan=plan(env1,0,codeRoot1);
  assert.equal(installedPlan.state,'already_installed');
  assert.equal(installedPlan.applyAllowed,false);
  assert.equal(installedPlan.instanceId,applied.instanceId);
  assert.equal(installedPlan.checks.schemaIntegrity.ok,true);
  assert.equal(installedPlan.checks.schemaIntegrity.requiredTableCount,25);
  assert.deepEqual(installedPlan.checks.schemaIntegrity.missingTables,[]);
  assert.equal(installedPlan.checks.databaseServerVersion.applicable,false);

  const receiptBytes=fs.readFileSync(receiptPath);
  const receiptLink=receiptPath+'.hardlink';
  fs.linkSync(receiptPath,receiptLink);
  const linkedReceiptPlan=plan(env1,1,codeRoot1);
  assert.equal(linkedReceiptPlan.state,'blocked','receipt hard links must be rejected');
  fs.unlinkSync(receiptLink);
  fs.writeFileSync(receiptPath,Buffer.concat([receiptBytes,Buffer.from(' ')]));
  const nonCanonicalReceiptPlan=plan(env1,1,codeRoot1);
  assert.equal(nonCanonicalReceiptPlan.state,'blocked','non-canonical receipt JSON must be rejected');
  fs.writeFileSync(receiptPath,receiptBytes);
  assert.equal(plan(env1,0,codeRoot1).state,'already_installed');

  command(env1,'--apply='+firstPlan.token,1,codeRoot1);
  createFirstAndRejectSecond(env1,codeRoot1);
  assert.equal(siteCount(db1),1);

  const db2=createDb('two');
  const codeRoot2=createCodeRoot('cms-two');
  const private2=mkdirPrivate('private-two');
  const public2=fs.realpathSync(path.join(codeRoot2,'server/public'));
  const env2=envFor(db2,private2,public2,'two');
  const secondPlan=plan(env2,0,codeRoot2);
  const secondApplied=JSON.parse(command(env2,'--apply='+secondPlan.token,0,codeRoot2).stdout);
  assert.notEqual(secondApplied.instanceId,applied.instanceId,'separate database installs must have independent instance identities');
  const secondSiteCode="require 'server/bootstrap.php';\n"+
    "$repo=stage3_repository();$site=json_decode(file_get_contents($argv[1]),true);\n"+
    "$site['siteId']='site-single-first';$repo->createSite($site);echo 'SECOND_INSTANCE_ACCEPTED';";
  const secondSite=run('php',['-r',secondSiteCode,fixture],env2,0,codeRoot2);
  assert.equal(secondSite.stdout,'SECOND_INSTANCE_ACCEPTED');
  assert.equal(siteCount(db1),1);
  assert.equal(siteCount(db2),1);
  run('php',['-r','$db=new PDO("sqlite:".$argv[1]);$db->exec("DROP TABLE stage3_visual_findings");',db1],{CI:'true'});
  const incomplete=plan(env1,1,codeRoot1);
  assert.equal(incomplete.state,'blocked');
  assert.equal(incomplete.checks.schemaIntegrity.ok,false);
  assert.ok(incomplete.checks.schemaIntegrity.missingTables.includes('stage3_visual_findings'));

  const db3=createDb('non-empty');
  run('php',['-r','$db=new PDO("sqlite:".$argv[1]);$db->exec("CREATE TABLE foreign_data(id INTEGER PRIMARY KEY)");',db3],{CI:'true'});
  const codeRoot3=createCodeRoot('cms-three');
  const private3=mkdirPrivate('private-three');
  const public3=fs.realpathSync(path.join(codeRoot3,'server/public'));
  const blocked=plan(envFor(db3,private3,public3,'three'),1,codeRoot3);
  assert.equal(blocked.state,'blocked');
  assert.equal(blocked.applyAllowed,false);
  assert.ok(blocked.errors.some(x=>x.includes('not empty')));
  assert.equal(fs.existsSync(path.join(private3,'installation.json')),false);

  const db4=createDb('nested');
  const codeRoot4=createCodeRoot('cms-four');
  const public4=fs.realpathSync(path.join(codeRoot4,'server/public'));
  const privateNested=path.join(public4,'private');
  fs.mkdirSync(privateNested,{mode:0o700});
  fs.chmodSync(privateNested,0o700);
  const nested=plan(envFor(db4,privateNested,public4,'four'),1,codeRoot4);
  assert.equal(nested.state,'blocked');
  assert.ok(nested.errors.some(x=>x.includes('non-nested')));

  process.stdout.write(JSON.stringify({
    ok:true,
    checks:[
      'read-only installation plan and exact approval token',
      'no credentials or DSN in plan/receipt',
      'private runtime configuration persisted outside docroot and loaded by a fresh PHP process',
      'MySQL version gate and full installed schema inventory',
      'canonical private receipt and hard-link tamper rejection',
      'single-site database binding',
      'independent second installation and database',
      'non-empty database refused without mutation',
      'private directory must be outside public document root',
      'repeat installation and stale token refused'
    ],
    instanceIds:[applied.instanceId,secondApplied.instanceId],
    deploymentPerformed:false
  },null,2)+'\n');
}catch(error){
  process.stderr.write((error.stack||error.message)+'\n');
  process.exitCode=1;
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
