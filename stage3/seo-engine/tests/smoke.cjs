'use strict';
// One complete vertical smoke. Offline, no CMS writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),cli=path.join(root,'bin/seo-blueprint.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'seo-blueprint-smoke-'));
function command(op,opts){
 const args=[cli,op,...Object.entries(opts).flatMap(([k,v])=>['--'+k,v])];
 return spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:4000000});
}
function good(op,opts){const p=command(op,opts);assert.equal(p.status,0,op+': '+p.stderr);return p.stdout;}
function fixture(f){return path.join(root,'fixtures',f);}
try{
 for(const name of ['industrial','community']){
  const actual=JSON.parse(good('compile',{brief:fixture(name+'.brief.json')}));
  const expected=JSON.parse(fs.readFileSync(fixture(name+'.blueprint.json'),'utf8'));
  assert.deepEqual(actual,expected,name+' canonical blueprint');
  const explanation=good('explain',{blueprint:fixture(name+'.blueprint.json')});
  assert.match(explanation,/SEO/);
  assert.match(explanation,/mobile/);
 }
 const site=path.resolve(root,'../fixtures/industrial-site.json'),bp=fixture('industrial.blueprint.json');
 const audit=JSON.parse(good('analyze-site',{site,blueprint:bp}));
 assert.equal(audit.format,'manufact-seo-analysis-v1');
 assert.equal(audit.mode,'site-v1');assert.equal(audit.siteId,'site-industrial-demo');
 assert.equal(audit.capabilities.coreInspector,'reused');
 const editorial=JSON.parse(good('analyze-content',{site,blueprint:bp}));
 assert.equal(editorial.format,'manufact-seo-content-review-v1');
 assert.equal(editorial.pages.length,2);
 assert.ok(editorial.findings.some(x=>x.code.startsWith('content:topic-')));
 const planReview=JSON.parse(good('review-blueprint',{blueprint:bp}));
 assert.equal(planReview.format,'manufact-seo-blueprint-review-v1');
 const handoff=JSON.parse(good('handoff',{site,blueprint:bp}));
 assert.equal(handoff.readOnly,true);
 assert.ok(Array.isArray(handoff.editorialReviewActions));
 assert.ok(handoff.editorialReviewActions.some(x=>x.automatic===false));
 assert.ok(handoff.supportedChanges.some(x=>x.field==='seo.title'));
 assert.ok(handoff.requiresLeadImplementation.some(x=>x.kind==='structured-data-adapter'));
 // Deliberate content regression: approved CTA route was changed in source data.
 const {collectReview,reviewBlueprint}=require('../lib/content-intelligence.cjs');
 const {compileBrief}=require('../lib/blueprint.cjs');
 const original=JSON.parse(fs.readFileSync(site,'utf8'));
 const plan=JSON.parse(fs.readFileSync(bp,'utf8'));
 const routeRegression=structuredClone(original);
 routeRegression.pages[0].sections[0].elements.find(x=>x.slot==='action').values['behavior.href']='/';
 const routeReport=collectReview(routeRegression,plan);
 assert.ok(routeReport.findings.some(x=>x.code==='content:planned-cta-missing'&&x.sectionId==='section-hero'));
 const shared=Array.from({length:5},()=> 'Verified editorial description of the same product category and customer requirements.').join(' ');
 const synthetic={siteId:plan.siteId,pages:[
  {id:'page-home',path:'/',sections:[{id:'section-hero',elements:[{id:'content-one',slot:'copy',values:{'content.text':shared}}]}]},
  {id:'page-contact',path:'/contact/',sections:[{id:'section-contact',elements:[{id:'content-two',slot:'copy',values:{'content.text':shared}}]}]}
 ]};
 assert.ok(collectReview(synthetic,plan).findings.some(x=>x.code==='content:duplicate-body'));
 const overlap=JSON.parse(fs.readFileSync(fixture('industrial.brief.json'),'utf8'));
 overlap.pages[1].intent.type=overlap.pages[0].intent.type;
 overlap.pages[1].intent.topics[0]=overlap.pages[0].intent.topics[0];
 assert.ok(reviewBlueprint(compileBrief(overlap)).issues.some(x=>x.code==='blueprint:primary-intent-overlap'));

 const normal=JSON.parse(good('analyze-html',{snapshot:fixture('normal.snapshot.json')}));
 assert.deepEqual(normal.issues,[],'normal HTML snapshot should have no static issues');
 const bad=JSON.parse(good('analyze-html',{snapshot:fixture('invalid.snapshot.json')}));
 const expected=JSON.parse(fs.readFileSync(fixture('invalid.expected-report.json'),'utf8'));
 for(const code of expected.requiredCodes)assert.ok(bad.issues.some(x=>x.code===code),code);
 const tampered=JSON.parse(fs.readFileSync(fixture('community.brief.json'),'utf8'));
 tampered.pages[0].sections[0].media={purpose:'informative',alt:'',why:'Missing'};
 const file=path.join(tmp,'tampered.json');fs.writeFileSync(file,JSON.stringify(tampered));
 const rejected=command('compile',{brief:file});
 assert.notEqual(rejected.status,0,'invalid accessibility alt must fail');
 assert.match(rejected.stderr,/informative image requires alt intent/);
 process.stdout.write('PASS: 2 briefs/plans, SEO content and blueprint review, evidence-backed handoff, Site v1 core inspection, clean/defective HTML, invalid input rejection.\n');
 process.stdout.write('Audit issues: '+audit.issues.length+'; supported SEO proposals: '+handoff.supportedChanges.length+'; invalid HTML findings: '+bad.issues.length+'.\n');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
