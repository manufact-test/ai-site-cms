'use strict';
// Offline Chromium CDP pipe driver: one process for the entire D7 viewport matrix.
// Uses Node built-ins only. No DevTools TCP port, remote URLs or external packages.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const {fileURLToPath}=require('node:url');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class BrowserPipe {
 constructor(binary){
  this.profile=fs.mkdtempSync(path.join(os.tmpdir(),'df-d7-chromium-'));
  this.child=cp.spawn(binary,[
   '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--disable-background-networking','--no-first-run','--no-default-browser-check',
   '--allow-file-access-from-files','--hide-scrollbars','--remote-debugging-pipe',
   '--user-data-dir='+this.profile,'about:blank'
  ],{stdio:['ignore','ignore','pipe','pipe','pipe']});
  this.id=0;this.pending=new Map();this.buffer=Buffer.alloc(0);this.stderr='';
  this.closed=false;this.session=null;
  this.child.stderr.on('data',data=>{this.stderr=(this.stderr+data.toString()).slice(-1400);});
  this.child.on('error',e=>this.failAll(e));
  this.child.on('exit',(code,signal)=>this.failAll(Error('Chromium exited '+code+'/'+signal+' '+this.stderr)));
  this.child.stdio[4].on('data',bytes=>this.receive(bytes));
  this.child.stdio[4].on('error',error=>this.failAll(error));
 }
 failAll(error){
  this.closed=true;
  for(const [id,job] of this.pending){clearTimeout(job.timer);job.reject(error);this.pending.delete(id);}
 }
 receive(bytes){
  this.buffer=Buffer.concat([this.buffer,bytes]);
  if(this.buffer.length>32*1024*1024){this.failAll(Error('Oversized DevTools pipe message'));return;}
  for(let at;(at=this.buffer.indexOf(0))!==-1;){
   const frame=this.buffer.subarray(0,at).toString('utf8');
   this.buffer=this.buffer.subarray(at+1);
   if(!frame)continue;
   let value;
   try{value=JSON.parse(frame);}catch(error){this.failAll(Error('Malformed Chromium reply'));return;}
   if(!this.pending.has(value.id))continue;
   const job=this.pending.get(value.id);this.pending.delete(value.id);clearTimeout(job.timer);
   if(value.error)job.reject(Error('Chromium '+job.method+': '+JSON.stringify(value.error)));
   else job.resolve(value.result);
  }
 }
 send(method,params={},timeout=20000){
  if(this.closed) return Promise.reject(Error('Chromium is unavailable'));
  return new Promise((resolve,reject)=>{
   const id=++this.id;
   const timer=setTimeout(()=>{
    this.pending.delete(id);reject(Error('Chromium DevTools command timed out: '+method));
   },timeout);
   this.pending.set(id,{resolve,reject,timer,method});
   const message={id,method,params};
   if(this.session)message.sessionId=this.session;
   this.child.stdio[3].write(JSON.stringify(message)+'\0',error=>{
    if(error&&this.pending.has(id)){
     this.pending.delete(id);clearTimeout(timer);reject(error);
    }
   });
  });
 }
 async start(){
  await this.send('Browser.getVersion',{},12000);
  const targets=await this.send('Target.getTargets');
  const page=targets.targetInfos.find(info=>info.type==='page');
  if(!page)throw Error('Chromium has no target page');
  const attached=await this.send('Target.attachToTarget',{targetId:page.targetId,flatten:true});
  this.session=attached.sessionId;
  await this.send('Page.enable');
  const initial=await this.send('Page.navigate',{url:'about:blank'});
  if(initial.errorText)throw Error('Chromium initial page blocked: '+initial.errorText);
  await this.send('Network.enable');
  await this.send('Network.setBlockedURLs',{urls:['http://*','https://*','ws://*','wss://*']});
  await this.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  return this;
 }
 async waitForElementText(url,elementId,timeout=45000){
  if(typeof url!=='string'||!url.startsWith('file://'))
   throw Error('Only offline file URLs may be inspected');
  if(typeof elementId!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(elementId))
   throw Error('Expected a safe DOM element ID');
  const file=fileURLToPath(url);
  if(!fs.statSync(file).isFile())throw Error('Browser inspection input must be a local HTML file');
  const navigation=await this.send('Page.navigate',{url});
  if(navigation.errorText)throw Error('Chromium refused offline page: '+navigation.errorText);
  const deadline=Date.now()+timeout;
  let observed='';
  while(Date.now()<deadline){
   const evaluation=await this.send('Runtime.evaluate',{
    expression:'({url:location.href,ready:document.readyState,text:document.getElementById('+
     JSON.stringify(elementId)+')?.textContent??null})',
    returnByValue:true
   },10000);
   const value=evaluation.result?.value;
   if(value?.url===url&&typeof value.text==='string'&&value.text.length)return value.text;
   observed=value?.url||observed;
   await sleep(100);
  }
  throw Error('Chromium DOM probe timed out for '+elementId+' (last page '+observed+')');
 }
 async screenshot(url,view){
  if(typeof url!=='string'||!url.startsWith('file://'))throw Error('Only offline file URLs may be captured');
  const file=fileURLToPath(url);
  if(!fs.statSync(file).isFile())throw Error('Screenshot input must be an existing local HTML file');
  if(!Number.isInteger(view.width)||!Number.isInteger(view.height)||
      view.width<320||view.width>2560||view.height<400||view.height>1800)
   throw Error('Unsupported D7 viewport');
  await this.send('Emulation.setDeviceMetricsOverride',{
   width:view.width,height:view.height,deviceScaleFactor:1,mobile:false
  });
  const navigated=await this.send('Page.navigate',{url});
  if(navigated.errorText)throw Error('Chromium refused local page: '+navigated.errorText);
  const deadline=Date.now()+20000;
  let metrics=null;
  while(Date.now()<deadline){
   const response=await this.send('Runtime.evaluate',{
    expression:'({url:location.href,ready:document.readyState,width:innerWidth,scroll:Math.max(document.documentElement.scrollWidth,document.body?document.body.scrollWidth:0)})',
    returnByValue:true
   });
   metrics=response.result?.value;
   if(metrics?.url===url&&metrics.ready==='complete')break;
   await sleep(100);
  }
  if(!metrics||metrics.url!==url||metrics.ready!=='complete')
   throw Error('Local page did not load completely: '+url);
  if(metrics.width!==view.width)throw Error('Chromium viewport width mismatch');
  await sleep(80);
  const result=await this.send('Page.captureScreenshot',{
   format:'png',captureBeyondViewport:false,fromSurface:true
  },20000);
  if(typeof result.data!=='string'||result.data.length>25*1024*1024)
   throw Error('Invalid or oversized Chromium PNG payload');
  return {png:Buffer.from(result.data,'base64'),
   overflowPixels:Math.max(0,metrics.scroll-metrics.width)};
 }
 async close(){
  this.closed=true;
  try{this.child.kill('SIGTERM');}catch(_){}
  await Promise.race([new Promise(resolve=>this.child.once('exit',resolve)),sleep(800)]);
  if(this.child.exitCode===null)try{this.child.kill('SIGKILL');}catch(_){}
  // Chromium can briefly keep profile files open after terminating.
  fs.rmSync(this.profile,{recursive:true,force:true,maxRetries:8,retryDelay:120});
 }
}
async function openBrowser(binary){
 if(typeof binary!=='string'||!binary)throw Error('Chromium binary path required');
 const browser=new BrowserPipe(binary);
 try{return await browser.start();}
 catch(error){await browser.close();throw error;}
}
module.exports=Object.freeze({openBrowser});
