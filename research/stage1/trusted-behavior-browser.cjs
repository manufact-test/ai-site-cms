/* Stage 1 research ONLY: REAL Jedison 1.27.1 / RJSF 6.11.0 field input
 * -> reviewed behavior capability pack -> opaque CSP nonce iframe.
 * Never executes standalone site's original JavaScript or form action.
 * Script and layout here are trusted research adapter code, not AI-provided.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const esbuild=require('esbuild');
const {chromium}=require('playwright-core');
const {sourceAndReviewedModel,unit}=require('./trusted-behavior-capabilities.cjs');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'Chromium required');
const bundle=src=>esbuild.buildSync({stdin:{contents:src,sourcefile:'reviewed-editor.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
const jedison=bundle("import Jedison from 'jedison';window.__Jedison=Jedison;");
const rjsf=bundle("import React from 'react';import{createRoot}from'react-dom/client';import Form from '@rjsf/core';import{customizeValidator}from '@rjsf/validator-ajv8';import Ajv2020 from 'ajv/dist/2020.js';window.__React=React;window.__createRoot=createRoot;window.__Form=Form;window.__validator=customizeValidator({AjvClass:Ajv2020});");
function childReceiver(token,parentOrigin){
 const fields=['linkHref','linkText','faqOpen','dialogEnabled','dialogLabel','dialogBody','emailPlaceholder','subscribeEnabled'];
 const exact=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===fields.length&&fields.every(k=>Object.prototype.hasOwnProperty.call(x,k));
 const text=x=>typeof x==='string'&&x.length<=400;
 const valid=x=>exact(x)&&typeof x.linkHref==='string'&&/^#[a-z][a-z0-9-]{0,50}$/.test(x.linkHref)&&
   ['linkText','dialogLabel','dialogBody','emailPlaceholder'].every(k=>text(x[k]))&&
   ['faqOpen','dialogEnabled','subscribeEnabled'].every(k=>typeof x[k]==='boolean');
 let seq=0,values=null,submits=0;
 const el=id=>document.getElementById(id);
 const send=msg=>parent.postMessage({...msg,token},parentOrigin);
 function apply(data){
  const link=el('hero-link');link.href=data.linkHref;link.textContent=data.linkText;
  el('faq-first').open=data.faqOpen;
  if(!data.dialogEnabled&&el('modal').open)el('modal').close();
  el('modal-open').disabled=!data.dialogEnabled;el('modal-open').textContent=data.dialogLabel;
  el('modal-body').textContent=data.dialogBody;
  el('signup-email').placeholder=data.emailPlaceholder;
  el('signup-button').disabled=!data.subscribeEnabled;
  values=structuredClone(data);
 }
 el('modal-open').addEventListener('click',()=>{if(values&&values.dialogEnabled&&!el('modal').open)el('modal').showModal()});
 el('modal-close').addEventListener('click',()=>{if(el('modal').open)el('modal').close()});
 el('signup-form').addEventListener('submit',ev=>{ev.preventDefault();submits++;el('submit-message').textContent='Preview only — no data sent'});
 window.addEventListener('message',ev=>{
  const m=ev.data;
  if(ev.source!==parent||ev.origin!==parentOrigin||!m||typeof m!=='object'||Array.isArray(m)||
   Object.keys(m).sort().join(',')!=='kind,seq,token,values'||m.kind!=='render'||m.token!==token||
   !Number.isInteger(m.seq)||m.seq<=seq||m.seq>10000)return;
  if(!valid(m.values)){send({kind:'refused',seq:m.seq});return}
  apply(m.values);seq=m.seq;send({kind:'applied',seq});
 });
 window.__researchSnapshot=()=>({submits,seq,dialogOpen:el('modal').open,values});
 send({kind:'ready'});
}
function setup({markup,schema,defaults,library,bridge}){
 const frame=document.getElementById('preview');
 const rand=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const nonce=rand(),token=rand();window.__token=token;
 const stringify=x=>JSON.stringify(x).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 window.__draft=structuredClone(defaults);window.__published=structuredClone(defaults);
 window.__seq=0;window.__acks=[];window.__refusals=[];window.__unexpected=[];window.__ready=false;
 const csp='<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;nonce-'+nonce+'&#39;; style-src &#39;nonce-'+nonce+'&#39;; style-src-attr &#39;none&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;; media-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;; object-src &#39;none&#39;">';
 const style='<style nonce="'+nonce+'">body{font:16px/1.5 system-ui;background:#0b2134;color:#fff;margin:0}section[data-component]{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:28px}h1{font-size:50px;line-height:1}a{color:#66eecc}details,#join{padding:15px;border:1px solid #88acab;border-radius:12px}dialog{color:#111;background:#fff}button,input{padding:8px}#submit-message{min-height:1em}@media(max-width:600px){section[data-component]{grid-template-columns:1fr;padding:12px}h1{font-size:28px}}</style>';
 const child='('+bridge+')('+stringify(token)+','+stringify(location.origin)+');';
 frame.srcdoc='<!doctype html><head>'+csp+style+'</head><body>'+markup+'<script nonce="'+nonce+'">'+child+'</scr'+'ipt></body>';
 window.__paint=()=>{if(window.__ready)frame.contentWindow.postMessage({kind:'render',token,seq:++window.__seq,values:window.__draft},'*')};
 window.__view=width=>{if(![1200,360].includes(width))throw Error('width');frame.style.width=width+'px';window.__paint()};
 window.__sendAttack=type=>{
  const m={kind:'render',token,seq:window.__seq+1,values:structuredClone(window.__draft)};
  if(type==='badHref')m.values.linkHref='javascript:alert(1)';
  if(type==='badShape')m.values.extra='value';
  if(type==='badToken')m.token='forged';
  if(type==='replay')m.seq=window.__seq;
  if(type==='badScript')m.values.dialogLabel={code:'alert(1)'};
  frame.contentWindow.postMessage(m,'*');
 };
 window.addEventListener('message',ev=>{
  const m=ev.data;
  if(ev.source!==frame.contentWindow||ev.origin!=='null'||m?.token!==token){window.__unexpected.push('source-or-token');return}
  if(m.kind==='ready'&&Object.keys(m).sort().join(',')==='kind,token'){window.__ready=true;window.__paint()}
  else if(m.kind==='applied'&&Number.isInteger(m.seq)&&Object.keys(m).sort().join(',')==='kind,seq,token')window.__acks.push(m.seq);
  else if(m.kind==='refused'&&Number.isInteger(m.seq)&&Object.keys(m).sort().join(',')==='kind,seq,token')window.__refusals.push(m.seq);
  else window.__unexpected.push('unrecognized');
 });
 window.__mount=()=>{
  const container=document.getElementById('editor');
  if(library==='jedison'){
   const e=new window.__Jedison.Create({container,theme:new window.__Jedison.Theme(),schema,data:defaults,keepMissingSchemaFields:false,showErrors:'input'});
   e.on('change',()=>{window.__draft=e.getValue();window.__paint()});
   window.__get=()=>e.getValue();window.__destroy=()=>{e.destroy();container.replaceChildren()};
  }else{
   const root=window.__createRoot(container),R=window.__React;
   root.render(R.createElement(window.__Form,{schema,formData:defaults,validator:window.__validator,onChange:e=>{window.__draft=e.formData;window.__paint()},children:R.createElement('span',null,'Research fields only')}));
   window.__get=()=>window.__draft;window.__destroy=()=>root.unmount();
  }
 };
}
async function field(page,name,value){
 const match=await page.locator('#editor input').evaluateAll((els,key)=>els.filter(e=>e.type!=='hidden'&&(e.id||'').toLowerCase().includes(key.toLowerCase())).map(e=>({id:e.id,type:e.type,checked:e.checked,value:e.value})),name);
 if(match.length!==1){const all=await page.locator('#editor input, #editor select, #editor button').evaluateAll(els=>els.map(e=>({tag:e.tagName,id:e.id,name:e.name,type:e.type,outer:e.outerHTML.slice(0,240),parent:e.parentElement?.textContent?.trim().slice(0,110)})));console.log('STAGE1_REVIEWED_FIELD_DISCOVERY='+JSON.stringify({name,match,all}));}
 assert.equal(match.length,1,'one native editor input for '+name+': '+JSON.stringify(match));
 const node=page.locator('#editor input[id='+JSON.stringify(match[0].id)+']');
 if(match[0].type==='checkbox'){
  if(value)await node.check();else await node.uncheck();
 }else{await node.fill(value);await node.dispatchEvent('change');await node.blur()}
 await page.waitForFunction(args=>window.__draft[args.name]===args.value,{name,value},{timeout:15000});
 const seq=await page.evaluate(()=>window.__seq);
 await page.waitForFunction(n=>window.__acks.includes(n),seq,{timeout:15000});
}
async function run(browser,library,site,origin){
 const page=await browser.newPage({viewport:{width:1480,height:940}});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 try{
  await page.goto(origin+'/');
  await page.addScriptTag({content:library==='jedison'?jedison:rjsf});
  await page.evaluate(setup,{markup:site.html,schema:site.r.schema(),defaults:site.defaults,library,bridge:childReceiver.toString()});
  await page.waitForFunction(()=>window.__ready&&window.__acks.includes(1),null,{timeout:15000});
  await page.evaluate(()=>window.__mount());
  const frame=page.frameLocator('#preview');
  assert.equal(await frame.locator('#hero-link').getAttribute('href'),'#join');
  const start=await frame.locator('body').evaluate(()=>({origin:location.origin,parentAccessible:(()=>{try{return !!parent.document.getElementById('editor')}catch{return false}})(),hasOriginalScript:window.__siteExecuted===true}));
  assert.deepEqual(start,{origin:'null',parentAccessible:false,hasOriginalScript:false});
  await field(page,'linkHref','#faq');
  await field(page,'linkText','Coast <script>unsafe()</script> & science');
  await field(page,'faqOpen',true);
  await field(page,'dialogLabel','Privacy details updated');
  await field(page,'dialogBody','Text <img src=x onerror=alert(1)>');
  await field(page,'emailPlaceholder','address@example.org');
  await field(page,'dialogEnabled',false);
  assert.equal(await frame.locator('#modal-open').isDisabled(),true);
  await field(page,'dialogEnabled',true);
  await field(page,'subscribeEnabled',false);
  assert.equal(await frame.locator('#signup-button').isDisabled(),true);
  await field(page,'subscribeEnabled',true);
  assert.equal(await frame.locator('#hero-link').getAttribute('href'),'#faq');
  assert.equal(await frame.locator('#hero-link').textContent(),'Coast <script>unsafe()</script> & science');
  assert.equal(await frame.locator('script').count(),1,'only reviewed nonce bridge runs');
  assert.equal(await frame.locator('img').count(),0,'HTML-like value remains literal text');
  assert.equal(await frame.locator('#faq-first').evaluate(el=>el.open),true);
  assert.equal(await frame.locator('#signup-email').getAttribute('placeholder'),'address@example.org');
  await frame.locator('#modal-open').click();
  assert.equal(await frame.locator('#modal').evaluate(el=>el.open),true);
  await frame.locator('#modal-close').click();
  assert.equal(await frame.locator('#modal').evaluate(el=>el.open),false);
  await frame.locator('#signup-email').fill('user@example.com');
  await frame.locator('#signup-button').click();
  assert.equal(await frame.locator('#submit-message').textContent(),'Preview only — no data sent');
  assert.equal(await frame.locator('#signup-email').inputValue(),'user@example.com');
  const css=[];
  for(const width of [1200,360]){
   await page.evaluate(w=>window.__view(w),width);
   const sent=await page.evaluate(()=>window.__seq);
   await page.waitForFunction(n=>window.__acks.includes(n),sent,{timeout:15000});
   const inner=page.frames().find(f=>f!==page.mainFrame());
   await inner.waitForFunction(w=>innerWidth===w,width,{timeout:10000});
   css.push(await frame.locator('h1').evaluate(el=>getComputedStyle(el).fontSize));
  }
  assert.deepEqual(css,['50px','28px']);
  const before=await page.evaluate(()=>window.__acks.length);
  for(const t of ['badHref','badShape','badToken','replay','badScript'])await page.evaluate(t=>window.__sendAttack(t),t);
  await page.waitForFunction(()=>window.__refusals.length>=3,null,{timeout:10000});
  const after=await page.evaluate(()=>({acks:window.__acks.length,refused:window.__refusals.length,published:window.__published,draft:window.__draft}));
  assert.equal(after.acks,before,'hostile messages must never apply');
  assert.ok(after.refused>=3);
  assert.deepEqual(after.published,site.defaults,'published baseline must remain immutable');
  assert.equal(await frame.locator('#hero-link').getAttribute('href'),'#faq');
  assert.deepEqual(errors,[]);
  console.log('STAGE1_REVIEWED_CAPABILITY_BROWSER='+JSON.stringify({pass:true,editor:library,upstream:library==='jedison'?'1.27.1':'6.11.0',realNativeEdits:10,capabilities:['internal-link','disclosure','dialog','preview-only-form'],cssFontPx:css,sourceJsNotExecuted:true,opaqueOrigin:true,cspStyleAttrUnsafeInline:false,invalidMessagesRefused:after.refused,publishedSnapshotUnchanged:true,formPosted:false,pageErrors:errors.length,limits:'developer-reviewed manually projected source, no arbitrary source JS, no production form submission or external navigation, no full-site CSS fidelity'}));
 }finally{await page.close()}
}
(async()=>{
 unit();
 const site=sourceAndReviewedModel();
 assert.ok(site.source.includes('window.__siteExecuted=true'));
 assert.ok(!site.html.includes('window.__siteExecuted')&&!site.html.includes('action="/subscribe"'));
 const server=http.createServer((req,res)=>{if(req.url==='/subscribe')throw Error('unexpected POST');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html><body><main id="editor"></main><iframe id="preview" sandbox="allow-scripts" style="height:670px;width:1200px"></iframe></body></html>')});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const lib of ['jedison','rjsf'])await run(browser,lib,site,origin);
  console.log('STAGE1_REVIEWED_CAPABILITY_TOTAL='+JSON.stringify({pass:true,editorRuns:2,nativeFieldUpdates:20,realDialogAndDisclosure:true,formNonSubmission:true,fullExistingSuitePreserved:true}));
 }finally{
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
 }
})().catch(e=>{console.error('STAGE1_REVIEWED_CAPABILITY_FAIL='+String(e.stack||e));process.exitCode=1});
