'use strict';
// Out-of-band, owner-pinned Ed25519 consent for a FUTURE read-only Stage2
// target inspection. The pin/PEM MUST come from an independent channel.
// This module neither creates owner identity nor visits any network/host.
// Passing this test is never approval to deploy/install or perform DB writes.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const FORMAT='ai-site-cms-stage2-owner-readonly-consent-v1';
const DOMAIN=Buffer.from('AI-SITE-CMS-STAGE2-OWNER-READONLY-CONSENT-V1\0');
const DER_PREFIX=Buffer.from('302a300506032b6570032100','hex');
const ENVELOPE=['format','payload','signature'];
const PAYLOAD=['format','scopeSha256','originsSha256','permission','expiresAt','nonce','productionReady'];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function exact(o,keys){
  return !!o&&typeof o==='object'&&!Array.isArray(o)&&
    Object.keys(o).join('|')===keys.join('|');
}
function secureFile(file,max){
  if(typeof file!=='string'||file.length>4096||!path.isAbsolute(file)||
    path.normalize(file)!==file||file.includes('\\')||file.includes('\0'))
    throw Error('unsafe_consent_path');
  const parent=path.dirname(file),parentStat=fs.lstatSync(parent);
  if(!parentStat.isDirectory()||parentStat.isSymbolicLink()||
    fs.realpathSync(parent)!==parent||(parentStat.mode&0o077)!==0)
    throw Error('unsafe_consent_directory');
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
    (stat.mode&0o077)!==0||stat.size<20||stat.size>max||
    fs.realpathSync(file)!==file)
    throw Error('unsafe_consent_file');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{
    const a=fs.fstatSync(fd);
    if(!a.isFile()||a.nlink!==1||(a.mode&0o077)!==0||
      a.ino!==stat.ino||a.dev!==stat.dev||a.size!==stat.size)
      throw Error('consent_inode_changed');
    const bytes=fs.readFileSync(fd),b=fs.fstatSync(fd);
    if(bytes.length!==a.size||a.ino!==b.ino||a.dev!==b.dev||
      a.mtimeMs!==b.mtimeMs||a.size!==b.size||bytes.includes(0))
      throw Error('consent_changed_during_read');
    if(fs.realpathSync(parent)!==parent)throw Error('consent_parent_changed');
    return bytes;
  }finally{fs.closeSync(fd);}
}
function verify(file,ownerPublicPem,ownerFingerprint,scope,now=Date.now()){
  if(!/^[a-f0-9]{64}$/.test(ownerFingerprint||'')||
    !scope||typeof scope!=='object'||
    !/^[a-f0-9]{64}$/.test(scope.operatorScopeRecordSha256||'')||
    !/^[a-f0-9]{64}$/.test(scope.originPairSha256||'')||
    typeof scope.scopeExpiresAt!=='string'||!Number.isFinite(now))
    throw Error('missing_out_of_band_pin_or_scope');
  if(path.dirname(file)===path.dirname(ownerPublicPem))
    throw Error('trust_anchor_must_be_out_of_band');
  const pem=secureFile(ownerPublicPem,512).toString('utf8');
  const key=crypto.createPublicKey(pem);
  const der=key.export({type:'spki',format:'der'});
  if(der.length!==44||!der.subarray(0,12).equals(DER_PREFIX)||
    sha(der)!==ownerFingerprint)
    throw Error('trusted_owner_public_pin_mismatch');
  const bytes=secureFile(file,4096);
  let envelope;
  try{envelope=JSON.parse(bytes.toString('utf8'));}
  catch{throw Error('invalid_owner_consent_json');}
  if(!exact(envelope,ENVELOPE)||envelope.format!==FORMAT||
    !exact(envelope.payload,PAYLOAD)||
    !bytes.equals(Buffer.from(JSON.stringify(envelope)+'\n','utf8')))
    throw Error('noncanonical_owner_consent');
  const p=envelope.payload;
  if(p.format!==FORMAT||p.permission!=='stage2-single-readonly-https-observation'||
    p.productionReady!==false||
    !/^[a-f0-9]{32}$/.test(p.nonce||'')||
    p.scopeSha256!==scope.operatorScopeRecordSha256||
    p.originsSha256!==scope.originPairSha256||
    p.expiresAt!==scope.scopeExpiresAt||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(p.expiresAt)||
    !Number.isFinite(Date.parse(p.expiresAt))||
    new Date(Date.parse(p.expiresAt)).toISOString()!==p.expiresAt.replace('Z','.000Z')||
    now>=Date.parse(p.expiresAt))
    throw Error('expired_or_mismatched_owner_consent');
  if(typeof envelope.signature!=='string'||
    !/^[A-Za-z0-9+/]{86}==$/.test(envelope.signature))
    throw Error('invalid_owner_signature_encoding');
  const sig=Buffer.from(envelope.signature,'base64');
  if(sig.length!==64||sig.toString('base64')!==envelope.signature||
    !crypto.verify(null,Buffer.concat([DOMAIN,
      Buffer.from(JSON.stringify(p)+'\n','utf8')]),key,sig))
    throw Error('untrusted_owner_signature');
  return Object.freeze({
    ownerConsentSha256:sha(bytes),
    ownerPublicPinSha256:ownerFingerprint,
    consentScopeSha256:p.scopeSha256,
    consentOriginsSha256:p.originsSha256,
    cryptographicScopeSignatureVerified:true,
    independentOwnerIdentityEstablished:false,
    productionReady:false,
    networkAttempted:false
  });
}
/**
 * Permanently burn this exact consent in the operator's private LOCAL scope
 * directory before the first DNS or HTTP attempt. O_EXCL is the concurrency
 * barrier; even incomplete/crashed markers fail closed and are never
 * automatically removed. This limits accidental repeated visits, not an
 * adversary with filesystem-owner privileges who can erase the journal.
 */
function consumeOnce(file,verified){
  if(!verified||verified.cryptographicScopeSignatureVerified!==true||
    !/^[a-f0-9]{64}$/.test(verified.ownerConsentSha256||''))
    throw Error('unverified_consent_cannot_be_consumed');
  const parent=path.dirname(file);
  const st=fs.lstatSync(parent);
  if(!st.isDirectory()||st.isSymbolicLink()||
    fs.realpathSync(parent)!==parent||(st.mode&0o077)!==0)
    throw Error('unsafe_consumption_directory');
  const marker=path.join(parent,
    'owner-consent-consumed-'+verified.ownerConsentSha256+'.json');
  const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|
    fs.constants.O_EXCL|fs.constants.O_NOFOLLOW;
  const fd=fs.openSync(marker,flags,0o600);
  try{
    const bytes=Buffer.from(JSON.stringify({
      format:'ai-site-cms-stage2-owner-consent-consumed-v1',
      consentSha256:verified.ownerConsentSha256,
      reuseForbidden:true,
      targetHostVisitRecorded:false,
      stage2Accepted:false
    })+'\n');
    if(fs.writeSync(fd,bytes,0,bytes.length,0)!==bytes.length)
      throw Error('short_consent_consumption_record');
    fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
  // Flush the name as well as the file bytes when supported. A failure still
  // aborts the host visit, leaving a conservatively spent token.
  const dir=fs.openSync(parent,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY);
  try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
  return Object.freeze({consentConsumedLocally:true,
    consumptionDigest:verified.ownerConsentSha256,networkAttempted:false});
}
module.exports={FORMAT,DOMAIN,PAYLOAD,verify,consumeOnce};
