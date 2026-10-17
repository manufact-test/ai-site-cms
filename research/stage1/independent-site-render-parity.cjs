/* Stage 1 ONLY. Extract only a trusted, manually mapped, content-only view
 * from the uninstrumented site and compare HTML/PHP/React outputs.
 * This is NOT full original HTML/CSS/JS adaptation and not Next SSR. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const site=fs.readFileSync(path.join(__dirname,'fixtures/tide-atlas-standalone.html'),'utf8');
const document=new JSDOM(site,{runScripts:'outside-only'}).window.document;
const text=id=>document.getElementById(id).textContent.trim();
const baseline={title:text('hero-title'),deck:text('hero-deck'),cta:text('hero-link'),href:document.getElementById('hero-link').getAttribute('href')};
const isPlain=o=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
const escaped=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function validate(v){
 if(!isPlain(v)||Object.keys(v).sort().join(',')!=='cta,deck,href,title')throw Error('shape');
 if(['title','deck','cta'].some(k=>typeof v[k]!=='string'||v[k].length>400))throw Error('unsafe text');
 if(typeof v.href!=='string'||!/^#[a-z][a-z0-9-]{0,50}$/.test(v.href))throw Error('invalid internal href');
 return v;
}
function raw(v){
 validate(v);
 return '<section data-view="trusted-content-only"><h1 data-stable-id="hero-title">'+escaped(v.title)+'</h1><p data-stable-id="hero-deck">'+escaped(v.deck)+'</p><a data-stable-id="hero-link" href="'+escaped(v.href)+'">'+escaped(v.cta)+'</a></section>';
}
function react(v){
 validate(v);
 const elt=(name,id,props,body)=>React.createElement(name,{'data-stable-id':id,...props},body);
 return renderToStaticMarkup(React.createElement('section',{'data-view':'trusted-content-only'},
  elt('h1','hero-title',{},v.title),elt('p','hero-deck',{},v.deck),elt('a','hero-link',{href:v.href},v.cta)));
}
const php=String.raw`<?php
$d=json_decode(stream_get_contents(STDIN),true,16,JSON_THROW_ON_ERROR);
if(array_keys($d)!==['title','deck','cta','href']){fwrite(STDERR,'shape');exit(7);}
foreach(['title','deck','cta'] as $k){if(!is_string($d[$k])||strlen($d[$k])>400){fwrite(STDERR,'text');exit(8);}}
if(!is_string($d['href'])||!preg_match('/^#[a-z][a-z0-9-]{0,50}$/D',$d['href'])){fwrite(STDERR,'href');exit(9);}
$e=static fn($s)=>htmlspecialchars($s, ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8');
echo '<section data-view="trusted-content-only"><h1 data-stable-id="hero-title">'.$e($d['title']).'</h1><p data-stable-id="hero-deck">'.$e($d['deck']).'</p><a data-stable-id="hero-link" href="'.$e($d['href']).'">'.$e($d['cta']).'</a></section>';
`;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stage1-tide-parity-'));
const phpPath=path.join(dir,'render.php');
let negative=0;
function refusal(fn){assert.throws(fn);negative++}
function semantic(output){
 const doc=new JSDOM(output).window.document;
 const ids=[...doc.querySelectorAll('[data-stable-id]')].map(x=>x.getAttribute('data-stable-id'));
 assert.deepEqual(ids,['hero-title','hero-deck','hero-link']);
 assert.equal(doc.querySelectorAll('script,img,iframe,form').length,0);
 return {title:doc.querySelector('h1').textContent,deck:doc.querySelector('p').textContent,
  cta:doc.querySelector('a').textContent,href:doc.querySelector('a').getAttribute('href')};
}
try{
 fs.writeFileSync(phpPath,php);
 assert.deepEqual(baseline,{title:'The coast is alive.',deck:'Tools for people listening to the changing ocean.',cta:'Receive field notes ↗',href:'#join'});
 const edited={...baseline,title:'Coastline <img src=x onerror=alert(1)> & sailors',deck:'A & B <script>evil()</script>',cta:'See notes',href:'#faq'};
 const cases=[baseline,edited];let compared=0;
 for(const values of cases){
  const v=validate(values);
  const html=raw(v),jsx=react(v);
  const run=spawnSync('php',[phpPath],{input:JSON.stringify(v),encoding:'utf8'});
  assert.equal(run.status,0,'PHP failed: '+run.stderr);
  for(const markup of [html,jsx,run.stdout]){
   assert.deepEqual(semantic(markup),v);
   compared++;
  }
 }
 const invalid=[{...baseline,href:'javascript:alert(1)'},{...baseline,href:'https://evil.invalid'},
  {...baseline,title:null},{...baseline,extra:'x'},{...baseline,href:'#A'},
  {...baseline,cta:'x'.repeat(401)}];
 for(const v of invalid){
  refusal(()=>raw(v));refusal(()=>react(v));
  const run=spawnSync('php',[phpPath],{input:JSON.stringify(v),encoding:'utf8'});
  assert.notEqual(run.status,0,'PHP accepted invalid payload');negative++;
 }
 console.log('STAGE1_INDEPENDENT_SITE_RENDER_PARITY='+JSON.stringify({pass:true,
  source:'tide-atlas-standalone.html',renderers:['html','php-cli','react-static'],
  states:2,semanticMatches:compared,invalidPayloadRejections:negative,
  maliciousTextEscaped:true,unsafeHrefRefused:true,
  phpHostingRuntime:'PHP CLI on GitHub runner, not actual Hostinger',
  excludedFromAdaptedView:['gradient/CSS grid','SVG','dialog','forms','scripts','responsive CSS','SEO'],
  limits:'manually mapped content-only three-node subview, not full-site automatic import, not Next runtime, not production publish'}));
}finally{fs.rmSync(dir,{recursive:true,force:true})}
