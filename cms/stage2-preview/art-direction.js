'use strict';
/* Curated offline art direction for the Stage 2 Studio. No AI, remote assets or publish. */
(()=>{
  const P=window.CmsPreviewProject;
  const profiles=Object.freeze({
    precision:Object.freeze({name:'Точная инженерия',description:'Контрастная промышленная сетка, строгая типографика, плотные карточки.',color:'#17658a',theme:'ocean',
      design:{accent:'#17658a',font:'geometric',radius:'sharp',spacing:'compact',navigation:'bordered',scale:'restrained',contentWidth:'wide'}}),
    atelier:Object.freeze({name:'Редакционный минимализм',description:'Крупная типографика, просторные истории, спокойные визуальные акценты.',color:'#a65039',theme:'coral',
      design:{accent:'#a65039',font:'editorial',radius:'soft',spacing:'relaxed',navigation:'standard',scale:'impact',contentWidth:'standard'}}),
    momentum:Object.freeze({name:'Яркая студия',description:'Выразительные первые экраны, плавающее меню и динамичные чередования.',color:'#ed5c22',theme:'coral',
      design:{accent:'#ed5c22',font:'geometric',radius:'round',spacing:'comfortable',navigation:'floating',scale:'impact',contentWidth:'wide'}}),
    evergreen:Object.freeze({name:'Естественная эстетика',description:'Мягкие цвета, воздушные секции и компактные продуктовые сетки.',color:'#257455',theme:'forest',
      design:{accent:'#257455',font:'editorial',radius:'round',spacing:'relaxed',navigation:'standard',scale:'balanced',contentWidth:'standard'}})
  });
  const grids=new Set(['features','services','catalog','metrics','process']);
  function composePage(page,key,pageIndex){
    const surface={},layouts={};
    const profile=profiles[key];
    if(!profile)throw Error('Неизвестное дизайн-направление');
    page.sections.forEach((section,index)=>{
      const type=section.type;
      let tone='';
      if(type==='contact'||type==='leadform')tone=key==='evergreen'?'soft':'dark';
      else if(type==='hero')tone=key==='momentum'?'accent':'soft';
      else if(type==='quote')tone=key==='atelier'?'soft':'';
      else if(key==='precision'&&type==='metrics')tone='dark';
      else if(key==='momentum'&&index%3===1)tone='soft';
      else if(key==='evergreen'&&index%2===1)tone='soft';
      else if(key==='atelier'&&index%3===2)tone='soft';
      else if(key==='precision'&&index%3===2)tone='soft';
      if(tone)surface[section.id]=tone;
      const layout=P.defaultLayout();
      if(type==='hero'){
        layout.width=key==='precision'||key==='momentum'?'wide':'default';
        layout.density=key==='precision'?'compact':'spacious';
        layout.align=key==='atelier'?'center':'left';
        layout.reverse=key==='evergreen'&&pageIndex%2===1;
      }else if(type==='story'){
        layout.width=key==='atelier'?'narrow':'default';
        layout.density=key==='precision'?'compact':'spacious';
        layout.reverse=key==='precision'||(key==='momentum'&&pageIndex%2===0);
        layout.align=key==='evergreen'?'center':'left';
      }else if(grids.has(type)){
        layout.columns=(key==='precision'||key==='evergreen')?'two':'three';
        layout.density=key==='precision'?'compact':key==='atelier'?'spacious':'default';
        layout.width=key==='momentum'?'wide':'default';
      }else if(type==='quote'||type==='faq'){
        layout.width=key==='atelier'||key==='evergreen'?'narrow':'default';
        layout.align=key==='atelier'?'center':'left';
        layout.density=key==='atelier'?'spacious':'default';
      }else if(type==='contact'||type==='leadform'){
        layout.density=key==='precision'?'compact':'spacious';
        layout.align=key==='evergreen'?'center':'left';
      }else if(index%2===1){
        layout.density=key==='precision'?'compact':'spacious';
      }
      if(Object.keys(layout).some(field=>layout[field]!==P.defaultLayout()[field]))
        layouts[section.id]=layout;
    });
    // Replaces visual composition only; content, media, SEO, actions and links survive unchanged.
    page.sectionStyles=surface;
    page.sectionLayouts=layouts;
  }
  function compose(source,key,scope='all',activePageId=''){
    if(!Object.hasOwn(profiles,key))throw Error('Неизвестное дизайн-направление');
    if(!['all','page'].includes(scope))throw Error('Неизвестная область изменения');
    const project=P.validate(source),profile=profiles[key];
    if(scope==='all'){
      project.theme=profile.theme;
      project.design={...profile.design};
      project.pages.forEach((page,index)=>composePage(page,key,index));
    }else{
      const index=project.pages.findIndex(page=>page.id===activePageId);
      if(index<0)throw Error('Страница для композиции не найдена');
      composePage(project.pages[index],key,index);
    }
    return P.validate(project);
  }
  Object.defineProperty(window,'CmsPreviewArtDirection',{value:Object.freeze({profiles,compose})});
})();
