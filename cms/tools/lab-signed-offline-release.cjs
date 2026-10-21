'use strict';
// Stage2 offline release *authentication rehearsal*, never production deploy:
// private signing keys are generated ephemerally inside CI tests, NEVER committed.
// Trusted public key is supplied out-of-band by the caller (not from the ZIP).
// Code-only packages, NO real host, no site database and no production cutover.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {verify}=require('./build-internal-package.cjs');
const {validVersion}=require('./lab-versioned-rollout.cjs');
const archiveScript=path.join(__dirname,'safe-offline-archive.py');
const MAX_ZIP=64*1024*1024, MAX_META=4096;
const canonical=obj=>Buffer.from(JSON.stringify(obj)+'\n','utf8');
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function assertFile(file,limit){
  if(!fs.existsSync(file))throw Error('Unsafe/missing signed package file');
  const st=fs.lstatSync(file);
  if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<1||st.size>limit)
    throw Error('Unsafe/missing signed package file');
  return st;
}
/*
 * The original signed folder is a mutable operator handoff. NEVER authenticate
 * its package.zip and then open that same path later for extraction: swapping
 * the archive between those operations defeats the point-in-time check.
 * Copy the exact three inputs through O_NOFOLLOW descriptors into one brand-new
 * private CI snapshot. Later verification AND extraction only see this copy.
 * This is a byte snapshot, not independent signer/host/owner attestation.
 */
function snapshotSignedLabBundle(folder,snapshot){
  const source=fs.realpathSync(folder);
  if(source!==path.resolve(folder)||fs.lstatSync(folder).isSymbolicLink()||
     !fs.statSync(folder).isDirectory())throw Error('Unsafe signed release source directory');
  if(fs.existsSync(snapshot))throw Error('Signed release snapshot destination must not exist');
  fs.mkdirSync(snapshot,{mode:0o700});
  try{
    for(const [name,limit] of [['envelope.json',MAX_META],['envelope.sig',64],['package.zip',MAX_ZIP]]){
      const origin=path.join(source,name);
      const observed=assertFile(origin,limit);
      const fd=fs.openSync(origin,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
      let bytes;
      try{
        const opened=fs.fstatSync(fd);
        if(!opened.isFile()||opened.nlink!==1||opened.dev!==observed.dev||
           opened.ino!==observed.ino||opened.size!==observed.size)
          throw Error('Signed release input replaced while snapshotting');
        bytes=fs.readFileSync(fd);
        const after=fs.fstatSync(fd);
        if(bytes.length!==opened.size||after.size!==opened.size||
           after.mtimeMs!==opened.mtimeMs||after.ctimeMs!==opened.ctimeMs)
          throw Error('Signed release input changed while snapshotting');
      }finally{fs.closeSync(fd);}
      fs.writeFileSync(path.join(snapshot,name),bytes,{flag:'wx',mode:0o600});
    }
    return snapshot;
  }catch(e){fs.rmSync(snapshot,{recursive:true,force:true});throw e;}
}
function normalizeTrustKey(key){
  if(key && key.type==='private')throw Error('Private key is not a public trust anchor');
  const k=key && key.type==='public' ? key : crypto.createPublicKey(key);
  if(k.asymmetricKeyType!=='ed25519')throw Error('Only Ed25519 trust keys accepted');
  return k;
}
function keyFingerprint(key){
  const der=normalizeTrustKey(key).export({type:'spki',format:'der'});
  return sha(der);
}
function runArchive(command,source,destination){
  const proc=spawnSync('python3',[archiveScript,command,source,destination],{encoding:'utf8',timeout:30000,maxBuffer:8192});
  if(proc.error||proc.status!==0)throw Error('Archive '+command+' rejected: '+String(proc.error?.message||proc.stderr||'unknown').slice(0,500));
}
function compare(v1,v2){
  const parts=v=>{validVersion(v);return v.match(/^0\.(\d+)\.(\d+)-stage2\.(\d+)$/).slice(1).map(Number)};
  const a=parts(v1),b=parts(v2);
  for(let i=0;i<3;i++)if(a[i]!==b[i])return Math.sign(a[i]-b[i]);
  return 0;
}
function metadata(version,zipBytes,manifestHash,publicKey){
  return {
    format:'ai-site-cms-stage2-signed-lab-envelope-v1',
    version:validVersion(version),
    channel:'internal-laboratory',
    productionReady:false,
    signatureAlgorithm:'Ed25519',
    trustedKeyFingerprint:keyFingerprint(publicKey),
    archiveName:'package.zip',
    archiveBytes:zipBytes.length,
    archiveSha256:sha(zipBytes),
    packageManifestSha256:manifestHash
  };
}
function signedPayload(bytes){
  return Buffer.concat([Buffer.from('AI-SITE-CMS-STAGE2-LAB-ENVELOPE-V1\0','utf8'),bytes]);
}
function writeEnvelope(folder,info,privateKey){
  // Only for explicitly guarded CI/dev test, NOT a signing authority.
  const payload=canonical(info);
  const sig=crypto.sign(null,signedPayload(payload),privateKey);
  if(sig.length!==64)throw Error('Unexpected Ed25519 signature');
  fs.writeFileSync(path.join(folder,'envelope.json'),payload,{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(folder,'envelope.sig'),sig,{flag:'wx',mode:0o600});
}
function buildSignedLabBundle(source,folder,privateKey,publicKey){
  if(process.env.CI!=='true' ||process.env.CMS_ALLOW_EPHEMERAL_SIGNING_LAB!=='1')throw Error('Signing rehearsal requires explicit disposable CI flags');
  if(!privateKey||!publicKey)throw Error('Explicit ephemeral key pair required');
  if(!fs.existsSync(folder)||!fs.statSync(folder).isDirectory()||fs.readdirSync(folder).length)throw Error('Signed output must be empty directory');
  const manifest=verify(source);
  const zip=path.join(folder,'package.zip');
  runArchive('pack',source,zip);
  assertFile(zip,MAX_ZIP);
  const data=fs.readFileSync(zip);
  const expectedManifest=sha(fs.readFileSync(path.join(source,'private/package-manifest.json')));
  const info=metadata(manifest.releaseVersion,data,expectedManifest,publicKey);
  writeEnvelope(folder,info,privateKey);
  return info;
}
function verifyEnvelope(folder,publicKey,expectedVersion,minimumVersion){
  validVersion(expectedVersion);
  if(minimumVersion&&compare(expectedVersion,minimumVersion)<0)throw Error('Refusing package downgrade below trusted minimum');
  if(!publicKey)throw Error('Out-of-band trusted public key is required');
  const pem=normalizeTrustKey(publicKey);
  const fingerprint=keyFingerprint(pem);
  const envelopeFile=path.join(folder,'envelope.json');
  const sigFile=path.join(folder,'envelope.sig');
  const zipFile=path.join(folder,'package.zip');
  assertFile(envelopeFile,MAX_META);assertFile(sigFile,64);assertFile(zipFile,MAX_ZIP);
  const raw=fs.readFileSync(envelopeFile),sig=fs.readFileSync(sigFile);
  if(sig.length!==64||!crypto.verify(null,signedPayload(raw),pem,sig))throw Error('Untrusted or invalid detached Ed25519 signature');
  let info;
  try{info=JSON.parse(raw.toString('utf8'))}catch{throw Error('Invalid signed release metadata')}
  const zipBytes=fs.readFileSync(zipFile);
  const expected=metadata(expectedVersion,zipBytes,info.packageManifestSha256,pem);
  if(!/^[a-f0-9]{64}$/.test(info.packageManifestSha256||'')||
     Object.keys(info).sort().join(',')!==Object.keys(expected).sort().join(',')||
     canonical(expected).length!==raw.length||!crypto.timingSafeEqual(canonical(expected),raw)||
     info.trustedKeyFingerprint!==fingerprint)throw Error('Signed release metadata/version/hash does not match expected policy');
  return info;
}
function stageSignedLabBundle({folder,trustedPublicKey,expectedVersion,minimumVersion,lab}){
  if(!lab||!lab.root||!path.basename(lab.root).startsWith('ai-site-cms-rollout-lab-')||
     path.dirname(lab.root)!==fs.realpathSync(os.tmpdir()))throw Error('No disposable lab destination');
  // Snapshot BEFORE authentication: a concurrent source ZIP replacement
  // cannot change which exact signed bytes the secure extractor consumes.
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-signed-extract-'));
  try{
    const sealed=snapshotSignedLabBundle(folder,path.join(scratch,'sealed'));
    const info=verifyEnvelope(sealed,trustedPublicKey,expectedVersion,minimumVersion);
    const extracted=path.join(scratch,'extracted');
    fs.mkdirSync(extracted,{mode:0o700});
    runArchive('extract',path.join(sealed,'package.zip'),extracted);
    const verified=verify(extracted);
    if(verified.releaseVersion!==expectedVersion||
       sha(fs.readFileSync(path.join(extracted,'private/package-manifest.json')))!==info.packageManifestSha256)
      throw Error('Signed package manifest mismatch after extraction');
    return lab.stage(extracted);
  }finally{
    // CI ephemeral sandbox only; no caller-controlled deletion outside OS temp.
    if(path.basename(scratch).startsWith('ai-site-cms-signed-extract-') &&
       path.dirname(scratch)===fs.realpathSync(os.tmpdir()))fs.rmSync(scratch,{recursive:true,force:true});
  }
}
module.exports={buildSignedLabBundle,verifyEnvelope,stageSignedLabBundle,snapshotSignedLabBundle,metadata,canonical,signedPayload,writeEnvelope,runArchive,sha,compare};
