#!/usr/bin/env node
// Offline adversarial wrapper checks. A fake Node-backed "PHP" MUST NEVER be
// described as a genuinely extension-free PHP runtime; tests only gating.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cms-fake-php-proof-'));
const fake=path.join(tmp,'fake-php.cjs');
let count=0;
const check=(v,label)=>{assert.ok(v,label);count++;console.log('PASS RUNTIME PROOF '+label);};
const code=`#!/usr/bin/env node
const args=process.argv.slice(2), env=process.env;
if(args.includes('-r')){
  if(env.FAKE_PHP_JSON==='bad')process.stdout.write('this is not PHP JSON');
  else if(args[0]==='-n'&&args[1]==='-r'&&args[2]?.includes('json_encode')){
    process.stdout.write(JSON.stringify({version:env.FAKE_PHP_VERSION||'8.3.15',
      size:Number(env.FAKE_PHP_SIZE||8),ext:env.FAKE_PHP_EXT==='true',
      verify:env.FAKE_PHP_VERIFY==='true',sapi:env.FAKE_PHP_SAPI||'cli'}));
  }else process.stdout.write(env.FAKE_PHP_EXT==='true'?'native':'no-native');
  process.exit(0);
}
if(args.some(x=>x.endsWith('/ed25519-lab.php'))){
  if(env.FAKE_PHP_ABSENT_OUTPUT==='realistic')
    process.stdout.write('PASS strict backend availability\nPASS missing backend fails closed\nNO_CRYPTO_TEST: absent mode correctly rejects all signatures\n');
  else if(env.FAKE_PHP_ABSENT_OUTPUT==='partial')
    process.stdout.write('PASS missing backend fails closed\n');
  process.exit(0);
}
if(args.some(x=>x.endsWith('/release-verify-runner.php'))){
  process.stderr.write('simulated no backend rejection\n');
  process.exit(1);
}
process.exit(2);
`;
function run(env={},args=[]){
  const r=cp.spawnSync(process.execPath,[path.join(root,'runtime-sodium-proof.mjs'),...args],{
    encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024,
    env:{...process.env,PHP_NO_SODIUM_BIN:fake,SODIUM_COMPAT_AUTOLOAD:'',
      SODIUM_COMPAT_LOCK:'',SODIUM_COMPAT_TREE_SHA256:'',...env}
  });
  assert.equal(r.error,undefined,String(r.error));
  return {...r,report:JSON.parse(r.stdout)};
}
try{
  fs.writeFileSync(fake,code,{mode:0o700});
  const absent=run({PHP_NO_SODIUM_BIN:''});
  check(absent.status===3&&!absent.report.nativeFreeProven&&!absent.report.compatVerified,
    'missing absolute PHP binary blocks');
  const nonexistent=run({PHP_NO_SODIUM_BIN:path.join(tmp,'nonexistent')});
  check(nonexistent.status===3&&!nonexistent.report.nativeFreeProven,
    'unavailable PHP runtime blocks');
  check(run({PHP_NO_SODIUM_BIN:'./php'}).status===3,'relative runtime path blocks');
  check(run({FAKE_PHP_VERSION:'8.4.24'}).status===3,'PHP 8.4 refused as non-target runtime');
  check(run({FAKE_PHP_VERSION:'8.3.15',FAKE_PHP_SIZE:'4'}).status===3,
    '32-bit PHP refused');
  check(run({FAKE_PHP_VERSION:'8.3.15',FAKE_PHP_EXT:'true'}).status===3,
    'native sodium extension refused');
  check(run({FAKE_PHP_VERSION:'8.3.15',FAKE_PHP_VERIFY:'true'}).status===3,
    'pre-existing global verify function refused');
  check(run({FAKE_PHP_SAPI:'fpm-fcgi'}).status===3,
    'non-CLI runtime classification refused');
  const corrupt=run({FAKE_PHP_JSON:'bad'});
  check(corrupt.status===2&&!corrupt.report.nativeFreeProven,
    'malformed runtime report not accepted');
  const forged=run();
  check(forged.status===1&&forged.report.tests[0]?.passed===false,
    'zero exit without crypto proof lines is not PASS');
  check(forged.report.compatVerified===false,
    'malformed native-free proof cannot reach compat');
  const partial=run({FAKE_PHP_ABSENT_OUTPUT:'partial'});
  check(partial.status===1&&partial.report.tests[0]?.proofCompleted===false,
    'single PASS line is insufficient for RFC failure proof');
  const claims=run({FAKE_PHP_ABSENT_OUTPUT:'realistic'});
  check(claims.status===3&&claims.report.tests.length===2&&
    claims.report.tests.every(x=>x.passed&&x.proofCompleted)&&!claims.report.compatVerified,
    'synthetic signed-envelope/absent outputs only reach missing-source block');
  const fakeAutoload=path.join(tmp,'autoload.php');
  fs.writeFileSync(fakeAutoload,'<?php // fake and not attested');
  const untrusted=run({FAKE_PHP_ABSENT_OUTPUT:'realistic',SODIUM_COMPAT_AUTOLOAD:fakeAutoload});
  check(untrusted.status===3&&!untrusted.report.compatVerified&&
    untrusted.report.message.includes('source provenance unavailable'),
    'attestation rejects arbitrary autoload.php after absent proof');
  check(run({},['--extra']).status===2,'unexpected arguments blocked');
  console.log('Sodium-free wrapper false-pass offline regression PASS '+count+
    ' assertions; fake binary only, NOT native-free PHP evidence');
}finally{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:2});}
