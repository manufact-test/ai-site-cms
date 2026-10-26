/* D5 Design Factory Studio — offline, same first-party CMS compiler + validator.
 * No API, framework, localStorage, eval, remote resources or user HTML execution.
 */
(function(){
'use strict';
const engine=globalThis.DesignFactory;
const $=id=>document.getElementById(id);
const WORKSPACE='manufact-design-factory-workspace-v1';
const LANG={
 ru:{home:'Главная',services:'Услуги',approach:'Подход',contact:'Контакты'},
 en:{home:'Home',services:'Services',approach:'Approach',contact:'Contact'}
};
const icons={agency:'✦',industrial:'▥',consulting:'◎','local-services':'⌂',saas:'⬡',logistics:'⇢',architecture:'◫',education:'◈',portfolio:'◉',restaurant:'✳',repair:'⚒',nonprofit:'♡'};
const factLabels={title:'Название',headline:'Главный заголовок',description:'Описание',services:'Услуги',contactText:'Контактные данные'};
const clone=v=>structuredClone(v);
const projectDefault=()=>engine.compiler.migrate(null);
const state={
 project:projectDefault(),
 composition:null,
 page:'home',device:'desktop',query:'',viewMode:'single',compareTheme:'noir',overviewFrames:[],
 past:[],future:[],renderToken:0,lastSite:null,lastCompiled:null,lastError:null
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
function snapshot(){return {project:clone(state.project),composition:state.composition};}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function historyRecord(before){
 if(equal(before,snapshot()))return;
 state.past.push(before);if(state.past.length>MAX_HISTORY)state.past.shift();state.future=[];
 refreshHistory();
}
function apply(mutator,options={}){
 const prev=snapshot();
 try{mutator();if(!options.preserveReview)state.project.ownerReviewConfirmed=false;
   engine.compiler.validateProject(state.project);
   if(state.composition!==null)engine.compositions.get(state.composition);
   renderAll();
   historyRecord(prev);
   return true;
 }catch(error){
  state.project=prev.project;state.composition=prev.composition;
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
 state.project=next.project;state.composition=next.composition;
 refreshHistory();renderAll();say(direction==='undo'?'Изменение отменено.':'Изменение восстановлено.');
}
function refreshHistory(){
 $('undo').disabled=!state.past.length;
 $('redo').disabled=!state.future.length;
}
function compileForTheme(theme){
 if(!Object.prototype.hasOwnProperty.call(engine.compiler.THEMES,theme))throw Error('Неизвестная тема сравнения');
 const project=theme===state.project.theme?state.project:{...clone(state.project),theme};
 const result=engine.compiler.compile(project);
 let site=result.site;
 let bridge=null;
 if(state.composition){
  const registry=engine.compiler.loadRegistry();
  const replacement=engine.adapter.sectionFor(state.composition,'df-selected-composition',state.project.language,registry);
  site.pages[0].sections[site.pages[0].sections.length-1]=replacement;
  site=engine.sdk.validateSite(site,registry);
  const inspect=engine.sdk.inspectSite(site,registry);
  if(inspect.errors.length)throw Error('Некорректные ссылки: '+inspect.errors.length);
  bridge=engine.adapter.compare(state.composition);
 }
 return {...result,site,bridge};
}
function compileCurrent(){return compileForTheme(state.project.theme);}
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
  const box=el('div',{class:'service-editor'});
  box.append(el('p',{class:'service-index',text:'УСЛУГА '+String(i+1).padStart(2,'0')}));
  const del=el('button',{id:'remove-service-'+i,type:'button',class:'remove-service',title:'Удалить услугу','aria-label':'Удалить услугу '+(i+1),text:'×'});
  del.addEventListener('click',()=>apply(()=>{state.project.facts.services.splice(i,1);}));
  box.append(del);
  for(const [field,label,max,rows] of [['title','Название',120,1],['description','Описание',320,3]]){
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
function renderChecklist(info){
 const node=$('checklist');node.replaceChildren();
 if(!info)return;
 const gate=info.checklist;
 const statusText=gate.readyForPublish
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
 }catch(error){
  state.lastError=error;state.lastSite=null;state.lastCompiled=null;
  frame.srcdoc=PREVIEW_INVALID;comparisonFrame.srcdoc=PREVIEW_INVALID;
  $('page-overview').replaceChildren();state.overviewFrames=[];
  $('browser-url').textContent='design-preview.local / invalid';
  $('compare-browser-url').textContent='design-preview.local / invalid';
  renderChecklist(null);$('save-site').disabled=true;
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
   'and use assets/preview.css locally. No server, CDN or API is required.',
   '',
   'Откройте index.html после распаковки архива.',
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
   ownerVerificationRequired:true
  };
  const files=[
   ...contents,
   {name:'assets/preview.css',content:engine.preview.css(theme)},
   {name:'README.txt',content:notes},
   {name:'preview-info.json',content:JSON.stringify(info,null,2)+'\n'}
  ];
  const bytes=packer.build(files),verification=packer.inspect(bytes);
  if(!verification.crcVerified||verification.files!==7)
   throw Error('ZIP-проверка отклонила результат');
  const blob=new Blob([bytes],{type:'application/zip'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=safeName()+'-html-preview.zip';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  say('HTML-прототип скачан: 4 связанные страницы, локальный CSS, README, проверенный ZIP32. Только предпросмотр, не релиз CMS.');
 }catch(error){say('HTML-прототип не создан: '+error.message,true);}
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
function workspace(){return {format:WORKSPACE,version:1,project:engine.compiler.validateProject(state.project),composition:state.composition};}
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
 try{
  if(!file||file.size>1024*1024)throw Error('Максимальный размер проекта — 1 МБ.');
  const raw=engine.compiler.jsonParse(await file.text());
  let project,composition=null;
  if(raw.format===WORKSPACE){
   if(raw.version!==1||Object.keys(raw).some(k=>!['format','version','project','composition'].includes(k)))
    throw Error('Неизвестная версия или свойства рабочего пространства');
   project=engine.compiler.validateProject(raw.project);
   if(raw.composition!==null){engine.compositions.get(raw.composition);composition=raw.composition;}
  }else project=engine.compiler.migrate(raw);
  engine.compiler.compile(project);
  apply(()=>{state.project=project;state.composition=composition;state.page='home';},{throwOnError:true,preserveReview:true});
  const gate=engine.compiler.checklist(project);
  say('Проект импортирован и проверен по действующему CMS-контракту. Индексация экспорта: '+gate.indexing+'.');
 }catch(e){say('Импорт отклонён: '+e.message,true);}
 $('project-file').value='';
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


 $('composition').addEventListener('change',event=>apply(()=>{state.composition=event.target.value||null;state.page='home';}));
 $('add-service').addEventListener('click',()=>apply(()=>{
  if(!state.project.facts.services)state.project.facts.services=[];
  if(state.project.facts.services.length>=12)throw Error('Максимум 12 услуг');
  state.project.facts.services.push({title:'Уточните название',description:'Добавьте подтверждённое описание.'});
 }));
 $('owner-review-confirmed').addEventListener('change',event=>{
  const checked=event.target.checked;
  apply(()=>{state.project.ownerReviewConfirmed=checked;},{preserveReview:true});
 });
 $('save-project').addEventListener('click',saveProject);
 $('save-site').addEventListener('click',saveSite);
 $('save-preview-zip').addEventListener('click',savePreviewZip);
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
