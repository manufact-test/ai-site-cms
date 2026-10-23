'use strict';
// A single owner-reviewed composition path for offline and authenticated Studio.
(()=>{
  const R=RECIPES,E=window.Stage3Editor,$=id=>document.getElementById(id);
  const hosted=document.documentElement.dataset.stage3Mode==='server';
  const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const button=(text,fn,id)=>{const b=node('button','btn small',text);b.type='button';if(id)b.id=id;b.addEventListener('click',fn);return b;};
  const start=button('✦ Создать из задания',open,'compose-site');
  document.querySelector('.site-actions').prepend(start);
  const dialog=node('dialog','composer');dialog.id='composer';
  // Static UI only. Owner text is assigned with value/textContent below.
  dialog.innerHTML=`<div class="composer-head"><div><h2>Создать сайт из задания</h2><p>Детерминированный режим · без внешнего ИИ и API-ключей</p></div><button type="button" class="btn" id="compose-close" aria-label="Закрыть">×</button></div>
  <div class="composer-body"><section id="compose-brief"><div class="compose-grid">
  <label>Название сайта / компании<input id="compose-title" class="control" maxlength="160" required></label>
  <label>Тип сайта<select id="compose-preset" class="control"><option value="auto">Подобрать по заданию</option></select></label>
  <label class="compose-wide">Задание: какой сайт нужен<textarea id="compose-task" class="control" maxlength="3000" rows="3" placeholder="Например: многостраничный сайт услуг с формой заявки"></textarea></label>
  <label class="compose-wide">Подтверждённый заголовок<input id="compose-headline" class="control" maxlength="180" placeholder="Без заголовка используем название сайта"></label>
  <label class="compose-wide">Подтверждённое описание<textarea id="compose-description" class="control" maxlength="420" rows="3"></textarea></label>
  <label>Предложения / услуги / проекты<textarea id="compose-offerings" class="control" rows="5" placeholder="Каждый пункт с новой строки · до 12"></textarea></label>
  <label>Факты о компании<textarea id="compose-details" class="control" rows="5" placeholder="Только подтверждённые сведения · до 12"></textarea></label>
  <label>Подпись внешней контактной кнопки<input id="compose-contact-label" class="control" maxlength="100"></label>
  <label>Внешняя контактная ссылка (https://)<input id="compose-contact-url" class="control" maxlength="300" placeholder="Без ссылки кнопка ведёт к форме сайта"></label>
  </div><label class="compose-check"><input type="checkbox" id="compose-current"> Пересобрать открытый сайт: сохранить его медиа и использовать его шаблоны блоков</label>
  <p class="subdued">Задание определяет структуру. Тексты берём только из заполненных выше полей. Пустые данные остаются подсказками для заполнения. Сохранение и публикация выполняются отдельно.</p>
  <div class="compose-buttons"><button type="button" id="compose-generate" class="btn primary">Подготовить структуру и предпросмотр</button><button type="button" id="compose-import" class="btn">Загрузить рецепт JSON</button><input type="file" id="compose-file" accept=".json,application/json" hidden></div></section>
  <section id="compose-review" hidden><div class="compose-buttons"><button type="button" id="compose-back" class="btn">← Изменить задание</button><button type="button" id="compose-export" class="btn">Скачать рецепт</button><button type="button" id="compose-refresh" class="btn">Обновить предпросмотр</button></div><div class="compose-review-grid"><div><h3>Страницы и блоки</h3><p class="subdued">Измените названия, URL и состав блоков. Все элементы будут редактироваться в Studio.</p><div id="compose-plan"></div><button type="button" id="compose-add-page" class="btn small">+ Страница</button><h3>Нужно заполнить</h3><ul id="compose-warnings"></ul></div><div><label>Предпросмотр страницы<select id="compose-page" class="control"></select></label><iframe id="compose-preview" sandbox="" title="Предпросмотр создаваемого сайта"></iframe></div></div><div class="compose-buttons"><button type="button" id="compose-apply" class="btn primary">Открыть в редакторе</button></div></section>
  <p id="compose-error" role="alert"></p><p id="compose-summary" aria-live="polite"></p></div>`;
  document.body.append(dialog);
  for(const [id,preset] of Object.entries(R.PRESETS)){
    const option=node('option',null,preset.label);option.value=id;$('compose-preset').append(option);
  }
  let recipe=null,result=null,context={sourceSite:null,templates:[]},sourceBytes='',version=0;
  const error=e=>{$('compose-error').textContent=e?.message||'';};
  const run=fn=>{try{error(null);return fn();}catch(e){error(e);return null;}};
  const lines=id=>$(id).value.split('\n').map(x=>x.trim()).filter(Boolean);
  function open(){
    if(hosted&&!window.Stage3Host?.canCompose?.())return;
    version++;recipe=null;result=null;context={sourceSite:null,templates:[]};
    $('compose-review').hidden=true;$('compose-brief').hidden=false;
    $('compose-current').checked=false;$('compose-title').value='';
    $('compose-summary').textContent='';error(null);dialog.showModal();$('compose-title').focus();
  }
  function invalidate(){result=null;$('compose-apply').disabled=true;$('compose-export').disabled=true;$('compose-summary').textContent='Структура изменена. Обновите предпросмотр перед применением.';}
  function input(label,value,change,max){
    const wrap=node('label',null,label),el=node('input','control');el.value=value;if(max)el.maxLength=max;
    el.addEventListener('input',()=>{change(el.value);invalidate();});wrap.append(el);return wrap;
  }
  function drawPlan(){
    const root=$('compose-plan');root.replaceChildren();
    recipe.pages.forEach((p,pi)=>{
      const wrap=node('article','compose-page-plan');
      wrap.append(input('Название',p.title,v=>p.title=v,160),input('URL',p.path,v=>p.path=v,160));
      wrap.append(button('Предпросмотр',()=>run(()=>{refresh();$('compose-page').value=p.id;preview();})));
      if(p.path!=='/')wrap.append(button('Удалить страницу',()=>{recipe.pages.splice(pi,1);invalidate();drawPlan();}));
      p.sections.forEach((s,si)=>{
        const row=node('div','compose-section-plan');
        const picker=node('select','control');picker.setAttribute('aria-label','Компонент блока');
        for(const m of E.manifests()){
          const opt=node('option',null,m.label);opt.value=m.id;picker.append(opt);
        }
        picker.value=s.component;
        picker.addEventListener('change',()=>{s.component=picker.value;delete s.templateId;invalidate();drawPlan();});row.append(picker);
        const choices=context.templates.filter(t=>t.component===s.component);
        if(choices.length){
          const select=node('select','control');select.setAttribute('aria-label','Шаблон блока');
          const def=node('option',null,'Создать из задания');def.value='';select.append(def);
          for(const t of choices){const opt=node('option',null,t.title);opt.value=t.id;select.append(opt);}
          select.value=s.templateId||'';
          select.addEventListener('change',()=>{if(select.value)s.templateId=select.value;else delete s.templateId;invalidate();});row.append(select);
        }
        row.append(button('↑',()=>{if(si){[p.sections[si-1],p.sections[si]]=[s,p.sections[si-1]];invalidate();drawPlan();}}));
        if(p.sections.length>1)row.append(button('×',()=>{p.sections.splice(si,1);invalidate();drawPlan();}));
        wrap.append(row);
      });
      wrap.append(button('+ Блок',()=>{p.sections.push({id:fresh('section'),component:'feature-highlights'});invalidate();drawPlan();}));
      root.append(wrap);
    });
  }
  function fresh(prefix){return prefix+'-'+crypto.randomUUID().replaceAll('-','').slice(0,18);}
  function preview(){
    if(!result)return;
    const page=result.site.pages.find(p=>p.id===$('compose-page').value)||result.site.pages[0];
    $('compose-preview').srcdoc=E.previewDocument(result.site,page.path);
  }
  function refresh(){
    const next=R.compose(recipe,E.manifests(),context);
    const selection=$('compose-page').value;
    result=next;$('compose-page').replaceChildren();
    for(const p of result.site.pages){const opt=node('option',null,p.title+' · '+p.path);opt.value=p.id;$('compose-page').append(opt);}
    if(result.site.pages.some(p=>p.id===selection))$('compose-page').value=selection;
    $('compose-warnings').replaceChildren(...result.warnings.map(x=>node('li',null,x)));
    if(!result.warnings.length)$('compose-warnings').append(node('li',null,'Проверьте тексты, фотографии и согласие формы перед публикацией.'));
    $('compose-summary').textContent=result.site.pages.length+' страниц · '+result.site.pages.reduce((n,p)=>n+p.sections.length,0)+' блоков · '+result.bindings.length+' шаблонов. Ничего не опубликовано.';
    $('compose-apply').textContent=recipe.sourceSiteId?'Заменить структуру черновика (можно отменить)':hosted?'Создать новый черновик на сервере':'Открыть новый черновик в редакторе';
    $('compose-apply').disabled=false;$('compose-export').disabled=false;preview();
  }
  async function prepare(imported=null){
    const ticket=++version;
    error(null);$('compose-generate').disabled=true;
    try{
      const current=imported?!!imported.sourceSiteId:$('compose-current').checked;
      const source=E.getSite();sourceBytes=JSON.stringify(source);
      const templates=current&&hosted?await window.Stage3Host.compositionTemplates():[];
      if(ticket!==version||!dialog.open)return;
      context=current?{sourceSite:source,templates}:{sourceSite:null,templates:[]};
      if(imported){recipe=R.validate(imported);if(current&&recipe.sourceSiteId!==source.siteId)throw Error('Откройте исходный сайт рецепта перед загрузкой.');}
      else{
        const task=$('compose-task').value,preset=$('compose-preset').value;
        recipe=R.plan({siteId:current?source.siteId:fresh('site'),title:$('compose-title').value.trim(),task,
          preset:preset==='auto'?R.suggest(task):preset,
          facts:{headline:$('compose-headline').value,description:$('compose-description').value,offerings:lines('compose-offerings'),details:lines('compose-details'),contactLabel:$('compose-contact-label').value,contactUrl:$('compose-contact-url').value}});
        if(current)recipe.sourceSiteId=source.siteId;
      }
      refresh();drawPlan();$('compose-brief').hidden=true;$('compose-review').hidden=false;
    }catch(e){error(e);}finally{$('compose-generate').disabled=false;}
  }
  $('compose-generate').addEventListener('click',()=>prepare());
  $('compose-close').addEventListener('click',()=>{version++;dialog.close();});
  dialog.addEventListener('cancel',()=>version++);
  $('compose-back').addEventListener('click',()=>{$('compose-review').hidden=true;$('compose-brief').hidden=false;result=null;error(null);});
  $('compose-refresh').addEventListener('click',()=>run(refresh));
  $('compose-page').addEventListener('change',()=>run(preview));
  $('compose-add-page').addEventListener('click',()=>{
    const id=fresh('page');recipe.pages.push({id,path:'/'+id+'/',title:'Новая страница',kind:'custom',sections:[{id:fresh('section'),component:'company-hero'}]});invalidate();drawPlan();
  });
  $('compose-apply').addEventListener('click',async()=>{
    if(!result)return;error(null);$('compose-apply').disabled=true;
    try{
      if(sourceBytes!==JSON.stringify(E.getSite()))throw Error('Исходный сайт изменился. Подготовьте рецепт заново.');
      // Revalidate the exact reviewed recipe at the commit boundary.
      const checked=R.compose(recipe,E.manifests(),context).site;
      if(recipe.sourceSiteId){
        if(!confirm('Заменить структуру текущего черновика? Опубликованный сайт не изменится. Доступна отмена.'))return;
        E.applyComposition(checked);
      }else{
        if(E.isDirty()&&!confirm('Открыть новый сайт без сохранения текущих правок?'))return;
        if(hosted)await window.Stage3Host.createComposition(checked);else E.openComposition(checked);
      }
      dialog.close();
      const toast=$('toast');toast.hidden=false;toast.className='toast';toast.textContent=recipe.sourceSiteId?'Новая структура открыта в черновике. Сохраните изменения; публикация отдельно.':'Создан редактируемый сайт. Публикация выполняется отдельно.';
    }catch(e){error(e);}finally{$('compose-apply').disabled=!result;}
  });
  $('compose-export').addEventListener('click',()=>run(()=>{
    R.validate(recipe);const url=URL.createObjectURL(new Blob([JSON.stringify(recipe,null,2)],{type:'application/json'}));
    const a=node('a');a.href=url;a.download='site-recipe.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }));
  $('compose-import').addEventListener('click',()=>$('compose-file').click());
  $('compose-file').addEventListener('change',async e=>{
    const f=e.target.files?.[0];e.target.value='';if(!f)return;
    try{if(f.size>100000)throw Error('Рецепт слишком большой (100 КБ).');await prepare(JSON.parse(await f.text()));}catch(e){error(e);}
  });
})();
