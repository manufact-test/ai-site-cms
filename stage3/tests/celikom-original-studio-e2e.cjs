#!/usr/bin/env node
'use strict';
// Real existing hosted Studio UI and PHP API in disposable GitHub Actions/SQLite.
// Synthetic CELIKOM-like data ONLY. Never contains or uploads owner ZIP/MP3.
// The pinned owner hash is replaced in the runner checkout for this isolated test
// AFTER the unmodified host package has been verified; original source is restored.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto');
const {spawn,spawnSync}=require('node:child_process');
const {chromium}=require('../../cms/editor/node_modules/playwright-core');
const root=path.resolve(__dirname,'../..');
assert.equal(process.env.CI,'true','Only permitted inside a disposable CI runner');
assert.equal(process.env.GITHUB_ACTIONS,'true','Refuse operator workstation or hosted server');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chromium required');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'celikom-studio-ui-ci-'));
const archive=Buffer.from('CI fixture, not the CELIKOM owner website; do not publish.');
const dummyHash=hash(archive);
const sourceDir=path.join(scratch,'source');
const privateDir=path.join(scratch,'private');
const phpFile=path.join(root,'stage3/server/CelikomSource.php');
const phpOriginal=fs.readFileSync(phpFile,'utf8');
fs.mkdirSync(sourceDir,{mode:0o700});
fs.mkdirSync(privateDir,{mode:0o700});
const publicRoot=fs.realpathSync(path.join(root,'stage3/server/public'));
const env={...process.env,CI:'true',
  STAGE3_DSN:'sqlite:'+path.join(scratch,'cms.sqlite'),
  STAGE3_OWNER_USER:'testowner',STAGE3_OWNER_PASSWORD:'CI-only-password-123456',
  STAGE3_FORM_SECRET:'CI-only-form-secret-with-minimum-32-characters',
  STAGE3_PRIVATE_DIR:privateDir,STAGE3_PUBLIC_ROOT:publicRoot,
  STAGE3_CELIKOM_SOURCE_DIR:sourceDir,
  STAGE3_MAIL_FROM:'',STAGE3_TELEGRAM_BOT_TOKEN:''};
let php=null,browser=null;
function prepareSyntheticSource(){
  const meta={},fields={};
  const keys=['seo.title','faq.test-01.question'];
  for(let i=2;i<=98;i++)keys.push('faq.test-'+String(i).padStart(2,'0')+'.question');
  assert.equal(keys.length,99);
  let html='<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>CI private fixture</title><style>body{font-family:system-ui;margin:30px}h1{color:#0b1013}</style></head><body><h1>{{CELIKOM:seo.title}}</h1><section id="faq"><h2>FAQ</h2>';
  for(const key of keys.slice(1))html+='<p data-key="'+key+'">{{CELIKOM:'+key+'}}</p>';
  html+='</section></body></html>';
  for(const key of keys){meta[key]={max:3000};fields[key]=key==='seo.title'?'CELIKOM CI initial title':'CI initial '+key;}
  const manifest={format:'manufact-celikom-preserved-source-v1',
    source_zip_sha256:dummyHash,template_sha256:hash(Buffer.from(html)),
    fields:meta,assets:{}};
  const state={format:manifest.format,revision:1,revisions:{'1':fields},releases:{}};
  fs.writeFileSync(path.join(sourceDir,'source-archive.zip'),archive);
  fs.writeFileSync(path.join(sourceDir,'template.html'),html);
  fs.writeFileSync(path.join(sourceDir,'manifest.json'),JSON.stringify(manifest));
  fs.writeFileSync(path.join(sourceDir,'state.json'),JSON.stringify(state));
  fs.writeFileSync(path.join(sourceDir,'state.lock'),'');
  const before="public const SOURCE_SHA256 = 'f998e96ccc9393dfe958a51d144be10d5fb1f1d068721d163ff40048077104aa';";
  assert.ok(phpOriginal.includes(before),'Owner SHA pin unexpectedly changed');
  const changed=phpOriginal.replace(before,"public const SOURCE_SHA256 = '"+dummyHash+"';");
  // CI-only substitution; never commit modified runtime and never package this file.
  fs.writeFileSync(phpFile,changed);
}
async function port(){
  const socket=net.createServer();
  await new Promise((yes,no)=>socket.once('error',no).listen(0,'127.0.0.1',yes));
  const port=socket.address().port;
  await new Promise(yes=>socket.close(yes));
  return port;
}
async function launch(){
  prepareSyntheticSource();
  const setup=spawnSync('php',['stage3/server/bin/setup.php'],{cwd:root,env,encoding:'utf8'});
  assert.equal(setup.status,0,'Disposable SQLite setup: '+setup.stderr);
  const addr='127.0.0.1:'+(await port());
  env.STAGE3_CMS_HOST=addr;
  env.STAGE3_CELIKOM_PUBLIC_HOST='isolated-public.example.invalid';
  php=spawn('php',['-S',addr,'-t','stage3/server/public','stage3/server/public/index.php'],{
    cwd:root,env,stdio:['ignore','ignore','pipe']});
  let err='';php.stderr.on('data',d=>{err+=String(d)});
  const origin='http://'+addr;
  for(let i=0;i<100;i++){
    if(php.exitCode!==null)throw Error('PHP exited: '+err.slice(-2000));
    try{const r=await fetch(origin+'/api/session');if(r.ok)return origin;}catch(_){}
    await new Promise(r=>setTimeout(r,80));
  }
  throw Error('PHP not ready '+err.slice(-2000));
}
async function go(){
  const origin=await launch();
  browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/studio');
  await page.locator('#server-login:not([hidden])').waitFor({timeout:15000});
  assert.equal((await page.request.get(origin+'/api/celikom-original')).status(),401);
  await page.locator('#server-username').fill(env.STAGE3_OWNER_USER);
  await page.locator('#server-password').fill(env.STAGE3_OWNER_PASSWORD);
  await page.locator('#server-signin').click();
  await page.locator('#server-login').waitFor({state:'hidden'});
  const home=page.getByRole('button',{name:'Открыть оригинал CELIKOM'});
  await home.waitFor({timeout:15000});
  await home.click();
  const panel=page.locator('#celikom-original-dialog');
  await panel.waitFor({state:'visible'});
  await panel.locator('[data-celikom-key="seo.title"]').fill('CELIKOM CI NEW HEADING');
  const faqGroup=panel.locator('details.celikom-fields-group').filter({has:panel.locator('summary:text-matches("FAQ", "i")')});
  if(!(await faqGroup.evaluate(e=>e.open)))await faqGroup.locator('summary').click();
  await panel.locator('[data-celikom-key="faq.test-01.question"]').fill('CELIKOM CI NEW FAQ');
  await panel.getByRole('button',{name:'Предпросмотр'}).click();
  const frame=panel.locator('iframe');
  await frame.waitFor();
  await frame.contentFrame().locator('h1').getByText('CELIKOM CI NEW HEADING').waitFor();
  await panel.getByRole('button',{name:'Сохранить черновик'}).click();
  await panel.getByText(/Черновик сохранён как #2/).waitFor({timeout:12000});
  await page.reload();
  await page.locator('#server-login').waitFor({state:'hidden',timeout:15000});
  await page.getByRole('button',{name:'Открыть оригинал CELIKOM'}).click();
  await panel.waitFor({state:'visible'});
  assert.equal(await panel.locator('[data-celikom-key="seo.title"]').inputValue(),'CELIKOM CI NEW HEADING');
  assert.equal(await panel.locator('[data-celikom-key="faq.test-01.question"]').inputValue(),'CELIKOM CI NEW FAQ');
  page.once('dialog',dialog=>dialog.accept());
  await panel.getByRole('button',{name:'Опубликовать версию'}).click();
  await panel.getByText(/Создана версия v1/).waitFor();
  let snap=await page.evaluate(async()=>await (await fetch('/api/celikom-original')).json());
  assert.equal(snap.revision,2);
  assert.equal(snap.releases.length,1);
  assert.equal(snap.releases[0].version,1);
  await panel.locator('select[aria-label="Выбор ревизии"]').selectOption('1');
  page.once('dialog',dialog=>dialog.accept());
  await panel.getByRole('button',{name:'Вернуть черновик',exact:true}).click();
  await panel.getByText(/Восстановлен черновик #1/).waitFor();
  snap=await page.evaluate(async()=>await (await fetch('/api/celikom-original')).json());
  assert.equal(snap.revision,3);
  assert.equal(snap.fields['seo.title'],'CELIKOM CI initial title');
  assert.equal(snap.releases.length,1,'Restored draft cannot silently replace public release');
  page.once('dialog',dialog=>dialog.accept());
  await panel.getByRole('button',{name:'Опубликовать версию'}).click();
  await panel.getByText(/Создана версия v2/).waitFor();
  snap=await page.evaluate(async()=>await (await fetch('/api/celikom-original')).json());
  assert.equal(snap.releases.length,2);
  assert.equal(snap.releases[1].sourceRevision,3);
  assert.deepEqual(errors,[],'Browser JavaScript errors');
  console.log('PASS: REAL hosted Studio UI from My Sites, title+FAQ edits, preview, save, reload, publish v1, restore draft, publish rollback v2; disposable SQLite');
  await context.close();
}
go().catch(err=>{console.error(err.stack||err);process.exitCode=1}).finally(async()=>{
  if(browser)await browser.close().catch(()=>{});
  if(php){php.kill('SIGTERM');await new Promise(r=>setTimeout(r,120));if(php.exitCode===null)php.kill('SIGKILL')}
  fs.writeFileSync(phpFile,phpOriginal);
  fs.rmSync(scratch,{recursive:true,force:true});
});
