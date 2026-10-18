/* Stage1 original HTML source + real PHP CLI persisted versions across processes
 * and actual Chromium rendering of rehydrated, restricted published/draft.
 * Isolated mock storage, NOT a production CMS or external other-model artifact.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync,spawn}=require('node:child_process');
const {chromium}=require('playwright-core');
const php=path.join(__dirname,'rich-source-persistent-store.php');
const source=fs.readFileSync(path.join(__dirname,'fixtures/cedar-lab-standalone.html'),'utf8');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'stage1-original-persistent-'));
const db=path.join(root,'db'),payload=path.join(root,'inputs');fs.mkdirSync(db,{mode:0o700});fs.mkdirSync(payload,{mode:0o700});
const env={...process.env,STAGE1_RICH_SOURCE_STORE_DIR:db};
const browserPath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
let checks=0,denials=0,phpProcesses=0,serial=0,network=0;
function eq(a,b,msg){assert.deepEqual(a,b,msg);checks++;}
function yes(a,msg){assert.ok(a,msg);checks++;}
function deny(r,part){assert.notEqual(r.status,0,'unexpected success '+r.stdout);checks++;denials++;
 if(part){yes(r.stderr.includes(part),'expected refusal '+part+' got '+r.stderr);}}
function input(s){const p=path.join(payload,'sample-'+(++serial)+'.json');fs.writeFileSync(p,JSON.stringify(s));return p;}
function cli(cmd,obj=null,gen=null,extra={}) {
 const args=[php,cmd];if(obj!==null){args.push(input(obj));if(gen!==null)args.push(String(gen));}
 const r=spawnSync('php',args,{encoding:'utf8',env:{...env,...extra},timeout:12000});
 phpProcesses++;return r;
}
function ok(cmd,obj=null,gen=null,extra={}){
 const x=cli(cmd,obj,gen,extra);
 assert.equal(x.status,0,cmd+':'+x.stderr);checks++;
 return JSON.parse(x.stdout.replace(/^STAGE1_RICH_PHP=/,''));
}
const clone=x=>JSON.parse(JSON.stringify(x));
function newState(old,change) {const next=clone(old);next.generation++;next.revision++;change(next);return next;}
function newSource(s){
 const a='<article id="card-soil"><h2 id="soil-title">Soil chemistry</h2><p id="soil-desc">Measurements beneath the canopy.</p></article>';
 const b='<article id="card-wind"><h2 id="wind-title">Wind patterns</h2><p id="wind-desc">How the ridge changes airflow.</p></article>';
 if(!s.includes(a+'\n'+b))throw Error('articles not adjacent');
 return s.replace(a+'\n'+b,b+'\n'+a)
  .replace('Signals in the forest.','Research from a living canopy.')
  .replace('--gutter:28px','--gutter:32px')
  .replace('#e7f0dd,#aadbd0','#dce7d5,#8acabb');
}
const owner={
 'hero-title/content.text':'Owner <script> is text & safe',
 'hero-cta/behavior.href':'#gallery',
 'hero-image/media.alt':'Owner <cedar> & daylight',
 'document/style.gutter':40
};
function stableSourceView(html,values,parse5){
 // Browser preview only. Real security sanitizer and complete CSS validation
 // are NOT implemented. Source scripts/inline event attrs removed and iframe
 // is opaque with CSP and blocked network.
 const doc=parse5.parse(html);
 const nodes=new Map();
 function visit(n) {
  if(n.attrs) {
   n.attrs=n.attrs.filter(a=>!/^on[a-z]+$/i.test(a.name));
   const id=n.attrs.find(a=>a.name==='id')?.value;if(id)nodes.set(id,n);
  }
  if(n.childNodes) {
   n.childNodes=n.childNodes.filter(x=>!['script','iframe','object','embed','base'].includes(x.tagName));
   for(const c of n.childNodes)visit(c);
  }
 }visit(doc);
 if(Object.hasOwn(values,'hero-title/content.text')){
  const n=nodes.get('hero-title');n.childNodes=[{nodeName:'#text',value:values['hero-title/content.text'],parentNode:n}];
 }
 if(Object.hasOwn(values,'hero-cta/behavior.href'))nodes.get('hero-cta').attrs.find(a=>a.name==='href').value=values['hero-cta/behavior.href'];
 if(Object.hasOwn(values,'hero-image/media.alt'))nodes.get('hero-image').attrs.find(a=>a.name==='alt').value=values['hero-image/media.alt'];
 if(Object.hasOwn(values,'document/style.gutter')) {
  function edit(n) {
   if(n.tagName==='style')n.childNodes[0].value=n.childNodes[0].value.replace(/--gutter:\s*[0-9]{1,3}px/,'--gutter:'+values['document/style.gutter']+'px');
   for(const c of n.childNodes||[])edit(c);
  }edit(doc);
 }
 const csp="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; media-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'";
 return parse5.serialize(doc).replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'">');
}
async function concurrent(folder,cmd,args){
 const r=await Promise.all(Array.from({length:3},()=>new Promise((resolve,reject)=>{
  const p=spawn('php',[php,cmd,...args],{env:{...env,STAGE1_RICH_SOURCE_STORE_DIR:folder}});
  let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);
  p.on('error',reject);p.on('close',status=>resolve({status,out,err}));
 })));phpProcesses+=r.length;return r;
}
async function browserVerify(draft,published,parse5){
 const browser=await chromium.launch({headless:true,executablePath:browserPath,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1300,height:850}});
  await context.route('**/*',route=>{network++;route.abort();});
  const page=await context.newPage();
  await page.setContent('<iframe title="draft" sandbox="allow-scripts" style="width:1200px;height:820px"></iframe><iframe title="published" sandbox="allow-scripts" style="width:1200px;height:820px"></iframe>');
  await page.locator('iframe[title=draft]').evaluate((f,x)=>{f.srcdoc=x;},stableSourceView(draft.source,draft.values,parse5));
  await page.locator('iframe[title=published]').evaluate((f,x)=>{f.srcdoc=x;},stableSourceView(published.source,published.values,parse5));
  const d=page.frameLocator('iframe[title=draft]'),p=page.frameLocator('iframe[title=published]');
  await d.locator('#hero-title').waitFor();await p.locator('#hero-title').waitFor();
  eq(await d.locator('#hero-title').textContent(),owner['hero-title/content.text'],'persisted draft text safe');
  eq(await d.locator('#hero-cta').getAttribute('href'),'#gallery','persisted href');
  eq(await d.locator('#hero-image').getAttribute('alt'),owner['hero-image/media.alt'],'persisted image alt');
  eq(await d.locator('#hero').evaluate(x=>getComputedStyle(x).paddingTop),'40px','persisted CSS computed');
  eq(await d.locator('#field-notes > article').first().getAttribute('id'),'card-wind','AI source v2 order retained');
  eq(await p.locator('#hero-title').textContent(),'Signals in the forest.','independent published v1');
  eq(await p.locator('#field-notes > article').first().getAttribute('id'),'card-soil','published original article order');
  await d.locator('#newsletter-email').fill('test@example.org');await d.locator('#newsletter-submit').click();
  eq(network,0,'read-only restricted preview prevents request');
  await page.locator('iframe[title=draft]').evaluate(f=>f.style.width='390px');
  eq(await d.locator('#field-notes').evaluate(x=>getComputedStyle(x).gridTemplateColumns.split(' ').length),1,'persisted original mobile responsive grid');
  eq(await d.locator('#hero-title').evaluate(x=>getComputedStyle(x).fontSize),'36px','mobile responsive font');
  await page.emulateMedia({reducedMotion:'reduce'});
  eq(await d.locator('#weather-icon').evaluate(x=>getComputedStyle(x).animationName),'none','reduced motion');
  await context.close();
 }finally{await browser.close();}
}
(async()=>{
 try{
  const pub={revision:1,source,version:'1.0.0',values:{}};
  const zero={generation:1,revision:1,source,version:'1.0.0',saved:{},draft:{},published:pub,history:[pub]};
  ok('init',zero);eq(ok('read').state,zero,'PHP init cross-process roundtrip');
  deny(cli('init',zero),'already-initialized');
  const edited=newState(zero,s=>{s.saved=clone(owner);s.draft=clone(owner)});
  ok('commit',edited,1);eq(ok('read').state,edited,'PHP stores typed owner edits');
  eq(ok('read').state.published,pub,'saved edits do not publish');
  const regenerated=newState(edited,s=>{s.source=newSource(s.source);s.version='2.0.0';});
  ok('commit',regenerated,2);
  eq(ok('read').state,regenerated,'complete HTML retained across independent PHP processes');
  deny(cli('commit',regenerated,2),'cas-stale');
  const orphan=newState(regenerated,s=>{s.saved={};s.draft={};});
  // Explicitly test source migration losing overrides: change source as well.
  orphan.source=orphan.source.replace('Research from a living canopy.','New AI changed hero.');
  deny(cli('commit',orphan,3),'owner-override-lost');
  const invalid=newState(regenerated,s=>{s.source=s.source.replace('id="hero-title"','id="some-ai-title"');});
  deny(cli('commit',invalid,3),'missing-or-changed-target');
  const wrongTag=newState(regenerated,s=>{s.source=s.source.replace('<h1 id="hero-title">','<button id="hero-title">').replace('</h1>','</button>');});
  deny(cli('commit',wrongTag,3),'missing-or-changed-target');
  const altLoss=newState(regenerated,s=>{s.source=s.source.replace('alt="Cedar grove at morning light"','');});
  deny(cli('commit',altLoss,3),'owner-alt-removed');
  const cssLoss=newState(regenerated,s=>{s.source=s.source.replace('--gutter:32px','--removed-gutter:32px');});
  deny(cli('commit',cssLoss,3),'owner-css-variable-removed');
  const badText=newState(regenerated,s=>{s.saved['hero-title/content.text']=null});
  deny(cli('commit',badText,3),'unapproved-field');
  const xssLink=newState(regenerated,s=>{s.saved['hero-cta/behavior.href']='javascript:alert(1)';});
  deny(cli('commit',xssLink,3),'unapproved-field');
  const badAnchor=newState(regenerated,s=>{s.saved['hero-cta/behavior.href']='#missing-target';});
  deny(cli('commit',badAnchor,3),'dangling-reviewed-fragment');
  const tamperHistory=newState(regenerated,s=>{s.history[0].values={'hero-title/content.text':'malicious changed prior release'}});
  deny(cli('commit',tamperHistory,3),'history-rewrite');
  const stealth=newState(regenerated,s=>{s.published={...s.published,revision:4}});
  deny(cli('commit',stealth,3),'history-tail-not-published');
  const restoredByReader=ok('read').state;
  eq(restoredByReader,regenerated,'no rejected candidate changed durable state');
  const fresh=spawnSync(process.execPath,['-e',
    'const fs=require("fs");const v=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(JSON.stringify({generation:v.generation,owner:v.saved["hero-title/content.text"],sourceVersion:v.version,pub:v.published.version,history:v.history.length}));'
   ],{input:JSON.stringify(restoredByReader),encoding:'utf8'});
  eq(fresh.status,0,'new node process can rehydrate PHP bytes');
  eq(JSON.parse(fresh.stdout).pub,'1.0.0','fresh node proves published isolation');
  const parse5=await import('parse5');
  await browserVerify({source:restoredByReader.source,values:restoredByReader.saved},restoredByReader.published,parse5);
  const published=newState(regenerated,s=>{
    s.published={revision:s.revision,source:s.source,version:s.version,values:clone(s.saved)};
    s.history.push(clone(s.published));
  });
  ok('commit',published,3);
  eq(ok('read').state.published.version,'2.0.0','explicit publish committed to disk');
  const rollback=newState(published,s=>{
    s.published={revision:s.revision,...clone(s.history[0])};
    s.published.revision=s.revision;
    s.history.push(clone(s.published));
  });
  ok('commit',rollback,4);
  eq(ok('read').state.published.version,'1.0.0','published rolled back as new immutable entry');
  eq(ok('read').state.version,'2.0.0','draft source v2 survives rollback');
  eq(ok('read').state.history.length,3,'append-only publication history');
  const rollbackState=ok('read').state;
  // Crash before swapping pointer: current must remain previous valid version.
  const afterCrash=newState(rollbackState,s=>{s.draft['document/style.gutter']=52});
  deny(cli('commit',afterCrash,5,{STAGE1_RICH_SOURCE_FAILPOINT:'after-backup'}),'injected-crash-after-backup');
  eq(ok('read').state,rollbackState,'injected crash leaves current exactly unchanged');
  const currentPath=path.join(db,'current.json'),lastPath=path.join(db,'last-good.json');
  const record=JSON.parse(fs.readFileSync(currentPath,'utf8'));
  record.sha256='0'.repeat(64);
  fs.writeFileSync(currentPath,JSON.stringify(record));
  const fallback=ok('read');eq(fallback.status,'fallback-last-good','corrupt current falls back to valid earlier snapshot');
  eq(fallback.state.generation,5,'last-good generation');
  ok('restore');eq(ok('read').status,'current','explicit restore repairs current');
  eq(ok('read').state.generation,6,'restored generation advanced; latest rollback publication lost on recovery');
  fs.writeFileSync(currentPath,'{"payload":');
  fs.writeFileSync(lastPath,'{"payload":');
  deny(cli('read'),'no-valid-snapshot');
  console.log('STAGE1_ORIGINAL_SOURCE_PHP_JOURNAL='+JSON.stringify({
   pass:true,checks,expectedRejections:denials,phpProcesses,originalHTMLStored:true,reviewedOwnerFields:4,
   sourceUpdates:1,publishedIndependentUntilExplicit:true,publishedRollbackAppendOnly:true,
   abortedOwnerLossAndSourceConflicts:true,realChromiumFromRehydratedPHP:true,
   corruptCurrentFallback:true,bothCorruptFailsClosed:true,
   publishedRollbackCanBeLostWhenLastGoodIsOlder:true,
   limitations:'PHP CLI local hash-based corruption detection only; no auth, real shared host, physical fsync, HMAC attacker provenance or external counter. PHP regex handles narrow manually reviewed source contract, not arbitrary HTML security/DOM parsing. Browser source JS stripped. No external AI generated site+manifest.'
  }));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error('STAGE1_ORIGINAL_SOURCE_PHP_JOURNAL_FAIL='+String(e.stack||e));process.exitCode=1});
