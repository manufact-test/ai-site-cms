'use strict';
/* Real Node, synthetic approved international alternates. No browser or Google fetch. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs'),POLICY=require('../lib/crawl-policy.cjs');
const QA=require('../lib/seo-hreflang-qa.cjs');
const COVERAGE=require('../lib/seo-first-client-coverage.cjs');
const WORK=require('../lib/seo-operator-workspace.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
const bp=BP.checkBlueprint(JSON.parse(fs.readFileSync(path.join(__dirname,
 '../fixtures/industrial.blueprint.json'),'utf8')));
const site={format:'manufact-ai-site-v1',schemaVersion:1,siteId:bp.siteId,
 pages:bp.pages.map(p=>({id:p.id,path:p.path,seo:{...p.seo},sections:[]})),redirects:[]};
const base='https://example.org/';
const robots='User-agent: *\nAllow: /\n';
const sitemap='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
 bp.pages.map(p=>'<url><loc>'+base+p.path.slice(1)+'</loc></url>').join('')+'</urlset>';
const policy=POLICY.analyze({blueprint:bp,base,robotsText:robots,sitemapXml:sitemap,
 agents:['Googlebot','Bingbot','*'],scope:'complete'});
const pairs=[{lang:'en',href:base},{lang:'de',href:base+'contact/'}];
const tag=x=>'<link rel="alternate" hreflang="'+x.lang+'" href="'+x.href+'">';
const markup=(alts=[])=>'<html><head><title>Allowed page</title>'+alts.map(tag).join('')+
 '</head><body><main>Content</main></body></html>';
const capture=(list=[pairs,pairs])=>({format:'manufact-seo-delivery-evidence-v1',
 siteId:bp.siteId,origin:base,capturedAt:'2026-10-31T08:00:00Z',
 pages:bp.pages.map((p,i)=>({id:p.id,path:p.path,requestUrl:base+p.path.slice(1),
  responseUrl:base+p.path.slice(1),status:200,headers:{'content-type':'text/html'},
  html:markup(list[i])})),robots:{url:base+'robots.txt',status:200,
  contentType:'text/plain',body:robots},sitemap:{url:base+'sitemap.xml',
  status:200,contentType:'application/xml',body:sitemap},redirects:[]});
const review=(c,more={})=>QA.review({policy,blueprint:bp,capture:c,...more});
const good=review(capture());
assert.equal(good.summary.pagesWithAlternates,2);
assert.equal(good.summary.P1,0);
assert.equal(good.summary.P2,0);
assert.equal(good.summary.inspectedPages,2);
assert.equal(good.releaseAuthorized,false);
const absent=review(capture([[],[]]));
assert.equal(absent.summary.pagesWithAlternates,0);
assert.equal(absent.summary.P1,0);
assert.equal(absent.summary.P2,0);
assert.equal(absent.summary.httpLinkInspectedPages,0,
 'older original HTTP transcripts cannot prove that a Link header was absent');
assert.equal(absent.summary.sitemapInspectedPages,2);
// International alternates may be carried via HTTP Link and XML sitemap,
// even when the HTML head has no hreflang links. Mixed method coverage is OK.
const links=pairs.map(({lang,href})=>'<'+href+'>; rel="alternate"; hreflang="'+lang+'"').join(', ');
const carrierCapture=capture([[],[]]);
for(const row of carrierCapture.pages)
 row.headers.link='<'+base+'>; rel="canonical", '+links;
carrierCapture.sitemap.body='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '+
 'xmlns:alt="http://www.w3.org/1999/xhtml">'+bp.pages.map(p=>
 '<url><loc>'+base+p.path.slice(1)+'</loc>'+pairs.map(({lang,href})=>
 '<alt:link rel="alternate" hreflang="'+lang+'" href="'+href+'" />').join('')+'</url>').join('')+'</urlset>';
const carriers=review(carrierCapture);
assert.equal(carriers.summary.pagesWithAlternates,0);
assert.equal(carriers.summary.pagesWithHttpLinkAlternates,2);
assert.equal(carriers.summary.pagesWithSitemapAlternates,2);
assert.equal(carriers.summary.httpLinkInspectedPages,2);
assert.equal(carriers.summary.sitemapInspectedPages,2);
assert.equal(carriers.summary.P1,0);
assert.equal(carriers.summary.P2,0);
assert(QA.render(carriers).html.includes('XML sitemap'));
const headerOnly=capture([[],[]]);
headerOnly.pages.forEach(row=>{row.headers.link=links;});
assert.equal(review(headerOnly).summary.pagesWithHttpLinkAlternates,2);
assert.equal(review(headerOnly).summary.P1,0);
headerOnly.pages[0].html=null;
assert.equal(review(headerOnly).summary.inspectedPages,1);
assert.equal(review(headerOnly).summary.httpLinkInspectedPages,2,
 'observed HTTP Link evidence must survive unknown HTML head');
const sitemapOnly=capture([[],[]]);
sitemapOnly.sitemap.body=carrierCapture.sitemap.body;
assert.equal(review(sitemapOnly).summary.pagesWithSitemapAlternates,2);
assert.equal(review(sitemapOnly).summary.P1,0);
sitemapOnly.pages.pop();
assert.equal(review(sitemapOnly).summary.sitemapInspectedPages,2,
 'approved XML locs remain inspectable even if HTTP page capture is partial');
const mixedReturn=capture([pairs,[]]);
mixedReturn.pages[1].headers.link=links;
assert(!review(mixedReturn).findings.some(f=>f.code==='hreflang:return-link-missing'),
 'reciprocal target declared in another equivalent carrier is not missing');
const carrierConflict=capture();
carrierConflict.pages[0].headers.link='<'+base+'contact/>; rel=alternate; hreflang=en, '+
 '<'+base+'contact/>; rel=alternate; hreflang=de';
const conflicting=review(carrierConflict);
assert(conflicting.findings.some(f=>f.code==='hreflang:carrier-language-target-conflict'&&
 f.priority==='P1'));
const badCarrier=capture([[],[]]);
badCarrier.pages[0].headers.link='<javascript:alert(1)>; rel="alternate"; hreflang="de", '+
 '<https://outside.example/SECRET,VALUE>; rel="alternate"; hreflang="pl"';
const badCarrierReview=review(badCarrier);
assert(badCarrierReview.findings.some(f=>f.code==='hreflang:http-link-invalid-alternate-url'));
assert(!json(badCarrierReview).includes('SECRET'));
assert(!QA.render(badCarrierReview).html.includes('outside.example'));
const malformedHeader=capture([[],[]]);
malformedHeader.pages[0].headers.link='not-a-link; hreflang=en';
assert(review(malformedHeader).findings.some(f=>f.code===
 'hreflang:http-link-malformed-http-link-annotation'));
const xmlConflict=capture();
xmlConflict.sitemap.body=carrierCapture.sitemap.body.replaceAll('hreflang="de" href="'+base+'contact/"',
 'hreflang="de" href="'+base+'"');
assert(review(xmlConflict).findings.some(f=>f.code==='hreflang:carrier-language-target-conflict'));
const xmlUnknown=capture([[],[]]);
xmlUnknown.sitemap.body='<sitemapindex><sitemap><loc>'+base+'sitemap-fr.xml</loc></sitemap></sitemapindex>';
assert.equal(review(xmlUnknown).summary.sitemapInspectedPages,0,
 'sitemap index children must remain unknown, not silently empty');
const unsafeXml=capture([[],[]]);
unsafeXml.sitemap.body='<!DOCTYPE urlset [<!ENTITY x "test">]>'+carrierCapture.sitemap.body;
assert.equal(review(unsafeXml).summary.sitemapInspectedPages,0);
const mismatchXml=capture([[],[]]);
mismatchXml.sitemap.body=carrierCapture.sitemap.body.replaceAll('xmlns:alt="http://www.w3.org/1999/xhtml"',
 'xmlns:alt="https://wrong.example/ns"');
assert(review(mismatchXml).findings.some(f=>f.code==='hreflang:sitemap-malformed-sitemap-alternate'));
const bad=review(capture([pairs,[{lang:'de',href:base+'contact/'}]]));
assert(bad.findings.some(f=>f.code==='hreflang:return-link-missing'&&f.priority==='P1'));
const inconsistent=review(capture([pairs,[{lang:'en',href:base},
 {lang:'de',href:base}]]));
assert(inconsistent.findings.some(f=>f.code==='hreflang:shared-language-target-conflict'&&
 f.priority==='P1'));
const coverage=COVERAGE.build({policy,hreflang:bad});
assert(coverage.rows[0].signals.P1>=1,
 'existing approved-route matrix must include optional international SEO findings');
const missing=capture();missing.pages.pop();
const unknown=review(missing);
assert(unknown.findings.some(f=>f.code==='hreflang:return-link-unknown'&&f.priority==='P2'));
assert(!unknown.findings.some(f=>f.code==='hreflang:return-link-missing'));
const emptyHtml=capture();emptyHtml.pages[1].html=null;
assert.equal(review(emptyHtml).summary.inspectedPages,1,
 'uninspectable source is unknown, not a fatal hreflang validation error');
const hostile='https://outside.example/PRIVATE-CLIENT-RESOURCE';
const suspect=review(capture([[...pairs,{lang:'pl',href:hostile},
 {lang:'pl',href:base+'contact/'},{lang:'bad_invalid',href:'javascript:alert(1)'}],pairs]));
for(const code of ['conflicting-language-target','malformed-language-code',
 'alternate-url-not-absolute-https','external-alternates-unverified'])
 assert(suspect.findings.some(f=>f.code==='hreflang:'+code),code);
assert(!json(suspect).includes('outside.example'));
assert(!json(suspect).includes('PRIVATE-CLIENT-RESOURCE'));
const externalQuery=review(capture([[...pairs,{lang:'pl',href:hostile+'?locale=pl'}],pairs]));
assert(!externalQuery.findings.some(f=>f.code==='hreflang:invalid-alternate-url'));
assert(externalQuery.findings.some(f=>f.code==='hreflang:parameterized-alternate-needs-owner-review'));
const head=QA.render(suspect);
assert(!head.html.includes('PRIVATE-CLIENT-RESOURCE'));
assert(head.html.includes('International SEO / hreflang'));
const fakeRendered={siteId:bp.siteId,base,pages:bp.pages.map(p=>({pageId:p.id,
 devices:Object.fromEntries(['desktop','tablet','mobile'].map(d=>[d,{inspected:true}]))}))};
const renderedCapture={pages:bp.pages.map((p,i)=>({id:p.id,captures:{
 desktop:{method:'rendered-dom',html:markup(i?[...pairs,{lang:'fr',href:base}]:pairs)},
 tablet:{method:'rendered-dom',html:markup(pairs)},
 mobile:{method:'rendered-dom',html:markup(pairs)}}}))};
const changed=review(capture(),{renderedContent:fakeRendered,renderedCapture});
assert.equal(changed.summary.renderedComparedPairs,6);
assert.equal(changed.summary.renderedMutatedPairs,1);
assert(changed.findings.some(f=>f.code==='hreflang:browser-alternates-mutated'&&f.device==='desktop'));
const staticOnly=review(capture(),{renderedContent:fakeRendered,renderedCapture:{pages:
 renderedCapture.pages.map(p=>({...p,captures:Object.fromEntries(Object.entries(p.captures)
  .map(([d,v])=>[d,{...v,method:'static-html'}]))}))}});
assert.equal(staticOnly.summary.renderedComparedPairs,0);
const mount='https://example.org/tenant/';
const mountPolicy=POLICY.analyze({blueprint:bp,base:mount,robotsText:robots,
 sitemapXml:sitemap.replaceAll(base,mount),agents:['Googlebot','Bingbot','*'],scope:'complete'});
const mountPairs=[{lang:'en',href:mount},{lang:'de',href:mount+'contact/'}];
const mountCapture={...capture(),origin:mount,pages:bp.pages.map((p)=>({
 id:p.id,path:p.path,requestUrl:mount+p.path.slice(1),responseUrl:mount+p.path.slice(1),
 status:200,headers:{'content-type':'text/html'},html:markup(mountPairs)}))};
assert.equal(QA.review({policy:mountPolicy,blueprint:bp,capture:mountCapture}).summary.P1,0);
const crawl={policy,cmsBlueprint:bp,cmsSite:site,publicCapture:capture(),
 digests:{policy:hash(json(policy)),cmsBlueprint:hash(json(bp)),
  cmsSite:hash(json(site)),publicCapture:hash(json(capture()))}};
const workspace=WORK.build({crawl});
assert.equal(workspace.overview.internationalHreflangIncluded,true);
assert.equal(workspace.overview.internationalHreflangP1,0);
assert(workspace.crawlHtml.includes('International SEO / hreflang'));
assert(workspace.crawlLeadMarkdown.includes('International SEO / hreflang'));
assert(!workspace.homeHtml.includes('International SEO / hreflang'));
assert.throws(()=>review({...capture(),origin:'https://other.example/'}),/approved|original HTTPS/);
assert.throws(()=>review({...capture(),pages:[{...capture().pages[0],path:'/unapproved/'}]}),/unapproved/);
process.stdout.write('Real Node international hreflang HTTP/DOM and existing Workspace smoke PASS.\n');
