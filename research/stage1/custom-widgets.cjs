/* Stage 1 research ONLY. Actual upstream Jedison customEditors on Chromium. */
'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), esbuild=require('esbuild');
const {chromium}=require('playwright-core');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
if(!chrome)throw Error('Chrome required; skipping cannot PASS');
const hex={type:'string',pattern:'^#[0-9a-fA-F]{6}$'};
const composite=(kind,properties)=>({type:'object','x-cms-kind':kind,additionalProperties:false,required:Object.keys(properties),properties});
const schema={type:'object',additionalProperties:false,required:['fontSize','shadow','gradient','animation'],properties:{
 fontSize:{type:'string','x-cms-kind':'length',pattern:'^(?:0|[1-9][0-9]{0,2})(?:px|rem|%)$'},
 shadow:composite('shadow',{x:{type:'integer',minimum:-100,maximum:100},y:{type:'integer',minimum:-100,maximum:100},blur:{type:'integer',minimum:0,maximum:200},color:hex}),
 gradient:composite('gradient',{angle:{type:'integer',minimum:0,maximum:360},from:hex,to:hex}),
 animation:composite('animation',{enabled:{type:'boolean'},duration:{type:'integer',minimum:0,maximum:10000},easing:{type:'string',enum:['ease','ease-in','ease-out','linear']}})
}};
const initial={fontSize:'64px',shadow:{x:0,y:5,blur:10,color:'#112233'},gradient:{angle:45,from:'#112233',to:'#334455'},animation:{enabled:true,duration:400,easing:'ease'}};
function clientSetup(){
 const Jedison=window.Jedison;
 class LengthEditor extends Jedison.EditorStringInput{
  static resolves(s){return s.type==='string'&&s['x-cms-kind']==='length'}
  build(){
   super.build();this.control.input.type='hidden';
   const wrap=document.createElement('div');wrap.dataset.cmsWidget='length';
   this.amount=document.createElement('input');this.amount.type='number';this.amount.min='0';this.amount.max='999';this.amount.dataset.part='amount';this.amount.setAttribute('aria-label','Size');
   this.unit=document.createElement('select');this.unit.dataset.part='unit';this.unit.setAttribute('aria-label','Unit');
   for(const value of ['px','rem','%']){const o=document.createElement('option');o.value=value;o.textContent=value;this.unit.appendChild(o)}
   wrap.append(this.amount,this.unit);this.control.container.appendChild(wrap);
  }
  addEventListeners(){
   super.addEventListeners();
   const change=()=>{const v=this.amount.value+this.unit.value;if(/^(?:0|[1-9][0-9]{0,2})(?:px|rem|%)$/.test(v))this.instance.setValue(v,true,'user')};
   this.amount.addEventListener('change',change);this.unit.addEventListener('change',change);
  }
  refreshUI(){
   super.refreshUI();if(!this.amount)return;
   const m=/^([0-9]+)(px|rem|%)$/.exec(this.instance.getValue());
   if(m){this.amount.value=m[1];this.unit.value=m[2]}
  }
 }
 class CompositeEditor extends Jedison.EditorObject{
  static resolves(s){return s.type==='object'&&['shadow','gradient','animation'].includes(s['x-cms-kind'])}
  build(){
   super.build();this.kind=this.instance.schema['x-cms-kind'];
   const wrap=document.createElement('div');wrap.dataset.cmsWidget=this.kind;this.controls={};
   for(const [key,s] of Object.entries(this.instance.schema.properties)){
    const label=document.createElement('label');label.textContent=key+': ';
    const input=document.createElement(s.enum?'select':'input');
    if(s.type==='boolean')input.type='checkbox';
    else if(s.type==='integer')input.type='number';
    else if(!s.enum)input.type=['color','from','to'].includes(key)?'color':'text';
    if(s.enum){for(const value of s.enum){const o=document.createElement('option');o.value=value;o.textContent=value;input.appendChild(o)}}
    input.dataset.part=key;input.setAttribute('aria-label',this.kind+' '+key);
    label.appendChild(input);wrap.appendChild(label);this.controls[key]=input;
   }
   this.control.container.appendChild(wrap);
  }
  addEventListeners(){
   super.addEventListeners();
   for(const [key,input] of Object.entries(this.controls)){
    input.addEventListener('change',()=>{
     const s=this.instance.schema.properties[key];
     if(s.type==='integer'&&input.value.trim()==='')return;
     const value=s.type==='boolean'?input.checked:s.type==='integer'?Number(input.value):input.value;
     this.instance.setValue({...this.instance.getValue(),[key]:value},true,'user');
    });
   }
  }
  refreshUI(){
   super.refreshUI();if(!this.controls)return;
   for(const [key,input] of Object.entries(this.controls)){
    const value=this.instance.getValue()?.[key];if(value===undefined)continue;
    if(input.type==='checkbox')input.checked=Boolean(value);else input.value=String(value);
   }
  }
 }
 window.mount=(el,s,d)=>{
  const editor=new Jedison.Create({container:el,theme:new Jedison.Theme(),schema:s,data:d,
   customEditors:[LengthEditor,CompositeEditor],showErrors:'input',keepMissingSchemaFields:false});
  window.getData=()=>editor.getValue();window.dispose=()=>editor.destroy();window.changeCount=0;
  editor.on('change',()=>window.changeCount++);
 };
}
(async()=>{
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html><body><div id="editor"></div></body></html>');
  const src=['im','port Jedison from ','"jedison"; window.Jedison=Jedison;'].join('');
  const js=esbuild.buildSync({stdin:{contents:src,sourcefile:'custom-entry.js',resolveDir:__dirname,loader:'js'},absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],format:'iife',write:false,logLevel:'silent'}).outputFiles[0].text;
  await page.addScriptTag({content:js});await page.evaluate(clientSetup);
  await page.evaluate(({schema,initial})=>window.mount(document.getElementById('editor'),schema,initial),{schema,initial});
  await page.locator('[data-cms-widget="length"] [data-part="amount"]').waitFor();
  assert.equal(await page.locator('[data-cms-widget]').count(),4);
  assert.deepEqual(await page.evaluate(()=>window.getData()),initial);
  const edit=async(kind,part,value)=>{
   const input=page.locator('[data-cms-widget="'+kind+'"] [data-part="'+part+'"]');
   const type=await input.evaluate(el=>el.type);
   if(type==='select-one')await input.selectOption(value);else if(type==='checkbox')await input.setChecked(value==='true');else await input.fill(value);
   await input.dispatchEvent('change');await input.blur();
  };
  await edit('length','amount','72');await edit('length','unit','rem');
  await edit('shadow','blur','25');await edit('shadow','color','#abcdef');
  await edit('gradient','angle','120');await edit('gradient','from','#aabbcc');
  await edit('animation','enabled','false');await edit('animation','duration','850');await edit('animation','easing','linear');
  const out=await page.evaluate(()=>window.getData());
  assert.equal(out.fontSize,'72rem');
  assert.deepEqual(out.shadow,{x:0,y:5,blur:25,color:'#abcdef'});
  assert.deepEqual(out.gradient,{angle:120,from:'#aabbcc',to:'#334455'});
  assert.deepEqual(out.animation,{enabled:false,duration:850,easing:'linear'});
  assert.equal((await page.locator('#editor').innerText()).includes('borderRadius'),false);
  assert.ok(await page.evaluate(()=>window.changeCount)>=7);
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.dispose());await page.close();
  console.log('STAGE1_CUSTOM_WIDGETS='+JSON.stringify({pass:true,widgets:['length','shadow','gradient','animation'],result:out,errors:errors.length,scope:'research only; custom classes extend actual Jedison'}));
 }finally{await browser.close()}
})().catch(e=>{console.error('STAGE1_CUSTOM_WIDGETS_FAIL='+String(e.stack||e));process.exitCode=1});
