'use strict';
const assert=require('node:assert/strict');
const HEAD=require('../lib/public-static-head.cjs');
const html=(og,ld,extra='')=>'<html><head><title>A</title>'+
 '<meta property="og:title" content="Case study"><meta property="og:image" content="'+og+'">'+
 '<meta name="twitter:card" content="summary_large_image">'+
 '<link rel="canonical" href="https://site.example/case/">'+extra+
 '<script type="application/ld+json">'+ld+'</script></head><body><main>A</main></body></html>';
const one=html('https://site.example/cover.webp',
 JSON.stringify({'@context':'https://schema.org','@type':'Product',name:'A',offers:{price:100,priceCurrency:'EUR'}}));
const keysReordered=html('https://site.example/cover.webp',
 JSON.stringify({offers:{priceCurrency:'EUR',price:100},name:'A','@type':'Product','@context':'https://schema.org'}));
assert.equal(HEAD.review(one,keysReordered).deepHeadMatched,true);
const social=HEAD.review(one,one.replace('cover.webp','other.webp'));
assert.ok(social.changedHeadFields.includes('meta'));
const facts=HEAD.review(one,one.replace('"price":100','"price":199'));
assert.ok(facts.changedHeadFields.includes('jsonLd'));
const seo=HEAD.review(one,one.replace('rel="canonical"','rel="alternate"'));
assert.ok(seo.changedHeadFields.includes('alternates'));
const more=HEAD.review(one,one.replace('<script type="application/ld+json">','<script type="application/ld+json">{invalid}</script><script type="application/ld+json">'));
assert.ok(more.changedHeadFields.includes('errors'));
assert.equal(more.reportedHeadContent,false);
assert.ok(!JSON.stringify(facts).includes('199'));
console.log('OG/Twitter/canonical/JSON-LD deep head comparison PASS');
