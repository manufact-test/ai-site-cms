'use strict';
// CI-only stage2 signed archive + safe extraction security matrix.
// Test signing keys are born in memory here, destroyed with the CI runner;
// they are NOT publisher keys and NOT suitable for a production trust root.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
const {LabRollout}=require('./lab-versioned-rollout.cjs');
const {buildSignedLabBundle,verifyEnvelope,stageSignedLabBundle,
  metadata,writeEnvelope,compare,sha}=require('./lab-signed-offline-release.cjs');

const expected='0.2.0-stage2.1';
let count=0;
function ok(value,label){assert.ok(value,label);count++}
function denied(fn,pattern,label){assert.throws(fn,pattern,label);count++}
function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-signature-ci-'))}
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const stranger=crypto.generateKeyPairSync('ed25519');
const pkg=verify(STAGE);
const root=temp(),bundle=path.join(root,'signed');
const lab=new LabRollout();
fs.mkdirSync(bundle,{mode:0o700});
function cloneBundle(label){
  const dest=path.join(root,label);
  fs.cpSync(bundle,dest,{recursive:true,errorOnExist:true,force:false});
  return dest;
}
function modifySignature(dir){
  const file=path.join(dir,'envelope.sig'),data=fs.readFileSync(file);
  data[0]^=1;fs.writeFileSync(file,data);
}
function resignForAttack(dir){
  for(const file of ['envelope.sig','envelope.json'])fs.unlinkSync(path.join(dir,file));
  const zip=fs.readFileSync(path.join(dir,'package.zip'));
  const manifestHash=sha(fs.readFileSync(path.join(STAGE,'private/package-manifest.json')));
  const info=metadata(expected,zip,manifestHash,publicKey);
  writeEnvelope(dir,info,privateKey);
}
function python(code, args){
  const p=spawnSync('python3',['-c',code,...args],{encoding:'utf8',timeout:30000,maxBuffer:8192});
  if(p.status!==0)throw Error('Invalid test forge: '+p.stderr);
}
function forgedArchive(type,name){
  const dir=cloneBundle('attack-'+type+'-'+(++forgeNo));
  const zip=path.join(dir,'package.zip');
  const py=[
    'import zipfile,sys,stat,os',
    'target,kind,name=sys.argv[1:]',
    'os.unlink(target)',
    'with zipfile.ZipFile(target,"w",allowZip64=False) as z:',
    '  def add(n,payload,mode=stat.S_IFREG|0o644,compression=zipfile.ZIP_STORED):',
    '    info=zipfile.ZipInfo(n,date_time=(2020,1,1,0,0,0))',
    '    info.create_system=3',
    '    info.external_attr=mode<<16',
    '    info.compress_type=compression',
    '    z.writestr(info,payload)',
    '  if kind=="symlink": add(name,"../../etc/passwd",stat.S_IFLNK|0o777)',
    '  elif kind=="duplicate": add(name,b"a");add(name,b"b")',
    '  elif kind=="case": add("public/Case.txt",b"a");add("public/case.txt",b"b")',
    '  elif kind=="bomb": add(name,b"A"*900000,compression=zipfile.ZIP_DEFLATED)',
    '  elif kind=="oversized": add(name,b"B"*(9*1024*1024),compression=zipfile.ZIP_DEFLATED)',
    '  else: add(name,b"payload")'
  ].join('\n');
  python(py,[zip,type,name]);
  resignForAttack(dir);
  return dir;
}
let forgeNo=0;
try{
  const earlier=process.env.CMS_ALLOW_EPHEMERAL_SIGNING_LAB;
  delete process.env.CMS_ALLOW_EPHEMERAL_SIGNING_LAB;
  denied(()=>buildSignedLabBundle(STAGE,bundle,privateKey,publicKey),/explicit disposable CI flags/,'Cannot sign without CI flag');
  process.env.CMS_ALLOW_EPHEMERAL_SIGNING_LAB=earlier;
  ok(pkg.releaseVersion===expected,'Pinned package version');
  const signatureInfo=buildSignedLabBundle(STAGE,bundle,privateKey,publicKey);
  ok(signatureInfo.version===expected && signatureInfo.productionReady===false,'CI-only detached signature metadata');
  ok(signatureInfo.signatureAlgorithm==='Ed25519' && signatureInfo.trustedKeyFingerprint.length===64,'Ed25519 key identity');
  ok(verifyEnvelope(bundle,publicKey,expected,expected).archiveSha256===signatureInfo.archiveSha256,'Trusted signature and exact ZIP bytes verified');
  ok(compare(expected,'0.2.0-stage2.0')>0 && compare(expected,expected)===0,'Monotonic version comparator');
  ok(stageSignedLabBundle({folder:bundle,trustedPublicKey:publicKey,expectedVersion:expected,minimumVersion:expected,lab})===expected,'Authenticated ZIP extracted and staged');
  ok(verify(lab.slot(expected)).files.length===pkg.files.length,'Fully verified 429-file installed lab slot');
  denied(()=>stageSignedLabBundle({folder:bundle,trustedPublicKey:publicKey,expectedVersion:expected,lab}),/overwrite/,'Immutable slot cannot be overwritten');
  denied(()=>verifyEnvelope(bundle,stranger.publicKey,expected),/signature/,'Foreign trusted public key refuses original signature');
  denied(()=>verifyEnvelope(bundle,null,expected),/trusted public key/,'No trust-on-first-use or missing trust');
  denied(()=>verifyEnvelope(bundle,publicKey,'0.2.0-stage2.0'),/metadata\/version\/hash/,'Signed package bound to expected version');
  denied(()=>verifyEnvelope(bundle,publicKey,expected,'0.2.0-stage2.2'),/downgrade/,'Trusted minimum version prevents downgrade');
  const invalidSig=cloneBundle('wrong-signature');modifySignature(invalidSig);
  denied(()=>verifyEnvelope(invalidSig,publicKey,expected),/signature/,'Tampered Ed25519 signature rejected');
  const tamperedEnvelope=cloneBundle('tampered-envelope');
  fs.appendFileSync(path.join(tamperedEnvelope,'envelope.json'),' ');
  denied(()=>verifyEnvelope(tamperedEnvelope,publicKey,expected),/signature/,'Signed metadata byte mutation rejected');
  const tamperedZip=cloneBundle('tampered-zip');
  fs.appendFileSync(path.join(tamperedZip,'package.zip'),'ATTACK');
  denied(()=>verifyEnvelope(tamperedZip,publicKey,expected),/metadata\/version\/hash/,'Altered ZIP digest rejected');
  const missing=cloneBundle('missing-signature');fs.unlinkSync(path.join(missing,'envelope.sig'));
  denied(()=>verifyEnvelope(missing,publicKey,expected),/Unsafe\/missing/,'Missing detached signature refused');
  const truncated=cloneBundle('short-signature');fs.writeFileSync(path.join(truncated,'envelope.sig'),'bad');
  denied(()=>verifyEnvelope(truncated,publicKey,expected),/signature/,'Signature length enforced');
  // Red-team ZIPs are deliberately signed with the SAME trusted ephemeral key:
  // cryptographic authenticity alone does not make archive path contents safe.
  for(const [kind,name,label] of [
    ['regular','../escape.php','Parent traversal'],
    ['regular','/tmp/escape.php','Absolute filesystem path'],
    ['regular','public\\evil.php','Backslash path'],
    ['regular','public/C:evil.php','Windows drive syntax'],
    ['regular','public/a/../b.php','Nested traversal'],
    ['symlink','public/symlink.php','Symbolic link'],
    ['duplicate','public/index.php','Duplicate archive entry'],
    ['case','public/ignored.php','Casefold filename collision'],
    ['bomb','public/huge.txt','Extreme compression ratio'],
    ['oversized','public/oversized.bin','Maximum per-file size'],
    ['regular','public/unlisted.php','Signed but manifest-less payload']
  ]){
    const forged=forgedArchive(kind,name);
    const attackLab=new LabRollout();
    try{
      denied(()=>stageSignedLabBundle({folder:forged,trustedPublicKey:publicKey,
        expectedVersion:expected,lab:attackLab}),
        /Archive extract rejected|ENOENT|manifest|Invalid package/,
        'Trusted-key signature is not sufficient: '+label);
    }finally{attackLab.dispose()}
  }
  // A valid signed archive containing an injected extra file must still fail the
  // package manifest inventory. No mutation to live source artifacts.
  const extra=cloneBundle('signed-extra-file');
  python([
    'import zipfile,sys,stat',
    'with zipfile.ZipFile(sys.argv[1],"a") as z:',
    '  z.writestr("public/injected.php","<?php echo 1;")'
  ].join('\n'),[path.join(extra,'package.zip')]);
  resignForAttack(extra);
  const extraLab=new LabRollout();
  try{
    denied(()=>stageSignedLabBundle({folder:extra,trustedPublicKey:publicKey,
      expectedVersion:expected,lab:extraLab}),/Unlisted/,'Signed extra member blocked by package inventory');
  }finally{extraLab.dispose()}
  ok(!fs.existsSync(path.join(root,'escape.php')),'Path traversal did not escape lab directory');
  ok(lab.state().current===null,'Extraction/staging never activates new code automatically');
  ok(!fs.existsSync(path.join(STAGE,'envelope.sig')),'Original internal package remains unsigned');
  console.log('Stage2 Ed25519 detached signature + safe offline ZIP lab PASS: '+count+' assertions; no publisher key/host/site/DB');
}finally{
  lab.dispose();
  fs.rmSync(root,{recursive:true,force:true});
}
