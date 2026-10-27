'use strict';
// D7 source-exact snapshot covers all generated HTML, CSS and JSON, including
// pages with no screenshots. 16 sites * 10 files plus 4 showcase files.
const crypto=require('node:crypto');
const {sourcePaths,readSource,assertOfflineNavigation,assertShowcaseCoverage}=require('./visual-source-provenance.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const compiler=require('./compiler.cjs');
const preview=require('./preview.cjs');
const showcase=require('./showcase.cjs');
const compositions=require('../catalog/compositions.cjs');
const adapter=require('./composition-adapter.cjs');
const SAMPLE_KITS=Object.freeze([['industrial','ru'],['saas','en'],['architecture','ru'],['restaurant','ru']]);
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
// Independently rebuild all source bytes from the current first-party authoring
// contract. A matching hash alone cannot prove that generated files correspond
// to their declared project/kit/theme or to the actual D3 renderer.
function reproducibleBytes(images){
 const manifest=expectedGeneratedPaths(images),names=new Set(manifest);
 const result=new Map();
 const make=(file,content)=>{
  if(!names.has(file)||result.has(file))throw Error('Unexpected or duplicate regenerated output: '+file);
  result.set(file,Buffer.from(content,'utf8'));
 };
 for(const theme of Object.keys(compiler.THEMES)){
  const base='sites/theme-'+theme;
  const built=compiler.compile({format:compiler.FORMAT,version:1,
   kit:'agency',theme,language:'ru',facts:{}});
  for(const [file,value] of [
   ['site-v1.json',built.site],['design-spec.json',built.designSpec],
   ['project.json',built.project],['owner-checklist.json',built.checklist],
   ['inspection.json',built.inspection]])make(base+'/'+file,compiler.serialize(value));
  make(base+'/assets/preview.css',preview.css(built.project.theme));
  for(const page of built.site.pages)
   make(base+'/'+(page.path==='/'?'index.html':page.path.slice(1)+'index.html'),
    preview.pageHtml(built.site,page,built.project.theme,built.project.language));
 }
 for(const [kit,language] of SAMPLE_KITS){
  const base='sites/sector-'+kit+'-'+language;
  const built=compiler.compile({format:compiler.FORMAT,version:1,
   kit,theme:compiler.KITS[kit].theme,language,facts:{}});
  for(const [file,value] of [
   ['site-v1.json',built.site],['design-spec.json',built.designSpec],
   ['project.json',built.project],['owner-checklist.json',built.checklist],
   ['inspection.json',built.inspection]])make(base+'/'+file,compiler.serialize(value));
  make(base+'/assets/preview.css',preview.css(built.project.theme));
  for(const page of built.site.pages)
   make(base+'/'+(page.path==='/'?'index.html':page.path.slice(1)+'index.html'),
    preview.pageHtml(built.site,page,built.project.theme,built.project.language));
 }
 make('showcase/index.html',showcase.html());
 make('showcase/showcase.css',showcase.style);
 make('showcase/compositions.json',compiler.serialize({
  format:compositions.FORMAT,items:compositions.compositions}));
 make('showcase/fallbacks.json',compiler.serialize({
  format:'manufact-design-compositions-bridge-v1',
  items:compositions.compositions.map(c=>adapter.compare(c.id))}));
 if(result.size!==manifest.length)throw Error('Generated source manifest differs from first-party renderer');
 return result;
}
function snapshotGeneratedSources(root,images){
 const expected=reproducibleBytes(images);
 return expectedGeneratedPaths(images).map(file=>{
  const bytes=readSource(root,file);
  const canonical=expected.get(file);
  if(!canonical||bytes.length!==canonical.length||!bytes.equals(canonical))
   throw Error('Generated D7 source is not reproducible from first-party compiler: '+file);
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
module.exports=Object.freeze({expectedGeneratedPaths,reproducibleBytes,snapshotGeneratedSources,verifyGeneratedSources});
