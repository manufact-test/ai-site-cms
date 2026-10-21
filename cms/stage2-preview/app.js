'use strict';
/* Stage2 offline MULTIPAGE product preview. No API, auth, server writes or publishing. */
(()=>{
  const C=window.CmsPreviewContent,P=window.CmsPreviewProject,
    R=window.CmsPreviewRender,E=window.AiSiteCmsEditorStage2;
  const $=id=>document.getElementById(id);
  const ui={list:$('sections'),frame:$('preview'),fields:$('fields'),title:$('site-title'),theme:$('theme'),
    count:$('count'),info:$('selection-info'),status:$('status'),addType:$('new-type'),browser:$('browser'),
    versions:$('versions'),saveState:$('save-state'),save:$('save'),undo:$('undo'),redo:$('redo'),
    pageList:$('page-list'),pageTitle:$('page-title'),slug:$('page-slug'),
    seoTitle:$('seo-title'),seoDescription:$('seo-description'),
    seoSnippetTitle:$('seo-snippet-title'),seoSnippetDescription:$('seo-snippet-description'),
    seoSnippetUrl:$('seo-snippet-url'),previewUrl:$('preview-url')};
  const storageKey='ai-site-cms-stage2-preview-local-v1',LIMIT=8;
  let project=P.template(),pageId=project.pages[0].id,doc,selection='',editor=null,
      dirty=false,records=[],storageOK=false;
  let saved='',undo=[],redo=[],lastType='',lastAt=0,focus='page',toastTimer;
  const snapshot=()=>JSON.stringify(project);
  const activePage=()=>project.pages.find(p=>p.id===pageId);
  const pageDoc=()=>P.pageDoc(project,activePage());
  function bind(){doc=pageDoc();}
  function toast(message,error=false){
    clearTimeout(toastTimer);ui.status.textContent=message;
    ui.status.className='status show'+(error?' error':'');
    toastTimer=setTimeout(()=>ui.status.className='status',4000);
  }
  function indicators(){
    dirty=snapshot()!==saved;
    ui.undo.disabled=!undo.length;ui.redo.disabled=!redo.length;ui.save.disabled=!storageOK;
    ui.saveState.textContent=!storageOK?'Локальное хранилище недоступно — экспортируйте JSON':
      dirty?'● Изменения не сохранены':(records.length?'✓ Локальная версия сохранена':'Новый проект · ещё не сохранён');
    ui.saveState.classList.toggle('unsaved',dirty);
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
    ui.pageTitle.value=p.title;ui.slug.value=p.slug;ui.seoTitle.value=p.seoTitle;
    ui.seoDescription.value=p.seoDescription;
    ui.slug.disabled=p.slug==='';
    $('page-delete').disabled=project.pages.length<=1||p.slug==='';
    $('page-add').disabled=project.pages.length>=P.MAX_PAGES;
    $('page-copy').disabled=project.pages.length>=P.MAX_PAGES;
    ui.previewUrl.textContent='demo.local'+(p.slug?'/'+p.slug:'/');
    ui.seoSnippetTitle.textContent=p.seoTitle;
    ui.seoSnippetDescription.textContent=p.seoDescription||'Добавьте SEO-описание страницы для поисковой выдачи.';
    ui.seoSnippetUrl.textContent='https://demo.local/'+(p.slug||'');
  }
  function preview(){
    try{
      const p=activePage();
      ui.frame.srcdoc=R.render(doc,selection,focus==='section',{
        seoTitle:p.seoTitle,seoDescription:p.seoDescription,
        menu:project.pages.map(x=>({id:x.id,title:x.title,slug:x.slug})),active:pageId
      });
      ui.count.textContent=doc.sections.length+' блоков';
      ui.seoSnippetTitle.textContent=p.seoTitle;
      ui.seoSnippetDescription.textContent=p.seoDescription||'Добавьте SEO-описание страницы для поисковой выдачи.';
      ui.seoSnippetUrl.textContent='https://demo.local/'+(p.slug||'');
      ui.previewUrl.textContent='demo.local/'+(p.slug||'');
    }catch(e){toast(e.message,true);}
  }
  function changed(){indicators();preview();}
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
    doc.sections.forEach((s,i)=>{
      const li=document.createElement('li'),active=s.id===selection;
      li.className='section-row'+(active?' selected':'');
      const pick=document.createElement('button');pick.type='button';pick.className='section-select';
      pick.title='Редактировать блок';pick.setAttribute('aria-pressed',String(active));
      const icon=document.createElement('span');icon.className='section-icon';
      icon.textContent=C.definitions[s.type].icon;icon.setAttribute('aria-hidden','true');
      const names=document.createElement('span');names.className='section-names';
      const name=document.createElement('strong');name.textContent=C.definitions[s.type].label;
      const subtitle=document.createElement('small');
      subtitle.textContent=Object.values(s.props).find(x=>typeof x==='string'&&x)||'Без текста';
      names.append(name,subtitle);pick.append(icon,names);
      pick.addEventListener('click',()=>select(s.id));
      const tools=document.createElement('div');tools.className='section-actions';
      tools.append(tiny('↑','Поднять блок выше',()=>move(i,-1),i===0),
        tiny('↓','Опустить блок ниже',()=>move(i,1),i===doc.sections.length-1),
        tiny('⧉','Дублировать блок',()=>duplicate(i),doc.sections.length>=12),
        tiny('×','Удалить блок',()=>remove(i),doc.sections.length<=1));
      li.append(pick,tools);ui.list.append(li);
    });
  }
  function mount(){
    if(editor){editor.destroy();editor=null;}
    const s=current();if(!s)return;
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
    pageId=project.pages.some(p=>p.id===preferredPage)?preferredPage:project.pages[0].id;
    bind();
    selection=doc.sections.some(s=>s.id===preferredSection)?preferredSection:doc.sections[0].id;
    ui.title.value=project.siteTitle;ui.theme.value=project.theme;lastType='';
    pageUI();listing();mount();changed();
  }
  function selectPage(id){
    if(!project.pages.some(p=>p.id===id)||id===pageId)return;
    if(editor){editor.destroy();editor=null;}
    pageId=id;bind();selection=doc.sections[0].id;lastType='';
    pageUI();listing();mount();preview();
  }
  function select(id){if(id===selection)return;selection=id;lastType='';listing();mount();preview();}
  function pageAdd(duplicate=false){
    if(project.pages.length>=P.MAX_PAGES)return toast('Максимум восемь страниц',true);
    checkpoint('pages');
    const page=P.createPage(project,duplicate?activePage():null);
    project.pages.push(page);selectPage(page.id);changed();
    toast(duplicate?'Страница продублирована':'Страница добавлена');
  }
  function pageDelete(){
    const p=activePage();
    if(p.slug===''||project.pages.length<=1)return toast('Главную страницу удалить нельзя',true);
    if(!confirm('Удалить страницу «'+p.title+'»? Изменение можно отменить.'))return;
    checkpoint('pages');project.pages=project.pages.filter(x=>x.id!==pageId);
    selectPage(project.pages[0].id);changed();toast('Страница удалена — можно отменить');
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
    if(field==='title')pageUI();
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
  function init(){
    if(!C||!P||!R||!E){
      ui.status.textContent='Соберите Jedison: cd cms/editor && npm ci && npm run build';
      ui.status.className='status show error';return;
    }
    for(const type of C.types){
      const option=document.createElement('option');option.value=type;
      option.textContent=C.definitions[type].label;ui.addType.append(option);
    }
    readSaved();if(records.length)project=P.normalize(records[0].doc);
    saved=snapshot();apply(project);versions();
    $('add').addEventListener('click',add);
    ui.pageList.addEventListener('change',()=>selectPage(ui.pageList.value));
    $('page-add').addEventListener('click',()=>pageAdd());
    $('page-copy').addEventListener('click',()=>pageAdd(true));
    $('page-delete').addEventListener('click',pageDelete);
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
      checkpoint('title',true);project.siteTitle=ui.title.value;bind();changed();
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
      if(!(e.ctrlKey||e.metaKey)||e.altKey||e.key.toLowerCase()!=='z')return;
      e.preventDefault();travel(e.shiftKey?'redo':'undo');
    });
    window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  }
  init();
})();
