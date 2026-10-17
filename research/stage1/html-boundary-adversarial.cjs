/* AI Site CMS / Stage 1 ONLY: adversarial AI HTML boundary + nonce iframe protocol probes.
 * Fail-closed research policy for constrained Hero grammar, NOT production sanitizer. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const {chromium}=require('playwright-core'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{JSDOM}=require('jsdom');
const {Section,initial}=require('./adapter-section.cjs');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'Chromium required');
const IDS=['hero-section','hero-title','hero-lead','hero-primary','hero-secondary','hero-feature-0','hero-feature-1','hero-feature-2','hero-card-0','hero-card-1','hero-stat-0','hero-stat-1'];
const allowedTags=new Set(['section','div','h1','p','button','span','aside','article','strong']);
const allowedAttrs=new Set(['class','data-kind','data-stable-id','type']);
async function preflight(fragment,parseFragment){
 const errors=[];
 parseFragment(fragment,{sourceCodeLocationInfo:true,onParseError:e=>errors.push(e.code)});
 if(errors.length) return {ok:false,reason:'parser-errors',errors};
 if(typeof fragment!=='string'||!fragment.trimEnd().endsWith('</section>'))return {ok:false,reason:'unterminated-root'};
 // Use an isolated parser; never evaluate markup or run resources while checking.
 const dom=new JSDOM('<!doctype html><html><body></body></html>');
 try{
  const {document}=dom.window;
  const template=document.createElement('template');
  template.innerHTML=fragment;
  const roots=[...template.content.childNodes].filter(n=>n.nodeType===1);
  if(roots.length!==1||template.content.childNodes.length!==1||roots[0].localName!=='section')return {ok:false,reason:'root'};
  let observed=[],elements=0;
  const stack=[roots[0]];
  while(stack.length){
   const element=stack.pop();elements++;
   if(!allowedTags.has(element.localName)||element.namespaceURI!=='http://www.w3.org/1999/xhtml')return {ok:false,reason:'tag'};
   for(const attr of element.attributes){
    if(!allowedAttrs.has(attr.name))return {ok:false,reason:'attribute'};
    if(attr.name==='type'&&attr.value!=='button')return {ok:false,reason:'type'};
    if(attr.name==='data-kind'&&!/^[a-z0-9-]{1,40}$/.test(attr.value))return {ok:false,reason:'kind'};
    if(attr.name==='class'&&!/^[a-z0-9 -]{0,120}$/.test(attr.value))return {ok:false,reason:'class'};
   }
   if(element.hasAttribute('data-stable-id'))observed.push(element.getAttribute('data-stable-id'));
   for(const node of element.childNodes){if(node.nodeType!==1&&node.nodeType!==3)return {ok:false,reason:'node'};}
   stack.push(...Array.from(element.children).reverse());
  }
  if(observed.length!==IDS.length||observed.some((x,i)=>x!==IDS[i]))return {ok:false,reason:'stable-ids'};
  if(new Set(observed).size!==IDS.length)return {ok:false,reason:'duplicate-id'};
  return {ok:true,elementCount:elements,stableIds:observed.length};
 }finally{dom.window.close()}
}
function cases(base){
 return [
  ['script',base.replace('</section>','<script>parent.postMessage({kind:"evil"},"*")</script></section>')],
  ['nonce-script',base.replace('</section>','<script nonce="0123456789abcdef0123456789abcdef">evil()</script></section>')],
  ['style-rawtext',base.replace('</section>','<style>body{background:url(https://attacker.invalid/x)}</style></section>')],
  ['event-handler',base.replace('<h1 ','<h1 onmouseover="evil()" ')],
  ['src-attribute',base.replace('<h1 ','<h1 src="javascript:evil()" ')],
  ['inline-style',base.replace('<h1 ','<h1 style="background:url(https://attacker.invalid/x)" ')],
  ['svg',base.replace('</section>','<svg onload=evil()></svg></section>')],
  ['mathml',base.replace('</section>','<math><mtext>bad</mtext></math></section>')],
  ['iframe-srcdoc',base.replace('</section>','<iframe srcdoc="<script>evil()</script>"></iframe></section>')],
  ['base-uri',base.replace('</section>','<base href="https://attacker.invalid"></section>')],
  ['foreign-template',base.replace('</section>','<template shadowrootmode="open"><script>evil()</script></template></section>')],
  ['comment',base.replace('</section>','<!-- fake boundary --></section>')],
  ['duplicate-stable-id',base.replace('</section>','<span data-stable-id="hero-title">Impersonated</span></section>')],
  ['missing-close-angle',base.replace(/<\/section>$/,'</section')],
  ['missing-root-close',base.replace(/<\/section>$/,'')],
  ['wrong-close',base.replace(/<\/section>$/,'</section><div>bad</div>')],
  ['broken-nested-tag',base.replace('<h1 ','<h1 <script ')],
  ['rawtext-breakout',base.replace('</section>','</section><script>alert("oops")</script>')],
  ['untrusted-anchor',base.replace('</section>','<a href="javascript:alert(1)">click</a></section>')],
  ['meta-csp',base.replace('</section>','<meta http-equiv="Content-Security-Policy" content="script-src *"></section>')]
 ];
}
async function browserProtocol(fragment){
 const server=http.createServer((req,res)=>{
  if(req.url==='/'){
   res.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':"default-src 'self' 'unsafe-inline'; frame-src 'self' about:; object-src 'none'; base-uri 'none'",'X-Content-Type-Options':'nosniff'});
   res.end('<!doctype html><html><body><h1 id="admin">ADMIN UNCHANGED</h1><iframe id="preview" sandbox="allow-scripts"></iframe><iframe id="rogue" sandbox="allow-scripts"></iframe></body></html>');
  }else{res.writeHead(404);res.end('Not found')}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.evaluate(fragment=>{
   const preview=document.getElementById('preview'),rogue=document.getElementById('rogue');
   const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
   const token=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
   const expectedOrigin=location.origin;
   window.__securityProbe={token,origin:expectedOrigin,ready:false,acks:[],rejections:0,illicit:0};
   const bridge=[
    'const token='+JSON.stringify(token)+';',
    'const origin='+JSON.stringify(expectedOrigin)+';',
    'try{parent.document.body.dataset.compromised="yes"}catch(e){document.body.dataset.parentBlocked="yes"}',
    'window.addEventListener("message",event=>{const m=event.data;',
    'if(event.source!==parent||event.origin!==origin||!m||typeof m!=="object"||Array.isArray(m)||',
    'Object.keys(m).sort().join(",")!=="kind,token,value"||m.kind!=="set-text"||m.token!==token||typeof m.value!=="string"||m.value.length>100)return;',
    'document.querySelector("[data-stable-id=hero-title]").textContent=m.value;',
    'parent.postMessage({kind:"applied",token,value:m.value},origin);',
    '});parent.postMessage({kind:"ready",token},origin);'
   ].join('');
   const csp='<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;nonce-'+nonce+'&#39;; style-src &#39;none&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;; media-src &#39;none&#39;; object-src &#39;none&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">';
   // Deliberately inject untrusted nonce-less inline script to prove CSP negative control; strict preflight would reject it.
   const injected='<script>parent.postMessage({kind:"illicit",token:'+JSON.stringify(token)+'},'+JSON.stringify(expectedOrigin)+');document.body.dataset.illicit="yes"</scr'+'ipt>';
   preview.srcdoc='<!doctype html><html><head>'+csp+'</head><body>'+fragment+injected+'<script nonce="'+nonce+'">'+bridge+'</scr'+'ipt></body></html>';
   rogue.srcdoc='<!doctype html><html><body><p>Untrusted sibling</p></body></html>';
   window.addEventListener('message',event=>{
    const m=event.data;
    if(m?.kind==='illicit')window.__securityProbe.illicit++;
    if(event.source!==preview.contentWindow||event.origin!=='null'||!m||m.token!==token){window.__securityProbe.rejections++;return}
    if(m.kind==='ready'&&Object.keys(m).sort().join(',')==='kind,token')window.__securityProbe.ready=true;
    else if(m.kind==='applied'&&Object.keys(m).sort().join(',')==='kind,token,value'&&typeof m.value==='string')window.__securityProbe.acks.push(m.value);
    else window.__securityProbe.rejections++;
   });
   window.__send=value=>preview.contentWindow.postMessage({kind:'set-text',token,value},'*');
   window.__wrong=()=>preview.contentWindow.postMessage({kind:'set-text',token:'wrong',value:'WRONG'},'*');
   window.__extra=()=>preview.contentWindow.postMessage({kind:'set-text',token,value:'EXTRA',target:'innerHTML'},'*');
   window.__spoof=()=>window.postMessage({kind:'applied',token,value:'SPOOF'},'*');
   window.__rogue=()=>rogue.contentWindow.postMessage({kind:'applied',token,value:'ROGUE'},'*');
  },fragment);
  await page.waitForFunction(()=>window.__securityProbe.ready,null,{timeout:12000});
  const frame=page.frameLocator('#preview');
  assert.equal(await frame.locator('body').getAttribute('data-parent-blocked'),'yes');
  assert.equal(await frame.locator('body').getAttribute('data-illicit'),null);
  assert.equal(await frame.locator('script').count(),2);
  assert.equal(await frame.locator('[data-stable-id]').count(),12);
  await page.evaluate(()=>window.__send('<img src=x onerror=evil()>'));
  await page.waitForFunction(()=>window.__securityProbe.acks.length===1,null,{timeout:9000});
  assert.equal(await frame.locator('[data-stable-id=hero-title]').innerText(),'<img src=x onerror=evil()>');
  assert.equal(await frame.locator('img').count(),0);
  await page.evaluate(()=>{window.__wrong();window.__extra();window.__spoof();window.__rogue()});
  await page.waitForTimeout(170);
  const stats=await page.evaluate(()=>window.__securityProbe);
  assert.equal(stats.illicit,0,'nonce-less child script ran');
  assert.deepEqual(stats.acks,['<img src=x onerror=evil()>']);
  assert.equal(await page.locator('#admin').textContent(),'ADMIN UNCHANGED');
  assert.equal(await page.locator('body').getAttribute('data-compromised'),null);
  assert.equal(await frame.locator('body').getAttribute('data-illicit'),null);
  assert.ok(stats.rejections>=2);
  assert.deepEqual(errors,[]);
  await page.close();
  return {nativeNonceBridge:true,nonceLessScriptBlocked:true,typedTextOnly:true,originRestricted:true,rogueSourceRejected:true,wrongTokenRejected:true,extraPayloadRejected:true,opaqueOrigin:true,parentDOMInaccessible:true,pageErrors:0,rogueMessagesRejected:stats.rejections,illicitMessages:stats.illicit};
 }finally{await browser.close();await new Promise(r=>server.close(r))}
}
(async()=>{
 const parse5=await import('parse5');
 const hostileText='Text: </script><script>evil()</script> <img src=x onerror=evil()> </style> <!-- no layout breakout -->';
 const validInitial={...initial,title:hostileText};
 const allowed=renderToStaticMarkup(React.createElement(Section,{value:validInitial}));
 const normal=renderToStaticMarkup(React.createElement(Section,{value:initial}));
 const baseline=await preflight(normal,parse5.parseFragment);
 const safe=await preflight(allowed,parse5.parseFragment);
 assert.equal(baseline.ok,true,'baseline fixture denied: '+JSON.stringify(baseline));
 assert.equal(safe.ok,true,'HTML-escaped hostile text denied: '+JSON.stringify(safe));
 assert.equal(new JSDOM(allowed).window.document.querySelectorAll('script,img').length,0);
 assert.equal(new JSDOM(allowed).window.document.querySelector('[data-stable-id=hero-title]').textContent,hostileText);
 const rejected=[];
 for(const [name,fragment] of cases(normal)){
  const outcome=await preflight(fragment,parse5.parseFragment);
  assert.equal(outcome.ok,false,'hostile HTML incorrectly allowed: '+name);
  rejected.push({name,reason:outcome.reason});
 }
 const frame=await browserProtocol(normal);
 console.log('STAGE1_HTML_BOUNDARY='+JSON.stringify({pass:true,normalPass:true,escapedHostileTextPass:true,malformedOrMaliciousRejected:rejected.length,rejected,frame,limits:'Research-only restrictive Hero grammar; NO generalized HTML sanitizer, arbitrary AI templates, full threat model, real resources or production CSP; native localhost Chrome origin and nonce probes only'}));
})().catch(e=>{console.error('STAGE1_HTML_BOUNDARY_FAIL='+String(e.stack||e));process.exitCode=1});
