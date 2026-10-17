/* AI Site CMS stage-1, non-production research. Real upstream browser runtime. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const esbuild = require('esbuild');
const {chromium} = require('playwright-core');

const schema = {
  type: 'object', title: 'Hero section', additionalProperties: false,
  required: ['headline','fontSize','color','showBadge'],
  properties: {
    headline: {type:'string',title:'Headline',default:'Welcome'},
    fontSize: {type:'integer',title:'Font size (px)',default:64,minimum:12,maximum:120},
    color: {type:'string',title:'Text color',pattern:'^#[0-9a-fA-F]{6}$',default:'#ffffff'},
    showBadge: {type:'boolean',title:'Show badge',default:true}
  }
};
const data={headline:'Welcome',fontSize:64,color:'#ffffff',showBadge:true};
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
if(!chrome) { console.log('BROWSER_TEST_SKIPPED: Chromium/Chrome not installed on runner'); process.exit(0); }

function bundled(source) {
  return esbuild.buildSync({
    stdin: {contents:source,sourcefile:'browser-entry.js',resolveDir:__dirname,loader:'js'},
    absWorkingDir:__dirname,bundle:true,minify:true,platform:'browser',target:['chrome120'],
    format:'iife',write:false,logLevel:'silent'
  }).outputFiles[0].text;
}
async function fieldEdit(page, name) {
  const indexes=await page.locator('input').evaluateAll(nodes=>nodes.map((n,i)=>({i,id:n.id,type:n.type,value:n.value})));
  const target=indexes.find(x=>x.type!=='hidden'&&x.value==='Welcome');
  assert.ok(target, name+' missing input with original headline; DOM='+JSON.stringify(indexes));
  await page.locator('input').nth(target.i).fill('Browser edit');
  return indexes;
}
async function testBrowser() {
  const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
  const results={chrome:chrome,checks:[]};
  try {
    for(const name of ['jedison','rjsf']) {
      const page=await browser.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.setContent('<!doctype html><html><body><div id="editor"></div></body></html>');
      const entry=name==='jedison'
        ? "import Jedison from 'jedison'; window.mountJedison = (el,schema,data)=>{const e=new Jedison.Create({container:el,theme:new Jedison.Theme(),schema,data,keepMissingSchemaFields:true});window.__editor=e;return e;};"
        : "import React from 'react'; import {createRoot} from 'react-dom/client'; import Form from '@rjsf/core'; import validator from '@rjsf/validator-ajv8'; window.mountRjsf=(el,schema,data)=>{let root=createRoot(el);window.__root=root;root.render(React.createElement(Form,{schema,formData:data,validator,onChange:e=>{window.__lastData=e.formData;},children:React.createElement('button',{type:'submit'},'Apply')}));};";
      const js=bundled(entry);
      await page.addScriptTag({content:js});
      if(name==='jedison') {
        await page.evaluate(({schema,data})=>window.mountJedison(document.getElementById('editor'),schema,data),{schema,data});
      } else {
        await page.evaluate(({schema,data})=>window.mountRjsf(document.getElementById('editor'),schema,data),{schema,data});
      }
      await page.locator('input').first().waitFor({state:'attached'});
      await page.waitForFunction(()=>document.querySelectorAll('#editor input').length>=4,{timeout:10000});
      const inputsBefore=await fieldEdit(page,name);
      if(name==='jedison') {
        await page.waitForFunction(()=>window.__editor.getValue().headline==='Browser edit',{timeout:5000});
      } else {
        await page.waitForFunction(()=>window.__lastData&&window.__lastData.headline==='Browser edit',{timeout:5000});
      }
      const last=await page.evaluate(name==='jedison' ? ()=>window.__editor.getValue() : ()=>window.__lastData);
      assert.equal(last.headline,'Browser edit');
      assert.ok(!errors.length,name+' browser JS errors: '+JSON.stringify(errors));
      results.checks.push({library:name,pass:true,visibleInputs:inputsBefore.filter(x=>x.type!=='hidden').length,userEdit:last.headline,bundleBytes:Buffer.byteLength(js),gzipBytes:zlib.gzipSync(Buffer.from(js),{level:9}).length});
      await page.close();
    }
  } finally {await browser.close();}
  console.log('STAGE1_REAL_CHROMIUM_RESULTS='+JSON.stringify(results));
}
testBrowser().catch(e=>{console.error('STAGE1_REAL_CHROMIUM_FAILURE='+String(e.stack||e));process.exitCode=1;});
