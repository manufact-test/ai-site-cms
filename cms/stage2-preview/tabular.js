'use strict';
/*
 * Stage2 OFFLINE CSV intake/export for one selected repeatable section.
 * No network, user-provided CSV is always inert text; not a production import.
 * All mutations are proposals validated against the full page/site model.
 */
(()=>{
  const P=window.CmsPreviewProject,Q=window.CmsPreviewRepeaters;
  const MAX_BYTES=24000,MAX_ROWS=8;
  const normalizeTitle=value=>value.trim().toLocaleLowerCase('ru');
  const trimValue=value=>value.trim();
  const heads=[
    ['параметр','значение'],['название','описание'],
    ['наименование','описание'],['title','text'],['name','description'],
    ['parameter','value'],['name','value']
  ];
  function readRecords(text,delimiter){
    const rows=[],row=[];let cell='',quoted=false,closed=false;
    const add=()=>{
      if(cell.length>3400)throw Error('Превышена длина значения в CSV');
      row.push(cell);cell='';closed=false;
      if(row.length>2)throw Error('CSV должен содержать ровно два столбца');
    };
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(quoted){
        if(ch==='"'){
          if(text[i+1]==='"'){cell+='"';i++;}
          else{quoted=false;closed=true;}
        }else cell+=ch;
        continue;
      }
      if(ch==='"'&&!cell&&!closed){quoted=true;continue;}
      if(ch==='"')throw Error('Некорректные кавычки в CSV');
      if(closed&&ch!=='\r'&&ch!=='\n'&&ch!==delimiter)
        throw Error('Лишние символы после закрывающей кавычки CSV');
      if(ch===delimiter){add();continue;}
      if(ch==='\r'||ch==='\n'){
        if(ch==='\r'&&text[i+1]==='\n')i++;
        if(row.length||cell){add();rows.push(row.splice(0));}
        if(rows.length>MAX_ROWS+1)throw Error('Не более восьми строк данных в CSV');
        continue;
      }
      if(!closed)cell+=ch;
    }
    if(quoted)throw Error('Незакрытые кавычки в CSV');
    if(row.length||cell){add();rows.push(row);}
    return rows;
  }
  function parse(text,type){
    const rule=Q.definitions[type];
    if(!rule)throw Error('Выбранный блок не поддерживает импорт таблицы');
    if(typeof text!=='string'||text.length<8||text.length>MAX_BYTES||text.includes('\0'))
      throw Error('CSV должен быть текстовым файлом до 24 КБ');
    const input=text.replace(/^\uFEFF/,'');
    const choices=[';',','].map(delimiter=>{
      try{
        const records=readRecords(input,delimiter),header=records[0]?.map(x=>x.trim().toLocaleLowerCase('ru'));
        if(header?.length===2&&heads.some(h=>h[0]===header[0]&&h[1]===header[1]))
          return records;
      }catch(_){/* Try another standard CSV delimiter. */}
      return null;
    });
    const records=choices.find(Boolean);
    if(!records)throw Error('Нужны два заголовка CSV: «Название;Описание» или «Параметр;Значение»');
    if(records.length<2||records.length>MAX_ROWS+1)
      throw Error('Нужна хотя бы одна строка, максимум восемь');
    const seen=new Set();
    const result=records.slice(1).map((cells,index)=>{
      if(cells.length!==2)throw Error('Строка '+(index+2)+': требуется два столбца');
      // A prefixed quote prevents CSV formula execution in Excel, and is
      // decoded only when it unmistakably protects a formula prefix.
      const recover=x=>x.startsWith("'")&&/^[=+\-@]/.test(x.slice(1))?x.slice(1):x;
      const title=recover(trimValue(cells[0])),value=recover(trimValue(cells[1]));
      const normalized=normalizeTitle(title);
      if(!title||!value||title.length>rule.limit||value.length>rule.detailLimit
        ||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(title+value)
        ||seen.has(normalized))
        throw Error('Строка '+(index+2)+': пустые/повторяющиеся или слишком длинные значения');
      seen.add(normalized);
      return {title,text:value};
    });
    return result;
  }
  function selection(raw,pageId,sectionId){
    const project=P.validate(raw);
    const page=project.pages.find(p=>p.id===pageId);
    const section=page?.sections.find(s=>s.id===sectionId);
    if(!section||!Q.definitions[section.type])throw Error('Коллекция не найдена');
    return {project,page,section,rule:Q.definitions[section.type],
      items:page.repeaters[section.id]};
  }
  function plan(raw,pageId,sectionId,csv){
    const {project,page,section,items}=selection(raw,pageId,sectionId);
    const entries=parse(csv,section.type);
    const existing=new Map();
    for(const item of items){
      const key=normalizeTitle(item.title);
      if(!existing.has(key))existing.set(key,[]);
      existing.get(key).push(item);
    }
    let preservedPhotos=0,removedPhotos=0,reusedIds=0;
    const replacement=entries.map(row=>{
      const matches=existing.get(normalizeTitle(row.title))||[];
      const matched=matches.length===1?matches[0]:null;
      if(matched){reusedIds++;if(matched.image)preservedPhotos++;}
      return {id:matched?.id||Q.blank(section.type).id,
        title:row.title,text:row.text,image:matched?.image||''};
    });
    for(const item of items){
      if(item.image&&!replacement.some(row=>row.id===item.id))
        removedPhotos++;
    }
    const changed=JSON.stringify(items)!==JSON.stringify(replacement);
    page.repeaters[section.id]=replacement;
    const validated=P.validate(project);
    return {project:validated,changed,sectionType:section.type,pageId,sectionId,
      originalCount:items.length,newCount:replacement.length,reusedIds,
      preservedPhotos,removedPhotos};
  }
  const formula=/^[\u0009\u000d\u0020]*[=+\-@]/;
  function exportedCell(input){
    const raw=String(input);
    const safe=formula.test(raw)?"'"+raw:raw;
    return '"'+safe.replace(/"/g,'""')+'"';
  }
  function exportCsv(raw,pageId,sectionId){
    const {section,items}=selection(raw,pageId,sectionId);
    const header=section.type==='specs'?['Параметр','Значение']:['Название','Описание'];
    return '\uFEFF'+[header.map(exportedCell).join(';'),
      ...items.map(item=>[item.title,item.text].map(exportedCell).join(';'))].join('\r\n')+'\r\n';
  }
  Object.defineProperty(window,'CmsPreviewTables',{value:Object.freeze({parse,plan,exportCsv})});
})();