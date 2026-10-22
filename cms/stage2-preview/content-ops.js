'use strict';
/* Offline Stage2 sitewide text editing and editorial checklist. No server, scripts, or arbitrary paths. */
(()=>{
  const C=window.CmsPreviewContent,Q=window.CmsPreviewRepeaters,P=window.CmsPreviewProject;
  const lower=value=>value.toLowerCase();
  const clone=value=>structuredClone(value);
  const allowedFields=new Set(['title','seoTitle','seoDescription']);
  const globalFields=[['siteTitle','Название сайта'],['headerNote','Подпись шапки'],['footerNote','Подпись подвала']];
  const field=(project,entry)=>{
    if(entry.scope==='global'){
      if(entry.key==='siteTitle')return {obj:project,key:'siteTitle'};
      if(entry.key==='headerNote'||entry.key==='footerNote')return {obj:project.settings,key:entry.key};
      throw Error('Неизвестное поле');
    }
    const page=project.pages.find(p=>p.id===entry.pageId);
    if(!page)throw Error('Страница больше не существует');
    if(entry.scope==='page'){
      if(!allowedFields.has(entry.key))throw Error('Недоступное поле страницы');
      return {obj:page,key:entry.key};
    }
    const section=page.sections.find(s=>s.id===entry.sectionId);
    if(!section)throw Error('Секция больше не существует');
    if(entry.scope==='section'){
      if(!Object.hasOwn(section.props,entry.key)||typeof section.props[entry.key]!=='string')
        throw Error('Поле секции не найдено');
      return {obj:section.props,key:entry.key};
    }
    if(entry.scope==='item'){
      const item=page.repeaters[section.id]?.find(i=>i.id===entry.itemId);
      if(!item||!['title','text'].includes(entry.key))throw Error('Элемент списка больше не существует');
      return {obj:item,key:entry.key};
    }
    throw Error('Неизвестный тип поля');
  };
  function fields(raw){
    const doc=P.validate(raw),out=[];
    const put=(ref,label,value)=>{
      if(typeof value==='string')out.push({...ref,label,value});
    };
    globalFields.forEach(([key,label])=>put({scope:'global',key,pageId:null,sectionId:null},label,
      key==='siteTitle'?doc.siteTitle:doc.settings[key]));
    for(const page of doc.pages){
      for(const key of ['title','seoTitle','seoDescription']){
        const label={title:'Название страницы',seoTitle:'SEO title',seoDescription:'SEO description'}[key];
        put({scope:'page',pageId:page.id,sectionId:null,key,pageTitle:page.title},label,page[key]);
      }
      for(const section of page.sections){
        const title=C.definitions[section.type].label,hidden=page.hiddenSections.includes(section.id),
          linked=Boolean(page.libraryLinks[section.id]);
        const refs={scope:'section',pageId:page.id,sectionId:section.id,pageTitle:page.title,
          sectionTitle:title,hidden,linked};
        // Repeaters use their own item text; legacy fixed-item props are no longer visible.
        const keys=Q.definitions[section.type]?['eyebrow','title']:Object.keys(section.props);
        for(const key of keys){
          put({...refs,key},title+' · '+key,section.props[key]);
        }
        for(const [index,item] of (page.repeaters[section.id]||[]).entries()){
          for(const key of ['title','text']){
            put({...refs,scope:'item',itemId:item.id,itemIndex:index+1,key},
              title+' · элемент '+(index+1)+' · '+(key==='title'?'Название':'Описание'),item[key]);
          }
        }
      }
    }
    return out;
  }
  function replaceLiteral(value,needle,replacement,matchCase){
    let at=0,count=0,result='',hay=matchCase?value:lower(value),find=matchCase?needle:lower(needle);
    while(true){
      const pos=hay.indexOf(find,at);
      if(pos<0)break;
      result+=value.slice(at,pos)+replacement;at=pos+needle.length;count++;
      if(count>10000)throw Error('Превышен лимит совпадений');
    }
    return {value:count?result+value.slice(at):value,count};
  }
  const identity=entry=>JSON.stringify([entry.scope,entry.pageId||'',entry.sectionId||'',entry.itemId||'',entry.key]);
  function search(raw,needle,matchCase=false,pageId='*'){
    if(pageId!=='*'&&(typeof pageId!=='string'||!raw.pages.some(page=>page.id===pageId)))
      throw Error('Неизвестная страница для поиска');
    if(typeof needle!=='string'||needle.length>90||typeof matchCase!=='boolean')
      throw Error('Поисковая фраза не должна превышать 90 символов');
    if(!needle.trim())return {entries:[],occurrences:0};
    const result=[],entries=fields(raw);let occurrences=0;
    for(const entry of entries){
      if(pageId!=='*'&&entry.pageId!==pageId)continue;
      const update=replaceLiteral(entry.value,needle,'',matchCase);
      if(!update.count)continue;
      result.push({...entry,count:update.count});
      occurrences+=update.count;
    }
    return {entries:result,occurrences};
  }
  function plan(raw,needle,replacement,matchCase=false,pageId='*',selected=null){
    if(typeof replacement!=='string'||replacement.length>180||replacement.includes('\0'))
      throw Error('Текст замены должен быть не длиннее 180 символов');
    if(typeof needle!=='string'||!needle.trim())throw Error('Введите текст для поиска');
    const found=search(raw,needle,matchCase,pageId);
    const known=new Set(found.entries.map(identity));
    let selectedIds=null;
    if(selected!==null){
      if(!Array.isArray(selected)||selected.length>400||selected.some(v=>typeof v!=='string')
        ||new Set(selected).size!==selected.length||selected.some(v=>!known.has(v)))
        throw Error('Выбор полей устарел или некорректен');
      selectedIds=new Set(selected);
    }
    const changes=found.entries.filter(entry=>selectedIds===null||selectedIds.has(identity(entry))).map(entry=>{
      const update=replaceLiteral(entry.value,needle,replacement,matchCase);
      return {...entry,after:update.value};
    });
    const candidate=clone(raw);
    const occurrences=changes.reduce((sum,entry)=>sum+entry.count,0);
    for(const entry of changes){
      const {obj,key}=field(candidate,entry);obj[key]=entry.after;
    }
    try{P.validate(candidate);}
    catch(e){return {valid:false,error:e.message,changes,occurrences,candidate:null};}
    return {valid:true,error:'',changes,occurrences,candidate};
  }
  const examples=/\b(?:демо(?:нстрац\w*)?|пример(?:а|ный)?|заглушк\w*|замените|добавьте|укажите)\b/iu;
  function review(raw){
    const doc=P.validate(raw),issues=[];
    const push=(page,section,level,reason)=>issues.push({
      pageId:page?.id||doc.pages[0].id,sectionId:section?.id||null,
      pageTitle:page?.title||'Весь сайт',sectionTitle:section?C.definitions[section.type].label:'',
      level,reason
    });
    for(const notice of P.audit(doc)){
      const page=doc.pages.find(p=>p.id===notice.pageId);
      push(page,null,'attention',notice.message);
    }
    if(doc.settings.publicUrl==='')push(null,null,'note',
      'Публичный HTTPS-домен пока не указан: SEO-карта появится только после его настройки');
    const media=new Map(doc.media.map(asset=>[asset.id,asset]));
    const used=new Set(doc.settings.logoAssetId?[doc.settings.logoAssetId]:[]);
    let demoCount=0;
    for(const page of doc.pages){
      for(const section of page.sections){
        if(page.hiddenSections.includes(section.id))continue;
        const keys=Q.definitions[section.type]?['title','eyebrow']:Object.keys(section.props);
        const values=keys.map(key=>section.props[key]).filter(v=>typeof v==='string');
        const list=page.repeaters[section.id]||[];
        if(list.some(item=>!item.title.trim()||!item.text.trim()))push(page,section,'attention',
          'В списке есть карточки с незаполненным названием или описанием');
        if(values.concat(list.flatMap(item=>[item.title,item.text])).some(value=>examples.test(value))){
          demoCount++;
          push(page,section,'attention','Проверьте демонстрационные тексты и замените их реальным содержимым');
        }
        for(const id of Object.values(page.mediaSlots[section.id]||{}))used.add(id);
        for(const item of list)if(item.image)used.add(item.image);
        if(section.type==='leadform')push(page,section,'note',
          'Демо-форма отключена: в автономном экспорте сбор заявок не работает');
      }
    }
    doc.library.forEach(recipe=>{
      for(const id of Object.values(recipe.mediaSlots))used.add(id);
      recipe.items.forEach(item=>{if(item.image)used.add(item.image)});
    });
    for(const asset of media.values()){
      if(!used.has(asset.id))push(null,null,'note','Фотография «'+(asset.alt||asset.id)+'» не используется');
      if(!asset.alt.trim()&&used.has(asset.id))
        push(null,null,'note','Добавьте alt-описание используемой фотографии '+asset.id);
    }
    return {issues:issues.slice(0,90),total:issues.length,
      attention:issues.filter(item=>item.level==='attention').length,
      demoSections:demoCount,fields:fields(doc).length};
  }
  Object.defineProperty(window,'CmsPreviewContentOps',{value:Object.freeze({
    fields,search,plan,review,identity
  })});
})();
