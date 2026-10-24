'use strict';
// One comprehensive offline product flow for early Stage 3 contract.
// Does not accept Stage2, pass any of the 135 production requirements, or deploy.
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const sdk=require('../sdk/contract.cjs');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifests=['company-hero','feature-highlights','contact-panel','image-showcase','lead-form','lead-form-flex','service-grid','faq-accordion','testimonials','photo-gallery','media-story','partner-logos','cta-banner','pricing-plans','process-timeline','comparison-matrix','content-switcher','adaptive-gallery'].map(
  name=>read('components/'+name+'.json'));
let checks=0;
const test=(name,fn)=>{fn();checks++;};
const refuses=(fn,why)=>assert.throws(fn,Error,why);
const initial=read('fixtures/industrial-site.json');
const same=x=>JSON.parse(JSON.stringify(x));
const reg=sdk.registry(manifests);
const hero=manifests[0],highlights=manifests[1],contact=manifests[2];

test('four production components: typed repeater contracts, structural editing and safety',()=>{
  const D=require('../sdk/draft.cjs'),newTypes=['pricing-plans','process-timeline',
    'comparison-matrix','content-switcher'];
  const site=same(initial),sections=newTypes.map((name,i)=>{
    const sec=sdk.sectionFrom(manifests.find(m=>m.id===name),'section-factory-'+(i+1));
    site.pages[0].sections.push(sec);
    return sec;
  });
  assert.deepEqual(sdk.validateSite(site,manifests).pages[0].sections.slice(-4).map(s=>s.component),newTypes);
  let draft=D.begin(site,manifests);
  for(const sec of sections){
    const id='item-added-'+sec.component;
    draft=D.structure(draft,manifests,{action:'addItem',pageId:'page-home',sectionId:sec.id,
      id,expectedRevision:draft.revision});
    assert.equal(draft.current.pages[0].sections.find(s=>s.id===sec.id).items.at(-1).id,id);
  }
  assert.equal(D.undo(draft,manifests).current.pages[0].sections.at(-1).items.length,2);
  assert.equal(D.redo(D.undo(draft,manifests),manifests).current.pages[0].sections.at(-1).items.length,3);
  const broken=structuredClone(site);
  broken.pages[0].sections.at(-4).items[0].values['behavior.href']='javascript:alert(1)';
  refuses(()=>sdk.validateSite(broken,manifests),'All pricing links use the closed URL contract');
  broken.pages[0].sections.at(-4).items[0].values['behavior.href']='/contact/';
  broken.pages[0].sections.at(-4).items[0].values['behavior.featured']='false';
  refuses(()=>sdk.validateSite(broken,manifests),'Featured flag must be a real boolean');
  const hostile=structuredClone(site);
  hostile.pages[0].sections.at(-2).items[0].values['content.metric']='<img src=x onerror=alert(1)>';
  assert.equal(sdk.validateSite(hostile,manifests).pages[0].sections.at(-2).items[0].values['content.metric'],
    '<img src=x onerror=alert(1)>','User content remains text; PHP must escape on render');
  const overflow=structuredClone(site);
  const priced=overflow.pages[0].sections.at(-4);
  priced.items=Array.from({length:7},(_,i)=>({...structuredClone(priced.items[0]),id:'item-over-'+i}));
  refuses(()=>sdk.validateSite(overflow,manifests),'Pricing limits max six packages');
});

test('adaptive gallery has real typed layout controls, immutable history and safe bindings',()=>{
  const D=require('../sdk/draft.cjs'),site=same(initial),m=manifests.find(x=>x.id==='adaptive-gallery');
  assert.ok(m);
  const gallery=sdk.sectionFrom(m,'section-adaptive-gallery');
  site.pages[0].sections.push(gallery);
  let s=D.begin(site,manifests);
  const settings=gallery.elements.find(x=>x.slot==='settings');
  assert.equal(settings.values['behavior.layout'],'grid');
  s=D.edit(s,manifests,{pageId:'page-home',sectionId:gallery.id,elementId:settings.id,
    path:'behavior.layout',value:'carousel',expectedRevision:s.revision});
  s=D.edit(s,manifests,{pageId:'page-home',sectionId:gallery.id,elementId:settings.id,
    path:'behavior.columns',value:4,expectedRevision:s.revision});
  assert.equal(s.current.pages[0].sections.at(-1).elements[1].values['behavior.layout'],'carousel');
  assert.equal(D.undo(s,manifests).current.pages[0].sections.at(-1).elements[1].values['behavior.columns'],3);
  assert.equal(D.redo(D.undo(s,manifests),manifests).current.pages[0].sections.at(-1)
    .elements[1].values['behavior.columns'],4);
  for(const bad of ['javascript:alert(1)','<script>','unknown']){
    const invalid=same(site);
    invalid.pages[0].sections.at(-1).elements[1].values['behavior.layout']=bad;
    refuses(()=>sdk.validateSite(invalid,manifests),'Gallery layout closed enum');
  }
  const invalid=same(site);
  invalid.pages[0].sections.at(-1).elements[1].values['behavior.columns']=999;
  refuses(()=>sdk.validateSite(invalid,manifests),'Gallery columns bounded');
  invalid.pages[0].sections.at(-1).elements[1].values['behavior.columns']=3;
  invalid.pages[0].sections.at(-1).items[0].values['content.media']='asset-nope';
  refuses(()=>sdk.validateSite(invalid,manifests),'Gallery media references must exist');
  const hostile=same(site);
  hostile.pages[0].sections.at(-1).items[0].values['content.caption']='<img src=x onerror=alert(1)>';
  assert.ok(sdk.validateSite(hostile,manifests),'Caption is plain text, PHP must escape');
});

test('individual section appearances are strict, undoable, and inherited by previews',()=>{
  const D=require('../sdk/draft.cjs');
  let state=D.begin(initial,manifests);
  const cmd={action:'updateAppearance',pageId:state.current.pages[0].id,
    sectionId:state.current.pages[0].sections[0].id,
    appearance:{surface:'dark',spacing:'airy',align:'center'},expectedRevision:state.revision};
  state=D.structure(state,manifests,cmd);
  const picked=state.current.pages[0].sections[0];
  assert.deepEqual(picked.appearance,cmd.appearance);
  assert.deepEqual(D.blockPreview(state,manifests,cmd.pageId,cmd.sectionId).appearance,cmd.appearance);
  assert.ok(D.changes(state,manifests).some(x=>x.kind==='appearance-updated'));
  assert.equal(D.undo(state,manifests).current.pages[0].sections[0].appearance,undefined);
  assert.deepEqual(D.redo(D.undo(state,manifests),manifests).current,state.current);
  for(const malicious of [
    {surface:'javascript:alert(1)',spacing:'normal',align:'left'},
    {surface:'dark',spacing:'normal',align:'center',css:'position:fixed'},
    {surface:'paper',spacing:'500px',align:'left'},
    {surface:'paper',spacing:'normal',align:'right'}
  ]){
    assert.throws(()=>D.structure(state,manifests,{...cmd,appearance:malicious,expectedRevision:state.revision}));
  }
  const invalid=structuredClone(state.current);invalid.pages[0].sections[0].appearance.align='<script>';
  assert.throws(()=>sdk.validateSite(invalid,manifests));
});

test('responsive presets and CTA are fully typed, undoable and backward compatible',()=>{
  const D=require('../sdk/draft.cjs');
  const site=same(initial),cta=sdk.sectionFrom(manifests.find(m=>m.id==='cta-banner'),'section-cta-new');
  site.pages[0].sections.push(cta);
  const start=D.begin(site,manifests),full={surface:'paper',spacing:'airy',align:'center',
    width:'narrow',heading:'expressive',corners:'round',mobileAlign:'left',mobileSpacing:'tight',button:'outline'};
  const next=D.structure(start,manifests,{action:'updateAppearance',pageId:'page-home',
    sectionId:cta.id,appearance:full,expectedRevision:start.revision});
  assert.deepEqual(D.blockPreview(next,manifests,'page-home',cta.id,'mobile').appearance,full);
  assert.equal(D.undo(next,manifests).current.pages[0].sections.at(-1).appearance,undefined);
  assert.deepEqual(D.redo(D.undo(next,manifests),manifests).current,next.current);
  assert.equal(sdk.validateSite(next.current,manifests).pages[0].sections.at(-1).component,'cta-banner');
  for(const [property,invalid] of Object.entries({width:'calc(100%)',heading:'gigantic',corners:'100vh',
    mobileAlign:'justify',mobileSpacing:'-1px',button:'url(//bad)'})){
    const bad=same(next.current);bad.pages[0].sections.at(-1).appearance[property]=invalid;
    refuses(()=>sdk.validateSite(bad,manifests),'Closed appearance preset '+property);
  }
  const legacy=same(initial);legacy.pages[0].sections[0].appearance={surface:'dark',spacing:'normal',align:'left'};
  assert.equal(sdk.validateSite(legacy,manifests).pages[0].sections[0].appearance.width,undefined);
  assert.ok(read('schemas/site-v1.schema.json').$defs.appearance.properties.mobileSpacing.enum.includes('tight'));
});

test('theme + page SEO/nav accept only closed values and participate in Undo',()=>{
  const site=same(initial);
  site.theme={background:'#101b2a',surface:'#f8f9fa',text:'#ffffff',primary:'#ff6600',font:'georgia',maxWidth:980};
  site.pages[0].seo={title:'Каталог',description:'Подтверждённое описание',robots:'noindex'};
  site.pages[0].navigation={label:'Каталог',hidden:false};
  assert.equal(sdk.validateSite(site,reg).theme.primary,'#ff6600');
  const D=require('../sdk/draft.cjs'),updated=D.replaceSite(D.begin(initial,manifests),manifests,site,0);
  assert.ok(D.changes(updated,manifests).some(c=>c.kind==='theme-updated'));
  assert.ok(D.changes(updated,manifests).some(c=>c.kind==='page-updated'));
  assert.equal(D.undo(updated,manifests).current.theme,undefined);
  const bad=same(site);bad.theme.primary='red; background:url(//evil)';
  refuses(()=>sdk.validateSite(bad,manifests),'CSS injection rejected');
  const hidden=same(site);hidden.pages[0].navigation.hidden='yes';
  refuses(()=>sdk.validateSite(hidden,manifests),'Invalid nav flag rejected');
});

test('four safe repeatable manifests, editable items, stable clone identities and Undo',()=>{
  const D=require('../sdk/draft.cjs'),names=['service-grid','faq-accordion','testimonials','photo-gallery'];
  let doc=same(initial);
  for(const [i,name] of names.entries()){
    const m=manifests.find(x=>x.id===name),sec=sdk.sectionFrom(m,'section-repeat-'+i);
    assert.equal(sec.items.length,m.repeat.min);
    doc.pages[0].sections.push(sec);
  }
  sdk.validateSite(doc,manifests);
  const s=doc.pages[0].sections[2],ids=s.items.map(i=>i.id);
  let d=D.begin(doc,manifests);
  const go=command=>d=D.structure(d,manifests,{...command,expectedRevision:d.revision});
  go({action:'addItem',pageId:'page-home',sectionId:s.id,id:'item-manual-new'});
  assert.equal(d.current.pages[0].sections[2].items.length,3);
  d=D.edit(d,manifests,{pageId:'page-home',sectionId:s.id,elementId:'item-manual-new',
    path:'content.title',value:'Новая настоящая услуга',expectedRevision:d.revision});
  assert.equal(D.blockPreview(d,manifests,'page-home',s.id).items[2].props.content.title,'Новая настоящая услуга');
  go({action:'duplicateItem',pageId:'page-home',sectionId:s.id,itemId:'item-manual-new',id:'item-manual-copy'});
  go({action:'moveItem',pageId:'page-home',sectionId:s.id,itemId:'item-manual-copy',delta:-1});
  assert.equal(d.current.pages[0].sections[2].items[2].id,'item-manual-copy');
  go({action:'removeItem',pageId:'page-home',sectionId:s.id,itemId:'item-manual-copy'});
  assert.deepEqual(d.current.pages[0].sections[2].items.slice(0,2).map(x=>x.id),ids);
  assert.ok(D.changes(d,manifests).some(x=>x.kind==='items-updated'));
  go({action:'duplicateSection',pageId:'page-home',sectionId:s.id,id:'section-repeat-clone'});
  const clone=d.current.pages[0].sections[3];
  assert.equal(clone.items[2].values['content.title'],'Новая настоящая услуга');
  assert.notEqual(clone.items[2].id,'item-manual-new');
  assert.equal(D.undo(d,manifests).current.pages[0].sections.length,6);
  assert.equal(D.redo(D.undo(d,manifests),manifests).current.pages[0].sections.length,7);
  const malformed=structuredClone(d.current);
  malformed.pages[0].sections[2].items[0].values.evil='javascript:alert(1)';
  refuses(()=>sdk.validateSite(malformed,manifests),'Repeater cannot carry undeclared code');
  const overflow=structuredClone(d.current);
  overflow.pages[0].sections[2].items=Array.from({length:30},(_,i)=>({
    id:'item-overflow-'+i,values:structuredClone(s.items[0].values)}));
  refuses(()=>sdk.validateSite(overflow,manifests),'Repeater enforces max count');
  const invalidAsset=structuredClone(doc);
  invalidAsset.pages[0].sections[5].items[0].values['content.media']='asset-not-uploaded';
  refuses(()=>sdk.validateSite(invalidAsset,manifests),'Repeat gallery binds only owned media');
  const orphan=structuredClone(doc);orphan.pages[0].sections[2].items[0].id=orphan.pages[0].sections[2].elements[0].id;
  refuses(()=>sdk.validateSite(orphan,manifests),'Repeated IDs cannot clash with headings');
  const injection=structuredClone(doc);injection.pages[0].sections[2].items[0].values['behavior.href']='javascript:alert(1)';
  refuses(()=>sdk.validateSite(injection,manifests),'Repeat links are safe URLs only');
});

test('complete menu hierarchy, CTA and responsive settings validate and Undo safely',()=>{
  const D=require('../sdk/draft.cjs');
  const site=structuredClone(initial);
  const existing=site.pages[1];
  site.pages.push({id:'page-pricing',path:'/pricing/',title:'Цены',
    sections:[sdk.sectionFrom(manifests[0],'section-pricing')]});
  existing.navigation={label:'Напишите нам',hidden:false,parentId:site.pages[0].id};
  site.menu={style:'bold',sticky:true,mobile:'expanded',
    ctaPageId:existing.id,ctaLabel:'Написать'};
  assert.equal(sdk.validateSite(site,manifests).pages[1].navigation.parentId,site.pages[0].id);
  let d=D.begin(site,manifests),next=structuredClone(site);
  next.menu.style='quiet';d=D.replaceSite(d,manifests,next,d.revision);
  assert.ok(D.changes(d,manifests).some(x=>x.kind==='menu-updated'));
  assert.equal(D.undo(d,manifests).current.menu.style,'bold');
  for(const [label,change] of [
    ['Unknown parent',x=>x.pages[1].navigation.parentId='page-unknown'],
    ['Nested parent',x=>x.pages[2].navigation={label:'Тарифы',hidden:false,parentId:'page-contact'}],
    ['Hidden parent',x=>x.pages[0].navigation={label:'Главная',hidden:true}],
    ['Root cannot nest',x=>x.pages[0].navigation={label:'Главная',hidden:false,parentId:'page-pricing'}],
    ['Missing CTA',x=>x.menu.ctaPageId='page-unknown'],
    ['Unbounded variant',x=>x.menu.style='javascript:evil'],
    ['Unexpected CSS',x=>x.menu.css='position:fixed'],
    ['Unsupported parent HTML',x=>x.pages[1].navigation.parentId='<script>']
  ]){const invalid=structuredClone(site);change(invalid);
    refuses(()=>sdk.validateSite(invalid,manifests),label);
  }
  // Removing a parent page clears dependent navigation and its CTA destination.
  const withChild=structuredClone(site);
  withChild.pages[2].navigation={label:'Цены',hidden:false,parentId:'page-contact'};
  delete withChild.pages[1].navigation.parentId;
  const starting=D.begin(withChild,manifests);
  const removed=D.structure(starting,manifests,{action:'removePage',pageId:'page-contact',
    expectedRevision:starting.revision});
  assert.equal(removed.current.pages.find(p=>p.id==='page-pricing').navigation.parentId,undefined);
  assert.equal(removed.current.menu.ctaPageId,'');
  assert.equal(D.undo(removed,manifests).current.pages.length,3);
});

test('URL changes keep permanent aliases, diagnostics find bad links and Undo keeps history',()=>{
  const D=require('../sdk/draft.cjs');
  let d=D.begin(initial,manifests);
  const move=(command)=>d=D.structure(d,manifests,{...command,expectedRevision:d.revision});
  move({action:'updatePage',pageId:'page-contact',title:'Контакты',path:'/help/'});
  assert.deepEqual(d.current.redirects,[{from:'/contact/',to:'/help/'}]);
  let report=sdk.inspectSite(d.current,manifests);
  assert.equal(report.redirects,1);
  assert.ok(report.warnings.some(x=>x.kind==='old-link'),'Existing menu links warn about redirect');
  move({action:'updatePage',pageId:'page-contact',title:'Контакты',path:'/support/'});
  assert.deepEqual(d.current.redirects,[{from:'/contact/',to:'/support/'},{from:'/help/',to:'/support/'}],
    'Aliases resolve directly, no redirect chains');
  refuses(()=>D.structure(d,manifests,{action:'addRedirect',from:'/support/',to:'/',expectedRevision:d.revision}),
    'Cannot hide an existing live page under a redirect');
  refuses(()=>D.structure(d,manifests,{action:'addRedirect',from:'/bad/',to:'/missing/',expectedRevision:d.revision}),
    'Redirects only to live page paths');
  const before=JSON.stringify(d.current);
  move({action:'removeRedirect',from:'/contact/'});
  assert.equal(d.current.redirects.length,1);
  assert.deepEqual(D.undo(d,manifests).current,JSON.parse(before));
  const updated=structuredClone(d.current);
  updated.pages[0].sections[0].elements[2].values['behavior.href']='/nonexistent/';
  report=sdk.inspectSite(updated,manifests);
  assert.ok(report.errors.some(x=>x.kind==='broken-link'));
  updated.pages[0].sections[0].elements[2].values['behavior.href']='/support/#ghost-section';
  report=sdk.inspectSite(updated,manifests);
  assert.ok(report.errors.some(x=>x.kind==='broken-anchor'));
  const escaping=structuredClone(d.current);
  escaping.redirects.push({from:'/something/',to:'/support/?malicious'});
  refuses(()=>sdk.validateSite(escaping,manifests),'No query/HTML injection in redirects');
});

test('media library: alt, global replacement, protected detach, undo and rich media manifests',()=>{
  const D=require('../sdk/draft.cjs');
  const site=same(initial);
  const first={id:'asset-factory-old',src:'/assets/asset-factory-old.png',mime:'image/png',alt:'Старый кадр'};
  const next={id:'asset-factory-new',src:'/assets/asset-factory-new.png',mime:'image/png',alt:'Новый кадр'};
  site.assets=[first,next];
  const m=key=>manifests.find(x=>x.id===key);
  const story=sdk.sectionFrom(m('media-story'),'section-rich-story');
  const logos=sdk.sectionFrom(m('partner-logos'),'section-rich-logos');
  const photos=sdk.sectionFrom(m('photo-gallery'),'section-rich-gallery');
  story.elements.find(x=>x.slot==='photo').values['content.media']=first.id;
  logos.items[0].values['content.media']=first.id;
  photos.items[0].values['content.media']=first.id;
  site.pages[0].sections.push(story,logos,photos);
  assert.equal(sdk.validateSite(site,manifests).pages[0].sections.length,5);
  let d=D.begin(site,manifests);
  const step=cmd=>d=D.structure(d,manifests,{...cmd,expectedRevision:d.revision});
  refuses(()=>step({action:'removeAsset',assetId:first.id}),'Cannot detach used image');
  refuses(()=>step({action:'replaceAsset',assetId:first.id,targetId:'asset-foreign'}),
    'Only media from this site can be used as a replacement');
  step({action:'renameAsset',assetId:first.id,alt:'Готовый станок в цеху'});
  assert.ok(D.changes(d,manifests).some(x=>x.kind==='media-library-updated'));
  assert.equal(D.undo(d,manifests).current.assets[0].alt,'Старый кадр');
  step({action:'replaceAsset',assetId:first.id,targetId:next.id});
  for(const block of d.current.pages[0].sections.slice(-3))
    for(const item of [...block.elements,...(block.items||[])])
      assert.notEqual(item.values['content.media'],first.id,'All references re-bound including repeaters');
  step({action:'removeAsset',assetId:first.id});
  assert.equal(d.current.assets.length,1);
  assert.equal(d.current.assets[0].id,next.id);
  assert.equal(D.undo(d,manifests).current.assets.length,2);
  refuses(()=>step({action:'renameAsset',assetId:next.id,alt:'A\nB'}),'Unsafe control text rejected');
  const bad=same(d.current);bad.assets[0].alt='Bad\u0000alt';
  refuses(()=>sdk.validateSite(bad,manifests),'No control characters in image descriptions');
  const invalid=same(site);invalid.pages[0].sections.at(-1).items[0].values['content.media']='asset-another-site';
  refuses(()=>sdk.validateSite(invalid,manifests),'No foreign image references in partner logos');
});
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
test('opt-in flexible forms support independent typed fields and safe select dependencies',()=>{
  const m=manifests.find(m=>m.id==='lead-form-flex'),site=structuredClone(initial);
  const section=sdk.sectionFrom(m,'section-dynamic-form');
  section.elements.find(e=>e.slot==='extra-one').values['behavior.kind']='select';
  section.elements.find(e=>e.slot==='extra-one').values['content.options']='Быстро\nОбычно';
  section.formFields=[
    {id:'field-recipient',label:'Адресат',kind:'text',required:true,
      options:[],placeholder:'Получатель',when:{field:'extra1',option:1}},
    {id:'field-channel',label:'Канал связи',kind:'select',required:false,
      options:['Электронная почта','Телефон'],placeholder:''},
    {id:'field-email-address',label:'Email получателя',kind:'email',required:true,
      options:[],placeholder:'name@example.com',when:{field:'field-channel',option:1}}
  ];
  site.pages[1].sections.push(section);
  assert.equal(sdk.validateSite(site,manifests).pages[1].sections.at(-1).formFields.length,3);
  const D=require('../sdk/draft.cjs');
  let d=D.begin(site,manifests);
  const changed=structuredClone(d.current);changed.pages[1].sections.at(-1).formFields[0].label='Кому';
  d=D.replaceSite(d,manifests,changed,d.revision);
  assert.ok(D.changes(d,manifests).some(x=>x.kind==='form-fields-updated'));
  assert.equal(D.undo(d,manifests).current.pages[1].sections.at(-1).formFields[0].label,'Адресат');
  assert.equal(D.blockPreview(d,manifests,'page-contact','section-dynamic-form').formFields.length,3);
  const wrong=structuredClone(site);
  wrong.pages[1].sections.at(-1).formFields[0].when={field:'field-email-address',option:1};
  refuses(()=>sdk.validateSite(wrong,manifests),'Forward and cyclic dependencies rejected');
  const injected=structuredClone(site);
  injected.pages[1].sections.at(-1).formFields[1].options[0]='<script>';
  // Data is safely text-only; never executable HTML.
  assert.equal(sdk.validateSite(injected,manifests).pages[1].sections.at(-1).formFields[1].options[0],'<script>');
  injected.pages[1].sections.at(-1).formFields[1].options[0]='\u0000';
  refuses(()=>sdk.validateSite(injected,manifests),'Control bytes rejected');
  const overflow=structuredClone(site);
  overflow.pages[1].sections.at(-1).formFields=Array.from({length:7},(_,i)=>({
    id:'field-too-many-'+i,label:'Вопрос',kind:'text',required:false,options:[],placeholder:''}));
  refuses(()=>sdk.validateSite(overflow,manifests),'Form capacity restricted');
  const other=structuredClone(initial);other.pages[0].sections[0].formFields=[];
  refuses(()=>sdk.validateSite(other,manifests),'Only form-flex can carry formFields');
});

test('reusable section templates, full page duplicates, undo/redo, and no stale changes',()=>{
  const D=require('../sdk/draft.cjs');
  const initialBytes=JSON.stringify(initial);
  let state=D.begin(initial,manifests);
  const original=initial.pages[0].sections[0];
  const apply=command=>{state=D.structure(state,manifests,{...command,expectedRevision:state.revision});};
  apply({action:'duplicateSection',pageId:'page-home',sectionId:original.id,id:'section-cloned'});
  const copy=state.current.pages[0].sections.find(x=>x.id==='section-cloned');
  assert.equal(copy.component,original.component);
  assert.deepEqual(copy.elements.map(x=>x.values),original.elements.map(x=>x.values));
  assert.notEqual(copy.elements[0].id,original.elements[0].id);
  apply({action:'duplicatePage',pageId:'page-contact',id:'page-extra-copy',title:'Копия',path:'/extra-copy/'});
  assert.equal(state.current.pages.length,3);
  assert.notEqual(state.current.pages[2].sections[0].id,initial.pages[1].sections[0].id);
  apply({action:'applyTemplate',pageId:'page-extra-copy',sectionId:state.current.pages[2].sections[0].id,
    id:'section-from-template',template:original});
  assert.equal(state.current.pages[2].sections.length,2);
  const old=state.current;
  state=D.undo(state,manifests);
  assert.equal(state.current.pages[2].sections.length,1);
  state=D.redo(state,manifests);
  assert.deepEqual(state.current,old);
  refuses(()=>D.structure(state,manifests,{action:'applyTemplate',pageId:'page-home',id:'section-from-template',
      template:original,expectedRevision:0}),'Stale preset apply refused');
  refuses(()=>D.structure(state,manifests,{action:'applyTemplate',pageId:'page-home',id:'section-invalid',
      template:{...original,component:'untrusted-code'},expectedRevision:state.revision}),'Unregistered template refused');
  refuses(()=>D.structure(state,manifests,{action:'duplicatePage',pageId:'page-home',
      id:'page-duplicate-2',title:'Copy',path:'/',expectedRevision:state.revision}),'Duplicate path refused');
  assert.equal(JSON.stringify(initial),initialBytes,'Original source remains immutable');
});
console.log('STAGE3 CONTRACT OFFLINE E2E PASS: '+checks+
  ' grouped flows; stable IDs, typed/filtered controls, responsive, asset binding,'+
  ' original design defaults, no-design brief, no-silent-overwrite and CLI. NO deploy.');

require('./recipes-smoke.cjs');
