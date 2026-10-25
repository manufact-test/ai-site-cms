#!/usr/bin/env node
'use strict';
// D7 evidence generator for the full 12-theme responsive matrix.
// Screenshots are evidence for HUMAN review, not automatic visual acceptance.
// Local file:// only, no npm, API or web server. Caller supplies Chromium path.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {resolveOutsideRepository}=require('../lib/output-path.cjs');
const {FORMAT,THEMES,KITS,compile}=require('../lib/compiler.cjs');
const {writePreview}=require('../lib/preview.cjs');
const {writeShowcase}=require('../lib/showcase.cjs');
const ROOT=path.resolve(__dirname,'..');
const REPO=path.resolve(ROOT,'../..');
const localFileUrl=file=>pathToFileURL(path.resolve(file)).href;
const VIEWPORTS=[{id:'desktop',width:1280,height:800},
 {id:'tablet',width:768,height:1000},{id:'mobile',width:390,height:844}];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function pngSize(bytes){
 if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||
    bytes.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG screenshot');
 return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
// An offline visual contact sheet for the human acceptance gate. It does not
// mark images approved and never contacts a remote preview or analytics service.
function reviewHtml(report){
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 })[c]);
 const card=item=>{
  const name=escape(item.file.replace(/^screenshots\//,'').replace(/\.png$/,'').replace(/-/g,' '));
  const label=item.viewportMatch?'dimensions verified':'DIMENSIONS MISMATCH';
  return '<article><div class="meta"><strong>'+name+'</strong><span>'+
   escape(item.actualWidth+'×'+item.actualHeight)+' · '+label+'</span></div>'+
   '<a href="'+escape(item.file)+'" target="_blank" rel="noopener" aria-label="Inspect '+name+'">'+
   '<img loading="lazy" src="'+escape(item.file)+'" alt="'+name+' screenshot"></a></article>';
 };
 const groups=[
  ['Themes · 12 visual directions',report.images.filter(x=>x.file.includes('/theme-'))],
  ['D3 · 42 compositions',report.images.filter(x=>x.file.includes('/42-compositions-'))],
  ['D4 · industry websites, RU + EN',report.images.filter(x=>x.file.includes('/sector-'))]
 ];
 const sections=groups.map(([name,images])=>
  '<section><h2>'+escape(name)+'</h2><div class="images">'+images.map(card).join('')+'</div></section>').join('');
 const alerts=report.errors.length?
  '<p class="error"><strong>CAPTURE ERRORS:</strong> '+escape(report.errors.join(' | '))+'</p>':'';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex"><title>Design Factory · D7 visual review</title>'+
  '<style>*,*:before,*:after{box-sizing:border-box}body{margin:0;background:#10181a;color:#edf5f2;font:15px/1.55 system-ui,sans-serif}'+
  'main{max-width:1500px;margin:auto;padding:clamp(16px,3vw,46px)}h1{font-size:clamp(1.8rem,3.5vw,3rem);line-height:1.1}h2{margin:40px 0 17px;font-size:1.5rem}'+
  '.muted{color:#b4c5c2;max-width:850px}.status{padding:12px 16px;border:1px solid #66716c;border-radius:10px;background:#202a2c}.error{color:#ffd2b6}'+
  '.images{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:18px}article{padding:10px;background:#202b2e;border:1px solid #48605b;border-radius:12px;min-width:0}'+
  '.meta{display:grid;gap:3px;padding:8px 6px 12px}.meta span{font-size:.83rem;color:#b6cbc6}img{display:block;width:100%;height:auto;border:1px solid #67716a;background:white}'+
  'a:focus-visible{outline:3px solid #c5f57b;outline-offset:3px}footer{margin:40px 0;color:#bfccc8}'+
  '@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}</style></head><body><main>'+
  '<h1>Design Factory · visual review</h1>'+
  '<p class="status">Manual visual acceptance: <strong>PENDING</strong> · captured '+
    report.images.length+' screenshots · requested 1280 / 768 / 390 px</p>'+
  alerts+'<p class="muted">Review overflow, typography, navigation, links, keyboard focus, touch targets, RU/EN placeholders, CTA, gallery and motion behavior on the actual sites. Screenshots alone cannot approve these interaction checks. The enhanced CSS preview is NOT PHP renderer pixel parity.</p>'+
  sections+'<footer>First-party local evidence · no online resources or automatic approval · see visual-evidence.json</footer>'+
  '</main></body></html>\n';
}
function args(list){
 const result={output:null,bin:process.env.DF_CHROMIUM_BIN||null,quick:false};
 let sawOut=false,sawChromium=false;
 for(let i=0;i<list.length;i++){
  if(list[i]==='--out'){
   const value=list[i+1];
   if(sawOut||!value||value.startsWith('--'))throw Error('Usage --out NEW-directory --chromium /path/to/chromium [--quick]');
   result.output=value;sawOut=true;i++;
  }else if(list[i]==='--chromium'){
   const value=list[i+1];
   if(sawChromium||!value||value.startsWith('--'))throw Error('--chromium requires one executable path');
   result.bin=value;sawChromium=true;i++;
  }else if(list[i]==='--quick')result.quick=true;
  else throw Error('Usage --out NEW-directory --chromium /path/to/chromium [--quick]');
 }
 if(!result.output||!result.bin)throw Error('Provide --out and --chromium or DF_CHROMIUM_BIN');
 return result;
}
function run(options){
 const root=resolveOutsideRepository(options.output,REPO,'Visual QA output');
 if(fs.existsSync(root))throw Error('Output path exists; never overwrite existing QA results');
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
   const url=localFileUrl(path.join(dir,'index.html'));
   for(const view of VIEWPORTS)screenshot(url,'theme-'+theme+'-'+view.id,view);
  }
  const showcase=writeShowcase(path.join(root,'showcase'));
  for(const view of VIEWPORTS)
   screenshot(localFileUrl(path.join(showcase.directory,'index.html')),'42-compositions-'+view.id,view);
  // Include an English site and all internal routes, not only four RU home pages.
  const sampleKits=[['industrial','ru'],['saas','en'],['architecture','ru'],['restaurant','ru']];
  for(const [kit,language] of sampleKits){
   const project={format:FORMAT,version:1,kit,theme:KITS[kit].theme,language,facts:{}};
   const dir=path.join(root,'sites','sector-'+kit+'-'+language);
   writePreview(compile(project),dir);
   for(const view of VIEWPORTS)screenshot(localFileUrl(path.join(dir,'index.html')),
     'sector-'+kit+'-'+language+'-home-'+view.id,view);
   if(kit==='saas')for(const page of ['services','approach','contact'])
    screenshot(localFileUrl(path.join(dir,page,'index.html')),
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
  fs.writeFileSync(path.join(root,'visual-review.html'),reviewHtml(report),{flag:'wx'});
  console.log(JSON.stringify({
   captured:report.images.length,captureCompleted:report.captureCompleted,
   humanVisualAcceptance:report.humanVisualAcceptance,errors:report.errors,
   output:root
  },null,2));
 }
}
module.exports=Object.freeze({args,localFileUrl,pngSize,reviewHtml,run});
if(require.main===module){
 try{run(args(process.argv.slice(2)));}catch(e){
  console.error('D7 visual QA refused: '+e.message);process.exitCode=2;
 }
}
