#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const __dirname = require('node:path').dirname(fileURLToPath(import.meta.url));
'use strict';
// Real Node Ed25519 signing, actual unmodified PHP OfflineReleaseVerifier verification.
// All keys are temporary, no private keys written, no archives extracted.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const php=process.env.PHP_BINARY||'php';
const argv=process.argv.slice(2), flavor=argv.length===0?'native':argv[0];
if(argv.length>1 || !['native','absent','compat'].includes(flavor)) {
  console.error('Usage: node release-fixture.mjs native|absent|compat');
  process.exit(2);
}
const preflight=cp.spawnSync(php,[...(flavor==='native'?[]:['-n']),'-r',
  'echo extension_loaded("sodium") ? "native" : "no-native";'],{encoding:'utf8'});
if(preflight.error || preflight.status!==0) {
  console.error('BLOCKED: PHP preflight unavailable '+(preflight.error?.message||preflight.stderr));
  process.exit(2);
}
if((flavor==='native') !== (preflight.stdout==='native')) {
  console.error('BLOCKED: mode='+flavor+', PHP runtime='+preflight.stdout+'; genuine no-sodium PHP required for absent/compat');
  process.exit(2);
}
if(flavor==='compat' && !process.env.SODIUM_COMPAT_AUTOLOAD) {
  console.error('BLOCKED: independently pinned sodium_compat 2.5.2 autoload.php required');
  process.exit(2);
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-security-'));
const release=path.join(tmp,'release'), keyfile=path.join(tmp,'trusted-public.pem');
function run(opts) {
  const runner=path.join(__dirname,'release-verify-runner.php');
  // Runner is a checked-in reviewable file. No dynamic PHP eval.
  const args=[...(flavor==='native'?[]:['-n']),runner,opts.folder||release,opts.keyPath||keyfile,opts.version||'0.2.1-stage2.1',opts.pin,
    opts.minimum||'0.2.0-stage2.1',opts.revoked||''];
  return cp.spawnSync(php,args,{encoding:'utf8',env:{...process.env,
    SODIUM_COMPAT_AUTOLOAD:flavor==='compat'?(process.env.SODIUM_COMPAT_AUTOLOAD||''):'',
    ED25519_LAB_MODE:flavor}});
}
function check(ok,name){if(!ok)throw Error('FAIL '+name);console.log('PASS '+name);}
function reject(r,name){check(r.status===1,name+' [expected verifier rejection] '+r.stderr);}
const renameOriginal=(file,temporary,callback)=>{fs.renameSync(file,temporary);try{callback();}finally{fs.renameSync(temporary,file);}};
try{
  fs.mkdirSync(release);
  const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
  const pem=publicKey.export({type:'spki',format:'pem'});
  const der=publicKey.export({type:'spki',format:'der'});
  const pin=crypto.createHash('sha256').update(der).digest('hex');
  fs.writeFileSync(keyfile,pem,{mode:0o600});
  const zip=Buffer.from('harmless-integrity-only-not-an-extractable-ZIP');
  fs.writeFileSync(path.join(release,'package.zip'),zip,{mode:0o600});
  const meta={
    format:'ai-site-cms-stage2-signed-lab-envelope-v1',version:'0.2.1-stage2.1',
    channel:'internal-laboratory',productionReady:false,signatureAlgorithm:'Ed25519',
    trustedKeyFingerprint:pin,archiveName:'package.zip',archiveBytes:zip.length,
    archiveSha256:crypto.createHash('sha256').update(zip).digest('hex'),
    packageManifestSha256:'a'.repeat(64)
  };
  const bytes=JSON.stringify(meta)+'\n';
  const domain=Buffer.from('AI-SITE-CMS-STAGE2-LAB-ENVELOPE-V1\0');
  fs.writeFileSync(path.join(release,'envelope.json'),bytes,{mode:0o600});
  fs.writeFileSync(path.join(release,'envelope.sig'),
    crypto.sign(null,Buffer.concat([domain,Buffer.from(bytes)]),privateKey),{mode:0o600});
  const signatureFile=path.join(release,'envelope.sig');
  const metadataFile=path.join(release,'envelope.json');
  const archiveFile=path.join(release,'package.zip');
  const originalSignature=fs.readFileSync(signatureFile);
  if(flavor==='absent'){
    const r=run({pin});reject(r,'missing verifier fails closed');
  }else{
    let r=run({pin});check(r.status===0,'genuine signed envelope accepted: '+r.stderr);
    check(JSON.parse(r.stdout).safe_to_deploy===false,'lab signature never authorizes deployment');
    reject(run({pin:'f'.repeat(64)}),'wrong pinned fingerprint');
    reject(run({pin,revoked:pin}),'revoked signer fingerprint');
    reject(run({pin:'bad'}),'unvalidated/truncated fingerprint');
    reject(run({pin,minimum:'0.2.2-stage2.1'}),'anti-rollback minimum above release');
    reject(run({pin,version:'0.2.2-stage2.1'}),'mismatched expected release version');
    fs.appendFileSync(metadataFile,' ');
    reject(run({pin}),'modified signed metadata');
    fs.writeFileSync(metadataFile,bytes);
    const changed=Buffer.from(originalSignature);changed[3]^=0x04;
    fs.writeFileSync(signatureFile,changed);
    reject(run({pin}),'mutated Ed25519 signature');
    fs.writeFileSync(signatureFile,originalSignature.subarray(0,63));
    reject(run({pin}),'short detached signature');
    fs.writeFileSync(signatureFile,originalSignature);
    fs.writeFileSync(signatureFile,crypto.sign(null,Buffer.from(bytes),privateKey));
    reject(run({pin}),'signature of missing cryptographic domain');
    fs.writeFileSync(signatureFile,originalSignature);
    fs.writeFileSync(archiveFile,Buffer.from('altered-archive'));
    reject(run({pin}),'modified archive digest');
    fs.writeFileSync(archiveFile,zip);
    renameOriginal(archiveFile,archiveFile+'.real',()=>{
      fs.symlinkSync(archiveFile+'.real',archiveFile);
      try{reject(run({pin}),'archive symlink refused');}finally{fs.unlinkSync(archiveFile);}
    });
    const extraLink=path.join(tmp,'extra-hardlink');
    fs.linkSync(archiveFile,extraLink);
    try{reject(run({pin}),'archive hardlink refused');}finally{fs.unlinkSync(extraLink);}
    renameOriginal(signatureFile,signatureFile+'.real',()=>{
      fs.symlinkSync(signatureFile+'.real',signatureFile);
      try{reject(run({pin}),'detached signature symlink refused');}finally{fs.unlinkSync(signatureFile);}
    });
    const internalPem=path.join(release,'inside-release.pem');
    fs.copyFileSync(keyfile,internalPem);
    try{reject(run({pin,keyPath:internalPem}),'untrusted public key inside release folder');}
    finally{fs.unlinkSync(internalPem);}
    const originalPem=fs.readFileSync(keyfile);
    fs.writeFileSync(keyfile,'-----BEGIN PUBLIC KEY-----\nBAD\n-----END PUBLIC KEY-----\n');
    try{reject(run({pin}),'malformed pinned public key PEM');}finally{fs.writeFileSync(keyfile,originalPem);}
    const secondRoot=path.join(tmp,'release-symlink');fs.symlinkSync(release,secondRoot);
    try{reject(run({pin,folder:secondRoot}),'release directory symlink refused');}finally{fs.unlinkSync(secondRoot);}
    // Even a new valid signature must match exact canonical metadata policy.
    fs.writeFileSync(metadataFile,bytes.replace('"channel":"internal-laboratory"','"channel": "internal-laboratory"'));
    fs.writeFileSync(signatureFile,crypto.sign(null,Buffer.concat([domain,fs.readFileSync(metadataFile)]),privateKey));
    reject(run({pin}),'properly signed but noncanonical metadata');
    fs.writeFileSync(metadataFile,bytes);
    fs.writeFileSync(signatureFile,originalSignature);
    check(run({pin}).status===0,'genuine signed envelope still accepted after negative cases');
  }
  console.log(JSON.stringify({mode:flavor,status:'passed',securityApproved:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}