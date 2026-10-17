/* Stage 1 ONLY. Full uninstrumented site in a real opaque Chromium iframe.
 * Original inline JS is intentionally BLOCKED; CSS remains demonstrable.
 * This is a diagnostic source trust boundary, not a production sanitizer. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright-core');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'system Chrome required');
const site=fs.readFileSync(path.join(__dirname,'fixtures/tide-atlas-standalone.html'),'utf8');
const csp='<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; style-src-attr &#39;none&#39;; img-src &#39;none&#39;; media-src &#39;none&#39;; connect-src &#39;none&#39;; font-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;; object-src &#39;none&#39;">';
const blockedSource=site.replace('<head>','<head>'+csp);
(async()=>{
 let requests=0;
 const server=http.createServer((req,res)=>{
  requests++;
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end('<!doctype html><html><body><strong id="parent-marker">Editor stays isolated</strong><iframe id="subject" sandbox="allow-scripts" style="width:1200px;height:790px;border:0"></iframe></body></html>');
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const port=server.address().port;
 let browser,page;
 try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
  page=await browser.newPage({viewport:{width:1500,height:950}});
  const pageErrors=[];const violations=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')violations.push(m.text())});
  await page.goto('http://127.0.0.1:'+port+'/');
  await page.locator('#subject').evaluate((frame,content)=>{frame.srcdoc=content},blockedSource);
  const frame=page.frameLocator('#subject');
  await frame.locator('#hero-title').waitFor({timeout:15000});
  const initial=await frame.locator('#hero-title').evaluate(el=>({
   text:el.textContent,font:getComputedStyle(el).fontSize,origin:location.origin,
   unsafeInlineExecuted:window.__siteExecuted===true,
   parentReadable:(()=>{try{return !!parent.document.getElementById('parent-marker')}catch{return false}})(),
   cssGrid:getComputedStyle(document.querySelector('.hero')).display,
   scriptedDialogOpen:document.getElementById('modal').open
  }));
  assert.equal(initial.origin,'null');
  assert.equal(initial.unsafeInlineExecuted,false);
  assert.equal(initial.parentReadable,false);
  assert.equal(initial.cssGrid,'grid');
  assert.equal(initial.scriptedDialogOpen,false);
  assert.equal(initial.text,'The coast is alive.');
  assert.ok(Number.parseFloat(initial.font)>60,'desktop clamp CSS should render');
  await page.locator('#subject').evaluate(frame=>{frame.style.width='360px'});
  const frameObject=page.frames().find(f=>f!==page.mainFrame());
  assert.ok(frameObject);
  await frameObject.waitForFunction(()=>innerWidth<=380,null,{timeout:12000});
  const mobile=await frame.locator('#hero-title').evaluate(el=>({
   size:getComputedStyle(el).fontSize,
   columns:getComputedStyle(document.querySelector('.hero')).gridTemplateColumns,
   origin:location.origin
  }));
  assert.equal(mobile.size,'48px');
  assert.ok(Number.parseFloat(initial.font)>Number.parseFloat(mobile.size));
  await frame.locator('#modal-open').click();
  assert.equal(await frame.locator('#modal').evaluate(el=>el.open),false,'untrusted JS must not run on click');
  await frame.locator('#signup-form button').click();
  await page.waitForTimeout(150);
  assert.equal(requests,1,'untrusted sandbox form must not submit');
  assert.equal(page.url(),'http://127.0.0.1:'+port+'/');
  assert.equal(await page.locator('#parent-marker').textContent(),'Editor stays isolated');
  assert.deepEqual(pageErrors,[]);
  assert.ok(violations.some(v=>/content security policy|sandbox|refused/i.test(v)),'CSP/sandbox diagnostic violations should be visible');
  console.log('STAGE1_INDEPENDENT_SITE_SANDBOX='+JSON.stringify({
   pass:true,standaloneSiteLoaded:true,opaqueOrigin:initial.origin,
   cssDesktopFont:initial.font,cssMobileFont:mobile.size,
   nativeGridApplied:true,untrustedScriptBlocked:!initial.unsafeInlineExecuted,
   crossOriginParentDomDenied:!initial.parentReadable,untrustedDialogClickInactive:true,
   formSubmissionBlocked:true,pageErrors:pageErrors.length,
   limits:'diagnostic iframe with test-only inline STYLE allowed and all scripts denied; no compatible interactivity, no CMS publishing, no production CSP headers'
  }));
 }finally{
  if(page)await page.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  await new Promise(ok=>server.close(ok));
 }
})().catch(e=>{console.error('STAGE1_INDEPENDENT_SITE_SANDBOX_FAIL='+String(e.stack||e));process.exitCode=1});
