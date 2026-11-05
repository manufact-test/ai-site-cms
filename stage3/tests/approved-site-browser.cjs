'use strict';
// Genuine Chromium end-to-end: PHP session -> server Studio -> save -> publish.
// Disposable SQLite DB; loopback-only server; no Hostinger or external network.
const {chromium}=require('../../cms/editor/node_modules/playwright-core');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-studio-http-'));
const privateDir=path.join(temp,'private');
fs.mkdirSync(privateDir,{mode:0o700});fs.chmodSync(privateDir,0o700);
const publicRoot=fs.realpathSync(path.join(root,'stage3/server/public'));
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!chrome)throw Error('Chromium required for hosted Studio scenario');
const env={...process.env,STAGE3_DSN:'sqlite:'+path.join(temp,'site.sqlite'),
  STAGE3_OWNER_USER:'testowner',STAGE3_OWNER_PASSWORD:'CI-only-password-123456',
  STAGE3_FORM_SECRET:'CI-only-form-secret-with-minimum-32-characters',
  STAGE3_PRIVATE_DIR:privateDir,STAGE3_PUBLIC_ROOT:publicRoot,
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
  const topology={
    format:'manufact-stage3-hosted-install-topology-v1',
    serverRoot:fs.realpathSync(path.join(root,'stage3/server')),
    publicRoot,
    privateDir,
    accountWebRoots:[publicRoot],
    instanceId:null,
    installedAt:new Date().toISOString()
  };
  const topologyPath=path.join(privateDir,'hosted-install-topology.json');
  fs.writeFileSync(topologyPath,JSON.stringify(topology,null,4)+'\n',{mode:0o600});
  fs.chmodSync(topologyPath,0o600);
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
  // Focused REAL Chromium/PHP gate for the externally approved individual site:
  // no unrelated editorial excursions before the acceptance workflow.
  const origin=await start();
  browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
  // One actual Chromium keyboard journey against the EXACT PHP-published
  // form wizard (the same SHA-pinned script used by standalone Next pages).
  const nativeWizard=spawnSync('php',['-r',
    'require "stage3/server/bootstrap.php";echo Manufact\\Stage3\\PublicRenderer::formStepsScript();'],
    {cwd:root,env,encoding:'utf8'});
  assert.equal(nativeWizard.status,0,nativeWizard.stderr);
  assert.match(nativeWizard.stdout,/progressLabels/);
  const keyboard=await browser.newPage();
  try{
    await keyboard.setContent('<!doctype html><html lang="pl"><body>'+
      '<form data-multi-step="yes" action="/not-actually-submitted" method="post">'+
      '<p class="lead-step-progress" role="status"></p>'+
      '<fieldset class="lead-step"><legend>Kontakt</legend>'+
      '<input name="name" minlength="2" required><input name="email" type="email" required>'+
      '<button data-step-next type="button">Dalej</button></fieldset>'+
      '<fieldset class="lead-step"><legend>Zapytanie</legend>'+
      '<select name="type"><option value="basic">Basic</option><option value="extra">Extra</option></select>'+
      '<div data-condition-source="type" data-condition-option="1" data-condition-required="yes">'+
      '<input name="detail" required></div>'+
      '<textarea name="message" minlength="10" required></textarea>'+
      '<button data-step-back type="button">Wstecz</button></fieldset>'+
      '<label class="lead-consent"><input type="checkbox" required name="consent"></label>'+
      '<button type="submit" class="lead-submit">Wyślij</button></form></body></html>');
    await keyboard.evaluate(script=>{
      const node=document.createElement('script');node.textContent=script;
      document.body.append(node);
      window.receivedForm=false;
      document.querySelector('form').addEventListener('submit',event=>{
        window.receivedForm=!event.defaultPrevented;event.preventDefault();
      });
    },nativeWizard.stdout);
    assert.equal(await keyboard.locator('form').evaluate(f=>f.noValidate),true);
    assert.match(await keyboard.locator('.lead-step-progress').innerText(),/Krok 1 z 2/);
    await keyboard.locator('[name="name"]').fill('Anna');
    await keyboard.locator('[name="email"]').fill('anna@example.test');
    await keyboard.locator('[name="email"]').press('Enter');
    assert.equal(await keyboard.locator('form').getAttribute('data-current-step'),'1',
      'Enter advances despite a required input in the later hidden step');
    await keyboard.locator('[data-step-back]').click();
    assert.equal(await keyboard.locator('form').getAttribute('data-current-step'),'0');
    await keyboard.locator('[data-step-next]').click();
    await keyboard.locator('[name="message"]').fill('Request details please');
    await keyboard.locator('[name="type"]').selectOption('extra');
    assert.equal(await keyboard.locator('[name="detail"]').isDisabled(),false);
    await keyboard.locator('.lead-submit').click();
    assert.equal(await keyboard.evaluate(()=>window.receivedForm),false,
      'Conditional required form fields cannot be bypassed');
    await keyboard.locator('[name="detail"]').fill('Model A');
    await keyboard.locator('.lead-submit').click();
    assert.equal(await keyboard.evaluate(()=>window.receivedForm),false,
      'Mandatory consent cannot be bypassed by noValidate');
    await keyboard.locator('[name="consent"]').check();
    await keyboard.locator('.lead-submit').click();
    assert.equal(await keyboard.evaluate(()=>window.receivedForm),true,
      'All previously hidden steps, conditions and consent accepted');
  }finally{await keyboard.close();}
  const ctx=await browser.newContext({viewport:{width:1400,height:1000}});
  const page=await ctx.newPage(),errors=[];
  const openSectionTree=async()=>{
    const details=page.locator('#cms-section-navigator');
    if(!(await details.evaluate(node=>node.open)))await details.locator(':scope > summary').click();
  };
  const waitSelectedPageKeyboardFocus=async context=>{
    try{
      await page.waitForFunction(()=>document.activeElement
        ?.matches('#pages .nav-entry.active[aria-current="page"]'),
        null,{timeout:12000});
    }catch(error){
      const focus=await page.evaluate(()=>({
        activeTag:document.activeElement?.tagName,
        activeId:document.activeElement?.id,
        activeText:document.activeElement?.textContent?.slice(0,100),
        activeConnected:document.activeElement?.isConnected,
        selected:[...document.querySelectorAll('#pages .nav-entry')]
          .filter(node=>node.matches('.active,[aria-current="page"]'))
          .map(node=>({title:node.textContent,aria:node.getAttribute('aria-current')})),
        pageCount:document.querySelectorAll('#pages .nav-entry').length
      }));
      console.error('[hosted-page-nav-focus]',context,JSON.stringify(focus));
      throw error;
    }
  };
  const waitCompactInspectorHeading=async context=>{
    try{
      await page.waitForFunction(()=>{
        const heading=document.getElementById('inspector-title');
        const rect=heading?.getBoundingClientRect();
        return heading&&document.activeElement===heading&&
          rect.top>=0&&rect.top<innerHeight;
      },null,{timeout:10000});
    }catch(error){
      const focus=await page.evaluate(()=>{
        const heading=document.getElementById('inspector-title'),rect=heading?.getBoundingClientRect();
        return {
          activeTag:document.activeElement?.tagName,
          activeId:document.activeElement?.id,
          activeText:document.activeElement?.textContent?.slice(0,120),
          headingTop:rect?.top,headingBottom:rect?.bottom,
          height:innerHeight,scrollY:scrollY,
          inspectorScroll:document.querySelector('.inspector')?.scrollTop,
          page:document.querySelector('#pages .nav-entry.active')?.textContent,
          section:document.querySelector('#sections .nav-entry.active')?.textContent
        };
      });
      console.error('[hosted-compact-heading-focus]',context,JSON.stringify(focus));
      throw error;
    }
  };
  const openGraphActions=async()=>{
    const group=page.locator('#cms-design-structure-actions');
    if(!(await group.evaluate(node=>node.open)))await group.locator(':scope > summary').click();
  };
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/studio');
  try{
    await page.locator('#server-login:not([hidden])').waitFor({timeout:8000});
  }catch(error){
    console.error('Studio startup failed',JSON.stringify({
      pageErrors:errors,
      gates:await page.locator('#server-login').count(),
      bodyClasses:await page.locator('body').getAttribute('class'),
      studioMode:await page.locator('html').getAttribute('data-stage3-mode'),
      hubCount:await page.locator('#server-hub').count(),
      visibleBody:(await page.locator('body').innerText()).slice(0,1200)
    }));
    throw error;
  }
  const anonymousDiagnostics=await page.evaluate(async()=>{
    return (await fetch('/api/hosting/diagnostics',{cache:'no-store'})).status;
  });
  assert.equal(anonymousDiagnostics,401,'hosting diagnostics must require owner authentication');
  assert.equal(await page.locator('#server-engine-open').evaluate(node=>node.hidden),true,
    'CMS engine maintenance is owner-gated before authentication');
  await page.locator('#server-username').fill('testowner');
  await page.locator('#server-password').fill(env.STAGE3_OWNER_PASSWORD);
  await page.locator('#server-signin').click();
  await page.locator('#server-login').waitFor({state:'hidden'});
  const ownerDiagnostics=await page.evaluate(async()=>{
    const response=await fetch('/api/hosting/diagnostics',{cache:'no-store'});
    return {status:response.status,body:await response.json()};
  });
  assert.equal(ownerDiagnostics.status,200);
  assert.equal(ownerDiagnostics.body.runtime.sapi,'cli-server');
  assert.equal(ownerDiagnostics.body.database.driver,'sqlite');
  assert.equal(ownerDiagnostics.body.database.tableCount,25);
  assert.equal(ownerDiagnostics.body.database.instanceBound,false,'CI setup fixture has no hosted installation receipt');
  assert.equal(ownerDiagnostics.body.filesystem.documentRootMatches,true);
  assert.equal(ownerDiagnostics.body.filesystem.frontControllerMatches,true);
  assert.equal(ownerDiagnostics.body.checks.frontController,true);
  assert.equal(ownerDiagnostics.body.checks.openBasedir,true);
  assert.equal(ownerDiagnostics.body.security.openBasedir.configured,false);
  assert.equal(ownerDiagnostics.body.checks.uploadConfiguration,true);
  assert.equal(ownerDiagnostics.body.limits.fileUploadsEnabled,true);
  assert.equal(ownerDiagnostics.body.filesystem.accountWebRootIsolationValid,true);
  assert.equal(ownerDiagnostics.body.filesystem.privateDirectoryPermissions,'0700');
  assert.equal(ownerDiagnostics.body.security.https,false);
  assert.equal(ownerDiagnostics.body.ready,false,'local SQLite/HTTP rehearsal must not be marked as staging-ready');
  const diagnosticsJson=JSON.stringify(ownerDiagnostics.body);
  for(const secret of [env.STAGE3_DSN,env.STAGE3_DB_PASSWORD,env.STAGE3_OWNER_PASSWORD,env.STAGE3_FORM_SECRET,privateDir]){
    if(secret)assert.equal(diagnosticsJson.includes(secret),false,'diagnostics must not disclose secrets or private paths');
  }
  assert.equal(await page.locator('#server-engine-open').evaluate(node=>node.hidden),false,
    'owner receives the separate CMS engine maintenance entrypoint');

  // Real empty workspace: the compiled offline fixture must not masquerade
  // as server-persisted content or leak a page tree before a site is opened.
  assert.equal(await page.locator('#server-empty-state:visible').count(),1);
  assert.equal(await page.locator('#server-view-home:visible').count(),1);
  assert.equal(await page.locator('#server-site-list .cms-site-card').count(),0);
  assert.equal(await page.locator('#pages .nav-entry:visible').count(),0,
    'The offline factory fixture is not a server site');
  assert.equal(await page.locator('#site-name:visible').count(),0,
    'The factory title cannot appear as a real active site');
  assert.equal(await page.locator('#save:visible').count(),0,
    'Save and Publish belong only to an opened editor');
  assert.equal(await page.locator('#server-site-tools-dialog').count(),1);
  assert.equal(await page.locator('#server-site-tools-dialog').evaluate(node=>node.open),false);
  assert.equal(await page.locator('#server-site-tools').evaluate(node=>node.open),true);
  assert.equal(await page.locator('#server-site-tools').evaluate(node=>!!node.closest('.sidebar')),false);
  assert.equal(await page.locator('#server-resources').evaluate(node=>!!node.closest('.sidebar')),false);
  assert.equal(await page.locator('#server-drawer-import').evaluate(node=>node.open),true);
  assert.equal(await page.locator('#history-details').evaluate(node=>node.open),false);
  const studioScreenDir=path.join(root,'stage3/studio/out');
  fs.mkdirSync(studioScreenDir,{recursive:true});
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-empty-home.png'),fullPage:true});
  await page.locator('#server-nav-account').click();
  assert.equal(await page.locator('#server-password-open:visible').count(),1);
  assert.equal(await page.locator('#server-logout:visible').count(),1,
    'Logout is a real retained action in Account, not a detached-node placeholder');
  assert.equal(await page.locator('#server-account-actions').innerText().then(s=>s.includes('null')),false);
  assert.equal(await page.locator('#server-users-open:visible').count(),0);
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-empty-account.png'),fullPage:true});
  await page.locator('#server-nav-platform').click();
  assert.equal(await page.locator('#server-password-open:visible').count(),0);
  assert.equal(await page.locator('#server-engine-open').isVisible(),true,
    'owner can reach engine maintenance from the separate platform area');
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-empty-platform.png'),fullPage:true});
  await page.locator('#server-engine-open').click();
  await page.locator('#server-engine-dialog[open]').waitFor();
  await page.locator('#server-hosting-diagnostics-status').getByText(/cli-server/).first().waitFor();
  await page.locator('#server-hosting-diagnostics-status').getByText(/Среда требует внимания/).waitFor();
  await page.locator('#server-engine-status').getByText(/Текущая версия: legacy-installed/).waitFor();
  const engineSummary=await page.locator('#server-engine-status').innerText();
  assert.match(engineSummary,/Текущая версия: legacy-installed/,
    'maintenance dialog reads the active CMS generation from the real owner API');
  assert.match(engineSummary,/доверенный ключ: не настроен/,
    'maintenance dialog clearly reports missing publisher trust');
  assert.equal(await page.locator('#server-engine-review').isDisabled(),true,
    'a release cannot be reviewed before the publisher trust anchor is configured');
  assert.equal(await page.locator('#server-engine-dialog details').count(),2,
    'the owner gets separate, readable trust and package instructions');
  await page.locator('#server-engine-close').click();
  await page.locator('#server-engine-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('#server-edit-page').count(),1);
  assert.equal(await page.locator('#page-add').isVisible(),false);
  assert.equal(await page.locator('#page-rename').isVisible(),false,
    'Rare page actions stay collapsed until requested');
  assert.equal(await page.locator('#section-catalog').isVisible(),false,
    'Adding a block requires an active real page');
  assert.equal(await page.locator('#section-add').isVisible(),false,
    'The raw internal component-ID prompt is not exposed');
  await page.evaluate(()=>{
    const siteTools=document.querySelector('#server-site-tools');
    if(siteTools)siteTools.open=true;
    for(const node of document.querySelectorAll(
      '#server-tools details,#server-site-tools details,#server-admin-more')){
      node.open=true;node.dispatchEvent(new Event('toggle'));
    }
  });
  await page.locator('#server-nav-import').click();
  assert.equal(await page.locator('#server-view-import:visible').count(),1);
  assert.match(await page.locator('.cms-import-guide').innerText(),/approved-v2/);

  // Owner can import a sealed external design into the empty CMS. No generated
  // template or generic website is necessary to initialize the owner workspace.
  assert.equal(await page.locator('#new-site').count(),0);
  assert.equal(await page.locator('#compose-site').count(),0);
  const visitorCtx=await browser.newContext({viewport:{width:1280,height:900}});
  const visitor=await visitorCtx.newPage();
  // FAQ deletion and server restore are explicit confirmation actions.
  page.on('dialog',dialog=>dialog.accept());
  // ONE critical real-browser path for the approved external folder: the PHP
  // server must store asset bytes before accepting any references to them.
  // Tiny synthetic design images exercise transport only, not visual acceptance.
  const folder=path.join(temp,'approved-external-site');
  fs.mkdirSync(path.join(folder,'prototypes'),{recursive:true});
  fs.mkdirSync(path.join(folder,'assets'),{recursive:true});
  const examplePng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGM0ajrBwMDAxMDAwMDAAAARZAGA1I+vcwAAAABJRU5ErkJggg==','base64');
  for(const name of ['desktop','tablet','mobile'])
    fs.writeFileSync(path.join(folder,'prototypes',name+'.png'),examplePng);
  fs.writeFileSync(path.join(folder,'assets','asset-external-hero.png'),examplePng);
  fs.writeFileSync(path.join(folder,'assets','asset-external-mobile.png'),examplePng);
  const approvedVideo=Buffer.from(fs.readFileSync(path.join(root,
    'stage3/tests/fixtures/tiny-h264.mp4.b64'),'utf8').trim(),'base64');
  fs.writeFileSync(path.join(folder,'assets','asset-external-film.mp4'),approvedVideo);
  // Original 448-byte WOFF2 built from original rectangles and A/B glyphs;
  // unlike a fake header, Chromium can decode and display this tiny font.
  const approvedFont=Buffer.from(fs.readFileSync(path.join(root,
    'stage3/tests/fixtures/ci-original-woff2.b64'),'utf8').trim(),'base64');
  assert.equal(approvedFont.length,448);
  fs.writeFileSync(path.join(folder,'assets','asset-external-font.woff2'),approvedFont);
  fs.writeFileSync(path.join(folder,'client-explanation.md'),'Browser-only fixture: client-facing explanation for the full approved prototype.');
  fs.writeFileSync(path.join(folder,'implementation-spec.md'),'Browser-only fixture: source of truth for component properties, responsive behavior, and CTA.');
  fs.writeFileSync(path.join(folder,'handoff.json'),JSON.stringify({
    format:'manufact-approved-site-handoff-v1',status:'approved',version:'fixture-1',
    files:{site:'site.json',desktop:'prototypes/desktop.png',
      tablet:'prototypes/tablet.png',mobile:'prototypes/mobile.png',
      clientExplanation:'client-explanation.md',implementationSpec:'implementation-spec.md'}
  }));
  const external=await page.evaluate(()=>{
    const site=window.Stage3Editor.fromBrief('site-approved-browser','Внешний готовый сайт');
    site.assets=[{id:'asset-external-hero',src:'/assets/asset-external-hero.png',
      mime:'image/png',alt:'Фото внешнего сайта'},
      {id:'asset-external-mobile',src:'/assets/asset-external-mobile.png',
        mime:'image/png',alt:'Мобильный знак бренда'},
      {id:'asset-external-film',src:'/assets/asset-external-film.mp4',
        mime:'video/mp4',alt:'Видеопрезентация утверждённого сайта'},
      {id:'asset-external-font',src:'/assets/asset-external-font.woff2',
        mime:'font/woff2',alt:'CMS original CI typeface'}];
    site.footer={style:'dark',layout:'columns',description:'Контакты и поддержка из утверждённого дизайна',
      email:'contact@example.com',phone:'+48 500 600 700',
      links:[{label:'Юридическая информация',pageId:site.pages[1].id}],
      socials:[{network:'instagram',url:'https://instagram.com/manufact'}]};
    site.branding={logoAssetId:'asset-external-hero',
      mobileLogoAssetId:'asset-external-mobile',
      faviconAssetId:'asset-external-hero',logoWidth:176};
    site.theme={background:'#f7f9fc',surface:'#ffffff',text:'#172a43',
      primary:'#0a5bff',font:'system',maxWidth:1140,
      fontFiles:{body:'asset-external-font',heading:'asset-external-font'}};
    site.pages[0].seo={title:'Внешний готовый сайт',description:'Проверка подключения внешнего сайта',
      robots:'index',ogTitle:'asset-external-hero',ogImage:'asset-external-hero'};
    const faq=window.Stage3Editor.manifests().find(x=>x.id==='faq-accordion');
    const fromFields=fields=>Object.fromEntries(fields.map(f=>[f.path,structuredClone(f.default)]));
    const section={
      id:'section-approved-faq',component:faq.id,manifestVersion:faq.version,
      elements:faq.elements.map((el,i)=>({
        id:'element-approved-faq-'+i,slot:el.slot,values:fromFields(el.fields)
      })),
      items:['Как оформить заказ?','Как происходит доставка?'].map((question,i)=>({
        id:'approved-faq-item-'+i,
        values:{...fromFields(faq.repeat.fields),'content.question':question,
          'content.answer':'Уточните условия непосредственно у исполнителя.'}
      }))
    };
    const image=window.Stage3Editor.manifests().find(x=>x.id==='image-showcase');
    site.pages[0].sections.push({
      id:'section-approved-image',component:image.id,manifestVersion:image.version,
      elements:image.elements.map((el,i)=>({
        id:'element-approved-image-'+i,slot:el.slot,
        values:{...fromFields(el.fields),...(el.slot==='photo'
          ?{'content.media':'asset-external-hero'}:{})}
      }))
    });
    const custom=window.Stage3Editor.manifests().find(x=>x.id==='custom-section');
    site.pages[0].sections.push({
      id:'section-approved-custom',component:custom.id,manifestVersion:custom.version,
      elements:[{id:'element-approved-custom-note',slot:'section-note',
        values:{'content.text':'Авторская композиция клиента'}}],
      designGraph:{version:1,id:'graph-approved-custom',nodes:[{
        id:'approved-custom-container',type:'container',
        styles:{display:'grid',columns:2,gap:24,minHeight:240,borderWidth:2,borderStyle:'dashed'},
        backgroundMedia:{assetId:'asset-external-hero',tabletAssetId:'asset-external-hero',
          mobileAssetId:'asset-external-hero',size:'cover',positionX:40,positionY:60,
          overlay:{color:'@foreground',opacity:35}},
        responsive:{mobile:{columns:1,gap:12}},
        children:[
          {id:'approved-custom-copy',type:'text',text:'Особенный согласованный дизайн',
            styles:{fontSize:24},responsive:{mobile:{fontSize:18}}},
          {id:'approved-custom-photo',type:'image',assetId:'asset-external-hero',
            alt:'Графическое оформление',href:'/',responsiveMedia:{tabletAssetId:'asset-external-hero',mobileAssetId:'asset-external-hero'},styles:{radius:14,filterPreset:'grayscale'}}
        ]
      }]}
    });
    // Individually-authored rich composition: a real comparison table, an
    // attributed quotation, a plain link and an image swipe gallery.
    const rich=site.pages[0].sections.find(x=>x.id==='section-approved-custom').designGraph.nodes;
    const cell=(id,text)=>({id,type:'table-cell',text,styles:{}});
    const row=(id,values)=>({id,type:'table-row',styles:{},
      children:values.map((v,i)=>cell(id+'-cell-'+(i+1),v))});
    rich.push(
      {id:'approved-film',type:'video',assetId:'asset-external-film',
        posterAssetId:'asset-external-hero',alt:'Видеопрезентация утверждённого сайта',
        loop:false,styles:{widthPercent:100,aspectRatio:'wide'}},
      {id:'approved-rich-link',type:'link',text:'Перейти к началу',href:'/',styles:{textDecoration:'underline'},
        states:{active:{opacity:70,borderColor:'@accent',borderStyle:'dotted'}}},
      {id:'approved-rich-quote',type:'quote',text:'Цитата из согласованной спецификации',
        cite:'Подпись для цитаты',styles:{padding:16}},
      {id:'approved-rich-table',type:'table',text:'Характеристики услуги',styles:{},
        children:[row('approved-table-head',['Параметр','План A','План B']),
          row('approved-table-one',['Срок','По договору','По согласованию']),
          row('approved-table-two',['Поддержка','Включена','Уточняется'])]},
      {id:'approved-rich-gallery',type:'gallery',text:'Фотографии выполненных работ',
        styles:{},children:[1,2].map(i=>({id:'approved-gallery-photo-'+i,
          type:'image',assetId:'asset-external-hero',alt:'Изображение демонстрации '+i,styles:{}}))}
    );
    site.pages[0].sections.push(section);
    return site;
  });
  fs.writeFileSync(path.join(folder,'site.json'),JSON.stringify(external));
  const interiorPage=external.pages.find(item=>item.path!=='/');
  assert.ok(interiorPage,'Second page required to verify independent approved mockups');
  for(const bp of ['desktop','tablet','mobile'])
    fs.writeFileSync(path.join(folder,'prototypes','interior-'+bp+'.png'),examplePng);
  // The complete mockup/spec/site/media handoff is sealed before browser import.
  // It must be checked again by Studio against original bytes before any POST.
  const lockFile=path.join(folder,'handoff.json');
  const descriptor=JSON.parse(fs.readFileSync(lockFile,'utf8'));
  descriptor.files.pagePrototypes={
    [interiorPage.id]:{
      desktop:'prototypes/interior-desktop.png',
      tablet:'prototypes/interior-tablet.png',
      mobile:'prototypes/interior-mobile.png'
    }
  };
  const filePaths=[...Object.entries(descriptor.files).filter(([key])=>key!=='pagePrototypes')
    .map(([,v])=>v),
    ...Object.values(descriptor.files.pagePrototypes).flatMap(devices=>
      ['desktop','tablet','mobile'].map(bp=>devices[bp])),
    ...external.assets.flatMap(asset=>[asset.src.slice(1),
      ...(asset.variants||[]).map(v=>v.src.slice(1))])];
  descriptor.format='manufact-approved-site-handoff-v2';
  descriptor.integrity={algorithm:'sha256',files:Object.fromEntries(filePaths.map(name=>[
    name,require('node:crypto').createHash('sha256')
      .update(fs.readFileSync(path.join(folder,name))).digest('hex')
  ]))};
  fs.writeFileSync(lockFile,JSON.stringify(descriptor));
  // The Chromium directory picker is human-driven; Playwright's setInputFiles
  // cannot consistently feed a folder in headless Linux. Inject the exact File
  // objects with webkitRelativePath, as emitted by the native folder control.
  const uploaded=[];
  const walk=(dir,prefix='')=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const relative=prefix+entry.name,absolute=path.join(dir,entry.name);
      if(entry.isDirectory())walk(absolute,relative+'/');
      else uploaded.push({relative:'approved-external-site/'+relative,
        name:entry.name,base64:fs.readFileSync(absolute).toString('base64')});
    }
  };
  walk(folder);
  await page.evaluate(entries=>{
    // Assign an array of native File objects without DataTransfer cloning them.
    // webkitRelativePath is provided by the OS directory picker; copying files
    // through DataTransfer may strip that browser-maintained property.
    const selected=entries.map(entry=>{
      const bytes=Uint8Array.from(atob(entry.base64),char=>char.charCodeAt(0));
      const file=new File([bytes],entry.name);
      Object.defineProperty(file,'webkitRelativePath',{value:entry.relative});
      return file;
    });
    const input=document.querySelector('#server-approved-folder');
    Object.defineProperty(input,'files',{configurable:true,value:selected});
    input.dispatchEvent(new Event('change',{bubbles:true}));
  },uploaded);
  await page.locator('#server-approved-review').waitFor({timeout:20000});
  assert.match(await page.locator('#server-approved-media-bindings').innerText(),
    /медиа|привязк/, 'Owner sees true media use in the approved-folder review');
  assert.equal(await page.locator('#server-approved-prototypes img').count(),3,
    'Operator must inspect desktop/tablet/mobile visual evidence before database writes');
  assert.equal(await page.locator('#server-approved-video-review video').count(),1,
    'A real sealed MP4 must be available for owner review before first database write');
  assert.match(await page.locator('#server-approved-video-review video').getAttribute('src'),/^blob:/,
    'Approval reviews original local bytes without an external URL');
  assert.equal(await page.locator('#server-approved-prototypes iframe').count(),3,
    'Three responsive real site previews are required next to approved prototypes');
  const live=page.locator('iframe[data-preview-device="desktop"]');
  await page.waitForFunction(()=>document.querySelector('iframe[data-preview-device="desktop"]')
    ?.getAttribute('srcdoc')?.includes('Особенный согласованный дизайн'));
  assert.match(await live.getAttribute('srcdoc'),/Особенный согласованный дизайн/);
  const approvedPreviewHtml=await live.getAttribute('srcdoc');
  assert.match(approvedPreviewHtml,/<table class="cmsdg-n-approved-rich-table cmsdg-table">/,
    'External authored semantic table previews without arbitrary HTML');
  assert.match(approvedPreviewHtml,/<th scope="col"/);
  assert.match(approvedPreviewHtml,/cms-preview-site-footer/);
  assert.match(approvedPreviewHtml,/Юридическая информация/);
  assert.match(approvedPreviewHtml,/cmsdg-gallery/);
  assert.match(approvedPreviewHtml,/cmsdg-quote/);
  assert.match(approvedPreviewHtml,/data:image\/png;base64,/,
    'Pre-import CMS renderer resolves packaged image bytes without HTTP requests');
  assert.match(approvedPreviewHtml,/cms-menu-preview-brand/,
    'Pre-import preview displays the real packaged brand logo, not placeholder text');
  assert.equal((approvedPreviewHtml.match(/src="data:image\/png;base64,/g)||[]).length,5,
    'Brand logo, image section, custom image and two gallery frames use exact packaged immutable image bytes');
  await page.waitForFunction(()=>{
    const frame=document.querySelector('iframe[data-preview-device="desktop"]');
    return frame&&Number.parseInt(frame.style.height,10)>540&&
      frame.contentDocument?.documentElement?.scrollHeight>540;
  });
  await page.locator('#server-approved-expand-desktop').click();
  assert.match(await page.locator('[data-approved-compare="desktop"]')
    .evaluate(node=>node.style.gridTemplateColumns),/^repeat\(2,/);
  assert.equal(await page.locator('[data-approved-device="tablet"]').isVisible(),false);
  await page.locator('#server-approved-expand-desktop').click();
  assert.equal(await page.locator('[data-approved-device="tablet"]').isVisible(),true);
  const coverage=page.locator('#server-approved-editability');
  assert.equal(await coverage.count(),1,'Actual site editability map is visible');
  assert.match(await coverage.innerText(),/Контент:|Авторский дизайн:/);
  const viewportCoverage=page.locator('#server-approved-device-coverage');
  assert.match(await viewportCoverage.innerText(),/Компьютер:[^\n]*H1/);
  assert.match(await viewportCoverage.innerText(),/Планшет:[^\n]*H1/);
  assert.match(await viewportCoverage.innerText(),/Телефон:[^\n]*H1/);
  const pageOptions=await page.locator('#server-approved-review-page option').count();
  assert.ok(pageOptions>=2,'Owner can preview interior page before accepting site');
  const beforePageReference=await page.locator('[data-prototype="desktop"]').getAttribute('src');
  await page.locator('#server-approved-review-page').selectOption(interiorPage.path);
  assert.ok((await coverage.innerText()).includes(interiorPage.path),
    'Editability inventory follows this imported page');
  await page.waitForFunction(previous=>
    document.querySelector('[data-prototype="desktop"]')?.getAttribute('src')!==previous,
    beforePageReference);
  assert.match(await page.locator('[data-approved-device="desktop"]').innerText(),
    new RegExp(interiorPage.title),'Interior original should replace the homepage source');
  await page.locator('#server-approved-review-page').selectOption('/');
  assert.equal(await page.locator('#server-approved-review').getByText(/Описание для клиента/).count(),1);
  assert.equal(await page.locator('#server-approved-review').getByText(/Спецификация реализации/).count(),1);
  const beforeCancel=(await (await page.request.get(origin+'/api/sites')).json()).sites.length;
  await page.locator('#server-approved-review-cancel').click();
  // The dialog closes before the enclosing authenticated import operation
  // completes its cleanup. Wait for its busy lock to release before re-picking.
  await page.locator('#server-approved-review').waitFor({state:'detached'});
  await page.waitForFunction(()=>!document.getElementById('server-approved-import').disabled);
  assert.equal((await (await page.request.get(origin+'/api/sites')).json()).sites.length,beforeCancel,
    'Cancelling visual approval must not create a database site');
  // Re-select the same authentic folder after cancellation to confirm the
  // operator can still complete import with precisely the same sealed bytes.
  await page.evaluate(entries=>{
    const selected=entries.map(entry=>{
      const bytes=Uint8Array.from(atob(entry.base64),char=>char.charCodeAt(0));
      const file=new File([bytes],entry.name);
      Object.defineProperty(file,'webkitRelativePath',{value:entry.relative});
      return file;
    });
    const input=document.querySelector('#server-approved-folder');
    Object.defineProperty(input,'files',{configurable:true,value:selected});
    input.dispatchEvent(new Event('change',{bubbles:true}));
  },uploaded);
  await page.locator('#server-approved-review-confirm').waitFor({timeout:20000});
  // Simulate a real network interruption AFTER media upload but BEFORE final
  // Save. The first attempt must leave an unpublished recoverable seed.
  await page.route('**/api/sites/site-approved-browser/save',
    route=>route.abort('failed'),{times:1});
  await page.locator('#server-approved-review-confirm').click();
  await page.locator('#toast.error').getByText(/Импорт прерван/).waitFor({timeout:20000});
  await page.waitForFunction(()=>!document.getElementById('server-approved-import').disabled);
  const unfinished=(await (await page.request.get(
    origin+'/api/sites/site-approved-browser')).json());
  assert.equal(unfinished.site.assets.length,4,'Interrupted import retains both brand images, MP4 and WOFF2');
  assert.equal(unfinished.site.pages[0].sections.length,2,
    'Server stores only the unpublished seed until final manifest Save');
  assert.equal((await page.request.get(origin+'/published/site-approved-browser/')).status(),404,
    'Interrupted import must never publish');
  // Simulate a different tab / browser session: remove the old same-tab
  // checkpoint entirely. Only server-retained, immutable original handoff
  // and site.json hashes may authorize explicit recovery of this seed.
  const proofBeforeRetry=(await (await page.request.get(
    origin+'/api/sites/site-approved-browser/approval-evidence')).json()).packages;
  assert.equal(proofBeforeRetry.length,1);
  assert.equal(proofBeforeRetry[0].complete,false,
    'Partial imported seed keeps recovery originals but no false complete approval');
  assert.ok(proofBeforeRetry[0].files.handoff && proofBeforeRetry[0].files.site,
    'Both original sealed documents must survive before any media upload');
  await page.evaluate(()=>sessionStorage.clear());
  await page.reload();
  // A fresh session shows actual saved drafts in the CMS home, never silently
  // opens a random first site. Import is a separate explicit destination.
  await page.locator('#server-site-list .cms-site-card').first().waitFor();
  assert.equal(await page.locator('#server-view-home:visible').count(),1);
  await page.locator('#server-nav-import').click();
  await page.locator('#server-view-import:visible').waitFor();
  try{
    await page.locator('#server-approved-import:not([disabled])').waitFor({timeout:8000});
  }catch(error){
    console.error('Import action not visible after reload',await page.evaluate(()=>{
      const button=document.querySelector('#server-approved-import');
      const drawer=document.querySelector('#server-drawer-import');
      return {
        open:drawer?.open,drawerHidden:drawer?.hidden,
        drawerDisplay:drawer&&getComputedStyle(drawer).display,
        buttonHidden:button?.hidden,buttonDisabled:button?.disabled,
        buttonDisplay:button&&getComputedStyle(button).display,
        ancestors:button&&[...function*(){let n=button;while(n){yield [n.tagName,n.id,n.className,n.hidden,n instanceof HTMLDetailsElement?n.open:null,getComputedStyle(n).display];n=n.parentElement;}}()]
      };
    }));
    throw error;
  }
  await page.evaluate(entries=>{
    const selected=entries.map(entry=>{
      const bytes=Uint8Array.from(atob(entry.base64),char=>char.charCodeAt(0));
      const file=new File([bytes],entry.name);
      Object.defineProperty(file,'webkitRelativePath',{value:entry.relative});
      return file;
    });
    const input=document.querySelector('#server-approved-folder');
    Object.defineProperty(input,'files',{configurable:true,value:selected});
    input.dispatchEvent(new Event('change',{bubbles:true}));
  },uploaded);
  try{
    await page.locator('#server-approved-review-confirm').waitFor({timeout:20000});
  }catch(error){
    const diagnostic=await page.evaluate(()=>({
      toast:document.querySelector('#toast')?.textContent,
      status:document.querySelector('#server-status')?.textContent,
      isBusy:document.querySelector('#server-approved-import')?.disabled,
      review:!!document.querySelector('#server-approved-review'),
      site:window.Stage3Editor?.getSite()?.siteId
    }));
    throw Error('Approved site recovery preflight refused: '+JSON.stringify(diagnostic)+
      ' · page errors: '+JSON.stringify(errors)+' · '+String(error).slice(0,180));
  }
  assert.match(await page.locator('#server-approved-review-confirm').innerText(),/Продолжить/);
  assert.equal(await page.locator('#server-approved-review-confirm').isDisabled(),true,
    'Recovery from a new tab demands distinct owner acknowledgement');
  await page.locator('#server-approved-recovery-confirm').check();
  assert.equal(await page.locator('#server-approved-review-confirm').isEnabled(),true);
  await page.locator('#server-approved-review-confirm').click();
  try{
    await page.locator('#toast').getByText(/Импорт безопасно продолжен/).waitFor({timeout:20000});
  }catch(err){
    const diagnostic=await page.evaluate(()=>({
      toast:document.querySelector('#toast')?.textContent,
      status:document.querySelector('#server-status')?.textContent,
      site:window.Stage3Editor?.getSite()?.siteId
    }));
    throw Error('Approved folder continuation failed: '+
      JSON.stringify({diagnostic,errors,original:String(err).slice(0,300)}));
  }
  const resumed=(await (await page.request.get(origin+'/api/sites/site-approved-browser')).json());
  assert.equal(resumed.revision,unfinished.revision+1,
    'Cross-session recovery reuses stored media and adds ONLY final Save revision');
  assert.equal(resumed.site.assets.length,4,'Continuation never duplicates logo, mobile logo, MP4 or WOFF2');
  const imported=await page.evaluate(()=>window.Stage3Editor.getSite());
  assert.equal(imported.siteId,'site-approved-browser');
  assert.equal(await page.locator('#server-empty-state:visible').count(),0);
  assert.equal(imported.assets.length,4);
  await page.locator('#server-nav-site').click();
  assert.match(await page.locator('#server-project-title').innerText(),/Внешний готовый сайт/);
  assert.equal(await page.locator('#server-project-pages .cms-page-link').count(),2);
  assert.equal(await page.locator('#server-project-advanced').evaluate(node=>node.open),false,
    'Secondary site switching stays collapsed in the project overview');
  assert.equal(await page.locator('#server-site-select:visible').count(),0);
  await page.locator('#server-project-advanced > summary').click();
  assert.equal(await page.locator('#server-site-select:visible').count(),1);
  await page.locator('#server-project-advanced > summary').click();
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-site-dashboard.png'),fullPage:true});
  await page.locator('#server-project-pages .cms-page-link').first().click();
  await page.locator('#page-add:visible').waitFor();
  assert.equal(await page.locator('[data-inspector-scope="page"]').getAttribute('aria-pressed'),'true',
    'Opening a page in the routed Studio shows its page-level context');
  assert.equal(await page.locator('#cms-page-actions-slot #server-page-actions').count(),1,
    'Existing page actions are owned by the page Inspector, not the sidebar');
  assert.equal(await page.locator('#cms-page-context-path').innerText(),
    'Адрес: '+(await page.evaluate(()=>window.Stage3Editor.getSite().pages[0].path)));
  assert.equal(await page.locator('#cms-section-navigator').evaluate(node=>node.open),false,
    'Hosted Studio begins on full visual page with optional section tree');
  await page.locator('#cms-section-navigator>summary').click();
  assert.equal(await page.locator('#server-project-editor').count(),1);

  // Actual Chromium renders of the OWNER Studio (synthetic CI content only).
  // These go into the existing screenshot artifact, not a new UI/test system;
  // they are evidence for later human visual review, never owner sign-off.
  // The page/section tree exposes the current location to assistive technology
  // and keeps keyboard focus on the selected item after the existing redraw.
  await page.waitForFunction(()=>document.querySelectorAll('#pages .nav-entry[aria-current="page"]').length===1&&
    document.querySelectorAll('#sections .nav-entry[aria-current="location"]').length===0);
  assert.equal(await page.locator('#pages .nav-entry[aria-current="page"]').count(),1);
  assert.equal(await page.locator('#sections .nav-entry[aria-current="location"]').count(),0,
    'Choosing a page does not pretend a section is also the active editing scope');
  assert.equal(await page.locator('#server-page-actions').evaluate(node=>node.open),false);
  await page.locator('#server-page-actions>summary').click();
  assert.equal(await page.locator('#page-rename').isVisible(),true);
  await page.locator('#page-rename').click();
  await page.locator('#cms-page-details-dialog[open]').waitFor();
  assert.equal((await page.locator('#cms-page-details-title').inputValue()).length>0,true);
  assert.equal((await page.locator('#cms-page-details-path').inputValue()).startsWith('/'),true);
  const pageDetailsPalette=await page.locator('#cms-page-details-dialog').evaluate(dialog=>{
    const label=dialog.querySelector('label'),description=dialog.querySelector('#cms-page-details-description');
    return {background:getComputedStyle(dialog).backgroundColor,
      label:getComputedStyle(label).color,description:getComputedStyle(description).color};
  });
  assert.deepEqual(pageDetailsPalette,{background:'rgb(255, 255, 255)',
    label:'rgb(41, 71, 98)',description:'rgb(83, 107, 133)'},
    'Page settings form must keep readable contrast in the hosted light theme');
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-page-details.png'),fullPage:true});
  await page.locator('#cms-page-details-cancel').click();
  await page.locator('#cms-page-details-dialog').waitFor({state:'hidden'});
  await page.locator('#server-page-actions>summary').click();
  await page.locator('#sections .nav-entry').first().click();
  assert.equal(await page.locator('[data-inspector-scope="block"]').getAttribute('aria-pressed'),'true');
  await page.locator('#server-section-actions>summary').click();
  assert.equal(await page.locator('#section-appearance').isVisible(),true);
  await page.locator('#server-section-actions>summary').click();
  await page.locator('#cms-canvas-add-block').click();
  await page.locator('#cms-component-catalog[open]').waitFor();
  await page.locator('#cms-component-catalog').getByRole('button',{name:'Закрыть'}).click();
  assert.equal(await page.locator('#server-tool-appearance #cms-open-theme').count(),1);
  assert.equal(await page.locator('#server-page-actions #cms-open-seo').count(),1);
  assert.equal(await page.locator('#server-tool-seo #cms-open-seo').count(),0);
  assert.equal(await page.locator('#server-tool-navigation #cms-menu-open').count(),1);
  const secondPage=page.locator('#pages .nav-entry').last();
  await secondPage.focus();
  await page.keyboard.press('Enter');
  await waitSelectedPageKeyboardFocus('forward');
  await openSectionTree();
  const lastSection=page.locator('#sections .nav-entry').last();
  await lastSection.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.matches('#sections .nav-entry.active[aria-current="location"]'));
  const firstPage=page.locator('#pages .nav-entry').first();
  await firstPage.focus();
  await page.keyboard.press('Enter');
  await waitSelectedPageKeyboardFocus('return');
  const tabletDevice=page.locator('.canvas-toolbar .devices [data-bp="tablet"]');
  const desktopDevice=page.locator('.canvas-toolbar .devices [data-bp="desktop"]');
  await tabletDevice.click();
  await page.waitForFunction(()=>document.querySelector('.canvas-toolbar .devices [data-bp="tablet"]')?.getAttribute('aria-pressed')==='true');
  assert.equal(await desktopDevice.getAttribute('aria-pressed'),'false');
  await desktopDevice.click();
  await page.waitForFunction(()=>document.querySelector('.canvas-toolbar .devices [data-bp="desktop"]')?.getAttribute('aria-pressed')==='true');
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'main-content',
    'Skip link must move keyboard focus to the main editor workspace');
  await page.evaluate(()=>window.scrollTo(0,0));

  const contrastSamples=await page.evaluate(()=>{
    const linear=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
    const luminance=value=>{
      const m=value.match(/[\d.]+/g)?.map(Number)||[0,0,0];
      return .2126*linear(m[0])+.7152*linear(m[1])+.0722*linear(m[2]);
    };
    const background=element=>{
      for(let node=element;node;node=node.parentElement){
        const color=getComputedStyle(node).backgroundColor;
        if(color&&color!=='transparent'&&color!=='rgba(0, 0, 0, 0)')return color;
      }
      return 'rgb(255, 255, 255)';
    };
    return ['.eyebrow','.subdued','.nav-title','.field-path:not([role="alert"])']
      .map(selector=>document.querySelector(selector))
      .filter(Boolean).map(element=>{
        const fg=getComputedStyle(element).color,bg=background(element);
        const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        return {selector:element.className,color:fg,background:bg,ratio};
      });
  });
  assert.ok(contrastSamples.length>=3,'Representative owner UI text must be present for contrast review');
  assert.ok(contrastSamples.every(sample=>sample.ratio>=4.5),
    'Small owner UI text must meet WCAG AA contrast: '+JSON.stringify(contrastSamples));

  const assertNoHorizontalOverflow=async label=>{
    const metrics=await page.evaluate(()=>({
      viewport:document.documentElement.clientWidth,
      document:document.documentElement.scrollWidth,
      body:document.body.scrollWidth
    }));
    assert.ok(metrics.document<=metrics.viewport+1&&metrics.body<=metrics.viewport+1,
      label+' must not create page-level horizontal scrolling: '+JSON.stringify(metrics));
  };
  await page.evaluate(()=>{
    for(const node of document.querySelectorAll(
      '#server-tools details,#server-site-tools details,#server-admin-more,#server-site-tools'))
      node.open=false;
  });
  // The main canvas may focus the selected block. Full-page composition is
  // verified in the dedicated page-preview dialog below.
  const hostedBoundSection=page.frameLocator('#preview').locator('[data-cms-editor-section]').first();
  await hostedBoundSection.waitFor({state:'visible'});
  assert.equal(await page.locator('#canvas-title').innerText(),imported.pages[0].title,
    'Main canvas shows the full selected page, not an isolated block preview');
  assert.equal(await page.locator('#preview').getAttribute('sandbox'),'allow-same-origin',
    'The hosted canvas remains scriptless while the parent can select rendered blocks');
  const hostedCanvasDraftBefore=await page.evaluate(()=>JSON.stringify(window.Stage3Editor.getSite()));
  await page.evaluate(()=>{window.__hostedCanvasDoc=document.querySelector('#preview').contentDocument;});
  /* Test a REAL pointer hit on a bound PHP section. Playwright's locator.click
     waits for pixel-stable geometry; animated content inside this otherwise
     selectable section can make that wait time out forever. Calculate an
     actual on-screen hit inside its unbound background and use the mouse. */
  const sectionPointer=await page.evaluate(()=>{
    const iframe=document.querySelector('#preview');
    const doc=iframe.contentDocument;
    const section=doc.querySelector('[data-cms-editor-section]');
    section.scrollIntoView({block:'start',behavior:'instant'});
    const frameRect=iframe.getBoundingClientRect(),rect=section.getBoundingClientRect();
    const localX=rect.left+Math.min(20,rect.width/3);
    const localY=rect.top+Math.min(180,rect.height/3);
    const x=frameRect.left+localX*frameRect.width/iframe.clientWidth;
    const y=frameRect.top+localY*frameRect.height/iframe.clientHeight;
    const target=doc.elementFromPoint(localX,localY);
    return {x,y,boundSectionHit:!!target&&section.contains(target),
      iframeHit:document.elementFromPoint(x,y)===iframe};
  });
  assert.equal(sectionPointer.boundSectionHit,true,
    'The real Chromium pointer target belongs to the selected PHP section');
  assert.equal(sectionPointer.iframeHit,true,
    'No Studio overlay intercepts the full-page canvas pointer');
  await page.mouse.click(sectionPointer.x,sectionPointer.y);
  await page.waitForFunction(()=>
    document.querySelector('#inspector-eyebrow')?.textContent?.trim()==='НАСТРОЙКИ БЛОКА',
    null,{timeout:5000});
  assert.equal(await page.locator('#inspector-eyebrow').innerText(),'НАСТРОЙКИ БЛОКА',
    'Pointer selection in actual PHP preview opens the block Inspector');
  assert.equal(await page.evaluate(()=>document.querySelector('#preview').contentDocument===window.__hostedCanvasDoc),true,
    'Clicking a PHP-rendered section does not reload the full page');
  assert.equal(await page.locator('#cms-block-contents [data-cms-block-child]').count()>0,true,
    'Selected PHP-rendered section shows its actual editable children');
  assert.equal(await page.locator('#cms-selected-block-actions').isVisible(),true,
    'Block actions appear in the Inspector, not in permanent side navigation');
  await page.locator('.inspector').screenshot({
    path:path.join(studioScreenDir,'owner-studio-canvas-section-contents.png'),animations:'disabled'});
  assert.equal(await page.evaluate(()=>JSON.stringify(window.Stage3Editor.getSite())),
    hostedCanvasDraftBefore,'Hosted preview selection does not modify the server draft');
  // A slow stale PHP preview reply must NEVER replace the latest canvas or
  // leave an old document clickable against a newer editor/device state.
  // Inject one delayed 409 into the real browser transport, while the newer
  // request still runs through the actual PHP renderer on the test host.
  let competingCanvasRequests=0;
  const competingCanvasRoute='**/api/sites/site-approved-browser/preview';
  await page.route(competingCanvasRoute,async route=>{
    competingCanvasRequests++;
    if(competingCanvasRequests===1){
      await new Promise(resolve=>setTimeout(resolve,1150));
      return route.fulfill({status:409,contentType:'application/json',
        body:JSON.stringify({error:'Stale editor revision'})});
    }
    return route.continue();
  });
  await tabletDevice.click();
  await page.locator('#preview[aria-busy="true"]').waitFor();
  assert.equal(await page.locator('#preview').evaluate(node=>node.style.pointerEvents),'none',
    'An older PHP canvas must not receive clicks while its replacement is pending');
  await desktopDevice.click();
  await page.waitForFunction(()=>{
    const frame=document.querySelector('#preview'),doc=frame?.contentDocument;
    return !frame.hasAttribute('aria-busy')&&frame.style.pointerEvents===''&&
      !!doc?.querySelector('[data-cms-editor-section]')&&
      Number(doc.querySelector('meta[name="cms-canvas-render-ticket"]')?.content)>0;
  },null,{timeout:20000});
  await page.waitForTimeout(1250);
  assert.ok(competingCanvasRequests>=2,'The test exercised competing server canvas renders');
  assert.equal(await page.locator('#preview').getAttribute('aria-busy'),null);
  assert.doesNotMatch(await page.frameLocator('#preview').locator('body').innerText(),
    /Stale editor revision|Не удалось построить предпросмотр страницы/,
    'A late 409 from the obsolete preview must never displace the newer PHP page');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.Stage3Editor.getSite())),
    hostedCanvasDraftBefore,'Canvas render races must not modify the owner draft');
  await page.unroute(competingCanvasRoute);
  const canvasGraph=imported.pages[0].sections.find(section=>section.designGraph);
  assert.ok(canvasGraph,'The approved-site browser fixture has an individual Design Graph section');
  const graphTextId='approved-custom-copy';
  const graphVisual=page.frameLocator('#preview').locator(
    '#'+canvasGraph.id+' .cmsdg-n-'+graphTextId);
  await graphVisual.waitFor();
  assert.equal(await graphVisual.getAttribute('data-cms-editor-graph-node'),graphTextId,
    'Only a real validated PHP-rendered Graph node receives the editor binding');
  await graphVisual.focus();
  await graphVisual.press('Enter');
  await page.locator('#cms-page-preview[open]').waitFor();
  assert.equal(await page.locator('#cms-work-graph-node').inputValue(),graphTextId,
    'Selecting an individual Graph text node opens its exact existing Workbench inspector');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.Stage3Editor.getSite())),
    hostedCanvasDraftBefore,'Opening the Workbench from canvas does not modify the draft');
  await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();
  await openSectionTree();
  await page.locator('#sections .nav-entry').first().click();

  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-hosted-desktop.png'),fullPage:true});
  await page.setViewportSize({width:1024,height:900});
  await assertNoHorizontalOverflow('Studio at 1024px');
  await page.setViewportSize({width:768,height:900});
  await assertNoHorizontalOverflow('Studio at 768px');
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-hosted-tablet.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  const mobileFlow=await page.evaluate(()=>({
    sidebar:getComputedStyle(document.querySelector('.sidebar')).position,
    inspector:getComputedStyle(document.querySelector('.inspector')).position
  }));
  assert.equal(mobileFlow.sidebar,'static','Phone navigation must remain in normal document flow');
  assert.equal(mobileFlow.inspector,'static','Phone inspector must not overlay the editor');
  await assertNoHorizontalOverflow('Studio at 390px');
  const mobileTreeLayout=await page.evaluate(()=>{
    const nav=document.querySelector('#sections'),style=getComputedStyle(nav);
    return {display:style.display,overflowX:style.overflowX,
      clientWidth:nav.clientWidth,scrollWidth:nav.scrollWidth};
  });
  assert.equal(mobileTreeLayout.display,'flex','Mobile section tree must use the compact horizontal layout');
  assert.equal(mobileTreeLayout.overflowX,'auto','Mobile section tree must scroll internally');
  assert.ok(mobileTreeLayout.scrollWidth>mobileTreeLayout.clientWidth,
    'Long block lists must scroll inside the tree, not extend the page: '+JSON.stringify(mobileTreeLayout));
  const sectionSearch=page.locator('#server-search-sections');
  await sectionSearch.fill('FAQ');
  await sectionSearch.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.matches('#sections .nav-entry.active[aria-current="location"]'));
  const activeSectionVisible=await page.evaluate(()=>{
    const nav=document.querySelector('#sections'),active=document.activeElement;
    const navRect=nav.getBoundingClientRect(),itemRect=active.getBoundingClientRect();
    return itemRect.left>=navRect.left-1&&itemRect.right<=navRect.right+1;
  });
  assert.ok(activeSectionVisible,'Keyboard search must scroll the selected mobile block into view');
  await sectionSearch.press('Escape');
  await sectionSearch.fill('');
  await openSectionTree();
  assert.equal(await page.locator('#sections .nav-entry').first().isVisible(),true,
    'Clearing block search restores normal page navigation');
  await page.locator('#sections .nav-entry').first().click();
  assert.equal(await page.locator('#save').getAttribute('aria-keyshortcuts'),'Control+S Meta+S');
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-hosted-mobile.png'),fullPage:true});
  // Site settings have their own screen; native edit dialogs still return
  // focus to the invoking control after Escape.
  await page.locator('#server-nav-site-settings').click();
  await page.locator('#server-view-site-settings:visible').waitFor();
  await page.locator('#server-tool-navigation').evaluate(node=>{node.open=true;});
  await page.locator('#cms-menu-open').click();
  await page.locator('#cms-menu-editor[open]').waitFor();
  const menuDialogLabel=await page.locator('#cms-menu-editor').getAttribute('aria-labelledby');
  assert.ok(menuDialogLabel,'Menu editor dialog must have an accessible heading reference');
  assert.equal(await page.locator('#'+menuDialogLabel).innerText(),'Меню и навигация сайта');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#cms-menu-editor')?.open);
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'cms-menu-open',
    'Closing the menu dialog with Escape must return focus to its launcher');
  await page.locator('#server-nav-editor').click();

  // The preceding owner-phone journey leaves the outer browser at 390px.
  // Restore desktop BEFORE opening the Workbench so its screenshot really
  // documents the wide editor, rather than a mislabeled second phone shot.
  await page.setViewportSize({width:1400,height:1000});
  await assertNoHorizontalOverflow('Workbench at 1400px');
  await page.locator('#server-edit-page').click();
  await page.locator('#cms-page-preview[open]').waitFor();
  await page.locator('#cms-page-preview .cms-page-preview-modes [data-mode="desktop"]').click();
  const secondaryWorkActions=page.locator('#cms-work-section-operations');
  assert.equal(await secondaryWorkActions.evaluate(el=>el.open),false,
    'A real hosted Workbench opens with secondary section actions hidden');
  assert.equal(await page.locator('#cms-work-destination').isVisible(),false,
    'Cross-page controls cannot overwhelm the contextual PHP editor');
  assert.equal(await page.locator('#cms-work-fields').isVisible(),true,
    'Editable properties remain visible in the real hosted Workbench');
  await page.waitForFunction(()=>{
    const frame=document.querySelector('#cms-page-preview-frame');
    return !!frame?.contentDocument?.querySelector('[data-cms-section-id],section[id]');
  });
  await page.frameLocator('#cms-page-preview-frame')
    .locator('[data-cms-section-id],section[id]').filter({visible:true}).nth(1).waitFor();
  // Responsive controls resize the SAME PHP document; no new preview POST,
  // iframe navigation, flash or lost section selection should be introduced.
  await page.evaluate(()=>{
    window.__ownerWorkbenchDocument=document.querySelector('#cms-page-preview-frame').contentDocument;
  });
  let responsivePreviewRequests=0;
  const countResponsivePreview=request=>{
    if(request.method()==='POST'&&new URL(request.url()).pathname===
      '/api/sites/site-approved-browser/preview')responsivePreviewRequests++;
  };
  page.on('request',countResponsivePreview);
  assert.equal(page.viewportSize().width,1400,
    'owner-studio-workbench-desktop.png must capture a genuine desktop viewport');
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-workbench-desktop.png'),fullPage:true});
  await page.setViewportSize({width:768,height:900});
  await assertNoHorizontalOverflow('Workbench at 768px');
  await page.locator('#cms-page-preview .cms-page-preview-modes [data-mode="tablet"]').click();
  await page.waitForFunction(()=>!!document.querySelector('#cms-page-preview-frame')?.contentDocument?.querySelector('[data-cms-section-id],section[id]'));
  const tabletWorkbench=await page.evaluate(()=>{
    const area=document.querySelector('#cms-page-preview .cms-page-preview-area').getBoundingClientRect();
    const panel=document.querySelector('#cms-page-preview .cms-work-panel').getBoundingClientRect();
    const modal=document.querySelector('#cms-page-preview').getBoundingClientRect();
    return {area:{y:area.y,width:area.width,bottom:area.bottom},
      panel:{y:panel.y},modalWidth:modal.width};
  });
  assert.ok(tabletWorkbench.panel.y>=tabletWorkbench.area.bottom-2,
    'Tablet Workbench stacks the Inspector below the page instead of splitting it in half');
  assert.ok(tabletWorkbench.area.width>tabletWorkbench.modalWidth*.8,
    'Tablet preview gets nearly the whole dialog width');
  await page.waitForFunction(()=>{
    const frame=document.querySelector('#cms-page-preview-frame');
    const doc=frame?.contentDocument;
    const heading=doc?.querySelector('.cms-work-element-current')||
      doc?.querySelector('.cms-work-current h1,.cms-work-current h2');
    if(!heading||!frame)return false;
    const rect=heading.getBoundingClientRect();
    return rect.bottom>0&&rect.top<frame.clientHeight-32;
  });
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-workbench-tablet.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await assertNoHorizontalOverflow('Workbench at 390px');
  const mobileDialogBox=await page.locator('#cms-page-preview').boundingBox();
  assert.ok(mobileDialogBox&&mobileDialogBox.x>=0&&mobileDialogBox.x+mobileDialogBox.width<=391,
    'Workbench dialog must remain inside the phone viewport');
  await page.locator('#cms-page-preview .cms-page-preview-modes [data-mode="mobile"]').click();
  await page.waitForFunction(()=>!!document.querySelector('#cms-page-preview-frame')?.contentDocument?.querySelector('[data-cms-section-id],section[id]'));
  page.off('request',countResponsivePreview);
  assert.equal(responsivePreviewRequests,0,
    'Phone and tablet switches do not trigger duplicate authenticated PHP renders');
  assert.equal(await page.evaluate(()=>document.querySelector('#cms-page-preview-frame').contentDocument===
    window.__ownerWorkbenchDocument),true,
  'Phone and tablet switches retain the actual PHP iframe document and its scroll/selection');
  assert.equal(await page.locator('#cms-work-preview-progress').isVisible(),false,
    'Responsive mode switching never displays a loading state');
  const mobileWorkbench=await page.evaluate(()=>{
    const area=document.querySelector('#cms-page-preview .cms-page-preview-area').getBoundingClientRect();
    const panel=document.querySelector('#cms-page-preview .cms-work-panel').getBoundingClientRect();
    const frame=document.querySelector('#cms-page-preview-frame').getBoundingClientRect();
    const dialog=document.querySelector('#cms-page-preview');
    return {areaHeight:area.height,areaBottom:area.bottom,panelTop:panel.top,frameHeight:frame.height,
      dialogScrollHeight:dialog.scrollHeight,dialogClientHeight:dialog.clientHeight};
  });
  assert.ok(mobileWorkbench.areaHeight>=210,
    'Phone Workbench gives the page a useful viewport instead of a toolbar sliver');
  assert.ok(mobileWorkbench.panelTop>=mobileWorkbench.areaBottom-2,
    'Phone Inspector stays below the page preview');
  assert.ok(mobileWorkbench.frameHeight<=mobileWorkbench.areaHeight+5,
    'Phone PHP iframe fits the visible viewport instead of being cropped');
  assert.ok(mobileWorkbench.dialogScrollHeight>mobileWorkbench.dialogClientHeight+30,
    'The phone Workbench scrolls to its complete inspector rather than clipping it');
  // Opening directly in phone mode should reveal the active section in the
  // real iframe. Device-only switches above intentionally preserve scroll.
  await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();
  await page.locator('#server-edit-page').click();
  await page.locator('#cms-page-preview[open]').waitFor();
  await page.waitForFunction(()=>{
    const frame=document.querySelector('#cms-page-preview-frame');
    const selected=frame?.contentDocument?.querySelector('.cms-work-current');
    if(!selected||!frame||frame.getAttribute('aria-busy')==='true')return false;
    const rect=(selected.querySelector('h1,h2')||selected).getBoundingClientRect();
    return rect.bottom>0&&rect.top<frame.getBoundingClientRect().height;
  });
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-workbench-mobile.png'),fullPage:true});
  assert.equal(await page.locator('#cms-page-preview').evaluate(dialog=>{
    dialog.scrollTop=dialog.scrollHeight;
    const inspector=dialog.querySelector('.cms-work-panel').getBoundingClientRect();
    const viewport=dialog.getBoundingClientRect();
    const reachable=inspector.top<viewport.bottom&&inspector.bottom>viewport.top;
    dialog.scrollTop=0;
    return reachable;
  }),true,'The whole contextual Inspector is reachable by normal phone dialog scrolling');
  // On an actual 390px phone, clicking an element in the *PHP iframe* should
  // bring its existing property into view without making the owner manually
  // scroll past the entire preview and structural button list.
  const beforePhoneTap=await page.evaluate(()=>JSON.stringify(window.Stage3Editor.getSite()));
  await page.frameLocator('#cms-page-preview-frame').locator('.cmsdg-n-approved-custom-copy').click();
  assert.equal(await page.locator('#cms-work-graph-node').inputValue(),'approved-custom-copy');
  assert.match(await page.locator('#cms-work-graph-node option:checked').innerText(),/^— Текст · /,
    'Nested elements are described in Russian instead of leaking raw Graph types');
  assert.equal(await page.locator('#cms-work-graph-operations').evaluate(node=>node.open),false,
    'Structure actions start closed beneath the editable Graph properties');
  const revealedPhoneField=await page.evaluate(()=>{
    const dialog=document.querySelector('#cms-page-preview');
    const field=dialog.querySelector('#cms-work-graph-panel [data-work-graph-field="text"]');
    const view=dialog.getBoundingClientRect(),rect=field.getBoundingClientRect();
    return {scroll:dialog.scrollTop,visible:rect.top>=view.top&&rect.top<view.bottom-40,
      active:document.activeElement?.id};
  });
  assert.ok(revealedPhoneField.scroll>30&&revealedPhoneField.visible,
    'Tapping Graph text on the phone reveals its editable property in the single scrolling dialog');
  assert.notEqual(revealedPhoneField.active,'cms-work-graph-node',
    'Canvas selection does not focus an input and summon a phone keyboard');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.Stage3Editor.getSite())),beforePhoneTap,
    'Revealing an Inspector field never changes the draft');
  await page.locator('#cms-page-preview').evaluate(dialog=>{dialog.scrollTop=0;});
  const ordinaryPhoneText=page.frameLocator('#cms-page-preview-frame')
    .locator('[data-cms-work-element][data-cms-work-path="content.text"]:visible').first();
  const ordinaryPhoneId=await ordinaryPhoneText.getAttribute('data-cms-work-element');
  await ordinaryPhoneText.click();
  assert.equal(await page.locator('#cms-work-element').inputValue(),ordinaryPhoneId,
    'A regular template text is also selected by its real manifest element ID');
  const ordinaryPhoneField=await page.evaluate(()=>{
    const dialog=document.querySelector('#cms-page-preview');
    const field=dialog.querySelector('#cms-work-fields .cms-work-field-current [data-page-field="content.text"]');
    const rect=field.getBoundingClientRect(),view=dialog.getBoundingClientRect();
    return {scroll:dialog.scrollTop,visible:rect.top>=view.top&&rect.top<view.bottom-40};
  });
  assert.ok(ordinaryPhoneField.scroll>30&&ordinaryPhoneField.visible,
    'A normal template heading/paragraph likewise reveals the exact editable phone field');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.Stage3Editor.getSite())),beforePhoneTap);
  await page.locator('#cms-page-preview').evaluate(dialog=>{dialog.scrollTop=0;});
  // An image has a different primary action from a text element: the owner
  // should reach the EXISTING responsive media chooser with one canvas tap.
  // The approved external asset is deliberately 2×2px. Its enclosing custom
  // container covers that tiny physical hitbox, so dispatch the bound iframe
  // event here; the normal-sized PHP gallery below tests real pointer taps.
  await page.frameLocator('#cms-page-preview-frame')
    .locator('.cmsdg-n-approved-custom-photo').dispatchEvent('click');
  assert.equal(await page.locator('#cms-work-graph-node').inputValue(),'approved-custom-photo');
  assert.equal(await page.locator('#cms-work-graph-image-library').evaluate(node=>node.open),true,
    'Tapping an authored image opens its real per-device library on a phone');
  const phoneImageChooser=await page.evaluate(()=>{
    const dialog=document.querySelector('#cms-page-preview');
    const summary=dialog.querySelector('#cms-work-graph-image-library > summary');
    const rect=summary.getBoundingClientRect(),view=dialog.getBoundingClientRect();
    return {scroll:dialog.scrollTop,visible:rect.top>=view.top&&rect.top<view.bottom-40};
  });
  assert.ok(phoneImageChooser.scroll>30&&phoneImageChooser.visible,
    'The phone jumps to the responsive image picker, not the distant Graph heading');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.Stage3Editor.getSite())),beforePhoneTap,
    'Opening an image chooser by touch never edits or saves the draft');
  await page.locator('#cms-page-preview').evaluate(dialog=>{dialog.scrollTop=0;});
  await page.setViewportSize({width:1400,height:1000});
  // Rapid page switching in the same Workbench: an old server-side conflict
  // must not unfreeze or replace the newer PHP iframe. Verify real HTML, not
  // a mocked offline preview or a hidden error in the modal background.
  const originalWorkPath=await page.locator('#cms-page-preview-path').inputValue();
  const alternateWorkPath=imported.pages.find(row=>row.path!==originalWorkPath)?.path;
  assert.ok(alternateWorkPath,'Approved fixture needs a second real page for the race');
  let competingWorkRequests=0;
  await page.route(competingCanvasRoute,async route=>{
    competingWorkRequests++;
    if(competingWorkRequests===1){
      await new Promise(resolve=>setTimeout(resolve,1150));
      return route.fulfill({status:409,contentType:'application/json',
        body:JSON.stringify({error:'Stale editor revision'})});
    }
    return route.continue();
  });
  await page.locator('#cms-page-preview-path').selectOption(alternateWorkPath);
  await page.locator('#cms-page-preview-frame[aria-busy="true"]').waitFor();
  assert.equal(await page.locator('#cms-page-preview-frame').evaluate(node=>node.style.pointerEvents),
    'none','Workbench disables selection during the in-flight replacement');
  await page.locator('#cms-page-preview-path').selectOption(originalWorkPath);
  await page.waitForFunction(()=>{
    const frame=document.querySelector('#cms-page-preview-frame');
    const doc=frame?.contentDocument;
    return !frame?.hasAttribute('aria-busy')&&frame.style.pointerEvents===''&&
      !!doc?.querySelector('.cms-work-target')&&
      Number(doc.querySelector('meta[name="cms-work-render-ticket"]')?.content)>0;
  },null,{timeout:20000});
  await page.waitForTimeout(1250);
  assert.ok(competingWorkRequests>=2,'The browser exercised competing Workbench PHP requests');
  assert.doesNotMatch(await page.frameLocator('#cms-page-preview-frame').locator('body').innerText(),
    /Stale editor revision|Не удалось построить серверный предпросмотр/,
    'A stale Workbench response cannot replace the latest selected page');
  assert.equal(await page.locator('#cms-page-preview-path').inputValue(),originalWorkPath);
  await page.unroute(competingCanvasRoute);
  // Everyday Elementor-like editing: changing a real Graph text and an
  // appearance select must not tear down the owner's active Inspector field,
  // collapse the expanded group or jump its internal scroll back to the top.
  await page.locator('#cms-work-section').selectOption('section-approved-custom');
  await page.locator('#cms-work-graph-node').selectOption('approved-custom-copy');
  assert.equal(await secondaryWorkActions.evaluate(el=>el.open),false,
    'Picking a different block keeps the technical actions collapsed');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'cms-work-graph-node',
    'Selecting a nested Graph element keeps keyboard focus on its new picker');
  await secondaryWorkActions.locator('summary').click();
  assert.equal(await page.locator('#cms-work-destination').isVisible(),true,
    'Optional cross-page actions can still be opened deliberately');
  const workText=page.locator('[data-work-graph-field="text"]');
  const originalWorkText=await workText.inputValue();
  await workText.fill(originalWorkText+' · пробная правка');
  await workText.press('Tab');
  await page.waitForFunction(()=>window.Stage3Editor.getSite().pages[0].sections
    .find(s=>s.id==='section-approved-custom').designGraph.nodes[0].children
    .find(n=>n.id==='approved-custom-copy').text.endsWith('· пробная правка'));
  assert.equal(await page.locator('[data-work-graph-field="text"]').inputValue(),
    originalWorkText+' · пробная правка');
  assert.equal(await secondaryWorkActions.evaluate(el=>el.open),true,
    'An explicit secondary-actions disclosure remains open after editing the same element');
  assert.equal(await page.evaluate(()=>document.activeElement?.closest('.cms-work-panel')!==null),true,
    'Tab after saving a field stays inside the contextual Inspector');
  assert.notEqual(await page.evaluate(()=>document.activeElement?.dataset.workGraphField),'text',
    'Tab advances to the next field instead of refocusing the field just committed');
  const appearance=page.locator('#cms-work-fields > details.cms-work-appearance');
  await appearance.locator('summary').click();
  const appearanceScroll=await page.locator('.cms-work-panel').evaluate(node=>node.scrollTop);
  await page.locator('[data-work-appearance="surface"]').focus();
  await page.locator('[data-work-appearance="surface"]').selectOption('tint');
  assert.equal(await appearance.evaluate(node=>node.open),true,
    'Appearance settings remain expanded after editing one of their fields');
  assert.equal(await page.locator('#cms-work-graph-node').inputValue(),'approved-custom-copy',
    'Appearance changes keep the selected nested Graph element');
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.workAppearance),'surface',
    'The selected appearance control retains keyboard focus across Inspector redraws');
  const retainedScroll=await page.locator('.cms-work-panel').evaluate(node=>node.scrollTop);
  if(appearanceScroll>35)assert.ok(retainedScroll>20,
    'A deep Appearance change cannot reset the Inspector to its top');
  await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
  await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
  assert.equal(await page.evaluate(()=>window.Stage3Editor.getSite().pages[0].sections
    .find(s=>s.id==='section-approved-custom').designGraph.nodes[0].children
    .find(n=>n.id==='approved-custom-copy').text),originalWorkText,
    'Both Inspector edits remain independent, exact Undo transactions');
  await page.evaluate(()=>document.querySelector('#cms-page-preview').close());
  await page.locator('#server-nav-site-settings').click();
  await page.locator('#server-view-site-settings:visible').waitFor();
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-site-settings.png'),fullPage:true});
  await page.evaluate(()=>{
    const siteTools=document.querySelector('#server-site-tools');
    if(siteTools)siteTools.open=true;
    for(const node of document.querySelectorAll(
      '#server-tools details,#server-site-tools details,#server-admin-more')){
      node.open=true;node.dispatchEvent(new Event('toggle'));
    }
  });

  const importedDesktopLogo=imported.assets.find(a=>a.alt==='Фото внешнего сайта');
  const importedMobileLogo=imported.assets.find(a=>a.alt==='Мобильный знак бренда');
  assert.ok(importedDesktopLogo&&importedMobileLogo);
  assert.equal(imported.branding.logoAssetId,importedDesktopLogo.id);
  assert.equal(imported.branding.mobileLogoAssetId,importedMobileLogo.id);
  assert.equal(imported.branding.faviconAssetId,importedDesktopLogo.id);
  assert.equal(imported.branding.logoWidth,176);
  assert.equal(imported.footer.links[0].pageId,interiorPage.id);
  assert.equal(imported.footer.socials[0].network,'instagram');
  const importedFont=imported.assets.find(asset=>asset.mime==='font/woff2');
  assert.ok(importedFont&&importedFont.id!=='asset-external-font');
  assert.equal(imported.theme.fontFiles.body,importedFont.id);
  assert.equal(imported.theme.fontFiles.heading,importedFont.id);
  const actualFont=await page.request.get(origin+'/api/sites/site-approved-browser/media/'+importedFont.id);
  assert.equal(actualFont.status(),200);
  assert.deepEqual(await actualFont.body(),approvedFont);
  const importedVideo=imported.assets.find(asset=>asset.mime==='video/mp4');
  assert.ok(importedVideo&&importedVideo.id!=='asset-external-film');
  const privateVideo=await page.request.get(origin+'/api/sites/site-approved-browser/media/'+importedVideo.id);
  assert.equal(privateVideo.status(),200);
  assert.deepEqual(await privateVideo.body(),approvedVideo,'The exact sealed MP4 bytes survive import and recovery');
  const evidenceRoute=origin+'/api/sites/site-approved-browser/approval-evidence';
  const approvalIndexResponse=await page.request.get(evidenceRoute);
  assert.equal(approvalIndexResponse.status(),200,'Owner can access private approved evidence archive');
  const originalEvidence=(await approvalIndexResponse.json()).packages;
  assert.equal(originalEvidence.length,1,'Import automatically creates one approved v2 evidence package');
  const approvedPack=originalEvidence[0];
  assert.equal(approvedPack.complete,true,'All seven original approval documents are retained');
  assert.equal(Object.keys(approvedPack.files).length,10);
  assert.equal(Object.keys(approvedPack.pageReferences).length,1);
  assert.equal(approvedPack.pageReferences[interiorPage.id].desktop,'ref-0-desktop');
  for(const [kind,fileName] of Object.entries({
    handoff:'handoff.json',site:'site.json',
    desktop:'prototypes/desktop.png',tablet:'prototypes/tablet.png',mobile:'prototypes/mobile.png',
    clientExplanation:'client-explanation.md',implementationSpec:'implementation-spec.md',
    'ref-0-desktop':'prototypes/interior-desktop.png',
    'ref-0-tablet':'prototypes/interior-tablet.png',
    'ref-0-mobile':'prototypes/interior-mobile.png'
  })){
    const archived=await page.request.get(evidenceRoute+'/'+approvedPack.packageSha+'/'+kind);
    assert.equal(archived.status(),200,'Only owner may read private evidence '+kind);
    assert.deepEqual(await archived.body(),fs.readFileSync(path.join(folder,fileName)),
      'CMS must preserve the exact original approved bytes for '+kind);
    assert.equal(approvedPack.files[kind].sha256,
      require('node:crypto').createHash('sha256').update(await archived.body()).digest('hex'));
  }
  assert.equal((await visitorCtx.request.get(evidenceRoute)).status(),401,
    'Approval files never exposed to public visitor');
  assert.equal(await page.locator('#server-drawer-leads #server-notifications-count').count(),1,
    'Unread lead status belongs inside the Leads resource drawer');
  assert.equal(await page.locator('#server-drawer-backup #server-page-history-panel').count(),1,
    'Page recovery belongs inside the archive drawer');
  assert.equal(await page.locator('#server-drawer-transfer .hosted-templates').count(),2,
    'Cross-site copy tools belong inside one transfer drawer');
  assert.equal(await page.locator('.sidebar').evaluate(node=>getComputedStyle(node).overflowY),'auto',
    'The desktop navigation rail must scroll independently');
  // Approval evidence belongs to the explicit import area, outside page editing.
  await page.locator('#server-nav-import').click();
  const approvalVaultButton=page.locator('#server-approved-vault-open');
  await approvalVaultButton.scrollIntoViewIfNeeded();
  const approvalPointerGeometry=await approvalVaultButton.evaluate(button=>{
    const rect=button.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
    const area=document.querySelector('#server-view-import');
    const hit=document.elementFromPoint(x,y),areaRect=area.getBoundingClientRect();
    return {areaVisible:!area.hidden,
      target:{x:Math.round(rect.x*100)/100,y:Math.round(rect.y*100)/100,
        width:Math.round(rect.width*100)/100,height:Math.round(rect.height*100)/100},
      insideArea:x>=areaRect.left&&x<=areaRect.right&&
        y>=areaRect.top&&y<=areaRect.bottom,
      hitIsTarget:hit===button||button.contains(hit)};
  });
  console.log('[approved-vault-pointer-geometry] '+JSON.stringify(approvalPointerGeometry));
  assert.equal(approvalPointerGeometry.areaVisible,true,
    'The owner sees approval evidence in its own import screen');
  assert.equal(approvalPointerGeometry.insideArea,true,
    'The archive action must remain inside the visible import screen');
  assert.equal(approvalPointerGeometry.hitIsTarget,true,
    'A real pointer at the archive action center must hit the action: '+JSON.stringify(approvalPointerGeometry));
  await approvalVaultButton.click();
  await page.locator('#server-approval-vault-rows img').first().waitFor();
  assert.equal(await page.locator('#server-approval-vault-rows img').count(),3,
    'Owner can view all original static approved prototypes after import');
  await page.locator('#server-approval-vault-close').click();
  // Re-selecting the same sealed package in evidence-only mode must be
  // idempotent and must not save another site revision.
  const archiveRevision=(await (await page.request.get(
    origin+'/api/sites/site-approved-browser')).json()).revision;
  await page.evaluate(entries=>{
    const selected=entries.map(entry=>{
      const bytes=Uint8Array.from(atob(entry.base64),char=>char.charCodeAt(0));
      const file=new File([bytes],entry.name);
      Object.defineProperty(file,'webkitRelativePath',{value:entry.relative});
      return file;
    });
    const input=document.querySelector('#server-approved-vault-folder');
    Object.defineProperty(input,'files',{configurable:true,value:selected});
    input.dispatchEvent(new Event('change',{bubbles:true}));
  },uploaded);
  await page.locator('#server-approved-review-confirm').waitFor();
  await page.locator('#server-approved-review-confirm').click();
  await page.locator('#toast').getByText(/Макеты 2 страниц/).waitFor({timeout:20000});
  await page.waitForFunction(()=>!document.getElementById('server-approved-vault-attach').disabled);
  assert.equal((await (await page.request.get(origin+
    '/api/sites/site-approved-browser')).json()).revision,archiveRevision);
  assert.equal((await (await page.request.get(evidenceRoute)).json()).packages.length,1,
    'Re-archiving verified same bytes must never add duplicates');

  // Full customer-site recovery must include the actual seven approved source
  // documents, their exact immutable bytes and all CMS revisions, not merely
  // a screenshot/gallery link. A restored site is an isolated unpublished copy.
  const realBackupResponse=await page.request.get(
    origin+'/api/sites/site-approved-browser/backup');
  assert.equal(realBackupResponse.status(),200);
  const realBackup=await realBackupResponse.json();
  assert.equal(realBackup.format,'manufact-site-backup-v2');
  assert.equal(realBackup.payload.approvalEvidence.length,10);
  const copyId='site-approved-recovery';
  const creds=await (await page.request.get(origin+'/api/session')).json();
  const recoveryHeaders={'x-csrf-token':creds.csrfToken};
  const recoveryPlan=await page.request.post(origin+'/api/backups/plan',{
    headers:recoveryHeaders,data:{archive:realBackup,targetSiteId:copyId}
  });
  assert.equal(recoveryPlan.status(),200,await recoveryPlan.text());
  const recoveryInfo=await recoveryPlan.json();
  assert.equal(recoveryInfo.plan.approvalFiles,10);
  assert.equal(recoveryInfo.plan.approvalPackages,1);
  assert.equal(recoveryInfo.plan.willPublish,false);
  assert.equal((await page.request.get(origin+'/api/sites/'+copyId)).status(),404,
    'Restore preflight must not write any site or approval vault');
  // Damage one file but recompute the *outer* payload checksum: source ledger
  // remains unchanged and must fail BEFORE a restore creates anything.
  const tamperedBackup=structuredClone(realBackup);
  tamperedBackup.payload.approvalEvidence.find(item=>item.kind==='clientExplanation')
    .base64=Buffer.from('A malicious replacement that is not in the approved ledger.').toString('base64');
  tamperedBackup.payload.approvalEvidence.find(item=>item.kind==='clientExplanation')
    .sha256=require('node:crypto').createHash('sha256')
      .update(Buffer.from('A malicious replacement that is not in the approved ledger.')).digest('hex');
  tamperedBackup.sha256=require('node:crypto').createHash('sha256')
    .update(JSON.stringify(tamperedBackup.payload)).digest('hex');
  const rejectedRecovery=await page.request.post(origin+'/api/backups/plan',{
    headers:recoveryHeaders,data:{archive:tamperedBackup,targetSiteId:copyId}
  });
  assert.equal(rejectedRecovery.status(),422,'Sealed file ledger rejects re-signed tampering');
  assert.equal((await page.request.get(origin+'/api/sites/'+copyId)).status(),404);
  const newPlan=await page.request.post(origin+'/api/backups/plan',{
    headers:recoveryHeaders,data:{archive:realBackup,targetSiteId:copyId}
  });
  assert.equal(newPlan.status(),200,await newPlan.text());
  const copyResponse=await page.request.post(origin+'/api/backups/restore',{
    headers:recoveryHeaders,
    data:{archive:realBackup,targetSiteId:copyId,
      confirmationToken:(await newPlan.json()).confirmationToken}
  });
  assert.equal(copyResponse.status(),201,await copyResponse.text());
  assert.equal((await page.request.get(origin+'/published/'+copyId+'/')).status(),404,
    'Restoration never publishes the copy');
  const restoredIndex=await (await page.request.get(
    origin+'/api/sites/'+copyId+'/approval-evidence')).json();
  assert.equal(restoredIndex.packages.length,1);
  assert.equal(restoredIndex.packages[0].packageSha,approvedPack.packageSha,
    'Original approved package checksum survives isolated copy');
  assert.equal(restoredIndex.packages[0].complete,true);
  assert.equal(restoredIndex.packages[0].pageReferences[interiorPage.id].mobile,
    'ref-0-mobile','Restored vault retains page-specific references');
  for(const kind of Object.keys(approvedPack.files)){
    const sourceBytes=await (await page.request.get(
      evidenceRoute+'/'+approvedPack.packageSha+'/'+kind)).body();
    const copyBytes=await (await page.request.get(
      origin+'/api/sites/'+copyId+'/approval-evidence/'+approvedPack.packageSha+'/'+kind)).body();
    assert.deepEqual(copyBytes,sourceBytes,'Recovery must retain signed '+kind+' bytes');
  }
  const secondBackup=await page.request.get(origin+'/api/sites/'+copyId+'/backup');
  assert.equal(secondBackup.status(),200,
    'A copied site must itself be independently backed up without changing original site.json ID');
  const secondPayload=(await secondBackup.json()).payload;
  assert.deepEqual(secondPayload.approvalEvidence,realBackup.payload.approvalEvidence,
    'Restored approval evidence supports future backup/restore cycles');
  assert.equal((await visitorCtx.request.get(
    origin+'/api/sites/'+copyId+'/approval-evidence')).status(),401);

  
  // Real owner edit, not just JSON validation: change a multirow table, add
  // a gallery photo and edit quote attribution inside the existing Studio.
  // The final saved+published PHP output must reflect those exact operations.
  await page.locator('#server-nav-editor').click();
  await openSectionTree();
  await page.locator('#sections .nav-entry').nth(3).click();
  // The advanced block action is intentionally collapsed in the owner UI.
  // Exercise its real disclosure before using the secondary action.
  assert.equal(await page.locator('#server-section-actions').evaluate(node=>node.open),false);
  await page.locator('#server-section-actions>summary').click();
  assert.equal(await page.locator('#section-design-graph').isVisible(),true);
  await page.locator('#section-design-graph').click();
  await page.locator('#cms-design-graph-dialog').waitFor();
  await page.locator('#cms-design-node-select').selectOption('approved-rich-table');
  await openGraphActions();
  await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'+ Строка',exact:true}).click();
  await page.locator('#cms-design-node-select').selectOption('approved-rich-table');
  await openGraphActions();
  await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'+ Столбец',exact:true}).click();
  await page.locator('#cms-design-node-select').selectOption('approved-rich-gallery');
  await openGraphActions();
  await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'+ Фото',exact:true}).click();
  await page.locator('#cms-design-node-select').selectOption('approved-rich-quote');
  await page.locator('#cms-design-graph-dialog label')
    .filter({hasText:'Автор или источник цитаты'}).locator('input').fill('Технический редактор');
  await page.locator('#cms-design-apply').click();
  const authored=await page.evaluate(()=>{
    const graph=window.Stage3Editor.getSite().pages[0].sections.find(x=>x.id==='section-approved-custom').designGraph;
    const find=id=>graph.nodes.find(x=>x.id===id);
    return {rows:find('approved-rich-table').children.length,
      columns:find('approved-rich-table').children[0].children.length,
      gallery:find('approved-rich-gallery').children.length,cite:find('approved-rich-quote').cite};
  });
  assert.deepEqual(authored,{rows:4,columns:4,gallery:3,cite:'Технический редактор'});
  // Owner finishes the existing custom container's decorative MP4 directly
  // in the PHP page Workbench, including three poster sizes and the tint.
  await page.locator('#server-edit-page').click();
  await page.locator('#cms-page-preview[open]').waitFor();
  await page.locator('#cms-work-section').selectOption('section-approved-custom');
  await page.locator('#cms-work-graph-node').selectOption('approved-custom-container');
  await page.locator('#cms-work-graph-operations > summary').click();
  await page.locator('#cms-work-graph-insert-type').selectOption('carousel');
  await page.locator('#cms-work-graph-insert-placement').selectOption('after');
  await page.locator('#cms-work-graph-insert').click();
  const authoredCarousel=await page.evaluate(()=>{
    const nodes=window.Stage3Editor.getSite().pages[0].sections
      .find(s=>s.id==='section-approved-custom').designGraph.nodes;
    return nodes.find(n=>n.type==='carousel');
  });
  assert.ok(authoredCarousel&&authoredCarousel.children.length===3,
    'Workbench inserts an actual typed mixed-content carousel into the existing Design Graph');
  await page.locator('#cms-work-graph-add-carousel-card').click();
  await page.locator('#cms-work-graph-node').selectOption(authoredCarousel.id);
  await page.locator('[data-work-graph-field="visibleDesktop"]').fill('2');
  await page.locator('[data-work-graph-field="visibleDesktop"]').dispatchEvent('change');
  await page.locator('#cms-work-graph-node').selectOption(authoredCarousel.id);
  const carouselState=await page.evaluate(()=>window.Stage3Editor.getSite().pages[0].sections
    .find(s=>s.id==='section-approved-custom').designGraph.nodes.find(n=>n.type==='carousel'));
  assert.equal(carouselState.children.length,4);
  assert.equal(carouselState.visibleDesktop,2);
  assert.equal(carouselState.visibleMobile,1);
  assert.equal(carouselState.scrollControls,true);
  // Image sources uploaded with an approved site are visually selectable for
  // all three screen widths in the SAME full-page authored Graph Workbench.
  await page.locator('#cms-work-graph-node').selectOption('approved-custom-photo');
  assert.equal(await page.locator('#cms-work-graph-image-previews figure').count(),3);
  await page.waitForFunction(()=>document.querySelector(
    '#cms-work-graph-image-previews img')?.src.startsWith('data:image/png;base64,'));
  await page.locator('#cms-page-preview [data-mode="mobile"]').click();
  await page.locator('#cms-work-graph-image-library > summary').click();
  await page.locator('#cms-work-graph-image-library input[type="search"]').fill('Мобильный знак');
  assert.equal(await page.locator('#cms-work-graph-image-library [data-graph-device-asset-id]').count(),2,
    'Visual search narrows to one image plus the inheritance control');
  await page.locator('#cms-work-graph-image-library [data-graph-device-asset-id="'+
    importedMobileLogo.id+'"]').click();
  const customPhoto=()=>page.evaluate(()=>{
    const nodes=window.Stage3Editor.getSite().pages[0].sections
      .find(s=>s.id==='section-approved-custom').designGraph.nodes;
    const find=children=>{
      for(const node of children){
        if(node.id==='approved-custom-photo')return node;
        if(node.children){const nested=find(node.children);if(nested)return nested;}
      }
      return null;
    };
    return find(nodes);
  });
  let customImage=await customPhoto();
  assert.equal(customImage.responsiveMedia.mobileAssetId,importedMobileLogo.id);
  assert.equal(await page.locator('#cms-work-graph-image-previews figure').nth(2)
    .locator('figcaption').innerText(),'Телефон · свой файл');
  assert.equal(await page.locator('#cms-work-graph-image-library').evaluate(node=>node.open),true,
    'The image library stays open for the next image after selecting a mobile variant');
  await page.locator('#cms-work-graph-image-library [data-graph-device-asset-id="'+
    importedDesktopLogo.id+'"]').click();
  customImage=await customPhoto();
  assert.equal(customImage.responsiveMedia.mobileAssetId,importedDesktopLogo.id);
  await page.locator('#cms-page-preview [data-mode="desktop"]').click();
  await page.locator('#cms-work-graph-node').selectOption('approved-custom-container');
  await page.locator('#cms-work-graph-background-video').selectOption(importedVideo.id);
  await page.locator('#cms-work-backgroundVideo-posterAssetId').selectOption(importedDesktopLogo.id);
  await page.locator('#cms-work-backgroundVideo-tabletPosterAssetId').selectOption(importedMobileLogo.id);
  await page.locator('#cms-work-backgroundVideo-mobilePosterAssetId').selectOption(importedMobileLogo.id);
  for(const [id,value] of [['cms-work-backgroundVideo-positionX','20'],
    ['cms-work-backgroundVideo-positionY','70']]){
    await page.locator('#'+id).fill(value);
    await page.locator('#'+id).dispatchEvent('change');
  }
  await page.locator('#cms-work-backgroundVideo-overlay-color').fill('#123456');
  await page.locator('#cms-work-backgroundVideo-overlay-color').dispatchEvent('change');
  await page.locator('#cms-work-backgroundVideo-overlay-opacity').fill('55');
  await page.locator('#cms-work-backgroundVideo-overlay-opacity').dispatchEvent('change');
  await page.waitForFunction(()=>{
    const images=[...document.querySelectorAll('#cms-work-backgroundVideo-previews img')];
    return images.length===3&&images.every(img=>img.src.startsWith('data:image/'));
  },null,{timeout:15000});
  const previewPosters=await page.locator('#cms-work-backgroundVideo-previews img').evaluateAll(images=>
    images.map(img=>({assetId:img.dataset.workBackdropAssetId,
      uri:img.getAttribute('src'),crop:img.style.objectPosition})));
  assert.equal(previewPosters.length,3,'All approved viewport covers are visible in the Workbench');
  assert.equal(previewPosters[0].assetId,importedDesktopLogo.id);
  assert.ok(previewPosters.slice(1).every(p=>p.assetId===importedMobileLogo.id&&
    p.uri.startsWith('data:image/')&&p.crop==='20% 70%'));
  await page.locator('.cms-page-preview-modes [data-mode="mobile"]').click();
  for(const [id,value] of [['cms-work-backgroundVideo-mobilePositionX','85'],
    ['cms-work-backgroundVideo-mobilePositionY','25']]){
    await page.locator('#'+id).fill(value);
    await page.locator('#'+id).dispatchEvent('change');
  }
  assert.equal(await page.locator('#cms-work-backgroundVideo-previews img').last()
    .evaluate(img=>img.style.objectPosition),'85% 25%',
  'Phone poster has an independent focal point in the same Workbench');
  await page.locator('#cms-work-backgroundVideo-library summary').click();
  await page.locator('#cms-work-backgroundVideo-library [data-backdrop-media-id="'+
    importedDesktopLogo.id+'"]').click();
  assert.equal(await page.evaluate(()=>window.Stage3Editor.getSite().pages[0].sections
    .find(s=>s.id==='section-approved-custom').designGraph.nodes[0]
    .backgroundVideo.mobilePosterAssetId),importedDesktopLogo.id,
  'Thumbnail picker edits only the active phone cover');
  assert.equal(await page.locator('#cms-work-backgroundVideo-library').evaluate(node=>node.open),true,
    'The poster library stays open while choosing several phone cover variants');
  await page.locator('#cms-work-backgroundVideo-library [data-backdrop-media-id="'+
    importedMobileLogo.id+'"]').click();
  const backdrop=()=>page.evaluate(()=>window.Stage3Editor.getSite().pages[0].sections
    .find(s=>s.id==='section-approved-custom').designGraph.nodes
    .find(n=>n.id==='approved-custom-container').backgroundVideo);
  assert.deepEqual(await backdrop(),{assetId:importedVideo.id,
    posterAssetId:importedDesktopLogo.id,tabletPosterAssetId:importedMobileLogo.id,
    mobilePosterAssetId:importedMobileLogo.id,positionX:20,positionY:70,
    mobilePositionX:85,mobilePositionY:25,
    overlay:{color:'#123456',opacity:55}},
  'Workbench stores the full typed device-aware video backdrop');
  await page.locator('#cms-work-history').getByRole('button',{name:'↶ Отмена'}).click();
  assert.equal((await backdrop()).mobilePosterAssetId,importedDesktopLogo.id,
    'Thumbnail-selected phone cover is in the same shared Undo history');
  await page.locator('#cms-work-history').getByRole('button',{name:'↷ Повтор'}).click();
  assert.equal((await backdrop()).mobilePosterAssetId,importedMobileLogo.id);
  await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();
  /* Manifest image properties use the same approved media, with a visible thumbnail. */
  const importedImageContext=await page.evaluate(()=>{
    const sections=window.Stage3Editor.getSite().pages[0].sections;
    const index=sections.findIndex(section=>section.id==='section-approved-image');
    const photo=sections[index].elements.find(element=>element.slot==='photo');
    return {index,elementId:photo.id,assetId:photo.values['content.media']};
  });
  await openSectionTree();
  await page.locator('#sections .nav-entry').nth(importedImageContext.index).click();
  await page.locator('#cms-block-contents [data-cms-block-child="'+
    importedImageContext.elementId+'"]').click();
  assert.equal(await page.locator('#fields [data-field="content.media"]').inputValue(),
    importedImageContext.assetId);
  const selectedMediaThumb=page.locator('#fields .inspector-media-preview img');
  await selectedMediaThumb.waitFor();
  await page.waitForFunction(()=>document.querySelector(
    '#fields .inspector-media-preview img')?.src.startsWith('data:image/'),null,{timeout:15000});
  assert.ok((await selectedMediaThumb.getAttribute('alt')).length>0,
    'The selected real media item has accessible alternative text');
  assert.equal((await selectedMediaThumb.getAttribute('src')).startsWith('data:image/'),true,
    'The preview uses the existing authenticated media bytes');
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-manifest-media-choice.png'),
    animations:'disabled',fullPage:true});

  // Graph editor retains the selected custom section. Explicitly restore
  // hero focus before exercising its separate responsive inspector controls.
  await openSectionTree();
  await page.locator('#sections .nav-entry').first().click();
  await page.locator('[data-inspector-scope="element"]').click();
  assert.equal(await page.locator('#cms-element-navigator').evaluate(node=>node.open),false,
    'Element properties are not preceded by an expanded second navigator');
  await page.locator('#cms-element-navigator>summary').click();
  assert.deepEqual(await page.locator('#fields .inspector-field-group-title').allInnerTexts(),
    ['Содержимое','Оформление']);
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-element-properties.png'),fullPage:true});
  assert.notEqual(imported.assets[0].id,'asset-external-hero','Server gives immutable site-owned asset ID');
  assert.equal(imported.pages[0].seo.ogImage,imported.assets[0].id,'SEO media reference remapped');
  assert.equal(imported.pages[0].seo.ogTitle,'asset-external-hero',
    'Client-authored SEO text matching a media ID is never rewritten');
  assert.equal((await page.request.get(origin+'/published/site-approved-browser/')).status(),404,
    'Approved folder import must never publish implicitly');
  await page.locator('#fields [data-field="content.text"]').first().fill('Редактируется после подключения');
  await page.locator('#fields [data-field="content.text"]').first().dispatchEvent('change');
  await page.locator('.device[data-bp="mobile"]').click();
  await page.locator('#fields details[data-field-group="style"] > summary').click();
  await page.locator('#fields [data-field="style.fontSize"]').fill('31px');
  await page.locator('#fields [data-field="style.fontSize"]').dispatchEvent('change');
  await page.locator('.device[data-bp="desktop"]').click();
  // Same imported site's FAQ — real add, edit, reorder, delete and Undo controls.
  await openSectionTree();
  await page.locator('#sections .nav-entry').last().click();
  assert.match(await page.locator('#inspector-title').innerText(),/FAQ/);
  assert.equal(await page.locator('[data-inspector-scope="block"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#fields [data-field]').count(),0,
    'Selecting a whole block cannot expose the previous element properties');
  assert.equal(await page.locator('#cms-section-device-visibility').count(),1);
  assert.equal(await page.locator('#cms-section-advanced-settings').count(),1);
  const mobileVisibility=page.locator('#cms-section-device-visibility button[data-section-device="mobile"]');
  assert.equal(await mobileVisibility.getAttribute('aria-pressed'),'true');
  await mobileVisibility.click();
  assert.equal(await mobileVisibility.getAttribute('aria-pressed'),'false');
  await page.locator('#undo').click();
  assert.equal(await mobileVisibility.getAttribute('aria-pressed'),'true',
    'Undo restores block-level responsive visibility without changing element content');
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-block-properties.png'),fullPage:true});
  await page.locator('[data-inspector-scope="element"]').click();
  assert.equal(await page.locator('#cms-element-navigator').evaluate(node=>node.open),true,
    'FAQ item navigator opens by default only in the relevant repeatable section');
  assert.equal(await page.locator('#cms-section-advanced-settings').count(),0,
    'Whole-block operations must not mix with element fields');
  await page.locator('#cms-repeat-add').click();
  assert.equal(await page.locator('#elements .cms-repeat-row').count(),3);
  await page.locator('#fields [data-field="content.question"]').fill('Что входит в комплект?');
  await page.locator('#fields [data-field="content.question"]').dispatchEvent('change');
  assert.equal(await page.locator('#fields textarea[data-field="content.answer"]').count(),1,
    'FAQ answers use an editable multi-line field');
  await page.locator('#fields [data-field="content.answer"]').fill('Состав услуги указан в договоре.');
  await page.locator('#fields [data-field="content.answer"]').dispatchEvent('change');
  const questions=()=>page.evaluate(()=>window.Stage3Editor.getSite().pages[0].sections
    .find(section=>section.component==='faq-accordion').items.map(item=>item.values['content.question']));
  assert.deepEqual(await questions(),['Как оформить заказ?','Как происходит доставка?','Что входит в комплект?'],
    'New FAQ item must actually receive edited question before reordering');
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-faq-actions.png'),fullPage:true});
  for(const [width,height,label] of [[820,760,'tablet'],[390,740,'mobile']]){
    await page.setViewportSize({width,height});
    const bounds=await page.locator('.inspector').evaluate(el=>{
      const r=el.getBoundingClientRect(),fields=el.querySelector('#fields').getBoundingClientRect();
      return {left:r.left,right:r.right,fieldsLeft:fields.left,fieldsRight:fields.right};
    });
    assert.ok(bounds.left>=-1&&bounds.right<=width+1&&
      bounds.fieldsLeft>=-1&&bounds.fieldsRight<=width+1,
      'Hosted Inspector fits '+label+': '+JSON.stringify(bounds));
    const popup=page.locator('#elements .cms-repeat-row').last().locator('.cms-repeat-more');
    await popup.locator(':scope > summary').evaluate(node=>
      node.scrollIntoView({block:'end',behavior:'instant'}));
    await popup.locator(':scope > summary').click();
    await page.waitForFunction(()=>{
      const row=document.querySelector('#elements .cms-repeat-row:last-of-type .cms-repeat-more');
      return row?.open&&!!row.querySelector('.cms-repeat-more-actions')?.style.maxHeight;
    },null,{timeout:3000});
    const menu=await popup.locator('.cms-repeat-more-actions').evaluate(el=>{
      const r=el.getBoundingClientRect();
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
    });
    assert.ok(menu.left>=-1&&menu.right<=width+1&&menu.top>=-1&&menu.bottom<=height+1,
      'Hosted repeat menu stays visible on '+label+': '+JSON.stringify(menu));
    await page.locator('.inspector').screenshot({
      path:path.join(studioScreenDir,'owner-studio-inspector-'+label+'.png'),animations:'disabled'});
    await popup.locator(':scope > summary').focus();
    await page.keyboard.press('Escape');
    assert.equal(await popup.evaluate(node=>node.open),false);
  }
  /* Hosted browser runners can delay compact Inspector focus after real
     navigation; keep the focus assertion, allow layout to settle. */
  for(const [width,height] of [[820,760],[390,740]]){
    await page.setViewportSize({width,height});
  await openSectionTree();
    await page.locator('#sections .nav-entry').first().click();
    await waitCompactInspectorHeading('first section at '+width+'px');
  await openSectionTree();
    await page.locator('#sections .nav-entry').last().click();
    await waitCompactInspectorHeading('last section at '+width+'px');
    await page.locator('[data-inspector-scope="element"]').click();
  }
  await page.setViewportSize({width:1400,height:1000});
  const lastFaqRow=page.locator('#elements .cms-repeat-row').last();
  /* Restore the edited FAQ item after exercising separate block navigation. */
  await lastFaqRow.locator('[data-repeat-id]').click();
  assert.equal(await lastFaqRow.locator('.cms-repeat-more > summary').count(),1);
  assert.equal(await lastFaqRow.locator('.cms-repeat-more-actions .btn:visible').count(),0,
    'Rare FAQ actions remain hidden until the row menu is opened');
  assert.match(await page.locator('#inspector-title').innerText(),/Что входит в комплект/);
  await lastFaqRow.locator('.cms-repeat-more > summary').click();
  await lastFaqRow.locator('button[aria-label^="Поднять вопрос"]').click();
  const movedQuestions=await questions();
  const faqMoveDiagnostic=await page.evaluate(()=>({
    toast:document.querySelector('#toast')?.textContent,
    selected:[...document.querySelectorAll('#elements .cms-repeat-row')].map(row=>({
      id:row.querySelector('[data-repeat-id]')?.dataset.repeatId,
      label:row.querySelector('[data-repeat-id]')?.textContent
    })),
    dirty:document.querySelector('#dirty')?.textContent
  }));
  assert.deepEqual(movedQuestions,['Как оформить заказ?','Что входит в комплект?','Как происходит доставка?'],
    'FAQ move must change ordering of the actual saved draft: '+JSON.stringify(faqMoveDiagnostic));
  const deleteFaqRow=page.locator('#elements .cms-repeat-row')
    .filter({hasText:'Как происходит доставка?'});
  await deleteFaqRow.locator('.cms-repeat-more > summary').click();
  await deleteFaqRow.locator('button[aria-label^="Удалить вопрос"]').click();
  assert.deepEqual(await questions(),['Как оформить заказ?','Что входит в комплект?'],
    'FAQ delete must target the specified question, not the currently selected index');
  assert.equal(await page.locator('#elements .cms-repeat-row').count(),2);
  assert.equal(await page.locator('#cms-repeat-add').innerText(),'+ Добавить вопрос');
  /* Page metadata belongs to the selected page, never site-wide settings. */
  await page.locator('[data-inspector-scope="page"]').click();
  assert.equal(await page.locator('#cms-page-context').isVisible(),true);
  const pageSettings=page.locator('#server-page-actions');
  await pageSettings.locator(':scope > summary').click();
  assert.equal(await pageSettings.locator('.hosted-structure-subhead').count(),2);
  assert.equal(await page.locator('#server-tool-seo #cms-open-seo').count(),0,
    'Page SEO cannot be misplaced in the site-wide SEO tools');
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-page-settings.png'),fullPage:true});
  const seoToolButton=page.locator('#cms-open-seo');
  await seoToolButton.scrollIntoViewIfNeeded();
  const seoToolPointerGeometry=await seoToolButton.evaluate(button=>{
    const rect=button.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
    const area=button.closest('#server-page-actions'),areaRect=area.getBoundingClientRect();
    const hit=document.elementFromPoint(x,y);
    return {open:area.open,insideArea:x>=areaRect.left&&x<=areaRect.right&&
      y>=areaRect.top&&y<=areaRect.bottom,hitIsTarget:hit===button||button.contains(hit)};
  });
  console.log('[page-settings-pointer-geometry] '+JSON.stringify(seoToolPointerGeometry));
  assert.equal(seoToolPointerGeometry.open,true,'Page settings open for the selected page');
  assert.equal(seoToolPointerGeometry.insideArea,true,'Page SEO stays in the page settings group');
  assert.equal(seoToolPointerGeometry.hitIsTarget,true,
    'A real pointer at page SEO must hit its action: '+JSON.stringify(seoToolPointerGeometry));
  await seoToolButton.click();
  await page.locator('#cms-setting-seo-title').fill('FAQ и готовый сайт — SEO');
  await page.locator('#cms-setting-seo-description').fill('Новые вопросы и SEO опубликованы после ручного сохранения');
  await page.locator('#cms-settings-apply').click();
  assert.equal(await page.locator('#server-nav-editor').getAttribute('aria-current'),'page',
    'Page-level settings return to the same editor and selected page');
  await page.locator('#save').click();
  await page.locator('#server-launch-review').click();
  await page.locator('#server-launch-dialog').waitFor();
  // Prelaunch disclosure must never claim a configured channel proves
  // external delivery. Owner can export the local report without sending.
  const prelaunch=await (await page.request.get(origin+
    '/api/sites/site-approved-browser/launch-forms')).json();
  assert.equal(prelaunch.format,'manufact-launch-form-readiness-v1');
  assert.equal(prelaunch.siteId,'site-approved-browser');
  assert.equal(prelaunch.ownerAcceptanceConfirmed,false);
  assert.equal(prelaunch.liveDeliveryVerified,false);
  await page.locator('#server-launch-forms-summary').waitFor();
  assert.match(await page.locator('#server-launch-forms').innerText(),
    /подтверждённых реальных доставок: нет/);
  const refresh=page.locator('#server-launch-forms-refresh');
  await refresh.click();
  await page.locator('#server-launch-forms-summary').waitFor({timeout:10000});
  const formReportEvent=page.waitForEvent('download');
  await page.locator('#server-launch-forms-export').click();
  const formReport=await formReportEvent;
  assert.equal(formReport.suggestedFilename(),'site-approved-browser-form-readiness.json');
  const savedReport=JSON.parse(fs.readFileSync(await formReport.path(),'utf8'));
  assert.equal(savedReport.purpose,'configuration-preflight-not-external-delivery-or-client-approval');
  assert.equal(savedReport.liveDeliveryVerified,false);
  // The review must measure the real PHP-rendered page, including the footer
  // below the 900px fold, rather than accepting an HTML string as rendered.
  await page.waitForFunction(()=>document.querySelector('#server-launch-preview-status')
    ?.textContent?.includes('PHP-страница целиком'),{timeout:15000});
  const desktopCheck=await page.locator('#server-launch-preview').evaluate(frame=>({
    height:Number.parseInt(frame.style.height,10),
    scrollable:frame.parentElement?.clientHeight,
    hasFooter:!!frame.contentDocument?.querySelector('footer'),
    totalImages:frame.contentDocument?.images.length
  }));
  assert.ok(desktopCheck.height>900,'PHP launch review must preserve whole page height');
  assert.equal(desktopCheck.hasFooter,true);
  assert.ok(desktopCheck.totalImages>=2,'PHP page includes both imported site-owned images');
  assert.equal(await page.locator('#server-launch-mark').isDisabled(),true,
    'Sealed approved site cannot be signed off before its original screenshot is viewed');
  await page.locator('#server-launch-compare-modes [data-compare-mode="approved-compare"]').click();
  await page.locator('#server-launch-reference-image[src^="blob:"]').waitFor({timeout:15000});
  assert.match(await page.locator('#server-launch-reference-viewport').innerText(),
    /SHA-256 проверен/,'Launch review compares against verified original image from vault');
  assert.match(await page.locator('#server-launch-approval-summary').innerText(),
    /Исходные утверждённые макеты/);
  await page.waitForFunction(()=>!document.querySelector('#server-launch-mark')?.disabled);
  assert.equal(await page.locator('#server-launch-mark').isDisabled(),false,
    'Sign-off is now available after both rendered PHP and verified source image');
  // The original raster overlays the SAME real PHP iframe and supports an
  // adjustable visual mix for comparing alignment, spacing and proportions.
  await page.locator('#server-launch-compare-modes [data-compare-mode="approved-overlay"]').click();
  await page.waitForFunction(()=>{
    const img=document.querySelector('#server-launch-overlay-image');
    return Boolean(img?.src?.startsWith('blob:')&&!img.hidden&&img.complete&&
      img.naturalWidth>0&&img.style.opacity==='0.5');
  },null,{timeout:15000});
  const overlay=await page.locator('#server-launch-overlay-image').evaluate(img=>({
    opacity:img.style.opacity,hidden:img.hidden,renderedWidth:img.clientWidth,
    sourceWidth:img.naturalWidth,pointerEvents:getComputedStyle(img).pointerEvents
  }));
  assert.equal(overlay.hidden,false);
  assert.equal(overlay.opacity,'0.5');
  assert.ok(overlay.renderedWidth>0 && overlay.sourceWidth>0);
  assert.equal(overlay.pointerEvents,'none');
  await page.locator('#server-launch-overlay-opacity').evaluate(input=>{
    input.value='75';input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.equal(await page.locator('#server-launch-overlay-image').evaluate(img=>img.style.opacity),'0.75');
  // Manual visual discrepancies stay tied to this immutable revision/device
  // and prevent a misleading "all screens verified" publication decision.
  await page.locator('#server-launch-finding-input').fill('Макет на ПК: отступы отличаются');
  await page.locator('#server-launch-finding-add').click();
  await page.waitForFunction(()=>document.querySelector('#server-launch-finding-list')
    ?.textContent?.includes('отступы отличаются'));
  assert.match(await page.locator('#server-launch-review-storage').innerText(),
    /приватной CMS/);
  const visualUrl=origin+'/api/sites/site-approved-browser/visual-review';
  const serverReview=await (await page.request.get(visualUrl+
    '?revision='+(await (await page.request.get(origin+'/api/sites/site-approved-browser')).json()).revision)).json();
  assert.equal(serverReview.openCount,1,'Actual operator note must be stored in SQLite');
  assert.match(await page.locator('#server-launch-visual-index').innerText(),
    /Открытые замечания по сайту: 1/);
  await page.locator('#server-launch-visual-index-rows button').first().click();
  await page.waitForFunction(()=>document.querySelector('#server-launch-preview-status')
    ?.textContent?.includes('PHP-страница целиком'),null,{timeout:15000});
  assert.match(await page.locator('#server-launch-finding-list').innerText(),
    /отступы отличаются/);

  assert.equal(await page.locator('#server-launch-mark').isDisabled(),true,
    'Open visual discrepancy blocks human sign-off for selected device');
  await page.locator('#server-launch-finding-list').getByRole('button',{name:/Отметить замечание исправленным/}).click();
  await page.waitForFunction(()=>document.querySelector('#server-launch-finding-list')
    ?.textContent?.includes('✓ Исправлено:'));
  assert.equal(await page.locator('#server-launch-mark').isDisabled(),false,
    'Resolved discrepancy permits explicit new human approval');
  // Previous review notes may be resumed without restoring any stale
  // "reviewed" device flags or trusting a different site's report.
  const revisionInfo=await (await page.request.get(origin+
    '/api/sites/site-approved-browser')).json();
  assert.ok(revisionInfo.revision>1,'Archived review needs a previous saved revision');
  const importedNotes={
    format:'manufact-launch-review-v1',
    siteId:'site-approved-browser',
    revision:revisionInfo.revision-1,
    sourceApproval:{packageSha:approvedPack.packageSha},
    visualFindings:[{pageId:imported.pages[0].id,path:'/',device:'desktop',
      note:'Вернуть точную ширину главного блока',scrollY:110,resolved:false,
      targetSectionId:'section-retired',targetNodeId:'graph-node-retired'}]
  };
  await page.locator('#server-launch-import-input').setInputFiles({
    name:'review-notes.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(importedNotes))
  });
  await page.waitForFunction(()=>document.querySelector('#server-launch-finding-list')
    ?.textContent?.includes('Вернуть точную ширину'));
  assert.match(await page.locator('#toast').innerText(),/старых привязок сброшено: 1/,
    'Retired nodes in old reports become Y-only notes, never lost observations');
  assert.equal(await page.locator('#server-launch-mark').isDisabled(),true);
  const invalidCurrentReport={...importedNotes,revision:revisionInfo.revision,
    visualFindings:[{...importedNotes.visualFindings[0],note:'Подменённая текущая привязка'}]};
  await page.locator('#server-launch-import-input').setInputFiles({
    name:'invalid-current-review.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(invalidCurrentReport))
  });
  await page.waitForFunction(()=>document.querySelector('#toast')?.textContent
    ?.includes('Привязка текущей ревизии указывает на чужую секцию'));
  assert.doesNotMatch(await page.locator('#server-launch-finding-list').innerText(),
    /Подменённая текущая привязка/,'Foreign current-revision bindings fail closed');
  await page.locator('#server-launch-finding-list').getByRole('button',{name:/Отметить замечание исправленным/}).click();
  await page.waitForFunction(()=>document.querySelector('#server-launch-finding-list')
    ?.textContent?.includes('✓ Исправлено: Вернуть точную ширину'));
  assert.equal(await page.locator('#server-launch-mark').isDisabled(),false);
  const savedFindings=(await (await page.request.get(visualUrl+
    '?revision='+revisionInfo.revision)).json()).findings;
  assert.equal(savedFindings.length,2,'Imported JSON notes are permanently stored with attribution');
  const recoveredNote=savedFindings.find(row=>row.note==='Вернуть точную ширину главного блока');
  assert.ok(recoveredNote,'Prior revision note is retained');
  assert.equal(recoveredNote.targetSectionId,null);
  assert.equal(recoveredNote.targetNodeId,null);
  assert.ok(savedFindings.every(row=>row.resolved&&row.resolvedBy));
  await page.locator('#server-launch-visual-history-open').click();
  await page.locator('#server-launch-review-history .hosted-launch-review-history-revisions button').first()
    .waitFor({timeout:10000});
  await page.locator('#server-launch-review-history .hosted-launch-review-history-revisions button')
    .first().click();
  await page.waitForFunction(()=>document.querySelector(
    '#server-launch-review-history .hosted-launch-review-history-details')
    ?.textContent?.includes('Макет на ПК: отступы отличаются'));
  assert.match(await page.locator('#server-launch-review-history').innerText(),
    /только просмотр|текущая/);
  await page.locator('#server-launch-visual-history-open').click();
  await page.locator('#server-launch-pages [data-page-id="'+interiorPage.id+'"]').click();
  await page.locator('#server-launch-compare-modes [data-compare-mode="approved-compare"]').click();
  await page.waitForFunction(()=>{
    const image=document.querySelector('#server-launch-reference-image');
    return Boolean(image?.src?.startsWith('blob:')&&image.complete&&image.naturalWidth>0);
  },null,{timeout:15000});
  assert.match(await page.locator('#server-launch-reference-viewport').innerText(),
    /SHA-256 проверен/);
  await page.locator('#server-launch-pages button').first().click();
  await page.locator('#server-launch-compare-modes [data-compare-mode="approved-compare"]').click();
  await page.locator('#server-launch-modes [data-device="mobile"]').click();
  await page.waitForFunction(()=>{
    const status=document.querySelector('#server-launch-preview-status')?.textContent||'';
    return status.includes('PHP-страница целиком')&&status.includes('390 px')||
      status.includes('Проверка PHP ·')&&status.includes('390 px');
  },null,{timeout:15000});
  const mobileStatus=await page.locator('#server-launch-preview-status').innerText();
  await page.waitForFunction(()=>!document.querySelector('#server-launch-mark')?.disabled,
    null,{timeout:15000});
  assert.equal(await page.locator('#server-launch-mark').isDisabled(),false,
    'Mobile review waits for both PHP images and matching original: '+mobileStatus);
  await page.locator('#server-launch-mark').click();
  assert.match(await page.locator('.hosted-launch-progress').innerText(),
    new RegExp('экранов: 1/'+(imported.pages.length*3)));
  await page.locator('#server-launch-close').click();
  await page.locator('#server-launch-review').click();
  await page.locator('#server-launch-dialog').waitFor();
  await page.waitForFunction(()=>document.querySelector('#server-launch-finding-list')
    ?.textContent?.includes('✓ Исправлено: Вернуть точную ширину'));
  await page.locator('#server-launch-close').click();
  await page.locator('#server-publish').click();
  // The server status lives in the closed site-tools dialog; its state still updates.
  await page.waitForFunction(()=>/Опубликовано: v1/.test(
    document.querySelector('#server-status')?.textContent||''));
  assert.equal((await page.request.get(origin+'/published/site-approved-browser/')).status(),200);
  const approvedPage=await visitor.goto(origin+'/published/site-approved-browser/');
  assert.equal(approvedPage.status(),200);
  const logo=visitor.locator('header.cms-site-header a.cms-brand picture img');
  assert.equal(await logo.getAttribute('src'),
    '/published/site-approved-browser/assets/'+importedDesktopLogo.id+'.png');
  assert.equal(await logo.getAttribute('width'),'176');
  assert.equal(await visitor.locator('header.cms-site-header a.cms-brand picture source').getAttribute('srcset'),
    '/published/site-approved-browser/assets/'+importedMobileLogo.id+'.png');
  assert.equal(await visitor.locator('link[rel="icon"]').getAttribute('href'),
    '/published/site-approved-browser/assets/'+importedDesktopLogo.id+'.png');
  assert.equal(await visitor.locator('link[rel="icon"]').getAttribute('type'),'image/png');
  const publicCarousel=visitor.locator('.cmsdg-card-carousel');
  assert.equal(await publicCarousel.locator('.cmsdg-card-slide').count(),4,
    'Published individual card carousel preserves its four editable mixed-content cards');
  assert.equal(await publicCarousel.locator('.cmsdg-card-nav a').count(),4);
  assert.equal(await publicCarousel.locator('.cmsdg-card-track').evaluate(el=>
    getComputedStyle(el).scrollSnapType),'x mandatory');
  assert.match(await publicCarousel.getAttribute('style'),/--cmsdg-card-desktop:2/);
  const publicBackdrop=visitor.locator('.cmsdg-n-approved-custom-container > .cmsdg-video-backdrop');
  await publicBackdrop.locator('video[autoplay][muted][loop] source[type="video/mp4"]')
    .waitFor({state:'attached'});
  assert.equal(await publicBackdrop.locator('video source').getAttribute('media'),
    '(min-width: 601px) and (prefers-reduced-motion: no-preference)',
    'Video is an eligible source only on first loads with motion allowed');
  assert.ok((await publicBackdrop.locator('video source').getAttribute('src'))
    .includes(importedVideo.id+'.mp4'),'Published video uses the sealed local MP4');
  assert.equal(await publicBackdrop.locator('video').evaluate(el=>getComputedStyle(el).objectPosition),
    '20% 70%','Published video keeps the Workbench crop');
  assert.match(await publicBackdrop.evaluate(el=>getComputedStyle(el,'::after').backgroundColor),
    /rgba?\(18, 52, 86/,'Published video keeps Workbench tint');
  await visitor.setViewportSize({width:390,height:844});
  assert.equal(await publicCarousel.locator('.cmsdg-card-slide').first().evaluate(el=>{
    const track=el.parentElement;
    return el.getBoundingClientRect().width>=track.getBoundingClientRect().width*0.9&&
      track.scrollWidth>track.clientWidth+100;
  }),true,
    'Phone uses one full-width, scrollable card rather than the desktop two-card row');
  assert.equal(await publicBackdrop.locator('video').evaluate(el=>getComputedStyle(el).display),'none');
  assert.ok((await publicBackdrop.evaluate(el=>getComputedStyle(el).backgroundImage))
    .includes(importedMobileLogo.id+'.png'),'Mobile view uses the chosen poster');
  assert.equal(await publicBackdrop.evaluate(el=>getComputedStyle(el).backgroundPosition),
    '85% 25%','Mobile poster crop is independently published');
  await visitor.setViewportSize({width:1280,height:900});
  assert.equal((await page.request.get(origin+'/published/site-approved-browser/assets/'+importedMobileLogo.id+'.png')).status(),200);
  const footer=visitor.locator('footer.cms-site-footer');
  assert.match(await footer.getAttribute('class'),/cms-footer-style-dark/);
  assert.equal(await footer.locator('.cms-footer-description').innerText(),
    'Контакты и поддержка из утверждённого дизайна');
  assert.equal(await footer.locator('.cms-footer-nav a').getAttribute('href'),
    '/published/site-approved-browser'+interiorPage.path);
  assert.equal(await footer.locator('.cms-footer-contact a[href^="mailto:"]').getAttribute('href'),
    'mailto:contact@example.com');
  assert.equal(await footer.locator('.cms-footer-contact a[href^="tel:"]').getAttribute('href'),
    'tel:+48500600700');
  assert.equal(await footer.locator('.cms-footer-social a').getAttribute('href'),
    'https://instagram.com/manufact');
  assert.equal(await footer.locator('.cms-footer-social a').getAttribute('rel'),
    'noopener noreferrer nofollow');
  await visitor.setViewportSize({width:375,height:800});
  const footerMobile=await footer.locator('.cms-footer-inner').evaluate(el=>
    getComputedStyle(el).gridTemplateColumns.trim());
  assert.equal(footerMobile.split(' ').filter(Boolean).length,1,
    'Footer collapses to one column for real mobile Chromium viewport');
  await visitor.setViewportSize({width:1280,height:900});
  assert.equal(await visitor.locator('h1').innerText(),'Редактируется после подключения');
  assert.match(await visitor.locator('section.hero h1').getAttribute('style'),/--title-mobile:31px/,
    'Mobile typography override survives server save and public rendering');
  assert.equal(await visitor.title(),'FAQ и готовый сайт — SEO');
  assert.equal(await visitor.locator('meta[name="description"]').getAttribute('content'),
    'Новые вопросы и SEO опубликованы после ручного сохранения');
  assert.deepEqual(await visitor.locator('section.faq summary').allInnerTexts(),
    ['Как оформить заказ?','Что входит в комплект?']);
  assert.equal(await visitor.locator('section.faq details').count(),2);
  assert.equal(await visitor.locator('.cmsdg-n-approved-custom-copy').innerText(),
    'Особенный согласованный дизайн',
    'Custom AI composition renders from the external Design Graph, not a fixed template');
  assert.equal(await visitor.locator('.cmsdg-n-approved-rich-table tbody tr').count(),3,
    'PHP publication renders rows from the imported typed table');
  assert.equal(await visitor.locator('.cmsdg-n-approved-rich-table thead th').count(),4);
  const expectedFontUrl='/published/site-approved-browser/assets/'+importedFont.id+'.woff2';
  const deliveredFont=await page.request.get(origin+expectedFontUrl);
  assert.equal(deliveredFont.status(),200);
  assert.equal(deliveredFont.headers()['content-type'],'font/woff2');
  assert.deepEqual(await deliveredFont.body(),approvedFont);
  assert.ok(await visitor.evaluate(async()=>{
    const faces=await document.fonts.load('16px "CMS Site Body"','ABab');
    return faces.length>0&&faces.every(face=>face.status==='loaded');
  }),'Real WOFF2 font is decodable in published Chromium visitor');
  const filmSrc=await visitor.locator('.cmsdg-n-approved-film source').getAttribute('src');
  assert.equal(filmSrc,'/published/site-approved-browser/assets/'+importedVideo.id+'.mp4');
  const publicFilm=await page.request.get(origin+filmSrc);
  assert.equal(publicFilm.status(),200,'Imported MP4 is published only with the approved site');
  assert.deepEqual(await publicFilm.body(),approvedVideo);
  assert.equal(await visitor.locator('.cmsdg-n-approved-rich-gallery img').count(),3,
    'Published gallery uses actual site-owned photos');
  assert.match(await visitor.locator('.cmsdg-n-approved-rich-quote').innerText(),/Технический редактор/);
  assert.equal(await visitor.locator('.cmsdg-n-approved-rich-link').getAttribute('href'),'/published/site-approved-browser/');
  assert.equal(await visitor.locator('.cmsdg-image-action').first().getAttribute('href'),
    '/published/site-approved-browser/','Clickable image keeps site-isolated route');
  const pictureSources=await visitor.locator('.cmsdg-image-action picture.cmsdg-picture source')
    .evaluateAll(nodes=>nodes.map(node=>({media:node.media,url:node.getAttribute('srcset')})));
  assert.equal(pictureSources.length,2,'Both device-native image sources survived import and publishing');
  assert.deepEqual(pictureSources.map(x=>x.media.replace(/\s+/g,'')),['(max-width:600px)','(max-width:900px)']);
  for(const source of pictureSources){
    assert.match(source.url,/^\/published\/site-approved-browser\/assets\/asset-[a-f0-9]+\.png$/);
    assert.ok(!source.url.includes('asset-external-hero'),'Responsive source must be server retargeted');
  }
  const artworkCss=await visitor.locator('.cmsdg-graph-approved-custom style').textContent();
  assert.match(artworkCss,/\.cmsdg-video-backdrop\{[^}]*background-image:url\("/,
    'Owner change from approved raster to video is represented in published PHP CSS');
  assert.match(artworkCss,/cmsdg-video-backdrop::after\{[^}]*background-color:#1234568c\}/,
    'Published tint reflects the actual Workbench edit, not the removed raster overlay');
  assert.match(artworkCss,/border-style:dashed/);
  assert.match(artworkCss,/filter:grayscale\(1\)/);
  assert.match(artworkCss,/:active\{opacity:0.70;border-color:#0a5bff;border-style:dotted\}/);
  const remoteImage=visitor.locator('section.showcase img.showcase-photo');
  assert.equal(await remoteImage.getAttribute('alt'),'Фото внешнего сайта');
  assert.match(await remoteImage.getAttribute('src'),
    /^\/published\/site-approved-browser\/assets\/asset-[a-f0-9]+\.png$/);
  assert.equal((await page.request.get(origin+await remoteImage.getAttribute('src'))).status(),200,
    'Public image bytes must come from site-isolated storage, not the local handoff folder');
  // Absolute og:image markup needs STAGE3_PUBLIC_ORIGIN, intentionally unset in this CI.
  // Check that its immutable media binding survives the actual publication instead.
  const publishedApproved=(await (await page.request.get(origin+
    '/api/sites/site-approved-browser/published-site')).json()).site;
  assert.equal(publishedApproved.pages[0].seo.ogImage,imported.assets[0].id);
  // Compare the REAL published PHP response to current draft within one
  // isolated, script-disabled review screen; no second preview renderer.
  await page.locator('#server-launch-review').click();
  await page.locator('#server-launch-dialog').waitFor();
  await page.locator('#server-launch-compare-modes [data-compare-mode="compare"]').click();
  await page.waitForFunction(()=>{
    const live=document.querySelector('#server-launch-live-preview');
    return live?.contentDocument?.querySelector('section.faq')&&
      Number.parseInt(live.style.height,10)>900;
  },{timeout:15000});
  assert.equal(await page.locator('.hosted-launch-preview-panels.is-comparing').count(),1);
  assert.equal(await page.locator('#server-launch-scroll-sync-toggle').isChecked(),true);
  await page.locator('#server-launch-viewport').evaluate(view=>{
    const max=view.scrollHeight-view.clientHeight;
    if(max>60)view.scrollTop=Math.min(180,max*0.6);
  });
  const scrollProof=await page.locator('#server-launch-viewport').evaluate(view=>{
    const live=document.querySelector('#server-launch-live-viewport');
    return {draft:view.scrollTop,live:live.scrollTop,
      draftMax:view.scrollHeight-view.clientHeight,
      liveMax:live.scrollHeight-live.clientHeight};
  });
  if(scrollProof.draftMax>60&&scrollProof.liveMax>60){
    await page.waitForFunction(()=>{
      const source=document.querySelector('#server-launch-viewport');
      const target=document.querySelector('#server-launch-live-viewport');
      return target.scrollTop>0&&Math.abs(
        source.scrollTop/(source.scrollHeight-source.clientHeight)-
        target.scrollTop/(target.scrollHeight-target.clientHeight))<.06;
    },null,{timeout:5000});
  }
  await page.locator('#server-launch-close').click();
  // Actual PUBLIC PHP screenshot evidence, not Studio's JS iframe. Capture
  // every published page at all three original approved breakpoints, read-only.
  const evidenceDir=path.join(temp,'approved-pilot-evidence');
  const evidenceRun=spawnSync(process.execPath,[
    'stage3/bin/capture-approved-site.cjs',folder,
    origin+'/published/site-approved-browser/',evidenceDir
  ],{cwd:root,encoding:'utf8',timeout:90000});
  assert.equal(evidenceRun.status,0,
    'Three-size published capture must succeed: '+evidenceRun.stderr+' '+evidenceRun.stdout);
  const evidence=JSON.parse(fs.readFileSync(path.join(evidenceDir,'evidence.json'),'utf8'));
  assert.equal(evidence.status,'screenshots-only-manual-approval-required');
  assert.equal(evidence.pages.length,imported.pages.length);
  for(const item of evidence.pages)for(const width of ['desktop','tablet','mobile'])
    assert.equal(fs.existsSync(path.join(evidenceDir,item.screenshots[width].file)),true);
  // A multi-page capture must carry EACH page's own sealed reference rather
  // than present the homepage as an interior approved design.
  assert.match(evidence.handoffSha256,/^[a-f0-9]{64}$/);
  const homeEvidence=evidence.pages.find(x=>x.path==='/');
  const interiorEvidence=evidence.pages.find(x=>x.id===interiorPage.id);
  assert.ok(homeEvidence&&interiorEvidence);
  for(const width of ['desktop','tablet','mobile']){
    assert.equal(homeEvidence.references[width].sha256,evidence.prototypes[width].sha256);
    const ref=interiorEvidence.references[width];
    assert.ok(ref.source.endsWith('interior-'+width+'.png'));
        assert.ok(fs.existsSync(path.join(evidenceDir,ref.file)));
    assert.equal(ref.sha256,require('node:crypto').createHash('sha256')
      .update(fs.readFileSync(path.join(evidenceDir,ref.file))).digest('hex'));
    assert.notEqual(ref.file,homeEvidence.references[width].file);
  }
  assert.ok(fs.existsSync(path.join(evidenceDir,evidence.clientExplanation.file)));
  assert.ok(fs.existsSync(path.join(evidenceDir,evidence.implementationSpec.file)));
  const reportHtml=fs.readFileSync(path.join(evidenceDir,'report.html'),'utf8');
  assert.match(reportHtml,/script-src 'sha256-/);
  assert.match(reportHtml,/connect-src 'none'/);
  assert.doesNotMatch(reportHtml,/onerror=|<script src=/i);
  const captureVerify=spawnSync(process.execPath,
    ['stage3/bin/verify-capture.cjs',evidenceDir,folder],{cwd:root,encoding:'utf8'});
  assert.equal(captureVerify.status,0,captureVerify.stderr);
  const verifyReport=JSON.parse(captureVerify.stdout);
  assert.equal(verifyReport.valid,true);
  assert.equal(verifyReport.copiedApprovedReferences,6);
  assert.equal(verifyReport.visualApprovalEstablished,false);
  const copiedShot=path.join(evidenceDir,interiorEvidence.screenshots.mobile.file);
  const originalShot=fs.readFileSync(copiedShot);
  fs.appendFileSync(copiedShot,Buffer.from('tamper'));
  assert.notEqual(spawnSync(process.execPath,
    ['stage3/bin/verify-capture.cjs',evidenceDir,folder],
    {cwd:root,encoding:'utf8'}).status,0,'Modified screenshot cannot pass portable evidence verification');
  fs.writeFileSync(copiedShot,originalShot);
  assert.equal(spawnSync(process.execPath,
    ['stage3/bin/verify-capture.cjs',evidenceDir,folder],
    {cwd:root,encoding:'utf8'}).status,0,'Restored exact screenshot bytes pass verification');
  const offlineContext=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:950}});
  const offline=await offlineContext.newPage(),offlineErrors=[];
  offline.on('pageerror',err=>offlineErrors.push(err.message));
  try{
    await offline.goto(require('node:url').pathToFileURL(path.join(evidenceDir,'report.html')).href);
    await offline.locator('#pages button').first().waitFor();
    assert.match(await offline.locator('#overview').innerText(),/макетов: 6/);
    await offline.locator('#pages button').nth(1).click();
    assert.match(await offline.locator('#reference-status').innerText(),/interior-desktop.png/);
    assert.equal(await offline.locator('#original').getAttribute('src'),
      interiorEvidence.references.desktop.file);
    await offline.locator('#modes [data-mode="overlay"]').click();
    await offline.locator('#opacity-control').evaluate(input=>{
      input.value='72';input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    assert.equal(await offline.locator('#overlay-image').evaluate(x=>x.style.opacity),'0.72');
    await offline.locator('#devices [data-device="mobile"]').click();
    assert.match(await offline.locator('#reference-status').innerText(),/interior-mobile.png/);
    await offline.locator('#new-note').fill('На мобильном экране нужно исправить поля');
    await offline.locator('#add-note').click();
    assert.match(await offline.locator('#overview').innerText(),/открытых замечаний: 1/);
    const downloadPromise=offline.waitForEvent('download');
    await offline.locator('#export-json').click();
    const download=await downloadPromise;
    assert.match(download.suggestedFilename(),/^manual-visual-review-/);
    const downloaded=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(downloaded.format,'manufact-offline-visual-review-v1');
    assert.equal(downloaded.siteId,evidence.siteId);
    assert.equal(downloaded.packageSha256,evidence.handoffSha256);
    assert.equal(downloaded.visualFindings.length,1);
    assert.equal(downloaded.visualFindings[0].pageId,interiorPage.id);
    assert.equal(downloaded.visualFindings[0].device,'mobile');
    const briefPromise=offline.waitForEvent('download');
    await offline.locator('#export-brief').click();
    const brief=await briefPromise;
    assert.match(fs.readFileSync(await brief.path(),'utf8'),/На мобильном экране нужно исправить поля/);
    await offline.locator('#notes').getByRole('button',{name:/Отметить исправленным/}).click();
    assert.match(await offline.locator('#overview').innerText(),/открытых замечаний: 0/);
    await offline.locator('#import-json').setInputFiles({
      name:'restore-notes.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(downloaded))
    });
    await offline.waitForFunction(()=>document.querySelector('#overview')
      ?.textContent?.includes('открытых замечаний: 1'));
    const forged={...downloaded,packageSha256:'f'.repeat(64)};
    await offline.locator('#import-json').setInputFiles({
      name:'wrong-project.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(forged))
    });
    await offline.waitForFunction(()=>document.querySelector('#status')
      ?.textContent?.includes('Импорт отклонён'),null,{timeout:5000});
    assert.match(await offline.locator('#overview').innerText(),/открытых замечаний: 1/);
    // Bring the portable non-approved notes back to the same immutable source
    // in owner Studio; only OPEN findings can be recorded, never sign-offs.
    await page.locator('#server-launch-review').click();
    await page.locator('#server-launch-dialog').waitFor();
    await page.locator('#server-launch-import-input').setInputFiles({
      name:'offline-pilot-findings.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(downloaded))
    });
    await page.waitForFunction(()=>document.querySelector('#server-launch-visual-index')
      ?.textContent?.includes('Открытые замечания по сайту: 1'),null,{timeout:10000});
    const studioRevision=(await (await page.request.get(origin+
      '/api/sites/site-approved-browser')).json()).revision;
    const serverFromOffline=(await (await page.request.get(origin+
      '/api/sites/site-approved-browser/visual-review?revision='+studioRevision)).json());
    assert.equal(serverFromOffline.openCount,1);
    assert.equal(serverFromOffline.findings.find(x=>!x.resolved).note,
      'На мобильном экране нужно исправить поля');
    await page.locator('#server-launch-close').click();
    assert.deepEqual(offlineErrors,[],'Offline review must function without JS errors');
  }finally{await offlineContext.close();}
    // Capture artifacts are evidence for human visual review, not pixel-diff approval.
  // Owner can restore imported site's previously saved version without mutating
  // public content: stale drafts and published pages are separate snapshots.
  // Save/Publish reload the server snapshot and may reset the inspector focus.
  // Re-select the exact imported FAQ before changing the next private draft.
  await page.locator('#pages .nav-entry').first().click();
  await openSectionTree();
  await page.locator('#sections .nav-entry').last().click();
  assert.match(await page.locator('#inspector-title').innerText(),/FAQ/);
  await page.locator('[data-inspector-scope="element"]').click();
  await page.locator('#elements .cms-repeat-row').last().locator('button.element').click();
  await page.locator('#fields [data-field="content.question"]').fill('Черновик, который нужно откатить');
  await page.locator('#fields [data-field="content.question"]').dispatchEvent('change');
  const preRestoreRevision=(await (await page.request.get(
    origin+'/api/sites/site-approved-browser')).json()).revision;
  await page.locator('#save').click();
  // Page recovery stays in site resources, outside the editor toolbar.
  await page.locator('#server-nav-resources').click();
  await page.locator('#server-view-resources:visible').waitFor();
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-site-resources.png'),fullPage:true});
  await page.locator('#server-drawer-backup').evaluate(node=>{node.open=true;});
  await page.locator('#server-history-open').click();
  await page.locator('#server-history-dialog[open]').waitFor();
  await page.locator('#server-history-number option[value="'+preRestoreRevision+'"]')
    .waitFor({state:'attached'});
  await page.locator('#server-history-number').selectOption(String(preRestoreRevision));
  await page.locator('#server-history-page option[value="'+imported.pages[0].id+'"]')
    .waitFor({state:'attached'});
  await page.locator('#server-history-page').selectOption(imported.pages[0].id);
  await page.locator('#server-history-section').selectOption('section-approved-faq');
  await page.locator('#server-history-plan').click();
  await page.waitForFunction(()=>!document.querySelector('#server-history-apply')?.disabled);
  await page.locator('#server-history-apply').click();
  await page.locator('#server-history-dialog').waitFor({state:'hidden'});
  await page.waitForFunction(expected=>document.querySelector('#server-status')?.textContent
    ?.includes('Черновик #'+expected),preRestoreRevision+2);
  assert.deepEqual((await page.evaluate(()=>window.Stage3Editor.getSite()))
    .pages[0].sections.find(s=>s.id==='section-approved-faq')
    .items.map(i=>i.values['content.question']),
    ['Как оформить заказ?','Что входит в комплект?'],
    'Restored previous server revision of imported website');
  await visitor.reload();
  assert.deepEqual(await visitor.locator('section.faq summary').allInnerTexts(),
    ['Как оформить заказ?','Что входит в комплект?'],
    'Restoring a private revision never changes the public site');

  // Edit the global footer through Studio, save a private revision, and verify
  // that the already-published visitor remains unchanged without Publish.
  await page.locator('#server-nav-site-settings').click();
  await page.locator('#server-view-site-settings:visible').waitFor();
  await page.locator('#server-tool-navigation').evaluate(node=>{node.open=true;});
  await page.locator('#cms-open-footer').click();
  await page.locator('#cms-footer-editor').waitFor({state:'visible'});
  await page.locator('#cms-footer-editor textarea').fill('Обновлённые контакты после запуска');
  await page.locator('#cms-footer-editor select').first().selectOption('primary');
  await page.locator('#cms-footer-editor-apply').click();
  await page.locator('#cms-footer-editor').waitFor({state:'hidden'});
  // Return to the canvas before saving the footer or managing page media.
  await page.locator('#server-nav-editor').click();
  const beforeFooterSave=(await (await page.request.get(origin+
    '/api/sites/site-approved-browser')).json()).revision;
  await page.locator('#save').click();
  await page.waitForFunction(expected=>document.querySelector('#server-status')?.textContent
    ?.includes('Черновик #'+expected),beforeFooterSave+1);
  const footerDraft=(await (await page.request.get(origin+
    '/api/sites/site-approved-browser')).json());
  assert.equal(footerDraft.site.footer.description,'Обновлённые контакты после запуска');
  assert.equal(footerDraft.site.footer.style,'primary');
  await visitor.reload();
  assert.equal(await visitor.locator('.cms-footer-description').innerText(),
    'Контакты и поддержка из утверждённого дизайна',
    'Private footer changes must never silently alter the public release');

  // A real imported individual site must accept a reviewed multi-file upload
  // without creating a second editor or silently publishing these new bytes.
  const batchStart=footerDraft.revision;
  const assetCount=footerDraft.site.assets.length;
  await page.locator('#server-nav-resources').click();
  await page.locator('#server-drawer-media').evaluate(node=>{node.open=true;});
  await page.locator('#server-media-file').setInputFiles([
    {name:'desktop_banner.png',mimeType:'image/png',buffer:examplePng},
    {name:'discard.png',mimeType:'image/png',buffer:examplePng},
    {name:'mobile_banner.png',mimeType:'image/png',buffer:examplePng}
  ]);
  await page.locator('#server-media-batch-dialog[open]').waitFor();
  assert.equal(await page.locator('#server-media-batch-rows img').count(),3);
  await page.locator('[data-batch-index="1"] [data-media-batch-action="remove"]').click();
  assert.equal(await page.locator('#server-media-batch-rows img').count(),2);
  assert.equal(await page.locator('#server-media-batch-alt-0').inputValue(),'desktop banner');
  await page.locator('#server-media-batch-alt-0').fill('Баннер для ПК');
  await page.locator('#server-media-batch-alt-1').fill('');
  assert.equal((await (await page.request.get(origin+
    '/api/sites/site-approved-browser')).json()).revision,batchStart,
  'Review cannot start uploading before confirmation');
  await page.locator('#server-media-batch-upload').click();
  await page.locator('#server-media-batch-dialog').waitFor({state:'hidden'});
  const batchResult=await (await page.request.get(origin+
    '/api/sites/site-approved-browser')).json();
  assert.equal(batchResult.revision,batchStart+2,'Each upload uses current saved CAS revision');
  assert.equal(batchResult.site.assets.length,assetCount+2);
  assert.deepEqual(batchResult.site.assets.slice(-2).map(asset=>asset.alt),['Баннер для ПК','']);
  assert.equal((await visitor.locator('.cms-footer-description').innerText()),
    'Контакты и поддержка из утверждённого дизайна','Batch upload never publishes a draft');

  // Preflight must reject a corrupt second image BEFORE sending the first one.
  await page.locator('#server-media-file').setInputFiles([
    {name:'safe.png',mimeType:'image/png',buffer:examplePng},
    {name:'corrupt.png',mimeType:'image/png',buffer:Buffer.from('bad bytes')}
  ]);
  await page.locator('#server-media-batch-dialog[open]').waitFor();
  await page.locator('#server-media-batch-upload').click();
  await page.locator('#server-media-batch-progress').getByText(/Загружено 0 из 2/).waitFor();
  assert.equal((await (await page.request.get(origin+
    '/api/sites/site-approved-browser')).json()).revision,batchStart+2);
  await page.locator('#server-media-batch-close').click();

  // Dragging client files into the existing media panel opens the SAME
  // review queue. Cancelling releases previews and leaves the site untouched.
  await page.evaluate(base64=>{
    const bytes=Uint8Array.from(atob(base64),char=>char.charCodeAt(0));
    const transfer=new DataTransfer();
    transfer.items.add(new File([bytes],'drag-desktop.png',{type:'image/png'}));
    transfer.items.add(new File([bytes],'drag-mobile.png',{type:'image/png'}));
    document.querySelector('.hosted-media').dispatchEvent(new DragEvent('drop',{
      dataTransfer:transfer,bubbles:true,cancelable:true
    }));
  },examplePng.toString('base64'));
  await page.locator('#server-media-batch-dialog[open]').waitFor();
  const localPreview=await page.locator('#server-media-batch-rows img').first().getAttribute('src');
  assert.match(localPreview,/^blob:/,'Preview uses local object URL, not public media bytes');
  await page.locator('#server-media-batch-close').click();
  assert.equal((await (await page.request.get(origin+
    '/api/sites/site-approved-browser')).json()).revision,batchStart+2);

  // A stale server revision mid-queue must not claim atomic success or retry
  // already-saved media; only successful entries appear in the draft.
  let requests=0;
  const batchRoute='**/api/sites/site-approved-browser/media';
  await page.route(batchRoute,route=>{
    requests++;
    if(requests===2)return route.fulfill({status:409,contentType:'application/json',
      body:JSON.stringify({error:'Stale draft; reload before uploading media'})});
    return route.continue();
  });
  await page.locator('#server-media-file').setInputFiles([
    {name:'saved.png',mimeType:'image/png',buffer:examplePng},
    {name:'conflict.png',mimeType:'image/png',buffer:examplePng}
  ]);
  await page.locator('#server-media-batch-upload').click();
  await page.locator('#server-media-batch-progress').getByText(/Загружено 1 из 2/).waitFor();
  assert.equal(await page.locator('#server-media-batch-upload').isDisabled(),true);
  await page.locator('#server-media-batch-close').click();
  await page.unroute(batchRoute);
  const partialBatch=await (await page.request.get(origin+
    '/api/sites/site-approved-browser')).json();
  assert.equal(partialBatch.revision,batchStart+3);
  assert.equal(partialBatch.site.assets.length,assetCount+3);
  // The mandatory approved-site CI journey also verifies the NEW owner
  // Workbench image flow (the separate extended test is not part of this job).
  // Upload is private. One plain alt-text field updates the new library
  // asset and the selected image element together, without an extra checkbox.
  const inlineBefore=partialBatch.site.assets.length;
  await page.locator('#server-nav-editor').click();
  await page.locator('#server-edit-page').click();
  await page.locator('#cms-page-preview[open]').waitFor();
  await page.locator('#cms-page-preview-path').selectOption('/');
  await page.locator('#cms-work-section').selectOption('section-approved-custom');
  await page.locator('#cms-work-graph-node').selectOption('approved-custom-photo');
  await page.locator('#cms-page-preview .cms-page-preview-modes [data-mode="mobile"]').click();
  await page.locator('#cms-work-graph-media > summary').click();
  await page.locator('#server-work-graph-upload').waitFor();
  assert.equal(await page.locator('#server-work-graph-update-alt').count(),0,
    'Image descriptions are edited as text fields, not technical checkboxes');
  assert.equal(await page.locator('#server-work-graph-public-alt').count(),0);
  assert.equal(await page.locator('#server-work-graph-alt').inputValue(),'Графическое оформление',
    'The selected image description is a single normal text field');
  const originalDesktop=await page.evaluate(()=>{
    const graph=window.Stage3Editor.getSite().pages[0].sections
      .find(section=>section.id==='section-approved-custom').designGraph;
    return graph.nodes[0].children.find(node=>node.id==='approved-custom-photo').assetId;
  });
  const generatedPng=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=960;canvas.height=960;
    const ctx=canvas.getContext('2d'),data=ctx.createImageData(960,960);
    let seed=4897;
    for(let i=0;i<data.data.length;i+=4){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      data.data[i]=seed&255;data.data[i+1]=(seed>>>8)&255;
      data.data[i+2]=(seed>>>16)&255;data.data[i+3]=255;
    }
    ctx.putImageData(data,0,0);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const inlineFile=Buffer.from(generatedPng,'base64');
  assert.ok(inlineFile.length>1000000&&inlineFile.length<12582912);
  await page.locator('#server-work-graph-file').setInputFiles({
    name:'approved-phone-noise.png',mimeType:'image/png',buffer:inlineFile
  });
  await page.locator('#server-work-graph-alt').fill('Тестовый мобильный вариант');
  // The image upload changes the server revision. Deliberately hold the NEW
  // revision's PHP render to exercise the Workbench in-flight state against
  // actual PHP/Chromium, not just mocked offline editor HTML.
  let delayedImagePreviews=0;
  const delayedImagePreview='**/api/sites/site-approved-browser/preview';
  await page.route(delayedImagePreview,async route=>{
    if(route.request().postDataJSON()?.site?.assets?.length===inlineBefore+1){
      delayedImagePreviews++;
      await new Promise(resolve=>setTimeout(resolve,950));
    }
    await route.continue();
  });
  // The prior genuine mobile screenshot showed "Stale editor revision" behind
  // this Workbench. The processed image upload advances the server CAS, then
  // editor.replace() immediately requests a fresh *background* PHP preview.
  // Wait for that exact new-asset preview response before taking evidence.
  const updatedCanvasPreview=page.waitForResponse(response=>{
    const request=response.request();
    if(request.method()!=='POST'||
      new URL(request.url()).pathname!=='/api/sites/site-approved-browser/preview')return false;
    const body=request.postDataJSON();
    return body.site?.assets?.length===inlineBefore+1;
  },{timeout:20000});
  await page.locator('#server-work-graph-apply').click();
  await page.locator('#cms-work-preview-progress').waitFor({state:'visible',timeout:20000});
  assert.equal(await page.frameLocator('#cms-page-preview-frame')
    .locator('.cmsdg-n-approved-custom-photo').count(),1,
  'The complete previous PHP page remains visible during the slow image revision render');
  assert.equal(await page.locator('#cms-page-preview-frame').getAttribute('aria-busy'),'true');
  assert.equal(await page.locator('#cms-page-preview-frame').evaluate(frame=>frame.style.pointerEvents),'none',
    'The previous revision cannot accept new editing clicks while its replacement is pending');
  const updatedCanvasResponse=await updatedCanvasPreview;
  assert.equal(updatedCanvasResponse.request().postDataJSON().expectedRevision,
    partialBatch.revision+1,'Workbench preview must use the post-upload server revision');
  assert.equal(updatedCanvasResponse.status(),200,
    'A committed image must not leave a stale-revision warning behind the Workbench');
  await page.waitForFunction(before=>{
    const site=window.Stage3Editor.getSite();
    return site.assets.length===before+1&&window.Stage3Editor.isDirty();
  },inlineBefore,{timeout:20000});
  await page.waitForFunction(()=>!!document.querySelector('#preview')?.contentDocument
    ?.querySelector('[data-cms-editor-section]'));
  // Await the real completed Workbench PHP document as well. Capturing while
  // its async iframe still says "building preview" hides the actual mobile
  // image UI and makes the screenshot unsuitable for a visual regression.
  await page.frameLocator('#cms-page-preview-frame')
    .locator('.cmsdg-n-approved-custom-photo').waitFor({timeout:20000});
  await page.locator('#cms-work-preview-progress').waitFor({state:'hidden',timeout:20000});
  assert.ok(delayedImagePreviews>0,'Chromium exercised the slow real PHP render');
  assert.equal(await page.locator('#cms-page-preview-frame').getAttribute('aria-busy'),null);
  await page.unroute(delayedImagePreview);
  assert.doesNotMatch(await page.frameLocator('#cms-page-preview-frame').locator('body').innerText(),
    /Stale editor revision|Не удалось построить серверный предпросмотр/);
  const mediaState=await page.evaluate(()=>{
    const site=window.Stage3Editor.getSite(),section=site.pages[0].sections
      .find(s=>s.id==='section-approved-custom');
    const node=section.designGraph.nodes[0].children
      .find(n=>n.id==='approved-custom-photo');
    return {node,asset:site.assets.at(-1)};
  });
  assert.equal(mediaState.node.assetId,originalDesktop,'Desktop image keeps its real remapped site asset');
  assert.equal(mediaState.node.alt,'Тестовый мобильный вариант');
  assert.equal(mediaState.asset.alt,'Тестовый мобильный вариант',
    'The one alt text field is applied consistently to the asset and the public image element');
  assert.equal(mediaState.node.responsiveMedia.mobileAssetId,mediaState.asset.id);
  assert.equal(mediaState.asset.mime,'image/webp');
  assert.equal(await page.locator('#cms-page-preview').evaluate(node=>node.open),true);
  // The Graph is in mobile preview mode, but the outer screenshot should
  // also capture real phone layout; otherwise the artifact name misleads UX QA.
  await page.setViewportSize({width:390,height:844});
  await assertNoHorizontalOverflow('Workbench mobile image asset selection at 390px');
  assert.equal(page.viewportSize().width,390,
    'owner-studio-workbench-image-mobile.png must capture a genuine phone viewport');
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-workbench-image-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1400,height:1000});
  await page.locator('#server-work-save').click();
  await page.locator('#server-work-state').getByText(/сохранён/).waitFor();
  const savedPhone=(await (await page.request.get(
    origin+'/api/sites/site-approved-browser')).json()).site;
  assert.equal(savedPhone.pages[0].sections.find(s=>s.id==='section-approved-custom')
    .designGraph.nodes[0].children.find(n=>n.id==='approved-custom-photo')
    .responsiveMedia.mobileAssetId,mediaState.asset.id);
  await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();
  await page.locator('#server-nav-editor').click();
  assert.equal((await visitor.goto(origin+'/published/site-approved-browser/')).status(),200,
    'Changing draft mobile imagery does not publish the new asset');

  // Real PHP media renderers skip gallery items without a media file. Two
  // visible cards may also have the same asset AND caption. Workbench binding
  // must follow the exact remaining item order, never guess by caption or the
  // unfiltered repeater index (which could edit an invisible neighbour).
  const beforeSkippedMedia=await page.evaluate(()=>window.Stage3Editor.getSite());
  const galleryProbe=await page.evaluate(()=>{
    const original=window.Stage3Editor.getSite(),draft=structuredClone(original);
    const asset=draft.assets.find(a=>/^image\/(png|jpeg|webp)$/.test(a.mime));
    if(!asset)throw Error('Approved browser needs one owned photo');
    const manifest=window.Stage3Editor.manifests().find(m=>m.id==='adaptive-gallery');
    const defaults=fields=>Object.fromEntries(fields.map(f=>[f.path,structuredClone(f.default)]));
    const section={id:'section-skipped-photo-probe',component:manifest.id,
      manifestVersion:manifest.version,
      elements:manifest.elements.map((entry,index)=>({id:'skipped-gallery-el-'+index,
        slot:entry.slot,values:defaults(entry.fields)})),
      items:['blank','second','third'].map((which,index)=>({
        id:'skipped-gallery-'+which,
        values:{...defaults(manifest.repeat.fields),
          'content.media':index===0?'':asset.id,
          'content.caption':'Одинаковая подпись'}
      }))};
    draft.pages[0].sections.push(section);
    window.Stage3Editor.replace(draft);
    return section.id;
  });
  await page.locator('#server-edit-page').click();
  await page.locator('#cms-page-preview[open]').waitFor();
  await page.locator('#cms-page-preview-path').selectOption('/');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#cms-page-preview [data-mode="mobile"]').click();
  const renderedGallery=page.frameLocator('#cms-page-preview-frame')
    .locator('#'+galleryProbe+' .cms-adaptive-card');
  await page.waitForFunction(id=>{
    const doc=document.querySelector('#cms-page-preview-frame')?.contentDocument;
    const cards=doc?.querySelectorAll('#'+id+' .cms-adaptive-card');
    return cards?.length===2&&cards[0].querySelector('img')
      ?.dataset.cmsWorkElement==='skipped-gallery-second';
  },galleryProbe,{timeout:20000});
  assert.equal(await renderedGallery.count(),2,
    'PHP omits the gallery item that has no valid uploaded photo');
  await renderedGallery.first().locator('img').click();
  assert.equal(await page.locator('#cms-work-element').inputValue(),'skipped-gallery-second',
    'First visible image picks the second authored item after a skipped blank item');
  assert.equal(await page.locator('#cms-work-media').evaluate(node=>node.open),true,
    'A phone tap on a normal gallery photo opens its existing image choices');
  await renderedGallery.nth(1).locator('img').click();
  assert.equal(await page.locator('#cms-work-element').inputValue(),'skipped-gallery-third',
    'Duplicate captions and image IDs do not collapse distinct gallery item identities');
  assert.equal(await page.evaluate(()=>window.Stage3Editor.getSite().pages[0].sections
    .find(s=>s.id==='section-skipped-photo-probe').items[0].values['content.media']),'',
    'Image selection never changes the hidden blank item');
  await page.locator('#cms-page-preview').evaluate(dialog=>dialog.close());
  await page.evaluate(site=>window.Stage3Editor.replace(site),beforeSkippedMedia);
  assert.deepEqual(await page.evaluate(()=>window.Stage3Editor.getSite()),beforeSkippedMedia,
    'The isolated test gallery is fully removed before account and production checks');
  await page.setViewportSize({width:1400,height:1000});

  // Sign-out belongs to the account area, not the page or site settings.
  await page.locator('#server-nav-account').click();
  await page.locator('#server-logout').click();
  await page.locator('#server-login:not([hidden])').waitFor();
  assert.equal(await page.locator('#server-site-tools-dialog').evaluate(node=>node.open),false,
    'Signing out never leaves a site tools dialog open');

  /* An unavailable draft does not invalidate a login. The owner explicitly
     chooses a site and can open platform maintenance after a failed fetch. */
  await page.route('**/api/sites/site-approved-browser',route=>
    route.fulfill({status:503,contentType:'application/json',
      body:JSON.stringify({error:'CMS engine recovery required'})}),
    {times:1});
  await page.locator('#server-username').fill('testowner');
  await page.locator('#server-password').fill(env.STAGE3_OWNER_PASSWORD);
  await page.locator('#server-signin').click();
  await page.locator('#server-login').waitFor({state:'hidden'});
  await page.locator('#server-site-list .cms-site-card').first().waitFor();
  assert.equal(await page.locator('#server-view-home:visible').count(),1,
    'Login shows the explicit site list, never silently opens an arbitrary site');
  await page.locator('#server-site-list .cms-site-card button').first().click();
  await page.locator('#toast.error').getByText(/CMS engine recovery required/).waitFor();
  await page.locator('#server-nav-platform').click();
  const engineStatusResponsePromise=page.waitForResponse(response=>{
    try{return new URL(response.url()).pathname==='/api/engine'&&response.request().method()==='GET';}
    catch{return false;}
  });
  await page.locator('#server-engine-open').click();
  await page.locator('#server-engine-dialog[open]').waitFor();
  const engineStatusResponse=await engineStatusResponsePromise;
  const engineStatusBody=await engineStatusResponse.text();
  assert.equal(engineStatusResponse.status(),200,
    'The owner maintenance endpoint remains available after a site fetch failure: '+engineStatusBody.slice(0,500));
  assert.equal(await page.locator('#server-engine-open').evaluate(node=>node.hidden),false,
    'Owner maintenance is available independently from opening a site');
  await page.locator('#server-engine-status').getByText(/Текущая версия:/).waitFor({timeout:5000});
  assert.match(await page.locator('#server-engine-status').innerText(),/Текущая версия:/,
    'Owner can inspect CMS maintenance without a false login error');
  assert.equal(await page.locator('#server-engine-apply').isDisabled(),true,
    'A site-fetch failure never starts an engine update automatically');
  await page.unroute('**/api/sites/site-approved-browser');
  await page.locator('#server-engine-close').click();
  await page.locator('#server-nav-account').click();
  await page.locator('#server-logout').click();
  await page.locator('#server-login:not([hidden])').waitFor();
  assert.equal((await visitor.goto(origin+'/published/site-approved-browser/')).status(),200,
    'Real public visitor remains accessible without CMS login');
  assert.deepEqual(errors,[],'No unhandled browser script exceptions');
  await visitorCtx.close();
  console.log('STAGE3 APPROVED SITE CHROMIUM E2E PASS: sealed folder, 3 preview sizes, real media, FAQ order, SEO, draft, publish and restore');
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
