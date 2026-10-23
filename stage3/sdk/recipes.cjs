'use strict';
// Closed declarative composition. No provider, generated executable code or IO.
const C=require('./contract.cjs');
const FORMAT='manufact-site-recipe-v1';
const cp=x=>structuredClone(x);
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
function keys(x,allowed){if(!obj(x)||Object.keys(x).some(k=>!allowed.includes(k)))throw Error('Unknown recipe property');}
function text(x,max,empty=false){if(typeof x!=='string'||x.length>max||(!empty&&!x.trim())||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(x))throw Error('Invalid recipe text');return x.trim();}
function id(x){if(typeof x!=='string'||!/^[a-z][a-z0-9-]{2,47}$/.test(x))throw Error('Invalid recipe ID');return x;}
const PRESETS=Object.freeze({
  company:{label:'Компания · 4 страницы',pages:[['home','/','Главная',['company-hero','feature-highlights','contact-panel']],['offers','/offers/','Предложения',['company-hero','service-grid','contact-panel']],['about','/about/','О компании',['company-hero','feature-highlights','media-story']],['contact','/contact/','Контакты',['company-hero','lead-form-flex']]]},
  services:{label:'Услуги · 3 страницы',pages:[['home','/','Главная',['company-hero','feature-highlights','contact-panel']],['offers','/services/','Услуги',['company-hero','service-grid','lead-form-flex']],['contact','/contact/','Контакты',['company-hero','lead-form-flex']]]},
  portfolio:{label:'Портфолио · 3 страницы',pages:[['home','/','Главная',['company-hero','feature-highlights']],['offers','/projects/','Проекты',['company-hero','photo-gallery','contact-panel']],['contact','/contact/','Контакты',['company-hero','lead-form-flex']]]},
  landing:{label:'Одностраничный сайт',pages:[['home','/','Главная',['company-hero','feature-highlights','contact-panel','lead-form-flex']]]}
});
function suggest(task){text(task,3000,true);return /портфолио|portfolio|кейсы|projects/i.test(task)?'portfolio':/лендинг|landing|одностранич/i.test(task)?'landing':/услуг|service/i.test(task)?'services':'company';}
function plan({siteId,title,task='',preset=suggest(task),facts={}}){
  if(!Object.hasOwn(PRESETS,preset))throw Error('Unknown site recipe');
  const values={headline:'',description:'',offerings:[],details:[],contactLabel:'',contactUrl:'',...facts};
  const definition=cp(PRESETS[preset].pages);
  if(preset!=='landing'&&values.details.length&&!definition.some(p=>p[0]==='about'))definition.splice(definition.length-1,0,['about','/about/','О компании',['company-hero','feature-highlights','media-story']]);
  const pages=definition.map(([kind,path,name,components],pi)=>({
    id:'page-'+kind,path,title:name,kind,sections:components.flatMap((component,si)=>{
      // Split all supplied entries into pairs, preserving each fact verbatim.
      const count=component==='feature-highlights'?Math.max(1,Math.ceil((kind==='about'?values.details:preset==='landing'?[...values.offerings,...values.details]:values.offerings).length/2)):1;
      return Array.from({length:count},(_,j)=>({id:'section-'+pi+'-'+si+'-'+j,component}));
    })
  }));
  return validate({format:FORMAT,version:1,siteId,title,task,preset,facts:values,pages});
}
function validate(raw){
  keys(raw,['format','version','siteId','title','task','preset','facts','pages','sourceSiteId']);
  if(raw.format!==FORMAT||raw.version!==1||!Object.hasOwn(PRESETS,raw.preset))throw Error('Unknown recipe format/version');
  id(raw.siteId);text(raw.title,160);text(raw.task,3000,true);
  if(raw.sourceSiteId!==undefined)id(raw.sourceSiteId);
  const f=raw.facts;keys(f,['headline','description','offerings','details','contactLabel','contactUrl']);
  text(f.headline,180,true);text(f.description,420,true);text(f.contactLabel,100,true);text(f.contactUrl,300,true);
  for(const list of [f.offerings,f.details]){
    if(!Array.isArray(list)||list.length>12)throw Error('Maximum 12 facts per list');
    list.forEach(v=>text(v,280));
  }
  if(!Array.isArray(raw.pages)||!raw.pages.length||raw.pages.length>12)throw Error('Recipe requires 1–12 pages');
  const ids=new Set([raw.siteId]),paths=new Set();let total=0;
  for(const p of raw.pages){
    keys(p,['id','path','title','kind','sections']);id(p.id);text(p.title,160);
    if(!['home','offers','about','contact','custom'].includes(p.kind))throw Error('Unknown page purpose');
    if(!/^\/(?:[a-z0-9-]+\/)*$/.test(p.path)||paths.has(p.path)||ids.has(p.id))throw Error('Duplicate page ID or invalid path');
    ids.add(p.id);paths.add(p.path);
    if(!Array.isArray(p.sections)||!p.sections.length||p.sections.length>24)throw Error('Recipe requires 1–24 sections per page');
    for(const s of p.sections){
      keys(s,['id','component','templateId']);id(s.id);
      if(ids.has(s.id)||typeof s.component!=='string')throw Error('Duplicate section ID or missing component');
      ids.add(s.id);if(s.templateId!==undefined)id(s.templateId);
      if(++total>80)throw Error('Recipe section limit exceeded');
    }
  }
  if(!paths.has('/'))throw Error('Recipe must include home page');
  return cp(raw);
}
function compose(raw,manifests,{sourceSite=null,templates=[]}={}){
  const recipe=validate(raw),reg=C.registry(manifests),f=recipe.facts;
  let assets=[];
  if(recipe.sourceSiteId!==undefined){
    if(!sourceSite||sourceSite.siteId!==recipe.sourceSiteId||recipe.siteId!==recipe.sourceSiteId)throw Error('Templates require the same source site');
    assets=C.validateSite(sourceSite,reg).assets;
  }
  if(f.contactUrl){
    const check=C.sectionFrom(reg.get('contact-panel'),'section-contact-check',{action:{'behavior.href':f.contactUrl}});
    C.validateSite({format:'manufact-ai-site-v1',schemaVersion:1,siteId:'site-contact-check',title:'Contact check',assets:[],pages:[{id:'page-contact-check',path:'/',title:'Contact',sections:[check]}]},reg);
  }
  const warnings=[],bindings=[];
  const missing=(condition,message)=>{if(condition)warnings.push(message);};
  missing(!f.headline,'Главный заголовок: используется название сайта.');
  missing(!f.description,'Добавьте подтверждённое описание компании.');
  missing(!f.offerings.length,'Добавьте предложения / услуги / проекты.');
  missing(!f.details.length,'Добавьте подтверждённые сведения о компании.');
  missing(!f.contactUrl,'Контактная кнопка ведёт к форме сайта. Внешний контакт не указан.');
  const contactPage=recipe.pages.find(p=>p.kind==='contact');
  const formPage=contactPage||recipe.pages.find(p=>p.sections.some(s=>/^lead-form/.test(s.component)));
  const formSection=formPage?.sections.find(s=>/^lead-form/.test(s.component));
  const destination=formPage?(formPage.path+(formSection?'#'+formSection.id:'')):'/';
  const put=(s,slot,path,value)=>{const e=s.elements.find(x=>x.slot===slot);if(e&&Object.hasOwn(e.values,path))e.values[path]=cp(value);};
  const pages=recipe.pages.map(p=>{
    let pair=0;
    const original=sourceSite?.pages.find(old=>old.path===p.path);
    return {id:p.id,path:p.path,title:p.title,
      ...(original?.seo?{seo:cp(original.seo)}:{}),
      ...(original?.navigation?{navigation:cp(original.navigation)}:{}),
      sections:p.sections.map(spec=>{
      if(!reg.has(spec.component))throw Error('Unregistered recipe component: '+spec.component);
      if(spec.templateId){
        if(!recipe.sourceSiteId)throw Error('Cross-site templates are not allowed');
        const t=templates.find(t=>t.id===spec.templateId);
        if(!t||t.section.component!==spec.component||t.section.manifestVersion!==reg.get(spec.component).version)throw Error('Template missing or component version mismatch');
        bindings.push({sectionId:spec.id,templateId:t.id});
        return {...cp(t.section),id:spec.id,elements:t.section.elements.map(e=>({...cp(e),id:spec.id+'-'+e.slot})),
          ...(t.section.items?{items:t.section.items.map((item,i)=>({...cp(item),id:spec.id+'-item-'+(i+1)}))}:{})};
      }
      const section=C.sectionFrom(reg.get(spec.component),spec.id);
      if(spec.component==='company-hero'){
        put(section,'heading','content.text',p.kind==='home'?(f.headline||recipe.title):p.title);
        put(section,'summary','content.text',p.kind==='home'?f.description||'Добавьте подтверждённое описание компании.':
          p.kind==='about'?f.description||'Добавьте описание компании.':p.kind==='contact'?'Отправьте вопрос через форму ниже.':'Выберите предложение и отправьте запрос.');
        put(section,'action','content.text','Оставить заявку');put(section,'action','behavior.href',destination);
      }else if(spec.component==='service-grid'){
        put(section,'heading','content.text',p.title);
        const entries=f.offerings;
        const count=Math.max(reg.get('service-grid').repeat.min,entries.length);
        section.items=Array.from({length:count},(_,i)=>({
          id:spec.id+'-item-'+(i+1),
          values:{'content.title':entries[i]||'Добавьте название услуги',
            'content.text':i<entries.length?'Укажите подтверждённое описание.':'Добавьте описание.',
            'behavior.href':destination}
        }));
      }else if(spec.component==='media-story'){
        put(section,'heading','content.text','Познакомьтесь с нами');
        put(section,'copy','content.text',f.description||f.details.slice(0,2).join(' · ')||
          'Добавьте подтверждённую информацию о команде или проекте.');
        put(section,'action','content.text',f.contactLabel||'Связаться');
        put(section,'action','behavior.href',f.contactUrl||destination);
        warnings.push('При необходимости добавьте фотографию к истории компании.');
      }else if(spec.component==='photo-gallery'){
        put(section,'heading','content.text','Наши проекты');
        warnings.push('Загрузите собственные изображения в галерею.');
      }else if(spec.component==='feature-highlights'){
        const entries=p.kind==='about'?f.details:recipe.preset==='landing'?[...f.offerings,...f.details]:f.offerings;
        put(section,'heading','content.text',p.kind==='about'?'О компании':p.kind==='offers'?p.title:'Наши предложения');
        put(section,'first','content.text',entries[pair++]||'Добавьте подтверждённую информацию.');
        put(section,'second','content.text',entries[pair++]||'');
      }else if(spec.component==='contact-panel'){
        put(section,'heading','content.text','Свяжитесь с нами');
        put(section,'action','content.text',f.contactLabel||'Оставить заявку');
        put(section,'action','behavior.href',f.contactUrl||destination);
      }else if(spec.component==='image-showcase'){
        put(section,'heading','content.text','Фотографии');put(section,'caption','content.text','Добавьте собственное изображение и описание.');
        warnings.push('Загрузите собственные фотографии в медиабиблиотеку.');
      }
      return section;
    })};
  });
  const site=C.validateSite({format:'manufact-ai-site-v1',schemaVersion:1,siteId:recipe.siteId,title:recipe.title,assets,pages,
    ...(sourceSite?.theme?{theme:cp(sourceSite.theme)}:{})},reg);
  // Internal CTAs must resolve to a generated page or an existing section anchor.
  for(const p of site.pages)for(const s of p.sections)for(const el of [...s.elements,...(s.items||[])]){
    const href=el.values['behavior.href'];
    if(typeof href==='string'&&href.startsWith('/')&&!site.pages.some(q=>q.path===href.split('#')[0]&&(!href.includes('#')||q.sections.some(t=>t.id===href.split('#')[1]))))throw Error('Recipe contains broken internal link: '+href);
  }
  return {format:'manufact-site-composition-v1',mode:'deterministic',recipe,site,bindings,warnings:[...new Set(warnings)],notPublished:true};
}
module.exports=Object.freeze({FORMAT,PRESETS,suggest,plan,validate,compose});
