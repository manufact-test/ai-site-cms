'use strict';
/* Local Stage2 named section recipes: explicit snapshot reuse, never live remote code. */
(()=>{
  const C=window.CmsPreviewContent,Q=window.CmsPreviewRepeaters;
  let next=1;
  const freshId=()=> 'preset-'+Date.now().toString(36)+'-'+(next++).toString(36);
  const copy=x=>structuredClone(x);
  const keys=(o,list)=>Object.keys(o).sort().join('|')===list.slice().sort().join('|');
  function snapshot(page,section){
    return {type:section.type,props:copy(section.props),
      mediaSlots:copy(page.mediaSlots[section.id]||{}),
      items:copy(page.repeaters[section.id]||[])};
  }
  function make(page,section,name){
    if(typeof name!=='string'||name.trim().length<1||name.trim().length>70||name.includes('\0'))
      throw Error('Введите название шаблона (1–70 символов)');
    return {id:freshId(),name:name.trim(),revision:1,...snapshot(page,section)};
  }
  function validate(entries,pages,siteTitle,theme,mediaIds){
    if(!Array.isArray(entries)||entries.length>12)throw Error('Библиотека содержит слишком много блоков');
    const ids=new Set(), all=new Map(entries.map(entry=>[entry?.id,entry]));
    for(const rec of entries){
      if(!rec||typeof rec!=='object'||Array.isArray(rec)
        ||!keys(rec,['id','name','revision','type','props','mediaSlots','items'])
        ||typeof rec.id!=='string'||!/^preset-[a-z0-9-]{5,48}$/.test(rec.id)
        ||ids.has(rec.id)||typeof rec.name!=='string'||!rec.name.trim()
        ||rec.name.length>70||rec.name.includes('\0')
        ||!Number.isSafeInteger(rec.revision)||rec.revision<1||rec.revision>999999
        ||!Object.hasOwn(C.definitions,rec.type)
        ||!rec.mediaSlots||typeof rec.mediaSlots!=='object'||Array.isArray(rec.mediaSlots)
        ||Object.keys(rec.mediaSlots).length>3
        ||Object.entries(rec.mediaSlots).some(([key,value])=>
          !(['hero','story'].includes(rec.type)&&
            (rec.type==='hero'?['hero']:['photo']).includes(key)&&mediaIds.has(value)))
        ||!Array.isArray(rec.items))throw Error('Неверная запись библиотеки');
      ids.add(rec.id);
      const fake={id:'sec-preset-validation',type:rec.type,props:rec.props};
      C.validate({format:C.format,siteTitle,theme,sections:[fake]});
      const page={sections:[fake],repeaters:Q.definitions[rec.type]?{[fake.id]:rec.items}:{}};
      Q.validate(page,mediaIds);
      if(!Q.definitions[rec.type]&&rec.items.length)throw Error('Неожиданные элементы в шаблоне');
    }
    for(const page of pages){
      if(!page.libraryLinks||typeof page.libraryLinks!=='object'||Array.isArray(page.libraryLinks)
        ||Object.keys(page.libraryLinks).length>12
        ||Object.entries(page.libraryLinks).some(([id,presetId])=>{
          const section=page.sections.find(s=>s.id===id),entry=all.get(presetId);
          return !section||!entry||entry.type!==section.type;
        }))throw Error('Ссылки на библиотеку повреждены');
    }
  }
  function insert(page,recipe){
    if(page.sections.length>=12)throw Error('Максимум 12 блоков на странице');
    const section=C.createSection(recipe.type);
    section.props=copy(recipe.props);page.sections.push(section);
    if(Object.keys(recipe.mediaSlots).length)page.mediaSlots[section.id]=copy(recipe.mediaSlots);
    if(Q.definitions[recipe.type])page.repeaters[section.id]=recipe.items.map(item=>({
      ...copy(item),id:Q.blank(recipe.type).id
    }));
    page.libraryLinks[section.id]=recipe.id;
    return section;
  }
  function refresh(targetPage,section,recipe){
    if(recipe.type!==section.type)throw Error('Нельзя заменить блок другим типом');
    section.props=copy(recipe.props);
    if(Object.keys(recipe.mediaSlots).length)targetPage.mediaSlots[section.id]=copy(recipe.mediaSlots);
    else delete targetPage.mediaSlots[section.id];
    if(Q.definitions[recipe.type])targetPage.repeaters[section.id]=recipe.items.map(item=>({
      ...copy(item),id:Q.blank(recipe.type).id
    }));
  }
  function publish(project,page,section){
    const id=page.libraryLinks[section.id],recipe=project.library.find(r=>r.id===id);
    if(!recipe)throw Error('Сначала привяжите секцию к библиотеке');
    if(recipe.revision>=999999)throw Error('Достигнут лимит версий шаблона');
    const snap=snapshot(page,section);
    Object.assign(recipe,snap,{revision:recipe.revision+1});
    let count=0;
    for(const target of project.pages){
      for(const entry of target.sections){
        if(target.libraryLinks[entry.id]!==recipe.id||target.id===page.id&&entry.id===section.id)continue;
        refresh(target,entry,recipe);count++;
      }
    }
    return count;
  }
  function detach(project,id){
    for(const pg of project.pages)
      for(const [sectionId,linked] of Object.entries(pg.libraryLinks))
        if(linked===id)delete pg.libraryLinks[sectionId];
    project.library=project.library.filter(r=>r.id!==id);
  }
  function count(project,id){
    return project.pages.reduce((total,p)=>total+Object.values(p.libraryLinks).filter(v=>v===id).length,0);
  }
  function modified(page,section,recipe){
    return JSON.stringify(snapshot(page,section))!==JSON.stringify({
      type:recipe.type,props:recipe.props,mediaSlots:recipe.mediaSlots,items:
        // IDs identify each occurrence of a repeater, never shared between pages.
        (page.repeaters[section.id]||[]).map((item,i)=>({...recipe.items[i],id:item.id}))
    });
  }
  Object.defineProperty(window,'CmsPreviewLibrary',{value:Object.freeze({
    make,validate,insert,publish,detach,count,modified
  })});
})();
