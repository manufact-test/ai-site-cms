'use strict';
// Verify actual public PHP HTML for business-critical typed components.
// No browser execution, no fetched sites and no claims of dynamic correctness.
const FORMAT='manufact-seo-local-php-components-v1';
const TYPES=new Set(['content-switcher','pricing-plans','process-timeline','comparison-matrix']);
const attr=s=>{
 const o={};for(const m of String(s).matchAll(/([a-z][a-z0-9:_-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gi))
  o[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
 return o;
};
const classHas=(a,c)=>String(a.class||'').split(/\s+/).includes(c);
const norm=s=>String(s??'').replace(/\s+/g,' ').trim().normalize('NFKC');
function decode(s){
 return String(s).replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi,(m,code)=>{
  if(code[0]==='#'){const n=code[1]?.toLowerCase()==='x'?parseInt(code.slice(2),16):Number(code.slice(1));
   return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):m;}
  return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'})[code.toLowerCase()]||m;
 });
}
function text(s){return norm(decode(String(s).replace(/<[^>]*>/g,'')));}
function strip(s){return String(s).replace(/<!--[\s\S]*?-->/g,'')
 .replace(/<(?:script|style|template)\b[^>]*>[\s\S]*?<\/(?:script|style|template)\s*>/gi,'');}
function openTags(s,name){
 return [...String(s).matchAll(new RegExp('<'+name+'\\b([^>]*?)\\/?\\s*>','gi'))]
  .map(m=>({attributes:attr(m[1]),raw:m[0]}));
}
function elements(s,name){
 const re=new RegExp('<'+name+'\\b([^>]*?)>([\\s\\S]*?)<\\/'+name+'\\s*>','gi');
 return [...String(s).matchAll(re)].map(m=>({attributes:attr(m[1]),html:m[2],text:text(m[2])}));
}
// Finds the matching closing section, even when switches nest panels inside a section.
// Script/style strings and HTML comments cannot create fake section boundaries.
function sectionById(html,id){
 const clean=strip(html),re=/<\/?section\b[^>]*>/gi;
 let depth=0,start=-1,end=-1,count=0,match;
 while((match=re.exec(clean))){
  const tag=match[0],close=/^<\s*\//.test(tag);
  if(!close){
   if(depth)depth++;
   else if(attr(tag.slice(8,-1)).id===id){count++;depth=1;start=match.index;}
  }else if(depth){
   depth--;
   if(!depth)end=re.lastIndex;
  }
 }
 if(count!==1||start<0||end<=start)return null;
 return clean.slice(start,end);
}
// Content-switcher panels are nested <section> tags. A generic regex for
// sections would swallow the outer section through the first panel close.
function panelsIn(root){
 const matches=[];
 for(const m of root.matchAll(/<section\b([^>]*)>/gi)){
  const attributes=attr(m[1]);
  if(!classHas(attributes,'cms-switcher-panel'))continue;
  const tail=root.slice(m.index+m[0].length);
  const end=tail.search(/<\/section\s*>/i);
  if(end<0)continue;
  matches.push({attributes,html:tail.slice(0,end),text:text(tail.slice(0,end))});
 }
 return matches;
}
function links(s){
 return elements(s,'a').map(x=>({...x,href:x.attributes.href||''}));
}
function hrefFor(input,siteId){
 const v=String(input||'');
 return v.startsWith('/')&&!v.startsWith('//')?'/published/'+siteId+v:v;
}
function review(site,snapshot){
 if(!site||!Array.isArray(site.pages)||!snapshot||
  snapshot.siteId!==site.siteId||!Array.isArray(snapshot.pages)||
  snapshot.pages.length!==site.pages.length)
  throw Error('Actual PHP typed component review requires complete matching HTML snapshot');
 const findings=[],pages=[];
 const add=(page,section,code,message)=>findings.push(Object.freeze({
  code:'php-component:'+code,severity:'error',pageId:page.id,path:page.path,
  sectionId:section.id,component:section.component,message,
  evidence:'hash-checked-local-php-html',automatic:false
 }));
 for(const captured of snapshot.pages){
  const page=site.pages.find(x=>x.id===captured.id&&x.path===captured.path);
  if(!page)throw Error('Actual PHP component page identity differs');
  let checked=0;
  for(const component of page.sections.filter(x=>TYPES.has(x.component))){
   checked++;
   const root=sectionById(captured.html,component.id);
   if(!root){add(page,component,'section-missing','The typed published component section is absent or duplicated.');continue;}
   const items=component.items||[];
   if(component.component==='pricing-plans'){
    const cards=elements(root,'article').filter(x=>classHas(x.attributes,'cms-pricing-card'));
    if(cards.length!==items.length){
     add(page,component,'pricing-count','Published pricing card count differs from approved items.');
     continue;
    }
    items.forEach((item,i)=>{
     const markup=cards[i].html,values=item.values||{};
     const h=elements(markup,'h3'),price=elements(markup,'p').filter(x=>classHas(x.attributes,'cms-pricing-price'));
     const ctas=links(markup),list=elements(markup,'li');
     const expectedFeatures=String(values['content.features']||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
     if(h.length!==1||h[0].text!==norm(values['content.title'])||
        price.length!==1||price[0].text!==norm(values['content.price'])||
        list.length!==expectedFeatures.length||list.some((x,j)=>x.text!==norm(expectedFeatures[j]))||
        ctas.length!==1||ctas[0].text!==norm(values['content.button'])||
        ctas[0].href!==hrefFor(values['behavior.href'],site.siteId))
      add(page,component,'pricing-content','Published pricing title, price, feature list or CTA differs from Site v1 item '+item.id+'.');
    });
   }else if(component.component==='process-timeline'){
    const steps=elements(root,'li').filter(x=>classHas(x.attributes,'cms-process-step'));
    if(steps.length!==items.length){add(page,component,'timeline-count','Published timeline step count differs from Site v1.');continue;}
    items.forEach((item,i)=>{
     const step=steps[i].html,v=item.values||{},h=elements(step,'h3'),p=elements(step,'p'),small=elements(step,'small');
     if(h.length!==1||h[0].text!==norm(v['content.title'])||
        p.length!==1||p[0].text!==norm(v['content.description'])||
        small.length!==(v['content.detail']?1:0)||
        (small.length&&small[0].text!==norm(v['content.detail'])))
      add(page,component,'timeline-content','Published timeline text differs from Site v1 item '+item.id+'.');
    });
   }else if(component.component==='comparison-matrix'){
    const head=elements(root,'thead'),body=elements(root,'tbody');
    const rows=body.length===1?elements(body[0].html,'tr'):[];
    if(head.length!==1||body.length!==1||
       elements(head[0]?.html||'','th').length!==3||rows.length!==items.length||
       rows.some(r=>elements(r.html,'td').length!==2||elements(r.html,'th').length!==1)){
     add(page,component,'table-structure','Published comparison table lost headers, columns or rows.');continue;
    }
    items.forEach((item,i)=>{
     const v=item.values||{},th=elements(rows[i].html,'th'),td=elements(rows[i].html,'td');
     if(th[0].attributes.scope!=='row'||th[0].text!==norm(v['content.metric'])||
       td[0].text!==norm(v['content.first'])||td[1].text!==norm(v['content.second']))
      add(page,component,'table-content','Published comparison row differs from Site v1 item '+item.id+'.');
    });
   }else if(component.component==='content-switcher'){
    const radios=openTags(root,'input').filter(x=>classHas(x.attributes,'cms-switcher-radio'));
    const labels=elements(root,'label').filter(x=>classHas(x.attributes,'cms-switcher-tab'));
    const panels=panelsIn(root);
    const fieldsets=openTags(root,'fieldset').filter(x=>classHas(x.attributes,'cms-switcher'));
    if(radios.length!==items.length||labels.length!==items.length||
       panels.length!==items.length||fieldsets.length!==1){
     add(page,component,'switcher-structure','Published switcher has missing radio inputs, labels, panels or fieldset.');continue;
    }
    items.forEach((item,i)=>{
     const v=item.values||{},radio=radios[i].attributes,label=labels[i];
     const switchId='cms-switch-'+item.id, panelId='cms-pane-'+item.id;
     if(radio.id!==switchId||radio.name!=='switch-'+component.id||radio.type!=='radio'||
       Object.hasOwn(radio,'checked')!==(i===0)||
       label.attributes.for!==switchId||label.text!==norm(v['content.title'])||
       panels[i].attributes.id!==panelId||
       elements(panels[i].html,'h3')[0]?.text!==norm(v['content.heading'])||
       elements(panels[i].html,'p')[0]?.text!==norm(v['content.body'])||
       !captured.html.includes('#'+switchId+':checked~.cms-switcher-panels>#'+panelId+'{display:block}'))
      add(page,component,'switcher-parity','Published tab '+item.id+' has broken radio/label/panel/CSS mapping or changed content.');
    });
   }
  }
  pages.push(Object.freeze({pageId:page.id,path:page.path,checkedTypedSections:checked}));
 }
 return Object.freeze({format:FORMAT,siteId:site.siteId,readOnly:true,
  pages:Object.freeze(pages),checkedTypedSections:pages.reduce((n,x)=>n+x.checkedTypedSections,0),
  findings:Object.freeze(findings),runtimeInteractionsTested:false,
  limitations:'Checks real PHP static markup and declared content/CTA/semantic relationships only. Does not execute tabs, measure browser responsiveness or assert client visual equality.'});
}
module.exports=Object.freeze({FORMAT,review,sectionById,text,decode,hrefFor});
