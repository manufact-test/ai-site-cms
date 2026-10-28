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
const TYPES=['container','heading','text','button','image','divider','icon','video','disclosure','tabs','tab','list','list-item','link','quote','gallery','table','table-row','table-cell'];
const STYLE_KEYS=['display','columns','direction','align','justify','gap','padding','radius',
  'color','background','fontSize','fontWeight','lineHeight','maxWidth','position','top','left',
  'opacity','borderColor','borderWidth','textAlign','order','hidden','rowGap','columnGap',
  'paddingX','paddingY','marginTop','marginBottom','widthPercent','minHeight','gridColumnSpan',
  'flexWrap','flexGrow','alignSelf','letterSpacing','fontFamily','objectFit','aspectRatio',
  'overflow','shadow','gradient','fluidFont','right','bottom','zIndex','widthPx','heightPx','minWidth','maxHeight','gridRowSpan','flexBasisPercent','flexShrink','justifySelf','alignContent','gridAutoFlow','objectPositionX','objectPositionY','outlineColor','outlineWidth','textDecoration','whiteSpace','fontStyle','textTransform','textWrap','wordBreak','textOverflow','textShadow','gridColumnsPreset','transformOrigin','isolation','mixBlendMode','clipShape','wordSpacing','textIndent','gridColumnStart','gridRowStart','translateX','translateY','rotateDeg','scalePercent','backdropBlur','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius','borderStyle','filterPreset'];
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
    overflow:['visible','hidden','auto'],shadow:['none','soft','medium','strong'],justifySelf:['auto','start','center','end','stretch'],alignContent:['start','center','end','stretch','between'],gridAutoFlow:['row','column','row-dense','column-dense'],textDecoration:['none','underline','line-through'],whiteSpace:['normal','nowrap','pre-line'],
    fontStyle:['normal','italic'],textTransform:['none','uppercase','lowercase','capitalize'],textWrap:['wrap','balance','pretty','nowrap'],wordBreak:['normal','break-all','break-word'],textOverflow:['clip','ellipsis'],textShadow:['none','soft','strong'],gridColumnsPreset:['sidebar-left','sidebar-right','wide-center','editorial'],transformOrigin:['center','top-left','top-right','bottom-left','bottom-right'],isolation:['auto','isolate'],mixBlendMode:['normal','multiply','screen','overlay','darken','lighten'],clipShape:['none','circle','ellipse','diagonal','hexagon'],borderStyle:['solid','dashed','dotted','double'],filterPreset:['none','grayscale','sepia','contrast','vibrant']
  };
  const ranges={columns:[1,12],gridColumnSpan:[1,12],flexGrow:[0,6],fontWeight:[100,900],
    lineHeight:[80,250],letterSpacing:[-50,200],maxWidth:[0,1920],widthPercent:[1,100],
    borderWidth:[0,12],order:[-30,30],opacity:[0,100],outlineWidth:[0,8],zIndex:[-10,30],widthPx:[1,1920],heightPx:[1,1400],minWidth:[0,1920],maxHeight:[0,1600],gridRowSpan:[1,12],flexBasisPercent:[0,100],flexShrink:[0,1],objectPositionX:[0,100],objectPositionY:[0,100],marginTop:[-160,160],marginBottom:[-160,160],wordSpacing:[-40,100],textIndent:[-100,200],gridColumnStart:[1,13],gridRowStart:[1,13],translateX:[-600,600],translateY:[-600,600],rotateDeg:[-180,180],scalePercent:[50,200],backdropBlur:[0,32]};
  for(const [key,value] of Object.entries(style)){
    if(mode==='state'&&!['color','background','borderColor','borderWidth','borderStyle','radius','opacity','gradient','outlineColor','outlineWidth','filterPreset'].includes(key))
      fail(at,'unsupported interaction state property');
    if(['color','background','borderColor','outlineColor'].includes(key)){resolve(value,'colors',tokens,at+'/'+key);continue;}
    if(key==='fluidFont'){
      keys(value,['min','max'],at+'/fluidFont');
      if(!number(value.min,10,120)||!number(value.max,10,120)||value.min>value.max)
        fail(at,'invalid fluid typography');
      continue;
    }
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
    if(key==='radius'||key==='fontSize'||["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"].includes(key)){
      resolve(value,key==='fontSize'?'typography':'radii',tokens,at+'/'+key);continue;
    }
    if(own(enums,key)){if(!enums[key].includes(value))fail(at,key);continue;}
    if(own(ranges,key)){if(!number(value,...ranges[key]))fail(at,key);continue;}
    if(key==='hidden'){if(typeof value!=='boolean')fail(at,key);continue;}
    fail(at,'invalid style '+key);
  }
  if(own(style,'fontSize')&&own(style,'fluidFont'))fail(at,'competing typography controls');
  if(own(style,'widthPx')&&own(style,'widthPercent'))fail(at,'competing width units');
  if(own(style,'columns')&&own(style,'gridColumnsPreset'))fail(at,'competing grid template');
}
function validateMotion(motion,at){
  keys(motion,['effect','duration','delay'],at);
  if(!MOTIONS.includes(motion.effect)||!number(motion.duration,150,2000)||!number(motion.delay,0,1000))
    fail(at,'invalid motion');
}
function validHref(href){
  return typeof href==='string'&&href.length<=300&&(
    SAFE_URL.test(href)||/^https:\/\/[a-z0-9.-]+(?:\/[^\s"'<>\\]*)?$/i.test(href)||
    /^mailto:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,63}$/i.test(href)||
    /^tel:\+[1-9][0-9]{6,14}$/.test(href));
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
  function visit(node,depth,parentType=null){
    if(depth>8||++count>90)fail('graph','excessive depth or node count');
    keys(node,['id','type','text','href','assetId','alt','level','styles','responsive','states','children','icon','motion','posterAssetId','loop','ordered','cite','backgroundMedia','backgroundVideo','responsiveMedia'],'node');
    if(!IDENT.test(node.id)||seen.has(node.id)||!TYPES.includes(node.type))fail('node','duplicate id / unknown type');
    seen.add(node.id);
    if(own(node,'backgroundMedia')){
      if(['image','video','icon','divider','table-row','table-cell'].includes(node.type))
        fail(node.id,'background media not supported on this node');
      const m=node.backgroundMedia;
      keys(m,['assetId','tabletAssetId','mobileAssetId','size','positionX','positionY','overlay'],'backgroundMedia');
      for(const id of [m.assetId,m.tabletAssetId,m.mobileAssetId].filter(v=>v!==undefined)){
        if(typeof id!=='string'||!assetIds.has(id)||
          !['image/jpeg','image/png','image/webp'].includes(mediaKinds.get(id)))
          fail(node.id,'background must reference an uploaded raster image');
      }
      if(!m.assetId||own(m,'size')&&!['cover','contain'].includes(m.size)||
        own(m,'positionX')&&!number(m.positionX,0,100)||
        own(m,'positionY')&&!number(m.positionY,0,100))
        fail(node.id,'invalid background placement');
      if(own(m,'overlay')){
        keys(m.overlay,['color','opacity'],'background overlay');
        resolve(m.overlay.color,'colors',tokens,node.id+'/overlay');
        if(!number(m.overlay.opacity,0,90))fail(node.id,'invalid overlay opacity');
      }
      if([node.styles||{},node.responsive?.tablet||{},node.responsive?.mobile||{}].some(layer=>own(layer,'gradient')))
        fail(node.id,'background image conflicts with CSS gradient');
    }
    // Decorative video backgrounds need a real raster poster for fallbacks.
    if(own(node,'backgroundVideo')){
      if(node.type!=='container'||own(node,'backgroundMedia'))
        fail(node.id,'video backdrop requires a container without a raster background');
      const v=node.backgroundVideo;
      keys(v,['assetId','posterAssetId','tabletPosterAssetId','mobilePosterAssetId','positionX','positionY','overlay'],node.id+'/backgroundVideo');
      if(typeof v.assetId!=='string'||!assetIds.has(v.assetId)||mediaKinds.get(v.assetId)!=='video/mp4')
        fail(node.id,'video backdrop must reference a site-owned MP4');
      for(const key of ['posterAssetId','tabletPosterAssetId','mobilePosterAssetId']){
        const id=v[key];
        if(key==='posterAssetId'||id!==undefined){
          if(typeof id!=='string'||!assetIds.has(id)||
            !['image/png','image/jpeg','image/webp'].includes(mediaKinds.get(id)))
            fail(node.id,'video backdrop poster must be a site-owned raster image');
        }
      }
      if(own(v,'positionX')&&!number(v.positionX,0,100)||
         own(v,'positionY')&&!number(v.positionY,0,100))fail(node.id,'invalid backdrop position');
      if(own(v,'overlay')){
        keys(v.overlay,['color','opacity'],node.id+'/backgroundVideo.overlay');
        resolve(v.overlay.color,'colors',tokens,node.id+'/video overlay');
        if(!number(v.overlay.opacity,0,90))fail(node.id,'invalid video overlay opacity');
      }
      if([node.styles||{},node.responsive?.tablet||{},node.responsive?.mobile||{}].some(layer=>own(layer,'gradient')))
        fail(node.id,'video backdrop conflicts with CSS gradient');
    }
    if(own(node,'responsiveMedia')){
      if(node.type!=='image')fail(node.id,'device images only on image nodes');
      const media=node.responsiveMedia;
      keys(media,['tabletAssetId','mobileAssetId'],node.id+'/responsiveMedia');
      if(!Object.keys(media).length)fail(node.id,'empty device image selection');
      for(const id of Object.values(media)){
        if(typeof id!=='string'||!assetIds.has(id)||
          !['image/png','image/jpeg','image/webp'].includes(mediaKinds.get(id)))
          fail(node.id,'device image must reference a site-owned raster asset');
      }
    }
    if((node.type!=='list'&&own(node,'ordered'))||(node.type==='list'&&own(node,'ordered')&&typeof node.ordered!=='boolean'))fail(node.id,'invalid ordered list flag');
    if(node.type==='table-row'&&parentType!=='table')fail(node.id,'row must belong to table');
    if(parentType==='table'&&node.type!=='table-row')fail(node.id,'table accepts only rows');
    if(node.type==='table-cell'&&parentType!=='table-row')fail(node.id,'cell must belong to row');
    if(parentType==='table-row'&&node.type!=='table-cell')fail(node.id,'row accepts only cells');
    if(parentType==='gallery'&&node.type!=='image')fail(node.id,'gallery accepts only images');
    if(node.type==='list-item'&&parentType!=='list')fail(node.id,'list item must belong to list');
    if(parentType==='list'&&node.type!=='list-item')fail(node.id,'list accepts only list items');
    if(node.type==='tab'&&parentType!=='tabs')fail(node.id,'tab must belong to tabs');
    if(parentType==='tabs'&&node.type!=='tab')fail(node.id,'tabs accept only tab children');
    if(node.type!=='quote'&&own(node,'cite'))fail(node.id,'unexpected citation');
    if(node.type==='quote'&&own(node,'cite')&&
      (typeof node.cite!=='string'||node.cite.length>160||/[\x00-\x1f]/.test(node.cite)))
      fail(node.id,'invalid quote attribution');
    if(node.type==='gallery'){
      if(typeof node.text!=='string'||!node.text.trim()||node.text.length>120||
        /[\x00-\x1f]/.test(node.text)||['href','assetId','alt','level','icon','loop','posterAssetId','ordered'].some(k=>own(node,k)))
        fail(node.id,'invalid gallery label');
    }else if(node.type==='table'){
      if(own(node,'text')&&(typeof node.text!=='string'||node.text.length>160||
        /[\x00-\x1f]/.test(node.text)))fail(node.id,'invalid table caption');
      if(['href','assetId','alt','level','icon','loop','posterAssetId','ordered'].some(k=>own(node,k)))
        fail(node.id,'invalid table metadata');
    }else if(node.type==='container'||node.type==='divider'||node.type==='tabs'||node.type==='list'||node.type==='table-row'){

      if(own(node,'text')||own(node,'href')||own(node,'assetId')||own(node,'alt')||own(node,'level')||own(node,'posterAssetId')||own(node,'loop'))
        fail(node.id,'invalid container content');
    }else if(node.type==='table-cell'){
      if(typeof node.text!=='string'||node.text.length>1600||/[\x00-\x1f]/.test(node.text)||
        ['href','assetId','alt','level','icon','loop','posterAssetId','ordered'].some(k=>own(node,k)))
        fail(node.id,'invalid table cell');
    }else if(node.type==='list-item'){
      if(typeof node.text!=='string'||node.text.length>3000||/[\x00-\x1f]/.test(node.text)||
        own(node,'href')||own(node,'assetId')||own(node,'alt')||own(node,'level')||own(node,'icon')||own(node,'posterAssetId')||own(node,'loop'))
        fail(node.id,'invalid list item');
    }else if(node.type==='disclosure'||node.type==='tab'){
      if(typeof node.text!=='string'||!node.text.trim()||node.text.length>160||
        /[\x00-\x1f]/.test(node.text)||own(node,'href')||own(node,'assetId')||
        own(node,'alt')||own(node,'level')||own(node,'icon')||own(node,'posterAssetId')||own(node,'loop'))
        fail(node.id,'invalid disclosure/tab label');
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
      if(own(node,'href')&&!validHref(node.href))fail(node.id,'unsafe media action');
      if(typeof node.assetId!=='string'||!assetIds.has(node.assetId)||
        mediaKinds.get(node.assetId)==='video/mp4'||own(node,'posterAssetId')||own(node,'loop')||
        typeof node.alt!=='string'||node.alt.length>200||/[\x00-\x1f]/.test(node.alt)||
        own(node,'text')||own(node,'level')||own(node,'icon'))fail(node.id,'invalid image binding');
    }else{
      if(typeof node.text!=='string'||node.text.length>3000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(node.text)||
        own(node,'assetId')||own(node,'alt')||own(node,'icon')||own(node,'posterAssetId')||own(node,'loop'))fail(node.id,'invalid text');
      if(['button','link'].includes(node.type)&&!validHref(node.href))
        fail(node.id,'unsafe link');
      if(!['button','link'].includes(node.type)&&own(node,'href'))fail(node.id,'unexpected link');
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
      keys(node.states,['hover','focus','active'],node.id+'/states');
      for(const [state,st] of Object.entries(node.states))validateStyle(st,tokens,node.id+'/'+state,'state');
    }
    if(!['container','disclosure','tabs','tab','list','gallery','table','table-row'].includes(node.type)&&own(node,'children'))fail(node.id,'noncontainer children');
    if(['container','disclosure','tabs','tab','list','gallery','table','table-row'].includes(node.type)){
      const min=node.type==='tabs'||node.type==='gallery'||node.type==='table'?2:
        ['tab','disclosure','list','table-row'].includes(node.type)?1:0;
      const max=node.type==='tabs'?8:node.type==='list'?24:node.type==='gallery'?12:
        node.type==='table'?10:node.type==='table-row'?6:30;
      if(!Array.isArray(node.children)||node.children.length<min||node.children.length>max)
        fail(node.id,'invalid content-group children');
      if(node.type==='table'){
        const widths=node.children.map(row=>row.children?.length);
        if(widths.some(w=>!Number.isInteger(w)||w<2||w>6||w!==widths[0]))
          fail(node.id,'table must be rectangular with 2-6 columns');
      }
      node.children.forEach(n=>visit(n,depth+1,node.type));
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
    const visit=(node,items,depth,parentType=null)=>{
      if((node.type==='tab'&&parentType!=='tabs')||(parentType==='tabs'&&node.type!=='tab')||
        (node.type==='list-item'&&parentType!=='list')||(parentType==='list'&&node.type!=='list-item')||
        (node.type==='table-row'&&parentType!=='table')||(parentType==='table'&&node.type!=='table-row')||
        (node.type==='table-cell'&&parentType!=='table-row')||(parentType==='table-row'&&node.type!=='table-cell')||
        (parentType==='gallery'&&node.type!=='image'))fail('edit','invalid group hierarchy');
      if(['tabs','gallery','table'].includes(node.type)&&(!Array.isArray(node.children)||node.children.length<2))
        fail('edit','group must contain at least two items');
      if(['tab','disclosure','list','table-row'].includes(node.type)&&(!Array.isArray(node.children)||!node.children.length))
        fail('edit','interactive panel needs content');
      if(node.type==='table'&&node.children.some(row=>!Array.isArray(row.children)||
        row.children.length<2||row.children.length>6||row.children.length!==node.children[0].children.length))
        fail('edit','table must have equal columns');
      if(!object(node)||typeof node.id!=='string'||!IDENT.test(node.id)||
        found.has(node.id)||!TYPES.includes(node.type)||depth>8||found.size>=90)
        fail('edit','invalid node, duplicated id or graph limit');
      found.set(node.id,{node,items,depth});
      if(['container','disclosure','tabs','tab','list','gallery','table','table-row'].includes(node.type)){
        if(!Array.isArray(node.children)||node.children.length>(node.type==='tabs'?8:node.type==='list'?24:
          node.type==='gallery'?12:node.type==='table'?10:node.type==='table-row'?6:30))fail('edit','container limit');
        node.children.forEach(child=>visit(child,node.children,depth+1,node.type));
      }else if(own(node,'children'))fail('edit','invalid child owner');
    };
    next.nodes.forEach(node=>visit(node,next.nodes,0));
    return found;
  };
  const before=scan(),source=operation.action==='insert'?null:before.get(operation.nodeId);
  if(operation.action!=='insert'&&!source)fail('edit','missing selected node');
  const descendants=[];
  const walk=(node)=>{descendants.push(node);if(['container','disclosure','tabs','tab','list','gallery','table','table-row'].includes(node.type))node.children.forEach(walk);};
  if(source)walk(source.node);
  if(operation.action==='duplicate'){
    if(!Array.isArray(operation.ids)||operation.ids.length!==descendants.length||
       operation.ids.some(id=>typeof id!=='string'||!IDENT.test(id)||before.has(id))||
       new Set(operation.ids).size!==operation.ids.length)fail('edit','invalid replacement ids');
    const copy=JSON.parse(JSON.stringify(source.node));
    let idx=0;
    const rewrite=(node)=>{node.id=operation.ids[idx++];if(['container','disclosure','tabs','tab','list','gallery','table','table-row'].includes(node.type))node.children.forEach(rewrite);};
    rewrite(copy);
    source.items.splice(source.items.indexOf(source.node)+1,0,copy);
  }else if(operation.action==='insert'){
    const target=before.get(operation.targetId);
    if(!target||!['before','after','inside'].includes(operation.placement)||
       !object(operation.node))fail('edit','invalid insertion');
    if(operation.placement==='inside'){
      if(!['container','disclosure','tabs','tab','list','gallery','table','table-row'].includes(target.node.type))fail('edit','destination not a container');
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
    if(operation.placement==='inside'&&!['container','disclosure','tabs','tab','list','gallery','table','table-row'].includes(target.node.type))
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
    flexWrap:'flex-wrap',flexGrow:'flex-grow',flexShrink:'flex-shrink',overflow:'overflow',objectFit:'object-fit',zIndex:'z-index',justifySelf:'justify-self',textDecoration:'text-decoration',whiteSpace:'white-space',fontStyle:'font-style',textTransform:'text-transform',textWrap:'text-wrap',wordBreak:'word-break',textOverflow:'text-overflow',transformOrigin:'transform-origin',isolation:'isolation',mixBlendMode:'mix-blend-mode'};
  const pixel={textIndent:'text-indent',borderTopLeftRadius:'border-top-left-radius',borderTopRightRadius:'border-top-right-radius',borderBottomRightRadius:'border-bottom-right-radius',borderBottomLeftRadius:'border-bottom-left-radius',gap:'gap',rowGap:'row-gap',columnGap:'column-gap',padding:'padding',
    paddingX:'padding-inline',paddingY:'padding-block',marginTop:'margin-top',
    marginBottom:'margin-bottom',radius:'border-radius',fontSize:'font-size',
    minHeight:'min-height',top:'top',left:'left',right:'right',bottom:'bottom',widthPx:'width',heightPx:'height',minWidth:'min-width',maxHeight:'max-height'};
  for(const [k,v] of Object.entries(style)){
    if(k==='fluidFont'){
      const slope=(v.max-v.min)*100/880,intercept=v.min-slope*3.2;
      put('font-size','clamp('+v.min+'px,calc('+slope.toFixed(4)+'vw + '+intercept.toFixed(4)+'px),'+v.max+'px)');
      continue;
    }
    if(k==='gradient'){
      put('background-image','linear-gradient('+v.angle+'deg,'+resolve(v.from,'colors',t,k)+','+(own(v,'via')?resolve(v.via,'colors',t,k)+' '+v.viaAt+'%,':'')+
        resolve(v.to,'colors',t,k)+')');continue;
    }
    const color=['color','background','borderColor','outlineColor'].includes(k);
    const spacing=['gap','rowGap','columnGap','padding','paddingX','paddingY','top','left','right','bottom','minHeight'].includes(k);
    const group=spacing?'spacing':['radius','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].includes(k)?'radii':k==='fontSize'?'typography':null;
    const value=color?resolve(v,'colors',t,k):group?resolve(v,group,t,k):v;
    if(own(aliases,k)){put(aliases[k],k==='maxWidth'?value+'px':value);continue;}
    if(k==='hidden'){if(value)put('display','none');continue;}
    if(k==='columns'){put('grid-template-columns','repeat('+value+',minmax(0,1fr))');continue;}
    if(k==='gridColumnsPreset'){put('grid-template-columns',{'sidebar-left':'minmax(0,1fr) minmax(0,2fr)','sidebar-right':'minmax(0,2fr) minmax(0,1fr)','wide-center':'minmax(0,1fr) minmax(0,3fr) minmax(0,1fr)','editorial':'minmax(0,2fr) minmax(0,3fr) minmax(0,2fr)'}[value]);continue;}
    if(k==='gridColumnStart'||k==='gridRowStart'){put(k==='gridColumnStart'?'grid-column-start':'grid-row-start',value);continue;}
    if(k==='translateX'||k==='translateY'){put(k==='translateX'?'--cmsdg-tx':'--cmsdg-ty',value+'px');continue;}
    if(k==='rotateDeg'){put('rotate',value+'deg');continue;}
    if(k==='scalePercent'){put('scale',(value/100).toFixed(2));continue;}
    if(k==='wordSpacing'){put('word-spacing',(value/10).toFixed(1)+'px');continue;}
    if(k==='filterPreset'){put('filter',{none:'none',grayscale:'grayscale(1)',sepia:'sepia(.85)',contrast:'contrast(1.25)',vibrant:'saturate(1.6)'}[value]);continue;}
    if(k==='borderStyle'){put('border-style',value);continue;}
    if(k==='textShadow'){put('text-shadow',{'none':'none','soft':'0 2px 8px #10182040','strong':'0 4px 18px #10182080'}[value]);continue;}
    if(k==='clipShape'){put('clip-path',{'none':'none','circle':'circle(50% at 50% 50%)','ellipse':'ellipse(50% 40% at 50% 50%)','diagonal':'polygon(0 0,100% 0,100% 90%,0 100%)','hexagon':'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)'}[value]);continue;}
    if(k==='backdropBlur'){put('backdrop-filter','blur('+value+'px)');put('-webkit-backdrop-filter','blur('+value+'px)');continue;}
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
    if(k==='borderWidth'){if(!own(style,'borderStyle'))put('border-style','solid');put('border-width',value+'px');}
  }
  return css.join(';');
}
function render(site,graph,mount='',mediaPreview=null,sectionId=graph.id,videoPreview=null){
  validateGraph(graph,new Set(site.assets.map(x=>x.id)),new Set(),
    site.designTokens,new Map(site.assets.map(x=>[x.id,x.mime])));
  const tokens=validateTokens(site.designTokens);
  const safeMount=mount.replace(/\/$/,'');
  const assets=new Map(site.assets.map(a=>[a.id,a])),rules=[];
  const scope='.cmsdg-'+graph.id;
  const attr=s=>escapeHtml(s);
  const imageUrl=id=>{
    const a=assets.get(id);
    return a?(mediaPreview?mediaPreview(id):null)||safeMount+a.src:null;
  };
  const cssUrl=url=>JSON.stringify(String(url)).replace(/</g,'\\3c ').replace(/>/g,'\\3e ');
  const makeBackdrop=(m,id)=>{
    const url=imageUrl(id);if(!url)return '';
    let image='url('+cssUrl(url)+')';
    if(m.overlay){
      const color=resolve(m.overlay.color,'colors',tokens,'overlay')+
        Math.round(m.overlay.opacity*255/100).toString(16).padStart(2,'0');
      image='linear-gradient('+color+','+color+'),'+image;
    }
    return 'background-image:'+image+';background-size:'+(m.size||'cover')+
      ';background-position:'+(m.positionX??50)+'% '+(m.positionY??50)+'%;background-repeat:no-repeat';
  };
  const tableHeaderIds=new Set();
  const markHeaders=nodes=>{for(const node of nodes){
    if(node.type==='table')node.children[0]?.children.forEach(cell=>tableHeaderIds.add(cell.id));
    if(node.children)markHeaders(node.children);
  }};markHeaders(graph.nodes);
  function visit(n){
    const selector=scope+' .cmsdg-n-'+n.id;
    const usesTranslate=[n.styles||{},n.responsive?.tablet||{},n.responsive?.mobile||{}].some(s=>own(s,'translateX')||own(s,'translateY'));
    if(usesTranslate)rules.push(selector+'{--cmsdg-tx:0px;--cmsdg-ty:0px;translate:var(--cmsdg-tx) var(--cmsdg-ty)}');
    const baseline=declarations(n.styles||{},tokens);
    if(baseline)rules.push(selector+'{'+baseline+'}');
    for(const bp of ['tablet','mobile']){
      const css=declarations(n.responsive?.[bp]||{},tokens);
      if(css)rules.push('@media(max-width:'+(bp==='tablet'?'900':'600')+'px){'+selector+'{'+css+'}}');
    }
    for(const state of ['hover','focus','active']){
      const css=declarations(n.states?.[state]||{},tokens);
      if(css)rules.push(selector+(state==='focus'?':focus-visible':state==='active'?':active':':hover')+'{'+css+'}');
    }
    if(n.backgroundMedia){
      const m=n.backgroundMedia;
      const desktop=makeBackdrop(m,m.assetId);if(desktop)rules.push(selector+'{'+desktop+'}');
      for(const [bp,limit] of [['tablet',900],['mobile',600]]){
        const id=m[bp+'AssetId'];if(!id)continue;
        const css=makeBackdrop(m,id);
        if(css)rules.push('@media(max-width:'+limit+'px){'+selector+'{'+css+'}}');
      }
    }
    if(n.backgroundVideo){
      const v=n.backgroundVideo,b=selector+' > .cmsdg-video-backdrop';
      const poster=id=>'url('+cssUrl(imageUrl(id))+')';
      rules.push(selector+'{position:relative;isolation:isolate}'+b+
        '{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden;border-radius:inherit;'+
        'background-image:'+poster(v.posterAssetId)+';background-size:cover;background-repeat:no-repeat;'+
        'background-position:'+(v.positionX??50)+'% '+(v.positionY??50)+'%}');
      for(const [bp,limit] of [['tablet',900],['mobile',600]]){
        const id=v[bp+'PosterAssetId'];if(id)
          rules.push('@media(max-width:'+limit+'px){'+b+'{background-image:'+poster(id)+'}}');
      }
      rules.push(b+' video{position:absolute;inset:0;width:100%!important;height:100%!important;'+
        'max-width:none!important;object-fit:cover;object-position:'+(v.positionX??50)+'% '+(v.positionY??50)+'%;display:block}');
      if(v.overlay){
        const tint=resolve(v.overlay.color,'colors',tokens,node.id+'/video overlay')+
          Math.round(v.overlay.opacity*255/100).toString(16).padStart(2,'0');
        rules.push(b+'::after{content:"";position:absolute;inset:0;background-color:'+tint+'}');
      }
      rules.push('@media(prefers-reduced-motion:reduce){'+b+' video{display:none!important}}');
      rules.push('@media(max-width:600px){'+b+' video{display:none!important}}');
    }
    if(n.motion&&n.motion.effect!=='none')rules.push(selector+'{animation:cmsdg-'+n.motion.effect+' '+n.motion.duration+'ms ease-out '+n.motion.delay+'ms both}');
    const cls='cmsdg-n-'+n.id;
    if(n.type==='container'){
      let backdrop='';
      if(n.backgroundVideo){
        const v=n.backgroundVideo,poster=imageUrl(v.posterAssetId);
        const videoSrc=videoPreview?videoPreview(v.assetId):safeMount+assets.get(v.assetId).src;
        backdrop='<div class="cmsdg-video-backdrop" aria-hidden="true">'+
          (videoSrc?'<video autoplay muted loop playsinline preload="none"'+
            (poster?' poster="'+attr(poster)+'"':'')+'><source src="'+attr(videoSrc)+
            '" type="video/mp4"></video>':'')+'</div>';
      }
      return '<div class="'+cls+'">'+backdrop+n.children.map(visit).join('')+'</div>';
    }
    if(n.type==='list')return '<'+(n.ordered?'ol':'ul')+' class="'+cls+' cmsdg-list">'+n.children.map(visit).join('')+'</'+(n.ordered?'ol':'ul')+'>';
    if(n.type==='list-item')return '<li class="'+cls+'">'+attr(n.text)+'</li>';
    if(n.type==='gallery')return '<div class="'+cls+' cmsdg-gallery" role="region" aria-roledescription="gallery" aria-label="'+attr(n.text)+'" tabindex="0">'+n.children.map(visit).join('')+'</div>';
    if(n.type==='table')return '<div class="cmsdg-table-scroll" role="region" aria-label="'+attr(n.text||'Таблица')+'" tabindex="0"><table class="'+cls+' cmsdg-table">'+
      (n.text?'<caption>'+attr(n.text)+'</caption>':'')+
      '<thead>'+visit(n.children[0])+'</thead><tbody>'+n.children.slice(1).map(visit).join('')+'</tbody></table></div>';
    if(n.type==='table-row')return '<tr class="'+cls+'">'+n.children.map(visit).join('')+'</tr>';
    if(n.type==='table-cell')return '<'+(tableHeaderIds.has(n.id)?'th scope="col"':'td')+' class="'+cls+'">'+attr(n.text)+'</'+(tableHeaderIds.has(n.id)?'th':'td')+'>';
    if(n.type==='quote')return '<figure class="'+cls+' cmsdg-quote"><blockquote><p>'+attr(n.text)+'</p></blockquote>'+
      (n.cite?'<figcaption>'+attr(n.cite)+'</figcaption>':'')+'</figure>';
    if(n.type==='disclosure')return '<details class="'+cls+' cmsdg-disclosure"><summary>'+attr(n.text)+'</summary><div class="cmsdg-disclosure-body">'+n.children.map(visit).join('')+'</div></details>';
    if(n.type==='tab')return '<div class="'+cls+' cmsdg-tab-panel" id="cmsdg-panel-'+n.id+'">'+n.children.map(visit).join('')+'</div>';
    if(n.type==='tabs'){
      const controls=n.children.map((tab,i)=>'<input type="radio" name="cmsdg-tabs-'+n.id+'" id="cmsdg-tab-'+tab.id+'" aria-controls="cmsdg-panel-'+tab.id+'"'+(i===0?' checked':'')+'><label for="cmsdg-tab-'+tab.id+'">'+attr(tab.text)+'</label>').join('');
      for(const tab of n.children)rules.push(scope+' .cmsdg-tabs-'+n.id+':has(> .cmsdg-tabs-controls > #cmsdg-tab-'+tab.id+':checked) > .cmsdg-tabs-panels > #cmsdg-panel-'+tab.id+'{display:block}');
      return '<div class="'+cls+' cmsdg-tabs-'+n.id+'"><div class="cmsdg-tabs-controls" role="group" aria-label="Вкладки">'+controls+'</div><div class="cmsdg-tabs-panels">'+n.children.map(visit).join('')+'</div></div>';
    }
    if(n.type==='divider')return '<hr class="'+cls+'">';
    if(n.type==='icon')return '<svg class="'+cls+'" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '+(n.alt?'role="img" aria-label="'+attr(n.alt)+'"':'aria-hidden="true"')+'>'+ICON_PATHS[n.icon]+'</svg>';
    if(n.type==='heading')return '<h'+(n.level||2)+' class="'+cls+'">'+attr(n.text)+'</h'+(n.level||2)+'>';
    if(n.type==='text')return '<p class="'+cls+'">'+attr(n.text)+'</p>';
    if(n.type==='button'||n.type==='link')return '<a class="'+cls+'" href="'+attr(n.href.startsWith('/')?mount.replace(/\/$/,'')+n.href:n.href)+'"'+(n.href.startsWith('https://')?' rel="noopener noreferrer"':'')+'>'+attr(n.text)+'</a>';
    if(n.type==='video'){
      const videoAsset=assets.get(n.assetId);
      const videoSrc=videoPreview?videoPreview(n.assetId):safeMount+videoAsset.src;
      if(!videoSrc)return '<div class="'+cls+'" role="status">Загружается защищённое видео</div>';
      const poster=n.posterAssetId?assets.get(n.posterAssetId):null;
      const posterSource=poster?(mediaPreview?mediaPreview(n.posterAssetId):safeMount+poster.src):null;
      const posterHtml=posterSource?' poster="'+attr(posterSource)+'"':'';
      // No autoplay, external providers, unknown formats, script or iframe.
      return '<video class="'+cls+'" controls playsinline preload="metadata"'+
        (n.loop?' loop':'')+posterHtml+' aria-label="'+attr(n.alt)+'">'+
        '<source src="'+attr(videoSrc)+'" type="video/mp4">'+
        'Ваш браузер не поддерживает видео.</video>';
    }
    const asset=assets.get(n.assetId),src=mediaPreview?mediaPreview(n.assetId):null;
    if(!asset)return '';
    const base=src||safeMount+asset.src;
    const variants=asset.variants||[];
    // Source parity with PHP PublicRenderer::responsiveAttrs: sorted, deduped
    // responsive derivatives and the unmodified original at its own width.
    const candidates=new Map(variants.map(v=>[v.width,safeMount+v.src]));
    if(Number.isInteger(asset.width)&&asset.width>0&&!candidates.has(asset.width))
      candidates.set(asset.width,safeMount+asset.src);
    const responsive=src?'':(variants.length?' srcset="'+
      [...candidates.entries()].sort((a,b)=>a[0]-b[0]).map(([w,url])=>attr(url)+' '+w+'w').join(', ')+
      '" sizes="(max-width:600px) 100vw, (max-width:900px) 50vw, 100vw"':'');
    const dimensions=Number.isInteger(asset.width)&&Number.isInteger(asset.height)&&
      asset.width>=1&&asset.width<=4096&&asset.height>=1&&asset.height<=4096?
      ' width="'+asset.width+'" height="'+asset.height+'"':'';
    const img='<img loading="lazy" class="'+cls+'" src="'+attr(base)+'"'+responsive+dimensions+' alt="'+attr(n.alt)+'">';
    const variantsByDevice=n.responsiveMedia;
    let picture=img;
    if(variantsByDevice){
      let source='';
      for(const [device,limit] of [['mobile',600],['tablet',900]]){
        const id=variantsByDevice[device+'AssetId'];if(!id)continue;
        const selected=imageUrl(id);
        if(selected)source+='<source media="(max-width:'+limit+'px)" srcset="'+attr(selected)+'">';
      }
      picture='<picture class="cmsdg-picture">'+source+img+'</picture>';
    }
    if(!n.href)return picture;
    const href=n.href.startsWith('/')?mount.replace(/\/$/,'')+n.href:n.href;
    return '<a class="cmsdg-image-action" href="'+attr(href)+'"'+(href.startsWith('https://')?' rel="noopener noreferrer"':'')+'>'+picture+'</a>';
  }
  const html=graph.nodes.map(visit).join('');
  return '<section class="cmsdg '+('cmsdg-'+graph.id)+'" id="'+attr(sectionId)+'"><style>'+
    scope+'{min-width:0;max-width:none;padding:0;min-height:0}'+scope+' *{box-sizing:border-box;min-width:0}'+
    scope+' img,'+scope+' video{max-width:100%;height:auto;object-position:var(--cmsdg-object-x,50%) var(--cmsdg-object-y,50%)}'+scope+' svg{display:inline-block;vertical-align:middle;flex:none}'+
    scope+' .cmsdg-table-scroll{max-width:100%;overflow-x:auto;overscroll-behavior-inline:contain}'+
    scope+' .cmsdg-table-scroll:focus-visible,'+scope+' .cmsdg-gallery:focus-visible{outline:3px solid #1868d3;outline-offset:2px}'+
    scope+' .cmsdg-table{border-collapse:collapse;width:100%;min-width:480px}'+
    scope+' .cmsdg-table th,'+scope+' .cmsdg-table td{padding:12px 16px;border:1px solid #c6cdd7;text-align:start}'+
    scope+' .cmsdg-table th{font-weight:700;background:#f2f5f9}'+
    scope+' .cmsdg-gallery{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:8px;padding:8px 2px;overscroll-behavior-inline:contain}'+
    scope+' .cmsdg-gallery>img,'+scope+' .cmsdg-gallery>picture,'+scope+' .cmsdg-gallery>a{flex:0 0 min(82%,420px);scroll-snap-align:start;border-radius:10px}'+
    scope+' .cmsdg-gallery>picture img,'+scope+' .cmsdg-gallery>a img{width:100%;height:100%;object-fit:cover;border-radius:inherit}'+
    scope+' .cmsdg-picture img{max-width:100%;height:auto}'+
    scope+' .cmsdg-image-action{display:inline-block;max-width:100%}'+
    scope+' .cmsdg-image-action img{display:block}'+
    scope+' .cmsdg-quote{margin:12px 0;padding:20px;border-inline-start:4px solid currentColor}'+
    scope+' .cmsdg-quote blockquote{margin:0}'+
    scope+' .cmsdg-quote figcaption{margin-top:12px;font-size:.9em}'+
    scope+' .cmsdg-list{padding-inline-start:1.5em;margin-block:12px}'+
    scope+' .cmsdg-list > li{margin-block:6px}'+
    scope+' .cmsdg-disclosure > summary{cursor:pointer;list-style-position:inside}'+
    scope+' .cmsdg-disclosure-body{padding:12px 0}'+
    scope+' .cmsdg-tabs-controls{display:flex;flex-wrap:wrap;gap:8px;padding:4px 0 12px}'+
    scope+' .cmsdg-tabs-controls input{position:absolute;width:1px;height:1px;opacity:0}'+
    scope+' .cmsdg-tabs-controls label{cursor:pointer;padding:10px 16px;border:1px solid currentColor;border-radius:8px}'+
    scope+' .cmsdg-tabs-controls input:checked + label{font-weight:700;background:#eef3fa}'+
    scope+' .cmsdg-tabs-controls input:focus-visible + label{outline:3px solid #1868d3;outline-offset:2px}'+
    scope+' .cmsdg-tab-panel{display:none}'+
    '@keyframes cmsdg-fade-in{from{opacity:0}to{opacity:1}}'+
    '@keyframes cmsdg-fade-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}'+
    '@keyframes cmsdg-slide-left{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}'+
    '@keyframes cmsdg-zoom-in{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}'+
    '@media(prefers-reduced-motion:reduce){'+scope+' [class*="cmsdg-n-"]{animation:none!important;transition:none!important}}'+
    rules.join('')+'</style>'+html+'</section>';
}

function auditAccessibility(graph,tokensInput){
  const tokens=validateTokens(tokensInput),findings=[],headings=[];
  const add=(code,severity,node,message)=>findings.push({
    code,severity,nodeId:node&&typeof node.id==='string'?node.id:null,message
  });
  const colorOf=value=>{
    if(typeof value!=='string')return null;
    if(value.startsWith('@'))return tokens.colors[value.slice(1)]||null;
    return /^#[a-f0-9]{6}$/i.test(value)?value.toLowerCase():null;
  };
  const sizeOf=value=>{
    if(typeof value==='string'&&value.startsWith('@'))return tokens.typography[value.slice(1)]||null;
    return typeof value==='number'&&Number.isFinite(value)?value:null;
  };
  const luminance=hex=>{
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>
      v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));
    return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  };
  const contrast=(a,b)=>{
    const x=luminance(a),y=luminance(b);
    return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
  };
  const genericLabel=/^(?:click here|here|read more|more|learn more|open|link|button|нажмите здесь|здесь|сюда|подробнее|читать далее|узнать больше|открыть)$/i;
  const genericAlt=/^(?:image|photo|picture|graphic|video|фото|изображение|картинка|рисунок|видео)(?:\s+\d+)?$/i;
  const walk=(nodes,parent)=>{
    for(const node of nodes||[]){
      const style=node.styles&&typeof node.styles==='object'?node.styles:{};
      const color=Object.prototype.hasOwnProperty.call(style,'color')?colorOf(style.color):parent.color;
      let backgrounds=parent.backgrounds||[];
      if(style.gradient&&typeof style.gradient==='object'){
        backgrounds=[style.gradient.from,style.gradient.via,style.gradient.to].map(colorOf).filter(Boolean);
      }else if(Object.prototype.hasOwnProperty.call(style,'background')){
        const background=colorOf(style.background);
        backgrounds=background?[background]:[];
      }
      const level=Number(node.level)||2;
      let fontSize=Object.prototype.hasOwnProperty.call(style,'fontSize')?sizeOf(style.fontSize):parent.fontSize;
      if(node.type==='heading'&&!Object.prototype.hasOwnProperty.call(style,'fontSize')){
        const baseSize=parent.fontSize||16;
        fontSize=baseSize*({1:2,2:1.5,3:1.17,4:1,5:0.83,6:0.67}[level]||1);
      }
      const fontWeight=Object.prototype.hasOwnProperty.call(style,'fontWeight')?Number(style.fontWeight):
        node.type==='heading'?700:(parent.fontWeight||400);
      const label=typeof node.text==='string'?node.text.trim():'';
      if(node.type==='heading'){
        headings.push({node,level});
        if(!label)add('empty-text','warning',node,'Заголовок пустой — добавьте понятный текст.');
      }else if(node.type==='text'&&!label){
        add('empty-text','warning',node,'Текстовый элемент пустой — добавьте содержание или удалите его.');
      }
      if(node.type==='image'){
        const alt=typeof node.alt==='string'?node.alt.trim():'';
        if(!alt)add('missing-alt','warning',node,'У изображения пустой alt. Если оно несёт смысл, добавьте описание; если декоративное — проверьте намеренно пустой alt.');
        else if(genericAlt.test(alt))add('generic-alt','warning',node,'Описание изображения слишком общее. Укажите, что именно показано.');
      }
      if(node.type==='video'){
        const alt=typeof node.alt==='string'?node.alt.trim():'';
        if(!alt)add('missing-video-name','error',node,'Видео не имеет доступного названия.');
        else if(genericAlt.test(alt))add('generic-video-name','warning',node,'Название видео слишком общее. Опишите его содержание.');
      }
      if(node.type==='button'){
        if(!label)add('empty-link-name','error',node,'Ссылка-кнопка не имеет доступного названия.');
        else if(genericLabel.test(label))add('generic-link-name','warning',node,'Название ссылки слишком общее. Уточните, куда ведёт ссылка.');
        const focus=node.states&&node.states.focus&&typeof node.states.focus==='object'?node.states.focus:{};
        const explicitFocus=Number(focus.outlineWidth)>0||Number(focus.borderWidth)>0||
          (typeof focus.borderColor==='string'&&Number(style.borderWidth)>0);
        if((style.outlineWidth===0||focus.outlineWidth===0)&&!explicitFocus)
          add('focus-indicator-removed','warning',node,'У ссылки отключён контур фокуса без явной замены. Сохраните заметный индикатор клавиатурного фокуса.');
      }
      if((node.type==='heading'||node.type==='text'||node.type==='button'||(node.type==='icon'&&node.alt))&&color&&backgrounds.length){
        const ratios=backgrounds.map(bg=>contrast(color,bg));
        const ratio=Math.min(...ratios);
        const large=fontSize!==null&&(fontSize>=24||(fontSize>=18.66&&fontWeight>=700));
        const minimum=large?3:4.5;
        if(ratio<minimum)add('low-contrast','warning',node,
          'Контраст текста '+ratio.toFixed(2)+':1; ориентир WCAG AA — не менее '+minimum.toFixed(1)+':1.');
      }
      if(['container','disclosure','tabs','tab','list','gallery','table','table-row'].includes(node.type)&&Array.isArray(node.children))walk(node.children,{color,backgrounds,fontSize,fontWeight});
    }
  };
  if(!graph||!Array.isArray(graph.nodes)){
    add('invalid-graph','error',null,'Не удалось проверить структуру композиции.');
    return findings;
  }
  walk(graph.nodes,{color:null,backgrounds:[],fontSize:16,fontWeight:400});
  let previous=null,h1Count=0;
  for(const item of headings){
    if(item.level===1&&++h1Count>1)add('multiple-h1','warning',item.node,'В этой композиции несколько заголовков первого уровня. Проверьте иерархию всей страницы.');
    if(previous&&item.level>previous.level+1)add('heading-order','warning',item.node,
      'Уровень заголовка перескакивает с H'+previous.level+' на H'+item.level+'. Проверьте последовательность заголовков.');
    previous=item;
  }
  return findings;
}

module.exports=Object.freeze({validateTokens,validateStyle,validateGraph,baseGraph,editTree,render,auditAccessibility,DEFAULT_TOKENS,TYPES,STYLE_KEYS,MOTIONS,ICON_PATHS});
