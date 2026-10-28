'use strict';
// Actual PHP DesignGraph acceptance: inspect source-bound, sha-checked HTML.
// Does not run scripts, approve aesthetics or mutate published content.
const FORMAT='manufact-seo-local-php-design-graph-v1';
const {sectionById,text,decode,hrefFor}=require('./php-local-components.cjs');
const norm=x=>String(x??'').replace(/\s+/g,' ').trim().normalize('NFKC');
function attrs(s){
 const out={};
 for(const m of String(s).matchAll(/([a-z][a-z0-9:_-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gi))
  out[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
 return out;
}
function markedTags(s,cls){
 const result=[],re=/<([a-z][a-z0-9-]*)\b([^>]*?)>/gi;
 for(const m of s.matchAll(re)){
  const attr=attrs(m[2]);
  if(String(attr.class||'').split(/\s+/).includes(cls))
   result.push({tag:m[1].toLowerCase(),attrs:attr,index:m.index,end:m.index+m[0].length});
 }
 return result;
}
function contents(s,tag,from){
 const closer=new RegExp('<\\/'+tag+'\\s*>','i').exec(s.slice(from));
 return closer? s.slice(from,from+closer.index):null;
}
function allNodes(graph){
 const out=[];
 const walk=n=>{
  out.push(n);
  for(const child of n.children||[])walk(child);
 };
 for(const n of graph?.nodes||[])walk(n);
 return out;
}
function review(site,snapshot){
 if(!site||!Array.isArray(site.pages)||!snapshot||
   snapshot.siteId!==site.siteId||!Array.isArray(snapshot.pages)||
   snapshot.pages.length!==site.pages.length)
  throw Error('PHP DesignGraph audit needs full matching page HTML snapshot');
 const assets=new Map((site.assets||[]).map(x=>[x.id,x]));
 const issues=[],pages=[];
 const byPath=new Map(site.pages.map(p=>[p.path,p]));
 const redirects=new Map((site.redirects||[]).map(r=>[r.from,r.to]));
 const capturedPaths=new Map(snapshot.pages.map(p=>[p.path,p.html]));
 const add=(page,section,node,code,message)=>issues.push(Object.freeze({
  code:'php-graph:'+code,severity:'error',pageId:page.id,path:page.path,
  sectionId:section.id,graphNodeId:node?.id||null,message,
  evidence:'hash-checked-local-php-html',automatic:false
 }));
 for(const snapshotPage of snapshot.pages){
  const page=site.pages.find(p=>p.id===snapshotPage.id&&p.path===snapshotPage.path);
  if(!page)throw Error('PHP DesignGraph source-page mismatch');
  let inspected=0,checkedSections=0;
  for(const section of page.sections.filter(s=>s.designGraph)){
   checkedSections++;
   const html=sectionById(snapshotPage.html,section.id);
   if(!html){
    add(page,section,null,'section-missing','A published DesignGraph section was omitted or duplicated.');
    continue;
   }
   const spec=section.designGraph,nodes=allNodes(spec),ids=new Set();
   const headingCells=new Set(nodes.filter(n=>n.type==='table')
    .flatMap(n=>(n.children?.[0]?.children||[]).map(cell=>cell.id)));
   const css=snapshotPage.html;
   if(!/<section\b/i.test(html)||!html.includes('cmsdg-'+spec.id))
    add(page,section,null,'graph-wrapper','Published graph wrapper or identifier differs from Site v1.');
   for(const n of nodes){
    inspected++;
    if(ids.has(n.id)){add(page,section,n,'duplicate-source-node','Sealed DesignGraph has a repeated node ID.');continue;}
    ids.add(n.id);
    const found=markedTags(html,'cmsdg-n-'+n.id);
    if(found.length!==1){
     add(page,section,n,'node-missing','Published PHP graph node '+n.id+' is missing or duplicated.');continue;
    }
    const el=found[0],a=el.attrs,inside=contents(html,el.tag,el.end);
    const body=inside===null?'':inside;
    const textValue=()=>text(body);
    const expectedHref=n.href?hrefFor(n.href,site.siteId):null;
    const mismatch=reason=>add(page,section,n,'node-content-drift',reason);
    if(n.type==='heading'){
     if(el.tag!=='h'+(n.level||2)||textValue()!==norm(n.text))
      mismatch('Published graph heading level or visible text differs from Site v1.');
    }else if(n.type==='text'||n.type==='list-item'||n.type==='table-cell'){
     const tags={text:'p','list-item':'li','table-cell':headingCells.has(n.id)?'th':'td'};
     if(el.tag!==tags[n.type]||
       textValue()!==norm(n.text)||
        (n.type==='table-cell'&&headingCells.has(n.id)&&a.scope!=='col'))
      mismatch('Published graph text/list/table cell differs from Site v1.');
    }else if(n.type==='link'||n.type==='button'){
     const popup=Boolean(n.popupTarget);
     if((popup&&el.tag!=='button')||(!popup&&el.tag!=='a')||
        (popup?a.popovertarget!=='cmsdg-popup-'+n.popupTarget:a.href!==expectedHref)||
        textValue()!==norm(n.text))
      mismatch('Published graph link, button text, destination or popup target differs from Site v1.');
    }else if(n.type==='image'){
     const asset=assets.get(n.assetId),source='/published/'+site.siteId+(asset?.src||'');
     if(el.tag!=='img'||a.src!==source||a.alt!==String(n.alt??''))
      mismatch('Published graph image asset path or ALT differs from Site v1.');
     if(n.href){
      // Images with a click action must still point to the approved route.
      const before=html.slice(Math.max(0,el.index-2000),el.index);
      const opener=before.lastIndexOf('<a '),closer=before.lastIndexOf('</a>');
      const wrapper=opener>closer?/^<a\b([^>]*?)>/i.exec(before.slice(opener)):null;
      const linked=wrapper?attrs(wrapper[1]):null;
      if(!linked||!String(linked.class||'').split(/\s+/).includes('cmsdg-image-action')||
         linked.href!==expectedHref)
       mismatch('Published clickable graph image lost its approved link destination.');
     }
     if(n.responsiveMedia){
      const start=html.lastIndexOf('<picture',el.index),end=html.indexOf('</picture>',el.end);
      const picture=start>=0&&end>el.end?html.slice(start,end):'';
      for(const [bp,width] of [['mobile',600],['tablet',900]]){
       const id=n.responsiveMedia[bp+'AssetId'];
       if(!id)continue;
       const variant=assets.get(id);
       const match=picture.includes('media="(max-width:'+width+'px)"')&&
        picture.includes('srcset="/published/'+site.siteId+(variant?.src||'')+'"');
       if(!match)mismatch('Published graph responsive art direction '+bp+' differs from Site v1.');
      }
     }
    }else if(n.type==='video'){
     const src='/published/'+site.siteId+(assets.get(n.assetId)?.src||'');
     const poster=n.posterAssetId?'/published/'+site.siteId+(assets.get(n.posterAssetId)?.src||''):null;
     if(el.tag!=='video'||a['aria-label']!==String(n.alt??'')||
        (poster!==null&&a.poster!==poster)||(poster===null&&Object.hasOwn(a,'poster'))||
        !body.includes('src="'+src+'"'))
      mismatch('Published graph video source, poster or accessible label differs from Site v1.');
    }else if(n.type==='disclosure'){
     if(el.tag!=='details'||!/<summary\b/i.test(body)||
        text(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i.exec(body)?.[1]||'')!==norm(n.text))
      mismatch('Published graph disclosure has lost native details/summary label.');
    }else if(n.type==='list'){
     if(el.tag!==(n.ordered?'ol':'ul')||!String(a.class||'').includes('cmsdg-list'))
      mismatch('Published ordered/unordered graph list semantics differ.');
    }else if(n.type==='table'){
     if(el.tag!=='table'||!String(a.class||'').includes('cmsdg-table'))
      mismatch('Published graph semantic table wrapper is missing.');
     if(n.text&&!body.includes('<caption>'))mismatch('Published graph table caption is missing.');
    }else if(n.type==='gallery'){
     if(el.tag!=='div'||a.role!=='region'||a['aria-roledescription']!=='gallery'||
        a['aria-label']!==String(n.text)||a.tabindex!=='0')
      mismatch('Published graph gallery is missing accessible scroll region attributes.');
    }else if(n.type==='quote'){
     const quote=/<blockquote\b[^>]*>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*<\/blockquote>/i.exec(body);
     const cite=/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i.exec(body);
     if(el.tag!=='figure'||!quote||text(quote[1])!==norm(n.text)||
        (n.cite?(!cite||text(cite[1])!==norm(n.cite)):Boolean(cite)))
      mismatch('Published graph quote text or attribution differs from approved Site v1.');
    }else if(n.type==='tab'){
     if(el.tag!=='div'||a.id!=='cmsdg-panel-'+n.id||
        !String(a.class||'').split(/\s+/).includes('cmsdg-tab-panel'))
      mismatch('Published tab content panel ID or marker is missing.');
    }else if(n.type==='popup'){
     if(el.tag!=='div'||a.id!=='cmsdg-popup-'+n.id||a.popover!=='auto'||a.role!=='dialog')
      mismatch('Published graph popup is not a valid native popover dialog.');
    }else if(n.type==='divider'&&el.tag!=='hr')
     mismatch('Published graph separator is not an HR element.');
    else if(n.type==='icon'&&el.tag!=='svg')
     mismatch('Published graph icon is missing SVG markup.');
    // A typed DesignGraph link can match the approved source while the
    // approved source itself points to a deleted page or missing anchor.
    // Check *all* clickable graph types: buttons, links and linked images.
    if(['link','button','image'].includes(n.type)&&n.href&&!n.popupTarget&&
       n.href.startsWith('/')&&!n.href.startsWith('//')){
     let route=null,fragment='';
     try{
      const url=new URL(n.href,'https://site-v1.invalid');
      if(url.origin!=='https://site-v1.invalid')throw Error('Unexpected origin');
      route=url.pathname;
      fragment=url.hash?decodeURIComponent(url.hash.slice(1)):'';
     }catch{
      add(page,section,n,'invalid-internal-target','Authored DesignGraph internal target URL cannot be parsed.');
     }
     if(route!==null){
      const mapped=byPath.get(route)||byPath.get(redirects.get(route));
      if(!mapped)
       add(page,section,n,'broken-internal-route',
        'Authored DesignGraph click target '+route+' is absent from current Site v1 pages and redirects.');
      else if(fragment){
       const targetHtml=(capturedPaths.get(mapped.path)||'')
        .replace(/<!--[\s\S]*?-->/g,'')
        .replace(/<(?:script|style|template)\b[^>]*>[\s\S]*?<\/(?:script|style|template)\s*>/gi,'');
       const ids=[...targetHtml.matchAll(/<[a-z][a-z0-9-]*\b([^>]*?)>/gi)]
        .map(m=>attrs(m[1]).id).filter(Boolean);
       if(!ids.includes(fragment))
        add(page,section,n,'broken-internal-fragment',
         'Authored DesignGraph link fragment #'+fragment.slice(0,110)+
         ' is not present in actual captured target-page HTML.');
      }
     }
    }
    if(n.type==='tabs'){
     const group='cmsdg-tabs-'+n.id;
     if(!String(a.class||'').split(/\s+/).includes(group))
      add(page,section,n,'tabs-wrapper','Native CSS tab group wrapper is missing.');
     for(const [i,tab] of (n.children||[]).entries()){
      const control='cmsdg-tab-'+tab.id, panel='cmsdg-panel-'+tab.id;
      const input=new RegExp('<input\\b([^>]*\\bid="'+control+'"[^>]*?)>','i').exec(html);
      const field=input?attrs(input[1]):null;
      const label=new RegExp('<label\\s+for="'+control+'">','i').test(html);
      const actualLabel=new RegExp('<label\\s+for="'+control+'">([\\s\\S]*?)<\\/label>','i').exec(html);
      const labelMatches=actualLabel&&text(actualLabel[1])===norm(tab.text);
      const rules=css.includes(':has(> .cmsdg-tabs-controls > #'+control+':checked) > .cmsdg-tabs-panels > #'+panel+'{display:block}');
      if(!field||field.type!=='radio'||field.name!=='cmsdg-tabs-'+n.id||
         field['aria-controls']!==panel||Boolean(Object.hasOwn(field,'checked'))!==(i===0)||
         !label||!labelMatches||!rules)
       add(page,section,tab,'tabs-control','Published DesignGraph tab lost labeled radio/ARIA/panel/CSS activation.');
     }
    }
   }
  }
  pages.push(Object.freeze({pageId:page.id,path:page.path,inspectedGraphSections:checkedSections,inspectedGraphNodes:inspected}));
 }
 return Object.freeze({format:FORMAT,siteId:site.siteId,readOnly:true,pages:Object.freeze(pages),
  checkedSections:pages.reduce((n,p)=>n+p.inspectedGraphSections,0),
  checkedNodes:pages.reduce((n,p)=>n+p.inspectedGraphNodes,0),
  findings:Object.freeze(issues),
  javascriptExecuted:false,realBrowserParityChecked:false,
  limitations:'Checks emitted HTML classes, semantic tags, labels, links, assets and CSS radio tabs. Does not authenticate the serving PHP build, execute browser UI or certify visual similarity.'});
}
module.exports=Object.freeze({FORMAT,review,allNodes,markedTags});
