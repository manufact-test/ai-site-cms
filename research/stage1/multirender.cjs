/* Stage 1 non-production: three rendered section formats in isolated Chromium preview. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{chromium}=require('playwright-core');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
if(!chrome)throw Error('Chrome required');
const php=spawnSync('php',['-r','echo \x27<section data-kind="php"><h1 id="hero">PHP Hero</h1></section>\x27;'],{encoding:'utf8'});
assert.equal(php.status,0,'PHP CLI rendering must succeed: '+php.stderr);
const variants={
 html:'<section data-kind="html"><h1 id="hero">HTML Hero</h1></section>',
 php:php.stdout,
 react:renderToStaticMarkup(React.createElement('section',{'data-kind':'react'},React.createElement('h1',{id:'hero'},'React Hero')))
};
function setup(content,kind){
 const frame=document.getElementById('preview');const token='test-token-'+kind;window.testState={ack:[],ready:false};
 const parentOrigin=location.origin;
 window.addEventListener('message',e=>{const m=e.data;if(e.source!==frame.contentWindow||e.origin!=='null'||!m||m.token!==token)return;if(m.kind==='ready')window.testState.ready=true;if(m.kind==='applied')window.testState.ack.push(m.value)});
 const script=[
  'const token='+JSON.stringify(token)+';const parentOrigin='+JSON.stringify(parentOrigin)+';',
  'window.addEventListener("message",e=>{const m=e.data;',
  'if(e.origin!==parentOrigin||e.source!==parent||!m||m.kind!=="style"||m.token!==token||typeof m.value!=="string"||!/^[0-9]{1,3}px$/.test(m.value))return;',
  'document.getElementById("hero").style.fontSize=m.value;',
  'parent.postMessage({kind:"applied",token,value:m.value},parentOrigin)});',
  'parent.postMessage({kind:"ready",token},parentOrigin);'
 ].join('');
 frame.srcdoc='<html><head><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;unsafe-inline&#39;; style-src &#39;unsafe-inline&#39;"></head><body>'+content+'<script>'+script+'</scr'+'ipt></body></html>';
 window.apply=()=>frame.contentWindow.postMessage({kind:'style',token,value:'58px'},'*');
}
(async()=>{
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const out=[];
  for(const [kind,markup] of Object.entries(variants)){
   const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('about:blank');
   await page.setContent('<!doctype html><html><body><iframe id="preview" sandbox="allow-scripts"></iframe></body></html>');
   await page.evaluate(({markup,kind})=>window.__input={markup,kind},{markup,kind});
   await page.evaluate(({markup,kind})=>{const frame=document.getElementById('preview');const token='test-'+kind;
    window.proof={acks:[],ready:false};
    window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.origin==='null'&&e.data?.token===token){if(e.data.kind==='ready')window.proof.ready=true;if(e.data.kind==='applied')window.proof.acks.push(e.data.value)}});
    const source=['const t='+JSON.stringify(token)+';',
     'window.addEventListener("message",e=>{const m=e.data;if(e.source!==parent||m?.token!==t||m.kind!=="style"||!/^[0-9]{1,3}px$/.test(m.value))return;',
     'document.querySelector("#hero").style.fontSize=m.value;parent.postMessage({kind:"applied",token:t,value:m.value},"*")});',
     'parent.postMessage({kind:"ready",token:t},"*");'].join('');
    frame.srcdoc='<html><head><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;unsafe-inline&#39;; style-src &#39;unsafe-inline&#39;"></head><body>'+markup+'<script>'+source+'</scr'+'ipt></body></html>';
    window.apply=()=>frame.contentWindow.postMessage({kind:'style',token,value:'58px'},'*');
   },{markup,kind});
   await page.waitForFunction(()=>window.proof.ready,null,{timeout:7000});await page.evaluate(()=>window.apply());
   await page.waitForFunction(()=>window.proof.acks.includes('58px'),null,{timeout:7000});
   const child=page.frameLocator('#preview');
   assert.equal(await child.locator('#hero').evaluate(e=>e.style.fontSize),'58px');
   assert.equal(await child.locator('section').getAttribute('data-kind'),kind);
   assert.equal(await page.locator('iframe').count(),1);assert.deepEqual(errors,[]);
   out.push({kind,rendered:true,applied:'58px',iframe:1});await page.close();
  }
  console.log('STAGE1_MULTI_RENDER_PREVIEW='+JSON.stringify({pass:true,variants:out,limitations:'HTML string, PHP CLI-rendered string, React SSR HTML only; no real Next SSR nor production hosting'}));
 }finally{await browser.close()}
})().catch(e=>{console.error('STAGE1_MULTI_RENDER_PREVIEW_FAIL='+String(e.stack||e));process.exitCode=1});
