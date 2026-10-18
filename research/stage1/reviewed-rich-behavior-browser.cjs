/* AI Site CMS stage1 research ONLY: original visual source + reviewed
 * behavior adapter. No execution of original AI-site JS. Preview form is a
 * local acknowledgement, NOT a network-backed production form.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright-core');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'Chrome required');
const original=fs.readFileSync(path.join(__dirname,'fixtures/cedar-lab-standalone.html'),'utf8');
let tests=0,denials=0;
function equal(a,b,m){assert.deepEqual(a,b,m);tests++;}
function yes(v,m){assert.ok(v,m);tests++;}
function refused(v,m){yes(v,m);denials++;}
function childAdapter(token,parentOrigin){
 'use strict';
 const get=id=>document.getElementById(id);
 const own=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===keys.slice().sort().join(',');
 let seq=0,configured=false,config={menuEnabled:false,formPreviewEnabled:false,ctaHref:'#field-notes'},events=0;
 const send=(kind,info)=>parent.postMessage({channel:'stage1-reviewed',token,kind,info},parentOrigin);
 window.addEventListener('message',e=>{
  if(e.source!==parent||e.origin!==parentOrigin||!e.data||e.data.token!==token||
     e.data.channel!=='stage1-review-command')return;
  const x=e.data;
  if(!own(x,['channel','token','seq','settings'])||
    !Number.isSafeInteger(x.seq)||x.seq<=seq||
    !own(x.settings,['menuEnabled','formPreviewEnabled','ctaHref'])||
    typeof x.settings.menuEnabled!=='boolean'||typeof x.settings.formPreviewEnabled!=='boolean'||
    typeof x.settings.ctaHref!=='string'||!/^#[a-z][a-z0-9-]{0,42}$/.test(x.settings.ctaHref)) {
    send('denied','invalid-command');return;
  }
  seq=x.seq;config={...x.settings};configured=true;
  get('hero-cta').setAttribute('href',config.ctaHref);
  send('ack',{seq,href:config.ctaHref});
 });
 get('menu-toggle').addEventListener('click',()=>{
  if(!configured||!config.menuEnabled)return;
  const button=get('menu-toggle');
  button.setAttribute('aria-expanded',button.getAttribute('aria-expanded')==='false'?'true':'false');
  events++;send('menu',{expanded:button.getAttribute('aria-expanded'),events});
 });
 function localFormPreview(){
  if(!configured||!config.formPreviewEnabled)return;
  const entry=get('newsletter-email');
  if(!entry.checkValidity())return;
  // NEVER forward user input or submit to original action.
  send('preview-form',{validated:true,action:'local-preview-only'});
 }
 // With iframe sandbox lacking allow-forms, Chromium can suppress a submit
 // event entirely. Handle reviewed button click explicitly, not as a
 // permission to submit forms or send any network request.
 get('newsletter-submit').addEventListener('click',e=>{e.preventDefault();localFormPreview();});
 get('newsletter-form').addEventListener('submit',e=>{e.preventDefault();localFormPreview();});
 send('ready','reviewed-adapter-installed');
}
function checkedArtifact(source,parse5,token,parentOrigin){
 const document=parse5.parse(source);
 let removedScripts=0,removedHandlers=0,removedUntrustedUrls=0;
 function visit(node){
  if(node.childNodes){
   node.childNodes=node.childNodes.filter(child=>{
    if(child.tagName==='script'||child.tagName==='iframe'||child.tagName==='object'||child.tagName==='base'){
      removedScripts++;return false;
    }
    if(child.tagName==='meta'&&(child.attrs||[]).some(a=>a.name==='http-equiv')){removedScripts++;return false;}
    return true;
   });
   for(const child of node.childNodes){child.parentNode=node;visit(child);}
  }
  if(node.attrs)node.attrs=node.attrs.filter(a=>{
   if(/^on[a-z]+$/i.test(a.name)){removedHandlers++;return false;}
   if(['href','src','srcset','action','poster','formaction'].includes(a.name)&&
      /^(?:javascript:|data:text\/html)/i.test(a.value.trim())){removedUntrustedUrls++;return false;}
   return true;
  });
 }
 visit(document);
 let html=parse5.serialize(document);
 const policy="default-src 'none'; script-src 'nonce-"+token+"'; style-src 'unsafe-inline'; img-src 'none'; media-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'";
 const policyTag='<meta http-equiv="Content-Security-Policy" content="'+policy+'">';
 html=html.replace('<head>','<head>'+policyTag);
 const bootstrap='('+childAdapter.toString()+')('+JSON.stringify(token)+','+JSON.stringify(parentOrigin)+');';
 // Only this developer-controlled bootstrap has a matching nonce.
 html=html.replace('</body>','<script nonce="'+token+'">'+bootstrap+'</script></body>');
 return {html,removedScripts,removedHandlers,removedUntrustedUrls};
}
(async()=>{
 const parse5=await import('parse5');
 const token=crypto.randomBytes(18).toString('hex');
 const server=http.createServer((req,res)=>{
  // No contact with any external service; count unexpected requests.
  if(req.url!=='/'){server.requestCount=(server.requestCount||0)+1;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end('<!doctype html><html><body><h1 id="parent-title">Trusted editor host</h1><iframe id="subject" sandbox="allow-scripts" title="Cedar reviewed preview" style="width:1200px;height:850px"></iframe></body></html>');
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 try{
  const parentOrigin='http://127.0.0.1:'+server.address().port;
  const altered=original.replace('<h1 id="hero-title">','<h1 id="hero-title" onclick="parent.document.body.textContent=1">')
    .replace('</body>','<script>window.UNTRUSTED_ORIGINAL_EXECUTED=true;</script></body>');
  const built=checkedArtifact(altered,parse5,token,parentOrigin);
  yes(built.removedScripts>=2,'original scripts removed before trusted bootstrap');
  equal(built.removedHandlers,1,'malicious event attr removed');
  const forgedSite=checkedArtifact(altered.replace('href="#field-notes"','href="javascript:alert(1)"'),parse5,token,parentOrigin);
  equal(forgedSite.removedUntrustedUrls,1,'malicious javascript link removed');
  yes(!built.html.includes('onclick='),'no inline handlers retained');
  browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:950}});
  let external=0;await context.route('**/*',async route=>{
   if(!route.request().url().startsWith(parentOrigin+'/')){external++;await route.abort();}
   else await route.continue();
  });
  const page=await context.newPage();let pageerrors=0;page.on('pageerror',()=>pageerrors++);
  await page.goto(parentOrigin+'/');
  await page.evaluate(()=>{window.__events=[];window.addEventListener('message',e=>{
   if(e.source===document.getElementById('subject').contentWindow&&e.data?.channel==='stage1-reviewed')window.__events.push(e.data);
  });});
  await page.locator('#subject').evaluate((f,html)=>{f.srcdoc=html;},built.html);
  await page.waitForFunction(()=>window.__events?.some(x=>x.kind==='ready'),null,{timeout:15000});
  const frame=page.frameLocator('#subject');
  yes(await frame.locator('#hero-title').isVisible(),'original site headline present');
  equal(await frame.locator('#hero-title').getAttribute('onclick'),null,'inline event removed');
  equal(await frame.locator('#hero').evaluate(x=>getComputedStyle(x).backgroundImage.includes('linear-gradient')),true,'original CSS gradient retained');
  equal(await frame.locator('#hero-title').evaluate(x=>x.ownerDocument.defaultView.UNTRUSTED_ORIGINAL_EXECUTED),undefined,'untrusted script not run');
  equal(await frame.locator('#hero-cta').getAttribute('href'),'#field-notes','original reviewed CTA retained');
  const send=async(x)=>page.evaluate(x=>{
    document.getElementById('subject').contentWindow.postMessage(x,'*');
  },x);
  let settings={menuEnabled:true,formPreviewEnabled:true,ctaHref:'#faq'};
  const command=(seq,settings2=settings,tok=token)=>({channel:'stage1-review-command',token:tok,seq,settings:settings2});
  await send(command(1));
  await page.waitForFunction(()=>window.__events.some(x=>x.kind==='ack'&&x.info.seq===1));
  equal(await frame.locator('#hero-cta').getAttribute('href'),'#faq','typed reviewed href applied');
  await frame.locator('#menu-toggle').click();
  equal(await frame.locator('#menu-toggle').getAttribute('aria-expanded'),'true','reviewed menu works despite original JS disabled');
  await frame.locator('#newsletter-email').fill('test@example.org');
  await frame.locator('#newsletter-submit').click();
  await page.waitForFunction(()=>window.__events.some(x=>x.kind==='preview-form'));
  equal(await page.evaluate(()=>window.__events.find(x=>x.kind==='preview-form').info.action),'local-preview-only','form stays preview-only');
  equal(server.requestCount||0,0,'no server form request');
  equal(external,0,'no external network attempts');
  // Ignore replay, unsigned parent or malformed config; real child handles those.
  await send(command(1,{...settings,ctaHref:'#hero'})); // repeat sequence
  await page.waitForTimeout(50);
  equal(await frame.locator('#hero-cta').getAttribute('href'),'#faq','replay unchanged');
  refused((await page.evaluate(()=>window.__events.filter(x=>x.kind==='denied').length))>0,'stale message flagged');
  await send(command(2,{...settings,ctaHref:'javascript:alert(1)'}));
  await page.waitForTimeout(50);
  equal(await frame.locator('#hero-cta').getAttribute('href'),'#faq','unsafe protocol rejected');
  await send(command(3,{...settings,unknown:'executable'}));
  await page.waitForTimeout(50);
  equal(await frame.locator('#hero-cta').getAttribute('href'),'#faq','extra unapproved field denied');
  await send(command(4,settings,'incorrect-token'));
  await page.waitForTimeout(50);
  equal(await frame.locator('#hero-cta').getAttribute('href'),'#faq','wrong token denied');
  await page.evaluate(()=>window.postMessage({channel:'stage1-review-command',token:'spoof',seq:100,settings:{}},'*'));
  equal(await frame.locator('#hero-cta').getAttribute('href'),'#faq','non-parent message not applied');
  await send(command(5,{menuEnabled:false,formPreviewEnabled:false,ctaHref:'#field-notes'}));
  await page.waitForFunction(()=>window.__events.some(x=>x.kind==='ack'&&x.info.seq===5));
  equal(await frame.locator('#hero-cta').getAttribute('href'),'#field-notes','owner update roundtrip');
  await frame.locator('#menu-toggle').click();
  equal(await frame.locator('#menu-toggle').getAttribute('aria-expanded'),'true','disabled menu does not toggle');
  const count=await page.evaluate(()=>window.__events.filter(x=>x.kind==='preview-form').length);
  await frame.locator('#newsletter-submit').click();
  await page.waitForTimeout(80);
  equal(await page.evaluate(()=>window.__events.filter(x=>x.kind==='preview-form').length),count,'disabled preview form has no ack');
  equal(server.requestCount||0,0,'still no form or media requests');
  equal(await page.locator('#parent-title').textContent(),'Trusted editor host','host DOM unchanged by untrusted source');
  equal(pageerrors,0,'no browser page errors');
  console.log('STAGE1_REVIEWED_RICH_BEHAVIOR='+JSON.stringify({pass:true,checks:tests,negativeDenials:denials,originalScriptsRemoved:built.removedScripts,unsafeHandlersRemoved:built.removedHandlers,typedActionMenuRestored:true,localPreviewFormOnly:true,untrustedOriginalCodeExecuted:false,networkRequests:server.requestCount||0,stableVisualCss:true,limits:'Reviewed adapter test only, exact known IDs/operations, parent-issued commands; host-origin command transport not a production auth API; original site custom JS not preserved; no real form backend.'}));
  await context.close();
 }finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error('STAGE1_REVIEWED_RICH_BEHAVIOR_FAIL='+String(e.stack||e));process.exitCode=1});
