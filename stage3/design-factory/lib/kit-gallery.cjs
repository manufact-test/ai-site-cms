'use strict';
// D4: real offline 16-site browseable bundle (12 RU + 4 EN) generated from the
// current registered CMS contract. Every page and stylesheet is an actual file.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const kits=require('../catalog/kits.cjs');
const {THEMES,FORMAT,VERSION,compile,serialize}=require('./compiler.cjs');
const {writePreview,esc}=require('./preview.cjs');
const PROJECT_FORMAT='manufact-design-factory-v1';
const FORMAT_GALLERY='manufact-design-sector-gallery-v1';
const idSafe=id=>/^[a-z][a-z0-9-]{2,79}$/.test(id);
function renderIndex(records){
 const cards=records.map(r=>{
  const t=THEMES[r.theme].cms;
  const ratio=r.language==='ru'?'RU':'EN';
  return '<article class="kit-card"><a class="kit-link" href="'+esc(r.folder)+'/index.html" '+
   'aria-label="Открыть '+esc(r.label)+' ('+ratio+')"><div class="kit-visual" style="--swatch-bg:'+t.background+
   ';--swatch-ink:'+t.text+';--swatch-accent:'+t.primary+'"><span class="kit-deco" aria-hidden="true">◆</span>'+
   '<div class="kit-visual-text">'+esc(r.label)+'</div><span class="swatch">FOUR PAGES / '+ratio+'</span></div>'+
   '<div class="kit-info"><div><h3>'+esc(r.label)+'</h3><p>'+esc(r.kit)+' · '+esc(r.theme)+'</p></div>'+
   '<span class="arrow" aria-hidden="true">↗</span></div></a></article>';
 }).join('');
 const styles=[
  ':root{color-scheme:light;--ink:#162729;--bg:#EDF1ED;--border:#CFDBD3}',
  '*,*:before,*:after{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,Segoe UI,sans-serif}',
  'a{color:inherit}a:focus-visible{outline:3px solid #0D6C59;outline-offset:4px}.hero{background:var(--ink);color:white;padding:clamp(35px,7vw,100px) 22px}',
  '.wrapper{max-width:1320px;margin:auto}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:#AACBBE;font-weight:850}',
  'h1{font-size:clamp(43px,7vw,100px);line-height:.97;letter-spacing:-.09em;max-width:1000px;margin:20px 0 25px;font-weight:680}',
  '.hero p{max-width:730px;font-size:18px;color:#D6E6DE}.main{max-width:1320px;margin:auto;padding:50px 22px 100px}',
  '.main h2{font-size:32px;letter-spacing:-.05em}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}',
  '.kit-card{background:white;border-radius:18px;overflow:hidden;border:1px solid var(--border);box-shadow:0 8px 35px #26402F18}',
  '.kit-link{text-decoration:none;display:block}.kit-link:hover .kit-deco{transform:scale(1.12) rotate(-12deg)}',
  '.kit-visual{min-height:260px;background:var(--swatch-bg);color:var(--swatch-ink);padding:26px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:end}',
  '.kit-deco{position:absolute;right:-40px;top:-92px;font-size:300px;line-height:1;color:var(--swatch-accent);opacity:.8;transition:transform .2s}',
  '.kit-visual-text{font-size:clamp(22px,2.5vw,34px);line-height:1.08;letter-spacing:-.06em;font-weight:800;position:relative;max-width:250px}',
  '.swatch{position:relative;margin-top:28px;font-size:10px;font-weight:900;letter-spacing:.12em}',
  '.kit-info{padding:21px 24px;display:flex;justify-content:space-between;align-items:center;gap:15px}',
  '.kit-info h3{font-size:17px;margin:0}.kit-info p{color:#63746E;font-size:12px;margin:5px 0 0}',
  '.arrow{font-size:25px;color:#125744}.caveat{padding:16px 20px;border-left:4px solid #1C7D65;background:#E5EBE6;max-width:900px;margin:0 0 35px}',
  'footer{padding:30px 22px;text-align:center;font-size:12px;color:#63746E}',
  '@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '@media(max-width:580px){.grid{grid-template-columns:1fr}.kit-visual{min-height:220px}.kit-deco{font-size:240px}}',
  '@media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important;animation:none!important}}'
 ].join('\n');
 return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="robots" content="noindex"><title>Design Factory — отраслевые многостраничные сайты</title><style>'+styles+'</style></head><body>'+
 '<header class="hero"><div class="wrapper"><div class="eyebrow">AI Site CMS / DESIGN FACTORY / D4</div>'+
 '<h1>12 отраслей. Разные структуры. Реальные страницы.</h1>'+
 '<p>Локальный каталог: 12 русскоязычных и 4 англоязычных примера с полноценными маршрутами. Выберите проект и откройте его страницы без сервера.</p></div></header>'+
 '<main class="main"><div class="caveat"><b>Примеры не готовы к публикации.</b> Тексты и изображения требуют подтверждения владельцем; расширенный CSS-предпросмотр пока не равен PHP-выводу CMS.</div>'+
 '<h2>Каталог проектов</h2><div class="grid">'+cards+'</div></main>'+
 '<footer>© Design Factory — самостоятельная офлайн-демонстрация. Никаких реальных клиентских данных.</footer></body></html>\n';
}
function hashFile(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function generate(dir){
 const output=path.resolve(dir);
 if(fs.existsSync(output))throw Error('Existing directory cannot be overwritten');
 if(!fs.existsSync(path.dirname(output))||!fs.statSync(path.dirname(output)).isDirectory())throw Error('Output parent does not exist');
 fs.mkdirSync(output);
 const records=[];
 try{
  for(const [kit,item] of Object.entries(kits)){
   for(const language of (item.bilingual?['ru','en']:['ru'])){
    const folder=kit+'-'+language;
    if(!idSafe(folder))throw Error('Invalid generated folder');
    const project={format:PROJECT_FORMAT,version:VERSION,kit,theme:item.theme,language,
      facts:{siteId:'factory-'+kit+'-'+language}};
    const compiled=compile(project);
    const child=path.join(output,folder);
    writePreview(compiled,child);
    const files=['index.html','services/index.html','approach/index.html','contact/index.html',
      'assets/preview.css','site-v1.json'];
    const sha256=Object.fromEntries(files.map(file=>[file,hashFile(path.join(child,file))]));
    records.push({kit,theme:item.theme,language,label:item.label[language],
      folder,pages:compiled.site.pages.length,sha256,readyForPublish:false});
   }
  }
  if(records.length!==16)throw Error('Expected 12 RU and 4 EN multi-page kits');
  fs.writeFileSync(path.join(output,'index.html'),renderIndex(records),{flag:'wx'});
  fs.writeFileSync(path.join(output,'catalog-manifest.json'),serialize({format:FORMAT_GALLERY,
    kits:12,sites:records.length,pages:records.reduce((n,r)=>n+r.pages,0),items:records}),{flag:'wx'});
  return {directory:output,kitCount:12,siteCount:16,pageCount:64,filesTracked:records.length*6};
 }catch(err){fs.rmSync(output,{recursive:true,force:true});throw err;}
}
module.exports=Object.freeze({FORMAT_GALLERY,renderIndex,generate});
