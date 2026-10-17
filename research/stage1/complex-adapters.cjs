/* AI Site CMS stage 1 research ONLY: real HTML, PHP, React and Next static export;
 * comparable RJSF complex editor, isolated preview, adaptive inheritance. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {JSDOM}=require('jsdom'),{chromium}=require('playwright-core'),esbuild=require('esbuild');
const {initial,schema,Section}=require('./adapter-section.cjs');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
if(!chrome)throw Error('Chrome required');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const element=(id,t,tag='span')=>'<'+tag+' data-stable-id="hero-'+id+'">'+esc(t)+'</'+tag+'>';
function html(d){return '<section data-kind="html" data-stable-id="hero-section" class="hero"><div class="left">'+element('title',d.title,'h1')+element('lead',d.lead,'p')+'<div class="actions">'+element('primary',d.primary,'button')+element('secondary',d.secondary,'button')+'</div><div class="features">'+d.features.map((x,i)=>element('feature-'+i,x)).join('')+'</div></div><aside class="right"><div class="cards">'+d.cards.map((x,i)=>element('card-'+i,x,'article')).join('')+'</div><div class="stats">'+d.stats.map((x,i)=>element('stat-'+i,x,'strong')).join('')+'</div></aside></section';}
const phpCode=[
 '<?php $d=json_decode(stream_get_contents(STDIN),true,32,JSON_THROW_ON_ERROR);',
 '$e=static fn($s)=>htmlspecialchars((string)$s,ENT_QUOTES|ENT_SUBSTITUTE,"UTF-8");',
 'function item(string $id,string $tag,string $text,callable $e):string{return "<{$tag} data-stable-id=\\"hero-{$id}\\">".$e($text)."</{$tag}>";}',
 'echo \'<section data-kind="php" data-stable-id="hero-section" class="hero"><div class="left">\';',
 'echo item("title","h1",$d["title"],$e),item("lead","p",$d["lead"],$e),\'<div class="actions">\';',
 'echo item("primary","button",$d["primary"],$e),item("secondary","button",$d["secondary"],$e),\'</div><div class="features">\';',
 'foreach($d["features"] as $i=>$s)echo item("feature-$i","span",$s,$e);',
 'echo \'</div></div><aside class="right"><div class="cards">\';',
 'foreach($d["cards"] as $i=>$s)echo item("card-$i","article",$s,$e);',
 'echo \'</div><div class="stats">\';',
 'foreach($d["stats"] as $i=>$s)echo item("stat-$i","strong",$s,$e);',
 'echo \'</div></aside></section>\';'].join('\n');
const css='html,body{margin:0;background:#10171a;color:white;font-family:Arial}.hero{--accent:#66e0c4;display:grid;grid-template-columns:1.3fr 1fr;gap:24px;padding:28px;box-sizing:border-box}.hero h1{font-size:64px;line-height:1.07}.hero button{background:var(--accent);border:0;padding:12px 18px}.features,.cards,.stats{display:flex;flex-wrap:wrap;gap:12px}.hero article,.hero strong{border:1px solid var(--accent);padding:18px}@media(max-width:800px){.hero{grid-template-columns:1fr}}';
const childScript=[
 'const t=__TOKEN__;',
 'function valid(v){if(!v||typeof v!=="object"||Array.isArray(v))return false;',
 'if(Object.keys(v).sort().join(",")!=="accent,cards,features,font,lead,primary,secondary,stats,title")return false;',
 'for(const k of ["title","lead","primary","secondary"])if(typeof v[k]!=="string"||v[k].length>500)return false;',
 'for(const [k,n] of [["features",3],["cards",2],["stats",2]])if(!Array.isArray(v[k])||v[k].length!==n||v[k].some(x=>typeof x!=="string"||x.length>120))return false;',
 'if(typeof v.accent!=="string"||!/^#[a-f0-9]{6}$/i.test(v.accent))return false;',
 'if(!v.font||Object.keys(v.font).sort().join(",")!=="desktop,mobile,tablet")return false;',
 'return /^(?:[0-9]{1,3})px$/.test(v.font.desktop)&&["tablet","mobile"].every(k=>typeof v.font[k]==="string"&&/^(?:|[0-9]{1,3}px)$/.test(v.font[k]));}',
 'function el(id){return document.querySelector("[data-stable-id=\\"hero-"+id+"\\"]")}',
 'window.addEventListener("message",event=>{const m=event.data;',
 'if(event.source!==parent||event.origin!=="null"||!m||m.token!==t||m.kind!=="render"||Object.keys(m).sort().join(",")!=="device,kind,state,token"||!valid(m.state)||!["desktop","tablet","mobile"].includes(m.device))return;',
 'const v=m.state;for(const k of ["title","lead","primary","secondary"])el(k).textContent=v[k];',
 'for(const [key,prefix] of [["features","feature"],["cards","card"],["stats","stat"]])v[key].forEach((x,i)=>el(prefix+"-"+i).textContent=x);',
 'const size=(m.device==="mobile"&&v.font.mobile)||(m.device!=="desktop"&&v.font.tablet)||v.font.desktop;',
 'el("title").style.fontSize=size;el("section").style.setProperty("--accent",v.accent);',
 'parent.postMessage({kind:"applied",token:t,font:size,title:v.title,device:m.device},"*");});',
 'parent.postMessage({kind:"ready",token:t},"*");'].join('');
const entry=["import React from 'react'","import {createRoot} from 'react-dom/client'","import Form from '@rjsf/core'","import {customizeValidator} from '@rjsf/validator-ajv8'","import Ajv2020 from 'ajv/dist/2020.js'","window.React=React;window.makeRoot=createRoot;window.Form=Form;window.validator=customizeValidator({AjvClass:Ajv2020})"].join(';');
const bundle=esbuild.buildSync({stdin:{contents:entry,sourcefile:'research-form.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
function mount(){const root=window.makeRoot(document.getElementById('editor'));window.current=structuredClone(window.testInitial);window.published=structuredClone(window.testInitial);root.render(window.React.createElement(window.Form,{schema:window.testSchema,formData:window.current,validator:window.validator,onChange:e=>{window.current=e.formData;window.paint()},children:window.React.createElement('span',null,'Draft only')}));window.unmount=()=>root.unmount();}
async function run(){
 const dir=fs.mkdtempSync(path.join(__dirname,'.adapter-probe-'));const results=[];
 try{
  fs.writeFileSync(path.join(dir,'render.php'),phpCode);
  const php=spawnSync('php',[path.join(dir,'render.php')],{input:JSON.stringify(initial),encoding:'utf8'});
  assert.equal(php.status,0,'PHP renderer: '+php.stderr);
  const variants={html:html(initial),php:php.stdout,react:renderToStaticMarkup(React.createElement(Section,{kind:'react'}))};
  fs.copyFileSync(path.join(__dirname,'adapter-section.cjs'),path.join(dir,'adapter-section.cjs'));
  fs.mkdirSync(path.join(dir,'pages'));
  fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'cms-stage1-next-export',private:true,version:'0.0.0'}));
  fs.writeFileSync(path.join(dir,'next.config.js'),"module.exports={output:'export',reactStrictMode:true,eslint:{ignoreDuringBuilds:true}};\n");
  fs.writeFileSync(path.join(dir,'pages','index.js'),"const React=require('react');const Section=require('../adapter-section.cjs').Section;module.exports=function Page(){return React.createElement(Section,{kind:'next-static'})};\n");
  const next=spawnSync(process.execPath,[require.resolve('next/dist/bin/next'),'build',dir],{cwd:__dirname,encoding:'utf8',timeout:200000,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',CI:'1'},maxBuffer:4*1024*1024});
  assert.equal(next.status,0,'Next static export failed: '+next.stderr+'\n'+next.stdout.slice(-3200));
  const artifact=path.join(dir,'out','index.html');assert.ok(fs.existsSync(artifact),'Next out/index.html not found');
  const nextSection=new JSDOM(fs.readFileSync(artifact,'utf8')).window.document.querySelector('[data-kind="next-static"]');
  assert.ok(nextSection,'Next exported section missing');variants['next-static']=nextSection.outerHTML;
  const ids=['hero-section','hero-title','hero-lead','hero-primary','hero-secondary','hero-feature-0','hero-feature-1','hero-feature-2','hero-card-0','hero-card-1','hero-stat-0','hero-stat-1'];
  const reference=new JSDOM(html(initial)).window.document;
  for(const [kind,markup] of Object.entries(variants)){const doc=new JSDOM(markup).window.document;for(const id of ids){assert.equal(doc.querySelectorAll('[data-stable-id="'+id+'"]').length,1,kind+' missing/duplicate '+id);assert.equal(doc.querySelector('[data-stable-id="'+id+'"]').textContent,reference.querySelector('[data-stable-id="'+id+'"]').textContent,kind+' differs '+id);}}
  const hostile={...initial,title:'<img src=x onerror=alert(1)>'};
  const ph=spawnSync('php',[path.join(dir,'render.php')],{input:JSON.stringify(hostile),encoding:'utf8'});
  assert.equal(ph.status,0);assert.equal(new JSDOM(ph.stdout).window.document.querySelectorAll('img').length,0);
  assert.equal(new JSDOM(renderToStaticMarkup(React.createElement(Section,{value:hostile}))).window.document.querySelectorAll('img').length,0);
  const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
  try{
   for(const [kind,markup] of Object.entries(variants)){
    const page=await browser.newPage({viewport:{width:1450,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent('<!doctype html><html><body><div id="editor"></div><iframe id="preview" sandbox="allow-scripts" style="width:1200px;height:540px"></iframe></body></html>');
    await page.addScriptTag({content:bundle});await page.evaluate(({schema,initial})=>{window.testSchema=schema;window.testInitial=initial},{schema,initial});
    await page.evaluate(mount);await page.locator('#root_title').waitFor({timeout:15000});
    await page.evaluate(({markup,css,script})=>{
     const frame=document.getElementById('preview');const token=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
     window.probe={token,ready:false,acks:[],device:'desktop'};
     window.paint=()=>{if(window.probe.ready)frame.contentWindow.postMessage({kind:'render',token,state:window.current,device:window.probe.device},'*')};
     window.choose=device=>{window.probe.device=device;frame.style.width=({desktop:1200,tablet:750,mobile:375})[device]+'px';window.paint()};
     window.addEventListener('message',event=>{const m=event.data;if(event.source!==frame.contentWindow||event.origin!=='null'||m?.token!==token)return;if(m.kind==='ready'){window.probe.ready=true;window.paint()}if(m.kind==='applied')window.probe.acks.push(m)});
     frame.srcdoc='<!doctype html><html><head><style>'+css+'</style></head><body>'+markup+'<script>'+script.replace('__TOKEN__',JSON.stringify(token))+'</scr'+'ipt></body></html>';
    },{markup,css,script:childScript});
    try{await page.waitForFunction(()=>window.probe?.acks.some(a=>a.font==='64px'),null,{timeout:10000})}
    catch(error){
     const info=await page.evaluate(()=>({probe:window.probe,current:window.current,frameSrcdoc:document.getElementById('preview').srcdoc.slice(-550)}));
     const child=await page.frameLocator('#preview').locator('body').evaluate(e=>({ready:document.readyState,globalToken:typeof t==='undefined'?'undefined':t,bodyText:e.textContent.slice(0,130)})).catch(e=>({frameError:String(e)}));
     console.error('STAGE1_ADAPTER_DIAGNOSTIC='+JSON.stringify({kind,info,child,errors}));
     throw error;
    }
    const frame=page.frameLocator('#preview');assert.equal(await page.locator('iframe').count(),1);assert.equal(await frame.locator('[data-stable-id]').count(),ids.length);
    await page.evaluate(()=>window.choose('tablet'));await page.waitForFunction(()=>window.probe.acks.some(x=>x.device==='tablet'&&x.font==='48px'));
    await page.locator('#root_font_tablet').fill('52px');await page.waitForFunction(()=>window.current.font.tablet==='52px'&&window.probe.acks.some(x=>x.font==='52px'));
    await page.evaluate(()=>window.choose('mobile'));await page.waitForFunction(()=>window.probe.acks.some(x=>x.device==='mobile'&&x.font==='52px'));
    await page.locator('#root_font_mobile').fill('32px');await page.waitForFunction(()=>window.current.font.mobile==='32px'&&window.probe.acks.some(x=>x.device==='mobile'&&x.font==='32px'));
    await page.locator('#root_primary').fill('Owner-approved CTA');await page.locator('#root_features_0').fill('Edited first feature');await page.locator('#root_cards_0').fill('Edited first card');
    await page.waitForFunction(()=>window.current.cards[0]==='Edited first card'&&window.current.features[0]==='Edited first feature');
    assert.equal(await frame.locator('[data-stable-id="hero-primary"]').innerText(),'Owner-approved CTA');
    assert.equal(await frame.locator('[data-stable-id="hero-feature-0"]').innerText(),'Edited first feature');
    assert.equal(await frame.locator('[data-stable-id="hero-card-0"]').innerText(),'Edited first card');
    await page.locator('#root_title').fill('<img src=x onerror=alert(1)>');
    await page.waitForFunction(()=>window.probe.acks.some(x=>x.title==='<img src=x onerror=alert(1)>'));
    assert.equal(await frame.locator('[data-stable-id="hero-title"] img').count(),0);assert.equal(await frame.locator('[data-stable-id="hero-title"]').innerText(),'<img src=x onerror=alert(1)>');
    const before=await frame.locator('[data-stable-id="hero-title"]').evaluate(e=>({font:e.style.fontSize,text:e.textContent}));
    await page.evaluate(()=>{window.ackBefore=window.probe.acks.length;document.getElementById('preview').contentWindow.postMessage({kind:'render',token:window.probe.token,state:{...window.current,accent:'url(javascript:alert(1))'},device:'mobile'},'*')});
    await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>window.probe.acks.length),await page.evaluate(()=>window.ackBefore));
    assert.deepEqual(await frame.locator('[data-stable-id="hero-title"]').evaluate(e=>({font:e.style.fontSize,text:e.textContent})),before);
    assert.equal(await page.evaluate(()=>window.published.title),initial.title);assert.deepEqual(errors,[]);
    results.push({renderer:kind,stableIds:ids.length,iframe:1,actualRjsf:true,mobileInherited:'52px',mobileOverridden:'32px',hostileCssRejected:true,textXssSafe:true,pageErrors:errors.length});
    await page.evaluate(()=>window.unmount());await page.close();
   }
  }finally{await browser.close()}
  console.log('STAGE1_COMPLEX_ADAPTERS='+JSON.stringify({pass:true,phpCli:true,reactSsr:true,nextStaticExport:true,tests:results,limits:'research only; Next SSR NOT tested; no actual shared hosting; no production CMS or approved requirements'}));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
}
run().catch(e=>{console.error('STAGE1_COMPLEX_ADAPTERS_FAIL='+String(e.stack||e));process.exitCode=1});
