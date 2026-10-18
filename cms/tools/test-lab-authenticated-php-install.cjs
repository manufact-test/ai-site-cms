'use strict';
// Authenticated, genuinely signed internal ZIP -> independently verified PHP Ed25519
// -> restricted archive extraction -> PHP-only disposable code install. CI ONLY.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const {STAGE}=require('./build-internal-package.cjs');
const {buildSignedLabBundle}=require('./lab-signed-offline-release.cjs');
if(process.env.CI!=='true'||process.env.CMS_ALLOW_EPHEMERAL_SIGNING_LAB!=='1'
  ||process.env.CMS_ALLOW_PHP_INSTALL_LAB!=='1')
  throw Error('Explicit disposable CI flags required for authenticated installation rehearsal');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-php-signed-pipeline-'));
const signed=path.join(tmp,'signed'),extracted=path.join(tmp,'extracted');
fs.mkdirSync(signed);fs.mkdirSync(extracted);
const generatedLabs=[];
let checks=0;
const ok=(cond,name)=>{assert.ok(cond,name);checks++};
const cmd=(exe,args)=>{const p=spawnSync(exe,args,{encoding:'utf8',timeout:40000,maxBuffer:65536});if(p.error)throw p.error;return p};
function runPhpStage(payload,manifest){
  const snippet=String.raw`require $argv[1]; $lab=\AiSiteCms\Release\LabPackageStager::create(); echo $lab->root(), "\n"; try { $report=$lab->stage($argv[2],$argv[3]); echo json_encode($report),"\n"; } catch (\Throwable $e) { fwrite(STDERR,"LAB_INSTALL_REFUSED\n"); exit(3); }`;
  const args=['-r',snippet,path.join(ROOT,'src/Release/LabPackageStager.php'),payload,manifest];
  const run=cmd('php',args);
  const lines=run.stdout.trim().split('\n');
  if(lines[0] && path.dirname(lines[0])===fs.realpathSync(os.tmpdir())
    && path.basename(lines[0]).startsWith('ai-site-cms-php-install-lab-'))
    generatedLabs.push(lines[0]);
  return {run,lines};
}
try {
  const keys=crypto.generateKeyPairSync('ed25519');
  const pemFile=path.join(tmp,'external-trusted.pem');
  fs.writeFileSync(pemFile,keys.publicKey.export({type:'spki',format:'pem'}));
  buildSignedLabBundle(STAGE,signed,keys.privateKey,keys.publicKey);
  const pinned=crypto.createHash('sha256')
    .update(keys.publicKey.export({type:'spki',format:'der'})).digest('hex');
  const version='0.2.0-stage2.1';
  const signedCheck=cmd('php',[path.join(ROOT,'bin/verify-lab-release.php'),'--verify',
    '--folder='+signed,'--trusted-public-key='+pemFile,'--expected-version='+version,
    '--expected-fingerprint='+pinned]);
  ok(signedCheck.status===0,'PHP independently validates genuine Node-created Ed25519 ZIP');
  const digest=JSON.parse(signedCheck.stdout).manifest_sha256;
  ok(/^[a-f0-9]{64}$/.test(digest),'manifest binding sourced from PHP verified release envelope');
  const extractedResult=cmd('python3',[path.join(ROOT,'tools/safe-offline-archive.py'),
    'extract',path.join(signed,'package.zip'),extracted]);
  ok(extractedResult.status===0,'restricted extractor unpacked real signed archive');
  const installed=runPhpStage(extracted,digest);
  ok(installed.run.status===0,'PHP installed cryptographically bound package in own empty OS temp');
  const report=JSON.parse(installed.lines[1]);
  ok(report.status==='installed'&&!report.productionReady&&!report.publicHttpServed,
    'install does not create public service or claim production readiness');
  fs.appendFileSync(path.join(extracted,'private/editor/editor.js'),'CORRUPTION');
  ok(runPhpStage(extracted,digest).run.status===3,
    'manifest inventory blocks post-extraction editor corruption');
  fs.writeFileSync(path.join(extracted,'public/malicious.php'),'<?php echo "bad";');
  ok(runPhpStage(extracted,digest).run.status===3,'reject unlisted executable injection');
  fs.unlinkSync(path.join(extracted,'public/malicious.php'));
  ok(runPhpStage(extracted,'0'.repeat(64)).run.status===3,
    'reject wrong signed-manifest digest');
  const wrongPin=cmd('php',[path.join(ROOT,'bin/verify-lab-release.php'),'--verify',
    '--folder='+signed,'--trusted-public-key='+pemFile,'--expected-version='+version,
    '--expected-fingerprint='+'0'.repeat(64)]);
  ok(wrongPin.status===3,'reject wrong out-of-band signing fingerprint');
  ok(generatedLabs.every(root=>path.dirname(root)===fs.realpathSync(os.tmpdir())),
    'all PHP installer roots remain in private OS-temp namespace');
  console.log('Stage2 authenticated ZIP -> PHP signature -> safe extraction -> PHP staging PASS: '+checks+
    ' assertions; CI-only private code, no live site or DB');
}finally{
  for(const root of generatedLabs){
    if(path.dirname(root)===fs.realpathSync(os.tmpdir())&&
      path.basename(root).startsWith('ai-site-cms-php-install-lab-'))
      fs.rmSync(root,{recursive:true,force:true});
  }
  if(path.dirname(tmp)===fs.realpathSync(os.tmpdir())&&
    path.basename(tmp).startsWith('ai-site-cms-php-signed-pipeline-'))
    fs.rmSync(tmp,{recursive:true,force:true});
}
