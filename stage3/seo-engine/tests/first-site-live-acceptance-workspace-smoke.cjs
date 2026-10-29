'use strict';
/* Private human acceptance page rendered only against exact release and SHA records. */
const assert=require('node:assert/strict');
const WORK=require('../lib/seo-operator-workspace.cjs');
const FLOW=require('../lib/first-site-live-acceptance.cjs');
const baseTasks=[...['/','/contact/'].flatMap(page=>
 ['desktop','tablet','mobile'].map(viewport=>({id:'page:'+page+':'+viewport,
  kind:'browser',page,viewport,state:'unreviewed'}))),
 ...FLOW.HOST_CHECKS.map(([name])=>({id:'manual:'+name,kind:'manual',
  page:null,viewport:null,state:'unreviewed'}))].map((t,i)=>({
 ...t,state:i<7?'passed':'unreviewed'}));
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
 checks:{required:13,passed:7,failed:0,pending:6,perTaskChecks:baseTasks,
  realFormOccurrencesExpected:1,operatorFormObservations:0,operatorFormPostReceipts:0,
  submittedFormEvidenceReceipts:0,confirmedFormDeliveryReceipts:0,
  passedFormReceipts:0,failedFormReceipts:0,operatorFormInventorySigned:false,
  missingFormPages:[{page:'/contact/',expected:1,passed:0}],
  perPageFormReceipts:{},perFormChecks:[{page:'/contact/',sectionId:'contact-lead',state:'missing'}]}};
const bundle={format:'manufact-seo-review-bundle-v1',readOnly:true,siteId:site,
 approvedSiteSource:{fileSha256:source},
 localPhpForms:{format:'manufact-seo-local-php-forms-v1',observedForms:1,
  pages:[{path:'/',actualForms:0,formInstances:[]},
   {path:'/contact/',actualForms:1,formInstances:[{sectionId:'contact-lead'}]}]}};
const data={firstSite:{summary,bundle,postDeploy:post,summarySha,postDeploySha:postSha},
 liveAcceptance:{report,contract,contractSha}};
const w=WORK.build(data);
assert.equal(w.overview.humanAcceptanceIncluded,true);
assert.equal(w.overview.humanAcceptanceStatus,'HUMAN-EVIDENCE-INCOMPLETE');
assert.equal(w.overview.releaseAuthorized,false);
assert(w.homeHtml.includes('human.html'));
assert(w.humanHtml.includes('Human First-Site Acceptance'));
assert(w.humanHtml.includes('manual'));
assert(w.humanHtml.includes('/contact/'));
assert(w.humanHtml.includes('Unresolved browser and manual checks'));
assert(w.humanHtml.includes('manual:client-approved-visual'));
assert.throws(()=>WORK.build({...data,liveAcceptance:{...data.liveAcceptance,
 report:{...report,checks:{...report.checks,perTaskChecks:baseTasks.slice(1)}}}}),
 /browser and manual tasks/);
assert.throws(()=>WORK.build({...data,liveAcceptance:{...data.liveAcceptance,
 contractSha:SHA('9')}}),/different release/);
assert.throws(()=>WORK.build({...data,liveAcceptance:{...data.liveAcceptance,
 report:{...report,checks:{...report.checks,missingFormPages:[]}}}}),/missing real form/);

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
 checks:{...report.checks,pending:0,passed:13,
  perTaskChecks:baseTasks.map(t=>({...t,state:'passed'})),
  operatorFormObservations:1,operatorFormPostReceipts:1,
  submittedFormEvidenceReceipts:1,confirmedFormDeliveryReceipts:1,
  passedFormReceipts:1,operatorFormInventorySigned:true,
  missingFormPages:[],perPageFormReceipts:{'/contact/':1},
  perFormChecks:[{page:'/contact/',sectionId:'contact-lead',state:'passed'}]}};
assert(WORK.build({...data,liveAcceptance:{...data.liveAcceptance,report:fakeSuccess}})
 .humanHtml.includes('REQUIRES-OWNER-AUTHORIZATION'));
assert.throws(()=>WORK.build({...data,liveAcceptance:{...data.liveAcceptance,
 report:{...fakeSuccess,checks:{...fakeSuccess.checks,
  perFormChecks:[{page:'/contact/',sectionId:'fake-section',state:'passed'}]}}}}),
 /unknown, duplicate or invalid/);
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
