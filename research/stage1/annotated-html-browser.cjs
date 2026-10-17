/* Stage 1 research: varied annotated HTML → generated manifests → upstream editors,
 * actual browser computed CSS, typed patch, migration/conflicts and sandbox protocol.
 * NOT independent AI-generation and not production sanitizer or visual CMS. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const esbuild=require('esbuild'),{chromium}=require('playwright-core'),{JSDOM}=require('jsdom');
const contract=require('./annotated-html-contract.cjs');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);assert.ok(chrome);
const FIXTURES={
 story:'<section data-stable-id="story-root" class="story"><header data-stable-id="story-header" class="header"><h2 data-stable-id="story-heading" data-editable="text fontSize">Timeline overview</h2><p data-stable-id="story-intro" data-editable="text">A narrative of milestones</p></header><div data-stable-id="story-rows" data-editable="gap" class="rows"><article data-stable-id="story-one"><h3 data-stable-id="story-one-title" data-editable="text">Discovery</h3><p data-stable-id="story-one-body" data-editable="text">What the team learned</p></article><article data-stable-id="story-two"><h3 data-stable-id="story-two-title" data-editable="text">Launch</h3><p data-stable-id="story-two-body" data-editable="text">Where the project goes</p></article></div></section>',
 board:'<section data-stable-id="board-root" class="board"><aside data-stable-id="board-aside"><h2 data-stable-id="board-title" data-editable="text fontSize">Comparison board</h2><small data-stable-id="board-intro" data-editable="text">Compare two approaches</small></aside><div data-stable-id="board-grid" class="grid" data-editable="backgroundColor gap"><article data-stable-id="board-left"><h3 data-stable-id="board-left-title" data-editable="text">Open integration</h3><p data-stable-id="board-left-lead" data-editable="text">Structured configuration</p></article><article data-stable-id="board-right"><h3 data-stable-id="board-right-title" data-editable="text">Custom runtime</h3><p data-stable-id="board-right-lead" data-editable="text">Independent deploy path</p></article></div><footer data-stable-id="board-footer"><span data-stable-id="board-footnote" data-editable="text">Review both directions</span></footer></section>'
};
const failures=[];
const eq=(a,b)=>assert.deepEqual(a,b);
async function negativeCases(parseFragment){
 const base=FIXTURES.story;const reject=(label,html)=>{assert.throws(()=>contract.discover(html,parseFragment),undefined,label);failures.push(label)};
 reject('script',base.replace('</section>','<script>alert(1)</script></section>'));
 reject('event-handler',base.replace('class="story"','onmouseover="alert(1)"'));
 reject('foreign-svg',base.replace('</section>','<svg><script/></svg></section>'));
 reject('style',base.replace('</section>','<style>body{display:none}</style></section>'));
 reject('url-src',base.replace('class="story"','src="javascript:evil()"'));
 reject('malformed-root',base.slice(0,-1));
 reject('secondary-root',base+'<section></section>');
 reject('duplicate-id',base.replace('data-stable-id="story-two-title"','data-stable-id="story-heading"'));
 reject('duplicate-prop',base.replace('data-editable="text fontSize"','data-editable="text text"'));
 reject('unknown-control',base.replace('data-editable="text fontSize"','data-editable="text behavior.eval"'));
 reject('missing-id',base.replace('data-stable-id="story-heading" ',''));
 reject('text-parent',base.replace('data-stable-id="story-header" class="header"','data-stable-id="story-header" class="header" data-editable="text"'));
 reject('inline-style',base.replace('class="story"','style="color:red"'));
 reject('template',base.replace('</section>','<template>test</template></section>'));
 reject('comment',base.replace('</section>','<!-- comment --></section>'));
 reject('namespace',base.replace('</section>','<math><mtext>hi</mtext></math></section>'));
 reject('unknown-attribute',base.replace('class="story"','data-x="foo"'));
 reject('duplicate-editable',base.replace('data-editable="text fontSize"','data-editable="fontSize fontSize"'));
 const huge=base.replace('Timeline overview','x'.repeat(410));reject('text-limit',huge);
 const first=contract.discover(FIXTURES.story,parseFragment);
 const old=first.fields.find(f=>f.key==='story-heading__text');assert.ok(old);
 const owners={[old.key]:'Owner title approved'};
 const upgraded=contract.discover(FIXTURES.story.replace('Timeline overview','Revised AI default').replace('class="story"','class="story new-layout"'),parseFragment);
 const migrated=contract.migrate(first,upgraded,owners);
 eq(migrated.kept,[old.key]);eq(migrated.conflicts,[]);eq(migrated.values[old.key],'Owner title approved');
 assert.equal(migrated.publishBlocked,false);
 const renamed=contract.discover(FIXTURES.story.replaceAll('story-heading','story-heading-renamed'),parseFragment);
 const conflict=contract.migrate(first,renamed,owners);eq(conflict.conflicts[0].reason,'removed-or-renamed');assert.equal(conflict.publishBlocked,true);
 const unknown=contract.migrate(first,first,{'unexpected__text':'bad'});assert.equal(unknown.publishBlocked,true);
 // Every declared property is linked to a real unique DOM node and a schema field.
 for(const markup of Object.values(FIXTURES)){
  const m=contract.discover(markup,parseFragment),schema=contract.modelSchema(m);
  eq(Object.keys(schema.properties).sort(),m.fields.map(f=>f.key).sort());
  eq(Object.keys(m.defaults).sort(),m.fields.map(f=>f.key).sort());
  assert.equal(contract.validate(m,m.defaults),true);
  assert.throws(()=>contract.validate(m,{...m.defaults,attack:'ignored'}));
  assert.throws(()=>contract.validate(m,Object.fromEntries(Object.entries(m.defaults).slice(1))));
 }
 return {rejected:failures.length,migrations:{retainOwner:true,renameQuarantine:true,unknownOverrideQuarantine:true}};
}
function build(src){return esbuild.buildSync({stdin:{contents:src,sourcefile:'annotated-browser.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text}
function child(token,origin,manifest){
 const api=window.__api,m={fields:manifest.fields},status={seq:0};
 const send=data=>parent.postMessage({...data,token},origin);
 window.addEventListener('message',e=>{
  const p=e.data;if(e.source!==parent||e.origin!==origin||!p||typeof p!=='object'||Array.isArray(p)||
   Object.keys(p).sort().join(',')!=='device,kind,seq,token,values'||p.kind!=='render'||
   p.token!==token||!Number.isSafeInteger(p.seq)||p.seq<=status.seq||p.seq>10000||!['desktop','tablet','mobile'].includes(p.device))return;
  try{api.validate(m,p.values);api.apply(document,m,p.values,p.device);status.seq=p.seq;
   send({kind:'applied',seq:p.seq,device:p.device})}
  catch(err){send({kind:'refused',seq:p.seq})}
 });
 send({kind:'ready'});
}
function parentInit({html,manifest,lib,libraryBundle,apiBundle,childSource}){
 const frame=document.getElementById('preview'),host=document.getElementById('editor');
 const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
 const token=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
 window.__token=token;window.__model=structuredClone(manifest.defaults);window.__published=structuredClone(manifest.defaults);
 window.__messages=[],window.__ready=false,window.__seq=0,window.__device='desktop',window.__rejections=0,window.__edits=0;
 window.__render=()=>{
  if(window.__ready)frame.contentWindow.postMessage({kind:'render',seq:++window.__seq,token,device:window.__device,values:window.__model},'*');
 };
 window.__updateTyped=(key,value)=>{
  const next=structuredClone(window.__model);next[key]=value;
  if(!window.__validateNext(next))throw Error('invalid typed update');
  window.__model=next;window.__render();
 };
 window.__view=mode=>{
  window.__device=mode;frame.style.width=({desktop:1200,tablet:720,mobile:360})[mode]+'px';window.__render();
 };
 window.__spoof=caseName=>{
  const msg={kind:'render',token,seq:window.__seq+1,device:window.__device,values:structuredClone(window.__model)};
  if(caseName==='badtoken')msg.token='bad';
  if(caseName==='extra')msg.extra='evil';
  if(caseName==='replay')msg.seq=window.__seq;
  if(caseName==='badcss'){
   const key=manifest.fields.find(x=>x.prop==='fontSize').key;
   msg.values[key]={desktop:'url(javascript:alert(1))',tablet:'',mobile:''};
  }
  frame.contentWindow.postMessage(msg,'*');
 };
 window.addEventListener('message',e=>{
  const p=e.data;
  if(e.source!==frame.contentWindow||e.origin!=='null'||!p||p.token!==token){window.__rejections++;return}
  if(p.kind==='ready'&&Object.keys(p).sort().join(',')==='kind,token'){window.__ready=true;window.__render()}
  else if(p.kind==='applied'&&Number.isSafeInteger(p.seq))window.__messages.push(p);
  else window.__rejections++;
 });
 const sanitizedManifest=JSON.stringify({fields:manifest.fields}).replace(/</g,'\\u003c');
 const source='('+childSource+')('+JSON.stringify(token)+','+JSON.stringify(location.origin)+','+sanitizedManifest+');';
 const csp='<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;nonce-'+nonce+'&#39;; style-src &#39;nonce-'+nonce+'&#39;; style-src-attr &#39;unsafe-inline&#39;; img-src &#39;none&#39;; media-src &#39;none&#39;; connect-src &#39;none&#39;; base-uri &#39;none&#39;; object-src &#39;none&#39;; form-action &#39;none&#39;">';
 const trustedCSS='<style nonce="'+nonce+'">html,body{margin:0;padding:0;font-family:Arial}.story,.board{padding:22px}.rows,.grid{display:flex;flex-wrap:wrap}.rows article,.grid article{border:1px solid #ddd;padding:12px}.story h2,.board h2{line-height:1.1}</style>';
 frame.srcdoc='<!doctype html><head>'+csp+trustedCSS+'</head><body>'+html+
  '<script nonce="'+nonce+'">'+apiBundle+'</scr'+'ipt><script nonce="'+nonce+'">'+source+'</scr'+'ipt></body>';
 window.__mount=()=>{
  if(lib==='jedison'){
   const J=window.__Jedison,ed=new J.Create({container:host,theme:new J.Theme(),schema:manifest.schema,data:structuredClone(manifest.defaults),keepMissingSchemaFields:false,showErrors:'input'});
   window.__read=()=>ed.getValue();window.__destroy=()=>{ed.destroy();host.replaceChildren()};
   ed.on('change',()=>{window.__model=ed.getValue();window.__edits++;window.__render()});
  }else{
   const R=window.__React,root=window.__createRoot(host);
   root.render(R.createElement(window.__Form,{schema:manifest.schema,formData:structuredClone(manifest.defaults),validator:window.__validator,
    onChange:event=>{window.__model=event.formData;window.__edits++;window.__render()},
    children:R.createElement('span',null,'research only')}));
   window.__read=()=>window.__model;window.__destroy=()=>root.unmount();
  }
 };
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function editText(page,oldValue,newValue){
 const ids=await page.locator('#editor input').evaluateAll((els,x)=>els.filter(e=>e.type!=='hidden'&&e.value===x).map(e=>e.id),oldValue);
 assert.equal(ids.length,1,oldValue+' matched '+ids.length+' inputs');
 const input=page.locator('#editor input[id='+JSON.stringify(ids[0])+']');
 await input.fill(newValue);await input.dispatchEvent('change');await input.blur();
}
async function test(browser,site,editor,bundles,manifests,origin){
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const m=manifests[site],f=m.fields.find(x=>x.prop==='text'&&x.id.endsWith(site==='story'?'heading':'title'));
 assert.ok(f);
 try{
  await page.goto(origin+'/');
  await page.addScriptTag({content:bundles[editor]});
  await page.evaluate(parentInit,{html:m.html,lib:editor,libraryBundle:bundles[editor],apiBundle:bundles.api,childSource:child.toString(),manifest:{...m,schema:contract.modelSchema(m)}});
  await page.waitForFunction(()=>window.__ready&&window.__messages.some(x=>x.kind==='applied'),null,{timeout:13000});
  await page.evaluate(()=>window.__mount());
  const frame=page.frameLocator('#preview');
  await frame.locator('[data-stable-id='+JSON.stringify(site+'-root')+']').waitFor();
  const initial=m.defaults[f.key];
  const replacement='Owner-approved '+site+' <img src=x onerror=alert(1)>';
  await editText(page,initial,replacement);
  await page.waitForFunction(({key,replacement})=>window.__model[key]===replacement,{key:f.key,replacement},{timeout:10000});
  const seq=await page.evaluate(()=>window.__seq);
  await page.waitForFunction(seq=>window.__messages.some(m=>m.kind==='applied'&&m.seq>=seq),seq,{timeout:10000});
  assert.equal(await frame.locator('[data-stable-id='+JSON.stringify(f.id)+']').innerText(),replacement);
  assert.equal(await frame.locator('img').count(),0);
  const editorResult=await page.evaluate(()=>window.__read());
  contract.validate(m,editorResult);
  assert.deepEqual(editorResult,await page.evaluate(()=>window.__model));
  assert.deepEqual(await page.evaluate(()=>window.__published),m.defaults);
  const styleKey=m.fields.find(x=>x.prop==='fontSize').key,styleId=m.fields.find(x=>x.prop==='fontSize').id;
  const gap=m.fields.find(x=>x.prop==='gap');
  assert.ok(gap);
  await page.evaluate(({key})=>window.__updateTyped(key,{desktop:'52px',tablet:'35px',mobile:''}),{key:styleKey});
  await page.evaluate(({key})=>window.__updateTyped(key,{desktop:'30px',tablet:'18px',mobile:'11px'}),{key:gap.key});
  const check=async(view,font,gapSize)=>{
   await page.evaluate(view=>window.__view(view),view);
   const seq=await page.evaluate(()=>window.__seq);
   await page.waitForFunction(seq=>window.__messages.some(m=>m.kind==='applied'&&m.seq>=seq),seq);
   const data=await frame.locator('[data-stable-id='+JSON.stringify(styleId)+']').evaluate((n,id)=>({
    font:getComputedStyle(n).fontSize,
    gap:getComputedStyle(document.querySelector('[data-stable-id="'+id+'"]')).gap,
    frameWidth:innerWidth
   }),gap.id);
   assert.equal(data.font,font);assert.equal(data.gap,gapSize);
   if(view==='mobile')assert.ok(data.frameWidth<500);
   return data;
  };
  const snapshots=[await check('desktop','52px','30px'),await check('tablet','35px','18px'),await check('mobile','35px','11px')];
  if(site==='board'){
   const background=m.fields.find(x=>x.prop==='backgroundColor');
   await page.evaluate(({key})=>window.__updateTyped(key,'#123456'),{key:background.key});
   await page.waitForFunction(()=>window.__messages.some(x=>x.seq>=window.__seq));
   assert.equal(await frame.locator('[data-stable-id='+JSON.stringify(background.id)+']').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(18, 52, 86)');
  }
  await page.evaluate(()=>{window.__count=window.__messages.length;['badtoken','extra','replay','badcss'].forEach(window.__spoof)});
  await delay(130);
  assert.equal(await page.evaluate(()=>window.__messages.length),await page.evaluate(()=>window.__count));
  await page.evaluate(()=>window.postMessage({kind:'applied',seq:999,token:window.__token},'*'));
  await page.frameLocator('#rogue').locator('body').evaluate((_,t)=>parent.postMessage({kind:'applied',token:t,seq:999},'*'),await page.evaluate(()=>window.__token));
  await delay(90);assert.ok(await page.evaluate(()=>window.__rejections)>=2);
  assert.equal(await frame.locator('body').evaluate(()=>{try{return parent.document.title}catch{return 'blocked'}}),'blocked');
  assert.ok(await page.evaluate(()=>window.__edits)>0);
  eq(errors,[]);
  await page.evaluate(()=>window.__destroy());
  return {site,editor,manifestFields:m.fields.length,nodes:m.elementCount,computed:snapshots,pageErrors:0};
 }finally{await page.close()}
}
async function main(){
 const parse5=await import('parse5');
 const preflight=await negativeCases(parse5.parseFragment);
 const manifests=Object.fromEntries(Object.entries(FIXTURES).map(([k,v])=>[k,contract.discover(v,parse5.parseFragment)]));
 const allIDs=Object.values(manifests).flatMap(m=>m.elementIds);assert.equal(new Set(allIDs).size,allIDs.length);
 const bundles={
  api:build("window.__api=require('./annotated-html-contract.cjs')"),
  jedison:build("import Jedison from 'jedison';window.__Jedison=Jedison;"),
  rjsf:build("import React from 'react';import{createRoot}from'react-dom/client';import Form from '@rjsf/core';import{customizeValidator}from '@rjsf/validator-ajv8';import Ajv2020 from 'ajv/dist/2020.js';window.__React=React;window.__createRoot=createRoot;window.__Form=Form;window.__validator=customizeValidator({AjvClass:Ajv2020});")
 };
 const server=http.createServer((req,res)=>{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':"default-src 'self' 'unsafe-inline'; frame-src 'self' about:; object-src 'none'"});res.end('<!doctype html><title>Research only</title><div id="editor"></div><iframe id="preview" sandbox="allow-scripts" style="height:600px;width:1200px"></iframe><iframe id="rogue" sandbox="allow-scripts" srcdoc="<p>Untrusted sibling</p>"></iframe>');return}
  res.writeHead(404);res.end('Not found');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const output=[];
  for(const site of Object.keys(manifests))for(const lib of ['jedison','rjsf'])output.push(await test(browser,site,lib,bundles,manifests,'http://127.0.0.1:'+server.address().port));
  console.log('STAGE1_ANNOTATED_HTML='+JSON.stringify({pass:true,uniqueStructures:Object.keys(manifests),runs:output.length,preflightNegatives:preflight.rejected,modelCoverage:output.map(v=>({site:v.site,editor:v.editor,nodes:v.nodes,fields:v.manifestFields})),computedCss3Devices:true,versionOverrideMigrations:preflight.migrations,editorModelsEqual:'after identical UI text edits; CSS values patched via typed bridge, not editor UI',output,limits:'manually authored annotated HTML, finite safe tag/property grammar; no independent LLM or arbitrary CSS/behavior, no product acceptance'}));
 }finally{await browser.close();await new Promise(r=>server.close(r))}
}
main().catch(e=>{console.error('STAGE1_ANNOTATED_HTML_FAIL='+String(e.stack||e));process.exitCode=1});
