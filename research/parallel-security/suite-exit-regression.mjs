#!/usr/bin/env node
// Tests security suite exit-code semantics in a disposable, dependency-free
// checkout. A requested --online scan must not succeed when lockfiles are absent.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';

const source=path.join(path.dirname(fileURLToPath(import.meta.url)),'run-security-suite.mjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cms-suite-exit-'));
const dir=path.join(tmp,'research/parallel-security');
let checks=0;
function check(ok,label){assert.ok(ok,label);checks++;console.log('PASS SUITE '+label);}
function execute(args=[]){
  const result=cp.spawnSync(process.execPath,[path.join(dir,'run-security-suite.mjs'),...args],{
    encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024,
    env:{...process.env,PHP_BINARY:path.join(tmp,'fake-php.cjs')}
  });
  assert.equal(result.error,undefined,String(result.error));
  return result;
}
function read(result){return JSON.parse(result.stdout);}
try{
  fs.mkdirSync(dir,{recursive:true});
  fs.copyFileSync(source,path.join(dir,'run-security-suite.mjs'));
  fs.copyFileSync(path.join(path.dirname(source),'online-evidence-proof.mjs'),
    path.join(dir,'online-evidence-proof.mjs'));
  fs.writeFileSync(path.join(tmp,'fake-php.cjs'),
    '#!/usr/bin/env node\nprocess.stdout.write(process.argv.includes("-n")?"native":"absent");\n',
    {mode:0o700});
  const scripts={
    'policy-regression.mjs':'policy synthetic fixture',
    'provenance-regression.mjs':'provenance synthetic fixture',
    'notice-regression.mjs':'notice synthetic fixture',
    'osv-strict-regression.mjs':'OSV strict-response + transport + lock fixture PASS 30 cases;',
    'osv-cli-regression.mjs':'OSV exact CLI offline subprocess regression PASS 23 assertions; no HTTP requests, no live audit',
    'suite-exit-regression.mjs':'Security suite exit-policy offline regression PASS 12 assertions; no OSV network, PHP or installed dependencies',
    'sodium-compat-attest-regression.mjs':'Sodium compat independent source attestation offline regression PASS 20 assertions; synthetic files, NOT actual upstream approval',
    'online-evidence-regression.mjs':'Online OSV and registry evidence offline regression PASS 40 assertions; synthetic data only, no live OSV lookup or production approval',
    'runtime-sodium-proof-regression.mjs':'Sodium-free wrapper false-pass offline regression PASS 15 assertions; fake binary only, NOT native-free PHP evidence'
  };
  for(const [name,msg] of Object.entries(scripts))
    fs.writeFileSync(path.join(dir,name),'console.log('+JSON.stringify(msg)+');\n');
  const offline=execute();
  check(offline.status===0,'optional offline blocks retain compatible zero exit');
  const o=read(offline);
  check(o.counts.failed===0&&o.counts.blocked>0&&o.complete===false,
    'offline incomplete scope is visibly reported');
  check(o.stage2Accepted===false&&o.productionApproved===false&&o.licenseApproved===false,
    'offline run never grants production or legal acceptance');
  const strict=execute(['--strict']);
  check(strict.status===3&&read(strict).complete===false,'strict offline blocks fail with exit three');
  const online=execute(['--online']);
  const onlineReport=read(online);
  check(online.status===3,'requested online scan cannot silently pass without locks');
  check(onlineReport.online===true&&onlineReport.onlineComplete===false,
    'online status explicitly reports incomplete coverage');
  check(onlineReport.results.some(x=>x.name==='online:OSV-strict43'&&x.status==='blocked'),
    '43-version exact OSV gate is visibly blocked');
  check(onlineReport.results.some(x=>x.name==='online:version-registry'&&x.status==='blocked'),
    'online registry freshness gate is visibly blocked');
  check(execute(['--online','--strict']).status===3,
    'combined online and strict options fail closed');
  check(execute(['--invalid']).status===2,'invalid CLI option returns usage failure');
  fs.writeFileSync(path.join(dir,'policy-regression.mjs'),'process.exit(7);\n');
  const failed=execute(['--online']);
  check(failed.status===1&&read(failed).counts.failed>0,
    'executed fixture failure outranks incomplete coverage');
  check(failed.stderr.includes('INDEPENDENT_SECURITY_SUITE_FAILURE'),
    'failed checks emit bounded CI diagnostics');
  console.log('Security suite exit-policy offline regression PASS '+checks+' assertions; no OSV network, PHP or installed dependencies');
}finally{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:2});}
