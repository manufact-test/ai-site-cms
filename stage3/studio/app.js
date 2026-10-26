'use strict';
// All edits stay in this explicit local browser session. No fetch, API, telemetry,
// provider credentials, form submission, deployment or auto-publishing.
(()=>{
  const C=CONTRACT,D=DRAFT,manifests=MANIFESTS,starter=FIXTURE;
  const HOSTED=document.documentElement.dataset.stage3Mode==='server';
  const $=id=>document.getElementById(id),cp=x=>structuredClone(x);
  const STORAGE='manufact-ai-site-stage3-local-revisions-v1';
  const MAX_VERSIONS=12,MAX_UPLOAD=900000,MAX_INTEROP_UPLOAD=2500000;
  const INTEROP_STORAGE='manufact-ai-design-graph-local-session-v1';
  let interopSession=null,interopStorageFailed=false;
  const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeText=v=>v===undefined||v===null?'':String(v);
  let session=D.begin(starter,manifests),pageId=session.current.pages[0].id,
    sectionId=session.current.pages[0].sections[0].id,
    elementId=session.current.pages[0].sections[0].elements[0].id,
    breakpoint='desktop',savedBytes=JSON.stringify(session.current),versions=[];
  function notice(message,error=false){
    const node=$('toast');node.textContent=message;node.hidden=false;node.className='toast'+(error?' error':'');
  }
  function clearInteropSession(){
    interopSession=null;interopStorageFailed=false;
    if(!HOSTED)try{sessionStorage.removeItem(INTEROP_STORAGE);}catch(_){}
    updateInteropUI();
  }
  function updateInteropUI(){
    const button=$('export-factory-handoff'),status=$('interop-status');
    if(!button||!status)return;
    if(!interopSession){button.hidden=true;status.hidden=true;status.textContent='';return;}
    button.hidden=false;
    try{
      const report=GRAPH_INTEROP.inspectSession(interopSession,session.current,C,manifests);
      const changed=report.graphDiff.addedNodeIds.length+report.graphDiff.removedNodeIds.length+
        report.graphDiff.typeChangedNodeIds.length+report.graphDiff.reparentedNodeIds.length+
        report.graphDiff.reorderedNodeIds.length+report.graphDiff.changedProperties.length;
      status.hidden=false;
      status.textContent='Design Factory · граф '+report.baselineGraph.nodeCount+' узлов · fidelity: '+
        report.compatibility.visualFidelity+' · изменений графа: '+changed+
        ' · полей CMS: '+report.bindingChanges.length+
        ' · открытых ограничений: '+report.integrationRequired.length+
        (report.compatibility.canExportHandoff?' · handoff доступен':' · восстановите исходный ID графа для handoff')+
        (HOSTED?' · источник хранится только в этой вкладке; экспортируйте handoff перед выходом.':'')+
        (interopStorageFailed?' · не удалось сохранить служебную сессию вкладки — скачайте handoff сейчас.':'');
      button.title='Скачать исходный Factory candidate отдельно от текущего CMS draft';
    }catch(error){
      status.hidden=false;status.textContent='Interop активен, но handoff требует исправления: '+error.message;
    }
  }
  function persistInteropSession(){
    if(!interopSession)return;
    try{
      if(session.current.siteId!==interopSession.sourceCandidate.site.siteId){
        clearInteropSession();return;
      }
      interopSession=GRAPH_INTEROP.refreshSession(interopSession,session.current,C,manifests);
      if(!HOSTED){
        sessionStorage.setItem(INTEROP_STORAGE,JSON.stringify({
          format:'manufact-ai-design-graph-local-session-v1',version:1,
          interopSession,wasSaved:JSON.stringify(session.current)===savedBytes
        }));
        interopStorageFailed=false;
      }
    }catch(error){interopStorageFailed=true;}
    updateInteropUI();
  }
  function restoreInteropSession(){
    if(HOSTED)return;
    try{
      const raw=sessionStorage.getItem(INTEROP_STORAGE);if(!raw)return;
      const payload=JSON.parse(raw);
      if(payload?.format!=='manufact-ai-design-graph-local-session-v1'||payload.version!==1)
        throw Error('Неверный формат временной сессии');
      const restored=GRAPH_INTEROP.resumeSession(payload.interopSession,C,manifests);
      const site=restored.workingSite;
      if(!versions.length||versions[0].site.siteId!==site.siteId)versions=[];
      session=D.begin(site,manifests);interopSession=restored;
      const page=site.pages[0],section=page.sections.find(s=>s.id==='df-selected-composition')||page.sections[0];
      pageId=page.id;sectionId=section.id;elementId=section.elements[0].id;
      const savedVersion=versions.find(v=>JSON.stringify(v.site)===JSON.stringify(site));
      savedBytes=payload.wasSaved&&savedVersion?JSON.stringify(site):'';
    }catch(error){
      try{sessionStorage.removeItem(INTEROP_STORAGE);}catch(_){}
      interopSession=null;interopStorageFailed=false;
      notice('Временная D7-сессия не восстановлена: '+error.message,true);
    }
  }
  function exportFactoryHandoff(){
    if(!interopSession)return;
    try{
      const handoff=GRAPH_INTEROP.exportHandoff(interopSession,session.current,C,manifests);
      const data=JSON.stringify(handoff,null,2)+'\n';
      const url=URL.createObjectURL(new Blob([data],{type:'application/json;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download='ai-site-design-factory-handoff.json';
      document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
      notice('D7 handoff экспортирован: исходный candidate сохранён отдельно от текущего черновика. Публикации не было.');
    }catch(error){notice('Экспорт D7 handoff отклонён: '+error.message,true);}
  }
  function current(){
    const page=session.current.pages.find(p=>p.id===pageId)||session.current.pages[0];
    const section=page.sections.find(s=>s.id===sectionId)||page.sections[0];
    const element=section.elements.find(e=>e.id===elementId)||section.items?.find(e=>e.id===elementId)||section.elements[0];
    pageId=page.id;sectionId=section.id;elementId=element.id;
    return {page,section,element};
  }
  function manifest(sec){return manifests.find(m=>m.id===sec.component&&m.version===sec.manifestVersion);}
  function chosenName(){
    const {section}=current();return manifest(section)?.label||section.component;
  }
  function changeCounts(){return D.changes(session,manifests).length;}
  function drawHeader(){
    const dirty=JSON.stringify(session.current)!==savedBytes;
    $('site-name').textContent=session.current.title;
    $('dirty').textContent=dirty?'Есть несохранённые изменения':(HOSTED?'Черновик сохранён на сервере':'Черновик сохранён локально');
    $('dirty').classList.toggle('dirty',dirty);
    $('undo').disabled=!session.undo.length;$('redo').disabled=!session.redo.length;
    $('changes-count').textContent=changeCounts()+' изменённых полей';
    if(HOSTED)window.Stage3Host?.onDraw?.();
  }
  function button(text,cls,onClick){
    const n=document.createElement('button');n.type='button';
    n.textContent=text;n.className=cls;n.addEventListener('click',onClick);return n;
  }
  function drawTree(){
    $('pages').replaceChildren();
    session.current.pages.forEach(page=>{
      $('pages').append(button(page.title,'nav-entry'+(page.id===pageId?' active':''),
        ()=>{pageId=page.id;sectionId=page.sections[0].id;elementId=page.sections[0].elements[0].id;draw();}));
    });
    $('sections').replaceChildren();
    current().page.sections.forEach((section,index)=>{
      const name=manifest(section)?.label||section.component;
      $('sections').append(button((index+1)+'. '+name,
        'nav-entry'+(section.id===sectionId?' active':''),
        ()=>{sectionId=section.id;elementId=section.elements[0].id;draw();}));
    });
  }

  // Same explicit structural operations in both offline and server Studio.
  // Server mode still requires a separate Save and a separate Publish.
  const uniqueId=prefix=>{
    const bytes=new Uint8Array(10);crypto.getRandomValues(bytes);
    return prefix+'-'+Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
  };
  function structural(command){
    try{
      const before=session.current;
      const priorPage=command.action==='updatePage'?before.pages.find(x=>x.id===command.pageId):null;
      const urlChanged=!!priorPage&&priorPage.path!==command.path;
      session=D.structure(session,manifests,{...command,expectedRevision:session.revision});
      const selected=session.current.pages.find(x=>x.id===pageId);
      if(!selected){pageId=session.current.pages[0].id;sectionId='';}
      const page=session.current.pages.find(x=>x.id===pageId);
      if(!page.sections.some(x=>x.id===sectionId))sectionId=page.sections[0].id;
      if(![...page.sections.find(x=>x.id===sectionId).elements,...(page.sections.find(x=>x.id===sectionId).items||[])].some(x=>x.id===elementId))
        elementId=page.sections.find(x=>x.id===sectionId).elements[0].id;
      draw();
      if(before!==session.current)notice(urlChanged
        ?'URL изменён: внутренние ссылки обновлены, старый адрес перенаправляется на новый. Для сохранения нажмите «Сохранить». '
        :'Структура изменена в черновике. Для сохранения нажмите «Сохранить».');
    }catch(e){notice('Изменение структуры отклонено: '+e.message,true);}
  }

  // Closed global theme and per-page SEO/menu editing: one undoable site-document change.
  function initSettings(){
    const dlg=document.createElement('dialog');dlg.className='cms-settings-dialog';dlg.id='cms-settings-dialog';
    const header=document.createElement('h2'),tip=document.createElement('small'),grid=document.createElement('div');
    grid.className='cms-settings-grid';const actions=document.createElement('div');actions.className='cms-settings-actions';
    const fields={},themeKeys=['background','surface','text','primary','font','maxWidth','bodySize','lineHeight','headingScale','buttonStyle','buttonRadius','buttonText'],globalKeys=[...themeKeys,'language'];
    const metaKeys=['seo-title','seo-description','seo-robots','seo-og-title','seo-og-description','seo-og-image','nav-label','nav-hidden'];
    const add=(name,labelText,type='text',max)=>{
      const wrap=document.createElement('label');wrap.textContent=labelText;
      const control=document.createElement(type==='select'?'select':'input');
      if(type!=='select')control.type=type;
      control.id='cms-setting-'+name;control.className='control';if(max)control.maxLength=max;
      wrap.append(control);grid.append(wrap);fields[name]=control;return control;
    };
    for(const [name,label] of [['background','Фон страниц'],['surface','Фон карточек'],['text','Цвет текста'],['primary','Цвет кнопок']])add(name,label,'color');
    const font=add('font','Шрифт сайта','select');
    for(const [value,text] of [['system','Системный'],['arial','Arial'],['georgia','Georgia']]){
      const option=document.createElement('option');option.value=value;option.textContent=text;font.append(option);
    }
    const width=add('maxWidth','Максимальная ширина (680–1600 px)','number');width.min='680';width.max='1600';
    const bodySize=add('bodySize','Размер основного текста (14–22 px)','number');bodySize.min='14';bodySize.max='22';bodySize.step='1';
    const lineHeight=add('lineHeight','Межстрочный интервал','select');
    for(const [value,label] of [['compact','Компактный'],['normal','Стандартный'],['relaxed','Свободный']]){const option=document.createElement('option');option.value=value;option.textContent=label;lineHeight.append(option);}
    const headingScale=add('headingScale','Масштаб подзаголовков H2','select');
    for(const [value,label] of [['compact','Компактные'],['normal','Стандартные'],['large','Крупные']]){const option=document.createElement('option');option.value=value;option.textContent=label;headingScale.append(option);}
    const buttonStyle=add('buttonStyle','Стиль кнопок по умолчанию','select');
    for(const [value,label] of [['solid','Залитые'],['outline','Контурные'],['pill','Капсулы']]){const option=document.createElement('option');option.value=value;option.textContent=label;buttonStyle.append(option);}
    const buttonRadius=add('buttonRadius','Скругление кнопок (0–32 px)','number');buttonRadius.min='0';buttonRadius.max='32';buttonRadius.step='1';
    add('buttonText','Цвет текста кнопок','color');
    const language=add('language','Язык сайта','select');
    for(const [value,text] of [['ru','Русский'],['en','English'],['pl','Polski'],['de','Deutsch'],['be','Беларуская'],['uk','Українська']]){
      const option=document.createElement('option');option.value=value;option.textContent=text;language.append(option);
    }
    add('seo-title','SEO title (пустое — автоматически)','text',160);
    add('seo-description','Описание для поисковиков (до 300 символов)','text',300);
    add('seo-og-title','Заголовок для соцсетей (пустое — SEO title)','text',160);
    add('seo-og-description','Описание для соцсетей (пустое — SEO description)','text',300);
    add('seo-og-image','Изображение для соцсетей (Open Graph)','select');
    const refreshSocialImages=selected=>{
      const select=fields['seo-og-image'];select.replaceChildren();
      const automatic=document.createElement('option');automatic.value='';
      automatic.textContent='Автоматически — первое изображение страницы';select.append(automatic);
      for(const asset of session.current.assets||[]){
        if(!['image/png','image/jpeg','image/webp'].includes(asset.mime))continue;
        const option=document.createElement('option');option.value=asset.id;
        option.textContent=(asset.alt||asset.id).slice(0,120);select.append(option);
      }
      if(selected&&!Array.from(select.options).some(option=>option.value===selected)){
        const missing=document.createElement('option');missing.value=selected;
        missing.textContent='Изображение недоступно — выберите другое';select.append(missing);
      }
      select.value=selected||'';
    };
    const robots=add('seo-robots','Индексация страницы','select');
    for(const [value,text] of [['index','Разрешить'],['noindex','Не индексировать']]){
      const option=document.createElement('option');option.value=value;option.textContent=text;robots.append(option);
    }
    add('nav-label','Название в меню (необязательно)','text',100);
    add('nav-hidden','Скрыть из меню','checkbox');
    let mode='theme',chosenPage=null;
    const seoPreview=document.createElement('section');
    seoPreview.className='cms-seo-preview';seoPreview.id='cms-seo-preview';seoPreview.hidden=true;
    const seoPreviewHeading=document.createElement('h3');seoPreviewHeading.textContent='Предпросмотр поисковой выдачи и соцсетей';
    const seoPreviewGrid=document.createElement('div');seoPreviewGrid.className='cms-seo-preview-grid';
    const searchCard=document.createElement('article');searchCard.className='cms-seo-preview-card cms-seo-serp';
    const searchLabel=document.createElement('strong');searchLabel.textContent='Поисковый сниппет';
    const searchPath=document.createElement('div');searchPath.id='cms-seo-search-path';searchPath.className='cms-seo-search-path';
    const searchTitle=document.createElement('div');searchTitle.id='cms-seo-search-title';searchTitle.className='cms-seo-search-title';
    const searchDescription=document.createElement('p');searchDescription.id='cms-seo-search-description';searchDescription.className='cms-seo-search-description';
    const titleCount=document.createElement('small');titleCount.id='cms-seo-title-count';titleCount.className='cms-seo-count';
    const descriptionCount=document.createElement('small');descriptionCount.id='cms-seo-description-count';descriptionCount.className='cms-seo-count';
    const robotsStatus=document.createElement('p');robotsStatus.id='cms-seo-robots-status';robotsStatus.className='cms-seo-robots-status';
    searchCard.append(searchLabel,searchPath,searchTitle,searchDescription,titleCount,descriptionCount,robotsStatus);
    const socialCard=document.createElement('article');socialCard.className='cms-seo-preview-card cms-seo-social';
    const socialLabel=document.createElement('strong');socialLabel.textContent='Карточка публикации';
    const socialImageFrame=document.createElement('div');socialImageFrame.className='cms-seo-social-image-frame';
    const socialImage=document.createElement('img');socialImage.id='cms-seo-social-image';socialImage.className='cms-seo-social-image';socialImage.hidden=true;
    const socialImagePlaceholder=document.createElement('div');socialImagePlaceholder.id='cms-seo-social-image-placeholder';socialImagePlaceholder.className='cms-seo-social-image-placeholder';
    socialImagePlaceholder.textContent='Выберите изображение для карточки или используйте автоматический выбор.';
    socialImage.onerror=()=>{socialImage.hidden=true;socialImagePlaceholder.hidden=false;socialImagePlaceholder.textContent='Не удалось загрузить файл предпросмотра.';};
    socialImageFrame.append(socialImage,socialImagePlaceholder);
    const socialTitle=document.createElement('div');socialTitle.id='cms-seo-social-title';socialTitle.className='cms-seo-social-title';
    const socialDescription=document.createElement('p');socialDescription.id='cms-seo-social-description';socialDescription.className='cms-seo-social-description';
    socialCard.append(socialLabel,socialImageFrame,socialTitle,socialDescription);
    seoPreviewGrid.append(searchCard,socialCard);seoPreview.append(seoPreviewHeading,seoPreviewGrid);
    const resolveSocialImage=page=>{
      const assets=session.current.assets||[];
      const image=id=>assets.find(asset=>asset.id===id&&['image/png','image/jpeg','image/webp'].includes(asset.mime))||null;
      const chosen=fields['seo-og-image'].value;
      if(chosen){const selected=image(chosen);if(selected)return selected;}
      for(const section of page.sections){
        for(const element of [...section.elements,...(section.items||[])]){
          const id=element.values?.['content.media'];
          if(id){const asset=image(id);if(asset)return asset;}
        }
      }
      let found=null;
      const walk=nodes=>{
        for(const node of nodes||[]){
          if(node.type==='image'&&node.assetId){found=image(node.assetId);if(found)return;}
          walk(node.children);
          if(found)return;
        }
      };
      for(const section of page.sections){
        walk(section.designGraph?.nodes);
        if(found)return found;
      }
      return null;
    };
    const refreshSeoPreview=()=>{
      if(!chosenPage)return;
      const site=session.current,page=site.pages.find(item=>item.id===chosenPage);
      if(!page)return;
      const title=fields['seo-title'].value.trim()||page.title+' | '+site.title;
      const description=fields['seo-description'].value.trim();
      const socialTitleValue=fields['seo-og-title'].value.trim()||title;
      const socialDescriptionValue=fields['seo-og-description'].value.trim()||description;
      searchPath.textContent=(site.title||'Ваш сайт')+' · '+page.path;
      searchTitle.textContent=title;
      searchDescription.textContent=description||'Мета description не задано — поисковик может самостоятельно выбрать фрагмент текста страницы.';
      searchDescription.classList.toggle('is-empty',!description);
      titleCount.textContent=Array.from(title).length+' символов · ориентир 30–60';
      descriptionCount.textContent=Array.from(description).length+' символов · ориентир 70–160';
      robotsStatus.textContent=fields['seo-robots'].value==='noindex'
        ?'Индексация запрещена: noindex':'Индексация разрешена';
      robotsStatus.classList.toggle('is-blocked',fields['seo-robots'].value==='noindex');
      socialTitle.textContent=socialTitleValue;
      socialDescription.textContent=socialDescriptionValue||'Описание для соцсетей не задано.';
      const asset=resolveSocialImage(page);
      if(!asset){
        socialImage.removeAttribute('src');socialImage.hidden=true;socialImagePlaceholder.hidden=false;
        socialImagePlaceholder.textContent='Для карточки не найдено изображение. Выберите файл в поле Open Graph.';
        return;
      }
      const localSource=typeof asset.src==='string'&&/^data:image\/(?:png|jpeg|webp);base64,/.test(asset.src)?asset.src:null;
      const hostedSource=HOSTED?window.Stage3Host?.previewUrl?.(asset.id):null;
      const source=localSource||hostedSource;
      if(source){
        socialImage.alt=asset.alt||'Изображение для публикации';
        socialImage.src=source;socialImage.hidden=false;socialImagePlaceholder.hidden=true;
      }else{
        socialImage.removeAttribute('src');socialImage.hidden=true;socialImagePlaceholder.hidden=false;
        socialImagePlaceholder.textContent=(asset.alt||asset.id)+' · файл доступен в медиабиблиотеке; серверный предпросмотр покажет его полностью.';
      }
    };
    for(const key of ['seo-title','seo-description','seo-og-title','seo-og-description'])
      fields[key].addEventListener('input',refreshSeoPreview);
    for(const key of ['seo-robots','seo-og-image'])
      fields[key].addEventListener('change',refreshSeoPreview);
    window.addEventListener('stage3-media-ready',refreshSeoPreview);
    const open=kind=>{
      mode=kind;chosenPage=current().page.id;
      header.textContent=kind==='theme'?'Стили и язык сайта':'SEO и меню · '+current().page.title;
      tip.textContent=kind==='theme'?'Для всех страниц; явные параметры компонентов сохраняются.':
        'Только текущая страница; публикация отдельно.';
      grid.querySelectorAll('label').forEach(n=>n.hidden=true);
      for(const key of (kind==='theme'?globalKeys:metaKeys))fields[key].parentElement.hidden=false;
      seoPreview.hidden=kind!=='seo';
      if(kind==='theme'){
        const t={...C.DEFAULT_THEME,...session.current.theme};
        for(const key of themeKeys)fields[key].value=t[key];
        fields.language.value=session.current.language||'ru';
      }else{
        const p=current().page,seo=p.seo||{},nav=p.navigation||{};
        fields['seo-title'].value=seo.title||'';
        fields['seo-description'].value=seo.description||'';
        fields['seo-robots'].value=seo.robots||'index';
        fields['seo-og-title'].value=seo.ogTitle||'';
        fields['seo-og-description'].value=seo.ogDescription||'';
        refreshSocialImages(seo.ogImage||'');
        fields['nav-label'].value=nav.label||'';
        fields['nav-hidden'].checked=!!nav.hidden;
        refreshSeoPreview();
      }
      dlg.showModal();
    };
    const apply=()=>{
      try{
        const site=cp(session.current);
        if(mode==='theme'){
          site.theme={background:fields.background.value,surface:fields.surface.value,
            text:fields.text.value,primary:fields.primary.value,font:fields.font.value,
            maxWidth:Number(fields.maxWidth.value),bodySize:Number(fields.bodySize.value),
            lineHeight:fields.lineHeight.value,headingScale:fields.headingScale.value,
            buttonStyle:fields.buttonStyle.value,buttonRadius:Number(fields.buttonRadius.value),
            buttonText:fields.buttonText.value};
          site.language=fields.language.value;
        }else{
          const p=site.pages.find(p=>p.id===chosenPage);
          if(!p)throw Error('Страница уже удалена');
          p.seo={title:fields['seo-title'].value,description:fields['seo-description'].value,robots:fields['seo-robots'].value,
            ogTitle:fields['seo-og-title'].value,ogDescription:fields['seo-og-description'].value,ogImage:fields['seo-og-image'].value};
          p.navigation={label:fields['nav-label'].value,hidden:fields['nav-hidden'].checked};
        }
        session=D.replaceSite(session,manifests,site,session.revision);dlg.close();draw();
        notice('Настройки изменены в черновике. Сохранение и публикация отдельно.');
      }catch(e){notice('Настройки отклонены: '+e.message,true);}
    };
    const ok=button('Применить к черновику','btn primary',apply);ok.id='cms-settings-apply';
    const close=button('Закрыть','btn',()=>dlg.close());close.id='cms-settings-close';
    actions.append(ok,close);dlg.append(header,tip,grid,seoPreview,actions);document.body.append(dlg);
    const tools=document.createElement('div');tools.className='structure-tools cms-site-settings';
    const theme=button('Стили и язык сайта','btn small',()=>open('theme'));theme.id='cms-open-theme';
    const seo=button('SEO и меню','btn small',()=>open('seo'));seo.id='cms-open-seo';
    tools.append(theme,seo);$('pages').before(tools);
  }


  // A single Undo-able menu editor, independent of the selected component.
  // All relationships reference immutable page IDs, not URLs.
  function initMenuEditor(){
    const dlg=document.createElement('dialog');dlg.id='cms-menu-editor';
    dlg.className='cms-settings-dialog';
    Object.assign(dlg.style,{width:'min(1000px,95vw)',maxHeight:'89vh',overflow:'auto'});
    const head=document.createElement('h2');head.textContent='Меню и навигация сайта';
    const help=document.createElement('p');
    help.textContent='Порядок страниц, вложенность в один уровень, видимость, адаптивное меню и кнопка действия. Изменения сохраняются в черновике; публикация отдельно.';
    const global=document.createElement('div');global.className='cms-settings-grid';
    const list=document.createElement('div');list.id='cms-menu-pages';
    const actions=document.createElement('div');actions.className='cms-settings-actions';
    let draft=null;
    const select=(entries,value,onChange)=>{
      const el=document.createElement('select');el.className='control';
      for(const [id,label] of entries){
        const option=document.createElement('option');option.value=id;option.textContent=label;el.append(option);
      }
      el.value=value;el.addEventListener('change',()=>onChange(el.value));return el;
    };
    const field=(title,node)=>{
      const label=document.createElement('label');label.textContent=title;label.append(node);return label;
    };
    const textField=(value,max,onChange)=>{
      const el=document.createElement('input');el.type='text';el.className='control';
      el.maxLength=max;el.value=value;el.addEventListener('change',()=>onChange(el.value));return el;
    };
    const check=(initial,changed)=>{
      const input=document.createElement('input');input.type='checkbox';input.checked=initial;
      input.addEventListener('change',()=>changed(input.checked));return input;
    };
    function pageOptions(excluding){
      return [['','Верхний уровень'],...draft.pages.filter(p=>
        p.id!==excluding&&!p.navigation?.hidden&&!p.navigation?.parentId
      ).map(p=>[p.id,p.navigation?.label||p.title])];
    }
    function drawMenu(){
      global.replaceChildren();list.replaceChildren();
      const menu=draft.menu||{...C.DEFAULT_MENU};draft.menu=menu;
      const style=select([['default','Обычный'],['quiet','Спокойный'],['bold','Выразительный']],
        menu.style,v=>{menu.style=v;});
      const sticky=check(menu.sticky,v=>{menu.sticky=v;});
      const mobile=select([['collapsible','Кнопка «Меню»'],['expanded','Список ссылок']],
        menu.mobile,v=>{menu.mobile=v;});
      const dest=select([['','Без кнопки'],...draft.pages.map(p=>[p.id,p.title])],menu.ctaPageId,v=>{
        menu.ctaPageId=v;if(!v)menu.ctaLabel='';
        else if(!menu.ctaLabel)menu.ctaLabel='Связаться';drawMenu();
      });
      const cta=textField(menu.ctaLabel,64,v=>{menu.ctaLabel=v;});
      cta.id='cms-menu-cta-label';
      global.append(field('Вид меню',style),field('Закрепить вверху при прокрутке',sticky),
        field('На мобильных',mobile),field('Куда ведёт кнопка',dest),
        field('Текст кнопки',cta));
      draft.pages.forEach((page,i)=>{
        const nav=page.navigation||{label:'',hidden:false};page.navigation=nav;
        const row=document.createElement('fieldset');row.dataset.menuPage=page.id;
        Object.assign(row.style,{border:'1px solid #60748a',borderRadius:'12px',padding:'12px',margin:'10px 0'});
        const title=document.createElement('legend');title.textContent=(i+1)+'. '+page.title+' · '+page.path;
        const cols=document.createElement('div');
        Object.assign(cols.style,{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(165px,1fr))',gap:'12px'});
        const label=textField(nav.label,100,v=>{nav.label=v;});
        const hidden=check(nav.hidden,v=>{
          nav.hidden=v;
          if(v)for(const child of draft.pages)if(child.navigation?.parentId===page.id)
            delete child.navigation.parentId;
          drawMenu();
        });
        const parents=select(page.path==='/'?[['','Главная — только верхний уровень']]:
          pageOptions(page.id),nav.parentId||'',v=>{
          if(v)nav.parentId=v;else delete nav.parentId;
          drawMenu();
        });
        parents.disabled=page.path==='/';
        cols.append(field('Название в меню',label),field('Скрыть из меню',hidden),
          field('Расположение (родитель)',parents));
        const ops=document.createElement('div');ops.className='structure-tools';
        const move=(delta)=>{
          const dest=i+delta;
          if(dest<0||dest>=draft.pages.length)return;
          [draft.pages[i],draft.pages[dest]]=[draft.pages[dest],draft.pages[i]];
          drawMenu();
        };
        const up=button('↑','btn small',()=>move(-1));up.setAttribute('aria-label','Поднять '+page.title);
        const down=button('↓','btn small',()=>move(1));down.setAttribute('aria-label','Опустить '+page.title);
        ops.append(up,down);row.append(title,cols,ops);list.append(row);
      });
    }
    const apply=button('Применить к черновику','btn primary',()=>{
      try{
        session=D.replaceSite(session,manifests,draft,session.revision);
        dlg.close();draw();
        notice('Навигация обновлена в черновике. Сохранение и публикация отдельно.');
      }catch(e){notice('Настройки меню отклонены: '+e.message,true);}
    });apply.id='cms-menu-apply';
    actions.append(apply,button('Закрыть','btn',()=>dlg.close()));
    dlg.append(head,help,global,list,actions);document.body.append(dlg);
    const launch=button('Конструктор меню','btn small',()=>{
      draft=cp(session.current);drawMenu();dlg.showModal();
    });
    launch.id='cms-menu-open';
    const box=document.createElement('div');box.className='structure-tools';
    box.append(launch);$('pages').before(box);
  }

  // Only an explicit quality-report action can focus a specific graph node.
  // No pending focus is persisted to site JSON, exports or published HTML.
  let pendingGraphAuditFocus=null;
  // One review surface for every authored site; analysis never changes documents.
  // Alias creation/deletion uses the same revisioned Undo/Redo contract as page edits.
  function initSiteQuality(){
    const dialog=document.createElement('dialog');dialog.className='cms-quality-dialog';dialog.id='cms-site-report';
    const heading=document.createElement('h2');heading.textContent='Проверка перед публикацией';
    const summary=document.createElement('p');summary.id='cms-quality-summary';
    const findings=document.createElement('div');findings.id='cms-quality-findings';
    const subtitle=document.createElement('h3');subtitle.textContent='Старые адреса страниц (301)';
    const aliases=document.createElement('div');aliases.id='cms-redirect-list';
    const form=document.createElement('form');form.id='cms-redirect-form';form.className='cms-redirect-form';
    const from=document.createElement('input');from.className='control';from.id='cms-redirect-from';
    from.type='text';from.required=true;from.placeholder='/old-page/';from.setAttribute('aria-label','Старый адрес');
    const target=document.createElement('select');target.className='control';target.id='cms-redirect-target';
    target.setAttribute('aria-label','Новая страница');
    const add=button('+ Перенаправление','btn small',()=>{});add.type='submit';add.dataset.editorWrite='true';
    form.append(from,target,add);
    const notes=document.createElement('small');
    notes.textContent='Перенаправления начнут работать только после публикации. Для отдельного HTML-хостинга экспортируются страницы-переходы; настоящий HTTP 301 требует настройки хостинга. SEO-подсказки не выдумывают факты: безопасная правка заполняет только пустые title названием страницы.';
    const safeTitles=button('Заполнить пустые SEO title','btn small',()=>{
      try{
        const next=cp(session.current);let changed=0;
        for(const page of next.pages){
          const old=page.seo||{};
          if(typeof old.title==='string'&&old.title.trim())continue;
          page.seo={title:page.title,description:'',robots:'index',ogTitle:'',ogDescription:'',ogImage:'',...old,title:page.title};
          changed++;
        }
        if(!changed){notice('Пустых SEO title нет.');return;}
        session=D.replaceSite(session,manifests,next,session.revision);
        draw();print();
        notice('Заполнено SEO title для '+changed+' страниц. Описание и индексация не менялись; действие можно отменить.');
      }catch(error){notice('SEO-правка отклонена: '+error.message,true);}
    });
    safeTitles.id='cms-seo-safe-fix';
    const close=button('Закрыть','btn',()=>dialog.close());
    dialog.append(heading,summary,findings,subtitle,aliases,form,notes,safeTitles,close);
    document.body.append(dialog);
    const print=()=>{
      const report=C.inspectSite(session.current,manifests);
      summary.textContent=report.pages+' страниц · '+report.indexable+' индексируемых · '+
        report.errors.length+' ошибок · '+report.warnings.length+' рекомендаций · '+
        report.redirects+' перенаправлений';
      const missingTitles=session.current.pages.filter(page=>!String(page.seo?.title||'').trim()).length;
      safeTitles.disabled=missingTitles===0;
      safeTitles.textContent=missingTitles?'Заполнить пустые SEO title ('+missingTitles+')':'Пустых SEO title нет';
      findings.replaceChildren();
      for(const [name,records] of [['Ошибки',report.errors],['Рекомендации',report.warnings]]){
        const section=document.createElement('section');
        const label=document.createElement('strong');label.textContent=name+' · '+records.length;section.append(label);
        if(!records.length){const note=document.createElement('p');note.textContent='Нет замечаний';section.append(note);}
        for(const issue of records.slice(0,120)){
          const line=document.createElement('div');line.className='cms-quality-finding';
          const message=document.createElement('span');
          message.textContent=(issue.pageId||'Сайт')+' · '+issue.path+' — '+issue.message;
          line.append(message);
          if(issue.pageId){
            const isSeo=issue.kind.startsWith('seo-')||issue.kind.startsWith('duplicate-seo-');
            const isAltFix=['missing-alt','generic-alt'].includes(issue.kind)&&!!issue.assetId;
            const jump=button(isSeo?'Открыть SEO':isAltFix?'Исправить ALT':issue.nodeId?'Открыть композицию':issue.assetId?'Перейти к изображению':'Открыть страницу',
              'btn small',()=>{
                if(isAltFix){
                  const asset=session.current.assets.find(item=>item.id===issue.assetId);
                  if(!asset)return;
                  const alt=prompt('Опишите, что изображено на картинке',asset.alt||'');
                  if(alt===null)return;
                  if(!alt.trim()){notice('ALT оставлен пустым. Укажите реальное содержание изображения или отмените правку.',true);return;}
                  structural({action:'renameAsset',assetId:asset.id,alt:alt.trim()});print();return;
                }
                const page=session.current.pages.find(item=>item.id===issue.pageId);
                if(!page)return;
                pageId=page.id;
                const selected=issue.sectionId?page.sections.find(item=>item.id===issue.sectionId):page.sections[0];
                sectionId=selected?.id||page.sections[0].id;
                elementId=issue.elementId&&selected?.elements.concat(selected.items||[]).some(item=>item.id===issue.elementId)
                  ?issue.elementId:(selected?.elements[0]?.id||'');
                pendingGraphAuditFocus=issue.nodeId&&selected?.designGraph
                  ?{pageId:page.id,sectionId:selected.id,nodeId:issue.nodeId,kind:issue.kind,message:issue.message}
                  :null;
                draw();dialog.close();
                if(isSeo)$('cms-open-seo')?.click();
                else if(pendingGraphAuditFocus)$('section-design-graph')?.click();
              });
            jump.setAttribute('aria-label',jump.textContent+' — '+issue.message);
            line.append(jump);
          }
          section.append(line);
        }
        findings.append(section);
      }
      target.replaceChildren();
      for(const page of session.current.pages){
        const option=document.createElement('option');option.value=page.path;
        option.textContent=page.title+' — '+page.path;target.append(option);
      }
      aliases.replaceChildren();
      if(!(session.current.redirects||[]).length)aliases.textContent='Пока нет старых адресов.';
      for(const redirect of session.current.redirects||[]){
        const line=document.createElement('div');line.className='cms-redirect-entry';
        const desc=document.createElement('code');desc.textContent=redirect.from+' → '+redirect.to;
        const del=button('Удалить','btn small',()=>{
          if(!confirm('Удалить перенаправление '+redirect.from+' из черновика?'))return;
          structural({action:'removeRedirect',from:redirect.from});print();
        });
        del.dataset.editorWrite='true';line.append(desc,del);aliases.append(line);
      }
      if(HOSTED)window.Stage3Host?.onDraw?.();
    };
    form.addEventListener('submit',event=>{
      event.preventDefault();
      structural({action:'addRedirect',from:from.value.trim(),to:target.value});
      from.value='';print();
    });
    const tools=document.createElement('div');tools.className='structure-tools cms-site-quality';
    const open=button('SEO-аудит и адреса','btn small',()=>{print();dialog.showModal();});
    open.id='cms-quality-open';tools.append(open);$('pages').before(tools);
  }

  // Discoverable browser-side catalog: the same closed registered components,
  // no arbitrary HTML, code, uploads or external template marketplace.
  function openComponentCatalog(){
    let dialog=$('cms-component-catalog');
    if(!dialog){
      dialog=document.createElement('dialog');
      dialog.id='cms-component-catalog';dialog.className='cms-component-catalog';
      const title=document.createElement('h2');title.textContent='Добавить секцию';
      const subtitle=document.createElement('p');subtitle.textContent='Выберите готовый компонент. Каждый пункт полностью редактируется после добавления.';
      const search=document.createElement('input');search.id='cms-component-search';
      search.className='control';search.type='search';search.placeholder='Найти: услуги, FAQ, форма, фото…';
      search.setAttribute('aria-label','Поиск компонента');
      const list=document.createElement('div');list.id='cms-component-list';
      const footer=document.createElement('div');footer.className='cms-component-footer';
      footer.append(button('Закрыть','btn',()=>dialog.close()));
      const category=m=>m.repeat?'Повторяемые элементы':
        m.id.includes('form')?'Форма заявки':m.id.includes('image')?'Медиа':'Основные секции';
      const render=()=>{
        list.replaceChildren();
        const query=search.value.trim().toLocaleLowerCase();
        for(const m of manifests.filter(m=>(m.id+' '+m.label+' '+category(m)).toLocaleLowerCase().includes(query))){
          const entry=button(m.label,'cms-component-choice',()=>{
            const id=uniqueId('section'),targetPage=pageId;
            structural({action:'addSection',pageId:targetPage,sectionId,id,component:m.id});
            const inserted=session.current.pages.find(p=>p.id===targetPage)?.sections.find(s=>s.id===id);
            if(inserted){
              sectionId=id;elementId=inserted.elements[0].id;dialog.close();draw();
            }
          });
          entry.dataset.component=m.id;
          const description=document.createElement('small');
          description.textContent=category(m)+' · '+(m.repeat?'от '+m.repeat.min+' до '+m.repeat.max+' элементов':'редактируемые поля');
          entry.append(description);list.append(entry);
        }
        if(!list.children.length){const p=document.createElement('p');p.textContent='По запросу ничего не найдено';list.append(p);}
      };
      search.addEventListener('input',render);
      dialog.append(title,subtitle,search,list,footer);
      document.body.append(dialog);
      dialog.renderCatalog=render;
    }
    $('cms-component-search').value='';dialog.renderCatalog();dialog.showModal();$('cms-component-search').focus();
  }
  function initFullPagePreview(){
    const modal=document.createElement('dialog');modal.id='cms-page-preview';
    modal.className='cms-page-preview';modal.setAttribute('aria-label','Предпросмотр всей страницы');
    const header=document.createElement('div');header.className='cms-page-preview-header';
    const heading=document.createElement('h2');heading.textContent=HOSTED?'Предпросмотр страницы · рендер CMS':'Предпросмотр всей страницы';
    const pathSelect=document.createElement('select');pathSelect.className='control';
    pathSelect.id='cms-page-preview-path';pathSelect.setAttribute('aria-label','Страница сайта');
    const frameMode=document.createElement('div');frameMode.className='cms-page-preview-modes';
    const area=document.createElement('div');area.className='cms-page-preview-area';
    const frame=document.createElement('iframe');frame.id='cms-page-preview-frame';
    frame.setAttribute('sandbox','allow-same-origin');frame.title='Изолированный предпросмотр всей страницы';
    frame.setAttribute('referrerpolicy','no-referrer');area.append(frame);
    let mode='desktop',previewRequest=0,previewScroll=0;
    const render=async()=>{
      previewScroll=frame.contentWindow?.scrollY||0;
      const requestId=++previewRequest,path=pathSelect.value;
      frame.style.width=mode==='mobile'?'390px':mode==='tablet'?'768px':'100%';
      if(!HOSTED){frame.srcdoc=window.Stage3Editor.previewDocument(session.current,path);return;}
      frame.srcdoc='<!doctype html><html><body style="font:15px system-ui;padding:24px">Строим предпросмотр черновика…</body></html>';
      try{
        const html=await window.Stage3Host.previewPage(session.current,path);
        if(requestId===previewRequest)frame.srcdoc=html;
      }catch(error){
        if(requestId!==previewRequest)return;
        frame.srcdoc='<!doctype html><html><body style="font:15px system-ui;padding:24px"><p>Не удалось построить серверный предпросмотр: '+escapeHtml(error.message)+'</p></body></html>';
      }
    };
    modal.addEventListener('close',()=>{previewRequest++;});
    for(const [value,name] of [['desktop','ПК'],['tablet','Планшет'],['mobile','Телефон']]){
      const option=button(name,'btn small',()=>{
        mode=value;frameMode.querySelectorAll('button').forEach(el=>el.classList.toggle('active',el===option));render();
      });
      option.dataset.mode=value;frameMode.append(option);
    }
    pathSelect.addEventListener('change',render);
    const close=button('Закрыть','btn',()=>modal.close());
    header.append(heading,pathSelect,frameMode,close);
    const note=document.createElement('small');
    note.textContent=HOSTED?'Черновик отрисован тем же PHP-рендерером, что и публикация. Скрипты, ссылки и отправка форм отключены; ничего не публикуется.':'Предпросмотр только черновика · без выполнения скриптов, без отправки заявок и без публикации.';

    const layout=document.createElement('div');layout.className='cms-work-layout';
    const workPanel=document.createElement('aside');workPanel.className='cms-work-panel';
    const workTitle=document.createElement('h3');workTitle.id='cms-work-title';
    const workSectionPicker=document.createElement('select');workSectionPicker.id='cms-work-section';workSectionPicker.className='control';
    const workElementPicker=document.createElement('select');workElementPicker.id='cms-work-element';workElementPicker.className='control';
    const workActions=document.createElement('div');workActions.className='cms-work-actions';
    const workFields=document.createElement('div');workFields.id='cms-work-fields';
    const workAdd=document.createElement('div');workAdd.className='cms-work-add';
    const workStatus=document.createElement('small');workStatus.id='cms-work-status';workStatus.setAttribute('role','status');
    const workError=document.createElement('small');workError.id='cms-work-error';workError.setAttribute('role','alert');
    workPanel.append(workTitle,workSectionPicker,workActions,workElementPicker,workFields,workAdd,workStatus,workError);
    layout.append(area,workPanel);modal.append(header,note,layout);document.body.append(modal);

    // Selected page persists independently of main inspector focus.
    // The preview itself remains script-free; parent only reads first-party IDs.
    // Select sections only in the validated, scriptless page preview.
    // Every edit uses the same SDK draft history as the right-side inspector.
    let workSection='',workElement='';
    const canWrite=()=>!HOSTED||!!window.Stage3Host?.canEditStudio?.();
    const pageForWork=()=>session.current.pages.find(p=>p.path===pathSelect.value);
    const sectionForWork=()=>pageForWork()?.sections.find(s=>s.id===workSection);
    const feedback=(s,bad=false)=>{workError.textContent=bad?s:'';workStatus.textContent=bad?'Не применено':s;};
    const workButton=(label,fn)=>{const b=button(label,'btn small',fn);b.dataset.editorWrite='true';return b;};
    function highlightWork(){
      const doc=frame.contentDocument;if(!doc)return;
      for(const el of doc.querySelectorAll('.cms-work-target'))
        el.classList.toggle('cms-work-current',el.id===workSection);
    }
    frame.addEventListener('load',()=>{
      const doc=frame.contentDocument,page=pageForWork();if(!doc||!page)return;
      const ids=new Set(page.sections.map(s=>s.id));
      const css=doc.createElement('style');
      css.textContent='.cms-work-target:hover{outline:2px dashed #20b0dc!important;cursor:grab}.cms-work-current{outline:3px solid #ff9b37!important;outline-offset:-3px!important}.cms-work-before{box-shadow:inset 0 6px #20b0dc!important}.cms-work-after{box-shadow:inset 0 -6px #20b0dc!important}';
      doc.head.append(css);
      const idOf=el=>el?.dataset?.cmsSectionId||el?.id||'';
      const getTarget=event=>{
        const target=event.target;
        if(!(target instanceof doc.defaultView.Element))return null;
        const el=target.closest('[data-cms-section-id],section[id]');
        return el&&ids.has(idOf(el))?el:null;
      };
      const sections=doc.querySelectorAll('[data-cms-section-id],section[id]');
      for(const el of sections){
        if(!ids.has(idOf(el)))continue;
        el.classList.add('cms-work-target');
        // Dragging is parent-owned: this srcdoc never receives executable code.
        el.draggable=canWrite();
      }
      doc.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        const el=getTarget(e);
        if(el){workSection=idOf(el);workElement='';showWork();highlightWork();}
      },true);
      let dragging='';
      const clearDrop=()=>{
        for(const el of doc.querySelectorAll('.cms-work-before,.cms-work-after'))
          el.classList.remove('cms-work-before','cms-work-after');
      };
      doc.addEventListener('dragstart',e=>{
        const el=getTarget(e);
        if(!canWrite()||!el){e.preventDefault();return;}
        dragging=idOf(el);
        if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','cms-section');}
      },true);
      doc.addEventListener('dragover',e=>{
        const el=getTarget(e),id=idOf(el);
        if(!dragging||!el||id===dragging||!canWrite())return;
        e.preventDefault();clearDrop();
        el.classList.add(e.clientY<el.getBoundingClientRect().top+el.getBoundingClientRect().height/2?
          'cms-work-before':'cms-work-after');
        if(e.dataTransfer)e.dataTransfer.dropEffect='move';
      },true);
      doc.addEventListener('drop',e=>{
        const el=getTarget(e),id=idOf(el),moving=dragging;
        e.preventDefault();clearDrop();dragging='';
        if(!moving||!el||id===moving||!canWrite())return;
        const pageNow=pageForWork();if(!pageNow)return;
        const side=e.clientY<el.getBoundingClientRect().top+el.getBoundingClientRect().height/2?
          'before':'after';
        workSection=moving;
        structureWork({action:'placeSection',mode:'move',pageId:pageNow.id,
          sectionId:moving,toPageId:pageNow.id,targetSectionId:id,side});
      },true);
      doc.addEventListener('dragend',()=>{clearDrop();dragging='';},true);
      doc.addEventListener('submit',e=>{e.preventDefault();e.stopPropagation();},true);
      // Re-renders must not jump to the top of a long page.
      if(previewScroll>0)frame.contentWindow?.scrollTo(0,previewScroll);
      highlightWork();
    });
    function structureWork(action){
      if(!canWrite())return feedback('Нет права на редактирование.',true);
      try{
        const signature=x=>[x.kind,x.pageId,x.sectionId||'',x.path].join('|');
        const before=new Set(C.inspectSite(session.current,manifests).errors
          .filter(x=>x.kind==='broken-link'||x.kind==='broken-anchor').map(signature));
        const next=D.structure(session,manifests,{...action,expectedRevision:session.revision});
        const broken=C.inspectSite(next.current,manifests).errors.filter(x=>
          (x.kind==='broken-link'||x.kind==='broken-anchor')&&!before.has(signature(x)));
        if(broken.length)throw Error('Новая битая ссылка: '+broken[0].path);
        session=next;
        if(!sectionForWork())workSection=pageForWork()?.sections[0]?.id||'';
        workElement='';draw();showWork();render();
        feedback('Структура изменена в черновике. Сохранить и опубликовать — отдельно.');
      }catch(e){feedback(e.message,true);}
    }
    function editWork(f,field){
      if(!canWrite())return feedback('Нет права на редактирование.',true);
      const page=pageForWork(),section=sectionForWork();
      if(!page||!section)return;
      try{
        const raw=f.type==='boolean'?field.checked:field.value;
        session=D.edit(session,manifests,{pageId:page.id,sectionId:section.id,
          elementId:workElement,path:f.path,value:f.type==='number'?Number(raw):raw,
          breakpoint:f.responsive?mode:null,expectedRevision:session.revision});
        draw();showWork();render();
        feedback('Поле изменено в черновике. Undo доступен.');
      }catch(e){feedback(e.message,true);}
    }
    function showWork(){
      const page=pageForWork(),section=sectionForWork();
      workTitle.textContent=section?(manifest(section)?.label||section.component):'Выберите блок на странице';
      workSectionPicker.replaceChildren();workElementPicker.replaceChildren();
      workActions.replaceChildren();workFields.replaceChildren();workAdd.replaceChildren();
      if(!page||!section)return;
      for(const s of page.sections){const o=document.createElement('option');o.value=s.id;
        o.textContent=manifest(s)?.label||s.component;workSectionPicker.append(o);}
      workSectionPicker.value=section.id;
      const position=page.sections.indexOf(section);
      const up=workButton('↑',()=>structureWork({action:'moveSection',pageId:page.id,sectionId:section.id,delta:-1}));
      const down=workButton('↓',()=>structureWork({action:'moveSection',pageId:page.id,sectionId:section.id,delta:1}));
      up.disabled=position===0;down.disabled=position===page.sections.length-1;
      const duplicate=workButton('Копия',()=>{
        const id=uniqueId('section');
        structureWork({action:'duplicateSection',pageId:page.id,sectionId:section.id,id});
        if(pageForWork()?.sections.some(s=>s.id===id)){workSection=id;showWork();highlightWork();}
      });
      const remove=workButton('Удалить',()=>{
        if(page.sections.length>1&&confirm('Удалить блок из черновика?'))
          structureWork({action:'removeSection',pageId:page.id,sectionId:section.id});
      });
      remove.disabled=page.sections.length===1;
      const inspect=button('Полный инспектор','btn small',()=>{
        pageId=page.id;sectionId=section.id;elementId=workElement;breakpoint=mode;draw();modal.close();
      });
      workActions.append(up,down,duplicate,remove,inspect);
      const els=[...section.elements,...(section.items||[])];
      if(!els.some(e=>e.id===workElement))workElement=section.elements[0].id;
      for(const e of els){const o=document.createElement('option');o.value=e.id;
        o.textContent=e.slot||'Карточка '+(section.items.indexOf(e)+1);workElementPicker.append(o);}
      workElementPicker.value=workElement;
      for(const f of C.controls(session.current,manifests,page.id,section.id,workElement)){
        const line=document.createElement('label');line.className='cms-work-field';
        const caption=document.createElement('span');caption.textContent=f.label+(f.responsive?' · '+mode:'');
        const initial=f.responsive?C.effectiveValue(f.value,mode):f.value;
        let control;
        if(f.type==='enum'||f.type==='media'){
          control=document.createElement('select');
          for(const v of f.type==='enum'?f.options:['',...session.current.assets.map(a=>a.id)]){
            const o=document.createElement('option');o.value=v;
            o.textContent=f.type==='enum'?v:(session.current.assets.find(a=>a.id===v)?.alt||v||'Без изображения');
            control.append(o);
          }
          control.value=initial;
        }else{
          control=document.createElement(f.path==='content.options'?'textarea':'input');
          if(control.tagName==='INPUT')control.type=f.type==='boolean'?'checkbox':f.type==='number'?'number':f.type==='color'?'color':'text';
          if(f.type==='boolean')control.checked=initial;
          else control.value=safeText(initial);
          if(f.type==='number'){control.min=f.min;control.max=f.max;}
          if(f.maxLength)control.maxLength=f.maxLength;
        }
        control.className='control';control.dataset.pageField=f.path;control.disabled=!canWrite();
        control.addEventListener('change',()=>editWork(f,control));
        line.append(caption,control);workFields.append(line);
      }
      if(section.designGraph){
        const help=document.createElement('small');
        help.textContent='Для вложенных узлов откройте полный инспектор → Дизайн-композиция.';
        workFields.prepend(help);
      }
      const choose=document.createElement('select');choose.className='control';choose.id='cms-work-component';
      for(const m of manifests){const o=document.createElement('option');o.value=m.id;o.textContent=m.label;choose.append(o);}
      choose.value='feature-highlights';
      const add=workButton('+ Блок после',()=>{
        const id=uniqueId('section');
        structureWork({action:'addSection',pageId:page.id,sectionId:section.id,id,component:choose.value});
        if(pageForWork()?.sections.some(s=>s.id===id)){workSection=id;showWork();render();}
      });
      workAdd.append(choose,add);

      // One-click appearance presets write the same typed appearance as the
      // classic inspector, with immediate page preview and a single draft Undo.
      const appearance=document.createElement('details');appearance.className='cms-work-appearance';
      const caption=document.createElement('summary');caption.textContent='Быстрое оформление блока';
      appearance.append(caption);
      const variants={
        surface:[['default','Как в компоненте'],['paper','Белый'],['tint','Мягкий голубой'],['dark','Тёмный']],
        spacing:[['tight','Компактно'],['normal','Стандартно'],['airy','Просторно']],
        align:[['left','Слева'],['center','По центру']],
        width:[['default','Обычно'],['narrow','Узкий'],['wide','Широкий']],
        heading:[['default','Обычный заголовок'],['compact','Компактный'],['expressive','Крупный']],
        corners:[['default','Как в компоненте'],['soft','Мягкие'],['round','Сильное скругление']],
        button:[['default','Общие кнопки'],['solid','Заливка'],['outline','Контур'],['pill','Округлые']],
        mobileAlign:[['inherit','Как на ПК'],['left','Слева'],['center','По центру']],
        mobileSpacing:[['inherit','Как на ПК'],['tight','Компактно'],['normal','Обычно'],['airy','Просторно']]
      };
      for(const [key,options] of Object.entries(variants)){
        const line=document.createElement('label');line.className='cms-work-field';
        const label=document.createElement('span');label.textContent=({
          surface:'Фон',spacing:'Отступы',align:'Выравнивание',width:'Ширина',
          heading:'Заголовок',corners:'Углы',button:'Кнопки',
          mobileAlign:'Телефон · выравнивание',mobileSpacing:'Телефон · отступы'
        })[key];
        const ctl=document.createElement('select');ctl.className='control';
        ctl.dataset.workAppearance=key;
        for(const [value,visible] of options){
          const option=document.createElement('option');option.value=value;option.textContent=visible;ctl.append(option);
        }
        ctl.value=section.appearance?.[key]||C.DEFAULT_APPEARANCE[key];ctl.disabled=!canWrite();
        ctl.addEventListener('change',()=>{
          const original={...C.DEFAULT_APPEARANCE,...sectionForWork()?.appearance};
          structureWork({action:'updateAppearance',pageId:page.id,sectionId:section.id,
            appearance:{...original,[key]:ctl.value}});
        });
        line.append(label,ctl);appearance.append(line);
      }
      workFields.append(appearance);

      // Use the existing full editors instead of building competing dialogs.
      const advanced=document.createElement('div');advanced.className='cms-work-advanced';
      const openExisting=id=>{
        pageId=page.id;sectionId=section.id;elementId=workElement;breakpoint=mode;
        draw();modal.close();$(id)?.click();
      };
      advanced.append(workButton('Дизайн-композиция',()=>openExisting('section-design-graph')),
        workButton('Расширенное оформление',()=>openExisting('section-appearance')));
      if(['lead-form','lead-form-flex'].includes(section.component))
        advanced.append(workButton('Конструктор формы',()=>openExisting('cms-form-builder-open')));
      workFields.append(advanced);

      // Precise copy/move across pages and within a page: target before/after,
      // or append. Only the original moved section rewires incoming anchors.
      const cross=document.createElement('details');cross.className='cms-work-cross';
      const crossCaption=document.createElement('summary');crossCaption.textContent='Разместить на другой странице';
      const destination=document.createElement('select');destination.className='control';
      destination.id='cms-work-destination';
      for(const p of session.current.pages){
        const option=document.createElement('option');option.value=p.id;option.textContent=p.title+' · '+p.path;
        destination.append(option);
      }
      destination.value=session.current.pages.find(p=>p.id!==page.id)?.id||page.id;
      const position=document.createElement('select');position.className='control';position.id='cms-work-position';
      const drawTargets=()=>{
        position.replaceChildren();
        const end=document.createElement('option');end.value='';end.textContent='В конец страницы';
        position.append(end);
        const target=session.current.pages.find(p=>p.id===destination.value);
        for(const sectionTarget of target?.sections||[]){
          const option=document.createElement('option');option.value=sectionTarget.id;
          option.textContent='Перед: '+(manifest(sectionTarget)?.label||sectionTarget.component);
          position.append(option);
        }
      };
      destination.addEventListener('change',drawTargets);drawTargets();
      const place=modeValue=>{
        const target=session.current.pages.find(p=>p.id===destination.value);
        const sectionId=section.id;
        const id=modeValue==='copy'?uniqueId('section'):sectionId;
        structureWork({action:'placeSection',mode:modeValue,pageId:page.id,
          sectionId,toPageId:target.id,targetSectionId:position.value||undefined,
          side:position.value?'before':'end',...(modeValue==='copy'?{id}:{})});
        if(target.sections.some(s=>s.id===id)||session.current.pages
          .find(p=>p.id===target.id)?.sections.some(s=>s.id===id)){
          const actual=session.current.pages.find(p=>p.id===target.id);
          if(actual.sections.some(s=>s.id===id)){
            pathSelect.value=actual.path;workSection=id;workElement='';
            showWork();render();
          }
        }
      };
      const ops=document.createElement('div');ops.className='cms-work-actions';
      const move=workButton('Перенести',()=>place('move'));
      move.disabled=page.sections.length===1||!canWrite();
      ops.append(move,workButton('Скопировать',()=>place('copy')));
      cross.append(crossCaption,destination,position,ops);
      workAdd.append(cross);
      for(const b of workPanel.querySelectorAll('[data-editor-write]'))b.disabled ||= !canWrite();
    }
    workSectionPicker.addEventListener('change',()=>{workSection=workSectionPicker.value;workElement='';showWork();highlightWork();});
    workElementPicker.addEventListener('change',()=>{workElement=workElementPicker.value;showWork();});
    pathSelect.addEventListener('change',()=>{previewScroll=0;workSection=pageForWork()?.sections[0]?.id||'';workElement='';showWork();});
    const history=document.createElement('div');history.id='cms-work-history';history.className='cms-work-history';
    history.append(workButton('↶ Отмена',()=>{
      if(!canWrite())return;session=D.undo(session,manifests);draw();showWork();render();
      feedback('Undo восстановил черновик, публикация не изменена.');
    }),workButton('↷ Повтор',()=>{
      if(!canWrite())return;session=D.redo(session,manifests);draw();showWork();render();
      feedback('Redo обновил черновик, публикация не изменена.');
    }));workPanel.append(history);
    const open=button('Вся страница · редактировать','btn small',()=>{
      pathSelect.replaceChildren();
      for(const page of session.current.pages){
        const option=document.createElement('option');option.value=page.path;
        option.textContent=page.title+' · '+page.path;pathSelect.append(option);
      }
      pathSelect.value=current().page.path;
      workSection=current().section.id;workElement=elementId;showWork();
      frameMode.querySelectorAll('button').forEach(el=>el.classList.toggle('active',el.dataset.mode===mode));
      render();modal.showModal();
    });
    open.id='cms-open-page-preview';
    document.querySelector('.canvas-toolbar .devices').before(open);
  }
  // Closed enum-only section presentation; same Undo/Redo/save/release as content.
  function initAppearanceEditor(){
    const dlg=document.createElement('dialog');dlg.id='cms-appearance-dialog';
    dlg.className='cms-appearance-dialog';
    const title=document.createElement('h2');title.textContent='Оформление выбранного блока';
    const note=document.createElement('p');note.textContent='Фон, типографика, ширина, скругление, кнопки и адаптивные настройки выбранного блока. Публикация отдельно.';
    const fields={};
    const pick=(id,label,choices)=>{
      const wrap=document.createElement('label');wrap.textContent=label;
      const select=document.createElement('select');select.className='control';
      select.id='cms-appearance-'+id;
      for(const [value,text] of choices){const option=document.createElement('option');
        option.value=value;option.textContent=text;select.append(option);}
      wrap.append(select);fields[id]=select;return wrap;
    };
    dlg.append(title,note,
      pick('surface','Фон', [['default','Как в компоненте'],['paper','Белый / поверхность'],['tint','Мягкий голубой'],['dark','Тёмный']]),
      pick('spacing','Вертикальные отступы',[['tight','Компактные'],['normal','Стандартные'],['airy','Просторные']]),
      pick('align','Выравнивание',[['left','Слева'],['center','По центру']]),
      pick('width','Ширина секции',[['default','Стандартная'],['narrow','Узкая'],['wide','Во всю ширину содержимого']]),
      pick('heading','Типографика H2',[['default','Стандартная'],['compact','Компактная'],['expressive','Выразительная']]),
      pick('corners','Скругления элементов',[['default','Как в компоненте'],['soft','12 пикселей'],['round','28 пикселей']]),
      pick('button','Оформление кнопок',[['default','Наследовать стиль сайта'],['solid','Залитые'],['outline','Контурные'],['pill','Округлые']]),
      pick('mobileAlign','Выравнивание на телефоне',[['inherit','Как на ПК'],['left','Слева'],['center','По центру']]),
      pick('mobileSpacing','Отступы на телефоне',[['inherit','Как на ПК'],['tight','Компактные'],['normal','Стандартные'],['airy','Просторные']]));
    const actionBar=document.createElement('div');actionBar.className='cms-appearance-actions';
    const apply=button('Применить','btn primary',()=>{
      const appearance=Object.fromEntries(Object.entries(fields).map(([name,input])=>[name,input.value]));
      const selected=current();
      structural({action:'updateAppearance',pageId:selected.page.id,sectionId:selected.section.id,appearance});
      dlg.close();
    });apply.id='cms-appearance-apply';
    actionBar.append(apply,button('Закрыть','btn',()=>dlg.close()));dlg.append(actionBar);
    document.body.append(dlg);
    const open=()=>{
      const section=current().section,a={...C.DEFAULT_APPEARANCE,...section.appearance};
      for(const [key,input] of Object.entries(fields))input.value=a[key];
      title.textContent='Оформление · '+(manifest(section)?.label||section.component);
      dlg.showModal();
    };
    return open;
  }
  // A node-level, no-AI composition inspector. Graph edits join normal CMS
  // Undo/Redo, private drafts and explicit publish. No arbitrary HTML or CSS.
  function initDesignGraphEditor(){
    const dlg=document.createElement('dialog');dlg.id='cms-design-graph-dialog';
    dlg.className='cms-appearance-dialog cms-design-graph-dialog';
    const title=document.createElement('h2');title.textContent='Дизайн-композиция';
    const info=document.createElement('p');
    info.textContent='Контейнеры, Flex/Grid, текст, кнопки, изображения, токены, адаптивные настройки и состояния. Сохранение и публикация отдельно.';
    const toolbar=document.createElement('div');toolbar.className='cms-appearance-actions';
    const auditFocus=document.createElement('div');auditFocus.id='cms-design-audit-focus';
    auditFocus.className='cms-design-audit-focus';auditFocus.setAttribute('role','status');auditFocus.hidden=true;
    const root=document.createElement('div');root.className='cms-design-graph-editor';
    const footer=document.createElement('div');footer.className='cms-appearance-actions';
    const auditPanel=document.createElement('section');auditPanel.id='cms-design-a11y';
    auditPanel.className='cms-design-a11y';auditPanel.setAttribute('role','region');
    auditPanel.setAttribute('aria-label','Проверка доступности дизайн-композиции');
    const workspace=document.createElement('div');workspace.className='cms-design-workspace';
    const visual=document.createElement('div');visual.className='cms-design-visual';
    const deviceTools=document.createElement('div');deviceTools.className='cms-design-device-tools';
    const canvasStage=document.createElement('div');canvasStage.id='cms-design-visual-stage';
    const previewFrame=document.createElement('iframe');previewFrame.id='cms-design-preview-frame';
    // The HTML is rendered exclusively by our validated, escaped design-graph
    // renderer. No scripts, forms, top navigation or foreign content execution.
    previewFrame.setAttribute('sandbox','allow-same-origin');
    previewFrame.title='Визуальный выбор элементов композиции';
    const visualHint=document.createElement('p');visualHint.id='cms-design-visual-hint';
    visualHint.textContent='Клик — выбрать · Перетащить на узел — порядок/вложенность · Alt+перетаскивание — смещение · маркеры — размер (шаг 8 px)';
    canvasStage.append(previewFrame);visual.append(deviceTools,canvasStage,visualHint);
    workspace.append(visual,root);
    dlg.append(title,info,auditFocus,toolbar,workspace,auditPanel,footer);
    document.body.append(dlg);
    let graph,tokens,selection,mode='desktop',sourcePage,sourceSection,previewDevice='desktop';
    let activeAuditFocus=null,auditNodeFocusPending=false;
    let undoStack=[],redoStack=[],activeGesture=null,suppressPreviewClick=false;
    const PREVIEW_WIDTHS={desktop:1200,tablet:780,mobile:390};
    const snapshot=()=>JSON.stringify({graph,tokens,selection,mode,previewDevice});
    const updateHistoryButtons=()=>{
      const undo=toolbar.querySelector('#cms-design-undo'),redo=toolbar.querySelector('#cms-design-redo');
      if(undo)undo.disabled=!undoStack.length;
      if(redo)redo.disabled=!redoStack.length;
    };
    const recordHistory=(entry=snapshot())=>{
      undoStack.push(entry);
      if(undoStack.length>80)undoStack.shift();
      redoStack=[];updateHistoryButtons();
    };
    const restoreHistory=(from,to)=>{
      if(!from.length)return;
      to.push(snapshot());
      const state=JSON.parse(from.pop());
      graph=state.graph;tokens=state.tokens;selection=state.selection;
      mode=state.mode;previewDevice=state.previewDevice||'desktop';
      render();
    };
    const undoGraph=()=>restoreHistory(undoStack,redoStack);
    const redoGraph=()=>restoreHistory(redoStack,undoStack);
    const nodeIdFromElement=element=>
      element&&Array.from(element.classList||[]).find(name=>name.startsWith('cmsdg-n-'))?.slice(8);
    const drawResizeHandles=()=>{
      const doc=previewFrame.contentDocument;
      if(!doc)return;
      doc.querySelector('.cms-design-resize-overlay')?.remove();
      if(!['desktop','tablet','mobile'].includes(mode))return;
      const row=all().find(item=>item.node.id===selection);
      const node=doc.querySelector('.cmsdg-n-'+selection);
      if(!row||!node)return;
      const rect=node.getBoundingClientRect();
      if(rect.width<8||rect.height<8)return;
      const overlay=doc.createElement('div');
      overlay.className='cms-design-resize-overlay';
      Object.assign(overlay.style,{position:'fixed',zIndex:'2147483647',left:rect.left+'px',
        top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',
        boxSizing:'border-box',border:'1px dashed #e88622',pointerEvents:'none'});
      const handles=[
        ['w','-8px','calc(50% - 8px)','ew-resize'],
        ['e','calc(100% - 8px)','calc(50% - 8px)','ew-resize'],
        ['s','calc(50% - 8px)','calc(100% - 8px)','ns-resize'],
        ['se','calc(100% - 8px)','calc(100% - 8px)','nwse-resize']
      ];
      for(const [dir,left,top,cursor] of handles){
        const handle=doc.createElement('div');
        handle.className='cms-design-resize-handle';handle.dataset.resizeDir=dir;
        handle.setAttribute('role','presentation');handle.title='Изменить размер · сетка 8 px';
        Object.assign(handle.style,{position:'absolute',left,top,width:'16px',height:'16px',
          boxSizing:'border-box',border:'2px solid #fff',borderRadius:'50%',
          background:'#e88622',boxShadow:'0 1px 5px #10203080',cursor,
          pointerEvents:'auto',touchAction:'none'});
        overlay.append(handle);
      }
      doc.body.append(overlay);
    };
    const syncVisualSelection=()=>{
      const doc=previewFrame.contentDocument;
      if(!doc)return;
      for(const old of doc.querySelectorAll('.cms-design-picked'))old.classList.remove('cms-design-picked');
      const node=doc.querySelector('.cmsdg-n-'+selection);
      if(node){node.classList.add('cms-design-picked');node.setAttribute('data-cms-design-selected','true');}
      for(const old of doc.querySelectorAll('[data-cms-design-selected]')){
        if(old!==node)old.removeAttribute('data-cms-design-selected');
      }
      drawResizeHandles();
    };
    const suppressGestureClick=()=>{
      suppressPreviewClick=true;
      window.requestAnimationFrame(()=>{suppressPreviewClick=false;});
    };
    const clearDropIndicators=doc=>{
      for(const node of doc.querySelectorAll('.cms-design-drop-before,.cms-design-drop-after,.cms-design-drop-inside,.cms-design-dragging'))
        node.classList.remove('cms-design-drop-before','cms-design-drop-after','cms-design-drop-inside','cms-design-dragging');
    };
    const updateOverlayRect=(doc,node)=>{
      const overlay=doc.querySelector('.cms-design-resize-overlay');
      if(!overlay||!node)return;
      const rect=node.getBoundingClientRect();
      Object.assign(overlay.style,{left:rect.left+'px',top:rect.top+'px',
        width:rect.width+'px',height:rect.height+'px'});
    };
    previewFrame.addEventListener('load',()=>{
      const doc=previewFrame.contentDocument;
      if(!doc)return;
      const selectFromPreview=event=>{
        if(suppressPreviewClick){
          event.preventDefault();event.stopImmediatePropagation();suppressPreviewClick=false;return;
        }
        // Links, form submits and videos stay inert in the selection-only canvas.
        event.preventDefault();
        if(event.target?.closest?.('.cms-design-resize-handle'))return;
        const target=event.target?.closest?.('[class*="cmsdg-n-"]');
        const id=nodeIdFromElement(target);
        if(id&&all().some(row=>row.node.id===id)){
          selection=id;
          render();
        }
      };
      doc.addEventListener('pointerdown',event=>{
        if(activeGesture)return;
        const handle=event.target?.closest?.('.cms-design-resize-handle');
        if(handle){
          if(!['desktop','tablet','mobile'].includes(mode))return;
          const row=all().find(item=>item.node.id===selection);
          const target=doc.querySelector('.cmsdg-n-'+selection);
          if(!row||!target)return;
          event.preventDefault();event.stopPropagation();
          const rect=target.getBoundingClientRect();
          const base=row.node.styles||{},bp=(mode==='tablet'||mode==='mobile')?(row.node.responsive?.[mode]||{}):{};
          activeGesture={kind:'resize',pointerId:event.pointerId,nodeId:selection,target,
            dir:handle.dataset.resizeDir,startX:event.clientX,startY:event.clientY,
            startWidth:rect.width,startHeight:rect.height,width:rect.width,height:rect.height,
            startTranslateX:Number(bp.translateX??base.translateX??0),
            startTranslateY:Number(bp.translateY??base.translateY??0),changed:false};
          try{handle.setPointerCapture(event.pointerId);}catch(_){}
          return;
        }
        const target=event.target?.closest?.('[class*="cmsdg-n-"]');
        const id=nodeIdFromElement(target),row=all().find(item=>item.node.id===id);
        if(!row)return;
        event.preventDefault();
        selection=id;
        const base=row.node.styles||{},bp=(mode==='tablet'||mode==='mobile')?(row.node.responsive?.[mode]||{}):{};
        activeGesture={kind:event.altKey&&!['hover','focus'].includes(mode)?'translate':'move',
          pointerId:event.pointerId,nodeId:id,target,startX:event.clientX,startY:event.clientY,
          startTranslateX:Number(bp.translateX??base.translateX??0),
          startTranslateY:Number(bp.translateY??base.translateY??0),
          dragging:false,candidateId:null,placement:null,changed:false};
        try{target.setPointerCapture(event.pointerId);}catch(_){}
        syncVisualSelection();
      },true);
      doc.addEventListener('pointermove',event=>{
        const g=activeGesture;
        if(!g||g.pointerId!==event.pointerId)return;
        const dx=event.clientX-g.startX,dy=event.clientY-g.startY;
        if(g.kind==='resize'){
          event.preventDefault();
          const deltaX=Math.round(dx/8)*8,deltaY=Math.round(dy/8)*8;
          const widthDelta=g.dir.includes('e')?deltaX:g.dir.includes('w')?-deltaX:0;
          const width=Math.max(8,Math.min(1920,g.startWidth+widthDelta));
          const height=Math.max(8,Math.min(1400,g.startHeight+(g.dir.includes('s')?deltaY:0)));
          g.width=Math.round(width);g.height=Math.round(height);
          g.translateX=g.startTranslateX+(g.dir.includes('w')?deltaX:0);
          g.changed=((g.dir.includes('e')||g.dir.includes('w'))&&Math.abs(g.width-g.startWidth)>=1)||
            (g.dir.includes('s')&&Math.abs(g.height-g.startHeight)>=1);
          if(g.dir.includes('e')||g.dir.includes('w'))g.target.style.width=g.width+'px';
          if(g.dir.includes('w'))g.target.style.translate=g.translateX+'px '+g.startTranslateY+'px';
          if(g.dir.includes('s'))g.target.style.height=g.height+'px';
          updateOverlayRect(doc,g.target);
          visualHint.textContent='Размер: '+g.width+' × '+g.height+' px · изменение привязано к режиму '+mode+' · сетка 8 px';
          return;
        }
        if(Math.hypot(dx,dy)<6&&!g.dragging)return;
        g.dragging=true;event.preventDefault();
        if(g.kind==='translate'){
          doc.body.style.userSelect='none';
          const tx=Math.max(-600,Math.min(600,g.startTranslateX+Math.round(dx/8)*8));
          const ty=Math.max(-600,Math.min(600,g.startTranslateY+Math.round(dy/8)*8));
          g.translateX=tx;g.translateY=ty;g.changed=tx!==g.startTranslateX||ty!==g.startTranslateY;
          g.target.style.translate=tx+'px '+ty+'px';
          updateOverlayRect(doc,g.target);
          visualHint.textContent='Свободное смещение: X '+tx+' px · Y '+ty+' px · сетка 8 px';
          return;
        }
        clearDropIndicators(doc);doc.body.style.userSelect='none';
        g.target.classList.add('cms-design-dragging');
        let hovered=doc.elementFromPoint(event.clientX,event.clientY)?.closest?.('[class*="cmsdg-n-"]');
        let targetId=nodeIdFromElement(hovered);
        const source=all().find(item=>item.node.id===g.nodeId);
        const blocked=source?new Set(subtreeIds(source.node)) : new Set();
        let targetRow=all().find(item=>item.node.id===targetId),placement=null;
        // Prefer a container under the pointer, even when one of its children
        // covers the hit point. This makes "drop inside" practical on real layouts.
        for(let candidate=hovered;candidate;candidate=candidate.parentElement?.closest?.('[class*="cmsdg-n-"]')){
          const id=nodeIdFromElement(candidate),row=all().find(item=>item.node.id===id);
          if(!row||blocked.has(id)||row.node.type!=='container')continue;
          const box=candidate.getBoundingClientRect();
          const cx=box.width?(event.clientX-box.left)/box.width:.5;
          const cy=box.height?(event.clientY-box.top)/box.height:.5;
          if(cx>.22&&cx<.78&&cy>.22&&cy<.78){
            hovered=candidate;targetId=id;targetRow=row;placement='inside';break;
          }
        }
        if(!placement){
          if(!hovered||!targetRow||blocked.has(targetId)){
            g.candidateId=null;g.placement=null;
            visualHint.textContent='Перетащите на другой элемент; внутрь контейнера — для вложенности';
            return;
          }
          const rect=hovered.getBoundingClientRect();
          const x=rect.width?(event.clientX-rect.left)/rect.width:.5;
          const y=rect.height?(event.clientY-rect.top)/rect.height:.5;
          const parentStyle=doc.defaultView.getComputedStyle(hovered.parentElement);
          const gridColumns=(parentStyle.gridTemplateColumns||'').trim().split(/\s+/).filter(Boolean);
          const horizontal=(parentStyle.display==='flex'&&parentStyle.flexDirection.startsWith('row'))||
            (parentStyle.display==='grid'&&gridColumns.length>1);
          placement=(horizontal?x:y)<.5?'before':'after';
        }
        g.candidateId=targetId;g.placement=placement;
        hovered.classList.add('cms-design-drop-'+placement);
        visualHint.textContent='Отпустите, чтобы переместить '+(placement==='inside'?'внутрь':placement==='before'?'перед':'после')+' выбранного узла';
      },true);
      doc.addEventListener('pointerup',event=>{
        const g=activeGesture;
        if(!g||g.pointerId!==event.pointerId)return;
        activeGesture=null;
        if(g.kind==='resize'){
          event.preventDefault();suppressGestureClick();
          if(g.changed){
            const row=all().find(item=>item.node.id===g.nodeId);
            if(row){
              recordHistory();
              const style=editStyle(row.node);
              if(g.dir.includes('e')||g.dir.includes('w')){delete style.widthPercent;style.widthPx=g.width;}
              if(g.dir.includes('w'))style.translateX=g.translateX;
              if(g.dir.includes('s'))style.heightPx=g.height;
            }
          }
          render();return;
        }
        if(g.kind==='translate'){
          if(!g.dragging)return;
          doc.body.style.userSelect='';suppressGestureClick();
          const row=all().find(item=>item.node.id===g.nodeId);
          if(g.changed&&row){
            recordHistory();
            const style=editStyle(row.node);
            style.translateX=g.translateX;style.translateY=g.translateY;
          }
          render();return;
        }
        if(!g.dragging)return;
        event.preventDefault();doc.body.style.userSelect='';suppressGestureClick();clearDropIndicators(doc);
        if(g.candidateId&&g.placement){
          changeTree({action:'move',nodeId:g.nodeId,targetId:g.candidateId,placement:g.placement},g.nodeId);
          visualHint.textContent='Элемент перемещён. Отменить можно кнопкой «Отменить».';
        }else render();
      },true);
      doc.addEventListener('pointercancel',()=>{
        if(!activeGesture)return;
        activeGesture=null;doc.body.style.userSelect='';clearDropIndicators(doc);render();
      },true);
      doc.addEventListener('click',selectFromPreview,true);
      doc.addEventListener('submit',e=>e.preventDefault(),true);
      doc.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){
          const focused=doc.activeElement;
          if(focused?.matches?.('a,button,video'))e.preventDefault();
          if(focused?.closest?.('[class*="cmsdg-n-"]'))selectFromPreview(e);
        }
      },true);
      syncVisualSelection();
    });
    const changeTree=(operation,selectId)=>{
      try{
        const next=DESIGN_GRAPH.editTree(graph,operation);
        recordHistory();graph=next;
        if(selectId)selection=selectId;
        render();
      }catch(error){notice('Структура не изменена: '+error.message,true);}
    };
    const subtreeIds=(node)=>{
      const ids=[];
      const walk=n=>{ids.push(n.id);for(const child of n.children||[])walk(child);};
      walk(node);return ids;
    };
    const make=(tag,text,cls)=>{
      const n=document.createElement(tag);
      if(text!==undefined)n.textContent=text;
      if(cls)n.className=cls;
      return n;
    };
    const ctl=(label,value,change,type='text')=>{
      const wrap=make('label',label),input=make(type==='select'?'select':type==='multiline'?'textarea':'input',undefined,'control');
      if(type==='select')for(const [v,t] of value.choices){
        const option=make('option',t);option.value=v;input.append(option);
      }else if(type!=='multiline')input.type=type==='number'?'number':'text';
      input.value=type==='select'?value.initial:String(value??'');
      let editBefore=null,editValue=input.value,editRecorded=false;
      input.addEventListener('focus',()=>{editBefore=snapshot();editValue=input.value;editRecorded=false;});
      input.addEventListener('input',()=>{
        if(!editRecorded&&input.value!==editValue){recordHistory(editBefore||snapshot());editRecorded=true;}
        change(input.value);paintVisual();
      });
      wrap.append(input);return wrap;
    };
    const all=()=>{
      const list=[];
      const walk=(node,items,depth)=>{
        list.push({node,items,depth});
        for(const c of node.children||[])walk(c,node.children,depth+1);
      };
      graph.nodes.forEach(n=>walk(n,graph.nodes,0));
      return list;
    };
    function editStyle(n){
      return mode==='desktop'?(n.styles||(n.styles={})):
        mode==='tablet'||mode==='mobile'?
          ((n.responsive||(n.responsive={}))[mode]||((n.responsive)[mode]={})):
          ((n.states||(n.states={}))[mode]||((n.states)[mode]={}));
    }
    for(const [id,label] of [['desktop','ПК'],['tablet','Планшет'],['mobile','Телефон']]){
      const b=button(label,'btn small',()=>{
        previewDevice=id;mode=id;render();
      });
      b.dataset.designDevice=id;deviceTools.append(b);
    }
    function renderAudit(){
      auditPanel.replaceChildren();
      auditPanel.append(make('h3','Проверка доступности'));
      let findings;
      try{findings=DESIGN_GRAPH.auditAccessibility(graph,tokens);}
      catch(error){
        if(activeAuditFocus){
          auditFocus.hidden=false;auditFocus.dataset.resolved='false';
          auditFocus.textContent='Проверка приостановлена: завершите ввод параметров элемента.';
        }
        const status=make('p','Проверка обновится после завершения ввода параметров.','cms-design-a11y-summary');
        status.id='cms-design-a11y-summary';status.setAttribute('aria-live','polite');auditPanel.append(status);return;
      }
      if(activeAuditFocus){
        const auditKind=activeAuditFocus.kind==='empty-heading'?'empty-text':activeAuditFocus.kind;
        const relevant=findings.some(item=>item.nodeId===activeAuditFocus.nodeId&&item.code===auditKind);
        auditFocus.hidden=false;auditFocus.dataset.resolved=String(!relevant);
        auditFocus.textContent=relevant
          ?'Из SEO-аудита · '+activeAuditFocus.message+' · Узел '+activeAuditFocus.nodeId+
            '. Исправьте параметры, нажмите «Применить в черновик», затем повторно проверьте страницу.'
          :'Замечание для узла '+activeAuditFocus.nodeId+
            ' устранено в рабочей композиции. Примените правку в черновик для повторной проверки страницы.';
      }else{auditFocus.hidden=true;auditFocus.removeAttribute('data-resolved');}
      const errors=findings.filter(item=>item.severity==='error').length;
      const summaryText=findings.length?
        findings.length+' замечаний: '+errors+' критических, '+(findings.length-errors)+' предупреждений. Проверка справочная и не блокирует сохранение.':
        'Явных проблем в проверяемых свойствах не найдено. Это не заменяет аудит всей страницы.';
      const summary=make('p',summaryText,'cms-design-a11y-summary');
      summary.id='cms-design-a11y-summary';summary.setAttribute('aria-live','polite');auditPanel.append(summary);
      if(!findings.length)return;
      const list=make('ul',undefined,'cms-design-a11y-list');
      for(const finding of findings.slice(0,12)){
        const item=make('li',undefined,'cms-design-a11y-item '+finding.severity);
        const issue=make('button',finding.message+(finding.nodeId?' · '+finding.nodeId:''),'cms-design-a11y-issue');
        issue.type='button';issue.dataset.a11yCode=finding.code;
        if(finding.nodeId)issue.dataset.a11yNode=finding.nodeId;
        issue.setAttribute('aria-label',finding.message+(finding.nodeId?' — перейти к '+finding.nodeId:''));
        issue.addEventListener('click',()=>{
          if(finding.nodeId&&all().some(row=>row.node.id===finding.nodeId)){selection=finding.nodeId;render();}
        });
        item.append(issue);list.append(item);
      }
      auditPanel.append(list);
      if(findings.length>12)auditPanel.append(make('p','Показаны первые 12 из '+findings.length+' замечаний.','cms-design-a11y-more'));
    }
    function paintVisual(){
      for(const b of deviceTools.children)b.classList.toggle('active',b.dataset.designDevice===previewDevice);
      const width=PREVIEW_WIDTHS[previewDevice];
      const available=canvasStage.clientWidth||640;
      const scale=Math.min(1,(available-12)/width);
      previewFrame.style.width=width+'px';
      previewFrame.style.height='900px';
      previewFrame.style.transform='scale('+scale+')';
      canvasStage.style.height=Math.min(520,Math.ceil(900*scale))+'px';
      try{
        const site={...session.current,designTokens:tokens};
        const html=DESIGN_GRAPH.render(site,graph,'',
          assetId=>HOSTED?window.Stage3Host?.previewUrl?.(assetId):null,sourceSection,
          assetId=>HOSTED?window.Stage3Host?.videoUrl?.(assetId):null);
        previewFrame.srcdoc='<!doctype html><html lang="ru"><head><meta charset="utf-8">'+
          '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; img-src &#39;self&#39; data: blob:; media-src &#39;self&#39; blob:; connect-src &#39;none&#39;; form-action &#39;none&#39;; object-src &#39;none&#39;; frame-src &#39;none&#39;">'+
          '<style>html,body{margin:0;background:#fff;color:#182b3d;font:16px system-ui,Arial,sans-serif}body{padding:12px;min-width:0}.cmsdg{position:relative}.cmsdg [class*="cmsdg-n-"]{cursor:grab;touch-action:none}.cmsdg [class*="cmsdg-n-"]:hover{outline:2px dashed #1868d3!important;outline-offset:2px}.cmsdg .cms-design-picked{outline:3px solid #e88622!important;outline-offset:3px}.cmsdg .cms-design-dragging{opacity:.42!important;cursor:grabbing}.cmsdg .cms-design-drop-before{box-shadow:inset 0 4px #e88622!important}.cmsdg .cms-design-drop-after{box-shadow:inset 0 -4px #e88622!important}.cmsdg .cms-design-drop-inside{outline:3px solid #16865b!important;outline-offset:3px}.cms-design-resize-overlay{pointer-events:none}</style>'+
          '</head><body>'+html+'</body></html>';
        visualHint.textContent='Клик — выбрать · Перетащить на узел — порядок/вложенность · Alt+перетаскивание — смещение · маркеры — размер (шаг 8 px)';
      }catch(error){
        previewFrame.srcdoc='<!doctype html><html><head><meta charset="utf-8"></head><body><p>Предпросмотр временно недоступен</p></body></html>';
        visualHint.textContent='Исправьте параметры композиции: '+error.message;
      }
      renderAudit();
    }
    function render(){
      root.replaceChildren();toolbar.replaceChildren();
      const rows=all();
      if(!rows.length)return;
      if(!rows.some(r=>r.node.id===selection))selection=rows[0].node.id;
      const selected=rows.find(r=>r.node.id===selection),n=selected.node;
      const chooser=make('select',undefined,'control');chooser.id='cms-design-node-select';
      for(const {node,depth} of rows){
        const opt=make('option','  '.repeat(depth)+node.type+' · '+(node.text||node.alt||node.id).slice(0,55));
        opt.value=node.id;chooser.append(opt);
      }
      chooser.value=selection;
      chooser.addEventListener('change',()=>{selection=chooser.value;render();});
      toolbar.append(chooser);
      if(auditNodeFocusPending){
        auditNodeFocusPending=false;
        requestAnimationFrame(()=>chooser.focus({preventScroll:true}));
      }
      const action=(name,fn)=>{
        const b=button(name,'btn small',fn);toolbar.append(b);return b;
      };
      const undoButton=action('↶ Отменить',undoGraph);undoButton.id='cms-design-undo';
      const redoButton=action('↷ Повторить',redoGraph);redoButton.id='cms-design-redo';
      updateHistoryButtons();
      action('+ Вложенный',()=>{
        if(n.type!=='container')return notice('Для вложенности выберите контейнер',true);
        const node={id:uniqueId('dg-node'),type:'text',text:'Новый текст',styles:{}};
        changeTree({action:'insert',targetId:n.id,placement:'inside',node},node.id);
      });
      action('+ Рядом',()=>{
        const node={id:uniqueId('dg-node'),type:'container',styles:{display:'grid',columns:2,gap:'@medium'},
          responsive:{mobile:{columns:1}},children:[]};
        changeTree({action:'insert',targetId:n.id,placement:'after',node},node.id);
      });
      action('Тип +',()=>{
        const type=prompt('Элемент: container / heading / text / button / image / divider / icon / video','heading');
        if(type===null)return;
        if(!DESIGN_GRAPH.TYPES.includes(type))return notice('Неизвестный тип',true);
        const node={id:uniqueId('dg-node'),type,styles:{}};
        if(type==='container')node.children=[];
        if(['heading','text','button'].includes(type))node.text='Новый элемент';
        if(type==='heading')node.level=2;
        if(type==='icon'){node.icon='check';node.alt='';}
        if(type==='button')node.href='/';
        if(type==='video'){
          const first=session.current.assets.find(a=>a.mime==='video/mp4');
          if(!first)return notice('Сначала загрузите MP4 в медиабиблиотеку',true);
          node.assetId=first.id;node.alt=first.alt;node.loop=false;
        }
        if(type==='image'){
          const first=session.current.assets.find(a=>a.mime!=='video/mp4');
          if(!first)return notice('Сперва загрузите изображение',true);
          node.assetId=first.id;node.alt=first.alt;
        }
        changeTree({action:'insert',targetId:n.id,placement:'after',node},node.id);
      });
      action('↑',()=>{
        const index=selected.items.indexOf(n);
        if(index>0)changeTree({action:'move',nodeId:n.id,targetId:selected.items[index-1].id,placement:'before'},n.id);
      });
      action('↓',()=>{
        const index=selected.items.indexOf(n);
        if(index<selected.items.length-1)changeTree({action:'move',nodeId:n.id,targetId:selected.items[index+1].id,placement:'after'},n.id);
      });
      action('Копировать группу',()=>{
        const ids=subtreeIds(n).map(()=>uniqueId('dg-node'));
        changeTree({action:'duplicate',nodeId:n.id,ids},ids[0]);
      });
      action('Объединить в контейнер',()=>{
        const wrapperId=uniqueId('dg-node');
        changeTree({action:'wrap',nodeId:n.id,wrapperId},wrapperId);
      });
      if(n.type==='container'&&n.children.length)action('Разобрать контейнер',()=>{
        if(!confirm('Удалить оболочку контейнера? Её стили будут потеряны, вложенные элементы сохранятся.'))return;
        changeTree({action:'unwrap',nodeId:n.id},n.children[0].id);
      });
      const skip=new Set(subtreeIds(n));
      const destinations=rows.filter(row=>!skip.has(row.node.id));
      if(destinations.length){
        const moveDestination=make('select',undefined,'control');
        moveDestination.id='cms-design-move-target';
        for(const {node,depth} of destinations){
          const opt=make('option','  '.repeat(depth)+node.type+' · '+(node.text||node.alt||node.id).slice(0,45));
          opt.value=node.id;moveDestination.append(opt);
        }
        const firstContainer=destinations.find(row=>row.node.type==='container');
        if(firstContainer)moveDestination.value=firstContainer.node.id;
        const placement=make('select',undefined,'control');
        placement.id='cms-design-move-placement';
        for(const [value,label] of [['inside','Внутрь'],['before','Перед'],['after','После']]){
          const opt=make('option',label);opt.value=value;placement.append(opt);
        }
        placement.value=firstContainer?'inside':'after';
        toolbar.append(moveDestination,placement);
        action('Переместить',()=>changeTree({action:'move',nodeId:n.id,
          targetId:moveDestination.value,placement:placement.value},n.id));
      }
      action('Удалить элемент',()=>{
        if(!confirm('Удалить выбранный узел и все вложенные элементы?'))return;
        changeTree({action:'remove',nodeId:n.id},rows[0].node.id===n.id?
          rows.find(row=>!skip.has(row.node.id))?.node.id:rows[0].node.id);
      });
      if(mode==='tablet'||mode==='mobile'){
        const fit=action('Вписать в экран',()=>{
          recordHistory();
          const style=editStyle(n);
          delete style.widthPercent;
          style.widthPx=Math.max(1,PREVIEW_WIDTHS[previewDevice]-24);
          style.translateX=0;
          render();
        });
        fit.id='cms-design-fit-width';
      }
      const headline=make('h3','Редактирование · '+n.type);root.append(headline);
      const fields=make('div','', 'cms-design-fields');root.append(fields);
      if(['heading','text','button'].includes(n.type)){
        fields.append(ctl('Текст',n.text,value=>{n.text=value;},'multiline'));
      }
      if(n.type==='heading')fields.append(ctl('Уровень заголовка',String(n.level||2),value=>{n.level=Number(value);},'number'));
      if(n.type==='button')fields.append(ctl('Ссылка',n.href,value=>{n.href=value;}));
      if(n.type==='image'){
        const options=session.current.assets.filter(a=>a.mime!=='video/mp4').map(a=>[a.id,a.alt||a.id]);
        fields.append(ctl('Изображение',{initial:n.assetId,choices:options},v=>{n.assetId=v;},'select'),
          ctl('Описание изображения',n.alt,v=>{n.alt=v;}));
      }
      if(n.type==='video'){
        const videos=session.current.assets.filter(a=>a.mime==='video/mp4').map(a=>[a.id,a.alt||a.id]);
        const images=session.current.assets.filter(a=>a.mime!=='video/mp4').map(a=>[a.id,a.alt||a.id]);
        fields.append(ctl('MP4-файл',{initial:n.assetId,choices:videos},
          v=>{n.assetId=v;},'select'));
        fields.append(ctl('Описание видео',n.alt,v=>{n.alt=v;}));
        fields.append(ctl('Постер',{initial:n.posterAssetId||'',
          choices:[['','Без обложки'],...images]},
          v=>{if(v)n.posterAssetId=v;else delete n.posterAssetId;},'select'));
        fields.append(ctl('Зациклить воспроизведение',{initial:String(!!n.loop),
          choices:[['false','Нет'],['true','Да']]},
          v=>{n.loop=v==='true';},'select'));
      }
      if(n.type==='icon'){
        fields.append(ctl('Векторная иконка',
          {initial:n.icon,choices:Object.keys(DESIGN_GRAPH.ICON_PATHS).map(v=>[v,v])},
          value=>{n.icon=value;},'select'));
        fields.append(ctl('Описание для скринридера (пусто = декоративная)',n.alt||'',value=>{n.alt=value;}));
      }
      const modeSelect=make('select',undefined,'control');modeSelect.id='cms-design-breakpoint';
      for(const [v,t] of [['desktop','Компьютер'],['tablet','Планшет'],['mobile','Телефон'],
        ['hover','Наведение'],['focus','Фокус с клавиатуры']]){
        const opt=make('option',t);opt.value=v;modeSelect.append(opt);
      }
      modeSelect.value=mode;modeSelect.addEventListener('change',()=>{
        mode=modeSelect.value;
        if(Object.hasOwn(PREVIEW_WIDTHS,mode))previewDevice=mode;
        render();
      });
      root.append(make('h3','Свойства · '+mode),modeSelect);
      const styleFields=make('div',undefined,'cms-design-fields');root.append(styleFields);
      const style=editStyle(n),limited=['hover','focus'].includes(mode);
      for(const key of DESIGN_GRAPH.STYLE_KEYS){
        if(limited&&!['color','background','borderColor','borderWidth','radius','opacity','gradient','outlineColor','outlineWidth'].includes(key))continue;
        if(key==='gradient')continue;
        const values={
          display:['block','grid','flex','none'],
          direction:['row','column'],align:['start','center','end','stretch','between'],
          justify:['start','center','end','stretch','between'],
          position:['static','relative','absolute'],textAlign:['left','center','right'],
          flexWrap:['nowrap','wrap'],alignSelf:['auto','start','center','end','stretch'],
          fontFamily:['inherit','system','arial','georgia','serif','mono'],
          objectFit:['cover','contain','fill','none'],
          aspectRatio:['auto','square','portrait','landscape','wide'],
          overflow:['visible','hidden','auto'],shadow:['none','soft','medium','strong'],
          justifySelf:['auto','start','center','end','stretch'],alignContent:['start','center','end','stretch','between'],
          gridAutoFlow:['row','column','row-dense','column-dense'],
          textDecoration:['none','underline','line-through'],whiteSpace:['normal','nowrap','pre-line'],
          fontStyle:['normal','italic'],
          textTransform:['none','uppercase','lowercase','capitalize'],
          textWrap:['wrap','balance','pretty','nowrap'],
          wordBreak:['normal','break-all','break-word'],
          textOverflow:['clip','ellipsis'],
          textShadow:['none','soft','strong'],
          gridColumnsPreset:['sidebar-left','sidebar-right','wide-center','editorial'],
          transformOrigin:['center','top-left','top-right','bottom-left','bottom-right'],
          isolation:['auto','isolate'],
          mixBlendMode:['normal','multiply','screen','overlay','darken','lighten'],
          clipShape:['none','circle','ellipse','diagonal','hexagon'],
          hidden:['true','false']
        };
        const value=style[key]===undefined?'':String(style[key]);
        if(values[key]){
          const options=[['','По умолчанию'],...values[key].map(x=>[x,x])];
          styleFields.append(ctl(key,{initial:value,choices:options},v=>{
            if(!v)delete style[key];else style[key]=key==='hidden'?v==='true':v;
          },'select'));
        }else styleFields.append(ctl(key,value,v=>{
          if(!v.trim()){delete style[key];return;}
          if(['color','background','borderColor','outlineColor'].includes(key)){style[key]=v.trim();return;}
          style[key]=v.startsWith('@')?v.trim():Number(v);
        }));
      }
      const gradient=make('details');gradient.id='cms-design-gradient';
      gradient.append(make('summary','Градиент фона · '+mode));
      const gradientFields=make('div',undefined,'cms-design-fields');
      const currentGradient=style.gradient;
      const ensureGradient=()=>style.gradient||(style.gradient={angle:135,from:'@accent',to:'@background'});
      gradientFields.append(
        ctl('Угол (0–360)',String(currentGradient?.angle??135),v=>{ensureGradient().angle=Number(v);},'number'),
        ctl('Цвет от (HEX или @token)',currentGradient?.from||'@accent',v=>{ensureGradient().from=v.trim();}),
        ctl('Цвет до (HEX или @token)',currentGradient?.to||'@background',v=>{ensureGradient().to=v.trim();}),
         ctl('Промежуточный цвет (необязательно)',currentGradient?.via||'',v=>{
           if(v.trim()){ensureGradient().via=v.trim();ensureGradient().viaAt??=50;}
           else if(style.gradient){delete style.gradient.via;delete style.gradient.viaAt;}
         }),
         ctl('Позиция промежуточного цвета, %',String(currentGradient?.viaAt??50),v=>{
           if(style.gradient?.via)style.gradient.viaAt=Number(v);
         },'number')
      );
      const dropGradient=button('Удалить градиент','btn small',()=>{
        if(!style.gradient)return;
        recordHistory();delete style.gradient;render();
      });
      gradient.append(gradientFields,dropGradient);root.append(gradient);
      const motionBox=make('details');motionBox.id='cms-design-motion';
      motionBox.append(make('summary','Анимация элемента · учитывает reduced motion'));
      const motionFields=make('div',undefined,'cms-design-fields');
      const motion=n.motion||{effect:'none',duration:500,delay:0};
      const changeMotion=(key,v)=>{
        n.motion={...(n.motion||{effect:'none',duration:500,delay:0}),[key]:v};
      };
      motionFields.append(
        ctl('Эффект',{initial:motion.effect,choices:DESIGN_GRAPH.MOTIONS.map(v=>[v,v])},
          v=>changeMotion('effect',v),'select'),
        ctl('Длительность, мс',String(motion.duration),v=>changeMotion('duration',Number(v)),'number'),
        ctl('Задержка, мс',String(motion.delay),v=>changeMotion('delay',Number(v)),'number')
      );
      motionBox.append(motionFields,
        button('Без анимации','btn small',()=>{
          if(!n.motion)return;
          recordHistory();delete n.motion;render();
        }));
      root.append(motionBox);
      const tokenDetails=make('details');const tokenSummary=make('summary','Общие дизайн-токены сайта');
      tokenDetails.append(tokenSummary);
      const tokenFields=make('div',undefined,'cms-design-fields');
      for(const [group,entries] of Object.entries(tokens)){
        tokenFields.append(make('h4',group));
        for(const [key,val] of Object.entries(entries)){
          tokenFields.append(ctl(key,String(val),v=>{
            entries[key]=group==='colors'?v:/^@/.test(v)?v:Number(v);
          }));
        }
      }
      tokenDetails.append(tokenFields);
      const addToken=button('+ Токен','btn small',()=>{
        const group=prompt('Группа: colors / spacing / radii / typography','colors');
        if(group===null)return;
        if(!Object.hasOwn(tokens,group))return notice('Неизвестная группа',true);
        const name=prompt('Название токена, латиница и дефисы','custom');
        if(name===null)return;
        if(!/^[a-z][a-z0-9-]{1,39}$/.test(name))return notice('Некорректное имя',true);
        recordHistory();tokens[group][name]=group==='colors'?'#334455':16;render();
      });
      tokenDetails.append(addToken);root.append(tokenDetails);
      paintVisual();
    }
    const apply=button('Применить в черновик','btn primary',()=>{
      try{
        const draft=cp(session.current);
        const section=draft.pages.find(p=>p.id===sourcePage)?.sections.find(s=>s.id===sourceSection);
        if(!section)throw Error('Блок уже отсутствует');
        section.designGraph=cp(graph);draft.designTokens=cp(tokens);
        const checked=C.validateSite(draft,manifests);
        session=D.replaceSite(session,manifests,checked,session.revision);
        const recheck=!!activeAuditFocus;
        activeAuditFocus=null;
        dlg.close();draw();
        if(recheck)$('cms-quality-open')?.click();
        notice(recheck
          ?'Композиция применена в черновик; аудит обновлён. Для сервера нужны «Сохранить» и «Опубликовать».'
          :'Композиция сохранена в локальном черновике. Для сервера нужны «Сохранить» и «Опубликовать».');
      }catch(error){notice('Композиция не принята: '+error.message,true);}
    });
    apply.id='cms-design-apply';
    const remove=button('Отключить композицию','btn',()=>{
      if(!current().section.designGraph)return dlg.close();
      if(!confirm('Отключить композицию? Старые компоненты и их поля останутся как были.'))return;
      const selected=current();
      structural({action:'updateDesignGraph',pageId:selected.page.id,sectionId:selected.section.id,designGraph:null});
      dlg.close();
    });
    const close=button('Закрыть','btn',()=>{activeGesture=null;activeAuditFocus=null;dlg.close();});
    footer.append(apply,remove,close);
    return ()=>{
      const {page,section}=current();sourcePage=page.id;sourceSection=section.id;
      if(!section.designGraph&&!confirm('Создать новую свободную композицию? Она заменит отображение этого блока, но его прежние данные сохранятся.'))return;
      graph=cp(section.designGraph||DESIGN_GRAPH.baseGraph(section.id));
      tokens=cp(session.current.designTokens||DESIGN_GRAPH.DEFAULT_TOKENS);
      mode='desktop';previewDevice='desktop';selection=graph.nodes[0].id;
      activeAuditFocus=pendingGraphAuditFocus&&pendingGraphAuditFocus.pageId===page.id&&
        pendingGraphAuditFocus.sectionId===section.id?pendingGraphAuditFocus:null;
      pendingGraphAuditFocus=null;
      const matches=id=>{const walk=nodes=>nodes.some(node=>node.id===id||(node.children&&walk(node.children)));return walk(graph.nodes);};
      if(activeAuditFocus){
        if(matches(activeAuditFocus.nodeId)){selection=activeAuditFocus.nodeId;auditNodeFocusPending=true;}
        else{activeAuditFocus=null;auditNodeFocusPending=false;}
      }else auditNodeFocusPending=false;
      undoStack=[];redoStack=[];activeGesture=null;suppressPreviewClick=false;
      title.textContent='Дизайн-композиция · '+(manifest(section)?.label||section.id);
      dlg.showModal();render();
    };
  }


  // Typed cross-page content workbench: preview, select, atomic replace + Undo.
  function initContentWorkbench(){
    const dlg=document.createElement('dialog');dlg.id='cms-content-workbench';
    dlg.className='cms-settings-dialog cms-content-workbench';
    const h=document.createElement('h2');h.textContent='Тексты всех страниц';
    const info=document.createElement('p');info.textContent='Поиск по заголовкам, текстам блоков, карточкам, SEO и подписям форм. Ссылки, варианты списков, служебные ID и скрытые значения Design Graph не изменяются. Сначала просмотрите замены, затем примените к черновику. Сохранение и публикация отдельно.';
    const filters=document.createElement('div');filters.className='cms-content-filters';
    const q=document.createElement('input');q.id='cms-content-search';q.className='control';q.type='search';q.maxLength=120;q.placeholder='Найти текст';
    const value=document.createElement('input');value.id='cms-content-replace';value.className='control';value.maxLength=4000;value.placeholder='Заменить на…';
    const pagePicker=document.createElement('select');pagePicker.id='cms-content-page';pagePicker.className='control';
    const label=(name,ctrl)=>{ctrl.setAttribute('aria-label',name);const el=document.createElement('label');el.textContent=name;el.append(ctrl);return el;};
    filters.append(label('Поиск',q),label('Замена',value),label('Страница',pagePicker));
    const status=document.createElement('p');status.id='cms-content-status';status.setAttribute('role','status');
    const results=document.createElement('div');results.id='cms-content-results';
    const actions=document.createElement('div');actions.className='cms-settings-actions';
    const apply=button('Применить выбранное','btn primary',commit);
    apply.id='cms-content-apply';apply.dataset.editorWrite='true';
    actions.append(apply,button('Закрыть','btn',()=>dlg.close()));
    dlg.append(h,info,filters,status,results,actions);document.body.append(dlg);
    let entries=[];
    function fields(){
      const out=[],add=(page,kind,field,key,text,name,section=null,element=null)=>{
        if(typeof text==='string')out.push({pageId:page.id,pageTitle:page.title,
          sectionId:section?.id,elementId:element?.id,kind,key,text,name,formId:field?.id});
      };
      for(const page of session.current.pages){
        if(pagePicker.value&&pagePicker.value!==page.id)continue;
        add(page,'page',null,'title',page.title,'Заголовок страницы');
        for(const key of ['title','description','ogTitle','ogDescription'])
          add(page,'seo',null,key,page.seo?.[key],'SEO · '+key);
        add(page,'navigation',null,'label',page.navigation?.label,'Меню · название');
        for(const section of page.sections){
          if(section.designGraph)continue; // Rendered content is owned by the graph.
          const m=manifest(section);if(!m)continue;
          for(const element of [...section.elements,...(section.items||[])]){
            const spec=element.slot?m.elements.find(x=>x.slot===element.slot):m.repeat;
            for(const def of spec?.fields||[])if(def.type==='text'&&
              def.path.startsWith('content.')&&def.path!=='content.options'&&!def.responsive)
              add(page,'field',null,def.path,element.values[def.path],
                m.label+' · '+def.label,section,element);
          }
          for(const f of section.formFields||[])for(const key of ['label','placeholder'])
            add(page,'form',f,key,f[key],'Форма · '+f.id+' · '+key,section);
        }
      }
      return out;
    }
    function focus(entry,preview=false){
      const page=session.current.pages.find(x=>x.id===entry.pageId);
      pageId=page.id;
      const sec=page.sections.find(x=>x.id===entry.sectionId)||page.sections[0];
      sectionId=sec.id;elementId=entry.kind==='field'?entry.elementId:sec.elements[0].id;
      dlg.close();draw();
      if(preview){$('cms-open-page-preview').click();return;}
      if(entry.kind==='form'){$('cms-form-builder-open')?.click();return;}
      const field=[...$('fields').querySelectorAll('[data-field]')].find(x=>x.dataset.field===entry.key);
      if(entry.kind==='field'&&field){field.focus();field.scrollIntoView({block:'nearest'});}
    }
    const selected=()=>entries.filter(x=>x.checked&&x.after!==x.text);
    function updateCount(){
      status.textContent=entries.length+' совпадений · '+selected().length+
        ' выбранных замен · одна операция Undo · без публикации';
      apply.disabled=!selected().length;
    }
    function search(){
      results.replaceChildren();entries=[];
      const needle=q.value.trim();
      if(needle.length<2){status.textContent='Введите минимум 2 символа для поиска';apply.disabled=true;return;}
      const special='\\.^$|?*+()[]{}';
      const regexp=new RegExp([...needle].map(c=>special.includes(c)?'\\'+c:c).join(''),'gi');
      const matched=fields().filter(f=>f.text.toLocaleLowerCase().includes(needle.toLocaleLowerCase()));
      entries=matched.slice(0,120).map(f=>({...f,checked:true,after:f.text.replace(regexp,()=>value.value)}));
      if(matched.length>120){const note=document.createElement('p');note.textContent='Показаны первые 120 из '+matched.length+' полей. Уточните поиск для остальных.';results.append(note);}
      for(const [i,entry] of entries.entries()){
        const row=document.createElement('div');row.className='cms-content-row';
        const check=document.createElement('input');check.type='checkbox';check.checked=true;
        check.setAttribute('aria-label','Выбрать замену '+(i+1));
        check.addEventListener('change',()=>{entry.checked=check.checked;updateCount();});
        const words=document.createElement('div');
        const head=document.createElement('strong');head.textContent=entry.pageTitle+' · '+entry.name;
        const before=document.createElement('p');before.textContent='Было: '+entry.text;
        const after=document.createElement('p');after.textContent='Будет: '+entry.after;
        words.append(head,before,after);
        const nav=document.createElement('div');nav.className='cms-content-row-nav';
        nav.append(button('К полю','btn small',()=>focus(entry)),
          button('Вся страница','btn small',()=>focus(entry,true)));
        row.append(check,words,nav);results.append(row);
      }
      updateCount();
    }
    function commit(){
      const changes=selected();if(!changes.length)return;
      try{
        const next=cp(session.current);
        for(const e of changes){
          const page=next.pages.find(x=>x.id===e.pageId);
          if(!page)throw Error('Страница изменилась');
          let target=e.kind==='page'?page:e.kind==='seo'?page.seo:
            e.kind==='navigation'?page.navigation:null;
          if(!target){
            const sec=page.sections.find(x=>x.id===e.sectionId);
            if(!sec||sec.designGraph)throw Error('Блок изменился');
            target=e.kind==='form'?sec.formFields?.find(x=>x.id===e.formId):
              [...sec.elements,...(sec.items||[])].find(x=>x.id===e.elementId)?.values;
          }
          if(!target||target[e.key]!==e.text)throw Error('Поле изменилось; повторите поиск');
          target[e.key]=e.after;
        }
        // Full schema validation before the session mutation. Either all pass or none.
        session=D.replaceSite(session,manifests,next,session.revision);
        dlg.close();draw();notice('Обновлено '+changes.length+' текстовых полей одной операцией. Сохранение и публикация отдельно.');
      }catch(error){notice('Ни одна замена не применена: '+error.message,true);}
    }
    q.addEventListener('input',search);value.addEventListener('input',search);
    pagePicker.addEventListener('change',search);
    const open=button('Тексты всего сайта','btn small',()=>{
      pagePicker.replaceChildren();
      const all=document.createElement('option');all.value='';all.textContent='Все страницы';pagePicker.append(all);
      for(const page of session.current.pages){const o=document.createElement('option');o.value=page.id;o.textContent=page.title+' · '+page.path;pagePicker.append(o);}
      pagePicker.value='';q.value='';value.value='';search();dlg.showModal();q.focus();
    });open.id='cms-content-open';
    const tools=document.createElement('div');tools.className='structure-tools';
    tools.append(open);$('pages').before(tools);
  }


  // Plan the entire site without editing the live local draft until Apply.
  // Every intermediate operation uses the validated immutable SDK and the
  // final candidate commits through a SINGLE revision/Undo.
  function initSiteMap(){
    const dlg=document.createElement('dialog');dlg.id='cms-site-map-dialog';
    dlg.className='cms-settings-dialog cms-site-map-dialog';
    const heading=document.createElement('h2');heading.textContent='Карта сайта · организация страниц';
    const intro=document.createElement('p');intro.textContent='Меняйте порядок страниц и блоков, переносите и копируйте блоки между страницами, создавайте и удаляйте страницы. Сначала проверьте готовый план. Исходный черновик не изменяется до применения.';
    const summary=document.createElement('p');summary.id='cms-map-summary';summary.setAttribute('role','status');
    const error=document.createElement('p');error.id='cms-map-error';error.setAttribute('role','alert');
    const workspace=document.createElement('div');workspace.className='cms-map-work';
    const left=document.createElement('div');left.className='cms-map-editor';
    const pages=document.createElement('div');pages.id='cms-map-pages';
    const addPage=button('+ Создать страницу','btn small',()=>{
      const title=prompt('Название новой страницы','Новая страница');if(title===null)return;
      const path=prompt('Адрес новой страницы (например /services/)','/services/');if(path===null)return;
      stage({action:'addPage',id:uniqueId('page'),title,path,sectionId:uniqueId('section'),component:'company-hero'});
    });addPage.id='cms-map-add-page';left.append(addPage,pages);
    const right=document.createElement('aside');right.className='cms-map-preview-pane';
    const previewTitle=document.createElement('h3');previewTitle.textContent='Предпросмотр плана';
    const previewPage=document.createElement('select');previewPage.id='cms-map-preview-page';previewPage.className='control';
    const devices=document.createElement('div');devices.className='cms-map-devices';
    const desktop=button('Компьютер','btn small',()=>{device='desktop';refreshPreview();});desktop.id='cms-map-desktop';
    const mobile=button('Телефон','btn small',()=>{device='mobile';refreshPreview();});mobile.id='cms-map-mobile';
    devices.append(desktop,mobile);
    const iframe=document.createElement('iframe');iframe.id='cms-map-preview';iframe.title='Безопасный предпросмотр новой структуры';iframe.setAttribute('sandbox','');
    const previewNote=document.createElement('small');previewNote.textContent='Локальная визуализация Studio, без исполнения скриптов, отправки форм и публикации. Для размещённого сайта доступен отдельный серверный предпросмотр.';
    right.append(previewTitle,previewPage,devices,iframe,previewNote);workspace.append(left,right);
    const actions=document.createElement('div');actions.className='cms-settings-actions cms-map-actions';
    const apply=button('Применить весь план','btn primary',commit);apply.id='cms-map-apply';apply.dataset.editorWrite='true';
    const reset=button('Сбросить план','btn',()=>{candidate=D.begin(session.current,manifests);failure='';render();});reset.id='cms-map-reset';
    actions.append(apply,reset,button('Закрыть','btn',()=>dlg.close()));
    dlg.append(heading,intro,summary,error,workspace,actions);document.body.append(dlg);
    let candidate=null,openedRevision=0,selectedPage='',device='desktop',failure='';
    const selectOptions=(control,items)=>{
      for(const [value,label] of items){
        const option=document.createElement('option');option.value=value;option.textContent=label;control.append(option);
      }
    };
    const problemKey=v=>[v.kind,v.pageId,v.sectionId||'',v.path].join('|');
    const broken=site=>C.inspectSite(site,manifests).errors
      .filter(v=>v.kind==='broken-link'||v.kind==='broken-anchor');
    function stage(action){
      try{
        candidate=D.structure(candidate,manifests,{...action,expectedRevision:candidate.revision});
        failure='';render();
      }catch(ex){failure=ex.message;error.textContent='Операция отклонена: '+failure;}
    }
    function focus(pageId){selectedPage=pageId;refreshPreview();}
    function refreshPreview(){
      if(!candidate)return;
      const page=candidate.current.pages.find(p=>p.id===selectedPage)||candidate.current.pages[0];
      selectedPage=page.id;previewPage.value=page.id;
      iframe.classList.toggle('mobile',device==='mobile');
      desktop.classList.toggle('primary',device==='desktop');mobile.classList.toggle('primary',device==='mobile');
      try{iframe.srcdoc=window.Stage3Editor.previewDocument(candidate.current,page.path);}
      catch(ex){iframe.srcdoc='';error.textContent='Ошибка предпросмотра: '+ex.message;}
    }
    previewPage.addEventListener('change',()=>focus(previewPage.value));
    function render(){
      if(!candidate)return;
      const site=candidate.current;
      pages.replaceChildren();previewPage.replaceChildren();
      selectOptions(previewPage,site.pages.map(p=>[p.id,p.title+' · '+p.path]));
      for(const [index,page] of site.pages.entries()){
        const card=document.createElement('section');card.className='cms-map-page';card.dataset.mapPage=page.id;
        const head=document.createElement('div');head.className='cms-map-page-head';
        const title=document.createElement('h3');title.textContent=(index+1)+'. '+page.title;
        const path=document.createElement('small');path.textContent=page.path+' · '+page.sections.length+' блоков';
        const bar=document.createElement('div');bar.className='cms-map-controls';
        const up=button('↑ Страница','btn small',()=>stage({action:'movePage',pageId:page.id,delta:-1}));up.disabled=index===0;
        const down=button('↓ Страница','btn small',()=>stage({action:'movePage',pageId:page.id,delta:1}));down.disabled=index===site.pages.length-1;
        const edit=button('Название / URL','btn small',()=>{
          const title=prompt('Название страницы',page.title);if(title===null)return;
          const path=prompt('Адрес страницы',page.path);if(path===null)return;
          stage({action:'updatePage',pageId:page.id,title,path});
        });
        const clone=button('Копия страницы','btn small',()=>{
          const title=prompt('Название копии',page.title+' — копия');if(title===null)return;
          const path=prompt('Адрес копии','/copy-'+uniqueId('page').slice(5,14)+'/');
          if(path===null)return;
          stage({action:'duplicatePage',pageId:page.id,id:uniqueId('page'),title,path});
        });
        const remove=button('Удалить страницу','btn small',()=>{
          if(confirm('Удалить страницу из плана? Битые внутренние ссылки будут проверены перед применением.'))
            stage({action:'removePage',pageId:page.id});
        });
        remove.disabled=page.path==='/'||site.pages.length===1;
        bar.append(up,down,edit,clone,remove);head.append(title,path,bar);card.append(head);
        for(const [i,sec] of page.sections.entries()){
          const row=document.createElement('div');row.className='cms-map-section';row.dataset.mapSection=sec.id;
          const label=document.createElement('div');label.className='cms-map-section-label';
          const name=document.createElement('strong');name.textContent=(i+1)+'. '+(manifest(sec)?.label||sec.component);
          const meta=document.createElement('small');meta.textContent=sec.id+(sec.designGraph?' · Design Graph':'')+
            (sec.formFields?.length?' · '+sec.formFields.length+' вопросов':'');
          label.append(name,meta);
          const controls=document.createElement('div');controls.className='cms-map-controls';
          const moveUp=button('↑','btn small',()=>stage({action:'moveSection',pageId:page.id,sectionId:sec.id,delta:-1}));moveUp.disabled=i===0;
          const moveDown=button('↓','btn small',()=>stage({action:'moveSection',pageId:page.id,sectionId:sec.id,delta:1}));moveDown.disabled=i===page.sections.length-1;
          const target=document.createElement('select');target.className='control cms-map-target';
          target.setAttribute('aria-label','Страница назначения '+sec.id);
          selectOptions(target,site.pages.map(p=>[p.id,p.title]));target.value=site.pages.find(p=>p.id!==page.id)?.id||page.id;
          const placement=document.createElement('select');placement.className='control cms-map-placement';
          placement.setAttribute('aria-label','Куда поставить блок '+sec.id);
          selectOptions(placement,[['end','В конец'],['start','В начало']]);
          const perform=action=>stage({action,pageId:page.id,sectionId:sec.id,toPageId:target.value,
            placement:placement.value,...(action==='copySectionToPage'?{id:uniqueId('section')}:{})});
          const move=button('Перенести','btn small',()=>perform('relocateSection'));
          const copy=button('Копировать','btn small',()=>perform('copySectionToPage'));
          const drop=button('Удалить','btn small',()=>{
            if(confirm('Удалить блок из плана? Ссылки будут проверены перед применением.'))
              stage({action:'removeSection',pageId:page.id,sectionId:sec.id});
          });drop.disabled=page.sections.length===1;
          controls.append(moveUp,moveDown,button('Просмотр','btn small',()=>focus(page.id)),
            target,placement,move,copy,drop);
          row.append(label,controls);card.append(row);
        }
        const footer=document.createElement('div');footer.className='cms-map-new-section';
        const component=document.createElement('select');component.className='control cms-map-component';
        selectOptions(component,manifests.map(m=>[m.id,m.label]));component.value='service-grid';
        footer.append(component,button('+ Добавить блок','btn small',()=>stage({
          action:'addSection',pageId:page.id,sectionId:page.sections.at(-1).id,
          id:uniqueId('section'),component:component.value})));
        card.append(footer);pages.append(card);
      }
      const originalProblems=new Set(broken(session.current).map(problemKey));
      const fresh=broken(site).filter(v=>!originalProblems.has(problemKey(v)));
      const modified=JSON.stringify(site)!==JSON.stringify(session.current);
      const count=site.pages.reduce((n,p)=>n+p.sections.length,0);
      const modifiedPages=site.pages.filter(p=>JSON.stringify(p)!==
        JSON.stringify(session.current.pages.find(x=>x.id===p.id))).length;
      summary.textContent=site.pages.length+' страниц · '+count+' блоков · '+
        modifiedPages+' изменённых страниц · '+(modified?'план не применён':'нет изменений')+
        ' · '+(fresh.length?'новые битые ссылки: '+fresh.length:'битых ссылок не добавлено')+' · один Undo';
      error.textContent=failure?'Операция отклонена: '+failure:
        fresh.length?'Исправьте ссылки перед применением: '+fresh.slice(0,4).map(x=>x.path).join(', '):'';
      apply.disabled=!modified||fresh.length>0||openedRevision!==session.revision;
      reset.disabled=!modified;
      refreshPreview();
    }
    function commit(){
      if(!candidate||apply.disabled)return;
      try{
        const previousSection=sectionId;
        session=D.replaceSite(session,manifests,candidate.current,openedRevision);
        const owner=session.current.pages.find(p=>p.sections.some(s=>s.id===previousSection));
        const page=owner||session.current.pages.find(p=>p.id===selectedPage)||session.current.pages[0];
        pageId=page.id;
        const section=page.sections.find(s=>s.id===previousSection)||page.sections[0];
        sectionId=section.id;elementId=section.elements[0].id;
        dlg.close();draw();notice('Структура всего сайта применена одной операцией Undo. Сохранение и публикация отдельно.');
      }catch(ex){failure=ex.message;render();}
    }
    const open=button('Карта сайта','btn small',()=>{
      candidate=D.begin(session.current,manifests);openedRevision=session.revision;
      selectedPage=pageId;device='desktop';failure='';render();dlg.showModal();
    });open.id='cms-site-map-open';open.dataset.editorWrite='true';
    const tools=document.createElement('div');tools.className='structure-tools';
    tools.append(open);$('pages').before(tools);
  }

  function createStructureTools(){
    const openAppearance=initAppearanceEditor();
    const openDesignGraph=initDesignGraphEditor();
    const make=(parent,items)=>{
      const tools=document.createElement('div');tools.className='structure-tools';
      for(const [id,label,handler] of items)tools.append(button(label,'btn small',handler));
      for(const [i,node] of [...tools.children].entries())node.id=items[i][0];
      parent.before(tools);
    };
    const pageActions=[
      ['page-add','+ Страница',()=>{
        const title=prompt('Название новой страницы','Новая страница');if(title===null)return;
        const path=prompt('Путь страницы (например /catalog/)','/new-page/');if(path===null)return;
        const id=uniqueId('page'),firstSectionId=uniqueId('section');
        structural({action:'addPage',id,path,title,sectionId:firstSectionId,component:'company-hero'});
        if(session.current.pages.some(x=>x.id===id)){
          pageId=id;sectionId=session.current.pages.find(x=>x.id===id).sections[0].id;
          elementId=session.current.pages.find(x=>x.id===id).sections[0].elements[0].id;draw();
        }
      }],
      ['page-rename','Изменить',()=>{
        const page=current().page;
        const title=prompt('Название страницы',page.title);if(title===null)return;
        const path=prompt('Путь страницы',page.path);if(path===null)return;
        structural({action:'updatePage',pageId:page.id,title,path});
      }],
      ['page-duplicate','Копировать страницу',()=>{
        const page=current().page;
        const name=prompt('Название копии страницы',page.title+' — копия');if(name===null)return;
        const path=prompt('Новый URL копии страницы','/copy-'+Date.now().toString(36)+'/');
        if(path===null)return;
        const id=uniqueId('page');
        structural({action:'duplicatePage',pageId:page.id,id,title:name,path});
        const result=session.current.pages.find(x=>x.id===id);
        if(result){pageId=id;sectionId=result.sections[0].id;elementId=result.sections[0].elements[0].id;draw();}
      }],
      ['page-up','↑',()=>structural({action:'movePage',pageId:pageId,delta:-1})],
      ['page-down','↓',()=>structural({action:'movePage',pageId:pageId,delta:1})],
      ['page-remove','Удалить',()=>{
        if(confirm('Удалить выбранную страницу и все её блоки из черновика?'))structural({action:'removePage',pageId});
      }]
    ];
    const sectionActions=[
      ['section-appearance','Оформление блока',openAppearance],
      ['section-design-graph','Дизайн-композиция',openDesignGraph],
      ['section-catalog','Каталог блоков',openComponentCatalog],
      ['section-add','+ Блок',()=>{
        const component=prompt('Компонент блока:\n'+manifests.map(m=>m.id+' — '+m.label).join('\n'),'service-grid');
        if(component===null)return;
        const id=uniqueId('section');
        structural({action:'addSection',pageId,sectionId,id,component});
        const page=session.current.pages.find(x=>x.id===pageId);
        if(page.sections.some(x=>x.id===id)){
          sectionId=id;elementId=page.sections.find(x=>x.id===id).elements[0].id;draw();
        }
      }],
      ['section-duplicate','Копировать блок',()=>{
        const id=uniqueId('section');
        structural({action:'duplicateSection',pageId,sectionId,id});
        const section=session.current.pages.find(x=>x.id===pageId)?.sections.find(x=>x.id===id);
        if(section){sectionId=id;elementId=section.elements[0].id;draw();}
      }],
      ['section-up','↑',()=>structural({action:'moveSection',pageId,sectionId,delta:-1})],
      ['section-down','↓',()=>structural({action:'moveSection',pageId,sectionId,delta:1})],
      ['section-remove','Удалить',()=>{
        if(confirm('Удалить блок из черновика?'))structural({action:'removeSection',pageId,sectionId});
      }]
    ];
    make($('pages'),pageActions);
    make($('sections'),sectionActions);
  }

  // Site-specific form builder, curated presets and an inert conditional logic simulator.
  // No visitor POST, API, publish or delivery is performed from this dialog.
  const openFormBuilder=(()=>{
    const dlg=document.createElement('dialog');dlg.id='cms-form-builder';dlg.className='cms-settings-dialog cms-form-builder-dialog';
    const title=document.createElement('h2');title.textContent='Конструктор формы и проверка условий';
    const description=document.createElement('p');description.textContent='Три стандартных поля (имя, email, сообщение) сохраняются. Можно добавить до 9 вопросов, менять порядок, копировать и проверить условные ветки. Изменения попадут только в черновик после подтверждения.';
    const presetBar=document.createElement('div');presetBar.className='cms-form-preset-bar';
    const preset=document.createElement('select');preset.className='control';preset.id='cms-form-preset';
    const presets=[
      ['','Выберите готовый сценарий'],
      ['quote','Запрос коммерческого предложения'],
      ['order','Заказ оборудования'],
      ['consultation','Запись на консультацию'],
      ['feedback','Обратная связь']
    ];
    for(const [value,name] of presets){const option=document.createElement('option');option.value=value;option.textContent=name;preset.append(option);}
    const presetApply=button('Заполнить сценарий','btn small',loadPreset);
    presetApply.id='cms-form-preset-apply';
    const presetNote=document.createElement('small');presetNote.textContent='Сценарий заменит только дополнительные поля в этом окне — исходная форма и черновик останутся нетронутыми до «Применить».';
    presetBar.append(preset,presetApply,presetNote);
    const list=document.createElement('div');list.id='cms-form-rows';
    const add=button('+ Добавить поле','btn small',()=>{});add.id='cms-form-add';
    const simulator=document.createElement('section');simulator.id='cms-form-simulator';simulator.className='cms-form-simulator';
    const simTitle=document.createElement('h3');simTitle.textContent='Проверка формы перед сохранением';
    const simNote=document.createElement('p');simNote.textContent='Выберите варианты и заполните поля: условные вопросы появятся или исчезнут, а обязательные будут отмечены. Это только симуляция в редакторе, данные никуда не отправляются.';
    const simFields=document.createElement('div');simFields.id='cms-form-sim-fields';
    const simStatus=document.createElement('p');simStatus.id='cms-form-sim-status';simStatus.setAttribute('role','status');
    simulator.append(simTitle,simNote,simFields,simStatus);
    const apply=button('Применить к черновику','btn primary',()=>{});apply.id='cms-form-apply';
    const cancel=button('Закрыть','btn',()=>dlg.close());
    dlg.append(title,description,presetBar,list,add,simulator,apply,cancel);document.body.append(dlg);
    let source,fields,answers={};
    function input(label,type,value,changed){
      const wrap=document.createElement('label');wrap.textContent=label;
      const node=document.createElement(type==='textarea'?'textarea':type==='select'?'select':'input');
      node.className='control';
      if(node.tagName==='INPUT')node.type=type==='checkbox'?'checkbox':'text';
      if(type==='checkbox')node.checked=value;
      else if(type!=='select')node.value=value;
      node.addEventListener('change',()=>changed(type==='checkbox'?node.checked:node.value));
      wrap.append(node);return [wrap,node];
    }
    function options(node,values){
      for(const [value,label] of values){
        const option=document.createElement('option');option.value=value;option.textContent=label;
        node.append(option);
      }
    }
    function createField(label,kind='text',required=false,extra={}){
      return {id:uniqueId('field-f'),label,kind,required,
        options:extra.options||[],placeholder:extra.placeholder||'',...(extra.when?{when:extra.when}:{})};
    }
    function loadPreset(){
      if(!preset.value)return;
      const templates={
        quote:()=>[
          createField('Какая услуга нужна?','select',true,{options:['Разработка сайта','Дизайн','SEO','Реклама']}),
          createField('Ориентировочный бюджет','number',false,{placeholder:'Бюджет'}),
          createField('Подробности проекта','textarea',true,{placeholder:'Цели, сроки и пожелания'})
        ],
        order:()=>{
          const choice=createField('Что вы заказываете?','select',true,{options:['Новое оборудование','Запчасти','Сервис']});
          return [choice,
            createField('Модель оборудования','text',true,{when:{field:choice.id,option:1},placeholder:'Модель или техническое задание'}),
            createField('Количество','number',true,{placeholder:'Например, 2'}),
            createField('Желаемая дата','date',false,{})];
        },
        consultation:()=>[
          createField('Тема консультации','select',true,{options:['Веб-разработка','Дизайн','Реклама','SEO']}),
          createField('Удобная дата','date',false),
          createField('Способ связи','radio',true,{options:['Email','Телефон','Видеозвонок']}),
          createField('Вопросы к консультации','textarea',false)
        ],
        feedback:()=>[
          createField('Категория обращения','select',true,{options:['Вопрос','Предложение','Проблема']}),
          createField('Оценка','radio',false,{options:['Отлично','Хорошо','Нужно улучшить']}),
          createField('Ваш комментарий','textarea',true)
        ]
      };
      if(fields.length&&!confirm('Заменить только дополнительные поля выбранным сценарием? Изменения ещё не попадут в черновик.'))return;
      fields=templates[preset.value]();answers={};render();
    }
    // Safe local-only simulation of exactly the public collector's select/required visibility.
    function drawSimulator(){
      simFields.replaceChildren();
      const definitions=[];
      for(const [i,slot] of ['extra-one','extra-two','extra-three'].entries()){
        const v=source.elements.find(e=>e.slot===slot)?.values;
        if(v&&v['behavior.kind']!=='off'){
          definitions.push({id:'extra'+(i+1),kind:v['behavior.kind'],
            label:v['content.text'],required:v['behavior.required'],
            options:v['behavior.kind']==='select'?v['content.options'].split(/\r?\n/).map(x=>x.trim()).filter(Boolean):[],placeholder:''});
        }
      }
      definitions.push(...fields);
      const previousOptions=new Map(),activeValues={},inputs=[];
      for(const definition of definitions){
        const wrap=document.createElement('div');wrap.className='cms-form-sim-field';
        wrap.dataset.simField=definition.id;
        const prior=definition.when&&previousOptions.get(definition.when.field);
        const isActive=!definition.when||!!prior&&
          activeValues[definition.when.field]===prior[definition.when.option-1];
        wrap.hidden=!isActive;
        const label=document.createElement('label');
        label.textContent=definition.label+(definition.required?' *':'');
        wrap.append(label);
        const stored=isActive?(answers[definition.id]||''):'';
        if(!isActive)delete answers[definition.id];
        const control=(tag,type)=>{
          const node=document.createElement(tag);
          if(type)node.type=type;
          node.className='control';
          node.dataset.simControl=definition.id;
          return node;
        };
        const changed=value=>{answers[definition.id]=value;drawSimulator();};
        const choice=definition.kind==='select'||definition.kind==='radio';
        if(definition.kind==='select'){
          const node=control('select');
          options(node,[['','Выберите вариант'],...definition.options.map(x=>[x,x])]);
          node.value=stored;node.addEventListener('change',()=>changed(node.value));
          wrap.append(node);inputs.push({definition,node,isActive});
          previousOptions.set(definition.id,definition.options);
        }else if(definition.kind==='radio'){
          const group=document.createElement('div');group.className='cms-form-sim-choices';
          const nodes=[];
          for(const option of definition.options){
            const line=document.createElement('label');line.className='cms-form-sim-choice';
            const node=control('input','radio');node.name='sim-'+definition.id;node.value=option;
            node.checked=stored===option;node.addEventListener('change',()=>changed(node.value));
            line.append(node,document.createTextNode(option));group.append(line);nodes.push(node);
          }
          wrap.append(group);inputs.push({definition,node:nodes[0],isActive,value:stored});
        }else if(definition.kind==='checkbox'){
          const node=control('input','checkbox');node.checked=stored==='yes';
          node.addEventListener('change',()=>changed(node.checked?'yes':''));
          label.prepend(node);inputs.push({definition,node,isActive,value:stored});
        }else{
          const tag=definition.kind==='textarea'?'textarea':'input';
          const type=tag==='input'?definition.kind==='tel'?'tel':
            ['email','number','date','url'].includes(definition.kind)?definition.kind:'text':null;
          const node=control(tag,type);
          if(definition.placeholder)node.placeholder=definition.placeholder;
          node.value=stored;node.addEventListener('change',()=>changed(node.value));
          wrap.append(node);inputs.push({definition,node,isActive});
        }
        if(definition.kind!=='select')previousOptions.delete(definition.id);
        activeValues[definition.id]=stored;
        simFields.append(wrap);
      }
      let required=0,missing=0,active=0;
      for(const {definition,node,isActive,value} of inputs){
        if(!isActive)continue;
        active++;
        if(definition.required){
          required++;
          const current=value!==undefined?value:node?.value||'';
          const filled=definition.kind==='checkbox'?node?.checked:
            definition.kind==='radio'?!!current:!!String(current).trim();
          if(!filled)missing++;
        }
      }
      simStatus.textContent='Активных дополнительных полей: '+active+
        ' · обязательных: '+required+
        (missing?' · ещё не заполнено: '+missing:' · все обязательные заполнены')+
        ' · отправка отключена';
    }
    function render(){
      list.replaceChildren();add.disabled=fields.length>=9;
      const selectable=new Map();
      ['extra-one','extra-two','extra-three'].forEach((slot,i)=>{
        const values=source.elements.find(e=>e.slot===slot)?.values;
        if(values?.['behavior.kind']==='select')
          selectable.set('extra'+(i+1),values['content.options'].split(/\r?\n/).map(s=>s.trim()).filter(Boolean));
      });
      fields.forEach((field,i)=>{
        const row=document.createElement('fieldset');row.dataset.formField=field.id;
        const legend=document.createElement('legend');legend.textContent=(i+1)+'. '+field.id;
        const grid=document.createElement('div');grid.className='cms-form-row-grid';
        const [label,ln]=input('Подпись','text',field.label,v=>{field.label=v;drawSimulator();});ln.maxLength=100;
        const [kind,kn]=input('Тип','select',null,v=>{
          field.kind=v;field.options=['select','radio'].includes(v)?['Вариант 1','Вариант 2']:[];delete field.when;delete answers[field.id];render();
        });
        options(kn,[['text','Текст'],['tel','Телефон'],['email','Email'],['select','Список'],['radio','Радиокнопки'],['checkbox','Флажок'],['number','Число'],['date','Дата'],['url','Ссылка'],['textarea','Длинный текст']]);
        kn.value=field.kind;
        const [required]=input('Обязательно','checkbox',field.required,v=>{field.required=v;drawSimulator();});
        const [placeholder,pn]=input('Подсказка','text',field.placeholder,v=>{field.placeholder=v;drawSimulator();});
        pn.maxLength=120;
        grid.append(label,kind,required,placeholder);
        if(['select','radio'].includes(field.kind)){
          const [choices,cn]=input('Варианты (один на строку)','textarea',field.options.join('\n'),v=>{
            field.options=v.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);render();
          });
          cn.rows=3;grid.append(choices);
        }
        const [when,wn]=input('Условие видимости','select',null,v=>{
          if(v){const separator=v.lastIndexOf('|');field.when={field:v.slice(0,separator),option:Number(v.slice(separator+1))};}
          else delete field.when;
          drawSimulator();
        });
        const choices=[['','Всегда показывать']];
        for(const [name,values] of selectable)
          values.forEach((v,j)=>choices.push([name+'|'+(j+1),name+' → '+v]));
        options(wn,choices);wn.value=field.when?field.when.field+'|'+field.when.option:'';
        grid.append(when);
        const ops=document.createElement('div');ops.className='structure-tools';
        ops.append(button('↑','btn small',()=>{if(i>0){[fields[i-1],fields[i]]=[fields[i],fields[i-1]];render();}}));
        ops.append(button('↓','btn small',()=>{if(i+1<fields.length){[fields[i+1],fields[i]]=[fields[i],fields[i+1]];render();}}));
        const duplicate=button('Копировать','btn small',()=>{
          if(fields.length>=9)return;
          const copied=cp(field);copied.id=uniqueId('field-f');fields.splice(i+1,0,copied);render();
        });
        duplicate.dataset.formDuplicate=field.id;duplicate.disabled=fields.length>=9;
        ops.append(duplicate,button('Удалить','btn small',()=>{delete answers[field.id];fields.splice(i,1);render();}));
        row.append(legend,grid,ops);list.append(row);
        if(field.kind==='select')selectable.set(field.id,field.options);
      });
      drawSimulator();
    }
    add.addEventListener('click',()=>{
      if(fields.length>=9)return;
      fields.push(createField('Новый вопрос'));render();
    });
    apply.addEventListener('click',()=>{
      try{
        const site=cp(session.current);
        const section=site.pages.flatMap(p=>p.sections).find(s=>s.id===source.id);
        if(!section||section.component!=='lead-form-flex')throw Error('Форма отсутствует');
        section.formFields=cp(fields);
        session=D.replaceSite(session,manifests,site,session.revision);
        dlg.close();draw();notice('Форма обновлена в черновике одной операцией Undo. Сохранение и публикация отдельно.');
      }catch(e){notice('Изменение полей отклонено: '+e.message,true);}
    });
    return ()=>{
      const section=current().section;
      if(section.component!=='lead-form-flex')return;
      source=cp(section);fields=cp(section.formFields||[]);answers={};preset.value='';
      render();dlg.showModal();
    };
  })();

  function drawElements(){
    const {section}=current(),m=manifest(section);
    $('inspector-title').textContent=m?.label||section.component;
    $('inspector-caption').textContent='ID '+section.id+' · схема '+section.manifestVersion;
    const row=$('elements');row.replaceChildren();
    if(section.component==='lead-form-flex'){
      const builder=button('Конструктор дополнительных полей · '+(section.formFields||[]).length+'/9',
        'btn small',openFormBuilder);
      builder.id='cms-form-builder-open';builder.dataset.editorWrite='true';row.append(builder);
    }
    section.elements.forEach(e=>{
      const label=m.elements.find(s=>s.slot===e.slot)?.label||e.slot;
      row.append(button(label,'element'+(e.id===elementId?' active':''),
        ()=>{elementId=e.id;drawElements();drawFields();}));
    });
    if(m.repeat){
      const label=document.createElement('small');label.className='field-path';
      label.textContent='ПОВТОРЯЕМЫЕ ЭЛЕМЕНТЫ · '+section.items.length+'/'+m.repeat.max;row.append(label);
      section.items.forEach((item,i)=>{
        const headline=item.values['content.title']||item.values['content.question']||
          item.values['content.author']||item.values['content.caption']||'Карточка '+(i+1);
        const line=document.createElement('div');line.className='cms-repeat-row';
        const choice=button((i+1)+'. '+String(headline).slice(0,56),'element'+(item.id===elementId?' active':''),
          ()=>{elementId=item.id;drawElements();drawFields();});
        choice.dataset.repeatId=item.id;line.append(choice);
        const op=(title,label,action,more={})=>{
          const control=button(title,'btn small',()=>operateRepeat(action,item.id,more));
          control.title=label;control.setAttribute('aria-label',label+' '+(i+1));line.append(control);
        };
        op('↑','Поднять карточку','moveItem',{delta:-1});
        op('↓','Опустить карточку','moveItem',{delta:1});
        op('⧉','Копировать карточку','duplicateItem');
        op('×','Удалить карточку','removeItem');
        row.append(line);
      });
      const add=button('+ Добавить карточку','btn small',()=>operateRepeat('addItem',null));
      add.id='cms-repeat-add';row.append(add);
    }
  }
  function operateRepeat(action,itemId,extra={}){
    const id=action==='addItem'||action==='duplicateItem'?uniqueId('item'):undefined;
    structural({action,pageId,sectionId,itemId,...(id?{id}:{}),...extra});
    const section=current().section;
    if(id&&section.items?.some(x=>x.id===id)){
      elementId=id;drawElements();drawFields();drawPreview();
    }
  }
  function applyEdit(field,raw,valueOnScreen,output){
    try{
      const value=field.type==='number'?Number(raw):
        field.type==='boolean'?!!raw:raw;
      session=D.edit(session,manifests,{
        pageId,sectionId,elementId,path:field.path,value,
        breakpoint:field.responsive?breakpoint:null,expectedRevision:session.revision
      });
      output.textContent='';
      drawHeader();drawElements();drawPreview();
    }catch(e){
      output.textContent=e.message;output.style.color='#ff9c9c';
      // Invalid values never touch the current draft.
    }
  }
  function drawFields(){
    const fields=C.controls(session.current,manifests,pageId,sectionId,elementId);
    const box=$('fields');box.replaceChildren();
    for(const field of fields){
      const wrap=document.createElement('div');
      const label=document.createElement('label');
      label.className='field-label';label.textContent=field.label;
      const id='field-'+field.path.replace('.','-');label.htmlFor=id;
      const line=document.createElement('div');line.className='field-path';
      line.textContent=field.path+(field.responsive?' · '+breakpoint:'');
      const error=document.createElement('p');error.className='field-path';error.setAttribute('role','alert');
      let control;
      const initial=field.responsive?C.effectiveValue(field.value,breakpoint):field.value;
      if(field.type==='media'){
        control=document.createElement('select');
        const blank=document.createElement('option');blank.value='';blank.textContent='Без изображения';control.append(blank);
        session.current.assets.forEach(asset=>{
          const opt=document.createElement('option');opt.value=asset.id;
          opt.textContent=(asset.alt||asset.id)+' · '+asset.mime;
          control.append(opt);
        });control.value=initial;
      }else if(field.type==='enum'){
        control=document.createElement('select');
        field.options.forEach(v=>{
          const opt=document.createElement('option');opt.value=v;opt.textContent=v;control.append(opt);
        });control.value=initial;
      }else{
        // Select options are separated by newlines: a single-line input
        // silently discards line breaks and destroys the published choices.
        control=document.createElement(field.path==='content.options'?'textarea':'input');
        if(control.tagName==='INPUT')control.type=field.type==='boolean'?'checkbox':
          field.type==='color'?'color':field.type==='number'?'number':'text';
        if(field.type==='boolean')control.checked=initial;
        else control.value=safeText(initial);
        if(field.type==='number'){control.min=field.min;control.max=field.max;}
        if(field.maxLength)control.maxLength=field.maxLength;
      }
      control.id=id;control.className='control';control.dataset.field=field.path;
      const event=(field.type==='text'||field.type==='color'||field.type==='length')?'change':'change';
      control.addEventListener(event,()=>{
        applyEdit(field,field.type==='boolean'?control.checked:control.value,control,error);
      });
      wrap.append(label,control,line,error);box.append(wrap);
    }
  }
  function stylesFor(block){
    const heading=block.elements.find(x=>x.slot==='heading');
    return {
      title:heading?.props?.content?.text||'',
      fontSize:heading?.props?.style?.fontSize||'44px',
      color:heading?.props?.style?.color||'#16273d'
    };
  }
  function screen(block){
    const e=escapeHtml;
    const p=slot=>block.elements.find(x=>x.slot===slot)?.props||{content:{},style:{},behavior:{}};
    const title=stylesFor(block),t={...C.DEFAULT_THEME,...session.current.theme};
    const lineHeights={compact:'1.4',normal:'1.6',relaxed:'1.8'};
    const headingSizes={compact:'clamp(24px,2.5vw,34px)',normal:'clamp(28px,3vw,42px)',large:'clamp(36px,4.5vw,56px)'};
    const buttonBackground=t.buttonStyle==='outline'?'transparent':'var(--cms-primary)';
    const buttonColor=t.buttonStyle==='outline'?'var(--cms-primary)':e(t.buttonText);
    const buttonRadius=t.buttonStyle==='pill'?'999px':Number(t.buttonRadius)+'px';
    const buttonShadow=t.buttonStyle==='outline'?'inset 0 0 0 2px var(--cms-primary)':'none';
    const palette='<style>:root{--cms-bg:'+e(t.background)+';--cms-surface:'+e(t.surface)+
      ';--cms-text:'+e(t.text)+';--cms-primary:'+e(t.primary)+';--cms-width:'+t.maxWidth+
      'px;--cms-font:'+(t.font==='georgia'?'Georgia,serif':t.font==='arial'?'Arial,sans-serif':'system-ui,Arial,sans-serif')+
      ';--cms-body-size:'+Number(t.bodySize)+'px;--cms-line-height:'+lineHeights[t.lineHeight]+
      ';--cms-h2-size:'+headingSizes[t.headingScale]+';--cms-button-bg:'+buttonBackground+
      ';--cms-button-color:'+buttonColor+';--cms-button-text:'+e(t.buttonText)+
      ';--cms-button-radius:'+buttonRadius+';--cms-button-shadow:'+buttonShadow+'}'+
      'body{background:var(--cms-bg)!important;color:var(--cms-text)!important;font-family:var(--cms-font)!important;font-size:var(--cms-body-size)!important;line-height:var(--cms-line-height)!important}'+
      'h2{font-size:var(--cms-h2-size)!important}'+
      '.action{background:var(--cms-button-bg)!important;color:var(--cms-button-color)!important;border-radius:var(--cms-button-radius)!important;box-shadow:var(--cms-button-shadow)!important}'+
      '.card{background:var(--cms-surface)!important}section{max-width:var(--cms-width);margin-inline:auto}</style>';
    let content='';
    if(block.component==='company-hero'){
      content='<section class="hero"><div class="decor">M / AI SITE CMS</div>'+
        '<div class="kicker">ВАШ САЙТ</div>'+
        '<h1 style="font-size:'+e(title.fontSize)+';color:'+e(title.color)+'">'+e(title.title)+'</h1>'+
        '<p>'+e(p('summary').content.text||'')+'</p>'+
        '<span class="action">'+e(p('action').content.text||'')+' <span aria-hidden="true">↗</span></span>'+
        '</section>';
    }else if(block.component==='feature-highlights'){
      content='<section class="features"><span class="kicker">НАШ ПОДХОД</span>'+
        '<h2>'+e(title.title)+'</h2>'+
        '<div class="cards"><div class="card"><strong>01</strong><p style="color:'+e(p('first').style.color||'#243c52')+'">'+e(p('first').content.text||'')+'</p></div>'+
        '<div class="card"><strong>02</strong><p>'+e(p('second').content.text||'')+'</p></div></div></section>';
    }else if(block.component==='service-grid'){
      content='<section class="features"><h2>'+e(title.title)+'</h2><div class="cms-preview-grid">'+
        block.items.map(item=>'<article class="card"><h3>'+e(item.props.content.title)+'</h3><p>'+
          e(item.props.content.text)+'</p><span class="action">Подробнее ↗</span></article>').join('')+
        '</div></section>';
    }else if(block.component==='pricing-plans'){
      const cards=block.items.map(item=>{
        const v=item.props;
        const features=v.content.features.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
        return '<article class="cms-pricing-card card'+(v.behavior.featured?' is-featured':'')+'">'+
          '<h3>'+e(v.content.title)+'</h3><p class="cms-pricing-price">'+e(v.content.price)+'</p>'+
          '<p class="cms-pricing-period">'+e(v.content.period)+'</p>'+
          '<p>'+e(v.content.description)+'</p><ul>'+features.map(x=>'<li>'+e(x)+'</li>').join('')+
          '</ul><span class="action">'+e(v.content.button)+'</span></article>';
      }).join('');
      content='<section class="features cms-pricing"><h2>'+e(p('heading').content.text)+'</h2>'+
        '<p>'+e(p('intro').content.text)+'</p><div class="cms-pricing-grid">'+cards+'</div>'+
        '<small>'+e(p('footnote').content.text)+'</small></section>';
    }else if(block.component==='process-timeline'){
      const items=block.items.map((item,i)=>{
        const v=item.props.content;
        return '<li class="cms-process-step card"><b class="cms-process-number">'+String(i+1).padStart(2,'0')+
          '</b><div><h3>'+e(v.title)+'</h3><p>'+e(v.description)+'</p>'+
          (v.detail?'<small>'+e(v.detail)+'</small>':'')+'</div></li>';
      }).join('');
      content='<section class="features cms-process"><h2>'+e(p('heading').content.text)+'</h2>'+
        '<p>'+e(p('description').content.text)+'</p><ol class="cms-process-list">'+items+'</ol></section>';
    }else if(block.component==='comparison-matrix'){
      const rows=block.items.map(item=>{
        const v=item.props.content;
        return '<tr><th scope="row">'+e(v.metric)+'</th><td>'+e(v.first)+'</td><td>'+e(v.second)+'</td></tr>';
      }).join('');
      content='<section class="features cms-comparison"><div class="cms-compare-scroll" role="region" tabindex="0" aria-label="Таблица сравнения">'+
        '<table><caption>'+e(p('heading').content.text)+'</caption><thead><tr>'+
        '<th scope="col">Критерий</th><th scope="col">'+e(p('first').content.text)+'</th>'+
        '<th scope="col">'+e(p('second').content.text)+'</th></tr></thead>'+
        '<tbody>'+rows+'</tbody></table></div><p>'+e(p('caption').content.text)+'</p></section>';
    }else if(block.component==='content-switcher'){
      const radios=[],panels=[];
      block.items.forEach((item,i)=>{
        const key='cms-preview-switch-'+item.id,v=item.props.content;
        radios.push('<input class="cms-switcher-radio" id="'+e(key)+'" type="radio" name="switch-'+
          e(block.sectionId)+'"'+(i===0?' checked':'')+'><label class="cms-switcher-tab" for="'+e(key)+'">'+
          e(v.title)+'</label>');
        panels.push('<section class="cms-switcher-panel" id="cms-preview-pane-'+e(item.id)+'">'+
          '<h3>'+e(v.heading)+'</h3><p>'+e(v.body)+'</p></section>');
      });
      const rules=block.items.map(item=>'#cms-preview-switch-'+e(item.id)+
        ':checked~.cms-switcher-panels>#cms-preview-pane-'+e(item.id)+'{display:block}').join('');
      content='<section class="features cms-switcher-section"><h2>'+e(p('heading').content.text)+'</h2>'+
        '<p>'+e(p('summary').content.text)+'</p><fieldset class="cms-switcher"><legend class="cms-sr-only">Выберите раздел</legend>'+
        radios.join('')+'<div class="cms-switcher-panels">'+panels.join('')+'</div></fieldset>'+
        '<style>'+rules+'</style></section>';
    }else if(block.component==='faq-accordion'){
      content='<section class="features"><h2>'+e(title.title)+'</h2><div class="cms-preview-faq">'+
        block.items.map(item=>'<details><summary>'+e(item.props.content.question)+'</summary><p>'+
          e(item.props.content.answer)+'</p></details>').join('')+'</div></section>';
    }else if(block.component==='testimonials'){
      content='<section class="features"><h2>'+e(title.title)+'</h2><div class="cms-preview-grid">'+
        block.items.map(item=>'<blockquote class="card"><p>“'+e(item.props.content.quote)+'”</p><footer>'+
          e(item.props.content.author)+(item.props.content.role?' · '+e(item.props.content.role):'')+
          '</footer></blockquote>').join('')+'</div></section>';
    }else if(block.component==='photo-gallery'){
      const gallery=block.items.map(item=>{
        const asset=session.current.assets.find(x=>x.id===item.props.content.media);
        const src=asset&&HOSTED?window.Stage3Host?.previewUrl?.(asset.id):null;
        return '<figure class="card">'+(src?'<img class="showcase-preview" src="'+e(src)+'" alt="'+e(asset.alt)+'">':
          '<div class="media-placeholder">Выберите фотографию</div>')+
          '<figcaption>'+e(item.props.content.caption||'')+'</figcaption></figure>';
      });
      content='<section class="features"><h2>'+e(title.title)+'</h2><div class="cms-preview-grid">'+gallery.join('')+'</div></section>';
    }else if(block.component==='adaptive-gallery'){
      const setting=p('settings').behavior;
      const layout=setting.layout,fit=setting.fit,cols=setting.columns;
      const photos=block.items.map(item=>{
        const v=item.props,asset=session.current.assets.find(x=>x.id===v.content.media);
        const photo=asset&&HOSTED?window.Stage3Host?.previewUrl?.(asset.id):null;
        const visual=photo?'<img src="'+e(photo)+'" alt="'+e(asset.alt)+'" loading="lazy">':
          '<div class="media-placeholder">Выберите фотографию</div>';
        return '<figure class="cms-adaptive-card'+(layout==='grid'&&v.behavior.featured?' cms-gallery-featured':'')+'">'+
          visual+(setting.caption?'<figcaption>'+e(v.content.caption)+'</figcaption>':'')+'</figure>';
      }).join('');
      content='<section class="features cms-adaptive-section"><h2>'+e(title.title)+'</h2>'+
        '<div class="cms-adaptive-gallery cms-gallery-'+layout+' cms-gallery-fit-'+fit+
        '" style="--cms-gallery-columns:'+Number(cols)+'"'+
        (layout==='carousel'?' tabindex="0" role="region" aria-roledescription="carousel" aria-label="'+e(title.title)+'"':'')+
        '>'+photos+'</div></section>';
    }else if(block.component==='media-story'){
      const item=session.current.assets.find(x=>x.id===p('photo').content.media);
      const photo=item&&HOSTED?window.Stage3Host?.previewUrl?.(item.id):null;
      const visual=photo?'<img class="showcase-preview" src="'+e(photo)+'" alt="'+e(item.alt)+'">':
        '<div class="media-placeholder">Добавьте фотографию из медиабиблиотеки</div>';
      content='<section class="features"><div class="cms-preview-grid"><div><h2>'+e(title.title)+'</h2>'+
        '<p>'+e(p('copy').content.text)+'</p><span class="action">'+e(p('action').content.text)+'</span></div>'+
        '<div>'+visual+'</div></div></section>';
    }else if(block.component==='partner-logos'){
      const entries=block.items.map(item=>{
        const asset=session.current.assets.find(x=>x.id===item.props.content.media);
        const photo=asset&&HOSTED?window.Stage3Host?.previewUrl?.(asset.id):null;
        return '<div class="card">'+(photo?'<img class="showcase-preview" src="'+e(photo)+'" alt="'+e(asset.alt)+'">':
          '<div class="media-placeholder">Логотип не выбран</div>')+
          '<strong>'+e(item.props.content.caption)+'</strong></div>';
      });
      content='<section class="features"><h2>'+e(title.title)+'</h2><div class="cms-preview-grid">'+entries.join('')+'</div></section>';
    }else if(block.component==='image-showcase'){
      const mediaId=p('photo').content.media||'';
      const asset=session.current.assets.find(x=>x.id===mediaId);
      const data=asset&&HOSTED?window.Stage3Host?.previewUrl?.(asset.id):null;
      const picture=data?'<img class="showcase-preview" src="'+e(data)+'" alt="'+e(asset.alt)+'">':
        '<div class="media-placeholder">'+(asset?'Загружается изображение: '+e(asset.alt||asset.id):'Выберите изображение из медиабиблиотеки')+'</div>';
      content='<section class="features"><span class="kicker">НАШИ ФОТОГРАФИИ</span><h2>'+e(title.title)+'</h2>'+
        '<div class="card">'+picture+'<p>'+e(p('caption').content.text||'')+'</p></div></section>';
    }else if(block.component==='lead-form'){
      content='<section class="contact"><h2>'+e(p('heading').content.text)+'</h2>'+
        '<div class="card"><label>'+e(p('name-label').content.text)+'</label><div class="media-placeholder">Поле имени</div>'+
        '<label>'+e(p('email-label').content.text)+'</label><div class="media-placeholder">Email</div>'+
        '<label>'+e(p('message-label').content.text)+'</label><div class="media-placeholder">Сообщение</div>'+
        '<p>☐ '+e(p('consent-label').content.text)+'</p><span class="action">'+e(p('submit-label').content.text)+'</span></div></section>';
    }else if(block.component==='lead-form-flex'){
      const configured=(block.formFields||[]).map(field=>{
        const label=e(field.label)+(field.required?' *':'');
        const placeholder=field.placeholder?' placeholder="'+e(field.placeholder)+'"':'';
        if(field.kind==='select')return '<label>'+label+'<select disabled><option>Выберите вариант</option>'+
          field.options.map(option=>'<option>'+e(option)+'</option>').join('')+'</select></label>';
        if(field.kind==='radio')return '<fieldset><legend>'+label+'</legend>'+field.options.map(option=>
          '<label><input type="radio" disabled> '+e(option)+'</label>').join('')+'</fieldset>';
        if(field.kind==='checkbox')return '<label><input type="checkbox" disabled> '+label+'</label>';
        if(field.kind==='textarea')return '<label>'+label+'<textarea disabled'+placeholder+'></textarea></label>';
        const inputType=['tel','email','number','date','url'].includes(field.kind)?field.kind:'text';
        return '<label>'+label+'<input type="'+inputType+'" disabled'+placeholder+'></label>';
      }).join('');
      const extra=['extra-one','extra-two','extra-three'].map(slot=>{
        const v=p(slot),kind=v.behavior.kind;
        return kind==='off'?'':'<label>'+e(v.content.text)+' '+(v.behavior.required?'*':'')+'</label>'+
          '<div class="media-placeholder">'+e(kind==='select'?v.content.options.replaceAll('\\n',', '):kind)+'</div>';
      }).join('');
      content='<section class="contact"><h2>'+e(p('heading').content.text)+'</h2>'+
        '<div class="card"><label>'+e(p('name-label').content.text)+'</label><div class="media-placeholder">Имя</div>'+
        '<label>'+e(p('email-label').content.text)+'</label><div class="media-placeholder">Email</div>'+
        '<label>'+e(p('message-label').content.text)+'</label><div class="media-placeholder">Сообщение</div>'+extra+configured+
        '<p>☐ '+e(p('consent-label').content.text)+'</p><span class="action">'+e(p('submit-label').content.text)+'</span></div></section>';
    }else if(block.component==='cta-banner'){
      content='<section class="cta-banner"><h2>'+e(p('heading').content.text||'')+'</h2>'+
        '<p>'+e(p('summary').content.text||'')+'</p><div class="cta-actions">'+
        '<span class="action">'+e(p('primary').content.text||'')+'</span>'+
        '<span class="action secondary">'+e(p('secondary').content.text||'')+'</span></div></section>';
    }else if(block.component==='contact-panel'){
      content='<section class="contact"><span class="kicker">НАЧНЁМ СОТРУДНИЧЕСТВО</span>'+
        '<h2>'+e(title.title)+'</h2><p>Свяжитесь с нами через выбранный канал.</p>'+
        '<span class="action">'+e(p('action').content.text||'')+' ↗</span>'+
        '<small>Кнопка демонстрационная: данные не отправляются.</small></section>';
    }else content='<section><h2>Незарегистрированный шаблон</h2></section>';
    // Typed composition overrides only rendering: original component fields survive.
    if(block.designGraph)content=DESIGN_GRAPH.render(session.current,block.designGraph,'',
      assetId=>HOSTED?window.Stage3Host?.previewUrl?.(assetId):null,block.sectionId,
      assetId=>HOSTED?window.Stage3Host?.videoUrl?.(assetId):null);
    const appearance=block.appearance||C.DEFAULT_APPEARANCE;
    const skin='cms-surface-'+appearance.surface+' cms-spacing-'+appearance.spacing+' cms-align-'+appearance.align+
      (appearance.width?' cms-width-'+appearance.width:'')+
      (appearance.heading?' cms-heading-'+appearance.heading:'')+
      (appearance.corners?' cms-corners-'+appearance.corners:'')+
      (appearance.mobileAlign?' cms-mobile-align-'+appearance.mobileAlign:'')+
      (appearance.mobileSpacing?' cms-mobile-spacing-'+appearance.mobileSpacing:'')+
      (appearance.button?' cms-button-'+appearance.button:'');
    content='<div class="cms-section-skin '+skin+'">'+content+'</div>';
    const skinCss='<style>.cms-surface-paper>section{background:var(--cms-surface)!important}'+
      '.cms-surface-tint>section{background:#ecf4fc!important}'+
      '.cms-surface-dark>section{background:#112536!important;color:#f5f9fe!important}'+
      '.cms-spacing-tight>section{padding-top:25px!important;padding-bottom:25px!important}'+
      '.cms-spacing-airy>section{padding-top:110px!important;padding-bottom:110px!important}'+
      '.cms-align-center>section{text-align:center!important}'+
      '.cms-align-center>section>p{margin-left:auto;margin-right:auto}'+
      '.cms-width-narrow>section{max-width:780px!important;margin-inline:auto!important}'+
      '.cms-width-wide>section{max-width:none!important}'+
      '.cms-heading-compact>section h2{font-size:clamp(24px,2.5vw,34px)!important}'+
      '.cms-heading-expressive>section h2{font-size:clamp(36px,4.5vw,56px)!important}'+
      '.cms-corners-soft>section :is(article,.card,details,img,.action){border-radius:12px!important}'+
      '.cms-corners-round>section :is(article,.card,details,img,.action){border-radius:28px!important}'+
      '.cms-button-solid>section .action{background:var(--cms-primary)!important;color:var(--cms-button-text)!important;box-shadow:none!important}'+
      '.cms-button-outline>section .action{background:transparent!important;color:var(--cms-primary)!important;box-shadow:inset 0 0 0 2px currentColor}'+
      '.cms-button-pill>section .action{border-radius:999px!important}'+
      '.cta-banner{background:var(--cms-surface);min-height:0;text-align:inherit}.cta-banner p{max-width:650px}.cta-actions{display:flex;flex-wrap:wrap;gap:12px}.cta-actions .secondary{background:transparent!important;color:var(--cms-primary);box-shadow:inset 0 0 0 2px currentColor}'+
      '@media(max-width:600px){.cms-mobile-align-left>section{text-align:left!important}.cms-mobile-align-center>section{text-align:center!important}'+
      '.cms-mobile-spacing-tight>section{padding-top:24px!important;padding-bottom:24px!important}'+
      '.cms-mobile-spacing-normal>section{padding-top:40px!important;padding-bottom:40px!important}'+
      '.cms-mobile-spacing-airy>section{padding-top:72px!important;padding-bottom:72px!important}}</style>';
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8">'+
      '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;none&#39;; img-src '+(HOSTED?'data:':'&#39;none&#39;')+'; style-src &#39;unsafe-inline&#39;; connect-src &#39;none&#39;; media-src '+(HOSTED?'data:':'&#39;none&#39;')+'; form-action &#39;none&#39;; base-uri &#39;none&#39;">'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<style>*{box-sizing:border-box}body{margin:0;background:#fcfdfd;color:#1b3046;font:15px/1.6 Arial,sans-serif}section{padding:70px clamp(18px,7%,80px);min-height:470px}.kicker{display:block;color:#167c6a;font:700 11px Arial;letter-spacing:.15em;margin-bottom:19px}h1{line-height:1.12;letter-spacing:-.045em;max-width:850px;margin:10px 0 25px;overflow-wrap:anywhere}h2{font-size:clamp(29px,4vw,52px);line-height:1.16;letter-spacing:-.03em;margin:12px 0 30px}p{font-size:var(--cms-body-size,17px);max-width:630px;line-height:var(--cms-line-height,1.65)}.hero{background:radial-gradient(circle at 90% 25%,#d9f6e6 0%,transparent 44%),linear-gradient(115deg,#f9fdfb,#e9f1f5)}.decor{color:#80a6b2;font-size:11px;letter-spacing:.15em;text-align:right}.action{display:inline-flex;margin-top:24px;gap:35px;border-radius:9px;background:#142e3c;color:white;padding:14px 20px;font-weight:700;font-size:14px}.features{background:#f2f7f8}.cards{display:grid;grid-template-columns:1fr 1fr;gap:15px}.card{border:1px solid #dce6e9;border-radius:14px;padding:26px;background:white}.card strong{color:#1a8b76}.card p{font-size:var(--cms-body-size,17px);overflow-wrap:anywhere}.media-placeholder{padding:80px 20px;background:#e7eff2;border:1px dashed #91a8b1;text-align:center;border-radius:12px}.showcase-preview{display:block;width:100%;height:auto;max-height:520px;object-fit:contain;border-radius:12px}.contact{background:linear-gradient(130deg,#effbf6,#e8f1f7)}.contact small{display:block;color:#5c7180;margin-top:25px}.contact .action{background:#0a766b}@media(max-width:650px){section{padding:46px 25px;min-height:450px}.cards{grid-template-columns:1fr}h1{line-height:1.12}h2{font-size:32px}p{font-size:var(--cms-body-size,15px)}.card{padding:20px}}</style>'+
      '<style>.cms-pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:16px;margin:20px 0}.cms-pricing-card{display:flex;flex-direction:column;gap:7px}.cms-pricing-card.is-featured{border:2px solid var(--cms-primary)}.cms-pricing-card h3,.cms-pricing-card p{margin:0}.cms-pricing-price{font-size:28px!important;font-weight:800;color:var(--cms-primary)}.cms-pricing-period{font-size:13px!important;opacity:.75}.cms-pricing-card ul{padding-left:20px;white-space:normal}.cms-pricing-card .action{margin-top:auto}.cms-process-list{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(235px,100%),1fr));padding:0;gap:14px}.cms-process-step{display:flex;gap:14px}.cms-process-number{font-size:21px;color:var(--cms-primary);font-weight:800}.cms-compare-scroll{overflow-x:auto;max-width:100%;border:1px solid #d4e1e9;border-radius:14px}.cms-compare-scroll table{border-collapse:collapse;min-width:490px;width:100%;background:var(--cms-surface)}.cms-compare-scroll caption{font-size:27px;font-weight:700;text-align:left;padding:16px}.cms-compare-scroll th,.cms-compare-scroll td{border-bottom:1px solid #d2dce5;padding:12px 16px;text-align:left}.cms-compare-scroll thead th{background:#edf3f9}.cms-switcher{border:0;display:flex;flex-wrap:wrap;gap:9px;padding:0}.cms-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.cms-switcher-radio{position:absolute;opacity:0;width:1px;height:1px}.cms-switcher-tab{padding:11px 15px;border:1px solid #bfccd8;border-radius:9px;cursor:pointer;background:white}.cms-switcher-radio:checked+.cms-switcher-tab{background:var(--cms-primary);color:white}.cms-switcher-radio:focus-visible+.cms-switcher-tab{outline:3px solid var(--cms-primary);outline-offset:2px}.cms-switcher-panels{flex-basis:100%;margin-top:14px}.cms-switcher-panel{display:none;padding:22px!important;min-height:0!important;border:1px solid #d7e1e9;border-radius:12px;background:white}.cms-switcher-panel p{white-space:pre-line}</style>'+
      '<style>.cms-adaptive-section{min-width:0}.cms-adaptive-gallery{min-width:0;max-width:100%;margin:20px 0}.cms-adaptive-card{overflow:hidden;min-width:0;break-inside:avoid;margin:0;background:var(--cms-surface);border:1px solid #d6e0ea;border-radius:12px}.cms-adaptive-card img{display:block;width:100%;aspect-ratio:4/3;max-height:460px;object-fit:cover}.cms-adaptive-card .media-placeholder{min-height:110px}.cms-gallery-fit-contain .cms-adaptive-card img{object-fit:contain}.cms-adaptive-card figcaption{padding:12px;overflow-wrap:anywhere}.cms-gallery-grid{display:grid;grid-template-columns:repeat(var(--cms-gallery-columns),minmax(0,1fr));gap:14px}.cms-gallery-grid .cms-gallery-featured{grid-column:span 2}.cms-gallery-masonry{columns:var(--cms-gallery-columns);column-gap:14px}.cms-gallery-masonry .cms-adaptive-card{display:inline-block;width:100%;margin-bottom:14px}.cms-gallery-masonry .cms-adaptive-card img{aspect-ratio:auto;height:auto}.cms-gallery-carousel{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;padding:4px 4px 18px}.cms-gallery-carousel:focus-visible{outline:3px solid var(--cms-primary)}.cms-gallery-carousel .cms-adaptive-card{flex:0 0 clamp(210px,calc(100% / var(--cms-gallery-columns)),75%);scroll-snap-align:start}.cms-gallery-carousel .cms-adaptive-card img{aspect-ratio:4/3}@media(max-width:760px){.cms-gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cms-gallery-masonry{columns:2}.cms-gallery-carousel .cms-adaptive-card{flex-basis:70%}}@media(max-width:520px){.cms-gallery-grid{grid-template-columns:1fr}.cms-gallery-grid .cms-gallery-featured{grid-column:auto}.cms-gallery-masonry{columns:1}.cms-gallery-carousel .cms-adaptive-card{flex-basis:84%}}</style>'+
      '<style>.cms-preview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:16px}.cms-preview-grid .card{margin:0}.cms-preview-grid h3{margin:5px 0 10px}.cms-preview-faq details{background:var(--cms-surface);border:1px solid #dce6e9;border-radius:10px;padding:15px;margin-block:10px}.cms-preview-faq summary{cursor:pointer;font-weight:700}.cms-preview-grid figcaption{margin-top:10px}</style>'+palette+skinCss+'</head><body>'+content+'</body></html>';
  }
  function drawPreview(){
    const {page,section}=current(),m=manifest(section);
    $('canvas-title').textContent=m?.label||section.component;
    $('canvas-caption').textContent=page.title+' / '+section.id+' · '+breakpoint;
    const block=D.blockPreview(session,manifests,pageId,sectionId,breakpoint);
    const preview=screen(block);
    $('preview').srcdoc=preview.replace('<html lang="ru">','<html lang="'+escapeHtml(session.current.language||'ru')+'">');
  }
  function drawVersions(){
    if(HOSTED)return window.Stage3Host?.drawVersions?.();
    const box=$('versions');box.replaceChildren();
    if(!versions.length){const p=document.createElement('p');p.className='subdued';
      p.textContent='Пока нет сохранений. Начните с кнопки «Сохранить черновик».';box.append(p);return;}
    versions.forEach((item,i)=>{
      const b=button('Версия '+(versions.length-i),'version',()=>{
        if(JSON.stringify(session.current)!==savedBytes&&!confirm('Отбросить несохранённые правки и восстановить сохранённую версию?'))return;
        try{
          session=D.begin(item.site,manifests);
          pageId=session.current.pages[0].id;sectionId=session.current.pages[0].sections[0].id;
          elementId=session.current.pages[0].sections[0].elements[0].id;
          savedBytes=JSON.stringify(session.current);draw();notice('Версия восстановлена в редакторе. Публикации не было.');
        }catch(e){notice('Версия отклонена: '+e.message,true);}
      });
      const subtitle=document.createElement('small');
      subtitle.textContent=new Date(item.at).toLocaleString('ru-RU');b.append(subtitle);box.append(b);
    });
  }
  function draw(){current();drawHeader();drawTree();drawElements();drawFields();drawPreview();drawVersions();if(HOSTED)window.Stage3Host?.onDraw?.();
    document.querySelectorAll('.device').forEach(b=>b.classList.toggle('active',b.dataset.bp===breakpoint));
    persistInteropSession();}
  function save(){
    if(HOSTED)return window.Stage3Host?.save?.();
    try{
      C.validateSite(session.current,manifests);
      const site=cp(session.current);
      const next=[{at:new Date().toISOString(),site},...versions].slice(0,MAX_VERSIONS);
      localStorage.setItem(STORAGE,JSON.stringify({format:'manufact-ai-studio-versions-v1',siteId:site.siteId,versions:next}));
      versions=next;savedBytes=JSON.stringify(site);
      session=D.begin(site,manifests);draw();notice('Черновик сохранён в этом браузере. Сайт не опубликован.');
    }catch(e){notice('Не удалось сохранить: '+e.message,true);}
  }
  function load(){
    if(HOSTED)return;
    try{
      const raw=localStorage.getItem(STORAGE);
      if(!raw)return;
      const data=JSON.parse(raw);
      if(data?.format!=='manufact-ai-studio-versions-v1'||!Array.isArray(data.versions)||data.versions.length>MAX_VERSIONS)
        throw Error('Неверный формат сохранений');
      const checked=data.versions.map(v=>{
        if(typeof v.at!=='string'||!Number.isFinite(Date.parse(v.at)))throw Error('Неверное время сохранения');
        const site=C.validateSite(v.site,manifests);
        if(site.siteId!==data.siteId)throw Error('В архиве смешаны сайты');
        return {at:v.at,site};
      });
      if(!checked.length)return;
      versions=checked;session=D.begin(checked[0].site,manifests);
      savedBytes=JSON.stringify(session.current);
    }catch(e){notice('Сохранённые данные не загружены: '+e.message+' — исходный пример доступен.',true);}
  }
  function exportJson(){
    const data=JSON.stringify(C.validateSite(session.current,manifests),null,2)+'\n';
    const url=URL.createObjectURL(new Blob([data],{type:'application/json;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='ai-site-stage3-draft.json';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
    notice('Текущий черновик экспортирован. Это не опубликованный сайт.');
  }
  async function importJson(file){
    if(!file||file.size>MAX_INTEROP_UPLOAD)
      return notice('JSON-файл слишком большой (максимум 2,5 МБ для D7 handoff)',true);
    const previousInterop=interopSession;
    try{
      const parsed=JSON.parse(await file.text());
      const isCandidate=GRAPH_INTEROP.isCandidate(parsed),isHandoff=GRAPH_INTEROP.isHandoff(parsed);
      if(!isCandidate&&!isHandoff&&file.size>MAX_UPLOAD)
        throw Error('Обычный site-v1 JSON ограничен 900 КБ');
      let nextInterop=null,site;
      if(isCandidate){
        nextInterop=GRAPH_INTEROP.createSession(parsed,C,manifests);
        site=nextInterop.workingSite;
      }else if(isHandoff){
        nextInterop=GRAPH_INTEROP.resumeSession(parsed,C,manifests);
        site=nextInterop.workingSite;
      }else site=C.validateSite(parsed,manifests);
      if(HOSTED){
        interopSession=nextInterop;interopStorageFailed=false;
        const imported=await window.Stage3Host?.importSite?.(site);
        if(!imported){interopSession=previousInterop;updateInteropUI();return;}
        if(!nextInterop)clearInteropSession();
        else persistInteropSession();
        return;
      }
      if(!confirm('Открыть импортированный сайт? Несохранённые изменения будут потеряны, текущие локальные версии сохранятся до следующего «Сохранить».'))return;
      session=D.begin(site,manifests);versions=[];
      pageId=site.pages[0].id;
      const chosen=site.pages[0].sections.find(s=>s.id==='df-selected-composition')||site.pages[0].sections[0];
      sectionId=chosen.id;elementId=chosen.elements[0].id;
      interopSession=nextInterop;interopStorageFailed=false;
      if(!interopSession)clearInteropSession();
      savedBytes='';draw();
      notice(nextInterop?
        'Design Factory candidate открыт как черновик. Исходник и CMS-правки разделены; для передачи используйте «Экспорт D7 handoff».':
        'Сайт импортирован как несохранённый черновик.');
    }catch(e){interopSession=previousInterop;notice('Импорт отклонён: '+e.message,true);updateInteropUI();}
  }
  window.addEventListener('beforeunload',e=>{
    if(JSON.stringify(session.current)!==savedBytes){e.preventDefault();e.returnValue='';}
  });
  $('undo').addEventListener('click',()=>{session=D.undo(session,manifests);draw();});
  $('redo').addEventListener('click',()=>{session=D.redo(session,manifests);draw();});
  $('save').addEventListener('click',save);
  $('export').addEventListener('click',exportJson);
  $('export-factory-handoff').addEventListener('click',exportFactoryHandoff);
  $('import').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';await importJson(file);});
  $('new-site').addEventListener('click',()=>{
    if(HOSTED)return window.Stage3Host?.newSite?.();
    if(!confirm('Открыть новый пример сайта без готового макета? Несохранённые изменения не сохранятся.'))return;
    const site=C.siteFromBrief({siteId:'site-no-mockup',title:'Сайт без макета'},manifests);
    session=D.begin(site,manifests);versions=[];clearInteropSession();
    pageId=site.pages[0].id;sectionId=site.pages[0].sections[0].id;elementId=site.pages[0].sections[0].elements[0].id;
    savedBytes='';draw();notice('Создан сайт без дизайн-ТЗ: все поля описаны в манифестах.');
  });
  $('reset').addEventListener('click',()=>{
    if(HOSTED)return window.Stage3Host?.reload?.();
    if(!confirm('Удалить ВСЕ локальные сохранения Stage 3 и восстановить исходный пример?'))return;
    try{localStorage.removeItem(STORAGE);versions=[];session=D.begin(starter,manifests);clearInteropSession();
      savedBytes=JSON.stringify(session.current);pageId=session.current.pages[0].id;
      sectionId=session.current.pages[0].sections[0].id;elementId=session.current.pages[0].sections[0].elements[0].id;
      draw();notice('Исходный пример восстановлен. Все его локальные версии очищены.');
    }catch(e){notice(e.message,true);}
  });
  document.querySelectorAll('.device').forEach(b=>b.addEventListener('click',()=>{
    breakpoint=b.dataset.bp;$('viewport').className='viewport '+breakpoint;
    drawFields();drawPreview();
    document.querySelectorAll('.device').forEach(n=>n.classList.toggle('active',n===b));
  }));
  window.Stage3Editor=Object.freeze({
    manifests:()=>cp(manifests),
    previewDocument:(site,path)=>{
      const checked=C.validateSite(site,manifests),prior=session;
      try{
        session=D.begin(checked,manifests);
        const page=checked.pages.find(p=>p.path===path)||checked.pages[0];
        const docs=page.sections.map(s=>screen(D.blockPreview(session,manifests,page.id,s.id,breakpoint)));
        const first=docs[0],start=first.indexOf('<body>')+6,end=first.lastIndexOf('</body>');
        const navPages=checked.pages.filter(p=>!p.navigation?.hidden);
        const links=parent=>navPages.filter(p=>(p.navigation?.parentId||'')===parent)
          .map(p=>'<li><a href="'+escapeHtml(p.path)+'"'+(p.path===page.path?' aria-current="page"':'')+'>'+
            escapeHtml(p.navigation?.label||p.title)+'</a>'+
            (parent===''?'<ul>'+links(p.id)+'</ul>':'')+'</li>').join('');
        const menu=checked.menu||C.DEFAULT_MENU;
        const buttonPage=checked.pages.find(p=>p.id===menu.ctaPageId);
        const cta=buttonPage?'<a class="cms-menu-cta" href="'+escapeHtml(buttonPage.path)+'">'+
          escapeHtml(menu.ctaLabel)+'</a>':'';
        const common='<ul class="cms-menu-links">'+links('')+'</ul>';
        const navigation='<style>.cms-menu-preview{padding:16px;background:var(--cms-surface);color:var(--cms-text);border-bottom:1px solid #dde6ed;display:flex;align-items:center;gap:20px;flex-wrap:wrap}.cms-menu-preview a{text-decoration:none;color:var(--cms-text)}.cms-menu-preview a[aria-current=page]{color:var(--cms-primary);font-weight:800}.cms-menu-links{display:flex;flex-wrap:wrap;list-style:none;gap:12px;padding:0;margin:0}.cms-menu-links ul{list-style:none;margin:0;padding:0 0 0 15px}.cms-menu-cta{margin-left:auto;padding:9px 14px;border-radius:var(--cms-button-radius);background:var(--cms-button-bg);color:var(--cms-button-color)!important;box-shadow:var(--cms-button-shadow)}.cms-menu-mobile{display:none}@media(max-width:640px){.cms-menu-preview .cms-menu-desktop{display:none}.cms-menu-mobile{display:block;width:100%}.cms-menu-mobile .cms-menu-links{display:block}.cms-menu-mobile summary{cursor:pointer}}</style>'+
          '<header class="cms-menu-preview"><strong>'+escapeHtml(checked.title)+'</strong>'+
          '<nav class="cms-menu-desktop" aria-label="Навигация">'+common+'</nav>'+cta+
          (menu.mobile==='expanded'?'<nav class="cms-menu-mobile">'+common+'</nav>':
            '<details class="cms-menu-mobile"><summary>Меню</summary><nav>'+common+'</nav></details>')+
          '</header>';
        const root=first.slice(0,start).replace('<html lang="ru">','<html lang="'+escapeHtml(checked.language||'ru')+'">');
        return root+navigation+docs.map((doc,i)=>'<div class="cms-preview-bound-section" data-cms-section-id="'+escapeHtml(page.sections[i].id)+'">'+doc.slice(doc.indexOf('<body>')+6,doc.lastIndexOf('</body>'))+'</div>').join('')+first.slice(end);
      }finally{session=prior;}
    },
    applyComposition:site=>{
      session=D.replaceSite(session,manifests,site,session.revision);draw();
    },
    openComposition:site=>{
      session=D.begin(site,manifests);versions=[];savedBytes='';
      pageId=site.pages[0].id;sectionId=site.pages[0].sections[0].id;elementId=site.pages[0].sections[0].elements[0].id;draw();
    },
    getSite:()=>cp(session.current),
    // Bind a server-issued immutable media ID using the same declared SDK field
    // and Undo/Redo transaction as editing an image in the Inspector.
    bindMedia:(assetId,selection=null)=>{
      if(!session.current.assets.some(a=>a.id===assetId))throw Error('Unknown site asset');
      const focus=selection||{pageId,sectionId,elementId};
      const page=session.current.pages.find(p=>p.id===focus.pageId);
      const section=page?.sections.find(s=>s.id===focus.sectionId);
      if(!section)throw Error('Selected section no longer exists');
      const element=[...section.elements,...(section.items||[])].find(e=>e.id===focus.elementId);
      const candidates=[...(element?[element]:[]),...section.elements,...(section.items||[])];
      const target=candidates.find(el=>C.controls(session.current,manifests,page.id,section.id,el.id)
        .some(f=>f.path==='content.media'&&f.type==='media'));
      if(!target)return false;
      session=D.edit(session,manifests,{pageId:page.id,sectionId:section.id,elementId:target.id,
        path:'content.media',value:assetId,expectedRevision:session.revision});
      pageId=page.id;sectionId=section.id;elementId=target.id;draw();
      return true;
    },
    assetAction:command=>{
      session=D.structure(session,manifests,{...command,expectedRevision:session.revision});
      draw();
      return cp(session.current.assets);
    },
    selection:()=>{
      const {page,section}=current();
      return {pageId:page.id,sectionId:section.id,elementId,component:section.component};
    },
    applySectionTemplate:section=>{
      const id=uniqueId('section');
      const page=current().page;
      structural({action:'applyTemplate',pageId:page.id,sectionId,id,template:section});
      const inserted=session.current.pages.find(p=>p.id===page.id)?.sections.find(t=>t.id===id);
      if(!inserted)throw Error('Шаблон не вставлен; проверьте сообщение редактора');
      sectionId=id;elementId=inserted.elements[0].id;draw();
      return id;
    },
    refreshPreview:()=>drawPreview(),
    isDirty:()=>JSON.stringify(session.current)!==savedBytes,
    replace:site=>{
      const checked=C.validateSite(site,manifests);
      session=D.begin(checked,manifests);versions=[];
      pageId=checked.pages[0].id;sectionId=checked.pages[0].sections[0].id;
      elementId=checked.pages[0].sections[0].elements[0].id;
      savedBytes=JSON.stringify(checked);draw();
    },
    fromBrief:(siteId,title)=>C.siteFromBrief({siteId,title},manifests)
  });
  initContentWorkbench();initSiteMap();createStructureTools();initSettings();initMenuEditor();initSiteQuality();initFullPagePreview();load();restoreInteropSession();draw();
})();