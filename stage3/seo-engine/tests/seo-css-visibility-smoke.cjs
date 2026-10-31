'use strict';
/* Focused real Node CSS browser helper and private report smoke; no network. */
const assert=require('node:assert/strict');
const VIS=require('../lib/seo-browser-css-visibility.cjs');
const VIEW=require('../lib/seo-rendered-content-view.cjs');
const el=(visible=true,href='')=>({visible,isConnected:true,aria:false,href,
 checkVisibility(){return this.visible},getClientRects(){return this.visible?[{width:50,height:20}]:[]},
 getAttribute(){return this.href},closest(){return this.aria?{}:null}});
const h1=el(),h2=el(),main=el(),anchor=el(true,'/contact/'),hidden=el(false,'/contact/');
const elements={h1:[h1],'h2,h3,h4,h5,h6':[h2],'main,[role="main"]':[main],
 'a[href]':[anchor,hidden]};
global.document={baseURI:'https://site.example.org/',querySelectorAll:s=>elements[s]||[]};
global.getComputedStyle=el=>({display:el.contents?'contents':'block',visibility:'visible',opacity:'1'});
const targets=[{path:'/contact/',href:'https://site.example.org/contact/'}];
const raw=VIS.sample(targets);
assert.equal(raw.h1.layoutVisible,1);assert.equal(raw.secondaryHeadings.total,1);
assert.equal(raw.routes[0].anchors,2);assert.equal(raw.routes[0].layoutVisible,1);
const obs={method:VIS.METHOD,status:'observed',checkedAt:'2026-10-31T00:40:00Z',
 htmlSha256:'a'.repeat(64),h1:raw.h1,main:raw.main,secondaryHeadings:raw.secondaryHeadings,
 routes:raw.routes};
assert.equal(VIS.assertObservation(obs,'a'.repeat(64),new Set(['/contact/'])),obs);
assert.throws(()=>VIS.assertObservation(obs,'b'.repeat(64)),/snapshot/);
assert.throws(()=>VIS.assertObservation({...obs,routes:[]},'a'.repeat(64),
 new Set(['/contact/'])),/approved Blueprint/);
h1.visible=false;
assert.equal(VIS.sample(targets).h1.layoutVisible,0);
h1.contents=true;h1.children=[el(true)];
assert.equal(VIS.sample(targets).h1.layoutVisible,1);
h1.contents=false;h1.visible=true;h1.aria=true;
assert.equal(VIS.sample(targets).h1.visiblyExcluded,1);
elements['a[href]']=Array.from({length:2001},()=>anchor);
assert.equal(VIS.sample(targets).reason,'element-limit');
const row={inspected:true,cssVisibilityStatus:'observed'};
const report={format:'manufact-seo-rendered-content-audit-v1',siteId:'site-test',
 base:'https://site.example.org/',renderedCaptureFormat:'manufact-seo-viewport-evidence-v2',
 readOnly:true,releaseAuthorized:false,
 pages:[{pageId:'page-home',path:'/',httpInspected:true,devices:{desktop:row,tablet:row,mobile:row}}],
 findings:[{priority:'P1',pageId:'page-home',path:'/',device:'mobile',code:'rendered:css-h1-not-visible',detail:'Hidden <h1> not approved'}],
 manualNext:['Check on device'],inputSHA256:{blueprint:'a'.repeat(64)},
 summary:{plannedPages:1,fullyComparedPages:1,inspectedDevicePairs:3,P0:0,P1:1,P2:0,
 browserResponseMatchedPairs:3,browserResponseDriftPairs:0,browserBlockedPairs:0,
 browserPageErrorPairs:0,browserUnsettledPairs:0,
 browserBlockedReasonCounts:{offOrigin:0,outsideMount:0,unsafeMethod:0,unapprovedNavigation:0,requestBudget:0,other:0},
 cssInspectedDevicePairs:3,cssUnknownOrUnusableDevicePairs:0,cssHiddenH1DevicePairs:1,
 cssHiddenMainDevicePairs:0,cssHiddenSecondaryHeadings:2,cssHiddenCtaDestinations:1,
 cssCollapsedNavDestinations:1}};
const rendered=VIEW.render(report);
assert(rendered.html.includes('CSS observed'));
assert(rendered.markdown.includes('hidden H2–H6 2'));
assert(rendered.html.includes('&lt;h1&gt;'));
assert(!rendered.html.includes('Hidden <h1>'));
process.stdout.write('Real Node CSS layout and private report smoke PASS.\n');