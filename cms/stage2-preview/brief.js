'use strict';
/*
 * Stage2 offline, deterministic site-from-brief prototype. Not AI generation,
 * not production CMS, not a publisher. Text is only provided by the reviewer.
 */
(()=>{
  const P=window.CmsPreviewProject,C=window.CmsPreviewContent,Q=window.CmsPreviewRepeaters;
  const keys=['kind','company','offering','audience','benefit','proof','email','phone','address'];
  const max={company:90,offering:120,audience:130,benefit:260,proof:130,
    email:160,phone:25,address:240};
  const names={industrial:'Промышленная компания',agency:'Услуги и разработка',products:'Товары и каталог'};
  const trim=(value,limit)=>String(value||'').trim().slice(0,limit);
  const tidy=value=>String(value||'').trim().replace(/\s+/g,' ');
  function normalize(input){
    if(!input||typeof input!=='object'||Array.isArray(input)||
      Object.keys(input).sort().join('|')!==keys.slice().sort().join('|'))
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
    return out;
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
          page.repeaters[section.id]=variants[section.type].map(([title,text],i)=>({
            id:page.repeaters[section.id]?.[i]?.id||Q.blank(section.type).id,
            title:trim(title,rule.limit),text:trim(text,rule.detailLimit),image:''
          }));
          for(let i=0;i<variants[section.type].length;i++){
            const item=page.repeaters[section.id][i];
            set(rule.key+(i+1),item.title);set(rule.detail+(i+1),item.text);
          }
        }
      }
    }
    return P.validate(project);
  }
  Object.defineProperty(window,'CmsPreviewBrief',{value:Object.freeze({normalize,build})});
})();
