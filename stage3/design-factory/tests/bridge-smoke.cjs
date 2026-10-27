#!/usr/bin/env node
'use strict';
// D6 one true first-party integration gate, no network, external packages or CMS writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const sdk=require('../../sdk/contract.cjs');
const {KITS,THEMES,FORMAT,serialize,loadRegistry}=require('../lib/compiler.cjs');
const bridge=require('../lib/bridge.cjs');
const sectionPlan=require('../lib/section-plan.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'df-d6-'));
const cli=path.resolve(__dirname,'../bin/design-factory.cjs');
const run=args=>cp.spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
try{
 const reg=loadRegistry();
 let matrix=0;
 for(const kit of Object.keys(KITS))for(const theme of Object.keys(THEMES))for(const language of ['ru','en']){
  const project={format:FORMAT,version:1,kit,theme,language,facts:{}};
  const packageFile=bridge.build(project);
  assert.equal(packageFile.format,bridge.EXPORT);
  assert.equal(packageFile.version,2,'D6 export schema version must match the review-gate contract');
  assert.equal(bridge.validateBundle(packageFile).site.pages.length,4);
  assert.equal(sdk.inspectSite(packageFile.site,reg).errors.length,0);
  assert.equal(JSON.stringify(bridge.importForCMS(packageFile)),JSON.stringify(packageFile.site));
  assert.equal(packageFile.compatibility.publishGate,'owner_review_required');
  assert.equal(packageFile.compatibility.indexing,'noindex');
  assert.equal(packageFile.ownerChecklist.readyForPublish,false);
  assert.ok(packageFile.site.pages.every(page=>page.seo.robots==='noindex'));
  assert.ok(packageFile.compatibility.integration_required.includes('pixel parity for CSS compositions'));
  matrix++;
 }
 assert.equal(matrix,288);
  const approved=bridge.build({format:bridge.WORKSPACE,version:1,composition:null,project:{
   format:FORMAT,version:2,kit:'agency',theme:'editorial',language:'en',
   facts:{title:'Verified owner',headline:'Verified headline',description:'Verified description',
    contactText:'Verified contact details',services:[
     {title:'Service one',description:'Owner confirmed service one'},
     {title:'Service two',description:'Owner confirmed service two'}
    ]},
   ownerReviewConfirmed:true
  }});
  assert.equal(approved.ownerChecklist.readyForPublish,true);
  assert.equal(approved.compatibility.publishGate,'owner_review_confirmed_by_exporter');
  assert.equal(approved.compatibility.indexing,'index');
  assert.ok(approved.site.pages.every(page=>page.seo.robots==='index'));
  assert.equal(approved.compatibility.previewOnly,true,'Review attestation never publishes the site');
  assert.ok(approved.compatibility.blocked.includes('production publication without CMS/integrator approval'));
  assert.equal(bridge.importForCMS(approved).pages.every(page=>page.seo.robots==='index'),true);
 // v2 plans: all four pages, protected originals, placeholder noindex and legacy v1.
 const plan=sectionPlan.capture(approved.site,null);
 for(const page of sectionPlan.PAGES)
  plan.pages[page].splice(1,0,{id:sectionPlan.nextId(plan,page),composition:'benefits-bento'});
 const workspaceV2={format:bridge.WORKSPACE,version:2,project:approved.workspace.project,
  composition:null,sectionPlan:plan};
 const changed=bridge.build(workspaceV2);
 assert.equal(changed.workspace.version,2);
 assert.equal(changed.compatibility.sectionPlan.addedDrafts,4);
 assert.equal(changed.ownerChecklist.readyForPublish,false);
 assert.ok(changed.site.pages.every(page=>page.seo.robots==='noindex'));
 for(let i=0;i<4;i++){
  assert.equal(changed.site.pages[i].sections.length,approved.site.pages[i].sections.length+1);
  assert.ok(approved.site.pages[i].sections
   .filter(s=>['company-hero','cta-banner'].includes(s.component))
   .every(s=>changed.site.pages[i].sections.some(x=>x.id===s.id)));
 }
 assert.deepEqual(bridge.importForCMS(bridge.validateBundle(changed)),changed.site);
 const reversed=JSON.parse(JSON.stringify(plan));
 reversed.pages.approach.reverse();
 const moved=bridge.build({...workspaceV2,sectionPlan:reversed});
 assert.equal(moved.site.pages[2].sections[0].id,reversed.pages.approach[0].id);
 const removedHero=JSON.parse(JSON.stringify(plan));
 removedHero.pages.home=removedHero.pages.home.filter(s=>s.id!=='df-home-01');
 assert.throws(()=>bridge.build({...workspaceV2,sectionPlan:removedHero}),/Protected original section/);
 const corrupted=JSON.parse(JSON.stringify(changed));
 corrupted.site.pages[0].sections[0].id='df-injected';
 assert.throws(()=>bridge.validateBundle(corrupted),/D6: changed/);
 const legacy=bridge.build({format:bridge.WORKSPACE,version:1,
  project:approved.workspace.project,composition:'hero-center'});
 const preserved=bridge.build({format:bridge.WORKSPACE,version:2,
  project:approved.workspace.project,composition:'hero-center',
  sectionPlan:sectionPlan.capture(legacy.site,'hero-center')});
 assert.deepEqual(preserved.site,legacy.site);

 // Real owner content edits in the v2 plan keep typed manifest validation,
 // exact D6/CMS parity, old v1 compatibility and explicit noindex.
 const copyPlan=value=>JSON.parse(JSON.stringify(value));
 const editedPlan=copyPlan(plan);
 editedPlan.version=2;
 editedPlan.pages.home.find(x=>x.id==='df-home-01').edit={
  elements:[{slot:'heading',path:'content.text',value:'Verified owner heading'}]
 };
 const editedWorkspace={...workspaceV2,sectionPlan:editedPlan};
 const contentEdited=bridge.build(editedWorkspace);
 assert.equal(contentEdited.compatibility.sectionPlan.editedSections,1);
 assert.equal(contentEdited.site.pages[0].sections[0].elements
  .find(x=>x.slot==='heading').values['content.text'],'Verified owner heading');
 assert.ok(contentEdited.site.pages.every(x=>x.seo.robots==='noindex'));
 assert.equal(contentEdited.ownerChecklist.readyForPublish,false);
 assert.deepEqual(bridge.validateBundle(contentEdited).site,contentEdited.site);
 const selectedFaq='faq-minimal',faqPlan=copyPlan(editedPlan);
 const faqId=sectionPlan.nextId(faqPlan,'contact');
 faqPlan.pages.contact.splice(1,0,{id:faqId,composition:selectedFaq});
 const faqBaseline=bridge.build({...editedWorkspace,sectionPlan:faqPlan});
 const faq=faqBaseline.site.pages[3].sections.find(x=>x.id===faqId);
 faqPlan.pages.contact.find(x=>x.id===faqId).edit={
  elements:[{slot:'heading',path:'content.text',value:'Verified customer questions'}],
  items:[...faq.items.map(item=>({id:item.id,values:item.values})),{
   id:faqId+'-item-3',values:{'content.question':'Third question',
    'content.answer':'Owner verified third answer'}}]
 };
 const withFaq=bridge.build({...editedWorkspace,sectionPlan:faqPlan});
 const contactFaq=withFaq.site.pages[3].sections.find(x=>x.id===faqId);
 assert.equal(contactFaq.items.length,3);
 assert.equal(contactFaq.items[2].values['content.answer'],'Owner verified third answer');
 assert.deepEqual(bridge.importForCMS(bridge.validateBundle(withFaq)),withFaq.site);
 for(const change of [
  {elements:[{slot:'photo',path:'content.media',value:'unknown'}]},
  {elements:[{slot:'heading',path:'content.text',value:'X'.repeat(500)}]},
  {elements:[{slot:'heading',path:'content.text',value:'Safe'},{slot:'heading',path:'content.text',value:'Duplicate'}]}
 ]){
  const failed=copyPlan(faqPlan);
  failed.pages.contact.find(x=>x.id===faqId).edit=change;
  assert.throws(()=>bridge.build({...editedWorkspace,sectionPlan:failed}));
 }
 const forgedItem=copyPlan(faqPlan);
 forgedItem.pages.contact.find(x=>x.id===faqId).edit.items[2].id='foreign-item';
 assert.throws(()=>bridge.build({...editedWorkspace,sectionPlan:forgedItem}),/Invalid item ID/);
 // An existing v1 plan is never allowed to smuggle a new edit property.
 const smuggled=copyPlan(plan);
 smuggled.pages.home[0].edit={elements:[]};
 assert.throws(()=>bridge.build({...workspaceV2,sectionPlan:smuggled}),/Invalid section fields/);
 // Four-page page metadata overlays never authorize robots, path changes or publication.
 const metadata=require('../lib/page-settings.cjs');
 const seo=metadata.capture(approved.site);
 seo.pages.home.seoTitle='Owner confirmed homepage title';
 seo.pages.home.navigationLabel='Start';
 seo.pages.services.seoDescription='Owner confirmed services description';
 const seoWorkspace={format:bridge.WORKSPACE,version:3,project:approved.workspace.project,
  composition:null,pageSettings:seo};
 const seoBundle=bridge.build(seoWorkspace);
 assert.equal(seoBundle.workspace.version,3);
 assert.equal(seoBundle.compatibility.pageSettings.changedPages,2);
 assert.equal(seoBundle.site.pages[0].seo.title,'Owner confirmed homepage title');
 assert.equal(seoBundle.site.pages[0].navigation.label,'Start');
 assert.equal(seoBundle.site.pages[1].seo.description,'Owner confirmed services description');
 assert.equal(seoBundle.ownerChecklist.readyForPublish,false);
 assert.equal(seoBundle.ownerChecklist.indexing,'noindex');
 assert.equal(seoBundle.ownerChecklist.publicationStatus,'page_metadata_requires_owner_review');
 assert.ok(seoBundle.site.pages.every(page=>page.seo.robots==='noindex'));
 assert.deepEqual(bridge.importForCMS(bridge.validateBundle(seoBundle)),seoBundle.site);
 const combined=bridge.build({...seoWorkspace,sectionPlan:editedPlan});
 assert.equal(combined.workspace.version,3);
 assert.equal(combined.site.pages[0].seo.title,'Owner confirmed homepage title');
 assert.equal(combined.site.pages[0].sections[0].elements
  .find(x=>x.slot==='heading').values['content.text'],'Verified owner heading');
 for(const mutate of [
  x=>{x.pages.home.seoTitle='';},
  x=>{x.pages.home.seoDescription='Z'.repeat(301);},
  x=>{x.pages.contact.path='/forbidden/';},
  x=>{x.pages.home.robots='index';},
  x=>{delete x.pages.services;}
 ]){
  const modified=JSON.parse(JSON.stringify(seo));
  mutate(modified);
  assert.throws(()=>bridge.build({...seoWorkspace,pageSettings:modified}));
 }
 assert.throws(()=>bridge.workspace({...seoWorkspace,unauthorized:true}),/unknown workspace/);
 // JSON parsers/formatters legitimately reorder object keys. Such imports
 // must remain valid while any actual nested data mutation is still refused.
 const shuffled=(value)=>{
  if(Array.isArray(value))return value.map(shuffled);
  if(value&&typeof value==='object')
   return Object.fromEntries(Object.keys(value).reverse().map(k=>[k,shuffled(value[k])]));
  return value;
 };
 const orderingExample=bridge.build({format:FORMAT,version:1,
  kit:'saas',theme:'technical',language:'en',facts:{}});
 const reordered=shuffled(JSON.parse(JSON.stringify(orderingExample)));
 assert.equal(JSON.stringify(bridge.importForCMS(reordered)),JSON.stringify(orderingExample.site));
 const changedOrderExample=shuffled(reordered);
 changedOrderExample.site.pages[0].seo.title='Mutated SEO';
 assert.throws(()=>bridge.validateBundle(changedOrderExample),/D6: changed/);
 assert.throws(()=>bridge.validateBundle({...reordered,inspection:undefined}),/D6: non-JSON value/);
 for(const type of ['hero-center','gallery-mosaic','pricing-table','testimonials-quote']){
  const state={format:bridge.WORKSPACE,version:1,project:{format:FORMAT,version:1,kit:'agency',theme:'minimal',language:'en',facts:{}},
   composition:type};
  const packaged=bridge.build(state);
  assert.equal(packaged.compatibility.composition.composition,type);
  sdk.validateSite(bridge.importForCMS(packaged),reg);
  for(const mutation of [
   x=>{x.site.title='Injected';},
   x=>{x.site.unknown=true;},
   x=>{x.workspace.composition='gallery-rail';},
   x=>{x.designSpec.previewParity='supported';},
   x=>{x.compatibility.publishGate='ready';}
  ]){
   const changed=JSON.parse(JSON.stringify(packaged));
   mutation(changed);
   assert.throws(()=>bridge.validateBundle(changed),/D6: changed|Unexpected|Unregistered/);
  }
 }
 assert.throws(()=>bridge.workspace({format:bridge.WORKSPACE,version:1,project:{format:FORMAT,version:1,kit:'agency',theme:'minimal',language:'en',facts:{}},composition:null,unexpected:1}),/unknown workspace/);
 const project={format:FORMAT,version:1,kit:'agency',theme:'editorial',language:'ru',facts:{siteId:'df-contract-demo'}};
 const input=path.join(root,'project.json'),bundle=path.join(root,'integration.json'),site=path.join(root,'site.json');
 fs.writeFileSync(input,serialize(project));
 const exported=run(['bridge-export',input,bundle]);
 assert.equal(exported.status,0,exported.stderr);
 const imported=run(['bridge-validate',bundle,'--out',site]);
 assert.equal(imported.status,0,imported.stderr);
 assert.equal(JSON.parse(fs.readFileSync(site,'utf8')).format,sdk.FORMAT);
 assert.notEqual(run(['bridge-validate',bundle,'--out',site]).status,0,'Must refuse overwrite');
 assert.notEqual(run(['bridge-export',input,bundle]).status,0,'Must refuse overwrite');
 const corrupt=JSON.parse(fs.readFileSync(bundle,'utf8'));corrupt.site.title='tampered';
 const evil=path.join(root,'evil.json');fs.writeFileSync(evil,serialize(corrupt));
 assert.notEqual(run(['bridge-validate',evil,'--out',path.join(root,'evil-site.json')]).status,0);
 assert.ok(!fs.existsSync(path.join(root,'evil-site.json')));
 console.log('DESIGN_FACTORY_D6_SMOKE PASS: 288 complete CMS packages, 4 composed integrations, tamper refusal, offline CLI export/import');
}finally{fs.rmSync(root,{recursive:true,force:true});}
