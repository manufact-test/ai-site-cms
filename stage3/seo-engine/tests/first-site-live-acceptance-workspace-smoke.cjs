'use strict';
/* Private human acceptance page rendered only against exact release and SHA records. */
const assert=require('node:assert/strict');
const WORK=require('../lib/seo-operator-workspace.cjs');
const SHA=x=>x.repeat(64);
const site='site-demo',source=SHA('a'),manifest=SHA('b'),summarySha=SHA('c'),
 postSha=SHA('d'),contractSha=SHA('e'),zip=SHA('f');
const summary={format:'manufact-seo-first-site-check-v1',siteId:site,
 sourceSiteSha256:source,publishedVersion:9,ownerPublishedSourceRevisionClaim:11,
 automaticRelease:false,release:{blockingGates:0,blockerIds:[],mandatoryManualChecks:6},
 staticExport:{staticManifestSha256:manifest}};
const post={format:'manufact-seo-post-deploy-release-verification-v1',siteId:site,
 publishedVersion:9,officialStaticManifestSha256:manifest,candidatePublicZipSha256:zip,
 originalCandidateBlockingGates:0,disposition:'TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED',
 publishedHost:'https://example.org',
 postDeployBlockingReasons:[],finalReleaseAuthorized:false,productionHostWrites:0};
const contract={format:'manufact-seo-first-site-lead-relay-v1',siteId:site,
 readOnly:true,deploymentAuthorized:false,
 identity:{officialStaticManifestSha256:manifest,publicZipSha256:zip},
 inputSha256:{summary:summarySha,post:postSha},
 evidence:{originalLocalBlockers:0}};
const report={format:'manufact-seo-first-site-live-acceptance-review-v1',
 siteId:site,publishedVersion:9,ownerSourceRevisionClaim:11,
 sourceContractSha256:contractSha,officialStaticManifestSha256:manifest,
 observedPublicHttpsHostClaim:'https://example.org',
 releaseAuthorized:false,clientApprovalAuthenticated:false,
 status:'HUMAN-EVIDENCE-INCOMPLETE',originalTechnicalEvidenceMatched:true,
 checks:{required:10,passed:7,failed:0,pending:3,
  realFormOccurrencesExpected:1,operatorFormPostReceipts:0,
  passedFormReceipts:0,failedFormReceipts:0,operatorFormInventorySigned:false}};
const data={firstSite:{summary,postDeploy:post,summarySha,postDeploySha:postSha},
 liveAcceptance:{report,contract,contractSha}};
const w=WORK.build(data);
assert.equal(w.overview.humanAcceptanceIncluded,true);
assert.equal(w.overview.humanAcceptanceStatus,'HUMAN-EVIDENCE-INCOMPLETE');
assert.equal(w.overview.releaseAuthorized,false);
assert(w.homeHtml.includes('human.html'));
assert(w.humanHtml.includes('Human First-Site Acceptance'));
assert(w.humanHtml.includes('manual'));
assert.throws(()=>WORK.build({...data,liveAcceptance:{...data.liveAcceptance,
 contractSha:SHA('9')}}),/different release/);
assert.throws(()=>WORK.build({...data,liveAcceptance:{...data.liveAcceptance,
 contract:{...contract,deploymentAuthorized:true}}}),/different release/);
assert.throws(()=>WORK.build({...data,liveAcceptance:{...data.liveAcceptance,
 report:{...report,releaseAuthorized:true}}}),/false authorization/);
assert.throws(()=>WORK.build({...data,liveAcceptance:{...data.liveAcceptance,
 report:{...report,siteId:'another-site'}}}),/different release/);
assert.throws(()=>WORK.build({...data,liveAcceptance:{...data.liveAcceptance,
 report:{...report,status:'OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION'}}}),
 /different release|unsupported/);
const fakeSuccess={...report,status:'OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION',
 checks:{...report.checks,pending:0,passed:10,operatorFormPostReceipts:1,
  passedFormReceipts:1,operatorFormInventorySigned:true}};
assert(WORK.build({...data,liveAcceptance:{...data.liveAcceptance,report:fakeSuccess}})
 .humanHtml.includes('REQUIRES-OWNER-AUTHORIZATION'));
assert.throws(()=>WORK.build({...data,firstSite:{...data.firstSite,
 postDeploy:{...post,disposition:'NOT-READY',postDeployBlockingReasons:[{code:'bad'}]},
 },liveAcceptance:{...data.liveAcceptance,report:fakeSuccess}}),/different release/);
const CONFIG=require('../bin/build-seo-operator-workspace.cjs');
const privateConfig={format:CONFIG.CONFIG,firstSite:{summary:'/tmp/first.json',
 postDeploy:'/tmp/public.json'},liveAcceptance:{report:'/tmp/human.json',
 contract:'/tmp/source-relay.json'}};
assert.equal(CONFIG.readConfiguration(privateConfig).liveAcceptance.contract,'/tmp/source-relay.json');
assert.throws(()=>CONFIG.readConfiguration({...privateConfig,
 liveAcceptance:{report:'/tmp/human.json'}}),/incomplete/);
assert.throws(()=>CONFIG.readConfiguration({...privateConfig,
 liveAcceptance:{report:'relative.json',contract:'/tmp/relay.json'}}),/absolute/);
process.stdout.write('Source-pinned human acceptance in SEO workspace smoke PASS.\n');
