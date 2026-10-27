#!/usr/bin/env node
'use strict';
// D7 portable reproducible Design Factory ZIP; Node built-ins only.
// Packages only this independently owned subtree; excludes symlinks/unknown types.
// The standalone browser Studio inside it opens offline. CLI source requires
// stage3/sdk + stage3/components from the main repository.
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const REPO=path.resolve(ROOT,'../..');
const {resolveOutsideRepository}=require('../lib/output-path.cjs');
const PREFIX='stage3/design-factory/';
const SUPPORTED=/\.(md|cjs|js|html|css|json)$/i;
const compareName=(a,b)=>a.name<b.name?-1:a.name>b.name?1:0;
const TABLE=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){
 let v=i;for(let n=0;n<8;n++)v=(v&1)?0xEDB88320^(v>>>1):v>>>1;t[i]=v>>>0;
}return t;})();
function crc32(buffer){
 let c=0xFFFFFFFF;
 for(const b of buffer)c=TABLE[(c^b)&255]^(c>>>8);
 return (c^0xFFFFFFFF)>>>0;
}
function collect(dir=ROOT,prefix=''){
 const output=[];
 for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort(compareName)){
  const r=prefix?prefix+'/'+e.name:e.name;
  const absolute=path.join(dir,e.name),stat=fs.lstatSync(absolute);
  if(e.name.startsWith('.')||e.name==='node_modules'||stat.isSymbolicLink())
   throw Error('Unsafe package entry: '+r);
  if(e.isDirectory())output.push(...collect(absolute,r));
  else if(e.isFile()){
   if(!SUPPORTED.test(e.name)||stat.size>2*1024*1024)throw Error('Unexpected file type or oversized file: '+r);
   output.push({name:PREFIX+r,content:fs.readFileSync(absolute)});
  }else throw Error('Unsupported entry '+r);
 }
 return output;
}
function zip(entries){
 const local=[],central=[];
 let offset=0;
 const sha=crypto.createHash('sha256');
 for(const item of entries){
  const name=Buffer.from(item.name,'utf8');
  const original=item.content, compressed=zlib.deflateRawSync(original,{level:9});
  const crc=crc32(original);
  if(name.length>65535||original.length>0xFFFFFFFF||compressed.length>0xFFFFFFFF||offset>0xFFFFFFFF)
   throw Error('ZIP64 required; oversized source');
  const h=Buffer.alloc(30);
  h.writeUInt32LE(0x04034B50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x0800,6);
  h.writeUInt16LE(8,8);h.writeUInt16LE(0,10);h.writeUInt16LE(0x21,12);
  h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(original.length,22);
  h.writeUInt16LE(name.length,26);
  const c=Buffer.alloc(46);
  c.writeUInt32LE(0x02014B50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);
  c.writeUInt16LE(0x0800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(0,12);c.writeUInt16LE(0x21,14);
  c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(original.length,24);
  c.writeUInt16LE(name.length,28);c.writeUInt32LE(0,34);c.writeUInt32LE(0,38);
  c.writeUInt32LE(offset,42);
  local.push(h,name,compressed);central.push(c,name);
  offset+=h.length+name.length+compressed.length;
  // Length-prefix each path and payload so the digest has an unambiguous file boundary.
  const lengths=Buffer.alloc(8);
  lengths.writeUInt32BE(name.length,0);lengths.writeUInt32BE(original.length,4);
  sha.update(lengths);sha.update(name);sha.update(original);
 }
 if(entries.length>65535)throw Error('Too many files for ZIP32');
 const centralBytes=Buffer.concat(central);const foot=Buffer.alloc(22);
 foot.writeUInt32LE(0x06054B50,0);foot.writeUInt16LE(entries.length,8);foot.writeUInt16LE(entries.length,10);
 foot.writeUInt32LE(centralBytes.length,12);foot.writeUInt32LE(offset,16);
 const archive=Buffer.concat([...local,centralBytes,foot]);
 return {archive,sourceSha256:sha.digest('hex')};
}
function main(args){
 if(args.length!==1||!args[0].endsWith('.zip'))throw Error('Usage: node bin/package-release.cjs NEW-output.zip');
 const dest=resolveOutsideRepository(args[0],REPO,'Package output');
 const files=collect().sort(compareName);
 if(files.length<20)throw Error('Incomplete source; refusing a partial package');
 const result=zip(files);
 fs.writeFileSync(dest,result.archive,{flag:'wx',mode:0o600});
 console.log(JSON.stringify({
  format:'manufact-design-factory-zip-v1',package:dest,files:files.length,
  bytes:result.archive.length,zipSha256:crypto.createHash('sha256').update(result.archive).digest('hex'),
  sourceSha256:result.sourceSha256,
  mode:'offline viewer + source; CLI requires main repo SDK/manifests'
 },null,2));
}
try{main(process.argv.slice(2));}catch(err){
 console.error('Design Factory package refused: '+err.message);process.exitCode=2;
}
