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
    // In-site page factory: build a whole page (not a new site), preserve
    // source until commit, validate real content/links and Undo atomically.
    await page.locator('#cms-blueprint-open').click();
    await page.locator('#cms-blueprint-dialog[open]').waitFor();
    await page.locator('#cms-blueprint-dialog select').first().selectOption('services');
    await page.locator('#cms-blueprint-dialog label').filter({hasText:'Куда собрать'})
      .locator('select').selectOption('new');
    await page.locator('#cms-blueprint-dialog label').filter({hasText:'Название страницы'})
      .locator('input').fill('Обработка металла');
    await page.locator('#cms-blueprint-dialog label').filter({hasText:'URL новой страницы'})
      .locator('input').fill('/metal/');
    await page.locator('#cms-blueprint-dialog label').filter({hasText:'Главный заголовок'})
      .locator('input').fill('Обработка металла под заказ');
    await page.locator('#cms-blueprint-dialog label').filter({hasText:'Краткое описание'})
      .locator('textarea').fill('Опишите точные условия сотрудничества.');
    await page.locator('#cms-blueprint-dialog label').filter({hasText:'Услуги или предложения'})
      .locator('textarea').fill('Резка металла\nГибка металла\nСварка');
    assert.equal(await page.locator('#cms-blueprint-blocks .cms-blueprint-block').count(),5);
    await page.frameLocator('#cms-blueprint-frame').locator('h1')
      .getByText('Обработка металла под заказ').waitFor();
    assert.equal(await page.locator('#pages .nav-entry').count(),2,'Preview never creates pages');
    await page.locator('#cms-blueprint-apply').click();
    assert.equal(await page.locator('#pages .nav-entry').count(),3);
    const pageBuilderSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    const pageBuilderPage=pageBuilderSite.pages.find(p=>p.path==='/metal/');
    assert.ok(pageBuilderPage&&pageBuilderPage.sections.length===5);
    assert.equal(pageBuilderPage.sections[0].elements.find(e=>e.slot==='heading').values['content.text'],
      'Обработка металла под заказ');
    assert.deepEqual(pageBuilderPage.sections.find(s=>s.component==='service-grid').items.map(x=>
      x.values['content.title']),['Резка металла','Гибка металла','Сварка']);
    const pageBuilderForm=pageBuilderPage.sections.find(s=>s.component==='lead-form-flex');
    assert.equal(pageBuilderPage.sections[0].elements.find(e=>e.slot==='action').values['behavior.href'],
      '/metal/#'+pageBuilderForm.id);
    await page.locator('#undo').click();
    assert.equal(await page.locator('#pages .nav-entry').count(),2,'Whole page is one Undo');
    await page.locator('#redo').click();
    assert.equal(await page.locator('#pages .nav-entry').count(),3);
    await page.locator('#undo').click();
    assert.equal(await page.locator('#pages .nav-entry').count(),2);
    // Whole-site verified content pass protects existing custom headings and
    // applies one atomic change-set without touching Save/Publish.
    const beforeFill=await page.evaluate(()=>window.Stage3Editor.getSite());
    await page.locator('#cms-fill-open').click();
    await page.locator('#cms-fill-dialog[open]').waitFor();
    await page.locator('#cms-fill-dialog label').filter({hasText:'Название компании'})
      .locator('input').fill('Завод оборудования — обновлённый');
    await page.locator('#cms-fill-dialog label').filter({hasText:'Подтверждённое описание'})
      .locator('textarea').fill('Проверенные сведения о технологическом оборудовании.');
    await page.locator('#cms-fill-dialog label').filter({hasText:'Подтверждённые преимущества'})
      .locator('textarea').fill('Подтверждённый опыт\nСогласованные сроки');
    assert.match(await page.locator('#cms-fill-summary').innerText(),/изменений/);
    assert.equal(await page.evaluate(()=>window.Stage3Editor.getSite().title),beforeFill.title,
      'An uncommitted intake must never change the current site');
    await page.locator('#cms-fill-apply').click();
    assert.equal(await page.locator('#site-name').innerText(),'Завод оборудования — обновлённый');
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages.length,2);
    await page.locator('#undo').click();
    assert.deepEqual(await page.evaluate(()=>window.Stage3Editor.getSite()),beforeFill,
      'Whole-site intake is one Undo and preserves manually customized content');
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

    // Site-wide copy replacement, preview and atomic undo in offline Studio.
    await page.locator('#cms-content-open').click();
    await page.locator('#cms-content-search').fill('Новое промышленное');
    await page.locator('#cms-content-replace').fill('Современное промышленное');
    assert.equal(await page.locator('#cms-content-row-not-used').count(),0);
    assert.equal(await page.locator('#cms-content-results .cms-content-row').count(),1);
    await page.locator('#cms-content-apply').click();
    assert.equal(await canvas.locator('h1').innerText(),'Современное промышленное оборудование');
    await page.locator('#undo').click();
    assert.equal(await canvas.locator('h1').innerText(),'Новое промышленное оборудование');
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
    await page.locator('#cms-open-theme').click();
    await page.locator('#cms-setting-language').selectOption('pl');
    await page.locator('#cms-settings-apply').click();
    await page.frameLocator('#preview').locator('html[lang="pl"]').waitFor({state:'attached'});
    assert.equal(await page.frameLocator('#preview').locator('html').getAttribute('lang'),'pl',
      'Editor preview language follows the site setting');
    await page.locator('#cms-open-seo').click();
    assert.equal(await page.locator('#cms-seo-preview').isVisible(),true);
    await page.locator('#cms-setting-seo-title').fill('');
    const expectedFallbackTitle=await page.evaluate(()=>{
      const site=window.Stage3Editor.getSite();return site.pages[0].title+' | '+site.title;
    });
    assert.equal(await page.locator('#cms-seo-search-title').innerText(),expectedFallbackTitle,
      'Snippet uses the published title fallback');
    await page.locator('#cms-setting-seo-title').fill('SEO title для теста');
    await page.locator('#cms-setting-seo-description').fill('');
    assert.match(await page.locator('#cms-seo-search-description').innerText(),/Мета description не задано/);
    await page.locator('#cms-setting-seo-description').fill('Описание для поисковых систем');
    assert.equal(await page.locator('#cms-seo-search-title').innerText(),'SEO title для теста');
    assert.match(await page.locator('#cms-seo-title-count').innerText(),/символов/);
    assert.match(await page.locator('#cms-seo-description-count').innerText(),/70–160/);
    await page.locator('#cms-setting-seo-og-title').fill('');
    assert.equal(await page.locator('#cms-seo-social-title').innerText(),'SEO title для теста');
    await page.locator('#cms-setting-seo-og-title').fill('Заголовок для публикации');
    await page.locator('#cms-setting-seo-og-description').fill('');
    assert.equal(await page.locator('#cms-seo-social-description').innerText(),'Описание для поисковых систем');
    await page.locator('#cms-setting-seo-og-description').fill('Описание для публикации');
    await page.locator('#cms-setting-seo-og-image').selectOption('');
    await page.locator('#cms-setting-seo-robots').selectOption('noindex');
    assert.match(await page.locator('#cms-seo-robots-status').innerText(),/noindex/);
    await page.locator('#cms-setting-seo-robots').selectOption('index');
    await page.locator('#cms-settings-apply').click();
    await page.locator('#save').click();
    const exportDownload=page.waitForEvent('download');
    await page.locator('#export').click();
    const download=await exportDownload;
    const saved=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(saved.pages[0].sections[0].elements[0].values['content.text'],'Новое промышленное оборудование');
    assert.equal(saved.language,'pl');
    assert.equal(saved.pages[0].seo.ogTitle,'Заголовок для публикации');
    assert.equal(saved.pages[0].seo.ogDescription,'Описание для публикации');
    assert.equal(saved.pages[0].seo.ogImage,'');
    await page.locator('#pages .nav-entry').nth(1).click();
    assert.equal(await page.locator('#sections .nav-entry').count(),1);
    assert.equal(await page.locator('#canvas-title').innerText(),'Контакты');
    assert.equal(await canvas.locator('h2').innerText(),'Свяжитесь с нами');
    // Local revisions survive a reload; restoring never publishes anything.
    await page.locator('#pages .nav-entry').first().click();
    const title=page.locator('#fields [data-field="content.text"]');
    await title.fill('Черновик версии 2');await title.dispatchEvent('change');
    await page.locator('#save').click();
    assert.equal(await page.locator('#versions .version').count(),3);
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

    // Unified site map: cross-page staging is isolated and committed as one Undo.
    await page.locator('#cms-site-map-open').click();
    await page.locator('#cms-site-map-dialog[open]').waitFor();
    assert.equal(await page.locator('#cms-map-pages [data-map-page]').count(),2);
    const beforePlan=await page.evaluate(()=>window.Stage3Editor.getSite());
    const homeFirst=beforePlan.pages[0].sections[0].id;
    const homeSecond=beforePlan.pages[0].sections[1].id;
    await page.locator('[data-map-section="'+homeSecond+'"] .cms-map-target').selectOption('page-contact');
    await page.locator('[data-map-section="'+homeSecond+'"]').getByRole('button',{name:'Перенести'}).click();
    assert.equal(await page.locator('[data-map-page="page-contact"] [data-map-section="'+homeSecond+'"]').count(),1);
    assert.deepEqual(await page.evaluate(()=>window.Stage3Editor.getSite()),beforePlan,
      'Unapplied site-map planning must not mutate the Studio draft');
    await page.locator('[data-map-section="'+homeFirst+'"] .cms-map-target').selectOption('page-contact');
    await page.locator('[data-map-section="'+homeFirst+'"]').getByRole('button',{name:'Копировать'}).click();
    assert.equal(await page.locator('[data-map-page="page-contact"] [data-map-section]').count(),3);
    assert.match(await page.locator('#cms-map-summary').innerText(),/один Undo/);
    await page.locator('#cms-map-preview-page').selectOption('page-contact');
    await page.locator('#cms-map-mobile').click();
    assert.equal(await page.locator('#cms-map-preview.mobile').count(),1);
    await page.locator('#cms-map-apply').click();
    const reorganized=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(reorganized.pages[0].sections.length,1);
    assert.equal(reorganized.pages[1].sections.length,3);
    await page.locator('#undo').click();
    assert.deepEqual(await page.evaluate(()=>window.Stage3Editor.getSite()),beforePlan,
      'One Undo must restore all planned cross-page changes');
    await page.locator('#redo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages[1].sections.length,3);
    await page.locator('#undo').click();

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
    await question.locator('select').first().selectOption('radio');
    await question.locator('textarea').fill('Email\nТелефон');
    await question.locator('textarea').dispatchEvent('change');
    await question.locator('input[type=checkbox]').check();
    await page.locator('#cms-form-apply').click();
    const built=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex');
    assert.equal(built.formFields[0].label,'Номер заказа');
    assert.equal(built.formFields[0].kind,'radio');
    assert.deepEqual(built.formFields[0].options,['Email','Телефон']);
    assert.equal(built.formFields[0].required,true);
    await canvas.locator('.contact').getByText('Номер заказа').waitFor();
    await page.locator('#undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex').formFields,undefined);
    await page.locator('#redo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex').formFields.length,1);

    // Full form scenario: branching preview, duplicate and one-step draft undo.
    await page.locator('#cms-form-builder-open').click();
    await page.locator('#cms-form-preset').selectOption('order');
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#cms-form-preset-apply').click();
    assert.equal(await page.locator('#cms-form-rows [data-form-field]').count(),4);
    const sim=page.locator('#cms-form-sim-fields');
    const equipment=sim.locator('select').first();
    assert.equal(await sim.getByText('Модель оборудования *').isVisible(),false,
      'Conditional question is hidden until its prerequisite matches');
    await equipment.selectOption('Новое оборудование');
    assert.equal(await sim.getByText('Модель оборудования *').isVisible(),true);
    await sim.locator('[data-sim-field] input[type=text]').fill('Тестовая модель');
    await sim.locator('[data-sim-field] input[type=text]').dispatchEvent('change');
    await sim.locator('select').first().selectOption('Запчасти');
    assert.equal(await sim.getByText('Модель оборудования *').isVisible(),false);
    assert.match(await page.locator('#cms-form-sim-status').innerText(),/отправка отключена/);
    await page.locator('#cms-form-rows [data-form-field]').first().locator('[data-form-duplicate]').click();
    assert.equal(await page.locator('#cms-form-rows [data-form-field]').count(),5);
    await page.locator('#cms-form-rows [data-form-field]').nth(1).getByText('Удалить').click();
    assert.equal(await page.locator('#cms-form-rows [data-form-field]').count(),4);
    await page.locator('#cms-form-apply').click();
    const conditionalForm=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex');
    assert.equal(conditionalForm.formFields[1].when.field,conditionalForm.formFields[0].id);
    assert.equal(conditionalForm.formFields[1].when.option,1);
    await page.locator('#undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex').formFields[0].label,'Номер заказа');
    await page.locator('#redo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex').formFields.length,4);

    // A click on a configured form question in the safe whole-page preview
    // deep-links to exactly its existing form-builder row (no new draft write).
    const flexPage=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .find(p=>p.sections.some(s=>s.id===conditionalForm.id));
    await page.locator('#cms-open-page-preview').click();
    await page.locator('#cms-page-preview-path').selectOption(flexPage.path);
    const visualFlex=page.frameLocator('#cms-page-preview-frame');
    await visualFlex.locator('[data-cms-section-id="'+conditionalForm.id+'"]').waitFor();
    await visualFlex.locator('[data-cms-section-id="'+conditionalForm.id+'"] label')
      .filter({hasText:'Модель оборудования'}).first().click({force:true});
    assert.match(await page.locator('#cms-work-form-focus').innerText(),/Модель оборудования/);
    await page.locator('#cms-work-form-edit').click();
    await page.locator('#cms-form-builder[open]').waitFor();
    assert.equal(await page.locator('#cms-form-rows .cms-form-row-selected').getAttribute('data-form-field'),
      conditionalForm.formFields[1].id,'Visual question selects its exact configured form row');
    await page.locator('#cms-form-builder').getByRole('button',{name:'Закрыть'}).click();

    // Search diagnostics and manage URL aliases from the same undoable document.
    await page.locator('#cms-quality-open').click();
    await page.locator('#cms-site-report').waitFor({state:'visible'});
    assert.match(await page.locator('#cms-quality-summary').innerText(),/страниц/);
    assert.match(await page.locator('#cms-quality-summary').innerText(),/рекомендаций/);
    assert.match(await page.locator('#cms-quality-findings').innerText(),/H1|SEO title|Описание/);
    const beforeSeoFix=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(beforeSeoFix.pages.find(p=>p.id==='page-contact').seo,undefined);
    await page.locator('#cms-seo-safe-fix').click();
    let afterSeoFix=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(afterSeoFix.pages.find(p=>p.id==='page-contact').seo.title,'Контакты');
    assert.equal(afterSeoFix.pages.find(p=>p.id==='page-home').seo.title,'SEO title для теста');
    assert.equal(afterSeoFix.pages.find(p=>p.id==='page-contact').seo.description,'',
      'Safe SEO fixes must not invent descriptions');
    assert.match(await page.locator('#toast').innerText(),/Заполнено SEO title/);
    await page.locator('#cms-site-report').getByRole('button',{name:'Закрыть'}).click();
    await page.locator('#undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages.find(p=>p.id==='page-contact').seo,undefined,
      'Safe SEO title fixes are one Undo-able document change');
    await page.locator('#redo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages.find(p=>p.id==='page-contact').seo.title,'Контакты');
    await page.locator('#cms-quality-open').click();
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

    // Renaming a page updates CMS-owned internal links and retargets existing aliases.
    await page.locator('#pages .nav-entry').nth(1).click();
    page.once('dialog',dialog=>{
      page.once('dialog',next=>next.accept('/get-in-touch/'));
      dialog.accept('Контакты');
    });
    await page.locator('#page-rename').click();
    let renamed=(await page.evaluate(()=>window.Stage3Editor.getSite()));
    assert.equal(renamed.pages.find(p=>p.id==='page-contact').path,'/get-in-touch/');
    assert.equal(renamed.pages.find(p=>p.id==='page-home').sections[0].elements
      .find(e=>e.values['behavior.href']).values['behavior.href'],'/get-in-touch/');
    assert.equal(renamed.pages.find(p=>p.id==='page-contact').sections[0].elements
      .find(e=>e.values['behavior.href']).values['behavior.href'],'/get-in-touch/');
    assert.deepEqual(renamed.redirects,[{from:'/older-page/',to:'/get-in-touch/'},
      {from:'/contact/',to:'/get-in-touch/'}]);
    assert.match(await page.locator('#toast').innerText(),/внутренние ссылки обновлены/);
    const renamedPreview=await page.evaluate(()=>window.Stage3Editor.previewDocument(
      window.Stage3Editor.getSite(),'/'));
    assert.ok(renamedPreview.includes('href="/get-in-touch/"'),
      'Full-page draft preview uses the new internal destination');
    await page.locator('#undo').click();
    renamed=(await page.evaluate(()=>window.Stage3Editor.getSite()));
    assert.equal(renamed.pages.find(p=>p.id==='page-contact').path,'/contact/');
    assert.equal(renamed.pages.find(p=>p.id==='page-home').sections[0].elements
      .find(e=>e.values['behavior.href']).values['behavior.href'],'/contact/');
    assert.deepEqual(renamed.redirects,[{from:'/older-page/',to:'/contact/'}]);
    const restoredPreview=await page.evaluate(()=>window.Stage3Editor.previewDocument(
      window.Stage3Editor.getSite(),'/'));
    assert.ok(restoredPreview.includes('href="/contact/"'),
      'Undo restores the prior preview URL');
    await page.locator('#redo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite()))
      .pages.find(p=>p.id==='page-contact').path,'/get-in-touch/');
    const redonePreview=await page.evaluate(()=>window.Stage3Editor.previewDocument(
      window.Stage3Editor.getSite(),'/'));
    assert.ok(redonePreview.includes('href="/get-in-touch/"'),
      'Redo restores the renamed preview URL');
    // Restore the original fixture for the remaining independent browser scenarios.
    await page.locator('#undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite()))
      .pages.find(p=>p.id==='page-contact').path,'/contact/');
    await page.locator('#pages .nav-entry').first().click();

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
    assert.equal(await page.locator('#cms-page-preview-frame').getAttribute('sandbox'),'allow-same-origin');
    await page.frameLocator('#cms-page-preview-frame').locator('h1').first().waitFor();
    await page.locator('#cms-page-preview-path').selectOption('/contact/');
    await page.frameLocator('#cms-page-preview-frame').locator('.contact').first().waitFor();
    await page.frameLocator('#cms-page-preview-frame').locator('section.contact h2').first().click();
    const original=await page.frameLocator('#cms-page-preview-frame').locator('section.contact h2').innerText();
    assert.equal(await page.locator('#cms-work-element').inputValue(),'section-contact-heading',
      'Clicking heading selects the exact typed element');
    assert.equal(await page.locator('#cms-work-fields .cms-work-field-current [data-page-field]').getAttribute('data-page-field'),'content.text');
    await page.frameLocator('#cms-page-preview-frame').locator('section.contact .action').dblclick();
    assert.equal(await page.locator('#cms-work-element').inputValue(),'section-contact-action',
      'Double clicking the button picks its own field, not the heading');
    await page.locator('#cms-work-quick-input').fill('Контакт напрямую');
    await page.locator('#cms-work-quick-save').click();
    await page.frameLocator('#cms-page-preview-frame').locator('section.contact .action').getByText('Контакт напрямую').waitFor();
    await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
    await page.frameLocator('#cms-page-preview-frame').locator('section.contact h2').first().click();
    assert.equal(await page.locator('#cms-work-element').inputValue(),'section-contact-heading');
    const field=page.locator('#cms-work-fields [data-page-field="content.text"]');
    await field.fill('Контакт в визуальном редакторе');
    await field.dispatchEvent('change');
    await page.frameLocator('#cms-page-preview-frame').locator('section.contact h2').getByText('Контакт в визуальном редакторе').waitFor();
    await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
    assert.equal(await page.frameLocator('#cms-page-preview-frame').locator('section.contact h2').innerText(),original);
    assert.equal(await page.locator('#cms-work-section').inputValue(),'section-contact',
      'Click selection must resolve the actual section, including local page preview IDs');
    const beforeCross=await page.evaluate(()=>window.Stage3Editor.getSite());
    await page.locator('#cms-work-destination').evaluate(el=>el.closest('details').open=true);
    await page.locator('#cms-work-destination').selectOption('page-home');
    await page.locator('#cms-work-position').selectOption({index:0});
    await page.locator('#cms-work-destination').locator('..').getByRole('button',{name:'Скопировать'}).click();
    const withCopy=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(withCopy.pages[0].sections.length,beforeCross.pages[0].sections.length+1);
    await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
    assert.deepEqual(await page.evaluate(()=>window.Stage3Editor.getSite()),beforeCross);
    await page.locator('#cms-page-preview-path').selectOption('/');
    await page.frameLocator('#cms-page-preview-frame').locator('section.hero h1').waitFor();
    await page.frameLocator('#cms-page-preview-frame').locator('section.hero p').first().click();
    assert.equal(await page.locator('#cms-work-element').inputValue(),'section-hero-summary',
      'Hero description selects summary field, not the headline');
    await page.locator('#cms-work-component').selectOption('service-grid');
    await page.locator('.cms-work-add > button').first().click();
    const repeatSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    const repeated=repeatSite.pages[0].sections.find(section=>section.component==='service-grid');
    assert.ok(repeated,'Visual composer adds typed repeated section to home page');
    const repeatCard=page.frameLocator('#cms-page-preview-frame')
      .locator('[data-cms-section-id="'+repeated.id+'"] .cms-preview-grid > article');
    await repeatCard.first().locator('h3').click();
    assert.equal(await page.locator('#cms-work-element').inputValue(),repeated.items[0].id,
      'Click on repeated card selects its exact stable item ID');
    await page.locator('#cms-work-repeat-copy').click();
    const copiedSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(copiedSite.pages[0].sections.find(s=>s.id===repeated.id).items.length,repeated.items.length+1);
    await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
    await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages[0].sections
      .some(section=>section.id===repeated.id),false,'Both canvas changes Undo cleanly');
    await page.locator('#cms-page-preview-path').selectOption('/contact/');

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
    // Accessibility findings update while editing and jump back to the exact typed node.
    await page.locator('#cms-design-a11y-summary').waitFor();
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-copy');
    const copyText=page.locator('#cms-design-graph-dialog .cms-design-fields label').filter({hasText:'Текст'}).locator('textarea');
    await copyText.fill('');
    const emptyTextFinding=page.locator('#cms-design-a11y [data-a11y-code="empty-text"][data-a11y-node="'+selectedSection+'-copy"]');
    await emptyTextFinding.waitFor();
    await emptyTextFinding.click();
    assert.equal(await page.locator('#cms-design-node-select').inputValue(),selectedSection+'-copy',
      'Selecting an accessibility finding focuses its node in the inspector');
    await page.locator('#cms-design-graph-dialog .cms-design-fields label').filter({hasText:'Текст'}).locator('textarea')
      .fill('Все элементы, сетки, отступы и стили редактируются в CMS.');
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

    // Select an actual nested Design Graph node in whole-page view and edit it,
    // then restore the graph via the same atomic draft undo history.
    await page.locator('#cms-open-page-preview').click();
    await page.locator('#cms-page-preview[open]').waitFor();
    const wholeGraph=page.frameLocator('#cms-page-preview-frame');
    const graphCopy=wholeGraph.locator('.cmsdg-n-'+selectedSection+'-copy');
    await graphCopy.click();
    assert.equal(await page.locator('#cms-work-graph-node').inputValue(),selectedSection+'-copy',
      'Whole-page selection resolves the exact nested graph node');
    assert.equal(await graphCopy.getAttribute('data-cms-work-graph-node'),selectedSection+'-copy');
    await graphCopy.dblclick();
    await page.locator('#cms-work-quick-input').fill('Текст композиции прямо на странице');
    await page.locator('#cms-work-quick-save').click();
    await wholeGraph.locator('.cmsdg-n-'+selectedSection+'-copy')
      .getByText('Текст композиции прямо на странице').waitFor();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.id===selectedSection).designGraph.nodes[0].children
      .find(n=>n.id===selectedSection+'-copy').text,'Текст композиции прямо на странице');
    await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
    assert.equal(await wholeGraph.locator('.cmsdg-n-'+selectedSection+'-copy').innerText(),
      'Все элементы, сетки, отступы и стили редактируются в CMS.');
    await page.locator('.cms-page-preview-modes [data-mode="mobile"]').click();
    await page.locator('#cms-work-graph-panel [data-work-graph-field="fontSize"]').fill('36');
    await page.locator('#cms-work-graph-panel [data-work-graph-field="fontSize"]').dispatchEvent('change');
    const mobileGraph=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.id===selectedSection);
    const mobileText=mobileGraph.designGraph.nodes[0].children.find(n=>n.id===selectedSection+'-copy');
    assert.equal(mobileText.responsive.mobile.fontSize,36,'Mobile override is typed and breakpoint-specific');
    assert.equal(mobileText.styles.fontSize,'@body','Desktop typography is unchanged');
    await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
    const restoredGraph=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.id===selectedSection);
    assert.equal(restoredGraph.designGraph.nodes[0].children.find(n=>n.id===selectedSection+'-copy').responsive?.mobile?.fontSize,undefined);

    // The full-page workbench now performs atomic structural edits too:
    // add, duplicate, remove, then unwind each change with one Undo.
    const inlineGraphCount=()=>page.evaluate(id=>{
      const section=window.Stage3Editor.getSite().pages.flatMap(p=>p.sections).find(s=>s.id===id);
      const count=nodes=>nodes.reduce((total,node)=>total+1+(node.children?count(node.children):0),0);
      return count(section.designGraph.nodes);
    },selectedSection);
    const graphCountBefore=await inlineGraphCount();
    await page.locator('#cms-work-graph-add-text').click();
    assert.equal(await inlineGraphCount(),graphCountBefore+1,'Canvas adds a typed sibling node');
    await page.locator('#cms-work-graph-duplicate').click();
    assert.equal(await inlineGraphCount(),graphCountBefore+2,'Canvas duplicates selected node with fresh IDs');
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#cms-work-graph-remove').click();
    assert.equal(await inlineGraphCount(),graphCountBefore+1,'Canvas removes only selected subtree');
    await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
    assert.equal(await inlineGraphCount(),graphCountBefore+2,'Undo restores removed subtree');
    await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
    assert.equal(await inlineGraphCount(),graphCountBefore+1,'Undo reverses duplication');
    await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
    assert.equal(await inlineGraphCount(),graphCountBefore,'Undo reverses insertion');

    // Undo after structural changes may select the first surviving node; explicitly
    // choose the intended nested node before testing focus handoff.
    await page.locator('#cms-work-graph-node').selectOption(selectedSection+'-copy');
    await page.locator('#cms-work-graph-open').click();
    await page.locator('#cms-design-graph-dialog[open]').waitFor();
    assert.equal(await page.locator('#cms-design-node-select').inputValue(),selectedSection+'-copy',
      'Inspector opens with the exact node selected on the whole-page canvas');
    assert.equal(await page.locator('#cms-design-breakpoint').inputValue(),'mobile',
      'Inspector retains the selected mobile breakpoint');
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Закрыть'}).click();

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
    // Site-wide SEO/a11y report must deep-link into the exact graph node,
    // track an actual repair, then re-run the report on the new Undo-able draft.
    const issueSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    const issueSection=issueSite.pages.flatMap(p=>p.sections).find(s=>s.id===selectedSection);
    const fixNodeId=selectedSection+'-title';
    const eraseHeading=nodes=>{
      for(const node of nodes){
        if(node.id===fixNodeId){node.text='';return true;}
        if(node.children&&eraseHeading(node.children))return true;
      }
      return false;
    };
    assert.ok(eraseHeading(issueSection.designGraph.nodes),'Graph heading fixture exists');
    await page.evaluate(site=>window.Stage3Editor.replace(site),issueSite);
    await page.locator('#cms-quality-open').click();
    const auditHeadingRow=page.locator('#cms-quality-findings .cms-quality-finding')
      .filter({hasText:fixNodeId}).filter({hasText:'Заголовок пустой'});
    await auditHeadingRow.getByRole('button',{name:/Открыть композицию/}).first().click();
    await page.locator('#cms-design-graph-dialog').waitFor({state:'visible'});
    assert.equal(await page.locator('#cms-design-node-select').inputValue(),fixNodeId,
      'SEO quality report opens the exact nested graph node');
    assert.match(await page.locator('#cms-design-audit-focus').innerText(),/Заголовок пустой/);
    const graphHeading=page.locator('#cms-design-graph-dialog .cms-design-fields label')
      .filter({hasText:'Текст'}).locator('textarea');
    await graphHeading.fill('Доступное название промышленного решения');
    assert.equal(await page.locator('#cms-design-audit-focus').getAttribute('data-resolved'),'true');
    await page.locator('#cms-design-apply').click();
    await page.locator('#cms-site-report').waitFor({state:'visible'});
    assert.equal(await page.locator('#cms-quality-findings .cms-quality-finding')
      .filter({hasText:fixNodeId}).filter({hasText:'Заголовок пустой'}).count(),0,
      'The site-wide report is recomputed after graph fix is applied');
    await page.locator('#cms-site-report').getByRole('button',{name:'Закрыть'}).click();
    assert.match(await canvas.locator('.cmsdg h2').first().innerText(),/Доступное название/i);
    await page.locator('#undo').click();
    const revertedIssueSection=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.id===selectedSection);
    const getNode=(nodes,id)=>{
      for(const node of nodes){if(node.id===id)return node;const found=getNode(node.children||[],id);if(found)return found;}
      return null;
    };
    assert.equal(getNode(revertedIssueSection.designGraph.nodes,fixNodeId).text,'',
      'Outer Undo restores the broken graph heading');
    await page.locator('#redo').click();
    await canvas.locator('.cmsdg h2').getByText('Доступное название промышленного решения').waitFor();
    // A legacy image ALT can be fixed from the audit and remains undoable.
    const altSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    altSite.assets.push({id:'asset-audit-alt',src:'/assets/asset-audit-alt.png',mime:'image/png',alt:''});
    const altGallery=altSite.pages[0].sections.find(section=>section.component==='adaptive-gallery');
    assert.ok(altGallery&&altGallery.items.length,'The audit fixture includes the editable gallery');
    altGallery.items[0].values['content.media']='asset-audit-alt';
    await page.evaluate(site=>window.Stage3Editor.replace(site),altSite);
    await page.locator('#cms-quality-open').click();
    const missingAlt=page.locator('#cms-quality-findings .cms-quality-finding').filter({hasText:'asset-audit-alt'});
    page.once('dialog',dialog=>dialog.accept('Фрезерный станок в производственном цехе'));
    await missingAlt.getByRole('button',{name:/Исправить ALT/}).click();
    const altFixed=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(altFixed.assets.find(asset=>asset.id==='asset-audit-alt').alt,'Фрезерный станок в производственном цехе');
    assert.equal(await page.locator('#cms-quality-findings .cms-quality-finding').filter({hasText:'asset-audit-alt'}).count(),0,
      'The resolved ALT finding disappears immediately');
    await page.locator('#cms-site-report').getByRole('button',{name:'Закрыть'}).click();
    await page.locator('#undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).assets.find(asset=>asset.id==='asset-audit-alt').alt,'',
      'ALT correction is one undoable draft change');
    await page.locator('#redo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).assets.find(asset=>asset.id==='asset-audit-alt').alt,
      'Фрезерный станок в производственном цехе','Redo restores the correction');
    assert.deepEqual(errors,[],'No page JS errors or unsupported dependencies');
    assert.deepEqual(remote,[],'No outgoing network requests, even through iframe');
    console.log('STAGE3 REAL CHROMIUM STUDIO E2E PASS: typed edit, inert preview, responsive, undo/redo, saved versions, reload, export/import, no-design and fail-closed import');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
