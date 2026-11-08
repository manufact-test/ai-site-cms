'use strict';
// Owner-only, first-party panel inside the EXISTING hosted Studio; not a new editor.
(()=>{
  if(document.documentElement.dataset.stage3Mode!=='server')return;
  const route='/api/celikom-original';
  const make=(tag,cls='',label)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(label!==undefined)e.textContent=label;
    return e;
  };
  const btn=(text,action)=>{
    const b=make('button','btn small',text);b.type='button';b.addEventListener('click',action);return b;
  };
  const panel=document.createElement('dialog');panel.id='celikom-original-dialog';
  panel.setAttribute('aria-label','CELIKOM · оригинальный сайт');
  const title=make('h2','','CELIKOM · оригинальный сайт');
  const intro=make('p','celikom-note','Редактируются только тексты и SEO настоящего CELIKOM. Исходные HTML, CSS, JS и изображения не заменяются CMS-шаблонами.');
  const status=make('p','celikom-status','Загрузка');status.setAttribute('role','status');
  const wrap=make('div','celikom-editor-layout');
  const sidebar=make('div','celikom-edit-fields');
  const preview=make('section','celikom-edit-preview');
  const tools=make('div','celikom-actions');
  const save=btn('Сохранить черновик',()=>run(saveDraft));
  const reload=btn('Перезагрузить',()=>run(reloadServer));
  const review=btn('Предпросмотр',()=>run(renderPreview));
  const publish=btn('Опубликовать версию',()=>run(publishDraft));
  const close=btn('Закрыть',()=>panel.close());
  tools.append(save,reload,review,publish,close);
  const versionToolbar=make('div','celikom-actions');
  const versionSelect=make('select','control');
  versionSelect.setAttribute('aria-label','Выбор ревизии');
  const restore=btn('Вернуть черновик',()=>run(restoreRevision));
  const releaseSelect=make('select','control');
  releaseSelect.setAttribute('aria-label','Выбор опубликованной версии');
  const restorePublished=btn('Вернуть публикацию в черновик',()=>run(restoreRelease));
  versionToolbar.append(versionSelect,restore,releaseSelect,restorePublished);
  const devices=make('div','celikom-actions');
  const stage=make('div','celikom-preview-stage');
  const frame=document.createElement('iframe');
  frame.title='Изолированный предпросмотр исходного CELIKOM';
  frame.setAttribute('sandbox','allow-scripts'); // NEVER allow-same-origin: original JS is not trusted with CMS cookies.
  frame.setAttribute('referrerpolicy','no-referrer');
  frame.setAttribute('loading','lazy');
  stage.append(frame);
  const previewNote=make('small','celikom-note','Скрипты запускаются в изолированном iframe без доступа к кабинету CMS. Аудио и Manrope отсутствуют в исходном архиве.');
  [['ПК',1440],['Планшет',768],['Телефон',390]].forEach(([caption,width])=>{
    devices.append(btn(caption,()=>{
      frame.style.width=width+'px';
      frame.setAttribute('data-device-width',String(width));
    }));
  });
  frame.style.width='1440px';frame.style.height='680px';
  preview.append(devices,stage,previewNote);
  wrap.append(sidebar,preview);
  panel.append(title,intro,status,tools,versionToolbar,wrap);
  document.body.append(panel);

  let current=null,draft={},csrf='',working=false;
  const canEdit=()=>current!==null && !working;
  const dirty=()=>current && Object.keys(draft).some(k=>draft[k]!==current.fields[k]);
  function show(message,error=false){
    status.textContent=message;
    status.classList.toggle('is-error',error);
    save.disabled=!canEdit()||!dirty();
    publish.disabled=!canEdit()||!!dirty();
  }
  async function api(path='',method='GET',body=null){
    const response=await fetch(route+path,{
      method,credentials:'same-origin',cache:'no-store',
      ...(method!=='GET'?{
        headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
        body:JSON.stringify(body||{})}:{}),
    });
    const text=await response.text();let result;
    try{result=JSON.parse(text);}catch(_){throw Error('Сервер вернул не-JSON ответ');}
    if(!response.ok)throw Error(result.error||('HTTP '+response.status));
    return result;
  }
  async function run(fn){
    if(working)return;
    working=true;show('Выполняю…');
    try{await fn();}catch(e){show(e.message,true);}
    finally{working=false;save.disabled=!dirty();publish.disabled=!!dirty();}
  }
  function updateMenus(){
    versionSelect.replaceChildren();releaseSelect.replaceChildren();
    for(const version of [...current.revisions].sort((a,b)=>b-a)){
      const option=make('option','',`Черновик #${version}`);option.value=version;
      versionSelect.append(option);
    }
    for(const release of [...current.releases].reverse()){
      const option=make('option','',`Публикация v${release.version} · черновик #${release.sourceRevision}`);
      option.value=release.version;releaseSelect.append(option);
    }
    restore.disabled=current.revisions.length<2;
    restorePublished.disabled=current.releases.length===0;
  }
  function fieldLabel(key){
    if(key==='seo.title')return 'Заголовок страницы (Title)';
    if(key==='seo.description')return 'Описание страницы (Description)';
    if(key.endsWith('.question'))return 'Вопрос · '+key.split('.').slice(1,-1).join('.');
    if(key.endsWith('.answer'))return 'Ответ · '+key.split('.').slice(1,-1).join('.');
    if(key.includes('.heading.'))return 'Заголовок · '+key.split('.').pop();
    if(key.endsWith('.intro'))return 'Вводный текст';
    if(key.endsWith('.title'))return 'Название · '+key;
    if(key.endsWith('.body'))return 'Описание · '+key;
    return key;
  }
  function redraw(){
    sidebar.replaceChildren();
    const sections=new Map();
    for(const key of Object.keys(current.keys)){
      const section=key.startsWith('faq.')?'faq':key.split('.')[0];
      if(!sections.has(section))sections.set(section,[]);
      sections.get(section).push(key);
    }
    for(const [name,keys] of sections){
      const fold=make('details','celikom-fields-group');
      fold.open=name==='seo'||name==='hero';
      fold.append(make('summary','',name.toUpperCase()+' · '+keys.length+' полей'));
      for(const key of keys){
        const box=make('label','celikom-field');
        const heading=make('span','',fieldLabel(key));
        const len=current.keys[key].max;
        const input=make(len>220?'textarea':'input','control');
        if(input.tagName==='TEXTAREA')input.rows=3;else input.type='text';
        input.value=draft[key];input.maxLength=len;
        input.setAttribute('data-celikom-key',key);
        input.addEventListener('input',()=>{draft[key]=input.value;show(dirty()?'Есть несохранённые правки':'Без изменений');});
        box.append(heading,input);fold.append(box);
      }
      sidebar.append(fold);
    }
    updateMenus();
    show('Черновик #'+current.revision+' загружен · '+Object.keys(current.keys).length+
      ' разрешённых полей'+(current.publicConfigured?'':' · публичный хост ещё не настроен'));
  }
  async function fetchState(){
    const next=await api();current=next;draft={...current.fields};redraw();
  }
  async function renderPreview(){
    if(!canEdit()&&current===null)return;
    const rendered=await api('/preview','POST',{fields:draft});
    if(typeof rendered.html!=='string')throw Error('Предпросмотр не получен');
    frame.srcdoc=rendered.html;
    show('Предпросмотр '+(dirty()?'несохранённых изменений':'черновика #'+current.revision));
  }
  async function saveDraft(){
    if(!dirty())return;
    await api('/save','POST',{fields:draft,expectedRevision:current.revision});
    await fetchState();await renderPreview();
    show('Черновик сохранён как #'+current.revision+'. Для публикации нужна отдельная команда.');
  }
  async function reloadServer(){
    if(dirty()&&!confirm('Отбросить несохранённые изменения CELIKOM?'))return;
    await fetchState();await renderPreview();
  }
  async function publishDraft(){
    if(dirty())throw Error('Сначала сохраните черновик');
    if(!confirm('Зафиксировать отдельную публикацию CELIKOM из черновика #'+current.revision+'?'))return;
    const result=await api('/publish','POST',{expectedRevision:current.revision});
    await fetchState();
    show('Создана версия v'+result.version+'. '+
      (result.publicConfigured?'Проверяйте публичный маршрут на отдельном хосте.':'Публичный хост не настроен: реальный выход в сеть НЕ подтверждён.'));
  }
  async function restoreRevision(){
    const target=Number(versionSelect.value);
    if(!Number.isSafeInteger(target)||target<1||!confirm('Вернуть черновик #'+target+' в НОВУЮ ревизию?'))return;
    if(dirty())throw Error('Сначала сохраните или отбросьте изменения');
    await api('/restore','POST',{targetRevision:target,expectedRevision:current.revision});
    await fetchState();await renderPreview();
    show('Восстановлен черновик #'+target+' → новая ревизия #'+current.revision+'.');
  }
  async function restoreRelease(){
    const target=Number(releaseSelect.value);
    if(!Number.isSafeInteger(target)||target<1||!confirm('Вернуть публикацию v'+target+' в НОВЫЙ черновик?'))return;
    if(dirty())throw Error('Сначала сохраните или отбросьте изменения');
    await api('/restore-release','POST',{targetVersion:target,expectedRevision:current.revision});
    await fetchState();await renderPreview();
    show('Публикация v'+target+' восстановлена в черновик #'+current.revision+'. Публичная версия не изменена.');
  }
  async function open(){
    const login=await fetch('/api/session',{credentials:'same-origin',cache:'no-store'});
    const session=await login.json();
    if(!session.authenticated||session.principal?.role!=='owner'){
      throw Error('Для оригинального CELIKOM нужен вход владельца в Studio');
    }
    csrf=session.csrfToken||'';
    panel.showModal();
    await fetchState();await renderPreview();
  }
  const launch=btn('CELIKOM · оригинал',()=>run(async()=>{
    try{await open();}catch(e){if(panel.open)show(e.message,true);else alert(e.message);}
  }));
  launch.id='server-celikom-original';
  const toolsContainer=document.getElementById('local-site-tools-content');
  if(toolsContainer)toolsContainer.prepend(launch);
  // Expose the preserved-source pilot on the real empty "Мои сайты" view;
  // it is not a fake typed site in the Stage3 site repository.
  const homeList=document.getElementById('server-site-list');
  if(homeList){
    const entry=make('section','cms-hub-card celikom-home-entry');
    entry.append(make('h3','','CELIKOM · сохранённый оригинал'),
      make('p','celikom-note','Оригинальный HTML/CSS/JS. Изменяются только разрешённые тексты и FAQ.'),
      btn('Открыть оригинал CELIKOM',()=>run(async()=>{
        try{await open();}catch(e){if(panel.open)show(e.message,true);else alert(e.message);}
      })));
    homeList.before(entry);
  }
})();
