/* Stage 1 research ONLY: real upstream advanced fields and one-block preview. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const esbuild=require('esbuild');
const {chromium}=require('playwright-core');

const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
if(!chrome)throw new Error('Chrome required: do not report skipped test as success');
const px={type:'string',pattern:'^[0-9]+px$',title:'Size in pixels'};
const schema={
 type:'object',title:'Hero settings',additionalProperties:false,
 properties:{
  title:{type:'string',title:'Heading'},
  responsive:{type:'object',title:'Responsive sizes',additionalProperties:false,properties:{
    desktop:{...px,title:'Desktop font size'},tablet:{...px,title:'Tablet font size'},mobile:{...px,title:'Mobile font size'}}},
  shadow:{type:'object',title:'Shadow',additionalProperties:false,properties:{
    x:{type:'integer',title:'Shadow X'},y:{type:'integer',title:'Shadow Y'},blur:{type:'integer',minimum:0,title:'Shadow blur'},
    color:{type:'string',title:'Shadow color',pattern:'^#[a-fA-F0-9]{6}$'}}},
  animation:{type:'object',title:'Animation',additionalProperties:false,properties:{
    enabled:{type:'boolean',title:'Animation enabled'},duration:{type:'integer',minimum:0,title:'Animation duration'},
    easing:{type:'string',title:'Animation easing',enum:['ease','ease-in','linear']}}}
 }
};
const data={title:'Hello Hero',responsive:{desktop:'64px',tablet:'48px',mobile:'36px'},
 shadow:{x:0,y:5,blur:10,color:'#000000'},animation:{enabled:true,duration:400,easing:'ease'}};

function bundle(src){return esbuild.buildSync({stdin:{contents:src,sourcefile:'advanced-entry.js',resolveDir:__dirname,loader:'js'},
 absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'
}).outputFiles[0].text;}

async function run(name,browser){
 const page=await browser.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(String(e.message)));
 await page.setContent('<!doctype html><html><body><aside id="index"></aside><section id="editor"></section><iframe id="preview" sandbox="allow-scripts"></iframe></body></html>');
 await page.evaluate(()=>{
  const iframe=document.getElementById('preview');
  window.__proof={token:'research-only-token',ready:false,acks:[],dirty:false,saved:false,published:{title:'Hello Hero'}};
  const index=document.getElementById('index');
  for(let i=0;i<50;i++){const el=document.createElement('div');el.textContent='Section '+i;index.appendChild(el);}
  window.addEventListener('message',event=>{
   if(event.source!==iframe.contentWindow||!event.data||event.data.token!==window.__proof.token)return;
   if(event.data.kind==='ready')window.__proof.ready=true;
   if(event.data.kind==='applied')window.__proof.acks.push(event.data.value);
  });
  const childScript=[
   'window.addEventListener("message",function(event){',
   'if(!event.data||event.data.token!=="research-only-token"||event.data.kind!=="style")return;',
   'document.getElementById("hero-title").style.fontSize=event.data.value;',
   'parent.postMessage({kind:"applied",token:"research-only-token",value:event.data.value},"*");',
   '});',
   'parent.postMessage({kind:"ready",token:"research-only-token"},"*");'
  ].join('');
  iframe.srcdoc='<html><body><h1 id="hero-title">Hello Hero</h1><script>'+childScript+'</scr'+'ipt></body></html>';
  window.__sendPreview=value=>{if(window.__proof.ready)iframe.contentWindow.postMessage({kind:'style',token:window.__proof.token,value},'*')};
 });
 await page.waitForFunction(()=>window.__proof&&window.__proof.ready,null,{timeout:8000});
 const entry=name==='jedison'?
   "import Jedison from 'jedison';window.__mount=(el,s,d)=>{const ed=new Jedison.Create({container:el,theme:new Jedison.Theme(),schema:s,data:d,keepMissingSchemaFields:true,showErrors:'input'});window.__get=()=>ed.getValue();ed.on('change',()=>{window.__latest=ed.getValue();window.__proof.dirty=true;window.__sendPreview(window.__latest.responsive.desktop)});window.__dispose=()=>ed.destroy()};" :
   "import React from 'react';import{createRoot}from'react-dom/client';import Form from '@rjsf/core';import validator from '@rjsf/validator-ajv8';window.__mount=(el,s,d)=>{const root=createRoot(el);window.__get=()=>window.__latest||d;root.render(React.createElement(Form,{schema:s,formData:d,validator,onChange:e=>{window.__latest=e.formData;window.__proof.dirty=true;window.__sendPreview(e.formData.responsive.desktop)},children:React.createElement('span',null,'research only')}));window.__dispose=()=>root.unmount()};";
 await page.addScriptTag({content:bundle(entry)});
 await page.evaluate(({schema,data})=>window.__mount(document.getElementById('editor'),schema,data),{schema,data});
 await page.waitForFunction(()=>document.querySelectorAll('#editor input').length>=7,null,{timeout:9000});
 const fields=await page.locator('#editor input').evaluateAll(xs=>xs.map(x=>({id:x.id,type:x.type,value:x.value})));
 assert.equal((await page.evaluate(()=>window.__get())).responsive.desktop,'64px');
 assert.equal(await page.locator('#index>div').count(),50);
 assert.equal(await page.locator('iframe').count(),1);
 async function edit(oldVal,newVal){
   const dom=await page.locator('#editor input').evaluateAll(xs=>xs.map(x=>({id:x.id,value:x.value,type:x.type})));
   const idx=dom.findIndex(x=>x.value===oldVal&&x.type!=='hidden');assert.ok(idx>=0,name+' missing value '+oldVal+' DOM='+JSON.stringify(dom));
   const el=page.locator('#editor input').nth(idx);
   await el.fill(newVal);await el.dispatchEvent('input');await el.dispatchEvent('change');await el.blur();
 }
 await edit('64px','58px');
 await page.waitForFunction(()=>window.__get()?.responsive?.desktop==='58px',null,{timeout:9000});
 await page.waitForFunction(()=>window.__proof.acks.includes('58px'),null,{timeout:9000});
 await edit('10','18');
 await page.waitForFunction(()=>window.__get()?.shadow?.blur===18,null,{timeout:9000});
 await edit('400','650');
 await page.waitForFunction(()=>window.__get()?.animation?.duration===650,null,{timeout:9000});
 const output=await page.evaluate(()=>window.__get());
 assert.equal(output.responsive.tablet,'48px');
 assert.equal(output.responsive.mobile,'36px');
 assert.equal(output.shadow.blur,18);
 assert.equal(output.animation.duration,650);
 assert.equal(await page.locator('iframe').count(),1);
 assert.equal(await page.locator('#index>div').count(),50);
 assert.ok(!(await page.locator('#editor').innerText()).includes('borderRadius'));
 assert.equal(await page.evaluate(()=>window.__proof.saved),false);
 assert.equal(await page.evaluate(()=>window.__proof.published.title),'Hello Hero');
 assert.equal(await page.evaluate(()=>window.__proof.dirty),true);
 assert.deepEqual(errors,[]);
 await page.evaluate(()=>window.__dispose());
 await page.close();
 return{library:name,pass:true,fieldCount:fields.length,desktopBefore:'64px',desktopAfter:output.responsive.desktop,
   tabletRetained:output.responsive.tablet,mobileRetained:output.responsive.mobile,shadowBlur:output.shadow.blur,
   animationDuration:output.animation.duration,oneIframe:true,metaSections:50,previewAck:'58px',saved:false};
}
(async()=>{
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const findings=[];
  for(const name of ['jedison','rjsf']){try{findings.push(await run(name,browser))}catch(e){findings.push({library:name,pass:false,error:String(e.stack||e)})}}
  console.log('STAGE1_ADVANCED_BROWSER_RESULTS='+JSON.stringify(findings));
  assert.ok(findings.every(x=>x.pass),'Advanced checks have failures');
 }finally{await browser.close()}
})().catch(e=>{console.error('STAGE1_ADVANCED_BROWSER_FAILURE='+String(e.stack||e));process.exitCode=1});
