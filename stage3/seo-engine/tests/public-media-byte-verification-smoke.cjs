'use strict';
// No external requests: mock pinned public HTTPS GET; test originals & variants.
const assert=require('node:assert/strict');
const {inventory,capture,review}=require('../lib/public-media-byte-verification.cjs');
const site={siteId:'pilot-site',assets:[{id:'asset-hero',src:'/assets/asset-hero.webp',mime:'image/webp',
 variants:[{id:'asset-hero-small',src:'/assets/asset-hero-small.webp'}]}]};
const release={siteId:site.siteId,publishedVersion:7,sourceRevision:13,
 origin:'https://pilot.example',manifestSha256:'c'.repeat(64),
 assets:new Map([
  ['asset-hero',{src:'/assets/asset-hero.webp',sha256:'a'.repeat(64),bytes:1024}],
  ['asset-hero-small',{src:'/assets/asset-hero-small.webp',sha256:'b'.repeat(64),bytes:512}]
 ])};
assert.equal(inventory(site,release).length,2);
const called=[];
const transport={address:async host=>{assert.equal(host,'pilot.example');return {address:'1.1.1.1',family:4};},
 requestDigest:async url=>{called.push(url);return {
  status:200,contentType:'image/webp',
  bodySha256:url.endsWith('small.webp')?'b'.repeat(64):'a'.repeat(64),
  bodyBytes:url.endsWith('small.webp')?512:1024};}};
(async()=>{
 const saved=await capture(site,release,'https://pilot.example/',transport);
 assert.equal(called.length,2);
 assert.ok(called.every(url=>url.startsWith('https://pilot.example/assets/')));
 assert.equal(saved.totalReceivedBytes,1536);
 assert.ok(saved.resources.every(r=>r.hashMatched&&r.mimeMatched&&r.lengthMatched));
 assert.ok(!JSON.stringify(saved).includes('binary-image-contents'));
 const good=review(site,release,saved);
 assert.equal(good.expectedMediaResources,2);
 assert.equal(good.findings.length,0);
 assert.equal(good.allCapturedByteDigestsMatch,true);
 assert.equal(good.publicHostProvenanceAuthenticated,false);
 const broken={...saved,resources:saved.resources.map((r,i)=>i?{...r,
  sha256:'d'.repeat(64),hashMatched:false}:r)};
 const changed=review(site,release,broken);
 assert.ok(changed.findings.some(x=>x.code==='public-bytes:resource-sha256-mismatch'));
 const wrongType={...saved,resources:saved.resources.map((r,i)=>i?{...r,
  mime:'text/html',mimeMatched:false}:r)};
 assert.ok(review(site,release,wrongType).findings
  .some(x=>x.code==='public-bytes:resource-mime-mismatch'));
 const absent={...saved,resources:saved.resources.slice(0,1),
  totalReceivedBytes:1024};
 assert.ok(review(site,release,absent).findings
  .some(x=>x.code==='public-bytes:resource-not-captured'));
 assert.throws(()=>review(site,release,{...saved,officialStaticManifestSha256:'f'.repeat(64)}),
  /pinned static release/);
 await assert.rejects(()=>capture(site,release,'https://other.example/',transport),/origin/);
 console.log('Public streaming original and responsive media SHA256 comparison smoke PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
