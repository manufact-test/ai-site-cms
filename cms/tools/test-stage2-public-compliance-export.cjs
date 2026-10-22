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
const result=pub.build();
assert.equal(result.files,8);
assert.equal(result.stage2Accepted,false);
assert.equal(result.noCMSExecutable,true);
console.log('STAGE2_REVIEW_PUBLIC_EXPORT PASS: 43-component exact ZIP, 8 files, secret/foreign-file/forged-acceptance fail closed.');
