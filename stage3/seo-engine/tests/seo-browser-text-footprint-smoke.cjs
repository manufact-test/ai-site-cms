'use strict';
/* Browser main text footprint synthetic real Node sample; original copy stays private. */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const vm=require('node:vm');
const TEXT=require('../lib/seo-browser-text-footprint.cjs');
const hash=crypto.createHash('sha256').update('private synthetic DOM').digest('hex');
const main={textContent:'SECRET-CUSTOMER-COPY raw text from the main region',
 innerText:'SECRET-CUSTOMER-COPY visible',isConnected:true};
const para={textContent:'SECRET-CUSTOMER-COPY visible paragraph',
 getBoundingClientRect:()=>({width:180,height:30}),checkVisibility:()=>true};
const hidden={textContent:'SECRET-CUSTOMER-COPY hidden paragraph',
 getBoundingClientRect:()=>({width:180,height:30}),checkVisibility:()=>false};
const prevDoc=global.document,prevStyle=global.getComputedStyle;
try{
 global.document={querySelectorAll:selector=>{
  if(selector==='main,[role="main"]')return [main];
  if(selector==='main p,main li,[role="main"] p,[role="main"] li')return [para,hidden];
  return [];
 }};
 global.getComputedStyle=()=>({display:'block',visibility:'visible',opacity:'1'});
 const data=TEXT.sample();
 const isolated=vm.runInNewContext('('+TEXT.sample.toString()+')()',
  {document:global.document,getComputedStyle:global.getComputedStyle});
 assert.deepEqual(JSON.parse(JSON.stringify(isolated)),data,
  'page.evaluate sampler must not depend on Node module closure');
 assert.equal(data.status,'observed');
 assert.equal(data.counts.mainRegions,1);
 assert.equal(data.counts.mainRenderedTextChars,'SECRET-CUSTOMER-COPY visible'.length);
 assert.equal(data.counts.visibleTextBlocks,1);
 assert.equal(data.counts.hiddenTextBlocks,1);
 assert.equal(data.counts.textBlocks,2);
 assert(!JSON.stringify(data).includes('SECRET-CUSTOMER-COPY'));
 const obs={method:TEXT.METHOD,status:'observed',
  checkedAt:'2026-10-31T00:00:00Z',htmlSha256:hash,counts:data.counts};
 assert.equal(TEXT.assertObservation(obs,hash),obs);
 assert.throws(()=>TEXT.assertObservation(obs,'f'.repeat(64)),/another rendered DOM/);
 assert.throws(()=>TEXT.assertObservation({...obs,counts:{
  ...data.counts,visibleTextBlocks:3}},hash),/inconsistent/);
 main.innerText='';
 assert.equal(TEXT.sample().counts.mainRenderedTextChars,0);
 main.textContent='x'.repeat(260000);
 assert.deepEqual(TEXT.sample(),{status:'unavailable',reason:'element-limit'});
 assert.equal(TEXT.assertObservation({method:TEXT.METHOD,status:'unavailable',
  checkedAt:'2026-10-31T00:00:00Z',reason:'element-limit'}).status,'unavailable');
}finally{
 if(prevDoc===undefined)delete global.document;else global.document=prevDoc;
 if(prevStyle===undefined)delete global.getComputedStyle;else global.getComputedStyle=prevStyle;
}
process.stdout.write('Real Node browser main text footprint synthetic smoke PASS.\n');
