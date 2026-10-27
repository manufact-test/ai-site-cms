'use strict';
/** D4: deterministic, STORE-only ZIP32 for offline handover. No exec, npm, network.
 * Strict reader verifies local/central records, CRC and safe paths; not a generic
 * decompressor. All entries are regular files with known first-party names.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=m=>{throw Error('Delivery ZIP rejected: '+m);};
const nameOK=n=>typeof n==='string'&&n.length>0&&Buffer.byteLength(n)<=400
  &&/^[a-zA-Z0-9_./@+()[\]-]+$/.test(n)
  &&!n.startsWith('/')&&!n.startsWith('./')&&!n.endsWith('/')
  &&!n.split('/').some(s=>s===''||s==='.'||s==='..');
const table=Array.from({length:256},(_,n)=>{
  let c=n;for(let k=0;k<8;k++)c=c&1?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;
});
function crc(buf){let c=0xffffffff;for(const b of buf)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
const u16=(b,x,o)=>b.writeUInt16LE(x,o),u32=(b,x,o)=>b.writeUInt32LE(x>>>0,o);
function create(entries){
  if(!Array.isArray(entries)||!entries.length||entries.length>4000)fail('invalid entry count');
  const records=[],centers=[],seen=new Set;let off=0,bytes=0;
  for(const e of entries){
    if(!e||!nameOK(e.name)||seen.has(e.name)||!Buffer.isBuffer(e.data))fail('unsafe or duplicated entry name');
    seen.add(e.name);bytes+=e.data.length;
    if(bytes>180000000||e.data.length>125000000)fail('archive is too large');
    const nm=Buffer.from(e.name,'utf8'),size=e.data.length,checksum=crc(e.data);
    if(off>0xffffffff)fail('zip32 size limit');
    const head=Buffer.alloc(30+nm.length);u32(head,0x04034b50,0);u16(head,20,4);
    u16(head,0x800,6);u16(head,0,8);u16(head,0,10);u16(head,0x21,12);
    u32(head,checksum,14);u32(head,size,18);u32(head,size,22);u16(head,nm.length,26);u16(head,0,28);nm.copy(head,30);
    const central=Buffer.alloc(46+nm.length);u32(central,0x02014b50,0);
    u16(central,0x0314,4);u16(central,20,6);u16(central,0x800,8);
    u16(central,0,10);u16(central,0,12);u16(central,0x21,14);
    u32(central,checksum,16);u32(central,size,20);u32(central,size,24);
    u16(central,nm.length,28);u16(central,0,30);u16(central,0,32);
    u16(central,0,34);u16(central,0,36);u32(central,0x81a40000,38);
    u32(central,off,42);nm.copy(central,46);
    records.push(head,e.data);centers.push(central);off+=head.length+size;
  }
  const centralSize=centers.reduce((s,b)=>s+b.length,0);
  if(off+centralSize+22>0xffffffff)fail('zip32 length limit');
  const end=Buffer.alloc(22);u32(end,0x06054b50,0);
  u16(end,entries.length,8);u16(end,entries.length,10);
  u32(end,centralSize,12);u32(end,off,16);
  return Buffer.concat([...records,...centers,end],off+centralSize+22);
}
function readArchive(buf){
  if(!Buffer.isBuffer(buf)||buf.length<22||buf.length>190000000)fail('invalid archive byte length');
  const end=buf.length-22;
  if(buf.readUInt32LE(end)!==0x06054b50||buf.readUInt16LE(end+20)!==0
    ||buf.readUInt16LE(end+4)||buf.readUInt16LE(end+6)
    ||buf.readUInt16LE(end+8)!==buf.readUInt16LE(end+10))fail('invalid single-disk ZIP32 directory');
  const count=buf.readUInt16LE(end+10),size=buf.readUInt32LE(end+12),start=buf.readUInt32LE(end+16);
  if(!count||count>4000||start+size!==end)fail('invalid central directory');
  const entries=new Map();let pos=start,previousEnd=0;
  for(let i=0;i<count;i++){
    if(pos+46>end||buf.readUInt32LE(pos)!==0x02014b50)fail('invalid central header');
    const flags=buf.readUInt16LE(pos+8),method=buf.readUInt16LE(pos+10),
      sum=buf.readUInt32LE(pos+16),packed=buf.readUInt32LE(pos+20),raw=buf.readUInt32LE(pos+24),
      nlen=buf.readUInt16LE(pos+28),extra=buf.readUInt16LE(pos+30),comment=buf.readUInt16LE(pos+32),
      local=buf.readUInt32LE(pos+42),external=buf.readUInt32LE(pos+38);
    if(flags!==0x800||method!==0||packed!==raw||extra||comment||packed>125000000
      ||((external>>>16)&0xf000)!==0x8000||pos+46+nlen>end)fail('unsupported ZIP entry');
    const n=buf.subarray(pos+46,pos+46+nlen).toString('utf8');
    if(!nameOK(n)||entries.has(n))fail('unsafe or duplicated entry');
    if(local!==previousEnd||local+30+nlen>start||buf.readUInt32LE(local)!==0x04034b50
      ||buf.readUInt16LE(local+6)!==0x800||buf.readUInt16LE(local+8)!==0
      ||buf.readUInt32LE(local+14)!==sum||buf.readUInt32LE(local+18)!==packed
      ||buf.readUInt32LE(local+22)!==raw||buf.readUInt16LE(local+26)!==nlen
      ||buf.readUInt16LE(local+28)!==0
      ||buf.subarray(local+30,local+30+nlen).toString('utf8')!==n)fail('local ZIP header mismatch');
    const offset=local+30+nlen;
    if(offset+raw>start)fail('entry exceeds archive body');
    const data=buf.subarray(offset,offset+raw);
    if(crc(data)!==sum)fail('CRC mismatch: '+n);
    entries.set(n,data);previousEnd=offset+raw;pos+=46+nlen;
  }
  if(pos!==end||previousEnd!==start)fail('ZIP entry or directory trailing bytes');
  return entries;
}
module.exports={create,readArchive,hash,nameOK};
