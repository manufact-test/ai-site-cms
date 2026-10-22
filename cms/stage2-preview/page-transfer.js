'use strict';
/* Stage 2 offline UX only. Import ONE trusted, validated local page into
 * another independent project. No remote HTML, execution, publishing or I/O. */
(()=>{
  const P=window.CmsPreviewProject,C=window.CmsPreviewContent,Q=window.CmsPreviewRepeaters;
  let mediaSerial=0;
  function uniqueSlug(project,sourceSlug){
    const base=(sourceSlug||'imported-home').slice(0,60);
    const taken=new Set(project.pages.map(p=>p.slug));
    if(!taken.has(base))return base;
    for(let i=2;i<10000;i++){
      const suffix='-'+i,proposed=base.slice(0,70-suffix.length)+suffix;
      if(!taken.has(proposed))return proposed;
    }
    throw Error('Не удалось выбрать свободный адрес страницы');
  }
  function inspect(targetRaw,sourceRaw,sourcePageId){
    const target=P.validate(targetRaw),source=P.validate(sourceRaw);
    const page=source.pages.find(p=>p.id===sourcePageId);
    if(!page)throw Error('Страница не найдена в выбранном сайте');
    if(target.pages.length>=P.MAX_PAGES)throw Error('В целевом сайте уже восемь страниц');
    const ids=new Set();
    for(const slots of Object.values(page.mediaSlots))
      for(const id of Object.values(slots))ids.add(id);
    for(const items of Object.values(page.repeaters))
      for(const item of items)if(item.image)ids.add(item.image);
    const assets=[...ids].map(id=>{
      const asset=source.media.find(x=>x.id===id);
      if(!asset)throw Error('В исходной странице отсутствует фотография');
      return asset;
    });
    const reused=assets.filter(asset=>target.media.some(other=>
      other.data===asset.data&&other.alt===asset.alt&&
      (other.focusX??50)===(asset.focusX??50)&&
      (other.focusY??50)===(asset.focusY??50)));
    const required=assets.length-reused.length;
    if(target.media.length+required>P.MAX_MEDIA)
      throw Error('Недостаточно места для фотографий: нужно '+required+
        ', свободно '+(P.MAX_MEDIA-target.media.length));
    const removedActions=Object.values(page.sectionActions).filter(action=>
      action.startsWith('page:')&&action!=='page:'+page.id||
      action.startsWith('jump:')&&!action.startsWith('jump:'+page.id+':')).length;
    return {title:page.title,slug:uniqueSlug(target,page.slug),sections:page.sections.length,
      photos:assets.length,newPhotos:required,reusedPhotos:reused.length,
      detachedTemplates:Object.keys(page.libraryLinks).length,
      unlinkedActions:removedActions};
  }
  function transfer(targetRaw,sourceRaw,sourcePageId){
    const target=P.validate(targetRaw),source=P.validate(sourceRaw);
    const details=inspect(target,source,sourcePageId);
    const origin=source.pages.find(pg=>pg.id===sourcePageId);
    const dest=P.createPage(target),sections=new Map(),mediaIds=new Map();
    const reserved=new Set(target.media.map(a=>a.id));
    for(const section of origin.sections){
      const fresh=C.createSection(section.type);
      sections.set(section.id,fresh.id);
    }
    for(const [slot,assetId] of Object.entries(Object.fromEntries(
      [...Object.values(origin.mediaSlots).flatMap(slots=>Object.values(slots)),
      ...Object.values(origin.repeaters).flatMap(items=>items.map(item=>item.image).filter(Boolean))]
        .map(id=>[id,id])))){
      const asset=source.media.find(a=>a.id===assetId);
      const match=target.media.find(a=>a.data===asset.data&&a.alt===asset.alt&&
        (a.focusX??50)===(asset.focusX??50)&&(a.focusY??50)===(asset.focusY??50));
      if(match){mediaIds.set(assetId,match.id);continue;}
      let fresh;
      do{fresh='asset-'+Date.now().toString(36)+'-'+(++mediaSerial).toString(36).padStart(5,'0');}
      while(reserved.has(fresh));
      reserved.add(fresh);
      target.media.push({...structuredClone(asset),id:fresh});
      mediaIds.set(assetId,fresh);
    }
    dest.title=origin.title;dest.slug=details.slug;
    dest.seoTitle=origin.seoTitle;dest.seoDescription=origin.seoDescription;
    dest.inMenu=origin.inMenu;dest.sections=origin.sections.map(s=>({...structuredClone(s),id:sections.get(s.id)}));
    dest.hiddenSections=origin.hiddenSections.map(id=>sections.get(id));
    dest.sectionStyles={};dest.sectionLayouts={};dest.mediaSlots={};
    dest.sectionActions={};dest.repeaters={};dest.libraryLinks={};
    for(const section of origin.sections){
      const prev=section.id,id=sections.get(prev);
      if(origin.sectionStyles[prev])dest.sectionStyles[id]=origin.sectionStyles[prev];
      if(origin.sectionLayouts[prev])dest.sectionLayouts[id]=structuredClone(origin.sectionLayouts[prev]);
      if(origin.mediaSlots[prev]){
        dest.mediaSlots[id]=Object.fromEntries(Object.entries(origin.mediaSlots[prev])
          .map(([slot,old])=>[slot,mediaIds.get(old)]));
      }
      if(origin.repeaters[prev]){
        dest.repeaters[id]=origin.repeaters[prev].map(item=>({
          ...structuredClone(item),id:Q.blank(section.type).id,
          image:item.image?mediaIds.get(item.image):''
        }));
      }
      const action=origin.sectionActions[prev];
      if(action){
        if(action==='page:'+origin.id)dest.sectionActions[id]='page:'+dest.id;
        else if(action.startsWith('jump:'+origin.id+':')){
          const oldSection=action.slice(('jump:'+origin.id+':').length);
          if(sections.has(oldSection))
            dest.sectionActions[id]='jump:'+dest.id+':'+sections.get(oldSection);
        }else if(['email','phone'].includes(action))dest.sectionActions[id]=action;
        // Links to other source pages do not exist in the destination.
      }
      // Section recipe links intentionally NOT imported: revisions belong to
      // the source site's independent recipe library.
    }
    target.pages.push(dest);
    return {project:P.validate(target),pageId:dest.id,details};
  }
  Object.defineProperty(window,'CmsPreviewPageTransfer',{value:Object.freeze({inspect,transfer})});
})();
