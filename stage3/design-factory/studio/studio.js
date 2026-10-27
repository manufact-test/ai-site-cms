/* D5 Design Factory Studio — offline, same first-party CMS compiler + validator.
 * No API, framework, localStorage, eval, remote resources or user HTML execution.
 */
(function(){
'use strict';
const engine=globalThis.DesignFactory;
const $=id=>document.getElementById(id);
const WORKSPACE='manufact-design-factory-workspace-v1';
const feedbackTool=globalThis.DesignFactoryFeedback;
const auditTool=globalThis.DesignFactorySiteAudit;
const deliveryTool=globalThis.DesignFactoryDeliveryPackage;
const sectionTool=globalThis.DesignFactorySectionEditor;
const LANG={
 ru:{home:'Главная',services:'Услуги',approach:'Подход',contact:'Контакты'},
 en:{home:'Home',services:'Services',approach:'Approach',contact:'Contact'}
};
const tr=(ru,en)=>state.project.language==='en'?en:ru;
const icons={agency:'✦',industrial:'▥',consulting:'◎','local-services':'⌂',saas:'⬡',logistics:'⇢',architecture:'◫',education:'◈',portfolio:'◉',restaurant:'✳',repair:'⚒',nonprofit:'♡'};
const factLabels={title:'Название',headline:'Главный заголовок',description:'Описание',services:'Услуги',contactText:'Контактные данные'};
const clone=v=>structuredClone(v);
const projectDefault=()=>engine.compiler.migrate(null);
const state={
 project:projectDefault(),
 composition:null,sectionPlan:null,
 page:'home',device:'desktop',query:'',viewMode:'single',compareTheme:'noir',overviewFrames:[],
 past:[],future:[],renderToken:0,lastSite:null,lastCompiled:null,lastError:null,feedback:null,
 editRevision:0,feedbackRevision:0,projectImportSerial:0,feedbackImportSerial:0,lastAudit:null
};
const keys=Object.keys(engine.compiler.KITS);
const devices=['desktop','tablet','mobile'];
const pages=['home','services','approach','contact'];
const MAX_HISTORY=60;
function el(tag,props,children){
 const node=document.createElement(tag);
 if(props)for(const [key,val] of Object.entries(props)){
  if(key==='class')node.className=val;
  else if(key==='text')node.textContent=val;
  else if(key==='title')node.title=val;
  else if(key==='value')node.value=val;
  else if(key==='dataset')for(const [name,data] of Object.entries(val))node.dataset[name]=data;
  else if(key==='disabled')node.disabled=val;
  else if(key==='aria-pressed'||key==='aria-current'||key==='role')node.setAttribute(key,String(val));
  else node.setAttribute(key,String(val));
 }
 if(children)for(const child of children)node.append(child);
 return node;
}
function say(text,isError=false){
 const node=$('message');node.textContent=text;node.classList.toggle('error',isError);
}
function snapshot(){return {project:clone(state.project),composition:state.composition,sectionPlan:clone(state.sectionPlan)};}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function historyRecord(before){
 if(equal(before,snapshot()))return;
 state.editRevision++;
 state.past.push(before);if(state.past.length>MAX_HISTORY)state.past.shift();state.future=[];
 refreshHistory();
}
function apply(mutator,options={}){
 const prev=snapshot();
 try{mutator();if(!options.preserveReview)state.project.ownerReviewConfirmed=false;
   engine.compiler.validateProject(state.project);
   if(state.composition!==null)engine.compositions.get(state.composition);
    if(state.sectionPlan)engine.bridge.workspace(workspace());
   renderAll();
   historyRecord(prev);
   return true;
 }catch(error){
  state.project=prev.project;state.composition=prev.composition;state.sectionPlan=prev.sectionPlan;
  renderAll();
  if(options.throwOnError)throw error;
  say(error.message,true);
  return false;
 }
}
function setHistory(direction){
 const from=direction==='undo'?state.past:state.future;
 const to=direction==='undo'?state.future:state.past;
 if(!from.length)return;
 to.push(snapshot());const next=from.pop();
 state.project=next.project;state.composition=next.composition;state.sectionPlan=next.sectionPlan;
 // Undo/Redo must never silently restore a previous authorization to index.
 // Owner must actively re-confirm after any history navigation.
 state.project.ownerReviewConfirmed=false;
 state.editRevision++;
 refreshHistory();renderAll();say(direction==='undo'?'Изменение отменено.':'Изменение восстановлено.');
}
function refreshHistory(){
 $('undo').disabled=!state.past.length;
 $('redo').disabled=!state.future.length;
}
function compileForTheme(theme){
 if(!Object.prototype.hasOwnProperty.call(engine.compiler.THEMES,theme))throw Error('Неизвестная тема сравнения');
 const project=theme===state.project.theme?state.project:{...clone(state.project),theme};
 const w={format:WORKSPACE,version:state.sectionPlan?2:1,project,composition:state.composition};
 if(state.sectionPlan)w.sectionPlan=state.sectionPlan;
 const built=engine.bridge.build(w);
 return {project,site:built.site,checklist:built.ownerChecklist,inspection:built.inspection,
  designSpec:built.designSpec,bridge:built.compatibility.composition};
}
function compileCurrent(){return compileForTheme(state.project.theme);}
const sectionEditor=sectionTool?.create({engine,state,apply,compile:compileCurrent,tr,say});
function renderKits(){
 const holder=$('kit-list');holder.replaceChildren();
 let visible=0;
 for(const kitId of keys){
  const item=engine.compiler.KITS[kitId];
  const label=item.label[state.project.language]||item.label.ru;
  const search=(label+' '+kitId+' '+item.label.ru+' '+item.label.en).toLowerCase();
  if(!search.includes(state.query))continue;
  visible++;
  const button=el('button',{id:'kit-'+kitId,type:'button',class:'kit-item','aria-pressed':kitId===state.project.kit});
  button.append(el('span',{class:'kit-glyph',text:icons[kitId]||'◆'}));
  const info=el('span');
  info.append(el('b',{text:label}),el('small',{text:item.archetype+' / 4 '+(state.project.language==='ru'?'страницы':'pages')}));
  button.append(info);
  button.addEventListener('click',()=>apply(()=>{
   state.project.kit=kitId;
   state.project.theme=item.theme;
    state.sectionPlan=null; // Reset mappings that may change with a new kit.
   state.page='home';
  }));
  holder.append(button);
 }
 $('catalog-count').textContent=String(visible);
 if(!visible)holder.append(el('p',{class:'empty-search',text:'По вашему запросу направлений не найдено.'}));
}
function renderThemes(){
 const holder=$('theme-list');holder.replaceChildren();
 for(const [id,theme] of Object.entries(engine.compiler.THEMES)){
  const card=el('button',{id:'theme-'+id,type:'button',class:'theme-card','aria-pressed':id===state.project.theme,title:theme.label});
  const swatch=el('div',{class:'theme-swatch'});
  swatch.style.background=theme.cms.background;
  swatch.style.setProperty('--ink',theme.cms.text);
  swatch.style.setProperty('--accent',theme.cms.primary);
  swatch.append(el('i'));
  card.append(swatch,el('strong',{text:theme.label.replace(/^[0-9]{2}\s*\/\s*/, '')}));
  card.addEventListener('click',()=>apply(()=>{state.project.theme=id;}));
  holder.append(card);
 }
 $('theme-current').textContent=engine.compiler.THEMES[state.project.theme].label;
}
function renderPages(){
 const activeId=document.activeElement?.id||'';
 const container=$('page-list');container.replaceChildren();
 pages.forEach(page=>{
  const button=el('button',{id:'page-'+page,type:'button',text:LANG[state.project.language][page]});
  if(state.page===page)button.setAttribute('aria-current','page');
  button.addEventListener('click',()=>{state.page=page;renderPages();renderPreview();});
  container.append(button);
 });
 if(activeId){const target=$(activeId);if(target)target.focus({preventScroll:true});}
}
function updateWorkbenchSubtitle(){
 const facts=state.project.facts;
 $('workbench-subtitle').textContent=state.project.kit+' · '+(facts.title||'Добавьте название')+' · 4 страницы';
}
function syncReviewControl(){
 const input=$('owner-review-confirmed');
 if(!input)return;
 const gate=engine.compiler.checklist(state.project);
 input.checked=state.project.ownerReviewConfirmed===true;
 input.disabled=!gate.factsComplete;
 input.setAttribute('aria-describedby','owner-review-help');
}
function renderFields(){
 const facts=state.project.facts;
 $('language').value=state.project.language;
 $('siteId').value=facts.siteId||'';
 for(const input of document.querySelectorAll('[data-fact]'))input.value=facts[input.dataset.fact]||'';
 $('workbench-title').textContent=engine.compiler.KITS[state.project.kit].label[state.project.language]||engine.compiler.KITS[state.project.kit].label.ru;
 updateWorkbenchSubtitle();
 renderServices();
 syncReviewControl();
}
function renderServices(){
 const target=$('services-list');target.replaceChildren();
 const services=state.project.facts.services||[];
 services.forEach((row,i)=>{
  const box=el('div',{class:'service-editor'}),header=el('div',{class:'service-editor-header'});
  header.append(el('p',{class:'service-index',text:tr('УСЛУГА ','SERVICE ')+String(i+1).padStart(2,'0')}));
  const actions=el('div',{class:'service-editor-actions'});
  const control=(id,label,symbol,disabled,run)=>{
   const button=el('button',{id,type:'button',class:'service-action',title:label,
    'aria-label':label+' '+(i+1),disabled,text:symbol});
   button.addEventListener('click',run);actions.append(button);
  };
  control('move-service-up-'+i,tr('Поднять услугу','Move service up'),'↑',i===0,()=>moveService(i,-1));
  control('move-service-down-'+i,tr('Опустить услугу','Move service down'),'↓',i===services.length-1,()=>moveService(i,1));
  control('duplicate-service-'+i,tr('Дублировать как черновик','Duplicate as draft'),'⧉',services.length>=12,()=>duplicateService(i));
  control('remove-service-'+i,tr('Удалить услугу','Remove service'),'×',false,()=>apply(()=>{
   state.project.facts.services.splice(i,1);
  }));
  header.append(actions);box.append(header);
  for(const [field,label,max,rows] of [['title',tr('Название','Title'),120,1],['description',tr('Описание','Description'),320,3]]){
   const id='service-'+i+'-'+field;
   const inp=rows===1?el('input',{id,type:'text',maxlength:max,value:row[field]}):
    el('textarea',{id,maxlength:max,rows:rows});
   if(rows!==1)inp.value=row[field];
   connectEditor(inp,()=>state.project.facts.services[i][field],v=>{state.project.facts.services[i][field]=v;});
   box.append(el('label',{class:'field'},[el('span',{text:label}),inp]));
  }
  target.append(box);
 });
 $('add-service').disabled=services.length>=12;
 $('bulk-services-add').disabled=services.length>=12;
 $('edit-services-as-list').disabled=services.length===0;
 $('download-services-text').disabled=services.length===0;
 $('replace-services-list').disabled=false;
 $('add-service').textContent=tr('+ Добавить услугу','+ Add service');
 $('bulk-services-add').textContent=tr('+ Добавить список','+ Append list');
 $('replace-services-list').textContent=tr('Заменить список ↺','Replace all ↺');
 $('edit-services-as-list').textContent=tr('Редактировать весь список','Edit full list');
 $('download-services-text').textContent=tr('Скачать список TXT','Download TXT');
 $('bulk-services-label').textContent=tr('Массовое редактирование услуг','Bulk edit services');
 $('bulk-services-help').textContent=tr(
  'Одна услуга на строку: Название | Описание. Можно указать только название (черновик). Добавление сохраняет старые услуги, замена переписывает весь список, её можно отменить через Undo.',
  'One service per line: Title | Description. Title alone creates a draft. Append keeps existing services; Replace changes the whole list (Undo available).');
 $('bulk-services-input').placeholder=tr(
  'Разработка сайта | Дизайн и создание сайта\nПоддержка | Исправление ошибок',
  'Website design | Design and implementation\nSupport | Post-launch fixes');
}
function moveService(index,delta){
 return apply(()=>{
  const list=state.project.facts.services||[],destination=index+delta;
  if(index<0||destination<0||destination>=list.length)throw Error('Некорректное перемещение услуги');
  [list[index],list[destination]]=[list[destination],list[index]];
 });
}
function duplicateService(index){
 return apply(()=>{
  const list=state.project.facts.services||[];
  if(!list[index]||list.length>=12)throw Error('Максимум 12 услуг');
  const prefix=state.project.language==='ru'?'Пример (подтвердить): ':'Example (verify): ';
  // A duplicate stays an explicit draft until rewritten and approved by the owner.
  const duplicate={...list[index],title:prefix+list[index].title.slice(0,120-prefix.length)};
  list.splice(index+1,0,duplicate);
 });
}
function parseBulkServices(input,language){
 const t=(ru,en)=>language==='en'?en:ru;
 if(typeof input!=='string'||input.length>5500)throw Error(t('Список слишком длинный (до 5500 символов)','Input exceeds 5500 characters'));
 const lines=input.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(!lines.length)throw Error(t('Вставьте хотя бы одну услугу','Enter at least one service'));
 if(lines.length>12)throw Error(t('Максимум 12 услуг за одну вставку','Maximum 12 services per batch'));
 const placeholder=language==='en'?'Add verified description.':'Добавьте подтверждённое описание.';
 return lines.map((line,i)=>{
  // Supports title, "Title | Description" and tab-separated title/description.
  const delimiter=line.includes('\t')?line.indexOf('\t'):line.indexOf(' | ');
  const title=(delimiter<0?line:line.slice(0,delimiter)).trim();
  const description=(delimiter<0?'':line.slice(delimiter+(line[delimiter]==='\t'?1:3))).trim()||placeholder;
  if(!title||title.length>120||description.length>320||/[\u0000-\u001f\u007f]/.test(title+description))
   throw Error(t('Некорректная строка ','Invalid service row ')+(i+1)+t(' (название до 120, описание до 320)',' (title ≤120, description ≤320)'));
  return {title,description};
 });
}
function addBulkServices(){
 const input=$('bulk-services-input'),source=input.value;
 let count=0;
 const success=apply(()=>{
  const rows=parseBulkServices(source,state.project.language);
  const list=state.project.facts.services||(state.project.facts.services=[]);
  if(list.length+rows.length>12)
   throw Error(tr('Максимум 12 услуг. Сейчас: ','Maximum 12 services. Current: ')+list.length+tr(', добавляется: ', ', adding: ')+rows.length);
  list.push(...rows);count=rows.length;
 });
 if(success){
  input.value='';
  say(tr('Добавлено услуг: ','Added services: ')+count+tr('. Список можно отменить через Undo.','. Undo is available.'));
 }
}

function editFullServices(){
 const list=state.project.facts.services||[],input=$('bulk-services-input');
 if(!list.length){say(tr('Сначала добавьте услуги.','Add services first.'),true);return;}
 if(input.value.trim()){
  say(tr('Поле списка уже заполнено. Сохраните, замените или вручную очистите его перед загрузкой текущих услуг.',
   'The list editor already has text. Save, replace, or clear it before loading current services.'),true);return;
 }
 input.value=list.map(s=>s.title+'\t'+s.description).join('\n');
 input.focus();
 say(tr('Текущие услуги загружены в поле. Исправьте строки и нажмите «Заменить список».',
  'Existing services are loaded below. Edit and choose Replace all.'));
}
function replaceFullServices(){
 const source=$('bulk-services-input').value;
 let count=0;
 const success=apply(()=>{
  const rows=parseBulkServices(source,state.project.language);
  state.project.facts.services=rows;
  count=rows.length;
 });
 if(success){
  $('bulk-services-input').value='';
  say(tr('Заменено услуг: ','Replaced services: ')+count+tr('. Undo отменит замену.','. Undo restores the previous list.'));
 }
}
function downloadServiceList(){
 try{
  const list=state.project.facts.services||[];
  if(!list.length)throw Error(tr('Список услуг пуст.','No services entered.'));
  // Plain UTF-8 .txt, not a CSV/Excel file and never a publishable claim.
  const lines=list.map(s=>s.title+'\t'+s.description);
  download(safeName()+'-services.txt',lines.join('\n')+'\n','text/plain');
  say(tr('Список услуг TXT скачан.','Service list TXT downloaded.'));
 }catch(error){say(error.message,true);}
}

function renderComposition(){
 const select=$('composition');
 select.replaceChildren(el('option',{value:'',text:'Без замены · стандартный kit'}));
 for(const category of engine.compositions.GROUPS){
  const group=el('optgroup',{label:category[1]});
  for(const item of engine.compositions.list(category[0]))
   group.append(el('option',{value:item.id,text:item.label+' / '+item.id}));
  select.append(group);
 }
 select.value=state.composition||'';
 const item=state.composition?engine.compositions.get(state.composition):null;
 $('composition-info').textContent=item
  ?item.label+'. '+item.fallback+'. Требования: '+item.requirements.join('; ')+'.'
  :'Доступны все 42 варианта. Для неподдерживаемой визуальной схемы используется настоящий CMS fallback.';
}

function currentAudit(){
 if(!auditTool)throw Error('Модуль отчёта о сайте не загружен');
 const current=compileCurrent();
 const context=feedbackTool?feedbackTool.context(current,state.project,state.composition):null;
 return auditTool.build(current,state.project,state.composition,state.feedback,context);
}
function renderSiteAudit(compiled){
 const summary=$('site-audit-summary'),holder=$('site-audit-pages');
 if(!summary||!holder)return;
 holder.replaceChildren();
 try{
  if(!compiled)throw Error('Исправьте данные проекта');
  const context=feedbackTool?feedbackTool.context(compiled,state.project,state.composition):null;
  const report=auditTool.build(compiled,state.project,state.composition,state.feedback,context);
  state.lastAudit=report;
  const required=report.ownerFields.filter(f=>f.required&&f.status==='needs-owner').length;
  const unresolved=report.feedback.status==='matching'?report.feedback.open:0;
  summary.textContent='Страниц: '+report.pages.length+
   ' · обязательных полей для проверки: '+required+
   ' · замечаний открыто: '+unresolved+
   ' · robots='+report.indexing+'.';
  for(const page of report.pages){
   const item=el('button',{type:'button',class:'site-audit-page',
    title:'Открыть '+page.path,'aria-label':'Проверить '+page.title});
   item.append(el('strong',{text:page.title}),
    el('small',{text:page.path+' · '+page.sections.length+' секций · '+page.callToActionCount+' CTA'}));
   item.addEventListener('click',()=>{
    const id=pages.find(x=>page.id==='df-page-'+x);
    if(!id)return;state.page=id;state.viewMode='single';renderPages();renderPreview();
   });
   holder.append(item);
  }
  $('site-audit-json').disabled=false;
  $('site-audit-html').disabled=false;
 }catch(error){
  state.lastAudit=null;
  summary.textContent='Отчёт недоступен: '+error.message;
  $('site-audit-json').disabled=true;
  $('site-audit-html').disabled=true;
 }
}
function saveSiteAudit(asHtml){
 try{
  // Compile at click-time: no exports from a stale debounced preview.
  const report=currentAudit();
  if(asHtml)download(safeName()+'-owner-review.html',auditTool.html(report),'text/html');
  else download(safeName()+'-content-audit.json',JSON.stringify(report,null,2)+'\n');
  say(asHtml?'HTML-отчёт для владельца скачан (без разрешения на публикацию).':
   'Структурированный отчёт о сайте скачан. Это не сертификат релиза.');
 }catch(error){say('Аудит не выгружен: '+error.message,true);}
}

function renderChecklist(info){
 const node=$('checklist');node.replaceChildren();
 if(!info)return;
 const gate=info.checklist;
 const statusText=gate.publicationStatus==='section_drafts_require_owner_review'
   ?tr('Новые композиции содержат черновой контент. CMS экспорт защищён noindex.',
    'Inserted compositions contain draft copy. CMS export remains noindex.')
   :gate.readyForPublish
  ?'Проверка владельцем подтверждена. Экспорт получит robots=index; публикация не выполняется автоматически.'
  :gate.factsComplete
   ?'Обязательные поля заполнены, но проверка владельцем не подтверждена. Экспорт получит robots=noindex.'
   :'Черновик защищён: заполните обязательные поля и подтвердите проверку владельцем. Экспорт получит robots=noindex.';
 const status=el('div',{class:'check-item'+(gate.readyForPublish?' good':'')});
 status.append(el('span',{text:gate.readyForPublish?'✓':'!'}),el('span',{text:statusText}));
 node.append(status);
 const present=new Set(gate.missing);
 for(const [key,label] of Object.entries(factLabels)){
  const missing=present.has('facts.'+key);
  const row=el('div',{class:'check-item'+(missing?'':' good')});
  row.append(el('span',{text:missing?'!':'✓'}),el('span',{text:label+(missing?' — заполнить':' — предоставлено')}));
  node.append(row);
 }
 const note=el('div',{class:'check-item'});
 note.append(el('span',{text:'ⓘ'}),el('span',{text:'Перед публикацией обязательно проверьте все утверждения и права на медиа.'}));
 node.append(note);
}
const navigationCode=[
 '<script>',
 "document.addEventListener('click',function(e){",
 "const link=e.target.closest('a[href]');if(!link)return;",
 "const href=link.getAttribute('href');",
 "if(!href||href.startsWith('#'))return;",
 "const match=href.match(/(?:^|\\/)(services|approach|contact)\\/index\\.html$/);",
 "const page=match?match[1]:(href==='index.html'||href==='../index.html'?'home':null);",
 "if(page){e.preventDefault();parent.postMessage({type:'df-navigation',page:page},'*');}",
 "});",
 '</script>'
].join('');

const PREVIEW_INVALID='<!doctype html><html lang="ru"><meta charset="utf-8"><body style="font:16px system-ui;padding:2rem;background:#fff;color:#222">Предпросмотр недоступен: исправьте данные проекта.</body></html>';
function previewPageHtml(compiled,theme,pageId){
 const page=compiled.site.pages.find(p=>p.id==='df-page-'+pageId);
 if(!page)throw Error('Нет страницы '+pageId);
 let html=engine.preview.pageHtml(compiled.site,page,theme,state.project.language);
 const localStyle='<style>'+engine.preview.css(theme)+'</style>';
 html=html.replace(/<link rel="stylesheet" href="[^"]+">/,localStyle);
 html=html.replace('</head>', '<meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;; script-src &apos;unsafe-inline&apos;; base-uri &apos;none&apos;; form-action &apos;none&apos;"></head>');
 return {html:html.replace('</body>',navigationCode+'</body>'),page};
}
function renderOverview(compiled){
 const holder=$('page-overview');
 holder.replaceChildren();
 state.overviewFrames=[];
 for(const pageId of pages){
  const title=LANG[state.project.language][pageId];
  const card=el('article',{class:'overview-card'});
  const head=el('div',{class:'overview-card-header'});
  const open=el('button',{type:'button',class:'minor-btn',text:'Открыть страницу'});
  open.addEventListener('click',()=>{
   state.page=pageId;state.viewMode='single';
   renderPages();renderPreview();
  });
  head.append(el('strong',{text:title}),open);
  const scroller=el('div',{class:'overview-scroller'});
  const frame=el('iframe',{
   title:'Мобильный просмотр: '+title,
   sandbox:'allow-scripts',referrerpolicy:'no-referrer'
  });
  frame.srcdoc=previewPageHtml(compiled,state.project.theme,pageId).html;
  scroller.append(frame);
  card.append(head,scroller);
  holder.append(card);
  state.overviewFrames.push(frame);
 }
}
function refreshViewMode(){
 const compare=state.viewMode==='compare',overview=state.viewMode==='overview';
 $('compare-toggle').setAttribute('aria-pressed',String(compare));
 $('overview-toggle').setAttribute('aria-pressed',String(overview));
 $('compare-theme-field').hidden=!compare;
 $('compare-adopt').hidden=!compare;
 $('compare-adopt').disabled=!compare||state.compareTheme===state.project.theme;
 $('compare-theme').value=state.compareTheme;
 $('compare-shell').hidden=!compare;
 $('preview-layout').hidden=overview;
 $('preview-layout').dataset.compare=String(compare);
 $('page-overview').hidden=!overview;
 $('page-overview-note').hidden=!overview;
 $('single-preview-label').hidden=overview;
 $('preview-shell').dataset.device=state.device;
 $('compare-shell').dataset.device=state.device;
 document.body.dataset.reviewMode=state.viewMode;
}

function renderPreview(){
 if(refreshTimer!==null){clearTimeout(refreshTimer);refreshTimer=null;}
 const frame=$('site-preview'),comparisonFrame=$('compare-preview');
 refreshViewMode();
 document.querySelectorAll('[data-device]').forEach(btn=>{
  btn.setAttribute('aria-pressed',String(btn.dataset.device===state.device));
 });
 try{
  const result=compileCurrent();
  state.lastSite=result.site;state.lastCompiled=result;state.lastError=null;
  renderChecklist(result);
  sectionEditor?.render(result.site);
  renderSiteAudit(result);
  const active=previewPageHtml(result,state.project.theme,state.page);
  frame.srcdoc=active.html;
  $('browser-url').textContent='design-preview.local'+active.page.path;
  if(state.viewMode==='compare'){
   const other=compileForTheme(state.compareTheme);
   const compared=previewPageHtml(other,state.compareTheme,state.page);
   comparisonFrame.srcdoc=compared.html;
   $('compare-browser-url').textContent='design-preview.local'+compared.page.path;
   $('compare-current-title').textContent=engine.compiler.THEMES[state.project.theme].label;
   $('compare-reference-title').textContent=engine.compiler.THEMES[state.compareTheme].label;
  }else comparisonFrame.srcdoc=PREVIEW_INVALID;
  if(state.viewMode==='overview')renderOverview(result);
  else{$('page-overview').replaceChildren();state.overviewFrames=[];}
  say(!result.checklist.factsComplete
    ?'Черновик готов. Обязательных полей для заполнения: '+result.checklist.missing.length+'. Экспорт защищён robots=noindex.'
    :!result.checklist.readyForPublish
      ?'Все обязательные поля заполнены. Подтвердите проверку владельцем; экспорт пока robots=noindex.'
      :'Проверка подтверждена. Экспортируемые страницы получат robots=index; публикация остаётся отдельным действием.');
  $('save-site').disabled=false;
  renderFeedback();
 }catch(error){
  state.lastError=error;state.lastSite=null;state.lastCompiled=null;
  frame.srcdoc=PREVIEW_INVALID;comparisonFrame.srcdoc=PREVIEW_INVALID;
  $('page-overview').replaceChildren();state.overviewFrames=[];
  $('browser-url').textContent='design-preview.local / invalid';
  $('compare-browser-url').textContent='design-preview.local / invalid';
  renderChecklist(null);sectionEditor?.render(null);renderSiteAudit(null);$('save-site').disabled=true;
  renderFeedback();
  say('Ошибка данных: '+error.message,true);
 }
}
const PREVIEW_DEBOUNCE_MS=120;
let refreshTimer=null;
function schedulePreview(){
 if(refreshTimer!==null)clearTimeout(refreshTimer);
 refreshTimer=setTimeout(()=>{refreshTimer=null;renderPreview();},PREVIEW_DEBOUNCE_MS);
}
function connectEditor(input,get,set){
 let before=null;
 input.addEventListener('focus',()=>{before=snapshot();});
 input.addEventListener('input',()=>{
  if(!before)before=snapshot();
  state.project.ownerReviewConfirmed=false;
  set(input.value);
  // Live changes precede blur/history and the debounced preview.
  state.editRevision++;
  syncReviewControl();
  schedulePreview();
 });
 input.addEventListener('change',()=>{
  if(before){historyRecord(before);before=null;}
  updateWorkbenchSubtitle();
  refreshHistory();
  schedulePreview();
 });
}
function renderAll(){
 const activeId=document.activeElement?.id||'';
 renderKits();renderThemes();renderPages();renderFields();renderComposition();renderPreview();refreshHistory();
 if(activeId){
  const target=$(activeId)||(activeId.startsWith('remove-service-')?$('add-service'):null);
  if(target)target.focus({preventScroll:true});
 }
}
function download(name,text,type='application/json'){
 const bytes=new Blob([text],{type:type+';charset=utf-8'});
 const url=URL.createObjectURL(bytes);
 const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function safeName(){return (state.project.facts.siteId||'design-factory').replace(/[^a-z0-9-]/g,'-');}
function savePreviewZip(){
 try{
  const packer=globalThis.DesignFactoryPreviewZip;
  if(!packer)throw Error('Локальный упаковщик HTML-прототипа недоступен');
  const compiled=compileCurrent(),site=compiled.site,theme=state.project.theme;
  if(!feedbackTool)throw Error('Модуль обратной связи не загружен');
  const reviewContext=feedbackTool.context(compiled,state.project,state.composition);
  const routes=[
   {id:'home',name:'index.html',path:'/'},
   {id:'services',name:'services/index.html',path:'/services/'},
   {id:'approach',name:'approach/index.html',path:'/approach/'},
   {id:'contact',name:'contact/index.html',path:'/contact/'}
  ];
  if(site.pages.length!==4)throw Error('HTML-прототип требует все четыре страницы');
  const contents=routes.map(route=>{
   const page=site.pages.find(p=>p.id==='df-page-'+route.id&&p.path===route.path);
   if(!page)throw Error('В прототипе отсутствует маршрут '+route.path);
   const markup=engine.preview.pageHtml(site,page,theme,state.project.language);
   if(!/<meta name="robots" content="noindex">/.test(markup))
    throw Error('Не найден защитный noindex в '+route.name);
   return {name:route.name,content:markup};
  });
  const notes=[
   'DESIGN FACTORY — STATIC HTML PREVIEW / ЛОКАЛЬНЫЙ HTML-ПРОТОТИП',
   '',
   'Open index.html after extracting this archive. All four pages are linked',
   'Open review.html to leave feedback and download the JSON for the developer.',
   'and use assets/preview.css locally. No server, CDN or API is required.',
   '',
   'Откройте index.html после распаковки архива.',
   'Откройте review.html для замечаний. Передайте скачанный JSON разработчику.',
   'Это макет для согласования, а НЕ работающий PHP-рендерер CMS.',
   'Публикация, работающие формы и интеграция не включены.',
   'Тексты, контакты и права на материалы требует подтвердить владелец.',
   'All pages retain robots=noindex even when owner review is marked in Studio.',
   'Do NOT treat this ZIP as a release certificate or production deliverable.',
   ''
  ].join('\n');
  const info={
   format:'manufact-design-factory-static-preview-v1',version:1,
   type:'static-html-preview-not-cms-export',theme,kit:state.project.kit,
   language:state.project.language,paths:routes.map(route=>route.name),
   pages:4,offline:true,productionReady:false,formsConfigured:false,
   ownerVerificationRequired:true,clientFeedbackFormat:feedbackTool.FORMAT,
   reviewContext,reviewPortal:'review.html'
  };
  const files=[
   ...contents,
   {name:'assets/preview.css',content:engine.preview.css(theme)},
   {name:'README.txt',content:notes},
   {name:'preview-info.json',content:JSON.stringify(info,null,2)+'\n'},
   {name:'review.html',content:feedbackTool.reviewHtml(reviewContext,state.project.language)}
  ];
  const bytes=packer.build(files),verification=packer.inspect(bytes);
  if(!verification.crcVerified||verification.files!==8)
   throw Error('ZIP-проверка отклонила результат');
  const blob=new Blob([bytes],{type:'application/zip'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=safeName()+'-html-preview.zip';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  say('HTML-прототип скачан: четыре страницы, локальный CSS и review.html для замечаний. Проверенный ZIP32, не релиз CMS.');
 }catch(error){say('HTML-прототип не создан: '+error.message,true);}
}

function saveDeliveryZip(){
 try{
  const packer=globalThis.DesignFactoryPreviewZip;
  if(!packer||!deliveryTool)throw Error('Модуль единого пакета не загружен');
  const compiled=compileCurrent(),w=workspace();
  const built=deliveryTool.build({engine,zip:packer,feedbackTool,auditTool,
   project:state.project,workspace:w,compiled,feedback:state.feedback});
  const blob=new Blob([built.bytes],{type:'application/zip'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=safeName()+'-delivery.zip';
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  say(tr('Пакет передачи скачан: 18 файлов. Клиентские замечания: ',
   '18-file delivery ZIP downloaded. Client feedback: ')+built.manifest.feedback+
   '. '+tr('Это не релиз CMS и не разрешение публикации.',
   'Not a CMS release or permission to publish.'));
 }catch(error){say(tr('Пакет не создан: ','Delivery failed: ')+error.message,true);}
}

function feedbackContext(){
 if(!feedbackTool)return null;
 // Never bind approval/export to the debounced preview's previous compile. A user
 // can edit a fact and click export before renderPreview() runs; compile the live
 // project for every feedback action so stale reports fail closed immediately.
 try{return feedbackTool.context(compileCurrent(),state.project,state.composition);}
 catch{return null;}
}
function renderFeedback(){
 const summary=$('feedback-summary'),items=$('feedback-list'),button=$('feedback-export');
 if(!summary||!items||!button)return;
 items.replaceChildren();
 const report=state.feedback;
 if(!report){summary.textContent='Замечания пока не загружены.';button.disabled=true;return;}
 const active=feedbackContext(),matched=Boolean(active&&report.context===active);
 const resolved=report.notes.filter(n=>n.resolved).length;
 summary.textContent=(matched?'':'Другой вариант сайта — импортированные замечания устарели. ')+
  'Замечаний: '+report.notes.length+'; исправлено: '+resolved+
  '; осталось: '+(report.notes.length-resolved)+'.';
 button.disabled=!matched;
 for(const [index,note] of report.notes.entries()){
  const item=el('article',{class:'feedback-item'});
  const heading=el('strong',{text:(LANG[state.project.language][note.page]||note.page)+
   ' · '+({change:'Исправить',issue:'Ошибка',question:'Вопрос'}[note.type])});
  const copy=el('p',{text:note.message});
  const actions=el('div',{class:'feedback-actions'});
  const open=el('button',{type:'button',text:'Открыть страницу',class:'minor-btn',disabled:!matched});
  open.addEventListener('click',()=>{
   state.page=note.page;state.viewMode='single';renderPages();renderPreview();
  });
  const resolve=el('button',{type:'button',class:'minor-btn',
   text:note.resolved?'Вернуть в работу':'Отметить исправленным',disabled:!matched});
  resolve.addEventListener('click',()=>{
   if(!state.feedback||feedbackContext()!==state.feedback.context)return;
   state.feedback.notes[index].resolved=!state.feedback.notes[index].resolved;
   state.feedbackRevision++;
   renderFeedback();
  });
  actions.append(open,resolve);item.append(heading,copy,actions);items.append(item);
 }
 if(state.lastCompiled)renderSiteAudit(state.lastCompiled);
}
async function importFeedback(file){
 const request=++state.feedbackImportSerial;
 try{
  if(!file||file.size>128*1024)throw Error('Файл замечаний больше 128 КБ или не выбран.');
  if(!feedbackTool)throw Error('Модуль обратной связи недоступен.');
  const expected=feedbackContext();
  if(!expected)throw Error('Сначала восстановите корректный проект Studio.');
  const sourceRevision=state.editRevision,feedbackRevision=state.feedbackRevision;
  const incoming=JSON.parse(await file.text());
  // Reading a file yields: refuse older owner edits, imports and resolutions.
  const fresh=feedbackContext();
  if(request!==state.feedbackImportSerial||sourceRevision!==state.editRevision||
   feedbackRevision!==state.feedbackRevision||!fresh||fresh!==expected)throw Error('Проект или замечания изменились во время чтения. Повторите импорт.');
  feedbackTool.validate(incoming,fresh);
  state.feedbackRevision++;
  state.feedback={
   ...incoming,notes:incoming.notes.map(n=>({...n}))
  };
  renderFeedback();
  say('Получено '+incoming.notes.length+' замечаний. Их можно открыть, отметить исправленными и скачать новый JSON.');
 }catch(error){say('Импорт замечаний отклонён: '+error.message,true);}
 if(request===state.feedbackImportSerial)$('feedback-file').value='';
}
function saveFeedback(){
 try{
  const expected=feedbackContext();
  if(!state.feedback||!expected)throw Error('Нет актуальных замечаний');
  feedbackTool.validate(state.feedback,expected);
  const output=feedbackTool.create(expected,state.feedback.reviewer,
   state.feedback.notes.map(note=>({...note})));
  download(safeName()+'-feedback-progress.json',JSON.stringify(output,null,2)+'\n');
  say('Замечания с текущими отметками скачаны. Это не подтверждение приёмки.');
 }catch(error){say('Выгрузка замечаний отклонена: '+error.message,true);}
}

function serialize(v){return engine.compiler.serialize(v);}
function saveSite(){
 try{
  const result=compileCurrent();
  download(safeName()+'-site-v1.json',serialize(result.site));
  say('Скачан CMS JSON: '+result.site.pages.length+' страниц; индексация — '+result.checklist.indexing+
   (result.checklist.readyForPublish?' (проверка владельцем подтверждена).':' (до подтверждения владельцем).'));
 }catch(err){say('Экспорт заблокирован: '+err.message,true);}
}
function saveProject(){
 try{const p=engine.compiler.validateProject(state.project);
  download(safeName()+'-project.json',serialize(p));
  say('Проект фабрики скачан.');
 }catch(err){say(err.message,true);}
}
function workspace(){
 const w={format:WORKSPACE,version:state.sectionPlan?2:1,
  project:engine.compiler.validateProject(state.project),composition:state.composition};
 if(state.sectionPlan)w.sectionPlan=state.sectionPlan;
 return w;
}
function saveWorkspace(){try{download(safeName()+'-workspace.json',serialize(workspace()));say('Рабочее пространство сохранено.');}catch(e){say(e.message,true);}}
function saveBridge(){
 try{
  const compiled=compileCurrent();
  const report={format:'manufact-design-factory-bridge-v2',version:2,siteFormat:engine.sdk.FORMAT,
   pageCount:compiled.site.pages.length,kit:state.project.kit,theme:state.project.theme,
   supported:['site-v1','registered manifests','seo','internal links','cms theme','section appearance'],
   integration_required:['standalone preview CSS','enhanced layout and responsive visual parity'],
   composition:compiled.bridge,ownerChecklist:compiled.checklist,
   publishGate:compiled.checklist.readyForPublish?'owner_review_confirmed_by_exporter_no_publish':'blocked_without_owner_review',
   indexing:compiled.checklist.indexing};
  download(safeName()+'-bridge-v2.json',serialize(report));
  say('Карта совместимости выгружена.');
 }catch(e){say(e.message,true);}
}
async function importFile(file){
 const request=++state.projectImportSerial;
 try{
  if(!file||file.size>1024*1024)throw Error('Максимальный размер проекта — 1 МБ.');
  const sourceRevision=state.editRevision;
  const contents=await file.text();
  // A delayed JSON read cannot replace newer owner edits, Undo/Redo or imports.
  if(request!==state.projectImportSerial||sourceRevision!==state.editRevision)
   throw Error('Проект или выбранный файл изменились во время чтения. Повторите импорт.');
  const raw=engine.compiler.jsonParse(contents);
  let project,composition=null,sectionPlan=null;
  if(raw.format===WORKSPACE){
   const validated=engine.bridge.workspace(raw);
   project=validated.project;composition=validated.composition;
   sectionPlan=validated.version===2?validated.sectionPlan:null;
  }else project=engine.compiler.migrate(raw);
  const candidate={format:WORKSPACE,version:sectionPlan?2:1,project,composition};
  if(sectionPlan)candidate.sectionPlan=sectionPlan;
  engine.bridge.build(candidate);
  apply(()=>{state.project=project;state.composition=composition;
   state.sectionPlan=sectionPlan;state.page='home';},{throwOnError:true,preserveReview:true});
  const gate=engine.compiler.checklist(project);
  say('Проект импортирован и проверен по действующему CMS-контракту. Индексация экспорта: '+gate.indexing+'.');
 }catch(e){say('Импорт отклонён: '+e.message,true);}
 if(request===state.projectImportSerial)$('project-file').value='';
}
function init(){
 if(!engine)throw Error('Не загружен автономный компилятор Stage3.');
 $('search-kit').addEventListener('input',event=>{
  state.query=event.target.value.trim().toLowerCase().slice(0,100);renderKits();
 });
 $('language').addEventListener('change',event=>apply(()=>{state.project.language=event.target.value;}));
 $('siteId').addEventListener('change',event=>apply(()=>{
  if(event.target.value.trim())state.project.facts.siteId=event.target.value.trim();
  else delete state.project.facts.siteId;
 }));
 for(const input of document.querySelectorAll('[data-fact]')){
  const key=input.dataset.fact;
  connectEditor(input,()=>state.project.facts[key],v=>{
   if(v)state.project.facts[key]=v;else delete state.project.facts[key];
  });
 }
 document.querySelectorAll('[data-device]').forEach(btn=>btn.addEventListener('click',()=>{
  if(!devices.includes(btn.dataset.device))return;state.device=btn.dataset.device;renderPreview();
 }));

 // Switching modes is presentation-only; explicit adoption uses apply()/Undo and revokes approval.
 const reference=$('compare-theme');
 reference.replaceChildren();
 for(const [id,theme] of Object.entries(engine.compiler.THEMES))
  reference.append(el('option',{value:id,text:theme.label}));
 if(state.compareTheme===state.project.theme)
  state.compareTheme=Object.keys(engine.compiler.THEMES).find(id=>id!==state.project.theme);
 reference.value=state.compareTheme;
 reference.addEventListener('change',event=>{
  if(!Object.prototype.hasOwnProperty.call(engine.compiler.THEMES,event.target.value))return;
  state.compareTheme=event.target.value;renderPreview();
 });
 $('compare-toggle').addEventListener('click',()=>{
  state.viewMode=state.viewMode==='compare'?'single':'compare';renderPreview();
 });
 $('overview-toggle').addEventListener('click',()=>{
  state.viewMode=state.viewMode==='overview'?'single':'overview';renderPreview();
 });
 $('compare-adopt').addEventListener('click',()=>{
  const selected=state.compareTheme,original=state.project.theme;
  if(state.viewMode!=='compare'||selected===original)return;
  // A theme change is a real editorial action with Undo/Redo; revoke any owner
  // sign-off exactly as if the theme was selected from the regular catalog.
  if(apply(()=>{state.project.theme=selected;})){
   state.compareTheme=original;
   renderPreview();
   say('Тема '+engine.compiler.THEMES[selected].label+' применена. Прежний стиль остался для сравнения; действие доступно в истории Undo.');
  }
 });


 $('composition').addEventListener('change',event=>sectionEditor.legacy(event.target.value||null));
  sectionEditor.mount();
 $('bulk-services-add').addEventListener('click',addBulkServices);
 $('edit-services-as-list').addEventListener('click',editFullServices);
 $('replace-services-list').addEventListener('click',replaceFullServices);
 $('download-services-text').addEventListener('click',downloadServiceList);
 $('add-service').addEventListener('click',()=>apply(()=>{
  if(!state.project.facts.services)state.project.facts.services=[];
  if(state.project.facts.services.length>=12)throw Error('Максимум 12 услуг');
  state.project.facts.services.push({
   title:tr('Уточните название','Confirm service name'),
   description:tr('Добавьте подтверждённое описание.','Add verified description.')
  });
 }));
 $('owner-review-confirmed').addEventListener('change',event=>{
  const checked=event.target.checked;
  apply(()=>{state.project.ownerReviewConfirmed=checked;},{preserveReview:true});
 });
 $('site-audit-json').addEventListener('click',()=>saveSiteAudit(false));
 $('site-audit-html').addEventListener('click',()=>saveSiteAudit(true));
 $('save-project').addEventListener('click',saveProject);
 $('save-site').addEventListener('click',saveSite);
 $('save-preview-zip').addEventListener('click',savePreviewZip);
 $('save-delivery-zip').addEventListener('click',saveDeliveryZip);
 $('feedback-file').addEventListener('change',event=>importFeedback(event.target.files[0]));
 $('feedback-export').addEventListener('click',saveFeedback);
 $('save-workspace').addEventListener('click',saveWorkspace);
 $('save-bridge').addEventListener('click',saveBridge);
 $('save-bundle').addEventListener('click',()=>{
  try{const bundle=engine.bridge.build(workspace());engine.bridge.validateBundle(bundle);
   download(safeName()+'-integration-v2.json',serialize(bundle));
   say('Пакет интеграции D6 проверен и скачан. Индексация: '+bundle.compatibility.indexing+
    '. Публикация по-прежнему не выполняется автоматически.');
  }catch(error){say('Экспорт D6 заблокирован: '+error.message,true);}
 });
 $('undo').addEventListener('click',()=>setHistory('undo'));
 $('redo').addEventListener('click',()=>setHistory('redo'));
 document.addEventListener('keydown',event=>{
  if(!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='z')return;
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;
  event.preventDefault();setHistory(event.shiftKey?'redo':'undo');
 });
 $('project-file').addEventListener('change',event=>importFile(event.target.files[0]));
 window.addEventListener('message',event=>{
  const trusted=[ $('site-preview'),$('compare-preview'),...state.overviewFrames ].some(frame=>frame.contentWindow===event.source);
  if(!trusted||!event.data||event.data.type!=='df-navigation')return;
  if(!pages.includes(event.data.page))return;
  state.page=event.data.page;if(state.viewMode==='overview')state.viewMode='single';renderPages();renderPreview();
 });
 renderAll();
 say('Design Factory загружена локально. Можно редактировать и экспортировать сайт.');
}
try{init();}catch(error){say('Не удалось запустить Studio: '+error.message,true);}
})();
