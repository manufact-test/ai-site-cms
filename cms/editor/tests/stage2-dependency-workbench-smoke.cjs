'use strict';
// One real Chromium handoff flow, against a package-verified, offline reviewer
// worksheet: review -> reject with evidence -> validate -> JSON export -> import.
// No external HTTP, hosting, legal assertion, CMS admin or production routes.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright-core');
const {build}=require('../../tools/stage2-review-workbench.cjs');
const {createDossier}=require('../../tools/stage2-license-dossier.cjs');
const {inspectWorksheet}=require('../../tools/stage2-human-license-review.cjs');
const binary=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!binary)throw Error('A real Chromium browser is required');
(async()=>{
  const output=build();
  const browser=await chromium.launch({executablePath:binary,headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({acceptDownloads:true});
    const errors=[],remote=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',req=>{if(/^https?:/i.test(req.url()))remote.push(req.url());});
    await page.goto(pathToFileURL(output).href);
    assert.equal(await page.locator('.card').count(),43,'43 real package-bound dependencies');
    assert.equal(await page.locator('#pending').innerText(),'43');
    assert.equal(await page.locator('#approved').innerText(),'0');
    assert.equal(await page.locator('#gap-count').innerText(),'43');
    await page.locator('#view').selectOption('incomplete');
    assert.equal(await page.locator('.card:visible').count(),43);
    await page.locator('#next-gap').click();
    assert.equal(await page.locator('.card').first().locator('select.status')
      .evaluate(el=>el===document.activeElement),true);
    assert.match(await page.locator('.card').first().locator('.review-gaps').innerText(),
      /Незавершённое решение/);
    const missingDownload=page.waitForEvent('download');
    await page.locator('#gap-export').click();
    const missingFile=await missingDownload;
    assert.equal(missingFile.suggestedFilename(),'stage2-review-open-actions.md');
    const missingContents=fs.readFileSync(await missingFile.path(),'utf8');
    assert.match(missingContents,/Незавершённых компонентов: 43 из 43/);
    assert.match(missingContents,/НЕ ЮРИДИЧЕСКОЕ ЗАКЛЮЧЕНИЕ/);
    await page.locator('#view').selectOption('all');
    assert.match(await page.locator('.warning').innerText(),/не одобрение|не разрешают/i);
    const target=page.locator('.card').first();
    await page.locator('#filter').fill('php-runtime');
    assert.ok(await page.locator('.card:visible').count()>0,'working component filter');
    await page.locator('#filter').fill('');
    await target.locator('select.status').selectOption('approved');
    await page.locator('#validate').click();
    assert.match(await page.locator('#feedback').innerText(),/Строка 1/,'incomplete approvals are rejected');
    await target.locator('select.status').selectOption('rejected');
    await target.locator('textarea').nth(0).fill(
      'https://github.com/example/review-one\nhttps://github.com/example/review-two');
    await target.locator('textarea').nth(1).fill('SYNTHETIC E2E: rejected pending independent license decision.');
    await target.locator('input[type=text]').nth(0).fill('CI-SYNTHETIC-REVIEWER');
    await target.locator('input[type=text]').nth(1).fill(new Date().toISOString().slice(0,10));
    await page.locator('#validate').click();
    assert.match(await page.locator('#feedback').innerText(),/формата пройдена/i);
    assert.equal(await page.locator('#rejected').innerText(),'1');
    assert.equal(await page.locator('#gap-count').innerText(),'42');
    assert.match(await target.locator('.review-gaps').innerText(),
      /Поля заполнены/);
    await page.locator('#view').selectOption('incomplete');
    assert.equal(await page.locator('.card:visible').count(),42);
    await page.locator('#view').selectOption('all');
    const waiting=page.waitForEvent('download');
    await page.locator('#export').click();
    const file=await waiting;
    assert.equal(file.suggestedFilename(),'stage2-dependency-review-worksheet.json');
    const original=JSON.parse(fs.readFileSync(await file.path(),'utf8'));
    const result=inspectWorksheet(createDossier(),original);
    assert.equal(result.rejected,1);
    assert.equal(result.pending,42);
    assert.equal(result.approved,0);
    assert.equal(result.stage2Accepted,false);
    assert.equal(result.independentLegalApproval,false);
    const upload=page.locator('#import');
    await upload.setInputFiles({name:'review.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify({...original,stage2Accepted:true}))});
    await page.waitForFunction(()=>document.querySelector('#feedback')?.textContent.includes('Импорт отклонён'));
    assert.match(await page.locator('#feedback').innerText(),/Импорт отклонён/i,
      'forged Stage2 approval refused');
    await upload.setInputFiles({name:'review.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(original))});
    await page.waitForFunction(()=>document.querySelector('#feedback')?.textContent.includes('Импортирован рабочий лист'));
    assert.match(await page.locator('#feedback').innerText(),/Импортирован рабочий лист/i);
    assert.equal(await page.locator('#rejected').innerText(),'1');
    assert.equal(await page.locator('#pending').innerText(),'42');
    assert.deepEqual(errors,[],'zero page errors');
    assert.deepEqual(remote,[],'no remote network requests');
    console.log('STAGE2_HUMAN_REVIEW_CHROMIUM PASS: 43 package-bound rows, scoped search, incomplete approval denied, evidence-backed rejection, canonical export, strict CLI revalidation, forged approval import denied, roundtrip; no host access, NO Stage2 acceptance.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
