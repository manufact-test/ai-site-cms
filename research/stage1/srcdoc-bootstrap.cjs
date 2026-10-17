/* Stage 1 RESEARCH ONLY. Actual srcdoc parser/bootstrap and CSP nonce in native Chromium.
 * No Playwright script injection into child; editor independent. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright-core');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
if(!chrome)throw Error('Chromium missing');
(async()=>{
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const results=[];
  for(const policy of ['none','nonce']){
   const page=await browser.newPage();
   const errors=[]; page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<!doctype html><html><body><iframe id="p" sandbox="allow-scripts" style="width:600px;height:250px"></iframe></body></html>');
   await page.evaluate(policy=>{
    const f=document.getElementById('p');
    const bytes=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
    const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
    const source=[
      'const token='+JSON.stringify(bytes)+';',
      'document.body.dataset.loaded="yes";',
      'window.addEventListener("message",event=>{const m=event.data;',
      'if(event.source!==parent||event.origin!=="null"||m?.kind!=="render"||m.token!==token||typeof m.title!=="string"||m.title.length>100)return;',
      'document.getElementById("title").textContent=m.title;',
      'parent.postMessage({kind:"applied",token,title:document.getElementById("title").textContent},"*");});',
      'parent.postMessage({kind:"ready",token},"*");'
    ].join('');
    const csp=policy==='nonce'?'<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;nonce-'+nonce+'&#39;; style-src &#39;none&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;">':'';
    const scriptTag='<script'+(policy==='nonce'?' nonce="'+nonce+'"':'')+'>'+source+'</scr'+'ipt>';
    const content='<!doctype html><html><head>'+csp+'</head><body><section><h1 id="title">Original</h1></section>'+scriptTag+'</body></html>';
    window.proof={token:bytes,ready:false,ack:null,policy,nonce,content};
    window.addEventListener('message',event=>{
      if(event.source!==f.contentWindow||event.origin!=='null'||event.data?.token!==bytes)return;
      if(event.data.kind==='ready'){window.proof.ready=true;f.contentWindow.postMessage({kind:'render',token:bytes,title:'<img src=x onerror=alert(1)>'},'*')}
      if(event.data.kind==='applied')window.proof.ack=event.data;
    });
    f.srcdoc=content;
   },policy);
   try{await page.waitForFunction(()=>window.proof?.ack?.kind==='applied',null,{timeout:6000})}
   catch(e){
    const debug=await page.evaluate(()=>({ready:window.proof.ready,policy:window.proof.policy,content:window.proof.content.slice(-280),parsedScripts:(new DOMParser()).parseFromString(window.proof.content,'text/html').scripts.length}));
    const frame=page.frameLocator('#p');
    const frameInfo=await frame.locator('body').evaluate(()=>({scripts:document.scripts.length,text:document.body.textContent.slice(-250),loaded:document.body.dataset.loaded,html:document.documentElement.outerHTML.slice(-450)})).catch(e=>({error:String(e)}));
    console.error('STAGE1_SRCDOC_BOOTSTRAP_DIAGNOSTIC='+JSON.stringify({debug,frameInfo,errors}));
    throw e;
   }
   const textValue=await page.frameLocator('#p').locator('#title').innerText();
   assert.equal(textValue,'<img src=x onerror=alert(1)>');
   assert.equal(await page.frameLocator('#p').locator('img').count(),0);
   assert.equal(await page.frameLocator('#p').locator('body').getAttribute('data-loaded'),'yes');
   assert.equal(await page.frameLocator('#p').locator('script').count(),1);
   assert.deepEqual(errors,[]);
   results.push({policy,ready:true,ack:true,scriptElement:1,escapedText:true,errors:0});
   await page.close();
  }
  // Negative control: CSP nonce is actually enforced, not merely present in markup.
  // A mismatching script must remain in DOM but NOT execute or contact its parent.
  const blockedPage=await browser.newPage();
  try{
   await blockedPage.setContent('<!doctype html><html><body><iframe id="p" sandbox="allow-scripts"></iframe></body></html>');
   await blockedPage.evaluate(()=>{
    window.illicitMessages=0;
    window.addEventListener('message',e=>{if(e.data?.kind==='unexpected')window.illicitMessages++});
    const allow='0123456789abcdef0123456789abcdef',deny='fedcba9876543210fedcba9876543210';
    const csp='<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;nonce-'+allow+'&#39;; connect-src &#39;none&#39;">';
    document.getElementById('p').srcdoc='<html><head>'+csp+'</head><body><main>Nonce negative control</main><script nonce="'+deny+'">document.body.dataset.illicit="yes";parent.postMessage({kind:"unexpected"},"*")</scr'+'ipt></body></html>';
   });
   await blockedPage.frameLocator('#p').locator('script').waitFor();
   await blockedPage.waitForTimeout(150);
   assert.equal(await blockedPage.frameLocator('#p').locator('script').count(),1);
   assert.equal(await blockedPage.frameLocator('#p').locator('body').getAttribute('data-illicit'),null);
   assert.equal(await blockedPage.evaluate(()=>window.illicitMessages),0);
   results.push({policy:'nonce-mismatch',scriptPresent:true,blocked:true,unexpectedMessages:0});
  }finally{await blockedPage.close()}
  console.log('STAGE1_SRCDOC_BOOTSTRAP='+JSON.stringify({pass:true,results,scope:'research Chrome srcdoc, nonce meta CSP only, NOT production CSP deployment'}));
 }finally{await browser.close()}
})().catch(e=>{console.error('STAGE1_SRCDOC_BOOTSTRAP_FAIL='+String(e.stack||e));process.exitCode=1});
