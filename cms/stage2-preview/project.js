'use strict';
/**
 * MULTI-PAGE Stage2 offline UX mock only. This is not a production schema,
 * website publishing, or an approved Stage3 content model.
 */
(()=>{
  const C=window.CmsPreviewContent;
  const format='ai-site-cms-stage2-multipage-preview-v2';
  const MAX_PAGES=8;
  let counter=1;
  const newId=()=> 'page-'+Date.now().toString(36)+'-'+(counter++).toString(36);
  const allowedKeys=(x,keys)=>Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
  function pageFromLegacy(doc){
    const v=C.validate(doc);
    return {id:newId(),title:'Главная',slug:'',seoTitle:v.siteTitle.slice(0,70),
      seoDescription:'Демонстрационный проект сайта и редактора AI Site CMS.',
      sections:v.sections};
  }
  function template(){
    const d=C.template();
    return {format,siteTitle:d.siteTitle,theme:d.theme,pages:[pageFromLegacy(d)]};
  }
  function validate(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)
      ||!allowedKeys(raw,['format','siteTitle','theme','pages'])
      ||raw.format!==format
      ||typeof raw.siteTitle!=='string'||raw.siteTitle.length<1||raw.siteTitle.length>100
      ||!Object.hasOwn(C.palette,raw.theme)
      ||!Array.isArray(raw.pages)||raw.pages.length<1||raw.pages.length>MAX_PAGES)
      throw Error('Неизвестный формат многостраничного проекта');
    const ids=new Set(),slugs=new Set();
    let homepageCount=0;
    for(const page of raw.pages){
      if(!page||typeof page!=='object'||Array.isArray(page)
        ||!allowedKeys(page,['id','title','slug','seoTitle','seoDescription','sections'])
        ||typeof page.id!=='string'||!/^page-[a-z0-9-]{5,48}$/.test(page.id)||ids.has(page.id)
        ||typeof page.title!=='string'||page.title.length<1||page.title.length>90
        ||typeof page.slug!=='string'||(page.slug!==''&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug))||page.slug.length>70||slugs.has(page.slug)
        ||typeof page.seoTitle!=='string'||page.seoTitle.length<1||page.seoTitle.length>70
        ||typeof page.seoDescription!=='string'||page.seoDescription.length>180
        ||page.seoDescription.includes('\0')||page.seoTitle.includes('\0')||page.title.includes('\0'))
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
      const doc=C.validate(raw);
      return validate({format,siteTitle:doc.siteTitle,theme:doc.theme,pages:[pageFromLegacy(doc)]});
    }
    return validate(raw);
  }
  function nextSlug(project,base='page'){
    let i=1,slug=base;
    while(project.pages.some(p=>p.slug===slug)){
      i++;slug=base+'-'+i;
    }
    return slug;
  }
  function createPage(project,source){
    if(project.pages.length>=MAX_PAGES)throw Error('Максимум восемь страниц');
    const from=source||project.pages[0],slug=nextSlug(project,source?'copy':'page');
    return {id:newId(),title:source?from.title.slice(0,80)+' (копия)':'Новая страница',
      slug,seoTitle:source?from.seoTitle:('Новая страница — '+project.siteTitle).slice(0,70),
      seoDescription:source?from.seoDescription:'',
      sections:source?from.sections.map(s=>({...structuredClone(s),id:C.createSection(s.type).id})):
        [C.createSection('hero'),C.createSection('contact')]};
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
    const config=configs[kind];
    if(!config)throw Error('Неизвестная заготовка');
    const result=template();result.siteTitle=config.name;result.theme=config.theme;
    result.pages=config.pages.map(([title,slug,seoTitle,types],i)=>({
      id:i===0?result.pages[0].id:newId(),title,slug,seoTitle,
      seoDescription:'Демонстрационная страница «'+title+'». Замените описание своим текстом перед использованием.',
      sections:types.map(type=>{
        const s=C.createSection(type);
        if(type==='hero'){s.props.title=i===0?config.name:title;s.props.eyebrow='ДЕМО САЙТ · РЕДАКТИРУЕМЫЙ БЛОК';}
        return s;
      })
    }));
    return validate(result);
  }
  function audit(input){
    const doc=validate(input),warnings=[],seen=new Map();
    for(const pg of doc.pages){
      const add=(code,message)=>warnings.push({pageId:pg.id,pageTitle:pg.title,code,message});
      if(pg.seoTitle.trim().length<20)add('title','Уточните короткий SEO title');
      if(pg.seoDescription.trim().length<70)add('description','Добавьте информативное SEO description');
      if(!pg.sections.some(s=>s.type==='hero'))add('heading','Нет главного блока hero: проверьте заголовок H1');
      if(!pg.sections.some(s=>s.type==='contact'||s.type==='leadform'))add('contact','Нет блока связи или заявки');
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
    format,MAX_PAGES,template,normalize,validate,createPage,pageDoc,starter,audit
  })});
})();
