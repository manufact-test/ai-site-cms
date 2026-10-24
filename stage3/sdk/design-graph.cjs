'use strict';
// Optional AI-authored Design Graph v1. A closed, typed design AST, never HTML/CSS/JS.
// Independent from Design Factory's branch: integration requires a later explicit adapter.
const IDENT=/^[a-z][a-z0-9-]{2,79}$/,TOKEN=/^[a-z][a-z0-9-]{1,39}$/;
const SAFE_URL=/^\/(?!\/)[a-zA-Z0-9/_#?=&.%-]*$/;
const ICON_PATHS=Object.freeze({
 check:'<path d="M5 12l4 4L19 6"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 star:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z"/>',
 sparkles:'<path d="m12 3 2 7 7 2-7 2-2 7-7-2 7-2z"/>',
 shield:'<path d="M12 2 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
 play:'<path d="m8 5 12 7-12 7z"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>'
});
const MOTIONS=['none','fade-in','fade-up','slide-left','zoom-in'];
const TYPES=['container','heading','text','button','image','divider','icon','video'];
const STYLE_KEYS=['display','columns','direction','align','justify','gap','padding','radius',
  'color','background','fontSize','fontWeight','lineHeight','maxWidth','position','top','left',
  'opacity','borderColor','borderWidth','textAlign','order','hidden','rowGap','columnGap',
  'paddingX','paddingY','marginTop','marginBottom','widthPercent','minHeight','gridColumnSpan',
  'flexWrap','flexGrow','alignSelf','letterSpacing','fontFamily','objectFit','aspectRatio',
  'overflow','shadow','gradient','right','bottom','zIndex','widthPx','heightPx','minWidth','maxHeight','gridRowSpan','flexBasisPercent','flexShrink','justifySelf','alignContent','gridAutoFlow','objectPositionX','objectPositionY','outlineColor','outlineWidth','textDecoration','whiteSpace'];
const DEFAULT_TOKENS=Object.freeze({
  colors:{foreground:'#182b3d',background:'#ffffff',accent:'#0a5bff',muted:'#667788'},
  spacing:{small:12,medium:24,large:48},
  radii:{soft:12,round:24},
  typography:{body:16,heading:42}
});
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fail=(at,message)=>{throw Error('Design Graph '+message+' @ '+at);};
function keys(obj,allowed,at){
  if(!object(obj)||Object.keys(obj).some(k=>!allowed.includes(k)))fail(at,'unknown keys');
}
function number(n,min,max){return Number.isInteger(n)&&n>=min&&n<=max;}
function validateTokens(input){
  const t=input===undefined?DEFAULT_TOKENS:input;
  keys(t,['colors','spacing','radii','typography'],'tokens');
  for(const kind of ['colors','spacing','radii','typography']){
    const group=t[kind];
    if(!object(group)||Object.keys(group).length>30)fail('tokens.'+kind,'invalid group');
    for(const [name,value] of Object.entries(group)){
      if(!TOKEN.test(name))fail('tokens.'+kind,'invalid token name');
      if(kind==='colors'?!/^#[a-f0-9]{6}$/i.test(value):!number(value,kind==='typography'?8:0,kind==='typography'?120:240))
        fail('tokens.'+kind+'.'+name,'invalid token value');
    }
  }
  return t;
}
function resolve(value,kind,tokens,at){
  if(typeof value==='string'&&value.startsWith('@')){
    const token=value.slice(1),group=tokens[kind];
    if(!own(group,token))fail(at,'unknown '+kind+' token');
    return group[token];
  }
  if(kind==='colors'){
    if(typeof value!=='string'||!/^#[a-f0-9]{6}$/i.test(value))fail(at,'invalid color');
  }else if(!number(value,0,kind==='typography'?120:kind==='spacing'?240:240))
    fail(at,'invalid numeric length');
  return value;
}
function validateStyle(style,tokens,at,mode='base'){
  keys(style,STYLE_KEYS,at);
  const enums={
    display:['block','grid','flex','none'],direction:['row','column'],
    align:['start','center','end','stretch','between'],justify:['start','center','end','stretch','between'],
    alignSelf:['auto','start','center','end','stretch'],position:['static','relative','absolute'],
    textAlign:['left','center','right'],flexWrap:['nowrap','wrap'],
    fontFamily:['inherit','system','arial','georgia','serif','mono'],
    objectFit:['cover','contain','fill','none'],aspectRatio:['auto','square','portrait','landscape','wide'],
    overflow:['visible','hidden','auto'],shadow:['none','soft','medium','strong'],justifySelf:['auto','start','center','end','stretch'],alignContent:['start','center','end','stretch','between'],gridAutoFlow:['row','column','row-dense','column-dense'],textDecoration:['none','underline','line-through'],whiteSpace:['normal','nowrap','pre-line']
  };
  const ranges={columns:[1,12],gridColumnSpan:[1,12],flexGrow:[0,6],fontWeight:[100,900],
    lineHeight:[80,250],letterSpacing:[-50,200],maxWidth:[0,1920],widthPercent:[1,100],
    borderWidth:[0,12],order:[-30,30],opacity:[0,100],outlineWidth:[0,8],zIndex:[-10,30],widthPx:[1,1920],heightPx:[1,1400],minWidth:[0,1920],maxHeight:[0,1600],gridRowSpan:[1,12],flexBasisPercent:[0,100],flexShrink:[0,1],objectPositionX:[0,100],objectPositionY:[0,100],marginTop:[-160,160],marginBottom:[-160,160]};
  for(const [key,value] of Object.entries(style)){
    if(mode==='state'&&!['color','background','borderColor','borderWidth','radius','opacity','gradient','outlineColor','outlineWidth'].includes(key))
      fail(at,'unsupported interaction state property');
    if(['color','background','borderColor','outlineColor'].includes(key)){resolve(value,'colors',tokens,at+'/'+key);continue;}
    if(key==='gradient'){
      keys(value,['angle','from','to','via','viaAt'],at+'/gradient');
      if(!number(value.angle,0,360)||!own(value,'from')||!own(value,'to')||own(value,'via')!==own(value,'viaAt')||
        (own(value,'viaAt')&&!number(value.viaAt,1,99)))fail(at,'invalid gradient');
      resolve(value.from,'colors',tokens,at+'/from');resolve(value.to,'colors',tokens,at+'/to');
      if(own(value,'via'))resolve(value.via,'colors',tokens,at+'/via');continue;
    }
    if(['gap','rowGap','columnGap','padding','paddingX','paddingY','top','left','right','bottom','minHeight'].includes(key)){
      resolve(value,'spacing',tokens,at+'/'+key);continue;
    }
    if(key==='radius'||key==='fontSize'){
      resolve(value,key==='radius'?'radii':'typography',tokens,at+'/'+key);continue;
    }
    if(own(enums,key)){if(!enums[key].includes(value))fail(at,key);continue;}
    if(own(ranges,key)){if(!number(value,...ranges[key]))fail(at,key);continue;}
    if(key==='hidden'){if(typeof value!=='boolean')fail(at,key);continue;}
    fail(at,'invalid style '+key);
  }
  if(own(style,'widthPx')&&own(style,'widthPercent'))fail(at,'competing width units');
}
function validateMotion(motion,at){
  keys(motion,['effect','duration','delay'],at);
  if(!MOTIONS.includes(motion.effect)||!number(motion.duration,150,2000)||!number(motion.delay,0,1000))
    fail(at,'invalid motion');
}
function validateGraph(graph,assetIds,existingIds,tokensInput,mediaKinds=new Map()){
  keys(graph,['version','id','nodes'],'graph');
  if(graph.version!==1||!IDENT.test(graph.id))fail('graph','unsupported version/id');
  const tokens=validateTokens(tokensInput),seen=existingIds||new Set();
  if(seen.has(graph.id))fail('graph','duplicate graph id');
  seen.add(graph.id);
  if(!Array.isArray(graph.nodes)||graph.nodes.length<1||graph.nodes.length>30)
    fail('graph.nodes','invalid number of roots');
  let count=0;
  function visit(node,depth){
    if(depth>8||++count>90)fail('graph','excessive depth or node count');
    keys(node,['id','type','text','href','assetId','alt','level','styles','responsive','states','children','icon','motion','posterAssetId','loop'],'node');
    if(!IDENT.test(node.id)||seen.has(node.id)||!TYPES.includes(node.type))fail('node','duplicate id / unknown type');
    seen.add(node.id);
    if(node.type==='container'||node.type==='divider'){
      if(own(node,'text')||own(node,'href')||own(node,'assetId')||own(node,'alt')||own(node,'level')||own(node,'posterAssetId')||own(node,'loop'))
        fail(node.id,'invalid container content');
    }else if(node.type==='icon'){
      if(!own(ICON_PATHS,node.icon)||own(node,'text')||own(node,'href')||own(node,'assetId')||
        own(node,'level')||own(node,'children')||own(node,'posterAssetId')||own(node,'loop')||
        (own(node,'alt')&&(typeof node.alt!=='string'||node.alt.length>200||/[\x00-\x1f]/.test(node.alt))))
        fail(node.id,'invalid icon');
    }else if(node.type==='video'){
      if(typeof node.assetId!=='string'||!assetIds.has(node.assetId)||
        mediaKinds.get(node.assetId)!=='video/mp4'||
        typeof node.alt!=='string'||node.alt.length<1||node.alt.length>200||
        /[\x00-\x1f]/.test(node.alt)||own(node,'text')||own(node,'href')||
        own(node,'level')||own(node,'icon')||
        (own(node,'loop')&&typeof node.loop!=='boolean')||
        (own(node,'posterAssetId')&&(!assetIds.has(node.posterAssetId)||
          !/^image\/(?:png|jpeg|webp)$/.test(mediaKinds.get(node.posterAssetId)||''))))
        fail(node.id,'invalid video binding');
    }else if(node.type==='image'){
      if(typeof node.assetId!=='string'||!assetIds.has(node.assetId)||
        mediaKinds.get(node.assetId)==='video/mp4'||own(node,'posterAssetId')||own(node,'loop')||
        typeof node.alt!=='string'||node.alt.length>200||/[\x00-\x1f]/.test(node.alt)||
        own(node,'text')||own(node,'href')||own(node,'level')||own(node,'icon'))fail(node.id,'invalid image binding');
    }else{
      if(typeof node.text!=='string'||node.text.length>3000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(node.text)||
        own(node,'assetId')||own(node,'alt')||own(node,'icon')||own(node,'posterAssetId')||own(node,'loop'))fail(node.id,'invalid text');
      if(node.type==='button'&&
        (typeof node.href!=='string'||node.href.length>300||
         !SAFE_URL.test(node.href)&&!/^https:\/\/[a-z0-9.-]+(?:\/[^\s"'<>\\]*)?$/i.test(node.href)))
        fail(node.id,'unsafe link');
      if(node.type!=='button'&&own(node,'href'))fail(node.id,'unexpected link');
      if(node.type==='heading'&&(!number(node.level||2,1,6)))fail(node.id,'heading level');
      if(node.type!=='heading'&&own(node,'level'))fail(node.id,'unexpected level');
    }
    validateStyle(node.styles||{},tokens,node.id+'/styles');
    if(own(node,'motion'))validateMotion(node.motion,node.id+'/motion');
    if(own(node,'responsive')){
      keys(node.responsive,['tablet','mobile'],node.id+'/responsive');
      for(const [bp,st] of Object.entries(node.responsive))validateStyle(st,tokens,node.id+'/'+bp);
    }
    if(own(node,'states')){
      keys(node.states,['hover','focus'],node.id+'/states');
      for(const [state,st] of Object.entries(node.states))validateStyle(st,tokens,node.id+'/'+state,'state');
    }
    if(node.type!=='container'&&own(node,'children'))fail(node.id,'noncontainer children');
    if(node.type==='container'){
      if(!Array.isArray(node.children)||node.children.length>30)fail(node.id,'container children');
      node.children.forEach(n=>visit(n,depth+1));
    }
  }
  graph.nodes.forEach(n=>visit(n,0));return graph;
}
function baseGraph(sectionId){
  return {version:1,id:sectionId+'-design',nodes:[
    {id:sectionId+'-layout',type:'container',styles:{display:'grid',columns:2,gap:'@large',padding:'@large',align:'center'},
      responsive:{mobile:{columns:1,gap:'@medium',padding:'@medium'}},children:[
      {id:sectionId+'-title',type:'heading',level:2,text:'Ваш уникальный заголовок',
        styles:{fontSize:'@heading',color:'@foreground',lineHeight:115}},
      {id:sectionId+'-copy',type:'text',text:'Все элементы, сетки, отступы и стили редактируются в CMS.',
        styles:{fontSize:'@body',color:'@muted'}}
    ]}
  ]};
}

/**
 * Atomic, AI-free structural editing of an existing typed composition.
 * Never mutates source, preserves every descendant property and media asset reference.
 * The final edit is still validated by the normal site/asset contract on Apply.
 */
function editTree(graph,operation){
  if(!object(operation)||!['duplicate','move','insert','wrap','unwrap','remove'].includes(operation.action))
    fail('edit','unknown operation');
  const next=JSON.parse(JSON.stringify(graph));
  const scan=()=>{
    if(next.version!==1||!Array.isArray(next.nodes)||next.nodes.length<1||next.nodes.length>30)
      fail('edit','invalid roots');
    const found=new Map();
    const visit=(node,items,depth)=>{
      if(!object(node)||typeof node.id!=='string'||!IDENT.test(node.id)||
        found.has(node.id)||!TYPES.includes(node.type)||depth>8||found.size>=90)
        fail('edit','invalid node, duplicated id or graph limit');
      found.set(node.id,{node,items,depth});
      if(node.type==='container'){
        if(!Array.isArray(node.children)||node.children.length>30)fail('edit','container limit');
        node.children.forEach(child=>visit(child,node.children,depth+1));
      }else if(own(node,'children'))fail('edit','invalid child owner');
    };
    next.nodes.forEach(node=>visit(node,next.nodes,0));
    return found;
  };
  const before=scan(),source=before.get(operation.nodeId);
  if(!source)fail('edit','missing selected node');
  const descendants=[];
  const walk=(node)=>{descendants.push(node);if(node.type==='container')node.children.forEach(walk);};
  walk(source.node);
  if(operation.action==='duplicate'){
    if(!Array.isArray(operation.ids)||operation.ids.length!==descendants.length||
       operation.ids.some(id=>typeof id!=='string'||!IDENT.test(id)||before.has(id))||
       new Set(operation.ids).size!==operation.ids.length)fail('edit','invalid replacement ids');
    const copy=JSON.parse(JSON.stringify(source.node));
    let idx=0;
    const rewrite=(node)=>{node.id=operation.ids[idx++];if(node.type==='container')node.children.forEach(rewrite);};
    rewrite(copy);
    source.items.splice(source.items.indexOf(source.node)+1,0,copy);
  }else if(operation.action==='insert'){
    const target=before.get(operation.targetId);
    if(!target||!['before','after','inside'].includes(operation.placement)||
       !object(operation.node))fail('edit','invalid insertion');
    if(operation.placement==='inside'){
      if(target.node.type!=='container')fail('edit','destination not a container');
      target.node.children.push(JSON.parse(JSON.stringify(operation.node)));
    }else{
      target.items.splice(target.items.indexOf(target.node)+(operation.placement==='after'?1:0),
        0,JSON.parse(JSON.stringify(operation.node)));
    }
  }else if(operation.action==='move'){
    const target=before.get(operation.targetId);
    if(!target||!['before','after','inside'].includes(operation.placement)||
       descendants.some(n=>n.id===operation.targetId))
      fail('edit','invalid destination or cycle');
    if(operation.placement==='inside'&&target.node.type!=='container')
      fail('edit','destination not a container');
    source.items.splice(source.items.indexOf(source.node),1);
    if(operation.placement==='inside')target.node.children.push(source.node);
    else target.items.splice(target.items.indexOf(target.node)+(operation.placement==='after'?1:0),0,source.node);
  }else if(operation.action==='wrap'){
    if(typeof operation.wrapperId!=='string'||!IDENT.test(operation.wrapperId)||
      before.has(operation.wrapperId))fail('edit','invalid wrapper id');
    source.items.splice(source.items.indexOf(source.node),1,{
      id:operation.wrapperId,type:'container',
      styles:{display:'flex',direction:'column',gap:16},children:[source.node]
    });
  }else if(operation.action==='unwrap'){
    if(source.node.type!=='container'||!source.node.children.length)
      fail('edit','only a nonempty container can be unwrapped');
    source.items.splice(source.items.indexOf(source.node),1,...source.node.children);
  }else{
    if(before.size===descendants.length)fail('edit','cannot remove all graph nodes');
    source.items.splice(source.items.indexOf(source.node),1);
  }
  scan();
  return next;
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function declarations(style,t){
  const css=[],put=(k,v)=>css.push(k+':'+v);
  const aliases={display:'display',direction:'flex-direction',color:'color',fontWeight:'font-weight',
    maxWidth:'max-width',position:'position',textAlign:'text-align',order:'order',
    flexWrap:'flex-wrap',flexGrow:'flex-grow',flexShrink:'flex-shrink',overflow:'overflow',objectFit:'object-fit',zIndex:'z-index',justifySelf:'justify-self',textDecoration:'text-decoration',whiteSpace:'white-space'};
  const pixel={gap:'gap',rowGap:'row-gap',columnGap:'column-gap',padding:'padding',
    paddingX:'padding-inline',paddingY:'padding-block',marginTop:'margin-top',
    marginBottom:'margin-bottom',radius:'border-radius',fontSize:'font-size',
    minHeight:'min-height',top:'top',left:'left',right:'right',bottom:'bottom',widthPx:'width',heightPx:'height',minWidth:'min-width',maxHeight:'max-height'};
  for(const [k,v] of Object.entries(style)){
    if(k==='gradient'){
      put('background-image','linear-gradient('+v.angle+'deg,'+resolve(v.from,'colors',t,k)+','+(own(v,'via')?resolve(v.via,'colors',t,k)+' '+v.viaAt+'%,':'')+
        resolve(v.to,'colors',t,k)+')');continue;
    }
    const color=['color','background','borderColor','outlineColor'].includes(k);
    const spacing=['gap','rowGap','columnGap','padding','paddingX','paddingY','top','left','right','bottom','minHeight'].includes(k);
    const group=spacing?'spacing':k==='radius'?'radii':k==='fontSize'?'typography':null;
    const value=color?resolve(v,'colors',t,k):group?resolve(v,group,t,k):v;
    if(own(aliases,k)){put(aliases[k],k==='maxWidth'?value+'px':value);continue;}
    if(k==='hidden'){if(value)put('display','none');continue;}
    if(k==='columns'){put('grid-template-columns','repeat('+value+',minmax(0,1fr))');continue;}
    if(k==='gridColumnSpan'){put('grid-column','span '+value);continue;}
    if(k==='gridRowSpan'){put('grid-row','span '+value);continue;}
    if(k==='gridAutoFlow'){put('grid-auto-flow',value.replace('-', ' '));continue;}
    if(k==='flexBasisPercent'){put('flex-basis',value+'%');continue;}
    if(k==='objectPositionX'||k==='objectPositionY'){put(k==='objectPositionX'?'--cmsdg-object-x':'--cmsdg-object-y',value+'%');continue;}
    if(k==='alignContent'){put('align-content',value==='between'?'space-between':value==='start'?'flex-start':value==='end'?'flex-end':value);continue;}
    if(['align','justify','alignSelf'].includes(k)){
      put({align:'align-items',justify:'justify-content',alignSelf:'align-self'}[k],
        value==='between'?'space-between':value==='start'?'flex-start':value==='end'?'flex-end':value);continue;
    }
    if(k==='fontFamily'){
      put('font-family',{inherit:'inherit',system:'system-ui,Arial,sans-serif',arial:'Arial,sans-serif',
        georgia:'Georgia,serif',serif:'ui-serif,Georgia,serif',mono:'ui-monospace,monospace'}[value]);continue;
    }
    if(k==='aspectRatio'){
      put('aspect-ratio',{auto:'auto',square:'1/1',portrait:'3/4',landscape:'4/3',wide:'16/9'}[value]);continue;
    }
    if(k==='shadow'){
      put('box-shadow',{none:'none',soft:'0 5px 16px #10182020',medium:'0 12px 32px #10182033',
        strong:'0 20px 56px #1018204d'}[value]);continue;
    }
    if(own(pixel,k)){put(pixel[k],value+'px');continue;}
    if(k==='widthPercent'){put('width',value+'%');continue;}
    if(k==='letterSpacing'){put('letter-spacing',(value/10).toFixed(1)+'px');continue;}
    if(k==='background')put('background-color',value);
    if(k==='borderColor')put('border-color',value);
    if(k==='outlineColor')put('outline-color',value);
    if(k==='outlineWidth'){put('outline-style','solid');put('outline-width',value+'px');put('outline-offset','2px');}
    if(k==='lineHeight')put('line-height',(value/100).toFixed(2));
    if(k==='opacity')put('opacity',(value/100).toFixed(2));
    if(k==='borderWidth'){put('border-style','solid');put('border-width',value+'px');}
  }
  return css.join(';');
}
function render(site,graph,mount='',mediaPreview=null,sectionId=graph.id,videoPreview=null){
  validateGraph(graph,new Set(site.assets.map(x=>x.id)),new Set(),
    site.designTokens,new Map(site.assets.map(x=>[x.id,x.mime])));
  const tokens=validateTokens(site.designTokens);
  const assets=new Map(site.assets.map(a=>[a.id,a])),rules=[];
  const scope='.cmsdg-'+graph.id;
  const attr=s=>escapeHtml(s);
  function visit(n){
    const selector=scope+' .cmsdg-n-'+n.id;
    const baseline=declarations(n.styles||{},tokens);
    if(baseline)rules.push(selector+'{'+baseline+'}');
    for(const bp of ['tablet','mobile']){
      const css=declarations(n.responsive?.[bp]||{},tokens);
      if(css)rules.push('@media(max-width:'+(bp==='tablet'?'900':'600')+'px){'+selector+'{'+css+'}}');
    }
    for(const state of ['hover','focus']){
      const css=declarations(n.states?.[state]||{},tokens);
      if(css)rules.push(selector+(state==='focus'?':focus-visible':':hover')+'{'+css+'}');
    }
    if(n.motion&&n.motion.effect!=='none')rules.push(selector+'{animation:cmsdg-'+n.motion.effect+' '+n.motion.duration+'ms ease-out '+n.motion.delay+'ms both}');
    const cls='cmsdg-n-'+n.id;
    if(n.type==='container')return '<div class="'+cls+'">'+n.children.map(visit).join('')+'</div>';
    if(n.type==='divider')return '<hr class="'+cls+'">';
    if(n.type==='icon')return '<svg class="'+cls+'" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '+(n.alt?'role="img" aria-label="'+attr(n.alt)+'"':'aria-hidden="true"')+'>'+ICON_PATHS[n.icon]+'</svg>';
    if(n.type==='heading')return '<h'+(n.level||2)+' class="'+cls+'">'+attr(n.text)+'</h'+(n.level||2)+'>';
    if(n.type==='text')return '<p class="'+cls+'">'+attr(n.text)+'</p>';
    if(n.type==='button')return '<a class="'+cls+'" href="'+attr(n.href.startsWith('/')?mount+n.href:n.href)+'">'+attr(n.text)+'</a>';
    if(n.type==='video'){
      const videoAsset=assets.get(n.assetId);
      const videoSrc=videoPreview?videoPreview(n.assetId):mount+videoAsset.src;
      if(!videoSrc)return '<div class="'+cls+'" role="status">Загружается защищённое видео</div>';
      const poster=n.posterAssetId?assets.get(n.posterAssetId):null;
      const posterSource=poster?(mediaPreview?mediaPreview(n.posterAssetId):mount+poster.src):null;
      const posterHtml=posterSource?' poster="'+attr(posterSource)+'"':'';
      // No autoplay, external providers, unknown formats, script or iframe.
      return '<video class="'+cls+'" controls playsinline preload="metadata"'+
        (n.loop?' loop':'')+posterHtml+' aria-label="'+attr(n.alt)+'">'+
        '<source src="'+attr(videoSrc)+'" type="video/mp4">'+
        'Ваш браузер не поддерживает видео.</video>';
    }
    const asset=assets.get(n.assetId),src=mediaPreview?mediaPreview(n.assetId):null;
    if(!asset)return '';
    const base=src||mount+asset.src;
    const variants=asset.variants||[];
    const responsive=src?'':(variants.length?' srcset="'+variants.map(v=>attr(mount+v.src)+' '+v.width+'w').join(', ')+'" sizes="(max-width:600px) 100vw, (max-width:900px) 50vw, 100vw"':'');
    return '<img loading="lazy" class="'+cls+'" src="'+attr(base)+'"'+responsive+' alt="'+attr(n.alt)+'">';
  }
  const html=graph.nodes.map(visit).join('');
  return '<section class="cmsdg '+('cmsdg-'+graph.id)+'" id="'+attr(sectionId)+'"><style>'+
    scope+'{min-width:0;max-width:none;padding:0;min-height:0}'+scope+' *{box-sizing:border-box;min-width:0}'+
    scope+' img,'+scope+' video{max-width:100%;height:auto;object-position:var(--cmsdg-object-x,50%) var(--cmsdg-object-y,50%)}'+scope+' svg{display:inline-block;vertical-align:middle;flex:none}'+
    '@keyframes cmsdg-fade-in{from{opacity:0}to{opacity:1}}'+
    '@keyframes cmsdg-fade-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}'+
    '@keyframes cmsdg-slide-left{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}'+
    '@keyframes cmsdg-zoom-in{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}'+
    '@media(prefers-reduced-motion:reduce){'+scope+' [class*="cmsdg-n-"]{animation:none!important;transition:none!important}}'+
    rules.join('')+'</style>'+html+'</section>';
}
module.exports=Object.freeze({validateTokens,validateStyle,validateGraph,baseGraph,editTree,render,DEFAULT_TOKENS,TYPES,STYLE_KEYS,MOTIONS,ICON_PATHS});
