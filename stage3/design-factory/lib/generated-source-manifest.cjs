'use strict';
// D7 source-exact snapshot covers all generated HTML, CSS and JSON, including
// pages with no screenshots. 16 sites * 10 files plus 4 showcase files.
const crypto=require('node:crypto');
const {sourcePaths,readSource,assertOfflineNavigation,assertShowcaseCoverage}=require('./visual-source-provenance.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const ROUTES=Object.freeze(['index.html','services/index.html','approach/index.html','contact/index.html']);
const DATA=Object.freeze(['site-v1.json','design-spec.json','project.json','owner-checklist.json','inspection.json']);
function expectedGeneratedPaths(images){
 if(!Array.isArray(images)||!images.length)throw Error('Missing D7 image inventory');
 const bases=new Set(),seen=new Set();
 for(const name of images){
  if(seen.has(name))throw Error('Duplicate screenshot path');seen.add(name);
  const source=sourcePaths(name);
  if(source.html==='showcase/index.html')continue;
  if(!source.css.endsWith('/assets/preview.css'))throw Error('Unexpected preview CSS path');
  bases.add(source.css.slice(0,-'/assets/preview.css'.length));
 }
 if(!seen.has('screenshots/42-compositions-mobile.png'))
  throw Error('Full showroom source is mandatory');
 const files=['showcase/index.html','showcase/showcase.css','showcase/compositions.json','showcase/fallbacks.json'];
 for(const base of bases)for(const rel of [...ROUTES,'assets/preview.css',...DATA])
  files.push(base+'/'+rel);
 return files.sort();
}
function snapshotGeneratedSources(root,images){
 return expectedGeneratedPaths(images).map(file=>{
  const bytes=readSource(root,file);
  if(file.endsWith('.html')){
   const html=bytes.toString('utf8');
   if(!/^<!doctype html>/i.test(html)||Buffer.byteLength(html)!==bytes.length)
    throw Error('Generated HTML invalid: '+file);
   const href=file==='showcase/index.html'?'showcase.css':
    /\/(?:services|approach|contact)\/index\.html$/.test(file)?'../assets/preview.css':'assets/preview.css';
   if(html.split('<link rel="stylesheet" href="'+href+'">').length!==2)
    throw Error('Generated stylesheet reference invalid: '+file);
   assertOfflineNavigation(root,file,html);
   if(file==='showcase/index.html')assertShowcaseCoverage(html);
  }else if(file.endsWith('.json')){
   const json=JSON.parse(bytes.toString('utf8'));
   if(!json||typeof json!=='object'||Array.isArray(json))
    throw Error('Invalid generated JSON: '+file);
  }
  return {file,bytes:bytes.length,sha256:sha(bytes)};
 });
}
function verifyGeneratedSources(root,images,claimed){
 const expected=expectedGeneratedPaths(images);
 if(!Array.isArray(claimed)||claimed.length!==expected.length)
  throw Error('Generated D7 source manifest is missing or incomplete');
 for(let i=0;i<expected.length;i++){
  const row=claimed[i];
  if(!row||Object.keys(row).sort().join(',')!=='bytes,file,sha256'||row.file!==expected[i]||
     !Number.isSafeInteger(row.bytes)||row.bytes<0||!/^[a-f0-9]{64}$/.test(row.sha256))
   throw Error('Invalid generated source entry: '+expected[i]);
 }
 const actual=snapshotGeneratedSources(root,images);
 for(let i=0;i<actual.length;i++)if(actual[i].file!==claimed[i].file||
   actual[i].bytes!==claimed[i].bytes||actual[i].sha256!==claimed[i].sha256)
  throw Error('Generated D7 source modified after capture: '+actual[i].file);
 return Object.freeze({files:actual.length,sites:(actual.length-4)/10});
}
module.exports=Object.freeze({expectedGeneratedPaths,snapshotGeneratedSources,verifyGeneratedSources});
