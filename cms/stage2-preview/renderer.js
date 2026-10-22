'use strict';
/**
 * Read-only HTML preview. Iframe sandbox has no scripts, networking or forms.
 * All editable values are HTML escaped; colors selected only from static palette.
 */
(() => {
  const C=window.CmsPreviewContent;
  const e=value=>String(value).replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const css=[
    '*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font:400 16px/1.6 var(--font-family);color:var(--deep);background:#fff}',
    'h1,h2,h3,p{margin:0}h1,h2{letter-spacing:-.055em;line-height:1.08}h1{font-size:clamp(2.7rem,6vw,5.8rem)}h2{font-size:clamp(2.2rem,4vw,4rem)}h3{font-size:1.15rem;letter-spacing:-.02em}p{color:#536274}',
    '.wrap{max-width:1180px;padding:0 32px;margin:0 auto}.top{border-bottom:1px solid #e5eaf1}.nav{min-height:88px;display:flex;align-items:center;justify-content:space-between;gap:20px}.mark{font-weight:850;letter-spacing:-.05em;font-size:1.25rem}.mark span{color:var(--accent)}.site-brand-note{display:block;color:#8993a2;font-size:11px;font-weight:400;letter-spacing:0;line-height:1.4}.nav small{color:#8993a2}.tag{display:inline-block;color:var(--accent);font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:22px}',
    '.preview-selected{position:relative;outline:4px solid var(--accent);outline-offset:-4px}.preview-selected:before{content:"ВЫБРАННЫЙ БЛОК";position:absolute;top:10px;right:10px;z-index:2;background:var(--accent);color:white;border-radius:5px;padding:4px 7px;font:800 9px system-ui;letter-spacing:.05em}.section{padding:100px 0}.soft{background:var(--pale)}.hero{padding:112px 0 110px;background:linear-gradient(125deg,#fff 5%,var(--pale) 100%)}.hero-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.65fr);gap:6vw;align-items:center}.hero p{max-width:670px;font-size:20px;margin:26px 0 36px}.btn{display:inline-flex;background:var(--accent);color:#fff;text-decoration:none;padding:15px 25px;border-radius:12px;font-weight:750;box-shadow:0 14px 40px #11182714}.visual{min-height:330px;border-radius:32px;background:var(--deep);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:35px;overflow:hidden;position:relative;box-shadow:0 25px 65px #152a4130}.visual:after{content:"";position:absolute;width:250px;height:250px;border:70px solid var(--accent);border-radius:100%;opacity:.38;bottom:-140px;right:-110px}.visual small{opacity:.55;letter-spacing:.12em}.visual strong{font-size:clamp(1.8rem,3vw,2.9rem);letter-spacing:-.055em;line-height:1.14;max-width:240px;z-index:1}',
    '.menu{display:flex;gap:15px;flex-wrap:wrap;align-items:center;justify-content:flex-end}.menu span{font-size:12px;color:#788699;font-weight:650}.menu span.current{color:var(--accent);border-bottom:2px solid var(--accent)}.menu button{border:0;background:transparent;font:inherit;font-size:12px;color:#738294;font-weight:650;cursor:pointer;padding:5px}.menu button.current{color:var(--accent);border-bottom:2px solid var(--accent)}.cms-design-preview section[data-preview-section]:hover{outline:2px dashed var(--accent);outline-offset:-2px;cursor:pointer}.cms-design-preview section[data-preview-section]:focus-visible{outline:3px solid var(--accent)}.menu a{font-size:12px;color:#64748b;text-decoration:none;font-weight:650}.menu a.current{color:var(--accent);border-bottom:2px solid var(--accent)}.heading{margin-bottom:45px;max-width:740px}.heading h2{margin-bottom:16px}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.card{border:1px solid #e0e7ed;padding:32px;border-radius:22px;background:white;min-height:210px}.num{display:block;color:var(--accent);font-weight:800;font-size:13px;margin-bottom:30px}.card p{margin-top:12px}',
    '.story{display:grid;grid-template-columns:1.6fr .7fr;gap:7vw;align-items:center}.story p{font-size:19px;margin-top:22px;max-width:660px}.metric{background:var(--deep);border-radius:25px;color:#fff;padding:45px}.metric strong{display:block;font-size:clamp(2rem,4vw,3.5rem);letter-spacing:-.06em}.metric p{color:#aeb9c8;margin-top:12px;font-size:14px}',
    '.quote{border-left:6px solid var(--accent);padding:10px 0 10px 40px}.quote p{font-size:clamp(1.7rem,3vw,3rem);line-height:1.35;color:var(--deep);font-weight:650;letter-spacing:-.035em}.quote footer{margin-top:26px;font-weight:700}.quote footer span{display:block;color:#8794a5;font-weight:400}',
    '.faq{display:grid;grid-template-columns:.75fr 1.4fr;gap:4vw}.faq details{border-bottom:1px solid #dce2ea;padding:22px 0}.faq summary{cursor:pointer;font-weight:700;font-size:18px;list-style:none}.faq summary:after{content:"+";color:var(--accent);float:right;font-size:24px;line-height:1}.faq details[open] summary:after{content:"−"}.faq details p{margin-top:15px;max-width:700px}',
    '.contact{background:var(--deep);color:white;padding:95px 0}.contact .tag{color:#8ab4ff}.contact h2{max-width:800px}.contact p{color:#bac6d7;max-width:660px;margin:20px 0 35px;font-size:19px}.foot{background:#0d1728;color:#8290a3;padding:23px 0;font-size:13px}.foot .wrap{display:flex;justify-content:space-between;gap:20px}',
    '@media(max-width:800px){.wrap{padding:0 24px}.section{padding:76px 0}.hero{padding:80px 0}.hero-grid,.story,.faq{grid-template-columns:1fr}.hero-grid{gap:42px}.visual{min-height:240px}.cards{grid-template-columns:1fr}.card{min-height:0}.quote{padding-left:22px}.contact{padding:75px 0}}',
    '@media(max-width:480px){.wrap{padding:0 18px}.nav{min-height:66px}.nav small{display:none}.hero{padding:58px 0}.hero p{font-size:17px}.visual{padding:25px}.section{padding:60px 0}.heading{margin-bottom:28px}.card{padding:25px}.contact{padding:62px 0}.foot .wrap{flex-direction:column}}',
    '.contact-points{display:flex;align-items:center;flex-wrap:wrap;gap:12px 24px;margin-top:30px}.contact-points a,.contact-points span{color:inherit;text-decoration:none;font-weight:650;overflow-wrap:anywhere}.contact-points a:hover{text-decoration:underline}.contact-points .address{font-size:14px;max-width:100%;white-space:pre-wrap}.contact .contact-points{color:#f0f5ff}.foot .contact-points{margin:0}.foot .contact-points a{color:#bdcadb}.footer-inner{align-items:center;flex-wrap:wrap}.nav .header-contact{font-size:13px;font-weight:750;color:var(--accent);text-decoration:none;white-space:nowrap}.header-contact:hover{text-decoration:underline}.btn.no-action{background:#a5b4c4;color:#253850;box-shadow:none;cursor:default}.btn[type=button]{border:0;font:inherit;cursor:pointer}.studio-note .contact-points{margin:8px 0;color:var(--deep)}.section .contact-points{margin:18px 0}.nav .header-contact:focus-visible,.contact-points a:focus-visible,.btn:focus-visible{outline:3px solid var(--accent);outline-offset:3px}@media(max-width:800px){.header-contact{display:none}.contact-points{gap:8px 16px}}',
    '.site-bordered .nav{border-inline:1px solid #dde4ea}.site-floating .nav{min-height:70px;margin:16px auto;border:1px solid #e2e8f0;border-radius:var(--card-radius);box-shadow:0 12px 36px #14263a12;padding:0 24px;max-width:1110px}.site-floating.top{border-bottom:0}',
    '.surface-soft{background:var(--pale)!important}.surface-dark{background:var(--deep)!important;color:white}.surface-dark h1,.surface-dark h2,.surface-dark h3,.surface-dark strong,.surface-dark .tag{color:#fff}.surface-dark p,.surface-dark .card p,.surface-dark .studio-card p{color:#d6e2f0}.surface-dark .card,.surface-dark .studio-card{background:#ffffff12;border-color:#ffffff28;color:#fff}.surface-dark .metric,.surface-dark .studio-stat{background:#ffffff16}.surface-dark .quote p,.surface-dark .quote footer{color:#fff}.surface-accent{background:linear-gradient(120deg,var(--deep),#243852)!important;color:#fff;border-top:6px solid var(--accent)}.surface-accent h1,.surface-accent h2,.surface-accent h3,.surface-accent strong,.surface-accent .tag{color:#fff}.surface-accent p,.surface-accent .card p,.surface-accent .studio-card p{color:#d6e2f0}.surface-accent .card,.surface-accent .studio-card{background:#ffffff13;border-color:#ffffff24;color:#fff}.surface-soft.contact{color:var(--deep)}.surface-soft.contact h2{color:var(--deep)}.surface-soft.contact p{color:#536274}.surface-dark .studio-visual,.surface-accent .studio-visual{background:#ffffff15;color:#fff}',
    '.section{padding-block:var(--section-space)}.hero{padding-block:calc(var(--section-space) + 12px)}.contact{padding-block:var(--section-space)}.card,.visual,.metric,.studio-card,.studio-stat,.studio-product,.studio-placeholder,.btn{border-radius:var(--card-radius)}.studio-product .studio-visual{border-radius:var(--card-radius) var(--card-radius) 0 0}',
    '.visual.has-photo:after{display:none}.visual.has-photo{background:#0b1621}.hero-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.64}.visual.has-photo small,.visual.has-photo strong{position:relative;z-index:1;color:white}.story-photo{position:relative;margin:0;border-radius:var(--card-radius);overflow:hidden;min-height:360px;background:var(--deep)}.story-photo img{display:block;width:100%;height:360px;object-fit:cover}.story-photo figcaption{position:absolute;bottom:0;left:0;right:0;padding:22px;background:linear-gradient(transparent,#08121bcf);color:#fff;font-size:14px}.studio-visual.has-photo{height:200px;opacity:1;overflow:hidden}.studio-visual img{display:block;width:100%;height:100%;object-fit:cover}.studio-card img{display:block;width:calc(100% + 58px);height:150px;object-fit:cover;margin:-29px -29px 20px;border-radius:var(--card-radius) var(--card-radius) 0 0}.surface-dark .story-photo,.surface-accent .story-photo{box-shadow:0 18px 60px #0003}@media(max-width:800px){.story-photo{min-height:240px}.story-photo img{height:260px}}',
    '.site-brand:is(button){border:0;padding:0;background:transparent;cursor:pointer;font:inherit;text-align:left}.site-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--deep);min-width:0;max-width:42%;flex:none}.site-brand .mark{display:block;overflow-wrap:anywhere}.site-brand .site-logo{width:auto;max-width:92px;height:42px;object-fit:contain;flex:none}.site-brand:hover .mark{color:var(--accent)}.site-brand:focus-visible{outline:3px solid var(--accent);outline-offset:4px}.mobile-nav{display:none;position:relative;flex:none}.mobile-nav>summary{cursor:pointer;padding:9px 14px;border:1px solid #d6e0e9;border-radius:var(--card-radius);font-size:14px;font-weight:700;list-style:none;user-select:none}.mobile-nav>summary::-webkit-details-marker{display:none}.mobile-nav>summary:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.mobile-nav-menu{position:absolute;z-index:20;right:0;top:calc(100% + 10px);width:min(280px,calc(100vw - 36px));padding:12px;background:#fff;border:1px solid #d9e1e9;border-radius:var(--card-radius);box-shadow:0 20px 60px #11243b35;display:flex;flex-direction:column;gap:4px}.mobile-nav-menu a,.mobile-nav-menu button{color:#263f56;display:block;width:100%;text-align:left;text-decoration:none;padding:11px 12px;border:0;background:none;border-radius:8px;font:650 14px var(--font-family);cursor:pointer}.mobile-nav-menu .current,.mobile-nav-menu a:hover,.mobile-nav-menu button:hover{background:var(--pale);color:var(--accent)}.mobile-nav-menu a:focus-visible,.mobile-nav-menu button:focus-visible{outline:2px solid var(--accent)}.footer-pages{display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center}.footer-pages a,.footer-pages button{color:#c1cedc;background:none;border:0;padding:0;font:600 12px var(--font-family);text-decoration:none;cursor:pointer}.footer-pages a:hover,.footer-pages button:hover{text-decoration:underline;color:white}.footer-pages a:focus-visible,.footer-pages button:focus-visible{outline:2px solid var(--accent);outline-offset:4px}.foot .footer-inner{gap:16px 30px}.nav .menu-desktop{margin-left:auto}.site-logo{display:block}@media(max-width:800px){.nav .menu-desktop{display:none}.mobile-nav{display:block;margin-left:auto}.site-brand{max-width:calc(100% - 100px)}.site-brand .site-logo{max-width:70px;height:36px}.nav .header-contact{display:none}}@media(max-width:480px){.site-brand .mark{font-size:15px}.site-brand .site-logo{max-width:54px;height:28px}.site-brand .site-brand-note{display:none}.foot .footer-inner{align-items:flex-start}}',
    '.studio-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.studio-card{border-radius:18px;padding:29px;background:white;border:1px solid #e0e8f1;min-height:195px}.studio-card strong{display:block;font-size:20px;line-height:1.2;margin-bottom:12px}.studio-card p{font-size:14px}.studio-index{display:block;color:var(--accent);font-weight:800;font-size:12px;margin-bottom:28px}.studio-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.studio-stat{padding:32px;border-radius:18px;background:var(--deep);color:white}.studio-stat strong{display:block;font-size:clamp(2rem,4vw,3.8rem);letter-spacing:-.05em}.studio-stat p{color:#b3c4d5}.studio-product{overflow:hidden;border-radius:19px;background:#fff;border:1px solid #e0e8f1}.studio-visual{height:140px;background:linear-gradient(135deg,var(--pale),#fff);display:grid;place-items:center;font-size:60px;color:var(--accent);opacity:.7}.studio-product .studio-copy{padding:24px}.studio-form{display:grid;grid-template-columns:1fr 1fr;gap:18px;max-width:820px}.studio-form label{display:grid;gap:7px;color:#5b6c82;font-size:14px;font-weight:650}.studio-form input{padding:13px;border:1px solid #dce4ef;border-radius:9px;background:#f4f7fa;color:#95a2b1}.studio-note{font-size:12px;margin-top:12px;color:#995a35}.studio-placeholder{display:inline-block;margin-top:18px;padding:12px 24px;background:#cbd5df;color:#42576b;font-weight:700;border-radius:9px}@media(max-width:800px){.studio-grid,.studio-stats{grid-template-columns:1fr}.studio-form{grid-template-columns:1fr}}',
  ].join('\n');
  const telephone=c=>c.phone.replace(/[^+0-9]/g,'');
  function textLink(value,href,exportLinks,cls=''){
    return exportLinks?'<a'+(cls?' class="'+cls+'"':'')+' href="'+e(href)+'">'+e(value)+'</a>':
      '<span'+(cls?' class="'+cls+'"':'')+'>'+e(value)+'</span>';
  }
  function contactPoints(c,exportLinks,includeAddress=true){
    const parts=[];
    if(c.email)parts.push(textLink(c.email,'mailto:'+c.email,exportLinks));
    if(c.phone)parts.push(textLink(c.phone,'tel:'+telephone(c),exportLinks));
    if(includeAddress&&c.address)parts.push('<span class="address">'+e(c.address)+'</span>');
    return parts.length?'<div class="contact-points">'+parts.join('')+'</div>':'';
  }
  function actionButton(label,target,exportLinks){
    const value=e(label);
    if(!target)return '<span class="btn no-action" aria-disabled="true">'+value+'</span>';
    if(exportLinks)return '<a class="btn" href="'+e(target.href)+'">'+value+' &rarr;</a>';
    if(target.pageId)return '<button type="button" class="btn" data-preview-page="'+e(target.pageId)+'">'+value+' &rarr;</button>';
    if(target.type==='anchor')return '<a class="btn" href="'+e(target.href)+'">'+value+' &rarr;</a>';
    return '<span class="btn" aria-label="Контактная ссылка доступна в HTML-экспорте">'+value+' &rarr;</span>';
  }
  function block(section,media={},extra={}){
    const p=section.props,c=extra.contacts||{email:'',phone:'',address:''};
    const photo=(slot,cssClass='')=>media[slot]?
      '<img src="'+e(media[slot].src)+'" alt="'+e(media[slot].alt)+'" class="'+e(cssClass)+'" loading="lazy" decoding="async">':'';
    const legacy=(title,text,count)=>Array.from({length:count},(_,i)=>({
      title:p[title+(i+1)]||'',text:p[text+(i+1)]||'',photo:media['image'+(i+1)]||null
    }));
    const items=(title,text,count)=>Array.isArray(extra.items)?extra.items:legacy(title,text,count);
    const itemImage=item=>item.photo?
      '<img src="'+e(item.photo.src)+'" alt="'+e(item.photo.alt)+'" loading="lazy" decoding="async">':'';

    switch(section.type){
      case 'hero':return '<section class="hero" id="start"><div class="wrap hero-grid"><div><span class="tag">'+e(p.eyebrow)+'</span><h1>'+e(p.title)+'</h1><p>'+e(p.description)+'</p>'+actionButton(p.action,extra.action,extra.exportLinks)+'</div><aside class="visual'+(media.hero?' has-photo':'')+'">'+photo('hero','hero-photo')+'<small>01 / ДЕМО ПРОЕКТ</small><strong>'+e(p.highlight)+'</strong></aside></div></section>';
      case 'features':return '<section class="section"><div class="wrap"><div class="heading"><span class="tag">'+e(p.eyebrow)+'</span><h2>'+e(p.title)+'</h2></div><div class="cards">'+items('item','text',3).map((item,i)=>'<article class="card"><span class="num">'+String(i+1).padStart(2,'0')+'</span><h3>'+e(item.title)+'</h3><p>'+e(item.text)+'</p></article>').join('')+'</div></div></section>';
      case 'story':return '<section class="section soft"><div class="wrap story"><div><span class="tag">'+e(p.eyebrow)+'</span><h2>'+e(p.title)+'</h2><p>'+e(p.paragraph)+'</p></div><aside class="'+(media.photo?'story-photo':'metric')+'">'+(media.photo?photo('photo')+'<figcaption>'+e(p.stat)+' · '+e(p.statLabel)+'</figcaption>':'<strong>'+e(p.stat)+'</strong><p>'+e(p.statLabel)+'</p>')+'</aside></div></section>';
      case 'quote':return '<section class="section"><div class="wrap quote"><p>«'+e(p.quote)+'»</p><footer>'+e(p.person)+'<span>'+e(p.position)+'</span></footer></div></section>';
      case 'faq':return '<section class="section soft"><div class="wrap faq"><h2>'+e(p.title)+'</h2><div>'+items('question','answer',2).map(item=>'<details><summary>'+e(item.title)+'</summary><p>'+e(item.text)+'</p></details>').join('')+'</div></div></section>';
      case 'contact':return '<section class="contact" id="contact"><div class="wrap"><span class="tag">'+e(p.eyebrow)+'</span><h2>'+e(p.title)+'</h2><p>'+e(p.description)+'</p>'+actionButton(p.action,extra.action,extra.exportLinks)+contactPoints(c,extra.exportLinks)+'</div></section>';
      case 'services':return '<section class="section soft"><div class="wrap"><div class="heading"><span class="tag">'+e(p.eyebrow)+'</span><h2>'+e(p.title)+'</h2></div><div class="studio-grid">'+items('item','text',3).map((item,i)=>'<article class="studio-card">'+itemImage(item)+'<span class="studio-index">'+String(i+1).padStart(2,'0')+'</span><strong>'+e(item.title)+'</strong><p>'+e(item.text)+'</p></article>').join('')+'</div></div></section>';
      case 'metrics':return '<section class="section"><div class="wrap"><div class="heading"><span class="tag">'+e(p.eyebrow)+'</span><h2>'+e(p.title)+'</h2></div><div class="studio-stats">'+items('number','label',3).map(item=>'<div class="studio-stat"><strong>'+e(item.title)+'</strong><p>'+e(item.text)+'</p></div>').join('')+'</div></div></section>';
      case 'process':return '<section class="section"><div class="wrap"><div class="heading"><span class="tag">'+e(p.eyebrow)+'</span><h2>'+e(p.title)+'</h2></div><div class="studio-grid">'+items('step','desc',3).map((item,i)=>'<div class="studio-card"><span class="studio-index">ШАГ '+String(i+1).padStart(2,'0')+'</span><strong>'+e(item.title)+'</strong><p>'+e(item.text)+'</p></div>').join('')+'</div></div></section>';
      case 'catalog':return '<section class="section soft"><div class="wrap"><div class="heading"><span class="tag">'+e(p.eyebrow)+'</span><h2>'+e(p.title)+'</h2></div><div class="studio-grid">'+items('product','info',3).map((item,i)=>'<article class="studio-product"><div class="studio-visual'+(item.photo?' has-photo':'')+'">'+(item.photo?itemImage(item):String(i+1).padStart(2,'0'))+'</div><div class="studio-copy"><h3>'+e(item.title)+'</h3><p>'+e(item.text)+'</p></div></article>').join('')+'</div></div></section>';
      case 'leadform':return '<section class="section" id="request"><div class="wrap"><div class="heading"><span class="tag">'+e(p.eyebrow)+'</span><h2>'+e(p.title)+'</h2><p>'+e(p.description)+'</p></div><div class="studio-form"><label>'+e(p.nameLabel)+'<input type="text" placeholder="Демо — ввод отключён" disabled></label><label>'+e(p.contactLabel)+'<input type="text" placeholder="Демо — ввод отключён" disabled></label></div><span class="studio-placeholder">'+e(p.button)+' · Демо</span><p class="studio-note">Поля отключены. Данные не собираются и не отправляются.</p>'+contactPoints(c,extra.exportLinks,false)+'</div></section>';
      default:throw Error('Unknown preview section');
    }
  }
  function navigationItems(pages,active,exportLinks){
    return (pages||[]).map(pg=>{
      const cls=pg.id===active?' class="current" aria-current="page"':'';
      return exportLinks?
        '<a href="'+e((pg.slug||'index')+'.html')+'"'+cls+'>'+e(pg.title)+'</a>':
        '<button type="button" data-preview-page="'+e(pg.id)+'"'+cls+'>'+e(pg.title)+'</button>';
    }).join('');
  }
  function brandHTML(doc,metadata){
    const img=metadata.brand?'<img class="site-logo" src="'+e(metadata.brand.src)+'" alt="" aria-hidden="true">':'';
    const text='<span class="mark">'+e(doc.siteTitle)+'<span>.</span>'+
      (metadata.headerNote?'<small class="site-brand-note">'+e(metadata.headerNote)+'</small>':'')+'</span>';
    return metadata.exportLinks?
      '<a class="site-brand" href="index.html" aria-label="Главная — '+e(doc.siteTitle)+'">'+img+text+'</a>':
      '<button class="site-brand" type="button" data-preview-page="'+e(metadata.homePageId||metadata.active)+'" aria-label="Главная — '+e(doc.siteTitle)+'">'+img+text+'</button>';
  }
  function render(input, selectedId, focusOnly=false, metadata={}) {
    const doc=C.validate(input),colors=C.palette[doc.theme];
    const design=metadata.design||{};
    const accents=typeof design.accent==='string'&&/^#[0-9a-f]{6}$/.test(design.accent)?design.accent:colors.accent;
    const fonts={system:'system-ui,-apple-system,Segoe UI,sans-serif',geometric:'Arial,Helvetica,sans-serif',editorial:'Georgia,Times New Roman,serif'};
    const corners={sharp:'4px',soft:'16px',round:'32px'};
    const spaces={compact:'64px',comfortable:'92px',relaxed:'124px'};
    const nav=['standard','bordered','floating'].includes(design.navigation)?design.navigation:'standard';
    const style='--accent:'+accents+';--deep:'+colors.deep+';--pale:'+colors.pale+';'+
      '--font-family:'+(fonts[design.font]||fonts.system)+';'+
      '--card-radius:'+(corners[design.radius]||corners.soft)+';'+
      '--section-space:'+(spaces[design.spacing]||spaces.comfortable)+';';

    const contacts=metadata.contacts||{email:'',phone:'',address:''};
    const publicUrl=metadata.exportLinks&&metadata.canonical?metadata.canonical:'';
    const footer=metadata.footerPages||[];
    const desktopNav=metadata.showNavigation===false?'':'<nav class="menu menu-desktop" aria-label="Меню сайта">'+
      navigationItems(metadata.menu,metadata.active,metadata.exportLinks)+'</nav>';
    const mobileNav=metadata.showNavigation===false?'':'<details class="mobile-nav"><summary aria-label="Открыть меню сайта">☰ Меню</summary>'+
      '<nav class="mobile-nav-menu" aria-label="Мобильное меню">'+navigationItems(metadata.menu,metadata.active,metadata.exportLinks)+'</nav></details>';
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8">'+
      '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; img-src &#39;self&#39; data: file:; script-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;">'+
      '<meta name="viewport" content="width=device-width, initial-scale=1">'+
      '<title>'+e(metadata.seoTitle||doc.siteTitle)+'</title><meta name="description" content="'+e(metadata.seoDescription||'')+'">'+
      '<meta property="og:type" content="website"><meta property="og:title" content="'+e(metadata.seoTitle||doc.siteTitle)+'">'+
      '<meta property="og:description" content="'+e(metadata.seoDescription||'')+'"><meta name="twitter:card" content="summary">'+
      (publicUrl?'<link rel="canonical" href="'+e(publicUrl)+'"><meta property="og:url" content="'+e(publicUrl)+'">':'')+
      '<meta name="robots" content="'+(publicUrl?'index,follow':'noindex,nofollow')+'">'+
      '<style>'+css+'</style></head>'+
      '<body class="'+(metadata.exportLinks?'':'cms-design-preview')+'" style="'+style+'"><header class="top site-'+nav+'"><div class="wrap nav">'+
      brandHTML(doc,metadata)+desktopNav+mobileNav+
      (contacts.phone?textLink(contacts.phone,'tel:'+telephone(contacts),metadata.exportLinks,'header-contact'):
        contacts.email?textLink(contacts.email,'mailto:'+contacts.email,metadata.exportLinks,'header-contact'):'')+'</div></header>'+
      '<main>'+doc.sections.filter(s=>(!metadata.hiddenSections?.includes(s.id)||(focusOnly&&s.id===selectedId))&&(!focusOnly||s.id===selectedId)).map(s=>{const surface=['soft','dark','accent'].includes(metadata.sectionStyles?.[s.id])?metadata.sectionStyles[s.id]:'';const html=block(s,metadata.mediaBySection?.[s.id],{
        contacts,exportLinks:metadata.exportLinks,action:metadata.actions?.[s.id],
        items:metadata.itemsBySection?.[s.id]
      }).replace('<section class="','<section data-preview-section="'+e(s.id)+'" class="'+(surface?'surface-'+surface+' ':'') );return s.id===selectedId?html.replace('class="','class="preview-selected '):html;}).join('')+'</main><footer class="foot"><div class="wrap footer-inner"><span>'+e(metadata.footerNote===undefined?'© Демо AI Site CMS':metadata.footerNote)+'</span>'+
      (footer.length?'<nav class="footer-pages" aria-label="Дополнительные страницы">'+navigationItems(footer,metadata.active,metadata.exportLinks)+'</nav>':'')+
      contactPoints(contacts,metadata.exportLinks)+'</div></footer></body></html>';
  }
  Object.defineProperty(window,'CmsPreviewRender',{value:Object.freeze({render})});
})();
