#!/usr/bin/env node
'use strict';
// OPTIONAL cross-branch acceptance, run only when the LEAD SDK checkout is available.
// Do not add this test to the stable D7 release-audit until the lead SDK is integrated.
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const cp=require('node:child_process');
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
// Optional PHP parity gate on a separate read-only lead checkout. It checks
// PHP's independent validator and the actual escaped markup (CSS can be ordered differently).
let phpChecked=0;
if(process.env.DF_LEAD_PHP_FILE){
 const phpFile=path.resolve(process.env.DF_LEAD_PHP_FILE);
 assert.ok(fs.statSync(phpFile).isFile(),'Lead PHP DesignGraph.php must exist');
 const phpScript=[
  'require $argv[1];',
  '$site=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);',
  '$sec=null;foreach($site["pages"][0]["sections"] as $s){',
  'if($s["id"]==="df-selected-composition"){$sec=$s;break;}}',
  'if(!$sec)throw new Exception("Missing candidate section");',
  '$assets=[];foreach($site["assets"] as $a)$assets[$a["id"]]=$a["mime"];',
  '$ids=[];$cls="Manufact".chr(92)."Stage3".chr(92)."DesignGraph";',
  '$cls::validate($sec["designGraph"],$assets,$ids,$site["designTokens"]);',
  'echo $cls::render($site,$sec["designGraph"],"",$sec["id"]);'
 ].join('');
 for(const [name,theme] of [
  ['hero-split','editorial'],['gallery-mosaic','noir'],
  ['faq-compact','technical'],['contact-center','minimal']
 ]){
  const project={format:FORMAT,version:1,kit:'agency',theme,language:'en',facts:{}};
  const bundle=bridge.build({format:bridge.WORKSPACE,version:1,project,composition:name});
  const document=adapter.buildHostCandidate(bundle,hostSdk,registry).site;
  const sec=document.pages[0].sections.find(s=>s.id==='df-selected-composition');
  const jsHtml=hostGraph.render(document,sec.designGraph,'',null,sec.id);
  const run=cp.spawnSync(process.env.DF_LEAD_PHP_BIN||'php',['-r',phpScript,phpFile],{
   input:JSON.stringify(document),encoding:'utf8',timeout:15000,maxBuffer:1000000});
  assert.equal(run.status,0,run.stderr||String(run.error));
  const withoutStyle=html=>{const a=html.indexOf('<style>'),b=html.indexOf('</style>');
   assert.ok(a>=0&&b>a,'Missing style tag');return html.slice(0,a)+'<style></style>'+html.slice(b+8);};
  assert.equal(withoutStyle(run.stdout),withoutStyle(jsHtml),'Host PHP vs JS markup parity: '+name);
  assert.ok(run.stdout.includes('prefers-reduced-motion'),'PHP reduced-motion CSS: '+name);
  phpChecked++;
 }
} else {
 console.log('LEAD_GRAPH_PHP SKIP: set DF_LEAD_PHP_FILE to lead stage3/server/DesignGraph.php');
}
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
 ' scoped host JS renders; '+phpChecked+' real PHP parity probes; old SDK rejects graph; D6 immutable and tamper-protected. No browser acceptance.');
