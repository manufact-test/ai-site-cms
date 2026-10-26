'use strict';
// Interactive server-backed Stage3 Studio. Loaded ONLY by isolated PHP /studio route.
// Offline ZIP never loads this file and retains connect-src 'none'.
(()=>{
  const editor=window.Stage3Editor;
  if(!editor||document.documentElement.dataset.stage3Mode!=='server')throw Error('Hosted Studio bootstrap mismatch');
  const $=id=>document.getElementById(id);
  const state={csrf:null,siteId:null,revision:null,sites:[],revisions:[],busy:false,authorized:false,loading:false,principal:null};
  const isOwner=()=>state.principal?.role==='owner';
  const currentLicense=()=>state.sites.find(s=>s.site_id===state.siteId)?.license;
  const canEdit=()=>['owner','editor','publisher'].includes(state.principal?.role)&&!currentLicense()?.paused;
  const canPublish=()=>['owner','publisher'].includes(state.principal?.role)&&!currentLicense()?.paused;
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
  const mediaHint=element('small',null,'PNG/JPEG/WebP до 450 КБ · MP4 до 16 МБ · приватно до публикации');
  const mediaInput=element('input');mediaInput.type='file';mediaInput.id='server-media-file';
  mediaInput.accept='image/png,image/jpeg,image/webp';mediaInput.hidden=true;
  const mediaUpload=action('+ Загрузить изображение','server-media-upload',()=>mediaInput.click());
  const mediaList=element('div','hosted-media-list');mediaList.id='server-media-list';
  const videoInput=element('input');videoInput.type='file';videoInput.id='server-video-file';
  videoInput.accept='video/mp4,.mp4';videoInput.hidden=true;
  const videoUpload=action('+ Загрузить MP4 (до 16 МБ)','server-video-upload',()=>videoInput.click());
  mediaPanel.append(mediaTitle,mediaHint,mediaUpload,mediaInput,videoUpload,videoInput,mediaList);
  toolbar.after(mediaPanel);
  // Saved section presets are scoped to the currently selected owner site.
  // Applying a preset modifies ONLY the local draft, with undo/redo. Owner
  // must separately save the draft and then explicitly publish it.
  const templatesPanel=element('div','hosted-templates');
  const templatesTitle=element('strong',null,'Мои шаблоны блоков');
  const templatesSave=action('Сохранить выбранный блок','server-template-save',()=>safe(async()=>{
    if(!state.siteId)throw Error('Сначала откройте сайт');
    if(editor.isDirty())throw Error('Сначала сохраните исходный черновик');
    const sel=editor.selection();
    const name=prompt('Название шаблона','Мой блок');if(name===null)return;
    await api('/api/sites/'+encodeURIComponent(state.siteId)+'/templates','POST',
      {name,pageId:sel.pageId,sectionId:sel.sectionId,expectedRevision:state.revision});
    await loadTemplates();
    notice('Блок сохранён в библиотеку без изменения сайта.');
  }));
  const templatesRefresh=action('Обновить библиотеку','server-template-refresh',()=>safe(loadTemplates));
  const templatesList=element('div','hosted-templates-list');templatesList.id='server-template-list';
  templatesPanel.append(templatesTitle,templatesSave,templatesRefresh,templatesList);
  mediaPanel.after(templatesPanel);
  async function loadTemplates(){
    templatesList.replaceChildren();
    if(!state.authorized||!state.siteId){
      templatesList.append(element('small',null,'Сначала откройте сайт.'));return;
    }
    const response=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/templates');
    templatesTitle.textContent='Мои шаблоны блоков · '+response.templates.length;
    if(!response.templates.length){
      templatesList.append(element('small',null,'Сохраните один из существующих блоков.'));return;
    }
    for(const item of response.templates){
      const wrap=element('div','hosted-template');
      wrap.append(element('strong',null,item.title),element('small',null,item.component));
      wrap.append(action('Вставить','',()=>{
        if(!state.siteId){notice('Откройте сайт',true);return;}
        try{
          editor.applySectionTemplate(item.section);
          notice('Блок вставлен в черновик. Сохраните, чтобы он остался.');
        }catch(error){notice(error.message,true);}
      }));
      wrap.append(action('Удалить шаблон','',()=>safe(async()=>{
        if(!confirm('Удалить шаблон из библиотеки? Существующие блоки не изменятся.'))return;
        await api('/api/sites/'+encodeURIComponent(state.siteId)+'/templates/'+item.id+'/delete','POST',{});
        await loadTemplates();
        notice('Шаблон удалён из библиотеки.');
      })));
      templatesList.append(wrap);
    }
  }
  const leadsPanel=element('div','hosted-leads');
  const leadsTitle=element('strong',null,'Заявки сайта');
  leadsTitle.id='server-submission-heading';
  const leadsRefresh=action('Обновить заявки','server-submissions-refresh',()=>safe(loadSubmissions));
  const leadsList=element('div','hosted-leads-list');leadsList.id='server-submissions';
  const leadsTools=element('div','hosted-inbox-tools');
  const leadsStatus=element('select','control');leadsStatus.id='server-inbox-status';
  for(const [value,name] of [['all','Все'],['new','Новые'],['reviewed','Обработанные']]){
    const opt=element('option',null,name);opt.value=value;leadsStatus.append(opt);
  }
  leadsStatus.setAttribute('aria-label','Фильтр статуса заявок');
  const leadsSearch=element('input','control');leadsSearch.type='search';leadsSearch.id='server-inbox-search';
  leadsSearch.placeholder='Имя, email или сообщение';leadsSearch.maxLength=120;
  leadsSearch.setAttribute('aria-label','Поиск по заявкам');
  let inboxPage=1,inboxSite=null,inboxSelected=new Set(),inboxVisible=[];
  const leadsFind=action('Найти','server-inbox-find',()=>safe(async()=>{inboxPage=1;await loadSubmissions();}));
  const leadsExport=action('Скачать CSV','server-inbox-export',()=>safe(async()=>{
    if(!state.siteId||!canEdit())throw Error('Нет доступа к заявкам');
    const url='/api/sites/'+encodeURIComponent(state.siteId)+'/submissions/export?'+
      new URLSearchParams({status:leadsStatus.value,q:leadsSearch.value});
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});
    if(!response.ok){
      const error=await response.json().catch(()=>({error:'Ошибка CSV экспорта'}));
      throw Error(error.error||'Ошибка CSV экспорта');
    }
    const blob=await response.blob();
    if(blob.size>10000000)throw Error('CSV слишком большой');
    const href=URL.createObjectURL(blob),a=element('a');
    a.href=href;a.download=state.siteId+'-submissions.csv';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(href),2000);
    notice('Скачаны приватные заявки по выбранному фильтру. Храните CSV безопасно.');
  }));
  const leadsBulk=action('Обработать выбранные','server-inbox-bulk',()=>safe(async()=>{
    if(!inboxSelected.size||inboxSelected.size>50)throw Error('Выберите до 50 новых заявок');
    if(!confirm('Отметить выбранные заявки обработанными ('+inboxSelected.size+')?'))return;
    const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/submissions/bulk-review',
      'POST',{ids:[...inboxSelected]});
    inboxSelected.clear();await loadSubmissions();
    notice('Отмечено обработанными заявок: '+result.reviewed+'.');
  }));
  leadsBulk.disabled=true;
  const leadsPageLabel=element('small',null,'Страница 1 из 1');leadsPageLabel.id='server-inbox-page-label';
  const leadsPrev=action('← Назад','server-inbox-prev',()=>safe(async()=>{inboxPage=Math.max(1,inboxPage-1);await loadSubmissions();}));
  const leadsNext=action('Дальше →','server-inbox-next',()=>safe(async()=>{inboxPage++;await loadSubmissions();}));
  const leadsTotals=element('small',null,'');leadsTotals.id='server-inbox-totals';
  const leadsPager=element('div','hosted-inbox-pager');
  leadsPager.append(leadsPrev,leadsPageLabel,leadsNext);
  leadsTools.append(leadsStatus,leadsSearch,leadsFind,leadsExport,leadsBulk);
  leadsPanel.append(leadsTitle,leadsRefresh,leadsTools,leadsTotals,leadsList,leadsPager);
  leadsStatus.addEventListener('change',()=>safe(async()=>{inboxPage=1;await loadSubmissions();}));
  leadsSearch.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();leadsFind.click();}
  });
  mediaPanel.after(leadsPanel);
  // Optional owner-configured external delivery. Provider secrets remain in server env.
  let currentDelivery=null;
  const deliveryPanel=element('section','hosted-delivery');deliveryPanel.id='server-delivery-panel';
  const deliveryTitle=element('strong',null,'Внешние уведомления о заявках');
  const deliveryHelp=element('small',null,'Email и Telegram настраиваются отдельно для каждого сайта. STAGE3_MAIL_FROM и STAGE3_TELEGRAM_BOT_TOKEN задаются только в окружении сервера, не в Studio и не в резервной копии.');
  const deliveryReport=element('div','hosted-delivery-status');deliveryReport.id='server-delivery-status';
  const deliveryRecent=element('div','hosted-delivery-recent');deliveryRecent.id='server-delivery-recent';
  const deliveryFields=element('div','hosted-delivery-fields');
  const deliveryEmailEnabled=element('input');deliveryEmailEnabled.type='checkbox';deliveryEmailEnabled.id='server-delivery-email-enabled';
  const deliveryEmailRecipient=element('input','control');deliveryEmailRecipient.type='email';deliveryEmailRecipient.id='server-delivery-email-recipient';deliveryEmailRecipient.maxLength=254;deliveryEmailRecipient.placeholder='leads@example.com';
  const deliveryTelegramEnabled=element('input');deliveryTelegramEnabled.type='checkbox';deliveryTelegramEnabled.id='server-delivery-telegram-enabled';
  const deliveryTelegramChat=element('input','control');deliveryTelegramChat.type='text';deliveryTelegramChat.id='server-delivery-telegram-chat';deliveryTelegramChat.inputMode='numeric';deliveryTelegramChat.maxLength=32;deliveryTelegramChat.placeholder='Например, -1001234567890';
  const deliveryReason=element('input','control');deliveryReason.type='text';deliveryReason.id='server-delivery-reason';deliveryReason.maxLength=240;deliveryReason.placeholder='Причина изменения настроек';
  const deliveryField=(labelText,control)=>{
    const label=element('label','hosted-delivery-field',labelText);label.append(control);return label;
  };
  deliveryFields.append(
    deliveryField('Включить email',deliveryEmailEnabled),
    deliveryField('Email получателя',deliveryEmailRecipient),
    deliveryField('Включить Telegram',deliveryTelegramEnabled),
    deliveryField('Числовой ID чата Telegram',deliveryTelegramChat)
  );
  const deliverySave=action('Сохранить настройки','server-delivery-save',()=>safe(async()=>{
    if(!state.siteId)throw Error('Сначала откройте сайт');
    if(!deliveryReason.value.trim())throw Error('Укажите причину изменения настроек');
    const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/delivery','POST',{
      emailEnabled:deliveryEmailEnabled.checked,emailRecipient:deliveryEmailRecipient.value.trim(),
      telegramEnabled:deliveryTelegramEnabled.checked,telegramChatId:deliveryTelegramChat.value.trim(),
      expectedVersion:currentDelivery?.settings?.version??0,reason:deliveryReason.value.trim()
    });
    renderDelivery(result);await refreshSites();
    notice('Настройки доставки сохранены. Состояние транспорта показано отдельно; сохранение заявки не зависит от внешнего канала.');
  }));
  const deliveryRefresh=action('Обновить статус','server-delivery-refresh',()=>safe(loadDeliverySettings));
  const deliveryRetry=action('Повторить сбои без подтверждённой отправки','server-delivery-retry',()=>safe(async()=>{
    if(!state.siteId||!deliveryReason.value.trim())throw Error('Откройте сайт и укажите причину повтора');
    const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/delivery/retry','POST',
      {reason:deliveryReason.value.trim(),includeUncertain:false});
    renderDelivery(result);notice('Повтор завершён. Проверьте фактические статусы каналов.');
  }));
  const deliveryRetryUncertain=action('Повторить неопределённые (риск дубля)','server-delivery-retry-uncertain',()=>safe(async()=>{
    if(!state.siteId||!deliveryReason.value.trim())throw Error('Откройте сайт и укажите причину повтора');
    if(!confirm('Некоторые отправки могли дойти до получателя, но ответ не сохранился. Повтор может создать дубликат. Продолжить?'))return;
    const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/delivery/retry','POST',
      {reason:deliveryReason.value.trim(),includeUncertain:true});
    renderDelivery(result);notice('Повтор неопределённых отправок завершён. Проверьте канал вручную.');
  }));
  const deliveryActions=element('div','hosted-delivery-actions');
  deliveryActions.append(deliverySave,deliveryRefresh,deliveryRetry,deliveryRetryUncertain);
  deliveryPanel.append(deliveryTitle,deliveryHelp,deliveryReport,deliveryFields,
    deliveryField('Причина / операторская заметка',deliveryReason),deliveryActions,deliveryRecent);
  leadsPanel.after(deliveryPanel);
  function renderDelivery(data){
    currentDelivery=data;
    const s=data.settings||{};
    deliveryEmailEnabled.checked=!!s.emailEnabled;deliveryEmailRecipient.value=s.emailRecipient||'';
    deliveryTelegramEnabled.checked=!!s.telegramEnabled;deliveryTelegramChat.value=s.telegramChatId||'';
    deliveryReport.replaceChildren();
    const reasonLabels={
      sender_missing:'На сервере не задан STAGE3_MAIL_FROM',sender_invalid:'STAGE3_MAIL_FROM некорректен',
      mail_unavailable:'PHP mail() недоступен',bot_token_missing:'На сервере не задан STAGE3_TELEGRAM_BOT_TOKEN',
      bot_token_invalid:'STAGE3_TELEGRAM_BOT_TOKEN некорректен',
      https_transport_unavailable:'На сервере недоступен HTTPS-транспорт',
      recipient_missing:'Не указан получатель',ready:'Транспорт настроен',disabled:'Канал выключен'
    };
    for(const [key,labelText] of [['email','Email'],['telegram','Telegram']]){
      const ch=data.channels?.[key]||{},counts=ch.counts||{};
      const row=element('div','hosted-delivery-channel');
      const label=ch.configurationStatus==='disabled'?'Выключен':
        ch.configurationStatus==='configuration_required'?'Требуется настройка: '+(reasonLabels[ch.configurationReason]||ch.configurationReason):
        'Настроен; транспорт доступен';
      row.append(element('strong',null,labelText+' · '+label));
      row.append(element('small',null,'Ожидают: '+(counts.pending||0)+' · Принято транспортом: '+(counts.accepted||0)+
        ' · Ошибка: '+(counts.failed||0)+' · Требуется настройка: '+(counts.configuration_required||0)+
        ' · Неопределённо: '+(counts.uncertain||0)));
      deliveryReport.append(row);
    }
    deliveryReport.append(element('small',null,'«Принято транспортом» не гарантирует доставку в почтовый ящик. Неопределённые попытки не повторяются автоматически, чтобы не создавать дубликаты.'));
    deliveryRecent.replaceChildren();
    if(!data.recent?.length){deliveryRecent.append(element('small',null,'Попыток доставки пока нет.'));return;}
    const labels={pending:'Ожидает',sending:'Отправляется',accepted:'Принято транспортом',failed:'Ошибка',
      configuration_required:'Нужна настройка',uncertain:'Результат неизвестен',disabled:'Канал выключен'};
    for(const item of data.recent.slice(0,10)){
      const row=element('div','hosted-delivery-attempt');
      row.append(element('strong',null,(item.channel==='email'?'Email':'Telegram')+' · '+(labels[item.state]||item.state)));
      row.append(element('small',null,item.submissionId+' · попыток: '+item.attempts+' · '+item.updatedAt+
        (item.lastError?' · '+item.lastError:'')));
      deliveryRecent.append(row);
    }
  }
  async function loadDeliverySettings(){
    if(!isOwner()){deliveryPanel.hidden=true;return;}
    if(!state.authorized||!state.siteId){
      currentDelivery=null;deliveryReport.replaceChildren(element('small',null,'Сначала откройте сайт.'));
      deliveryRecent.replaceChildren();return;
    }
    renderDelivery(await api('/api/sites/'+encodeURIComponent(state.siteId)+'/delivery'));
  }
  let unreadCount=0;
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
    if(!state.authorized||!state.siteId||!canEdit()){
      unreadCount=0;alertsLabel.textContent='Непросмотренные заявки: 0';acknowledge.disabled=true;return;
    }
    const info=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/notifications');
    unreadCount=info.unread;
    alertsLabel.textContent='Непросмотренные заявки: '+unreadCount;
    acknowledge.disabled=state.busy||unreadCount===0;
  }

  async function loadSubmissions(){
    leadsList.replaceChildren();inboxSelected.clear();inboxVisible=[];
    leadsBulk.disabled=true;
    if(!state.authorized||!state.siteId||!canEdit()){
      leadsTitle.textContent='Заявки сайта';leadsTotals.textContent='';
      leadsPrev.disabled=true;leadsNext.disabled=true;leadsExport.disabled=true;
      leadsList.append(element('small',null,'Выберите сайт.'));return;
    }
    if(inboxSite!==state.siteId){inboxSite=state.siteId;inboxPage=1;leadsSearch.value='';leadsStatus.value='all';}
    const url='/api/sites/'+encodeURIComponent(state.siteId)+'/submissions?'+
      new URLSearchParams({status:leadsStatus.value,q:leadsSearch.value,page:String(inboxPage)});
    const response=await api(url);
    await refreshAlerts(); // Inbox refresh and new-lead indicator are one operation.
    inboxPage=response.page;inboxVisible=response.submissions;
    leadsTitle.textContent='Заявки сайта · '+response.counts.all;
    leadsTotals.textContent='Новые: '+response.counts.new+' · Обработанные: '+response.counts.reviewed+
      ' · Найдено: '+response.total;
    leadsPageLabel.textContent='Страница '+response.page+' из '+response.pages;
    leadsPrev.disabled=response.page<=1;leadsNext.disabled=response.page>=response.pages;
    leadsExport.disabled=false;
    if(!response.submissions.length){
      leadsList.append(element('small',null,'По фильтру заявок нет.'));return;
    }
    const selectable=response.submissions.filter(lead=>lead.status==='new');
    if(selectable.length){
      const selectAll=element('label','hosted-inbox-select-all');
      const checkbox=element('input');checkbox.type='checkbox';checkbox.id='server-inbox-select-all';
      selectAll.append(checkbox,element('span',null,'Выбрать новые на этой странице'));
      checkbox.addEventListener('change',()=>{
        for(const lead of selectable){
          if(checkbox.checked)inboxSelected.add(lead.submission_id);
          else inboxSelected.delete(lead.submission_id);
        }
        for(const input of leadsList.querySelectorAll('input[data-inbox-id]'))input.checked=checkbox.checked;
        leadsBulk.disabled=!inboxSelected.size;
      });
      leadsList.append(selectAll);
    }
    for(const lead of response.submissions){
      const wrap=element('article','hosted-lead');
      wrap.dataset.submissionId=lead.submission_id;
      if(lead.status==='new'){
        const tick=element('input');tick.type='checkbox';tick.dataset.inboxId=lead.submission_id;
        tick.setAttribute('aria-label','Выбрать заявку '+lead.name);
        tick.addEventListener('change',()=>{
          if(tick.checked)inboxSelected.add(lead.submission_id);
          else inboxSelected.delete(lead.submission_id);
          const all=leadsList.querySelector('#server-inbox-select-all');
          if(all)all.checked=selectable.every(x=>inboxSelected.has(x.submission_id));
          leadsBulk.disabled=!inboxSelected.size;
        });
        wrap.append(tick);
      }
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
          await loadSubmissions();notice('Заявка отмечена обработанной.');
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
  videoInput.addEventListener('change',()=>{
    const file=videoInput.files?.[0];videoInput.value='';
    if(!file)return;
    safe(async()=>{
      if(!state.siteId||!canEdit())throw Error('Недостаточно прав на загрузку видео');
      if(editor.isDirty())throw Error('Сначала сохраните черновик');
      if(file.type!=='video/mp4'||file.size<100||file.size>16777216)
        throw Error('Требуется MP4 до 16 МБ');
      const alt=prompt('Название и доступное описание видео',file.name.replace(/\.mp4$/i,''));
      if(alt===null)return;
      if(!alt.trim()||alt.length>200)throw Error('Описание видео обязательно (до 200 символов)');
      const bytes=await file.arrayBuffer();
      const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
        .map(b=>b.toString(16).padStart(2,'0')).join('');
      const binary=new Uint8Array(bytes);
      const encoded=chunk=>{
        let text='';
        for(let i=0;i<chunk.length;i+=0x8000)
          text+=String.fromCharCode(...chunk.subarray(i,i+0x8000));
        return btoa(text);
      };
      const prefix='/api/sites/'+encodeURIComponent(state.siteId);
      let response;
      if(file.size<=1500000){
        response=await api(prefix+'/video','POST',
          {base64:encoded(binary),alt,sha256,expectedRevision:state.revision});
      }else{
        const size=524288,total=Math.ceil(binary.length/size);
        const begun=await api(prefix+'/video-uploads/start','POST',
          {alt,bytes:binary.length,sha256,chunks:total,expectedRevision:state.revision});
        const endpoint=prefix+'/video-uploads/'+encodeURIComponent(begun.uploadId);
        try{
          for(let i=0;i<total;i++){
            const part=binary.subarray(i*size,Math.min((i+1)*size,binary.length));
            const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',part)))
              .map(b=>b.toString(16).padStart(2,'0')).join('');
            await api(endpoint+'/chunk','POST',{index:i,base64:encoded(part),sha256:digest});
            if(i%4===0||i===total-1)
              notice('Загрузка MP4: '+(i+1)+'/'+total+' частей');
          }
          response=await api(endpoint+'/finish','POST',{});
        }catch(error){
          await api(endpoint+'/cancel','POST',{}).catch(()=>{});
          throw error;
        }
      }
      if(response.sha256!==sha256)throw Error('Серверная SHA256 видео не совпадает');
      selectSite(response);await refreshSites();await loadHistory();
      notice('MP4 добавлен в библиотеку. Привяжите его к видеоэлементу композиции; публикация отдельно.');
    });
  });
  const previewData=new Map(),loadingMedia=new Set();
  function videoUrl(assetId){
    if(!state.authorized||!state.siteId)return null;
    const asset=editor.getSite().assets.find(a=>a.id===assetId&&a.mime==='video/mp4');
    if(!asset)return null;
    const key=state.siteId+':'+assetId;
    if(previewData.has(key))return previewData.get(key);
    if(loadingMedia.has(key))return null;
    loadingMedia.add(key);
    fetch('/api/sites/'+encodeURIComponent(state.siteId)+'/media/'+encodeURIComponent(assetId),
      {credentials:'same-origin',cache:'no-store'})
      .then(async result=>{
        if(!result.ok||result.headers.get('content-type')!=='video/mp4')
          throw Error('Приватное видео недоступно');
        const blob=await result.blob();
        if(blob.size>16777216||blob.size<100)throw Error('Превышен размер видеопревью');
        return new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(String(reader.result));
          reader.onerror=()=>reject(Error('Невозможно прочитать MP4'));reader.readAsDataURL(blob);
        });
      })
      .then(uri=>{
        if(!/^data:video\/mp4;base64,[A-Za-z0-9+/=]+$/.test(uri))
          throw Error('Непроверенный формат видеопревью');
        previewData.set(key,uri);
        if(state.siteId+':'+assetId===key)editor.refreshPreview();
      })
      .catch(error=>{previewData.set(key,'');notice(error.message,true);})
      .finally(()=>loadingMedia.delete(key));
    return null;
  }
  function previewUrl(assetId){
    if(!state.authorized||!state.siteId)return null;
    const requestedAssetId=assetId;
    // Studio tablet/phone preview retrieves actual stored source bytes for
    // that breakpoint. PHP and static visitors use normal browser srcset.
    const asset=editor.getSite().assets.find(a=>a.id===assetId);
    if(asset?.variants?.length){
      const bp=document.querySelector('.device.active')?.dataset.bp||'desktop';
      const target=({mobile:360,tablet:720,desktop:1200})[bp]||1200;
      const candidates=[...asset.variants];
      // Keep the processed original in the preview candidate set: the nearest
      // available derivative can be narrower than the actual source (e.g. 900px).
      if(Number.isInteger(asset.width)&&asset.width>0)candidates.push({id:asset.id,width:asset.width});
      const sorted=candidates.sort((a,b)=>a.width-b.width);
      assetId=(sorted.filter(v=>v.width<=target).at(-1)||sorted[0]).id;
    }
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
        if(state.siteId+':'+assetId===key){
          editor.refreshPreview();
          window.dispatchEvent(new CustomEvent('stage3-media-ready',{detail:{assetId:requestedAssetId}}));
        }
      })
      .catch(error=>{previewData.set(key,'');notice(error.message,true);})
      .finally(()=>loadingMedia.delete(key));
    return null;
  }
  function mediaUses(site,assetId){
    const locations=[];
    for(const page of site.pages)for(const section of page.sections){
      for(const field of [...section.elements,...(section.items||[])])
        if(field.values['content.media']===assetId)
          locations.push(page.title+' · '+section.component);
      const walk=node=>{
        if((node.type==='image'||node.type==='video')&&node.assetId===assetId)
          locations.push(page.title+' · дизайн-композиция · '+node.id);
        if(node.type==='video'&&node.posterAssetId===assetId)
          locations.push(page.title+' · обложка видео · '+node.id);
        for(const child of node.children||[])walk(child);
      };
      for(const node of section.designGraph?.nodes||[])walk(node);
    }
    return locations;
  }
  function editLibraryAsset(command){
    if(!canEdit())throw Error('Изменение медиабиблиотеки запрещено этой роли или при паузе');
    if(!state.siteId)throw Error('Сначала откройте сайт');
    editor.assetAction(command);drawMedia();drawStatus();
    notice('Медиабиблиотека изменена в черновике. Сохраните и опубликуйте отдельно.');
  }
  function drawMedia(){
    mediaList.replaceChildren();
    // Media controls must not clear leads, alerts, or unrelated workflow state.
    const assets=editor.getSite().assets;
    if(!state.siteId||!assets.length){
      mediaList.append(element('small',null,'Медиафайлов пока нет.'));return;
    }
    const site=editor.getSite();
    const search=element('input','control');search.type='search';search.id='server-media-search';
    search.placeholder='Найти медиафайл или описание';search.setAttribute('aria-label','Поиск в медиабиблиотеке');
    const entries=element('div','hosted-media-entries');entries.id='server-media-entries';
    mediaList.append(search,entries);
    const render=()=>{
      entries.replaceChildren();
      const query=search.value.toLocaleLowerCase().trim();
      for(const asset of assets.filter(a=>(a.id+' '+a.alt).toLocaleLowerCase().includes(query))){
        const row=element('div','hosted-media-item');
        row.dataset.assetId=asset.id;
        const photo=asset.mime==='video/mp4'?element('span','hosted-video-symbol','▶ MP4'):element('img');
        if(asset.mime!=='video/mp4'){
          photo.src='/api/sites/'+encodeURIComponent(state.siteId)+'/media/'+encodeURIComponent(asset.id);
          photo.alt=asset.alt;photo.loading='lazy';photo.width=65;photo.height=55;
        }
        const uses=mediaUses(site,asset.id);
        const desc=element('div','hosted-media-description');
        desc.append(element('strong',null,asset.alt||'Декоративное изображение (alt пустой)'));
        desc.append(element('small',null,uses.length+' привязок · '+asset.mime+' · '+(asset.variants?.length||0)+' responsive-размеров'));
        if(uses.length){
          const details=element('details','hosted-media-references');
          const summary=element('summary',null,'Где используется');
          details.append(summary);
          for(const place of uses.slice(0,12))details.append(element('small',null,place));
          if(uses.length>12)details.append(element('small',null,'Ещё привязок: '+(uses.length-12)));
          desc.append(details);
        }
        const actions=element('div','hosted-media-actions');
        const rename=action('Изменить alt','',()=>safe(async()=>{
          const alt=prompt('Описание изображения для доступности и SEO',asset.alt);
          if(alt===null)return;
          editLibraryAsset({action:'renameAsset',assetId:asset.id,alt});
        }));
        rename.dataset.mediaAction='rename';
        const replace=action('Заменить в блоках','',()=>safe(async()=>{
          if(!uses.length)throw Error('Изображение не используется — замена не требуется');
          const replacement=prompt('Укажите ID другого изображения из этой медиабиблиотеки:\n'+
            assets.filter(a=>a.id!==asset.id&&a.mime===asset.mime).map(a=>a.id+' · '+a.alt).join('\n'),'');
          if(replacement===null)return;
          editLibraryAsset({action:'replaceAsset',assetId:asset.id,targetId:replacement.trim()});
        }));
        replace.dataset.mediaAction='replace';
        const detach=action('Убрать из библиотеки','',()=>safe(async()=>{
          if(!confirm('Исключить изображение из текущего черновика? Старые опубликованные версии и копии останутся доступными.'))return;
          editLibraryAsset({action:'removeAsset',assetId:asset.id});
        }));
        detach.dataset.mediaAction='detach';
        rename.disabled=replace.disabled=detach.disabled=!canEdit();
        actions.append(rename,replace,detach);desc.append(actions);
        row.append(photo,desc);entries.append(row);
      }
      if(!entries.children.length)entries.append(element('small',null,'По запросу изображения не найдены.'));
    };
    search.addEventListener('input',render);render();
  }
  // Same immutable, versioned media pipeline as ordinary uploads. The vetted
  // Workbench engine supplies locally encoded bytes; PHP independently decodes
  // and validates MIME, dimensions and digest before committing the new asset.
  async function uploadProcessed(blob,alt,bind,expectedHash,variants=[]){
    if(state.busy||!state.authorized||!state.siteId||!canEdit())
      throw Error('Загрузка недоступна без входа и прав редактирования');
    if(editor.isDirty())throw Error('Сначала сохраните несохранённый черновик');
    if(!(blob instanceof Blob)||blob.size<20||blob.size>450000||
      !['image/png','image/jpeg','image/webp'].includes(blob.type))
      throw Error('Обработанное изображение должно быть PNG/JPEG/WebP до 450 КБ');
    if(typeof alt!=='string'||alt.length>200||/[\x00-\x1f]/.test(alt))
      throw Error('Описание изображения должно быть до 200 символов без управляющих символов');
    if(typeof expectedHash!=='string'||!/^[a-f0-9]{64}$/.test(expectedHash))
      throw Error('Отсутствует проверенный SHA256');
    const actual=await window.MediaMotionEngine.hash(blob);
    if(actual!==expectedHash)throw Error('Изображение изменилось после обработки');
    if(!Array.isArray(variants)||variants.length>3)throw Error('Неверный набор responsive-изображений');
    const packed=[];
    for(const v of variants){
      if(![360,720,1200].includes(v.width)||!(v.blob instanceof Blob)||v.blob.type!==blob.type||
        v.blob.size>450000||v.blob.size<20||await window.MediaMotionEngine.hash(v.blob)!==v.sha256)
        throw Error('Непроверенный responsive-вариант');
      const data=await new Promise((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));
        reader.onerror=()=>reject(Error('Невозможно прочитать responsive-вариант'));reader.readAsDataURL(v.blob);
      });
      packed.push({width:v.width,base64:data.split(',')[1]||'',sha256:v.sha256});
    }
    const selection=editor.selection();
    const base64=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
      reader.onerror=()=>reject(Error('Не удалось прочитать обработанное изображение'));
      reader.readAsDataURL(blob);
    });
    state.busy=true;drawStatus();
    try{
      const response=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/media','POST',
        {base64,alt,sha256:actual,variants:packed,expectedRevision:state.revision});
      if(response.sha256!==actual){
        // The upload is an immutable server-side revision. Never falsely claim
        // successful linkage if returned bytes do not match the local digest.
        selectSite(response);await refreshSites();await loadHistory();
        throw Error('Сервер вернул несовпадающий SHA256. Новый файл не привязан к блоку.');
      }
      selectSite(response);await refreshSites();await loadHistory();
      let attached=false;
      if(bind)attached=editor.bindMedia(response.asset.id,selection);
      drawMedia();drawStatus();
      notice(attached?
        'Обработанное изображение привязано к блоку в черновике. Нажмите «Сохранить» и отдельно «Опубликовать».':
        'Обработанное изображение загружено. Выберите его в нужном медиаполе. Публикация отдельно.');
      return {asset:response.asset,attached,sha256:response.sha256};
    }catch(err){notice(err.message,true);throw err;}
    finally{state.busy=false;drawStatus();}
  }
  // Private full-content recovery. The archive contains contact data; it never
  // contains accounts, credentials or configuration and is never sent off-origin.
  const backupPanel=element('div','hosted-backups');
  const backupDownload=action('Скачать резервную копию','server-backup-download',()=>safe(async()=>{
    if(!state.siteId)throw Error('Откройте сайт');
    if(isDirty())throw Error('Сначала сохраните правки: архив содержит только серверные данные');
    const archive=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/backup');
    const blob=new Blob([JSON.stringify(archive)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=element('a');
    link.href=url;link.download=state.siteId+'-backup.json';document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice('Скачана копия контента, истории, изображений, шаблонов и заявок. Храните файл приватно.');
  }));
  const backupOpen=action('Восстановить из файла','server-backup-open',()=>{
    clearArchive();backupDialog.showModal();
  });
  const releaseRefresh=action('История публикаций','server-releases-refresh',()=>safe(loadReleases));
  const releaseList=element('div','hosted-releases');releaseList.id='server-releases';
  backupPanel.append(element('strong',null,'Резервные копии и откат'),
    element('small',null,'Архив включает заявки с контактами. Храните его приватно. Учётные записи и секреты в архив не входят.'),
    backupDownload,backupOpen,releaseRefresh,releaseList);
  templatesPanel.after(backupPanel);
  const backupDialog=element('dialog','hosted-backup-dialog');backupDialog.id='server-backup-dialog';
  const backupFile=element('input','control');backupFile.type='file';backupFile.accept='.json,application/json';backupFile.id='server-backup-file';
  const backupTarget=element('input','control');backupTarget.id='server-backup-target';backupTarget.maxLength=80;
  const backupFileLabel=element('label',null,'Файл резервной копии (до 64 МБ)');backupFileLabel.htmlFor=backupFile.id;
  const backupTargetLabel=element('label',null,'ID новой независимой копии сайта');backupTargetLabel.htmlFor=backupTarget.id;
  const backupSummary=element('div','hosted-backup-summary');backupSummary.id='server-backup-summary';backupSummary.setAttribute('aria-live','polite');
  const backupPlan=action('Проверить архив','server-backup-plan',()=>safe(async()=>{
    invalidateArchivePlan();
    const file=backupFile.files?.[0];
    if(!file||file.size<1||file.size>64000000)throw Error('Выберите JSON-архив до 64 МБ');
    const archive=JSON.parse(await file.text()),targetSiteId=backupTarget.value.trim();
    const result=await api('/api/backups/plan','POST',{archive,targetSiteId});
    pendingArchive={archive,targetSiteId,token:result.confirmationToken};
    const p=result.plan;
    backupSummary.replaceChildren(element('strong',null,p.title+' → '+p.targetSiteId),
      element('p',null,'Страниц: '+p.pages+' · Ревизий: '+p.revisions+' · Публикаций: '+p.releases+
        ' · Изображений: '+p.images+' · Шаблонов: '+p.templates+' · Заявок: '+p.submissions),
      element('p',null,'Создан: '+p.createdAt+'. Сохранённый черновик #'+p.revision+
        '. Будет создан новый сайт без публикации. Исходный сайт останется доступен.'),
      element('p',null,'Для публичного восстановления выберите прежнюю публикацию в истории и затем нажмите «Опубликовать».'));
    backupRestore.disabled=false;
  }));
  const backupRestore=action('Создать восстановленную копию','server-backup-restore',()=>safe(async()=>{
    if(!pendingArchive)throw Error('Сначала проверьте архив');
    if(isDirty()&&!confirm('Перейти к восстановленной копии, отбросив несохранённые правки?'))return;
    const p=pendingArchive;
    const restored=await api('/api/backups/restore','POST',{archive:p.archive,targetSiteId:p.targetSiteId,confirmationToken:p.token});
    clearArchive();backupDialog.close();
    selectSite(restored);await refreshSites();await loadHistory();await loadSubmissions();await loadTemplates();
    notice('Копия восстановлена со всей историей. Публикация выполняется отдельной кнопкой.');
  }));
  const backupClose=action('Закрыть','server-backup-close',()=>{clearArchive();backupDialog.close();});
  backupDialog.append(element('h2',null,'Восстановление сайта'),
    element('p',null,'Архив проверяется на сервере до записи. Восстановление создаёт отдельный сайт и сохраняет всю историю, медиа, шаблоны и заявки.'),
    backupFileLabel,backupFile,backupTargetLabel,backupTarget,backupPlan,backupSummary,backupRestore,backupClose);
  document.body.append(backupDialog);
  let pendingArchive=null;
  function invalidateArchivePlan(){pendingArchive=null;backupRestore.disabled=true;backupSummary.replaceChildren();}
  function clearArchive(){invalidateArchivePlan();backupFile.value='';backupTarget.value='site-'+crypto.randomUUID().replace(/-/g,'').slice(0,20);}
  backupFile.addEventListener('change',invalidateArchivePlan);
  backupTarget.addEventListener('input',invalidateArchivePlan);
  backupDialog.addEventListener('cancel',event=>{
    if(state.busy){event.preventDefault();return;}clearArchive();
  });
  async function loadReleases(){
    releaseList.replaceChildren();
    if(!state.siteId||!state.authorized)return;
    const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/releases');
    if(!result.releases.length){releaseList.append(element('small',null,'Публикаций пока нет.'));return;}
    for(const release of result.releases){
      const wrap=element('div','hosted-release');
      wrap.append(element('small',null,'v'+release.version+' · #'+release.sourceRevision+' · '+release.publishedAt));
      wrap.append(action('Вернуть в черновик','',()=>safe(async()=>{
        if(isDirty()&&!confirm('Отбросить несохранённые правки?'))return;
        if(!confirm('Восстановить публикацию v'+release.version+' в новый черновик? Публичный сайт останется прежним до отдельной публикации.'))return;
        const restored=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/restore-release','POST',
          {version:release.version,expectedRevision:state.revision});
        selectSite(restored);await refreshSites();await loadHistory();await loadTemplates();
        notice('Публикация v'+release.version+' возвращена в черновик #'+state.revision+'.');
      })));
      wrap.querySelector('button').disabled=!canEdit();releaseList.append(wrap);
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
      if(response.status===401&&route!=='/api/login'){state.authorized=false;state.principal=null;setGate(true);}
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
    $('save').disabled=!available||!isDirty()||!canEdit();
    $('server-publish').disabled=!available||isDirty()||!canPublish();
    $('server-reload').disabled=!available;
    $('server-open').disabled=state.busy||!state.authorized||!picker.value;
    $('server-site-select').disabled=state.busy||!state.authorized;
    $('server-logout').disabled=state.busy||!state.authorized;
    $('new-site').disabled=state.busy||!isOwner();
    $('compose-site').disabled=state.busy||!isOwner();
    $('import').disabled=state.busy||!isOwner();
    leadsRefresh.disabled=state.busy||!state.authorized||!state.siteId||!canEdit();
    leadsFind.disabled=leadsExport.disabled=state.busy||!state.siteId||!canEdit();
    leadsStatus.disabled=leadsSearch.disabled=state.busy||!state.siteId||!canEdit();
    leadsBulk.disabled=state.busy||!state.siteId||!canEdit()||!inboxSelected.size;
    deliveryPanel.hidden=!isOwner();
    deliverySave.disabled=!available||!isOwner();deliveryRefresh.disabled=!available||!isOwner();
    deliveryRetry.disabled=!available||!isOwner()||!currentDelivery?.retryable;
    deliveryRetryUncertain.disabled=!available||!isOwner()||!currentDelivery?.uncertain;
    acknowledge.disabled=state.busy||!state.authorized||!state.siteId||!canEdit()||unreadCount===0;
    mediaUpload.disabled=!available||isDirty()||!canEdit();
    templatesSave.disabled=!available||isDirty()||!canEdit();
    templatesRefresh.disabled=!available;
    videoUpload.disabled=!available||!canEdit()||isDirty();
    backupDownload.disabled=!available||isDirty()||!isOwner();
    backupOpen.disabled=state.busy||!isOwner();
    releaseRefresh.disabled=!available;
    backupPlan.disabled=state.busy||!state.authorized;
    backupClose.disabled=state.busy;
    backupFile.disabled=state.busy;backupTarget.disabled=state.busy;
    backupRestore.disabled=state.busy||!pendingArchive||!state.authorized;
    $('reset').disabled=!available;
    document.getElementById('fields').inert=!canEdit();
    for(const control of document.querySelectorAll('#cms-site-report [data-editor-write]'))control.disabled=!canEdit();
    for(const control of document.querySelectorAll('#elements .cms-repeat-row .btn, #cms-repeat-add'))control.disabled=!canEdit();
    for(const node of document.querySelectorAll('.structure-tools'))node.inert=!canEdit();
    for(const id of ['undo','redo'])if(!canEdit())$(id).disabled=true;
    templatesList.inert=!canEdit();leadsPanel.hidden=!canEdit();alertsRow.hidden=!canEdit();
    backupDownload.hidden=!isOwner();backupOpen.hidden=!isOwner();
    window.dispatchEvent(new Event('stage3-session'));
    const meta=state.sites.find(s=>s.site_id===state.siteId);
    const published=meta?.published_version?('Опубликовано: v'+meta.published_version):'Пока не опубликован';
    status.textContent=exists?('Черновик #'+state.revision+' · '+published+
      (isDirty()?' · Есть правки':' · Без изменений')+
      (currentLicense()?.paused?' · CMS НА ПАУЗЕ — правки и публикация недоступны':'')):'Выберите сайт или создайте новый';
    publicLink.hidden=!exists||!meta?.published_version;
    if(!publicLink.hidden)publicLink.href='/published/'+encodeURIComponent(state.siteId)+'/';
    $('save').title=isDirty()?'Сохранить новую серверную ревизию':'Все изменения уже сохранены';
  }
  async function safe(fn){
    if(state.busy)return;
    state.busy=true;drawStatus();
    try{return await fn();}catch(e){notice(e.message,true);if(e.status===409&&state.authorized)await refreshSites().catch(()=>{});if(backupDialog.open)backupSummary.replaceChildren(element('p',null,e.message));}
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
    drawVersions();await loadReleases();
  }
  function editorVisible(visible){
    document.querySelector('.center').hidden=!visible;
    document.querySelector('.inspector').hidden=!visible;
  }
  // PHP decodes JSON objects to associative arrays. An empty typed map, such
  // as a newly inserted graph node's styles:{}, round-trips as [] in a PHP
  // response. Restore ONLY known empty Design Graph maps at the trusted API
  // boundary, before strict JS contract validation. Unknown keys and nonempty
  // arrays remain invalid; this never changes the server revision or publish
  // authorization checks.
  function restoreServerGraphMaps(source){
    const site=structuredClone(source);
    const emptyMap=(holder,key)=>{
      if(holder&&Array.isArray(holder[key])&&holder[key].length===0)holder[key]={};
    };
    emptyMap(site,'designTokens');
    if(site.designTokens)for(const key of ['colors','spacing','radii','typography'])
      emptyMap(site.designTokens,key);
    for(const page of site.pages||[])for(const section of page.sections||[]){
      const graph=section.designGraph;
      if(!graph)continue;
      const walk=node=>{
        emptyMap(node,'styles');emptyMap(node,'responsive');emptyMap(node,'states');
        if(node.responsive)for(const mode of ['tablet','mobile'])emptyMap(node.responsive,mode);
        if(node.states)for(const mode of ['hover','focus'])emptyMap(node.states,mode);
        for(const child of node.children||[])walk(child);
      };
      for(const node of graph.nodes||[])walk(node);
    }
    return site;
  }
  function selectSite(result){
    if(state.siteId!==result.site.siteId){previewData.clear();loadingMedia.clear();}
    state.siteId=result.site.siteId;
    editor.replace(restoreServerGraphMaps(result.site));
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
    await loadHistory();await loadSubmissions();await loadTemplates();await loadDeliverySettings();
    notice('Сайт открыт из серверного хранилища. Публикация не выполнялась.');
  }
  async function previewPage(site,path){
    if(!state.authorized||!state.siteId||!Number.isInteger(state.revision))
      throw Error('Войдите и откройте сайт для предпросмотра');
    if(!site||site.siteId!==state.siteId)throw Error('Сайт предпросмотра не совпадает с открытым сайтом');
    const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/preview','POST',
      {site,expectedRevision:state.revision,path});
    if(typeof result.html!=='string'||!result.html.startsWith('<!doctype html>'))
      throw Error('Сервер вернул некорректный предпросмотр');
    return result.html;
  }
  async function save(){
    return safe(async()=>{
      if(!state.siteId)throw Error('Сначала откройте сайт');
      const candidate=editor.getSite();
      const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/save','POST',
        {site:candidate,expectedRevision:state.revision});
      state.revision=result.revision;
      editor.replace(restoreServerGraphMaps(result.site));
      await refreshSites();await loadHistory();
      notice('Черновик сохранён на сервере как ревизия #'+state.revision+'. Публикация отдельно.');
    });
  }
  async function reload(){
    if(!state.siteId)return;
    if(isDirty()&&!confirm('Отменить несохранённые правки и загрузить серверную версию?'))return;
    const id=state.siteId;
    const data=await api('/api/sites/'+encodeURIComponent(id));
    selectSite(data);await refreshSites();await loadHistory();await loadTemplates();
    notice('Загружена текущая серверная ревизия.');
  }
  async function publishSite(){
    if(!state.siteId)throw Error('Нет открытого сайта');
    if(isDirty())throw Error('Сначала сохраните черновик. Публикация не сохраняет правки автоматически.');
    if(!confirm('Опубликовать сохранённую серверную ревизию #'+state.revision+'?'))return;
    const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/publish','POST',
      {expectedRevision:state.revision});
    await refreshSites();await loadReleases();
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
      selectSite(created);await refreshSites();await loadHistory();await loadSubmissions();await loadTemplates();await loadDeliverySettings();
      notice('Создан новый серверный сайт без макета. Ревизия #1; сайт не опубликован.');
    });
  }
  async function importSite(site){
    return safe(async()=>{
      if(isDirty()&&!confirm('Есть несохранённые правки. Импортировать другой сайт?'))return false;
      if(!confirm('Создать серверный сайт из JSON с ID '+site.siteId+'? Публикация не выполняется.'))return false;
      const created=await api('/api/sites','POST',{site});
      selectSite(created);await refreshSites();await loadHistory();await loadSubmissions();await loadTemplates();await loadDeliverySettings();
      notice('JSON импортирован в отдельный серверный сайт. Черновик не опубликован.');
      return true;
    });
  }
  async function logout(){
    if(isDirty()&&!confirm('Выйти без сохранения текущих правок?'))return;
    await api('/api/logout','POST',{});
    clearArchive();backupDialog.close();releaseList.replaceChildren();
    state.authorized=false;state.principal=null;state.csrf=null;state.siteId=null;state.revision=null;
    state.revisions=[];state.sites=[];picker.replaceChildren();
    mediaList.replaceChildren();templatesList.replaceChildren();deliveryReport.replaceChildren();deliveryRecent.replaceChildren();currentDelivery=null;
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
      b.className='version';b.disabled=!canEdit();
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
      state.csrf=data.csrfToken;state.principal=data.principal;state.authorized=true;pass.value='';
      setGate(false);
      await refreshSites();
      if(state.sites.length)await openSite(state.sites[0].site_id);
      else{editorVisible(false);notice('Вход выполнен. Создайте первый сайт.');}
    }catch(err){info.textContent=err.message;state.authorized=false;state.principal=null;setGate(true);}
    finally{state.busy=false;submit.disabled=false;drawStatus();}
  }
  form.addEventListener('submit',signIn);
  picker.addEventListener('change',()=>safe(()=>openSite(picker.value)));
  async function compositionTemplates(){
    if(!state.authorized||!state.siteId||state.busy)throw Error('Откройте сайт перед использованием шаблонов');
    return (await api('/api/sites/'+encodeURIComponent(state.siteId)+'/templates')).templates;
  }
  async function createComposition(site){
    if(!state.authorized||state.busy)throw Error('Сервер занят или требуется вход');
    state.busy=true;drawStatus();
    try{
      const created=await api('/api/sites','POST',{site});
      selectSite(created);await refreshSites();await loadHistory();await loadSubmissions();await loadTemplates();await loadDeliverySettings();
    }finally{state.busy=false;drawStatus();}
  }
  window.Stage3Host=Object.freeze({save,newSite,importSite,reload,drawVersions,onDraw:drawStatus,previewPage,previewUrl,videoUrl,
    api,safe,notice,principal:()=>state.principal,refreshSites:()=>refreshSites(),
    lock:()=>{state.authorized=false;state.principal=null;state.csrf=null;editorVisible(false);setGate(true);},
    compositionTemplates,createComposition,canCompose:()=>isOwner()&&!state.busy,
    canEditStudio:()=>state.authorized&&!state.busy&&Boolean(state.siteId)&&canEdit(),
    canEditMedia:()=>state.authorized&&!state.busy&&Boolean(state.siteId)&&canEdit()&&!editor.isDirty(),
    uploadProcessed});
  $('versions').replaceChildren();
  editorVisible(false);
  state.loading=true;setGate(true);
  (async()=>{
    try{
      const stateResponse=await api('/api/session');
      if(stateResponse.authenticated){
        state.csrf=stateResponse.csrfToken;state.principal=stateResponse.principal;state.authorized=true;setGate(false);
        await refreshSites();
        if(state.sites.length)await safe(()=>openSite(state.sites[0].site_id));
        else notice('Вход действителен. Создайте первый сайт.');
      } else user.focus();
    }catch(err){info.textContent='Сервер недоступен: '+err.message;}
    finally{state.loading=false;drawStatus();}
  })();
})();
