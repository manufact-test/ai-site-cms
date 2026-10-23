'use strict';
// Stage 3 isolated, offline contract SDK. No provider, network, host, CMS write,
// unsafe HTML execution, or hidden publication. Reference implementation v1.
const FORMAT='manufact-ai-site-v1',MANIFEST='manufact-ai-component-v1';
const BREAKPOINTS=['desktop','tablet','mobile'];
const TYPES=new Set(['text','number','boolean','color','length','enum','url','media']);
const isObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const clone=x=>structuredClone(x);
const key=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const elementId=/^[a-z][a-z0-9-]{2,79}$/;
const length=/^(-?(?:\d+)(?:\.\d{1,3})?)(px|rem|%|vw|vh)$/;
function fail(msg,at='contract'){throw Error(msg+' @ '+at);}
function objectKeys(obj,keys,where){
  if(!isObject(obj)||Object.keys(obj).some(k=>!keys.includes(k)))
    fail('Unexpected object keys',where);
}
function id(value,where){if(typeof value!=='string'||value.length>80||!elementId.test(value))fail('Invalid stable ID',where);}
function text(value,where,limit=180){
  if(typeof value!=='string'||value.length<1||value.length>limit||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))fail('Invalid text',where);
}
function version(v,where){if(typeof v!=='string'||!/^([1-9]\d*|0)\.([1-9]\d*|0)\.([1-9]\d*|0)$/.test(v))fail('Invalid semver',where);}
function cmpVersion(a,b){return a.split('.').map(Number).reduce((result,part,i)=>result||Math.sign(part-Number(b.split('.')[i])),0);}
function validateValue(field,val,where,assetIds=null){
  if(field.responsive){
    if(!isObject(val)||!own(val,'desktop')||Object.keys(val).some(k=>!BREAKPOINTS.includes(k)))fail('Invalid responsive map',where);
    for(const bp of Object.keys(val))validateAtom(field,val[bp],where+'/'+bp,assetIds);
  }else validateAtom(field,val,where,assetIds);
}
function validateAtom(field,val,where,assetIds){
  if(field.type==='text'){
    if(typeof val!=='string'||val.length>field.maxLength||val.includes('\0'))fail('Invalid text value',where);
  }else if(field.type==='number'){
    if(typeof val!=='number'||!Number.isFinite(val)||val<field.min||val>field.max)fail('Out-of-range number',where);
  }else if(field.type==='boolean'){
    if(typeof val!=='boolean')fail('Invalid boolean',where);
  }else if(field.type==='color'){
    if(typeof val!=='string'||!/^#[0-9a-fA-F]{6}$/.test(val))fail('Invalid hex color',where);
  }else if(field.type==='length'){
    const m=typeof val==='string'&&length.exec(val);
    if(!m||!field.units.includes(m[2])||Number(m[1])<field.min||Number(m[1])>field.max)fail('Invalid length',where);
  }else if(field.type==='enum'){
    if(typeof val!=='string'||!field.options.includes(val))fail('Invalid enum',where);
  }else if(field.type==='url'){
    if(typeof val!=='string'||val.length>300||
      !(val.startsWith('/')&&!val.startsWith('//')&&!val.includes('\\')&&!/[\s"'<>]/.test(val)||
        /^https:\/\/[a-z0-9.-]+(?::443)?(?:\/[^\s"'<>\\]*)?$/i.test(val)))fail('Unsafe link',where);
  }else if(field.type==='media'){
    if(typeof val!=='string'||val!==''&&(!elementId.test(val)||assetIds&&!assetIds.has(val)))fail('Missing media binding',where);
  }else fail('Unknown type',where);
}
function validateManifest(m){
  objectKeys(m,['format','id','version','label','elements','repeat'],'manifest');
  if(m.format!==MANIFEST||typeof m.id!=='string'||!key.test(m.id))fail('Invalid component manifest ID');
  version(m.version,'manifest.version');text(m.label,'manifest.label',110);
  if(!Array.isArray(m.elements)||m.elements.length<1||m.elements.length>30)fail('Invalid element declarations');
  if(own(m,'repeat')){
    objectKeys(m.repeat,['label','min','max','fields'],'manifest.repeat');
    text(m.repeat.label,'repeat.label',110);
    if(!Number.isInteger(m.repeat.min)||!Number.isInteger(m.repeat.max)||
      m.repeat.min<1||m.repeat.max>24||m.repeat.min>m.repeat.max||
      !Array.isArray(m.repeat.fields)||!m.repeat.fields.length||m.repeat.fields.length>12)
      fail('Invalid repeater bounds or fields');
  }
  const slots=new Set();
  for(const el of [...m.elements,...(m.repeat?[{slot:'repeat-item',label:m.repeat.label,fields:m.repeat.fields}]:[])]){
    objectKeys(el,['slot','label','fields'],'element');
    if(typeof el.slot!=='string'||!key.test(el.slot)||slots.has(el.slot))fail('Duplicate or unsafe slot',el.slot);
    slots.add(el.slot);text(el.label,'slot.label',110);
    if(!Array.isArray(el.fields)||el.fields.length<1||el.fields.length>60)fail('Element must declare editable fields',el.slot);
    const paths=new Set();
    for(const f of el.fields){
      objectKeys(f,['path','label','type','default','responsive','min','max','units','options','maxLength'],'field');
      if(typeof f.path!=='string'||!/^(content|style|behavior)\.[a-z][a-zA-Z0-9]*$/.test(f.path)||paths.has(f.path))
        fail('Duplicate or unknown typed path',el.slot);
      paths.add(f.path);text(f.label,'field.label',110);
      if(!TYPES.has(f.type)||typeof f.responsive!=='boolean')fail('Unknown field type',f.path);
      if(f.responsive&&!['length','color','number','boolean','enum'].includes(f.type))
        fail('Field cannot be responsive',f.path);
      if(f.type==='text'&&(!Number.isInteger(f.maxLength)||f.maxLength<1||f.maxLength>4000))fail('Invalid text limit',f.path);
      if(['number','length'].includes(f.type)&&(!Number.isFinite(f.min)||!Number.isFinite(f.max)||f.min>f.max||
        f.min< -100000||f.max>100000))fail('Invalid numeric limits',f.path);
      if(f.type==='length'&&(!Array.isArray(f.units)||!f.units.length||f.units.some(u=>!['px','rem','%','vw','vh'].includes(u))||new Set(f.units).size!==f.units.length))
        fail('Invalid unit list',f.path);
      if(f.type==='enum'&&(!Array.isArray(f.options)||!f.options.length||f.options.length>80||
        f.options.some(v=>typeof v!=='string'||!key.test(v))||new Set(f.options).size!==f.options.length))
        fail('Invalid enum options',f.path);
      if(!own(f,'default'))fail('Default is mandatory',f.path);
      validateValue(f,f.default,'default/'+f.path);
    }
  }
  return clone(m);
}
function registry(input){
  if(!Array.isArray(input)||!input.length||input.length>100)fail('Invalid registry');
  const m=new Map();
  for(const item of input){const valid=validateManifest(item);if(m.has(valid.id))fail('Duplicate component registration',valid.id);m.set(valid.id,valid);}
  return m;
}
function select(reg,component,versionValue){
  const m=reg.get(component);
  if(!m||m.version!==versionValue)fail('Unregistered component or version',component);
  return m;
}
function fieldMap(def){return new Map(def.fields.map(f=>[f.path,f]));}

const DEFAULT_THEME=Object.freeze({background:'#f7f9fc',surface:'#ffffff',text:'#172a43',primary:'#0a5bff',font:'system',maxWidth:1140});
function validTheme(t){
  objectKeys(t,['background','surface','text','primary','font','maxWidth'],'theme');
  for(const k of ['background','surface','text','primary'])
    if(typeof t[k]!=='string'||!/^#[0-9a-fA-F]{6}$/.test(t[k]))fail('Invalid theme color',k);
  if(!['system','arial','georgia'].includes(t.font)||!Number.isInteger(t.maxWidth)||t.maxWidth<680||t.maxWidth>1600)fail('Invalid theme font or width');
}
function validSeo(s){
  objectKeys(s,['title','description','robots'],'seo');
  if(typeof s.title!=='string'||s.title.length>160||/[\x00-\x1f]/.test(s.title)||
    typeof s.description!=='string'||s.description.length>300||/[\x00-\x1f]/.test(s.description)||
    !['index','noindex'].includes(s.robots))fail('Invalid SEO metadata');
}
function validNav(n){
  objectKeys(n,['label','hidden'],'navigation');
  if(typeof n.label!=='string'||n.label.length>100||/[\x00-\x1f]/.test(n.label)||typeof n.hidden!=='boolean')fail('Invalid page navigation');
}
function validateSite(raw,regInput){
  const reg=regInput instanceof Map?regInput:registry(regInput);
  objectKeys(raw,['format','siteId','title','schemaVersion','assets','pages','theme'],'site');
  if(own(raw,'theme'))validTheme(raw.theme);
  if(raw.format!==FORMAT||raw.schemaVersion!==1)fail('Unsupported site format');
  id(raw.siteId,'siteId');text(raw.title,'site title',130);
  if(!Array.isArray(raw.assets)||raw.assets.length>300)fail('Invalid assets');
  const assetIds=new Set();
  for(const asset of raw.assets){
    objectKeys(asset,['id','src','alt','mime'],'asset');id(asset.id,'asset.id');
    if(assetIds.has(asset.id)||!['image/png','image/webp','image/jpeg','image/svg+xml'].includes(asset.mime)||
      typeof asset.src!=='string'||!/^\/assets\/[a-zA-Z0-9/_-]+\.(png|webp|jpg|jpeg|svg)$/.test(asset.src)||
      typeof asset.alt!=='string'||asset.alt.length>200)fail('Invalid asset',asset.id);
    assetIds.add(asset.id);
  }
  if(!Array.isArray(raw.pages)||raw.pages.length<1||raw.pages.length>100)fail('Invalid page count');
  const ids=new Set([raw.siteId,...assetIds]),paths=new Set();
  for(const page of raw.pages){
    objectKeys(page,['id','path','title','sections','seo','navigation'],'page');
    if(own(page,'seo'))validSeo(page.seo);
    if(own(page,'navigation'))validNav(page.navigation);
    id(page.id,'page.id');text(page.title,'page.title',160);
    if(typeof page.path!=='string'||!/^\/(?:[a-z0-9-]+\/)*$/.test(page.path)||paths.has(page.path))fail('Invalid page path',page.id);
    paths.add(page.path);
    if(ids.has(page.id))fail('Duplicate stable ID',page.id);ids.add(page.id);
    if(!Array.isArray(page.sections)||page.sections.length<1||page.sections.length>100)fail('Invalid sections',page.id);
    for(const section of page.sections){
      objectKeys(section,['id','component','manifestVersion','elements','items'],'section');
      id(section.id,'section.id');if(ids.has(section.id))fail('Duplicate stable ID',section.id);ids.add(section.id);
      const manifest=select(reg,section.component,section.manifestVersion);
      if(!Array.isArray(section.elements)||section.elements.length!==manifest.elements.length)fail('Incomplete element tree',section.id);
      const indexed=new Map();
      for(const el of section.elements){
        objectKeys(el,['id','slot','values'],'section.element');id(el.id,'element.id');
        if(ids.has(el.id))fail('Duplicate stable ID',el.id);ids.add(el.id);
        if(indexed.has(el.slot))fail('Duplicate element slot',el.slot);
        indexed.set(el.slot,el);
      }
      for(const slot of manifest.elements){
        const el=indexed.get(slot.slot);
        if(!el||!isObject(el.values))fail('Missing editable element',section.id+'/'+slot.slot);
        const definitions=fieldMap(slot);
        if(Object.keys(el.values).length!==definitions.size||Object.keys(el.values).some(p=>!definitions.has(p)))
          fail('Unbound, hidden or missing edit property',section.id+'/'+slot.slot);
        for(const [p,f] of definitions)validateValue(f,el.values[p],section.id+'/'+slot.slot+'/'+p,assetIds);
      }
      if(manifest.repeat){
        if(!Array.isArray(section.items)||section.items.length<manifest.repeat.min||
          section.items.length>manifest.repeat.max)fail('Invalid repeat count',section.id);
        const definitions=fieldMap(manifest.repeat);
        for(const item of section.items){
          objectKeys(item,['id','values'],'repeat item');
          id(item.id,'repeat item ID');
          if(ids.has(item.id))fail('Duplicate stable ID',item.id);
          ids.add(item.id);
          if(!isObject(item.values)||Object.keys(item.values).length!==definitions.size||
            Object.keys(item.values).some(p=>!definitions.has(p)))fail('Unknown repeat property',item.id);
          for(const [path,field] of definitions)
            validateValue(field,item.values[path],item.id+'/'+path,assetIds);
        }
      }else if(own(section,'items'))fail('Unregistered repeat items',section.id);
    }
  }
  return clone(raw);
}
function controls(doc,regInput,pageId,sectionId,elementId){
  const reg=regInput instanceof Map?regInput:registry(regInput);
  const site=validateSite(doc,reg),page=site.pages.find(p=>p.id===pageId),sec=page?.sections.find(s=>s.id===sectionId);
  if(!sec)fail('Unknown editor selection');
  const element=sec.elements.find(e=>e.id===elementId)||sec.items?.find(e=>e.id===elementId);
  if(!element)fail('Unknown element');
  const manifest=select(reg,sec.component,sec.manifestVersion);
  const def=element.slot?manifest.elements.find(x=>x.slot===element.slot):manifest.repeat;
  if(!def)fail('Undeclared repeat field');
  return def.fields.map(f=>({id:element.id+'/'+f.path,elementId:element.id,path:f.path,
    group:f.path.split('.')[0],label:f.label,type:f.type,
    responsive:f.responsive,breakpoints:f.responsive?BREAKPOINTS.slice():[],
    ...(f.units?{units:clone(f.units)}:{}),...(f.options?{options:clone(f.options)}:{}),
    ...(f.maxLength?{maxLength:f.maxLength}:{}),
    ...(f.min!==undefined?{min:f.min,max:f.max}:{}),value:clone(element.values[f.path])}));
}
function effectiveValue(value,bp){
  if(!isObject(value)||!BREAKPOINTS.includes(bp))return clone(value);
  return clone(value[bp]??(bp==='mobile'?value.tablet:undefined)??value.desktop);
}
function sectionFrom(manifest,idValue,overrides={}){
  id(idValue,'section ID');
  const elements=manifest.elements.map(def=>{
    const value={};for(const f of def.fields)value[f.path]=clone(f.default);
    const elementID=idValue+'-'+def.slot;
    id(elementID,'generated element ID');
    const override=overrides[def.slot];
    if(override)for(const [p,v] of Object.entries(override)){
      if(!def.fields.some(f=>f.path===p))fail('Undeclared generated property',def.slot+'/'+p);
      value[p]=clone(v);
    }
    return {id:elementID,slot:def.slot,values:value};
  });
  const result={id:idValue,component:manifest.id,manifestVersion:manifest.version,elements};
  if(manifest.repeat)result.items=Array.from({length:manifest.repeat.min},(_,i)=>({
    id:idValue+'-item-'+(i+1),
    values:Object.fromEntries(manifest.repeat.fields.map(f=>[f.path,clone(f.default)]))
  }));
  return result;
}
function siteFromBrief({siteId='site-generated',title='Новый сайт',brief={}},regInput){
  const reg=regInput instanceof Map?regInput:registry(regInput);
  if(!isObject(brief)||Object.keys(brief).some(k=>!['headline','description','ctaLabel'].includes(k)))
    fail('Only supplied facts may be generated');
  const chosen=['company-hero','feature-highlights','contact-panel'];
  for(const keyValue of chosen)if(!reg.has(keyValue))fail('Required safe component missing',keyValue);
  const sections=chosen.map((component,i)=>{
    const m=reg.get(component),overrides={};
    if(i===0){
      if(brief.headline!==undefined)overrides.heading={'content.text':brief.headline};
      if(brief.description!==undefined)overrides.summary={'content.text':brief.description};
      if(brief.ctaLabel!==undefined)overrides.action={'content.text':brief.ctaLabel};
    }
    return sectionFrom(m,'section-'+['hero','highlights','contact'][i],overrides);
  });
  const result={format:FORMAT,siteId,title,schemaVersion:1,assets:[],pages:[
    {id:'page-home',path:'/',title:'Главная',sections:sections.slice(0,2)},
    {id:'page-contact',path:'/contact/',title:'Контакты',sections:sections.slice(2)}
  ]};
  return validateSite(result,reg);
}
function upgrade(raw,previous,next,allOtherManifests,decisions={}){
  const old=validateManifest(previous),fresh=validateManifest(next);
  if(old.id!==fresh.id||cmpVersion(fresh.version,old.version)<=0)fail('Component upgrade must increase version');
  if(!isObject(decisions))fail('Invalid decisions');
  // Repeat schemas require a dedicated data migration: never silently drop owner's items.
  if(JSON.stringify(old.repeat)!==JSON.stringify(fresh.repeat))
    fail('Repeater schema changes need explicit item migration');
  const beforeRegistry=registry([...allOtherManifests,old]),afterRegistry=registry([...allOtherManifests,fresh]);
  const doc=validateSite(raw,beforeRegistry),candidate=clone(doc),conflicts=[],diff=[];
  const oldSlots=new Map(old.elements.map(s=>[s.slot,s]));
  const newSlots=new Map(fresh.elements.map(s=>[s.slot,s]));
  const encountered=new Set(),usedDecisions=new Set();
  const need=(where,reason,oldValue)=>{
    encountered.add(where);
    if(decisions[where]==='discard'){usedDecisions.add(where);return true;}
    conflicts.push({key:where,reason,current:clone(oldValue)});return false;
  };
  for(const page of candidate.pages)for(const section of page.sections){
    if(section.component!==old.id)continue;
    const newElements=[];
    for(const def of fresh.elements){
      const previousElement=section.elements.find(e=>e.slot===def.slot),before=oldSlots.get(def.slot);
      if(!previousElement){
        newElements.push({id:section.id+'-'+def.slot,slot:def.slot,
          values:Object.fromEntries(def.fields.map(f=>[f.path,clone(f.default)]))});
        diff.push({sectionId:section.id,slot:def.slot,operation:'added-element'});continue;
      }
      const prevFields=fieldMap(before),nextFields=fieldMap(def),values={};
      for(const f of def.fields){
        const prev=prevFields.get(f.path);
        if(!prev){values[f.path]=clone(f.default);diff.push({sectionId:section.id,slot:def.slot,path:f.path,operation:'added-field'});continue;}
        const value=previousElement.values[f.path];
        let compatible=prev.type===f.type&&prev.responsive===f.responsive;
        if(compatible){try{validateValue(f,value,'upgrade');}catch{compatible=false;}}
        if(compatible){values[f.path]=clone(JSON.stringify(value)===JSON.stringify(prev.default)?f.default:value);continue;}
        const where=page.id+'/'+section.id+'/'+def.slot+'/'+f.path;
        if(JSON.stringify(value)!==JSON.stringify(prev.default)&&!need(where,'changed-type-or-constraint',value))
          values[f.path]=clone(f.default);
        else values[f.path]=clone(f.default);
        diff.push({sectionId:section.id,slot:def.slot,path:f.path,operation:'reset-incompatible'});
      }
      for(const f of before.fields)if(!nextFields.has(f.path)){
        const value=previousElement.values[f.path],where=page.id+'/'+section.id+'/'+def.slot+'/'+f.path;
        if(JSON.stringify(value)!==JSON.stringify(f.default))need(where,'removed-manually-edited-field',value);
        diff.push({sectionId:section.id,slot:def.slot,path:f.path,operation:'removed-field'});
      }
      newElements.push({id:previousElement.id,slot:def.slot,values});
    }
    for(const oldEl of section.elements)if(!newSlots.has(oldEl.slot)){
      const oldDef=oldSlots.get(oldEl.slot);
      const manual=oldDef.fields.some(f=>JSON.stringify(oldEl.values[f.path])!==JSON.stringify(f.default));
      if(manual)need(page.id+'/'+section.id+'/'+oldEl.slot,'removed-manually-edited-element',oldEl.values);
      diff.push({sectionId:section.id,slot:oldEl.slot,operation:'removed-element'});
    }
    section.elements=newElements;section.manifestVersion=fresh.version;
  }
  for(const k of Object.keys(decisions))if(!usedDecisions.has(k))fail('Unknown or unnecessary override decision',k);
  if(conflicts.length)return {accepted:false,conflicts,diff,candidate:null};
  return {accepted:true,conflicts:[],diff,candidate:validateSite(candidate,afterRegistry)};
}
module.exports=Object.freeze({DEFAULT_THEME,
  FORMAT,MANIFEST,BREAKPOINTS,validateManifest,registry,validateSite,
  controls,effectiveValue,sectionFrom,siteFromBrief,upgrade
});
