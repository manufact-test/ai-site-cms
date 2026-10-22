'use strict';
/* Direct, bounded text editing of preview elements. No contenteditable, HTML, scripts or remote calls. */
(()=>{
  const P=window.CmsPreviewProject,C=window.CmsPreviewContent,Q=window.CmsPreviewRepeaters;
  const textFields=Object.freeze({
    hero:[['.hero-grid h1','title'],['.hero-grid > div:first-child > p','description'],['.hero-grid .tag','eyebrow'],['.hero-grid .visual strong','highlight']],
    features:[['.heading h2','title'],['.heading .tag','eyebrow']],
    story:[['.story h2','title'],['.story .tag','eyebrow'],['.story > div:first-child > p','paragraph'],['.story .metric strong','stat'],['.story .metric p','statLabel']],
    quote:[['.quote > p','quote']],
    faq:[['.faq > h2','title']],
    contact:[['.contact h2','title'],['.contact > .wrap > p','description'],['.contact .tag','eyebrow']],
    services:[['.heading h2','title'],['.heading .tag','eyebrow']],
    metrics:[['.heading h2','title'],['.heading .tag','eyebrow']],
    process:[['.heading h2','title'],['.heading .tag','eyebrow']],
    catalog:[['.heading h2','title'],['.heading .tag','eyebrow']],
    leadform:[['.heading h2','title'],['.heading .tag','eyebrow'],['.heading > p','description']]
  });
  const repeatSelectors={
    features:['.cards > article','h3','p'],
    services:['.studio-grid > article','strong','p'],
    catalog:['.studio-grid > article','h3','p'],
    metrics:['.studio-stats > div','strong','p'],
    process:['.studio-grid > div','strong','p'],
    faq:['.faq details','summary','p']
  };
  function fields(section,page){
    const def=C.definitions[section.type],list=[];
    for(const [selector,key] of textFields[section.type]||[]){
      if(!Object.hasOwn(def.fields,key))continue;
      list.push({selector,kind:'section',field:key,label:def.fields[key].title,
        limit:def.fields[key].maxLength,value:section.props[key]});
    }
    const rule=Q.definitions[section.type],sel=repeatSelectors[section.type];
    if(rule&&sel){
      (page.repeaters[section.id]||[]).forEach((item,index)=>{
        for(const [kind,child,label,limit] of [
          ['title',sel[1],rule.title,rule.limit],
          ['text',sel[2],rule.description,rule.detailLimit]]){
          list.push({selector:sel[0]+':nth-child('+(index+1)+') '+child,
            kind:'repeater',itemId:item.id,field:kind,label:label+' '+(index+1),
            limit,value:item[kind]});
        }
      });
    }
    return list;
  }
  function change(source,pageId,sectionId,field,value){
    if(!field||!['section','repeater'].includes(field.kind))throw Error('Неизвестное поле макета');
    if(typeof value!=='string'||value.includes('\0')||value.length>field.limit)throw Error('Превышена длина поля');
    const candidate=P.validate(source);
    const page=candidate.pages.find(p=>p.id===pageId);
    const section=page?.sections.find(s=>s.id===sectionId);
    if(!section)throw Error('Выбранный блок больше не существует');
    if(field.kind==='section'){
      const def=C.definitions[section.type].fields[field.field];
      if(!def||value.length>def.maxLength)throw Error('Поле больше не доступно');
      section.props[field.field]=value;
    }else{
      const rule=Q.definitions[section.type],list=page.repeaters[section.id];
      const item=list?.find(i=>i.id===field.itemId);
      if(!rule||!item||!['title','text'].includes(field.field)
        ||value.length>(field.field==='title'?rule.limit:rule.detailLimit))
        throw Error('Карточка больше не доступна');
      item[field.field]=value;
    }
    return P.validate(candidate);
  }
  Object.defineProperty(window,'CmsPreviewCanvasEdit',{value:Object.freeze({fields,change})});
})();