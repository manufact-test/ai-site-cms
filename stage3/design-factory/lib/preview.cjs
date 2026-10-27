'use strict';
// Standalone D1 preview. Its enhanced layout is NOT part of current PHP renderer.
const fs=require('node:fs');
const path=require('node:path');
const {THEMES,COPY,serialize}=require('./compiler.cjs');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function slot(s,name,key='content.text'){
  const el=s.elements.find(e=>e.slot===name);
  return el&&typeof el.values[key]==='string'?el.values[key]:'';
}
function href(route,depth){
  const map={'/':'index.html','/services/':'services/index.html','/approach/':'approach/index.html','/contact/':'contact/index.html'};
  return (depth?'../':'')+(map[route]||'index.html');
}
function a(route,label,depth,klass='button'){
  return '<a class="'+klass+'" href="'+esc(href(route,depth))+'">'+esc(label)+'</a>';
}
function renderSection(s,depth,i,language,contactCopy=''){
  const ru=language==='ru';
  const name=s.component, id=esc(s.id),heading=slot(s,'heading');
  const head='<p class="eyebrow">SECTION '+String(i+1).padStart(2,'0')+'</p><h2>'+esc(heading)+'</h2>';
  if(name==='company-hero')
    return '<section id="'+id+'" class="section hero"><div class="hero-copy"><p class="eyebrow">DESIGN FACTORY / ORIGINAL LAYOUT</p><h1>'+esc(heading)+'</h1><p class="lede">'+esc(slot(s,'summary'))+'</p><div class="actions">'+a('/contact/',slot(s,'action'),depth)+a('/services/',ru?'Услуги →':'Explore services →',depth,'text-link')+'</div></div><div class="art" aria-hidden="true"><div class="art-caption">DF · '+String(i+1).padStart(2,'0')+'</div><div class="art-shape"></div><div class="art-circle"></div></div></section>';
  if(name==='feature-highlights')
    return '<section id="'+id+'" class="section features"><div class="section-heading">'+head+'</div><div class="features-grid"><article><span class="index">01 /</span><h3>'+esc(slot(s,'first'))+'</h3></article><article><span class="index">02 /</span><h3>'+esc(slot(s,'second'))+'</h3></article></div></section>';
  if(name==='service-grid')
    return '<section id="'+id+'" class="section services"><div class="section-heading">'+head+'</div><div class="service-grid">'+s.items.map((it,j)=>'<article class="service-card"><div class="card-top"><span>0'+(j+1)+'</span><span aria-hidden="true">↗</span></div><h3>'+esc(it.values['content.title'])+'</h3><p>'+esc(it.values['content.text'])+'</p>'+a('/contact/',ru?'Обсудить →':'Discuss →',depth,'text-link')+'</article>').join('')+'</div></section>';
  if(name==='media-story')
    return '<section id="'+id+'" class="section story"><div class="story-art" aria-label="Illustrative placeholder; no owner photo supplied"><span>'+(ru?'ИЗОБРАЖЕНИЕ / ПРИМЕР':'IMAGE / PLACEHOLDER')+'</span><div class="story-shape"></div></div><div class="story-text">'+head+'<p>'+esc(slot(s,'copy'))+'</p>'+a('/contact/',slot(s,'action'),depth,'text-link')+'</div></section>';
  if(name==='faq-accordion')
    return '<section id="'+id+'" class="section faq"><div>'+head+'</div><div class="faqs">'+s.items.map(it=>'<details><summary>'+esc(it.values['content.question'])+'</summary><p>'+esc(it.values['content.answer'])+'</p></details>').join('')+'</div></section>';
  if(name==='cta-banner')
    return '<section id="'+id+'" class="section cta"><div><p class="eyebrow">'+(ru?'ДАЛЬНЕЙШИЙ ШАГ':'NEXT STEP')+'</p><h2>'+esc(heading)+'</h2><p>'+esc(slot(s,'summary'))+'</p></div><div class="cta-actions">'+a('/contact/',slot(s,'primary'),depth)+a('/services/',slot(s,'secondary')+' →',depth,'text-link')+'</div></section>';
  if(name==='contact-panel')
    return '<section id="'+id+'" class="section contact">'+head+
      '<p class="contact-details">'+esc(contactCopy||(ru?'Укажите подтверждённые контакты перед публикацией.':'Add verified contact information before publication.'))+'</p></section>';
  if(name==='photo-gallery')
    return '<section id="'+id+'" class="section photo-gallery-preview"><div class="section-heading">'+head+'</div><div class="preview-photos">'+
      (s.items||[]).map((item,j)=>'<figure class="preview-photo"><div role="img" aria-label="'+esc(ru?'Фотография не предоставлена':'Photo not provided')+'">'+
        esc(ru?'ФОТОГРАФИЯ '+(j+1)+' / ТРЕБУЕТСЯ ФАЙЛ':'PHOTO '+(j+1)+' / OWNER FILE REQUIRED')+'</div><figcaption>'+esc(item.values['content.caption']||'')+'</figcaption></figure>').join('')+
      '</div></section>';
  throw Error('Unsupported preview component '+name);
}
function css(theme){
  const t=THEMES[theme];
  if(!t)throw Error('Invalid theme');
  const v=t.cms;
  const display={georgia:'Georgia,serif',arial:'Arial,Helvetica,sans-serif',system:'system-ui,Segoe UI,sans-serif'}[v.font];
  const radius={bordered:'9px',paper:'3px',floating:'27px'}[t.design.card];
  const displaySize=t.design.tracking==='wide'?'clamp(3.7rem,7.5vw,7.4rem)':t.design.tracking==='tight'?'clamp(3rem,6.4vw,6.5rem)':'clamp(3.25rem,6.8vw,6.8rem)';
  const base=[
    '/* Standalone CSS preview only: CMS parity integration_required */',
    ':root{--bg:'+v.background+';--surface:'+v.surface+';--text:'+v.text+';--accent:'+v.primary+';--radius:'+radius+';--wide:'+v.maxWidth+'px;--display:'+display+';--line:color-mix(in srgb,var(--text),transparent 82%)}',
    '*,*:before,*:after{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--text);background:var(--bg);font:16px/1.6 '+display+'}a{color:inherit}a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:4px}',
    '.skip{position:absolute;left:-9999px;background:var(--surface);padding:12px}.skip:focus{top:12px;left:12px;z-index:100}',
    '.notice{background:var(--text);color:var(--bg);text-transform:uppercase;text-align:center;font-size:11px;letter-spacing:.13em;padding:9px}',
    'header{border-bottom:1px solid var(--line);background:var(--bg)}.navwrap{max-width:var(--wide);padding:22px;margin:auto;display:flex;justify-content:space-between;align-items:center;gap:24px}',
    '.brand{font-size:20px;letter-spacing:-.05em;font-weight:850;text-decoration:none}.brand span{color:var(--accent)}nav{display:flex;gap:clamp(12px,3vw,36px);flex-wrap:wrap}nav a{display:inline-flex;align-items:center;min-height:44px;font-size:13px;text-decoration:none;font-weight:700;opacity:.75}nav a[aria-current]{opacity:1;border-bottom:2px solid var(--accent)}',
    '.section{max-width:var(--wide);margin:auto;padding:clamp(58px,8vw,120px) 22px;border-bottom:1px solid var(--line)}.section h2{font:500 clamp(2rem,4.5vw,4.3rem)/1.1 var(--display);letter-spacing:-.065em;margin:12px 0 26px}.eyebrow{font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}',
    '.hero{min-height:600px;display:grid;grid-template-columns:1.1fr .9fr;gap:5%;align-items:center}.hero h1{font:500 '+displaySize+'/.99 var(--display);letter-spacing:-.075em;overflow-wrap:anywhere;margin:18px 0 28px}.lede{font-size:clamp(17px,2vw,21px);max-width:560px;opacity:.8}',
    '.actions{display:flex;gap:25px;align-items:center;flex-wrap:wrap;margin-top:34px}.button{display:inline-block;background:var(--accent);color:white;text-decoration:none;font-size:14px;font-weight:800;padding:15px 25px;min-height:48px;border-radius:var(--radius)}.button:hover{filter:brightness(.92)} .text-link{display:inline-flex;align-items:center;min-height:44px;font-weight:750;font-size:13px;text-underline-offset:5px}',
    '.art{height:380px;background:var(--text);color:var(--bg);border-radius:var(--radius);overflow:hidden;position:relative;padding:24px}.art-caption{position:relative;z-index:2;font-size:12px;letter-spacing:.1em}.art-shape{position:absolute;left:28%;top:24%;height:85%;width:72%;background:var(--accent);transform:rotate(-19deg)}.art-circle{position:absolute;bottom:-65px;left:-65px;width:220px;height:220px;border:28px solid var(--bg);border-radius:50%}',
    '.section-heading{max-width:700px;margin-bottom:44px}.features-grid,.service-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.features-grid article,.service-card{background:var(--surface);padding:clamp(25px,4vw,54px);border:1px solid var(--line);border-radius:var(--radius)}.features-grid article{min-height:250px}.features-grid h3{font:500 clamp(1.5rem,2.5vw,2.6rem)/1.14 var(--display);letter-spacing:-.04em}.index{color:var(--accent);font-weight:900}',
    '.service-card{padding:32px}.card-top{display:flex;justify-content:space-between;font-size:12px;color:var(--accent);font-weight:900}.service-card h3{font:500 clamp(1.4rem,2.3vw,2.4rem)/1.13 var(--display);letter-spacing:-.035em;margin:34px 0 13px}.service-card p{opacity:.8}.story{display:grid;grid-template-columns:1fr 1fr;gap:7%;align-items:center}.story-art{height:390px;position:relative;overflow:hidden;background:var(--accent);color:white;padding:24px;border-radius:var(--radius)}.story-art span{position:relative;z-index:2;font-size:11px}.story-shape{position:absolute;right:-11%;bottom:-10%;width:75%;height:75%;border:55px solid var(--bg);transform:rotate(23deg);border-radius:35%}.story-text p{opacity:.8}',
    '.faq{display:grid;grid-template-columns:.8fr 1.2fr;gap:55px}.faqs details{padding:22px 0;border-bottom:1px solid var(--line)} .faqs summary{display:flex;align-items:center;min-height:44px;cursor:pointer;font-weight:800}.faqs p{opacity:.8}',
    '.cta{background:var(--text);color:var(--bg);display:flex;align-items:center;justify-content:space-between;gap:30px;padding:clamp(50px,7vw,85px);margin-top:55px;margin-bottom:55px;border-radius:var(--radius)}.cta .eyebrow{color:var(--bg);opacity:.7}.cta h2{max-width:600px}.cta-actions{display:flex;flex-direction:column;gap:20px;align-items:flex-start}.contact{text-align:center}.contact .contact-details{opacity:.83;white-space:pre-line;overflow-wrap:anywhere;max-width:750px;margin:0 auto}.footer{padding:60px 22px;background:var(--text);color:var(--bg)}.footer-inner{max-width:var(--wide);margin:auto;display:flex;flex-wrap:wrap;gap:25px;justify-content:space-between;font-size:13px}',
    '.preview-photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.preview-photo{margin:0}.preview-photo>div{background:var(--surface);border:1px dashed var(--line);min-height:250px;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-weight:750;font-size:11px;color:var(--accent)}.preview-photo figcaption{margin-top:7px;font-size:12px}',
    '@media(max-width:620px){.preview-photos{grid-template-columns:1fr}.preview-photo>div{min-height:190px}}',
    '@media(max-width:860px){.hero,.story,.faq{grid-template-columns:1fr}.hero{min-height:0}.art{height:280px}.story-art{height:300px}.cta{flex-direction:column;align-items:flex-start}}',
    '@media(max-width:600px){.navwrap{display:block}.navwrap nav{padding-top:17px;gap:14px}.section{padding:52px 19px}.hero h1{font-size:clamp(2.7rem,12vw,4.1rem)}.features-grid,.service-grid{grid-template-columns:1fr}.features-grid article{min-height:0}.art{height:230px}.cta{padding:40px 26px;margin:24px 8px}.story-art{height:240px}}',
    '@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{transition:none!important;animation:none!important}}',
  ].join('\n')+'\n';
  // All the tokens below come only from the closed, first-party theme catalog.
  const d=t.design;
  const grid={split:'1.1fr .9fr',centered:'1fr',stacked:'1fr',offset:'.82fr 1.18fr'}[d.layout];
  const art={frame:'rotate(-19deg)',grid:'rotate(0deg)',circle:'rotate(34deg)',stair:'skew(-12deg)',block:'rotate(0deg)',arch:'rotate(55deg)',wave:'skew(15deg)'}[d.art];
  const cards={
    paper:'background:var(--surface);border:1px solid var(--line);box-shadow:none',
    bordered:'background:transparent;border:2px solid var(--text);box-shadow:none',
    floating:'background:var(--surface);border:0;box-shadow:0 14px 45px color-mix(in srgb,var(--text),transparent 92%)'
  }[d.card];
  const extra=[
    '.hero{grid-template-columns:'+grid+'}',
    '.hero h1{letter-spacing:'+(d.tracking==='wide'?'-.085em':d.tracking==='tight'?'-.045em':'-.065em')+'}',
    '.art-shape{transform:'+art+'}',
    '.service-card,.features-grid article{'+cards+'}',
    '.section{padding-top:'+(d.density==='dense'?'63px':'110px')+';padding-bottom:'+(d.density==='dense'?'63px':'110px')+'}',
    d.layout==='centered'?'.hero{text-align:center;justify-items:center}.hero-copy{max-width:780px}.hero .actions{justify-content:center}.art{width:min(100%,740px)}':'',
    d.layout==='stacked'?'.hero{justify-items:stretch}.hero-copy{max-width:950px}.art{height:270px}':'',
    d.layout==='offset'?'.hero .hero-copy{order:2}.hero .art{order:1}':'',
    d.nav==='solid'?'nav a[aria-current]{background:var(--accent);color:white;padding:5px 9px;border:0;border-radius:var(--radius)}':'',
    d.art==='circle'?'.art-shape{border-radius:50%}.art-circle{border-width:55px}':'',
    d.art==='arch'?'.art-shape{border-radius:48% 48% 0 0}':'',
    d.art==='grid'?'.art{background:repeating-linear-gradient(0deg,var(--text) 0 35px,color-mix(in srgb,var(--text),white 15%) 36px 37px)}':'',
    d.art==='wave'?'.art-shape{border-radius:50% 15% 50% 18%}':'',
    '@media(max-width:860px){.hero{grid-template-columns:1fr}.hero .hero-copy,.hero .art{order:initial}.section{padding-top:65px;padding-bottom:65px}}',
    '@media(max-width:600px){.section{padding-top:52px;padding-bottom:52px}}'
  ].filter(Boolean).join('\n');
  return base+extra+'\n';
}
function pageHtml(site,page,theme,language){
  const depth=page.path==='/'?0:1;
  const ru=language==='ru';
  // Registered contact-page hero stores owner contact facts, so no CMS schema extension is needed.
  const contactHero=page.path==='/contact/'?page.sections.find(s=>s.component==='company-hero'):null;
  const suppliedContact=contactHero?slot(contactHero,'summary'):'';
  const contactCopy=suppliedContact&&suppliedContact!==COPY[language].summary?suppliedContact:'';
  const nav=site.pages.map(p=>'<a href="'+esc(href(p.path,depth))+'"'+(p.path===page.path?' aria-current="page"':'')+'>'+esc(p.navigation.label)+'</a>').join('');
  return '<!doctype html><html lang="'+esc(language)+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'+
    '<title>'+esc(page.seo.title)+'</title><meta name="description" content="'+esc(page.seo.description)+'"><link rel="stylesheet" href="'+(depth?'../':'')+'assets/preview.css"></head><body>'+
    '<a class="skip" href="#content">'+(ru?'Перейти к содержимому':'Skip to content')+'</a><div class="notice">'+(ru?'Design Factory · предпросмотр, не опубликованный сайт CMS':'Design Factory standalone preview · not published CMS HTML')+'</div>'+
    '<header><div class="navwrap"><a class="brand" href="'+esc(href('/',depth))+'"><span>◆ </span>'+esc(site.title)+'</a><nav aria-label="'+(ru?'Навигация':'Site navigation')+'">'+nav+'</nav></div></header>'+
    '<main id="content">'+page.sections.map((s,i)=>renderSection(s,depth,i,language,contactCopy)).join('\n')+'</main><footer class="footer"><div class="footer-inner"><b>'+esc(site.title)+'</b><span>'+(ru?'Дизайн-предпросмотр · проверьте сведения перед публикацией':'Design preview — verify details before publishing')+'</span></div></footer></body></html>\n';
}
function writePreview(compiled,directory){
  const out=path.resolve(directory),parent=path.dirname(out);
  if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory())throw Error('Output parent must exist');
  if(fs.existsSync(out))throw Error('Refusing to overwrite existing directory');
  if(!compiled||!compiled.site||!compiled.project)throw Error('Missing compiled site');
  fs.mkdirSync(out);
  try{
    const records=[['site-v1.json',compiled.site],['design-spec.json',compiled.designSpec],['project.json',compiled.project],['owner-checklist.json',compiled.checklist],['inspection.json',compiled.inspection]];
    for(const [file,obj] of records)fs.writeFileSync(path.join(out,file),serialize(obj),{flag:'wx'});
    fs.mkdirSync(path.join(out,'assets'));
    fs.writeFileSync(path.join(out,'assets/preview.css'),css(compiled.project.theme),{flag:'wx'});
    for(const page of compiled.site.pages){
      const rel=page.path==='/'?'index.html':page.path.slice(1)+'index.html';
      if(!/^(?:[a-z0-9-]+\/)*index\.html$/.test(rel))throw Error('Unsafe output route');
      const file=path.join(out,rel);
      if(rel!=='index.html')fs.mkdirSync(path.dirname(file),{recursive:true});
      fs.writeFileSync(file,pageHtml(compiled.site,page,compiled.project.theme,compiled.project.language),{flag:'wx'});
    }
    return {directory:out,pages:compiled.site.pages.length};
  }catch(e){fs.rmSync(out,{recursive:true,force:true});throw e;}
}
module.exports=Object.freeze({esc,css,pageHtml,writePreview});
