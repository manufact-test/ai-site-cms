/* Stage 1 research ONLY: five AI-authored typed section families using actual Jedison/RJSF.
 * Scripted Chromium actions; NOT an AI generator or release CMS. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const esbuild=require('esbuild'),{chromium}=require('playwright-core'),{JSDOM}=require('jsdom');
const c=require('./multi-section-contract.cjs');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'Chromium unavailable');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stage1-multiple-sites-'));let browser,server;
const assets={};const bundles={};const results=[],negative=[];
const build=s=>esbuild.buildSync({stdin:{contents:s,sourcefile:'five-sections.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
function setup(){
 bundles.jedison=build("import Jedison from 'jedison';window.__Jedison=Jedison;");
 bundles.rjsf=build("import React from 'react';import{createRoot}from'react-dom/client';import Form from '@rjsf/core';import{customizeValidator}from '@rjsf/validator-ajv8';import Ajv2020 from 'ajv/dist/2020.js';window.__React=React;window.__createRoot=createRoot;window.__Form=Form;window.__validator=customizeValidator({AjvClass:Ajv2020});");
 bundles.compiler=build("window.__compiler=require('./multi-section-contract.cjs');");
 const ff=args=>{const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{timeout:25000,encoding:'utf8'});assert.equal(r.status,0,r.stderr)};
 ff(['-f','lavfi','-i','color=c=green:s=64x48:r=1','-frames:v','1','-threads','1',path.join(dir,'cover.png')]);
 ff(['-f','lavfi','-i','color=c=blue:s=64x48:r=1','-frames:v','1','-threads','1',path.join(dir,'portrait.jpg')]);
 ff(['-f','lavfi','-i','testsrc=size=64x48:rate=5','-t','1','-an','-c:v','libvpx','-b:v','75k','-threads','1',path.join(dir,'clip.webm')]);
 for(const [file,type] of [['cover.png','image/png'],['portrait.jpg','image/jpeg'],['clip.webm','video/webm']])assets[file]={data:fs.readFileSync(path.join(dir,file)),type};
}
function staticChecks(){
 const attack=(name,kind,fn)=>{const obj=structuredClone(c.fixtures[kind]);fn(obj);assert.throws(()=>c.render(kind,obj),undefined,name);negative.push(name)};
 for(const [kind,source] of Object.entries(c.fixtures)){
  const dom=new JSDOM(c.render(kind,source)).window.document;
  const ids=[...dom.querySelectorAll('[data-stable-id]')].map(e=>e.dataset.stableId);
  assert.equal(ids.length,new Set(ids).size);assert.ok(ids.length>=4);
  assert.equal(dom.querySelectorAll('script,style,iframe,svg,object').length,0);
  const key=Object.keys(source)[0];
  attack(kind+'-extra',kind,v=>v.unexpected='<script>evil()</script>');
  attack(kind+'-null',kind,v=>v[key]=null);
  attack(kind+'-long',kind,v=>v[key]='x'.repeat(3000));
 }
 attack('faq-css','faq',v=>v.headingSize.mobile='url(javascript:evil())');
 attack('faq-device-injection','faq',v=>v.headingSize.evil='7px');
 attack('faq-huge','faq',v=>v.headingSize.desktop='50000px');
 attack('contact-external','contact',v=>v.supportUrl='https://evil.invalid/');
 attack('contact-script','contact',v=>v.supportUrl='javascript:alert(1)');
 attack('contact-relative','contact',v=>v.supportUrl='//evil.invalid');
 attack('pricing-negative','pricing',v=>v.amount=-5);
 attack('pricing-float','pricing',v=>v.amount=49.5);
 attack('pricing-color','pricing',v=>v.accent='red;url(https://evil.invalid)');
 attack('pricing-link','pricing',v=>v.url='data:text/html,evil');
 attack('gallery-foreign-image','gallery',v=>v.image='https://evil.invalid/x.png');
 attack('gallery-media-kind','gallery',v=>v.video='cover');
 attack('gallery-svg','gallery',v=>v.image='data:image/svg+xml,evil');
 attack('tabs-enum','tabs',v=>v.active='constructor');
 attack('tabs-bool','tabs',v=>v.active=false);
 const hostile=structuredClone(c.fixtures.faq);hostile.heading='<img src=x onerror=evil()> </script>';
 const doc=new JSDOM(c.render('faq',hostile)).window.document;
 assert.equal(doc.querySelector('[data-stable-id=faq-heading]').textContent,hostile.heading);
 assert.equal(doc.querySelectorAll('img,script').length,0);
}
function childRuntime(kind,token,origin){
 const api=window.__compiler;let seq=0,current=null,device='desktop';
 const post=payload=>parent.postMessage({...payload,token},origin);
 window.addEventListener('message',e=>{
  const m=e.data;
  if(e.source!==parent||e.origin!==origin||!m||typeof m!=='object'||Array.isArray(m)||
   Object.keys(m).sort().join(',')!=='device,kind,seq,token,values'||m.kind!=='render'||
   m.token!==token||!Number.isSafeInteger(m.seq)||m.seq<=seq||m.seq>100000||!['desktop','tablet','mobile'].includes(m.device))return;
  try{
   const html=api.render(kind,m.values,m.device);
   document.getElementById('slot').innerHTML=html;
   current=structuredClone(m.values);device=m.device;seq=m.seq;
   post({kind:'applied',seq,device,values:current});
  }catch{post({kind:'refused',seq:m.seq})}
 });
 document.addEventListener('click',e=>{
  const button=e.target.closest('button[data-action]');
  if(!button||!current||!document.getElementById('slot').contains(button))return;
  const act=button.dataset.action;
  if(kind==='faq'&&act==='toggle'){current.expanded=!current.expanded;document.getElementById('slot').innerHTML=api.render(kind,current,device);post({kind:'interaction',action:'faq',value:current.expanded})}
  else if(kind==='tabs'&&['one','two'].includes(act)){current.active=act;document.getElementById('slot').innerHTML=api.render(kind,current,device);post({kind:'interaction',action:'tabs',value:act})}
 });
 document.addEventListener('submit',e=>{
  if(kind!=='contact'||!e.target.matches('form[data-action=local-form]'))return;
  e.preventDefault();if(!e.target.checkValidity())return;
  document.querySelector('[data-stable-id=contact-success]').textContent=current.successText;
  post({kind:'interaction',action:'form',value:'local-only'});
 });
 post({kind:'ready'});
}
function parentRuntime({initial,schema,kind,lib,compiler,childCode}){
 const frame=document.getElementById('preview'),host=document.getElementById('editor');
 const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const token=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 window.__token=token;window.__init=structuredClone(initial);window.__draft=structuredClone(initial);
 window.__published=structuredClone(initial);window.__acks=[];window.__rejections=0;window.__ready=false;
 window.__seq=0;window.__device='desktop';window.__changeCount=0;
 window.__paint=()=>{
  if(window.__ready)frame.contentWindow.postMessage({kind:'render',token,seq:++window.__seq,device:window.__device,values:window.__draft},'*');
 };
 window.__deviceSet=value=>{window.__device=value;window.__paint()};
 window.__forged=(what)=>{
  const payload={kind:'render',token,seq:window.__seq+1,device:window.__device,values:structuredClone(window.__draft)};
  if(what==='extra')payload.evil=true;
  if(what==='token')payload.token='fake';
  if(what==='old')payload.seq=window.__seq;
  if(what==='css'){payload.values.headingSize={desktop:'10px',tablet:'',mobile:'url(javascript:evil())'}}
  frame.contentWindow.postMessage(payload,'*');
 };
 window.addEventListener('message',e=>{
  const m=e.data;
  if(e.source!==frame.contentWindow||e.origin!=='null'||m?.token!==token){window.__rejections++;return}
  if(m.kind==='ready'){window.__ready=true;window.__paint()}
  else if(m.kind==='applied'||m.kind==='interaction'){window.__acks.push(m)}
  else window.__rejections++;
 });
 const code='('+childCode+')('+JSON.stringify(kind)+','+JSON.stringify(token)+','+JSON.stringify(location.origin)+');';
 const csp='<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;nonce-'+nonce+'&#39;; img-src '+location.origin+'; media-src '+location.origin+'; style-src &#39;unsafe-inline&#39;; connect-src &#39;none&#39;; object-src &#39;none&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">';
 frame.srcdoc='<!doctype html><head>'+csp+'</head><body><main id="slot"></main><script nonce="'+nonce+'">'+compiler+'</scr'+'ipt><script nonce="'+nonce+'">'+code+'</scr'+'ipt></body>';
 window.__mount=()=>{
  if(lib==='jedison'){
   const J=window.__Jedison,ed=new J.Create({container:host,theme:new J.Theme(),schema,data:initial,keepMissingSchemaFields:false,showErrors:'input'});
   window.__read=()=>ed.getValue();window.__destroy=()=>{ed.destroy();host.replaceChildren()};
   ed.on('change',()=>{window.__draft=ed.getValue();window.__changeCount++;window.__paint()});
  }else{
   const R=window.__React,root=window.__createRoot(host);
   root.render(R.createElement(window.__Form,{schema,formData:initial,validator:window.__validator,onChange:e=>{window.__draft=e.formData;window.__changeCount++;window.__paint()},children:R.createElement('span',null,'Research only')}));
   window.__read=()=>window.__draft;window.__destroy=()=>root.unmount();
  }
 };
}
async function edit(page,oldV,newV){
 const found=await page.locator('#editor input').evaluateAll((list,v)=>list.filter(x=>x.value===v&&x.type!=='hidden').map(x=>x.id),String(oldV));
 assert.equal(found.length,1,'missing/ambiguous editor input '+oldV+' '+JSON.stringify(found));
 const el=page.locator('#editor input[id='+JSON.stringify(found[0])+']');
 await el.fill(String(newV));await el.dispatchEvent('change');await el.blur();
}
async function sync(page,key,want){
 await page.waitForFunction(({key,want})=>JSON.stringify(window.__draft?.[key])===JSON.stringify(want),{key,want},{timeout:12000});
 const seq=await page.evaluate(()=>window.__seq);
 await page.waitForFunction(seq=>window.__acks.some(x=>x.kind==='applied'&&x.seq>=seq),seq,{timeout:12000});
}
async function test(kind,lib){
 const page=await browser.newPage({viewport:{width:1300,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const v=c.fixtures[kind];
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.addScriptTag({content:bundles[lib]});
  await page.evaluate(parentRuntime,{kind,lib,initial:v,schema:c.jsonSchema(kind),compiler:bundles.compiler,childCode:childRuntime.toString()});
  await page.waitForFunction(()=>window.__ready&&window.__acks.some(x=>x.kind==='applied'),null,{timeout:15000});
  await page.evaluate(()=>window.__mount());
  const frame=page.frameLocator('#preview');
  await frame.locator('[data-stable-id='+JSON.stringify(kind+'-root')+']').waitFor();
  const ids=await frame.locator('[data-stable-id]').evaluateAll(els=>els.map(e=>e.dataset.stableId));
  assert.equal(new Set(ids).size,ids.length);assert.ok(ids.length>=4);
  if(kind==='faq'){
   await edit(page,v.heading,'Edited FAQ title');await sync(page,'heading','Edited FAQ title');
   await frame.locator('[data-stable-id=faq-toggle]').click();
   await page.waitForFunction(()=>window.__acks.some(m=>m.action==='faq'&&m.value===true));
   assert.equal(await frame.locator('[data-stable-id=faq-toggle]').getAttribute('aria-expanded'),'true');
   await page.evaluate(()=>window.__deviceSet('mobile'));
   await page.waitForFunction(()=>window.__acks.some(m=>m.kind==='applied'&&m.device==='mobile'));
   assert.equal(await frame.locator('[data-stable-id=faq-heading]').getAttribute('data-size'),'42px');
  }else if(kind==='contact'){
   await edit(page,v.heading,'Send a message');await sync(page,'heading','Send a message');
   await frame.locator('[data-stable-id=contact-name]').fill('Ada');
   await frame.locator('[data-stable-id=contact-email]').fill('ada@example.org');
   await frame.locator('[data-stable-id=contact-submit]').click();
   await page.waitForFunction(()=>window.__acks.some(m=>m.action==='form'));
   assert.equal(await frame.locator('[data-stable-id=contact-success]').innerText(),v.successText);
  }else if(kind==='pricing'){
   await edit(page,v.plan,'Growth plan');await sync(page,'plan','Growth plan');
   await edit(page,49,79);await sync(page,'amount',79);
   assert.equal(await frame.locator('[data-stable-id=pricing-price]').innerText(),'$79');
   await page.evaluate(()=>window.__deviceSet('mobile'));
   await page.waitForFunction(()=>window.__acks.some(m=>m.kind==='applied'&&m.device==='mobile'));
   assert.equal(await frame.locator('[data-stable-id=pricing-heading]').getAttribute('data-size'),'38px');
  }else if(kind==='gallery'){
   await edit(page,v.alt,'Edited accessible description');await sync(page,'alt','Edited accessible description');
   assert.equal(await frame.locator('[data-stable-id=gallery-image]').getAttribute('alt'),'Edited accessible description');
   await frame.locator('[data-stable-id=gallery-image]').evaluate(i=>new Promise((yes,no)=>{if(i.complete)return i.naturalWidth?yes():no(Error('image'));i.onload=yes;i.onerror=no}));
   assert.equal(await frame.locator('[data-stable-id=gallery-image]').evaluate(i=>i.naturalWidth),64);
   await frame.locator('[data-stable-id=gallery-video]').evaluate(v=>new Promise((yes,no)=>{if(v.readyState>=1)return yes();v.addEventListener('loadedmetadata',yes,{once:true});v.addEventListener('error',no,{once:true})}));
   assert.equal(await frame.locator('[data-stable-id=gallery-video]').evaluate(v=>v.videoWidth),64);
  }else if(kind==='tabs'){
   await edit(page,v.firstBody,'Edited tab content');await sync(page,'firstBody','Edited tab content');
   await frame.locator('[data-stable-id=tabs-tab-two]').click();
   await page.waitForFunction(()=>window.__acks.some(m=>m.action==='tabs'&&m.value==='two'));
   assert.equal(await frame.locator('[data-stable-id=tabs-tab-two]').getAttribute('aria-selected'),'true');
  }
  assert.deepEqual(await page.evaluate(()=>window.__published),v);
  await page.evaluate(()=>{window.__accepted=window.__acks.filter(x=>x.kind==='applied').length;for(const what of ['extra','token','old','css'])window.__forged(what)});
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.__acks.filter(x=>x.kind==='applied').length),await page.evaluate(()=>window.__accepted));
  await page.evaluate(()=>window.postMessage({kind:'applied',token:window.__token,seq:99},'*'));
  await page.frameLocator('#rogue').locator('body').evaluate((_,token)=>parent.postMessage({kind:'applied',token,seq:99},'*'),await page.evaluate(()=>window.__token));
  await page.waitForTimeout(100);
  assert.ok(await page.evaluate(()=>window.__rejections)>=2);
  const final=await page.evaluate(()=>window.__read());c.validate(kind,final);
  assert.ok(await page.evaluate(()=>window.__changeCount)>=1);
  assert.deepEqual(errors,[]);
  results.push({kind,lib,final,ids:ids.length,pageErrors:errors.length});
  await page.evaluate(()=>window.__destroy());
 }finally{await page.close()}
}
async function main(){
 staticChecks();setup();server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; frame-src 'self' about:; style-src 'unsafe-inline'; img-src 'self'; object-src 'none'"});res.end('<!doctype html><div id="editor"></div><iframe id="preview" sandbox="allow-scripts"></iframe><iframe id="rogue" sandbox="allow-scripts" srcdoc="<p>Rogue sender</p>"></iframe>');return}
  if(url.pathname.startsWith('/assets/')){const m=assets[url.pathname.slice(8)];if(m){res.writeHead(200,{'Content-Type':m.type,'X-Content-Type-Options':'nosniff'});res.end(m.data);return}}
  res.writeHead(404);res.end('Not found');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{
  for(const kind of Object.keys(c.fixtures))for(const lib of ['jedison','rjsf'])await test(kind,lib);
  for(const kind of Object.keys(c.fixtures)){
   const [j,r]=results.filter(x=>x.kind===kind);assert.deepEqual(j.final,r.final,'editor mismatch: '+kind);
  }
  console.log('STAGE1_MULTI_SECTIONS='+JSON.stringify({pass:true,profiles:Object.keys(c.fixtures),realEditors:['jedison-1.27.1','rjsf-6.11.0'],editorRuns:results.length,adversarialASTRejected:negative.length,editorModelParity:true,realImageVideo:true,formsSubmitLocalOnly:true,previewSandboxed:true,results:results.map(({kind,lib,ids,pageErrors})=>({kind,lib,ids,pageErrors})),limits:'Research fixed trusted templates and local HTTP media, NOT arbitrary AI HTML/JS, production form delivery/auth/security or product acceptance'}));
 }finally{await browser.close();await new Promise(r=>server.close(r))}
}
main().catch(e=>{console.error('STAGE1_MULTI_SECTIONS_FAIL='+String(e.stack||e));process.exitCode=1}).finally(()=>fs.rmSync(dir,{recursive:true,force:true}));
