'use strict';
/* Canonical Blueprint release diff: SEO semantics, migration, private decision ledger. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const BP=require('../lib/blueprint.cjs');
const DIFF=require('../lib/blueprint-change-review.cjs');
const VIEW=require('../lib/blueprint-change-view.cjs');
const DECISIONS=require('../lib/blueprint-change-decisions.cjs');
const brief=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));
const original=BP.compileBrief(brief);
const same=DIFF.compare(original,original);
assert.equal(same.modified,false);
assert.equal(same.summary.operatorActions,0);
assert.equal(same.summary.actualHttpRequests,0);
assert.equal(same.summary.plannedHttpProbes,0);
assert.equal(same.publicationAuthorized,false);
assert.deepEqual(same.summary.affectedPageIds,[]);
const current=clone(brief);
const contact=current.pages.find(x=>x.id==='page-contact');
contact.path='/reach-us/';
contact.seo.robots='noindex';
contact.seo.title='Updated actual business contact';
current.pages[0].sections[0].heading='Updated equipment heading';
current.facts[0].status='unverified';
const planned=BP.compileBrief(current),diff=DIFF.compare(original,planned);
const changes=new Set(diff.changes.map(c=>c.kind));
for(const kind of ['route-moved','robots-changed','canonical-changed','metadata-changed',
 'sections-changed','schema-candidates-changed','fact-evidence-changed','contextual-edges-changed'])
 assert(changes.has(kind),'Missing important impact: '+kind);
assert(diff.summary.priorityActions.P0>0);
assert(diff.summary.priorityActions.P1>0);
assert(diff.summary.priorityActions.P2>0);
assert(diff.summary.affectedPageIds.includes('page-home'));
assert(diff.probePlan.some(p=>p.requestPath==='/contact/'&&
 p.expectedStatus===301&&p.expectedLocationPath==='/reach-us/'&&p.realHttpVerified===false));
assert.equal(diff.redirectsCreated,0);
assert.equal(diff.publicationAuthorized,false);
assert.equal(diff.clientSignoffAuthenticated,false);
assert.equal(diff.summary.actualHttpRequests,0);
assert(DIFF.markdown(diff).includes('301'));
const rendered=VIEW.render(diff);
assert(rendered.html.includes('Blueprint Change Impact'));
assert(rendered.html.includes('P0'));
assert(rendered.html.includes('/reach-us/'));
assert(rendered.html.includes('NOT PERFORMED'));
assert(rendered.html.includes('connect-src &#39;none&#39;'));
assert(!rendered.html.includes('<script'));
assert.equal(rendered.releaseAuthorized,false);
// Changing a link identical to a repeated link still needs source review.
const repeated=clone(brief);
repeated.pages[0].links.push(clone(repeated.pages[0].links[0]));
const repeatedDiff=DIFF.compare(original,BP.compileBrief(repeated));
assert(repeatedDiff.changes.some(c=>c.kind==='contextual-edges-changed'));
const ret=clone(brief);
ret.pages=ret.pages.filter(p=>p.id!=='page-contact');
ret.pages[0].links=[];
ret.pages[0].sections.forEach(s=>{delete s.cta});
const deleted=DIFF.compare(original,BP.compileBrief(ret));
assert(deleted.changes.some(c=>c.kind==='page-removed'&&c.priority==='P0'));
assert(deleted.actions.some(a=>a.id==='page:page-contact:removed'));
assert(deleted.probePlan.some(p=>p.kind==='retired-route-review'&&p.expectedStatus===null));
assert(!deleted.summary.affectedPageIds.includes('page-contact'),
 'Removed page must not be represented as a currently published page');
const extra=clone(brief);
extra.pages[0].links=[];
extra.pages[0].sections.forEach(s=>{delete s.cta});
extra.pages.push({
 id:'page-more',path:'/more/',name:'More',intent:{type:'informational',
  need:'Help visitors explore additional approved topics',topics:['overview']},
 seo:{title:'Additional business overview',description:'Additional business overview content approved by owner',
  robots:'index'},
 sections:[{id:'section-more',heading:'Other approved subjects',level:1,
  why:'Explain the options',points:['Provide verified information']}],
 links:[],schemaCandidates:[],responsive:{desktop:'Readable',tablet:'Readable',mobile:'Readable'}
});
const added=DIFF.compare(original,BP.compileBrief(extra));
assert.equal(added.summary.addedPages,1);
assert(added.probePlan.some(p=>p.kind==='planned-page'&&p.requestPath==='/more/'));
const fake=clone(original);fake.siteId='site-forged';
assert.throws(()=>DIFF.compare(original,fake),/differ/);
assert.throws(()=>DIFF.compare(original,{...planned,version:2}),/unsupported/);
const worksheet=DECISIONS.template(diff);
assert.equal(worksheet.actions.length,diff.actions.length);
assert(worksheet.actions.every(a=>a.decision==='pending'));
const pending=DECISIONS.evaluate(diff,worksheet);
assert.equal(pending.counts.pending,diff.actions.length);
assert.equal(pending.releaseAuthorized,false);
assert(pending.disposition.includes('P0'));
const filled=clone(worksheet);
for(const item of filled.actions){
 item.decision='accepted';item.reviewer='Lead reviewer';item.reviewedAt='2026-10-30';
 item.evidenceRef='private-evidence/'+item.id;
}
const accepted=DECISIONS.evaluate(diff,filled);
assert.equal(accepted.counts.p0Unresolved,0);
assert.equal(accepted.disposition,'ALL-OPERATOR-DECISIONS-RECORDED-OWNER-SIGNOFF-UNVERIFIED');
assert.equal(accepted.releaseAuthorized,false);
assert.equal(accepted.clientSignoffAuthenticated,false);
assert(DECISIONS.markdown(accepted).includes('NON-AUTHORIZING'));
const missing=clone(worksheet);
missing.actions.pop();
assert.throws(()=>DECISIONS.evaluate(diff,missing),/action inventory/);
const wrong=clone(filled);wrong.afterBlueprintSha256='1'.repeat(64);
assert.throws(()=>DECISIONS.evaluate(diff,wrong),/exact original/);
const deceptive=clone(filled);
deceptive.actions[0].decision='pending';
assert.throws(()=>DECISIONS.evaluate(diff,deceptive),/pending operator/);
const fakeDate=clone(filled);fakeDate.actions[0].reviewedAt='2026-02-30';
assert.throws(()=>DECISIONS.evaluate(diff,fakeDate),/real YYYY/);
const explicit=clone(filled);explicit.actions[0].decision='rejected';explicit.actions[0].notes='Owner declined';
const rejected=DECISIONS.evaluate(diff,explicit);
assert.equal(rejected.disposition,'OPERATOR-REPORTED-REJECTIONS');
console.log('Blueprint release diff, 301 probes, schema facts and strict human decisions smoke PASS.');
