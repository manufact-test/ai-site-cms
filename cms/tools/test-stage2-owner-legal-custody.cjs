'use strict';
// Integration of the independently pinned 43-component reviewer signature with
// the actual owner decision packet. CI uses EPHEMERAL synthetic reviewer keys
// and makes no claim of legal acceptance, ownership or target-host access.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const legal=require('./stage2-license-dossier.cjs');
const human=require('./stage2-human-license-review.cjs');
const owner=require('./stage2-owner-decision.cjs');
const evidence=require('./stage2-evidence-bundle.cjs');
let passed=0;
function ok(v,label){assert.ok(v,label);passed++;}
function refuse(fn,label){assert.throws(fn,undefined,label);passed++;}
const clone=v=>JSON.parse(JSON.stringify(v));
const dossier=legal.createDossier();
const w=human.buildWorksheet(dossier);
for(const r of w.rows){
  r.disposition='approved';
  r.upstreamLicenseChecked=true;
  r.noticeObligationsChecked=true;
  r.advisoriesChecked=true;
  r.distributionScopeChecked=true;
  r.evidenceUrls=['https://example.org/upstream','https://example.org/advisories'];
  r.reviewerReference='CI-SYNTHETIC-REVIEWER';
  r.reviewedOn=new Date().toISOString().slice(0,10);
  r.notes='Synthetic CI assessment, no human has reviewed these dependencies.';
}
const pair=crypto.generateKeyPairSync('ed25519');
const privatePem=pair.privateKey.export({format:'pem',type:'pkcs8'});
const publicPem=pair.publicKey.export({format:'pem',type:'spki'});
const pinned=evidence.keyDigest(pair.publicKey);
const attestation=human.makeAttestation(dossier,w,privatePem);
const opts={worksheet:w,attestation,publicKey:publicPem,trustedDigest:pinned};
const blank=owner.assemble(dossier);
ok(blank.signedLegalReviewProof===null
   &&blank.evidenceCustody.legalReviewTransport==='unattached'
   &&blank.remainingCriteria.find(x=>x.id==='license_review').state
    ==='independent_human_approval_required',
   'no legal proof must never be implied from bare 43 lock inventory');
const packet=owner.assemble(dossier,{},null,null,opts);
ok(packet.signedLegalReviewProof.signatureCryptographicallyVerifiedUnderPinnedKey,
   'owner packet independently verifies correct Ed25519 legal attestation');
ok(packet.signedLegalReviewProof.reviewRowsAcceptedForSeparateHumanDecision===43
   &&packet.signedLegalReviewProof.pendingRows===0
   &&packet.signedLegalReviewProof.rejectedRows===0,
   'all 43 actual package lock rows are present');
ok(packet.signedLegalReviewProof.signedWorksheetSha256===legal.digest(legal.stable(w))
   &&packet.signedLegalReviewProof.reviewerPublicPinSha256===pinned
   &&packet.signedLegalReviewProof.matchesCurrentPackageAndNotice,
   'signed worksheet, independently pinned key and exact NOTICE/package hashes');
ok(packet.evidenceCustody.signedLegalReviewVerified
   &&packet.evidenceCustody.legalReviewTransport==='ed25519-signed-43-row-review'
   &&packet.evidenceCustody.legalReviewerIdentityIndependentlyVerified===false
   &&packet.evidenceCustody.independentHumanLicenseApproval===false,
   'transport authentication cannot forge signatory identity or actual legal approval');
ok(packet.remainingCriteria.find(x=>x.id==='license_review').state
     ==='signed_complete_review_manual_legal_signoff_still_required'
   &&packet.remainingCriteria.length===8,
   'review gate records signed worksheet without bypassing human acceptance gates');
ok(packet.independentLicenseApproval===false
   &&packet.stage2Accepted===false&&packet.stage3Authorized===false
   &&packet.databaseConnectedByThisTool===false
   &&packet.networkAttemptedByThisTool===false,
   'even signed synthetic review grants neither Stage2 nor install permission');
const html=owner.render(packet);
ok(html.includes('All 43 reviewed dependency records are signed')
   &&html.includes('NOT established')
   &&html.includes('Not accepted.')
   &&!html.includes('<script'),
   'owner HTML clearly discloses limits without interactive acceptance');
ok(owner.render(blank).includes('No complete independently key-pinned'),
   'unsigned/unattached report is visibly different to the owner');
let changed=clone(w);changed.rows[0].notes+=' altered';
refuse(()=>owner.assemble(dossier,{},null,null,{...opts,worksheet:changed}),
   'post-signature notes alteration cannot reach owner report');
changed=clone(w);changed.rows[2].lockedComponentSha256='f'.repeat(64);
refuse(()=>owner.assemble(dossier,{},null,null,{...opts,worksheet:changed}),
   'altered dependency binding cannot reach owner report');
changed=clone(w);changed.rows[0].disposition='pending';
refuse(()=>owner.assemble(dossier,{},null,null,{...opts,worksheet:changed}),
   'incomplete worksheet cannot masquerade as signed complete review');
changed=clone(attestation);changed.payload.noticeSha256='0'.repeat(64);
refuse(()=>owner.assemble(dossier,{},null,null,{...opts,attestation:changed}),
   'different NOTICE cannot be silently accepted');
changed=clone(attestation);changed.independentLegalApproval=true;
refuse(()=>owner.assemble(dossier,{},null,null,{...opts,attestation:changed}),
   'attestation cannot claim automatic independent legal approval');
const outsider=crypto.generateKeyPairSync('ed25519');
refuse(()=>owner.assemble(dossier,{},null,null,{...opts,
   publicKey:outsider.publicKey.export({format:'pem',type:'spki'})}),
   'review signed by mismatched public key must be refused');
refuse(()=>owner.assemble(dossier,{},null,null,{...opts,trustedDigest:'0'.repeat(64)}),
   'self-provided reviewer public key is not an independent pin');
refuse(()=>owner.assemble(dossier,{},null,null,{...opts,attestation:null}),
   'partial signed-review submission is not downgraded to unsigned');
const otherDossier=clone(dossier);otherDossier.noticeSha256='f'.repeat(64);
refuse(()=>owner.assemble(otherDossier,{},null,null,opts),
   'different source package notice fingerprint cannot reuse signed review');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ai-stage2-owner-legal-'));
try{
  const dirs=['worksheet','reviewer-signature','trusted-public','duplicate'];
  for(const d of dirs)fs.mkdirSync(path.join(root,d),{mode:0o700});
  const worksheet=path.join(root,'worksheet','worksheet.json');
  const signed=path.join(root,'reviewer-signature','signed.json');
  const pub=path.join(root,'trusted-public','reviewer.pem');
  const key=path.join(root,'duplicate','private.pem');
  fs.writeFileSync(worksheet,legal.stable(w),{mode:0o600});
  fs.writeFileSync(signed,legal.stable(attestation),{mode:0o600});
  fs.writeFileSync(pub,publicPem,{mode:0o600});
  fs.writeFileSync(key,privatePem,{mode:0o600});
  const ownerTool=path.join(__dirname,'stage2-owner-decision.cjs');
  const reviewerTool=path.join(__dirname,'stage2-human-license-review.cjs');
  const reviewArgs=['--legal-worksheet='+worksheet,
    '--legal-attestation='+signed,'--legal-trusted-pubkey='+pub,
    '--legal-trusted-spki-sha256='+pinned];
  const run=(tool,args,env={})=>spawnSync(process.execPath,[tool,...args],{
    encoding:'utf8',env:{...process.env,...env}});
  let cli=run(ownerTool,['--build',...reviewArgs]);
  ok(cli.status===0,'full owner CLI verifies independently pinned complete signed reviewer attestation');
  const report=JSON.parse(fs.readFileSync(path.join(legal.OUT,
    'stage2-owner-decision.json'),'utf8'));
  ok(report.signedLegalReviewProof?.signedWorksheetSha256
    ===legal.digest(legal.stable(w))&&report.stage2Accepted===false,
    'CLI packet persisted with complete signed legal custody but no approval');
  cli=run(ownerTool,['--build',...reviewArgs.slice(0,3)]);
  ok(cli.status===3,'CLI rejects incomplete reviewer pin');
  cli=run(ownerTool,['--build',...reviewArgs,
    '--legal-trusted-spki-sha256='+pinned]);
  ok(cli.status===3,'CLI refuses repeated permission parameters');
  const copied=path.join(root,'worksheet','signed.json');
  fs.writeFileSync(copied,legal.stable(attestation),{mode:0o600});
  cli=run(reviewerTool,['--verify','--worksheet='+worksheet,
    '--attestation='+copied,'--public-key='+pub,'--fingerprint='+pinned]);
  ok(cli.status===3,'reviewer CLI refuses co-located worksheet and signed receipt');
  cli=run(reviewerTool,['--sign','--worksheet='+worksheet,
    '--private-key='+key,'--output='+path.join(root,'duplicate','new.json')],{
    CMS_STAGE2_LEGAL_REVIEW_SIGNING:'explicit-offline-attestation'});
  ok(cli.status===3,'reviewer signing CLI refuses co-located private key and output');
  fs.writeFileSync(worksheet,JSON.stringify(w),{mode:0o600});
  cli=run(ownerTool,['--build',...reviewArgs]);
  ok(cli.status===3,'owner CLI refuses alternate whitespace and noncanonical reviewer JSON');
  fs.rmSync(worksheet);
  fs.symlinkSync(signed,worksheet);
  cli=run(ownerTool,['--build',...reviewArgs]);
  ok(cli.status===3,'owner CLI refuses symlink reviewer input');
}finally{fs.rmSync(root,{recursive:true,force:true});}
process.stdout.write('Stage2 owner + human legal review signed custody: '+passed+
  ' assertions PASS (synthetic ephemeral keys only; no target writes, legal approval or Stage3).\n');
