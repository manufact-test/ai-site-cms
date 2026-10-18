/* AI Site CMS stage 1 RESEARCH ONLY.
 * Versioned site/component reconciliation across AI regeneration with owner
 * edits, review-gated stable-ID renames, quarantine, CAS, publish and rollback.
 * It is a standalone model, NOT a CMS engine or full arbitrary AI-site importer.
 */
'use strict';
const assert=require('node:assert/strict');
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const clone=x=>structuredClone(x);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const exact=(x,fields)=>plain(x)&&Object.keys(x).sort().join('|')===fields.slice().sort().join('|');
const idRe=/^[a-z][a-z0-9-]{2,50}$/;
const HEX=/^#[0-9a-fA-F]{6}$/;
const LINK=/^#[a-z][a-z0-9-]{0,40}$/;
const catalog=Object.freeze({
 hero:Object.freeze({
  headline:'text',gradientFrom:'hex',gradientTo:'hex',durationMs:'duration',ctaHref:'link',featureAsset:'asset'
 }),
 accordion:Object.freeze({title:'text',open:'boolean'}),
 form:Object.freeze({placeholder:'text',enabled:'boolean'}),
 media:Object.freeze({asset:'asset',alt:'text'}),
 copy:Object.freeze({body:'text'})
});
const assets=Object.freeze({orb:'/fixtures/orb.svg',reef:'/fixtures/reef.svg'});
function checkValue(type,value){
 if(type==='text')return typeof value==='string'&&value.length<=400;
 if(type==='hex')return typeof value==='string'&&HEX.test(value);
 if(type==='duration')return Number.isInteger(value)&&value>=100&&value<=10000;
 if(type==='link')return typeof value==='string'&&LINK.test(value);
 if(type==='boolean')return typeof value==='boolean';
 if(type==='asset')return typeof value==='string'&&Object.hasOwn(assets,value);
 return false;
}
function validateManifest(manifest){
 if(!exact(manifest,['siteId','version','components'])||manifest.siteId!=='tide-atlas'||
    typeof manifest.version!=='string'||!/^[1-9][0-9]*\.[0-9]+\.[0-9]+$/.test(manifest.version)||
    !Array.isArray(manifest.components)||manifest.components.length<2||manifest.components.length>12)throw Error('manifest envelope');
 const ids=new Set();
 for(const c of manifest.components){
  if(!exact(c,['id','kind','defaults'])||typeof c.id!=='string'||!idRe.test(c.id)||ids.has(c.id)||
      !Object.hasOwn(catalog,c.kind)||!plain(c.defaults))throw Error('component id/kind/defaults');
  ids.add(c.id);
  const fields=catalog[c.kind];
  if(Object.keys(c.defaults).sort().join('|')!==Object.keys(fields).sort().join('|'))throw Error('component field contract');
  for(const [field,type] of Object.entries(fields))if(!checkValue(type,c.defaults[field]))throw Error('bad default '+c.id+'/'+field);
 }
 return true;
}
function parseOwnerPath(p,manifest){
 if(typeof p!=='string'||p.length>120||!p.includes('/'))return null;
 const parts=p.split('/');
 if(parts.length!==2||!idRe.test(parts[0])||!idRe.test(parts[1]))return null;
 const component=manifest.components.find(c=>c.id===parts[0]);
 if(!component||!Object.hasOwn(catalog[component.kind],parts[1]))return null;
 return {component,field:parts[1],type:catalog[component.kind][parts[1]]};
}
function validateOverride(manifest,p,value){
 const meta=parseOwnerPath(p,manifest);
 if(!meta)throw Error('unknown/removed owner field '+p);
 if(!checkValue(meta.type,value))throw Error('invalid owner field '+p);
 return true;
}
function publicShape(manifest,overrides){
 validateManifest(manifest);
 if(!plain(overrides))throw Error('owner map is not plain');
 for(const [p,value] of Object.entries(overrides))validateOverride(manifest,p,value);
 return manifest.components.map(c=>({id:c.id,kind:c.kind,values:Object.fromEntries(
  Object.entries(c.defaults).map(([field,def])=>[field,Object.hasOwn(overrides,c.id+'/'+field)?clone(overrides[c.id+'/'+field]):clone(def)])
 )}));
}
function reviewedAliasLookup(oldManifest,newManifest,aliases){
 if(!Array.isArray(aliases)||aliases.length>12)throw Error('bad alias review envelope');
 const before=new Map(oldManifest.components.map(c=>[c.id,c]));
 const after=new Map(newManifest.components.map(c=>[c.id,c]));
 const map=new Map(),dest=new Set();
 for(const a of aliases){
  if(!exact(a,['from','to','kind','approved'])||a.approved!==true||
      typeof a.from!=='string'||typeof a.to!=='string'||a.from===a.to||
      !before.has(a.from)||!after.has(a.to)||before.get(a.from).kind!==a.kind||
      after.get(a.to).kind!==a.kind||map.has(a.from)||dest.has(a.to)||after.has(a.from))throw Error('unreviewed/ambiguous stable ID alias');
  map.set(a.from,a.to);dest.add(a.to);
 }
 return map;
}
function reconcile(oldManifest,newManifest,overrides,aliases=[]){
 validateManifest(oldManifest);validateManifest(newManifest);
 const reviewed=reviewedAliasLookup(oldManifest,newManifest,aliases);
 if(!plain(overrides))throw Error('overrides must be own map');
 const before=new Map(oldManifest.components.map(x=>[x.id,x]));
 const after=new Map(newManifest.components.map(x=>[x.id,x]));
 const migrated={},quarantine=[],paths=new Set();
 for(const [p,value] of Object.entries(overrides)){
  const old=parseOwnerPath(p,oldManifest);
  if(!old||!checkValue(old.type,value)){quarantine.push({path:p,reason:'invalid-prior-override'});continue}
  const newId=reviewed.get(old.component.id)||old.component.id;
  const next=after.get(newId);
  const nextType=next&&catalog[next.kind]?.[old.field];
  if(!next){quarantine.push({path:p,reason:'component-removed'});continue}
  if(old.component.kind!==next.kind||old.type!==nextType){quarantine.push({path:p,reason:'capability-changed'});continue}
  if(!checkValue(nextType,value)){quarantine.push({path:p,reason:'out-of-new-range'});continue}
  const dest=newId+'/'+old.field;
  if(paths.has(dest)){quarantine.push({path:p,reason:'override-collision'});continue}
  paths.add(dest);migrated[dest]=clone(value);
 }
 // Aliases cannot be allowed to collide even if no direct owner override exists:
 // both unique semantic sources would otherwise share the same destination.
 for(const [from,to] of reviewed)if(before.has(to)&&from!==to)throw Error('ambiguous alias target');
 const allPaths=oldManifest.components.flatMap(c=>Object.keys(catalog[c.kind]).map(f=>c.id+'/'+f));
 const mappedOwner=Object.keys(migrated).length;
 return {migrated,quarantine,canPublish:quarantine.length===0,
  evidence:{priorFields:allPaths.length,ownerValues:Object.keys(overrides).length,mappedOwner,
   renamedComponents:reviewed.size,oldComponentCount:before.size,newComponentCount:after.size}};
}
function editorSchema(manifest,id){
 validateManifest(manifest);
 const c=manifest.components.find(x=>x.id===id);
 if(!c)throw Error('unknown editor component '+id);
 const properties={};
 for(const [k,type] of Object.entries(catalog[c.kind])){
  if(type==='text')properties[k]={type:'string',maxLength:400};
  if(type==='hex')properties[k]={type:'string',pattern:'^#[a-fA-F0-9]{6}$'};
  if(type==='duration')properties[k]={type:'integer',minimum:100,maximum:10000};
  if(type==='link')properties[k]={type:'string',pattern:'^#[a-z][a-z0-9-]{0,40}$'};
  if(type==='boolean')properties[k]={type:'boolean'};
  if(type==='asset')properties[k]={type:'string',enum:Object.keys(assets)};
 }
 return {$schema:'https://json-schema.org/draft/2020-12/schema',type:'object',additionalProperties:false,required:Object.keys(properties),properties};
}
function renderSafe(manifest,overrides){
 const shape=publicShape(manifest,overrides);
 const css=[];
 const html=shape.map(c=>{
  const v=c.values;
  if(c.kind==='hero'){
   // Only hex, bounded integers and fixed asset keys reach generated CSS/URLs.
   css.push('[data-cms-id="'+c.id+'"]{background:linear-gradient(125deg,'+v.gradientFrom+','+v.gradientTo+');animation:cms-float '+v.durationMs+'ms ease-in-out infinite}');
   return '<section data-cms-id="'+esc(c.id)+'" id="hero"><h1>'+esc(v.headline)+'</h1><a href="'+esc(v.ctaHref)+'">Explore</a>'+
    '<img src="'+assets[v.featureAsset]+'" alt="Curated artwork"></section>';
  }
  if(c.kind==='accordion')return '<section data-cms-id="'+esc(c.id)+'"><details'+(v.open?' open':'')+'><summary>'+esc(v.title)+'</summary><p>Reviewed disclosure</p></details></section>';
  if(c.kind==='form')return '<section data-cms-id="'+esc(c.id)+'" id="signup"><label>Email<input type="email" placeholder="'+esc(v.placeholder)+'"></label><button'+(v.enabled?'':' disabled')+' type="button">Preview only</button></section>';
  if(c.kind==='media')return '<section data-cms-id="'+esc(c.id)+'"><img src="'+assets[v.asset]+'" alt="'+esc(v.alt)+'"></section>';
  return '<section data-cms-id="'+esc(c.id)+'"><p>'+esc(v.body)+'</p></section>';
 }).join('');
 return {html,css:'@keyframes cms-float{50%{transform:translateY(-12px)}}@media(prefers-reduced-motion:reduce){[data-cms-id]{animation:none!important}}'+css.join(''),shape};
}
function manifestFixtures(){
 const v1={siteId:'tide-atlas',version:'1.0.0',components:[
  {id:'hero-anchor',kind:'hero',defaults:{headline:'Tide Atlas',gradientFrom:'#33d2c4',gradientTo:'#ffc38b',durationMs:1600,ctaHref:'#signup',featureAsset:'orb'}},
  {id:'faq-block',kind:'accordion',defaults:{title:'Where does tide data originate?',open:false}},
  {id:'signup-block',kind:'form',defaults:{placeholder:'email@example.org',enabled:true}},
  {id:'badge-image',kind:'media',defaults:{asset:'orb',alt:'Ocean orb'}}
 ]};
 const v2=clone(v1);v2.version='2.0.0';
 v2.components=[
  {...clone(v1.components[1]),defaults:{title:'Refreshed AI FAQ',open:true}},
  {...clone(v1.components[3]),defaults:{asset:'reef',alt:'New AI reef media'}},
  {...clone(v1.components[0]),id:'hero-focal',defaults:{headline:'AI regenerated this hero',gradientFrom:'#778899',gradientTo:'#ccbb88',durationMs:2400,ctaHref:'#signup',featureAsset:'reef'}},
  {...clone(v1.components[2]),defaults:{placeholder:'new-ai@email.invalid',enabled:true}},
  {id:'editorial-notes',kind:'copy',defaults:{body:'An AI-added content module'}}
 ];
 const changed=clone(v2);changed.version='3.0.0';
 changed.components=changed.components.map(x=>x.id==='badge-image'?{id:'badge-image',kind:'copy',defaults:{body:'Replaced with incompatible copy'}}:x);
 const removed=clone(v2);removed.version='3.1.0';removed.components=removed.components.filter(x=>x.id!=='signup-block');
 return {v1,v2,changed,removed,aliases:[{from:'hero-anchor',to:'hero-focal',kind:'hero',approved:true}]};
}
function createRevisionStore(input){
 validateManifest(input);
 let manifest=clone(input),draft={},saved={},generation=1,draftSaved=true,seq=1;
 let published={revision:1,sourceRevision:null,manifest:clone(manifest),overrides:{},shape:publicShape(manifest,{})};
 let history=[clone(published)],pending=new Map(),stageSeq=0;
 const invalidate=()=>{pending.clear();generation++};
 const snapshot=()=>({generation,manifest:clone(manifest),draft:clone(draft),saved:clone(saved),
  draftSaved,published:clone(published),history:clone(history)});
 function setOwner(path,value){
  validateOverride(manifest,path,value);
  draft[path]=clone(value);draftSaved=false;invalidate();return snapshot();
 }
 function saveDraft(){for(const [p,val] of Object.entries(draft))validateOverride(manifest,p,val);
  saved=clone(draft);draftSaved=true;invalidate();return snapshot();
 }
 function stageAI(next,aliases=[]){
  validateManifest(next);
  if(!draftSaved)throw Error('unsaved owner edits need explicit save before regeneration');
  if(compareSemver(next.version,manifest.version)<=0)throw Error('non-increasing manifest version');
  const result=reconcile(manifest,next,saved,aliases),id=++stageSeq;
  pending.set(id,{base:generation,next:clone(next),result:clone(result)});
  return {stageId:id,baseGeneration:generation,canPublish:result.canPublish,
   quarantine:clone(result.quarantine),evidence:clone(result.evidence)};
 }
 function acceptStage(id){
  const stage=pending.get(id);
  if(!stage)throw Error('stage missing or stale');
  if(stage.base!==generation)throw Error('compare-and-swap failed');
  if(!stage.result.canPublish)throw Error('quarantined owner override blocks update');
  manifest=clone(stage.next);draft=clone(stage.result.migrated);saved=clone(stage.result.migrated);
  draftSaved=true;invalidate();return snapshot();
 }
 function publish(){
  if(!draftSaved)throw Error('unsaved owner edits cannot be published');
  const shape=publicShape(manifest,saved);
  const newPub={revision:++seq,sourceRevision:null,manifest:clone(manifest),overrides:clone(saved),shape:clone(shape)};
  published=clone(newPub);history.push(clone(newPub));invalidate();return clone(newPub);
 }
 function rollback(revision){
  const old=history.find(x=>x.revision===revision);
  if(!old)throw Error('unknown published revision');
  // Rollback creates a NEW revision, never overwrites history.
  manifest=clone(old.manifest);draft=clone(old.overrides);saved=clone(old.overrides);draftSaved=true;
  const restored={revision:++seq,sourceRevision:revision,manifest:clone(old.manifest),overrides:clone(old.overrides),shape:clone(old.shape)};
  published=clone(restored);history.push(clone(restored));invalidate();return clone(restored);
 }
 return {snapshot,setOwner,saveDraft,stageAI,acceptStage,publish,rollback};
}
function compareSemver(a,b){
 const x=a.split('.').map(Number),y=b.split('.').map(Number);
 for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]-y[i]}
 return 0;
}
function runUnit(){
 const {v1,v2,changed,removed,aliases}=manifestFixtures();
 [v1,v2,changed,removed].forEach(validateManifest);
 const store=createRevisionStore(v1);
 store.setOwner('hero-anchor/headline','Owner headline <img src=x onerror=alert(1)>');
 store.setOwner('hero-anchor/gradientFrom','#112233');
 store.setOwner('hero-anchor/featureAsset','reef');
 store.setOwner('badge-image/alt','Owner badge');
 store.setOwner('faq-block/open',true);
 assert.throws(()=>store.setOwner('hero-anchor/gradientFrom','url(https://bad.invalid)'),/invalid/);
 assert.throws(()=>store.setOwner('hero-anchor/featureAsset','../../private.svg'),/invalid/);
 assert.throws(()=>store.setOwner('hero-anchor/ctaHref','javascript:alert(1)'),/invalid/);
 assert.throws(()=>store.stageAI(v2,aliases),/unsaved/);
 store.saveDraft();const revision1=store.publish();
 const staged=store.stageAI(v2,aliases);
 assert.equal(staged.canPublish,true);assert.equal(staged.evidence.mappedOwner,5);
 const before=store.snapshot();assert.equal(before.published.manifest.version,'1.0.0');
 store.acceptStage(staged.stageId);
 const after=store.snapshot();
 assert.equal(after.manifest.components[2].id,'hero-focal');
 assert.equal(after.saved['hero-focal/headline'],'Owner headline <img src=x onerror=alert(1)>');
 assert.equal(after.saved['hero-focal/gradientFrom'],'#112233');
 assert.equal(after.saved['badge-image/alt'],'Owner badge');
 assert.equal(after.manifest.components[4].id,'editorial-notes');
 assert.equal(after.published.manifest.version,'1.0.0','stage cannot publish');
 const rendered=renderSafe(after.manifest,after.saved);
 assert.ok(rendered.html.indexOf('data-cms-id="faq-block"')<rendered.html.indexOf('data-cms-id="hero-focal"'));
 assert.ok(rendered.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(!rendered.html.includes('<img src=x'));
 assert.ok(rendered.html.includes('AI-added content module'));
 assert.ok(rendered.css.includes('#112233'));
 const revision2=store.publish();
 assert.equal(revision2.manifest.version,'2.0.0');
 const changedStage=store.stageAI(changed);
 assert.equal(changedStage.canPublish,false);assert.equal(changedStage.quarantine[0].reason,'capability-changed');
 assert.throws(()=>store.acceptStage(changedStage.stageId),/quarantined/);
 const removedStage=store.stageAI(removed);
 assert.equal(removedStage.canPublish,true,'no edited field in removed signup component');
 store.setOwner('signup-block/placeholder','Owner signup');
 store.saveDraft();
 assert.throws(()=>store.acceptStage(removedStage.stageId),/missing or stale|compare-and-swap/);
 const removalNow=store.stageAI(removed);
 assert.equal(removalNow.canPublish,false);
 assert.equal(removalNow.quarantine[0].reason,'component-removed');
 assert.deepEqual(store.snapshot().published,revision2);
 const restored=store.rollback(revision1.revision);
 assert.equal(restored.sourceRevision,revision1.revision);
 assert.equal(restored.manifest.version,'1.0.0');
 assert.equal(restored.overrides['hero-anchor/headline'],'Owner headline <img src=x onerror=alert(1)>');
 assert.equal(store.snapshot().history.length,4,'immutable audit trail baseline/publish/publish/rollback');
 const bad=clone(v1);bad.components.push(clone(bad.components[0]));
 assert.throws(()=>validateManifest(bad),/component/);
 const bad2=clone(v1);bad2.components[0].defaults.gradientFrom='linear-gradient(url(https://evil.invalid))';
 assert.throws(()=>validateManifest(bad2),/bad default/);
 const bad3=clone(v1);bad3.components[0].defaults.unknown='not vetted';
 assert.throws(()=>validateManifest(bad3),/field contract/);
 assert.throws(()=>reconcile(v1,v2,{'hero-anchor/headline':'X'},[{from:'hero-anchor',to:'hero-focal',kind:'hero',approved:false}]),/unreviewed/);
 assert.throws(()=>reconcile(v1,v2,{'hero-anchor/headline':'X'},[{from:'hero-anchor',to:'hero-focal',kind:'accordion',approved:true}]),/unreviewed/);
 assert.throws(()=>reconcile(v1,v2,{'hero-anchor/headline':'X'},[aliases[0],aliases[0]]),/unreviewed/);
 assert.throws(()=>store.stageAI(v1),/non-increasing/);
 console.log('STAGE1_REGENERATION_UNIT='+JSON.stringify({pass:true,sourceComponents:4,regeneratedComponents:5,ownerEditsMigrated:5,
  reviewedRenamedIDs:1,reorderedAndInserted:true,invalidEditBoundaries:3,invalidManifests:3,quarantineBlocksPublish:true,
  staleCASRejected:true,historyRevisions:4,rollbackRestored:true,originalPublishedUnchangedUntilPublish:true,
  limits:'reviewed typed single-site component graph, no blind AI-import, no production persistence or admin authentication'}));
}
module.exports={assets,catalog,validateManifest,checkValue,validateOverride,publicShape,reconcile,editorSchema,renderSafe,manifestFixtures,createRevisionStore,runUnit};
if(require.main===module)runUnit();
