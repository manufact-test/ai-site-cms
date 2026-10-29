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
  objectKeys(t,['background','surface','text','primary','font','maxWidth','bodySize','lineHeight','headingScale','buttonStyle','buttonRadius','buttonText','fontFiles'],'theme');
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
function validFontFiles(theme,assetMimes){
  if(!own(theme,'fontFiles'))return;
  const faces=theme.fontFiles;
  objectKeys(faces,['body','heading'],'theme.fontFiles');
  if(!Object.keys(faces).length)fail('At least one local font required');
  for(const [role,assetId] of Object.entries(faces))
    if(typeof assetId!=='string'||assetMimes.get(assetId)!=='font/woff2')
      fail('Local font must reference a site-owned WOFF2 asset',role);
}
function validBranding(branding,assetMimes){
  objectKeys(branding,['logoAssetId','mobileLogoAssetId','faviconAssetId','logoWidth'],'branding');
  const image=['image/png','image/jpeg','image/webp'];
  for(const key of ['logoAssetId','mobileLogoAssetId','faviconAssetId']){
    if(!own(branding,key))continue;
    const asset=branding[key];
    if(typeof asset!=='string'||(asset!==''&&!image.includes(assetMimes.get(asset))))
      fail('Brand asset must reference an existing site-owned raster image',key);
    if(key==='faviconAssetId'&&asset!==''&&assetMimes.get(asset)!=='image/png')
      fail('Browser favicon must use a PNG image',key);
  }
  if(branding.mobileLogoAssetId&&!branding.logoAssetId)
    fail('Mobile logo requires a desktop logo');
  if(own(branding,'logoWidth')&&(!Number.isInteger(branding.logoWidth)||
    branding.logoWidth<48||branding.logoWidth>320))fail('Logo width must be 48–320 px');
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
function validHeader(h,pages){
  objectKeys(h,['notice','noticePageId','email','phone','tone','mobile'],'site.header');
  const plain=(v,max)=>typeof v==='string'&&v.length<=max&&!/[\x00-\x1f]/.test(v);
  if(!plain(h.notice,180)||!plain(h.email,254)||!plain(h.phone,32)||
    !['light','dark','primary'].includes(h.tone)||!['show','hide'].includes(h.mobile)||
    typeof h.noticePageId!=='string'||
    (h.noticePageId!==''&&(!h.notice.trim()||!pages.some(p=>p.id===h.noticePageId))))
    fail('Invalid site header fields');
  if(h.email&&!/^[a-zA-Z0-9.!#$%&'*+\/=?^_\x60{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/.test(h.email))
    fail('Invalid header email');
  if(h.phone&&(!/^\+?[0-9 ()-]{6,32}$/.test(h.phone)||h.phone.replace(/\D/g,'').length<6))
    fail('Invalid header phone');
}
const FOOTER_DOMAINS=Object.freeze({
  instagram:['instagram.com'],facebook:['facebook.com','fb.com'],
  linkedin:['linkedin.com'],youtube:['youtube.com','youtu.be'],
  telegram:['t.me'],whatsapp:['wa.me','whatsapp.com'],
  tiktok:['tiktok.com'],x:['x.com','twitter.com'],github:['github.com']
});
function validFooter(footer,pages){
  objectKeys(footer,['description','email','phone','links','socials','style','layout'],'site.footer');
  if(own(footer,'style')&&!['light','dark','primary'].includes(footer.style))
    fail('Invalid footer color style');
  if(own(footer,'layout')&&!['columns','stacked'].includes(footer.layout))
    fail('Invalid footer layout');
  const plain=(v,max)=>typeof v==='string'&&v.length<=max&&!/[\x00-\x1f]/.test(v);
  if(!plain(footer.description,300)||!plain(footer.email,254)||!plain(footer.phone,32))
    fail('Invalid footer description or contacts');
  if(footer.email&&!/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/.test(footer.email))
    fail('Invalid footer email');
  if(footer.phone&&(!/^\+?[0-9 ()-]{6,32}$/.test(footer.phone)||
    footer.phone.replace(/\D/g,'').length<6))fail('Invalid footer phone');
  if(!Array.isArray(footer.links)||footer.links.length>8||
    !Array.isArray(footer.socials)||footer.socials.length>8)fail('Too many footer links');
  const pageIds=new Set(pages.map(page=>page.id)),seenPages=new Set(),seenNetworks=new Set();
  for(const link of footer.links){
    objectKeys(link,['label','pageId'],'footer.link');
    if(!plain(link.label,70)||!link.label.trim()||typeof link.pageId!=='string'||
      !pageIds.has(link.pageId)||seenPages.has(link.pageId))fail('Unknown or duplicated footer page');
    seenPages.add(link.pageId);
  }
  for(const social of footer.socials){
    objectKeys(social,['network','url'],'footer.social');
    if(typeof social.network!=='string'||!FOOTER_DOMAINS[social.network]||
      typeof social.url!=='string'||social.url.length>300||
      seenNetworks.has(social.network)||/[\x00-\x20<>"']/.test(social.url))
      fail('Invalid footer social URL');
    let url;try{url=new URL(social.url);}catch(_){fail('Invalid footer HTTPS address');}
    const host=url.hostname.toLowerCase();
    if(url.protocol!=='https:'||url.username||url.password||url.port||
      !FOOTER_DOMAINS[social.network].some(d=>host===d||host==='www.'+d))
      fail('Footer social URL must match its declared HTTPS domain');
    seenNetworks.add(social.network);
  }
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
// Versioned, optional step layout for the existing flexible form. All fields
// are still collected and validated once against the immutable release.
function validateFormSteps(section){
  if(!own(section,'formSteps'))return;
  if(section.component!=='lead-form-flex')fail('Steps require flexible form',section.id);
  const steps=section.formSteps;
  if(!Array.isArray(steps)||steps.length<2||steps.length>4)fail('Form requires 2–4 steps',section.id);
  const available=new Set(['name','email','message']),dependencies=[];
  for(const [i,slot] of ['extra-one','extra-two','extra-three'].entries()){
    const kind=section.elements.find(e=>e.slot===slot)?.values?.['behavior.kind'];
    if(kind!=='off')available.add('extra'+(i+1));
  }
  for(const field of section.formFields||[]){
    available.add(field.id);
    if(field.when)dependencies.push([field.id,field.when.field]);
  }
  const used=new Set(),positions=new Map();
  steps.forEach((step,index)=>{
    objectKeys(step,['title','fields'],'form step');
    if(typeof step.title!=='string'||!step.title.trim()||step.title.length>60||
      /[\x00-\x1f]/.test(step.title)||!Array.isArray(step.fields)||
      step.fields.length<1||step.fields.length>15)fail('Invalid form step',section.id);
    for(const name of step.fields){
      if(typeof name!=='string'||!available.has(name)||used.has(name))
        fail('Missing, duplicate or unknown form step field',section.id);
      used.add(name);positions.set(name,index);
    }
  });
  if(used.size!==available.size)fail('Form steps must include all fields exactly once',section.id);
  for(const [name,source] of dependencies)
    if(positions.get(source)>positions.get(name))
      fail('Conditional field must not precede source step',section.id);
}
// Shared section instances retain their own stable IDs, while content is
// identical on all pages. Strip per-instance IDs before comparing content.
function sharedSectionShape(section){
  const model=clone(section);delete model.id;delete model.sharedKey;
  for(const element of model.elements)delete element.id;
  for(const item of model.items||[])delete item.id;
  if(model.designGraph){
    const ids=new Map();let counter=0;
    const index=nodes=>{for(const node of nodes){ids.set(node.id,'shared-node-'+(++counter));if(node.children)index(node.children);}};
    index(model.designGraph.nodes);
    model.designGraph.id='shared-design';
    const normalize=nodes=>{for(const node of nodes){
      if(own(node,'popupTarget'))node.popupTarget=ids.get(node.popupTarget)||'missing-target';
      node.id=ids.get(node.id);if(node.children)normalize(node.children);
    }};
    normalize(model.designGraph.nodes);
  }
  return model;
}
function validateSharedSections(groups){
  for(const [name,members] of groups){
    if(members.length>20)fail('Too many instances of a shared section',name);
    const pages=new Set(),reference=JSON.stringify(sharedSectionShape(members[0].section));
    for(const member of members){
      if(pages.has(member.pageId))fail('Shared section repeated on the same page',name);
      pages.add(member.pageId);
      if(JSON.stringify(sharedSectionShape(member.section))!==reference)
        fail('Shared section copies have diverged; synchronize before Save or Publish',name);
    }
  }
}
function validateSite(raw,regInput){
  const reg=regInput instanceof Map?regInput:registry(regInput);
  objectKeys(raw,['format','siteId','title','schemaVersion','assets','pages','theme','redirects','menu','designTokens','language','branding','footer','header'],'site');
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
    if(assetIds.has(asset.id)||!['image/png','image/webp','image/jpeg','image/svg+xml','video/mp4','font/woff2'].includes(asset.mime)||
      typeof asset.src!=='string'||!/^\/assets\/[a-zA-Z0-9/_-]+\.(png|webp|jpg|jpeg|svg|mp4|woff2)$/.test(asset.src)||
      typeof asset.alt!=='string'||asset.alt.length>200||/[\x00-\x1f]/.test(asset.alt))fail('Invalid asset',asset.id);
    const hasWidth=own(asset,'width'),hasHeight=own(asset,'height');
    if(hasWidth!==hasHeight||(hasWidth&&(!['image/png','image/jpeg','image/webp'].includes(asset.mime)||
      !Number.isInteger(asset.width)||asset.width<1||asset.width>4096||
      !Number.isInteger(asset.height)||asset.height<1||asset.height>4096)))
      fail('Invalid intrinsic image dimensions',asset.id);
    assetIds.add(asset.id);assetMimes.set(asset.id,asset.mime);
    if(asset.mime.startsWith('image/'))imageIds.add(asset.id);
    if(asset.mime==='video/mp4'&&asset.src!=='/assets/'+asset.id+'.mp4')fail('Invalid video path',asset.id);
    if(asset.mime==='font/woff2'&&asset.src!=='/assets/'+asset.id+'.woff2')fail('Invalid WOFF2 font path',asset.id);
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
  if(own(raw,'theme'))validFontFiles(raw.theme,assetMimes);
  if(own(raw,'branding'))validBranding(raw.branding,assetMimes);
  if(own(raw,'footer'))validFooter(raw.footer,raw.pages);
  if(own(raw,'header'))validHeader(raw.header,raw.pages);
  if(!Array.isArray(raw.pages)||raw.pages.length<1||raw.pages.length>100)fail('Invalid page count');
  const ids=new Set([raw.siteId,...assetIds]),paths=new Set(),sharedGroups=new Map();
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
      objectKeys(section,['id','component','manifestVersion','elements','items','appearance','formFields','formSteps','designGraph','sharedKey'],'section');
      if(own(section,'sharedKey')){
        id(section.sharedKey,'shared section group');
        if(!sharedGroups.has(section.sharedKey))sharedGroups.set(section.sharedKey,[]);
        sharedGroups.get(section.sharedKey).push({pageId:page.id,section});
      }
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
      validateFormSteps(section);
      if(section.component==='custom-section'&&!own(section,'designGraph'))fail('Custom section requires a Design Graph',section.id);
      if(own(section,'designGraph'))GRAPH_HOST.validateGraph(section.designGraph,assetIds,ids,raw.designTokens,assetMimes);
    }
  }
  validateSharedSections(sharedGroups);
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
  const reg=regInput instanceof Map?regInput:registry(regInput);
  const site=validateSite(raw,reg),known=new Set(site.pages.map(p=>p.path));
  const pageByPath=new Map(site.pages.map(page=>[page.path,page]));
  const redirected=new Map((site.redirects||[]).map(r=>[r.from,r.to]));
  const warnings=[],errors=[];
  const add=(kind,page,path,message,extra={})=>({kind,pageId:page?.id||null,path,message,...extra});
  const normalize=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  const charCount=value=>Array.from(String(value||'')).length;
  const genericAlt=/^(?:image|photo|picture|graphic|video|фото|изображение|картинка|рисунок|видео)(?:\s+\d+)?$/i;
  const titleGroups=new Map(),descriptionGroups=new Map();
  const imageUses=new Set();
  let indexable=0;
  const pushHeading=(page,section,headings,level,label,nodeId=null)=>{
    const value=typeof label==='string'?label.trim():'';
    headings.push({level,label:value,sectionId:section.id,nodeId});
    if(!value)warnings.push(add('empty-heading',page,'#'+section.id+(nodeId?'/'+nodeId:''),'Заголовок пустой — добавьте понятный текст.',{sectionId:section.id,nodeId}));
  };
  const checkLink=(href,page,sectionId,elementId,nodeId=null)=>{
    if(typeof href!=='string'||!href.startsWith('/')||href.startsWith('//'))return;
    const hashAt=href.indexOf('#');
    const routePart=hashAt>=0?href.slice(0,hashAt):href;
    const route=routePart.split('?',1)[0]||page.path;
    const hash=hashAt>=0?href.slice(hashAt+1).split('?',1)[0]:'';
    const extra={sectionId,elementId,nodeId};
    if(!known.has(route)&&!redirected.has(route))
      errors.push(add('broken-link',page,href,'Внутренняя ссылка ведёт на отсутствующую страницу.',extra));
    else if(redirected.has(route))
      warnings.push(add('old-link',page,href,'Ссылка ведёт через перенаправление '+redirected.get(route)+'.',extra));
    else if(hash&&!pageByPath.get(route).sections.some(section=>section.id===hash))
      errors.push(add('broken-anchor',page,href,'Якорь секции не существует.',extra));
  };
  const checkMedia=(assetId,page,section,elementId)=>{
    if(typeof assetId!=='string'||!assetId)return;
    const asset=site.assets.find(item=>item.id===assetId);
    if(!asset||!asset.mime.startsWith('image/'))return;
    const key=page.id+'|'+section.id+'|'+assetId;
    if(imageUses.has(key))return;
    imageUses.add(key);
    const alt=asset.alt.trim();
    // Partner logos already use the visible partner caption as an ALT fallback.
    if(!alt&&section.component==='partner-logos')return;
    const extra={sectionId:section.id,elementId,assetId};
    if(!alt)warnings.push(add('missing-alt',page,'/assets/'+assetId,
      'У изображения пустой alt. Если оно несёт смысл, добавьте описание; если декоративное — проверьте намеренно пустой alt.',extra));
    else if(genericAlt.test(alt))warnings.push(add('generic-alt',page,'/assets/'+assetId,
      'Описание изображения слишком общее. Укажите, что именно показано.',extra));
  };
  if(!known.has('/'))errors.push(add('missing-home',null,'/','Нет главной страницы'));
  for(const page of site.pages){
    const seo=page.seo||{};
    const explicitTitle=typeof seo.title==='string'?seo.title.trim():'';
    const effectiveTitle=explicitTitle||page.title+' | '+site.title;
    const normalizedTitle=normalize(effectiveTitle);
    if(!explicitTitle)warnings.push(add('seo-title',page,page.path,'SEO title не задан явно — используется название страницы и сайта.'));
    const titleLength=charCount(effectiveTitle);
    if(titleLength<30)warnings.push(add('seo-title-short',page,page.path,'SEO title короткий ('+titleLength+' символов); ориентир — 30–60.'));
    if(titleLength>60)warnings.push(add('seo-title-long',page,page.path,'SEO title длинный ('+titleLength+' символов); ориентир — 30–60.'));
    if(normalizedTitle){if(!titleGroups.has(normalizedTitle))titleGroups.set(normalizedTitle,[]);titleGroups.get(normalizedTitle).push({page,value:effectiveTitle});}
    const description=typeof seo.description==='string'?seo.description.trim():'';
    if(!description)warnings.push(add('seo-description',page,page.path,'Не заполнено описание для поисковиков.'));
    else{
      const length=charCount(description);
      if(length<70)warnings.push(add('seo-description-short',page,page.path,'Описание короткое ('+length+' символов); ориентир — 70–160.'));
      if(length>160)warnings.push(add('seo-description-long',page,page.path,'Описание длинное ('+length+' символов); ориентир — 70–160.'));
      const normalizedDescription=normalize(description);
      if(!descriptionGroups.has(normalizedDescription))descriptionGroups.set(normalizedDescription,[]);
      descriptionGroups.get(normalizedDescription).push({page,value:description});
    }
    if(seo.robots!=='noindex')indexable++;
    const headings=[];
    for(const section of page.sections){
      if(section.designGraph){
        for(const finding of GRAPH_HOST.auditAccessibility(section.designGraph,site.designTokens||GRAPH_HOST.DEFAULT_TOKENS)){
          // Heading structure is checked once across the complete rendered page below.
          if(finding.code==='heading-order'||finding.code==='multiple-h1')continue;
          const extra={sectionId:section.id,nodeId:finding.nodeId};
          const issue=add(finding.code,page,'#'+section.id+(finding.nodeId?'/'+finding.nodeId:''),finding.message,extra);
          (finding.severity==='error'?errors:warnings).push(issue);
        }
        const walk=nodes=>{
          for(const node of nodes||[]){
            if(node.type==='heading')pushHeading(page,section,headings,Number(node.level)||2,node.text,node.id);
            if(['button','link','image'].includes(node.type)&&node.href)checkLink(node.href,page,section.id,null,node.id);
            if(node.children)walk(node.children);
          }
        };
        walk(section.designGraph.nodes);
        continue;
      }
      const manifest=select(reg,section.component,section.manifestVersion);
      if(section.component!=='comparison-matrix'){
        const level=section.component==='company-hero'?1:2;
        const heading=section.elements.find(el=>el.slot==='heading');
        pushHeading(page,section,headings,level,heading?.values?.['content.text']||'',heading?.id||null);
      }
      const repeatHeadingPath={
        'service-grid':'content.title','pricing-plans':'content.title',
        'process-timeline':'content.title','content-switcher':'content.heading'
      }[section.component];
      for(const el of section.elements){
        checkLink(el.values['behavior.href'],page,section.id,el.id);
        const slot=manifest.elements.find(item=>item.slot===el.slot);
        if(slot)for(const field of slot.fields)if(field.type==='media')checkMedia(el.values[field.path],page,section,el.id);
      }
      for(const item of section.items||[]){
        checkLink(item.values['behavior.href'],page,section.id,item.id);
        if(repeatHeadingPath)pushHeading(page,section,headings,3,item.values[repeatHeadingPath],item.id);
        if(manifest.repeat)for(const field of manifest.repeat.fields)if(field.type==='media')checkMedia(item.values[field.path],page,section,item.id);
      }
    }
    const h1s=headings.filter(item=>item.level===1);
    if(!h1s.length)warnings.push(add('missing-h1',page,page.path,'На странице нет заголовка H1.'));
    if(h1s.length>1)warnings.push(add('multiple-h1',page,page.path,'На странице '+h1s.length+' заголовка H1; оставьте один основной.'));
    if(headings.length&&headings[0].level!==1&&h1s.length)
      warnings.push(add('h1-position',page,page.path,'H1 расположен не первым в иерархии заголовков.'));
    for(let i=1;i<headings.length;i++){
      const previous=headings[i-1],current=headings[i];
      if(current.level>previous.level+1)
        warnings.push(add('heading-order',page,'#'+current.sectionId+(current.nodeId?'/'+current.nodeId:''),'Уровень заголовка перескакивает с H'+previous.level+' на H'+current.level+'.',{sectionId:current.sectionId,nodeId:current.nodeId}));
    }
  }
  const duplicates=(groups,kind,label)=>{
    for(const group of groups.values())if(group.length>1){
      for(const item of group){
        const others=group.filter(other=>other.page.id!==item.page.id).map(other=>other.page.path);
        warnings.push(add(kind,item.page,item.page.path,label+' совпадает с: '+others.join(', ')+'.'));
      }
    }
  };
  duplicates(titleGroups,'duplicate-seo-title','SEO title');
  duplicates(descriptionGroups,'duplicate-seo-description','SEO description');
  if(site.pages.length&&indexable===0)
    warnings.push(add('site-noindex',null,'/','Все страницы закрыты от индексации. Проверьте, что это сделано намеренно.'));
  return {errors,warnings,pages:site.pages.length,redirects:redirected.size,indexable,noindex:site.pages.length-indexable};
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
  // Studio can create an editable first-party starter graph. Imported sites
  // bypass sectionFrom and are rejected if the author omitted their real graph.
  if(manifest.id==='custom-section')result.designGraph=GRAPH_HOST.baseGraph(idValue);
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
  controls,effectiveValue,sectionFrom,siteFromBrief,upgrade,sharedSectionShape
});
