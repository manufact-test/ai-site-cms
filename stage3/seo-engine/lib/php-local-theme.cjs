'use strict';
// Verify the real PublicRenderer.php theme CSS contract against captured HTML.
// Does not infer pixel-perfect fidelity or execute CSS/browser layouts.
const FORMAT='manufact-seo-local-php-theme-v1';
const defaults=Object.freeze({background:'#f7f9fc',surface:'#ffffff',text:'#172a43',primary:'#0a5bff',
 font:'system',maxWidth:1140,bodySize:16,lineHeight:'normal',headingScale:'normal',
 buttonStyle:'solid',buttonRadius:9,buttonText:'#ffffff'});
const FONTS=Object.freeze({system:'system-ui,Arial,sans-serif',arial:'Arial,sans-serif',georgia:'Georgia,serif'});
const LINE_HEIGHT=Object.freeze({compact:'1.4',normal:'1.6',relaxed:'1.8'});
const HEADING_SCALE=Object.freeze({compact:'clamp(24px,2.5vw,34px)',normal:'clamp(28px,3vw,42px)',
 large:'clamp(36px,4.5vw,56px)'});
function declaredTheme(site){
 const t={...defaults,...site.theme};
 const outline=t.buttonStyle==='outline';
 return Object.freeze({
  '--cms-bg':t.background,
  '--cms-surface':t.surface,
  '--cms-text':t.text,
  '--cms-primary':t.primary,
  '--cms-width':t.maxWidth+'px',
  '--cms-font':FONTS[t.font],
  '--cms-body-size':t.bodySize+'px',
  '--cms-line-height':LINE_HEIGHT[t.lineHeight],
  '--cms-h2-size':HEADING_SCALE[t.headingScale],
  '--cms-button-bg':outline?'transparent':'var(--cms-primary)',
  '--cms-button-color':outline?'var(--cms-primary)':t.buttonText,
  '--cms-button-text':t.buttonText,
  '--cms-button-radius':t.buttonStyle==='pill'?'999px':t.buttonRadius+'px',
  '--cms-button-shadow':outline?'inset 0 0 0 2px var(--cms-primary)':'none'
 });
}
function rootStyle(html){
 const head=/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html)?.[1]||'';
 const clean=head.replace(/<!--[\s\S]*?-->/g,'')
  .replace(/<(?:script|template)\b[^>]*>[\s\S]*?<\/(?:script|template)\s*>/gi,'');
 const styles=[...clean.matchAll(/<style\b([^>]*?)>([\s\S]*?)<\/style\s*>/gi)];
 const roots=[];
 for(const entry of styles)
  for(const match of entry[2].matchAll(/(?:^|[}\s]):root\s*\{([^}]*)\}/g))
   roots.push(match[1]);
 if(roots.length!==1)return {roots:roots.length,variables:new Map()};
 const vars=new Map();
 for(const declaration of roots[0].split(';')){
  const i=declaration.indexOf(':');
  if(i<0)continue;
  const key=declaration.slice(0,i).trim(),val=declaration.slice(i+1).trim();
  if(key.startsWith('--')){
   const values=vars.get(key)||[];
   values.push(val);
   vars.set(key,values);
  }
 }
 return {roots:roots.length,variables:vars};
}
const normalize=x=>String(x??'').replace(/\s+/g,'').toLowerCase();
function review(site,snapshot){
 if(!site||!Array.isArray(site.pages)||!snapshot||
  snapshot.siteId!==site.siteId||!Array.isArray(snapshot.pages)||
  snapshot.pages.length!==site.pages.length)
  throw Error('Local PHP theme audit requires all source-matching page HTML');
 const expected=declaredTheme(site),pages=[],findings=[];
 const add=(page,code,message,property)=>findings.push(Object.freeze({
  code:'php-theme:'+code,severity:'error',pageId:page.id,path:page.path,
  property:property||null,message,
  evidence:'sha256-verified-local-php-html',automatic:false
 }));
 for(const entry of snapshot.pages){
  const page=site.pages.find(x=>x.id===entry.id&&x.path===entry.path);
  if(!page)throw Error('Theme review page path/ID does not match site');
  const {roots,variables}=rootStyle(entry.html);
  if(roots!==1){
   add(page,'root-missing','Published PHP needs exactly one source-bound :root theme declaration.'); 
   pages.push(Object.freeze({pageId:page.id,path:page.path,checkedProperties:0,rootCount:roots}));
   continue;
  }
  let checked=0;
  for(const [key,val] of Object.entries(expected)){
   const observed=variables.get(key)||[];
   checked++;
   if(observed.length!==1||normalize(observed[0])!==normalize(val))
    add(page,'token-drift','Published CSS variable '+key+
     ' is missing, duplicated or differs from current Site v1.',key);
  }
  // Theme is global; stale HTML from another published release is a blocker
  // even when all page titles and links are otherwise correct.
  pages.push(Object.freeze({pageId:page.id,path:page.path,checkedProperties:checked,
   rootCount:roots}));
 }
 return Object.freeze({format:FORMAT,siteId:site.siteId,readOnly:true,
  checkedPages:pages.length,expectedCssVariables:Object.keys(expected).length,
  pages:Object.freeze(pages),findings:Object.freeze(findings),
  visualPixelParityChecked:false,cssComputedStylesMeasured:false,
  limitations:'Compares exact PHP :root theme token contracts in captured HTML, not CSS cascade, client-approved screenshot equality, browser layout or public HTTPS.'});
}
module.exports=Object.freeze({FORMAT,declaredTheme,rootStyle,review});
