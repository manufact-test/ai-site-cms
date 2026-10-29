'use strict';
// Self-contained OFFLINE manual reviewer for a read-only PHP capture.
// Does not certify visual parity or client sign-off; never loads remote content.
const crypto=require('node:crypto');
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const serialized=x=>JSON.stringify(x).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
  .replace(/\\u2028/g,'\\\\u2028').replace(/\\u2029/g,'\\\\u2029');
function render(report){
  if(report?.format!=='manufact-public-site-acceptance-evidence-v1'||
    !Array.isArray(report.pages)||!report.pages.length)
    throw Error('Expected complete offline PHP capture evidence');
  const data={
    format:report.format,siteId:report.siteId,version:report.version,
    packageSha256:report.handoffSha256,generatedAt:report.capturedAt,
    pages:report.pages.map(p=>({
      id:p.id,path:p.path,title:p.title,
      warnings:p.warnings,
      screenshots:p.screenshots,
      references:p.references||{}
    }))
  };
  const script=`'use strict';
const evidence=${serialized(data)};
const devices=['desktop','tablet','mobile'];
const widths={desktop:1280,tablet:768,mobile:390};
const notes=[];
let pageIndex=0,device='desktop',mode='side',sync=true,busy=false;
const el=id=>document.getElementById(id);
const text=(node,value)=>{node.textContent=String(value);return node;};
const current=()=>evidence.pages[pageIndex];
const currentReference=()=>current().references[device]||null;
function element(name,cls,content){
  const node=document.createElement(name);
  if(cls)node.className=cls;
  if(content!==undefined)text(node,content);
  return node;
}
function button(label,callback){
  const b=element('button','',label);b.type='button';b.addEventListener('click',callback);return b;
}
function status(value,error=false){
  text(el('status'),value);el('status').classList.toggle('warning',error);
}
function noteCount(p=undefined,d=undefined){
  return notes.filter(n=>!n.resolved&&(!p||n.pageId===p)&&(!d||n.device===d)).length;
}
function renderIndex(){
  const root=el('pages');root.replaceChildren();
  for(const [i,p] of evidence.pages.entries()){
    const count=noteCount(p.id);
    const refs=Object.keys(p.references||{}).length;
    const b=button(p.title+' · '+p.path+' · макетов '+refs+'/3'+(count?' · ⚠ '+count:''),()=>{
      pageIndex=i;renderAll();
    });
    b.className=i===pageIndex?'selected':'';
    root.append(b);
  }
  text(el('overview'),'Страниц: '+evidence.pages.length+
    ' · макетов: '+evidence.pages.reduce((n,p)=>n+Object.keys(p.references||{}).length,0)+
    ' · открытых замечаний: '+noteCount());
}
function drawView(){
  const p=current(),ref=currentReference(),shot=p.screenshots[device];
  text(el('heading'),p.title+' · '+p.path);
  text(el('device-label'),device+' · '+widths[device]+' px');
  text(el('reference-status'),ref?
    'Оригинал '+ref.source+' · SHA-256 '+ref.sha256.slice(0,16)+'…':
    'Для этой страницы НЕТ утверждённого макета '+device+'. Главная не подставляется.');
  el('reference-status').classList.toggle('warning',!ref);
  text(el('warning-text'),(p.warnings||[]).filter(w=>w.startsWith(device+':')).join(' · '));
  el('warning-text').hidden=!(p.warnings||[]).some(w=>w.startsWith(device+':'));
  const original=el('original'),rendered=el('rendered');
  original.removeAttribute('src');rendered.removeAttribute('src');
  original.hidden=!ref;el('missing').hidden=!!ref;
  if(ref)original.src=ref.file;
  rendered.src=shot.file;
  text(el('render-meta'),'PHP скриншот '+shot.width+' × '+shot.height+
    ' · SHA-256 '+shot.sha256.slice(0,16)+'…');
  el('compare').classList.toggle('overlay',mode==='overlay'&&!!ref);
  el('original-column').hidden=mode==='rendered'||!ref;
  el('overlay-image').hidden=mode!=='overlay'||!ref;
  el('overlay-image').removeAttribute('src');
  if(mode==='overlay'&&ref)el('overlay-image').src=ref.file;
  el('no-reference-panel').hidden=!!ref;
  el('overlay-option').disabled=!ref;
  el('opacity-control').disabled=mode!=='overlay'||!ref;
  el('original-viewport').scrollTop=el('rendered-viewport').scrollTop=0;
  renderNotes();
}
function renderNotes(){
  const root=el('notes');root.replaceChildren();
  const selected=notes.filter(n=>n.pageId===current().id&&n.device===device);
  if(!selected.length)root.append(element('p','muted','Для этого экрана замечаний нет.'));
  for(const note of selected){
    const item=element('article','finding');
    item.append(element('p',note.resolved?'resolved':'warning',
      (note.resolved?'✓ Исправлено':'⚠ Требует проверки')+' · '+note.text));
    const where=button('К месту на снимке · Y '+note.scrollY+' px',()=>{
      const img=el('rendered'),container=el('rendered-viewport');
      const ratio=img.naturalHeight?img.getBoundingClientRect().height/img.naturalHeight:1;
      container.scrollTop=note.scrollY*ratio;
    });
    item.append(where);
    if(!note.resolved)item.append(button('Отметить исправленным (только замечание)',()=>{
      note.resolved=true;renderNotes();renderIndex();status('Замечание закрыто вручную. Это НЕ утверждение макета.');
    }));
    root.append(item);
  }
}
function renderAll(){
  renderIndex();drawView();
  for(const b of el('devices').querySelectorAll('button'))
    b.classList.toggle('selected',b.dataset.device===device);
  for(const b of el('modes').querySelectorAll('button'))
    b.classList.toggle('selected',b.dataset.mode===mode);
}
function exportBlob(name,mime,contents){
  const url=URL.createObjectURL(new Blob([contents],{type:mime}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function snapshot(){
  return {format:'manufact-offline-visual-review-v1',siteId:evidence.siteId,
    approvedVersion:evidence.version,packageSha256:evidence.packageSha256,
    capturedAt:evidence.generatedAt,exportedAt:new Date().toISOString(),
    status:'operator-notes-not-client-approval',
    visualFindings:notes.map(n=>({...n}))};
}
function validNote(n){
  return n&&typeof n==='object'&&
    typeof n.pageId==='string'&&typeof n.path==='string'&&
    devices.includes(n.device)&&Number.isInteger(n.scrollY)&&
    n.scrollY>=0&&n.scrollY<=60000&&typeof n.text==='string'&&
    [...n.text].length>=3&&[...n.text].length<=500&&
    typeof n.resolved==='boolean'&&evidence.pages.some(p=>p.id===n.pageId&&p.path===n.path);
}
function importNotes(data){
  if(data?.format!=='manufact-offline-visual-review-v1'||
    data.siteId!==evidence.siteId||data.approvedVersion!==evidence.version||
    data.packageSha256!==evidence.packageSha256||
    data.capturedAt!==evidence.generatedAt||
    !Array.isArray(data.visualFindings)||data.visualFindings.length>200||
    !data.visualFindings.every(validNote))throw Error('Файл другого сайта, снимка или неверные замечания');
  notes.splice(0,notes.length,...data.visualFindings.map(n=>({
    pageId:n.pageId,path:n.path,device:n.device,scrollY:n.scrollY,
    text:n.text,resolved:n.resolved
  })));
  renderAll();
}
for(const [name,label] of Object.entries({desktop:'ПК 1280',tablet:'Планшет 768',mobile:'Телефон 390'})){
  const b=button(label,()=>{device=name;renderAll();});
  b.dataset.device=name;el('devices').append(b);
}
for(const [name,label] of Object.entries({side:'Рядом',overlay:'Наложить',rendered:'Только PHP'})){
  const b=button(label,()=>{mode=name;renderAll();});
  b.dataset.mode=name;if(name==='overlay')b.id='overlay-option';el('modes').append(b);
}
el('opacity-control').addEventListener('input',()=>{
  el('overlay-image').style.opacity=Number(el('opacity-control').value)/100;
  text(el('opacity-value'),el('opacity-control').value+'%');
});
el('sync').addEventListener('change',e=>{sync=e.target.checked;});
let scrolling=false;
for(const [fromId,toId] of [['rendered-viewport','original-viewport'],
  ['original-viewport','rendered-viewport']]){
  const from=el(fromId),to=el(toId);
  from.addEventListener('scroll',()=>{
    if(!sync||scrolling||mode!=='side'||!currentReference())return;
    const f=Math.max(0,from.scrollHeight-from.clientHeight);
    const t=Math.max(0,to.scrollHeight-to.clientHeight);
    scrolling=true;to.scrollTop=f?from.scrollTop/f*t:0;
    requestAnimationFrame(()=>{scrolling=false;});
  },{passive:true});
}
el('add-note').addEventListener('click',()=>{
  const raw=el('new-note').value.trim(),p=current();
  if(!p||[...raw].length<3||[...raw].length>500||notes.length>=200){
    status('Комментарий 3–500 символов, максимум 200 замечаний.',true);return;
  }
  const img=el('rendered'),ratio=img.naturalHeight?
    img.getBoundingClientRect().height/img.naturalHeight:1;
  const scrollY=Math.min(60000,Math.round(el('rendered-viewport').scrollTop/(ratio||1)));
  notes.push({pageId:p.id,path:p.path,device,scrollY,text:raw,resolved:false});
  el('new-note').value='';renderNotes();renderIndex();
  status('Замечание записано только в открытом отчёте. Скачайте JSON для сохранения.');
});
el('export-json').addEventListener('click',()=>exportBlob(
  'manual-visual-review-'+evidence.siteId+'.json','application/json',
  JSON.stringify(snapshot(),null,2)+'\\n'));
el('export-brief').addEventListener('click',()=>{
  const rows=notes.filter(n=>!n.resolved);
  const title='AI Site CMS — список замечаний, ручная проверка';
  const brief=[title,'Сайт: '+evidence.siteId,'Версия исходника: '+evidence.version,
    'SHA-256 утверждённого пакета: '+evidence.packageSha256,
    'Снимок: '+evidence.generatedAt,
    'Это не техническое/клиентское утверждение. Оригиналы и публикацию не менять.',
    ...rows.map((n,i)=>(i+1)+'. '+n.path+' · '+n.device+
      ' · Y '+n.scrollY+' px\\n'+n.text),
    rows.length?'Исправить и заново сравнить с оригиналами.':'Незакрытых записанных замечаний нет; ручная приёмка всё равно обязательна.'
  ].join('\\n\\n');
  exportBlob('visual-fix-brief-'+evidence.siteId+'.txt','text/plain;charset=utf-8',brief);
});
el('import-json').addEventListener('change',async e=>{
  try{
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>256000)throw Error('Отчёт больше 256 КБ');
    importNotes(JSON.parse(await file.text()));status('Замечания восстановлены из локального JSON.');
  }catch(error){status('Импорт отклонён: '+error.message,true);}
  finally{e.target.value='';}
});
renderAll();
status('Офлайн-отчёт открыт. Изменения существуют только в этой вкладке до экспорта JSON.');
`;
  // Hash pins the only executable inline script. Approved source text is
  // serialized, never executed. CSP blocks remote fetch and external assets.
  const scriptHash=crypto.createHash('sha256').update(script).digest('base64');
  const style=`*{box-sizing:border-box}html{color-scheme:light}body{margin:0;background:#edf2f6;color:#182b39;font:14px/1.48 system-ui,Arial}h1{font-size:24px;margin:0}h2{font-size:18px;margin:0 0 12px}h3{font-size:15px;margin:0}p{margin:8px 0}header{padding:22px 26px;background:#102f42;color:#f7fafc}header p{opacity:.86}.shell{display:grid;grid-template-columns:255px minmax(0,1fr);min-height:80vh}aside{padding:16px;border-right:1px solid #c9d8e1;background:#fff}aside #pages{display:grid;gap:8px}main{padding:16px;min-width:0}button,.file-label{display:inline-flex;align-items:center;border:1px solid #a6b6c0;color:#153447;background:#fff;border-radius:8px;padding:7px 11px;cursor:pointer;font:inherit;text-align:left;min-width:0;overflow-wrap:anywhere}button:hover,.file-label:hover{background:#e7f2f8}button.selected{background:#173c53;color:#fff;border-color:#173c53}button:disabled{opacity:.4;cursor:not-allowed}.toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 0}.review{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:15px}.surface,.notes-panel{background:#fff;border:1px solid #d0dce4;border-radius:12px;padding:16px;min-width:0}.compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.compare.overlay{grid-template-columns:minmax(0,1fr)}.compare.overlay #original-column{display:none}.img-wrap{min-height:360px;max-height:70vh;overflow:auto;position:relative;border:1px solid #aabcca;background:repeating-linear-gradient(45deg,#f7f9fb,#f7f9fb 12px,#ecf1f6 12px,#ecf1f6 24px)}.img-wrap>img{display:block;width:100%;height:auto}.overlay #rendered-viewport{position:relative}.overlay-image{position:absolute;inset:0;width:100%;height:auto;pointer-events:none;opacity:.5}.muted{color:#526879}.warning{color:#a83223}.resolved{color:#176c42}#missing,#no-reference-panel{padding:15px;background:#fff3ec;color:#8b341f}#notes{max-height:370px;overflow:auto}.finding{border-top:1px solid #dbe4eb;padding:10px 0;overflow-wrap:anywhere}textarea{resize:vertical;display:block;width:100%;min-height:90px;padding:9px;font:inherit;border:1px solid #9aabb7;border-radius:8px}input[type=file]{max-width:100%}.footer{border-top:1px solid #cad6dd;padding:16px 24px;background:#fff}small{font-size:11px}code{overflow-wrap:anywhere}.pill{display:inline-block;background:#dceef7;padding:4px 8px;border-radius:40px}#status{min-height:20px}@media(max-width:1100px){.review{grid-template-columns:1fr}}@media(max-width:760px){.shell{display:block}aside{border:0;border-bottom:1px solid #ccc}aside #pages{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}.compare{grid-template-columns:1fr}}`;
  return '<!doctype html><html lang="ru"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src \'self\' file: data: blob:; style-src \'unsafe-inline\'; script-src \'sha256-'+scriptHash+'\'; object-src \'none\'; form-action \'none\'; connect-src \'none\'; base-uri \'none\'">'+
    '<title>Ручная визуальная проверка · '+escapeHtml(report.siteId)+'</title><style>'+style+'</style></head>'+
    '<body><header><h1>Ручная визуальная проверка</h1><p>Сайт '+escapeHtml(report.siteId)+
    ' · исходный пакет '+escapeHtml(report.version)+' · '+escapeHtml(report.capturedAt)+
    '</p><p>Только локальный отчёт. НЕТ автоматической оценки совпадения макета, подписания клиентом, проверки JS/форм или публикации.</p></header>'+
    '<div class="shell"><aside><h2>Страницы</h2><p id="overview"></p><nav id="pages"></nav></aside>'+
    '<main><div class="surface"><h2 id="heading"></h2><p id="device-label"></p>'+
    '<div class="toolbar" id="devices"></div><div class="toolbar" id="modes"></div>'+
    '<div class="toolbar"><label><input id="sync" type="checkbox" checked> Связать прокрутку</label>'+
    '<label>Прозрачность макета <input id="opacity-control" type="range" min="0" max="100" value="50"></label><span id="opacity-value">50%</span></div>'+
    '<p id="reference-status"></p><p id="warning-text" class="warning" hidden></p>'+
    '<div class="review"><div class="surface"><div id="compare" class="compare">'+
    '<div id="original-column"><h3>Согласованный оригинал</h3><div class="img-wrap" id="original-viewport"><img id="original" alt="Утверждённое изображение проекта"></div></div>'+
    '<div><h3>Реальный PHP-сайт (скриншот)</h3><div class="img-wrap" id="rendered-viewport"><img id="rendered" alt="Полностраничный скриншот PHP"><img id="overlay-image" class="overlay-image" alt="" hidden></div><small id="render-meta"></small></div></div>'+
    '<p id="missing" hidden>Для данного экрана отсутствует отдельный исходный макет.</p><p id="no-reference-panel" hidden>Сравнение с оригиналом для этого экрана невозможно.</p></div>'+
    '<div class="notes-panel"><h3>Замечания по экрану</h3><div id="notes"></div><label for="new-note">Найденное расхождение</label><textarea id="new-note" maxlength="1000" placeholder="Укажите отступ, текст, изображение, навигацию или иной конкретный дефект"></textarea>'+
    '<div class="toolbar"><button id="add-note" type="button">Добавить замечание</button></div>'+
    '<p class="muted">Координата Y берётся из прокрутки снимка. Изменения не записываются автоматически.</p></div></div></div></main></div>'+
    '<footer class="footer"><h2>Переносимый отчёт</h2><div class="toolbar"><button id="export-json" type="button">Скачать замечания JSON</button><button id="export-brief" type="button">Скачать ТЗ исправлений TXT</button>'+
    '<label class="file-label">Восстановить JSON<input id="import-json" type="file" accept=".json,application/json"></label></div>'+
    '<p id="status" role="status"></p><p class="muted">Исходные медиа и скриншоты SHA-256 связаны с файлом evidence.json. Локальные правки замечаний не меняют исходники.</p></footer>'+
    '<script>'+script+'</script></body></html>';
}
module.exports=Object.freeze({render});
