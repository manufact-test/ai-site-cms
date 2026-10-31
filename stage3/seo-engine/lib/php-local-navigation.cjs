'use strict';
// Source-bound comparison of actual PHP public navigation (desktop + mobile).
// Does not assert CSS layout, browser clicks, or deployed/public revision.
const {decode,text}=require('./php-local-components.cjs');
const FORMAT='manufact-seo-local-php-navigation-v1';
const normalize=x=>String(x??'').replace(/\s+/g,' ').trim().normalize('NFKC');
function attrs(raw){
 const result={};
 for(const m of String(raw).matchAll(/([a-z][a-z0-9:_-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gi))
  result[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
 return result;
}
const classed=(a,name)=>String(a?.class||'').split(/\s+/).includes(name);
function elements(html,tag){
 const rx=new RegExp('<'+tag+'\\b([^>]*?)>([\\s\\S]*?)<\\/'+tag+'\\s*>','gi');
 return [...String(html).matchAll(rx)].map(m=>({attributes:attrs(m[1]),html:m[2],text:text(m[2])}));
}
function anchors(html){
 const rx=/<a\b([^>]*?)>([\s\S]*?)<\/a\s*>/gi;
 return [...String(html).matchAll(rx)].map(m=>({attributes:attrs(m[1]),text:text(m[2])}));
}
function actualHeader(html){
 const header=elements(html.replace(/<!--[\s\S]*?-->/g,''),'header')
  .filter(x=>classed(x.attributes,'cms-site-header'));
 return header.length===1?header[0]:null;
}
function expectedMenu(site,page,kind){
 const mount='/published/'+site.siteId;
 const visible=site.pages.filter(p=>p.navigation?.hidden!==true);
 const top=visible.filter(p=>!p.navigation?.parentId);
 const children=new Map(top.map(p=>[p.id,visible.filter(q=>q.navigation?.parentId===p.id)]));
 const a=p=>({href:mount+p.path,text:normalize(p.navigation?.label||p.title),
  current:p.path===page.path});
 const records=[];
 for(const p of top){
  records.push(a(p));
  for(const child of children.get(p.id)||[])records.push(a(child));
 }
 return records;
}
function review(site,snapshot){
 if(!site||!Array.isArray(site.pages)||!snapshot||
   snapshot.siteId!==site.siteId||!Array.isArray(snapshot.pages)||
   snapshot.pages.length!==site.pages.length)
  throw Error('Actual PHP navigation review requires all matching site HTML pages');
 const expectedIds=new Set(site.pages.map(p=>p.id));
 const pages=[],findings=[];
 const add=(page,code,message)=>findings.push(Object.freeze({
  code:'php-nav:'+code,severity:'error',pageId:page.id,path:page.path,
  message,evidence:'hash-checked-local-php-html',automatic:false}));
 const settings={style:'default',sticky:false,mobile:'collapsible',ctaPageId:'',ctaLabel:'',...(site.menu||{})};
 for(const entry of snapshot.pages){
  const p=site.pages.find(x=>x.id===entry.id&&x.path===entry.path);
  if(!p)throw Error('Navigation source page differs from local capture');
  const header=actualHeader(entry.html);
  if(!header){add(p,'header-absent','Published site header is absent or duplicated.');pages.push({pageId:p.id,path:p.path,actualLinks:0});continue;}
  const h=header.html;
  const classes=header.attributes;
  if(!classed(classes,'cms-menu-'+settings.style)||
     classed(classes,'cms-menu-sticky')!==Boolean(settings.sticky))
   add(p,'header-style-drift','Published menu class/sticky mode differs from Site v1.');
  const brands=anchors(h).filter(x=>classed(x.attributes,'cms-brand'));
  if(brands.length!==1||brands[0].attributes.href!=='/published/'+site.siteId+'/'||
     brands[0].text!==normalize(site.title))
   add(p,'brand-drift','Published site brand title or homepage URL differs from Site v1.');
  const desktop=elements(h,'nav').filter(x=>classed(x.attributes,'cms-nav-desktop'));
  const mobile=elements(h,'nav').filter(x=>
   classed(x.attributes,'cms-mobile-inline')||x.attributes['aria-label']==='Мобильная навигация');
  if(desktop.length!==1||mobile.length!==1){
   add(p,'navigation-absent','Published desktop or mobile navigation is absent or duplicated.');
   pages.push({pageId:p.id,path:p.path,actualLinks:0});continue;
  }
  if(desktop[0].attributes['aria-label']!=='Основная навигация'||
     mobile[0].attributes['aria-label']!=='Мобильная навигация')
   add(p,'navigation-accessibility','Published navigation lacks the expected accessible region labels.');
  const expected=expectedMenu(site,p);
  const checkLinks=(nav,device)=>{
   const got=anchors(nav.html);
   if(got.length!==expected.length||
      got.some((link,i)=>link.attributes.href!==expected[i]?.href||
       link.text!==expected[i]?.text||
       Object.hasOwn(link.attributes,'aria-current')!==expected[i]?.current||
       (Object.hasOwn(link.attributes,'aria-current')&&link.attributes['aria-current']!=='page')))
    add(p,'menu-route-content-drift','Published '+device+' navigation links, current-page state or order differ from Site v1.');
   const sub=[...nav.html.matchAll(/<ul\b([^>]*?)>/gi)]
    .filter(x=>classed(attrs(x[1]),'cms-nav-submenu'));
   const visible=site.pages.filter(x=>x.navigation?.hidden!==true);
   const topIds=new Set(visible.filter(x=>!x.navigation?.parentId).map(x=>x.id));
   const expectedSubs=new Set(visible.filter(x=>topIds.has(x.navigation?.parentId))
    .map(x=>x.navigation.parentId)).size;
   if(sub.length!==expectedSubs)
    add(p,'menu-hierarchy','Published '+device+' submenu count differs from Site v1 page hierarchy.');
   return got.length;
  };
  const desktopLinks=checkLinks(desktop[0],'desktop');
  const mobileLinks=checkLinks(mobile[0],'mobile');
  const details=elements(h,'details').filter(x=>classed(x.attributes,'cms-mobile-menu'));
  if(settings.mobile==='expanded'){
   if(details.length||!classed(mobile[0].attributes,'cms-mobile-inline'))
    add(p,'mobile-layout','Site v1 expects expanded mobile navigation, not collapsible details.');
  }else if(details.length!==1||
    !String(details[0].html).includes('aria-label="Мобильная навигация"')||
    !/<summary\b[^>]*>\s*Меню\s*<\/summary>/i.test(details[0].html))
   add(p,'mobile-layout','Site v1 expects accessible collapsible mobile details navigation.');
  const ctas=anchors(h).filter(x=>classed(x.attributes,'cms-menu-cta'));
  const target=site.pages.find(x=>x.id===settings.ctaPageId);
  if(settings.ctaPageId&&(!target||!expectedIds.has(settings.ctaPageId)))
   add(p,'cta-target-invalid','Menu CTA references an unknown page ID.');
  if(target){
   if(ctas.length!==1||ctas[0].attributes.href!=='/published/'+site.siteId+target.path||
      ctas[0].text!==normalize(settings.ctaLabel))
    add(p,'cta-drift','Published menu CTA label or destination differs from Site v1.');
  }else if(ctas.length)add(p,'cta-unexpected','Published menu CTA is not declared in Site v1.');
  // A duplicated visible menu is a real navigation regression even if each nav is correct.
  const footer=elements(entry.html,'footer');
  if(footer.length!==1||footer[0].text!==normalize(site.title))
   add(p,'footer-drift','Published page footer or site title differs from Site v1.');
  pages.push(Object.freeze({pageId:p.id,path:p.path,desktopLinks,mobileLinks,
   expectedLinks:expected.length,mobileMode:settings.mobile,submenuParentCount:
     new Set(site.pages.filter(x=>x.navigation?.parentId&&x.navigation.hidden!==true&&
      site.pages.some(top=>top.id===x.navigation.parentId&&top.navigation?.hidden!==true))
      .map(x=>x.navigation.parentId)).size}));
 }
 return Object.freeze({format:FORMAT,siteId:site.siteId,readOnly:true,
  checkedPages:pages.length,pages:Object.freeze(pages),findings:Object.freeze(findings),
  browserInteractionsTested:false,externalHostVerified:false,
  limitations:'Compares static PHP nav structure/content with Site v1 and duplicate desktop/mobile anchors; does not run CSS, click menus, verify real HTTPS or attest screenshot match.'});
}
module.exports=Object.freeze({FORMAT,review,expectedMenu,actualHeader});
