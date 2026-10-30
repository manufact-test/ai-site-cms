'use strict';
/* Real Node first-client lead readiness, private file inventory and CLI.
 * Synthetic offline source files; never accesses real sites or CMS.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const WORK=require('../lib/seo-operator-workspace.cjs');
const LEAD=require('../lib/seo-lead-readiness.cjs');
const VIEW=require('../lib/seo-lead-readiness-view.cjs');
const PACK=require('../lib/seo-private-lead-integrity.cjs');
const BUILD=require('../bin/build-seo-operator-workspace.cjs');
const AUDIT=require('../bin/verify-seo-lead-packet.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const js=x=>JSON.stringify(x,null,2)+'\n';
const h=x=>x.repeat(64);
const policy={format:'manufact-seo-crawl-policy-v1',readOnly:true,
 publicationAuthorized:false,publicHostAuthenticated:false,siteId:'site-demo',
 base:'https://example.org/',agents:['Googlebot','Bingbot','*'],scope:'complete',
 blueprintSha256:h('a'),robotsSha256:h('b'),sitemapSha256:h('c'),
 pages:[],findings:[{id:'blocked-home',priority:'P0',path:'/',agent:'Googlebot',
  message:'Googlebot blocked by supplied robots',manualNext:'Inspect published HTTPS'}],
 actions:[],summary:{priorities:{P0:1,P1:0,P2:0}}};
const only=WORK.build({crawl:{policy,digests:{policy:hash(js(policy))}}});
assert(only.homeHtml.includes('lead-readiness.html'));
assert(only.leadReadinessHtml.includes('default-src &#39;none&#39;'));
assert(only.leadReadinessMarkdown.includes('NEVER AUTOMATIC GO'));
const report=JSON.parse(only.leadReadinessJson);
assert.equal(report.siteId,'site-demo');
assert.equal(report.releaseAuthorized,false);
assert.equal(report.summary.neverAutomaticGO,true);
assert.equal(report.summary.preLaunchBlocked,1);
assert(report.summary.preLaunchMissing>0);
assert(report.summary.postLaunchDeferred>0);
assert(report.gates.some(x=>x.key==='crawler-policy-and-sitemap'&&x.status==='BLOCKED'));
assert(report.gates.some(x=>x.key==='public-release-evidence'&&x.status==='NEEDS-EVIDENCE'));
assert(report.gates.some(x=>x.key==='search-performance-followup'&&x.phase==='POST_LAUNCH'&&
 x.status==='POST-LAUNCH-DEFERRED'));
assert(report.gates.every(x=>x.releaseAuthorized===false&&x.automatic===false&&
 x.ownerApprovalRequired===true));
assert.deepEqual(report.gates.map(x=>x.id),
 JSON.parse(WORK.build({crawl:{policy,digests:{policy:hash(js(policy))}}}).leadReadinessJson)
  .gates.map(x=>x.id));
assert.throws(()=>LEAD.build({siteId:'site-demo',crawl:{
 ...{siteId:'other',overview:{releaseAuthorized:false},counts:{P0:0,P1:0}}}}),/cross-site/);
const original={format:'manufact-seo-first-site-check-v1',siteId:'site-demo',
 sourceSiteSha256:h('a'),publishedVersion:3,automaticRelease:false,
 release:{blockingGates:0,blockerIds:[],mandatoryManualChecks:7}};
const normalized={siteId:'site-demo',first:{summary:original,summarySha:h('e')},
 launch:{siteId:'site-demo'},
 crawl:{siteId:'site-demo',counts:{P0:0,P1:0},overview:{releaseAuthorized:false},
 sourceIdentity:{files:{policy:h('d')}}}};
const technical=LEAD.build(normalized);
assert.equal(technical.summary.preLaunchBlocked,0);
assert(technical.summary.preLaunchMissing>0);
assert.equal(technical.summary.urgency,'COLLECT-MISSING-EVIDENCE');
/* Independent public response errors are release blockers even without a
 * named existing crawl task conflict. Unknown task evidence is not clearance.
 */
const leadCrawl={...normalized.crawl,publicFollowup:{
 summary:{conflict:0,unknown:0,alignedNotVerified:4,independentDeliveryBlockers:2},
 suppliedPublicCaptureRawSha256:h('7')
}};
const deploymentRisk=LEAD.build({...normalized,crawl:leadCrawl});
assert(deploymentRisk.gates.some(x=>x.key==='published-crawl-cms-evidence'&&
 x.status==='BLOCKED'));
const missingPublicTasks=LEAD.build({...normalized,crawl:{
 ...leadCrawl,publicFollowup:{...leadCrawl.publicFollowup,summary:{
 conflict:0,unknown:2,alignedNotVerified:3,independentDeliveryBlockers:0}}}});
assert(missingPublicTasks.gates.some(x=>x.key==='published-crawl-cms-evidence'&&
 x.status==='NEEDS-EVIDENCE'));
const resolvedPublicTasks=LEAD.build({...normalized,crawl:{
 ...leadCrawl,publicFollowup:{...leadCrawl.publicFollowup,summary:{
 conflict:0,unknown:0,alignedNotVerified:5,independentDeliveryBlockers:0}}}});
assert(resolvedPublicTasks.gates.some(x=>x.key==='published-crawl-cms-evidence'&&
 x.status==='LEAD-REVIEW-REQUIRED'));
assert(resolvedPublicTasks.gates.every(x=>x.releaseAuthorized===false));
const indexingSha=h('8');
assert.equal(LEAD.build({...normalized,indexingSourceSha256:indexingSha}).sourceRawSha256.indexingReport,indexingSha);

assert.throws(()=>LEAD.build({...normalized,first:{...normalized.first,summary:{
 ...original,release:{...original.release,blockingGates:2}}}}),/blocker counts/);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-seo-lead-handoff-'));
try{
 const source=path.join(temp,'crawl-policy.json');
 fs.writeFileSync(source,js(policy));
 const config=path.join(temp,'config.json');
 fs.writeFileSync(config,js({format:BUILD.CONFIG,crawl:{policy:source}}));
 const out=path.join(temp,'new-workspace');
 BUILD.main(['--config',config,'--out',out]);
 for(const file of ['lead-readiness.html','lead-readiness.md','lead-readiness.json',
  'LEAD-PACKET-INTEGRITY.json','workspace-manifest.json','index.html'])
  assert(fs.existsSync(path.join(out,file)),file+' missing');
 const inspection=AUDIT.main(['--bundle',out]);
 assert.equal(inspection.validAsSaved,true);
 assert.equal(inspection.authenticatedHost,false);
 assert.equal(inspection.releaseAuthorized,false);
 const integrity=JSON.parse(fs.readFileSync(path.join(out,'LEAD-PACKET-INTEGRITY.json')));
 assert.equal(integrity.originalInputSHA256.crawl.policy,hash(js(policy)));
 assert.equal(integrity.configOriginalSha256,hash(
  fs.readFileSync(config)));
 assert.equal(integrity.filesCount,fs.readdirSync(out).length-1);
 assert.throws(()=>BUILD.main(['--config',config,'--out',out]),/already exists/);
 fs.appendFileSync(path.join(out,'lead-readiness.md'),'Tamper');
 assert.throws(()=>PACK.verify(out),/original bytes changed|replaced/);
 const restored=fs.readFileSync(path.join(out,'lead-readiness.md'),'utf8').replace(/Tamper$/,'');
 fs.writeFileSync(path.join(out,'lead-readiness.md'),restored);
 assert.equal(PACK.verify(out).validAsSaved,true);
 fs.writeFileSync(path.join(out,'unexpected-private.json'),'private');
 assert.throws(()=>PACK.verify(out),/unexpected|inventory/);
 fs.rmSync(path.join(out,'unexpected-private.json'));
 assert.equal(PACK.verify(out).validAsSaved,true);
 const symlink=path.join(temp,'symlink-workspace');
 try{fs.symlinkSync(out,symlink,'dir');
  assert.throws(()=>PACK.verify(symlink),/real directory|symlink/);
 }catch(e){if(e.code!=='EPERM'&&e.code!=='EACCES')throw e;}
}finally{fs.rmSync(temp,{recursive:true,force:true});}
process.stdout.write('Real Node first-client SEO lead readiness and local integrity CLI smoke PASS.\n');
