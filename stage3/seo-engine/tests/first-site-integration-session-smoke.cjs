'use strict';
/* Plan validation and stage wiring; no actual PHP/client/Google actions. */
const assert=require('node:assert/strict');
const PLAN=require('../lib/first-site-integration-session.cjs');
const home='/tmp/private-first-site-new',candidate='/tmp/source-first-site';
const l={format:PLAN.FORMAT,phase:'local',
 inputs:{approvedSite:'/tmp/sealed',publishedSite:'/tmp/published.json',
 blueprint:'/tmp/approved.json',origin:'http://127.0.0.1:9000/published/my-site/',
 staticExport:'/tmp/official-export',provider:'netlify',
 approvalArchiveIndex:'/tmp/approval.json'}};
const local=PLAN.steps(l,home);
assert.deepEqual(local.map(x=>x.key),['prepare','relay','acceptance-template','workspace']);
assert(local[0].argv.includes('--approval-archive-index'));
assert(local[0].argv.includes('--workspace'));
assert.equal(local[2].argv[0],'template');
const s=PLAN.summary(l,{root:home,
 prepare:{siteId:'my-site',status:'MANUAL-ACCEPTANCE-REQUIRED'},
 relay:{siteId:'my-site',stage:'PUBLIC-EVIDENCE-MISSING'},
 'acceptance-template':{siteId:'my-site'},workspace:{siteId:'my-site'}});
assert.equal(s.sitePublicationAuthorized,false);
assert.equal(s.localhostPhpGetMayOccur,true);
assert.equal(s.humanAcceptanceTemplateCreated,true);
assert.equal(s.verifiedStages.length,4);
assert.throws(()=>PLAN.validate({...l,inputs:{...l.inputs,provider:'other'}}),/provider/);
assert.throws(()=>PLAN.validate({...l,inputs:{...l.inputs,origin:'https://example.org/'}}),/localhost/);
assert.throws(()=>PLAN.validate({...l,inputs:{...l.inputs,secret:'should-not-be-used'}}),/unknown field/);
const p={format:PLAN.FORMAT,phase:'public',
 inputs:{candidate,approvedSite:'/tmp/sealed',publishedSite:'/tmp/published.json',
 staticExport:'/tmp/export',publicHttpEvidence:'/tmp/public-http.json',
 publicMediaDigests:'/tmp/public-media.json'}};
const pub=PLAN.steps(p,home);
assert.deepEqual(pub.map(x=>x.key),['verify','relay','live-acceptance-template','workspace']);
assert.equal(pub[1].argv[pub[1].argv.indexOf('--post-deploy')+1],
 '/tmp/private-first-site-new/post-deploy/post-deploy-summary.json');
assert.equal(pub[2].argv[0],'template');
assert.equal(PLAN.summary(p,{root:home,verify:{siteId:'my-site',status:'NOT-READY'},
 relay:{siteId:'my-site',stage:'PUBLIC-TECHNICAL-BLOCKED'},
 'live-acceptance-template':{siteId:'my-site'},workspace:{siteId:'my-site'}}).phase,'public');
assert.throws(()=>PLAN.summary(p,{root:home,verify:{siteId:'different'},
 relay:{siteId:'my-site'},'live-acceptance-template':{siteId:'my-site'},
 workspace:{siteId:'my-site'}}),/site IDs conflict/);
const captured={format:PLAN.FORMAT,phase:'public-capture',
 inputs:{candidate,approvedSite:'/tmp/sealed',publishedSite:'/tmp/published.json',
  staticExport:'/tmp/export',origin:'https://www.manufact-client.org/'}};
const live=PLAN.steps(captured,home);
assert.deepEqual(live.map(x=>x.key),
 ['capture','verify','relay','live-acceptance-template','workspace']);
assert.equal(live[0].argv[live[0].argv.indexOf('--media-digest-out')+1],
 '/tmp/private-first-site-new/captured-public-media-sha256.json');
assert.equal(live[1].argv[live[1].argv.indexOf('--public-http-evidence')+1],
 '/tmp/private-first-site-new/captured-public-http.json');
const observed=PLAN.summary(captured,{root:home,
 capture:{siteId:'my-site',requests:8,publicMediaGetRequests:3,
  publicHttpsTransportCaptured:true,rootWindowMatched:true,mediaShaVerified:true},
 verify:{siteId:'my-site',status:'NOT-READY'},
 relay:{siteId:'my-site',stage:'PUBLIC-TECHNICAL-BLOCKED'},
 'live-acceptance-template':{siteId:'my-site'},workspace:{siteId:'my-site'}});
assert.equal(observed.externalPublicNetworkCallsBySession,11);
assert.equal(observed.liveHttpsCapturePerformed,true);
assert.equal(observed.sitePublicationAuthorized,false);
assert(PLAN.markdown(observed,{sourceRevisionClaim:9,publishedVersion:7,
 sealedApprovedSourceSha256:'a'.repeat(64),officialStaticManifestSha256:'b'.repeat(64)})
 .includes('Actual live HTTPS/asset GETs performed in this session: 11'));
assert(PLAN.markdown(s).includes('NOT PROVIDED'));
assert.throws(()=>PLAN.markdown({...observed,sitePublicationAuthorized:true}),/non-authorizing/);
assert.throws(()=>PLAN.validate({...captured,inputs:{...captured.inputs,
 origin:'http://www.manufact-client.org/'}}),/HTTPS root/);
assert.throws(()=>PLAN.validate({...captured,inputs:{...captured.inputs,
 origin:'https://127.0.0.1/'}}),/HTTPS root/);
assert.throws(()=>PLAN.summary(captured,{root:home,
 capture:{siteId:'other-site',requests:8,publicMediaGetRequests:3,
  publicHttpsTransportCaptured:true,rootWindowMatched:true,mediaShaVerified:true},
 verify:{siteId:'my-site'},relay:{siteId:'my-site'},
 'live-acceptance-template':{siteId:'my-site'},workspace:{siteId:'my-site'}}),
 /exact site/);
const f={format:PLAN.FORMAT,phase:'search',
 inputs:{candidate,postDeploy:'/tmp/post.json',blueprint:'/tmp/blueprint.json',
 indexing:'/tmp/indexing.json',searchHistory:'/tmp/history.json'}};
const follow=PLAN.steps(f,home);
assert.deepEqual(follow.map(x=>x.key),['relay','workspace']);
assert(follow[0].argv.includes('--indexing'));
assert(follow[0].argv.includes('--search-history'));
assert.throws(()=>PLAN.validate({...f,inputs:{...f.inputs,liveAcceptanceReview:'/tmp/review.json'}}),/must be supplied together/);
assert.equal(PLAN.validate({...f,inputs:{...f.inputs,
 liveAcceptanceReview:'/tmp/review.json',liveAcceptanceContract:'/tmp/relay.json'}}).phase,'search');
assert.throws(()=>PLAN.validate({...f,inputs:{candidate,postDeploy:'/tmp/post.json',
 blueprint:'/tmp/blueprint.json'}}),/genuine indexing or history/);
console.log('first-site integration session plan smoke PASS (pure local planning only)');
