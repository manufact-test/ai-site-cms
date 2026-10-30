'use strict';
/* Real Node offline two-period human crawl CMS lifecycle & private CLI smoke. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const POLICY=require('../lib/crawl-policy.cjs');
const CMS=require('../lib/crawl-cms-implementation.cjs');
const LIFE=require('../lib/crawl-cms-lifecycle.cjs');
const VIEW=require('../lib/crawl-cms-recheck-view.cjs');
const WORK=require('../lib/seo-operator-workspace.cjs');
const CLI=require('../bin/recheck-crawl-cms-work.cjs');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
const bp=BP.checkBlueprint(JSON.parse(fs.readFileSync(
 path.join(__dirname,'../fixtures/industrial.blueprint.json'),'utf8')));
const bbytes=json(bp);
const policy=POLICY.analyze({blueprint:bp,base:'https://example.org/',
 robotsText:'User-agent: Googlebot\nDisallow: /contact/\n\nUser-agent: Bingbot\nAllow: /\n\nUser-agent: *\nAllow: /\n',
 sitemapXml:'<?xml version="1.0"?><urlset><url><loc>https://example.org/</loc></url></urlset>\n',
 agents:['Googlebot','Bingbot','*'],scope:'complete'});
const page=p=>({id:p.id,path:p.path,seo:{...p.seo},sections:[]});
const beforeSite={format:'manufact-ai-site-v1',schemaVersion:1,siteId:bp.siteId,
 pages:[...bp.pages.map(page),{id:'page-extra',path:'/extra/',seo:{robots:'index'},sections:[]}],
 redirects:[{from:'/',to:'/contact/'}]};
beforeSite.pages.find(x=>x.id==='page-contact').seo.robots='noindex';
const afterSite={format:'manufact-ai-site-v1',schemaVersion:1,siteId:bp.siteId,
 pages:[page(bp.pages.find(x=>x.id==='page-contact'))],redirects:[]};
afterSite.pages[0].seo.title='Manual metadata change';
const report=site=>CMS.build({blueprint:bp,blueprintRawSha256:sha(bbytes),
 site,siteRawSha256:sha(json(site)),policy});
const before=report(beforeSite),after=report(afterSite);
const beforeText=json(before),afterText=json(after),
 beforeSHA=sha(beforeText),afterSHA=sha(afterText);
const ledger=LIFE.template(before,beforeSHA);
function mark(category,ref){
 const row=ledger.decisions.find(x=>x.category===category);
 assert(row,'Expected task '+category);
 Object.assign(row,{status:'completed-reported',assignee:'CMS lead',
  decisionDate:'2026-10-30',rationale:'Operator reported owner change',
  manualChangeDescription:'Reported manual edit',evidenceRefs:['private/'+ref]});
 return row;
}
const persistent=mark('publisher-robots-policy','robots'),absent=mark('cms-seo-robots','page');
const ledgerText=json(ledger);
const r=LIFE.compare(before,beforeSHA,after,afterSHA,ledger,sha(ledgerText));
assert.equal(r.releaseAuthorized,false);
assert.equal(r.publicHostAuthenticated,false);
assert(r.summary.persistent>0&&r.summary.noLongerSeen>0&&r.summary.newlyObserved>0);
assert.equal(r.summary.completedReportedStillObserved,1);
assert.equal(r.summary.completedReportedNowAbsentUnverified,1);
assert(r.persistent.some(x=>x.taskId===persistent.taskId&&
 x.classification==='OWNER-REPORTED-COMPLETE-BUT-ISSUE-STILL-OBSERVED'));
assert(r.noLongerSeen.some(x=>x.taskId===absent.taskId&&x.canAutoClose===false));
assert(r.newlyObserved.every(x=>x.priorDecisionTransferAllowed===false));
const same=LIFE.compare(before,beforeSHA,before,beforeSHA);
assert.equal(same.summary.persistent,before.actions.length);
assert.equal(same.summary.noLongerSeen,0);
assert.equal(same.summary.newlyObserved,0);
/* A changed value for the same issue topic is NOT a resolved problem or inherited approval. */
const changedSite=JSON.parse(JSON.stringify(beforeSite));
changedSite.pages.find(x=>x.id==='page-contact').seo.robots='noindex,nofollow';
const changedReport=report(changedSite),changedSHA=sha(json(changedReport));
const changed=LIFE.compare(before,beforeSHA,changedReport,changedSHA,ledger,sha(ledgerText));
assert(changed.summary.changedObservation>=1);
assert(changed.changedObservation.some(x=>x.beforeObservation.includes('noindex')&&
 x.afterObservation.includes('noindex,nofollow')&&
 x.priorDecisionTransferAllowed===false&&x.humanDecision==='unreviewed'));
assert.equal(changed.summary.coverageComparisonComplete,true);
assert.throws(()=>LIFE.compare(before,beforeSHA,{...after,crawlCoverageScope:'sample'},afterSHA),
 /changed crawler agents|coverage/i);
const legacy={...before,crawlerAgents:undefined,crawlCoverageScope:undefined,sitemapSourceKind:undefined};
const unknown=LIFE.compare(legacy,beforeSHA,after,afterSHA);
assert.equal(unknown.summary.coverageComparisonComplete,false);
const view=VIEW.render(r);
assert(view.html.includes('default-src &#39;none&#39;'));
assert(view.markdown.includes('NOT verified'));
assert.throws(()=>LIFE.compare(before,beforeSHA,after,afterSHA,
 {...ledger,sourceWorklistRawSha256:afterSHA},sha(ledgerText)),/stale|SHA256/);
assert.throws(()=>LIFE.compare({...before,siteId:'else'},beforeSHA,after,afterSHA),
 /same client site/);
const fake={...ledger,decisions:ledger.decisions.map(x=>({...x}))};
fake.decisions[0].claimedPublicVerified=true;
assert.throws(()=>LIFE.checkDecisions(before,beforeSHA,fake),/spoof/);
assert.throws(()=>LIFE.checkWorklist({...before,actions:[...before.actions,before.actions[0]]},
 beforeSHA),/duplicated/);
const crawl={policy,cmsBlueprint:bp,cmsSite:afterSite,
 cmsBaseline:before,cmsDecisions:ledger,
 digests:{policy:sha(json(policy)),cmsBlueprint:sha(bbytes),cmsSite:sha(json(afterSite)),
 cmsBaseline:beforeSHA,cmsDecisions:sha(ledgerText)}};
const ws=WORK.build({crawl});
assert(ws.crawlCmsRecheckHtml&&ws.crawlCmsRecheckJson);
assert(ws.crawlCmsDecisionsTemplate.includes('"unreviewed"'));
assert(ws.crawlCmsDecisionDeskHtml.includes('script-src &#39;sha256-'));
assert(ws.crawlCmsDecisionDeskHtml.includes('Validate and export ledger'));
assert(!ws.crawlCmsDecisionDeskHtml.includes('fetch('));
assert.equal(ws.overview.crawlCmsReportedCompleteStillObserved,1);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-crawl-cms-cycle-'));
try{
 const write=(n,b)=>{let p=path.join(tmp,n);fs.writeFileSync(p,b);return p;};
 const old=write('old.json',beforeText),newer=write('new.json',afterText),
  decisions=write('decisions.json',ledgerText);
 const templateOut=path.join(tmp,'template');
 CLI.main(['--worklist',old,'--out',templateOut]);
 assert(fs.existsSync(path.join(templateOut,'crawl-cms-decisions.html')));
 const generated=JSON.parse(fs.readFileSync(path.join(templateOut,'crawl-cms-decisions-TEMPLATE.json')));
 assert.equal(generated.sourceWorklistRawSha256,beforeSHA);
 assert(generated.decisions.every(d=>d.status==='unreviewed'));
 assert.throws(()=>CLI.main(['--worklist',old,'--out',templateOut]),/already exists/i);
 const cycleOut=path.join(tmp,'cycle');
 CLI.main(['--before',old,'--after',newer,'--decisions',decisions,'--out',cycleOut]);
 for(const n of ['crawl-cms-recheck.html','crawl-cms-recheck.json','crawl-cms-recheck.md',
  'crawl-cms-next-decisions-TEMPLATE.json','crawl-cms-next-decisions.html','PRIVATE-SOURCE-MANIFEST.json'])
  assert(fs.existsSync(path.join(cycleOut,n)),n);
 const saved=JSON.parse(fs.readFileSync(path.join(cycleOut,'crawl-cms-recheck.json')));
 assert.equal(saved.summary.completedReportedStillObserved,1);
 assert.equal(saved.summary.completedReportedNowAbsentUnverified,1);
 const manifest=JSON.parse(fs.readFileSync(path.join(cycleOut,'PRIVATE-SOURCE-MANIFEST.json')));
 assert.equal(manifest.originalInputSHA256.before,beforeSHA);
 assert.equal(manifest.releaseAuthorized,false);
 CLI.main(['--before',old,'--after',newer,'--out',path.join(tmp,'without-decisions')]);
 fs.writeFileSync(decisions,json({...ledger,sourceWorklistRawSha256:afterSHA}));
 assert.throws(()=>CLI.main(['--before',old,'--after',newer,
  '--decisions',decisions,'--out',path.join(tmp,'invalid')]),/stale|SHA256/);
 assert.equal(fs.existsSync(path.join(tmp,'invalid')),false);
 assert.throws(()=>CLI.flags(['--before',old,'--after',newer,
  '--decisions',decisions,'--decisions',decisions,'--out',cycleOut]),/Usage:/);
}finally{fs.rmSync(tmp,{force:true,recursive:true});}
process.stdout.write('Real Node private Crawl CMS lifecycle and CLI smoke PASS.\n');
