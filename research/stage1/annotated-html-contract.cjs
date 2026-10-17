/* Stage 1 ONLY: inferred editability from annotated trusted HTML, not a production sanitizer.
 * Arbitrary shapes of sections in bounded allowlisted HTML; no arbitrary CSS/JS permitted. */
'use strict';
const IDS=/^[a-z][a-z0-9-]{0,55}$/;
const TAGS=new Set(['section','div','header','footer','article','aside','h1','h2','h3','h4','p','span','strong','small','ul','li']);
const PROPS=new Set(['text','fontSize','gap','backgroundColor']);
const TEXT_MAX=400;
const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function len(v){return typeof v==='string'&&/^(?:0|[1-9]\d{0,2})px$/.test(v)&&parseInt(v,10)<=300}
function hex(v){return typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v)}
function valid(type,v){
 if(type==='text')return typeof v==='string'&&v.length<=TEXT_MAX;
 if(type==='backgroundColor')return hex(v);
 if(['fontSize','gap'].includes(type))return isObj(v)&&Object.keys(v).sort().join(',')==='desktop,mobile,tablet'&&len(v.desktop)&&['tablet','mobile'].every(k=>v[k]===''||len(v[k]));
 return false;
}
function defaultValue(element,prop){
 if(prop==='text')return element.textContent;
 if(prop==='backgroundColor')return '#25314a';
 if(prop==='gap')return {desktop:'24px',tablet:'',mobile:''};
 if(prop==='fontSize')return {desktop:'36px',tablet:'',mobile:''};
 throw Error('unknown property');
}
function discover(html,parseFragment){
 if(typeof html!=='string'||html.length>15000||!html.trim().endsWith('</section>'))throw Error('html boundary');
 const errors=[];const tree=parseFragment(html,{sourceCodeLocationInfo:true,onParseError:e=>errors.push(e.code)});
 if(errors.length)throw Error('parser error: '+errors.join(','));
 const elements=tree.childNodes.filter(x=>x.nodeName!=='#text'||x.value.trim());
 if(elements.length!==1||elements[0].tagName!=='section')throw Error('one section required');
 const fields=[],defaults={},ids=new Set();let count=0;
 function walk(node,depth){
  if(++count>100||depth>12)throw Error('structure limit');
  if(!node.tagName||!TAGS.has(node.tagName)||node.namespaceURI!=='http://www.w3.org/1999/xhtml')throw Error('tag refused');
  const attrs=Object.fromEntries(node.attrs.map(x=>[x.name,x.value]));
  if(Object.keys(attrs).length!==node.attrs.length)throw Error('duplicate attribute');
  for(const [name,value] of Object.entries(attrs)){
   if(name==='class'){if(!/^[a-z0-9 -]{0,120}$/.test(value))throw Error('class refused')}
   else if(name==='data-stable-id'){if(!IDS.test(value)||ids.has(value))throw Error('stable ID refused');ids.add(value)}
   else if(name==='data-editable'){if(!/^(?:text|fontSize|gap|backgroundColor)(?: (?:text|fontSize|gap|backgroundColor))*$/.test(value))throw Error('editable declaration refused')}
   else throw Error('attribute refused: '+name);
  }
  const childEls=node.childNodes.filter(x=>x.tagName);
  for(const child of node.childNodes)if(child.nodeName==='#comment'||(child.nodeName!=='#text'&&!child.tagName))throw Error('other node refused');
  if(attrs['data-editable']){
   if(!attrs['data-stable-id'])throw Error('editable without stable id');
   const list=attrs['data-editable'].split(' ');
   if(new Set(list).size!==list.length)throw Error('duplicate editable property');
   for(const prop of list){
    if(!PROPS.has(prop))throw Error('unknown editable property');
    if(prop==='text'&&childEls.length)throw Error('editable text on parent destroys children');
    if(prop==='gap'&&!['div','ul','section','article','aside'].includes(node.tagName))throw Error('gap unsupported tag');
    if(prop==='fontSize'&&!['h1','h2','h3','h4','p','span','strong','small'].includes(node.tagName))throw Error('fontSize unsupported tag');
    const id=attrs['data-stable-id'],key=id+'__'+prop;
    const el={id,textContent:node.childNodes.filter(x=>x.nodeName==='#text').map(x=>x.value).join('')};
    fields.push({key,id,prop});
    defaults[key]=defaultValue(el,prop);
    if(!valid(prop,defaults[key]))throw Error('default invalid');
   }
  }
  childEls.forEach(n=>walk(n,depth+1));
 }
 walk(elements[0],0);
 if(fields.length===0||fields.length>40)throw Error('field budget');
 return {version:1,html,fields,defaults,elementIds:[...ids],elementCount:count};
}
function modelSchema(m){
 const props={};
 for(const {key,prop} of m.fields){
  if(prop==='text')props[key]={type:'string',maxLength:TEXT_MAX};
  if(prop==='backgroundColor')props[key]={type:'string',pattern:'^#[0-9a-fA-F]{6}$'};
  if(prop==='fontSize'||prop==='gap')props[key]={type:'object',required:['desktop','tablet','mobile'],additionalProperties:false,properties:{
   desktop:{type:'string',pattern:'^(?:0|[1-9][0-9]{0,2})px$'},
   tablet:{type:'string',pattern:'^(?:|0px|[1-9][0-9]{0,2}px)$'},
   mobile:{type:'string',pattern:'^(?:|0px|[1-9][0-9]{0,2}px)$'}
  }};
 }
 return {$schema:'https://json-schema.org/draft/2020-12/schema',type:'object',additionalProperties:false,required:Object.keys(props),properties:props};
}
function validate(m,values){
 if(!isObj(values)||Object.keys(values).length!==m.fields.length)throw Error('model cardinality');
 for(const {key,prop} of m.fields)if(!hasOwn(values,key)||!valid(prop,values[key]))throw Error('model property rejected: '+key);
 return true;
}
function resolved(v,device){
 if(!['desktop','tablet','mobile'].includes(device))throw Error('invalid device');
 return device==='desktop'?v.desktop:device==='tablet'?(v.tablet||v.desktop):(v.mobile||v.tablet||v.desktop);
}
function apply(root,m,values,device){
 validate(m,values);
 for(const f of m.fields){
  const node=root.querySelector('[data-stable-id="'+f.id+'"]');
  if(!node)throw Error('missing stable node '+f.id);
  const v=values[f.key];
  if(f.prop==='text')node.textContent=v;
  else if(f.prop==='backgroundColor')node.style.backgroundColor=v;
  else if(f.prop==='fontSize')node.style.fontSize=resolved(v,device);
  else if(f.prop==='gap'){node.style.display='flex';node.style.gap=resolved(v,device)}
 }
}
function migrate(oldManifest,newManifest,ownerOverrides){
 if(!isObj(ownerOverrides))throw Error('owner overrides object required');
 const previous=new Map(oldManifest.fields.map(f=>[f.key,f.prop]));
 const next=new Map(newManifest.fields.map(f=>[f.key,f.prop]));
 const kept={},conflicts=[];
 for(const [k,value] of Object.entries(ownerOverrides)){
  if(!previous.has(k)){conflicts.push({key:k,reason:'unknown-old-key'});continue}
  if(!next.has(k)){conflicts.push({key:k,reason:'removed-or-renamed'});continue}
  if(next.get(k)!==previous.get(k)||!valid(next.get(k),value)){conflicts.push({key:k,reason:'type-or-value-conflict'});continue}
  kept[k]=value;
 }
 return {values:{...structuredClone(newManifest.defaults),...kept},kept:Object.keys(kept),conflicts,publishBlocked:conflicts.length>0};
}
module.exports={discover,validate,apply,modelSchema,migrate,resolved};
