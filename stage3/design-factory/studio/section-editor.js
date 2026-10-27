/* D7 four-page section composition editor; never runs arbitrary HTML/JS. */
(function(root){
'use strict';
function create({engine,state,apply,compile,tr,say}){
 const $=id=>document.getElementById(id);
 let editing=null;
 const copy=v=>JSON.parse(JSON.stringify(v));
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

 // Content edits are staged until explicit Save. The live CMS export, client
 // feedback snapshot and owner sign-off stay untouched during text input.
 function openEditor(pageKey,section){
  if(editing&&editing.page===pageKey&&editing.id===section.id){
   editing=null;
  }else{
   const manifest=engine.compiler.loadRegistry().get(section.component);
   if(!manifest)throw Error('Registered component not found');
   const fields=[];
   for(const slot of manifest.elements){
    const element=section.elements.find(e=>e.slot===slot.slot);
    if(!element)continue;
    for(const field of slot.fields){
     if(!['text','url'].includes(field.type))continue;
     fields.push({slot:slot.slot,path:field.path,label:slot.label+' · '+field.label,
      value:element.values[field.path],max:field.maxLength||2048,type:field.type});
    }
   }
   editing={page:pageKey,id:section.id,component:section.component,
    original:JSON.stringify(section),fields,items:copy(section.items||[]),
    repeat:manifest.repeat||null,hasMedia:manifest.elements.some(e=>e.fields.some(f=>f.type==='media'))||
      Boolean(manifest.repeat?.fields.some(f=>f.type==='media'))};
  }
  render(compile().site);
 }
 function draftChanged(section){
  if(!editing)return false;
  const slots=new Map(section.elements.map(e=>[e.slot,e]));
  if(editing.fields.some(f=>slots.get(f.slot)?.values[f.path]!==f.value))return true;
  return JSON.stringify(editing.items)!==JSON.stringify(section.items||[]);
 }
 function saveEdit(){
  if(!editing)return;
  const selected=editing;
  const current=compile().site.pages.find(p=>p.id==='df-page-'+selected.page)
   ?.sections.find(s=>s.id===selected.id);
  if(!current||current.component!==selected.component||
     JSON.stringify(current)!==selected.original){
   say(tr('Раздел изменился после открытия. Откройте редактор заново.',
    'Section changed since it was opened. Reopen editor.'),true);
   return;
  }
  if(!draftChanged(current)){editing=null;render(compile().site);return;}
  const change={elements:selected.fields.map(f=>({slot:f.slot,path:f.path,value:f.value}))};
  if(selected.repeat)change.items=copy(selected.items);
  const success=apply(()=>{
   ensurePlan();
   // Existing v1 section-plan files remain valid until the first content change.
   state.sectionPlan.version=2;
   const row=state.sectionPlan.pages[selected.page].find(r=>r.id===selected.id);
   if(!row)throw Error('Section removed while editing');
   row.edit=change;
  });
  if(success){
   editing=null;
   render(compile().site);
   say(tr('Содержимое секции сохранено в рабочем пространстве. Undo доступен; экспорт остаётся noindex до проверки.',
    'Section content saved to workspace. Undo available; export stays noindex until approved.'));
  }
 }
 function cancelEdit(){editing=null;render(compile().site);}
 function addItem(){
  if(!editing?.repeat||editing.items.length>=editing.repeat.max)return;
  const occupied=new Set(editing.items.map(item=>item.id));
  let id=null;
  for(let n=1;n<=999;n++){
   const candidate=editing.id+'-item-'+n;
   if(!occupied.has(candidate)&&candidate.length<=79){id=candidate;break;}
  }
  if(!id)return;
  editing.items.push({id,values:Object.fromEntries(editing.repeat.fields.map(f=>[f.path,f.default]))});
  render(compile().site);
 }
 function changeItem(index,delta){
  if(!editing||index<0||index>=editing.items.length)return;
  const dest=index+delta;if(dest<0||dest>=editing.items.length)return;
  [editing.items[index],editing.items[dest]]=[editing.items[dest],editing.items[index]];
  render(compile().site);
 }
 function deleteItem(index){
  if(!editing?.repeat||editing.items.length<=editing.repeat.min)return;
  editing.items.splice(index,1);render(compile().site);
 }
 function editPanel(card,section){
  if(!editing||editing.page!==state.page||editing.id!==section.id)return;
  const area=element('div',undefined,'section-content-panel');
  area.append(element('strong',tr('Содержание CMS-секции','CMS section content')));
  const guidance=element('p',tr(
   'Правки сохраняются только кнопкой ниже. Вводите проверенные сведения; ссылки должны соответствовать маршрутам CMS.',
   'Changes are saved only when you press Save. Use verified facts and supported CMS links.'));
  guidance.className='bulk-services-hint';area.append(guidance);
  const makeField=(label,value,max,type,onInput)=>{
   const wrapper=element('label',undefined,'field');
   wrapper.append(element('span',label));
   const input=type==='url'||max<=180?element('input'):element('textarea');
   if(input.tagName==='INPUT')input.type='text';
   else input.rows=max>500?4:3;
   input.value=value;input.maxLength=max;
   input.addEventListener('input',()=>onInput(input.value));
   wrapper.append(input);return wrapper;
  };
  for(const field of editing.fields)
   area.append(makeField(field.label,field.value,field.max,field.type,v=>{field.value=v;}));
  if(editing.repeat){
   const descriptor=element('div',undefined,'section-repeater-head');
   descriptor.append(element('strong',tr('Карточки / повторяемые элементы','Repeatable items')),
    element('small',editing.items.length+' / '+editing.repeat.max));
   area.append(descriptor);
   editing.items.forEach((item,index)=>{
    const group=element('div',undefined,'section-repeat-row');
    const bar=element('div',undefined,'section-repeat-actions');
    bar.append(element('strong',String(index+1).padStart(2,'0')));
    for(const [symbol,label,blocked,fn] of [
     ['↑',tr('Вверх','Up'),index===0,()=>changeItem(index,-1)],
     ['↓',tr('Вниз','Down'),index===editing.items.length-1,()=>changeItem(index,1)],
     ['×',tr('Удалить карточку','Remove item'),editing.items.length<=editing.repeat.min,()=>deleteItem(index)]
    ]){
     const button=element('button',symbol,'service-action');
     button.type='button';button.disabled=blocked;button.title=label;
     button.setAttribute('aria-label',label+' '+(index+1));button.addEventListener('click',fn);
     bar.append(button);
    }
    group.append(bar);
    for(const field of editing.repeat.fields){
     if(!['text','url'].includes(field.type))continue;
     group.append(makeField(field.label,item.values[field.path],field.maxLength||2048,field.type,
      value=>{item.values[field.path]=value;}));
    }
    area.append(group);
   });
   const add=element('button',tr('+ Добавить карточку','+ Add item'),'minor-btn');
   add.type='button';add.disabled=editing.items.length>=editing.repeat.max;
   add.addEventListener('click',addItem);area.append(add);
  }
  if(editing.hasMedia)area.append(element('p',tr(
   'Медиа здесь не изменяются: для изображений нужен отдельный подтверждённый asset workflow.',
   'Media cannot be edited here; approved assets need a separate media workflow.'),'bulk-services-hint'));
  const controls=element('div',undefined,'section-editor-actions-bottom');
  const save=element('button',tr('Сохранить секцию','Save section'),'minor-btn');
  save.type='button';save.addEventListener('click',saveEdit);
  const cancel=element('button',tr('Отмена','Cancel'),'minor-btn');
  cancel.type='button';cancel.addEventListener('click',cancelEdit);
  controls.append(save,cancel);area.append(controls);card.append(area);
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
  if(editing&&editing.page===state.page&&!page.sections.some(s=>s.id===editing.id))
   editing=null;
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
    ['×',tr('Удалить','Remove'),locked,()=>remove(index)],
    ['✎',tr('Редактировать контент','Edit content'),false,()=>openEditor(state.page,section)]
   ]){
    const button=element('button',symbol,'service-action');
    button.type='button';button.disabled=disabled;
    button.id='section-'+(symbol==='↑'?'up':symbol==='↓'?'down':'remove')+'-'+row.id;
    button.title=label;button.setAttribute('aria-label',label+' '+(index+1));
    button.addEventListener('click',handler);
    actions.append(button);
   }
   card.append(text,actions);editPanel(card,section);holder.append(card);
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
