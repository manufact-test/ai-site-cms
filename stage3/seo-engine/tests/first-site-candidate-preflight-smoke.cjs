'use strict';
/* Fast offline object contract without opening real customer files or public HTTPS. */
const assert=require('node:assert/strict');
const PRE=require('../lib/first-site-candidate-preflight.cjs');
const a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64);
const status={format:'manufact-seo-first-site-candidate-v1',siteId:'demo-site',
 publishedVersion:8,provider:'netlify',officialStaticManifestSha256:b,
 publicArchiveSha256:c,blockingGates:0,upgradeBlockingRisks:0,blockingGateIds:[],
 status:'MANUAL-ACCEPTANCE-REQUIRED',operatorMustApprove:true,actualHostWrites:0,
 remoteDeployPerformed:false,prOrMergePerformed:false,realProductionHttpsVerified:false};
const summary={format:'manufact-seo-first-site-check-v1',siteId:'demo-site',
 publishedVersion:8,sourceSiteSha256:a,ownerPublishedSourceRevisionClaim:12,
 staticExport:{staticManifestSha256:b},
 release:{blockingGates:0,blockerIds:[]},automaticRelease:false};
const upload={format:'manufact-seo-static-upload-bundle-v1',siteId:'demo-site',
 publishedVersion:8,provider:'netlify',officialStaticManifestSha256:b,
 files:[{file:'index.html'}],filesVerified:1};
const zip={siteId:'demo-site',publishedVersion:8,sha256:c,
 officialManifestSha256:b,fileCount:1,operatorPrivateFilesIncluded:false};
const owner={siteId:'demo-site',publishedVersion:8,sourceRevisionClaim:12,
 sealedApprovedSourceSha256:a,officialStaticManifestSha256:b};
const ok=PRE.consistent(status,summary,upload,zip,owner);
assert.equal(ok.siteId,'demo-site');
assert.equal(ok.networkRequests,0);
assert.equal(ok.operatorMustApprove,true);
assert.throws(()=>PRE.consistent(status,summary,upload,{...zip,sha256:a},owner),/ZIP/);
assert.throws(()=>PRE.consistent(status,summary,upload,zip,{...owner,sourceRevisionClaim:13}),/another owner/);
assert.throws(()=>PRE.consistent({...status,remoteDeployPerformed:true},summary,upload,zip,owner),/authorization/);
assert.throws(()=>PRE.consistent({...status,siteId:'other'},summary,upload,zip,owner),/siteId/);
assert.throws(()=>PRE.consistent({...status,blockingGates:1},summary,upload,zip,owner),/blockers/);
const post={format:'manufact-seo-post-deploy-release-verification-v1',
 siteId:'demo-site',publishedVersion:8,officialStaticManifestSha256:b,
 candidatePublicZipSha256:c,disposition:'NOT-READY',finalReleaseAuthorized:false};
assert.equal(PRE.postDeploy(ok,post),true);
assert.throws(()=>PRE.postDeploy(ok,{...post,candidatePublicZipSha256:a}),/another/);
assert.throws(()=>PRE.postDeploy(ok,{...post,finalReleaseAuthorized:true}),/another/);
console.log('Private first-site candidate preflight smoke PASS (offline object contract)');
