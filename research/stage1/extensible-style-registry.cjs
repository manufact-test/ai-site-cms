/* Stage 1 ONLY. Experimental trusted property-pack registry for varied annotated AI-site HTML.
   Property packs are developer-reviewed JavaScript, never executable user/AI input.
   Not a general arbitrary-HTML parser or production CSS sanitizer. */
'use strict';
const assert=require('node:assert/strict');
const allowedTags=new Set(['section','div','header','footer','main','article','aside','h1','h2','h3','h4','p','span','strong','small','ul','li','figure','figcaption','blockquote']);
const allowedStyles=Object.freeze({
 fontSize:'fontSize',padding:'padding',borderRadius:'borderRadius',
 maxWidth:'maxWidth',letterSpacing:'letterSpacing',backgroundColor:'backgroundColor',
 opacity:'opacity',flexDirection:'flexDirection',gap:'gap',borderColor:'borderColor'
});
const simpleKey=/^[a-z][a-zA-Z0-9]{0,35}$/;
const validId=/^[a-z][a-z0-9-]{0,60}$/;
const isPlain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const exactly=(x,keys)=>isPlain(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(x,k));
const escapeText=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const safeLength=x=>typeof x==='string'&&/^(?:0|[1-9][0-9]{0,2})px$/.test(x)&&Number.parseInt(x,10)<=300;
const safeColor=x=>typeof x==='string'&&/^#[a-fA-F0-9]{6}$/.test(x);
const safeOpacity=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1&&Math.round(x*100)===x*100;
const directTypes=['text','color','opacity','responsive-length','choice'];
function valid(def,value){
 if(def.kind==='text')return typeof value==='string'&&value.length<=400;
 if(def.kind==='color')return safeColor(value);
 if(def.kind==='opacity')return safeOpacity(value);
 if(def.kind==='choice')return typeof value==='string'&&def.options.includes(value);
 if(def.kind==='responsive-length')return exactly(value,['desktop','tablet','mobile'])&&safeLength(value.desktop)&&['tablet','mobile'].every(k=>value[k]===''||safeLength(value[k]));
 return false;
}
function createRegistry(){
 const records=new Map(),packs=new Set();
 function registerPack(packName,definitions){
  if(typeof packName!=='string'||!/^[a-z][a-z0-9-]{1,45}$/.test(packName)||packs.has(packName))throw Error('invalid/duplicate pack');
  if(!isPlain(definitions)||Object.keys(definitions).length===0||Object.keys(definitions).length>20)throw Error('bad pack');
  // Validate the entire pack before committing it. Bad plugin cannot partially register fields.
  const staged=[];
  for(const [name,def] of Object.entries(definitions)){
   if(!simpleKey.test(name)||records.has(name)||Object.keys(definitions).filter(n=>n===name).length>1)throw Error('name collision');
   if(!isPlain(def)||!directTypes.includes(def.kind))throw Error('untrusted pack specification');
   const expected=def.kind==='choice'?['kind','css','default','options']:['kind','css','default'];
   if(!exactly(def,expected))throw Error('pack unexpected fields');
   if(name==='text'){
    if(def.kind!=='text'||def.css!==null)throw Error('text must use textContent');
   }else{
    if(!Object.prototype.hasOwnProperty.call(allowedStyles,name)||allowedStyles[name]!==def.css)throw Error('CSS property target not allowed');
    if(def.kind==='text')throw Error('text used for CSS');
   }
   if(def.kind==='choice'&&(!Array.isArray(def.options)||def.options.length<2||def.options.length>8||new Set(def.options).size!==def.options.length||def.options.some(v=>typeof v!=='string'||!/^[a-z-]{1,25}$/.test(v))))throw Error('choice options unsafe');
   if(!valid(def,def.default))throw Error('invalid default for '+name);
   staged.push([name,structuredClone(def)]);
  }
  for(const [name,def] of staged)records.set(name,Object.freeze(def));
  packs.add(packName);
 }
 function parse(html,parseFragment){
  if(typeof html!=='string'||html.length>20000)throw Error('HTML too large');
  const parseErrors=[];
  const fragment=parseFragment(html,{sourceCodeLocationInfo:true,onParseError:e=>parseErrors.push(e.code)});
  if(parseErrors.length)throw Error('parser errors '+parseErrors.join(','));
  const roots=fragment.childNodes.filter(n=>n.tagName||n.nodeName==='#text'&&n.value.trim());
  if(roots.length!==1||roots[0].tagName!=='section')throw Error('single section required');
  const ids=new Set(),fields=[],defaults=Object.create(null),visibleTextNodes=[];let nodes=0;
  function visit(node,depth){
   if(++nodes>120||depth>12||!node.tagName||!allowedTags.has(node.tagName)||node.namespaceURI!=='http://www.w3.org/1999/xhtml')throw Error('unsafe element');
   const attrs=Object.fromEntries(node.attrs.map(a=>[a.name,a.value]));
   if(Object.keys(attrs).length!==node.attrs.length)throw Error('duplicate HTML attribute');
   for(const [name,value] of Object.entries(attrs)){
    if(name==='data-stable-id'){if(!validId.test(value)||ids.has(value))throw Error('bad/duplicate stable ID');ids.add(value)}
    else if(name==='data-editable'){if(!/^[a-zA-Z ]{1,200}$/.test(value))throw Error('bad editable syntax')}
    else if(name==='class'){if(!/^[a-z0-9 -]{0,120}$/.test(value))throw Error('invalid class')}
    else throw Error('unknown HTML attribute '+name);
   }
   if(attrs['data-editable']){
    const id=attrs['data-stable-id'];if(!id)throw Error('editable without stable ID');
    const names=attrs['data-editable'].split(' ');
    if(new Set(names).size!==names.length)throw Error('duplicate field declarations');
    for(const name of names){
     const def=records.get(name);if(!def)throw Error('unknown field '+name);
     if(name==='text'&&node.childNodes.some(n=>n.tagName))throw Error('editable text parent would destroy children');
     const key=id+'__'+name;
     const text=node.childNodes.filter(n=>n.nodeName==='#text').map(n=>n.value).join('');
     const value=name==='text'?text:structuredClone(def.default);
     if(!valid(def,value))throw Error('invalid initial field '+key);
     fields.push({id,key,name,kind:def.kind});
     defaults[key]=value;
    }
   }
   for(const sub of node.childNodes||[]){
    if(sub.tagName)visit(sub,depth+1);
    else if(sub.nodeName!=='#text')throw Error('comments/unknown nodes are forbidden');
   }
   const text=node.childNodes?.filter(n=>n.nodeName==='#text').map(n=>n.value).join('').trim()||'';
   if(text&&!node.childNodes.some(n=>n.tagName))visibleTextNodes.push(attrs['data-stable-id']||null);
  }
  visit(roots[0],0);
  if(fields.length===0||fields.length>60)throw Error('manifest budget');
  const model={html,fields,defaults:{...defaults},elementIds:[...ids],visibleTextNodes,nodes};
  validate(model,model.defaults);
  return model;
 }
 function schema(model){
  const properties=Object.create(null);
  for(const f of model.fields){
   const def=records.get(f.name);
   if(!def||def.kind!==f.kind)throw Error('stale pack');
   if(def.kind==='text')properties[f.key]={type:'string',maxLength:400};
   if(def.kind==='color')properties[f.key]={type:'string',pattern:'^#[a-fA-F0-9]{6}$'};
   if(def.kind==='opacity')properties[f.key]={type:'number',minimum:0,maximum:1,multipleOf:0.01};
   if(def.kind==='choice')properties[f.key]={type:'string',enum:def.options};
   if(def.kind==='responsive-length')properties[f.key]={type:'object',additionalProperties:false,required:['desktop','tablet','mobile'],properties:{
    desktop:{type:'string',pattern:'^(?:0|[1-9][0-9]{0,2})px$'},
    tablet:{type:'string',pattern:'^(?:|0|[1-9][0-9]{0,2})px$'},
    mobile:{type:'string',pattern:'^(?:|0|[1-9][0-9]{0,2})px$'}
   }};
  }
  return {$schema:'https://json-schema.org/draft/2020-12/schema',type:'object',additionalProperties:false,required:Object.keys(properties),properties:{...properties}};
 }
 function validate(model,values){
  if(!isPlain(values)||Object.keys(values).length!==model.fields.length)throw Error('model cardinality');
  for(const f of model.fields){
   const def=records.get(f.name);
   if(!def||def.kind!==f.kind||!Object.prototype.hasOwnProperty.call(values,f.key)||!valid(def,values[f.key]))throw Error('model invalid: '+f.key);
  }
  return true;
 }
 function resolved(val,device){
  if(!['desktop','tablet','mobile'].includes(device))throw Error('bad device');
  return device==='desktop'?val.desktop:device==='tablet'?(val.tablet||val.desktop):(val.mobile||val.tablet||val.desktop);
 }
 function apply(root,model,values,device){
  validate(model,values);
  if(!['desktop','tablet','mobile'].includes(device))throw Error('device');
  for(const f of model.fields){
   const el=root.querySelector('[data-stable-id="'+f.id+'"]');
   if(!el)throw Error('missing element');
   const def=records.get(f.name),v=values[f.key];
   if(def.kind==='text')el.textContent=v;
   else if(def.kind==='opacity')el.style.opacity=String(v);
   else if(def.kind==='color')el.style[def.css]=v;
   else if(def.kind==='responsive-length')el.style[def.css]=resolved(v,device);
   else if(def.kind==='choice'){
    if(def.css==='flexDirection')el.style.display='flex';
    el.style[def.css]=v;
   }
  }
 }
 function migrate(oldModel,nextModel,owner){
  if(!isPlain(owner))throw Error('override not object');
  const before=new Map(oldModel.fields.map(f=>[f.key,f.kind]));
  const after=new Map(nextModel.fields.map(f=>[f.key,f.kind]));
  const kept={},quarantined=[];
  for(const [key,value] of Object.entries(owner)){
   if(!before.has(key))quarantined.push({key,reason:'unknown-original'});
   else if(!after.has(key))quarantined.push({key,reason:'removed-or-renamed'});
   else if(before.get(key)!==after.get(key))quarantined.push({key,reason:'kind-changed'});
   else if(!valid(records.get(nextModel.fields.find(f=>f.key===key).name),value))quarantined.push({key,reason:'out-of-range'});
   else kept[key]=value;
  }
  return {values:{...structuredClone(nextModel.defaults),...kept},kept:Object.keys(kept),quarantined,canPublish:quarantined.length===0};
 }
 function audit(model,externalIntent,readonly=[]){
  if(!isPlain(externalIntent)||!Array.isArray(readonly))throw Error('intent');
  const want=new Set();
  for(const [id,names] of Object.entries(externalIntent)){
   if(!validId.test(id)||!Array.isArray(names))throw Error('ledger');
   for(const name of names){if(!records.has(name)||want.has(id+'__'+name))throw Error('invalid/duplicate ledger');want.add(id+'__'+name)}
  }
  const have=new Set(model.fields.map(f=>f.key));
  const missed=[...want].filter(key=>!have.has(key)),undeclared=[...have].filter(key=>!want.has(key));
  const unmarkedText=model.visibleTextNodes.filter(id=>!have.has(id+'__text')&&!readonly.includes(id));
  return {missed,undeclared,unmarkedText,complete:missed.length===0&&undeclared.length===0&&unmarkedText.length===0};
 }
 return {registerPack,parse,schema,validate,apply,migrate,audit,resolved,installedPacks:()=>[...packs],knownFields:()=>[...records.keys()]};
}
function installResearchPacks(registry){
 registry.registerPack('research-content-v1',{text:{kind:'text',css:null,default:''},fontSize:{kind:'responsive-length',css:'fontSize',default:{desktop:'36px',tablet:'',mobile:''}}});
 registry.registerPack('research-geometry-v1',{
  padding:{kind:'responsive-length',css:'padding',default:{desktop:'24px',tablet:'',mobile:''}},
  borderRadius:{kind:'responsive-length',css:'borderRadius',default:{desktop:'14px',tablet:'',mobile:''}},
  maxWidth:{kind:'responsive-length',css:'maxWidth',default:{desktop:'300px',tablet:'',mobile:''}},
  gap:{kind:'responsive-length',css:'gap',default:{desktop:'18px',tablet:'',mobile:''}}
 });
 registry.registerPack('research-appearance-v1',{
  backgroundColor:{kind:'color',css:'backgroundColor',default:'#203047'},
  borderColor:{kind:'color',css:'borderColor',default:'#ccddee'},
  opacity:{kind:'opacity',css:'opacity',default:1},
  flexDirection:{kind:'choice',css:'flexDirection',default:'row',options:['row','column']}
 });
 return registry;
}
module.exports={createRegistry,installResearchPacks};
