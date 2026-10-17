/* Stage 1 research ONLY: realistic Hero DOM, actual Jedison edits, breakpoint isolated iframe, XSS text escaping. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),esbuild=require('esbuild');
const {chromium}=require('playwright-core');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
if(!chrome)throw Error('Chrome required');
const schema={type:'object',additionalProperties:false,required:['title','responsive','accent','cta','animationMs'],properties:{
 title:{type:'string',title:'Hero headline'},responsive:{type:'object',title:'Responsive size',additionalProperties:false,required:['desktop','tablet','mobile'],properties:{
 desktop:{type:'string',title:'Desktop',pattern:'^[0-9]{1,3}px$'},
 tablet:{type:'string',title:'Tablet (empty=inherited)',pattern:'^$|^[0-9]{1,3}px$'},
 mobile:{type:'string',title:'Mobile (empty=inherited)',pattern:'^$|^[0-9]{1,3}px$'}}},
 accent:{type:'string',pattern:'^#[a-fA-F0-9]{6}$'},cta:{type:'string'},animationMs:{type:'integer',minimum:0,maximum:10000}
}};
const data={title:'Explore tomorrow',responsive:{desktop:'64px',tablet:'48px',mobile:''},accent:'#66e0c4',cta:'Discover more',animationMs:500};
const editorSource=["im","port Jedison from 'jedison';window.attachEditor=(s,d)=>{const ed=new Jedison.Create({container:document.getElementById('fields'),theme:new Jedison.Theme(),schema:s,data:d,keepMissingSchemaFields:true});window.editorValue=()=>ed.getValue();ed.on('change',()=>{window.updated++;window.sendRender();});window.dispose=()=>ed.destroy();};"].join('');
const js=esbuild.buildSync({stdin:{contents:editorSource,sourcefile:'hero-entry.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
function boot(){
 const iframe=document.getElementById('preview'), index=document.getElementById('index');
 for(let i=0;i<50;i++){const div=document.createElement('div');div.textContent='Hero candidate block '+i;index.appendChild(div)}
 const token=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 window.previewState={token,ready:false,acks:[],dirty:false,publishedTitle:'Explore tomorrow'};
 window.updated=0;window.mode='desktop';
 window.pickSize=value=>{
  if(window.mode==='mobile'&&value.responsive.mobile)return value.responsive.mobile;
  if((window.mode==='tablet'||window.mode==='mobile')&&value.responsive.tablet)return value.responsive.tablet;
  return value.responsive.desktop;
 };
 window.sendRender=()=>{
  const d=window.editorValue?.();if(!d||!window.previewState.ready)return;
  const msg={kind:'render',token,title:d.title,fontSize:window.pickSize(d),accent:d.accent,cta:d.cta,duration:d.animationMs};
  iframe.contentWindow.postMessage(msg,'*');
 };
 window.setDevice=mode=>{
  if(!['desktop','tablet','mobile'].includes(mode))throw Error('unexpected device');
  window.mode=mode;iframe.style.width=({desktop:'1200px',tablet:'750px',mobile:'375px'})[mode];window.sendRender();
 };
 window.addEventListener('message',ev=>{
  const m=ev.data;if(ev.source!==iframe.contentWindow||ev.origin!=='null'||!m||m.token!==token)return;
  if(m.kind==='ready')window.previewState.ready=true;
  if(m.kind==='applied'&&typeof m.fontSize==='string')window.previewState.acks.push({fontSize:m.fontSize,title:m.title});
 });
 const childScript=[
  'const token='+JSON.stringify(token)+';',
  'window.addEventListener("message",ev=>{',
  'const m=ev.data;if(ev.source!==parent||!m||m.kind!=="render"||m.token!==token||Object.keys(m).sort().join(",")!=="accent,cta,duration,fontSize,kind,title,token")return;',
  'if(typeof m.title!=="string"||m.title.length>500||typeof m.cta!=="string"||m.cta.length>200||typeof m.fontSize!=="string"||!/^[0-9]{1,3}px$/.test(m.fontSize)||typeof m.accent!=="string"||!/^#[a-f0-9]{6}$/i.test(m.accent)||!Number.isInteger(m.duration)||m.duration<0||m.duration>10000)return;',
  'const h=document.querySelector("#hero-title");h.textContent=m.title;h.style.fontSize=m.fontSize;',
  'document.querySelector("#hero-cta").textContent=m.cta;',
  'document.querySelector("#hero").style.setProperty("--accent",m.accent);',
  'document.querySelector("#hero").style.setProperty("--duration",m.duration+"ms");',
  'parent.postMessage({kind:"applied",token,fontSize:h.style.fontSize,title:h.textContent},"*");',
  '});parent.postMessage({kind:"ready",token},"*");'
 ].join('');
 const hero=[
 '<html><head><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;unsafe-inline&#39;; style-src &#39;unsafe-inline&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;">',
 '<style>html,body{margin:0;background:#0b1013;color:white;font-family:Arial,sans-serif}#hero{--accent:#66e0c4;--duration:500ms;min-height:500px;display:grid;grid-template-columns:1.2fr 1fr;gap:2rem;align-items:center;padding:32px;box-sizing:border-box}',
 '.card{border:1px solid var(--accent);border-radius:24px;background:linear-gradient(135deg,#20343b,#0b1013);padding:40px}.label{color:var(--accent)}h1{line-height:1.1;max-width:680px;margin:14px 0;transition:font-size var(--duration)}',
 '#hero-cta{background:var(--accent);border:0;padding:16px 28px;border-radius:999px;color:#0b1013}.features{display:flex;gap:16px;flex-wrap:wrap}',
 '@media(max-width:800px){#hero{grid-template-columns:1fr;gap:16px;padding:24px}}@media(max-width:480px){#hero{padding:14px}.card{padding:18px}}',
 '</style></head><body><section id="hero"><div><div class="label">AI SITE CMS RESEARCH</div><h1 id="hero-title">Explore tomorrow</h1><p>Substantial section with multi-element layout, styles, CTA and responsive breakpoints.</p><button id="hero-cta">Discover more</button>',
 '<div class="features"><span>Stable IDs</span><span>Typed values</span><span>Adaptive layout</span></div></div><div class="card"><h2>Feature highlights</h2><p>Decorative cards, linear gradient and responsive columns.</p><div class="card">Layered surface</div></div></section>',
 '<script>'+childScript+'</scr'+'ipt></body></html>'
 ].join('');
 iframe.srcdoc=hero;
}
(async()=>{
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:900}});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.setContent('<!doctype html><html><body><aside id="index"></aside><section id="fields"></section><iframe id="preview" sandbox="allow-scripts" style="height:560px;border:0"></iframe></body></html>');
  await page.evaluate(boot);await page.waitForFunction(()=>window.previewState?.ready,{timeout:10000});
  await page.addScriptTag({content:js});
  await page.evaluate(({schema,data})=>window.attachEditor(schema,data),{schema,data});
  await page.waitForFunction(()=>document.querySelectorAll('#fields input').length>=6,{timeout:10000});
  await page.evaluate(()=>window.sendRender());
  await page.waitForFunction(()=>window.previewState.acks.some(x=>x.fontSize==='64px'));
  const frame=page.frameLocator('#preview');
  async function waitComputed(size){await frame.locator('#hero-title').evaluate(async(el,want)=>{for(let i=0;i<85;i++){if(getComputedStyle(el).fontSize===want)return;await new Promise(r=>setTimeout(r,20))}throw Error('CSS transition did not settle: expected '+want+' actual '+getComputedStyle(el).fontSize)},size)}
  await waitComputed('64px');
  assert.equal(await page.locator('#index>div').count(),50);assert.equal(await page.locator('iframe').count(),1);
  await page.evaluate(()=>window.setDevice('tablet'));
  await page.waitForFunction(()=>window.previewState.acks.some(x=>x.fontSize==='48px'));
  await waitComputed('48px');
  async function edit(oldVal,newVal){
   const values=await page.locator('#fields input').evaluateAll(xs=>xs.map(x=>({value:x.value,type:x.type})));
   const i=values.findIndex(x=>x.value===oldVal&&x.type!=='hidden');assert.ok(i>=0,'input not found '+oldVal+' '+JSON.stringify(values));
   const el=page.locator('#fields input').nth(i);await el.fill(newVal);await el.dispatchEvent('change');await el.blur();
  }
  await edit('48px','52px');
  await page.waitForFunction(()=>window.editorValue()?.responsive.tablet==='52px');
  await page.waitForFunction(()=>window.previewState.acks.some(x=>x.fontSize==='52px'));
  await page.evaluate(()=>window.setDevice('mobile'));
  await waitComputed('52px'); // mobile empty field inherits tablet
  await edit('','32px');
  await page.waitForFunction(()=>window.editorValue()?.responsive.mobile==='32px');
  await page.waitForFunction(()=>window.previewState.acks.some(x=>x.fontSize==='32px'));
  await waitComputed('32px');
  const payload='<img src=x onerror=alert(1)>';
  await edit('Explore tomorrow',payload);
  await page.waitForFunction(()=>window.editorValue()?.title==='<img src=x onerror=alert(1)>');
  await page.waitForFunction(()=>window.previewState.acks.some(x=>x.title==='<img src=x onerror=alert(1)>'));
  assert.equal(await frame.locator('#hero-title img').count(),0,'title must never parse HTML');
  assert.equal(await frame.locator('#hero-title').innerText(),payload);
  const layout=await frame.locator('#hero').evaluate(e=>({columns:getComputedStyle(e).gridTemplateColumns,font:getComputedStyle(document.querySelector('#hero-title')).fontSize,children:e.children.length}));
  assert.equal(layout.children,2);assert.equal(layout.font,'32px');
  assert.equal(await page.evaluate(()=>window.previewState.publishedTitle),'Explore tomorrow');
  assert.equal((await page.evaluate(()=>window.editorValue())).responsive.desktop,'64px');
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.dispose());await page.close();
  console.log('STAGE1_REPRESENTATIVE_HERO='+JSON.stringify({pass:true,upstream:'jedison@1.27.1',iframes:1,metadataSections:50,desktop:'64px',tabletEdited:'52px',mobileInherited:'52px',mobileOverridden:'32px',mobileColumns:layout.columns,xssRenderedAsText:true,publishedUnaffected:true,jsPageErrors:errors.length,limits:'synthetic CSS Hero, no external media or site backend, not production or actual Hostinger'}));
 }finally{await browser.close()}
})().catch(e=>{console.error('STAGE1_REPRESENTATIVE_HERO_FAIL='+String(e.stack||e));process.exitCode=1});
