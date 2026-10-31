'use strict';
const assert=require('node:assert/strict');
const {review}=require('../lib/php-local-visual-review.cjs');
const site={siteId:'pilot',pages:[{id:'page-home',path:'/'},
 {id:'page-services',path:'/services/'}]};
const note=(i,device,resolved=false)=>({
 findingId:'visual-'+String(i).padStart(24,'0'),pageId:'page-home',path:'/',
 device,scrollY:500,version:1,resolved,
 note:'Private operator note about a visual issue',
 createdBy:'private-owner-account',createdAt:'2026-10-29T10:00:00Z'
});
const input={available:true,revision:7,historical:true,
 findings:[note(1,'mobile'),note(2,'tablet',true),note(3,'desktop')],openCount:2};
const status=review(site,input,7);
assert.equal(status.checkedFindingCount,3);
assert.equal(status.openCount,2);
assert.equal(status.resolvedCount,1);
assert.equal(status.findings.filter(x=>x.severity==='error').length,2);
assert.equal(status.pagesWithOpenFindings,1);
assert.deepEqual(status.devicesWithOpenFindings,['desktop','mobile']);
assert.equal(status.operatorNotesExposed,false);
assert.equal(status.clientApprovalVerified,false);
const exported=JSON.stringify(status);
assert.ok(!exported.includes('Private operator note'));
assert.ok(!exported.includes('private-owner-account'));
assert.ok(!exported.includes(note(1,'mobile').findingId));
assert.throws(()=>review(site,input,8),/exact published CMS sourceRevision/);
assert.throws(()=>review(site,{...input,openCount:1},7),/openCount contradicts/);
assert.throws(()=>review(site,{...input,findings:[note(1,'mobile'),note(1,'mobile')],openCount:2},7),/duplicate ID/);
assert.throws(()=>review(site,{...input,findings:[note(1,'mobile'),{...note(2,'tablet'),path:'/other/'}],openCount:1},7),/stale page/);
const unavailable=review(site,{available:false,revision:7,historical:false,
 findings:[],openCount:0,migrationRequired:true},7);
assert.ok(unavailable.findings.some(x=>x.code==='php-visual:visual-review-storage-unavailable'));
assert.equal(unavailable.openCount,0);
console.log('Source-pinned owner visual review: open findings, safe redaction and revision mismatch PASS');
