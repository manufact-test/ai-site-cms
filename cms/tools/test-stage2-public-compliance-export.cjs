'use strict';
// One public release boundary test on the actual 43-component pinned package.
const assert=require('node:assert/strict');
const kit=require('./stage2-independent-review-kit.cjs');
const pub=require('./stage2-public-compliance-export.cjs');
const materials=kit.sources();
assert.equal(pub.contentPolicy(materials.files).components,43);
const forbidden={...materials.files,'private-key.pem':Buffer.from('PRIVATE_KEY_CONTENT')};
assert.throws(()=>pub.contentPolicy(forbidden));
const leaked={...materials.files,'OPEN-FIRST.txt':Buffer.from(
  materials.files['OPEN-FIRST.txt'].toString('utf8')+'\nCMS_DB_PASSWORD=never-publish\n')};
assert.throws(()=>pub.contentPolicy(leaked));
const wrong={...materials.files,'WORKSHEET.json':Buffer.from(JSON.stringify({
  ...JSON.parse(materials.files['WORKSHEET.json']),stage2Accepted:true}))};
assert.throws(()=>pub.contentPolicy(wrong));
const crypto=require('./stage2-sodium-review.cjs');
assert.equal(pub.PUBLIC_ALLOWED.length,10);
const clone=src=>({...src});
const mutation=(name,mutator)=>{
  const changed=clone(materials.files),parsed=JSON.parse(changed[name].toString('utf8'));
  mutator(parsed);
  changed[name]=Buffer.from(JSON.stringify(parsed,null,2)+'\n');
  assert.throws(()=>pub.contentPolicy(changed));
};
mutation('CRYPTO-DOSSIER.json',d=>{d.candidate.shippedInCurrentPackage=true;});
mutation('CRYPTO-DOSSIER.json',d=>{d.candidate.sourceReference='0'.repeat(40);});
mutation('CRYPTO-WORKSHEET.json',w=>{w.stage2Accepted=true;});
mutation('CRYPTO-WORKSHEET.json',w=>{w.disposition='reviewed';});
mutation('CONTENT-SHA256.json',v=>{v.files=v.files.slice(0,7);});
const extra=clone(materials.files);
extra['unreviewed-candidate-secret.json']=Buffer.from('{"internal":true}');
assert.throws(()=>pub.contentPolicy(extra));
const missing=clone(materials.files);
delete missing['CRYPTO-REVIEW.html'];
assert.throws(()=>pub.contentPolicy(missing));
const artifact=pub.build();
const result=artifact;
assert.equal(result.files,11);
assert.equal(result.stage2Accepted,false);
assert.equal(result.noCMSExecutable,true);
console.log('STAGE2_REVIEW_PUBLIC_EXPORT PASS: 43-component exact ZIP plus unshipped candidate, 11 files, secret/foreign-file/forged-acceptance fail closed.');
