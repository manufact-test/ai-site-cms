'use strict';
// Server-only account management. All permissions are independently enforced by PHP.
(()=>{
  const H=window.Stage3Host;if(!H)return;
  const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  const button=(text,id,fn)=>{const e=node('button',text);e.type='button';e.className='btn small';e.id=id;e.onclick=fn;return e;};
  const field=(id,type='text')=>{const e=node('input');e.id=id;e.type=type;e.className='control';return e;};
  const label=(text,e)=>{const l=node('label',text);l.htmlFor=e.id;return l;};
  const row=node('div');row.className='hosted-buttons';
  const identity=node('small');identity.id='server-identity';
  const manage=button('Пользователи','server-users-open',()=>run(async()=>{await loadUsers();usersDialog.showModal();}));
  const audit=button('Журнал действий','server-audit-open',()=>run(async()=>{await loadAuditSites();await loadAudit();auditDialog.showModal();}));
  const licencesOpen=button('Лицензии','server-licenses-open',()=>run(async()=>{await loadLicenses();licencesDialog.showModal();}));
  const change=button('Сменить пароль','server-password-open',()=>{currentPassword.value='';nextPassword.value='';passwordDialog.showModal();});
  row.append(identity,manage,audit,licencesOpen,change);document.getElementById('server-toolbar').append(row);
  const dialogs=[];
  function dialog(title,id){const d=node('dialog');d.className='hosted-backup-dialog';d.id=id;d.append(node('h2',title));document.body.append(d);dialogs.push(d);return d;}
  const message=node('p');message.id='server-access-message';message.setAttribute('aria-live','polite');
  let running=false;
  async function run(fn){
    if(running)return;running=true;
    message.textContent='';
    try{await fn();}catch(e){H.notice(e.message,true);const opened=dialogs.find(d=>d.open);if(opened){opened.append(message);message.textContent=e.message;}}
    finally{running=false;draw();}
  }
  const usersDialog=dialog('Пользователи и доступ к сайтам','server-users-dialog');
  usersDialog.append(node('p','Просмотр — контент. Редактор — правки и заявки без публикации. Публикующий — правки и публикация. Пользователи видят только назначенные сайты. Архивы и управление аккаунтами доступны владельцу.'));
  const account=node('select');account.className='control';account.id='server-user-select';
  const username=field('server-user-name');username.autocomplete='off';username.maxLength=40;
  const password=field('server-user-initial-password','password');password.autocomplete='new-password';
  const role=node('select');role.className='control';role.id='server-user-role';
  for(const [value,text] of [['viewer','Просмотр'],['editor','Редактор'],['publisher','Редактор и публикация'],['owner','Владелец (защищён)']]){const o=node('option',text);o.value=value;role.append(o);}
  const disabled=field('server-user-disabled','checkbox');
  const sites=node('select');sites.multiple=true;sites.size=5;sites.className='control';sites.id='server-user-sites';
  const reason=field('server-user-reason');reason.maxLength=120;
  const save=button('Сохранить пользователя','server-user-save',()=>run(async()=>{
    const values={role:role.value,sites:[...sites.selectedOptions].map(o=>o.value),reason:reason.value};
    if(account.value==='new')await H.api('/api/users','POST',{...values,username:username.value,password:password.value});
    else{
      const selected=users.find(u=>u.username===account.value);
      await H.api('/api/users/'+encodeURIComponent(selected.username),'POST',{...values,disabled:disabled.checked,expectedVersion:selected.authVersion});
    }
    password.value='';await loadUsers();H.notice('Доступ сохранён. Изменённому аккаунту потребуется войти заново.');
  }));
  usersDialog.append(label('Аккаунт',account),account,label('Логин',username),username,
    label('Начальный пароль (минимум 14 символов)',password),password,label('Роль',role),role,
    label('Отключить аккаунт',disabled),disabled,label('Назначенные сайты (можно выбрать несколько)',sites),sites,
    label('Причина создания / изменения доступа',reason),reason,save,
    button('Закрыть','server-users-close',()=>{password.value='';usersDialog.close();}));
  let users=[];
  function selectAccount(){
    const u=users.find(u=>u.username===account.value),owner=u?.role==='owner';
    username.value=u?.username||'';username.readOnly=!!u;role.value=u?.role||'viewer';
    disabled.checked=u?.disabled||false;password.value='';password.disabled=!!u;
    role.disabled=owner;disabled.disabled=owner;sites.disabled=owner;reason.value='';save.disabled=owner;
    for(const option of sites.options)option.selected=!!u?.sites.includes(option.value);
  }
  account.onchange=selectAccount;
  async function loadUsers(){
    const [accounts,available]=await Promise.all([H.api('/api/users'),H.api('/api/sites')]);
    users=accounts.users;const selected=account.value;
    account.replaceChildren();const add=node('option','+ Новый пользователь');add.value='new';account.append(add);
    for(const u of users){const o=node('option',u.username+' · '+u.role+(u.disabled?' · отключён':''));o.value=u.username;account.append(o);}
    sites.replaceChildren();for(const s of available.sites){const o=node('option',s.title+' · '+s.site_id);o.value=s.site_id;sites.append(o);}
    account.value=users.some(u=>u.username===selected)?selected:'new';selectAccount();
  }
  const auditDialog=dialog('Журнал действий','server-audit-dialog');
  auditDialog.append(node('p','Последние 200 событий. Записываются аккаунт, операция, сайт, результат и время; пароли и содержание заявок в журнал не попадают.'));
  const auditScope=node('select');auditScope.id='server-audit-scope';auditScope.className='control';
  const events=node('div');events.id='server-audit-events';events.className='hosted-audit-events';
  auditDialog.append(label('Сайт',auditScope),auditScope,button('Обновить','server-audit-refresh',()=>run(loadAudit)),events,
    button('Закрыть','server-audit-close',()=>auditDialog.close()));
  async function loadAuditSites(){
    const all=node('option','Все события');all.value='';auditScope.replaceChildren(all);
    for(const s of (await H.api('/api/sites')).sites){const o=node('option',s.title);o.value=s.site_id;auditScope.append(o);}
  }
  async function loadAudit(){
    const response=await H.api('/api/audit'+(auditScope.value?'?siteId='+encodeURIComponent(auditScope.value):''));
    events.replaceChildren();
    for(const event of response.events){
      const article=node('article');article.className='hosted-audit-event';article.dataset.outcome=event.outcome;
      article.append(node('strong',event.actor+' · '+event.outcome),node('small',event.created_at+' · '+(event.site_id||'Система')),
        node('p',event.action));if(event.detail)article.append(node('p',event.detail));events.append(article);
    }
    if(!response.events.length)events.append(node('p','Событий пока нет.'));
  }
  auditScope.onchange=()=>run(loadAudit);

  // Owner-only, manually controlled licences. Dates never switch off the public site.
  const licencesDialog=dialog('Лицензии, напоминания и ручная пауза','server-licenses-dialog');
  licencesDialog.append(node('p','Каждая лицензия относится к одному сайту этой установки. Срок оплаты создаёт только напоминание. Ручная пауза останавливает правки и публикацию, но не опубликованный сайт, формы или заявки.'));
  const totals=node('p');totals.id='server-license-totals';
  const listing=node('div');listing.id='server-license-list';listing.className='hosted-audit-events';
  const choice=node('select');choice.id='server-license-site';choice.className='control';
  const info=node('div');info.id='server-license-status';info.className='hosted-backup-summary';
  const type=node('select');type.id='server-license-type';type.className='control';
  for(const [id,title] of [['perpetual','Бессрочная'],['subscription','Подписка']]){const opt=node('option',title);opt.value=id;type.append(opt);}
  const date=field('server-license-date','date'),domain=field('server-license-domain'),licenceReason=field('server-license-reason');
  domain.maxLength=253;domain.placeholder='client.example (необязательно)';
  licenceReason.maxLength=120;licenceReason.placeholder='Причина решения оператора';
  const saveLicence=button('Сохранить условия','server-license-save',()=>run(()=>changeLicence('details')));
  const pauseLicence=button('Приостановить CMS','server-license-pause',()=>run(()=>changeLicence('pause')));
  const resumeLicence=button('Возобновить CMS','server-license-resume',()=>run(()=>changeLicence('resume')));
  licencesDialog.append(totals,listing,label('Сайт / instance ID',choice),choice,info,
    label('Тип лицензии',type),type,label('Дата следующего напоминания (UTC)',date),date,
    label('Домен для внутреннего учёта (без изменения DNS)',domain),domain,
    label('Обязательная причина',licenceReason),licenceReason);
  const buttons=node('div');buttons.className='hosted-buttons';
  buttons.append(saveLicence,pauseLicence,resumeLicence,
    button('Обновить','server-license-refresh',()=>run(loadLicenses)),
    button('Закрыть','server-license-close',()=>licencesDialog.close()));
  licencesDialog.append(buttons);
  let licenceRows=[];
  const labels={none:'Без напоминания',scheduled:'Запланировано',soon:'Скоро',today:'Сегодня',overdue:'Просрочено'};
  const chosen=()=>licenceRows.find(row=>row.siteId===choice.value);
  function displayLicence(){
    const item=chosen();info.replaceChildren();
    if(!item){saveLicence.disabled=pauseLicence.disabled=resumeLicence.disabled=true;return;}
    info.append(node('strong',item.title+' · '+item.siteId),
      node('p',(item.paused?'CMS приостановлена вручную':'CMS активна')+' · '+labels[item.reminderStatus]+(item.reminderDate?' · '+item.reminderDate:'')),
      node('small','Версия: '+item.version+' · Оператор: '+(item.operator||'—')+
        ' · Время: '+(item.changedAt||'—')+' · Причина: '+(item.reason||'—')));
    type.value=item.type;date.value=item.reminderDate||'';date.disabled=item.type==='perpetual';
    domain.value=item.domain||'';licenceReason.value='';
    saveLicence.disabled=false;pauseLicence.disabled=item.paused;resumeLicence.disabled=!item.paused;
  }
  type.onchange=()=>{
    date.disabled=type.value==='perpetual';
    if(date.disabled)date.value='';
    else if(!date.value)date.value=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
  };
  choice.onchange=displayLicence;
  async function loadLicenses(){
    const previous=choice.value;
    licenceRows=(await H.api('/api/licenses')).licenses;
    choice.replaceChildren();listing.replaceChildren();
    const counts={overdue:0,today:0,soon:0,paused:0};
    const priority={overdue:0,today:1,soon:2,scheduled:3,none:4};
    for(const item of licenceRows){if(item.paused)counts.paused++;if(item.reminderStatus in counts)counts[item.reminderStatus]++;}
    totals.textContent='Просрочено: '+counts.overdue+' · Сегодня: '+counts.today+' · Скоро: '+counts.soon+
      ' · Ручная пауза: '+counts.paused+' · Всего сайтов: '+licenceRows.length;
    for(const item of [...licenceRows].sort((a,b)=>priority[a.reminderStatus]-priority[b.reminderStatus]||a.title.localeCompare(b.title))){
      const opt=node('option',item.title+' · '+item.siteId);opt.value=item.siteId;choice.append(opt);
      const row=node('article');row.className='hosted-audit-event';row.dataset.reminder=item.reminderStatus;
      row.append(node('strong',item.title+' · '+item.siteId),
        node('small',(item.domain||'Домен не указан')+' · '+(item.type==='subscription'?'Подписка':'Бессрочная')+
          ' · '+labels[item.reminderStatus]+' · '+(item.paused?'На паузе':'Активна')),
        button('Открыть','',()=>{choice.value=item.siteId;displayLicence();}));
      listing.append(row);
    }
    if(!licenceRows.length)listing.append(node('p','Пока нет сайтов.'));
    choice.value=licenceRows.some(r=>r.siteId===previous)?previous:(licenceRows[0]?.siteId||'');
    displayLicence();
  }
  async function changeLicence(operation){
    const item=chosen();if(!item)throw Error('Выберите сайт');
    const why=licenceReason.value.trim();if(!why)throw Error('Укажите причину');
    if(operation==='pause'&&!confirm('Приостановить только CMS сайта '+item.title+'? Публичный сайт останется доступен.'))return;
    const payload={expectedVersion:item.version,reason:why};
    if(operation==='details'){
      payload.type=type.value;payload.reminderDate=type.value==='subscription'?date.value:null;
      payload.domain=domain.value.trim().toLowerCase();
    }
    await H.api('/api/licenses/'+encodeURIComponent(item.siteId)+(operation==='details'?'':'/'+operation),'POST',payload);
    await H.refreshSites();await loadLicenses();
    H.notice(operation==='pause'?'CMS на паузе. Опубликованный сайт работает.':
      operation==='resume'?'CMS снова доступна для правок и публикации.':'Условия лицензии сохранены.');
  }
  const passwordDialog=dialog('Смена своего пароля','server-password-dialog');
  passwordDialog.append(node('p','После смены пароля все ваши сессии завершатся. Потребуется войти с новым паролем.'));
  const currentPassword=field('server-password-current','password');currentPassword.autocomplete='current-password';
  const nextPassword=field('server-password-next','password');nextPassword.autocomplete='new-password';
  passwordDialog.append(label('Текущий пароль',currentPassword),currentPassword,label('Новый пароль (минимум 14 символов)',nextPassword),nextPassword,
    button('Изменить пароль','server-password-change',()=>run(async()=>{
      await H.api('/api/password','POST',{currentPassword:currentPassword.value,newPassword:nextPassword.value});
      currentPassword.value='';nextPassword.value='';passwordDialog.close();H.lock();H.notice('Пароль изменён. Войдите заново.');
    })),button('Закрыть','server-password-close',()=>{currentPassword.value='';nextPassword.value='';passwordDialog.close();}));
  function draw(){
    const p=H.principal();identity.textContent=p?p.username+' · '+p.role:'';
    manage.hidden=audit.hidden=licencesOpen.hidden=p?.role!=='owner';change.hidden=!p;
    manage.disabled=audit.disabled=licencesOpen.disabled=change.disabled=running;
    if(!p){password.value='';currentPassword.value='';nextPassword.value='';for(const d of dialogs)d.close();}
    if(!p||p.role!=='owner'){usersDialog.close();auditDialog.close();licencesDialog.close();}
  }
  window.addEventListener('stage3-session',draw);draw();
})();
