'use strict';
// REAL loopback HTTP GET smoke for the SEO capture (no external services).
// The sole mocked dependency is the lead's sealed-v2 preflight, unavailable on
// this worker branch. This is NOT client approval, published-host verification
// or proof of a real operator's screenshot capture.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const vm=require('node:vm'),http=require('node:http'),crypto=require('node:crypto');
const ACCEPTANCE=require('../lib/acceptance.cjs');
const png=Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000','hex');
const responsive=Buffer.from(png);responsive.writeUInt32BE(2,16);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const site={siteId:'pilot-local',title:'Pilot',language:'ru',pages:[
 {id:'page-home',path:'/',title:'Home',seo:{title:'Home',description:'Тест локального PHP',robots:'index'},sections:[{id:'sec-hero',elements:[{values:{'content.media':'asset-banner'}}]}]},
 {id:'page-about',path:'/about/',title:'About',seo:{title:'About',description:'Тест локального PHP',robots:'index'},sections:[]}],
 redirects:[{from:'/old/',to:'/about/'}],
 assets:[{id:'asset-banner',src:'/assets/asset-banner.png',mime:'image/png',alt:'Actual banner',
  variants:[{id:'asset-banner-sm',src:'/assets/asset-banner-sm.png',
   width:2,height:1,sha256:sha(responsive)}]},
 {id:'asset-secondary',src:'/assets/asset-secondary.png',mime:'image/png',alt:'Page image'}]};
const source={siteId:site.siteId,packageVersion:'sealed-v2',
 fileSha256:'a'.repeat(64),siteRevisionFingerprint:ACCEPTANCE.fingerprint(site),
 sealedMediaSha256:{'/assets/asset-banner.png':sha(png),
  '/assets/asset-banner-sm.png':sha(responsive),
  '/assets/asset-secondary.png':sha(png)}};
const code=fs.readFileSync(path.join(__dirname,'../lib/php-html-capture.cjs'),'utf8');
const moduleShim={exports:{}};
vm.runInNewContext(code,{
 module:moduleShim,exports:moduleShim.exports,Buffer,URL,
 require:(name)=>{
  if(name==='./approved-site-bridge.cjs')
   return {load:()=>({site,source}),isVerifiedSource:s=>s===source};
  if(name==='./acceptance.cjs')return ACCEPTANCE;
  if(name.startsWith('./'))return require(path.join(__dirname,'../lib',name.slice(2)));
  return require(name);
 }
},{filename:'php-html-capture.cjs',timeout:2000});
const CAP=moduleShim.exports;
const origin=()=>mode==='dev-origin'?'http://127.0.0.1:'+server.address().port:'https://pilot.example';
const publicMenu=title=>'<ul class="cms-menu-list">'+
 '<li class="cms-nav-item"><a href="/published/pilot-local/"'+(title==='Home'?' aria-current="page"':'')+'>Home</a></li>'+
 '<li class="cms-nav-item"><a href="/published/pilot-local/about/"'+(title==='About'?' aria-current="page"':'')+'>About</a></li></ul>';
const publicHeader=title=>'<header class="cms-site-header cms-menu-default"><div class="cms-header-inner">'+
 '<a class="cms-brand" href="/published/pilot-local/">Pilot</a>'+
 '<nav class="cms-nav-desktop" aria-label="Основная навигация">'+
 (mode==='bad-menu'?publicMenu(title).replace('href="/published/pilot-local/about/"','href="/bad/"'):publicMenu(title))+'</nav>'+
 '<details class="cms-mobile-menu"><summary>Меню</summary><nav aria-label="Мобильная навигация">'+
 publicMenu(title)+'</nav></details></div></header>';
const html=(title)=>{
 const route=title==='About'?'about/':'';
 const hasImage=title!=='About';
 const imageUrl=origin()+'/published/pilot-local/assets/'+
  (mode==='bad-og-url'?'asset-secondary.png':'asset-banner.png');
 const twitterImage=mode==='bad-twitter-image'?origin()+'/published/pilot-local/assets/asset-secondary.png':imageUrl;
 return '<!doctype html><html lang="ru"><head><title>'+title+
  '</title><meta name="description" content="Тест локального PHP">'+
  '<meta property="og:title" content="'+(mode==='bad-metadata'?'Old page':title)+'">'+
  '<meta property="og:type" content="website"><meta property="og:locale" content="ru_RU">'+
  '<meta property="og:description" content="Тест локального PHP">'+
  '<link rel="canonical" href="'+(mode==='bad-canonical'?'https://other.example/':
    origin()+'/published/pilot-local/'+route)+'">'+
  '<meta property="og:url" content="'+(mode==='bad-og-page'?'https://other.example/':
    origin()+'/published/pilot-local/'+route)+'">'+
  (hasImage?'<meta property="og:image" content="'+imageUrl+'">':'')+
  '<meta name="twitter:card" content="'+(hasImage?'summary_large_image':'summary')+'">'+
  '<meta name="twitter:title" content="'+title+'">'+
  '<meta name="twitter:description" content="Тест локального PHP">'+
  (hasImage?'<meta name="twitter:image" content="'+twitterImage+'">'+
   '<meta property="og:image:alt" content="Actual banner">'+
   '<meta name="twitter:image:alt" content="Actual banner">':'')+
  '</head>'+
  '<body>'+publicHeader(title)+'<h1>'+title+'</h1><a href="/published/pilot-local/about/">About</a>'+
  '<a href="/published/pilot-local/old/">Old route</a>'+
  (mode.startsWith('other-consumers')?
   '<style>.hero{background-image:url("/published/pilot-local/assets/asset-secondary.png")}</style>'+
   '<picture><source media="(max-width:600px)" srcset="/published/pilot-local/assets/asset-secondary.png">'+
   '<img src="/published/pilot-local/assets/asset-banner.png" alt="Fallback"></picture>'+
   '<video poster="/published/pilot-local/assets/asset-secondary.png">'+
   '<source src="/published/pilot-local/assets/asset-secondary.png"></video>':
   mode==='untracked-media'?
   '<picture><source srcset="/published/pilot-local/assets/not-in-site.png">'+
   '<img src="/published/pilot-local/assets/asset-banner.png" alt="Fallback"></picture>':
   '<img src="/published/pilot-local/assets/asset-secondary.png" alt="Secondary">')+
  '<footer>Pilot</footer></body></html>';
};
let mode='normal',requests=[];
const server=http.createServer((req,res)=>{
 requests.push({url:req.url,method:req.method});
 if(mode==='redirect'){res.writeHead(302,{Location:'https://example.com/'});res.end();return;}
 if(mode==='wrong-type'){res.writeHead(200,{'Content-Type':'text/plain'});res.end(html('Bad'));return;}
 if(mode==='oversize'){res.writeHead(200,{'Content-Type':'text/html'});res.end('x'.repeat(450001));return;}
 if(mode==='incomplete'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>Bad</h1>');return;}
 if(req.url==='/published/pilot-local/assets/asset-banner.png'||
    req.url==='/published/pilot-local/assets/asset-banner-sm.png'||
    req.url==='/published/pilot-local/assets/asset-secondary.png'){
  const original=req.url.endsWith('/asset-banner.png');
  const variant=req.url.endsWith('/asset-banner-sm.png');
  const bytes=mode==='bad-sealed-source'&&req.url.endsWith('asset-secondary.png')?
   responsive:variant&&mode!=='bad-variant-bytes'?responsive:png;
  if((mode==='bad-rendered-status'||mode==='other-consumers-bad')&&req.url.endsWith('/asset-secondary.png')){
   res.writeHead(404);res.end('Missing rendered image');return;
  }
  if(mode==='bad-media-status'&&original){res.writeHead(404);res.end('Not found');return;}
  const etag=mode==='bad-media-etag'&&original?'"incorrect"':'"'+sha(bytes)+'"';
  const response=mode==='bad-media-mime'&&original?'text/plain':'image/png';
  res.writeHead(200,{'Content-Type':response,'ETag':etag});
  res.end(bytes);return;
 }
 if(req.url==='/published/pilot-local/robots.txt'){
  if(mode==='no-public-origin'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"STAGE3_PUBLIC_ORIGIN missing"}');return;}
  res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});
  res.end('User-agent: *\nAllow: /\nSitemap: '+origin()+'/published/pilot-local/sitemap.xml\n');return;
 }
 if(req.url==='/published/pilot-local/sitemap.xml'){
  if(mode==='no-public-origin'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"STAGE3_PUBLIC_ORIGIN missing"}');return;}
  res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8'});
  res.end('<?xml version="1.0" encoding="UTF-8"?>'+
   '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
   '<url><loc>'+origin()+'/published/pilot-local/</loc></url>'+
   (mode==='bad-sitemap'?'':'<url><loc>'+origin()+'/published/pilot-local/about/</loc></url>')+'</urlset>');return;
 }
 if(req.url==='/published/pilot-local/old/'){
  res.writeHead(mode==='bad-301'?302:301,{Location:
   mode==='bad-301'?'/published/pilot-local/':'/published/pilot-local/about/'});
  res.end();return;
 }
 if(req.url==='/published/pilot-local/'||req.url==='/published/pilot-local/about/'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',
   'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
   ...(mode==='bad-xrobots'?{'X-Robots-Tag':'noindex,nofollow'}:{})});
  res.end(html(req.url.includes('about')?'About':'Home'));return;
 }
 res.writeHead(404);res.end();
});
function formAndFirstSiteCliContracts(){
 // Targeted offline check: no real POSTs, no mail or Telegram actions.
 const FORM=require('../lib/php-local-forms.cjs');
 const site={siteId:'pilot-form',pages:[{id:'page-form',path:'/',sections:[
  {id:'sec-form',component:'lead-form'}]}]};
 const doc=token=>'<html><body><section id="sec-form"><form method="post" accept-charset="utf-8" action="/forms/pilot-form/sec-form">'+
  '<input type="hidden" name="_release" value="7"><input type="hidden" name="_token" value="'+token+'">'+
  '<input type="text" name="website"><input name="name" type="text" required>'+
  '<input name="email" type="email" required><textarea name="message" required></textarea>'+
  '<input name="consent" type="checkbox" required><button type="submit">Go</button></form></section></body></html>';
 const inspect=html=>FORM.review(site,{siteId:'pilot-form',pages:[{id:'page-form',path:'/',html}]});
 const good=inspect(doc('a'.repeat(64)));
 assert.equal(good.expectedForms,1);assert.equal(good.observedForms,1);
 assert.equal(good.consistentRelease,7);
 assert.equal(good.findings.filter(x=>x.severity==='error').length,0);
 // PHP prioritizes DesignGraph over even an underlying legacy lead-form.
 // Do not report a phantom form or expected wizard if that typed section is overridden.
 const graphOverride=JSON.parse(JSON.stringify(site));
 graphOverride.pages[0].sections[0].designGraph={id:'graph-override',nodes:[
  {id:'graphic',type:'heading',level:2,text:'Instead of a form'}]};
 const overridden=FORM.review(graphOverride,{siteId:'pilot-form',pages:[{
  id:'page-form',path:'/',html:'<html><body><section id="sec-form" class="cmsdg cmsdg-graph-override"><h2>Instead of a form</h2></section></body></html>'
 }]});
 assert.equal(overridden.expectedForms,0);
 assert.equal(overridden.observedForms,0);
 assert.equal(overridden.findings.length,0);
 assert.ok(inspect(doc('invalid')).findings.some(x=>x.code==='php-form:token-marker'));
 assert.ok(inspect(doc('a'.repeat(64)).replace('/forms/pilot-form/sec-form','/forms/other-site/sec-form'))
  .findings.some(x=>x.code==='php-form:action-drift'));
 assert.ok(!JSON.stringify(inspect(doc('invalid'))).includes('a'.repeat(64)),
  'HMAC values must not appear in findings');
 // New FlexForm v1 builder custom fields and optional wizard steps.
 const withBuilder=JSON.parse(JSON.stringify(site));
 withBuilder.pages[0].sections[0].component='lead-form-flex';
 withBuilder.pages[0].sections[0].formFields=[{
  id:'field-inquiry',kind:'text',required:true,options:[],placeholder:'',label:'Inquiry'
 }];
 const built=doc('a'.repeat(64)).replace('</form>',
  '<input type="text" name="field-inquiry" required></form>');
 const builtCapture={siteId:'pilot-form',pages:[{id:'page-form',path:'/',html:built}]};
 assert.ok(!FORM.review(withBuilder,builtCapture).findings.some(x=>x.severity==='error'));
 assert.ok(FORM.review(withBuilder,{siteId:'pilot-form',pages:[{id:'page-form',path:'/',
  html:doc('a'.repeat(64))}]}).findings.some(x=>x.code==='php-form:extra-field-drift'));
 const withSteps=JSON.parse(JSON.stringify(site));
 withSteps.pages[0].sections[0].component='lead-form-flex';
 withSteps.pages[0].sections[0].formSteps=[
  {title:'Contact',fields:['name','email']},{title:'Details',fields:['message']}
 ];
 const wizard=doc('a'.repeat(64))
  .replace('<form method="post"','<form data-multi-step="yes" method="post"')
  .replace('</form>','<p class="lead-step-progress"></p><fieldset class="lead-step"></fieldset>'+
   '<fieldset class="lead-step"></fieldset><button type="button" data-step-next>Next</button>'+
   '<button type="button" data-step-back>Back</button></form>');
 assert.ok(!FORM.review(withSteps,{siteId:'pilot-form',pages:[{id:'page-form',path:'/',html:wizard}]})
  .findings.some(x=>x.severity==='error'));
 assert.ok(FORM.review(withSteps,{siteId:'pilot-form',pages:[{id:'page-form',path:'/',
  html:doc('a'.repeat(64))}]}).findings.some(x=>x.code==='php-form:step-layout-drift'));
 // Current PublicRenderer.php emits a source-pinned inline wizard; CSP must
 // contain the digest of that exact served script (no JS is executed here).
 const HEAD=require('../lib/php-local-head.cjs');
 const script='(()=>{const wizard=1;})();';
 const digest=crypto.createHash('sha256').update(script,'utf8').digest('base64');
 const siteHead={siteId:'pilot-form',title:'Pilot',language:'ru',pages:[{
  id:'page-form',path:'/',title:'Home',
  seo:{title:'Home',description:'Test',robots:'index'},
  sections:[{id:'sec-form',component:'lead-form-flex',formSteps:withSteps.pages[0].sections[0].formSteps}]
 }]};
 const docHead='<html lang="ru"><head><title>Home</title><meta name="description" content="Test">'+
  '<meta property="og:title" content="Home"><meta property="og:description" content="Test"></head>'+
  '<body><script>'+script+'</script></body></html>';
 const headCheck=(html,policy)=>HEAD.review(siteHead,{siteId:'pilot-form',
  pages:[{id:'page-form',path:'/',html}]},
  [{pageId:'page-form',path:'/',headers:{'content-security-policy':policy}}],null);
 const goodPolicy="default-src 'none'; frame-ancestors 'none'; script-src 'sha256-"+digest+"'";
 assert.ok(!headCheck(docHead,goodPolicy).findings.some(x=>x.severity==='error'));
 assert.ok(headCheck(docHead,"default-src 'none'; frame-ancestors 'none'").findings.some(x=>
  x.code==='php-head:inline-script-csp-drift'&&x.severity==='error'));
 assert.ok(headCheck(docHead.replace('<script>'+script+'</script>',''),goodPolicy).findings.some(x=>
  x.code==='php-head:wizard-script-absent'&&x.severity==='error'));
 // A real CMS import remaps immutable asset IDs. Source content must remain
 // byte-equivalent after precisely that retarget, not merely look similar.
 const RECONCILE=require('../lib/published-site-reconcile.cjs');
 const orig={siteId:'pilot-source',title:'Approved',pages:[{
  id:'page-home',path:'/',sections:[{id:'sec-home',
   elements:[{id:'el-image',values:{'content.media':'asset-main'}}]}]}],
  assets:[{id:'asset-main',src:'/assets/asset-main.png',mime:'image/png',alt:'Hero',
   variants:[{id:'asset-small',src:'/assets/asset-small.png',
    width:2,height:1,sha256:'b'.repeat(64)}]}]};
 const imported=JSON.parse(JSON.stringify(orig));
 imported.assets=[{id:'generated-main',src:'/assets/generated-main.png',
  mime:'image/png',alt:'Hero',width:400,height:200,
  variants:[{id:'generated-small',src:'/assets/generated-small.png',
   width:2,height:1,sha256:'b'.repeat(64)}]}];
 imported.pages[0].sections[0].elements[0].values['content.media']='generated-main';
 const sealed={'/assets/asset-main.png':'a'.repeat(64),
  '/assets/asset-small.png':'b'.repeat(64)};
 const matched=RECONCILE.correlate(orig,imported,sealed);
 assert.equal(matched.sealedMediaSha256['/assets/generated-main.png'],'a'.repeat(64));
 assert.equal(matched.mediaIdMap['asset-small'],'generated-small');
 const edited=JSON.parse(JSON.stringify(imported));
 edited.pages[0].sections[0].elements[0].values['content.media']='wrong-image';
 assert.throws(()=>RECONCILE.correlate(orig,edited,sealed),/content differs/);
 const altered=JSON.parse(JSON.stringify(imported));altered.assets[0].alt='Unapproved';
 assert.throws(()=>RECONCILE.correlate(orig,altered,sealed),/ALT/);
 // This CLI remains a single command, with optional lead screenshot evidence.
 const cliSource=fs.readFileSync(path.join(__dirname,'../bin/first-site-check.cjs'),'utf8')
  .replace(/^#![^\n]*\n/,'');
 const m={exports:{}};
 vm.runInNewContext(cliSource,{
  module:m,exports:m.exports,__dirname:path.join(__dirname,'../bin'),
  require:n=>n.startsWith('../lib/')?{}:require(n)
 },{filename:'first-site-check.cjs',timeout:2000});
 const argv=['--approved-site','/tmp/sealed','--blueprint','/tmp/blueprint.json',
  '--origin','http://127.0.0.1:8080/published/pilot-form/',
  '--evidence','/tmp/new-evidence','--report','/tmp/new-report'];
 assert.equal(m.exports.parse(argv)['php-capture'],undefined);
 assert.equal(m.exports.parse([...argv,'--php-capture','/tmp/lead/evidence.json'])['php-capture'],
  '/tmp/lead/evidence.json');
 assert.equal(m.exports.parse([...argv,'--published-site','/tmp/published.json'])['published-site'],
  '/tmp/published.json');
 assert.equal(m.exports.parse([...argv,'--php-capture','/tmp/lead/evidence.json',
  '--published-site','/tmp/published.json'])['published-site'],'/tmp/published.json');
 assert.throws(()=>m.exports.parse([...argv,'--unknown','value']),/Unknown/);
}


function actualPublishedComponentAndGraphContracts(){
 // A compact end-to-end synthetic PHP HTML parity check for the components
 // and DesignGraph nodes emitted by the current real PublicRenderer/DesignGraph.
 const COMPONENTS=require('../lib/php-local-components.cjs');
 const GRAPH=require('../lib/php-local-graph.cjs');
 const mock={siteId:'pilot-typed',assets:[{id:'asset-main',src:'/assets/asset-main.png'}],
  pages:[{id:'page-home',path:'/',sections:[
   {id:'sec-pricing',component:'pricing-plans',items:[{id:'price-one',values:{
    'content.title':'Basic','content.price':'£10','content.features':'A\nB',
    'content.button':'Learn more','behavior.href':'/contact/'}}]},
   {id:'sec-process',component:'process-timeline',items:[{id:'step-one',values:{
    'content.title':'Setup','content.description':'Delivery','content.detail':'One day'}}]},
   {id:'sec-matrix',component:'comparison-matrix',items:[{id:'metric-one',values:{
    'content.metric':'Support','content.first':'Yes','content.second':'No'}}]},
   {id:'sec-switch',component:'content-switcher',items:[
    {id:'choice-one',values:{'content.title':'First','content.heading':'Heading A','content.body':'Body A'}},
    {id:'choice-two',values:{'content.title':'Second','content.heading':'Heading B','content.body':'Body B'}}]},
   {id:'sec-faq',component:'faq-accordion',items:[{id:'faq-one',values:{
    'content.question':'How?','content.answer':'Simple.'}}]},
   {id:'sec-review',component:'testimonials',items:[{id:'review-one',values:{
    'content.quote':'A great site','content.author':'Reviewer','content.role':'Customer'}}]},
   {id:'sec-cta',component:'cta-banner',elements:[
    {slot:'primary',values:{'content.text':'Contact us','behavior.href':'/contact/'}},
    {slot:'secondary',values:{'content.text':'Details','behavior.href':'/details/'}}]},
   {id:'sec-graph',component:'pricing-plans',designGraph:{id:'graph-one',nodes:[
    {id:'g-heading',type:'heading',level:1,text:'Hello & friends'},
    {id:'g-link',type:'link',href:'/contact/',text:'Reach us'},
    {id:'g-photo',type:'image',assetId:'asset-main',alt:'A & B'},
    {id:'g-tabs',type:'tabs',children:[
     {id:'g-tab-one',type:'tab',text:'Alpha',children:[{id:'g-t1',type:'text',text:'Panel one'}]},
     {id:'g-tab-two',type:'tab',text:'Beta',children:[{id:'g-t2',type:'text',text:'Panel two'}]}]}
   ]}}
  ]}]};
 const html='<html><head></head><body>'+
  '<section id="sec-pricing"><article class="cms-pricing-card"><h3>Basic</h3><p class="cms-pricing-price">£10</p><ul><li>A</li><li>B</li></ul><a href="/published/pilot-typed/contact/">Learn more</a></article></section>'+
  '<section id="sec-process"><li class="cms-process-step"><h3>Setup</h3><p>Delivery</p><small>One day</small></li></section>'+
  '<section id="sec-matrix"><table><thead><tr><th scope="col">Metric</th><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody><tr><th scope="row">Support</th><td>Yes</td><td>No</td></tr></tbody></table></section>'+
  '<section id="sec-switch"><fieldset class="cms-switcher"><input class="cms-switcher-radio" type="radio" name="switch-sec-switch" id="cms-switch-choice-one" checked><label class="cms-switcher-tab" for="cms-switch-choice-one">First</label><input class="cms-switcher-radio" type="radio" name="switch-sec-switch" id="cms-switch-choice-two"><label class="cms-switcher-tab" for="cms-switch-choice-two">Second</label><div class="cms-switcher-panels"><section class="cms-switcher-panel" id="cms-pane-choice-one"><h3>Heading A</h3><p>Body A</p></section><section class="cms-switcher-panel" id="cms-pane-choice-two"><h3>Heading B</h3><p>Body B</p></section></div></fieldset><style>#cms-switch-choice-one:checked~.cms-switcher-panels>#cms-pane-choice-one{display:block}#cms-switch-choice-two:checked~.cms-switcher-panels>#cms-pane-choice-two{display:block}</style></section>'+
  '<section id="sec-graph" class="cmsdg cmsdg-graph-one"><style>.cmsdg-tabs-g-tabs:has(> .cmsdg-tabs-controls > #cmsdg-tab-g-tab-one:checked) > .cmsdg-tabs-panels > #cmsdg-panel-g-tab-one{display:block}.cmsdg-tabs-g-tabs:has(> .cmsdg-tabs-controls > #cmsdg-tab-g-tab-two:checked) > .cmsdg-tabs-panels > #cmsdg-panel-g-tab-two{display:block}</style><h1 class="cmsdg-n-g-heading">Hello &amp; friends</h1><a class="cmsdg-n-g-link" href="/published/pilot-typed/contact/">Reach us</a><img class="cmsdg-n-g-photo" src="/published/pilot-typed/assets/asset-main.png" alt="A &amp; B"><div class="cmsdg-n-g-tabs cmsdg-tabs-g-tabs"><div class="cmsdg-tabs-controls"><input type="radio" name="cmsdg-tabs-g-tabs" id="cmsdg-tab-g-tab-one" aria-controls="cmsdg-panel-g-tab-one" checked><label for="cmsdg-tab-g-tab-one">Alpha</label><input type="radio" name="cmsdg-tabs-g-tabs" id="cmsdg-tab-g-tab-two" aria-controls="cmsdg-panel-g-tab-two"><label for="cmsdg-tab-g-tab-two">Beta</label></div><div class="cmsdg-tabs-panels"><div class="cmsdg-n-g-tab-one cmsdg-tab-panel" id="cmsdg-panel-g-tab-one"><p class="cmsdg-n-g-t1">Panel one</p></div><div class="cmsdg-n-g-tab-two cmsdg-tab-panel" id="cmsdg-panel-g-tab-two"><p class="cmsdg-n-g-t2">Panel two</p></div></div></div></section>'+
  '<section id="sec-faq"><details><summary>How?</summary><p>Simple.</p></details></section>'+
  '<section id="sec-review"><figure class="review"><blockquote>A great site</blockquote><figcaption>Reviewer · Customer</figcaption></figure></section>'+
  '<section id="sec-cta"><div class="cta-actions"><a class="action" href="/published/pilot-typed/contact/">Contact us</a><a class="action" href="/published/pilot-typed/details/">Details</a></div></section>'+
  '</body></html>';
 const read=markup=>({siteId:mock.siteId,pages:[{id:'page-home',path:'/',html:markup}]});
 const correctComponents=COMPONENTS.review(mock,read(html));
 const correctGraph=GRAPH.review(mock,read(html));
 assert.equal(correctComponents.checkedTypedSections,7);
 assert.equal(correctGraph.checkedNodes,8);
 assert.deepEqual(correctComponents.findings,[]);
 assert.deepEqual(correctGraph.findings,[]);
 const changed=html.replace('href="/published/pilot-typed/contact/"',
  'href="/published/pilot-typed/missing/"')
  .replace('id="cms-pane-choice-two"','id="wrong-pane"')
  .replace('aria-controls="cmsdg-panel-g-tab-two"','aria-controls="wrong-panel"')
  .replace('alt="A &amp; B"','alt="Altered"')
  .replace('<summary>How?</summary>','<summary>Why?</summary>')
  .replace('<blockquote>A great site</blockquote>','<blockquote>A bad site</blockquote>');
 assert.ok(COMPONENTS.review(mock,read(changed)).findings.some(x=>
  x.code==='php-component:pricing-content'&&x.sectionId==='sec-pricing'));
 assert.ok(COMPONENTS.review(mock,read(changed)).findings.some(x=>
  x.code==='php-component:switcher-parity'&&x.sectionId==='sec-switch'));
 assert.ok(GRAPH.review(mock,read(changed)).findings.some(x=>
  x.code==='php-graph:node-content-drift'&&x.graphNodeId==='g-photo'));
 assert.ok(GRAPH.review(mock,read(changed)).findings.some(x=>
  x.code==='php-graph:tabs-control'&&x.graphNodeId==='g-tab-two'));
 assert.ok(COMPONENTS.review(mock,read(changed)).findings.some(x=>
  x.code==='php-component:faq-content'&&x.sectionId==='sec-faq'));
 assert.ok(COMPONENTS.review(mock,read(changed)).findings.some(x=>
  x.code==='php-component:testimonial-content'&&x.sectionId==='sec-review'));
 const WORKSHEET=require('../lib/first-site-worksheet.cjs');
 const worksheet=WORKSHEET.build({
  site:mock,source:{siteId:mock.siteId,packageVersion:'sealed-v2',
   fileSha256:'a'.repeat(64),pageReferences:[{pageId:'page-home',
    devices:['desktop','tablet','mobile']}]},
  phpHtml:{siteId:mock.siteId,baseUrl:'http://127.0.0.1:9900/published/pilot-typed/',
   capturedAt:'2026-10-28T11:00:00Z',
   localComponents:COMPONENTS.review(mock,read(changed)),
   localGraph:GRAPH.review(mock,read(changed)),localForms:{pages:[],findings:[]},
   localMedia:{findings:[]},localHead:{findings:[]},publication:{findings:[]}},
  bundle:{siteId:mock.siteId,release:{decision:'review-required',
   blockers:[{gateId:'local-php-design-graph-parity',title:'Fix graph',taskIds:['one']}]}}
 });
 assert.ok(worksheet.statistics.actualBlockingFindings>=3);
 assert.ok(worksheet.markdown.includes('MANUAL CHECK UNCONFIRMED'));
 assert.ok(worksheet.markdown.includes('local-php-design-graph-parity'));
 assert.equal(worksheet.releaseAuthorized,false);
}

async function main(){
 actualPublishedComponentAndGraphContracts();
 formAndFirstSiteCliContracts();
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'seo-loopback-html-test-'));
 const sealed=path.join(tmp,'sealed');fs.mkdirSync(sealed);
 try{
  await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',e=>e?reject(e):resolve()));
  const base='http://127.0.0.1:'+server.address().port+'/published/pilot-local/';
  assert.equal(CAP.baseUrl(base,site.siteId),base);
  assert.throws(()=>CAP.baseUrl('http://localhost:'+server.address().port+
   '/published/pilot-local/',site.siteId),/127.0.0.1/);
  assert.throws(()=>CAP.baseUrl('https://127.0.0.1:123/published/pilot-local/',site.siteId),/127.0.0.1/);
  assert.throws(()=>CAP.baseUrl('http://127.0.0.1:123/published/different/',site.siteId),/127.0.0.1/);
  assert.equal(CAP.pageUrl(base,'/about/').href,base+'about/');
  assert.throws(()=>CAP.pageUrl(base,'//evil.org/'),/unexpected Site v1 page path/);
  const out=path.join(tmp,'html-01');
  const captured=await CAP.capture(sealed,base,out);
  assert.equal(captured.pages,2);assert.equal(captured.localHttp200,2);
  assert.equal(captured.publicHttpsChecked,false);assert.equal(captured.readyToPublish,false);
  assert.equal(captured.robotsStatus,200);assert.equal(captured.sitemapStatus,200);
  assert.equal(captured.localRedirectsCaptured,1);assert.equal(captured.localSeoFindings,0);
  assert.equal(captured.localMediaAssets,3);assert.equal(captured.localMediaFindings,0);
  assert.equal(captured.localMediaBytes,png.length*2+responsive.length);
  assert.deepEqual(requests.map(x=>x.url),[
   '/published/pilot-local/','/published/pilot-local/about/',
   '/published/pilot-local/robots.txt','/published/pilot-local/sitemap.xml',
   '/published/pilot-local/old/',
   '/published/pilot-local/assets/asset-banner.png',
   '/published/pilot-local/assets/asset-banner-sm.png',
   '/published/pilot-local/assets/asset-secondary.png']);
  assert.ok(requests.every(x=>x.method==='GET'));
  const result=CAP.read(out,site,source);
  assert.equal(CAP.isVerified(result),true);
  assert.equal(result.snapshot.format,'manufact-seo-html-snapshot-v1');
  assert.equal(result.snapshot.completeness,'complete');
  assert.equal(result.snapshot.mountPath,'/published/pilot-local/');
  assert.equal(result.snapshot.sitemapCompleteness,'complete');
  assert.deepEqual([...result.snapshot.sitemapPaths],['/','/about/']);
  assert.equal(result.publication.findings.length,0);
  assert.equal(result.localMedia.capturedResources,3);
  assert.equal(result.localMedia.criticalCount,0);
  assert.equal(result.localHead.findings.length,0);
   assert.equal(result.localNavigation.findings.length,0);
  assert.equal(result.localHead.pagesWithRecordedHeaders,2);
  assert.equal(result.localHead.publicOriginObservedInSitemap,'https://pilot.example');
  assert.equal(result.localMedia.resources[0].ogImageAsset,true);
  assert.equal(result.localMedia.resources[1].bodySha256,sha(responsive));
  assert.deepEqual([...result.localMedia.resources[2].renderedPageIds],['page-home','page-about']);
  assert.equal(result.localMedia.resources[2].ogImageAsset,false);
  assert.deepEqual([...result.publication.verifiedRedirectPaths],['/old/']);
  assert.deepEqual([...result.snapshot.redirectPaths],['/old/']);
  const audited=require('../lib/analyze.cjs').snapshotAudit(result.snapshot);
  assert.ok(!audited.issues.some(x=>x.code==='html:broken-link'),
   'published mount links are normalized, not mistaken for missing pages');
  assert.equal(result.snapshot.pages[1].path,'/about/');
  assert.match(result.snapshot.pages[0].html,/<title>Home<\/title>/);
  assert.equal(result.realPublicHttpsChecked,false);
  assert.equal(result.sourceRevisionAuthenticated,false);
  const first=path.join(out,'page-001.html'),bytes=fs.readFileSync(first);
  fs.appendFileSync(first,'TAMPERED');
  assert.throws(()=>CAP.read(out,site,source),/HTML size differs|HTML hash differs/);
  fs.writeFileSync(first,bytes);
  const manifest=path.join(out,'manifest.json'),original=fs.readFileSync(manifest);
  const edited=JSON.parse(original);edited.pages.reverse();
  fs.writeFileSync(manifest,JSON.stringify(edited));
  assert.throws(()=>CAP.read(out,site,source),/unexpected route/);
  fs.writeFileSync(manifest,original);
  const other=JSON.parse(original);other.sourceSiteSha256='f'.repeat(64);
  fs.writeFileSync(manifest,JSON.stringify(other));
  assert.throws(()=>CAP.read(out,site,source),/not bound/);
  fs.writeFileSync(manifest,original);
  fs.writeFileSync(path.join(out,'unexpected.txt'),'extra');
  assert.throws(()=>CAP.read(out,site,source),/unexpected or missing HTML evidence file/);
  fs.unlinkSync(path.join(out,'unexpected.txt'));
  assert.equal(CAP.read(out,site,source).pageCount,2);
  const sitemapFile=path.join(out,'sitemap.txt'),savedSitemap=fs.readFileSync(sitemapFile);
  fs.appendFileSync(sitemapFile,'bad');
  assert.throws(()=>CAP.read(out,site,source),/SEO endpoint response size mismatch|content digest mismatch/);
  fs.writeFileSync(sitemapFile,savedSitemap);
  const corruptRedirect=JSON.parse(original);
  corruptRedirect.publication.redirects[0].from='/wrong/';
  fs.writeFileSync(manifest,JSON.stringify(corruptRedirect));
  assert.throws(()=>CAP.read(out,site,source),/redirect path or Location mismatch/);
  fs.writeFileSync(manifest,original);
  mode='bad-301';
  const wrongRedirect=path.join(tmp,'bad-301');
  const badCapture=await CAP.capture(sealed,base,wrongRedirect);
  assert.equal(badCapture.localSeoFindings>0,true,'bad redirect has review findings');
  const badRead=CAP.read(wrongRedirect,site,source);
  assert.ok(badRead.publication.findings.some(x=>x.code==='php-local:redirect-status-drift'));
  assert.ok(badRead.publication.findings.some(x=>x.code==='php-local:redirect-location-drift'));
  assert.equal(badRead.snapshot.redirectPaths,undefined);
  const badAudit=require('../lib/analyze.cjs').snapshotAudit(badRead.snapshot);
  assert.ok(badAudit.issues.some(x=>x.code==='html:broken-link'),
   'unverified bad 301 cannot satisfy a complete HTML link to an old route');
  mode='normal';
  for(const [next,expected] of [['redirect',/HTTP 302/],['wrong-type',/Non-UTF-8 HTML/],
   ['oversize',/per-page byte limit|HTML exceeds/],['incomplete',/complete UTF-8 document/]]){
   mode=next;
   const destination=path.join(tmp,'failed-'+next);
   await assert.rejects(CAP.capture(sealed,base,destination),expected);
   assert.equal(fs.existsSync(destination),false,'no partial output for '+next);
  }
  mode='bad-sitemap';
  const badSitemap=path.join(tmp,'bad-sitemap');
  const sitemapRun=await CAP.capture(sealed,base,badSitemap);
  assert.ok(sitemapRun.localSeoFindings>0);
  assert.ok(CAP.read(badSitemap,site,source).publication.findings
   .some(x=>x.code==='php-local:sitemap-indexable-missing'));
  mode='no-public-origin';
  const noOrigin=path.join(tmp,'no-public-origin');
  const envRun=await CAP.capture(sealed,base,noOrigin);
  assert.equal(envRun.robotsStatus,503);assert.equal(envRun.sitemapStatus,503);
  assert.ok(CAP.read(noOrigin,site,source).publication.findings
   .some(x=>x.code==='php-local:sitemap-http-status'&&x.severity==='error'));
  assert.equal(CAP.read(noOrigin,site,source).snapshot.sitemapCompleteness,undefined,
   'HTTP 503 does not imply a complete sitemap');
  mode='dev-origin';
  const developer=path.join(tmp,'dev-origin');
  await CAP.capture(sealed,base,developer);
  const dev=CAP.read(developer,site,source);
  assert.equal(dev.localHead.developmentOnlyOrigin,true);
  assert.ok(dev.publication.findings.some(x=>x.code==='php-local:development-public-origin'));
  assert.ok(!dev.localHead.findings.some(x=>x.severity==='error'));
  assert.ok(!dev.localMedia.findings.some(x=>x.severity==='error'));
  mode='bad-canonical';
  const canonicalDrift=path.join(tmp,'canonical-drift');
  await CAP.capture(sealed,base,canonicalDrift);
  assert.ok(CAP.read(canonicalDrift,site,source).localHead.findings
   .some(x=>x.code==='php-head:canonical-origin-route-drift'&&x.severity==='error'));
  mode='bad-og-page';
  const socialPageDrift=path.join(tmp,'social-page-drift');
  await CAP.capture(sealed,base,socialPageDrift);
  assert.ok(CAP.read(socialPageDrift,site,source).localHead.findings
   .some(x=>x.code==='php-head:og-url-drift'&&x.severity==='error'));
  mode='bad-twitter-image';
  const twitterDrift=path.join(tmp,'twitter-drift');
  await CAP.capture(sealed,base,twitterDrift);
  assert.ok(CAP.read(twitterDrift,site,source).localHead.findings.some(x=>
   x.code==='php-head:social-drift'&&x.field==='twitter:image'&&x.severity==='error'));
  mode='bad-menu';
  const badMenu=path.join(tmp,'wrong-public-menu');
  await CAP.capture(sealed,base,badMenu);
  assert.ok(CAP.read(badMenu,site,source).localNavigation.findings.some(x=>
   x.code==='php-nav:menu-route-content-drift'&&x.severity==='error'));
  mode='bad-xrobots';
  const noindex=path.join(tmp,'xrobots-noindex');
  await CAP.capture(sealed,base,noindex);
  assert.ok(CAP.read(noindex,site,source).localHead.findings
   .some(x=>x.code==='php-head:x-robots-noindex-conflict'&&x.severity==='error'));
  mode='bad-og-url';
  const ogDrift=path.join(tmp,'og-url-drift');
  await CAP.capture(sealed,base,ogDrift);
  assert.ok(CAP.read(ogDrift,site,source).localMedia.findings
   .some(x=>x.code==='php-media:og-html-url-drift'&&x.severity==='error'));
  mode='bad-media-status';
  const badMediaPath=path.join(tmp,'missing-og');
  const badMediaCapture=await CAP.capture(sealed,base,badMediaPath);
  assert.ok(badMediaCapture.localMediaFindings>0);
  assert.ok(CAP.read(badMediaPath,site,source).localMedia.findings
   .some(x=>x.code==='php-media:non-200'&&x.severity==='error'));
  mode='bad-rendered-status';
  const missingRendered=path.join(tmp,'missing-rendered');
  await CAP.capture(sealed,base,missingRendered);
  assert.ok(CAP.read(missingRendered,site,source).localMedia.findings
   .some(x=>x.code==='php-media:non-200'&&x.assetId==='asset-secondary'&&x.severity==='error'));
  mode='bad-variant-bytes';
  const badVariant=path.join(tmp,'wrong-responsive-sha');
  await CAP.capture(sealed,base,badVariant);
  const wrong=CAP.read(badVariant,site,source).localMedia.findings;
  assert.ok(wrong.some(x=>x.code==='php-media:variant-sha-drift'&&x.severity==='error'));
  assert.ok(wrong.some(x=>x.code==='php-media:png-dimension-drift'&&x.severity==='error'));
  mode='bad-sealed-source';
  const swappedSource=path.join(tmp,'swapped-original');
  await CAP.capture(sealed,base,swappedSource);
  assert.ok(CAP.read(swappedSource,site,source).localMedia.findings.some(x=>
   x.code==='php-media:sealed-source-sha-drift'&&x.assetId==='asset-secondary'&&x.severity==='error'));
  mode='bad-media-etag';
  const wrongEtag=path.join(tmp,'wrong-etag');
  await CAP.capture(sealed,base,wrongEtag);
  assert.ok(CAP.read(wrongEtag,site,source).localMedia.findings
   .some(x=>x.code==='php-media:etag-sha-drift'&&x.severity==='error'));
  mode='bad-media-mime';
  const wrongMime=path.join(tmp,'wrong-mime');
  await CAP.capture(sealed,base,wrongMime);
  assert.ok(CAP.read(wrongMime,site,source).localMedia.findings
   .some(x=>x.code==='php-media:mime-mismatch'&&x.severity==='error'));
  mode='normal';
  const mediaFile=path.join(out,'asset-0001.bin'),savedImage=fs.readFileSync(mediaFile);
  fs.appendFileSync(mediaFile,'TAMPER');
  assert.throws(()=>CAP.read(out,site,source),/media evidence byte length mismatch|media evidence byte digest mismatch/);
  fs.writeFileSync(mediaFile,savedImage);
  await assert.rejects(CAP.capture(sealed,base,out),/new directory/);
  // New PHP DesignGraph uses CSS backgrounds, <picture><source> and video poster/source.
  mode='other-consumers';
  const artDir=path.join(tmp,'art-direction');
  await CAP.capture(sealed,base,artDir);
  const art=CAP.read(artDir,site,source).localMedia;
  assert.deepEqual([...art.resources[2].renderedPageIds],['page-home','page-about']);
  mode='other-consumers-bad';
  const brokenArt=path.join(tmp,'broken-art-direction');
  await CAP.capture(sealed,base,brokenArt);
  assert.ok(CAP.read(brokenArt,site,source).localMedia.findings.some(x=>
   x.code==='php-media:non-200'&&x.assetId==='asset-secondary'&&x.severity==='error'));
  mode='untracked-media';
  const alien=path.join(tmp,'untracked-art-direction');
  await CAP.capture(sealed,base,alien);
  assert.ok(CAP.read(alien,site,source).localMedia.findings.some(x=>
   x.code==='php-media:untracked-rendered-reference'&&x.severity==='error'));
  mode='bad-metadata';
  const wrongMeta=path.join(tmp,'stale-published-metadata');
  await CAP.capture(sealed,base,wrongMeta);
  assert.ok(CAP.read(wrongMeta,site,source).localHead.findings.some(x=>
   x.code==='php-head:metadata-drift'&&x.severity==='error'));
  mode='normal';
  console.log('PHP HTML LOOPBACK CAPTURE SMOKE PASS: actual HTML, robots, sitemap, 301, OG/media, responsive picture, CSS background, video poster, untracked media, SHA/MIME/ETag and tamper; no external requests.');
 }finally{
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(tmp,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
