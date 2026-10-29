'use strict';
/* Focused offline sample for the real GSC CSV -> editorial action path. */
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const GSC=require('../lib/gsc-performance.cjs');
const blueprint=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.blueprint.json'),'utf8'));
const pages=GSC.readCsv('Top pages,Clicks,Impressions,CTR,Position\nhttps://example.com/,5,600,0.83%,9\nhttps://example.com/contact/,50,300,16.67%,3\n','pages');
const previous=GSC.readCsv('Page,Clicks,Impressions,CTR,Position\nhttps://example.com/,30,600,5%,8\nhttps://example.com/contact/,70,300,23.33%,3\n','pages');
const queries=GSC.readCsv('Top queries,Clicks,Impressions,CTR,Position\n"оборудование, цена",2,200,1%,10\n','queries');
const pairs=GSC.readCsv('Page,Query,Clicks,Impressions,CTR,Position\nhttps://example.com/,технологическое оборудование,1,100,1%,9\nhttps://example.com/contact/,технологическое оборудование,5,120,4.17%,5\n','pairs');
const result=GSC.analyze({blueprint,origin:'https://example.com/',current:{pages,queries,pairs},
 period:{start:'2026-10-01',end:'2026-10-07'},previousPages:previous,
 previousPeriod:{start:'2026-09-24',end:'2026-09-30'}});
assert.equal(result.summary.measuredPages,2);
assert(result.actions.some(x=>x.type==='investigate-click-decline'&&x.pageId==='page-home'));
assert(result.actions.some(x=>x.type==='review-snippet-ctr'&&x.pageId==='page-home'));
assert(result.actions.some(x=>x.type==='review-query-target-overlap'&&x.otherPages.length===1));
assert.equal(result.globalQueries[0].attributedToPage,false);
assert.equal(GSC.pathFromUrl('https://example.com/contact/?q=a',GSC.validateOrigin('https://example.com/')).reason,'parameterized-url');
assert.throws(()=>GSC.readCsv('Page,Clicks,Impressions,Position\nhttps://example.com/,50,10,5\n','pages'),/Impossible/);
assert.throws(()=>GSC.analyze({blueprint,origin:'https://example.com/',current:{pages},
 period:{start:'2026-10-01',end:'2026-10-07'},previousPages:previous,
 previousPeriod:{start:'2026-09-01',end:'2026-09-02'}}),/equal-length/);
process.stdout.write('GSC offline content intelligence smoke PASS\n');
