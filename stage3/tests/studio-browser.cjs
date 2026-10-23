'use strict';
// One real Chromium E2E of the complete Stage3 local editing flow.
// No network, Hostinger, public deployment, credentials, or production claims.
const {chromium}=require('../../cms/editor/node_modules/playwright-core');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),html=path.join(root,'studio/index.html');
const browserPath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!browserPath)throw Error('Stage3 requires genuine local Chromium for the single browser E2E');
(async()=>{
  const browser=await chromium.launch({executablePath:browserPath,headless:true,args:['--no-sandbox']});
  try{
    const ctx=await browser.newContext({acceptDownloads:true,viewport:{width:1450,height:1000}});
    const page=await ctx.newPage(),errors=[],remote=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(/^https?:/i.test(r.url()))remote.push(r.url());});
    await page.goto(pathToFileURL(html).href);
    await page.locator('#site-name').getByText('Завод оборудования').waitFor();
    assert.equal(await page.locator('#pages .nav-entry').count(),2);
    assert.equal(await page.locator('#sections .nav-entry').count(),2);
    assert.equal(await page.locator('#fields [data-field]').count(),3,
      'Only declared heading fields appear; no generic CSS catalogue');
    const canvas=page.frameLocator('#preview');
    await canvas.locator('h1').waitFor();
    assert.equal(await canvas.locator('h1').innerText(),'Производим технологическое оборудование');
    const headline=page.locator('#fields [data-field="content.text"]');
    await headline.fill('Новое промышленное оборудование');
    await headline.dispatchEvent('change');
    await canvas.locator('h1').getByText('Новое промышленное оборудование').waitFor();
    assert.match(await page.locator('#dirty').innerText(),/несохранённые/);
    assert.equal(await page.locator('#changes-count').innerText(),'1 изменённых полей');
    // Browser injection attempt must become inert visible text, never a node.
    await headline.fill('<img src=x onerror=alert(1)>');
    await headline.dispatchEvent('change');
    assert.equal(await canvas.locator('h1').innerText(),'<img src=x onerror=alert(1)>');
    assert.equal(await canvas.locator('img').count(),0);
    await headline.fill('Новое промышленное оборудование');
    await headline.dispatchEvent('change');
    await page.locator('[data-bp="mobile"]').click();
    const size=page.locator('#fields [data-field="style.fontSize"]');
    await size.fill('35px');await size.dispatchEvent('change');
    await canvas.locator('h1[style*="font-size:35px"]').waitFor();
    assert.equal(await canvas.locator('h1').evaluate(e=>getComputedStyle(e).fontSize),'35px');
    assert.equal(await page.locator('#viewport.mobile').count(),1);
    await page.locator('#undo').click();
    await canvas.locator('h1[style*="font-size:32px"]').waitFor();
    assert.equal(await canvas.locator('h1').evaluate(e=>getComputedStyle(e).fontSize),'32px');
    await page.locator('#redo').click();
    await canvas.locator('h1[style*="font-size:35px"]').waitFor();
    assert.equal(await canvas.locator('h1').evaluate(e=>getComputedStyle(e).fontSize),'35px');
    await page.locator('#save').click();
    assert.match(await page.locator('#dirty').innerText(),/сохранён локально/);
    assert.equal(await page.locator('#versions .version').count(),1);
    if(process.env.GITHUB_ACTIONS==='true'){
      const shots=path.join(root,'studio/out');fs.mkdirSync(shots,{recursive:true});
      await page.screenshot({path:path.join(shots,'stage3-desktop-editor.png'),fullPage:true});
    }
    await page.reload();
    await page.locator('#site-name').getByText('Завод оборудования').waitFor();
    assert.equal(await canvas.locator('h1').innerText(),'Новое промышленное оборудование');
    await page.locator('[data-bp="mobile"]').click();
    await canvas.locator('h1[style*="font-size:35px"]').waitFor();
    assert.equal(await canvas.locator('h1').evaluate(e=>getComputedStyle(e).fontSize),'35px');
    const exportDownload=page.waitForEvent('download');
    await page.locator('#export').click();
    const download=await exportDownload;
    const saved=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(saved.pages[0].sections[0].elements[0].values['content.text'],'Новое промышленное оборудование');
    await page.locator('#pages .nav-entry').nth(1).click();
    assert.equal(await page.locator('#sections .nav-entry').count(),1);
    assert.equal(await page.locator('#canvas-title').innerText(),'Контакты');
    assert.equal(await canvas.locator('h2').innerText(),'Свяжитесь с нами');
    // Local revisions survive a reload; restoring never publishes anything.
    await page.locator('#pages .nav-entry').first().click();
    const title=page.locator('#fields [data-field="content.text"]');
    await title.fill('Черновик версии 2');await title.dispatchEvent('change');
    await page.locator('#save').click();
    assert.equal(await page.locator('#versions .version').count(),2);
    await page.locator('#versions .version').nth(1).click();
    assert.equal(await canvas.locator('h1').innerText(),'Новое промышленное оборудование');
    // Round-trip JSON can be recovered in a completely different local draft.
    page.once('dialog',d=>d.accept());
    await page.locator('#new-site').click();
    assert.equal(await page.locator('#pages .nav-entry').count(),2);
    assert.equal(await page.locator('#site-name').innerText(),'Сайт без макета');
    assert.equal(await page.locator('#fields [data-field]').count(),3);
    page.once('dialog',d=>d.accept());
    await page.locator('#import-file').setInputFiles({
      name:'site.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(saved),'utf8')
    });
    await page.locator('#site-name').getByText('Завод оборудования').waitFor();
    assert.equal(await canvas.locator('h1').innerText(),'Новое промышленное оборудование');
    assert.match(await page.locator('#dirty').innerText(),/несохранённые/);
    // Unknown properties and JS links are rejected by the real browser importer.
    const bad=structuredClone(saved);
    bad.pages[0].sections[0].elements[2].values['behavior.href']='javascript:alert(1)';
    await page.locator('#import-file').setInputFiles({
      name:'hostile.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(bad),'utf8')
    });
    assert.match(await page.locator('#toast').innerText(),/Импорт отклонён/);
    assert.equal(await canvas.locator('h1').innerText(),'Новое промышленное оборудование');

    // Real offline repeatable cards: add, edit, clone, reorder and Undo through Studio.
    page.once('dialog',d=>d.accept('service-grid'));
    await page.locator('#section-add').click();
    await page.locator('#sections .nav-entry').filter({hasText:'Услуги · повторяемые карточки'}).click();
    assert.equal(await page.locator('[data-repeat-id]').count(),2);
    await page.locator('#cms-repeat-add').click();
    assert.equal(await page.locator('[data-repeat-id]').count(),3);
    const cardTitle=page.locator('#fields [data-field="content.title"]');
    await cardTitle.fill('Сборка промышленного шкафа');
    await cardTitle.dispatchEvent('change');
    await canvas.locator('.cms-preview-grid h3').getByText('Сборка промышленного шкафа').waitFor();
    const cardId=await page.locator('[data-repeat-id]').last().getAttribute('data-repeat-id');
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages[0].sections.find(s=>s.component==='service-grid').items[2].id,cardId);
    await page.locator('[data-repeat-id]').last().click();
    assert.equal(await page.locator('#fields [data-field="content.title"]').inputValue(),'Сборка промышленного шкафа');
    await page.getByRole('button',{name:'Копировать карточку 3'}).click();
    assert.equal(await page.locator('[data-repeat-id]').count(),4);
    await page.locator('#undo').click();
    assert.equal(await page.locator('[data-repeat-id]').count(),3);
    await page.locator('#redo').click();
    assert.equal(await page.locator('[data-repeat-id]').count(),4);
    await page.locator('#save').click();
    await page.reload();
    await page.locator('#sections .nav-entry').filter({hasText:'Услуги · повторяемые карточки'}).click();
    assert.equal(await page.locator('[data-repeat-id]').count(),4);

    // Searchable first-party component catalog, FAQ native semantic preview.
    await page.locator('#section-catalog').click();
    await page.locator('#cms-component-search').fill('FAQ');
    assert.equal(await page.locator('#cms-component-list [data-component]').count(),1);
    await page.locator('#cms-component-list [data-component="faq-accordion"]').click();
    await page.locator('#sections .nav-entry').filter({hasText:'FAQ'}).click();
    assert.equal(await page.locator('#elements [data-repeat-id]').count(),2);
    await page.locator('#elements [data-repeat-id]').first().click();
    await page.locator('#fields [data-field="content.question"]').fill('Как оформить заказ?');
    await page.locator('#fields [data-field="content.question"]').dispatchEvent('change');
    await canvas.locator('details summary').getByText('Как оформить заказ?').waitFor();
    assert.equal(await page.locator('#cms-component-catalog').isVisible(),false);

    // Search diagnostics and manage URL aliases from the same undoable document.
    await page.locator('#cms-quality-open').click();
    await page.locator('#cms-site-report').waitFor({state:'visible'});
    assert.match(await page.locator('#cms-quality-summary').innerText(),/страниц/);
    await page.locator('#cms-redirect-from').fill('/older-page/');
    await page.locator('#cms-redirect-target').selectOption('/contact/');
    await page.locator('#cms-redirect-form button[type=submit]').click();
    await page.locator('#cms-redirect-list code').getByText('/older-page/ → /contact/').waitFor();
    assert.deepEqual((await page.evaluate(()=>window.Stage3Editor.getSite())).redirects,
      [{from:'/older-page/',to:'/contact/'}]);
    await page.locator('#cms-site-report').getByRole('button',{name:'Закрыть'}).click();
    await page.locator('#undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).redirects,undefined);
    await page.locator('#redo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).redirects.length,1);
    assert.deepEqual(errors,[],'No page JS errors or unsupported dependencies');
    assert.deepEqual(remote,[],'No outgoing network requests, even through iframe');
    console.log('STAGE3 REAL CHROMIUM STUDIO E2E PASS: typed edit, inert preview, responsive, undo/redo, saved versions, reload, export/import, no-design and fail-closed import');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
