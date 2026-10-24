#!/usr/bin/env node
'use strict';
// OPTIONAL cross-branch acceptance, run only when the LEAD SDK checkout is available.
// Do not add this test to the stable D7 release-audit until the lead SDK is integrated.
const assert=require('node:assert/strict');
const path=require('node:path');
const oldSdk=require('../../sdk/contract.cjs');
const {FORMAT,KITS,THEMES,loadRegistry}=require('../lib/compiler.cjs');
const catalog=require('../catalog/compositions.cjs');
const bridge=require('../lib/bridge.cjs');
const adapter=require('../lib/lead-design-graph-adapter.cjs');
const sdkRoot=process.env.DF_LEAD_SDK_DIR;
if(!sdkRoot){
 console.log('DESIGN_FACTORY_LEAD_GRAPH SKIP: set DF_LEAD_SDK_DIR to a read-only checkout of lead stage3/sdk/');
 process.exit(3);
}
const hostSdk=require(path.resolve(sdkRoot,'contract.cjs'));
const hostGraph=require(path.resolve(sdkRoot,'design-graph.cjs'));
const clone=x=>JSON.parse(JSON.stringify(x));
const registry=loadRegistry();
let checks=0,renderChecks=0;
const graphVariants=new Set();
for(const c of catalog.compositions)for(const theme of Object.keys(THEMES)){
 const lang=checks%2?'ru':'en',project={format:FORMAT,version:1,
  kit:'agency',theme,language:lang,facts:{}};
 const bundle=bridge.build({format:bridge.WORKSPACE,version:1,project,composition:c.id});
 const before=JSON.stringify(bundle);
 const candidate=adapter.buildHostCandidate(bundle,hostSdk,registry);
 assert.equal(JSON.stringify(bundle),before,'Lead conversion must never mutate D6');
 assert.equal(candidate.format,adapter.FORMAT);
 assert.equal(candidate.mapping.composition,c.id);
 assert.equal(candidate.mapping.fidelity,'partial');
 assert.equal(candidate.mapping.approvedForPublish,false);
 assert.equal(candidate.ownerChecklist.readyForPublish,false);
 assert.ok(candidate.site.designTokens);
 const inserted=candidate.site.pages[0].sections.find(s=>s.id==='df-selected-composition');
 assert.ok(inserted?.designGraph?.nodes.length>=1);
 graphVariants.add(JSON.stringify(inserted.designGraph));
 assert.ok(inserted.designGraph.nodes.some(n=>n.type==='container'));
 assert.ok(JSON.stringify(inserted.designGraph).includes('fontFamily'));
 assert.ok(JSON.stringify(inserted.designGraph).includes('fade-up'));
 assert.ok(JSON.stringify(inserted.designGraph).includes('"type":"icon"'));
 assert.equal(hostSdk.inspectSite(candidate.site,registry).errors.length,0);
 assert.deepEqual(hostSdk.validateSite(clone(candidate.site),registry),candidate.site);
 // The legacy SDK must fail closed instead of accidentally accepting extra site keys.
 assert.throws(()=>oldSdk.validateSite(candidate.site,registry));
 const html=hostGraph.render(candidate.site,inserted.designGraph,'',null,inserted.id);
 assert.ok(html.includes('cmsdg-')&&html.includes('@media(max-width:600px)'));
 assert.ok(!html.includes('<script')&&!html.includes('http://'));
 renderChecks++;
 checks++;
}
assert.equal(checks,42*12);
assert.equal(graphVariants.size,checks,'Each composition/theme must keep a distinct editable graph');
const project={format:FORMAT,version:1,kit:'agency',theme:'noir',language:'en',facts:{}};
const noSelection=bridge.build(project);
assert.throws(()=>adapter.buildHostCandidate(noSelection,hostSdk,registry),
 /Select a D3 composition first/);
// Prove real CMS-style JSON editing: no AI/regeneration required for a headline,
// color, mobile grid and hover transition. Host validates the edited document.
const marked=bridge.build({format:bridge.WORKSPACE,version:1,project,composition:'hero-center'});
const editable=adapter.buildHostCandidate(marked,hostSdk,registry).site;
const mutable=clone(editable),target=mutable.pages[0].sections.find(s=>s.id==='df-selected-composition');
const copy=target.designGraph.nodes[0].children.find(n=>n.id.endsWith('-copy'));
const heading=copy.children.find(n=>n.type==='heading');
heading.text='Owner-approved headline revision';
mutable.designTokens.colors.accent='#125A8C';
target.designGraph.nodes[0].responsive.mobile.columns=1;
const action=copy.children.find(n=>n.type==='button');
action.states.hover.opacity=75;
const restored=hostSdk.validateSite(clone(mutable),registry);
const modifiedHtml=hostGraph.render(restored,target.designGraph,'',null,target.id);
assert.ok(modifiedHtml.includes('Owner-approved headline revision'));
assert.ok(modifiedHtml.includes('#125A8C'));
assert.ok(modifiedHtml.includes('opacity:0.75'));
assert.ok(modifiedHtml.includes('@media(max-width:600px)'));

const corrupted=clone(marked);corrupted.site.title='unauthorized change';
assert.throws(()=>adapter.buildHostCandidate(corrupted,hostSdk,registry),/D6: changed/);
console.log('DESIGN_FACTORY_LEAD_GRAPH PASS: '+checks+
 ' lead-SDK validated and distinct editor graphs; '+renderChecks+
 ' scoped host renders; old SDK rejects graph; D6 immutable and tamper-protected. No PHP/visual acceptance.');
