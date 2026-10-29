'use strict';
// Dependency-free ZIP (stored, no compression) for the ALREADY VERIFIED
// PUBLIC static upload root. Deterministic binary layout and file ordering;
// private release-manifest, owner records and reports never enter the archive.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PREVIEW=require('./static-host-preview.cjs');
const VERIFY=require('./static-upload-zip-verify.cjs');
const FORMAT='manufact-seo-static-upload-zip-v1';
const CRC_TABLE=Uint32Array.from({length:256},(_,i)=>{
 let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;
 return c>>>0;
});
function crc32(bytes){
 let c=0xffffffff;
 for(const value of bytes)c=CRC_TABLE[(c^value)&255]^(c>>>8);
 return (c^0xffffffff)>>>0;
}
function record(file,bytes,offset){
 const name=Buffer.from(file,'utf8');
 if(!name.length||name.length>65535||bytes.length>0xffffffff||offset>0xffffffff)
  throw Error('Static ZIP file exceeds classic bounded ZIP limits');
 const crc=crc32(bytes);
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);
 local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);
 local.writeUInt16LE(0,8);local.writeUInt16LE(0,10);local.writeUInt16LE(0x21,12);
 local.writeUInt32LE(crc,14);local.writeUInt32LE(bytes.length,18);
 local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(name.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);
 central.writeUInt16LE(0x0314,4);central.writeUInt16LE(20,6);
 central.writeUInt16LE(0x800,8);central.writeUInt16LE(0,10);
 central.writeUInt16LE(0,12);central.writeUInt16LE(0x21,14);
 central.writeUInt32LE(crc,16);central.writeUInt32LE(bytes.length,20);
 central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(name.length,28);
 central.writeUInt32LE((0o100644<<16)>>>0,38);central.writeUInt32LE(offset,42);
 return {local,name,central,size:local.length+name.length+bytes.length};
}
function zip(bundleDir,zipFile){
 if(!path.isAbsolute(bundleDir)||!path.isAbsolute(zipFile))
  throw Error('Bundle and ZIP destination must be absolute');
 const snapshot=PREVIEW.load(bundleDir),output=path.resolve(zipFile);
 const bundle=fs.realpathSync(bundleDir),parent=fs.realpathSync(path.dirname(output));
 if(fs.existsSync(output)||output===bundle||output.startsWith(bundle+path.sep)||
    parent===bundle||parent.startsWith(bundle+path.sep))
  throw Error('New static ZIP must be outside the private immutable bundle');
 const ordered=[...snapshot.files.entries()].sort(([a],[b])=>a.localeCompare(b,'en'));
 if(ordered.length>1405||ordered.length>65535)throw Error('Static ZIP exceeds entry budget');
 const tempDir=fs.mkdtempSync(path.join(parent,'.seo-zip-incomplete-'));
 const temp=path.join(tempDir,'upload.zip');
 const fd=fs.openSync(temp,'wx',0o600);
 let open=true,promoted=false;
 try{
  const central=[];let offset=0,storedBytes=0;
  const write=x=>{let done=0;while(done<x.length){
   const n=fs.writeSync(fd,x,done,x.length-done);
   if(n<=0)throw Error('Static ZIP output could not be written');
   done+=n;
  }};
  for(const [name,item] of ordered){
   if(name.startsWith('/')||name.includes('..')||name==='release-manifest.json'||
      name==='upload-inventory.json'||name.startsWith('CANDIDATE-'))
    throw Error('Private operator documents are forbidden in a public ZIP');
   const absolute=path.join(snapshot.root,name),info=fs.lstatSync(absolute);
   if(info.isSymbolicLink()||!info.isFile()||info.size!==item.size)
    throw Error('Static upload asset changed during ZIP creation');
   const bytes=fs.readFileSync(absolute);
   const digest=crypto.createHash('sha256').update(bytes).digest('hex');
   if(digest!==item.sha256||bytes.length!==item.size)
    throw Error('Static ZIP source changed after independent SHA256 verification');
   const row=record(name,bytes,offset);
   write(row.local);write(row.name);write(bytes);
   central.push(row);offset+=row.size;storedBytes+=bytes.length;
   if(offset>0xffffffff)throw Error('Static ZIP exceeded 4GB classic file format limit');
  }
  const centralOffset=offset;
  for(const row of central){write(row.central);write(row.name);offset+=row.central.length+row.name.length;}
  const centralBytes=offset-centralOffset;
  if(offset>0xffffffff||centralBytes>0xffffffff)
   throw Error('Static ZIP central directory exceeds classic archive limits');
  const eocd=Buffer.alloc(22);eocd.writeUInt32LE(0x06054b50,0);
  eocd.writeUInt16LE(central.length,8);eocd.writeUInt16LE(central.length,10);
  eocd.writeUInt32LE(centralBytes,12);eocd.writeUInt32LE(centralOffset,16);
  write(eocd);fs.fsyncSync(fd);fs.closeSync(fd);open=false;
  if(fs.existsSync(output))throw Error('Another file appeared at the ZIP destination');
  fs.renameSync(temp,output);promoted=true;
  const verified=VERIFY.verify(output,bundleDir);
  if(verified.fileCount!==ordered.length||
     verified.verifiedPayloadBytes!==storedBytes||
     verified.officialManifestSha256!==snapshot.inventory.officialStaticManifestSha256)
   throw Error('Complete output ZIP failed independent archive/inventory parity');
  const digest=verified.sha256;
  return Object.freeze({format:FORMAT,output,sha256:digest,files:central.length,
   payloadBytes:storedBytes,archiveBytes:fs.statSync(output).size,
   sourceSiteId:snapshot.inventory.siteId,
   publishedVersion:snapshot.inventory.publishedVersion,
   officialManifestSha256:snapshot.inventory.officialStaticManifestSha256,
   containsOnlyVerifiedPublicUpload:true,operatorPrivateFilesIncluded:false,
   reproducibleArchive:true,compressed:false,
   remoteUploadPerformed:false,manualReviewRequired:true});
 }catch(error){
  if(open){try{fs.closeSync(fd);}catch{}}
  if(promoted){try{fs.rmSync(output,{force:true});}catch{}}
  throw error;
 }finally{
  fs.rmSync(tempDir,{recursive:true,force:true});
 }
}
module.exports=Object.freeze({FORMAT,crc32,record,zip});
