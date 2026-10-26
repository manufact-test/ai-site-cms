#!/usr/bin/env node
'use strict';
// D7 genuine Chromium viewport/capture smoke, optional when DF_CHROMIUM_BIN is set.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {openBrowser}=require('../lib/chromium-pipe.cjs');
const {inspectPng}=require('../lib/png-integrity.cjs');
const chrome=process.env.DF_CHROMIUM_BIN;
if(!chrome){
 console.log('DESIGN_FACTORY_D7_VISUAL_PIPE SKIP: DF_CHROMIUM_BIN not set');
 process.exit(0);
}
const size=inspectPng;
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-visual-pipe-smoke-'));
 const filename=path.join(dir,'responsive.html');
 let browser=null;
 try{
  fs.writeFileSync(filename,'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<style>body{margin:0}main{box-sizing:border-box;max-width:100%;padding:16px}</style></head>'+
   '<body><main><h1>Real responsive screenshot</h1><p>Offline file.</p></main></body></html>');
  const url=pathToFileURL(filename).href;
  browser=await openBrowser(chrome);
  const widths=[{width:1280,height:800},{width:768,height:1000},{width:390,height:844}];
  for(const view of widths){
   const captured=await browser.screenshot(url,view);
   assert.deepEqual(size(captured.png),view,'CDP must capture the actual requested viewport dimensions');
   assert.equal(captured.overflowPixels,0,'Simple page must not overflow horizontally');
  }
  fs.writeFileSync(filename,'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>'+
   '<body style="margin:0"><div style="width:1100px;height:50px">Intentional overflow</div></body></html>');
  const overflowing=await browser.screenshot(url,widths[2]);
  assert.ok(overflowing.overflowPixels>600,'Horizontal overflow must be measured from actual page layout');
  await assert.rejects(browser.screenshot('https://example.com/',widths[2]),/Only offline file URLs/);
  fs.writeFileSync(filename,'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>'+
   '<body><div id="d7-probe"></div><script>setTimeout(()=>{document.getElementById("d7-probe").textContent="CDP READY"},120)</script></body></html>');
  assert.equal(await browser.waitForElementText(url,'d7-probe',5000),'CDP READY',
   'DevTools pipe must observe asynchronous DOM state without --dump-dom');
  await assert.rejects(browser.waitForElementText('https://example.com/','d7-probe'),/Only offline file URLs/);
  console.log('DESIGN_FACTORY_D7_VISUAL_PIPE PASS: real Chromium 1280/768/390 PNG sizes, one persistent browser, asynchronous DOM probe, overflow detection and offline URL restriction');
 }finally{
  if(browser)await browser.close();
  fs.rmSync(dir,{recursive:true,force:true});
 }
})().catch(error=>{console.error('DESIGN_FACTORY_D7_VISUAL_PIPE FAIL:',error);process.exitCode=2;});
