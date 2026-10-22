'use strict';
/* Stage2 offline MULTIPAGE product preview. No API, auth, server writes or publishing. */
(()=>{
  const C=window.CmsPreviewContent,P=window.CmsPreviewProject,
    R=window.CmsPreviewRender,E=window.AiSiteCmsEditorStage2,X=window.CmsPreviewExport,M=window.CmsPreviewMedia,
    Q=window.CmsPreviewRepeaters,L=window.CmsPreviewLibrary,O=window.CmsPreviewContentOps,
    B=window.CmsPreviewBrief,K=window.CmsPreviewQuality,W=window.CmsPreviewWorkspaces;
  const $=id=>document.getElementById(id);
  const ui={list:$('sections'),frame:$('preview'),fields:$('fields'),title:$('site-title'),theme:$('theme'),
    count:$('count'),info:$('selection-info'),status:$('status'),addType:$('new-type'),browser:$('browser'),
    versions:$('versions'),saveState:$('save-state'),save:$('save'),undo:$('undo'),redo:$('redo'),
    pageList:$('page-list'),pageTitle:$('page-title'),slug:$('page-slug'),
    seoTitle:$('seo-title'),seoDescription:$('seo-description'),
    seoSnippetTitle:$('seo-snippet-title'),seoSnippetDescription:$('seo-snippet-description'),
    seoSnippetUrl:$('seo-snippet-url'),previewUrl:$('preview-url'),audit:$('audit-results'),auditCount:$('audit-count'),sectionVisible:$('section-visible')};

  const D=window.CmsPreviewArtDirection,T=window.CmsPreviewPageRecipes,V=window.CmsPreviewCanvasEdit,S=window.CmsPreviewCanvasMedia;


  let canvasEditing=null;
  function openCanvasText(sectionId,field){
    if(directionPreview)return toast('Сначала примените или отмените просмотр дизайн-направления',true);
    const page=activePage(),section=page.sections.find(s=>s.id===sectionId);
    if(!section)return;
    canvasEditing={pageId,sectionId,field};
    $('canvas-edit-label').textContent=field.label+' · '+C.definitions[section.type].label;
    $('canvas-edit-text').maxLength=field.limit;
    $('canvas-edit-text').value=field.value;
    $('canvas-edit-error').hidden=true;
    updateCanvasEditCounter();
    $('canvas-edit-dialog').showModal();
    $('canvas-edit-text').focus();
    $('canvas-edit-text').select();
  }
  function updateCanvasEditCounter(){
    const field=canvasEditing?.field;
    $('canvas-edit-counter').textContent=$('canvas-edit-text').value.length+' / '+(field?.limit||0);
  }
  function submitCanvasEdit(event){
    event.preventDefault();
    if(!canvasEditing)return;
    try{
      const value=$('canvas-edit-text').value;
      if(value===canvasEditing.field.value){$('canvas-edit-dialog').close();canvasEditing=null;return;}
      const {pageId:pid,sectionId:sid,field}=canvasEditing;
      if(pageId!==pid)throw Error('Страница изменилась');
      const next=V.change(project,pid,sid,field,value);
      checkpoint('canvas-edit');
      apply(next,pid,sid);
      $('canvas-edit-dialog').close();canvasEditing=null;
      toast('Текст обновлён на странице, в редакторе и автономном экспорте. Можно отменить.');
    }catch(e){$('canvas-edit-error').textContent=e.message;$('canvas-edit-error').hidden=false;}
  }


  let canvasMedia=null;
  let selectedCanvasAsset='';
  function updateCanvasFocusPreview(){
    const asset=project.media.find(a=>a.id===selectedCanvasAsset);
    const x=Number($('canvas-media-focus-x').value),y=Number($('canvas-media-focus-y').value);
    $('canvas-media-focus').hidden=!asset;
    $('canvas-media-focus-x-value').textContent=x+'%';
    $('canvas-media-focus-y-value').textContent=y+'%';
    if(!asset)return;
    $('canvas-media-focus-image').src=asset.data;
    $('canvas-media-focus-image').style.objectPosition=x+'% '+y+'%';
    $('canvas-media-focus-marker').style.left=x+'%';
    $('canvas-media-focus-marker').style.top=y+'%';
  }
  function resetCanvasFocus(asset){
    $('canvas-media-focus-x').value=String(asset?.focusX??50);
    $('canvas-media-focus-y').value=String(asset?.focusY??50);
    updateCanvasFocusPreview();
  }
  function renderCanvasMediaGallery(){
    const holder=$('canvas-media-gallery');holder.replaceChildren();
    const entries=[{id:'',alt:'Без фотографии',data:null},...project.media];
    for(const asset of entries){
      const button=document.createElement('button');button.type='button';
      button.className='canvas-media-choice';
      button.dataset.assetId=asset.id;
      button.setAttribute('aria-pressed',String(selectedCanvasAsset===asset.id));
      if(asset.id){
        const image=document.createElement('img');image.src=asset.data;
        image.alt='';image.loading='lazy';button.append(image);
      }else{
        const empty=document.createElement('span');empty.className='canvas-media-empty';
        empty.textContent='∅';button.append(empty);
      }
      const name=document.createElement('span');name.textContent=asset.alt||'Без описания';
      button.append(name);
      button.addEventListener('click',()=>{
        selectedCanvasAsset=asset.id;
        $('canvas-media-alt').value=asset.id?asset.alt:'';
        $('canvas-media-alt').disabled=!asset.id;
        resetCanvasFocus(asset.id?asset:null);
        $('canvas-media-error').hidden=true;
        renderCanvasMediaGallery();
      });
      holder.append(button);
    }
    $('canvas-media-upload').disabled=project.media.length>=P.MAX_MEDIA;
  }
  function openCanvasMedia(ref,label){
    if(directionPreview)return toast('Сначала примените или отмените просмотр дизайн-направления',true);
    let id;
    try{id=S.current(project,ref);}catch(e){return toast(e.message,true);}
    canvasMedia=ref;selectedCanvasAsset=id;
    $('canvas-media-title').textContent='Фотография · '+label;
    $('canvas-media-subtitle').textContent='Выберите существующее изображение, загрузите новое или снимите назначение.';
    $('canvas-media-error').hidden=true;
    $('canvas-media-alt').value=project.media.find(m=>m.id===id)?.alt||'';
    $('canvas-media-alt').disabled=!id;
    resetCanvasFocus(project.media.find(m=>m.id===id));
    renderCanvasMediaGallery();
    $('canvas-media-dialog').showModal();
  }
  function finishCanvasMedia(id,asset=null){
    if(!canvasMedia)return;
    try{
      const ref=canvasMedia;
      if(pageId!==ref.pageId)throw Error('Страница изменилась');
      const alt=asset?asset.alt:$('canvas-media-alt').value;
      const old=S.current(project,ref);
      const original=project.media.find(m=>m.id===id);
      const focus={x:Number($('canvas-media-focus-x').value),y:Number($('canvas-media-focus-y').value)};
      if(!asset&&old===id&&(!id||original?.alt===alt&&
        (original.focusX??50)===focus.x&&(original.focusY??50)===focus.y)){
        $('canvas-media-dialog').close();return;
      }
      const next=S.change(project,ref,id,alt,asset,asset?{x:50,y:50}:focus);
      checkpoint('canvas-media');
      $('canvas-media-dialog').close();
      apply(next,ref.pageId,ref.sectionId);
      toast('Фотография обновлена в макете и HTML ZIP. Изменение можно отменить.');
    }catch(e){
      $('canvas-media-error').textContent=e.message;
      $('canvas-media-error').hidden=false;
    }
  }
  async function uploadCanvasMedia(file){
    if(!canvasMedia||!file)return;
    const button=$('canvas-media-upload');button.disabled=true;
    try{
      if(project.media.length>=P.MAX_MEDIA)throw Error('Достигнут лимит 12 фотографий');
      const decoded=await M.decode(file);
      if(!canvasMedia||!$('canvas-media-dialog').open)return;
      const asset={id:nextAssetId(),...decoded};
      finishCanvasMedia(asset.id,asset);
    }catch(e){
      if(canvasMedia){
        $('canvas-media-error').textContent=e.message;
        $('canvas-media-error').hidden=false;
      }
    }finally{if(canvasMedia)button.disabled=project.media.length>=P.MAX_MEDIA;}
  }
  const surfaceChoices=[['default','Обычный'],['soft','Светлый'],['dark','Тёмный'],['accent','Акцент'],
    ['linen','Бумажный'],['aurora','Градиент'],['frame','Рамка'],['carbon','Графит']];
  function renderSurfaceGallery(){
    const box=$('surface-gallery'),section=current();box.replaceChildren();
    if(!section)return;
    const active=activePage().sectionStyles[section.id]||'default';
    for(const [code,title] of surfaceChoices){
      const button=document.createElement('button');button.type='button';button.className='surface-swatch';
      button.setAttribute('aria-pressed',String(code===active));
      const chip=document.createElement('span');chip.className='surface-swatch-chip surface-chip-'+code;
      chip.setAttribute('aria-hidden','true');
      const text=document.createElement('span');text.textContent=title;
      button.append(chip,text);
      button.addEventListener('click',()=>editSectionSurface(code));
      box.append(button);
    }
  }
  let recipeSelection='about';
  function renderRecipeChoices(){
    const gallery=$('page-recipe-options');gallery.replaceChildren();
    for(const [key,item] of Object.entries(T.recipes)){
      const button=document.createElement('button');button.type='button';button.className='page-recipe-choice';
      button.setAttribute('aria-pressed',String(key===recipeSelection));
      const label=document.createElement('strong');label.textContent=item.label;
      const hint=document.createElement('small');hint.textContent=item.description;
      button.append(label,hint);
      button.addEventListener('click',()=>{
        recipeSelection=key;$('page-recipe-name').value=item.label;
        renderRecipeChoices();
      });
      gallery.append(button);
    }
    $('page-recipe-summary').textContent='Секции: '+T.recipes[recipeSelection].parts.map(t=>C.definitions[t].label).join(' → ')+'. SEO и адрес сформируются автоматически.';
  }
  function openPageRecipe(){
    if(project.pages.length>=P.MAX_PAGES)return toast('Максимум восемь страниц',true);
    recipeSelection='about';renderRecipeChoices();
    $('page-recipe-name').value=T.recipes[recipeSelection].label;
    $('page-recipe-direction').value='';
    $('page-recipe-error').hidden=true;
    $('page-recipe-dialog').showModal();
  }
  function createRecipePage(event){
    event.preventDefault();
    try{
      const {project:next,pageId:id}=T.create(project,recipeSelection,$('page-recipe-name').value,$('page-recipe-direction').value);
      checkpoint('page-recipe');apply(next,id);
      $('page-recipe-dialog').close();showOverview(false);
      toast('Страница добавлена: секции, SEO, контакты и композиция редактируются');
    }catch(e){$('page-recipe-error').textContent=e.message;$('page-recipe-error').hidden=false;}
  }
  let directionPreview=null;
  let directionSelection='precision';
  function renderDirections(){
    const gallery=$('direction-gallery');gallery.replaceChildren();
    for(const [key,entry] of Object.entries(D.profiles)){
      const button=document.createElement('button');button.type='button';
      button.className='direction-card';button.setAttribute('aria-pressed',String(key===directionSelection));
      button.setAttribute('aria-label',entry.name);
      const swatch=document.createElement('span');swatch.className='direction-swatch';
      swatch.style.setProperty('--direction-color',entry.color);
      for(let n=0;n<3;n++)swatch.append(document.createElement('span'));
      const name=document.createElement('strong');name.textContent=entry.name;
      const description=document.createElement('small');description.textContent=entry.description;
      button.append(swatch,name,description);
      button.addEventListener('click',()=>{
        directionSelection=key;
        if(directionPreview)stopDirectionPreview();
        renderDirections();
      });
      gallery.append(button);
    }
  }
  function stopDirectionPreview(redraw=true){
    directionPreview=null;
    $('direction-cancel').disabled=true;
    $('direction-preview-status').textContent='Предпросмотр не применяется к сохранённым данным.';
    if(redraw)preview();
  }
  function tryDirection(){
    try{
      const scope=$('direction-scope').value;
      directionPreview={candidate:D.compose(project,directionSelection,scope,pageId),scope};
      $('direction-cancel').disabled=false;
      $('direction-preview-status').textContent=scope==='all'?
        'ПРОСМОТР: новый стиль всего сайта. Текущий черновик не изменён.':
        'ПРОСМОТР: новая композиция этой страницы без изменения глобального стиля.';
      preview();
    }catch(e){stopDirectionPreview();toast(e.message,true);}
  }
  function applyDirection(){
    try{
      const scope=$('direction-scope').value;
      const candidate=D.compose(project,directionSelection,scope,pageId);
      if(JSON.stringify(project)===JSON.stringify(candidate)){stopDirectionPreview();return;}
      checkpoint('art-direction');
      apply(candidate,pageId,selection);
      toast(scope==='all'?'Дизайн всего сайта обновлён; Ctrl+Z отменит изменение':
        'Композиция страницы обновлена; Ctrl+Z отменит изменение');
    }catch(e){stopDirectionPreview();toast(e.message,true);}
  }

  const LIMIT=8;
  let workspaceStore=null,workspaceId='';
  let reviewKey='ai-site-cms-stage2-preview-feedback-v1';
  const MAX_REVIEW=50;
  let project=P.template(),pageId=project.pages[0].id,doc,selection='',editor=null,
      dirty=false,records=[],storageOK=false;
  let saved='',undo=[],redo=[],lastType='',lastAt=0,focus='page',toastTimer;
  let review=[];
  let contentPlan=null;
  let contentExcluded=new Set();
  const contentScope=()=>$('content-scope').value==='current'?pageId:'*';
  function contentMatches(){
    return O.search(project,$('content-search').value,$('content-case').checked,contentScope());
  }
  const snapshot=()=>JSON.stringify(project);
  const activePage=()=>project.pages.find(p=>p.id===pageId);
  const pageDoc=()=>P.pageDoc(project,activePage());
  function bind(){doc=pageDoc();}
  let overviewMode=false;

  function renderLinkMap(){
    const list=$('overview-link-map');list.replaceChildren();
    let ready=0,total=0,unset=0;
    for(const pg of project.pages){
      const resolved=P.resolveActions(project,pg);
      for(const section of pg.sections){
        if(!['hero','contact'].includes(section.type))continue;
        total++;
        const configured=pg.sectionActions[section.id]||'auto';
        const link=resolved[section.id],visible=!pg.hiddenSections.includes(section.id);
        if(link&&visible)ready++;else unset++;
        const entry=document.createElement('button');entry.type='button';
        entry.className='overview-link-row'+(!link||!visible?' has-warning':'');
        const meta=document.createElement('span');meta.className='overview-link-meta';
        const title=document.createElement('strong');
        title.textContent=pg.title+' / '+C.definitions[section.type].label;
        const detail=document.createElement('small');detail.textContent=
          !visible?'Секция скрыта — кнопка отсутствует на сайте':
          link?(configured==='auto'?'Автоматическая цель: ':'Настроенный переход: ')+link.href:
            'Нет доступной цели — укажите email, телефон или видимый блок';
        meta.append(title,detail);
        const state=document.createElement('span');state.className='overview-link-state';
        state.textContent=(!visible?'Скрыто':link?'Работает':'Уточнить')+' ↗';
        entry.append(meta,state);
        entry.addEventListener('click',()=>{
          if(pageId!==pg.id)selectPage(pg.id);
          select(section.id);
          showOverview(false);
          $('section-action').focus();
        });
        list.append(entry);
      }
    }
    $('overview-link-status').textContent=ready+' активных · '+unset+' требуют внимания · всего '+total;
    if(!total){
      const empty=document.createElement('p');empty.className='overview-audit-ok';
      empty.textContent='Добавьте главный экран или контактную секцию, чтобы настроить кнопку.';
      list.append(empty);
    }
  }
  function renderOverview(){
    const report=K.summarize(project);
    $('overview-name').textContent=project.siteTitle;
    renderLinkMap();
    $('overview-pages').textContent=String(project.pages.length);
    $('overview-sections').textContent=String(project.pages.reduce((n,p)=>n+p.sections.length,0));
    $('overview-issues').textContent=String(report.total);
    $('quality-attention').textContent=String(report.attention);
    $('quality-notes').textContent=String(report.notes);
    $('quality-summary').textContent=report.attention?
      'Найдены '+report.attention+' важных замечаний к содержимому. Исправьте их, затем проверьте сайт вручную.':
      'Автоматические важные замечания не обнаружены. Контент, формы и юридические сведения всё равно требуют проверки.';
    const pages=$('overview-page-list');pages.replaceChildren();
    report.pages.forEach(pg=>{
      const b=document.createElement('button');b.type='button';b.className='overview-page';
      const a=document.createElement('span'),title=document.createElement('strong');
      title.textContent=pg.title;
      const path=document.createElement('small');path.textContent=pg.slug?'/'+pg.slug:'Главная';
      a.append(title,path);
      const details=document.createElement('span');
      details.className='quality-page-details';
      details.textContent=pg.visible+'/'+pg.sections+' секций · '+pg.attention+' важных · '+pg.notes+' подсказок';
      const arrow=document.createElement('span');arrow.textContent='↗';
      b.append(a,details,arrow);
      b.addEventListener('click',()=>{selectPage(pg.id);showOverview(false);});
      pages.append(b);
    });
    const pageFilter=$('quality-page');
    const old=pageFilter.value||'all';
    pageFilter.replaceChildren();
    for(const [id,label] of [['all','Все страницы'],...report.pages.map(p=>[p.id,p.title])]){
      const option=document.createElement('option');option.value=id;option.textContent=label;
      pageFilter.append(option);
    }
    pageFilter.value=[...pageFilter.options].some(o=>o.value===old)?old:'all';
    const items=K.select(report,{level:$('quality-level').value,pageId:pageFilter.value});
    const audit=$('overview-audit');audit.replaceChildren();
    $('quality-visible').textContent='Показано '+items.length+' из '+report.total;
    if(items.length===0){
      const ok=document.createElement('p');ok.className='overview-audit-ok';
      ok.textContent=report.total?'По выбранным фильтрам замечаний нет.':'Автоматические замечания не найдены. Это не оценка безопасности и не разрешение на публикацию.';
      audit.append(ok);
    }else{
      for(const item of items){
        const b=document.createElement('button');b.type='button';
        b.className='overview-audit-item'+(item.level==='attention'?' is-attention':'');
        const head=document.createElement('strong');
        head.textContent=item.kind+' · '+item.pageTitle+(item.sectionTitle?' / '+item.sectionTitle:'');
        const description=document.createElement('span');description.textContent=item.reason;
        b.append(head,description);
        b.addEventListener('click',()=>{
          focusContentEntry(item);
          document.querySelector('.sidebar-tools').open=true;
          $('site-content-ops').open=true;
          renderContentOps();
        });
        audit.append(b);
      }
    }
    if(report.truncated){
      const remainder=document.createElement('p');remainder.className='setting-helper';
      remainder.textContent='Ещё '+report.truncated+' замечаний сверх лимита отображения (90).';
      audit.append(remainder);
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
    review=[];
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
  function focusContentEntry(entry){
    if(entry.pageId&&project.pages.some(p=>p.id===entry.pageId)){
      selectPage(entry.pageId);
      showOverview(false);
      if(entry.sectionId&&activePage().sections.some(s=>s.id===entry.sectionId)){
        select(entry.sectionId);
        document.querySelector('.inspector').scrollIntoView({block:'nearest'});
      }else{
        document.querySelector('.page-settings').open=true;
      }
    }else if(entry.scope==='global'){
      document.querySelector('.site-settings').open=true;
    }
  }
  function resetContentPlan(){
    contentPlan=null;$('content-plan-details').hidden=true;
    $('content-plan-details').replaceChildren();$('content-apply').disabled=true;
  }
  function renderContentOps(){
    if(!$('site-content-ops').open)return;
    if(contentPlan&&contentPlan.before!==snapshot())resetContentPlan();
    let readiness,found;
    try{
      readiness=O.review(project);
      found=contentMatches();
    }catch(e){$('content-results-summary').textContent=e.message;return;}
    $('content-issues').textContent=readiness.attention+' важных замечаний';
    $('content-audit-total').textContent=readiness.total+' замечаний';
    const audit=$('content-audit-list');audit.replaceChildren();
    for(const issue of readiness.issues.slice(0,14)){
      const button=document.createElement('button');button.type='button';
      button.className='content-audit-item'+(issue.level==='attention'?' is-attention':'');
      const title=document.createElement('strong');
      title.textContent=issue.pageTitle+(issue.sectionTitle?' · '+issue.sectionTitle:'');
      const body=document.createElement('span');body.textContent=issue.reason;
      button.append(title,body);
      button.addEventListener('click',()=>focusContentEntry(issue));
      audit.append(button);
    }
    if(readiness.total>14){
      const more=document.createElement('p');more.className='setting-helper';
      more.textContent='Ещё '+(readiness.total-14)+' замечаний. Это предварительная редакторская проверка.';
      audit.append(more);
    }
    if(!readiness.issues.length){
      const empty=document.createElement('p');empty.className='setting-helper';
      empty.textContent='В текущем содержимом базовых замечаний нет. Это не приёмка и не проверка опубликованного сайта.';
      audit.append(empty);
    }
    const results=$('content-results');results.replaceChildren();
    const chosen=found.entries.filter(entry=>!contentExcluded.has(O.identity(entry)));
    $('content-selection-summary').textContent='Выбрано '+chosen.length+' из '+found.entries.length+' полей';
    $('content-select-all').disabled=!found.entries.length||chosen.length===found.entries.length;
    $('content-select-none').disabled=!chosen.length;
    $('content-results-summary').textContent=$('content-search').value.trim()?
      found.entries.length+' полей / '+found.occurrences+' вхождений · '+
      (contentScope()==='*'?'весь сайт':'текущая страница')+
      (found.entries.some(r=>r.linked)?' · есть связанные с библиотекой секции':''):
      'Введите текст для поиска по всем страницам, SEO и карточкам.';
    for(const entry of found.entries.slice(0,25)){
      const wrapper=document.createElement('div');wrapper.className='content-search-hit';
      const check=document.createElement('input');check.type='checkbox';
      check.className='content-field-include';
      const key=O.identity(entry);check.checked=!contentExcluded.has(key);
      check.setAttribute('aria-label','Заменять в поле: '+(entry.pageTitle||'Сайт')+' / '+entry.label);
      check.addEventListener('change',()=>{
        if(check.checked)contentExcluded.delete(key);else contentExcluded.add(key);
        resetContentPlan();renderContentOps();
      });
      const button=document.createElement('button');button.type='button';button.className='content-hit-navigate';
      const strong=document.createElement('strong');
      strong.textContent=(entry.pageTitle?entry.pageTitle+' / ':'')+entry.label+
        (entry.hidden?' · скрыто':'')+(entry.linked?' · шаблон':'');
      const excerpt=document.createElement('span');
      excerpt.textContent=entry.value.length>135?entry.value.slice(0,135)+'…':entry.value;
      const amount=document.createElement('small');amount.textContent=entry.count+' совп.';
      button.append(strong,excerpt,amount);
      button.addEventListener('click',()=>focusContentEntry(entry));
      wrapper.append(check,button);results.append(wrapper);
    }
    if(found.entries.length>25){
      const more=document.createElement('p');more.className='setting-helper';
      more.textContent='Показаны первые 25 полей из '+found.entries.length+'. Уточните поисковую фразу.';
      results.append(more);
    }
    $('content-plan').disabled=!chosen.length;
  }
  function exportContentReport(){
    let readiness;
    try{readiness=O.review(project);}catch(e){toast('Чек-лист не готов: '+e.message,true);return;}
    const lines=[
      '# Редакторская проверка сайта',
      '',
      'Проект: '+project.siteTitle.replace(/[\r\n]/g,' '),
      'Страниц: '+project.pages.length+' · Текстовых полей: '+readiness.fields,
      'Замечаний: '+readiness.total+' · Требуют внимания: '+readiness.attention,
      '',
      'Это офлайн-подсказки для редактора. Они не подтверждают публикацию, безопасность или SEO-позиции.',
      ''
    ];
    readiness.issues.forEach((issue,i)=>{
      lines.push('## '+(i+1)+'. '+(issue.level==='attention'?'Проверить':'Информация')+
        ' — '+issue.pageTitle.replace(/[\r\n]/g,' ')+
        (issue.sectionTitle?' / '+issue.sectionTitle.replace(/[\r\n]/g,' '):''),
        '',issue.reason,'');
    });
    if(readiness.total>readiness.issues.length)
      lines.push('Осталось '+(readiness.total-readiness.issues.length)+' замечаний вне лимита отчёта.');
    if(!readiness.total)lines.push('Замечаний по базовым эвристикам нет. Не является подтверждением готовности к публикации.');
    const url=URL.createObjectURL(new Blob([lines.join('\n')+'\n'],{type:'text/markdown;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;
    a.download='ai-site-cms-editorial-checklist.md';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Редакторский чек-лист сформирован локально');
  }
  function planContentReplace(){
    resetContentPlan();
    let plan;
    try{
      const selected=contentMatches().entries.filter(entry=>!contentExcluded.has(O.identity(entry))).map(O.identity);
      plan=O.plan(project,$('content-search').value,$('content-replacement').value,
        $('content-case').checked,contentScope(),selected);
    }
    catch(e){toast(e.message,true);return;}
    const details=$('content-plan-details');details.hidden=false;
    const title=document.createElement('strong'),text=document.createElement('p');
    const linked=plan.changes.filter(change=>change.linked).length;
    title.textContent=plan.valid?
      'Будут изменены '+plan.changes.length+' полей ('+plan.occurrences+' замен)':
      'Замена не проходит проверку';
    text.textContent=!plan.valid?
      'Изменения отклонены: '+plan.error:
      (linked?'Затронуты '+linked+' полей в связанных секциях. Шаблоны останутся прежними. ':'')+
      'Ни одна страница не будет опубликована. Вся операция отменяется одной командой.';
    details.append(title,text);
    for(const change of plan.changes.slice(0,5)){
      const preview=document.createElement('div');preview.className='content-plan-row';
      const heading=document.createElement('strong');
      heading.textContent=(change.pageTitle?change.pageTitle+' / ':'')+change.label;
      const before=document.createElement('span');before.textContent='До: '+change.value.slice(0,115);
      const after=document.createElement('span');after.textContent='После: '+change.after.slice(0,115);
      preview.append(heading,before,after);details.append(preview);
    }
    const before=snapshot();
    if(plan.valid&&plan.changes.length&&JSON.stringify(plan.candidate)!==before){
      contentPlan={before,plan};$('content-apply').disabled=false;
    }
  }
  function applyContentReplace(){
    const pending=contentPlan;
    if(!pending||pending.before!==snapshot())return resetContentPlan();
    const changes=pending.plan.changes.length,occurrences=pending.plan.occurrences;
    if(!confirm('Применить '+occurrences+' замен в '+changes+
      ' полях локального черновика? Это не обновляет сохранённые шаблоны и не публикует сайт. Изменение можно отменить.'))return;
    try{
      const candidate=P.validate(pending.plan.candidate);
      checkpoint('bulk-content');
      contentPlan=null;apply(candidate,pageId,selection);
      resetContentPlan();
      renderContentOps();
      toast('Применено '+occurrences+' замен в '+changes+' полях черновика; можно отменить');
    }catch(e){resetContentPlan();toast('Замена отменена: '+e.message,true);}
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
    $('page-recipe-open').disabled=project.pages.length>=P.MAX_PAGES;
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
    renderFooterPagePicker();auditUI();
    ui.previewUrl.textContent='demo.local'+(p.slug?'/'+p.slug:'/');
    ui.seoSnippetTitle.textContent=p.seoTitle;
    ui.seoSnippetDescription.textContent=p.seoDescription||'Добавьте SEO-описание страницы для поисковой выдачи.';
    ui.seoSnippetUrl.textContent='https://demo.local/'+(p.slug||'');
  }
  let pendingSectionAnchor='';
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
      button.addEventListener('click',()=>{
        pendingSectionAnchor=button.dataset.previewAnchor||'';
        selectPage(button.dataset.previewPage);
        if(button.dataset.previewPage===pageId&&pendingSectionAnchor){
          body.getElementById(pendingSectionAnchor)?.scrollIntoView();pendingSectionAnchor='';
        }
      });
    });
    if(pendingSectionAnchor){
      body.getElementById(pendingSectionAnchor)?.scrollIntoView({block:'start'});
      pendingSectionAnchor='';
    }
    body.querySelectorAll('[data-preview-section]').forEach(section=>{
      section.setAttribute('tabindex','0');
      section.setAttribute('aria-label','Выбрать блок сайта');
      function activate(e){
        if(e.type==='click'&&e.target.closest('a,button,input,select,textarea,summary,.cms-edit-target'))return;
        if(e.type==='keydown'){
          if(e.key!=='Enter'&&e.key!==' ')return;
          e.preventDefault();
        }
        select(section.dataset.previewSection);
      }
      section.addEventListener('click',activate);
      section.addEventListener('keydown',activate);
    });

    // Add editing affordances ONLY to this script-free preview DOM, not exported HTML.
    const page=activePage();
    const hints=body.createElement('style');
    hints.textContent='.cms-edit-target:hover,.cms-edit-target:focus-visible{outline:2px dashed var(--accent);outline-offset:4px;cursor:text}.cms-edit-target{transition:outline-color .12s}';
    body.head.append(hints);
    for(const section of page.sections){
      const area=body.querySelector('[data-preview-section="'+section.id+'"]');
      if(!area)continue;
      for(const field of V.fields(section,page)){
        const el=area.querySelector(field.selector);
        if(!el)continue;
        el.classList.add('cms-edit-target');el.tabIndex=0;
        el.title='Двойной щелчок для изменения текста: '+field.label;
        el.setAttribute('aria-label','Изменить: '+field.label+' (F2)');
        el.addEventListener('dblclick',event=>{
          event.stopPropagation();
          event.preventDefault();
          openCanvasText(section.id,field);
        });
        el.addEventListener('keydown',event=>{
          if(event.key!=='F2')return;
          event.preventDefault();event.stopPropagation();
          openCanvasText(section.id,field);
        });
      }
    }

    // In-page media controls are added by Studio only; exported HTML has no edit UI.
    // All bindings resolve to stable section/item IDs, never to an array position.
    const photoStyle=body.createElement('style');
    photoStyle.textContent='.cms-photo-target{position:relative}.cms-photo-control{position:absolute;z-index:8;top:12px;right:12px;padding:8px 12px;border-radius:9px;border:1px solid #ffffffb8;background:#112536eb;color:white;font:700 12px system-ui;cursor:pointer;box-shadow:0 5px 20px #0005}.cms-photo-control:hover,.cms-photo-control:focus-visible{background:#137e9a;color:#fff;outline:3px solid #fff;outline-offset:2px}';
    body.head.append(photoStyle);
    const addPhotoControl=(host,ref,label)=>{
      if(!host)return;
      host.classList.add('cms-photo-target');
      const button=body.createElement('button');
      button.type='button';button.className='cms-photo-control';button.textContent='✎ Фото';
      button.setAttribute('aria-label','Сменить фотографию: '+label);
      button.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();openCanvasMedia(ref,label);
      });
      host.append(button);
    };
    for(const section of page.sections){
      const area=body.querySelector('[data-preview-section="'+section.id+'"]');
      if(!area)continue;
      if(section.type==='hero')addPhotoControl(area.querySelector('.hero-grid > aside'),
        {pageId,sectionId:section.id,slot:'hero'},'главный экран');
      else if(section.type==='story')addPhotoControl(area.querySelector('.story > aside'),
        {pageId,sectionId:section.id,slot:'photo'},'о компании');
      else if(['catalog','services'].includes(section.type)){
        const items=page.repeaters[section.id]||[];
        area.querySelectorAll('.studio-grid > article').forEach((host,index)=>{
          const item=items[index];
          if(item)addPhotoControl(host,{pageId,sectionId:section.id,itemId:item.id},
            'карточка '+(index+1)+' — '+item.title);
        });
      }
    }
  }
  function preview(){
    try{
      const visual=directionPreview?.candidate||project;
      const p=visual.pages.find(pg=>pg.id===pageId)||visual.pages[0];
      const visualDoc=P.pageDoc(visual,p);
      ui.frame.srcdoc=R.render(visualDoc,selection,focus==='section',{
        seoTitle:p.seoTitle,seoDescription:p.seoDescription,
        menu:visual.pages.filter(x=>x.inMenu).map(x=>({id:x.id,title:x.title,slug:x.slug})),
        active:pageId,hiddenSections:p.hiddenSections,sectionStyles:p.sectionStyles,
         design:visual.design,contacts:visual.contacts,sectionLayouts:p.sectionLayouts,
         actions:P.resolveActions(visual,p),mediaBySection:P.resolveMedia(visual,p),
         itemsBySection:P.resolveItems(visual,p),brand:P.resolveBrand(visual),
         homePageId:visual.pages.find(x=>x.slug==='').id,
         footerPages:P.resolveFooterPages(visual),canonical:P.publicPageUrl(visual,p),...visual.settings
      });
      ui.count.textContent=doc.sections.length+' блоков';
      ui.seoSnippetTitle.textContent=p.seoTitle;
      ui.seoSnippetDescription.textContent=p.seoDescription||'Добавьте SEO-описание страницы для поисковой выдачи.';
      ui.seoSnippetUrl.textContent='https://demo.local/'+(p.slug||'');
      ui.previewUrl.textContent='demo.local/'+(p.slug||'');
    }catch(e){toast(e.message,true);}
  }
  function changed(){indicators();preview();auditUI();renderOverview();renderLibrary();renderContentOps();}
  function checkpoint(type,coalesce=false){
    if(directionPreview)stopDirectionPreview(false);
    const now=Date.now();
    if(!(coalesce&&lastType===type&&now-lastAt<1200)){
      undo.push(snapshot());if(undo.length>(project.media.length?16:60))undo.shift();
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
      if(activePage().libraryLinks[s.id]){
        const recipe=project.library.find(r=>r.id===activePage().libraryLinks[s.id]);
        if(recipe){
          const label=document.createElement('small');label.className='library-section-label';
          label.textContent='↗ Шаблон · '+recipe.name;
          names.append(label);
        }
      }
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
    $('section-surface').value=activePage().sectionStyles[s.id]||'default';renderSurfaceGallery();
    syncSectionLayout();
    renderMediaPicker();renderActionPicker();renderRepeater();renderLibrary();
    ui.info.textContent=C.definitions[s.type].label+' · меняйте свойства выбранной страницы';
    ui.fields.replaceChildren();
    const repeatable=Boolean(Q.definitions[s.type]);
    const data=repeatable?Object.fromEntries(Object.entries(s.props).filter(([key])=>
      key==='title'||key==='eyebrow')):s.props;
    editor=E.mount({container:ui.fields,schema:C.schema(s.type,repeatable),data,onChange(value){
      const live=current();
      if(!live||live.id!==s.id)return;
      const next=repeatable?{...live.props,...value}:value;
      const stored=activePage().sections.find(item=>item.id===s.id);
      if(!stored)return;
      if(JSON.stringify(stored.props)===JSON.stringify(next)
        &&JSON.stringify(live.props)===JSON.stringify(next))return;
      checkpoint('field:'+pageId+':'+s.id,true);
      // The embedded editor can own a detached preview document. Always write
      // its change into the persistent page model, not just the iframe view.
      stored.props=structuredClone(next);live.props=next;
      changed();listing();
    }});
  }
  function apply(next,preferredPage,preferredSection){
    const valid=P.normalize(next);
    if(directionPreview)stopDirectionPreview(false);
    if(editor){editor.destroy();editor=null;}
    project=valid;
    $('site-header-note').value=project.settings.headerNote;
    $('site-footer-note').value=project.settings.footerNote;
    $('site-navigation').checked=project.settings.showNavigation;
    $('site-public-url').value=project.settings.publicUrl;
    syncContactsUI();syncDesignUI();
    pageId=project.pages.some(p=>p.id===preferredPage)?preferredPage:project.pages[0].id;
    bind();
    selection=doc.sections.some(s=>s.id===preferredSection)?preferredSection:doc.sections[0].id;
    ui.title.value=project.siteTitle;ui.theme.value=project.theme;lastType='';
    pageUI();listing();mount();renderMediaLibrary();changed();showReview();
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
    project.pages.push(page);selectPage(page.id);renderFooterPagePicker();changed();
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
    if(activePage().sectionStyles[source.id])target.sectionStyles[copy.id]=activePage().sectionStyles[source.id];
    if(activePage().sectionLayouts[source.id])target.sectionLayouts[copy.id]=structuredClone(activePage().sectionLayouts[source.id]);
    if(activePage().libraryLinks[source.id])target.libraryLinks[copy.id]=activePage().libraryLinks[source.id];
    if(activePage().mediaSlots[source.id])target.mediaSlots[copy.id]=structuredClone(activePage().mediaSlots[source.id]);
    if(activePage().sectionActions[source.id])target.sectionActions[copy.id]=activePage().sectionActions[source.id];
    if(activePage().repeaters[source.id]){
      target.repeaters[copy.id]=activePage().repeaters[source.id].map(item=>({
        ...structuredClone(item),id:Q.blank(source.type).id
      }));
    }
    selectPage(target.id);select(copy.id);changed();
    toast('Блок скопирован на выбранную страницу');
  }
  function renderLibrary(){
    const select=$('library-select'),previous=select.value;
    select.replaceChildren();
    const empty=document.createElement('option');empty.value='';empty.textContent='Выберите шаблон';
    select.append(empty);
    for(const recipe of project.library){
      const option=document.createElement('option');option.value=recipe.id;
      option.textContent=recipe.name+' · '+C.definitions[recipe.type].label+' · v'+recipe.revision;
      select.append(option);
    }
    if(project.library.some(r=>r.id===previous))select.value=previous;
    const picked=project.library.find(r=>r.id===select.value);
    $('library-total').textContent=project.library.length+' / 12';
    $('library-insert').disabled=!picked||doc.sections.length>=12;
    $('library-rename').disabled=!picked;
    $('library-delete').disabled=!picked;
    $('library-save').disabled=!current()||project.library.length>=12;
    $('library-usage').textContent=picked?
      'Связано с '+L.count(project,picked.id)+' секциями на страницах сайта. Изменения применяются только вручную.':
      (project.library.length?'Выберите шаблон для вставки.':'Библиотека пока пуста.');
    const s=current(),id=s&&activePage().libraryLinks[s.id];
    const linked=project.library.find(r=>r.id===id);
    $('library-link').hidden=!linked;
    if(linked){
      const count=L.count(project,linked.id),drift=L.modified(activePage(),s,linked);
      $('library-link-title').textContent='Шаблон: '+linked.name+' · v'+linked.revision;
      $('library-link-note').textContent=(drift?'Есть локальные изменения. ':'Содержимое совпадает с шаблоном. ')+
        'Связанных секций: '+count+'. Ширина, фон, видимость и действия кнопок остаются индивидуальными.';
      $('library-publish').disabled=linked.revision>=999999;
    }
  }
  function saveToLibrary(){
    const section=current();if(!section)return;
    if(project.library.length>=12)return toast('Максимум 12 шаблонов',true);
    const name=$('library-name').value.trim()||
      (C.definitions[section.type].label+' — '+(section.props.title||'Секция').slice(0,40)).slice(0,70);
    try{
      const recipe=L.make(activePage(),section,name),next=structuredClone(project);
      next.library.push(recipe);
      next.pages.find(p=>p.id===pageId).libraryLinks[section.id]=recipe.id;
      P.validate(next);
      checkpoint('library-add');project.library.push(recipe);
      activePage().libraryLinks[section.id]=recipe.id;
      renderLibrary();$('library-select').value=recipe.id;
      $('library-name').value=recipe.name;changed();
      toast('Секция сохранена. Обновление других копий требует подтверждения');
    }catch(e){toast(e.message,true);}
  }
  function insertFromLibrary(){
    const recipe=project.library.find(r=>r.id===$('library-select').value);
    if(!recipe)return;
    if(doc.sections.length>=12)return toast('На странице уже 12 секций',true);
    try{
      const next=structuredClone(project);
      const page=next.pages.find(p=>p.id===pageId);
      const section=L.insert(page,recipe);
      P.validate(next);
      checkpoint('library-insert');apply(next,pageId,section.id);
      $('library-select').value=recipe.id;changed();
      toast('Шаблон вставлен в страницу; связь сохранена');
    }catch(e){toast(e.message,true);}
  }
  function renameLibrary(){
    const recipe=project.library.find(r=>r.id===$('library-select').value);
    if(!recipe)return;
    const name=$('library-name').value.trim();
    if(!name||name.length>70||name.includes('\0'))return toast('Название: от 1 до 70 символов',true);
    if(name===recipe.name)return;
    const next=structuredClone(project);
    next.library.find(r=>r.id===recipe.id).name=name;
    try{P.validate(next);}catch(e){return toast(e.message,true);}
    checkpoint('library-rename');recipe.name=name;changed();
    toast('Шаблон переименован');
  }
  function deleteLibrary(){
    const recipe=project.library.find(r=>r.id===$('library-select').value);
    if(!recipe||!confirm('Удалить шаблон «'+recipe.name+'» из библиотеки? Все вставленные секции останутся на страницах без связи.'))return;
    checkpoint('library-delete');L.detach(project,recipe.id);
    renderLibrary();changed();toast('Шаблон удалён, содержимое страниц сохранено');
  }
  function publishLibrary(){
    const section=current(),page=activePage();
    const recipe=section&&project.library.find(r=>r.id===page.libraryLinks[section.id]);
    if(!recipe)return;
    const linked=L.count(project,recipe.id)-1;
    if(!confirm('Обновить шаблон «'+recipe.name+'» содержимым этой секции и заменить содержимое ещё '+linked+
      ' связанных секций? Оформление и действия кнопок других страниц сохранятся. Изменение можно отменить.'))return;
    try{
      const next=structuredClone(project);
      const target=next.pages.find(p=>p.id===pageId);
      const selected=target.sections.find(s=>s.id===section.id);
      const count=L.publish(next,target,selected);
      P.validate(next);
      checkpoint('library-publish');apply(next,pageId,section.id);
      toast('Обновлён шаблон и '+count+' связанных секций. Изменения пока локальные');
    }catch(e){toast('Не удалось обновить: '+e.message,true);}
  }
  function unlinkLibrary(){
    const section=current(),page=activePage();
    if(!section||!page.libraryLinks[section.id])return;
    checkpoint('library-detach');delete page.libraryLinks[section.id];
    renderLibrary();changed();toast('Секция отвязана; её содержимое осталось без изменений');
  }
  function pageDelete(){
    const p=activePage();
    if(p.slug===''||project.pages.length<=1)return toast('Главную страницу удалить нельзя',true);
    if(!confirm('Удалить страницу «'+p.title+'»? Изменение можно отменить.'))return;
    checkpoint('pages');project.pages=project.pages.filter(x=>x.id!==pageId);
    project.settings.footerPageIds=project.settings.footerPageIds.filter(id=>id!==p.id);
    for(const remaining of project.pages){
      for(const [sectionId,action] of Object.entries(remaining.sectionActions)){
        if(action==='page:'+p.id||action.startsWith('jump:'+p.id+':'))delete remaining.sectionActions[sectionId];
      }
    }
    selectPage(project.pages[0].id);changed();toast('Страница удалена — можно отменить');
  }
  function editSettings(field,value){
    if(JSON.stringify(project.settings[field])===JSON.stringify(value))return;
    const next={...project.settings,[field]:value};
    try{P.validate({...project,settings:next});}
    catch(_){
      $('site-header-note').value=project.settings.headerNote;
      $('site-footer-note').value=project.settings.footerNote;
      $('site-navigation').checked=project.settings.showNavigation;
      $('site-public-url').value=project.settings.publicUrl;
      renderLogoPicker();renderFooterPagePicker();
      toast('Некорректная настройка сайта — проверьте адрес HTTPS, логотип или число ссылок',true);return;
    }
    checkpoint('settings:'+field,field==='headerNote'||field==='footerNote');
    project.settings=next;changed();
  }
  function renderLogoPicker(){
    const select=$('site-logo');select.replaceChildren();
    const empty=document.createElement('option');empty.value='';empty.textContent='Только текстовое название';select.append(empty);
    for(const photo of project.media){
      const option=document.createElement('option');option.value=photo.id;
      option.textContent=photo.alt||'Фото '+photo.id.slice(-5);select.append(option);
    }
    select.value=project.settings.logoAssetId;
  }
  function renderFooterPagePicker(){
    const holder=$('site-footer-pages');holder.replaceChildren();
    for(const page of project.pages){
      const label=document.createElement('label');label.className='footer-page-item';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=page.id;
      checkbox.checked=project.settings.footerPageIds.includes(page.id);
      const text=document.createElement('span');text.textContent=page.title+(page.inMenu?'':' · вне меню');
      checkbox.addEventListener('change',()=>{
        const ids=checkbox.checked?[...project.settings.footerPageIds,page.id]:
          project.settings.footerPageIds.filter(id=>id!==page.id);
        editSettings('footerPageIds',ids);renderFooterPagePicker();
      });
      label.append(checkbox,text);holder.append(label);
    }
  }
  function syncContactsUI(){
    for(const field of ['email','phone','address'])$('contact-'+field).value=project.contacts[field];
  }
  function editContact(field,value){
    if(project.contacts[field]===value)return;
    const next={...project.contacts,[field]:value.trim()};
    try{P.validate({...project,contacts:next});}
    catch(_){
      $('contact-'+field).value=project.contacts[field];
      toast('Проверьте '+(field==='email'?'email':field==='phone'?'номер телефона':'длину адреса'),true);return;
    }
    checkpoint('contact:'+field);project.contacts=next;
    changed();toast('Контакты обновлены во всех разделах сайта');
  }
  function renderActionPicker(){
    const s=current(),holder=$('action-binding'),list=$('section-action');
    list.replaceChildren();
    holder.hidden=!s||!['hero','contact'].includes(s.type);
    if(holder.hidden)return;
    const options=[['auto','Автоматически — подходящий способ связи'],
      ['email','Отправить письмо на email'],['phone','Позвонить по телефону'],
      ...project.pages.map(pg=>['page:'+pg.id,'Перейти: '+pg.title])];
    for(const targetPage of project.pages){
      targetPage.sections.forEach((section,index)=>{
        if(targetPage.hiddenSections.includes(section.id))return;
        const label=section.props.title||section.props.eyebrow||C.definitions[section.type].label;
        options.push(['jump:'+targetPage.id+':'+section.id,
          (targetPage.id===pageId?'↳ Текущая':'↗ '+targetPage.title)+' / '+(index+1)+'. '+String(label).slice(0,45)]);
      });
    }
    for(const [value,name] of options){
      const option=document.createElement('option');option.value=value;option.textContent=name;list.append(option);
    }
    const selected=activePage().sectionActions[s.id]||'auto';
    if(!options.some(pair=>pair[0]===selected)){
      const missing=document.createElement('option');missing.value=selected;
      missing.textContent='Скрытый целевой блок — ссылка неактивна';list.append(missing);
    }
    list.value=selected;
    const resolved=P.resolveActions(project,activePage())[s.id];
    $('action-summary').textContent=selected==='auto'?'Автовыбор цели по содержимому страницы':
      (resolved?'Цель: '+resolved.href:'Цель скрыта — выберите другую видимую секцию');
  }
  function editSectionAction(value){
    const s=current(),p=activePage();
    if(!s||!['hero','contact'].includes(s.type))return;
    if(value!=='auto'&&!['email','phone'].includes(value)
      &&!project.pages.some(pg=>value==='page:'+pg.id)
      &&!project.pages.some(pg=>pg.sections.some(sec=>value==='jump:'+pg.id+':'+sec.id)))return;
    if((p.sectionActions[s.id]||'auto')===value)return;
    checkpoint('section-action');
    if(value==='auto')delete p.sectionActions[s.id];else p.sectionActions[s.id]=value;
    changed();renderActionPicker();
  }
  let mediaSerial=0;
  const nextAssetId=()=> 'asset-'+Date.now().toString(36)+'-'+(++mediaSerial).toString(36).padStart(5,'0');
  function renderMediaLibrary(){
    renderLogoPicker();
    $('media-count').textContent=String(project.media.length);
    $('media-upload').disabled=project.media.length>=P.MAX_MEDIA;
    const list=$('media-list');list.replaceChildren();
    if(!project.media.length){
      const empty=document.createElement('p');empty.className='setting-helper';
      empty.textContent='Изображений пока нет. Можно добавить фотографии для главного экрана, компании, услуг и каталога.';
      list.append(empty);return;
    }
    for(const asset of project.media){
      const row=document.createElement('div');row.className='media-item';
      const image=document.createElement('img');image.src=asset.data;image.alt=asset.alt;
      image.style.objectPosition=(asset.focusX??50)+'% '+(asset.focusY??50)+'%';image.loading='lazy';
      const detail=document.createElement('div');detail.className='media-item-detail';
      const label=document.createElement('label');label.textContent='Описание изображения';
      const alt=document.createElement('input');alt.type='text';alt.maxLength=160;
      alt.setAttribute('aria-label','Описание изображения для '+asset.id);
      alt.value=asset.alt;
      alt.addEventListener('change',()=>{
        if(alt.value===asset.alt)return;
        checkpoint('media-alt');asset.alt=alt.value;changed();
      });
      label.append(alt);detail.append(label);
      const remove=document.createElement('button');remove.type='button';remove.className='text-button';
      remove.textContent='Удалить фото';remove.addEventListener('click',()=>{
        if(!confirm('Удалить изображение со всех страниц и секций этого проекта?'))return;
        checkpoint('media-delete');
        project.media=project.media.filter(item=>item.id!==asset.id);
        for(const recipe of project.library){
          for(const [slot,id] of Object.entries(recipe.mediaSlots)){
            if(id===asset.id)delete recipe.mediaSlots[slot];
          }
          for(const item of recipe.items)if(item.image===asset.id)item.image='';
        }
        if(project.settings.logoAssetId===asset.id)project.settings.logoAssetId='';
        for(const page of project.pages){
          for(const [sectionId,slots] of Object.entries(page.mediaSlots)){
            for(const [slot,id] of Object.entries(slots))if(id===asset.id)delete slots[slot];
            if(!Object.keys(slots).length)delete page.mediaSlots[sectionId];
          }
          for(const items of Object.values(page.repeaters)){
            for(const item of items)if(item.image===asset.id)item.image='';
          }
        }
        renderMediaLibrary();renderMediaPicker();renderRepeater();changed();
        toast('Фотография удалена из проекта и всех блоков');
      });
      detail.append(remove);row.append(image,detail);list.append(row);
    }
  }
  function renderRepeater(){
    const section=current(),panel=$('repeater-panel'),list=$('repeater-list');
    list.replaceChildren();
    const rule=section&&Q.definitions[section.type];
    panel.hidden=!rule;if(!rule)return;
    const items=activePage().repeaters[section.id];
    $('repeater-count').textContent=items.length+' / 8';
    $('repeater-add').disabled=items.length>=8;
    function mutate(kind,callback){
      checkpoint('repeater:'+kind);
      callback();
      renderRepeater();changed();listing();
    }
    items.forEach((item,index)=>{
      const card=document.createElement('article');card.className='repeater-item';
      card.dataset.itemId=item.id;
      const header=document.createElement('div');header.className='repeater-item-head';
      const name=document.createElement('strong');name.textContent=rule.title+' '+(index+1);
      const actions=document.createElement('div');actions.className='repeater-item-actions';
      actions.append(
        tiny('↑','Поднять элемент',()=>mutate('move',()=>{
          [items[index-1],items[index]]=[items[index],items[index-1]];
        }),index===0),
        tiny('↓','Опустить элемент',()=>mutate('move',()=>{
          [items[index],items[index+1]]=[items[index+1],items[index]];
        }),index===items.length-1),
        tiny('⧉','Дублировать элемент',()=>mutate('duplicate',()=>{
          items.splice(index+1,0,{...structuredClone(item),id:Q.blank(section.type).id});
        }),items.length>=8),
        tiny('×','Удалить элемент',()=>mutate('remove',()=>items.splice(index,1)),items.length<=1)
      );
      header.append(name,actions);card.append(header);
      for(const [key,caption,max] of [['title',rule.title,rule.limit],['text',rule.description,rule.detailLimit]]){
        const label=document.createElement('label');label.className='field-label';
        label.textContent=caption;
        const input=key==='title'?document.createElement('input'):document.createElement('textarea');
        input.className='repeater-field';input.maxLength=max;
        if(key==='text')input.rows=3;
        input.value=item[key];input.setAttribute('aria-label',caption+' '+(index+1));
        input.addEventListener('input',()=>{
          if(item[key]===input.value||input.value.includes('\0'))return;
          checkpoint('repeater-field:'+pageId+':'+section.id+':'+item.id+':'+key,true);
          item[key]=input.value;changed();
        });
        label.append(input);card.append(label);
      }
      if(rule.photo){
        const label=document.createElement('label');label.className='field-label';
        label.textContent='Фотография '+(index+1);
        const select=document.createElement('select');select.className='repeater-photo';
        select.setAttribute('aria-label','Фотография элемента '+(index+1));
        const blank=document.createElement('option');blank.value='';blank.textContent='Без фотографии';select.append(blank);
        for(const photo of project.media){
          const option=document.createElement('option');option.value=photo.id;
          option.textContent=photo.alt||'Фото '+photo.id.slice(-5);select.append(option);
        }
        select.value=item.image;
        select.addEventListener('change',()=>{
          const id=select.value;
          if(id!==''&&!project.media.some(a=>a.id===id))return;
          checkpoint('repeater-photo');item.image=id;changed();
        });
        label.append(select);card.append(label);
      }
      list.append(card);
    });
  }
  function addRepeaterItem(){
    const section=current(),rule=section&&Q.definitions[section.type];
    if(!rule)return;
    const items=activePage().repeaters[section.id];
    if(items.length>=8)return toast('Максимум восемь элементов',true);
    checkpoint('repeater-add');items.push(Q.blank(section.type));
    renderRepeater();changed();listing();
  }
  function renderMediaPicker(){
    const section=current(),page=activePage(),items=section&&M.slots[section.type];
    const holder=$('media-binding'),fields=$('media-binding-fields');fields.replaceChildren();
    holder.hidden=!items;
    if(!items)return;
    for(const [slot,title] of items){
      const label=document.createElement('label');label.className='field-label';label.textContent=title;
      const select=document.createElement('select');
      select.setAttribute('aria-label',title);
      const blank=document.createElement('option');blank.value='';blank.textContent='Без фотографии';select.append(blank);
      project.media.forEach(asset=>{
        const opt=document.createElement('option');opt.value=asset.id;
        opt.textContent=asset.alt||'Фото '+asset.id.slice(-5);select.append(opt);
      });
      select.value=page.mediaSlots[section.id]?.[slot]||'';
      select.addEventListener('change',()=>{
        const next=select.value;
        if(next&&!project.media.some(m=>m.id===next))return;
        const old=page.mediaSlots[section.id]?.[slot]||'';
        if(old===next)return;
        checkpoint('media-assign');
        if(!page.mediaSlots[section.id])page.mediaSlots[section.id]={};
        if(next)page.mediaSlots[section.id][slot]=next;
        else delete page.mediaSlots[section.id][slot];
        if(!Object.keys(page.mediaSlots[section.id]).length)delete page.mediaSlots[section.id];
        changed();
      });
      label.append(select);fields.append(label);
    }
  }
  async function uploadMedia(files){
    if(!files?.length)return;
    for(const file of [...files]){
      if(project.media.length>=P.MAX_MEDIA){
        toast('Можно хранить не больше '+P.MAX_MEDIA+' фотографий; удалите ненужные',true);break;
      }
      try{
        const image=await M.decode(file);
        const asset={id:nextAssetId(),...image};
        const next={...project,media:[...project.media,asset]};
        P.validate(next);
        checkpoint('media-upload');project.media.push(asset);
        renderMediaLibrary();renderMediaPicker();renderRepeater();changed();
      }catch(e){toast('Не удалось добавить «'+file.name+'»: '+e.message,true);return;}
    }
    toast('Фотографии добавлены в локальную медиабиблиотеку');
  }
  function syncDesignUI(){
    for(const field of ['font','radius','spacing','navigation','scale','contentWidth']){
      $('design-'+field).value=project.design[field];
    }
    $('design-accent').value=project.design.accent||C.palette[project.theme].accent;
    $('design-accent-reset').disabled=!project.design.accent;
  }
  function editDesign(field,value){
    const next={...project.design,[field]:value};
    if(project.design[field]===value)return;
    try{P.validate({...project,design:next});}
    catch(e){toast('Недопустимое значение дизайна',true);syncDesignUI();return;}
    checkpoint('design:'+field,true);
    project.design=next;syncDesignUI();changed();
  }
  function syncSectionLayout(){
    const s=current();if(!s)return;
    const l=activePage().sectionLayouts[s.id]||P.defaultLayout();
    for(const key of ['width','density','align','columns'])$('layout-'+key).value=l[key];
    $('layout-reverse').checked=l.reverse;
    $('layout-columns-holder').hidden=!['features','services','catalog','metrics','process'].includes(s.type);
    $('layout-reverse-holder').hidden=!['hero','story'].includes(s.type);
    $('layout-reset').disabled=!activePage().sectionLayouts[s.id];
  }
  function editSectionLayout(key,value){
    const s=current(),p=activePage();
    if(!s)return;
    const currentLayout=p.sectionLayouts[s.id]||P.defaultLayout();
    if(currentLayout[key]===value)return;
    const next={...currentLayout,[key]:value};
    const defaults=P.defaultLayout();
    const proposal={...p.sectionLayouts};
    if(Object.keys(defaults).every(field=>next[field]===defaults[field]))delete proposal[s.id];
    else proposal[s.id]=next;
    try{P.validate({...project,pages:project.pages.map(page=>page.id===p.id?{...page,sectionLayouts:proposal}:page)});}
    catch(_){syncSectionLayout();toast('Недоступная комбинация настроек секции',true);return;}
    checkpoint('section-layout');
    p.sectionLayouts=proposal;syncSectionLayout();changed();
  }
  function resetSectionLayout(){
    const s=current(),p=activePage();if(!s||!p.sectionLayouts[s.id])return;
    checkpoint('section-layout');delete p.sectionLayouts[s.id];syncSectionLayout();changed();
  }
  function editSectionSurface(value){
    const page=activePage(),s=current();
    if(!s||!surfaceChoices.some(choice=>choice[0]===value))return;
    const old=page.sectionStyles[s.id]||'default';
    if(old===value)return;
    checkpoint('section-style');
    if(value==='default')delete page.sectionStyles[s.id];
    else page.sectionStyles[s.id]=value;
    changed();listing();renderSurfaceGallery();
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
    for(const other of project.pages){
      for(const [sourceId,action] of Object.entries(other.sectionActions)){
        if(action==='jump:'+pageId+':'+s.id)delete other.sectionActions[sourceId];
      }
    }
    activePage().hiddenSections=activePage().hiddenSections.filter(id=>id!==s.id);
    delete activePage().sectionStyles[s.id];
    delete activePage().sectionLayouts[s.id];
    delete activePage().mediaSlots[s.id];
    delete activePage().sectionActions[s.id];
    delete activePage().repeaters[s.id];
    delete activePage().libraryLinks[s.id];
    if(s.id===selection)selection=doc.sections[Math.min(i,doc.sections.length-1)].id;
    listing();mount();changed();toast('Блок удалён');
  }
  function duplicate(i){
    if(doc.sections.length>=12)return toast('Максимум 12 блоков',true);
    checkpoint('structure');const source=doc.sections[i],copy=C.createSection(source.type);
    copy.props=structuredClone(source.props);doc.sections.splice(i+1,0,copy);selection=copy.id;
    if(activePage().sectionStyles[source.id])activePage().sectionStyles[copy.id]=activePage().sectionStyles[source.id];
    if(activePage().sectionLayouts[source.id])activePage().sectionLayouts[copy.id]=structuredClone(activePage().sectionLayouts[source.id]);
    if(activePage().libraryLinks[source.id])activePage().libraryLinks[copy.id]=activePage().libraryLinks[source.id];
    if(activePage().mediaSlots[source.id])activePage().mediaSlots[copy.id]=structuredClone(activePage().mediaSlots[source.id]);
    if(activePage().sectionActions[source.id])activePage().sectionActions[copy.id]=activePage().sectionActions[source.id];
    if(activePage().repeaters[source.id])activePage().repeaters[copy.id]=activePage().repeaters[source.id].map(item=>({
      ...structuredClone(item),id:Q.blank(source.type).id
    }));
    listing();mount();changed();toast('Блок дублирован');
  }
  function add(){
    if(doc.sections.length>=12)return toast('Максимум 12 блоков',true);
    checkpoint('structure');const s=C.createSection(ui.addType.value);
    doc.sections.push(s);
    if(Q.definitions[s.type])activePage().repeaters[s.id]=Q.seed(s);
    selection=s.id;listing();mount();changed();toast('Блок добавлен');
  }
  function travel(which){
    const from=which==='undo'?undo:redo,to=which==='undo'?redo:undo;
    if(!from.length)return;to.push(snapshot());
    apply(JSON.parse(from.pop()),pageId,selection);
    toast(which==='undo'?'Изменение отменено':'Изменение повторено');
  }
  function renderWorkspaces(){
    const select=$('workspace-select'),current=select.value;
    select.replaceChildren();
    const entries=workspaceStore?.list()||[];
    for(const entry of entries){
      const option=document.createElement('option');option.value=entry.id;
      option.textContent=entry.id===workspaceId?project.siteTitle:entry.title;
      select.append(option);
    }
    select.value=workspaceId||current;
    $('workspace-count').textContent=entries.length+'/'+8;
    $('workspace-copy').disabled=!storageOK||entries.length>=8;
    $('workspace-delete').disabled=!storageOK||entries.length<2;
    $('reset').disabled=!storageOK||entries.length>=8;
  }
  function persistCurrent(){
    if(!storageOK||!workspaceStore)return false;
    try{
      const json=snapshot();
      if(json!==saved||!records.length){
        records=workspaceStore.save(workspaceId,project);
        saved=json;
        versions();indicators();renderWorkspaces();
      }
      return true;
    }catch(e){toast('Не удалось сохранить сайт: '+e.message+'. Скачайте резервный JSON.',true);return false;}
  }
  function activateWorkspace(entry){
    workspaceId=entry.id;
    reviewKey=W.notesKey(workspaceId);
    records=entry.records;
    saved=JSON.stringify(entry.doc);
    undo=[];redo=[];lastType='';lastAt=0;
    contentPlan=null;contentExcluded.clear();
    $('project-actions').open=false;
    apply(entry.doc);versions();readReview();showReview();renderWorkspaces();
  }
  function startWorkspace(next){
    if(!storageOK)return toast('Локальное хранилище недоступно. Экспортируйте JSON',true),false;
    if(!persistCurrent())return false;
    try{
      const entry=workspaceStore.add(next);
      activateWorkspace(entry);
      return true;
    }catch(e){toast('Не удалось создать отдельный сайт: '+e.message,true);return false;}
  }
  function switchWorkspace(id){
    if(id===workspaceId)return;
    if(!persistCurrent()){$('workspace-select').value=workspaceId;return;}
    try{
      const entry=workspaceStore.select(id);
      activateWorkspace(entry);
      toast('Открыт сайт «'+project.siteTitle+'». Его версии и заметки отделены от других.');
    }catch(e){$('workspace-select').value=workspaceId;toast('Не удалось открыть сайт: '+e.message,true);}
  }
  function duplicateWorkspace(){
    if(!storageOK)return;
    const copy=P.normalize(project);
    copy.siteTitle=(copy.siteTitle.slice(0,91)+' (копия)').slice(0,100);
    if(startWorkspace(copy))toast('Создана независимая копия сайта со всеми его страницами и изображениями');
  }
  function deleteWorkspace(){
    if(!storageOK||!workspaceStore||workspaceStore.list().length<2)return;
    if(!confirm('Удалить текущий локальный сайт «'+project.siteTitle+'» со всеми его версиями и заметками? Сначала скачайте резервный JSON. Отменить удаление нельзя.'))return;
    try{
      const next=workspaceStore.remove(workspaceId);
      activateWorkspace(next);
      toast('Сайт удалён локально. Открыт другой проект.');
    }catch(e){toast('Не удалось удалить сайт: '+e.message,true);}
  }
  function generateFromBrief(event){
    event.preventDefault();
    const data={};
    for(const key of ['kind','company','offering','audience','benefit','proof','email','phone','address'])
      data[key]=$('brief-'+key).value;
    try{
      const site=D.compose(B.build(data),$('brief-direction').value,'all');
      if(!confirm('Создать отдельный локальный сайт из брифа? Текущий сайт останется доступен.'))return;
      if(!startWorkspace(site))return;
      $('brief-dialog').close();
      $('project-actions').open=false;
      showOverview(false);
      toast('Новый сайт из брифа сохранён отдельно. Предыдущие проекты доступны в переключателе.');
    }catch(e){$('brief-error').textContent='Не удалось создать сайт: '+e.message;$('brief-error').hidden=false;}
  }
  function starter(){
    const kind=$('starter-type').value;
    if(!confirm('Создать отдельный сайт из шаблона? Текущий проект сохранится.'))return;
    if(startWorkspace(P.starter(kind)))toast('Открыта отдельная многостраничная заготовка. Контакты пока демонстрационные.');
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
  function downloadWorkspaceBackup(){
    if(!storageOK||!persistCurrent())return;
    try{
      const archive=workspaceStore.backup();
      const blob=new Blob([JSON.stringify(archive,null,2)+'\n'],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='ai-site-cms-all-local-sites-backup.json';
      document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1800);
      toast('Скачан полный архив '+archive.sites.length+' сайтов с версиями и заметками. Храните файл безопасно.');
    }catch(e){toast('Не удалось собрать архив всех сайтов: '+e.message,true);}
  }
  async function restoreWorkspaceBackup(file){
    if(!file)return;
    if(file.size>24_000_000)return toast('Архив превышает 24 МБ',true);
    if(!storageOK||!persistCurrent())return;
    try{
      const raw=JSON.parse(await file.text());
      const checked=workspaceStore.inspectBackup(raw);
      if(workspaceStore.list().length+checked.sites.length>8)
        throw Error('Недостаточно свободных мест для всех сайтов архива (максимум 8)');
      if(!confirm('Добавить '+checked.sites.length+' сайтов из архива? Существующие сайты сохранятся без изменений. Архив может содержать контакты клиентов.'))return;
      const entry=workspaceStore.restoreBackup(raw);
      activateWorkspace(entry);showOverview(false);
      toast('Восстановлено '+checked.sites.length+' независимых сайтов с историями и заметками.');
    }catch(e){toast('Архив не импортирован: '+e.message,true);}
  }
  async function imports(file){
    if(!file)return;
    if(file.size>4_200_000)return toast('Максимум 4,2 МБ для резервного JSON',true);
    try{
      const valid=P.normalize(JSON.parse(await file.text()));
      if(!startWorkspace(valid))return;
      toast('Импортированный проект добавлен отдельным сайтом. Исходные сайты не изменены.');
    }catch(e){toast('Ошибка импорта: '+e.message,true);}
  }
  function readSaved(){
    try{
      const probe='ai-site-cms-stage2-workspaces-probe';
      localStorage.setItem(probe,'1');localStorage.removeItem(probe);
      workspaceStore=W.create(localStorage);
      const entry=workspaceStore.open();
      storageOK=true;workspaceId=entry.id;records=entry.records;project=entry.doc;
      reviewKey=W.notesKey(workspaceId);
    }catch(e){
      storageOK=false;workspaceStore=null;records=[];
      toast('Локальные сайты не открылись: '+e.message+'. Резервный JSON по-прежнему можно скачать.',true);
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
    if(persistCurrent())toast('Текущий сайт и его отдельная история сохранены только в этом браузере');
  }
  function expandPreview(){
    const expanded=document.body.classList.toggle('preview-expanded');
    const button=$('expand-preview');
    button.textContent=expanded?'↙ Вернуться в редактор':'⤢ Развернуть';
    button.setAttribute('aria-pressed',String(expanded));
    ui.frame.focus();
  }
  function init(){
    if(!C||!P||!R||!E||!X||!M||!Q||!L||!O||!B||!K||!W||!D||!T||!V||!S){
      ui.status.textContent='Соберите Jedison: cd cms/editor && npm ci && npm run build';
      ui.status.className='status show error';return;
    }
    for(const type of C.types){
      const option=document.createElement('option');option.value=type;
      option.textContent=C.definitions[type].label;ui.addType.append(option);
    }
    ui.frame.addEventListener('load',bindPreviewClicks);
    $('expand-preview').addEventListener('click',expandPreview);
    $('repeater-add').addEventListener('click',addRepeaterItem);
    $('media-upload').addEventListener('click',()=>$('media-file').click());
    $('media-file').addEventListener('change',async e=>{
      const files=[...(e.target.files||[])];e.target.value='';await uploadMedia(files);
    });
    renderDirections();
    $('direction-try').addEventListener('click',tryDirection);
    $('direction-apply').addEventListener('click',applyDirection);
    $('direction-cancel').addEventListener('click',()=>stopDirectionPreview());
    $('direction-scope').addEventListener('change',()=>{if(directionPreview)stopDirectionPreview();});
    readSaved();readReview();
    saved=snapshot();apply(project);versions();renderWorkspaces();
    $('workspace-select').addEventListener('change',()=>switchWorkspace($('workspace-select').value));
    $('workspace-copy').addEventListener('click',duplicateWorkspace);
    $('workspace-backup').addEventListener('click',downloadWorkspaceBackup);
    $('workspace-restore').addEventListener('click',()=>$('workspace-backup-file').click());
    $('workspace-backup-file').addEventListener('change',async e=>{
      const file=e.target.files?.[0];e.target.value='';await restoreWorkspaceBackup(file);
    });
    $('workspace-delete').addEventListener('click',deleteWorkspace);
    $('overview-open').addEventListener('click',()=>showOverview(true));
    $('overview-editor').addEventListener('click',()=>showOverview(false));
    $('quality-level').addEventListener('change',renderOverview);
    $('quality-page').addEventListener('change',renderOverview);
    $('quality-export').addEventListener('click',exportContentReport);
    $('add').addEventListener('click',add);
    $('section-search').addEventListener('input',listing);
    document.addEventListener('click',e=>{
      const menu=$('project-actions');
      if(menu.open&&!menu.contains(e.target))menu.open=false;
    });
    $('site-header-note').addEventListener('input',()=>editSettings('headerNote',$('site-header-note').value));
    $('site-footer-note').addEventListener('input',()=>editSettings('footerNote',$('site-footer-note').value));
    $('site-navigation').addEventListener('change',()=>editSettings('showNavigation',$('site-navigation').checked));
    $('site-logo').addEventListener('change',()=>editSettings('logoAssetId',$('site-logo').value));
    $('site-public-url').addEventListener('change',()=>{
      const normalized=$('site-public-url').value.trim().toLowerCase().replace(/\/$/,'');
      editSettings('publicUrl',normalized);$('site-public-url').value=project.settings.publicUrl;
    });
    for(const field of ['email','phone','address']){
      $('contact-'+field).addEventListener('change',()=>editContact(field,$('contact-'+field).value));
    }
    $('section-action').addEventListener('change',()=>editSectionAction($('section-action').value));
    for(const field of ['font','radius','spacing','navigation','scale','contentWidth']){
      $('design-'+field).addEventListener('change',()=>editDesign(field,$('design-'+field).value));
    }
    $('design-accent').addEventListener('input',()=>editDesign('accent',$('design-accent').value));
    $('design-accent-reset').addEventListener('click',()=>editDesign('accent',''));
    $('section-surface').addEventListener('change',()=>editSectionSurface($('section-surface').value));
    for(const key of ['width','density','align','columns']){
      $('layout-'+key).addEventListener('change',()=>editSectionLayout(key,$('layout-'+key).value));
    }
    $('layout-reverse').addEventListener('change',()=>editSectionLayout('reverse',$('layout-reverse').checked));
    $('layout-reset').addEventListener('click',resetSectionLayout);
    ui.sectionVisible.addEventListener('change',()=>{const s=current();if(s)toggleSection(s.id,ui.sectionVisible.checked);});
    $('page-in-menu').addEventListener('change',()=>editPage('inMenu',$('page-in-menu').checked));
    $('brief-open').addEventListener('click',()=>{
      $('brief-error').hidden=true;
      $('brief-dialog').showModal();
    });
    $('brief-close').addEventListener('click',()=>$('brief-dialog').close());
    $('brief-kind').addEventListener('change',()=>{
      $('brief-direction').value={industrial:'precision',agency:'momentum',products:'evergreen'}[$('brief-kind').value];
    });
    $('brief-form').addEventListener('submit',generateFromBrief);
    $('starter-apply').addEventListener('click',starter);
    $('copy-section').addEventListener('click',copySection);
    $('site-content-ops').addEventListener('toggle',renderContentOps);
    $('content-search').addEventListener('input',()=>{contentExcluded.clear();resetContentPlan();renderContentOps();});
    $('content-case').addEventListener('change',()=>{contentExcluded.clear();resetContentPlan();renderContentOps();});
    $('content-scope').addEventListener('change',()=>{contentExcluded.clear();resetContentPlan();renderContentOps();});
    $('content-select-all').addEventListener('click',()=>{contentExcluded.clear();resetContentPlan();renderContentOps();});
    $('content-select-none').addEventListener('click',()=>{
      for(const entry of contentMatches().entries)contentExcluded.add(O.identity(entry));
      resetContentPlan();renderContentOps();
    });
    $('content-replacement').addEventListener('input',resetContentPlan);
    $('content-plan').addEventListener('click',planContentReplace);
    $('content-report-export').addEventListener('click',exportContentReport);
    $('content-apply').addEventListener('click',applyContentReplace);
    $('library-save').addEventListener('click',saveToLibrary);
    $('library-insert').addEventListener('click',insertFromLibrary);
    $('library-rename').addEventListener('click',renameLibrary);
    $('library-delete').addEventListener('click',deleteLibrary);
    $('library-publish').addEventListener('click',publishLibrary);
    $('library-detach').addEventListener('click',unlinkLibrary);
    $('library-select').addEventListener('change',()=>{
      const recipe=project.library.find(r=>r.id===$('library-select').value);
      $('library-name').value=recipe?recipe.name:'';
      renderLibrary();
    });
    $('download-site').addEventListener('click',downloadSite);
    $('review-add').addEventListener('click',addReview);
    $('review-export').addEventListener('click',exportReview);
    $('review-clear').addEventListener('click',()=>{
      if(!review.length||!confirm('Удалить все заметки по макету? Сначала скачайте файл.'))return;
      review=[];writeReview();showReview();
    });
    ui.pageList.addEventListener('change',()=>selectPage(ui.pageList.value));
    $('page-add').addEventListener('click',()=>pageAdd());
    $('page-recipe-open').addEventListener('click',openPageRecipe);
    $('page-recipe-back').addEventListener('click',()=>$('page-recipe-dialog').close());
    $('page-recipe-close').addEventListener('click',()=>$('page-recipe-dialog').close());
    $('page-recipe-form').addEventListener('submit',createRecipePage);
    $('canvas-media-close').addEventListener('click',()=>$('canvas-media-dialog').close());
    $('canvas-media-cancel').addEventListener('click',()=>$('canvas-media-dialog').close());
    $('canvas-media-dialog').addEventListener('close',()=>{canvasMedia=null;selectedCanvasAsset='';});
    $('canvas-media-apply').addEventListener('click',()=>finishCanvasMedia(selectedCanvasAsset));
    for(const id of ['canvas-media-focus-x','canvas-media-focus-y'])
      $(id).addEventListener('input',updateCanvasFocusPreview);
    $('canvas-media-focus-preview').addEventListener('click',e=>{
      if(!selectedCanvasAsset)return;
      const rect=e.currentTarget.getBoundingClientRect();
      $('canvas-media-focus-x').value=String(Math.round(Math.max(0,Math.min(100,(e.clientX-rect.left)*100/rect.width))));
      $('canvas-media-focus-y').value=String(Math.round(Math.max(0,Math.min(100,(e.clientY-rect.top)*100/rect.height))));
      updateCanvasFocusPreview();
    });
    const focusPresets={center:[50,50],top:[50,0],bottom:[50,100],left:[0,50],right:[100,50]};
    document.querySelectorAll('[data-media-focus]').forEach(button=>button.addEventListener('click',()=>{
      if(!selectedCanvasAsset)return;
      const [x,y]=focusPresets[button.dataset.mediaFocus];
      $('canvas-media-focus-x').value=String(x);
      $('canvas-media-focus-y').value=String(y);
      updateCanvasFocusPreview();
    }));
    $('canvas-media-upload').addEventListener('click',()=>$('canvas-media-file').click());
    $('canvas-media-file').addEventListener('change',async e=>{
      const file=e.target.files?.[0];e.target.value='';await uploadCanvasMedia(file);
    });
    $('canvas-edit-form').addEventListener('submit',submitCanvasEdit);
    $('canvas-edit-text').addEventListener('input',updateCanvasEditCounter);
    $('canvas-edit-cancel').addEventListener('click',()=>$('canvas-edit-dialog').close());
    $('canvas-edit-close').addEventListener('click',()=>$('canvas-edit-dialog').close());
    $('canvas-edit-dialog').addEventListener('close',()=>{canvasEditing=null;});
    $('page-copy').addEventListener('click',()=>pageAdd(true));
    $('page-delete').addEventListener('click',pageDelete);
    $('page-up').addEventListener('click',()=>pageMove(-1));
    $('page-down').addEventListener('click',()=>pageMove(1));
    ui.pageTitle.addEventListener('change',()=>{editPage('title',ui.pageTitle.value.trim());ui.pageTitle.value=activePage().title;});
    ui.slug.addEventListener('change',()=>{editPage('slug',ui.slug.value.trim().toLowerCase());ui.slug.value=activePage().slug;});
    ui.seoTitle.addEventListener('change',()=>{editPage('seoTitle',ui.seoTitle.value.trim());ui.seoTitle.value=activePage().seoTitle;});
    ui.seoDescription.addEventListener('input',()=>editPage('seoDescription',ui.seoDescription.value));
    $('reset').addEventListener('click',()=>{
      if(startWorkspace(P.template()))toast('Создан новый отдельный сайт. Предыдущие проекты сохранены.');
    });
    $('clear-versions').addEventListener('click',()=>{
      if(!records.length||!storageOK||!confirm('Удалить старые версии текущего сайта, оставив одну актуальную? Сначала экспортируйте JSON.'))return;
      try{records=workspaceStore.prune(workspaceId,project);saved=snapshot();versions();indicators();
        toast('Старая история текущего сайта очищена. Актуальная версия сохранена.');}
      catch(e){toast('Ошибка очистки истории: '+e.message,true);}
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
      changed();renderWorkspaces();
    });
    ui.theme.addEventListener('change',()=>{
      if(project.theme===ui.theme.value)return;
      checkpoint('theme');project.theme=ui.theme.value;bind();syncDesignUI();changed();
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
