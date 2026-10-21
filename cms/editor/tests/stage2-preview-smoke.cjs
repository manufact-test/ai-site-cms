'use strict';
// Exactly one practical real-browser flow: open local demo, edit, preview,
// move/add, switch viewport and export. No production API or host I/O.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
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
    assert.equal(exported.sections.length,6);
    assert.equal(exported.theme,'forest');
    assert.equal(exported.sections[0].props.title,'Рабочий прототип CMS');
    // One expanded real-user smoke: local save -> reload -> edit -> undo/redo -> focused preview.
    await page.locator('#save').click();
    assert.equal(await page.locator('#versions li').count(),1);
    await page.reload();
    await frame.locator('h1').filter({hasText:'Рабочий прототип CMS'}).waitFor();
    assert.equal(await page.locator('#sections li').count(),6);
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
    assert.deepEqual(errors,[],'no browser JS errors');
    assert.deepEqual(remote,[],'no HTTP calls from demo/editor/site preview');
    console.log('Stage2 PRODUCT preview real Chromium PASS: rendered editor, safe live content, sections, mobile, theme and exported project; zero network.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
