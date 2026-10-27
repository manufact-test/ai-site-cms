/* D7 four-page section composition editor; never runs arbitrary HTML/JS. */
(function(root){
'use strict';
function create({engine,state,apply,compile,tr,say}){
 const $=id=>document.getElementById(id);
 const pageLabels={ru:{home:'Главная',services:'Услуги',approach:'Подход',contact:'Контакты'},
  en:{home:'Home',services:'Services',approach:'Approach',contact:'Contact'}};
 function element(tag,text,cls){
  const n=document.createElement(tag);
  if(text!==undefined)n.textContent=text;
  if(cls)n.className=cls;
  return n;
 }
 function ensurePlan(){
  if(!state.sectionPlan)
   state.sectionPlan=engine.sectionPlan.capture(compile().site,state.composition);
 }
 function rows(site){
  return state.sectionPlan?state.sectionPlan.pages[state.page]:
   engine.sectionPlan.capture(site,state.composition).pages[state.page];
 }
 function move(index,delta){
  apply(()=>{
   ensurePlan();
   const items=state.sectionPlan.pages[state.page],target=index+delta;
   if(index<0||target<0||target>=items.length)throw Error('Недопустимое перемещение секции');
   [items[index],items[target]]=[items[target],items[index]];
  });
 }
 function remove(index){
  apply(()=>{
   ensurePlan();
   const items=state.sectionPlan.pages[state.page],row=items[index];
   if(!row)throw Error('Секция не найдена');
   const page=compile().site.pages.find(p=>p.id==='df-page-'+state.page);
   const section=page.sections.find(s=>s.id===row.id);
   if(section&&!row.id.startsWith('df-added-')&&row.id!=='df-selected-composition'&&
      ['company-hero','cta-banner'].includes(section.component))
    throw Error('Исходные hero и CTA обязательны');
   items.splice(index,1);
   if(row.id==='df-selected-composition')state.composition=null;
  });
 }
 function add(){
  const value=$('section-template').value;
  if(!value)return;
  const successful=apply(()=>{
   engine.compositions.get(value);
   ensurePlan();
   const items=state.sectionPlan.pages[state.page];
   if(items.filter(x=>x.id.startsWith('df-added-'+state.page+'-')).length>=engine.sectionPlan.MAX_ADDED)
    throw Error('Максимум 8 новых секций на страницу');
   const id=engine.sectionPlan.nextId(state.sectionPlan,state.page);
   const page=compile().site.pages.find(p=>p.id==='df-page-'+state.page);
   const cta=page.sections.find(s=>s.component==='cta-banner'&&!s.id.startsWith('df-added-'));
   const before=cta?items.findIndex(s=>s.id===cta.id):-1;
   items.splice(before<0?items.length:before,0,{id,composition:value});
  });
  if(successful){
   $('section-template').value='';
   $('section-add').disabled=true;
   say(tr('Секция добавлена. Доступен Undo; CMS остаётся noindex до проверки черновиков.',
    'Section added. Undo is available; CMS remains noindex until draft review.'));
  }
 }
 function reset(){
  if(!state.sectionPlan)return;
  apply(()=>{
   const w={format:'manufact-design-factory-workspace-v1',version:1,
    project:state.project,composition:state.composition};
   const original=engine.bridge.build(w);
   const defaultPlan=engine.sectionPlan.capture(original.site,state.composition);
   state.sectionPlan.pages[state.page]=defaultPlan.pages[state.page];
  });
 }
 function legacy(value){
  apply(()=>{
   if(value)engine.compositions.get(value);
   if(state.sectionPlan){
    const items=state.sectionPlan.pages.home;
    const index=items.findIndex(row=>row.id==='df-selected-composition');
    if(index>=0)items.splice(index,1);
    if(value){
     const base=engine.compiler.compile(state.project).site.pages[0];
     const cta=base.sections.find(s=>s.component==='cta-banner');
     const before=cta?items.findIndex(row=>row.id===cta.id):-1;
     items.splice(before<0?items.length:before,0,{id:'df-selected-composition',composition:value});
    }
   }
   state.composition=value;state.page='home';
  });
 }
 function render(site){
  const holder=$('section-list'),choice=$('section-template');
  if(!holder||!choice)return;
  holder.replaceChildren();
  const selected=choice.value;
  const blank=element('option',tr('Выберите композицию…','Choose a composition…'));
  blank.value='';choice.replaceChildren(blank);
  for(const [id,label] of engine.compositions.GROUPS){
   const group=element('optgroup');group.label=label;
   for(const c of engine.compositions.list(id)){
    const option=element('option',c.label+' · '+c.cmsComponent);
    option.value=c.id;group.append(option);
   }
   choice.append(group);
  }
  choice.value=selected||'';
  $('section-add').disabled=!site||!choice.value;
  $('section-reset').disabled=!site||!state.sectionPlan;
  $('section-page-name').textContent=pageLabels[state.project.language][state.page];
  $('section-editor-note').textContent=tr(
   'Меняйте порядок секций выбранной страницы. Hero и CTA исходного кита защищены. Новые композиции содержат черновики текста: CMS экспорт noindex до согласования.',
   'Reorder sections of the selected page. Original hero and CTA are protected. New compositions have draft copy: CMS export stays noindex until reviewed.');
  if(!site){holder.append(element('p',tr('Исправьте проект.','Fix project data.')));return;}
  const page=site.pages.find(p=>p.id==='df-page-'+state.page);
  const items=rows(site);
  $('section-count').textContent=String(items.length);
  items.forEach((row,index)=>{
   const section=page.sections[index];
   if(!section||section.id!==row.id)return;
   const composition=row.composition?engine.compositions.get(row.composition):null;
   const locked=!row.id.startsWith('df-added-')&&row.id!=='df-selected-composition'&&
    ['company-hero','cta-banner'].includes(section.component);
   const card=element('div',undefined,'section-editor-row');
   const text=element('div',undefined,'section-editor-copy');
   text.append(element('strong',String(index+1).padStart(2,'0')+' · '+
    (composition?composition.label:section.component)));
   text.append(element('small',row.id+' · '+(composition?'CMS fallback: ':'')+section.component+
    (locked?tr(' · обязательна',' · protected'):'')));
   const actions=element('div',undefined,'section-editor-actions');
   for(const [symbol,label,disabled,handler] of [
    ['↑',tr('Поднять','Move up'),index===0,()=>move(index,-1)],
    ['↓',tr('Опустить','Move down'),index===items.length-1,()=>move(index,1)],
    ['×',tr('Удалить','Remove'),locked,()=>remove(index)]
   ]){
    const button=element('button',symbol,'service-action');
    button.type='button';button.disabled=disabled;
    button.id='section-'+(symbol==='↑'?'up':symbol==='↓'?'down':'remove')+'-'+row.id;
    button.title=label;button.setAttribute('aria-label',label+' '+(index+1));
    button.addEventListener('click',handler);
    actions.append(button);
   }
   card.append(text,actions);holder.append(card);
  });
 }
 function mount(){
  $('section-template').addEventListener('change',()=>{
   $('section-add').disabled=!$('section-template').value;
  });
  $('section-add').addEventListener('click',add);
  $('section-reset').addEventListener('click',reset);
 }
 return Object.freeze({mount,render,legacy});
}
root.DesignFactorySectionEditor=Object.freeze({create});
})(globalThis);
