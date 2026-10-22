'use strict';
(() => {
  const data = JSON.parse(document.getElementById('review-data').textContent);
  const base = data.worksheet;
  const dossier = data.dossier;
  const fieldNames = ['component','lockedComponentSha256','disposition','upstreamLicenseChecked','noticeObligationsChecked','advisoriesChecked','distributionScopeChecked','evidenceUrls','reviewerReference','reviewedOn','notes'];
  const topNames = Object.keys(base).sort().join('|');
  const $ = id => document.getElementById(id);
  const rowsNode = $('rows');
  const exact = (a,keys) => a && typeof a === 'object' && !Array.isArray(a) &&
    Object.keys(a).sort().join('|') === keys.slice().sort().join('|');
  const clone = value => JSON.parse(JSON.stringify(value));
  let work = clone(base);
  let activeScope="all";
  const matchesScope=(component,scope)=>scope==="all"||component.scope===scope||scope==="build"&&
    ["build-and-test-only","build-optional-platform"].includes(component.scope);
  const state = [];
  const feedback = (message,bad=false) => {
    $('feedback').textContent=message;
    $('feedback').className='feedback '+(bad?'error':'good');
  };
  function validate(input) {
    if (!exact(input,Object.keys(base)) || Object.keys(input).sort().join('|') !== topNames ||
        input.format !== base.format || input.scope !== base.scope ||
        input.dossierSha256 !== base.dossierSha256 ||
        input.packageManifestSha256 !== base.packageManifestSha256 ||
        input.noticeSha256 !== base.noticeSha256 ||
        input.componentCount !== 43 ||
        input.independentLegalApproval !== false ||
        input.stage2Accepted !== false || input.stage3Authorized !== false ||
        !Array.isArray(input.rows) || input.rows.length !== 43)
      throw Error('Рабочий лист не соответствует подписываемому составу пакета.');
    let approved=0,rejected=0,pending=0;
    for(let i=0;i<43;i++){
      const r=input.rows[i],b=base.rows[i];
      if(!exact(r,fieldNames) || r.component !== b.component ||
        r.lockedComponentSha256 !== b.lockedComponentSha256 ||
        !['pending','approved','rejected'].includes(r.disposition) ||
        !['upstreamLicenseChecked','noticeObligationsChecked','advisoriesChecked','distributionScopeChecked']
          .every(k=>typeof r[k]==='boolean') ||
        !Array.isArray(r.evidenceUrls) || r.evidenceUrls.length>8 ||
        !r.evidenceUrls.every(s=>{
          if(typeof s!=='string'||s.length>500||s.includes('\\'))return false;
          try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.search&&
            u.hostname!==''&&!['localhost','127.0.0.1'].includes(u.hostname)&&
            !/\.(local|internal|test|invalid|example)$/.test(u.hostname);
          }catch{return false;}
        }) ||
        !(r.reviewerReference===null || typeof r.reviewerReference==='string' &&
          /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{2,119}$/.test(r.reviewerReference)) ||
        typeof r.notes!=='string'||r.notes.length>2000||r.notes.includes('\0'))
        throw Error('Строка '+(i+1)+': неверные данные или подменённый компонент.');
      if(r.disposition==='pending'){
        if(r.reviewedOn!==null)throw Error('Строка '+(i+1)+': ожидающая проверка не может содержать дату решения.');
        pending++;continue;
      }
      if(typeof r.reviewedOn!=='string'|| !/^\d{4}-\d\d-\d\d$/.test(r.reviewedOn) ||
        !Number.isFinite(Date.parse(r.reviewedOn+'T00:00:00Z')) ||
        new Date(r.reviewedOn+'T00:00:00Z').toISOString().slice(0,10)!==r.reviewedOn ||
        Date.parse(r.reviewedOn+'T00:00:00Z')>Date.now() ||
        !r.reviewerReference||r.evidenceUrls.length<2)
        throw Error('Строка '+(i+1)+': нужны дата, код ревьюера и две проверяемые HTTPS-ссылки.');
      if(r.disposition==='approved'){
        if(!['upstreamLicenseChecked','noticeObligationsChecked','advisoriesChecked','distributionScopeChecked'].every(k=>r[k]) ||
          r.notes.trim().length<12)throw Error('Строка '+(i+1)+': одобрение без полного набора проверок.');
        approved++;
      } else {
        if(r.notes.trim().length<12)throw Error('Строка '+(i+1)+': отсутствует причина отклонения.');
        rejected++;
      }
    }
    return {approved,rejected,pending};
  }

  const reviewChecks=['upstreamLicenseChecked','noticeObligationsChecked',
    'advisoriesChecked','distributionScopeChecked'];
  const checkLabels={
    upstreamLicenseChecked:'Проверить оригинальную лицензию',
    noticeObligationsChecked:'Сверить NOTICE и атрибуцию',
    advisoriesChecked:'Проверить уязвимости и исправления',
    distributionScopeChecked:'Подтвердить возможность коммерческого распространения'
  };
  function gapsFor(row){
    const gaps=[];
    if(row.disposition==='pending'){
      gaps.push('Незавершённое решение эксперта');
      if(row.reviewedOn!==null)gaps.push('Ожидающее решение не должно содержать дату утверждения');
    }
    if(row.disposition==='approved')
      for(const key of reviewChecks)if(row[key]!==true)gaps.push(checkLabels[key]);
    if(row.disposition!=='pending'){
      if(!Array.isArray(row.evidenceUrls)||row.evidenceUrls.length<2)
        gaps.push('Нужно минимум две HTTPS-ссылки на доказательства');
      else if(row.evidenceUrls.some(s=>{
        try{
          const u=new URL(s);
          return typeof s!=='string'||s.length>500||s.includes('\\')||
            u.protocol!=='https:'||!!u.username||!!u.password||!!u.search||!!u.hash||
            ['localhost','127.0.0.1'].includes(u.hostname)||
            /\.(local|internal|test|invalid|example)$/.test(u.hostname);
        }catch{return true;}
      }))gaps.push('Исправьте недопустимые ссылки на доказательства');
      if(!row.reviewerReference||
          !/^[A-Za-z0-9][A-Za-z0-9_.:@/-]{2,119}$/.test(row.reviewerReference))
        gaps.push('Укажите корректный код независимого проверяющего');
      const value=String(row.reviewedOn||'');
      const time=Date.parse(value+'T00:00:00Z');
      if(!/^\d{4}-\d\d-\d\d$/.test(value)||!Number.isFinite(time)
          ||new Date(time).toISOString().slice(0,10)!==value||time>Date.now())
        gaps.push('Укажите корректную дату решения');
      if(typeof row.notes!=='string'||row.notes.trim().length<12||
         row.notes.length>2000||row.notes.includes('\0'))
        gaps.push('Напишите корректное обоснование (12–2000 символов)');
    }
    if(!['pending','approved','rejected'].includes(row.disposition))
      gaps.push('Недопустимый статус');
    return gaps;
  }
  function downloadText(name,value,type){
    const objectUrl=URL.createObjectURL(new Blob([value],{type}));
    const link=document.createElement('a');
    link.href=objectUrl;link.download=name;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
  }
  function actionsMarkdown(){
    const lines=['# Открытые действия независимой проверки 43 зависимостей','',
      'ВНУТРЕННИЙ ЧЕК-ЛИСТ — НЕ ЮРИДИЧЕСКОЕ ЗАКЛЮЧЕНИЕ, НЕ ПОДПИСЬ, НЕ ПРИЁМКА STAGE 2.','',
      'Пакет SHA-256: '+base.packageManifestSha256,
      'NOTICE SHA-256: '+base.noticeSha256,''];
    let pending=0;
    for(const [index,row] of work.rows.entries()){
      const issues=gapsFor(row);
      if(!issues.length)continue;
      pending++;
      lines.push('## '+(index+1)+'. '+row.component,'');
      issues.forEach(reason=>lines.push('- [ ] '+reason));
      lines.push('');
    }
    lines.push('Незавершённых компонентов: '+pending+' из 43.',
      'Независимые проверка личности, юридическая оценка и отдельное решение владельца обязательны.','');
    return lines.join('\n');
  }
  const appendText=(parent,tag,txt,css)=>{
    const node=document.createElement(tag);
    if(css)node.className=css;
    node.textContent=txt;
    parent.append(node);return node;
  };
  const field=(parent,name,kind,value,onChange,span='span-6')=>{
    const label=appendText(parent,'label',name,span);
    const node=document.createElement(kind==='textarea'?'textarea':'input');
    if(kind!=='textarea')node.type=kind;
    node.value=value??'';
    node.addEventListener('input',()=>onChange(node.value));
    label.append(node);return node;
  };
  function render(){
    rowsNode.replaceChildren();state.length=0;
    dossier.components.forEach((component,i)=>{
      const r=work.rows[i];
      const card=document.createElement('article');card.className='card';card.dataset.row=String(i);
      const head=appendText(card,'div','','card-top');
      const left=appendText(head,'div','','');
      appendText(left,'div',r.component,'package-name');
      appendText(left,'div',component.scope+' · '+component.declaredLicense+
        ' · '+(component.noticeIncluded?'NOTICE включён':'Не поставляется в runtime'),'meta');
      appendText(left,'div','Исходник: '+(component.sourceUrl||component.resolvedRegistryUrl||'')+
        ' · закреплённый SHA/Integrity: '+(component.sourceReference||component.lockIntegrity||''),'meta');
      const select=document.createElement('select');select.className='status';
      select.setAttribute('aria-label','Решение для '+r.component);
      for(const [value,label] of [['pending','Ожидает'],['approved','Подтверждён'],['rejected','Отклонён']]){
        const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);
      }
      select.value=r.disposition;head.append(select);
      select.addEventListener('change',()=>{
        r.disposition=select.value;
        if(select.value==='pending')r.reviewedOn=null;
        refresh();
      });
      const body=appendText(card,'div','','card-body');
      const checks=appendText(body,'div','','span-12 checks');
      const names={
        upstreamLicenseChecked:'Оригинальная лицензия',
        noticeObligationsChecked:'NOTICE/атрибуция',
        advisoriesChecked:'Уязвимости',
        distributionScopeChecked:'Коммерческое использование'
      };
      for(const [key,name] of Object.entries(names)){
        const label=appendText(checks,'label',name);
        const ch=document.createElement('input');ch.type='checkbox';ch.checked=r[key];
        ch.addEventListener('change',()=>{r[key]=ch.checked;refresh();});
        label.prepend(ch);
      }
      field(body,'Ссылки на доказательства (одна HTTPS-ссылка на строку)','textarea',
        r.evidenceUrls.join('\n'),v=>{r.evidenceUrls=v.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);refresh();},'span-6');
      field(body,'Решение и замечания (минимум 12 символов)','textarea',
        r.notes,v=>{r.notes=v;refresh();},'span-6');
      field(body,'Код независимого проверяющего','text',
        r.reviewerReference||'',v=>{r.reviewerReference=v||null;refresh();},'span-6');
      field(body,'Дата решения, YYYY-MM-DD','text',
        r.reviewedOn||'',v=>{r.reviewedOn=v||null;refresh();},'span-6');
      appendText(body,'div','Сверьте версию, лицензию и содержимое NOTICE по закреплённому исходнику. Ссылки вводятся вручную: интерфейс не открывает сайты и не выполняет проверку за эксперта.','span-12 hint');
      const problems=appendText(card,'div','','review-gaps');
      problems.setAttribute('aria-live','off');
      rowsNode.append(card);state.push({card,component,row:r,problems,select});
    });
    refresh();
  }
  function refresh(){
    for(const key of ['approved','rejected','pending'])$(key).textContent=String(work.rows.filter(r=>r.disposition===key).length);
    const search=$('filter').value.trim().toLowerCase(),view=$('view').value;
    let remaining=0;
    for(const entry of state){
      const problems=gapsFor(entry.row);
      if(problems.length)remaining++;
      entry.problems.replaceChildren();
      entry.problems.classList.toggle('complete',problems.length===0);
      appendText(entry.problems,'strong',problems.length?
        'Осталось действий: '+problems.length:
        'Поля заполнены. Требуется независимое юридическое одобрение.');
      if(problems.length){
        const ul=document.createElement('ul');
        for(const reason of problems)appendText(ul,'li',reason);
        entry.problems.append(ul);
      }
      const statusMatch=view==='all'||view==='incomplete'&&problems.length>0||
        view===entry.row.disposition;
      entry.card.hidden=!statusMatch || !matchesScope(entry.component,activeScope) || !!search &&
        !([entry.row.component,entry.component.scope,entry.component.declaredLicense]
          .join(' ').toLowerCase().includes(search));
    }
    $('gap-count').textContent=String(remaining);
    for(const [scope,id] of [['php-runtime','scope-php'],['browser-runtime','scope-browser'],['build','scope-build']]){
      const entries=state.filter(s=>matchesScope(s.component,scope));
      $(id).textContent=entries.length+' всего · '+entries.filter(s=>gapsFor(s.row).length>0).length+' открыто';
    }
    document.querySelectorAll('.scope-choice').forEach(btn=>{
      btn.setAttribute('aria-pressed',String(btn.dataset.scope===activeScope));
    });
  }
  $('filter').addEventListener('input',refresh);
  document.querySelectorAll('.scope-choice').forEach(btn=>{
    btn.addEventListener('click',()=>{
      activeScope=activeScope===btn.dataset.scope?'all':btn.dataset.scope;
      refresh();
    });
  });
  $('view').addEventListener('change',refresh);
  $('next-gap').addEventListener('click',()=>{
    const next=state.find(entry=>matchesScope(entry.component,activeScope)&&gapsFor(entry.row).length>0);
    if(!next){feedback(activeScope==='all'?'Все поля заполнены. Требуется отдельная юридическая приёмка.':
      'В выбранной группе открытых действий нет; переключитесь на другую группу.',false);return;}
    $('filter').value='';$('view').value='incomplete';refresh();
    next.card.scrollIntoView({block:'start'});
    next.select.focus();
    feedback('Открыта строка: '+next.row.component+'. Заполняйте только после настоящей проверки.');
  });
  $('gap-export').addEventListener('click',()=>{
    try{
      // Report is a private to-do list only. Refuse changed package or component identities.
      if(!exact(work,Object.keys(base))||work.componentCount!==43||
         work.packageManifestSha256!==base.packageManifestSha256||
         work.dossierSha256!==base.dossierSha256||work.noticeSha256!==base.noticeSha256||
         !Array.isArray(work.rows)||work.rows.length!==43||
         work.rows.some((r,i)=>r.component!==base.rows[i].component||
           r.lockedComponentSha256!==base.rows[i].lockedComponentSha256))
        throw Error('Неизвестный состав зависимостей');
      downloadText('stage2-review-open-actions.md',actionsMarkdown(),
        'text/markdown;charset=utf-8');
      feedback('Список открытых действий скачан. Он не является юридической подписью или приёмкой.');
    }catch(e){feedback(e.message,true);}
  });
  $('validate').addEventListener('click',()=>{
    try{const r=validate(work);
      feedback('Проверка формата пройдена. Подтверждено: '+r.approved+
        ', отклонено: '+r.rejected+', ожидает: '+r.pending+
        '. Потребуется независимая серверная проверка и подпись.');}
    catch(e){feedback(e.message,true);}
  });
  $('export').addEventListener('click',()=>{
    try{
      const result=validate(work);
      downloadText('stage2-dependency-review-worksheet.json',
        JSON.stringify(work,null,2)+'\n','application/json');
      feedback('JSON скачан. Проверено: '+result.approved+
        '/43, отклонено: '+result.rejected+'. Это НЕ подпись и НЕ юридическое одобрение.');
    }catch(e){feedback('Экспорт отклонён: '+e.message,true);}
  });
  $('import').addEventListener('change',async event=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    if(file.size>131072){feedback('Импорт слишком большой (лимит 128 KiB).',true);return;}
    try{
      const parsed=JSON.parse(await file.text());
      const result=validate(parsed);
      work=clone(parsed);render();
      feedback('Импортирован рабочий лист: '+result.approved+' подтверждено, '+
        result.rejected+' отклонено. Сверьте независимые доказательства.');
    }catch(e){feedback('Импорт отклонён: '+e.message,true);}
  });
  render();
})();
