'use strict';
/* Stage 2 only: trace and atomically rebind local photo references.
 * This module never follows URLs, uploads, publishes, or touches other workspaces. */
(()=>{
  const P=window.CmsPreviewProject;
  function usage(project,id){
    if(!project.media.some(a=>a.id===id))throw Error('Фотография отсутствует в проекте');
    const out=[];
    if(project.settings.logoAssetId===id)
      out.push({kind:'logo',pageId:null,sectionId:null,label:'Логотип сайта'});
    for(const page of project.pages){
      for(const section of page.sections){
        const prefix=page.title+' · '+(section.props.title||section.type);
        for(const [slot,ref] of Object.entries(page.mediaSlots[section.id]||{})){
          if(ref===id)out.push({kind:'section',pageId:page.id,sectionId:section.id,
            label:prefix+' · '+(slot==='hero'?'Главная фотография':'Фотография блока')});
        }
        for(const [index,item] of (page.repeaters[section.id]||[]).entries()){
          if(item.image===id)out.push({kind:'item',pageId:page.id,sectionId:section.id,
            label:prefix+' · карточка '+(index+1)});
        }
      }
    }
    for(const recipe of project.library){
      for(const [slot,ref] of Object.entries(recipe.mediaSlots))
        if(ref===id)out.push({kind:'recipe',pageId:null,sectionId:null,
          label:'Шаблон «'+recipe.name+'» · '+slot});
      for(const [index,item] of recipe.items.entries())
        if(item.image===id)out.push({kind:'recipe',pageId:null,sectionId:null,
          label:'Шаблон «'+recipe.name+'» · карточка '+(index+1)});
    }
    return out;
  }
  function replaceEverywhere(project,oldId,newId){
    const next=P.validate(project);
    if(oldId===newId||!next.media.some(a=>a.id===oldId)
      ||!next.media.some(a=>a.id===newId))throw Error('Выберите два разных существующих фото');
    const affected=usage(next,oldId).length;
    if(!affected)throw Error('Это фото нигде не используется');
    if(next.settings.logoAssetId===oldId)next.settings.logoAssetId=newId;
    for(const page of next.pages){
      for(const slots of Object.values(page.mediaSlots))
        for(const slot of Object.keys(slots))if(slots[slot]===oldId)slots[slot]=newId;
      for(const items of Object.values(page.repeaters))
        for(const item of items)if(item.image===oldId)item.image=newId;
    }
    for(const recipe of next.library){
      for(const slot of Object.keys(recipe.mediaSlots))
        if(recipe.mediaSlots[slot]===oldId)recipe.mediaSlots[slot]=newId;
      for(const item of recipe.items)if(item.image===oldId)item.image=newId;
    }
    return {project:P.validate(next),affected};
  }
  function removeUnused(project,id){
    const next=P.validate(project);
    if(usage(next,id).length)throw Error('Фото используется. Сначала замените его во всех местах.');
    next.media=next.media.filter(asset=>asset.id!==id);
    return P.validate(next);
  }
  Object.defineProperty(window,'CmsPreviewMediaOps',{
    value:Object.freeze({usage,replaceEverywhere,removeUnused})
  });
})();
