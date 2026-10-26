'use strict';
// D7 offline visual human-review receipt. This records reviewer assertions; it
// cannot authenticate a human or substitute for Lead integration approval.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const SHA=/^[a-f0-9]{64}$/;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
function evidenceHash(report){
 const rows=report.images.map(x=>({
  file:x.file,sha256:x.sha256,bytes:x.bytes,
  requestedWidth:x.requestedWidth,requestedHeight:x.requestedHeight,
  actualWidth:x.actualWidth,actualHeight:x.actualHeight,
  viewportMatch:x.viewportMatch,overflowPixels:x.overflowPixels
 }));
 return sha(Buffer.from(JSON.stringify({
  format:report.format,version:report.version,quick:report.quick,
  renderSourceSha256:report.renderSourceSha256,
  expectedImages:report.expectedImages,images:rows
 })));
}
function pngDimensions(bytes){
 if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||
  bytes.toString('ascii',12,16)!=='IHDR')throw Error('Not a PNG');
 return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
const ACTIVITIES=Object.freeze([
 'layoutAndOverflow','showcaseCoverage','keyboardAndTouch','localesAndCopy','motionAndContent'
]);
function checkEvidence(directory,report){
 const root=path.resolve(directory),rootStat=fs.lstatSync(root);
 if(rootStat.isSymbolicLink()||!rootStat.isDirectory()||fs.realpathSync(root)!==root)
  throw Error('Visual evidence root must be a canonical regular directory');
 const screenshotsRoot=path.join(root,'screenshots'),screenshotsStat=fs.lstatSync(screenshotsRoot);
 if(screenshotsStat.isSymbolicLink()||!screenshotsStat.isDirectory()||fs.realpathSync(screenshotsRoot)!==screenshotsRoot)
  throw Error('Screenshot directory must be a canonical regular directory');
 if(report?.format!=='manufact-design-factory-visual-evidence-v1'||report.version!==1)
  throw Error('Invalid visual evidence format');
 if(report.quick!==false||report.expectedImages!==54||
  !Array.isArray(report.images)||report.images.length!==54||
  report.matrixComplete!==true||report.captureCompleted!==true||
  !Array.isArray(report.errors)||report.errors.length!==0)
  throw Error('Full 54-image complete, error-free evidence is required');
 if(!SHA.test(report.renderSourceSha256||''))
  throw Error('Missing renderer/CMS source fingerprint in visual evidence');
 const {expectedFiles}=require('../bin/visual-qa.cjs');
 const expected=expectedFiles(false).sort();
 const received=report.images.map(x=>x.file).sort();
 if(JSON.stringify(expected)!==JSON.stringify(received))
  throw Error('Evidence does not match the canonical 54-image matrix');
 if(!SHA.test(report.evidenceSha256||'')||report.evidenceSha256!==evidenceHash(report))
  throw Error('Visual evidence fingerprint mismatch');
 const names=new Set();
 for(const item of report.images){
  if(names.has(item.file)||!item.file.startsWith('screenshots/')||
    !/^[a-z0-9][a-z0-9-]*\.png$/.test(item.file.slice('screenshots/'.length)))
   throw Error('Invalid screenshot path: '+item.file);
  names.add(item.file);
  const full=path.join(root,item.file),fileStat=fs.lstatSync(full);
  if(!full.startsWith(screenshotsRoot+path.sep)||!fileStat.isFile()||fileStat.isSymbolicLink()||fs.realpathSync(full)!==full)
   throw Error('Screenshot must be a regular file: '+item.file);
  const bytes=fs.readFileSync(full);
  if(!SHA.test(item.sha256||'')||sha(bytes)!==item.sha256||bytes.length!==item.bytes)
   throw Error('Screenshot hash or file size mismatch: '+item.file);
  const actual=pngDimensions(bytes);
  if(actual.width!==item.requestedWidth||actual.height!==item.requestedHeight||
   actual.width!==item.actualWidth||actual.height!==item.actualHeight||
   item.viewportMatch!==true||!Number.isFinite(item.overflowPixels)||
   item.overflowPixels>8||item.overflowPixels<0)
   throw Error('Viewport or horizontal overflow mismatch: '+item.file);
 }
 return new Map(report.images.map(x=>[x.file,x]));
}
function verify(directory,review){
 const report=JSON.parse(fs.readFileSync(path.join(directory,'visual-evidence.json'),'utf8'));
 const evidence=checkEvidence(directory,report);
 if(!review||review.format!=='manufact-design-factory-visual-review-v2'||
  review.version!==2||review.evidenceSha256!==report.evidenceSha256)
  throw Error('Visual review receipt does not match this evidence set');
 if(typeof review.reviewer!=='string'||review.reviewer.trim().length<3||
  review.reviewer.length>120||!/^\d{4}-\d\d-\d\dT/.test(review.reviewedAt||'')||
  !Number.isFinite(Date.parse(review.reviewedAt)))
  throw Error('Reviewer and ISO review date are required');
 if(!review.manualChecks||ACTIVITIES.some(key=>review.manualChecks[key]!==true))
  throw Error('All five independent manual interaction/content review attestations required, including full 42-composition showcase review');
 if(!Array.isArray(review.images)||review.images.length!==evidence.size)
  throw Error('Every screenshot requires an explicit review verdict');
 const seen=new Set(),rejected=[];
 for(const item of review.images){
  if(!item||!evidence.has(item.file)||seen.has(item.file))throw Error('Duplicate/unknown review image');
  seen.add(item.file);
  if(item.sha256!==evidence.get(item.file).sha256)
   throw Error('Reviewed PNG has changed: '+item.file);
  if(item.verdict!=='approved'&&item.verdict!=='rejected')
   throw Error('Missing/invalid human decision: '+item.file);
  if(typeof item.note!=='string'||item.note.length>1500)
   throw Error('Invalid review note: '+item.file);
  if(item.verdict==='rejected'){
   if(!item.note.trim())throw Error('Rejected screenshots require a diagnostic note');
   rejected.push(item.file);
  }
 }
 if(seen.size!==54)throw Error('Not all images were reviewed');
 if(rejected.length)throw Error(rejected.length+' screenshot(s) rejected: '+rejected.slice(0,5).join(', '));
 return Object.freeze({
  format:'manufact-design-factory-visual-review-verification-v1',
  fullMatrix:true,screenshotsVerified:54,screenshotsApproved:54,
  evidenceSha256:report.evidenceSha256,
  reviewer:review.reviewer.trim(),reviewedAt:review.reviewedAt,
  humanAttestationRecorded:true,leadAcceptance:'pending',
  warning:'Self-declared review receipt is not authentication, PHP pixel parity, CI or CMS release approval'
 });
}
module.exports=Object.freeze({evidenceHash,checkEvidence,verify,ACTIVITIES});
