#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const cp=require('node:child_process'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
const build=path.join(root,'bin/package-release.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-package-smoke-'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
try{
 const outputs=[path.join(dir,'a.zip'),path.join(dir,'b.zip')];
 for(const out of outputs){
  const p=cp.spawnSync(process.execPath,[build,out],{encoding:'utf8',timeout:30000});
  assert.equal(p.status,0,p.stderr);
  const meta=JSON.parse(p.stdout);
  assert.ok(meta.files>=20);
  assert.equal(meta.zipSha256,sha(fs.readFileSync(out)));
 }
 const a=fs.readFileSync(outputs[0]),b=fs.readFileSync(outputs[1]);
 assert.equal(sha(a),sha(b),'Reproducible archives must have identical bytes');
 assert.equal(a.readUInt32LE(0),0x04034B50);
 const ending=a.length-22;
 assert.equal(a.readUInt32LE(ending),0x06054B50);
 const count=a.readUInt16LE(ending+10);
 assert.ok(count>=20);
 let cursor=0,files=0;
 const all=new Set();
 while(cursor<ending&&a.readUInt32LE(cursor)===0x04034B50){
  const compression=a.readUInt16LE(cursor+8),crc=a.readUInt32LE(cursor+14),compressed=a.readUInt32LE(cursor+18);
  const original=a.readUInt32LE(cursor+22),n=a.readUInt16LE(cursor+26),extra=a.readUInt16LE(cursor+28);
  const name=a.subarray(cursor+30,cursor+30+n).toString('utf8');
  assert.match(name,/^stage3\/design-factory\/[a-zA-Z0-9/_ .-]+\.(md|cjs|js|json|html|css)$/);
  assert.ok(!name.includes('..')&&!name.includes('//')&&!all.has(name),name);
  all.add(name);
  assert.equal(compression,8);
  const payload=a.subarray(cursor+30+n+extra,cursor+30+n+extra+compressed);
  const unpacked=zlib.inflateRawSync(payload);
  assert.equal(unpacked.length,original);
  const table=new Uint32Array(256);
  for(let i=0;i<256;i++){let v=i;for(let j=0;j<8;j++)v=v&1?0xEDB88320^(v>>>1):v>>>1;table[i]=v>>>0;}
  let sum=0xFFFFFFFF;for(const val of unpacked)sum=table[(sum^val)&255]^(sum>>>8);
  assert.equal((sum^0xFFFFFFFF)>>>0,crc,name);
  cursor+=30+n+extra+compressed;files++;
 }
 assert.equal(files,count);
 for(const f of ['studio/index.html','studio/runtime.generated.js','studio/studio.css','studio/studio.js','README.md','PROGRESS.md','INTEGRATION.md'])
  assert.ok(all.has('stage3/design-factory/'+f),f);
 const denied=cp.spawnSync(process.execPath,[build,outputs[0]],{encoding:'utf8'});
 assert.notEqual(denied.status,0,'No overwrite allowed');
 console.log('DESIGN_FACTORY_D7_PACKAGE_SMOKE PASS: '+files+' ZIP members, CRC32, zero path escapes, byte-for-byte reproducible, no overwrite');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
