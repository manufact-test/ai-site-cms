/* Stage 1 ONLY: extensible trusted property registry, schema/validator parity,
   source-coverage failures, attack rejection and change migrations. No production CMS. */
'use strict';
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const Ajv2020=require('ajv/dist/2020.js').default;
const {createRegistry,installResearchPacks}=require('./extensible-style-registry.cjs');
const fixtureA='<section data-stable-id="canvas-root" data-editable="backgroundColor padding"><header data-stable-id="canvas-head"><h2 data-stable-id="canvas-title" data-editable="text fontSize">An unconventional visual story</h2></header><div data-stable-id="canvas-layout" data-editable="gap flexDirection"><article data-stable-id="canvas-card" data-editable="padding borderRadius maxWidth"><p data-stable-id="canvas-lead" data-editable="text opacity">Design systems with a personality.</p></article><aside data-stable-id="canvas-aside" data-editable="borderColor"><strong data-stable-id="canvas-note" data-editable="text">A note</strong></aside></div></section>';
const fixtureB='<section data-stable-id="brief-root"><header data-stable-id="brief-header"><h1 data-stable-id="brief-title" data-editable="text fontSize">Research Notes</h1></header><main data-stable-id="brief-layout" data-editable="gap flexDirection"><article data-stable-id="brief-quote" data-editable="padding backgroundColor borderRadius"><blockquote data-stable-id="brief-line" data-editable="text opacity">Changing the shape of a section.</blockquote></article><figure data-stable-id="brief-figure" data-editable="maxWidth"><figcaption data-stable-id="brief-caption" data-editable="text">Mixed media will need its own safe registry.</figcaption></figure></main></section>';
const fixtureC='<section data-stable-id="minimal-root"><div data-stable-id="minimal-gap" data-editable="padding"><small data-stable-id="minimal-note" data-editable="text">Compact caption</small></div></section>';
const fixtures=[fixtureA,fixtureB,fixtureC];let negatives=0;
function reject(fn,label){assert.throws(fn,undefined,label);negatives++}
(async()=>{
 const {parseFragment}=await import('parse5');
 const r=installResearchPacks(createRegistry()),names=r.knownFields();
 assert.equal(r.installedPacks().length,3);
 assert.ok(names.length>=10);
 const parsed=fixtures.map(html=>r.parse(html,parseFragment));
 assert.deepEqual(parsed.map(m=>m.nodes),[8,8,3]);
 for(const m of parsed){
  r.validate(m,m.defaults);
  const schema=r.schema(m);
  assert.deepEqual(Object.keys(schema.properties).sort(),m.fields.map(f=>f.key).sort());
  const ajv=new Ajv2020({strict:false,allErrors:true});
  const v=ajv.compile(schema);
  assert.equal(v(m.defaults),true,'AJV schema rejects initial model');
  for(const f of m.fields){
   const evil=structuredClone(m.defaults);
   if(f.kind==='text')evil[f.key]='a'.repeat(500);
   else if(f.kind==='color')evil[f.key]='url(https://attacker.invalid/x)';
   else if(f.kind==='opacity')evil[f.key]=2;
   else if(f.kind==='choice')evil[f.key]='expression(evil)';
   else evil[f.key]={desktop:'calc(1px + url(evil))',tablet:'',mobile:''};
   reject(()=>r.validate(m,evil),'runtime-invalid-'+f.key);
   assert.equal(v(evil),false,'AJV must reject invalid '+f.key);
  }
  reject(()=>r.validate(m,{...m.defaults,unexpected:'bad'}),'surplus state');
  const doc=new JSDOM(m.html).window.document;
  r.apply(doc,m,m.defaults,'desktop');
  const field=m.fields.find(f=>f.kind==='text');const changed=structuredClone(m.defaults);
  changed[field.key]='<img src=x onerror=alert(1)> & <script>evil()</script>';
  r.apply(doc,m,changed,'desktop');
  assert.equal(doc.querySelector('[data-stable-id="'+field.id+'"]').textContent,changed[field.key]);
  assert.equal(doc.querySelectorAll('script,img').length,0);
 }
 // A verified and explicitly external intent ledger, not a guarantee for arbitrary AI sites.
 const ledgerA={
  'canvas-root':['backgroundColor','padding'],'canvas-title':['text','fontSize'],
  'canvas-layout':['gap','flexDirection'],'canvas-card':['padding','borderRadius','maxWidth'],
  'canvas-lead':['text','opacity'],'canvas-aside':['borderColor'],'canvas-note':['text']
 };
 const ok=r.audit(parsed[0],ledgerA);
 assert.deepEqual({missed:ok.missed,undeclared:ok.undeclared,unmarkedText:ok.unmarkedText},{missed:[],undeclared:[],unmarkedText:[]});
 assert.equal(ok.complete,true);
 const removed=structuredClone(ledgerA);delete removed['canvas-aside'];
 const extra=r.audit(parsed[0],removed);assert.deepEqual(extra.undeclared,['canvas-aside__borderColor']);
 const ledgerMissing=structuredClone(ledgerA);ledgerMissing['canvas-layout'].push('padding');
 const absent=r.audit(parsed[0],ledgerMissing);assert.deepEqual(absent.missed,['canvas-layout__padding']);
 const htmlWithoutTag=fixtureA.replace('data-editable="text opacity"','data-editable="opacity"');
 const missingText=r.audit(r.parse(htmlWithoutTag,parseFragment),ledgerA);
 assert.ok(missingText.unmarkedText.includes('canvas-lead'));
 const rogue='<section data-stable-id="a"><h2 data-stable-id="b" data-editable="text" onclick="alert(1)">Hello</h2></section>';
 const altered=[
  fixtureA.replace('</section>','<script>alert(1)</script></section>'),
  fixtureA.replace('</section>','<iframe src="https://attacker.invalid"></iframe></section>'),
  fixtureA.replace('</section>','<svg><script>abc</script></svg></section>'),
  fixtureA.replace('</section>','<!-- hidden --></section>'),
  fixtureA.replace('data-stable-id="canvas-note"','data-stable-id="canvas-title"'),
  fixtureA.replace('data-editable="text fontSize"','data-editable="text text"'),
  fixtureA.replace('data-editable="text fontSize"','data-editable="text animationScript"'),
  fixtureA.replace('data-editable="text fontSize"','data-editable="text __proto__"'),
  fixtureA.replace('data-editable="gap flexDirection"','data-editable="gap flexDirection" style="background-image:url(https://attacker.invalid)"'),
  fixtureA.replace('data-stable-id="canvas-layout"','data-other="canvas-layout"'),
  fixtureA.replace('data-editable="text fontSize"','data-editable="text fontSize" onmouseover="console.log(1)"'),
  fixtureA.replace('data-stable-id="canvas-root"','id="canvas-root"'),
  fixtureA.replace('</section>','<img src=x onerror=alert(1)></section>'),
  fixtureA.slice(0,-10),rogue,fixtureA+fixtureB
 ];
 for(let i=0;i<altered.length;i++)reject(()=>r.parse(altered[i],parseFragment),'malicious-markup-'+i);
 reject(()=>r.registerPack('research-geometry-v1',{opacity:{kind:'opacity',css:'opacity',default:1}}),'duplicate-pack');
 reject(()=>r.registerPack('research-collision',{padding:{kind:'responsive-length',css:'padding',default:{desktop:'1px',tablet:'',mobile:''}}}),'duplicate-name');
 reject(()=>r.registerPack('research-css-injection',{evil:{kind:'color',css:'backgroundImage',default:'#ffffff'}}),'unsafe-css-name');
 reject(()=>r.registerPack('research-css-target-switch',{maxWidth:{kind:'color',css:'backgroundColor',default:'#ffffff'}}),'css-target-mismatch');
 reject(()=>r.registerPack('research-js-code',{foo:{kind:'choice',css:'flexDirection',default:'row',options:['row','expression(alert)']}}),'unsafe-choice');
 reject(()=>r.registerPack('research-partial-unsafe',{
  safeBorder:{kind:'color',css:'borderColor',default:'#ffffff'},
  evilExtra:{kind:'text',css:null,default:''}
 }),'atomic-registration');
 assert.equal(r.knownFields().includes('safeBorder'),false,'partial registration must not commit');
 assert.equal(r.knownFields().includes('evilExtra'),false);
 // Still possible to register new allowed properties and parse them in a new DOM structure
 // WITHOUT changing discover/schema/apply code.
 const extraR=createRegistry();
 extraR.registerPack('minimal-content-v1',{text:{kind:'text',css:null,default:''}});
 extraR.registerPack('geometry-on-demand',{padding:{kind:'responsive-length',css:'padding',default:{desktop:'24px',tablet:'',mobile:''}}});
 const simple=extraR.parse(fixtureC,parseFragment);
 assert.equal(simple.fields.length,2);
 const owner={'canvas-title__text':'An owner override','canvas-card__borderRadius':{desktop:'22px',tablet:'',mobile:''}};
 const v2=r.parse(fixtureA.replace('An unconventional visual story','A new AI revision'),parseFragment);
 const retained=r.migrate(parsed[0],v2,owner);assert.equal(retained.canPublish,true);
 assert.deepEqual(retained.kept.sort(),Object.keys(owner).sort());
 const renamed=r.parse(fixtureA.replaceAll('canvas-title','canvas-title-revised'),parseFragment);
 const quarantine=r.migrate(parsed[0],renamed,owner);assert.equal(quarantine.canPublish,false);
 assert.equal(quarantine.quarantined[0].reason,'removed-or-renamed');
 const invalidOwner=r.migrate(parsed[0],parsed[0],{'canvas-card__borderRadius':{desktop:'999px',tablet:'',mobile:''}});
 assert.equal(invalidOwner.canPublish,false);assert.equal(invalidOwner.quarantined[0].reason,'out-of-range');
 console.log('STAGE1_EXTENSIBLE_PACKS='+JSON.stringify({pass:true,installedPacks:r.installedPacks(),properties:r.knownFields(),novelShapes:parsed.map(m=>({nodes:m.nodes,fields:m.fields.length})),AJVSchemaParity:true,negativeCases:negatives,intentLedgerMismatchDetection:true,atomicPackInstall:true,migrationOwnerPreserved:true,renameQuarantined:true,prohibitedCssInjection:true,limits:'trusted developer-registered packs with fixed CSS properties; model-authored hand-crafted fixtures, not independent generator or arbitrary HTML/JS/CSS'}));
})().catch(e=>{console.error('STAGE1_EXTENSIBLE_PACKS_FAIL='+String(e.stack||e));process.exitCode=1});
