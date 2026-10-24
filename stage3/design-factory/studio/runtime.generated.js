/* Design Factory D5 first-party browser bundle. Generated from exact existing Stage3 SDK/manifests.
 * No packages, eval, remote files or dynamic code; original JS source is bundled as static functions.
 * Build script: stage3/design-factory/bin/build-browser-bundle.cjs
 */
(function(root){
'use strict';
const manifestBytes={"company-hero":"{\n  \"format\": \"manufact-ai-component-v1\",\n  \"id\": \"company-hero\",\n  \"version\": \"1.0.0\",\n  \"label\": \"Первый экран компании\",\n  \"elements\": [\n    {\n      \"slot\": \"heading\",\n      \"label\": \"Главный заголовок\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Текст заголовка\",\n          \"type\": \"text\",\n          \"default\": \"Оборудование для вашего производства\",\n          \"responsive\": false,\n          \"maxLength\": 180\n        },\n        {\n          \"path\": \"style.fontSize\",\n          \"label\": \"Размер заголовка\",\n          \"type\": \"length\",\n          \"default\": {\n            \"desktop\": \"64px\",\n            \"tablet\": \"48px\",\n            \"mobile\": \"32px\"\n          },\n          \"responsive\": true,\n          \"min\": 10,\n          \"max\": 120,\n          \"units\": [\n            \"px\",\n            \"rem\"\n          ]\n        },\n        {\n          \"path\": \"style.color\",\n          \"label\": \"Цвет заголовка\",\n          \"type\": \"color\",\n          \"default\": \"#172A43\",\n          \"responsive\": false\n        }\n      ]\n    },\n    {\n      \"slot\": \"summary\",\n      \"label\": \"Описание\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Текст описания\",\n          \"type\": \"text\",\n          \"default\": \"Расскажите о вашем предложении без вымышленных фактов.\",\n          \"responsive\": false,\n          \"maxLength\": 420\n        }\n      ]\n    },\n    {\n      \"slot\": \"action\",\n      \"label\": \"Основная кнопка\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Подпись кнопки\",\n          \"type\": \"text\",\n          \"default\": \"Связаться\",\n          \"responsive\": false,\n          \"maxLength\": 100\n        },\n        {\n          \"path\": \"behavior.href\",\n          \"label\": \"Адрес перехода\",\n          \"type\": \"url\",\n          \"default\": \"/contact/\",\n          \"responsive\": false\n        }\n      ]\n    }\n  ]\n}\n","contact-panel":"{\n  \"format\": \"manufact-ai-component-v1\",\n  \"id\": \"contact-panel\",\n  \"version\": \"1.0.0\",\n  \"label\": \"Контакты\",\n  \"elements\": [\n    {\n      \"slot\": \"heading\",\n      \"label\": \"Заголовок контактов\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Заголовок\",\n          \"type\": \"text\",\n          \"default\": \"Свяжитесь с нами\",\n          \"responsive\": false,\n          \"maxLength\": 180\n        }\n      ]\n    },\n    {\n      \"slot\": \"action\",\n      \"label\": \"Контактная кнопка\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Подпись\",\n          \"type\": \"text\",\n          \"default\": \"Оставить заявку\",\n          \"responsive\": false,\n          \"maxLength\": 120\n        },\n        {\n          \"path\": \"behavior.href\",\n          \"label\": \"Ссылка\",\n          \"type\": \"url\",\n          \"default\": \"/contact/\",\n          \"responsive\": false\n        }\n      ]\n    }\n  ]\n}\n","cta-banner":"{\n  \"format\": \"manufact-ai-component-v1\",\n  \"id\": \"cta-banner\",\n  \"version\": \"1.0.0\",\n  \"label\": \"CTA · призыв к действию\",\n  \"elements\": [\n    {\n      \"slot\": \"heading\",\n      \"label\": \"Заголовок\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Заголовок CTA\",\n          \"type\": \"text\",\n          \"default\": \"Готовы обсудить проект?\",\n          \"responsive\": false,\n          \"maxLength\": 180\n        }\n      ]\n    },\n    {\n      \"slot\": \"summary\",\n      \"label\": \"Описание\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Пояснение\",\n          \"type\": \"text\",\n          \"default\": \"Расскажите о задаче — подберём решение и ответим на вопросы.\",\n          \"responsive\": false,\n          \"maxLength\": 500\n        }\n      ]\n    },\n    {\n      \"slot\": \"primary\",\n      \"label\": \"Основная кнопка\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Текст кнопки\",\n          \"type\": \"text\",\n          \"default\": \"Связаться с нами\",\n          \"responsive\": false,\n          \"maxLength\": 100\n        },\n        {\n          \"path\": \"behavior.href\",\n          \"label\": \"Адрес кнопки\",\n          \"type\": \"url\",\n          \"default\": \"/\",\n          \"responsive\": false\n        }\n      ]\n    },\n    {\n      \"slot\": \"secondary\",\n      \"label\": \"Дополнительная кнопка\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Текст кнопки\",\n          \"type\": \"text\",\n          \"default\": \"Наши услуги\",\n          \"responsive\": false,\n          \"maxLength\": 100\n        },\n        {\n          \"path\": \"behavior.href\",\n          \"label\": \"Адрес кнопки\",\n          \"type\": \"url\",\n          \"default\": \"/\",\n          \"responsive\": false\n        }\n      ]\n    }\n  ]\n}\n","faq-accordion":"{\n  \"format\": \"manufact-ai-component-v1\",\n  \"id\": \"faq-accordion\",\n  \"version\": \"1.0.0\",\n  \"label\": \"FAQ · раскрывающиеся вопросы\",\n  \"elements\": [\n    {\n      \"slot\": \"heading\",\n      \"label\": \"Заголовок секции\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Заголовок\",\n          \"type\": \"text\",\n          \"default\": \"FAQ · раскрывающиеся вопросы\",\n          \"responsive\": false,\n          \"maxLength\": 180\n        }\n      ]\n    }\n  ],\n  \"repeat\": {\n    \"label\": \"Повторяемый элемент\",\n    \"min\": 2,\n    \"max\": 24,\n    \"fields\": [\n      {\n        \"path\": \"content.question\",\n        \"label\": \"Вопрос\",\n        \"type\": \"text\",\n        \"default\": \"Укажите вопрос\",\n        \"responsive\": false,\n        \"maxLength\": 220\n      },\n      {\n        \"path\": \"content.answer\",\n        \"label\": \"Ответ\",\n        \"type\": \"text\",\n        \"default\": \"Добавьте проверенный ответ.\",\n        \"responsive\": false,\n        \"maxLength\": 1200\n      }\n    ]\n  }\n}\n","feature-highlights":"{\n  \"format\": \"manufact-ai-component-v1\",\n  \"id\": \"feature-highlights\",\n  \"version\": \"1.0.0\",\n  \"label\": \"Преимущества\",\n  \"elements\": [\n    {\n      \"slot\": \"heading\",\n      \"label\": \"Заголовок преимуществ\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Заголовок\",\n          \"type\": \"text\",\n          \"default\": \"Чем мы занимаемся\",\n          \"responsive\": false,\n          \"maxLength\": 180\n        }\n      ]\n    },\n    {\n      \"slot\": \"first\",\n      \"label\": \"Первая карточка\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Описание преимущества\",\n          \"type\": \"text\",\n          \"default\": \"Заполните подтверждённые преимущества компании\",\n          \"responsive\": false,\n          \"maxLength\": 280\n        },\n        {\n          \"path\": \"style.color\",\n          \"label\": \"Цвет текста\",\n          \"type\": \"color\",\n          \"default\": \"#172A43\",\n          \"responsive\": false\n        }\n      ]\n    },\n    {\n      \"slot\": \"second\",\n      \"label\": \"Вторая карточка\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Описание второй карточки\",\n          \"type\": \"text\",\n          \"default\": \"Уточните факты у заказчика\",\n          \"responsive\": false,\n          \"maxLength\": 280\n        }\n      ]\n    }\n  ]\n}\n","service-grid":"{\n  \"format\": \"manufact-ai-component-v1\",\n  \"id\": \"service-grid\",\n  \"version\": \"1.0.0\",\n  \"label\": \"Услуги · повторяемые карточки\",\n  \"elements\": [\n    {\n      \"slot\": \"heading\",\n      \"label\": \"Заголовок секции\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Заголовок\",\n          \"type\": \"text\",\n          \"default\": \"Услуги · повторяемые карточки\",\n          \"responsive\": false,\n          \"maxLength\": 180\n        }\n      ]\n    }\n  ],\n  \"repeat\": {\n    \"label\": \"Повторяемый элемент\",\n    \"min\": 2,\n    \"max\": 16,\n    \"fields\": [\n      {\n        \"path\": \"content.title\",\n        \"label\": \"Название услуги\",\n        \"type\": \"text\",\n        \"default\": \"Название услуги\",\n        \"responsive\": false,\n        \"maxLength\": 150\n      },\n      {\n        \"path\": \"content.text\",\n        \"label\": \"Описание услуги\",\n        \"type\": \"text\",\n        \"default\": \"Добавьте подтверждённое описание услуги.\",\n        \"responsive\": false,\n        \"maxLength\": 600\n      },\n      {\n        \"path\": \"behavior.href\",\n        \"label\": \"Ссылка\",\n        \"type\": \"url\",\n        \"default\": \"/contact/\",\n        \"responsive\": false\n      }\n    ]\n  }\n}\n","media-story":"{\n  \"format\": \"manufact-ai-component-v1\",\n  \"id\": \"media-story\",\n  \"version\": \"1.0.0\",\n  \"label\": \"Фото и текст · две колонки\",\n  \"elements\": [\n    {\n      \"slot\": \"heading\",\n      \"label\": \"Заголовок\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Заголовок секции\",\n          \"type\": \"text\",\n          \"default\": \"История нашей компании\",\n          \"responsive\": false,\n          \"maxLength\": 160\n        }\n      ]\n    },\n    {\n      \"slot\": \"copy\",\n      \"label\": \"Описание\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Текст рядом с фотографией\",\n          \"type\": \"text\",\n          \"default\": \"Расскажите о проекте, команде или продукте.\",\n          \"responsive\": false,\n          \"maxLength\": 900\n        }\n      ]\n    },\n    {\n      \"slot\": \"photo\",\n      \"label\": \"Основная фотография\",\n      \"fields\": [\n        {\n          \"path\": \"content.media\",\n          \"label\": \"Фотография из медиабиблиотеки\",\n          \"type\": \"media\",\n          \"default\": \"\",\n          \"responsive\": false\n        }\n      ]\n    },\n    {\n      \"slot\": \"action\",\n      \"label\": \"Кнопка\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Подпись кнопки\",\n          \"type\": \"text\",\n          \"default\": \"Подробнее\",\n          \"responsive\": false,\n          \"maxLength\": 110\n        },\n        {\n          \"path\": \"behavior.href\",\n          \"label\": \"Адрес перехода\",\n          \"type\": \"url\",\n          \"default\": \"/contact/\",\n          \"responsive\": false\n        }\n      ]\n    }\n  ]\n}\n","photo-gallery":"{\n  \"format\": \"manufact-ai-component-v1\",\n  \"id\": \"photo-gallery\",\n  \"version\": \"1.0.0\",\n  \"label\": \"Галерея · повторяемые фотографии\",\n  \"elements\": [\n    {\n      \"slot\": \"heading\",\n      \"label\": \"Заголовок секции\",\n      \"fields\": [\n        {\n          \"path\": \"content.text\",\n          \"label\": \"Заголовок\",\n          \"type\": \"text\",\n          \"default\": \"Галерея · повторяемые фотографии\",\n          \"responsive\": false,\n          \"maxLength\": 180\n        }\n      ]\n    }\n  ],\n  \"repeat\": {\n    \"label\": \"Повторяемый элемент\",\n    \"min\": 2,\n    \"max\": 20,\n    \"fields\": [\n      {\n        \"path\": \"content.media\",\n        \"label\": \"Фотография\",\n        \"type\": \"media\",\n        \"default\": \"\",\n        \"responsive\": false\n      },\n      {\n        \"path\": \"content.caption\",\n        \"label\": \"Подпись\",\n        \"type\": \"text\",\n        \"default\": \"\",\n        \"responsive\": false,\n        \"maxLength\": 240\n      }\n    ]\n  }\n}\n"};
const moduleFactories={
"sdk":function(module,exports,require,__dirname){
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
const DEFAULT_APPEARANCE=Object.freeze({surface:'default',spacing:'normal',align:'left',width:'default',heading:'default',corners:'default',mobileAlign:'inherit',mobileSpacing:'inherit',button:'default'});
const EXTRA_APPEARANCE=Object.freeze({"width":["default","narrow","wide"],"heading":["default","compact","expressive"],"corners":["default","soft","round"],"mobileAlign":["inherit","left","center"],"mobileSpacing":["inherit","tight","normal","airy"],"button":["default","outline","pill"]});
function validAppearance(a){
  objectKeys(a,['surface','spacing','align',...Object.keys(EXTRA_APPEARANCE)],'appearance');
  if(!['default','paper','tint','dark'].includes(a.surface)||
     !['tight','normal','airy'].includes(a.spacing)||
     !['left','center'].includes(a.align))fail('Invalid section appearance');
  for(const [name,allowed] of Object.entries(EXTRA_APPEARANCE))
    if(own(a,name)&&!allowed.includes(a[name]))fail('Invalid section appearance',name);
}
// Additive v1 field-builder contract: older forms keep their original 3 slots.
const FORM_KINDS=['text','tel','email','select','textarea'];
function validateFormFields(section){
  if(!own(section,'formFields'))return;
  if(section.component!=='lead-form-flex'||!Array.isArray(section.formFields)||section.formFields.length>6)
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
    if(f.kind==='select'){
      if(f.options.length<2||f.options.length>12||new Set(f.options).size!==f.options.length||
        f.options.some(v=>typeof v!=='string'||!v.trim()||v.length>80||/[\x00-\x1f]/.test(v)))
        fail('Invalid select options',f.id);
    }else if(f.options.length)fail('Options only permitted on select fields',f.id);
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
  objectKeys(raw,['format','siteId','title','schemaVersion','assets','pages','theme','redirects'],'site');
  if(own(raw,'theme'))validTheme(raw.theme);
  if(raw.format!==FORMAT||raw.schemaVersion!==1)fail('Unsupported site format');
  id(raw.siteId,'siteId');text(raw.title,'site title',130);
  if(!Array.isArray(raw.assets)||raw.assets.length>300)fail('Invalid assets');
  const assetIds=new Set();
  for(const asset of raw.assets){
    objectKeys(asset,['id','src','alt','mime'],'asset');id(asset.id,'asset.id');
    if(assetIds.has(asset.id)||!['image/png','image/webp','image/jpeg','image/svg+xml'].includes(asset.mime)||
      typeof asset.src!=='string'||!/^\/assets\/[a-zA-Z0-9/_-]+\.(png|webp|jpg|jpeg|svg)$/.test(asset.src)||
      typeof asset.alt!=='string'||asset.alt.length>200||/[\x00-\x1f]/.test(asset.alt))fail('Invalid asset',asset.id);
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
      objectKeys(section,['id','component','manifestVersion','elements','items','appearance','formFields'],'section');
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
      validateFormFields(section);
    }
  }
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
module.exports=Object.freeze({DEFAULT_THEME,
  FORMAT,MANIFEST,BREAKPOINTS,DEFAULT_APPEARANCE,validateManifest,registry,validateSite,inspectSite,
  controls,effectiveValue,sectionFrom,siteFromBrief,upgrade
});

},
"compiler":function(module,exports,require,__dirname){
'use strict';
// Design Factory D1 — deterministic author-fact compiler.
// Reads first-party Stage3 manifests and SDK; never writes to the CMS.
const fs = require('node:fs');
const path = require('node:path');
const sdk = require('../../sdk/contract.cjs');

const FORMAT = 'manufact-design-factory-v1';
const VERSION = 1;
const ROOT = path.resolve(__dirname, '../../components');
const COMPONENTS = Object.freeze([
  'company-hero','feature-highlights','service-grid','media-story','faq-accordion',
  'cta-banner','contact-panel','photo-gallery'
]);
const THEMES = require('../catalog/themes.cjs');
const KITS = require('../catalog/kits.cjs');
const COPY = Object.freeze({
  ru: {
    pages: {home:'Главная',services:'Услуги',approach:'Подход',contact:'Контакты'},
    emptyTitle:'Новый сайт — требуется название',
    hero: 'Опишите ваше предложение',
    summary:'Добавьте проверенные сведения о компании и задаче, которую она решает.',
    action:'Обсудить задачу',
    services:'Направления работы',
    serviceOne:'Направление 1 — уточните у владельца',
    serviceTwo:'Направление 2 — уточните у владельца',
    serviceDescription:'Опишите услугу на основе подтверждённых данных.',
    features:'Что важно знать',
    featureOne:'Добавьте проверенную информацию о подходе к работе.',
    featureTwo:'Уточните сроки, состав услуг и условия у владельца.',
    story:'О процессе работы',
    storyCopy:'Добавьте реальные материалы, этапы или примеры вашей работы.',
    storyImage:'Подключите изображение только после согласования прав.',
    faq:'Частые вопросы',
    faqQ1:'Как уточнить объём проекта?',
    faqA1:'Оставьте описание задачи, чтобы согласовать детали.',
    faqQ2:'Где узнать условия сотрудничества?',
    faqA2:'Уточните актуальные условия у представителя организации.',
    call:'Начнём с задачи',
    callDescription:'Опишите цель и ожидаемый результат, чтобы обсудить дальнейшие действия.',
    secondary:'Посмотреть услуги',
    contact:'Контактная информация',
    contactAction:'Перейти к контактам',
    seo:'Информация о направлениях, подходе и способах связи. Данные требуют проверки владельцем.',
    missing:'Не заполнены подтверждённые данные',
  },
  en: {
    pages: {home:'Home',services:'Services',approach:'Approach',contact:'Contact'},
    emptyTitle:'New website — add your name',
    hero:'Describe what you offer',
    summary:'Add verified information about the organization and the needs it serves.',
    action:'Discuss a project',
    services:'Areas of work',
    serviceOne:'Service area 1 — confirm with owner',
    serviceTwo:'Service area 2 — confirm with owner',
    serviceDescription:'Describe the service using verified owner-provided details.',
    features:'What to know',
    featureOne:'Add confirmed information about your working process.',
    featureTwo:'Ask the owner to confirm scope, timelines and terms.',
    story:'How the work is done',
    storyCopy:'Add real projects, steps or examples of work.',
    storyImage:'Add an image only with the necessary permissions.',
    faq:'Frequently asked questions',
    faqQ1:'How can we clarify project scope?',
    faqA1:'Describe the task so its details can be discussed.',
    faqQ2:'Where can I check cooperation terms?',
    faqA2:'Ask the organization for up-to-date terms.',
    call:'Start with the brief',
    callDescription:'Share your goal and expected outcome to discuss the next steps.',
    secondary:'Explore services',
    contact:'Contact information',
    contactAction:'Contact details',
    seo:'Overview of services, approach and ways to get in touch. Verify details with the owner.',
    missing:'Verified owner details missing',
  }
});
function fail(message){throw new Error('DESIGN_FACTORY: '+message);}
const has = (o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object = v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function keys(o, allowed, where){
  if(!object(o)||Object.keys(o).some(k=>!allowed.includes(k))) fail('Unexpected '+where+' keys');
}
function value(v,max,name){
  if(typeof v!=='string'||v.length>max||/[\u0000-\u001f\u007f]/.test(v)) fail('Invalid '+name);
}
function safeId(v){return typeof v==='string'&&/^[a-z][a-z0-9-]{2,79}$/.test(v);}
function cleanFacts(input){
  keys(input,['siteId','title','headline','description','services','ctaLabel','contactText'],'facts');
  const f={};
  for(const k of ['siteId','title','headline','description','ctaLabel','contactText']){
    if(has(input,k)){value(input[k],k==='description'||k==='contactText'?400:k==='siteId'?80:k==='ctaLabel'?100:120,k);f[k]=input[k];}
  }
  if(has(f,'siteId')&&!safeId(f.siteId)) fail('Invalid facts.siteId');
  if(has(input,'services')){
    if(!Array.isArray(input.services)||input.services.length>12)fail('Invalid services count');
    f.services=input.services.map((s,i)=>{
      keys(s,['title','description'],'service #'+i);
      value(s.title,120,'service.title');value(s.description,320,'service.description');
      if(!s.title.trim())fail('Empty service title');
      return {title:s.title,description:s.description};
    });
  }
  return f;
}
function migrate(input){
  if(input==null)return {format:FORMAT,version:VERSION,kit:'agency',theme:'editorial',language:'ru',facts:{}};
  if(!object(input)||input.format!==FORMAT)fail('Unsupported design-factory format');
  if(input.version===0){
    keys(input,['format','version','kit','theme','language','facts'],'legacy project');
    const old={...input,version:1};
    return validateProject(old);
  }
  return validateProject(input);
}
function validateProject(input){
  keys(input,['format','version','kit','theme','language','facts'],'project');
  if(input.format!==FORMAT||input.version!==VERSION)fail('Unsupported project version');
  if(!has(KITS,input.kit)||!has(THEMES,input.theme)||!['ru','en'].includes(input.language))
    fail('Unknown kit, theme or language');
  return {format:FORMAT,version:VERSION,kit:input.kit,theme:input.theme,language:input.language,facts:cleanFacts(input.facts)};
}
function loadRegistry(){
  const entries=COMPONENTS.map(n=>{
    const p=path.join(ROOT,n+'.json');
    return JSON.parse(fs.readFileSync(p,'utf8'));
  });
  return sdk.registry(entries);
}
function pagePath(key){return key==='home'?'/':'/'+key+'/';}
function pageId(key){return 'df-page-'+key;}
function sectionId(page,index){return 'df-'+page+'-'+String(index+1).padStart(2,'0');}
function apply(section,slot,values){
  const el=section.elements.find(x=>x.slot===slot);
  if(!el)fail('Missing registered slot: '+section.component+'/'+slot);
  for(const [key,val] of Object.entries(values)){
    if(!has(el.values,key))fail('Undeclared slot property: '+key);
    el.values[key]=val;
  }
}
function setItems(section, items){
  if(!Array.isArray(section.items))fail('Component has no registered repeater');
  const prototype=section.items[0].values;
  section.items=items.map((row,i)=>({
    id:section.id+'-item-'+(i+1),
    values:{...structuredClone(prototype),...row}
  }));
}
function makeSection(component,id,page,project,reg){
  const theme=THEMES[project.theme], c=COPY[project.language], f=project.facts;
  const sector=KITS[project.kit].copy[project.language]||{};
  const def=reg.get(component);
  if(!def)fail('Missing component '+component);
  const section=sdk.sectionFrom(def,id);
  section.appearance={...theme.appearance};
  if(component==='company-hero'){
    const title=page==='home'?(f.headline||f.title||sector.hero||c.hero):c.pages[page];
    const summary=page==='home'?(f.description||sector.description||c.summary):(page==='contact'?(f.contactText||c.summary):(page==='services'?(sector.description||c.seo):(sector.storyCopy||c.seo)));
    apply(section,'heading',{'content.text':title,'style.fontSize':theme.headline,'style.color':theme.cms.text});
    apply(section,'summary',{'content.text':summary});
    apply(section,'action',{'content.text':f.ctaLabel||c.action,'behavior.href':'/contact/'});
  } else if(component==='feature-highlights'){
    apply(section,'heading',{'content.text':sector.hero||c.features});
    apply(section,'first',{'content.text':sector.featureOne||c.featureOne,'style.color':theme.cms.text});
    apply(section,'second',{'content.text':sector.storyCopy||c.featureTwo});
  } else if(component==='service-grid'){
    apply(section,'heading',{'content.text':c.services});
    const samplePrefix=project.language==='ru'?'Пример (подтвердить): ':'Example (verify): ';
    const rows=(f.services&&f.services.length?f.services.slice(0,12):[
      {title:samplePrefix+(sector.serviceOne||c.serviceOne),description:c.serviceDescription},
      {title:samplePrefix+(sector.serviceTwo||c.serviceTwo),description:c.serviceDescription}
    ]);
    // The registered service-grid repeater requires at least 2 items.
    // Do not invent a second service: clearly label its owner-review placeholder.
    if(rows.length===1)rows.push({title:samplePrefix+(sector.serviceTwo||c.serviceTwo),description:c.serviceDescription});
    setItems(section,rows.map(x=>({'content.title':x.title,'content.text':x.description,'behavior.href':'/contact/'})));
  } else if(component==='media-story'){
    apply(section,'heading',{'content.text':sector.hero||c.story});
    apply(section,'copy',{'content.text':sector.storyCopy||c.storyCopy});
    apply(section,'action',{'content.text':c.action,'behavior.href':'/contact/'});
  } else if(component==='faq-accordion'){
    apply(section,'heading',{'content.text':c.faq});
    setItems(section,[
      {'content.question':c.faqQ1,'content.answer':c.faqA1},
      {'content.question':c.faqQ2,'content.answer':c.faqA2}
    ]);
  } else if(component==='cta-banner'){
    apply(section,'heading',{'content.text':c.call});
    apply(section,'summary',{'content.text':c.callDescription});
    apply(section,'primary',{'content.text':f.ctaLabel||c.action,'behavior.href':'/contact/'});
    apply(section,'secondary',{'content.text':c.secondary,'behavior.href':'/services/'});
  } else if(component==='contact-panel'){
    apply(section,'heading',{'content.text':c.contact});
    apply(section,'action',{'content.text':c.contactAction,'behavior.href':'/contact/'});
  }
  return section;
}
// A card added by Studio is a draft placeholder, not evidence of a confirmed
// owner service. The checklist never substitutes for factual owner approval.
function reviewedServiceDraft(item,language){
  const title=item.title.trim(),description=item.description.trim();
  if(!title||!description)return false;
  if(title==='Уточните название'||title==='Confirm service name')return false;
  if(title.startsWith('Пример (подтвердить):')||title.startsWith('Example (verify):'))return false;
  if(description==='Добавьте подтверждённое описание.'||
     description==='Add verified description.'||
     description===COPY[language].serviceDescription)return false;
  return true;
}
function checklist(project){
  const f=project.facts,c=COPY[project.language],missing=[];
  if(!f.title?.trim())missing.push('facts.title');
  if(!f.headline?.trim())missing.push('facts.headline');
  if(!f.description?.trim())missing.push('facts.description');
  if(!f.services||f.services.length<2||
     !f.services.every(s=>reviewedServiceDraft(s,project.language)))
    missing.push('facts.services');
  if(!f.contactText?.trim())missing.push('facts.contactText');
  return {label:c.missing,missing,readyForPublish:missing.length===0,requiresOwnerReview:true};
}
function compile(input,providedRegistry){
  const project=migrate(input),reg=providedRegistry||loadRegistry(),theme=THEMES[project.theme],
    kit=KITS[project.kit], c=COPY[project.language], facts=project.facts;
  const siteId=facts.siteId||('df-'+project.kit);
  const title=facts.title||c.emptyTitle;
  const pages=Object.keys(kit.sequences).map(key=>{
    const pathValue=pagePath(key);
    const sections=kit.sequences[key].map((comp,i)=>makeSection(comp,sectionId(key,i),key,project,reg));
    return {
      id:pageId(key),path:pathValue,title:c.pages[key],
      navigation:{label:c.pages[key],hidden:false},
      seo:{title:(key==='home'?title:c.pages[key]+' | '+title).slice(0,160),
        description:(facts.description||c.seo).slice(0,300),robots:'index'},
      sections
    };
  });
  const site={format:sdk.FORMAT,siteId,title,schemaVersion:1,assets:[],pages,theme:structuredClone(theme.cms)};
  const validated=sdk.validateSite(site,reg);
  const findings=sdk.inspectSite(validated,reg);
  if(findings.errors.length)fail('Invalid local links/anchors: '+JSON.stringify(findings.errors));
  return {project,site:validated,checklist:checklist(project),inspection:findings,designSpec:{
    format:FORMAT,version:VERSION,kit:project.kit,theme:project.theme,
    archetype:kit.archetype,previewParity:'integration_required',
    cmsTheme:structuredClone(theme.cms),cmsAppearance:structuredClone(theme.appearance),
    previewDesign:structuredClone(theme.design),
    contrast:structuredClone(theme.contrast),
    integration_required:['custom-layout-css','custom-type-scale','media-workbench-assets']
  }};
}
function serialize(v){return JSON.stringify(v,null,2)+'\n';}
function jsonParse(text){
  if(typeof text!=='string'||text.length>1024*1024)fail('Input JSON exceeds 1 MiB');
  try{return JSON.parse(text);}catch{fail('Invalid JSON');}
}
module.exports=Object.freeze({
  FORMAT,VERSION,KITS,THEMES,COPY,migrate,validateProject,loadRegistry,compile,
  checklist,serialize,jsonParse
});

},
"preview":function(module,exports,require,__dirname){
'use strict';
// Standalone D1 preview. Its enhanced layout is NOT part of current PHP renderer.
const fs=require('node:fs');
const path=require('node:path');
const {THEMES,serialize}=require('./compiler.cjs');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function slot(s,name,key='content.text'){
  const el=s.elements.find(e=>e.slot===name);
  return el&&typeof el.values[key]==='string'?el.values[key]:'';
}
function href(route,depth){
  const map={'/':'index.html','/services/':'services/index.html','/approach/':'approach/index.html','/contact/':'contact/index.html'};
  return (depth?'../':'')+(map[route]||'index.html');
}
function a(route,label,depth,klass='button'){
  return '<a class="'+klass+'" href="'+esc(href(route,depth))+'">'+esc(label)+'</a>';
}
function renderSection(s,depth,i,language){
  const ru=language==='ru';
  const name=s.component, id=esc(s.id),heading=slot(s,'heading');
  const head='<p class="eyebrow">SECTION '+String(i+1).padStart(2,'0')+'</p><h2>'+esc(heading)+'</h2>';
  if(name==='company-hero')
    return '<section id="'+id+'" class="section hero"><div class="hero-copy"><p class="eyebrow">DESIGN FACTORY / ORIGINAL LAYOUT</p><h1>'+esc(heading)+'</h1><p class="lede">'+esc(slot(s,'summary'))+'</p><div class="actions">'+a('/contact/',slot(s,'action'),depth)+a('/services/',ru?'Услуги →':'Explore services →',depth,'text-link')+'</div></div><div class="art" aria-hidden="true"><div class="art-caption">DF · '+String(i+1).padStart(2,'0')+'</div><div class="art-shape"></div><div class="art-circle"></div></div></section>';
  if(name==='feature-highlights')
    return '<section id="'+id+'" class="section features"><div class="section-heading">'+head+'</div><div class="features-grid"><article><span class="index">01 /</span><h3>'+esc(slot(s,'first'))+'</h3></article><article><span class="index">02 /</span><h3>'+esc(slot(s,'second'))+'</h3></article></div></section>';
  if(name==='service-grid')
    return '<section id="'+id+'" class="section services"><div class="section-heading">'+head+'</div><div class="service-grid">'+s.items.map((it,j)=>'<article class="service-card"><div class="card-top"><span>0'+(j+1)+'</span><span aria-hidden="true">↗</span></div><h3>'+esc(it.values['content.title'])+'</h3><p>'+esc(it.values['content.text'])+'</p>'+a('/contact/',ru?'Обсудить →':'Discuss →',depth,'text-link')+'</article>').join('')+'</div></section>';
  if(name==='media-story')
    return '<section id="'+id+'" class="section story"><div class="story-art" aria-label="Illustrative placeholder; no owner photo supplied"><span>'+(ru?'ИЗОБРАЖЕНИЕ / ПРИМЕР':'IMAGE / PLACEHOLDER')+'</span><div class="story-shape"></div></div><div class="story-text">'+head+'<p>'+esc(slot(s,'copy'))+'</p>'+a('/contact/',slot(s,'action'),depth,'text-link')+'</div></section>';
  if(name==='faq-accordion')
    return '<section id="'+id+'" class="section faq"><div>'+head+'</div><div class="faqs">'+s.items.map(it=>'<details><summary>'+esc(it.values['content.question'])+'</summary><p>'+esc(it.values['content.answer'])+'</p></details>').join('')+'</div></section>';
  if(name==='cta-banner')
    return '<section id="'+id+'" class="section cta"><div><p class="eyebrow">'+(ru?'ДАЛЬНЕЙШИЙ ШАГ':'NEXT STEP')+'</p><h2>'+esc(heading)+'</h2><p>'+esc(slot(s,'summary'))+'</p></div><div class="cta-actions">'+a('/contact/',slot(s,'primary'),depth)+a('/services/',slot(s,'secondary')+' →',depth,'text-link')+'</div></section>';
  if(name==='contact-panel')
    return '<section id="'+id+'" class="section contact">'+head+'<p>'+(ru?'Укажите подтверждённые контакты перед публикацией.':'Add verified contact information before publication.')+'</p>'+a('/contact/',slot(s,'action'),depth)+'</section>';
  if(name==='photo-gallery')
    return '<section id="'+id+'" class="section photo-gallery-preview"><div class="section-heading">'+head+'</div><div class="preview-photos">'+
      (s.items||[]).map((item,j)=>'<figure class="preview-photo"><div role="img" aria-label="'+esc(ru?'Фотография не предоставлена':'Photo not provided')+'">'+
        esc(ru?'ФОТОГРАФИЯ '+(j+1)+' / ТРЕБУЕТСЯ ФАЙЛ':'PHOTO '+(j+1)+' / OWNER FILE REQUIRED')+'</div><figcaption>'+esc(item.values['content.caption']||'')+'</figcaption></figure>').join('')+
      '</div></section>';
  throw Error('Unsupported preview component '+name);
}
function css(theme){
  const t=THEMES[theme];
  if(!t)throw Error('Invalid theme');
  const v=t.cms;
  const display=v.font==='georgia'?'Georgia,serif':'system-ui,Segoe UI,sans-serif';
  const radius={bordered:'9px',paper:'3px',floating:'27px'}[t.design.card];
  const displaySize=t.design.tracking==='wide'?'clamp(3.7rem,7.5vw,7.4rem)':t.design.tracking==='tight'?'clamp(3rem,6.4vw,6.5rem)':'clamp(3.25rem,6.8vw,6.8rem)';
  const base=[
    '/* Standalone CSS preview only: CMS parity integration_required */',
    ':root{--bg:'+v.background+';--surface:'+v.surface+';--text:'+v.text+';--accent:'+v.primary+';--radius:'+radius+';--wide:'+v.maxWidth+'px;--display:'+display+';--line:color-mix(in srgb,var(--text),transparent 82%)}',
    '*,*:before,*:after{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--text);background:var(--bg);font:16px/1.6 system-ui,Segoe UI,sans-serif}a{color:inherit}a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:4px}',
    '.skip{position:absolute;left:-9999px;background:var(--surface);padding:12px}.skip:focus{top:12px;left:12px;z-index:100}',
    '.notice{background:var(--text);color:var(--bg);text-transform:uppercase;text-align:center;font-size:11px;letter-spacing:.13em;padding:9px}',
    'header{border-bottom:1px solid var(--line);background:var(--bg)}.navwrap{max-width:var(--wide);padding:22px;margin:auto;display:flex;justify-content:space-between;align-items:center;gap:24px}',
    '.brand{font-size:20px;letter-spacing:-.05em;font-weight:850;text-decoration:none}.brand span{color:var(--accent)}nav{display:flex;gap:clamp(12px,3vw,36px);flex-wrap:wrap}nav a{display:inline-flex;align-items:center;min-height:44px;font-size:13px;text-decoration:none;font-weight:700;opacity:.75}nav a[aria-current]{opacity:1;border-bottom:2px solid var(--accent)}',
    '.section{max-width:var(--wide);margin:auto;padding:clamp(58px,8vw,120px) 22px;border-bottom:1px solid var(--line)}.section h2{font:500 clamp(2rem,4.5vw,4.3rem)/1.1 var(--display);letter-spacing:-.065em;margin:12px 0 26px}.eyebrow{font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}',
    '.hero{min-height:600px;display:grid;grid-template-columns:1.1fr .9fr;gap:5%;align-items:center}.hero h1{font:500 '+displaySize+'/.99 var(--display);letter-spacing:-.075em;overflow-wrap:anywhere;margin:18px 0 28px}.lede{font-size:clamp(17px,2vw,21px);max-width:560px;opacity:.8}',
    '.actions{display:flex;gap:25px;align-items:center;flex-wrap:wrap;margin-top:34px}.button{display:inline-block;background:var(--accent);color:white;text-decoration:none;font-size:14px;font-weight:800;padding:15px 25px;min-height:48px;border-radius:var(--radius)}.button:hover{filter:brightness(.92)} .text-link{display:inline-flex;align-items:center;min-height:44px;font-weight:750;font-size:13px;text-underline-offset:5px}',
    '.art{height:380px;background:var(--text);color:var(--bg);border-radius:var(--radius);overflow:hidden;position:relative;padding:24px}.art-caption{position:relative;z-index:2;font-size:12px;letter-spacing:.1em}.art-shape{position:absolute;left:28%;top:24%;height:85%;width:72%;background:var(--accent);transform:rotate(-19deg)}.art-circle{position:absolute;bottom:-65px;left:-65px;width:220px;height:220px;border:28px solid var(--bg);border-radius:50%}',
    '.section-heading{max-width:700px;margin-bottom:44px}.features-grid,.service-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.features-grid article,.service-card{background:var(--surface);padding:clamp(25px,4vw,54px);border:1px solid var(--line);border-radius:var(--radius)}.features-grid article{min-height:250px}.features-grid h3{font:500 clamp(1.5rem,2.5vw,2.6rem)/1.14 var(--display);letter-spacing:-.04em}.index{color:var(--accent);font-weight:900}',
    '.service-card{padding:32px}.card-top{display:flex;justify-content:space-between;font-size:12px;color:var(--accent);font-weight:900}.service-card h3{font:500 clamp(1.4rem,2.3vw,2.4rem)/1.13 var(--display);letter-spacing:-.035em;margin:34px 0 13px}.service-card p{opacity:.8}.story{display:grid;grid-template-columns:1fr 1fr;gap:7%;align-items:center}.story-art{height:390px;position:relative;overflow:hidden;background:var(--accent);color:white;padding:24px;border-radius:var(--radius)}.story-art span{position:relative;z-index:2;font-size:11px}.story-shape{position:absolute;right:-11%;bottom:-10%;width:75%;height:75%;border:55px solid var(--bg);transform:rotate(23deg);border-radius:35%}.story-text p{opacity:.8}',
    '.faq{display:grid;grid-template-columns:.8fr 1.2fr;gap:55px}.faqs details{padding:22px 0;border-bottom:1px solid var(--line)} .faqs summary{display:flex;align-items:center;min-height:44px;cursor:pointer;font-weight:800}.faqs p{opacity:.8}',
    '.cta{background:var(--text);color:var(--bg);display:flex;align-items:center;justify-content:space-between;gap:30px;padding:clamp(50px,7vw,85px);margin-top:55px;margin-bottom:55px;border-radius:var(--radius)}.cta .eyebrow{color:var(--bg);opacity:.7}.cta h2{max-width:600px}.cta-actions{display:flex;flex-direction:column;gap:20px;align-items:flex-start}.contact{text-align:center}.contact p{opacity:.75}.footer{padding:60px 22px;background:var(--text);color:var(--bg)}.footer-inner{max-width:var(--wide);margin:auto;display:flex;flex-wrap:wrap;gap:25px;justify-content:space-between;font-size:13px}',
    '.preview-photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.preview-photo{margin:0}.preview-photo>div{background:var(--surface);border:1px dashed var(--line);min-height:250px;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-weight:750;font-size:11px;color:var(--accent)}.preview-photo figcaption{margin-top:7px;font-size:12px}',
    '@media(max-width:620px){.preview-photos{grid-template-columns:1fr}.preview-photo>div{min-height:190px}}',
    '@media(max-width:860px){.hero,.story,.faq{grid-template-columns:1fr}.hero{min-height:0}.art{height:280px}.story-art{height:300px}.cta{flex-direction:column;align-items:flex-start}}',
    '@media(max-width:600px){.navwrap{display:block}.navwrap nav{padding-top:17px;gap:14px}.section{padding:52px 19px}.hero h1{font-size:clamp(2.7rem,12vw,4.1rem)}.features-grid,.service-grid{grid-template-columns:1fr}.features-grid article{min-height:0}.art{height:230px}.cta{padding:40px 26px;margin:24px 8px}.story-art{height:240px}}',
    '@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{transition:none!important;animation:none!important}}',
  ].join('\n')+'\n';
  // All the tokens below come only from the closed, first-party theme catalog.
  const d=t.design;
  const grid={split:'1.1fr .9fr',centered:'1fr',stacked:'1fr',offset:'.82fr 1.18fr'}[d.layout];
  const art={frame:'rotate(-19deg)',grid:'rotate(0deg)',circle:'rotate(34deg)',stair:'skew(-12deg)',block:'rotate(0deg)',arch:'rotate(55deg)',wave:'skew(15deg)'}[d.art];
  const cards={
    paper:'background:var(--surface);border:1px solid var(--line);box-shadow:none',
    bordered:'background:transparent;border:2px solid var(--text);box-shadow:none',
    floating:'background:var(--surface);border:0;box-shadow:0 14px 45px color-mix(in srgb,var(--text),transparent 92%)'
  }[d.card];
  const extra=[
    '.hero{grid-template-columns:'+grid+'}',
    '.hero h1{letter-spacing:'+(d.tracking==='wide'?'-.085em':d.tracking==='tight'?'-.045em':'-.065em')+'}',
    '.art-shape{transform:'+art+'}',
    '.service-card,.features-grid article{'+cards+'}',
    '.section{padding-top:'+(d.density==='dense'?'63px':'110px')+';padding-bottom:'+(d.density==='dense'?'63px':'110px')+'}',
    d.layout==='centered'?'.hero{text-align:center;justify-items:center}.hero-copy{max-width:780px}.hero .actions{justify-content:center}.art{width:min(100%,740px)}':'',
    d.layout==='stacked'?'.hero{justify-items:stretch}.hero-copy{max-width:950px}.art{height:270px}':'',
    d.layout==='offset'?'.hero .hero-copy{order:2}.hero .art{order:1}':'',
    d.nav==='solid'?'nav a[aria-current]{background:var(--accent);color:white;padding:5px 9px;border:0;border-radius:var(--radius)}':'',
    d.art==='circle'?'.art-shape{border-radius:50%}.art-circle{border-width:55px}':'',
    d.art==='arch'?'.art-shape{border-radius:48% 48% 0 0}':'',
    d.art==='grid'?'.art{background:repeating-linear-gradient(0deg,var(--text) 0 35px,color-mix(in srgb,var(--text),white 15%) 36px 37px)}':'',
    d.art==='wave'?'.art-shape{border-radius:50% 15% 50% 18%}':'',
    '@media(max-width:860px){.hero{grid-template-columns:1fr}.hero .hero-copy,.hero .art{order:initial}.section{padding-top:65px;padding-bottom:65px}}',
    '@media(max-width:600px){.section{padding-top:52px;padding-bottom:52px}}'
  ].filter(Boolean).join('\n');
  return base+extra+'\n';
}
function pageHtml(site,page,theme,language){
  const depth=page.path==='/'?0:1;
  const ru=language==='ru';
  const nav=site.pages.map(p=>'<a href="'+esc(href(p.path,depth))+'"'+(p.path===page.path?' aria-current="page"':'')+'>'+esc(p.navigation.label)+'</a>').join('');
  return '<!doctype html><html lang="'+esc(language)+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'+
    '<title>'+esc(page.seo.title)+'</title><meta name="description" content="'+esc(page.seo.description)+'"><link rel="stylesheet" href="'+(depth?'../':'')+'assets/preview.css"></head><body>'+
    '<a class="skip" href="#content">'+(ru?'Перейти к содержимому':'Skip to content')+'</a><div class="notice">'+(ru?'Design Factory · предпросмотр, не опубликованный сайт CMS':'Design Factory standalone preview · not published CMS HTML')+'</div>'+
    '<header><div class="navwrap"><a class="brand" href="'+esc(href('/',depth))+'"><span>◆ </span>'+esc(site.title)+'</a><nav aria-label="'+(ru?'Навигация':'Site navigation')+'">'+nav+'</nav></div></header>'+
    '<main id="content">'+page.sections.map((s,i)=>renderSection(s,depth,i,language)).join('\n')+'</main><footer class="footer"><div class="footer-inner"><b>'+esc(site.title)+'</b><span>'+(ru?'Дизайн-предпросмотр · проверьте сведения перед публикацией':'Design preview — verify details before publishing')+'</span></div></footer></body></html>\n';
}
function writePreview(compiled,directory){
  const out=path.resolve(directory),parent=path.dirname(out);
  if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory())throw Error('Output parent must exist');
  if(fs.existsSync(out))throw Error('Refusing to overwrite existing directory');
  if(!compiled||!compiled.site||!compiled.project)throw Error('Missing compiled site');
  fs.mkdirSync(out);
  try{
    const records=[['site-v1.json',compiled.site],['design-spec.json',compiled.designSpec],['project.json',compiled.project],['owner-checklist.json',compiled.checklist],['inspection.json',compiled.inspection]];
    for(const [file,obj] of records)fs.writeFileSync(path.join(out,file),serialize(obj),{flag:'wx'});
    fs.mkdirSync(path.join(out,'assets'));
    fs.writeFileSync(path.join(out,'assets/preview.css'),css(compiled.project.theme),{flag:'wx'});
    for(const page of compiled.site.pages){
      const rel=page.path==='/'?'index.html':page.path.slice(1)+'index.html';
      if(!/^(?:[a-z0-9-]+\/)*index\.html$/.test(rel))throw Error('Unsafe output route');
      const file=path.join(out,rel);
      if(rel!=='index.html')fs.mkdirSync(path.dirname(file),{recursive:true});
      fs.writeFileSync(file,pageHtml(compiled.site,page,compiled.project.theme,compiled.project.language),{flag:'wx'});
    }
    return {directory:out,pages:compiled.site.pages.length};
  }catch(e){fs.rmSync(out,{recursive:true,force:true});throw e;}
}
module.exports=Object.freeze({esc,css,pageHtml,writePreview});

},
"themes":function(module,exports,require,__dirname){
'use strict';
// D2 closed visual theme catalog. Exact CMS fields are kept separate from
// standalone design-only tokens, which require a future PHP/Studio adapter.
const defaults={surface:'paper',spacing:'airy',align:'left'};
const textThemes=[
  {
    id:'editorial',label:'01 / Editorial Folio',cms:['#F6F2EA','#FFFFFF','#202B34','#A0442A','georgia',1120],
    appearance:['paper','airy','left'],headline:[64,48,35],
    design:['split','frame','paper','serif','wide','line','relaxed']
  },
  {
    id:'technical',label:'02 / Technical Blueprint',cms:['#EDF3F8','#FFFFFF','#172A43','#164F9D','arial',1260],
    appearance:['tint','normal','left'],headline:[60,43,30],
    design:['split','grid','bordered','sans','normal','solid','dense']
  },
  {
    id:'minimal',label:'03 / Contemporary Minimal',cms:['#FAFAF8','#FFFFFF','#222927','#245C49','system',1020],
    appearance:['default','airy','center'],headline:[52,40,30],
    design:['centered','circle','floating','sans','tight','line','relaxed']
  },
  {
    id:'noir',label:'04 / Noir Portfolio',cms:['#101217','#1C2029','#F4F2ED','#6936BD','georgia',1360],
    appearance:['dark','airy','left'],headline:[74,53,34],
    design:['offset','stair','bordered','serif','wide','solid','relaxed']
  },
  {
    id:'brutalist',label:'05 / Signal Brutal',cms:['#F8EBD2','#FFFFFF','#241D19','#AC3023','arial',1480],
    appearance:['tint','tight','left'],headline:[82,56,38],
    design:['stacked','block','bordered','sans','wide','solid','dense']
  },
  {
    id:'atelier',label:'06 / Atelier Maison',cms:['#F5EFF0','#FFFFFF','#38272D','#83415D','georgia',1120],
    appearance:['paper','airy','left'],headline:[69,48,34],
    design:['offset','arch','floating','serif','normal','line','relaxed']
  },
  {
    id:'verdant',label:'07 / Verdant Field',cms:['#EAF2EA','#FFFFFF','#1C382A','#1D5C3D','system',1180],
    appearance:['tint','airy','left'],headline:[61,45,31],
    design:['split','circle','paper','sans','normal','line','relaxed']
  },
  {
    id:'oceanic',label:'08 / Oceanic Clarity',cms:['#E6F2F4','#FFFFFF','#123742','#15566A','arial',1260],
    appearance:['tint','normal','left'],headline:[65,46,33],
    design:['stacked','wave','floating','sans','normal','solid','relaxed']
  },
  {
    id:'copper',label:'09 / Copper Workshop',cms:['#F6EEE3','#FFFFFF','#392B21','#895020','georgia',1200],
    appearance:['paper','normal','left'],headline:[68,49,33],
    design:['offset','block','paper','serif','tight','solid','dense']
  },
  {
    id:'plum',label:'10 / Modern Gallery',cms:['#F6EFF7','#FFFFFF','#372740','#703580','georgia',1140],
    appearance:['paper','airy','center'],headline:[64,46,31],
    design:['centered','arch','floating','serif','wide','line','relaxed']
  },
  {
    id:'cobalt',label:'11 / Cobalt Systems',cms:['#EBEFFB','#FFFFFF','#1A2B50','#253E99','system',1300],
    appearance:['tint','normal','left'],headline:[65,48,33],
    design:['split','grid','bordered','sans','tight','solid','dense']
  },
  {
    id:'mono',label:'12 / Monochrome Studio',cms:['#FFFFFF','#F7F7F7','#171717','#252525','arial',1100],
    appearance:['default','airy','center'],headline:[67,49,34],
    design:['stacked','frame','paper','sans','wide','line','relaxed']
  }
];
const enums={
  layout:['split','centered','stacked','offset'],
  art:['frame','grid','circle','stair','block','arch','wave'],
  card:['paper','bordered','floating'],
  display:['serif','sans'],
  tracking:['wide','normal','tight'],
  nav:['line','solid'],
  density:['relaxed','dense']
};
const hex=x=>typeof x==='string'&&/^#[0-9A-F]{6}$/i.test(x);
function contrast(a,b){
  const lum=h=>{
    const components=[1,3,5].map(pos=>{
      const v=parseInt(h.slice(pos,pos+2),16)/255;
      return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
    });
    return components[0]*0.2126+components[1]*0.7152+components[2]*0.0722;
  };
  const [x,y]=[lum(a),lum(b)].sort((a,b)=>b-a);
  return (x+0.05)/(y+0.05);
}
const themes={};
for(const spec of textThemes){
  const [background,surface,text,primary,font,maxWidth]=spec.cms;
  if(!/^[a-z][a-z0-9-]+$/.test(spec.id)||Object.hasOwn(themes,spec.id)
    ||![background,surface,text,primary].every(hex)||!['georgia','arial','system'].includes(font)
    ||!Number.isInteger(maxWidth)||maxWidth<680||maxWidth>1600)
    throw Error('Unsafe or duplicate Design Factory theme');
  if(contrast(background,text)<4.5||contrast(surface,text)<4.5||contrast('#FFFFFF',primary)<4.5)
    throw Error('Theme contrast below 4.5:1: '+spec.id);
  const [surf,spacing,align]=spec.appearance;
  if(!['default','paper','tint','dark'].includes(surf)||!['tight','normal','airy'].includes(spacing)||!['left','center'].includes(align))
    throw Error('Invalid CMS section appearance');
  const [desktop,tablet,mobile]=spec.headline;
  if(![desktop,tablet,mobile].every(v=>Number.isInteger(v)&&v>=10&&v<=120))
    throw Error('Invalid responsive headline');
  const keys=Object.keys(enums),design={};
  spec.design.forEach((v,i)=>{if(!enums[keys[i]].includes(v))throw Error('Unexpected design token');design[keys[i]]=v;});
  themes[spec.id]=Object.freeze({
    label:spec.label,
    cms:Object.freeze({background,surface,text,primary,font,maxWidth}),
    appearance:Object.freeze({surface:surf,spacing,align}),
    headline:Object.freeze({desktop:desktop+'px',tablet:tablet+'px',mobile:mobile+'px'}),
    design:Object.freeze(design),
    contrast:Object.freeze({body:Number(contrast(background,text).toFixed(2)),card:Number(contrast(surface,text).toFixed(2))}),
  });
}
module.exports=Object.freeze(themes);

},
"kits":function(module,exports,require,__dirname){
'use strict';
// D4 first-party sector kits. Four genuine pages per kit, never fabricated
// customer proofs or real contact details. All HTML components are registered.
const SEQUENCES=Object.freeze({
 editorial:{
  home:['company-hero','feature-highlights','service-grid','cta-banner'],
  services:['company-hero','service-grid','media-story','cta-banner'],
  approach:['company-hero','feature-highlights','faq-accordion','cta-banner'],
  contact:['company-hero','contact-panel','faq-accordion']
 },
 industrial:{
  home:['company-hero','media-story','feature-highlights','cta-banner'],
  services:['company-hero','service-grid','feature-highlights','cta-banner'],
  approach:['company-hero','media-story','faq-accordion'],
  contact:['company-hero','contact-panel','faq-accordion']
 },
 minimal:{
  home:['company-hero','feature-highlights','cta-banner'],
  services:['company-hero','service-grid','faq-accordion','cta-banner'],
  approach:['company-hero','media-story','feature-highlights','cta-banner'],
  contact:['company-hero','contact-panel','faq-accordion']
 },
 product:{
  home:['company-hero','service-grid','feature-highlights','cta-banner'],
  services:['company-hero','media-story','service-grid','cta-banner'],
  approach:['company-hero','faq-accordion','feature-highlights','cta-banner'],
  contact:['company-hero','contact-panel','faq-accordion']
 },
 story:{
  home:['company-hero','media-story','cta-banner','feature-highlights'],
  services:['company-hero','service-grid','media-story','cta-banner'],
  approach:['company-hero','media-story','feature-highlights','faq-accordion'],
  contact:['company-hero','faq-accordion','contact-panel']
 },
 directory:{
  home:['company-hero','service-grid','cta-banner'],
  services:['company-hero','service-grid','faq-accordion','cta-banner'],
  approach:['company-hero','feature-highlights','media-story','cta-banner'],
  contact:['company-hero','contact-panel','faq-accordion']
 }
});
const RAW=[
 {id:'agency',label:['Диджитал-агентство','Digital agency'],archetype:'editorial',theme:'editorial',
  ru:['Помогите клиентам понять ваши цифровые услуги','Опишите подтверждённые направления дизайна, разработки и поддержки.','Веб-разработка','Дизайн интерфейсов','Уточните процесс передачи макетов и задач.','Опишите реальные этапы запуска сайта.'],
  en:['Introduce your digital services clearly','Describe verified design, development and support services.','Website development','Interface design','Confirm how projects are handed off.','Add your actual site delivery process.']},
 {id:'industrial',label:['Производство и B2B','Manufacturing and B2B'],archetype:'industrial',theme:'technical',
  ru:['Представьте возможности вашего производства','Укажите реальные технические компетенции, материалы и условия.','Производственные операции','Инженерное сопровождение','Уточните объёмы производства и технологические ограничения.','Добавьте подтверждённое описание контроля качества.'],
  en:['Present your manufacturing capabilities','State verified capacities, materials and conditions.','Production services','Engineering support','Confirm technical constraints and capacity.','Describe your approved quality workflow.']},
 {id:'consulting',label:['Консалтинг','Consulting'],archetype:'minimal',theme:'minimal',
  ru:['Опишите задачи, с которыми вы помогаете','Уточните экспертизу и реальный порядок консультаций.','Анализ задачи','План действий','Разграничьте консультацию и реализацию.','Опишите фактический порядок взаимодействия.'],
  en:['Clarify the challenges you help address','Explain verified expertise and your consultation process.','Needs assessment','Action planning','Distinguish advice from implementation.','Describe your actual engagement steps.']},
 {id:'local-services',label:['Локальные профессиональные услуги','Local professional services'],archetype:'directory',theme:'verdant',
  ru:['Объясните, какую локальную услугу вы оказываете','Добавьте подтверждённую территорию работы и условия приёма.','Основная услуга','Дополнительная помощь','Уточните районы и способы записи.','Опишите реальные требования к заявке.']},
 {id:'saas',label:['SaaS и цифровые продукты','SaaS and digital products'],archetype:'product',theme:'cobalt',
  ru:['Покажите, какую задачу решает ваш продукт','Используйте проверенные функции, ограничения и условия доступа.','Функциональные возможности','Подключение и настройка','Не заявляйте неподтверждённые интеграции.','Опишите реальные шаги подключения продукта.']},
 {id:'logistics',label:['Логистика и доставка','Logistics and delivery'],archetype:'industrial',theme:'oceanic',
  ru:['Расскажите о направлениях вашей логистики','Укажите реальные маршруты, типы грузов и условия доставки.','Доставка и маршруты','Обработка отправлений','Подтвердите географию работы и ограничения.','Опишите реальный путь отправления от запроса до получения.'],
  en:['Explain your logistics service coverage','Confirm actual routes, shipment types and delivery terms.','Delivery routes','Shipment handling','Verify supported regions and restrictions.','Describe your real shipment workflow.']},
 {id:'architecture',label:['Архитектура и проектирование','Architecture and design'],archetype:'story',theme:'atelier',
  ru:['Представьте архитектурный подход через реальные проекты','Разделите концепцию, проектирование и авторское сопровождение.','Архитектурное проектирование','Дизайн пространства','Не используйте вымышленные визуализации как реальные проекты.','Опишите фактические этапы проектирования.']},
 {id:'education',label:['Образование и курсы','Education and courses'],archetype:'product',theme:'plum',
  ru:['Покажите содержание вашей образовательной программы','Подтвердите формат, программу и требования к участникам.','Учебные направления','Формат занятий','Не заявляйте аккредитации или результаты без доказательств.','Опишите действительный формат изучения материала.']},
 {id:'portfolio',label:['Личное портфолио','Personal portfolio'],archetype:'story',theme:'noir',
  ru:['Расскажите о собственной специализации','Добавьте реальные работы и только разрешённые изображения.','Проекты и направления','Подход к работе','Не придумывайте клиентские проекты и достижения.','Опишите свой подтверждённый опыт без вымышленных цифр.']},
 {id:'restaurant',label:['Ресторан и меню (информация)','Restaurant information'],archetype:'editorial',theme:'copper',
  ru:['Представьте формат заведения без выдуманных обещаний','Укажите подтверждённые блюда, актуальные часы и адрес.','Меню и предложения','Информация для посетителей','Не обещайте бронирование, если его нет.','Подтвердите способы связи, условия посещения и меню.']},
 {id:'repair',label:['Ремонт и обслуживание','Repair and home services'],archetype:'directory',theme:'technical',
  ru:['Опишите услуги ремонта и обслуживания','Уточните реальные специализации, выезд и ограничения.','Диагностика и осмотр','Ремонтные работы','Указывайте только реальные условия гарантии.','Опишите проверенную последовательность обращения и ремонта.']},
 {id:'nonprofit',label:['Некоммерческий проект','Nonprofit organization'],archetype:'story',theme:'verdant',
  ru:['Расскажите о цели общественного проекта','Публикуйте проверенную миссию, программы и отчётность.','Программы и инициативы','Способы участия','Не придумывайте статистику помощи и партнёров.','Добавьте проверенную информацию об инициативах и прозрачности.']}
];
const VALID_COMPONENTS=new Set(['company-hero','feature-highlights','service-grid','media-story','faq-accordion','cta-banner','contact-panel']);
const out={};
for(const row of RAW){
 if(!/^[a-z][a-z0-9-]{2,79}$/.test(row.id)||Object.hasOwn(out,row.id)||!Object.hasOwn(SEQUENCES,row.archetype))
  throw Error('Unsafe kit entry');
 const seq=SEQUENCES[row.archetype];
 if(Object.keys(seq).join(',')!=='home,services,approach,contact')throw Error('Kit must have four ordered pages');
 if(Object.values(seq).some(a=>!Array.isArray(a)||a.length<3||a.some(c=>!VALID_COMPONENTS.has(c))))throw Error('Unregistered component');
 if(row.ru.length!==6||(row.en&&row.en.length!==6))throw Error('Incomplete sector copy');
 function copy(v){return Object.freeze({hero:v[0],description:v[1],serviceOne:v[2],serviceTwo:v[3],featureOne:v[4],storyCopy:v[5]});}
 out[row.id]=Object.freeze({
  label:Object.freeze({ru:row.label[0],en:row.label[1]}),archetype:row.archetype,
  theme:row.theme,sequences:seq,
  copy:Object.freeze({ru:copy(row.ru),...(row.en?{en:copy(row.en)}:{})}),
  bilingual:Boolean(row.en)
 });
}
if(Object.keys(out).length!==12||Object.values(out).filter(x=>x.bilingual).length<4)throw Error('Incomplete D4 catalog');
module.exports=Object.freeze(out);

},
"compositions":function(module,exports,require,__dirname){
'use strict';
// D3 catalog: 42 first-party composition patterns. Enhanced previews that
// cannot be expressed in current CMS are explicitly integration_required.
const GROUPS=[
 ['hero','First impression','company-hero',[
  ['hero-split','Split masthead','parallel','left','frame','airy'],
  ['hero-center','Centered statement','centered','center','orb','airy'],
  ['hero-offset','Asymmetric editorial','offset','left','arch','normal']]],
 ['benefits','Reasons to choose','feature-highlights',[
  ['benefits-bento','Large and small value blocks','bento','left','tiles','normal'],
  ['benefits-metrics','Editorial benefits','columns','center','rule','tight'],
  ['benefits-rail','Horizontal feature rail','rail','left','frame','airy']]],
 ['services','Service structure','service-grid',[
  ['services-cards','Service cards','cards','left','tiles','normal'],
  ['services-list','Large indexed list','stack','left','rule','airy'],
  ['services-sidebar','Sidebar directory','sidebar','left','frame','normal']]],
 ['process','Process','feature-highlights',[
  ['process-steps','Stepped workflow','steps','left','rule','normal'],
  ['process-track','Milestone track','rail','center','dots','airy'],
  ['process-vertical','Vertical method','stack','left','line','normal']]],
 ['team','People and culture','media-story',[
  ['team-portraits','Portrait placeholders','cards','left','portrait','normal'],
  ['team-editorial','People-first editorial','split','left','arch','airy'],
  ['team-roles','Role directory','sidebar','left','rule','tight']]],
 ['portfolio','Selected work','media-story',[
  ['portfolio-featured','Featured case-study placeholder','offset','left','frame','airy'],
  ['portfolio-gallery','Case study mosaic','mosaic','left','tiles','normal'],
  ['portfolio-index','Project directory','stack','left','rule','normal']]],
 ['pricing','Scope and terms','service-grid',[
  ['pricing-columns','Scope comparison','columns','left','tiles','normal'],
  ['pricing-table','Scope breakdown','table','left','rule','tight'],
  ['pricing-consult','Consultation-first layout','cards','center','frame','airy']]],
 ['testimonials','Customer voices','feature-highlights',[
  ['testimonials-quote','Verified quote feature','centered','center','quotes','airy'],
  ['testimonials-grid','Consent-based quote cards','cards','left','tiles','normal'],
  ['testimonials-rail','Quote collection rail','rail','left','rule','normal']]],
 ['faq','Questions and answers','faq-accordion',[
  ['faq-minimal','Native accessible accordion','stack','left','rule','normal'],
  ['faq-split','Questions with context','sidebar','left','line','airy'],
  ['faq-compact','Compact Q&A directory','columns','left','rule','tight']]],
 ['contact','Contact','contact-panel',[
  ['contact-split','Conversation split','split','left','frame','normal'],
  ['contact-center','Center-stage invitation','centered','center','orb','airy'],
  ['contact-directory','Contact channel directory','sidebar','left','rule','normal']]],
 ['cta','Call to action','cta-banner',[
  ['cta-band','Wide directional CTA','band','left','line','normal'],
  ['cta-card','Framed invitation','cards','left','frame','airy'],
  ['cta-minimal','Minimal call to action','centered','center','rule','airy']]],
 ['gallery','Photography and media','photo-gallery',[
  ['gallery-mosaic','Alternating mosaic','mosaic','left','frame','normal'],
  ['gallery-columns','Quiet photo columns','columns','center','tiles','airy'],
  ['gallery-rail','Scroll-snap photo strip','rail','left','frame','normal']]],
 ['trust','Credentials and references','feature-highlights',[
  ['trust-credentials','Verification checklist','stack','left','rule','normal'],
  ['trust-partners','Partner logo placeholders','columns','center','tiles','normal'],
  ['trust-facts','Owner-confirmed fact sheet','sidebar','left','frame','airy']]],
 ['editorial','Content and storytelling','media-story',[
  ['editorial-feature','Magazine cover story','split','left','arch','airy'],
  ['editorial-numbered','Numbered narrative','stack','left','rule','normal'],
  ['editorial-aside','Story with editorial aside','sidebar','left','frame','airy']]]
];
const REQUIREMENTS={
 hero:['verified headline','verified description'],benefits:['owner-approved advantages'],
 services:['confirmed list of real services'],process:['confirmed sequence of work'],
 team:['permission to use real names and photos'],portfolio:['permission to show completed projects'],
 pricing:['verified offer and pricing if displayed'],testimonials:['verbatim review with author consent'],
 faq:['fact-checked answers'],contact:['verified contact channels and privacy text'],
 cta:['owner-approved call to action'],gallery:['image rights, alt and captions'],
 trust:['independently verified partner names or certifications'],editorial:['owner-approved story']
};
const WARNINGS={
 testimonials:'Never fabricate testimonials, reviewers or client outcomes',
 pricing:'Never invent prices, discounts, deadlines or guarantees',
 team:'Never fabricate staff names, portraits or job titles',
 portfolio:'Never claim a fictitious completed client project',
 trust:'Never invent partners, awards, accreditations or metrics',
 gallery:'Do not use unlicensed images'
};
const PROPOSALS={
 process:'process-steps-v1',team:'team-directory-v1',portfolio:'case-studies-v1',
 pricing:'pricing-comparison-v1',testimonials:'verified-testimonials-v1',
 gallery:'responsive-gallery-v1',trust:'proof-register-v1',editorial:'editorial-content-v1'
};
const valid={
 layout:['parallel','centered','offset','bento','columns','rail','cards','stack','sidebar','steps','split','mosaic','table','band'],
 align:['left','center'],art:['frame','orb','arch','tiles','rule','dots','line','portrait','quotes'],
 density:['tight','normal','airy']
};
const seen=new Set(),compositions=[];
for(const [category,categoryLabel,cmsComponent,presets] of GROUPS){
 if(presets.length!==3)throw Error('Invalid pattern group');
 for(const [id,label,layout,align,art,density] of presets){
  if(!/^[a-z][a-z0-9-]{2,79}$/.test(id)||seen.has(id)||
    !valid.layout.includes(layout)||!valid.align.includes(align)||!valid.art.includes(art)||!valid.density.includes(density))
    throw Error('Invalid composition token');
  seen.add(id);
  const richer=Object.hasOwn(PROPOSALS,category);
  compositions.push(Object.freeze({
   id,category,label,categoryLabel,cmsComponent,status:richer?'integration_required':'supported',
   adapterProposal:richer?PROPOSALS[category]:null,layout,align,art,density,
   responsive:Object.freeze({desktop:'Composition-specific desktop composition',
     tablet:'Collapse split layouts; preserve semantic reading order',
     mobile:'Single-column, 44px controls and scroll-snap for optional rails'}),
   requirements:Object.freeze(REQUIREMENTS[category].slice()),
   a11y:'Semantic headings, keyboard focus, explicit placeholders; no decorative fake claims',
   fallback:richer?'Registered '+cmsComponent+' as semantic fallback only, without layout parity':
     'Registered '+cmsComponent+' as semantic component with standalone design-only CSS',
   warning:WARNINGS[category]||'Verify all owner claims before publishing'
  }));
 }
}
if(compositions.length!==42)throw Error('Incomplete composition catalogue');
function get(id){
 if(typeof id!=='string'||!seen.has(id))throw Error('Unknown composition ID');
 return compositions.find(x=>x.id===id);
}
function list(category){
 if(category!=null&&!GROUPS.some(x=>x[0]===category))throw Error('Unknown category');
 return category?compositions.filter(x=>x.category===category):compositions.slice();
}
module.exports=Object.freeze({FORMAT:'manufact-design-compositions-v1',
 GROUPS:Object.freeze(GROUPS),PROPOSALS:Object.freeze(PROPOSALS),
 compositions:Object.freeze(compositions),get,list});

},
"adapter":function(module,exports,require,__dirname){
'use strict';
// D3 adapter: supported subset ONLY, uses the actual Stage3 registered SDK.
// Richer D3 design/layout and proposed components are not injected into site-v1.
const sdk=require('../../sdk/contract.cjs');
const catalog=require('../catalog/compositions.cjs');
const {loadRegistry}=require('./compiler.cjs');
const {PROPOSALS}=catalog;
function fail(s){throw Error('COMPOSITION: '+s);}
function update(section,slot,key,value){
 const el=section.elements.find(x=>x.slot===slot);
 if(!el||!Object.hasOwn(el.values,key))fail('Undeclared value: '+slot+'/'+key);
 el.values[key]=value;
}
function defaultsFor(category,lang){
 const en=lang==='en';
 const text=(ru,english)=>en?english:ru;
 const common={
  heading:text('Подтвердите информацию','Confirm the details'),
  note:text('Замените демонстрационные подписи проверенными данными владельца.',
    'Replace sample copy with verified owner-provided facts.'),
  first:text('Пункт 1 — уточнить сведения','Item 1 — confirm details'),
  second:text('Пункт 2 — уточнить сведения','Item 2 — confirm details'),
  question:text('Как уточнить условия?','How can I confirm the terms?'),
  answer:text('Обратитесь за актуальной информацией.','Request the current details.')
 };
 const headings={
  hero:text('Опишите вашу работу','Describe your work'),
  benefits:text('С чем помогаем','How we can help'),
  services:text('Направления услуг','Service areas'),
  process:text('Как устроена работа','Our working process'),
  team:text('О команде','About the team'),
  portfolio:text('Примеры работ','Selected work'),
  pricing:text('Варианты сотрудничества','Working arrangements'),
  testimonials:text('Отзывы — только с согласия авторов','Testimonials — consent required'),
  faq:text('Частые вопросы','Frequently asked questions'),
  contact:text('Как связаться','How to get in touch'),
  cta:text('Обсудим вашу задачу','Discuss your project'),
  gallery:text('Медиатека','Image collection'),
  trust:text('Проверенные сведения','Verified information'),
  editorial:text('История и контекст','Story and context')
 };
 return {...common,heading:headings[category]};
}
function sectionFor(id,sectionId='df-showcase-section',language='ru',reg=loadRegistry()){
 const comp=catalog.get(id);
 if(typeof sectionId!=='string'||! /^[a-z][a-z0-9-]{2,79}$/.test(sectionId))fail('Invalid section ID');
 if(!['ru','en'].includes(language))fail('Invalid language');
 const def=reg.get(comp.cmsComponent);
 if(!def)fail('CMS component unavailable: '+comp.cmsComponent);
 const section=sdk.sectionFrom(def,sectionId);
 const t=defaultsFor(comp.category,language);
 const heading=section.elements.find(x=>x.slot==='heading');
 if(heading&&Object.hasOwn(heading.values,'content.text'))heading.values['content.text']=t.heading;
 if(comp.cmsComponent==='company-hero'){
  update(section,'summary','content.text',t.note);
  update(section,'action','content.text',language==='ru'?'Связаться':'Contact');
  update(section,'action','behavior.href','/contact/');
 }
 if(comp.cmsComponent==='feature-highlights'){
  update(section,'first','content.text',t.first);
  update(section,'second','content.text',t.second);
 }
 if(comp.cmsComponent==='service-grid'){
  // Honest editorial placeholders satisfy the registered repeater min=2.
  section.items=section.items.map((it,i)=>({
   id:sectionId+'-item-'+(i+1),
   values:{...it.values,'content.title':i?t.second:t.first,
    'content.text':t.note,'behavior.href':'/contact/'}
  }));
 }
 if(comp.cmsComponent==='media-story'){
  update(section,'copy','content.text',t.note);
  update(section,'action','content.text',language==='ru'?'Подробнее':'Learn more');
  update(section,'action','behavior.href','/contact/');
  // Blank media binding is permitted, but NEVER claim uploaded owner images.
 }
 if(comp.cmsComponent==='photo-gallery'){
  // Two properly typed empty slots. Real CMS export requires owner-approved photos.
  section.items=section.items.map((it,i)=>({id:sectionId+'-item-'+(i+1),
    values:{...it.values,'content.media':'','content.caption':''}}));
 }
 if(comp.cmsComponent==='faq-accordion'){
  section.items=section.items.map((it,i)=>({id:sectionId+'-item-'+(i+1),values:{
   ...it.values,'content.question':i?t.question:t.question,
   'content.answer':t.answer
  }}));
 }
 if(comp.cmsComponent==='cta-banner'){
  update(section,'summary','content.text',t.note);
  update(section,'primary','content.text',language==='ru'?'Связаться':'Contact');
  update(section,'primary','behavior.href','/contact/');
  update(section,'secondary','behavior.href','/services/');
 }
 if(comp.cmsComponent==='contact-panel'){
  update(section,'action','behavior.href','/contact/');
 }
 return section;
}
function compare(id){
 const c=catalog.get(id);
 return Object.freeze({
  composition:id,sourceFormat:catalog.FORMAT,targetFormat:sdk.FORMAT,
  status:c.status,component:c.cmsComponent,
  supportedFields:['component','manifestVersion','elements','items where declared',
    'section.id','page path and navigation assigned by host CMS'],
  integration_required:c.status==='integration_required'
   ?[c.adapterProposal,'layout token '+c.layout,'preview typography and media']:
    ['preview visual layout and CSS parity'],
  blocked:['invented owner facts','unknown site-v1 fields','unapproved media',
    'unverified prices and testimonials'],
  semanticFallback:'Can validate as registered component but NOT visually identical to rich standalone preview'
 });
}
function validateFallbacks(){
 const reg=loadRegistry();
 const siteCompiler=require('./compiler.cjs');
 let checked=0;
 for(const item of catalog.compositions){
  const site=siteCompiler.compile({format:siteCompiler.FORMAT,version:1,
    kit:'agency',theme:'editorial',language:'ru',facts:{}},reg).site;
  const suffix='df-'+item.id;
  // Replace first page's last section and its generated children, no global ID collision.
  site.pages[0].sections[site.pages[0].sections.length-1]=sectionFor(item.id,suffix,'ru',reg);
  sdk.validateSite(site,reg);
  if(sdk.inspectSite(site,reg).errors.length)fail('Broken fallback link: '+item.id);
  checked++;
 }
 return checked;
}
module.exports=Object.freeze({sectionFor,compare,validateFallbacks,PROPOSALS});

},
"bridge":function(module,exports,require,__dirname){
'use strict';
// D6 immutable bridge, not a CMS publish service. 100% first-party validators.
const sdk=require('../../sdk/contract.cjs');
const compiler=require('./compiler.cjs');
const adapter=require('./composition-adapter.cjs');
const catalog=require('../catalog/compositions.cjs');
const WORKSPACE='manufact-design-factory-workspace-v1';
const EXPORT='manufact-design-factory-export-v1';
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function exact(value,allowed,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).some(k=>!allowed.includes(k)))throw Error('D6: unknown '+label+' field');
}
function workspace(raw){
 if(raw&&raw.format===WORKSPACE){
  exact(raw,['format','version','project','composition'],'workspace');
  if(raw.version!==1)throw Error('D6: unsupported workspace version');
  const project=compiler.validateProject(raw.project);
  const id=raw.composition;
  if(id!==null)catalog.get(id);
  return {format:WORKSPACE,version:1,project,composition:id};
 }
 const project=compiler.migrate(raw);
 return {format:WORKSPACE,version:1,project,composition:null};
}
function build(input){
 const w=workspace(input);
 const compiled=compiler.compile(w.project);
 const reg=compiler.loadRegistry();
 let site=compiled.site,comp=null;
 if(w.composition){
  const section=adapter.sectionFor(w.composition,'df-selected-composition',w.project.language,reg);
  site.pages[0].sections[site.pages[0].sections.length-1]=section;
  site=sdk.validateSite(site,reg);
  comp=adapter.compare(w.composition);
 }
 const inspection=sdk.inspectSite(site,reg);
 if(inspection.errors.length)throw Error('D6: invalid local routes');
 const compatibility={
  format:'manufact-design-factory-compatibility-v1',
  supported:['registered components','typed values','repeater bounds','stable IDs','CMS theme','page SEO','navigation','local links'],
  integration_required:['pixel parity for CSS compositions','responsive custom design tokens','future image adapters and galleries','motion, if approved'],
  blocked:['unverified owner facts','unchecked contact channels','fabricated reviews or awards','unlicensed media','public release without manual acceptance'],
  composition:comp,source:['stage3/sdk/contract.cjs','stage3/components/*.json','stage3/server/PublicRenderer.php'],
  previewOnly:true,publishGate:'owner_review_required'
 };
 return {
  format:EXPORT,version:1,workspace:w,site,
  designSpec:compiled.designSpec,ownerChecklist:compiled.checklist,
  inspection,compatibility
 };
}
function validateBundle(raw){
 exact(raw,['format','version','workspace','site','designSpec','ownerChecklist','inspection','compatibility'],'export');
 if(raw.format!==EXPORT||raw.version!==1)throw Error('D6: unsupported export version');
 const normalized=build(raw.workspace);
 // Exact reproducibility is an integrity gate: no injecting unknown CMS fields,
 // undetected changes or replacing owner data after validation.
 for(const key of ['workspace','site','designSpec','ownerChecklist','inspection','compatibility'])
  if(JSON.stringify(raw[key])!==JSON.stringify(normalized[key]))throw Error('D6: changed '+key+' since generation');
 return normalized;
}
function importForCMS(raw){
 const validated=validateBundle(raw);
 return sdk.validateSite(validated.site,compiler.loadRegistry());
}
module.exports=Object.freeze({WORKSPACE,EXPORT,workspace,build,validateBundle,importForCMS});

}
};
const modules=Object.create(null);
const names={
'../../sdk/contract.cjs':'sdk','../catalog/themes.cjs':'themes','../catalog/kits.cjs':'kits',
'../catalog/compositions.cjs':'compositions','./compiler.cjs':'compiler',
'./preview.cjs':'preview','./composition-adapter.cjs':'adapter','./bridge.cjs':'bridge'
};
const safeFS=Object.freeze({readFileSync:function(p){const file=String(p).split("/").pop();if(!/^[a-z][a-z0-9-]*\.json$/.test(file))throw Error("Unsupported bundled manifest path");const id=file.slice(0,-5);if(!Object.prototype.hasOwnProperty.call(manifestBytes,id))throw Error("Missing manifest "+id);return manifestBytes[id];}});
const safePath=Object.freeze({join:(...p)=>p.join("/"),resolve:(...p)=>p.join("/")});
function load(id){if(modules[id])return modules[id].exports;const factory=moduleFactories[id];if(!factory)throw Error("Unknown factory "+id);const module={exports:{}};modules[id]=module;function request(p){if(p==="node:fs")return safeFS;if(p==="node:path")return safePath;const target=names[p];if(!target)throw Error("Blocked dependency "+p);return load(target)}factory(module,module.exports,request,"/stage3/design-factory/lib");return module.exports;}
const api=Object.freeze({sdk:load("sdk"),compiler:load("compiler"),preview:load("preview"),themes:load("themes"),kits:load("kits"),compositions:load("compositions"),adapter:load("adapter"),bridge:load("bridge")});
Object.defineProperty(root,"DesignFactory",{value:api,writable:false,configurable:false});
})(globalThis);
