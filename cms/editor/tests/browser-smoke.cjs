'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright-core');

const browserBinary = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => fs.existsSync(p));
if (!browserBinary) throw new Error('A real Chromium installation is required. Do NOT silently skip the test.');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'editor.js');
const example = {
  headline: 'Original approved headline',
  spacingPx: 24,
  enabled: true
};
const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'spacingPx', 'enabled'],
  properties: {
    headline: {type: 'string', title: 'Heading'},
    spacingPx: {type: 'integer', minimum: 0, maximum: 128, title: 'Spacing'},
    enabled: {type: 'boolean', title: 'Enabled'}
  }
};
(async () => {
  const browser = await chromium.launch({executablePath: browserBinary, headless:true, args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width:1200,height:850}});
    const pageErrors = [];
    const requests = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('request', r => requests.push(r.url()));
    await page.setContent('<!doctype html><html><body><main><div id="fields"></div></main></body></html>');
    await page.addScriptTag({path:output});
    const initiallyNoEditor = await page.evaluate(() => document.querySelector('#fields').children.length);
    assert.equal(initiallyNoEditor,0,'Do not auto-initialize on public pages');

    await page.evaluate(({schema,example}) => {
      window.stage2Changes = [];
      window.stage2Instance = window.AiSiteCmsEditorStage2.mount({
        container:document.querySelector('#fields'),
        schema, data:example,
        onChange: value => stage2Changes.push(value)
      });
    },{schema,example});
    await page.waitForFunction(() => document.querySelectorAll('#fields input').length >= 3);
    assert.deepEqual(await page.evaluate(() => window.stage2Instance.getValue()),example);

    const heading = page.locator('#fields input').filter({visible:true}).filter({hasNot:page.locator('input[type="hidden"]')});
    const headingInput = page.locator('#fields input').filter({visible:true});
    const inputs = await headingInput.evaluateAll(elements =>
      elements.map(e=>({type:e.type,value:e.value,id:e.id})));
    const titleMatches = inputs.filter(i=>i.value===example.headline);
    assert.equal(titleMatches.length,1,'Exactly one original heading field');
    await page.locator('#fields input[id='+JSON.stringify(titleMatches[0].id)+']').fill('Owner revised headline');
    await page.locator('#fields input[id='+JSON.stringify(titleMatches[0].id)+']').dispatchEvent('change');
    await page.locator('#fields input[id='+JSON.stringify(titleMatches[0].id)+']').blur();
    await page.waitForFunction(() => window.stage2Instance.getValue().headline === 'Owner revised headline');

    const numberMatches = inputs.filter(i=>i.value==='24');
    assert.equal(numberMatches.length,1,'Exactly one spacing field');
    await page.locator('#fields input[id='+JSON.stringify(numberMatches[0].id)+']').fill('36');
    await page.locator('#fields input[id='+JSON.stringify(numberMatches[0].id)+']').dispatchEvent('change');
    await page.locator('#fields input[id='+JSON.stringify(numberMatches[0].id)+']').blur();
    await page.waitForFunction(() => window.stage2Instance.getValue().spacingPx === 36);
    const changed = await page.evaluate(() => ({
      value:window.stage2Instance.getValue(),
      changes:window.stage2Changes.length
    }));
    assert.equal(changed.value.headline,'Owner revised headline');
    assert.equal(changed.value.spacingPx,36);
    assert.equal(changed.value.enabled,true);
    assert.ok(changed.changes>=2,'Actual upstream editor emitted change events');

    const hostErrors = await page.evaluate(() => {
      let invalid=0;
      for (const bad of [{container:null,schema:{type:'object'},data:{}},
        {container:document.querySelector('#fields'),schema:{type:'array'},data:[]},
        {container:document.querySelector('#fields'),schema:{type:'object',properties:{}},data:{}}]) {
        try{window.AiSiteCmsEditorStage2.mount(bad)}catch{invalid++}
      }
      return invalid;
    });
    assert.equal(hostErrors,3,'Refuse unsupported and open schemas');
    await page.evaluate(() => {
      stage2Instance.destroy();
      stage2Instance.destroy();
    });
    assert.equal(await page.locator('#fields').locator('*').count(),0,'Destroy removes editor');
    const destroyedRefusal = await page.evaluate(() => {
      try { stage2Instance.getValue(); return false; }
      catch{return true}
    });
    assert.equal(destroyedRefusal,true,'Cannot read destroyed instance');
    assert.deepEqual(pageErrors,[], 'No JS page errors');
    assert.deepEqual(requests,[], 'No browser network request or runtime CDN dependency');
    await page.close();
    console.log('Stage2 real Chromium Jedison integration PASS: 12 assertions; nested JSON typed edits, independent callback, lifecycle and zero network requests');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
