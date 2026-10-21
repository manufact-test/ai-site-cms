'use strict';
/* Stage2 offline product preview ONLY. No API, server writes, auth or publishing. */
(()=>{
  const C=window.CmsPreviewContent,R=window.CmsPreviewRender,E=window.AiSiteCmsEditorStage2;
  const $=id=>document.getElementById(id);
  const ui={list:$('sections'),frame:$('preview'),fields:$('fields'),title:$('site-title'),theme:$('theme'),
    count:$('count'),info:$('selection-info'),status:$('status'),addType:$('new-type'),browser:$('browser'),
    versions:$('versions'),saveState:$('save-state'),save:$('save'),undo:$('undo'),redo:$('redo')};
  const storageKey='ai-site-cms-stage2-preview-local-v1',LIMIT=8;
  let doc=C.template(),selection=doc.sections[0].id,editor=null,dirty=false,records=[],storageOK=false;
  let saved='',undo=[],redo=[],lastType='',lastAt=0,focus='page',toastTimer;
  const snapshot=()=>JSON.stringify(doc);
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
  function preview(){
    try{ui.frame.srcdoc=R.render(doc,selection,focus==='section');
      ui.count.textContent=doc.sections.length+' блоков';}
    catch(e){toast(e.message,true);}
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
    ui.info.textContent=C.definitions[s.type].label+' · меняйте свойства, чтобы увидеть результат';
    ui.fields.replaceChildren();
    editor=E.mount({container:ui.fields,schema:C.schema(s.type),data:s.props,onChange(value){
      const live=current();
      if(!live||live.id!==s.id||JSON.stringify(live.props)===JSON.stringify(value))return;
      checkpoint('field:'+s.id,true);
      live.props=value;changed();listing();
    }});
  }
  function use(next,preferred){
    const valid=C.validate(next);
    if(editor){editor.destroy();editor=null;}
    doc=valid;selection=valid.sections.some(s=>s.id===preferred)?preferred:valid.sections[0].id;
    ui.title.value=doc.siteTitle;ui.theme.value=doc.theme;lastType='';
    listing();mount();changed();
  }
  function select(id){if(id===selection)return;selection=id;lastType='';listing();mount();preview();}
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
    use(JSON.parse(from.pop()),selection);
    toast(which==='undo'?'Изменение отменено':'Изменение повторено');
  }
  function exports(){
    let bytes;
    try{bytes=JSON.stringify(C.validate(doc),null,2)+'\n';}
    catch(e){return toast('Ошибка документа: '+e.message,true);}
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='ai-site-cms-preview.json';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('JSON скачан. Данные не отправлялись на сервер');
  }
  async function imports(file){
    if(!file)return;if(file.size>100000)return toast('Максимум 100 КБ для JSON',true);
    try{
      const valid=C.validate(JSON.parse(await file.text()));
      if(dirty&&!confirm('Заменить несохранённые изменения импортированным файлом?'))return;
      checkpoint('import');use(valid);toast('JSON открыт. Для сохранения нажмите «Сохранить локально»');
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
        return {at:r.at,doc:C.validate(r.doc)};
      });
    }catch(e){
      records=[];
      toast(storageOK?'Локальные версии повреждены. Используйте резервный JSON':
        'Хранилище браузера недоступно — пользуйтесь экспортом JSON',true);
    }
  }
  function versions(){
    ui.versions.replaceChildren();
    if(!storageOK||!records.length){
      const li=document.createElement('li');li.textContent=storageOK?
        'Здесь появятся ваши сохранённые черновики':'Доступен только экспорт JSON';
      ui.versions.append(li);return;
    }
    records.forEach((r,i)=>{
      const li=document.createElement('li'),caption=document.createElement('span');
      caption.textContent=new Date(r.at).toLocaleString('ru-RU')+' · '+r.doc.sections.length+' блоков';
      const b=document.createElement('button');b.type='button';b.className='tiny restore';
      b.textContent='Открыть';b.setAttribute('aria-label','Открыть локальную версию '+(i+1));
      b.addEventListener('click',()=>{
        if(dirty&&!confirm('Заменить текущие несохранённые изменения?'))return;
        checkpoint('restore');use(r.doc);toast('Версия открыта. Сохраните её для закрепления');
      });
      li.append(caption,b);ui.versions.append(li);
    });
  }
  function save(){
    if(!storageOK)return;
    try{
      const valid=C.validate(doc),currentJSON=JSON.stringify(valid);
      if(currentJSON!==saved||!records.length){
        const next=[{at:Date.now(),doc:valid},...records].slice(0,LIMIT);
        localStorage.setItem(storageKey,JSON.stringify(next));records=next;
      }
      saved=currentJSON;versions();indicators();toast('Черновик сохранён в этом браузере, не на сервере');
    }catch(e){toast('Сохранение недоступно. Экспортируйте резервный JSON',true);}
  }
  function init(){
    if(!C||!R||!E){ui.status.textContent='Соберите Jedison: cd cms/editor && npm ci && npm run build';ui.status.className='status show error';return;}
    for(const type of C.types){
      const option=document.createElement('option');option.value=type;
      option.textContent=C.definitions[type].label;ui.addType.append(option);
    }
    readSaved();
    if(records.length){doc=C.validate(records[0].doc);}
    saved=snapshot();use(doc);versions();
    $('add').addEventListener('click',add);
    $('reset').addEventListener('click',()=>{
      if(dirty&&!confirm('Создать новый проект и потерять несохранённые изменения?'))return;
      checkpoint('new');use(C.template());toast('Новый проект. Старые версии сохранены');
    });
    $('clear-versions').addEventListener('click',()=>{
      if(!records.length||!storageOK||!confirm('Удалить все локальные версии? При необходимости сначала экспортируйте JSON.'))return;
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
      if(doc.siteTitle===ui.title.value)return;
      checkpoint('title',true);doc.siteTitle=ui.title.value;changed();
    });
    ui.theme.addEventListener('change',()=>{
      if(doc.theme===ui.theme.value)return;
      checkpoint('theme');doc.theme=ui.theme.value;changed();
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
