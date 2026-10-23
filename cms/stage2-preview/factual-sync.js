'use strict';
/* Stage2-only offline bulk factual content update for an EXISTING site.
 * The operation is a pure, fully validated model proposal. No host writes. */
(()=>{
  const P=window.CmsPreviewProject,Q=window.CmsPreviewRepeaters,
    C=window.CmsPreviewContent,B=window.CmsPreviewBrief;
  const types=Object.freeze({
    offerings:['services','catalog'],
    steps:['process'],
    questions:['faq']
  });
  const labels=Object.freeze({offerings:'Услуги и товары',steps:'Этапы работы',questions:'FAQ'});
  function plan(raw,inputs){
    const doc=P.validate(raw),groups=B.details(inputs);
    const selected=Object.entries(groups).filter(([,rows])=>rows.length);
    if(!selected.length)throw Error('Заполните хотя бы один список с реальными данными');
    const result=structuredClone(doc),changed=[],added=[];
    let preservedPhotos=0,clearedPhotos=0,untouched=0;
    for(const [group,rows] of selected){
      let found=0;
      for(const page of result.pages){
        for(const section of page.sections){
          if(!types[group].includes(section.type))continue;
          found++;
          const rule=Q.definitions[section.type],old=page.repeaters[section.id];
          const limited=page.slug===''?rows.slice(0,3):rows;
          const taken=new Set();
          const proposed=limited.map((r,i)=>{
            // Image may follow the same factual product only, NEVER another
            // row with a different title or position.
            let oldItem=old.find(item=>item.title.trim().toLocaleLowerCase('ru')===
              r.title.trim().toLocaleLowerCase('ru')&&!taken.has(item.id));
            if(oldItem)taken.add(oldItem.id);
            const previousAtPosition=old[i];
            if(!oldItem&&previousAtPosition?.image)clearedPhotos++;
            if(oldItem?.image)preservedPhotos++;
            return {id:oldItem?.id||Q.blank(section.type).id,
              title:r.title,text:r.text,image:oldItem?.image||''};
          });
          if(JSON.stringify(old)===JSON.stringify(proposed)){
            untouched++;continue;
          }
          page.repeaters[section.id]=proposed;
          changed.push({pageId:page.id,pageTitle:page.title,type:section.type,
            sectionId:section.id,oldCount:old.length,newCount:proposed.length});
          // Intentional: retain recipe references as local overrides, do not
          // rewrite the global recipe or linked copies at different types.
        }
      }
      if(!found){
        const target=group==='questions'?result.pages[result.pages.length-1]:
          group==='steps'?result.pages[Math.min(1,result.pages.length-1)]:
          result.pages[Math.min(1,result.pages.length-1)];
        if(target.sections.length>=12)throw Error('На странице «'+target.title+
          '» нет места для секции «'+labels[group]+'»');
        const type=types[group][0],section=C.createSection(type);
        target.sections.push(section);
        target.repeaters[section.id]=rows.map(r=>({id:Q.blank(type).id,
          title:r.title,text:r.text,image:''}));
        added.push({pageId:target.id,pageTitle:target.title,type,sectionId:section.id,
          newCount:rows.length});
      }
    }
    const valid=P.validate(result),affected=new Set([...changed,...added].map(i=>i.pageId));
    return {project:valid,changes:changed,added,preservedPhotos,clearedPhotos,
      unaffectedSections:untouched,affectedPages:affected.size,
      selectedGroups:selected.map(([name,rows])=>({name,count:rows.length}))};
  }
  Object.defineProperty(window,'CmsPreviewFactualSync',{value:Object.freeze({plan,types})});
})();
