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
    '*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font:400 16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;color:var(--deep);background:#fff}',
    'h1,h2,h3,p{margin:0}h1,h2{letter-spacing:-.055em;line-height:1.08}h1{font-size:clamp(2.7rem,6vw,5.8rem)}h2{font-size:clamp(2.2rem,4vw,4rem)}h3{font-size:1.15rem;letter-spacing:-.02em}p{color:#536274}',
    '.wrap{max-width:1180px;padding:0 32px;margin:0 auto}.top{border-bottom:1px solid #e5eaf1}.nav{min-height:88px;display:flex;align-items:center;justify-content:space-between;gap:20px}.mark{font-weight:850;letter-spacing:-.05em;font-size:1.25rem}.mark span{color:var(--accent)}.nav small{color:#8993a2}.tag{display:inline-block;color:var(--accent);font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:22px}',
    '.preview-selected{position:relative;outline:4px solid var(--accent);outline-offset:-4px}.preview-selected:before{content:"ВЫБРАННЫЙ БЛОК";position:absolute;top:10px;right:10px;z-index:2;background:var(--accent);color:white;border-radius:5px;padding:4px 7px;font:800 9px system-ui;letter-spacing:.05em}.section{padding:100px 0}.soft{background:var(--pale)}.hero{padding:112px 0 110px;background:linear-gradient(125deg,#fff 5%,var(--pale) 100%)}.hero-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.65fr);gap:6vw;align-items:center}.hero p{max-width:670px;font-size:20px;margin:26px 0 36px}.btn{display:inline-flex;background:var(--accent);color:#fff;text-decoration:none;padding:15px 25px;border-radius:12px;font-weight:750;box-shadow:0 14px 40px #11182714}.visual{min-height:330px;border-radius:32px;background:var(--deep);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:35px;overflow:hidden;position:relative;box-shadow:0 25px 65px #152a4130}.visual:after{content:"";position:absolute;width:250px;height:250px;border:70px solid var(--accent);border-radius:100%;opacity:.38;bottom:-140px;right:-110px}.visual small{opacity:.55;letter-spacing:.12em}.visual strong{font-size:clamp(1.8rem,3vw,2.9rem);letter-spacing:-.055em;line-height:1.14;max-width:240px;z-index:1}',
    '.menu{display:flex;gap:15px;flex-wrap:wrap;align-items:center;justify-content:flex-end}.menu span{font-size:12px;color:#788699;font-weight:650}.menu span.current{color:var(--accent);border-bottom:2px solid var(--accent)}.heading{margin-bottom:45px;max-width:740px}.heading h2{margin-bottom:16px}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.card{border:1px solid #e0e7ed;padding:32px;border-radius:22px;background:white;min-height:210px}.num{display:block;color:var(--accent);font-weight:800;font-size:13px;margin-bottom:30px}.card p{margin-top:12px}',
    '.story{display:grid;grid-template-columns:1.6fr .7fr;gap:7vw;align-items:center}.story p{font-size:19px;margin-top:22px;max-width:660px}.metric{background:var(--deep);border-radius:25px;color:#fff;padding:45px}.metric strong{display:block;font-size:clamp(2rem,4vw,3.5rem);letter-spacing:-.06em}.metric p{color:#aeb9c8;margin-top:12px;font-size:14px}',
    '.quote{border-left:6px solid var(--accent);padding:10px 0 10px 40px}.quote p{font-size:clamp(1.7rem,3vw,3rem);line-height:1.35;color:var(--deep);font-weight:650;letter-spacing:-.035em}.quote footer{margin-top:26px;font-weight:700}.quote footer span{display:block;color:#8794a5;font-weight:400}',
    '.faq{display:grid;grid-template-columns:.75fr 1.4fr;gap:4vw}.faq details{border-bottom:1px solid #dce2ea;padding:22px 0}.faq summary{cursor:pointer;font-weight:700;font-size:18px;list-style:none}.faq summary:after{content:"+";color:var(--accent);float:right;font-size:24px;line-height:1}.faq details[open] summary:after{content:"−"}.faq details p{margin-top:15px;max-width:700px}',
    '.contact{background:var(--deep);color:white;padding:95px 0}.contact .tag{color:#8ab4ff}.contact h2{max-width:800px}.contact p{color:#bac6d7;max-width:660px;margin:20px 0 35px;font-size:19px}.foot{background:#0d1728;color:#8290a3;padding:23px 0;font-size:13px}.foot .wrap{display:flex;justify-content:space-between;gap:20px}',
    '@media(max-width:800px){.wrap{padding:0 24px}.section{padding:76px 0}.hero{padding:80px 0}.hero-grid,.story,.faq{grid-template-columns:1fr}.hero-grid{gap:42px}.visual{min-height:240px}.cards{grid-template-columns:1fr}.card{min-height:0}.quote{padding-left:22px}.contact{padding:75px 0}}',
    '@media(max-width:480px){.wrap{padding:0 18px}.nav{min-height:66px}.nav small{display:none}.hero{padding:58px 0}.hero p{font-size:17px}.visual{padding:25px}.section{padding:60px 0}.heading{margin-bottom:28px}.card{padding:25px}.contact{padding:62px 0}.foot .wrap{flex-direction:column}}'
  ].join('\n');
  function block(section) {
    const p=section.props;
    switch(section.type){
      case 'hero':return '<section class="hero" id="start"><div class="wrap hero-grid"><div><span class="tag">'+e(p.eyebrow)+'</span><h1>'+e(p.title)+'</h1><p>'+e(p.description)+'</p><a class="btn" href="#contact">'+e(p.action)+' &rarr;</a></div><aside class="visual"><small>01 / ДЕМО ПРОЕКТ</small><strong>'+e(p.highlight)+'</strong></aside></div></section>';
      case 'features':return '<section class="section"><div class="wrap"><div class="heading"><span class="tag">'+e(p.eyebrow)+'</span><h2>'+e(p.title)+'</h2></div><div class="cards">'+[1,2,3].map(i=>'<article class="card"><span class="num">0'+i+'</span><h3>'+e(p['item'+i])+'</h3><p>'+e(p['text'+i])+'</p></article>').join('')+'</div></div></section>';
      case 'story':return '<section class="section soft"><div class="wrap story"><div><span class="tag">'+e(p.eyebrow)+'</span><h2>'+e(p.title)+'</h2><p>'+e(p.paragraph)+'</p></div><aside class="metric"><strong>'+e(p.stat)+'</strong><p>'+e(p.statLabel)+'</p></aside></div></section>';
      case 'quote':return '<section class="section"><div class="wrap quote"><p>«'+e(p.quote)+'»</p><footer>'+e(p.person)+'<span>'+e(p.position)+'</span></footer></div></section>';
      case 'faq':return '<section class="section soft"><div class="wrap faq"><h2>'+e(p.title)+'</h2><div>'+[1,2].map(i=>'<details><summary>'+e(p['question'+i])+'</summary><p>'+e(p['answer'+i])+'</p></details>').join('')+'</div></div></section>';
      case 'contact':return '<section class="contact" id="contact"><div class="wrap"><span class="tag">'+e(p.eyebrow)+'</span><h2>'+e(p.title)+'</h2><p>'+e(p.description)+'</p><span class="btn" aria-label="Демо без отправки">'+e(p.action)+' · Демо</span></div></section>';
      default:throw Error('Unknown preview section');
    }
  }
  function render(input, selectedId, focusOnly=false, metadata={}) {
    const doc=C.validate(input),colors=C.palette[doc.theme];
    const style='--accent:'+colors.accent+';--deep:'+colors.deep+';--pale:'+colors.pale+';';
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8">'+
      '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; img-src &#39;none&#39;; script-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;">'+
      '<meta name="viewport" content="width=device-width, initial-scale=1">'+
      '<title>'+e(metadata.seoTitle||doc.siteTitle)+'</title><meta name="description" content="'+e(metadata.seoDescription||'')+'"><style>'+css+'</style></head>'+
      '<body style="'+style+'"><header class="top"><div class="wrap nav"><div class="mark">'+e(doc.siteTitle)+'<span>.</span></div><nav class="menu" aria-label="Демонстрационное меню">'+(metadata.menu||[]).map(pg=>'<span class="'+(pg.id===metadata.active?'current':'')+'">'+e(pg.title)+'</span>').join('')+'</nav></div></header>'+
      '<main>'+doc.sections.filter(s=>!focusOnly||s.id===selectedId).map(s=>{const html=block(s);return s.id===selectedId?html.replace('<section class="','<section class="preview-selected '):html;}).join('')+'</main><footer class="foot"><div class="wrap"><span>© Демо AI Site CMS</span><span>Без публикации и передачи данных</span></div></footer></body></html>';
  }
  Object.defineProperty(window,'CmsPreviewRender',{value:Object.freeze({render})});
})();
