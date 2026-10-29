'use strict';
/* One focused product smoke: first-site summary, original blocker bundle and post-deploy claim. */
const assert=require('node:assert/strict');
const COCKPIT=require('../lib/first-site-launch-cockpit.cjs');
const sha='a'.repeat(64),manifest='b'.repeat(64);
const summary={
 format:'manufact-seo-first-site-check-v1',siteId:'site-industrial-demo',
 sourceSiteSha256:sha,publishedVersion:7,automaticRelease:false,
 htmlPages:2,staticExport:{supplied:true,matchingContentAndMedia:true,sha256CheckedFiles:9,staticManifestSha256:manifest},
 cmsPublishedSiteMatchesApprovedAfterRemap:true,publicStaticParity:{comparable:true,publiclyExposedOperatorFiles:0},
 publicMediaBytes:{allCapturedByteDigestsMatch:true},heads:{actualFindings:0},semantics:{actualFindings:0},
 navigation:{actualFindings:0},designGraph:{actualFindings:0},typedComponents:{actualFindings:0},
 forms:{technicalFindings:0},
 release:{blockingGates:1,mandatoryManualChecks:6,blockerIds:['first-site-missing-live-form-POST']}
};
const bundle={format:'manufact-seo-review-bundle-v1',siteId:summary.siteId,readOnly:true,
 approvedSiteSource:{fileSha256:sha},release:{blockers:[{gateId:'first-site-missing-live-form-POST',
  message:'Form endpoint <script>alert(1)</script> has not been tested.'}]}};
const r=COCKPIT.render(summary,bundle);
assert.equal(r.disposition,'BLOCKED BY FIRST-SITE GATES');
assert.equal(r.summary.technicalMatchClaimed,false);
assert.equal(r.releaseAuthorized,false);
assert(r.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
assert(!r.html.includes('<script>'));
const cleaned=JSON.parse(JSON.stringify(summary));
cleaned.release={blockingGates:0,mandatoryManualChecks:6,blockerIds:[]};
const cleanBundle={...bundle,release:{blockers:[]}};
const post={format:'manufact-seo-post-deploy-release-verification-v1',siteId:summary.siteId,
 publishedVersion:7,officialStaticManifestSha256:manifest,
 disposition:'TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED',postDeployBlockingReasons:[],
 finalReleaseAuthorized:false,productionHostWrites:0,checkedPages:2,checkedRedirects:1,
 totalAssets:3,sha256MatchedAssets:3,publicEvidenceCohortFresh:true};
const verified=COCKPIT.render(cleaned,cleanBundle,post);
assert.equal(verified.disposition,'TECHNICALLY MATCHED — MANUAL SIGNOFF REQUIRED');
assert.equal(verified.releaseAuthorized,false);
assert.throws(()=>COCKPIT.render(summary,bundle,post),/contradicts/);
assert.throws(()=>COCKPIT.render(cleaned,cleanBundle,{...post,officialStaticManifestSha256:'c'.repeat(64)}),/mismatches/);
assert.throws(()=>COCKPIT.render(summary,{...bundle,release:{blockers:[]}}),/blocking gate/);
process.stdout.write('Private first-site cockpit focused smoke PASS.\n');
