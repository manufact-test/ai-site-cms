/* Stage 1 only: new trusted property packs drive real Jedison/RJSF editor-input
   -> typed parent/opaque child bridge -> getComputedStyle in Chromium.
   Manually model-authored HTML, not independent AI generation or production security. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const esbuild=require('esbuild'),{chromium}=require('playwright-core');
const {createRegistry,installResearchPacks}=require('./extensible-style-registry.cjs');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);assert.ok(chrome);
const layouts={
 canvas:'<section data-stable-id="canvas-root" data-editable="backgroundColor padding"><header data-stable-id="canvas-head"><h2 data-stable-id="canvas-title" data-editable="text fontSize">An unconventional visual story</h2></header><div data-stable-id="canvas-layout" data-editable="gap flexDirection"><article data-stable-id="canvas-card" data-editable="padding borderRadius maxWidth"><p data-stable-id="canvas-lead" data-editable="text opacity">Design systems with a personality.</p></article><aside data-stable-id="canvas-aside" data-editable="borderColor"><strong data-stable-id="canvas-note" data-editable="text">A note</strong></aside></div></section>',
 brief:'<section data-stable-id="brief-root"><header data-stable-id="brief-header"><h1 data-stable-id="brief-title" data-editable="text fontSize">Research Notes</h1></header><main data-stable-id="brief-layout" data-editable="gap flexDirection"><article data-stable-id="brief-quote" data-editable="padding backgroundColor borderRadius"><blockquote data-stable-id="brief-line" data-editable="text opacity">Changing the shape of a section.</blockquote></article><figure data-stable-id="brief-figure" data-editable="maxWidth"><figcaption data-stable-id="brief-caption" data-editable="text">Mixed media will need its own safe registry.</figcaption></figure></main></section>'
};
const compile=s=>esbuild.buildSync({stdin:{contents:s,sourcefile:'registry-editor-browser.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
const clientRegistry=compile("const reg=require('./extensible-style-registry.cjs');window.__makeRegistry=()=>reg.installResearchPacks(reg.createRegistry());");
const jedisonBundle=compile("import Jedison from 'jedison';window.__Jedison=Jedison;");
const rjsfBundle=compile("import React from 'react';import{createRoot}from'react-dom/client';import Form from '@rjsf/core';import{customizeValidator}from '@rjsf/validator-ajv8';import Ajv2020 from 'ajv/dist/2020.js';window.__React=React;window.__createRoot=createRoot;window.__Form=Form;window.__validator=customizeValidator({AjvClass:Ajv2020});");
function receiver(token,origin,fields){
 const reg=window.__makeRegistry(),model={fields},send=m=>parent.postMessage({...m,token},origin);
 let last=0;
 window.addEventListener('message',event=>{
  const m=event.data;
  if(event.source!==parent||event.origin!==origin||!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).sort().join(',')!=='device,kind,seq,token,values'||m.kind!=='render'||m.token!==token||!Number.isInteger(m.seq)||m.seq<=last||m.seq>10000||!['desktop','tablet','mobile'].includes(m.device))return;
  try{
   reg.validate(model,m.values);
   reg.apply(document,model,m.values,m.device);
   last=m.seq;send({kind:'applied',seq:last,device:m.device});
  }catch(error){send({kind:'refused',seq:m.seq})}
 });
 send({kind:'ready'});
}
function parentSetup({site,markup,schema,defaults,fields,regBundle,receiverSource,library}){
 const target=document.getElementById('editor'),frame=document.getElementById('preview');
 const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const nonce=random(),token=random();window.__token=token;
 window.__draft=structuredClone(defaults);window.__published=structuredClone(defaults);window.__acks=[];window.__ready=false;window.__edits=0;window.__seq=0;window.__refused=0;window.__device='desktop';
 window.__paint=()=>{
  if(window.__ready)frame.contentWindow.postMessage({kind:'render',token,seq:++window.__seq,device:window.__device,values:window.__draft},'*');
 };
 window.__view=mode=>{if(!['desktop','tablet','mobile'].includes(mode))throw Error('bad device');window.__device=mode;frame.style.width=({desktop:1200,tablet:720,mobile:360})[mode]+'px';window.__paint()};
 window.__attack=attack=>{
  const m={kind:'render',token,seq:window.__seq+1,device:window.__device,values:structuredClone(window.__draft)};
  if(attack==='token')m.token='forged';
  if(attack==='extra')m.unsafe='script';
  if(attack==='replay')m.seq=window.__seq;
  if(attack==='css'){const f=fields.find(f=>f.name==='padding');m.values[f.key]={desktop:'url(https://attacker.invalid)',tablet:'',mobile:''}}
  frame.contentWindow.postMessage(m,'*');
 };
 window.addEventListener('message',e=>{
  const m=e.data;
  if(e.source!==frame.contentWindow||e.origin!=='null'||m?.token!==token){window.__refused++;return}
  if(m.kind==='ready'&&Object.keys(m).sort().join(',')==='kind,token'){window.__ready=true;window.__paint()}
  else if(m.kind==='applied'&&Number.isInteger(m.seq))window.__acks.push(m);
  else window.__refused++;
 });
 const code='('+receiverSource+')('+JSON.stringify(token)+','+JSON.stringify(location.origin)+','+JSON.stringify(fields).replace(/</g,'\\u003c')+');';
 const csp='<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;nonce-'+nonce+'&#39;; style-src &#39;nonce-'+nonce+'&#39;; style-src-attr &#39;unsafe-inline&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;; media-src &#39;none&#39;; form-action &#39;none&#39;; object-src &#39;none&#39;; base-uri &#39;none&#39;">';
 const style='<style nonce="'+nonce+'">body{font-family:Arial,sans-serif}.canvas-root,.brief-root{max-width:100%}article,aside,main{box-sizing:border-box;border:2px solid #ccddee}figure{margin:0}</style>';
 frame.srcdoc='<!doctype html><head>'+csp+style+'</head><body>'+markup+'<script nonce="'+nonce+'">'+regBundle+'</scr'+'ipt><script nonce="'+nonce+'">'+code+'</scr'+'ipt></body>';
 window.__mount=()=>{
  if(library==='jedison'){
   const J=window.__Jedison,e=new J.Create({container:target,theme:new J.Theme(),schema,data:defaults,keepMissingSchemaFields:false,showErrors:'input'});
   e.on('change',()=>{window.__draft=e.getValue();window.__edits++;window.__paint()});
   window.__get=()=>e.getValue();window.__destroy=()=>{e.destroy();target.replaceChildren()};
  }else{
   const R=window.__React,root=window.__createRoot(target);
   root.render(R.createElement(window.__Form,{schema,formData:defaults,validator:window.__validator,
    onChange:event=>{window.__draft=event.formData;window.__edits++;window.__paint()},children:R.createElement('span',null,'Experiment')}));
   window.__get=()=>window.__draft;window.__destroy=()=>root.unmount();
  }
 };
}
async function editField(page,key,part,oldValue,newValue){
 const candidates=await page.locator('#editor input').evaluateAll((els,args)=>els.filter(e=>{
  const id=(e.id||'').toLowerCase(),a=(e.getAttribute('aria-label')||'').toLowerCase();
  return e.type!=='hidden'&&((id.includes(args.key.toLowerCase())&&(!args.part||id.includes(args.part.toLowerCase())))||(a.includes(args.key.toLowerCase())&&(!args.part||a.includes(args.part.toLowerCase()))));
 }).map(e=>({id:e.id,value:e.value,type:e.type})),{key,part});
 if(candidates.length!==1||candidates[0].value!==String(oldValue)){
  const all=await page.locator('#editor input').evaluateAll(xs=>xs.map(e=>({id:e.id,v:e.value,type:e.type})));
  throw Error('Cannot uniquely find upstream editor field '+JSON.stringify({key,part,oldValue,candidates,all}));
 }
 const locator=page.locator('#editor input[id='+JSON.stringify(candidates[0].id)+']');
 await locator.fill(String(newValue));await locator.dispatchEvent('change');await locator.blur();
 await page.waitForFunction(({key,part,val})=>String(part?window.__draft[key]?.[part]:window.__draft[key])===val,{key,part,val:String(newValue)},{timeout:12000});
 const seq=await page.evaluate(()=>window.__seq);
 await page.waitForFunction(n=>window.__acks.some(m=>m.seq>=n),seq,{timeout:12000});
}
async function editChoice(page,key,newValue){
 const selects=await page.locator('#editor select').evaluateAll((els,key)=>els.filter(e=>(e.id||'').toLowerCase().includes(key.toLowerCase())).map(e=>e.id),key);
 assert.equal(selects.length,1,'need exact enum select '+key);
 await page.locator('#editor select[id='+JSON.stringify(selects[0])+']').selectOption(newValue);
 await page.waitForFunction(({key,val})=>window.__draft[key]===val,{key,val:newValue},{timeout:12000});
 const seq=await page.evaluate(()=>window.__seq);await page.waitForFunction(n=>window.__acks.some(x=>x.seq>=n),seq);
}
async function run(browser,site,editor,manifest,reg,origin){
 const page=await browser.newPage({viewport:{width:1520,height:920}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'/');
  await page.addScriptTag({content:editor==='jedison'?jedisonBundle:rjsfBundle});
  await page.evaluate(parentSetup,{site,markup:manifest.html,schema:reg.schema(manifest),defaults:manifest.defaults,fields:manifest.fields,regBundle:clientRegistry,receiverSource:receiver.toString(),library:editor});
  await page.waitForFunction(()=>window.__ready&&window.__acks.some(x=>x.seq===1),null,{timeout:15000});
  await page.evaluate(()=>window.__mount());
  const find=n=>manifest.fields.find(f=>f.name===n);
  const fields={
   padding:find('padding'),radius:find('borderRadius'),gap:find('gap'),direction:find('flexDirection'),
   background:find('backgroundColor'),opacity:find('opacity'),font:find('fontSize'),text:find('text')
  };
  for(const [name,f] of Object.entries(fields))assert.ok(f,'missing field '+name);
  await editField(page,fields.font.key,'desktop','36px','49px');
  await editField(page,fields.padding.key,'desktop','24px','40px');
  await editField(page,fields.padding.key,'tablet','','26px');
  await editField(page,fields.radius.key,'desktop','14px','22px');
  await editField(page,fields.gap.key,'desktop','18px','30px');
  await editField(page,fields.gap.key,'tablet','','17px');
  await editField(page,fields.background.key,null,'#203047','#134477');
  await editField(page,fields.opacity.key,null,'1','0.5');
  await editChoice(page,fields.direction.key,'column');
  const frame=page.frameLocator('#preview');
  const snapshots=[];
  for(const [device,width,font,pad,gap] of [['desktop',1200,'49px','40px','30px'],['tablet',720,'49px','26px','17px'],['mobile',360,'49px','26px','17px']]){
   await page.evaluate(device=>window.__view(device),device);
   await frame.locator('body').evaluate(async (_,w)=>{for(let i=0;i<100;i++){if(innerWidth===w)return;await new Promise(r=>requestAnimationFrame(r))}throw Error('iframe width race')},width);
   const seq=await page.evaluate(()=>window.__seq);await page.waitForFunction(n=>window.__acks.some(x=>x.seq>=n),seq);
   const result=await frame.locator('[data-stable-id='+JSON.stringify(fields.padding.id)+']').evaluate((el,ids)=>{
    const by=id=>document.querySelector('[data-stable-id="'+id+'"]'),css=id=>getComputedStyle(by(id));
    return {viewport:innerWidth,padding:css(ids.padding).padding,font:css(ids.font).fontSize,gap:css(ids.gap).gap,
     radius:css(ids.radius).borderTopLeftRadius,background:css(ids.background).backgroundColor,
     opacity:css(ids.opacity).opacity,direction:css(ids.direction).flexDirection};
   },Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.id])));
   assert.equal(result.viewport,width);assert.equal(result.padding,pad);assert.equal(result.font,font);assert.equal(result.gap,gap);
   assert.equal(result.radius,'22px');assert.equal(result.background,'rgb(19, 68, 119)');
   assert.equal(result.opacity,'0.5');assert.equal(result.direction,'column');snapshots.push({device,...result});
  }
  assert.deepEqual(await page.evaluate(()=>window.__published),manifest.defaults);
  const original=await page.evaluate(()=>window.__acks.length);
  await page.evaluate(()=>['token','extra','replay','css'].forEach(window.__attack));
  await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__acks.length),original);
  assert.ok(await page.evaluate(()=>window.__edits)>=7,'real UI edits did not fire');
  reg.validate(manifest,await page.evaluate(()=>window.__get()));
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.__destroy());
  return {site,editor,fields:manifest.fields.length,domNodes:manifest.nodes,computed:snapshots,pageErrors:errors.length,realInputEdits:true};
 }finally{await page.close()}
}
(async()=>{
 const {parseFragment}=await import('parse5');const reg=installResearchPacks(createRegistry());
 const manifests=Object.fromEntries(Object.entries(layouts).map(([k,html])=>[k,reg.parse(html,parseFragment)]));
 let srv=http.createServer((req,res)=>{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self' 'unsafe-inline'; frame-src 'self' about:; object-src 'none'"});res.end('<!doctype html><title>Experimental registry</title><div id="editor"></div><iframe id="preview" sandbox="allow-scripts" style="width:1200px;height:610px"></iframe>');return}
  res.writeHead(404);res.end('not found');
 });
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const runs=[];
  for(const [site,m] of Object.entries(manifests))for(const e of ['jedison','rjsf'])runs.push(await run(browser,site,e,m,reg,'http://127.0.0.1:'+srv.address().port));
  for(const site of Object.keys(manifests)){
   const [a,b]=runs.filter(x=>x.site===site);
   assert.deepEqual(a.computed,b.computed,'computed CSS parity '+site);
  }
  console.log('STAGE1_REGISTRY_EDITOR_BROWSER='+JSON.stringify({pass:true,runs:runs.length,editors:['Jedison 1.27.1','RJSF 6.11.0'],registeredProperties:reg.knownFields(),actualNativeEditorFields:true,parityAcrossTwoEditors:true,realComputedCss:true,devices:[1200,720,360],results:runs,limits:'Two model-authored hand-coded annotated HTML designs, trusted property packs only, no independent generator or production safety/UX'}));
 }finally{await browser.close();await new Promise(r=>srv.close(r))}
})().catch(e=>{console.error('STAGE1_REGISTRY_EDITOR_BROWSER_FAIL='+String(e.stack||e));process.exitCode=1});
