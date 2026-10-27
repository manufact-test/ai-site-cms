#!/usr/bin/env node
'use strict';
// D5 contract + optional real Chromium walkthrough. Node stdlib only.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const {openBrowser}=require('../lib/chromium-pipe.cjs');
const vm=require('node:vm');
const cp=require('node:child_process');
const sdk=require('../../sdk/contract.cjs');
const root=path.resolve(__dirname,'..');
const studio=path.join(root,'studio');
const read=name=>fs.readFileSync(path.join(studio,name),'utf8');
const bundle=read('runtime.generated.js'),app=read('studio.js'),markup=read('index.html'),css=read('studio.css');
const zipSource=read('preview-zip.js'),previewZip=require(path.join(studio,'preview-zip.js'));
const feedbackSource=read('client-feedback.js'),feedback=require(path.join(studio,'client-feedback.js'));
const auditSource=read('site-audit.js'),audit=require(path.join(studio,'site-audit.js'));
const deliverySource=read('delivery-package.js'),delivery=require(path.join(studio,'delivery-package.js'));
const restoreSource=read('delivery-import.js'),restore=require(path.join(studio,'delivery-import.js'));
const sectionEditorSource=read('section-editor.js');
const pageSettingsSource=read('page-settings.js');

const build=cp.spawnSync(process.execPath,[path.join(root,'bin/build-browser-bundle.cjs'),'--check'],{encoding:'utf8'});
assert.equal(build.status,0,'Browser bundle must match actual local CMS source: '+build.stderr);
// Regression: the bundle writer must not follow a generated-file symlink out of
// its owned subtree, and must not mutate an external file through a hard link.
{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'df-bundle-output-guard-'));
 const fixtureRoot=path.join(temp,'repo');
 const fixtureDf=path.join(fixtureRoot,'stage3/design-factory');
 const fixtureFiles=[
  'bin/build-browser-bundle.cjs','lib/compiler.cjs','lib/preview.cjs',
  'catalog/themes.cjs','catalog/kits.cjs','catalog/compositions.cjs',
  'lib/composition-adapter.cjs','lib/section-edits.cjs','lib/page-settings.cjs','lib/section-plan.cjs','lib/bridge.cjs'
 ];
 const manifestIds=['company-hero','contact-panel','cta-banner','faq-accordion',
  'feature-highlights','service-grid','media-story','photo-gallery'];
 const sentinel=path.join(temp,'outside-sentinel.js');
 const target=path.join(fixtureDf,'studio/runtime.generated.js');
 const sentinelText='EXTERNAL_SENTINEL_MUST_REMAIN_UNCHANGED';
 try{
  for(const relative of fixtureFiles){
   const from=path.join(root,relative),to=path.join(fixtureDf,relative);
   fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);
  }
  const sdkTo=path.join(fixtureRoot,'stage3/sdk/contract.cjs');
  fs.mkdirSync(path.dirname(sdkTo),{recursive:true});
  fs.copyFileSync(path.resolve(root,'../sdk/contract.cjs'),sdkTo);
  const manifestsTo=path.join(fixtureRoot,'stage3/components');
  fs.mkdirSync(manifestsTo,{recursive:true});
  for(const id of manifestIds)
   fs.copyFileSync(path.resolve(root,'../components/'+id+'.json'),path.join(manifestsTo,id+'.json'));
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(sentinel,sentinelText);
  let symlinkSupported=true;
  try{fs.symlinkSync(sentinel,target,'file');}
  catch(error){
   if(['EPERM','EACCES','ENOTSUP','EINVAL'].includes(error.code))symlinkSupported=false;
   else throw error;
  }
  const builderPath=path.join(fixtureDf,'bin/build-browser-bundle.cjs');
  if(symlinkSupported){
   for(const args of [[],['--check']]){
    const result=cp.spawnSync(process.execPath,[builderPath,...args],{encoding:'utf8',timeout:10000});
    assert.notEqual(result.status,0,'Bundle builder must refuse a symlinked output target: '+args.join(' '));
    assert.equal(fs.readFileSync(sentinel,'utf8'),sentinelText);
   }
   fs.unlinkSync(target);
  }
  // A missing generated file is a valid build target and must be created.
  const missingTargetBuild=cp.spawnSync(process.execPath,[builderPath],{encoding:'utf8',timeout:10000});
  assert.equal(missingTargetBuild.status,0,'Bundle builder must create a missing regular target: '+missingTargetBuild.stderr);
  assert.ok(fs.readFileSync(target,'utf8').startsWith('/* Design Factory D5 first-party browser bundle.'));
  assert.equal(fs.statSync(target).mode&0o777,0o644,'Generated browser bundle must remain readable by a static file server');
  assert.equal(fs.readFileSync(sentinel,'utf8'),sentinelText);
  fs.unlinkSync(target);
  let hardlinkSupported=true;
  try{fs.linkSync(sentinel,target);}
  catch(error){
   if(['EPERM','EACCES','ENOTSUP','EINVAL','EMLINK'].includes(error.code))hardlinkSupported=false;
   else throw error;
  }
  if(hardlinkSupported){
   const result=cp.spawnSync(process.execPath,[builderPath],{encoding:'utf8',timeout:10000});
   assert.equal(result.status,0,'Bundle builder must safely replace a hard-linked target: '+result.stderr);
   assert.equal(fs.readFileSync(sentinel,'utf8'),sentinelText,
    'Atomic replacement must not mutate an external hard-link target');
   assert.ok(fs.readFileSync(target,'utf8').startsWith('/* Design Factory D5 first-party browser bundle.'));
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
new Function(app);
new Function(zipSource);
new Function(feedbackSource);
new Function(auditSource);
new Function(deliverySource);
new Function(restoreSource);
new Function(sectionEditorSource);
new Function(pageSettingsSource);
assert.ok(markup.indexOf('page-settings.js')<markup.indexOf('studio.js'));
for(const id of ['page-meta-title','page-meta-seoTitle','page-meta-seoDescription','page-meta-navigationLabel','page-meta-save','page-meta-reset','page-meta-snippet-title'])
 assert.ok(markup.includes('id="'+id+'"'),'Page SEO editor missing: '+id);
assert.ok(markup.indexOf('section-editor.js')<markup.indexOf('studio.js'));
for(const id of ['section-list','section-template','section-add','section-reset','section-page-name'])
 assert.ok(markup.includes('id="'+id+'"'),'Missing section editor: '+id);
assert.ok(markup.indexOf('site-audit.js')<markup.indexOf('studio.js'));
assert.ok(markup.indexOf('delivery-package.js')<markup.indexOf('studio.js'));
assert.ok(markup.indexOf('delivery-import.js')<markup.indexOf('studio.js'));
for(const id of ['delivery-file','delivery-restore-apply','delivery-restore-status'])
 assert.ok(markup.includes('id="'+id+'"'),'Missing two-step ZIP restore UI '+id);
assert.ok(markup.indexOf('client-feedback.js')<markup.indexOf('studio.js'),'Feedback bridge must load first');
assert.ok(markup.indexOf('preview-zip.js')<markup.indexOf('studio.js'),
 'Preview ZIP script must load before Studio');
assert.ok(markup.includes('id="save-preview-zip"'));
assert.ok(markup.includes('id="save-delivery-zip"'));
assert.ok(app.includes('function saveDeliveryZip()')&&
 app.includes('deliveryTool.build({engine,zip:packer,feedbackTool,auditTool,'));
assert.equal(previewZip.deliveryFiles.length,18);
const strictDeliveryFiles=previewZip.deliveryFiles.map(name=>({name,content:'fixture '+name}));
const strictDeliveryBytes=previewZip.buildDelivery(strictDeliveryFiles);
assert.equal(previewZip.inspectDelivery(strictDeliveryBytes).files,18);
assert.throws(()=>previewZip.inspect(strictDeliveryBytes),/Invalid ZIP end directory/);
assert.throws(()=>previewZip.buildDelivery(strictDeliveryFiles.slice(1)),/ZIP file count/);
const tamperDelivery=strictDeliveryBytes.slice();tamperDelivery[51]^=1;
assert.throws(()=>previewZip.inspectDelivery(tamperDelivery),/CRC mismatch|ZIP local\/central mismatch/);
for(const id of ['site-audit-summary','site-audit-pages','site-audit-html','site-audit-json'])
 assert.ok(markup.includes('id="'+id+'"'));
assert.ok(app.includes('function currentAudit()')&&app.includes('function renderSiteAudit(compiled)')&&
 app.includes('function saveSiteAudit(asHtml)')&&app.includes('const report=currentAudit()'),
 'Owner report must compile live project at download time');
for(const name of ['feedback-file','feedback-list','feedback-export','feedback-summary'])
 assert.ok(markup.includes('id="'+name+'"'),'Missing feedback UI '+name);
assert.ok(app.includes('feedbackTool.validate(incoming,fresh)')&&
 app.includes('request!==state.feedbackImportSerial'),
 'Feedback validation must use fresh compiled context and newest selection');
assert.ok(app.includes('feedbackTool.context(compileCurrent(),state.project,state.composition)'),
 'Feedback actions must compile the live project, not trust the debounced preview snapshot');
assert.ok(app.includes('feedbackTool.reviewHtml(reviewContext,state.project.language)'));
assert.ok(app.includes('function savePreviewZip()'));
assert.ok(app.includes('function moveService(index,delta)')&&
 app.includes('function duplicateService(index)')&&
 app.includes('function parseBulkServices(input,language)')&&
 app.includes('function addBulkServices()')&&
 app.includes('function editFullServices()')&&
 app.includes('function replaceFullServices()')&&
 app.includes('function downloadServiceList()'));
assert.ok(css.includes('.service-editor-actions')&&css.includes('.bulk-services'));
assert.ok(app.includes("title:prefix+list[index].title.slice(0,120-prefix.length)"));
assert.ok(app.includes('packer.build(files),verification=packer.inspect(bytes)'));
assert.ok(!/@import|fetch\s*\(|XMLHttpRequest|https?:\/\//i.test(zipSource),
 'Preview ZIP packer must remain offline');

assert.ok(markup.includes('runtime.generated.js')&&markup.includes('studio.js'));
assert.ok(!/@import|url\(\s*["']?https?:\/\//i.test(css));
assert.ok(css.includes('prefers-reduced-motion')&&css.includes('max-width:730px'));
for(const minTarget of ['.device-button{min-height:44px','.page-list button{min-height:44px',
 '.icon-button{height:44px','.service-action{height:44px'])assert.ok(css.includes(minTarget),minTarget);
for(const id of ['kit-list','theme-list','site-preview','page-list','title','headline','description',
 'services-list','bulk-services-input','bulk-services-add','replace-services-list','edit-services-as-list','download-services-text','composition','undo','redo','save-project','save-site','save-workspace','project-file','checklist','owner-review-confirmed'])
 assert.ok(markup.includes('id="'+id+'"'),'UI control '+id);
assert.ok(markup.includes('sandbox="allow-scripts"'));
assert.ok(markup.includes('id="owner-review-help"')&&app.includes('robots=noindex'));
assert.ok(css.includes('.review-gate')&&css.includes('.review-gate input:disabled'));
assert.ok(app.includes('state.project.ownerReviewConfirmed=false'),'Any content edit must revoke owner review');
assert.ok(app.includes('preserveReview:true'),'Review attestation must be explicit and preserved only by the control or a validated import');
assert.ok(app.includes('throwOnError:true,preserveReview:true'),'Validated project imports must preserve their stored review attestation');
assert.ok(app.includes('function updateWorkbenchSubtitle()'));
assert.ok(app.includes('target.focus({preventScroll:true})'));
assert.ok(app.includes('if(!before)before=snapshot()'),'Editor history must capture a pre-edit snapshot before mutation');
assert.ok(app.includes('function apply(mutator,options={})'));
assert.ok(app.includes('{throwOnError:true,preserveReview:true}')&&
 app.includes('request!==state.projectImportSerial'),
 'Validated project imports must reject stale selections and failed state application');
assert.ok(app.includes('clearTimeout(refreshTimer)')&&app.includes('PREVIEW_DEBOUNCE_MS=120'),
 'Live preview should debounce full iframe recompilation while text is being edited');
assert.ok(!markup.includes('allow-same-origin'));

 // D7 product workflow: alternate live theme, same owner facts, full four-page mobile board.
 for(const id of ['compare-toggle','overview-toggle','compare-theme','compare-adopt','compare-shell',
  'compare-preview','preview-layout','page-overview','page-overview-note'])
  assert.ok(markup.includes('id="'+id+'"'),'D7 workbench control '+id);
 assert.ok(markup.includes('id="compare-preview" sandbox="allow-scripts"'));
 assert.ok(app.includes('function compileForTheme(theme)'));
assert.ok(bundle.includes("home.splice(cta<0?home.length:cta,0,"),
 'Bundled D6 section-plan bridge must insert composition before the existing CTA');
assert.ok(bundle.includes("['company-hero','cta-banner'].includes(s.component)&&!used.has(s.id)")&&
 app.includes('engine.bridge.workspace(workspace())'),
 'Studio section-plan bridge must protect the original hero/CTA and validate edits');
assert.ok(app.includes('state.project.ownerReviewConfirmed=false;\n state.editRevision++;'),
 'Undo/Redo must not implicitly restore a previous owner approval');
 assert.ok(app.includes('const project=theme===state.project.theme?state.project:{...clone(state.project),theme}'));
 assert.ok(app.includes("if(state.viewMode==='overview')renderOverview(result)"));
 assert.ok(app.includes("if(state.viewMode==='compare')"));
 assert.ok(app.includes('state.overviewFrames.push(frame)'));
 assert.ok(app.includes("state.viewMode=state.viewMode==='compare'?'single':'compare'"));
 assert.ok(app.includes("state.viewMode=state.viewMode==='overview'?'single':'overview'"));
 assert.ok(css.includes('.preview-layout[data-compare=true]')&&css.includes('.page-overview'));
 assert.ok(app.includes("if(state.viewMode!=='compare'||selected===original)return"));
 assert.ok(app.includes("if(apply(()=>{state.project.theme=selected;}))"),'Adopting the compared theme must enter Undo/Redo history');
 assert.ok(app.includes('state.compareTheme=original'),'Previous theme must become the comparison baseline after adoption');
 assert.ok(css.includes('#compare-adopt{min-height:44px}'));
 assert.ok(css.includes('body[data-review-mode=compare] .layout')&&css.includes('body[data-review-mode=overview] .sidebar'));
 assert.ok(app.includes('const trusted=['),'Navigation accepts only current owned iframe sources');

const ctx={structuredClone:global.structuredClone,console};
ctx.globalThis=ctx;
vm.runInNewContext(bundle,ctx,{timeout:10000});
const api=ctx.DesignFactory;
assert.ok(api&&api.compiler&&api.sdk&&api.preview&&api.compositions);
assert.equal(Object.keys(api.kits).length,12);
assert.equal(Object.keys(api.themes).length,12);
assert.equal(api.compositions.compositions.length,42);
const approvedDraft=api.compiler.compile({format:api.compiler.FORMAT,version:2,
 kit:'agency',theme:'editorial',language:'en',facts:{
  title:'Verified owner',headline:'Verified headline',description:'Verified description',
  contactText:'Verified contact details',services:[
   {title:'Service one',description:'Owner confirmed service one'},
   {title:'Service two',description:'Owner confirmed service two'}
  ]},ownerReviewConfirmed:true});
assert.equal(approvedDraft.checklist.readyForPublish,true);
const auditProject={kit:'agency',theme:'editorial',language:'en',facts:{
 title:'Company & <b>Test</b>',headline:'Owner verified',description:'Confirmed description',
 contactText:'Owner@company.test',services:[{title:'Design',description:'Owner confirmed service'}]
 },ownerReviewConfirmed:false};
const auditDoc=audit.build(approvedDraft,auditProject,null);
assert.equal(auditDoc.format,audit.FORMAT);
assert.equal(auditDoc.pages.length,4);
assert.ok(Array.isArray(auditDoc.links)&&auditDoc.links.length>=8,
 'Audit must report actual CMS CTA and service item href values');
assert.ok(auditDoc.links.some(link=>link.page==='/'&&link.component==='company-hero'&&
 link.href==='/contact/'));
assert.ok(audit.html(auditDoc).includes('Actual CTA and card destinations'),
 'Owner handoff must display CMS destinations for manual review');
assert.ok(auditDoc.pages.every(p=>p.sections.length>0&&p.seoTitle));
const auditHtml=audit.html(auditDoc);
assert.ok(auditHtml.includes('&lt;b&gt;Test&lt;/b&gt;')&&!auditHtml.includes('<b>Test</b>'));
assert.ok(auditHtml.includes('<html lang="en">'));
assert.ok(!/<script\b/i.test(auditHtml));
assert.throws(()=>audit.html({format:'unknown'}),/Invalid site audit report/);
assert.ok(approvedDraft.site.pages.every(page=>page.seo.robots==='index'));

 // ZIP recovery is a product workflow, not a replacement for release acceptance.
 const oldWorkspace={format:api.bridge.WORKSPACE,version:1,
  project:api.compiler.migrate(null),composition:null};
 const baseZip=api.bridge.build(oldWorkspace);
 const ownerSettings=api.pageSettings.capture(baseZip.site);
 ownerSettings.pages.home.seoTitle='Restored SEO metadata';
 const sectionOrder=api.sectionPlan.capture(baseZip.site,null);
 sectionOrder.pages.contact.splice(1,0,{id:api.sectionPlan.nextId(sectionOrder,'contact'),
  composition:'faq-minimal'});
 const zipWorkspace={...oldWorkspace,version:3,sectionPlan:sectionOrder,pageSettings:ownerSettings};
 const zipBundle=api.bridge.build(zipWorkspace);
 const zipCompiled={site:zipBundle.site,checklist:zipBundle.ownerChecklist,
  inspection:zipBundle.inspection,designSpec:zipBundle.designSpec,bridge:zipBundle.compatibility.composition};
 const handoff=delivery.build({engine:api,zip:previewZip,feedbackTool:feedback,
  auditTool:audit,project:oldWorkspace.project,workspace:zipWorkspace,
  compiled:zipCompiled,feedback:null});
 const unwrapped=restore.restore({bytes:handoff.bytes,engine:api,zip:previewZip,
  feedbackTool:feedback});
 assert.equal(unwrapped.workspace.version,3);
 assert.equal(unwrapped.workspace.pageSettings.pages.home.seoTitle,'Restored SEO metadata');
 assert.equal(unwrapped.workspace.sectionPlan.pages.contact.length,sectionOrder.pages.contact.length);
 assert.equal(unwrapped.workspace.project.ownerReviewConfirmed,false);
 assert.equal(unwrapped.restoredIndexing,'noindex');
 const badBytes=handoff.bytes.slice();badBytes[53]^=1;
 assert.throws(()=>restore.restore({bytes:badBytes,engine:api,zip:previewZip,
  feedbackTool:feedback}),/CRC|local\/central|filename/i);
 const rezip=(name,mutate)=>{
  const files=previewZip.extractDelivery(handoff.bytes).files;
  const entries=previewZip.deliveryFiles.map(path=>({name:path,content:files[path]}));
  const entry=entries.find(row=>row.name===name);
  entry.content=mutate(entry.content);
  const m=entries.find(row=>row.name==='manifest.json');
  const j=JSON.parse(m.content);
  j.files.forEach(row=>row.crc32=previewZip.crcText(entries.find(x=>x.name===row.path).content)
   .toString(16).padStart(8,'0'));
  m.content=JSON.stringify(j)+'\n';
  return previewZip.buildDelivery(entries);
 };
 for(const [name,mutate] of [
  ['cms/site-v1.json',text=>JSON.stringify({...JSON.parse(text),title:'Forged CMS'})],
  ['preview/index.html',text=>text.replace('</head>','<script>forged</script></head>')],
  ['design/project.json',text=>JSON.stringify({...JSON.parse(text),theme:'technical'})]
 ]){
  const altered=rezip(name,mutate);
  assert.throws(()=>restore.restore({bytes:altered,engine:api,zip:previewZip,
   feedbackTool:feedback}),/DELIVERY_IMPORT/);
 }

// Real Node preview ZIP contents: same first-party HTML/CSS as the CMS-validated Studio source.
const routeFiles={home:'index.html',services:'services/index.html',
 approach:'approach/index.html',contact:'contact/index.html'};
const previewEntries=approvedDraft.site.pages.map(page=>({
 name:routeFiles[page.id.slice('df-page-'.length)],
 content:api.preview.pageHtml(approvedDraft.site,page,'editorial','en')
}));
assert.equal(previewEntries.length,4);
for(const file of previewEntries){
 assert.ok(file.name&&file.content.includes('<meta name="robots" content="noindex">'));
}
previewEntries.push({name:'assets/preview.css',content:api.preview.css('editorial')},
 {name:'README.txt',content:'Static preview only. Not a production CMS release.'},
 {name:'preview-info.json',content:JSON.stringify({format:'manufact-design-factory-static-preview-v1'})},
 {name:'review.html',content:feedback.reviewHtml(feedback.context(approvedDraft,approvedDraft.project||{kit:'agency',theme:'editorial',language:'en'},null))});

const feedbackToken=feedback.context(approvedDraft,approvedDraft.project||{
 kit:'agency',theme:'editorial',language:'en'
},null);
assert.match(feedbackToken,/^df-[0-9a-f]{8}$/);
const reviewPage=feedback.reviewHtml(feedbackToken);
const englishReview=feedback.reviewHtml(feedbackToken,'en');
assert.ok(englishReview.includes('editing=null')&&
 englishReview.includes("editing!==null")&&
 englishReview.includes("n.resolved?' · '")&&
 englishReview.includes('Save or cancel the open edit first.'));
assert.ok(englishReview.includes('feedback-note-editor')&&
 englishReview.includes('Note updated.')&&englishReview.includes('Remove note'));
assert.ok(englishReview.includes('note.message')&&englishReview.includes('notesRevision++'));
assert.ok(englishReview.includes('notes[index]={page:page.value,type:type.value,message:value,resolved:false}'),
 'Edited customer note must be reopened for owner/developer action');
assert.ok(englishReview.includes('<html lang="en">')&&
 englishReview.includes('Feedback on the preview')&&englishReview.includes('Your feedback')&&
 englishReview.includes('>Services</a>'));
assert.ok(englishReview.includes(JSON.stringify(feedbackToken)+',"en"'));
assert.throws(()=>feedback.reviewHtml(feedbackToken,'de'),/Unsupported feedback language/);
assert.ok(app.includes('feedbackTool.reviewHtml(reviewContext,state.project.language)'));
assert.ok(reviewPage.includes('id="feedback-add"')&&reviewPage.includes('id="feedback-download"'));
assert.ok(reviewPage.includes('href="contact/index.html"'));
assert.ok(reviewPage.includes('script-src &apos;unsafe-inline&apos;'));
const portalScript=reviewPage.match(/<script>([\s\S]+?)<\/script>/)?.[1];
assert.ok(portalScript&&portalScript.includes('feedback-add')&&
 portalScript.includes('request!==importSerial||revision!==notesRevision'),
 'Client portal must refuse async stale draft restores');
new Function(portalScript); // Client script is parseable as standalone browser source.
const customerNote=feedback.create(feedbackToken,'Reviewer',[
 {page:'services',type:'issue',message:'Navigation label overlaps the mobile header',resolved:false}
]);
assert.equal(feedback.validate(customerNote,feedbackToken).notes.length,1);
assert.throws(()=>feedback.validate(customerNote,'df-00000000'),/different site snapshot/);
const changedClientSite=JSON.parse(JSON.stringify(approvedDraft));
changedClientSite.site.pages[0].seo.title+=' revised';
assert.notEqual(feedback.context(changedClientSite,changedClientSite.project||{
 kit:'agency',theme:'editorial',language:'en'
},null),feedbackToken,'Customer feedback must follow actual content snapshot');
assert.throws(()=>feedback.validate({...customerNote,notes:[{
 ...customerNote.notes[0],message:''
}]},feedbackToken),/Invalid feedback note/);
assert.throws(()=>feedback.validate({...customerNote,notes:customerNote.notes.map(x=>({
 ...x,page:'http://external/'
}))},feedbackToken),/Invalid feedback note/);
assert.throws(()=>feedback.validate({...customerNote,notes:Array(31).fill(customerNote.notes[0])},feedbackToken),
 /Too many/);
assert.throws(()=>feedback.validate({...customerNote,
 ownerApproved:true},feedbackToken),/Unexpected feedback fields/);
const resolvedNote={...customerNote,notes:customerNote.notes.map(x=>({...x,resolved:true}))};
assert.equal(feedback.validate(resolvedNote,feedbackToken).notes[0].resolved,true);

const actualPreviewZip=previewZip.build(previewEntries);
assert.deepEqual(previewZip.build(previewEntries),actualPreviewZip,
 'Browser ZIP bytes must be deterministic for identical inputs');
const inspectedPreviewZip=previewZip.inspect(actualPreviewZip);
assert.equal(inspectedPreviewZip.files,8);
assert.equal(inspectedPreviewZip.crcVerified,true);
assert.equal(actualPreviewZip.readUInt32LE?.(0)??new DataView(actualPreviewZip.buffer).getUint32(0,true),0x04034b50);
const corruptPreview=new Uint8Array(actualPreviewZip);
corruptPreview[40]^=0x1;
assert.throws(()=>previewZip.inspect(corruptPreview),/CRC mismatch/);
assert.throws(()=>previewZip.build(previewEntries.slice(1)),/Unexpected ZIP file count/);
assert.throws(()=>previewZip.build([...previewEntries.slice(0,-1),
 {name:'../escape.html',content:'evil'}]),/Unexpected or duplicate/);
assert.throws(()=>previewZip.build(previewEntries.map(x=>x.name==='README.txt'
 ?{...x,content:'x'.repeat(2*1024*1024+1)}:x)),/too large/);

const templateFacts={title:'Verified title',headline:'Owner headline',description:'Owner description',
 contactText:'Verified contact information'};
const sampleServices=[
 {title:'Уточните название',description:'Добавьте подтверждённое описание.'},
 {title:'Example (verify): service',description:'Add verified description.'}
];
const draftReadiness=api.compiler.compile({format:api.compiler.FORMAT,version:1,
 kit:'agency',theme:'editorial',language:'en',facts:{...templateFacts,services:sampleServices}});
assert.ok(draftReadiness.checklist.missing.includes('facts.services'));
assert.equal(draftReadiness.checklist.readyForPublish,false);
assert.equal(draftReadiness.checklist.requiresOwnerReview,true);
assert.ok(api.preview.css('editorial').includes('nav a{display:inline-flex;align-items:center;min-height:44px'));
assert.ok(api.preview.css('editorial').includes('.faqs summary{display:flex;align-items:center;min-height:44px'));
const reg=require('../lib/compiler.cjs').loadRegistry();
let count=0;
for(const kit of Object.keys(api.kits))for(const theme of Object.keys(api.themes))for(const language of ['ru','en']){
 const result=api.compiler.compile({format:api.compiler.FORMAT,version:1,kit,theme,language,facts:{}});
 const normal=JSON.parse(JSON.stringify(result.site));
 assert.ok(normal.pages.every(page=>page.seo.robots==='noindex'));
 assert.equal(result.checklist.readyForPublish,false);
 sdk.validateSite(normal,reg);
 assert.equal(normal.pages.length,4);
 assert.equal(sdk.inspectSite(normal,reg).errors.length,0);
 count++;
}
const sample=api.compiler.compile({format:api.compiler.FORMAT,version:1,kit:'agency',theme:'minimal',language:'en',
 facts:{title:'Client & Craft',headline:'<script>alert(1)</script>',description:'Verified description'}});
const doc=JSON.parse(JSON.stringify(sample.site));
doc.pages[0].sections[doc.pages[0].sections.length-1]=
 api.adapter.sectionFor('gallery-mosaic','df-selected-composition','en',api.compiler.loadRegistry());
sdk.validateSite(doc,reg);
const html=api.preview.pageHtml(doc,doc.pages[0],'minimal','en');
assert.ok(html.includes('&lt;script&gt;')&&!html.includes('<script>alert(1)</script>'));
assert.ok(html.includes('photo-gallery-preview'));
assert.ok(!/<iframe\b/i.test(html));
console.log('DESIGN_FACTORY_D5_NODE PASS: '+count+' browser bundle/real CMS parity, 42 compositions, safe preview escaping, bundle reproducibility');
// Optional: Chromium is invoked only when explicitly selected by the reviewer.
const bin=process.env.DF_CHROMIUM_BIN;
if(!bin){console.log('DESIGN_FACTORY_D5_CHROMIUM SKIP: set DF_CHROMIUM_BIN=/usr/bin/chromium to run browser E2E');process.exit(0);}
(async()=>{
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'df-studio-chromium-'));
let browser=null;
try{
 const fixture=path.join(temp,'studio');fs.cpSync(studio,fixture,{recursive:true});
 let page=fs.readFileSync(path.join(fixture,'index.html'),'utf8');
 const probe=[
 '<script>',
 "window.addEventListener('load',function(){",
 "const ready=()=>{const frame=document.getElementById('site-preview');return Boolean(frame.getAttribute('srcdoc'))};",
 "const mark=(result)=>{const el=document.createElement('div');el.id='d5-browser-result';el.textContent=result;document.body.appendChild(el);};",
 "setTimeout(async function(){",
 "try{",
 "if(!ready())throw Error('initial preview missing');",
 "const items=document.querySelectorAll('.kit-item');if(items.length!==12)throw Error('kit selector');",
 "items[3].focus();items[3].click();if(document.querySelectorAll('.kit-item')[3].getAttribute('aria-pressed')!=='true')throw Error('industry selection');",
 "if(document.activeElement.id!==items[3].id)throw Error('kit focus lost after selection');",
 "const themes=document.querySelectorAll('.theme-card');if(themes.length!==12)throw Error('theme selector');",
 "themes[7].focus();themes[7].click();if(document.querySelectorAll('.theme-card')[7].getAttribute('aria-pressed')!=='true')throw Error('theme selection');",
 "if(document.activeElement.id!==themes[7].id)throw Error('theme focus lost after selection');",

 "document.getElementById('compare-toggle').click();",
 "if(document.getElementById('preview-layout').dataset.compare!=='true')throw Error('compare activation');",
 "const compareTheme=document.getElementById('compare-theme');compareTheme.value='technical';compareTheme.dispatchEvent(new Event('change',{bubbles:true}));",
 "if(!document.getElementById('compare-preview').srcdoc.includes('preview'))throw Error('compare preview missing');",
 "if(document.getElementById('preview-shell').dataset.device!=='desktop')throw Error('comparison device');",
 "document.getElementById('compare-adopt').click();",
 "if(document.querySelector('#theme-technical').getAttribute('aria-pressed')!=='true')throw Error('adopting compared theme');",
 "if(document.getElementById('compare-theme').value==='technical')throw Error('previous theme should be comparison baseline');",
 "document.getElementById('undo').click();",
 "if(document.querySelector('#theme-technical').getAttribute('aria-pressed')==='true')throw Error('theme adoption undo');",
 "document.getElementById('redo').click();",
 "if(document.querySelector('#theme-technical').getAttribute('aria-pressed')!=='true')throw Error('theme adoption redo');",
 "document.getElementById('compare-toggle').click();",
 "document.getElementById('overview-toggle').click();",
 "if(document.querySelectorAll('.overview-card iframe').length!==4)throw Error('four-page overview count');",
 "if(!document.getElementById('page-overview').querySelector('iframe').srcdoc.includes('<html'))throw Error('overview HTML missing');",
 "document.querySelector('.overview-card button').click();",
 "if(document.getElementById('page-overview').hidden!==true)throw Error('overview exit');",
 "document.querySelector('[data-device=mobile]').click();",
 "if(document.getElementById('preview-shell').dataset.device!=='mobile')throw Error('mobile view');",
 "const t=document.getElementById('title');t.focus();t.value='Verified Demo Company';",
 "t.dispatchEvent(new Event('input',{bubbles:true}));t.dispatchEvent(new Event('change',{bubbles:true}));",
 "if(document.activeElement!==t)throw Error('text editor lost focus after commit');",
 "await new Promise(resolve=>setTimeout(resolve,160));",
 "if(!document.getElementById('site-preview').srcdoc.includes('Verified Demo Company'))throw Error('debounced preview failed to refresh');",
 "document.getElementById('add-service').click();",
 "const service=document.querySelector('.service-editor input');if(!service)throw Error('service editor missing');",
 "service.focus();service.value='Verified service';",
 "service.dispatchEvent(new Event('input',{bubbles:true}));service.dispatchEvent(new Event('change',{bubbles:true}));",
 "if(document.activeElement!==service)throw Error('service editor lost focus after commit');",
 "const c=document.getElementById('composition');c.value='gallery-mosaic';c.dispatchEvent(new Event('change',{bubbles:true}));",
 "if(document.getElementById('composition').value!=='gallery-mosaic')throw Error('composition selection');",
 "if(!document.getElementById('site-preview').srcdoc.includes('photo-gallery-preview'))throw Error('gallery preview');",
 "if(!document.getElementById('site-preview').srcdoc.includes('class=\"section cta\"'))throw Error('selected composition removed original CTA');",
 "document.getElementById('undo').click();",
 "if(document.getElementById('composition').value==='gallery-mosaic')throw Error('undo failure');",
 "document.getElementById('redo').click();",
 "if(document.getElementById('composition').value!=='gallery-mosaic')throw Error('redo failure');",
 "document.getElementById('page-home').click();",
 "const sectionHero=document.querySelector('#section-list .section-editor-row');if(!sectionHero)throw Error('section editor not mounted');",
 "Array.from(sectionHero.querySelectorAll('button')).find(b=>b.textContent==='✎').click();",
 "const sectionHeadline=document.querySelector('.section-content-panel input');if(!sectionHeadline)throw Error('hero content panel');sectionHeadline.value='Verified section heading';sectionHeadline.dispatchEvent(new Event('input',{bubbles:true}));",
 "Array.from(document.querySelectorAll('.section-content-panel button')).find(b=>b.textContent==='Сохранить секцию').click();",
 "if(!document.getElementById('site-preview').srcdoc.includes('Verified section heading'))throw Error('section content not in HTML preview');",
 "document.getElementById('page-services').click();const chosen=document.getElementById('section-template');chosen.value='faq-minimal';chosen.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('section-add').click();",
 "if(!document.querySelector('#section-list .section-editor-row .section-editor-copy small').textContent)throw Error('new section list missing');",
 "const createdSection=Array.from(document.querySelectorAll('#section-list .section-editor-row')).find(row=>row.querySelector('small')?.textContent.includes('df-added-services-'));if(!createdSection)throw Error('new FAQ section not found');",
 "Array.from(createdSection.querySelectorAll('button')).find(b=>b.textContent==='✎').click();",
 "Array.from(document.querySelectorAll('.section-content-panel button')).find(b=>b.textContent==='+ Добавить карточку').click();",
 "if(document.querySelectorAll('.section-content-panel .section-repeat-row').length!==3)throw Error('FAQ add item');",
 "Array.from(document.querySelectorAll('.section-content-panel button')).find(b=>b.textContent==='Сохранить секцию').click();",
 "if(!document.getElementById('site-preview').srcdoc.includes('faq'))throw Error('FAQ preview missing');",
 "document.getElementById('page-home').click();",
 "const seoField=document.getElementById('page-meta-seoTitle');if(!seoField)throw Error('SEO editor unavailable');",
 "seoField.value='Verified SEO page title';seoField.dispatchEvent(new Event('input',{bubbles:true}));",
 "if(!document.getElementById('page-meta-snippet-title').textContent.includes('Verified SEO'))throw Error('SEO snippet not updated');",
 "if(document.getElementById('site-preview').srcdoc.includes('Verified SEO page title'))throw Error('Unsaved SEO draft leaked');",
 "document.getElementById('page-meta-save').click();",
 "if(!document.getElementById('site-preview').srcdoc.includes('Verified SEO page title'))throw Error('Saved SEO not in preview');",
 "const blobs=[],downloadNames=[];",
 "const originalURL=URL.createObjectURL,originalClick=HTMLAnchorElement.prototype.click;",
 "URL.createObjectURL=function(blob){blobs.push(blob);return originalURL.call(URL,blob)};",
 "HTMLAnchorElement.prototype.click=function(){downloadNames.push(this.download)};",
 "for(const id of ['save-site','save-bundle','save-project','save-workspace','save-preview-zip'])document.getElementById(id).click();",
 "if(blobs.length!==5||downloadNames.length!==5)throw Error('five exports missing');",
 "const site=JSON.parse(await blobs[0].text());",
 "if(site.format!=='manufact-ai-site-v1'||site.pages.length!==4)throw Error('CMS export contract');",
 "if(!site.pages.every(page=>page.seo.robots==='noindex'))throw Error('default CMS export must be protected by noindex');",
 "const savedHome=site.pages[0].sections[0].elements.find(e=>e.slot==='heading');if(savedHome.values['content.text']!=='Verified section heading')throw Error('CMS hero edit missing');if(!site.pages[1].sections.some(s=>s.id.startsWith('df-added-services-')&&s.items?.length===3))throw Error('CMS FAQ repeater missing');",
 "window.DesignFactory.sdk.validateSite(site,window.DesignFactory.compiler.loadRegistry());",
 "const bundle=JSON.parse(await blobs[1].text());window.DesignFactory.bridge.validateBundle(bundle);",
 "if(JSON.stringify(bundle.site)!==JSON.stringify(site))throw Error('CMS and D6 exports diverge');",
 "const project=JSON.parse(await blobs[2].text()),workspace=JSON.parse(await blobs[3].text());",
 "if(project.facts.title!=='Verified Demo Company'||workspace.composition!=='gallery-mosaic')throw Error('exported edits missing');",
 "if(workspace.version!==3||workspace.pageSettings.pages.home.seoTitle!=='Verified SEO page title'||site.pages[0].seo.title!=='Verified SEO page title')throw Error('SEO workspace v3 not exported');",
 "if(!downloadNames[4].endsWith('-html-preview.zip'))throw Error('HTML preview ZIP name');",
 "const previewZip=window.DesignFactoryPreviewZip.inspect(new Uint8Array(await blobs[4].arrayBuffer()));",
 "if(previewZip.files!==8||!previewZip.crcVerified)throw Error('HTML ZIP contents failed CRC');",
  "const storedText=(bytes,name)=>{const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let offset=0;while(offset+30<bytes.length&&view.getUint32(offset,true)===0x04034b50){const method=view.getUint16(offset+8,true),packed=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true),member=new TextDecoder().decode(bytes.subarray(offset+30,offset+30+nameLength)),start=offset+30+nameLength+extraLength;if(member===name){if(method!==0)throw Error('preview review member must use STORE');return new TextDecoder().decode(bytes.subarray(start,start+packed));}offset=start+packed;}throw Error('preview ZIP missing '+name)};",
  "const reviewHtml=storedText(new Uint8Array(await blobs[4].arrayBuffer()),'review.html');",
  "const reviewFrame=document.createElement('iframe');reviewFrame.style.display='none';document.body.appendChild(reviewFrame);",
  "const customerReport=await new Promise((resolve,reject)=>{reviewFrame.onload=async()=>{try{const customerWindow=reviewFrame.contentWindow,customerDoc=reviewFrame.contentDocument;if(!customerDoc.getElementById('feedback-add'))throw Error('review portal DOM missing');let customerBlob=null,customerName='';const originalCreate=customerWindow.URL.createObjectURL.bind(customerWindow.URL);customerWindow.URL.createObjectURL=blob=>{customerBlob=blob;return originalCreate(blob)};customerWindow.HTMLAnchorElement.prototype.click=function(){customerName=this.download};customerDoc.getElementById('feedback-reviewer').value='Browser reviewer';customerDoc.getElementById('feedback-page').value='contact';customerDoc.getElementById('feedback-type').value='issue';customerDoc.getElementById('feedback-note').value='Please adjust the contact CTA';customerDoc.getElementById('feedback-add').click();if(customerDoc.getElementById('feedback-list').children.length!==1)throw Error('client portal did not add feedback');customerDoc.getElementById('feedback-download').click();if(!customerBlob||customerName!=='design-factory-client-feedback.json')throw Error('client feedback JSON download missing');const report=JSON.parse(await customerBlob.text());if(report.notes.length!==1||report.notes[0].page!=='contact'||report.reviewer!=='Browser reviewer')throw Error('client JSON payload mismatch');const restore=new customerWindow.DataTransfer();restore.items.add(new customerWindow.File([JSON.stringify(report)],'saved-feedback.json',{type:'application/json'}));const restoreInput=customerDoc.getElementById('feedback-import');restoreInput.files=restore.files;restoreInput.dispatchEvent(new customerWindow.Event('change',{bubbles:true}));await new Promise(done=>setTimeout(done,50));if(customerDoc.getElementById('feedback-list').children.length!==1)throw Error('client draft restore failed');resolve(report)}catch(error){reject(error)}};reviewFrame.srcdoc=reviewHtml;});",
  "const feedbackInput=document.getElementById('feedback-file'),feedbackTransfer=new DataTransfer();feedbackTransfer.items.add(new File([JSON.stringify(customerReport)],'customer-feedback.json',{type:'application/json'}));feedbackInput.files=feedbackTransfer.files;feedbackInput.dispatchEvent(new Event('change',{bubbles:true}));",
  "await new Promise(resolve=>setTimeout(resolve,100));if(!document.getElementById('feedback-summary').textContent.includes('осталось: 1'))throw Error('Studio feedback import failed');",
  "document.querySelector('.feedback-item').querySelectorAll('button')[0].click();if(!document.getElementById('browser-url').textContent.endsWith('/contact/'))throw Error('feedback page navigation failed');",
  "document.querySelector('.feedback-item').querySelectorAll('button')[1].click();if(!document.getElementById('feedback-summary').textContent.includes('исправлено: 1'))throw Error('feedback resolution failed');",
  "const feedbackBlobIndex=blobs.length,feedbackDownloadIndex=downloadNames.length;document.getElementById('feedback-export').click();if(blobs.length!==feedbackBlobIndex+1||downloadNames.length!==feedbackDownloadIndex+1)throw Error('feedback progress export missing');const feedbackProgress=JSON.parse(await blobs[feedbackBlobIndex].text());if(feedbackProgress.notes.length!==1||feedbackProgress.notes[0].resolved!==true)throw Error('resolved feedback export payload mismatch');reviewFrame.remove();",
 "const setField=(id,value)=>{const field=document.getElementById(id);field.focus();field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));};",
 "let finishFeedbackRead;const feedbackOwn=Object.prototype.hasOwnProperty.call(File.prototype,'text'),feedbackTextOriginal=File.prototype.text;",
 "File.prototype.text=function(){return new Promise(resolve=>{finishFeedbackRead=()=>resolve(JSON.stringify(customerReport))})};",
 "try{",
 "const slowFeedback=new DataTransfer();slowFeedback.items.add(new File([JSON.stringify(customerReport)],'slow-feedback.json',{type:'application/json'}));",
 "feedbackInput.files=slowFeedback.files;feedbackInput.dispatchEvent(new Event('change',{bubbles:true}));",
 "await Promise.resolve();if(typeof finishFeedbackRead!=='function')throw Error('slow feedback read missing');",
 "setField('headline','Owner edit during slow feedback read');finishFeedbackRead();",
 "await new Promise(resolve=>setTimeout(resolve,180));",
 "if(!document.getElementById('message').textContent.includes('Импорт замечаний отклонён'))throw Error('stale feedback import not rejected');",
 "if(!document.getElementById('feedback-summary').textContent.includes('исправлено: 1')||!document.getElementById('feedback-summary').textContent.includes('устарели'))throw Error('late feedback import overwrote resolved note');",
 "}finally{if(feedbackOwn)File.prototype.text=feedbackTextOriginal;else delete File.prototype.text;}",
 "setField('headline','Verified owner headline');setField('description','Verified owner description');setField('contactText','Verified owner contact');",
 "setField('service-0-title','Verified service one');setField('service-0-description','Owner confirmed service one');",
 "document.getElementById('add-service').click();setField('service-1-title','Verified service two');setField('service-1-description','Owner confirmed service two');",
 "document.getElementById('move-service-up-1').click();if(document.getElementById('service-0-title').value!=='Verified service two')throw Error('service reorder');",
 "document.getElementById('undo').click();if(document.getElementById('service-0-title').value!=='Verified service one')throw Error('undo reorder');",
 "document.getElementById('redo').click();if(document.getElementById('service-0-title').value!=='Verified service two')throw Error('redo reorder');",
 "document.getElementById('duplicate-service-0').click();if(document.querySelectorAll('.service-editor').length!==3||!document.getElementById('service-1-title').value.startsWith('Пример (подтвердить):'))throw Error('duplicated service should be a draft');",
 "document.getElementById('undo').click();if(document.querySelectorAll('.service-editor').length!==2)throw Error('undo duplicate');",
 "const batch=document.getElementById('bulk-services-input');batch.value='Batch service | Owner fact\\nDraft only';document.getElementById('bulk-services-add').click();",
 "if(document.querySelectorAll('.service-editor').length!==4||document.getElementById('service-3-description').value!=='Добавьте подтверждённое описание.')throw Error('bulk import draft');",
 "document.getElementById('undo').click();if(document.querySelectorAll('.service-editor').length!==2)throw Error('undo bulk import');",
 "batch.value='X'.repeat(121);document.getElementById('bulk-services-add').click();if(document.querySelectorAll('.service-editor').length!==2||batch.value.length!==121)throw Error('invalid bulk not atomic');",
 "batch.value='';",
 "await new Promise(resolve=>setTimeout(resolve,180));",
 "const gate=document.getElementById('owner-review-confirmed');if(gate.disabled)throw Error('review confirmation should unlock only after required facts are complete');",
 "gate.checked=true;gate.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,180));",
 "document.getElementById('save-site').click();const approvedSite=JSON.parse(await blobs[6].text());if(!approvedSite.pages.every(page=>page.seo.robots==='noindex'))throw Error('approved facts cannot bypass separate section/SEO draft review');",
 "setField('headline','Edited after review');if(gate.checked)throw Error('editing content must revoke owner review');const staleBlobCount=blobs.length,staleDownloadCount=downloadNames.length;document.getElementById('feedback-export').click();if(blobs.length!==staleBlobCount||downloadNames.length!==staleDownloadCount)throw Error('stale feedback must not export during preview debounce');await new Promise(resolve=>setTimeout(resolve,180));if(!document.getElementById('feedback-export').disabled||!document.getElementById('feedback-summary').textContent.includes('устарели'))throw Error('content edits must stale prior client feedback');",
 "document.getElementById('save-site').click();const revokedSite=JSON.parse(await blobs[7].text());if(!revokedSite.pages.every(page=>page.seo.robots==='noindex'))throw Error('editing after review must restore noindex');",
 "let finishProjectRead;const projectOwn=Object.prototype.hasOwnProperty.call(File.prototype,'text'),projectTextOriginal=File.prototype.text;",
 "File.prototype.text=function(){return new Promise(resolve=>{finishProjectRead=()=>resolve(JSON.stringify(project))})};",
 "try{",
 "const slowProject=new DataTransfer();slowProject.items.add(new File([JSON.stringify(project)],'slow-project.json',{type:'application/json'}));",
 "const projectInput=document.getElementById('project-file');projectInput.files=slowProject.files;projectInput.dispatchEvent(new Event('change',{bubbles:true}));",
 "await Promise.resolve();if(typeof finishProjectRead!=='function')throw Error('slow project read missing');",
 "setField('headline','Owner edit during slow project read');finishProjectRead();await new Promise(resolve=>setTimeout(resolve,40));",
 "if(document.getElementById('headline').value!=='Owner edit during slow project read')throw Error('late project import overwrote owner edit');",
 "if(!document.getElementById('message').textContent.includes('Импорт отклонён'))throw Error('stale project import not rejected');",
 "}finally{if(projectOwn)File.prototype.text=projectTextOriginal;else delete File.prototype.text;}",
  "if(blobs.length!==8||downloadNames.length!==8)throw Error('expected eight exports across review workflow');",
 "if(document.querySelectorAll('.site-audit-page').length!==4)throw Error('owner audit four page navigator missing');",
 "document.querySelectorAll('.site-audit-page')[1].click();if(!document.getElementById('browser-url').textContent.endsWith('/services/'))throw Error('audit navigation failed');",
 "document.getElementById('site-audit-json').click();document.getElementById('site-audit-html').click();",
 "if(blobs.length!==10||downloadNames.length!==10)throw Error('owner handoff report exports missing');",
 "const ownerAudit=JSON.parse(await blobs[8].text());if(ownerAudit.format!=='manufact-design-factory-site-audit-v1'||ownerAudit.pages.length!==4)throw Error('owner audit schema');",
 "const ownerHtml=await blobs[9].text();if(!ownerHtml.includes('<html lang=\"ru\">')||!ownerHtml.includes('robots'))throw Error('printable owner HTML missing');",
 "const oldDownloadCount=blobs.length;document.getElementById('save-delivery-zip').click();if(blobs.length!==oldDownloadCount+1||downloadNames.length!==oldDownloadCount+1)throw Error('delivery button failed');",
 "if(!downloadNames[10].endsWith('-delivery.zip'))throw Error('delivery archive name');",
 "const deliveryBytes=new Uint8Array(await blobs[10].arrayBuffer());const deliveryInspect=window.DesignFactoryPreviewZip.inspectDelivery(deliveryBytes);if(deliveryInspect.files!==18||!deliveryInspect.crcVerified)throw Error('delivery CRC failed');",
 "const deliveryManifest=JSON.parse(storedText(deliveryBytes,'manifest.json'));if(deliveryManifest.files.length!==17||deliveryManifest.productionReady!==false||deliveryManifest.feedback!=='stale-excluded')throw Error('delivery stale feedback not marked');",
 "const deliveryCms=JSON.parse(storedText(deliveryBytes,'cms/site-v1.json')),deliveryBridge=JSON.parse(storedText(deliveryBytes,'cms/integration-v2.json'));window.DesignFactory.bridge.validateBundle(deliveryBridge);if(JSON.stringify(deliveryCms)!==JSON.stringify(deliveryBridge.site))throw Error('delivery CMS/D6 mismatch');",
 "const deliverySlot=JSON.parse(storedText(deliveryBytes,'client/feedback.json'));if(deliverySlot.status!=='stale-excluded'||'notes' in deliverySlot)throw Error('stale feedback leaked into delivery');",
 "if(!storedText(deliveryBytes,'audit/owner-review.html').includes('noindex'))throw Error('missing printable handoff');",
 "const restoreInput=document.getElementById('delivery-file'),restoreUpload=new DataTransfer();",
 "restoreUpload.items.add(new File([deliveryBytes],'earlier-design-factory-delivery.zip',{type:'application/zip'}));",
 "restoreInput.files=restoreUpload.files;restoreInput.dispatchEvent(new Event('change',{bubbles:true}));",
 "const restoreButton=document.getElementById('delivery-restore-apply');",
 "for(let attempt=0;attempt<60&&restoreButton.disabled;attempt++)await new Promise(done=>setTimeout(done,50));",
 "if(restoreButton.disabled||!document.getElementById('delivery-restore-status').textContent.includes('18'))throw Error('ZIP restore preview did not validate: '+document.getElementById('delivery-restore-status').textContent);",
 "restoreButton.click();",
 "if(!document.getElementById('delivery-restore-status').textContent.includes('восстановлен'))throw Error('ZIP restore commit failed');",
 "if(!document.getElementById('site-preview').srcdoc.includes('Verified section heading'))throw Error('ZIP restore lost edited page copy');",
 "if(document.getElementById('owner-review-confirmed').checked)throw Error('ZIP restore silently granted owner review');",
 "document.getElementById('undo').click();",
 "if(document.getElementById('message').textContent.indexOf('отменено')<0)throw Error('ZIP restore Undo is unavailable');",
 "URL.createObjectURL=originalURL;HTMLAnchorElement.prototype.click=originalClick;",
 "mark('D5_BROWSER_E2E_PASS');",
 "}catch(e){mark('D5_BROWSER_E2E_FAIL: '+e.message)}",
 "},600);",
 "});",
 '</script>'
 ].join('\n');
 page=page.replace('</body>',probe+'</body>');
 fs.writeFileSync(path.join(fixture,'index.html'),page);
 browser=await openBrowser(bin);
 const result=await browser.waitForElementText(pathToFileURL(path.join(fixture,'index.html')).href,
  'd5-browser-result',45000);
 assert.equal(result,'D5_BROWSER_E2E_PASS','Chromium Studio UI E2E: '+result);
 console.log('DESIGN_FACTORY_D5_CHROMIUM PASS: kit→theme→mobile→edit→gallery→undo→redo, CMS/bridge/project/workspace browser exports');
}finally{
 if(browser)await browser.close();
 fs.rmSync(temp,{recursive:true,force:true});
}
})().catch(error=>{console.error('DESIGN_FACTORY_D5_CHROMIUM FAIL:',error);process.exitCode=2;});
