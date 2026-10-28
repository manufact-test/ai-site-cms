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
  const ctx=await browser.newContext({viewport:{width:1400,height:1000}});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/studio');
  await page.locator('#server-login:not([hidden])').waitFor();
  await page.locator('#server-username').fill('testowner');
  await page.locator('#server-password').fill(env.STAGE3_OWNER_PASSWORD);
  await page.locator('#server-signin').click();
  await page.locator('#server-login').waitFor({state:'hidden'});
  // Import requires a selected authenticated owner workspace. This synthetic
  // workspace is not published and is not claimed to be a customer pilot.
  page.once('dialog',dialog=>dialog.accept('Черновик для проверки импорта'));
  await page.locator('#new-site').click();
  await page.locator('#server-status').getByText(/Черновик #1/).waitFor();
  const siteId=await page.locator('#server-site-select').inputValue();
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
      mime:'image/png',alt:'Фото внешнего сайта'}];
    site.pages[0].seo={title:'Внешний готовый сайт',description:'Проверка подключения внешнего сайта',
      robots:'index',ogImage:'asset-external-hero'};
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
  assert.equal(await page.locator('#server-approved-prototypes img').count(),3,
    'Operator must inspect desktop/tablet/mobile visual evidence before database writes');
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
  assert.match(approvedPreviewHtml,/cmsdg-gallery/);
  assert.match(approvedPreviewHtml,/cmsdg-quote/);
  assert.match(approvedPreviewHtml,/data:image\/png;base64,/,
    'Pre-import CMS renderer resolves packaged image bytes without HTTP requests');
  assert.equal((approvedPreviewHtml.match(/src="data:image\/png;base64,/g)||[]).length,4,
    'Image section, custom image and two gallery frames use exact packaged immutable image bytes');
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
  const pageOptions=await page.locator('#server-approved-review-page option').count();
  assert.ok(pageOptions>=2,'Owner can preview interior page before accepting site');
  const beforePageReference=await page.locator('[data-prototype="desktop"]').getAttribute('src');
  await page.locator('#server-approved-review-page').selectOption(interiorPage.path);
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
  assert.equal(unfinished.site.assets.length,1,'Interrupted import retains one isolated media file');
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
  assert.equal(resumed.site.assets.length,1,'Continuation never duplicates immutable asset IDs');
  const imported=await page.evaluate(()=>window.Stage3Editor.getSite());
  assert.equal(imported.siteId,'site-approved-browser');
  assert.equal(imported.assets.length,1);
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
  // Graph editor retains the selected custom section. Explicitly restore
  // hero focus before exercising its separate responsive inspector controls.
  await page.locator('#sections .nav-entry').first().click();
  assert.notEqual(imported.assets[0].id,'asset-external-hero','Server gives immutable site-owned asset ID');
  assert.equal(imported.pages[0].seo.ogImage,imported.assets[0].id,'SEO media reference remapped');
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
  assert.match(await page.locator('#server-launch-finding-list').innerText(),
    /отступы отличаются/);
  assert.equal(await page.locator('#server-launch-mark').isDisabled(),true,
    'Open visual discrepancy blocks human sign-off for selected device');
  await page.locator('#server-launch-finding-list').getByRole('button',{name:/Исправлено/}).click();
  assert.equal(await page.locator('#server-launch-mark').isDisabled(),false,
    'Resolved discrepancy permits explicit new human approval');
  // Previous review notes may be resumed without restoring any stale
  // "reviewed" device flags or trusting a different site's report.
  const revisionInfo=await (await page.request.get(origin+
    '/api/sites/site-approved-browser')).json();
  const importedNotes={
    format:'manufact-launch-review-v1',
    siteId:'site-approved-browser',
    revision:revisionInfo.revision,
    visualFindings:[{pageId:imported.pages[0].id,path:'/',device:'desktop',
      note:'Вернуть точную ширину главного блока',scrollY:110,resolved:false}]
  };
  await page.locator('#server-launch-import-input').setInputFiles({
    name:'review-notes.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(importedNotes))
  });
  await page.waitForFunction(()=>document.querySelector('#server-launch-finding-list')
    ?.textContent?.includes('Вернуть точную ширину'));
  assert.equal(await page.locator('#server-launch-mark').isDisabled(),true);
  await page.locator('#server-launch-finding-list').getByRole('button',{name:/Исправлено/}).click();
  assert.equal(await page.locator('#server-launch-mark').isDisabled(),false);
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
  await page.locator('#server-publish').click();
  await page.locator('#server-status').getByText(/Опубликовано: v1/).waitFor();
  assert.equal((await page.request.get(origin+'/published/site-approved-browser/')).status(),200);
  const approvedPage=await visitor.goto(origin+'/published/site-approved-browser/');
  assert.equal(approvedPage.status(),200);
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
  assert.match(artworkCss,/background-image:linear-gradient\(#182b3d59,#182b3d59\),url\("/,
    'PHP renders approved original site-owned raster with 35% dark overlay');
  assert.match(artworkCss,/@media\(max-width:600px\)\{[^}]+background-image:/,
    'PHP responsive art direction includes phone image rule');
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
