'use strict';
// Read-only real-public-HTML acceptance evidence for a sealed external website.
// Uses installed first-party test Chromium, executes NO website JS and never deploys.
// Only explicitly supplied loopback PHP preview URLs are permitted.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {preflight}=require('./verify-approved-site.cjs');
const widths=Object.freeze({desktop:1280,tablet:768,mobile:390});
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function usage(){
  return 'Usage: node stage3/bin/capture-approved-site.cjs /ABS/approved-site http://127.0.0.1:PORT/published/SITE-ID/ /ABS/empty-output';
}
function validateUrl(raw,siteId){
  const url=new URL(raw);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||
    url.username||url.password||url.search||url.hash||
    url.pathname!=='/published/'+siteId+'/')
    throw Error('Capture only accepts a local HTTP published site matching sealed siteId: '+siteId);
  return url;
}
function capturePath(page,index,device){
  // Keep file paths independent of arbitrary page slugs and URL encoding.
  return 'page-'+String(index+1).padStart(2,'0')+'-'+device+'.png';
}
async function capture(folder,rawUrl,destination){
  const proof=preflight(folder);
  if(proof.integrity!=='sha256-verified')
    throw Error('Actual acceptance evidence requires a SHA-256 sealed v2 handoff');
  const root=fs.realpathSync(folder);
  const descriptor=JSON.parse(fs.readFileSync(path.join(root,'handoff.json'),'utf8'));
  const site=JSON.parse(fs.readFileSync(path.join(root,descriptor.files.site),'utf8'));
  const base=validateUrl(rawUrl,proof.siteId);
  if(site.pages.length<1||site.pages.length>60)throw Error('Unexpected page count');
  const out=path.resolve(destination);
  if(out===root||out.startsWith(root+path.sep))
    throw Error('Keep generated screenshots outside the sealed approval folder');
  if(fs.existsSync(out))throw Error('Output directory already exists (never overwrite acceptance evidence)');
  const chrome=[process.env.STAGE3_CHROME,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
    '/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(fs.existsSync);
  if(!chrome)throw Error('Local Chromium not found; set STAGE3_CHROME to installed Chrome/Chromium');
  const {chromium}=require('../../cms/editor/node_modules/playwright-core');
  const evidence={format:'manufact-public-site-acceptance-evidence-v1',
    status:'screenshots-only-manual-approval-required',siteId:proof.siteId,
    version:proof.version,integrity:proof.integrity,
    capturedAt:new Date().toISOString(),baseUrl:base.href,
    devices:widths,prototypes:{},pages:[],warnings:[]};
  let browser;
  fs.mkdirSync(out,{recursive:false});
  try{
    for(const [device,field] of Object.entries(widths)){
      const name=descriptor.files[device],ext=path.extname(name).toLowerCase();
      const target='prototype-'+device+ext;
      const src=path.join(root,name);
      fs.copyFileSync(src,path.join(out,target));
      evidence.prototypes[device]={file:target,sha256:digest(src),width:field};
    }
    browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
    const context=await browser.newContext({
      viewport:{width:1280,height:900},deviceScaleFactor:1,
      javaScriptEnabled:false,serviceWorkers:'block',reducedMotion:'reduce',
      colorScheme:'light',acceptDownloads:false
    });
    // Read-only, no external resources or exfiltration from candidate sites.
    await context.route('**/*',route=>{
      const request=route.request();
      let allowed=false;
      try{
        const target=new URL(request.url());
        allowed=target.origin===base.origin&&target.pathname.startsWith('/published/'+proof.siteId+'/')&&
          ['GET','HEAD'].includes(request.method());
      }catch(_){}
      return allowed?route.continue():route.abort();
    });
    const page=await context.newPage();
    for(let i=0;i<site.pages.length;i++){
      const item=site.pages[i],localPath=item.path.replace(/^\//,'');
      const target=new URL(localPath,base);
      if(target.origin!==base.origin||!target.pathname.startsWith(base.pathname))
        throw Error('Site page escapes the published site: '+item.path);
      const record={path:item.path,title:item.title||'',screenshots:{},warnings:[]};
      for(const [device,width] of Object.entries(widths)){
        await page.setViewportSize({width,height:900});
        const response=await page.goto(target.href,{waitUntil:'load',timeout:20000});
        if(!response||response.status()!==200)
          throw Error('Public page not HTTP 200: '+item.path+' ('+(response?.status()??'network failure')+')');
        await page.evaluate(()=>document.fonts?.ready);
        // Full-page screenshots do not necessarily scroll to trigger native
        // loading="lazy". Fetch every image explicitly before the capture.
        await page.locator('img').evaluateAll(nodes=>{
          for(const image of nodes)image.loading='eager';
        });
        await page.waitForFunction(()=>[...document.images].every(image=>image.complete),
          {timeout:15000});
        const broken=await page.locator('img').evaluateAll(nodes=>nodes
          .filter(img=>!img.complete||img.naturalWidth===0)
          .map(img=>img.getAttribute('src')||'<empty src>'));
        if(broken.length)record.warnings.push(device+': missing image '+broken.slice(0,5).join(', '));
        const shot=capturePath(item,i,device),absolute=path.join(out,shot);
        await page.screenshot({path:absolute,fullPage:true,animations:'disabled',timeout:30000});
        record.screenshots[device]={file:shot,sha256:digest(absolute),
          width,height:await page.evaluate(()=>document.documentElement.scrollHeight)};
      }
      evidence.pages.push(record);
      evidence.warnings.push(...record.warnings.map(w=>item.path+': '+w));
    }
    await context.close();
    // The three prototypes are concept evidence, not necessarily a screenshot
    // for EVERY internal page. Never imply automated pixel matching.
    const proto=Object.entries(evidence.prototypes).map(([device,item])=>
      '<figure><figcaption>Утверждённый макет: '+escapeHtml(device)+'</figcaption><img src="'+
      escapeHtml(item.file)+'" alt="Утверждённый макет"></figure>').join('');
    const rendered=evidence.pages.map(item=>
      '<section><h2>'+escapeHtml(item.title||item.path)+' · '+escapeHtml(item.path)+'</h2><div class="grid">'+
      Object.entries(item.screenshots).map(([device,shot])=>
        '<figure><figcaption>Опубликованный PHP · '+escapeHtml(device)+'</figcaption><img src="'+
        escapeHtml(shot.file)+'" alt="Реальная полностраничная версия"></figure>').join('')+
      '</div><p>□ Совпадает композиция, текст, сетка, изображения и адаптив. □ Проверены действия/формы отдельно.</p>'+
      (item.warnings.length?'<pre>'+escapeHtml(item.warnings.join('\n'))+'</pre>':'')+
      '</section>').join('');
    const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>Ручная приёмка · '+escapeHtml(site.title)+'</title><style>'+
      'body{font:15px/1.55 system-ui;background:#f4f6f9;color:#172331;margin:0;padding:26px}main{max-width:1500px;margin:auto}'+
      'section{background:white;border:1px solid #dce1e9;border-radius:16px;padding:20px;margin:24px 0}'+
      '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(330px,100%),1fr));gap:16px}'+
      'figure{margin:0;min-width:0}figcaption{font-weight:700;margin-bottom:10px}img{display:block;width:100%;height:auto;border:1px solid #e3e7ef}'+
      'pre{white-space:pre-wrap;color:#b42318}p{color:#475569}</style><main><h1>Ручная приёмка · '+
      escapeHtml(site.title)+'</h1><p>Снимки настоящего опубликованного PHP-сайта при 1280/768/390 px. JavaScript отключён. '+
      'Здесь НЕТ автоматического pixel-diff, клиентского согласования или проверки отправки форм.</p>'+
      '<section><h2>Три исходных утверждённых макета</h2><div class="grid">'+proto+'</div></section>'+
      rendered+'</main></html>';
    fs.writeFileSync(path.join(out,'report.html'),html);
    fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
    return {output:out,pages:evidence.pages.length,screenshots:evidence.pages.length*3,
      warnings:evidence.warnings.length,manualApprovalRequired:true};
  }finally{if(browser)await browser.close();}
}
if(require.main===module){
  if(process.argv.length!==5){console.error(usage());process.exitCode=2;}
  else capture(process.argv[2],process.argv[3],process.argv[4])
    .then(result=>console.log('REAL PHP THREE-VIEWPORT CAPTURE: '+JSON.stringify(result)))
    .catch(error=>{console.error('CAPTURE FAIL: '+error.message);process.exitCode=1;});
}
module.exports=Object.freeze({capture,validateUrl,capturePath});
