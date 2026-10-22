'use strict';
/* Local Stage2 page recipes: only user-editable, clearly provisional client data. */
(()=>{
  const P=window.CmsPreviewProject,C=window.CmsPreviewContent,Q=window.CmsPreviewRepeaters,D=window.CmsPreviewArtDirection;
  const recipes=Object.freeze({
    about:{label:'О компании',slug:'about',parts:['hero','story','features','contact'],description:'История, направления, контакты'},
    services:{label:'Услуги',slug:'services',parts:['hero','services','process','faq','contact'],description:'Услуги, этапы, вопросы и контакты'},
    products:{label:'Каталог',slug:'catalog',parts:['hero','catalog','features','contact'],description:'Каталог с карточками и контактами'},
    contacts:{label:'Контакты',slug:'contacts',parts:['hero','contact','faq'],description:'Связь, адрес и ответы на вопросы'},
    process:{label:'Процесс работы',slug:'process',parts:['hero','process','faq','contact'],description:'Этапы взаимодействия и заявка'}
  });
  function create(input,kind,name,direction=''){
    const info=recipes[kind];
    if(!info)throw Error('Неизвестная структура страницы');
    const source=P.validate(input);
    if(source.pages.length>=P.MAX_PAGES)throw Error('Максимум восемь страниц');
    name=String(name||'').trim();
    if(name.length<2||name.length>90||name.includes('\0'))throw Error('Укажите название: 2–90 символов');
    if(direction&&!Object.hasOwn(D.profiles,direction))throw Error('Неизвестное дизайн-направление');
    const draft=structuredClone(source),page=P.createPage(draft);
    let slug=info.slug,suffix=2;
    while(draft.pages.some(p=>p.slug===slug))slug=info.slug+'-'+suffix++;
    page.title=name;page.slug=slug;
    page.seoTitle=(name+' — '+draft.siteTitle).slice(0,70);
    page.seoDescription=(name+' компании '+draft.siteTitle+'. Информация о предложениях и способах связи.').slice(0,180);
    page.sections=info.parts.map(C.createSection);
    page.repeaters={};page.sectionStyles={};page.sectionLayouts={};page.mediaSlots={};
    page.sectionActions={};page.libraryLinks={};page.hiddenSections=[];
    const company=draft.siteTitle;
    for(const section of page.sections){
      const p=section.props;
      switch(section.type){
        case 'hero':
          p.eyebrow=name.toUpperCase().slice(0,90);p.title=(name+' — '+company).slice(0,150);
          p.description='Подготовьте информацию для этой страницы. Все тексты, изображения и блоки можно отредактировать.';
          p.highlight=company.slice(0,130);p.action='Связаться с нами';break;
        case 'story':
          p.title=('Знакомство с '+company).slice(0,150);
          p.paragraph='Добавьте проверенные сведения об истории компании, деятельности и компетенциях.';
          p.stat='';p.statLabel='Здесь можно разместить подтверждённый факт или фотографию.';break;
        case 'features':
          p.title='Что важно знать';
          for(let i=1;i<=3;i++){p['item'+i]='Направление '+i;p['text'+i]='Замените текст реальной информацией компании.';}break;
        case 'services':
          p.title=('Услуги '+company).slice(0,150);
          for(let i=1;i<=3;i++){p['item'+i]='Услуга '+i;p['text'+i]='Уточните состав и условия услуги перед использованием.';}break;
        case 'catalog':
          p.title=('Каталог '+company).slice(0,150);
          for(let i=1;i<=3;i++){p['product'+i]='Товар '+i;p['info'+i]='Добавьте реальные характеристики и фотографию.';}break;
        case 'process':
          p.title='Как мы работаем';
          for(let i=1;i<=3;i++){p['step'+i]='Этап '+i;p['desc'+i]='Опишите подтверждённую последовательность работы.';}break;
        case 'faq':
          p.title='Частые вопросы';p.question1='Как получить информацию?';
          p.answer1='Свяжитесь с компанией по указанным контактам.';
          p.question2='Где узнать условия?';
          p.answer2='Уточните условия непосредственно у представителя компании.';break;
        case 'contact':
          p.eyebrow='КОНТАКТЫ';p.title=('Связаться с '+company).slice(0,150);
          p.description='Уточните детали и обсудите задачи напрямую с представителем компании.';
          p.action='Написать нам';break;
      }
      if(Q.definitions[section.type])page.repeaters[section.id]=Q.seed(section);
    }
    draft.pages.push(page);
    return {project:direction?D.compose(draft,direction,'page',page.id):P.validate(draft),pageId:page.id};
  }
  Object.defineProperty(window,'CmsPreviewPageRecipes',{value:Object.freeze({recipes,create})});
})();