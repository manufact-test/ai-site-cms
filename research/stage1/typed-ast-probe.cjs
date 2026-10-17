/* Stage 1 only: experimental typed AI-site AST compiler + validation, NOT a production sanitizer. */
'use strict';
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const VALID_TAGS={
 hero:new Set(['section','div','h1','p','a','span','strong']),
 media:new Set(['section','article','h2','p','img','video','div'])
};
const assetMap=Object.freeze({cover:{kind:'image',url:'/assets/cover.png'},clip:{kind:'video',url:'/assets/clip.webm'}});
const safeText=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const safePath=s=>typeof s==='string'&&s.length<=180&&/^\/(?!\/)[a-z0-9/_#-]*$/.test(s)&&!s.includes('..');
const plain=o=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
const exact=(o,allowed)=>plain(o)&&Object.keys(o).every(k=>allowed.includes(k));
function compile(contract){
 assert.ok(exact(contract,['profile','root','controls','values']),'unknown contract keys');
 assert.ok(Object.prototype.hasOwnProperty.call(VALID_TAGS,contract.profile),'unknown profile');
 assert.ok(plain(contract.controls)&&plain(contract.values),'typed controls and values are required');
 const names=Object.keys(contract.controls);
 assert.ok(names.length>0&&names.length<=25&&Object.keys(contract.values).length===names.length,'bounded controls');
 assert.deepEqual(Object.keys(contract.values).sort(),names.slice().sort(),'controls-values parity');
 const usages=new Map(names.map(name=>[name,0]));
 for(const name of names){
  assert.match(name,/^[a-z][a-z0-9-]{0,39}$/);
  const c=contract.controls[name],v=contract.values[name];
  assert.ok(exact(c,['type','maxLength','assetKind']),'control shape');
  if(c.type==='text'){assert.ok(Number.isInteger(c.maxLength)&&c.maxLength>0&&c.maxLength<=1000&&typeof v==='string'&&v.length<=c.maxLength)}
  else if(c.type==='internal-link'){assert.ok(safePath(v))}
  else if(c.type==='media'){assert.ok(['image','video'].includes(c.assetKind)&&typeof v==='string'&&assetMap[v]?.kind===c.assetKind)}
  else assert.fail('invalid control type');
 }
 let count=0;const ids=new Set();
 function use(field,type){assert.ok(Object.prototype.hasOwnProperty.call(contract.controls,field),'undeclared control '+field);assert.equal(contract.controls[field].type,type);usages.set(field,usages.get(field)+1);return contract.values[field]}
 function walk(node,depth){
  assert.ok(depth<=8&&++count<=80,'AST depth/node budget exceeded');
  assert.ok(exact(node,['tag','id','className','textField','textLiteral','hrefField','assetField','children']),'node keys');
  assert.ok(VALID_TAGS[contract.profile].has(node.tag),'tag refused');
  assert.ok(typeof node.id==='string'&&/^[a-z][a-z0-9-]{0,59}$/.test(node.id)&&!ids.has(node.id),'stable-id missing/duplicate');
  ids.add(node.id);
  assert.ok(node.className===undefined||typeof node.className==='string'&&/^[a-z0-9 -]{1,120}$/.test(node.className),'class unsafe');
  const attrs=['data-stable-id="'+node.id+'"'];
  if(node.className!==undefined)attrs.push('class="'+safeText(node.className)+'"');
  const hasChildren=node.children!==undefined,hasTextField=node.textField!==undefined,hasLiteral=node.textLiteral!==undefined;
  const hasAsset=node.assetField!==undefined,hasHref=node.hrefField!==undefined;
  if(hasHref){assert.equal(node.tag,'a');attrs.push('href="'+safeText(use(node.hrefField,'internal-link'))+'"')}
  else assert.notEqual(node.tag,'a','anchor hrefField missing');
  if(hasAsset){assert.ok(node.tag==='img'||node.tag==='video');const field=use(node.assetField,'media');const target=assetMap[field];assert.equal(target.kind,node.tag==='img'?'image':'video');attrs.push('src="'+safeText(target.url)+'"');if(node.tag==='video')attrs.push('muted="" playsinline="" preload="metadata"');if(node.tag==='img')attrs.push('alt=""')}
  else assert.ok(!['img','video'].includes(node.tag),'media assetField missing');
  assert.ok([hasChildren,hasTextField,hasLiteral,hasAsset].filter(Boolean).length<=1,'mixed content forms');
  if(hasChildren)assert.ok(Array.isArray(node.children)&&node.children.length<=30,'children limit');
  if(hasLiteral)assert.ok(typeof node.textLiteral==='string'&&node.textLiteral.length<=1000);
  if(hasTextField)assert.ok(typeof node.textField==='string');
  const body=hasChildren?node.children.map(child=>walk(child,depth+1)).join(''):hasTextField?safeText(use(node.textField,'text')):hasLiteral?safeText(node.textLiteral):'';
  return '<'+node.tag+' '+attrs.join(' ')+(hasAsset&&node.tag==='img'?'/':'>'+body+'</'+node.tag+'>');
 }
 const html=walk(contract.root,0);
 assert.ok([...usages.values()].every(Boolean),'declared but unused control');
 return {html,ids:[...ids],controls:names.length,elements:count};
}
const hero={
 profile:'hero',
 controls:{title:{type:'text',maxLength:240},action:{type:'text',maxLength:80},contact:{type:'internal-link'}},
 values:{title:'Welcome <img src=x onerror=alert(1)>',action:'Contact us',contact:'/contact/'},
 root:{tag:'section',id:'landing',className:'hero',children:[
  {tag:'div',id:'hero-body',children:[{tag:'h1',id:'hero-title',textField:'title'},{tag:'a',id:'hero-action',hrefField:'contact',textField:'action'}]}
 ]}
};
const media={
 profile:'media',
 controls:{heading:{type:'text',maxLength:100},caption:{type:'text',maxLength:300},cover:{type:'media',assetKind:'image'},motion:{type:'media',assetKind:'video'}},
 values:{heading:'Gallery',caption:'See our media',cover:'cover',motion:'clip'},
 root:{tag:'section',id:'media-section',children:[{tag:'article',id:'media-content',children:[
  {tag:'h2',id:'media-title',textField:'heading'},{tag:'p',id:'media-desc',textField:'caption'},
  {tag:'img',id:'media-cover',assetField:'cover'},{tag:'video',id:'media-clip',assetField:'motion'}
 ]}]}
};
function clone(a){return structuredClone(a)}
function mutate(base,fn){let copy=clone(base);fn(copy);return copy}
const negatives=[
 ['script',mutate(hero,a=>a.root.children[0].children[0].tag='script')],
 ['foreign-svg',mutate(media,a=>a.root.children[0].children[2].tag='svg')],
 ['iframe',mutate(media,a=>a.root.children[0].children[2].tag='iframe')],
 ['onclick',mutate(hero,a=>a.root.onclick='alert(1)')],
 ['inline-style',mutate(hero,a=>a.root.style='position:fixed')],
 ['data-uri',mutate(media,a=>a.values.cover='data:image/svg+xml,bad')],
 ['external-media',mutate(media,a=>a.values.cover='https://attacker.invalid/i.png')],
 ['wrong-media-kind',mutate(media,a=>a.values.motion='cover')],
 ['javascript-link',mutate(hero,a=>a.values.contact='javascript:alert(1)')],
 ['protocol-relative',mutate(hero,a=>a.values.contact='//attacker.invalid')],
 ['dot-path',mutate(hero,a=>a.values.contact='/../admin')],
 ['duplicate-id',mutate(hero,a=>a.root.children[0].id='landing')],
 ['undeclared-binding',mutate(hero,a=>a.root.children[0].children[0].textField='secret')],
 ['orphan-control',mutate(hero,a=>a.controls.orphan={type:'text',maxLength:10})],
 ['control-value-mismatch',mutate(hero,a=>a.values.title=25)],
 ['too-many-nodes',mutate(media,a=>a.root.children.push(...Array.from({length:31},(_,i)=>({tag:'p',id:'extra-'+i,textLiteral:'x'}))))],
 ['unknown-profile',mutate(hero,a=>a.profile='arbitrary-html')],
 ['mixed-content',mutate(hero,a=>a.root.children[0].children[0].textLiteral='duplicate')],
 ['script-breakout-as-tag',mutate(hero,a=>a.root.children[0].children[0].tag='style')],
 ['unapproved-css',mutate(hero,a=>a.root.className='hero[onclick]')],
 ['invalid-media-field',mutate(media,a=>a.root.children[0].children[3].assetField='heading')]
];
const positives=[hero,media].map(item=>{
 const v=compile(item),dom=new JSDOM(v.html);
 assert.equal(dom.window.document.querySelectorAll('script,style,iframe,svg,object').length,0);
 assert.equal(dom.window.document.querySelectorAll('[data-stable-id]').length,v.elements);
 assert.ok(!/onerror\s*=/.test(dom.window.document.querySelector('h1')?.outerHTML||''));
 assert.equal(new Set(v.ids).size,v.elements);
 return {profile:item.profile,nodes:v.elements,controls:v.controls};
});
assert.equal(new JSDOM(compile(hero).html).window.document.querySelector('h1').textContent,hero.values.title);
const rejected=negatives.map(([name,item])=>{assert.throws(()=>compile(item),undefined,'unsafe AST was allowed: '+name);return name});
console.log('STAGE1_TYPED_AST='+JSON.stringify({pass:true,profiles:positives,adversarialRejected:rejected.length,rejected,limits:'Two research-only profiles, fixed tag sets and asset map; arbitrary AI components, arbitrary CSS/JS, dynamic extensibility and production permission/security are NOT proven'}));
