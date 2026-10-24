'use strict';
// All edits stay in this explicit local browser session. No fetch, API, telemetry,
// provider credentials, form submission, deployment or auto-publishing.
(()=>{
  const C=CONTRACT,D=DRAFT,manifests=MANIFESTS,starter=FIXTURE;
  const HOSTED=document.documentElement.dataset.stage3Mode==='server';
  const $=id=>document.getElementById(id),cp=x=>structuredClone(x);
  const STORAGE='manufact-ai-site-stage3-local-revisions-v1';
  const MAX_VERSIONS=12,MAX_UPLOAD=900000;
  const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeText=v=>v===undefined||v===null?'':String(v);
  let session=D.begin(starter,manifests),pageId=session.current.pages[0].id,
    sectionId=session.current.pages[0].sections[0].id,
    elementId=session.current.pages[0].sections[0].elements[0].id,
    breakpoint='desktop',savedBytes=JSON.stringify(session.current),versions=[];
  function notice(message,error=false){
    const node=$('toast');node.textContent=message;node.hidden=false;node.className='toast'+(error?' error':'');
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
      session=D.structure(session,manifests,{...command,expectedRevision:session.revision});
      const selected=session.current.pages.find(x=>x.id===pageId);
      if(!selected){pageId=session.current.pages[0].id;sectionId='';}
      const page=session.current.pages.find(x=>x.id===pageId);
      if(!page.sections.some(x=>x.id===sectionId))sectionId=page.sections[0].id;
      if(![...page.sections.find(x=>x.id===sectionId).elements,...(page.sections.find(x=>x.id===sectionId).items||[])].some(x=>x.id===elementId))
        elementId=page.sections.find(x=>x.id===sectionId).elements[0].id;
      draw();
      if(before!==session.current)notice('Структура изменена в черновике. Для сохранения нажмите «Сохранить».');
    }catch(e){notice('Изменение структуры отклонено: '+e.message,true);}
  }

  // Closed global theme and per-page SEO/menu editing: one undoable site-document change.
  function initSettings(){
    const dlg=document.createElement('dialog');dlg.className='cms-settings-dialog';dlg.id='cms-settings-dialog';
    const header=document.createElement('h2'),tip=document.createElement('small'),grid=document.createElement('div');
    grid.className='cms-settings-grid';const actions=document.createElement('div');actions.className='cms-settings-actions';
    const fields={},themeKeys=['background','surface','text','primary','font','maxWidth'];
    const metaKeys=['seo-title','seo-description','seo-robots','nav-label','nav-hidden'];
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
    add('seo-title','SEO title (пустое — автоматически)','text',160);
    add('seo-description','Описание для поисковиков (до 300 символов)','text',300);
    const robots=add('seo-robots','Индексация страницы','select');
    for(const [value,text] of [['index','Разрешить'],['noindex','Не индексировать']]){
      const option=document.createElement('option');option.value=value;option.textContent=text;robots.append(option);
    }
    add('nav-label','Название в меню (необязательно)','text',100);
    add('nav-hidden','Скрыть из меню','checkbox');
    let mode='theme',chosenPage=null;
    const open=kind=>{
      mode=kind;chosenPage=current().page.id;
      header.textContent=kind==='theme'?'Глобальные стили сайта':'SEO и меню · '+current().page.title;
      tip.textContent=kind==='theme'?'Для всех страниц; явные параметры компонентов сохраняются.':
        'Только текущая страница; публикация отдельно.';
      grid.querySelectorAll('label').forEach(n=>n.hidden=true);
      for(const key of (kind==='theme'?themeKeys:metaKeys))fields[key].parentElement.hidden=false;
      if(kind==='theme'){
        const t={...C.DEFAULT_THEME,...session.current.theme};
        for(const key of themeKeys)fields[key].value=t[key];
      }else{
        const p=current().page,seo=p.seo||{},nav=p.navigation||{};
        fields['seo-title'].value=seo.title||'';
        fields['seo-description'].value=seo.description||'';
        fields['seo-robots'].value=seo.robots||'index';
        fields['nav-label'].value=nav.label||'';
        fields['nav-hidden'].checked=!!nav.hidden;
      }
      dlg.showModal();
    };
    const apply=()=>{
      try{
        const site=cp(session.current);
        if(mode==='theme'){
          site.theme={background:fields.background.value,surface:fields.surface.value,
            text:fields.text.value,primary:fields.primary.value,font:fields.font.value,
            maxWidth:Number(fields.maxWidth.value)};
        }else{
          const p=site.pages.find(p=>p.id===chosenPage);
          if(!p)throw Error('Страница уже удалена');
          p.seo={title:fields['seo-title'].value,description:fields['seo-description'].value,robots:fields['seo-robots'].value};
          p.navigation={label:fields['nav-label'].value,hidden:fields['nav-hidden'].checked};
        }
        session=D.replaceSite(session,manifests,site,session.revision);dlg.close();draw();
        notice('Настройки изменены в черновике. Сохранение и публикация отдельно.');
      }catch(e){notice('Настройки отклонены: '+e.message,true);}
    };
    const ok=button('Применить к черновику','btn primary',apply);ok.id='cms-settings-apply';
    const close=button('Закрыть','btn',()=>dlg.close());close.id='cms-settings-close';
    actions.append(ok,close);dlg.append(header,tip,grid,actions);document.body.append(dlg);
    const tools=document.createElement('div');tools.className='structure-tools cms-site-settings';
    const theme=button('Стили сайта','btn small',()=>open('theme'));theme.id='cms-open-theme';
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
    notes.textContent='Перенаправления начнут работать только после публикации. Для отдельного HTML-хостинга экспортируются страницы-переходы; настоящий HTTP 301 требует настройки хостинга.';
    const close=button('Закрыть','btn',()=>dialog.close());
    dialog.append(heading,summary,findings,subtitle,aliases,form,notes,close);
    document.body.append(dialog);
    const print=()=>{
      const report=C.inspectSite(session.current,manifests);
      summary.textContent=report.pages+' страниц · '+report.indexable+' индексируемых · '+
        report.errors.length+' ошибок ссылок · '+report.warnings.length+' рекомендаций · '+
        report.redirects+' перенаправлений';
      findings.replaceChildren();
      for(const [name,records] of [['Ошибки',report.errors],['Рекомендации',report.warnings]]){
        const section=document.createElement('section');
        const label=document.createElement('strong');label.textContent=name+' · '+records.length;section.append(label);
        if(!records.length){const note=document.createElement('p');note.textContent='Нет замечаний';section.append(note);}
        for(const issue of records.slice(0,80)){
          const line=document.createElement('p');line.className='cms-quality-finding';
          line.textContent=(issue.pageId||'Сайт')+' · '+issue.path+' — '+issue.message;section.append(line);
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
    const heading=document.createElement('h2');heading.textContent='Предпросмотр всей страницы';
    const pathSelect=document.createElement('select');pathSelect.className='control';
    pathSelect.id='cms-page-preview-path';pathSelect.setAttribute('aria-label','Страница сайта');
    const frameMode=document.createElement('div');frameMode.className='cms-page-preview-modes';
    const area=document.createElement('div');area.className='cms-page-preview-area';
    const frame=document.createElement('iframe');frame.id='cms-page-preview-frame';
    frame.setAttribute('sandbox','');frame.title='Изолированный предпросмотр всей страницы';
    frame.setAttribute('referrerpolicy','no-referrer');area.append(frame);
    let mode='desktop';
    const render=()=>{
      const path=pathSelect.value;
      frame.style.width=mode==='mobile'?'390px':mode==='tablet'?'768px':'100%';
      frame.srcdoc=window.Stage3Editor.previewDocument(session.current,path);
    };
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
    note.textContent='Предпросмотр только черновика · без выполнения скриптов, без отправки заявок и без публикации.';
    modal.append(header,note,area);document.body.append(modal);
    const open=button('Вся страница','btn small',()=>{
      pathSelect.replaceChildren();
      for(const page of session.current.pages){
        const option=document.createElement('option');option.value=page.path;
        option.textContent=page.title+' · '+page.path;pathSelect.append(option);
      }
      pathSelect.value=current().page.path;
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
      pick('button','Оформление кнопок',[['default','Стандартные'],['outline','Контурные'],['pill','Округлые']]),
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
  function createStructureTools(){
    const openAppearance=initAppearanceEditor();
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

  // Additive validated form builder; edits keep existing manifests and Undo.
  const openFormBuilder=(()=>{
    const dlg=document.createElement('dialog');dlg.id='cms-form-builder';dlg.className='cms-settings-dialog';
    Object.assign(dlg.style,{width:'min(960px,95vw)',maxHeight:'88vh',overflow:'auto'});
    const title=document.createElement('h2');title.textContent='Дополнительные поля формы';
    const description=document.createElement('p');description.textContent='До 6 полей сверх трёх встроенных. Условия зависят от выбранного значения предыдущего списка; проверяются сервером.';
    const list=document.createElement('div');list.id='cms-form-rows';
    const add=button('+ Добавить поле','btn small',()=>{});add.id='cms-form-add';
    const apply=button('Применить к черновику','btn primary',()=>{});apply.id='cms-form-apply';
    const cancel=button('Закрыть','btn',()=>dlg.close());
    dlg.append(title,description,list,add,apply,cancel);document.body.append(dlg);
    let source,fields;
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
    function render(){
      list.replaceChildren();add.disabled=fields.length>=6;
      const selectable=new Map();
      ['extra-one','extra-two','extra-three'].forEach((slot,i)=>{
        const values=source.elements.find(e=>e.slot===slot)?.values;
        if(values?.['behavior.kind']==='select')
          selectable.set('extra'+(i+1),values['content.options'].split(/\r?\n/).map(s=>s.trim()).filter(Boolean));
      });
      fields.forEach((field,i)=>{
        const row=document.createElement('fieldset');row.dataset.formField=field.id;
        Object.assign(row.style,{border:'1px solid #586c87',borderRadius:'12px',padding:'12px',margin:'10px 0'});
        const legend=document.createElement('legend');legend.textContent=(i+1)+'. '+field.id;
        const grid=document.createElement('div');
        Object.assign(grid.style,{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:'10px'});
        const [label,ln]=input('Подпись','text',field.label,v=>{field.label=v;});ln.maxLength=100;
        const [kind,kn]=input('Тип','select',null,v=>{
          field.kind=v;field.options=v==='select'?['Вариант 1','Вариант 2']:[];render();
        });
        options(kn,[['text','Текст'],['tel','Телефон'],['email','Email'],['select','Список'],['textarea','Длинный текст']]);
        kn.value=field.kind;
        const [required]=input('Обязательно','checkbox',field.required,v=>{field.required=v;});
        const [placeholder,pn]=input('Подсказка','text',field.placeholder,v=>{field.placeholder=v;});
        pn.maxLength=120;
        grid.append(label,kind,required,placeholder);
        if(field.kind==='select'){
          const [choices,cn]=input('Варианты (один на строку)','textarea',field.options.join('\n'),v=>{
            field.options=v.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);render();
          });
          cn.rows=3;grid.append(choices);
        }
        const [when,wn]=input('Условие видимости','select',null,v=>{
          if(v){const [name,n]=v.split('|');field.when={field:name,option:Number(n)};}
          else delete field.when;
        });
        const choices=[['','Всегда показывать']];
        for(const [name,values] of selectable)
          values.forEach((v,j)=>choices.push([name+'|'+(j+1),name+' → '+v]));
        options(wn,choices);wn.value=field.when?field.when.field+'|'+field.when.option:'';
        grid.append(when);
        const ops=document.createElement('div');ops.className='structure-tools';
        ops.append(button('↑','btn small',()=>{if(i>0){[fields[i-1],fields[i]]=[fields[i],fields[i-1]];render();}}));
        ops.append(button('↓','btn small',()=>{if(i+1<fields.length){[fields[i+1],fields[i]]=[fields[i],fields[i+1]];render();}}));
        ops.append(button('Удалить','btn small',()=>{fields.splice(i,1);render();}));
        row.append(legend,grid,ops);list.append(row);
        if(field.kind==='select')selectable.set(field.id,field.options);
      });
    }
    add.addEventListener('click',()=>{
      if(fields.length>=6)return;
      fields.push({id:uniqueId('field-f'),label:'Новый вопрос',kind:'text',
        required:false,options:[],placeholder:''});render();
    });
    apply.addEventListener('click',()=>{
      try{
        const site=cp(session.current);
        const section=site.pages.flatMap(p=>p.sections).find(s=>s.id===source.id);
        if(!section||section.component!=='lead-form-flex')throw Error('Форма отсутствует');
        section.formFields=cp(fields);
        session=D.replaceSite(session,manifests,site,session.revision);
        dlg.close();draw();notice('Конструктор обновлён в черновике. Сохранение и публикация отдельно.');
      }catch(e){notice('Изменение полей отклонено: '+e.message,true);}
    });
    return ()=>{
      const section=current().section;
      if(section.component!=='lead-form-flex')return;
      source=cp(section);fields=cp(section.formFields||[]);render();dlg.showModal();
    };
  })();

  function drawElements(){
    const {section}=current(),m=manifest(section);
    $('inspector-title').textContent=m?.label||section.component;
    $('inspector-caption').textContent='ID '+section.id+' · схема '+section.manifestVersion;
    const row=$('elements');row.replaceChildren();
    if(section.component==='lead-form-flex'){
      const builder=button('Конструктор дополнительных полей · '+(section.formFields||[]).length+'/6',
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
    const palette='<style>:root{--cms-bg:'+e(t.background)+';--cms-surface:'+e(t.surface)+
      ';--cms-text:'+e(t.text)+';--cms-primary:'+e(t.primary)+';--cms-width:'+t.maxWidth+
      'px;--cms-font:'+(t.font==='georgia'?'Georgia,serif':'Arial,sans-serif')+'}'+
      'body{background:var(--cms-bg)!important;color:var(--cms-text)!important;font-family:var(--cms-font)!important}'+
      '.action{background:var(--cms-primary)!important}.card{background:var(--cms-surface)!important}'+
      'section{max-width:var(--cms-width);margin-inline:auto}</style>';
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
      const configured=(block.formFields||[]).map(field=>
        '<label>'+e(field.label)+(field.required?' *':'')+'</label>'+
        '<div class="media-placeholder">'+e(field.kind)+
        (field.when?' · '+e(field.when.field)+' / вариант '+field.when.option:'')+'</div>').join('');
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
      '.cms-button-outline>section .action{background:transparent!important;color:var(--cms-primary)!important;box-shadow:inset 0 0 0 2px currentColor}'+
      '.cms-button-pill>section .action{border-radius:999px!important}'+
      '.cta-banner{background:var(--cms-surface);min-height:0;text-align:inherit}.cta-banner p{max-width:650px}.cta-actions{display:flex;flex-wrap:wrap;gap:12px}.cta-actions .secondary{background:transparent!important;color:var(--cms-primary);box-shadow:inset 0 0 0 2px currentColor}'+
      '@media(max-width:600px){.cms-mobile-align-left>section{text-align:left!important}.cms-mobile-align-center>section{text-align:center!important}'+
      '.cms-mobile-spacing-tight>section{padding-top:24px!important;padding-bottom:24px!important}'+
      '.cms-mobile-spacing-normal>section{padding-top:40px!important;padding-bottom:40px!important}'+
      '.cms-mobile-spacing-airy>section{padding-top:72px!important;padding-bottom:72px!important}}</style>';
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8">'+
      '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;none&#39;; img-src &#39;'+(HOSTED?'data:':'none')+'&#39;; style-src &#39;unsafe-inline&#39;; connect-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;">'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<style>*{box-sizing:border-box}body{margin:0;background:#fcfdfd;color:#1b3046;font:15px/1.6 Arial,sans-serif}section{padding:70px clamp(18px,7%,80px);min-height:470px}.kicker{display:block;color:#167c6a;font:700 11px Arial;letter-spacing:.15em;margin-bottom:19px}h1{line-height:1.12;letter-spacing:-.045em;max-width:850px;margin:10px 0 25px;overflow-wrap:anywhere}h2{font-size:clamp(29px,4vw,52px);line-height:1.16;letter-spacing:-.03em;margin:12px 0 30px}p{font-size:17px;max-width:630px;line-height:1.65}.hero{background:radial-gradient(circle at 90% 25%,#d9f6e6 0%,transparent 44%),linear-gradient(115deg,#f9fdfb,#e9f1f5)}.decor{color:#80a6b2;font-size:11px;letter-spacing:.15em;text-align:right}.action{display:inline-flex;margin-top:24px;gap:35px;border-radius:9px;background:#142e3c;color:white;padding:14px 20px;font-weight:700;font-size:14px}.features{background:#f2f7f8}.cards{display:grid;grid-template-columns:1fr 1fr;gap:15px}.card{border:1px solid #dce6e9;border-radius:14px;padding:26px;background:white}.card strong{color:#1a8b76}.card p{font-size:17px;overflow-wrap:anywhere}.media-placeholder{padding:80px 20px;background:#e7eff2;border:1px dashed #91a8b1;text-align:center;border-radius:12px}.showcase-preview{display:block;width:100%;height:auto;max-height:520px;object-fit:contain;border-radius:12px}.contact{background:linear-gradient(130deg,#effbf6,#e8f1f7)}.contact small{display:block;color:#5c7180;margin-top:25px}.contact .action{background:#0a766b}@media(max-width:650px){section{padding:46px 25px;min-height:450px}.cards{grid-template-columns:1fr}h1{line-height:1.12}h2{font-size:32px}p{font-size:15px}.card{padding:20px}}</style>'+
      '<style>.cms-pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:16px;margin:20px 0}.cms-pricing-card{display:flex;flex-direction:column;gap:7px}.cms-pricing-card.is-featured{border:2px solid var(--cms-primary)}.cms-pricing-card h3,.cms-pricing-card p{margin:0}.cms-pricing-price{font-size:28px!important;font-weight:800;color:var(--cms-primary)}.cms-pricing-period{font-size:13px!important;opacity:.75}.cms-pricing-card ul{padding-left:20px;white-space:normal}.cms-pricing-card .action{margin-top:auto}.cms-process-list{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(235px,100%),1fr));padding:0;gap:14px}.cms-process-step{display:flex;gap:14px}.cms-process-number{font-size:21px;color:var(--cms-primary);font-weight:800}.cms-compare-scroll{overflow-x:auto;max-width:100%;border:1px solid #d4e1e9;border-radius:14px}.cms-compare-scroll table{border-collapse:collapse;min-width:490px;width:100%;background:var(--cms-surface)}.cms-compare-scroll caption{font-size:27px;font-weight:700;text-align:left;padding:16px}.cms-compare-scroll th,.cms-compare-scroll td{border-bottom:1px solid #d2dce5;padding:12px 16px;text-align:left}.cms-compare-scroll thead th{background:#edf3f9}.cms-switcher{border:0;display:flex;flex-wrap:wrap;gap:9px;padding:0}.cms-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.cms-switcher-radio{position:absolute;opacity:0;width:1px;height:1px}.cms-switcher-tab{padding:11px 15px;border:1px solid #bfccd8;border-radius:9px;cursor:pointer;background:white}.cms-switcher-radio:checked+.cms-switcher-tab{background:var(--cms-primary);color:white}.cms-switcher-radio:focus-visible+.cms-switcher-tab{outline:3px solid var(--cms-primary);outline-offset:2px}.cms-switcher-panels{flex-basis:100%;margin-top:14px}.cms-switcher-panel{display:none;padding:22px!important;min-height:0!important;border:1px solid #d7e1e9;border-radius:12px;background:white}.cms-switcher-panel p{white-space:pre-line}</style>'+
      '<style>.cms-preview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:16px}.cms-preview-grid .card{margin:0}.cms-preview-grid h3{margin:5px 0 10px}.cms-preview-faq details{background:var(--cms-surface);border:1px solid #dce6e9;border-radius:10px;padding:15px;margin-block:10px}.cms-preview-faq summary{cursor:pointer;font-weight:700}.cms-preview-grid figcaption{margin-top:10px}</style>'+palette+skinCss+'</head><body>'+content+'</body></html>';
  }
  function drawPreview(){
    const {page,section}=current(),m=manifest(section);
    $('canvas-title').textContent=m?.label||section.component;
    $('canvas-caption').textContent=page.title+' / '+section.id+' · '+breakpoint;
    const block=D.blockPreview(session,manifests,pageId,sectionId,breakpoint);
    $('preview').srcdoc=screen(block);
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
    document.querySelectorAll('.device').forEach(b=>b.classList.toggle('active',b.dataset.bp===breakpoint));}
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
    if(!file||file.size>MAX_UPLOAD)return notice('JSON-файл слишком большой (максимум 900 КБ)',true);
    try{
      const text=await file.text(),site=C.validateSite(JSON.parse(text),manifests);
      if(HOSTED)return window.Stage3Host?.importSite?.(site);
      if(!confirm('Открыть импортированный сайт? Несохранённые изменения будут потеряны, текущие сохранения останутся до следующего «Сохранить».'))return;
      session=D.begin(site,manifests);versions=[];
      pageId=site.pages[0].id;sectionId=site.pages[0].sections[0].id;
      elementId=site.pages[0].sections[0].elements[0].id;
      savedBytes='';draw();notice('Сайт импортирован как несохранённый черновик.');
    }catch(e){notice('Импорт отклонён: '+e.message,true);}
  }
  window.addEventListener('beforeunload',e=>{
    if(JSON.stringify(session.current)!==savedBytes){e.preventDefault();e.returnValue='';}
  });
  $('undo').addEventListener('click',()=>{session=D.undo(session,manifests);draw();});
  $('redo').addEventListener('click',()=>{session=D.redo(session,manifests);draw();});
  $('save').addEventListener('click',save);
  $('export').addEventListener('click',exportJson);
  $('import').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';await importJson(file);});
  $('new-site').addEventListener('click',()=>{
    if(HOSTED)return window.Stage3Host?.newSite?.();
    if(!confirm('Открыть новый пример сайта без готового макета? Несохранённые изменения не сохранятся.'))return;
    const site=C.siteFromBrief({siteId:'site-no-mockup',title:'Сайт без макета'},manifests);
    session=D.begin(site,manifests);versions=[];
    pageId=site.pages[0].id;sectionId=site.pages[0].sections[0].id;elementId=site.pages[0].sections[0].elements[0].id;
    savedBytes='';draw();notice('Создан сайт без дизайн-ТЗ: все поля описаны в манифестах.');
  });
  $('reset').addEventListener('click',()=>{
    if(HOSTED)return window.Stage3Host?.reload?.();
    if(!confirm('Удалить ВСЕ локальные сохранения Stage 3 и восстановить исходный пример?'))return;
    try{localStorage.removeItem(STORAGE);versions=[];session=D.begin(starter,manifests);
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
        const navigation='<style>.cms-menu-preview{padding:16px;background:white;border-bottom:1px solid #dde6ed;display:flex;align-items:center;gap:20px;flex-wrap:wrap}.cms-menu-preview a{text-decoration:none;color:#1d3448}.cms-menu-preview a[aria-current=page]{color:#0a5bff;font-weight:800}.cms-menu-links{display:flex;flex-wrap:wrap;list-style:none;gap:12px;padding:0;margin:0}.cms-menu-links ul{list-style:none;margin:0;padding:0 0 0 15px}.cms-menu-cta{margin-left:auto;padding:9px 14px;border-radius:9px;background:#0a5bff;color:white!important}.cms-menu-mobile{display:none}@media(max-width:640px){.cms-menu-preview .cms-menu-desktop{display:none}.cms-menu-mobile{display:block;width:100%}.cms-menu-mobile .cms-menu-links{display:block}.cms-menu-mobile summary{cursor:pointer}}</style>'+
          '<header class="cms-menu-preview"><strong>'+escapeHtml(checked.title)+'</strong>'+
          '<nav class="cms-menu-desktop" aria-label="Навигация">'+common+'</nav>'+cta+
          (menu.mobile==='expanded'?'<nav class="cms-menu-mobile">'+common+'</nav>':
            '<details class="cms-menu-mobile"><summary>Меню</summary><nav>'+common+'</nav></details>')+
          '</header>';
        return first.slice(0,start)+navigation+docs.map(doc=>doc.slice(doc.indexOf('<body>')+6,doc.lastIndexOf('</body>'))).join('')+first.slice(end);
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
    assetAction:command=>{
      session=D.structure(session,manifests,{...command,expectedRevision:session.revision});
      draw();
      return cp(session.current.assets);
    },
    selection:()=>{
      const {page,section}=current();
      return {pageId:page.id,sectionId:section.id,component:section.component};
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
  createStructureTools();initSettings();initMenuEditor();initSiteQuality();initFullPagePreview();load();draw();
})();