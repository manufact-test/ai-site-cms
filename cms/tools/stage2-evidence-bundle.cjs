'use strict';
/*
 * Operator-SIGNED but NOT authority-granting Stage2 offline evidence transfer.
 * Detached trust: caller MUST independently obtain and pin Ed25519 public key
 * digest; no public key embedded in bundle is trusted.
 * This tool never contacts a target, executes a probe, installs anything or
 * marks Stage2 accepted. No long-term operator private key in the CMS package.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const FORMAT='ai-site-cms-stage2-signed-evidence-v1';
const FIELDS=['scope','offline','https','database'];
const ROOT=path.resolve(__dirname,'..');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const encode=x=>JSON.stringify(x)+'\n';
const exact=(o,fields)=>o&&typeof o==='object'&&!Array.isArray(o)
  &&Object.keys(o).sort().join('|')===fields.slice().sort().join('|');
const assert=(test,reason)=>{if(!test)throw Error(reason);};
function isoMs(value){
  assert(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value),
    'invalid_utc_time');
  const n=Date.parse(value);
  assert(Number.isFinite(n)&&new Date(n).toISOString()===value,'invalid_utc_time');
  return n;
}
function safePrivateFile(file,max=262144,readExisting=true) {
  assert(typeof file==='string'&&file.length<=4096&&file.startsWith('/')
    &&!file.includes('\0')&&!file.includes('\\')
    &&path.normalize(file)===file&&!file.startsWith(ROOT+'/')
    &&file!==ROOT,'unsafe_operator_path');
  const parent=path.dirname(file);
  const p=fs.lstatSync(parent);
  assert(p.isDirectory()&&!p.isSymbolicLink()&&(p.mode&0o077)===0
    &&fs.realpathSync(parent)===parent,'unsafe_operator_parent');
  if(readExisting){
    const st=fs.lstatSync(file);
    assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1
      &&(st.mode&0o077)===0&&st.size>=4&&st.size<=max
      &&fs.realpathSync(file)===file,'unsafe_operator_file');
  }
  return file;
}
function readPrivate(file,max=262144){
  safePrivateFile(file,max,true);
  return fs.readFileSync(file);
}
function refuseFields(records) {
  assert(exact(records,FIELDS),'unsupported_evidence_members');
  for(const value of Object.values(records)){
    assert(value!==null&&typeof value==='object'&&!Array.isArray(value),
      'invalid_evidence_record');
  }
}
function keyDigest(key){
  const pub=crypto.createPublicKey(key);
  assert(pub.asymmetricKeyType==='ed25519','only_ed25519_allowed');
  return sha(pub.export({format:'der',type:'spki'}));
}
function makeSigned(records,privatePem,at=new Date()){
  refuseFields(records);
  assert(at instanceof Date&&Number.isFinite(at.getTime()),'invalid_time');
  const privateKey=crypto.createPrivateKey(privatePem);
  assert(privateKey.asymmetricKeyType==='ed25519','only_ed25519_allowed');
  const payload={
    format:FORMAT,
    issuedAt:at.toISOString(),
    expiresAt:new Date(at.getTime()+60*60*1000).toISOString(),
    nonce:crypto.randomBytes(16).toString('hex'),
    records
  };
  const privateKeyPublic=crypto.createPublicKey(privateKey);
  const bytes=Buffer.from(encode(payload));
  const signature=crypto.sign(null,bytes,privateKey).toString('base64url');
  return {
    format:FORMAT,payload,
    proof:{algorithm:'Ed25519',publicKeySpkiSha256:keyDigest(privateKeyPublic),
      signatureBase64url:signature},
    operatorIdentityIndependentlyVerified:false,
    ownerAuthorizationVerified:false,
    actualTargetHostIndependentlyVerified:false,
    stage2Accepted:false,stage3Authorized:false,productionReady:false
  };
}
function verifySigned(bundle,publicPem,trustedDigest,now=Date.now()){
  assert(exact(bundle,['format','payload','proof','operatorIdentityIndependentlyVerified',
    'ownerAuthorizationVerified','actualTargetHostIndependentlyVerified',
    'stage2Accepted','stage3Authorized','productionReady'])
    &&bundle.format===FORMAT
    &&bundle.operatorIdentityIndependentlyVerified===false
    &&bundle.ownerAuthorizationVerified===false
    &&bundle.actualTargetHostIndependentlyVerified===false
    &&bundle.stage2Accepted===false&&bundle.stage3Authorized===false
    &&bundle.productionReady===false,'invalid_signed_envelope');
  const p=bundle.payload,proof=bundle.proof;
  assert(exact(p,['format','issuedAt','expiresAt','nonce','records'])&&p.format===FORMAT
    &&typeof p.nonce==='string'&&/^[a-f0-9]{32}$/.test(p.nonce),
    'invalid_signed_payload');
  refuseFields(p.records);
  const issued=isoMs(p.issuedAt),expires=isoMs(p.expiresAt);
  assert(expires>issued&&expires-issued<=3600000
    &&now>=issued-60000&&now<expires,'expired_or_future_evidence');
  assert(exact(proof,['algorithm','publicKeySpkiSha256','signatureBase64url'])
    &&proof.algorithm==='Ed25519'
    &&typeof proof.signatureBase64url==='string'
    &&/^[A-Za-z0-9_-]{86}$/.test(proof.signatureBase64url)
    &&typeof trustedDigest==='string'&&/^[a-f0-9]{64}$/.test(trustedDigest),
    'invalid_evidence_signature_parameters');
  const digest=keyDigest(publicPem);
  assert(digest===trustedDigest&&digest===proof.publicKeySpkiSha256,
    'unrecognized_operator_signing_key');
  const signature=Buffer.from(proof.signatureBase64url,'base64url');
  assert(signature.length===64
    &&crypto.verify(null,Buffer.from(encode(p)),crypto.createPublicKey(publicPem),
      signature),'signed_evidence_tampered_or_invalid');
  return {
    records:p.records,
    signatureValidUnderPinnedKey:true,
    signingKeySpkiSha256:digest,
    signedPayloadSha256:sha(Buffer.from(encode(p))),
    observedAt:p.issuedAt,
    expiresAt:p.expiresAt,
    operatorIdentityIndependentlyVerified:false,
    ownerAuthorizationVerified:false,
    liveTargetHostVerified:false,
    stage2Accepted:false
  };
}
function cli(){
  const tokens=process.argv.slice(2),args={};
  for(const token of tokens){
    if(!token.startsWith('--'))throw Error('invalid_arguments');
    const pos=token.indexOf('=');
    const key=pos===-1?token:token.slice(0,pos);
    assert(['--sign','--private-key','--output',...FIELDS.map(x=>'--'+x)]
      .includes(key)&&args[key]===undefined,'invalid_arguments');
    if(pos<0){assert(key==='--sign','invalid_arguments');args[key]=true;}
    else{assert(key!=='--sign'&&token.length>pos+1,'invalid_arguments');
      args[key]=token.slice(pos+1);}
  }
  assert(Object.keys(args).length===7&&args['--sign']
    &&process.env.CMS_STAGE2_OPERATOR_SIGNING==='explicit-offline-attestation'
    , // an explicit offline signing action, NOT a hosting authorization
    'explicit_operator_signature_gate_required');
  const records={};
  for(const name of FIELDS){
    const bytes=readPrivate(args['--'+name]);
    records[name]=JSON.parse(bytes.toString('utf8'));
  }
  const key=readPrivate(args['--private-key'],8192);
  const output=safePrivateFile(args['--output'],262144,false);
  assert(!fs.existsSync(output),'no_overwriting_signed_evidence');
  const signed=makeSigned(records,key);
  fs.writeFileSync(output,encode(signed),{flag:'wx',mode:0o600});
  process.stdout.write('STAGE2_OPERATOR_OFFLINE_ATTESTATION_WRITTEN; no target proof, no approval\n');
}
if(require.main===module)try{cli();}catch{
  process.stderr.write('STAGE2_OPERATOR_SIGNATURE_REFUSED\n');process.exitCode=3;
}
module.exports={FORMAT,FIELDS,makeSigned,verifySigned,keyDigest,readPrivate,safePrivateFile};
