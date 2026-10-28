'use strict';
// SHA256-bound real PHP HTML semantics, accessible navigation and link integrity.
// Read-only; no browser execution, public HTTP crawl, or release authorization.
const {inspect}=require('./html-evidence.cjs');
const {decode}=require('./php-local-components.cjs');
const FORMAT='manufact-seo-local-php-semantics-v1';
const MAX_PER_PAGE=80;
const normalize=x=>String(x??'').replace(/\s+/g,' ').trim().normalize('NFKC');
function attrs(raw){
 const out={};
 for(const m of String(raw).matchAll(/([a-z][a-z0-9:_-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gi))
  out[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
 return out;
}
const safe=x=>String(x??'').slice(0,200);
function review(site,snapshot){
 if(!site||!Array.isArray(site.pages)||!snapshot||snapshot.siteId!==site.siteId||
   !Array.isArray(snapshot.pages)||snapshot.pages.length!==site.pages.length)
  throw Error('Real PHP semantic review requires all source-matching HTML pages');
 const known=new Map(site.pages.map(p=>[p.path,p]));
 const redirects=new Map((site.redirects||[]).map(r=>[r.from,r.to]));
 const docs=new Map(),pages=[],findings=[],seenPages=new Set();
 const mount='/published/'+site.siteId+'/';
 for(const entry of snapshot.pages){
  const page=site.pages.find(p=>p.id===entry.id&&p.path===entry.path);
  if(!page||seenPages.has(page.id)||typeof entry.html!=='string')
   throw Error('Real PHP semantic evidence contains a mismatched or duplicate page');
  seenPages.add(page.id);
  docs.set(page.path,{page,html:entry.html,document:inspect(entry.html)});
 }
 for(const {page,html,document:d} of docs.values()){
  let emitted=0,linksChecked=0,internalLinksChecked=0,imagesChecked=0,ariaChecked=0;
  const dedupe=new Set();
  const add=(code,severity,message,details={})=>{
   const key=[code,details.fragment||'',details.href||'',details.elementId||'',details.field||''].join('|');
   if(dedupe.has(key)||emitted>=MAX_PER_PAGE)return;
   dedupe.add(key);emitted++;
   findings.push(Object.freeze({code:'php-semantic:'+code,severity,pageId:page.id,path:page.path,
    message,evidence:'sha256-verified-local-php-html',automatic:false,...details}));
  };
  if(d.mainCount!==1)
   add('main-landmark-count','error','Published page must contain one primary main landmark.',{expected:1,observed:d.mainCount});
  if(!/<header\b/i.test(html)||!/<footer\b/i.test(html))
   add('missing-site-landmark','error','Published page lost its header or footer landmark.');
  const main=/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i.exec(html);
  const headings=main?inspect(main[1]).headings:[];
  const h1=headings.filter(h=>h.level===1);
  if(h1.length!==1)
   add('main-h1-count','error','Real page main content must have one H1 for its primary subject.',
    {expected:1,observed:h1.length});
  if(h1.length===1&&!normalize(h1[0].text))
   add('empty-main-h1','error','Published H1 is empty or has no accessible text.');
  if(headings.length&&headings[0].level!==1)
   add('first-heading-not-h1','warning','The first heading inside main is not the page H1.');
  let last=1;
  for(const h of headings){
   if(h.level>last+1)
    add('heading-level-skip','warning','The real heading hierarchy skips an intermediate level.',
      {elementId:'h'+h.level+'-'+safe(h.text).slice(0,50)});
   last=h.level;
  }
  for(const id of d.duplicateIds)
   add('duplicate-dom-id','error','Repeated HTML ID breaks unique fragment/label destinations.',
     {elementId:safe(id)});
  if(d.baseHref)
   add('unexpected-html-base','error','An HTML base href changes published relative links; PHP renderer does not declare one.',
     {href:safe(d.baseHref)});
  for(const image of d.images){
   imagesChecked++;
   if(!Object.hasOwn(image,'alt'))
    add('image-alt-missing','error','A published image lacks the alt attribute. Use empty alt only for truly decorative images.',
      {href:safe(image.src)});
  }
  for(const control of d.unlabelledControls)
   add('unlabelled-control','warning','A real form control has no statically detectable accessible label.',
    {elementId:safe(control.id||control.name||control.tag)});
  const ids=new Set(d.ids);
  const markup=html.replace(/<!--[\s\S]*?-->/g,'')
   .replace(/<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
  for(const match of markup.matchAll(/<[a-z][a-z0-9:-]*\b([^<>]*?)>/gi)){
   const a=attrs(match[1]);
   for(const key of ['aria-labelledby','aria-describedby','aria-controls']){
    if(!a[key])continue;
    for(const ref of a[key].trim().split(/\s+/).filter(Boolean)){
     ariaChecked++;
     if(!ids.has(ref))add('missing-aria-reference',key==='aria-controls'?'warning':'error',
      'A real ARIA relation points to an absent document element.',{field:key,elementId:safe(ref)});
    }
   }
   if(a.for&&!ids.has(a.for))
    add('missing-label-target','warning','A label for attribute points to a missing control.',
     {elementId:safe(a.for)});
  }
  // Resolve only provably local links. Other origins are not fetched.
  const base=new URL(page.path.slice(1),'http://127.0.0.1'+mount);
  for(const hit of markup.matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a\s*>/gi)){
   const a=attrs(hit[1]),href=normalize(a.href||'');
   if(!Object.hasOwn(a,'href'))continue;
   linksChecked++;
   const imageAlt=[...hit[2].matchAll(/<img\b([^>]*?)\/?>/gi)]
    .map(m=>attrs(m[1]).alt||'').join(' ');
   const visible=normalize(hit[2].replace(/<[^>]*>/g,' '));
   if(!visible&&!normalize(a['aria-label']||a.title||imageAlt))
    add('empty-link-name','error','An actual link has no readable text, ALT or explicit accessible name.',
      {href:safe(href)});
   if(!href){
    add('empty-href','error','A published link has an empty href.',{href:'(empty)'});
    continue;
   }
   if(/^(?:javascript|data|file|vbscript):/i.test(href)){
    add('unsafe-link-protocol','error','A published link uses a disallowed URL scheme.',
     {href:safe(href)});continue;
   }
   let resolved;
   try{resolved=new URL(href,base);}catch{
    add('invalid-link-url','error','A published href cannot be parsed as a URL.',
     {href:safe(href)});continue;
   }
   if(a.target==='_blank'&&!String(a.rel||'').split(/\s+/).includes('noopener'))
    add('new-tab-noopener','warning','A new-tab link lacks explicit rel=noopener.',
     {href:safe(href)});
   if(resolved.origin!==base.origin)continue;
   if(!resolved.pathname.startsWith(mount)){
    add('site-mount-escaped','error','Published local link escapes the intended site mount.',
      {href:safe(href)});continue;
   }
   internalLinksChecked++;
   const targetPath='/'+resolved.pathname.slice(mount.length);
   const media=(site.assets||[]).some(asset=>asset.src===targetPath);
   const target=known.get(targetPath),redirect=redirects.get(targetPath);
   if(!target&&!redirect&&!media){
    add('missing-local-route','error','Real local link points to no declared page, redirect or site asset.',
      {href:safe(href)});continue;
   }
   if(!resolved.hash||media)continue;
   const destination=target||(redirect&&known.get(redirect));
   if(!destination)continue;
   let fragment=resolved.hash.slice(1);
   try{fragment=decodeURIComponent(fragment);}catch{
    add('invalid-fragment','warning','Link has an undecodable URL fragment.',{href:safe(href)});continue;
   }
   if(fragment!=='top'&&!docs.get(destination.path).document.ids.includes(fragment))
    add('broken-local-fragment','error','Real internal link points to an absent HTML fragment.',
      {href:safe(href),fragment:safe(fragment),targetPageId:destination.id});
  }
  pages.push(Object.freeze({pageId:page.id,path:page.path,headingsChecked:headings.length,
   h1Count:h1.length,imagesChecked,linksChecked,internalLinksChecked,ariaRelationsChecked:ariaChecked,
   findings:emitted,limitedByFindingsBudget:emitted===MAX_PER_PAGE}));
 }
 return Object.freeze({format:FORMAT,version:1,siteId:site.siteId,checkedPages:pages.length,
  checkedLinks:pages.reduce((n,p)=>n+p.linksChecked,0),
  checkedImages:pages.reduce((n,p)=>n+p.imagesChecked,0),
  checkedAriaReferences:pages.reduce((n,p)=>n+p.ariaRelationsChecked,0),
  pages:Object.freeze(pages),findings:Object.freeze(findings),
  limitations:'Static analysis of SHA256-checked localhost PHP HTML; no JS activation, screen-reader tree, WCAG certification, public crawl, public HTTPS or release approval.'});
}
module.exports=Object.freeze({FORMAT,review});
