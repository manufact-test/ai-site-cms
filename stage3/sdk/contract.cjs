'use strict';
// Stage 3 isolated, offline contract SDK. No provider, network, host, CMS write,
// unsafe HTML execution, or hidden publication. Reference implementation v1.
const GRAPH_HOST=require('./design-graph.cjs');
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

const DEFAULT_THEME=Object.freeze({background:'#f7f9fc',surface:'#ffffff',text:'#172a43',primary:'#0a5bff',font:'system',maxWidth:1140,bodySize:16,lineHeight:'normal',headingScale:'normal',buttonStyle:'solid',buttonRadius:9,buttonText:'#ffffff'});
function validTheme(t){
  objectKeys(t,['background','surface','text','primary','font','maxWidth','bodySize','lineHeight','headingScale','buttonStyle','buttonRadius','buttonText'],'theme');
  for(const k of ['background','surface','text','primary'])
    if(typeof t[k]!=='string'||!/^#[0-9a-fA-F]{6}$/.test(t[k]))fail('Invalid theme color',k);
  if(!['system','arial','georgia'].includes(t.font)||!Number.isInteger(t.maxWidth)||t.maxWidth<680||t.maxWidth>1600)fail('Invalid theme font or width');
  if(own(t,'bodySize')&&(!Number.isInteger(t.bodySize)||t.bodySize<14||t.bodySize>22))fail('Invalid global body size');
  if(own(t,'lineHeight')&&!['compact','normal','relaxed'].includes(t.lineHeight))fail('Invalid global line height');
  if(own(t,'headingScale')&&!['compact','normal','large'].includes(t.headingScale))fail('Invalid global heading scale');
  if(own(t,'buttonStyle')&&!['solid','outline','pill'].includes(t.buttonStyle))fail('Invalid global button style');
  if(own(t,'buttonRadius')&&(!Number.isInteger(t.buttonRadius)||t.buttonRadius<0||t.buttonRadius>32))fail('Invalid global button radius');
  if(own(t,'buttonText')&&(typeof t.buttonText!=='string'||!/^#[0-9a-fA-F]{6}$/.test(t.buttonText)))fail('Invalid global button text color');
}
function validSeo(s,assetMimes){
  objectKeys(s,['title','description','robots','ogTitle','ogDescription','ogImage'],'seo');
  if(typeof s.title!=='string'||s.title.length>160||/[\x00-\x1f]/.test(s.title)||
    typeof s.description!=='string'||s.description.length>300||/[\x00-\x1f]/.test(s.description)||
    !['index','noindex'].includes(s.robots))fail('Invalid SEO metadata');
  for(const [key,max] of [['ogTitle',160],['ogDescription',300]]){
    if(own(s,key)&&(typeof s[key]!=='string'||s[key].length>max||/[\x00-\x1f]/.test(s[key])))
      fail('Invalid social metadata',key);
  }
  if(own(s,'ogImage')&&(typeof s.ogImage!=='string'||
    (s.ogImage!==''&&(!elementId.test(s.ogImage)||
      !['image/png','image/jpeg','image/webp'].includes(assetMimes.get(s.ogImage))))))
    fail('Invalid SEO social image');
}
function validNav(n){
  objectKeys(n,['label','hidden','parentId'],'navigation');
  if(typeof n.label!=='string'||n.label.length>100||/[\x00-\x1f]/.test(n.label)||typeof n.hidden!=='boolean'||
    (own(n,'parentId')&&(typeof n.parentId!=='string'||!elementId.test(n.parentId))))fail('Invalid page navigation');
}
const DEFAULT_MENU=Object.freeze({style:'default',sticky:false,mobile:'collapsible',ctaPageId:'',ctaLabel:''});
function validMenu(m){
  objectKeys(m,['style','sticky','mobile','ctaPageId','ctaLabel'],'site.menu');
  if(!['default','quiet','bold'].includes(m.style)||typeof m.sticky!=='boolean'||
    !['collapsible','expanded'].includes(m.mobile)||typeof m.ctaPageId!=='string'||
    (m.ctaPageId!==''&&!elementId.test(m.ctaPageId))||typeof m.ctaLabel!=='string'||
    m.ctaLabel.length>64||/[\x00-\x1f]/.test(m.ctaLabel)||
    (m.ctaPageId!==''&&!m.ctaLabel.trim())||(m.ctaPageId===''&&m.ctaLabel!==''))
    fail('Invalid site menu settings');
}
function validMenuRelations(raw){
  const pages=new Map(raw.pages.map(page=>[page.id,page]));
  for(const page of raw.pages){
    const parentId=page.navigation?.parentId;
    if(!parentId)continue;
    const parent=pages.get(parentId);
    if(!parent||parent===page||page.path==='/'||parent.navigation?.hidden||
      parent.navigation?.parentId)fail('Menu parent missing, hidden or nested',page.id);
  }
  if(raw.menu?.ctaPageId&&!pages.has(raw.menu.ctaPageId))fail('Menu CTA destination missing');
}
const DEFAULT_APPEARANCE=Object.freeze({surface:'default',spacing:'normal',align:'left',width:'default',heading:'default',corners:'default',mobileAlign:'inherit',mobileSpacing:'inherit',button:'default'});
const EXTRA_APPEARANCE=Object.freeze({"width":["default","narrow","wide"],"heading":["default","compact","expressive"],"corners":["default","soft","round"],"mobileAlign":["inherit","left","center"],"mobileSpacing":["inherit","tight","normal","airy"],"button":["default","solid","outline","pill"]});
function validAppearance(a){
  objectKeys(a,['surface','spacing','align',...Object.keys(EXTRA_APPEARANCE)],'appearance');
  if(!['default','paper','tint','dark'].includes(a.surface)||
     !['tight','normal','airy'].includes(a.spacing)||
     !['left','center'].includes(a.align))fail('Invalid section appearance');
  for(const [name,allowed] of Object.entries(EXTRA_APPEARANCE))
    if(own(a,name)&&!allowed.includes(a[name]))fail('Invalid section appearance',name);
}
// Additive v1 field-builder contract: older forms keep their original 3 slots.
const FORM_KINDS=['text','tel','email','select','textarea','radio','checkbox','number','date','url'];
function validateFormFields(section){
  if(!own(section,'formFields'))return;
  if(section.component!=='lead-form-flex'||!Array.isArray(section.formFields)||section.formFields.length>9)
    fail('Form field builder is only supported on flexible forms',section.id);
  const available=new Map();
  for(let i=0;i<3;i++){
    const slot=['extra-one','extra-two','extra-three'][i];
    const values=section.elements.find(e=>e.slot===slot)?.values;
    if(values?.['behavior.kind']==='select'&&typeof values['content.options']==='string'){
      const options=values['content.options'].split(/\r?\n/).map(s=>s.trim());
      if(options.length>=2&&options.length<=12&&options.every(Boolean)&&new Set(options).size===options.length)
        available.set('extra'+(i+1),options);
    }
  }
  const seen=new Set();
  for(const f of section.formFields){
    objectKeys(f,['id','label','kind','required','options','placeholder','when'],'formField');
    if(typeof f.id!=='string'||!/^field-[a-z][a-z0-9-]{2,49}$/.test(f.id)||seen.has(f.id))
      fail('Invalid or duplicate form field ID',section.id);
    seen.add(f.id);
    if(typeof f.label!=='string'||!f.label.trim()||f.label.length>100||/[\x00-\x1f]/.test(f.label)||
      !FORM_KINDS.includes(f.kind)||typeof f.required!=='boolean'||
      typeof f.placeholder!=='string'||f.placeholder.length>120||/[\x00-\x1f]/.test(f.placeholder)||
      !Array.isArray(f.options))fail('Invalid additional form field',f.id);
    if(['select','radio'].includes(f.kind)){
      if(f.options.length<2||f.options.length>12||new Set(f.options).size!==f.options.length||
        f.options.some(v=>typeof v!=='string'||!v.trim()||v.length>80||/[\x00-\x1f]/.test(v)))
        fail('Invalid choice options',f.id);
    }else if(f.options.length)fail('Options only permitted on choice fields',f.id);
    if(own(f,'when')){
      objectKeys(f.when,['field','option'],'form condition');
      const prior=available.get(f.when.field);
      if(!prior||!Number.isInteger(f.when.option)||f.when.option<1||f.when.option>prior.length)
        fail('Conditional field must follow an existing select option',f.id);
    }
    if(f.kind==='select')available.set(f.id,f.options);
  }
}
function validateSite(raw,regInput){
  const reg=regInput instanceof Map?regInput:registry(regInput);
  objectKeys(raw,['format','siteId','title','schemaVersion','assets','pages','theme','redirects','menu','designTokens','language'],'site');
  GRAPH_HOST.validateTokens(raw.designTokens);
  if(own(raw,'menu'))validMenu(raw.menu);
  if(own(raw,'theme'))validTheme(raw.theme);
  if(own(raw,'language')&&!['ru','en','pl','de','be','uk'].includes(raw.language))fail('Invalid site language');
  if(raw.format!==FORMAT||raw.schemaVersion!==1)fail('Unsupported site format');
  id(raw.siteId,'siteId');text(raw.title,'site title',130);
  if(!Array.isArray(raw.assets)||raw.assets.length>300)fail('Invalid assets');
  const assetIds=new Set(),assetMimes=new Map(),imageIds=new Set();
  for(const asset of raw.assets){
    objectKeys(asset,['id','src','alt','mime','variants','width','height'],'asset');id(asset.id,'asset.id');
    if(assetIds.has(asset.id)||!['image/png','image/webp','image/jpeg','image/svg+xml','video/mp4'].includes(asset.mime)||
      typeof asset.src!=='string'||!/^\/assets\/[a-zA-Z0-9/_-]+\.(png|webp|jpg|jpeg|svg|mp4)$/.test(asset.src)||
      typeof asset.alt!=='string'||asset.alt.length>200||/[\x00-\x1f]/.test(asset.alt))fail('Invalid asset',asset.id);
    const hasWidth=own(asset,'width'),hasHeight=own(asset,'height');
    if(hasWidth!==hasHeight||(hasWidth&&(!['image/png','image/jpeg','image/webp'].includes(asset.mime)||
      !Number.isInteger(asset.width)||asset.width<1||asset.width>4096||
      !Number.isInteger(asset.height)||asset.height<1||asset.height>4096)))
      fail('Invalid intrinsic image dimensions',asset.id);
    assetIds.add(asset.id);assetMimes.set(asset.id,asset.mime);
    if(asset.mime!=='video/mp4')imageIds.add(asset.id);
    if(asset.mime==='video/mp4'&&asset.src!=='/assets/'+asset.id+'.mp4')fail('Invalid video path',asset.id);
    if(asset.variants!==undefined){
      if(!Array.isArray(asset.variants)||asset.variants.length>3)fail('Invalid responsive variants',asset.id);
      const widths=new Set(),ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[asset.mime];
      if(!ext)fail('Responsive variants require raster images',asset.id);
      for(const v of asset.variants){
        objectKeys(v,['id','src','sha256','width','height'],'variant');id(v.id,'variant id');
        if(assetIds.has(v.id)||!([360,720,1200].includes(v.width))||widths.has(v.width)||
          !Number.isInteger(v.height)||v.height<1||v.height>4096||
          typeof v.sha256!=='string'||!(/^[a-f0-9]{64}$/.test(v.sha256))||
          v.src!=='/assets/'+v.id+'.'+ext)fail('Invalid responsive variant',asset.id);
        widths.add(v.width);assetIds.add(v.id);
      }
    }
  }
  if(!Array.isArray(raw.pages)||raw.pages.length<1||raw.pages.length>100)fail('Invalid page count');
  const ids=new Set([raw.siteId,...assetIds]),paths=new Set();
  for(const page of raw.pages){
    objectKeys(page,['id','path','title','sections','seo','navigation'],'page');
    if(own(page,'seo'))validSeo(page.seo,assetMimes);
    if(own(page,'navigation'))validNav(page.navigation);
    id(page.id,'page.id');text(page.title,'page.title',160);
    if(typeof page.path!=='string'||!/^\/(?:[a-z0-9-]+\/)*$/.test(page.path)||paths.has(page.path))fail('Invalid page path',page.id);
    paths.add(page.path);
    if(ids.has(page.id))fail('Duplicate stable ID',page.id);ids.add(page.id);
    if(!Array.isArray(page.sections)||page.sections.length<1||page.sections.length>100)fail('Invalid sections',page.id);
    for(const section of page.sections){
      objectKeys(section,['id','component','manifestVersion','elements','items','appearance','formFields','designGraph'],'section');
      if(own(section,'appearance'))validAppearance(section.appearance);
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
        for(const [p,f] of definitions)validateValue(f,el.values[p],section.id+'/'+slot.slot+'/'+p,imageIds);
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
            validateValue(field,item.values[path],item.id+'/'+path,imageIds);
        }
      }else if(own(section,'items'))fail('Unregistered repeat items',section.id);
      validateFormFields(section);
      if(own(section,'designGraph'))GRAPH_HOST.validateGraph(section.designGraph,assetIds,ids,raw.designTokens,assetMimes);
    }
  }
  validMenuRelations(raw);
  if(own(raw,'redirects')){
    if(!Array.isArray(raw.redirects)||raw.redirects.length>60)fail('Invalid redirect count');
    const aliases=new Set();
    for(const r of raw.redirects){
      objectKeys(r,['from','to'],'redirect');
      if(typeof r.from!=='string'||typeof r.to!=='string'||
        !/^\/(?:[a-z0-9-]+\/)*$/.test(r.from)||!/^\/(?:[a-z0-9-]+\/)*$/.test(r.to)||
        r.from==='/'||r.from===r.to||paths.has(r.from)||aliases.has(r.from)||!paths.has(r.to))
        fail('Invalid redirect alias or destination');
      aliases.add(r.from);
    }
  }
  return clone(raw);
}
function inspectSite(raw,regInput){
  const site=validateSite(raw,regInput),known=new Set(site.pages.map(p=>p.path));
  const redirected=new Map((site.redirects||[]).map(r=>[r.from,r.to]));
  const warnings=[],errors=[],add=(kind,page,path,message)=>({kind,pageId:page?.id||null,path,message});
  if(!known.has('/'))errors.push(add('missing-home',null,'/','Нет главной страницы'));
  for(const page of site.pages){
    const seo=page.seo||{};
    if(!seo.title)warnings.push(add('seo-title',page,page.path,'SEO title берётся из названия страницы'));
    if(!seo.description)warnings.push(add('seo-description',page,page.path,'Не заполнено описание для поисковиков'));
    for(const section of page.sections)for(const el of [...section.elements,...(section.items||[])]){
      const href=el.values['behavior.href'];
      if(typeof href!=='string'||!href.startsWith('/')||href.startsWith('//'))continue;
      const route=href.split(/[?#]/,1)[0]||page.path;
      const hash=href.includes('#')?href.slice(href.indexOf('#')+1).split('?')[0]:'';
      if(!known.has(route)&&!redirected.has(route))
        errors.push(add('broken-link',page,href,'Внутренняя ссылка ведёт на отсутствующую страницу'));
      else if(redirected.has(route))
        warnings.push(add('old-link',page,href,'Ссылка ведёт через перенаправление '+redirected.get(route)));
      else if(hash&&!site.pages.find(p=>p.path===route).sections.some(s=>s.id===hash))
        errors.push(add('broken-anchor',page,href,'Якорь секции не существует'));
    }
  }
  return {errors,warnings,pages:site.pages.length,redirects:redirected.size,
    indexable:site.pages.filter(p=>p.seo?.robots!=='noindex').length};
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
module.exports=Object.freeze({DEFAULT_MENU,DEFAULT_THEME,
  FORMAT,MANIFEST,BREAKPOINTS,DEFAULT_APPEARANCE,validateManifest,registry,validateSite,inspectSite,
  controls,effectiveValue,sectionFrom,siteFromBrief,upgrade
});
