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
  STAGE3_FORM_SECRET:'CI-only-form-secret-with-minimum-32-characters',
  STAGE3_MAIL_FROM:'',STAGE3_TELEGRAM_BOT_TOKEN:''};
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

  // Hosted Studio: unsaved workspace content is preview-only and undoable.
  await page.locator('#cms-content-open').click();
  await page.locator('#cms-content-search').fill('Проверка серверного');
  await page.locator('#cms-content-replace').fill('Контент редактора');
  assert.equal(await page.locator('#cms-content-results .cms-content-row').count(),1);
  await page.locator('#cms-content-apply').click();
  assert.equal(await page.frameLocator('#preview').locator('h1').innerText(),'Контент редактора сайта');
  await page.locator('#undo').click();
  assert.equal(await page.frameLocator('#preview').locator('h1').innerText(),'Проверка серверного сайта');

  // Hosted site-map preview and cross-page copy are Undoable before server Save.
  await page.locator('#cms-site-map-open').click();
  await page.locator('#cms-site-map-dialog[open]').waitFor();
  await page.locator('[data-map-page]').first().locator('[data-map-section]').first()
    .locator('.cms-map-target').selectOption('page-contact');
  await page.locator('[data-map-page]').first().locator('[data-map-section]').first()
    .getByRole('button',{name:'Копировать'}).click();
  assert.equal(await page.locator('[data-map-page="page-contact"] [data-map-section]').count(),2);
  await page.locator('#cms-map-apply').click();
  assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages[1].sections.length,2);
  await page.locator('#undo').click();
  assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages[1].sections.length,1);

  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Черновик #2/).waitFor();
  assert.match(await page.locator('#dirty').innerText(),/сохранён на сервере/);
  const visitor=await ctx.newPage();
  const publicUrl=origin+'/published/'+siteId+'/';
  let pub=await visitor.goto(publicUrl);
  assert.equal(pub.status(),404,'New unpublished draft not visible to visitors');
  await page.locator('#cms-open-page-preview').click();
  await page.locator('#cms-page-preview[open]').waitFor();
  const draftFrame=page.frameLocator('#cms-page-preview-frame');
  await draftFrame.locator('h1').waitFor();
  assert.equal(await draftFrame.locator('h1').innerText(),'Проверка серверного сайта',
    'Hosted Studio previews the draft through the publication renderer');
  assert.equal(await draftFrame.locator('meta[name="robots"]').getAttribute('content'),'noindex,nofollow');
  await draftFrame.locator('section.hero h1').click();
  assert.equal(await page.locator('#cms-work-element').inputValue(),'section-hero-heading',
    'PHP renderer maps visual headline to exact typed control');
  const visualDraftField=page.locator('#cms-work-fields [data-page-field="content.text"]');
  await visualDraftField.fill('Редактирование страницы в Studio');
  await visualDraftField.dispatchEvent('change');
  await draftFrame.locator('h1').getByText('Редактирование страницы в Studio').waitFor();
  await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
  assert.equal(await draftFrame.locator('h1').innerText(),'Проверка серверного сайта');
  const oldSummary=await draftFrame.locator('section.hero p').first().innerText();
  await draftFrame.locator('section.hero p').first().dblclick();
  assert.equal(await page.locator('#cms-work-element').inputValue(),'section-hero-summary');
  await page.locator('#cms-work-quick-input').fill('Текст через визуальный редактор PHP');
  await page.locator('#cms-work-quick-save').click();
  await draftFrame.locator('section.hero p').getByText('Текст через визуальный редактор PHP').waitFor();
  await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
  assert.equal(await draftFrame.locator('section.hero p').first().innerText(),oldSummary,
    'Undo must restore the actual server-saved description');
  const startingPreviewSite=await page.evaluate(()=>window.Stage3Editor.getSite());
  await page.locator('.cms-work-appearance > summary').click();
  await page.locator('#cms-work-fields [data-work-appearance="surface"]').selectOption('dark');
  await draftFrame.locator('.cms-section-skin.cms-surface-dark').waitFor();
  assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages[0].sections[0].appearance.surface,'dark');
  await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
  assert.deepEqual(await page.evaluate(()=>window.Stage3Editor.getSite()),startingPreviewSite,
    'Quick appearance lives only in typed draft until explicitly saved');

  await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();
  await page.locator('#cms-page-preview[open]').waitFor({state:'hidden'});
  assert.equal((await visitor.goto(publicUrl)).status(),404,'Preview remains non-public');
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
  const renamedRoute=await fetch(origin+'/published/'+siteId+'/solutions/',{redirect:'manual'});
  assert.deepEqual({status:renamedRoute.status,location:renamedRoute.headers.get('location')},
    {status:301,location:'/published/'+siteId+'/equipment/'},
    'Old page URL now redirects permanently after explicit publication');
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
  await page.locator('#cms-open-seo').click();
  await page.locator('#cms-setting-seo-og-image').selectOption(assetId);
  await page.waitForFunction(()=>{
    const image=document.querySelector('#cms-seo-social-image');
    return image&&!image.hidden&&image.src.startsWith('data:image/png;base64,');
  });
  assert.equal(await page.locator('#cms-seo-social-image').getAttribute('alt'),'Фото цеха');
  await page.locator('#cms-settings-close').click();
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

  // The actual PHP-rendered photo selects its media field, and replacing it
  // in the visual picker remains an Undoable private draft change.
  await page.locator('#cms-open-page-preview').click();
  const imageCanvas=page.frameLocator('#cms-page-preview-frame');
  await imageCanvas.locator('section.showcase img.showcase-photo').click();
  assert.equal(await page.locator('#cms-work-element').inputValue(),
    (await page.evaluate(()=>window.Stage3Editor.getSite())).pages[0].sections
      .find(s=>s.component==='image-showcase').elements.find(e=>e.slot==='photo').id);
  await page.locator('#cms-work-media > summary').click();
  assert.equal(await page.locator('#cms-work-media [data-media-id="'+assetId+'"]').getAttribute('aria-pressed'),'true');
  await page.locator('#cms-work-media [data-media-id=""]').click();
  assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages[0].sections
    .find(s=>s.component==='image-showcase').elements.find(e=>e.slot==='photo')
    .values['content.media'],'','Visual media picker modifies the private draft only');
  await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
  assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages[0].sections
    .find(s=>s.component==='image-showcase').elements.find(e=>e.slot==='photo')
    .values['content.media'],assetId,'Undo restores selected media in draft');
  await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();

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
  // Operators can filter/search and download private CSV without publication.
  await page.locator('#server-inbox-status').selectOption('new');
  await page.locator('#server-submissions').getByText('По фильтру заявок нет.').waitFor();
  await page.locator('#server-inbox-status').selectOption('reviewed');
  await page.locator('#server-submissions .hosted-lead').getByText(/Алексей Тест/).waitFor();
  await page.locator('#server-inbox-search').fill('not-a-customer');
  await page.locator('#server-inbox-find').click();
  await page.locator('#server-submissions').getByText('По фильтру заявок нет.').waitFor();
  await page.locator('#server-inbox-search').fill('lead@example.test');
  await page.locator('#server-inbox-find').click();
  await page.locator('#server-submissions .hosted-lead').getByText(/Алексей Тест/).waitFor();
  const csvDownloadPromise=page.waitForEvent('download');
  await page.locator('#server-inbox-export').click();
  const csvDownload=await csvDownloadPromise;
  assert.match(csvDownload.suggestedFilename(),/-submissions\.csv$/);
  const csvBytes=fs.readFileSync(await csvDownload.path(),'utf8');
  assert.match(csvBytes,/lead@example.test/);

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
  // One browser recovery workflow, using a real downloaded private archive.
  replies.push('Шаблон для восстановления');
  await page.locator('#server-template-save').click();
  await page.locator('#server-template-list .hosted-template').first().waitFor();
  const downloaded=page.waitForEvent('download');
  await page.locator('#server-backup-download').click();
  const backup=await downloaded,backupPath=path.join(temp,'site-backup.json');
  await backup.saveAs(backupPath);
  const recoveryDoc=JSON.parse(fs.readFileSync(backupPath,'utf8'));
  assert.equal(recoveryDoc.payload.media.length,1);
  assert.equal(recoveryDoc.payload.submissions.length,1);
  assert.equal(recoveryDoc.payload.templates.length,1);
  await page.locator('#server-backup-open').click();
  await page.locator('#server-backup-file').setInputFiles(backupPath);
  const recoveryId='site-recovered-browser';
  await page.locator('#server-backup-target').fill(recoveryId);
  await page.locator('#server-backup-plan').click();
  await page.locator('#server-backup-summary').getByText(/Будет создан новый сайт/).waitFor();
  assert.equal((await visitor.goto(origin+'/published/'+recoveryId+'/')).status(),404);
  assert.equal(await page.locator('#server-backup-restore').isDisabled(),false);
  // Changing the destination invalidates a preview and requires a fresh plan.
  await page.locator('#server-backup-target').fill(recoveryId+'-changed');
  assert.equal(await page.locator('#server-backup-restore').isDisabled(),true);
  await page.locator('#server-backup-target').fill(recoveryId);
  await page.locator('#server-backup-plan').click();
  await page.locator('#server-backup-restore').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.getElementById('server-backup-restore').disabled);
  await page.locator('#server-backup-restore').click();
  await page.locator('#server-backup-dialog').waitFor({state:'hidden'});
  await page.locator('#server-status').getByText(/Черновик #9/).waitFor();
  assert.equal(await page.locator('#server-site-select').inputValue(),recoveryId);
  await page.locator('#server-submission-heading').getByText(/Заявки сайта · 1/).waitFor();
  await page.locator('#server-media-list img').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#server-media-list img').count(),1);
  assert.equal(await page.locator('#server-template-list .hosted-template').count(),1);
  assert.equal(await page.locator('#versions .version').count(),9);
  assert.equal(await page.locator('#server-releases .hosted-release').count(),5);
  assert.equal((await visitor.goto(origin+'/published/'+recoveryId+'/')).status(),404);
  // Restore a publication containing the photo/form as a new draft; activate explicitly.
  await page.locator('#server-releases .hosted-release button').first().click();
  await page.locator('#server-status').getByText(/Черновик #10/).waitFor();
  assert.equal((await visitor.goto(origin+'/published/'+recoveryId+'/')).status(),404);
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(/Опубликовано: v6/).waitFor();
  await visitor.goto(origin+'/published/'+recoveryId+'/');
  assert.equal(await visitor.locator('img.showcase-photo').getAttribute('alt'),'Фото цеха');
  assert.equal(await visitor.locator('form.lead-form').count(),1);
  assert.equal((await visitor.goto(origin+'/published/'+siteId+'/')).status(),200,'Original publication intact');
  // One full recipe path: brief -> editable structure -> inert multipage
  // preview -> persisted draft -> edits/publish -> template reuse + Undo.
  await page.locator('#compose-site').click();
  await page.locator('#compose-title').fill('Рецепт компании');
  await page.locator('#compose-task').fill('Многостраничный сайт компании с формой');
  await page.locator('#compose-headline').fill('Заголовок из задания');
  await page.locator('#compose-description').fill('Только подтверждённое описание');
  await page.locator('#compose-offerings').fill('Первая услуга\nВторая услуга\nТретья услуга');
  await page.locator('#compose-details').fill('Подтверждённый факт');
  await page.locator('#compose-generate').click();
  await page.locator('#compose-review:not([hidden])').waitFor();
  assert.equal(await page.locator('#compose-page option').count(),4);
  await page.frameLocator('#compose-preview').locator('h1').getByText('Заголовок из задания',{exact:true}).waitFor();
  const pathInput=page.locator('#compose-plan .compose-page-plan').nth(1).locator('input').nth(1);
  await pathInput.fill('/');
  assert.equal(await page.locator('#compose-apply').isDisabled(),true);
  await page.locator('#compose-refresh').click();
  assert.match(await page.locator('#compose-error').innerText(),/path/);
  await pathInput.fill('/offerings/');
  await page.locator('#compose-refresh').click();
  await page.locator('#compose-apply').click();
  await page.locator('#composer').waitFor({state:'hidden'});
  await page.locator('#server-status').getByText(/Черновик #1/).waitFor();
  const generatedId=await page.locator('#server-site-select').inputValue();
  assert.notEqual(generatedId,siteId);
  assert.equal(await page.locator('#pages .nav-entry').count(),4);
  assert.equal((await visitor.goto(origin+'/published/'+generatedId+'/')).status(),404);
  await page.locator('#fields [data-field="content.text"]').fill('Ручная правка созданного сайта');
  await page.locator('#fields [data-field="content.text"]').dispatchEvent('change');
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Черновик #2/).waitFor();
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(/Опубликовано: v1/).waitFor();
  assert.equal((await visitor.goto(origin+'/published/'+generatedId+'/offerings/')).status(),200);
  assert.match(await visitor.locator('main').innerText(),/Третья услуга/);
  await page.reload();
  await page.locator('#server-site-select').selectOption(generatedId);
  await page.locator('#server-open').click();
  await page.locator('#server-status').getByText(/Черновик #2/).waitFor();
  assert.equal(await page.locator('#fields [data-field="content.text"]').inputValue(),'Ручная правка созданного сайта');
  replies.push('Главный экран из рецепта');
  await page.locator('#server-template-save').click();
  await page.locator('#server-template-list .hosted-template').first().waitFor();
  await page.locator('#compose-site').click();
  await page.locator('#compose-title').fill('Пересобранная компания');
  await page.locator('#compose-current').check();
  await page.locator('#compose-generate').click();
  await page.locator('#compose-review:not([hidden])').waitFor();
  const templatePicker=page.locator('#compose-plan [aria-label="Шаблон блока"]').first();
  await templatePicker.selectOption({label:'Главный экран из рецепта'});
  await page.locator('#compose-refresh').click();
  await page.frameLocator('#compose-preview').locator('h1').getByText('Ручная правка созданного сайта',{exact:true}).waitFor();
  await page.locator('#compose-apply').click();
  await page.locator('#composer').waitFor({state:'hidden'});
  assert.match(await page.locator('#dirty').innerText(),/несохранённые/);
  await page.locator('#undo').click();
  assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).title,'Рецепт компании');
  await page.locator('#redo').click();
  assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).title,'Пересобранная компания');
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Черновик #3/).waitFor();
  await visitor.goto(origin+'/published/'+generatedId+'/');
  assert.match(await visitor.title(),/Рецепт компании/,'Composition save never auto-publishes');
  // Genuine UI: owner sets renewal date then manually pauses/resumes CMS.
  await page.locator('#server-licenses-open').click();
  await page.locator('#server-licenses-dialog').waitFor({state:'visible'});
  await page.locator('#server-license-site').selectOption(generatedId);
  await page.locator('#server-license-type').selectOption('subscription');
  await page.locator('#server-license-date').fill(new Date().toISOString().slice(0,10));
  await page.locator('#server-license-domain').fill('client.example');
  await page.locator('#server-license-reason').fill('Ручная проверка подписки');
  await page.locator('#server-license-save').click();
  await page.locator('#server-license-status').getByText(/Сегодня/).waitFor();
  await page.locator('#server-license-reason').fill('Ручная пауза редактирования');
  await page.locator('#server-license-pause').click();
  await page.locator('#server-license-status').getByText(/CMS приостановлена/).waitFor();
  assert.equal(await page.locator('#server-publish').isDisabled(),true);
  assert.equal(await page.locator('#fields').evaluate(el=>el.inert),true);
  assert.equal(await page.evaluate(async id=>{
    try{await window.Stage3Host.api('/api/sites/'+id+'/publish','POST',{expectedRevision:3});return false;}
    catch(e){return e.status===409;}
  },generatedId),true,'Direct CMS write bypass must also be blocked');
  assert.equal((await visitor.goto(origin+'/published/'+generatedId+'/')).status(),200,'Public site survives pause');
  await page.locator('#server-license-reason').fill('Оператор подтвердил продолжение');
  await page.locator('#server-license-resume').click();
  await page.locator('#server-license-status').getByText(/CMS активна/).waitFor();
  assert.equal(await page.locator('#fields').evaluate(el=>el.inert),false);
  await page.locator('#server-license-close').click();
  // Owner configures per-site lead delivery without exposing provider secrets.
  await page.locator('#server-delivery-email-enabled').check();
  await page.locator('#server-delivery-email-recipient').fill('leads@example.test');
  await page.locator('#server-delivery-telegram-enabled').check();
  await page.locator('#server-delivery-telegram-chat').fill('-1001234567890');
  await page.locator('#server-delivery-reason').fill('Настройка каналов уведомлений');
  await page.locator('#server-delivery-save').click();
  const deliveryRows=page.locator('#server-delivery-status .hosted-delivery-channel');
  await deliveryRows.filter({hasText:/Email · Требуется настройка/}).waitFor();
  await deliveryRows.filter({hasText:/Telegram · Требуется настройка/}).waitFor();
  assert.match(await page.locator('#server-delivery-status').innerText(),/STAGE3_MAIL_FROM/);
  assert.match(await page.locator('#server-delivery-status').innerText(),/STAGE3_TELEGRAM_BOT_TOKEN/);
  assert.doesNotMatch(await page.locator('#server-delivery-status').innerText(),/bot\d+:/i,
    'Bot token is never exposed in Studio');
  await page.locator('#server-delivery-refresh').click();
  // Owner creates scoped staff in Studio; staff sees only its assigned site,
  // edits without publish, then loses the session after owner revokes access.
  await page.locator('#server-users-open').click();
  await page.locator('#server-users-dialog').waitFor({state:'visible'});
  await page.locator('#server-user-name').fill('browserstaff');
  await page.locator('#server-user-initial-password').fill('browser-only-staff-password-123456');
  await page.locator('#server-user-role').selectOption('editor');
  await page.locator('#server-user-sites').selectOption(generatedId);
  await page.locator('#server-user-reason').fill('Редактирование назначенного сайта');
  const createStaff=page.waitForResponse(r=>r.url()===origin+'/api/users'&&r.request().method()==='POST');
  await page.locator('#server-user-save').click();
  assert.equal((await createStaff).status(),201);
  await page.locator('#server-user-select option[value="browserstaff"]').waitFor({state:'attached'});
  await page.locator('#server-users-close').click();
  const staffCtx=await browser.newContext({viewport:{width:1400,height:1000}}),staff=await staffCtx.newPage();
  staff.on('pageerror',e=>errors.push(e.message));
  await staff.goto(origin+'/studio');
  await staff.locator('#server-username').fill('browserstaff');
  await staff.locator('#server-password').fill('browser-only-staff-password-123456');
  await staff.locator('#server-signin').click();
  await staff.locator('#server-status').getByText(/Черновик #3/).waitFor();
  assert.equal(await staff.locator('#server-site-select option').count(),1);
  assert.equal(await staff.locator('#server-site-select').inputValue(),generatedId);
  assert.equal(await staff.locator('#server-publish').isDisabled(),true);
  assert.equal(await staff.locator('#server-users-open').isVisible(),false);
  await staff.locator('#fields [data-field="content.text"]').fill('Правка сотрудника');
  await staff.locator('#fields [data-field="content.text"]').dispatchEvent('change');
  await staff.locator('#save').click();
  await staff.locator('#server-status').getByText(/Черновик #4/).waitFor();
  await visitor.goto(origin+'/published/'+generatedId+'/');
  assert.equal(await visitor.locator('h1').innerText(),'Ручная правка созданного сайта','Editor save never publishes');
  await page.locator('#server-users-open').click();
  await page.locator('#server-users-dialog').waitFor({state:'visible'});
  await page.locator('#server-user-select').selectOption('browserstaff');
  await page.locator('#server-user-role').selectOption('viewer');
  await page.locator('#server-user-reason').fill('Только просмотр после проверки');
  const reduceAccess=page.waitForResponse(r=>r.url().endsWith('/api/users/browserstaff')&&r.request().method()==='POST');
  await page.locator('#server-user-save').click();assert.equal((await reduceAccess).status(),200);
  await page.locator('#server-users-close').click();
  await staff.locator('#server-reload').click();
  await staff.locator('#server-login:not([hidden])').waitFor();
  await staff.locator('#server-password').fill('browser-only-staff-password-123456');
  await staff.locator('#server-signin').click();
  await staff.locator('#server-status').getByText(/Черновик #4/).waitFor();
  assert.equal(await staff.locator('#fields').evaluate(n=>n.inert),true);
  assert.equal(await staff.locator('#save').isDisabled(),true);
  assert.equal(await staff.locator('.hosted-leads').isVisible(),false);
  await page.locator('#server-audit-open').click();
  await page.locator('#server-audit-dialog').waitFor({state:'visible'});
  await page.locator('#server-audit-events .hosted-audit-event').filter({hasText:'browserstaff'}).first().waitFor();
  assert.ok(!((await page.locator('#server-audit-events').innerText()).includes('browser-only-staff-password-123456')));
  await page.locator('#server-audit-close').click();

  // Full hosted Studio -> server draft -> explicit publish path for styles/SEO/menu.
  await page.locator('#server-reload').click();
  await page.locator('#server-status').getByText(/Черновик #4/).waitFor();
  await page.locator('#cms-open-theme').click();
  await page.locator('#cms-setting-background').fill('#101b2a');
  await page.locator('#cms-setting-primary').fill('#ff6600');
  await page.locator('#cms-setting-font').selectOption('georgia');
  await page.locator('#cms-setting-maxWidth').fill('980');
  await page.locator('#cms-setting-bodySize').fill('18');
  await page.locator('#cms-setting-lineHeight').selectOption('relaxed');
  await page.locator('#cms-setting-headingScale').selectOption('large');
  await page.locator('#cms-setting-buttonStyle').selectOption('outline');
  await page.locator('#cms-setting-buttonRadius').fill('12');
  await page.locator('#cms-setting-buttonText').fill('#ffffff');
  await page.locator('#cms-settings-apply').click();
  const globalTheme=await page.evaluate(()=>window.Stage3Editor.getSite().theme);
  assert.equal(globalTheme.primary,'#ff6600');
  assert.equal(globalTheme.bodySize,18);
  assert.equal(globalTheme.lineHeight,'relaxed');
  assert.equal(globalTheme.headingScale,'large');
  assert.equal(globalTheme.buttonStyle,'outline');
  assert.equal(globalTheme.buttonRadius,12);
  await page.locator('#undo').click();
  assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).theme,undefined);
  await page.locator('#redo').click();
  await page.evaluate(()=>{
    const site=window.Stage3Editor.getSite();
    const home=site.pages.find(p=>p.path==='/');
    const hero=home.sections.find(section=>section.component==='company-hero');
    hero.appearance={surface:'default',spacing:'normal',align:'left',...(hero.appearance||{}),button:'solid'};
    window.Stage3Editor.applyComposition(site);
  });
  await page.locator('#cms-open-seo').click();
  await page.locator('#cms-setting-seo-title').fill('Тест SEO каталога | MANUFACT');
  await page.locator('#cms-setting-seo-description').fill('Подтверждённое описание для поисковиков.');
  await page.locator('#cms-setting-seo-robots').selectOption('noindex');
  await page.locator('#cms-setting-nav-label').fill('Наш каталог');
  await page.locator('#cms-settings-apply').click();
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Черновик #5/).waitFor();
  await visitor.goto(origin+'/published/'+generatedId+'/');
  assert.notEqual(await visitor.title(),'Тест SEO каталога | MANUFACT','Draft SEO must not publish');
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(/Опубликовано: v2/).waitFor();
  await visitor.reload();
  assert.equal(await visitor.title(),'Тест SEO каталога | MANUFACT');
  assert.equal(await visitor.locator('meta[name=description]').getAttribute('content'),'Подтверждённое описание для поисковиков.');
  assert.equal(await visitor.locator('meta[name=robots]').getAttribute('content'),'noindex,follow');
  assert.equal(await visitor.locator('.cms-nav-desktop a[aria-current=page]').innerText(),'Наш каталог');
  assert.equal(await visitor.locator('.cms-mobile-menu a[aria-current=page]').count(),1,
    'Mobile navigation contains the same published active page');
  assert.equal(await visitor.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(16, 27, 42)');
  const bodyMetrics=await visitor.locator('body').evaluate(e=>({fontSize:getComputedStyle(e).fontSize,lineHeight:parseFloat(getComputedStyle(e).lineHeight)}));
  assert.equal(bodyMetrics.fontSize,'18px');assert.ok(Math.abs(bodyMetrics.lineHeight-32.4)<0.1,JSON.stringify(bodyMetrics));
  const actionStyles=await visitor.locator('.action').evaluateAll(els=>els.map(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,radius:getComputedStyle(e).borderRadius,section:e.closest('.cms-section-skin')?.className||''})));
  assert.ok(actionStyles.some(x=>x.background==='rgb(255, 102, 0)'&&x.color==='rgb(255, 255, 255)'&&x.section.includes('cms-button-solid')),JSON.stringify(actionStyles));
  assert.ok(actionStyles.some(x=>x.background==='rgba(0, 0, 0, 0)'&&x.color==='rgb(255, 102, 0)'),JSON.stringify(actionStyles));
  await page.locator('#cms-open-seo').click();
  await page.locator('#cms-setting-nav-hidden').check();
  await page.locator('#cms-settings-apply').click();
  await page.locator('#save').click();
  await page.locator('#server-publish').click();
  await visitor.reload();
  assert.equal(await visitor.locator('nav a').filter({hasText:'Наш каталог'}).count(),0);
  assert.equal((await visitor.goto(origin+'/published/'+generatedId+'/')).status(),200);

  // Reuse a real uploaded photo in a repeatable gallery via searchable catalog,
  // then publish it separately; the visitor page must contain the real image.
  await page.locator('#server-site-select').selectOption(siteId);
  await page.locator('#server-open').click();
  await page.locator('#server-status').getByText(/Черновик #/).waitFor();
  await page.locator('#pages .nav-entry').first().click();
  await page.locator('#section-catalog').click();
  await page.locator('#cms-component-search').fill('галерея');
  await page.locator('#cms-component-list [data-component="photo-gallery"]').click();
  await page.locator('#elements [data-repeat-id]').first().click();
  await page.locator('#fields [data-field="content.media"]').selectOption(assetId);
  await page.locator('#fields [data-field="content.caption"]').fill('Фото производства');
  await page.locator('#fields [data-field="content.caption"]').dispatchEvent('change');
  await page.frameLocator('#preview').locator('.cms-preview-grid img.showcase-preview').waitFor({state:'attached'});
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Без изменений/).waitFor();
  const versionBefore=Number((await page.locator('#server-status').innerText()).match(/Опубликовано: v(\d+)/)[1]);
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(new RegExp('Опубликовано: v'+(versionBefore+1)+'\\b')).waitFor();
  await visitor.goto(origin+'/published/'+siteId+'/');
  assert.equal(await visitor.locator('.gallery-grid img').count(),1);
  assert.equal(await visitor.locator('.gallery-grid img').first().getAttribute('alt'),'Фото цеха');

  // Full URL alias workflow: operator reviews site, saves and explicitly
  // publishes an alias. Public pages redirect with true 301, not draft.
  await page.locator('#cms-quality-open').click();
  await page.locator('#cms-redirect-from').fill('/old-gallery/');
  await page.locator('#cms-redirect-target').selectOption('/');
  await page.locator('#cms-redirect-form button[type=submit]').click();
  await page.locator('#cms-redirect-list code').getByText('/old-gallery/ → /').waitFor();
  await page.locator('#cms-site-report').getByRole('button',{name:'Закрыть'}).click();
  const draftRedirect=await page.evaluate(async id=>{
    const res=await fetch('/published/'+id+'/old-gallery/',{redirect:'manual'});
    return res.status;
  },siteId);
  assert.equal(draftRedirect,404,'Draft alias must remain invisible to visitors');
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Без изменений/).waitFor();
  assert.equal(await page.evaluate(async id=>(await fetch('/published/'+id+'/old-gallery/',{redirect:'manual'})).status,siteId),404);
  const priorVersion=Number((await page.locator('#server-status').innerText()).match(/Опубликовано: v(\d+)/)[1]);
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(new RegExp('Опубликовано: v'+(priorVersion+1)+'\\b')).waitFor();
  const publishedRedirect=await fetch(origin+'/published/'+siteId+'/old-gallery/',{redirect:'manual'});
  assert.deepEqual({status:publishedRedirect.status,location:publishedRedirect.headers.get('location')},
    {status:301,location:'/published/'+siteId+'/'});

  // Owner-facing media manager: alt edits stay draft-only until explicit publish.
  const mediaRow=()=>page.locator('#server-media-list [data-asset-id="'+assetId+'"]');
  replies.length=0; // No stale prompt replies from earlier editor acceptance flows.
  await page.locator('#server-media-search').fill('Фото цеха');
  assert.equal(await page.locator('#server-media-entries [data-asset-id]').count(),1);
  replies.push('Цех MANUFACT — оборудование');
  await mediaRow().locator('[data-media-action="rename"]').click();
  assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).assets[0].alt,
    'Цех MANUFACT — оборудование');
  assert.equal(await visitor.locator('.gallery-grid img').first().getAttribute('alt'),'Фото цеха',
    'Edited alt must not leak before publish');
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Без изменений/).waitFor();
  const altVersionBefore=Number((await page.locator('#server-status').innerText()).match(/Опубликовано: v(\d+)/)[1]);
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(new RegExp('Опубликовано: v'+(altVersionBefore+1)+'\\b')).waitFor();
  await visitor.reload();
  assert.equal(await visitor.locator('.gallery-grid img').first().getAttribute('alt'),
    'Цех MANUFACT — оборудование');

  // A second site-local binary can replace every reference in one operation.
  replies.push('Новая версия кадра');
  await page.locator('#server-media-file').setInputFiles({name:'new-picture.png',mimeType:'image/png',buffer:png});
  await page.locator('#server-media-entries [data-asset-id]').nth(1).waitFor();
  await page.waitForFunction(()=>!document.querySelector('#server-media-upload').disabled);
  const secondId=(await page.evaluate(()=>window.Stage3Editor.getSite())).assets[1].id;
  replies.push(secondId);
  await page.locator('#server-media-entries [data-asset-id="'+assetId+'"] [data-media-action="replace"]').click();
  assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages
    .flatMap(p=>p.sections).flatMap(s=>[...s.elements,...(s.items||[])])
    .filter(x=>x.values['content.media']===assetId).length,0);
  await page.waitForFunction(()=>!document.querySelector('#save').disabled);
  await page.locator('#server-media-entries [data-asset-id="'+assetId+'"] [data-media-action="detach"]').click();
  assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).assets.length,1);
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Без изменений/).waitFor();
  assert.equal(await visitor.locator('.gallery-grid img').first().getAttribute('alt'),
    'Цех MANUFACT — оборудование','Old published release must remain intact until publish');
  const replacementVersionBefore=Number((await page.locator('#server-status').innerText()).match(/Опубликовано: v(\d+)/)[1]);
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(new RegExp('Опубликовано: v'+(replacementVersionBefore+1)+'\\b')).waitFor();
  await visitor.reload();
  assert.equal(await visitor.locator('.gallery-grid img').first().getAttribute('alt'),'Новая версия кадра');
  // Integrated Workbench-to-CMS user journey. Original image bytes remain
  // client-only, the server receives a newly encoded WebP under its strict cap,
  // link is an Undo-able draft edit, and public bytes change only after publish.
  await page.locator('#pages .nav-entry').first().click();
  await page.locator('#sections .nav-entry').filter({hasText:'Изображение и описание'}).click();
  await page.locator('#elements .element').filter({hasText:'Фотография'}).click();
  const originalPublishedMedia=await visitor.locator('.gallery-grid img').first().getAttribute('src');
  const generated=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;
    const g=canvas.getContext('2d');
    g.fillStyle='#1351aa';g.fillRect(0,0,96,64);
    g.fillStyle='#eac028';g.fillRect(15,10,42,30);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const localOriginal=Buffer.from(generated,'base64');
  await page.locator('#server-media-process-open').click();
  await page.locator('#cms-media-processor').waitFor({state:'visible'});
  await page.locator('#cms-media-source').setInputFiles({
    name:'private-source.png',mimeType:'image/png',buffer:localOriginal
  });
  await page.locator('#cms-media-report').getByText(/Исходник: 96×64/).waitFor();
  await page.locator('#cms-media-ratio').selectOption('1:1');
  await page.locator('#cms-media-rotation').selectOption('90');
  await page.locator('#cms-media-format').selectOption('image/webp');
  await page.locator('#cms-media-alt').fill('Оптимизированный снимок оборудования');
  await page.locator('#cms-media-process').click();
  await page.locator('#cms-media-report').getByText(/Готово: 64×64 · image\/webp/).waitFor();
  assert.equal(await page.locator('#cms-media-result-image').isVisible(),true);
  await page.locator('#cms-media-commit').click();
  await page.locator('#cms-media-processor').waitFor({state:'hidden'});
  const optimizedSite=await page.evaluate(()=>window.Stage3Editor.getSite());
  const optimized=optimizedSite.assets.at(-1);
  assert.equal(optimized.mime,'image/webp');
  assert.equal(optimized.alt,'Оптимизированный снимок оборудования');
  assert.notEqual(optimized.id,secondId);
  assert.equal(optimizedSite.pages.flatMap(p=>p.sections).find(s=>s.component==='image-showcase')
    .elements.find(e=>e.slot==='photo').values['content.media'],optimized.id);
  assert.match(await page.locator('#dirty').innerText(),/несохранённые/);
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Без изменений/).waitFor();
  await visitor.reload();
  assert.equal(await visitor.locator('.gallery-grid img').first().getAttribute('src'),originalPublishedMedia);
  const currentPublish=Number((await page.locator('#server-status').innerText())
    .match(/Опубликовано: v(\d+)/)[1]);
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(new RegExp('Опубликовано: v'+(currentPublish+1)+'\\b')).waitFor();
  await visitor.reload();
  const processedSrc=await visitor.locator('img.showcase-photo').getAttribute('src');
  assert.ok(processedSrc.endsWith(optimized.id+'.webp'),'Processed image is bound to public WebP');
  const processedResponse=await ctx.request.get(origin+processedSrc);
  assert.equal(processedResponse.status(),200);
  const publicBytes=await processedResponse.body();
  assert.ok(publicBytes.length<450000);
  assert.equal(publicBytes.subarray(0,4).toString(),'RIFF');
  assert.equal(publicBytes.subarray(8,12).toString(),'WEBP');
  assert.equal(processedResponse.headers()['etag'],
    '"'+require('node:crypto').createHash('sha256').update(publicBytes).digest('hex')+'"');
  // Publication may reset inspector focus. Choose an actual media field
  // before uploading so the Media & Motion attachment is a dirty draft edit.
  await page.locator('#pages .nav-entry').first().click();
  await page.locator('#sections .nav-entry').filter({hasText:'Изображение и описание'}).click();
  await page.locator('#elements .element').filter({hasText:'Фотография'}).click();
  // A genuine full-sized photo is processed by the hosted Studio, not only
  // inserted through a raw HTTP test. Two smaller physical renditions plus
  // the original source are selected by desktop/tablet/mobile and published.
  const desktopSource64=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;
    const g=canvas.getContext('2d');
    g.fillStyle='#0c3157';g.fillRect(0,0,1200,800);
    g.fillStyle='#e7b631';g.fillRect(120,140,600,320);
    g.fillStyle='#1a6bc1';g.fillRect(800,200,260,450);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#server-media-process-open').click();
  await page.locator('#cms-media-processor').waitFor({state:'visible'});
  await page.locator('#cms-media-source').setInputFiles({
    name:'factory-wide.png',mimeType:'image/png',buffer:Buffer.from(desktopSource64,'base64')
  });
  await page.locator('#cms-media-report').getByText(/Исходник: 1200×800/).waitFor();
  await page.locator('#cms-media-ratio').selectOption('free');
  await page.locator('#cms-media-rotation').selectOption('0');
  await page.locator('#cms-media-format').selectOption('image/webp');
  await page.locator('#cms-media-width').fill('1200');
  await page.locator('#cms-media-alt').fill('Три настоящих размера цеха');
  await page.locator('#cms-media-process').click();
  await page.locator('#cms-media-report').getByText(/Готово: 1200×800.*360px, 720px/).waitFor();
  await page.locator('#cms-media-commit').click();
  await page.locator('#cms-media-processor').waitFor({state:'hidden'});
  const wide=await page.evaluate(()=>window.Stage3Editor.getSite().assets.at(-1));
  assert.deepEqual(wide.variants.map(v=>v.width),[360,720]);
  const savedPaths=wide.variants.map(v=>v.src);
  assert.equal(new Set(savedPaths).size,2,'Both smaller physical renditions have unique immutable URLs');
  // Responsive preview must consume actual authorized blobs, not just CSS resize.
  const chooseDevice=async bp=>{
    await page.locator('.device[data-bp="'+bp+'"]').click();
    await page.waitForFunction(assetId=>{
      const value=window.Stage3Host.previewUrl(assetId);
      return typeof value==='string'&&value.startsWith('data:image/webp;base64,');
    },wide.id,{timeout:10000});
    return page.evaluate(id=>window.Stage3Host.previewUrl(id),wide.id);
  };
  const smallPreview=await chooseDevice('mobile');
  const mediumPreview=await chooseDevice('tablet');
  const bigPreview=await chooseDevice('desktop');
  assert.notEqual(smallPreview,mediumPreview);
  assert.notEqual(mediumPreview,bigPreview);
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(/Без изменений/).waitFor();
  const beforeResponsivePublish=Number((await page.locator('#server-status').innerText())
    .match(/Опубликовано: v(\d+)/)[1]);
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(new RegExp('Опубликовано: v'+(beforeResponsivePublish+1)+'\\b')).waitFor();
  await visitor.reload();
  const showcase=visitor.locator('img.showcase-photo');
  const srcset=await showcase.getAttribute('srcset');
  const sizes=await showcase.getAttribute('sizes');
  assert.match(srcset,/ 360w,.* 720w,.* 1200w/);
  assert.ok(srcset.includes(wide.id+'.webp 1200w'),'Original source is the highest-resolution srcset candidate');
  assert.match(sizes,/max-width: 900px/);
  for(const part of wide.variants){
    const response=await ctx.request.get(origin+'/published/'+siteId+part.src);
    assert.equal(response.status(),200);
    const bytes=await response.body();
    assert.equal(response.headers()['etag'],'"'+part.sha256+'"');
    assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),part.sha256);
  }
  // Full-page Design Graph editing now includes structural edits and survives
  // server save/reload/publish with responsive fidelity in the public renderer.
  replies.length=0;
  replies.push('feature-highlights');
  await page.locator('#section-add').click();
  const graphSectionId=await page.evaluate(()=>window.Stage3Editor.selection().sectionId);
  assert.equal((await page.evaluate(id=>window.Stage3Editor.getSite().pages.flatMap(p=>p.sections)
    .find(s=>s.id===id).component,graphSectionId)),'feature-highlights');
  await page.locator('#section-design-graph').click();
  await page.locator('#cms-design-graph-dialog[open]').waitFor();
  await page.locator('#cms-design-apply').click();
  const graphRevisionBefore=Number((await page.locator('#server-status').innerText()).match(/Черновик #(\\d+)/)[1]);
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(new RegExp('Черновик #'+(graphRevisionBefore+1)+'\\\\b')).waitFor();
  await visitor.goto(publicUrl);
  assert.equal(await visitor.locator('.cmsdg').count(),0,'Saved Design Graph remains private until explicit publish');

  await page.locator('#cms-open-page-preview').click();
  await page.locator('#cms-page-preview[open]').waitFor();
  const fullGraphPreview=page.frameLocator('#cms-page-preview-frame');
  const fullGraphTitle=fullGraphPreview.locator('.cmsdg-n-'+graphSectionId+'-title');
  await fullGraphTitle.waitFor();
  await fullGraphTitle.click();
  assert.equal(await page.locator('#cms-work-graph-node').inputValue(),graphSectionId+'-title',
    'Hosted full-page canvas selects the exact graph node');
  await page.locator('#cms-work-graph-add-text').click();
  const inlineNodeId=await page.locator('#cms-work-graph-node').inputValue();
  assert.notEqual(inlineNodeId,graphSectionId+'-title');
  const inlineNode=fullGraphPreview.locator('.cmsdg-n-'+inlineNodeId);
  await inlineNode.waitFor();
  await inlineNode.dblclick();
  await page.locator('#cms-work-quick-input').fill('Композиция сохранена через весь путь');
  await page.locator('#cms-work-quick-save').click();
  await inlineNode.getByText('Композиция сохранена через весь путь').waitFor();
  await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
  await inlineNode.getByText('Новый текстовый элемент').waitFor();
  await page.locator('#cms-work-history').getByRole('button',{name:'↷ Повтор'}).click();
  await inlineNode.getByText('Композиция сохранена через весь путь').waitFor();
  await page.locator('.cms-page-preview-modes [data-mode="mobile"]').click();
  await page.locator('#cms-work-graph-panel [data-work-graph-field="fontSize"]').fill('36');
  await page.locator('#cms-work-graph-panel [data-work-graph-field="fontSize"]').dispatchEvent('change');
  const readHostedNode=()=>page.evaluate(({sectionId,nodeId})=>{
    const section=window.Stage3Editor.getSite().pages.flatMap(p=>p.sections).find(s=>s.id===sectionId);
    const walk=nodes=>{for(const node of nodes){if(node.id===nodeId)return node;
      if(node.children){const found=walk(node.children);if(found)return found;}}return null;};
    return walk(section.designGraph.nodes);
  },{sectionId:graphSectionId,nodeId:inlineNodeId});
  let hostedNode=await readHostedNode();
  assert.equal(hostedNode.text,'Композиция сохранена через весь путь');
  assert.equal(hostedNode.responsive.mobile.fontSize,36);
  await page.locator('#cms-work-graph-open').click();
  await page.locator('#cms-design-graph-dialog[open]').waitFor();
  assert.equal(await page.locator('#cms-design-node-select').inputValue(),inlineNodeId);
  assert.equal(await page.locator('#cms-design-breakpoint').inputValue(),'mobile');
  await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Закрыть'}).click();
  await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();
  const graphRevisionBeforeSave=Number((await page.locator('#server-status').innerText()).match(/Черновик #(\\d+)/)[1]);
  await page.locator('#save').click();
  await page.locator('#server-status').getByText(new RegExp('Черновик #'+(graphRevisionBeforeSave+1)+'\\\\b')).waitFor();
  await page.locator('#server-reload').click();
  await page.waitForFunction(({sectionId,nodeId})=>{
    const section=window.Stage3Editor.getSite().pages.flatMap(p=>p.sections).find(s=>s.id===sectionId);
    if(!section?.designGraph)return false;
    const walk=nodes=>{for(const node of nodes){if(node.id===nodeId)return node;
      if(node.children){const found=walk(node.children);if(found)return found;}}return null;};
    const node=walk(section.designGraph.nodes);
    return node?.text==='Композиция сохранена через весь путь'&&node.responsive?.mobile?.fontSize===36;
  },{sectionId:graphSectionId,nodeId:inlineNodeId});
  hostedNode=await readHostedNode();
  assert.equal(hostedNode.responsive.mobile.fontSize,36,'Responsive graph style survives server reload');
  await visitor.goto(publicUrl);
  assert.equal(await visitor.locator('.cmsdg').count(),0,'Reloaded draft still does not leak to visitors');
  const graphVersionBefore=Number((await page.locator('#server-status').innerText()).match(/Опубликовано: v(\\d+)/)[1]);
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(new RegExp('Опубликовано: v'+(graphVersionBefore+1)+'\\\\b')).waitFor();
  await visitor.setViewportSize({width:390,height:844});
  await visitor.goto(publicUrl);
  const publicGraphNode=visitor.locator('.cmsdg-n-'+inlineNodeId);
  await publicGraphNode.getByText('Композиция сохранена через весь путь').waitFor();
  assert.equal(await publicGraphNode.evaluate(el=>getComputedStyle(el).fontSize),'36px',
    'Published PHP renderer honors the mobile graph override');
  await visitor.setViewportSize({width:1400,height:1000});

  await staffCtx.close();
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
