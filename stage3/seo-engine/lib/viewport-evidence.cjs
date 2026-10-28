'use strict';
// Optional three-device captured-markup evidence; no viewport is fabricated.
const {inspect}=require('./html-evidence.cjs');
const {checkBlueprint}=require('./blueprint.cjs');
const FORMAT='manufact-seo-viewport-evidence-v1';
const norm=x=>String(x||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const DEVICES=['desktop','tablet','mobile'];
function hrefs(doc){
 return [...new Set(doc.anchors.map(x=>x.attrs.href||'').filter(x=>x.startsWith('/')&&!x.startsWith('//')).map(x=>x.split('#')[0].split('?')[0]).filter(Boolean))].sort();
}
function review(captures,blueprint){
 const b=checkBlueprint(blueprint);
 if(!captures||captures.format!==FORMAT||captures.siteId!==b.siteId||
  !Array.isArray(captures.pages)||captures.pages.length>80)throw Error('Invalid viewport evidence contract');
 const planned=new Map(b.pages.map(p=>[p.id,p])),visited=new Set(),findings=[],pages=[];
 const issue=(code,p,device,message,context={})=>findings.push({
  code,severity:'recommendation',pageId:p.id,path:p.path,device,message,...context
 });
 for(const p of captures.pages){
  if(!p||typeof p.id!=='string'||typeof p.path!=='string'||visited.has(p.id)||!p.captures||
   typeof p.captures!=='object'||Array.isArray(p.captures)||Object.keys(p.captures).some(k=>!DEVICES.includes(k)))
   throw Error('Invalid viewport evidence page');
  visited.add(p.id);
  const spec=planned.get(p.id);
  if(!spec||spec.path!==p.path)throw Error('Viewport page ID/path not in SEO blueprint');
  const docs={},signals={};
  for(const device of DEVICES){
   const c=p.captures[device];
   if(!c||typeof c.html!=='string'||c.html.length>250000||!['rendered-dom','static-html'].includes(c.method))
    throw Error('Missing bounded viewport '+device+' capture');
   docs[device]=inspect(c.html);
   signals[device]={method:c.method,headings:docs[device].headings.map(x=>x.text),
    h1:docs[device].headings.filter(x=>x.level===1).map(x=>x.text),
    links:hrefs(docs[device]),mainCount:docs[device].mainCount,
    imagesWithAlt:docs[device].images.filter(x=>Object.prototype.hasOwnProperty.call(x,'alt')).length,
    imageCount:docs[device].images.length};
  }
  const desktop=signals.desktop;
  for(const device of ['tablet','mobile']){
   const actual=signals[device];
   if(actual.h1.length===0&&desktop.h1.length)
    issue('viewport:h1-missing',p,device,'H1 present in desktop capture not found in this device capture.');
   else if(actual.h1.length&&desktop.h1.length&&norm(actual.h1[0])!==norm(desktop.h1[0]))
    issue('viewport:h1-content-diff',p,device,'Primary H1 text differs across provided markup captures; confirm intentional responsive copy.',{desktopH1:desktop.h1[0],observedH1:actual.h1[0]});
   const missing=desktop.headings.filter(h=>!actual.headings.some(x=>norm(x)===norm(h)));
   if(missing.length)issue('viewport:heading-content-gap',p,device,
    'Some desktop headings are absent from supplied device capture; check whether actual content is accessible.',{missingHeadings:missing.slice(0,12)});
   const missingRoutes=desktop.links.filter(href=>!actual.links.includes(href));
   if(missingRoutes.length)issue('viewport:route-gap',p,device,
    'Some authored internal destinations available in desktop capture are missing from this device capture.',{missingRoutes:missingRoutes.slice(0,20)});
   if(actual.mainCount===0&&desktop.mainCount>0)
    issue('viewport:main-landmark-gap',p,device,'Main landmark present in desktop capture is not in this device capture.');
  }
  // Blueprint CTA destination is a separate required conversion observation,
  // but target navigation may be located in the global header/footer.
  const destinations=[...new Set(spec.sections.filter(x=>x.cta).map(x=>b.pages.find(t=>t.id===x.cta.toPageId).path))];
  for(const device of DEVICES){
   const absent=destinations.filter(path=>!signals[device].links.includes(path));
   if(absent.length)issue('viewport:planned-cta-route-absent',p,device,
    'No anchor with the proposed CTA destination exists in supplied device markup; custom JS/form actions may need separate checks.',{plannedPaths:absent});
  }
  pages.push({pageId:p.id,path:p.path,captures:signals});
 }
 return {format:'manufact-seo-viewport-review-v1',version:1,siteId:b.siteId,
  pages,findings,completeThreeDevices:pages.every(x=>DEVICES.every(d=>Boolean(x.captures[d]))),
  limitations:'Only supplied device-specific HTML/DOM string captures are compared. CSS display/visibility, tap targets, visual quality, viewport media queries, user interaction and true accessible visible content require actual browser checks.'};
}
module.exports=Object.freeze({FORMAT,review});
