'use strict';
/* Local-only raster processing for the Stage2 design lab. No network or production uploads. */
(()=>{
  const MAX_FILE=6_000_000,MAX_PIXELS=36_000_000,MAX_ENCODED=240_000;
  async function decode(file){
    if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size<1||file.size>MAX_FILE)
      throw Error('Поддерживаются только JPG, PNG или WebP размером до 6 МБ');
    const image=await createImageBitmap(file);
    try{
      if(!image.width||!image.height||image.width*image.height>MAX_PIXELS)
        throw Error('Изображение слишком большое для локальной обработки');
      let factor=Math.min(1,1400/Math.max(image.width,image.height));
      for(let attempt=0;attempt<8;attempt++){
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.width*factor));
        canvas.height=Math.max(1,Math.round(image.height*factor));
        const ctx=canvas.getContext('2d',{alpha:false});
        if(!ctx)throw Error('Canvas недоступен');
        ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(image,0,0,canvas.width,canvas.height);
        const data=canvas.toDataURL('image/webp',Math.max(.48,.8-attempt*.045));
        canvas.width=0;canvas.height=0;
        if(!data.startsWith('data:image/webp;base64,'))
          throw Error('Ваш браузер не поддерживает локальное кодирование WebP');
        if(data.length<=MAX_ENCODED){
          const alt=file.name.replace(/\.[^.]*$/,'').replace(/[_-]+/g,' ').trim().slice(0,160);
          return {data,alt};
        }
        factor*=.79;
      }
      throw Error('Не удалось уменьшить изображение до безопасного размера');
    }finally{image.close();}
  }
  const slots=Object.freeze({
    hero:[['hero','Фото на главном экране']],
    story:[['photo','Фото компании или производства']],
    // Catalog and services now use per-item photos from the repeatable collection.
  });
  Object.defineProperty(window,'CmsPreviewMedia',{value:Object.freeze({decode,slots})});
})();
