'use strict';
// No deploy, chmod, rewrite installation, server reload or network.
const assert=require('node:assert/strict');
const {build,FORMAT}=require('../lib/static-host-rewrites.cjs');
const site={siteId:'pilot-site',pages:[{id:'home',path:'/'},{id:'pricing',path:'/pricing/'}],
 redirects:[{from:'/old-pricing/',to:'/pricing/'},{from:'/old-contact/',to:'/'}]};
const release={siteId:'pilot-site',publishedVersion:5,sourceRevision:11,
 origin:'https://example.org',manifestSha256:'a'.repeat(64),findings:[],
 redirects:new Map([['/old-pricing/','/pricing/'],['/old-contact/','/']]),
 staticForms:[]};
const plan=build(site,release);
assert.equal(plan.format,FORMAT);
assert.equal(plan.redirectCount,2);
assert.ok(plan.apache.content.includes('RewriteRule ^old-pricing/$ /pricing/ [R=301,L,NE]'));
assert.ok(plan.apache.content.includes('RewriteRule ^old-contact/$ / [R=301,L,NE]'));
assert.ok(plan.nginx.content.includes('location = /old-pricing/ { return 301 /pricing/; }'));
assert.ok(plan.httpChecks.some(x=>x.kind==='redirect'&&x.expectedStatus===301));
assert.equal(plan.automaticDeploy,false);
assert.equal(plan.actualHostWrites,0);
assert.equal(plan.redirectsTestedOverNetwork,false);
assert.throws(()=>build({...site,redirects:[{from:'/pricing/',to:'/'}]},release),
 /missing, unsafe|duplicated|non-page/);
assert.throws(()=>build({...site,redirects:[{from:'/bad/',to:'/missing/'}]},release),
 /missing, unsafe|duplicated|non-page/);
assert.throws(()=>build(site,{...release,origin:'http://example.org'}),/HTTPS/);
assert.throws(()=>build(site,{...release,findings:[{severity:'error'}]}),/Repair/);
console.log('Official root static Apache/Nginx HTTP 301 plan smoke PASS');
