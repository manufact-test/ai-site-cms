/* Stage 1 RESEARCH ONLY — disposable model for stable IDs, breakpoint inheritance, overrides and publish safety. */
'use strict';
const assert=require('node:assert/strict');
const clone=x=>structuredClone(x);
const lengths=/^(?:0|[1-9][0-9]{0,2})px$/;
const v1={version:'1',sectionId:'hero-primary',elements:{
 'hero-title':{text:'Build the future',fontSize:{desktop:'64px'},color:'#ffffff'},
 'hero-cta':{text:'Explore',fontSize:{desktop:'18px'}}
}};
const v2=clone(v1);v2.version='2';v2.elements['hero-title'].text='Brand new AI copy';v2.elements['hero-title'].fontSize.desktop='72px';
const v3=clone(v2);v3.version='3';delete v3.elements['hero-title'].fontSize;v3.elements['hero-title'].lineHeight={desktop:'90px'};
const v4=clone(v2);v4.version='4';v4.maxFontPx=50;
function validPaths(manifest){const paths=new Set();for(const [id,defs] of Object.entries(manifest.elements)){for(const key of ['text','fontSize','color'])if(Object.hasOwn(defs,key))paths.add(id+'/'+key)}return paths}
function validateOverride(manifest,entry){
 const [id,prop]=entry.key.split('/');
 if(!manifest.elements[id]||!Object.hasOwn(manifest.elements[id],prop))return 'unknown_or_removed_field';
 if(prop==='fontSize'){
  if(!entry.value||typeof entry.value!=='object'||Array.isArray(entry.value))return 'invalid_breakpoint_object';
  if(Object.keys(entry.value).some(k=>!['desktop','tablet','mobile'].includes(k)))return 'unknown_breakpoint';
  for(const value of Object.values(entry.value)){
   if(typeof value!=='string'||!lengths.test(value))return 'invalid_length';
   if(manifest.maxFontPx&&Number.parseInt(value)>manifest.maxFontPx)return 'out_of_new_range';
  }
 }else if(typeof entry.value!=='string')return 'invalid_text_or_color';
 return null;
}
function validateOverrides(manifest,overrides){const conflicts=[];for(const entry of overrides){const error=validateOverride(manifest,entry);if(error)conflicts.push({key:entry.key,reason:error})}return conflicts}
function pick(bp,levels){
 const cascade=bp==='mobile'?['mobile','tablet','desktop']:bp==='tablet'?['tablet','desktop']:['desktop'];
 for(const key of cascade)if(Object.hasOwn(levels||{},key))return levels[key];
 return undefined;
}
function resolve(manifest,overrides,id,key,bp,globals={}){
 const def=manifest.elements[id][key];if(def===undefined)throw Error('property not declared '+id+'/'+key);
 const owner=overrides.find(e=>e.key===id+'/'+key);
 if(typeof def==='string')return owner?owner.value:def;
 const fromOwner=pick(bp,owner?.value||{});
 if(fromOwner!==undefined)return fromOwner;
 const fromDefault=pick(bp,def);
 if(fromDefault!==undefined)return fromDefault;
 return globals[key]??null;
}
class Candidate{
 constructor(manifest){this.manifest=clone(manifest);this.draft=[];this.persistedDraft=[];this.published=null;this.history=[];this.nextId=1;}
 set(key,value){
  const next=this.draft.filter(x=>x.key!==key).concat([{key,value:clone(value)}]);
  const errors=validateOverrides(this.manifest,next);
  if(errors.length)throw Error('invalid override: '+JSON.stringify(errors));
  this.draft=next;
 }
 saveDraft(){this.persistedDraft=clone(this.draft);return clone(this.persistedDraft)}
 attemptUpdate(next){
  const conflicts=validateOverrides(next,this.draft);
  if(conflicts.length)return {ok:false,conflicts};
  this.manifest=clone(next);return {ok:true,conflicts:[]};
 }
 publish(){
  const conflicts=validateOverrides(this.manifest,this.persistedDraft);
  if(conflicts.length)return {ok:false,conflicts};
  const result={revision:this.nextId++,version:this.manifest.version,sectionId:this.manifest.sectionId,manifest:clone(this.manifest),overrides:clone(this.persistedDraft)};
  this.published=clone(result);this.history.push(clone(result));return {ok:true,revision:result.revision};
 }
 rollback(revision){
  const existing=this.history.find(x=>x.revision===revision);
  if(!existing)throw Error('missing revision');
  this.published=clone(existing);
 }
}
const cms=new Candidate(v1);
assert.equal(resolve(v1,[], 'hero-title','fontSize','mobile'),'64px');
cms.set('hero-title/fontSize',{desktop:'58px',tablet:'48px'});
cms.set('hero-title/text','Owner headline');
assert.equal(resolve(v1,cms.draft,'hero-title','fontSize','mobile'),'48px','mobile must inherit tablet');
assert.equal(resolve(v1,cms.draft,'hero-title','fontSize','desktop'),'58px');
assert.equal(resolve(v1,cms.draft,'hero-cta','fontSize','mobile'),'18px','other element unaffected');
cms.saveDraft();assert.deepEqual(cms.publish(),{ok:true,revision:1});
const publishedRev1=clone(cms.published);
cms.set('hero-title/fontSize',{desktop:'58px',tablet:'48px',mobile:'32px'});
assert.equal(resolve(cms.manifest,cms.draft,'hero-title','fontSize','mobile'),'32px');
assert.deepEqual(cms.published,publishedRev1,'live change is not saved or published');
cms.set('hero-title/fontSize',{desktop:'58px',tablet:'48px'});
assert.equal(resolve(cms.manifest,cms.draft,'hero-title','fontSize','mobile'),'48px','removing explicit mobile override restores cascade');
let update=cms.attemptUpdate(v2);assert.deepEqual(update,{ok:true,conflicts:[]});
assert.equal(resolve(v2,cms.draft,'hero-title','text','desktop'),'Owner headline','owner copy must survive new AI default');
assert.equal(resolve(v2,cms.draft,'hero-title','fontSize','desktop'),'58px','owner style survives new AI default');
assert.equal(resolve(v2,[],'hero-title','fontSize','desktop'),'72px','uninfluenced default should update');
cms.saveDraft();assert.deepEqual(cms.publish(),{ok:true,revision:2});
const publishedRev2=clone(cms.published);
update=cms.attemptUpdate(v3);
assert.equal(update.ok,false);assert.ok(update.conflicts.some(x=>x.key==='hero-title/fontSize'&&x.reason==='unknown_or_removed_field'));
assert.deepEqual(cms.published,publishedRev2,'removed property cannot silently destroy published override');
assert.equal(cms.manifest.version,'2','invalid code update must not swap manifest');
update=cms.attemptUpdate(v4);
assert.equal(update.ok,false);assert.ok(update.conflicts.some(x=>x.reason==='out_of_new_range'));
assert.deepEqual(cms.published,publishedRev2);
assert.throws(()=>cms.set('hero-title/nonexistent','x'),/invalid override/);
assert.throws(()=>cms.set('hero-title/fontSize',{desktop:'url(javascript:alert(1))'}),/invalid override/);
assert.throws(()=>cms.set('hero-title/fontSize',{desktop:'42px',watch:'50px'}),/invalid override/);
assert.deepEqual(cms.published,publishedRev2);
cms.rollback(1);assert.deepEqual(cms.published,publishedRev1);
assert.equal(resolve(cms.published.manifest,cms.published.overrides,'hero-title','fontSize','mobile'),'48px');
const results={pass:true,cases:[
 'breakpoint cascade','owner desktop & tablet overrides','per-element scope','save draft then publish','unsaved live edit isolation',
 'mobile clear fallback','AI v2 defaults changed without overwrite','removed schema field conflict','tightened range conflict',
 'malicious CSS rejected','unknown field rejected','unknown breakpoint rejected','published stays atomic','rollback exact revision'
],revisions:cms.history.length,rejectedUpdates:2,stage:'research only'};
console.log('STAGE1_OVERRIDE_EVOLUTION='+JSON.stringify(results));
