/* Stage 1 research ONLY: PHP CLI/Opis publish pipeline and public HTTP fallback probes.
 * Run AFTER composer install. No server-side Node or admin API. */
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process');
const root=path.join(__dirname,'public-runtime'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage1-atomic-publish-'));
const snapshots=path.join(tmp,'outside-docroot'),inputDir=path.join(tmp,'inputs');
fs.mkdirSync(snapshots);fs.mkdirSync(inputDir);
const main={title:'Owner stable headline',fontSize:'58px',accent:'#66e0c4',cta:'Discover'};
const candidate=(changes={})=>({...main,...changes});
let serial=0;
function writeInput(value,raw=false){
 const p=path.join(inputDir,'data-'+(++serial)+'.json');
 fs.writeFileSync(p,raw?value:JSON.stringify(value),'utf8');return p;
}
const env={...process.env,STAGE1_SNAPSHOT_DIRECTORY:snapshots};
function cli(cmd,arg){
 return spawnSync('php',[path.join(root,'publish-cli.php'),cmd,arg],{env,encoding:'utf8',timeout:30000});
}
function checked(res,label){
 assert.equal(res.status,0,label+': '+res.stderr);
 const line=res.stdout.trim().split('\n').find(l=>l.startsWith('STAGE1_PUBLISH='));
 assert.ok(line,'missing CLI receipt '+res.stdout);
 const value=JSON.parse(line.slice('STAGE1_PUBLISH='.length));
 assert.equal(value.ok,true);return value;
}
function rejected(res,label){
 assert.notEqual(res.status,0,label+' unexpectedly accepted: '+res.stdout);
 assert.ok(res.stderr.includes('STAGE1_PUBLISH_REJECTED='),label+': '+res.stderr);
}
function getValidFile(file){
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(typeof data.title,'string');assert.match(data.fontSize,/^[0-9]{1,3}px$/);
 return data;
}
function asyncCli(cmd,arg){
 return new Promise((resolve,reject)=>{
  const child=spawn('php',[path.join(root,'publish-cli.php'),cmd,arg],{env});
  let out='',err='';
  child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);
  child.on('error',reject);
  child.on('close',code=>resolve({code,out,err}));
 });
}
(async()=>{
 const socket=net.createServer();socket.listen(0,'127.0.0.1');
 await new Promise(r=>socket.once('listening',r));
 const port=socket.address().port;await new Promise(r=>socket.close(r));
 const server=spawn('php',['-S','127.0.0.1:'+port,'-t',root],{env,stdio:['ignore','pipe','pipe']});
 let stderr='';server.stderr.on('data',b=>stderr+=String(b));
 const base='http://127.0.0.1:'+port;
 const request=(route='/',init)=>fetch(base+route,init);
 try{
  let ready=false;for(let n=0;n<45;n++){try{const x=await request('/');if(x.status===503){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
  assert.ok(ready,'PHP HTTP server failed: '+stderr);
  assert.equal((await request('/')).status,503,'before first publish no public content');
  const a=checked(cli('publish',writeInput(main)),'initial publish');
  const publicA=await (await request('/')).text();
  assert.ok(publicA.includes('Owner stable headline'));assert.ok(publicA.includes('font-size:58px'));
  assert.ok(!publicA.includes('<script'));assert.ok(!publicA.includes('publish-cli'));assert.ok(!publicA.includes('Opis'));
  assert.equal((await request('/admin')).status,404);
  assert.equal((await request('/',{method:'POST',body:'hijack'})).status,405);
  const b=checked(cli('publish',writeInput(candidate({title:'AI updated non-owner default',fontSize:'64px'}))),'next publish');
  assert.ok(b.revision!==a.revision,'new revision required');
  assert.ok((await (await request('/')).text()).includes('AI updated non-owner default'));
  assert.equal(getValidFile(path.join(snapshots,'last-good.json')).title,main.title,'previous version retained');

  const forbidden=[
    ['css-injection',candidate({fontSize:'calc(1px + url(https://evil.invalid))'})],
    ['html-extra-field',candidate({metadata:'<img onerror=alert(1)>'})],
    ['wrong-type',candidate({title:17})],
    ['oversized-ascii',candidate({title:'A'.repeat(501)})],
    ['oversized-unicode',candidate({title:'Я'.repeat(501)})],
    ['malformed','{"title":'],
    ['oversized-blob','x'.repeat(25000)]
  ];
  for(const [name,payload] of forbidden){
   rejected(cli('publish',writeInput(payload,typeof payload==='string')),'reject '+name);
   assert.equal(getValidFile(path.join(snapshots,'current.json')).title,'AI updated non-owner default','invalid publish must not mutate current');
   assert.equal(getValidFile(path.join(snapshots,'last-good.json')).title,main.title,'invalid publish must not mutate fallback');
  }
  assert.equal((await request('/')).status,200);

  const safeHtml=checked(cli('publish',writeInput(candidate({title:'<img src=x onerror=alert(1)>',cta:'<svg onload=alert(1)>'}))),'safe HTML-looking strings');
  const page=await (await request('/')).text();
  assert.ok(page.includes('&lt;img'));assert.ok(page.includes('&lt;svg'));assert.ok(!page.includes('<img'));assert.ok(!page.includes('<svg'));
  const c=checked(cli('publish',writeInput(candidate({title:'Я'.repeat(500)}))),'UTF-8 length valid');
  assert.ok((await (await request('/')).text()).includes('Я'.repeat(500)));
  assert.equal(getValidFile(path.join(snapshots,'last-good.json')).title,'<img src=x onerror=alert(1)>');

  // Simulate out-of-band file damage (NOT via the guarded publisher).
  fs.writeFileSync(path.join(snapshots,'current.json'),'{ corrupt');
  let http=await request('/');assert.equal(http.status,200,'must serve last-good after primary corruption');
  let html=await http.text();assert.ok(html.includes('&lt;img'),'must serve real last-good');
  rejected(cli('publish',writeInput(candidate({title:'No silent repair'}))),'publishing over corrupted primary');
  assert.equal(fs.readFileSync(path.join(snapshots,'current.json'),'utf8'),'{ corrupt');
  rejected(cli('rollback','../../.env'),'path traversal revision');
  checked(cli('rollback',b.revision),'explicit rollback from corrupted primary');
  html=await (await request('/')).text();assert.ok(html.includes('AI updated non-owner default'));
  assert.ok(!html.includes('Я'.repeat(500)));

  // If both active and fallback are corrupt, fail closed; CLI rollback can recover.
  fs.writeFileSync(path.join(snapshots,'last-good.json'),'{bad');
  fs.writeFileSync(path.join(snapshots,'current.json'),'{bad');
  http=await request('/');assert.equal(http.status,503);
  checked(cli('rollback',a.revision),'recovery with two corrupt pointers');
  html=await (await request('/')).text();assert.ok(html.includes('Owner stable headline'));
  assert.equal(getValidFile(path.join(snapshots,'last-good.json')).title,main.title);

  // Multiple CLI writers race: publisher flock protects archive/pointers.
  const contenders=Array.from({length:4},(_,i)=>writeInput(candidate({title:'Concurrent '+i,fontSize:(60+i)+'px'})));
  const results=await Promise.all(contenders.map(f=>asyncCli('publish',f)));
  assert.ok(results.every(x=>x.code===0),'concurrent publish CLI calls failed: '+JSON.stringify(results));
  const final=getValidFile(path.join(snapshots,'current.json'));
  assert.match(final.title,/^Concurrent [0-3]$/);
  assert.ok((await (await request('/')).text()).includes(final.title));
  const backup=getValidFile(path.join(snapshots,'last-good.json'));
  assert.ok(backup.title==='Owner stable headline'||backup.title.startsWith('Concurrent '));
  const revisions=fs.readdirSync(path.join(snapshots,'revisions')).filter(x=>x.endsWith('.json'));
  assert.equal(revisions.length,4+4+2,'all successful revisions including rollbacks must be unique and stored');
  for(const f of revisions)getValidFile(path.join(snapshots,'revisions',f));
  checked(cli('rollback',safeHtml.revision),'older valid HTML-like content rollback');
  const after=await (await request('/')).text();assert.ok(after.includes('&lt;img'));
  console.log('STAGE1_PUBLISH_LAST_GOOD='+JSON.stringify({
   pass:true,host:'GitHub runner PHP built-in HTTP, NOT real shared hosting',
   realOpisVersion:'2.6.0',validationBeforeMutation:forbidden.length,
   publishedRevisions:revisions.length+1,guardedHtmlEscaping:true,unicodeMaxLength:true,
   corruptedPrimaryServesPreviousValid:true,publishOverCorruptionRejected:true,
   corruptPrimaryAndBackupFailClosed:true,explicitRollbackRecovers:true,
   pathTraversalRejected:true,concurrentWriters:contenders.length,
   publicWithoutEditor:true,publicNoAdminRoute:true,
   noDbOrAuthenticationOrFsyncGuarantees:true
  }));
 }finally{server.kill('SIGTERM');fs.rmSync(tmp,{recursive:true,force:true})}
})().catch(e=>{console.error('STAGE1_PUBLISH_LAST_GOOD_FAIL='+String(e.stack||e));process.exitCode=1});
