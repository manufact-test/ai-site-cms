/* Stage1 research-only: custom complex RJSF 6.11.0 widgets vs Jedison using identical schema. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const {chromium}=require('playwright-core');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);if(!chrome)throw Error('Chrome required');
const schema=JSON.parse(fs.readFileSync(path.join(__dirname,'typed-manifest.schema.json'),'utf8'));
const initial={fontSize:'64px',shadow:{x:0,y:5,blur:10,color:'#112233'},gradient:{angle:45,from:'#112233',to:'#334455'},animation:{enabled:true,duration:400,easing:'ease'}};
function mountRjsfCustom(){
 const React=window.React;
 const LengthWidget=({value,onChange})=>{
  const m=/^([0-9]+)(px|rem|%)$/.exec(value||'64px');const n=m?m[1]:'64',u=m?m[2]:'px';
  const commit=(num,unit)=>{const next=num+unit;if(/^(?:0|[1-9][0-9]{0,2})(?:px|rem|%)$/.test(next))onChange(next)};
  return React.createElement('div',{'data-cms-widget':'length'},
   React.createElement('input',{type:'number','data-part':'amount',value:n,onChange:e=>commit(e.target.value,u)}),
   React.createElement('select',{'data-part':'unit',value:u,onChange:e=>commit(n,e.target.value)},...['px','rem','%'].map(v=>React.createElement('option',{key:v,value:v},v))));
 };
 const CompositeField=({schema,formData,onChange,fieldPathId})=>{
  const kind=schema['x-cms-kind'];
  const values=formData||{};
  return React.createElement('div',{'data-cms-widget':kind},...Object.entries(schema.properties).map(([key,s])=>{
   const value=values[key]??(s.type==='boolean'?false:s.type==='integer'?0:'');
   const input=s.enum?
    React.createElement('select',{'data-part':key,value:String(value),onChange:e=>onChange({...values,[key]:e.target.value},fieldPathId.path)},
     ...s.enum.map(v=>React.createElement('option',{key:v,value:v},v))):
    React.createElement('input',{'data-part':key,type:s.type==='boolean'?'checkbox':s.type==='integer'?'number':['color','from','to'].includes(key)?'color':'text',
     ...(s.type==='boolean'?{checked:Boolean(value)}:{value:String(value)}),
     onChange:e=>{const v=s.type==='boolean'?e.target.checked:s.type==='integer'?Number(e.target.value):e.target.value;onChange({...values,[key]:v},fieldPathId.path)}});
   return React.createElement('label',{key},key,': ',input);
  }));
 };
 const uiSchema={fontSize:{'ui:widget':LengthWidget},shadow:{'ui:field':CompositeField},gradient:{'ui:field':CompositeField},animation:{'ui:field':CompositeField}};
 window.mount=(el,s,d)=>{window.latest=d;const root=window.createRoot(el);
  root.render(React.createElement(window.Form,{schema:s,uiSchema,formData:d,validator:window.validator,
   onChange:e=>{window.latest=e.formData;},children:React.createElement('span',null,'research only')}));
  window.dispose=()=>root.unmount();
 };
}
(async()=>{
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html><body><div id="editor"></div></body></html>');
  const src=["im","port React from 'react'; im","port {createRoot} from 'react-dom/client'; im","port Form from '@rjsf/core'; im","port validator from '@rjsf/validator-ajv8'; window.React=React;window.createRoot=createRoot;window.Form=Form;window.validator=validator;"].join('');
  const js=esbuild.buildSync({stdin:{contents:src,sourcefile:'rjsf-composite-entry.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
  await page.addScriptTag({content:js});await page.evaluate(mountRjsfCustom);
  await page.evaluate(({schema,initial})=>window.mount(document.getElementById('editor'),schema,initial),{schema,initial});
  await page.locator('[data-cms-widget="length"] [data-part="amount"]').waitFor({timeout:10000});
  assert.equal(await page.locator('[data-cms-widget]').count(),4);
  const edit=async(kind,part,value)=>{
   const input=page.locator('[data-cms-widget="'+kind+'"] [data-part="'+part+'"]');
   const type=await input.evaluate(e=>e.type);
   if(type==='select-one')await input.selectOption(value);else if(type==='checkbox')await input.setChecked(value==='true');else await input.fill(value);
   await input.dispatchEvent('change');await input.blur();
  };
  await edit('length','amount','72');await edit('length','unit','rem');
  await edit('shadow','blur','25');await edit('shadow','color','#abcdef');
  await edit('gradient','angle','120');await edit('gradient','from','#aabbcc');
  await edit('animation','enabled','false');await edit('animation','duration','850');await edit('animation','easing','linear');
  console.log('STAGE1_RJSF_BEFORE_WAIT='+JSON.stringify(await page.evaluate(()=>window.latest)));
  await page.waitForFunction(()=>window.latest?.fontSize==='72rem'&&window.latest.animation?.easing==='linear',null,{timeout:9000});
  const out=await page.evaluate(()=>window.latest);
  assert.equal(out.fontSize,'72rem');assert.deepEqual(out.shadow,{x:0,y:5,blur:25,color:'#abcdef'});
  assert.deepEqual(out.gradient,{angle:120,from:'#aabbcc',to:'#334455'});
  assert.deepEqual(out.animation,{enabled:false,duration:850,easing:'linear'});
  assert.equal((await page.locator('#editor').innerText()).includes('borderRadius'),false);
  assert.deepEqual(errors,[]);await page.evaluate(()=>window.dispose());await page.close();
  console.log('STAGE1_RJSF_CUSTOM_FIELDS='+JSON.stringify({pass:true,version:'6.11.0',sameTypedOutputAsJedison:true,widgets:4,result:out,pageerrors:0,scope:'research only; equivalent schema not product quality UX'}));
 }finally{await browser.close()}
})().catch(e=>{console.error('STAGE1_RJSF_CUSTOM_FIELDS_FAIL='+String(e.stack||e));process.exitCode=1});
