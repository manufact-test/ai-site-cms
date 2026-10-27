#!/usr/bin/env node
'use strict';
// Verify that an offline human-review receipt binds every real PNG in the full D7 matrix.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const crypto=require('node:crypto'),zlib=require('node:zlib'),cp=require('node:child_process');
const {evidenceHash,verify,ACTIVITIES}=require('../lib/visual-review.cjs');
const {inspectPng}=require('../lib/png-integrity.cjs');
const {reviewHtml}=require('../lib/visual-review-ui.cjs');
const {expectedFiles}=require('../bin/visual-qa.cjs');
const {sourceFingerprint}=require('../lib/render-source-fingerprint.cjs');
const {sourcePaths,sourceIdentity,assertShowcaseCoverage}=require('../lib/visual-source-provenance.cjs');
const {compositions}=require('../catalog/compositions.cjs');
const {expectedGeneratedPaths,snapshotGeneratedSources}=require('../lib/generated-source-manifest.cjs');
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
 const generated=expectedGeneratedPaths(files);
 assert.equal(generated.length,164);
 for(const relative of generated){
  const dest=path.join(dir,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});
  if(relative.endsWith('.css'))fs.writeFileSync(dest,'body{margin:0}');
  else if(relative.endsWith('.json'))fs.writeFileSync(dest,'{"format":"synthetic-test-record"}');
  else{
   const href=relative==='showcase/index.html'?'showcase.css':
    /\/(?:services|approach|contact)\/index.html$/.test(relative)?'../assets/preview.css':'assets/preview.css';
   const body=relative==='showcase/index.html'?
    compositions.map(c=>'<article class="pattern layout-'+c.layout+'" id="'+c.id+'">Example</article>').join(''):
    '<section class="section" id="content">Test preview source</section>';
   fs.writeFileSync(dest,'<!doctype html><html><head><link rel="stylesheet" href="'+href+
    '"></head><body><main>'+body+'</main></body></html>');
  }
 }
 const images=files.map(file=>{
  const viewName=Object.keys(views).find(name=>file.endsWith('-'+name+'.png'));
  assert.ok(viewName,file);
  const view=views[viewName],bytes=imgs[viewName],dest=path.join(dir,file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);
  const src=sourcePaths(file),html=path.join(dir,src.html),css=path.join(dir,src.css);
  fs.mkdirSync(path.dirname(html),{recursive:true});fs.mkdirSync(path.dirname(css),{recursive:true});
  if(!fs.existsSync(css))fs.writeFileSync(css,'body{color:black}');
  if(!fs.existsSync(html))fs.writeFileSync(html,
   '<!doctype html><html><head><link rel="stylesheet" href="'+src.href+
   '"></head><body><main>'+
   (src.html==='showcase/index.html'
    ?compositions.map(c=>'<article class="pattern layout-'+c.layout+'" id="'+c.id+
      '">Placeholder composition</article>').join('')
    :'<section class="section">Fixture for source-bound screenshot checks</section>')+
   '</main></body></html>');
  const source=sourceIdentity(dir,file);
  const dom={stylesheets:1,main:true,sections:file.includes('/42-compositions-')?0:4,
   compositionCount:file.includes('/42-compositions-')?42:0,bodyTextLength:250};
  return {file,source,dom,sha256:hash(bytes),bytes:bytes.length,viewportMatch:true,overflowPixels:0,
   requestedWidth:view.width,requestedHeight:view.height,actualWidth:view.width,actualHeight:view.height};
 });
 const report={format:'manufact-design-factory-visual-evidence-v1',version:1,
  expectedImages:54,images,matrixComplete:true,captureCompleted:true,
  captureTransport:'file',diagnosticOnly:false,
  errors:[],humanVisualAcceptance:'pending',quick:false,
  renderSourceSha256:sourceFingerprint(path.resolve(__dirname,'../../..')),
  generatedSourceFiles:snapshotGeneratedSources(dir,files)};
 report.evidenceSha256=evidenceHash(report);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 assert.equal(ACTIVITIES.length,5);
 const approved={format:'manufact-design-factory-visual-review-v3',version:3,
  evidenceSha256:report.evidenceSha256,reviewer:'Independent tester',
  reviewedAt:'2026-10-26T00:00:00.000Z',
  manualChecks:Object.fromEntries(ACTIVITIES.map(k=>[k,true])),
  images:images.map(x=>({file:x.file,sha256:x.sha256,verdict:'approved',note:''})),
  compositions:compositions.map(c=>({id:c.id,verdict:'approved',note:''}))};
 const showcaseHtml='<main>'+compositions.map(c=>
  '<article class="pattern layout-'+c.layout+'" id="'+c.id+'"></article>').join('')+'</main>';
 assert.equal(assertShowcaseCoverage(showcaseHtml).length,42);
 assert.throws(()=>assertShowcaseCoverage(showcaseHtml.replace('id="'+compositions[2].id+'"',
  'id="unknown-card"')),/42 canonical composition/);
 assert.throws(()=>assertShowcaseCoverage(showcaseHtml.replace('<article class="pattern',
  '<article class="not-a-pattern')),/42 canonical composition/);
 const receipt=verify(dir,approved);
 assert.equal(receipt.screenshotsVerified,54);
 assert.equal(receipt.compositionsVerified,42);
 assert.equal(receipt.compositionsApproved,42);
 assert.equal(receipt.leadAcceptance,'pending');
 assert.equal(receipt.humanAttestationRecorded,true);
 const output=reviewHtml(report);
 assert.ok(output.includes('data-full-matrix="true"'));
 assert.ok(output.includes('data-evidence-sha256="'+report.evidenceSha256+'"'));
 assert.equal((output.match(/<article data-review /g)||[]).length,54);
 assert.equal((output.match(/<article data-composition /g)||[]).length,42);
 assert.ok(output.includes('visual-review-decision.json'));
 assert.ok(output.includes('href="showcase/index.html"'));
 assert.ok(output.includes('id="showcaseCoverage"'));
 assert.ok(output.includes('inspect all 42 compositions'));
 for(const id of ['download-draft','import-draft','review-filter','next-pending','download-defects'])
  assert.ok(output.includes('id="'+id+'"'),id+' must be present');
 assert.ok(output.includes('data-review-group'));
 assert.ok(output.includes('manufact-design-factory-visual-draft-v2'));
 assert.ok(output.includes('compositionDefects'));
 assert.ok(output.includes('rejectedPatterns'));
 assert.ok(output.includes('compositionDecisions()'));
 assert.ok(output.includes('Draft is incompatible with this visual evidence set'));
  assert.ok(output.includes('request!==draftReadSerial||revision!==reviewRevision'),
   'Offline visual-review draft import must not overwrite newer manual decisions');
 assert.ok(output.includes('Reconfirm all five manual review checks'));
 assert.ok(output.includes('item.sha256!==allowed.get(item.file)'));
 assert.ok(output.includes('radio.checked=radio.value===item.verdict'));
 assert.ok(output.includes('document.getElementById(key).checked=false'));

 const reject=(modified,pattern)=>assert.throws(()=>verify(dir,modified),pattern);
 const unscreened=path.join(dir,'sites/theme-editorial/approach/index.html');
 const oldUnscreened=fs.readFileSync(unscreened);
 try{
  fs.appendFileSync(unscreened,'<!-- changed unphotographed internal route -->');
  reject(approved,/Generated D7 source modified after capture/);
 }finally{fs.writeFileSync(unscreened,oldUnscreened);}
 const absentSourceManifest={...report,generatedSourceFiles:undefined};
 absentSourceManifest.evidenceSha256=evidenceHash(absentSourceManifest);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(absentSourceManifest));
 reject({...approved,evidenceSha256:absentSourceManifest.evidenceSha256},/Generated D7 source manifest is missing/);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 const badDom={...report,images:report.images.map((x,i)=>i===0?{...x,dom:{...x.dom,stylesheets:0}}:x)};
 badDom.evidenceSha256=evidenceHash(badDom);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(badDom));
 reject({...approved,evidenceSha256:badDom.evidenceSha256},/Chromium render completeness evidence mismatch/);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 const noDom={...report,images:report.images.map((x,i)=>i===0?{...x,dom:undefined}:x)};
 noDom.evidenceSha256=evidenceHash(noDom);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(noDom));
 reject({...approved,evidenceSha256:noDom.evidenceSha256},/Chromium render completeness evidence mismatch/);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 // HTML and CSS are source-bound even when all PNG hashes are unchanged.
 const sourcePath=sourcePaths(files[0]),sourceHTML=path.join(dir,sourcePath.html),sourceCSS=path.join(dir,sourcePath.css);
 const oldHTML=fs.readFileSync(sourceHTML),oldCSS=fs.readFileSync(sourceCSS);
 // A captured HTML page must not link to a route missing from its own preview site.
 try{
  fs.writeFileSync(sourceHTML,oldHTML.toString('utf8').replace('</body>',
   '<a href="unavailable/index.html">Bad route</a></body>'));
  assert.throws(()=>sourceIdentity(dir,files[0]),/ENOENT|Preview navigation/);
  fs.writeFileSync(sourceHTML,oldHTML.toString('utf8').replace('</body>',
   '<a href="https://example.com">External route</a></body>'));
  assert.throws(()=>sourceIdentity(dir,files[0]),/External or unsafe preview navigation/);
  fs.writeFileSync(sourceHTML,oldHTML.toString('utf8').replace('</body>',
   '<a href="#missing-anchor">Bad fragment</a></body>'));
  assert.throws(()=>sourceIdentity(dir,files[0]),/Preview anchor target is missing/);
 }finally{fs.writeFileSync(sourceHTML,oldHTML);}
 try{
  fs.appendFileSync(sourceHTML,'\n<!-- altered page -->');
  reject(approved,/Visual source bytes or identity mismatch/);
  fs.writeFileSync(sourceHTML,oldHTML);
  fs.appendFileSync(sourceCSS,'\n\/\* altered visual CSS \*\/');
  reject(approved,/Visual source bytes or identity mismatch/);
 }finally{fs.writeFileSync(sourceHTML,oldHTML);fs.writeFileSync(sourceCSS,oldCSS);}
 const absentTransport={...report};
 delete absentTransport.captureTransport;
 absentTransport.evidenceSha256=evidenceHash(absentTransport);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(absentTransport));
 reject({...approved,evidenceSha256:absentTransport.evidenceSha256},/In-memory screenshots are diagnostics/);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 const missingBinding={...report,images:report.images.map((x,i)=>i===0?{...x,source:undefined}:x)};
 missingBinding.evidenceSha256=evidenceHash(missingBinding);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(missingBinding));
 reject({...approved,evidenceSha256:missingBinding.evidenceSha256},/Visual source bytes or identity mismatch/);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 const diagnostic={...report,captureTransport:'memory-static',diagnosticOnly:true};
 diagnostic.evidenceSha256=evidenceHash(diagnostic);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(diagnostic));
 reject({...approved,evidenceSha256:diagnostic.evidenceSha256},/In-memory screenshots are diagnostics/);
 const diagnosticUI=reviewHtml(diagnostic);
 assert.ok(diagnosticUI.includes('data-full-matrix="false"'),
  'In-memory diagnostic images must not enable a human acceptance receipt');
 assert.ok(diagnosticUI.includes('memory-static transport'));
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 reject({...approved,format:'manufact-design-factory-visual-review-v2',version:2},/does not match/);
 reject({...approved,evidenceSha256:'0'.repeat(64)},/does not match/);
 const missingSource={...report,renderSourceSha256:null};
 missingSource.evidenceSha256=evidenceHash(missingSource);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(missingSource));
 reject({...approved,evidenceSha256:missingSource.evidenceSha256},/Missing renderer\/CMS source fingerprint/);
 fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 reject({...approved,compositions:approved.compositions.slice(1)},/Every one of 42 compositions/);
 reject({...approved,compositions:[...approved.compositions.slice(0,-1),approved.compositions[0]]},/Duplicate or unknown composition/);
 reject({...approved,compositions:approved.compositions.map((x,i)=>i===0?{...x,id:'unknown-id'}:x)},/Duplicate or unknown composition/);
 reject({...approved,compositions:approved.compositions.map((x,i)=>i===0?{...x,verdict:'rejected',note:'Defect'}:x)},/composition\(s\) rejected/);
 reject({...approved,compositions:approved.compositions.map((x,i)=>i===0?{...x,verdict:'rejected',note:''}:x)},/Rejected compositions require/);
 reject({...approved,images:approved.images.slice(1)},/Every screenshot/);
 reject({...approved,images:[...approved.images.slice(0,-1),approved.images[0]]},/Duplicate/);
 reject({...approved,manualChecks:{...approved.manualChecks,keyboardAndTouch:false}},/five independent/);
 reject({...approved,manualChecks:{...approved.manualChecks,showcaseCoverage:false}},/five independent/);
 reject({...approved,images:approved.images.map((x,i)=>i===0?{...x,verdict:'rejected',note:'Bad layout'}:x)},/rejected/);
 reject({...approved,images:approved.images.map((x,i)=>i===0?{...x,verdict:'rejected',note:''}:x)},/diagnostic note/);

 // PNG integrity: verify complete chunks/CRC/IDAT decode/filter, not just IHDR.
 assert.deepEqual(inspectPng(imgs.mobile),{width:390,height:844});
 const first=path.join(dir,files[0]),validBytes=fs.readFileSync(first);
 const changePng=(bytes,expected)=>{
  fs.writeFileSync(first,bytes);
  const changed={...report,images:images.map((x,i)=>i===0?
   {...x,bytes:bytes.length,sha256:hash(bytes)}:x)};
  changed.evidenceSha256=evidenceHash(changed);
  fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(changed));
  reject({...approved,evidenceSha256:changed.evidenceSha256},expected);
  fs.writeFileSync(first,validBytes);
  fs.writeFileSync(path.join(dir,'visual-evidence.json'),JSON.stringify(report));
 };
 changePng(validBytes.subarray(0,24),/PNG signature\/size invalid/);
 const wrongCrc=Buffer.from(validBytes);wrongCrc[50]^=3;
 changePng(wrongCrc,/PNG chunk CRC mismatch/);
 changePng(Buffer.concat([validBytes,Buffer.from([0])]),/PNG invalid IEND\/trailing bytes/);
 const brokenIdat=Buffer.concat([
  Buffer.from('89504e470d0a1a0a','hex'),
  chunk('IHDR',validBytes.subarray(16,29)),
  chunk('IDAT',Buffer.from([1,2,3])),
  chunk('IEND',Buffer.alloc(0))
 ]);
 changePng(brokenIdat,/PNG IDAT zlib invalid/);
 const badFilter=Buffer.alloc((1280*4+1)*800);
 badFilter[0]=5;
 const illegalFilter=Buffer.concat([
  Buffer.from('89504e470d0a1a0a','hex'),
  chunk('IHDR',validBytes.subarray(16,29)),
  chunk('IDAT',zlib.deflateSync(badFilter)),
  chunk('IEND',Buffer.alloc(0))
 ]);
 changePng(illegalFilter,/PNG invalid scanline filter/);

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
 // Evidence verification must not follow a symlinked screenshots directory.
 const screenshotRoot=path.join(dir,'screenshots'),movedRoot=path.join(dir,'screenshots-real');
 fs.renameSync(screenshotRoot,movedRoot);
 let symlinkSupported=true;
 try{fs.symlinkSync(movedRoot,screenshotRoot,'dir');}
 catch(error){
  fs.renameSync(movedRoot,screenshotRoot);
  if(['EPERM','EACCES','ENOTSUP','EINVAL'].includes(error.code))symlinkSupported=false;
  else throw error;
 }
 if(symlinkSupported){
  try{reject(approved,/Screenshot directory must be a canonical regular directory/);}
  finally{fs.unlinkSync(screenshotRoot);fs.renameSync(movedRoot,screenshotRoot);}
 }
 const receiptFile=path.join(dir,'review.json');
 fs.writeFileSync(receiptFile,JSON.stringify(approved));
 const run=cp.spawnSync(process.execPath,[path.join(__dirname,'../bin/verify-visual-review.cjs'),dir,receiptFile],
  {encoding:'utf8',timeout:20000});
 assert.equal(run.status,0,run.stderr);
 assert.match(run.stdout,/"screenshotsApproved": 54/);
 console.log('DESIGN_FACTORY_D7_VISUAL_REVIEW PASS: 54 real fixture PNGs, review form, full-matrix receipts, file tamper, overflow, missing, duplicate, rejection, quick-mode and CLI rejection gates');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
