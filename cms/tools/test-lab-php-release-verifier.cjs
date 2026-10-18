'use strict';
// Cross-runtime signed ZIP contract test: genuine Node-created archive, PHP sodium verifier.
// Entirely disposable CI; no publisher secrets, Hostinger, DB, deployment or extraction by PHP.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
const {buildSignedLabBundle,sha}=require('./lab-signed-offline-release.cjs');
if(process.env.CI!=='true'||process.env.CMS_ALLOW_EPHEMERAL_SIGNING_LAB!=='1')
  throw Error('Disposable CI key verification rehearsal only');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-php-verify-lab-'));
const folder=path.join(tmp,'signed'),keyPath=path.join(tmp,'trusted-public.pem');
fs.mkdirSync(folder,{mode:0o700});
let assertions=0;
function pass(ok,name){assert.ok(ok,name);assertions++}
function invoke(opts=[]){
  const result=spawnSync('php',[path.join(__dirname,'../bin/verify-lab-release.php'),...opts],
    {encoding:'utf8',timeout:30000,maxBuffer:8192});
  if(result.error)throw result.error;
  return result;
}
function expectReject(args,name,code=3){
  const r=invoke(args);pass(r.status===code,name+' rejected with '+code);
  pass(!r.stdout.includes(tmp)&&!r.stderr.includes(tmp),name+' does not disclose file paths');
}
function mutateThenRestore(file,mutation,check){
  const old=fs.readFileSync(file);
  try{mutation(old);check()}finally{
    if(fs.existsSync(file))fs.rmSync(file);
    fs.writeFileSync(file,old,{mode:0o600,flag:'wx'});
  }
}
try{
  const keys=crypto.generateKeyPairSync('ed25519');
  const pem=keys.publicKey.export({format:'pem',type:'spki'});
  fs.writeFileSync(keyPath,pem,{mode:0o600,flag:'wx'});
  const expected=verify(STAGE).releaseVersion;
  buildSignedLabBundle(STAGE,folder,keys.privateKey,keys.publicKey);
  const der=keys.publicKey.export({format:'der',type:'spki'});
  const pin=sha(der);
  const basics=['--verify','--folder='+folder,'--trusted-public-key='+keyPath,
    '--expected-version='+expected,'--expected-fingerprint='+pin];
  const good=invoke(basics);
  pass(good.status===0,'real Node signed ZIP verified by separate PHP Ed25519 implementation');
  const report=JSON.parse(good.stdout);
  pass(report.verification==='signed_archive_metadata_verified','PHP verifies authenticated digest');
  pass(report.version===expected&&report.trusted_key_fingerprint===pin,'version and out-of-band pin retained');
  pass(report.safe_to_deploy===false&&report.inventory_files_verified===false &&
    report.archive_extracted===false,'PHP does not claim deployment or extraction');
  pass(!good.stdout.includes(tmp),'success report strips all path data');
  pass(invoke([...basics,'--minimum-version='+expected]).status===0,'same version allowed as minimum');
  expectReject([...basics,'--minimum-version=0.2.0-stage2.2'],'minimum higher than signed release');
  expectReject([...basics.slice(0,4),'--expected-fingerprint='+'0'.repeat(64)],'mismatched external pin');
  expectReject([...basics,'--revoked-fingerprint='+pin],'revoked fingerprint');
  expectReject([...basics.slice(0,3),'--expected-version=0.2.0-stage2.9','--expected-fingerprint='+pin],
    'version substituted by operator');
  const other=crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(path.join(tmp,'wrong.pem'),other.publicKey.export({format:'pem',type:'spki'}));
  expectReject([...basics.slice(0,2),'--trusted-public-key='+path.join(tmp,'wrong.pem'),
    ...basics.slice(3)],'different key rejects same signed bundle');
  expectReject(basics.slice(0,3),'pin omitted',2);
  expectReject(['--verify'],'implicit trust refused',2);
  expectReject([...basics,'--expected-version='+expected],'duplicate arg refused',2);
  const archive=path.join(folder,'package.zip');
  mutateThenRestore(archive,(old)=>fs.writeFileSync(archive,Buffer.concat([old,Buffer.from('tamper')])),
    ()=>expectReject(basics,'archive byte corruption'));
  const env=path.join(folder,'envelope.json');
  mutateThenRestore(env,(old)=>fs.writeFileSync(env,Buffer.from(old.toString().replace('internal-laboratory','production'))),
    ()=>expectReject(basics,'signed metadata tampering'));
  const signature=path.join(folder,'envelope.sig');
  mutateThenRestore(signature,(old)=>fs.writeFileSync(signature,Buffer.alloc(old.length)),
    ()=>expectReject(basics,'signature replacement'));
  const internalKey=path.join(folder,'rogue-public.pem');
  fs.copyFileSync(keyPath,internalKey);
  expectReject([...basics.slice(0,2),'--trusted-public-key='+internalKey,...basics.slice(3)],
    'trusted key embedded in attacker release folder');
  fs.unlinkSync(internalKey);
  mutateThenRestore(signature,()=>{fs.unlinkSync(signature);fs.symlinkSync(keyPath,signature)},
    ()=>expectReject(basics,'symlink signature rejected'));
  mutateThenRestore(env,()=>{fs.unlinkSync(env);fs.linkSync(keyPath,env)},
    ()=>expectReject(basics,'hardlink envelope rejected'));
  mutateThenRestore(archive,()=>fs.unlinkSync(archive),
    ()=>expectReject(basics,'missing archive fail closed'));
  pass(invoke(basics).status===0,'signed bundle intact after negative cases');
  console.log('Stage2 independent Node-to-PHP Ed25519 verification PASS: '+assertions+
    ' assertions; keys ephemeral, metadata-only, no production deploy');
}finally{
  if(path.dirname(tmp)===fs.realpathSync(os.tmpdir()) &&
     path.basename(tmp).startsWith('ai-site-cms-php-verify-lab-'))
    fs.rmSync(tmp,{recursive:true,force:true});
}
