'use strict';
/* Exercises the generated offline browser UI with a minimal DOM, not a live website. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 vm=require('node:vm');
const STUDIO=require('../lib/blueprint-studio.cjs');
const brief=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
const html=STUDIO.render(brief);
const javascript=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(javascript,'Expected self-contained, CSP-hashed offline browser script');
const cells=new Map(),downloads=[];
class Element{
 constructor(tag){this.tag=tag;this.value='';this.textContent='';this.children=[];this.handlers={};this.files=[];}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 addEventListener(event,handler){this.handlers[event]=handler;}
 click(){if(this.tag==='a')downloads.push(this.download);else this.handlers.click?.();}
 remove(){}
}
const document={
 body:new Element('body'),createElement:tag=>new Element(tag),
 getElementById:id=>{
  if(!cells.has(id))cells.set(id,new Element('div'));
  return cells.get(id);
 }
};
cells.set('source-json',Object.assign(new Element('script'),{textContent:JSON.stringify(brief)}));
vm.runInNewContext(javascript,{document,
 URL:{createObjectURL:()=> 'blob:local-only',revokeObjectURL:()=>{}},
 Blob:class{constructor(bytes,options){this.bytes=bytes;this.options=options;}},
 setTimeout:fn=>fn()},{timeout:1000});
const $=id=>document.getElementById(id);
const stats=$('arch-overview').children.map(el=>el.children.map(x=>x.textContent));
assert.equal($('arch-pages').children.length,2);
assert(stats.some(([name,count])=>name==='Explicit edges'&&count==='3'));
$('export').click();
assert.equal(downloads.length,1);
assert(downloads[0].startsWith('seo-brief-'));
$('add-page').click();
assert.equal($('arch-pages').children.length,3);
assert($('problems').children.length>1);
$('export').click();
assert.equal(downloads.length,1,'Incomplete new page must not be exported as validated');
$('draft').click();
assert.equal(downloads.length,2);
assert(downloads[1].startsWith('seo-brief-draft-'));
assert($('message').textContent.includes('draft'));
assert.equal(typeof $('site').children[0].children[1].readOnly,'boolean');
assert.equal($('site').children[0].children[1].readOnly,true);
console.log('Blueprint Studio offline browser edits, architecture and draft/export smoke PASS.');
