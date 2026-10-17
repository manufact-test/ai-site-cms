/* AI Site CMS stage 1 ONLY: matched Jedison / RJSF 12-stable-ID browser edit-session probe.
 * Not a product implementation, not a statistically reliable benchmark. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib');
const esbuild=require('esbuild'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server'),{chromium}=require('playwright-core');
const {schema,initial,Section}=require('./adapter-section.cjs');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
if(!chrome)throw Error('Chromium required');
const raw=renderToStaticMarkup(React.createElement(Section,{kind:'session-fixture'}));
const N_CYCLES=8,EDIT_RUNS=32;
function bundle(name){
 const imports=name==='jedison'
 ? "import Jedison from 'jedison';window.__lib=Jedison;"
 : "import React from 'react';import{createRoot}from'react-dom/client';import Form from '@rjsf/core';import{customizeValidator}from '@rjsf/validator-ajv8';import Ajv2020 from 'ajv/dist/2020.js';window.__React=React;window.__createRoot=createRoot;window.__Form=Form;window.__validator=customizeValidator({AjvClass:Ajv2020});";
 const js=esbuild.buildSync({stdin:{contents:imports,sourcefile:'matched-'+name+'.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
 return {js,gzipBytes:zlib.gzipSync(Buffer.from(js),{level:9}).length};
}
function initialize(){
 const host=document.getElementById('editor'),iframe=document.getElementById('preview');
 window.__current=null;window.__published=structuredClone(window.__initial);window.__changes=0;
 const token=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
 const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
 window.__probe={token,ready:false,acks:[],device:'desktop'};
 const bridge=[
  'const token='+JSON.stringify(token)+';',
  'function el(s){return document.querySelector("[data-stable-id=hero-"+s+"]")}',
  'window.addEventListener("message",e=>{const m=e.data;if(e.source!==parent||e.origin!=="null"||m?.kind!=="render"||m.token!==token||!m.state||typeof m.state.title!=="string"||m.state.title.length>500||!["desktop","tablet","mobile"].includes(m.device))return;',
  'const d=m.state;',
  'for(const [id,value] of [["title",d.title],["primary",d.primary],["feature-0",d.features?.[0]],["card-0",d.cards?.[0]],["stat-0",d.stats?.[0]]]){if(typeof value!=="string"||value.length>500)return;el(id).textContent=value}',
  'const f=d.font;if(!f||typeof f.desktop!=="string"||!/^\\d{1,3}px$/.test(f.desktop)||["tablet","mobile"].some(k=>typeof f[k]!=="string"||!/^(?:|\\d{1,3}px)$/.test(f[k])))return;',
  'const size=(m.device==="mobile"&&f.mobile)||(m.device!=="desktop"&&f.tablet)||f.desktop;',
  'el("title").style.fontSize=size;',
  'parent.postMessage({kind:"applied",token,title:d.title,font:size,device:m.device},"*");',
  '});parent.postMessage({kind:"ready",token},"*");'
 ].join('');
 const csp='<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;nonce-'+nonce+'&#39;; style-src &#39;none&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;">';
 iframe.srcdoc='<!doctype html><html><head>'+csp+'</head><body>'+window.__markup+'<script nonce="'+nonce+'">'+bridge+'</scr'+'ipt></body></html>';
 window.__device=device=>{if(!['desktop','tablet','mobile'].includes(device))throw Error('bad device');window.__probe.device=device;window.__paint()};
 window.__paint=()=>{if(window.__probe.ready&&window.__current)iframe.contentWindow.postMessage({kind:'render',token,state:window.__current,device:window.__probe.device},'*')};
 window.addEventListener('message',e=>{
  const m=e.data;
  if(e.source!==iframe.contentWindow||e.origin!=='null'||m?.token!==token)return;
  if(m.kind==='ready'){window.__probe.ready=true;window.__paint()}
  if(m.kind==='applied')window.__probe.acks.push(m);
 });
 window.__mount=(d)=>{
  window.__current=structuredClone(d);
  window.__changes=0;
  if(window.__library==='jedison'){
   const ed=new window.__lib.Create({container:host,theme:new window.__lib.Theme(),schema:window.__schema,data:d,keepMissingSchemaFields:false,showErrors:'input'});
   window.__get=()=>ed.getValue();
   window.__unmount=()=>{ed.destroy();host.replaceChildren()};
   ed.on('change',()=>{window.__changes++;window.__current=ed.getValue();window.__paint()});
  }else{
   const R=window.__React,root=window.__createRoot(host);
   root.render(R.createElement(window.__Form,{schema:window.__schema,formData:d,validator:window.__validator,onChange:e=>{window.__current=e.formData;window.__changes++;window.__paint()},children:R.createElement('span',null,'research form')}));
   window.__get=()=>window.__current;
   window.__unmount=()=>root.unmount();
  }
  window.__paint();
 };
}
async function current(page){return page.evaluate(()=>window.__get())}
async function editByValue(page,oldValue,newValue,context){
 const matches=await page.locator('#editor input').evaluateAll((elements,old)=>elements.filter(e=>e.type!=='hidden'&&e.value===old).map(e=>({id:e.id,type:e.type,value:e.value})),oldValue);
 assert.equal(matches.length,1,context+' input not unique: '+oldValue+' / '+JSON.stringify(matches));
 // Locate by exact original field ID; avoids selector conventions varying across editor libraries.
 const target=page.locator('#editor input[id='+JSON.stringify(matches[0].id)+']');
 await target.fill(newValue);
 await target.dispatchEvent('change');
 await target.blur();
}
const clone=o=>JSON.parse(JSON.stringify(o));
async function runVariant(name,browser){
 const {js,gzipBytes}=bundle(name);
 const page=await browser.newPage({viewport:{width:1450,height:980}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const samples=[],observed=[];
 try{
  await page.setContent('<!doctype html><html><body><nav id="index"></nav><div id="editor"></div><iframe id="preview" sandbox="allow-scripts" style="width:800px;height:520px"></iframe></body></html>');
  await page.evaluate(({initial,schema,markup,name})=>{
   window.__initial=initial;window.__schema=schema;window.__markup=markup;window.__library=name;
   for(let i=0;i<50;i++){const el=document.createElement('div');el.textContent='Metadata only '+i;document.querySelector('#index').appendChild(el)}
  },{initial,schema,markup:raw,name});
  await page.addScriptTag({content:js});await page.evaluate(initialize);
  await page.waitForFunction(()=>window.__probe?.ready,null,{timeout:9000});
  assert.equal(await page.locator('iframe').count(),1);
  assert.equal(await page.locator('#index>div').count(),50);
  const frame=page.frameLocator('#preview');
  assert.equal(await frame.locator('[data-stable-id]').count(),12);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const heap=async()=>{
   await cdp.send('HeapProfiler.collectGarbage');
   const metrics=(await cdp.send('Performance.getMetrics')).metrics;
   const value=metrics.find(m=>m.name==='JSHeapUsedSize')?.value;
   return typeof value==='number'?Math.round(value):null;
  };
  for(let cycle=0;cycle<N_CYCLES;cycle++){
   const expected=clone(initial);
   const start=performance.now();
   const t0=Date.now();
   await page.evaluate(({initial})=>window.__mount(initial),{initial});
   await page.waitForFunction(()=>document.querySelectorAll('#editor input').length>=10,null,{timeout:11000});
   await page.waitForFunction(()=>window.__probe.acks.length>0,null,{timeout:11000});
   const first=Date.now()-t0;
   const label='cycle '+cycle+' '+name;
   async function useValue(oldValue,newValue,apply){
    await editByValue(page,oldValue,newValue,label);
    apply(expected);
    await page.waitForFunction(d=>JSON.stringify(window.__get())===JSON.stringify(d),expected,{timeout:6000});
   }
   await useValue(initial.title,'Revised owner headline '+cycle,d=>d.title='Revised owner headline '+cycle);
   await useValue(initial.lead,'Updated descriptive paragraph '+cycle,d=>d.lead='Updated descriptive paragraph '+cycle);
   await useValue(initial.primary,'Owner CTA '+cycle,d=>d.primary='Owner CTA '+cycle);
   await useValue(initial.secondary,'Secondary CTA '+cycle,d=>d.secondary='Secondary CTA '+cycle);
   await useValue(initial.features[0],'Owner feature '+cycle,d=>d.features[0]='Owner feature '+cycle);
   await useValue(initial.cards[0],'Owner card '+cycle,d=>d.cards[0]='Owner card '+cycle);
   await useValue(initial.stats[0],'Owner stat '+cycle,d=>d.stats[0]='Owner stat '+cycle);
   await useValue('48px','52px',d=>d.font.tablet='52px');
   await page.evaluate(()=>window.__device('mobile'));
   await page.waitForFunction(()=>window.__probe.acks.some(a=>a.font==='52px'&&a.device==='mobile'),null,{timeout:5000});
   // Empty mobile field selected by responsive field ID: never infer from order.
   const mi=await page.locator('#editor input').evaluateAll(xs=>xs.filter(x=>x.id.toLowerCase().includes('mobile')).map(x=>({id:x.id,value:x.value})));
   assert.equal(mi.length,1,label+' mobile field not unique '+JSON.stringify(mi));assert.equal(mi[0].value,'');
   const mobile=page.locator('#editor input[id='+JSON.stringify(mi[0].id)+']');
   await mobile.fill('32px');await mobile.dispatchEvent('change');await mobile.blur();
   expected.font.mobile='32px';
   await page.waitForFunction(d=>JSON.stringify(window.__get())===JSON.stringify(d),expected,{timeout:6000});
   const suffix=' - repeated edit ';
   for(let k=0;k<EDIT_RUNS;k++){
    const old=expected.title,next='Revised owner headline '+cycle+suffix+k;
    await useValue(old,next,d=>d.title=next);
   }
   await page.waitForFunction(d=>window.__probe.acks.some(a=>a.title===d.title&&a.device==='mobile'&&a.font==='32px'),expected,{timeout:7500});
   assert.equal(await frame.locator('[data-stable-id="hero-title"]').innerText(),expected.title);
   assert.equal(await frame.locator('[data-stable-id="hero-primary"]').innerText(),expected.primary);
   assert.equal(await frame.locator('[data-stable-id="hero-card-0"]').innerText(),expected.cards[0]);
   assert.equal(await frame.locator('[data-stable-id="hero-feature-0"]').innerText(),expected.features[0]);
   assert.equal(await frame.locator('[data-stable-id="hero-stat-0"]').innerText(),expected.stats[0]);
   assert.equal(await frame.locator('[data-stable-id="hero-title"]').evaluate(el=>el.style.fontSize),'32px');
   assert.equal(await page.evaluate(()=>window.__published.title),initial.title);
   assert.equal(await page.locator('iframe').count(),1);
   observed.push(await current(page));
   const heapLive=await heap();
   const changes=await page.evaluate(()=>window.__changes);
   await page.evaluate(()=>window.__unmount());
   await page.waitForFunction(()=>document.querySelectorAll('#editor input').length===0,null,{timeout:6500});
   const heapAfter=await heap();
   samples.push({cycle,mountToInputsMs:first,cycleWallMs:Math.round(performance.now()-start),changeEvents:changes,heapLiveBytes:heapLive,heapAfterUnmountGcBytes:heapAfter});
  }
  assert.equal(samples.length,N_CYCLES);assert.ok(samples.every(s=>s.changeEvents>=EDIT_RUNS+7));
  assert.deepEqual(errors,[]);
  await cdp.detach();
  return {name,gzipBytes,samples,observed,pageErrors:errors.length,metaSections:50,iframes:1,uiChangesPerCycle:EDIT_RUNS+8};
 }finally{await page.close()}
}
(async()=>{
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--enable-precise-memory-info']});
 try{
  const tests=[];
  const order=process.env.STAGE1_EDITOR_ORDER==='reverse'?['rjsf','jedison']:['jedison','rjsf'];
  for(const name of order)tests.push(await runVariant(name,browser));
  assert.deepEqual(tests[0].observed,tests[1].observed,'editor output divergence on the same actions');
  console.log('STAGE1_MATCHED_EDITOR_SESSION='+JSON.stringify({pass:true,cycles:N_CYCLES,repeatedEditsPerCycle:EDIT_RUNS,runOrder:order,schemaProperties:Object.keys(schema.properties).length,stableIds:12,tests:tests.map(t=>({name:t.name,gzipBytes:t.gzipBytes,samples:t.samples,pageErrors:t.pageErrors,metaSections:t.metaSections,iframes:t.iframes})),outputsIdentical:true,metricsLimits:'One GitHub runner Chromium process, 8 cycles per editor in each order per separate run, sparse CDP GC snapshots; no hours-long session, no SLO, production conclusions or statistical significance; no server/hosting proof'}));
 }finally{await browser.close()}
})().catch(e=>{console.error('STAGE1_MATCHED_EDITOR_SESSION_FAIL='+String(e.stack||e));process.exitCode=1});
