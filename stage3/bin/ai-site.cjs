#!/usr/bin/env node
'use strict';
// Local Stage3 contract toolkit. Read/write only stdout; never host/deploy.
const fs=require('node:fs'),path=require('node:path');
const sdk=require('../sdk/contract.cjs');
const root=path.resolve(__dirname,'..'),components=path.join(root,'components');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const manifests=()=>['company-hero','feature-highlights','contact-panel','image-showcase','lead-form','lead-form-flex','service-grid','faq-accordion','testimonials','photo-gallery'].map(
  id=>read(path.join(components,id+'.json')));
function run(argv){
  const cmd=argv[0],args=argv.slice(1);
  if(cmd==='compose'&&args.length===1){
    return require('../sdk/recipes.cjs').compose(read(args[0]),manifests());
  }
  if(cmd==='recipe'&&args.length===1){
    return require('../sdk/recipes.cjs').plan(read(args[0]));
  }
  if(cmd==='create'){
    if(args.some(a=>!a.startsWith('--')))throw Error('Usage: create [--id=site-name] [--title=Company] [--brief=path.json]');
    const parsed=Object.fromEntries(args.map(a=>{let i=a.indexOf('=');if(i<=2)throw Error('Use --key=value');return [a.slice(2,i),a.slice(i+1)];}));
    if(Object.keys(parsed).some(k=>!['id','title','brief'].includes(k)))throw Error('Unknown option');
    const source=parsed.brief?read(parsed.brief):{};
    return sdk.siteFromBrief({siteId:parsed.id||'site-generated',title:parsed.title||'Новый сайт',brief:source},manifests());
  }
  if(cmd==='validate'&&args.length===1){
    const valid=sdk.validateSite(read(args[0]),manifests());
    return {valid:true,siteId:valid.siteId,pages:valid.pages.length,sections:valid.pages.reduce((n,p)=>n+p.sections.length,0),readyToPublish:false};
  }
  if(cmd==='controls'&&args.length===4)
    return sdk.controls(read(args[0]),manifests(),args[1],args[2],args[3]);
  throw Error('Usage: node stage3/bin/ai-site.cjs create|validate FILE|controls FILE PAGE SECTION ELEMENT');
}
try{process.stdout.write(JSON.stringify(run(process.argv.slice(2)),null,2)+'\n');}
catch(e){process.stderr.write('STAGE3_CONTRACT_REFUSED: '+e.message+'\n');process.exitCode=2;}
