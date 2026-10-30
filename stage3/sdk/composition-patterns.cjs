'use strict';
/* Safe typed composition starters. No HTML/CSS snippets or remote URLs. */
const G=require('./design-graph.cjs');
const PATTERNS=Object.freeze({
  'editorial-split':{label:'Редакционный разворот',description:'Текст, изображение и CTA в асимметричной сетке',needsImage:true},
  'project-case':{label:'Кейс проекта',description:'Изображение, результаты, описание и CTA',needsImage:true},
  'service-cards':{label:'Карточки услуг',description:'Три самостоятельные интерактивные карточки',needsImage:false},
  'pricing-grid':{label:'Тарифы и предложения',description:'Три варианта с преимуществами и действиями',needsImage:false},
  'media-hero':{label:'Медийная обложка',description:'Фоновое изображение, заголовок и два действия',needsImage:true},
  'faq-feature':{label:'FAQ и редакционный акцент',description:'Информационный блок и раскрывающиеся ответы',needsImage:false}
});
const raster=a=>a&&typeof a==='object'&&['image/png','image/jpeg','image/webp'].includes(a.mime)&&
  typeof a.id==='string'&&/^[a-z][a-z0-9-]{2,79}$/.test(a.id);
function create(key,{id,asset=null,tabletAsset=null,mobileAsset=null}={}){
  if(!Object.hasOwn(PATTERNS,key))throw Error('Unknown composition pattern');
  if(typeof id!=='function')throw Error('Pattern requires a node ID factory');
  if(PATTERNS[key].needsImage&&!raster(asset))throw Error('Upload a site-owned raster image first');
  if((tabletAsset&&!raster(tabletAsset))||(mobileAsset&&!raster(mobileAsset))||
      ((tabletAsset||mobileAsset)&&!PATTERNS[key].needsImage))throw Error('Invalid device image');
  const uid=()=>{const s=id();if(typeof s!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(s))throw Error('Invalid node ID');return s;};
  const el=(type,props={})=>({id:uid(),type,styles:{},...props});
  const container=(children,styles={},responsive={},tag='div',label)=>el('container',{
    styles,...(Object.keys(responsive).length?{responsive}:{}),
    ...(tag==='div'?{}:{semanticTag:tag}),...(label?{ariaLabel:label}:{}),children});
  const h=(text,level=2,styles={})=>el('heading',{text,level,styles});
  const p=(text,styles={})=>el('text',{text,styles});
  const action=(label='Обсудить проект',styles={})=>el('button',{
    text:label,href:'/',styles:{display:'block',paddingX:20,paddingY:14,
      radius:16,textAlign:'center',fontWeight:700,background:'#245bd6',color:'#ffffff',...styles},
    transition:{duration:200,easing:'ease-out'},
    states:{hover:{scalePercent:103,background:'#183f9b'},focus:{outlineColor:'#245bd6',outlineWidth:3}}
  });
  const art=(label,styles={})=>el('image',{
    assetId:asset.id,alt:asset.alt||label,
    styles:{widthPercent:100,objectFit:'cover',radius:20,...styles},
    ...((tabletAsset||mobileAsset)?{responsiveMedia:{
      ...(tabletAsset?{tabletAssetId:tabletAsset.id}:{}),
      ...(mobileAsset?{mobileAssetId:mobileAsset.id}:{})}}:{})
  });
  const root=(children,styles={},responsive={},tag='section',label='Индивидуальная композиция')=>
    container(children,{display:'grid',gap:24,maxWidth:1280,paddingX:36,paddingY:48,...styles},responsive,tag,label);
  const card=(children,styles={})=>container(children,{
    display:'flex',direction:'column',gap:14,padding:24,
    background:'#ffffff',radius:20,borderColor:'#dce4ed',borderWidth:1,
    shadow:'soft',...styles},{mobile:{padding:16}},'article');
  let result;
  if(key==='editorial-split'){
    const story=container([
      p('01 / АВТОРСКАЯ ИСТОРИЯ',{fontSize:13,fontWeight:700,letterSpacing:12,color:'#245bd6'}),
      h('Сильный характер вашего проекта',2,{fluidFont:{min:30,max:64},lineHeight:110,textWrap:'balance'}),
      p('Здесь — история, которую невозможно передать стандартным шаблоном. Замените содержимое в соответствии с утверждённым макетом.',{fontSize:18,lineHeight:155,maxWidth:620,color:'#475569'}),
      action('Узнать о проекте',{alignSelf:'start'})
    ],{display:'flex',direction:'column',gap:22,justify:'center'},{mobile:{gap:16}});
    const photo=art('Фотография проекта',{aspectRatio:'portrait'});
    photo.responsive={mobile:{aspectRatio:'landscape'}};
    result=root([story,photo],{gridTracks:[5,7],align:'center',background:'#f6f8fc'},
      {tablet:{gridTracks:[1,1],paddingX:24},mobile:{columns:1,paddingX:16,paddingY:24}},'section','Редакционная история');
  }else if(key==='project-case'){
    const stats=container([
      container([h('01',3,{fontSize:30,color:'#245bd6'}),p('Этап работы',{fontSize:13,color:'#475569'})],{display:'flex',direction:'column',gap:6}),
      container([h('100%',3,{fontSize:30,color:'#245bd6'}),p('Индивидуальный подход',{fontSize:13,color:'#475569'})],{display:'flex',direction:'column',gap:6})
    ],{display:'grid',gridTracks:[1,1],gap:12});
    result=root([
      art('Результат проекта',{aspectRatio:'landscape'}),
      container([
        p('ПОРТФОЛИО / КЕЙС',{fontSize:13,fontWeight:700,letterSpacing:12,color:'#245bd6'}),
        h('Проект, за которым стоит идея',2,{fluidFont:{min:28,max:50},lineHeight:115}),
        p('Замените этот текст реальной задачей клиента, решением и подтверждёнными показателями.',{fontSize:17,lineHeight:160,color:'#475569'}),
        stats,action('Посмотреть проект',{alignSelf:'start'})
      ],{display:'flex',direction:'column',gap:20,justify:'center',padding:16},{mobile:{padding:0}})
    ],{gridTracks:[7,5],align:'center'},
    {tablet:{gridTracks:[1,1],paddingX:24},mobile:{columns:1,paddingX:16,paddingY:22}},'article','Кейс проекта');
  }else if(key==='service-cards'){
    const details=[
      ['sparkles','Проектирование','Разрабатываем индивидуальную концепцию и структуру.'],
      ['shield','Разработка','Создаём решение с вниманием к каждой детали.'],
      ['arrow','Сопровождение','Помогаем развивать проект после запуска.']
    ];
    result=root(details.map(([icon,name,desc])=>card([
      el('icon',{icon,alt:'',iconSize:32,styles:{color:'#245bd6'}}),
      h(name,3,{fontSize:24,lineHeight:120}),
      p(desc,{fontSize:16,lineHeight:155,color:'#475569'}),
      action('Обсудить услугу',{marginTop:12})
    ],{minHeight:220,justify:'between'})),
    {gridTracks:[1,1,1],background:'#f7f9fc'},
    {tablet:{gridTracks:[1,1]},mobile:{columns:1,paddingX:16,paddingY:24}},'section','Услуги');
  }else if(key==='pricing-grid'){
    const plans=[
      ['Старт','Для небольших индивидуальных задач',['Проработка структуры','Авторская компоновка','Базовая поддержка']],
      ['Развитие','Для проектов с расширенными возможностями',['Адаптивный дизайн','Интерактивные элементы','Публикация и сопровождение']],
      ['Индивидуальный','Для сложных проектов без шаблонных ограничений',['Сложные композиции','Интеграции','План развития']]
    ];
    const title=h('Выберите формат сотрудничества',2,{fontSize:36,gridColumnSpan:3,textWrap:'balance'});
    title.responsive={tablet:{gridColumnSpan:2},mobile:{gridColumnSpan:1}};
    result=root([title,...plans.map(([name,desc,features],i)=>card([
      p(i===1?'ПОПУЛЯРНЫЙ ВАРИАНТ':'ФОРМАТ СОТРУДНИЧЕСТВА',{fontSize:12,fontWeight:700,letterSpacing:10,color:'#245bd6'}),
      h(name,3,{fontSize:27}),
      p('Стоимость по запросу',{fontSize:20,fontWeight:700}),
      p(desc,{fontSize:15,color:'#475569',lineHeight:145}),
      el('list',{ordered:false,children:features.map(feature=>el('list-item',{text:feature,styles:{lineHeight:145}}))}),
      action('Запросить предложение',{marginTop:12})
    ],{borderColor:i===1?'#245bd6':'#dce4ed',minHeight:240,justify:'between'}))],
    {gridTracks:[1,1,1],background:'#f6f8fc'},
    {tablet:{gridTracks:[1,1],paddingX:20},mobile:{columns:1,paddingX:16,paddingY:24}},'section','Пакеты услуг');
  }else if(key==='media-hero'){
    result=root([
      p('АВТОРСКАЯ СЕКЦИЯ',{fontSize:13,fontWeight:700,color:'#ffffff',letterSpacing:16}),
      h('История начинается с сильного образа',2,{fluidFont:{min:34,max:76},fontWeight:800,lineHeight:105,maxWidth:950,color:'#ffffff',textWrap:'balance'}),
      p('Представьте продукт, команду или проект. Изображение и геометрию можно отдельно настроить для каждого устройства.',
        {fontSize:19,lineHeight:145,maxWidth:670,color:'#ffffff'}),
      container([
        action('Обсудить проект',{background:'#ffffff',color:'#142c60',alignSelf:'start'}),
        el('link',{text:'Подробнее',href:'/',styles:{color:'#ffffff',fontSize:16,alignSelf:'center'}})
      ],{display:'flex',flexWrap:'wrap',align:'center',gap:22})
    ],{gap:24,minHeightViewport:70,justify:'center',paddingX:64,paddingY:80,background:'#0c234b'},
    {tablet:{paddingX:36,minHeightViewport:56},mobile:{paddingX:20,paddingY:48,minHeightViewport:60}},
    'section','Медийная обложка');
    result.backgroundMedia={assetId:asset.id,size:'cover',positionX:50,positionY:50,overlay:{color:'#0c234b',opacity:68}};
    if(tabletAsset)result.backgroundMedia.tabletAssetId=tabletAsset.id;
    if(mobileAsset)result.backgroundMedia.mobileAssetId=mobileAsset.id;
  }else if(key==='faq-feature'){
    const questions=[
      ['Как устроена работа?','Сначала согласуем содержание и макет, затем собираем индивидуальную композицию.'],
      ['Можно ли настроить адаптивность?','Да. Расположение и стили редактируются отдельно для каждого устройства.'],
      ['Как обновлять сайт?','Содержимое редактируется в Studio и публикуется после проверки черновика.']
    ];
    const faqs=container(questions.map(([question,answer])=>el('disclosure',{
      text:question,styles:{padding:18,background:'#ffffff',borderWidth:1,borderColor:'#dce4ed',radius:14},
      children:[p(answer,{fontSize:15,lineHeight:155,color:'#475569'})]
    })),{display:'flex',direction:'column',gap:12});
    const note=container([
      p('ВОПРОСЫ И ОТВЕТЫ',{fontSize:13,fontWeight:700,letterSpacing:10,color:'#245bd6'}),
      h('Всё важное — без лишних переходов',2,{fontSize:36,lineHeight:115}),
      p('В этой колонке — авторский акцент. Рядом — раскрывающиеся ответы без дополнительного JavaScript.',
        {fontSize:17,lineHeight:155,color:'#475569'}),
      action('Связаться с нами',{alignSelf:'start'})
    ],{display:'flex',direction:'column',gap:18});
    result=root([note,faqs],{gridTracks:[2,3],background:'#f8f9fc'},
      {tablet:{gridTracks:[1,2]},mobile:{columns:1,paddingX:16,paddingY:24}},'section','Вопросы и ответы');
  }
  return result;
}
function rootForSelection(graph,selectedId){
  if(!graph||!Array.isArray(graph.nodes)||!graph.nodes.length)throw Error('Missing design graph');
  for(const root of graph.nodes){
    const has=n=>n.id===selectedId||(Array.isArray(n.children)&&n.children.some(has));
    if(has(root))return root.id;
  }
  throw Error('Selected node is not in the graph');
}
function insert(graph,selectedId,key,options){
  const node=create(key,options);
  const targetId=rootForSelection(graph,selectedId);
  return {graph:G.editTree(graph,{action:'insert',targetId,placement:'after',node}),nodeId:node.id};
}
module.exports=Object.freeze({PATTERNS,create,insert,rootForSelection});
