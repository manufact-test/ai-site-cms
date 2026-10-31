'use strict';
/* Focused pure-contract smoke. Real PHP, HTTPS and client release are separate. */
const assert=require('node:assert/strict');
const R=require('../lib/first-site-lead-relay.cjs');
const d='a'.repeat(64),e='b'.repeat(64),f='c'.repeat(64),g='d'.repeat(64);
const candidate={format:'manufact-seo-first-site-candidate-v1',siteId:'demo',
 publishedVersion:3,provider:'netlify',officialStaticManifestSha256:e,
 publicArchiveSha256:f,staticUploadRelativeDir:'static-upload/public',
 publicArchiveRelativeFile:'public-site.zip',technicalReviewRelativeDir:'seo-report',
 phpEvidenceRelativeDir:'local-php-evidence',blockingGates:0,blockingGateIds:[],
 upgradeBlockingRisks:0,status:'MANUAL-ACCEPTANCE-REQUIRED',operatorMustApprove:true,
 actualHostWrites:0,remoteDeployPerformed:false,realProductionHttpsVerified:false};
const summary={format:'manufact-seo-first-site-check-v1',siteId:'demo',publishedVersion:3,
 ownerPublishedSourceRevisionClaim:4,sourceSiteSha256:d,
 staticExport:{staticManifestSha256:e},release:{blockingGates:0,blockerIds:[]}};
const upload={format:'manufact-seo-static-upload-bundle-v1',siteId:'demo',
 publishedVersion:3,officialStaticManifestSha256:e,provider:'netlify',
 files:[{}],filesVerified:1};
const zip={sha256:f,officialManifestSha256:e,publishedVersion:3,fileCount:1};
const hashes={candidate:d,summary:e,upload:f,zip:g};
const raw={candidate,summary,upload,zip,inputSha256:hashes};
let r=R.build(raw);
assert.equal(r.stage,'PUBLIC-EVIDENCE-MISSING');
assert.equal(r.deploymentAuthorized,false);
assert.match(R.markdown(r),/manual/i);
const post={format:'manufact-seo-post-deploy-release-verification-v1',siteId:'demo',
 publishedVersion:3,officialStaticManifestSha256:e,candidatePublicZipSha256:f,
 originalCandidateBlockingGates:0,publishedHost:'https://example.org',
 disposition:'TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED',postDeployBlockingReasons:[],
 finalReleaseAuthorized:false,productionHostWrites:0,actualNetworkRequests:0,
 inputEvidenceAuthenticated:false};
r=R.build({...raw,post,inputSha256:{...hashes,post:d}});
assert.equal(r.stage,'PUBLIC-TECHNICALLY-MATCHED-MANUAL-SIGNOFF');
assert.equal(r.clientApproved,false);
assert.throws(()=>R.build({...raw,post:{...post,candidatePublicZipSha256:d},
 inputSha256:{...hashes,post:d}}),/another candidate/);
assert.throws(()=>R.build({...raw,candidate:{...candidate,blockingGates:1}}),/blockers/);
const indexing={format:'manufact-seo-indexing-intelligence-v1',readOnly:true,
 siteId:'demo',blueprintSha256:d,publicOrigin:'https://example.org/',summary:{actions:3}};
const history={format:'manufact-seo-search-history-v1',readOnly:true,
 siteId:'demo',blueprintSha256:d,publicOrigin:'https://example.org/',summary:{actions:5}};
r=R.build({...raw,post,indexing,history,inputSha256:{...hashes,post:d,blueprint:d,indexing:e,searchHistory:f}});
assert.equal(r.evidence.indexingManualActions,3);
assert.equal(r.evidence.searchManualActions,5);
assert.throws(()=>R.build({...raw,post,indexing:{...indexing,publicOrigin:'https://other.org/'},
 inputSha256:{...hashes,post:d,blueprint:d,indexing:f}}),/host differs/);
console.log('first-site lead relay smoke: OK (offline contract only)');
