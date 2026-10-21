#!/usr/bin/env node
// Network-isolated ZIP parser and explicit opt-in GitHub public codeload fetch.
// ZIP entries are NEVER extracted or executed. Checks actual decoded bytes
// against the 78 Git blob object IDs from upstream v2.5.2 signed-tag tree.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {checkUpstreamTranscript,loadUpstream} from './sodium-upstream-tree-proof.mjs';
const COMMIT='3246b36803c177847e677862fedeb7f937869adb';
const LIMIT=12*1024*1024,MAX_FILE=2*1024*1024,MAX_NAMES=300;
const die=why=>{throw Error('SODIUM_REAL_ZIP_REFUSED: '+why)};
const need=(ok,why)=>{if(!ok)die(why)};
export function crc32(data){
  let r=0xffffffff;
  for(const b of data){
    r^=b;
    for(let n=0;n<8;n++)r=(r>>>1)^(0xedb88320&(-(r&1)));
  }
  return (r^0xffffffff)>>>0;
}
const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
const gitBlob=data=>crypto.createHash('sha1')
  .update(Buffer.from('blob '+data.length)).update(Buffer.from([0]))
  .update(data).digest('hex');
const textDecoder=new TextDecoder('utf-8',{fatal:true});
const nameFrom=(bytes,why)=>{
  let s;try{s=textDecoder.decode(bytes);}catch{die('invalid UTF8 '+why)}
  need(s.length>0&&s.length<=400&&!s.includes('\0')&&!s.includes('\\')&&
    !s.startsWith('/')&&!s.split('/').some(x=>x==='..'||x==='.'),
    'invalid, absolute or traversal ZIP '+why);
  return s;
};
function regularZipEntry(buf,off,centralEnd){
  need(off+46<=centralEnd&&buf.readUInt32LE(off)===0x02014b50,'missing central directory header');
  const flags=buf.readUInt16LE(off+8),method=buf.readUInt16LE(off+10);
  const size=buf.readUInt32LE(off+24),compressed=buf.readUInt32LE(off+20);
  const fname=buf.readUInt16LE(off+28),extra=buf.readUInt16LE(off+30),comment=buf.readUInt16LE(off+32);
  const crc=buf.readUInt32LE(off+16),disk=buf.readUInt16LE(off+34);
  const attrs=buf.readUInt32LE(off+38),loc=buf.readUInt32LE(off+42);
  const next=off+46+fname+extra+comment;
  need(next<=centralEnd&&disk===0&&(flags&1)===0&&
    (method===0||method===8)&&size<=MAX_FILE&&compressed<=LIMIT&&
    fname>0&&extra<2048&&comment<4096&&
    loc<centralEnd,'unsupported or unsafe central directory fields');
  const name=nameFrom(buf.subarray(off+46,off+46+fname),'file path');
  const unixMode=(attrs>>>16)&0xffff;
  // Many github source archives include POSIX regular/dir modes. Refuse
  // symlinks, devices and other special entries even if central names look OK.
  const kind=unixMode&0xf000;
  need(kind===0||kind===0x8000||kind===0x4000,'special ZIP filesystem entry refused');
  need(!name.endsWith('/')||kind===0||kind===0x4000,'directory path carries non-directory type');
  need(name.endsWith('/')||(kind===0||kind===0x8000),'regular path carries directory type');
  return {name,crc,loc,size,compressed,method,flags,kind,next,attrs};
}
export function readZipEntries(input){
  const zip=Buffer.from(input);
  need(zip.length>22&&zip.length<=LIMIT,'ZIP archive absent or too large');
  const from=Math.max(0,zip.length-22-65535);
  let eocd=-1;
  for(let p=zip.length-22;p>=from;p--){
    if(zip.readUInt32LE(p)===0x06054b50&&
      p+22+zip.readUInt16LE(p+20)===zip.length){eocd=p;break;}
  }
  need(eocd!==-1,'end-of-central-directory missing or trailing payload');
  const disk=zip.readUInt16LE(eocd+4),disk2=zip.readUInt16LE(eocd+6);
  const countOnDisk=zip.readUInt16LE(eocd+8),count=zip.readUInt16LE(eocd+10);
  const centralBytes=zip.readUInt32LE(eocd+12),centralStart=zip.readUInt32LE(eocd+16);
  need(!disk&&!disk2&&countOnDisk===count&&count>0&&count<=MAX_NAMES&&
    count!==65535&&centralBytes!==0xffffffff&&centralStart!==0xffffffff&&
    centralStart+centralBytes===eocd,'multi-volume, ZIP64 or damaged central directory');
  const entries=new Map(),intervals=[];
  let pos=centralStart,total=0;
  for(let n=0;n<count;n++){
    const ent=regularZipEntry(zip,pos,eocd);
    pos=ent.next;
    need(!entries.has(ent.name),'duplicate ZIP entry '+ent.name);
    need(ent.loc+30<centralStart&&zip.readUInt32LE(ent.loc)===0x04034b50,
      'local ZIP header missing or overlaps central directory');
    const method=zip.readUInt16LE(ent.loc+8),flags=zip.readUInt16LE(ent.loc+6);
    const lname=zip.readUInt16LE(ent.loc+26),extra=zip.readUInt16LE(ent.loc+28);
    const start=ent.loc+30+lname+extra,end=start+ent.compressed;
    need(flags===ent.flags&&method===ent.method&&
      lname>0&&lname<500&&extra<2048&&
      end<=centralStart&&start<=end,'central/local ZIP entry disagreement');
    need(nameFrom(zip.subarray(ent.loc+30,ent.loc+30+lname),'local name')===ent.name,
      'local name differs from central directory');
    intervals.push([ent.loc,end]);
    const zipped=zip.subarray(start,end);
    let decoded;
    try{decoded=ent.method===8
      ?zlib.inflateRawSync(zipped,{maxOutputLength:Math.min(MAX_FILE+1,ent.size+1)})
      :Buffer.from(zipped)}
    catch{die('invalid DEFLATE body / bomb '+ent.name);}
    need(decoded.length===ent.size&&
      (ent.method!==0||ent.compressed===ent.size)&&
      crc32(decoded)===ent.crc,'ZIP entry size or CRC mismatch '+ent.name);
    total+=decoded.length;
    need(total<=LIMIT,'decompressed ZIP archive exceeds total budget');
    if(ent.name.endsWith('/'))need(decoded.length===0,'ZIP directory contains data');
    entries.set(ent.name,{bytes:decoded,kind:ent.kind});
  }
  need(pos===eocd,'unexpected bytes inside ZIP central directory');
  intervals.sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<intervals.length;i++)
    need(intervals[i][0]>=intervals[i-1][1],'overlapping local ZIP entry payloads');
  need(intervals[0]?.[0]===0,'unrecognized ZIP prefix/preamble');
  return {entries,archiveSha256:sha256(zip),entriesCount:entries.size,totalUncompressed:total};
}
export function verifyComposerZip(zip,tree=loadUpstream()){
  const pinned=checkUpstreamTranscript(tree);
  need(pinned.exportedGitBlobIds===78,'signed-tag upstream manifest is not complete');
  const z=readZipEntries(zip);
  const files=[...z.entries].filter(([name])=>!name.endsWith('/'));
  const top=new Set(files.map(([name])=>name.split('/')[0]));
  need(top.size===1,'unexpected multiple source archive roots');
  const prefix=[...top][0];
  need(/^paragonie-sodium_compat-[a-f0-9]{7,40}$/i.test(prefix),
    'source archive root is not paragonie/sodium_compat pinned commit');
  const tail=prefix.slice('paragonie-sodium_compat-'.length).toLowerCase();
  need(COMMIT.startsWith(tail),'ZIP root identifies a different commit');
  const listed=new Map(tree.git.entries.filter(e=>e.type==='blob').filter(e=>{
    const first=e.path.split('/')[0];
    return !tree.archiveExportIgnoreRoot.includes(first)&&
      !first.startsWith(tree.archiveExportIgnorePrefix);
  }).map(e=>[e.path,e]));
  need(files.length===listed.size,'Composer ZIP missing / extra source files');
  for(const [name,value] of files){
    need(name.startsWith(prefix+'/'),'archive file escaped original source root');
    const relative=name.slice(prefix.length+1);
    const original=listed.get(relative);
    need(!!original,'unreviewed archive entry '+relative);
    need(value.bytes.length===original.size&&
      gitBlob(value.bytes)===original.sha,'signed-tag Git blob mismatch '+relative);
  }
  return {schema:'ai-site-cms-verified-upstream-real-zip-v1',
    commit:COMMIT,tagObject:'5cbae9d0ad987e0104e390d74cca92a128777aa8',
    githubPgpTagVerifiedByApi:true,pgpKeyOwnershipIndependentlyApproved:false,
    archiveSha256:z.archiveSha256,actualZipEntryCount:z.entriesCount,
    sourceFilesCompared:files.length,totalUncompressed:z.totalUncompressed,
    actualComposerZipBytesIndependentlyCompared:true,
    verifiedInLocalCI:true,phpCodeExecuted:false,
    cryptographicAuditApproved:false,legalApproved:false,productionApproved:false,
    stage2Accepted:false};
}
async function boundedBody(response){
  need(response.status===200&&response.body&&
    typeof response.body.getReader==='function',
    'no successful HTTPS source archive response');
  const reader=response.body.getReader(),chunks=[];let bytes=0;
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>LIMIT){await reader.cancel();die('HTTPS GitHub ZIP exceeds size bound');}
      chunks.push(Buffer.from(value));
    }
  }finally{reader.releaseLock();}
  need(bytes>22,'HTTPS upstream ZIP body missing');
  return Buffer.concat(chunks,bytes);
}
export async function fetchPublicZip(get=fetch){
  const url='https://api.github.com/repos/paragonie/sodium_compat/zipball/'+COMMIT;
  const response=await get(url,{redirect:'manual',signal:AbortSignal.timeout(45000),
    headers:{accept:'application/vnd.github+json','user-agent':'ai-site-cms-readonly-security-provenance'}});
  need(response.status>=300&&response.status<400,'GitHub API ZIP redirect missing or HTTP '+response.status);
  const location=response.headers.get('location');
  need(typeof location==='string','GitHub API ZIP redirect target missing');
  let target;try{target=new URL(location);}catch{die('invalid GitHub source ZIP redirect');}
  need(target.protocol==='https:'&&target.hostname==='codeload.github.com'&&
    /^\/paragonie\/sodium_compat\/legacy\.zip\/[a-f0-9]{40}$/.test(target.pathname)&&
    target.pathname.endsWith(COMMIT)&&!target.username&&!target.password&&
    !target.search&&!target.hash,
    'upstream ZIP redirect is not exact pinned codeload GitHub commit');
  const zipResponse=await get(target.toString(),{redirect:'error',
    signal:AbortSignal.timeout(45000),headers:{
      accept:'application/zip,application/octet-stream',
      'user-agent':'ai-site-cms-readonly-security-provenance'}});
  return boundedBody(zipResponse);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length!==1||args[0]!=='--online'){
    console.error('Usage: node sodium-real-zip-proof.mjs --online (READ ONLY, public GitHub ZIP, no install/execute)');
    process.exitCode=2;
  }else{
    try{
      const zip=await fetchPublicZip();
      const report=verifyComposerZip(zip);
      console.log(JSON.stringify(report));
      console.log('REAL Composer ZIP bytes verified against signed-tag Git source PASS 78 files; no PHP execution, independent PGP owner trust or production approval');
    }catch(e){
      // Network errors are BLOCKED, not a pass or fabricated upstream source
      // verification. Any obtained ZIP with an invalid structure is a failure.
      const description=String(e?.message||e);
      console.error(description);
      process.exitCode=description.startsWith('SODIUM_REAL_ZIP_REFUSED:')?1:3;
    }
  }
}
