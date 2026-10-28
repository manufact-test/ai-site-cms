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
  const launchReviewButton=action('Проверка сайта','server-launch-review',()=>safe(openLaunchReview));
  row.append(launchReviewButton);
  // Owner-controlled maintenance is independent from editor Save / Publish.
  const operationsButton=action('Доступность сайта','server-operations-open',()=>safe(openOperations));
  row.append(operationsButton);
  // Owner's explicit two-stage check: local storage/render health + actual
  // same-origin public response. Never report an external deployment as tested.
  const connectionButton=action('Проверить подключение','server-connection-open',()=>safe(openConnection));
  row.append(connectionButton);
  const connectionDialog=element('dialog','hosted-backup-dialog');
  connectionDialog.id='server-connection-dialog';
  const connectionSummary=element('div','hosted-backup-summary');
  connectionSummary.id='server-connection-result';
  const connectionRetry=action('Проверить повторно','server-connection-retry',()=>safe(checkConnection));
  const connectionClose=action('Закрыть','server-connection-close',()=>connectionDialog.close());
  connectionDialog.append(element('h2',null,'Проверка подключения CMS'),
    element('p',null,'Проверяет локальную БД, актуальную публикацию и публичный endpoint на том же origin. Не обращается к DNS, внешнему хостингу, домену клиента или другим серверам.'),
    connectionSummary,connectionRetry,connectionClose);
  document.body.append(connectionDialog);
  async function checkConnection(){
    if(!state.siteId||!isOwner())throw Error('Проверка подключения доступна владельцу');
    const siteId=state.siteId;
    connectionSummary.replaceChildren(element('p',null,'Проверка локального выпуска…'));
    const result=await api('/api/sites/'+encodeURIComponent(siteId)+'/connection-check');
    if(!connectionDialog.open||state.siteId!==siteId)return;
    const row=(title,value)=>element('p',null,title+': '+value);
    const details=[
      row('Сайт в базе',result.siteId),
      row('Редакция черновика','#'+result.draftRevision),
      row('Опубликованная версия',result.publishedVersion?'v'+result.publishedVersion:'отсутствует'),
      row('Проверка PHP и медиа',result.localReady?'успешно':'нет публикации'),
      row('Публичный origin',result.publicOriginConfigured?'указан':'не указан')
    ];
    if(result.localReady&&result.publicProbeUrl?.startsWith('/published/'+siteId+'/')){
      try{
        const response=await fetch(result.publicProbeUrl,{method:'GET',cache:'no-store',
          credentials:'same-origin',redirect:'error',
          headers:{Accept:'application/json'}});
        const responseType=response.headers.get('content-type')||'';
        const probe=response.ok&&responseType.includes('application/json')?
          await response.json():null;
        const matching=probe?.format===result.format&&probe.siteId===siteId&&
          probe.publishedVersion===result.publishedVersion;
        details.push(row('Публичный HTTP',response.status+
          (matching?' · сайт подключён, версия совпадает':' · не соответствует ожидаемой версии')));
        if(matching){
          const success=element('strong',null,'Подключение текущей PHP-публикации подтверждено');
          details.unshift(success);
        }else details.unshift(element('strong',null,'Публичное подключение не подтверждено'));
      }catch(error){
        details.unshift(element('strong',null,'Публичный endpoint недоступен'));
        details.push(row('Причина',String(error.message).slice(0,140)));
      }
    }else details.unshift(element('strong',null,'Для проверки требуется первая публикация'));
    details.push(element('small',null,
      'Проверяется только текущий PHP origin. Экспортированный ZIP, Next.js и внешний домен требуют отдельной проверки на своей площадке.'));
    if(connectionDialog.open&&state.siteId===siteId)connectionSummary.replaceChildren(...details);
  }
  async function openConnection(){
    if(!state.siteId||!isOwner())throw Error('Откройте сайт в роли владельца');
    connectionDialog.showModal();
    try{await checkConnection();}catch(error){
      connectionSummary.replaceChildren(element('strong',null,'Не удалось проверить: '+error.message));
    }
  }
  const operationsDialog=element('dialog','hosted-backup-dialog');
  operationsDialog.id='server-operations-dialog';
  const operationsStatus=element('div','hosted-backup-summary');
  operationsStatus.id='server-operations-status';
  const maintenanceToggle=element('input');maintenanceToggle.type='checkbox';maintenanceToggle.id='server-maintenance-enabled';
  const maintenanceRow=element('label','hosted-label','Включить техническое обслуживание (публичные страницы и отправка форм вернут HTTP 503)');
  maintenanceRow.prepend(maintenanceToggle);
  const maintenanceText=element('textarea','control');
  maintenanceText.id='server-maintenance-message';maintenanceText.maxLength=240;maintenanceText.rows=3;
  maintenanceText.placeholder='Мы скоро вернёмся.';
  const maintenanceLabel=element('label','hosted-label','Сообщение посетителю');
  maintenanceLabel.append(maintenanceText);
  const incidents=element('div','hosted-backup-summary');incidents.id='server-operations-incidents';
  const incidentSummary=element('div','hosted-backup-summary');
  incidentSummary.id='server-incidents-summary';
  const incidentFilter=element('select','control');incidentFilter.id='server-incidents-filter';
  for(const [id,label] of [['all','Все типы'],['api_failure','Сбой API'],
    ['collector_failure','Сбор заявок'],['visitor_failure','Публичный сайт']]){
    const opt=element('option',null,label);opt.value=id;incidentFilter.append(opt);
  }
  let loadedIncidents=[];
  const incidentLabels={
    api_failure:'Ошибка CMS API',collector_failure:'Ошибка обработки заявки',
    visitor_failure:'Ошибка публичной страницы'
  };
  function showIncidents(){
    const visible=loadedIncidents.filter(x=>
      incidentFilter.value==='all'||x.kind===incidentFilter.value);
    incidents.replaceChildren(...(visible.length?
      visible.map(x=>element('p',null,
        x.createdAt+' · '+(incidentLabels[x.kind]||x.kind)+' · код '+x.id)):
      [element('p',null,loadedIncidents.length?'В выбранной категории ошибок нет.':
        'Зарегистрированных внутренних ошибок нет.')]));
  }
  incidentFilter.addEventListener('change',showIncidents);
  let operationsRevision=null;
  const operationsApply=action('Применить статус сайта','server-operations-apply',()=>safe(async()=>{
    if(!state.siteId||!isOwner()||operationsRevision===null)throw Error('Откройте диагностику владельца');
    const siteId=state.siteId,enabled=maintenanceToggle.checked;
    if(enabled&&!maintenanceText.value.trim())throw Error('Укажите сообщение посетителям');
    if(!confirm((enabled?'Включить обслуживание':'Отключить обслуживание')+
      ' для '+siteId+'? Изменение сработает сразу, без Save/Publish.'))return;
    const result=await api('/api/sites/'+encodeURIComponent(siteId)+'/operations','POST',{
      expectedRevision:operationsRevision,enabled,message:maintenanceText.value
    });
    operationsRevision=result.maintenance.revision;
    await readOperations(siteId);
    notice(enabled?'Обслуживание включено: посетители увидят HTTP 503.':'Обычная работа опубликованного сайта восстановлена.');
  }));
  const operationsClose=action('Закрыть','server-operations-close',()=>operationsDialog.close());
  operationsDialog.append(element('h2',null,'Доступность и диагностика сайта'),
    element('p',null,'Только владелец. Переключение действует сразу на текущем PHP-сервере и не меняет черновик, историю или публикации. Независимые ZIP-сайты не затрагиваются.'),
    operationsStatus,maintenanceRow,maintenanceLabel,operationsApply,element('h3',null,'Журнал ошибок · сводка и категории'),
    incidentSummary,incidentFilter,incidents,operationsClose);
  document.body.append(operationsDialog);
  async function readOperations(siteId){
    const info=await api('/api/sites/'+encodeURIComponent(siteId)+'/operations');
    if(state.siteId!==siteId||!operationsDialog.open)return;
    operationsRevision=info.maintenance.revision;
    maintenanceToggle.checked=info.maintenance.enabled;
    maintenanceText.value=info.maintenance.message||'';
    operationsStatus.replaceChildren(
      element('strong',null,info.maintenance.enabled?'На обслуживании':'Работает в обычном режиме'),
      element('p',null,'Черновик #'+info.draftRevision+' · публикация: '+(info.publishedVersion?'v'+info.publishedVersion:'нет')+
        ' · страниц: '+info.publishedPages+' · форм: '+info.publishedForms),
      element('p',null,'Публичный origin: '+(info.publicOriginConfigured?'задан':'не задан')+
        ' · секрет сборщика форм: '+(info.collectorConfigured?'задан':'не задан')),
      element('small',null,'Диагностика локальная: сеть, DNS и внешний хостинг не проверяются.')
    );
    const d=info.incidentSummary?.day||{},w=info.incidentSummary?.week||{};
    incidentSummary.replaceChildren(
      element('strong',null,(d.total||0)>0?'За сутки обнаружены ошибки':'За сутки ошибок нет'),
      element('p',null,'Последние 24 часа: '+(d.total||0)+
        ' · CMS '+(d.api||0)+' · заявки '+(d.collector||0)+' · сайт '+(d.visitor||0)),
      element('p',null,'Последние 7 дней: '+(w.total||0)+
        ' · CMS '+(w.api||0)+' · заявки '+(w.collector||0)+' · сайт '+(w.visitor||0)),
      element('small',null,'Хранятся только тип и время сбоя, без IP, содержания заявок, адресов или текста исключений. Не более 100 событий на сайт; ниже — 30 последних.'));
    loadedIncidents=info.incidents||[];
    showIncidents();
  }
  async function openOperations(){
    if(!state.siteId||!isOwner())throw Error('Раздел доступен владельцу сайта');
    operationsRevision=null;operationsDialog.showModal();
    try{await readOperations(state.siteId);}
    catch(error){operationsDialog.close();throw error;}
  }
  operationsDialog.addEventListener('close',()=>{operationsRevision=null;});
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

  // D2 · Published technology release center. Historical releases and capsules
  // are read-only; an unpublished draft is never turned into a live artifact.
  const techOpen=action('Технологические выпуски','server-tech-open',()=>safe(openTechnologyCenter));
  row.append(techOpen);
  const techDialog=element('dialog','hosted-backup-dialog');techDialog.id='server-tech-dialog';
  const techTitle=element('h2',null,'Независимый выпуск сайта');
  const techHint=element('p',null,'Выберите только опубликованную версию. Доступны HTML, PHP, Next Static и Next SSR. '
    +'Скачать пакет можно после проверки. Развёртывания, изменения черновика и автоматической публикации нет.');
  const techField=(id,name)=>{
    const wrap=element('label','hosted-label',name);
    const input=element('input','control');input.id=id;input.type='text';
    wrap.append(input);return [wrap,input];
  };
  const techVersionWrap=element('label','hosted-label','Опубликованная версия');
  const techVersion=element('select','control');techVersion.id='server-tech-version';techVersionWrap.append(techVersion);
  const techTargetWrap=element('label','hosted-label','Технология конечного сайта');
  const techTarget=element('select','control');techTarget.id='server-tech-target';techTargetWrap.append(techTarget);
  for(const [value,name] of [
    ['html','HTML/CSS/JS · готовая статическая папка'],
    ['php','PHP · маршруты и настоящие 301'],
    ['next-static','Next Static · сборка в out/'],
    ['next-ssr','Next SSR · нужен Node.js']
  ]){const o=element('option',null,name);o.value=value;techTarget.append(o);}
  const [techOriginWrap,techOrigin]=techField('server-tech-origin','HTTPS-адрес будущего публичного сайта (необязательно)');
  techOrigin.placeholder='https://example.com';
  const [techCollectorWrap,techCollector]=techField('server-tech-collector',
    'HTTPS-адрес отдельного сборщика форм (обязателен, если есть формы)');
  techCollector.placeholder='https://forms.example.com';
  const techCompare=element('div','hosted-backup-summary');techCompare.id='server-tech-compare';
  const techPlanSummary=element('div','hosted-backup-summary');techPlanSummary.id='server-tech-summary';
  const techActions=element('div','hosted-buttons');
  let techPending=null,techReleases=[],techOpening=false;
  const techInvalidate=()=>{techPending=null;techDownload.disabled=true;techPlanSummary.replaceChildren();};
  const techCompareVersions=async()=>{
    techCompare.replaceChildren();if(!state.siteId||!techReleases.length)return;
    const version=Number(techVersion.value);
    const idx=techReleases.findIndex(r=>r.version===version);
    const older=techReleases[idx+1];
    if(!older){techCompare.append(element('small',null,'Это первая публикация; предыдущего выпуска ещё нет.'));return;}
    const id=state.siteId;
    const data=await api('/api/sites/'+encodeURIComponent(id)+'/technology-export/compare?'+
      new URLSearchParams({from:String(older.version),to:String(version)}));
    if(id!==state.siteId||!techDialog.open||Number(techVersion.value)!==version)return;
    techCompare.append(element('strong',null,
      'Отличия публикации v'+older.version+' → v'+version+' · страниц изменилось: '+data.changes.length));
    for(const row of data.changes.slice(0,20))techCompare.append(element('small',null,
      (row.status==='added'?'Новая':row.status==='removed'?'Удалена':'Изменена')+
      ' · '+(row.to||row.from)+' · '+row.pageId+
      (row.seoChanged?' · SEO':'')+(row.contentChanged?' · содержимое':'')));
    techCompare.append(element('small',null,
      'Медиа: '+(data.assetsChanged?'изменены':'без изменений')+
      ' · редиректы: '+(data.redirectsChanged?'изменены':'без изменений')+
      ' · глобальный стиль: '+(data.themeChanged?'изменён':'без изменений')));
  };
  const techLoad=async()=>{
    techInvalidate();techVersion.replaceChildren();techCompare.replaceChildren();
    const id=state.siteId;
    const data=await api('/api/sites/'+encodeURIComponent(id)+'/technology-export/releases');
    if(id!==state.siteId||!techDialog.open)return;
    techReleases=data.releases;
    for(const r of techReleases){
      const o=element('option',null,'v'+r.version+' · черновик #'+r.sourceRevision+' · '+r.publishedAt);
      o.value=String(r.version);techVersion.append(o);
    }
    if(!techReleases.length)techPlanSummary.append(element('p',null,
      'Публикаций пока нет. Сохраните черновик и опубликуйте сайт отдельно.'));
    techPlan.disabled=!techReleases.length;
    await techCompareVersions();
  };
  const techPlan=action('Проверить независимый выпуск','server-tech-plan',()=>safe(async()=>{
    techInvalidate();
    if(!state.siteId||!canPublish())throw Error('Для независимого выпуска нужны права владельца или издателя');
    const id=state.siteId,version=Number(techVersion.value);
    const result=await api('/api/sites/'+encodeURIComponent(id)+'/technology-export/plan','POST',{
      version,publicOrigin:techOrigin.value.trim()||null,formCollector:techCollector.value.trim()||null
    });
    if(id!==state.siteId||!techDialog.open||version!==Number(techVersion.value))return;
    techPending={siteId:id,version,token:result.confirmationToken};
    const p=result.plan;
    const technology=techTarget.value;
    techPlanSummary.replaceChildren(element('strong',null,'План: публикация v'+p.version),
      element('p',null,'Страниц: '+p.pages+' · медиафайлов: '+p.assets+
        ' · редиректов: '+p.redirects+' · форм: '+p.forms),
      element('p',null,'Исходная ревизия #'+p.sourceRevision+
        ' · сборка '+technology+' · '+(p.draftModified?'Текущий черновик отличается.':'Черновик на исходной ревизии.')),
      element('p',null,'Переносимый JSON содержит только опубликованный HTML и медиа, а не пароли, заявки или базу CMS.'),
      element('small',null,'После скачивания используйте локальную команду build-handoff.cjs для '+technology+
        '. Пакет не устанавливается и не публикуется автоматически.'));
    techDownload.disabled=false;
  }));
  const techDownload=action('Скачать подтверждённый выпуск','server-tech-download',()=>safe(async()=>{
    if(!techPending||techPending.siteId!==state.siteId||techPending.version!==Number(techVersion.value))
      throw Error('Параметры выпуска изменились — проверьте план ещё раз');
    const pending=techPending;techInvalidate();
    const result=await api('/api/sites/'+encodeURIComponent(pending.siteId)+
      '/technology-export/download','POST',{confirmationToken:pending.token});
    if(!result.capsule||result.capsule.version!==pending.version)
      throw Error('Сервер вернул другой опубликованный выпуск');
    const blob=new Blob([JSON.stringify(result.capsule)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    try {
      const a=element('a');
      a.href=url;a.download=pending.siteId+'-published-v'+pending.version+'-handoff.json';
      document.body.append(a);a.click();a.remove();
    }finally{setTimeout(()=>URL.revokeObjectURL(url),1200);}
    notice('Независимый выпуск v'+pending.version+' скачан. Собирайте на изолированном компьютере; публикация отдельно.');
  }));
  techDownload.disabled=true;
  const techClose=action('Закрыть','server-tech-close',()=>techDialog.close());
  techActions.append(techPlan,techDownload,techClose);
  const techLabHelp=element('details','hosted-backup-summary');
  const techLabHeading=element('summary',null,'D3 · Локальная проверка, переключение и откат выпуска');
  const techLabDescription=element('p',null,
    'Скачанный пакет можно безопасно подготовить в отдельном локальном реестре и включать выпуски только в localhost. Это не переключает действующий сайт и не отправляет формы.');
  const techLabCommands=element('pre');
  techLabCommands.style.whiteSpace='pre-wrap';
  techLabCommands.style.overflowWrap='anywhere';
  techLabCommands.textContent=[
    'node stage3/runtime-export/bin/release-manager.cjs init /ABS/new-lab',
    'node stage3/runtime-export/bin/release-manager.cjs stage /ABS/new-lab release-v1 /ABS/downloaded-handoff.json '+techTarget.value,
    'node stage3/runtime-export/bin/release-manager.cjs plan /ABS/new-lab release-v1',
    'node stage3/runtime-export/bin/release-manager.cjs activate /ABS/new-lab TOKEN',
    'node stage3/runtime-export/bin/release-manager.cjs plan-rollback /ABS/new-lab',
    'node stage3/runtime-export/bin/release-manager.cjs rollback /ABS/new-lab TOKEN',
    'php -S 127.0.0.1:8181 -t /ABS/new-lab/public /ABS/new-lab/public/router.php'
  ].join('\n');
  techLabHelp.append(techLabHeading,techLabDescription,techLabCommands);
  techTarget.addEventListener('change',()=>{
    const old=techLabCommands.textContent;
    techLabCommands.textContent=old.replace(/(downloaded-handoff\.json )(?:html|php|next-static|next-ssr)/, '$1'+techTarget.value);
  });
  // D4: direct immutable D2 capsule -> one-command ZIP handoff. This only
  // explains OFFLINE commands; it never runs or exposes deployment credentials.
  // D5: one command for all runtimes. Only Next Static may intentionally
  // download npm packages, and ONLY with an explicit local operator flag.
  const techZipHelp=element('details','hosted-backup-summary');
  techZipHelp.id='server-tech-zip-help';
  const zipHeading=element('summary',null,'D5 · Одна команда: ZIP + аудит + отчёт');
  const zipExplanation=element('p',null,
    'Из JSON создаются ZIP и отчёт .preflight.json. D6 дополнительно проверяет страницы, 301, медиа, приватные файлы и HTTP-ответы через localhost. Никакого деплоя.');
  const zipCommands=element('pre');
  zipCommands.style.whiteSpace='pre-wrap';
  zipCommands.style.overflowWrap='anywhere';
  zipCommands.id='server-tech-zip-commands';
  const zipDisclaimer=element('p',null,
    'Next Static с --allow-npm-install скачивает зависимости npm. D6 выполняется только локально: реальный PHP-router или имитация статического хостинга. Next SSR без Node-сборки HTTP-проверку не проходит. TLS, реальные Apache/Nginx и формы проверяются отдельно на разрешённом стенде.');
  const refreshZipHelp=()=>{
    const name='site-published-v'+techVersion.value+'-handoff.json';
    const command='node stage3/runtime-export/bin/ship.cjs';
    const output='/ABS/new-site-delivery.zip';
    const target=techTarget.value;
    zipCommands.textContent=[
      command+' /ABS/'+name+' '+target+' '+output+
        (target==='next-static'?' --allow-npm-install':'')+
        (target==='next-ssr'?'':' --http-rehearsal'),
      'node stage3/runtime-export/bin/audit-delivery.cjs '+output+' --fail-on-blockers',
      'Отчёт: '+output+'.preflight.json',
      'Production: НЕТ · Одобрение владельца: обязательно'
    ].join('\n');
  };
  for(const field of [techVersion,techTarget])field.addEventListener('change',refreshZipHelp);
  refreshZipHelp();
  techZipHelp.append(zipHeading,zipExplanation,zipCommands,zipDisclaimer);
  techDialog.append(techTitle,techHint,techVersionWrap,techTargetWrap,
    techOriginWrap,techCollectorWrap,techCompare,techPlanSummary,techLabHelp,techZipHelp,techActions);
  document.body.append(techDialog);
  const openTechnologyCenter=async()=>{
    if(techOpening)return;
    if(!state.authorized||!state.siteId)throw Error('Сначала откройте сайт');
    techOpening=true;
    try{
      techInvalidate();techDialog.showModal();await techLoad();
    }finally{techOpening=false;}
  };
  for(const field of [techVersion,techTarget,techOrigin,techCollector])
    field.addEventListener('change',()=>{techInvalidate();
      if(field===techVersion)void techCompareVersions().catch(e=>notice(e.message,true));
    });
  techOrigin.addEventListener('input',techInvalidate);
  techCollector.addEventListener('input',techInvalidate);
  techDialog.addEventListener('close',()=>{techInvalidate();techReleases=[];});

  // Server-only media library: binary bytes never enter document JSON.
  const mediaPanel=element('div','hosted-media');
  const mediaTitle=element('strong',null,'Медиабиблиотека');
  const mediaHint=element('small',null,'PNG/JPEG/WebP до 1 МБ · MP4 до 16 МБ · приватно до публикации');
  const mediaInput=element('input');mediaInput.type='file';mediaInput.id='server-media-file';
  mediaInput.accept='image/png,image/jpeg,image/webp';mediaInput.hidden=true;
  const mediaUpload=action('+ Загрузить изображение','server-media-upload',()=>mediaInput.click());
  const mediaList=element('div','hosted-media-list');mediaList.id='server-media-list';
  const videoInput=element('input');videoInput.type='file';videoInput.id='server-video-file';
  videoInput.accept='video/mp4,.mp4';videoInput.hidden=true;
  const videoUpload=action('+ Загрузить MP4 (до 16 МБ)','server-video-upload',()=>videoInput.click());
  mediaPanel.append(mediaTitle,mediaHint,mediaUpload,mediaInput,videoUpload,videoInput,mediaList);
  toolbar.after(mediaPanel);
  // Auditable site-wide media maintenance. Immutable bytes and all published
  // snapshots survive; an operator previews and applies one bounded draft CAS.
  const mediaWorkOpen=action('Центр медиа: аудит и массовые правки','server-media-work-open',
    ()=>safe(openMediaWork));
  mediaPanel.insertBefore(mediaWorkOpen,mediaList);
  const mediaWorkDialog=element('dialog','hosted-backup-dialog');mediaWorkDialog.id='server-media-work-dialog';
  const mediaWorkSummary=element('div','hosted-backup-summary');mediaWorkSummary.id='server-media-work-summary';
  const mediaWorkRows=element('div','hosted-media-entries');mediaWorkRows.id='server-media-work-rows';
  const mediaWorkPrune=element('input');mediaWorkPrune.type='checkbox';mediaWorkPrune.id='server-media-work-prune';
  const mediaWorkPruneLabel=element('label',null,'Исключить все неиспользуемые файлы из текущего черновика (байты и публикации остаются)');
  mediaWorkPruneLabel.htmlFor=mediaWorkPrune.id;
  let mediaWorkAudit=null,mediaWorkPending=null,mediaWorkOpening=false;
  const invalidateMediaWork=()=>{
    mediaWorkPending=null;mediaWorkApply.disabled=true;mediaWorkSummary.replaceChildren();
  };
  const mediaWorkChanges=()=>{
    if(!mediaWorkAudit)throw Error('Сначала загрузите аудит медиабиблиотеки');
    const replacements=[],altUpdates=[];
    for(const row of mediaWorkRows.querySelectorAll('[data-media-work-id]')){
      const id=row.dataset.mediaWorkId;
      const original=mediaWorkAudit.assets.find(a=>a.id===id);
      const to=row.querySelector('select[data-role="replacement"]').value;
      const alt=row.querySelector('input[data-role="alt"]').value;
      if(to)replacements.push({from:id,to});
      if(alt!==original.alt)altUpdates.push({assetId:id,alt});
    }
    return {replacements,altUpdates,pruneUnused:mediaWorkPrune.checked};
  };
  const loadMediaWork=async()=>{
    invalidateMediaWork();mediaWorkAudit=null;mediaWorkRows.replaceChildren();
    const current=state.siteId;
    if(!current)return;
    const audit=await api('/api/sites/'+encodeURIComponent(current)+'/media-audit');
    if(!mediaWorkDialog.open||state.siteId!==current)return;
    mediaWorkAudit=audit;
    mediaWorkSummary.append(element('p',null,
      'Сохранённый черновик #'+audit.revision+' · файлов '+audit.totalAssets+
      ' · использований '+audit.totalReferences+' · не используются '+audit.unusedAssets));
    mediaWorkPrune.checked=false;
    const toolbar=element('div','hosted-media-work-legend');
    toolbar.append(element('small',null,
      'Alt можно обновить для нескольких файлов. Замена должна быть того же MIME и затронет все блоки, Design Graph, постеры и социальные изображения.'));
    mediaWorkRows.append(toolbar);
    for(const asset of audit.assets){
      const row=element('div','hosted-media-item');row.dataset.mediaWorkId=asset.id;
      const details=element('div','hosted-media-description');
      details.append(element('strong',null,asset.alt||asset.id),
        element('small',null,asset.id+' · '+asset.mime+' · '+asset.count+' привязок · '+asset.variants+' responsive'));
      if(asset.references.length){
        const usages=element('details','hosted-media-references');
        usages.append(element('summary',null,'Показать все использования ('+asset.count+')'));
        for(const ref of asset.references.slice(0,24))
          usages.append(element('small',null,ref.pageTitle+' · '+ref.location+
            (ref.component?' · '+ref.component:'')));
        if(asset.references.length>24)usages.append(element('small',null,
          'Ещё '+(asset.references.length-24)+' использований'));
        details.append(usages);
      }
      const actions=element('div','hosted-media-actions');
      const alt=element('input','control');alt.type='text';alt.maxLength=200;
      alt.value=asset.alt;alt.dataset.role='alt';
      alt.setAttribute('aria-label','Описание '+asset.id);alt.addEventListener('input',invalidateMediaWork);
      const replacement=element('select','control');replacement.dataset.role='replacement';
      replacement.setAttribute('aria-label','Заменить '+asset.id);
      const keep=element('option',null,'Не заменять');keep.value='';replacement.append(keep);
      for(const other of audit.assets.filter(a=>a.id!==asset.id&&a.mime===asset.mime)){
        const option=element('option',null,(other.alt||other.id)+' · '+other.id);
        option.value=other.id;replacement.append(option);
      }
      replacement.addEventListener('change',invalidateMediaWork);
      actions.append(alt,replacement);row.append(details,actions);mediaWorkRows.append(row);
    }
    if(!audit.assets.length)mediaWorkRows.append(element('small',null,
      'Добавьте изображения или видео, чтобы управлять их использованием.'));
  };
  const mediaWorkPlan=action('Проверить пакет изменений','server-media-work-plan',()=>safe(async()=>{
    invalidateMediaWork();
    if(!state.siteId||!canEdit()||editor.isDirty())
      throw Error('Сначала сохраните правки перед массовыми действиями с файлами');
    const changes=mediaWorkChanges(),siteId=state.siteId;
    if(mediaWorkAudit.revision!==state.revision)
      throw Error('Аудит устарел — откройте центр медиа повторно');
    const result=await api('/api/sites/'+encodeURIComponent(siteId)+'/media-maintenance/plan',
      'POST',{changes,expectedRevision:state.revision});
    if(siteId!==state.siteId||editor.isDirty())return;
    const plan=result.plan;
    mediaWorkPending={siteId,revision:state.revision,token:result.confirmationToken};
    mediaWorkSummary.replaceChildren(
      element('strong',null,'План для черновика #'+plan.revision),
      element('p',null,'Изменится привязок: '+plan.referencesUpdated+
        ' · обновится описаний: '+plan.altUpdates.length+
        ' · исключится из текущей библиотеки: '+plan.removedFromDraft.length),
      element('p',null,'Файлов в библиотеке: '+plan.oldAssetCount+' → '+plan.newAssetCount+
        '. Хранимые файлы не удаляются; опубликованные версии не меняются.'),
      element('p',null,'Будет создана ровно одна новая ревизия без публикации.')
    );
    for(const r of plan.replacements)mediaWorkSummary.append(element('small',null,
      r.from+' → '+r.to+' · ссылок '+r.references));
    mediaWorkApply.disabled=false;
  }));
  const mediaWorkApply=action('Применить пакет в черновик','server-media-work-apply',()=>safe(async()=>{
    if(!mediaWorkPending||!state.siteId||mediaWorkPending.siteId!==state.siteId||
      mediaWorkPending.revision!==state.revision||editor.isDirty()||!canEdit())
      throw Error('Черновик изменился — проверьте массовые действия снова');
    const pending=mediaWorkPending;invalidateMediaWork();
    const result=await api('/api/sites/'+encodeURIComponent(pending.siteId)+'/media-maintenance/apply',
      'POST',{confirmationToken:pending.token});
    mediaWorkDialog.close();
    selectSite(result);await refreshSites();await loadHistory();await loadTemplates();
    drawMedia();drawStatus();
    notice('Массовые правки медиабиблиотеки сохранены одной ревизией. Публикация отдельно.');
  }));
  mediaWorkApply.disabled=true;
  const mediaWorkClose=action('Закрыть','server-media-work-close',()=>mediaWorkDialog.close());
  const openMediaWork=async()=>{
    if(mediaWorkOpening)return;
    if(!state.siteId||!canEdit()||editor.isDirty())
      throw Error('Откройте сайт и сохраните правки перед аудитом медиа');
    mediaWorkOpening=true;
    try{invalidateMediaWork();mediaWorkDialog.showModal();await loadMediaWork();}
    finally{mediaWorkOpening=false;}
  };
  mediaWorkPrune.addEventListener('change',invalidateMediaWork);
  mediaWorkDialog.addEventListener('close',()=>{
    invalidateMediaWork();mediaWorkAudit=null;
  });
  mediaWorkDialog.append(element('h2',null,'Центр медиабиблиотеки'),
    element('p',null,'Аудит всех страниц, SEO, адаптивных изображений и Design Graph. Изменения не публикуются автоматически.'),
    mediaWorkRows,mediaWorkPruneLabel,mediaWorkPrune,
    mediaWorkPlan,mediaWorkSummary,mediaWorkApply,mediaWorkClose);
  document.body.append(mediaWorkDialog);
  // Site-wide link inventory and route migration. The plan is a read-only
  // diff; application writes a single new draft and never touches publication.
  const linkOpen=action('Ссылки сайта: аудит и перенос адресов','server-links-open',
    ()=>safe(openLinkWorkbench));
  mediaPanel.insertBefore(linkOpen,mediaList);
  const linkDialog=element('dialog','hosted-backup-dialog');linkDialog.id='server-links-dialog';
  const linkAuditSummary=element('div','hosted-backup-summary');linkAuditSummary.id='server-links-audit';
  const linkPages=element('div','hosted-media-entries');linkPages.id='server-links-pages';
  const linkProblems=element('div','hosted-media-entries');linkProblems.id='server-links-problems';
  const linkFixes=element('textarea','control');linkFixes.id='server-links-repairs';
  linkFixes.rows=4;linkFixes.placeholder='/неверный-адрес/ => /правильная-страница/';
  linkFixes.maxLength=5000;
  const linkRedirect=element('input');linkRedirect.type='checkbox';linkRedirect.id='server-links-redirect';
  linkRedirect.checked=true;
  const linkRedirectLabel=element('label',null,'Оставлять постоянные 301-редиректы со старых адресов');
  linkRedirectLabel.htmlFor=linkRedirect.id;
  const linkPlanSummary=element('div','hosted-backup-summary');linkPlanSummary.id='server-links-plan-summary';
  let currentLinkAudit=null,linkPending=null,linkOpening=false;
  const invalidateLinkPlan=()=>{
    linkPending=null;linkApply.disabled=true;linkPlanSummary.replaceChildren();
  };
  function linkDraftChanges(){
    if(!currentLinkAudit)throw Error('Сначала загрузите аудит ссылок');
    const renames=[];
    for(const input of linkPages.querySelectorAll('input[data-page-id]')){
      const previous=input.dataset.previousPath;
      const value=input.value.trim();
      if(value!==previous)renames.push({pageId:input.dataset.pageId,newPath:value});
    }
    const repairs=[];
    for(const line of linkFixes.value.trim().split(/\r?\n/).filter(Boolean)){
      const pieces=line.split(/\s*=>\s*/);
      if(pieces.length!==2||!pieces[0]||!pieces[1])
        throw Error('Одна строка исправления: /старый-адрес/ => /новая-страница/');
      repairs.push({from:pieces[0].trim(),to:pieces[1].trim()});
    }
    return {renames,repairs,keepRedirects:linkRedirect.checked};
  }
  const linkReload=async()=>{
    invalidateLinkPlan();currentLinkAudit=null;
    linkPages.replaceChildren();linkProblems.replaceChildren();linkAuditSummary.replaceChildren();
    if(!state.siteId)return;
    const id=state.siteId;
    const result=await api('/api/sites/'+encodeURIComponent(id)+'/links/audit');
    if(!linkDialog.open||id!==state.siteId)return;
    currentLinkAudit=result;linkFixes.value='';linkRedirect.checked=true;
    const broken=result.references.filter(x=>x.status==='broken'||x.status==='broken-anchor');
    linkAuditSummary.append(element('strong',null,'Сохранённый черновик #'+result.revision),
      element('p',null,result.pageCount+' страниц · '+result.references.length+
        ' ссылок · '+result.counts.ok+' прямых · '+result.counts.redirect+
        ' через редиректы · '+broken.length+' проблем · '+result.redirects.length+' редиректов'));
    const originals=editor.getSite().pages;
    for(const page of originals){
      const row=element('div','hosted-media-item');
      const label=element('div','hosted-media-description');
      label.append(element('strong',null,page.title),
        element('small',null,page.path+' · '+page.id));
      const path=element('input','control');path.type='text';path.maxLength=240;
      path.dataset.pageId=page.id;path.dataset.previousPath=page.path;path.value=page.path;
      path.disabled=page.path==='/'||!canEdit();
      path.setAttribute('aria-label','Новый URL '+page.title);
      path.addEventListener('input',invalidateLinkPlan);
      row.append(label,path);linkPages.append(row);
    }
    if(!broken.length)linkProblems.append(element('small',null,
      'Битых внутренних ссылок и якорей не найдено.'));
    for(const ref of broken.slice(0,60))
      linkProblems.append(element('small',null,
        ref.pageTitle+' · '+ref.component+' · '+ref.href+' ('+
        (ref.status==='broken-anchor'?'неверный якорь':'нет страницы')+')'));
    if(broken.length>60)linkProblems.append(element('small',null,
      'Остальных проблем: '+(broken.length-60)));
    if(result.redirects.length){
      const redirectDetails=element('details','hosted-media-references');
      redirectDetails.append(element('summary',null,'Текущие редиректы ('+result.redirects.length+')'));
      for(const r of result.redirects)redirectDetails.append(element('small',null,r.from+' → '+r.to));
      linkAuditSummary.append(redirectDetails);
    }
  };
  const linkPlan=action('Проверить миграцию адресов и ссылок','server-links-plan',
    ()=>safe(async()=>{
      invalidateLinkPlan();
      if(!state.siteId||editor.isDirty()||!canEdit())
        throw Error('Сохраните правки перед миграцией ссылок');
      if(!currentLinkAudit||currentLinkAudit.revision!==state.revision)
        throw Error('Аудит устарел — откройте окно ссылок заново');
      const changes=linkDraftChanges(),id=state.siteId;
      const result=await api('/api/sites/'+encodeURIComponent(id)+'/links/plan','POST',
        {changes,expectedRevision:state.revision});
      if(id!==state.siteId||editor.isDirty())return;
      const p=result.plan;
      linkPending={siteId:id,revision:state.revision,token:result.confirmationToken};
      linkPlanSummary.replaceChildren(element('strong',null,'План для черновика #'+p.revision),
        element('p',null,'Переименовать страниц: '+p.renames.length+
          ' · исправить привязок: '+p.linksRewritten+
          ' · добавить 301-редиректов: '+p.redirectsAdded+
          ' · оставшихся проблем со ссылками: '+p.remainingBroken),
        element('p',null,'Одна новая ревизия; старые публикации и адреса действующего сайта не меняются.'));
      for(const r of p.renames)
        linkPlanSummary.append(element('small',null,r.from+' → '+r.to));
      for(const r of p.changes.slice(0,12))
        linkPlanSummary.append(element('small',null,r.before+' → '+r.after));
      linkApply.disabled=false;
    }));
  const linkApply=action('Применить безопасную миграцию','server-links-apply',()=>safe(async()=>{
    const pending=linkPending;
    if(!pending||pending.siteId!==state.siteId||
      pending.revision!==state.revision||editor.isDirty()||!canEdit())
      throw Error('Черновик изменён; проверьте адреса заново');
    invalidateLinkPlan();
    const applied=await api('/api/sites/'+encodeURIComponent(pending.siteId)+'/links/apply',
      'POST',{confirmationToken:pending.token});
    linkDialog.close();selectSite(applied);
    await refreshSites();await loadHistory();await loadTemplates();
    drawStatus();notice('Маршруты и ссылки обновлены одной ревизией. Публикация отдельно.');
  }));
  linkApply.disabled=true;
  const linkClose=action('Закрыть','server-links-close',()=>linkDialog.close());
  const openLinkWorkbench=async()=>{
    if(linkOpening)return;
    if(!state.siteId||editor.isDirty()||!canEdit())
      throw Error('Сохраните черновик и откройте сайт перед аудитом ссылок');
    linkOpening=true;
    try{invalidateLinkPlan();linkDialog.showModal();await linkReload();}
    finally{linkOpening=false;}
  };
  linkFixes.addEventListener('input',invalidateLinkPlan);
  linkRedirect.addEventListener('change',invalidateLinkPlan);
  linkDialog.addEventListener('close',()=>{invalidateLinkPlan();currentLinkAudit=null;});
  const linkFixLabel=element('label',null,
    'Дополнительные массовые исправления ссылок, по одной строке (до 30)');
  linkFixLabel.htmlFor=linkFixes.id;
  linkDialog.append(element('h2',null,'Аудит и перенос адресов сайта'),
    element('p',null,'Переименуйте несколько страниц, исправьте ссылки в секциях и Design Graph, проверьте результат до записи. Главная страница не переименовывается.'),
    linkAuditSummary,element('h3',null,'Адреса страниц'),linkPages,
    element('h3',null,'Проблемные ссылки'),linkProblems,
    linkFixLabel,linkFixes,linkRedirectLabel,linkRedirect,
    linkPlan,linkPlanSummary,linkApply,linkClose);
  document.body.append(linkDialog);
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
  // Cross-site transfer is an explicit, server-side copy. Nothing leaves the
  // authenticated origin; preflight is read-only and Apply creates ONE revision.
  const crossPanel=element('div','hosted-templates');
  const crossOpen=action('Перенести блок с другого сайта','server-cross-open',()=>safe(openCrossSite));
  crossPanel.append(element('strong',null,'Блоки с других сайтов'),
    element('small',null,'Копия наполненного блока с независимыми файлами. Проверка → одно сохранение в черновик; без публикации.'),
    crossOpen);
  templatesPanel.after(crossPanel);
  const crossDialog=element('dialog','hosted-backup-dialog');crossDialog.id='server-cross-dialog';
  const crossFrom=element('select','control');crossFrom.id='server-cross-source';
  const crossSection=element('select','control');crossSection.id='server-cross-section';
  const crossTargetPage=element('select','control');crossTargetPage.id='server-cross-target';
  const crossSummary=element('div','hosted-backup-summary');crossSummary.id='server-cross-summary';
  const crossCheck=action('Проверить перенос','server-cross-plan',()=>safe(async()=>{
    invalidateCross();
    if(!state.siteId||!canEdit()||editor.isDirty())throw Error('Сначала сохраните черновик сайта назначения');
    if(!crossFrom.value||!crossSection.value||!crossTargetPage.value)
      throw Error('Выберите оба сайта, блок и страницу назначения');
    const [sourcePageId,sectionId]=crossSection.value.split('|');
    const destination=state.siteId;
    const result=await api('/api/sites/'+encodeURIComponent(destination)+'/transfer/plan','POST',{
      sourceSiteId:crossFrom.value,sourcePageId,sectionId,targetPageId:crossTargetPage.value,
      expectedSourceRevision:crossSourceRevision,expectedTargetRevision:state.revision
    });
    if(destination!==state.siteId)return;
    crossPending={token:result.confirmationToken,destination,revision:state.revision};
    const plan=result.plan;
    crossSummary.replaceChildren(
      element('strong',null,'Готов к переносу: '+plan.component),
      element('p',null,'Файлы: '+plan.mediaCount+' · вариантов: '+plan.mediaParts+
        ' · объём: '+Math.round(plan.mediaBytes/1024)+' КБ. Новые ID; исходные файлы сохраняются.'),
      element('p',null,'Источник: '+plan.sourceSiteId+' #'+plan.sourceRevision+
        ' → '+plan.targetSiteId+' #'+plan.targetRevision+
        '. После подтверждения создастся новая ревизия черновика без публикации.'),
      element('p',null,'Содержимое: '+(crossPreview||'проверьте выбранный блок в редакторе источника.'))
    );
    if(plan.frozenDesignTokens)
      crossSummary.append(element('p',null,'Локально закреплены значения '+plan.frozenDesignTokens+
        ' дизайн-токенов из источника — глобальная палитра назначения не изменится.'));
    for(const media of plan.mediaManifest||[]){
      crossSummary.append(element('small',null,
        'Файл: '+(media.alt||media.id)+' · '+media.mime+
        ' · SHA256 '+media.sha256.slice(0,12)+'…'+
        (media.responsiveVariants?' · '+media.responsiveVariants+' адаптивных варианта':'') ));
    }
    if(plan.missingTargetLinks.length)
      crossSummary.append(element('p',null,'Проверьте ссылки на отсутствующие страницы назначения: '+
        plan.missingTargetLinks.join(', ')));
    crossApply.disabled=false;
  }));
  const crossApply=action('Скопировать в черновик','server-cross-apply',()=>safe(async()=>{
    if(!crossPending||!state.siteId||state.siteId!==crossPending.destination||
        state.revision!==crossPending.revision||editor.isDirty()||!canEdit())
      throw Error('Черновик изменился. Выполните новую проверку переноса');
    const p=crossPending;
    invalidateCross();
    const saved=await api('/api/sites/'+encodeURIComponent(p.destination)+'/transfer/apply',
      'POST',{confirmationToken:p.token});
    crossDialog.close();
    selectSite(saved);await refreshSites();await loadHistory();await loadTemplates();
    drawMedia();drawStatus();
    notice('Блок и его медиа скопированы в сохранённый черновик. Публикация — отдельно.');
  }));
  crossApply.disabled=true;
  const crossClose=action('Закрыть','server-cross-close',()=>crossDialog.close());
  function invalidateCross(){crossPending=null;crossApply.disabled=true;crossSummary.replaceChildren();}
  let crossPending=null,crossSourceRevision=null,crossPreview='';
  async function loadCrossSource(){
    invalidateCross();crossSection.replaceChildren();crossPreview='';crossSourceRevision=null;
    const sourceId=crossFrom.value;
    if(!sourceId)return;
    const response=await api('/api/sites/'+encodeURIComponent(sourceId));
    if(sourceId!==crossFrom.value||!crossDialog.open)return;
    crossSourceRevision=response.revision;
    for(const page of response.site.pages)for(const section of page.sections){
      const option=element('option',null,page.title+' · '+section.component+' · '+section.id);
      option.value=page.id+'|'+section.id;crossSection.append(option);
    }
    previewCrossSelection(response.site);
    crossSection.onchange=()=>{invalidateCross();previewCrossSelection(response.site);};
  }
  function previewCrossSelection(site){
    const [pageId,id]=crossSection.value.split('|');
    const section=site.pages.find(p=>p.id===pageId)?.sections.find(s=>s.id===id);
    const snippets=[];
    if(section){
      for(const el of [...(section.elements||[]),...(section.items||[])])
        if(typeof el.values?.['content.text']==='string')
          snippets.push(el.values['content.text'].trim());
      const walk=nodes=>{for(const node of nodes||[]){
        if(typeof node.text==='string')snippets.push(node.text.trim());
        walk(node.children);
      }};
      walk(section.designGraph?.nodes);
    }
    crossPreview=snippets.filter(Boolean).slice(0,4).join(' · ').slice(0,360);
  }
  async function openCrossSite(){
    if(!state.siteId||!canEdit())throw Error('Откройте сайт с правами редактирования');
    if(editor.isDirty())throw Error('Сначала сохраните текущие правки черновика');
    invalidateCross();
    crossFrom.replaceChildren();crossTargetPage.replaceChildren();crossSection.replaceChildren();
    for(const site of state.sites.filter(s=>s.site_id!==state.siteId)){
      const option=element('option',null,site.site_id+' · '+(site.title||'Сайт'));
      option.value=site.site_id;crossFrom.append(option);
    }
    for(const page of editor.getSite().pages){
      const option=element('option',null,page.title+' · '+page.path);
      option.value=page.id;crossTargetPage.append(option);
    }
    if(!crossFrom.options.length)throw Error('Для переноса нужен второй доступный сайт');
    crossDialog.showModal();
    await loadCrossSource();
  }
  crossFrom.addEventListener('change',()=>safe(loadCrossSource));
  crossTargetPage.addEventListener('change',invalidateCross);
  crossDialog.addEventListener('close',invalidateCross);
  const crossLabel=(name,input)=>{
    const l=element('label',null,name);l.htmlFor=input.id;return l;
  };
  crossDialog.append(element('h2',null,'Перенос блока между сайтами'),
    element('p',null,'Оба сайта должны быть доступны вам. Весь блок, Design Graph и связанные изображения/видео переносятся без заявок, секретов и публикаций.'),
    crossLabel('Сайт-источник',crossFrom),crossFrom,
    crossLabel('Наполненный блок',crossSection),crossSection,
    crossLabel('Страница назначения',crossTargetPage),crossTargetPage,
    crossCheck,crossSummary,crossApply,crossClose);
  document.body.append(crossDialog);
  // Transfer collections from a separate site without importing customer data,
  // credentials, global theme or published versions. One immutable draft save.
  const kitPanel=element('div','hosted-templates');
  const kitLaunch=action('Копировать страницу или набор блоков','server-kit-open',()=>safe(openKit));
  kitPanel.append(element('strong',null,'Повторное использование наполнения'),
    element('small',null,'Выберите от 1 до 10 секций или целую страницу с SEO и медиа. Изменения остаются черновиком.'),
    kitLaunch);
  crossPanel.after(kitPanel);
  const kitDialog=element('dialog','hosted-backup-dialog');kitDialog.id='server-kit-dialog';
  const kitSource=element('select','control');kitSource.id='server-kit-source';
  const kitSourcePage=element('select','control');kitSourcePage.id='server-kit-source-page';
  const kitMode=element('select','control');kitMode.id='server-kit-mode';
  for(const [value,label] of [['sections','Выбранные блоки'],['page','Целая страница с SEO']]){
    const opt=element('option',null,label);opt.value=value;kitMode.append(opt);
  }
  const kitSelection=element('div','hosted-templates-list');kitSelection.id='server-kit-sections';
  const kitDestPage=element('select','control');kitDestPage.id='server-kit-destination';
  const kitNewPath=element('input','control');kitNewPath.type='text';
  kitNewPath.id='server-kit-new-path';kitNewPath.maxLength=240;kitNewPath.placeholder='/new-page/';
  const kitDestLabel=element('label',null,'Добавить блоки на страницу');kitDestLabel.htmlFor=kitDestPage.id;
  const kitNewPathLabel=element('label',null,'Новый URL страницы');kitNewPathLabel.htmlFor=kitNewPath.id;
  const kitSummary=element('div','hosted-backup-summary');kitSummary.id='server-kit-summary';
  let kitSourceDocument=null,kitSourceRevision=null,kitPending=null,kitOpening=false;
  const kitInvalidate=()=>{kitPending=null;kitApply.disabled=true;kitSummary.replaceChildren();};
  const kitUpdateMode=()=>{
    const page=kitMode.value==='page';
    kitSelection.hidden=page;kitDestPage.hidden=page;kitDestLabel.hidden=page;
    kitNewPath.hidden=!page;kitNewPathLabel.hidden=!page;
    kitInvalidate();
  };
  const kitSelectLabel=(name,input)=>{
    const label=element('label',null,name);label.htmlFor=input.id;return label;
  };
  const kitSectionChoices=()=>{
    kitSelection.replaceChildren();
    const selected=kitSourceDocument?.pages.find(p=>p.id===kitSourcePage.value);
    if(!selected)return;
    for(const section of selected.sections){
      const row=element('label','hosted-template');
      const cb=element('input');cb.type='checkbox';cb.value=section.id;
      cb.addEventListener('change',kitInvalidate);
      row.append(cb,element('span',null,section.component+' · '+section.id));
      kitSelection.append(row);
    }
    kitInvalidate();
    if(selected.path==='/')kitNewPath.value='/imported-page/';
    else kitNewPath.value='/copy'+selected.path;
  };
  const kitLoadPage=()=>{
    kitSourcePage.replaceChildren();
    for(const page of kitSourceDocument?.pages||[]){
      const option=element('option',null,page.title+' · '+page.path);
      option.value=page.id;kitSourcePage.append(option);
    }
    kitSectionChoices();
  };
  const kitLoadSource=async()=>{
    kitInvalidate();kitSourceDocument=null;kitSourceRevision=null;
    kitSourcePage.replaceChildren();kitSelection.replaceChildren();
    const sourceId=kitSource.value;
    if(!sourceId)return;
    const result=await api('/api/sites/'+encodeURIComponent(sourceId));
    if(kitSource.value!==sourceId||!kitDialog.open)return;
    kitSourceDocument=result.site;kitSourceRevision=result.revision;
    kitLoadPage();
  };
  kitSource.addEventListener('change',()=>safe(kitLoadSource));
  kitSourcePage.addEventListener('change',kitSectionChoices);
  kitDestPage.addEventListener('change',kitInvalidate);
  kitNewPath.addEventListener('input',kitInvalidate);
  kitMode.addEventListener('change',kitUpdateMode);
  const kitPayload=()=>{
    const mode=kitMode.value;
    const selected=[...kitSelection.querySelectorAll('input[type="checkbox"]:checked')]
      .map(input=>input.value);
    if(mode==='sections'&&(selected.length<1||selected.length>10))
      throw Error('Выберите 1–10 блоков с исходной страницы');
    if(mode==='page'&&!kitNewPath.value.trim())throw Error('Укажите новый URL страницы');
    return {
      sourceSiteId:kitSource.value,sourcePageId:kitSourcePage.value,mode,
      sectionIds:mode==='sections'?selected:[],
      targetPageId:mode==='sections'?kitDestPage.value:null,
      newPath:mode==='page'?kitNewPath.value.trim():null,
      expectedSourceRevision:kitSourceRevision,expectedTargetRevision:state.revision
    };
  };
  const kitCheck=action('Предварительная проверка','server-kit-plan',()=>safe(async()=>{
    kitInvalidate();
    if(!state.siteId||!canEdit()||editor.isDirty())
      throw Error('Сначала сохраните изменения на сайте назначения');
    const id=state.siteId,request=kitPayload();
    const result=await api('/api/sites/'+encodeURIComponent(id)+'/import/plan','POST',request);
    if(id!==state.siteId||editor.isDirty())return;
    kitPending={token:result.confirmationToken,siteId:id,revision:state.revision};
    const p=result.plan;
    kitSummary.replaceChildren(
      element('strong',null,(p.createsPage?'Новая страница: ':'Набор секций: ')+p.pageTitle),
      element('p',null,'Секций: '+p.sections+' · файлов: '+p.mediaCount+' · адаптивных частей: '+
        p.mediaParts+' · '+Math.round(p.mediaBytes/1024)+' КБ.'),
      element('p',null,'Источник #'+p.sourceRevision+' → получатель #'+p.targetRevision+
        (p.createsPage?' · новый путь '+p.newPath:'')+
        '. Одно сохранение в черновик без публикации.'),
      element('p',null,'Содержимое: '+(p.contentPreview.join(' · ')||'Проверьте выбранные элементы на исходном сайте.'))
    );
    if(p.copiesSEO)kitSummary.append(element('p',null,'SEO и социальные данные страницы будут скопированы. Настройки сайта остаются прежними.'));
    if(p.frozenDesignTokens)kitSummary.append(element('p',null,'Зафиксировано дизайн-токенов: '+p.frozenDesignTokens));
    if(p.missingTargetLinks.length)kitSummary.append(element('p',null,
      'Проверьте внутренние ссылки, которых нет на сайте назначения: '+p.missingTargetLinks.join(', ')));
    for(const media of p.mediaManifest||[])kitSummary.append(element('small',null,
      'Медиа: '+(media.alt||media.id)+' · '+media.mime+' · '+media.sha256.slice(0,12)+'…'));
    kitApply.disabled=false;
  }));
  const kitApply=action('Сохранить копию в черновик','server-kit-apply',()=>safe(async()=>{
    if(!kitPending||!state.siteId||kitPending.siteId!==state.siteId||
        kitPending.revision!==state.revision||editor.isDirty()||!canEdit())
      throw Error('Черновик изменился. Проверьте перенос заново');
    const pending=kitPending;kitInvalidate();
    const saved=await api('/api/sites/'+encodeURIComponent(pending.siteId)+'/import/apply',
      'POST',{confirmationToken:pending.token});
    kitDialog.close();
    selectSite(saved);await refreshSites();await loadHistory();await loadTemplates();
    drawMedia();drawStatus();
    notice(saved.import.createsPage?'Страница с SEO и медиа скопирована в черновик. Публикация отдельно.':
      'Выбранные блоки сохранены одной ревизией. Публикация отдельно.');
  }));
  kitApply.disabled=true;
  const kitClose=action('Закрыть','server-kit-close',()=>kitDialog.close());
  const openKit=async()=>{
    if(kitOpening)return;
    if(!state.siteId||!canEdit())throw Error('Откройте сайт с правами редактирования');
    if(editor.isDirty())throw Error('Сначала сохраните текущие изменения');
    kitOpening=true;
    try{
      kitInvalidate();kitSource.replaceChildren();kitDestPage.replaceChildren();
      for(const site of state.sites.filter(x=>x.site_id!==state.siteId)){
        const opt=element('option',null,site.site_id+' · '+(site.title||'Сайт'));
        opt.value=site.site_id;kitSource.append(opt);
      }
      if(!kitSource.options.length)throw Error('Для переноса требуется ещё один доступный сайт');
      for(const page of editor.getSite().pages){
        const opt=element('option',null,page.title+' · '+page.path);
        opt.value=page.id;kitDestPage.append(opt);
      }
      kitMode.value='sections';kitNewPath.value='/imported-page/';
      kitUpdateMode();kitDialog.showModal();await kitLoadSource();
    }finally{kitOpening=false;}
  };
  kitDialog.addEventListener('close',kitInvalidate);
  kitDialog.append(element('h2',null,'Перенос страниц и наборов блоков'),
    element('p',null,'Два существующих сайта. Приватные формы заявок, права, меню, история и публикации не копируются.'),
    kitSelectLabel('Сайт-источник',kitSource),kitSource,
    kitSelectLabel('Исходная страница',kitSourcePage),kitSourcePage,
    kitSelectLabel('Что копировать',kitMode),kitMode,
    kitSelection,kitDestLabel,kitDestPage,kitNewPathLabel,kitNewPath,
    kitCheck,kitSummary,kitApply,kitClose);
  document.body.append(kitDialog);kitUpdateMode();
  const leadsPanel=element('div','hosted-leads');
  const leadsTitle=element('strong',null,'Заявки сайта');
  leadsTitle.id='server-submission-heading';
  const leadsRefresh=action('Обновить заявки','server-submissions-refresh',()=>safe(loadSubmissions));
  const leadsList=element('div','hosted-leads-list');leadsList.id='server-submissions';
  const leadsPipeline=element('div','hosted-inbox-pipeline');
  leadsPipeline.id='server-inbox-pipeline';
  leadsPipeline.setAttribute('aria-label','Очередь заявок по этапам');
  const leadsTools=element('div','hosted-inbox-tools');
  const leadsStatus=element('select','control');leadsStatus.id='server-inbox-status';
  for(const [value,name] of [['all','Все'],['new','Новые'],['in_progress','В работе'],['reviewed','Обработанные']]){
    const opt=element('option',null,name);opt.value=value;leadsStatus.append(opt);
  }
  leadsStatus.setAttribute('aria-label','Фильтр статуса заявок');
  const leadsPriority=element('select','control');leadsPriority.id='server-inbox-priority';
  leadsPriority.setAttribute('aria-label','Приоритет заявок');
  for(const [value,label] of [['all','Все приоритеты'],['high','Высокий приоритет'],['normal','Обычный']]){
    const option=element('option',null,label);option.value=value;leadsPriority.append(option);
  }
  const leadsSearch=element('input','control');leadsSearch.type='search';leadsSearch.id='server-inbox-search';
  leadsSearch.placeholder='Имя, email или сообщение';leadsSearch.maxLength=120;
  leadsSearch.setAttribute('aria-label','Поиск по заявкам');
  let inboxPage=1,inboxSite=null,inboxSelected=new Set(),inboxVisible=[];
  const leadsFind=action('Найти','server-inbox-find',()=>safe(async()=>{inboxPage=1;await loadSubmissions();}));
  const leadsExport=action('Скачать CSV','server-inbox-export',()=>safe(async()=>{
    if(!state.siteId||!canEdit())throw Error('Нет доступа к заявкам');
    const url='/api/sites/'+encodeURIComponent(state.siteId)+'/submissions/export?'+
      new URLSearchParams({status:leadsStatus.value,q:leadsSearch.value,priority:leadsPriority.value});
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
  const batchActions=element('div','hosted-inbox-batch');batchActions.id='server-inbox-batch-actions';
  const batchStage=element('select','control');batchStage.id='server-inbox-batch-stage';
  batchStage.setAttribute('aria-label','Массовый этап');
  for(const [value,label] of [['keep','Этап — без изменений'],['new','Вернуть в новые'],
    ['in_progress','В работу'],['reviewed','Завершить']]){
    const option=element('option',null,label);option.value=value;batchStage.append(option);
  }
  const batchPriority=element('select','control');batchPriority.id='server-inbox-batch-priority';
  batchPriority.setAttribute('aria-label','Массовый приоритет');
  for(const [value,label] of [['keep','Приоритет — без изменений'],['high','Высокий'],
    ['normal','Обычный']]){
    const option=element('option',null,label);option.value=value;batchPriority.append(option);
  }
  const refreshBatchButtons=()=>{
    const selection=[...inboxSelected];
    const canBulk=selection.length>0&&selection.length<=50&&
      selection.every(id=>inboxVisible.some(row=>row.submission_id===id));
    leadsBulk.disabled=!canBulk||!selection.every(id=>inboxVisible.some(
      row=>row.submission_id===id&&row.status==='new'));
    batchApply.disabled=!canBulk||(batchStage.value==='keep'&&batchPriority.value==='keep');
  };
  const batchApply=action('Применить к выбранным','server-inbox-batch-apply',()=>safe(async()=>{
    if(!state.siteId||!canEdit())throw Error('Нет доступа к рабочей очереди');
    refreshBatchButtons();
    if(batchApply.disabled)throw Error('Выберите до 50 заявок и операцию');
    const chosen=[...inboxSelected].map(id=>{
      const lead=inboxVisible.find(item=>item.submission_id===id);
      if(!lead)throw Error('Выбор заявок устарел — обновите страницу');
      return {id,expectedWorkflowRevision:lead.workflow_revision};
    });
    if(!confirm('Изменить '+chosen.length+' заявок одной операцией? Заметки сохранятся.'))return;
    const currentSite=state.siteId;
    const result=await api('/api/sites/'+encodeURIComponent(currentSite)+'/submissions/bulk-workflow','POST',{
      items:chosen,status:batchStage.value==='keep'?null:batchStage.value,
      priority:batchPriority.value==='keep'?null:batchPriority.value
    });
    if(state.siteId!==currentSite)return;
    batchStage.value='keep';batchPriority.value='keep';
    await loadSubmissions();
    notice('Обновлено: '+result.changed+' из '+result.selected+' заявок. История сохранена.');
  }));
  batchStage.addEventListener('change',refreshBatchButtons);
  batchPriority.addEventListener('change',refreshBatchButtons);
  batchApply.disabled=true;
  const selectionNote=element('small',null,'Выбор только на текущей странице · до 50 заявок · одна операция Undo недоступна');
  batchActions.append(batchStage,batchPriority,batchApply,selectionNote);
  const leadsPageLabel=element('small',null,'Страница 1 из 1');leadsPageLabel.id='server-inbox-page-label';
  const leadsPrev=action('← Назад','server-inbox-prev',()=>safe(async()=>{inboxPage=Math.max(1,inboxPage-1);await loadSubmissions();}));
  const leadsNext=action('Дальше →','server-inbox-next',()=>safe(async()=>{inboxPage++;await loadSubmissions();}));
  const leadsTotals=element('small',null,'');leadsTotals.id='server-inbox-totals';
  const leadsPager=element('div','hosted-inbox-pager');
  leadsPager.append(leadsPrev,leadsPageLabel,leadsNext);
  leadsTools.append(leadsStatus,leadsPriority,leadsSearch,leadsFind,leadsExport,leadsBulk);
  leadsPanel.append(leadsTitle,leadsRefresh,leadsPipeline,leadsTools,batchActions,leadsTotals,leadsList,leadsPager);
  leadsStatus.addEventListener('change',()=>safe(async()=>{inboxPage=1;await loadSubmissions();}));
  leadsPriority.addEventListener('change',()=>safe(async()=>{inboxPage=1;await loadSubmissions();}));
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
  // Private per-form routing, never shipped into visitor HTML or site manifest.
  const routePanel=element('div','hosted-delivery-routes');
  const routeForm=element('select','control');routeForm.id='server-delivery-form-select';
  const routeEmailMode=element('select','control');routeEmailMode.id='server-delivery-form-email-mode';
  const routeTelegramMode=element('select','control');routeTelegramMode.id='server-delivery-form-telegram-mode';
  for(const select of [routeEmailMode,routeTelegramMode]){
    for(const [value,title] of [['inherit','Наследовать сайт'],['off','Не отправлять'],['custom','Свой получатель']]){
      const opt=element('option',null,title);opt.value=value;select.append(opt);
    }
  }
  const routeEmail=element('input','control');routeEmail.type='email';routeEmail.maxLength=254;
  routeEmail.id='server-delivery-form-email';routeEmail.placeholder='team@example.com';
  const routeTelegram=element('input','control');routeTelegram.maxLength=32;
  routeTelegram.id='server-delivery-form-telegram';routeTelegram.placeholder='Числовой ID чата';
  const selectedRoute=()=>currentDelivery?.routes?.find(item=>item.sectionId===routeForm.value);
  const routeSave=action('Сохранить маршрут формы','server-delivery-form-save',()=>safe(async()=>{
    const route=selectedRoute();
    if(!route||!state.siteId)throw Error('Выберите форму сайта');
    if(!deliveryReason.value.trim())throw Error('Укажите причину изменения маршрута');
    const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/delivery/routes','POST',{
      sectionId:route.sectionId,emailMode:routeEmailMode.value,
      emailRecipient:routeEmailMode.value==='custom'?routeEmail.value.trim():'',
      telegramMode:routeTelegramMode.value,
      telegramChatId:routeTelegramMode.value==='custom'?routeTelegram.value.trim():'',
      expectedVersion:route.version,reason:deliveryReason.value.trim()
    });
    renderDelivery(result);
    notice('Маршрут формы сохранён. Ранее принятые заявки сохраняют получателя.');
  }));
  const routeModeInputs=()=>{
    routeEmail.disabled=routeEmailMode.value!=='custom';
    routeTelegram.disabled=routeTelegramMode.value!=='custom';
  };
  const refreshRouteInputs=()=>{
    const route=selectedRoute();
    routeEmailMode.value=route?.emailMode||'inherit';
    routeTelegramMode.value=route?.telegramMode||'inherit';
    routeEmail.value=route?.emailRecipient||'';
    routeTelegram.value=route?.telegramChatId||'';
    routeSave.disabled=!route;
    routeModeInputs();
  };
  routeForm.addEventListener('change',refreshRouteInputs);
  routeEmailMode.addEventListener('change',routeModeInputs);
  routeTelegramMode.addEventListener('change',routeModeInputs);
  function renderRouteInputs(data){
    const selected=routeForm.value;
    routeForm.replaceChildren();
    for(const route of data.routes||[]){
      const option=element('option',null,route.label);option.value=route.sectionId;routeForm.append(option);
    }
    if((data.routes||[]).some(route=>route.sectionId===selected))routeForm.value=selected;
    routePanel.hidden=!(data.routes||[]).length;
    refreshRouteInputs();
  }
  routePanel.append(element('strong',null,'Маршруты отдельных форм'),
    deliveryField('Форма',routeForm),deliveryField('Email: режим',routeEmailMode),
    deliveryField('Email получателя',routeEmail),deliveryField('Telegram: режим',routeTelegramMode),
    deliveryField('Telegram чат',routeTelegram),
    element('small',null,'Получатель сохраняется с новой заявкой. Правки маршрута не перенаправляют старую очередь.'),
    routeSave);
  const deliveryActions=element('div','hosted-delivery-actions');
  deliveryActions.append(deliverySave,deliveryRefresh,deliveryRetry,deliveryRetryUncertain);
  deliveryPanel.append(deliveryTitle,deliveryHelp,deliveryReport,deliveryFields,
    deliveryField('Причина / операторская заметка',deliveryReason),deliveryActions,routePanel,deliveryRecent);
  leadsPanel.after(deliveryPanel);
  function renderDelivery(data){
    currentDelivery=data;
    renderRouteInputs(data);
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
    leadsBulk.disabled=true;batchApply.disabled=true;leadsPipeline.replaceChildren();
    if(!state.authorized||!state.siteId||!canEdit()){
      leadsTitle.textContent='Заявки сайта';leadsTotals.textContent='';
      leadsPrev.disabled=true;leadsNext.disabled=true;leadsExport.disabled=true;
      leadsList.append(element('small',null,'Выберите сайт.'));return;
    }
    if(inboxSite!==state.siteId){inboxSite=state.siteId;inboxPage=1;leadsSearch.value='';leadsStatus.value='all';leadsPriority.value='all';}
    const url='/api/sites/'+encodeURIComponent(state.siteId)+'/submissions?'+
      new URLSearchParams({status:leadsStatus.value,q:leadsSearch.value,
        priority:leadsPriority.value,page:String(inboxPage)});
    const response=await api(url);
    await refreshAlerts(); // Inbox refresh and new-lead indicator are one operation.
    inboxPage=response.page;inboxVisible=response.submissions;
    leadsTitle.textContent='Заявки сайта · '+response.counts.all;
    const stages=[['new','Новые'],['in_progress','В работе'],['reviewed','Обработанные']];
    for(const [stage,label] of stages){
      const stats=response.pipeline?.[stage]||{all:response.counts[stage]||0,high:0};
      const tile=action(label+' · '+stats.all+' · срочных '+stats.high,'',()=>safe(async()=>{
        leadsStatus.value=stage;inboxPage=1;await loadSubmissions();
      }));
      tile.className='hosted-inbox-pipeline-tile'+(leadsStatus.value===stage?' is-selected':'');
      tile.dataset.pipelineStage=stage;
      tile.setAttribute('aria-pressed',String(leadsStatus.value===stage));
      leadsPipeline.append(tile);
    }
    leadsTotals.textContent='Новые: '+response.counts.new+' · В работе: '+response.counts.in_progress+
      ' · Обработанные: '+response.counts.reviewed+
      ' · Найдено: '+response.total;
    leadsPageLabel.textContent='Страница '+response.page+' из '+response.pages;
    leadsPrev.disabled=response.page<=1;leadsNext.disabled=response.page>=response.pages;
    leadsExport.disabled=false;
    if(!response.submissions.length){
      leadsList.append(element('small',null,'По фильтру заявок нет.'));return;
    }
    const selectable=response.submissions;
    if(selectable.length){
      const selectAll=element('label','hosted-inbox-select-all');
      const checkbox=element('input');checkbox.type='checkbox';checkbox.id='server-inbox-select-all';
      selectAll.append(checkbox,element('span',null,'Выбрать заявки на этой странице'));
      checkbox.addEventListener('change',()=>{
        for(const lead of selectable){
          if(checkbox.checked)inboxSelected.add(lead.submission_id);
          else inboxSelected.delete(lead.submission_id);
        }
        for(const input of leadsList.querySelectorAll('input[data-inbox-id]'))input.checked=checkbox.checked;
        refreshBatchButtons();
      });
      leadsList.append(selectAll);
    }
    for(const lead of response.submissions){
      const wrap=element('article','hosted-lead');
      wrap.dataset.submissionId=lead.submission_id;
      {
        const tick=element('input');tick.type='checkbox';tick.dataset.inboxId=lead.submission_id;
        tick.setAttribute('aria-label','Выбрать заявку '+lead.name);
        tick.addEventListener('change',()=>{
          if(tick.checked)inboxSelected.add(lead.submission_id);
          else inboxSelected.delete(lead.submission_id);
          const all=leadsList.querySelector('#server-inbox-select-all');
          if(all)all.checked=selectable.every(x=>inboxSelected.has(x.submission_id));
          refreshBatchButtons();
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
      // Workflow is PRIVATE operator metadata, never sent to the published site.
      // The editor requires a typed, optimistic revision (not the site revision).
      const workflow=element('details','hosted-lead-workflow');
      workflow.append(element('summary',null,'Работа с заявкой · '+
        (lead.priority==='high'?'Высокий приоритет':'Обычный')+
        (lead.note?' · есть заметка':'')));
      const inputs=element('div','hosted-lead-workflow-fields');
      const stage=element('select','control');stage.dataset.leadStage=lead.submission_id;
      stage.setAttribute('aria-label','Этап заявки '+lead.name);
      for(const [value,label] of [['new','Новая'],['in_progress','В работе'],['reviewed','Обработана']]){
        const option=element('option',null,label);option.value=value;stage.append(option);
      }stage.value=lead.status;
      const priority=element('select','control');priority.dataset.leadPriority=lead.submission_id;
      priority.setAttribute('aria-label','Приоритет заявки '+lead.name);
      for(const [value,label] of [['normal','Обычный'],['high','Высокий']]){
        const option=element('option',null,label);option.value=value;priority.append(option);
      }priority.value=lead.priority||'normal';
      const note=element('textarea','control');note.dataset.leadNote=lead.submission_id;
      note.setAttribute('aria-label','Приватная заметка заявки '+lead.name);
      note.maxLength=2000;note.rows=3;note.placeholder='Внутренняя заметка. Посетителю не показывается.';
      note.value=lead.note||'';
      const saveWorkflow=action('Сохранить работу','',()=>safe(async()=>{
        const currentSite=state.siteId;
        if(!currentSite||!canEdit())throw Error('Нет прав на управление заявками');
        const result=await api('/api/sites/'+encodeURIComponent(currentSite)+
          '/submissions/'+encodeURIComponent(lead.submission_id)+'/workflow','POST',{
          status:stage.value,priority:priority.value,note:note.value,
          expectedWorkflowRevision:Number(lead.workflow_revision)||0
        });
        if(state.siteId===currentSite){
          // A saved lead should remain observable after moving out of the
          // active status or priority filter; keep unrelated search intact.
          if(leadsStatus.value!=='all'&&leadsStatus.value!==stage.value)
            leadsStatus.value='all';
          if(leadsPriority.value!=='all'&&leadsPriority.value!==priority.value)
            leadsPriority.value='all';
          inboxPage=1;
          await loadSubmissions();
          notice(result.changed?'Заявка обновлена. Изменение добавлено в историю.':'Изменений нет.');
        }
      }));
      saveWorkflow.dataset.leadWorkflowSave=lead.submission_id;
      const history=action('История изменений','',()=>safe(async()=>{
        const currentSite=state.siteId;
        const response=await api('/api/sites/'+encodeURIComponent(currentSite)+
          '/submissions/'+encodeURIComponent(lead.submission_id)+'/history');
        if(state.siteId!==currentSite)return;
        historyBox.replaceChildren();
        if(!response.events.length){
          historyBox.append(element('small',null,'Изменений ещё нет.'));return;
        }
        for(const item of response.events){
          historyBox.append(element('small',null,item.changed_at+' · '+item.operator+
            ' · '+item.from_status+' → '+item.to_status+
            ' · '+item.from_priority+' → '+item.to_priority+
            (Number(item.note_changed)?' · заметка изменена':'')));
        }
      }));
      const historyBox=element('div','hosted-lead-history');
      inputs.append(stage,priority,note,saveWorkflow,history,historyBox);
      workflow.append(inputs);wrap.append(workflow);
      leadsList.append(wrap);
    }
  }

  async function uploadMedia(file){
    return safe(async()=>{
      if(!state.siteId)throw Error('Сначала создайте сайт');
      if(editor.isDirty())throw Error('Сначала сохраните изменения черновика');
      if(!file||file.size<1||file.size>1000000)throw Error('Изображение должно быть не больше 1 МБ');
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
        if(bytes.size>1000000)throw Error('Изображение слишком большое для предпросмотра');
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
        if(node.responsiveMedia&&['tabletAssetId','mobileAssetId'].some(k=>node.responsiveMedia[k]===assetId))
          locations.push(page.title+' · адаптивная фотография · '+node.id);
        if(node.backgroundVideo&&['assetId','posterAssetId','tabletPosterAssetId','mobilePosterAssetId'].some(k=>node.backgroundVideo[k]===assetId))
          locations.push(page.title+' · фоновое видео/обложка · '+node.id);
        if(node.backgroundMedia&&['assetId','tabletAssetId','mobileAssetId'].some(k=>node.backgroundMedia[k]===assetId))
          locations.push(page.title+' · фоновая графика · '+node.id);
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
    if(!(blob instanceof Blob)||blob.size<20||blob.size>1000000||
      !['image/png','image/jpeg','image/webp'].includes(blob.type))
      throw Error('Обработанное изображение должно быть PNG/JPEG/WebP до 1 МБ');
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
        v.blob.size>1000000||v.blob.size<20||await window.MediaMotionEngine.hash(v.blob)!==v.sha256)
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
    notice('Полный архив '+archive.format+': '+archive.payload.approvalEvidence.length+
      ' файлов согласования, история, медиа и заявки. Храните файл приватно.');
  }));
  const backupOpen=action('Восстановить из файла','server-backup-open',()=>{
    clearArchive();backupDialog.showModal();
  });
  const releaseRefresh=action('История публикаций','server-releases-refresh',()=>safe(loadReleases));
  const releaseList=element('div','hosted-releases');releaseList.id='server-releases';
  backupPanel.append(element('strong',null,'Резервные копии и откат'),
    element('small',null,'Полная копия v2 включает закрытый архив макетов, исходников и описаний согласования, историю, изображения и заявки с контактами. Храните файл приватно. Учётные записи и секреты не экспортируются.'),
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
        ' · Изображений: '+p.images+' · Шаблонов: '+p.templates+' · Заявок: '+p.submissions+
        ' · Файлов согласования: '+p.approvalFiles+' · пакетов: '+p.approvalPackages),
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
    notice('Сайт восстановлен с историей и '+(p.archive.payload.approvalEvidence?.length||0)+
      ' неизменёнными исходниками согласования. Копия НЕ опубликована.');
  }));
  const backupClose=action('Закрыть','server-backup-close',()=>{clearArchive();backupDialog.close();});
  backupDialog.append(element('h2',null,'Восстановление сайта'),
    element('p',null,'Формат v2 сохраняет закрытые исходные материалы согласования. Проверка всех SHA-256 до записи, затем одно транзакционное восстановление. Создаётся новый независимый сайт без публикации; поддерживаются старые архивы v1.'),
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
  // Historical surgery: compare immutable saved snapshots with the current
  // draft, then recover one section or one page. Never roll back other pages.
  const historyPanel=element('div','hosted-backups');historyPanel.id='server-page-history-panel';
  const historyOpen=action('Сравнить и восстановить страницу','server-history-open',
    ()=>safe(openHistoricalRecovery));
  historyPanel.append(element('strong',null,'История отдельных страниц'),
    element('small',null,'Сравнение с черновиком или опубликованной версией. Возврат одного блока, страницы или удалённой страницы без отката сайта.'),
    historyOpen);
  backupPanel.after(historyPanel);
  const historyDialog=element('dialog','hosted-backup-dialog');historyDialog.id='server-history-dialog';
  const historyKind=element('select','control');historyKind.id='server-history-kind';
  for(const [key,label] of [['revision','Сохранённые черновики'],['release','Опубликованные версии']]){
    const option=element('option',null,label);option.value=key;historyKind.append(option);
  }
  const historyNumber=element('select','control');historyNumber.id='server-history-number';
  const historyPage=element('select','control');historyPage.id='server-history-page';
  const historyMode=element('select','control');historyMode.id='server-history-mode';
  for(const [key,label] of [['section','Один блок'],['page','Страница целиком (контент и SEO)']]){
    const option=element('option',null,label);option.value=key;historyMode.append(option);
  }
  const historySection=element('select','control');historySection.id='server-history-section';
  const historySectionLabel=element('label',null,'Блок из сохранённой версии');
  historySectionLabel.htmlFor=historySection.id;
  const historySummary=element('div','hosted-backup-summary');historySummary.id='server-history-summary';
  let historyCatalog=null,historyPending=null,historyOpening=false;
  const historyInvalidate=()=>{
    historyPending=null;historyApply.disabled=true;historySummary.replaceChildren();
  };
  const historyModes=()=>{
    const pageMode=historyMode.value==='page';
    historySection.hidden=pageMode;historySectionLabel.hidden=pageMode;
    historyInvalidate();
  };
  const historyUpdateSections=()=>{
    historySection.replaceChildren();
    const original=historyCatalog?.pages.find(p=>p.id===historyPage.value);
    for(const section of original?.sections||[]){
      const option=element('option',null,section.component+' · '+section.id);
      option.value=section.id;historySection.append(option);
    }
    historyInvalidate();
  };
  const historyUpdateCatalog=async()=>{
    historyCatalog=null;historyInvalidate();
    historyPage.replaceChildren();historySection.replaceChildren();
    if(!state.siteId||!historyNumber.value)return;
    const target=state.siteId,kind=historyKind.value,num=historyNumber.value;
    const data=await api('/api/sites/'+encodeURIComponent(target)+'/history/catalog?'+
      new URLSearchParams({kind,number:num}));
    if(!historyDialog.open||target!==state.siteId||historyKind.value!==kind||
      historyNumber.value!==num)return;
    historyCatalog=data;
    for(const original of data.pages){
      const option=element('option',null,original.title+' · '+original.path+
        (editor.getSite().pages.some(p=>p.id===original.id)?'':' · удалена в текущем черновике'));
      option.value=original.id;historyPage.append(option);
    }
    historyUpdateSections();
  };
  const historyUpdateNumbers=async()=>{
    historyNumber.replaceChildren();historyInvalidate();
    if(!state.siteId)return;
    const items=historyKind.value==='revision'
      ?state.revisions.map(v=>({id:Number(v.revision),label:'Черновик #'+v.revision+' · '+v.created_at}))
      :(await api('/api/sites/'+encodeURIComponent(state.siteId)+'/releases')).releases
        .map(v=>({id:Number(v.version),label:'Публикация v'+v.version+' · '+v.publishedAt}));
    for(const row of items){
      const option=element('option',null,row.label);
      option.value=String(row.id);historyNumber.append(option);
    }
    await historyUpdateCatalog();
  };
  historyKind.addEventListener('change',()=>safe(historyUpdateNumbers));
  historyNumber.addEventListener('change',()=>safe(historyUpdateCatalog));
  historyPage.addEventListener('change',historyUpdateSections);
  historySection.addEventListener('change',historyInvalidate);
  historyMode.addEventListener('change',historyModes);
  const historyPlan=action('Сравнить с текущим черновиком','server-history-plan',()=>safe(async()=>{
    historyInvalidate();
    if(!canEdit()||!state.siteId||isDirty())
      throw Error('Сначала сохраните текущие правки черновика');
    if(!historyCatalog)throw Error('Выберите сохранённую версию');
    if(historyMode.value==='section'&&!historySection.value)
      throw Error('В выбранной странице нет доступных блоков');
    const target=state.siteId,body={
      historyKind:historyKind.value,historyNumber:Number(historyNumber.value),
      pageId:historyPage.value,mode:historyMode.value,
      sectionId:historyMode.value==='section'?historySection.value:null,
      expectedRevision:state.revision
    };
    const result=await api('/api/sites/'+encodeURIComponent(target)+'/history/plan','POST',body);
    if(target!==state.siteId||isDirty())return;
    const plan=result.plan;
    historyPending={token:result.confirmationToken,siteId:target,revision:state.revision};
    const diffs=plan.sectionChanges.slice(0,12).map(r=>r.component+' ('+r.change+')');
    historySummary.replaceChildren(
      element('strong',null,plan.pageTitle+' · '+plan.pagePath),
      element('p',null,(plan.pageRecreated?'Вернётся удалённая страница. ':
        'Адрес и структура меню текущего сайта сохранятся. ')+
        'Восстанавливается '+(plan.mode==='page'?'вся страница':'один блок')+
        ', ревизия '+plan.currentRevision+' → '+(plan.currentRevision+1)+'.'),
      element('p',null,'Изменения по сравнению с '+(plan.historyKind==='release'?
        'публикацией v':'черновиком #')+plan.historyNumber+': '+
        (diffs.join(' · ')||'Контент совпадает с сохранённой версией.')),
      element('p',null,'Возвращаемых файлов в библиотеку: '+plan.addedMediaIds.length+
        ' · дизайн-токенов зафиксировано: '+plan.frozenDesignTokens+
        '. Публичная версия не изменится.'),
      element('p',null,'Содержимое: '+(plan.contentPreview.join(' · ')||'Текстовых фрагментов нет.'))
    );
    historyApply.disabled=false;
  }));
  const historyApply=action('Восстановить только выбранное','server-history-apply',()=>safe(async()=>{
    if(!historyPending||!state.siteId||historyPending.siteId!==state.siteId||
      historyPending.revision!==state.revision||isDirty()||!canEdit())
      throw Error('Текущий черновик изменился. Сравните историю заново');
    const pending=historyPending;historyInvalidate();
    const restored=await api('/api/sites/'+encodeURIComponent(pending.siteId)+'/history/apply',
      'POST',{confirmationToken:pending.token});
    historyDialog.close();
    selectSite(restored);await refreshSites();await loadHistory();await loadTemplates();
    drawMedia();drawStatus();
    notice(restored.recovered.pageRecreated?
      'Удалённая страница восстановлена отдельной ревизией. Публикация — отдельно.':
      'Выбранный контент восстановлен, другие страницы не тронуты. Публикация — отдельно.');
  }));
  historyApply.disabled=true;
  const historyClose=action('Закрыть','server-history-close',()=>historyDialog.close());
  const openHistoricalRecovery=async()=>{
    if(historyOpening)return;
    if(!state.siteId||!canEdit()||isDirty())
      throw Error('Выберите сайт и сохраните все изменения перед работой с историей');
    historyOpening=true;
    try{
      historyInvalidate();historyKind.value='revision';historyMode.value='section';
      historyModes();historyDialog.showModal();await historyUpdateNumbers();
    }finally{historyOpening=false;}
  };
  historyDialog.addEventListener('close',historyInvalidate);
  const labeled=(labelText,control)=>{
    const label=element('label',null,labelText);label.htmlFor=control.id;return label;
  };
  historyDialog.append(element('h2',null,'Выборочное восстановление из истории'),
    element('p',null,'Остальные страницы, адреса и глобальный стиль не откатываются. Сохранённая публикация останется неизменной.'),
    labeled('Источник версии',historyKind),historyKind,
    labeled('Сохранённая версия',historyNumber),historyNumber,
    labeled('Историческая страница',historyPage),historyPage,
    labeled('Объём восстановления',historyMode),historyMode,
    historySectionLabel,historySection,historyPlan,historySummary,historyApply,historyClose);
  document.body.append(historyDialog);historyModes();

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
    for(const button of $('versions').querySelectorAll('.version'))
      button.disabled=!available||!canEdit();
    launchReviewButton.disabled=!available;
    operationsButton.hidden=!isOwner();operationsButton.disabled=!available||!isOwner();
    connectionButton.hidden=!isOwner();connectionButton.disabled=!available||!isOwner();
    techOpen.disabled=!available||!state.authorized;
    const approvedImport=document.getElementById('server-approved-import');
    if(approvedImport)approvedImport.disabled=state.busy||!state.authorized||!isOwner();
    const approvalOpen=document.getElementById('server-approved-vault-open');
    if(approvalOpen)approvalOpen.disabled=state.busy||!state.siteId||!isOwner();
    const approvalAttach=document.getElementById('server-approved-vault-attach');
    if(approvalAttach)approvalAttach.disabled=state.busy||!state.siteId||!isOwner();
    $('server-open').disabled=state.busy||!state.authorized||!picker.value;
    $('server-site-select').disabled=state.busy||!state.authorized;
    $('server-logout').disabled=state.busy||!state.authorized;
    $('new-site').disabled=state.busy||!isOwner();
    $('compose-site').disabled=state.busy||!isOwner();
    $('import').disabled=state.busy||!isOwner();
    leadsRefresh.disabled=state.busy||!state.authorized||!state.siteId||!canEdit();
    leadsFind.disabled=leadsExport.disabled=state.busy||!state.siteId||!canEdit();
    leadsStatus.disabled=leadsSearch.disabled=leadsPriority.disabled=state.busy||!state.siteId||!canEdit();
    leadsBulk.disabled=state.busy||!state.siteId||!canEdit()||!inboxSelected.size||
      ![...inboxSelected].every(id=>inboxVisible.some(lead=>lead.submission_id===id&&lead.status==='new'));
    batchApply.disabled=state.busy||!state.siteId||!canEdit()||!inboxSelected.size||
      (batchStage.value==='keep'&&batchPriority.value==='keep');
    batchStage.disabled=batchPriority.disabled=state.busy||!state.siteId||!canEdit();
    deliveryPanel.hidden=!isOwner();
    deliverySave.disabled=!available||!isOwner();deliveryRefresh.disabled=!available||!isOwner();
    deliveryRetry.disabled=!available||!isOwner()||!currentDelivery?.retryable;
    deliveryRetryUncertain.disabled=!available||!isOwner()||!currentDelivery?.uncertain;
    acknowledge.disabled=state.busy||!state.authorized||!state.siteId||!canEdit()||unreadCount===0;
    mediaUpload.disabled=!available||isDirty()||!canEdit();
    mediaWorkOpen.disabled=!available||isDirty()||!canEdit();
    linkOpen.disabled=!available||isDirty()||!canEdit();
    linkPlan.disabled=!available||!currentLinkAudit||isDirty()||!canEdit();
    linkApply.disabled=state.busy||!linkPending||!available||isDirty()||!canEdit();
    linkFixes.disabled=linkRedirect.disabled=state.busy;
    for(const input of linkPages.querySelectorAll('input'))
      input.disabled=state.busy||input.dataset.previousPath==='/';
    mediaWorkPlan.disabled=state.busy||!mediaWorkAudit||!available||isDirty()||!canEdit();
    mediaWorkApply.disabled=state.busy||!mediaWorkPending||!available||isDirty()||!canEdit();
    mediaWorkPrune.disabled=state.busy;
    for(const ctl of mediaWorkRows.querySelectorAll('input,select'))ctl.disabled=state.busy;
    templatesSave.disabled=!available||isDirty()||!canEdit();
    templatesRefresh.disabled=!available;
    videoUpload.disabled=!available||!canEdit()||isDirty();
    backupDownload.disabled=!available||isDirty()||!isOwner();
    backupOpen.disabled=state.busy||!isOwner();
    releaseRefresh.disabled=!available;
    historyOpen.disabled=!available||isDirty()||!canEdit();
    historyPlan.disabled=!available||isDirty()||!canEdit();
    historyApply.disabled=state.busy||!historyPending||!available||isDirty()||!canEdit();
    for(const control of [historyKind,historyNumber,historyPage,historyMode,historySection,
      crossFrom,crossSection,crossTargetPage,kitSource,kitSourcePage,kitMode,kitDestPage,kitNewPath])
      control.disabled=state.busy;
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
  // Launch review is read-only until the operator deliberately clicks the
  // existing Save or Publish actions. Every preview is the isolated server
  // renderer for the current authenticated draft, never a new publication.
  async function openLaunchReview(){
    if(!state.authorized||!state.siteId||!Number.isInteger(state.revision))
      throw Error('Откройте серверный сайт для проверки');
    const site=editor.getSite();
    const meta=state.sites.find(row=>row.site_id===state.siteId);
    let published=null,publishedError='';
    if(meta?.published_version){
      try{
        const result=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/published-site');
        if(result.site?.siteId!==site.siteId)throw Error('Публикация другого сайта');
        published={...result,site:restoreServerGraphMaps(result.site)};
      }catch(error){publishedError=error.message;}
    }
    // Optional owner-only immutable references. Original approved static images
    // are distinct from public/JS previews; SHA256 binds their actual bytes.
    let approvedReference=null,referenceError='';
    if(isOwner()){
      try{
        const evidence=await api('/api/sites/'+encodeURIComponent(site.siteId)+'/approval-evidence');
        const complete=evidence.packages.filter(row=>row.complete);
        approvedReference=complete.at(-1)||null;
      }catch(error){referenceError=error.message;}
    }
    const byId=new Map((published?.site.pages||[]).map(page=>[page.id,page]));
    const changesFor=(current,prior)=>{
      if(!prior)return ['Новая страница — ещё не опубликована'];
      if(!current)return ['Страница удалена из черновика — пока видна посетителям'];
      const changes=[];
      if(current.title!==prior.title)changes.push('Изменено название страницы');
      if(current.path!==prior.path)changes.push('Изменён URL: '+prior.path+' → '+current.path);
      const stable=value=>JSON.stringify(value,(key,item)=>
        item&&typeof item==='object'&&!Array.isArray(item)?
          Object.fromEntries(Object.keys(item).sort().map(name=>[name,item[name]])):item);
      if(stable(current.seo||{})!==stable(prior.seo||{}))changes.push('Изменены SEO и метаданные');
      if(stable(current.navigation||{})!==stable(prior.navigation||{}))
        changes.push('Изменены настройки меню');
      const oldSections=new Map(prior.sections.map(section=>[section.id,section]));
      const newSections=new Map(current.sections.map(section=>[section.id,section]));
      const added=current.sections.filter(section=>!oldSections.has(section.id)).length;
      const removed=prior.sections.filter(section=>!newSections.has(section.id)).length;
      const altered=current.sections.filter(section=>
        oldSections.has(section.id)&&stable(section)!==stable(oldSections.get(section.id))).length;
      if(added)changes.push('Добавлено блоков: '+added);
      if(removed)changes.push('Удалено блоков: '+removed);
      if(altered)changes.push('Изменено блоков: '+altered);
      if(current.sections.map(x=>x.id).join('|')!==prior.sections.map(x=>x.id).join('|'))
        changes.push('Изменён порядок или состав блоков');
      return changes;
    };
    const comparisonRows=site.pages.map(page=>{
      const prior=byId.get(page.id)||null,changes=published?changesFor(page,prior):[];
      return {page,current:page,prior,changes,status:!published?'unavailable':
        !prior?'added':changes.length?'changed':'unchanged'};
    });
    for(const prior of published?.site.pages||[])if(!site.pages.some(page=>page.id===prior.id)){
      comparisonRows.push({page:prior,current:null,prior,
        changes:changesFor(null,prior),status:'removed'});
    }
    const comparisonTotals=Object.fromEntries(['added','removed','changed','unchanged']
      .map(key=>[key,comparisonRows.filter(row=>row.status===key).length]));
    const globalChanges=[];
    if(published){
      if(site.title!==published.site.title)globalChanges.push('Название сайта');
      if(site.theme!==published.site.theme)globalChanges.push('Тема сайта');
      if(JSON.stringify(site.designTokens||{})!==JSON.stringify(published.site.designTokens||{}))
        globalChanges.push('Дизайн-токены');
      if(JSON.stringify(site.assets)!==JSON.stringify(published.site.assets))
        globalChanges.push('Медиабиблиотека');
    }
    // Same full SDK audit and completeness inventory as the editor.
    // Never replace the authoritative audit with a second simplified scanner.
    const readiness=editor.launchReadiness(),inspected=readiness.audit;
    const allSections=site.pages.flatMap(page=>page.sections);
    const formSections=allSections.filter(section=>section.component==='lead-form-flex');
    const conditionalFields=formSections.flatMap(section=>section.formFields||[])
      .filter(field=>field.when).length;
    const graphNodes=nodes=>nodes.reduce((total,node)=>total+1+
      (node.children?graphNodes(node.children):0),0);
    const totalGraphNodes=allSections.reduce((total,section)=>total+
      (section.designGraph?graphNodes(section.designGraph.nodes):0),0);
    const dialog=element('dialog','hosted-launch-dialog');dialog.id='server-launch-dialog';
    const header=element('div','hosted-launch-header');
    const heading=element('h2',null,'Проверка сайта перед публикацией');
    const explanation=element('p',null,
      'Предпросмотр каждой страницы использует текущий черновик. Сохранение и публикация — отдельные действия; ничего не запускается автоматически.');
    const summary=element('p','hosted-launch-summary',
      site.pages.length+' стр. · '+allSections.length+' блоков · '+totalGraphNodes+
      ' узлов композиции · '+site.assets.length+' медиа · '+formSections.length+
      ' форм ('+conditionalFields+' условных полей) · '+inspected.errors.length+
      ' ошибок SEO/a11y · '+inspected.warnings.length+' рекомендаций · '+
      readiness.attention+' незаполненных/шаблонных полей');
    const revision=element('p','hosted-launch-revision',
      'Черновик #'+state.revision+' · '+(editor.isDirty()?'есть несохранённые изменения':'сохранён')+
      ' · публикация '+(state.sites.find(s=>s.site_id===state.siteId)?.published_version||'отсутствует'));
    const publicationCompare=element('p','hosted-launch-diff-summary');
    publicationCompare.id='server-launch-diff-summary';
    publicationCompare.textContent=published?
      'Сравнение с опубликованной v'+published.version+' (черновик #'+state.revision+'): '+
      comparisonTotals.added+' новых · '+comparisonTotals.removed+' удаляемых · '+
      comparisonTotals.changed+' изменённых · '+comparisonTotals.unchanged+
      ' без изменений'+(globalChanges.length?' · настройки сайта: '+globalChanges.join(', '):''):
      (publishedError?'Сравнение с публикацией недоступно: '+publishedError:
        'Это первая публикация. Все страницы пока доступны только в черновике.');
    const openedRevision=state.revision;
    const reviewedDraft=JSON.stringify(site);
    const launchProgress=element('p','hosted-launch-progress','Проверено страниц: 0/'+site.pages.length);
    const fillActions=element('div','hosted-launch-quick-actions');
    const complete=action('Наполнить весь сайт','server-launch-fill',()=>{
      dialog.close();$('cms-fill-open')?.click();
    });
    const assemble=action('Собрать страницу','server-launch-blueprint',()=>{
      dialog.close();$('cms-blueprint-open')?.click();
    });
    complete.disabled=assemble.disabled=!canEdit();
    fillActions.append(complete,assemble);
    const approvalSummary=element('p','hosted-launch-approval-summary',
      approvedReference?'Исходные утверждённые макеты: '+approvedReference.version+
        ' · SHA-256 '+approvedReference.packageSha.slice(0,16)+'… · проверять вручную':
        (referenceError?'Не удалось прочитать архив: '+referenceError:
          'В CMS нет полного sealed v2 архива макетов для сравнения.'));
    approvalSummary.id='server-launch-approval-summary';
    const archiveLink=action('Материалы согласования','server-launch-approval-open',()=>{
      dialog.close();void safe(openApprovalVault);
    });
    archiveLink.hidden=!isOwner();
    header.append(heading,explanation,summary,revision,publicationCompare,
      approvalSummary,archiveLink,launchProgress,fillActions);
    const body=element('div','hosted-launch-layout');
    const pages=element('div','hosted-launch-pages');pages.id='server-launch-pages';
    const detail=element('div','hosted-launch-detail');
    const pageHeading=element('h3');
    const devices=element('div','hosted-launch-devices');devices.id='server-launch-modes';
    const compareModes=element('div','hosted-launch-compare-modes');
    compareModes.id='server-launch-compare-modes';
    const overlayControls=element('div','hosted-launch-overlay-controls');
    overlayControls.id='server-launch-overlay-controls';
    overlayControls.hidden=true;
    const overlayLabel=element('label',null,'Прозрачность макета: 50%');
    overlayLabel.setAttribute('for','server-launch-overlay-opacity');
    const overlayOpacity=element('input');
    overlayOpacity.id='server-launch-overlay-opacity';
    overlayOpacity.type='range';overlayOpacity.min='0';overlayOpacity.max='100';
    overlayOpacity.step='5';overlayOpacity.value='50';
    overlayOpacity.setAttribute('aria-label','Прозрачность утверждённого макета поверх страницы');
    const setOverlayOpacity=()=>{
      const value=Number(overlayOpacity.value);
      overlayImage.style.opacity=String(value/100);
      overlayLabel.textContent='Непрозрачность макета: '+value+'%';
    };
    overlayOpacity.addEventListener('input',setOverlayOpacity);
    overlayControls.append(overlayLabel,overlayOpacity);
    const previewPanels=element('div','hosted-launch-preview-panels');
    const viewport=element('div','hosted-launch-viewport');
    const frame=element('iframe');frame.id='server-launch-preview';
    frame.setAttribute('title','Проверка черновика страницы');
    // Same authenticated, script-disabled sandbox as the existing page preview:
    // allow same-origin media, but no scripts, forms, popups or navigation.
    frame.setAttribute('sandbox','allow-same-origin');
    frame.setAttribute('referrerpolicy','no-referrer');
    const draftCanvas=element('div','hosted-launch-canvas');
    const overlayImage=element('img','hosted-launch-overlay-image');
    overlayImage.id='server-launch-overlay-image';
    overlayImage.alt='Наложение утверждённого макета поверх PHP-превью';
    overlayImage.hidden=true;
    overlayImage.setAttribute('aria-hidden','true');
    draftCanvas.append(frame,overlayImage);viewport.append(draftCanvas);
    const liveViewport=element('div','hosted-launch-viewport hosted-launch-live-viewport');
    liveViewport.id='server-launch-live-viewport';
    const liveLabel=element('p','hosted-launch-live-label','Опубликованная версия');
    const liveFrame=element('iframe');liveFrame.id='server-launch-live-preview';
    liveFrame.title='Текущая опубликованная страница (без скриптов и отправки форм)';
    liveFrame.setAttribute('sandbox','allow-same-origin');
    liveFrame.setAttribute('referrerpolicy','no-referrer');
    const publishedCanvas=element('div','hosted-launch-canvas');
    publishedCanvas.append(liveFrame);liveViewport.append(publishedCanvas,liveLabel);
    const referenceViewport=element('div','hosted-launch-viewport hosted-launch-reference-viewport');
    referenceViewport.id='server-launch-reference-viewport';
    const referenceLabel=element('p','hosted-launch-live-label',
      'Исходный макет · '+(approvedReference?.version||''));
    const referenceImage=element('img');referenceImage.id='server-launch-reference-image';
    referenceImage.alt='Оригинальный утверждённый статический макет (не сайт)';
    referenceViewport.append(referenceImage,referenceLabel);
    previewPanels.append(viewport,liveViewport,referenceViewport);
    const previewStatus=element('p','hosted-launch-preview-status','');
    previewStatus.id='server-launch-preview-status';
    const issues=element('div','hosted-launch-issues');
    const backlog=element('section','hosted-launch-backlog');
    backlog.id='server-launch-readiness';
    backlog.append(element('h3',null,'Что осталось заполнить'));
    const backlogList=element('div','hosted-launch-backlog-list');
    if(!readiness.issues.length)
      backlogList.append(element('p',null,'Пустых и шаблонных полей не обнаружено. Проверьте содержание и достоверность вручную.'));
    for(const finding of readiness.issues.slice(0,100)){
      const page=site.pages.find(item=>item.id===finding.pageId);
      const row=element('div','hosted-launch-gap');
      row.append(element('span',null,(page?.title||finding.pageId)+' · '+finding.message));
      const fix=action('Исправить','',()=>{
        dialog.close();editor.focusLaunchIssue(finding);
      });
      fix.disabled=!canEdit();
      row.append(fix);backlogList.append(row);
    }
    if(readiness.issues.length>100)
      backlogList.append(element('p',null,'Ещё '+(readiness.issues.length-100)+' замечаний. Закройте часть полей и откройте проверку снова.'));
    backlog.append(backlogList);
    const exportReport=action('Скачать отчёт JSON','server-launch-report',()=>{});
    const footer=element('div','hosted-launch-footer');
    const editPage=action('Редактировать страницу','server-launch-edit',()=>{});
    const quality=action('Все замечания SEO и доступности','server-launch-quality',()=>{
      dialog.close();$('cms-quality-open')?.click();
    });
    const saveDraft=action('Сохранить черновик','server-launch-save',()=>{
      if($('save').disabled)return;
      dialog.close();
      void save().then(()=>{
        // Re-run readiness and reset page sign-offs against the actual saved revision.
        if(saved&&state.siteId===site.siteId&&state.revision!==openedRevision&&
            !editor.isDirty())launchReviewButton.click();
      });
    });
    const publishSaved=action('Опубликовать сохранённый','server-launch-publish',()=>{
      syncActions();
      if(publishSaved.disabled||$('server-publish').disabled)return;
      // Last synchronous check makes page sign-offs unusable for a different
      // site, local edit, replaced server revision or changed publication.
      if(state.siteId!==site.siteId||state.revision!==openedRevision||
          editor.isDirty()||JSON.stringify(editor.getSite())!==reviewedDraft){
        notice('Содержимое или ревизия изменились. Откройте проверку заново.',true);return;
      }
      dialog.close();$('server-publish').click();
    });
    const markReviewed=action('Подтвердить просмотр страницы','server-launch-mark',()=>{});
    const close=action('Закрыть','server-launch-close',()=>dialog.close());
    footer.append(editPage,quality,saveDraft,exportReport,publishSaved,close);
    detail.append(pageHeading,devices,compareModes,overlayControls,previewPanels,previewStatus,issues,markReviewed);
    body.append(pages,detail);
    dialog.append(header,backlog,body,footer);
    document.body.append(dialog);
    let selectedRow=comparisonRows[0],device='desktop',viewMode='draft',request=0;
    const widths={desktop:1200,tablet:780,mobile:390};
    const devicesNeeded=Object.keys(widths),reviewed=new Map(),previewReady=new Set();
    // Each device's own real PHP document must render before sign-off. These
    // observations are diagnostic hints, not visual/pixel-match approval.
    const renderEvidence=new Map(),referenceSeen=new Set();
    const referenceUrls=new Map(),referenceLoads=new Map();
    const referenceKind=(row,mode)=>{
      if(!approvedReference||!row?.current)return null;
      if(row.current.path==='/')return mode;
      return approvedReference.pageReferences?.[row.current.id]?.[mode]||null;
    };
    const signature=(row,mode)=>row?.current?.id+'|'+mode;
    const pageComplete=pageId=>devicesNeeded.every(mode=>reviewed.get(pageId)?.has(mode));
    const completedCount=()=>site.pages.filter(page=>pageComplete(page.id)).length;
    const signedCount=()=>Array.from(reviewed.values()).reduce((total,set)=>total+set.size,0);
    const freshDraft=()=>state.siteId===site.siteId&&state.revision===openedRevision&&
      !editor.isDirty()&&JSON.stringify(editor.getSite())===reviewedDraft;
    const updateReviewed=()=>{
      launchProgress.textContent='Проверено страниц: '+completedCount()+'/'+site.pages.length+
        ' · экранов: '+signedCount()+'/'+(site.pages.length*devicesNeeded.length)+
        (readiness.errors?' · '+readiness.errors+' ошибок SDK-аудита':'')+
        (readiness.attention?' · '+readiness.attention+' незаполненных полей':'');
      for(const control of pages.querySelectorAll('button[data-page-id]')){
        const complete=pageComplete(control.dataset.pageId);
        control.classList.toggle('is-reviewed',complete);
        control.setAttribute('aria-label',(complete?'Просмотрено · ':'Не полностью проверено · ')+control.textContent);
      }
      const marked=reviewed.get(selectedRow?.current?.id)?.has(device);
      const evidence=renderEvidence.get(signature(selectedRow,device));
      markReviewed.textContent=marked?'✓ '+widths[device]+' px проверено':
        'Подтвердить экран '+widths[device]+' px';
      if(evidence?.errors?.length)markReviewed.title=evidence.errors.join(' · ');
      markReviewed.disabled=!selectedRow?.current||marked||
        !previewReady.has(signature(selectedRow,device))||!freshDraft();
      if(!evidence?.errors?.length)markReviewed.title=markReviewed.disabled&&!marked?
        'Дождитесь полной загрузки PHP-страницы и изображений. Сохраните изменения перед подтверждением.':'';
    };
    markReviewed.addEventListener('click',()=>{
      if(markReviewed.disabled||!selectedRow?.current||!freshDraft())return;
      const id=selectedRow.current.id;
      if(!reviewed.has(id))reviewed.set(id,new Set());
      reviewed.get(id).add(device);updateReviewed();syncActions();
    });
    exportReport.addEventListener('click',()=>{
      const report={format:'manufact-launch-review-v1',siteId:site.siteId,
        revision:openedRevision,createdAt:new Date().toISOString(),draftSaved:freshDraft(),
        publicationCompared:published?.version||null,publishedError,
        sdk:{errors:inspected.errors,warnings:inspected.warnings},
        contentGaps:readiness.issues,
        pages:site.pages.map(page=>({id:page.id,path:page.path,title:page.title,
          reviewedDevices:devicesNeeded.filter(mode=>reviewed.get(page.id)?.has(mode)),
          renderChecks:Object.fromEntries(devicesNeeded.map(mode=>[
            mode,renderEvidence.get(page.id+'|'+mode)||null])),
          originalPrototypeComparedAt:devicesNeeded.filter(mode=>
            referenceSeen.has(page.id+'|'+mode)),
          approvedReferenceAvailableAt:devicesNeeded.filter(mode=>
            Boolean(referenceKind({current:page},mode))),
          ready:pageComplete(page.id)})),
        sourceApproval:approvedReference?{
          version:approvedReference.version,packageSha:approvedReference.packageSha,
          complete:approvedReference.complete,
          pageReferenceCount:Object.keys(approvedReference.pageReferences||{}).length+1,
          note:'SHA256 binds archived originals, not client identity or visual approval'
        }:null,
        eligibleForReviewPublish:!publishSaved.disabled};
      const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)+'\\n'],
        {type:'application/json'}));
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download='ai-site-launch-review-'+openedRevision+'.json';
      document.body.append(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    });
    const syncActions=()=>{
      // The launch action itself runs inside safe(), which temporarily marks
      // the global toolbar busy. Use the identical rights/dirty conditions;
      // the actual buttons are checked again when clicked.
      saveDraft.disabled=!state.authorized||!state.siteId||!canEdit()||!editor.isDirty();
      publishSaved.disabled=!state.authorized||!state.siteId||!canPublish()||
        !freshDraft()||readiness.errors>0||completedCount()!==site.pages.length||
        (Boolean(meta?.published_version)&&(!published||!!publishedError));
      publishSaved.title=publishSaved.disabled?
        'Сохраните текущую ревизию, исправьте ошибки, проверьте 3 ширины каждой страницы; публикация всё равно требует подтверждения.':
        'Все страницы просмотрены на ПК, планшете и телефоне. Потребуется отдельное подтверждение';
    };
    const renderViewport=()=>{
      const currentReference=referenceKind(selectedRow,device);
      if(['approved','approved-compare','approved-overlay'].includes(viewMode)&&!currentReference)
        viewMode='draft';
      for(const btn of compareModes.querySelectorAll('button[data-compare-mode]'))
        if(['approved','approved-compare','approved-overlay'].includes(btn.dataset.compareMode))
          btn.disabled=!currentReference;
      previewPanels.classList.toggle('is-comparing',
        viewMode==='compare'||viewMode==='approved-compare');
      viewport.hidden=viewMode==='published'||viewMode==='approved';
      liveViewport.hidden=viewMode!=='compare'&&viewMode!=='published';
      referenceViewport.hidden=viewMode!=='approved'&&viewMode!=='approved-compare';
      overlayControls.hidden=viewMode!=='approved-overlay';
      overlayImage.hidden=viewMode!=='approved-overlay'||!overlayImage.hasAttribute('src');
      if(!referenceViewport.hidden){
        referenceViewport.style.height='620px';
        referenceImage.style.width=Math.min(widths[device],
          Math.max(1,referenceViewport.clientWidth-12))+'px';
      }
      for(const [panel,iframe,canvas] of [[viewport,frame,draftCanvas],
        [liveViewport,liveFrame,publishedCanvas]]){
        if(panel.hidden)continue;
        const width=widths[device],available=panel.clientWidth||700;
        const scale=Math.min(1,Math.max(.25,(available-12)/width));
        // Layout-sized wrapper preserves real scroll extent after scaling:
        // absolute-positioned, transformed iframes alone clipped lower blocks.
        const doc=iframe.contentDocument,root=doc?.documentElement;
        const pageHeight=root?Math.max(root.scrollHeight,doc.body?.scrollHeight||0):900;
        const height=Math.min(60000,Math.max(900,pageHeight));
        iframe.style.width=width+'px';iframe.style.height=height+'px';
        iframe.style.transformOrigin='top left';iframe.style.transform='scale('+scale+')';
        canvas.style.height=Math.ceil(height*scale)+'px';
        if(canvas===draftCanvas){
          overlayImage.style.width=Math.ceil(width*scale)+'px';
          // The screenshot is a full-height raster captured at the exact
          // chosen device width. Both layers scroll in one viewport.
        }
        panel.style.height=Math.min(620,Math.ceil(height*scale))+'px';
      }
      for(const b of compareModes.querySelectorAll('button')){
        b.classList.toggle('primary',b.dataset.compareMode===viewMode);
        b.setAttribute('aria-pressed',String(b.dataset.compareMode===viewMode));
      }
      for(const button of devices.querySelectorAll('button'))
        button.classList.toggle('primary',button.dataset.device===device);
    };
    // The sealed screenshot stays read-only; the browser verifies bytes
    // against the server index before exposing a local, private Blob URL.
    const loadReference=async kind=>{
      if(!approvedReference||!kind||referenceUrls.has(kind))return;
      if(referenceLoads.has(kind))return referenceLoads.get(kind);
      const job=(async()=>{
        const url='/api/sites/'+encodeURIComponent(site.siteId)+'/approval-evidence/'+
          approvedReference.packageSha+'/'+kind;
        const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});
        if(!response.ok)throw Error('Не удалось открыть утверждённый '+kind+' макет');
        const bytes=await response.arrayBuffer();
        if(bytes.byteLength>8000000)throw Error('Слишком большой оригинальный макет');
        const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
          .map(v=>v.toString(16).padStart(2,'0')).join('');
        if(sha!==approvedReference.files[kind]?.sha256)
          throw Error('SHA-256 оригинального макета не совпадает с архивом');
        const magic=new Uint8Array(bytes.slice(0,12));
        const mime=magic[0]===137&&magic[1]===80?'image/png':
          magic[0]===255&&magic[1]===216?'image/jpeg':
          magic[0]===82&&magic[1]===73&&magic[8]===87?'image/webp':null;
        if(!mime)throw Error('Неподдерживаемый формат исходного макета');
        // A slow authenticated fetch may finish after the review was closed.
        // Never retain an orphan object URL in that case.
        if(!dialog.open)return;
        referenceUrls.set(kind,URL.createObjectURL(new Blob([bytes],{type:mime})));
      })();
      referenceLoads.set(kind,job);
      try{await job;}finally{referenceLoads.delete(kind);}
    };
    const showReference=async()=>{
      if(!approvedReference||!['approved','approved-compare','approved-overlay'].includes(viewMode))return;
      const mode=device,row=selectedRow,kind=referenceKind(row,mode);
      referenceImage.removeAttribute('src');
      overlayImage.removeAttribute('src');overlayImage.hidden=true;
      if(!kind){
        referenceLabel.textContent='У этой страницы нет индивидуального утверждённого макета';
        return;
      }
      referenceLabel.textContent='Загружаем оригинальный макет '+mode+'…';
      try{
        await loadReference(kind);
        if(!dialog.open||device!==mode||selectedRow!==row||
          !['approved','approved-compare','approved-overlay'].includes(viewMode))return;
        if(!referenceUrls.has(kind))return;
        if(viewMode==='approved-overlay'){
          overlayImage.src=referenceUrls.get(kind);
          await overlayImage.decode();
        }else{
          referenceImage.src=referenceUrls.get(kind);
          await referenceImage.decode();
        }
        if(!dialog.open||device!==mode||selectedRow!==row||
          !['approved','approved-compare','approved-overlay'].includes(viewMode))return;
        referenceLabel.textContent='Согласованный исходник · '+approvedReference.version+
          ' · SHA-256 проверен · '+mode;
        referenceSeen.add(signature(row,mode));
        if(viewMode==='approved-overlay'){
          setOverlayOpacity();renderViewport();
        }
      }catch(error){
        if(!dialog.open||device!==mode||selectedRow!==row)return;
        referenceLabel.textContent='Макет недоступен: '+error.message;
      }
    };
    // Only the actually loaded document is eligible for a manual sign-off.
    // No auto-approval: this merely refuses broken media and page-level
    // horizontal overflow before asking a human to review the full page.
    frame.addEventListener('load',()=>{
      const doc=frame.contentDocument,token=doc?.querySelector(
        'meta[name="manufact-preview-ticket"]')?.content;
      if(!dialog.open||token!==String(request))return;
      const ticket=request,row=selectedRow,mode=device;
      void (async()=>{
        const images=[...doc.images];
        // Lazy images below the fold must be checked too; otherwise a broken
        // footer image could pass merely because it hasn't been scrolled into.
        for(const img of images)img.loading='eager';
        await Promise.all(images.map(img=>new Promise(resolve=>{
          if(img.complete){resolve();return;}
          const done=()=>{img.removeEventListener('load',done);img.removeEventListener('error',done);resolve();};
          img.addEventListener('load',done,{once:true});
          img.addEventListener('error',done,{once:true});
          setTimeout(done,10000);
        })));
        if(ticket!==request||!dialog.open||row!==selectedRow||mode!==device)return;
        const root=doc.documentElement;
        if(!root)return;
        const width=widths[mode],overflow=Math.max(0,Math.ceil(
          Math.max(root.scrollWidth,doc.body?.scrollWidth||0)-width));
        const broken=images.filter(img=>!img.complete||img.naturalWidth===0).length;
        const height=Math.max(root.scrollHeight,doc.body?.scrollHeight||0);
        const errors=[];
        if(overflow>2)errors.push('Горизонтальное переполнение: '+overflow+' px');
        if(broken)errors.push('Не загрузились изображения: '+broken);
        if(height>60000)errors.push('Страница длиннее лимита предпросмотра 60 000 px');
        const key=signature(row,mode);
        renderEvidence.set(key,{width,fullHeight:height,imageCount:images.length,
          brokenImages:broken,horizontalOverflowPx:overflow,errors});
        if(!errors.length)previewReady.add(key);
        else previewReady.delete(key);
        renderViewport();updateReviewed();syncActions();
        previewStatus.textContent=errors.length?
          'Проверка PHP · '+row.current.path+' · '+errors.join(' · ')+
            '. Исправьте ошибки перед подтверждением.':
          'PHP-страница целиком · '+row.current.path+' · '+width+' px · '+height+
            ' px по высоте · изображения '+images.length+' загружены · горизонтального переполнения нет';
      })().catch(error=>{
        if(ticket!==request||!dialog.open)return;
        previewStatus.textContent='Ошибка проверки отрисовки: '+error.message;
        previewReady.delete(signature(row,mode));updateReviewed();syncActions();
      });
    });
    const showPreview=async()=>{
      const ticket=++request,row=selectedRow;
      previewReady.delete(signature(row,device));
      renderEvidence.delete(signature(row,device));
      updateReviewed();
      const draft=row.current,live=row.prior;
      const path=draft?.path||live?.path;
      previewStatus.textContent='Строим предпросмотр черновика '+path+'…';
      frame.removeAttribute('srcdoc');
      liveFrame.removeAttribute('src');
      liveFrame.removeAttribute('srcdoc');
      if(published&&live){
        // Visitor responses deliberately set frame-ancestors 'none'. NEVER
        // relax that header. Read the current public HTML over same-origin
        // and display it as scriptless srcdoc, just like draft PHP preview.
        void (async()=>{
          try{
            const url='/published/'+encodeURIComponent(state.siteId)+live.path;
            const response=await fetch(url,{credentials:'same-origin',
              cache:'no-store',redirect:'error'});
            if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))
              throw Error('Опубликованная страница недоступна (HTTP '+response.status+')');
            const html=await response.text();
            if(html.length>4*1024*1024)throw Error('Страница слишком большая для визуального сравнения');
            if(ticket!==request||!dialog.open)return;
            liveFrame.srcdoc=html;
            liveFrame.onload=()=>{if(ticket===request&&dialog.open)renderViewport();};
          }catch(error){
            if(ticket!==request||!dialog.open)return;
            liveFrame.srcdoc='<!doctype html><html lang="ru"><meta charset="utf-8"><body style="font:15px system-ui;padding:25px"><p>Не удалось открыть опубликованный HTML для сравнения.</p></body></html>';
            previewStatus.textContent='Опубликованная версия недоступна: '+error.message;
          }
        })();
      }else{
        liveFrame.srcdoc='<!doctype html><html lang="ru"><meta charset="utf-8"><body style="font:15px system-ui;padding:25px"><p>Эта страница ещё не опубликована.</p></body></html>';
      }
      if(!draft){
        frame.srcdoc='<!doctype html><html lang="ru"><meta charset="utf-8"><body style="font:15px system-ui;padding:25px"><p>Страница удалена из черновика; посетители пока видят опубликованную версию.</p></body></html>';
        previewStatus.textContent='Черновик · '+path+' · страница удалена · без публикации';
        return;
      }
      try{
        const html=await previewPage(site,draft.path);
        if(ticket!==request||!dialog.open)return;
        if(!html.includes('<head>'))throw Error('PHP-превью не содержит HTML head');
        frame.srcdoc=html.replace('<head>','<head><meta name="manufact-preview-ticket" content="'+ticket+'">');
        updateReviewed();syncActions();
        previewStatus.textContent='Проверяем полную PHP-страницу и все изображения · '+
          draft.path+' · '+widths[device]+' px…';
      }catch(error){
        if(ticket!==request||!dialog.open)return;
        previewReady.delete(signature(row,device));
        updateReviewed();syncActions();
        frame.removeAttribute('srcdoc');
        previewStatus.textContent='Черновик недоступен: '+error.message;
      }
    };
    const choosePage=row=>{
      selectedRow=row;
      const page=row.current||row.prior;
      pageHeading.textContent=page.title+' · '+page.path;
      issues.replaceChildren();
      const relevant=[...inspected.errors.map(item=>({item,error:true})),
        ...inspected.warnings.map(item=>({item,error:false}))].filter(entry=>
          entry.item.pageId===page.id&&row.current);
      const diffTitle=element('strong',null,published?
        (row.status==='unchanged'?'Без изменений относительно публикации':
          'Изменения относительно опубликованной версии'):'До первой публикации');
      issues.append(diffTitle);
      for(const change of row.changes)
        issues.append(element('p','hosted-launch-delta',change));
      if(published&&!row.changes.length)
        issues.append(element('p',null,'Содержимое, SEO и настройки этой страницы не менялись.'));
      const summaryLine=element('p',null,
        (row.current?page.sections.length+' блоков':'Страницы нет в черновике')+
        ' · '+relevant.filter(entry=>entry.error).length+
        ' ошибок · '+relevant.filter(entry=>!entry.error).length+' рекомендаций');
      issues.append(summaryLine);
      for(const gap of readiness.issues.filter(item=>item.pageId===page.id).slice(0,10)){
        const line=element('div','hosted-launch-gap');
        line.append(element('span',null,gap.message));
        const go=action('Исправить','',()=>{dialog.close();editor.focusLaunchIssue(gap);});
        go.disabled=!canEdit();line.append(go);issues.append(line);
      }
      for(const entry of relevant.slice(0,12))
        issues.append(element('p',entry.error?'hosted-launch-error':'hosted-launch-warning',
          (entry.error?'Ошибка: ':'Рекомендация: ')+entry.item.message));
      if(relevant.length>12)issues.append(element('small',null,'Остальные замечания доступны в полном аудите.'));
      for(const button of pages.querySelectorAll('button'))
        button.classList.toggle('primary',button.dataset.pageId===page.id);
      editPage.disabled=!row.current;
      updateReviewed();syncActions();renderViewport();void showPreview();void showReference();
    };
    for(const [value,label] of [
      ['draft','Черновик'],['compare','Рядом с публикацией'],['published','Опубликовано'],
      ['approved-compare','Рядом с макетом'],['approved-overlay','Наложить макет'],['approved','Утверждённый макет']
    ]){
      const mode=action(label,'',()=>{
        if((value==='compare'||value==='published')&&!published)return;
        if(['approved','approved-compare','approved-overlay'].includes(value)&&!referenceKind(selectedRow,device))return;
        viewMode=value;renderViewport();void showReference();
      });
      mode.dataset.compareMode=value;
      mode.disabled=(['compare','published'].includes(value)&&!published)||
        (['approved','approved-compare','approved-overlay'].includes(value)&&!referenceKind(selectedRow,device));
      compareModes.append(mode);
    }
    for(const [mode,name] of [['desktop','ПК'],['tablet','Планшет'],['mobile','Телефон']]){
      const control=action(name,'',()=>{
        if(device===mode)return;
        device=mode;renderViewport();updateReviewed();syncActions();void showPreview();void showReference();
      });
      control.dataset.device=mode;devices.append(control);
    }
    for(const row of comparisonRows){
      const page=row.page;
      const countIssues=inspected.errors.filter(f=>f.pageId===page.id).length;
      const type=row.status==='added'?' · новая':row.status==='removed'?' · удалена':
        row.status==='changed'?' · изменена':row.status==='unchanged'?' · без изменений':'';
      const control=action(page.title+' · '+page.path+type+
        (countIssues?' · '+countIssues+' ошибок':''),'',()=>choosePage(row));
      control.dataset.pageId=page.id;
      control.dataset.diffStatus=row.status;
      pages.append(control);
    }
    editPage.addEventListener('click',()=>{
      const pageIndex=site.pages.findIndex(page=>page.id===selectedRow.current?.id);
      dialog.close();
      document.querySelectorAll('#pages .nav-entry')[pageIndex]?.click();
    });
    const adjustPreview=()=>{if(dialog.open)renderViewport();};
    window.addEventListener('resize',adjustPreview);
    dialog.addEventListener('close',()=>{
      ++request;window.removeEventListener('resize',adjustPreview);
      for(const url of referenceUrls.values())URL.revokeObjectURL(url);
      referenceUrls.clear();referenceImage.removeAttribute('src');overlayImage.removeAttribute('src');
      frame.srcdoc='';liveFrame.srcdoc='';dialog.remove();
    },{once:true});
    dialog.showModal();choosePage(selectedRow);updateReviewed();
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
      return true;
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
    // After an owner's explicit publication, verify the real PHP public
    // endpoint automatically. This is diagnostic only: never rewrite or
    // silently roll back a successful publication.
    if(isOwner()){
      try{
        const report=await api('/api/sites/'+encodeURIComponent(state.siteId)+'/connection-check');
        let matching=false;
        if(report.localReady&&report.publicProbeUrl?.startsWith('/published/'+state.siteId+'/')){
          const response=await fetch(report.publicProbeUrl,{method:'GET',cache:'no-store',
            credentials:'same-origin',redirect:'error',headers:{Accept:'application/json'}});
          if(response.ok&&(response.headers.get('content-type')||'').includes('application/json')){
            const probe=await response.json();
            matching=probe.format===report.format&&probe.siteId===state.siteId&&
              probe.publishedVersion===report.publishedVersion;
          }
        }
        notice('Опубликована версия #'+result.version+'. Подключение текущего PHP-сайта: '+
          (matching?'подтверждено':'нужна проверка; откройте «Проверить подключение».'),
          !matching);
      }catch(error){
        notice('Версия #'+result.version+' опубликована. Автопроверка недоступна: '+
          error.message.slice(0,100),true);
      }
    }
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

  // Connect a compiled external site, not a prototype or arbitrary external HTML.
  // The three images and the human-approved specification remain in the portable folder.
  async function importApprovedFolder(uploadedFiles,archiveOnly=false){
    return safe(async()=>{
      if(!isOwner())throw Error('Подключение нового сайта доступно только владельцу CMS');
      if(isDirty()&&!confirm('Несохранённые изменения будут потеряны. Продолжить?'))return;
      const files=new Map();
      for(const file of uploadedFiles){
        const relative=(file.webkitRelativePath||'').split('/').slice(1).join('/');
        if(!relative||relative.split('/').includes('..')||files.has(relative))
          throw Error('Неверная структура каталога или повтор файла: '+relative);
        files.set(relative,file);
      }
      const required=path=>{
        if(typeof path!=='string'||path.length>200||
          !/^[a-zA-Z0-9_/-]+\.(?:json|md|txt|png|jpe?g|webp)$/.test(path)||
          path.split('/').includes('..')||!files.has(path))
          throw Error('В каталоге отсутствует файл: '+String(path));
        return files.get(path);
      };
      const manifestFile=required('handoff.json');
      if(manifestFile.size<10||manifestFile.size>200000)throw Error('Некорректный handoff.json');
      const handoff=JSON.parse(await manifestFile.text());
      if(!['manufact-approved-site-handoff-v1','manufact-approved-site-handoff-v2'].includes(handoff.format)||
        handoff.status!=='approved'||
        typeof handoff.version!=='string'||!/^[a-zA-Z0-9._-]{1,64}$/.test(handoff.version)||
        !handoff.files||typeof handoff.files!=='object')
        throw Error('Требуется версия и статус approved после фактического согласования макетов');
      const refs=handoff.files;
      for(const kind of ['desktop','tablet','mobile']){
        const file=required(refs[kind]);
        if(!/\.(png|jpe?g|webp)$/i.test(refs[kind])||file.size<64||file.size>8000000)
          throw Error('Неверный статический макет: '+kind);
      }
      if(new Set([refs.desktop,refs.tablet,refs.mobile]).size!==3)
        throw Error('Для desktop, tablet и mobile нужны три самостоятельных макета');
      for(const kind of ['clientExplanation','implementationSpec']){
        const file=required(refs[kind]);
        if(file.size<10||file.size>200000||!/\.(md|txt|json)$/.test(refs[kind]))
          throw Error('Отсутствует переносимое описание: '+kind);
      }
      const source=required(refs.site);
      if(!/\.json$/.test(refs.site)||source.size<10||source.size>500000)
        throw Error('site.json должен быть не более 500 КБ');
      const site=JSON.parse(await source.text());
      // The existing Stage3Editor uses the same typed contract as the PHP server.
      // Validation happens BEFORE creating a server-side site or writing any media.
      editor.previewDocument(site,site.pages[0]?.path||'/');
      // One main/homepage design remains required; optional separate,
      // sealed three-device mockups may bind to up to 20 interior pages.
      const pageReferences=refs.pagePrototypes||{};
      const pageIds=new Map(site.pages.map(page=>[page.id,page]));
      if(refs.pagePrototypes!==undefined){
        if(handoff.format!=='manufact-approved-site-handoff-v2'||
          !pageReferences||typeof pageReferences!=='object'||Array.isArray(pageReferences)||
          !Object.keys(pageReferences).length||Object.keys(pageReferences).length>20)
          throw Error('Отдельные макеты страниц требуют sealed v2 и 1–20 страниц');
      }
      for(const [pageId,devices] of Object.entries(pageReferences)){
        if(!pageIds.has(pageId)||pageIds.get(pageId).path==='/'||
          !devices||typeof devices!=='object'||Array.isArray(devices)||
          Object.keys(devices).length!==3||
          !['desktop','tablet','mobile'].every(bp=>typeof devices[bp]==='string'))
          throw Error('Неверные привязки макетов к внутренней странице: '+pageId);
        for(const device of ['desktop','tablet','mobile']){
          const file=required(devices[device]);
          if(!/\.(png|jpe?g|webp)$/.test(devices[device])||
            file.size<64||file.size>8000000)
            throw Error('Повреждённый или большой оригинальный макет: '+pageId+' / '+device);
        }
      }
      const media=[];
      for(const item of site.assets){
        if(!['image/png','image/jpeg','image/webp'].includes(item.mime))
          throw Error('Пакет пока принимает PNG/JPEG/WebP, но не '+item.mime);
        const original=required(item.src.replace(/^\/assets\//,'assets/'));
        if(original.size<20||original.size>1000000)
          throw Error('Изображение больше 1 МБ или пустое: '+item.id);
        const variants=[];
        for(const variant of item.variants||[]){
          const file=required(variant.src.replace(/^\/assets\//,'assets/'));
          if(file.size<20||file.size>1000000)throw Error('Недопустимый responsive-файл: '+variant.id);
          variants.push({file,width:variant.width,sha256:variant.sha256});
        }
        media.push({id:item.id,original,variants,alt:item.alt});
      }
      // Lock v2 to the exact visual evidence, client explanation, source
      // and all media bytes BEFORE any draft is created or anything is uploaded.
      if(handoff.format==='manufact-approved-site-handoff-v2'){
        const lock=handoff.integrity;
        if(!lock||lock.algorithm!=='sha256'||!lock.files||
          typeof lock.files!=='object'||Array.isArray(lock.files))
          throw Error('Пакет v2 не содержит SHA-256 для файлов');
        const requiredPaths=[refs.site,refs.desktop,refs.tablet,refs.mobile,
          refs.clientExplanation,refs.implementationSpec];
        for(const devices of Object.values(pageReferences))
          for(const bp of ['desktop','tablet','mobile'])requiredPaths.push(devices[bp]);
        for(const asset of site.assets){
          requiredPaths.push(asset.src.replace(/^\/assets\//,'assets/'));
          for(const variant of asset.variants||[])
            requiredPaths.push(variant.src.replace(/^\/assets\//,'assets/'));
        }
        const actual=new Set(requiredPaths),declared=Object.keys(lock.files);
        if(actual.size!==requiredPaths.length||declared.length!==requiredPaths.length||
          declared.some(path=>!actual.has(path)))
          throw Error('Контрольный список файлов не соответствует сайту');
        for(const filename of requiredPaths){
          const file=required(filename);
          const digest=Array.from(new Uint8Array(await crypto.subtle.digest(
            'SHA-256',await file.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('');
          if(!/^[a-f0-9]{64}$/.test(lock.files[filename])||digest!==lock.files[filename])
            throw Error('Изменён файл после утверждения: '+filename);
        }
      }
      // Refuse corrupt/wrongly described images BEFORE creating the first draft.
      // Trust the signature and decoded dimensions, not the client-provided extension.
      const verifyImage=async(file,mime,expectedWidth,expectedHeight)=>{
        const header=new Uint8Array(await file.slice(0,16).arrayBuffer());
        const png=header.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>header[i]===v);
        const jpeg=header.length>=3&&header[0]===255&&header[1]===216&&header[2]===255;
        const webp=header.length>=12&&
          String.fromCharCode(...header.slice(0,4))==='RIFF'&&
          String.fromCharCode(...header.slice(8,12))==='WEBP';
        if(!({ 'image/png':png,'image/jpeg':jpeg,'image/webp':webp })[mime])
          throw Error('Файл не соответствует заявленному формату: '+file.name);
        let bitmap;
        try{bitmap=await createImageBitmap(file);}
        catch(_){throw Error('Повреждённое изображение: '+file.name);}
        try{
          if((expectedWidth!==undefined&&bitmap.width!==expectedWidth)||
            (expectedHeight!==undefined&&bitmap.height!==expectedHeight))
            throw Error('Размеры не совпадают с манифестом: '+file.name);
        }finally{bitmap.close();}
      };
      for(const kind of ['desktop','tablet','mobile']){
        const filename=refs[kind],extension=filename.split('.').pop().toLowerCase();
        const mime=extension==='png'?'image/png':extension==='webp'?'image/webp':
          ['jpg','jpeg'].includes(extension)?'image/jpeg':null;
        if(!mime)throw Error('Неизвестный формат утверждённого макета: '+filename);
        await verifyImage(required(filename),mime);
      }
      for(const devices of Object.values(pageReferences))
        for(const bp of ['desktop','tablet','mobile']){
          const filename=devices[bp],ext=filename.split('.').pop();
          await verifyImage(required(filename),ext==='png'?'image/png':
            ext==='webp'?'image/webp':'image/jpeg');
        }
      for(const entry of media){
        const declared=site.assets.find(asset=>asset.id===entry.id);
        await verifyImage(entry.original,declared.mime,declared.width,declared.height);
        for(const variant of entry.variants){
          await verifyImage(variant.file,declared.mime,variant.width,
            declared.variants.find(item=>item.sha256===variant.sha256)?.height);
          const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
            await variant.file.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
          if(sha256!==variant.sha256)throw Error('Не совпадает SHA256 responsive-файла: '+variant.file.name);
        }
      }
      // A resumed import is only possible for this exact, sealed package,
      // owner and browser tab. No other site/document is ever overwritten.
      const checkpointKey='manufact-stage3-approved-import-v2:'+site.siteId;
      const ticket=handoff.format==='manufact-approved-site-handoff-v2'
        ?{siteId:site.siteId,title:site.title,owner:state.principal?.username,
          digest:handoff.integrity.files[refs.site]}:null;
      const readTicket=()=>{
        try{return JSON.parse(sessionStorage.getItem(checkpointKey)||'null');}
        catch(_){return null;}
      };
      const matchingTicket=()=>ticket&&JSON.stringify(readTicket())===JSON.stringify(ticket);
      const rememberTicket=()=>{
        if(!ticket)return;
        try{sessionStorage.setItem(checkpointKey,JSON.stringify(ticket));}catch(_){}
      };
      const forgetTicket=()=>{
        try{sessionStorage.removeItem(checkpointKey);}catch(_){}
      };
      // Durable owner-private evidence is anchored BEFORE any media upload.
      // This allows explicit, checksum-bound recovery after the original tab is lost.
      const stable=value=>Array.isArray(value)?value.map(stable):
        value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort()
          .map(key=>[key,stable(value[key])])):value;
      const seed=editor.fromBrief(site.siteId,site.title);
      const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
        .map(v=>v.toString(16).padStart(2,'0')).join('');
      const packageSha=ticket?await digest(await manifestFile.arrayBuffer()):null;
      const proofBase='/api/sites/'+encodeURIComponent(site.siteId)+'/approval-evidence';
      let recovery=null;
      if(!archiveOnly){
        const listing=await api('/api/sites');
        const meta=listing.sites.find(row=>row.site_id===site.siteId);
        if(meta){
          if(!ticket||meta.published_version!==null)
            throw Error('ID уже занят: опубликованный сайт или неподписанный пакет нельзя возобновлять');
          const current=await api('/api/sites/'+encodeURIComponent(site.siteId));
          if(JSON.stringify(stable({...current.site,assets:[]}))!==JSON.stringify(stable(seed)))
            throw Error('ID уже занят: черновик не является нетронутой загрузкой');
          const index=await api(proofBase);
          if(index.packages.some(p=>p.packageSha!==packageSha))
            throw Error('ID уже занят: на сайте хранится другой утверждённый пакет');
          const packageRecord=index.packages.find(p=>p.packageSha===packageSha);
          let durable=false;
          if(packageRecord?.files?.handoff?.sha256===packageSha&&
            packageRecord.files.site?.sha256===handoff.integrity.files[refs.site]){
            // The read endpoint itself hashes stored bytes; compare to THIS folder.
            for(const [kind,hash] of [['handoff',packageSha],
              ['site',handoff.integrity.files[refs.site]]]){
              const response=await fetch(proofBase+'/'+packageSha+'/'+kind,{
                credentials:'same-origin',cache:'no-store'});
              if(!response.ok||await digest(await response.arrayBuffer())!==hash)
                throw Error('Не совпадают сохранённые исходники: '+kind);
            }
            durable=true;
          }
          if(!matchingTicket()&&!durable)
            throw Error('ID занят незавершённым импортом без подтверждённых исходников. '
              +'Нужна прежняя вкладка или уже сохранённые handoff и site.json.');
          recovery={mode:durable?'durable':'session',revision:current.revision};
        }
      }
      // A visual approval gate is distinct from checking a filename or status flag.
      // Display the three actual files and source explanations, never untrusted HTML.
      const approve=async()=>{
        const dialog=document.createElement('dialog');
        dialog.id='server-approved-review';
        dialog.setAttribute('aria-labelledby','server-approved-review-heading');
        Object.assign(dialog.style,{width:'min(1200px,95vw)',maxHeight:'90vh',
          overflowY:'auto',padding:'24px',borderRadius:'18px',border:'1px solid #ddd'});
        const heading=element('h2',null,'Проверка утверждённого сайта');
        heading.id='server-approved-review-heading';
        const mockups=[refs.desktop,refs.tablet,refs.mobile,
          ...Object.values(pageReferences).flatMap(devices=>
            ['desktop','tablet','mobile'].map(bp=>devices[bp]))];
        const mockupBytes=mockups.reduce((sum,name)=>sum+required(name).size,0);
        const mediaBytes=media.reduce((sum,item)=>sum+item.original.size+
          item.variants.reduce((subtotal,v)=>subtotal+v.file.size,0),0);
        const minimumBackupBytes=Math.ceil((mockupBytes+mediaBytes)*4/3);
        const summary=element('p',null,'Сайт: '+site.title+' · версия: '+handoff.version+
          ' · страниц: '+site.pages.length+' · изображений: '+site.assets.length+
          ' · оригиналов макетов: '+mockups.length+
          ' · изображения: '+(mockupBytes+mediaBytes).toLocaleString('ru-RU')+' байт'+
          ' · целостность: '+(handoff.format.endsWith('-v2')?'SHA-256 подтверждена':'старый пакет v1'));
        if(minimumBackupBytes>45000000)
          summary.append(element('strong',null,
            ' · Внимание: только Base64 изображений займёт минимум '+
            Math.ceil(minimumBackupBytes/1000000)+
            ' МБ в полном бэкапе. Лимит — 64 МБ, возможен отказ экспорта.'));
        const description=element('p',null,archiveOnly?
          'Архивирование не изменит страницы, черновик или публикацию. Проверьте исходные макеты, описания и версию; записи будут доступны только владельцу CMS.':
          recovery?
            'Обнаружена незавершённая загрузка этого сайта, ревизия #'+recovery.revision+
            '. Серверный черновик совпадает с исходным seed, а исходники подтверждены '+
            (recovery.mode==='durable'?'сохранёнными SHA-256 документами':'чеком прежней вкладки')+
            '. При продолжении каждый уже загруженный файл будет проверен по настоящим байтам. Публикации не будет.':
            'Ниже показаны реальные макеты из пакета. Сравните их с согласованной версией. Подключение создаст только черновик, публикация выполняется отдельно.');
        const pageSelect=element('select','control');
        pageSelect.id='server-approved-review-page';
        pageSelect.setAttribute('aria-label','Страница для сравнения');
        for(const item of site.pages){
          const opt=element('option',null,(item.title||item.path)+' · '+item.path);
          opt.value=item.path;pageSelect.append(opt);
        }
        pageSelect.style.maxWidth='400px';
        const pageLabel=element('label','hosted-label','Страница для визуальной проверки');
        pageLabel.append(pageSelect);
        const previews=element('div','');
        previews.id='server-approved-prototypes';
        Object.assign(previews.style,{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:'14px'});
        const objectUrls=[],liveFrames={};
        const liveImageBytes=new Map();
        const widths={desktop:1280,tablet:768,mobile:390};
        const toDataUrl=(file,mime)=>new Promise((resolve,reject)=>{
          // File.type is not reliable for OS directory pickers or headless File
          // objects. The image's declared MIME was already checked against the
          // real bytes and dimensions before the review was opened.
          const reader=new FileReader();
          reader.onload=()=>{
            const encoded=String(reader.result).split(',')[1]||'';
            if(!/^[A-Za-z0-9+/=]+$/.test(encoded))
              reject(Error('Некорректные байты изображения: '+file.name));
            else resolve('data:'+mime+';base64,'+encoded);
          };
          reader.onerror=()=>reject(Error('Невозможно прочитать изображение: '+file.name));
          reader.readAsDataURL(file);
        });
        const renderSite=async()=>{
          const path=pageSelect.value;
          // Resolve media by verified local asset ID. The candidate does not
          // exist on the server yet, so hosted previewUrl cannot serve it.
          const sources=Object.create(null);
          for(const asset of site.assets){
            if(!liveImageBytes.has(asset.id))
              liveImageBytes.set(asset.id,await toDataUrl(required(asset.src.slice(1)),asset.mime));
            sources[asset.id]=liveImageBytes.get(asset.id);
          }
          for(const [device,view] of Object.entries(liveFrames))
            view.frame.srcdoc=editor.previewDocument(site,path,device,sources);
        };
        const resizeSite=()=>{
          for(const [device,view] of Object.entries(liveFrames)){
            if(view.card.hidden||!view.card.isConnected)continue;
            const scale=Math.min(1,Math.max(0.12,(view.container.clientWidth-8)/widths[device]));
            const doc=view.frame.contentDocument,root=doc?.documentElement;
            // srcdoc='' on dialog cleanup can fire a late load while its
            // document is temporarily empty or already detached.
            const fullHeight=root?Math.max(root.scrollHeight,doc.body?.scrollHeight||0):540;
            const height=Math.min(30000,Math.max(540,fullHeight));
            view.frame.style.height=height+'px';
            view.frame.style.transform='scale('+scale+')';
            view.viewport.style.height=Math.ceil(height*scale)+'px';
          }
        };
        const dimensions={desktop:'Десктоп',tablet:'Планшет',mobile:'Телефон'};
        for(const [key,name] of Object.entries(dimensions)){
          const card=element('div','');card.dataset.approvedDevice=key;
          card.style.minWidth='0';
          const caption=element('h3',null,name);
          const img=document.createElement('img');
          img.alt='Утверждённый макет · '+name;
          img.dataset.prototype=key;img.src=URL.createObjectURL(required(refs[key]));
          objectUrls.push(img.src);
          Object.assign(img.style,{display:'block',width:'100%',height:'auto',
            borderRadius:'10px',border:'1px solid #ddd',background:'#f5f5f5'});
          const liveTitle=element('h4',null,'Сайт CMS · '+widths[key]+' px · вся страница');
          const container=element('div','');
          Object.assign(container.style,{position:'relative',width:'100%',minWidth:'0',
            overflowX:'hidden',overflowY:'auto',maxHeight:'310px',
            background:'#fff',border:'1px solid #ddd',borderRadius:'10px'});
          const viewport=element('div','');
          Object.assign(viewport.style,{position:'relative',width:'100%',height:'540px'});
          const frame=document.createElement('iframe');
          frame.dataset.previewDevice=key;
          frame.title='Полностраничный предпросмотр · '+name;
          // Validated first-party srcdoc, CSP script-src none and no sandbox
          // allow-scripts/forms/navigation. Same-origin permits height reads only.
          frame.setAttribute('sandbox','allow-same-origin');
          frame.referrerPolicy='no-referrer';
          Object.assign(frame.style,{width:widths[key]+'px',height:'540px',
            transformOrigin:'top left',border:'0',display:'block',pointerEvents:'none'});
          viewport.append(frame);container.append(viewport);
          const compare=element('div','');compare.dataset.approvedCompare=key;
          Object.assign(compare.style,{display:'grid',gridTemplateColumns:'minmax(0,1fr)',
            gap:'14px',alignItems:'start'});
          const prototype=element('div','');prototype.style.minWidth='0';
          prototype.style.maxHeight='310px';prototype.style.overflowY='auto';
          prototype.append(element('h4',null,'Согласованный макет'),img);
          const result=element('div','');result.style.minWidth='0';
          result.append(liveTitle,container);compare.append(prototype,result);
          const expand=action('Развернуть сравнение','server-approved-expand-'+key,()=>{
            const expanded=card.dataset.expanded!=='true';
            for(const view of Object.values(liveFrames))
              view.card.hidden=expanded&&view.card!==card;
            card.dataset.expanded=String(expanded);
            expand.textContent=expanded?'Свернуть сравнение':'Развернуть сравнение';
            card.style.gridColumn=expanded?'1 / -1':'';
            compare.style.gridTemplateColumns=expanded?'repeat(2,minmax(0,1fr))':'minmax(0,1fr)';
            container.style.maxHeight=prototype.style.maxHeight=expanded?'75vh':'310px';
            resizeSite();
          });
          frame.addEventListener('load',()=>{resizeSite();requestAnimationFrame(resizeSite);});
          liveFrames[key]={card,container,viewport,frame,expand,img,prototype};
          card.append(caption,expand,compare);previews.append(card);
        }
        const details=element('div','');
        Object.assign(details.style,{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'16px'});
        for(const [key,label] of [['clientExplanation','Описание для клиента'],
          ['implementationSpec','Спецификация реализации']]){
          const panel=element('section','');
          panel.append(element('h3',null,label));
          const content=element('pre','',await required(refs[key]).text());
          Object.assign(content.style,{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'190px',
            overflowY:'auto',padding:'12px',background:'#f5f5f5',borderRadius:'10px'});
          panel.append(content);details.append(panel);
        }
        const actions=element('div','');
        Object.assign(actions.style,{display:'flex',justifyContent:'flex-end',flexWrap:'wrap',gap:'12px',marginTop:'18px'});
        const cancel=action('Отмена','server-approved-review-cancel',()=>dialog.close('cancel'));
        const confirmButton=action(archiveOnly?'Сохранить материалы без изменения сайта':
          (recovery?'Продолжить незавершённый импорт':'Подключить как черновик'),
          'server-approved-review-confirm',()=>dialog.close('approve'));
        if(recovery?.mode==='durable'&&!matchingTicket()){
          const acknowledgement=element('label','hosted-label');
          const check=element('input');check.type='checkbox';check.id='server-approved-recovery-confirm';
          confirmButton.disabled=true;
          check.addEventListener('change',()=>{confirmButton.disabled=!check.checked;});
          acknowledgement.append(check,document.createTextNode(
            ' Подтверждаю восстановление незавершённой загрузки '+site.siteId+
            ' из этой точной утверждённой папки (SHA-256 '+packageSha.slice(0,16)+'…).'));
          actions.append(acknowledgement);
        }
        actions.append(cancel,confirmButton);
        dialog.append(heading,summary,description,pageLabel,previews,details,actions);
        document.body.append(dialog);
        const pageImageUrls=new Map();
        const showPage=async()=>{
          pageSelect.disabled=true;
          const current=site.pages.find(page=>page.path===pageSelect.value);
          const devices=current?.path==='/'?refs:
            pageReferences[current?.id]||null;
          for(const [bp,view] of Object.entries(liveFrames)){
            const path=devices?.[bp];
            view.img.hidden=!path;
            view.prototype.querySelector('h4').textContent=path?
              'Согласованный макет · '+(current?.title||current?.path):
              'Для этой страницы нет отдельного утверждённого макета';
            if(path){
              if(!pageImageUrls.has(path)){
                const url=URL.createObjectURL(required(path));
                pageImageUrls.set(path,url);objectUrls.push(url);
              }
              view.img.src=pageImageUrls.get(path);
            }
          }
          try{await renderSite();resizeSite();}
          catch(error){
            description.textContent='Предпросмотр отклонён: '+error.message;
            confirmButton.disabled=true;
          }finally{pageSelect.disabled=false;}
        };
        pageSelect.addEventListener('change',showPage);
        try{
          dialog.showModal();
          await showPage();
          window.addEventListener('resize',resizeSite);
          const decision=await new Promise(resolve=>{
            dialog.addEventListener('close',()=>resolve(dialog.returnValue==='approve'),{once:true});
          });
          return decision;
        }finally{
          window.removeEventListener('resize',resizeSite);
          for(const url of objectUrls)URL.revokeObjectURL(url);
          for(const view of Object.values(liveFrames))view.frame.srcdoc='';
          liveImageBytes.clear();
          dialog.remove();
        }
      };
      if(!await approve())return;
      const fileBase64=file=>new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
        reader.onerror=()=>reject(Error('Ошибка чтения: '+file.name));
        reader.readAsDataURL(file);
      });
      const archiveApproval=async()=>{
        if(handoff.format!=='manufact-approved-site-handoff-v2'){
          if(archiveOnly)throw Error('Для архива требуется SHA-256 sealed v2 пакет');
          return null; // v1 remains readable, but not a reliable approval archive.
        }
        // The SHA256 of the original sealed manifest was computed at preflight.
        const map=[['handoff','handoff.json'],...[
          'site','desktop','tablet','mobile','clientExplanation','implementationSpec'
        ].map(key=>[key,refs[key]])];
        const sortedPageIds=Object.keys(pageReferences).sort();
        for(let i=0;i<sortedPageIds.length;i++)
          for(const bp of ['desktop','tablet','mobile'])
            map.push(['ref-'+i+'-'+bp,pageReferences[sortedPageIds[i]][bp]]);
        let index=null;
        for(const [kind,path] of map){
          const file=required(path),digest=kind==='handoff'?packageSha:handoff.integrity.files[path];
          notice('Архив согласования: '+kind+' · '+(map.findIndex(x=>x[0]===kind)+1)+' из '+map.length);
          index=await api('/api/sites/'+encodeURIComponent(site.siteId)+'/approval-evidence','POST',{
            packageSha,kind,sha256:digest,base64:await fileBase64(file)
          });
        }
        if(!index.packages.some(row=>row.packageSha===packageSha&&row.complete))
          throw Error('Сервер не подтвердил полный архив согласования');
        return packageSha;
      };
      if(archiveOnly){
        const current=await api('/api/sites/'+encodeURIComponent(site.siteId));
        if(current.site.siteId!==site.siteId||current.site.title!==site.title)
          throw Error('Пакет относится к другому сайту; архив не изменён');
        await archiveApproval();
        notice(Object.keys(pageReferences).length?
          'Макеты '+(1+Object.keys(pageReferences).length)+
            ' страниц и исходная спецификация сохранены в закрытом архиве. Сайт и публикация не изменены.':
          'Три макета, два описания и исходный handoff сохранены в закрытом архиве. Сайт и публикация не изменены.');
        return;
      }
      let created=false,resumed=false;
      try{
        // Only previously accepted, unpublished, unchanged seeds may be resumed.
        // Server-stored original handoff + site.json bind the package across tabs.
        const remoteDigest=async assetId=>{
          const response=await fetch('/api/sites/'+encodeURIComponent(site.siteId)+'/media/'+
            encodeURIComponent(assetId),{credentials:'same-origin',cache:'no-store'});
          if(!response.ok)throw Error('Не удалось проверить сохранённый файл: '+assetId);
          const bytes=await response.arrayBuffer();
          if(bytes.byteLength<20||bytes.byteLength>1000000)
            throw Error('Некорректный размер ранее загруженного файла: '+assetId);
          return digest(bytes);
        };
        let result=null;
        if(recovery){
          const all=await api('/api/sites');
          const meta=all.sites.find(row=>row.site_id===site.siteId);
          if(!meta||meta.published_version!==null)
            throw Error('Возобновление запрещено: незавершённый сайт исчез или опубликован');
          result=await api('/api/sites/'+encodeURIComponent(site.siteId));
          if(result.revision!==recovery.revision||
            JSON.stringify(stable({...result.site,assets:[]}))!==JSON.stringify(stable(seed)))
            throw Error('Возобновление запрещено: черновик изменился после проверки');
          created=true;resumed=true;
        }else{
          rememberTicket(); // Before POST, survives an interrupted create response.
          result=await api('/api/sites','POST',{site:seed});
          created=true;
          if(ticket){
            // Persist an immutable recovery anchor BEFORE the first image upload.
            // An incomplete anchor cannot be used for cross-session recovery.
            for(const [kind,file,hash] of [
              ['handoff',manifestFile,packageSha],
              ['site',source,handoff.integrity.files[refs.site]]
            ]){
              await api(proofBase,'POST',{
                packageSha,kind,sha256:hash,base64:await fileBase64(file)
              });
            }
          }
        }
        selectSite(result);
        const ids=new Map(),reused=new Set();
        if(resumed){
          // Compare actual authenticated server media bytes with the exact
          // sealed source/variant checksums. Metadata alone is insufficient.
          for(const entry of media){
            const declared=site.assets.find(asset=>asset.id===entry.id);
            const fileHash=await digest(await entry.original.arrayBuffer());
            for(const saved of result.site.assets){
              if(reused.has(saved.id)||saved.mime!==declared.mime||saved.alt!==entry.alt||
                (declared.width!==undefined&&saved.width!==declared.width)||
                (declared.height!==undefined&&saved.height!==declared.height))continue;
              // Dimensions are optional in source JSON. PHP computes accurate
              // dimensions for uploaded originals/variants; require equality
              // only for values explicitly supplied by the external author.
              const expected=declared.variants||[],actual=saved.variants||[];
              if(actual.length!==expected.length||expected.some(v=>!actual.some(x=>
                x.width===v.width&&(v.height===undefined||x.height===v.height)&&
                x.sha256===v.sha256)))continue;
              if(await remoteDigest(saved.id)!==fileHash)continue;
              for(const variant of actual){
                if(await remoteDigest(variant.id)!==variant.sha256)
                  throw Error('Изменился ранее загруженный responsive-файл: '+variant.id);
              }
              ids.set(entry.id,saved.id);reused.add(saved.id);break;
            }
          }
          if(reused.size!==result.site.assets.length)
            throw Error('В незавершённом импорте найдены посторонние файлы; черновик не изменён');
          notice('Возобновление: '+reused.size+' уже проверенных изображений сохранены, загружаем оставшиеся.');
        }
        for(let i=0;i<media.length;i++){
          const entry=media[i],variants=[];
          if(ids.has(entry.id))continue;
          notice('Подключение '+site.title+': загрузка файла '+(i+1)+' из '+media.length);
          for(const part of entry.variants){
            const sha256=await digest(await part.file.arrayBuffer());
            if(sha256!==part.sha256)throw Error('Не совпадает контрольная сумма '+part.file.name);
            variants.push({width:part.width,sha256,base64:await fileBase64(part.file)});
          }
          result=await api('/api/sites/'+encodeURIComponent(site.siteId)+'/media','POST',
            {base64:await fileBase64(entry.original),alt:entry.alt,variants,expectedRevision:result.revision});
          ids.set(entry.id,result.asset.id);
        }
        const retarget=value=>{
          if(typeof value==='string')return ids.get(value)||value;
          if(Array.isArray(value))return value.map(retarget);
          if(value&&typeof value==='object')
            return Object.fromEntries(Object.entries(value).map(([key,part])=>[key,retarget(part)]));
          return value;
        };
        const next=retarget(site);
        next.assets=result.site.assets; // Server-issued immutable IDs, paths, dimensions and responsive hashes.
        result=await api('/api/sites/'+encodeURIComponent(site.siteId)+'/save','POST',
          {site:next,expectedRevision:result.revision});
        // The site draft is saved BEFORE its independent immutable evidence.
        // A failed evidence upload never rolls back/publishes the real site;
        // owner can resume only the approval archive via a separate button.
        selectSite(result);
        await refreshSites();await loadHistory();await loadSubmissions();await loadTemplates();await loadDeliverySettings();
        await archiveApproval();
        forgetTicket();
        notice((resumed?'Импорт безопасно продолжен. ':'Сайт подключён как черновик. ')+
          (handoff.format.endsWith('-v2')?'Архив согласования сохранён. ':'Пакет v1: архив не создавался. ')+
          'Публикация только по отдельной кнопке.');
      }catch(error){
        if(created){
          try{
            const current=await api('/api/sites/'+encodeURIComponent(site.siteId));
            selectSite(current);await refreshSites();await loadHistory();
          }catch(_){}
          throw Error('Импорт прерван. Остался неопубликованный черновик. '+
            (ticket?'Повторно выберите ту же sealed v2 папку. После сохранения исходных handoff/site.json можно продолжить даже в новой вкладке; посторонние черновики защищены. ':
              'Для старого v1-пакета автоматическое продолжение недоступно. ')+error.message);
        }
        // A create request may have succeeded server-side even when its HTTP
        // response was lost. Keep the sealed v2 checkpoint for safe retry.
        if(!ticket)forgetTicket();
        throw error;
      }
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
    clearArchive();backupDialog.close();operationsDialog.close();connectionDialog.close();releaseList.replaceChildren();
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

  const approvalVault=element('dialog','hosted-backup-dialog');
  approvalVault.id='server-approval-vault';
  const approvalRows=element('div','hosted-backup-summary');
  approvalRows.id='server-approval-vault-rows';
  const approvalClose=action('Закрыть','server-approval-vault-close',()=>approvalVault.close());
  approvalVault.append(element('h2',null,'Материалы согласования'),
    element('p',null,'Закрытое хранилище версий согласованного дизайна. Только владелец. Ни одна версия не меняет черновик или публикацию. SHA-256 подтверждает неизменность файлов, но не личность клиента.'),
    approvalRows,approvalClose);
  document.body.append(approvalVault);
  const approvalUrls=new Set();
  const privateApprovalUrl=(packageSha,kind)=>
    '/api/sites/'+encodeURIComponent(state.siteId)+'/approval-evidence/'+packageSha+'/'+kind;
  const approvalKinds=['handoff','site','desktop','tablet','mobile','clientExplanation','implementationSpec'];
  const approvalDownload=(bytes,name,mime='application/octet-stream')=>{
    const objectUrl=URL.createObjectURL(new Blob([bytes],{type:mime}));
    const a=document.createElement('a');a.href=objectUrl;a.download=name;
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
  };
  async function openApprovalVault(){
    if(!state.siteId||!isOwner())throw Error('Архив доступен только владельцу');
    const siteId=state.siteId;
    approvalVault.showModal();approvalRows.replaceChildren(element('p',null,'Читаем архив…'));
    try{
      const result=await api('/api/sites/'+encodeURIComponent(siteId)+'/approval-evidence');
      if(state.siteId!==siteId||!approvalVault.open)return;
      approvalRows.replaceChildren();
      if(!result.packages.length)approvalRows.append(element('p',null,
        'Пока нет сохранённых материалов. Для существующего сайта выберите «Архивировать материалы» и ту же sealed v2 папку.'));
      for(const entry of result.packages){
        const section=element('section','hosted-backup-summary');
        section.style.marginBottom='16px';
        section.append(element('h3',null,'Версия '+entry.version+' · '+(entry.complete?'полный комплект':'не завершён · можно повторить загрузку')),
          element('small',null,'SHA-256 handoff: '+entry.packageSha+' · '+entry.createdAt));
        const previews=element('div');
        Object.assign(previews.style,{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'10px'});
        const additional=Object.entries(entry.pageReferences||{}).flatMap(([pageId,refs])=>
          ['desktop','tablet','mobile'].map(bp=>({pageId,kind:refs[bp],bp})));
        if(additional.length)section.append(element('p',null,
          'Дополнительные изображения страниц: '+(additional.length/3)+
          ' · нажмите «Показать», чтобы загрузить конкретный макет.'));
        for(const kind of [...approvalKinds,...additional.map(row=>row.kind)]){
          if(!entry.files[kind])continue;
          const fileRow=element('div');fileRow.style.minWidth='0';
          const digest=entry.files[kind].sha256;
          const pageImage=additional.find(row=>row.kind===kind);
          const label=element('small',null,(pageImage?
            pageImage.pageId+' · '+pageImage.bp:kind)+' · '+entry.files[kind].bytes+' B');
          const save=action('Скачать','',()=>safe(async()=>{
            const response=await fetch(privateApprovalUrl(entry.packageSha,kind),
              {credentials:'same-origin',cache:'no-store'});
            if(!response.ok)throw Error('Файл больше недоступен');
            const bytes=await response.arrayBuffer();
            const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
              .map(b=>b.toString(16).padStart(2,'0')).join('');
            if(actual!==digest)throw Error('Архивный файл не прошёл SHA-256');
            approvalDownload(bytes,siteId+'-'+entry.version+'-'+kind+'.bin');
          }));
          fileRow.append(label,save);
          if(['desktop','tablet','mobile'].includes(kind)){
            const img=element('img');img.alt='Согласованный макет '+kind;
            Object.assign(img.style,{width:'100%',display:'block',maxHeight:'270px',objectFit:'contain'});
            const response=await fetch(privateApprovalUrl(entry.packageSha,kind),
              {credentials:'same-origin',cache:'no-store'});
            if(!response.ok)throw Error('Не удалось загрузить закрытый макет');
            const bytes=await response.arrayBuffer();
            const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
              .map(b=>b.toString(16).padStart(2,'0')).join('');
            if(actual!==digest)throw Error('Несовпадение SHA-256 сохранённого макета');
            const header=new Uint8Array(bytes.slice(0,12));
            const mime=header[0]===137?'image/png':header[0]===255?'image/jpeg':'image/webp';
            const url=URL.createObjectURL(new Blob([bytes],{type:mime}));approvalUrls.add(url);
            img.src=url;fileRow.prepend(img);previews.append(fileRow);
          }else{
            section.append(fileRow);
            if(pageImage){
              // A full 20-page package can hold 60 large screenshots.
              // Never fetch all originals on dialog open; verify and preview
              // each image only when the owner requests that one.
              const reveal=action('Показать макет','',()=>safe(async()=>{
                const response=await fetch(privateApprovalUrl(entry.packageSha,kind),
                  {credentials:'same-origin',cache:'no-store'});
                if(!response.ok)throw Error('Макет недоступен');
                const bytes=await response.arrayBuffer();
                const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
                  .map(b=>b.toString(16).padStart(2,'0')).join('');
                if(actual!==digest)throw Error('Несовпадение SHA-256 макета '+kind);
                const header=new Uint8Array(bytes.slice(0,12));
                const mime=header[0]===137?'image/png':header[0]===255?'image/jpeg':'image/webp';
                const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
                if(!approvalVault.open){URL.revokeObjectURL(url);return;}
                approvalUrls.add(url);
                const img=element('img');img.alt='Утверждённый макет '+pageImage.pageId+' '+pageImage.bp;
                Object.assign(img.style,{display:'block',width:'100%',maxHeight:'450px',objectFit:'contain'});
                fileRow.append(img);img.src=url;
                await img.decode().catch(()=>{});
                reveal.disabled=true;
              }));
              fileRow.append(reveal);
            }
            if(['clientExplanation','implementationSpec'].includes(kind)){
              const response=await fetch(privateApprovalUrl(entry.packageSha,kind),
                {credentials:'same-origin',cache:'no-store'});
              if(!response.ok)throw Error('Нет текста согласования');
              const bytes=await response.arrayBuffer();
              const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
                .map(b=>b.toString(16).padStart(2,'0')).join('');
              if(actual!==digest)throw Error('Несовпадение SHA-256 описания');
              const details=element('details');details.append(element('summary',null,kind));
              const text=element('pre','',new TextDecoder().decode(bytes));
              Object.assign(text.style,{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'220px',overflowY:'auto'});
              details.append(text);section.append(details);
            }
          }
        }
        section.append(previews);approvalRows.append(section);
      }
    }catch(error){
      approvalRows.replaceChildren(element('p',null,'Ошибка архива: '+error.message));
    }
  }
  approvalVault.addEventListener('close',()=>{
    for(const url of approvalUrls)URL.revokeObjectURL(url);
    approvalUrls.clear();approvalRows.replaceChildren();
  });
  // A folder is a complete external-author handoff. Raw JSON import remains
  // available for existing media-free sites. No additional editor engine.
  const approvedFolder=document.createElement('input');
  approvedFolder.type='file';approvedFolder.multiple=true;
  approvedFolder.setAttribute('webkitdirectory','');
  approvedFolder.hidden=true;approvedFolder.id='server-approved-folder';
  const approvedButton=action('Подключить готовый сайт','server-approved-import',
    ()=>approvedFolder.click());
  const evidenceFolder=document.createElement('input');
  evidenceFolder.type='file';evidenceFolder.multiple=true;evidenceFolder.hidden=true;
  evidenceFolder.setAttribute('webkitdirectory','');
  evidenceFolder.id='server-approved-vault-folder';
  const evidenceAttach=action('Архивировать материалы','server-approved-vault-attach',
    ()=>evidenceFolder.click());
  const evidenceOpen=action('Материалы согласования','server-approved-vault-open',
    ()=>safe(openApprovalVault));
  $('import').parentElement.append(approvedButton,approvedFolder,evidenceAttach,evidenceFolder,evidenceOpen);
  approvedFolder.addEventListener('change',()=>{
    const entries=[...approvedFolder.files];approvedFolder.value='';
    if(entries.length)importApprovedFolder(entries);
  });
  evidenceFolder.addEventListener('change',()=>{
    const entries=[...evidenceFolder.files];evidenceFolder.value='';
    if(entries.length)importApprovedFolder(entries,true);
  });
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
