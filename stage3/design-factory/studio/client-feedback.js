/* Design Factory first-party, offline client feedback bridge.
 * Comments and resolutions are suggestions, NEVER owner approval or publication.
 */
(function(global,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 else global.DesignFactoryFeedback=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const FORMAT='manufact-design-factory-client-feedback-v1';
 const ROUTES=Object.freeze({home:'index.html',services:'services/index.html',
  approach:'approach/index.html',contact:'contact/index.html'});
 const MAX_NOTES=30,MAX_TEXT=900,MAX_REVIEWER=80;
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 function textHash(text){
  // Non-cryptographic project correlation key, not reviewer authentication.
  let h=2166136261;
  for(let i=0;i<text.length;i++){
   h^=text.charCodeAt(i);
   h=Math.imul(h,16777619)>>>0;
  }
  return h.toString(16).padStart(8,'0');
 }
 function context(compiled,project,composition){
  if(!compiled||!compiled.site||!Array.isArray(compiled.site.pages)||
   compiled.site.pages.length!==4||!project)throw Error('Feedback needs complete compiled site');
  const site=compiled.site;
  const pages=site.pages.map(p=>({id:p.id,path:p.path}));
  if(Object.keys(ROUTES).some(k=>!pages.some(p=>p.id==='df-page-'+k&&
   p.path===(k==='home'?'/':'/'+k+'/'))))throw Error('Feedback requires all four canonical routes');
  return 'df-'+textHash(JSON.stringify({site,kit:project.kit,
   theme:project.theme,language:project.language,composition:composition||null}));
 }
 function exact(obj,allowed,where){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||
   Object.keys(obj).some(k=>!allowed.includes(k)))throw Error('Unexpected '+where+' fields');
 }
 function validate(data,expected){
  exact(data,['format','version','context','reviewer','reviewedAt','notes'],'feedback');
  if(data.format!==FORMAT||data.version!==1||typeof data.context!=='string'||
   !/^df-[0-9a-f]{8}$/.test(data.context)||data.context!==expected)
   throw Error('Feedback belongs to a different site snapshot');
  if(typeof data.reviewer!=='string'||data.reviewer.length>MAX_REVIEWER)
   throw Error('Invalid reviewer field');
  if(typeof data.reviewedAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(data.reviewedAt)||
   !Number.isFinite(Date.parse(data.reviewedAt)))throw Error('Invalid feedback date');
  if(!Array.isArray(data.notes)||data.notes.length>MAX_NOTES)
   throw Error('Too many feedback notes');
  for(const note of data.notes){
   exact(note,['page','type','message','resolved'],'feedback note');
   if(!own(ROUTES,note.page)||!['change','issue','question'].includes(note.type)||
    typeof note.message!=='string'||!note.message.trim()||
    note.message.length>MAX_TEXT||typeof note.resolved!=='boolean')
    throw Error('Invalid feedback note');
  }
  return data;
 }
 function create(contextId,reviewer='',notes=[]){
  const report={format:FORMAT,version:1,context:contextId,
   reviewer,reviewedAt:new Date().toISOString(),notes};
  return validate(report,contextId);
 }
 function reviewerApp(contextId,language){
  'use strict';
  const LIMIT=30;
  const $=id=>document.getElementById(id),notes=[];
  let notesRevision=0,importSerial=0;
  const t=(ru,en)=>language==='en'?en:ru;
  const PAGES=language==='en'?{home:'Home',services:'Services',approach:'Approach',contact:'Contact'}:
   {home:'Главная',services:'Услуги',approach:'Подход',contact:'Контакты'};
  const TYPES=language==='en'?{change:'Change',issue:'Issue',question:'Question'}:
   {change:'Изменение',issue:'Ошибка',question:'Вопрос'};
  function message(text,error=false){
   $('feedback-status').textContent=text;
   $('feedback-status').dataset.error=String(error);
  }

  // Edit an existing client note in-place. Do not inject note text into markup.
  // Changed review text reopens a previously resolved item for a fresh decision.
  function startEdit(note,index,item){
   notesRevision++;
   const panel=document.createElement('div');panel.className='feedback-note-editor';
   const selectField=(caption,options,current)=>{
    const label=document.createElement('label'),select=document.createElement('select');
    label.textContent=caption;
    for(const [value,title] of Object.entries(options)){
     const option=document.createElement('option');option.value=value;option.textContent=title;
     select.append(option);
    }
    select.value=current;
    select.addEventListener('change',()=>{notesRevision++;});
    label.append(select);panel.append(label);
    return select;
   };
   const page=selectField(t('Страница','Page'),PAGES,note.page);
   const type=selectField(t('Тип замечания','Feedback type'),TYPES,note.type);
   const label=document.createElement('label');label.textContent=t('Ваше замечание','Your feedback');
   const messageField=document.createElement('textarea');
   messageField.maxLength=900;messageField.value=note.message;
   messageField.addEventListener('input',()=>{notesRevision++;});
   label.append(messageField);panel.append(label);
   const actions=document.createElement('div');actions.className='feedback-note-actions';
   const save=document.createElement('button'),cancel=document.createElement('button');
   save.type='button';save.textContent=t('Сохранить','Save');
   cancel.type='button';cancel.className='secondary';cancel.textContent=t('Отмена','Cancel');
   save.addEventListener('click',()=>{
    const value=messageField.value.trim();
    if(!value||value.length>900||!Object.prototype.hasOwnProperty.call(PAGES,page.value)||
       !Object.prototype.hasOwnProperty.call(TYPES,type.value)){
     message(t('Некорректное замечание','Invalid feedback note'),true);return;
    }
    if(notes[index]!==note)return;
    notes[index]={page:page.value,type:type.value,message:value,resolved:false};
    notesRevision++;render();
    message(t('Замечание изменено. При необходимости отправьте обновлённый JSON.','Note updated. Download a fresh JSON when ready.'));
   });
   cancel.addEventListener('click',()=>{notesRevision++;render();});
   actions.append(save,cancel);panel.append(actions);
   item.append(panel);messageField.focus();
  }

  function render(){
   const holder=$('feedback-list');holder.replaceChildren();
   $('feedback-count').textContent=String(notes.length)+' / '+LIMIT;
   notes.forEach((n,i)=>{
    const item=document.createElement('li'),description=document.createElement('p');
    description.textContent=PAGES[n.page]+' · '+TYPES[n.type];
    const copy=document.createElement('blockquote');copy.textContent=n.message;
    const edit=document.createElement('button');
    edit.type='button';edit.textContent=t('Изменить','Edit');
    edit.addEventListener('click',()=>startEdit(n,i,item));
    const remove=document.createElement('button');
    remove.type='button';remove.textContent=t('Удалить замечание','Remove note');
    remove.addEventListener('click',()=>{notes.splice(i,1);notesRevision++;render();});
    item.append(description,copy,edit,remove);holder.append(item);
   });
   $('feedback-download').disabled=notes.length===0;
   $('feedback-add').disabled=notes.length>=LIMIT;
  }
  function sanitize(value){
   if(!value||typeof value!=='object'||Array.isArray(value)||
    value.format!=='manufact-design-factory-client-feedback-v1'||value.version!==1||
    value.context!==contextId||!Array.isArray(value.notes)||value.notes.length>LIMIT||
    typeof value.reviewer!=='string'||value.reviewer.length>80||
    typeof value.reviewedAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(value.reviewedAt)||
    !Number.isFinite(Date.parse(value.reviewedAt))||
    Object.keys(value).some(k=>!['format','version','context','reviewer','reviewedAt','notes'].includes(k)))
    throw Error(t('Несовместимый JSON или другой сайт','Incompatible JSON or another site'));
   const clean=[];
   for(const note of value.notes){
    if(!note||typeof note!=='object'||Array.isArray(note)||
     !Object.prototype.hasOwnProperty.call(PAGES,note.page)||
     !['change','issue','question'].includes(note.type)||
     typeof note.message!=='string'||!note.message.trim()||note.message.length>900||
     typeof note.resolved!=='boolean'||
     Object.keys(note).some(k=>!['page','type','message','resolved'].includes(k)))
     throw Error(t('Некорректное замечание','Invalid feedback note'));
    clean.push({page:note.page,type:note.type,message:note.message,resolved:note.resolved});
   }
   return {reviewer:value.reviewer,notes:clean};
  }
  function download(){
   const reviewer=$('feedback-reviewer').value.trim();
   const data={format:'manufact-design-factory-client-feedback-v1',version:1,
    context:contextId,reviewer,reviewedAt:new Date().toISOString(),notes:notes.map(n=>({...n}))};
   const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],
    {type:'application/json;charset=utf-8'}));
   const link=document.createElement('a');link.href=url;
   link.download='design-factory-client-feedback.json';
   document.body.append(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),3000);
   message(t('Файл замечаний сохранён. Передайте его разработчику для импорта в Studio.','Feedback saved. Send the JSON to the Studio developer.'));
  }
  $('feedback-add').addEventListener('click',()=>{
   const entry=$('feedback-note').value.trim();
   if(entry.length<1||entry.length>900||notes.length>=LIMIT){
    message(t('Введите замечание до 900 символов (максимум 30).','Enter a note up to 900 characters (maximum 30).'),true);return;
   }
   notes.push({page:$('feedback-page').value,type:$('feedback-type').value,
    message:entry,resolved:false});
   notesRevision++;
   $('feedback-note').value='';render();message(t('Замечание добавлено.','Note added.'));
  });
  $('feedback-download').addEventListener('click',download);
  $('feedback-reviewer').addEventListener('input',()=>{notesRevision++;});
  $('feedback-import').addEventListener('change',async event=>{
   const request=++importSerial,revision=notesRevision;
   try{
    const file=event.target.files[0];
    if(!file||file.size>128*1024)throw Error(t('JSON больше 128 КБ','JSON exceeds 128 KiB'));
    const result=sanitize(JSON.parse(await file.text()));
    if(request!==importSerial||revision!==notesRevision)
     throw Error(t('Замечания изменились во время чтения файла. Повторите импорт.','Notes changed while reading the file. Import again.'));
    notes.splice(0,notes.length,...result.notes);
    notesRevision++;
    $('feedback-reviewer').value=result.reviewer;render();
    message(t('Черновик восстановлен. Замечания можно редактировать или отправить.','Draft restored. You can continue editing or send notes.'));
   }catch(error){message(t('Импорт отклонён: ','Import rejected: ')+error.message,true);}
   if(request===importSerial)event.target.value='';
  });
  render();
 }
 function reviewHtml(contextId,language='ru'){
  if(!/^df-[0-9a-f]{8}$/.test(contextId))throw Error('Invalid feedback context');
  if(!['ru','en'].includes(language))throw Error('Unsupported feedback language');
  const captions=language==='en'?{home:'Home',services:'Services',approach:'Approach',contact:'Contact'}:
   {home:'Главная',services:'Услуги',approach:'Подход',contact:'Контакты'};
  const links=Object.entries(ROUTES).map(([id,path])=>
   '<a href="'+path+'" target="_blank" rel="noopener">'+
    captions[id]+'</a>').join('');
  const options=Object.keys(ROUTES).map(id=>'<option value="'+id+'">'+
   captions[id]+'</option>').join('');
  const markup='<!doctype html><html lang="ru"><head><meta charset="utf-8">'+
   '<meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<meta name="robots" content="noindex">'+
   '<meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;; script-src &apos;unsafe-inline&apos;; base-uri &apos;none&apos;; form-action &apos;none&apos;">'+
   '<title>Design Factory — замечания к HTML-прототипу</title>'+
   '<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101b1e;color:#ecf5f1;font:15px system-ui;padding:clamp(15px,4vw,50px)}'+
   'main{max-width:850px;margin:auto}h1{font-size:clamp(24px,4vw,40px)}p{line-height:1.6;color:#c3d5cd}nav{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}'+
   'nav a{color:#c5f57b;padding:12px 16px;border:1px solid #688375;border-radius:9px}section{padding:20px;background:#1d2d30;border:1px solid #425c53;border-radius:15px}'+
   'label{display:grid;gap:7px;margin:12px 0}input,select,textarea{font:inherit;width:100%;background:#0d191c;color:white;border:1px solid #678579;padding:12px;border-radius:8px}'+
   'textarea{min-height:110px}button{font:inherit;background:#c5f57b;color:#0d1b14;border:0;border-radius:8px;font-weight:700;padding:12px 16px;cursor:pointer;min-height:44px}'+
   'button:disabled{opacity:.4;cursor:not-allowed}button.secondary{background:#344e45;color:white}li{margin:10px 0;padding:12px;border:1px solid #557368;border-radius:9px}li>button{margin:4px 8px 4px 0}.feedback-note-editor{margin-top:12px;padding:12px;border:1px solid #678579;border-radius:9px}.feedback-note-actions{display:flex;gap:8px;flex-wrap:wrap}blockquote{white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0}'+
   '#feedback-status[data-error=true]{color:#ffafa2}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid #c5f57b;outline-offset:3px}</style></head>'+
   '<body><main><h1>Замечания к прототипу</h1>'+
   '<p>Откройте нужную страницу, осмотрите дизайн и запишите, что требуется изменить. Замечания сохраняются только в скачиваемом JSON, браузер ничего не отправляет. Это не согласование публикации.</p>'+
   '<nav aria-label="Четыре страницы">'+links+'</nav>'+
   '<section><label>Ваше имя (необязательно)<input id="feedback-reviewer" maxlength="80" autocomplete="name"></label>'+
   '<label>Страница<select id="feedback-page">'+options+'</select></label>'+
   '<label>Тип замечания<select id="feedback-type"><option value="change">Нужно изменить</option><option value="issue">Ошибка</option><option value="question">Вопрос</option></select></label>'+
   '<label>Ваше замечание<textarea id="feedback-note" maxlength="900" placeholder="Например: на мобильном слишком длинный заголовок"></textarea></label>'+
   '<button id="feedback-add" type="button">Добавить замечание</button>'+
   '<p id="feedback-count" role="status"></p><ol id="feedback-list"></ol>'+
   '<button id="feedback-download" type="button" disabled>Скачать замечания JSON</button>'+
   '<label>Продолжить работу с сохранённым JSON<input id="feedback-import" type="file" accept=".json,application/json"></label>'+
   '<p id="feedback-status" role="status" aria-live="polite"></p>'+
   '<p>До 30 замечаний, каждое до 900 символов. Отправьте скачанный файл ответственному за Studio.</p></section></main>'+
   '<script>('+reviewerApp.toString()+')('+JSON.stringify(contextId)+','+JSON.stringify(language)+');</script></body></html>\n';
  if(language==='ru')return markup;
  // Translate only visible HTML, never mutate the embedded JS source.
  const scriptAt=markup.indexOf('<script>');
  if(scriptAt<0)throw Error('Missing reviewer script');
  let visible=markup.slice(0,scriptAt);
  const strings=[
   ['lang="ru"','lang="en"'],
   ['Design Factory — замечания к HTML-прототипу','Design Factory — HTML preview feedback'],
   ['Замечания к прототипу','Feedback on the preview'],
   ['Откройте нужную страницу, осмотрите дизайн и запишите, что требуется изменить. Замечания сохраняются только в скачиваемом JSON, браузер ничего не отправляет. Это не согласование публикации.','Review the four pages and describe what needs to change. Notes stay in a downloadable JSON file; nothing is sent over the network. This is not publication approval.'],
   ['Четыре страницы','Four pages'],
   ['Ваше имя (необязательно)','Your name (optional)'],
   ['Страница<select','Page<select'],
   ['Тип замечания','Feedback type'],
   ['Нужно изменить','Change'],
   ['>Ошибка</option>','>Issue</option>'],
   ['>Вопрос</option>','>Question</option>'],
   ['Ваше замечание','Your feedback'],
   ['Например: на мобильном слишком длинный заголовок','For example: the mobile heading is too long'],
   ['>Добавить замечание</button>','>Add feedback</button>'],
   ['>Скачать замечания JSON</button>','>Download feedback JSON</button>'],
   ['Продолжить работу с сохранённым JSON','Restore saved JSON draft'],
   ['До 30 замечаний, каждое до 900 символов. Отправьте скачанный файл ответственному за Studio.','Up to 30 notes, each up to 900 characters. Send the downloaded file to the Studio developer.']
  ];
  for(const [original,translation] of strings){
   if(!visible.includes(original))throw Error('Missing portal label: '+original);
   visible=visible.replace(original,translation);
  }
  return visible+markup.slice(scriptAt);
 }
 return Object.freeze({FORMAT,ROUTES,context,validate,create,reviewHtml});
});