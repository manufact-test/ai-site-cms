'use strict';
// One comprehensive offline product flow for early Stage 3 contract.
// Does not accept Stage2, pass any of the 135 production requirements, or deploy.
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const sdk=require('../sdk/contract.cjs');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifests=['company-hero','feature-highlights','contact-panel','image-showcase','lead-form','lead-form-flex','service-grid','faq-accordion','testimonials','photo-gallery','media-story','partner-logos','cta-banner','pricing-plans','process-timeline','comparison-matrix','content-switcher','adaptive-gallery','custom-section'].map(
  name=>read('components/'+name+'.json'));
let checks=0;
const test=(name,fn)=>{fn();checks++;};
const refuses=(fn,why)=>assert.throws(fn,Error,why);
const initial=read('fixtures/industrial-site.json');
const same=x=>JSON.parse(JSON.stringify(x));
const reg=sdk.registry(manifests);
const hero=manifests[0],highlights=manifests[1],contact=manifests[2];

test('optional site header is safe, page-ID linked and editable',()=>{
  const X=require('../sdk/draft.cjs'),site=same(initial),target=site.pages.find(p=>p.path!=='/');
  site.header={notice:'Бесплатная консультация',noticePageId:target.id,
    phone:'+48 (500) 600-700',email:'hello@example.com',tone:'primary',mobile:'hide'};
  sdk.validateSite(site,manifests);
  const invalid=same(site);invalid.header.email='invalid email';
  refuses(()=>sdk.validateSite(invalid,manifests),'header email is validated');
  const foreign=same(site);foreign.header.noticePageId='page-not-found';
  refuses(()=>sdk.validateSite(foreign,manifests),'header references existing pages');
  const badMode=same(site);badMode.header.mobile='script';
  refuses(()=>sdk.validateSite(badMode,manifests),'header mobile setting is bounded');
  const draft=X.begin(site,manifests);
  const renamed=X.structure(draft,manifests,{action:'updatePage',pageId:target.id,
    title:target.title,path:'/updated-contact/',expectedRevision:draft.revision});
  assert.equal(renamed.current.header.noticePageId,target.id);
  const deleted=X.structure(renamed,manifests,{action:'removePage',pageId:target.id,
    expectedRevision:renamed.revision});
  assert.equal(deleted.current.header.noticePageId,'');
  assert.equal(deleted.current.header.notice,'Бесплатная консультация');
  sdk.validateSite(deleted.current,manifests);
});

test('device visibility edits are undoable, safe and reflected in preview data',()=>{
  const D=require('../sdk/draft.cjs'),site=same(initial),section=site.pages[0].sections[0];
  section.deviceVisibility={mobile:false};sdk.validateSite(site,manifests);
  for(const wrong of [{desktop:false,tablet:false,mobile:false},{mobile:'no'},{}]){
    const invalid=same(site);invalid.pages[0].sections[0].deviceVisibility=wrong;
    refuses(()=>sdk.validateSite(invalid,manifests));
  }
  const origin=D.begin(site,manifests);
  const set=(draft,device,visible)=>D.structure(draft,manifests,{
    action:'setSectionVisibility',pageId:site.pages[0].id,sectionId:section.id,
    device,visible,expectedRevision:draft.revision});
  const desktop=set(origin,'desktop',false);
  assert.deepEqual(desktop.current.pages[0].sections[0].deviceVisibility,{mobile:false,desktop:false});
  refuses(()=>set(desktop,'tablet',false));
  const restored=set(desktop,'mobile',true);
  assert.deepEqual(restored.current.pages[0].sections[0].deviceVisibility,{desktop:false});
  const visible=set(restored,'desktop',true);
  assert.equal(Object.hasOwn(visible.current.pages[0].sections[0],'deviceVisibility'),false);
  assert.deepEqual(D.undo(visible,manifests).current,restored.current);
  assert.equal(set(visible,'desktop',true).revision,visible.revision);
  assert.equal(D.blockPreview(origin,manifests,site.pages[0].id,section.id,'mobile').deviceVisibility.mobile,false);
});
test('viewport audit rejects blank mobile pages and flags hidden headings and anchor targets',()=>{
  const site=same(initial),home=site.pages[0];
  for(const section of home.sections)section.deviceVisibility={mobile:false};
  refuses(()=>sdk.validateSite(site,manifests),'All individually allowed switches can still blank a page');
  delete home.sections[1].deviceVisibility;
  // The desktop hero remains visible only on desktop/tablet; mobile retains section two.
  const first=home.sections[0],second=home.sections[1];
  const report=sdk.inspectSite(site,manifests);
  assert.equal(report.deviceCoverage.find(x=>x.pageId===home.id&&x.device==='mobile').sections,1);
  assert.ok(report.warnings.some(w=>w.kind==='device-missing-h1'&&w.device==='mobile'&&w.pageId===home.id));
  assert.ok(!report.warnings.some(w=>w.kind==='device-missing-h1'&&w.device==='desktop'&&w.pageId===home.id));
  // Real internal anchor exists but its visible source cannot reach its hidden target.
  // Links are tested below on a separately authored Graph node.
  second.designGraph={version:1,id:'graph-visible-anchor',nodes:[
    {id:'graph-link-hidden-target',type:'link',text:'Открыть блок',href:'/#'+first.id,styles:{}}
  ]};
  const checked=sdk.inspectSite(site,manifests);
  assert.ok(checked.warnings.some(w=>w.kind==='hidden-anchor-device'&&w.device==='mobile'&&w.targetSectionId===first.id
    &&w.targetPageId===home.id));
  const fixed=same(site);
  delete fixed.pages[0].sections[0].deviceVisibility;
  const clean=sdk.inspectSite(fixed,manifests);
  assert.ok(!clean.warnings.some(w=>w.kind==='hidden-anchor-device'));
  assert.ok(!clean.warnings.some(w=>w.kind==='device-missing-h1'&&w.pageId===home.id));
  assert.ok(!sdk.inspectSite(initial,manifests).warnings.some(w=>w.kind.startsWith('device-')));
});
test('a Design Graph replacing a form is not counted as a functioning visitor form',()=>{
  const site=same(initial),page=site.pages[0],D=require('../sdk/design-graph.cjs');
  const form=sdk.sectionFrom(manifests.find(m=>m.id==='lead-form'),'section-graph-replaced-form');
  page.sections.push(form);
  assert.equal(sdk.inspectSite(site,manifests).deviceCoverage.find(x=>
    x.pageId===page.id&&x.device==='mobile').forms,1);
  form.designGraph=D.baseGraph(form.id);
  const report=sdk.inspectSite(site,manifests);
  assert.equal(report.deviceCoverage.find(x=>x.pageId===page.id&&x.device==='mobile').forms,0);
  assert.ok(report.warnings.some(x=>x.kind==='form-overridden-by-design'&&x.sectionId===form.id));
});
test('custom client Graph form slot retains real form semantics and device coverage',()=>{
  const D=require('../sdk/design-graph.cjs'),site=same(initial);
  const section=sdk.sectionFrom(manifests.find(m=>m.id==='lead-form-flex'),'section-graph-form');
  section.designGraph={version:1,id:'graph-inquiry-form',nodes:[
    {id:'inquiry-layout',type:'container',styles:{display:'grid',columns:2,gap:20},
      responsive:{mobile:{columns:1}},children:[
        {id:'inquiry-copy',type:'heading',level:2,text:'Напишите нам'},
        {id:'inquiry-live-slot',type:'form-slot',styles:{padding:16}}
      ]}
  ]};
  site.pages[1].sections.push(section);
  sdk.validateSite(site,manifests);
  assert.deepEqual(D.formSlotIds(section.designGraph),['inquiry-live-slot']);
  const report=sdk.inspectSite(site,manifests);
  assert.equal(report.deviceCoverage.find(v=>v.pageId===site.pages[1].id&&v.device==='mobile').forms,1);
  assert.ok(!report.warnings.some(w=>w.kind==='form-overridden-by-design'&&w.sectionId===section.id));
  assert.match(D.render(site,section.designGraph),/cmsdg-form-slot/);
  assert.doesNotMatch(D.render(site,section.designGraph),/<form\b/,
    'Offline Graph inspector shows an inert slot, not a forged submission form');
  const hidden=same(site);
  hidden.pages[1].sections.at(-1).designGraph.nodes[0].children[1].responsive={mobile:{hidden:true}};
  const mobile=sdk.inspectSite(hidden,manifests);
  assert.equal(mobile.deviceCoverage.find(v=>v.pageId===site.pages[1].id&&v.device==='mobile').forms,0);
  assert.ok(mobile.warnings.some(w=>w.kind==='device-missing-form'&&w.device==='mobile'));
  const duplicated=same(site);
  duplicated.pages[1].sections.at(-1).designGraph.nodes.push(
    {id:'inquiry-second-slot',type:'form-slot'});
  refuses(()=>sdk.validateSite(duplicated,manifests),'Duplicate live form slot rejected');
  const fake=same(site);
  fake.pages[1].sections.at(-1).designGraph.nodes[0].children[1].text='Submit without validation';
  refuses(()=>sdk.validateSite(fake,manifests),'Form slot cannot carry custom visitor HTML');
  const wrong=same(site);
  wrong.pages[1].sections.at(-1).component='custom-section';
  refuses(()=>sdk.validateSite(wrong,manifests),'Form slot is not allowed in generic Graph section');
});
test('authored form fields render in a truthful inert Graph Studio preview',()=>{
  const G=require('../sdk/design-graph.cjs'),site=same(initial);
  const section=sdk.sectionFrom(manifests.find(m=>m.id==='lead-form-flex'),'section-editor-preview');
  section.formFields=[{id:'field-interest',label:'Услуга <script> & детали',kind:'select',
    required:false,options:['Проект & расчёт','Другое'],placeholder:'',fullWidth:true}];
  section.formSteps=[
    {title:'Контакт и интерес',fields:['name','field-interest']},
    {title:'Ответ клиенту',fields:['email','message']}
  ];
  section.designGraph={version:1,id:'graph-editor-lead-preview',nodes:[
    {id:'graph-editor-lead-container',type:'container',children:[
      {id:'graph-editor-lead-title',type:'heading',text:'Получить консультацию',level:2},
      {id:'graph-editor-lead-slot',type:'form-slot',styles:{padding:12}}
    ]}
  ]};
  site.pages[1].sections.push(section);
  sdk.validateSite(site,manifests);
  const preview=G.render(site,section.designGraph);
  assert.match(preview,/cmsdg-form-preview/);
  assert.match(preview,/Услуга &lt;script&gt; &amp; детали/);
  assert.match(preview,/Проект &amp; расчёт/);
  assert.match(preview,/Шаг 1 \/ 2/);
  assert.match(preview,/<fieldset class="cmsdg-preview-step"><legend>Контакт и интерес<\/legend>/);
  assert.match(preview,/data-cms-form-field="field-interest"/);
  assert.match(preview,/data-cms-form-field="field-interest" class="cmsdg-preview-field cmsdg-preview-wide"/);
  assert.match(preview,/type="button" disabled/);
  assert.doesNotMatch(preview,/<form\b|action=|name="_token"|method="post"/i,
    'Offline Studio cannot submit or expose an editable form token');
  assert.doesNotMatch(preview,/Электронная почта/,
    'Multi-step preview shows the initially visible step only');
  const editorPreview=G.render(site,structuredClone(section.designGraph),'',null,section.id,null,section);
  assert.match(editorPreview,/Услуга &lt;script&gt;/);
  const slot=section.designGraph.nodes[0].children[1];
  slot.formAppearance={gap:22,labelGap:9,columns:2,maxWidth:960,inputRadius:16,
    inputPadding:14,inputFontSize:17,borderWidth:2,stepRadius:15,stepPadding:24,buttonRadius:25,
    buttonPadding:15,buttonFontSize:18,buttonWeight:600,labelWeight:700,inputBackground:'#f5f8fa',
    borderColor:'@muted',labelColor:'@foreground',inputColor:'#223344',focusColor:'@accent',
    stepBackground:'#f8fafc',stepBorderColor:'@muted',progressColor:'@accent',
    buttonBackground:'@accent',buttonColor:'#ffffff'};
  slot.formAppearanceTablet={gap:12,columns:2};
  slot.formAppearanceMobile={gap:8,columns:1,buttonRadius:12};
  sdk.validateSite(site,manifests);
  const styled=G.render(site,section.designGraph,'',null,section.id,null,section);
  for(const value of ['--cmsdg-form-gap:22px','--cmsdg-form-input-radius:16px',
    '--cmsdg-form-button-padding:15px','--cmsdg-form-label-weight:700',
    '--cmsdg-form-button-bg:#0a5bff','--cmsdg-form-border:#667788',
    '--cmsdg-form-columns:2','--cmsdg-form-max-width:960px',
    '--cmsdg-form-input-font-size:17px','--cmsdg-form-border-width:2px',
    '--cmsdg-form-button-weight:600','--cmsdg-form-focus-color:#0a5bff',
    '--cmsdg-form-step-radius:15px','--cmsdg-form-step-padding:24px',
    '--cmsdg-form-step-bg:#f8fafc','--cmsdg-form-progress-color:#0a5bff']){
    assert.ok(styled.includes(value),'Preview form appearance '+value);
  }
  assert.match(styled,/@media\(max-width:900px\)\{[^}]*--cmsdg-form-gap:12px/);
  assert.match(styled,/@media\(max-width:600px\)\{[^}]*--cmsdg-form-gap:8px/);
  assert.match(styled,/@media\(max-width:600px\)\{[^}]*--cmsdg-form-columns:1/);
  assert.match(G.render(site,section.designGraph,'',null,section.id,null,section,1),/cmsdg-preview-wide/);
  assert.match(styled,/grid-template-columns:repeat\(var\(--cmsdg-form-columns,1\)/);
  assert.match(styled,/var\(--cmsdg-form-button-radius,10px\)/);
  const clean=JSON.stringify(slot);
  section.formFields[0].fullWidth='yes';refuses(()=>sdk.validateSite(site,manifests));
  section.formFields[0].fullWidth=true;
  for(const [key,badValue] of [['gap',-1],['columns',3],['maxWidth',2000],
    ['inputFontSize',8],['borderWidth',12],['stepPadding',99],['inputRadius',999],['borderColor','url(javascript:evil)'],
    ['labelWeight',900],['buttonWeight',900],['focusColor','@missing'],['buttonBackground','@missing']]){
    slot.formAppearance[key]=badValue;refuses(()=>sdk.validateSite(site,manifests));
    Object.assign(slot,JSON.parse(clean));
  }
  slot.formAppearanceMobile={gap:'12px'};refuses(()=>sdk.validateSite(site,manifests));
  slot.formAppearanceMobile={gap:8,columns:1,buttonRadius:12};
  slot.formAppearance={...slot.formAppearance,unrestrictedCss:'expression(evil)'};refuses(()=>sdk.validateSite(site,manifests));
  Object.assign(slot,JSON.parse(clean));
  section.designGraph.nodes[0].formAppearance={gap:8};
  refuses(()=>sdk.validateSite(site,manifests),'Only form slots may carry appearance overrides');
  delete section.designGraph.nodes[0].formAppearance;
  sdk.validateSite(site,manifests);
});
test('responsive Graph headings and hidden mobile lead forms use effective visibility',()=>{
  const site=same(initial),page=site.pages[0],hero=page.sections[0];
  hero.designGraph={version:1,id:'graph-responsive-seo',nodes:[
    {id:'graph-desktop-heading',type:'heading',level:1,text:'Desktop heading',
      styles:{},responsive:{mobile:{hidden:true}}},
    {id:'graph-mobile-heading',type:'heading',level:1,text:'Mobile heading',
      styles:{hidden:true},responsive:{mobile:{display:'block'}}}
  ]};
  const form=sdk.sectionFrom(manifests.find(m=>m.id==='lead-form'),'section-viewport-form');
  form.deviceVisibility={mobile:false};page.sections.push(form);
  const healthy=sdk.inspectSite(site,manifests);
  const mobile=healthy.deviceCoverage.find(v=>v.pageId===page.id&&v.device==='mobile');
  const desktop=healthy.deviceCoverage.find(v=>v.pageId===page.id&&v.device==='desktop');
  assert.equal(mobile.h1,1,'Mobile H1 reflects responsive Graph visibility');
  assert.equal(desktop.h1,1,'Desktop excludes mobile-only heading');
  assert.equal(mobile.forms,0);assert.equal(desktop.forms,1);
  assert.ok(healthy.warnings.some(w=>w.kind==='device-missing-form'&&w.device==='mobile'&&w.sectionId===form.id));
  assert.ok(!healthy.warnings.some(w=>w.kind==='device-missing-h1'&&w.pageId===page.id));
  const broken=same(site);delete broken.pages[0].sections[0].designGraph.nodes[1].responsive;
  assert.equal(sdk.inspectSite(broken,manifests).deviceCoverage.find(v=>
    v.pageId===page.id&&v.device==='mobile').h1,0);
  assert.ok(sdk.inspectSite(broken,manifests).warnings.some(w=>
    w.kind==='device-missing-h1'&&w.pageId===page.id&&w.device==='mobile'));
});
test('responsive editorial grids and semantic composition safety',()=>{
  const G=require('../sdk/design-graph.cjs'),site=same(initial);
  const section=sdk.sectionFrom(manifests.find(m=>m.id==='custom-section'),'section-editorial');
  section.designGraph={version:1,id:'graph-editorial',nodes:[{
    id:'editorial-card',type:'container',semanticTag:'article',ariaLabel:'Case & <study>',
    styles:{display:'grid',gridTracks:[2,3,1],gridAutoRowsPx:96,gap:20},
    responsive:{tablet:{gridTracks:[1,2]},mobile:{columns:1}},
    children:[{id:'editorial-heading',type:'heading',level:2,text:'Our process',styles:{gridColumnStart:1,gridColumnSpan:2,gridRowStart:1,gridRowSpan:2}},
      {id:'editorial-copy',type:'text',text:'Detail',styles:{gridColumnStart:3}}]
  }]};site.pages[0].sections=[section];sdk.validateSite(site,manifests);
  const html=G.render(site,section.designGraph);
  assert.match(html,/<article class="cmsdg-n-editorial-card" aria-label="Case &amp; &lt;study&gt;">/);
  assert.match(html,/grid-template-columns:minmax\(0,2fr\) minmax\(0,3fr\) minmax\(0,1fr\)/);
  assert.match(html,/grid-auto-rows:minmax\(96px,auto\)/);
  assert.match(html,/minmax\(0,1fr\) minmax\(0,2fr\)/);
  assert.match(html,/grid-column:1 \/ span 2/);assert.match(html,/grid-row:1 \/ span 2/);
  for(const fn of [n=>{n.styles.gridTracks=[1,'2'];},n=>{n.styles.gridTracks=[1];},n=>{n.styles.columns=3;},n=>{n.semanticTag='script';},n=>{n.ariaLabel='\u0000';},n=>{n.styles.gridAutoRowsPx=9999;}]){
    const invalid=same(site);fn(invalid.pages[0].sections[0].designGraph.nodes[0]);
    refuses(()=>sdk.validateSite(invalid,manifests),'invalid editorial properties');
  }
});
test('semantic formatted inline heading fragments are safe and copyable',()=>{
  const G=require('../sdk/design-graph.cjs'),site=same(initial);
  const section=sdk.sectionFrom(manifests.find(m=>m.id==='custom-section'),'section-rich-words');
  section.designGraph={version:1,id:'graph-rich-words',nodes:[
    {id:'node-rich-heading',type:'heading',level:1,
      text:'Сайты нового уровня <без скриптов>',
      runs:[{text:'Сайты '},{text:'нового уровня ',strong:true,color:'@accent'},
        {text:'<без скриптов>',italic:true,href:'/contact/'}],
      styles:{fontSize:48}}
  ]};
  site.pages[0].sections=[section];
  sdk.validateSite(site,manifests);
  const html=G.render(site,section.designGraph);
  assert.match(html,/<strong>нового уровня <\/strong>/);
  assert.match(html,/style="color:#0a5bff"/);
  assert.match(html,/<em>&lt;без скриптов&gt;<\/em>/);
  assert.doesNotMatch(html,/<без скриптов>/);
  assert.match(html,/href="\/contact\/"/);
  const X=require('../sdk/draft.cjs'),session=X.begin(site,manifests);
  const edited=X.structure(session,manifests,{action:'updatePage',pageId:site.pages[1].id,
    path:'/new-contacts/',title:site.pages[1].title,expectedRevision:session.revision});
  const linked=edited.current.pages[0].sections[0].designGraph.nodes[0].runs[2];
  assert.equal(linked.href,'/new-contacts/','Inline links follow real page rename');
  const broken=same(site);broken.pages[0].sections[0].designGraph.nodes[0].runs[2].href='/missing/';
  assert.ok(sdk.inspectSite(broken,manifests).errors.some(v=>v.kind==='broken-link'));
  const dangerous=same(site);dangerous.pages[0].sections[0].designGraph.nodes[0].runs[2].href='javascript:alert(1)';
  refuses(()=>sdk.validateSite(dangerous,manifests),'script URL in rich fragment refused');

  const mismatch=same(site);mismatch.pages[0].sections[0].designGraph.nodes[0].runs[1].text='чужой';
  refuses(()=>sdk.validateSite(mismatch,manifests),'formatted and plain text cannot diverge');
  const unsafe=same(site);unsafe.pages[0].sections[0].designGraph.nodes[0].runs[1].color='url(javascript:1)';
  refuses(()=>sdk.validateSite(unsafe,manifests),'unsafe CSS rejected');
  const foreign=same(site);foreign.pages[0].sections[0].designGraph.nodes[0].runs[1].onClick='alert(1)';
  refuses(()=>sdk.validateSite(foreign,manifests),'arbitrary fragment links forbidden');
});

test('site-owned hero viewport geometry and radial gradients',()=>{
  const graph=require('../sdk/design-graph.cjs'),site=same(initial);
  const section=sdk.sectionFrom(reg.get('custom-section'),'section-responsive-hero');
  const n=section.designGraph.nodes[0];
  n.styles={display:'grid',padding:40,paddingTop:12,paddingLeft:'@small',
    minHeightViewport:90,gradient:{type:'radial',angle:0,from:'@accent',
      to:'#ffffff',centerX:25,centerY:70,radius:'closest-side'}};
  n.responsive={mobile:{minHeightViewport:75,paddingRight:8}};
  site.pages[0].sections.push(section);
  sdk.validateSite(site,manifests);
  const html=graph.render(site,section.designGraph);
  assert.ok(html.includes('min-height:90vh;min-height:90svh'));
  assert.ok(html.includes('padding-top:12px'));
  assert.ok(html.includes('radial-gradient(circle closest-side at 25% 70%'));
  const bad=same(site);
  bad.pages[0].sections.at(-1).designGraph.nodes[0].styles.minHeightViewport=121;
  refuses(()=>sdk.validateSite(bad,manifests));
  bad.pages[0].sections.at(-1).designGraph.nodes[0].styles.minHeightViewport=90;
  bad.pages[0].sections.at(-1).designGraph.nodes[0].styles.minHeight=10;
  refuses(()=>sdk.validateSite(bad,manifests));
});

test('author sections can use viewport edge width while keeping bounded enums',()=>{
  const source=same(initial),section=source.pages[0].sections[0];
  section.appearance={surface:'default',spacing:'normal',align:'left',width:'edge'};
  sdk.validateSite(source,manifests);
  const unsafe=same(source);unsafe.pages[0].sections[0].appearance.width='calc(100vw + 999px)';
  refuses(()=>sdk.validateSite(unsafe,manifests),'free CSS is never accepted as section width');
});

test('site-wide branding only binds same-site raster logos and PNG favicon',()=>{
  const base=same(initial);
  base.assets=[
    {id:'asset-brand-png',src:'/assets/asset-brand-png.png',mime:'image/png',alt:'Customer logo'},
    {id:'asset-brand-mobile',src:'/assets/asset-brand-mobile.webp',mime:'image/webp',alt:'Mobile customer logo'},
    {id:'asset-brand-jpeg',src:'/assets/asset-brand-jpeg.jpg',mime:'image/jpeg',alt:'Other graphic'}
  ];
  base.branding={logoAssetId:'asset-brand-png',mobileLogoAssetId:'asset-brand-mobile',
    faviconAssetId:'asset-brand-png',logoWidth:176};
  sdk.validateSite(base,manifests);
  const foreign=same(base);foreign.branding.logoAssetId='asset-other-site';
  refuses(()=>sdk.validateSite(foreign,manifests),'Cannot bind logos from another site');
  const jpegIcon=same(base);jpegIcon.branding.faviconAssetId='asset-brand-jpeg';
  refuses(()=>sdk.validateSite(jpegIcon,manifests),'Favicon must be PNG');
  const mobileOnly=same(base);delete mobileOnly.branding.logoAssetId;
  refuses(()=>sdk.validateSite(mobileOnly,manifests),'Mobile needs a desktop logo');
  const tiny=same(base);tiny.branding.logoWidth=20;
  refuses(()=>sdk.validateSite(tiny,manifests),'Brand logo width must be bounded');
  const noBrand=same(initial);
  sdk.validateSite(noBrand,manifests); // Existing custom sites remain backward-compatible.
});

test('global footer is typed, site-scoped, safe and survives page renames',()=>{
  const site=same(initial);
  assert.ok(site.pages.length>=2);
  const target=site.pages.find(page=>page.path!=='/');
  site.footer={description:'Полный сервис и поддержка клиентов',
    email:'hello@example.com',phone:'+48 (500) 600-700',
    links:[{label:'Юридическая информация',pageId:target.id}],
    socials:[{network:'instagram',url:'https://www.instagram.com/manufact/'}]};
  site.footer.style='dark';site.footer.layout='stacked';
  sdk.validateSite(site,manifests);
  const badStyle=same(site);badStyle.footer.style='script';
  refuses(()=>sdk.validateSite(badStyle,manifests),'Only fixed footer color presets');
  const badLayout=same(site);badLayout.footer.layout='nonsense';
  refuses(()=>sdk.validateSite(badLayout,manifests),'Only fixed footer layout presets');
  const X=require('../sdk/draft.cjs');
  const draft=X.begin(site,manifests);
  const renamed=X.structure(draft,manifests,{
    action:'updatePage',pageId:target.id,title:target.title,path:'/updated-contact/',
    expectedRevision:draft.revision
  });
  assert.equal(renamed.current.footer.links[0].pageId,target.id);
  sdk.validateSite(renamed.current,manifests);
  const removed=X.structure(renamed,manifests,{
    action:'removePage',pageId:target.id,expectedRevision:renamed.revision
  });
  assert.equal(removed.current.footer.links.length,0);
  const unsafe=same(site);
  unsafe.footer.socials[0].url='https://instagram.com.evil.test/user';
  refuses(()=>sdk.validateSite(unsafe,manifests),'Subdomain phishing is not a social link');
  const script=same(site);
  script.footer.socials[0].url='javascript:alert(1)';
  refuses(()=>sdk.validateSite(script,manifests),'Executable URLs are invalid');
  const other=same(site);
  other.footer.links[0].pageId='page-foreign';
  refuses(()=>sdk.validateSite(other,manifests),'Footer page must exist');
  const duplicated=same(site);
  duplicated.footer.links.push({...duplicated.footer.links[0]});
  refuses(()=>sdk.validateSite(duplicated,manifests),'Duplicate pages not allowed');
  const wrongPhone=same(site);
  wrongPhone.footer.phone='0810<script>';
  refuses(()=>sdk.validateSite(wrongPhone,manifests),'No HTML in telephone');
  delete site.footer;
  sdk.validateSite(site,manifests); // Backwards compatibility with old individual sites.
});

test('externally authored section is graph-only and fail-closed on browser contract',()=>{
  const site=same(initial),section=sdk.sectionFrom(
    manifests.find(m=>m.id==='custom-section'),'section-unique-layout');
  site.pages[0].sections.push(section);
  assert.equal(section.designGraph.version,1,'New Studio custom section starts with a valid editable graph');
  delete section.designGraph;
  refuses(()=>sdk.validateSite(site,manifests),'No empty external custom sections');
  section.designGraph={version:1,id:'graph-unique-layout',nodes:[{
    id:'unique-layout-root',type:'container',styles:{display:'grid',columns:2,gap:20},
    responsive:{mobile:{columns:1,gap:12}},children:[
      {id:'unique-layout-copy',type:'text',text:'Designed by external AI',styles:{fontSize:18}},
      {id:'unique-layout-link',type:'button',text:'More',href:'/contact/',
        styles:{background:'#205099',radius:12},
        states:{hover:{opacity:80}}}
    ]
  }]};
  assert.equal(sdk.validateSite(site,manifests).pages[0].sections.at(-1).component,'custom-section');
  const graph=require('../sdk/design-graph.cjs');
  const html=graph.render(site,section.designGraph);
  assert.match(html,/Designed by external AI/);
  assert.match(html,/@media\(max-width:600px\)/);
  const bad=same(site);bad.pages[0].sections.at(-1).designGraph.nodes[0]
    .children[1].href='javascript:alert(1)';
  refuses(()=>sdk.validateSite(bad,manifests),'No executable links from external design');
});

test('Interactive custom graph with nested disclosure and tab panels rejects unsafe hierarchy',()=>{
  const G=require('../sdk/design-graph.cjs');
  const site=same(initial);
  const section=sdk.sectionFrom(manifests.find(m=>m.id==='custom-section'),'section-interactive');
  const node=(id,type,text,children)=>({id,type,...(text===null?{}:{text}),styles:{},...(children?{children}:{})});
  const faq=node('custom-faq','disclosure','Вопрос?',[
    node('custom-faq-answer','text','Подробный ответ')]);
  const tabs=node('custom-tabs','tabs',null,[
    node('custom-tab-one','tab','Описание',[node('custom-tab-one-text','text','Описание услуги')]),
    node('custom-tab-two','tab','Контакты',[node('custom-tab-two-text','text','Связаться')])
  ]);
  section.designGraph={version:1,id:'custom-design-graph',nodes:[faq,tabs]};
  site.pages[0].sections.push(section);
  sdk.validateSite(site,manifests);
  const html=G.render(site,section.designGraph);
  assert.match(html,/<details .*cmsdg-disclosure/);
  assert.match(html,/<summary>Вопрос\?<\/summary>/);
  assert.match(html,/type="radio"/);
  assert.match(html,/cmsdg-tab-custom-tab-two/);
  assert.match(html,/cmsdg-tab-panel\{display:none\}/);
  const checklist=node('custom-list','list',null,[
    node('custom-list-one','list-item','Подготовка'),
    node('custom-list-two','list-item','Согласование')
  ]);
  checklist.ordered=true;
  const withList=same(site);
  withList.pages[0].sections.at(-1).designGraph.nodes.push(checklist);
  sdk.validateSite(withList,manifests);
  assert.match(G.render(withList,withList.pages[0].sections.at(-1).designGraph),/<ol class="cmsdg-n-custom-list cmsdg-list">/);
  const invalidList=same(withList);
  invalidList.pages[0].sections.at(-1).designGraph.nodes[2].children[1].type='button';
  refuses(()=>sdk.validateSite(invalidList,manifests),'List accepts only list items');
  const inserted=G.editTree(withList.pages[0].sections.at(-1).designGraph,{
    action:'insert',targetId:'custom-list',placement:'inside',
    node:node('custom-list-three','list-item','Публикация')
  });
  G.validateGraph(inserted,new Set(),new Set());
  assert.equal(inserted.nodes[2].children.length,3);
  const clonedList=G.editTree(inserted,{action:'duplicate',nodeId:'custom-list',
    ids:['custom-list-clone','custom-list-clone-a','custom-list-clone-b','custom-list-clone-c']});
  G.validateGraph(clonedList,new Set(),new Set());
  assert.equal(clonedList.nodes[3].children[0].id,'custom-list-clone-a');
  const wrong=same(site);
  wrong.pages[0].sections.at(-1).designGraph.nodes[1].children[0].type='text';
  refuses(()=>sdk.validateSite(wrong,manifests),'Tabs accept only tab children');
  const escaped=same(site);
  escaped.pages[0].sections.at(-1).designGraph.nodes[0].text='<img src=x onerror=alert(1)>';
  assert.match(G.render(escaped,escaped.pages[0].sections.at(-1).designGraph),/&lt;img src=x/);
  const detached=same(site);
  detached.pages[0].sections.at(-1).designGraph.nodes.push(
    node('standalone-tab','tab','Invalid',[node('inner-text','text','x')]));
  refuses(()=>sdk.validateSite(detached,manifests),'Detached tab rejected');
  const added=G.editTree(section.designGraph,{
    action:'insert',targetId:'custom-tabs',placement:'inside',
    node:node('custom-tab-three','tab','Цена',[node('custom-tab-three-text','text','По запросу')])
  });
  G.validateGraph(added,new Set(),new Set());
  assert.equal(added.nodes[1].children.length,3);
  const duplicated=G.editTree(added,{action:'duplicate',nodeId:'custom-tab-three',
    ids:['custom-tab-copy','custom-tab-copy-body']});
  G.validateGraph(duplicated,new Set(),new Set());
  assert.equal(duplicated.nodes[1].children.length,4);
  refuses(()=>G.editTree(duplicated,{
    action:'move',nodeId:'custom-tab-copy',targetId:'custom-faq',placement:'after'
  }),'Tab cannot leave its parent');
});

test('Rich individual Design Graph layout: rectangular tables, gallery assets, links and attributed quotes',()=>{
  const G=require('../sdk/design-graph.cjs'),base=same(initial);
  const asset=base.assets.find(x=>x.mime?.startsWith('image/'));
  const n=(id,type,text,children)=>({id,type,styles:{},...(text===null?{}:{text}),...(children?{children}:{})});
  const cell=(id,text)=>n(id,'table-cell',text);
  const row=(id,values)=>n(id,'table-row',null,values.map((v,i)=>cell(id+'-cell-'+i,v)));
  const table=n('rich-table','table','Параметры',[
    row('rich-head',['Параметр','Базовый','Полный']),
    row('rich-one',['Срок','1 день','2 дня']),
    row('rich-two',['Поддержка','Есть','Дополнительно'])]);
  const quote=n('rich-quote','quote','Условия определяются договором');quote.cite='<Название организации>';
  const link=n('rich-link','link','Вернуться к началу');link.href='/';
  const nodes=[table,quote,link];
  if(asset){
    nodes.push(n('rich-gallery','gallery','Образцы',[
      {...n('rich-photo-one','image',null),assetId:asset.id,alt:'Первое изображение'},
      {...n('rich-photo-two','image',null),assetId:asset.id,alt:'Второе изображение'}
    ]));
  }
  const section=sdk.sectionFrom(manifests.find(m=>m.id==='custom-section'),'section-rich');
  section.designGraph={id:'graph-rich',version:1,nodes};
  base.pages[0].sections.push(section);
  sdk.validateSite(base,manifests);
  const html=G.render(base,section.designGraph);
  assert.match(html,/<table class="cmsdg-n-rich-table cmsdg-table">/);
  assert.match(html,/<caption>Параметры<\/caption>/);
  assert.match(html,/<thead><tr/);
  assert.match(html,/<th scope="col"/);
  assert.match(html,/<td class="cmsdg-n-rich-one-cell-1">1 день<\/td>/);
  const cards=same(base),responsive=cards.pages[0].sections.at(-1).designGraph.nodes[0];
  responsive.tableLayoutTablet='cards';responsive.tableLayoutMobile='scroll';
  responsive.children[0].children[1].text='Базовый & <план>';
  sdk.validateSite(cards,manifests);
  const cardHtml=G.render(cards,cards.pages[0].sections.at(-1).designGraph);
  assert.match(cardHtml,/cmsdg-table-scroll cmsdg-tablet-cards/);
  assert.doesNotMatch(cardHtml,/cmsdg-table-scroll cmsdg-tablet-cards cmsdg-mobile-cards/);
  assert.match(cardHtml,/<td data-label="Базовый &amp; &lt;план&gt;" class="cmsdg-n-rich-one-cell-1">1 день<\/td>/);
  assert.match(cardHtml,/@media\(min-width:601px\) and \(max-width:900px\)/);
  assert.match(cardHtml,/content:attr\(data-label\)/);
  responsive.rowHeaders=true;
  responsive.tableAppearance={borderColor:'@accent',headerBackground:'#e0e0e0',
    cellPadding:16,labelWidth:35};
  responsive.tableAppearanceTablet={cardRadius:22,cardGap:18,cardBackground:'#fafafa'};
  responsive.tableAppearanceMobile={labelWidth:55,labelColor:'@foreground'};
  sdk.validateSite(cards,manifests);
  const authoredTable=G.render(cards,cards.pages[0].sections.at(-1).designGraph);
  assert.match(authoredTable,
    /<th scope="row" data-label="Параметр" class="cmsdg-n-rich-one-cell-0">Срок<\/th>/,
    'Optional row-heading semantics survive responsive card transformation');
  for(const declaration of ['--cmsdg-table-border:#0a5bff','--cmsdg-table-header-bg:#e0e0e0',
    '--cmsdg-table-cell-padding:16px','--cmsdg-table-card-radius:22px',
    '--cmsdg-table-card-gap:18px','--cmsdg-table-label-width:55%',
    '--cmsdg-table-label-color:#182b3d'])assert.ok(authoredTable.includes(declaration),declaration);
  assert.match(authoredTable,/@media\(max-width:900px\)\{\.cmsdg-graph-rich \.cmsdg-table-owner-rich-table\{/);
  assert.match(authoredTable,/@media\(max-width:600px\)\{\.cmsdg-graph-rich \.cmsdg-table-owner-rich-table\{/);
  delete responsive.tableLayoutMobile;
  assert.match(G.render(cards,cards.pages[0].sections.at(-1).designGraph),/cmsdg-table-scroll cmsdg-tablet-cards cmsdg-mobile-cards/,
    'Phone inherits tablet card layout if not overridden');
  responsive.tableLayoutMobile='invalid';refuses(()=>sdk.validateSite(cards,manifests));
  responsive.tableLayoutMobile='scroll';
  responsive.rowHeaders='true';refuses(()=>sdk.validateSite(cards,manifests),
    'Row-header setting must be boolean');
  responsive.rowHeaders=true;
  responsive.tableAppearanceTablet.cardRadius=33;
  refuses(()=>sdk.validateSite(cards,manifests),'Table card radius limit');
  responsive.tableAppearanceTablet.cardRadius=22;
  responsive.tableAppearanceMobile.labelColor='red';
  refuses(()=>sdk.validateSite(cards,manifests),'Reject arbitrary CSS colors');
  responsive.tableAppearanceMobile.labelColor='@foreground';
  responsive.tableAppearance.unknownKey=12;
  refuses(()=>sdk.validateSite(cards,manifests),'Reject untyped table CSS');
  delete responsive.tableAppearance.unknownKey;
  cards.pages[0].sections.at(-1).designGraph.nodes[1].tableLayoutMobile='cards';
  refuses(()=>sdk.validateSite(cards,manifests),'Table-only layout must not leak into another graph node');
  delete cards.pages[0].sections.at(-1).designGraph.nodes[1].tableLayoutMobile;
  cards.pages[0].sections.at(-1).designGraph.nodes[1].rowHeaders=true;
  refuses(()=>sdk.validateSite(cards,manifests),'Row-heading setting restricted to table nodes');
  delete cards.pages[0].sections.at(-1).designGraph.nodes[1].rowHeaders;
  cards.pages[0].sections.at(-1).designGraph.nodes[1].tableAppearance={cardGap:10};
  refuses(()=>sdk.validateSite(cards,manifests),'Table appearance restricted to table nodes');
  assert.match(html,/&lt;Название организации&gt;/);
  assert.match(html,/<a class="cmsdg-n-rich-link" href="\/">/);
  if(asset)assert.match(html,/cmsdg-gallery/);
  const ragged=same(base),t=ragged.pages[0].sections.at(-1).designGraph.nodes[0];
  t.children[2].children.pop();
  refuses(()=>sdk.validateSite(ragged,manifests),'Reject non-rectangular tables');
  const malformed=same(base);
  malformed.pages[0].sections.at(-1).designGraph.nodes[0].children[0].children[0].type='text';
  refuses(()=>sdk.validateSite(malformed,manifests),'Reject table cell of wrong type');
  const contacts=same(base);
  contacts.pages[0].sections.at(-1).designGraph.nodes[2].href='mailto:support@example.org';
  sdk.validateSite(contacts,manifests);
  assert.match(G.render(contacts,contacts.pages[0].sections.at(-1).designGraph),
    /href="mailto:support@example.org"/);
  contacts.pages[0].sections.at(-1).designGraph.nodes[2].href='tel:+48123456789';
  sdk.validateSite(contacts,manifests);
  assert.match(G.render(contacts,contacts.pages[0].sections.at(-1).designGraph),
    /href="tel:\+48123456789"/);
  const corrupt=same(base);
  corrupt.pages[0].sections.at(-1).designGraph.nodes[2].href='javascript:alert(1)';
  refuses(()=>sdk.validateSite(corrupt,manifests),'Reject link script URL');
  const injection=same(base);
  injection.pages[0].sections.at(-1).designGraph.nodes[2].href='mailto:a@example.com?body=%0aBcc:evil@example.com';
  refuses(()=>sdk.validateSite(injection,manifests),'Reject mailto header injection');
  const added=G.editTree(section.designGraph,{
    action:'insert',targetId:'rich-table',placement:'inside',
    node:row('rich-three',['Регион','Север','Юг'])
  });
  G.validateGraph(added,new Set(base.assets.map(x=>x.id)),new Set(),
    base.designTokens,new Map(base.assets.map(x=>[x.id,x.mime])));
  assert.equal(added.nodes[0].children.length,4);
  const copied=G.editTree(added,{action:'duplicate',nodeId:'rich-three',
    ids:['rich-three-copy','rich-three-a','rich-three-b','rich-three-c']});
  G.validateGraph(copied,new Set(base.assets.map(x=>x.id)),new Set(),
    base.designTokens,new Map(base.assets.map(x=>[x.id,x.mime])));
  assert.equal(copied.nodes[0].children.length,5);
  refuses(()=>G.editTree(copied,{action:'move',nodeId:'rich-three-copy',
    targetId:'rich-quote',placement:'after'}),'Reject detached table rows');
});

test('existing authored table accepts bounded spreadsheet paste without losing IDs or cell styles',()=>{
  const G=require('../sdk/design-graph.cjs');
  const cell=(id,text)=>({id,type:'table-cell',text,styles:{}});
  const g={version:1,id:'spreadsheet-graph',nodes:[{id:'sheet-table',type:'table',
    rowHeaders:true,tableLayoutMobile:'cards',text:'Параметры',children:[
      {id:'sheet-header',type:'table-row',styles:{},children:[cell('sheet-h-a','Услуга'),cell('sheet-h-b','Цена')]},
      {id:'sheet-first-row',type:'table-row',styles:{},children:[
        cell('sheet-v-a','Вёрстка'),{...cell('sheet-v-b','200'),styles:{color:'@accent'}}]}
    ]}]};
  const source='\uFEFFУслуга\tЦена\tПримечание\n"Дизайн, UX"\t"200"\t"Клиент сказал ""ок"""\nРазработка\t350\tВ срок\n';
  const matrix=G.parseTableMatrix(source);
  assert.deepEqual(matrix,[['Услуга','Цена','Примечание'],['Дизайн, UX','200','Клиент сказал "ок"'],
    ['Разработка','350','В срок']]);
  let index=0;
  const next=G.replaceTableMatrix(g,'sheet-table',matrix,()=>`sheet-generated-${++index}`);
  assert.deepEqual(G.tableMatrix(next,'sheet-table'),matrix);
  assert.equal(next.nodes[0].children[1].children[1].id,'sheet-v-b');
  assert.deepEqual(next.nodes[0].children[1].children[1].styles,{color:'@accent'});
  assert.equal(next.nodes[0].children[0].id,'sheet-header');
  assert.equal(next.nodes[0].children[2].children.length,3);
  const movedColumn=G.reorderTableColumn(next,'sheet-table',1,2);
  assert.deepEqual(G.tableMatrix(movedColumn,'sheet-table')[0],['Услуга','Примечание','Цена']);
  assert.equal(movedColumn.nodes[0].children[1].children[2].id,'sheet-v-b',
    'Column reordering moves all matching cells, not just one value');
  assert.equal(movedColumn.nodes[0].children[1].children[2].styles.color,'@accent');
  assert.equal(next.nodes[0].children[1].children[1].id,'sheet-v-b');
  refuses(()=>G.reorderTableColumn(next,'sheet-table',0,1),
    'Explicit semantic row headings lock the first column');
  const movedRow=G.reorderTableRow(next,'sheet-table',2,1);
  assert.equal(movedRow.nodes[0].children[0].id,'sheet-header');
  assert.equal(movedRow.nodes[0].children[1].children[0].text,'Разработка');
  assert.equal(next.nodes[0].children[1].children[0].text,'Дизайн, UX');
  refuses(()=>G.reorderTableRow(next,'sheet-table',0,1),'Cannot move table header into data rows');
  assert.equal(G.reorderTableRow(next,'sheet-table',1,1),next);
  const shortened=G.replaceTableMatrix(next,'sheet-table',[['Услуга','Цена'],['Сайт','999']]);
  assert.equal(shortened.nodes[0].children.length,2);
  assert.equal(shortened.nodes[0].children[1].children[1].id,'sheet-v-b');
  assert.equal(shortened.nodes[0].children[1].children[1].styles.color,'@accent');
  assert.equal(next.nodes[0].children.length,3,'Shrinking a pasted table must not mutate its source');
  assert.equal(g.nodes[0].children.length,2,'Original Graph remains untouched');
  assert.equal(G.replaceTableMatrix(next,'sheet-table',matrix,()=>{throw Error('no new ID expected');}),next,
    'Pasting an unchanged spreadsheet must not create another Undo entry');
  const quotedGraph=structuredClone(g);
  quotedGraph.nodes[0].children[0].children[1].text='  Цена  ';
  quotedGraph.nodes[0].children[1].children[0].text='"Сайт, большой"';
  quotedGraph.nodes[0].children[1].children[1].text='=HYPERLINK("https://example.test")';
  const editableTsv=G.tableTsv(quotedGraph,'sheet-table',false);
  assert.deepEqual(G.parseTableMatrix(editableTsv,'tab'),G.tableMatrix(quotedGraph,'sheet-table'),
    'Unmodified TSV export is reversible including literal quotes and surrounding whitespace');
  const safeTsv=G.tableTsv(quotedGraph,'sheet-table');
  assert.equal(G.parseTableMatrix(safeTsv,'tab')[1][1],
    "'=HYPERLINK(\"https://example.test\")",
    'Clipboard/download TSV neutralizes spreadsheet formulas without changing the Graph');
  assert.equal(quotedGraph.nodes[0].children[1].children[1].text,'=HYPERLINK("https://example.test")');
  G.validateGraph(next,new Set(),new Set());
  const html=G.render({designTokens:G.DEFAULT_TOKENS,assets:[],language:'ru'},next);
  assert.match(html,/<th scope="row" data-label="Услуга" class="cmsdg-n-sheet-v-a">Дизайн, UX<\/th>/);
  assert.match(html,/Клиент сказал &quot;ок&quot;/);
  assert.deepEqual(G.parseTableMatrix('Название;Цена\n"Сайт; большой";"1,200"','semicolon'),
    [['Название','Цена'],['Сайт; большой','1,200']]);
  assert.deepEqual(G.parseTableMatrix('"Услуга, категория";Цена\n"Сайт, большой";120'),
    [['Услуга, категория','Цена'],['Сайт, большой','120']],
    'Auto-detection ignores delimiters that are part of a quoted heading');
  assert.deepEqual(G.parseTableMatrix('Название,Цена\n"  точное имя  ","  100  "'),
    [['Название','Цена'],['  точное имя  ','  100  ']],
    'Quoted CSV preserves intentionally authored leading/trailing whitespace');
  assert.deepEqual(G.parseTableMatrix('Параметр\tЗначение\nЭкран\t17"'),
    [['Параметр','Значение'],['Экран','17"']]);
  for(const bad of [
    'Одна колонка\nОдна колонка','А\tБ\n1','A\tB\n1\t2\t3',
    'A,B\n"Строка\nвнутри",2','A,B\n"без закрытия,2',
    Array.from({length:11},()=> 'A\tB').join('\n'),
    'A\tB\n<script>\tстрока\u0000'])
    refuses(()=>G.parseTableMatrix(bad),'Malformed table paste rejected');
  refuses(()=>G.replaceTableMatrix(g,'sheet-table',matrix,()=> 'sheet-v-a'),
    'Duplicate generated node ID must fail atomically');
});

test('existing authored content list accepts paste of bounded lines while preserving ordered flag and IDs',()=>{
  const G=require('../sdk/design-graph.cjs');
  const g={version:1,id:'pasted-list-graph',nodes:[{id:'list-steps',type:'list',ordered:true,children:[
    {id:'step-one',type:'list-item',text:'Исследование',styles:{color:'@accent'}},
    {id:'step-two',type:'list-item',text:'Проектирование',styles:{}}
  ]}]};
  const lines=G.parseListLines('\uFEFFИсследование\r\nДизайн\r\nВёрстка\r\n');
  assert.deepEqual(lines,['Исследование','Дизайн','Вёрстка']);
  const result=G.replaceListLines(g,'list-steps',lines,()=> 'step-three');
  assert.deepEqual(G.listLines(result,'list-steps'),lines);
  assert.equal(result.nodes[0].ordered,true);
  assert.equal(result.nodes[0].children[0].id,'step-one');
  assert.equal(result.nodes[0].children[1].id,'step-two');
  assert.equal(result.nodes[0].children[2].id,'step-three');
  assert.deepEqual(result.nodes[0].children[0].styles,{color:'@accent'});
  assert.equal(g.nodes[0].children.length,2);
  const shorter=G.replaceListLines(result,'list-steps',['Дизайн']);
  assert.equal(shorter.nodes[0].children.length,1);
  assert.equal(shorter.nodes[0].children[0].id,'step-one');
  assert.equal(result.nodes[0].children.length,3,'List reduction is also immutable');
  G.validateGraph(result,new Set(),new Set());
  assert.equal(G.replaceListLines(result,'list-steps',lines),result);
  for(const bad of ['', 'A\n\nB','A\u0000B',Array.from({length:25},()=> 'A').join('\n')])
    refuses(()=>G.parseListLines(bad),'Invalid list paste rejected');
  refuses(()=>G.replaceListLines(g,'list-steps',lines,()=> 'step-one'),'ID collision rejected');
});

test('Individual artwork: responsive backgrounds, safe media actions and stateful styling',()=>{
  const G=require('../sdk/design-graph.cjs');
  const picture=id=>({id,src:'/assets/'+id+'.png',mime:'image/png',
    alt:'Site-owned illustration',sha256:'a'.repeat(64),width:800,height:600});
  const one=picture('artwork-desktop'),two=picture('artwork-mobile');
  const site={assets:[one,two],designTokens:G.DEFAULT_TOKENS};
  const graph={version:1,id:'artwork-graph',nodes:[{
    id:'artwork-hero',type:'container',
    styles:{minHeight:160,borderWidth:2,borderStyle:'dashed',filterPreset:'contrast'},
    backgroundMedia:{assetId:one.id,mobileAssetId:two.id,size:'cover',
      positionX:25,positionY:70,overlay:{color:'@foreground',opacity:40}},
    children:[{id:'artwork-picture',type:'image',assetId:one.id,
      alt:'Custom image with link',href:'tel:+48123456789',
      responsiveMedia:{tabletAssetId:two.id,mobileAssetId:two.id},
      styles:{filterPreset:'grayscale'},states:{active:{borderStyle:'dotted',opacity:75}}},
      {id:'artwork-cta',type:'button',text:'Contact us',href:'mailto:info@example.org',
        states:{active:{background:'@accent',opacity:85}}}]
  }]};
  const assets=new Set(site.assets.map(a=>a.id)),kinds=new Map(site.assets.map(a=>[a.id,a.mime]));
  G.validateGraph(graph,assets,new Set(),site.designTokens,kinds);
  const html=G.render(site,graph,'/published/example-site/');
  assert.match(html,/artwork-hero\{background-image:linear-gradient\(#182b3d66,#182b3d66\),url\("\/published\/example-site\/assets\/artwork-desktop.png"\)/);
  assert.match(html,/@media\(max-width:600px\).*artwork-mobile.png/);
  assert.match(html,/border-style:dashed/);
  assert.match(html,/filter:grayscale\(1\)/);
  assert.match(html,/:active\{background-color:#0a5bff;opacity:0.85\}/);
  assert.match(html,/class="cmsdg-image-action" href="tel:\+48123456789"/);
  assert.match(html,/<picture class="cmsdg-picture"><source media="\(max-width:600px\)" srcset="\/published\/example-site\/assets\/artwork-mobile.png">/);
  assert.match(html,/<source media="\(max-width:900px\)" srcset="\/published\/example-site\/assets\/artwork-mobile.png">/);
  assert.match(html,/<img loading="lazy" class="cmsdg-n-artwork-picture"[^>]+alt="Custom image with link">/);
  const deviceForeign=JSON.parse(JSON.stringify(graph));
  deviceForeign.nodes[0].children[0].responsiveMedia.mobileAssetId='asset-not-owned';
  refuses(()=>G.validateGraph(deviceForeign,assets,new Set(),site.designTokens,kinds),'Reject unknown phone photo');
  const deviceEmpty=JSON.parse(JSON.stringify(graph));
  deviceEmpty.nodes[0].children[0].responsiveMedia={};
  refuses(()=>G.validateGraph(deviceEmpty,assets,new Set(),site.designTokens,kinds),'Reject empty device media');
  const illegalHost=JSON.parse(JSON.stringify(graph));
  illegalHost.nodes[0].responsiveMedia={tabletAssetId:two.id};
  refuses(()=>G.validateGraph(illegalHost,assets,new Set(),site.designTokens,kinds),'No alternate image on non-image node');
  const detached=JSON.parse(JSON.stringify(graph));
  detached.nodes[0].backgroundMedia.assetId='missing-file';
  refuses(()=>G.validateGraph(detached,assets,new Set(),site.designTokens,kinds),'No external background files');
  const invalidMedia=JSON.parse(JSON.stringify(graph));
  invalidMedia.nodes[0].children[0].href='javascript:alert(1)';
  refuses(()=>G.validateGraph(invalidMedia,assets,new Set(),site.designTokens,kinds),'No script media action');
  const brokenOverlay=JSON.parse(JSON.stringify(graph));
  brokenOverlay.nodes[0].backgroundMedia.overlay.opacity=101;
  refuses(()=>G.validateGraph(brokenOverlay,assets,new Set(),site.designTokens,kinds),'Opaque overlay prohibited');
  const invalidGradient=JSON.parse(JSON.stringify(graph));
  invalidGradient.nodes[0].styles.gradient={angle:0,from:'@accent',to:'@background'};
  refuses(()=>G.validateGraph(invalidGradient,assets,new Set(),site.designTokens,kinds),'No competing backgrounds');
});

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
  site.language='pl';
  site.assets.push({id:'social-preview',src:'/assets/social-preview.webp',alt:'Social preview image',mime:'image/webp'});
  site.theme={background:'#101b2a',surface:'#f8f9fa',text:'#ffffff',primary:'#ff6600',font:'georgia',maxWidth:980,
    bodySize:18,lineHeight:'relaxed',headingScale:'large',buttonStyle:'outline',buttonRadius:12,buttonText:'#fdfdfd'};
  site.pages[0].seo={title:'Каталог',description:'Подтверждённое описание',robots:'noindex',
    ogTitle:'Заголовок публикации',ogDescription:'Описание публикации',ogImage:'social-preview'};
  site.pages[0].navigation={label:'Каталог',hidden:false};
  assert.equal(sdk.validateSite(site,reg).theme.primary,'#ff6600');
  assert.equal(sdk.validateSite(site,reg).theme.bodySize,18);
  assert.equal(sdk.validateSite(site,reg).theme.buttonStyle,'outline');
  assert.equal(sdk.validateSite(site,reg).theme.buttonRadius,12);
  assert.equal(sdk.validateSite(site,reg).language,'pl');
  const legacyTheme=same(initial);legacyTheme.theme={background:'#ffffff',surface:'#ffffff',text:'#172a43',primary:'#0a5bff',font:'system',maxWidth:1140};
  assert.equal(sdk.validateSite(legacyTheme,reg).theme.maxWidth,1140,'Old site-v1 themes remain valid without optional global styles');
  assert.equal(sdk.validateSite(site,reg).pages[0].seo.ogImage,'social-preview');
  const D=require('../sdk/draft.cjs'),updated=D.replaceSite(D.begin(initial,manifests),manifests,site,0);
  assert.ok(D.changes(updated,manifests).some(c=>c.kind==='theme-updated'));
  assert.ok(D.changes(updated,manifests).some(c=>c.kind==='page-updated'));
  assert.ok(D.changes(updated,manifests).some(c=>c.kind==='site-language-updated'));
  assert.equal(D.undo(updated,manifests).current.theme,undefined);
  const bad=same(site);bad.theme.primary='red; background:url(//evil)';
  refuses(()=>sdk.validateSite(bad,manifests),'CSS injection rejected');
  const badBodySize=same(site);badBodySize.theme.bodySize=99;
  refuses(()=>sdk.validateSite(badBodySize,manifests),'Global body size is bounded');
  const badButton=same(site);badButton.theme.buttonStyle='url(javascript:alert(1))';
  refuses(()=>sdk.validateSite(badButton,manifests),'Global button style is a closed enum');
  const badButtonColor=same(site);badButtonColor.theme.buttonText='white';
  refuses(()=>sdk.validateSite(badButtonColor,manifests),'Global button text color is a closed hex color');
  const badLanguage=same(site);badLanguage.language='xx';
  refuses(()=>sdk.validateSite(badLanguage,manifests),'Unknown site language rejected');
  const badSocialImage=same(site);badSocialImage.pages[0].seo.ogImage='missing-image';
  refuses(()=>sdk.validateSite(badSocialImage,manifests),'Social image must reference a site-owned raster image');
  const badLocalButton=same(site);badLocalButton.pages[0].sections[0].appearance={surface:'default',spacing:'normal',align:'left',button:'url(javascript:alert(1))'};
  refuses(()=>sdk.validateSite(badLocalButton,manifests),'Local button override is a closed enum');
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

test('URL changes rewrite internal links and preserve aliases, fragments, repeaters and graph links',()=>{
  const D=require('../sdk/draft.cjs'),DG=require('../sdk/design-graph.cjs');
  const site=same(initial);
  const hero=site.pages[0].sections[0];
  hero.designGraph=DG.baseGraph(hero.id);
  hero.designGraph.nodes[0].children.push({id:'graph-contact-button',type:'button',text:'Contact',
    href:'/contact/?source=graph#section-contact',styles:{}});
  const repeated=sdk.sectionFrom(manifests.find(m=>m.id==='service-grid'),'section-url-links');
  repeated.items[0].values['behavior.href']='/contact/?source=repeater#section-contact';
  site.pages[0].sections.push(repeated);
  let d=D.begin(site,manifests);
  const move=command=>d=D.structure(d,manifests,{...command,expectedRevision:d.revision});
  const componentHref=(doc,pageId,sectionId)=>doc.pages.find(p=>p.id===pageId).sections
    .find(s=>s.id===sectionId).elements.find(e=>typeof e.values['behavior.href']==='string').values['behavior.href'];
  const graphHref=doc=>doc.pages.find(p=>p.id==='page-home').sections[0].designGraph.nodes[0]
    .children.find(n=>n.id==='graph-contact-button').href;
  move({action:'updatePage',pageId:'page-contact',title:'Контакты',path:'/help/'});
  assert.deepEqual(d.current.redirects,[{from:'/contact/',to:'/help/'}]);
  assert.equal(componentHref(d.current,'page-home','section-hero'),'/help/');
  assert.equal(componentHref(d.current,'page-contact','section-contact'),'/help/');
  assert.equal(d.current.pages[0].sections.find(s=>s.id==='section-url-links').items[0].values['behavior.href'],
    '/help/?source=repeater#section-contact');
  assert.equal(graphHref(d.current),'/help/?source=graph#section-contact');
  let report=sdk.inspectSite(d.current,manifests);
  assert.equal(report.redirects,1);
  assert.ok(!report.warnings.some(x=>x.kind==='old-link'),'Renamed page references no longer detour through a redirect');
  assert.ok(!report.errors.some(x=>x.kind==='broken-link'||x.kind==='broken-anchor'));
  move({action:'updatePage',pageId:'page-contact',title:'Контакты',path:'/support/'});
  assert.deepEqual(d.current.redirects,[{from:'/contact/',to:'/support/'},{from:'/help/',to:'/support/'}],
    'Aliases resolve directly, without redirect chains');
  assert.equal(componentHref(d.current,'page-home','section-hero'),'/support/');
  assert.equal(d.current.pages[0].sections.find(s=>s.id==='section-url-links').items[0].values['behavior.href'],
    '/support/?source=repeater#section-contact');
  assert.equal(graphHref(d.current),'/support/?source=graph#section-contact');
  const renamed=JSON.stringify(d.current);
  const undone=D.undo(d,manifests);
  assert.equal(undone.current.pages.find(p=>p.id==='page-contact').path,'/help/');
  assert.equal(componentHref(undone.current,'page-home','section-hero'),'/help/');
  assert.equal(graphHref(undone.current),'/help/?source=graph#section-contact');
  d=D.redo(undone,manifests);
  assert.deepEqual(d.current,JSON.parse(renamed));
  refuses(()=>D.structure(d,manifests,{action:'addRedirect',from:'/support/',to:'/',expectedRevision:d.revision}),
    'Cannot hide an existing live page under a redirect');
  refuses(()=>D.structure(d,manifests,{action:'addRedirect',from:'/bad/',to:'/missing/',expectedRevision:d.revision}),
    'Redirects only to live page paths');
  const before=JSON.stringify(d.current);
  move({action:'removeRedirect',from:'/contact/'});
  assert.equal(d.current.redirects.length,1);
  assert.deepEqual(D.undo(d,manifests).current,JSON.parse(before));
  const updated=structuredClone(d.current);
  const visibleGraphButton=updated.pages[0].sections[0].designGraph.nodes[0].children
    .find(node=>node.id==='graph-contact-button');
  visibleGraphButton.href='/nonexistent/';
  report=sdk.inspectSite(updated,manifests);
  assert.ok(report.errors.some(x=>x.kind==='broken-link'),
    'Audit checks rendered Design Graph links, not hidden legacy component fields');
  visibleGraphButton.href='/support/#ghost-section';
  report=sdk.inspectSite(updated,manifests);
  assert.ok(report.errors.some(x=>x.kind==='broken-anchor'));
  const escaping=structuredClone(d.current);
  escaping.redirects.push({from:'/something/',to:'/support/?malicious'});
  refuses(()=>sdk.validateSite(escaping,manifests),'No query/HTML injection in redirects');
});
test('site-wide SEO, rendered headings, image ALT and graph-link audit are actionable',()=>{
  const DG=require('../sdk/design-graph.cjs'),site=same(initial);
  const title='Industrial solutions for manufacturing';
  const description='We design practical industrial equipment for manufacturing teams, factories and production facilities.';
  for(const page of site.pages)page.seo={title,description,robots:'index',ogTitle:'',ogDescription:'',ogImage:''};
  site.assets.push(
    {id:'asset-audit-legacy',src:'/assets/asset-audit-legacy.png',mime:'image/png',alt:''},
    {id:'asset-audit-graph',src:'/assets/asset-audit-graph.png',mime:'image/png',alt:'Graph illustration'}
  );
  const imageSection=sdk.sectionFrom(manifests.find(m=>m.id==='image-showcase'),'section-audit-image');
  imageSection.elements.find(el=>el.slot==='photo').values['content.media']='asset-audit-legacy';
  site.pages[0].sections.push(imageSection);
  const hero=site.pages[0].sections[0];
  hero.designGraph=DG.baseGraph(hero.id);
  hero.designGraph.nodes[0].children.push(
    {id:'graph-audit-heading-four',type:'heading',level:4,text:'Technical details',styles:{}},
    {id:'graph-audit-image-empty',type:'image',assetId:'asset-audit-graph',alt:'',styles:{}},
    {id:'graph-audit-image-generic',type:'image',assetId:'asset-audit-graph',alt:'Photo',styles:{}},
    {id:'graph-audit-broken-link',type:'button',text:'Click here',href:'/missing-page/',styles:{}}
  );
  const report=sdk.inspectSite(site,manifests);
  assert.ok(report.warnings.some(x=>x.kind==='duplicate-seo-title'),'Duplicate rendered titles are reported');
  assert.ok(report.warnings.some(x=>x.kind==='duplicate-seo-description'),'Duplicate meta descriptions are reported');
  assert.ok(report.warnings.some(x=>x.kind==='missing-h1'&&x.pageId==='page-home'),'Graph pages without H1 are reported');
  assert.ok(report.warnings.some(x=>x.kind==='heading-order'&&x.nodeId==='graph-audit-heading-four'),'Heading jumps across the rendered page are reported');
  assert.ok(report.warnings.some(x=>x.kind==='missing-alt'&&x.assetId==='asset-audit-legacy'),'Legacy component images without ALT are reported');
  assert.ok(report.warnings.some(x=>x.kind==='missing-alt'&&x.nodeId==='graph-audit-image-empty'),'Graph images without ALT are reported');
  assert.ok(report.warnings.some(x=>x.kind==='generic-alt'&&x.nodeId==='graph-audit-image-generic'),'Generic graph ALT is reported');
  assert.ok(report.errors.some(x=>x.kind==='broken-link'&&x.nodeId==='graph-audit-broken-link'),'Graph internal links are audited before publication');
  assert.ok(report.warnings.some(x=>x.kind==='generic-link-name'&&x.nodeId==='graph-audit-broken-link'),'Generic graph link names are reported');
  assert.equal(report.indexable,2);
  const hidden=same(site);hidden.pages.forEach(page=>{page.seo.robots='noindex';});
  assert.ok(sdk.inspectSite(hidden,manifests).warnings.some(x=>x.kind==='site-noindex'),'Accidental site-wide noindex is visible');
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
  const custom=sdk.sectionFrom(m('custom-section'),'section-art-directed-photo');
  custom.designGraph={version:1,id:'graph-device-artwork',nodes:[{
    id:'node-device-image',type:'image',assetId:next.id,alt:'Artwork preview',
    responsiveMedia:{tabletAssetId:first.id,mobileAssetId:first.id}
  }]};
  site.pages[0].sections.push(story,logos,photos,custom);
  assert.equal(sdk.validateSite(site,manifests).pages[0].sections.length,6);
  let d=D.begin(site,manifests);
  const step=cmd=>d=D.structure(d,manifests,{...cmd,expectedRevision:d.revision});
  refuses(()=>step({action:'removeAsset',assetId:first.id}),'Cannot detach used image');
  refuses(()=>step({action:'replaceAsset',assetId:first.id,targetId:'asset-foreign'}),
    'Only media from this site can be used as a replacement');
  step({action:'renameAsset',assetId:first.id,alt:'Готовый станок в цеху'});
  assert.ok(D.changes(d,manifests).some(x=>x.kind==='media-library-updated'));
  assert.equal(D.undo(d,manifests).current.assets[0].alt,'Старый кадр');
  step({action:'replaceAsset',assetId:first.id,targetId:next.id});
  const deviceImage=d.current.pages[0].sections.at(-1).designGraph.nodes[0];
  assert.deepEqual(deviceImage.responsiveMedia,{tabletAssetId:next.id,mobileAssetId:next.id},
    'Draft media replacement includes each per-device original');
  for(const block of d.current.pages[0].sections.slice(-4,-1))
    for(const item of [...block.elements,...(block.items||[])])
      assert.notEqual(item.values['content.media'],first.id,'All references re-bound including repeaters');
  step({action:'removeAsset',assetId:first.id});
  assert.equal(d.current.assets.length,1);
  assert.equal(d.current.assets[0].id,next.id);
  assert.equal(D.undo(d,manifests).current.assets.length,2);
  refuses(()=>step({action:'renameAsset',assetId:next.id,alt:'A\nB'}),'Unsafe control text rejected');
  const bad=same(d.current);bad.assets[0].alt='Bad\u0000alt';
  refuses(()=>sdk.validateSite(bad,manifests),'No control characters in image descriptions');
  const invalid=same(site);invalid.pages[0].sections.find(x=>x.component==='photo-gallery').items[0].values['content.media']='asset-another-site';
  refuses(()=>sdk.validateSite(invalid,manifests),'No foreign image references in partner logos');
});
test('intrinsic image dimensions are optional for legacy assets and strict for new raster assets',()=>{
  const legacy=same(initial);
  legacy.assets.push({id:'asset-legacy-image',src:'/assets/asset-legacy-image.png',alt:'Legacy image',mime:'image/png'});
  assert.doesNotThrow(()=>sdk.validateSite(legacy,manifests),'Existing v1 assets remain backward compatible');

  const measured=same(initial);
  measured.assets.push({id:'asset-measured-image',src:'/assets/asset-measured-image.webp',alt:'Measured image',
    mime:'image/webp',width:1200,height:800});
  assert.equal(sdk.validateSite(measured,manifests).assets[0].width,1200);
  const schema=read('schemas/site-v1.schema.json');
  assert.deepEqual(schema.$defs.asset.dependentRequired,{width:['height'],height:['width']});
  assert.equal(schema.$defs.asset.properties.width.maximum,4096);

  const unpaired=same(measured);delete unpaired.assets[0].height;
  refuses(()=>sdk.validateSite(unpaired,manifests),'Width and height must be supplied together');
  const oversized=same(measured);oversized.assets[0].width=5000;
  refuses(()=>sdk.validateSite(oversized,manifests),'Intrinsic width stays within decoded media limits');
  const vector=same(measured);vector.assets[0].mime='image/svg+xml';
  vector.assets[0].src='/assets/asset-measured-image.svg';
  refuses(()=>sdk.validateSite(vector,manifests),'Vector and video media do not accept raster dimensions');
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
test('sealed individual site import remaps only typed media references, never client words',()=>{
  const before=same(initial),source=same(initial);
  const image='asset-author-image',video='asset-author-video',font='asset-author-font';
  source.assets=[
    {id:image,src:'/assets/'+image+'.png',mime:'image/png',alt:'Произвольная фотография'},
    {id:video,src:'/assets/'+video+'.mp4',mime:'video/mp4',alt:'Презентация'},
    {id:font,src:'/assets/'+font+'.woff2',mime:'font/woff2',alt:'Фирменный шрифт'}
  ];
  source.branding={logoAssetId:image,faviconAssetId:image};
  source.theme={...sdk.DEFAULT_THEME,fontFiles:{body:font,heading:font}};
  source.pages[0].seo={title:'Авторская страница',description:image,robots:'index',
    ogTitle:video,ogDescription:font,ogImage:image};
  source.pages[0].sections[0].elements[0].values['content.text']=image;
  const showcase=sdk.sectionFrom(reg.get('image-showcase'),'section-imported-gallery');
  const imageSlot=reg.get('image-showcase').elements.find(el=>el.fields.some(f=>f.type==='media'));
  assert.ok(imageSlot,'Published section declares its own media slot');
  const mediaField=imageSlot.fields.find(f=>f.type==='media');
  showcase.elements.find(el=>el.slot===imageSlot.slot).values[mediaField.path]=image;
  source.pages[0].sections.push(showcase);
  const custom=sdk.sectionFrom(reg.get('custom-section'),'section-imported-design');
  custom.designGraph={version:1,id:'graph-imported-media',nodes:[{
    id:'imported-section',type:'container',styles:{},
    backgroundMedia:{assetId:image},children:[
      {id:'imported-copy',type:'text',text:image,styles:{}},
      {id:'imported-photo',type:'image',assetId:image,alt:'Фотография',styles:{}},
      {id:'imported-film',type:'video',assetId:video,posterAssetId:image,
        alt:'Короткое видео',styles:{}}
    ]
  }]};
  source.pages[0].sections.push(custom);
  sdk.validateSite(source,manifests);
  const initialBytes=JSON.stringify(source);
  const ids=new Map([[image,'asset-server-image'],[video,'asset-server-video'],[font,'asset-server-font']]);
  const targets=source.assets.map(a=>({...a,id:ids.get(a.id),
    src:'/assets/'+ids.get(a.id)+a.src.slice(a.src.lastIndexOf('.'))}));
  const imported=sdk.remapImportedMedia(source,manifests,ids,targets);
  assert.ok(imported.bindings>=10,'All typed media bindings are counted');
  assert.deepEqual(imported.unusedMediaIds,[],'All declared assets have an actual binding');
  assert.equal(imported.site.pages[0].seo.ogImage,ids.get(image));
  assert.equal(imported.site.theme.fontFiles.heading,ids.get(font));
  assert.equal(imported.site.branding.logoAssetId,ids.get(image));
  assert.equal(imported.site.pages[0].sections[2].elements
    .find(x=>x.slot===imageSlot.slot).values[mediaField.path],ids.get(image));
  const graph=imported.site.pages[0].sections[3].designGraph.nodes[0];
  assert.equal(graph.backgroundMedia.assetId,ids.get(image));
  assert.equal(graph.children[1].assetId,ids.get(image));
  assert.equal(graph.children[2].assetId,ids.get(video));
  assert.equal(graph.children[2].posterAssetId,ids.get(image));
  assert.equal(graph.children[0].text,image,'Visible client copy must not be rewritten');
  assert.equal(imported.site.pages[0].sections[0].elements[0].values['content.text'],image);
  assert.equal(imported.site.pages[0].seo.description,image);
  assert.equal(imported.site.pages[0].seo.ogTitle,video);
  assert.equal(imported.site.pages[0].seo.ogDescription,font);
  assert.equal(JSON.stringify(source),initialBytes,'Original sealed input remains untouched');
  const misleading=same(source);
  misleading.assets.push({id:'asset-orphan',src:'/assets/asset-orphan.png',
    mime:'image/png',alt:'Возможно ненужное изображение'});
  misleading.pages[0].seo.ogDescription='asset-orphan';
  const identity=new Map(misleading.assets.map(asset=>[asset.id,asset.id]));
  const inspected=sdk.remapImportedMedia(misleading,manifests,identity,misleading.assets);
  assert.deepEqual(inspected.unusedMediaIds,['asset-orphan'],
    'A literal SEO description must not count as an image use');
  assert.equal(JSON.stringify(initial),JSON.stringify(before),'No fixture mutation');
  refuses(()=>sdk.remapImportedMedia(source,manifests,new Map([[image,ids.get(image)]]),targets),
    'Missing source media mapping fails closed');
  const duplicated=new Map(ids);duplicated.set(video,ids.get(image));
  refuses(()=>sdk.remapImportedMedia(source,manifests,duplicated,targets),
    'Cross-type/duplicate mapping rejected');
  const wrong=targets.map(a=>({...a}));wrong[0].mime='image/jpeg';
  refuses(()=>sdk.remapImportedMedia(source,manifests,ids,wrong),
    'MIME mismatch rejected before Save');
});

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


test('CMS device field overrides can return to inherited values without affecting authored source',()=>{
  const D=require('../sdk/draft.cjs');
  const source=JSON.stringify(initial);
  let d=D.begin(initial,manifests);
  const target={pageId:'page-home',sectionId:'section-hero',elementId:'section-hero-heading',
    path:'style.fontSize'};
  const font=()=>d.current.pages[0].sections[0].elements[0].values['style.fontSize'];
  assert.equal(font().desktop,'64px');
  assert.equal(font().mobile,'32px');
  d=D.inheritBreakpoint(d,manifests,{...target,breakpoint:'mobile',expectedRevision:d.revision});
  assert.equal(Object.hasOwn(font(),'mobile'),false);
  assert.equal(D.blockPreview(d,manifests,'page-home','section-hero','mobile')
    .elements[0].props.style.fontSize,'48px');
  const revision=d.revision;
  d=D.inheritBreakpoint(d,manifests,{...target,breakpoint:'mobile',expectedRevision:d.revision});
  assert.equal(d.revision,revision,'absent override changes nothing');
  d=D.edit(d,manifests,{...target,breakpoint:'tablet',value:'42px',expectedRevision:d.revision});
  assert.equal(D.blockPreview(d,manifests,'page-home','section-hero','mobile')
    .elements[0].props.style.fontSize,'42px');
  d=D.edit(d,manifests,{...target,breakpoint:'mobile',value:'36px',expectedRevision:d.revision});
  d=D.inheritBreakpoint(d,manifests,{...target,breakpoint:'mobile',expectedRevision:d.revision});
  assert.equal(D.blockPreview(d,manifests,'page-home','section-hero','mobile')
    .elements[0].props.style.fontSize,'42px');
  const last=d.revision;
  d=D.undo(d,manifests);
  assert.equal(d.revision,last+1);
  assert.equal(font().mobile,'36px');
  d=D.redo(d,manifests);
  assert.equal(Object.hasOwn(font(),'mobile'),false);
  assert.equal(JSON.stringify(initial),source,'approved site payload never mutated');
  refuses(()=>D.inheritBreakpoint(d,manifests,{...target,breakpoint:'desktop',expectedRevision:d.revision}),
    'desktop is the required base');
  refuses(()=>D.inheritBreakpoint(d,manifests,{...target,path:'content.text',breakpoint:'mobile',expectedRevision:d.revision}),
    'nonresponsive field rejects inheritance');
  refuses(()=>D.inheritBreakpoint(d,manifests,{...target,path:'style.invalidField',breakpoint:'mobile',expectedRevision:d.revision}),
    'field must be declared by site manifest');
  refuses(()=>D.inheritBreakpoint(d,manifests,{...target,breakpoint:'tablet',expectedRevision:d.revision-1}),
    'stale editor rejects reset');
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
test('site-wide structure: atomic staging can move, copy and rewire anchors safely',()=>{
  const site=same(initial),step=(s,command)=>draft.structure(s,manifests,{...command,expectedRevision:s.revision});
  site.pages[0].sections.push(sdk.sectionFrom(manifests.find(m=>m.id==='cta-banner'),'section-cta'));
  const action=site.pages[0].sections.at(-1).elements.find(e=>e.slot==='primary');
  action.values['behavior.href']='/#section-hero';
  const first=site.pages[0].sections[0].elements.find(e=>e.slot==='action');
  first.values['behavior.href']='/#section-cta';
  let start=draft.begin(site,manifests),staged=draft.begin(start.current,manifests);
  staged=step(staged,{action:'relocateSection',pageId:'page-home',sectionId:'section-cta',
    toPageId:'page-contact',placement:'end'});
  assert.deepEqual(staged.current.pages[1].sections.map(s=>s.id),['section-contact','section-cta']);
  assert.equal(staged.current.pages[0].sections[0].elements.find(e=>e.slot==='action')
    .values['behavior.href'],'/contact/#section-cta');
  assert.equal(staged.current.pages[1].sections[1].elements.find(e=>e.slot==='primary')
    .values['behavior.href'],'/#section-hero');
  staged=step(staged,{action:'copySectionToPage',pageId:'page-contact',sectionId:'section-cta',
    toPageId:'page-home',placement:'start',id:'section-cta-copy'});
  assert.equal(staged.current.pages[0].sections[0].id,'section-cta-copy');
  assert.equal(staged.current.pages[0].sections[0].elements.find(e=>e.slot==='primary').id,
    'section-cta-copy-primary');
  staged=step(staged,{action:'movePage',pageId:'page-contact',delta:-1});
  const composed=draft.replaceSite(start,manifests,staged.current,start.revision);
  assert.equal(composed.undo.length,1,'The entire site plan is one undo step');
  assert.equal(composed.current.pages[0].id,'page-contact');
  assert.deepEqual(draft.undo(composed,manifests).current,start.current);
  assert.deepEqual(draft.redo(draft.undo(composed,manifests),manifests).current,composed.current);
  const original=JSON.stringify(start.current);
  assert.throws(()=>step(start,{action:'relocateSection',pageId:'page-contact',sectionId:'section-contact',
    toPageId:'page-home',placement:'end'}),/only section/);
  assert.throws(()=>step(start,{action:'copySectionToPage',pageId:'page-home',sectionId:'section-cta',
    toPageId:'page-contact',placement:'end',id:'section-hero'}),/Duplicate stable ID/);
  assert.throws(()=>draft.structure(start,manifests,{action:'relocateSection',pageId:'page-home',
    sectionId:'section-cta',toPageId:'page-contact',placement:'start',expectedRevision:42}),/Stale/);
  assert.equal(JSON.stringify(start.current),original,'Staging must never mutate the initial site');
});
test('visual page placement: exact reordering, cross-page move/copy and one-step undo',()=>{
  const step=(s,c)=>draft.structure(s,manifests,{...c,expectedRevision:s.revision});
  const doc=same(initial);
  const home=doc.pages[0],contact=doc.pages[1];
  const first=home.sections[0].id,second=home.sections[1].id;
  home.sections[0].elements.find(e=>e.slot==='action').values['behavior.href']='/#'+second;
  let work=draft.begin(doc,manifests);
  work=step(work,{action:'placeSection',mode:'move',pageId:home.id,sectionId:second,
    toPageId:home.id,targetSectionId:first,side:'before'});
  assert.equal(work.current.pages[0].sections[0].id,second,'One gesture reorders the exact section');
  assert.deepEqual(draft.undo(work,manifests).current,doc,'One Undo restores original order');
  const revision=work.revision;
  work=step(work,{action:'placeSection',mode:'copy',pageId:home.id,sectionId:second,
    toPageId:contact.id,targetSectionId:contact.sections[0].id,side:'before',id:'section-visual-copy'});
  assert.equal(work.current.pages[1].sections[0].id,'section-visual-copy');
  assert.equal(work.current.pages[1].sections[0].elements[0].id,'section-visual-copy-'+
    work.current.pages[1].sections[0].elements[0].slot,'Copied elements receive stable fresh IDs');
  work=step(work,{action:'placeSection',mode:'move',pageId:home.id,sectionId:second,
    toPageId:contact.id,side:'end'});
  assert.equal(work.current.pages[0].sections[0].elements.find(e=>e.slot==='action')
    .values['behavior.href'],'/contact/#'+second,'Anchors rewrite when moving between pages');
  assert.equal(work.current.pages[1].sections.at(-1).id,second);
  assert.equal(draft.undo(work,manifests).current.pages[0].sections[0].id,second);
  assert.throws(()=>step(work,{action:'placeSection',mode:'move',pageId:home.id,
    sectionId:first,toPageId:contact.id,side:'end'}),/only section|Cannot move|Section placement/i);
  assert.throws(()=>step(work,{action:'placeSection',mode:'copy',pageId:home.id,
    sectionId:first,toPageId:contact.id,side:'before',targetSectionId:'unknown',id:'new-section'}),
    /Target section/);
  assert.throws(()=>step(work,{action:'placeSection',mode:'copy',pageId:home.id,
    sectionId:first,toPageId:contact.id,side:'end',id:'section-visual-copy'}),/Duplicate stable ID/);
  assert.ok(work.revision>revision);
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
      options:[],placeholder:'name@example.com',when:{field:'field-channel',option:1}},
    {id:'field-contact-method',label:'Способ связи',kind:'radio',required:true,
      options:['Email','Телефон'],placeholder:''},
    {id:'field-newsletter',label:'Получать новости',kind:'checkbox',required:false,
      options:[],placeholder:''},
    {id:'field-budget',label:'Бюджет',kind:'number',required:false,
      options:[],placeholder:'Например, 250.50'},
    {id:'field-date',label:'Желаемая дата',kind:'date',required:false,
      options:[],placeholder:''},
    {id:'field-url',label:'Ссылка на проект',kind:'url',required:false,
      options:[],placeholder:'https://example.com'}
  ];
  site.pages[1].sections.push(section);
  assert.equal(sdk.validateSite(site,manifests).pages[1].sections.at(-1).formFields.length,8);
  const D=require('../sdk/draft.cjs');
  let d=D.begin(site,manifests);
  const changed=structuredClone(d.current);changed.pages[1].sections.at(-1).formFields[0].label='Кому';
  d=D.replaceSite(d,manifests,changed,d.revision);
  assert.ok(D.changes(d,manifests).some(x=>x.kind==='form-fields-updated'));
  assert.equal(D.undo(d,manifests).current.pages[1].sections.at(-1).formFields[0].label,'Адресат');
  assert.equal(D.blockPreview(d,manifests,'page-contact','section-dynamic-form').formFields.length,8);
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
  overflow.pages[1].sections.at(-1).formFields=Array.from({length:10},(_,i)=>({
    id:'field-too-many-'+i,label:'Вопрос',kind:'text',required:false,options:[],placeholder:''}));
  refuses(()=>sdk.validateSite(overflow,manifests),'Form capacity restricted');
  const other=structuredClone(initial);other.pages[0].sections[0].formFields=[];
  refuses(()=>sdk.validateSite(other,manifests),'Only form-flex can carry formFields');
});


test('flexible form steps partition fields, preserve undo and reject invalid flows',()=>{
  const m=manifests.find(m=>m.id==='lead-form-flex'),site=structuredClone(initial);
  const section=sdk.sectionFrom(m,'section-stepped');
  const select=section.elements.find(e=>e.slot==='extra-one').values;
  select['behavior.kind']='select';
  select['content.options']='Стандарт\nСрочно';
  section.formFields=[
    {id:'field-urgency',label:'Описание срочности',kind:'textarea',required:true,
      options:[],placeholder:'',when:{field:'extra1',option:2}},
    {id:'field-budget',label:'Бюджет',kind:'number',required:false,options:[],placeholder:''}
  ];
  section.formSteps=[
    {title:'Связаться',fields:['name','email']},
    {title:'Заявка',fields:['message','extra1','field-urgency','field-budget']}
  ];
  site.pages[1].sections.push(section);
  assert.ok(sdk.validateSite(site,manifests));
  const D=require('../sdk/draft.cjs');
  let draft=D.begin(site,manifests);
  assert.equal(D.blockPreview(draft,manifests,'page-contact','section-stepped').formSteps.length,2);
  const changed=structuredClone(site);
  changed.pages[1].sections.at(-1).formSteps[1].title='Уточнения';
  draft=D.replaceSite(draft,manifests,changed,draft.revision);
  assert.ok(D.changes(draft,manifests).some(d=>d.kind==='form-steps-updated'));
  assert.equal(D.undo(draft,manifests).current.pages[1].sections.at(-1).formSteps[1].title,'Заявка');
  const bad=structuredClone(site),steps=bad.pages[1].sections.at(-1).formSteps;
  steps[1].fields.pop();
  refuses(()=>sdk.validateSite(bad,manifests),'No unassigned fields');
  steps[1].fields.push('field-budget','name');
  refuses(()=>sdk.validateSite(bad,manifests),'No repeated fields');
  steps[1].fields.pop();
  steps[0].fields.push('field-urgency');
  steps[1].fields.splice(steps[1].fields.indexOf('field-urgency'),1);
  refuses(()=>sdk.validateSite(bad,manifests),'Conditional source cannot be in a later step');
  const empty=structuredClone(site);
  empty.pages[1].sections.at(-1).formSteps[0].fields=[];
  refuses(()=>sdk.validateSite(empty,manifests),'No empty step');
  const legacy=structuredClone(initial);
  legacy.pages[0].sections[0].formSteps=[{title:'A',fields:['name']},{title:'B',fields:['email','message']}];
  refuses(()=>sdk.validateSite(legacy,manifests),'No steps on non-flex component');
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
test('optional professional Design Graph: tokens, grid, breakpoints, hover and safe reversible edits',()=>{
  const D=require('../sdk/draft.cjs'),initialBytes=JSON.stringify(initial);
  const graph=require('../sdk/design-graph.cjs');
  const doc=structuredClone(initial),sec=doc.pages[0].sections[0];
  const candidate=graph.baseGraph(sec.id);
  doc.designTokens=structuredClone(graph.DEFAULT_TOKENS);
  sec.designGraph=candidate;
  assert.deepEqual(sdk.validateSite(doc,manifests),doc,'registered block remains valid');
  let d=D.begin(doc,manifests);
  const replacement=structuredClone(candidate);
  replacement.nodes[0].styles.display='flex';
  replacement.nodes[0].styles.direction='column';
  replacement.nodes[0].responsive.tablet={gap:'@small'};
  replacement.nodes[0].children[0].text='Произвольный AI-дизайн & качество';
  replacement.nodes[0].children[0].states={hover:{color:'@accent'},focus:{opacity:80}};
  d=D.structure(d,manifests,{action:'updateDesignGraph',pageId:'page-home',sectionId:sec.id,
    designGraph:replacement,expectedRevision:d.revision});
  assert.equal(d.current.pages[0].sections[0].designGraph.nodes[0].children[0].text,'Произвольный AI-дизайн & качество');
  assert.equal(D.blockPreview(d,manifests,'page-home',sec.id).designGraph.version,1);
  assert.equal(D.undo(d,manifests).current.pages[0].sections[0].designGraph.nodes[0].styles.display,'grid');
  assert.deepEqual(D.redo(D.undo(d,manifests),manifests).current,d.current);
  const html=graph.render(d.current,replacement,'');
  assert.match(html,/display:flex/);assert.match(html,/@media\(max-width:900px\)/);
  assert.match(html,/focus-visible/);assert.match(html,/&amp; качество/);
  assert.doesNotMatch(html,/<script|onerror=/);
  const cloned=D.structure(d,manifests,{action:'duplicateSection',pageId:'page-home',
    sectionId:sec.id,id:'section-unique-design-copy',expectedRevision:d.revision});
  assert.notEqual(cloned.current.pages[0].sections[1].designGraph.id,replacement.id);
  const malicious=structuredClone(d.current);
  malicious.pages[0].sections[0].designGraph.nodes[0].styles.color='red; background:url(javascript:alert(1))';
  refuses(()=>sdk.validateSite(malicious,manifests),'CSS escape rejected');
  const injected=structuredClone(d.current);
  injected.pages[0].sections[0].designGraph.nodes[0].children[0].states.hover={onclick:'alert(1)'};
  refuses(()=>sdk.validateSite(injected,manifests),'Only whitelisted CSS interaction properties');
  const broken=structuredClone(d.current);
  broken.pages[0].sections[0].designGraph.nodes[0].children.push({
    id:'node-evil-link',type:'button',text:'Do not click',href:'javascript:alert(1)',styles:{}});
  refuses(()=>sdk.validateSite(broken,manifests),'Unsafe URL rejected');
  const unknown=structuredClone(d.current);
  unknown.pages[0].sections[0].designGraph.nodes[0].children[0].styles.gap='@missing';
  refuses(()=>sdk.validateSite(unknown,manifests),'Unknown token rejected');
  const target=structuredClone(d.current);
  target.pages[0].sections[0].designGraph.nodes[0].children[0].text='После ручной правки CMS';
  const swapped=D.replaceSite(d,manifests,target,d.revision);
  assert.ok(D.changes(swapped,manifests).some(x=>x.kind==='design-graph-updated'));
  assert.equal(sdk.validateSite(swapped.current,manifests).pages[0].sections[0].designGraph.version,1);
  assert.equal(JSON.stringify(initial),initialBytes,'Older site fixture never rewritten');
});

test('Design Graph accessibility audit flags contrast, heading order, missing descriptions and unclear links',()=>{
  const graph=require('../sdk/design-graph.cjs');
  const candidate={version:1,id:'a11y-graph',nodes:[{
    id:'a11y-root',type:'container',styles:{background:'#ffffff'},children:[
      {id:'a11y-title',type:'heading',level:2,text:'Readable title',styles:{color:'#777777',fontSize:16}},
      {id:'a11y-jump',type:'heading',level:4,text:'Skipped heading level',styles:{}},
      {id:'a11y-image',type:'image',assetId:'a11y-asset',alt:'',styles:{}},
      {id:'a11y-link',type:'button',text:'Click here',href:'/',styles:{color:'#777777',background:'#ffffff',outlineWidth:0}},
      {id:'a11y-empty-link',type:'button',text:'',href:'/',styles:{}}
    ]
  }]};
  const findings=graph.auditAccessibility(candidate,graph.DEFAULT_TOKENS);
  const codes=new Set(findings.map(item=>item.code));
  for(const code of ['low-contrast','heading-order','missing-alt','generic-link-name','empty-link-name','focus-indicator-removed'])
    assert.ok(codes.has(code),'Accessibility audit should report '+code);
  assert.equal(findings.find(item=>item.code==='heading-order').nodeId,'a11y-jump');
  assert.equal(findings.find(item=>item.code==='missing-alt').nodeId,'a11y-image');
  assert.equal(findings.find(item=>item.code==='empty-link-name').severity,'error');

  const accessible={version:1,id:'a11y-clean-graph',nodes:[{
    id:'a11y-clean-root',type:'container',styles:{background:'#ffffff'},children:[
      {id:'a11y-clean-copy',type:'text',text:'Readable body copy',styles:{color:'#182b3d',fontSize:16}}
    ]
  }]};
  assert.equal(graph.auditAccessibility(accessible,graph.DEFAULT_TOKENS).some(item=>item.code==='low-contrast'),false,
    'Known readable foreground/background pairs do not create a contrast warning');
});

test('rich Design Graph primitives, accessible icons, gradients and motion remain typed and inert',()=>{
  const graph=require('../sdk/design-graph.cjs'),site=structuredClone(initial);
  const section=site.pages[0].sections[0];
  const g=graph.baseGraph(section.id),root=g.nodes[0],title=root.children[0];
  site.designTokens=structuredClone(graph.DEFAULT_TOKENS);
  root.styles={display:'grid',columns:3,columnGap:'@small',paddingX:'@large',paddingY:'@medium',
    gradient:{angle:125,from:'@accent',to:'#fafafa'},shadow:'medium',widthPercent:100,
    minHeight:200,marginBottom:-16,flexWrap:'wrap',gridColumnSpan:2};
  root.responsive={tablet:{columns:2,paddingX:'@small'},
    mobile:{columns:1,gap:8,gridColumnSpan:1,shadow:'soft'}};
  title.styles={fontFamily:'georgia',fontSize:'@heading',letterSpacing:-8,
    lineHeight:125,color:'@foreground',marginTop:12};
  title.motion={effect:'fade-up',duration:650,delay:200};
  root.children.push({id:section.id+'-graphic',type:'icon',icon:'shield',
    alt:'Защищённая обработка',styles:{fontSize:32,color:'@accent',opacity:90}});
  section.designGraph=g;
  assert.deepEqual(sdk.validateSite(site,manifests),site);
  const html=graph.render(site,g,'','',section.id);
  assert.match(html,/linear-gradient\(125deg,#0a5bff,#fafafa\)/);
  assert.match(html,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html,/grid-column:span 2/);
  assert.match(html,/font-family:Georgia,serif/);
  assert.match(html,/animation:cmsdg-fade-up 650ms ease-out 200ms both/);
  assert.match(html,/prefers-reduced-motion:reduce/);
  assert.match(html,/<svg[^>]+role="img" aria-label="Защищённая обработка"/);
  assert.match(html,/@media\(max-width:600px\)/);
  assert.doesNotMatch(html,/<script\b|onload=/);
  const invalid=[
    d=>d.nodes[0].styles.gradient.from='url(javascript:alert(1))',
    d=>d.nodes[0].styles.gradient.angle='125deg',
    d=>d.nodes[0].styles.fontFamily='Comic Sans;display:none',
    d=>d.nodes[0].children[0].motion.duration=12000,
    d=>d.nodes[0].children[0].motion.effect='custom-keyframes',
    d=>d.nodes[0].children.at(-1).icon='<img onerror=alert(1)>',
    d=>d.nodes[0].children.at(-1).children=[],
    d=>d.nodes[0].responsive.mobile.shadow='url(https://external)',
    d=>d.nodes[0].styles.gridColumnSpan=42,
    d=>d.nodes[0].children.at(-1).alt='\u0000'
  ];
  for(const change of invalid){
    const corrupted=structuredClone(site);
    change(corrupted.pages[0].sections[0].designGraph);
    refuses(()=>sdk.validateSite(corrupted,manifests),'Unsafe motion/icons/gradient/style rejected');
  }
});

test('precision graph layout, responsive focal images, focus and three-stop gradients',()=>{
  const graph=require('../sdk/design-graph.cjs'),site=structuredClone(initial);
  const sec=site.pages[0].sections[0],g=graph.baseGraph(sec.id),root=g.nodes[0];
  site.designTokens=structuredClone(graph.DEFAULT_TOKENS);
  Object.assign(root.styles,{gridAutoFlow:'row-dense',alignContent:'between',
    widthPx:900,minWidth:300,maxHeight:1300,zIndex:2,position:'relative',
    right:'@small',bottom:12,gradient:{angle:90,from:'@accent',via:'#aabbcc',viaAt:45,to:'@background'}});
  Object.assign(root.responsive.mobile,{widthPx:320,gridRowSpan:2,alignContent:'center'});
  Object.assign(root.children[0].styles,{flexBasisPercent:75,flexShrink:0,justifySelf:'end',
    textDecoration:'underline',whiteSpace:'pre-line'});
  root.children[0].states={focus:{outlineColor:'@accent',outlineWidth:3}};
  sec.designGraph=g;
  assert.deepEqual(sdk.validateSite(site,manifests),site);
  const html=graph.render(site,g);
  for(const rule of ['grid-auto-flow:row dense','align-content:space-between','width:900px',
    'z-index:2','right:12px','bottom:12px','linear-gradient(90deg,#0a5bff,#aabbcc 45%,#ffffff)',
    'outline-width:3px','outline-offset:2px','flex-basis:75%','white-space:pre-line',
    '@media(max-width:600px)'])assert.ok(html.includes(rule),rule);
  const focal=structuredClone(g);
  focal.nodes[0].children.push({id:'photo-focal-local',type:'image',assetId:'photo-owned',
    alt:'Safe photograph',styles:{objectFit:'cover',objectPositionX:20,objectPositionY:80,heightPx:320},
    responsive:{mobile:{objectPositionX:60,objectPositionY:40}}});
  const preview=graph.render({...site,assets:[...site.assets,{id:'photo-owned',mime:'image/png',src:'/assets/photo.png',alt:'Safe photograph'}]},focal);
  for(const rule of ['--cmsdg-object-x:20%','--cmsdg-object-y:80%',
    'object-position:var(--cmsdg-object-x,50%)','--cmsdg-object-x:60%'])
    assert.ok(preview.includes(rule),rule);
  for(const change of [
    d=>{d.nodes[0].styles.widthPercent=90;},
    d=>{d.nodes[0].styles.zIndex=1000;},
    d=>{d.nodes[0].styles.gridAutoFlow='dense;display:none';},
    d=>{d.nodes[0].styles.gradient.viaAt=0;},
    d=>{delete d.nodes[0].styles.gradient.via;},
    d=>{d.nodes[0].children[0].states.focus.outlineColor='url(https://a.example)';}
  ]){const broken=structuredClone(site);change(broken.pages[0].sections[0].designGraph);
    refuses(()=>sdk.validateSite(broken,manifests),'Unsafe precision style rejected');
  }
});


test('AI-free atomic composition tree: reparent, deep clone, wrap, unwrap, media and Undo',()=>{
  const graph=require('../sdk/design-graph.cjs'),D=require('../sdk/draft.cjs');
  const site=structuredClone(initial),sec=site.pages[0].sections[0];
  site.designTokens=structuredClone(graph.DEFAULT_TOKENS);
  const base=graph.baseGraph(sec.id),original=JSON.stringify(base);
  const layout=base.nodes[0];
  layout.children.push({id:'node-photograph',type:'image',assetId:'asset-picture',
    alt:'Composition image',styles:{objectFit:'cover',objectPositionX:32},
    responsive:{mobile:{objectPositionX:72}}});
  layout.children.push({id:'node-column',type:'container',
    styles:{display:'grid',columns:1},children:[]});
  const withNodes=JSON.stringify(base);
  const moved=graph.editTree(base,{action:'move',nodeId:sec.id+'-title',
    targetId:'node-column',placement:'inside'});
  assert.equal(base.nodes[0].children[0].type,'heading','Move must not mutate input');
  assert.equal(JSON.stringify(base),withNodes);
  assert.equal(moved.nodes[0].children.at(-1).children[0].id,sec.id+'-title');
  const clone=graph.editTree(moved,{action:'duplicate',nodeId:sec.id+'-layout',
    ids:['node-copied-layout','node-copied-text','node-copied-photo','node-copied-column',
      'node-copied-title']});
  assert.equal(clone.nodes.length,2);
  assert.equal(clone.nodes[1].children[1].assetId,'asset-picture');
  assert.equal(clone.nodes[1].children[1].responsive.mobile.objectPositionX,72);
  assert.equal(clone.nodes[1].children[2].children[0].id,'node-copied-title');
  const inserted=graph.editTree(clone,{action:'insert',targetId:'node-copied-column',
    placement:'inside',node:{id:'node-new-paragraph',type:'text',text:'Inserted content',styles:{}}});
  assert.equal(inserted.nodes[1].children[2].children.at(-1).text,'Inserted content');
  assert.equal(clone.nodes[1].children[2].children.length,1);
  const wrapped=graph.editTree(clone,{action:'wrap',nodeId:'node-copied-photo',
    wrapperId:'node-photo-frame'});
  assert.equal(wrapped.nodes[1].children[1].children[0].id,'node-copied-photo');
  const unwrapped=graph.editTree(wrapped,{action:'unwrap',nodeId:'node-photo-frame'});
  assert.deepEqual(unwrapped,clone);
  const beforeTop=graph.editTree(clone,{action:'move',nodeId:'node-copied-layout',
    targetId:sec.id+'-layout',placement:'before'});
  assert.equal(beforeTop.nodes[0].id,'node-copied-layout');
  const removed=graph.editTree(beforeTop,{action:'remove',nodeId:'node-copied-layout'});
  assert.deepEqual(removed,moved);
  for(const operation of [
    {action:'move',nodeId:sec.id+'-layout',targetId:'node-column',placement:'inside'},
    {action:'move',nodeId:'node-column',targetId:'node-photograph',placement:'inside'},
    {action:'duplicate',nodeId:'node-column',ids:['node-column']},
    {action:'duplicate',nodeId:'node-column',ids:['illegal space']},
    {action:'wrap',nodeId:'node-column',wrapperId:sec.id+'-title'},
    {action:'unwrap',nodeId:'node-photograph'},
    {action:'remove',nodeId:sec.id+'-layout'},
    {action:'insert',targetId:'node-photograph',placement:'inside',
      node:{id:'node-not-allowed',type:'text',text:'bad'}},
    {action:'insert',targetId:'node-column',placement:'inside',
      node:{id:sec.id+'-title',type:'text',text:'duplicate'}}
  ])refuses(()=>graph.editTree(moved,operation),'Invalid graph restructure must be atomic');
  assert.equal(JSON.stringify(moved.nodes[0].children.at(-1).children[0].text),'"Ваш уникальный заголовок"');
  site.assets=[{id:'asset-picture',src:'/assets/picture.png',mime:'image/png',alt:'Picture'}];
  sec.designGraph=clone;
  assert.deepEqual(sdk.validateSite(site,manifests),site);
  const html=graph.render(site,clone);
  assert.match(html,/cmsdg-n-node-copied-layout/);
  assert.match(html,/cmsdg-n-node-copied-photo/);
  assert.match(html,/--cmsdg-object-x:72%/);
  let draft=D.begin(site,manifests);
  const later=structuredClone(site);
  later.pages[0].sections[0].designGraph=wrapped;
  draft=D.replaceSite(draft,manifests,later,draft.revision);
  assert.deepEqual(D.undo(draft,manifests).current,site);
  assert.deepEqual(D.redo(D.undo(draft,manifests),manifests).current,later);
  assert.ok(original.includes(sec.id+'-title'));
});


test('editorial type, asymmetric grid and layered transforms stay typed across responsive design',()=>{
  const DG=require('../sdk/design-graph.cjs'),site=structuredClone(initial);
  const sec=site.pages[0].sections[0],g=DG.baseGraph(sec.id),hero=g.nodes[0],heading=hero.children[0];
  site.designTokens=structuredClone(DG.DEFAULT_TOKENS);
  delete hero.styles.columns;
  Object.assign(hero.styles,{gridColumnsPreset:'sidebar-left',isolation:'isolate',
    mixBlendMode:'multiply',clipShape:'diagonal',backdropBlur:12,overflow:'hidden',
    borderTopLeftRadius:'@round',borderBottomRightRadius:22});
  hero.responsive.tablet={gridColumnsPreset:'wide-center',translateX:24,translateY:-12};
  hero.responsive.mobile={columns:1,gridColumnsPreset:undefined,translateX:0,translateY:0};
  delete hero.responsive.mobile.gridColumnsPreset;
  Object.assign(heading.styles,{fontStyle:'italic',fontWeight:700,
    textTransform:'uppercase',textWrap:'balance',wordBreak:'break-word',
    textOverflow:'ellipsis',textShadow:'soft',wordSpacing:12,textIndent:-18,
    gridColumnStart:2,gridRowStart:1,translateX:32,translateY:-48,
    rotateDeg:-8,scalePercent:115,transformOrigin:'top-left'});
  heading.responsive={tablet:{rotateDeg:0,scalePercent:100},
    mobile:{translateX:-10,translateY:0,textTransform:'none',fontStyle:'normal',textWrap:'pretty'}};
  sec.designGraph=g;
  assert.deepEqual(sdk.validateSite(site,manifests),site);
  const html=DG.render(site,g);
  for(const css of ['grid-template-columns:minmax(0,1fr) minmax(0,2fr)',
    'grid-template-columns:minmax(0,1fr) minmax(0,3fr) minmax(0,1fr)',
    'clip-path:polygon(0 0,100% 0,100% 90%,0 100%)','backdrop-filter:blur(12px)',
    '-webkit-backdrop-filter:blur(12px)','mix-blend-mode:multiply','isolation:isolate',
    'border-top-left-radius:24px','border-bottom-right-radius:22px',
    'font-style:italic','text-transform:uppercase','text-wrap:balance',
    'word-break:break-word','text-overflow:ellipsis','text-shadow:0 2px 8px #10182040',
    'word-spacing:1.2px','text-indent:-18px','grid-column-start:2','grid-row-start:1',
    'rotate:-8deg','scale:1.15','transform-origin:top-left',
    '--cmsdg-tx:0px;--cmsdg-ty:0px;translate:var(--cmsdg-tx) var(--cmsdg-ty)',
    '--cmsdg-tx:32px','--cmsdg-ty:-48px','@media(max-width:900px)','@media(max-width:600px)']){
    assert.ok(html.includes(css),'Editorial CSS should render: '+css);
  }
  const invalid=[
    s=>s.nodes[0].styles.gridColumnsPreset='repeat(1000,1fr)',
    s=>s.nodes[0].styles.columns=2,
    s=>s.nodes[0].styles.clipShape='url(http://unsafe)',
    s=>s.nodes[0].styles.backdropBlur=300,
    s=>s.nodes[0].styles.mixBlendMode='destination-out',
    s=>s.nodes[0].children[0].styles.scalePercent=400,
    s=>s.nodes[0].children[0].styles.translateX='calc(9px)',
    s=>s.nodes[0].children[0].styles.rotateDeg=360,
    s=>s.nodes[0].children[0].styles.textShadow='url(/evil)',
    s=>s.nodes[0].children[0].styles.borderTopLeftRadius='@unknown',
    s=>s.nodes[0].children[0].styles.textTransform='<script>',
    s=>s.nodes[0].children[0].states={focus:{rotateDeg:90}}
  ];
  for(const mutate of invalid){
    const candidate=structuredClone(g);mutate(candidate);
    const broken=structuredClone(site);broken.pages[0].sections[0].designGraph=candidate;
    refuses(()=>sdk.validateSite(broken,manifests),'Untrusted editorial CSS must fail closed');
  }
  assert.doesNotMatch(html,/<script|onerror=/);
});

test('fluid responsive typography stays typed and matches browser CSS',()=>{
  const DG=require('../sdk/design-graph.cjs'),site=same(initial);
  const section=site.pages[0].sections[0],graph=DG.baseGraph(section.id);
  graph.nodes[0].children[0].styles={fluidFont:{min:30,max:72},lineHeight:110};
  section.designGraph=graph;
  sdk.validateSite(site,manifests);
  assert.match(DG.render(site,graph),/font-size:clamp\(30px,calc\(4\.7727vw \+ 14\.7273px\),72px\)/);
  const exclusive=same(site);
  exclusive.pages[0].sections[0].designGraph.nodes[0].children[0].styles.fontSize=40;
  refuses(()=>sdk.validateSite(exclusive,manifests),'Manual fixed/font fluid conflict');
  for(const badValue of [{min:120,max:10},{min:9,max:60},{min:30,max:121},{min:'30',max:70}]){
    const invalid=same(site);
    invalid.pages[0].sections[0].designGraph.nodes[0].children[0].styles.fluidFont=badValue;
    refuses(()=>sdk.validateSite(invalid,manifests),'Type/range checks must hold');
  }
});

test('read-only approved folder preflight accepts a custom external design and rejects draft approval',()=>{
  const os=require('node:os');
  const {preflight}=require('../bin/verify-approved-site.cjs');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-approved-'));
  try{
    fs.mkdirSync(path.join(folder,'prototypes'));
    const validPng=Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nG'+
      'O06dnHwMDAxMDAwMDAAAAR8AGK2d4bdAAAAABJRU5ErkJggg==','base64');
    for(const size of ['desktop','tablet','mobile'])
      fs.writeFileSync(path.join(folder,'prototypes',size+'.png'),validPng);
    fs.writeFileSync(path.join(folder,'client-explanation.md'),
      'Actual client-facing explanation and responsive interaction descriptions.');
    fs.writeFileSync(path.join(folder,'implementation-spec.md'),
      'Portable section graph, responsive and SEO implementation specification.');
    const site=sdk.siteFromBrief({siteId:'site-approved-preflight',title:'Preflight'},manifests);
    site.pages[0].sections.push(sdk.sectionFrom(
      manifests.find(m=>m.id==='custom-section'),'section-preflight'));
    fs.writeFileSync(path.join(folder,'site.json'),JSON.stringify(site));
    const handoff={format:'manufact-approved-site-handoff-v1',status:'approved',
      version:'spec-1',files:{
        site:'site.json',desktop:'prototypes/desktop.png',
        tablet:'prototypes/tablet.png',mobile:'prototypes/mobile.png',
        clientExplanation:'client-explanation.md',implementationSpec:'implementation-spec.md'}};
    const handoffFile=path.join(folder,'handoff.json');
    fs.writeFileSync(handoffFile,JSON.stringify(handoff));
    assert.equal(preflight(folder).customSections,1);
    handoff.status='draft';fs.writeFileSync(handoffFile,JSON.stringify(handoff));
    refuses(()=>preflight(folder),'Non-approved packs must be rejected before import');
    handoff.status='approved';fs.writeFileSync(handoffFile,JSON.stringify(handoff));
    const {seal}=require('../bin/seal-approved-site.cjs');
    refuses(()=>seal(folder,'rev-1'), 'Must never infer approval from existing files');
    const locked=seal(folder,'rev-1',{confirmedApproved:true,replace:true});
    assert.equal(locked.customSections,1);
    assert.equal(locked.integrity,'sha256-verified');
    assert.ok(locked.lockedFiles>=6);
    const desc=path.join(folder,'client-explanation.md'),before=fs.readFileSync(desc);
    fs.appendFileSync(desc,' CHANGED WITHOUT REAPPROVAL');
    refuses(()=>preflight(folder),'Locked v2 must reject changed client explanation');
    fs.writeFileSync(desc,before);
    assert.equal(preflight(folder).integrity,'sha256-verified');
    refuses(()=>seal(folder,'rev-2',{confirmedApproved:true}),'No silent overwrite of a sealed design');
    assert.equal(seal(folder,'rev-2',{confirmedApproved:true,replace:true}).version,'rev-2');
    const audit=require('../bin/audit-approved-site.cjs').run(folder);
    assert.match(audit.report,/Authored content and H1 at each viewport/);
    assert.match(audit.report,/Desktop · sections\/H1\/forms/);
    assert.equal(audit.summary.integrity,'sha256-verified');
    assert.match(audit.report,/Desktop \(1280px\)/);
    assert.match(audit.report,/Tablet \(768px\)/);
    assert.match(audit.report,/Mobile \(390px\)/);
    assert.match(audit.report,/Site ID: site-/);
    assert.match(audit.report,/saved draft/);
    // The approved package now includes an actual MP4, not a video URL or
    // an image masquerading as an MP4. The existing PHP fixture is playable.
    fs.mkdirSync(path.join(folder,'assets'));
    const film=fs.readFileSync(path.join(root,'tests/fixtures/tiny-h264.mp4.b64'),'utf8').trim();
    const video=Buffer.from(film,'base64');
    const videoFile=path.join(folder,'assets/asset-approved-film.mp4');
    fs.writeFileSync(videoFile,video);
    site.assets.push({id:'asset-approved-film',src:'/assets/asset-approved-film.mp4',
      mime:'video/mp4',alt:'Утверждённая видеопрезентация'});
    fs.writeFileSync(path.join(folder,'site.json'),JSON.stringify(site));
    const withVideo=seal(folder,'rev-video',{confirmedApproved:true,replace:true});
    assert.equal(withVideo.integrity,'sha256-verified');
    assert.equal(withVideo.assets,1);
    assert.equal(preflight(folder).sourceAssetBytes,video.length);
    fs.writeFileSync(videoFile,Buffer.alloc(video.length,0));
    refuses(()=>preflight(folder),'Tampered MP4 must fail SHA and structural verification');
    refuses(()=>seal(folder,'rev-tamper',{confirmedApproved:true,replace:true}),
      'Cannot seal fake video bytes as MP4');
    fs.writeFileSync(videoFile,video);
    assert.equal(preflight(folder).integrity,'sha256-verified');
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});

test('decorative background video is site-owned, muted and safely poster-backed',()=>{
  const graph=require('../sdk/design-graph.cjs'),site=same(initial);
  site.assets.push({id:'asset-background-mp4',src:'/assets/asset-background-mp4.mp4',
    mime:'video/mp4',alt:'Фоновый ролик'},{
    id:'asset-background-poster',src:'/assets/asset-background-poster.png',
    mime:'image/png',alt:'Кадр для обложки',width:2,height:2});
  const section=sdk.sectionFrom(manifests.find(x=>x.id==='custom-section'),'section-background-video');
  section.designGraph={version:1,id:'graph-background-video',nodes:[{
    id:'background-layout',type:'container',backgroundVideo:{
      assetId:'asset-background-mp4',posterAssetId:'asset-background-poster',
      mobilePosterAssetId:'asset-background-poster',overlay:{color:'#000000',opacity:40}
    },children:[{id:'background-text',type:'heading',level:2,text:'Наша история'}]
  }]};
  site.pages[0].sections.push(section);
  sdk.validateSite(site,manifests);
  const html=graph.render(site,section.designGraph,'/published/'+site.siteId);
  assert.match(html,/class="cmsdg-video-backdrop" aria-hidden="true"/);
  assert.match(html,/<video autoplay muted loop playsinline preload="none"/);
  assert.match(html,/prefers-reduced-motion:reduce/);
  const node=section.designGraph.nodes[0],v=node.backgroundVideo;
  const bad=()=>refuses(()=>sdk.validateSite(site,manifests));
  v.assetId='asset-background-poster';bad();v.assetId='asset-background-mp4';
  v.posterAssetId='asset-background-mp4';bad();v.posterAssetId='asset-background-poster';
  v.overlay.opacity=100;bad();v.overlay.opacity=40;
  node.backgroundMedia={assetId:'asset-background-poster'};bad();delete node.backgroundMedia;
  node.type='heading';bad();node.type='container';
  sdk.validateSite(site,manifests);
});

test('native Design Graph popup plus deterministic entrance sequence stays typed and safe',()=>{
  const host=require('../sdk/design-graph.cjs'),site=same(initial);
  const section=sdk.sectionFrom(manifests.find(m=>m.id==='custom-section'),'section-native-popup');
  section.designGraph={version:1,id:'graph-native-popup',nodes:[
    {id:'popup-cta',type:'button',text:'Подробнее',popupTarget:'popup-terms',styles:{}},
    {id:'popup-terms',type:'popup',text:'Описание условий',styles:{radius:16},
      children:[{id:'popup-description',type:'text',text:'Согласованные условия',styles:{}}]},
    {id:'animated-grid',type:'container',styles:{display:'grid',columns:2},
      sequence:{effect:'fade-up',duration:500,delay:50,stagger:180,easing:'ease-out'},
      children:[{id:'animated-first',type:'text',text:'Пункт один',styles:{}},
        {id:'animated-second',type:'text',text:'Пункт два',styles:{}}]}
  ]};
  site.pages[0].sections.push(section);
  sdk.validateSite(site,manifests);
  const html=host.render(site,section.designGraph,'/published/'+site.siteId);
  assert.match(html,/popover="auto" id="cmsdg-popup-popup-terms"/);
  assert.match(html,/popovertarget="cmsdg-popup-popup-terms"/);
  assert.match(html,/popovertargetaction="hide"/);
  assert.ok(html.includes('animated-first{animation:cmsdg-fade-up 500ms ease-out 50ms both'));
  assert.ok(html.includes('animated-second{animation:cmsdg-fade-up 500ms ease-out 230ms both'));
  assert.match(html,/prefers-reduced-motion:reduce/);
  const graph=section.designGraph,cta=graph.nodes[0],pop=graph.nodes[1],grid=graph.nodes[2];
  const bad=()=>refuses(()=>sdk.validateSite(site,manifests));
  cta.popupTarget='popup-foreign';bad();cta.popupTarget=pop.id;
  cta.href='https://example.com';bad();delete cta.href;
  pop.text='<script>test</script>';sdk.validateSite(site,manifests);
  assert.ok(host.render(site,graph).includes('&lt;script&gt;test&lt;/script&gt;'));
  pop.text='Описание условий';
  grid.sequence.stagger=901;bad();
  grid.sequence.stagger=180;grid.sequence.delay=50;
  grid.children[0].motion={effect:'fade-in',duration:400,delay:0};bad();
  delete grid.children[0].motion;
  grid.sequence.easing='expression(x)';bad();grid.sequence.easing='ease-out';
  graph.nodes[1].type='container';bad();graph.nodes[1].type='popup';
  sdk.validateSite(site,manifests);
});

test('scroll-tied effects, fine shadows and safe interactive states keep PHP-compatible typed boundaries',()=>{
  const graph=require('../sdk/design-graph.cjs'),site=same(initial);
  const section=sdk.sectionFrom(manifests.find(x=>x.id==='custom-section'),'section-motion-panel');
  section.designGraph={version:1,id:'graph-motion-panel',nodes:[
    {id:'motion-panel',type:'container',styles:{shadowFine:{
      x:-8,y:16,blur:30,spread:0,color:'#122334',inset:false}},
    children:[
      {id:'motion-heading',type:'heading',level:2,text:'О проекте',styles:{},
        motion:{effect:'fade-up',duration:620,delay:0,trigger:'scroll',easing:'ease-in-out'}},
      {id:'motion-button',type:'button',text:'Продолжить',href:'/',styles:{},
        transition:{duration:240,easing:'ease-in-out'},
        states:{hover:{scalePercent:106},active:{scalePercent:95}}}
    ]}
  ]};
  site.pages[0].sections.push(section);
  sdk.validateSite(site,manifests);
  const html=graph.render(site,section.designGraph);
  assert.ok(html.includes('box-shadow:-8px 16px 30px 0px #122334'));
  assert.ok(html.includes('@supports (animation-timeline: view())'));
  assert.ok(html.includes('animation-timeline:view(block)'));
  assert.ok(html.includes('transition:color 240ms ease-in-out'));
  assert.ok(html.includes('scale:1.06'));
  assert.match(html,/prefers-reduced-motion:reduce/);
  const [container,heading,button]=[
    section.designGraph.nodes[0],
    section.designGraph.nodes[0].children[0],
    section.designGraph.nodes[0].children[1]];
  const bad=()=>refuses(()=>sdk.validateSite(site,manifests));
  heading.motion.delay=100;bad();heading.motion.delay=0;
  heading.motion.trigger='javascript';bad();heading.motion.trigger='scroll';
  container.styles.shadowFine.blur=161;bad();container.styles.shadowFine.blur=30;
  container.styles.shadowFine.color='url(https://x.invalid)';bad();container.styles.shadowFine.color='#122334';
  container.styles.shadow='strong';bad();delete container.styles.shadow;
  button.transition.duration=1200;bad();button.transition.duration=240;
  button.states.hover.scalePercent=210;bad();button.states.hover.scalePercent=106;
  sdk.validateSite(site,manifests);
});

test('shared sections link across pages, sync one edit, preserve IDs, Undo and detach safely',()=>{
  const D=require('../sdk/draft.cjs'),site=same(initial);
  const section=sdk.sectionFrom(manifests.find(m=>m.id==='custom-section'),'section-common-core');
  section.designGraph={version:1,id:'graph-common-core',nodes:[
    {id:'common-action',type:'button',text:'Подробнее',popupTarget:'common-popup'},
    {id:'common-popup',type:'popup',text:'Условия',
      children:[{id:'common-body',type:'text',text:'Одна секция на нескольких страницах'}]}
  ]};
  site.pages[0].sections.push(section);
  let session=D.begin(site,manifests);
  session=D.structure(session,manifests,{
    action:'linkSharedSection',pageId:'page-home',sectionId:'section-common-core',
    toPageId:'page-contact',id:'section-common-contact',
    sharedKey:'shared-common-core',expectedRevision:session.revision});
  const first=session.current.pages[0].sections.at(-1);
  const second=session.current.pages[1].sections.at(-1);
  assert.equal(first.sharedKey,'shared-common-core');
  assert.equal(second.sharedKey,first.sharedKey);
  assert.notEqual(first.id,second.id);
  assert.notEqual(first.designGraph.id,second.designGraph.id);
  assert.notEqual(first.designGraph.nodes[1].id,second.designGraph.nodes[1].id);
  assert.equal(second.designGraph.nodes[0].popupTarget,second.designGraph.nodes[1].id,
    'Popups rekey with their local graph IDs');
  const before=session.revision;
  session=D.edit(session,manifests,{pageId:'page-home',sectionId:first.id,
    elementId:first.elements[0].id,path:'content.text',value:'Общий обновлённый текст',
    expectedRevision:before});
  assert.equal(session.revision,before+1);
  assert.equal(session.current.pages[0].sections.at(-1).elements[0].values['content.text'],
    'Общий обновлённый текст');
  assert.equal(session.current.pages[1].sections.at(-1).elements[0].values['content.text'],
    'Общий обновлённый текст');
  const graphCopy=same(session.current);
  graphCopy.pages[0].sections.at(-1).designGraph.nodes[1].children[0].text='Обновление двух страниц';
  session=D.replaceSite(session,manifests,graphCopy,session.revision);
  assert.equal(session.current.pages[1].sections.at(-1).designGraph.nodes[1].children[0].text,
    'Обновление двух страниц');
  let invalid=same(session.current);
  invalid.pages[1].sections.at(-1).designGraph.nodes[1].children[0].text='Расхождение';
  refuses(()=>sdk.validateSite(invalid,manifests),'Server must reject a divergent saved copy');
  session=D.undo(session,manifests);
  assert.equal(session.current.pages[0].sections.at(-1).designGraph.nodes[1].children[0].text,
    'Одна секция на нескольких страницах');
  assert.equal(session.current.pages[1].sections.at(-1).designGraph.nodes[1].children[0].text,
    'Одна секция на нескольких страницах');
  session=D.structure(session,manifests,{action:'detachSharedSection',pageId:'page-contact',
    sectionId:'section-common-contact',expectedRevision:session.revision});
  assert.equal(session.current.pages[1].sections.at(-1).sharedKey,undefined);
  const independent=same(session.current);
  independent.pages[0].sections.at(-1).designGraph.nodes[1].children[0].text='Только главная';
  session=D.replaceSite(session,manifests,independent,session.revision);
  assert.equal(session.current.pages[1].sections.at(-1).designGraph.nodes[1].children[0].text,
    'Одна секция на нескольких страницах');
  session=D.structure(session,manifests,{action:'duplicateSection',pageId:'page-home',
    sectionId:'section-common-core',id:'section-independent-copy',expectedRevision:session.revision});
  assert.equal(session.current.pages[0].sections.at(-1).sharedKey,undefined,
    'Normal copy must be independent, not silently linked');
});

test('editable icon catalog stays first-party, bounded, semantic and PHP-compatible',()=>{
  const G=require('../sdk/design-graph.cjs'),site=same(initial);
  const section=sdk.sectionFrom(manifests.find(m=>m.id==='custom-section'),'section-icon-catalog');
  section.designGraph={version:1,id:'graph-icon-catalog',nodes:[
    {id:'icon-location',type:'icon',icon:'map-pin',iconSize:48,iconWeight:'bold',
      alt:'Адрес компании',styles:{color:'@accent'}},
    {id:'icon-decorative',type:'icon',icon:'shopping-cart',iconSize:20,
      iconWeight:'thin',styles:{}}
  ]};
  site.pages[0].sections.push(section);
  sdk.validateSite(site,manifests);
  const html=G.render(site,section.designGraph);
  assert.match(html,/width="48" height="48" fill="none" stroke="currentColor" stroke-width="3"/);
  assert.match(html,/role="img" aria-label="Адрес компании"/);
  assert.match(html,/width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.25"/);
  assert.match(html,/aria-hidden="true"/);
  const icon=section.designGraph.nodes[0];
  icon.iconSize=200;refuses(()=>sdk.validateSite(site,manifests));icon.iconSize=48;
  icon.icon='arbitrary-svg';refuses(()=>sdk.validateSite(site,manifests));icon.icon='map-pin';
  icon.iconWeight='url(data:)';refuses(()=>sdk.validateSite(site,manifests));icon.iconWeight='bold';
  sdk.validateSite(site,manifests);
});

test('individual image figure captions retain accessible links and reject unsafe content',()=>{
  const G=require('../sdk/design-graph.cjs'),site=same(initial);
  site.assets.push({id:'photo-figure-ci',src:'/assets/photo-figure-ci.png',alt:'Floor plan',mime:'image/png'});
  const section=sdk.sectionFrom(reg.get('custom-section'),'section-figure-ci');
  const image={id:'figure-photo-ci',type:'image',assetId:'photo-figure-ci',alt:'Floor plan',
    href:'/contact/',caption:'Caption <safe> & clear',styles:{}};
  section.designGraph={version:1,id:'figure-graph-ci',nodes:[image]};
  site.pages[0].sections.push(section);
  sdk.validateSite(site,manifests);
  const html=G.render(site,section.designGraph);
  assert.match(html,/<figure class="cmsdg-image-figure">/);
  assert.match(html,/<figcaption>Caption &lt;safe&gt; &amp; clear<\/figcaption>/);
  assert.match(html,/href="\/contact\/"/);
  assert.doesNotMatch(html,/<safe>/);
  image.caption='<script>\n</script>';refuses(()=>sdk.validateSite(site,manifests));
  image.caption='Caption okay';
  sdk.validateSite(site,manifests);
});

test('grid gallery captions, native lightbox and safe click-actions',()=>{
  const G=require('../sdk/design-graph.cjs'),site=same(initial);
  site.assets.push(
    {id:'asset-photo-alpha',src:'/assets/asset-photo-alpha.png',alt:'Фотография фасада',mime:'image/png'},
    {id:'asset-photo-beta',src:'/assets/asset-photo-beta.png',alt:'Фотография интерьера',mime:'image/png'});
  const section=sdk.sectionFrom(reg.get('custom-section'),'section-gallery-full');
  const gallery={id:'gallery-portfolio',type:'gallery',text:'Реальные проекты <портфолио>',
    layout:'grid',columnsDesktop:4,columnsTablet:2,columnsMobile:1,lightbox:true,photoShape:'square',photoShapeTablet:'landscape',photoShapeMobile:'portrait',
    children:[
      {id:'gallery-photo-alpha',type:'image',assetId:'asset-photo-alpha',alt:'Фасад',caption:'Проект <первый>',styles:{}},
      {id:'gallery-photo-beta',type:'image',assetId:'asset-photo-beta',alt:'Интерьер',caption:'Интерьер & свет',styles:{}}
    ]};
  section.designGraph={version:1,id:'graph-gallery-full',nodes:[gallery]};
  site.pages[0].sections.push(section);sdk.validateSite(site,manifests);
  const html=G.render(site,section.designGraph);
  assert.match(html,/cmsdg-gallery-grid/);
  assert.match(html,/cmsdg-gallery-shape-square/);
  assert.match(html,/cmsdg-gallery-tablet-landscape/);
  assert.match(html,/cmsdg-gallery-mobile-portrait/);
  gallery.photoShapeMobile='url(javascript:alert(1))';refuses(()=>sdk.validateSite(site,manifests));
  gallery.photoShapeMobile='portrait';
  gallery.scrollControls=true;refuses(()=>sdk.validateSite(site,manifests));
  gallery.layout='scroll';delete gallery.columnsDesktop;delete gallery.columnsTablet;delete gallery.columnsMobile;
  sdk.validateSite(site,manifests);
  gallery.visibleDesktop=4;gallery.visibleTablet=2;gallery.visibleMobile=1;
  sdk.validateSite(site,manifests);
  const scrollHtml=G.render(site,section.designGraph);
  assert.match(scrollHtml,/cmsdg-gallery-scroll-nav/);
  assert.match(scrollHtml,/--cmsdg-visible-desktop:4;--cmsdg-visible-tablet:2;--cmsdg-visible-mobile:1/);
  gallery.visibleMobile=3;refuses(()=>sdk.validateSite(site,manifests));gallery.visibleMobile=1;
  assert.match(scrollHtml,/href="#cmsdg-photo-gallery-photo-beta"/);
  gallery.scrollControls='yes';refuses(()=>sdk.validateSite(site,manifests));
  gallery.scrollControls=false;gallery.layout='grid';
  delete gallery.visibleDesktop;delete gallery.visibleTablet;delete gallery.visibleMobile;
  gallery.columnsDesktop=4;gallery.columnsTablet=2;gallery.columnsMobile=1;
  gallery.photoShape='javascript:bad';refuses(()=>sdk.validateSite(site,manifests));
  gallery.photoShape='square';
  assert.match(html,/--cmsdg-gallery-columns:4;--cmsdg-gallery-tablet:2;--cmsdg-gallery-mobile:1/);
  assert.match(html,/popovertarget="cmsdg-lightbox-gallery-photo-alpha"/);
  assert.match(html,/role="dialog" aria-label="Фасад"/);
  assert.match(html,/aria-label="Следующая фотография"/);
  assert.match(html,/popovertarget="cmsdg-lightbox-gallery-photo-beta"/);
  assert.match(html,/<figcaption>Проект &lt;первый&gt;<\/figcaption>/);
  assert.doesNotMatch(html,/<первый>/);
  const english=same(site);english.language='en';
  const enHtml=G.render(english,english.pages[0].sections.at(-1).designGraph);
  assert.match(enHtml,/aria-label="Next photo"/);
  assert.match(enHtml,/aria-label="Close photo"/);
  gallery.styles={position:'sticky',top:12};
  sdk.validateSite(site,manifests);
  assert.match(G.render(site,section.designGraph),/position:sticky;top:12px/);
  const linked=same(site);
  linked.pages[0].sections.at(-1).designGraph.nodes[0].children[0].href='/';
  refuses(()=>sdk.validateSite(linked,manifests),'Linked gallery images cannot also open lightbox');
  const bad=same(site);
  bad.pages[0].sections.at(-1).designGraph.nodes[0].columnsDesktop=20;
  refuses(()=>sdk.validateSite(bad,manifests),'Gallery columns are bounded');
  const unsafe=same(site);
  unsafe.pages[0].sections.at(-1).designGraph.nodes[0].children[1].caption='<script>\n</script>';
  refuses(()=>sdk.validateSite(unsafe,manifests),'Gallery caption rejects controls');
  gallery.lightbox=false;gallery.layout='scroll';
  delete gallery.columnsDesktop;delete gallery.columnsTablet;delete gallery.columnsMobile;
  sdk.validateSite(site,manifests);
  assert.match(G.render(site,section.designGraph),/cmsdg-gallery-item/);
});

test('135 mandatory requirements keep evidence and honest owner acceptance',()=>{
  const ledger=read('mandatory-coverage.json');
  assert.equal(ledger.totalRequired,135);
  assert.equal(ledger.requirements.length,135);
  assert.equal(new Set(ledger.requirements.map(x=>x.id)).size,135);
  assert.equal(ledger.requirements.filter(x=>x.ownerAccepted).length,0);
  for(const item of ledger.requirements){
    assert.ok(['implemented_candidate','partial','not_implemented','owner_environment_gate'].includes(item.engineeringStatus));
    for(const file of item.evidence)assert.ok(fs.existsSync(path.resolve(root,'..',file)),file);
  }
});

console.log('STAGE3 CONTRACT OFFLINE E2E PASS: '+checks+
  ' grouped flows; stable IDs, typed/filtered controls, responsive, asset binding,'+
  ' original design defaults, no-design brief, no-silent-overwrite and CLI. NO deploy.');

require('./recipes-smoke.cjs');
require('./design-graph-interop-smoke.cjs');
