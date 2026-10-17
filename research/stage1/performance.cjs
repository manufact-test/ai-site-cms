/* Stage 1 diagnostic performance sample, NOT a reliable benchmark or production budget. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),esbuild=require('esbuild'),zlib=require('node:zlib');
const {chromium}=require('playwright-core');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
if(!chrome)throw Error('Chrome required');
const schema={type:'object',additionalProperties:false,required:['title','size','color'],properties:{
 title:{type:'string'},size:{type:'integer',minimum:1,maximum:150},color:{type:'string',pattern:'^#[a-fA-F0-9]{6}$'}
}};
const data={title:'Hello',size:64,color:'#334455'};
function build(name){
 const src=name==='jedison'
 ? ["im","port Jedison from 'jedison';window.mount=(el,s,d)=>{const x=new Jedison.Create({container:el,theme:new Jedison.Theme(),schema:s,data:d});window.dispose=()=>x.destroy();};"].join('')
 : ["im","port React from 'react'; im","port {createRoot} from 'react-dom/client'; im","port Form from '@rjsf/core'; im","port validator from '@rjsf/validator-ajv8';window.mount=(el,s,d)=>{const root=createRoot(el);root.render(React.createElement(Form,{schema:s,formData:d,validator,children:React.createElement('span',null,'research')}));window.dispose=()=>root.unmount();};"].join('');
 const js=esbuild.buildSync({stdin:{contents:src,sourcefile:'perf-entry.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
 return {js,bundleBytes:Buffer.byteLength(js),gzipBytes:zlib.gzipSync(Buffer.from(js),{level:9}).length};
}
(async()=>{
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--enable-precise-memory-info']});
 try{
  const results=[];
  for(const name of ['jedison','rjsf']){
   const {js,bundleBytes,gzipBytes}=build(name);const durations=[],heap=[];
   for(let run=0;run<5;run++){
    const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));
    await page.setContent('<!doctype html><html><body><aside id="index"></aside><section id="editor"></section><iframe sandbox="allow-scripts"></iframe></body></html>');
    await page.evaluate(()=>{const list=document.getElementById('index');for(let i=0;i<50;i++){const e=document.createElement('div');e.textContent='Block '+i;list.appendChild(e)}});
    await page.addScriptTag({content:js});
    const begin=await page.evaluate(({schema,data})=>{const t=performance.now();window.mount(document.querySelector('#editor'),schema,data);return t},{schema,data});
    await page.waitForFunction(()=>document.querySelectorAll('#editor input').length>=3,null,{timeout:12000});
    const end=await page.evaluate(()=>({now:performance.now(),heap:performance.memory?.usedJSHeapSize??null,iframes:document.querySelectorAll('iframe').length,blocks:document.querySelectorAll('#index>div').length}));
    assert.equal(end.iframes,1);assert.equal(end.blocks,50);assert.deepEqual(errs,[]);
    durations.push(Math.round((end.now-begin)*100)/100);heap.push(end.heap);
    await page.evaluate(()=>window.dispose());await page.close();
   }
   results.push({library:name,passes:5,oneIframe:true,metadataBlocks:50,firstInputMsSamples:durations,minMs:Math.min(...durations),maxMs:Math.max(...durations),medianMs:[...durations].sort((a,b)=>a-b)[2],heapBytesSamples:heap,gzipBytes});
  }
  console.log('STAGE1_DIAGNOSTIC_PERFORMANCE='+JSON.stringify(results));
  console.log('STAGE1_PERFORMANCE_NOTE=CI jitter, synthetic tiny section, loaded JS before timer, only first-input duration; no real-site SLO or comparative memory claim');
 }finally{await browser.close()}
})().catch(e=>{console.error('STAGE1_DIAGNOSTIC_PERFORMANCE_FAIL='+String(e.stack||e));process.exitCode=1});
