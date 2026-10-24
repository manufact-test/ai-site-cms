#!/usr/bin/env node
'use strict';
// Deterministic browser bundle generation; use only explicitly allowlisted first-party files.
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../../..');
const sources={
 sdk:'stage3/sdk/contract.cjs',
 compiler:'stage3/design-factory/lib/compiler.cjs',
 preview:'stage3/design-factory/lib/preview.cjs',
 themes:'stage3/design-factory/catalog/themes.cjs',
 kits:'stage3/design-factory/catalog/kits.cjs',
 compositions:'stage3/design-factory/catalog/compositions.cjs',
 adapter:'stage3/design-factory/lib/composition-adapter.cjs',
 bridge:'stage3/design-factory/lib/bridge.cjs'
};
const manifests=['company-hero','contact-panel','cta-banner','faq-accordion','feature-highlights','service-grid','media-story','photo-gallery'];
const manifestBytes=Object.fromEntries(manifests.map(id=>[id,fs.readFileSync(path.join(base,'stage3/components/'+id+'.json'),'utf8')]));
const factories=Object.entries(sources).map(([id,file])=>{
 const body=fs.readFileSync(path.join(base,file),'utf8');
 return JSON.stringify(id)+':function(module,exports,require,__dirname){\n'+body+'\n}';
}).join(',\n');
const header=[
 '/* Design Factory D5 first-party browser bundle. Generated from exact existing Stage3 SDK/manifests.',
 ' * No packages, eval, remote files or dynamic code; original JS source is bundled as static functions.',
 ' * Build script: stage3/design-factory/bin/build-browser-bundle.cjs',
 ' */',
 '(function(root){',
 "'use strict';",
 'const manifestBytes='+JSON.stringify(manifestBytes)+';',
 'const moduleFactories={',
 factories,
 '};',
 'const modules=Object.create(null);',
 'const names={',
 "'../../sdk/contract.cjs':'sdk','../catalog/themes.cjs':'themes','../catalog/kits.cjs':'kits',",
 "'../catalog/compositions.cjs':'compositions','./compiler.cjs':'compiler',",
 "'./preview.cjs':'preview','./composition-adapter.cjs':'adapter','./bridge.cjs':'bridge'",
 '};',
 'const safeFS=Object.freeze({readFileSync:function(p){const file=String(p).split("/").pop();if(!/^[a-z][a-z0-9-]*\\.json$/.test(file))throw Error("Unsupported bundled manifest path");const id=file.slice(0,-5);if(!Object.prototype.hasOwnProperty.call(manifestBytes,id))throw Error("Missing manifest "+id);return manifestBytes[id];}});',
 'const safePath=Object.freeze({join:(...p)=>p.join("/"),resolve:(...p)=>p.join("/")});',
 'function load(id){if(modules[id])return modules[id].exports;const factory=moduleFactories[id];if(!factory)throw Error("Unknown factory "+id);const module={exports:{}};modules[id]=module;function request(p){if(p==="node:fs")return safeFS;if(p==="node:path")return safePath;const target=names[p];if(!target)throw Error("Blocked dependency "+p);return load(target)}factory(module,module.exports,request,"/stage3/design-factory/lib");return module.exports;}',
 'const api=Object.freeze({sdk:load("sdk"),compiler:load("compiler"),preview:load("preview"),themes:load("themes"),kits:load("kits"),compositions:load("compositions"),adapter:load("adapter"),bridge:load("bridge")});',
 'Object.defineProperty(root,"DesignFactory",{value:api,writable:false,configurable:false});',
 '})(globalThis);',
 ''
].join('\n');
const target=path.join(base,'stage3/design-factory/studio/runtime.generated.js');
if(process.argv.includes('--check')){
 if(fs.readFileSync(target,'utf8')!==header){console.error('Browser bundle does not match current source');process.exitCode=1;}
 else console.log('Design Factory browser bundle verified');
}else{
 fs.writeFileSync(target,header);
 console.log('Built '+target+' ('+header.length+' characters)');
}
