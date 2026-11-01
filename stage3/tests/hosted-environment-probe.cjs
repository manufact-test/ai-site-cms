#!/usr/bin/env node
'use strict';

// Read-only Hostinger PHP CLI capability probe. No database, secrets, or host writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'../..');
const runner=path.join(root,'stage3/server/bin/hosted-install-runner.php');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-host-cli-probe-'));
const secretValues=[
  'probe-private-dsn-sentinel',
  'probe-db-password-sentinel',
  'probe-owner-password-sentinel',
  'probe-form-secret-sentinel'
];
const env={
  ...process.env,
  TMPDIR:tmp,
  STAGE3_DSN:secretValues[0],
  STAGE3_DB_PASSWORD:secretValues[1],
  STAGE3_OWNER_PASSWORD:secretValues[2],
  STAGE3_FORM_SECRET:secretValues[3]
};
function run(args,expected){
  const result=spawnSync('php',args,{cwd:root,env,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
  if(result.error)throw result.error;
  assert.equal(result.status,expected,'php '+args.join(' ')+' failed\n'+(result.stderr||'')+'\n'+(result.stdout||''));
  return result;
}
try{
  const ready=JSON.parse(run([runner,'--probe'],0).stdout);
  assert.equal(ready.format,'manufact-stage3-hosted-environment-probe-v1');
  assert.equal(ready.action,'environment_probe');
  assert.equal(ready.status,'cli_ready_for_private_plan');
  assert.equal(ready.cliPrerequisitesPassed,true);
  assert.equal(ready.php.sapi,'cli');
  assert.equal(ready.scope.cliOnly,true);
  assert.equal(ready.scope.databaseChecked,false);
  assert.equal(ready.scope.webPhpSapiChecked,false);
  assert.equal(ready.scope.accountWebRootsChecked,false);
  assert.equal(ready.scope.privateDirectoryChecked,false);
  assert.equal(ready.scope.credentialsRead,false);
  assert.equal(ready.scope.filesystemWritesPerformed,false);
  assert.deepEqual(ready.blockers,[]);
  for(const secret of secretValues)assert.equal(JSON.stringify(ready).includes(secret),false);
  assert.deepEqual(fs.readdirSync(tmp),[],'probe must not create temporary files');

  const stripped=spawnSync('php',['-n',runner,'--probe'],{cwd:root,env:{...env,TMPDIR:tmp},encoding:'utf8',timeout:15000});
  assert.equal(stripped.status,1,'stripped PHP CLI must fail closed');
  const blocked=JSON.parse(stripped.stdout);
  assert.equal(blocked.status,'blocked');
  assert.equal(blocked.cliPrerequisitesPassed,false);
  assert.ok(blocked.blockers.some(x=>x.includes('pdo_mysql')||x.includes('PDO MySQL')));
  for(const secret of secretValues)assert.equal(JSON.stringify(blocked).includes(secret),false);
  assert.deepEqual(fs.readdirSync(tmp),[],'blocked probe must also remain read-only');

  process.stdout.write(JSON.stringify({
    action:'hosted-environment-probe-smoke',
    fullPhpCliReady:true,
    strippedPhpCliRejected:true,
    credentialsNeverReadOrEchoed:true,
    noFilesystemWrites:true
  })+'\n');
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
