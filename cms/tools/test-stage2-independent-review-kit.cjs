'use strict';
// Functional review handoff: actual verified package -> offline ZIP ->
// imported private worksheet -> server-side strict decision inspection.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const cp=require('node:child_process'),assert=require('node:assert/strict');
const kit=require('./stage2-independent-review-kit.cjs');
const sodium=require('./stage2-sodium-review.cjs');
const {stable}=require('./stage2-license-dossier.cjs');
const built=kit.build(),source=kit.sources();
assert.equal(built.files,10);
assert.equal(kit.verify(built.file).archiveSha256,built.archiveSha256);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-legal-intake-'));
try{
  fs.chmodSync(temp,0o700);
  const worksheet=JSON.parse(source.files['WORKSHEET.json'].toString('utf8'));
  const cryptoWorksheet=JSON.parse(source.files['CRYPTO-WORKSHEET.json'].toString('utf8'));
  const candidateDossier=sodium.dossier();
  const start=sodium.inspect(candidateDossier,cryptoWorksheet);
  assert.equal(start.humanWorksheetDisposition,'pending');
  assert.equal(start.lockedDependenciesRemain43,true);
  assert.equal(start.cryptoApproved,false);
  assert.equal(source.files['CRYPTO-REVIEW.html'].includes(Buffer.from('Independently verified original commit')),true);
  const cryptoFile=path.join(temp,'crypto-review.json');
  const candidateIntake=()=>{
    fs.writeFileSync(cryptoFile,stable(cryptoWorksheet),{mode:0o600});
    return cp.spawnSync(process.execPath,[path.join(__dirname,'stage2-sodium-review.cjs'),
      '--inspect='+cryptoFile],{encoding:'utf8',timeout:60000,maxBuffer:131072});
  };
  assert.equal(candidateIntake().status,0,'initial independent crypto review import');
  cryptoWorksheet.disposition='reviewed';
  cryptoWorksheet.upstreamSourceVerified=true;
  cryptoWorksheet.licenseAndNoticeReviewed=true;
  cryptoWorksheet.securityAndAdvisoriesReviewed=true;
  cryptoWorksheet.noSodiumTargetPlanReviewed=true;
  cryptoWorksheet.evidenceUrls=['https://github.com/paragonie/sodium_compat',
    'https://github.com/paragonie/sodium_compat/releases'];
  cryptoWorksheet.reviewerReference='CI-SYNTHETIC-REVIEWER';
  cryptoWorksheet.reviewedOn=new Date().toISOString().slice(0,10);
  cryptoWorksheet.notes='Synthetic review fixture; no human assessed crypto or licenses.';
  let candidateResult=candidateIntake();
  assert.equal(candidateResult.status,0,candidateResult.stderr);
  let cryptoVerdict=JSON.parse(candidateResult.stdout);
  assert.equal(cryptoVerdict.readyForSeparateIndependentHumanDecision,true);
  assert.equal(cryptoVerdict.cryptoApproved,false);
  assert.equal(cryptoVerdict.stage2Accepted,false);
  cryptoWorksheet.legalApproved=true;
  assert.equal(candidateIntake().status,3,'false crypto/legal GO rejected');
  cryptoWorksheet.legalApproved=false;
  cryptoWorksheet.reference='0'.repeat(40);
  assert.equal(candidateIntake().status,3,'wrong upstream source commit rejected');
  cryptoWorksheet.reference=sodium.REF;
  cryptoWorksheet.securityAndAdvisoriesReviewed=false;
  assert.equal(candidateIntake().status,3,'missing cryptographic human review rejected');
  cryptoWorksheet.securityAndAdvisoriesReviewed=true;
  cryptoWorksheet.evidenceUrls=[];
  assert.equal(candidateIntake().status,3,'review without evidence rejected');
  cryptoWorksheet.evidenceUrls=['https://github.com/paragonie/sodium_compat',
    'https://github.com/paragonie/sodium_compat/releases'];
  assert.equal(candidateIntake().status,0,'valid independent review worksheet input restored');
  
  const filename=path.join(temp,'worksheet.json');
  const intake=()=>{
    fs.writeFileSync(filename,stable(worksheet),{mode:0o600});
    return cp.spawnSync(process.execPath,[path.join(__dirname,'stage2-human-license-review.cjs'),
      '--inspect','--worksheet='+filename],{encoding:'utf8',timeout:60000,maxBuffer:131072});
  };
  let result=intake();
  assert.equal(result.status,0,result.stderr);
  let s=JSON.parse(result.stdout);
  assert.equal(s.pending,43);assert.equal(s.approved,0);
  assert.equal(s.independentLegalApproval,false);
  const row=worksheet.rows[0];
  row.disposition='rejected';
  row.evidenceUrls=['https://github.com/example/license','https://github.com/example/advisory'];
  row.reviewerReference='CI-SYNTHETIC-REVIEWER';
  row.reviewedOn=new Date().toISOString().slice(0,10);
  row.notes='Synthetic CI rejection only, not an actual independent legal opinion.';
  result=intake();assert.equal(result.status,0,result.stderr);
  s=JSON.parse(result.stdout);
  assert.equal(s.pending,42);assert.equal(s.rejected,1);
  assert.equal(s.stage2Accepted,false);
  worksheet.stage2Accepted=true;
  assert.equal(intake().status,3,'False acceptance must fail closed');
  worksheet.stage2Accepted=false;worksheet.packageManifestSha256='0'.repeat(64);
  assert.equal(intake().status,3,'Wrong signed package binding must be refused');
  const altered={...source,files:{...source.files,'OPEN-FIRST.txt':Buffer.from('tampered content')}};
  assert.throws(()=>kit.verify(built.file,altered),'Archive tampering must be rejected');
  console.log('STAGE2_INDEPENDENT_REVIEW PASS: 10 compliance-only files; real ZIP byte verification; 43->42 pending and one rejection; forged approval/package/tamper refused; no host access.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
