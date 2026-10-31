'use strict';
// Focused source-bound HTML smoke; no actual PHP/customer/browser assertion.
const assert=require('node:assert/strict');
const {review}=require('../lib/php-local-semantics.cjs');
const site={siteId:'test-site',pages:[{id:'home-page',path:'/'},{id:'about-page',path:'/about/'}],
 redirects:[{from:'/old/',to:'/about/'}],assets:[]};
const wrap=main=>'<!doctype html><html lang="ru"><head><title>Test</title></head><body>'+
 '<header>Logo</header><main>'+main+'</main><footer>Footer</footer></body></html>';
const good={format:'manufact-seo-html-snapshot-v1',siteId:site.siteId,pages:[
 {id:'home-page',path:'/',html:wrap('<h1>Home</h1><h2>Learn</h2><a href="/published/test-site/about/#team">Team</a><img src="/x.png" alt="An example">')},
 {id:'about-page',path:'/about/',html:wrap('<h1 id="team">About</h1><a href="/published/test-site/">Home</a>')}]};
const valid=review(site,good);
assert.equal(valid.findings.length,0,JSON.stringify(valid.findings));
assert.equal(valid.checkedLinks,2);
const bad={...good,pages:[{...good.pages[0],html:wrap('<h2>Oops</h2>'+
 '<a href="/published/test-site/nope/">Missing</a><a href="/published/test-site/about/#gone">Broken</a>'+
 '<a href="/published/test-site/about/#team"></a><img src="/x.png">'+
 '<div id="same"></div><div id="same"></div><label for="lost">Contact</label>')},good.pages[1]]};
const result=review(site,bad);
for(const code of ['main-h1-count','missing-local-route','broken-local-fragment','duplicate-dom-id','empty-link-name','image-alt-missing'])
 assert.ok(result.findings.some(x=>x.code==='php-semantic:'+code),code);
console.log('Real-PHP semantics and link-route integrity smoke PASS');
