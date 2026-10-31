'use strict';
// Read-only comparison smoke, not a PHP/Chromium or public HTTPS test.
const assert=require('node:assert/strict');
const {compare,staticLinks,staticForms,staticSeo,FORMAT}=require('../lib/php-local-static-export.cjs');
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
const withAnchor=html('Hello').replace('</main>','<a href="/contact/">Contact</a></main>');
const servedWithMount=html('Hello').replace('</main>','<a href="/published/a-site/contact/">Contact</a></main>');
const equivalent=compare(site,{...snap,pages:[{...snap.pages[0],html:servedWithMount}]},
 media,{...release,pages:new Map([['/',{id:'home',path:'/',html:withAnchor}]])},4);
assert.equal(equivalent.findings.length,0);
const wrongTarget=compare(site,snap,media,
 {...release,pages:new Map([['/',{id:'home',path:'/',html:withAnchor}]])},4);
assert.ok(wrongTarget.findings.some(f=>f.code==='php-export:page-structure-drift'));
const formA=html('Hello').replace('</main>',
 '<form method="POST"><input type="hidden" name="_token" value="secret-one"><input required name="email"></form></main>');
const formB=formA.replace('secret-one','secret-two');
assert.equal(compare(site,{...snap,pages:[{...snap.pages[0],html:formB}]},media,
 {...release,pages:new Map([['/',{id:'home',path:'/',html:formA}]])},4).findings.length,0);
const brokenForm=formB.replace('name="email"','name="wrong"');
assert.ok(compare(site,{...snap,pages:[{...snap.pages[0],html:brokenForm}]},media,
 {...release,pages:new Map([['/',{id:'home',path:'/',html:formA}]])},4)
 .findings.some(f=>f.code==='php-export:page-structure-drift'));

const swap=compare(site,snap,{...media,resources:[{...media.resources[0],bodySha256:'b'.repeat(64)}]},release,4);
assert.ok(swap.findings.some(f=>f.code==='php-export:media-byte-drift'));
assert.throws(()=>compare(site,snap,media,release,5),/must describe one Site/);

const linkPage=html('Hello').replace('</main>','<a href="/contact/#hours">Visit</a></main>');
const linkedSite={...site,pages:[...site.pages,{id:'contact',path:'/contact/'}]};
const linkedDocs=new Map([['/',{html:linkPage}],['/contact/',{html:html('Contact').replace('<main>','<main><section id="hours">')}]]);
const linkGood=staticLinks(linkedSite,linkedDocs,new Map(),new Map());
assert.equal(linkGood.findings.length,0);
linkedDocs.set('/',{html:linkPage.replace('/contact/#hours','/not-found/')});
const linkBad=staticLinks(linkedSite,linkedDocs,new Map(),new Map());
assert.ok(linkBad.findings.some(f=>f.code==='php-export:static-broken-local-route'));
linkedDocs.set('/',{html:linkPage.replace('/contact/#hours','/published/a-site/contact/')});
assert.ok(staticLinks(linkedSite,linkedDocs,new Map(),new Map()).findings
 .some(f=>f.code==='php-export:static-php-mount-leak'));

const cssVersion=body=>body.replace('</head>','<style>:root{--cms-primary:#123456}</style></head>');
const cssWrong=body=>body.replace('</head>','<style>:root{--cms-primary:#abcdef}</style></head>');
assert.ok(compare(site,{...snap,pages:[{...snap.pages[0],html:cssWrong(html('Hello'))}]},media,
 {...release,pages:new Map([['/',{id:'home',path:'/',html:cssVersion(html('Hello'))}]])},4)
 .findings.some(f=>f.code==='php-export:page-structure-drift'&&f.field==='structure.styles'));
const wizard=(body,code)=>body.replace('</body>','<script>'+code+'</script></body>');
assert.ok(compare(site,{...snap,pages:[{...snap.pages[0],html:wizard(html('Hello'),'const wizard=2;')}]},media,
 {...release,pages:new Map([['/',{id:'home',path:'/',html:wizard(html('Hello'),'const wizard=1;')}]])},4)
 .findings.some(f=>f.field==='structure.scripts'));

const fsite={...site,pages:[{...site.pages[0],sections:[{id:'sec-form',component:'lead-form'}]}]};
const collector='https://collector.example';
const formMarkup=token=>'<section id="sec-form"><h2>Contact</h2>'+
 '<form method="post" accept-charset="utf-8" action="'+collector+'/forms/a-site/sec-form">'+
 '<input type="hidden" name="_release" value="4">'+
 '<input type="hidden" name="_token" value="'+token+'">'+
 '<input type="text" name="website"><input name="email" required></form></section>';
const fhtml=html('Hello').replace('</main>',formMarkup('a'.repeat(64))+'</main>');
const forms=staticForms(fsite,new Map([['/',{html:fhtml}]]),collector,4);
assert.equal(forms.checkedForms,1);
assert.equal(forms.findings.length,0);
const graphFsite={...fsite,pages:fsite.pages.map(page=>({...page,
 sections:page.sections.map(section=>({...section,
  designGraph:{nodes:[{id:'wrap',type:'container',children:[{id:'slot',type:'form-slot'}]}]}}))}))};
const graphForms=staticForms(graphFsite,new Map([['/',{html:fhtml}]]),collector,4);
assert.equal(graphForms.checkedForms,1);
assert.equal(graphForms.findings.length,0);
const emptyGraphSite={...graphFsite,pages:graphFsite.pages.map(page=>({...page,
 sections:page.sections.map(section=>({...section,designGraph:{nodes:[]}}))}))};
assert.equal(staticForms(emptyGraphSite,new Map([['/',{html:html('Hello')}]]),null,4).checkedForms,0);
const wrongCollector=staticForms(fsite,new Map([['/',{html:fhtml.replace(
 collector+'/forms/a-site/sec-form','https://other.example/forms/a-site/sec-form')}]]),collector,4);
assert.ok(wrongCollector.findings.some(x=>x.code==='php-export:static-form-action-drift'));
const badHmac=staticForms(fsite,new Map([['/',{html:html('Hello').replace('</main>',formMarkup('bad')+'</main>')}]]),collector,4);
assert.ok(badHmac.findings.some(x=>x.code==='php-export:static-form-token-marker'));
assert.ok(!JSON.stringify(badHmac).includes('a'.repeat(64)));

const seoSite={siteId:'a-site',language:'ru',assets:[],pages:[{
 id:'home',path:'/',sections:[],seo:{robots:'index'}}]};
const seoHtml='<html lang="ru"><head><title>Home</title>'+
 '<link rel="canonical" href="https://example.org/">'+
 '<meta property="og:url" content="https://example.org/">'+
 '</head><body><main><h1>Home</h1></main></body></html>';
const checkedSeo=staticSeo(seoSite,new Map([['/',{html:seoHtml}]]),'https://example.org');
assert.equal(checkedSeo.findings.length,0);
const oldSeo=staticSeo(seoSite,new Map([['/',{
 html:seoHtml.replace('https://example.org/','https://other.org/').replace(
 '<title>Home</title>','<title>Home</title><meta name="robots" content="noindex">')
}]]),'https://example.org');
assert.ok(oldSeo.findings.some(x=>x.code==='php-export:static-canonical-drift'));
assert.ok(oldSeo.findings.some(x=>x.code==='php-export:static-robots-meta-drift'));
assert.ok(staticSeo(seoSite,new Map([['/',{html:seoHtml}]]),null).findings
 .some(x=>x.code==='php-export:static-public-origin-not-configured'&&x.severity==='warning'));
console.log('Static export + localhost PHP parity focused smoke PASS');
