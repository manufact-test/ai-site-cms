'use strict';
// Functional review handoff: actual verified package -> offline ZIP ->
// imported private worksheet -> server-side strict decision inspection.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const cp=require('node:child_process'),assert=require('node:assert/strict');
const kit=require('./stage2-independent-review-kit.cjs');
const {stable}=require('./stage2-license-dossier.cjs');
const built=kit.build(),source=kit.sources();
assert.equal(built.files,8);
assert.equal(kit.verify(built.file).archiveSha256,built.archiveSha256);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-legal-intake-'));
try{
  fs.chmodSync(temp,0o700);
  const worksheet=JSON.parse(source.files['WORKSHEET.json'].toString('utf8'));
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
  console.log('STAGE2_INDEPENDENT_REVIEW PASS: 8 compliance-only files; real ZIP byte verification; 43->42 pending and one rejection; forged approval/package/tamper refused; no host access.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
