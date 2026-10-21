'use strict';
// Exactly one practical real-browser flow: open local demo, edit, preview,
// move/add, switch viewport and export. No production API or host I/O.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright-core');
const binary=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>fs.existsSync(p));
if(!binary)throw Error('Real Chromium required for the Stage2 product preview smoke');
const root=path.resolve(__dirname,'../..');
(async()=>{
  const browser=await chromium.launch({executablePath:binary,headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({acceptDownloads:true,viewport:{width:1500,height:900}});
    const errors=[],remote=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(/^https?:/i.test(r.url()))remote.push(r.url());});
    await page.goto(pathToFileURL(path.join(root,'stage2-preview/index.html')).href);
    await page.locator('#sections li').first().waitFor();
    assert.equal(await page.locator('#sections li').count(),5,'real seeded sections in demo UI');
    const frame=page.frameLocator('#preview');
    await frame.locator('h1').waitFor();
    assert.equal(await frame.locator('h1').innerText(),'Современный сайт для производства');
    await page.locator('#sections .section-select').first().click();
    const input=page.locator('#fields input').filter({visible:true});
    const titleId=await input.evaluateAll(all=>all.find(e=>e.value==='Современный сайт для производства')?.id);
    assert.ok(titleId,'real Jedison input must render the seeded hero title');
    await page.locator('#fields input').filter({visible:true}).locator('xpath=..').count();
    const title=page.locator('#fields input[id='+JSON.stringify(titleId)+']');
    await title.fill('Рабочий прототип CMS');
    await title.dispatchEvent('change');
    await title.blur();
    await frame.locator('h1').filter({hasText:'Рабочий прототип CMS'}).waitFor();
    // Text containing markup is displayed as literal text, never executed.
    await title.fill('<img src=x onerror=alert(1)>');
    await title.dispatchEvent('change');
    await title.blur();
    await frame.locator('h1').filter({hasText:'<img src=x onerror=alert(1)>'}).waitFor();
    assert.equal(await frame.locator('img').count(),0,'editor values cannot inject HTML');
    await title.fill('Рабочий прототип CMS');
    await title.dispatchEvent('change');
    await title.blur();
    await page.locator('#new-type').selectOption('quote');
    await page.locator('#add').click();
    assert.equal(await page.locator('#sections li').count(),6,'add a real section through UI');
    await frame.locator('.quote').waitFor();
    if(process.env.GITHUB_ACTIONS==='true'){
      const output=path.join(root,'stage2-preview','screenshots');
      fs.mkdirSync(output,{recursive:true});
      await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
    }
    await page.locator('[data-width=mobile]').click();
    assert.equal(await page.locator('#browser.mobile').count(),1,'real mobile preview width');
    if(process.env.GITHUB_ACTIONS==='true'){
      await page.screenshot({path:path.join(root,'stage2-preview','screenshots','mobile.png'),fullPage:true});
    }
    await page.locator('#theme').selectOption('forest');
    await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('--accent:#19836a'));
    const downloadPromise=page.waitForEvent('download');
    await page.locator('#export').click();
    const download=await downloadPromise;
    const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(exported.pages.length,1);
    assert.equal(exported.pages[0].sections.length,6);
    assert.equal(exported.theme,'forest');
    assert.equal(exported.pages[0].sections[0].props.title,'Рабочий прототип CMS');
    // One expanded real-user smoke: local save -> reload -> edit -> undo/redo -> focused preview.
    // Site-level vertical: create second page, customize SEO, alter its content,
    // return home, save and reload all pages from offline browser storage.
    await page.locator('#page-add').click();
    assert.equal(await page.locator('#page-list option').count(),2);
    await page.locator('.page-settings summary').click();
    await page.locator('#page-title').fill('Услуги');
    await page.locator('#page-title').dispatchEvent('change');
    await page.locator('#seo-title').fill('Услуги производства и разработки');
    await page.locator('#seo-title').dispatchEvent('change');
    await page.locator('#seo-description').fill('Узнайте о наших промышленных услугах.');
    await page.locator('#seo-description').dispatchEvent('input');
    await page.locator('#page-slug').fill('services');
    await page.locator('#page-slug').dispatchEvent('change');
    await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('name="description" content="Узнайте'));
    assert.match(await page.locator('#preview-url').innerText(),/services/);
    if(process.env.GITHUB_ACTIONS==='true'){
      await page.screenshot({path:path.join(root,'stage2-preview','screenshots','multi-page-seo.png'),fullPage:true});
    }
    await page.locator('#page-list').selectOption({index:0});
    await frame.locator('h1').filter({hasText:'Рабочий прототип CMS'}).waitFor();
    await page.locator('#save').click();
    assert.equal(await page.locator('#versions li').count(),1);
    await page.reload();
    await frame.locator('h1').filter({hasText:'Рабочий прототип CMS'}).waitFor();
    assert.equal(await page.locator('#sections li').count(),6);
    assert.equal(await page.locator('#page-list option').count(),2);
    await page.locator('#page-list').selectOption({index:1});
    assert.equal(await page.locator('#seo-title').inputValue(),'Услуги производства и разработки');
    await page.locator('#page-list').selectOption({index:0});
    const savedId=await page.locator('#fields input').evaluateAll(all=>all.find(x=>x.value==='Рабочий прототип CMS')?.id);
    assert.ok(savedId);
    const savedTitle=page.locator('#fields input[id='+JSON.stringify(savedId)+']');
    await savedTitle.fill('Правка после сохранения');await savedTitle.dispatchEvent('change');await savedTitle.blur();
    await frame.locator('h1').filter({hasText:'Правка после сохранения'}).waitFor();
    await page.locator('#undo').click();
    await frame.locator('h1').filter({hasText:'Рабочий прототип CMS'}).waitFor();
    await page.locator('#redo').click();
    await frame.locator('h1').filter({hasText:'Правка после сохранения'}).waitFor();
    await page.locator('[data-focus=section]').click();
    await page.locator('#sections .section-select').nth(1).click();
    assert.equal(await frame.locator('main > section').count(),1);
    await page.locator('[data-width=tablet]').click();
    assert.equal(await page.locator('#browser.tablet').count(),1);
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#versions .restore').first().click();
    await page.locator('[data-focus=page]').click();
    await frame.locator('h1').filter({hasText:'Рабочий прототип CMS'}).waitFor();

    // Product flow B: copy a real section to another page, reorder pages.
    await page.locator('#page-list').selectOption({index:1});
    await page.locator('#copy-target').selectOption({index:0});
    await page.locator('#copy-section').click();
    assert.equal(await page.locator('#page-list').inputValue(),await page.locator('#page-list option').first().getAttribute('value'));
    assert.equal(await page.locator('#sections li').count(),7,'copied block appears on the destination page');
    await page.locator('#page-add').click();
    assert.equal(await page.locator('#page-list option').count(),3);
    await page.locator('#page-up').click();
    assert.equal(await page.locator('#page-list option').nth(1).getAttribute('value'),await page.locator('#page-list').inputValue());

    // Product flow C: download a real offline ZIP with navigation, per-page SEO and a JSON backup.
    const zipped=page.waitForEvent('download');
    await page.locator('#download-site').click();
    const zip=await zipped;
    const zipPath=await zip.path();
    const zipFiles=execFileSync('unzip',['-Z1',zipPath],{encoding:'utf8'}).trim().split('\n');
    assert.ok(zipFiles.includes('index.html')&&zipFiles.includes('services.html'));
    assert.ok(zipFiles.includes('project-backup.json')&&zipFiles.includes('README.txt'));
    const siteHTML=execFileSync('unzip',['-p',zipPath,'index.html'],{encoding:'utf8'});
    assert.match(siteHTML,/href="services\.html"/);
    assert.match(siteHTML,/<meta name="description"/);
    assert.doesNotMatch(siteHTML,/<script[\s>]/i);

    // Product flow A: open three complete preset sites with 11 editable section kinds.
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#starter-type').selectOption('industrial');
    await page.locator('#starter-apply').click();
    assert.equal(await page.locator('#page-list option').count(),3);
    assert.equal(await page.locator('#sections li').count(),5);
    await frame.locator('.studio-stats').waitFor();
    await page.locator('#page-list').selectOption({index:1});
    await frame.locator('.studio-product').first().waitFor();
    await page.locator('#new-type').selectOption('leadform');
    await page.locator('#add').click();
    await frame.locator('.studio-form input[disabled]').first().waitFor();
    await page.locator('.audit-panel summary').click();
    assert.ok((await page.locator('#audit-count').innerText()).length>0);
    await page.locator('#save').click();
    await page.reload();
    assert.equal(await page.locator('#page-list option').count(),3);
    assert.ok(await page.locator('#new-type option').count()>=11);
    if(process.env.GITHUB_ACTIONS==='true'){
      await page.screenshot({path:path.join(root,'stage2-preview','screenshots','preset-studio.png'),fullPage:true});
    }
    assert.deepEqual(errors,[],'no browser JS errors');
    assert.deepEqual(remote,[],'no HTTP calls from demo/editor/site preview');
    console.log('Stage2 PRODUCT studio PASS: 11 sections, three presets, page reorder, cross-page copy, SEO review, ZIP offline static site, revision save/reload and zero network.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
