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
    page.on('pageerror',e=>{errors.push(e.message);console.error('STAGE3 STARTUP ERROR:',e.stack||e.message);});
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

    // Product-level component catalog: create and edit four first-party layouts.
    for(const [type,label,field,value] of [
      ['pricing-plans','Тарифы · планы с услугами','content.price','450 BYN'],
      ['process-timeline','Этапы работы · дорожная карта','content.title','Согласование'],
      ['comparison-matrix','Сравнение · два варианта','content.metric','Поддержка'],
      ['content-switcher','Переключатель · интерактивные вкладки','content.title','Первый вариант']
    ]){
      await page.locator('#section-catalog').click();
      await page.locator('#cms-component-search').fill(type);
      await page.locator('#cms-component-list [data-component="'+type+'"]').click();
      await page.locator('#sections .nav-entry').filter({hasText:label}).click();
      assert.equal(await page.locator('#elements [data-repeat-id]').count(),2);
      await page.locator('#elements [data-repeat-id]').first().click();
      const changed=page.locator('#fields [data-field="'+field+'"]');
      await changed.fill(value);
      await changed.dispatchEvent('change');
      await canvas.locator('.cms-section-skin').getByText(value,{exact:false}).first().waitFor();
      const exported=await page.evaluate(()=>window.Stage3Editor.getSite());
      assert.equal(exported.pages.flatMap(p=>p.sections).find(s=>s.component===type).items[0].values[field],value);
    }
    // Chromium checks the actual authored document in a stable visitor page.
    // The editor iframe refreshes after edits, so testing a click inside that
    // transient navigation races with redraw rather than testing interaction.
    const previewHtml=await canvas.locator('html').evaluate(el=>el.outerHTML);
    const visitorPage=await ctx.newPage();
    visitorPage.on('request',r=>{if(/^https?:/i.test(r.url()))remote.push(r.url());});
    await visitorPage.setContent(previewHtml,{waitUntil:'load'});
    const switchPreview=visitorPage.locator('.cms-switcher-panel');
    assert.equal(await switchPreview.first().isVisible(),true);
    assert.equal(await switchPreview.nth(1).isVisible(),false);
    await visitorPage.locator('.cms-switcher-tab').nth(1).click();
    assert.equal(await visitorPage.locator('.cms-switcher-radio').nth(1).isChecked(),true,
      'Real visitor click on the visible label activates radio');
    assert.equal(await switchPreview.first().isVisible(),false);
    assert.equal(await switchPreview.nth(1).isVisible(),true,
      'Published-style HTML switches panels with CSS only and no scripts');
    await visitorPage.close();
    await page.locator('#undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='content-switcher').items[0].values['content.title'],
      'Название вкладки');
    await page.locator('#redo').click();

    // Visual 3-mode gallery is a first-party CMS component, not a standalone
    // Workbench demo: change layout in Inspector, then verify draft+preview.
    await page.locator('#section-catalog').click();
    await page.locator('#cms-component-search').fill('adaptive-gallery');
    await page.locator('#cms-component-list [data-component="adaptive-gallery"]').click();
    await page.locator('#sections .nav-entry').filter({hasText:'Адаптивная галерея'}).click();
    assert.equal(await page.locator('#elements [data-repeat-id]').count(),2);
    await page.locator('#elements .element').filter({hasText:'Варианты отображения'}).click();
    await page.locator('#fields [data-field="behavior.layout"]').selectOption('masonry');
    await canvas.locator('.cms-gallery-masonry').waitFor();
    await page.locator('#fields [data-field="behavior.columns"]').fill('4');
    await page.locator('#fields [data-field="behavior.columns"]').dispatchEvent('change');
    await page.locator('#fields [data-field="behavior.layout"]').selectOption('carousel');
    await canvas.locator('.cms-gallery-carousel[tabindex="0"]').waitFor();
    const galleryState=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='adaptive-gallery');
    assert.equal(galleryState.elements[1].values['behavior.layout'],'carousel');
    assert.equal(galleryState.elements[1].values['behavior.columns'],4);
    await page.locator('#undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages.flatMap(p=>p.sections)
      .find(s=>s.component==='adaptive-gallery').elements[1].values['behavior.layout'],'masonry');
    await page.locator('#redo').click();
    await canvas.locator('.cms-gallery-carousel').waitFor();

    // Opt-in field builder is usable in Chromium, Undo and real draft preview.
    await page.locator('#section-catalog').click();
    await page.locator('#cms-component-search').fill('конструктор');
    await page.locator('#cms-component-list [data-component="lead-form-flex"]').click();
    await page.locator('#cms-form-builder-open').click();
    await page.locator('#cms-form-add').click();
    const question=page.locator('#cms-form-rows [data-form-field]').first();
    await question.locator('input[type=text]').first().fill('Номер заказа');
    await question.locator('input[type=text]').first().dispatchEvent('change');
    await question.locator('input[type=checkbox]').check();
    await page.locator('#cms-form-apply').click();
    const built=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex');
    assert.equal(built.formFields[0].label,'Номер заказа');
    assert.equal(built.formFields[0].required,true);
    await canvas.locator('.contact').getByText('Номер заказа').waitFor();
    await page.locator('#undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex').formFields,undefined);
    await page.locator('#redo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex').formFields.length,1);

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

    // Appearance panel changes only the selected block; preview reacts immediately.
    await page.locator('#cms-appearance-dialog').count();
    await page.locator('#section-appearance').click();
    await page.locator('#cms-appearance-surface').selectOption('dark');
    await page.locator('#cms-appearance-spacing').selectOption('airy');
    await page.locator('#cms-appearance-align').selectOption('center');
    await page.locator('#cms-appearance-width').selectOption('narrow');
    await page.locator('#cms-appearance-heading').selectOption('expressive');
    await page.locator('#cms-appearance-corners').selectOption('round');
    await page.locator('#cms-appearance-button').selectOption('pill');
    await page.locator('#cms-appearance-mobileAlign').selectOption('left');
    await page.locator('#cms-appearance-mobileSpacing').selectOption('tight');
    await page.locator('#cms-appearance-apply').click();
    assert.match((await canvas.locator('.cms-section-skin').getAttribute('class')),/cms-surface-dark cms-spacing-airy cms-align-center/);
    assert.match((await canvas.locator('.cms-section-skin').getAttribute('class')),/cms-width-narrow cms-heading-expressive cms-corners-round cms-mobile-align-left cms-mobile-spacing-tight cms-button-pill/);
    await page.locator('#undo').click();
    await canvas.locator('.cms-surface-default').waitFor();

    // Full menu composer creates nested navigation, CTA and mobile layout
    // through one immutable Undo/Redo-compatible site document transaction.
    await page.locator('#cms-menu-open').click();
    await page.locator('#cms-menu-editor').waitFor({state:'visible'});
    await page.locator('#cms-menu-editor select').first().selectOption('bold');
    await page.locator('#cms-menu-editor input[type="checkbox"]').first().check();
    await page.locator('#cms-menu-editor select').nth(1).selectOption('expanded');
    await page.locator('#cms-menu-editor select').nth(2).selectOption('page-contact');
    await page.locator('#cms-menu-cta-label').fill('Написать нам');
    await page.locator('#cms-menu-cta-label').dispatchEvent('change');
    const contactMenu=page.locator('[data-menu-page="page-contact"]');
    await contactMenu.locator('input[type=text]').fill('Контакты и поддержка');
    await contactMenu.locator('input[type=text]').dispatchEvent('change');
    await contactMenu.locator('select').selectOption('page-home');
    await page.locator('#cms-menu-apply').click();
    let menuSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(menuSite.menu.style,'bold');
    assert.equal(menuSite.menu.mobile,'expanded');
    assert.equal(menuSite.menu.ctaPageId,'page-contact');
    assert.equal(menuSite.pages[1].navigation.parentId,'page-home');
    assert.equal(menuSite.pages[1].navigation.label,'Контакты и поддержка');
    await page.locator('#undo').click();
    menuSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(menuSite.menu,undefined);
    await page.locator('#redo').click();
    menuSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(menuSite.menu.ctaLabel,'Написать нам');

    // Inspect a complete draft page at device widths without publishing or
    // enabling scripts/network for the iframe.
    await page.locator('#cms-open-page-preview').click();
    await page.locator('#cms-page-preview').waitFor({state:'visible'});
    assert.equal(await page.locator('#cms-page-preview-frame').getAttribute('sandbox'),'');
    await page.frameLocator('#cms-page-preview-frame').locator('h1').first().waitFor();
    await page.locator('#cms-page-preview-path').selectOption('/contact/');
    await page.frameLocator('#cms-page-preview-frame').locator('.contact').first().waitFor();
    await page.frameLocator('#cms-page-preview-frame').locator('.cms-menu-preview .cms-menu-cta').getByText('Написать нам').waitFor();
    assert.equal(await page.frameLocator('#cms-page-preview-frame').locator('.cms-menu-mobile a').count(),2);
    await page.locator('.cms-page-preview-modes [data-mode="mobile"]').click();
    assert.equal(await page.locator('#cms-page-preview-frame').evaluate(x=>x.style.width),'390px');
    await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();
    // No-AI Design Graph editing in the actual offline CMS inspector.
    // A template is never flattened or erased: it remains as rollback fallback.
    const selectedSection=await page.evaluate(()=>window.Stage3Editor.selection().sectionId);
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#section-design-graph').click();
    await page.locator('#cms-design-graph-dialog').waitFor({state:'visible'});
    const designFrame=page.frameLocator('#cms-design-preview-frame');
    assert.equal(await page.locator('#cms-design-preview-frame').getAttribute('sandbox'),'allow-same-origin',
      'Visual picker never grants iframe script or navigation privileges');
    await designFrame.locator('.cmsdg h2').first().waitFor();
    assert.equal(await page.locator('#cms-design-preview-frame').evaluate(x=>x.style.width),'1200px');
    // Clicking a visual element selects the exact existing typed node.
    await designFrame.locator('.cmsdg h2').first().click();
    assert.equal(await page.locator('#cms-design-node-select').inputValue(),selectedSection+'-title');
    assert.equal(await designFrame.locator('.cmsdg h2').getAttribute('data-cms-design-selected'),'true');
    await page.locator('.cms-design-device-tools [data-design-device="tablet"]').click();
    assert.equal(await page.locator('#cms-design-preview-frame').evaluate(x=>x.style.width),'780px');
    assert.equal(await page.locator('#cms-design-breakpoint').inputValue(),'tablet');
    await page.locator('.cms-design-device-tools [data-design-device="mobile"]').click();
    assert.equal(await page.locator('#cms-design-preview-frame').evaluate(x=>x.style.width),'390px');
    assert.equal(await page.locator('#cms-design-breakpoint').inputValue(),'mobile');
    await page.locator('.cms-design-device-tools [data-design-device="desktop"]').click();
    assert.equal(await page.locator('#cms-design-breakpoint').inputValue(),'desktop');
    assert.equal(await page.locator('#cms-design-undo').isDisabled(),true);
    assert.equal(await page.locator('#cms-design-redo').isDisabled(),true);
    // Drag a node to a sibling's far edge: this is a real canvas reorder.
    const titleNode=designFrame.locator('.cmsdg-n-'+selectedSection+'-title');
    const copyNode=designFrame.locator('.cmsdg-n-'+selectedSection+'-copy');
    const titleBox=await titleNode.boundingBox(),copyBox=await copyNode.boundingBox();
    await page.mouse.move(titleBox.x+titleBox.width/2,titleBox.y+titleBox.height/2);
    await page.mouse.down();
    await page.mouse.move(copyBox.x+copyBox.width-3,copyBox.y+copyBox.height/2,{steps:8});
    await page.mouse.up();
    await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').waitFor();
    let order=await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').evaluate(e=>
      Array.from(e.parentElement.children).map(x=>x.className.match(/cmsdg-n-([^ ]+)/)?.[1]));
    assert.ok(order.indexOf(selectedSection+'-copy')<order.indexOf(selectedSection+'-title'),
      'Dragging a node reorders siblings in the graph');
    await page.locator('#cms-design-undo').click();
    await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').waitFor();
    order=await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').evaluate(e=>
      Array.from(e.parentElement.children).map(x=>x.className.match(/cmsdg-n-([^ ]+)/)?.[1]));
    assert.ok(order.indexOf(selectedSection+'-title')<order.indexOf(selectedSection+'-copy'),
      'Undo restores the previous tree order');
    await page.locator('#cms-design-redo').click();
    await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').waitFor();
    order=await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').evaluate(e=>
      Array.from(e.parentElement.children).map(x=>x.className.match(/cmsdg-n-([^ ]+)/)?.[1]));
    assert.ok(order.indexOf(selectedSection+'-copy')<order.indexOf(selectedSection+'-title'),
      'Redo reapplies the tree order');
    // Alt-drag applies a snapped, breakpoint-aware translation without changing structure.
    await page.keyboard.down('Alt');
    const movedBox=await titleNode.boundingBox();
    await page.mouse.move(movedBox.x+movedBox.width/2,movedBox.y+movedBox.height/2);
    await page.mouse.down();
    await page.mouse.move(movedBox.x+movedBox.width/2+24,movedBox.y+movedBox.height/2+16,{steps:6});
    await page.mouse.up();
    await page.keyboard.up('Alt');
    await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').waitFor();
    assert.notEqual(await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').evaluate(e=>getComputedStyle(e).translate),'none',
      'Alt-drag creates a free-positioning transform');
    // Resize handles commit width/height into the active breakpoint's typed style.
    const resizeHandle=designFrame.locator('.cms-design-resize-handle[data-resize-dir="se"]');
    await resizeHandle.waitFor();
    const handleBox=await resizeHandle.boundingBox();
    await page.mouse.move(handleBox.x+handleBox.width/2,handleBox.y+handleBox.height/2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x+handleBox.width/2+40,handleBox.y+handleBox.height/2+24,{steps:6});
    await page.mouse.up();
    await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').waitFor();
    assert.ok(await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').evaluate(e=>e.getBoundingClientRect().width)>0,
      'Canvas resize is reflected in the rendered element');
    await page.locator('.cms-design-device-tools [data-design-device="mobile"]').click();
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-title');
    const mobileResize=designFrame.locator('.cms-design-resize-handle[data-resize-dir="w"]');
    await mobileResize.waitFor();
    const mobileHandleBox=await mobileResize.boundingBox();
    await page.mouse.move(mobileHandleBox.x+mobileHandleBox.width/2,mobileHandleBox.y+mobileHandleBox.height/2);
    await page.mouse.down();
    await page.mouse.move(mobileHandleBox.x+mobileHandleBox.width/2+16,mobileHandleBox.y+mobileHandleBox.height/2,{steps:4});
    await page.mouse.up();
    await page.locator('#cms-design-fit-width').click();
    await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').waitFor();
    assert.ok(await designFrame.locator('.cmsdg-n-'+selectedSection+'-title').evaluate(e=>e.getBoundingClientRect().width<=390),
      'Fit-to-screen control brings a clipped fixed-width node into the mobile viewport');
    await page.locator('.cms-design-device-tools [data-design-device="desktop"]').click();
    // Create a second container and a child, then reparent the heading by dropping
    // onto that child's center. The container ancestor should win over the child hit.
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-layout');
    await page.getByRole('button',{name:'+ Рядом'}).click();
    const extraContainerId=await page.locator('#cms-design-node-select').inputValue();
    await page.getByRole('button',{name:'+ Вложенный'}).click();
    const extraChildId=await page.locator('#cms-design-node-select').inputValue();
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-title');
    const dropBox=await designFrame.locator('.cmsdg-n-'+extraChildId).boundingBox();
    const sourceBox=await titleNode.boundingBox();
    await page.mouse.move(sourceBox.x+sourceBox.width/2,sourceBox.y+sourceBox.height/2);
    await page.mouse.down();
    await page.mouse.move(dropBox.x+dropBox.width/2,dropBox.y+dropBox.height/2,{steps:8});
    await page.mouse.up();
    await titleNode.waitFor();
    const newParentId=await titleNode.evaluate(e=>
      Array.from(e.parentElement.classList).find(x=>x.startsWith('cmsdg-n-'))?.slice(8));
    assert.equal(newParentId,extraContainerId,'Dropping over a child center reparents into its container');
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-title');
    const copy=page.locator('#cms-design-graph-dialog .cms-design-fields label').filter({hasText:'Текст'}).locator('textarea');
    await copy.fill('Новый профессиональный дизайн без ИИ');
    await designFrame.locator('.cmsdg h2').getByText('Новый профессиональный дизайн без ИИ').waitFor();
    assert.equal(await page.locator('#cms-design-undo').isDisabled(),false);
    await page.locator('#cms-design-undo').click();
    await designFrame.locator('.cmsdg h2').getByText('Ваш уникальный заголовок').waitFor();
    await page.locator('#cms-design-redo').click();
    await designFrame.locator('.cmsdg h2').getByText('Новый профессиональный дизайн без ИИ').waitFor();
    // Preview navigation is inert even when a generated button has an href.
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-layout');

    await page.locator('#cms-design-breakpoint').selectOption('mobile');
    await page.locator('#cms-design-graph-dialog .cms-design-fields label').filter({hasText:/^gap$/}).locator('input').fill('@small');
    await page.locator('#cms-design-graph-dialog .cms-design-fields label').filter({hasText:/^widthPx$/}).locator('input').fill('390');
    await page.locator('#cms-design-apply').click();
    await page.locator('#cms-design-graph-dialog').waitFor({state:'hidden'});
    const graphSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    const graphSection=graphSite.pages.flatMap(p=>p.sections).find(s=>s.id===selectedSection);
    assert.equal(graphSection.designGraph.version,1);
    assert.equal(graphSection.designGraph.nodes[0].responsive.mobile.gap,'@small');
    assert.equal(graphSection.designGraph.nodes[0].responsive.mobile.widthPx,390);
    const findGraphNode=(nodes,id)=>{
      for(const node of nodes){if(node.id===id)return node;
        const found=node.children&&findGraphNode(node.children,id);if(found)return found;}
      return null;
    };
    const savedTitle=findGraphNode(graphSection.designGraph.nodes,selectedSection+'-title');
    assert.ok(savedTitle,'Reparented heading remains in the typed graph');
    assert.ok(savedTitle.styles.widthPx>0&&savedTitle.styles.heightPx>0,'Desktop resize persists');
    assert.equal(typeof savedTitle.styles.translateX,'number','Alt-drag persists free positioning');
    assert.ok(savedTitle.responsive.mobile.widthPx>0,'Mobile resize is stored as a responsive override');
    assert.ok(graphSection.designGraph.nodes.find(n=>n.id===extraContainerId).children.some(n=>n.id===selectedSection+'-title'),
      'Reparenting persists under the intended container');
    await canvas.locator('.cmsdg').waitFor();
    assert.match(await canvas.locator('.cmsdg h2').innerText(),/Новый профессиональный дизайн без ИИ/);
    await page.locator('#undo').click();
    assert.equal(await canvas.locator('.cmsdg').count(),0,'Undo returns legacy component unchanged');
    await page.locator('#redo').click();
    await canvas.locator('.cmsdg').waitFor();
    // User can extend a generated composition with a safe native icon and
    // customize its animation without calling the AI or writing raw HTML/CSS.
    await page.locator('#section-design-graph').click();
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-layout');
    await designFrame.locator('.cmsdg h2').waitFor();
    // Visual inspection also works for a graph that was committed then reopened.
    await designFrame.locator('.cmsdg h2').first().click();
    assert.equal(await page.locator('#cms-design-node-select').inputValue(),selectedSection+'-title');
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-layout');
    await page.locator('#cms-design-gradient summary').click();
    await page.locator('#cms-design-gradient label').filter({hasText:/^Угол/}).locator('input').fill('120');
    await page.locator('#cms-design-gradient label').filter({hasText:/^Цвет от/}).locator('input').fill('@accent');
    await page.locator('#cms-design-gradient label').filter({hasText:/^Цвет до/}).locator('input').fill('#ffffff');
    page.once('dialog',d=>d.accept('icon'));
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Тип +'}).click();
    await page.locator('#cms-design-graph-dialog label').filter({hasText:/^Векторная иконка/})
      .locator('select').selectOption('shield');
    await page.locator('#cms-design-graph-dialog label').filter({hasText:/^Описание для скринридера/})
      .locator('input').fill('Защитный значок');
    await page.locator('#cms-design-motion summary').click();
    await page.locator('#cms-design-motion label').filter({hasText:/^Эффект/})
      .locator('select').selectOption('fade-up');
    await page.locator('#cms-design-motion label').filter({hasText:/^Длительность/})
      .locator('input').fill('700');
    await page.locator('#cms-design-apply').click();
    await page.locator('#cms-design-graph-dialog').waitFor({state:'hidden'});
    const richSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    const richGraph=richSite.pages.flatMap(p=>p.sections).find(x=>x.id===selectedSection).designGraph;
    assert.deepEqual(richGraph.nodes[0].styles.gradient,{angle:120,from:'@accent',to:'#ffffff'});
    assert.equal(richGraph.nodes[1].type,'icon');
    assert.equal(richGraph.nodes[1].motion.effect,'fade-up');
    assert.equal(richGraph.nodes[1].motion.duration,700);
    await canvas.locator('svg[role="img"][aria-label="Защитный значок"]').waitFor();
    const richPreview=await page.locator('#preview').getAttribute('srcdoc');
    assert.match(richPreview,/linear-gradient\(120deg/);
    assert.match(richPreview,/prefers-reduced-motion:reduce/);
    await page.locator('#undo').click();
    assert.equal(await canvas.locator('svg[role="img"]').count(),0);
    await page.locator('#redo').click();
    await canvas.locator('svg[role="img"]').waitFor();
    // Edit a whole AI-authored nested composition without AI, scripts or raw CSS.
    await page.locator('#section-design-graph').click();
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-layout');
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'+ Рядом'}).click();
    const newContainer=await page.locator('#cms-design-node-select').inputValue();
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'+ Вложенный'}).click();
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-title');
    await page.locator('#cms-design-move-target').selectOption(newContainer);
    await page.locator('#cms-design-move-placement').selectOption('inside');
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Переместить'}).click();
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-title');
    for(const [label,value] of [['fontStyle','italic'],['textTransform','uppercase'],
      ['textWrap','balance'],['textShadow','soft']]){
      await page.locator('#cms-design-graph-dialog .cms-design-fields label').filter({hasText:label}).locator('select').selectOption(value);
    }
    for(const [label,value] of [['wordSpacing','12'],['translateX','24'],
      ['rotateDeg','-6'],['scalePercent','108']]){
      await page.locator('#cms-design-graph-dialog .cms-design-fields label').filter({hasText:label}).locator('input').fill(value);
    }
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-layout');
    await page.locator('#cms-design-breakpoint').selectOption('tablet');
    await page.locator('#cms-design-graph-dialog .cms-design-fields label').filter({hasText:'gridColumnsPreset'}).locator('select').selectOption('sidebar-left');
    await page.locator('#cms-design-breakpoint').selectOption('desktop');
    await page.locator('#cms-design-graph-dialog .cms-design-fields label').filter({hasText:'clipShape'}).locator('select').selectOption('diagonal');
    await page.locator('#cms-design-graph-dialog .cms-design-fields label').filter({hasText:'backdropBlur'}).locator('input').fill('6');
    await page.locator('#cms-design-node-select').selectOption(newContainer);
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Копировать группу'}).click();
    const duplicated=await page.locator('#cms-design-node-select').inputValue();
    assert.notEqual(duplicated,newContainer,'Deep duplicate receives a new stable id');
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Объединить в контейнер'}).click();
    const wrapper=await page.locator('#cms-design-node-select').inputValue();
    page.once('dialog',d=>d.accept());
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Разобрать контейнер'}).click();
    assert.equal(await page.locator('#cms-design-node-select').inputValue(),duplicated);
    await page.locator('#cms-design-apply').click();
    await page.locator('#cms-design-graph-dialog').waitFor({state:'hidden'});
    const rearranged=await page.evaluate(()=>window.Stage3Editor.getSite());
    const tree=rearranged.pages.flatMap(p=>p.sections).find(s=>s.id===selectedSection).designGraph;
    const movedContainer=tree.nodes.find(x=>x.id===newContainer);
    const copiedContainer=tree.nodes.find(x=>x.id===duplicated);
    assert.ok(movedContainer.children.some(x=>x.id===selectedSection+'-title'));
    assert.ok(copiedContainer.children.some(x=>x.text==='Новый профессиональный дизайн без ИИ'));
    const editedTitle=movedContainer.children.find(x=>x.id===selectedSection+'-title');
    assert.equal(editedTitle.styles.fontStyle,'italic');
    assert.equal(editedTitle.styles.textTransform,'uppercase');
    assert.equal(editedTitle.styles.textWrap,'balance');
    assert.equal(editedTitle.styles.textShadow,'soft');
    assert.equal(editedTitle.styles.translateX,24);
    assert.equal(editedTitle.styles.rotateDeg,-6);
    assert.equal(tree.nodes[0].responsive.tablet.gridColumnsPreset,'sidebar-left');
    assert.equal(tree.nodes[0].styles.clipShape,'diagonal');
    assert.equal(tree.nodes[0].styles.backdropBlur,6);
    assert.ok(!tree.nodes.some(x=>x.id===wrapper),'Unwrap removes only the wrapper');
    const ids=[];
    const walk=n=>{ids.push(n.id);(n.children||[]).forEach(walk);};
    tree.nodes.forEach(walk);
    assert.equal(new Set(ids).size,ids.length);
    await canvas.locator('.cmsdg').waitFor();
    const editorialHtml=await page.locator('#preview').getAttribute('srcdoc');
    for(const token of ['text-transform:uppercase','text-wrap:balance',
      'translate:var(--cmsdg-tx) var(--cmsdg-ty)','clip-path:polygon(0 0,100% 0,100% 90%,0 100%)',
      'grid-template-columns:minmax(0,1fr) minmax(0,2fr)','backdrop-filter:blur(6px)']){
      assert.ok(editorialHtml.includes(token),'Browser preview should preserve '+token);
    }
    assert.equal(await canvas.locator('.cmsdg h2').count(),2,'Copied nested layout renders twice');
    await page.locator('#undo').click();
    const prior=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(prior.pages.flatMap(p=>p.sections).find(s=>s.id===selectedSection).designGraph.nodes.length,
      richGraph.nodes.length,'Undo restores the exact prior root count before the next rearrangement');
    await page.locator('#redo').click();
    assert.equal(await canvas.locator('.cmsdg h2').count(),2,'Redo restores nested composition');
    assert.deepEqual(errors,[],'No page JS errors or unsupported dependencies');
    assert.deepEqual(remote,[],'No outgoing network requests, even through iframe');
    console.log('STAGE3 REAL CHROMIUM STUDIO E2E PASS: typed edit, inert preview, responsive, undo/redo, saved versions, reload, export/import, no-design and fail-closed import');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
