/* AI Site CMS stage 1 RESEARCH ONLY.
 * True upstream Jedison/RJSF browser fields, regeneration preserving edited
 * content/CSS/media and source component reordering, explicit publish/rollback.
 * Sandbox renders only reviewed typed markup, with no untrusted JS or inline attrs.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const esbuild=require('esbuild');
const {chromium}=require('playwright-core');
const {ASSETS}=require('./reviewed-visual-asset-pack.cjs');
const {manifestFixtures,createRevisionStore,publicShape,renderSafe,editorSchema,runUnit}=require('./versioned-site-reconciliation.cjs');
const browserPath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(browserPath,'browser required; cannot silently skip CI');
const bundle=src=>esbuild.buildSync({stdin:{contents:src,sourcefile:'versioned-editor.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
const JedisonCode=bundle("import Jedison from 'jedison';window.__Jedison=Jedison;");
const RJSFCode=bundle("import React from 'react';import{createRoot}from 'react-dom/client';import Form from '@rjsf/core';import{customizeValidator}from '@rjsf/validator-ajv8';import Ajv2020 from 'ajv/dist/2020.js';window.__React=React;window.__createRoot=createRoot;window.__Form=Form;window.__validator=customizeValidator({AjvClass:Ajv2020});");
function mountEditor({library,fields,schema}){
 const target=document.getElementById('editor');window.__draft=structuredClone(fields);
 window.__mountReady=false;
 if(library==='jedison'){
  const J=window.__Jedison;
  const instance=new J.Create({container:target,theme:new J.Theme(),schema,data:fields,keepMissingSchemaFields:false,showErrors:'input'});
  instance.on('change',()=>{window.__draft=instance.getValue()});
  window.__mountReady=true;
 }else{
  const R=window.__React,root=window.__createRoot(target);
  root.render(R.createElement(window.__Form,{schema,formData:fields,validator:window.__validator,onChange:e=>{window.__draft=e.formData},
   children:R.createElement('span',null,'Research only')}));
  window.__mountReady=true;
 }
}
async function changeField(page,name,value){
 const fields=await page.locator('#editor input, #editor select, #editor textarea').evaluateAll((xs,key)=>xs.filter(x=>x.type!=='hidden'&&(x.id||'').toLowerCase().includes(key.toLowerCase())).map(x=>({id:x.id,tag:x.tagName,type:x.type,value:x.value})),name);
 assert.equal(fields.length,1,'missing or duplicate editor control '+name+': '+JSON.stringify(fields));
 const x=fields[0],el=page.locator('#editor '+x.tag.toLowerCase()+'[id='+JSON.stringify(x.id)+']');
 if(x.tag==='SELECT')await el.selectOption(String(value));
 else if(x.type==='checkbox')value?await el.check():await el.uncheck();
 else{await el.fill(String(value));await el.dispatchEvent('change');await el.blur()}
 await page.waitForFunction(({name,value})=>window.__draft[name]===value,{name,value},{timeout:16000});
}
async function paint(page,store,origin,view='draft'){
 const current=store.snapshot(),data=view==='published'?current.published:current;
 const manifest=data.manifest,overrides=view==='published'?data.overrides:data.draft;
 const rendered=renderSafe(manifest,overrides);
 const random='n'+Array.from({length:12},(_,i)=>(i+1).toString(16)).join('');
 const csp='<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; img-src '+origin+'; style-src &#39;nonce-'+random+'&#39;; style-src-attr &#39;none&#39;; script-src &#39;none&#39;; connect-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;; object-src &#39;none&#39;">';
 const css='body{font:16px system-ui;background:#0a283c;color:#fff;margin:0}section{margin:12px;padding:16px;border:1px solid #528a9b}h1{font-size:46px}a{color:#fff}img{width:90px;height:60px;object-fit:contain}@media(max-width:600px){h1{font-size:26px}}'+rendered.css;
 const srcdoc='<!doctype html><head>'+csp+'<style nonce="'+random+'">'+css+'</style></head><body>'+rendered.html+'</body>';
 await page.evaluate(s=>{const f=document.getElementById('preview');f.srcdoc=s;f.style.width='1200px'},srcdoc);
 const frame=page.frameLocator('#preview');
 await frame.locator('[data-cms-id]').first().waitFor({state:'visible',timeout:10000});
 return {frame,shape:rendered.shape};
}
async function makePage(browser,editor,origin,manifest,overrides){
 const page=await browser.newPage({viewport:{width:1480,height:900}});
 await page.goto(origin+'/');
 await page.addScriptTag({content:editor==='jedison'?JedisonCode:RJSFCode});
 const id=manifest.components.find(x=>x.kind==='hero').id;
 const fields=publicShape(manifest,overrides).find(x=>x.id===id).values;
 await page.evaluate(mountEditor,{library:editor,fields,schema:editorSchema(manifest,id)});
 await page.waitForFunction(()=>window.__mountReady,{timeout:16000});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 return {page,id,errors};
}
async function run(browser,editor,origin,requests){
 const {v1,v2,changed,removed,aliases}=manifestFixtures();
 const store=createRevisionStore(v1);
 const beforeReq=requests.length;
 let tabs=[];
 try{
  const first=await makePage(browser,editor,origin,v1,{});
  tabs.push(first.page);
  let {frame}=await paint(first.page,store,origin,'published');
  assert.equal(await frame.locator('[data-cms-id="hero-anchor"] h1').textContent(),'Tide Atlas');
  const values=[
   ['headline','Owner copy <img src=x onerror=alert(1)>'],
   ['gradientFrom','#114477'],
   ['durationMs',2900],
   ['featureAsset','reef']
  ];
  for(const [name,value] of values){
   await changeField(first.page,name,value);
   store.setOwner('hero-anchor/'+name,value);
  }
  store.setOwner('badge-image/alt','Edited gallery alt');
  store.setOwner('faq-block/open',true);
  // Draft is visibly different while production snapshot remains exact v1.
  assert.equal(store.snapshot().published.manifest.version,'1.0.0');
  assert.equal(store.snapshot().published.overrides['hero-anchor/headline'],undefined);
  ({frame}=await paint(first.page,store,origin,'draft'));
  assert.equal(await frame.locator('[data-cms-id="hero-anchor"] h1').textContent(),values[0][1]);
  assert.equal(await frame.locator('[data-cms-id="hero-anchor"] h1 img').count(),0);
  assert.equal(await frame.locator('[data-cms-id="faq-block"] details').evaluate(el=>el.open),true);
  const heroCss=await frame.locator('[data-cms-id="hero-anchor"]').evaluate(el=>({gradient:getComputedStyle(el).backgroundImage,duration:getComputedStyle(el).animationDuration,origin:location.origin,
   crossOriginParent:(()=>{try{return !!parent.document.querySelector('#editor')}catch{return false}})(),scriptCount:document.scripts.length}));
  assert.ok(heroCss.gradient.includes('rgb(17, 68, 119)'));assert.equal(heroCss.duration,'2.9s');
  assert.equal(heroCss.origin,'null');assert.equal(heroCss.crossOriginParent,false);assert.equal(heroCss.scriptCount,0);
  await frame.locator('[data-cms-id="hero-anchor"] img').evaluate(img=>img.decode());
  assert.equal(await frame.locator('[data-cms-id="hero-anchor"] img').getAttribute('src'),'/fixtures/reef.svg');
  store.saveDraft();
  const ownerV1=store.publish();
  assert.equal(ownerV1.revision,2);
  const draftStage=store.stageAI(v2,aliases);
  assert.equal(draftStage.canPublish,true);
  assert.equal(draftStage.evidence.mappedOwner,6);
  assert.equal(store.snapshot().published.manifest.version,'1.0.0','AI staging not publication');
  store.acceptStage(draftStage.stageId);
  assert.equal(store.snapshot().published.manifest.version,'1.0.0','accepted regeneration is unpublished draft');
  const second=await makePage(browser,editor,origin,store.snapshot().manifest,store.snapshot().draft);
  tabs.push(second.page);
  ({frame}=await paint(second.page,store,origin,'draft'));
  const ids=await frame.locator('[data-cms-id]').evaluateAll(xs=>xs.map(x=>x.getAttribute('data-cms-id')));
  assert.deepEqual(ids,['faq-block','badge-image','hero-focal','signup-block','editorial-notes']);
  assert.equal(await frame.locator('[data-cms-id="hero-focal"] h1').textContent(),values[0][1]);
  assert.equal(await frame.locator('[data-cms-id="faq-block"] details').evaluate(el=>el.open),true);
  assert.equal(await frame.locator('[data-cms-id="badge-image"] img').getAttribute('alt'),'Edited gallery alt');
  assert.equal(await frame.locator('[data-cms-id="signup-block"] input').getAttribute('placeholder'),'new-ai@email.invalid');
  assert.equal(await frame.locator('[data-cms-id="editorial-notes"] p').textContent(),'An AI-added content module');
  const newCss=await frame.locator('[data-cms-id="hero-focal"]').evaluate(el=>({color:getComputedStyle(el).backgroundImage,duration:getComputedStyle(el).animationDuration}));
  assert.ok(newCss.color.includes('rgb(17, 68, 119)'));assert.equal(newCss.duration,'2.9s');
  // Both editor instances must be populated from migrated effective fields.
  const nativeValues=await second.page.evaluate(()=>window.__draft);
  assert.equal(nativeValues.headline,values[0][1]);
  assert.equal(nativeValues.featureAsset,'reef');
  assert.equal(nativeValues.gradientTo,'#ccbb88','unowned default follows regenerated AI site');
  await changeField(second.page,'gradientTo','#aabbcc');
  store.setOwner('hero-focal/gradientTo','#aabbcc');
  assert.throws(()=>store.stageAI(changed),/unsaved/);
  store.saveDraft();
  const broken=store.stageAI(changed);
  assert.equal(broken.canPublish,false);
  assert.equal(broken.quarantine[0].reason,'capability-changed');
  assert.throws(()=>store.acceptStage(broken.stageId),/quarantined/);
  const pubV2=store.publish();
  assert.equal(pubV2.manifest.version,'2.0.0');
  ({frame}=await paint(second.page,store,origin,'published'));
  assert.equal(await frame.locator('[data-cms-id="hero-focal"] h1').textContent(),values[0][1]);
  assert.ok((await frame.locator('[data-cms-id="hero-focal"]').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('rgb(170, 187, 204)'));
  await second.page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await frame.locator('[data-cms-id="hero-focal"]').evaluate(el=>getComputedStyle(el).animationName),'none');
  await second.page.emulateMedia({reducedMotion:'no-preference'});
  const beforeRollbackPub=store.snapshot().published;
  const restored=store.rollback(ownerV1.revision);
  assert.equal(restored.sourceRevision,ownerV1.revision);
  assert.equal(restored.manifest.version,'1.0.0');
  assert.equal(restored.overrides['hero-anchor/headline'],values[0][1]);
  assert.equal(store.snapshot().history.length,4);
  assert.equal(beforeRollbackPub.manifest.version,'2.0.0');
  ({frame}=await paint(second.page,store,origin,'published'));
  assert.equal(await frame.locator('[data-cms-id="hero-anchor"] h1').textContent(),values[0][1]);
  assert.equal(await frame.locator('[data-cms-id="hero-focal"]').count(),0);
  const requestPaths=requests.slice(beforeReq);
  assert.ok(requestPaths.some(x=>x==='/fixtures/reef.svg'),'SVG asset actually requested');
  assert.ok(requestPaths.every(x=>x==='/'||x==='/favicon.ico'||x==='/fixtures/orb.svg'||x==='/fixtures/reef.svg'),'unexpected network paths '+JSON.stringify(requestPaths));
  assert.deepEqual(first.errors,[]);assert.deepEqual(second.errors,[]);
  console.log('STAGE1_REGENERATION_BROWSER='+JSON.stringify({pass:true,editor,upstream:editor==='jedison'?'1.27.1':'6.11.0',
   nativeOwnerEdits:5,componentsBefore:4,componentsAfter:5,approvedIDRenames:1,retainedOverrides:6,
   nativeGradientAndDuration:true,AIUnownedDefaultsChanged:true,changedKindBlocked:true,
   publishIsExplicit:true,rollbackExact:true,rollbackNewRevision:true,opaquePreview:true,
   originalSourceScriptsBlocked:true,noUnexpectedNetwork:true,pageErrors:0,
   limits:'static reviewed typed graph, no blind AI generation, no persistent server database or live deployment'}));
 }finally{await Promise.all(tabs.map(x=>x.close()))}
}
(async()=>{
 runUnit();
 const requests=[];
 const server=http.createServer((req,res)=>{
  requests.push(req.url||'/');
  const asset=Object.values(ASSETS).find(x=>x.path===req.url);
  if(asset){res.writeHead(200,{'Content-Type':'image/svg+xml','Content-Security-Policy':"default-src 'none'; sandbox; script-src 'none'",'X-Content-Type-Options':'nosniff'});res.end(asset.svg);return}
  if(req.url!=='/'&&req.url!=='/favicon.ico'){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
  res.end('<!doctype html><html><body><div id="editor"></div><iframe id="preview" sandbox="allow-scripts" style="width:1200px;height:650px"></iframe></body></html>');
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:browserPath,args:['--no-sandbox']});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const editor of ['jedison','rjsf'])await run(browser,editor,origin,requests);
  console.log('STAGE1_REGENERATION_TOTAL='+JSON.stringify({pass:true,editorRuns:2,nativeOwnerEdits:10,fullRegenerationCycles:2,
   maliciousOwnerValuesEscaped:true,priorPublishedSnapshotProtected:true,productionAcceptance:0}));
 }finally{if(browser)await browser.close();await new Promise(done=>server.close(done))}
})().catch(e=>{console.error('STAGE1_REGENERATION_BROWSER_FAIL='+String(e.stack||e));process.exitCode=1});
