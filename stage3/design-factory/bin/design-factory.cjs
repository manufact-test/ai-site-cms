#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), path=require('node:path');
const {compile,migrate,KITS,THEMES,serialize,jsonParse,loadRegistry}=require('../lib/compiler.cjs');
const {writePreview}=require('../lib/preview.cjs');
const sdk=require('../../sdk/contract.cjs');
function help(){
  process.stdout.write([
    'Design Factory D1 (offline, Node.js >= 20, no dependencies)',
    '  create [--brief PROJECT.json] [--kit agency|industrial|consulting] [--theme THEME_ID] [--lang ru|en] [--out SITE.json] [--project-out PROJECT.json]',
    '  validate SITE.json',
    '  inspect SITE.json',
    '  export PROJECT.json NEW-output-directory',
    '  kits',
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
  if(command==='create'){
    const f=flags(rest,['--brief','--kit','--theme','--lang','--out','--project-out']);
    const original=f['--brief']?readJSON(f['--brief']):null;
    const input=migrate(original);
    if(f['--kit'])input.kit=f['--kit'];
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
