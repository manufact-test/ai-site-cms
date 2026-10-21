'use strict';
/*
 * Offline, package-bound HUMAN dependency review. No network, no legal opinion,
 * no automatic Stage2 approval. A correct Ed25519 signature authenticates
 * worksheet bytes to a pinned key, not the human's identity/qualification.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const {createDossier,stable,digest}=require('./stage2-license-dossier.cjs');
const {readPrivate,safePrivateFile,keyDigest}=require('./stage2-evidence-bundle.cjs');
const FORMAT='ai-site-cms-stage2-human-dependency-review-v1';
const SIGNED='ai-site-cms-stage2-signed-human-review-v1';
const DOMAIN=Buffer.from('AI-SITE-CMS-STAGE2-HUMAN-DEPENDENCY-REVIEW-V1\0');
const CHECKS=['upstreamLicenseChecked','noticeObligationsChecked',
  'advisoriesChecked','distributionScopeChecked'];
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const exact=(o,fields)=>!!o&&typeof o==='object'&&!Array.isArray(o)
  &&Object.keys(o).sort().join('|')===fields.slice().sort().join('|');
const validSha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const url=x=>{
  if(typeof x!=='string'||x.length>500||x.includes('\\'))return false;
  try{
    const u=new URL(x);
    return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash
      &&!u.search&&u.hostname!==''&&!['localhost','127.0.0.1'].includes(u.hostname)
      &&!/\.(?:local|internal|test|invalid|example)$/.test(u.hostname);
  }catch{return false;}
};
function dossierCheck(d){
  assert(d&&d.format==='ai-site-cms-stage2-license-review-v1'
    &&d.componentCount===43&&d.phpRuntimeComponentCount===14
    &&d.browserRuntimeComponentCount===1&&d.buildAndOptionalComponents===28
    &&Array.isArray(d.components)&&d.components.length===43
    &&validSha(d.packageManifestSha256)&&validSha(d.noticeSha256)
    &&d.independentLegalApproval===false&&d.stage2Accepted===false
    &&d.stage3Authorized===false&&d.productionReady===false,
    'unreviewed_dossier');
  const seen=new Set();
  for(const c of d.components){
    assert(c&&['composer','npm'].includes(c.ecosystem)
      &&typeof c.name==='string'&&c.name.length<=200
      &&typeof c.version==='string'&&c.version.length<=120
      &&c.manuallyApproved===false,'unreviewed_dependency_row');
    const id=c.ecosystem+':'+c.name+'@'+c.version;
    assert(!seen.has(id),'duplicate_dependency');seen.add(id);
  }
}
function buildWorksheet(d){
  dossierCheck(d);
  return {
    format:FORMAT,scope:'offline-review-input-not-legal-authorization',
    dossierSha256:digest(stable(d)),
    packageManifestSha256:d.packageManifestSha256,noticeSha256:d.noticeSha256,
    componentCount:43,
    rows:d.components.map(c=>({
      component:c.ecosystem+':'+c.name+'@'+c.version,
      lockedComponentSha256:digest(stable(c)),
      disposition:'pending',
      upstreamLicenseChecked:false,noticeObligationsChecked:false,
      advisoriesChecked:false,distributionScopeChecked:false,
      evidenceUrls:[],reviewerReference:null,reviewedOn:null,notes:''
    })),
    independentLegalApproval:false,stage2Accepted:false,stage3Authorized:false
  };
}
const rowFields=['component','lockedComponentSha256','disposition',...CHECKS,
  'evidenceUrls','reviewerReference','reviewedOn','notes'];
const sheetFields=['format','scope','dossierSha256','packageManifestSha256',
  'noticeSha256','componentCount','rows','independentLegalApproval',
  'stage2Accepted','stage3Authorized'];
function inspectWorksheet(d,w,now=Date.now()){
  const expected=buildWorksheet(d);
  assert(Number.isFinite(now)&&exact(w,sheetFields)
    &&w.format===FORMAT&&w.scope===expected.scope
    &&w.dossierSha256===expected.dossierSha256
    &&w.packageManifestSha256===expected.packageManifestSha256
    &&w.noticeSha256===expected.noticeSha256
    &&w.componentCount===43
    &&w.independentLegalApproval===false&&w.stage2Accepted===false
    &&w.stage3Authorized===false
    &&Array.isArray(w.rows)&&w.rows.length===43,
    'stale_or_forged_review_worksheet');
  let approved=0,rejected=0,pending=0;
  for(let i=0;i<43;i++){
    const row=w.rows[i],baseline=expected.rows[i];
    assert(exact(row,rowFields)
      &&row.component===baseline.component
      &&row.lockedComponentSha256===baseline.lockedComponentSha256
      &&['pending','approved','rejected'].includes(row.disposition)
      &&CHECKS.every(k=>typeof row[k]==='boolean')
      &&Array.isArray(row.evidenceUrls)&&row.evidenceUrls.length<=8
      &&row.evidenceUrls.every(url)
      &&typeof row.notes==='string'&&row.notes.length<=2000
      &&!row.notes.includes('\0')
      &&(row.reviewerReference===null||
        typeof row.reviewerReference==='string'
        &&/^[A-Za-z0-9][A-Za-z0-9_.:@/-]{2,119}$/.test(row.reviewerReference)),
      'invalid_review_row');
    if(row.disposition==='pending'){
      assert(row.reviewedOn===null,'pending_review_must_not_claim_completion');
      pending++;continue;
    }
    assert(typeof row.reviewedOn==='string'
      &&/^\d{4}-\d\d-\d\d$/.test(row.reviewedOn)
      &&new Date(row.reviewedOn+'T00:00:00.000Z').toISOString()
        ===row.reviewedOn+'T00:00:00.000Z'
      &&Date.parse(row.reviewedOn+'T00:00:00.000Z')<=now
      &&row.reviewerReference!==null
      &&row.evidenceUrls.length>=2,'review_evidence_missing');
    if(row.disposition==='rejected'){
      assert(row.notes.trim().length>=12,'rejection_rationale_required');
      rejected++;continue;
    }
    assert(CHECKS.every(k=>row[k]===true)
      &&row.notes.trim().length>=12,'approved_review_incomplete');
    approved++;
  }
  return Object.freeze({
    total:43,approved,rejected,pending,
    readyForSeparateIndependentLegalDecision:approved===43,
    reviewerIdentityIndependentlyVerified:false,
    independentLegalApproval:false,
    stage2Accepted:false,stage3Authorized:false,productionReady:false
  });
}
function isoMs(x){
  assert(typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)
    &&Number.isFinite(Date.parse(x))
    &&new Date(Date.parse(x)).toISOString()===x,'invalid_review_time');
  return Date.parse(x);
}
function makeAttestation(d,w,privatePem,at=new Date()){
  const report=inspectWorksheet(d,w,at.getTime());
  assert(report.readyForSeparateIndependentLegalDecision,
    'all_43_human_review_rows_required_for_signature');
  const key=crypto.createPrivateKey(privatePem);
  assert(key.asymmetricKeyType==='ed25519','ed25519_required');
  const payload={
    format:SIGNED,attestedAt:at.toISOString(),
    worksheetSha256:digest(stable(w)),
    dossierSha256:w.dossierSha256,
    packageManifestSha256:w.packageManifestSha256,
    noticeSha256:w.noticeSha256,componentCount:43
  };
  const signature=crypto.sign(null,Buffer.concat([DOMAIN,Buffer.from(stable(payload))]),
    key).toString('base64url');
  return {
    format:SIGNED,payload,
    proof:{algorithm:'Ed25519',
      publicKeySpkiSha256:keyDigest(crypto.createPublicKey(key)),
      signatureBase64url:signature},
    reviewerIdentityIndependentlyVerified:false,
    independentLegalApproval:false,stage2Accepted:false,stage3Authorized:false
  };
}
function verifyAttestation(d,w,attestation,publicPem,pin,now=Date.now()){
  const status=inspectWorksheet(d,w,now);
  assert(status.readyForSeparateIndependentLegalDecision
    &&exact(attestation,['format','payload','proof','reviewerIdentityIndependentlyVerified',
      'independentLegalApproval','stage2Accepted','stage3Authorized'])
    &&attestation.format===SIGNED
    &&attestation.reviewerIdentityIndependentlyVerified===false
    &&attestation.independentLegalApproval===false
    &&attestation.stage2Accepted===false&&attestation.stage3Authorized===false,
    'unsigned_or_incomplete_legal_review');
  const p=attestation.payload,q=attestation.proof;
  assert(exact(p,['format','attestedAt','worksheetSha256','dossierSha256',
    'packageManifestSha256','noticeSha256','componentCount'])
    &&p.format===SIGNED&&p.worksheetSha256===digest(stable(w))
    &&p.dossierSha256===w.dossierSha256
    &&p.packageManifestSha256===w.packageManifestSha256
    &&p.noticeSha256===w.noticeSha256&&p.componentCount===43,
    'review_package_signature_binding_failed');
  const when=isoMs(p.attestedAt);
  assert(Number.isFinite(now)&&when<=now+60000
    &&now-when<=30*86400000,'review_attestation_too_old_or_future');
  assert(exact(q,['algorithm','publicKeySpkiSha256','signatureBase64url'])
    &&q.algorithm==='Ed25519'&&validSha(pin)
    &&typeof q.signatureBase64url==='string'
    &&/^[A-Za-z0-9_-]{86}$/.test(q.signatureBase64url),
    'missing_trusted_reviewer_pin');
  const key=crypto.createPublicKey(publicPem);
  const fingerprint=keyDigest(key);
  assert(fingerprint===pin&&fingerprint===q.publicKeySpkiSha256,
    'reviewer_pin_mismatch');
  const sig=Buffer.from(q.signatureBase64url,'base64url');
  assert(sig.length===64&&sig.toString('base64url')===q.signatureBase64url
    &&crypto.verify(null,Buffer.concat([DOMAIN,Buffer.from(stable(p))]),key,sig),
    'invalid_review_signature');
  return Object.freeze({
    ...status,signatureValidUnderPinnedKey:true,
    signedWorksheetSha256:p.worksheetSha256,signerSpkiSha256:pin,
    reviewerIdentityIndependentlyVerified:false,
    independentLegalApproval:false,stage2Accepted:false,
    stage3Authorized:false,productionReady:false
  });
}
function readCanonical(file){
  const bytes=readPrivate(file,131072);
  const value=JSON.parse(bytes.toString('utf8'));
  assert(bytes.equals(Buffer.from(stable(value))),'noncanonical_review_bytes');
  return value;
}
function writePrivate(file,value){
  safePrivateFile(file,131072,false);
  assert(!fs.existsSync(file),'review_file_must_not_be_overwritten');
  const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT
    |fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
  try{
    const bytes=Buffer.from(stable(value));
    assert(bytes.length<=131072&&fs.writeSync(fd,bytes,0,bytes.length,0)===bytes.length,
      'review_write_failed');
    fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
}
function cli(argv=process.argv.slice(2)){
  const params={};
  const valid=['--prepare','--sign','--verify','--worksheet','--output',
    '--private-key','--attestation','--public-key','--fingerprint'];
  for(const token of argv){
    const i=token.indexOf('='),key=i<0?token:token.slice(0,i);
    assert(valid.includes(key)&&!Object.hasOwn(params,key),'invalid_review_argument');
    if(i<0){assert(['--prepare','--sign','--verify'].includes(key),
      'invalid_review_argument');params[key]=true;}
    else{assert(!['--prepare','--sign','--verify'].includes(key)&&i<token.length-1,
      'invalid_review_argument');params[key]=token.slice(i+1);}
  }
  const action=['--prepare','--sign','--verify'].filter(k=>params[k]);
  const required={'--prepare':['--output'],
    '--sign':['--worksheet','--private-key','--output'],
    '--verify':['--worksheet','--attestation','--public-key','--fingerprint']};
  assert(action.length===1&&Object.keys(params).length===1+required[action[0]].length
    &&required[action[0]].every(k=>params[k]),'invalid_review_command');
  const dossier=createDossier();
  if(action[0]==='--prepare'){
    writePrivate(params['--output'],buildWorksheet(dossier));
    process.stdout.write('43 human review rows created; all PENDING; NO legal approval\n');
  }else if(action[0]==='--sign'){
    assert(process.env.CMS_STAGE2_LEGAL_REVIEW_SIGNING==='explicit-offline-attestation',
      'review_signing_gate_required');
    const worksheet=readCanonical(params['--worksheet']);
    const privateKey=readPrivate(params['--private-key'],8192);
    writePrivate(params['--output'],makeAttestation(dossier,worksheet,privateKey));
    process.stdout.write('Pinned-key review attestation created; identity/legal signoff NOT established\n');
  }else{
    const worksheet=readCanonical(params['--worksheet']);
    const attestation=readCanonical(params['--attestation']);
    const publicPem=readPrivate(params['--public-key'],8192);
    const report=verifyAttestation(dossier,worksheet,attestation,
      publicPem,params['--fingerprint']);
    process.stdout.write(JSON.stringify(report)+'\n');
  }
}
if(require.main===module)try{cli();}catch{
  process.stderr.write('STAGE2_HUMAN_DEPENDENCY_REVIEW_REFUSED\n');process.exitCode=3;
}
module.exports={FORMAT,SIGNED,buildWorksheet,inspectWorksheet,
  makeAttestation,verifyAttestation,readCanonical,writePrivate,cli};
