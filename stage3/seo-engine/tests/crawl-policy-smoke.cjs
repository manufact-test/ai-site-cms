'use strict';
/* Pure real Blueprint + robots/sitemap URL policy regression checks; no live network. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const BP=require('../lib/blueprint.cjs'),POLICY=require('../lib/crawl-policy.cjs'),
 VIEW=require('../lib/crawl-policy-view.cjs');
const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
const blueprint=BP.compileBrief(raw);
const base='https://demo.example/';
const bots=['Googlebot','Bingbot','*'];
const robots='User-agent: *\nDisallow: /\nAllow: /contact/\nSitemap: https://demo.example/sitemap.xml\n\n'+
 'User-agent: Googlebot\nDisallow: /contact/\nAllow: /\n';
const xml='<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
 '<url><loc>https://demo.example/</loc></url>'+
 '<url><loc>https://demo.example/contact/</loc></url></urlset>';
const result=POLICY.analyze({blueprint,base,robotsText:robots,sitemapXml:xml,agents:bots});
assert.equal(result.format,POLICY.FORMAT);
assert.equal(result.readOnly,true);
assert.equal(result.publicHostAuthenticated,false);
assert.equal(result.publicationAuthorized,false);
assert.equal(result.summary.networkRequests,0);
assert.equal(result.summary.canonicalIndexable,2);
assert.equal(result.summary.priorities.P0,1);
assert.equal(result.summary.priorities.P1,2);
assert.deepEqual(result.pages.map(x=>x.crawlerDecisions.map(d=>d.allowed)),
 [[true,false,false],[false,true,true]]);
assert(result.pages[1].crawlerDecisions[0].matchedRule?.line>0);
assert.equal(result.summary.reviewActions,3);
assert(result.findings.some(x=>x.agent==='Googlebot'&&x.priority==='P0'));
assert(result.findings.some(x=>x.agent==='Bingbot'&&x.priority==='P1'));
assert(POLICY.markdown(result).includes('Blocked'));
const html=VIEW.render(result);
assert(html.includes('Crawl Policy Review'));
assert(html.includes('connect-src &#39;none&#39;'));
assert(html.includes('Release authorization: FALSE'));
assert(!html.includes('<script'));
assert(POLICY.decide(POLICY.parseRobots('User-agent: *\nDisallow: /protected/\nAllow: /protected/\n'),
 'Bingbot','/protected/').allowed,'Equal specificity allow wins');
assert(POLICY.decide(POLICY.parseRobots('User-agent: *\nDisallow: /files/*\nAllow: /files/public$\n'),
 'Googlebot','/files/public').allowed,'More-specific allow rule wins');
assert(!POLICY.decide(POLICY.parseRobots('User-agent: *\nDisallow: /files/private$\n'),
 'Googlebot','/files/private').allowed,'Exact end anchor must match');
assert(POLICY.decide(POLICY.parseRobots('User-agent: *\nDisallow: /files/private$\n'),
 'Googlebot','/files/private/archive').allowed,'Dollar-end anchor cannot match subdirectories');
const unrelated=POLICY.parseRobots('User-agent: Bingbot\nDisallow: /\nUser-agent: Googlebot\nAllow: /\n');
assert(POLICY.decide(unrelated,'Googlebot','/').allowed);
const unicodeBot=POLICY.parseRobots('User-agent: *\nDisallow: /caf%C3%A9/\n');
assert(!POLICY.decide(unicodeBot,'Googlebot','/café/').allowed,
 'Unicode UTF-8 path and encoded robots rule must compare equivalently');
assert(!POLICY.decide(unrelated,'Bingbot','/').allowed);
assert.throws(()=>POLICY.parseRobots('User-agent: Googlebot\nDisallow: /'+'x'.repeat(2050)),/exceeds safe maximum/);
// Explicit partial sitemap cannot prove a missing route.
const sample=POLICY.analyze({blueprint,base,robotsText:robots,
 sitemapXml:xml.replace('<url><loc>https://demo.example/contact/</loc></url>',''),scope:'sample'});
assert(!sample.findings.some(x=>x.code==='sitemap:missing-canonical-indexable'));
const missing=POLICY.analyze({blueprint,base,robotsText:robots,
 sitemapXml:xml.replace('<url><loc>https://demo.example/contact/</loc></url>','')});
assert(missing.findings.some(x=>x.code==='sitemap:missing-canonical-indexable'));
const noindexDraft=JSON.parse(JSON.stringify(raw));
noindexDraft.pages[1].seo.robots='noindex';
const noindex=POLICY.analyze({blueprint:BP.compileBrief(noindexDraft),base,robotsText:robots,sitemapXml:xml});
assert(noindex.findings.some(x=>x.code==='sitemap:noncanonical-or-noindex'));
const index='<?xml version="1.0"?><sitemapindex><sitemap><loc>https://demo.example/child.xml</loc></sitemap></sitemapindex>';
const child=POLICY.analyze({blueprint,base,robotsText:robots,sitemapXml:index});
assert.equal(child.sitemapMeta.kind,'index');
assert(!child.findings.some(x=>x.code==='sitemap:missing-canonical-indexable'));
assert(child.findings.some(x=>x.code==='sitemap:children-unavailable'));
const foreignChild=POLICY.analyze({blueprint,base,robotsText:robots,
 sitemapXml:index.replace('https://demo.example/child.xml','https://elsewhere.example/child.xml')});
assert(foreignChild.findings.some(x=>x.code==='sitemap:child-other-host'));
const commented=xml.replace('<url><loc>https://demo.example/contact/</loc></url>',
 '<!-- <url><loc>https://invalid.example/hidden/</loc></url> -->');
assert.equal(POLICY.parseSitemap(commented).records.length,1);
const mounted='https://demo.example/published/site-industrial-demo/';
const mountedXml=xml.replaceAll('https://demo.example/','https://demo.example/published/site-industrial-demo/');
const onMount=POLICY.analyze({blueprint,base:mounted,robotsText:robots,sitemapXml:mountedXml});
assert.equal(onMount.summary.canonicalIndexable,2);
assert(!onMount.findings.some(x=>x.code==='sitemap:unapproved-url'));
const encoded='<?xml version="1.0"?><urlset><url><loc>https://demo.example/?x=1&amp;y=2</loc></url></urlset>';
assert.equal(POLICY.parseSitemap(encoded).records.length,1);
const dates='<?xml version="1.0"?><urlset><url><loc>https://demo.example/</loc><lastmod>2026-10-30</lastmod></url></urlset>';
assert.equal(POLICY.parseSitemap(dates).records[0].lastmod,'2026-10-30');
assert.throws(()=>POLICY.parseSitemap(dates.replace('2026-10-30','2026-02-30')),/lastmod calendar/);
const ns='<?xml version="1.0"?><m:urlset xmlns:m="https://www.sitemaps.org/schemas/sitemap/0.9"><m:url><m:loc>https://demo.example/</m:loc></m:url></m:urlset>';
assert.equal(POLICY.parseSitemap(ns).records.length,1);
assert.throws(()=>POLICY.parseSitemap(xml.replace('</urlset>','')),/unclosed|incomplete/);
assert.throws(()=>POLICY.parseSitemap(xml.replace('https://demo.example/contact/','https://demo.example/')),/Duplicate/);
assert.throws(()=>POLICY.parseSitemap(xml.replace('<urlset ','<!DOCTYPE x [<!ENTITY a "bad">]><urlset ')),/unsafe/i);
assert.throws(()=>POLICY.parseSitemap(xml.replace('https://demo.example/contact/','&bad;')),/Unknown XML entity/);
assert.throws(()=>POLICY.analyze({blueprint,base:'http://demo.example/',robotsText:robots,sitemapXml:xml}),/HTTPS/);
assert.throws(()=>POLICY.analyze({blueprint:{...blueprint,version:2},base,robotsText:robots,sitemapXml:xml}),/unsupported/);
console.log('Crawl policy: specific bot rules, wildcard, sitemap scope, mount and XML security smoke PASS.');
