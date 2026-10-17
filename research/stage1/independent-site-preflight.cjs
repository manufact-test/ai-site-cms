/* Stage 1 ONLY: preflight of a standalone, uninstrumented AI-authored site.
 * The sample was authored from a visual brief, outside the CMS's HTML grammar.
 * This is a single assistant-authored fixture, NOT a blinded second LLM
 * or statistically representative independent generator benchmark.
 * Unsupported components are reported, never executed as trusted CMS code. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRegistry,installResearchPacks}=require('./extensible-style-registry.cjs');
const site=fs.readFileSync(path.join(__dirname,'fixtures/tide-atlas-standalone.html'),'utf8');
const intent=[
 ['hero-title','content.text','text'],
 ['hero-title','style.fontSize','responsive-length'],
 ['hero-deck','content.text','text'],
 ['hero-link','content.text','text'],
 ['hero-link','behavior.href','url'],
 ['hero-visual','style.gradient','gradient'],
 ['hero-visual','motion.float','animation'],
 ['faq-first','behavior.disclosure','disclosure'],
 ['score','content.text','text'],
 ['signup-title','content.text','text'],
 ['signup-form','behavior.submit','form-handler'],
 ['signup-form','security.antispam','policy'],
 ['signup-email','content.placeholder','text'],
 ['modal-open','behavior.openDialog','action'],
 ['skyline','media.svg','asset'],
 ['document','seo.description','text']
];
const candidate=[
 ['hero-title','content.text','text'],
 ['hero-title','style.fontSize','responsive-length'],
 ['hero-deck','content.text','text'],
 ['hero-link','content.text','text'],
 ['hero-link','behavior.href','url'],
 ['hero-visual','style.gradient','gradient'],
 ['hero-visual','motion.float','animation'],
 ['faq-first','behavior.disclosure','disclosure'],
 ['score','content.text','text'],
 ['signup-title','content.text','text'],
 ['signup-form','behavior.submit','form-handler'],
 ['modal-open','behavior.openDialog','action']
];
const fieldKey=e=>e[0]+'::'+e[1];
const simpleProp=/^[a-z][a-zA-Z0-9-]{0,42}(?:\.[a-z][a-zA-Z0-9-]{0,42})$/;
const propertyPackTypes=new Map([
 ['content.text','text'],['style.fontSize','responsive-length'],
 ['style.padding','responsive-length'],['style.borderRadius','responsive-length'],
 ['style.gap','responsive-length'],['style.backgroundColor','color'],
 ['style.opacity','opacity'],['style.flexDirection','choice']
]);
function scan(html,parse){
 const errors=[];const doc=parse(html,{sourceCodeLocationInfo:true,onParseError:x=>errors.push(x.code)});
 const ids=new Map(),tags=new Map();const unkeyedLeafText=[];
 const attrsFor=n=>Object.fromEntries((n.attrs||[]).map(x=>[x.name,x.value]));
 function walk(n){
  if(n.tagName){
   const attrs=attrsFor(n);tags.set(n.tagName,(tags.get(n.tagName)||0)+1);
   if(attrs.id){ids.set(attrs.id,(ids.get(attrs.id)||0)+1)}
   const kids=(n.childNodes||[]).filter(c=>c.tagName);
   const txt=(n.childNodes||[]).filter(c=>c.nodeName==='#text').map(c=>c.value).join('').trim();
   if(txt&&!kids.length&&!attrs.id&&!['style','script','title'].includes(n.tagName))unkeyedLeafText.push(n.tagName);
  }
  for(const c of n.childNodes||[])walk(c);
 }
 walk(doc);
 const styles=(html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)||[]).join('\n');
 const scripts=(html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)||[]).join('\n');
 const css={
  variables:/--[a-z-]+\s*:/.test(styles),
  gradients:/(?:radial|conic|linear)-gradient\(/.test(styles),
  clamp:/\bclamp\(/.test(styles),
  grid:/display\s*:\s*grid/.test(styles),
  keyframes:/@keyframes/.test(styles),
  mediaQueries:(styles.match(/@media/g)||[]).length,
  inlineJs:scripts.includes('addEventListener('),
  cssFilter:/\bfilter\s*:/.test(styles)
 };
 return {doc,ids,tags,errors,unkeyedLeafText,css};
}
function audit(snapshot,declared,wanted){
 const duplicates=[...snapshot.ids].filter(([id,n])=>n!==1).map(([id])=>id);
 const names=new Set(),invalid=[],unexpected=[],missing=[],unsupported=[];
 for(const e of declared){
  if(!Array.isArray(e)||e.length!==3||e.some(x=>typeof x!=='string')||!simpleProp.test(e[1])||!/^[a-z][a-z0-9-]{0,60}$/.test(e[0])&&!['document'].includes(e[0])){invalid.push('shape');continue}
  const key=fieldKey(e);if(names.has(key))invalid.push('duplicate '+key);
  names.add(key);
  if(e[0]!=='document'&&!snapshot.ids.has(e[0]))invalid.push('missing DOM target '+key);
  if(e[0]==='document'&&!snapshot.doc.childNodes.some(n=>n.tagName==='html'))invalid.push('document missing');
  const trustedKind=propertyPackTypes.get(e[1]);
  if(trustedKind!==e[2])unsupported.push(key);
 }
 const expected=new Set(wanted.map(fieldKey));
 for(const id of expected)if(!names.has(id))missing.push(id);
 for(const id of names)if(!expected.has(id))unexpected.push(id);
 return {duplicates,invalid,missing,unexpected,unsupported,
  contractComplete:duplicates.length===0&&invalid.length===0&&missing.length===0&&unexpected.length===0,
  safeToAutoPublish:duplicates.length===0&&invalid.length===0&&missing.length===0&&unexpected.length===0&&unsupported.length===0};
}
function reconcile(oldFields,newFields,overrides,approvedAliases={}){
 const old=new Map(oldFields.map(e=>[fieldKey(e),e]));
 const next=new Map(newFields.map(e=>[fieldKey(e),e]));
 const retained={},quarantined=[],destinations=new Set();
 for(const [key,value] of Object.entries(overrides)){
  const prev=old.get(key);
  if(!prev){quarantined.push({key,reason:'not-in-old-manifest'});continue}
  const alias=approvedAliases[key];const dest=alias?alias.to:key;
  if(alias&&alias.approved!==true){quarantined.push({key,reason:'unreviewed-alias'});continue}
  const target=next.get(dest);
  if(!target){quarantined.push({key,reason:'removed-or-renamed'});continue}
  if(prev[2]!==target[2]){quarantined.push({key,reason:'type-changed'});continue}
  if(destinations.has(dest)){quarantined.push({key,reason:'collision'});continue}
  destinations.add(dest);retained[dest]=structuredClone(value);
 }
 return {retained,quarantined,canPublish:quarantined.length===0};
}
(async()=>{
 const {parse,parseFragment}=await import('parse5');
 const snapshot=scan(site,parse);
 assert.deepEqual(snapshot.errors,[],'HTML parser errors');
 assert.equal(snapshot.ids.get('hero-title'),1);
 assert.equal(snapshot.tags.get('script'),1);
 assert.equal(snapshot.tags.get('svg'),1);
 assert.equal(snapshot.tags.get('form'),1);
 assert.equal(snapshot.tags.get('dialog'),1);
 assert.equal(snapshot.tags.get('details'),1);
 assert.ok(snapshot.unkeyedLeafText.length>=4,'detect unaddressable leaf text');
 assert.ok(Object.values(snapshot.css).every(Boolean));
 const r=installResearchPacks(createRegistry());
 assert.throws(()=>r.parse(site,parseFragment),'whole arbitrary site must not enter restricted CMS parser');
 const partial=audit(snapshot,candidate,intent);
 assert.deepEqual(partial.missing,[
  'signup-form::security.antispam','signup-email::content.placeholder',
  'skyline::media.svg','document::seo.description']);
 assert.equal(partial.invalid.length,0);
 assert.equal(partial.duplicates.length,0);
 assert.equal(partial.contractComplete,false);
 assert.ok(partial.unsupported.length>=5,'novel behaviors/css must be quarantined');
 // A proposed manifest can be made complete against independent declared intent,
 // but it is still NOT automatically trusted or sufficient to publish.
 const repaired=[...candidate,...intent.filter(e=>partial.missing.includes(fieldKey(e)))];
 const coverage=audit(snapshot,repaired,intent);
 assert.equal(coverage.contractComplete,true);
 assert.equal(coverage.safeToAutoPublish,false);
 assert.ok(coverage.unsupported.length>=8);
 let negative=0;
 function probe(fn,check){check(fn());negative++}
 probe(()=>audit(scan(site.replace('id="hero-deck"','id="hero-title"'),parse),repaired,intent),x=>assert.ok(x.duplicates.includes('hero-title')));
 probe(()=>audit(snapshot,[...repaired,repaired[0]],intent),x=>assert.ok(x.invalid.some(v=>v.startsWith('duplicate'))));
 probe(()=>audit(snapshot,repaired.filter(x=>x[0]!=='hero-deck'),intent),x=>assert.ok(x.missing.includes('hero-deck::content.text')));
 probe(()=>audit(snapshot,[...repaired,['ghost','content.text','text']],intent),x=>assert.ok(x.invalid.some(v=>v.startsWith('missing DOM'))));
 probe(()=>audit(snapshot,[...repaired,['hero-title','style.backgroundImage','url']],intent),x=>assert.ok(x.unsupported.some(v=>v.includes('backgroundImage'))));
 probe(()=>audit(snapshot,[...repaired,['hero-title','style.fontSize','url']],intent),x=>assert.ok(x.invalid.some(v=>v.startsWith('duplicate'))&&x.unsupported.some(v=>v.includes('fontSize'))));
 probe(()=>audit(snapshot,[...repaired,['hero-title','__proto__.unsafe','text']],intent),x=>assert.ok(x.invalid.length>0));
 probe(()=>audit(snapshot,[...repaired,['hero-title','behavior.evalScript','script']],intent),x=>assert.ok(x.unsupported.some(v=>v.includes('evalScript'))));
 // Separate source revisions: changed author default keeps owner override;
 // renaming a target without approved alias blocks publication.
 const v1=[['hero-title','content.text','text'],['hero-link','behavior.href','url'],['hero-visual','style.gradient','gradient']];
 const owner={'hero-title::content.text':'An owner-edited coastline','hero-link::behavior.href':'#join'};
 const same=reconcile(v1,[...v1],owner);
 assert.equal(same.canPublish,true);assert.equal(same.retained['hero-title::content.text'],owner['hero-title::content.text']);
 const v2=[v1[0],['primary-action','behavior.href','url'],v1[2]];
 const noAlias=reconcile(v1,v2,owner);
 assert.equal(noAlias.canPublish,false);assert.deepEqual(noAlias.quarantined.map(x=>x.reason),['removed-or-renamed']);
 const yesAlias=reconcile(v1,v2,owner,{'hero-link::behavior.href':{approved:true,to:'primary-action::behavior.href'}});
 assert.equal(yesAlias.canPublish,true);assert.equal(yesAlias.retained['primary-action::behavior.href'],'#join');
 const rogueAlias=reconcile(v1,v2,owner,{'hero-link::behavior.href':{approved:false,to:'primary-action::behavior.href'}});
 assert.equal(rogueAlias.canPublish,false);assert.equal(rogueAlias.quarantined[0].reason,'unreviewed-alias');
 const changedKind=reconcile(v1,[['hero-title','content.text','choice'],v1[1],v1[2]],owner);
 assert.equal(changedKind.canPublish,false);assert.equal(changedKind.quarantined[0].reason,'type-changed');
 const orphan=reconcile(v1,v1,{'ghost::content.text':'bad'});
 assert.equal(orphan.canPublish,false);assert.equal(orphan.quarantined[0].reason,'not-in-old-manifest');
 const duplicateDestination=reconcile([['old-a','content.text','text'],['old-b','content.text','text']],[['new-c','content.text','text']],{'old-a::content.text':'A','old-b::content.text':'B'},{'old-a::content.text':{approved:true,to:'new-c::content.text'},'old-b::content.text':{approved:true,to:'new-c::content.text'}});
 assert.equal(duplicateDestination.canPublish,false);assert.equal(duplicateDestination.quarantined[0].reason,'collision');
 negative+=7;
 console.log('STAGE1_INDEPENDENT_SITE_PREFLIGHT='+JSON.stringify({
  pass:true,fixture:'tide-atlas-standalone.html',
  generatedOutsideCompiler:true,blindSecondModel:false,
  elementsWithIds:snapshot.ids.size,unkeyedLeafText:snapshot.unkeyedLeafText.length,
  detectedHtmlFeatures:['svg','form','dialog','details','script'],cssFeatures:snapshot.css,
  candidateDeclarations:candidate.length,intentFields:intent.length,
  missingDeclarations:partial.missing,unsupportedAfterCoverageRepair:coverage.unsupported,
  arbitrarySiteAcceptedByRestrictedParser:false,canAutoPublish:false,
  negativeChecks:negative,compatibleOverridesRetained:true,
  renamedOverrideBlockedWithoutReviewedAlias:true,explicitAliasReviewRequired:true,
  limitations:'not a blind independent LLM, manually supplied intent; CSS and JS detected heuristically, untrusted original never ingested as trusted CMS source; no production semantic policy or PHP deployment'
 }));
})().catch(e=>{console.error('STAGE1_INDEPENDENT_SITE_PREFLIGHT_FAIL='+String(e.stack||e));process.exitCode=1});
