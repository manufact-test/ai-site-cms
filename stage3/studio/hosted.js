'use strict';
// Interactive server-backed Stage3 Studio. Loaded ONLY by isolated PHP /studio route.
// Offline ZIP never loads this file and retains connect-src 'none'.
(()=>{
  const editor=window.Stage3Editor;
  if(!editor||document.documentElement.dataset.stage3Mode!=='server')throw Error('Hosted Studio bootstrap mismatch');
  const $=id=>document.getElementById(id);
  const state={csrf:null,siteId:null,revision:null,sites:[],revisions:[],busy:false,authorized:false,loading:false};
  const notice=(text,error=false)=>{const t=$('toast');t.hidden=false;t.textContent=text;t.className='toast'+(error?' error':'');};
  const element=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const action=(text,id,fn)=>{const b=element('button','btn small',text);b.id=id;b.type='button';b.addEventListener('click',fn);return b;};
  const toolbar=element('div','hosted-actions');
  toolbar.id='server-toolbar';
  const label=element('label','hosted-label','САЙТ НА СЕРВЕРЕ');
  label.htmlFor='server-site-select';
  const picker=element('select','control');
  picker.id='server-site-select';
  const open=action('Открыть','server-open',()=>safe(()=>openSite(picker.value)));
  const status=element('div','hosted-status','Нет открытого сайта');
  status.id='server-status';
  const row=element('div','hosted-buttons');
  row.append(open,action('Обновить','server-reload',()=>safe(reload)),
    action('Выйти','server-logout',()=>safe(logout)));
  toolbar.append(label,picker,row,status);
  document.querySelector('.site-actions').before(toolbar);
  $('save').textContent='Сохранить на сервере';
  $('reset').textContent='Отменить несохранённое';
  const publish=action('Опубликовать','server-publish',()=>safe(publishSite));
  publish.classList.add('primary');
  document.querySelector('.top-actions').append(publish);
  const publicLink=element('a','hosted-public-link','Открыть опубликованный сайт ↗');
  publicLink.id='server-public-link';publicLink.target='_blank';publicLink.rel='noopener noreferrer';
  publicLink.hidden=true;
  toolbar.append(publicLink);
  // Server-only media library: binary bytes never enter document JSON.
  const mediaPanel=element('div','hosted-media');
  const mediaTitle=element('strong',null,'Медиабиблиотека');
  const mediaHint=element('small',null,'PNG / JPEG / WebP · до 450 КБ · только этот сайт');
  const mediaInput=element('input');mediaInput.type='file';mediaInput.id='server-media-file';
  mediaInput.accept='image/png,image/jpeg,image/webp';mediaInput.hidden=true;
  const mediaUpload=action('+ Загрузить изображение','server-media-upload',()=>mediaInput.click());
  const mediaList=element('div','hosted-media-list');mediaList.id='server-media-list';
  mediaPanel.append(mediaTitle,mediaHint,mediaUpload,mediaInput,mediaList);
  toolbar.after(mediaPanel);
  const leadsPanel=element('div','hosted-leads');
  const leadsTitle=element('strong',null,'Заявки сайта');
  leadsTitle.id='server-submission-heading';
  const leadsRefresh=action('Обновить заявки','server-submissions-refresh',()=>safe(loadSubmissions));
  const leadsList=element('div','hosted-leads-list');leadsList.id='server-submissions';
  leadsPanel.append(leadsTitle,leadsRefresh,leadsList);
  mediaPanel.after(leadsPanel);
  const alertsRow=element('div','hosted-alerts');
  const alertsLabel=element('strong',null,'Непросмотренные заявки: 0');
  alertsLabel.id='server-notifications-count';
  const acknowledge=action('Отметить просмотренными','server-notifications-seen',()=>safe(async()=>{
    await api('/api/sites/'+encodeURIComponent(state.siteId)+'/notifications/seen','POST',{});
    await refreshAlerts();
    notice('Новые обращения отмечены просмотренными.');
  }));
  alertsRow.append(alertsLabel,acknowledge);
  leadsPanel.before(alertsRow);
  async function refreshAlerts(){
    if(!state.authorized||!state.siteId){alertsLabel.textContent='Непросмотренные заявки: 0';return;}
    const info=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/notifications');
    alertsLabel.textContent='Непросмотренные заявки: '+info.unread;
    acknowledge.disabled=info.unread===0;
  }

  async function loadSubmissions(){
    leadsList.replaceChildren();
    if(!state.authorized||!state.siteId){
      leadsTitle.textContent='Заявки сайта';
      leadsList.append(element('small',null,'Выберите сайт.'));
      return;
    }
    const response=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/submissions');
    await refreshAlerts(); // Inbox refresh and new-lead indicator are one operation.
    leadsTitle.textContent='Заявки сайта · '+response.submissions.length;
    if(!response.submissions.length){
      leadsList.append(element('small',null,'Обращений пока нет.'));return;
    }
    for(const lead of response.submissions){
      const wrap=element('article','hosted-lead');
      wrap.dataset.submissionId=lead.submission_id;
      wrap.append(element('strong',null,lead.name+' · '+lead.email));
      wrap.append(element('small',null,lead.submitted_at+' · '+lead.status));
      wrap.append(element('p',null,lead.message));
      if(lead.extras){
        for(const field of Object.values(lead.extras)){
          if(field&&typeof field.label==='string'&&typeof field.value==='string'){
            wrap.append(element('p','hosted-extra',field.label+': '+(field.value||'—')));
          }
        }
      }

      if(lead.status==='new'){
        wrap.append(action('Обработано','',()=>safe(async()=>{
          await api('/api/sites/'+encodeURIComponent(state.siteId)+'/submissions/'+
            encodeURIComponent(lead.submission_id)+'/review','POST',{});
          await loadSubmissions();
          notice('Заявка отмечена обработанной.');
        })));
      }
      leadsList.append(wrap);
    }
  }

  async function uploadMedia(file){
    return safe(async()=>{
      if(!state.siteId)throw Error('Сначала создайте сайт');
      if(editor.isDirty())throw Error('Сначала сохраните изменения черновика');
      if(!file||file.size<1||file.size>450000)throw Error('Изображение должно быть не больше 450 КБ');
      const description=prompt('Описание изображения (alt)',file.name.replace(/\.[^.]+$/,''));
      if(description===null)return;
      if(description.length>200)throw Error('Описание не более 200 символов');
      const base64=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
        reader.onerror=()=>reject(Error('Не удалось прочитать изображение'));
        reader.readAsDataURL(file);
      });
      const response=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/media','POST',
        {base64,alt:description,expectedRevision:state.revision});
      selectSite(response);await refreshSites();await loadHistory();
      notice('Изображение добавлено. Выберите его в поле блока «Изображение и описание».');
    });
  }
  mediaInput.addEventListener('change',()=>{
    const file=mediaInput.files?.[0];mediaInput.value='';
    if(file)uploadMedia(file);
  });
  const previewData=new Map(),loadingMedia=new Set();
  function previewUrl(assetId){
    if(!state.authorized||!state.siteId)return null;
    const key=state.siteId+':'+assetId;
    if(previewData.has(key))return previewData.get(key);
    if(loadingMedia.has(key))return null;
    loadingMedia.add(key);
    fetch('/api/sites/'+encodeURIComponent(state.siteId)+'/media/'+encodeURIComponent(assetId),
      {credentials:'same-origin',cache:'no-store'})
      .then(async result=>{
        if(!result.ok)throw Error('Предпросмотр изображения недоступен');
        const mime=result.headers.get('content-type');
        if(!['image/png','image/jpeg','image/webp'].includes(mime))
          throw Error('Неподдерживаемый тип изображения');
        const bytes=await result.blob();
        if(bytes.size>450000)throw Error('Изображение слишком большое для предпросмотра');
        return new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(String(reader.result));
          reader.onerror=()=>reject(Error('Не удалось прочитать изображение'));
          reader.readAsDataURL(bytes);
        });
      })
      .then(uri=>{
        if(!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(uri))
          throw Error('Недопустимый формат предпросмотра');
        previewData.set(key,uri);
        if(state.siteId+':'+assetId===key)editor.refreshPreview();
      })
      .catch(error=>{previewData.set(key,'');notice(error.message,true);})
      .finally(()=>loadingMedia.delete(key));
    return null;
  }
  function drawMedia(){
    mediaList.replaceChildren();
    alertsLabel.textContent='Непросмотренные заявки: 0';
    leadsList.replaceChildren();leadsTitle.textContent='Заявки сайта';
    previewData.clear();loadingMedia.clear();
    const assets=editor.getSite().assets;
    if(!state.siteId||!assets.length){
      mediaList.append(element('small',null,'Изображений пока нет.'));return;
    }
    for(const asset of assets){
      const row=element('div','hosted-media-item');
      const photo=element('img');photo.src='/api/sites/'+encodeURIComponent(state.siteId)+'/media/'+encodeURIComponent(asset.id);
      photo.alt=asset.alt;photo.loading='lazy';photo.width=65;photo.height=55;
      const desc=element('div');desc.append(element('strong',null,asset.alt||'Без описания'));
      desc.append(element('small',null,asset.id));
      row.append(photo,desc);mediaList.append(row);
    }
  }
  document.querySelector('.sidebar-bottom').textContent='Серверная Studio · черновики отдельно от публикации. Только изолированный Stage3.';
  const gate=element('div','hosted-gate');
  gate.id='server-login';
  const form=element('form','hosted-login');
  const h=element('h2',null,'Вход в AI Site CMS');
  const p=element('p',null,'Тестовая серверная CMS. Изменения не публикуются автоматически.');
  const user=element('input','control');user.id='server-username';user.autocomplete='username';user.required=true;
  const pass=element('input','control');pass.id='server-password';pass.type='password';pass.autocomplete='current-password';pass.required=true;
  const submit=element('button','btn primary','Войти');submit.type='submit';submit.id='server-signin';
  const info=element('p','hosted-login-message','');
  const ul=element('label',null,'Логин');ul.htmlFor=user.id;
  const pl=element('label',null,'Пароль');pl.htmlFor=pass.id;
  form.append(h,p,ul,user,pl,pass,submit,info);gate.append(form);document.body.append(gate);
  async function api(route,method='GET',payload){
    const response=await fetch(route,{method,credentials:'same-origin',cache:'no-store',
      headers:method==='POST'?{'Content-Type':'application/json','X-CSRF-Token':state.csrf||''}:{},
      ...(method==='POST'?{body:JSON.stringify(payload||{})}:{})});
    const body=await response.json();
    if(!response.ok){
      if(response.status===401&&route!=='/api/login'){state.authorized=false;setGate(true);}
      const err=Error(body.error||('HTTP '+response.status));err.status=response.status;throw err;
    }
    return body;
  }
  function setGate(locked){
    gate.hidden=!locked;
    document.querySelector('.shell').classList.toggle('server-locked',locked);
    if(locked){$('server-password').value='';}
    drawStatus();
  }
  function isDirty(){return editor.isDirty();}
  function drawStatus(){
    const exists=state.authorized&&state.siteId!==null&&state.revision!==null;
    const available=exists&&!state.busy;
    $('save').disabled=!available||!isDirty();
    $('server-publish').disabled=!available||isDirty();
    $('server-reload').disabled=!available;
    $('server-open').disabled=state.busy||!state.authorized||!picker.value;
    $('server-site-select').disabled=state.busy||!state.authorized;
    $('server-logout').disabled=state.busy||!state.authorized;
    $('new-site').disabled=state.busy||!state.authorized;
    $('import').disabled=state.busy||!state.authorized;
    leadsRefresh.disabled=state.busy||!state.authorized||!state.siteId;
    acknowledge.disabled=state.busy||!state.authorized||!state.siteId||acknowledge.disabled;
    mediaUpload.disabled=!available||isDirty();
    $('reset').disabled=!available;
    const meta=state.sites.find(s=>s.site_id===state.siteId);
    const published=meta?.published_version?('Опубликовано: v'+meta.published_version):'Пока не опубликован';
    status.textContent=exists?('Черновик #'+state.revision+' · '+published+
      (isDirty()?' · Есть правки':' · Без изменений')):'Выберите сайт или создайте новый';
    publicLink.hidden=!exists||!meta?.published_version;
    if(!publicLink.hidden)publicLink.href='/published/'+encodeURIComponent(state.siteId)+'/';
    $('save').title=isDirty()?'Сохранить новую серверную ревизию':'Все изменения уже сохранены';
  }
  async function safe(fn){
    if(state.busy)return;
    state.busy=true;drawStatus();
    try{return await fn();}catch(e){notice(e.message,true);}
    finally{state.busy=false;drawStatus();}
  }
  async function refreshSites(){
    state.sites=(await api('/api/sites')).sites;
    picker.replaceChildren();
    for(const row of state.sites){
      const opt=element('option',null,(row.title||row.site_id)+' · #'+row.revision);
      opt.value=row.site_id;picker.append(opt);
    }
    if(state.siteId&&state.sites.some(s=>s.site_id===state.siteId))picker.value=state.siteId;
    drawStatus();
  }
  async function loadHistory(){
    if(!state.siteId){state.revisions=[];drawVersions();return;}
    state.revisions=(await api('/api/sites/'+encodeURIComponent(state.siteId)+'/revisions')).revisions;
    drawVersions();
  }
  function editorVisible(visible){
    document.querySelector('.center').hidden=!visible;
    document.querySelector('.inspector').hidden=!visible;
  }
  function selectSite(result){
    state.siteId=result.site.siteId;
    editor.replace(result.site);
    state.revision=Number(result.revision);
    editorVisible(true);
    drawMedia();drawStatus();
  }
  async function openSite(id){
    if(!id)return;
    if(isDirty()&&!confirm('Отбросить несохранённые изменения и открыть другой сайт?'))return;
    const data=await api('/api/sites/'+encodeURIComponent(id));
    selectSite(data);
    picker.value=id;
    await loadHistory();await loadSubmissions();await refreshAlerts();
    notice('Сайт открыт из серверного хранилища. Публикация не выполнялась.');
  }
  async function save(){
    return safe(async()=>{
      if(!state.siteId)throw Error('Сначала откройте сайт');
      const candidate=editor.getSite();
      const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/save','POST',
        {site:candidate,expectedRevision:state.revision});
      state.revision=result.revision;
      editor.replace(result.site);
      await refreshSites();await loadHistory();
      notice('Черновик сохранён на сервере как ревизия #'+state.revision+'. Публикация отдельно.');
    });
  }
  async function reload(){
    if(!state.siteId)return;
    if(isDirty()&&!confirm('Отменить несохранённые правки и загрузить серверную версию?'))return;
    const id=state.siteId;
    const data=await api('/api/sites/'+encodeURIComponent(id));
    selectSite(data);await refreshSites();await loadHistory();
    notice('Загружена текущая серверная ревизия.');
  }
  async function publishSite(){
    if(!state.siteId)throw Error('Нет открытого сайта');
    if(isDirty())throw Error('Сначала сохраните черновик. Публикация не сохраняет правки автоматически.');
    if(!confirm('Опубликовать сохранённую серверную ревизию #'+state.revision+'?'))return;
    const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/publish','POST',
      {expectedRevision:state.revision});
    await refreshSites();
    notice('Опубликована версия #'+result.version+' из ревизии #'+result.sourceRevision+'.');
  }
  async function newSite(){
    return safe(async()=>{
      if(isDirty()&&!confirm('Есть несохранённые правки. Создать новый сайт без сохранения текущих?'))return;
      const title=prompt('Название нового сайта','Новый сайт');
      if(title===null)return;
      const id='site-'+crypto.randomUUID().replace(/-/g,'').slice(0,20);
      const site=editor.fromBrief(id,title.trim()||'Новый сайт');
      const created=await api('/api/sites','POST',{site});
      selectSite(created);await refreshSites();await loadHistory();await loadSubmissions();
      notice('Создан новый серверный сайт без макета. Ревизия #1; сайт не опубликован.');
    });
  }
  async function importSite(site){
    return safe(async()=>{
      if(isDirty()&&!confirm('Есть несохранённые правки. Импортировать другой сайт?'))return;
      if(!confirm('Создать серверный сайт из JSON с ID '+site.siteId+'? Публикация не выполняется.'))return;
      const created=await api('/api/sites','POST',{site});
      selectSite(created);await refreshSites();await loadHistory();await loadSubmissions();
      notice('JSON импортирован в отдельный серверный сайт. Черновик не опубликован.');
    });
  }
  async function logout(){
    if(isDirty()&&!confirm('Выйти без сохранения текущих правок?'))return;
    await api('/api/logout','POST',{});
    state.authorized=false;state.csrf=null;state.siteId=null;state.revision=null;
    state.revisions=[];state.sites=[];picker.replaceChildren();
    mediaList.replaceChildren();
    editorVisible(false);setGate(true);
    notice('Вы вышли из серверной CMS.');
  }
  function drawVersions(){
    const box=$('versions');box.replaceChildren();
    if(!state.siteId){
      box.append(element('p','subdued','Откройте сайт для просмотра истории сервера.'));
      return;
    }
    if(!state.revisions.length){
      box.append(element('p','subdued','История сервера ещё не загружена.'));return;
    }
    for(const item of state.revisions){
      const b=action('Ревизия #'+item.revision,'',()=>safe(async()=>{
        if(isDirty()&&!confirm('Текущие несохранённые правки будут потеряны. Продолжить?'))return;
        if(!confirm('Восстановить ревизию #'+item.revision+' как НОВЫЙ серверный черновик? Опубликованный сайт не изменится.'))return;
        const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/restore','POST',
          {targetRevision:Number(item.revision),expectedRevision:state.revision});
        selectSite(result);await refreshSites();await loadHistory();
        notice('Ревизия #'+item.revision+' восстановлена как новый черновик #'+state.revision+'.');
      }));
      b.className='version';
      const small=element('small',null,new Date(item.created_at).toLocaleString('ru-RU'));
      b.append(small);box.append(b);
    }
  }
  async function signIn(e){
    e.preventDefault();
    if(state.busy)return;
    state.busy=true;submit.disabled=true;info.textContent='';
    try{
      const data=await api('/api/login','POST',{username:user.value,password:pass.value});
      state.csrf=data.csrfToken;state.authorized=true;pass.value='';
      setGate(false);
      await refreshSites();
      if(state.sites.length)await openSite(state.sites[0].site_id);
      else{editorVisible(false);notice('Вход выполнен. Создайте первый сайт.');}
    }catch(err){info.textContent=err.message;state.authorized=false;setGate(true);}
    finally{state.busy=false;submit.disabled=false;drawStatus();}
  }
  form.addEventListener('submit',signIn);
  picker.addEventListener('change',()=>safe(()=>openSite(picker.value)));
  window.Stage3Host=Object.freeze({save,newSite,importSite,reload,drawVersions,onDraw:drawStatus,previewUrl});
  $('versions').replaceChildren();
  editorVisible(false);
  state.loading=true;setGate(true);
  (async()=>{
    try{
      const stateResponse=await api('/api/session');
      if(stateResponse.authenticated){
        state.csrf=stateResponse.csrfToken;state.authorized=true;setGate(false);
        await refreshSites();
        if(state.sites.length)await safe(()=>openSite(state.sites[0].site_id));
        else notice('Вход действителен. Создайте первый сайт.');
      } else user.focus();
    }catch(err){info.textContent='Сервер недоступен: '+err.message;}
    finally{state.loading=false;drawStatus();}
  })();
})();
