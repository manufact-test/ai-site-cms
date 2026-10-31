'use strict';
/* Synthetic read-only browser layout states, executed in real Node.
 * No browser, real client URL, screenshot or publication.
 */
const assert=require('node:assert/strict');
const OBS=require('../lib/seo-browser-responsive-observation.cjs');
const crypto=require('node:crypto');
const vm=require('node:vm');
const digest=crypto.createHash('sha256').update('<html>synthetic</html>').digest('hex');
const viewport={width:390,height:844};
const item=(left,top,width,height,styles={},text='')=>({
 isConnected:true,textContent:text,
 getBoundingClientRect(){return {left,top,width,height,right:left+width,bottom:top+height}},
 getClientRects(){return [{left,top,width,height}]},
 checkVisibility(){return true},styles,
 getAttribute(name){return this.attrs?.[name]??null}
});
const heading=item(-13,60,340,40);
const paragraph=item(10,110,360,48,{fontSize:'10px'},'Some sufficiently long synthetic body text.');
const tiny=item(10,165,18,20);
const regular=item(42,165,84,44);
const hidden=item(160,165,12,12,{display:'none'});
const overlay=item(0,200,390,400,{position:'fixed'});
const meta={attrs:{name:'viewport',content:'width=980, user-scalable=no'},
 getAttribute(name){return this.attrs[name]}};
const entries=[heading,paragraph,tiny,regular,hidden,overlay];
const list=sel=>({
 '*':entries,
 'main,[role="main"],h1,h2,h3,h4,h5,h6,p,li':[heading,paragraph],
 'a[href],button,input:not([type="hidden"]),select,textarea,[role="button"]':[tiny,regular,hidden],
 'p,li':[paragraph],
 'meta[name]':[meta]
})[sel]||[];
const previousDocument=global.document,previousStyles=global.getComputedStyle;
try{
 global.document={documentElement:{scrollWidth:426},body:{scrollWidth:410},
  querySelectorAll:sel=>list(sel)};
 global.getComputedStyle=el=>({
  display:'block',visibility:'visible',opacity:'1',position:'static',fontSize:'16px',
  ...(el.styles||{})});
 const result=OBS.sample(viewport);
 assert.equal(result.status,'observed');
 const isolated=vm.runInNewContext('('+OBS.sample.toString()+')(viewport)',
  {document:global.document,getComputedStyle:global.getComputedStyle,viewport});
 assert.deepEqual(JSON.parse(JSON.stringify(isolated)),result,
  'page.evaluate sampler must not depend on Node module closure');
 assert.deepEqual(result.counts,{
  viewportMetaPresent:1,viewportMetaDeviceWidth:0,viewportMetaMultiple:0,
  viewportMetaFixedWidth:1,
  viewportMetaZoomRestricted:1,horizontalOverflowPx:36,
  prominentVisible:2,prominentClipped:1,
  interactiveVisible:2,interactiveUnder24:1,interactiveUnder44:1,
  interactiveMissingName:2,
  textBlocksVisible:1,textBlocksUnder12:1,largeFixedOverlayCandidates:1});
 const envelope={method:OBS.METHOD,status:'observed',checkedAt:'2026-10-31T00:00:00Z',
  htmlSha256:digest,counts:result.counts};
 assert.equal(OBS.assertObservation(envelope,digest),envelope);
 assert(!JSON.stringify(result).includes('synthetic body text'));
 assert.throws(()=>OBS.assertObservation(envelope,'f'.repeat(64)),/another rendered DOM/);
 assert.throws(()=>OBS.assertObservation({...envelope,counts:{
  ...result.counts,interactiveUnder24:4}},digest),/inconsistent/);
 assert.throws(()=>OBS.assertObservation({...envelope,extra:'untrusted'},digest),/another rendered DOM/);
 global.document.documentElement=null;
 assert.deepEqual(OBS.sample(viewport),{status:'unavailable',reason:'sampling-error'});
 global.document.documentElement={scrollWidth:426};
 global.document.querySelectorAll=sel=>sel==='*'?Array(3501).fill(tiny):list(sel);
 const oversized=OBS.sample(viewport);
 assert.deepEqual(oversized,{status:'unavailable',reason:'element-limit'});
 assert.equal(OBS.assertObservation({method:OBS.METHOD,status:'unavailable',
  checkedAt:'2026-10-31T00:00:00Z',reason:'element-limit'}).status,'unavailable');
}finally{
 if(previousDocument===undefined)delete global.document;else global.document=previousDocument;
 if(previousStyles===undefined)delete global.getComputedStyle;else global.getComputedStyle=previousStyles;
}
process.stdout.write('Real Node responsive layout observation synthetic smoke PASS.\n');
