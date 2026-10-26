#!/usr/bin/env node
'use strict';
// Verify that an offline human-review receipt binds every real PNG in the full D7 matrix.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const crypto=require('node:crypto'),zlib=require('node:zlib'),cp=require('node:child_process');
const {evidenceHash,verify,ACTIVITIES}=require('../lib/visual-review.cjs');
const {reviewHtml}=require('../lib/visual-review-ui.cjs');
const {expectedFiles}=require('../bin/visual-qa.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const TABLE=Uint32Array.from({length:256},(_,i)=>{
 let c=i;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0;
});
const crc=bytes=>{
 let x=0xffffffff;for(const b of bytes)x=TABLE[(x^b)&255]^(x>>>8);
 return (x^0xffffffff)>>>0;
};
function chunk(type,body){
 const label=Buffer.from(type),size=Buffer.alloc(4),checksum=Buffer.alloc(4);
 size.writeUInt32BE(body.length);checksum.writeUInt32BE(crc(Buffer.concat([label,body])));
 return Buffer.concat([size,label,body,checksum]);
}
function png(width,height){
 const ihdr=Buffer.alloc(13);
 ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);
 ihdr[8]=8;ihdr[9]=6;
 const scan=Buffer.alloc((width*4+1)*height);
 return Buffer.concat([
  Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),
  chunk('IDAT',zlib.deflateSync(scan,{level:9})),chunk('IEND',Buffer.alloc(0))
 ]);
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-human-review-smoke-'));
try{
 const views={desktop:{width:1280,height:800},tablet:{width:768,height:1000},mobile:{width:390,height:844}};
 const imgs=Object.fromEntries(Object.entries(views).map(([name,v])=>[name,png(v.width,v.height)]));
 const files=expectedFiles(false);
 assert.equal(files.length,54);
 const images=files.map(file=>{
  const viewName=Object.keys(views).find(name=>file.endsWith('-'+name+'.png'));
  assert.ok(viewName,file);
  const view=views[viewName],bytes=imgs[viewName],dest=path.join(dir,file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);
  return {file,sha256:hash(bytes),bytes:bytes.length,viewportMatch:true,overflowPixels:0,
   requestedWidth:view.width,requestedHeight:view.height,actualWidth:view.width,actualHeight:view.height};
 });
 const report={format:'manufact-design-factory-visual-evidence-v1',version:1,
  expectedImages:54,images,matrixComplete:true,captureCompleted:true,
  errors:[],humanVisualAcceptance:'pending',quick:false};
 report.evidenceSha256=evidenceHash(report);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 const approved={format:'manufact-design-factory-visual-review-v1',version:1,
  evidenceSha256:report.evidenceSha256,reviewer:'Independent tester',
  reviewedAt:'2026-10-26T00:00:00.000Z',
  manualChecks:Object.fromEntries(ACTIVITIES.map(k=>[k,true])),
  images:images.map(x=>({file:x.file,sha256:x.sha256,verdict:'approved',note:''}))};
 const receipt=verify(dir,approved);
 assert.equal(receipt.screenshotsVerified,54);
 assert.equal(receipt.leadAcceptance,'pending');
 assert.equal(receipt.humanAttestationRecorded,true);
 const output=reviewHtml(report);
 assert.ok(output.includes('data-full-matrix="true"'));
 assert.ok(output.includes('data-evidence-sha256="'+report.evidenceSha256+'"'));
 assert.equal((output.match(/<article data-review /g)||[]).length,54);
 assert.ok(output.includes('visual-review-decision.json'));
 const reject=(modified,pattern)=>assert.throws(()=>verify(dir,modified),pattern);
 reject({...approved,evidenceSha256:'0'.repeat(64)},/does not match/);
 reject({...approved,images:approved.images.slice(1)},/Every screenshot/);
 reject({...approved,images:[...approved.images.slice(0,-1),approved.images[0]]},/Duplicate/);
 reject({...approved,manualChecks:{...approved.manualChecks,keyboardAndTouch:false}},/four independent/);
 reject({...approved,images:approved.images.map((x,i)=>i===0?{...x,verdict:'rejected',note:'Bad layout'}:x)},/rejected/);
 reject({...approved,images:approved.images.map((x,i)=>i===0?{...x,verdict:'rejected',note:''}:x)},/diagnostic note/);
 const original=fs.readFileSync(path.join(dir,files[0]));
 fs.writeFileSync(path.join(dir,files[0]),Buffer.concat([original,Buffer.from('tamper')]));
 reject(approved,/hash or file size mismatch/);
 fs.writeFileSync(path.join(dir,files[0]),original);
 const alternate={...report,images:images.map((x,i)=>i===0?{...x,overflowPixels:99}:x)};
 alternate.evidenceSha256=evidenceHash(alternate);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(alternate));
 reject({...approved,evidenceSha256:alternate.evidenceSha256},/overflow mismatch/);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 const quick={...report,quick:true};quick.evidenceSha256=evidenceHash(quick);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(quick));
 reject({...approved,evidenceSha256:quick.evidenceSha256},/Full 54-image/);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 const receiptFile=path.join(dir,'review.json');
 fs.writeFileSync(receiptFile,JSON.stringify(approved));
 const run=cp.spawnSync(process.execPath,[path.join(__dirname,'../bin/verify-visual-review.cjs'),dir,receiptFile],
  {encoding:'utf8',timeout:20000});
 assert.equal(run.status,0,run.stderr);
 assert.match(run.stdout,/"screenshotsApproved": 54/);
 console.log('DESIGN_FACTORY_D7_VISUAL_REVIEW PASS: 54 real fixture PNGs, review form, full-matrix receipts, file tamper, overflow, missing, duplicate, rejection, quick-mode and CLI rejection gates');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
