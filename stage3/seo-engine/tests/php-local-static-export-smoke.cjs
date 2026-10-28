'use strict';
// Read-only comparison smoke, not a PHP/Chromium or public HTTPS test.
const assert=require('node:assert/strict');
const {compare,FORMAT}=require('../lib/php-local-static-export.cjs');
const site={siteId:'a-site',pages:[{id:'home',path:'/'}]};
const html=body=>'<html><head><title>Home</title><meta name="description" content="About us"></head><body><main><h1>Our service</h1><p>'+body+'</p></main></body></html>';
const snap={siteId:'a-site',pages:[{id:'home',path:'/',html:html('Hello')}]};
const media={siteId:'a-site',resources:[{assetId:'logo',bodySha256:'a'.repeat(64),status:200}]};
const release={format:FORMAT,siteId:'a-site',publishedVersion:4,sourceRevision:'source-4',
 pages:new Map([['/',{id:'home',path:'/',html:html('Hello')}]]),
 assets:new Map([['logo',{id:'logo',sha256:'a'.repeat(64)}]]),
 recordsVerified:4,sha256VerifiedAtRead:true};
const ok=compare(site,snap,media,release,4);
assert.equal(ok.findings.length,0);
assert.equal(ok.checkedPages,1);
assert.equal(ok.servedPhpRevisionAuthenticated,false);
const drift=compare(site,snap,media,{...release,
 pages:new Map([['/',{id:'home',path:'/',html:html('Different')} ]])},4);
assert.ok(drift.findings.some(f=>f.code==='php-export:page-content-drift'));
const swap=compare(site,snap,{...media,resources:[{...media.resources[0],bodySha256:'b'.repeat(64)}]},release,4);
assert.ok(swap.findings.some(f=>f.code==='php-export:media-byte-drift'));
assert.throws(()=>compare(site,snap,media,release,5),/must describe one Site/);
console.log('Static export + localhost PHP parity focused smoke PASS');
