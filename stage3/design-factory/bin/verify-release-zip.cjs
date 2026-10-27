#!/usr/bin/env node
'use strict';
// Read-only, independent ZIP32 verifier for the actual D7 release archive.
// Rechecks central/local records, CRC32, extracted bytes, complete source inventory.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const ROOT=path.resolve(__dirname,'..');
const PREFIX='stage3/design-factory/';
const NAME=/^stage3\/design-factory\/[a-zA-Z0-9/_ .-]+\.(?:md|cjs|js|json|html|css)$/;
const MAX_ZIP=64*1024*1024,MAX_FILE=2*1024*1024;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const TABLE=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){
 let v=i;for(let j=0;j<8;j++)v=(v&1)?0xedb88320^(v>>>1):v>>>1;t[i]=v>>>0;
}return t;})();
function crc32(b){
 let v=0xffffffff;for(const x of b)v=TABLE[(v^x)&255]^(v>>>8);
 return (v^0xffffffff)>>>0;
}
function sourceFiles(dir=ROOT,relative=''){
 const list=[];
 for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>cmp(a.name,b.name))){
  if(e.name.startsWith('.')||e.name==='node_modules')throw Error('Unsafe source member '+e.name);
  const rel=relative?relative+'/'+e.name:e.name,absolute=path.join(dir,e.name);
  const stat=fs.lstatSync(absolute);
  if(stat.isSymbolicLink())throw Error('Source symlink: '+rel);
  if(e.isDirectory())list.push(...sourceFiles(absolute,rel));
  else if(e.isFile()){
   if(stat.size>MAX_FILE||!NAME.test(PREFIX+rel)||rel.includes('..')||rel.split('/').includes('..'))
    throw Error('Unsafe source member: '+rel);
   list.push(PREFIX+rel);
  }else throw Error('Unsupported source member: '+rel);
 }
 return list.sort(cmp);
}
function verify(zipFile,root=ROOT){
 if(typeof zipFile!=='string'||!zipFile.endsWith('.zip'))throw Error('Expected existing .zip path');
 const input=path.resolve(zipFile),stat=fs.lstatSync(input);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_ZIP||stat.size<22)
  throw Error('ZIP must be a regular file below 64 MiB');
 const canonicalRoot=fs.realpathSync(root);
 if(canonicalRoot!==path.resolve(root)||!fs.lstatSync(root).isDirectory()||fs.lstatSync(root).isSymbolicLink())
  throw Error('Source root must be a canonical regular directory');
 const b=fs.readFileSync(input);
 const foot=b.length-22;
 if(b.readUInt32LE(foot)!==0x06054b50||b.readUInt16LE(foot+20)!==0||
  b.readUInt16LE(foot+4)!==0||b.readUInt16LE(foot+6)!==0)
  throw Error('Invalid ZIP32 end record, comment or multi-disk archive');
 const count=b.readUInt16LE(foot+10),countOnDisk=b.readUInt16LE(foot+8);
 const length=b.readUInt32LE(foot+12),start=b.readUInt32LE(foot+16);
 if(count<20||count!==countOnDisk||start+length!==foot)throw Error('Central directory count/bounds mismatch');
 let pos=start,localEnd=0,totalBytes=0;
 const entries=[],seen=new Set();
 for(let i=0;i<count;i++){
  if(pos+46>foot||b.readUInt32LE(pos)!==0x02014b50)
   throw Error('Missing central entry '+i);
  const madeBy=b.readUInt16LE(pos+4),needed=b.readUInt16LE(pos+6);
  const flags=b.readUInt16LE(pos+8),method=b.readUInt16LE(pos+10);
  const modTime=b.readUInt16LE(pos+12),modDate=b.readUInt16LE(pos+14);
  const crc=b.readUInt32LE(pos+16),packed=b.readUInt32LE(pos+20),unpacked=b.readUInt32LE(pos+24);
  const n=b.readUInt16LE(pos+28),extra=b.readUInt16LE(pos+30),comment=b.readUInt16LE(pos+32);
  const diskStart=b.readUInt16LE(pos+34),internal=b.readUInt16LE(pos+36);
  const external=b.readUInt32LE(pos+38),off=b.readUInt32LE(pos+42);
  // The builder emits one canonical ZIP32 dialect; reject alternate/multi-disk
  // metadata rather than relying on different extractors to interpret it alike.
  if(madeBy!==20||needed!==20||flags!==0x0800||method!==8||modTime!==0||modDate!==0x21||
    extra||comment||diskStart!==0||internal!==0||external!==0||unpacked>MAX_FILE||
    packed>MAX_FILE+65536||pos+46+n>foot)
   throw Error('Unsupported ZIP member options at '+i);
  const nameBytes=b.subarray(pos+46,pos+46+n);
  const name=nameBytes.toString('utf8');
  if(Buffer.from(name,'utf8').compare(nameBytes)!==0||!NAME.test(name)||
    name.includes('..')||name.includes('//')||name.startsWith('/')||seen.has(name))
   throw Error('Invalid or repeated archive path: '+name);
  seen.add(name);
  if(off!==localEnd||off+30+n>start||b.readUInt32LE(off)!==0x04034b50||
    b.readUInt16LE(off+4)!==20||b.readUInt16LE(off+6)!==flags||
    b.readUInt16LE(off+8)!==method||b.readUInt16LE(off+10)!==0||
    b.readUInt16LE(off+12)!==0x21||
    b.readUInt32LE(off+14)!==crc||b.readUInt32LE(off+18)!==packed||
    b.readUInt32LE(off+22)!==unpacked||b.readUInt16LE(off+26)!==n||
    b.readUInt16LE(off+28)!==0||
    !b.subarray(off+30,off+30+n).equals(nameBytes))
   throw Error('Local/central ZIP header mismatch: '+name);
  const payloadStart=off+30+n,payloadEnd=payloadStart+packed;
  if(payloadEnd>start)throw Error('ZIP payload exceeds source range: '+name);
  let content;
  try{content=zlib.inflateRawSync(b.subarray(payloadStart,payloadEnd),{maxOutputLength:MAX_FILE+1});}
  catch(e){throw Error('ZIP inflation failed: '+name+' '+e.message);}
  if(content.length!==unpacked||crc32(content)!==crc)
   throw Error('ZIP CRC/size mismatch: '+name);
  totalBytes+=unpacked;
  if(totalBytes>MAX_ZIP)throw Error('Oversized source total');
  const relative=name.slice(PREFIX.length),file=path.join(canonicalRoot,relative);
  const canonicalFile=fs.realpathSync(file);
  if(!canonicalFile.startsWith(canonicalRoot+path.sep)||!fs.lstatSync(file).isFile()||
    fs.lstatSync(file).isSymbolicLink()||!content.equals(fs.readFileSync(file)))
   throw Error('Extracted ZIP bytes differ from actual source: '+name);
  entries.push({name,bytes:unpacked,crc32:crc,sha256:sha(content),content});
  localEnd=payloadEnd;pos+=46+n;
 }
 if(pos!==foot||localEnd!==start)throw Error('Trailing/local ZIP structure mismatch');
 const expected=sourceFiles(root);
 if(JSON.stringify(expected)!==JSON.stringify(entries.map(e=>e.name)))
  throw Error('ZIP does not contain the exact sorted source inventory');
 const framed=crypto.createHash('sha256');
 for(const entry of entries){
  const n=Buffer.from(entry.name),lengths=Buffer.alloc(8);
  lengths.writeUInt32BE(n.length,0);lengths.writeUInt32BE(entry.content.length,4);
  framed.update(lengths);framed.update(n);framed.update(entry.content);
 }
 return {
  format:'manufact-design-factory-zip-verification-v1',
  zipFile:input,zipSha256:sha(b),zipBytes:b.length,files:count,
  sourceSha256:framed.digest('hex'),sourceBytes:totalBytes,
  sourceExactMatch:true,crcVerified:true,centralDirectoryVerified:true,
  acceptance:'archive/source integrity only; no human review, PHP parity, CI or main CMS merge'
 };
}
module.exports=Object.freeze({verify,sourceFiles,crc32});
if(require.main===module){
 try{
  if(process.argv.length!==3)throw Error('Usage: node bin/verify-release-zip.cjs NEW-output.zip');
  console.log(JSON.stringify(verify(process.argv[2]),null,2));
 }catch(e){console.error('D7 ZIP VERIFY REFUSED: '+e.message);process.exitCode=2;}
}
