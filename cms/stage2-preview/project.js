'use strict';
/* Stage2 offline design-review project v3; neither production schema nor publisher. */
(()=>{
  const C=window.CmsPreviewContent;
  const format='ai-site-cms-stage2-multipage-preview-v4';
  const previousFormat='ai-site-cms-stage2-multipage-preview-v3';
  const olderFormat='ai-site-cms-stage2-multipage-preview-v2';
  const MAX_PAGES=8;
  let counter=1;
  const newId=()=> 'page-'+Date.now().toString(36)+'-'+(counter++).toString(36);
  const allowedKeys=(x,keys)=>Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
  const settings=()=>({headerNote:'',footerNote:'Создано в демонстрации AI Site CMS',showNavigation:true});
  const design=()=>({accent:'',font:'system',radius:'soft',spacing:'comfortable',navigation:'standard'});
  const allowedDesign={
    font:['system','geometric','editorial'],
    radius:['sharp','soft','round'],
    spacing:['compact','comfortable','relaxed'],
    navigation:['standard','bordered','floating']
  };
  function pageFromLegacy(doc){
    const d=C.validate(doc);
    return {id:newId(),title:'Главная',slug:'',seoTitle:d.siteTitle.slice(0,70),
      seoDescription:'Демонстрационный проект сайта и редактора AI Site CMS.',
      inMenu:true,hiddenSections:[],sectionStyles:{},sections:d.sections};
  }
  function template(){
    const d=C.template();
    return {format,siteTitle:d.siteTitle,theme:d.theme,settings:settings(),design:design(),pages:[pageFromLegacy(d)]};
  }
  function validate(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)
      ||!allowedKeys(raw,['format','siteTitle','theme','settings','design','pages'])
      ||raw.format!==format
      ||typeof raw.siteTitle!=='string'||raw.siteTitle.length<1||raw.siteTitle.length>100
      ||!Object.hasOwn(C.palette,raw.theme)
      ||!raw.settings||typeof raw.settings!=='object'||Array.isArray(raw.settings)
      ||!allowedKeys(raw.settings,['headerNote','footerNote','showNavigation'])
      ||typeof raw.settings.headerNote!=='string'||raw.settings.headerNote.length>120||raw.settings.headerNote.includes('\0')
      ||typeof raw.settings.footerNote!=='string'||raw.settings.footerNote.length>180||raw.settings.footerNote.includes('\0')
      ||typeof raw.settings.showNavigation!=='boolean'
      ||!raw.design||typeof raw.design!=='object'||Array.isArray(raw.design)
      ||!allowedKeys(raw.design,['accent','font','radius','spacing','navigation'])
      ||typeof raw.design.accent!=='string'
      ||(raw.design.accent!==''&&!/^#[0-9a-f]{6}$/.test(raw.design.accent))
      ||Object.entries(allowedDesign).some(([key,values])=>!values.includes(raw.design[key]))
      ||!Array.isArray(raw.pages)||raw.pages.length<1||raw.pages.length>MAX_PAGES)
      throw Error('Неизвестный формат или настройки проекта');
    const ids=new Set(),slugs=new Set();
    let homepageCount=0;
    for(const page of raw.pages){
      if(!page||typeof page!=='object'||Array.isArray(page)
        ||!allowedKeys(page,['id','title','slug','seoTitle','seoDescription','inMenu','hiddenSections','sectionStyles','sections'])
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
          !page.sections.some(s=>s.id===id)||!['soft','dark','accent'].includes(style)))
        throw Error('Некорректные настройки или повторяющиеся адреса страниц');
      ids.add(page.id);slugs.add(page.slug);
      if(page.slug==='')homepageCount++;
      C.validate({format:C.format,siteTitle:raw.siteTitle,theme:raw.theme,sections:page.sections});
    }
    if(homepageCount!==1)throw Error('В проекте должна быть ровно одна главная страница');
    return structuredClone(raw);
  }
  function normalize(raw){
    if(raw&&raw.format===C.format){
      const d=C.validate(raw);
      return validate({format,siteTitle:d.siteTitle,theme:d.theme,settings:settings(),pages:[pageFromLegacy(d)]});
    }
    if(raw&&(raw.format===previousFormat||raw.format===olderFormat)){
      const next=structuredClone(raw),isV2=raw.format===olderFormat;
      next.format=format;next.design=design();
      if(isV2)next.settings=settings();
      next.pages=next.pages.map(p=>({...p,
        ...(isV2?{inMenu:true,hiddenSections:[]}:{}),sectionStyles:{}
      }));
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
    const sectionStyles={};
    if(source)from.sections.forEach((s,i)=>{
      if(from.sectionStyles[s.id])sectionStyles[sections[i].id]=from.sectionStyles[s.id];
    });
    return {id:newId(),title:source?from.title.slice(0,80)+' (копия)':'Новая страница',
      slug,seoTitle:source?from.seoTitle:('Новая страница — '+project.siteTitle).slice(0,70),
      seoDescription:source?from.seoDescription:'',inMenu:source?from.inMenu:true,
      hiddenSections,sectionStyles,sections};
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
      id:i===0?result.pages[0].id:newId(),title,slug,seoTitle,inMenu:true,hiddenSections:[],sectionStyles:{},
      seoDescription:'Демонстрационная страница «'+title+'». Замените описание своим текстом перед использованием.',
      sections:types.map(type=>{
        const s=C.createSection(type);
        if(type==='hero'){s.props.title=i===0?config.name:title;s.props.eyebrow='ДЕМО САЙТ · РЕДАКТИРУЕМЫЙ БЛОК';}
        return s;
      })
    }));
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
    return warnings;
  }
  function pageDoc(project,page){
    return {format:C.format,siteTitle:project.siteTitle,theme:project.theme,sections:page.sections};
  }
  Object.defineProperty(window,'CmsPreviewProject',{value:Object.freeze({
    format,previousFormat,olderFormat,MAX_PAGES,template,normalize,validate,createPage,pageDoc,starter,audit
  })});
})();
