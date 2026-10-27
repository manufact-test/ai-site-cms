/* Design Factory offline preview ZIP32. First-party, no network and no dependencies.
 * Archive carries shareable static preview only, never a production CMS release.
 */
(function(global,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 else global.DesignFactoryPreviewZip=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const FILES=Object.freeze([
  'README.txt','approach/index.html','assets/preview.css','contact/index.html',
  'index.html','preview-info.json','review.html','services/index.html'
 ]);
 const DELIVERY_FILES=Object.freeze([
  'README.txt','audit/content-audit.json','audit/owner-review.html',
  'client/feedback.json','cms/bridge-v2.json','cms/integration-v2.json',
  'cms/site-v1.json','design/project.json','design/services.txt',
  'design/workspace.json','manifest.json',
  'preview/approach/index.html','preview/assets/preview.css',
  'preview/contact/index.html','preview/index.html',
  'preview/preview-info.json','preview/review.html','preview/services/index.html'
 ]);
 const MAX_MEMBER=2*1024*1024,MAX_TOTAL=8*1024*1024,MAX_ZIP=9*1024*1024;
 const CRC=Uint32Array.from({length:256},(_,index)=>{
  let value=index;
  for(let n=0;n<8;n++)value=value&1?0xedb88320^(value>>>1):value>>>1;
  return value>>>0;
 });
 function utf8(text){
  if(typeof text!=='string')throw Error('Preview files must be text');
  const bytes=[];
  for(let i=0;i<text.length;i++){
   let code=text.charCodeAt(i);
   if(code>=0xd800&&code<=0xdbff){
    const next=text.charCodeAt(++i);
    if(!(next>=0xdc00&&next<=0xdfff))throw Error('Unpaired UTF-16 surrogate');
    code=0x10000+((code-0xd800)<<10)+(next-0xdc00);
   }else if(code>=0xdc00&&code<=0xdfff)throw Error('Unpaired UTF-16 surrogate');
   if(code<0x80)bytes.push(code);
   else if(code<0x800)bytes.push(0xc0|(code>>6),0x80|(code&63));
   else if(code<0x10000)bytes.push(0xe0|(code>>12),0x80|((code>>6)&63),0x80|(code&63));
   else bytes.push(0xf0|(code>>18),0x80|((code>>12)&63),0x80|((code>>6)&63),0x80|(code&63));
  }
  return Uint8Array.from(bytes);
 }
 function crc32(bytes){
  let crc=0xffffffff;
  for(const value of bytes)crc=CRC[(crc^value)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
 }
 function concat(parts,size){
  const bytes=new Uint8Array(size);let at=0;
  for(const part of parts){bytes.set(part,at);at+=part.length;}
  if(at!==size)throw Error('Preview ZIP internal size mismatch');
  return bytes;
 }
 function u16(view,at,n){view.setUint16(at,n,true);}
 function u32(view,at,n){view.setUint32(at,n,true);}
 function contentMap(files,names){
  if(!Array.isArray(files)||files.length!==names.length)throw Error('Unexpected ZIP file count');
  const entries=new Map();
  for(const file of files){
   if(!file||typeof file.name!=='string'||!names.includes(file.name)||entries.has(file.name))
    throw Error('Unexpected or duplicate preview ZIP member');
   const bytes=utf8(file.content);
   if(bytes.length>MAX_MEMBER)throw Error('Preview ZIP member too large: '+file.name);
   entries.set(file.name,bytes);
  }
  if(names.some(name=>!entries.has(name)))throw Error('Incomplete preview ZIP inventory');
  return entries;
 }
 function buildProfile(files,names){
  const records=contentMap(files,names),local=[],central=[];
  let offset=0,total=0,centralSize=0;
  for(const name of names){
   const path=utf8(name),data=records.get(name),crc=crc32(data);
   total+=data.length;if(total>MAX_TOTAL)throw Error('Preview exceeds 8 MiB');
   const localHeader=new Uint8Array(30),a=new DataView(localHeader.buffer);
   u32(a,0,0x04034b50);u16(a,4,20);u16(a,6,0x0800);u16(a,8,0);
   u16(a,10,0);u16(a,12,0x21);u32(a,14,crc);
   u32(a,18,data.length);u32(a,22,data.length);u16(a,26,path.length);
   const center=new Uint8Array(46),b=new DataView(center.buffer);
   u32(b,0,0x02014b50);u16(b,4,20);u16(b,6,20);u16(b,8,0x0800);
   u16(b,10,0);u16(b,12,0);u16(b,14,0x21);
   u32(b,16,crc);u32(b,20,data.length);u32(b,24,data.length);
   u16(b,28,path.length);u32(b,42,offset);
   local.push(localHeader,path,data);central.push(center,path);
   offset+=30+path.length+data.length;centralSize+=46+path.length;
   if(offset+centralSize+22>MAX_ZIP)throw Error('Preview ZIP exceeds 9 MiB');
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  u32(v,0,0x06054b50);u16(v,8,names.length);u16(v,10,names.length);
  u32(v,12,centralSize);u32(v,16,offset);
  return concat([...local,...central,end],offset+centralSize+22);
 }
 function inspectProfile(bytes,names){
  if(!(bytes instanceof Uint8Array)||bytes.length<22||bytes.length>MAX_ZIP)
   throw Error('Invalid preview ZIP bytes');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const length=bytes.length,foot=length-22;
  if(view.getUint32(foot,true)!==0x06054b50||
   view.getUint16(foot+4,true)!==0||view.getUint16(foot+6,true)!==0||
   view.getUint16(foot+8,true)!==names.length||
   view.getUint16(foot+10,true)!==names.length||view.getUint16(foot+20,true)!==0)
   throw Error('Invalid ZIP end directory');
  const start=view.getUint32(foot+16,true),size=view.getUint32(foot+12,true);
  if(start+size!==foot)throw Error('Preview ZIP central directory bounds');
  let pos=start,localEnd=0,total=0;
  for(const name of names){
   const encoded=utf8(name),n=encoded.length;
   if(pos+46+n>foot||view.getUint32(pos,true)!==0x02014b50||
    view.getUint16(pos+4,true)!==20||view.getUint16(pos+6,true)!==20||
    view.getUint16(pos+8,true)!==0x0800||view.getUint16(pos+10,true)!==0||
    view.getUint16(pos+12,true)!==0||view.getUint16(pos+14,true)!==0x21||
    view.getUint16(pos+28,true)!==n||view.getUint16(pos+30,true)!==0||
    view.getUint16(pos+32,true)!==0||view.getUint16(pos+34,true)!==0||
    view.getUint16(pos+36,true)!==0||view.getUint32(pos+38,true)!==0)
    throw Error('Invalid central ZIP member: '+name);
   for(let i=0;i<n;i++)if(bytes[pos+46+i]!==encoded[i])throw Error('Unexpected preview file name');
   const crc=view.getUint32(pos+16,true),packed=view.getUint32(pos+20,true);
   const unpacked=view.getUint32(pos+24,true),off=view.getUint32(pos+42,true);
   if(packed!==unpacked||packed>MAX_MEMBER||off!==localEnd||
    off+30+n+packed>start||view.getUint32(off,true)!==0x04034b50||
    view.getUint16(off+4,true)!==20||view.getUint16(off+6,true)!==0x0800||
    view.getUint16(off+8,true)!==0||view.getUint16(off+10,true)!==0||
    view.getUint16(off+12,true)!==0x21||view.getUint32(off+14,true)!==crc||
    view.getUint32(off+18,true)!==packed||view.getUint32(off+22,true)!==unpacked||
    view.getUint16(off+26,true)!==n||view.getUint16(off+28,true)!==0)
    throw Error('ZIP local/central mismatch: '+name);
   for(let i=0;i<n;i++)if(bytes[off+30+i]!==encoded[i])throw Error('ZIP local file name mismatch');
   const startData=off+30+n,endData=startData+packed;
   if(crc32(bytes.subarray(startData,endData))!==crc)throw Error('ZIP CRC mismatch: '+name);
   total+=unpacked;if(total>MAX_TOTAL)throw Error('Oversized ZIP extraction');
   localEnd=endData;pos+=46+n;
  }
  if(pos!==foot||localEnd!==start)throw Error('Preview ZIP trailing records');
  return Object.freeze({format:'manufact-design-factory-preview-zip-v1',
   files:names.length,bytes:length,sourceBytes:total,crcVerified:true,
   warning:'Offline static preview only; not CMS PHP parity, human approval or production release'});
 }
 function build(files){return buildProfile(files,FILES);}
 function inspect(bytes){return inspectProfile(bytes,FILES);}
 function buildDelivery(files){return buildProfile(files,DELIVERY_FILES);}
 function inspectDelivery(bytes){return inspectProfile(bytes,DELIVERY_FILES);}
 function crcText(value){return crc32(utf8(value));}
 return {build,inspect,files:FILES,crc32,crcText,
  buildDelivery,inspectDelivery,deliveryFiles:DELIVERY_FILES};
});