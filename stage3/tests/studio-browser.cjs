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
    const openLocalTools=async()=>{
      const group=page.locator('#local-site-tools');
      if(!(await group.evaluate(node=>node.open)))await group.locator(':scope > summary').click();
      await page.evaluate(()=>document.querySelectorAll('#local-site-tools-content .local-tool-category')
        .forEach(node=>{node.open=true;}));
    };
    const openStructureActions=async()=>{
      for(const id of ['page-actions-more','section-actions-more']){
        const group=page.locator('#'+id);
        if(!(await group.evaluate(node=>node.open)))await group.locator('summary').click();
      }
    };
    const closeEditingExtras=async()=>{
      await page.evaluate(()=>{
        for(const id of ['local-site-tools','page-actions-more','section-actions-more']){
          const node=document.getElementById(id);if(node)node.open=false;
        }
      });
    };
    page.on('pageerror',e=>{errors.push(e.message);console.error('STAGE3 STARTUP ERROR:',e.stack||e.message);});
    page.on('request',r=>{if(/^https?:/i.test(r.url()))remote.push(r.url());});
    await page.goto(pathToFileURL(html).href);
    await page.locator('#site-name').getByText('Завод оборудования').waitFor();
    assert.equal(await page.locator('#pages .nav-entry').count(),2);
    assert.equal(await page.locator('#sections .nav-entry').count(),2);
    assert.equal(await page.locator('#history-details').evaluate(node=>node.open),false,
      'Version history stays out of the default editing workspace');
    assert.equal(await page.locator('#local-site-tools').evaluate(node=>node.open),false,
      'Site-wide tools are collapsed by default');
    assert.equal(await page.locator('#page-actions-more').evaluate(node=>node.open),false);
    assert.equal(await page.locator('#section-actions-more').evaluate(node=>node.open),false);
    await openLocalTools();await openStructureActions();
    assert.equal(await page.locator('#fields [data-field]').count(),3,
      'Only declared heading fields appear; no generic CSS catalogue');
    // Operator-produced private SEO handoff opens relevant REAL CMS fields.
    // The browser verifies an exact source-site hash; the file itself never
    // grants owner approval, changes a draft, or invokes Save/Publish.
    const sourceSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    const {fingerprint:sourceHash}=require('../seo-engine/lib/acceptance.cjs');
    const seoPage=sourceSite.pages[0],seoSection=seoPage.sections[0],seoElement=seoSection.elements[0];
    const handoff={
      format:'manufact-seo-search-cms-handoff-v1',version:1,readOnly:true,
      siteId:sourceSite.siteId,approvedBlueprintFingerprint:'a'.repeat(64),
      currentSiteFingerprint:sourceHash(sourceSite),sourceHistorySha256:'b'.repeat(64),
      summary:{activeWorkPackets:1,reportedCompleteNeedsVerification:0,notApprovedOrUnreviewed:0,blockedForCurrentSiteDrift:0},
      active:[{
        actionId:'observed-click-decline:'+seoPage.id,priority:'P1',pageId:seoPage.id,
        approvedPath:seoPage.path,measuredObservation:'Synthetic GSC example only',
        approvedManualNextStep:'Review actual search intent before choosing words',
        ownerDecision:{status:'accepted',assignee:'Synthetic fixture'},
        currentSiteRevisionFingerprint:sourceHash(sourceSite),sourceReportSha256:'b'.repeat(64),
        automaticApplication:false,releaseAuthorized:false,
        existingEditorTargets:{
          metaFields:['title','description','robots','ogTitle','ogDescription'].map(key=>({
            property:'seo.'+key,expectedCurrent:seoPage.seo?.[key]??(key==='robots'?'index':''),
            approvedBlueprintValue:key==='title'?'Согласованный SEO title':
              seoPage.seo?.[key]??(key==='robots'?'index':''),
            isDifferent:key==='title'&&(seoPage.seo?.[key]||'')!=='Согласованный SEO title',
            mayEditAutomatically:false
          })),
          approvedFieldProposals:[{
            proposalId:'synthetic-heading',componentId:seoSection.component,
            sectionManifestVersion:seoSection.manifestVersion,
            locator:{pageId:seoPage.id,sectionId:seoSection.id,elementId:seoElement.id,property:'content.text'},
            expectedBefore:seoElement.values['content.text'],approvedAfter:'Заголовок согласован отдельно',
            automatic:false,manualOverrideCheckRequired:true
          }],
          sectionReview:[{sectionId:seoSection.id,component:seoSection.component}],blockedFieldMappings:[]
        }
      }],reportedComplete:[],notSelected:[],blocked:[]
    };
    const jsonFile=value=>({name:'cms-search-work-packets.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
    const seoHandoffButton=page.locator('#cms-seo-handoff-open');
    await seoHandoffButton.scrollIntoViewIfNeeded();
    const seoHandoffGeometry=await seoHandoffButton.evaluate(button=>{
      const describe=node=>{
        if(!node)return null;
        const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
        return {tag:node.tagName.toLowerCase(),id:node.id||'',className:typeof node.className==='string'?node.className:'',
          rect:{x:Math.round(rect.x*100)/100,y:Math.round(rect.y*100)/100,
            top:Math.round(rect.top*100)/100,right:Math.round(rect.right*100)/100,
            bottom:Math.round(rect.bottom*100)/100,width:Math.round(rect.width*100)/100,
            height:Math.round(rect.height*100)/100},
          overflowY:style.overflowY,position:style.position,zIndex:style.zIndex,
          pointerEvents:style.pointerEvents,display:style.display};
      };
      const rect=button.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
      const hit=document.elementFromPoint(x,y);
      const sidebar=document.querySelector('.sidebar'),tools=document.querySelector('#local-site-tools');
      return {viewport:{width:innerWidth,height:innerHeight,scrollY},center:{x,y},
        hitIsTarget:hit===button||button.contains(hit),hit:describe(hit),
        hitStack:document.elementsFromPoint(x,y).slice(0,6).map(describe),
        target:describe(button),sidebar:describe(sidebar),sidebarScrollTop:sidebar.scrollTop,
        sidebarScrollHeight:sidebar.scrollHeight,sidebarClientHeight:sidebar.clientHeight,
        panelTop:describe(document.querySelector('.panel-top')),localTools:describe(tools),
        localToolsContent:describe(document.querySelector('#local-site-tools-content')),
        category:describe(button.closest('.local-tool-category'))};
    });
    console.log('[local-site-tool-pointer-geometry] '+JSON.stringify(seoHandoffGeometry));
    assert.equal(seoHandoffGeometry.hitIsTarget,true,
      'A real pointer at the site tool action must hit the button: '+JSON.stringify(seoHandoffGeometry));
    await seoHandoffButton.click();
    await page.locator('#cms-seo-handoff-file').setInputFiles(jsonFile({...handoff,siteId:'wrong-project'}));
    assert.match(await page.locator('#cms-seo-handoff-status').innerText(),/другого сайта/);
    await page.locator('#cms-seo-handoff-file').setInputFiles(jsonFile(handoff));
    await page.locator('#cms-seo-handoff-results h4').getByText(handoff.active[0].actionId,{exact:false}).waitFor();
    assert.match(await page.locator('#cms-seo-handoff-status').innerText(),/совпала/);
    assert.equal(await page.locator('#cms-seo-handoff-results button').filter({hasText:'Копировать'}).count(),2);
    assert.deepEqual(await page.evaluate(()=>window.Stage3Editor.getSite()),sourceSite,
      'Import is strictly read-only; no owner Save or publication');
    await page.locator('#cms-seo-handoff-results button').filter({hasText:'К полю'}).click();
    assert.equal(await page.locator('#cms-seo-handoff-dialog').isVisible(),false);
    assert.equal(await page.locator('#fields [data-field="content.text"]').inputValue(),seoElement.values['content.text']);
    // A changed draft cannot silently reuse a previously matching packet.
    const seoHeadline=page.locator('#fields [data-field="content.text"]');
    await seoHeadline.fill('Новая версия для проверки устаревания');
    await seoHeadline.dispatchEvent('change');
    await page.locator('#cms-seo-handoff-open').click();
    assert.match(await page.locator('#cms-seo-handoff-status').innerText(),/отличается/);
    assert.equal(await page.locator('#cms-seo-handoff-results button').filter({hasText:'Копировать'}).count(),0);
    await page.locator('#cms-seo-handoff-dialog .cms-settings-actions button').click();
    await page.locator('#undo').click();
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
      await closeEditingExtras();
      await page.screenshot({path:path.join(shots,'stage3-desktop-editor.png'),fullPage:true});
      await openLocalTools();await openStructureActions();
    }
    await page.reload();
    await page.locator('#site-name').getByText('Завод оборудования').waitFor();
    await openLocalTools();await openStructureActions();
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
    assert.equal(await page.locator('#cms-setting-seo-schema-type option[value="FAQPage"]').evaluate(option=>option.disabled),true,
      'A page without actual visible FAQs cannot claim FAQPage structured data');
    await page.locator('#cms-setting-seo-schema-type').selectOption('WebPage');
    assert.match(await page.locator('#cms-seo-schema-status').innerText(),/WebPage:/);
    await page.locator('#cms-setting-seo-robots').selectOption('noindex');
    assert.match(await page.locator('#cms-seo-robots-status').innerText(),/noindex/);
    assert.match(await page.locator('#cms-seo-schema-status').innerText(),/не публикуется/);
    await page.locator('#cms-setting-seo-robots').selectOption('index');
    await page.locator('#cms-settings-apply').click();
    await page.locator('#save').click();
    await page.locator('#history-details').evaluate(node=>{node.open=true;});
    const exportDownload=page.waitForEvent('download');
    await page.locator('#export').click();
    const download=await exportDownload;
    const saved=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(saved.pages[0].sections[0].elements[0].values['content.text'],'Новое промышленное оборудование');
    assert.equal(saved.language,'pl');
    assert.equal(saved.pages[0].seo.ogTitle,'Заголовок для публикации');
    assert.equal(saved.pages[0].seo.ogDescription,'Описание для публикации');
    assert.equal(saved.pages[0].seo.ogImage,'');
    assert.equal(saved.pages[0].seo.schemaType,'WebPage');
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
    // Importing a separate externally authored JSON site does not require generating a site.
    const other=structuredClone(saved);other.siteId='site-external-staging';other.title='Другой авторский сайт';
    assert.equal(await page.locator('#new-site').count(),0);
    assert.equal(await page.locator('#compose-site').count(),0);
    page.once('dialog',d=>d.accept());
    await page.locator('#import-file').setInputFiles({
      name:'external-site.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(other),'utf8')
    });
    assert.equal(await page.locator('#pages .nav-entry').count(),2);
    assert.equal(await page.locator('#site-name').innerText(),'Другой авторский сайт');
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
    await page.waitForFunction(() => document.getElementById('toast')?.textContent?.includes('Импорт отклонён'));
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
    await page.locator('#section-add').click();
    await page.locator('#cms-component-search').fill('Услуги');
    await page.locator('#cms-component-list [data-component="service-grid"]').click();
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
    await page.locator('#site-name').getByText('Завод оборудования').waitFor();
    await openLocalTools();await openStructureActions();
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
    await question.getByRole('checkbox',{name:'Обязательно'}).check();
    await question.getByRole('checkbox',{name:'На всю ширину формы (если 2 колонки)'}).check();
    await page.locator('#cms-form-apply').click();
    const built=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex');
    assert.equal(built.formFields[0].label,'Номер заказа');
    assert.equal(built.formFields[0].kind,'radio');
    assert.deepEqual(built.formFields[0].options,['Email','Телефон']);
    assert.equal(built.formFields[0].required,true);
    assert.equal(built.formFields[0].fullWidth,true);
    await canvas.locator('.contact').getByText('Номер заказа').waitFor();
    // Form-wide settings are intentionally secondary to editing the
    // selected fields. Open them only when changing consent/success routing.
    await page.locator('#cms-form-success-settings-group>summary').click();
    const consentChoice=page.locator('#cms-form-consent-page');
    await consentChoice.waitFor();
    assert.equal(await consentChoice.locator(`option[value="${sourceSite.pages[1].id}"]`).count(),1);
    await consentChoice.selectOption(sourceSite.pages[1].id);
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex').consentPageId,
      sourceSite.pages[1].id);
    await page.locator('#undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages
      .flatMap(p=>p.sections).find(s=>s.component==='lead-form-flex').consentPageId,undefined);
    await page.locator('#redo').click();
    assert.equal(await page.locator('#cms-form-consent-page').inputValue(),sourceSite.pages[1].id);
    await page.locator('#undo').click(); // Return to the original form-field undo stack.
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
    // A second large workflow: bulk site-wide internal links and media audit
    // with explicit per-binding selection, SDK preview and one-step Undo.
    assert.match(await page.locator('#cms-repair-summary').innerText(),/внутренних ссылок/);
    await page.locator('#cms-repair-mode').selectOption('links');
    const linkRow=page.locator('#cms-repair-list .cms-repair-row')
      .filter({hasText:'Ссылка: /contact/'}).first();
    const linkBefore=await page.evaluate(()=>window.Stage3Editor.getSite());
    await linkRow.locator('input[type=checkbox]').check();
    await linkRow.locator('select').first().selectOption('/contact/');
    await linkRow.locator('select').nth(1).selectOption('section-contact');
    await page.locator('#cms-repair-check').click();
    assert.match(await page.locator('#cms-repair-preview').innerText(),/Предпросмотр/);
    await page.locator('#cms-repair-apply').click();
    const linkAfter=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.notDeepEqual(linkAfter,linkBefore,'Bulk link repair must edit the draft');
    assert.equal(linkAfter.pages[0].sections[0].elements.find(e=>e.id==='section-hero-action')
      .values['behavior.href'],'/contact/#section-contact',
      'Anchor repair must bind to a real destination section in the approved site');
    await page.locator('#cms-site-report').getByRole('button',{name:'Закрыть'}).click();
    await page.locator('#undo').click();
    assert.deepEqual(await page.evaluate(()=>window.Stage3Editor.getSite()),linkBefore,
      'One Undo must revert the whole link-repair transaction');
    await page.locator('#cms-quality-open').click();
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
    const styledSection=canvas.locator('.cms-section-skin.cms-surface-dark').first();
    await styledSection.waitFor();
    assert.match((await styledSection.getAttribute('class')),/cms-surface-dark cms-spacing-airy cms-align-center/);
    assert.match((await styledSection.getAttribute('class')),/cms-width-narrow cms-heading-expressive cms-corners-round cms-mobile-align-left cms-mobile-spacing-tight cms-button-pill/);
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
    await page.locator('#cms-header-notice').fill('Звоните нам в рабочее время');
    await page.locator('#cms-header-notice').dispatchEvent('change');
    await page.locator('#cms-header-notice-page').selectOption('page-contact');
    await page.locator('#cms-header-phone').fill('+48 500 600 700');
    await page.locator('#cms-header-phone').dispatchEvent('change');
    await page.locator('#cms-header-email').fill('hello@example.com');
    await page.locator('#cms-header-email').dispatchEvent('change');
    const contactMenu=page.locator('[data-menu-page="page-contact"]');
    await contactMenu.locator('input[type=text]').fill('Контакты и поддержка');
    await contactMenu.locator('input[type=text]').dispatchEvent('change');
    await contactMenu.locator('select').selectOption('page-home');
    await page.locator('#cms-menu-apply').click();
    let menuSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(menuSite.menu.style,'bold');
    assert.equal(menuSite.menu.mobile,'expanded');
    assert.equal(menuSite.menu.ctaPageId,'page-contact');
    assert.equal(menuSite.header.noticePageId,'page-contact');
    assert.equal(menuSite.header.email,'hello@example.com');
    assert.equal(menuSite.pages[1].navigation.parentId,'page-home');
    assert.equal(menuSite.pages[1].navigation.label,'Контакты и поддержка');
    await page.locator('#undo').click();
    menuSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(menuSite.menu,undefined);
    assert.equal(menuSite.header,undefined);
    await page.locator('#redo').click();
    menuSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(menuSite.menu.ctaLabel,'Написать нам');
    const brandedPreview=await page.evaluate(()=>{
      const document=window.Stage3Editor.getSite();
      document.assets.push({id:'asset-desktop-logo',src:'/assets/asset-desktop-logo.png',
        alt:'Desktop brand logo',mime:'image/png'});
      document.assets.push({id:'asset-mobile-logo',src:'/assets/asset-mobile-logo.png',
        alt:'Mobile brand logo',mime:'image/png'});
      document.branding={logoAssetId:'asset-desktop-logo',mobileLogoAssetId:'asset-mobile-logo',
        logoWidth:176};
      const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Rc0AAAAASUVORK5CYII=';
      return window.Stage3Editor.previewDocument(document,'/','tablet',
        {'asset-desktop-logo':png,'asset-mobile-logo':png});
    });
    assert.match(brandedPreview,/cms-menu-preview-brand/);
    assert.match(brandedPreview,/source media="\(max-width:900px\)"/);
    assert.match(brandedPreview,/cms-topbar-preview-light/);
    assert.match(brandedPreview,/mailto:hello@example\.com/);
    assert.match(brandedPreview,/Звоните нам в рабочее время/);


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
    // Edit the existing individually approved node, rather than inserting canned styles.
    assert.equal(await page.locator('#cms-design-recipe').count(),0);
    const beforeDirectEdit=await page.evaluate(()=>window.Stage3Editor.getSite());
    await page.locator('.cms-design-fields textarea').first().fill('Индивидуальный заголовок');
    assert.match(await page.locator('#cms-design-preview-frame').getAttribute('srcdoc'),/Индивидуальный заголовок/);
    assert.deepEqual(await page.evaluate(()=>window.Stage3Editor.getSite()),beforeDirectEdit);
    await page.locator('#cms-design-undo').click();
    assert.equal(await page.locator('#cms-design-undo').isDisabled(),true);
    await page.locator('#cms-design-breakpoint').selectOption('mobile');
    assert.match(await page.locator('#cms-design-inheritance').innerText(),/Каскад/);
    await page.locator('#cms-design-breakpoint').selectOption('desktop');
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
    await page.locator('#cms-design-structure-actions>summary').click();
    await page.getByRole('button',{name:'Добавить рядом'}).click();
    const extraContainerId=await page.locator('#cms-design-node-select').inputValue();
    await page.locator('#cms-design-structure-actions>summary').click();
    await page.getByRole('button',{name:'Добавить внутрь'}).click();
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
    // Individual typography: author styled fragments without raw HTML, then
    // return to a single text field while retaining full editor Undo history.
    await page.locator('#cms-design-rich-text > summary').click();
    await page.locator('#cms-design-rich-start').click();
    assert.equal(await page.locator('#cms-design-rich-text [data-rich-index]').count(),2);
    assert.match(await page.locator('#cms-design-preview-frame').getAttribute('srcdoc'),
      /<strong> новый фрагмент<\/strong>/);
    await page.locator('#cms-design-rich-text [data-rich-index="1"] [aria-label="Текст фрагмента 2"]')
      .fill(' с фирменным акцентом');
    await page.locator('#cms-design-rich-text [data-rich-index="1"] [aria-label="Текст фрагмента 2"]')
      .dispatchEvent('change');
    assert.match(await page.locator('#cms-design-preview-frame').getAttribute('srcdoc'),
      /с фирменным акцентом/);
    await page.locator('#cms-design-rich-text [data-rich-index="1"] [aria-label="Ссылка фрагмента 2"]')
      .fill('/contact/');
    await page.locator('#cms-design-rich-text [data-rich-index="1"] [aria-label="Ссылка фрагмента 2"]')
      .dispatchEvent('change');
    assert.match(await page.locator('#cms-design-preview-frame').getAttribute('srcdoc'),
      /href="\/contact\/"/);
    await page.locator('#cms-design-rich-clear').click();
    assert.equal(await page.locator('#cms-design-rich-text [data-rich-index]').count(),0);
    await page.locator('#cms-design-graph-dialog .cms-design-fields > label').filter({hasText:'Текст (сбрасывает акценты)'})
      .locator('textarea').fill('Новый профессиональный дизайн без ИИ');
    assert.equal(await page.locator('#cms-design-undo').isDisabled(),false);
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
    assert.equal(await page.locator('#cms-design-structure-actions').evaluate(node=>node.open),false);
    await page.locator('#cms-design-structure-actions>summary').click();
    page.once('dialog',d=>d.accept('Иконка'));
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Добавить элемент'}).click();
    await page.locator('#cms-design-graph-dialog label').filter({hasText:/^Векторная иконка/})
      .locator('select').selectOption('shield');
    await page.locator('#cms-design-graph-dialog label').filter({hasText:/^Описание иконки/})
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
    await page.locator('#cms-design-structure-actions>summary').click();
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Добавить рядом'}).click();
    const newContainer=await page.locator('#cms-design-node-select').inputValue();
    await page.locator('#cms-design-structure-actions>summary').click();
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Добавить внутрь'}).click();
    await page.locator('#cms-design-node-select').selectOption(selectedSection+'-title');
    await page.locator('#cms-design-structure-actions>summary').click();
    await page.locator('#cms-design-move-target').selectOption(newContainer);
    await page.locator('#cms-design-move-placement').selectOption('inside');
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Переместить элемент'}).click();
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
    await page.locator('#cms-design-structure-actions>summary').click();
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Дублировать группу'}).click();
    const duplicated=await page.locator('#cms-design-node-select').inputValue();
    assert.notEqual(duplicated,newContainer,'Deep duplicate receives a new stable id');
    await page.locator('#cms-design-structure-actions>summary').click();
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Собрать в группу'}).click();
    const wrapper=await page.locator('#cms-design-node-select').inputValue();
    await page.locator('#cms-design-structure-actions>summary').click();
    page.once('dialog',d=>d.accept());
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Разгруппировать'}).click();
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
    // Cross-page design tokens: validate whole document, commit and undo.
    await page.locator('#cms-design-tokens-open').click();
    await page.locator('#cms-design-tokens-dialog').waitFor({state:'visible'});
    const beforeTokens=await page.evaluate(()=>window.Stage3Editor.getSite());
    await page.locator('#cms-design-tokens-fields input[aria-label="colors · accent"]').fill('#ba4818');
    assert.equal(await page.locator('#cms-design-tokens-apply').isDisabled(),true);
    await page.locator('#cms-design-tokens-check').click();
    assert.equal(await page.locator('#cms-design-tokens-apply').isDisabled(),false);
    await page.locator('#cms-design-tokens-apply').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).designTokens.colors.accent,'#ba4818');
    await page.locator('#undo').click();
    assert.deepEqual(await page.evaluate(()=>window.Stage3Editor.getSite()),beforeTokens);
    await page.locator('#redo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).designTokens.colors.accent,'#ba4818');

    // Macroblock B1: visible graph texts, CTA links and media are first-class
    // participants in site-wide workbenches, not hidden legacy slot edits.
    const b1=await page.evaluate(()=>window.Stage3Editor.getSite());
    const b1Sec=b1.pages.flatMap(p=>p.sections).find(s=>s.id===selectedSection);
    const allNodes=nodes=>nodes.flatMap(n=>[n,...allNodes(n.children||[])]);
    const b1Heading=allNodes(b1Sec.designGraph.nodes).find(n=>n.type==='heading');
    assert.ok(b1Heading,'The existing composition has a visible heading');
    b1Heading.text='Ваш уникальный заголовок';
    b1Sec.designGraph.nodes.push({id:'graph-b1-button',type:'button',
      text:'Новый элемент',href:'/',styles:{}});
    b1Sec.designGraph.nodes.push({id:'graph-b1-image',type:'image',
      assetId:'asset-audit-alt',alt:'Фрезерный станок',styles:{}});
    const b1OriginalFallback=structuredClone(b1Sec.elements);
    await page.evaluate(site=>window.Stage3Editor.replace(site),b1);
    assert.ok((await page.evaluate(()=>window.Stage3Editor.launchReadiness()))
      .issues.some(i=>i.elementId===b1Heading.id&&i.kind==='graph-placeholder'));
    await page.locator('#cms-content-open').click();
    await page.locator('#cms-content-search').fill('Ваш уникальный заголовок');
    await page.locator('#cms-content-replace').fill('Проверенный графовый заголовок');
    assert.match(await page.locator('#cms-content-results').innerText(),/Дизайн-композиция/);
    await page.locator('#cms-content-apply').click();
    const getB1=(site,id)=>allNodes(site.pages.flatMap(p=>p.sections)
      .find(s=>s.id===selectedSection).designGraph.nodes).find(n=>n.id===id);
    assert.equal(getB1(await page.evaluate(()=>window.Stage3Editor.getSite()),b1Heading.id).text,
      'Проверенный графовый заголовок');
    await page.locator('#undo').click();
    assert.equal(getB1(await page.evaluate(()=>window.Stage3Editor.getSite()),b1Heading.id).text,
      'Ваш уникальный заголовок','One undo reverts bulk visible-graph text edits');

    await page.locator('#cms-fill-open').click();
    await page.locator('#cms-fill-dialog').waitFor({state:'visible'});
    await page.locator('#cms-fill-dialog label').filter({hasText:'Главный заголовок на главной'})
      .locator('input').fill('Подтверждённый заголовок компании');
    assert.match(await page.locator('#cms-fill-summary').innerText(),/изменени/);
    await page.locator('#cms-fill-apply').click();
    const afterFill=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(getB1(afterFill,b1Heading.id).text,'Подтверждённый заголовок компании');
    assert.deepEqual(afterFill.pages.flatMap(p=>p.sections)
      .find(s=>s.id===selectedSection).elements,b1OriginalFallback,
      'Whole-site fill must preserve dormant fallback fields behind the rendered Design Graph');

    await page.locator('#cms-quality-open').click();
    await page.locator('#cms-site-report').waitFor({state:'visible'});
    await page.locator('#cms-repair-mode').selectOption('all');
    const b1LinkRow=page.locator('#cms-repair-list .cms-repair-row')
      .filter({hasText:'Кнопка · graph-b1-button'}).first();
    assert.equal(await b1LinkRow.count(),1,'Graph CTA is visible to site-wide link repair');
    await b1LinkRow.locator('input[type=checkbox]').check();
    await b1LinkRow.locator('select').first().selectOption('/contact/');
    const b1ImageRow=page.locator('#cms-repair-list .cms-repair-row')
      .filter({hasText:'Изображение · graph-b1-image'}).first();
    assert.equal(await b1ImageRow.count(),1,'Graph image is visible to site-wide media repair');
    const replacement=b1.assets.find(a=>a.mime.startsWith('image/')&&a.id!=='asset-audit-alt');
    if(replacement){
      await b1ImageRow.locator('input[type=checkbox]').check();
      await b1ImageRow.locator('select').selectOption(replacement.id);
    }
    await page.locator('#cms-repair-check').click();
    assert.match(await page.locator('#cms-repair-preview').innerText(),/Предпросмотр/);
    await page.locator('#cms-repair-apply').click();
    const changedB1=await page.evaluate(()=>window.Stage3Editor.getSite());
    assert.equal(getB1(changedB1,'graph-b1-button').href,'/contact/');
    if(replacement)assert.equal(getB1(changedB1,'graph-b1-image').assetId,replacement.id);
    await page.locator('#cms-site-report').getByRole('button',{name:'Закрыть'}).click();
    await page.locator('#undo').click();
    assert.equal(getB1(await page.evaluate(()=>window.Stage3Editor.getSite()),'graph-b1-button').href,'/');
    await page.locator('#redo').click();
    assert.equal(getB1(await page.evaluate(()=>window.Stage3Editor.getSite()),'graph-b1-button').href,'/contact/');

    // Real Studio UI: link a native section to another page, and detach it
    // atomically with the existing global Undo/Redo behavior.
    const sharedBase=JSON.parse(fs.readFileSync(path.join(root,'fixtures/industrial-site.json'),'utf8'));
    await page.evaluate(site=>window.Stage3Editor.replace(site),sharedBase);
    await page.locator('#cms-shared-section-target').selectOption('page-contact');
    await page.locator('#cms-shared-section-link').click();
    const sharedUi=await page.evaluate(()=>window.Stage3Editor.getSite());
    const source=sharedUi.pages[0].sections[0];
    const linkedUi=sharedUi.pages[1].sections.find(s=>s.sharedKey===source.sharedKey);
    assert.ok(source.sharedKey&&linkedUi&&source.id!==linkedUi.id,
      'Studio creates page-local linked copies in one action');
    await page.locator('#undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite()))
      .pages[1].sections.filter(s=>s.sharedKey).length,0,
      'Single Undo removes the cross-page link');
    await page.locator('#redo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite()))
      .pages[1].sections.filter(s=>s.sharedKey).length,1,
      'Redo restores the shared section without collision');

    /* Real Studio: graph-bound multi-step form preview is visually inspectable
       without a live POST action, network access or a second form implementation. */
    const graphFormSite=JSON.parse(fs.readFileSync(path.join(root,'fixtures/industrial-site.json'),'utf8'));
    const graphFormDef=JSON.parse(fs.readFileSync(path.join(root,'components/lead-form-flex.json'),'utf8'));
    const graphFormSection=require('../sdk/contract.cjs').sectionFrom(graphFormDef,'section-graph-preview-ui');
    graphFormSection.formFields=[{id:'field-interest',label:'Направление проекта',kind:'select',
      required:false,options:['Проектирование','Сопровождение'],placeholder:''}];
    graphFormSection.formSteps=[
      {title:'Первый контакт',fields:['name','field-interest']},
      {title:'Подробности',fields:['email','message']}
    ];
    graphFormSection.designGraph={version:1,id:'graph-browser-lead',nodes:[
      {id:'graph-browser-lead-layout',type:'container',styles:{display:'grid',columns:2,gap:16},
        responsive:{mobile:{columns:1}},children:[
          {id:'graph-browser-lead-heading',type:'heading',text:'Есть проект?',level:2},
          {id:'graph-browser-lead-slot',type:'form-slot',styles:{padding:12}}
        ]}
    ]};
    graphFormSite.pages[1].sections.push(graphFormSection);
    await page.evaluate(site=>window.Stage3Editor.replace(site),graphFormSite);
    await page.locator('#pages .nav-entry').nth(1).click();
    await page.locator('#sections .nav-entry').last().click();
    await page.locator('#section-design-graph').click();
    await page.locator('#cms-design-graph-dialog[open]').waitFor();
    const graphFormFrame=page.frameLocator('#cms-design-preview-frame');
    await graphFormFrame.getByText('Направление проекта').waitFor();
    assert.equal(await graphFormFrame.locator('form').count(),0,
      'Graph canvas must never send a real visitor submission');
    assert.equal(await graphFormFrame.locator('[data-cms-form-field="field-interest"] select:disabled').count(),1);
    assert.equal(await page.locator('#cms-design-form-step').isVisible(),true);
    await page.locator('[data-design-device="desktop"]').click();
    await page.locator('#cms-design-node-select').selectOption('graph-browser-lead-slot');
    await page.getByLabel('Расстояние между полями (px)').last().fill('24');
    await page.getByLabel('Количество колонок формы (1–2)').last().fill('2');
    await page.getByLabel('Максимальная ширина формы (px)').last().fill('920');
    assert.match((await graphFormFrame.locator('style').allTextContents()).join('\n'),/--cmsdg-form-gap:24px/);
    assert.match((await graphFormFrame.locator('style').allTextContents()).join('\n'),/--cmsdg-form-columns:2/);
    assert.equal(await graphFormFrame.locator('.cmsdg-form-preview').evaluate(el=>
      getComputedStyle(el).gridTemplateColumns.split(' ').length),2,
      'The authored desktop form is actually two columns in the inert canvas');
    await page.locator('[data-design-device="mobile"]').click();
    await page.getByLabel('Скругление кнопки (px)').last().fill('19');
    await page.getByLabel('Количество колонок формы (1–2)').last().fill('1');
    assert.match((await graphFormFrame.locator('style').allTextContents()).join('\n'),/@media\(max-width:600px\)\{[^}]*--cmsdg-form-button-radius:19px/);
    await page.locator('#cms-design-form-step').selectOption('1');
    await graphFormFrame.getByText('Электронная почта').waitFor();
    assert.equal(await graphFormFrame.getByText('Направление проекта').count(),0);
    await page.locator('[data-design-device="mobile"]').click();
    assert.equal(await page.locator('#cms-design-preview-frame').evaluate(el=>el.style.width),'390px');
    assert.match(await graphFormFrame.locator('.cmsdg-preview-progress').innerText(),/2 \/ 2/);
    assert.equal(await graphFormFrame.locator('.cmsdg-form-preview').evaluate(el=>
      getComputedStyle(el).gridTemplateColumns.split(' ').length),1,
      'Mobile form column override is visually applied');
    await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'Закрыть'}).click();
    await page.locator('#cms-open-page-preview').click();
    await page.locator('#cms-page-preview[open]').waitFor();
    const workFormCanvas=page.frameLocator('#cms-page-preview-frame');
    await page.locator('.cms-page-preview-modes [data-mode="desktop"]').click();
    await workFormCanvas.getByText('Направление проекта').waitFor();
    assert.equal(await workFormCanvas.locator('.cmsdg-form-slot form').count(),0,
      'Page-wide authored form preview must stay inert while showing the actual fields');
    await workFormCanvas.locator('.cmsdg-n-graph-browser-lead-slot').click();
    assert.equal(await page.locator('#cms-work-graph-node').inputValue(),'graph-browser-lead-slot');
    await page.locator('#cms-work-graph-panel [data-work-graph-field="form:gap"]').fill('26');
    await page.locator('#cms-work-graph-panel [data-work-graph-field="form:gap"]').dispatchEvent('change');
    await page.locator('#cms-work-graph-panel [data-work-graph-field="form:labelGap"]').fill('11');
    await page.locator('#cms-work-graph-panel [data-work-graph-field="form:labelGap"]').dispatchEvent('change');
    const workFormChanged=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages[1]
      .sections.find(section=>section.id==='section-graph-preview-ui');
    assert.equal(workFormChanged.designGraph.nodes[0].children[1].formAppearance?.gap,26,
      'Full-page workbench edits the actual typed Graph form appearance');
    assert.equal(workFormChanged.designGraph.nodes[0].children[1].formAppearance?.labelGap,11);

    // A site owner can paste a real Excel/Sheets grid into the existing authored
    // table; IDs/styles and the ordinary Graph Draft/Undo flow are preserved.
    await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();
    const sheetSite=JSON.parse(fs.readFileSync(path.join(root,'fixtures/industrial-site.json'),'utf8'));
    const sheetDef=JSON.parse(fs.readFileSync(path.join(root,'components/custom-section.json'),'utf8'));
    const sheetSec=require('../sdk/contract.cjs').sectionFrom(sheetDef,'section-sheet-editor');
    sheetSec.designGraph={version:1,id:'graph-sheet-editor',nodes:[{
      id:'sheet-table-ui',type:'table',text:'Тарифы',tableLayoutMobile:'cards',children:[
        {id:'sheet-head-ui',type:'table-row',children:[
          {id:'sheet-head-a-ui',type:'table-cell',text:'Услуга'},
          {id:'sheet-head-b-ui',type:'table-cell',text:'Цена'}]},
        {id:'sheet-row-ui',type:'table-row',children:[
          {id:'sheet-value-a-ui',type:'table-cell',text:'Сайт'},
          {id:'sheet-value-b-ui',type:'table-cell',text:'200',styles:{color:'@accent'}}]}
      ]},{id:'sheet-list-ui',type:'list',ordered:true,children:[
        {id:'sheet-list-one-ui',type:'list-item',text:'Планирование'},
        {id:'sheet-list-two-ui',type:'list-item',text:'Запуск'}
      ]}]};
    sheetSite.pages[0].sections.push(sheetSec);
    await page.evaluate(site=>window.Stage3Editor.replace(site),sheetSite);
    await page.locator('#pages .nav-entry').first().click();
    await page.locator('#sections .nav-entry').last().click();
    await page.locator('#section-design-graph').click();
    await page.locator('#cms-design-node-select').selectOption('sheet-table-ui');
    await page.locator('#cms-design-table-paste').click();
    await page.locator('#cms-graph-table-file').setInputFiles({
      name:'edited-prices.csv',mimeType:'text/csv',
      buffer:Buffer.from('Услуга;Цена;Срок\nСайт;245;4 дня\nМагазин;480;5 дней')
    });
    await page.waitForFunction(()=>document.querySelector('#cms-graph-table-data')
      ?.value.includes('Сайт;245;4 дня'));
    assert.match(await page.locator('#cms-graph-table-data').inputValue(),/Сайт;245;4 дня/,
      'Local CSV file is read into the same paste preview, without server upload');
    assert.match(await page.locator('#cms-graph-table-status').innerText(),/3 строк × 3 столбцов/);
    await page.locator('#cms-graph-table-file').setInputFiles({
      name:'excel-unicode.txt',mimeType:'text/plain',
      buffer:Buffer.from('\uFEFFУслуга\tЦена\tСрок\nВёрстка\t275\t3 дня','utf16le')
    });
    await page.waitForFunction(()=>document.querySelector('#cms-graph-table-data')
      ?.value.includes('Вёрстка\t275\t3 дня'));
    assert.match(await page.locator('#cms-graph-table-status').innerText(),/2 строк × 3 столбцов/,
      'Excel Unicode Text UTF-16LE is decoded before the same safe table preview');
    const exportTable=page.waitForEvent('download');
    await page.locator('#cms-graph-table-download').click();
    assert.equal((await exportTable).suggestedFilename(),'table.tsv');
    await page.locator('#cms-graph-table-data').fill('Услуга\tЦена\tСрок\nСайт\t250\t3 дня\nМагазин\t500\t5 дней');
    assert.match(await page.locator('#cms-graph-table-status').innerText(),/3 строк × 3 столбцов/);
    await page.locator('#cms-graph-table-apply').click();
    await page.locator('#cms-graph-table-paste').waitFor({state:'detached'});
    await page.locator('#cms-design-undo').click();
    assert.equal(await page.frameLocator('#cms-design-preview-frame').locator('tbody tr').count(),1);
    await page.locator('#cms-design-redo').click();
    assert.equal(await page.frameLocator('#cms-design-preview-frame').locator('tbody tr').count(),2);
    await page.locator('#cms-design-table-column').selectOption('1');
    await page.locator('#cms-design-table-column-previous').click();
    assert.equal(await page.frameLocator('#cms-design-preview-frame').locator('thead th').first().innerText(),'Цена');
    await page.locator('#cms-design-undo').click();
    await page.locator('#cms-design-table-row').selectOption('2');
    await page.locator('#cms-design-table-row-previous').click();
    assert.equal(await page.frameLocator('#cms-design-preview-frame').locator('tbody tr').first().locator('td').first().innerText(),'Магазин');
    await page.locator('#cms-design-undo').click();
    await page.locator('#cms-design-node-select').selectOption('sheet-list-ui');
    await page.locator('#cms-design-list-paste').click();
    await page.locator('#cms-graph-list-file').setInputFiles({
      name:'steps.txt',mimeType:'text/plain',
      buffer:Buffer.from('Планирование\nДизайн\nЗапуск','utf8')
    });
    await page.waitForFunction(()=>document.querySelector('#cms-graph-list-data')
      ?.value.includes('Дизайн'));
    assert.match(await page.locator('#cms-graph-list-data').inputValue(),/Дизайн/);
    const exportList=page.waitForEvent('download');
    await page.locator('#cms-graph-list-download').click();
    assert.equal((await exportList).suggestedFilename(),'list.txt');
    await page.locator('#cms-graph-list-data').fill('Планирование\nВёрстка\nЗапуск');
    await page.locator('#cms-graph-list-apply').click();
    await page.locator('#cms-design-apply').click();
    const pasted=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages[0].sections
      .find(s=>s.id==='section-sheet-editor').designGraph.nodes[0];
    assert.equal(pasted.children[1].children[1].id,'sheet-value-b-ui');
    assert.equal(pasted.children[1].children[1].text,'250');
    assert.deepEqual(pasted.children[1].children[1].styles,{color:'@accent'});
    const pastedList=(await page.evaluate(()=>window.Stage3Editor.getSite())).pages[0].sections
      .find(s=>s.id==='section-sheet-editor').designGraph.nodes[1];
    assert.equal(pastedList.ordered,true);
    assert.equal(pastedList.children[0].id,'sheet-list-one-ui');
    assert.equal(pastedList.children[2].text,'Запуск');
    await page.locator('#cms-open-page-preview').click();
    await page.locator('#cms-work-graph-node').selectOption('sheet-table-ui');
    await page.locator('#cms-work-graph-table-paste').click();
    await page.locator('#cms-graph-table-data').fill('Услуга\tЦена\tСрок\nСайт\t300\t3 дня\nМагазин\t500\t5 дней');
    await page.locator('#cms-graph-table-apply').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages[0].sections
      .find(s=>s.id==='section-sheet-editor').designGraph.nodes[0].children[1].children[1].text,'300');
    await page.locator('#cms-work-undo').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages[0].sections
      .find(s=>s.id==='section-sheet-editor').designGraph.nodes[0].children[1].children[1].text,'250');
    await page.locator('#cms-work-graph-table-column').selectOption('1');
    await page.locator('#cms-work-graph-table-column-previous').click();
    assert.equal((await page.evaluate(()=>window.Stage3Editor.getSite())).pages[0].sections
      .find(s=>s.id==='section-sheet-editor').designGraph.nodes[0].children[0].children[0].text,'Цена');
    await page.locator('#cms-work-undo').click();
    await page.locator('#cms-work-graph-table-paste').click();
    await page.locator('#cms-graph-table-data').fill('Услуга\tЦена\tСрок\nСайт\t=1+1\t3 дня\nМагазин\t500\t5 дней');
    await page.locator('#cms-graph-table-apply').click();
    await page.locator('#cms-work-graph-table-paste').click();
    const safeExport=page.waitForEvent('download');
    await page.locator('#cms-graph-table-download').click();
    const exportedText=fs.readFileSync(await (await safeExport).path(),'utf8');
    assert.ok(exportedText.includes("Сайт\t'=1+1\t3 дня"),
      'Downloaded TSV quotes formula-like content without changing site data');
    await page.locator('#cms-graph-table-paste').getByRole('button',{name:'Отмена'}).click();
    await page.locator('#cms-work-undo').click();
    await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();

    // A recorded per-device visual finding now opens the EXISTING full-page
    // Workbench at its authored section, rather than dropping the owner into a
    // generic Inspector. The jump itself must not mutate the draft.
    const reviewBefore=await page.evaluate(()=>window.Stage3Editor.getSite());
    const reviewFocused=await page.evaluate(target=>window.Stage3Editor.focusVisualReview(target),{
      pageId:sheetSite.pages[0].id,sectionId:'section-sheet-editor',
      device:'mobile',scrollY:180
    });
    assert.equal(reviewFocused,true);
    await page.locator('#cms-page-preview[open]').waitFor();
    assert.equal(await page.locator('#cms-page-preview-path').inputValue(),sheetSite.pages[0].path);
    assert.equal(await page.locator('#cms-work-section').inputValue(),'section-sheet-editor');
    assert.equal(await page.locator('#cms-page-preview-frame').evaluate(el=>el.style.width),'390px');
    assert.ok(await page.locator('.cms-page-preview-modes [data-mode="mobile"]').evaluate(el=>
      el.classList.contains('active')));
    assert.deepEqual(await page.evaluate(()=>window.Stage3Editor.getSite()),reviewBefore,
      'Opening a review finding is navigation only, never an implicit save or edit');
    await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();

    // Real customer compositions can contain inline style/linked text runs.
    // All three owner paths must preserve them: all-page replace, Workbench
    // property editing and double-click quick text editing.
    const richSource=JSON.parse(fs.readFileSync(path.join(root,'fixtures/industrial-site.json'),'utf8'));
    richSource.pages[0].sections[0].designGraph={version:1,id:'rich-editor-graph',nodes:[{
      id:'rich-heading-editor',type:'heading',level:1,
      text:'Монтаж и доставка',
      runs:[{text:'Монтаж ',strong:true,color:'@accent'},
        {text:'и доставка',italic:true,href:'/contact/'}]
    }]};
    await page.evaluate(site=>window.Stage3Editor.replace(site),richSource);
    const richNode=async()=>{
      const site=await page.evaluate(()=>window.Stage3Editor.getSite());
      return site.pages[0].sections[0].designGraph.nodes[0];
    };
    await page.locator('#cms-content-open').click();
    await page.locator('#cms-content-search').fill('Монтаж');
    await page.locator('#cms-content-replace').fill('Производство');
    assert.equal(await page.locator('#cms-content-results .cms-content-row').count(),1);
    await page.locator('#cms-content-apply').click();
    assert.equal((await richNode()).text,'Производство и доставка');
    assert.deepEqual((await richNode()).runs[0],
      {text:'Производство ',strong:true,color:'@accent'});
    assert.deepEqual((await richNode()).runs[1],
      {text:'и доставка',italic:true,href:'/contact/'});
    await page.locator('#undo').click();
    await page.locator('#cms-content-open').click();
    await page.locator('#cms-content-search').fill('таж и до');
    await page.locator('#cms-content-replace').fill('замена');
    assert.match(await page.locator('#cms-content-results').innerText(),/пересекает границу/);
    assert.equal(await page.locator('#cms-content-apply').isDisabled(),true);
    await page.locator('#cms-content-workbench').getByRole('button',{name:'Закрыть'}).click();
    assert.deepEqual((await richNode()).runs,richSource.pages[0].sections[0].designGraph.nodes[0].runs);
    await page.locator('#cms-open-page-preview').click();
    await page.locator('#cms-work-graph-node').selectOption('rich-heading-editor');
    const workRich=page.locator('[data-work-graph-field="richText:0"]');
    await workRich.fill('Производство ');
    await workRich.dispatchEvent('change');
    assert.equal((await richNode()).text,'Производство и доставка');
    assert.equal((await richNode()).runs[1].href,'/contact/');
    await page.locator('#cms-work-undo').click();
    await page.frameLocator('#cms-page-preview-frame')
      .locator('[data-cms-work-graph-node="rich-heading-editor"]').dblclick();
    await page.locator('#cms-work-quick-runs [data-rich-run-index="0"]').fill('Изготовление ');
    await page.locator('#cms-work-quick-save').click();
    assert.equal((await richNode()).text,'Изготовление и доставка');
    assert.deepEqual((await richNode()).runs[1],
      {text:'и доставка',italic:true,href:'/contact/'});
    await page.locator('#cms-work-undo').click();
    assert.equal((await richNode()).text,'Монтаж и доставка');
    await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();

    // One edited instance of a real shared bespoke section must propagate
    // to the other page, not leave inconsistent duplicate copy behind.
    const D=require('../sdk/draft.cjs');
    const manifests=fs.readdirSync(path.join(root,'components')).filter(name=>name.endsWith('.json'))
      .map(name=>JSON.parse(fs.readFileSync(path.join(root,'components',name),'utf8')));
    let shared=D.begin(richSource,manifests);
    shared=D.structure(shared,manifests,{action:'linkSharedSection',
      pageId:richSource.pages[0].id,sectionId:richSource.pages[0].sections[0].id,
      toPageId:richSource.pages[1].id,id:'section-rich-linked',sharedKey:'shared-rich-copy',
      expectedRevision:shared.revision});
    await page.evaluate(site=>window.Stage3Editor.replace(site),shared.current);
    await page.locator('#cms-content-open').click();
    await page.locator('#cms-content-search').fill('Монтаж');
    await page.locator('#cms-content-replace').fill('Комплектация');
    assert.equal(await page.locator('#cms-content-results .cms-content-row').count(),2);
    await page.locator('#cms-content-results .cms-content-row').nth(1)
      .locator('input[type="checkbox"]').uncheck();
    assert.match(await page.locator('#cms-content-status').innerText(),/1 общих групп/);
    await page.locator('#cms-content-apply').click();
    const linkedSite=await page.evaluate(()=>window.Stage3Editor.getSite());
    const linkedNodes=linkedSite.pages.flatMap(p=>p.sections).filter(s=>s.sharedKey==='shared-rich-copy')
      .map(s=>s.designGraph.nodes[0]);
    assert.equal(linkedNodes.length,2);
    assert.deepEqual(linkedNodes.map(n=>n.text),
      ['Комплектация и доставка','Комплектация и доставка']);
    assert.ok(linkedNodes.every(n=>n.runs[1].href==='/contact/'&&n.runs[0].strong));
    await page.locator('#undo').click();

    // Real native Chromium interaction, without adding a custom public runtime.
    const graphHost=require('../sdk/design-graph.cjs');
    const nativeSite=JSON.parse(fs.readFileSync(path.join(root,'fixtures/industrial-site.json'),'utf8'));
    const nativeGraph={version:1,id:'graph-browser-popup',nodes:[
      {id:'popup-open',type:'button',text:'Открыть',popupTarget:'popup-dialog',
        transition:{duration:200,easing:'ease-out'},
        states:{hover:{scalePercent:106},active:{scalePercent:95}}},
      {id:'popup-dialog',type:'popup',text:'Окно браузера',
        children:[{id:'popup-content',type:'text',text:'Содержимое окна'}]},
      {id:'popup-animated',type:'container',sequence:{
        effect:'fade-in',duration:250,delay:0,stagger:130,easing:'ease-out'},
        children:[{id:'popup-first',type:'text',text:'Первый'},
          {id:'popup-second',type:'text',text:'Второй'}]}
    ]};
    const nativePage=await ctx.newPage();
    await nativePage.setContent('<!doctype html><html><body>'+
      graphHost.render(nativeSite,nativeGraph)+'</body></html>');
    assert.ok((await nativePage.locator('style').last().innerText()).includes('transition:color 200ms ease-out'));
    await nativePage.getByRole('button',{name:'Открыть'}).click();
    assert.equal(await nativePage.locator('[popover="auto"]').evaluate(el=>el.matches(':popover-open')),true,
      'Native browser popover opens via typed trigger');
    await nativePage.getByRole('button',{name:'Закрыть окно'}).click();
    assert.equal(await nativePage.locator('[popover="auto"]').evaluate(el=>el.matches(':popover-open')),false,
      'Native browser closes without injected JavaScript');
    await nativePage.getByRole('button',{name:'Открыть'}).click();
    await nativePage.keyboard.press('Escape');
    assert.equal(await nativePage.locator('[popover="auto"]').evaluate(el=>el.matches(':popover-open')),false,
      'Escape closes the native popover');
    // Same accessible markup, genuine responsive layout changes in Chromium.
    const browserTable={version:1,id:'graph-browser-table',nodes:[{
      id:'browser-comparison',type:'table',text:'Сравнение',rowHeaders:true,
      tableLayoutTablet:'cards',tableLayoutMobile:'scroll',
      tableAppearanceTablet:{cardRadius:24,cardBackground:'#eef4fd',labelWidth:35},
      children:[
        {id:'browser-head',type:'table-row',children:[
          {id:'browser-head-name',type:'table-cell',text:'Услуга'},
          {id:'browser-head-price',type:'table-cell',text:'Стоимость'}]},
        {id:'browser-row',type:'table-row',children:[
          {id:'browser-row-name',type:'table-cell',text:'Доставка'},
          {id:'browser-row-price',type:'table-cell',text:'100 €'}]}
      ]}]};
    await nativePage.setContent('<!doctype html><html><body>'+graphHost.render(nativeSite,browserTable)+'</body></html>');
    const browserRow=nativePage.locator('.cmsdg-n-browser-row');
    assert.equal(await nativePage.locator('th[scope="row"][data-label="Услуга"]').count(),1);
    await nativePage.setViewportSize({width:1100,height:800});
    assert.equal(await browserRow.evaluate(el=>getComputedStyle(el).display),'table-row');
    await nativePage.setViewportSize({width:800,height:800});
    assert.equal(await browserRow.evaluate(el=>getComputedStyle(el).display),'block');
    assert.equal(await browserRow.evaluate(el=>getComputedStyle(el).borderTopLeftRadius),'24px');
    assert.equal(await browserRow.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(238, 244, 253)');
    await nativePage.setViewportSize({width:380,height:800});
    assert.equal(await browserRow.evaluate(el=>getComputedStyle(el).display),'table-row',
      'Explicit mobile scroll choice takes precedence over tablet cards');
    await nativePage.close();

    assert.deepEqual(errors,[],'No page JS errors or unsupported dependencies');
    assert.deepEqual(remote,[],'No outgoing network requests, even through iframe');
    console.log('STAGE3 REAL CHROMIUM STUDIO E2E PASS: typed edit, inert preview, responsive, undo/redo, saved versions, reload, export/import, no-design and fail-closed import');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
