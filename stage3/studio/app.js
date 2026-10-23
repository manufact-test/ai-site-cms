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
    const element=section.elements.find(e=>e.id===elementId)||section.elements[0];
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
  function drawElements(){
    const {section}=current(),m=manifest(section);
    $('inspector-title').textContent=m?.label||section.component;
    $('inspector-caption').textContent='ID '+section.id+' · схема '+section.manifestVersion;
    const row=$('elements');row.replaceChildren();
    section.elements.forEach(e=>{
      const label=m.elements.find(s=>s.slot===e.slot)?.label||e.slot;
      row.append(button(label,'element'+(e.id===elementId?' active':''),
        ()=>{elementId=e.id;drawElements();drawFields();}));
    });
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
      drawHeader();drawPreview();
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
      if(field.type==='enum'){
        control=document.createElement('select');
        field.options.forEach(v=>{
          const opt=document.createElement('option');opt.value=v;opt.textContent=v;control.append(opt);
        });control.value=initial;
      }else{
        control=document.createElement('input');
        control.type=field.type==='boolean'?'checkbox':
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
    const title=stylesFor(block);
    let content='';
    if(block.component==='company-hero'){
      content='<section class="hero"><div class="decor">M / AI SITE CMS</div>'+
        '<div class="kicker">ПРОМЫШЛЕННЫЕ РЕШЕНИЯ</div>'+
        '<h1 style="font-size:'+e(title.fontSize)+';color:'+e(title.color)+'">'+e(title.title)+'</h1>'+
        '<p>'+e(p('summary').content.text||'')+'</p>'+
        '<span class="action">'+e(p('action').content.text||'')+' <span aria-hidden="true">↗</span></span>'+
        '</section>';
    }else if(block.component==='feature-highlights'){
      content='<section class="features"><span class="kicker">НАШ ПОДХОД</span>'+
        '<h2>'+e(title.title)+'</h2>'+
        '<div class="cards"><div class="card"><strong>01</strong><p style="color:'+e(p('first').style.color||'#243c52')+'">'+e(p('first').content.text||'')+'</p></div>'+
        '<div class="card"><strong>02</strong><p>'+e(p('second').content.text||'')+'</p></div></div></section>';
    }else if(block.component==='contact-panel'){
      content='<section class="contact"><span class="kicker">НАЧНЁМ СОТРУДНИЧЕСТВО</span>'+
        '<h2>'+e(title.title)+'</h2><p>Обсудите проект и требования к оборудованию.</p>'+
        '<span class="action">'+e(p('action').content.text||'')+' ↗</span>'+
        '<small>Кнопка демонстрационная: данные не отправляются.</small></section>';
    }else content='<section><h2>Незарегистрированный шаблон</h2></section>';
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8">'+
      '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;none&#39;; img-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; connect-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;">'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<style>*{box-sizing:border-box}body{margin:0;background:#fcfdfd;color:#1b3046;font:15px/1.6 Arial,sans-serif}section{padding:70px clamp(18px,7%,80px);min-height:470px}.kicker{display:block;color:#167c6a;font:700 11px Arial;letter-spacing:.15em;margin-bottom:19px}h1{line-height:1.12;letter-spacing:-.045em;max-width:850px;margin:10px 0 25px;overflow-wrap:anywhere}h2{font-size:clamp(29px,4vw,52px);line-height:1.16;letter-spacing:-.03em;margin:12px 0 30px}p{font-size:17px;max-width:630px;line-height:1.65}.hero{background:radial-gradient(circle at 90% 25%,#d9f6e6 0%,transparent 44%),linear-gradient(115deg,#f9fdfb,#e9f1f5)}.decor{color:#80a6b2;font-size:11px;letter-spacing:.15em;text-align:right}.action{display:inline-flex;margin-top:24px;gap:35px;border-radius:9px;background:#142e3c;color:white;padding:14px 20px;font-weight:700;font-size:14px}.features{background:#f2f7f8}.cards{display:grid;grid-template-columns:1fr 1fr;gap:15px}.card{border:1px solid #dce6e9;border-radius:14px;padding:26px;background:white}.card strong{color:#1a8b76}.card p{font-size:17px;overflow-wrap:anywhere}.contact{background:linear-gradient(130deg,#effbf6,#e8f1f7)}.contact small{display:block;color:#5c7180;margin-top:25px}.contact .action{background:#0a766b}@media(max-width:650px){section{padding:46px 25px;min-height:450px}.cards{grid-template-columns:1fr}h1{line-height:1.12}h2{font-size:32px}p{font-size:15px}.card{padding:20px}}</style>'+
      '</head><body>'+content+'</body></html>';
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
  function draw(){current();drawHeader();drawTree();drawElements();drawFields();drawPreview();drawVersions();
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
  if(HOSTED)window.Stage3Editor=Object.freeze({
    getSite:()=>cp(session.current),
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
  load();draw();
})();