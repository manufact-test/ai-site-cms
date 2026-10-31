'use strict';
/* Genuine Node, synthetic HTML only; no browser, client site or network. */
const assert=require('node:assert/strict');
const HTML=require('../lib/html-evidence.cjs');
const LINKS=require('../lib/seo-rendered-link-semantics.cjs');
const FRAGMENTS=require('../lib/seo-rendered-fragment-audit.cjs');
const served='https://example.test/approved/';
const origin='https://example.test/';
const approvedPaths=['/approved/','/service/'];
const source=HTML.inspect('<a href="/service/">Service</a><a href="/approved/#part">part</a>');
const rendered=HTML.inspect('<a rel="noopener nofollow" href="/service/">Service</a>'+
 '<a href="/service/?utm_source=test">Tracked</a>'+
 '<a href="javascript:alert(1)">Unknown</a><a href="#">Placeholder</a>'+
 '<a href="http://example.test/service/">Insecure</a>'+
 '<a href="https://example.test/off-mount/">Same site</a>');
const delta=LINKS.compare({sourceParsed:source,renderedParsed:rendered,
 served,origin,approvedPaths});
assert.equal(delta.status,'observed');
assert.deepEqual(delta.allRestrictedPaths,[]);
assert.deepEqual(delta.mixedRestrictedPaths,['/service/']);
assert.equal(delta.newlyUnsafeSchemes,1);
assert.equal(delta.newlyPlaceholderAnchors,1);
assert.equal(delta.newlyHttpLinks,1);
assert.equal(delta.newlyOffMountLinks,0); // mount is the entire approved origin.
assert.equal(JSON.stringify(delta).includes('javascript:'),false);
assert.equal(JSON.stringify(delta).includes('utm_source'),false);
const nofollow=LINKS.compare({sourceParsed:source,
 renderedParsed:HTML.inspect('<a href="/service/" rel="nofollow">Only</a>'),
 served,origin,approvedPaths});
assert.deepEqual(nofollow.allRestrictedPaths,['/service/']);
assert.deepEqual(nofollow.newlyRestrictedPaths,['/service/']);
assert.deepEqual(nofollow.missingApprovedRoutes,['/approved/']);
const queried=LINKS.compare({sourceParsed:source,
 renderedParsed:HTML.inspect('<a href="/service/?q=1">Only</a>'),
 served,origin,approvedPaths});
assert.deepEqual(queried.queryOnlyPaths,['/service/']);
assert.throws(()=>LINKS.compare({sourceParsed:source,renderedParsed:source,
 served,origin,approvedPaths:['/../'] }),/approved route context/);
const baseHtml=HTML.inspect('<a href="#part">Same</a>'+
 '<a href="/service/#good">Valid</a>'+
 '<a href="/service/#lost">Missing</a>'+
 '<a href="/service/?q=1#hidden">Unknown query</a>'+
 '<a href="/service/#%ZZ">Unknown escape</a>'+
 '<a href="https://elsewhere.test/#not-ours">External</a>'+
 '<a href="#top">Browser top</a>');
const targetByPath=new Map([
 ['/approved/',{inspected:true,ids:new Set(['part'])}],
 ['/service/',{inspected:true,ids:new Set(['good'])}]
]);
const fragments=FRAGMENTS.review({parsed:baseHtml,served,origin,targetByPath});
assert.equal(fragments.status,'observed');
assert.equal(fragments.checked,3);
assert.equal(fragments.missing,1);
assert.equal(fragments.unknown,2);
assert.deepEqual(fragments.affectedApprovedPaths,['/service/']);
assert.equal(JSON.stringify(fragments).includes('lost'),false);
const partial=FRAGMENTS.review({parsed:baseHtml,served,origin,
 targetByPath:new Map([...targetByPath].map(([p,v])=>
  [p,p==='/service/'?{inspected:false}:v]))});
assert.equal(partial.missing,0);
assert.equal(partial.checked,1);
assert.equal(partial.unknown,4);
const unsafeBase=FRAGMENTS.review({parsed:HTML.inspect(
 '<base href="https://elsewhere.test/"><a href="#fragment">fragment</a>'),
 served,origin,targetByPath});
assert.deepEqual(unsafeBase,{status:'unavailable',reason:'unsafe-base-href'});
const overLimit=FRAGMENTS.review({parsed:{anchors:Array.from({length:2501},()=>({}))},
 served,origin,targetByPath});
assert.deepEqual(overLimit,{status:'unavailable',reason:'anchor-limit'});
process.stdout.write('Real Node rendered links and fragments synthetic smoke PASS.\n');
