'use strict';
// Verify a complete stored-only ZIP without extraction. Every local header,
// central-directory entry, CRC32 and SHA256 must match the sealed operator
// public upload inventory. Reject path tricks, injected files and truncation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PREVIEW=require('./static-host-preview.cjs');
const TABLE=Uint32Array.from({length:256},(_,i)=>{
 let v=i;for(let j=0;j<8;j++)v=v&1?0xedb88320^(v>>>1):v>>>1;
 return v>>>0;
});
const CRC=(seed,bytes)=>{let c=seed;for(const v of bytes)c=TABLE[(c^v)&255]^(c>>>8);return c>>>0};
const SHA=/^[a-f0-9]{64}$/;
function verify(archive,bundle){
 if(!path.isAbsolute(archive)||!path.isAbsolute(bundle))
  throw Error('Verified ZIP requires absolute existing archive and upload directory');
 const snap=PREVIEW.load(bundle),stat=fs.lstatSync(archive);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<22||stat.size>190000000)
  throw Error('ZIP is not a bounded ordinary file');
 const fd=fs.openSync(archive,'r'),size=stat.size;
 const read=(at,length)=>{
  if(!Number.isSafeInteger(at)||!Number.isSafeInteger(length)||at<0||
     length<0||at+length>size||length>2000000)
   throw Error('ZIP entry is out of bounds');
  const b=Buffer.alloc(length);let pos=0;
  while(pos<length){
   const n=fs.readSync(fd,b,pos,length-pos,at+pos);
   if(!n)throw Error('ZIP unexpectedly truncated');
   pos+=n;
  }
  return b;
 };
 try{
  const trailer=read(size-22,22);
  if(trailer.readUInt32LE(0)!==0x06054b50||
     trailer.readUInt16LE(4)!==0||trailer.readUInt16LE(6)!==0||
     trailer.readUInt16LE(20)!==0)
   throw Error('ZIP must be a single-disk, comment-free, classic stored archive');
  const count=trailer.readUInt16LE(10),centralBytes=trailer.readUInt32LE(12),
    centralAt=trailer.readUInt32LE(16);
  if(count!==snap.files.size||count!==trailer.readUInt16LE(8)||
     centralAt+centralBytes!==size-22)
   throw Error('ZIP central directory count or extent does not match upload ledger');
  const found=new Set(),chunk=Buffer.alloc(1024*1024),hashZip=crypto.createHash('sha256');
  let centralCursor=centralAt,expectedLocalCursor=0,total=0;
  for(let i=0;i<count;i++){
   const central=read(centralCursor,46);
   if(central.readUInt32LE(0)!==0x02014b50||
      central.readUInt16LE(8)!==0x800||central.readUInt16LE(10)!==0||
      central.readUInt16LE(30)!==0||central.readUInt16LE(32)!==0||
      central.readUInt16LE(34)!==0||central.readUInt16LE(36)!==0)
    throw Error('ZIP contains unsupported central metadata, compression or flags');
   const nameLen=central.readUInt16LE(28),name=read(centralCursor+46,nameLen).toString('utf8'),
      entry=snap.files.get(name),offset=central.readUInt32LE(42),
      stored=central.readUInt32LE(20),crc=central.readUInt32LE(16);
   if(!nameLen||nameLen>240||!entry||found.has(name)||
      stored!==entry.size||stored!==central.readUInt32LE(24)||
      !SHA.test(entry.sha256)||offset!==expectedLocalCursor)
    throw Error('ZIP contains unlisted, duplicated or size-mismatched public files');
   const local=read(offset,30);
   if(local.readUInt32LE(0)!==0x04034b50||local.readUInt16LE(6)!==0x800||
      local.readUInt16LE(8)!==0||local.readUInt16LE(26)!==nameLen||
      local.readUInt16LE(28)!==0||local.readUInt32LE(14)!==crc||
      local.readUInt32LE(18)!==stored||local.readUInt32LE(22)!==stored||
      read(offset+30,nameLen).toString('utf8')!==name)
    throw Error('ZIP local headers differ from central index and public upload inventory');
   const dataAt=offset+30+nameLen;
   if(dataAt+stored>centralAt)throw Error('ZIP data overlaps central index');
   const digest=crypto.createHash('sha256');let checksum=0xffffffff;
   for(let j=0;j<stored;){
    const n=Math.min(chunk.length,stored-j),got=fs.readSync(fd,chunk,0,n,dataAt+j);
    if(got!==n)throw Error('ZIP contains truncated public bytes');
    const part=chunk.subarray(0,n);digest.update(part);checksum=CRC(checksum,part);j+=n;
   }
   if(digest.digest('hex')!==entry.sha256||((checksum^0xffffffff)>>>0)!==crc)
    throw Error('ZIP archive entry SHA256/CRC32 differs from the approved public upload');
   expectedLocalCursor=dataAt+stored;
   centralCursor+=46+nameLen;found.add(name);total+=stored;
  }
  if(centralCursor!==size-22||expectedLocalCursor!==centralAt||
     total!==snap.inventory.totalPayloadBytes)
   throw Error('ZIP directory has trailing data or payload total mismatch');
  for(let at=0;at<size;){
   const n=Math.min(chunk.length,size-at),got=fs.readSync(fd,chunk,0,n,at);
   if(got!==n)throw Error('ZIP final SHA256 checksum incomplete');
   hashZip.update(chunk.subarray(0,n));at+=n;
  }
  return Object.freeze({file:archive,sha256:hashZip.digest('hex'),
   fileCount:count,verifiedPayloadBytes:total,
   officialManifestSha256:snap.inventory.officialStaticManifestSha256,
   siteId:snap.inventory.siteId,publishedVersion:snap.inventory.publishedVersion,
   centralDirectoryChecked:true,perEntryCrc32Checked:true,
   perEntrySha256Checked:true,operatorPrivateFilesIncluded:false,
   extractionPerformed:false,publicDeploymentPerformed:false});
 }finally{fs.closeSync(fd);}
}
module.exports=Object.freeze({verify});
