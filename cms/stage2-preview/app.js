'use strict';
/**
 * One-tab, local-only demo coordinator. No fetch, credentials, storage,
 * auto-save, server write or publication. The Stage2 distribution never
 * includes this dev-only preview; production requires Stage3+ auth/ACL.
 */
(() => {
  const C=window.CmsPreviewContent;
  const R=window.CmsPreviewRender;
  const editorApi=window.AiSiteCmsEditorStage2;
  const $=id=>document.getElementById(id);
  const refs={list:$('sections'),frame:$('preview'),fields:$('fields'),title:$('site-title'),
    theme:$('theme'),count:$('count'),name:$('selection-info'),
    status:$('status'),addType:$('new-type'),browser:$('browser')};
  let documentData=C.template();
  let selected=documentData.sections[0].id;
  let activeEditor=null;
  let dirty=false,toastTimer=null,viewport='desktop';
  function toast(message,error=false) {
    clearTimeout(toastTimer);
    refs.status.textContent=message;
    refs.status.className='status show'+(error?' error':'');
    toastTimer=setTimeout(()=>{refs.status.className='status';},3700);
  }
  function markChanged() {
    dirty=true; updatePreview();
  }
  function updatePreview() {
    try {
      refs.frame.srcdoc=R.render(documentData);
      refs.count.textContent=documentData.sections.length+' блоков';
    } catch(error){toast(error.message,true);}
  }
  function selectedSection(){
    return documentData.sections.find(item=>item.id===selected);
  }
  function makeButton(symbol,description,operation,disabled) {
    const b=document.createElement('button');
    b.className='tiny';b.type='button';b.textContent=symbol;b.title=description;
    b.setAttribute('aria-label',description);
    b.disabled=Boolean(disabled);
    b.addEventListener('click',event=>{event.stopPropagation();operation();});
    return b;
  }
  function renderList() {
    refs.list.replaceChildren();
    documentData.sections.forEach((item,index)=>{
      const li=document.createElement('li'),current=item.id===selected;
      li.className='section-row'+(current?' selected':'');
      const pick=document.createElement('button');pick.type='button';pick.className='section-select';
      pick.setAttribute('aria-pressed',String(current));pick.title='Редактировать блок';
      const icon=document.createElement('span');icon.className='section-icon';
      icon.textContent=C.definitions[item.type].icon;icon.setAttribute('aria-hidden','true');
      const names=document.createElement('span');names.className='section-names';
      const label=document.createElement('strong');label.textContent=C.definitions[item.type].label;
      const subtitle=document.createElement('small');
      subtitle.textContent=Object.values(item.props).find(x=>typeof x==='string'&&x.length>0)||'Без текста';
      names.append(label,subtitle);pick.append(icon,names);
      pick.addEventListener('click',()=>select(item.id));
      const actions=document.createElement('div');actions.className='section-actions';
      actions.append(
        makeButton('↑','Поднять блок выше',()=>move(index,-1),index===0),
        makeButton('↓','Опустить блок ниже',()=>move(index,1),index===documentData.sections.length-1),
        makeButton('⧉','Дублировать блок',()=>duplicate(index),documentData.sections.length>=12),
        makeButton('×','Удалить блок',()=>remove(index),documentData.sections.length<=1)
      );
      li.append(pick,actions);refs.list.append(li);
    });
  }
  function mountEditor() {
    if(activeEditor){activeEditor.destroy();activeEditor=null;}
    const item=selectedSection();if(!item)return;
    refs.name.textContent=C.definitions[item.type].label+
      ' · редактируйте текст — результат появится слева в предпросмотре';
    refs.fields.replaceChildren();
    activeEditor=editorApi.mount({
      container:refs.fields,schema:C.schema(item.type),data:item.props,
      onChange(value){
        const live=selectedSection();
        if(!live||live.id!==item.id)return;
        live.props=value;markChanged();renderList();
      }
    });
  }
  function select(id) {
    selected=id;renderList();mountEditor();
  }
  function move(index,by) {
    const to=index+by;if(to<0||to>=documentData.sections.length)return;
    const moved=documentData.sections.splice(index,1)[0];
    documentData.sections.splice(to,0,moved);
    renderList();markChanged();
    toast('Порядок блоков изменён');
  }
  function remove(index) {
    if(documentData.sections.length<=1)return;
    const item=documentData.sections[index];
    documentData.sections.splice(index,1);
    if(item.id===selected)selected=documentData.sections[Math.min(index,documentData.sections.length-1)].id;
    renderList();mountEditor();markChanged();toast('Блок удалён');
  }
  function duplicate(index) {
    if(documentData.sections.length>=12){toast('Максимум 12 блоков',true);return;}
    const original=documentData.sections[index];
    const item=C.createSection(original.type);
    item.props=structuredClone(original.props);
    documentData.sections.splice(index+1,0,item);
    selected=item.id;renderList();mountEditor();markChanged();
    toast('Блок дублирован');
  }
  function add() {
    if(documentData.sections.length>=12){toast('Максимум 12 блоков',true);return;}
    const item=C.createSection(refs.addType.value);
    documentData.sections.push(item);
    selected=item.id;renderList();mountEditor();markChanged();toast('Блок добавлен');
  }
  function useDocument(next) {
    if(activeEditor){activeEditor.destroy();activeEditor=null;}
    documentData=C.validate(next);
    selected=documentData.sections[0].id;
    refs.title.value=documentData.siteTitle;
    refs.theme.value=documentData.theme;
    renderList();mountEditor();updatePreview();
  }
  function exportDocument(){
    let bytes;
    try{bytes=JSON.stringify(C.validate(documentData),null,2)+'\n';}
    catch(e){toast('Проверьте содержимое: '+e.message,true);return;}
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/json'}));
    const link=document.createElement('a');
    link.href=url;link.download='ai-site-cms-preview.json';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    dirty=false;toast('JSON экспортирован. На сервер ничего не отправлено');
  }
  async function importDocument(file) {
    if(!file)return;
    if(file.size>100000){toast('JSON слишком большой (максимум 100 КБ)',true);return;}
    try{
      const data=C.validate(JSON.parse(await file.text()));
      if(dirty&&!window.confirm('Заменить текущие несохранённые изменения импортированным проектом?'))return;
      useDocument(data);dirty=false;
      toast('Проект загружен локально из JSON');
    }catch(error){toast('Не удалось импортировать: '+error.message,true);}
  }
  function init(){
    if(!C||!R||!editorApi){refs.status.textContent='Сначала соберите Jedison: cd cms/editor && npm ci && npm run build';refs.status.className='status show error';return;}
    for(const type of C.types){
      const option=document.createElement('option');option.value=type;
      option.textContent=C.definitions[type].label;refs.addType.append(option);
    }
    useDocument(documentData);
    $('add').addEventListener('click',add);
    $('reset').addEventListener('click',()=>{
      if(dirty&&!window.confirm('Сбросить все правки в демонстрации?'))return;
      useDocument(C.template());dirty=false;toast('Демонстрация сброшена');
    });
    $('export').addEventListener('click',exportDocument);
    $('import').addEventListener('click',()=>$('file').click());
    $('file').addEventListener('change',async event=>{
      await importDocument(event.target.files?.[0]);event.target.value='';
    });
    refs.title.addEventListener('input',()=>{
      documentData.siteTitle=refs.title.value;
      markChanged();
    });
    refs.theme.addEventListener('change',()=>{
      documentData.theme=refs.theme.value;markChanged();
    });
    document.querySelectorAll('[data-width]').forEach(button=>button.addEventListener('click',()=>{
      viewport=button.dataset.width;
      refs.browser.classList.toggle('mobile',viewport==='mobile');
      document.querySelectorAll('[data-width]').forEach(target=>{
        const on=target.dataset.width===viewport;
        target.classList.toggle('active',on);target.setAttribute('aria-pressed',String(on));
      });
    }));
    window.addEventListener('beforeunload',event=>{
      if(!dirty)return;
      event.preventDefault();event.returnValue='';
    });
  }
  init();
})();
