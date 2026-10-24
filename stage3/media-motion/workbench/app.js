/* Standalone offline UI. All user strings use textContent/value, never HTML injection. */
(() => {
'use strict';
const C=globalThis.MediaMotionContract,E=globalThis.MediaMotionEngine;
const $=id=>document.getElementById(id);
const defaultEdit=()=>({ratio:'free',rotate:0,crop:{x:0,y:0,w:1,h:1}});
let state={items:[],selectedId:null,gallery:{id:'gallery-main',title:'Галерея',layout:'grid',assetIds:[],columns:3,motionId:'motion-main'},motion:{id:'motion-main',preset:'fade',duration:440,delay:0,easing:'ease-out',distance:24,trigger:'load',mobile:'on'},icons:['image','play'],video:{provider:'none',url:'',posterAssetId:null,aspect:'16:9'},processing:{mime:'image/webp',quality:.82,width:720}};
let undo=[],redo=[],job=null,previewSequence=0, toastTimer=null, assetsCounter=0;
const blobCache=new Map(); // SHA -> immutable Blob; capped for Undo/Redo, never exported
const sourceCache=new Map(); // bounded sources retained for Undo/Redo and metadata rebind
const humanBytes=n=>n<1024?`${n} B`:n<1024*1024?`${(n/1024).toFixed(1)} KiB`:`${(n/1024/1024).toFixed(2)} MiB`;
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
const clear=node=>node.replaceChildren();
const sel=()=>state.items.find(x=>x.id===state.selectedId)||null;
function notify(message,error=false){const box=$('toast');box.textContent=message;box.classList.toggle('error',error);box.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{box.hidden=true},5200);}
function dataItem(item){return {id:item.id,name:item.name,alt:item.alt,caption:item.caption,focal:{...item.focal},original:{...item.original},variants:item.variants.map(v=>({...v.meta})),edit:structuredClone(item.edit)};}
function bundle(){const b={format:C.FORMAT,assets:state.items.map(item=>{const d=dataItem(item);delete d.edit;return d;}),galleries:[structuredClone(state.gallery)],motions:[structuredClone(state.motion)],icons:[...state.icons],video:{...state.video},css:C.motionCSS([state.motion])};return C.validateBundle(b);}
function snapshot(){return {items:state.items.map(dataItem),selectedId:state.selectedId,gallery:structuredClone(state.gallery),motion:structuredClone(state.motion),icons:[...state.icons],video:{...state.video},processing:{...state.processing}};}
function checkpoint(){undo.push(snapshot());if(undo.length>32)undo.shift();redo=[];historyButtons();}
function historyButtons(){$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;}
function hydrate(data){
  const previous=sourceCache;
  for(const item of state.items)if(item.url)URL.revokeObjectURL(item.url);
  state.items=data.items.map(i=>{const source=previous.get(i.original.sha256)||null;return {...structuredClone(i),source,url:source?URL.createObjectURL(source.blob):null,variants:i.variants.map(meta=>({meta,blob:blobCache.get(meta.sha256)||null}))};});
  state.selectedId=data.selectedId;state.gallery=structuredClone(data.gallery);state.motion=structuredClone(data.motion);
  state.icons=[...data.icons];state.video={...data.video};state.processing={...data.processing};renderAll();
}
function travel(from,to){if(!from.length)return;to.push(snapshot());hydrate(from.pop());historyButtons();}
$('undo').addEventListener('click',()=>travel(undo,redo));$('redo').addEventListener('click',()=>travel(redo,undo));
function itemId(){while(true){const id='asset-'+String(++assetsCounter).padStart(4,'0');if(!state.items.some(a=>a.id===id))return id;}}
async function importFiles(files,forceDemo=false){
  const list=Array.from(files);if(!list.length)return;
  let added=0,relinked=0,errors=[];
  for(const file of list){
    if(state.items.length>=E.MAX_ITEMS){errors.push('Максимум '+E.MAX_ITEMS+' изображений за сессию');break;}
    try{
      const original=await E.load(file);
      const exists=state.items.find(x=>x.original.sha256===original.sha256);
      if(exists){if(!exists.source){if(!sourceCache.has(original.sha256) && Array.from(sourceCache.values()).reduce((n,x)=>n+x.bytes,0)+original.bytes>48*1024*1024)throw new Error('Лимит памяти исходников 48 MiB');sourceCache.set(original.sha256,original);exists.source=original;exists.url=URL.createObjectURL(original.blob);relinked++;}else errors.push((file.name||'Файл')+': уже импортирован');continue;}
      if(Array.from(sourceCache.values()).reduce((n,x)=>n+x.bytes,0)+original.bytes>48*1024*1024)throw new Error('Лимит памяти исходников 48 MiB');
      checkpoint();sourceCache.set(original.sha256,original);const id=itemId(),name=forceDemo?'Демо · '+file.name:(file.name||id);
      state.items.push({id,name,alt:forceDemo?`Демонстрационная графика ${added+1}`:'',caption:'',focal:{x:50,y:50},original:{mime:original.mime,width:original.width,height:original.height,bytes:original.bytes,sha256:original.sha256},source:original,url:URL.createObjectURL(original.blob),variants:[],edit:defaultEdit()});
      state.gallery.assetIds.push(id);state.selectedId=id;added++;
    }catch(e){errors.push((file.name||'Файл')+': '+e.message);}
  }
  renderAll();if(errors.length)notify(errors.slice(0,3).join('; '),true);else notify(`Добавлено: ${added}, повторно привязано: ${relinked}`);
}
$('file-input').addEventListener('change',e=>{importFiles(e.target.files).catch(err=>notify(err.message,true));e.target.value='';});
const dz=$('dropzone');dz.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('file-input').click();}});
for(const type of ['dragenter','dragover'])dz.addEventListener(type,e=>{e.preventDefault();dz.classList.add('drag')});
for(const type of ['dragleave','drop'])dz.addEventListener(type,e=>{e.preventDefault();dz.classList.remove('drag')});
dz.addEventListener('drop',e=>importFiles(e.dataTransfer.files).catch(err=>notify(err.message,true)));
async function demoFiles(){const files=[];for(let index=0;index<2;index++){
  const c=document.createElement('canvas');c.width=1024;c.height=680;const x=c.getContext('2d');
  const grad=x.createLinearGradient(0,0,1024,680);grad.addColorStop(0,index?'#3b3e8b':'#20546b');grad.addColorStop(1,index?'#f0ad73':'#7fe1ba');x.fillStyle=grad;x.fillRect(0,0,1024,680);
  for(let i=0;i<7;i++){x.beginPath();x.arc(index?150+i*117:790-i*117,90+i*75,47+i*11,0,Math.PI*2);x.fillStyle=`rgba(255,255,255,${.04+i*.035})`;x.fill();}
  x.font='bold 95px system-ui';x.fillStyle='#f6f8fc';x.fillText(index?'MOTION':'MEDIA',62,570);
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));files.push(new File([blob],index?'poster.png':'canvas.png',{type:'image/png'}));
}await importFiles(files,true);}
$('demo').addEventListener('click',()=>demoFiles().catch(e=>notify(e.message,true)));
$('search').addEventListener('input',refreshLibrary);$('sort').addEventListener('change',refreshLibrary);
function refreshLibrary(){
  $('library-count').textContent=state.items.length;$('asset-count').textContent=state.items.length;
  const query=$('search').value.toLocaleLowerCase().trim();let filtered=state.items.filter(x=>(x.name+' '+x.alt+' '+x.caption).toLocaleLowerCase().includes(query));
  if($('sort').value==='name')filtered.sort((a,b)=>a.name.localeCompare(b.name));
  if($('sort').value==='size')filtered.sort((a,b)=>b.original.bytes-a.original.bytes);
  if($('sort').value==='newest')filtered.reverse();
  const list=$('library-list');clear(list);
  for(const item of filtered){const card=el('button','media-tile'+(item.id===state.selectedId?' active':''));card.type='button';card.setAttribute('aria-label','Открыть '+item.name);
    if(item.url){const img=el('img');img.src=item.url;img.alt='';img.loading='lazy';card.append(img);}else card.append(el('span','tile-missing','⧉'));
    const d=el('div');d.append(el('strong','',item.name),el('small','',`${item.original.width}×${item.original.height} · ${humanBytes(item.original.bytes)}`),el('small','',item.source?`${item.variants.length} версий`:'Требуется повторная загрузка'));card.append(d);
    card.addEventListener('click',()=>{state.selectedId=item.id;renderAll()});list.append(card);
  }
  if(!filtered.length)list.append(el('p','subtext',query?'Ничего не найдено':'Добавьте изображения или демо.'));
}
function chosenField(field,value){$(field).value=value;$(field).disabled=!sel();}
function showCropFrame(item){if(!item)return;const frame=$('source-frame'),img=$('source-image');const fw=frame.clientWidth,fh=frame.clientHeight;if(!fw||!fh)return;
  const scale=Math.min(fw/item.original.width,fh/item.original.height),w=item.original.width*scale,h=item.original.height*scale;
  const g=E.geometry(item.original,item.edit),box=$('crop-frame');box.style.left=((fw-w)/2+g.x*scale)+'px';box.style.top=((fh-h)/2+g.y*scale)+'px';box.style.width=g.w*scale+'px';box.style.height=g.h*scale+'px';
}
async function renderPreview(item){const token=++previewSequence;if(!item?.source)return;
  try{const surface=await E.render(item.source,item.edit,Math.min(850,E.geometry(item.original,item.edit).outW));if(token!==previewSequence)return;
  const dst=$('result-canvas');dst.width=surface.width;dst.height=surface.height;dst.getContext('2d').drawImage(surface,0,0);
  const g=E.geometry(item.original,item.edit);const latest=item.variants.at(-1)?.meta;
  $('after-info').textContent=latest?`После: ${latest.width}×${latest.height} · ${humanBytes(latest.bytes)} · ${latest.mime}`:`Кадр ${g.outW}×${g.outH} px · ${item.edit.rotate}° · фокус ${item.focal.x}%/${item.focal.y}%`;
  showCropFrame(item);
  }catch(e){if(token===previewSequence)notify(e.message,true);}
}
function renderEditor(){const item=sel(),has=Boolean(item);$('editor-empty').hidden=has;$('editor-filled').hidden=!has;
  $('image-state').textContent=!item?'Выберите изображение':!item.source?'Нужно привязать оригинал':item.variants.length?'Варианты готовы':'Готов к обработке';
  for(const field of ['media-name','media-alt','media-caption','focus-x','focus-y','ratio','crop-w','crop-h','format','quality','width'])$(field).disabled=!has;
  for(const field of ['rotate-left','rotate-right','process-one'])$(field).disabled=!item?.source;
  $('delete-item').disabled=!item;
  $('media-name').value=item?.name||'';$('media-alt').value=item?.alt||'';$('media-caption').value=item?.caption||'';
  $('focus-x').value=item?.focal.x??50;$('focus-y').value=item?.focal.y??50;$('fx-out').textContent=$('focus-x').value+'%';$('fy-out').textContent=$('focus-y').value+'%';
  $('ratio').value=item?.edit.ratio||'free';$('crop-w').value=Math.round((item?.edit.crop.w??1)*100);$('crop-h').value=Math.round((item?.edit.crop.h??1)*100);$('crop-w-out').textContent=$('crop-w').value+'%';$('crop-h-out').textContent=$('crop-h').value+'%';
  $('format').value=state.processing.mime;$('quality').value=Math.round(state.processing.quality*100);$('quality-out').textContent=$('quality').value+'%';$('width').value=state.processing.width;$('width-out').textContent=state.processing.width+' px';
  if(item?.source){$('source-image').src=item.url;$('before-info').textContent=`До: ${item.original.width}×${item.original.height} · ${humanBytes(item.original.bytes)} · ${item.original.mime}`;renderPreview(item);}else if(item){$('source-image').removeAttribute('src');$('before-info').textContent='Исходник отсутствует · повторно добавьте тот же файл по SHA256';$('after-info').textContent='Нет превью';}
  else ++previewSequence;
  refreshVariants();
}
$('source-image').addEventListener('load',()=>showCropFrame(sel()));
window.addEventListener('resize',()=>showCropFrame(sel()));
let dragStart=null;const box=$('crop-frame');
box.addEventListener('pointerdown',e=>{const item=sel();if(!item?.source)return;e.preventDefault();dragStart={x:e.clientX,y:e.clientY,crop:{...item.edit.crop}};checkpoint();box.setPointerCapture(e.pointerId);});
box.addEventListener('pointermove',e=>{if(!dragStart)return;const item=sel(),frame=$('source-frame');const scale=Math.min(frame.clientWidth/item.original.width,frame.clientHeight/item.original.height);
 const dx=(e.clientX-dragStart.x)/(item.original.width*scale),dy=(e.clientY-dragStart.y)/(item.original.height*scale);
 item.edit.crop.x=Math.max(0,Math.min(1-item.edit.crop.w,dragStart.crop.x+dx));item.edit.crop.y=Math.max(0,Math.min(1-item.edit.crop.h,dragStart.crop.y+dy));showCropFrame(item);});
box.addEventListener('pointerup',()=>{if(dragStart){dragStart=null;invalidateVariants(sel());renderPreview(sel());}});
box.addEventListener('pointercancel',()=>{dragStart=null;renderPreview(sel());});
function invalidateVariants(item){if(!item)return;item.variants=[];refreshVariants();refreshLibrary();refreshStats();}
function editSelected(fn,update=true){const item=sel();if(!item?.source)return;checkpoint();fn(item);if(update){invalidateVariants(item);renderEditor();}else renderAll();}
for(const [field,key,max] of [['media-name','name',140],['media-alt','alt',200],['media-caption','caption',500]]){
 $(field).addEventListener('change',()=>{const item=sel();if(!item)return;const val=$(field).value;if(val.length>max||/[\u0000-\u001f]/.test(val))return notify('Некорректный текст',true);checkpoint();item[key]=val;refreshLibrary();renderGallery();});
}
for(const [field,key] of [['focus-x','x'],['focus-y','y']])$(field).addEventListener('change',()=>{const item=sel();if(!item)return;checkpoint();item.focal[key]=Number($(field).value);renderEditor();renderGallery();});
$('ratio').addEventListener('change',()=>editSelected(item=>{item.edit.ratio=$('ratio').value;}));
$('rotate-left').addEventListener('click',()=>editSelected(item=>{item.edit.rotate=(item.edit.rotate+270)%360;}));
$('rotate-right').addEventListener('click',()=>editSelected(item=>{item.edit.rotate=(item.edit.rotate+90)%360;}));
for(const [field,key] of [['crop-w','w'],['crop-h','h']])$(field).addEventListener('change',()=>editSelected(item=>{const v=Number($(field).value)/100;item.edit.crop[key]=v;item.edit.crop[key==='w'?'x':'y']=Math.min(item.edit.crop[key==='w'?'x':'y'],1-v);}));
for(const [field,key,convert] of [['format','mime',v=>v],['quality','quality',v=>Number(v)/100],['width','width',v=>Number(v)]])$(field).addEventListener('change',()=>{const value=convert($(field).value);if(key==='width'&&(!Number.isInteger(value)||value<64||value>8192))return notify('Ширина от 64 до 8192',true);checkpoint();state.processing[key]=value;renderEditor();});
function refreshVariants(){const list=$('variant-list');clear(list);const item=sel();if(!item)return;
 for(const v of item.variants){const row=el('div','variant-row');row.append(el('strong','',`${v.meta.width}×${v.meta.height} · ${v.meta.mime.split('/')[1]}`),el('span','',humanBytes(v.meta.bytes)));const btn=el('button','quiet','↓');btn.title='Скачать файл';btn.disabled=!v.blob;btn.addEventListener('click',()=>download(v.blob,v.meta.file.split('/').pop()));row.append(btn);list.append(row);}
}
function download(blob,name){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);}
function variantMeta(item,result){const extension=C.MIME[result.mime];return {file:`media/${item.id}-${result.width}.${extension}`,mime:result.mime,width:result.width,height:result.height,bytes:result.bytes,sha256:result.sha256};}
async function processItem(item,signal){if(!item.source)throw new Error(item.name+': нужно повторно загрузить оригинал');const results=await E.responsive(item.source,item.edit,state.processing.mime,state.processing.quality,signal,state.processing.width);
  if(signal.cancelled)throw new Error('Операция отменена');const variants=results.map(result=>({meta:variantMeta(item,result),blob:result.blob}));
  for(const v of variants)blobCache.set(v.meta.sha256,v.blob);
  while(Array.from(blobCache.values()).reduce((total,blob)=>total+blob.size,0)>72*1024*1024)blobCache.delete(blobCache.keys().next().value);
  item.variants=variants;return variants.length;
}
async function processBatch(all){if(job){notify('Обработка уже выполняется',true);return;}
  const selected=sel(),items=all?state.items:[selected].filter(Boolean);
  if(!items.length){notify('Сначала импортируйте изображение',true);return;}
  if(items.some(x=>!x.source)){notify('Некоторые оригиналы отсутствуют; загрузите их повторно',true);return;}
  checkpoint();job={cancelled:false};$('cancel').disabled=false;$('process-one').disabled=true;$('process-all').disabled=true;
  let count=0,produced=0,errors=[];
  try{for(const item of items){if(job.cancelled)break;$('batch-status').textContent=`Обработка ${count+1} / ${items.length}: ${item.name}`;
    try{produced+=await processItem(item,job);}catch(e){errors.push(item.name+': '+e.message);if(job.cancelled)break;}
    count++;$('progress-bar').style.width=(100*count/items.length)+'%';await new Promise(resolve=>setTimeout(resolve,0));
  }}finally{const cancelled=job.cancelled;job=null;$('cancel').disabled=true;$('progress-bar').style.width='0%';
    $('batch-status').textContent=`${cancelled?'Отменено · ':''} обработано ${count}/${items.length}, создано ${produced} файлов, ошибок ${errors.length}`;
    if(errors.length)notify(errors.slice(0,2).join(' | '),true);renderAll();}
}
$('process-one').addEventListener('click',()=>processBatch(false).catch(e=>notify(e.message,true)));
$('process-all').addEventListener('click',()=>processBatch(true).catch(e=>notify(e.message,true)));
$('cancel').addEventListener('click',()=>{if(job)job.cancelled=true;});
$('delete-item').addEventListener('click',()=>{const item=sel();if(!item)return;checkpoint();if(item.url)URL.revokeObjectURL(item.url);state.items=state.items.filter(x=>x.id!==item.id);state.gallery.assetIds=state.gallery.assetIds.filter(id=>id!==item.id);if(state.video.posterAssetId===item.id)state.video.posterAssetId=null;state.selectedId=state.items[0]?.id||null;renderAll();});
function setGallery(key,val){checkpoint();state.gallery[key]=val;renderGallery();}
$('gallery-title').addEventListener('change',()=>setGallery('title',$('gallery-title').value));
$('gallery-columns').addEventListener('change',()=>setGallery('columns',Number($('gallery-columns').value)));
$('gallery-layout').querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>setGallery('layout',btn.dataset.layout)));
function galleryItemPhoto(item){const figure=el('figure');if(item.url){const img=el('img');const converted=item.variants.findLast(v=>v.blob);const preview=converted?URL.createObjectURL(converted.blob):null;
 if(preview){img.src=preview;img.addEventListener('load',()=>URL.revokeObjectURL(preview),{once:true});img.addEventListener('error',()=>URL.revokeObjectURL(preview),{once:true});}else img.src=item.url;
 img.alt=item.alt||item.name;img.style.objectPosition=`${item.focal.x}% ${item.focal.y}%`;figure.append(img);
 }else figure.append(el('div','tile-missing','Перезагрузите оригинал'));
 figure.append(el('figcaption','',item.caption||item.name));return figure;}
function renderGallery(){const g=state.gallery;$('gallery-title').value=g.title;$('gallery-columns').value=g.columns;
 $('gallery-layout').querySelectorAll('button').forEach(button=>{button.classList.toggle('active',button.dataset.layout===g.layout);button.setAttribute('aria-pressed',String(button.dataset.layout===g.layout));});
 const order=$('gallery-order');clear(order);
 for(const item of state.items){const active=g.assetIds.includes(item.id),row=el('div','gallery-order-row');const select=el('button',active?'included':'',`${active?'☑':'☐'} ${item.name}`);select.title='Включить/выключить в галерее';select.addEventListener('click',()=>{checkpoint();if(active)g.assetIds=g.assetIds.filter(id=>id!==item.id);else g.assetIds.push(item.id);renderGallery();});
 const up=el('button','','↑'),down=el('button','','↓');up.title='Выше';down.title='Ниже';up.disabled=!active||g.assetIds.indexOf(item.id)===0;down.disabled=!active||g.assetIds.indexOf(item.id)===g.assetIds.length-1;
 const move=dir=>{checkpoint();const idx=g.assetIds.indexOf(item.id),to=idx+dir;[g.assetIds[idx],g.assetIds[to]]=[g.assetIds[to],g.assetIds[idx]];renderGallery();};up.addEventListener('click',()=>move(-1));down.addEventListener('click',()=>move(1));row.append(select,up,down);order.append(row);}
 if(!state.items.length)order.append(el('p','subtext','Галерея появится после загрузки файлов.'));
 const preview=$('gallery-preview');preview.className='gallery-preview '+g.layout;preview.style.setProperty('--columns',g.columns);clear(preview);
 for(const id of g.assetIds){const item=state.items.find(x=>x.id===id);if(item){const figure=galleryItemPhoto(item);if(g.motionId)figure.classList.add('mm-'+g.motionId);preview.append(figure);}}
 if(!preview.children.length)preview.append(el('p','subtext','Здесь будет предпросмотр галереи.'));
 $('prev-slide').disabled=g.layout!=='carousel'||g.assetIds.length<2;$('next-slide').disabled=g.layout!=='carousel'||g.assetIds.length<2;
 const select=$('video-poster'),previous=state.video.posterAssetId||'';clear(select);const empty=el('option','','Без постера');empty.value='';select.append(empty);
 for(const item of state.items){const option=el('option','',item.name);option.value=item.id;select.append(option);}select.value=previous;
}
for(const [field,direction] of [['prev-slide',-1],['next-slide',1]])$(field).addEventListener('click',()=>{const preview=$('gallery-preview');preview.scrollBy({left:direction*preview.clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
$('gallery-preview').addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){$(e.key==='ArrowRight'?'next-slide':'prev-slide').click();e.preventDefault();}});
function motionData(){return state.motion;}
const motionProps=[['motion-preset','preset',String],['duration','duration',Number],['delay','delay',Number],['distance','distance',Number],['easing','easing',String],['trigger','trigger',String],['mobile-motion','mobile',String]];
function legalTrigger(preset){return preset==='hover-lift'?'hover':preset==='focus-ring'?'focus':'load';}
for(const [field,key,convert] of motionProps)$(field).addEventListener('change',()=>{
 const value=convert($(field).value),m={...state.motion,[key]:value};if(key==='preset')m.trigger=legalTrigger(value);
 try{C.validateBundle({...bundle(),motions:[m],css:C.motionCSS([m])});checkpoint();state.motion=m;renderMotion();renderGallery();}catch(error){notify(error.message,true);renderMotion();}
});
function renderMotion(){const m=state.motion;
 for(const [field,key] of motionProps)$(field).value=m[key];$('motion-css').textContent=C.motionCSS([m]);
 const preview=$('motion-demo');preview.className='motion-demo mm-'+m.id;preview.style.animation='none';void preview.offsetWidth;preview.style.animation='';
}
$('replay').addEventListener('click',renderMotion);
const GLYPHS={spark:['M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z'],image:['M3 4h18v16H3z','M5 17l5-6 4 4 3-3 3 5','M8 8h.1'],layers:['M3 9l9-6 9 6-9 6z','M3 14l9 6 9-6'],arrow:['M4 12h16','M14 6l6 6-6 6'],play:['M8 5v14l11-7z'],check:['M4 12l5 5L20 6'],sun:['M12 4v2','M12 18v2','M4 12h2','M18 12h2','M6 6l2 2','M16 16l2 2','M6 18l2-2','M16 8l2-2','M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8'],star:['M12 2l3 7h7l-5.5 5 2 8-6.5-4.4L5.5 22l2-8L2 9h7z']};
function pictogram(token){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','19');svg.setAttribute('height','19');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('aria-hidden','true');
 for(const path of GLYPHS[token]){const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',path);svg.append(p);}return svg;}
function renderIcons(){const root=$('icon-options');clear(root);for(const token of C.ICONS){const btn=el('button','icon-chip'+(state.icons.includes(token)?' active':''));btn.type='button';btn.setAttribute('aria-pressed',String(state.icons.includes(token)));btn.append(pictogram(token),el('span','',token));btn.addEventListener('click',()=>{checkpoint();state.icons=state.icons.includes(token)?state.icons.filter(x=>x!==token):[...state.icons,token];renderIcons();});root.append(btn);}}
for(const [field,key,convert] of [['video-provider','provider',String],['video-url','url',String],['video-poster','posterAssetId',v=>v||null],['video-aspect','aspect',String]])$(field).addEventListener('change',()=>{
 const candidate={...state.video,[key]:convert($(field).value)};
 if(key==='provider')candidate.url='';
 try{if(candidate.provider==='none'||candidate.url)C.normalizeVideo(candidate.provider,candidate.url);checkpoint();state.video=candidate;renderVideo();}catch(e){notify(e.message,true);renderVideo();}
});
function renderVideo(){const v=state.video;$('video-provider').value=v.provider;$('video-url').value=v.url;$('video-poster').value=v.posterAssetId||'';$('video-aspect').value=v.aspect;
 const link=$('video-preview-link');link.hidden=!v.url;if(v.url)link.href=v.url;else link.removeAttribute('href');}
function refreshStats(){const all=state.items.flatMap(i=>i.variants);$('ready-count').textContent=all.filter(x=>x.blob).length;$('bundle-size').textContent=humanBytes(all.reduce((sum,x)=>sum+x.meta.bytes,0));}
function renderAll(){refreshLibrary();renderEditor();renderGallery();renderMotion();renderIcons();renderVideo();refreshStats();historyButtons();}
function project(){return {format:'media-motion-project-v1',bundle:bundle(),edits:Object.fromEntries(state.items.map(x=>[x.id,structuredClone(x.edit)])),processing:{...state.processing}};}
function validateProject(p){if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join()!==['bundle','edits','format','processing'].sort().join()||p.format!=='media-motion-project-v1')throw new Error('Неверный формат проекта');
 C.validateBundle(p.bundle);if(!p.edits||typeof p.edits!=='object'||Array.isArray(p.edits)||Object.keys(p.edits).sort().join()!==p.bundle.assets.map(x=>x.id).sort().join())throw new Error('Некорректный список edit');
 for(const e of Object.values(p.edits)){if(!e||Object.keys(e).sort().join()!=='crop,ratio,rotate'||!['free','1:1','4:3','16:9'].includes(e.ratio)||![0,90,180,270].includes(e.rotate)||!e.crop||Object.keys(e.crop).sort().join()!=='h,w,x,y'||Object.values(e.crop).some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)||e.crop.w<.1||e.crop.h<.1||e.crop.x+e.crop.w>1.00001||e.crop.y+e.crop.h>1.00001)throw new Error('Некорректное кадрирование');}
 if(!p.processing||Object.keys(p.processing).sort().join()!=='mime,quality,width'||!C.MIME[p.processing.mime]||typeof p.processing.quality!=='number'||p.processing.quality<.5||p.processing.quality>.95||!Number.isInteger(p.processing.width)||p.processing.width<64||p.processing.width>8192)throw new Error('Неверные настройки экспорта');return p;}
$('save-project').addEventListener('click',()=>{try{download(new Blob([JSON.stringify(project(),null,2)+'\n'],{type:'application/json'}),'media-motion-project.json');notify('Проект сохранён. Для восстановления изображений также нужны исходные файлы.');}catch(e){notify(e.message,true);}});
$('load-project').addEventListener('change',async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>1024*1024)throw new Error('JSON проекта больше 1 MiB');const p=validateProject(JSON.parse(await file.text()));checkpoint();
   const oldBlobs=sourceCache;
   // Preserve same-digest blobs while replacing metadata.
   const data={items:p.bundle.assets.map(a=>({...a,edit:p.edits[a.id]})),selectedId:p.bundle.assets[0]?.id||null,gallery:p.bundle.galleries[0]||{id:'gallery-main',title:'Галерея',layout:'grid',assetIds:[],columns:3,motionId:'motion-main'},motion:p.bundle.motions[0]||C.makeBundle().motions[0],icons:p.bundle.icons,video:p.bundle.video,processing:p.processing};
   for(const x of state.items)if(x.url)URL.revokeObjectURL(x.url);
   state.items=data.items.map(a=>{const source=oldBlobs.get(a.original.sha256)||null;return {...a,source,url:source?URL.createObjectURL(source.blob):null,variants:a.variants.map(meta=>({meta,blob:blobCache.get(meta.sha256)||null}))};});
   state.gallery=data.gallery;state.motion=data.motion;state.icons=data.icons;state.video=data.video;state.processing=data.processing;state.selectedId=data.selectedId;
   renderAll();notify('Проект открыт. Для отсутствующих бинарных файлов загрузите исходники повторно.');
 }catch(error){notify(error.message,true);}finally{e.target.value='';}});
function safeExportBundle(){const b=bundle();if(!b.assets.length)throw new Error('Нет изображений');
  for(const asset of b.assets){if(!asset.variants.length)throw new Error(`${asset.name}: создайте адаптивные версии`);
    const item=state.items.find(x=>x.id===asset.id);
    for(const v of asset.variants)if(!item.variants.find(q=>q.meta.sha256===v.sha256&&q.blob))throw new Error(`${asset.name}: бинарные файлы отсутствуют — повторите обработку`);
  }
  return b;
}
$('export-json').addEventListener('click',()=>{try{const b=safeExportBundle();download(new Blob([JSON.stringify(b,null,2)+'\n'],{type:'application/json'}),'bundle.json');notify('Контракт прошёл проверку. Бинарные файлы находятся в ZIP.');}catch(e){notify(e.message,true);}});
$('export-css').addEventListener('click',()=>{try{download(new Blob([C.motionCSS([state.motion])],{type:'text/css'}),'motion.css');notify('CSS создан только для используемых preset.');}catch(e){notify(e.message,true);}});
$('export-zip').addEventListener('click',async()=>{try{
 const b=safeExportBundle(),entries=[];
 for(const a of b.assets)for(const v of a.variants){const item=state.items.find(i=>i.id===a.id),candidate=item.variants.find(x=>x.meta.file===v.file);if(!candidate?.blob)throw new Error('Отсутствуют бинарные данные');
   if(candidate.blob.size!==v.bytes||candidate.blob.type!==v.mime||await E.hash(candidate.blob)!==v.sha256)throw new Error('SHA256/MIME/размер файла не совпадает: '+v.file);
   entries.push({name:v.file,bytes:new Uint8Array(await candidate.blob.arrayBuffer())});
 }
 entries.unshift({name:'bundle.json',bytes:new TextEncoder().encode(JSON.stringify(b,null,2)+'\n')});entries.push({name:'motion.css',bytes:new TextEncoder().encode(b.css)});
 const zip=E.makeZip(entries);download(zip,'media-motion-bundle-v1.zip');$('export-status').textContent=`Готово: ${entries.length} файлов, ${humanBytes(zip.size)}, SHA256 всех изображений проверены.`;notify('ZIP скачан · бинарные файлы + контракт + CSS.');
 }catch(e){$('export-status').textContent=e.message;notify(e.message,true);}});
renderAll();
})();
