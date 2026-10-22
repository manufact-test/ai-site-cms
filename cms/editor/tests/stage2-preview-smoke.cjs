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
    assert.equal(await page.locator('#page-tree .page-tree-item').count(),1);
    await page.locator('#overview-open').click();
    assert.equal(await page.locator('#site-overview').isVisible(),true);
    assert.equal(await page.locator('#overview-pages').innerText(),'1');
    assert.equal(await page.locator('#overview-sections').innerText(),'5');
    await page.locator('#overview-page-list .overview-page').first().click();
    assert.equal(await page.locator('#site-overview').isVisible(),false);
    assert.equal(await page.locator('#active-breadcrumb').innerText(),'Новый сайт · Пример / Главная');
    await page.locator('#section-search').fill('zz-nonexistent');
    assert.equal(await page.locator('#sections li').count(),0);
    assert.equal(await page.locator('#section-empty').isVisible(),true);
    await page.locator('#section-search').fill('главный');
    assert.equal(await page.locator('#sections li').count(),1);
    await page.locator('#section-search').fill('');
    assert.equal(await page.locator('#sections li').count(),5);
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
    await page.locator('#project-actions summary').click();
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
    assert.equal(await page.locator('#page-tree .page-tree-item').count(),2);
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
    await page.locator('#overview-open').click();
    assert.equal(await page.locator('#overview-pages').innerText(),'2');
    await page.locator('#overview-page-list .overview-page').nth(1).click();
    assert.equal(await page.locator('#seo-title').inputValue(),'Услуги производства и разработки');
    await page.locator('#page-list').selectOption({index:0});
    await page.locator('.sidebar-tools > summary').click();
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

    // Unified site presentation: global header/footer; hide one page from
    // navigation and one section from HTML, preserving editable project data.
    await page.locator('.site-settings > summary').click();
    await page.locator('#site-header-note').fill('Производственные решения · демо');
    await page.locator('#site-footer-note').fill('© Пример компании 2026');
    await page.locator('#page-list').selectOption({index:2});
    if(!await page.locator('.page-settings').evaluate(el=>el.open)){
      await page.locator('.page-settings > summary').click();
    }
    await page.locator('#page-in-menu').uncheck();
    await page.locator('#page-list').selectOption({index:0});
    await page.locator('#sections .section-select').nth(1).click();
    assert.equal(await frame.locator('.cards').count(),1);
    await page.locator('#section-visible').uncheck();
    assert.equal(await frame.locator('.cards').count(),0,'hidden section vanishes from site HTML');
    assert.equal(await page.locator('#sections li.is-hidden').count(),1,'hidden section stays editable');
    assert.match(await frame.locator('.site-brand-note').innerText(),/Производственные решения/);
    assert.match(await frame.locator('.foot').innerText(),/Пример компании/);
    assert.equal(await frame.locator('.menu [data-preview-page]').count(),2,'hidden menu page excluded');
    await page.locator('#site-navigation').uncheck();
    assert.equal(await frame.locator('.menu').count(),0,'site-wide menu can be disabled');
    await page.locator('#site-navigation').check();
    await frame.locator('.menu').waitFor();
    assert.equal(await frame.locator('.menu').count(),1);
    // Design: global tokens and a visible section's theme, history and HTML parity.
    await page.locator('.design-settings > summary').click();
    await page.locator('#design-font').selectOption('editorial');
    await page.locator('#design-radius').selectOption('sharp');
    await page.locator('#design-spacing').selectOption('compact');
    await page.locator('#design-scale').selectOption('impact');
    await page.locator('#design-contentWidth').selectOption('wide');
    await page.locator('#design-navigation').selectOption('floating');
    await page.locator('#design-accent').fill('#935120');
    await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('--accent:#935120'));
    assert.match(await page.locator('#preview').getAttribute('srcdoc'),/--font-family:Georgia/);
    assert.equal(await frame.locator('.site-floating').count(),1);
    await page.locator('#sections .section-select').first().click();
    await page.locator('#layout-width').selectOption('wide');
    await page.locator('#layout-density').selectOption('spacious');
    await page.locator('#layout-reverse').check();
    await frame.locator('.hero.layout-reverse.layout-width-wide').waitFor();
    assert.equal(await frame.locator('.hero.layout-density-spacious').count(),1);
    assert.match(await page.locator('#preview').getAttribute('srcdoc'),/site-type-impact/);
    assert.match(await page.locator('#preview').getAttribute('srcdoc'),/--site-width:1360px/);
    await page.locator('#section-surface').selectOption('dark');
    await frame.locator('main > section.surface-dark').waitFor();
    assert.equal(await frame.locator('main > section.surface-dark').count(),1);
    await page.locator('#undo').click();
    await frame.locator('main > section.surface-dark').waitFor({state:'detached'});
    assert.equal(await frame.locator('main > section.surface-dark').count(),0);
    await page.locator('#redo').click();
    await frame.locator('main > section.surface-dark').waitFor();
    assert.equal(await frame.locator('main > section.surface-dark').count(),1);
    const rejectUnsafe=await page.evaluate(()=>{
      const P=window.CmsPreviewProject,d=P.template();
      d.design.accent='#ffffff;url(http://example.org)';
      try{P.validate(d);return false;}catch(e){}
      d.design.accent='';d.pages[0].sectionStyles['unknown-id']='dark';
      try{P.validate(d);return false;}catch(e){return true;}
    });
    assert.equal(rejectUnsafe,true);
    // Old v2 and v3 JSON snapshots migrate without losing edited content.
    const legacy=await page.evaluate(()=>{
      const P=window.CmsPreviewProject;
      const v=P.starter('agency');
      v.format=P.legacyV2;delete v.settings;delete v.design;delete v.contacts;delete v.media;
      v.pages.forEach(pg=>{delete pg.inMenu;delete pg.hiddenSections;delete pg.sectionStyles;delete pg.mediaSlots;delete pg.sectionActions;delete pg.repeaters;});
      const migrated=P.normalize(v);
      return {format:migrated.format,pages:migrated.pages.length,settings:migrated.settings,valid:P.validate(migrated).format};
    });
    assert.equal(legacy.format,legacy.valid);
    assert.equal(legacy.pages,3);
    assert.equal(legacy.settings.showNavigation,true);
    const oldV3=await page.evaluate(()=>{
      const P=window.CmsPreviewProject,v=P.starter('products');
      v.format=P.legacyV3;delete v.design;delete v.contacts;delete v.media;
      v.pages.forEach(pg=>{delete pg.sectionStyles;delete pg.mediaSlots;delete pg.sectionActions;delete pg.repeaters;});
      return P.normalize(v);
    });
    assert.equal(oldV3.pages.length,3);
    assert.equal(oldV3.design.font,'system');
    assert.equal(Object.keys(oldV3.pages[0].sectionStyles).length,0);
    const oldV4=await page.evaluate(()=>{
      const P=window.CmsPreviewProject,v=P.starter('agency');
      v.format=P.olderFormat;delete v.contacts;delete v.media;
      v.pages.forEach(pg=>{delete pg.mediaSlots;delete pg.sectionActions;delete pg.repeaters;});
      return P.normalize(v);
    });
    assert.equal(oldV4.pages.length,3);
    assert.equal(oldV4.design.radius,'round');
    const oldV5=await page.evaluate(()=>{
      const P=window.CmsPreviewProject,v=P.starter('industrial');
      v.format=P.legacyV5;delete v.contacts;
      v.pages.forEach(pg=>{delete pg.sectionActions;delete pg.repeaters;});
      return P.normalize(v);
    });
    assert.equal(oldV5.pages.length,3);
    assert.equal(oldV5.media.length,0);
    assert.equal(oldV5.contacts.email,'');
    const oldV6=await page.evaluate(()=>{
      const P=window.CmsPreviewProject,v=P.starter('products');
      v.format=P.legacyV6;
      v.pages.forEach(pg=>{delete pg.repeaters;});
      return P.normalize(v);
    });
    assert.equal(oldV6.pages[0].repeaters[oldV6.pages[0].sections.find(s=>s.type==='catalog').id].length,3);
    const oldV7=await page.evaluate(()=>{
      const P=window.CmsPreviewProject,v=P.starter('products');
      v.format=P.legacyV7;
      v.settings={headerNote:'Сохранённая подпись',footerNote:'Сохранённый подвал',showNavigation:true};
      return P.normalize(v);
    });
    assert.equal(oldV7.pages.length,3);
    assert.equal(oldV7.settings.headerNote,'Сохранённая подпись');
    assert.equal(oldV7.settings.publicUrl,'');
    assert.equal(oldV7.settings.logoAssetId,'');
    const oldV8=await page.evaluate(()=>{
      const P=window.CmsPreviewProject,v=P.starter('industrial');
      v.format=P.legacyV8;delete v.design.scale;delete v.design.contentWidth;
      v.pages.forEach(pg=>delete pg.sectionLayouts);
      return P.normalize(v);
    });
    assert.equal(oldV8.design.scale,'balanced');
    assert.equal(oldV8.design.contentWidth,'standard');
    assert.equal(Object.keys(oldV8.pages[0].sectionLayouts).length,0);
    const oldV9=await page.evaluate(()=>{
      const P=window.CmsPreviewProject,v=P.starter('industrial');
      v.format=P.previousFormat;delete v.library;
      v.pages.forEach(pg=>delete pg.libraryLinks);
      return P.normalize(v);
    });
    assert.equal(oldV9.format,'ai-site-cms-stage2-multipage-preview-v10');
    assert.equal(oldV9.library.length,0);
    assert.equal(Object.keys(oldV9.pages[0].libraryLinks).length,0);

    // Full media workflow: import local JPG/PNG, browser-only WebP conversion,
    // assign to a hero, preview safely, export as a relative offline asset.
    const png=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=200;canvas.height=130;
      const context=canvas.getContext('2d');context.fillStyle='#345678';context.fillRect(0,0,200,130);
      context.fillStyle='#badcfe';context.fillRect(25,15,150,100);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await page.locator('#media-file').setInputFiles({
      name:'factory-photo.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')
    });
    await page.locator('#media-list img').first().waitFor({state:'attached'});
    assert.equal(await page.locator('#media-count').innerText(),'1');
    await page.locator('#media-binding-fields select').first().selectOption({index:1});
    await frame.locator('.hero-photo').waitFor();
    assert.equal(await frame.locator('.hero-photo').getAttribute('alt'),'factory photo');
    await page.locator('#save').click();
    await page.reload();
    assert.equal(await page.locator('#media-count').innerText(),'1');
    assert.equal(await frame.locator('.hero-photo').count(),1);
    // Unified brand + additional footer page links + optional public HTTPS origin.
    await page.locator('.site-settings > summary').click();
    await page.locator('#site-logo').selectOption({index:1});
    await frame.locator('.site-logo').waitFor();
    await page.locator('#site-footer-pages input').nth(2).check();
    await page.locator('.seo-settings > summary').click();
    await page.locator('#site-public-url').fill('https://factory.example.org/');
    await page.locator('#site-public-url').press('Tab');
    assert.equal(await page.locator('#site-public-url').inputValue(),'https://factory.example.org');
    assert.equal(await frame.locator('.footer-pages [data-preview-page]').count(),1);
    const mobilePageId=await page.locator('#page-list option').nth(1).getAttribute('value');
    await page.locator('[data-width=mobile]').click();
    await frame.locator('.mobile-nav').waitFor();
    assert.equal(await frame.locator('.mobile-nav').evaluate(el=>getComputedStyle(el).display),'block');
    await frame.locator('.mobile-nav > summary').click();
    await frame.locator('.mobile-nav-menu [data-preview-page]').nth(1).click();
    await page.waitForFunction(id=>document.querySelector('#page-list').value===id,mobilePageId);
    await frame.locator('.site-brand').click({force:true});
    await page.waitForFunction(()=>document.querySelector('#page-list').selectedIndex===0);
    await page.locator('[data-width=desktop]').click();
    // Global company contacts, dynamic link destinations and reliable site export.
    await page.locator('.contact-settings > summary').click();
    await page.locator('#contact-email').fill('sales@example.com');
    await page.locator('#contact-email').press('Tab');
    await page.locator('#contact-phone').fill('+375 29 123 45 67');
    await page.locator('#contact-phone').press('Tab');
    await page.locator('#contact-address').fill('Минск, промышленная улица, 10');
    await page.locator('#contact-address').press('Tab');
    await frame.locator('.header-contact').waitFor();
    assert.match(await frame.locator('.foot .contact-points').innerText(),/sales@example.com/);
    await page.locator('#section-action').selectOption('email');
    await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('Контактная ссылка доступна'));
    const otherPageId=await page.locator('#page-list option').nth(1).getAttribute('value');
    await page.locator('#section-action').selectOption('page:'+otherPageId);
    await frame.locator('.hero button[data-preview-page]').waitFor();
    await frame.locator('.hero button[data-preview-page]').click();
    await page.waitForFunction(id=>document.querySelector('#page-list').value===id,otherPageId);
    await page.locator('#page-list').selectOption({index:0});
    await page.locator('#section-action').selectOption('email');
    await page.locator('#save').click();
    await page.reload();
    assert.equal(await page.locator('#contact-email').inputValue(),'sales@example.com');
    assert.equal(await page.locator('#section-action').inputValue(),'email');
    assert.equal(await page.locator('#site-logo').inputValue(),await page.locator('#media-list .media-item img').first().evaluate(img=>img.closest('.media-item').querySelector('input')?.getAttribute('aria-label')?.replace('Описание изображения для ','')||''));
    // End-to-end repeatable content: FAQ + catalog can grow, reorder and
    // link to the existing local media library, survive reload and HTML ZIP.
    await page.locator('#sections li').filter({hasText:'Вопросы и ответы'}).locator('.section-select').click();
    await page.locator('#repeater-panel').waitFor();
    assert.equal(await page.locator('.repeater-item').count(),2);
    await page.locator('#repeater-add').click();
    assert.equal(await page.locator('.repeater-item').count(),3);
    await page.locator('.repeater-item').nth(2).locator('input.repeater-field').fill('Можно ли изменить количество товаров?');
    await page.locator('.repeater-item').nth(2).locator('textarea.repeater-field').fill('Да, элементы добавляются и меняют порядок.');
    await frame.locator('.faq details').nth(2).waitFor();
    await page.locator('.repeater-item').nth(2).getByRole('button',{name:'Поднять элемент'}).click();
    await frame.locator('.faq details').nth(1).filter({hasText:'Можно ли изменить количество товаров?'}).waitFor();
    await page.locator('#new-type').selectOption('catalog');
    await page.locator('#add').click();
    assert.equal(await page.locator('.repeater-item').count(),3);
    await page.locator('#repeater-add').click();
    await page.locator('.repeater-item').nth(3).locator('input.repeater-field').fill('Модель Г — новый товар');
    await page.locator('.repeater-item').nth(3).locator('textarea.repeater-field').fill('Четвёртая карточка в каталоге.');
    await page.locator('.repeater-item').nth(3).locator('select.repeater-photo').selectOption({index:1});
    await page.locator('#layout-columns').selectOption('two');
    await page.locator('#layout-align').selectOption('center');
    await frame.locator('.layout-cols-two.layout-align-center').waitFor();
    await frame.locator('.studio-product').nth(3).locator('img').waitFor();
    // Library reuse: save an entire typed catalog including four repeater rows
    // and local WebP association, insert on another page, explicitly publish
    // an update from source, retain target layout, and persist the links.
    if(!await page.locator('.sidebar-tools').evaluate(el=>el.open))
      await page.locator('.sidebar-tools > summary').click();
    await page.locator('#library-name').fill('Единый каталог оборудования');
    await page.locator('#library-save').click();
    assert.equal(await page.locator('#library-total').innerText(),'1 / 12');
    assert.match(await page.locator('#library-link-title').innerText(),/Единый каталог/);
    const libraryId=await page.locator('#library-select').inputValue();
    await page.locator('#page-list').selectOption({index:1});
    await page.locator('#library-select').selectOption(libraryId);
    await page.locator('#library-insert').click();
    assert.equal(await page.locator('.repeater-item').count(),4);
    await frame.locator('.studio-product').nth(3).locator('img').waitFor();
    await page.locator('#layout-width').selectOption('narrow');
    await page.locator('#page-list').selectOption({index:0});
    await page.locator('#sections li').filter({hasText:'Каталог продукции'}).locator('.section-select').click();
    await page.locator('#fields input').nth(1).fill('Каталог завода — обновлён');
    await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('Каталог завода — обновлён'));
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#library-publish').click();
    assert.match(await page.locator('#library-link-title').innerText(),/v2/);
    await page.locator('#page-list').selectOption({index:1});
    await page.locator('#sections li').last().locator('.section-select').click();
    assert.equal(await page.locator('#layout-width').inputValue(),'narrow');
    await frame.locator('.studio-product').nth(3).locator('img').waitFor();
    assert.match(await frame.locator('main').innerText(),/Каталог завода — обновлён/);
    await page.locator('#page-list').selectOption({index:0});
    await page.locator('#save').click();
    await page.reload();
    await page.locator('#sections li').filter({hasText:'Каталог продукции'}).locator('.section-select').click();
    assert.equal(await page.locator('.repeater-item').count(),4);
    assert.equal(await page.locator('.repeater-item').nth(3).locator('input.repeater-field').inputValue(),'Модель Г — новый товар');
    // Product flow C: download a real offline ZIP with navigation, per-page SEO and a JSON backup.
    const zipped=page.waitForEvent('download');
    await page.locator('#project-actions summary').click();
    await page.locator('#download-site').click();
    const zip=await zipped;
    const zipPath=await zip.path();
    const zipFiles=execFileSync('unzip',['-Z1',zipPath],{encoding:'utf8'}).trim().split('\n');
    assert.ok(zipFiles.includes('index.html')&&zipFiles.includes('services.html'));
    assert.ok(zipFiles.includes('project-backup.json')&&zipFiles.includes('README.txt'));
    const webpName=zipFiles.find(name=>/^media\/asset-[a-z0-9-]+\.webp$/.test(name));
    assert.ok(webpName,'binary optimized photo must be included in the archive');
    const webp=execFileSync('unzip',['-p',zipPath,webpName]);
    assert.equal(webp.toString('ascii',0,4),'RIFF');
    const siteHTML=execFileSync('unzip',['-p',zipPath,'index.html'],{encoding:'utf8'});
    assert.doesNotMatch(siteHTML.match(/<nav class="menu menu-desktop"[^>]*>[\s\S]*?<\/nav>/)?.[0]||'',/href="services\.html"/,'excluded page is absent from primary navigation');
    assert.doesNotMatch(siteHTML,/class="cards"/,'hidden section omitted from exported HTML');
    assert.match(siteHTML,/Производственные решения/);
    assert.match(siteHTML,/Пример компании 2026/);
    assert.match(siteHTML,/--accent:#935120/);
    assert.match(siteHTML,/class="surface-dark[^"]*hero"/);
    assert.match(siteHTML,/class="surface-dark layout-width-wide layout-density-spacious layout-reverse hero"/);
    assert.match(siteHTML,/--site-width:1360px/);
    assert.match(siteHTML,/site-type-impact/);
    assert.match(siteHTML,/class="layout-align-center layout-cols-two section soft"/);
    assert.match(siteHTML,/site-floating/);
    assert.match(siteHTML,/src="media\/asset-[a-z0-9-]+\.webp"/);
    assert.match(siteHTML,/class="site-logo" src="media\/asset-[a-z0-9-]+\.webp"/);
    assert.match(siteHTML,/<nav class="footer-pages"[^>]*><a href="services\.html"/);
    assert.match(siteHTML,/<link rel="canonical" href="https:\/\/factory\.example\.org\/"/);
    assert.match(siteHTML,/<meta property="og:url" content="https:\/\/factory\.example\.org\/"/);
    assert.match(siteHTML,/class="mobile-nav-menu"/);
    assert.match(siteHTML,/img-src &#39;self&#39; data: file:/);
    assert.ok(zipFiles.includes('sitemap.xml')&&zipFiles.includes('robots.txt'));
    const sitemap=execFileSync('unzip',['-p',zipPath,'sitemap.xml'],{encoding:'utf8'});
    const robots=execFileSync('unzip',['-p',zipPath,'robots.txt'],{encoding:'utf8'});
    assert.match(sitemap,/<loc>https:\/\/factory\.example\.org\/services\.html<\/loc>/);
    assert.match(robots,/Sitemap: https:\/\/factory\.example\.org\/sitemap\.xml/);
    assert.doesNotMatch(siteHTML,/data:image\/webp;base64/);
    assert.match(siteHTML,/<meta name="description"/);
    assert.match(siteHTML,/<meta property="og:title"/);
    assert.match(siteHTML,/href="mailto:sales@example\.com"/);
    assert.match(siteHTML,/href="tel:\+375291234567"/);
    assert.match(siteHTML,/Минск, промышленная улица, 10/);
    assert.match(siteHTML,/Можно ли изменить количество товаров\?/);
    assert.match(siteHTML,/Модель Г — новый товар/);
    assert.equal((siteHTML.match(/class="studio-product"/g)||[]).length,4);
    const backup=JSON.parse(execFileSync('unzip',['-p',zipPath,'project-backup.json'],{encoding:'utf8'}));
    assert.equal(backup.format,'ai-site-cms-stage2-multipage-preview-v10');
    assert.equal(backup.design.scale,'impact');
    assert.equal(backup.design.contentWidth,'wide');
    assert.equal(backup.pages[0].sectionLayouts[backup.pages[0].sections[0].id].reverse,true);
    assert.equal(backup.settings.publicUrl,'https://factory.example.org');
    assert.equal(backup.settings.logoAssetId,backup.media[0].id);
    assert.equal(backup.settings.footerPageIds.length,1);
    assert.equal(backup.pages.find(p=>p.slug==='services').inMenu,false);
    assert.equal(backup.pages[0].hiddenSections.length,1);
    assert.equal(backup.design.accent,'#935120');
    assert.equal(backup.design.font,'editorial');
    assert.equal(backup.media.length,1);
    assert.equal(backup.contacts.email,'sales@example.com');
    assert.equal(backup.contacts.phone,'+375 29 123 45 67');
    assert.equal(Object.values(backup.pages[0].sectionActions)[0],'email');
    assert.equal(Object.keys(backup.pages[0].mediaSlots).length,1);
    const faqData=backup.pages[0].sections.find(s=>s.type==='faq');
    const catalogData=backup.pages[0].sections.find(s=>s.type==='catalog');
    assert.equal(backup.pages[0].repeaters[faqData.id].length,3);
    assert.equal(backup.pages[0].repeaters[catalogData.id].length,4);
    assert.equal(backup.pages[0].repeaters[catalogData.id][3].image,backup.media[0].id);
    assert.equal(backup.library.length,1);
    assert.equal(backup.library[0].revision,2);
    assert.equal(backup.library[0].items.length,4);
    assert.equal(backup.library[0].items[3].image,backup.media[0].id);
    assert.equal(backup.pages[0].libraryLinks[catalogData.id],backup.library[0].id);
    const used=backup.pages[1].sections.find(x=>x.type==='catalog'&&
      x.props.title==='Каталог завода — обновлён'&&
      backup.pages[1].libraryLinks[x.id]===backup.library[0].id);
    assert.ok(used,'the updated linked catalog must survive export');
    assert.equal(backup.pages[1].sectionLayouts[used.id].width,'narrow');
    assert.equal(used.props.title,'Каталог завода — обновлён');
    assert.equal(Object.values(backup.pages[0].sectionStyles).filter(v=>v==='dark').length,1);
    assert.ok(backup.pages[0].sections.some(section=>section.id===backup.pages[0].hiddenSections[0]));
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
    if(!await page.locator('.sidebar-tools').evaluate(el=>el.open))await page.locator('.sidebar-tools > summary').click();
    await page.locator('.audit-panel summary').click();
    assert.ok((await page.locator('#audit-count').innerText()).length>0);
    await page.locator('#save').click();
    await page.reload();
    assert.equal(await page.locator('#page-list option').count(),3);
    assert.ok(await page.locator('#new-type option').count()>=11);
    if(process.env.GITHUB_ACTIONS==='true'){
      await page.screenshot({path:path.join(root,'stage2-preview','screenshots','preset-studio.png'),fullPage:true});
    }
    // Owner-ready offline KIT: unzip GitHub artifact bytes, open actual copied
    // Jedison bundle without Node/PHP and edit a block by clicking the canvas.
    const kitZip=path.join(root,'stage2-preview','out','ai-site-cms-stage2-owner-review-kit.zip');
    assert.ok(fs.existsSync(kitZip),'CI must build the click-to-open owner kit');
    const kitDir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'ai-site-cms-kit-smoke-'));
    try{
      execFileSync('unzip',['-q',kitZip,'-d',kitDir]);
      const kit=await browser.newPage({viewport:{width:1440,height:900}});
      try{
        const kitErrors=[],kitRemote=[];
        kit.on('pageerror',e=>kitErrors.push(e.message));
        kit.on('request',r=>{if(/^https?:/i.test(r.url()))kitRemote.push(r.url());});
        await kit.goto(pathToFileURL(path.join(kitDir,'stage2-preview','index.html')).href);
        await kit.locator('#sections li').first().waitFor();
        assert.equal(await kit.locator('#page-tree .page-tree-item.is-active').count(),1);
        assert.equal(await kit.locator('#sections li').count(),5);
        const actual=kit.frameLocator('#preview');
        await actual.locator('h1').waitFor();
        // Select the second block by clicking visible content, not sidebar.
        await actual.locator('main > section').nth(1).click({position:{x:100,y:80}});
        await kit.locator('#sections li.selected').waitFor();
        assert.match(await kit.locator('#selection-info').innerText(),/Преимущества/);
        // The in-canvas menu swaps the page and inspector in the parent editor.
        kit.once('dialog',dialog=>dialog.accept());
        await kit.locator('#starter-type').selectOption('industrial');
        await kit.locator('#starter-apply').click();
        await actual.locator('.menu-desktop [data-preview-page]').nth(1).click();
        assert.match(await kit.locator('#preview-url').innerText(),/products/);
        await actual.locator('.studio-product').first().waitFor();
        await kit.locator('#expand-preview').click();
        assert.equal(await kit.locator('body.preview-expanded').count(),1);
        await kit.keyboard.press('Escape');
        assert.equal(await kit.locator('body.preview-expanded').count(),0);
        // Collect owner feedback on the selected page/section, export one
        // Markdown file, then reload and confirm notes persist locally.
        await kit.locator('.review-notes > summary').click();
        await kit.locator('#review-text').fill('Укажите реальные характеристики продукции');
        await kit.locator('#review-add').click();
        assert.equal(await kit.locator('#review-count').innerText(),'1');
        assert.match(await kit.locator('#review-list').innerText(),/реальные характеристики продукции/);
        const feedbackDownload=kit.waitForEvent('download');
        await kit.locator('#review-export').click();
        const feedback=await feedbackDownload;
        const noteContent=fs.readFileSync(await feedback.path(),'utf8');
        assert.match(noteContent,/Продукция/);
        assert.match(noteContent,/Укажите реальные характеристики продукции/);
        await kit.locator('#save').click();
        await kit.reload();
        assert.equal(await kit.locator('#review-count').innerText(),'1');
        assert.deepEqual(kitErrors,[],'distributable offline kit must have no JS errors');
        assert.deepEqual(kitRemote,[],'owner kit must never request a server');
        if(process.env.GITHUB_ACTIONS==='true'){
          await kit.screenshot({path:path.join(root,'stage2-preview','screenshots','owner-review-ready.png'),fullPage:true});
        }
      }finally{await kit.close();}
    }finally{fs.rmSync(kitDir,{recursive:true,force:true});}
    assert.deepEqual(errors,[],'no browser JS errors');
    assert.deepEqual(remote,[],'no HTTP calls from demo/editor/site preview');
    console.log('Stage2 OWNER REVIEW KIT PASS: standalone editor ZIP, canvas block click, menu navigation, fullscreen, owner feedback Markdown+persist, starter sites, offline site ZIP and ZERO network.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
