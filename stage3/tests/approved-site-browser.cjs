'use strict';
// Genuine Chromium end-to-end: PHP session -> server Studio -> save -> publish.
// Disposable SQLite DB; loopback-only server; no Hostinger or external network.
const {chromium}=require('../../cms/editor/node_modules/playwright-core');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-studio-http-'));
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!chrome)throw Error('Chromium required for hosted Studio scenario');
const env={...process.env,STAGE3_DSN:'sqlite:'+path.join(temp,'site.sqlite'),
  STAGE3_OWNER_USER:'testowner',STAGE3_OWNER_PASSWORD:'CI-only-password-123456',
  STAGE3_FORM_SECRET:'CI-only-form-secret-with-minimum-32-characters',
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
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/studio');
  await page.locator('#server-login:not([hidden])').waitFor();
  await page.locator('#server-username').fill('testowner');
  await page.locator('#server-password').fill(env.STAGE3_OWNER_PASSWORD);
  await page.locator('#server-signin').click();
  await page.locator('#server-login').waitFor({state:'hidden'});

  // The owner now starts with a clear page/section tree. Expand secondary
  // disclosures for the existing exhaustive transport/backup regression path.
  assert.equal(await page.locator('#server-empty-state:visible').count(),1);
  assert.equal(await page.locator('#server-drawer-media').evaluate(node=>node.open),false);
  assert.equal(await page.locator('#server-site-tools').evaluate(node=>node.open),false);
  assert.equal(await page.locator('#server-resources').count(),1);
  assert.equal(await page.locator('#server-drawer-import').evaluate(node=>node.open),false);
  assert.equal(await page.locator('#history-details').evaluate(node=>node.open),false);
  assert.equal(await page.locator('#server-edit-page').count(),1);
  assert.equal(await page.locator('#page-add').isVisible(),true);
  assert.equal(await page.locator('#page-rename').isVisible(),false,
    'Rare page actions stay collapsed until requested');
  assert.equal(await page.locator('#section-catalog').isVisible(),true,
    'Adding a block uses the human-readable component catalog');
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
  // A fresh tab starts with secondary tools collapsed again; reveal import.
  await page.locator('#server-drawer-import').evaluate(node=>{node.open=true;});
  await page.locator('#server-approved-import:not([disabled])').waitFor();
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

  // Actual Chromium renders of the OWNER Studio (synthetic CI content only).
  // These go into the existing screenshot artifact, not a new UI/test system;
  // they are evidence for later human visual review, never owner sign-off.
  // The page/section tree exposes the current location to assistive technology
  // and keeps keyboard focus on the selected item after the existing redraw.
  await page.waitForFunction(()=>document.querySelectorAll('#pages .nav-entry[aria-current="page"]').length===1&&
    document.querySelectorAll('#sections .nav-entry[aria-current="location"]').length===1);
  assert.equal(await page.locator('#pages .nav-entry[aria-current="page"]').count(),1);
  assert.equal(await page.locator('#sections .nav-entry[aria-current="location"]').count(),1);
  assert.equal(await page.locator('#server-page-actions').evaluate(node=>node.open),false);
  await page.locator('#server-page-actions>summary').click();
  assert.equal(await page.locator('#page-rename').isVisible(),true);
  await page.locator('#server-page-actions>summary').click();
  await page.locator('#server-section-actions>summary').click();
  assert.equal(await page.locator('#section-appearance').isVisible(),true);
  await page.locator('#server-section-actions>summary').click();
  await page.locator('#section-catalog').click();
  await page.locator('#cms-component-catalog[open]').waitFor();
  await page.locator('#cms-component-catalog').getByRole('button',{name:'Закрыть'}).click();
  assert.equal(await page.locator('#server-tool-appearance #cms-open-theme').count(),1);
  assert.equal(await page.locator('#server-tool-seo #cms-open-seo').count(),1);
  assert.equal(await page.locator('#server-tool-navigation #cms-menu-open').count(),1);
  const secondPage=page.locator('#pages .nav-entry').last();
  await secondPage.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.matches('#pages .nav-entry.active[aria-current="page"]'));
  const lastSection=page.locator('#sections .nav-entry').last();
  await lastSection.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.matches('#sections .nav-entry.active[aria-current="location"]'));
  const firstPage=page.locator('#pages .nav-entry').first();
  await firstPage.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.matches('#pages .nav-entry.active[aria-current="page"]'));
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

  const studioScreenDir=path.join(root,'stage3/studio/out');
  fs.mkdirSync(studioScreenDir,{recursive:true});
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
  await page.locator('#sections .nav-entry').first().click();
  assert.equal(await page.locator('#save').getAttribute('aria-keyshortcuts'),'Control+S Meta+S');
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-hosted-mobile.png'),fullPage:true});
  // Native dialogs must be named from their visible heading and return focus
  // to the launcher after Escape, without replacing the browser focus trap.
  await page.locator('#server-site-tools').evaluate(node=>{node.open=true;});
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

  await page.locator('#server-edit-page').click();
  await page.locator('#cms-page-preview[open]').waitFor();
  await page.waitForFunction(()=>{
    const frame=document.querySelector('#cms-page-preview-frame');
    return !!frame?.contentDocument?.querySelector('[data-cms-section-id],section[id]');
  });
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-workbench-desktop.png'),fullPage:true});
  await page.setViewportSize({width:768,height:900});
  await assertNoHorizontalOverflow('Workbench at 768px');
  await page.locator('#cms-page-preview .cms-page-preview-modes [data-mode="tablet"]').click();
  await page.waitForFunction(()=>!!document.querySelector('#cms-page-preview-frame')?.contentDocument?.querySelector('[data-cms-section-id],section[id]'));
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-workbench-tablet.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await assertNoHorizontalOverflow('Workbench at 390px');
  const mobileDialogBox=await page.locator('#cms-page-preview').boundingBox();
  assert.ok(mobileDialogBox&&mobileDialogBox.x>=0&&mobileDialogBox.x+mobileDialogBox.width<=391,
    'Workbench dialog must remain inside the phone viewport');
  await page.locator('#cms-page-preview .cms-page-preview-modes [data-mode="mobile"]').click();
  await page.waitForFunction(()=>!!document.querySelector('#cms-page-preview-frame')?.contentDocument?.querySelector('[data-cms-section-id],section[id]'));
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-workbench-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1400,height:1000});
  await page.evaluate(()=>document.querySelector('#cms-page-preview').close());
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
  await page.locator('#server-approved-vault-open').click();
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
  await page.locator('#sections .nav-entry').nth(3).click();
  await page.locator('#section-design-graph').click();
  await page.locator('#cms-design-graph-dialog').waitFor();
  await page.locator('#cms-design-node-select').selectOption('approved-rich-table');
  await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'+ Строка',exact:true}).click();
  await page.locator('#cms-design-node-select').selectOption('approved-rich-table');
  await page.locator('#cms-design-graph-dialog').getByRole('button',{name:'+ Столбец',exact:true}).click();
  await page.locator('#cms-design-node-select').selectOption('approved-rich-gallery');
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
  await page.locator('#cms-open-page-preview').click();
  await page.locator('#cms-page-preview[open]').waitFor();
  await page.locator('#cms-work-section').selectOption('section-approved-custom');
  await page.locator('#cms-work-graph-node').selectOption('approved-custom-container');
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
  await page.locator('#cms-work-graph-image-library > summary').click();
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
  await page.locator('#cms-work-backgroundVideo-library summary').click();
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
  // Graph editor retains the selected custom section. Explicitly restore
  // hero focus before exercising its separate responsive inspector controls.
  await page.locator('#sections .nav-entry').first().click();
  assert.notEqual(imported.assets[0].id,'asset-external-hero','Server gives immutable site-owned asset ID');
  assert.equal(imported.pages[0].seo.ogImage,imported.assets[0].id,'SEO media reference remapped');
  assert.equal(imported.pages[0].seo.ogTitle,'asset-external-hero',
    'Client-authored SEO text matching a media ID is never rewritten');
  assert.equal((await page.request.get(origin+'/published/site-approved-browser/')).status(),404,
    'Approved folder import must never publish implicitly');
  await page.locator('#fields [data-field="content.text"]').first().fill('Редактируется после подключения');
  await page.locator('#fields [data-field="content.text"]').first().dispatchEvent('change');
  await page.locator('.device[data-bp="mobile"]').click();
  await page.locator('#fields [data-field="style.fontSize"]').fill('31px');
  await page.locator('#fields [data-field="style.fontSize"]').dispatchEvent('change');
  await page.locator('.device[data-bp="desktop"]').click();
  // Same imported site's FAQ — real add, edit, reorder, delete and Undo controls.
  await page.locator('#sections .nav-entry').last().click();
  assert.match(await page.locator('#inspector-title').innerText(),/FAQ/);
  await page.locator('#cms-repeat-add').click();
  assert.equal(await page.locator('#elements .cms-repeat-row').count(),3);
  await page.locator('#fields [data-field="content.question"]').fill('Что входит в комплект?');
  await page.locator('#fields [data-field="content.question"]').dispatchEvent('change');
  await page.locator('#fields [data-field="content.answer"]').fill('Состав услуги указан в договоре.');
  await page.locator('#fields [data-field="content.answer"]').dispatchEvent('change');
  const questions=()=>page.evaluate(()=>window.Stage3Editor.getSite().pages[0].sections
    .find(section=>section.component==='faq-accordion').items.map(item=>item.values['content.question']));
  assert.deepEqual(await questions(),['Как оформить заказ?','Как происходит доставка?','Что входит в комплект?'],
    'New FAQ item must actually receive edited question before reordering');
  await page.locator('#elements .cms-repeat-row').last()
    .locator('button[aria-label^="Поднять вопрос"]').click();
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
  await page.locator('#elements .cms-repeat-row')
    .filter({hasText:'Как происходит доставка?'}).locator('button[aria-label^="Удалить вопрос"]').click();
  assert.deepEqual(await questions(),['Как оформить заказ?','Что входит в комплект?'],
    'FAQ delete must target the specified question, not the currently selected index');
  assert.equal(await page.locator('#elements .cms-repeat-row').count(),2);
  assert.equal(await page.locator('#cms-repeat-add').innerText(),'+ Добавить вопрос');
  await page.locator('#cms-open-seo').click();
  await page.locator('#cms-setting-seo-title').fill('FAQ и готовый сайт — SEO');
  await page.locator('#cms-setting-seo-description').fill('Новые вопросы и SEO опубликованы после ручного сохранения');
  await page.locator('#cms-settings-apply').click();
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
  await page.locator('#server-status').getByText(/Опубликовано: v1/).waitFor();
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
  await page.locator('#sections .nav-entry').last().click();
  assert.match(await page.locator('#inspector-title').innerText(),/FAQ/);
  await page.locator('#elements .cms-repeat-row').last().locator('button.element').click();
  await page.locator('#fields [data-field="content.question"]').fill('Черновик, который нужно откатить');
  await page.locator('#fields [data-field="content.question"]').dispatchEvent('change');
  const preRestoreRevision=(await (await page.request.get(
    origin+'/api/sites/site-approved-browser')).json()).revision;
  await page.locator('#save').click();
  await page.locator('#history-details').evaluate(node=>{node.open=true;});
  await page.locator('#versions .version').first()
    .getByText('Ревизия #'+(preRestoreRevision+1)).waitFor();
  await page.locator('#versions .version').nth(1).click();
  await page.locator('#server-status')
    .getByText(new RegExp('Черновик #'+(preRestoreRevision+2))).waitFor();
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
  await page.locator('#server-site-tools').evaluate(node=>{node.open=true;});
  await page.locator('#server-tool-navigation').evaluate(node=>{node.open=true;});
  await page.locator('#cms-open-footer').click();
  await page.locator('#cms-footer-editor').waitFor({state:'visible'});
  await page.locator('#cms-footer-editor textarea').fill('Обновлённые контакты после запуска');
  await page.locator('#cms-footer-editor select').first().selectOption('primary');
  await page.locator('#cms-footer-editor-apply').click();
  await page.locator('#cms-footer-editor').waitFor({state:'hidden'});
  const beforeFooterSave=(await (await page.request.get(origin+
    '/api/sites/site-approved-browser')).json()).revision;
  await page.locator('#save').click();
  await page.locator('#server-status')
    .getByText(new RegExp('Черновик #'+(beforeFooterSave+1))).waitFor();
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
  // Upload is private; selecting the phone source leaves the desktop image
  // and shared public alt untouched until an explicit authoring decision.
  const inlineBefore=partialBatch.site.assets.length;
  await page.locator('#server-edit-page').click();
  await page.locator('#cms-page-preview[open]').waitFor();
  await page.locator('#cms-page-preview-path').selectOption('/');
  await page.locator('#cms-work-section').selectOption('section-approved-custom');
  await page.locator('#cms-work-graph-node').selectOption('approved-custom-photo');
  await page.locator('#cms-page-preview .cms-page-preview-modes [data-mode="mobile"]').click();
  await page.locator('#cms-work-graph-media > summary').click();
  await page.locator('#server-work-graph-upload').waitFor();
  assert.equal(await page.locator('#server-work-graph-update-alt').isChecked(),false);
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
  await page.locator('#server-work-graph-apply').click();
  await page.waitForFunction(before=>{
    const site=window.Stage3Editor.getSite();
    return site.assets.length===before+1&&window.Stage3Editor.isDirty();
  },inlineBefore,{timeout:20000});
  const mediaState=await page.evaluate(()=>{
    const site=window.Stage3Editor.getSite(),section=site.pages[0].sections
      .find(s=>s.id==='section-approved-custom');
    const node=section.designGraph.nodes[0].children
      .find(n=>n.id==='approved-custom-photo');
    return {node,asset:site.assets.at(-1)};
  });
  assert.equal(mediaState.node.assetId,originalDesktop,'Desktop image keeps its real remapped site asset');
  assert.equal(mediaState.node.alt,'Графическое оформление');
  assert.equal(mediaState.node.responsiveMedia.mobileAssetId,mediaState.asset.id);
  assert.equal(mediaState.asset.mime,'image/webp');
  assert.equal(await page.locator('#cms-page-preview').evaluate(node=>node.open),true);
  await page.screenshot({path:path.join(studioScreenDir,'owner-studio-workbench-image-mobile.png'),fullPage:true});
  await page.locator('#server-work-save').click();
  await page.locator('#server-work-state').getByText(/сохранён/).waitFor();
  const savedPhone=(await (await page.request.get(
    origin+'/api/sites/site-approved-browser')).json()).site;
  assert.equal(savedPhone.pages[0].sections.find(s=>s.id==='section-approved-custom')
    .designGraph.nodes[0].children.find(n=>n.id==='approved-custom-photo')
    .responsiveMedia.mobileAssetId,mediaState.asset.id);
  await page.locator('#cms-page-preview').getByRole('button',{name:'Закрыть'}).click();
  assert.equal((await visitor.goto(origin+'/published/site-approved-browser/')).status(),200,
    'Changing draft mobile imagery does not publish the new asset');

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
