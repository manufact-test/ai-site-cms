/* Stage 1, security research only: sandboxed opaque-origin preview with typed message bridge. */
'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), http=require('node:http');
const {chromium}=require('playwright-core');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
if(!chrome)throw Error('Chrome is required');
function installPreview(){
 const preview=document.getElementById('preview');
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
 const state={ready:false,acks:[],rejected:0};
 window.proofState=state;
 window.addEventListener('message',event=>{
  const msg=event.data;
  if(event.source!==preview.contentWindow||event.origin!=='null'||!msg||typeof msg!=='object'||Array.isArray(msg)||msg.token!==token){state.rejected++;return}
  if(msg.kind==='ready'&&Object.keys(msg).sort().join(',')==='kind,token')state.ready=true;
  else if(msg.kind==='applied'&&Object.keys(msg).sort().join(',')==='kind,token,value'&&typeof msg.value==='string'&&/^(?:0|[1-9][0-9]{0,2})px$/.test(msg.value))state.acks.push(msg.value);
  else state.rejected++;
 });
 const childScript=[
  'const token='+JSON.stringify(token)+';',
  'const host='+JSON.stringify(location.origin)+';',
  'window.parentBlocked=false;try{parent.document.body.dataset.compromised="yes"}catch(e){window.parentBlocked=true}',
  'window.networkBlocked=false;fetch("/leak").then(()=>window.networkBlocked=false).catch(()=>window.networkBlocked=true);',
  'window.addEventListener("message",event=>{',
  'const m=event.data;',
  'if(event.origin!==host||event.source!==parent||!m||m.kind!=="style"||m.token!==token||Object.keys(m).sort().join(",")!=="kind,token,value"||typeof m.value!=="string"||!/^(?:0|[1-9][0-9]{0,2})px$/.test(m.value))return;',
  'document.getElementById("hero").style.fontSize=m.value;',
  'parent.postMessage({kind:"applied",token,value:m.value},host);',
  '});',
  'parent.postMessage({kind:"ready",token},host);'
 ].join('');
 const csp="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'";
 preview.srcdoc='<html><head><meta http-equiv="Content-Security-Policy" content="'+csp+'"></head><body><h1 id="hero">Hero</h1><script>'+childScript+'</scr'+'ipt></body></html>';
 window.sendStyle=(value,extra)=>preview.contentWindow.postMessage(Object.assign({kind:'style',token,value},extra||{}),'*');
 window.sendSpoof=()=>{window.postMessage({kind:'applied',token,value:'999px'},'*')};
}
(async()=>{
 const server=http.createServer((req,res)=>{if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':"default-src 'self' 'unsafe-inline'; frame-src 'self'; object-src 'none'"});res.end('<!doctype html><html><body><p id="admin">ADMIN UNCHANGED</p><iframe id="preview" sandbox="allow-scripts"></iframe></body></html>');}else{res.writeHead(404);res.end('nope')}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const origin='http://127.0.0.1:'+server.address().port;
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.evaluate(installPreview);
  await page.waitForFunction(()=>window.proofState?.ready,null,{timeout:8000});
  const frame=page.frameLocator('#preview');
  const blocked=await frame.locator('#hero').evaluate(async()=>{
   for(let i=0;i<50&&!window.networkBlocked;i++)await new Promise(r=>setTimeout(r,10));
   return {parentBlocked:window.parentBlocked,networkBlocked:window.networkBlocked,origin:location.origin};
  });
  assert.equal(blocked.parentBlocked,true,'sandbox must block frame DOM access to parent');
  assert.equal(blocked.networkBlocked,true,'child CSP must block network');
  assert.equal(blocked.origin,'null','sandbox without allow-same-origin must have opaque origin');
  await page.evaluate(()=>window.sendStyle('58px'));
  await page.waitForFunction(()=>window.proofState.acks.includes('58px'));
  assert.equal(await frame.locator('#hero').evaluate(el=>el.style.fontSize),'58px');
  const before=(await page.evaluate(()=>window.proofState.acks)).length;
  await page.evaluate(()=>{window.sendStyle('calc(1px + url(https://attacker.invalid))');window.sendStyle('1px',{kind:'style',target:'innerHTML'});window.sendStyle('url(javascript:alert(1))');window.sendSpoof()});
  await page.waitForTimeout(160);
  const after=(await page.evaluate(()=>window.proofState.acks)).length;
  assert.equal(after,before,'rejected messages must not emit applied ack');
  assert.equal(await frame.locator('#hero').evaluate(el=>el.style.fontSize),'58px');
  assert.equal(await page.locator('#admin').textContent(),'ADMIN UNCHANGED');
  assert.equal(await page.locator('body').getAttribute('data-compromised'),null);
  assert.deepEqual(errors,[]);
  await page.close();
  console.log('STAGE1_PREVIEW_SECURITY='+JSON.stringify({pass:true,origin:blocked.origin,parentBlocked:true,networkBlocked:true,typedStyleAck:'58px',spoofedAndInvalidRejected:true,scope:'isolated Chromium probe, NOT production XSS/CSP/security certification'}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error('STAGE1_PREVIEW_SECURITY_FAIL='+String(e.stack||e));process.exitCode=1});
