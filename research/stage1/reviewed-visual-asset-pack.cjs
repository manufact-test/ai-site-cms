/* AI Site CMS Stage 1 RESEARCH ONLY.
 * Developer-reviewed visual capabilities for one standalone model-authored site.
 * No general SVG sanitizer, arbitrary CSS/plugin system, production uploads or CMS.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Ajv2020=require('ajv/dist/2020.js').default;
const {JSDOM}=require('jsdom');
const SCHEMA_ID='https://json-schema.org/draft/2020-12/schema';
const HEX=/^#[0-9a-fA-F]{6}$/;
const isPlain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const equalKeys=(v,keys)=>isPlain(v)&&Object.keys(v).sort().join(',')===keys.slice().sort().join(',');
const ASSETS=Object.freeze({
 orb:Object.freeze({path:'/fixtures/orb.svg',mime:'image/svg+xml',svg:'<svg xmlns="http://www.w3.org/2000/svg" width="180" height="120" viewBox="0 0 180 120"><rect width="180" height="120" rx="20" fill="#15496b"/><circle cx="90" cy="60" r="42" fill="#33d2c4"/></svg>'}),
 reef:Object.freeze({path:'/fixtures/reef.svg',mime:'image/svg+xml',svg:'<svg xmlns="http://www.w3.org/2000/svg" width="180" height="120" viewBox="0 0 180 120"><rect width="180" height="120" rx="20" fill="#18445d"/><path d="M12 75 Q50 0 90 75 T168 75" stroke="#ffc38b" stroke-width="14" fill="none"/></svg>'})
});
const definitions=Object.freeze({
 gradientAngle:Object.freeze({kind:'integer',target:'visual.background.gradient.angle',default:45}),
 gradientFrom:Object.freeze({kind:'hex',target:'visual.background.gradient.start',default:'#33d2c4'}),
 gradientTo:Object.freeze({kind:'hex',target:'visual.background.gradient.end',default:'#ffc38b'}),
 motionEnabled:Object.freeze({kind:'boolean',target:'visual.animation.enabled',default:true}),
 motionDuration:Object.freeze({kind:'integer',target:'visual.animation.durationMs',default:1600}),
 motionEasing:Object.freeze({kind:'enum',target:'visual.animation.easing',default:'ease-in-out'}),
 imageAsset:Object.freeze({kind:'asset',target:'visual.media.assetKey',default:'orb'}),
 imageAlt:Object.freeze({kind:'text',target:'visual.media.alt',default:'Preview of the research artwork'})
});
const exactName=/^[a-z][a-zA-Z0-9]{2,40}$/;
const allowedVersions=new Set(['1.0.0','1.1.0']);
function fieldValid(name,v){
 if(name==='gradientAngle')return Number.isInteger(v)&&v>=0&&v<=360;
 if(name==='motionDuration')return Number.isInteger(v)&&v>=100&&v<=10000;
 if(name==='gradientFrom'||name==='gradientTo')return typeof v==='string'&&HEX.test(v);
 if(name==='motionEnabled')return typeof v==='boolean';
 if(name==='motionEasing')return ['linear','ease','ease-in','ease-out','ease-in-out'].includes(v);
 if(name==='imageAsset')return typeof v==='string'&&Object.hasOwn(ASSETS,v);
 if(name==='imageAlt')return typeof v==='string'&&v.length<=160;
 return false;
}
function makeSchema(fields){
 const props={};
 for(const name of Object.keys(fields)){
  switch(name){
   case 'gradientAngle': props[name]={type:'integer',minimum:0,maximum:360};break;
   case 'motionDuration': props[name]={type:'integer',minimum:100,maximum:10000};break;
   case 'gradientFrom':case 'gradientTo':props[name]={type:'string',pattern:'^#[a-fA-F0-9]{6}$'};break;
   case 'motionEnabled':props[name]={type:'boolean'};break;
   case 'motionEasing':props[name]={type:'string',enum:['linear','ease','ease-in','ease-out','ease-in-out']};break;
   case 'imageAsset':props[name]={type:'string',enum:Object.keys(ASSETS)};break;
   case 'imageAlt':props[name]={type:'string',maxLength:160};break;
   default:throw Error('unknown schema field '+name);
  }
 }
 return {$schema:SCHEMA_ID,type:'object',additionalProperties:false,required:Object.keys(props),properties:props};
}
function createVisualRegistry(){
 const packs=new Map(),fields=new Map();
 function registerPack(name,version,items){
  if(typeof name!=='string'||!/^reviewed-[a-z-]{4,36}$/.test(name)||packs.has(name)||!allowedVersions.has(version))throw Error('unreviewed pack identity/version');
  if(!isPlain(items)||!Object.keys(items).length||Object.keys(items).length>12)throw Error('bad pack fields');
  const staged=[];
  for(const [key,def] of Object.entries(items)){
   const approved=definitions[key];
   if(!exactName.test(key)||!approved||fields.has(key)||!equalKeys(def,['kind','target','default']))throw Error('unreviewed field or shape');
   if(def.kind!==approved.kind||def.target!==approved.target||!fieldValid(key,def.default))throw Error('unreviewed CSS/media target or default');
   staged.push([key,Object.freeze({...def})]);
  }
  staged.forEach(([key,value])=>fields.set(key,value));
  packs.set(name,version);return true;
 }
 const getDefinitions=()=>Object.fromEntries([...fields].map(([k,v])=>[k,{...v}]));
 const defaults=()=>Object.fromEntries([...fields].map(([k,v])=>[k,structuredClone(v.default)]));
 function validate(values){
  if(!isPlain(values)||Object.keys(values).length!==fields.size)throw Error('unexpected visual model properties');
  for(const [key] of fields)if(!Object.hasOwn(values,key)||!fieldValid(key,values[key]))throw Error('invalid visual field '+key);
  return true;
 }
 function migrate(next,overrides,reviewedAliases={}){
  if(!isPlain(overrides)||!isPlain(reviewedAliases))throw Error('migration payload');
  const current=getDefinitions();
  const nextDefs=next.getDefinitions();
  const retained={},quarantine=[],dest=new Set();
  for(const [key,value] of Object.entries(overrides)){
   const oldDef=current[key],alias=reviewedAliases[key];
   const dst=alias?.to||key;
   if(!oldDef){quarantine.push({key,reason:'unknown-previous'});continue}
   if(alias&&(!equalKeys(alias,['to','approved'])||alias.approved!==true)){quarantine.push({key,reason:'unreviewed-alias'});continue}
   const target=nextDefs[dst];
   if(!target){quarantine.push({key,reason:'removed-or-renamed'});continue}
   if(oldDef.kind!==target.kind||oldDef.target!==target.target){quarantine.push({key,reason:'target-or-kind-changed'});continue}
   if(!fieldValid(dst,value)){quarantine.push({key,reason:'invalid-value'});continue}
   if(dest.has(dst)){quarantine.push({key,reason:'alias-collision'});continue}
   dest.add(dst);retained[dst]=structuredClone(value);
  }
  return {retained,quarantine,canPublish:quarantine.length===0};
 }
 return {registerPack,getDefinitions,defaults,validate,schema:()=>makeSchema(getDefinitions()),migrate,installed:()=>Object.fromEntries(packs)};
}
function createReviewedSite(){
 const original=fs.readFileSync(path.join(__dirname,'fixtures/tide-atlas-standalone.html'),'utf8');
 const document=new JSDOM(original,{runScripts:'outside-only'}).window.document;
 const visual=document.getElementById('hero-visual');
 if(!visual||visual.tagName!=='DIV'||document.querySelectorAll('#hero-visual').length!==1)throw Error('original source shape changed');
 const r=createVisualRegistry();
 r.registerPack('reviewed-visual-media','1.0.0',Object.fromEntries(Object.entries(definitions).map(([k,v])=>[k,{...v}])));
 const values=r.defaults();
 r.validate(values);
 // This is deliberately a reviewed adapter, NOT a round-trip of source CSS/JS/SVG.
 // The image URL is assigned by trusted code from the static asset catalog.
 const markup='<section data-component="reviewed-visual"><h2>Trusted visual preview</h2><figure class="visual-orb" id="visual-orb">'+
  '<img id="visual-media" alt=""><figcaption id="visual-caption">Editable gradient, motion and vetted local SVG</figcaption></figure></section>';
 return {original,markup,registry:r,values};
}
function cssFromValidated(values){
 const r=createVisualRegistry();
 r.registerPack('reviewed-visual-media','1.0.0',Object.fromEntries(Object.entries(definitions).map(([k,v])=>[k,{...v}])));
 r.validate(values);
 // Every interpolated token was checked as integer, six-digit hex or enum.
 const animation=values.motionEnabled?'research-float '+values.motionDuration+'ms '+values.motionEasing+' infinite':'none';
 return '.visual-orb{background-image:linear-gradient('+values.gradientAngle+'deg,'+values.gradientFrom+','+values.gradientTo+');animation:'+animation+'}';
}
function staticTests(){
 const fixture=createReviewedSite(),r=fixture.registry;
 const ajv=new Ajv2020({strict:false,allErrors:true}),check=ajv.compile(r.schema());
 assert.equal(check(fixture.values),true);
 const wrong=[
  {gradientAngle:-1},{gradientAngle:361},{gradientAngle:1.2},
  {gradientFrom:'url(https://attacker.invalid/a)'},{gradientFrom:'#123456; background:url(https://evil.invalid)'},
  {gradientTo:'rgb(0,0,0)'},{motionEnabled:'true'},{motionDuration:0},{motionDuration:10001},
  {motionEasing:'steps(999, end)'},{imageAsset:'../../admin.php'},
  {imageAsset:'https://attacker.invalid/x.svg'},{imageAlt:'x'.repeat(161)},
  {imageAlt:null},{imageAlt:{danger:'bad'}},{unexpected:'evil'}
 ];
 for(const delta of wrong){
  const x={...fixture.values,...delta};
  assert.throws(()=>r.validate(x),'invalid '+JSON.stringify(delta));
  assert.equal(check(x),false,'AJV must reject '+JSON.stringify(delta));
 }
 assert.ok(!fixture.markup.includes('<script')&&!fixture.markup.includes('<style'));
 assert.ok(!fixture.markup.includes('style='));
 const css=cssFromValidated(fixture.values);
 assert.ok(css.includes('linear-gradient(45deg,#33d2c4,#ffc38b)'));
 assert.ok(!css.includes('url('));
 const bad=createVisualRegistry();
 assert.throws(()=>bad.registerPack('reviewed-bad-registry','1.0.0',{
  gradientFrom:{kind:'hex',target:'visual.background.gradient.start',default:'#112233'},
  unsafeCSS:{kind:'text',target:'style.backgroundImage',default:'url(https://evil.invalid)'}
 }));
 assert.equal(Object.keys(bad.getDefinitions()).length,0,'invalid pack must be atomic');
 assert.throws(()=>r.registerPack('reviewed-visual-media','1.0.0',{imageAlt:{...definitions.imageAlt}}));
 assert.throws(()=>r.registerPack('reviewed-collision','1.0.0',{imageAlt:{...definitions.imageAlt}}));
 const newer=createVisualRegistry();
 const changed=Object.fromEntries(Object.entries(definitions).map(([k,v])=>[k,{...v}]));
 changed.gradientFrom.default='#224466';
 newer.registerPack('reviewed-visual-media','1.1.0',changed);
 const edits={gradientAngle:130,imageAlt:'Owner edited',gradientFrom:'#00aaee'};
 const moved=r.migrate(newer,edits);
 assert.equal(moved.canPublish,true);assert.deepEqual(moved.retained,edits);
 assert.equal(newer.defaults().gradientFrom,'#224466');
 const invalidOwner=r.migrate(newer,{imageAsset:'https://attacker.invalid/a.svg'});
 assert.equal(invalidOwner.canPublish,false);
 const missingPack=createVisualRegistry();
 missingPack.registerPack('reviewed-visual-media','1.1.0',{gradientAngle:{...definitions.gradientAngle}});
 const removed=r.migrate(missingPack,{gradientFrom:'#445566'});
 assert.equal(removed.canPublish,false);assert.equal(removed.quarantine[0].reason,'removed-or-renamed');
 const unapproved=r.migrate(newer,{imageAlt:'My art'},{imageAlt:{to:'imageAlt',approved:false}});
 assert.equal(unapproved.canPublish,false);
 for(const asset of Object.values(ASSETS)){
  assert.ok(!/<script|onload=|href=|<foreignObject|https?:\/\//i.test(asset.svg));
  assert.equal(new JSDOM(asset.svg,{contentType:'image/svg+xml'}).window.document.documentElement.localName,'svg');
 }
 console.log('STAGE1_VISUAL_ASSET_UNIT='+JSON.stringify({pass:true,visualFields:Object.keys(definitions).length,invalidValuesRejected:wrong.length,unsafePackAtomicallyRejected:true,AJV2020Parity:true,ownerMigrationPreserved:true,aliasConflictQuarantined:true,reviewedSVGs:Object.keys(ASSETS).length,limits:'trusted, hardcoded site adapter; asset catalog not general SVG security; no production CMS or user-generated CSS'}));
}
module.exports={ASSETS,definitions,createVisualRegistry,createReviewedSite,cssFromValidated,staticTests};
