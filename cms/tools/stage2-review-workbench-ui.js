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
            !/\\.(local|internal|test|invalid|example)$/.test(u.hostname);
          }catch{return false;}
        }) ||
        !(r.reviewerReference===null || typeof r.reviewerReference==='string' &&
          /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{2,119}$/.test(r.reviewerReference)) ||
        typeof r.notes!=='string'||r.notes.length>2000||r.notes.includes('\\0'))
        throw Error('Строка '+(i+1)+': неверные данные или подменённый компонент.');
      if(r.disposition==='pending'){
        if(r.reviewedOn!==null)throw Error('Строка '+(i+1)+': ожидающая проверка не может содержать дату решения.');
        pending++;continue;
      }
      if(typeof r.reviewedOn!=='string'|| !/^\\d{4}-\\d\\d-\\d\\d$/.test(r.reviewedOn) ||
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
        r.evidenceUrls.join('\\n'),v=>{r.evidenceUrls=v.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);refresh();},'span-6');
      field(body,'Решение и замечания (минимум 12 символов)','textarea',
        r.notes,v=>{r.notes=v;refresh();},'span-6');
      field(body,'Код независимого проверяющего','text',
        r.reviewerReference||'',v=>{r.reviewerReference=v||null;refresh();},'span-6');
      field(body,'Дата решения, YYYY-MM-DD','text',
        r.reviewedOn||'',v=>{r.reviewedOn=v||null;refresh();},'span-6');
      appendText(body,'div','Сверьте версию, лицензию и содержимое NOTICE по закреплённому исходнику. Ссылки вводятся вручную: интерфейс не открывает сайты и не выполняет проверку за эксперта.','span-12 hint');
      rowsNode.append(card);state.push({card,component,row:r});
    });
    refresh();
  }
  function refresh(){
    for(const key of ['approved','rejected','pending'])$(key).textContent=String(work.rows.filter(r=>r.disposition===key).length);
    const search=$('filter').value.trim().toLowerCase(),view=$('view').value;
    for(const entry of state){
      entry.card.hidden=(view!=='all'&&view!==entry.row.disposition) ||
        !!search&&!([entry.row.component,entry.component.scope,entry.component.declaredLicense]
          .join(' ').toLowerCase().includes(search));
    }
  }
  $('filter').addEventListener('input',refresh);
  $('view').addEventListener('change',refresh);
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
      const blob=new Blob([JSON.stringify(work,null,2)+'\\n'],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='stage2-dependency-review-worksheet.json';
      document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
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
