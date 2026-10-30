'use strict';
/* New SEO Studio baseline is a provisional browser-only preview; never source approval. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const STUDIO=require('../lib/blueprint-studio.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
const html=STUDIO.render(fixture),script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script);
assert(html.includes('Draft vs previous SEO Blueprint'));
assert(html.includes('Load previous private Blueprint/brief'));
const map=new Map(),downloads=[];
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.value='';this.textContent='';
  this.handlers={};this.files=[];this.open=false;}
 append(...xs){this.children.push(...xs);}
 replaceChildren(...xs){this.children=xs;}
 addEventListener(k,fn){this.handlers[k]=fn;}
 click(){if(this.tag==='a')downloads.push(this.download);else this.handlers.click?.();}
 remove(){}
}
const document={body:new Element('body'),createElement:t=>new Element(t),
 getElementById:id=>{if(!map.has(id))map.set(id,new Element('div'));return map.get(id);}};
const $=id=>document.getElementById(id);
$('source-json').textContent=JSON.stringify(fixture);
vm.runInNewContext(script,{document,
 URL:{createObjectURL:()=> 'blob:private-only',revokeObjectURL:()=>{}},
 Blob:class{constructor(bytes){this.bytes=bytes;}},
 setTimeout:fn=>fn()},{timeout:1500});
assert($('baseline-status').textContent.includes('No previous plan'));
async function main(){
 const baseline=JSON.parse(JSON.stringify(fixture));
 baseline.pages[1].path='/new-contact/';
 baseline.pages[1].seo.title='Updated contact page';
 $('baseline-import').files=[{size:900,text:async()=>JSON.stringify(baseline)}];
 await $('baseline-import').handlers.change({target:$('baseline-import')});
 const numbers=$('baseline-stats').children.map(e=>e.children.map(c=>c.textContent));
 assert(numbers.some(([label,num])=>label==='Moved URLs'&&num==='1'));
 assert(numbers.some(([label,num])=>label==='SEO head changes'&&num==='1'));
 assert($('baseline-status').textContent.includes('UNVERIFIED BROWSER PREVIEW'));
 $('baseline-import').files=[{size:900,text:async()=>JSON.stringify({...baseline,siteId:'wrong-site'})}];
 await $('baseline-import').handlers.change({target:$('baseline-import')});
 assert($('message').textContent.includes('refused'));
 $('baseline-clear').click();
 assert($('baseline-status').textContent.includes('No previous plan'));
 $('export').click();
 assert(downloads.some(x=>x.startsWith('seo-brief-')),
  'Baseline preview cannot disable original authoritative compile export');
 console.log('Blueprint Studio provisional old/new baseline UI, safety and export smoke PASS.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
