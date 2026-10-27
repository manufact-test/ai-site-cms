'use strict';
// Offline D3 showcase: original semantic HTML and first-party CSS.
// No third-party assets, remote calls, false customer claims or arbitrary JS.
const fs=require('node:fs');
const path=require('node:path');
const {compositions,GROUPS,FORMAT}=require('../catalog/compositions.cjs');
const adapter=require('./composition-adapter.cjs');
const {serialize}=require('./compiler.cjs');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tag=(str)=>escape(str);
const demo=(category)=>{
 switch(category){
 case 'hero':return '<p class="micro">01 — YOUR BUSINESS / OWNER FACTS REQUIRED</p><h3>Build a clear first impression.</h3><p>Describe what you do with verified facts and a focused next step.</p><a class="demo-action" href="#guide">Prepare the brief <span aria-hidden="true">↗</span></a>';
 case 'benefits':return '<div class="demo-pair"><article><b>01</b><h3>Clarity</h3><p>Replace with a verified service benefit.</p></article><article><b>02</b><h3>Relevance</h3><p>Confirm each statement with the owner.</p></article></div>';
 case 'services':return '<div class="demo-pair"><article><b>01 / Service</b><h3>First service</h3><p>Confirmed service details belong here.</p><a href="#guide">Explore →</a></article><article><b>02 / Service</b><h3>Second service</h3><p>Add real details before publishing.</p><a href="#guide">Explore →</a></article></div>';
 case 'process':return '<ol class="demo-steps"><li><b>Discovery</b><span>Confirm your actual working process.</span></li><li><b>Planning</b><span>Check the scope and handoff steps.</span></li><li><b>Delivery</b><span>Specify what the owner actually provides.</span></li></ol>';
 case 'team':return '<div class="demo-pair"><article><div class="portrait">PORTRAIT PLACEHOLDER</div><h3>Role to verify</h3><p>No names or faces are fabricated.</p></article><article><div class="portrait">PHOTO / PERMISSION REQUIRED</div><h3>Role to verify</h3><p>Get permission before publishing.</p></article></div>';
 case 'portfolio':return '<div class="demo-pair"><article><div class="visual-plane">CASE STUDY / IMAGE REQUIRED</div><h3>Project case #1</h3><p>Replace with approved delivered work.</p></article><article><div class="visual-plane">OWNER PROJECT ONLY</div><h3>Project case #2</h3><p>Do not present fictional clients.</p></article></div>';
 case 'pricing':return '<div class="demo-pair"><article><b>Format A</b><h3>Scope to confirm</h3><p class="price-placeholder">Price: owner input required</p><p>Specify deliverables, no invented amounts.</p></article><article><b>Format B</b><h3>Custom scope</h3><p class="price-placeholder">Terms: owner input required</p><p>Discuss actual conditions with the owner.</p></article></div>';
 case 'testimonials':return '<div class="demo-pair"><article><b>QUOTE / CONSENT REQUIRED</b><h3>Do not publish without a real review.</h3><p>Replace only with author-approved verbatim text.</p></article><article><b>REVIEWER</b><h3>Identity not provided</h3><p>No fictitious names or outcomes.</p></article></div>';
 case 'faq':return '<div class="demo-faq"><details><summary>How do I verify the service details?</summary><p>Confirm them with the owner before publishing.</p></details><details><summary>Can I use this design?</summary><p>Yes, after reviewing content and integration constraints.</p></details></div>';
 case 'contact':return '<div class="contact-row"><div><h3>Start a conversation.</h3><p>Show only verified communication channels.</p></div><div><span class="channel">EMAIL / NOT PROVIDED</span><span class="channel">PHONE / NOT PROVIDED</span><a class="demo-action" href="#guide">Review contacts ↗</a></div></div>';
 case 'cta':return '<div class="contact-row"><div><p class="micro">NEXT ACTION</p><h3>Tell us what you need.</h3><p>A focused next step without false urgency.</p></div><a class="demo-action" href="#guide">Discuss requirements ↗</a></div>';
 case 'gallery':return '<div class="demo-pair photo-pair"><div class="visual-plane">IMAGE 01<br>OWNER FILE REQUIRED</div><div class="visual-plane">IMAGE 02<br>OWNER FILE REQUIRED</div><div class="visual-plane">IMAGE 03<br>OWNER FILE REQUIRED</div></div>';
 case 'trust':return '<div class="demo-pair"><article><b>VERIFICATION 01</b><h3>Owner-approved proof</h3><p>Record verifiable certifications here.</p></article><article><b>VERIFICATION 02</b><h3>Verified reference</h3><p>Never invent clients or awards.</p></article></div>';
 case 'editorial':return '<div class="contact-row"><div class="visual-plane">OWNED PHOTO / OPTIONAL</div><div><p class="micro">THE STORY</p><h3>Build the narrative from real details.</h3><p>Explain the context and add attribution where needed.</p><a href="#guide">Editorial guidance ↗</a></div></div>';
 default:throw Error('Unknown showcase category');
 }
};
function card(c,i){
 const notes=c.requirements.map(x=>'<li>'+tag(x)+'</li>').join('');
 const parity=c.status==='supported'?'CMS semantic fallback':'CMS integration required';
 return '<article class="pattern layout-'+c.layout+' motif-'+c.art+' density-'+c.density+
  ' align-'+c.align+' kind-'+c.category+'" id="'+tag(c.id)+'">'+
  '<header class="pattern-heading"><p class="pattern-number">'+String(i+1).padStart(2,'0')+' / 42</p>'+
  '<div><p class="eyebrow">'+tag(c.categoryLabel)+'</p><h2>'+tag(c.label)+'</h2><p class="pattern-meta">'+
  tag(c.id)+' · '+tag(parity)+'</p></div></header>'+
  '<div class="stage" role="group" aria-label="'+tag(c.label)+' sample section">'+demo(c.category)+'</div>'+
  '<details class="pattern-notes"><summary>Layout, content requirements and CMS fallback</summary><div class="note-grid">'+
  '<div><b>Layout</b><p>'+tag(c.layout)+' / '+tag(c.art)+' / '+tag(c.density)+'</p>'+
  '<p>'+tag(c.responsive.mobile)+'</p></div>'+
  '<div><b>Before publishing</b><ul>'+notes+'</ul><p>'+tag(c.warning)+'</p></div>'+
  '<div><b>Compatibility</b><p>'+tag(c.fallback)+'</p><p>CMS: '+tag(c.cmsComponent)+'</p></div>'+
  '</div></details></article>';
}
const style=[
'/* 42 compositions, first-party local CSS only. No external assets. */',
':root{color-scheme:light;--ink:#16282A;--muted:#5F7778;--bg:#F1F4EF;--paper:#FFFFFF;--accent:#176B5B;--border:#C4D2CB}',
'*,*:before,*:after{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}',
'a{color:inherit}a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:4px}',
'.skip{position:absolute;left:-9999px}.skip:focus{left:10px;top:10px;background:white;padding:12px;z-index:100}',
'.top{background:var(--ink);color:white;padding:clamp(32px,6vw,85px) clamp(18px,4vw,65px)}.top-inner{max-width:1320px;margin:auto}',
'.pill{display:inline-block;border:1px solid #789D93;border-radius:20px;padding:5px 12px;font-size:11px;letter-spacing:.12em;font-weight:800}',
'.top h1{font-size:clamp(44px,7vw,110px);line-height:.98;letter-spacing:-.085em;margin:24px 0;max-width:970px;font-weight:650}',
'.top p{max-width:720px;font-size:18px;color:#D9E9E3}.category-links{max-width:1320px;margin:auto;padding:20px 18px;display:flex;flex-wrap:wrap;gap:8px}',
'.category-links a{padding:9px 15px;background:white;border:1px solid var(--border);border-radius:40px;text-decoration:none;font-size:12px;font-weight:750}',
'.category-links a:hover{background:var(--ink);color:white}.container{max-width:1320px;padding:0 18px 70px;margin:auto}',
'.group-header{display:flex;justify-content:space-between;align-items:end;gap:15px;margin:70px 0 20px;border-bottom:2px solid var(--ink);padding-bottom:18px}',
'.group-header h2{font-size:clamp(25px,3.5vw,45px);letter-spacing:-.055em;margin:0}.group-header p{margin:0;max-width:490px;color:var(--muted);font-size:12px}',
'.pattern{margin:20px 0 36px;background:var(--paper);border:1px solid var(--border);border-radius:18px;overflow:hidden;box-shadow:0 8px 40px #173C3420}',
'.pattern-heading{display:grid;grid-template-columns:100px 1fr;gap:18px;padding:25px 35px;background:#F8FAF7;border-bottom:1px solid var(--border)}',
'.pattern-number{font-weight:850;color:var(--accent);letter-spacing:.08em}.eyebrow,.micro{font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:var(--accent);font-weight:800}',
'.pattern-heading h2{font-size:clamp(22px,2.8vw,32px);line-height:1.1;margin:7px 0;letter-spacing:-.045em}.pattern-meta{color:var(--muted);font-size:12px;margin:0}',
'.stage{min-height:300px;padding:clamp(25px,5vw,65px);display:flex;flex-direction:column;justify-content:center;gap:25px;overflow:hidden;position:relative;background:linear-gradient(145deg,#FFF,#F4F9F4)}',
'.stage h3{font-size:clamp(25px,4vw,58px);line-height:1.05;letter-spacing:-.055em;max-width:770px;margin:6px 0 16px;font-weight:650}',
'.stage p{max-width:620px;color:#425B58}.demo-action{display:inline-flex;align-items:center;justify-content:space-between;gap:16px;width:max-content;min-height:44px;border:0;border-radius:7px;background:var(--accent);color:white;padding:12px 20px;text-decoration:none;font-weight:800;font-size:13px}',
'.demo-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;max-width:1030px;width:100%}',
'.demo-pair article{border:1px solid var(--border);border-radius:10px;padding:25px;background:#FFF;min-width:0}',
'.demo-pair b{font-size:11px;letter-spacing:.13em;color:var(--accent)}.demo-pair h3{font-size:clamp(21px,3vw,37px)}',
'.portrait,.visual-plane{min-height:150px;background:#D9E6DD;color:#526C63;display:flex;align-items:center;justify-content:center;text-align:center;letter-spacing:.12em;font-size:11px;font-weight:800;padding:25px;border-radius:5px}',
'.portrait{height:180px;background:radial-gradient(circle at 50% 38%,#A5BDB0 0 40px,transparent 41px),linear-gradient(#D7E1D6,#B5C9B8)}',
'.demo-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:0;list-style:none;counter-reset:step}',
'.demo-steps li{padding:27px;border-top:3px solid var(--accent);background:#FFF;display:grid;gap:20px;min-height:190px}',
'.demo-steps li:before{counter-increment:step;content:counter(step,decimal-leading-zero);font-size:12px;color:var(--accent);font-weight:900}',
'.demo-steps li b{font-size:25px}.demo-steps li span{color:var(--muted)}.demo-faq{max-width:800px;width:100%}',
'.demo-faq details{padding:20px 0;border-bottom:1px solid var(--border)}.demo-faq summary{font-weight:800;cursor:pointer;font-size:18px}',
'.contact-row{display:grid;grid-template-columns:1.4fr 1fr;gap:10%;align-items:center}.channel{display:block;border-bottom:1px solid var(--border);padding:12px 0;font-weight:750;font-size:12px}',
'.photo-pair{grid-template-columns:1.4fr .8fr .8fr}.photo-pair .visual-plane{height:250px}.price-placeholder{font-size:12px!important;font-weight:850;color:#A14D29!important}',
'.pattern-notes{border-top:1px solid var(--border);padding:0 35px}.pattern-notes>summary{cursor:pointer;list-style:disclosure-closed;font-size:12px;font-weight:800;padding:18px 0;color:var(--muted)}',
'.pattern-notes[open]>summary{list-style:disclosure-open}.note-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:35px;padding:8px 0 25px;font-size:12px}.note-grid p{color:var(--muted)}',
'.layout-centered .stage{text-align:center;align-items:center}.layout-centered .stage .demo-action{margin:auto}.layout-centered .stage h3{max-width:730px}',
'.layout-offset .stage{padding-left:13%;background:linear-gradient(90deg,#DEE8DF 0 10%,#FAFDF9 10%)}.layout-parallel .stage{border-left:22px solid var(--accent)}',
'.layout-bento .demo-pair{grid-template-columns:1.45fr .55fr}.layout-bento .demo-pair article:first-child{min-height:240px}',
'.layout-columns .demo-pair{grid-template-columns:repeat(2,minmax(0,1fr))}.layout-columns .stage{column-gap:35px}',
'.layout-rail .demo-pair,.layout-rail .demo-steps{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;padding-bottom:20px}',
'.layout-rail .demo-pair>*{flex:0 0 min(70%,450px);scroll-snap-align:start}.layout-rail .demo-steps>*{flex:0 0 min(50%,300px);scroll-snap-align:start}',
'.layout-cards .demo-pair article{box-shadow:0 20px 40px #0C393019}.layout-stack .demo-pair,.layout-stack .demo-steps{grid-template-columns:1fr}',
'.layout-sidebar .stage{display:grid;grid-template-columns:.58fr 1.42fr;align-items:center;gap:25px}.layout-sidebar .stage>.demo-pair,.layout-sidebar .stage>.demo-faq{max-width:100%}',
'.layout-steps .demo-steps li:nth-child(2){transform:translateY(22px)}.layout-steps .demo-steps li:nth-child(3){transform:translateY(44px)}',
'.layout-split .stage{display:block}.layout-split .contact-row{grid-template-columns:1fr 1fr}',
'.layout-mosaic .demo-pair,.layout-mosaic .photo-pair{grid-template-columns:1.3fr .7fr}.layout-mosaic .demo-pair>:first-child{grid-row:span 2;min-height:310px}.layout-mosaic .photo-pair>:first-child{grid-row:span 2}',
'.layout-table .demo-pair{grid-template-columns:1fr;gap:0}.layout-table .demo-pair article{display:grid;grid-template-columns:1fr 1fr;gap:18px;border-radius:0;border-bottom:0}.layout-table .demo-pair article:last-child{border-bottom:1px solid var(--border)}',
'.layout-band .stage{background:var(--ink);color:white}.layout-band .stage p{color:#D0DFD8}.layout-band .stage .micro{color:#A7D7C7}',
'.motif-orb .stage:before{content:"";position:absolute;right:-65px;top:-80px;border-radius:50%;width:290px;height:290px;border:38px solid #C0D5C8;opacity:.34;pointer-events:none}',
'.motif-arch .stage:before{content:"";position:absolute;right:2%;bottom:0;width:120px;height:210px;background:#DAE8DE;border-radius:65px 65px 0 0;pointer-events:none}',
'.motif-rule .stage{border-top:7px solid var(--accent)}.motif-tiles .stage{background-image:linear-gradient(#26776411 1px,transparent 1px),linear-gradient(90deg,#26776411 1px,transparent 1px);background-size:36px 36px}',
'.motif-dots .stage{background-image:radial-gradient(#387B672A 1.5px,transparent 1.5px);background-size:24px 24px}.motif-line .stage{background:linear-gradient(140deg,#FFF 58%,#E2EBE3 58%)}',
'.motif-portrait .portrait{border-radius:120px 120px 8px 8px}.motif-quotes .stage h3:before{content:"“";font-family:Georgia,serif;font-size:65px;color:var(--accent)}',
'.density-tight .stage{min-height:210px;padding-top:35px;padding-bottom:35px}.density-airy .stage{min-height:400px}',
'.align-center .stage{text-align:center;align-items:center}.align-center .demo-pair article{text-align:left}',
'.footer{max-width:1320px;margin:0 auto;padding:30px 20px 100px;color:var(--muted)}',
'@media(max-width:900px){.layout-sidebar .stage,.contact-row,.layout-split .contact-row{grid-template-columns:1fr}.demo-steps{grid-template-columns:1fr}.layout-steps .demo-steps li{transform:none!important}.layout-mosaic .demo-pair{grid-template-columns:1fr 1fr}}',
'@media(max-width:600px){.top h1{font-size:52px}.pattern-heading{grid-template-columns:1fr;padding:20px}.pattern-number{margin:0}.stage{padding:25px;min-height:260px}.density-airy .stage{min-height:300px}.demo-pair:not(.photo-pair){grid-template-columns:1fr}.photo-pair{grid-template-columns:1fr 1fr}.photo-pair .visual-plane:first-child{grid-column:span 2}.photo-pair .visual-plane{height:150px}.note-grid{grid-template-columns:1fr;gap:12px}.pattern-notes{padding:0 20px}.layout-offset .stage{padding-left:30px}.layout-table .demo-pair article{grid-template-columns:1fr}.group-header{align-items:flex-start;flex-direction:column}}',
'@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition:none!important}}'
].join('\n')+'\n';
function html(){
 const nav=GROUPS.map(g=>'<a href="#category-'+tag(g[0])+'">'+tag(g[0])+'</a>').join('');
 const groups=GROUPS.map(g=>{
  const items=compositions.filter(x=>x.category===g[0]);
  return '<section aria-labelledby="category-'+tag(g[0])+'"><div class="group-header">'+
   '<h2 id="category-'+tag(g[0])+'">'+tag(g[1])+'</h2><p>Three independent layout strategies. The sample text is illustrative, never a company fact.</p></div>'+
   items.map(c=>card(c,compositions.indexOf(c))).join('\n')+'</section>';
 }).join('\n');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex"><title>Design Factory / 42 original section compositions</title>'+
  '<link rel="stylesheet" href="showcase.css"></head><body><a class="skip" href="#main">Skip to content</a>'+
  '<header class="top"><div class="top-inner"><span class="pill">MANUFACT / DESIGN FACTORY / D3</span>'+
  '<h1>Forty-two ways to tell a story.</h1><p>Original, offline and deliberately fact-safe section arrangements. Each composition documents its CMS fallback and integration limits.</p></div></header>'+
  '<nav aria-label="Composition categories" class="category-links">'+nav+'</nav>'+
  '<main id="main" class="container">'+groups+
  '<section id="guide" class="group-header"><h2>Owner-review gate</h2><p>Replace every placeholder with verified content. No fictional prices, testimonials, clients or images may be published.</p></section></main>'+
  '<footer class="footer">Design Factory D3 · Offline showcase. Visual treatments marked integration_required are not yet supported by the current PHP renderer.</footer></body></html>\n';
}
function writeShowcase(dest){
 const target=path.resolve(dest);
 if(fs.existsSync(target))throw Error('Refusing existing output path');
 if(!fs.existsSync(path.dirname(target))||!fs.statSync(path.dirname(target)).isDirectory())throw Error('Parent must exist');
 fs.mkdirSync(target);
 try{
  fs.writeFileSync(path.join(target,'index.html'),html(),{flag:'wx'});
  fs.writeFileSync(path.join(target,'showcase.css'),style,{flag:'wx'});
  fs.writeFileSync(path.join(target,'compositions.json'),serialize({format:FORMAT,items:compositions}),{flag:'wx'});
  fs.writeFileSync(path.join(target,'fallbacks.json'),
   serialize({format:'manufact-design-compositions-bridge-v1',items:compositions.map(x=>adapter.compare(x.id))}),{flag:'wx'});
  return {directory:target,compositions:compositions.length,files:4};
 }catch(e){fs.rmSync(target,{recursive:true,force:true});throw e;}
}
module.exports=Object.freeze({html,style,writeShowcase,card});
