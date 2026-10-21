'use strict';
/*
 * OFFLINE ONLY: manually prepare a one-visit Stage2 read-only HTTPS owner
 * consent. No key generation, no network, no Hostinger, no stage acceptance.
 * Caller must independently establish owner identity and pin the public key
 * fingerprint BEFORE invoking this tool; supplying your own key/pin does not
 * establish authority over someone else's hosting.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const scope=require('./stage2-operator-scope.cjs');
const consent=require('./stage2-owner-consent.cjs');
const evidence=require('./stage2-evidence-bundle.cjs');
const ALLOWED=[
  '--sign','--scope-file','--owner-private-key','--trusted-owner-pubkey',
  '--trusted-owner-spki-sha256','--output'
];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function parameters(argv,env=process.env) {
  const args={};
  for(const token of argv){
    const i=token.indexOf('='),key=i<0?token:token.slice(0,i);
    if(!ALLOWED.includes(key)||Object.hasOwn(args,key)||
      (!token.startsWith('--'))||
      (i<0&&key!=='--sign')||
      (i>=0&&(key==='--sign'||i===token.length-1)))
      throw Error('invalid_owner_signing_arguments');
    args[key]=i<0?true:token.slice(i+1);
  }
  if(Object.keys(args).length!==ALLOWED.length ||
    ALLOWED.some(k=>!args[k])||
    env.CMS_STAGE2_OWNER_SIGNING!=='offline-explicit-owner-action'||
    env.CMS_ENV==='production'||env.CMS_ENV==='staging')
    throw Error('explicit_offline_owner_action_required');
  return args;
}
function prepare(args,now=Date.now()) {
  if(!Number.isFinite(now))throw Error('invalid_owner_signing_clock');
  const scopeFile=args['--scope-file'],privateFile=args['--owner-private-key'];
  const publicFile=args['--trusted-owner-pubkey'],output=args['--output'];
  const ownerDigest=args['--trusted-owner-spki-sha256'];
  if(typeof ownerDigest!=='string'||!/^[a-f0-9]{64}$/.test(ownerDigest))
    throw Error('independently_pinned_owner_fingerprint_required');
  if([scopeFile,privateFile,publicFile,output].some(x=>
    typeof x!=='string'||!path.isAbsolute(x)||x.length>4096||
    path.normalize(x)!==x||x.includes('\\')||x.includes('\0')))
    throw Error('noncanonical_private_path');
  const sourceDirs=[path.dirname(scopeFile),path.dirname(privateFile),
    path.dirname(publicFile),path.dirname(output)];
  if(new Set(sourceDirs).size!==4)
    throw Error('owner_key_scope_trust_and_output_must_be_separate');
  // Do NOT trust the record's embedded CMS/site origins as proof of ownership.
  // They only define the exact DNS scope the real owner must review.
  const first=evidence.readPrivate(scopeFile,4096);
  const decoded=JSON.parse(first.toString('utf8'));
  if(!decoded||typeof decoded!=='object'||Array.isArray(decoded)||
    typeof decoded.cmsOrigin!=='string'||typeof decoded.siteOrigin!=='string')
    throw Error('invalid_readonly_scope');
  const origins={cmsOrigin:decoded.cmsOrigin,siteOrigin:decoded.siteOrigin};
  const checked=scope.readScope(scopeFile,origins,now);
  const second=evidence.readPrivate(scopeFile,4096);
  if(!first.equals(second))throw Error('scope_changed_during_owner_signing');
  const fresh=scope.inspectScope(decoded,origins,now);
  if(fresh.operatorScopeRecordSha256!==checked.operatorScopeRecordSha256||
    fresh.originPairSha256!==checked.originPairSha256)
    throw Error('unbound_owner_scope');
  const privatePem=evidence.readPrivate(privateFile,8192);
  const publicPem=evidence.readPrivate(publicFile,512);
  const signer=crypto.createPrivateKey(privatePem);
  if(signer.asymmetricKeyType!=='ed25519')
    throw Error('owner_ed25519_signing_key_required');
  const signerDigest=evidence.keyDigest(crypto.createPublicKey(signer));
  if(evidence.keyDigest(publicPem)!==ownerDigest||signerDigest!==ownerDigest)
    throw Error('untrusted_owner_signer_or_key_mismatch');
  evidence.safePrivateFile(output,4096,false);
  if(fs.existsSync(output)||fs.existsSync(output+'/'))
    throw Error('never_overwrite_owner_consent');
  const payload={
    format:consent.FORMAT,
    scopeSha256:checked.operatorScopeRecordSha256,
    originsSha256:checked.originPairSha256,
    permission:'stage2-single-readonly-https-observation',
    expiresAt:checked.scopeExpiresAt,
    nonce:crypto.randomBytes(16).toString('hex'),
    productionReady:false
  };
  const signature=crypto.sign(null,Buffer.concat([
    consent.DOMAIN,Buffer.from(JSON.stringify(payload)+'\n','utf8')]),signer);
  const body=Buffer.from(JSON.stringify({
    format:consent.FORMAT,payload,signature:signature.toString('base64')
  })+'\n','utf8');
  if(body.length>4096)throw Error('signed_owner_consent_too_large');
  return {body,scope:checked,publicPem,ownerDigest,output};
}
function write(artifact,now=Date.now()) {
  const output=artifact.output,dir=path.dirname(output);
  const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|
    fs.constants.O_EXCL|fs.constants.O_NOFOLLOW;
  const fd=fs.openSync(output,flags,0o600);
  try {
    if(fs.writeSync(fd,artifact.body,0,artifact.body.length,0)!==
      artifact.body.length)throw Error('short_owner_consent_write');
    fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
  const d=fs.openSync(dir,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY);
  try{fs.fsyncSync(d);}finally{fs.closeSync(d);}
  const proof=consent.verify(output,artifact.publicPem,artifact.ownerDigest,
    artifact.scope,now);
  if(proof.ownerConsentSha256!==sha(artifact.body)||
    proof.cryptographicScopeSignatureVerified!==true)
    throw Error('owner_consent_readback_mismatch');
  return Object.freeze({
    cryptographicSignatureSelfVerified:true,
    consentSha256:proof.ownerConsentSha256,
    ownerKeyFingerprint:artifact.ownerDigest,
    independentOwnerIdentityVerified:false,
    permissionOnly:'stage2-single-readonly-https-observation',
    hostContacted:false,stage2Accepted:false,productionReady:false
  });
}
function main(){
  try {
    const now=Date.now();
    const args=parameters(process.argv.slice(2));
    write(prepare(args,now),now);
    process.stdout.write('STAGE2_OFFLINE_OWNER_CONSENT_WRITTEN; signer identity not established; no network or install\n');
  }catch {
    process.stderr.write('STAGE2_OFFLINE_OWNER_CONSENT_REFUSED\n');
    process.exitCode=3;
  }
}
if(require.main===module)main();
module.exports={parameters,prepare,write};
