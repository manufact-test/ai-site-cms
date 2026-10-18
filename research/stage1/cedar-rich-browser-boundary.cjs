/* Stage1 research only: original mixed-site CSS/SEO/media compared in a
 * Chromium sandbox that intentionally disables original untrusted JavaScript.
 * Restricted native semantics != unrestricted original browser interaction.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'system Chromium required');
const original=fs.readFileSync(path.join(__dirname,'fixtures/cedar-lab-standalone.html'),'utf8');
const csp="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; media-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";
const secured=original.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'">');
let checks=0;
function equal(a,b,msg){assert.deepEqual(a,b,msg);checks++}
function pass(x,msg){assert.ok(x,msg);checks++}
function snapshot(){
 const el=id=>document.getElementById(id);
 const style=(id,prop)=>getComputedStyle(el(id))[prop];
 return {
  ids:[...document.querySelectorAll('[id]')].map(x=>x.id),
  title:document.title,
  description:document.querySelector('meta[name=description]')?.content,
  canonical:document.querySelector('link[rel=canonical]')?.getAttribute('href'),
  h1:el('hero-title').textContent,
  heroBackground:style('hero','backgroundImage'),
  gridColumns:style('field-notes','gridTemplateColumns').split(' ').length,
  heroFontSize:style('hero-title','fontSize'),
  pictureSrcset:el('hero-mobile').getAttribute('srcset'),
  imageAlt:el('hero-image').getAttribute('alt'),
  videoSource:el('gallery-source').getAttribute('src'),
  faqLabel:el('faq-title').textContent,
  formAction:el('newsletter-form').getAttribute('action'),
  formMethod:el('newsletter-form').getAttribute('method'),
  navExpanded:el('menu-toggle').getAttribute('aria-expanded')
 };
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 try{
  const ctx=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'no-preference'});
  let requests=0;await ctx.route('**/*',route=>{requests++;route.abort();});
  let errors=0;
  const originalPage=await ctx.newPage();originalPage.on('pageerror',()=>errors++);
  await originalPage.setContent(original,{waitUntil:'domcontentloaded'});
  const sandboxPage=await ctx.newPage();sandboxPage.on('pageerror',()=>errors++);
  await sandboxPage.setContent('<iframe sandbox="allow-scripts" title="Restricted preview" style="width:1280px;height:850px" srcdoc="'+secured.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></iframe>',{waitUntil:'domcontentloaded'});
  const frame=sandboxPage.frameLocator('iframe');await frame.locator('#hero-title').waitFor();
  const s=await originalPage.evaluate(snapshot);
  const q=await frame.locator('body').evaluate(snapshot);
  equal(q,s,'original vs isolated CSS/SEO/DOM source');
  pass(s.ids.length>=23,'DOM ids');
  pass(s.heroBackground.includes('linear-gradient'),'computed gradient');
  equal(s.gridColumns,3,'desktop grid');
  equal(s.description,'Environmental signals from the field','SEO description');
  equal(s.canonical,'https://cedarlab.example/research','SEO canonical');
  equal(s.videoSource,'/assets/trail.mp4','video source retained');
  equal(s.pictureSrcset,'/assets/cedar-mobile.webp','picture source retained');
  equal(s.imageAlt,'Cedar grove at morning light','media alt');
  await originalPage.locator('#menu-toggle').click();
  equal(await originalPage.locator('#menu-toggle').getAttribute('aria-expanded'),'true','original JS executes');
  await frame.locator('#menu-toggle').click();
  equal(await frame.locator('#menu-toggle').getAttribute('aria-expanded'),'false','quarantined JS blocked');
  await originalPage.locator('#faq-title').click();
  await frame.locator('#faq-title').click();
  pass(await originalPage.locator('#faq-first').evaluate(x=>x.open),'native FAQ original');
  pass(await frame.locator('#faq-first').evaluate(x=>x.open),'native FAQ in quarantine');
  await frame.locator('#newsletter-email').fill('test@example.org');
  await frame.locator('#newsletter-submit').click();
  const before=requests;
  const assertDevice=async(width,reduced)=>{
   await ctx.setViewportSize({width,height:800});
   await ctx.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
   await sandboxPage.locator('iframe').evaluate((x,w)=>x.style.width=w+'px',width);
   const a=await originalPage.evaluate(snapshot);
   const b=await frame.locator('body').evaluate(snapshot);
   const {navExpanded:_,...a2}=a,{navExpanded:__,...b2}=b;
   equal(a2,b2,'site responsive CSS parity '+width+' '+reduced);
   return a;
  };
  let mobile=await assertDevice(390,false);
  equal(mobile.gridColumns,1,'mobile grid');
  equal(mobile.heroFontSize,'36px','mobile font');
  mobile=await assertDevice(390,true);
  equal(mobile.gridColumns,1,'reduced-motion device retains geometry');
  equal(errors,0,'no runtime errors');
  pass(requests>=before,'all external requests are intercepted by research runner');
  console.log('STAGE1_CEDAR_BROWSER_PARITY='+JSON.stringify({pass:true,checks,
    actualChromium:true,desktopColumns:3,mobileColumns:1,mobileH1px:36,
    originalJsExecuted:true,isolatedJsDisabled:true,nativeDetailsWorksBoth:true,
    visualStyleAndSeoMediaDomParity:true,networkDeniedByResearchRoute:true,
    limitations:'Original CSS retained because identical untrusted source is shown in sandbox; JS blocked intentionally, not equivalent dynamic behavior or arbitrary site import; form action is not approved; no PHP/Next full site runtime, no second blind LLM.'}));
  await ctx.close();
 }finally{await browser.close();}
})().catch(e=>{console.error('STAGE1_CEDAR_BROWSER_PARITY_FAIL='+String(e.stack||e));process.exitCode=1});
