'use strict';
// One comprehensive offline product flow for early Stage 3 contract.
// Does not accept Stage2, pass any of the 135 production requirements, or deploy.
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const sdk=require('../sdk/contract.cjs');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifests=['company-hero','feature-highlights','contact-panel','image-showcase','lead-form','lead-form-flex'].map(
  name=>read('components/'+name+'.json'));
let checks=0;
const test=(name,fn)=>{fn();checks++;};
const refuses=(fn,why)=>assert.throws(fn,Error,why);
const initial=read('fixtures/industrial-site.json');
const same=x=>JSON.parse(JSON.stringify(x));
const reg=sdk.registry(manifests);
const hero=manifests[0],highlights=manifests[1],contact=manifests[2];
test('locked fixture is valid',()=>{
  const actual=sdk.validateSite(initial,reg);
  assert.equal(actual.pages.length,2);
  assert.equal(actual.pages[0].sections[0].elements[0].values['content.text'],
    'Производим технологическое оборудование');
  assert.deepEqual(sdk.validateManifest(hero),hero);
});
test('auto-created site without any design brief has full editable registry',()=>{
  const a=sdk.siteFromBrief({siteId:'site-ai-without-mockup',title:'Фабрика'},manifests);
  const b=sdk.siteFromBrief({siteId:'site-ai-without-mockup',title:'Фабрика'},manifests);
  assert.deepEqual(a,b,'No random identifiers or hidden provider state');
  assert.equal(a.pages.length,2);
  assert.equal(a.pages[0].sections.length,2);
  assert.equal(a.pages[1].path,'/contact/');
  assert.equal(a.pages[1].sections[0].component,'contact-panel');
  assert.equal(a.pages[0].sections[0].elements[0].id,'section-hero-heading');
});
test('supplied facts but not imagined facts',()=>{
  const site=sdk.siteFromBrief({siteId:'site-custom',title:'Пример',brief:{
    headline:'Проверенное название завода',description:'Только проверенные данные',
    ctaLabel:'Свяжитесь сейчас'}},manifests);
  assert.equal(site.pages[0].sections[0].elements[0].values['content.text'],'Проверенное название завода');
  assert.equal(site.pages[0].sections[0].elements[1].values['content.text'],'Только проверенные данные');
  refuses(()=>sdk.siteFromBrief({brief:{pricing:'100 рублей'}},manifests),'Reject invented fields');
});
test('editor controls include only declared properties and correct breakpoints',()=>{
  const fields=sdk.controls(initial,manifests,'page-home','section-hero','section-hero-heading');
  assert.deepEqual(fields.map(x=>x.path),['content.text','style.fontSize','style.color']);
  assert.deepEqual(fields[1].breakpoints,['desktop','tablet','mobile']);
  assert.deepEqual(fields[0].breakpoints,[]);
  assert.equal(sdk.effectiveValue({desktop:'56px',mobile:'30px'},'tablet'),'56px');
  assert.equal(sdk.effectiveValue({desktop:'56px',tablet:'40px'},'mobile'),'40px');
  assert.equal(sdk.effectiveValue({desktop:'56px',tablet:'40px',mobile:'30px'},'mobile'),'30px');
  assert.equal(fields.some(x=>x.path==='style.borderRadius'),false);
});
test('stable IDs + strict property closure',()=>{
  const bad=same(initial);
  bad.pages[0].sections[0].elements[0].values['style.borderWidth']='2px';
  refuses(()=>sdk.validateSite(bad,manifests),'Unknown field must stay hidden AND rejected');
  const dup=same(initial);dup.pages[0].sections[0].elements[0].id=dup.pages[1].id;
  refuses(()=>sdk.validateSite(dup,manifests),'IDs cannot collide across pages');
  const missing=same(initial);delete missing.pages[0].sections[0].elements[0].values['style.color'];
  refuses(()=>sdk.validateSite(missing,manifests),'Missing field must be refused');
  const unknown=same(initial);unknown.pages[0].sections[0].component='shell-command';
  refuses(()=>sdk.validateSite(unknown,manifests),'Unregistered custom code never executes');
});
test('unsafe values and broken references rejected',()=>{
  const injection=same(initial);injection.pages[0].sections[0].elements[2].values['behavior.href']='javascript:alert(1)';
  refuses(()=>sdk.validateSite(injection,manifests),'Script link refused');
  const huge=same(initial);huge.pages[0].sections[0].elements[0].values['style.fontSize'].mobile='1000px';
  refuses(()=>sdk.validateSite(huge,manifests),'Responsive unit range refused');
  const badAsset=same(initial);badAsset.assets=[{id:'asset-one',src:'/assets/../../php.php',alt:'',mime:'image/png'}];
  refuses(()=>sdk.validateSite(badAsset,manifests),'Traversing asset refused');
});
test('custom component registers as inert manifest, not executable JavaScript',()=>{
  const custom={format:'manufact-ai-component-v1',id:'independent-gallery',version:'1.0.0',
    label:'Фотогалерея',elements:[{slot:'photo',label:'Изображение',fields:[
      {path:'content.image',label:'Фото',type:'media',default:'',responsive:false},
      {path:'style.isVisible',label:'Видимость',type:'boolean',default:{desktop:true},responsive:true}
    ]}]};
  const withAsset=same(initial);
  withAsset.assets=[{id:'asset-sample',src:'/assets/demo.webp',alt:'Образец',mime:'image/webp'}];
  const m=sdk.validateManifest(custom),sec=sdk.sectionFrom(m,'section-gallery');
  sec.elements[0].values['content.image']='asset-sample';
  withAsset.pages[0].sections.push(sec);
  assert.equal(sdk.validateSite(withAsset,[...manifests,m]).assets.length,1);
  assert.equal(sdk.controls(withAsset,[...manifests,m],'page-home','section-gallery','section-gallery-photo')[0].type,'media');
  sec.elements[0].values['content.image']='asset-untracked';
  refuses(()=>sdk.validateSite(withAsset,[...manifests,m]),'Missing media asset refused');
  custom.elements[0].fields[0].evilEval='alert(1)';
  refuses(()=>sdk.validateManifest(custom),'No executable field metadata');
});
test('schema update: new fields, new defaults, preserve custom edits',()=>{
  const before=same(initial);
  before.pages[0].sections[0].elements[0].values['content.text']='Владелец вручную изменил заголовок';
  before.pages[0].sections[0].elements[0].values['style.color']='#12AA44';
  const latest=same(hero);
  latest.version='1.1.0';
  latest.elements[0].fields.find(f=>f.path==='style.fontSize').default={desktop:'70px',mobile:'34px'};
  latest.elements[0].fields.push({
    path:'style.fontWeight',label:'Насыщенность',type:'enum',options:['normal','semibold','bold'],
    responsive:false,default:'bold'
  });
  const beforeBytes=JSON.stringify(before);
  const plan=sdk.upgrade(before,hero,latest,[highlights,contact]);
  assert.equal(plan.accepted,true);
  assert.equal(plan.conflicts.length,0);
  assert.equal(plan.candidate.pages[0].sections[0].manifestVersion,'1.1.0');
  const el=plan.candidate.pages[0].sections[0].elements[0];
  assert.equal(el.id,'section-hero-heading');
  assert.equal(el.values['content.text'],'Владелец вручную изменил заголовок');
  assert.equal(el.values['style.color'],'#12AA44');
  assert.equal(el.values['style.fontWeight'],'bold');
  assert.deepEqual(el.values['style.fontSize'],{desktop:'70px',mobile:'34px'},
    'Untouched default should adopt new design default');
  assert.equal(JSON.stringify(before),beforeBytes,'Update does not mutate source');
  // Revalidate against new exact manifests.
  sdk.validateSite(plan.candidate,[latest,highlights,contact]);
});
test('deleting a manually edited property refuses silent overwrite',()=>{
  const before=same(initial);
  before.pages[0].sections[0].elements[2].values['behavior.href']='/changed-by-owner/';
  const next=same(hero);next.version='1.2.0';
  next.elements[2].fields=next.elements[2].fields.filter(f=>f.path!=='behavior.href');
  const orig=JSON.stringify(before);
  const result=sdk.upgrade(before,hero,next,[highlights,contact]);
  assert.equal(result.accepted,false);
  assert.equal(result.candidate,null);
  assert.equal(result.conflicts.length,1);
  assert.match(result.conflicts[0].key,/behavior\.href$/);
  assert.equal(JSON.stringify(before),orig,'NO mutation of user data on conflict');
  refuses(()=>sdk.upgrade(before,hero,next,[highlights,contact],{'bad/path':'discard'}),'Unknown conflict response rejected');
  const explicit=sdk.upgrade(before,hero,next,[highlights,contact],{
    [result.conflicts[0].key]:'discard'
  });
  assert.equal(explicit.accepted,true,'Only explicit decision permits deleting manual override');
  assert.equal(Object.keys(explicit.candidate.pages[0].sections[0].elements[2].values).length,1);
});
test('changing a typed property rejects incompatible owner override',()=>{
  const before=same(initial);
  before.pages[0].sections[0].elements[0].values['style.color']='#ff0000';
  const next=same(hero);next.version='2.0.0';
  next.elements[0].fields.find(f=>f.path==='style.color').type='enum';
  const field=next.elements[0].fields.find(f=>f.path==='style.color');
  field.options=['light','dark'];field.default='dark';
  const proposal=sdk.upgrade(before,hero,next,[highlights,contact]);
  assert.equal(proposal.accepted,false);
  assert.equal(proposal.conflicts.length,1);
  assert.match(proposal.conflicts[0].reason,/constraint/);
});
test('CLI create / validate / controls are executable without any dependencies',()=>{
  const cli=path.join(root,'bin','ai-site.cjs');
  const created=JSON.parse(execFileSync(process.execPath,[cli,'create','--id=site-no-design',
    '--title=Завод без дизайн-ТЗ'],{encoding:'utf8'}));
  assert.equal(created.pages[0].sections.length,2);
  const file=path.join(root,'fixtures','industrial-site.json');
  const valid=JSON.parse(execFileSync(process.execPath,[cli,'validate',file],{encoding:'utf8'}));
  assert.equal(valid.valid,true);assert.equal(valid.readyToPublish,false);
  const ui=JSON.parse(execFileSync(process.execPath,[cli,'controls',file,
    'page-home','section-hero','section-hero-heading'],{encoding:'utf8'}));
  assert.equal(ui.length,3);
  assert.equal(ui[0].group,'content');
});
test('schema artifacts parse and match versioned entry formats',()=>{
  const schema=read('schemas/site-v1.schema.json');
  const manifest=read('schemas/manifest-v1.schema.json');
  assert.equal(schema.properties.format.const,sdk.FORMAT);
  assert.equal(manifest.properties.format.const,sdk.MANIFEST);
  assert.equal(schema['$schema'],manifest['$schema']);
  assert.equal(schema.properties.pages.minItems,1);
});

const draft=require('../sdk/draft.cjs');
test('typed manual edit -> isolated block preview -> undo -> redo',()=>{
  const before=JSON.stringify(initial);
  const started=draft.begin(initial,manifests);
  const selected={pageId:'page-home',sectionId:'section-hero',elementId:'section-hero-heading',
    path:'content.text',value:'Владелец изменил текст',expectedRevision:started.revision};
  const modified=draft.edit(started,manifests,selected);
  assert.equal(modified.revision,1);
  assert.equal(modified.undo.length,1);
  const block=draft.blockPreview(modified,manifests,'page-home','section-hero','mobile');
  assert.equal(block.elements.length,3,'Only one selected section rendered as inert data');
  assert.equal(block.notPublished,true);
  assert.equal(block.hasExecutableHtml,false);
  assert.equal(block.elements[0].props.content.text,'Владелец изменил текст');
  assert.equal(block.elements[0].props.style.fontSize,'32px','Mobile inherits its own override');
  assert.equal(draft.changes(modified,manifests).length,1);
  refuses(()=>draft.edit(modified,manifests,selected),'Stale revision refused');
  const reversed=draft.undo(modified,manifests);
  assert.equal(reversed.current.pages[0].sections[0].elements[0].values['content.text'],
    'Производим технологическое оборудование');
  assert.equal(draft.changes(reversed,manifests).length,0);
  const restored=draft.redo(reversed,manifests);
  assert.equal(draft.changes(restored,manifests)[0].current,'Владелец изменил текст');
  assert.equal(JSON.stringify(initial),before,'Draft workflow never mutates input site');
});
test('responsive patch and typed control limitations',()=>{
  const initialDraft=draft.begin(initial,manifests);
  const shared={pageId:'page-home',sectionId:'section-hero',elementId:'section-hero-heading',
    expectedRevision:0};
  const edited=draft.edit(initialDraft,manifests,{...shared,path:'style.fontSize',
    value:'39px',breakpoint:'mobile'});
  assert.equal(draft.blockPreview(edited,manifests,'page-home','section-hero','mobile')
    .elements[0].props.style.fontSize,'39px');
  assert.equal(draft.blockPreview(edited,manifests,'page-home','section-hero','tablet')
    .elements[0].props.style.fontSize,'48px');
  refuses(()=>draft.edit(initialDraft,manifests,{...shared,path:'style.borderColor',value:'#fff'}),
    'Invisible, non-manifest CSS property unavailable');
  refuses(()=>draft.edit(initialDraft,manifests,{...shared,path:'content.text',value:'Text',
    breakpoint:'mobile'}),'Nonresponsive text refuses breakpoint');
  refuses(()=>draft.edit(initialDraft,manifests,{...shared,path:'style.fontSize',
    value:'9000px',breakpoint:'desktop'}),'Out-of-bound unit refused');
  refuses(()=>draft.edit(initialDraft,manifests,{...shared,path:'style.color',
    value:'url(javascript:alert(1))'}),'Disallowed color refused');
});


test('structure: pages, sections, stable IDs, undo, redo and closed rules',()=>{
  const initialBytes=JSON.stringify(initial);
  const step=(session,command)=>draft.structure(session,manifests,{...command,expectedRevision:session.revision});
  let s=draft.begin(initial,manifests);
  s=step(s,{action:'addPage',id:'page-catalog',title:'Каталог',path:'/catalog/',
    sectionId:'section-catalog',component:'company-hero'});
  assert.equal(s.current.pages.length,3);
  assert.equal(s.current.pages[2].sections[0].elements[0].id,'section-catalog-heading');
  assert.equal(draft.changes(s,manifests).filter(d=>d.kind==='page-added').length,1);
  s=step(s,{action:'addSection',pageId:'page-catalog',sectionId:'section-catalog',
    id:'section-extra',component:'feature-highlights'});
  assert.equal(s.current.pages[2].sections.length,2);
  s=step(s,{action:'updatePage',pageId:'page-catalog',title:'Оборудование',path:'/equipment/'});
  s=step(s,{action:'movePage',pageId:'page-catalog',delta:-1});
  s=step(s,{action:'moveSection',pageId:'page-catalog',sectionId:'section-extra',delta:-1});
  assert.deepEqual(s.current.pages.map(p=>p.id),['page-home','page-catalog','page-contact']);
  assert.equal(s.current.pages[1].sections[0].id,'section-extra');
  assert.equal(s.current.pages[1].path,'/equipment/');
  const back=draft.undo(s,manifests),forward=draft.redo(back,manifests);
  assert.deepEqual(forward.current,s.current);
  refuses(()=>step(s,{action:'removePage',pageId:'page-home'}),'Root page cannot be deleted');
  refuses(()=>step(s,{action:'updatePage',pageId:'page-home',title:'Home',path:'/oops/'}),
    'Root path cannot change');
  refuses(()=>step(s,{action:'updatePage',pageId:'page-catalog',title:'Catalog',path:'/contact/'}),
    'Duplicate paths rejected');
  refuses(()=>step(s,{action:'addSection',pageId:'page-catalog',id:'section-extra',
    component:'company-hero'}),'Duplicate stable IDs rejected');
  refuses(()=>draft.structure(s,manifests,{action:'removePage',pageId:'page-catalog',
    expectedRevision:0}),'Stale structure update refused');
  s=step(s,{action:'removeSection',pageId:'page-catalog',sectionId:'section-extra'});
  s=step(s,{action:'removePage',pageId:'page-catalog'});
  assert.deepEqual(s.current,initial,'Original site content and IDs preserved by round trip');
  assert.equal(JSON.stringify(initial),initialBytes,'Input immutable');
});
test('image showcase is a closed media-bound component',()=>{
  const image=manifests[3];
  assert.deepEqual(sdk.validateManifest(image),image);
  const doc=same(initial);
  doc.pages[0].sections.push(sdk.sectionFrom(image,'section-photo'));
  const slot=doc.pages[0].sections.at(-1).elements.find(x=>x.slot==='photo');
  assert.equal(slot.values['content.media'],'');
  slot.values['content.media']='asset-test-one';
  refuses(()=>sdk.validateSite(doc,manifests),'Cannot bind image not in site assets');
  doc.assets=[{id:'asset-test-one',src:'/assets/asset-test-one.png',mime:'image/png',alt:'Demo'}];
  assert.equal(sdk.validateSite(doc,manifests).pages[0].sections.at(-1).component,'image-showcase');
});
test('lead form has typed text-only controls and unique stable slot IDs',()=>{
  const form=manifests[4];
  assert.deepEqual(sdk.validateManifest(form),form);
  const site=structuredClone(initial);
  site.pages[1].sections.push(sdk.sectionFrom(form,'section-inquiry'));
  const validated=sdk.validateSite(site,manifests);
  const draft=require('../sdk/draft.cjs');
  const started=draft.begin(validated,manifests);
  const preview=draft.blockPreview(started,manifests,'page-contact','section-inquiry','mobile');
  assert.equal(preview.component,'lead-form');
  assert.equal(preview.elements.length,6);
  assert.equal(preview.notPublished,true);
});
test('configurable form adds three typed slots without changing legacy forms',()=>{
  const m=manifests[5];assert.deepEqual(sdk.validateManifest(m),m);
  const doc=structuredClone(initial),section=sdk.sectionFrom(m,'section-survey');
  const field=section.elements.find(e=>e.slot==='extra-one');
  field.values['behavior.kind']='select';
  field.values['behavior.required']=true;
  field.values['content.options']='Доставка\\nСамовывоз';
  doc.pages[1].sections.push(section);
  assert.equal(sdk.validateSite(doc,manifests).pages[1].sections.at(-1).component,'lead-form-flex');
  assert.equal(manifests[4].id,'lead-form');
});
console.log('STAGE3 CONTRACT OFFLINE E2E PASS: '+checks+
  ' grouped flows; stable IDs, typed/filtered controls, responsive, asset binding,'+
  ' original design defaults, no-design brief, no-silent-overwrite and CLI. NO deploy.');
