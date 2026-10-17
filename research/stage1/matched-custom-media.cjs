/* AI Site CMS stage 1 RESEARCH ONLY.
 * Equivalent upstream Jedison/RJSF custom composite editors on a matched media-mock hero.
 * No real media/network, no CMS implementation, no production security assurance. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const esbuild=require('esbuild'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server'),{chromium}=require('playwright-core');
const {Section}=require('./adapter-section.cjs');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'Chrome required');
const schema=JSON.parse(fs.readFileSync(path.join(__dirname,'typed-manifest.schema.json'),'utf8'));
const initial={fontSize:'64px',shadow:{x:0,y:5,blur:10,color:'#112233'},gradient:{angle:45,from:'#112233',to:'#334455'},animation:{enabled:true,duration:400,easing:'ease'}};
const markup=renderToStaticMarkup(React.createElement(Section,{kind:'composite-mock'}));
assert.ok(markup.endsWith('</section>'),'Section HTML must be a complete fragment');
const reps=2;
function upstreamSetup(name){
 const filename=name==='jedison'?'custom-widgets.cjs':'rjsf-custom.cjs';
 const f=fs.readFileSync(path.join(__dirname,filename),'utf8');
 const start=name==='jedison'?'function clientSetup(){':'function mountRjsfCustom(){';
 const a=f.indexOf(start),b=f.indexOf('\n(async()=>{',a);
 assert.ok(a>=0&&b>a,name+' source extraction delimiters changed');
 let s=f.slice(a,b);
 if(name==='jedison'){
  const key="editor.on('change',()=>window.changeCount++);";
  assert.ok(s.includes(key),'Jedison listener upstream changed');
  s=s.replace(key,"editor.on('change',()=>{window.changeCount++;window.__updatePreview?.(editor.getValue())});");
 }else{
  const key="onChange:e=>{window.latest=e.formData;},children:";
  assert.ok(s.includes(key),'RJSF listener upstream changed');
  s=s.replace(key,"onChange:e=>{window.latest=e.formData;window.__updatePreview?.(e.formData);},children:");
 }
 return s+'\n'+(name==='jedison'?'clientSetup();':'mountRjsfCustom();');
}
function bundle(name){
 const entry=name==='jedison'?
 "import Jedison from 'jedison';window.Jedison=Jedison;" :
 "import React from 'react';import{createRoot}from'react-dom/client';import Form from '@rjsf/core';import{customizeValidator}from '@rjsf/validator-ajv8';import Ajv2020 from 'ajv/dist/2020.js';window.React=React;window.createRoot=createRoot;window.Form=Form;window.validator=customizeValidator({AjvClass:Ajv2020});";
 return esbuild.buildSync({stdin:{contents:entry,sourcefile:'composite-'+name+'.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
}
function iframeSetup(){
 const frame=document.getElementById('preview');
 const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const token=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const bridge=[
  'const token='+JSON.stringify(token)+';',
  'const hex=v=>typeof v==="string"&&/^#[0-9a-fA-F]{6}$/.test(v);',
  'const num=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;',
  'function valid(d){if(!d||Object.keys(d).sort().join(",")!=="animation,fontSize,gradient,shadow")return false;',
  'if(typeof d.fontSize!=="string"||!/^(?:0|[1-9][0-9]{0,2})(?:px|rem|%)$/.test(d.fontSize))return false;',
  'const s=d.shadow,g=d.gradient,a=d.animation;',
  'return !!(s&&g&&a&&Object.keys(s).sort().join(",")==="blur,color,x,y"&&',
  'Object.keys(g).sort().join(",")==="angle,from,to"&&',
  'Object.keys(a).sort().join(",")==="duration,easing,enabled"&&',
  'num(s.x,-100,100)&&num(s.y,-100,100)&&num(s.blur,0,200)&&hex(s.color)&&',
  'num(g.angle,0,360)&&hex(g.from)&&hex(g.to)&&',
  'typeof a.enabled==="boolean"&&num(a.duration,0,10000)&&["ease","ease-in","ease-out","linear"].includes(a.easing));}',
  'window.addEventListener("message",e=>{const m=e.data;',
  'if(e.source!==parent||e.origin!=="null"||!m||Object.keys(m).sort().join(",")!=="kind,state,token"||m.kind!=="render"||m.token!==token||!valid(m.state))return;',
  'const d=m.state,hero=document.querySelector("[data-stable-id=hero-section]"),title=document.querySelector("[data-stable-id=hero-title]");',
  'title.style.fontSize=d.fontSize;',
  'hero.style.boxShadow=d.shadow.x+"px "+d.shadow.y+"px "+d.shadow.blur+"px "+d.shadow.color;',
  'hero.style.background="linear-gradient("+d.gradient.angle+"deg,"+d.gradient.from+","+d.gradient.to+")";',
  'hero.style.transitionDuration=d.animation.duration+"ms";hero.style.transitionTimingFunction=d.animation.easing;',
  'document.getElementById("media-mock").dataset.animation=d.animation.enabled?"on":"off";',
  'parent.postMessage({kind:"applied",token,font:d.fontSize,blur:d.shadow.blur,gradient:d.gradient.angle,duration:d.animation.duration,easing:d.animation.easing,enabled:d.animation.enabled},"*");',
  '});parent.postMessage({kind:"ready",token},"*");'
 ].join('');
 const csp='<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;nonce-'+nonce+'&#39;; style-src &#39;unsafe-inline&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;; media-src &#39;none&#39;">';
 // All mock media are CSS/DOM placeholders. No URLs or real downloads permitted.
 const media='<aside id="media-mock" data-animation="on"><div data-mock="image">Image placeholder</div><div data-mock="video">Video placeholder</div><div data-mock="animated">Animated placeholder</div></aside>';
 frame.srcdoc='<!doctype html><html><head>'+csp+'</head><body>'+window.__heroMarkup+media+'<script nonce="'+nonce+'">'+bridge+'</scr'+'ipt></body></html>';
 window.__probe={token,ready:false,acks:[],attempts:0,published:structuredClone(window.__initial),latest:structuredClone(window.__initial)};
 window.__updatePreview=d=>{
  window.__probe.latest=structuredClone(d);
  if(window.__probe.ready){window.__probe.attempts++;frame.contentWindow.postMessage({kind:'render',token,state:d},'*')}
 };
 window.__sendMalicious=d=>frame.contentWindow.postMessage({kind:'render',token,state:d},'*');
 window.addEventListener('message',event=>{
  const d=event.data;
  if(event.source!==frame.contentWindow||event.origin!=='null'||d?.token!==token)return;
  if(d.kind==='ready'){window.__probe.ready=true;window.__updatePreview(window.__probe.latest)}
  if(d.kind==='applied')window.__probe.acks.push(d);
 });
}
async function run(name,browser){
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const results=[];
 try{
  await page.setContent('<!doctype html><html><body><div id="meta"></div><div id="editor"></div><iframe id="preview" sandbox="allow-scripts" style="width:900px;height:600px"></iframe></body></html>');
  await page.evaluate(({initial,markup})=>{
   window.__initial=initial;window.__heroMarkup=markup;
   for(let i=0;i<50;i++){const d=document.createElement('span');d.textContent='Block '+i;document.getElementById('meta').appendChild(d)}
  },{initial,markup});
  await page.addScriptTag({content:bundle(name)});
  await page.evaluate(iframeSetup);
  await page.addScriptTag({content:upstreamSetup(name)});
  const frame=page.frameLocator('#preview');
  await page.waitForFunction(()=>window.__probe?.ready,null,{timeout:8000});
  assert.equal(await frame.locator('[data-stable-id]').count(),12);
  assert.equal(await frame.locator('[data-mock]').count(),3);
  assert.equal(await frame.locator('script').count(),1);
  assert.equal(await page.locator('iframe').count(),1);
  assert.equal(await page.locator('#meta span').count(),50);
  async function edit(kind,part,value){
   const selector='[data-cms-widget="'+kind+'"] [data-part="'+part+'"]';
   const input=page.locator(selector);
   assert.equal(await input.count(),1,name+' missing '+selector);
   const type=await input.evaluate(e=>e.type);
   if(type==='select-one')await input.selectOption(value);
   else if(type==='checkbox')await input.setChecked(value==='true');
   else await input.fill(value);
   await input.dispatchEvent('change');await input.blur();
  }
  const getData=()=>page.evaluate(()=>window.latest??window.getData());
  for(let cycle=0;cycle<reps;cycle++){
   await page.evaluate(({schema,initial})=>window.mount(document.getElementById('editor'),schema,initial),{schema,initial});
   await page.locator('[data-cms-widget="length"] [data-part="amount"]').waitFor({timeout:10000});
   assert.equal(await page.locator('[data-cms-widget]').count(),4);
   await page.evaluate(()=>window.__updatePreview(window.latest??window.getData()));
   await page.waitForFunction(()=>window.__probe.acks.some(x=>x.font==='64px'),null,{timeout:10000});
   await edit('length','amount','72');
   await edit('length','unit','rem');
   await edit('shadow','blur','25');
   await edit('shadow','color','#abcdef');
   await edit('gradient','angle','120');
   await edit('gradient','from','#aabbcc');
   await edit('animation','enabled','false');
   await edit('animation','duration','850');
   await edit('animation','easing','linear');
   const expected={fontSize:'72rem',shadow:{x:0,y:5,blur:25,color:'#abcdef'},gradient:{angle:120,from:'#aabbcc',to:'#334455'},animation:{enabled:false,duration:850,easing:'linear'}};
   await page.waitForFunction(d=>JSON.stringify(window.latest??window.getData())===JSON.stringify(d),expected,{timeout:10000});
   const got=await getData();assert.deepEqual(got,expected);
   await page.waitForFunction(()=>window.__probe.acks.some(x=>x.font==='72rem'&&x.blur===25&&x.gradient===120&&x.duration===850&&x.easing==='linear'&&x.enabled===false),null,{timeout:10000});
   assert.equal(await frame.locator('[data-stable-id="hero-title"]').evaluate(e=>e.style.fontSize),'72rem');
   assert.equal(await frame.locator('#media-mock').getAttribute('data-animation'),'off');
   assert.equal(await frame.locator('[data-stable-id="hero-section"]').evaluate(e=>e.style.transitionDuration),'850ms');
   assert.equal(await frame.locator('[data-stable-id="hero-section"]').evaluate(e=>e.style.transitionTimingFunction),'linear');
   const old=await page.evaluate(()=>window.__probe.acks.length);
   const attacker={...expected,shadow:{...expected.shadow,color:'url(javascript:alert(1))'}};
   await page.evaluate(value=>window.__sendMalicious(value),attacker);
   await page.waitForTimeout(90);
   assert.equal(await page.evaluate(()=>window.__probe.acks.length),old,'invalid CSS accepted');
   assert.equal(await page.evaluate(()=>window.__probe.published.fontSize),'64px','draft contaminated published state');
   assert.equal(await frame.locator('[data-mock]').count(),3,'media placeholders mutated');
   results.push(got);
   await page.evaluate(()=>window.dispose());
   await page.waitForFunction(()=>document.querySelectorAll('[data-cms-widget]').length===0,null,{timeout:10000});
  }
  assert.deepEqual(errors,[],name+' unexpected browser errors');
  return {library:name,pass:true,cycles:reps,customWidgetKinds:4,mediaMocks:3,stableIds:12,errors:errors.length,results};
 }finally{await page.close()}
}
(async()=>{
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const findings=[];
  for(const name of ['jedison','rjsf'])findings.push(await run(name,browser));
  assert.deepEqual(findings[0].results,findings[1].results,'cross-editor composite data divergence');
  console.log('STAGE1_MATCHED_CUSTOM_MEDIA='+JSON.stringify({pass:true,checks:findings.map(({results,...rest})=>rest),equalOutput:true,limit:'Actual pinned editors and typed sandbox preview with 3 DOM/CSS media placeholders only; NO real image/video/3D loading; security checks are narrow; stage1 research only'}));
 }finally{await browser.close()}
})().catch(e=>{console.error('STAGE1_MATCHED_CUSTOM_MEDIA_FAIL='+String(e.stack||e));process.exitCode=1});
