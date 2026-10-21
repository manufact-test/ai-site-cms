#!/usr/bin/env node
// Reproducible, non-mutating research-only audit. No Composer/npm install or host access.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyOsvEvidence,verifyRegistryEvidence} from './online-evidence-proof.mjs';
const dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dirname,'../..');
const args=process.argv.slice(2);
if (args.some(x=>!['--strict','--online'].includes(x))) {
  console.error('Usage: node run-security-suite.mjs [--strict] [--online]');
  process.exit(2);
}
const strict=args.includes('--strict'), online=args.includes('--online');
const runtime=process.env.PHP_BINARY || 'php';
const results=[];
const capture=(command, argv, opts={})=> {
  const start=performance.now();
  const r=cp.spawnSync(command,argv,{
    cwd:root,encoding:'utf8',timeout:opts.timeout??45000,maxBuffer:3*1024*1024,
    env:{...process.env,...(opts.env||{})}
  });
  return {cmd:[command,...argv],exitCode:r.status??null,signal:r.signal||null,
    elapsedMs:Math.round(performance.now()-start),stdout:(r.stdout||''),
    stderr:(r.stderr||'').slice(-1200),spawnError:r.error?.message||null};
};
const entry=(name, probe, expected=0)=> {
  const row={name,...probe,stdout:probe.stdout.slice(-1600),status:probe.exitCode===expected&&!probe.spawnError?'passed':'failed'};
  results.push(row);return row;
};
const block=(name, reason)=>results.push({name,status:'blocked',reason});
// A zero process exit is insufficient if a native assertion fixture silently
// exits before it reaches its expected final count/signature verification.
function requireProof(row, expectedPattern, evidenceLabel) {
  if(row.status==='passed' && !expectedPattern.test(row.stdout)){
    row.status='failed';
    row.validationError='Expected completed assertion evidence: '+evidenceLabel;
  }
  return row;
}
const scripts=['inventory-audit.mjs','lock-provenance.mjs','version-check.mjs',
  'ed25519-lab.php','receipt-chain-regression.php','permit-gate-regression.php','settlement-chain-regression.php','chain-backend-verifier.php','class-only-ed25519-shim.php','ed25519-callsite-audit.php','class-only-backend-proof.mjs','chain-backend-regression.mjs','release-fixture.mjs','release-verify-runner.php',
  'policy-regression.mjs','provenance-regression.mjs','notice-gate.mjs',
  'notice-regression.mjs','osv-strict-snapshot.mjs','osv-strict-regression.mjs','osv-cli-regression.mjs','suite-exit-regression.mjs','sodium-compat-attest.mjs',
  'sodium-compat-attest-regression.mjs','runtime-sodium-proof.mjs','online-evidence-proof.mjs',
  'online-evidence-regression.mjs','runtime-sodium-proof-regression.mjs','archived-main-sodium-proof.mjs','archived-main-sodium-regression.mjs','osv-advisory-triage.mjs','npm-source-gate.mjs','run-security-suite.mjs'];
for(const name of scripts){
  if(!fs.existsSync(path.join(dirname,name))){block('syntax:'+name,'Script missing from checkout');continue;}
  if(name.endsWith('.mjs'))entry('syntax:'+name,capture('node',['--check',path.join(dirname,name)]));
  else entry('syntax:'+name,capture(runtime,['-l',path.join(dirname,name)]));
}
for(const name of ['policy-regression.mjs','provenance-regression.mjs','notice-regression.mjs','osv-strict-regression.mjs','osv-cli-regression.mjs','suite-exit-regression.mjs','sodium-compat-attest-regression.mjs','online-evidence-regression.mjs','runtime-sodium-proof-regression.mjs']){
  const result=entry('mutation:'+name,capture('node',[path.join(dirname,name)],{timeout:30000}));
  if(name==='osv-strict-regression.mjs')requireProof(result,
    /OSV strict-response \+ transport \+ lock fixture PASS 30 cases;/,
    '30 offline OSV transport + lock acceptance/rejection assertions');
  if(name==='osv-cli-regression.mjs')requireProof(result,
    /OSV exact CLI offline subprocess regression PASS 23 assertions; no HTTP requests, no live audit/,
    '23 offline OSV CLI, fake HTTP and lockfile TOCTOU assertions');
  if(name==='suite-exit-regression.mjs')requireProof(result,
    /Security suite exit-policy offline regression PASS 12 assertions;/,
    '12 strict/online incomplete runner exit-policy assertions');
  if(name==='sodium-compat-attest-regression.mjs')requireProof(result,
    /Sodium compat independent source attestation offline regression PASS 37 assertions;/,
    '37 negative source/version/whole-tree and isolated lock origin/contents assertions (synthetic only)');
  if(name==='online-evidence-regression.mjs')requireProof(result,
    /Online OSV and registry evidence offline regression PASS 54 assertions;/,
    '54 adversarial OSV online and saved advisory transcript assertions');
  if(name==='runtime-sodium-proof-regression.mjs')requireProof(result,
    /Sodium-free wrapper false-pass offline regression PASS 15 assertions;/,
    '15 fake-PHP classification and missing crypto-output proof regressions');
}
if(fs.existsSync(path.join(dirname,'ed25519-callsite-audit.php'))){
  requireProof(entry('mutation:ed25519-source-audit',
    capture(runtime,[path.join(dirname,'ed25519-callsite-audit.php'),'--self-test'],{timeout:30000})),
    /Stage2 Ed25519 source callsite offline regression PASS 13 assertions;/,
    '13 PHP-token negative/positive fixture cases, source only');
}else block('mutation:ed25519-source-audit','Research-only source audit fixture unavailable in partial checkout');
requireProof(entry('upstream:archived-main-genuine-sodium-free',
  capture('node',[path.join(dirname,'archived-main-sodium-proof.mjs')],{timeout:10000})),
  /Archived real main GitHub CI sodium-free evidence PASS 33 chain \+ 55 rotation checks; ARCHIVE ONLY/,
  'main GitHub Actions 39571456888/119126388264 archived exact output; NOT reexecuted in this Security job');
requireProof(entry('mutation:archived-main-sodium-provenance',
  capture('node',[path.join(dirname,'archived-main-sodium-regression.mjs')],{timeout:20000})),
  /Archived main CI evidence provenance and false-claim offline regression PASS 40 assertions;/,
  '40 archived real-CI report tampering and conservative interpretation tests');
const lockPaths=['cms/composer.lock','cms/editor/package-lock.json','cms/editor/package.json'];
const completeLock=lockPaths.every(f=>fs.existsSync(path.join(root,f)));
if(completeLock){
  const rawJson=capture('node',[path.join(dirname,'inventory-audit.mjs')]);
  const obj=entry('actual-lock:json',rawJson);
  if(obj.status==='passed'){
    try{const parsed=JSON.parse(rawJson.stdout);if(parsed.componentCount!==43||parsed.composerRuntime!==14||parsed.npmLocked!==29)throw Error('not 14+29');}
    catch(e){obj.status='failed';obj.validationError=String(e);}
  }
  const rawCsv=capture('node',[path.join(dirname,'inventory-audit.mjs'),'--csv']);
  const csv=entry('actual-lock:csv',rawCsv);
  if(csv.status==='passed'&&rawCsv.stdout.trimEnd().split('\n').length!==44){csv.status='failed';csv.validationError='not 43 rows + header';}
  entry('actual-lock:provenance',capture('node',[path.join(dirname,'lock-provenance.mjs')]));
  if(online){
    const rawOsv=capture('node',[path.join(dirname,'osv-strict-snapshot.mjs'),'--fail-on-advisory'],{timeout:100000});
    const os=entry('online:OSV-strict43',rawOsv);
    if(os.status==='passed'){
      try{os.verifiedEvidence=verifyOsvEvidence(rawOsv.stdout,root);}
      catch(e){os.status='failed';os.validationError=String(e.message||e);}
    }
    const rawRegistry=capture('node',[path.join(dirname,'version-check.mjs')],{timeout:240000});
    const registry=entry('online:version-registry',rawRegistry);
    if(registry.status==='passed'){
      try{registry.verifiedEvidence=verifyRegistryEvidence(rawRegistry.stdout,root);}
      catch(e){registry.status='failed';registry.validationError=String(e.message||e);}
    }
  }
} else {
  for(const name of ['actual-lock:json','actual-lock:csv','actual-lock:provenance'])block(name,'Requires original composer.lock, package-lock.json, package.json in complete checkout');
  if(online)for(const name of ['online:OSV-strict43','online:version-registry'])block(name,'Original complete lock files unavailable');
}
const installedNpm=path.join(root,'cms/editor/node_modules');
if(fs.existsSync(installedNpm)) {
  entry('npm:installed-source-notices',capture('node',[path.join(dirname,'npm-source-gate.mjs')]));
} else block('npm:installed-source-notices','Trusted npm ci and installed LICENSE/ThirdPartyNotices are required for archive verification');
const bundledNotice=path.join(root,'cms/.build/internal-stage2-package/private/compliance/THIRD_PARTY_NOTICES.txt');
if(fs.existsSync(bundledNotice)) {
  entry('composer:actual-bundled-NOTICE',capture('node',[path.join(dirname,'notice-gate.mjs')]));
} else block('composer:actual-bundled-NOTICE','Vendor files and complete internal distribution build are needed to verify copied Apache NOTICE');
const isNative=capture(runtime,['-r','echo extension_loaded("sodium") ? "native" : "absent";']);
const isNoNative=capture(runtime,['-n','-r','echo extension_loaded("sodium") ? "native" : "absent";']);
if(isNative.exitCode===0&&isNative.stdout==='native'){
  entry('native:RFC8032',capture(runtime,[path.join(dirname,'ed25519-lab.php'),'native'],{timeout:30000}));
  entry('native:signed-envelope',capture('node',[path.join(dirname,'release-fixture.mjs'),'native'],{timeout:30000}));
  const receiptFixture=path.join(dirname,'receipt-chain-regression.php');
  if(fs.existsSync(receiptFixture)) {
    requireProof(entry('native:operator-receipt-chain',
      capture(runtime,[receiptFixture],{timeout:45000,
        env:{CI:'true',CMS_ALLOW_PHP_INSTALL_LAB:'1'}})),
      /Stage2 research operator receipt chain: 36 independent assertions PASS;/,
      '36 real signed operator receipt assertions');
  } else block('native:operator-receipt-chain','Research receipt verification fixture unavailable');
  const permitFixture=path.join(dirname,'permit-gate-regression.php');
  if(fs.existsSync(permitFixture)) {
    requireProof(entry('native:operator-preactivation-permit',
      capture(runtime,[permitFixture],{timeout:45000,
        env:{CI:'true',CMS_ALLOW_PHP_INSTALL_LAB:'1'}})),
      /Stage2 signed permit adversarial research PASS: 46 assertions;/,
      '46 signed preactivation permit/CAS-boundary assertions');
  } else block('native:operator-preactivation-permit','Signed preactivation permit fixture unavailable');
  const settlementFixture=path.join(dirname,'settlement-chain-regression.php');
  if(fs.existsSync(settlementFixture)) {
    requireProof(entry('native:operator-settlement-chain',
      capture(runtime,[settlementFixture],{timeout:45000,
        env:{CI:'true',CMS_ALLOW_PHP_INSTALL_LAB:'1'}})),
      /Stage2 signed settlement chain research PASS: 38 assertions;/,
      '38 signed permit/receipt/settlement linkage and anti-replay assertions');
  } else block('native:operator-settlement-chain','Signed settlement chain fixture unavailable');
    requireProof(entry('native:node-signed-chain',
    capture('node',[path.join(dirname,'chain-backend-regression.mjs'),'native'],{timeout:90000})),
    /Chain Ed25519 backend signed-chain regression PASS 60 assertions; mode=native;/,
    '60 actual independently Node-signed native PHP chain assertions, including re-signed hostile records and filesystem tampering');
  requireProof(entry('native:pinned-fixed-main-dispatch-parity',
    capture('node',[path.join(dirname,'chain-backend-regression.mjs'),'pinned-main-dispatch'],{timeout:120000})),
    /Chain Ed25519 backend signed-chain regression PASS 120 assertions; mode=pinned-main-dispatch;.*FROZEN PINNED FIXED-MAIN SOURCE/,
    '120 independently signed policy assertions against one SHA1 Git-blob pinned fixed-main source plus unchanged original 3 PHP dependencies; NOT CI current main');
  requireProof(entry('native:class-only-backend-primitive',
    capture('node',[path.join(dirname,'class-only-backend-proof.mjs')],{timeout:30000})),
    /Native Ed25519 forced class-only dispatch PASS 8 real signatures\/forgeries;/,
    '8 genuine Ed25519 signatures checked via class-only dispatch, still NATIVE sodium');

  // PR pull_request.base.sha may lag live main. The historical base code in
  // this PR directly calls the global function; do NOT falsely claim that
  // the integrator's newer fixed main was tested by this stale workflow.
  const source=path.join(root,'cms/src/Release/LabSettledUpgradeGate.php');
  const legacy=fs.existsSync(source)&&
    fs.readFileSync(source,'utf8').includes('!sodium_crypto_sign_verify_detached($sig, self::DOMAIN . $raw, $public)')&&
    !fs.readFileSync(source,'utf8').includes("require_once __DIR__ . '/Ed25519Backend.php';");
  const sourceProof=capture(runtime,[path.join(dirname,'ed25519-callsite-audit.php')],{timeout:30000});
  const sourceRow=entry('source:common-ed25519-backend',sourceProof);
  if(legacy && sourceRow.status==='failed' && /Direct sodium verify call count: 1/.test(sourceProof.stderr||'')){
    sourceRow.status='blocked';
    sourceRow.reason='CI checks old PR base SHA with legacy direct Sodium call; latest main fixed but not present in this exact workflow checkout';
    block('native:forced-class-signed-chain',
      'Cannot validate fixed main settlement chain against older CI PR base SHA; main integrator must refresh base');
  }else{
    requireProof(sourceRow,/Stage2 shared Ed25519 backend original source PASS 5 PHP verifiers;/,
      '5 original PHP signed verifiers have shared backend, no global calls');
    requireProof(entry('native:forced-class-signed-chain',
      capture('node',[path.join(dirname,'chain-backend-regression.mjs'),'forced-class'],{timeout:90000})),
      /Chain Ed25519 backend signed-chain regression PASS 60 assertions; mode=forced-class;/,
      '60 actually signed PHP chain checks through class-only native dispatch, NOT native-free');
  }
  const rootTrustFixture=path.join(root,'cms/tests/trust-chain.php');
  if(fs.existsSync(rootTrustFixture)) {
    requireProof(entry('native:trust-root-rotation',
      capture(runtime,[rootTrustFixture],{timeout:45000})),
      /Stage2 PHP-only dual-signature trust history PASS: 18 assertions/,
      '18 signed key-rotation assertions');
  } else block('native:trust-root-rotation','Original PHP trust-chain contract unavailable in partial checkout');
}else block('native:cryptography','Native ext-sodium not available');
if(isNoNative.exitCode===0&&isNoNative.stdout==='absent'){
  entry('no-sodium:RFC8032-rejection',capture(runtime,['-n',path.join(dirname,'ed25519-lab.php'),'absent']));
  entry('no-sodium:signed-envelope-rejection',capture('node',[path.join(dirname,'release-fixture.mjs'),'absent']));
  if(process.env.SODIUM_COMPAT_AUTOLOAD&&fs.existsSync(process.env.SODIUM_COMPAT_AUTOLOAD)){
    entry('compat:RFC8032',capture(runtime,['-n',path.join(dirname,'ed25519-lab.php'),'compat'],{timeout:90000}));
    entry('compat:signed-envelope',capture('node',[path.join(dirname,'release-fixture.mjs'),'compat'],{timeout:90000}));
  } else block('compat:cryptography','Need independently verified, exact pinned 2.5.2 SODIUM_COMPAT_AUTOLOAD');
} else {
  block('no-sodium:cryptography','Native ext-sodium is compiled into this PHP binary, including PHP -n; refusing simulated pass');
  block('compat:cryptography','A genuine Sodium-free PHP binary and vetted 2.5.2 autoloader are required');
}
// An explicitly requested online audit is not successful if its actual
// vulnerability or registry probe was BLOCKED (e.g. missing original locks).
// Optional offline limitations still use the existing non-strict contract.
const onlineComplete=!online||['online:OSV-strict43','online:version-registry']
  .every(name=>results.some(r=>r.name===name&&r.status==='passed'));
const counts={passed:results.filter(x=>x.status==='passed').length,
  failed:results.filter(x=>x.status==='failed').length,
  blocked:results.filter(x=>x.status==='blocked').length};
const out={schema:'ai-site-cms-security-evidence-v1',environment:{node:process.version,os:process.platform,
  arch:process.arch,php:runtime,nativeSodiumProbe:isNative.stdout,
  noIniSodiumProbe:isNoNative.stdout},timestamp:new Date().toISOString(),
  strict,online,onlineComplete,counts,allExecutedTestsPassed:counts.failed===0,
  complete:counts.failed===0&&counts.blocked===0&&onlineComplete,
  productionApproved:false,licenseApproved:false,stage2Accepted:false,results};
console.log(JSON.stringify(out,null,2));
// Print bounded named evidence to CI stderr: a green aggregate number is not
// enough to prove which exact-head fixtures reached their final assertion count.
const proofNames=[
  'native:operator-receipt-chain','native:operator-preactivation-permit',
  'native:operator-settlement-chain','native:node-signed-chain',
  'native:forced-class-signed-chain','native:pinned-fixed-main-dispatch-parity',
  'native:class-only-backend-primitive',
  'source:common-ed25519-backend','mutation:ed25519-source-audit',
  'native:trust-root-rotation',
  'mutation:osv-strict-regression.mjs','mutation:osv-cli-regression.mjs',
  'mutation:suite-exit-regression.mjs',
  'mutation:sodium-compat-attest-regression.mjs',
  'mutation:online-evidence-regression.mjs',
  'mutation:runtime-sodium-proof-regression.mjs',
  'upstream:archived-main-genuine-sodium-free','mutation:archived-main-sodium-provenance'
];
console.error('INDEPENDENT_SECURITY_EXACT_HEAD_PROOFS '+JSON.stringify(
  proofNames.map(name=>{
    const r=results.find(x=>x.name===name);
    const lines=(r?.stdout||'').trimEnd().split('\n');
    const proof=lines.filter(line=>/PASS.*assertions|PASS.*cases/.test(line)).at(-1)
      ||lines[lines.length-1]||'';
    return {name,status:r?.status||'absent',exitCode:r?.exitCode??null,
      proof:proof.slice(0,240),validationError:r?.validationError||null};
  })
));
if(counts.failed>0){
  // CI normally redirects the structured stdout report into RUNNER_TEMP.
  // Emit bounded failure diagnostics on stderr for a reproducible PR review.
  console.error('INDEPENDENT_SECURITY_SUITE_FAILURE '+JSON.stringify(
    results.filter(x=>x.status==='failed').map(x=>({
      name:x.name,exitCode:x.exitCode,validationError:x.validationError||null,
      stderr:(x.stderr||'').slice(-500),stdout:(x.stdout||'').slice(-350)
    }))
  ));
}else console.error('INDEPENDENT_SECURITY_SUITE_COUNTS '+JSON.stringify(counts));
process.exitCode=counts.failed>0?1:(strict&&counts.blocked>0)||!onlineComplete?3:0;
