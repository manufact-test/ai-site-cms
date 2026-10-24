#!/usr/bin/env node
'use strict';
// D7 evidence generator for the full 12-theme responsive matrix.
// Screenshots are evidence for HUMAN review, not automatic visual acceptance.
// Local file:// only, no npm, API or web server. Caller supplies Chromium path.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {FORMAT,THEMES,KITS,compile}=require('../lib/compiler.cjs');
const {writePreview}=require('../lib/preview.cjs');
const {writeShowcase}=require('../lib/showcase.cjs');
const VIEWPORTS=[{id:'desktop',width:1280,height:800},
 {id:'tablet',width:768,height:1000},{id:'mobile',width:390,height:844}];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function pngSize(bytes){
 if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||
    bytes.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG screenshot');
 return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
function args(list){
 const result={output:null,bin:process.env.DF_CHROMIUM_BIN||null,quick:false};
 for(let i=0;i<list.length;i++){
  if(list[i]==='--out'&&!result.output)result.output=list[++i];
  else if(list[i]==='--chromium'&&!result.bin)result.bin=list[++i];
  else if(list[i]==='--quick')result.quick=true;
  else throw Error('Usage --out NEW-directory --chromium /path/to/chromium [--quick]');
 }
 if(!result.output||!result.bin)throw Error('Provide --out and --chromium or DF_CHROMIUM_BIN');
 return result;
}
function run(options){
 const root=path.resolve(options.output);
 if(fs.existsSync(root))throw Error('Output path exists; never overwrite existing QA results');
 if(!fs.existsSync(path.dirname(root)))throw Error('Output parent missing');
 fs.mkdirSync(root);
 const report={format:'manufact-design-factory-visual-evidence-v1',version:1,
  viewports:VIEWPORTS,quick:options.quick,images:[],errors:[],humanVisualAcceptance:'pending'};
 function screenshot(url,filename,view){
  const dest=path.join(root,'screenshots',filename+'.png');
  const p=cp.spawnSync(options.bin,[
   '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--force-device-scale-factor=1','--no-first-run',
   '--disable-background-networking','--no-default-browser-check','--hide-scrollbars',
   '--window-size='+view.width+','+view.height,
   '--screenshot='+dest,url],{
    encoding:'utf8',timeout:25000,maxBuffer:1000000,env:{...process.env,HOME:process.env.HOME||'/tmp'}
  });
  if(p.status!==0||!fs.existsSync(dest)||fs.statSync(dest).size<1000)
    throw Error(filename+': Chromium screenshot failed '+(p.error?.message||p.stderr||p.status).slice(-400));
  const buf=fs.readFileSync(dest),actual=pngSize(buf);
  const viewportMatch=actual.width===view.width&&actual.height===view.height;
  if(!viewportMatch)report.errors.push(filename+': expected '+view.width+'x'+view.height+
    ', PNG is '+actual.width+'x'+actual.height+'; do not label the image as requested viewport');
  report.images.push({file:'screenshots/'+filename+'.png',
   requestedWidth:view.width,requestedHeight:view.height,
   actualWidth:actual.width,actualHeight:actual.height,viewportMatch,
   bytes:buf.length,sha256:sha(buf)});
 }
 try{
  fs.mkdirSync(path.join(root,'screenshots'));
  fs.mkdirSync(path.join(root,'sites'));
  const themes=options.quick?['editorial','technical','noir','verdant']:Object.keys(THEMES);
  for(const theme of themes){
   const project={format:FORMAT,version:1,kit:'agency',theme,language:'ru',facts:{}};
   const dir=path.join(root,'sites','theme-'+theme);
   writePreview(compile(project),dir);
   const url='file://'+path.join(dir,'index.html');
   for(const view of VIEWPORTS)screenshot(url,'theme-'+theme+'-'+view.id,view);
  }
  const showcase=writeShowcase(path.join(root,'showcase'));
  for(const view of VIEWPORTS)
   screenshot('file://'+path.join(showcase.directory,'index.html'),'42-compositions-'+view.id,view);
  // Include an English site and all internal routes, not only four RU home pages.
  const sampleKits=[['industrial','ru'],['saas','en'],['architecture','ru'],['restaurant','ru']];
  for(const [kit,language] of sampleKits){
   const project={format:FORMAT,version:1,kit,theme:KITS[kit].theme,language,facts:{}};
   const dir=path.join(root,'sites','sector-'+kit+'-'+language);
   writePreview(compile(project),dir);
   for(const view of VIEWPORTS)screenshot('file://'+path.join(dir,'index.html'),
     'sector-'+kit+'-'+language+'-home-'+view.id,view);
   if(kit==='saas')for(const page of ['services','approach','contact'])
    screenshot('file://'+path.join(dir,page,'index.html'),
      'sector-'+kit+'-'+language+'-'+page+'-mobile',VIEWPORTS[2]);
  }
  report.imagesProduced=report.images.length;
  report.captureCompleted=report.errors.length===0;
  if(!report.captureCompleted)process.exitCode=2;
 }catch(error){
  report.captureCompleted=false;
  report.errors.push(String(error.message));
  process.exitCode=2;
 }finally{
  fs.writeFileSync(path.join(root,'visual-evidence.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({
   captured:report.images.length,captureCompleted:report.captureCompleted,
   humanVisualAcceptance:report.humanVisualAcceptance,errors:report.errors,
   output:root
  },null,2));
 }
}
try{run(args(process.argv.slice(2)));}catch(e){
 console.error('D7 visual QA refused: '+e.message);process.exitCode=2;
}
