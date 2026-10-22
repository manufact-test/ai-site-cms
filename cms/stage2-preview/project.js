'use strict';
/* Stage2 offline design-review project v10; neither production schema nor publisher. */
(()=>{
  const C=window.CmsPreviewContent,Q=window.CmsPreviewRepeaters,L=window.CmsPreviewLibrary;
  const format='ai-site-cms-stage2-multipage-preview-v10';
  const previousFormat='ai-site-cms-stage2-multipage-preview-v9';
  const legacyV8='ai-site-cms-stage2-multipage-preview-v8';
  const legacyV7='ai-site-cms-stage2-multipage-preview-v7';
  const legacyV6='ai-site-cms-stage2-multipage-preview-v6';
  const legacyV5='ai-site-cms-stage2-multipage-preview-v5';
  const olderFormat='ai-site-cms-stage2-multipage-preview-v4';
  const legacyV3='ai-site-cms-stage2-multipage-preview-v3';
  const legacyV2='ai-site-cms-stage2-multipage-preview-v2';
  const MAX_MEDIA=12;
  const MAX_MEDIA_CHARS=240000;
  const imageSlots={hero:['hero'],story:['photo'],catalog:['image1','image2','image3'],services:['image1','image2','image3']};
  const MAX_PAGES=8;
  let counter=1;
  const newId=()=> 'page-'+Date.now().toString(36)+'-'+(counter++).toString(36);
  const allowedKeys=(x,keys)=>Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
  const settings=()=>({headerNote:'',footerNote:'Создано в демонстрации AI Site CMS',showNavigation:true,
    publicUrl:'',logoAssetId:'',footerPageIds:[]});
  // Site export intentionally targets a root HTTPS hostname only, never file:, javascript:, http: or private paths.
  const publicUrlPattern=/^https:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  const design=()=>({accent:'',font:'system',radius:'soft',spacing:'comfortable',navigation:'standard',
    scale:'balanced',contentWidth:'standard'});
  const defaultLayout=()=>({width:'default',density:'default',align:'left',columns:'auto',reverse:false});
  const layouts={
    width:['default','narrow','wide'],density:['default','compact','spacious'],
    align:['left','center'],columns:['auto','two','three']
  };
  const grids=new Set(['features','services','catalog','metrics','process']);
  const contacts=()=>({email:'',phone:'',address:''});
  const phonePattern=/^\+?[0-9][0-9 ()-]{5,23}$/;
  const emailPattern=/^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
  const allowedDesign={
    font:['system','geometric','editorial'],
    radius:['sharp','soft','round'],
    spacing:['compact','comfortable','relaxed'],
    navigation:['standard','bordered','floating'],
    scale:['balanced','impact','restrained'],contentWidth:['standard','wide']
  };
  function pageFromLegacy(doc){
    const d=C.validate(doc);
    return {id:newId(),title:'Главная',slug:'',seoTitle:d.siteTitle.slice(0,70),
      seoDescription:'Демонстрационный проект сайта и редактора AI Site CMS.',
      inMenu:true,hiddenSections:[],sectionStyles:{},sectionLayouts:{},mediaSlots:{},sectionActions:{},libraryLinks:{},sections:d.sections};
  }
  function template(){
    const d=C.template();
    const page=Q.populate(pageFromLegacy(d));
    return {format,siteTitle:d.siteTitle,theme:d.theme,settings:settings(),design:design(),contacts:contacts(),media:[],library:[],pages:[page]};
  }
  function validate(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)
      ||!allowedKeys(raw,['format','siteTitle','theme','settings','design','contacts','media','library','pages'])
      ||raw.format!==format
      ||typeof raw.siteTitle!=='string'||raw.siteTitle.length<1||raw.siteTitle.length>100
      ||!Object.hasOwn(C.palette,raw.theme)
      ||!raw.settings||typeof raw.settings!=='object'||Array.isArray(raw.settings)
      ||!allowedKeys(raw.settings,['headerNote','footerNote','showNavigation','publicUrl','logoAssetId','footerPageIds'])
      ||typeof raw.settings.headerNote!=='string'||raw.settings.headerNote.length>120||raw.settings.headerNote.includes('\0')
      ||typeof raw.settings.footerNote!=='string'||raw.settings.footerNote.length>180||raw.settings.footerNote.includes('\0')
      ||typeof raw.settings.showNavigation!=='boolean'
      ||typeof raw.settings.publicUrl!=='string'||raw.settings.publicUrl.length>180
      ||(raw.settings.publicUrl!==''&&!publicUrlPattern.test(raw.settings.publicUrl))
      ||typeof raw.settings.logoAssetId!=='string'
      ||!Array.isArray(raw.settings.footerPageIds)||raw.settings.footerPageIds.length>4
      ||new Set(raw.settings.footerPageIds).size!==raw.settings.footerPageIds.length
      ||!raw.design||typeof raw.design!=='object'||Array.isArray(raw.design)
      ||!allowedKeys(raw.design,['accent','font','radius','spacing','navigation','scale','contentWidth'])
      ||typeof raw.design.accent!=='string'
      ||(raw.design.accent!==''&&!/^#[0-9a-f]{6}$/.test(raw.design.accent))
      ||Object.entries(allowedDesign).some(([key,values])=>!values.includes(raw.design[key]))
      ||!raw.contacts||typeof raw.contacts!=='object'||Array.isArray(raw.contacts)
      ||!allowedKeys(raw.contacts,['email','phone','address'])
      ||typeof raw.contacts.email!=='string'||raw.contacts.email.length>160
      ||(raw.contacts.email!==''&&!emailPattern.test(raw.contacts.email))
      ||typeof raw.contacts.phone!=='string'||raw.contacts.phone.length>25
      ||(raw.contacts.phone!==''&&!phonePattern.test(raw.contacts.phone))
      ||typeof raw.contacts.address!=='string'||raw.contacts.address.length>240
      ||raw.contacts.address.includes('\0')
      ||!Array.isArray(raw.media)||raw.media.length>MAX_MEDIA
      ||!Array.isArray(raw.pages)||raw.pages.length<1||raw.pages.length>MAX_PAGES)
      throw Error('Неизвестный формат или настройки проекта');
    const mediaIds=new Set();
    for(const asset of raw.media){
      if(!asset||typeof asset!=='object'||Array.isArray(asset)
        ||!allowedKeys(asset,['id','alt','data'])
        ||typeof asset.id!=='string'||!/^asset-[a-z0-9-]{5,48}$/.test(asset.id)
        ||mediaIds.has(asset.id)||typeof asset.alt!=='string'||asset.alt.length>160
        ||asset.alt.includes('\0')||typeof asset.data!=='string'
        ||asset.data.length>MAX_MEDIA_CHARS
        ||!/^data:image\/webp;base64,UklGR[A-Za-z0-9+/]*={0,2}$/.test(asset.data)
        ||(asset.data.length-23)%4!==0)
        throw Error('Некорректное изображение: разрешены только встроенные WebP-файлы');
      mediaIds.add(asset.id);
    }
    const allPageIds=new Set(raw.pages.map(p=>p&&p.id));
    if((raw.settings.logoAssetId&&!mediaIds.has(raw.settings.logoAssetId))
      ||raw.settings.footerPageIds.some(id=>typeof id!=='string'||!allPageIds.has(id)))
      throw Error('Логотип или ссылки подвала ссылаются на отсутствующие объекты');
    const ids=new Set(),slugs=new Set();
    let homepageCount=0;
    for(const page of raw.pages){
      if(!page||typeof page!=='object'||Array.isArray(page)
        ||!allowedKeys(page,['id','title','slug','seoTitle','seoDescription','inMenu','hiddenSections','sectionStyles','sectionLayouts','mediaSlots','sectionActions','repeaters','libraryLinks','sections'])
        ||typeof page.id!=='string'||!/^page-[a-z0-9-]{5,48}$/.test(page.id)||ids.has(page.id)
        ||typeof page.title!=='string'||page.title.length<1||page.title.length>90
        ||typeof page.slug!=='string'||(page.slug!==''&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug))||page.slug.length>70||slugs.has(page.slug)
        ||typeof page.seoTitle!=='string'||page.seoTitle.length<1||page.seoTitle.length>70
        ||typeof page.seoDescription!=='string'||page.seoDescription.length>180
        ||page.seoDescription.includes('\0')||page.seoTitle.includes('\0')||page.title.includes('\0')
        ||typeof page.inMenu!=='boolean'||(page.slug===''&&!page.inMenu)
        ||!Array.isArray(page.hiddenSections)||page.hiddenSections.length>11
        ||new Set(page.hiddenSections).size!==page.hiddenSections.length
        ||!Array.isArray(page.sections)
        ||page.hiddenSections.some(id=>typeof id!=='string'||!page.sections.some(s=>s.id===id))
        ||page.hiddenSections.length>=page.sections.length
        ||!page.sectionStyles||typeof page.sectionStyles!=='object'||Array.isArray(page.sectionStyles)
        ||Object.keys(page.sectionStyles).length>12
        ||Object.entries(page.sectionStyles).some(([id,style])=>
          !page.sections.some(s=>s.id===id)||!['soft','dark','accent'].includes(style))
        ||!page.sectionLayouts||typeof page.sectionLayouts!=='object'||Array.isArray(page.sectionLayouts)
        ||Object.keys(page.sectionLayouts).length>12
        ||Object.entries(page.sectionLayouts).some(([id,layout])=>{
          const section=page.sections.find(s=>s.id===id);
          return !section||!layout||typeof layout!=='object'||Array.isArray(layout)
            ||!allowedKeys(layout,['width','density','align','columns','reverse'])
            ||Object.entries(layouts).some(([field,values])=>!values.includes(layout[field]))
            ||typeof layout.reverse!=='boolean'
            ||(layout.reverse&&!['hero','story'].includes(section.type))
            ||(layout.columns!=='auto'&&!grids.has(section.type));
        })
        ||!page.mediaSlots||typeof page.mediaSlots!=='object'||Array.isArray(page.mediaSlots)
        ||Object.keys(page.mediaSlots).length>12
        ||Object.entries(page.mediaSlots).some(([sectionId,slots])=>{
          const section=page.sections.find(s=>s.id===sectionId);
          return !section||!imageSlots[section.type]||!slots||typeof slots!=='object'
            ||Array.isArray(slots)||Object.keys(slots).length>3
            ||Object.entries(slots).some(([slot,id])=>!imageSlots[section.type].includes(slot)||!mediaIds.has(id));
        })
        ||!page.sectionActions||typeof page.sectionActions!=='object'||Array.isArray(page.sectionActions)
        ||Object.keys(page.sectionActions).length>12
        ||Object.entries(page.sectionActions).some(([sectionId,action])=>{
          const section=page.sections.find(s=>s.id===sectionId);
          return !section||!['hero','contact'].includes(section.type)
            ||typeof action!=='string'||!(['email','phone'].includes(action)
              ||(action.startsWith('page:')&&allPageIds.has(action.slice(5))));
        }))
        throw Error('Некорректные настройки или повторяющиеся адреса страниц');
      ids.add(page.id);slugs.add(page.slug);
      if(page.slug==='')homepageCount++;
      C.validate({format:C.format,siteTitle:raw.siteTitle,theme:raw.theme,sections:page.sections});
      Q.validate(page,mediaIds);
    }
    if(homepageCount!==1)throw Error('В проекте должна быть ровно одна главная страница');
    L.validate(raw.library,raw.pages,raw.siteTitle,raw.theme,mediaIds);
    return structuredClone(raw);
  }
  function normalize(raw){
    if(raw&&raw.format===C.format){
      const d=C.validate(raw);
      return validate({format,siteTitle:d.siteTitle,theme:d.theme,settings:settings(),design:design(),contacts:contacts(),media:[],library:[],pages:[Q.populate(pageFromLegacy(d))]});
    }
    if(raw&&[previousFormat,legacyV8,legacyV7,legacyV6,legacyV5,olderFormat,legacyV3,legacyV2].includes(raw.format)){
      const next=structuredClone(raw),isV2=raw.format===legacyV2,
        beforeV5=[olderFormat,legacyV3,legacyV2].includes(raw.format),
        beforeV6=[legacyV5,olderFormat,legacyV3,legacyV2].includes(raw.format),
        beforeV7=[legacyV6,legacyV5,olderFormat,legacyV3,legacyV2].includes(raw.format);
      next.format=format;next.library=[];
      next.settings={...settings(),...(isV2?{}:next.settings)};
      next.design={...design(),...((isV2||raw.format===legacyV3)?{}:next.design)};
      if(beforeV7)next.contacts=contacts();
      if(beforeV5)next.media=[];
      // The v9 presentation fields are intentionally absent from historical backups.
      next.pages=next.pages.map(p=>{
        const upgraded={...p,
          ...(isV2?{inMenu:true,hiddenSections:[]}:{}),
          ...(isV2||raw.format===legacyV3?{sectionStyles:{}}:{}),
          ...(beforeV5?{mediaSlots:{}}:{}),
          ...(beforeV6?{sectionActions:{}}:{}),
          ...([legacyV8,legacyV7].includes(raw.format)||beforeV7?{sectionLayouts:{}}:{}),
          libraryLinks:{}
        };
        return beforeV7?Q.populate(upgraded):upgraded;
      });
      return validate(next);
    }
    return validate(raw);
  }
  function nextSlug(project,base='page'){
    let i=1,slug=base;
    while(project.pages.some(p=>p.slug===slug)){i++;slug=base+'-'+i;}
    return slug;
  }
  function createPage(project,source){
    if(project.pages.length>=MAX_PAGES)throw Error('Максимум восемь страниц');
    const from=source||project.pages[0],slug=nextSlug(project,source?'copy':'page');
    const sections=source?from.sections.map(s=>({...structuredClone(s),id:C.createSection(s.type).id})):
      [C.createSection('hero'),C.createSection('contact')];
    const hiddenSections=source?from.sections.reduce((hidden,s,i)=>{
      if(from.hiddenSections.includes(s.id))hidden.push(sections[i].id);
      return hidden;
    },[]):[];
    const sectionStyles={},sectionLayouts={},mediaSlots={},sectionActions={},repeaters={},libraryLinks={};
    if(source)from.sections.forEach((s,i)=>{
      if(from.sectionStyles[s.id])sectionStyles[sections[i].id]=from.sectionStyles[s.id];
      if(from.libraryLinks[s.id])libraryLinks[sections[i].id]=from.libraryLinks[s.id];
      if(from.sectionLayouts[s.id])sectionLayouts[sections[i].id]=structuredClone(from.sectionLayouts[s.id]);
      if(from.mediaSlots[s.id])mediaSlots[sections[i].id]=structuredClone(from.mediaSlots[s.id]);
      if(from.sectionActions[s.id])sectionActions[sections[i].id]=from.sectionActions[s.id];
      if(from.repeaters[s.id])repeaters[sections[i].id]=structuredClone(from.repeaters[s.id]).map(item=>({...item,id:Q.blank(s.type).id}));
    });
    if(!source)for(const section of sections){
      if(Q.definitions[section.type])repeaters[section.id]=Q.seed(section);
    }
    return {id:newId(),title:source?from.title.slice(0,80)+' (копия)':'Новая страница',
      slug,seoTitle:source?from.seoTitle:('Новая страница — '+project.siteTitle).slice(0,70),
      seoDescription:source?from.seoDescription:'',inMenu:source?from.inMenu:true,
      hiddenSections,sectionStyles,sectionLayouts,mediaSlots,sectionActions,repeaters,libraryLinks,sections};
  }
  function starter(kind){
    const configs={
      industrial:{name:'Промышленный завод',theme:'ocean',pages:[
        ['Главная','','Производство промышленного оборудования',['hero','metrics','services','process','contact']],
        ['Продукция','products','Каталог оборудования и продукции',['hero','catalog','features','leadform']],
        ['О заводе','about','О заводе и производственных возможностях',['story','metrics','process','contact']]]},
      agency:{name:'Диджитал-студия',theme:'coral',pages:[
        ['Главная','','Разработка сайтов и дизайн проектов',['hero','services','quote','contact']],
        ['Услуги','services','Услуги разработки и сопровождения',['services','process','features','leadform']],
        ['Контакты','contacts','Контакты студии и заказ проекта',['story','leadform','faq']]]},
      products:{name:'Каталог товаров',theme:'forest',pages:[
        ['Главная','','Товары и решения для бизнеса',['hero','catalog','features','contact']],
        ['Каталог','catalog','Ассортимент продукции',['catalog','services','leadform']],
        ['Доставка','delivery','Доставка и оформление заказа',['process','faq','contact']]]}
    };
    const config=configs[kind];if(!config)throw Error('Неизвестная заготовка');
    const result=template();result.siteTitle=config.name;result.theme=config.theme;
    result.design=kind==='industrial'?{...design(),radius:'sharp',navigation:'bordered'}:
      kind==='agency'?{...design(),font:'geometric',radius:'round',spacing:'relaxed',navigation:'floating'}:
      {...design(),font:'editorial',spacing:'compact'};
    result.pages=config.pages.map(([title,slug,seoTitle,types],i)=>({
      id:i===0?result.pages[0].id:newId(),title,slug,seoTitle,inMenu:true,hiddenSections:[],sectionStyles:{},sectionLayouts:{},mediaSlots:{},sectionActions:{},repeaters:{},libraryLinks:{},
      seoDescription:'Демонстрационная страница «'+title+'». Замените описание своим текстом перед использованием.',
      sections:types.map(type=>{
        const s=C.createSection(type);
        if(type==='hero'){s.props.title=i===0?config.name:title;s.props.eyebrow='ДЕМО САЙТ · РЕДАКТИРУЕМЫЙ БЛОК';}
        return s;
      })
    }));
    result.pages.forEach(Q.populate);
    return validate(result);
  }
  function audit(raw){
    const doc=validate(raw),warnings=[],seen=new Map();
    for(const pg of doc.pages){
      const add=(code,message)=>warnings.push({pageId:pg.id,pageTitle:pg.title,code,message});
      if(pg.seoTitle.trim().length<20)add('title','Уточните короткий SEO title');
      if(pg.seoDescription.trim().length<70)add('description','Добавьте информативное SEO description');
      const visible=pg.sections.filter(s=>!pg.hiddenSections.includes(s.id));
      if(!visible.some(s=>s.type==='hero'))add('heading','Нет видимого главного блока hero: проверьте заголовок H1');
      if(!visible.some(s=>s.type==='contact'||s.type==='leadform'))add('contact','Нет видимого блока связи или заявки');
      const canonical=pg.seoTitle.trim().toLowerCase();
      if(seen.has(canonical))add('duplicate','SEO title совпадает со страницей «'+seen.get(canonical)+'»');
      else seen.set(canonical,pg.title);
    }
    if(!doc.contacts.email&&!doc.contacts.phone){
      const home=doc.pages.find(p=>p.slug==='');
      warnings.push({pageId:home.id,pageTitle:home.title,code:'contacts',
        message:'Укажите email или телефон компании для рабочих кнопок связи'});
    }
    for(const pg of doc.pages){
      for(const [id,action] of Object.entries(pg.sectionActions)){
        if((action==='email'&&!doc.contacts.email)||(action==='phone'&&!doc.contacts.phone)){
          warnings.push({pageId:pg.id,pageTitle:pg.title,code:'action',
            message:'Кнопка секции '+id+' требует настроенного '+(action==='email'?'email':'телефона')});
        }
      }
    }
    return warnings;
  }
  function pageDoc(project,page){
    return {format:C.format,siteTitle:project.siteTitle,theme:project.theme,sections:page.sections};
  }
  function resolveMedia(project,page,exportLinks=false){
    const assets=new Map(project.media.map(item=>[item.id,item])),out={};
    for(const [sectionId,slots] of Object.entries(page.mediaSlots)){
      out[sectionId]={};
      for(const [slot,id] of Object.entries(slots)){
        const asset=assets.get(id);
        if(asset)out[sectionId][slot]={
          src:exportLinks?'media/'+asset.id+'.webp':asset.data,
          alt:asset.alt
        };
      }
    }
    return out;
  }
  function resolveItems(project,page,exportLinks=false){
    const assets=new Map(project.media.map(a=>[a.id,a])),out={};
    for(const [sectionId,items] of Object.entries(page.repeaters)){
      out[sectionId]=items.map(item=>{
        const media=assets.get(item.image);
        return {id:item.id,title:item.title,text:item.text,
          photo:media?{src:exportLinks?'media/'+media.id+'.webp':media.data,alt:media.alt}:null};
      });
    }
    return out;
  }
  function publicPageUrl(project,page){
    const base=project.settings.publicUrl;
    return base?base+'/'+(page.slug?page.slug+'.html':''):'';
  }
  function resolveBrand(project,exportLinks=false){
    const asset=project.media.find(x=>x.id===project.settings.logoAssetId);
    return asset?{src:exportLinks?'media/'+asset.id+'.webp':asset.data}:null;
  }
  function resolveFooterPages(project){
    return project.settings.footerPageIds.map(id=>project.pages.find(p=>p.id===id))
      .filter(Boolean).map(p=>({id:p.id,title:p.title,slug:p.slug}));
  }
  function resolveActions(project,page){
    const out={},c=project.contacts;
    const tel=c.phone.replace(/[^+0-9]/g,'');
    const link=action=>{
      if(action==='email')return c.email?{href:'mailto:'+c.email,type:'email'}:null;
      if(action==='phone')return tel?{href:'tel:'+tel,type:'phone'}:null;
      if(action.startsWith('page:')){
        const pg=project.pages.find(p=>p.id===action.slice(5));
        return pg?{href:(pg.slug||'index')+'.html',pageId:pg.id,type:'page'}:null;
      }
      return null;
    };
    const visible=p=>p.sections.filter(s=>!p.hiddenSections.includes(s.id));
    const anchor=s=>s.type==='contact'?'contact':'request';
    for(const section of page.sections){
      if(!['hero','contact'].includes(section.type))continue;
      const selected=page.sectionActions[section.id]||'auto';
      if(selected!=='auto'){out[section.id]=link(selected);continue;}
      if(section.type==='hero'){
        const here=visible(page).find(s=>s.id!==section.id&&['contact','leadform'].includes(s.type));
        if(here){out[section.id]={href:'#'+anchor(here),type:'anchor'};continue;}
        const other=project.pages.find(p=>p.id!==page.id&&visible(p).some(s=>['contact','leadform'].includes(s.type)));
        if(other){
          const target=visible(other).find(s=>['contact','leadform'].includes(s.type));
          out[section.id]={href:(other.slug||'index')+'.html#'+anchor(target),pageId:other.id,type:'page'};
          continue;
        }
      }
      out[section.id]=link('email')||link('phone');
    }
    return out;
  }
  Object.defineProperty(window,'CmsPreviewProject',{value:Object.freeze({
    format,previousFormat,legacyV8,legacyV7,legacyV6,legacyV5,olderFormat,legacyV3,legacyV2,MAX_PAGES,MAX_MEDIA,imageSlots,defaultLayout,layouts,template,normalize,validate,createPage,pageDoc,resolveMedia,resolveItems,resolveActions,publicPageUrl,resolveBrand,resolveFooterPages,starter,audit
  })});
})();
