'use strict';
// One source-bound authoring contract: current Design Graph links, rich runs and
// hidden legacy slots. No external site, crawlers, POST or release mutation.
const assert=require('node:assert/strict');
const GRAPH=require('../lib/graph-authored.cjs');
const CONTENT=require('../lib/content-intelligence.cjs');
const MIGRATION=require('../lib/route-migration.cjs');
const section={id:'custom-hero',component:'custom-section',
 elements:[{id:'hidden-cta',values:{'behavior.href':'/old-hidden/'}}],
 designGraph:{id:'hero-graph',nodes:[
  {id:'heading',type:'heading',text:'Welcome and visit',runs:[
   {text:'Welcome and '},{text:'visit',href:'/contact/'}]},
  {id:'rich',type:'text',text:'See cases today',runs:[
   {text:'See '},{text:'cases',href:'/cases/'},{text:' today'}]},
  {id:'direct',type:'link',text:'Contact',href:'/contact/'},
  {id:'image',type:'image',assetId:'hero',alt:'Work',href:'/cases/'},
  {id:'popup',type:'button',text:'Open dialog',popupTarget:'dialog'},
  {id:'layout',type:'container',children:[
   {id:'button',type:'button',text:'Start',href:'/contact/'}]}
 ]}};
const site={siteId:'site-graph',assets:[{id:'hero',alt:'Work'}],pages:[
 {id:'home',path:'/',sections:[section]},
 {id:'contact',path:'/contact/',sections:[]},
 {id:'cases',path:'/cases/',sections:[]} ]};
const links=GRAPH.links(section);
assert.equal(links.length,5);
assert.deepEqual(links.filter(x=>x.fieldPath.startsWith('runs[')).map(x=>x.href),
 ['/contact/','/cases/']);
assert.ok(links.some(x=>x.nodeId==='image'&&x.href==='/cases/'));
assert.ok(!links.some(x=>x.nodeId==='popup'));
assert.equal(GRAPH.cta(section,'/contact/','Start').status,'ambiguous-cta');
assert.equal(GRAPH.cta({designGraph:{nodes:[{id:'cta',type:'link',
 text:'Contact',href:'/contact/'}]}},'/contact/','Contact').status,'matching');
const authored=MIGRATION.scanAuthoredLinks(site);
assert.equal(authored.length,5);
assert.ok(authored.every(x=>x.source.startsWith('designGraph:custom-hero:')));
assert.ok(!authored.some(x=>x.href==='/old-hidden/'));
const extracted=CONTENT.extract(site)[0].sections[0];
assert.equal(extracted.links.length,5);
assert.ok(extracted.links.some(x=>x.toPath==='/cases/'&&
 x.locator.fieldPath==='runs[1].href'&&x.locator.nodeId==='rich'));
assert.ok(extracted.pieces.some(x=>x.text==='Contact'&&x.role==='link'));
assert.ok(extracted.images.some(x=>x.assetId==='hero'));
console.log('SEO authored Design Graph internal links and rich fragments smoke PASS');
