'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo-postdeploy-smoke-'));
try{
 fs.mkdirSync(path.join(root,'seo-report'));
 const manifest='a'.repeat(64),zipSha='b'.repeat(64),site={siteId:'pilot',pages:[{id:'home',path:'/'}]},
  release={siteId:'pilot',publishedVersion:7,sourceRevision:15,manifestSha256:manifest};
 const status={format:'manufact-seo-first-site-candidate-v1',siteId:'pilot',
  publishedVersion:7,officialStaticManifestSha256:manifest,
  publicArchiveSha256:zipSha,blockingGates:0,blockingGateIds:[],
  upgradeCompared:false,upgradeBlockingRisks:0,
  status:'MANUAL-ACCEPTANCE-REQUIRED',provider:'netlify',
  operatorMustApprove:true,remoteDeployPerformed:false,actualHostWrites:0};
 const summary={format:'manufact-seo-first-site-check-v1',siteId:'pilot',
  publishedVersion:7,ownerPublishedSourceRevisionClaim:15,
  staticExport:{staticManifestSha256:manifest},
  release:{blockingGates:0,blockerIds:[]}};
 const save=(p,obj)=>fs.writeFileSync(path.join(root,p),JSON.stringify(obj));
 save('CANDIDATE-STATUS.json',status);save('seo-report/summary.json',summary);
 const parity={comparable:true,allComparedSurfacesMatched:true,
  claimedPublicOrigin:'https://example.org/',publicReleaseMarkerMatched:true,
  publicRootWindowStable:true,negativeRouteStatus:404,internalArtifactPublicSuccess2xx:0,
  checkedPages:1,checkedRedirects:0,findings:[]};
 const byteReport={format:'sha256',siteId:'pilot',
  officialStaticManifestSha256:manifest,origin:'https://example.org/',
  expectedMediaResources:1,capturedResources:1,
  allCapturedByteDigestsMatch:true,findings:[]};
 const mocks={
  './static-host-preview.cjs':{load:()=>({inventory:{siteId:'pilot',
    publishedVersion:7,officialStaticManifestSha256:manifest,
    origin:'https://example.org/',provider:'netlify'}})},
  './static-upload-zip-verify.cjs':{verify:()=>({
    sha256:zipSha,officialManifestSha256:manifest,publishedVersion:7})},
  './public-media-byte-verification.cjs':{isVerified:x=>x?.format==='sha256'},
  './public-static-parity.cjs':{review:()=>parity},
  './delivery-evidence.cjs':{assertEvidence:()=>true},
  './media-delivery.cjs':{assertEvidence:()=>true}
 };
 const source=fs.readFileSync(path.join(__dirname,'../lib/post-deploy-verification.cjs'),'utf8');
 const mod={exports:{}};
 vm.runInNewContext('(function(require,module,exports){'+source+'\n})',
  {URL,Date,Buffer})(
  name=>name==='node:fs'?fs:name==='node:path'?path:
   name==='node:crypto'?require('node:crypto'):mocks[name]||
    (()=>{throw Error('Unexpected imported module '+name)})(),mod,mod.exports);
 const VERIFY=mod.exports;
 const http={siteId:'pilot',origin:'https://example.org/'},cohort={cohortFresh:true};
 const good=VERIFY.inspect(root,site,release,http,null,byteReport,cohort);
 assert.equal(good.disposition,'TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED');
 assert.equal(good.finalReleaseAuthorized,false);
 const poor=VERIFY.inspect(root,site,release,http,null,
  {...byteReport,allCapturedByteDigestsMatch:false,findings:[{
   code:'public-bytes:resource-sha256-mismatch',severity:'error',assetId:'hero'
  }]},cohort);
 assert.equal(poor.disposition,'NOT-READY');
 assert.ok(poor.mediaErrorFindings.some(x=>x.assetId==='hero'));
 const old=VERIFY.inspect(root,site,release,http,null,byteReport,
  {...cohort,cohortFresh:false});
 assert.ok(old.postDeployBlockingReasons.some(x=>x.code==='public-evidence-stale-or-mixed'));
 const d=new Date('2026-10-29T09:00:00Z').toISOString(),
  e=new Date('2026-10-29T09:10:00Z').toISOString(),
  fresh=VERIFY.freshness(d,e,Date.parse('2026-10-29T09:15:00Z'));
 assert.equal(fresh.cohortFresh,true);
 assert.equal(VERIFY.freshness(d,e,Date.parse('2026-10-29T12:15:00Z')).cohortFresh,false);
 assert.equal(VERIFY.freshness(d,'2026-10-29T09:40:01Z',Date.parse('2026-10-29T09:50:00Z')).cohortFresh,false);
 save('CANDIDATE-STATUS.json',{...status,blockingGates:0,upgradeBlockingRisks:1});
 assert.throws(()=>VERIFY.inspect(root,site,release,http,null,byteReport,cohort),
  /technical blockers or upgrade/);
 assert.ok(!JSON.stringify(good).includes('sourceRevision'));
 console.log('Post-deploy source-bound SHA256, manual-only status, false media hash, stale cohort, candidate gate consistency PASS');
}finally{fs.rmSync(root,{recursive:true,force:true});}
