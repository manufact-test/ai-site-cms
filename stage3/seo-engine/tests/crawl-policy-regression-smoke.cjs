'use strict';
/* Detect new bot blocks and sitemap removals from two same-Blueprint source sets. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const BP=require('../lib/blueprint.cjs');
const POLICY=require('../lib/crawl-policy.cjs');
const DIFF=require('../lib/crawl-policy-delta.cjs');
const VIEW=require('../lib/crawl-policy-delta-view.cjs');
const brief=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
const blueprint=BP.compileBrief(brief),base='https://demo.example/';
const sitemap='<?xml version="1.0"?><urlset><url><loc>https://demo.example/</loc></url>'+
 '<url><loc>https://demo.example/contact/</loc></url></urlset>';
const stable='User-agent: *\nAllow: /\nSitemap: https://demo.example/sitemap.xml\n';
const broken='User-agent: Googlebot\nDisallow: /\nUser-agent: *\nAllow: /\n'+
 'Sitemap: https://demo.example/sitemap.xml\n';
const mk=(robotsText,sitemapXml=sitemap,extra={})=>POLICY.analyze({
 blueprint,base,robotsText,sitemapXml,...extra});
const old=mk(stable),same=DIFF.compare(old,mk(stable));
assert.equal(same.summary.events,0);
assert.equal(same.summary.newGoogleBlocks,0);
assert.equal(same.publicationAuthorized,false);
const newSitemap=sitemap.replace('<url><loc>https://demo.example/contact/</loc></url>','');
const current=mk(broken,newSitemap),delta=DIFF.compare(old,current);
assert.equal(delta.summary.newGoogleBlocks,2);
assert.equal(delta.summary.indexableSitemapOmissions,1);
assert.equal(delta.summary.priorities.P0,2);
assert.equal(delta.summary.priorities.P1,1);
assert.equal(delta.summary.networkRequests,0);
assert.equal(delta.publicHostAuthenticated,false);
assert.equal(delta.publicationAuthorized,false);
assert(delta.changes.some(c=>c.kind==='new-robots-block'&&c.agent==='Googlebot'&&
 c.pageId==='page-home'&&c.priority==='P0'));
assert(delta.changes.some(c=>c.kind==='sitemap-omission'&&
 c.pageId==='page-contact'&&c.missingIndexabilityClaimAllowed));
assert(DIFF.markdown(delta).includes('Crawl Policy Regression'));
const html=VIEW.render(delta);
assert(html.includes('New Googlebot blocks'));
assert(html.includes('connect-src &#39;none&#39;'));
assert(!html.includes('<script'));
const sampledBefore=mk(stable,sitemap,{scope:'sample'});
const sampledAfter=mk(stable,newSitemap,{scope:'sample'});
const sampled=DIFF.compare(sampledBefore,sampledAfter);
assert(sampled.changes.some(c=>c.kind==='sitemap-omission'&&
 c.priority==='P2'&&!c.missingIndexabilityClaimAllowed));
assert.throws(()=>DIFF.compare(old,sampledAfter),/same-Blueprint agent\/scope/);
const anotherBase=POLICY.analyze({blueprint,base:'https://staging.example/',
 robotsText:stable,sitemapXml:sitemap});
assert.throws(()=>DIFF.compare(old,anotherBase),/same-site/);
const different=JSON.parse(JSON.stringify(brief));
different.pages[1].seo.title='Updated';
const newPlan=POLICY.analyze({blueprint:BP.compileBrief(different),base,robotsText:broken,sitemapXml:sitemap});
assert.throws(()=>DIFF.compare(old,newPlan),/same-Blueprint/);
const index='<?xml version="1.0"?><sitemapindex><sitemap><loc>https://demo.example/children.xml</loc></sitemap></sitemapindex>';
const indexShift=DIFF.compare(old,mk(stable,index));
assert(indexShift.changes.some(c=>c.kind==='sitemap-format-transition'));
assert.equal(indexShift.comparisonCompleteness,'partial-or-index-not-exhaustive');
assert.equal(indexShift.summary.indexableSitemapOmissions,0);
const restored=DIFF.compare(mk(broken),mk(stable));
assert(restored.changes.some(c=>c.kind==='robots-access-restored'));
assert.equal(restored.summary.newGoogleBlocks,0);
console.log('Crawl regression: new bot blocks, sitemap omissions, source-mismatch and no-GO smoke PASS.');
