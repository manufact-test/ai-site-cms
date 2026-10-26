#!/usr/bin/env node
'use strict';
// D7 evidence generator for the full 12-theme responsive matrix.
// Screenshots are evidence for HUMAN review, not automatic visual acceptance.
// Local file:// only, no npm, API or web server. Caller supplies Chromium path.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {resolveOutsideRepository}=require('../lib/output-path.cjs');
const {openBrowser}=require('../lib/chromium-pipe.cjs');
const {evidenceHash}=require('../lib/visual-review.cjs');
const {reviewHtml}=require('../lib/visual-review-ui.cjs');
const {inspectPng}=require('../lib/png-integrity.cjs');
const {sourceFingerprint}=require('../lib/render-source-fingerprint.cjs');
const {FORMAT,THEMES,KITS,compile}=require('../lib/compiler.cjs');
const {writePreview}=require('../lib/preview.cjs');
const {writeShowcase}=require('../lib/showcase.cjs');
const ROOT=path.resolve(__dirname,'..');
const REPO=path.resolve(ROOT,'../..');
const localFileUrl=file=>pathToFileURL(path.resolve(file)).href;
const VIEWPORTS=[{id:'desktop',width:1280,height:800},
 {id:'tablet',width:768,height:1000},{id:'mobile',width:390,height:844}];
const QUICK_THEMES=['editorial','technical','noir','verdant'];
const SAMPLE_KITS=[['industrial','ru'],['saas','en'],['architecture','ru'],['restaurant','ru']];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function expectedFiles(quick){
 const themes=quick?QUICK_THEMES:Object.keys(THEMES);
 return [
  ...themes.flatMap(theme=>VIEWPORTS.map(view=>'screenshots/theme-'+theme+'-'+view.id+'.png')),
  ...VIEWPORTS.map(view=>'screenshots/42-compositions-'+view.id+'.png'),
  ...SAMPLE_KITS.flatMap(([kit,language])=>VIEWPORTS.map(view=>'screenshots/sector-'+kit+'-'+language+'-home-'+view.id+'.png')),
  ...['services','approach','contact'].map(page=>'screenshots/sector-saas-en-'+page+'-mobile.png')
 ];
}
function assessMatrix(expected,images){
 const actual=images.map(item=>item.file),expectedSet=new Set(expected),actualSet=new Set(actual);
 const missing=expected.filter(file=>!actualSet.has(file));
 const unexpected=actual.filter(file=>!expectedSet.has(file));
 const duplicates=actual.length-actualSet.size;
 const dimensionMismatches=images.filter(item=>!item.viewportMatch).length;
 return {complete:missing.length===0&&unexpected.length===0&&duplicates===0&&actual.length===expected.length&&dimensionMismatches===0,
  expectedCount:expected.length,actualCount:actual.length,missing,unexpected,duplicates,dimensionMismatches};
}
const pngSize=inspectPng;
function args(list){
 const result={output:null,bin:process.env.DF_CHROMIUM_BIN||null,quick:false,staticInMemory:false};
 let sawOut=false,sawChromium=false;
 for(let i=0;i<list.length;i++){
  if(list[i]==='--out'){
   const value=list[i+1];
   if(sawOut||!value||value.startsWith('--'))throw Error('Usage --out NEW-directory --chromium /path/to/chromium [--quick] [--static-in-memory]');
   result.output=value;sawOut=true;i++;
  }else if(list[i]==='--chromium'){
   const value=list[i+1];
   if(sawChromium||!value||value.startsWith('--'))throw Error('--chromium requires one executable path');
   result.bin=value;sawChromium=true;i++;
  }else if(list[i]==='--quick')result.quick=true;
  else if(list[i]==='--static-in-memory')result.staticInMemory=true;
  else throw Error('Usage --out NEW-directory --chromium /path/to/chromium [--quick] [--static-in-memory]');
 }
 if(!result.output||!result.bin)throw Error('Provide --out and --chromium or DF_CHROMIUM_BIN');
 return result;
}
async function run(options){
 const root=resolveOutsideRepository(options.output,REPO,'Visual QA output');
 if(fs.existsSync(root))throw Error('Output path exists; never overwrite existing QA results');
 fs.mkdirSync(root);
 const expected=expectedFiles(options.quick);
 const report={format:'manufact-design-factory-visual-evidence-v1',version:1,
  captureTransport:options.staticInMemory?'memory-static':'file',
  diagnosticOnly:Boolean(options.staticInMemory),
  viewports:VIEWPORTS,quick:options.quick,expectedImages:expected.length,matrixComplete:false,
  images:[],errors:[],humanVisualAcceptance:'pending',
  renderSourceSha256:sourceFingerprint(REPO)};

 let browser=null;
 async function screenshot(url,filename,view){
  const dest=path.join(root,'screenshots',filename+'.png');
  const capture=options.staticInMemory?
   await browser.screenshotStatic(url,view):await browser.screenshot(url,view);
  const buf=capture.png;
  if(buf.length<1000)throw Error(filename+': Chromium returned an empty screenshot');
  const actual=pngSize(buf);
  const viewportMatch=actual.width===view.width&&actual.height===view.height;
  if(!viewportMatch)report.errors.push(filename+': expected '+view.width+'x'+view.height+
    ', PNG is '+actual.width+'x'+actual.height+'; do not label it as a requested viewport');
  if(capture.overflowPixels>8)report.errors.push(filename+': horizontal document overflow by '+
    capture.overflowPixels+' CSS px');
  fs.writeFileSync(dest,buf,{flag:'wx',mode:0o600});
  report.images.push({file:'screenshots/'+filename+'.png',
   requestedWidth:view.width,requestedHeight:view.height,
   actualWidth:actual.width,actualHeight:actual.height,viewportMatch,
   overflowPixels:capture.overflowPixels,
   bytes:buf.length,sha256:sha(buf)});
 }
 try{
  browser=await openBrowser(options.bin);
  fs.mkdirSync(path.join(root,'screenshots'));
  fs.mkdirSync(path.join(root,'sites'));
  const themes=options.quick?QUICK_THEMES:Object.keys(THEMES);
  for(const theme of themes){
   const project={format:FORMAT,version:1,kit:'agency',theme,language:'ru',facts:{}};
   const dir=path.join(root,'sites','theme-'+theme);
   writePreview(compile(project),dir);
   const url=localFileUrl(path.join(dir,'index.html'));
   for(const view of VIEWPORTS)await screenshot(url,'theme-'+theme+'-'+view.id,view);
  }
  const showcase=writeShowcase(path.join(root,'showcase'));
  for(const view of VIEWPORTS)
   await screenshot(localFileUrl(path.join(showcase.directory,'index.html')),'42-compositions-'+view.id,view);
  // Include an English site and all internal routes, not only four RU home pages.
  for(const [kit,language] of SAMPLE_KITS){
   const project={format:FORMAT,version:1,kit,theme:KITS[kit].theme,language,facts:{}};
   const dir=path.join(root,'sites','sector-'+kit+'-'+language);
   writePreview(compile(project),dir);
   for(const view of VIEWPORTS)await screenshot(localFileUrl(path.join(dir,'index.html')),
     'sector-'+kit+'-'+language+'-home-'+view.id,view);
   if(kit==='saas')for(const page of ['services','approach','contact'])
    await screenshot(localFileUrl(path.join(dir,page,'index.html')),
      'sector-'+kit+'-'+language+'-'+page+'-mobile',VIEWPORTS[2]);
  }
  report.imagesProduced=report.images.length;
 }catch(error){
  report.captureCompleted=false;
  report.errors.push(String(error.message));
  process.exitCode=2;
 }finally{
  if(browser)try{await browser.close();}catch(error){report.errors.push('Chromium shutdown: '+error.message);}
  const matrix=assessMatrix(expected,report.images);
  report.imagesProduced=report.images.length;
  report.expectedImages=matrix.expectedCount;
  report.matrixComplete=matrix.complete;
  report.matrixIssues={missing:matrix.missing,unexpected:matrix.unexpected,
   duplicates:matrix.duplicates,dimensionMismatches:matrix.dimensionMismatches};
  if(!matrix.complete)report.errors.push('Screenshot matrix incomplete: expected '+matrix.expectedCount+
   ' unique viewport-matched images; got '+matrix.actualCount+' ('+matrix.missing.length+
   ' missing, '+matrix.unexpected.length+' unexpected, '+matrix.duplicates+' duplicate, '+
   matrix.dimensionMismatches+' dimension mismatches).');
  try{
   if(report.renderSourceSha256!==sourceFingerprint(REPO))
    report.errors.push('Renderer/Studio/CMS source changed during screenshot capture');
  }catch(error){report.errors.push('Render source fingerprint failed: '+error.message);}
  report.captureCompleted=matrix.complete&&report.errors.length===0;
  report.evidenceSha256=evidenceHash(report);
  if(!report.captureCompleted)process.exitCode=2;
  fs.writeFileSync(path.join(root,'visual-evidence.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(root,'visual-review.html'),reviewHtml(report),{flag:'wx'});
  console.log(JSON.stringify({
   captured:report.images.length,captureCompleted:report.captureCompleted,
   captureTransport:report.captureTransport,diagnosticOnly:report.diagnosticOnly,
   humanVisualAcceptance:report.humanVisualAcceptance,errors:report.errors,
   output:root
  },null,2));
 }
}
module.exports=Object.freeze({args,localFileUrl,pngSize,reviewHtml,expectedFiles,assessMatrix,run});
if(require.main===module){
 try{run(args(process.argv.slice(2))).catch(e=>{
  console.error('D7 visual QA refused: '+e.message);process.exitCode=2;
 });}catch(e){
  console.error('D7 visual QA refused: '+e.message);process.exitCode=2;
 }
}
