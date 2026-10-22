'use strict';
/**
 * Offline Stage2 editorial review navigator. Advisory UX only, never a
 * publishing gate, signed acceptance, automated legal or SEO decision.
 */
(()=>{
  const P=window.CmsPreviewProject,O=window.CmsPreviewContentOps;
  function summarize(raw){
    const doc=P.validate(raw);
    const review=O.review(doc);
    const pages=doc.pages.map(page=>{
      const issues=review.issues.filter(item=>item.pageId===page.id);
      return {
        id:page.id,title:page.title,slug:page.slug,sections:page.sections.length,
        visible:page.sections.filter(s=>!page.hiddenSections.includes(s.id)).length,
        attention:issues.filter(i=>i.level==='attention').length,
        notes:issues.filter(i=>i.level!=='attention').length
      };
    });
    const issues=review.issues.map((item,i)=>({
      ...item,number:i+1,kind:item.level==='attention'?'Важная правка':'Подсказка'
    }));
    return {
      pages,issues,total:review.total,attention:review.attention,
      notes:review.total-review.attention,
      fields:review.fields,truncated:Math.max(0,review.total-review.issues.length)
    };
  }
  function select(report,{level='all',pageId='all'}={}){
    if(!['all','attention','note'].includes(level))throw Error('Недоступный фильтр');
    if(pageId!=='all'&&!report.pages.some(page=>page.id===pageId))
      throw Error('Неизвестная страница');
    return report.issues.filter(item=>
      (level==='all'||item.level===level)&&
      (pageId==='all'||item.pageId===pageId));
  }
  Object.defineProperty(window,'CmsPreviewQuality',{value:Object.freeze({summarize,select})});
})();
