/* Stage1 research only: PHP built-in HTTP server and atomic published JSON file, no CMS/Node runtime on server. */
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process');
const php=spawnSync('php',['-v'],{encoding:'utf8'});
assert.equal(php.status,0,'PHP CLI required');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stage1-published-'));
const snap=path.join(dir,'published.json');
const initial={title:'Owner published hero',fontSize:'58px',accent:'#66e0c4',cta:'Explore'};
const publish=obj=>{const tmp=snap+'.tmp';fs.writeFileSync(tmp,JSON.stringify(obj),'utf8');fs.renameSync(tmp,snap)};
const previous=structuredClone(initial);publish(initial);
const socket=net.createServer();socket.listen(0,'127.0.0.1');
(async()=>{
 await new Promise(resolve=>socket.once('listening',resolve));
 const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
 const server=spawn('php',['-S','127.0.0.1:'+port,'-t',path.join(__dirname,'public-runtime')],{
  env:{...process.env,STAGE1_PUBLISHED_FIXTURE:snap},stdio:['ignore','pipe','pipe']});
 let stderr='';server.stderr.on('data',b=>stderr+=String(b));
 const base='http://127.0.0.1:'+port;
 async function request(route='/',options){return fetch(base+route,options)}
 try {
  let ready=false;
  for(let i=0;i<45;i++){if(server.exitCode!==null)throw Error('PHP server crashed: '+stderr);try{const r=await request('/');if(r.status===200){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
  assert.ok(ready,'PHP did not start: '+stderr);
  let resp=await request('/');let html=await resp.text();
  assert.equal(resp.status,200);assert.ok(html.includes('Owner published hero'));
  assert.ok(html.includes('font-size:58px'));assert.ok(html.includes('background:#66e0c4'));
  assert.ok(!html.includes('<script'));assert.ok(!html.includes('jedison'));assert.ok(!html.includes('@rjsf'));
  assert.equal((await request('/admin')).status,404);
  assert.equal((await request('/',{method:'POST',body:'{"title":"unauthorized"}'})).status,405);
  publish({...initial,title:'New published revision',fontSize:'64px'});
  resp=await request('/');html=await resp.text();assert.equal(resp.status,200);
  assert.ok(html.includes('New published revision'));assert.ok(html.includes('font-size:64px'));
  assert.ok(!html.includes('Owner published hero'));
  publish({...initial,title:'<img src=x onerror=alert(1)>',cta:'<svg onload=alert(1)>'});
  html=await (await request('/')).text();
  assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;svg'));
  assert.ok(!html.includes('<img'));assert.ok(!html.includes('<svg'));
  publish({...initial,fontSize:'calc(1px + url(https://example.invalid))'});
  resp=await request('/');assert.equal(resp.status,503);assert.equal(await resp.text(),'Published snapshot invalid');
  publish(previous);
  resp=await request('/');html=await resp.text();assert.equal(resp.status,200);
  assert.ok(html.includes('Owner published hero'));assert.ok(html.includes('font-size:58px'));
  console.log('STAGE1_PHP_HTTP_PUBLISHED='+JSON.stringify({pass:true,phpVersion:php.stdout.split('\n')[0],publicOnly:true,anonymousGET:200,adminRoute:404,unauthorizedPOST:405,atomicNewPublish:true,htmlEscaped:true,invalidSnapshot:503,rollback:true,noAdminJavaScript:true,serverRuntime:'PHP -S CLI on GitHub runner, NOT real shared hosting'}));
 }finally{server.kill('SIGTERM');fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error('STAGE1_PHP_HTTP_PUBLISHED_FAIL='+String(e.stack||e));process.exitCode=1});
