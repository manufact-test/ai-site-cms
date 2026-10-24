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
function textSource(section,slots,key){
 // Prefer the rendered nonempty field, but keep an initially blank declared
 // field bound so owner-filled values can replace preview placeholders later.
 for(const slot of slots)if(textValue(section,slot,key))return {slot,field:key};
 for(const slot of slots){
  const el=section.elements.find(e=>e.slot===slot);
  if(el&&own(el.values,key)&&typeof el.values[key]==='string')return {slot,field:key};
 }
 return null;
}
function bestText(section,slots,key,otherwise){
 const source=textSource(section,slots,key);
 return source?(textValue(section,source.slot,source.field)||otherwise):otherwise;
}
function actionSource(section){
 return section.elements.find(e=>e.values&&
  typeof e.values['behavior.href']==='string'&&e.values['behavior.href'].startsWith('/'));
}
function columnsFor(layout){
 if(['bento','mosaic','cards','rail'].includes(layout))return 3;
 if(['parallel','offset','columns','sidebar','split','table'].includes(layout))return 2;
 return 1;
}
// Extract first-party semantic content. Never create fake clients, reviews,
// prices or media to fill a visual pattern. Bindings are adapter metadata for
// the lead integrator; Design Graph itself is an editable content snapshot.
function contentFor(section,comp,language,prefix,cardStyles,font){
 const en=language==='en',nodes=[],bindings=[];
 const t=(ru,english)=>en?english:ru;
 const make=(id,type,value,origin,style={})=>{
  const node={id,type,...(type==='heading'?{level:3}:{}),text:value,styles:style};
  if(origin)bindings.push({nodeId:id,source:origin});
  return node;
 };
 const card=(i,parts)=>{
  const id=prefix+'-card-'+(i+1);
  return {id,type:'container',styles:{...cardStyles,gridColumnSpan:1},
   responsive:{mobile:{gridColumnSpan:1}},
   children:parts};
 };
 const cards=[];
 if(section.component==='service-grid' || section.component==='faq-accordion'){
  const service=section.component==='service-grid';
  // CMS permits up to 24 FAQs. Render all 24 within host's 90-node
  // limit, not merely the first 12; services remain capped at 12.
  const limit=service?12:24;
  if((section.items||[]).length>limit)
   fail('Too many '+(service?'services':'FAQ entries')+' for editable graph');
  for(const [i,item] of (section.items||[]).entries()){
   const titleField=service?'content.title':'content.question';
   const bodyField=service?'content.text':'content.answer';
   const heading=(item.values[titleField]||'').trim()||
    t('Уточните название','Confirm the title');
   const body=(item.values[bodyField]||'').trim()||
    t('Нужны подтверждённые сведения владельца.','Owner verification required.');
   const id=prefix+'-card-'+(i+1);
   const parts=[
    make(id+'-title','heading',heading,{itemId:item.id,field:titleField},
      {fontSize:24,fontWeight:600,fontFamily:font,color:'@foreground',lineHeight:125}),
    make(id+'-text','text',body,{itemId:item.id,field:bodyField},
      {fontSize:'@body',lineHeight:150,color:'@foreground'})
   ];
   if(service){
    const href=item.values['behavior.href'];
    if(typeof href==='string'&&href.startsWith('/')){
     const action=make(id+'-action','button',t('Подробнее','Learn more'),
       null,{fontSize:'@body',fontWeight:600,color:'@accent',minHeight:48});
     action.href=href;
     bindings.push({nodeId:action.id,source:{itemId:item.id,field:'behavior.href'},property:'href'});
     parts.push(action);
    }
   }
   cards.push(card(i,parts));
  }
 }else if(section.component==='feature-highlights'){
  for(const [i,slot] of ['first','second'].entries()){
   const element=section.elements.find(x=>x.slot===slot);
   const body=(element?.values?.['content.text']||'').trim()||
     t('Подтвердите данные','Verify content');
   const id=prefix+'-card-'+(i+1);
   cards.push(card(i,[
    make(id+'-title','heading',t('Пункт для проверки','Item to verify'),null,
      {fontSize:22,fontWeight:600,color:'@foreground'}),
    make(id+'-text','text',body,{slot,field:'content.text'},
      {fontSize:'@body',color:'@foreground',lineHeight:145})
   ]));
  }
 }else if(section.component==='photo-gallery'){
  // No photo assets exist in the generated D3 semantic fallback. Do not
  // silently pretend empty media slots are real photography.
  const id=prefix+'-card-1';
  cards.push(card(0,[
   make(id+'-title','heading',t('Фотографии ещё не загружены','Images not uploaded'),null,
    {fontSize:24,fontWeight:600,color:'@foreground'}),
   make(id+'-text','text',
    t('Добавьте изображения с правами использования, подписи и alt.',
      'Upload licensed images with captions and alt text.'),null,
    {fontSize:'@body',color:'@foreground'})
  ]));
 }else{
  const item=section.items?.[0];
  const val=(item?.values?.['content.text']||'').trim();
  const summary=section.elements.find(e=>['summary','copy'].includes(e.slot));
  const text=(summary?.values?.['content.text']||val||'').trim()||
   t('Добавьте подтверждённое описание.','Add verified details.');
  const source=summary?{slot:summary.slot,field:'content.text'}:
   item?{itemId:item.id,field:'content.text'}:null;
  const id=prefix+'-card-1';
  cards.push(card(0,[
   make(id+'-title','heading',t('Информация для проверки','Details to verify'),null,
    {fontSize:24,fontWeight:600,color:'@foreground',fontFamily:font}),
   make(id+'-text','text',text,source,
    {fontSize:'@body',color:'@foreground',lineHeight:150})
  ]));
 }
 // 24 FAQs use 80 nodes including the shell (below host limit 90).
 // Service cards have extra buttons but are capped at 12.
 nodes.push({id:prefix+'-cards',type:'container',
  styles:{display:'grid',columns:Math.min(2,Math.max(1,cards.length)),
   gap:'@medium',gridColumnSpan:comp.layout==='mosaic'?2:1},
  responsive:{tablet:{columns:1,gridColumnSpan:1},
   mobile:{columns:1,gridColumnSpan:1}},
  children:cards});
 return {nodes,bindings};
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
 const action=actionSource(section);
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
 const semantic=contentFor(section,composition,language,prefix,detailStyles,font);
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
    ...(wide?{responsive:{tablet:{gridColumnSpan:mainCols===3?2:1},
     mobile:{gridColumnSpan:1}}}:{}),
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
       radius:'@soft',fontWeight:700,maxWidth:240,minHeight:48},
      states:{hover:{opacity:85},focus:{borderWidth:2,borderColor:'@foreground'}}}
    ]
   },{
    id:prefix+'-detail',type:'container',
    styles:{display:'flex',direction:'column',gap:'@small',
     ...(reverse?{order:-1}:{}),
     ...(wide&&layout==='mosaic'?{gridColumnSpan:2}:{})},
    responsive:{mobile:{gridColumnSpan:1,order:0}},
    children:[
     {id:prefix+'-decoration',type:'icon',icon:iconMap[art]||'arrow',
      styles:{fontSize:32,color:'@accent'}},
     ...semantic.nodes
    ]
   }]
  }]
 };
 return graph;
}
// Reconstruct canonical provenance from the original typed section. Caller
// mapping metadata is descriptive, never authority to redirect CMS content.
function bindingsFor(section,comp){
 const prefix=section.id+'-dg';
 const bindings=contentFor(section,comp,'en',prefix,{},'system').bindings;
 // Bind only the SEMANTIC VALUES actually selected for rendering.
 // Otherwise editing "second" or a selected CTA "primary" can leave stale
 // graph text while a different field receives updates.
 const heading=textSource(section,['heading','title','first'],'content.text');
 const description=textSource(section,['summary','copy','second'],'content.text');
 if(heading)bindings.push({nodeId:prefix+'-heading',source:heading});
 if(description)bindings.push({nodeId:prefix+'-text',source:description});
 const action=actionSource(section);
 if(action){
  if(typeof action.values['content.text']==='string')
   bindings.push({nodeId:prefix+'-action',
    source:{slot:action.slot,field:'content.text'}});
  bindings.push({nodeId:prefix+'-action',
   source:{slot:action.slot,field:'behavior.href'},property:'href'});
 }
 return bindings;
}
function bindingSignatures(bindings){
 return bindings.map(binding=>{
  if(!binding||!binding.source||typeof binding.nodeId!=='string')return null;
  const keys=Object.keys(binding).sort().join(',');
  if(keys!==(binding.property===undefined?'nodeId,source':'nodeId,property,source'))return null;
  const src=binding.source,srcKeys=Object.keys(src).sort().join(',');
  if(srcKeys!==(own(src,'slot')?'field,slot':'field,itemId')||
     typeof src.field!=='string'||
     typeof (own(src,'slot')?src.slot:src.itemId)!=='string')return null;
  if(binding.property!==undefined&&!['text','href'].includes(binding.property))return null;
  return JSON.stringify([binding.nodeId,binding.property||'text',
   own(src,'slot')?'slot':'itemId',own(src,'slot')?src.slot:src.itemId,src.field]);
 }).sort();
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
 // D3's stable semantic fallback intentionally has generic sample copy.
 // On this optional lead branch ONLY, preserve validated owner-entered facts
 // when they exist; never regenerate the original immutable D6 package.
 const facts=workspace.project.facts;
 if(c.category==='services'&&section.component==='service-grid'&&
    Array.isArray(facts.services)&&facts.services.length){
  const prototype=section.items[0]?.values;
  if(!prototype)fail('Missing declared service-grid repeater');
  const rows=facts.services.slice(0,12).map((service,i)=>({
   id:section.id+'-item-'+(i+1),
   values:{...prototype,'content.title':service.title,
    'content.text':service.description,'behavior.href':'/contact/'}
  }));
  // CMS min repeater length is 2; retain a plainly marked draft row if
  // only one real owner item was provided, not a fabricated service claim.
  if(rows.length<2)rows.push({...section.items[1],
   id:section.id+'-item-2'});
  section.items=rows;
 }
 if(c.category==='hero'&&section.component==='company-hero'){
  const set=(slot,key,value)=>{
   if(!value?.trim())return;
   const field=section.elements.find(el=>el.slot===slot);
   if(field&&own(field.values,key))field.values[key]=value;
  };
  set('heading','content.text',facts.headline||facts.title);
  set('summary','content.text',facts.description);
  set('action','content.text',facts.ctaLabel);
 }
 site.designTokens=tokens(theme,c);
 section.designGraph=graphFor(section,c,theme,workspace.project.language);
 const contentBindings=bindingsFor(section,c);
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
   contentBindings,semanticContentMode:'snapshot-requires-host-reconciliation',
   editable:['graph nodes','headings','text','button','design tokens',
    'grid/flex compositions','pattern-specific spacing and card treatments',
    'font family and tracking','gradients','decorative icons','motion with reduced-motion',
    'desktop layout','tablet/mobile overrides','hover/focus states'],
   fidelity:'partial',approvedForPublish:false,
   integration_required:['complex D3 art','rich galleries and native scroll snap',
    'automatic graph/repeater synchronization','owner factual verification',
    'main CMS authorization and save/revision workflow']},
  expectedSdk:'Lead Design Graph v1; not supported by the older feature branch SDK'
 };
}
// Two-sided change detection for an explicit CMS content synchronization.
// This is deliberately NOT an automatic two-way binding. A host may preview
// changes/conflicts before applying, without touching any source document.
function prepareReconciliation(candidate,editedSite,hostSdk,hostRegistry){
 if(!candidate||candidate.format!==FORMAT||candidate.version!==1||
    !candidate.mapping||candidate.mapping.semanticContentMode!=='snapshot-requires-host-reconciliation')
  fail('Expected versioned host graph candidate');
 if(!hostSdk||typeof hostSdk.validateSite!=='function'||
    typeof hostSdk.inspectSite!=='function'||!hostRegistry)
  fail('Explicit current host SDK and registry required');
 const bindings=candidate.mapping.contentBindings;
 if(!Array.isArray(bindings)||bindings.length>80)fail('Invalid provenance bindings');
 const baseline=hostSdk.validateSite(JSON.parse(JSON.stringify(candidate.site)),hostRegistry);
 const site=JSON.parse(JSON.stringify(hostSdk.validateSite(editedSite,hostRegistry)));
 if(site.siteId!==baseline.siteId||site.pages[0]?.id!==baseline.pages[0]?.id)
  fail('Candidate belongs to a different CMS site or page');
 const section=site.pages[0].sections.find(s=>s.id==='df-selected-composition');
 const original=baseline.pages[0].sections.find(s=>s.id==='df-selected-composition');
 if(!section||!original||!section.designGraph||!original.designGraph||
    !section.designGraph.nodes.length||
    section.component!==original.component||
    section.manifestVersion!==original.manifestVersion||
    section.designGraph.id!==original.designGraph.id)
  fail('Selected editable graph section mismatch');
 // Repeater additions, removals and reorderings change the graph structure,
 // not just text; do not allow stale or silently missing editable cards.
 const ids=s=>(s.items||[]).map(item=>item.id);
 if(JSON.stringify(ids(section))!==JSON.stringify(ids(original)))
  fail('Repeater structure changed; review and rebuild candidate');
 // Image/media changes are not represented by this optional partial graph.
 // A previously honest empty-media prompt must not become false content.
 if(['photo-gallery','media-story'].includes(section.component)){
  const media=s=>JSON.stringify({
   elements:s.elements.filter(el=>own(el.values,'content.media'))
    .map(el=>[el.slot,el.values['content.media']]),
   items:(s.items||[]).map(item=>[item.id,item.values['content.media']||'',
    item.values['content.caption']||''])
  });
  if(media(section)!==media(original))
   fail('Unsupported media content changed; review visual parity and rebuild candidate');
 }
 // The graph uses a precedence rule among optional heading/summary/CTA
 // slots. A newly populated higher-priority slot can change what the graph
 // would render. Refuse a stale snapshot instead of silently updating a
 // different lower-priority field; host must review/rebuild the candidate.
 const visibleSource=s=>({
  heading:textSource(s,['heading','title','first'],'content.text'),
  description:textSource(s,['summary','copy','second'],'content.text'),
  action:actionSource(s)?.slot||null
 });
 const beforeSources=visibleSource(original),afterSources=visibleSource(section);
 if(JSON.stringify(beforeSources)!==JSON.stringify(afterSources))
  fail('Visible semantic source selection changed; review and rebuild candidate');
 const index=graph=>{
  const nodes=new Map();
  const walk=n=>{
   if(nodes.has(n.id))fail('Duplicate graph node');
   nodes.set(n.id,n);for(const child of n.children||[])walk(child);
  };
  for(const root of graph.nodes)walk(root);
  return nodes;
 };
 // Verify the exact set of expected bindings before comparing any content.
 // This prevents valid-looking retargets to another service or graph node and
 // refuses silently removed bindings. JSON key/array ordering is not identity.
 let composition;
 try{composition=catalog.get(candidate.mapping.composition);}
 catch(error){fail('Unknown composition in provenance');}
 if(!composition||composition.id!==candidate.mapping.composition)
  fail('Unknown composition in provenance');
 const expected=bindingSignatures(bindingsFor(original,composition));
 const received=bindingSignatures(bindings);
 if(expected.length!==received.length||
    received.some((value,i)=>!value||value!==expected[i]))
  fail('Provenance binding mismatch: reselect the original candidate');
 const nodes=index(section.designGraph),oldNodes=index(original.designGraph);
 const changes=[],conflicts=[],preservedGraphEdits=[],seen=new Set();
 const sourceValues=(s,source)=>{
  const values=own(source,'slot')?
   s.elements.find(e=>e.slot===source.slot)?.values:
   s.items?.find(i=>i.id===source.itemId)?.values;
  if(!values||!own(values,source.field)||typeof values[source.field]!=='string')
   fail('Source was removed: '+source.field);
  return values[source.field];
 };
 for(const binding of bindings){
  if(!binding||typeof binding.nodeId!=='string'||
    !binding.nodeId.startsWith(section.id+'-dg-')||
    !binding.source||typeof binding.source!=='object'||
    !['text','href'].includes(binding.property||'text'))
   fail('Invalid source binding');
  const source=binding.source;
  if(Object.keys(source).some(k=>!['slot','itemId','field'].includes(k))||
    typeof source.field!=='string'||source.field.length>100||
    (own(source,'slot')===own(source,'itemId'))||
    (own(source,'slot')&&typeof source.slot!=='string')||
    (own(source,'itemId')&&typeof source.itemId!=='string'))
   fail('Invalid binding source');
  const property=binding.property||'text',target=nodes.get(binding.nodeId),
    initial=oldNodes.get(binding.nodeId);
  if(!target||!initial||target.type!==initial.type||
    (property==='href'&&target.type!=='button')||
    (property==='text'&&!['heading','text','button'].includes(target.type))||
    typeof target[property]!=='string'||typeof initial[property]!=='string')
   fail('Bound target was removed or changed: '+binding.nodeId);
  const marker=binding.nodeId+':'+property;
  if(seen.has(marker))fail('Duplicate source binding');
  seen.add(marker);
  const from=sourceValues(original,source),to=sourceValues(section,source);
  const before=initial[property],current=target[property];
  const sourceChanged=to!==from,graphChanged=current!==before;
  const descriptor={nodeId:binding.nodeId,property,source:{...source}};
  if(sourceChanged&&graphChanged&&current!==to)
   conflicts.push(descriptor);
  else if(sourceChanged&&current!==to)
   changes.push({...descriptor,value:to});
  else if(graphChanged&&!sourceChanged)
   preservedGraphEdits.push(descriptor);
 }
 return {site,section,nodes,changes,conflicts,preservedGraphEdits};
}
function inspectSemanticSync(candidate,editedSite,hostSdk,hostRegistry){
 const plan=prepareReconciliation(candidate,editedSite,hostSdk,hostRegistry);
 return {
  format:'manufact-design-factory-reconciliation-preview-v1',version:1,
  canApply:plan.conflicts.length===0,
  changes:plan.changes.map(({nodeId,property,source})=>({nodeId,property,source})),
  conflicts:plan.conflicts,
  preservedGraphEdits:plan.preservedGraphEdits,
  noMutation:true
 };
}
// Apply only on an explicit action authorized by the host CMS.
// If graph text and its corresponding semantic field both changed, refuse
// to pick a winner silently. Graph-authored text edits with unchanged source
// survive, as do typography, layout, responsive styles and interactions.
function reconcileSemantic(candidate,editedSite,hostSdk,hostRegistry){
 const plan=prepareReconciliation(candidate,editedSite,hostSdk,hostRegistry);
 if(plan.conflicts.length)
  fail('Conflicting semantic and graph content edits: '+plan.conflicts.map(x=>x.nodeId).join(', '));
 for(const edit of plan.changes)plan.nodes.get(edit.nodeId)[edit.property]=edit.value;
 const checked=hostSdk.validateSite(plan.site,hostRegistry);
 if(hostSdk.inspectSite(checked,hostRegistry).errors.length)
  fail('Synced graph has invalid internal links');
 return {...candidate,site:checked};
}
module.exports=Object.freeze({FORMAT,tokens,graphFor,buildHostCandidate,inspectSemanticSync,reconcileSemantic});
