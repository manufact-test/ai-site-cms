/* In-browser, network-free raster engine + deterministic uncompressed ZIP writer. */
(function(root) {
'use strict';
const C = root.MediaMotionContract;
const MAX_SOURCE = 12 * 1024 * 1024, MAX_PIXELS = 18_000_000, MAX_SIDE = 8192, MAX_ITEMS = 24;
function sniff(bytes) {
  const b = new Uint8Array(bytes);
  if (b.length >= 24 && [137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n) && b[12]===73 && b[13]===72 && b[14]===68 && b[15]===82) return 'image/png';
  if (b.length >= 16 && b[0]===255 && b[1]===216 && b[2]===255 && b[b.length-2]===255 && b[b.length-1]===217) return 'image/jpeg';
  if (b.length >= 20 && String.fromCharCode(...b.slice(0,4))==='RIFF' && String.fromCharCode(...b.slice(8,12))==='WEBP' && (new DataView(b.buffer).getUint32(4,true)+8===b.length) && ['VP8 ','VP8L','VP8X'].includes(String.fromCharCode(...b.slice(12,16)))) return 'image/webp';
  throw new Error('Разрешены только настоящие PNG/JPEG/WebP, с целым заголовком файла');
}
async function hash(blob) {
  const bytes=await blob.arrayBuffer();
  return root.crypto?.subtle ? C.hex(await root.crypto.subtle.digest('SHA-256', bytes)) : root.MediaMotionSHA256.digest(new Uint8Array(bytes));
}
async function load(file) {
  if (!(file instanceof Blob) || file.size < 20 || file.size > MAX_SOURCE) throw new Error('Файл повреждён или превышает 12 MiB');
  const bytes = await file.arrayBuffer(), mime = sniff(bytes);
  if (file.type && file.type !== mime && file.type !== 'application/octet-stream') throw new Error('MIME файла противоречит содержимому');
  const blob = new Blob([bytes], {type:mime});
  let bitmap;
  try { bitmap = await createImageBitmap(blob); } catch { throw new Error('Изображение не декодируется браузером'); }
  const {width,height} = bitmap;
  bitmap.close();
  if (width < 1 || height < 1 || width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) throw new Error('Недопустимые размеры или более 18 Мп');
  return {blob,mime,width,height,bytes:blob.size,sha256:await hash(blob)};
}
function canvas(width,height) {
  const el=document.createElement('canvas');el.width=width;el.height=height;
  const ctx=el.getContext('2d',{alpha:true,willReadFrequently:false});
  if (!ctx) throw new Error('Canvas недоступен');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  return {el,ctx};
}
function clamp(n,a,b) {return Math.min(b,Math.max(a,n));}
function geometry(source, edit) {
  const r=edit.crop||{x:0,y:0,w:1,h:1};
  let x=clamp(r.x,0,.99),y=clamp(r.y,0,.99),w=clamp(r.w,.01,1-x),h=clamp(r.h,.01,1-y);
  const ratio=edit.ratio||'free';
  const proportions={'1:1':1,'4:3':4/3,'16:9':16/9};
  if(proportions[ratio]) {
    const p=proportions[ratio];
    const required=(w*source.width)/(h*source.height);
    if(required>p) w=h*source.height*p/source.width;
    else h=w*source.width/(p*source.height);
    x=clamp(x,0,1-w);y=clamp(y,0,1-h);
  }
  const srcX=Math.round(x*source.width),srcY=Math.round(y*source.height);
  const srcW=clamp(Math.round(w*source.width),1,source.width-srcX),srcH=clamp(Math.round(h*source.height),1,source.height-srcY);
  const rotate=((Number(edit.rotate)||0)%360+360)%360;
  if(![0,90,180,270].includes(rotate)) throw new Error('Некорректный поворот');
  return {x:srcX,y:srcY,w:srcW,h:srcH,rotate,outW:rotate%180?srcH:srcW,outH:rotate%180?srcW:srcH};
}
async function render(source,edit,width) {
  const g=geometry(source,edit);
  const outW=clamp(Math.round(width||g.outW),1,g.outW);
  const outH=Math.max(1,Math.round(outW*g.outH/g.outW));
  if(outW*outH>MAX_PIXELS || outW>MAX_SIDE || outH>MAX_SIDE) throw new Error('Слишком большой выходной Canvas');
  const {el,ctx}=canvas(outW,outH);
  const bitmap=await createImageBitmap(source.blob);
  try {
    ctx.translate(outW/2,outH/2);ctx.rotate(g.rotate*Math.PI/180);
    const drawW=g.rotate%180?outH:outW,drawH=g.rotate%180?outW:outH;
    ctx.drawImage(bitmap,g.x,g.y,g.w,g.h,-drawW/2,-drawH/2,drawW,drawH);
  } finally {bitmap.close();}
  return el;
}
function encode(canvas,mime,quality) {
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob && blob.size>0?resolve(blob):reject(new Error('Canvas не смог закодировать изображение')),mime,quality));
}
async function optimize(source,edit,desiredWidth,mime,quality,signal) {
  if(!C.MIME[mime]) throw new Error('Недопустимый формат');
  const natural=geometry(source,edit).outW;
  let width=clamp(Math.round(desiredWidth||natural),1,natural);
  for(let step=0;step<12;step++) {
    if(signal?.cancelled) throw new Error('Операция отменена');
    const surface=await render(source,edit,width);
    for(const q of (mime==='image/png'?[1]:[quality,Math.max(.62,quality-.12),.5])) {
      if(signal?.cancelled) throw new Error('Операция отменена');
      const blob=await encode(surface,mime,q);
      if(blob.type!==mime) throw new Error('Браузер не поддерживает выбранный encoder');
      if(blob.size<=C.MAX_OUTPUT) return {blob,width:surface.width,height:surface.height,mime,bytes:blob.size,sha256:await hash(blob)};
    }
    width=Math.floor(width*.84);
    if(width<64) break;
  }
  throw new Error('Не удалось оптимизировать до 450 KiB без чрезмерной потери разрешения');
}
async function responsive(source,edit,mime,quality,signal,extraWidth=null) {
  const max=geometry(source,edit).outW;
  const sizes=[360,720,1200].filter(n=>n<=max);
  if(!sizes.length) sizes.push(max);
  else if(max<1200 && !sizes.includes(max)) sizes.push(max);
  if(Number.isInteger(extraWidth)&&extraWidth>=64&&extraWidth<=max) sizes.push(extraWidth);
  sizes.sort((a,b)=>a-b);
  const variants=[],seen=new Set();
  for(const size of [...new Set(sizes)]) {
    if(signal?.cancelled) throw new Error('Операция отменена');
    const r=await optimize(source,edit,size,mime,quality,signal);
    if(seen.has(r.width)) continue;
    seen.add(r.width);variants.push(r);
  }
  return variants;
}
const utf8=s=>new TextEncoder().encode(s);
const crcTable=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
function crc32(b){let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function makeZip(entries) {
  if(entries.length>200)throw new Error('Слишком много файлов в ZIP');
  const parts=[],central=[],offsets=new Set();let offset=0;
  const u16=(dv,p,n)=>dv.setUint16(p,n,true),u32=(dv,p,n)=>dv.setUint32(p,n>>>0,true);
  for(const {name,bytes} of entries) {
    if(!/^(?:media\/[a-z][a-z0-9-]{2,63}-\d{2,5}\.(?:png|jpg|webp)|bundle\.json|motion\.css)$/.test(name)||offsets.has(name))throw new Error('Недопустимое ZIP-имя');
    offsets.add(name);if(!(bytes instanceof Uint8Array))throw new Error('ZIP expects binary bytes');
    const nameBytes=utf8(name),crc=crc32(bytes),local=new Uint8Array(30+nameBytes.length),lv=new DataView(local.buffer);
    u32(lv,0,0x04034b50);u16(lv,4,20);u16(lv,6,0x800);u16(lv,8,0);u32(lv,14,crc);u32(lv,18,bytes.length);u32(lv,22,bytes.length);u16(lv,26,nameBytes.length);local.set(nameBytes,30);
    const current=offset;offset+=local.length+bytes.length;parts.push(local,bytes);
    const c=new Uint8Array(46+nameBytes.length),cv=new DataView(c.buffer);
    u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x800);u32(cv,16,crc);u32(cv,20,bytes.length);u32(cv,24,bytes.length);u16(cv,28,nameBytes.length);u32(cv,42,current);c.set(nameBytes,46);central.push(c);
  }
  const centralSize=central.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
  u32(e,0,0x06054b50);u16(e,8,entries.length);u16(e,10,entries.length);u32(e,12,centralSize);u32(e,16,offset);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}
root.MediaMotionEngine=Object.freeze({sniff,hash,load,geometry,render,optimize,responsive,makeZip,MAX_SOURCE,MAX_ITEMS});
})(globalThis);
