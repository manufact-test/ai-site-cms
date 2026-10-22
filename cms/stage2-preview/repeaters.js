'use strict';
/* Stage2 offline-only repeatable section items. Strict, bounded, text-only models. */
(()=>{
  const definitions=Object.freeze({
    features:{title:'Преимущество',description:'Описание',key:'item',detail:'text',limit:110,detailLimit:280,seed:3},
    services:{title:'Услуга',description:'Описание',key:'item',detail:'text',limit:110,detailLimit:280,seed:3,photo:true},
    catalog:{title:'Продукт',description:'Описание',key:'product',detail:'info',limit:110,detailLimit:260,seed:3,photo:true},
    faq:{title:'Вопрос',description:'Ответ',key:'question',detail:'answer',limit:160,detailLimit:400,seed:2},
    metrics:{title:'Показатель',description:'Подпись',key:'number',detail:'label',limit:40,detailLimit:110,seed:3},
    process:{title:'Этап',description:'Описание',key:'step',detail:'desc',limit:110,detailLimit:240,seed:3}
  });
  let serial=0;
  const newId=()=> 'item-'+Date.now().toString(36)+'-'+(++serial).toString(36);
  const allowed=(obj,keys)=>Object.keys(obj).sort().join('|')===keys.slice().sort().join('|');
  function blank(type){
    if(!definitions[type])throw Error('Секция не поддерживает список элементов');
    return {id:newId(),title:'',text:'',image:''};
  }
  function seed(section,legacySlots={}){
    const config=definitions[section.type];
    if(!config)return null;
    return Array.from({length:config.seed},(_,i)=>({
      id:newId(),
      title:section.props[config.key+(i+1)]||'',
      text:section.props[config.detail+(i+1)]||'',
      image:config.photo?(legacySlots['image'+(i+1)]||''):''
    }));
  }
  function populate(page){
    page.repeaters={};
    for(const section of page.sections){
      if(!definitions[section.type])continue;
      page.repeaters[section.id]=seed(section,page.mediaSlots?.[section.id]);
      if(definitions[section.type].photo)delete page.mediaSlots[section.id];
    }
    return page;
  }
  function validate(page,mediaIds){
    const all=page.repeaters;
    if(!all||typeof all!=='object'||Array.isArray(all)
      ||Object.keys(all).length>12)throw Error('Неверная структура повторяемых элементов');
    const sectionMap=new Map(page.sections.map(s=>[s.id,s]));
    const expected=new Set(page.sections.filter(s=>definitions[s.type]).map(s=>s.id));
    if(Object.keys(all).length!==expected.size||Object.keys(all).some(id=>!expected.has(id)))
      throw Error('Для каждого списка нужна ровно одна коллекция его элементов');
    for(const [sectionId,items] of Object.entries(all)){
      const rule=definitions[sectionMap.get(sectionId).type],ids=new Set();
      if(!Array.isArray(items)||items.length<1||items.length>8)
        throw Error('В каждой коллекции от одного до восьми элементов');
      for(const item of items){
        if(!item||typeof item!=='object'||Array.isArray(item)
          ||!allowed(item,['id','title','text','image'])
          ||typeof item.id!=='string'||!/^item-[a-z0-9-]{5,48}$/.test(item.id)
          ||ids.has(item.id)||typeof item.title!=='string'
          ||item.title.length>rule.limit||item.title.includes('\0')
          ||typeof item.text!=='string'||item.text.length>rule.detailLimit
          ||item.text.includes('\0')||typeof item.image!=='string'
          ||(item.image!==''&&(!rule.photo||!mediaIds.has(item.image))))
          throw Error('Некорректные поля элемента '+sectionId);
        ids.add(item.id);
      }
    }
  }
  Object.defineProperty(window,'CmsPreviewRepeaters',{value:Object.freeze({
    definitions,blank,seed,populate,validate
  })});
})();
