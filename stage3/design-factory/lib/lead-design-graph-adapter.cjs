'use strict';
// Optional candidate for the LEAD branch's newer, read-only Design Graph v1.
// NOT used by the stable D6/site-v1 exporter. No SDK/PHP/Studio-main writes.
const bridge=require('./bridge.cjs');
const catalog=require('../catalog/compositions.cjs');
const themes=require('../catalog/themes.cjs');
const FORMAT='manufact-design-factory-lead-graph-candidate-v1';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function fail(message){throw Error('LEAD_DESIGN_GRAPH: '+message);}
function tokens(theme,composition){
 const density=composition.density==='tight'?'tight':composition.density==='airy'?'airy':'normal';
 const spacing={tight:[8,16,32],normal:[12,24,48],airy:[14,28,64]}[density];
 const radius=theme.design.card==='floating'?[20,32]:theme.design.card==='bordered'?[6,12]:[4,16];
 return {
  colors:{foreground:theme.cms.text,background:theme.cms.background,
   surface:theme.cms.surface,accent:theme.cms.primary,'cta-text':'#FFFFFF'},
  spacing:{small:spacing[0],medium:spacing[1],large:spacing[2]},
  radii:{soft:radius[0],round:radius[1]},
  typography:{body:16,heading:Number.parseInt(theme.headline.desktop,10)}
 };
}
function textValue(section,slot,key){
 const item=section.elements.find(e=>e.slot===slot);
 return item&&typeof item.values[key]==='string'?item.values[key].trim():'';
}
function bestText(section,slots,key,otherwise){
 for(const slot of slots){const text=textValue(section,slot,key);if(text)return text;}
 return otherwise;
}
function columnsFor(layout){
 if(['bento','mosaic','cards','rail'].includes(layout))return 3;
 if(['parallel','offset','columns','sidebar','split','table'].includes(layout))return 2;
 return 1;
}
function graphFor(section,composition,theme,language){
 if(!section||typeof section.id!=='string'||section.id.length>48)
  fail('Missing or oversized selected semantic section');
 if(!['ru','en'].includes(language))fail('Unknown language');
 const en=language==='en',prefix=section.id+'-dg';
 const safe=en?'Add verified owner information before publishing.':
  'Добавьте подтверждённые сведения владельца перед публикацией.';
 const heading=bestText(section,['heading','title','first'],'content.text',
  en?'Confirm the section heading':'Подтвердите заголовок секции');
 const description=bestText(section,['summary','copy','second'],'content.text',safe);
 const firstItem=section.items&&section.items[0];
 const detail=(firstItem&&typeof firstItem.values['content.text']==='string'&&
   firstItem.values['content.text'].trim())?firstItem.values['content.text'].trim():safe;
 const cardTitle=firstItem?.values?.['content.title']||
  (en?'Details to verify':'Данные для проверки');
 const action=section.elements.find(e=>e.values&&
  typeof e.values['behavior.href']==='string'&&e.values['behavior.href'].startsWith('/'));
 const href=action?.values['behavior.href']||'/contact/';
 const actionText=action?.values['content.text']||(en?'Contact':'Связаться');
 const mainCols=columnsFor(composition.layout);
 const align=composition.align==='center'?'center':'start';
 const centered=composition.align==='center',layout=composition.layout,art=composition.art;
 const density=composition.density;
 const wide=['bento','mosaic'].includes(layout),reverse=layout==='offset';
 const font=theme.cms.font==='georgia'?'georgia':theme.cms.font==='arial'?'arial':'system';
 // All variations use whitelisted Design Graph properties, so they remain
 // editable through the host CMS rather than requiring injected CSS.
 const rootStyles={
  display:'grid',columns:mainCols,gap:density==='tight'?'@small':'@large',
  padding:density==='airy'?'@large':'@medium',
  background:'@background',maxWidth:theme.cms.maxWidth,align,justify:'start',
  ...(layout==='band'?{gradient:{angle:120,from:'@background',to:'@surface'}}:{})
 };
 const detailStyles={
  display:'flex',direction:'column',gap:'@small',
  background:'@surface',padding:'@medium',radius:'@round',
  ...(theme.design.card==='bordered'?{borderWidth:2,borderColor:'@foreground'}:{}),
  ...(theme.design.card==='floating'?{shadow:'medium'}:{}),
  ...(art==='rule'||art==='line'?{borderWidth:1,borderColor:'@accent'}:{}),
  ...(art==='orb'||art==='arch'?{radius:'@round',gradient:{
   angle:art==='orb'?135:45,from:'@surface',to:'@background'}}:{}),
  ...(art==='tiles'?{shadow:'soft'}:{}),
  ...(reverse?{order:-1}:{}),
  ...(wide&&layout==='mosaic'?{gridColumnSpan:2}:{})
 };
 const copyStyles={
  display:'flex',direction:'column',gap:density==='tight'?'@small':'@medium',align,
  ...(centered?{textAlign:'center'}:{}),
  ...(wide&&layout==='bento'?{gridColumnSpan:2}:{})
 };
 const iconMap={frame:'arrow',orb:'sparkles',arch:'arrow',tiles:'check',
  rule:'menu',dots:'sparkles',line:'arrow',portrait:'sparkles',quotes:'menu'};
 const graph={
  version:1,id:prefix,nodes:[{
   id:prefix+'-root',type:'container',
   styles:rootStyles,
   responsive:{tablet:{columns:mainCols===3?2:1,gap:'@medium'},
    mobile:{columns:1,gap:'@small',padding:'@small'}},
   children:[{
    id:prefix+'-copy',type:'container',
    styles:copyStyles,
    responsive:wide?{tablet:{gridColumnSpan:mainCols===3?2:1},
     mobile:{gridColumnSpan:1}}:undefined,
    children:[
     {id:prefix+'-heading',type:'heading',level:2,text:heading,
      styles:{fontSize:'@heading',fontWeight:700,color:'@foreground',lineHeight:110,
       fontFamily:font,letterSpacing:theme.design.tracking==='wide'?-3:
        theme.design.tracking==='tight'?-1:-2,textAlign:centered?'center':'left'},
      motion:{effect:'fade-up',duration:450,delay:0},
      responsive:{tablet:{fontSize:Math.min(48,Number.parseInt(theme.headline.tablet,10))},
       mobile:{fontSize:Number.parseInt(theme.headline.mobile,10)}}},
     {id:prefix+'-text',type:'text',text:description,
      styles:{fontSize:'@body',color:'@foreground',lineHeight:150}},
     {id:prefix+'-action',type:'button',text:actionText,href,
      styles:{display:'block',background:'@accent',color:'@cta-text',padding:'@small',
       radius:'@soft',fontWeight:700, maxWidth:240},
      states:{hover:{opacity:85},focus:{borderWidth:2,borderColor:'@foreground'}}}
    ]
   },{
    id:prefix+'-detail',type:'container',
    styles:detailStyles,
    responsive:{mobile:{gridColumnSpan:1,order:0}},
    children:[
     {id:prefix+'-decoration',type:'icon',icon:iconMap[art]||'arrow',
      styles:{fontSize:32,color:'@accent'}},
     {id:prefix+'-detail-heading',type:'heading',level:3,text:cardTitle,
      styles:{fontSize:24,fontWeight:600,color:'@foreground',lineHeight:115,fontFamily:font}},
     {id:prefix+'-detail-copy',type:'text',text:detail,
      styles:{fontSize:'@body',color:'@foreground'}}
    ]
   }]
  }]
 };
 return graph;
}
function buildHostCandidate(exportBundle,hostSdk,hostRegistry){
 if(!hostSdk||typeof hostSdk.validateSite!=='function'||
    typeof hostSdk.inspectSite!=='function'||!hostRegistry)
  fail('Explicit lead SDK and real component registry required');
 const original=bridge.validateBundle(exportBundle);
 const workspace=original.workspace;
 if(!workspace.composition)fail('Select a D3 composition first; no implicit graph injection');
 const c=catalog.get(workspace.composition),theme=themes[workspace.project.theme];
 if(!theme)fail('Unknown theme');
 const site=JSON.parse(JSON.stringify(original.site));
 const section=site.pages[0].sections.find(s=>s.id==='df-selected-composition');
 if(!section)fail('No selected registered semantic section');
 site.designTokens=tokens(theme,c);
 section.designGraph=graphFor(section,c,theme,workspace.project.language);
 // Fail closed against older SDKs. No extra keys may enter the original D6 export.
 const checked=hostSdk.validateSite(site,hostRegistry);
 const inspection=hostSdk.inspectSite(checked,hostRegistry);
 if(inspection.errors.length)fail('Host SDK rejected local links');
 if(!own(checked,'designTokens')||!checked.pages[0].sections.some(s=>own(s,'designGraph')))
  fail('The injected host SDK does not preserve Design Graph v1');
 return {
  format:FORMAT,version:1,
  site:checked,ownerChecklist:original.ownerChecklist,
  mapping:{composition:c.id,theme:workspace.project.theme,
   editable:['graph nodes','headings','text','button','design tokens',
    'grid/flex compositions','pattern-specific spacing and card treatments',
    'font family and tracking','gradients','decorative icons','motion with reduced-motion',
    'desktop layout','tablet/mobile overrides','hover/focus states'],
   fidelity:'partial',approvedForPublish:false,
   integration_required:['complex D3 art','rich galleries and native scroll snap',
    'data-driven repeater mapping','owner factual verification',
    'main CMS authorization and save/revision workflow']},
  expectedSdk:'Lead Design Graph v1; not supported by the older feature branch SDK'
 };
}
module.exports=Object.freeze({FORMAT,tokens,graphFor,buildHostCandidate});
