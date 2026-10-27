/* Four-route SEO + navigation metadata Studio editor: staged until explicit Save. */
(function(root){
'use strict';
function create({engine,state,apply,compile,tr,say}){
 const $=id=>document.getElementById(id);
 const paths=['home','services','approach','contact'];
 const fields=engine.pageSettings.FIELDS;
 const names={ru:{home:'Главная',services:'Услуги',approach:'Подход',contact:'Контакты'},
  en:{home:'Home',services:'Services',approach:'Approach',contact:'Contact'}};
 const labels={title:['Заголовок страницы','Page title'],seoTitle:['SEO Title','SEO title'],
  seoDescription:['SEO Description','SEO description'],navigationLabel:['Название в меню','Navigation label']};
 const drafts=new Map();
 function currentRow(site,key){
  const p=site?.pages.find(x=>x.id==='df-page-'+key);
  return p?{title:p.title,seoTitle:p.seo.title,seoDescription:p.seo.description,
   navigationLabel:p.navigation.label}:null;
 }
 function same(a,b){return fields.every(k=>a?.[k]===b?.[k]);}
 function clearDrafts(){drafts.clear();}
 function render(site){
  const key=state.page;
  $('page-meta-name').textContent=names[state.project.language][key];
  const original=currentRow(site,key),draft=drafts.get(key);
  if(!original){
   for(const field of fields)$('page-meta-'+field).disabled=true;
   $('page-meta-save').disabled=true;$('page-meta-reset').disabled=true;$('page-meta-cancel').disabled=true;
   $('page-meta-status').textContent=tr('Исправьте ошибки проекта, чтобы редактировать метаданные.',
    'Fix project errors before editing metadata.');
   return;
  }
  const row=draft||original,edited=draft&&!same(draft,original);
  for(const field of fields){
   const input=$('page-meta-'+field);
   if(document.activeElement!==input)input.value=row[field];
   input.maxLength=engine.pageSettings.LIMITS[field];
   input.disabled=false;
   $('page-meta-count-'+field).textContent=String(row[field].length)+' / '+engine.pageSettings.LIMITS[field];
  }
  const base=currentRow(engine.compiler.compile(state.project).site,key);
  $('page-meta-save').disabled=!edited;
  $('page-meta-cancel').disabled=!draft;
  $('page-meta-reset').disabled=same(original,base);
  const other=[...drafts].filter(([k,v])=>k!==key&&
   !same(v,state.pageSettings?.pages[k]||currentRow(site,k))).length;
  $('page-meta-status').textContent=(edited
   ?tr('Есть несохранённые изменения на этой странице. В экспорт они пока не входят.',
    'Unsaved page changes are NOT included in export.')
   :tr('Изменения применяются только после сохранения. Robots и адрес страницы защищены.',
    'Changes apply only after saving. Robots and page URL are protected.'))+
   (other?' '+tr('Черновики на других страницах: ','Unsaved drafts on other pages: ')+other+'.':'');
 }
 function update(field,value){
  const key=state.page,live=currentRow(compile().site,key);
  if(!live)return;
  const row=drafts.get(key)||{...live};
  row[field]=value;
  drafts.set(key,row);
  const saved=currentRow(compile().site,key);
  $('page-meta-save').disabled=same(row,saved);
  $('page-meta-cancel').disabled=false;
  $('page-meta-count-'+field).textContent=String(value.length)+' / '+engine.pageSettings.LIMITS[field];
  $('page-meta-status').textContent=tr('Черновик. Нажмите «Сохранить», чтобы применить изменения.',
   'Draft only. Press Save to apply changes.');
 }
 function save(){
  const key=state.page,draft=drafts.get(key),current=compile().site;
  if(!draft||same(draft,currentRow(current,key)))return;
  if(apply(()=>{
   const settings=state.pageSettings||engine.pageSettings.capture(engine.compiler.compile(state.project).site);
   settings.pages[key]={...draft};
   state.pageSettings=settings;
  })){
   drafts.delete(key);
   render(compile().site);
   say(tr('Настройки страницы сохранены. CMS и D6 обновлены; индексация защищена до проверки.',
    'Page settings saved. CMS and D6 updated; indexing remains protected until review.'));
  }
 }
 function cancel(){drafts.delete(state.page);render(compile().site);}
 function reset(){
  const key=state.page,current=compile().site,baseline=engine.pageSettings.capture(engine.compiler.compile(state.project).site);
  if(same(currentRow(current,key),baseline.pages[key])){cancel();return;}
  if(apply(()=>{
   const settings=state.pageSettings||engine.pageSettings.capture(engine.compiler.compile(state.project).site);
   settings.pages[key]={...baseline.pages[key]};
   state.pageSettings=settings;
  })){
   drafts.delete(key);
   render(compile().site);
   say(tr('Восстановлены значения выбранной страницы. Другие страницы не изменены.',
    'Selected page defaults restored. Other pages unchanged.'));
  }
 }
 function mount(){
  for(const field of fields){
   const input=$('page-meta-'+field);
   $('page-meta-label-'+field).textContent=tr(...labels[field]);
   input.addEventListener('input',()=>update(field,input.value));
  }
  $('page-meta-save').addEventListener('click',save);
  $('page-meta-reset').addEventListener('click',reset);
  $('page-meta-cancel').addEventListener('click',cancel);
 }
 return Object.freeze({mount,render,clearDrafts});
}
root.DesignFactoryPageSettings=Object.freeze({create});
})(globalThis);
