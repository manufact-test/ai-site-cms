#!/usr/bin/env node
// Reproducible, non-mutating research-only audit. No Composer/npm install or host access.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
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
const scripts=['inventory-audit.mjs','lock-provenance.mjs','version-check.mjs',
  'ed25519-lab.php','release-fixture.mjs','release-verify-runner.php',
  'policy-regression.mjs','provenance-regression.mjs','notice-gate.mjs',
  'notice-regression.mjs','run-security-suite.mjs'];
for(const name of scripts){
  if(!fs.existsSync(path.join(dirname,name))){block('syntax:'+name,'Script missing from checkout');continue;}
  if(name.endsWith('.mjs'))entry('syntax:'+name,capture('node',['--check',path.join(dirname,name)]));
  else entry('syntax:'+name,capture(runtime,['-l',path.join(dirname,name)]));
}
for(const name of ['policy-regression.mjs','provenance-regression.mjs','notice-regression.mjs']){
  entry('mutation:'+name,capture('node',[path.join(dirname,name)],{timeout:30000}));
}
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
    entry('online:OSV',capture('node',[path.join(dirname,'inventory-audit.mjs'),'--online'],{timeout:90000}));
    entry('online:version-registry',capture('node',[path.join(dirname,'version-check.mjs')],{timeout:240000}));
  }
} else {
  for(const name of ['actual-lock:json','actual-lock:csv','actual-lock:provenance'])block(name,'Requires original composer.lock, package-lock.json, package.json in complete checkout');
  if(online)for(const name of ['online:OSV','online:version-registry'])block(name,'Original complete lock files unavailable');
}
const isNative=capture(runtime,['-r','echo extension_loaded("sodium") ? "native" : "absent";']);
const isNoNative=capture(runtime,['-n','-r','echo extension_loaded("sodium") ? "native" : "absent";']);
if(isNative.exitCode===0&&isNative.stdout==='native'){
  entry('native:RFC8032',capture(runtime,[path.join(dirname,'ed25519-lab.php'),'native'],{timeout:30000}));
  entry('native:signed-envelope',capture('node',[path.join(dirname,'release-fixture.mjs'),'native'],{timeout:30000}));
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
const counts={passed:results.filter(x=>x.status==='passed').length,
  failed:results.filter(x=>x.status==='failed').length,
  blocked:results.filter(x=>x.status==='blocked').length};
const out={schema:'ai-site-cms-security-evidence-v1',environment:{node:process.version,os:process.platform,
  arch:process.arch,php:runtime,nativeSodiumProbe:isNative.stdout,
  noIniSodiumProbe:isNoNative.stdout},timestamp:new Date().toISOString(),
  strict,online,counts,allExecutedTestsPassed:counts.failed===0,
  complete:counts.failed===0&&counts.blocked===0,
  productionApproved:false,licenseApproved:false,stage2Accepted:false,results};
console.log(JSON.stringify(out,null,2));
process.exitCode=counts.failed>0?1:strict&&counts.blocked>0?3:0;
