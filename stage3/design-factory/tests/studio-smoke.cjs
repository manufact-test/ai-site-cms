#!/usr/bin/env node
'use strict';
// D5 contract + optional real Chromium walkthrough. Node stdlib only.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const cp=require('node:child_process');
const sdk=require('../../sdk/contract.cjs');
const root=path.resolve(__dirname,'..');
const studio=path.join(root,'studio');
const read=name=>fs.readFileSync(path.join(studio,name),'utf8');
const bundle=read('runtime.generated.js'),app=read('studio.js'),markup=read('index.html'),css=read('studio.css');
const zipSource=read('preview-zip.js'),previewZip=require(path.join(studio,'preview-zip.js'));
const feedbackSource=read('client-feedback.js'),feedback=require(path.join(studio,'client-feedback.js'));
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
  'lib/composition-adapter.cjs','lib/bridge.cjs'
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
assert.ok(markup.indexOf('client-feedback.js')<markup.indexOf('studio.js'),'Feedback bridge must load first');
assert.ok(markup.indexOf('preview-zip.js')<markup.indexOf('studio.js'),
 'Preview ZIP script must load before Studio');
assert.ok(markup.includes('id="save-preview-zip"'));
for(const name of ['feedback-file','feedback-list','feedback-export','feedback-summary'])
 assert.ok(markup.includes('id="'+name+'"'),'Missing feedback UI '+name);
assert.ok(app.includes('feedbackTool.validate(incoming,expected)'));
assert.ok(app.includes('feedbackTool.reviewHtml(reviewContext)'));
assert.ok(app.includes('function savePreviewZip()'));
assert.ok(app.includes('packer.build(files),verification=packer.inspect(bytes)'));
assert.ok(!/@import|fetch\s*\(|XMLHttpRequest|https?:\/\//i.test(zipSource),
 'Preview ZIP packer must remain offline');

assert.ok(markup.includes('runtime.generated.js')&&markup.includes('studio.js'));
assert.ok(!/@import|url\(\s*["']?https?:\/\//i.test(css));
assert.ok(css.includes('prefers-reduced-motion')&&css.includes('max-width:730px'));
for(const minTarget of ['.device-button{min-height:44px','.page-list button{min-height:44px',
 '.icon-button{height:44px','.remove-service{'])assert.ok(css.includes(minTarget),minTarget);
for(const id of ['kit-list','theme-list','site-preview','page-list','title','headline','description',
 'services-list','composition','undo','redo','save-project','save-site','save-workspace','project-file','checklist','owner-review-confirmed'])
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
assert.ok(app.includes("{throwOnError:true}"),'Import must not report success after a failed state application');
assert.ok(app.includes('clearTimeout(refreshTimer)')&&app.includes('PREVIEW_DEBOUNCE_MS=120'),
 'Live preview should debounce full iframe recompilation while text is being edited');
assert.ok(!markup.includes('allow-same-origin'));

 // D7 product workflow: alternate live theme, same owner facts, full four-page mobile board.
 for(const id of ['compare-toggle','overview-toggle','compare-theme','compare-adopt','compare-shell',
  'compare-preview','preview-layout','page-overview','page-overview-note'])
  assert.ok(markup.includes('id="'+id+'"'),'D7 workbench control '+id);
 assert.ok(markup.includes('id="compare-preview" sandbox="allow-scripts"'));
 assert.ok(app.includes('function compileForTheme(theme)'));
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
assert.ok(approvedDraft.site.pages.every(page=>page.seo.robots==='index'));
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
assert.ok(reviewPage.includes('id="feedback-add"')&&reviewPage.includes('id="feedback-download"'));
assert.ok(reviewPage.includes('href="contact/index.html"'));
assert.ok(reviewPage.includes('script-src &apos;unsafe-inline&apos;'));
const portalScript=reviewPage.match(/<script>([\s\S]+?)<\/script>/)?.[1];
assert.ok(portalScript&&portalScript.includes('feedback-add'));
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
assert.throws(()=>previewZip.build(previewEntries.slice(1)),/exactly eight/);
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
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'df-studio-chromium-'));
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
 "document.getElementById('undo').click();",
 "if(document.getElementById('composition').value==='gallery-mosaic')throw Error('undo failure');",
 "document.getElementById('redo').click();",
 "if(document.getElementById('composition').value!=='gallery-mosaic')throw Error('redo failure');",
 "const blobs=[],downloadNames=[];",
 "const originalURL=URL.createObjectURL,originalClick=HTMLAnchorElement.prototype.click;",
 "URL.createObjectURL=function(blob){blobs.push(blob);return originalURL.call(URL,blob)};",
 "HTMLAnchorElement.prototype.click=function(){downloadNames.push(this.download)};",
 "for(const id of ['save-site','save-bundle','save-project','save-workspace','save-preview-zip'])document.getElementById(id).click();",
 "if(blobs.length!==5||downloadNames.length!==5)throw Error('five exports missing');",
 "const site=JSON.parse(await blobs[0].text());",
 "if(site.format!=='manufact-ai-site-v1'||site.pages.length!==4)throw Error('CMS export contract');",
 "if(!site.pages.every(page=>page.seo.robots==='noindex'))throw Error('default CMS export must be protected by noindex');",
 "window.DesignFactory.sdk.validateSite(site,window.DesignFactory.compiler.loadRegistry());",
 "const bundle=JSON.parse(await blobs[1].text());window.DesignFactory.bridge.validateBundle(bundle);",
 "if(JSON.stringify(bundle.site)!==JSON.stringify(site))throw Error('CMS and D6 exports diverge');",
 "const project=JSON.parse(await blobs[2].text()),workspace=JSON.parse(await blobs[3].text());",
 "if(project.facts.title!=='Verified Demo Company'||workspace.composition!=='gallery-mosaic')throw Error('exported edits missing');",
 "if(!downloadNames[4].endsWith('-html-preview.zip'))throw Error('HTML preview ZIP name');",
 "const previewZip=window.DesignFactoryPreviewZip.inspect(new Uint8Array(await blobs[4].arrayBuffer()));",
 "if(previewZip.files!==8||!previewZip.crcVerified)throw Error('HTML ZIP contents failed CRC');",
 "const setField=(id,value)=>{const field=document.getElementById(id);field.focus();field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));};",
 "setField('headline','Verified owner headline');setField('description','Verified owner description');setField('contactText','Verified owner contact');",
 "setField('service-0-title','Verified service one');setField('service-0-description','Owner confirmed service one');",
 "document.getElementById('add-service').click();setField('service-1-title','Verified service two');setField('service-1-description','Owner confirmed service two');",
 "await new Promise(resolve=>setTimeout(resolve,180));",
 "const gate=document.getElementById('owner-review-confirmed');if(gate.disabled)throw Error('review confirmation should unlock only after required facts are complete');",
 "gate.checked=true;gate.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,180));",
 "document.getElementById('save-site').click();const approvedSite=JSON.parse(await blobs[5].text());if(!approvedSite.pages.every(page=>page.seo.robots==='index'))throw Error('explicit owner review must allow indexing');",
 "setField('headline','Edited after review');if(gate.checked)throw Error('editing content must revoke owner review');await new Promise(resolve=>setTimeout(resolve,180));",
 "document.getElementById('save-site').click();const revokedSite=JSON.parse(await blobs[6].text());if(!revokedSite.pages.every(page=>page.seo.robots==='noindex'))throw Error('editing after review must restore noindex');",
 "URL.createObjectURL=originalURL;HTMLAnchorElement.prototype.click=originalClick;",
 "if(blobs.length!==7||downloadNames.length!==7)throw Error('expected seven exports across review workflow');",
 "mark('D5_BROWSER_E2E_PASS');",
 "}catch(e){mark('D5_BROWSER_E2E_FAIL: '+e.message)}",
 "},600);",
 "});",
 '</script>'
 ].join('\n');
 page=page.replace('</body>',probe+'</body>');
 fs.writeFileSync(path.join(fixture,'index.html'),page);
 const run=cp.spawnSync(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run',
  '--disable-background-networking','--allow-file-access-from-files','--virtual-time-budget=8000','--dump-dom',
  'file://'+path.join(fixture,'index.html')],{encoding:'utf8',timeout:30000,maxBuffer:15*1024*1024});
 assert.equal(run.status,0,'Chromium exit: '+run.stderr.slice(-1000));
 assert.ok(run.stdout.includes('D5_BROWSER_E2E_PASS'),'Chromium UI E2E: '+run.stdout.slice(-900));
 console.log('DESIGN_FACTORY_D5_CHROMIUM PASS: kit→theme→mobile→edit→gallery→undo→redo, CMS/bridge/project/workspace browser exports');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
