'use strict';
/* Synthetic read-only browser image states; zero network or customer data. */
const assert=require('node:assert/strict');
const MEDIA=require('../lib/seo-browser-image-observation.cjs');
const img=(config={})=>{
 const attrs=config.attrs||{};
 return {isConnected:true,complete:config.complete!==false,
  naturalWidth:config.naturalWidth??640,currentSrc:config.src||'https://site.example.org/img.webp',
  loading:config.loading||'eager',hidden:config.hidden||false,
  hasAttribute:n=>Object.hasOwn(attrs,n),getAttribute:n=>attrs[n]??null,
  getBoundingClientRect:()=>config.rect||{width:100,height:100,top:0,bottom:100,left:0,right:100},
  checkVisibility:()=>!config.hidden};
};
const hero=img({naturalWidth:0,loading:'lazy',attrs:{src:'/hero.webp'},
 rect:{width:370,height:360,top:40,bottom:400,left:10,right:380}});
const decorative=img({attrs:{alt:'',width:'80',height:'60'},
 rect:{width:80,height:60,top:10,bottom:70,left:20,right:100}});
const pending=img({complete:false,attrs:{alt:'Photo',width:'80',height:'60'},
 rect:{width:80,height:60,top:1200,bottom:1260,left:20,right:100}});
const hidden=img({hidden:true,attrs:{alt:'Hidden'}});
/* Huge image almost below fold: a 4px strip is not a large hero candidate. */
const edge=img({attrs:{alt:'Below fold',width:'1400',height:'1000'},
 rect:{width:1400,height:1000,top:840,bottom:1840,left:0,right:1400}});
const images=[hero,decorative,pending,hidden,edge];
global.document={querySelectorAll:sel=>sel==='img'?images:[]};
global.getComputedStyle=el=>({display:el.hidden?'none':'block',visibility:'visible',opacity:'1'});
const sample=MEDIA.sample({width:390,height:844});
assert.equal(sample.status,'observed');
assert.equal(sample.counts.total,5);
assert.equal(sample.counts.visible,4);
assert.equal(sample.counts.visibleFailed,1);
assert.equal(sample.counts.visiblePending,1);
assert.equal(sample.counts.aboveFoldLazy,1);
assert.equal(sample.counts.largeAboveFoldFailed,1);
assert.equal(sample.counts.largeAboveFold,1);
assert.equal(sample.counts.visibleUpscaled,1);
assert.equal(sample.counts.visibleMissingAlt,1);
assert.equal(sample.counts.visibleEmptyAlt,1);
const observation={method:MEDIA.METHOD,status:'observed',checkedAt:'2026-10-31T02:20:00Z',
 htmlSha256:'a'.repeat(64),counts:sample.counts};
assert.equal(MEDIA.assertObservation(observation,'a'.repeat(64)),observation);
assert.throws(()=>MEDIA.assertObservation(observation,'b'.repeat(64)),/DOM snapshot/);
assert.throws(()=>MEDIA.assertObservation({...observation,
 counts:{...sample.counts,visibleFailed:999}},'a'.repeat(64)),/inconsistent|exceeds|count/);
assert.equal(MEDIA.assertObservation({method:MEDIA.METHOD,status:'unavailable',
 checkedAt:observation.checkedAt,reason:'element-limit'},'a'.repeat(64)).status,'unavailable');
images.push(...Array.from({length:1000},()=>hidden));
assert.equal(MEDIA.sample({width:390,height:844}).reason,'element-limit');
process.stdout.write('Image browser observation synthetic Node smoke PASS.\n');