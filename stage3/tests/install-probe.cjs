#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'../..');
const installer=path.join(root,'stage3/server/bin/install.php');
const fixture=path.join(root,'stage3/fixtures/industrial-site.json');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-install-probe-'));

function run(command,args,env={},expected=0){
  const result=spawnSync(command,args,{cwd:root,env:{...process.env,...env},encoding:'utf8',timeout:90000});
  if(result.error)throw result.error;
  if(result.status!==expected){
    throw new Error(command+' '+args.join(' ')+' exit '+result.status+' expected '+expected+'\n'+(result.stderr||'')+'\n'+(result.stdout||''));
  }
  return result;
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
function command(env,action,expected=0){
  return run('php',[installer,action],env,expected);
}
function plan(env,expected=0){
  return JSON.parse(command(env,'--plan',expected).stdout);
}
function tables(db){
  const code="$db=new PDO('sqlite:'.$argv[1]); echo json_encode($db->query(\"SELECT name FROM sqlite_master WHERE type IN ('table','view','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY name\")->fetchAll(PDO::FETCH_COLUMN));";
  return JSON.parse(run('php',['-r',code,db],{CI:'true'}).stdout);
}
function siteCount(db){
  const code="$db=new PDO('sqlite:'.$argv[1]); echo (string)$db->query('SELECT COUNT(*) FROM stage3_drafts')->fetchColumn();";
  return Number(run('php',['-r',code,db],{CI:'true'}).stdout);
}
function createFirstAndRejectSecond(env){
  const code="require 'stage3/server/bootstrap.php';\n"+
    "$repo=stage3_repository();\n"+
    "$site=json_decode(file_get_contents($argv[1]),true);\n"+
    "$site['siteId']=$argv[2];\n"+
    "$repo->createSite($site);\n"+
    "$second=$site;$second['siteId']=$argv[3];\n"+
    "try{$repo->createSite($second);fwrite(STDERR,'second site unexpectedly accepted');exit(3);}\n"+
    "catch(Throwable $error){if(!str_contains($error->getMessage(),'already bound to another site')){fwrite(STDERR,$error->getMessage());exit(4);}echo 'SINGLE_SITE_BOUND';}";
  const result=run('php',['-r',code,fixture,'site-single-first','site-single-second'],env);
  assert.equal(result.stdout,'SINGLE_SITE_BOUND');
}

try{
  const db1=createDb('one');
  const private1=mkdirPrivate('private-one');
  const public1=mkdirPublic('public-one');
  const env1=envFor(db1,private1,public1,'one');

  const beforeHash=crypto.createHash('sha256').update(fs.readFileSync(db1)).digest('hex');
  const firstPlan=plan(env1);
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

  command(env1,'--apply='+'0'.repeat(64),1);
  assert.equal(tables(db1).length,0,'invalid approval token must not initialize the database');
  assert.equal(fs.existsSync(path.join(private1,'installation.json')),false);
  assert.equal(fs.existsSync(path.join(private1,'installation.lock')),false,'invalid approval must not create an install lock');

  const applied=JSON.parse(command(env1,'--apply='+firstPlan.token).stdout);
  assert.equal(applied.state,'installed');
  assert.equal(applied.instanceMode,'single-site');
  assert.equal(applied.deploymentPerformed,false);
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

  const installedPlan=plan(env1);
  assert.equal(installedPlan.state,'already_installed');
  assert.equal(installedPlan.applyAllowed,false);
  assert.equal(installedPlan.instanceId,applied.instanceId);
  command(env1,'--apply='+firstPlan.token,1);
  createFirstAndRejectSecond(env1);
  assert.equal(siteCount(db1),1);

  const db2=createDb('two');
  const private2=mkdirPrivate('private-two');
  const public2=mkdirPublic('public-two');
  const env2=envFor(db2,private2,public2,'two');
  const secondPlan=plan(env2);
  const secondApplied=JSON.parse(command(env2,'--apply='+secondPlan.token).stdout);
  assert.notEqual(secondApplied.instanceId,applied.instanceId,'separate database installs must have independent instance identities');
  const secondSiteCode="require 'stage3/server/bootstrap.php';\n"+
    "$repo=stage3_repository();$site=json_decode(file_get_contents($argv[1]),true);\n"+
    "$site['siteId']='site-single-first';$repo->createSite($site);echo 'SECOND_INSTANCE_ACCEPTED';";
  const secondSite=run('php',['-r',secondSiteCode,fixture],env2);
  assert.equal(secondSite.stdout,'SECOND_INSTANCE_ACCEPTED');
  assert.equal(siteCount(db1),1);
  assert.equal(siteCount(db2),1);

  const db3=createDb('non-empty');
  run('php',['-r','$db=new PDO("sqlite:".$argv[1]);$db->exec("CREATE TABLE foreign_data(id INTEGER PRIMARY KEY)");',db3],{CI:'true'});
  const private3=mkdirPrivate('private-three');
  const public3=mkdirPublic('public-three');
  const blocked=plan(envFor(db3,private3,public3,'three'),1);
  assert.equal(blocked.state,'blocked');
  assert.equal(blocked.applyAllowed,false);
  assert.ok(blocked.errors.some(x=>x.includes('not empty')));
  assert.equal(fs.existsSync(path.join(private3,'installation.json')),false);

  const db4=createDb('nested');
  const public4=mkdirPublic('public-four');
  const privateNested=path.join(public4,'private');
  fs.mkdirSync(privateNested,{mode:0o700});
  fs.chmodSync(privateNested,0o700);
  const nested=plan(envFor(db4,privateNested,public4,'four'),1);
  assert.equal(nested.state,'blocked');
  assert.ok(nested.errors.some(x=>x.includes('non-nested')));

  process.stdout.write(JSON.stringify({
    ok:true,
    checks:[
      'read-only installation plan and exact approval token',
      'no credentials or DSN in plan/receipt',
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
