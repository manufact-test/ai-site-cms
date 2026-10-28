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
  // Media bytes from an approved folder exist before any server upload.
  // This resolver is scoped to previewDocument and never mutates site data.
  let previewAssetSources=null;
  function previewImageUrl(assetId){
    if(previewAssetSources!==null){
      const data=Object.prototype.hasOwnProperty.call(previewAssetSources,assetId)
        ?previewAssetSources[assetId]:null;
      return typeof data==='string'&&
        /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data)?data:null;
    }
    return HOSTED?window.Stage3Host?.previewUrl?.(assetId):null;
  }
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
  // Ephemeral selection handoff from the whole-page canvas to the nested graph
  // inspector. Never written into the draft, export or published site.
  let pendingGraphCanvasFocus=null;
  // One review surface for every authored site; analysis never changes documents.
  // Alias creation/deletion uses the same revisioned Undo/Redo contract as page edits.

  // One shared read-only launch inventory for offline Quality and hosted
  // Launch Review. It never inserts invented text or modifies site revisions.
  // Advisory gaps are distinct from contract/SEO/a11y errors.
  function launchReadiness(){
    const site=session.current,audit=C.inspectSite(site,manifests);
    const issues=[],seen=new Set(),placeholder=/^(?:расскажите|укажите|добавьте|заполните|опишите|замените|выберите|ваш текст|название услуги|пример текста|lorem ipsum)(?:\b|\s|[.:])/i;
    const add=(page,section,element,kind,message,path='',level='attention')=>{
      const item={pageId:page.id,sectionId:section?.id||null,elementId:element?.id||null,
        kind,message,path,level};
      const key=[item.pageId,item.sectionId,item.elementId,kind,path].join('|');
      if(!seen.has(key)){seen.add(key);issues.push(item);}
    };
    for(const page of site.pages){
      if(!String(page.seo?.title||'').trim())
        add(page,null,null,'seo','Заполните SEO title этой страницы.','seo.title');
      if(!String(page.seo?.description||'').trim())
        add(page,null,null,'seo','Добавьте собственное SEO-описание страницы.','seo.description');
      for(const section of page.sections){
        // The legacy section data remains stored for safe rollback but is
        // intentionally hidden while its Design Graph is the public output.
        if(!section.designGraph)for(const element of [...section.elements,...(section.items||[])]){
          // Resolve declared fields directly: C.controls() revalidates the
          // entire site on every call, which is quadratic for large sites.
          const component=manifests.find(m=>m.id===section.component&&m.version===section.manifestVersion);
          const definition=element.slot?
            component?.elements.find(item=>item.slot===element.slot):component?.repeat;
          for(const declared of definition?.fields||[]){
            const field={...declared,value:element.values[declared.path]};
            if(field.type==='media'&&!String(field.value||'').trim())
              add(page,section,element,'media','Не выбрано изображение: '+field.label,field.path);
            if(field.type==='text'&&field.path.startsWith('content.')){
              const value=String(field.value||'').trim();
              if(!value)
                add(page,section,element,'text','Пустое поле: '+field.label,field.path);
              else if(placeholder.test(value))
                add(page,section,element,'placeholder','Проверьте шаблонный текст: '+field.label,field.path);
            }
          }
        }
        if(section.designGraph){
          const visit=nodes=>{
            for(const node of nodes){
              if(['heading','text','button','link','quote','table-cell','table','gallery','list-item','disclosure','tab'].includes(node.type)){
                const value=String(node.text||'').trim();
                if(!value)add(page,section,{id:node.id},'graph-text',
                  'Пустой видимый текст композиции: '+node.type,'text');
                else if(placeholder.test(value)||
                  /^(?:ваш уникальный заголовок|новый элемент|новый текст|все элементы, сетки, отступы)/i.test(value))
                  add(page,section,{id:node.id},'graph-placeholder',
                    'Шаблонный текст композиции: '+node.type,'text');
              }
              if(node.children)visit(node.children);
            }
          };
          visit(section.designGraph.nodes);
        }
        if(section.component==='lead-form-flex'&&!section.designGraph){
          for(const field of section.formFields||[]){
            if(!String(field.label||'').trim())
              add(page,section,section.elements[0],'form','У вопроса формы отсутствует подпись.');
            if(['select','radio'].includes(field.kind)&&!(field.options||[]).length)
              add(page,section,section.elements[0],'form','В форме не указаны варианты ответа.');
          }
        }
      }
    }
    return {pages:site.pages.map(p=>({id:p.id,title:p.title,path:p.path})),
      issues,audit,attention:issues.length,errors:audit.errors.length,warnings:audit.warnings.length};
  }
  function focusLaunchIssue(issue){
    const page=session.current.pages.find(p=>p.id===issue?.pageId);
    if(!page)return false;
    const section=page.sections.find(s=>s.id===issue.sectionId)||page.sections[0];
    const element=[...section.elements,...(section.items||[])].find(e=>e.id===issue.elementId)||section.elements[0];
    pageId=page.id;sectionId=section.id;elementId=element.id;draw();
    if((issue.nodeId||(section.designGraph&&
        ['graph-text','graph-placeholder'].includes(issue.kind)))&&section.designGraph){
      pendingGraphCanvasFocus={pageId:page.id,sectionId:section.id,
        nodeId:issue.nodeId||issue.elementId,device:'desktop'};
      $('section-design-graph')?.click();return true;
    }
    if(issue.kind==='seo'){$('cms-open-seo')?.click();return true;}
    if(issue.kind==='form'){$('cms-form-builder-open')?.click();return true;}
    const field=[...$('fields').querySelectorAll('[data-field]')]
      .find(n=>n.dataset.field===issue.path);
    if(field){field.focus();field.scrollIntoView({block:'center',behavior:'instant'});}
    return true;
  }


  // Site-wide link/media repairs live inside the existing Quality surface.
  // Every proposal is explicit; the site is validated and previewed before
  // a single undoable SDK transaction. No upload, deletion or publication.
  function createSiteLinkMediaRepair(dialog,rerunAudit){
    const panel=document.createElement('section');
    panel.className='cms-quality-repairs';panel.id='cms-site-repairs';
    const title=document.createElement('h3');title.textContent='Ссылки и медиа всего сайта';
    const description=document.createElement('p');
    description.textContent='Исправьте устаревшие и битые внутренние ссылки, заполните пустые медиаполя или переназначьте изображения. Выбирайте изменения вручную; сначала предпросмотр, потом одно Undo. Внешние адреса не затрагиваются. Поддерживаются также кнопки, изображения, видео и постеры Design Graph.';
    const filters=document.createElement('div');filters.className='cms-repair-filters';
    const pageFilter=document.createElement('select');pageFilter.id='cms-repair-page';pageFilter.className='control';
    pageFilter.setAttribute('aria-label','Страница для исправлений');
    const mode=document.createElement('select');mode.id='cms-repair-mode';mode.className='control';
    mode.setAttribute('aria-label','Фильтр привязок');
    for(const [value,label] of [['issues','Требуют внимания'],['all','Все ссылки и медиа'],['links','Все внутренние ссылки'],['media','Все медиаполя']]){
      const option=document.createElement('option');option.value=value;option.textContent=label;mode.append(option);
    }
    filters.append(pageFilter,mode);
    const summary=document.createElement('p');summary.id='cms-repair-summary';
    const list=document.createElement('div');list.id='cms-repair-list';
    const previewOutput=document.createElement('p');previewOutput.id='cms-repair-preview';
    previewOutput.setAttribute('role','status');
    const buttons=document.createElement('div');buttons.className='cms-settings-actions';
    const preview=button('Предпросмотр изменений','btn small',()=>prepare());
    preview.id='cms-repair-check';
    const apply=button('Применить выбранное','btn primary',()=>commit());
    apply.id='cms-repair-apply';apply.dataset.editorWrite='true';apply.disabled=true;
    buttons.append(preview,apply);
    panel.append(title,description,filters,summary,list,previewOutput,buttons);
    let entries=[],prepared=null;
    const writable=()=>!HOSTED||window.Stage3Host?.canEditStudio?.();
    const invalidate=()=>{
      prepared=null;apply.disabled=true;
      const choices=entries.filter(item=>item.checked.checked&&item.target.value!==item.value);
      preview.disabled=!writable()||!choices.length;
      previewOutput.textContent=choices.length?
        choices.length+' выбранных замен. Нажмите «Предпросмотр изменений» для проверки полного черновика.':
        'Отметьте привязки и выберите новые значения. Ничего не изменено.';
    };
    const makeOption=(select,value,label)=>{
      const option=document.createElement('option');
      option.value=value;option.textContent=label;select.append(option);
    };
    const collect=()=>{
      const site=session.current,diagnostics=C.inspectSite(site,manifests);
      const linkFindings=[...diagnostics.errors,...diagnostics.warnings]
        .filter(item=>['broken-link','old-link','broken-anchor'].includes(item.kind));
      const rows=[],referenced=new Set();
      for(const page of site.pages){
        if(page.seo?.ogImage)referenced.add(page.seo.ogImage);
        for(const section of page.sections){
          if(section.designGraph){
            const traverse=nodes=>{
              for(const node of nodes){
                const common={pageId:page.id,pageTitle:page.title,sectionId:section.id,
                  nodeId:node.id,elementId:null,graph:true};
                if(['button','link','image'].includes(node.type)&&node.href?.startsWith('/')&&!node.href.startsWith('//')){
                  const issue=linkFindings.find(item=>item.pageId===page.id&&
                    item.sectionId===section.id&&item.nodeId===node.id&&item.path===node.href);
                  rows.push({...common,path:'href',fieldLabel:(node.type==='image'?'Изображение по клику':node.type==='link'?'Ссылка':'Кнопка')+' · '+node.id,
                    kind:'link',value:node.href,issue:issue?.kind||'',
                    message:issue?.message||''});
                }
                if(node.backgroundMedia){
                  for(const id of [node.backgroundMedia.assetId,node.backgroundMedia.tabletAssetId,node.backgroundMedia.mobileAssetId])if(id)referenced.add(id);
                }
                if(node.backgroundVideo){
                  for(const id of [node.backgroundVideo.assetId,node.backgroundVideo.posterAssetId,
                    node.backgroundVideo.tabletPosterAssetId,node.backgroundVideo.mobilePosterAssetId])
                    if(id)referenced.add(id);
                }
                if(node.type==='image'&&node.responsiveMedia){
                  for(const id of [node.responsiveMedia.tabletAssetId,node.responsiveMedia.mobileAssetId])if(id)referenced.add(id);
                }
                if(['image','video'].includes(node.type)){
                  referenced.add(node.assetId);
                  rows.push({...common,path:'assetId',fieldLabel:
                    (node.type==='video'?'Видео':'Изображение')+' · '+node.id,
                    kind:'media',mediaKind:node.type,value:node.assetId,issue:'',message:''});
                  if(node.type==='video'){
                    if(node.posterAssetId)referenced.add(node.posterAssetId);
                    rows.push({...common,path:'posterAssetId',fieldLabel:'Постер видео · '+node.id,
                      kind:'media',mediaKind:'poster',value:node.posterAssetId||'',issue:'',
                      message:node.posterAssetId?'':'Постер не выбран (необязательно)'});
                  }
                }
                if(node.children)traverse(node.children);
              }
            };
            traverse(section.designGraph.nodes);
            continue; // Hidden legacy component fields are not public output.
          }
          const spec=manifests.find(m=>m.id===section.component&&m.version===section.manifestVersion);
          for(const element of [...section.elements,...(section.items||[])]){
            const part=element.slot?spec?.elements.find(item=>item.slot===element.slot):spec?.repeat;
            for(const field of part?.fields||[]){
              const value=element.values[field.path];
              if(field.type==='media'&&value)referenced.add(value);
              if(!['media','url'].includes(field.type))continue;
              if(field.type==='url'&&(!String(value).startsWith('/')||String(value).startsWith('//')))continue;
              const issue=field.type==='url'?linkFindings.find(item=>
                item.pageId===page.id&&item.sectionId===section.id&&
                item.elementId===element.id&&item.path===value):null;
              rows.push({pageId:page.id,pageTitle:page.title,sectionId:section.id,
                elementId:element.id,path:field.path,fieldLabel:field.label,
                kind:field.type==='url'?'link':'media',value,issue:issue?.kind||'',
                message:issue?.message||(field.type==='media'&&!value?'Изображение не выбрано':'')});
            }
          }
        }
      }
      return {rows,unused:site.assets.filter(asset=>!referenced.has(asset.id)),
        links:rows.filter(item=>item.kind==='link').length,
        media:rows.filter(item=>item.kind==='media').length};
    };
    const redraw=()=>{
      prepared=null;entries=[];list.replaceChildren();
      pageFilter.replaceChildren();makeOption(pageFilter,'','Все страницы');
      for(const page of session.current.pages)makeOption(pageFilter,page.id,page.title+' · '+page.path);
      if(!pageFilter.dataset.chosen||!session.current.pages.some(p=>p.id===pageFilter.dataset.chosen))
        pageFilter.dataset.chosen='';
      pageFilter.value=pageFilter.dataset.chosen;
      const all=collect(),filtered=all.rows.filter(item=>
        (!pageFilter.value||item.pageId===pageFilter.value)&&
        (mode.value==='all'||mode.value==='links'&&item.kind==='link'||
        mode.value==='media'&&item.kind==='media'||
        mode.value==='issues'&&Boolean(item.issue||item.kind==='media'&&!item.value)));
      summary.textContent=all.links+' внутренних ссылок · '+all.media+
        ' медиаполей · '+all.unused.length+' неиспользуемых медиа (не удаляются) · '+
        filtered.length+' в текущем фильтре';
      for(const item of filtered.slice(0,150)){
        const line=document.createElement('div');line.className='cms-repair-row';
        const checked=document.createElement('input');checked.type='checkbox';
        checked.setAttribute('aria-label','Выбрать '+item.fieldLabel+' — '+item.pageTitle);
        const caption=document.createElement('div');caption.className='cms-repair-label';
        const head=document.createElement('strong');head.textContent=item.pageTitle+' · '+item.fieldLabel;
        const detail=document.createElement('small');
        detail.textContent=(item.kind==='link'?'Ссылка: ':'Медиа: ')+(item.value||'не выбрано')+
          (item.message?' · '+item.message:' · привязка работает');
        caption.append(head,detail);
        const target=document.createElement('select');target.className='control';
        target.setAttribute('aria-label','Новое значение для '+item.fieldLabel+' — '+item.pageTitle);
        if(item.kind==='link'){
          for(const page of session.current.pages)
            makeOption(target,page.path,page.title+' · '+page.path);
          target.value=(session.current.redirects||[]).find(r=>r.from===item.value)?.to||
            (session.current.pages.some(page=>page.path===item.value)?item.value:session.current.pages[0].path);
        }else{
          if(!item.graph||item.mediaKind==='poster')makeOption(target,'','Без изображения');
          for(const asset of session.current.assets)
            if((item.mediaKind==='video')===(asset.mime==='video/mp4')&&
              (item.mediaKind==='video'||asset.mime!=='video/mp4'))
              makeOption(target,asset.id,(asset.alt||asset.id)+' · '+asset.mime);
          target.value=item.value||'';
        }
        const jump=button('Открыть','btn small',()=>{
          dialog.close();focusLaunchIssue({...item,kind:item.kind,path:item.path});
        });
        checked.disabled=target.disabled=!writable();
        checked.addEventListener('change',invalidate);target.addEventListener('change',invalidate);
        line.append(checked,caption,target,jump);list.append(line);
        entries.push({...item,checked,target});
      }
      if(filtered.length>150){
        const remainder=document.createElement('p');
        remainder.textContent='Показаны первые 150. Уточните страницу или фильтр для остальных '+(filtered.length-150)+'.';
        list.append(remainder);
      }
      if(!filtered.length)list.textContent='Совпадений нет. Настроенные поля остаются без изменений.';
      previewOutput.textContent='Изменения не подготовлены.';
      invalidate();
    };
    const makeCandidate=()=>{
      const chosen=entries.filter(item=>item.checked.checked&&item.target.value!==item.value);
      if(!chosen.length)throw Error('Не выбраны изменения');
      const candidate=cp(session.current);
      const changes=[];
      for(const row of chosen){
        const page=candidate.pages.find(page=>page.id===row.pageId);
        const section=page?.sections.find(section=>section.id===row.sectionId);
        if(!section)throw Error('Блок удалён. Обновите список.');
        const to=row.target.value;
        if(row.kind==='link'&&!candidate.pages.some(page=>page.path===to))
          throw Error('Целевая страница отсутствует');
        if(row.kind==='media'){
          const asset=candidate.assets.find(asset=>asset.id===to);
          if(row.graph&&row.mediaKind!=='poster'&&!to)
            throw Error('Для графового изображения или видео обязателен медиафайл');
          if(to&&(!asset||(row.mediaKind==='video')!==(asset.mime==='video/mp4')))
            throw Error('Новый медиафайл отсутствует или не соответствует типу');
        }
        let element;
        if(row.graph){
          if(!section.designGraph)throw Error('Дизайн-композиция больше не существует');
          const find=nodes=>{
            for(const node of nodes){
              if(node.id===row.nodeId)return node;
              if(node.children){const hit=find(node.children);if(hit)return hit;}
            }
            return null;
          };
          element=find(section.designGraph.nodes);
          if(!element||((row.kind==='link'&&element.type!=='button')||
              (row.mediaKind==='video'&&element.type!=='video')||
              (row.mediaKind==='poster'&&element.type!=='video')||
              (row.mediaKind==='image'&&element.type!=='image')))
            throw Error('Графовый узел изменился. Обновите список.');
          if((element[row.path]||'')!==row.value)
            throw Error('Узел изменился с момента выбора.');
          if(to)element[row.path]=to;else delete element[row.path];
        }else{
          element=[...section.elements,...(section.items||[])].find(item=>item.id===row.elementId);
          if(!element||element.values[row.path]!==row.value)
            throw Error('Поле изменилось с момента выбора. Обновите список.');
          element.values[row.path]=to;
        }
        changes.push({pageId:page.id,sectionId:section.id,elementId:row.elementId,
          nodeId:row.nodeId||null,kind:row.kind,path:row.path,from:row.value,to});
      }
      C.validateSite(candidate,manifests);
      return {candidate,changes};
    };
    function prepare(){
      try{
        if(!writable())throw Error('Нет права на изменение черновика');
        const source=JSON.stringify(session.current);
        const next=makeCandidate();
        const before=C.inspectSite(session.current,manifests);
        const after=C.inspectSite(next.candidate,manifests);
        prepared={...next,source};
        apply.disabled=false;
        previewOutput.textContent='Предпросмотр: '+next.changes.length+
          ' привязок · ошибок ссылок/SEO до: '+before.errors.length+
          ', после: '+after.errors.length+
          ' · рекомендаций до: '+before.warnings.length+
          ', после: '+after.warnings.length+
          '. Применение изменит только выбранные поля, один Undo. Save/Publish отдельно.';
      }catch(error){invalidate();notice('Предпросмотр отклонён: '+error.message,true);}
    }
    function commit(){
      try{
        if(!prepared||!writable())throw Error('Сначала подтвердите предпросмотр');
        if(JSON.stringify(session.current)!==prepared.source)
          throw Error('Черновик изменился. Выполните предпросмотр ещё раз.');
        const count=prepared.changes.length;
        session=D.replaceSite(session,manifests,prepared.candidate,session.revision);
        prepared=null;draw();rerunAudit();
        notice('Применено '+count+' привязок в черновике одной операцией Undo. Save и Publish отдельно.');
      }catch(error){invalidate();notice('Массовая правка не применена: '+error.message,true);}
    }
    pageFilter.addEventListener('change',()=>{pageFilter.dataset.chosen=pageFilter.value;redraw();});
    mode.addEventListener('change',redraw);
    dialog.append(panel);
    return redraw;
  }

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
    dialog.append(heading,summary,findings,subtitle,aliases,form,notes,safeTitles);
    const redrawRepairs=createSiteLinkMediaRepair(dialog,()=>print());
    dialog.append(close);
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
      redrawRepairs();
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
      if(!HOSTED){frame.srcdoc=window.Stage3Editor.previewDocument(session.current,path,mode);return;}
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
    const workHint=document.createElement('small');workHint.id='cms-work-hint';workHint.textContent='Нажмите на текст или карточку, чтобы выбрать точное поле. Двойной клик по тексту — быстрое изменение.';
    const workSectionPicker=document.createElement('select');workSectionPicker.id='cms-work-section';workSectionPicker.className='control';
    const workElementPicker=document.createElement('select');workElementPicker.id='cms-work-element';workElementPicker.className='control';
    const workActions=document.createElement('div');workActions.className='cms-work-actions';
    const workFields=document.createElement('div');workFields.id='cms-work-fields';
    const workAdd=document.createElement('div');workAdd.className='cms-work-add';
    const workStatus=document.createElement('small');workStatus.id='cms-work-status';workStatus.setAttribute('role','status');
    const workError=document.createElement('small');workError.id='cms-work-error';workError.setAttribute('role','alert');
    workPanel.append(workTitle,workHint,workSectionPicker,workActions,workElementPicker,workFields,workAdd,workStatus,workError);
    layout.append(area,workPanel);modal.append(header,note,layout);document.body.append(modal);

    // Selected page persists independently of main inspector focus.
    // The preview itself remains script-free; parent only reads first-party IDs.
    // Select sections only in the validated, scriptless page preview.
    // Every edit uses the same SDK draft history as the right-side inspector.
    let workSection='',workElement='',workFocusPath='',workFormField='',workGraphNode='';
    const graphNodes=section=>{
      const rows=[];
      const walk=(nodes,depth)=>{
        for(const node of nodes||[]){
          rows.push({node,depth});
          if(['container','disclosure','tabs','tab','list','gallery','table','table-row','popup'].includes(node.type))walk(node.children,depth+1);
        }
      };
      if(section?.designGraph)walk(section.designGraph.nodes,0);
      return rows;
    };
    const selectedGraphNode=()=>graphNodes(sectionForWork())
      .find(x=>x.node.id===workGraphNode)?.node||null;
    const canWrite=()=>!HOSTED||!!window.Stage3Host?.canEditStudio?.();
    const pageForWork=()=>session.current.pages.find(p=>p.path===pathSelect.value);
    const sectionForWork=()=>pageForWork()?.sections.find(s=>s.id===workSection);
    const feedback=(s,bad=false)=>{workError.textContent=bad?s:'';workStatus.textContent=bad?'Не применено':s;};
    const workButton=(label,fn)=>{const b=button(label,'btn small',fn);b.dataset.editorWrite='true';return b;};
    function highlightWork(){
      const doc=frame.contentDocument;if(!doc)return;
      for(const el of doc.querySelectorAll('.cms-work-target'))
        el.classList.toggle('cms-work-current',(el.dataset.cmsSectionId||el.id)===workSection);
      for(const el of doc.querySelectorAll('[data-cms-work-element]')){
        const element=el.dataset.cmsWorkElement===workElement;
        el.classList.toggle('cms-work-element-current',element&&
          (el.dataset.cmsWorkPath||'')===workFocusPath);
      }
      for(const el of doc.querySelectorAll('[data-cms-work-form-field]'))
        el.classList.toggle('cms-work-form-current',!!workFormField&&
          el.dataset.cmsWorkFormField===workFormField);
      for(const el of doc.querySelectorAll('[data-cms-work-graph-node]'))
        el.classList.toggle('cms-work-graph-current',!!workGraphNode&&
          el.dataset.cmsWorkGraphNode===workGraphNode);
    }
    const quick=document.createElement('div');quick.className='cms-work-quick';quick.hidden=true;
    quick.id='cms-work-quick';quick.setAttribute('role','group');
    const quickLabel=document.createElement('label');quickLabel.textContent='Изменить текст на странице';
    const quickInput=document.createElement('textarea');quickInput.id='cms-work-quick-input';
    quickInput.className='control';quickInput.rows=3;quickLabel.append(quickInput);
    const quickButtons=document.createElement('div');quickButtons.className='cms-work-quick-actions';
    const dismissQuick=()=>{quick.hidden=true;};
    const quickCancel=button('Отмена','btn small',dismissQuick);
    const quickSave=button('Применить','btn small primary',()=>{
      const node=selectedGraphNode();
      if(node&&['heading','text','button','link','quote','table-cell','list-item','disclosure','tab'].includes(node.type)){
        if(!canWrite())return feedback('Нет права на редактирование.',true);
        if(editGraphWork(n=>{n.text=quickInput.value;}))dismissQuick();
        return;
      }
      const page=pageForWork(),section=sectionForWork();
      const field=page&&section?C.controls(session.current,manifests,page.id,section.id,workElement)
        .find(f=>f.path===workFocusPath&&f.type==='text'):null;
      if(!field||!canWrite())return feedback('Текст не доступен для изменения.',true);
      editWork(field,quickInput);dismissQuick();
    });
    quickSave.id='cms-work-quick-save';
    quickButtons.append(quickSave,quickCancel);quick.append(quickLabel,quickButtons);area.append(quick);
    quickInput.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();dismissQuick();}
      if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();quickSave.click();}
    });
    const quickEdit=()=>{
      if(!canWrite())return;
      const graph=selectedGraphNode();
      if(graph&&['heading','text','button','link','quote','table-cell','list-item','disclosure','tab'].includes(graph.type)){
        quickLabel.firstChild.textContent='Текст узла: '+graph.type;
        quickInput.value=graph.text;
        quickInput.maxLength=graph.type==='table-cell'?1600:['tab','disclosure'].includes(graph.type)?160:3000;
        quick.hidden=false;quickInput.focus();quickInput.select();
        return;
      }
      if(!workFocusPath)return;
      const page=pageForWork(),section=sectionForWork();
      if(!page||!section)return;
      const field=C.controls(session.current,manifests,page.id,section.id,workElement)
        .find(f=>f.path===workFocusPath&&f.type==='text');
      if(!field)return;
      quickLabel.firstChild.textContent='Изменить: '+field.label;
      quickInput.value=safeText(field.responsive?C.effectiveValue(field.value,mode):field.value);
      quickInput.maxLength=field.maxLength||10000;
      quick.hidden=false;quickInput.focus();quickInput.select();
    };
    frame.addEventListener('load',()=>{
      const doc=frame.contentDocument,page=pageForWork();if(!doc||!page)return;
      const ids=new Set(page.sections.map(s=>s.id));
      const css=doc.createElement('style');
      css.textContent='.cms-work-target:hover{outline:2px dashed #20b0dc!important;cursor:grab}.cms-work-current{outline:3px solid #ff9b37!important;outline-offset:-3px!important}.cms-work-before{box-shadow:inset 0 6px #20b0dc!important}.cms-work-after{box-shadow:inset 0 -6px #20b0dc!important}.cms-work-element-current{outline:2px solid #ffab58!important;outline-offset:3px!important}.cms-work-linked{cursor:text!important}.cms-work-linked:hover{box-shadow:inset 0 -2px #20b0dc}.cms-work-graph-target:hover{outline:2px dashed #3278ef!important;outline-offset:3px!important}.cms-work-graph-current{outline:3px solid #f4a341!important;outline-offset:4px!important}';
      doc.head.append(css);
      const idOf=el=>el?.dataset?.cmsSectionId||el?.id||'';
      const getTarget=event=>{
        const target=event.target;
        if(!(target instanceof doc.defaultView.Element))return null;
        let el=target.closest('[data-cms-section-id],section[id]');
        // Content switchers may contain nested panels with their own section IDs.
        while(el&&!ids.has(idOf(el)))el=el.parentElement?.closest('[data-cms-section-id],section[id]');
        return el&&ids.has(idOf(el))?el:null;
      };
      const sections=[...doc.querySelectorAll('[data-cms-section-id],section[id]')];
      for(const el of sections){
        if(!ids.has(idOf(el)))continue;
        el.classList.add('cms-work-target');
        // Dragging and field selection are owned by the parent, never srcdoc scripts.
        el.draggable=canWrite();
      }

      // Bind rendered first-party text/card nodes back to the validated manifest.
      // No guesses about generated HTML IDs and no mutations to published markup.
      const repeatSelectors={
        'service-grid':'.repeat-grid > article,.cms-preview-grid > article',
        'pricing-plans':'.cms-pricing-grid > article',
        'process-timeline':'.cms-process-list > li',
        'comparison-matrix':'tbody > tr',
        'content-switcher':'.cms-switcher-tab',
        'faq-accordion':'details',
        'testimonials':'.repeat-grid > figure,.cms-preview-grid > blockquote',
        'photo-gallery':'.gallery-grid > figure,.cms-preview-grid > figure',
        'adaptive-gallery':'.cms-adaptive-gallery > figure',
        'partner-logos':'.partner-grid > a,.cms-preview-grid > div.card'
      };
      const textSelector='h1,h2,h3,h4,p,small,span,strong,summary,figcaption,blockquote,button,a,label,legend,th,td,caption,article';
      const norm=value=>String(value??'').replace(/\s+/g,' ').trim();
      const bindText=(container,entity,section,used)=>{
        const candidates=[...container.querySelectorAll(textSelector)];
        for(const field of C.controls(session.current,manifests,page.id,section.id,entity.id)){
          if(field.type!=='text'||!field.path.startsWith('content.'))continue;
          const value=norm(field.responsive?C.effectiveValue(field.value,mode):field.value);
          if(!value)continue;
          const exact=candidates.find(el=>!used.has(el)&&norm(el.textContent)===value);
          const arrow=candidates.find(el=>!used.has(el)&&
            /^(A|BUTTON|SPAN)$/.test(el.tagName)&&norm(el.textContent).startsWith(value)&&
            /^[\s↗→›]+$/.test(norm(el.textContent).slice(value.length)));
          const target=exact||arrow;if(!target)continue;
          used.add(target);
          target.dataset.cmsWorkElement=entity.id;
          target.dataset.cmsWorkPath=field.path;
          target.classList.add('cms-work-linked');
        }
      };

      const bindMedia=(container,entity,section)=>{
        const field=C.controls(session.current,manifests,page.id,section.id,entity.id)
          .find(f=>f.path==='content.media'&&f.type==='media');
        if(!field)return;
        const target=container.matches('img,.media-placeholder')?container:
          container.querySelector('img,.media-placeholder');
        if(!target)return;
        target.dataset.cmsWorkElement=entity.id;
        target.dataset.cmsWorkPath='content.media';
        target.classList.add('cms-work-linked','cms-work-linked-media');
      };
      for(const section of page.sections){
        const host=sections.find(el=>idOf(el)===section.id);
        if(!host)continue;
        if(section.designGraph){
          // The same safe node classes are emitted by PHP and offline Graph
          // renderers. Only bind IDs present in the validated document.
          for(const {node} of graphNodes(section)){
            const visual=host.querySelector('.cmsdg-n-'+node.id);
            if(visual){
              visual.dataset.cmsWorkGraphNode=node.id;
              visual.classList.add('cms-work-graph-target');
            }
          }
          continue;
        }
        const used=new Set();
        const repeatNodes=section.items&&repeatSelectors[section.component]?
          [...host.querySelectorAll(repeatSelectors[section.component])]:[];
        for(const [index,card] of repeatNodes.entries()){
          let item=section.items[index];
          // Media-only galleries may omit unbound assets from PHP output.
          if(['partner-logos','photo-gallery','adaptive-gallery'].includes(section.component)){
            item=section.items.find(x=>!repeatNodes.some((node,k)=>k<index&&
              node.dataset.cmsWorkElement===x.id)&&
              (norm(x.values['content.caption'])&&norm(card.textContent)
                .includes(norm(x.values['content.caption']))))||item;
          }
          if(!item)continue;
          card.dataset.cmsWorkElement=item.id;
          bindText(card,item,section,used);
          bindMedia(card,item,section);
        }
        for(const entity of section.elements){
          bindText(host,entity,section,used);
          bindMedia(host,entity,section);
        }
        // An extra question uses its published input name as a stable
        // association; its configuration remains edited by the form builder.
        if(section.component==='lead-form-flex'){
          for(const row of host.querySelectorAll('.lead-field')){
            const input=row.querySelector('input[name],select[name],textarea[name]');
            const name=input?.getAttribute('name');
            if(!name)continue;
            const custom=(section.formFields||[]).find(x=>x.id===name);
            if(custom){
              row.dataset.cmsWorkFormField=custom.id;
              row.classList.add('cms-work-linked-form');
            }else{
              const match=/^extra([123])$/.exec(name);
              if(!match)continue;
              const slot=['extra-one','extra-two','extra-three'][Number(match[1])-1];
              const entity=section.elements.find(x=>x.slot===slot);
              if(!entity)continue;
              row.dataset.cmsWorkElement=entity.id;
              row.dataset.cmsWorkPath='content.text';
              row.classList.add('cms-work-linked-form');
            }
          }
          // Offline preview intentionally displays inert extra-field examples
          // rather than a functional visitor form. Match validated labels only.
          for(const field of section.formFields||[]){
            if(host.querySelector('[data-cms-work-form-field="'+field.id+'"]'))continue;
            const label=[...host.querySelectorAll('label')].find(el=>norm(el.textContent)===
              norm(field.label)+(field.required?' *':''));
            if(label){label.dataset.cmsWorkFormField=field.id;label.classList.add('cms-work-linked-form');}
          }
        }
      }
      const clickedField=e=>{
        const target=e.target;
        return target instanceof doc.defaultView.Element?
          target.closest('[data-cms-work-element]'):null;
      };
      const selectVisual=e=>{
        const el=getTarget(e);if(!el)return false;
        const field=clickedField(e),section=page.sections.find(s=>s.id===idOf(el));
        const custom=e.target instanceof doc.defaultView.Element?
          e.target.closest('[data-cms-work-form-field]'):null;
        const graphTarget=e.target instanceof doc.defaultView.Element?
          e.target.closest('[data-cms-work-graph-node]'):null;
        workSection=section.id;
        workGraphNode=section.designGraph&&graphNodes(section).some(row=>
          row.node.id===graphTarget?.dataset.cmsWorkGraphNode)?
          graphTarget.dataset.cmsWorkGraphNode:'';
        workFormField=section.component==='lead-form-flex'&&
          section.formFields?.some(x=>x.id===custom?.dataset.cmsWorkFormField)?
          custom.dataset.cmsWorkFormField:'';
        const known=[...section.elements,...(section.items||[])];
        workElement=known.some(x=>x.id===field?.dataset.cmsWorkElement)?
          field.dataset.cmsWorkElement:'';
        workFocusPath=workElement?(field.dataset.cmsWorkPath||''):'';
        dismissQuick();showWork();highlightWork();
        if(workFocusPath){
          const control=[...workFields.querySelectorAll('[data-page-field]')]
            .find(node=>node.dataset.pageField===workFocusPath);
          control?.scrollIntoView({block:'nearest'});
        }
        return true;
      };
      doc.addEventListener('click',e=>{
        // CSS-only form choices remain interactive in sandboxed preview.
        // Navigation and submissions are still denied by sandbox + CSP.
        const target=e.target;
        const formChoice=target instanceof doc.defaultView.Element&&
          !!target.closest('form.lead-form input,form.lead-form select,form.lead-form textarea,form.lead-form label');
        if(!formChoice)e.preventDefault();
        e.stopPropagation();selectVisual(e);
      },true);
      doc.addEventListener('dblclick',e=>{
        e.preventDefault();e.stopPropagation();
        if(selectVisual(e))quickEdit();
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
        workElement='';workFocusPath='';workFormField='';workGraphNode='';dismissQuick();draw();showWork();render();
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

    // Graph mutations are applied only against a cloned, validated site. An
    // invalid style, unsafe href or missing media ID does not touch the draft.
    // Each successful change is one atomic Undo/Redo entry.
    function mutateGraphWork(mutate){
      if(!canWrite())return feedback('Нет права на редактирование.',true),false;
      const page=pageForWork(),section=sectionForWork();
      if(!page||!section?.designGraph||!selectedGraphNode())return false;
      try{
        const site=cp(session.current);
        const edited=site.pages.find(p=>p.id===page.id).sections.find(s=>s.id===section.id);
        const find=(nodes)=>{
          for(const node of nodes){
            if(node.id===workGraphNode)return node;
            if(node.children){const hit=find(node.children);if(hit)return hit;}
          }
          return null;
        };
        const node=find(edited.designGraph.nodes);
        if(!node)throw Error('Узел композиции больше не существует');
        mutate({node,site,section:edited});
        const checked=C.validateSite(site,manifests);
        // Native input change + blur can fire twice. Do not record duplicate
        // revisions: a single visible edit must always need only one Undo.
        if(JSON.stringify(checked)===JSON.stringify(session.current))return true;
        session=D.replaceSite(session,manifests,checked,session.revision);
        draw();showWork();render();
        feedback('Узел композиции обновлён в черновике. Undo доступен.');
        return true;
      }catch(error){
        feedback('Узел не изменён: '+error.message,true);
        showWork();
        return false;
      }
    }
    function editGraphWork(mutate){
      return mutateGraphWork(({node,site})=>mutate(node,site));
    }
    function editGraphTreeWork(operation,nextNodeId=''){
      return mutateGraphWork(({section})=>{
        section.designGraph=DESIGN_GRAPH.editTree(section.designGraph,operation);
        workGraphNode=nextNodeId;
      });
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
      const controls=C.controls(session.current,manifests,page.id,section.id,workElement);
      if(!controls.some(f=>f.path===workFocusPath))workFocusPath='';
      if(!section.formFields?.some(f=>f.id===workFormField))workFormField='';
      for(const f of controls){
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
        line.classList.toggle('cms-work-field-current',f.path===workFocusPath);
        line.append(caption,control);workFields.append(line);

        if(f.type==='media'){
          const picker=document.createElement('details');picker.className='cms-work-media';picker.id='cms-work-media';
          const summary=document.createElement('summary');summary.textContent='Выбрать изображение · '+session.current.assets.filter(a=>a.mime.startsWith('image/')).length;
          picker.append(summary);
          const grid=document.createElement('div');grid.className='cms-work-media-grid';
          const allowed=session.current.assets.filter(asset=>asset.mime.startsWith('image/'));
          const mediaChoice=(id,name,src,selected)=>{
            const btn=workButton(name,()=>{if(canWrite())editWork(f,{value:id});});
            btn.classList.add('cms-work-media-choice');btn.dataset.mediaId=id;
            btn.setAttribute('aria-pressed',selected?'true':'false');
            if(src&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src)){
              const img=document.createElement('img');img.alt='';img.src=src;img.loading='lazy';btn.prepend(img);
            }
            btn.disabled=!canWrite();grid.append(btn);
          };
          mediaChoice('','Без изображения',null,initial==='');
          for(const asset of allowed){
            const url=HOSTED?window.Stage3Host?.previewUrl?.(asset.id):null;
            mediaChoice(asset.id,asset.alt||asset.id,url,initial===asset.id);
          }
          if(!allowed.length){
            const none=document.createElement('small');
            none.textContent=HOSTED?'Медиабиблиотека пуста. Загрузите изображение через панель Studio.':
              'В этом автономном сайте пока нет изображений. Для загрузки используйте серверную Studio.';
            grid.append(none);
          }
          picker.append(grid);
          if(HOSTED){
            const upload=workButton('+ Загрузить в медиабиблиотеку',()=>{
              modal.close();document.getElementById('server-media-upload')?.click();
            });
            upload.id='cms-work-media-upload';upload.disabled=!canWrite();
            const caution=document.createElement('small');
            caution.textContent='Перед загрузкой сохраните текущий черновик. После загрузки изображение нужно выбрать отдельно.';
            picker.append(upload,caution);
          }
          workFields.append(picker);
        }

      }
      const repeat=manifest(section)?.repeat;
      if(repeat){
        const repeatBar=document.createElement('div');repeatBar.className='cms-work-repeat';
        repeatBar.id='cms-work-repeat';
        const selected=section.items.find(i=>i.id===workElement);
        const repeatStatus=document.createElement('small');
        repeatStatus.textContent='Карточки '+section.items.length+'/'+repeat.max+
          (selected?' · выбрана '+(section.items.indexOf(selected)+1):' · выберите карточку на странице');
        repeatBar.append(repeatStatus);
        const operate=(action,extra={})=>{
          const id=['addItem','duplicateItem'].includes(action)?uniqueId('item'):null;
          const focus=id||selected?.id;
          structureWork({action,pageId:page.id,sectionId:section.id,
            itemId:selected?.id,...(id?{id}:{}),...extra});
          const latest=sectionForWork();
          if(focus&&latest?.items.some(x=>x.id===focus)){
            workElement=focus;workFocusPath='';showWork();render();
          }
        };
        const actions=document.createElement('div');actions.className='cms-work-actions';
        const addItem=workButton('+ Карточка',()=>operate('addItem'));
        addItem.id='cms-work-repeat-add';addItem.disabled=section.items.length>=repeat.max;
        actions.append(addItem);
        if(selected){
          const upItem=workButton('↑ Карточка',()=>operate('moveItem',{delta:-1}));
          upItem.disabled=section.items.indexOf(selected)===0;
          const downItem=workButton('↓ Карточка',()=>operate('moveItem',{delta:1}));
          downItem.disabled=section.items.indexOf(selected)===section.items.length-1;
          const copyItem=workButton('Копия карточки',()=>operate('duplicateItem'));
          copyItem.id='cms-work-repeat-copy';copyItem.disabled=section.items.length>=repeat.max;
          const removeItem=workButton('× Карточка',()=>{
            if(confirm('Удалить выбранную карточку из черновика?'))operate('removeItem');
          });
          removeItem.disabled=section.items.length<=repeat.min;
          actions.append(upItem,downItem,copyItem,removeItem);
        }
        repeatBar.append(actions);workFields.append(repeatBar);
      }
      if(section.component==='lead-form-flex'){
        const formInfo=document.createElement('div');formInfo.className='cms-work-form-focus';
        formInfo.id='cms-work-form-focus';
        const selected=section.formFields?.find(f=>f.id===workFormField);
        const caption=document.createElement('small');
        caption.textContent=selected?'Вопрос: '+selected.label+' · '+selected.kind+
          (selected.required?' · обязательный':'')+
          (selected.when?' · условное отображение':''):
          'Дополнительные вопросы: '+(section.formFields||[]).length+'/9. Нажмите на вопрос в макете.';
        const openForm=workButton(selected?'Настроить этот вопрос':'Настроить вопросы и условия',()=>{
          pageId=page.id;sectionId=section.id;elementId=workElement;breakpoint=mode;
          draw();modal.close();
          const dlg=document.getElementById('cms-form-builder');
          if(dlg&&selected)dlg.dataset.focusField=selected.id;
          document.getElementById('cms-form-builder-open')?.click();
        });
        openForm.id='cms-work-form-edit';
        formInfo.append(caption,openForm);
        workFields.append(formInfo);
      }

      if(section.designGraph){
        const rows=graphNodes(section);
        if(!rows.some(row=>row.node.id===workGraphNode))
          workGraphNode=rows[0]?.node.id||'';
        const current=selectedGraphNode();
        const panel=document.createElement('section');
        panel.className='cms-work-graph-panel';panel.id='cms-work-graph-panel';
        const title=document.createElement('strong');title.textContent='Вложенные элементы · '+rows.length;
        const hint=document.createElement('small');
        hint.textContent='Выберите элемент в макете или списке. Здесь доступны быстрые правки текста, адаптивных стилей, добавление, копирование и удаление узлов; для сложной компоновки откройте полный граф.';
        const nodes=document.createElement('select');nodes.id='cms-work-graph-node';nodes.className='control';
        for(const row of rows){
          const option=document.createElement('option');option.value=row.node.id;
          option.textContent='  '.repeat(row.depth)+row.node.type+' · '+(row.node.text||row.node.alt||row.node.id).slice(0,55);
          nodes.append(option);
        }
        nodes.value=workGraphNode;
        nodes.addEventListener('change',()=>{workGraphNode=nodes.value;showWork();highlightWork();});
        const graphActions=document.createElement('div');
        graphActions.className='cms-work-graph-actions';
        // Compose real typed content directly in the full-page visual canvas.
        // All mutations use the same strict Graph validation and draft Undo.
        const insertType=document.createElement('select');insertType.className='control';
        insertType.id='cms-work-graph-insert-type';
        insertType.setAttribute('aria-label','Тип нового элемента');
        const mediaOf=type=>session.current.assets.filter(asset=>
          type==='video'?asset.mime==='video/mp4':/^image\/(?:png|jpeg|webp|svg\+xml)$/.test(asset.mime));
        for(const [type,label] of [
          ['text','Текст'],['heading','Заголовок'],['button','Кнопка'],['link','Текстовая ссылка'],['quote','Цитата / отзыв'],
          ['image','Изображение'],['video','Видео MP4'],['icon','Иконка'],
          ['container','Контейнер'],['list','Список пунктов'],['disclosure','Раскрывающаяся панель'],
          ['tabs','Вкладки'],['gallery','Галерея со свайпом'],['table','Таблица с данными'],['divider','Разделитель']
        ]){
          const option=document.createElement('option');option.value=type;option.textContent=label;
          if(['image','video','gallery'].includes(type)&&!mediaOf(type).length)option.disabled=true;
          insertType.append(option);
        }
        const insertPlace=document.createElement('select');insertPlace.className='control';
        insertPlace.id='cms-work-graph-insert-placement';
        insertPlace.setAttribute('aria-label','Расположение нового элемента');
        for(const [value,label] of [['after','После'],['before','Перед'],['inside','Внутрь контейнера']]){
          const option=document.createElement('option');option.value=value;option.textContent=label;
          option.disabled=value==='inside'&&!['container','disclosure','tabs','tab','list','gallery','table','table-row'].includes(current.type);insertPlace.append(option);
        }
        const makeNode=type=>{
          const node={id:uniqueId('dg-node'),type,styles:{}};
          if(type==='text')node.text='Новый текстовый элемент';
          if(type==='heading'){node.text='Новый заголовок';node.level=2;}
          if(type==='button'||type==='link'){node.text='Подробнее';node.href='/';}
          if(type==='quote'){node.text='Цитата или отзыв';node.cite='Автор';}
          if(type==='icon'){node.icon='star';node.alt='';}
          if(type==='list'){
            node.ordered=false;node.children=[1,2].map(i=>({id:uniqueId('dg-node'),type:'list-item',text:'Пункт '+i,styles:{}}));
          }
          if(type==='gallery'){
            const photo=mediaOf('image')[0];
            if(!photo)throw Error('Для галереи нужны изображения');
            node.text='Фотогалерея';node.children=[1,2].map(()=>({
              id:uniqueId('dg-node'),type:'image',assetId:photo.id,alt:photo.alt||'Изображение',styles:{}
            }));
          }
          if(type==='table'){
            node.text='Сравнение вариантов';
            node.children=[0,1,2].map(row=>({
              id:uniqueId('dg-node'),type:'table-row',styles:{},children:[0,1,2].map(col=>({
                id:uniqueId('dg-node'),type:'table-cell',styles:{},
                text:row===0?['Параметр','Вариант A','Вариант B'][col]:
                  col===0?'Параметр '+row:'Значение'
              }))
            }));
          }
          if(type==='disclosure'){
            node.text='Вопрос или заголовок';node.children=[{id:uniqueId('dg-node'),type:'text',text:'Содержимое панели',styles:{}}];
          }
          if(type==='tabs'){
            node.children=[1,2].map(i=>({id:uniqueId('dg-node'),type:'tab',text:'Вкладка '+i,styles:{},
              children:[{id:uniqueId('dg-node'),type:'text',text:'Содержимое вкладки '+i,styles:{}}]}));
          }
          if(type==='container'){
            node.children=[];node.styles={display:'grid',columns:2,gap:'@medium'};
            node.responsive={mobile:{columns:1}};
          }
          if(type==='image'||type==='video'){
            const media=mediaOf(type)[0];
            if(!media)throw Error(type==='video'
              ?'Сначала загрузите MP4 в медиабиблиотеку'
              :'Сначала загрузите изображение в медиабиблиотеку');
            node.assetId=media.id;node.alt=media.alt||(type==='video'?'Видео':'Изображение');
          }
          return node;
        };
        const insertNode=(type,placement)=>{
          if(placement==='inside'&&!['container','disclosure','tabs','tab','list','gallery','table','table-row'].includes(current.type))
            return feedback('Вложить можно только в контейнер.',true);
          try{
            const node=makeNode(type);
            editGraphTreeWork({action:'insert',targetId:current.id,placement,node},node.id);
          }catch(error){feedback('Элемент не добавлен: '+error.message,true);}
        };
        const insertRow=document.createElement('div');insertRow.className='cms-work-graph-insert';
        const insert=workButton('+ Элемент',()=>insertNode(insertType.value,insertPlace.value));
        insert.id='cms-work-graph-insert';insert.disabled=!canWrite();
        insertRow.append(insertType,insertPlace,insert);graphActions.append(insertRow);
        const addText=workButton('+ Текст рядом',()=>insertNode('text','after'));
        addText.id='cms-work-graph-add-text';addText.disabled=!canWrite();
        const addChild=workButton('+ Вложенный текст',()=>insertNode('text','inside'));
        addChild.id='cms-work-graph-add-child';
        addChild.disabled=!canWrite()||!['container','disclosure','tab'].includes(current.type);
        if(current.type==='list'){
          const addListItem=workButton('+ Пункт списка',()=>{
            const node={id:uniqueId('dg-node'),type:'list-item',text:'Новый пункт',styles:{}};
            editGraphTreeWork({action:'insert',targetId:current.id,placement:'inside',node},node.id);
          });
          addListItem.id='cms-work-graph-add-list-item';
          addListItem.disabled=!canWrite()||current.children.length>=24;
          const toggleList=workButton(current.ordered?'Маркированный список':'Нумерованный список',()=>{
            editGraphWork(node=>{node.ordered=!node.ordered;});
          });
          toggleList.id='cms-work-graph-list-ordered';toggleList.disabled=!canWrite();
          graphActions.append(addListItem,toggleList);
        }
        if(current.type==='gallery'){
          const addPhoto=workButton('+ Фото в галерею',()=>{
            const photo=mediaOf('image')[0];
            if(!photo)return feedback('Сначала загрузите изображение',true);
            const node={id:uniqueId('dg-node'),type:'image',assetId:photo.id,
              alt:photo.alt||'Изображение',styles:{}};
            editGraphTreeWork({action:'insert',targetId:current.id,placement:'inside',node},node.id);
          });
          addPhoto.id='cms-work-graph-add-gallery-image';
          addPhoto.disabled=!canWrite()||current.children.length>=12;
          graphActions.append(addPhoto);
        }
        if(current.type==='table'){
          const addRow=workButton('+ Строка таблицы',()=>{
            const cells=current.children[0].children.map((_,col)=>({
              id:uniqueId('dg-node'),type:'table-cell',text:col?'Значение':'Параметр',styles:{}
            }));
            const node={id:uniqueId('dg-node'),type:'table-row',styles:{},children:cells};
            editGraphTreeWork({action:'insert',targetId:current.id,placement:'inside',node},node.id);
          });
          addRow.id='cms-work-graph-table-add-row';
          addRow.disabled=!canWrite()||current.children.length>=10;
          const addColumn=workButton('+ Столбец таблицы',()=>mutateGraphWork(({node})=>{
            for(const [i,row] of node.children.entries())row.children.push({
              id:uniqueId('dg-node'),type:'table-cell',styles:{},
              text:i===0?'Новый вариант':'Значение'
            });
          }));
          addColumn.id='cms-work-graph-table-add-column';
          addColumn.disabled=!canWrite()||current.children[0].children.length>=6;
          const removeColumn=workButton('− Столбец',()=>mutateGraphWork(({node})=>{
            for(const row of node.children)row.children.pop();
          }));
          removeColumn.id='cms-work-graph-table-remove-column';
          removeColumn.disabled=!canWrite()||current.children[0].children.length<=2;
          graphActions.append(addRow,addColumn,removeColumn);
        }
        if(current.type==='tabs'){
          const addTab=workButton('+ Вкладка',()=>{
            const i=current.children.length+1;
            const node={id:uniqueId('dg-node'),type:'tab',text:'Вкладка '+i,styles:{},
              children:[{id:uniqueId('dg-node'),type:'text',text:'Содержимое вкладки '+i,styles:{}}]};
            editGraphTreeWork({action:'insert',targetId:current.id,placement:'inside',node},node.id);
          });
          addTab.id='cms-work-graph-add-tab';addTab.disabled=!canWrite()||current.children.length>=8;
          graphActions.append(addTab);
        }
        const findSiblings=(nodes,id)=>{
          for(const node of nodes){
            if(node.id===id)return nodes;
            if(['container','disclosure','tabs','tab','list','gallery','table','table-row','popup'].includes(node.type)){
              const hit=findSiblings(node.children,id);if(hit)return hit;
            }
          }
          return null;
        };
        const siblings=findSiblings(section.designGraph.nodes,current.id)||[];
        const siblingIndex=siblings.findIndex(x=>x.id===current.id);
        const moveGraph=delta=>{
          const other=siblings[siblingIndex+delta];if(!other)return;
          editGraphTreeWork({action:'move',nodeId:current.id,targetId:other.id,
            placement:delta<0?'before':'after'},current.id);
        };
        const moveUp=workButton('↑ Элемент',()=>moveGraph(-1));
        moveUp.id='cms-work-graph-move-up';moveUp.disabled=!canWrite()||siblingIndex<=0;
        const moveDown=workButton('↓ Элемент',()=>moveGraph(1));
        moveDown.id='cms-work-graph-move-down';
        moveDown.disabled=!canWrite()||siblingIndex>=siblings.length-1;
        const duplicateGraphNode=workButton('Копия узла',()=>{
          const ids=[];
          const collect=node=>{ids.push(uniqueId('dg-node'));for(const child of node.children||[])collect(child);};
          collect(current);
          editGraphTreeWork({action:'duplicate',nodeId:current.id,ids},ids[0]);
        });
        duplicateGraphNode.id='cms-work-graph-duplicate';duplicateGraphNode.disabled=!canWrite();
        const removeGraphNode=workButton('Удалить узел',()=>{
          if(!confirm('Удалить выбранный узел и все его вложенные элементы?'))return;
          const removed=new Set();
          const collect=node=>{removed.add(node.id);for(const child of node.children||[])collect(child);};
          collect(current);
          const fallback=rows.find(row=>!removed.has(row.node.id))?.node.id||'';
          editGraphTreeWork({action:'remove',nodeId:current.id},fallback);
        });
        removeGraphNode.id='cms-work-graph-remove';
        const subtreeSize=node=>1+(node.children||[]).reduce((sum,child)=>sum+subtreeSize(child),0);
        removeGraphNode.disabled=!canWrite()||subtreeSize(current)>=rows.length;
        graphActions.append(addText,addChild,moveUp,moveDown,duplicateGraphNode,removeGraphNode);
        panel.append(title,hint,nodes,graphActions);
        const property=(label,key,value,options=null)=>{
          const wrap=document.createElement('label');wrap.className='cms-work-field';
          const caption=document.createElement('span');caption.textContent=label;
          const input=document.createElement(options?'select':key==='text'?'textarea':'input');
          input.className='control';input.dataset.workGraphField=key;
          if(options){
            for(const [v,t] of options){const opt=document.createElement('option');opt.value=v;opt.textContent=t;input.append(opt);}
          }else if(input.tagName==='TEXTAREA')input.rows=3;
          input.value=value??'';
          input.disabled=!canWrite();
          input.addEventListener('change',()=>{
            const val=input.value;
            if(['fontSize','padding','gap','color','background','textAlign','widthPx','heightPx',
              'minWidth','maxWidth','minHeight','maxHeight','borderWidth','borderStyle',
              'filterPreset','shadow','objectPositionX','objectPositionY'].includes(key)){
              editGraphWork(node=>{
                const style=mode==='desktop'?node.styles||(node.styles={}):
                  (node.responsive||(node.responsive={}))[mode]||((node.responsive[mode]={}));
                if(!val){
                  delete style[key];
                  if(mode!=='desktop'&&!Object.keys(style).length)delete node.responsive[mode];
                  if(node.responsive&&!Object.keys(node.responsive).length)delete node.responsive;
                }else if(['fontSize','padding','gap','widthPx','heightPx','minWidth',
                  'maxWidth','minHeight','maxHeight','borderWidth','objectPositionX','objectPositionY'].includes(key)){
                  style[key]=val.startsWith('@')?val.trim():Number(val);
                }else style[key]=val.trim();
              });
            }else editGraphWork(node=>{if(key==='href'&&!val&&node.type==='image')delete node.href;else node[key]=key==='level'?Number(val):val;});
          });
          wrap.append(caption,input);panel.append(wrap);
          return input;
        };
        if(current){
          if(['heading','text','button','link','quote','table','table-cell','gallery','disclosure','tab','list-item','popup'].includes(current.type))
            property('Текст', 'text',current.text);
          if((current.type==='button'&&!current.popupTarget)||current.type==='link')
            property('Ссылка','href',current.href);
          if(current.type==='button'){
            const popups=section.designGraph.nodes.filter(node=>node.type==='popup');
            if(popups.length){
              const holder=document.createElement('label');holder.className='cms-work-field';
              const caption=document.createElement('span');caption.textContent='Действие кнопки · открыть окно';
              const select=document.createElement('select');select.className='control';select.id='cms-work-popup-target';
              for(const [id,label] of [['','Обычная ссылка'],...popups.map(p=>[p.id,p.text])]){
                const option=document.createElement('option');option.value=id;option.textContent=label;select.append(option);
              }
              select.value=current.popupTarget||'';select.disabled=!canWrite();
              select.addEventListener('change',()=>editGraphWork(node=>{
                if(select.value){node.popupTarget=select.value;delete node.href;}
                else{delete node.popupTarget;node.href='/';}
              }));
              holder.append(caption,select);panel.append(holder);
            }
          }
          if(current.type==='image'){
            property('Действие по клику (необязательно)','href',current.href||'');
            const raster=session.current.assets.filter(a=>/^image\/(?:png|jpeg|webp)$/.test(a.mime));
            for(const [bp,label] of [['tablet','Планшет · своё изображение'],['mobile','Телефон · своё изображение']]){
              const key=bp+'AssetId';
              const labelEl=document.createElement('label');labelEl.className='cms-work-field';
              const caption=document.createElement('span');caption.textContent=label;
              const select=document.createElement('select');select.className='control';
              select.dataset.deviceImage=bp;
              for(const [id,name] of [['','Наследовать'],...raster.map(a=>[a.id,a.alt||a.id])]){
                const opt=document.createElement('option');opt.value=id;opt.textContent=name;select.append(opt);
              }
              select.value=current.responsiveMedia?.[key]||'';
              select.disabled=!canWrite();
              select.addEventListener('change',()=>{
                editGraphWork(node=>{
                  if(select.value)(node.responsiveMedia||(node.responsiveMedia={}))[key]=select.value;
                  else if(node.responsiveMedia){
                    delete node.responsiveMedia[key];
                    if(!Object.keys(node.responsiveMedia).length)delete node.responsiveMedia;
                  }
                });
              });
              labelEl.append(caption,select);panel.append(labelEl);
            }
          }
          if(!['image','video','icon','divider','table-row','table-cell'].includes(current.type)){
            const bgImages=session.current.assets.filter(x=>/^image\/(png|jpeg|webp)$/.test(x.mime));
            if(bgImages.length){
              const wrap=document.createElement('label');wrap.className='cms-work-field';
              const caption=document.createElement('span');caption.textContent='Фоновое изображение';
              const picker=document.createElement('select');picker.className='control';
              picker.id='cms-work-graph-background-asset';
              for(const [id,label] of [['','Без фона'],...bgImages.map(a=>[a.id,a.alt||a.id])]){
                const opt=document.createElement('option');opt.value=id;opt.textContent=label;picker.append(opt);
              }
              picker.value=current.backgroundMedia?.assetId||'';
              picker.disabled=!canWrite();
              picker.addEventListener('change',()=>{
                editGraphWork(node=>{
                  if(!picker.value){delete node.backgroundMedia;return;}
                  node.backgroundMedia={...(node.backgroundMedia||{}),assetId:picker.value};
                  delete node.backgroundVideo;
                  delete node.styles?.gradient;
                  delete node.responsive?.tablet?.gradient;
                  delete node.responsive?.mobile?.gradient;
                });
              });
              wrap.append(caption,picker);panel.append(wrap);
            }
          }
          if(current.type==='container'){
            const videos=session.current.assets.filter(a=>a.mime==='video/mp4');
            const posters=session.current.assets.filter(a=>/^image\/(?:png|jpeg|webp)$/.test(a.mime));
            if(videos.length&&posters.length){
              const wrap=document.createElement('label');wrap.className='cms-work-field';
              const caption=document.createElement('span');caption.textContent='Фоновое MP4 (декоративное)';
              const sel=document.createElement('select');sel.className='control';sel.id='cms-work-graph-background-video';
              for(const [id,label] of [['','Без видео'],...videos.map(a=>[a.id,a.alt||a.id])]){
                const opt=document.createElement('option');opt.value=id;opt.textContent=label;sel.append(opt);
              }
              sel.value=current.backgroundVideo?.assetId||'';sel.disabled=!canWrite();
              sel.addEventListener('change',()=>editGraphWork(node=>{
                if(!sel.value){delete node.backgroundVideo;return;}
                node.backgroundVideo={assetId:sel.value,
                  posterAssetId:node.backgroundVideo?.posterAssetId||posters[0].id};
                delete node.backgroundMedia;
                delete node.styles?.gradient;
                delete node.responsive?.tablet?.gradient;
                delete node.responsive?.mobile?.gradient;
              }));
              wrap.append(caption,sel);panel.append(wrap);
              if(current.backgroundVideo){
                const label=document.createElement('label');label.className='cms-work-field';
                const txt=document.createElement('span');txt.textContent='Обложка фонового видео';
                const pick=document.createElement('select');pick.className='control';pick.disabled=!canWrite();
                for(const a of posters){const o=document.createElement('option');o.value=a.id;o.textContent=a.alt||a.id;pick.append(o);}
                pick.value=current.backgroundVideo.posterAssetId;
                pick.addEventListener('change',()=>editGraphWork(node=>{node.backgroundVideo.posterAssetId=pick.value;}));
                label.append(txt,pick);panel.append(label);
              }
            }
          }
          if(current.type==='quote')property('Подпись автора', 'cite',current.cite||'');
          if(['image','video','icon'].includes(current.type))property('Описание / alt','alt',current.alt||'');
          if(current.type==='icon')property('Векторная иконка','icon',current.icon,
            Object.keys(DESIGN_GRAPH.ICON_PATHS).map(value=>[value,value]));
          if(['image','video'].includes(current.type)){
            const media=session.current.assets.filter(x=>current.type==='video'?
              x.mime==='video/mp4':/^image\/(?:png|jpeg|webp)$/.test(x.mime));
            property('Медиафайл','assetId',current.assetId,
              media.map(asset=>[asset.id,asset.alt||asset.id]));
            // Preview and bind the immutable IDs already uploaded to this site.
            // Never insert arbitrary remote URLs into the typed Graph.
            const mediaPicker=document.createElement('details');
            mediaPicker.id='cms-work-graph-media';mediaPicker.className='cms-work-media';
            const summary=document.createElement('summary');
            summary.textContent='Медиабиблиотека · '+media.length+
              (current.type==='video'?' видео':' изображений');
            const mediaGrid=document.createElement('div');mediaGrid.className='cms-work-media-grid';
            for(const asset of media){
              const choice=workButton(asset.alt||asset.id,()=>{
                editGraphWork(node=>{
                  node.assetId=asset.id;
                  if(!node.alt)node.alt=asset.alt||(current.type==='video'?'Видео':'Изображение');
                });
              });
              choice.classList.add('cms-work-media-choice');
              choice.dataset.graphMediaId=asset.id;
              choice.setAttribute('aria-pressed',current.assetId===asset.id?'true':'false');
              if(current.type==='image'&&HOSTED){
                const url=window.Stage3Host?.previewUrl?.(asset.id);
                if(url&&url.startsWith('/')){
                  const thumb=document.createElement('img');
                  thumb.alt='';thumb.src=url;thumb.loading='lazy';choice.prepend(thumb);
                }
              }
              choice.disabled=!canWrite();mediaGrid.append(choice);
            }
            mediaPicker.append(summary,mediaGrid);
            if(HOSTED){
              const upload=workButton(
                current.type==='video'?'+ Загрузить MP4':'+ Загрузить изображение',()=>{
                  modal.close();
                  $(current.type==='video'?'server-video-upload':'server-media-upload')?.click();
                });
              upload.disabled=!canWrite();
              const tip=document.createElement('small');
              tip.textContent='Перед загрузкой сохраните черновик. Новый файл затем выберите здесь.';
              mediaPicker.append(upload,tip);
            }
            panel.append(mediaPicker);
          }
          if(current.type==='heading'){
            property('Уровень H1–H6','level',String(current.level||2),
              [1,2,3,4,5,6].map(v=>[String(v),'H'+v]));
          }
          const styles=mode==='desktop'?current.styles||{}:current.responsive?.[mode]||{};
          const inherit=mode==='desktop'?'По умолчанию':'Наследовать с ПК';
          property('Цвет · '+mode,'color',styles.color||'',
            [['',inherit],...Object.keys(session.current.designTokens?.colors||DESIGN_GRAPH.DEFAULT_TOKENS.colors)
              .map(x=>['@'+x,x]),['#ffffff','Белый'],['#000000','Чёрный']]);
          property('Фон · '+mode,'background',styles.background||'',
            [['',inherit],...Object.keys(session.current.designTokens?.colors||DESIGN_GRAPH.DEFAULT_TOKENS.colors)
              .map(x=>['@'+x,x]),['#ffffff','Белый'],['#000000','Чёрный']]);
          property('Размер текста · '+mode,'fontSize',styles.fontSize??'');
          if(['container','disclosure','tabs','tab','list','gallery','table','table-row','popup'].includes(current.type)){
            property('Внутренний отступ · '+mode,'padding',styles.padding??'');
            property('Шаг элементов · '+mode,'gap',styles.gap??'');
          }
          const shape=document.createElement('details');shape.className='cms-work-appearance';
          shape.id='cms-work-graph-geometry';
          const shapeTitle=document.createElement('summary');
          shapeTitle.textContent='Размер, рамка и визуальные эффекты · '+mode;
          shape.append(shapeTitle);panel.append(shape);
          const appendShape=(label,key,val,choices)=>{
            const oldParent=panel;
            const before=panel.lastElementChild;
            property(label,key,val,choices);
            const field=panel.lastElementChild;
            if(field!==before)shape.append(field);
          };
          for(const [key,label] of [['widthPx','Ширина, px'],['heightPx','Высота, px'],
            ['minWidth','Мин. ширина, px'],['maxWidth','Макс. ширина, px'],
            ['minHeight','Мин. высота, px'],['maxHeight','Макс. высота, px'],
            ['borderWidth','Толщина рамки, px']])
            appendShape(label,key,styles[key]??'');
          appendShape('Тип рамки','borderStyle',styles.borderStyle||'',
            [['','Наследовать'],...['solid','dashed','dotted','double'].map(v=>[v,v])]);
          appendShape('Тень','shadow',styles.shadow||'',
            [['','Наследовать'],...['none','soft','medium','strong'].map(v=>[v,v])]);
          if(['image','video'].includes(current.type)){
            appendShape('Фильтр','filterPreset',styles.filterPreset||'',
              [['','Наследовать'],...['none','grayscale','sepia','contrast','vibrant'].map(v=>[v,v])]);
            appendShape('Кадрирование X, %','objectPositionX',styles.objectPositionX??'');
            appendShape('Кадрирование Y, %','objectPositionY',styles.objectPositionY??'');
          }
          property('Выравнивание · '+mode,'textAlign',styles.textAlign||'',
            [['',inherit],['left','Слева'],['center','По центру'],['right','Справа']]);
        }
        const edit=workButton('Открыть выбранный узел в Design Graph',()=>{
          pendingGraphCanvasFocus={pageId:page.id,sectionId:section.id,
            nodeId:workGraphNode,device:mode};
          pageId=page.id;sectionId=section.id;elementId=section.elements[0].id;breakpoint=mode;
          draw();modal.close();$('section-design-graph')?.click();
        });
        edit.id='cms-work-graph-open';panel.append(edit);
        workFields.prepend(panel);
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
      if(section.component==='lead-form-flex')
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
      const placementSelect=document.createElement('select');placementSelect.className='control';placementSelect.id='cms-work-position';
      const drawTargets=()=>{
        placementSelect.replaceChildren();
        const end=document.createElement('option');end.value='';end.textContent='В конец страницы';
        placementSelect.append(end);
        const target=session.current.pages.find(p=>p.id===destination.value);
        for(const sectionTarget of target?.sections||[]){
          const option=document.createElement('option');option.value=sectionTarget.id;
          option.textContent='Перед: '+(manifest(sectionTarget)?.label||sectionTarget.component);
          placementSelect.append(option);
        }
      };
      destination.addEventListener('change',drawTargets);drawTargets();
      const place=modeValue=>{
        const target=session.current.pages.find(p=>p.id===destination.value);
        const sectionId=section.id;
        const id=modeValue==='copy'?uniqueId('section'):sectionId;
        structureWork({action:'placeSection',mode:modeValue,pageId:page.id,
          sectionId,toPageId:target.id,targetSectionId:placementSelect.value||undefined,
          side:placementSelect.value?'before':'end',...(modeValue==='copy'?{id}:{})});
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
      cross.append(crossCaption,destination,placementSelect,ops);
      workAdd.append(cross);
      for(const b of workPanel.querySelectorAll('[data-editor-write]'))b.disabled ||= !canWrite();
    }
    workSectionPicker.addEventListener('change',()=>{workSection=workSectionPicker.value;workElement='';workFocusPath='';workFormField='';workGraphNode='';dismissQuick();showWork();highlightWork();});
    workElementPicker.addEventListener('change',()=>{workElement=workElementPicker.value;workFocusPath='';workFormField='';dismissQuick();showWork();highlightWork();});
    pathSelect.addEventListener('change',()=>{previewScroll=0;workSection=pageForWork()?.sections[0]?.id||'';workElement='';workFocusPath='';workFormField='';workGraphNode='';dismissQuick();showWork();});
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
      workSection=current().section.id;workElement=elementId;workFocusPath='';workFormField='';workGraphNode='';dismissQuick();showWork();
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

  // Site-wide design-system controller, shared by all graph-based pages.
  // Changes are validated as a whole site, committed once and undoable.
  function initSiteTokensManager(){
    const dlg=document.createElement('dialog');dlg.id='cms-design-tokens-dialog';
    dlg.className='cms-settings-dialog cms-site-tokens-dialog';
    const heading=document.createElement('h2');heading.textContent='Общая дизайн-система';
    const description=document.createElement('p');
    description.textContent='Цвета, расстояния, скругления и типографика для всех страниц с дизайн-композициями. Правка токена обновляет все связанные узлы; локальные значения остаются неизменными. Проверка → одно Undo → Save отдельно.';
    const summary=document.createElement('p');summary.id='cms-design-tokens-summary';
    const list=document.createElement('div');list.id='cms-design-tokens-fields';
    const report=document.createElement('p');report.id='cms-design-tokens-report';
    report.setAttribute('role','status');
    const actions=document.createElement('div');actions.className='cms-settings-actions';
    const add=button('+ Новый токен','btn small',()=>{});add.id='cms-design-tokens-add';
    const preflight=button('Проверить изменения','btn small',()=>prepare());preflight.id='cms-design-tokens-check';
    const applyButton=button('Применить ко всем страницам','btn primary',()=>commit());
    applyButton.id='cms-design-tokens-apply';applyButton.dataset.editorWrite='true';
    actions.append(add,preflight,applyButton,button('Закрыть','btn',()=>dlg.close()));
    dlg.append(heading,description,summary,list,report,actions);
    document.body.append(dlg);
    let draft=null,approved=null;
    const canEdit=()=>!HOSTED||!!window.Stage3Host?.canEditStudio?.();
    const usages=name=>{
      let count=0;const needle='@'+name;
      const visit=nodes=>{
        for(const node of nodes){
          for(const styles of [node.styles,node.responsive?.tablet,node.responsive?.mobile,
            node.states?.hover,node.states?.focus]){
            for(const v of Object.values(styles||{})){
              if(v===needle)count++;
              else if(v&&typeof v==='object')for(const nested of Object.values(v))
                if(nested===needle)count++;
            }
          }
          if(node.children)visit(node.children);
        }
      };
      for(const page of session.current.pages)for(const section of page.sections)
        if(section.designGraph)visit(section.designGraph.nodes);
      return count;
    };
    const invalidate=()=>{
      approved=null;applyButton.disabled=true;
      report.textContent='Изменения ещё не проверены. Ничего не применено.';
    };
    const redraw=()=>{
      list.replaceChildren();
      let count=0,links=0;
      for(const [group,values] of Object.entries(draft)){
        const section=document.createElement('section');section.className='cms-site-token-group';
        const title=document.createElement('h3');title.textContent=group;section.append(title);
        for(const [key,value] of Object.entries(values)){
          count++;const references=usages(key);links+=references;
          const row=document.createElement('div');row.className='cms-site-token-row';
          const label=document.createElement('label');label.textContent='@'+key;
          const input=document.createElement('input');input.className='control';
          input.type=group==='colors'?'color':'number';input.value=String(value);
          if(input.type==='number'){
            input.min=group==='typography'?'8':'0';
            input.max=group==='typography'?'120':'240';input.step='1';
          }
          input.disabled=!canEdit();
          input.setAttribute('aria-label',group+' · '+key);
          input.addEventListener('input',()=>{
            draft[group][key]=group==='colors'?input.value:Number(input.value);
            invalidate();
          });
          label.append(input);
          const impact=document.createElement('small');impact.textContent=references+' использований';
          const remove=button('Удалить','btn small',()=>{
            if(references)return notice('Токен используется: сначала переназначьте связанные узлы.',true);
            delete draft[group][key];invalidate();redraw();
          });
          remove.disabled=!canEdit()||Boolean(references);
          row.append(label,impact,remove);section.append(row);
        }
        list.append(section);
      }
      summary.textContent=count+' токенов · '+links+
        ' обращений к ним во всех композициях · локальные стили не перезаписываются';
      add.disabled=preflight.disabled=!canEdit();
    };
    add.addEventListener('click',()=>{
      if(!canEdit())return;
      const group=prompt('Группа: colors / spacing / radii / typography','colors');
      if(group===null)return;
      if(!Object.hasOwn(draft,group))return notice('Неизвестная группа',true);
      const key=prompt('Имя нового токена латиницей','custom');
      if(key===null)return;
      if(!/^[a-z][a-z0-9-]{1,39}$/.test(key)||Object.hasOwn(draft[group],key))
        return notice('Некорректное или уже занятое имя',true);
      draft[group][key]=group==='colors'?'#334455':16;
      invalidate();redraw();
    });
    function prepare(){
      try{
        if(!canEdit())throw Error('Недостаточно прав');
        DESIGN_GRAPH.validateTokens(draft);
        const candidate=cp(session.current);candidate.designTokens=cp(draft);
        C.validateSite(candidate,manifests);
        approved={before:JSON.stringify(session.current),tokens:JSON.stringify(draft),candidate};
        applyButton.disabled=false;
        report.textContent='Все страницы и композиции прошли проверку контракта. '+usages('accent')+
          ' использований @accent; изменения будут внесены одной операцией Undo.';
      }catch(error){invalidate();notice('Проверка не пройдена: '+error.message,true);}
    }
    function commit(){
      try{
        if(!approved||!canEdit()||JSON.stringify(session.current)!==approved.before||
          JSON.stringify(draft)!==approved.tokens)
          throw Error('Проверка устарела — проверьте текущие значения повторно');
        session=D.replaceSite(session,manifests,approved.candidate,session.revision);
        approved=null;dlg.close();draw();
        notice('Дизайн-система обновлена в черновике. Undo доступен. Save/Publish отдельно.');
      }catch(error){invalidate();notice('Не удалось применить дизайн-систему: '+error.message,true);}
    }
    const open=()=>{
      draft=cp(session.current.designTokens||DESIGN_GRAPH.DEFAULT_TOKENS);
      invalidate();redraw();dlg.showModal();
    };
    const buttonOpen=button('Дизайн-система','btn small',open);
    buttonOpen.id='cms-design-tokens-open';
    const bar=document.createElement('div');bar.className='structure-tools cms-design-system-tools';
    bar.append(buttonOpen);$('pages').before(bar);
  }

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
        activeGesture={kind:event.altKey&&!['hover','focus','active'].includes(mode)?'translate':'move',
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
        recordHistory();DESIGN_GRAPH.validateGraph(next,new Set(session.current.assets.map(a=>a.id)),
          new Set(),tokens,new Map(session.current.assets.map(a=>[a.id,a.mime])));
        graph=next;
        if(selectId)selection=selectId;
        render();
      }catch(error){notice('Структура не изменена: '+error.message,true);}
    };
    const subtreeIds=(node)=>{
      const ids=[];
      const walk=n=>{ids.push(n.id);for(const child of n.children||[])walk(child);};
      walk(node);return ids;
    };
    const DESIGN_RECIPES={
      container:[
        ['split','Две колонки',{display:'grid',columns:2,gap:'@medium',padding:'@large'},
          {tablet:{gap:'@small',padding:'@medium'},mobile:{columns:1,padding:'@small'}}],
        ['gallery','Адаптивная галерея',{display:'grid',columns:3,gap:'@small',padding:'@small'},
          {tablet:{columns:2},mobile:{columns:1}}],
        ['card','Карточка',{display:'flex',direction:'column',gap:'@small',padding:'@medium',
          radius:'@soft',shadow:'soft'},{mobile:{padding:'@small'}}]],
      heading:[
        ['hero','Крупный заголовок',{fluidFont:{min:30,max:72},lineHeight:110,
          fontWeight:700,textWrap:'balance'},{mobile:{lineHeight:115}}],
        ['section','Заголовок секции',{fluidFont:{min:24,max:46},lineHeight:120,fontWeight:700},{}]],
      text:[['body','Читабельный текст',{fontSize:'@body',lineHeight:155,maxWidth:820},{}]],
      button:[['cta','Кнопка действия',{display:'block',background:'@accent',
        color:'@background',paddingX:'@medium',paddingY:'@small',
        radius:'@round',textAlign:'center',fontWeight:700},{}]],
      image:[['cover','Широкая обложка',{objectFit:'cover',aspectRatio:'landscape',
        radius:'@soft',widthPercent:100},{mobile:{aspectRatio:'portrait'}}]],
      video:[['wide','Видео 16:9',{aspectRatio:'wide',widthPercent:100,radius:'@soft'},{}]]
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
        if(!['container','disclosure','tab','list','popup'].includes(n.type))return notice('Для вложенности выберите контейнер или панель',true);
        const node={id:uniqueId('dg-node'),type:n.type==='list'?'list-item':'text',
          text:n.type==='list'?'Новый пункт':'Новый текст',styles:{}};
        changeTree({action:'insert',targetId:n.id,placement:'inside',node},node.id);
      });
      action('+ Popup',()=>{
        const id=uniqueId('dg-node');
        const popup={id,type:'popup',text:'Информация',styles:{padding:16},
          children:[{id:uniqueId('dg-node'),type:'heading',level:2,text:'Заголовок окна',styles:{}},
            {id:uniqueId('dg-node'),type:'text',text:'Редактируемое содержимое окна',styles:{}}]};
        changeTree({action:'insert',targetId:graph.nodes.at(-1).id,placement:'after',node:popup},id);
      });
      if(n.type==='popup'){
        action('Открыть окно в предпросмотре',()=>{
          const frame=previewFrame.contentDocument;
          const popup=frame?.getElementById('cmsdg-popup-'+n.id);
          if(popup?.showPopover)popup.showPopover();
        });
      }
      if(n.type==='list')action('+ Пункт списка',()=>{
        const item={id:uniqueId('dg-node'),type:'list-item',text:'Новый пункт',styles:{}};
        changeTree({action:'insert',targetId:n.id,placement:'inside',node:item},item.id);
      });
      if(n.type==='gallery')action('+ Фото',()=>{
        const photo=session.current.assets.find(a=>/^image\/(?:png|jpeg|webp)$/.test(a.mime));
        if(!photo)return notice('Сначала загрузите фотографию',true);
        const item={id:uniqueId('dg-node'),type:'image',assetId:photo.id,alt:photo.alt||'Изображение',styles:{}};
        changeTree({action:'insert',targetId:n.id,placement:'inside',node:item},item.id);
      });
      if(n.type==='table'){
        action('+ Строка',()=>{
          const row={id:uniqueId('dg-node'),type:'table-row',styles:{},
            children:n.children[0].children.map((_,i)=>({
              id:uniqueId('dg-node'),type:'table-cell',text:i?'Значение':'Параметр',styles:{}
            }))};
          changeTree({action:'insert',targetId:n.id,placement:'inside',node:row},row.id);
        });
        action('+ Столбец',()=>{
          if(n.children[0].children.length>=6)return notice('Максимум шесть столбцов',true);
          const copy=cp(graph);
          const find=nodes=>{for(const item of nodes){
            if(item.id===n.id)return item;
            if(item.children){const hit=find(item.children);if(hit)return hit;}
          }return null;};
          const target=find(copy.nodes);
          target.children.forEach((row,i)=>row.children.push({
            id:uniqueId('dg-node'),type:'table-cell',text:i?'Значение':'Новый вариант',styles:{}
          }));
          try{DESIGN_GRAPH.validateGraph(copy,new Set(session.current.assets.map(a=>a.id)),
            new Set(),tokens,new Map(session.current.assets.map(a=>[a.id,a.mime])));
            recordHistory();graph=copy;render();
          }catch(error){notice('Столбец не добавлен: '+error.message,true);}
        });
        action('− Столбец',()=>{
          if(n.children[0].children.length<=2)return notice('Минимум два столбца',true);
          const copy=cp(graph);
          const find=nodes=>{for(const item of nodes){
            if(item.id===n.id)return item;
            if(item.children){const hit=find(item.children);if(hit)return hit;}
          }return null;};
          find(copy.nodes).children.forEach(row=>row.children.pop());
          try{DESIGN_GRAPH.validateGraph(copy,new Set(session.current.assets.map(a=>a.id)),
            new Set(),tokens,new Map(session.current.assets.map(a=>[a.id,a.mime])));
            recordHistory();graph=copy;render();
          }catch(error){notice('Столбец не удалён: '+error.message,true);}
        });
      }
      if(n.type==='tabs')action('+ Вкладка',()=>{
        const i=n.children.length+1;
        const tab={id:uniqueId('dg-node'),type:'tab',text:'Вкладка '+i,styles:{},
          children:[{id:uniqueId('dg-node'),type:'text',text:'Содержимое вкладки '+i,styles:{}}]};
        changeTree({action:'insert',targetId:n.id,placement:'inside',node:tab},tab.id);
      });
      action('+ Рядом',()=>{
        const node={id:uniqueId('dg-node'),type:'container',styles:{display:'grid',columns:2,gap:'@medium'},
          responsive:{mobile:{columns:1}},children:[]};
        changeTree({action:'insert',targetId:n.id,placement:'after',node},node.id);
      });
      action('Тип +',()=>{
        const type=prompt('Элемент: container / heading / text / button / link / quote / image / gallery / table / divider / icon / video / disclosure / tabs / list / popup','heading');
        if(type===null)return;
        if(!DESIGN_GRAPH.TYPES.includes(type))return notice('Неизвестный тип',true);
        const node={id:uniqueId('dg-node'),type,styles:{}};
        if(type==='container')node.children=[];
        if(type==='popup'){node.text='Информация';node.children=[{id:uniqueId('dg-node'),type:'text',text:'Содержимое окна',styles:{}}];}
        if(type==='list'){node.ordered=false;node.children=[1,2].map(i=>({id:uniqueId('dg-node'),type:'list-item',text:'Пункт '+i,styles:{}}));}
        if(type==='gallery'){
          const first=session.current.assets.find(a=>/^image\/(?:png|jpeg|webp)$/.test(a.mime));
          if(!first)return notice('Сначала загрузите фотографию',true);
          node.text='Фотогалерея';node.children=[1,2].map(()=>({
            id:uniqueId('dg-node'),type:'image',assetId:first.id,alt:first.alt||'Изображение',styles:{}
          }));
        }
        if(type==='table'){
          node.text='Таблица сравнения';node.children=[0,1,2].map(row=>({
            id:uniqueId('dg-node'),type:'table-row',styles:{},
            children:[0,1,2].map(col=>({
              id:uniqueId('dg-node'),type:'table-cell',
              text:row===0?['Параметр','Вариант A','Вариант B'][col]:
                col?'Значение':'Параметр',styles:{}
            }))
          }));
        }
        if(type==='quote'){node.text='Текст цитаты';node.cite='Автор';}
        if(type==='disclosure')node.children=[{id:uniqueId('dg-node'),type:'text',text:'Содержимое панели',styles:{}}];
        if(type==='tabs')node.children=[1,2].map(i=>({id:uniqueId('dg-node'),type:'tab',text:'Вкладка '+i,styles:{},
          children:[{id:uniqueId('dg-node'),type:'text',text:'Содержимое '+i,styles:{}}]}));
        if(['heading','text','button','link','disclosure'].includes(type))node.text='Новый элемент';
        if(type==='heading')node.level=2;
        if(type==='icon'){node.icon='check';node.alt='';}
        if(['button','link'].includes(type))node.href='/';
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
        changeTree({action:'insert',targetId:type==='popup'?graph.nodes.at(-1).id:n.id,placement:'after',node},node.id);
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
        const firstContainer=destinations.find(row=>['container','disclosure','tab','list'].includes(row.node.type));
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
      const recipes=DESIGN_RECIPES[n.type]||[];
      if(recipes.length){
        const box=make('div',undefined,'cms-design-recipe');box.id='cms-design-recipe';
        const select=make('select',undefined,'control');select.id='cms-design-recipe-choice';
        for(const rec of recipes){const option=make('option',rec[1]);option.value=rec[0];select.append(option);}
        const overwrite=make('input');overwrite.type='checkbox';overwrite.id='cms-design-recipe-overwrite';
        const optionLabel=make('label','Перезаписать ручные стили только этого элемента');optionLabel.prepend(overwrite);
        const preset=button('Применить стиль','btn small',()=>{
          try{
            const rec=recipes.find(r=>r[0]===select.value),copy=cp(graph);
            const find=nodes=>{for(const item of nodes){
              if(item.id===n.id)return item;
              if(item.children){const hit=find(item.children);if(hit)return hit;}
            }return null;};
            const target=find(copy.nodes);
            const merge=(layer,props)=>{
              for(const [key,value] of Object.entries(props)){
                const conflict={fluidFont:'fontSize',fontSize:'fluidFont',
                  widthPercent:'widthPx',widthPx:'widthPercent',
                  columns:'gridColumnsPreset',gridColumnsPreset:'columns'};
                if(!overwrite.checked&&(layer[key]!==undefined||
                  (conflict[key]&&layer[conflict[key]]!==undefined)))continue;
                if(conflict[key])delete layer[conflict[key]];
                layer[key]=cp(value);
              }
            };
            merge(target.styles||(target.styles={}),rec[2]);
            for(const [bp,values] of Object.entries(rec[3])){
              target.responsive??={};merge(target.responsive[bp]||(target.responsive[bp]={}),values);
            }
            DESIGN_GRAPH.validateGraph(copy,new Set(session.current.assets.map(a=>a.id)),
              new Set(),tokens,new Map(session.current.assets.map(a=>[a.id,a.mime])));
            if(JSON.stringify(copy)===JSON.stringify(graph))return;
            recordHistory();graph=copy;render();
            notice('Стиль применён к элементу. Undo и ручные правки сохранены.');
          }catch(e){notice('Стиль не применён: '+e.message,true);}
        });
        preset.id='cms-design-recipe-apply';
        box.append(make('strong','Готовые стилевые решения'),select,optionLabel,preset);root.append(box);
      }
      const headline=make('h3','Редактирование · '+n.type);root.append(headline);
      const fields=make('div','', 'cms-design-fields');root.append(fields);
      if(['heading','text','button','link','quote','table','table-cell','gallery','disclosure','tab','list-item','popup'].includes(n.type)){
        fields.append(ctl('Текст',n.text,value=>{n.text=value;},'multiline'));
      }
      if(n.type==='quote')fields.append(ctl('Автор или источник цитаты',n.cite||'',value=>{n.cite=value;}));
      if(n.type==='list')fields.append(ctl('Тип списка',{initial:n.ordered?'ordered':'unordered',
        choices:[['unordered','Маркированный'],['ordered','Нумерованный']]},v=>{n.ordered=v==='ordered';},'select'));
      if(n.type==='heading')fields.append(ctl('Уровень заголовка',String(n.level||2),value=>{n.level=Number(value);},'number'));
      if(['button','link'].includes(n.type)&&!n.popupTarget)
        fields.append(ctl('Ссылка',n.href||'/',value=>{n.href=value;}));
      if(n.type==='button'){
        const choices=[['','Открыть ссылку'],...graph.nodes.filter(item=>item.type==='popup').map(item=>[item.id,item.text])];
        fields.append(ctl('Действие кнопки',{initial:n.popupTarget||'',choices},v=>{
          if(v){n.popupTarget=v;delete n.href;}
          else{delete n.popupTarget;n.href='/';}
        },'select'));
      }
      if(n.type==='image'){
        fields.append(ctl('Ссылка по клику (необязательно)',n.href||'',v=>{if(v.trim())n.href=v.trim();else delete n.href;}));
        const options=session.current.assets.filter(a=>a.mime!=='video/mp4').map(a=>[a.id,a.alt||a.id]);
        fields.append(ctl('Изображение',{initial:n.assetId,choices:options},v=>{n.assetId=v;},'select'),
          ctl('Описание изображения',n.alt,v=>{n.alt=v;}));
        const raster=session.current.assets.filter(a=>/^image\/(?:png|jpeg|webp)$/.test(a.mime));
        const artChoices=[['','Наследовать предыдущий размер'],...raster.map(a=>[a.id,a.alt||a.id])];
        for(const [bp,label] of [['tablet','Изображение планшета'],['mobile','Изображение телефона']]){
          const key=bp+'AssetId';
          fields.append(ctl(label,{initial:n.responsiveMedia?.[key]||'',choices:artChoices},v=>{
            if(v)(n.responsiveMedia||(n.responsiveMedia={}))[key]=v;
            else if(n.responsiveMedia){
              delete n.responsiveMedia[key];
              if(!Object.keys(n.responsiveMedia).length)delete n.responsiveMedia;
            }
          },'select'));
        }
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
        ['hover','Наведение'],['focus','Фокус с клавиатуры'],['active','Нажатие']]){
        const opt=make('option',t);opt.value=v;modeSelect.append(opt);
      }
      modeSelect.value=mode;modeSelect.addEventListener('change',()=>{
        mode=modeSelect.value;
        if(Object.hasOwn(PREVIEW_WIDTHS,mode))previewDevice=mode;
        render();
      });
      root.append(make('h3','Свойства · '+mode),modeSelect);
      if(mode==='tablet'||mode==='mobile'){
        const inherited={...n.styles,...(mode==='mobile'?n.responsive?.tablet||{}:{})};
        const ownLayer=n.responsive?.[mode]||{};
        const area=make('section',undefined,'cms-design-inheritance');area.id='cms-design-inheritance';
        area.append(make('strong','Каскад ПК → '+(mode==='tablet'?'планшет':'планшет → телефон')));
        area.append(make('p',Object.keys(inherited).length+' унаследованных · '+
          Object.keys(ownLayer).length+' ручных переопределений.'));
        const reset=button('Вернуть наследование','btn small',()=>{
          if(!Object.keys(ownLayer).length)return;
          recordHistory();delete n.responsive[mode];render();
        });
        reset.id='cms-design-inherit-reset';
        area.append(reset);root.append(area);
      }
      const styleFields=make('div',undefined,'cms-design-fields');root.append(styleFields);
      const style=editStyle(n),limited=['hover','focus','active'].includes(mode);
      for(const key of DESIGN_GRAPH.STYLE_KEYS){
        if(key==='fluidFont'||key==='shadowFine')continue;
        if(limited&&!['color','background','borderColor','borderWidth','borderStyle','radius','opacity','gradient','outlineColor','outlineWidth','filterPreset','scalePercent'].includes(key))continue;
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
          borderStyle:['solid','dashed','dotted','double'],filterPreset:['none','grayscale','sepia','contrast','vibrant'],
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
          if(key==='fontSize')delete style.fluidFont;
          style[key]=v.startsWith('@')?v.trim():Number(v);
        }));
      }
      if(!limited){
        const details=make('details');details.id='cms-design-shadow-fine';
        details.append(make('summary','Точная тень · смещение / размытие / цвет'));
        const defaults={x:0,y:12,blur:30,spread:0,color:'#000000',inset:false};
        const fine=style.shadowFine||defaults;
        const ensureFine=()=>{
          delete style.shadow;
          return style.shadowFine||(style.shadowFine=cp(defaults));
        };
        const controls=make('div',undefined,'cms-design-fields');
        for(const [key,label] of [['x','Смещение X, px'],['y','Смещение Y, px'],
          ['blur','Размытие, px'],['spread','Размах, px']])
          controls.append(ctl(label,String(fine[key]),v=>{ensureFine()[key]=Number(v);},'number'));
        controls.append(ctl('Цвет (HEX или @token)',fine.color,v=>{ensureFine().color=v.trim();}),
          ctl('Внутренняя тень',{initial:String(fine.inset),
            choices:[['false','Снаружи'],['true','Внутри']]},
            v=>{ensureFine().inset=v==='true';},'select'));
        details.append(controls,button('Убрать точную тень','btn small',()=>{
          if(!style.shadowFine)return;
          recordHistory();delete style.shadowFine;render();
        }));
        root.append(details);
      }
      if(!limited&&!['image','video','icon','divider','table-row','table-cell'].includes(n.type)){
        const images=session.current.assets.filter(a=>/^image\/(?:png|jpeg|webp)$/.test(a.mime));
        const background=make('details');background.id='cms-design-background-media';
        background.append(make('summary','Фоновое изображение · ПК / планшет / телефон'));
        if(!images.length){
          background.append(make('p','Загрузите JPEG, PNG или WebP в медиабиблиотеку сайта.'));
        }else{
          const choices=[['','Без фонового изображения'],...images.map(a=>[a.id,a.alt||a.id])];
          const bg=n.backgroundMedia;
          const pick=ctl('Фон для ПК', {initial:bg?.assetId||'',choices},v=>{
            if(!v){delete n.backgroundMedia;return;}
            n.backgroundMedia={...(n.backgroundMedia||{}),assetId:v};
            delete n.backgroundVideo;
            delete n.styles?.gradient;
            delete n.responsive?.tablet?.gradient;
            delete n.responsive?.mobile?.gradient;
          },'select');
          pick.querySelector('select').addEventListener('change',()=>render());
          background.append(pick);
          if(bg){
            background.append(
              ctl('Фон планшета (пусто = ПК)',{initial:bg.tabletAssetId||'',choices},v=>{
                if(v)bg.tabletAssetId=v;else delete bg.tabletAssetId;
              },'select'),
              ctl('Фон телефона (пусто = планшет)',{initial:bg.mobileAssetId||'',choices},v=>{
                if(v)bg.mobileAssetId=v;else delete bg.mobileAssetId;
              },'select'),
              ctl('Масштаб',{initial:bg.size||'cover',choices:[['cover','Заполнить'],['contain','Вписать']]},
                v=>{bg.size=v;},'select'),
              ctl('Позиция X, %',String(bg.positionX??50),v=>{bg.positionX=Number(v);},'number'),
              ctl('Позиция Y, %',String(bg.positionY??50),v=>{bg.positionY=Number(v);},'number')
            );
            const colorChoices=[['','Без затемнения'],
              ...Object.keys(tokens.colors||{}).map(k=>['@'+k,k]),
              ['#000000','Чёрный'],['#ffffff','Белый']];
            const tint=ctl('Наложение',{initial:bg.overlay?.color||'',choices:colorChoices},v=>{
              if(v)bg.overlay={color:v,opacity:bg.overlay?.opacity??40};
              else delete bg.overlay;
            },'select');
            tint.querySelector('select').addEventListener('change',()=>render());
            background.append(tint);
            if(bg.overlay)background.append(ctl('Непрозрачность наложения 0–90, %',
              String(bg.overlay.opacity),v=>{bg.overlay.opacity=Number(v);},'number'));
          }
        }
        root.append(background);
      }
      if(!limited&&n.type==='container'){
        const videos=session.current.assets.filter(a=>a.mime==='video/mp4');
        const raster=session.current.assets.filter(a=>/^image\/(?:png|jpeg|webp)$/.test(a.mime));
        const background=make('details');background.id='cms-design-background-video';
        background.append(make('summary','Видео на фоне · MP4 / обложки / затемнение'));
        if(!videos.length||!raster.length){
          background.append(make('p','Для фона нужны локальный MP4 и изображение-обложка JPEG/PNG/WebP. Загрузите их в медиабиблиотеку.'));
        }else{
          const videoChoices=[['','Обычный фон без видео'],...videos.map(a=>[a.id,a.alt||a.id])];
          const imageChoices=raster.map(a=>[a.id,a.alt||a.id]);
          const bv=n.backgroundVideo;
          const videoPick=ctl('Фоновый ролик',{initial:bv?.assetId||'',choices:videoChoices},v=>{
            if(!v){delete n.backgroundVideo;return;}
            n.backgroundVideo={assetId:v,posterAssetId:bv?.posterAssetId||raster[0].id,
              ...(bv?.tabletPosterAssetId?{tabletPosterAssetId:bv.tabletPosterAssetId}:{}),
              ...(bv?.mobilePosterAssetId?{mobilePosterAssetId:bv.mobilePosterAssetId}:{}),
              ...(bv?.overlay?{overlay:bv.overlay}:{}),
              ...(bv?.positionX!==undefined?{positionX:bv.positionX}:{}),
              ...(bv?.positionY!==undefined?{positionY:bv.positionY}:{})};
            delete n.backgroundMedia;
            delete n.styles?.gradient;
            delete n.responsive?.tablet?.gradient;
            delete n.responsive?.mobile?.gradient;
          },'select');
          videoPick.querySelector('select').addEventListener('change',()=>render());
          background.append(videoPick);
          if(bv){
            background.append(
              ctl('Обложка для ПК (обязательно)',{initial:bv.posterAssetId,choices:imageChoices},
                v=>{bv.posterAssetId=v;},'select'),
              ctl('Обложка планшета',{initial:bv.tabletPosterAssetId||'',
                choices:[['','Наследовать ПК'],...imageChoices]},
                v=>{if(v)bv.tabletPosterAssetId=v;else delete bv.tabletPosterAssetId;},'select'),
              ctl('Обложка телефона',{initial:bv.mobilePosterAssetId||'',
                choices:[['','Наследовать планшет'],...imageChoices]},
                v=>{if(v)bv.mobilePosterAssetId=v;else delete bv.mobilePosterAssetId;},'select'),
              ctl('Позиция по X, %',String(bv.positionX??50),v=>{bv.positionX=Number(v);},'number'),
              ctl('Позиция по Y, %',String(bv.positionY??50),v=>{bv.positionY=Number(v);},'number')
            );
            const colors=[['','Без затемнения'],...Object.keys(tokens.colors||{}).map(k=>['@'+k,k]),
              ['#000000','Чёрный'],['#ffffff','Белый']];
            const tint=ctl('Цвет затемнения',{initial:bv.overlay?.color||'',choices:colors},v=>{
              if(v)bv.overlay={color:v,opacity:bv.overlay?.opacity??45};
              else delete bv.overlay;
            },'select');
            tint.querySelector('select').addEventListener('change',()=>render());
            background.append(tint);
            if(bv.overlay)background.append(ctl('Затемнение 0–90, %',String(bv.overlay.opacity),
              v=>{bv.overlay.opacity=Number(v);},'number'));
            background.append(make('p','Видео автоматически воспроизводится без звука только на ПК и планшете. На телефоне и при настройке «уменьшить движение» видна обложка.'));
          }
        }
        root.append(background);
      }
      const fluid=make('details');fluid.id='cms-design-fluid-font';
       fluid.append(make('summary','Плавный размер шрифта · от 320 до 1200 px'));
       const ff=style.fluidFont||{min:22,max:54};
       const fluidFields=make('div',undefined,'cms-design-fields');
       fluidFields.append(
         ctl('Минимум, px',String(ff.min),v=>{
           delete style.fontSize;
           style.fluidFont={...(style.fluidFont||ff),min:Number(v)};
         },'number'),
         ctl('Максимум, px',String(ff.max),v=>{
           delete style.fontSize;
           style.fluidFont={...(style.fluidFont||ff),max:Number(v)};
         },'number'));
       fluid.append(fluidFields,button('Сбросить плавный размер','btn small',()=>{
         if(!style.fluidFont)return;
         recordHistory();delete style.fluidFont;render();
       }));if(!limited)root.append(fluid);
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
      if(n.type==='container'){
        const sequence=make('details');sequence.id='cms-design-sequence';
        sequence.append(make('summary','Последовательная анимация элементов контейнера'));
        const initial={effect:'fade-up',duration:500,delay:0,stagger:150,easing:'ease-out'};
        const seq=n.sequence||initial;
        const ensure=()=>n.sequence||(n.sequence=cp(initial));
        const fields=make('div',undefined,'cms-design-fields');
        fields.append(
          ctl('Эффект',{initial:seq.effect,choices:DESIGN_GRAPH.MOTIONS.filter(v=>v!=='none').map(v=>[v,v])},
            v=>{ensure().effect=v;},'select'),
          ctl('Длительность элемента, мс',String(seq.duration),v=>{ensure().duration=Number(v);},'number'),
          ctl('Начальная задержка, мс',String(seq.delay),v=>{ensure().delay=Number(v);},'number'),
          ctl('Интервал между элементами, мс',String(seq.stagger),v=>{ensure().stagger=Number(v);},'number'),
          ctl('Плавность',{initial:seq.easing,choices:DESIGN_GRAPH.SEQUENCE_EASINGS.map(v=>[v,v])},
            v=>{ensure().easing=v;},'select'));
        const enable=button(n.sequence?'Убрать последовательность':'Включить последовательность','btn small',()=>{
          recordHistory();
          if(n.sequence)delete n.sequence;else n.sequence=cp(initial);
          render();
        });
        sequence.append(fields,enable,make('p','Элементы появляются по очереди при загрузке страницы. У отдельных дочерних элементов не должно быть собственной анимации. В режиме reduced motion всё статично.'));
        root.append(sequence);
      }
      const interactions=make('details');interactions.id='cms-design-transitions';
      interactions.append(make('summary','Плавные hover / focus / tap-состояния'));
      const transition=n.transition||{duration:180,easing:'ease-out'};
      const transitionControls=make('div',undefined,'cms-design-fields');
      transitionControls.append(
        ctl('Длительность перехода, мс',String(transition.duration),v=>{
          n.transition={...(n.transition||transition),duration:Number(v)};
        },'number'),
        ctl('Плавность',{initial:transition.easing,
          choices:DESIGN_GRAPH.SEQUENCE_EASINGS.map(v=>[v,v])},v=>{
          n.transition={...(n.transition||transition),easing:v};
        },'select'));
      const removeTransition=button('Без плавных переходов','btn small',()=>{
        if(!n.transition)return;
        recordHistory();delete n.transition;render();
      });
      interactions.append(transitionControls,removeTransition,
        make('p','Настраивайте цвет, непрозрачность, масштаб, рамку и фильтр отдельно в режимах «Наведение», «Фокус» и «Нажатие». При уменьшенном движении переходы отключены.'));
      root.append(interactions);
      const motionBox=make('details');motionBox.id='cms-design-motion';
      motionBox.append(make('summary','Анимация элемента · учитывает reduced motion'));
      const motionFields=make('div',undefined,'cms-design-fields');
      const motion=n.motion||{effect:'none',duration:500,delay:0,trigger:'load',easing:'ease-out'};
      const changeMotion=(key,v)=>{
        const next={...(n.motion||{effect:'none',duration:500,delay:0}),[key]:v};
        if(next.trigger==='scroll')next.delay=0;
        n.motion=next;
      };
      motionFields.append(
        ctl('Эффект',{initial:motion.effect,choices:DESIGN_GRAPH.MOTIONS.map(v=>[v,v])},
          v=>changeMotion('effect',v),'select'),
        ctl('Длительность, мс',String(motion.duration),v=>changeMotion('duration',Number(v)),'number'),
        ctl('Задержка, мс (при загрузке)',String(motion.delay),v=>changeMotion('delay',Number(v)),'number'),
        ctl('Когда запускать',{initial:motion.trigger||'load',choices:[
          ['load','При загрузке'],['scroll','Когда элемент входит в экран']]},
          v=>changeMotion('trigger',v),'select'),
        ctl('Плавность',{initial:motion.easing||'ease-out',
          choices:DESIGN_GRAPH.SEQUENCE_EASINGS.map(v=>[v,v])},
          v=>changeMotion('easing',v),'select')
      );
      motionBox.append(motionFields,
        make('p','Прокрутка: CSS View Timeline при поддержке браузера, иначе элемент виден без анимации. Длительность и задержка относятся к режиму загрузки; при прокрутке эффект привязан к положению в окне.'),
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
      const canvasFocus=pendingGraphCanvasFocus;
      pendingGraphCanvasFocus=null;
      if(canvasFocus?.pageId===page.id&&canvasFocus.sectionId===section.id&&
        matches(canvasFocus.nodeId)){
        selection=canvasFocus.nodeId;
        mode=canvasFocus.device;previewDevice=canvasFocus.device;
      }
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
    const info=document.createElement('p');info.textContent='Поиск по заголовкам, текстам блоков, карточкам, SEO и подписям форм. Видимые заголовки, тексты и кнопки Design Graph редактируются наряду с полями компонентов. Ссылки, медиа, ID и скрытые поля не изменяются. Сначала просмотрите замены, затем примените к черновику. Сохранение и публикация отдельно.';
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
          if(section.designGraph){
            const walk=nodes=>{
              for(const node of nodes){
                if(['heading','text','button','link','quote','table','table-cell','gallery','list-item','disclosure','tab'].includes(node.type))
                  add(page,'graph',null,'text',node.text,
                    'Дизайн-композиция · '+node.type+' · '+node.id,section,{id:node.id});
                if(node.type==='quote'&&node.cite)
                  add(page,'graph',null,'cite',node.cite,
                    'Дизайн-композиция · автор цитаты · '+node.id,section,{id:node.id});
                if(node.children)walk(node.children);
              }
            };
            walk(section.designGraph.nodes);
            continue; // Legacy component fields are not visible behind Design Graph.
          }
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
      if(entry.kind==='graph'){
        pendingGraphCanvasFocus={pageId:page.id,sectionId:sec.id,
          nodeId:entry.elementId,device:'desktop'};
        $('section-design-graph')?.click();return;
      }
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
            if(!sec)throw Error('Блок удалён или изменился');
            if(e.kind==='graph'){
              if(!sec.designGraph)throw Error('Дизайн-композиция больше не отображается');
              const find=nodes=>{
                for(const node of nodes){
                  if(node.id===e.elementId)return node;
                  if(node.children){const child=find(node.children);if(child)return child;}
                }
                return null;
              };
              target=find(sec.designGraph.nodes);
              if(!target||!['heading','text','button','link','quote','table','table-cell','gallery','list-item','disclosure','tab'].includes(target.type))
                throw Error('Элемент композиции больше не существует');
            }else{
              if(sec.designGraph)throw Error('Показан другой источник содержимого');
              target=e.kind==='form'?sec.formFields?.find(x=>x.id===e.formId):
                [...sec.elements,...(sec.items||[])].find(x=>x.id===e.elementId)?.values;
            }
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



  // In-site page assembly, not a separate site generator. The operator can
  // revise the entire page plan before one validated, Undoable draft commit.
  function initPageBlueprint(){
    const BLUEPRINTS={
      home:{label:'Главная · полный сайт',components:['company-hero','feature-highlights','service-grid','media-story','cta-banner','lead-form-flex']},
      services:{label:'Услуги · витрина и заявки',components:['company-hero','service-grid','process-timeline','faq-accordion','lead-form-flex']},
      about:{label:'О компании · история',components:['company-hero','media-story','feature-highlights','partner-logos','contact-panel']},
      portfolio:{label:'Проекты · галерея',components:['company-hero','photo-gallery','media-story','testimonials','contact-panel']},
      contact:{label:'Контакты · форма',components:['company-hero','contact-panel','lead-form-flex']},
      landing:{label:'Лендинг · предложение',components:['company-hero','feature-highlights','service-grid','comparison-matrix','cta-banner','lead-form-flex']}
    };
    const dialog=document.createElement('dialog');
    dialog.id='cms-blueprint-dialog';dialog.className='cms-settings-dialog cms-blueprint-dialog';
    const title=document.createElement('h2');title.textContent='Собрать страницу из готовых секций';
    const subtitle=document.createElement('p');subtitle.className='subdued';
    subtitle.textContent='Конструктор работает внутри текущего сайта. Введите только проверенные сведения. Просмотр не меняет черновик; применение — одна операция Undo. Сохранение и публикация отдельно.';
    const layout=document.createElement('div');layout.className='cms-blueprint-layout';
    const fields=document.createElement('div');fields.className='cms-blueprint-fields';
    const right=document.createElement('div');right.className='cms-blueprint-preview';
    const field=(caption,kind='input',max=0)=>{
      const wrap=document.createElement('label');wrap.textContent=caption;
      const ctl=document.createElement(kind);ctl.className='control';
      if(kind==='input')ctl.type='text';
      if(max)ctl.maxLength=max;
      wrap.append(ctl);fields.append(wrap);return ctl;
    };
    const preset=field('Сценарий страницы','select'),target=field('Куда собрать','select');
    const operation=field('Что сделать с существующими секциями','select');
    const addOptions=(select,pairs)=>{select.replaceChildren();for(const [value,label] of pairs){
      const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);
    }};
    addOptions(preset,Object.entries(BLUEPRINTS).map(([key,v])=>[key,v.label]));
    addOptions(operation,[['replace','Заменить все секции страницы'],['append','Добавить секции в конец']]);
    const pageTitle=field('Название страницы', 'input',160);
    const path=field('URL новой страницы (латиница, /.../)','input',180);
    const headline=field('Главный заголовок H1','input',180);
    const description=field('Краткое описание предложения','textarea',420);
    description.rows=3;
    const action=field('Текст основной кнопки','input',90);
    const services=field('Услуги или предложения — по одной строке (необязательно)','textarea');
    services.rows=3;services.maxLength=2500;
    const seo=field('SEO-описание (без выдуманных обещаний)','textarea',300);seo.rows=2;
    const blocksTitle=document.createElement('h3');blocksTitle.textContent='Секции страницы';
    const blocks=document.createElement('div');blocks.id='cms-blueprint-blocks';blocks.className='cms-blueprint-blocks';
    const addBar=document.createElement('div');addBar.className='cms-blueprint-add';
    const component=document.createElement('select');component.className='control';component.id='cms-blueprint-component';
    addOptions(component,manifests.map(m=>[m.id,m.label]));
    const addBlock=button('+ Секция','btn small',()=>{plan.push(component.value);renderBlocks();refresh();});
    addBar.append(component,addBlock);
    fields.append(blocksTitle,blocks,addBar);
    const count=document.createElement('p');count.id='cms-blueprint-summary';
    const error=document.createElement('p');error.id='cms-blueprint-error';error.setAttribute('role','alert');
    const deviceBar=document.createElement('div');deviceBar.className='cms-blueprint-devices';
    const desktop=button('Компьютер','btn small',()=>{device='desktop';renderDevice();refresh();});
    const mobile=button('Телефон','btn small',()=>{device='mobile';renderDevice();refresh();});
    deviceBar.append(desktop,mobile);
    const frame=document.createElement('iframe');frame.id='cms-blueprint-frame';
    frame.title='Предпросмотр структуры страницы без сценариев и форм';
    frame.setAttribute('sandbox','');frame.setAttribute('referrerpolicy','no-referrer');
    right.append(count,error,deviceBar,frame);
    layout.append(fields,right);
    const buttons=document.createElement('div');buttons.className='cms-settings-actions';
    const apply=button('Применить страницу целиком','btn primary',commit);apply.id='cms-blueprint-apply';
    apply.dataset.editorWrite='true';
    const close=button('Закрыть','btn',()=>dialog.close());
    buttons.append(apply,close);
    dialog.append(title,subtitle,layout,buttons);document.body.append(dialog);
    let plan=[],openedRevision=0,device='desktop',candidate=null,focusPageId='',failure='';
    const slug=name=>String(name||'').normalize('NFKD').toLowerCase()
      .replace(/[^a-z0-9 -]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-');
    const setSlot=(section,slot,key,value)=>{
      const el=section.elements.find(x=>x.slot===slot);
      const definitions=manifests.find(x=>x.id===section.component)?.elements
        .find(x=>x.slot===slot)?.fields||[];
      const def=definitions.find(f=>f.path===key);
      if(el&&def&&typeof value==='string'&&value.length<=def.maxLength&&def.type==='text')
        el.values[key]=value;
      else if(el&&def&&def.type==='url')el.values[key]=value;
    };
    const warningKey=x=>[x.kind,x.pageId,x.sectionId||'',x.path].join('|');
    const linkProblems=site=>C.inspectSite(site,manifests).errors.filter(x=>
      x.kind==='broken-link'||x.kind==='broken-anchor');
    function build(){
      const source=session.current,existing=source.pages.find(p=>p.id===target.value);
      if(!plan.length)throw Error('Добавьте хотя бы одну секцию');
      if(plan.length>40)throw Error('Не более 40 секций за одну сборку');
      const name=pageTitle.value.trim(),heading=headline.value.trim(),route=path.value.trim();
      if(!name)throw Error('Введите название страницы');
      if(!heading)throw Error('Введите главный заголовок H1');
      if(!existing&&!/^\/(?:[a-z0-9-]+\/)*$/.test(route))
        throw Error('URL должен быть вида /services/ (латиница, строчные буквы и дефисы)');
      if(seo.value.length>300)throw Error('SEO описание — максимум 300 символов');
      const site=cp(source),page=existing?
        site.pages.find(p=>p.id===existing.id):{id:uniqueId('page'),path:route,title:name,sections:[]};
      if(!existing)site.pages.push(page);
      if(existing)page.title=name;
      if(!existing||operation.value==='replace')page.sections=[];
      const ids=plan.map(()=>uniqueId('section'));
      const destination=()=>{
        const newForm=plan.findIndex(x=>x==='lead-form-flex'||x==='lead-form');
        if(newForm>=0)return page.path+'#'+ids[newForm];
        const own=page.sections.find(s=>s.component==='lead-form-flex'||s.component==='lead-form');
        if(own)return page.path+'#'+own.id;
        for(const p of site.pages)for(const sec of p.sections)
          if(sec.component==='lead-form-flex'||sec.component==='lead-form')
            return p.path+'#'+sec.id;
        return '/';
      };
      const contact=destination();
      const lines=services.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      if(lines.length>16)throw Error('Не более 16 названий услуг');
      if(lines.some(x=>x.length>150))throw Error('Название услуги — максимум 150 символов');
      for(const [i,type] of plan.entries()){
        const manifest=manifests.find(m=>m.id===type);
        if(!manifest)throw Error('Неизвестный компонент: '+type);
        const section=C.sectionFrom(manifest,ids[i]);
        // Only the operator's supplied text is promoted to content. Everything
        // else remains a visibly editable manifest placeholder, not invented fact.
        if(type==='company-hero'){
          setSlot(section,'heading','content.text',heading);
          if(description.value.trim())setSlot(section,'summary','content.text',description.value.trim());
          if(action.value.trim())setSlot(section,'action','content.text',action.value.trim());
        }
        if(type==='service-grid'&&lines.length){
          const repeat=manifest.repeat;
          const size=Math.max(repeat.min,Math.min(repeat.max,lines.length));
          const template=section.items[0];
          section.items=Array.from({length:size},(_,index)=>{
            const item=index<section.items.length?cp(section.items[index]):cp(template);
            item.id=section.id+'-item-'+(index+1);
            if(lines[index])item.values['content.title']=lines[index];
            return item;
          });
        }
        if(type==='cta-banner'&&action.value.trim())
          setSlot(section,'primary','content.text',action.value.trim());
        if(type==='lead-form-flex'&&action.value.trim())
          setSlot(section,'submit-label','content.text',action.value.trim());
        // Default example links are not allowed to point to non-existent pages.
        for(const el of [...section.elements,...(section.items||[])]){
          if(Object.hasOwn(el.values,'behavior.href')){
            const href=el.values['behavior.href'];
            if(href==='/contact/'||href==='/'||!site.pages.some(p=>p.path===href))
              el.values['behavior.href']=contact;
          }
        }
        page.sections.push(section);
      }
      // Existing page metadata not mentioned here remains intact.
      if(!existing)page.seo={title:name,description:seo.value.trim(),robots:'index',
        ogTitle:'',ogDescription:'',ogImage:''};
      else if(seo.value.trim())page.seo={title:'',description:'',robots:'index',
        ogTitle:'',ogDescription:'',ogImage:'',...(page.seo||{}),description:seo.value.trim()};
      C.validateSite(site,manifests);
      const oldProblems=new Set(linkProblems(source).map(warningKey));
      const newProblems=linkProblems(site).filter(v=>!oldProblems.has(warningKey(v)));
      if(newProblems.length)throw Error('Новые битые ссылки или якоря: '+
        newProblems.slice(0,3).map(x=>x.path).join(', ')+'. Проверьте разделы и ссылки.');
      return {site,page};
    }
    function renderBlocks(){
      blocks.replaceChildren();
      plan.forEach((id,i)=>{
        const row=document.createElement('div');row.className='cms-blueprint-block';
        const name=document.createElement('span');name.textContent=(i+1)+'. '+(manifests.find(m=>m.id===id)?.label||id);
        const up=button('↑','btn small',()=>{[plan[i-1],plan[i]]=[plan[i],plan[i-1]];renderBlocks();refresh();});
        const down=button('↓','btn small',()=>{[plan[i+1],plan[i]]=[plan[i],plan[i+1]];renderBlocks();refresh();});
        const remove=button('×','btn small',()=>{plan.splice(i,1);renderBlocks();refresh();});
        up.disabled=i===0;down.disabled=i===plan.length-1;
        up.setAttribute('aria-label','Переместить секцию вверх');
        down.setAttribute('aria-label','Переместить секцию вниз');
        remove.setAttribute('aria-label','Удалить секцию из плана');
        row.append(name,up,down,remove);blocks.append(row);
      });
    }
    function renderDevice(){
      desktop.classList.toggle('primary',device==='desktop');
      mobile.classList.toggle('primary',device==='mobile');
      frame.classList.toggle('mobile',device==='mobile');
    }
    function refresh(){
      failure='';candidate=null;apply.disabled=true;
      if(openedRevision!==session.revision)failure='Черновик изменён. Закройте и заново откройте конструктор.';
      else try{
        candidate=build();
        count.textContent=(target.value==='new'?'Новая страница':'В существующую страницу')+
          ' · '+plan.length+' новых секций · один Undo · без публикации';
        frame.srcdoc=window.Stage3Editor.previewDocument(candidate.site,candidate.page.path,device);
        apply.disabled=false;
      }catch(ex){failure=ex.message;}
      if(failure){count.textContent='Сборка ещё не готова';frame.removeAttribute('srcdoc');}
      error.textContent=failure;
    }
    function commit(){
      if(!candidate||apply.disabled||openedRevision!==session.revision)return;
      try{
        if(target.value!=='new'&&operation.value==='replace'&&
          !confirm('Заменить все блоки выбранной страницы? Предыдущая структура останется доступна через Undo до сохранения.'))return;
        // Recompute from current controls at the commit boundary, rather than
        // trusting a stale preview captured before the last keystroke.
        const ready=build();
        session=D.replaceSite(session,manifests,ready.site,openedRevision);
        pageId=ready.page.id;sectionId=ready.page.sections[0].id;
        elementId=ready.page.sections[0].elements[0].id;
        dialog.close();draw();
        notice('Страница собрана целиком за одну операцию Undo. Проверьте тексты, медиа и SEO; сохранение и публикация отдельно.');
      }catch(ex){failure=ex.message;error.textContent=failure;apply.disabled=true;}
    }
    function open(){
      openedRevision=session.revision;device='desktop';
      const selected=current().page;
      addOptions(target,[['new','+ Создать новую страницу'],...session.current.pages.map(p=>[p.id,p.title+' · '+p.path])]);
      target.value=selected.id;
      preset.value='home';
      plan=[...BLUEPRINTS.home.components];
      operation.value='replace';path.disabled=true;operation.disabled=false;
      pageTitle.value=selected.title;path.value=selected.path;
      headline.value=selected.title;description.value='';action.value='Оставить заявку';
      services.value='';seo.value=selected.seo?.description||'';
      renderBlocks();renderDevice();refresh();dialog.showModal();
    }
    preset.addEventListener('change',()=>{plan=[...BLUEPRINTS[preset.value].components];renderBlocks();refresh();});
    target.addEventListener('change',()=>{
      const selected=session.current.pages.find(p=>p.id===target.value);
      if(selected){
        pageTitle.value=selected.title;path.value=selected.path;
        seo.value=selected.seo?.description||'';
      }else{
        pageTitle.value='Новая страница';path.value='/new-page/';seo.value='';
      }
      path.disabled=!!selected;operation.disabled=!selected;refresh();
    });
    pageTitle.addEventListener('input',()=>{
      if(target.value==='new'&&path.value==='/new-page/'){
        const segment=slug(pageTitle.value);if(segment)path.value='/'+segment+'/';
      }
      refresh();
    });
    for(const input of [operation,path,headline,description,action,services,seo])
      input.addEventListener('input',refresh);
    const openButton=button('Собрать страницу','btn small',open);
    openButton.id='cms-blueprint-open';openButton.dataset.editorWrite='true';
    const controls=document.createElement('div');controls.className='structure-tools cms-blueprint-launcher';
    controls.append(openButton);$('pages').before(controls);
  }


  // A single verified-content pass across the site, without silently replacing
  // manually edited copy. Uses contract validation + one SDK Undo transaction.
  function initContentFill(){
    const dlg=document.createElement('dialog');dlg.id='cms-fill-dialog';
    dlg.className='cms-settings-dialog cms-fill-dialog';
    const heading=document.createElement('h2');heading.textContent='Наполнить весь сайт';
    const intro=document.createElement('p');intro.className='subdued';
    intro.textContent='Введите подтверждённые сведения один раз. Мастер подготовит изменения видимых блоков и Design Graph, кнопок и SEO. Ручные тексты и ссылки защищены, скрытые данные не перезаписываются.';
    const layout=document.createElement('div');layout.className='cms-fill-layout';
    const left=document.createElement('div');left.className='cms-fill-fields';
    const right=document.createElement('div');right.className='cms-fill-preview';
    const input=(name,tag='input',limit=0)=>{
      const label=document.createElement('label');label.textContent=name;
      const el=document.createElement(tag);el.className='control';
      if(tag==='input')el.type='text';
      if(tag==='textarea')el.rows=3;
      if(limit)el.maxLength=limit;
      label.append(el);left.append(label);return el;
    };
    const siteName=input('Название компании / сайта','input',130);
    const headline=input('Главный заголовок на главной','input',180);
    const description=input('Подтверждённое описание','textarea',420);
    const offerings=input('Услуги или предложения — по одной строке','textarea',2400);
    const advantages=input('Подтверждённые преимущества — по одной строке','textarea',1800);
    const contactLabel=input('Текст кнопки связи','input',100);
    const contactTarget=input('Куда ведёт кнопка связи','select');
    const settings=document.createElement('label');settings.className='cms-fill-overwrite';
    const overwrite=document.createElement('input');overwrite.type='checkbox';overwrite.id='cms-fill-overwrite';
    settings.append(overwrite,document.createTextNode(' Перезаписывать вручную изменённые поля (не рекомендуется)'));
    left.append(settings);
    const summary=document.createElement('p');summary.id='cms-fill-summary';
    const problem=document.createElement('p');problem.id='cms-fill-error';problem.setAttribute('role','alert');
    const previewPage=document.createElement('select');previewPage.id='cms-fill-page';previewPage.className='control';
    const devices=document.createElement('div');devices.className='cms-fill-devices';
    const desktop=button('ПК','btn small',()=>{device='desktop';preview();});
    const mobile=button('Телефон','btn small',()=>{device='mobile';preview();});
    devices.append(desktop,mobile);
    const frame=document.createElement('iframe');frame.id='cms-fill-frame';
    frame.title='Изолированный предпросмотр массового наполнения сайта';
    frame.setAttribute('sandbox','');frame.setAttribute('referrerpolicy','no-referrer');
    const review=document.createElement('div');review.id='cms-fill-changes';
    right.append(summary,problem,previewPage,devices,frame,review);layout.append(left,right);
    const actions=document.createElement('div');actions.className='cms-settings-actions';
    const apply=button('Применить все изменения','btn primary',commit);apply.id='cms-fill-apply';apply.dataset.editorWrite='true';
    actions.append(apply,button('Закрыть','btn',()=>dlg.close()));
    dlg.append(heading,intro,layout,actions);document.body.append(dlg);
    let openedRevision=0,candidate=null,selectedPage='',device='desktop',changes=[],skipped=0;
    const split=(raw,max,count,label)=>{
      const entries=raw.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
      if(entries.length>count||entries.some(v=>v.length>max))
        throw Error(label+': не более '+count+' строк по '+max+' символов');
      return entries;
    };
    const keyFor=v=>[v.kind,v.pageId,v.sectionId||'',v.path].join('|');
    const broken=site=>C.inspectSite(site,manifests).errors.filter(v=>
      v.kind==='broken-link'||v.kind==='broken-anchor');
    const textSlot=(site,page,section,slot,path,value,caption)=>{
      if(!value)return;
      const manifest=manifests.find(m=>m.id===section.component&&m.version===section.manifestVersion);
      const def=manifest?.elements.find(e=>e.slot===slot)?.fields.find(f=>f.path===path);
      const el=section.elements.find(e=>e.slot===slot);
      if(!def||!el||def.type!=='text'||value.length>def.maxLength)
        throw Error(caption+': текст превышает ограничение компонента');
      const original=el.values[path];
      if(original===value)return;
      if(!overwrite.checked&&original!==def.default&&original!==''){skipped++;return;}
      el.values[path]=value;
      changes.push({pageId:page.id,label:page.title+' · '+caption,before:original,after:value});
    };
    const safeHref=(site,page,section,slot,value)=>{
      if(!value)return;
      const manifest=manifests.find(m=>m.id===section.component&&m.version===section.manifestVersion);
      const def=manifest?.elements.find(e=>e.slot===slot)?.fields.find(f=>f.path==='behavior.href');
      const el=section.elements.find(e=>e.slot===slot);
      if(!def||!el)return;
      const prior=el.values['behavior.href'];
      if(prior===value)return;
      if(!overwrite.checked&&prior!==def.default){skipped++;return;}
      el.values['behavior.href']=value;
      changes.push({pageId:page.id,label:page.title+' · ссылка кнопки',before:prior,after:value});
    };
    function build(){
      changes=[];skipped=0;
      const site=cp(session.current);
      const name=siteName.value.trim(),hero=headline.value.trim(),desc=description.value.trim();
      const offers=split(offerings.value,150,16,'Услуги');
      const facts=split(advantages.value,280,12,'Преимущества');
      const buttonText=contactLabel.value.trim();
      const href=contactTarget.value;
      if(name&&name!==site.title){
        changes.push({pageId:null,label:'Название сайта',before:site.title,after:name});site.title=name;
      }
      const home=site.pages.find(p=>p.path==='/');
      // Graph content is the visible source when a section owns a composition.
      // Apply only confirmed input to actual rendered nodes; never fabricate.
      const placeholder=/^(?:ваш уникальный заголовок|новый элемент|новый текст|все элементы, сетки, отступы|расскажите|укажите|добавьте|заполните|опишите|замените|выберите|пример текста|lorem ipsum)/i;
      let homeHeadingSeen=false;
      for(const page of site.pages){
        let pageTextSeen=false;
        for(const section of page.sections){
          if(section.designGraph){
            const visit=nodes=>{
              for(const node of nodes){
                const set=(key,wanted,label)=>{
                  if(!wanted||node[key]===wanted)return;
                  const before=node[key]||'';
                  if(!overwrite.checked&&before.trim()&&!placeholder.test(before)){
                    skipped++;return;
                  }
                  node[key]=wanted;
                  changes.push({pageId:page.id,label:page.title+' · Design Graph · '+label+' · '+node.id,
                    before,after:wanted});
                };
                if(page===home&&node.type==='heading'&&hero&&!homeHeadingSeen){
                  set('text',hero,'главный заголовок');
                  homeHeadingSeen=true;
                }
                if(node.type==='text'&&desc&&!pageTextSeen){
                  set('text',desc,'описание');pageTextSeen=true;
                }
                if(node.type==='button'){
                  set('text',buttonText,'кнопка');
                  if(href&&node.href!==href){
                    if(overwrite.checked||node.href==='/'){
                      const before=node.href;node.href=href;
                      changes.push({pageId:page.id,label:page.title+' · Design Graph · ссылка '+node.id,
                        before,after:href});
                    }else skipped++;
                  }
                }
                if(node.children)visit(node.children);
              }
            };
            visit(section.designGraph.nodes);
            continue;
          }
          switch(section.component){
            case 'company-hero':
              if(page===home){
                textSlot(site,page,section,'heading','content.text',hero,'Главный заголовок');
                textSlot(site,page,section,'summary','content.text',desc,'Описание первого экрана');
              }
              textSlot(site,page,section,'action','content.text',buttonText,'Основная кнопка');
              safeHref(site,page,section,'action',href);
              break;
            case 'service-grid':
              if(offers.length){
                const defs=manifests.find(m=>m.id===section.component).repeat;
                // Keep existing custom records; expand only when space is
                // needed and never discard existing item data.
                const grow=Math.min(defs.max,Math.max(section.items.length,offers.length));
                for(let i=section.items.length;i<grow;i++){
                  const item=cp(section.items[0]);
                  item.id=section.id+'-item-'+(i+1);
                  item.values=Object.fromEntries(defs.fields.map(f=>[f.path,cp(f.default)]));
                  section.items.push(item);
                  changes.push({pageId:page.id,label:page.title+' · новая карточка услуги',before:'',after:''});
                }
                offers.forEach((value,i)=>{
                  const item=section.items[i],def=defs.fields.find(f=>f.path==='content.title');
                  if(!item||!def)return;
                  const old=item.values['content.title'];
                  if(old===value)return;
                  if(!overwrite.checked&&old!==def.default&&old!==''){skipped++;return;}
                  item.values['content.title']=value;
                  changes.push({pageId:page.id,label:page.title+' · услуга '+(i+1),before:old,after:value});
                });
              }
              break;
            case 'feature-highlights':
              textSlot(site,page,section,'first','content.text',facts[0]||'','Преимущество 1');
              textSlot(site,page,section,'second','content.text',facts[1]||'','Преимущество 2');
              break;
            case 'media-story':
              if(facts.length)textSlot(site,page,section,'copy','content.text',facts.join(' · ').slice(0,900),'История/факты');
              safeHref(site,page,section,'action',href);
              break;
            case 'cta-banner':
              textSlot(site,page,section,'summary','content.text',desc,'Описание CTA');
              textSlot(site,page,section,'primary','content.text',buttonText,'Текст CTA');
              safeHref(site,page,section,'primary',href);
              break;
            case 'contact-panel':
              textSlot(site,page,section,'action','content.text',buttonText,'Контактная кнопка');
              safeHref(site,page,section,'action',href);
              break;
          }
        }
        if(desc){
          const seo=page.seo;
          const next=page===home?desc:
            (page.title+'. '+desc).slice(0,300);
          if(!seo){
            page.seo={title:'',description:next,robots:'index',ogTitle:'',ogDescription:'',ogImage:''};
            changes.push({pageId:page.id,label:page.title+' · SEO',before:'',after:next});
          }else if(seo.description!==next&&
            (overwrite.checked||!seo.description.trim())){
            const old=seo.description;seo.description=next;
            changes.push({pageId:page.id,label:page.title+' · SEO',before:old,after:next});
          }else if(seo.description!==next)skipped++;
        }
      }
      C.validateSite(site,manifests);
      const oldErrors=new Set(broken(session.current).map(keyFor));
      const extra=broken(site).filter(x=>!oldErrors.has(keyFor(x)));
      if(extra.length)throw Error('Новые битые ссылки или якоря: '+extra.slice(0,3).map(x=>x.path).join(', '));
      return site;
    }
    function preview(){
      if(!candidate)return;
      const page=candidate.pages.find(p=>p.id===selectedPage)||candidate.pages[0];
      selectedPage=page.id;previewPage.value=page.id;
      frame.classList.toggle('mobile',device==='mobile');
      desktop.classList.toggle('primary',device==='desktop');
      mobile.classList.toggle('primary',device==='mobile');
      frame.srcdoc=window.Stage3Editor.previewDocument(candidate,page.path,device);
    }
    function refresh(){
      candidate=null;apply.disabled=true;review.replaceChildren();
      problem.textContent='';summary.textContent='';
      try{
        if(openedRevision!==session.revision)throw Error('Черновик изменился; откройте мастер заново');
        candidate=build();
        const first=selectedPage||pageId;
        previewPage.replaceChildren();
        for(const page of candidate.pages){
          const o=document.createElement('option');o.value=page.id;
          o.textContent=page.title+' · '+page.path+' · '+changes.filter(c=>c.pageId===page.id).length+' изменений';
          previewPage.append(o);
        }
        selectedPage=candidate.pages.find(p=>p.id===first)?.id||candidate.pages[0].id;
        summary.textContent=changes.length+' изменений на '+new Set(changes.filter(c=>c.pageId).map(c=>c.pageId)).size+
          ' страницах · '+skipped+' защищённых полей · одна операция Undo · публикации нет';
        for(const change of changes.slice(0,40)){
          const row=document.createElement('p');row.textContent=change.label+
            (change.after?' → '+change.after.slice(0,110):'');review.append(row);
        }
        if(changes.length>40){
          const note=document.createElement('small');note.textContent='И ещё '+(changes.length-40)+' изменений';
          review.append(note);
        }
        apply.disabled=!changes.length;preview();
      }catch(ex){problem.textContent=ex.message;frame.removeAttribute('srcdoc');}
    }
    function commit(){
      if(!candidate||apply.disabled||openedRevision!==session.revision)return;
      try{
        if(overwrite.checked&&!confirm('Перезаписать ранее введённые вручную данные? Все изменения можно отменить через Undo до сохранения.'))return;
        const site=build();
        if(!changes.length)return;
        session=D.replaceSite(session,manifests,site,openedRevision);
        dlg.close();draw();
        notice('Сведения распределены по страницам одной операцией Undo. Сохранение и публикация отдельно.');
      }catch(ex){problem.textContent=ex.message;apply.disabled=true;}
    }
    function open(){
      openedRevision=session.revision;selectedPage=pageId;device='desktop';
      siteName.value=session.current.title;
      headline.value='';description.value='';offerings.value='';advantages.value='';
      contactLabel.value='';overwrite.checked=false;
      contactTarget.replaceChildren();
      const available=[['','Не изменять ссылку']];
      for(const page of session.current.pages)for(const section of page.sections)
        if(['lead-form-flex','lead-form'].includes(section.component))
          available.push([page.path+'#'+section.id,'Форма: '+page.title]);
      for(const [value,label] of available){
        const opt=document.createElement('option');opt.value=value;opt.textContent=label;contactTarget.append(opt);
      }
      contactTarget.value='';refresh();dlg.showModal();
    }
    previewPage.addEventListener('change',()=>{selectedPage=previewPage.value;preview();});
    for(const control of [siteName,headline,description,offerings,advantages,contactLabel,contactTarget,overwrite])
      control.addEventListener('input',refresh);
    const launch=button('Наполнить сайт','btn small',open);launch.id='cms-fill-open';
    launch.dataset.editorWrite='true';
    const tools=document.createElement('div');tools.className='structure-tools';
    tools.append(launch);$('pages').before(tools);
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
    initSiteTokensManager();
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
    const stepPanel=document.createElement('section');stepPanel.id='cms-form-steps';stepPanel.className='cms-form-simulator';
    const simulator=document.createElement('section');simulator.id='cms-form-simulator';simulator.className='cms-form-simulator';
    const simTitle=document.createElement('h3');simTitle.textContent='Проверка формы перед сохранением';
    const simNote=document.createElement('p');simNote.textContent='Выберите варианты и заполните поля: условные вопросы появятся или исчезнут, а обязательные будут отмечены. Это только симуляция в редакторе, данные никуда не отправляются.';
    const simFields=document.createElement('div');simFields.id='cms-form-sim-fields';
    const simStatus=document.createElement('p');simStatus.id='cms-form-sim-status';simStatus.setAttribute('role','status');
    simulator.append(simTitle,simNote,simFields,simStatus);
    const apply=button('Применить к черновику','btn primary',()=>{});apply.id='cms-form-apply';
    const cancel=button('Закрыть','btn',()=>dlg.close());
    dlg.append(title,description,presetBar,list,add,stepPanel,simulator,apply,cancel);document.body.append(dlg);
    let source,fields,answers={},stepEnabled=false,stepCount=2,stepTitles=[],stepAssignments={};
    function availableStepFields(){
      const all=[['name','Имя'],['email','Email'],['message','Сообщение']];
      for(const [i,slot] of ['extra-one','extra-two','extra-three'].entries()){
        const value=source.elements.find(e=>e.slot===slot)?.values;
        if(value&&value['behavior.kind']!=='off')all.push(['extra'+(i+1),value['content.text']]);
      }
      for(const field of fields)all.push([field.id,field.label||field.id]);
      return all;
    }
    function drawSteps(){
      stepPanel.replaceChildren();
      const heading=document.createElement('h3');heading.textContent='Многошаговая форма';
      const description=document.createElement('p');
      description.textContent='При включении распределите все поля по 2–4 шагам. Заявка отправится только после последнего шага. Без JavaScript посетитель увидит все поля сразу.';
      const toggleLabel=document.createElement('label');
      const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=stepEnabled;
      toggle.addEventListener('change',()=>{stepEnabled=toggle.checked;drawSteps();});
      toggleLabel.append(toggle,document.createTextNode(' Включить шаги'));
      stepPanel.append(heading,description,toggleLabel);
      if(!stepEnabled)return;
      const countLabel=document.createElement('label');countLabel.textContent='Количество шагов ';
      const count=document.createElement('select');count.className='control';
      for(let i=2;i<=4;i++){
        const option=document.createElement('option');option.value=String(i);option.textContent=String(i);
        count.append(option);
      }
      count.value=String(stepCount);
      count.addEventListener('change',()=>{
        stepCount=Number(count.value);
        for(const key of Object.keys(stepAssignments))
          if(stepAssignments[key]>=stepCount)stepAssignments[key]=stepCount-1;
        drawSteps();
      });
      countLabel.append(count);stepPanel.append(countLabel);
      for(let index=0;index<stepCount;index++){
        const label=document.createElement('label');label.textContent='Название шага '+(index+1);
        const field=document.createElement('input');field.className='control';field.type='text';field.maxLength=60;
        field.value=stepTitles[index]||'Шаг '+(index+1);
        field.addEventListener('input',()=>{stepTitles[index]=field.value;});
        label.append(field);stepPanel.append(label);
      }
      for(const [id,labelText] of availableStepFields()){
        const label=document.createElement('label');label.textContent=labelText+' ('+id+') ';
        const selector=document.createElement('select');selector.className='control';
        for(let i=0;i<stepCount;i++){
          const option=document.createElement('option');option.value=String(i);
          option.textContent='Шаг '+(i+1);selector.append(option);
        }
        const fallback=id==='name'||id==='email'?0:stepCount-1;
        const selected=stepAssignments[id]??fallback;
        selector.value=String(Math.min(selected,stepCount-1));
        selector.addEventListener('change',()=>{stepAssignments[id]=Number(selector.value);});
        label.append(selector);stepPanel.append(label);
      }
      const note=document.createElement('small');
      note.textContent='Каждый шаг должен содержать хотя бы одно поле. Условный вопрос не может идти раньше списка, от которого он зависит. Эти ограничения проверяются при применении.';
      stepPanel.append(note);
    }
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
      drawSteps();
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
        if(stepEnabled){
          const entries=availableStepFields(),groups=Array.from({length:stepCount},(_,i)=>({
            title:stepTitles[i]||'Шаг '+(i+1),fields:[]
          }));
          for(const [id] of entries){
            const position=stepAssignments[id]??(id==='name'||id==='email'?0:stepCount-1);
            groups[Math.min(position,stepCount-1)].fields.push(id);
          }
          section.formSteps=groups;
        }else delete section.formSteps;
        session=D.replaceSite(session,manifests,site,session.revision);
        dlg.close();draw();notice('Форма обновлена в черновике одной операцией Undo. Сохранение и публикация отдельно.');
      }catch(e){notice('Изменение полей отклонено: '+e.message,true);}
    });
    return ()=>{
      const section=current().section;
      if(section.component!=='lead-form-flex')return;
      const focus=dlg.dataset.focusField||'';
      delete dlg.dataset.focusField;
      source=cp(section);fields=cp(section.formFields||[]);answers={};preset.value='';
      stepEnabled=Array.isArray(section.formSteps)&&section.formSteps.length>0;
      stepCount=stepEnabled?section.formSteps.length:2;
      stepTitles=stepEnabled?section.formSteps.map(s=>s.title):['Контакты','Детали заявки'];
      stepAssignments={};
      for(const [i,step] of (section.formSteps||[]).entries())
        for(const id of step.fields)stepAssignments[id]=i;
      render();dlg.showModal();
      if(focus){
        const target=[...list.querySelectorAll('[data-form-field]')]
          .find(row=>row.dataset.formField===focus);
        if(target){
          target.classList.add('cms-form-row-selected');
          target.scrollIntoView({block:'center'});
          const first=target.querySelector('input');
          first?.focus({preventScroll:true});
        }
      }
    };
  })();

  function drawElements(){
    const {section}=current(),m=manifest(section);
    $('inspector-title').textContent=m?.label||section.component;
    $('inspector-caption').textContent='ID '+section.id+' · схема '+section.manifestVersion;
    const row=$('elements');row.replaceChildren();
    if(section.component==='lead-form-flex'){
      const builder=button('Поля и шаги формы · '+(section.formFields||[]).length+'/9'+(section.formSteps?' · '+section.formSteps.length+' шага(ов)':''),
        'btn small',openFormBuilder);
      builder.id='cms-form-builder-open';builder.dataset.editorWrite='true';row.append(builder);
    }
    section.elements.forEach(e=>{
      const label=m.elements.find(s=>s.slot===e.slot)?.label||e.slot;
      row.append(button(label,'element'+(e.id===elementId?' active':''),
        ()=>{elementId=e.id;drawElements();drawFields();}));
    });
    if(m.repeat){
      const faq=section.component==='faq-accordion';
      const noun=faq?'вопрос':'карточку';
      const label=document.createElement('small');label.className='field-path';
      label.textContent=(faq?'ВОПРОСЫ FAQ':'ПОВТОРЯЕМЫЕ ЭЛЕМЕНТЫ')+' · '+
        section.items.length+'/'+m.repeat.max+
        (section.items.length<=m.repeat.min?' · минимум '+m.repeat.min:'');
      row.append(label);
      section.items.forEach((item,i)=>{
        const headline=item.values['content.title']||item.values['content.question']||
          item.values['content.author']||item.values['content.caption']||
          (faq?'Вопрос ':'Карточка ')+(i+1);
        const line=document.createElement('div');line.className='cms-repeat-row';
        const choice=button((i+1)+'. '+String(headline).slice(0,56),'element'+(item.id===elementId?' active':''),
          ()=>{elementId=item.id;drawElements();drawFields();});
        choice.dataset.repeatId=item.id;line.append(choice);
        const op=(title,label,action,disabled=false,more={})=>{
          const control=button(title,'btn small',()=>operateRepeat(action,item.id,more));
          control.title=label;control.setAttribute('aria-label',label+' '+(i+1));
          control.disabled=disabled;line.append(control);
        };
        op('↑','Поднять '+noun,'moveItem',i===0,{delta:-1});
        op('↓','Опустить '+noun,'moveItem',i===section.items.length-1,{delta:1});
        op('⧉','Копировать '+noun,'duplicateItem',section.items.length>=m.repeat.max);
        op('×','Удалить '+noun,'removeItem',section.items.length<=m.repeat.min);
        row.append(line);
      });
      const add=button(faq?'+ Добавить вопрос':'+ Добавить карточку','btn small',
        ()=>operateRepeat('addItem',null));
      add.id='cms-repeat-add';add.disabled=section.items.length>=m.repeat.max;row.append(add);
    }
  }
  function operateRepeat(action,itemId,extra={}){
    if(action==='removeItem'&&!confirm('Удалить выбранный повторяемый элемент из черновика? Его можно вернуть кнопкой «Отменить».'))return;
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
      const previousRevision=session.revision;
      session=D.edit(session,manifests,{
        pageId,sectionId,elementId,path:field.path,value,
        breakpoint:field.responsive?breakpoint:null,expectedRevision:session.revision
      });
      output.textContent='';
      // A native blur/change often arrives again after the explicit change
      // event. Redrawing controls for a no-op destroys the button under the
      // pointer before its click dispatch (notably FAQ move/delete buttons).
      // No document mutation means no UI redraw is needed.
      if(session.revision===previousRevision)return;
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
        const src=asset?previewImageUrl(asset.id):null;
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
        const photo=asset?previewImageUrl(asset.id):null;
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
      const photo=item?previewImageUrl(item.id):null;
      const visual=photo?'<img class="showcase-preview" src="'+e(photo)+'" alt="'+e(item.alt)+'">':
        '<div class="media-placeholder">Добавьте фотографию из медиабиблиотеки</div>';
      content='<section class="features"><div class="cms-preview-grid"><div><h2>'+e(title.title)+'</h2>'+
        '<p>'+e(p('copy').content.text)+'</p><span class="action">'+e(p('action').content.text)+'</span></div>'+
        '<div>'+visual+'</div></div></section>';
    }else if(block.component==='partner-logos'){
      const entries=block.items.map(item=>{
        const asset=session.current.assets.find(x=>x.id===item.props.content.media);
        const photo=asset?previewImageUrl(asset.id):null;
        return '<div class="card">'+(photo?'<img class="showcase-preview" src="'+e(photo)+'" alt="'+e(asset.alt)+'">':
          '<div class="media-placeholder">Логотип не выбран</div>')+
          '<strong>'+e(item.props.content.caption)+'</strong></div>';
      });
      content='<section class="features"><h2>'+e(title.title)+'</h2><div class="cms-preview-grid">'+entries.join('')+'</div></section>';
    }else if(block.component==='image-showcase'){
      const mediaId=p('photo').content.media||'';
      const asset=session.current.assets.find(x=>x.id===mediaId);
      const data=asset?previewImageUrl(asset.id):null;
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
      assetId=>previewImageUrl(assetId),block.sectionId,
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
    previewDocument:(site,path,device='desktop',assetSources=null)=>{
      if(!C.BREAKPOINTS.includes(device))throw Error('Invalid preview breakpoint');
      const checked=C.validateSite(site,manifests),prior=session,priorSources=previewAssetSources;
      try{
        if(assetSources!==null){
          if(!assetSources||typeof assetSources!=='object'||Array.isArray(assetSources))
            throw Error('Invalid local preview media');
          previewAssetSources=assetSources;
        }else previewAssetSources=null;
        session=D.begin(checked,manifests);
        const page=checked.pages.find(p=>p.path===path)||checked.pages[0];
        const docs=page.sections.map(s=>screen(D.blockPreview(session,manifests,page.id,s.id,device)));
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
      }finally{session=prior;previewAssetSources=priorSources;}
    },
    applyComposition:site=>{
      session=D.replaceSite(session,manifests,site,session.revision);draw();
    },
    openComposition:site=>{
      session=D.begin(site,manifests);versions=[];savedBytes='';
      pageId=site.pages[0].id;sectionId=site.pages[0].sections[0].id;elementId=site.pages[0].sections[0].elements[0].id;draw();
    },
    getSite:()=>cp(session.current),
    launchReadiness,
    focusLaunchIssue,
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
  initContentWorkbench();initSiteMap();initPageBlueprint();initContentFill();createStructureTools();initSettings();initMenuEditor();initSiteQuality();initFullPagePreview();load();restoreInteropSession();draw();
})();