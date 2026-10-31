'use strict';
/* Synthetic Performance Timeline in real Node. Not actual Chromium nor CWV. */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const vm=require('node:vm');
const T=require('../lib/seo-browser-timing-observation.cjs');
const hash=crypto.createHash('sha256').update('synthetic browser DOM').digest('hex');
const nav={responseStart:450,responseEnd:600,domContentLoadedEventEnd:850,
 loadEventEnd:1000};
const entries={
 navigation:[nav],
 paint:[{name:'first-contentful-paint',startTime:900},
  {name:'first-paint',startTime:700}],
 resource:[{name:'https://SECRET-CLIENT.example/style.css',transferSize:1250},
  {name:'https://SECRET-CLIENT.example/hero.webp',transferSize:0}]
};
const prior=global.performance;
try{
 global.performance={getEntriesByType:type=>entries[type]};
 const observed=T.sample();
 const isolated=vm.runInNewContext('('+T.sample.toString()+')()',
  {performance:global.performance});
 assert.deepEqual(JSON.parse(JSON.stringify(isolated)),observed,
  'page.evaluate sampler must not depend on Node module closure');
 assert.deepEqual(observed,{status:'observed',counts:{
  responseStartMs:450,responseEndMs:600,domContentLoadedMs:850,
  loadEventEndMs:1000,firstContentfulPaintMs:900,
  resourceCount:2,resourceTransferBytes:1250}});
 const envelope={method:T.METHOD,status:'observed',
  checkedAt:'2026-10-31T00:00:00Z',htmlSha256:hash,counts:observed.counts};
 assert.equal(T.assertObservation(envelope,hash),envelope);
 assert(!JSON.stringify(envelope).includes('SECRET-CLIENT'));
 assert.throws(()=>T.assertObservation({...envelope,counts:{
  ...envelope.counts,domContentLoadedMs:10}},hash),/timing order/);
 assert.throws(()=>T.assertObservation(envelope,'f'.repeat(64)),/another rendered DOM/);
 assert.throws(()=>T.assertObservation({...envelope,script:'bad'},hash),/another rendered DOM/);
 entries.paint=[];
 const noPaint=T.sample();
 assert.equal(noPaint.status,'observed');
 assert.equal(noPaint.counts.firstContentfulPaintMs,null);
 assert.equal(T.assertObservation({...envelope,counts:noPaint.counts},hash).status,'observed');
 entries.resource=Array(251).fill({transferSize:100});
 assert.deepEqual(T.sample(),{status:'unavailable',reason:'resource-limit'});
 entries.navigation=[];
 assert.deepEqual(T.sample(),{status:'unavailable',reason:'navigation-timing-unavailable'});
 assert.equal(T.assertObservation({method:T.METHOD,status:'unavailable',
  checkedAt:'2026-10-31T00:00:00Z',reason:'navigation-timing-unavailable'}).status,'unavailable');
}finally{
 if(prior===undefined)delete global.performance;else global.performance=prior;
}
process.stdout.write('Real Node navigation timing synthetic smoke PASS.\n');
