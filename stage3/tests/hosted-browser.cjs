'use strict';
// Genuine Chromium end-to-end: PHP session -> server Studio -> save -> publish.
// Disposable SQLite DB; loopback-only server; no Hostinger or external network.
const {chromium}=require('../../cms/editor/node_modules/playwright-core');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-studio-http-'));
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!chrome)throw Error('Chromium required for hosted Studio scenario');
const env={...process.env,STAGE3_DSN:'sqlite:'+path.join(temp,'site.sqlite'),
  STAGE3_OWNER_USER:'testowner',STAGE3_OWNER_PASSWORD:'CI-only-password-123456',
  STAGE3_FORM_SECRET:'CI-only-form-secret-with-minimum-32-characters'};
let php=null,browser=null;
async function pickPort(){
  const s=net.createServer();
  await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});
  const p=s.address().port;await new Promise(resolve=>s.close(resolve));return p;
}
async function start(){
  const setup=spawnSync('php',['stage3/server/bin/setup.php'],{cwd:root,env,encoding:'utf8'});
  assert.equal(setup.status,0,setup.stderr);
  const origin='http://127.0.0.1:'+(await pickPort());
  php=spawn('php',['-S',new URL(origin).host,'-t','stage3/server/public',
    'stage3/server/public/index.php'],{cwd:root,env,stdio:['ignore','ignore','pipe']});
  let err='';php.stderr.on('data',d=>{err+=d.toString();});
  for(let i=0;i<60;i++){
    if(php.exitCode!==null)throw Error('PHP exited: '+err.slice(-500));
    try{if((await fetch(origin+'/api/session')).ok)return origin;}catch(e){}
    await new Promise(resolve=>setTimeout(resolve,80));
  }
  throw Error('PHP server not ready: '+err.slice(-500));
}
async function execute(){
  const origin=await start();
  browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:1400,height:1000},acceptDownloads:true});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/studio');
  await page.locator('#server-login:not([hidden])').waitFor();
  assert.equal(await page.locator('.center:visible').count(),0,'No unauthenticated site preview');
  await page.locator('#server-username').fill('testowner');
  await page.locator('#server-password').fill(env.STAGE3_OWNER_PASSWORD);
  await page.locator('#server-signin').click();
  await page.locator('#server-login').waitFor({state:'hidden'});
  page.once('dialog',dialog=>dialog.accept('Промышленный каталог'));
  await page.locator('#new-site').click();
  await page.locator('#server-status').getByText(/Черновик #1/).waitFor();
  const siteId=await page.locator('#server-site-select').inputValue();
  assert.match(siteId,/^site-[a-z0-9]+$/);
  assert.equal(await page.locator('#pages .nav-entry').count(),2);
  const field=page.locator('#fields [data-field="content.text"]');
  await field.fill('Проверка серверного сайта');
  await field.dispatchEvent('change');
  assert.match(await page.locator('#dirty').innerText(),/несохранённые/);
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Черновик #2/).waitFor();
  assert.match(await page.locator('#dirty').innerText(),/сохранён на сервере/);
  const visitor=await ctx.newPage();
  const publicUrl=origin+'/published/'+siteId+'/';
  let pub=await visitor.goto(publicUrl);
  assert.equal(pub.status(),404,'New unpublished draft not visible to visitors');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(/Опубликовано: v1/).waitFor();
  pub=await visitor.goto(publicUrl);
  assert.equal(pub.status(),200);
  assert.equal(await visitor.locator('h1').innerText(),'Проверка серверного сайта');
  const input=page.locator('#fields [data-field="content.text"]');
  await input.fill('Не опубликованный третий черновик');
  await input.dispatchEvent('change');
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Черновик #3/).waitFor();
  await visitor.reload();
  assert.equal(await visitor.locator('h1').innerText(),'Проверка серверного сайта',
    'Draft writes must never publish automatically');
  // Restore an earlier revision into a NEW draft, leaving visitor unchanged.
  assert.equal(await page.locator('#versions .version').count(),3);
  const acceptDialogs=dialog=>dialog.accept();page.on('dialog',acceptDialogs);
  await page.locator('#versions .version').last().click();
  await page.locator('#server-status').getByText(/Черновик #4/).waitFor();
  await visitor.reload();
  assert.equal(await visitor.locator('h1').innerText(),'Проверка серверного сайта');
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(/Опубликовано: v2/).waitFor();
  await visitor.reload();
  assert.equal(await visitor.locator('h1').innerText(),'Оборудование для вашего производства');
  // Edit the real page tree from Studio and publish a second page.
  page.off('dialog',acceptDialogs);
  const replies=['Каталог решений','/solutions/','Оборудование','/equipment/','feature-highlights'];
  page.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?replies.shift():''));
  await page.locator('#page-add').click();
  assert.equal(await page.locator('#pages .nav-entry').count(),3);
  await page.locator('#page-rename').click();
  assert.equal(await page.locator('#pages .nav-entry').nth(2).innerText(),'Оборудование');
  await page.locator('#section-add').click();
  assert.equal(await page.locator('#sections .nav-entry').count(),2);
  await page.locator('#section-up').click();
  assert.match(await page.locator('#sections .nav-entry').first().innerText(),/Преимущества/);
  // Deleted section can be recovered with the same undo stack as field edits.
  await page.locator('#section-remove').click();
  assert.equal(await page.locator('#sections .nav-entry').count(),1);
  await page.locator('#undo').click();
  assert.equal(await page.locator('#sections .nav-entry').count(),2);
  await page.locator('#page-up').click();
  assert.equal(await page.locator('#pages .nav-entry').nth(1).innerText(),'Оборудование');
  assert.match(await page.locator('#dirty').innerText(),/несохранённые/);
  assert.equal((await visitor.goto(origin+'/published/'+siteId+'/equipment/')).status(),404);
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Черновик #5/).waitFor();
  assert.equal((await visitor.goto(origin+'/published/'+siteId+'/equipment/')).status(),404,
    'Structure save is not a publish');
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(/Опубликовано: v3/).waitFor();
  const newPage=await visitor.goto(origin+'/published/'+siteId+'/equipment/');
  assert.equal(newPage.status(),200);
  assert.equal(await visitor.locator('h1').innerText(),'Оборудование для вашего производства');
  assert.equal((await visitor.goto(origin+'/published/'+siteId+'/solutions/')).status(),404);
  // Site metadata and session persist across page refresh.
  await page.reload();
  await page.locator('#server-status').getByText(/Черновик #5/).waitFor();
  assert.equal(await page.locator('#server-site-select').inputValue(),siteId);
  // Server media upload -> reusable asset -> image component -> explicit publish.
  await page.locator('#pages .nav-entry').first().click();
  replies.push('image-showcase');
  await page.locator('#section-add').click();
  assert.equal(await page.locator('#sections .nav-entry').count(),3);
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Черновик #6/).waitFor();
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y6Pe3UAAAAASUVORK5CYII=','base64');
  replies.push('Фото цеха');
  await page.locator('#server-media-file').setInputFiles({
    name:'factory.png',mimeType:'image/png',buffer:png
  });
  await page.locator('#server-status').getByText(/Черновик #7/).waitFor();
  const assetId=(await page.evaluate(()=>window.Stage3Editor.getSite())).assets[0].id;
  assert.equal(await page.locator('#server-media-list img').count(),1);
  const componentState=await page.evaluate(()=>({pages:window.Stage3Editor.getSite().pages.map(p=>({id:p.id,sections:p.sections.map(s=>s.component)})),assets:window.Stage3Editor.getSite().assets.length}));
  console.log('HOSTED MEDIA SELECTION STATE',JSON.stringify(componentState));
  await page.locator('#sections .nav-entry').filter({hasText:'Изображение и описание'}).click();
  await page.locator('#elements .element').filter({hasText:'Фотография'}).click();
  const editablePaths=await page.locator('#fields [data-field]').evaluateAll(nodes=>nodes.map(n=>n.dataset.field));
  assert.ok(editablePaths.includes('content.media'),'Expected image field, saw: '+JSON.stringify(editablePaths));
  await page.locator('#fields [data-field="content.media"]').selectOption(assetId);
  const imagePreview=page.frameLocator('#preview').locator('img.showcase-preview');
  await imagePreview.waitFor({state:'attached'});
  assert.match(await imagePreview.getAttribute('src'),/^data:image\/png;base64,/);

  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Черновик #8/).waitFor();
  assert.equal((await visitor.goto(origin+'/published/'+siteId+'/assets/'+assetId+'.png')).status(),404);
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(/Опубликовано: v4/).waitFor();
  assert.equal((await visitor.goto(origin+'/published/'+siteId+'/assets/'+assetId+'.png')).status(),200);
  await visitor.goto(origin+'/published/'+siteId+'/');
  assert.equal(await visitor.locator('img.showcase-photo').count(),1);
  assert.equal(await visitor.locator('img.showcase-photo').getAttribute('alt'),'Фото цеха');
  // A complete visitor form -> CMS inbox -> review cycle in real Chromium.
  replies.push('lead-form');
  await page.locator('#section-add').click();
  assert.equal(await page.locator('#sections .nav-entry').filter({hasText:'Форма заявки'}).count(),1);
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Черновик #9/).waitFor();
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(/Опубликовано: v5/).waitFor();
  await visitor.goto(origin+'/published/'+siteId+'/');
  await visitor.locator('form.lead-form input[name="name"]').fill('Алексей Тест');
  await visitor.locator('form.lead-form input[name="email"]').fill('lead@example.test');
  await visitor.locator('form.lead-form textarea[name="message"]').fill('Нужен расчёт стоимости оборудования');
  await visitor.locator('form.lead-form input[name="consent"]').check();
  await Promise.all([visitor.waitForNavigation(),visitor.locator('form.lead-form button[type="submit"]').click()]);
  assert.match(await visitor.locator('main').innerText(),/заявка сохранена/);
  await page.locator('#server-submissions-refresh').click();
  await page.locator('#server-submission-heading').getByText(/Заявки сайта · 1/).waitFor();
  assert.match(await page.locator('#server-submissions .hosted-lead').innerText(),/Алексей Тест/);
  await page.locator('#server-submissions .hosted-lead button').click();
  await page.locator('#server-submissions .hosted-lead small').getByText(/reviewed/).waitFor();
  await page.locator('#server-notifications-count').getByText(/Непросмотренные заявки: 1/).waitFor();
  await page.locator('#server-notifications-seen').click();
  await page.locator('#server-notifications-count').getByText(/Непросмотренные заявки: 0/).waitFor();
  // Real Studio reusable section library: save persisted snapshot, apply locally
  // with fresh stable IDs, Undo, and verify that nothing publishes implicitly.
  replies.push('Повторяемая форма');
  await page.locator('#server-template-save').click();
  await page.locator('#server-template-list .hosted-template').first().waitFor();
  assert.equal(await page.locator('#server-template-list .hosted-template').count(),1);
  const beforeSections=await page.locator('#sections .nav-entry').count();
  await page.locator('#server-template-list .hosted-template button').first().click();
  assert.equal(await page.locator('#sections .nav-entry').count(),beforeSections+1);
  assert.match(await page.locator('#dirty').innerText(),/несохранённые/);
  await page.locator('#undo').click();
  assert.equal(await page.locator('#sections .nav-entry').count(),beforeSections);
  assert.match(await page.locator('#dirty').innerText(),/сохранён на сервере/);
  await page.locator('#server-template-refresh').click();
  await page.locator('#server-template-list .hosted-template').first().waitFor();
  assert.equal(await page.locator('#server-template-list .hosted-template').count(),1);
  await page.locator('#server-template-list .hosted-template button').nth(1).click();
  await page.locator('#server-template-list .hosted-template').first().waitFor({state:'detached'});
  assert.equal(await page.locator('#server-template-list .hosted-template').count(),0);
  assert.equal((await visitor.goto(origin+'/published/'+siteId+'/')).status(),200);
  const tokenless=await ctx.request.post(origin+'/api/sites/'+siteId+'/save',
    {data:{site:{},expectedRevision:9}});
  assert.equal(tokenless.status(),403,'CSRF still enforced with browser credentials');
  const link=page.locator('#server-public-link');
  assert.equal(await link.getAttribute('href'),'/published/'+siteId+'/');
  await page.locator('#server-logout').click();
  await page.locator('#server-login:not([hidden])').waitFor();
  assert.equal((await visitor.goto(publicUrl)).status(),200,'Visitor never requires CMS login');
  assert.deepEqual(errors,[],'No unhandled browser script exceptions');
  console.log('STAGE3 HOSTED CHROMIUM E2E PASS: login, new site, editor, save, revisions, restore, publish isolation, viewer, logout');
}
execute().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();
  if(php&&php.exitCode===null){
    const stopped=new Promise(resolve=>php.once('exit',resolve));
    php.kill('SIGTERM');
    await Promise.race([stopped,new Promise(resolve=>setTimeout(resolve,1500))]);
  }
  fs.rmSync(temp,{recursive:true,force:true});
});
