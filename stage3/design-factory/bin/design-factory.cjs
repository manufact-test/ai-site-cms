#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), path=require('node:path');
const {compile,migrate,KITS,THEMES,serialize,jsonParse,loadRegistry}=require('../lib/compiler.cjs');
const {writePreview}=require('../lib/preview.cjs');
const sdk=require('../../sdk/contract.cjs');
const catalog=require('../catalog/compositions.cjs');
const adapter=require('../lib/composition-adapter.cjs');
const showcase=require('../lib/showcase.cjs');
const kitGallery=require('../lib/kit-gallery.cjs');
const bridge=require('../lib/bridge.cjs');
function help(){
  process.stdout.write([
    'Design Factory D1 (offline, Node.js >= 20, no dependencies)',
    '  create [--brief PROJECT.json] [--kit agency|industrial|consulting] [--theme THEME_ID] [--lang ru|en] [--out SITE.json] [--project-out PROJECT.json]',
    '  validate SITE.json',
    '  inspect SITE.json',
    '  export PROJECT.json NEW-output-directory',
    '  kits',
    '  compositions [CATEGORY]',
    '  showcase NEW-output-directory',
    '  kit-gallery NEW-output-directory',
    '  bridge-export PROJECT.json NEW-package.json',
    '  bridge-validate PACKAGE.json [--out NEW-site-v1.json]',
    '  compose COMPOSITION_ID --out SITE.json [--brief PROJECT.json] [--report BRIDGE.json]',
    '  help',
    'Input design project format: manufact-design-factory-v1, version 1. Output site: manufact-ai-site-v1.',
    'Static export contains DESIGN PREVIEW HTML, not published CMS runtime.',
  ].join('\n')+'\n');
}
function readJSON(file){
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1024*1024)throw Error('Expected normal JSON file <= 1 MiB');
  return jsonParse(fs.readFileSync(file,'utf8'));
}
function flags(args,allowed){
  const result={};
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(!allowed.includes(arg)||!arg.startsWith('--')||i===args.length-1||args[i+1].startsWith('--')||Object.hasOwn(result,arg))
      throw Error('Unexpected/duplicate argument: '+arg);
    result[arg]=args[++i];
  }
  return result;
}
function newFile(file,bytes){
  const resolved=path.resolve(file),parent=path.dirname(resolved);
  if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory())throw Error('Output parent missing');
  fs.writeFileSync(resolved,bytes,{flag:'wx',mode:0o600});
}
function run(argv){
  const [command,...rest]=argv;
  if(!command||['help','--help','-h'].includes(command)){help();return;}
  if(command==='kits'){
    if(rest.length)throw Error('kits takes no arguments');
    process.stdout.write(serialize({kits:Object.keys(KITS).map(id=>({id,label:KITS[id].label,archetype:KITS[id].archetype})),
      themes:Object.keys(THEMES).map(id=>({id,label:THEMES[id].label}))}));return;
  }
  if(command==='compositions'){
    if(rest.length>1)throw Error('compositions takes optional category');
    const items=catalog.list(rest[0]);
    process.stdout.write(serialize({format:catalog.FORMAT,count:items.length,items}));
    return;
  }
  if(command==='bridge-export'){
    if(rest.length!==2)throw Error('bridge-export needs a project and NEW package path');
    const output=bridge.build(readJSON(rest[0]));
    bridge.validateBundle(output);
    newFile(rest[1],serialize(output));
    process.stdout.write(serialize({valid:true,format:output.format,pages:output.site.pages.length,
      publishGate:output.compatibility.publishGate}));
    return;
  }
  if(command==='bridge-validate'){
    if(!rest.length||rest.length>3)throw Error('bridge-validate takes package and optional --out');
    const file=rest[0], f=flags(rest.slice(1),['--out']);
    const parsed=bridge.validateBundle(readJSON(file));
    const site=bridge.importForCMS(parsed);
    if(f['--out'])newFile(f['--out'],serialize(site));
    process.stdout.write(serialize({valid:true,siteFormat:site.format,pages:site.pages.length,
      requiresOwnerReview:true}));
    return;
  }
  if(command==='kit-gallery'){
    if(rest.length!==1)throw Error('kit-gallery requires one NEW directory');
    process.stdout.write(serialize(kitGallery.generate(rest[0])));
    return;
  }
  if(command==='showcase'){
    if(rest.length!==1)throw Error('showcase requires NEW output directory');
    process.stdout.write(serialize(showcase.writeShowcase(rest[0])));
    return;
  }
  if(command==='compose'){
    if(rest.length<3)throw Error('compose requires composition ID and --out file');
    const [id,...argumentsAfter]=rest;
    const flagsMap=flags(argumentsAfter,['--brief','--out','--report']);
    if(!flagsMap['--out'])throw Error('compose requires --out file');
    const base=compile(flagsMap['--brief']?readJSON(flagsMap['--brief']):null);
    const reg=loadRegistry();
    base.site.pages[0].sections[base.site.pages[0].sections.length-1]=
      adapter.sectionFor(id,'df-'+id,base.project.language,reg);
    sdk.validateSite(base.site,reg);
    const info=sdk.inspectSite(base.site,reg);
    if(info.errors.length)throw Error('Invalid composition: '+JSON.stringify(info.errors));
    newFile(flagsMap['--out'],serialize(base.site));
    if(flagsMap['--report'])newFile(flagsMap['--report'],serialize(adapter.compare(id)));
    process.stderr.write('Composition '+id+' exported as CMS supported fallback; enhanced layout may require integration.\n');
    return;
  }
  if(command==='create'){
    const f=flags(rest,['--brief','--kit','--theme','--lang','--out','--project-out']);
    const original=f['--brief']?readJSON(f['--brief']):null;
    const input=migrate(original);
    if(f['--kit']){
      input.kit=f['--kit'];
      if(!f['--theme']&&!f['--brief']&&Object.hasOwn(KITS,input.kit))input.theme=KITS[input.kit].theme;
    }
    if(f['--theme'])input.theme=f['--theme'];
    if(f['--lang'])input.language=f['--lang'];
    const result=compile(input);
    if(f['--out'])newFile(f['--out'],serialize(result.site));
    else process.stdout.write(serialize(result.site));
    if(f['--project-out'])newFile(f['--project-out'],serialize(result.project));
    process.stderr.write('Compiled '+result.site.pages.length+' CMS pages; missing owner fields: '+result.checklist.missing.join(', ')+'\n');
    return;
  }
  if(command==='validate'||command==='inspect'){
    if(rest.length!==1)throw Error(command+' requires one site-v1 JSON path');
    const input=readJSON(rest[0]),registry=loadRegistry();
    const site=sdk.validateSite(input,registry);
    const info=sdk.inspectSite(site,registry);
    if(command==='validate')process.stdout.write(serialize({valid:info.errors.length===0,format:site.format,pages:info.pages,errors:info.errors}));
    else process.stdout.write(serialize(info));
    if(info.errors.length)process.exitCode=2;
    return;
  }
  if(command==='export'){
    if(rest.length!==2)throw Error('export requires PROJECT.json and NEW output directory');
    const result=compile(readJSON(rest[0]));
    const report=writePreview(result,rest[1]);
    process.stdout.write(serialize({exported:true,directory:report.directory,pages:report.pages,
      format:result.site.format,previewParity:'integration_required',
      missingOwnerFacts:result.checklist.missing}));
    return;
  }
  throw Error('Unknown command: '+command);
}
try{run(process.argv.slice(2));}catch(error){
  process.stderr.write('Design Factory refused: '+error.message+'\n');
  process.exitCode=2;
}
