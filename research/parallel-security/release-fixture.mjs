#!/usr/bin/env node
'use strict';
// Real Node Ed25519 signing, actual unmodified PHP OfflineReleaseVerifier verification.
// All keys are temporary, no private keys written, no archives extracted.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-security-'));
const release=path.join(tmp,'release'), keyfile=path.join(tmp,'trusted-public.pem');
const php=process.env.PHP_BINARY||'php', flavor=process.argv[2]||'native';
if(!['native','absent','compat'].includes(flavor))throw Error('Usage: node release-fixture.mjs native|absent|compat');
function run(opts) {
  const runner=path.join(__dirname,'release-verify-runner.php');
  // Runner is a checked-in reviewable file. No dynamic PHP eval.
  const args=[...(flavor==='native'?[]:['-n']),runner,release,keyfile,'0.2.1-stage2.1',opts.pin,
    opts.minimum||'0.2.0-stage2.1'];
  return cp.spawnSync(php,args,{encoding:'utf8',env:{...process.env,
    SODIUM_COMPAT_AUTOLOAD:flavor==='compat'?(process.env.SODIUM_COMPAT_AUTOLOAD||''):'',
    ED25519_LAB_MODE:flavor}});
}
function check(ok,name){if(!ok)throw Error('FAIL '+name);console.log('PASS '+name);}
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
  if(flavor==='absent'){
    const r=run({pin});check(r.status===1&&/unavailable/.test(r.stderr),'missing verifier fails closed');
  }else{
    let r=run({pin});check(r.status===0,'genuine signed envelope accepted: '+r.stderr);
    check(JSON.parse(r.stdout).safe_to_deploy===false,'lab signature never authorizes deployment');
    r=run({pin:'f'.repeat(64)});check(r.status!==0,'wrong key fingerprint rejected');
    r=run({pin,minimum:'0.2.2-stage2.1'});check(r.status!==0,'anti-rollback minimum rejects old version');
    fs.appendFileSync(path.join(release,'envelope.json'),' ');
    r=run({pin});check(r.status!==0,'modified metadata rejected');
    fs.writeFileSync(path.join(release,'envelope.json'),bytes);
    fs.writeFileSync(path.join(release,'package.zip'),Buffer.from('altered-archive'));
    r=run({pin});check(r.status!==0,'archive digest mismatch rejected');
  }
  console.log(JSON.stringify({mode:flavor,status:'passed',securityApproved:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}