'use strict';
/* Stage2 offline MULTIPAGE product preview. No API, auth, server writes or publishing. */
(()=>{
  const C=window.CmsPreviewContent,P=window.CmsPreviewProject,
    R=window.CmsPreviewRender,E=window.AiSiteCmsEditorStage2,X=window.CmsPreviewExport;
  const $=id=>document.getElementById(id);
  const ui={list:$('sections'),frame:$('preview'),fields:$('fields'),title:$('site-title'),theme:$('theme'),
    count:$('count'),info:$('selection-info'),status:$('status'),addType:$('new-type'),browser:$('browser'),
    versions:$('versions'),saveState:$('save-state'),save:$('save'),undo:$('undo'),redo:$('redo'),
    pageList:$('page-list'),pageTitle:$('page-title'),slug:$('page-slug'),
    seoTitle:$('seo-title'),seoDescription:$('seo-description'),
    seoSnippetTitle:$('seo-snippet-title'),seoSnippetDescription:$('seo-snippet-description'),
    seoSnippetUrl:$('seo-snippet-url'),previewUrl:$('preview-url'),audit:$('audit-results'),auditCount:$('audit-count'),sectionVisible:$('section-visible')};
  const storageKey='ai-site-cms-stage2-preview-local-v1',LIMIT=8;
  const reviewKey='ai-site-cms-stage2-preview-feedback-v1',MAX_REVIEW=50;
  let project=P.template(),pageId=project.pages[0].id,doc,selection='',editor=null,
      dirty=false,records=[],storageOK=false;
  let saved='',undo=[],redo=[],lastType='',lastAt=0,focus='page',toastTimer;
  let review=[];
  const snapshot=()=>JSON.stringify(project);
  const activePage=()=>project.pages.find(p=>p.id===pageId);
  const pageDoc=()=>P.pageDoc(project,activePage());
  function bind(){doc=pageDoc();}
  let overviewMode=false;
  function renderOverview(){
    $('overview-name').textContent=project.siteTitle;
    $('overview-pages').textContent=String(project.pages.length);
    $('overview-sections').textContent=String(project.pages.reduce((n,p)=>n+p.sections.length,0));
    const issues=P.audit(project);
    $('overview-issues').textContent=String(issues.length);
    const list=$('overview-page-list');list.replaceChildren();
    project.pages.forEach(pg=>{
      const b=document.createElement('button');
      b.type='button';b.className='overview-page';
      const a=document.createElement('span');
      const title=document.createElement('strong');title.textContent=pg.title;
      const path=document.createElement('small');path.textContent=pg.slug?'/'+pg.slug:'Главная';
      a.append(title,path);
      const details=document.createElement('span');details.textContent=pg.sections.length+' секций';
      const arrow=document.createElement('span');arrow.textContent='↗';
      b.append(a,details,arrow);
      b.addEventListener('click',()=>{selectPage(pg.id);showOverview(false);});
      list.append(b);
    });
    const audit=$('overview-audit');audit.replaceChildren();
    if(!issues.length){
      const ok=document.createElement('p');
      ok.textContent='Базовые замечания отсутствуют. Это не SEO-аудит опубликованного сайта.';
      ok.className='overview-audit-ok';audit.append(ok);
    }else{
      issues.slice(0,10).forEach(issue=>{
        const b=document.createElement('button');
        b.type='button';b.className='overview-audit-item';
        const title=document.createElement('strong');title.textContent=issue.pageTitle;
        const detail=document.createElement('span');detail.textContent=issue.message;
        b.append(title,detail);
        b.addEventListener('click',()=>{selectPage(issue.pageId);showOverview(false);document.querySelector('.page-settings').open=true;});
        audit.append(b);
      });
      if(issues.length>10){
        const more=document.createElement('p');
        more.textContent='Ещё замечаний: '+(issues.length-10);audit.append(more);
      }
    }
  }
  function showOverview(active){
    overviewMode=active;
    document.querySelector('.workspace').classList.toggle('is-overview',active);
    $('site-overview').hidden=!active;
    $('overview-open').classList.toggle('is-active',active);
    $('overview-editor').classList.toggle('is-active',!active);
    $('overview-open').setAttribute('aria-pressed',String(active));
    $('overview-editor').setAttribute('aria-pressed',String(!active));
    document.querySelector('.canvas .preview-stage').hidden=active;
    document.querySelector('.canvas .canvas-caption').hidden=active;
    document.querySelector('.canvas .preview-controls').hidden=active;
    if(active)renderOverview();
    $('canvas-title').textContent=active?'Структура и состояние сайта':'Предпросмотр изменений';
  }
  function toast(message,error=false){
    clearTimeout(toastTimer);ui.status.textContent=message;
    ui.status.className='status show'+(error?' error':'');
    toastTimer=setTimeout(()=>ui.status.className='status',4000);
  }
  function readReview(){
    try{
      const raw=localStorage.getItem(reviewKey);
      if(!raw)return;
      const all=JSON.parse(raw);
      if(!Array.isArray(all))throw Error('Invalid review notes');
      review=all.slice(0,MAX_REVIEW).filter(n=>n&&typeof n==='object'
        &&typeof n.text==='string'&&n.text.length<=2000
        &&typeof n.project==='string'&&typeof n.page==='string'
        &&typeof n.block==='string'&&typeof n.kind==='string'
        &&typeof n.at==='number'&&Number.isFinite(n.at));
    }catch(_){review=[];toast('Не удалось открыть локальные заметки. Для новых замечаний доступен экспорт',true);}
  }
  function writeReview(){
    try{localStorage.setItem(reviewKey,JSON.stringify(review));return true;}
    catch(_){toast('Не удалось сохранить замечания в браузере. Скачайте файл с замечаниями',true);return false;}
  }
  function showReview(){
    const pg=activePage(),section=current(),name=section?C.definitions[section.type].label:'Страница';
    $('review-context').textContent='Текущий блок: '+pg.title+' / '+name;
    $('review-count').textContent=String(review.length);
    $('review-list').replaceChildren();
    if(!review.length){
      const empty=document.createElement('p');empty.className='review-empty';
      empty.textContent='Замечаний пока нет. Выберите блок на макете и добавьте первое.';
      $('review-list').append(empty);
    }
    review.forEach((n,index)=>{
      const entry=document.createElement('div');entry.className='review-entry';
      const head=document.createElement('strong');head.textContent=n.kind+' · '+n.page+' · '+n.block;
      const message=document.createElement('p');message.textContent=n.text;
      const del=document.createElement('button');del.type='button';del.className='text-button';
      del.textContent='Удалить';del.setAttribute('aria-label','Удалить замечание '+(index+1));
      del.addEventListener('click',()=>{review.splice(index,1);writeReview();showReview();});
      entry.append(head,message,del);$('review-list').append(entry);
    });
    $('review-export').disabled=review.length===0;
    $('review-clear').disabled=review.length===0;
  }
  function addReview(){
    const text=$('review-text').value.trim();
    if(!text)return toast('Напишите, что нужно поправить',true);
    if(review.length>=MAX_REVIEW)return toast('Собрано 50 замечаний. Экспортируйте и очистите список',true);
    const pg=activePage(),section=current();
    review.push({at:Date.now(),project:project.siteTitle,page:pg.title,slug:pg.slug,
      block:section?C.definitions[section.type].label:'Страница',
      kind:$('review-kind').value,text});
    writeReview();$('review-text').value='';showReview();
    toast('Замечание добавлено. Скачайте все замечания одним файлом');
  }
  function exportReview(){
    if(!review.length)return;
    const lines=['# Замечания по макету AI Site CMS','','Демонстрационный Stage 2 редактор; это НЕ формальная приёмка.','',
      ...review.flatMap((n,i)=>[
        '## '+(i+1)+'. '+n.kind+' — '+n.page+' / '+n.block,
        '',
        'Проект: '+n.project,
        'Страница: /'+(n.slug||''),
        'Добавлено: '+new Date(n.at).toLocaleString('ru-RU'),
        '',
        n.text,''
      ])];
    const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/markdown;charset=utf-8'}));
    const a=document.createElement('a');
    a.href=url;a.download='ai-site-cms-preview-feedback.md';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Все замечания скачаны в одном файле Markdown');
  }
  function auditUI(){
    ui.audit.replaceChildren();
    const warnings=P.audit(project);
    ui.auditCount.textContent=warnings.length?'Замечаний: '+warnings.length:'Замечаний нет';
    if(!warnings.length){
      const p=document.createElement('p');p.className='audit-ok';
      p.textContent='Базовая проверка структуры и SEO не нашла замечаний. Это не SEO-аудит реального сайта.';
      ui.audit.append(p);return;
    }
    for(const notice of warnings){
      const button=document.createElement('button');button.type='button';
      button.className='audit-item';
      const page=document.createElement('strong');page.textContent=notice.pageTitle;
      const info=document.createElement('span');info.textContent=notice.message;
      button.append(page,info);
      button.addEventListener('click',()=>{selectPage(notice.pageId);document.querySelector('.page-settings').open=true;});
      ui.audit.append(button);
    }
  }
  function indicators(){
    dirty=snapshot()!==saved;
    ui.undo.disabled=!undo.length;ui.redo.disabled=!redo.length;ui.save.disabled=!storageOK;
    ui.saveState.textContent=!storageOK?'Локальное хранилище недоступно — экспортируйте JSON':
      dirty?'● Изменения не сохранены':(records.length?'✓ Локальная версия сохранена':'Новый проект · ещё не сохранён');
    ui.saveState.classList.toggle('unsaved',dirty);
    $('head-save-state').textContent=dirty?'● Не сохранено':records.length?'✓ Локально сохранено':'● Новый черновик';
    $('head-save-state').classList.toggle('unsaved',dirty);
  }
  function renderPageTree(){
    const tree=$('page-tree');
    tree.replaceChildren();
    for(const pg of project.pages){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='page-tree-item'+(pg.id===pageId?' is-active':'');
      btn.dataset.pageId=pg.id;
      if(pg.id===pageId)btn.setAttribute('aria-current','page');
      const icon=document.createElement('span');
      icon.className='page-tree-icon';
      icon.textContent=pg.slug===''?'⌂':'▤';
      const name=document.createElement('span');
      name.className='page-tree-label';
      name.textContent=pg.title;
      const hint=document.createElement('small');
      hint.textContent=pg.slug?'/'+pg.slug:'Главная';
      name.append(hint);
      btn.append(icon,name);
      btn.addEventListener('click',()=>selectPage(pg.id));
      tree.append(btn);
    }
  }
  function pageUI(){
    const p=activePage();
    ui.pageList.replaceChildren();
    project.pages.forEach(pg=>{
      const option=document.createElement('option');
      option.value=pg.id;option.textContent=(pg.slug===''?'⌂ ':'')+pg.title;
      ui.pageList.append(option);
    });
    ui.pageList.value=pageId;
    $('page-in-menu').checked=p.inMenu;
    $('page-in-menu').disabled=p.slug==='';
    renderPageTree();
    $('active-breadcrumb').textContent=project.siteTitle+' / '+p.title;
    ui.pageTitle.value=p.title;ui.slug.value=p.slug;ui.seoTitle.value=p.seoTitle;
    ui.seoDescription.value=p.seoDescription;
    ui.slug.disabled=p.slug==='';
    $('page-delete').disabled=project.pages.length<=1||p.slug==='';
    $('page-add').disabled=project.pages.length>=P.MAX_PAGES;
    $('page-copy').disabled=project.pages.length>=P.MAX_PAGES;
    const order=project.pages.findIndex(pg=>pg.id===pageId);
    $('page-up').disabled=order<=1;
    $('page-down').disabled=order===0||order===project.pages.length-1;
    const target=$('copy-target'),previous=target.value;
    target.replaceChildren();
    project.pages.filter(pg=>pg.id!==pageId).forEach(pg=>{
      const option=document.createElement('option');option.value=pg.id;option.textContent=pg.title;
      target.append(option);
    });
    if([...target.options].some(option=>option.value===previous))target.value=previous;
    $('copy-section').disabled=!target.options.length;
    auditUI();
    ui.previewUrl.textContent='demo.local'+(p.slug?'/'+p.slug:'/');
    ui.seoSnippetTitle.textContent=p.seoTitle;
    ui.seoSnippetDescription.textContent=p.seoDescription||'Добавьте SEO-описание страницы для поисковой выдачи.';
    ui.seoSnippetUrl.textContent='https://demo.local/'+(p.slug||'');
  }
  function bindPreviewClicks(){
    // Only static, strictly escaped renderer HTML is ever used as iframe srcdoc.
    // Same-origin permits attaching listeners from the parent, but the sandbox
    // deliberately does NOT allow scripts, popups, forms or top navigation.
    let body;
    try{body=ui.frame.contentDocument;}catch(_){return;}
    if(!body)return;
    body.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&document.body.classList.contains('preview-expanded')){
        e.preventDefault();expandPreview();
      }
    });
    body.querySelectorAll('[data-preview-page]').forEach(button=>{
      button.addEventListener('click',()=>selectPage(button.dataset.previewPage));
    });
    body.querySelectorAll('[data-preview-section]').forEach(section=>{
      section.setAttribute('tabindex','0');
      section.setAttribute('aria-label','Выбрать блок сайта');
      function activate(e){
        if(e.type==='click'&&e.target.closest('a,button,input,select,textarea,summary'))return;
        if(e.type==='keydown'){
          if(e.key!=='Enter'&&e.key!==' ')return;
          e.preventDefault();
        }
        select(section.dataset.previewSection);
      }
      section.addEventListener('click',activate);
      section.addEventListener('keydown',activate);
    });
  }
  function preview(){
    try{
      const p=activePage();
      ui.frame.srcdoc=R.render(doc,selection,focus==='section',{
        seoTitle:p.seoTitle,seoDescription:p.seoDescription,
        menu:project.pages.filter(x=>x.inMenu).map(x=>({id:x.id,title:x.title,slug:x.slug})),
        active:pageId,hiddenSections:p.hiddenSections,...project.settings
      });
      ui.count.textContent=doc.sections.length+' блоков';
      ui.seoSnippetTitle.textContent=p.seoTitle;
      ui.seoSnippetDescription.textContent=p.seoDescription||'Добавьте SEO-описание страницы для поисковой выдачи.';
      ui.seoSnippetUrl.textContent='https://demo.local/'+(p.slug||'');
      ui.previewUrl.textContent='demo.local/'+(p.slug||'');
    }catch(e){toast(e.message,true);}
  }
  function changed(){indicators();preview();auditUI();renderOverview();}
  function checkpoint(type,coalesce=false){
    const now=Date.now();
    if(!(coalesce&&lastType===type&&now-lastAt<1200)){
      undo.push(snapshot());if(undo.length>60)undo.shift();
    }
    lastType=type;lastAt=now;redo=[];
  }
  const current=()=>doc.sections.find(s=>s.id===selection);
  function tiny(symbol,label,callback,disabled){
    const b=document.createElement('button');b.type='button';b.className='tiny';
    b.textContent=symbol;b.title=label;b.setAttribute('aria-label',label);b.disabled=!!disabled;
    b.addEventListener('click',e=>{e.stopPropagation();callback();});return b;
  }
  function listing(){
    ui.list.replaceChildren();
    const search=$('section-search').value.trim().toLowerCase();
    let visible=0;
    doc.sections.forEach((s,i)=>{
      const description=Object.values(s.props).find(x=>typeof x==='string'&&x)||'';
      if(search&&!((C.definitions[s.type].label+' '+description).toLowerCase().includes(search)))return;
      visible++;
      const li=document.createElement('li'),active=s.id===selection;
      li.className='section-row'+(active?' selected':'')+(activePage().hiddenSections.includes(s.id)?' is-hidden':'');
      const pick=document.createElement('button');pick.type='button';pick.className='section-select';
      pick.title='Редактировать блок';pick.setAttribute('aria-pressed',String(active));
      const icon=document.createElement('span');icon.className='section-icon';
      icon.textContent=C.definitions[s.type].icon;icon.setAttribute('aria-hidden','true');
      const names=document.createElement('span');names.className='section-names';
      const name=document.createElement('strong');name.textContent=C.definitions[s.type].label;
      const subtitle=document.createElement('small');
      subtitle.textContent=Object.values(s.props).find(x=>typeof x==='string'&&x)||'Без текста';
      names.append(name,subtitle);
      if(activePage().hiddenSections.includes(s.id)){
        const mark=document.createElement('small');mark.className='visibility-label';mark.textContent='Скрыта на сайте';
        names.append(mark);
      }
      pick.append(icon,names);
      pick.addEventListener('click',()=>select(s.id));
      const tools=document.createElement('div');tools.className='section-actions';
      tools.append(tiny('↑','Поднять блок выше',()=>move(i,-1),i===0),
        tiny('↓','Опустить блок ниже',()=>move(i,1),i===doc.sections.length-1),
        tiny('⧉','Дублировать блок',()=>duplicate(i),doc.sections.length>=12),
        tiny('×','Удалить блок',()=>remove(i),doc.sections.length<=1),
        tiny(activePage().hiddenSections.includes(s.id)?'◌':'◉',
          activePage().hiddenSections.includes(s.id)?'Показать секцию':'Скрыть секцию',
          ()=>toggleSection(s.id,activePage().hiddenSections.includes(s.id)),false));
      li.append(pick,tools);ui.list.append(li);
    });
    $('section-empty').hidden=visible!==0;
  }
  function mount(){
    if(editor){editor.destroy();editor=null;}
    const s=current();if(!s)return;
    ui.sectionVisible.checked=!activePage().hiddenSections.includes(s.id);
    ui.sectionVisible.disabled=false;
    ui.info.textContent=C.definitions[s.type].label+' · меняйте свойства выбранной страницы';
    ui.fields.replaceChildren();
    editor=E.mount({container:ui.fields,schema:C.schema(s.type),data:s.props,onChange(value){
      const live=current();
      if(!live||live.id!==s.id||JSON.stringify(live.props)===JSON.stringify(value))return;
      checkpoint('field:'+pageId+':'+s.id,true);
      live.props=value;changed();listing();
    }});
  }
  function apply(next,preferredPage,preferredSection){
    const valid=P.normalize(next);
    if(editor){editor.destroy();editor=null;}
    project=valid;
    $('site-header-note').value=project.settings.headerNote;
    $('site-footer-note').value=project.settings.footerNote;
    $('site-navigation').checked=project.settings.showNavigation;
    pageId=project.pages.some(p=>p.id===preferredPage)?preferredPage:project.pages[0].id;
    bind();
    selection=doc.sections.some(s=>s.id===preferredSection)?preferredSection:doc.sections[0].id;
    ui.title.value=project.siteTitle;ui.theme.value=project.theme;lastType='';
    pageUI();listing();mount();changed();showReview();
  }
  function selectPage(id){
    if(!project.pages.some(p=>p.id===id)||id===pageId)return;
    if(editor){editor.destroy();editor=null;}
    pageId=id;bind();selection=doc.sections[0].id;lastType='';
    $('section-search').value='';
    pageUI();listing();mount();preview();showReview();renderOverview();
  }
  function select(id){if(id===selection)return;selection=id;lastType='';listing();mount();preview();showReview();}
  function pageAdd(duplicate=false){
    if(project.pages.length>=P.MAX_PAGES)return toast('Максимум восемь страниц',true);
    checkpoint('pages');
    const page=P.createPage(project,duplicate?activePage():null);
    project.pages.push(page);selectPage(page.id);changed();
    toast(duplicate?'Страница продублирована':'Страница добавлена');
  }
  function pageMove(direction){
    const index=project.pages.findIndex(p=>p.id===pageId),next=index+direction;
    if(index<=0||next<=0||next>=project.pages.length)return;
    checkpoint('page-order');
    const item=project.pages.splice(index,1)[0];
    project.pages.splice(next,0,item);
    pageUI();changed();toast('Порядок страниц изменён');
  }
  function copySection(){
    const target=project.pages.find(p=>p.id===$('copy-target').value),source=current();
    if(!target||!source)return;
    if(target.sections.length>=12)return toast('На целевой странице уже 12 блоков',true);
    checkpoint('copy-section');
    const copy=C.createSection(source.type);
    copy.props=structuredClone(source.props);
    target.sections.push(copy);
    selectPage(target.id);select(copy.id);changed();
    toast('Блок скопирован на выбранную страницу');
  }
  function pageDelete(){
    const p=activePage();
    if(p.slug===''||project.pages.length<=1)return toast('Главную страницу удалить нельзя',true);
    if(!confirm('Удалить страницу «'+p.title+'»? Изменение можно отменить.'))return;
    checkpoint('pages');project.pages=project.pages.filter(x=>x.id!==pageId);
    selectPage(project.pages[0].id);changed();toast('Страница удалена — можно отменить');
  }
  function editSettings(field,value){
    if(project.settings[field]===value)return;
    if((field==='headerNote'&&value.length>120)||(field==='footerNote'&&value.length>180)||String(value).includes('\0')){
      toast('Некорректная длина настройки сайта',true);return;
    }
    checkpoint('settings:'+field,true);project.settings[field]=value;
    changed();toast('Настройки сайта изменены в локальном черновике');
  }
  function toggleSection(id,show){
    const p=activePage(),s=p.sections.find(s=>s.id===id);
    if(!s)return;
    const hidden=p.hiddenSections.includes(id);
    if(hidden===!show)return;
    if(!show&&p.sections.length-p.hiddenSections.length<=1){
      toast('Нужно оставить минимум одну видимую секцию на странице',true);
      ui.sectionVisible.checked=true;return;
    }
    checkpoint('section-visibility');
    p.hiddenSections=show?p.hiddenSections.filter(k=>k!==id):[...p.hiddenSections,id];
    listing();mount();changed();
    toast(show?'Секция снова видима на сайте':'Секция скрыта на сайте и сохранена для редактирования');
  }
  function editPage(field,value){
    const p=activePage();
    if(p[field]===value)return;
    if(field==='slug'){
      if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)||value.length>70
        ||project.pages.some(x=>x!==p&&x.slug===value)){
        toast('Адрес: только a-z, 0-9 и дефис; адрес должен быть уникальным',true);
        ui.slug.value=p.slug;return;
      }
    }
    if(field==='title'&&(!value||value.length>90)){toast('Название страницы: 1–90 символов',true);return;}
    if(field==='seoTitle'&&(!value||value.length>70)){toast('SEO-заголовок: 1–70 символов',true);return;}
    checkpoint('page:'+pageId+':'+field,true);p[field]=value;
    if(field==='title'||field==='slug'||field==='inMenu')pageUI();
    changed();
  }
  function move(i,delta){
    const to=i+delta;if(to<0||to>=doc.sections.length)return;
    checkpoint('structure');const s=doc.sections.splice(i,1)[0];
    doc.sections.splice(to,0,s);listing();changed();toast('Порядок блоков изменён');
  }
  function remove(i){
    if(doc.sections.length<=1)return;
    checkpoint('structure');const s=doc.sections.splice(i,1)[0];
    activePage().hiddenSections=activePage().hiddenSections.filter(id=>id!==s.id);
    if(s.id===selection)selection=doc.sections[Math.min(i,doc.sections.length-1)].id;
    listing();mount();changed();toast('Блок удалён');
  }
  function duplicate(i){
    if(doc.sections.length>=12)return toast('Максимум 12 блоков',true);
    checkpoint('structure');const source=doc.sections[i],copy=C.createSection(source.type);
    copy.props=structuredClone(source.props);doc.sections.splice(i+1,0,copy);selection=copy.id;
    listing();mount();changed();toast('Блок дублирован');
  }
  function add(){
    if(doc.sections.length>=12)return toast('Максимум 12 блоков',true);
    checkpoint('structure');const s=C.createSection(ui.addType.value);
    doc.sections.push(s);selection=s.id;listing();mount();changed();toast('Блок добавлен');
  }
  function travel(which){
    const from=which==='undo'?undo:redo,to=which==='undo'?redo:undo;
    if(!from.length)return;to.push(snapshot());
    apply(JSON.parse(from.pop()),pageId,selection);
    toast(which==='undo'?'Изменение отменено':'Изменение повторено');
  }
  function starter(){
    const kind=$('starter-type').value;
    if(!confirm('Заменить текущий демонстрационный проект готовой заготовкой? При необходимости сначала сохраните JSON.'))return;
    checkpoint('starter');
    apply(P.starter(kind));
    toast('Открыта многостраничная заготовка. Тексты и контакты — демонстрационные');
  }
  function downloadSite(){
    let zip;
    try{zip=X.build(project);}catch(e){toast('Не удалось собрать сайт: '+e.message,true);return;}
    const url=URL.createObjectURL(zip),a=document.createElement('a');
    a.href=url;a.download='ai-site-cms-offline-demo-site.zip';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
    toast('Демо-сайт скачан: HTML-страницы, навигация и JSON. Это не публикация');
  }
  function exports(){
    let bytes;
    try{bytes=JSON.stringify(P.validate(project),null,2)+'\n';}
    catch(e){return toast('Ошибка проекта: '+e.message,true);}
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='ai-site-cms-multipage-preview.json';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Все страницы экспортированы в один JSON. На сервер ничего не отправлено');
  }
  async function imports(file){
    if(!file)return;if(file.size>500000)return toast('Максимум 500 КБ для JSON',true);
    try{
      const valid=P.normalize(JSON.parse(await file.text()));
      if(dirty&&!confirm('Заменить несохранённые изменения импортированным проектом?'))return;
      checkpoint('import');apply(valid);toast('Проект импортирован. Для сохранения нажмите «Сохранить локально»');
    }catch(e){toast('Ошибка импорта: '+e.message,true);}
  }
  function readSaved(){
    try{
      const store=localStorage,probe=storageKey+'-probe';
      store.setItem(probe,'1');store.removeItem(probe);storageOK=true;
      const raw=store.getItem(storageKey);if(!raw)return;
      const value=JSON.parse(raw);
      if(!Array.isArray(value)||value.length>LIMIT)throw Error('Неверный формат');
      records=value.map(r=>{
        if(!r||typeof r.at!=='number'||!Number.isFinite(r.at)||r.at<=0||r.at>Date.now()+86400000)
          throw Error('Неверная дата');
        return {at:r.at,doc:P.normalize(r.doc)};
      });
    }catch(e){
      records=[];toast(storageOK?'Локальные версии повреждены. Используйте резервный JSON':
        'Хранилище браузера недоступно — пользуйтесь экспортом JSON',true);
    }
  }
  function versions(){
    ui.versions.replaceChildren();
    if(!storageOK||!records.length){
      const li=document.createElement('li');li.textContent=storageOK?
        'Здесь появятся ваши сохранённые версии':'Доступен только экспорт JSON';
      ui.versions.append(li);return;
    }
    records.forEach((r,i)=>{
      const li=document.createElement('li'),caption=document.createElement('span');
      caption.textContent=new Date(r.at).toLocaleString('ru-RU')+' · '+r.doc.pages.length+' стр.';
      const b=document.createElement('button');b.type='button';b.className='tiny restore';
      b.textContent='Открыть';b.setAttribute('aria-label','Открыть локальную версию '+(i+1));
      b.addEventListener('click',()=>{
        if(dirty&&!confirm('Заменить текущие несохранённые изменения?'))return;
        checkpoint('restore');apply(r.doc,pageId);toast('Версия открыта. Сохраните её для закрепления');
      });
      li.append(caption,b);ui.versions.append(li);
    });
  }
  function save(){
    if(!storageOK)return;
    try{
      const valid=P.validate(project),currentJSON=JSON.stringify(valid);
      if(currentJSON!==saved||!records.length){
        const next=[{at:Date.now(),doc:valid},...records].slice(0,LIMIT);
        localStorage.setItem(storageKey,JSON.stringify(next));records=next;
      }
      saved=currentJSON;versions();indicators();
      toast('Все страницы сохранены только в этом браузере, не на сервере');
    }catch(e){toast('Сохранение недоступно. Экспортируйте резервный JSON',true);}
  }
  function expandPreview(){
    const expanded=document.body.classList.toggle('preview-expanded');
    const button=$('expand-preview');
    button.textContent=expanded?'↙ Вернуться в редактор':'⤢ Развернуть';
    button.setAttribute('aria-pressed',String(expanded));
    ui.frame.focus();
  }
  function init(){
    if(!C||!P||!R||!E||!X){
      ui.status.textContent='Соберите Jedison: cd cms/editor && npm ci && npm run build';
      ui.status.className='status show error';return;
    }
    for(const type of C.types){
      const option=document.createElement('option');option.value=type;
      option.textContent=C.definitions[type].label;ui.addType.append(option);
    }
    ui.frame.addEventListener('load',bindPreviewClicks);
    $('expand-preview').addEventListener('click',expandPreview);
    readSaved();readReview();if(records.length)project=P.normalize(records[0].doc);
    saved=snapshot();apply(project);versions();
    $('overview-open').addEventListener('click',()=>showOverview(true));
    $('overview-editor').addEventListener('click',()=>showOverview(false));
    $('add').addEventListener('click',add);
    $('section-search').addEventListener('input',listing);
    document.addEventListener('click',e=>{
      const menu=$('project-actions');
      if(menu.open&&!menu.contains(e.target))menu.open=false;
    });
    $('site-header-note').addEventListener('input',()=>editSettings('headerNote',$('site-header-note').value));
    $('site-footer-note').addEventListener('input',()=>editSettings('footerNote',$('site-footer-note').value));
    $('site-navigation').addEventListener('change',()=>editSettings('showNavigation',$('site-navigation').checked));
    ui.sectionVisible.addEventListener('change',()=>{const s=current();if(s)toggleSection(s.id,ui.sectionVisible.checked);});
    $('page-in-menu').addEventListener('change',()=>editPage('inMenu',$('page-in-menu').checked));
    $('starter-apply').addEventListener('click',starter);
    $('copy-section').addEventListener('click',copySection);
    $('download-site').addEventListener('click',downloadSite);
    $('review-add').addEventListener('click',addReview);
    $('review-export').addEventListener('click',exportReview);
    $('review-clear').addEventListener('click',()=>{
      if(!review.length||!confirm('Удалить все заметки по макету? Сначала скачайте файл.'))return;
      review=[];writeReview();showReview();
    });
    ui.pageList.addEventListener('change',()=>selectPage(ui.pageList.value));
    $('page-add').addEventListener('click',()=>pageAdd());
    $('page-copy').addEventListener('click',()=>pageAdd(true));
    $('page-delete').addEventListener('click',pageDelete);
    $('page-up').addEventListener('click',()=>pageMove(-1));
    $('page-down').addEventListener('click',()=>pageMove(1));
    ui.pageTitle.addEventListener('change',()=>{editPage('title',ui.pageTitle.value.trim());ui.pageTitle.value=activePage().title;});
    ui.slug.addEventListener('change',()=>{editPage('slug',ui.slug.value.trim().toLowerCase());ui.slug.value=activePage().slug;});
    ui.seoTitle.addEventListener('change',()=>{editPage('seoTitle',ui.seoTitle.value.trim());ui.seoTitle.value=activePage().seoTitle;});
    ui.seoDescription.addEventListener('input',()=>editPage('seoDescription',ui.seoDescription.value));
    $('reset').addEventListener('click',()=>{
      if(dirty&&!confirm('Создать новый проект и потерять несохранённые изменения?'))return;
      checkpoint('new');apply(P.template());toast('Новый проект. Старые версии доступны');
    });
    $('clear-versions').addEventListener('click',()=>{
      if(!records.length||!storageOK||!confirm('Удалить все локальные версии? Сначала экспортируйте JSON.'))return;
      try{localStorage.removeItem(storageKey);records=[];saved='';versions();indicators();toast('Локальные версии удалены');}
      catch(e){toast('Ошибка удаления локальных версий',true);}
    });
    ui.save.addEventListener('click',save);
    ui.undo.addEventListener('click',()=>travel('undo'));
    ui.redo.addEventListener('click',()=>travel('redo'));
    $('export').addEventListener('click',exports);
    $('import').addEventListener('click',()=>$('file').click());
    $('file').addEventListener('change',async e=>{await imports(e.target.files?.[0]);e.target.value='';});
    ui.title.addEventListener('input',()=>{
      if(project.siteTitle===ui.title.value)return;
      if(!ui.title.value){toast('Введите название проекта',true);return;}
      checkpoint('title',true);project.siteTitle=ui.title.value;bind();
      $('active-breadcrumb').textContent=project.siteTitle+' / '+activePage().title;
      changed();
    });
    ui.theme.addEventListener('change',()=>{
      if(project.theme===ui.theme.value)return;
      checkpoint('theme');project.theme=ui.theme.value;bind();changed();
    });
    document.querySelectorAll('[data-width]').forEach(b=>b.addEventListener('click',()=>{
      ui.browser.classList.toggle('mobile',b.dataset.width==='mobile');
      ui.browser.classList.toggle('tablet',b.dataset.width==='tablet');
      document.querySelectorAll('[data-width]').forEach(x=>{
        const active=b===x;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));
      });
    }));
    document.querySelectorAll('[data-focus]').forEach(b=>b.addEventListener('click',()=>{
      focus=b.dataset.focus;document.querySelectorAll('[data-focus]').forEach(x=>{
        const active=b===x;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));
      });preview();
    }));
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&document.body.classList.contains('preview-expanded')){
        expandPreview();return;
      }
      if(!(e.ctrlKey||e.metaKey)||e.altKey||e.key.toLowerCase()!=='z')return;
      e.preventDefault();travel(e.shiftKey?'redo':'undo');
    });
    window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  }
  init();
})();
