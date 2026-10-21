'use strict';
// Disposable, source-bound Node issuer/verify and adversarial CLI checks.
// No real owner keys, host contacts, database writes or Stage2 acceptance.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const tool=require('./stage2-owner-write-consent.cjs');
const {keyDigest}=require('./stage2-evidence-bundle.cjs');
let passed=0;
const yes=(b,why)=>{assert.ok(b,why);passed++;};
const no=(fn,why)=>{assert.throws(fn,undefined,why);passed++;};
const box=fs.mkdtempSync(path.join(os.tmpdir(),'stage2-write-consent-'));
try{
  for(const part of ['task','owner-key','signed','review-key']){
    fs.mkdirSync(path.join(box,part),{mode:0o700});
  }
  const taskFile=path.join(box,'task','once.json');
  const keyFile=path.join(box,'owner-key','private.pem');
  const consentFile=path.join(box,'signed','permit.json');
  const pubFile=path.join(box,'review-key','owner.pub');
  const pair=crypto.generateKeyPairSync('ed25519');
  const privatePem=pair.privateKey.export({format:'pem',type:'pkcs8'});
  const publicPem=pair.publicKey.export({format:'pem',type:'spki'});
  const pin=keyDigest(pair.publicKey);
  const manifest=path.resolve(__dirname,'../.build/internal-stage2-package/private/package-manifest.json');
  yes(fs.existsSync(manifest),'run against built actual Stage2 package');
  const manifestPin=crypto.createHash('sha256').update(fs.readFileSync(manifest)).digest('hex');
  const task={
    format:'ai-site-cms-stage2-hostinger-task-v1',
    package_manifest_sha256:manifestPin,
    target:tool.TARGET,site:tool.SITE,operation:'install',
    confirm:'INSTALL_EMPTY_STAGE2_TEST_DB_ONCE',
    db_host:'127.0.0.1',db_name:'cms_ephemeral_ci',db_user:'cms_ci_operator',
    db_password:'fixture_only_do_not_copy'
  };
  const privateWrite=(file,content)=>fs.writeFileSync(file,content,{mode:0o600});
  privateWrite(taskFile,JSON.stringify(task));
  privateWrite(keyFile,privatePem);privateWrite(pubFile,publicPem);
  const now=Date.now(),start=new Date(now-60000).toISOString().slice(0,19)+'Z',
    end=new Date(now+600000).toISOString().slice(0,19)+'Z';
  const permit=tool.issue(task,privatePem,start,end);
  const verdict=tool.verify(task,permit,publicPem,pin);
  yes(verdict.signatureValidUnderPinnedKey&&verdict.exactTaskMatched
    &&verdict.exactPackageMatched&&!verdict.stage2Accepted
    &&!verdict.writeInstallAuthorizedByThisVerifier,
    'valid exact signed permit cannot be promoted to independent owner authority');
  no(()=>tool.verify(task,permit,publicPem,'0'.repeat(64)),'foreign trust pin rejected');
  no(()=>tool.verify({...task,db_password:'stolen-replaced'},permit,publicPem,pin),
    'changed credentials change exact-task SHA');
  no(()=>tool.verify({...task,db_name:'another'},permit,publicPem,pin),
    'different schema name cannot borrow owner consent');
  no(()=>tool.verify({...task,operation:'probe'},permit,publicPem,pin),
    'write permit cannot become read-only or another operation');
  const mutated=JSON.parse(JSON.stringify(permit));
  mutated.payload.packageManifestSha256='0'.repeat(64);
  no(()=>tool.verify(task,mutated,publicPem,pin),'tampered package pin refused');
  const foreign=crypto.generateKeyPairSync('ed25519').publicKey
    .export({format:'pem',type:'spki'});
  no(()=>tool.verify(task,permit,foreign,pin),'foreign signer refused');
  const expired=new Date(now+700000).getTime();
  no(()=>tool.verify(task,permit,publicPem,pin,expired),'replayed expired permit refused');
  no(()=>tool.verify(task,permit,publicPem,pin,now-120000),
    'not yet authorized request refused');
  no(()=>tool.issue(task,privatePem,new Date(now-3600000).toISOString().slice(0,19)+'Z',end),
    'too-long validity refused');
  no(()=>tool.issue({...task,operation:'probe'},privatePem,start,end),
    'Node issuer is install only');
  no(()=>tool.verify(task,{...permit,signature:'A'.repeat(88)},publicPem,pin),
    'forged signature refused');
  const args=['--issue','--task='+taskFile,'--private-key='+keyFile,
    '--output='+consentFile,'--not-before='+start,'--expires='+end];
  const run=(args,env={})=>cp.spawnSync(process.execPath,
    [path.join(__dirname,'stage2-owner-write-consent.cjs'),...args],{
      encoding:'utf8',env:{...process.env,...env}});
  let res=run(args);
  yes(res.status===3&&!fs.existsSync(consentFile),'CLI refuses signing without owner gate');
  res=run(args,{CMS_STAGE2_OWNER_WRITE_SIGNING:'EXPLICIT_OWNER_APPROVAL_NOT_READONLY'});
  yes(res.status===0&&fs.existsSync(consentFile)
    &&(fs.statSync(consentFile).mode&0o077)===0,
    'explicit offline CLI signs one private unshared consent');
  const persisted=tool.readObject(consentFile);
  yes(tool.verify(task,persisted,publicPem,pin).signatureValidUnderPinnedKey,
    'persisted signed consent is exact and verifiable');
  // Independently cross-check Node's actual signed PEM/payload with the
  // packaged PHP verifier. Native Sodium required; no DB or remote host.
  const phpLocal=path.join(box,'php-local');
  fs.mkdirSync(phpLocal,{mode:0o700});
  privateWrite(path.join(phpLocal,'owner-install-public.pem'),publicPem);
  privateWrite(path.join(phpLocal,'owner-install-consent.json'),JSON.stringify(persisted));
  const trust={format:'ai-site-cms-stage2-owner-install-trust-v1',
    target:tool.TARGET,site:tool.SITE,trustedOwnerSpkiSha256:pin};
  privateWrite(path.join(phpLocal,'owner-install-trust.json'),JSON.stringify(trust));
  const phpArgs=[path.join(__dirname,'../tests/stage2-owner-write-cross-runtime.php'),
    phpLocal,taskFile,manifestPin];
  const phpRun=()=>cp.spawnSync('php',phpArgs,{
    encoding:'utf8',env:{...process.env,CI:'true',GITHUB_ACTIONS:'true'}});
  let php=phpRun();
  yes(php.status===0&&php.stdout.includes('STAGE2_NODE_TO_PHP_WRITE_SIGNATURE_VERIFIED_NO_DB'),
    'independent native PHP verifier accepts exact Node-signed task/package');
  privateWrite(path.join(phpLocal,'owner-install-trust.json'),JSON.stringify({
    ...trust,trustedOwnerSpkiSha256:'f'.repeat(64)}));
  php=phpRun();
  yes(php.status===3&&php.stderr.includes('STAGE2_NODE_TO_PHP_WRITE_SIGNATURE_REFUSED'),
    'independent PHP verifier rejects substituted owner pin');
  privateWrite(path.join(phpLocal,'owner-install-trust.json'),JSON.stringify(trust));
  const badPermit=JSON.parse(JSON.stringify(persisted));
  badPermit.payload.taskSha256='0'.repeat(64);
  privateWrite(path.join(phpLocal,'owner-install-consent.json'),JSON.stringify(badPermit));
  php=phpRun();
  yes(php.status===3,'independent PHP verifier rejects signed-payload tampering');
  privateWrite(path.join(phpLocal,'owner-install-consent.json'),JSON.stringify(persisted));
  res=run(args,{CMS_STAGE2_OWNER_WRITE_SIGNING:'EXPLICIT_OWNER_APPROVAL_NOT_READONLY'});
  yes(res.status===3,'cannot silently overwrite existing one-use signed permit');
  res=run(['--verify','--task='+taskFile,'--consent='+consentFile,
    '--public-key='+pubFile,'--trusted-spki-sha256='+pin]);
  yes(res.status===0&&JSON.parse(res.stdout).stage2Accepted===false,
    'CLI independent public pin validates without granting installation');
  res=run(['--verify','--task='+taskFile,'--consent='+consentFile,
    '--public-key='+pubFile,'--trusted-spki-sha256='+'0'.repeat(64)]);
  yes(res.status===3,'CLI rejects a mismatched externally pinned key');
  res=run(['--issue','--task='+taskFile,'--private-key='+keyFile,
    '--output='+path.join(box,'owner-key','collocated.json'),
    '--not-before='+start,'--expires='+end],{
      CMS_STAGE2_OWNER_WRITE_SIGNING:'EXPLICIT_OWNER_APPROVAL_NOT_READONLY'});
  yes(res.status===3,'CLI enforces separate operator and owner custody directories');
  fs.writeFileSync(taskFile,JSON.stringify(task)+'\n',{mode:0o600});
  res=run(['--verify','--task='+taskFile,'--consent='+consentFile,
    '--public-key='+pubFile,'--trusted-spki-sha256='+pin]);
  yes(res.status===3,'CLI rejects noncanonical credential-bearing task');
  fs.rmSync(taskFile);fs.symlinkSync(keyFile,taskFile);
  res=run(['--verify','--task='+taskFile,'--consent='+consentFile,
    '--public-key='+pubFile,'--trusted-spki-sha256='+pin]);
  yes(res.status===3,'CLI rejects symlinked credential-bearing task');
  process.stdout.write('Stage2 owner WRITE consent offline issuer: '+passed+
    ' positive/adversarial assertions PASS; synthetic trust ONLY, zero host writes.\n');
}finally{fs.rmSync(box,{recursive:true,force:true});}
