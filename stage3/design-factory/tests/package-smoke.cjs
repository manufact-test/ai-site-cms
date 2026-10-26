#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const cp=require('node:child_process'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
const {verify:verifyZip}=require('../bin/verify-release-zip.cjs');
const build=path.join(root,'bin/package-release.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-package-smoke-'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const PREFIX='stage3/design-factory/';
const compareName=(a,b)=>a<b?-1:a>b?1:0;
function expectedSourceSha256(){
 const hash=crypto.createHash('sha256');
 for(const name of sourcePaths().sort(compareName)){
  const content=fs.readFileSync(path.join(root,name.slice(PREFIX.length)));
  const nameBytes=Buffer.from(name,'utf8'),lengths=Buffer.alloc(8);
  lengths.writeUInt32BE(nameBytes.length,0);lengths.writeUInt32BE(content.length,4);
  hash.update(lengths);hash.update(nameBytes);hash.update(content);
 }
 return hash.digest('hex');
}
function sourcePaths(base=root,relative=''){
 const paths=[];
 for(const entry of fs.readdirSync(base,{withFileTypes:true})){
  const rel=relative?relative+'/'+entry.name:entry.name;
  const absolute=path.join(base,entry.name);
  if(fs.lstatSync(absolute).isSymbolicLink())throw Error('Unsafe source symlink '+rel);
  if(entry.isDirectory())paths.push(...sourcePaths(absolute,rel));
  else if(entry.isFile())paths.push(PREFIX+rel);
  else throw Error('Unsupported source '+rel);
 }
 return paths;
}
try{
 const outputs=[path.join(dir,'a.zip'),path.join(dir,'b.zip')];
 for(const out of outputs){
  const p=cp.spawnSync(process.execPath,[build,out],{encoding:'utf8',timeout:30000});
  assert.equal(p.status,0,p.stderr);
  const meta=JSON.parse(p.stdout);
  assert.ok(meta.files>=20);
  assert.equal(meta.zipSha256,sha(fs.readFileSync(out)));
  assert.equal(meta.sourceSha256,expectedSourceSha256(),'Source digest must bind each exact path and file byte sequence');
 }
 const a=fs.readFileSync(outputs[0]),b=fs.readFileSync(outputs[1]);
 assert.equal(sha(a),sha(b),'Reproducible archives must have identical bytes');
 const verified=verifyZip(outputs[0]);
 assert.equal(verified.zipSha256,sha(a),'Independent archive verifier must agree with actual ZIP SHA256');
 assert.equal(verified.sourceSha256,expectedSourceSha256(),'Independent verifier must reconstruct framed source digest');
 assert.equal(verified.sourceExactMatch,true);
 assert.equal(verified.crcVerified,true);
 const mutated=(name,change,pattern)=>{
  const bytes=Buffer.from(a);
  change(bytes);
  const out=path.join(dir,name+'.zip');
  fs.writeFileSync(out,bytes);
  assert.throws(()=>verifyZip(out),pattern,name);
 };
 // Genuine malformed ZIP examples must fail the independent release verifier.
 mutated('bad-central-count',bytes=>{
  bytes.writeUInt16LE(bytes.readUInt16LE(bytes.length-22+10)+1,bytes.length-22+10);
 },/Central directory count\/bounds mismatch/);
 mutated('bad-central-crc',bytes=>{
  const directory=bytes.readUInt32LE(bytes.length-22+16);
  bytes.writeUInt32LE((bytes.readUInt32LE(directory+16)^1)>>>0,directory+16);
 },/Local\/central ZIP header mismatch/);
 mutated('bad-central-version',bytes=>{
  const directory=bytes.readUInt32LE(bytes.length-22+16);
  bytes.writeUInt16LE(21,directory+4);
 },/Unsupported ZIP member options/);
 mutated('bad-central-disk-start',bytes=>{
  const directory=bytes.readUInt32LE(bytes.length-22+16);
  bytes.writeUInt16LE(1,directory+34);
 },/Unsupported ZIP member options/);
 mutated('bad-central-internal-attributes',bytes=>{
  const directory=bytes.readUInt32LE(bytes.length-22+16);
  bytes.writeUInt16LE(1,directory+36);
 },/Unsupported ZIP member options/);
 mutated('bad-central-timestamp',bytes=>{
  const directory=bytes.readUInt32LE(bytes.length-22+16);
  bytes.writeUInt16LE(1,directory+12);
 },/Unsupported ZIP member options/);
 mutated('bad-local-version',bytes=>{
  bytes.writeUInt16LE(21,4);
 },/Local\/central ZIP header mismatch/);
 mutated('bad-local-timestamp',bytes=>{
  bytes.writeUInt16LE(1,10);
 },/Local\/central ZIP header mismatch/);
 mutated('bad-payload',bytes=>{
  const nameLength=bytes.readUInt16LE(26);
  bytes[30+nameLength+3]^=0xFF;
 },/inflation failed|CRC\/size mismatch/i);
 mutated('bad-zip-comment',bytes=>{
  bytes.writeUInt16LE(3,bytes.length-2);
 },/Invalid ZIP32 end record/);
 assert.equal(a.readUInt32LE(0),0x04034B50);
 const ending=a.length-22;
 assert.equal(a.readUInt32LE(ending),0x06054B50);
 const count=a.readUInt16LE(ending+10);
 assert.ok(count>=20);
 assert.equal(a.readUInt16LE(ending+8),count,'Central file count must match');
 assert.equal(a.readUInt16LE(ending+20),0,'No trailing ZIP comment');
 const centralLength=a.readUInt32LE(ending+12),centralStart=a.readUInt32LE(ending+16);
 assert.equal(centralStart+centralLength,ending,'Central directory must end at EOCD');
 let cursor=0,files=0;
 const all=new Set(),entries=new Map();
 while(cursor<ending&&a.readUInt32LE(cursor)===0x04034B50){
  const compression=a.readUInt16LE(cursor+8),crc=a.readUInt32LE(cursor+14),compressed=a.readUInt32LE(cursor+18);
  const original=a.readUInt32LE(cursor+22),n=a.readUInt16LE(cursor+26),extra=a.readUInt16LE(cursor+28);
  const name=a.subarray(cursor+30,cursor+30+n).toString('utf8');
  entries.set(name,{offset:cursor,crc,compressed,original});
  assert.match(name,/^stage3\/design-factory\/[a-zA-Z0-9/_ .-]+\.(md|cjs|js|json|html|css)$/);
  assert.ok(!name.includes('..')&&!name.includes('//')&&!all.has(name),name);
  all.add(name);
  assert.equal(compression,8);
  const payload=a.subarray(cursor+30+n+extra,cursor+30+n+extra+compressed);
  const unpacked=zlib.inflateRawSync(payload);
  assert.equal(unpacked.length,original);
  const originalPath=path.join(root,name.slice(PREFIX.length));
  assert.ok(fs.statSync(originalPath).isFile(),'Archive entry must match a real first-party file');
  assert.equal(sha(unpacked),sha(fs.readFileSync(originalPath)),
    'ZIP content must exactly match current source bytes: '+name);
  const table=new Uint32Array(256);
  for(let i=0;i<256;i++){let v=i;for(let j=0;j<8;j++)v=v&1?0xEDB88320^(v>>>1):v>>>1;table[i]=v>>>0;}
  let sum=0xFFFFFFFF;for(const val of unpacked)sum=table[(sum^val)&255]^(sum>>>8);
  assert.equal((sum^0xFFFFFFFF)>>>0,crc,name);
  cursor+=30+n+extra+compressed;files++;
 }
 assert.equal(files,count);
 assert.equal(cursor,centralStart,'ZIP local entries must end exactly at central directory');
 let centralCursor=centralStart,centralCount=0;
 const seenCentral=new Set();
 while(centralCursor<ending){
  assert.equal(a.readUInt32LE(centralCursor),0x02014B50,'Valid central header');
  const nameLength=a.readUInt16LE(centralCursor+28);
  const extraLength=a.readUInt16LE(centralCursor+30);
  const commentLength=a.readUInt16LE(centralCursor+32);
  const name=a.subarray(centralCursor+46,centralCursor+46+nameLength).toString('utf8');
  assert.ok(entries.has(name)&&!seenCentral.has(name),'Central entry must be unique and backed by local data: '+name);
  seenCentral.add(name);
  const entry=entries.get(name);
  assert.equal(a.readUInt16LE(centralCursor+10),8,'Central compression');
  assert.equal(a.readUInt32LE(centralCursor+16),entry.crc,'Central CRC');
  assert.equal(a.readUInt32LE(centralCursor+20),entry.compressed,'Central compressed size');
  assert.equal(a.readUInt32LE(centralCursor+24),entry.original,'Central uncompressed size');
  assert.equal(a.readUInt32LE(centralCursor+42),entry.offset,'Central local header offset');
  centralCursor+=46+nameLength+extraLength+commentLength;centralCount++;
 }
 assert.equal(centralCursor,ending);
 assert.equal(centralCount,count,'All central directory entries accounted for');
 assert.deepEqual([...all].sort(),sourcePaths().sort(),
   'ZIP must contain every and only Design Factory source file');
 for(const f of ['studio/index.html','studio/runtime.generated.js','studio/studio.css','studio/studio.js','README.md','PROGRESS.md','INTEGRATION.md'])
  assert.ok(all.has('stage3/design-factory/'+f),f);
 const denied=cp.spawnSync(process.execPath,[build,outputs[0]],{encoding:'utf8'});
 assert.notEqual(denied.status,0,'No overwrite allowed');
 const repoRoot=path.resolve(root,'../..');
 const alias=path.join(dir,'repository-alias');
 const escapedName='df-package-symlink-escape-'+process.pid+'.zip';
 const escaped=path.join(repoRoot,escapedName);
 if(fs.existsSync(escaped))throw Error('Unexpected collision for symlink safety fixture');
 let symlinkSupported=true;
 try{fs.symlinkSync(repoRoot,alias,'dir');}catch(error){
  if(['EPERM','EACCES','ENOTSUP','EINVAL'].includes(error.code))symlinkSupported=false;
  else throw error;
 }
 if(symlinkSupported){
  try{
   const escapeRun=cp.spawnSync(process.execPath,[build,path.join(alias,escapedName)],{encoding:'utf8'});
   assert.notEqual(escapeRun.status,0,'Must refuse package output through a symlink pointing anywhere inside the repository');
   assert.equal(fs.existsSync(escaped),false,'A rejected symlink destination must not create an archive in the source tree');
  }finally{fs.rmSync(escaped,{force:true});}
 }
 console.log('DESIGN_FACTORY_D7_PACKAGE_SMOKE PASS: '+files+' ZIP members, CRC32, central directory parity, exact source bytes, framed source digest, repository-safe output boundary, deterministic archive and no overwrite');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
