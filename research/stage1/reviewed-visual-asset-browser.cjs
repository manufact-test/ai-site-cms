/* AI Site CMS Stage 1 RESEARCH ONLY.
 * Real upstream Jedison and RJSF UI -> typed gradient, motion, vetted SVG asset
 * -> opaque native CSP iframe, style-src-attr none, nonce-only style/script.
 * No original arbitrary source JS/CSS, no production asset ingestion.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright-core');
const esbuild=require('esbuild');
const {ASSETS,createReviewedSite,staticTests}=require('./reviewed-visual-asset-pack.cjs');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'Chrome required, no skipped browser tests');
const bundle=src=>esbuild.buildSync({stdin:{contents:src,sourcefile:'visual-editor-entry.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
const jedison=bundle("import Jedison from 'jedison';window.__Jedison=Jedison;");
const rjsf=bundle("import React from 'react';import{createRoot}from 'react-dom/client';import Form from '@rjsf/core';import{customizeValidator}from '@rjsf/validator-ajv8';import Ajv2020 from 'ajv/dist/2020.js';window.__React=React;window.__createRoot=createRoot;window.__Form=Form;window.__validator=customizeValidator({AjvClass:Ajv2020});");
function trustedChildReceiver(token,expectedParentOrigin,assetOrigin,styleNonce){
 const names=['gradientAngle','gradientFrom','gradientTo','motionEnabled','motionDuration','motionEasing','imageAsset','imageAlt'];
 const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
 const valid=x=>plain(x)&&Object.keys(x).length===names.length&&names.every(n=>Object.hasOwn(x,n))&&
  Number.isInteger(x.gradientAngle)&&x.gradientAngle>=0&&x.gradientAngle<=360&&
  Number.isInteger(x.motionDuration)&&x.motionDuration>=100&&x.motionDuration<=10000&&
  ['gradientFrom','gradientTo'].every(k=>typeof x[k]==='string'&&/^#[0-9a-fA-F]{6}$/.test(x[k]))&&
  typeof x.motionEnabled==='boolean'&&
  ['linear','ease','ease-in','ease-out','ease-in-out'].includes(x.motionEasing)&&
  ['orb','reef'].includes(x.imageAsset)&&typeof x.imageAlt==='string'&&x.imageAlt.length<=160;
 let lastSeq=0;
 const images={orb:'/fixtures/orb.svg',reef:'/fixtures/reef.svg'};
 const visual=document.getElementById('visual-orb');
 const img=document.getElementById('visual-media');
 const live=document.getElementById('dynamic-css');
 const response=m=>parent.postMessage({...m,token},expectedParentOrigin);
 if(live.nonce!==styleNonce)throw Error('dynamic nonce missing');
 window.addEventListener('message',event=>{
  const m=event.data;
  if(event.source!==parent||event.origin!==expectedParentOrigin||!plain(m)||
   Object.keys(m).sort().join(',')!=='kind,seq,token,values'||m.kind!=='paint'||m.token!==token||
   !Number.isInteger(m.seq)||m.seq<=lastSeq||m.seq>10000)return;
  if(!valid(m.values)){response({kind:'refused',seq:m.seq});return}
  const v=m.values;
  // These strings are derived exclusively from integer, hex and fixed enums.
  // Never interpolate arbitrary CSS, HTML, external URL, selector or source JS.
  const gradient='linear-gradient('+v.gradientAngle+'deg,'+v.gradientFrom+','+v.gradientTo+')';
  const animation=v.motionEnabled?'research-float '+v.motionDuration+'ms '+v.motionEasing+' infinite':'none';
  live.textContent='.visual-orb{background-image:'+gradient+';animation:'+animation+'}';
  img.src=assetOrigin+images[v.imageAsset];
  img.alt=v.imageAlt;
  visual.dataset.asset=v.imageAsset;
  lastSeq=m.seq;response({kind:'applied',seq:lastSeq});
 });
 response({kind:'ready'});
}
function setupParent({siteMarkup,schema,defaults,editor,bridge,assetOrigin}){
 const frame=document.getElementById('preview');
 const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
 const nonce=secret(),token=secret(),safe=x=>JSON.stringify(x).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 window.__draft=structuredClone(defaults);window.__published=structuredClone(defaults);window.__ready=false;window.__seq=0;window.__acks=[];window.__refused=[];window.__unexpected=[];
 const csp='<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;nonce-'+nonce+'&#39;; style-src &#39;nonce-'+nonce+'&#39;; style-src-attr &#39;none&#39;; img-src '+assetOrigin+'; connect-src &#39;none&#39;; media-src &#39;none&#39;; form-action &#39;none&#39;; object-src &#39;none&#39;; base-uri &#39;none&#39;">';
 const styles='<style nonce="'+nonce+'">body{background:#0b2134;color:#fff;font:16px/1.5 system-ui;margin:0}section{padding:25px}.visual-orb{box-sizing:border-box;width:85%;padding:32px;min-height:300px;border-radius:26px;opacity:1;display:flex;flex-direction:column;align-items:center;gap:12px}img{display:block;width:180px;height:120px}figcaption{text-align:center}@keyframes research-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}@media(max-width:600px){.visual-orb{padding:12px;width:100%}}@media(prefers-reduced-motion:reduce){.visual-orb{animation:none!important}}</style>';
 const source='('+bridge+')('+safe(token)+','+safe(location.origin)+','+safe(assetOrigin)+','+safe(nonce)+');';
 frame.srcdoc='<!doctype html><head>'+csp+styles+'<style id="dynamic-css" nonce="'+nonce+'"></style></head><body>'+siteMarkup+'<script nonce="'+nonce+'">'+source+'</scr'+'ipt></body>';
 window.__paint=()=>{if(window.__ready)frame.contentWindow.postMessage({kind:'paint',seq:++window.__seq,token,values:window.__draft},'*')};
 window.__view=w=>{if(![1200,360].includes(w))throw Error('unsupported width');frame.style.width=w+'px';window.__paint()};
 window.__attack=kind=>{
  const m={kind:'paint',seq:window.__seq+1,token,values:structuredClone(window.__draft)};
  if(kind==='url')m.values.gradientFrom='url(https://attacker.invalid/a)';
  if(kind==='asset')m.values.imageAsset='https://attacker.invalid/evil.svg';
  if(kind==='script')m.values.imageAlt={html:'<script>evil()</script>'};
  if(kind==='css')m.values.motionEasing='steps(99,end);background:url(https://evil.invalid)';
  if(kind==='extra')m.extra='forbidden';
  if(kind==='token')m.token='forged';
  if(kind==='replay')m.seq=window.__seq;
  frame.contentWindow.postMessage(m,'*');
 };
 window.addEventListener('message',e=>{
  const m=e.data;
  if(e.source!==frame.contentWindow||e.origin!=='null'||m?.token!==token){window.__unexpected.push('source-or-token');return}
  if(m.kind==='ready'&&Object.keys(m).sort().join(',')==='kind,token'){window.__ready=true;window.__paint()}
  else if(m.kind==='applied'&&Number.isInteger(m.seq)&&Object.keys(m).sort().join(',')==='kind,seq,token')window.__acks.push(m.seq);
  else if(m.kind==='refused'&&Number.isInteger(m.seq)&&Object.keys(m).sort().join(',')==='kind,seq,token')window.__refused.push(m.seq);
  else window.__unexpected.push('shape');
 });
 window.__mount=()=>{
  const target=document.getElementById('editor');
  if(editor==='jedison'){
   const J=window.__Jedison,instance=new J.Create({container:target,theme:new J.Theme(),schema,data:defaults,keepMissingSchemaFields:false,showErrors:'input'});
   instance.on('change',()=>{window.__draft=instance.getValue();window.__paint()});
   window.__read=()=>instance.getValue();window.__destroy=()=>{instance.destroy();target.replaceChildren()};
  }else{
   const R=window.__React,root=window.__createRoot(target);
   root.render(R.createElement(window.__Form,{schema,formData:defaults,validator:window.__validator,onChange:e=>{window.__draft=e.formData;window.__paint()},children:R.createElement('span',null,'Stage 1 only')}));
   window.__read=()=>window.__draft;window.__destroy=()=>root.unmount();
  }
 };
}
async function changeNative(page,key,value){
 const nodes=await page.locator('#editor input, #editor select').evaluateAll((xs,name)=>xs.filter(e=>e.type!=='hidden'&&(e.id||'').toLowerCase().includes(name.toLowerCase())).map(e=>({id:e.id,tag:e.tagName,type:e.type})),key);
 assert.equal(nodes.length,1,'expected exactly one native upstream widget '+key+' '+JSON.stringify(nodes));
 const selector='#editor '+(nodes[0].tag==='SELECT'?'select':'input')+'[id='+JSON.stringify(nodes[0].id)+']',control=page.locator(selector);
 if(nodes[0].tag==='SELECT')await control.selectOption(String(value));
 else if(nodes[0].type==='checkbox')value?await control.check():await control.uncheck();
 else {await control.fill(String(value));await control.dispatchEvent('change');await control.blur()}
 await page.waitForFunction(({key,value})=>window.__draft[key]===value,{key,value},{timeout:15000});
 const seq=await page.evaluate(()=>window.__seq);
 await page.waitForFunction(seq=>window.__acks.includes(seq),seq,{timeout:15000});
}
async function run(browser,editor,site,origin,requests){
 const page=await browser.newPage({viewport:{width:1500,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const beforeReq=requests.length;
 try{
  await page.goto(origin+'/');
  await page.addScriptTag({content:editor==='jedison'?jedison:rjsf});
  await page.evaluate(setupParent,{siteMarkup:site.markup,schema:site.registry.schema(),defaults:site.values,editor,bridge:trustedChildReceiver.toString(),assetOrigin:origin});
  await page.waitForFunction(()=>window.__ready&&window.__acks.includes(1),null,{timeout:15000});
  await page.evaluate(()=>window.__mount());
  const frame=page.frameLocator('#preview');
  await frame.locator('#visual-media').evaluate(img=>img.decode());
  const initial=await frame.locator('#visual-orb').evaluate(el=>({
   origin:location.origin,parentReadable:(()=>{try{return !!parent.document.getElementById('editor')}catch{return false}})(),
   originalScriptExecuted:window.__siteExecuted===true,
   initialGradient:getComputedStyle(el).backgroundImage,
   imagePath:document.getElementById('visual-media').getAttribute('src'),
   imageDecoded:document.getElementById('visual-media').naturalWidth>0,
   inlineStyleAttributes:document.querySelectorAll('[style]').length,
   dynamicStyleNonce:document.getElementById('dynamic-css').nonce.length
  }));
  assert.equal(initial.origin,'null');assert.equal(initial.parentReadable,false);
  assert.equal(initial.originalScriptExecuted,false);
  assert.equal(initial.imageDecoded,true);
  assert.equal(initial.inlineStyleAttributes,0);
  assert.equal(initial.imagePath,origin+'/fixtures/orb.svg');
  assert.ok(initial.dynamicStyleNonce>10);
  await changeNative(page,'gradientAngle',130);
  await changeNative(page,'gradientFrom','#123456');
  await changeNative(page,'gradientTo','#abcdef');
  await changeNative(page,'motionDuration',2200);
  await changeNative(page,'motionEasing','linear');
  await changeNative(page,'motionEnabled',false);
  const motionOff=await frame.locator('#visual-orb').evaluate(el=>getComputedStyle(el).animationName);
  assert.equal(motionOff,'none');
  await changeNative(page,'motionEnabled',true);
  await changeNative(page,'imageAsset','reef');
  await changeNative(page,'imageAlt','An <img onerror=alert(1)> edited label');
  await frame.locator('#visual-media').evaluate(img=>img.decode());
  const applied=await frame.locator('#visual-orb').evaluate(el=>{
   const styles=getComputedStyle(el),img=document.getElementById('visual-media');
   return {gradient:styles.backgroundImage,animationName:styles.animationName,
    duration:styles.animationDuration,easing:styles.animationTimingFunction,
    src:img.getAttribute('src'),naturalWidth:img.naturalWidth,
    alt:img.alt,styleAttrs:document.querySelectorAll('[style]').length};
  });
  assert.ok(applied.gradient.includes('130deg'),'angle was not updated in rendered CSS');
  assert.ok(applied.gradient.includes('rgb(18, 52, 86)')&&applied.gradient.includes('rgb(171, 205, 239)'),'colors not computed');
  assert.equal(applied.animationName,'research-float');
  assert.equal(applied.duration,'2.2s');
  assert.equal(applied.easing,'linear');
  assert.equal(applied.src,origin+'/fixtures/reef.svg');
  assert.equal(applied.naturalWidth,180);
  assert.equal(applied.alt,'An <img onerror=alert(1)> edited label');
  assert.equal(applied.styleAttrs,0);
  const widths=[];
  for(const w of [1200,360]){
   await page.evaluate(w=>window.__view(w),w);
   const seq=await page.evaluate(()=>window.__seq);
   await page.waitForFunction(n=>window.__acks.includes(n),seq,{timeout:12000});
   const child=page.frames().find(f=>f!==page.mainFrame());
   await child.waitForFunction(w=>innerWidth===w,w,{timeout:12000});
   widths.push(await frame.locator('#visual-orb').evaluate(el=>({padding:getComputedStyle(el).padding,angle:getComputedStyle(el).backgroundImage.includes('130deg')})));
  }
  assert.deepEqual(widths,[{padding:'32px',angle:true},{padding:'12px',angle:true}]);
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await frame.locator('#visual-orb').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await frame.locator('#visual-orb').evaluate(el=>getComputedStyle(el).animationName),'research-float');
  const ackBefore=await page.evaluate(()=>window.__acks.length);
  for(const x of ['url','asset','script','css','extra','token','replay'])await page.evaluate(x=>window.__attack(x),x);
  await page.waitForFunction(()=>window.__refused.length>=4,null,{timeout:12000});
  const attack=await page.evaluate(()=>({acks:window.__acks.length,refused:window.__refused.length,draft:window.__draft,published:window.__published}));
  assert.equal(attack.acks,ackBefore);
  assert.ok(attack.refused>=4);
  assert.deepEqual(attack.published,site.values,'published baseline mutated');
  assert.equal(await frame.locator('#visual-media').getAttribute('src'),origin+'/fixtures/reef.svg');
  const csp=await frame.locator('#visual-orb').evaluate(el=>{
   el.setAttribute('style','opacity:0.17!important');
   const injected=document.createElement('style');
   injected.textContent='.visual-orb{opacity:0.11!important}';
   document.head.appendChild(injected);
   return {opacity:getComputedStyle(el).opacity,attrAttempt:el.hasAttribute('style')};
  });
  assert.equal(csp.opacity,'1','CSP must block nonce-less CSS and style attributes');
  assert.equal(attack.draft.imageAsset,'reef');
  assert.deepEqual(errors,[]);
  const observed=requests.slice(beforeReq);
  assert.ok(observed.some(x=>x==='/fixtures/orb.svg')&&observed.some(x=>x==='/fixtures/reef.svg'));
  assert.ok(observed.every(x=>x==='/'||x==='/favicon.ico'||x==='/fixtures/orb.svg'||x==='/fixtures/reef.svg'),'Unexpected network request '+JSON.stringify(observed));
  console.log('STAGE1_VISUAL_ASSET_BROWSER='+JSON.stringify({pass:true,editor,upstream:editor==='jedison'?'1.27.1':'6.11.0',nativeUIChanges:9,gradient:applied.gradient,motionDuration:applied.duration,
   decodedSVGAssets:2,responsivePaddingPx:['32px','12px'],reducedMotionCompliant:true,strictNonceStyles:true,inlineStyleAttributes:0,unsafeCSSRejected:true,invalidMessagesRefused:attack.refused,sourceScriptExecuted:false,publishedUnchanged:true,opaqueOrigin:true,pageErrors:0,
   limits:'curated SVGs and reviewed projected markup, no arbitrary SVG/CSS sanitizer, real uploads, cross-browser or public runtime'}));
 }finally{await page.close()}
}
(async()=>{
 staticTests();
 const site=createReviewedSite(),requests=[];
 assert.ok(!site.markup.includes('<svg')&&!site.markup.includes('<script')&&!site.markup.includes('style='));
 const server=http.createServer((req,res)=>{
  requests.push(req.url||'/');
  const asset=Object.values(ASSETS).find(v=>v.path===req.url);
  if(asset){res.writeHead(200,{'Content-Type':asset.mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'none'; sandbox"});res.end(asset.svg);return}
  if(req.url!=='/'&&req.url!=='/favicon.ico'){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end('<!doctype html><html><body><div id="editor"></div><iframe id="preview" sandbox="allow-scripts"></iframe></body></html>');
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const editor of ['jedison','rjsf'])await run(browser,editor,site,origin,requests);
  console.log('STAGE1_VISUAL_ASSET_TOTAL='+JSON.stringify({pass:true,realEditorRuns:2,totalNativeEdits:18,serverAssetRequests:requests.filter(x=>x.includes('/fixtures/')).length,fullSiteAutomatedConversion:false,productRequirementsAccepted:0}));
 }finally{if(browser)await browser.close();await new Promise(done=>server.close(done))}
})().catch(e=>{console.error('STAGE1_VISUAL_ASSET_FAIL='+String(e.stack||e));process.exitCode=1});
