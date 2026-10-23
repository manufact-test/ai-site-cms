'use strict';
/*
 * Stage2 offline, deterministic site-from-brief prototype. Not AI generation,
 * not production CMS, not a publisher. Text is only provided by the reviewer.
 */
(()=>{
  const P=window.CmsPreviewProject,C=window.CmsPreviewContent,Q=window.CmsPreviewRepeaters;
  const keys=['kind','company','offering','audience','benefit','proof','email','phone','address'];
  const optional=['offerings','steps','questions'];
  const detailRules=Object.freeze({
    offerings:{name:'Услуги и товары',labelMax:110,textMax:250,limit:8},
    steps:{name:'Этапы работы',labelMax:110,textMax:240,limit:8},
    questions:{name:'Вопросы и ответы',labelMax:160,textMax:400,limit:8}
  });
  const max={company:90,offering:120,audience:130,benefit:260,proof:130,
    email:160,phone:25,address:240};
  const names={industrial:'Промышленная компания',agency:'Услуги и разработка',products:'Товары и каталог'};
  const trim=(value,limit)=>String(value||'').trim().slice(0,limit);
  const tidy=value=>String(value||'').trim().replace(/\s+/g,' ');
  // No generative claims: every line is a named fact supplied by the reviewer.
  function parseGroup(value,group){
    const rule=detailRules[group];
    if(!rule||typeof value!=='string'||value.length>3400||value.includes('\0'))
      throw Error('Некорректный список: '+group);
    if(!value.trim())return [];
    const lines=value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    if(lines.length>rule.limit)throw Error(rule.name+': максимум '+rule.limit+' строк');
    return lines.map((line,index)=>{
      const parts=line.split('|');
      if(parts.length!==2||!parts[0].trim()||!parts[1].trim())
        throw Error(rule.name+', строка '+(index+1)+': укажите название | описание');
      const title=tidy(parts[0]),text=tidy(parts[1]);
      if(title.length>rule.labelMax||text.length>rule.textMax)
        throw Error(rule.name+', строка '+(index+1)+': слишком длинный текст');
      return {title,text};
    });
  }
  function details(input){
    if(!input||typeof input!=='object'||Array.isArray(input))
      throw Error('Неверные сведения о компании');
    return Object.fromEntries(optional.map(key=>[key,parseGroup(input[key]??'',key)]));
  }
  function normalize(input){
    if(!input||typeof input!=='object'||Array.isArray(input)||
      Object.keys(input).some(key=>!keys.includes(key)&&!optional.includes(key))||
      keys.some(key=>!Object.hasOwn(input,key)))
      throw Error('Неверный состав брифа');
    const out={};
    for(const key of keys){
      if(typeof input[key]!=='string'||input[key].includes('\0')||input[key].length>max[key]+12&&key!=='kind')
        throw Error('Недопустимое значение поля: '+key);
      out[key]=tidy(input[key]);
      if(key!=='kind'&&out[key].length>max[key])
        throw Error('Слишком длинное поле: '+key);
    }
    if(!Object.hasOwn(names,out.kind))throw Error('Неизвестное направление сайта');
    for(const key of ['company','offering','audience','benefit']){
      if(out[key].length<3)throw Error('Заполните поле: '+key);
    }
    if(!out.email&&!out.phone)throw Error('Нужен хотя бы один контакт: телефон или email');
    return {...out,...details(input)};
  }
  function build(source){
    const b=normalize(source);
    const project=P.starter(b.kind);
    project.siteTitle=b.company;
    project.settings.headerNote=trim(b.offering,120);
    project.settings.footerNote=trim('© '+b.company+'. Контактная информация для связи.',180);
    project.contacts={email:b.email,phone:b.phone,address:b.address};
    const benefit=()=>b.benefit.replace(/[.!?]+$/,'');
    const statement=()=>trim(b.offering+'. Для '+b.audience+'. '+benefit()+'.',480);
    const variants={
      features:[
        ['Направление',b.offering],
        ['Для кого',b.audience],
        ['Главное преимущество',b.benefit]],
      services:[
        [b.offering,'Основное предложение компании. Уточните состав и стоимость услуг.'],
        ['Для '+b.audience,'Расскажите, какие задачи аудитории помогает решить предложение.'],
        ['Условия работы',b.benefit]],
      catalog:[
        [b.offering,'Подробный ассортимент и характеристики необходимо указать перед публикацией.'],
        ['Дополнительные позиции','Добавьте подтверждённые товары и фотографии.'],
        ['Параметры и варианты','Проверьте модели, размеры и комплектацию.']],
      process:[
        ['Обсуждение задачи','Уточните, что требуется для '+b.audience+'.'],
        ['Подбор предложения',b.offering+'. Согласуйте характеристики и детали.'],
        ['Следующий шаг','Запросите индивидуальную информацию и условия.']],
      faq:[
        ['Чем занимается '+b.company+'?',b.offering+'. '+benefit()+'.'],
        ['Для кого предназначено предложение?','Для '+b.audience+'.'],
        ['Как связаться с компанией?','Используйте телефон или email в контактах сайта.']]
    };
    // Add a factual FAQ to the last page when the selected site type lacks it.
    if(b.questions.length){
      const finalPage=project.pages[project.pages.length-1];
      if(!finalPage.sections.some(section=>section.type==='faq')){
        const faq=C.createSection('faq');
        const contactIndex=finalPage.sections.findIndex(section=>
          section.type==='contact'||section.type==='leadform');
        finalPage.sections.splice(contactIndex<0?finalPage.sections.length:contactIndex,0,faq);
        finalPage.repeaters[faq.id]=Q.seed(faq);
      }
    }
    const collect=(section,page)=>{
      const facts=section.type==='services'||section.type==='catalog'?b.offerings:
        section.type==='process'?b.steps:section.type==='faq'?b.questions:[];
      const chosen=page.slug===''&&facts.length>3?facts.slice(0,3):facts;
      if(!chosen.length)return null;
      const rule=Q.definitions[section.type];
      return chosen.map((entry,i)=>({
        id:page.repeaters[section.id]?.[i]?.id||Q.blank(section.type).id,
        title:trim(entry.title,rule.limit),text:trim(entry.text,rule.detailLimit),image:''
      }));
    };
    for(const page of project.pages){
      // No fabricated performance metrics, customers or testimonials.
      for(const section of page.sections.filter(s=>s.type==='metrics'||s.type==='quote')){
        delete page.repeaters[section.id];
      }
      page.sections=page.sections.filter(s=>!['metrics','quote'].includes(s.type));
      if(!page.sections.some(s=>s.type==='hero')){
        page.sections.unshift(C.createSection('hero'));
      }
      page.seoTitle=trim((page.slug?page.title+' — ':'')+b.company+' | '+b.offering,70);
      page.seoDescription=trim(statement(),180);
      for(const section of page.sections){
        const p=section.props,fields=C.definitions[section.type].fields;
        const set=(field,value)=>{
          if(fields[field])p[field]=trim(value,fields[field].maxLength);
        };
        if(section.type==='hero'){
          set('eyebrow',b.offering);
          set('title',page.slug?page.title+' — '+b.company:b.company+' — '+b.offering);
          set('description',statement());
          set('action','Связаться');
          set('highlight',b.proof||'Уточните предложение и условия напрямую');
        }else if(section.type==='story'){
          set('eyebrow','О КОМПАНИИ');
          set('title','О компании '+b.company);
          set('paragraph',b.company+' — '+b.offering+'. Наше предложение предназначено для '+b.audience+'. '+benefit()+'.');
          set('stat',b.proof?'Факт':'Информация');
          set('statLabel',b.proof||'Добавьте подтверждённые факты о компании перед публикацией.');
        }else if(section.type==='contact'){
          set('eyebrow','СВЯЗАТЬСЯ');
          set('title','Обсудите задачу с '+b.company);
          set('description',b.offering+'. '+benefit()+'. Контакты указаны на сайте.');
          set('action',b.email?'Написать нам':'Позвонить');
        }else if(section.type==='leadform'){
          set('eyebrow','КОНТАКТЫ');
          set('title','Обсудить '+b.offering);
          set('description','Эта форма — только макет. Данные не отправляются. Используйте реальные контакты компании на сайте.');
          set('button','Форма пока не работает');
        }else if(variants[section.type]){
          set('eyebrow',section.type==='catalog'?'ПРЕДЛОЖЕНИЯ':'ИНФОРМАЦИЯ');
          if(section.type==='features')set('title','Что важно знать о '+b.company);
          if(section.type==='services')set('title','Направления работы');
          if(section.type==='catalog')set('title','Продукция и предложения');
          if(section.type==='process')set('title','Как обсудить проект');
          if(section.type==='faq')set('title','Частые вопросы');
          const rule=Q.definitions[section.type];
          page.repeaters[section.id]=collect(section,page)||variants[section.type].map(([title,text],i)=>({
            id:page.repeaters[section.id]?.[i]?.id||Q.blank(section.type).id,
            title:trim(title,rule.limit),text:trim(text,rule.detailLimit),image:''
          }));
          for(let i=0;i<page.repeaters[section.id].length;i++){
            const item=page.repeaters[section.id][i];
            set(rule.key+(i+1),item.title);set(rule.detail+(i+1),item.text);
          }
        }
      }
    }
    return P.validate(project);
  }
  Object.defineProperty(window,'CmsPreviewBrief',{value:Object.freeze({normalize,build,details})});
})();
