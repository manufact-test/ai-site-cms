'use strict';
/**
 * Offline design-review document, NOT the Stage3 page schema or production API.
 * Static bundled sections and whitelisted theme; no arbitrary HTML/CSS/scripts.
 */
(() => {
  const format = 'ai-site-cms-stage2-product-preview-v1';
  const palette = Object.freeze({
    ocean:{accent:'#286cfa',deep:'#10213e',pale:'#eff5ff',name:'Океан'},
    forest:{accent:'#19836a',deep:'#173c34',pale:'#ebf7f1',name:'Лес'},
    coral:{accent:'#df614d',deep:'#4c2626',pale:'#fff1ed',name:'Коралл'}
  });
  const make=(label,icon,spec,values)=>({label,icon,
    fields:Object.fromEntries(Object.entries(spec).map(([key,[title,maxLength]])=>[key,{type:'string',title,maxLength}])),
    values});
  const definitions = Object.freeze({
    hero:{
      label:'Главный экран', icon:'✦',
      fields:{
        eyebrow:{type:'string',title:'Надзаголовок',maxLength:90},
        title:{type:'string',title:'Главный заголовок',maxLength:150},
        description:{type:'string',title:'Описание',maxLength:480},
        action:{type:'string',title:'Текст кнопки',maxLength:70},
        highlight:{type:'string',title:'Акцент справа',maxLength:130}
      },
      values:{eyebrow:'MANUFACT · DIGITAL',title:'Современный сайт для производства',description:'Помогаем промышленным компаниям понятнее рассказывать о продуктах и получать больше запросов.',action:'Обсудить проект',highlight:'Системный подход к каждому проекту'}
    },
    features:{
      label:'Преимущества',icon:'▦',
      fields:{
        eyebrow:{type:'string',title:'Надзаголовок',maxLength:90},
        title:{type:'string',title:'Заголовок секции',maxLength:150},
        item1:{type:'string',title:'Преимущество 1',maxLength:110},
        text1:{type:'string',title:'Описание 1',maxLength:280},
        item2:{type:'string',title:'Преимущество 2',maxLength:110},
        text2:{type:'string',title:'Описание 2',maxLength:280},
        item3:{type:'string',title:'Преимущество 3',maxLength:110},
        text3:{type:'string',title:'Описание 3',maxLength:280}
      },
      values:{eyebrow:'ПОЧЕМУ МЫ',title:'Важное — в деталях',item1:'Сильный дизайн',text1:'Структура и подача, которые помогают человеку разобраться.',item2:'Гибкая CMS',text2:'Ключевые тексты можно корректировать без разработчика.',item3:'Без лишнего',text3:'Простой путь от знакомства с компанией до обращения.'}
    },
    story:{
      label:'О компании',icon:'◫',
      fields:{
        eyebrow:{type:'string',title:'Надзаголовок',maxLength:90},
        title:{type:'string',title:'Заголовок',maxLength:150},
        paragraph:{type:'string',title:'Текст',maxLength:700},
        stat:{type:'string',title:'Цифра / факт',maxLength:45},
        statLabel:{type:'string',title:'Подпись к факту',maxLength:150}
      },
      values:{eyebrow:'О НАС',title:'Работаем с задачами бизнеса',paragraph:'Мы объединяем аналитику, тексты, дизайн и разработку в одну понятную систему. Каждый блок сайта имеет свою цель и может редактироваться.',stat:'01 / 01',statLabel:'Один связанный процесс: от структуры до запуска'}
    },
    quote:{
      label:'Отзыв',icon:'❝',
      fields:{
        quote:{type:'string',title:'Текст отзыва',maxLength:400},
        person:{type:'string',title:'Имя',maxLength:90},
        position:{type:'string',title:'Должность / компания',maxLength:110}
      },
      values:{quote:'На демонстрации сразу видно, что именно будет редактироваться. Так гораздо проще обсуждать будущий сайт.',person:'Пример отзыва',position:'Демонстрационные данные — не реальный клиент'}
    },
    faq:{
      label:'Вопросы и ответы',icon:'?',
      fields:{
        title:{type:'string',title:'Заголовок',maxLength:150},
        question1:{type:'string',title:'Вопрос 1',maxLength:160},
        answer1:{type:'string',title:'Ответ 1',maxLength:400},
        question2:{type:'string',title:'Вопрос 2',maxLength:160},
        answer2:{type:'string',title:'Ответ 2',maxLength:400}
      },
      values:{title:'Частые вопросы',question1:'Можно менять тексты самостоятельно?',answer1:'В этом прототипе — да, через визуальные поля и живой предпросмотр. Постоянное сохранение появится только после разработки защищённого API.',question2:'Это уже рабочая CMS?',answer2:'Нет, пока это отдельный локальный демонстратор интерфейса будущей CMS.'}
    },
    contact:{
      label:'Контакты / CTA',icon:'→',
      fields:{
        eyebrow:{type:'string',title:'Надзаголовок',maxLength:90},
        title:{type:'string',title:'Призыв',maxLength:150},
        description:{type:'string',title:'Описание',maxLength:350},
        action:{type:'string',title:'Подпись кнопки (демо)',maxLength:70}
      },
      values:{eyebrow:'ЕСТЬ ИДЕЯ?',title:'Обсудим ваш проект',description:'Оставьте запрос на вашем реальном сайте. В этом демонстраторе формы не отправляют данные.',action:'Связаться с нами'}
    },
    services:make('Услуги','◈',{
      eyebrow:['Надзаголовок',90],title:['Заголовок',150],
      item1:['Услуга 1',110],text1:['Описание 1',280],
      item2:['Услуга 2',110],text2:['Описание 2',280],
      item3:['Услуга 3',110],text3:['Описание 3',280]
    },{eyebrow:'НАПРАВЛЕНИЯ',title:'Наши услуги',item1:'Разработка',text1:'Проектируем и запускаем решения для бизнеса.',item2:'Дизайн',text2:'Делаем интерфейсы понятными пользователям.',item3:'Поддержка',text3:'Помогаем развивать сайт после запуска.'}),
    metrics:make('Цифры и факты','▤',{
      eyebrow:['Надзаголовок',90],title:['Заголовок',150],
      number1:['Число 1',40],label1:['Подпись 1',110],
      number2:['Число 2',40],label2:['Подпись 2',110],
      number3:['Число 3',40],label3:['Подпись 3',110]
    },{eyebrow:'В ЦИФРАХ',title:'Результат в цифрах',number1:'03',label1:'Рабочих этапа',number2:'100%',label2:'Внимания к задаче',number3:'01',label3:'Единая команда проекта'}),
    process:make('Этапы работы','↗',{
      eyebrow:['Надзаголовок',90],title:['Заголовок',150],
      step1:['Шаг 1',110],desc1:['Описание шага 1',240],
      step2:['Шаг 2',110],desc2:['Описание шага 2',240],
      step3:['Шаг 3',110],desc3:['Описание шага 3',240]
    },{eyebrow:'ПРОЦЕСС',title:'Как мы работаем',step1:'Обсуждаем задачу',desc1:'Согласовываем цели и ограничения.',step2:'Создаём решение',desc2:'Готовим структуру и дизайн.',step3:'Проверяем результат',desc3:'Собираем замечания и улучшаем.'}),
    catalog:make('Каталог продукции','▧',{
      eyebrow:['Надзаголовок',90],title:['Заголовок',150],
      product1:['Название продукта 1',110],info1:['Описание 1',260],
      product2:['Название продукта 2',110],info2:['Описание 2',260],
      product3:['Название продукта 3',110],info3:['Описание 3',260]
    },{eyebrow:'КАТАЛОГ',title:'Каталог продукции',product1:'Модель А',info1:'Добавьте характеристики первого товара.',product2:'Модель Б',info2:'Укажите назначение и варианты изделия.',product3:'Модель В',info3:'Покажите преимущества модели.'}),
    specs:make('Технические характеристики','≡',{
      eyebrow:['Надзаголовок',90],title:['Заголовок таблицы',150],
      item1:['Параметр 1',110],text1:['Значение 1',280],
      item2:['Параметр 2',110],text2:['Значение 2',280],
      item3:['Параметр 3',110],text3:['Значение 3',280]
    },{eyebrow:'ТЕХНИЧЕСКИЕ ДАННЫЕ',title:'Характеристики изделия',
      item1:'Назначение',text1:'Укажите назначение изделия',
      item2:'Материал',text2:'Укажите подтверждённый материал',
      item3:'Исполнение',text3:'Укажите доступные варианты'}),
    leadform:make('Форма заявки (демо)','✉',{
      eyebrow:['Надзаголовок',90],title:['Заголовок',150],
      description:['Описание',360],nameLabel:['Поле имени',65],
      contactLabel:['Поле контакта',65],button:['Текст кнопки',70]
    },{eyebrow:'ОБРАТНАЯ СВЯЗЬ',title:'Отправьте заявку',description:'Демонстрация будущей формы. Ввод и отправка отключены.',nameLabel:'Ваше имя',contactLabel:'Телефон или email',button:'Оставить заявку'})
  });
  const types=Object.keys(definitions);
  let next=1;
  const newId=()=> 'sec-'+Date.now().toString(36)+'-'+(next++).toString(36);
  function createSection(type) {
    if (!Object.prototype.hasOwnProperty.call(definitions,type)) throw Error('Неизвестный блок');
    return {id:newId(),type,props:structuredClone(definitions[type].values)};
  }
  function template(){
    return {format,siteTitle:'Новый сайт · Пример',theme:'ocean',
      sections:['hero','features','story','faq','contact'].map(createSection)};
  }
  function validate(raw) {
    if (!raw||typeof raw!=='object'||Array.isArray(raw)
        ||Object.keys(raw).sort().join('|')!=='format|sections|siteTitle|theme'
        ||raw.format!==format
        ||typeof raw.siteTitle!=='string'||raw.siteTitle.length<1||raw.siteTitle.length>100
        ||!Object.prototype.hasOwnProperty.call(palette,raw.theme)
        ||!Array.isArray(raw.sections)||raw.sections.length<1||raw.sections.length>12) {
      throw Error('Формат документа не поддерживается');
    }
    const ids=new Set();
    for(const item of raw.sections){
      if(!item||typeof item!=='object'||Array.isArray(item)
          ||Object.keys(item).sort().join('|')!=='id|props|type'
          ||typeof item.id!=='string'||!/^[a-z0-9-]{5,48}$/.test(item.id)
          ||ids.has(item.id)
          ||!Object.prototype.hasOwnProperty.call(definitions,item.type)
          ||!item.props||typeof item.props!=='object'||Array.isArray(item.props)) {
        throw Error('Содержимое блоков повреждено');
      }
      ids.add(item.id);
      const fields=definitions[item.type].fields;
      if(Object.keys(item.props).sort().join('|')!==Object.keys(fields).sort().join('|')){
        throw Error('У блока недопустимые свойства');
      }
      for(const [name,field] of Object.entries(fields)){
        const value=item.props[name];
        if(typeof value!=='string'||value.length>field.maxLength||value.includes('\0')){
          throw Error('Недопустимое значение поля: '+name);
        }
      }
    }
    return structuredClone(raw);
  }
  function schema(type,headingsOnly=false) {
    const all=definitions[type].fields;
    const properties=headingsOnly?Object.fromEntries(
      Object.entries(all).filter(([name])=>name==='eyebrow'||name==='title')
    ):all;
    return {type:'object',additionalProperties:false,
      required:Object.keys(properties),properties:structuredClone(properties)};
  }
  Object.defineProperty(window,'CmsPreviewContent',{value:Object.freeze({
    format,palette,definitions,types,template,createSection,validate,schema
  })});
})();
