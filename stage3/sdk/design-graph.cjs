'use strict';
// Optional AI-authored Design Graph v1. A closed, typed design AST, never HTML/CSS/JS.
// Independent from Design Factory's branch: integration requires a later explicit adapter.
const IDENT=/^[a-z][a-z0-9-]{2,79}$/,TOKEN=/^[a-z][a-z0-9-]{1,39}$/;
const SAFE_URL=/^\/(?!\/)[a-zA-Z0-9/_#?=&.%-]*$/;
const TYPES=['container','heading','text','button','image','divider'];
const STYLE_KEYS=['display','columns','direction','align','justify','gap','padding','radius',
  'color','background','fontSize','fontWeight','lineHeight','maxWidth','position','top','left',
  'opacity','borderColor','borderWidth','textAlign','order','hidden'];
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
  for(const [key,value] of Object.entries(style)){
    const color=['color','background','borderColor'].includes(key);
    const scale=['gap','padding','top','left'].includes(key)?'spacing':
      key==='radius'?'radii':key==='fontSize'?'typography':null;
    if(color){resolve(value,'colors',tokens,at+'/'+key);continue;}
    if(scale){resolve(value,scale,tokens,at+'/'+key);continue;}
    if(key==='display'&&!['block','grid','flex','none'].includes(value))fail(at,key);
    else if(key==='direction'&&!['row','column'].includes(value))fail(at,key);
    else if(['align','justify'].includes(key)&&!['start','center','end','stretch','between'].includes(value))fail(at,key);
    else if(key==='position'&&!['static','relative','absolute'].includes(value))fail(at,key);
    else if(key==='textAlign'&&!['left','center','right'].includes(value))fail(at,key);
    else if(key==='hidden'&&typeof value!=='boolean')fail(at,key);
    else if(key==='columns'&&!number(value,1,12))fail(at,key);
    else if(key==='fontWeight'&&!number(value,100,900))fail(at,key);
    else if(key==='lineHeight'&&(!number(value,80,250)))fail(at,key);
    else if(key==='maxWidth'&&!number(value,0,1920))fail(at,key);
    else if(key==='borderWidth'&&!number(value,0,12))fail(at,key);
    else if(key==='order'&&!number(value,-30,30))fail(at,key);
    else if(key==='opacity'&&(!number(value,0,100)))fail(at,key);
  }
  if(mode==='state'&&Object.keys(style).some(k=>!['color','background','borderColor','borderWidth','radius','opacity'].includes(k)))
    fail(at,'unsupported interaction state property');
}
function validateGraph(graph,assetIds,existingIds,tokensInput){
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
    keys(node,['id','type','text','href','assetId','alt','level','styles','responsive','states','children'],'node');
    if(!IDENT.test(node.id)||seen.has(node.id)||!TYPES.includes(node.type))fail('node','duplicate id / unknown type');
    seen.add(node.id);
    if(node.type==='container'||node.type==='divider'){
      if(own(node,'text')||own(node,'href')||own(node,'assetId')||own(node,'alt')||own(node,'level'))
        fail(node.id,'invalid container content');
    }else if(node.type==='image'){
      if(typeof node.assetId!=='string'||!assetIds.has(node.assetId)||
        typeof node.alt!=='string'||node.alt.length>200||/[\x00-\x1f]/.test(node.alt)||
        own(node,'text')||own(node,'href')||own(node,'level'))fail(node.id,'invalid image binding');
    }else{
      if(typeof node.text!=='string'||node.text.length>3000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(node.text)||
        own(node,'assetId')||own(node,'alt'))fail(node.id,'invalid text');
      if(node.type==='button'&&
        (typeof node.href!=='string'||node.href.length>300||
         !SAFE_URL.test(node.href)&&!/^https:\/\/[a-z0-9.-]+(?:\/[^\s"'<>\\]*)?$/i.test(node.href)))
        fail(node.id,'unsafe link');
      if(node.type!=='button'&&own(node,'href'))fail(node.id,'unexpected link');
      if(node.type==='heading'&&(!number(node.level||2,1,6)))fail(node.id,'heading level');
      if(node.type!=='heading'&&own(node,'level'))fail(node.id,'unexpected level');
    }
    validateStyle(node.styles||{},tokens,node.id+'/styles');
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
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function declarations(style,t){
  const css=[];
  const put=(key,value)=>css.push(key+':'+value);
  for(const [k,v] of Object.entries(style)){
    const col=['color','background','borderColor'].includes(k);
    const typ=['fontSize'].includes(k);
    const scale=['gap','padding','top','left'].includes(k)?'spacing':k==='radius'?'radii':typ?'typography':null;
    const value=col?resolve(v,'colors',t,k):scale?resolve(v,scale,t,k):v;
    if(k==='display')put('display',value);
    if(k==='hidden'&&value)put('display','none');
    if(k==='columns'){put('grid-template-columns','repeat('+value+',minmax(0,1fr))');}
    if(k==='direction')put('flex-direction',value);
    if(k==='align')put('align-items',value==='between'?'space-between':value==='start'?'flex-start':value==='end'?'flex-end':value);
    if(k==='justify')put('justify-content',value==='between'?'space-between':value==='start'?'flex-start':value==='end'?'flex-end':value);
    if(k==='gap')put('gap',value+'px');
    if(k==='padding')put('padding',value+'px');
    if(k==='radius')put('border-radius',value+'px');
    if(k==='color')put('color',value);
    if(k==='background')put('background-color',value);
    if(k==='fontSize')put('font-size',value+'px');
    if(k==='fontWeight')put('font-weight',value);
    if(k==='lineHeight')put('line-height',(value/100).toFixed(2));
    if(k==='maxWidth')put('max-width',value+'px');
    if(k==='position')put('position',value);
    if(k==='top')put('top',value+'px');
    if(k==='left')put('left',value+'px');
    if(k==='opacity')put('opacity',(value/100).toFixed(2));
    if(k==='borderColor')put('border-color',value);
    if(k==='borderWidth'){put('border-style','solid');put('border-width',value+'px');}
    if(k==='textAlign')put('text-align',value);
    if(k==='order')put('order',value);
  }
  return css.join(';');
}
function render(site,graph,mount='',mediaPreview=null,sectionId=graph.id){
  validateGraph(graph,new Set(site.assets.map(x=>x.id)),new Set(),
    site.designTokens);
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
    const cls='cmsdg-n-'+n.id;
    if(n.type==='container')return '<div class="'+cls+'">'+n.children.map(visit).join('')+'</div>';
    if(n.type==='divider')return '<hr class="'+cls+'">';
    if(n.type==='heading')return '<h'+(n.level||2)+' class="'+cls+'">'+attr(n.text)+'</h'+(n.level||2)+'>';
    if(n.type==='text')return '<p class="'+cls+'">'+attr(n.text)+'</p>';
    if(n.type==='button')return '<a class="'+cls+'" href="'+attr(n.href.startsWith('/')?mount+n.href:n.href)+'">'+attr(n.text)+'</a>';
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
    scope+' img{max-width:100%;height:auto}'+rules.join('')+'</style>'+html+'</section>';
}
module.exports=Object.freeze({validateTokens,validateStyle,validateGraph,baseGraph,render,DEFAULT_TOKENS,TYPES,STYLE_KEYS});
