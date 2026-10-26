'use strict';
// Verify actual PNG bytes, not just its signature/IHDR dimensions. No image renderer.
const zlib=require('node:zlib');
const SIGNATURE=Buffer.from('89504e470d0a1a0a','hex');
const MAX_BYTES=25*1024*1024,MAX_PIXELS=10*1024*1024,MAX_CHUNKS=4096;
const CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{
 let c=n;for(let i=0;i<8;i++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;
 return c>>>0;
});
function crc32(buffer,initial=0xffffffff){
 let c=initial;
 for(const byte of buffer)c=CRC_TABLE[(c^byte)&255]^(c>>>8);
 return c>>>0;
}
const CHANNELS={0:1,2:3,3:1,4:2,6:4};
const DEPTHS={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
const ADAM7=[[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]];
function scanShape(width,height,depth,channels,interlace){
 const passes=interlace?ADAM7:[[0,0,1,1]];
 let bytes=0,rows=[];
 for(const [x,y,dx,dy] of passes){
  if(width<=x||height<=y)continue;
  const w=Math.ceil((width-x)/dx),h=Math.ceil((height-y)/dy);
  const rowBytes=Math.ceil(w*depth*channels/8);
  rows.push({height:h,rowBytes});bytes+=(rowBytes+1)*h;
 }
 return {bytes,rows};
}
function inspectPng(input){
 if(!Buffer.isBuffer(input)||input.length<57||input.length>MAX_BYTES||
  !input.subarray(0,8).equals(SIGNATURE))throw Error('PNG signature/size invalid');
 let offset=8,parts=[],count=0,header=null,phase='header',palette=false,ended=false;
 while(offset<input.length){
  if(++count>MAX_CHUNKS||offset+12>input.length)throw Error('PNG truncated/chunk limit');
  const size=input.readUInt32BE(offset),start=offset+8,end=start+size;
  if(size>MAX_BYTES||end+4>input.length)throw Error('PNG truncated/oversized chunk');
  const type=input.toString('ascii',offset+4,offset+8);
  if(!/^[A-Za-z]{4}$/.test(type)||type[2]!==type[2].toUpperCase())
   throw Error('PNG invalid chunk name');
  const stored=input.readUInt32BE(end);
  const data=input.subarray(start,end);
  const actual=(crc32(input.subarray(offset+4,end))^0xffffffff)>>>0;
  if(stored!==actual)throw Error('PNG chunk CRC mismatch: '+type);
  offset=end+4;
  if(!header){
   if(type!=='IHDR'||size!==13)throw Error('PNG IHDR must appear first');
   const width=data.readUInt32BE(0),height=data.readUInt32BE(4);
   const depth=data[8],color=data[9],interlace=data[12];
   if(width<1||height<1||width*height>MAX_PIXELS||
    !DEPTHS[color]?.includes(depth)||data[10]!==0||data[11]!==0||interlace>1)
    throw Error('PNG invalid IHDR dimensions/encoding');
   header={width,height,depth,color,interlace};continue;
  }
  if(type==='IHDR')throw Error('PNG duplicate IHDR');
  if(type==='IEND'){
   if(size!==0||parts.length===0||offset!==input.length)throw Error('PNG invalid IEND/trailing bytes');
   ended=true;break;
  }
  if(type==='PLTE'){
   if(phase!=='header'||palette||size<3||size>768||size%3!==0||
    [0,4].includes(header.color))throw Error('PNG invalid palette');
   palette=true;
  }else if(type==='IDAT'){
   if(phase==='after-data'||(header.color===3&&!palette))throw Error('PNG IDAT order/palette invalid');
   phase='data';parts.push(data);
  }else{
   if(phase==='data')phase='after-data';
   if(type[0]===type[0].toUpperCase())throw Error('PNG unknown critical chunk: '+type);
  }
 }
 if(!ended||offset!==input.length||header.color===3&&!palette)throw Error('PNG incomplete data');
 const shape=scanShape(header.width,header.height,header.depth,CHANNELS[header.color],header.interlace);
 if(shape.bytes>MAX_BYTES)throw Error('PNG decoded data exceeds bound');
 let decoded;
 try{decoded=zlib.inflateSync(Buffer.concat(parts),{maxOutputLength:shape.bytes+1});}
 catch(error){throw Error('PNG IDAT zlib invalid: '+error.message);}
 if(decoded.length!==shape.bytes)throw Error('PNG decoded row length mismatch');
 let cursor=0;
 for(const row of shape.rows){
  for(let i=0;i<row.height;i++){
   if(decoded[cursor]>4)throw Error('PNG invalid scanline filter');
   cursor+=row.rowBytes+1;
  }
 }
 return Object.freeze({width:header.width,height:header.height});
}
module.exports=Object.freeze({inspectPng});
