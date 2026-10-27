/* Offline Design Factory owner handoff and site-readiness audit.
 * An editorial aid, not an owner signature, server audit or publish permission.
 */
(function(global,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 else global.DesignFactorySiteAudit=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const FORMAT='manufact-design-factory-site-audit-v1';
 const ROUTES=['/','/services/','/approach/','/contact/'];
 const FIELDS=['title','headline','description','services','ctaLabel','contactText'];
 const LABELS={
  ru:{title:'Компания',headline:'Главный заголовок',description:'Описание',services:'Услуги',ctaLabel:'Текст кнопки',contactText:'Контакты'},
  en:{title:'Company',headline:'Main headline',description:'Description',services:'Services',ctaLabel:'Button label',contactText:'Contact information'}
 };
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 function build(compiled,project,composition=null,feedback=null,feedbackContext=null){
  if(!compiled||!compiled.site||!compiled.checklist||!project||!own(LABELS,project.language))
   throw Error('Valid compiled project required for audit');
  const {site,checklist}=compiled;
  if(site.format!=='manufact-ai-site-v1'||!Array.isArray(site.pages)||site.pages.length!==4||
   ROUTES.some(route=>site.pages.filter(p=>p.path===route).length!==1))
   throw Error('Audit requires four canonical CMS pages');
  const f=project.facts||{};
  const fields=FIELDS.map(id=>{
   const isService=id==='services',hasContent=isService?Array.isArray(f.services)&&f.services.length>0:
    typeof f[id]==='string'&&Boolean(f[id].trim());
   const missing=checklist.missing.includes('facts.'+id);
   return {id,label:LABELS[project.language][id],required:id!=='ctaLabel',
    status:missing?'needs-owner':hasContent?'provided':'optional-empty',
    value:isService?undefined:(typeof f[id]==='string'?f[id]:''),
    count:isService?(f.services||[]).length:undefined};
  });
  const pages=ROUTES.map(path=>{
   const p=site.pages.find(item=>item.path===path);
   if(!p||typeof p.seo?.title!=='string'||typeof p.seo?.description!=='string'||
    !Array.isArray(p.sections))throw Error('Invalid CMS page in audit');
   return {id:p.id,path,title:p.title,seoTitle:p.seo.title,
    seoDescription:p.seo.description,indexing:p.seo.robots,
    sections:p.sections.map(s=>({id:s.id,component:s.component})),
    callToActionCount:p.sections.filter(s=>s.component==='cta-banner').length};
  });
  const feedbackCurrent=Boolean(feedback&&feedbackContext&&feedback.context===feedbackContext);
  const notes=feedbackCurrent&&Array.isArray(feedback.notes)?feedback.notes:[];
  const feedbackSummary={status:feedback?'stale-or-unmatched':'not-loaded',
   notes:0,open:0,resolved:0};
  if(feedbackCurrent){
   feedbackSummary.status='matching';
   feedbackSummary.notes=notes.length;
   feedbackSummary.resolved=notes.filter(n=>n.resolved===true).length;
   feedbackSummary.open=feedbackSummary.notes-feedbackSummary.resolved;
  }
  const blockers=checklist.missing.map(id=>id.replace(/^facts\./,''));
  if(!checklist.ownerReviewConfirmed)blockers.push('ownerReviewConfirmed');
  const warnings=['Media permissions, truthful claims and working forms require independent owner/server verification.'];
  if(composition)warnings.push('Custom composition is a preview design choice; enhanced CSS and PHP visual parity require integration.');
  if(feedback&&feedbackSummary.status!=='matching')
   warnings.push('Client feedback belongs to another site snapshot and must not be carried into this handoff.');
  if(feedbackSummary.open>0)
   warnings.push('Unresolved client remarks remain. These are editorial, not automatic publish gates.');
  return {format:FORMAT,version:1,
   siteFormat:site.format,kit:project.kit,theme:project.theme,language:project.language,
   composition:composition||null,ownerReviewConfirmed:checklist.ownerReviewConfirmed===true,
   indexable:checklist.readyForPublish===true,
   indexing:checklist.indexing,ownerFields:fields,
   services:Array.isArray(f.services)?f.services.map(s=>({title:s.title,description:s.description})):[],
   pages,feedback:feedbackSummary,blockers,warnings,
   limitations:'Offline editorial report only. Not a client signature, visual QA, real PHP parity or publication approval.'};
 }
 function html(report){
  if(!report||report.format!==FORMAT||report.version!==1||!own(LABELS,report.language)||
   !Array.isArray(report.ownerFields)||!Array.isArray(report.pages))
   throw Error('Invalid site audit report');
  const en=report.language==='en',t=(ru,eng)=>en?eng:ru;
  const status=s=>s==='needs-owner'?t('Требует владельца','Needs owner'):
   s==='provided'?t('Заполнено','Provided'):t('Необязательно','Optional');
  const fields=report.ownerFields.map(f=>'<tr><th scope="row">'+esc(f.label)+'</th><td>'+
   esc(f.status==='needs-owner'?t('Требует проверки','Needs review'):status(f.status))+
   '</td><td>'+esc(f.id==='services'?String(f.count)+' '+t('услуг','services'):f.value)+'</td></tr>').join('');
  const services=report.services.map((s,i)=>'<li><b>'+esc(String(i+1)+'. '+s.title)+'</b><p>'+esc(s.description)+'</p></li>').join('');
  const pages=report.pages.map(p=>'<article><h3>'+esc(p.title)+'</h3><p class="path">'+esc(p.path)+'</p>'+
   '<p><b>SEO:</b> '+esc(p.seoTitle)+'</p><p>'+esc(p.seoDescription)+'</p>'+
   '<p>'+t('Секций: ','Sections: ')+p.sections.length+' · '+t('CTA: ','CTA: ')+
   p.callToActionCount+' · robots: '+esc(p.indexing)+'</p></article>').join('');
  const problems=report.blockers.map(s=>'<li>'+esc(s)+'</li>').join('');
  const notes=report.warnings.map(s=>'<li>'+esc(s)+'</li>').join('');
  return '<!doctype html><html lang="'+esc(report.language)+'"><head><meta charset="utf-8">'+
   '<meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<meta name="robots" content="noindex">'+
   '<meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;; base-uri &apos;none&apos;">'+
   '<title>'+t('Акт проверки содержания','Content handoff report')+'</title>'+
   '<style>*{box-sizing:border-box}body{font:15px/1.6 system-ui,sans-serif;margin:0;color:#17302c;background:#f5f7f3}main{max-width:980px;margin:auto;padding:clamp(16px,5vw,58px)}h1{font-size:clamp(26px,4vw,40px);line-height:1.1}section{padding:22px;margin:18px 0;background:white;border:1px solid #cbdad3;border-radius:14px}h2{margin-top:0}h3{margin-bottom:5px}p{overflow-wrap:anywhere}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #d8e4de;text-align:left;vertical-align:top;overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.grid article{border:1px solid #d7e4de;border-radius:10px;padding:13px}.path{color:#526d61}li{padding:4px 0;overflow-wrap:anywhere}li p{margin:0 0 9px}.danger{color:#904337}@media print{body{background:white}main{padding:0}section{break-inside:avoid;border:1px solid #aaa}}</style>'+
   '</head><body><main><h1>'+t('Проверка проекта сайта','Website content handoff')+'</h1>'+
   '<p>'+t('Этот документ создан локально для сверки содержания с владельцем. Он не подписан и не разрешает публикацию.','Generated offline for owner content review. This is unsigned and does not authorize publication.')+'</p>'+
   '<p>'+esc(report.kit)+' · '+esc(report.theme)+' · '+esc(report.language)+' · robots='+esc(report.indexing)+'</p>'+
   '<section><h2>'+t('Данные владельца','Owner facts')+'</h2><table><thead><tr><th>'+t('Поле','Field')+'</th><th>'+t('Статус','Status')+'</th><th>'+t('Данные','Value')+'</th></tr></thead><tbody>'+fields+'</tbody></table></section>'+
   '<section><h2>'+t('Список услуг','Services')+'</h2><ol>'+services+'</ol></section>'+
   '<section><h2>'+t('Четыре страницы','Four pages')+'</h2><div class="grid">'+pages+'</div></section>'+
   '<section><h2>'+t('Что проверить','Review items')+'</h2><ul class="danger">'+problems+'</ul><ul>'+notes+'</ul>'+
   '<p>'+t('Замечания: ','Feedback: ')+esc(report.feedback.status)+'; '+t('не закрыто: ','open: ')+esc(report.feedback.open)+'</p></section>'+
   '<p>'+esc(report.limitations)+'</p></main></body></html>\n';
 }
 return Object.freeze({FORMAT,build,html});
});
