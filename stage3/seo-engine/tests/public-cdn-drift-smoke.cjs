'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),
 {compare}=require('../lib/public-cdn-drift.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const origin='https://example.org/',body='<html><head><title>Official</title></head><body><main>Safe</main></body></html>';
const make=(html=body)=>({
 format:'manufact-seo-delivery-evidence-v1',siteId:'pilot',origin,
 capturedAt:'2026-10-29T10:00:00Z',
 pages:[{id:'page-home',path:'/',requestUrl:origin,responseUrl:origin,status:200,
  headers:{'content-type':'text/html',etag:'"e1"'},html}],
 robots:{status:200,url:origin+'robots.txt',contentType:'text/plain',
  body:'User-agent: *\nAllow: /\nSitemap: https://example.org/sitemap.xml\n'},
 sitemap:{status:200,url:origin+'sitemap.xml',contentType:'application/xml',
  body:'<urlset></urlset>'},
 redirects:[{from:'/old/',requestUrl:origin+'old/',status:301,location:'/'}],
 negativeProbe:{path:'/cms-seo-nonexistent-pilot/',
  requestUrl:origin+'cms-seo-nonexistent-pilot/',status:404,contentType:'text/html',
  bodySha256:hash('not found')},
 securityProbes:['/release-manifest.json','/upload-inventory.json',
  '/CANDIDATE-STATUS.json','/CANDIDATE-HANDOFF.md'].map(path=>({
   path,requestUrl:origin+path.slice(1),status:404,bodySha256:hash('not found')})),
 publicReleaseMarker:{url:origin+'ai-site-release.json',status:200,valid:true,
  format:'manufact-ai-public-release-marker-v1',
  officialManifestSha256:'a'.repeat(64),publishedVersion:5},
 rootRecheck:{requestUrl:origin,firstStatus:200,secondStatus:200,
  initialHtmlSha256:hash(html),finalHtmlSha256:hash(html),matched:true,
  sourceRevisionAuthenticated:false,publicHostProvenanceAuthenticated:false}
});
const before=make(),unchanged=make();unchanged.capturedAt='2026-10-29T10:12:00Z';
const good=compare(before,unchanged);
assert.equal(good.criticalDriftCount,0);
assert.equal(good.sameOfficialReleaseComparable,true);
assert.equal(good.verdict,'NO-DRIFT-DETECTED-MANUAL-VERIFICATION');
assert.equal(good.rawHtmlReturned,false);
const changed=make(body.replace('Safe','Tampered'));
changed.capturedAt='2026-10-29T10:14:00Z';
const drift=compare(before,changed);
assert.ok(drift.newProblems.some(x=>x.code==='public-cdn:page-html-sha256-drift'));
assert.ok(drift.newProblems.some(x=>x.code==='public-cdn:same-etag-different-html'));
assert.ok(!JSON.stringify(drift).includes('Tampered'));
const redirects=make();redirects.redirects=[{...redirects.redirects[0],location:'/other/'}];
assert.ok(compare(before,redirects).newProblems.some(x=>x.code==='public-cdn:historic-301-drift'));
const release=make();release.publicReleaseMarker.officialManifestSha256='f'.repeat(64);
const different=compare(before,release);
assert.equal(different.sameOfficialReleaseComparable,false);
assert.ok(!different.newProblems.some(x=>x.code==='public-cdn:page-html-sha256-drift'));
const exposed=make();
exposed.securityProbes[0].status=206;
assert.ok(compare(before,exposed).newProblems.some(x=>x.code==='public-cdn:private-operator-file-exposed'));
const soft=make();soft.negativeProbe.status=200;
assert.ok(compare(before,soft).newProblems.some(x=>x.code==='public-cdn:public-soft-404'));
console.log('Public CDN drift: unchanged, HTML/ETag, redirects, changed official revision, internal file exposure and soft404 PASS');
