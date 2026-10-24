'use strict';
// Stage3 authenticated editor adapter for audited first-party Media & Motion
// raster engine. Only chosen, verified <450000-byte raster is uploaded through
// existing immutable SiteRepository media API; no original bytes reach server.
(()=>{
  const H=window.Stage3Host,E=window.MediaMotionEngine,C=window.MediaMotionContract;
  if(!H||!E||!C||document.documentElement.dataset.stage3Mode!=='server')
    throw Error('Media processor must run in authenticated hosted Studio');
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const field=(title,ctrl)=>{
    const box=el('label');box.className='cms-process-field';
    box.append(el('span',title),ctrl);return box;
  };
  const btn=(name,id,fn)=>{
    const n=el('button',name);n.type='button';n.id=id;n.className='btn small';
    n.addEventListener('click',fn);return n;
  };
  const options=(entries,id)=>{
    const n=el('select');n.className='control';n.id=id;
    for(const [value,text] of entries){const opt=el('option',text);opt.value=value;n.append(opt);}
    return n;
  };
  const number=(id,value,min,max,step=1)=>{
    const n=el('input');n.className='control';n.type='number';n.id=id;
    n.value=String(value);n.min=min;n.max=max;n.step=step;return n;
  };
  const dialog=el('dialog');dialog.id='cms-media-processor';dialog.className='cms-media-processor';
  const heading=el('h2','Редактор изображений · Media & Motion');
  const intro=el('p','Обрежьте, поверните и оптимизируйте PNG/JPEG/WebP. На сервер попадёт только выбранная обработанная версия. Старые изображения останутся неизменными.');
  const upload=el('input');upload.id='cms-media-source';upload.type='file';
  upload.accept='image/png,image/jpeg,image/webp';
  const alt=el('input');alt.id='cms-media-alt';alt.className='control';alt.maxLength=200;
  const format=options([['image/webp','WebP'],['image/jpeg','JPEG'],['image/png','PNG']],'cms-media-format');
  const ratio=options([['free','Без ограничения'],['1:1','1:1'],['4:3','4:3'],['16:9','16:9']],'cms-media-ratio');
  const rotation=options([['0','Без поворота'],['90','90° по часовой стрелке'],
    ['180','180°'],['270','90° против часовой стрелки']],'cms-media-rotation');
  const cropX=number('cms-media-crop-x',0,0,90),cropY=number('cms-media-crop-y',0,0,90);
  const cropW=number('cms-media-crop-w',100,10,100),cropH=number('cms-media-crop-h',100,10,100);
  const width=number('cms-media-width',1200,64,8192);
  const quality=number('cms-media-quality',82,40,95);
  const attach=el('input');attach.type='checkbox';attach.checked=true;attach.id='cms-media-attach';
  const attachLabel=field('Сразу выбрать для текущей секции (если в ней есть поле изображения)',attach);
  const controls=el('div');controls.className='cms-media-grid';
  for(const [label,control] of [
    ['Исходное изображение',upload],['ALT / описание для посетителей',alt],
    ['Выходной формат',format],['Пропорции обрезки',ratio],['Поворот',rotation],
    ['Левая граница, %',cropX],['Верхняя граница, %',cropY],
    ['Ширина области, %',cropW],['Высота области, %',cropH],
    ['Макс. ширина результата, px',width],['Качество, % (JPEG/WebP)',quality]
  ])controls.append(field(label,control));
  const preview=el('img');preview.id='cms-media-result-image';
  preview.alt='Предпросмотр подготовленного изображения';preview.hidden=true;
  const report=el('p','Выберите локальное изображение.');report.id='cms-media-report';
  report.setAttribute('role','status');
  const buttons=el('div');buttons.className='cms-media-actions';
  let source=null,result=null,objectUrl=null,sourceKey=0,busy=false;
  function status(s,error=false){report.textContent=s;report.dataset.error=String(error);}
  function forget(){
    result=null;submit.disabled=true;download.disabled=true;
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
    preview.hidden=true;preview.removeAttribute('src');
  }
  function edit(){
    const x=Number(cropX.value)/100,y=Number(cropY.value)/100;
    const w=Number(cropW.value)/100,h=Number(cropH.value)/100;
    if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||x>0.9||y>0.9||
      w<.1||h<.1||x+w>1.00001||y+h>1.00001)
      throw Error('Область обрезки должна находиться внутри изображения');
    const desired=Number(width.value),q=Number(quality.value);
    if(!Number.isInteger(desired)||desired<64||desired>8192||
      !Number.isInteger(q)||q<40||q>95)throw Error('Недопустимая ширина или качество');
    return {crop:{x,y,w,h},ratio:ratio.value,rotate:Number(rotation.value),
      desired,quality:q/100};
  }
  function cleanName(mime){return 'optimized-'+Date.now()+'.'+C.MIME[mime];}
  const process=btn('Обработать и проверить','cms-media-process',async()=>{
    if(!source||busy)return;
    busy=true;process.disabled=true;forget();
    try{
      const editData=edit();const mime=format.value,requestKey=sourceKey,workingSource=source;
      const signal={cancelled:false};
      let desired=Math.min(editData.desired,E.geometry(workingSource,editData).outW);
      let processed;
      // Workbench cap 450 KiB, CMS accepts max 450000 decimal bytes.
      // Reduce width until the exact existing PHP limit is satisfied.
      for(let attempt=0;attempt<7;attempt++){
        processed=await E.optimize(workingSource,editData,desired,mime,editData.quality,signal);
        if(processed.bytes<=450000)break;
        desired=Math.floor(processed.width*.84);
        if(desired<64)throw Error('Результат не помещается в лимит CMS (450 КБ)');
      }
      if(processed.bytes>450000)throw Error('Результат превышает 450 КБ');
      if(processed.sha256!==await E.hash(processed.blob))
        throw Error('Проверка SHA256 результата не пройдена');
      if(requestKey!==sourceKey)throw Error('Исходный файл изменился во время обработки');
      result={...processed,name:cleanName(mime),key:requestKey};
      objectUrl=URL.createObjectURL(processed.blob);
      preview.src=objectUrl;preview.hidden=false;
      status('Готово: '+processed.width+'×'+processed.height+' · '+
        processed.mime+' · '+processed.bytes+' байт · SHA256 '+processed.sha256);
      submit.disabled=false;download.disabled=false;
    }catch(err){status(err.message,true);}
    finally{busy=false;process.disabled=false;}
  });
  const submit=btn('Добавить в медиабиблиотеку','cms-media-commit',async()=>{
    if(!result||busy)return;
    busy=true;submit.disabled=true;
    try{
      if(result.key!==sourceKey)throw Error('Файл изменился — обработайте заново');
      const processed=result;
      await H.uploadProcessed(processed.blob,alt.value,attach.checked,processed.sha256);
      status('Изображение сохранено в медиабиблиотеке. Публикация не выполнялась.');
      dialog.close();
    }catch(err){status(err.message,true);}
    finally{busy=false;submit.disabled=!result;}
  });
  const download=btn('Скачать файл','cms-media-download',()=>{
    if(!result)return;
    const url=URL.createObjectURL(result.blob),a=el('a');
    a.href=url;a.download=result.name;a.click();
    // Don't revoke until browser download has been scheduled; not used as URL elsewhere.
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  });
  submit.disabled=true;download.disabled=true;
  const close=btn('Закрыть','cms-media-close',()=>dialog.close());
  buttons.append(process,submit,download,close);
  dialog.append(heading,intro,controls,attachLabel,preview,report,buttons);
  document.body.append(dialog);
  async function selectFile(file){
    const key=++sourceKey;source=null;forget();
    if(!file){status('Выберите файл');return;}
    status('Проверка реальных байтов, MIME и размеров...');
    try{
      const info=await E.load(file);
      if(key!==sourceKey)return;
      source=info;
      alt.value=file.name.replace(/\.[^.]+$/,'').slice(0,200);
      width.value=String(Math.min(1200,info.width));
      status('Исходник: '+info.width+'×'+info.height+' · '+info.mime+
        ' · '+info.bytes+' байт. Настройте обрезку и нажмите «Обработать».');
    }catch(err){status(err.message,true);}
  }
  upload.addEventListener('change',()=>selectFile(upload.files?.[0]));
  for(const control of [alt,format,ratio,rotation,cropX,cropY,cropW,cropH,width,quality])
    control.addEventListener('change',()=>{if(result){forget();status('Настройки изменены. Обработайте изображение ещё раз.');}});
  dialog.addEventListener('close',()=>{forget();source=null;sourceKey++;upload.value='';});
  const launcher=btn('Обрезать / оптимизировать','server-media-process-open',()=>{
    if(!H.canEditMedia()){H.notice('Сначала откройте сайт и сохраните черновик',true);return;}
    status('Выберите PNG/JPEG/WebP до 12 MiB. Изображение обрабатывается локально.');
    dialog.showModal();
  });
  document.getElementById('server-media-upload').after(launcher);
  window.Stage3MediaProcessing=Object.freeze({open:()=>launcher.click()});
})();