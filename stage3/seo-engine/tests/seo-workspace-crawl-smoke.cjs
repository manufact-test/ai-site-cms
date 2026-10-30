'use strict';
/* Focused REAL Node smoke: crawl-only private workspace, version fences, repair bytes,
 * atomic CLI, mandatory manual holds, CSP and no-release semantics.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const crypto=require('node:crypto');
const PANEL=require('../lib/seo-workspace-crawl-panel.cjs');
const WORK=require('../lib/seo-operator-workspace.cjs');
const CLI=require('../bin/build-seo-operator-workspace.cjs');
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const H=c=>c.repeat(64);
const policy={format:'manufact-seo-crawl-policy-v1',readOnly:true,
 publicationAuthorized:false,publicHostAuthenticated:false,
 siteId:'site-demo',base:'https://example.org/',blueprintSha256:H('a'),
 robotsSha256:H('b'),sitemapSha256:H('c'),pages:[],
 findings:[{id:'blocked-home',priority:'P0',path:'/',agent:'Googlebot',
  message:'Original <script> blocked by robot',manualNext:'Check published HTTPS'}],
 actions:[],summary:{priorities:{P0:1,P1:0,P2:0}}};
const robots='User-agent: Googlebot\nDisallow: /private/\nAllow: /contact/$\n';
const sitemap='<?xml version="1.0"?><urlset><url><loc>https://example.org/</loc></url></urlset>\n';
const robotsSha=hash(robots),sitemapSha=hash(sitemap);
const delta={format:'manufact-seo-crawl-policy-delta-v1',readOnly:true,
 publicationAuthorized:false,publicHostAuthenticated:false,
 siteId:policy.siteId,base:policy.base,blueprintSha256:policy.blueprintSha256,
 beforeSources:{robotsSha256:policy.robotsSha256,sitemapSha256:policy.sitemapSha256},
 afterSources:{robotsSha256:robotsSha,sitemapSha256:sitemapSha},
 changes:[{id:'robots:home:Googlebot',priority:'P1',kind:'robots-access-restored',
  pageId:'page-home',path:'/',agent:'Googlebot',message:'Operator supplied rule changed'}],
 tasks:[]};
const repair={format:'manufact-seo-crawl-repair-plan-v1',readOnly:true,
 releaseAuthorized:false,artifactsDraftOnly:true,ownerReviewRequired:true,
 siteId:policy.siteId,base:policy.base,comparison:delta,
 proposedRobotsSha256:robotsSha,proposedSitemapSha256:sitemapSha,
 manualHolds:[{pageId:'page-home',path:'/',agent:'Googlebot',reason:'owner-policy-review',
  detail:'Read current public policy'}],
 generatedUrls:['https://example.org/'],appliedSuggestions:[],
 summary:{needsManualReview:1}};
const repairManifest={format:'manufact-seo-crawl-repair-sources-v1',
 siteId:policy.siteId,publicationAuthorized:false,ownerApprovalAuthenticated:false,
 approvedBlueprintCanonicalSha256:policy.blueprintSha256,
 sourceRawSha256:{blueprint:H('d'),site:H('e'),
  robots:policy.robotsSha256,sitemap:policy.sitemapSha256},
 proposedRobotsSha256:robotsSha,proposedSitemapSha256:sitemapSha};
const original={
 policy,regression:delta,repair,repairManifest,
 proposedRobots:robots,proposedSitemap:sitemap
};
const digests=Object.fromEntries(Object.entries(original)
 .map(([key,value])=>[key,hash(typeof value==='string'?value:JSON.stringify(value,null,2)+'\n')]));
const crawl={...original,digests};
const panel=PANEL.build(crawl);
assert.equal(panel.counts.P0,1);
assert.equal(panel.counts.P1,2);
assert.equal(panel.overview.candidateIncluded,true);
assert.equal(panel.overview.releaseAuthorized,false);
assert(panel.html.includes('DRAFT-ONLY-robots.txt'));
assert(panel.html.includes('&lt;script&gt;'));
assert(!panel.html.includes('Original <script>'));
assert(panel.html.includes("default-src &#39;none&#39;"));
const workspace=WORK.build({crawl});
assert.equal(workspace.overview.crawlIncluded,true);
assert.equal(workspace.overview.crawlP0,1);
assert.equal(workspace.overview.releaseAuthorized,false);
assert(workspace.homeHtml.includes('crawl.html'));
assert.equal(workspace.crawlCandidateRobots,robots);
assert.equal(workspace.crawlCandidateSitemap,sitemap);
assert.throws(()=>PANEL.build({...crawl,regression:{
 ...delta,beforeSources:{...delta.beforeSources,robotsSha256:H('9')}}}),/original crawl policy/);
assert.throws(()=>PANEL.build({...crawl,proposedRobots:robots+'DANGER'}),
 /proposed file bytes|digest/);
assert.throws(()=>PANEL.build({...crawl,repair:{...repair,releaseAuthorized:true}}),
 /no release authorization/);
assert.throws(()=>PANEL.build({...crawl,repairManifest:{
 ...repairManifest,sourceRawSha256:{...repairManifest.sourceRawSha256,site:null}}}),
 /same approved Blueprint|repair must match/);
assert.throws(()=>WORK.build({crawl:{...crawl,policy:{...policy,siteId:'other'}}}),
 /same approved Blueprint|original crawl policy|regression/);
/* GSC/crawl must remain a co-observation, with EXACT same source bytes and base. */
const indexingOriginal={format:'manufact-seo-indexing-intelligence-v1',
 readOnly:true,siteId:policy.siteId,publicOrigin:policy.base,
 blueprintSha256:repairManifest.sourceRawSha256.blueprint};
const indexingRaw=JSON.stringify(indexingOriginal,null,2)+'\n';
const correlation={format:'manufact-seo-crawl-indexing-correlation-v1',
 readOnly:true,publicationAuthorized:false,causalExplanationEstablished:false,
 siteId:policy.siteId,base:policy.base,approvedBlueprintSha256:policy.blueprintSha256,
 suppliedRobotsSha256:policy.robotsSha256,suppliedSitemapSha256:policy.sitemapSha256,
 originalBlueprintSourceSha256:indexingOriginal.blueprintSha256,
 originalIndexingReportSha256:hash(indexingRaw),
 actions:[{id:'review-indexable-googlebot-block:page-home',priority:'P1',path:'/',
  reason:'Googlebot block and operator-not-indexed co-observed',
  manualNext:'Independently check current published HTTPS and URL Inspection'}],pages:[]};
const correlated={...crawl,indexing:indexingOriginal,
 indexingReportSha256:hash(indexingRaw),correlation,
 digests:{...digests,correlation:hash(JSON.stringify(correlation,null,2)+'\n')}};
const co=PANEL.build(correlated);
assert.equal(co.counts.P1,3);
assert(co.html.includes('co-observed'));
assert.throws(()=>PANEL.build({...correlated,indexingReportSha256:H('f')}),
 /same original GSC report|exact original GSC report/);
assert.throws(()=>PANEL.build({...correlated,indexing:{
 ...indexingOriginal,publicOrigin:'https://elsewhere.example/'}}),
 /same approved site and HTTPS mount/);

const base=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-seo-crawl-workspace-'));
try{
 const sources={};
 for(const [name,content] of Object.entries(original)){
  const file=path.join(base,name+(typeof content==='string'?'.txt':'.json'));
  fs.writeFileSync(file,typeof content==='string'?content:JSON.stringify(content,null,2)+'\n');
  sources[name]=file;
 }
 const config={format:CLI.CONFIG,crawl:sources};
 const configPath=path.join(base,'private-config.json');
 fs.writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
 const output=path.join(base,'private-crawl-workspace');
 CLI.main(['--config',configPath,'--out',output]);
 const result=JSON.parse(fs.readFileSync(path.join(output,'workspace-manifest.json'),'utf8'));
 assert.equal(result.overview.crawlIncluded,true);
 assert.equal(result.overview.crawlP0,1);
 assert.equal(result.overview.crawlManualHolds,1);
 assert.equal(result.releaseAuthorized,false);
 assert.equal(result.crawlEvidence.policyRobotsSha256,policy.robotsSha256);
 assert.equal(fs.readFileSync(path.join(output,'DRAFT-ONLY-robots.txt'),'utf8'),robots);
 assert.equal(fs.readFileSync(path.join(output,'DRAFT-ONLY-sitemap.xml'),'utf8'),sitemap);
 assert(fs.readFileSync(path.join(output,'crawl.html'),'utf8').includes('UNAPPROVED'));
 assert(fs.existsSync(path.join(output,'crawl-lead-worklist.md')));
 assert.throws(()=>CLI.main(['--config',configPath,'--out',output]),/already exists|exists|occupied/i);
 assert.throws(()=>CLI.readConfiguration({...config,crawl:{
  policy:sources.policy,repair:sources.repair}}),/four original files/);
 fs.appendFileSync(sources.proposedRobots,'tampered\n');
 const missing=path.join(base,'rejected-workspace');
 assert.throws(()=>CLI.main(['--config',configPath,'--out',missing]),/proposed file bytes|digest/);
 assert.equal(fs.existsSync(missing),false);
}finally{fs.rmSync(base,{recursive:true,force:true});}
process.stdout.write('Private crawl operator workspace smoke PASS (real Node).\n');
