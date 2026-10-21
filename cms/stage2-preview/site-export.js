'use strict';
/**
 * Stage2 demonstration site export. Every file is a script-free, inert preview.
 * Never a publisher, upload, or production deploy package.
 */
(()=>{
  const P=window.CmsPreviewProject,R=window.CmsPreviewRender;
  const encoder=new TextEncoder();
  const utf8=s=>encoder.encode(s);
  const crc32=bytes=>{
    let c=0xffffffff;
    for(const byte of bytes){
      c^=byte;
      for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);
    }
    return (c^0xffffffff)>>>0;
  };
  function concat(chunks){
    const size=chunks.reduce((n,x)=>n+x.length,0);
    const result=new Uint8Array(size);
    let at=0;
    for(const x of chunks){result.set(x,at);at+=x.length;}
    return result;
  }
  function archive(files){
    const local=[],central=[];
    let offset=0,centralSize=0;
    for(const file of files){
      const name=utf8(file.name),bytes=utf8(file.content),crc=crc32(bytes);
      if(name.length>65535||bytes.length>2_000_000)throw Error('Файл превышает лимит демо-архива');
      const header=new Uint8Array(30),a=new DataView(header.buffer);
      a.setUint32(0,0x04034b50,true);
      a.setUint16(4,20,true);a.setUint16(6,0x0800,true);
      a.setUint32(14,crc,true);a.setUint32(18,bytes.length,true);
      a.setUint32(22,bytes.length,true);a.setUint16(26,name.length,true);
      local.push(header,name,bytes);
      const record=new Uint8Array(46),b=new DataView(record.buffer);
      b.setUint32(0,0x02014b50,true);b.setUint16(4,20,true);
      b.setUint16(6,20,true);b.setUint16(8,0x0800,true);
      b.setUint32(16,crc,true);b.setUint32(20,bytes.length,true);
      b.setUint32(24,bytes.length,true);b.setUint16(28,name.length,true);
      b.setUint32(42,offset,true);
      central.push(record,name);
      centralSize+=record.length+name.length;
      offset+=header.length+name.length+bytes.length;
    }
    const end=new Uint8Array(22),view=new DataView(end.buffer);
    view.setUint32(0,0x06054b50,true);
    view.setUint16(8,files.length,true);
    view.setUint16(10,files.length,true);
    view.setUint32(12,centralSize,true);view.setUint32(16,offset,true);
    return new Blob([concat([...local,...central,end])],{type:'application/zip'});
  }
  function build(raw){
    const project=P.validate(raw);
    const menu=project.pages.map(p=>({id:p.id,title:p.title,slug:p.slug}));
    const files=project.pages.map(p=>({
      name:(p.slug||'index')+'.html',
      content:R.render(P.pageDoc(project,p),null,false,{
        seoTitle:p.seoTitle,seoDescription:p.seoDescription,
        menu,active:p.id,exportLinks:true
      })
    }));
    files.push({name:'project-backup.json',content:JSON.stringify(project,null,2)+'\n'});
    files.push({name:'README.txt',content:
      'AI Site CMS — offline demo export (Stage 2)\n\n'+
      'Unpack the archive and open index.html in a browser.\n'+
      'All navigation is local; no server, CMS, network access or form submission.\n'+
      'project-backup.json can be imported back into the local preview editor.\n'+
      'This is NOT a production build, deploy package, public site or publication.\n'+
      'Any form is intentionally disabled. Demo content requires review.\n'});
    return archive(files);
  }
  Object.defineProperty(window,'CmsPreviewExport',{value:Object.freeze({build})});
})();
