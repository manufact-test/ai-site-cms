'use strict';
/*
 * Stage 2: OFFLINE three-party public-key possession ceremony.
 * It binds distinct publisher/owner/operator keys to one SOURCE and package
 * manifest without creating keys, accessing Hostinger, or trusting signatures
 * as proof of real-world identity, independent audit or deployment permission.
 * All participating keys/pins and private evidence remain outside GitHub.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const {readPrivate,safePrivateFile,keyDigest}=require('./stage2-evidence-bundle.cjs');
const ROLES=['publisher','owner','operator'];
const FORMAT='ai-site-cms-stage2-role-possession-ceremony-v1';
const PROOF='ai-site-cms-stage2-role-possession-proof-v1';
const DOMAIN=Buffer.from('AI-SITE-CMS-STAGE2-ROLE-POSSESSION-V1\0');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const encode=o=>Buffer.from(JSON.stringify(o)+'\n','utf8');
const assert=(test,why)=>{if(!test)throw Error(why);};
const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)
  &&Object.keys(o).join('|')===keys.join('|');
const hex=(s,n)=>typeof s==='string'&&new RegExp('^[0-9a-f]{'+n+'}$').test(s);
function readCanonical(file,max=8192){
  const b=readPrivate(file,max),o=JSON.parse(b.toString('utf8'));
  assert(b.equals(encode(o)),'noncanonical_private_record');
  return o;
}
function writePrivate(file,bytes){
  safePrivateFile(file,65536,false);
  assert(!fs.existsSync(file),'refuse_existing_output');
  const fd=fs.openSync(file,fs.constants.O_CREAT|fs.constants.O_EXCL|
    fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,0o600);
  try{
    assert(fs.writeSync(fd,bytes,0,bytes.length,0)===bytes.length,'short_private_write');
    fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
  const dir=fs.openSync(require('node:path').dirname(file),fs.constants.O_RDONLY|
    fs.constants.O_DIRECTORY);
  try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
}
function pinsChecked(pins){
  assert(exact(pins,ROLES)&&ROLES.every(k=>hex(pins[k],64))
    &&new Set(ROLES.map(k=>pins[k])).size===3,'distinct_pinned_three_party_keys_required');
  return pins;
}
function publicKey(file,expectedPin){
  const b=readPrivate(file,8192),key=crypto.createPublicKey(b);
  assert(key.asymmetricKeyType==='ed25519'&&keyDigest(key)===expectedPin,
    'public_key_does_not_match_independent_pin');
  return key;
}
function timestamp(s){
  assert(typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s),
    'invalid_ceremony_clock');
  const n=Date.parse(s);
  assert(Number.isFinite(n)&&new Date(n).toISOString()===s,'invalid_ceremony_clock');
  return n;
}
function validateChallenge(challenge,pins,sourceSha,packageSha,now=Date.now()){
  pinsChecked(pins);
  assert(exact(challenge,['format','repository','sourceSha','packageManifestSha256',
      'issuedAt','expiresAt','nonce','publicPins','permission','stage2Accepted'])
    &&challenge.format===FORMAT
    &&challenge.repository==='manufact-test/ai-site-cms'
    &&hex(sourceSha,40)&&challenge.sourceSha===sourceSha
    &&hex(packageSha,64)&&challenge.packageManifestSha256===packageSha
    &&hex(challenge.nonce,64)
    &&challenge.permission==='none-offline-possession-only'
    &&challenge.stage2Accepted===false
    &&exact(challenge.publicPins,ROLES)
    &&ROLES.every(k=>challenge.publicPins[k]===pins[k]),
    'ceremony_not_bound_to_exact_source_package_and_trust_pins');
  const issued=timestamp(challenge.issuedAt),expires=timestamp(challenge.expiresAt);
  assert(expires-issued===30*60*1000&&now>=issued-60000&&now<expires,
    'ceremony_expired_or_not_yet_valid');
  return challenge;
}
function prepare({publicFiles,pins,sourceSha,packageSha,output,now=Date.now()}){
  pinsChecked(pins);
  assert(hex(sourceSha,40)&&hex(packageSha,64),'exact_source_and_package_hash_required');
  assert(Number.isSafeInteger(now),'invalid_ceremony_clock');
  ROLES.forEach(role=>publicKey(publicFiles[role],pins[role]));
  const c={format:FORMAT,repository:'manufact-test/ai-site-cms',
    sourceSha,packageManifestSha256:packageSha,
    issuedAt:new Date(now).toISOString(),expiresAt:new Date(now+30*60*1000).toISOString(),
    nonce:crypto.randomBytes(32).toString('hex'),publicPins:{...pins},
    permission:'none-offline-possession-only',stage2Accepted:false};
  writePrivate(output,encode(c));
  return {challengeSha256:sha(encode(c)),expiresAt:c.expiresAt,roleCount:3,
    identityVerified:false,stage2Accepted:false};
}
function signedMessage(challenge,role){
  assert(ROLES.includes(role),'invalid_role');
  return Buffer.concat([DOMAIN,Buffer.from(role+'\0'),encode(challenge)]);
}
function sign({role,challengeFile,privateFile,publicFile,pins,sourceSha,packageSha,
  output,now=Date.now()}){
  assert(ROLES.includes(role),'unknown_signing_role');
  const c=validateChallenge(readCanonical(challengeFile),pins,sourceSha,packageSha,now);
  publicKey(publicFile,pins[role]);
  const privateKey=crypto.createPrivateKey(readPrivate(privateFile,8192));
  assert(privateKey.asymmetricKeyType==='ed25519'
    &&keyDigest(crypto.createPublicKey(privateKey))===pins[role],
    'private_key_not_bound_to_role_pin');
  const sig=crypto.sign(null,signedMessage(c,role),privateKey);
  assert(sig.length===64,'invalid_ed25519_signature');
  const proof={format:PROOF,role,challengeSha256:sha(encode(c)),
    publicKeySpkiSha256:pins[role],signatureBase64:sig.toString('base64'),
    authorizationGranted:false};
  writePrivate(output,encode(proof));
  return {role,proofSha256:sha(encode(proof)),authorizationGranted:false,
    identityVerified:false,stage2Accepted:false};
}
function safeHtml(s){return String(s).replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));}
function renderReport(r){
  const row=role=>'<tr><th>'+role+'</th><td><code>'+safeHtml(r.publicPins[role])+
    '</code></td><td>VALID SIGNATURE · identity not verified</td></tr>';
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'+
   '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">'+
   '<meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<title>Stage 2 — Role possession proof</title><style>'+
   'body{font:15px/1.6 system-ui,sans-serif;background:#f4f6fa;color:#192335;margin:0;padding:32px}'+
   'main{max-width:1000px;margin:auto;background:white;border:1px solid #d7deea;border-radius:16px;padding:32px}'+
   'h1{font-size:25px}p.warn{background:#fff2d8;padding:15px;border-radius:9px}'+
   'table{width:100%;border-collapse:collapse}td,th{padding:14px;text-align:left;border-bottom:1px solid #e6eaf1}'+
   'code{overflow-wrap:anywhere;font-size:12px}footer{margin-top:22px;color:#596478}</style></head><body><main>'+
   '<h1>Stage 2 · Three independent key roles</h1>'+
   '<p class="warn"><strong>Cryptographic possession ONLY.</strong> '+
   'This report does not identify key owners, prove secure key custody, validate legal/security review, '+
   'authorize access to Hostinger, approve Stage 2, or start Stage 3.</p>'+
   '<p>Source commit: <code>'+safeHtml(r.sourceSha)+'</code></p>'+
   '<p>Package manifest: <code>'+safeHtml(r.packageManifestSha256)+'</code></p>'+
   '<p>Challenge SHA-256: <code>'+safeHtml(r.challengeSha256)+'</code></p>'+
   '<p>Issued: '+safeHtml(r.issuedAt)+' · Expires: '+safeHtml(r.expiresAt)+'</p>'+
   '<table><thead><tr><th>Role</th><th>Supplied pinned SPKI SHA-256</th><th>Proof result</th></tr></thead><tbody>'+
   ROLES.map(row).join('')+'</tbody></table><footer>For human review only. '+
   'Signer identities and all external permissions remain unverified.</footer>'+
   '</main></body></html>\n';
}
function verify({challengeFile,proofFiles,publicFiles,pins,sourceSha,packageSha,
  output,htmlOutput,now=Date.now()}){
  const c=validateChallenge(readCanonical(challengeFile),pins,sourceSha,packageSha,now);
  const digest=sha(encode(c));
  for(const role of ROLES){
    const p=readCanonical(proofFiles[role]);
    assert(exact(p,['format','role','challengeSha256','publicKeySpkiSha256',
      'signatureBase64','authorizationGranted'])
      &&p.format===PROOF&&p.role===role
      &&p.challengeSha256===digest&&p.publicKeySpkiSha256===pins[role]
      &&p.authorizationGranted===false
      &&typeof p.signatureBase64==='string'
      &&/^[A-Za-z0-9+/]{86}==$/.test(p.signatureBase64),
      'missing_or_invalid_role_proof');
    const key=publicKey(publicFiles[role],pins[role]);
    const sig=Buffer.from(p.signatureBase64,'base64');
    assert(sig.length===64&&sig.toString('base64')===p.signatureBase64
      &&crypto.verify(null,signedMessage(c,role),key,sig),
      'invalid_or_swapped_ed25519_role_signature');
  }
  const report={format:'ai-site-cms-stage2-role-possession-report-v1',
    repository:c.repository,sourceSha:c.sourceSha,
    packageManifestSha256:c.packageManifestSha256,
    challengeSha256:digest,issuedAt:c.issuedAt,expiresAt:c.expiresAt,
    publicPins:c.publicPins,threeDistinctRoleKeys:true,
    allThreeDetachedProofsValid:true,
    signerIdentityIndependentlyVerified:false,
    keyCustodyAndRevocationIndependentlyApproved:false,
    noSodiumTargetVerified:false,legalReviewAccepted:false,
    authorizedHostAccess:false,stage2Accepted:false,stage3Authorized:false};
  // A human-readable report cannot be silently stored next to publicly
  // accessible source; both reports need separate new private files.
  assert(output!==htmlOutput,'separate_private_report_paths_required');
  safePrivateFile(output,65536,false);
  safePrivateFile(htmlOutput,65536,false);
  assert(!fs.existsSync(output)&&!fs.existsSync(htmlOutput),
    'refuse_overwriting_existing_ceremony_report');
  writePrivate(output,encode(report));
  writePrivate(htmlOutput,Buffer.from(renderReport(report),'utf8'));
  return report;
}
const FLAGS={
  prepare:['publisher-public','owner-public','operator-public','publisher-pin','owner-pin',
    'operator-pin','source-sha','package-sha','out'],
  sign:['role','challenge','private','public','publisher-pin','owner-pin',
    'operator-pin','source-sha','package-sha','out'],
  verify:['challenge','publisher-proof','owner-proof','operator-proof',
    'publisher-public','owner-public','operator-public','publisher-pin','owner-pin',
    'operator-pin','source-sha','package-sha','out','html-out']
};
function cli(argv=process.argv.slice(2)){
  const [cmd,...rest]=argv;
  assert(Object.hasOwn(FLAGS,cmd),'expected_prepare_sign_or_verify');
  const o={};
  for(const arg of rest){
    const pos=arg.indexOf('=');
    assert(arg.startsWith('--')&&pos>2&&pos<arg.length-1,'bad_ceremony_argument');
    const key=arg.slice(2,pos),value=arg.slice(pos+1);
    assert(FLAGS[cmd].includes(key)&&!Object.hasOwn(o,key),'unknown_or_duplicate_argument');
    o[key]=value;
  }
  assert(Object.keys(o).length===FLAGS[cmd].length,'missing_ceremony_arguments');
  const pins=Object.fromEntries(ROLES.map(k=>[k,o[k+'-pin']]));
  const common={pins,sourceSha:o['source-sha'],packageSha:o['package-sha'],output:o.out};
  if(cmd==='prepare')return prepare({...common,publicFiles:Object.fromEntries(
    ROLES.map(k=>[k,o[k+'-public']]))});
  if(cmd==='sign')return sign({...common,role:o.role,challengeFile:o.challenge,
    privateFile:o.private,publicFile:o.public});
  return verify({...common,challengeFile:o.challenge,htmlOutput:o['html-out'],
    publicFiles:Object.fromEntries(ROLES.map(k=>[k,o[k+'-public']])),
    proofFiles:Object.fromEntries(ROLES.map(k=>[k,o[k+'-proof']]))});
}
if(require.main===module){
  try{
    const result=cli();
    process.stdout.write('STAGE2_OFFLINE_ROLE_PROOF_VERIFIED_OR_PREPARED '+
      (result.challengeSha256||result.proofSha256)+'; human identity not proven, no hosting approval\n');
  }catch(error){
    process.stderr.write('STAGE2_OFFLINE_ROLE_PROOF_REFUSED '+error.message+'\n');
    process.exitCode=3;
  }
}
module.exports={ROLES,FORMAT,PROOF,prepare,sign,verify,cli,
  validateChallenge,readCanonical,renderReport};
