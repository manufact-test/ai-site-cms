'use strict';
/* Preview-only photo transactions. Model owns all refs; no URL-based uploads or external images. */
(()=>{
  const P=window.CmsPreviewProject;
  const allowed=Object.freeze({hero:'hero',story:'photo'});
  function target(project,ref){
    if(!ref||typeof ref!=='object'||Array.isArray(ref))throw Error('Неизвестная область фотографии');
    const page=project.pages.find(p=>p.id===ref.pageId);
    const section=page?.sections.find(s=>s.id===ref.sectionId);
    if(!section||page.hiddenSections.includes(section.id))throw Error('Блок больше не доступен');
    if(Object.hasOwn(allowed,section.type)&&ref.slot===allowed[section.type]&&
      (ref.itemId===undefined||ref.itemId===null)){
      return {page,section,assetId:page.mediaSlots[section.id]?.[ref.slot]||''};
    }
    if(['catalog','services'].includes(section.type)&&typeof ref.itemId==='string'&&
      ref.slot===undefined){
      const item=page.repeaters[section.id]?.find(i=>i.id===ref.itemId);
      if(!item)throw Error('Карточка больше не доступна');
      return {page,section,item,assetId:item.image||''};
    }
    throw Error('Для выбранного блока нет фотографии');
  }
  function current(project,ref){
    return target(project,ref).assetId;
  }
  function change(project,ref,id,alt,newAsset=null){
    const cloned=P.validate(project);
    const bound=target(cloned,ref);
    if(typeof id!=='string'||typeof alt!=='string'||alt.length>160||alt.includes('\0'))
      throw Error('Некорректное описание фотографии');
    if(newAsset){
      if(id!==newAsset.id||cloned.media.some(a=>a.id===id))
        throw Error('Дубликат фотографии');
      cloned.media.push(newAsset);
    }
    const asset=cloned.media.find(a=>a.id===id);
    if(id&&!asset)throw Error('Фото больше не существует');
    if(!id&&alt)throw Error('Сначала выберите фото');
    if(asset)asset.alt=alt;
    if(bound.item){
      bound.item.image=id;
    }else{
      const slots=bound.page.mediaSlots[bound.section.id]||{};
      if(id)slots[ref.slot]=id;else delete slots[ref.slot];
      if(Object.keys(slots).length)bound.page.mediaSlots[bound.section.id]=slots;
      else delete bound.page.mediaSlots[bound.section.id];
    }
    return P.validate(cloned);
  }
  Object.defineProperty(window,'CmsPreviewCanvasMedia',{
    value:Object.freeze({current,change})
  });
})();